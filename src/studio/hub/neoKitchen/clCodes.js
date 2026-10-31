/* [NEO-CUTLIST-UX32] QR code + Code 128 barcode as inline SVG, drawn locally (nothing is fetched, nothing is sent out).
 * QR: the repo already depends on `qrcode-generator` (used by the One Quote PDF), so no new dependency and no home-made encoder: byte mode,
 * error correction M, version chosen automatically (1-40; payloads are kept under 220 bytes so labels stay at version <= 10), mask chosen by the library.
 * Code 128: subsets B and C with automatic switching (all-digit runs of 4+ use C), checksum mod 103, stop pattern; unit-tested against the
 * published "PJJ123C" example (checksum 54). Output is plain SVG with literal black / white: a scanner needs a printed contrast
 * that must not follow the theme (DESIGN.md print exemption). */
import qrcode from 'qrcode-generator';

export const QR_MAX_BYTES = 220;
const utf8Len = (s) => { try { return new TextEncoder().encode(s).length; } catch (e) { return String(s).length; } };

/** boolean matrix of the QR for `text` (null if empty / too long) */
export function qrMatrix(text) {
  const t = String(text == null ? '' : text);
  if (!t || utf8Len(t) > QR_MAX_BYTES) return null;
  const q = qrcode(0, 'M');
  q.addData(t, 'Byte');
  q.make();
  const n = q.getModuleCount();
  const m = [];
  for (let r = 0; r < n; r += 1) { const row = []; for (let c = 0; c < n; c += 1) row.push(q.isDark(r, c)); m.push(row); }
  return m;
}
/** QR version (1..40) of a matrix */
export const qrVersion = (m) => (m.length - 17) / 4;

/** inline SVG (width/height in `size` units, quiet zone of 2 modules by default - labels may pass 1 to save space) */
export function qrSvg(text, { size = 88, quiet = 2, fg = '#000', bg = '#fff', title = 'QR' } = {}) {
  const m = qrMatrix(text);
  if (!m) return '';
  const n = m.length; const full = n + 2 * quiet;
  let d = '';
  for (let r = 0; r < n; r += 1) {
    let c = 0;
    while (c < n) { if (m[r][c]) { let e = c; while (e < n && m[r][e]) e += 1; d += `M${c} ${r}h${e - c}v1h-${e - c}z`; c = e; } else c += 1; }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}" width="${size}" height="${size}" viewBox="${-quiet} ${-quiet} ${full} ${full}" shape-rendering="crispEdges"><rect x="${-quiet}" y="${-quiet}" width="${full}" height="${full}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}

/* ------------------------------ Code 128 ------------------------------ */
/* widths of bar/space/bar/space/bar/space for symbol values 0..105, then 106 = stop (7 elements) */
export const C128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112').split(' ');
const START_B = 104; const START_C = 105; const CODE_C = 99; const CODE_B = 100; const STOP = 106;

/** symbol values (start .. checksum .. stop) for `text` (printable ASCII 32-126 only, else null) */
export function code128Values(text) {
  const s = String(text == null ? '' : text);
  if (!s || !/^[\x20-\x7e]+$/.test(s)) return null;
  const vals = [];
  let mode = null; // 'B' | 'C'
  let i = 0;
  const digitsAt = (k) => { let n = 0; while (k + n < s.length && s[k + n] >= '0' && s[k + n] <= '9') n += 1; return n; };
  while (i < s.length) {
    const dg = digitsAt(i);
    const useC = dg >= 4 || (dg >= 2 && dg === s.length - i && i === 0) || (mode === 'C' && dg >= 2);
    if (useC) {
      const pairs = Math.floor(dg / 2);
      if (mode === null) vals.push(START_C); else if (mode !== 'C') vals.push(CODE_C);
      mode = 'C';
      for (let p = 0; p < pairs; p += 1) vals.push(+s.slice(i + 2 * p, i + 2 * p + 2));
      i += pairs * 2;
    } else {
      if (mode === null) vals.push(START_B); else if (mode !== 'B') vals.push(CODE_B);
      mode = 'B';
      vals.push(s.charCodeAt(i) - 32); i += 1;
    }
  }
  let sum = vals[0];
  for (let k = 1; k < vals.length; k += 1) sum += vals[k] * k;
  vals.push(sum % 103, STOP);
  return vals;
}
/** run lengths in modules, alternating bar / space starting with a bar */
export function code128Modules(text) {
  const v = code128Values(text); if (!v) return null;
  return v.map((x) => C128[x]).join('').split('').map(Number);
}
/** inline SVG; `height` is the bar height, `module` the width of one module in svg units (quiet zone 10 modules each side) */
export function code128Svg(text, { height = 40, module: mw = 1, quiet = 10, fg = '#000', bg = '#fff', title = 'Code 128', width } = {}) {
  const runs = code128Modules(text); if (!runs) return '';
  const total = runs.reduce((a, b) => a + b, 0) + 2 * quiet;
  let x = quiet; let d = ''; let bar = true;
  runs.forEach((r) => { if (bar) d += `M${x} 0h${r}v${height}h-${r}z`; x += r; bar = !bar; });
  const w = width || total * mw;
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}" width="${w}" height="${height * mw}" viewBox="0 0 ${total} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="${total}" height="${height}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}
