/* =============================================================================
 * [NEO-CUTLIST-UX32] Cut list pro: every picture is a plain SVG string built from the BOM / scene data (no WebGL, no canvas, no network):
 *   isoPicSvg       the PICTURE of a row: the part drawn in a 3/4 view, highlighted, inside its cabinet drawn as a ghost (when the scene is known)
 *   partDrawingSvg  the dimensioned part drawing: L x W, grain arrow, banded edges L1 L2 W1 W2, holes, grooves and cut-outs, thickness
 *   edgeSketchSvg   the mini part sketch with the banded edges thick (table column and labels)
 *   hwIconSvg       a small illustration per hardware kind
 * The strings are used on screen (palette PAL_UI = the --nk-cl-* tokens through style="..."), in the print / PDF / label documents and, rasterised,
 * in the xlsx pictures (palette PAL_PRINT = literal ink on paper, DESIGN.md print exemption).
 * Pictures are cached by a signature of their inputs (identical parts share one picture), so a long list costs one string per distinct part.
 * ===========================================================================*/
import { panelDrill } from './cutlist';

export const PAL_UI = { ink: 'var(--nk-cl-text)', mute: 'var(--nk-cl-muted)', line: 'var(--nk-cl-muted)', hi: 'var(--nk-cl-blue)', hiFill: 'var(--nk-cl-blue)', top: 'var(--nk-cl-panel)', side: 'var(--nk-cl-line)', front: 'var(--nk-cl-head-bg)', band: 'var(--nk-cl-orange)', hole: 'var(--nk-cl-teal)', paper: 'var(--nk-cl-panel)' };
export const PAL_PRINT = { ink: '#111111', mute: '#555555', line: '#b8b8b8', hi: '#1f4fd8', hiFill: '#1f4fd8', top: '#f1f1f1', side: '#d4d4d4', front: '#e6e6e6', band: '#c2410c', hole: '#0b7a6d', paper: '#ffffff' };

const f1 = (n) => (Math.round(n * 10) / 10);
const f2 = (n) => (Math.round(n * 100) / 100);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const st = (fill, stroke, w, extra = '') => `style="fill:${fill || 'none'};stroke:${stroke || 'none'};stroke-width:${w == null ? 0 : w};${extra}"`;

/* ---------------------------------- cache ---------------------------------- */
const CACHE = new Map(); const CACHE_MAX = 800;
function cached(key, make) {
  if (CACHE.has(key)) return CACHE.get(key);
  const v = make(); if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value); CACHE.set(key, v); return v;
}
const SCENE_IDS = new WeakMap(); let SCENE_N = 0;
const sceneId = (sc) => { if (!sc || typeof sc !== 'object') return 0; if (!SCENE_IDS.has(sc)) SCENE_IDS.set(sc, ++SCENE_N); return SCENE_IDS.get(sc); };
export const clearPicCache = () => CACHE.clear();
export const picCacheSize = () => CACHE.size;

/* --------------------------------- 3/4 view --------------------------------- */
const C45 = Math.SQRT1_2; const CT = 0.866; const SS = 0.5;
const proj = (u, d, y) => [(u + d) * C45, -y * CT + (u - d) * C45 * SS];
const poly = (pts) => pts.map((p) => `${f2(p[0])},${f2(p[1])}`).join(' ');
function boxFaces(b) {
  const P = (u, d, y) => proj(u, d, y);
  return {
    top: [P(b.u0, b.d0, b.y1), P(b.u1, b.d0, b.y1), P(b.u1, b.d1, b.y1), P(b.u0, b.d1, b.y1)],
    right: [P(b.u1, b.d0, b.y0), P(b.u1, b.d1, b.y0), P(b.u1, b.d1, b.y1), P(b.u1, b.d0, b.y1)],
    front: [P(b.u0, b.d0, b.y0), P(b.u1, b.d0, b.y0), P(b.u1, b.d0, b.y1), P(b.u0, b.d0, b.y1)],
  };
}
const okBox = (b) => b && ['u0', 'u1', 'y0', 'y1', 'd0', 'd1'].every((k) => Number.isFinite(b[k]));
/** boxes of the part's cabinet (ghosts) and the part itself */
function contextBoxes(row, scene) {
  const rep = row.rep || {}; const mine = okBox(rep.box) ? rep.box : null;
  const ghosts = [];
  if (scene && rep.unitId) scene.parts.forEach((p) => { if (p.unitId === rep.unitId && p.id !== rep.id && okBox(p.box) && (p.kind !== 'glass')) ghosts.push(p.box); });
  return { mine, ghosts };
}
/** the picture of a row. size = px (square). `scene` optional (adds the cabinet context). */
export function isoPicSvg(row, { scene, size = 64, pal = PAL_UI, key = 'ui' } = {}) {
  const ck = `iso|${key}|${size}|${row.key}|${scene && row.rep ? `${sceneId(scene)}:${row.rep.unitId}` : '-'}`;
  return cached(ck, () => {
    const { mine, ghosts } = contextBoxes(row, scene);
    let hero = mine;
    if (!hero) { const w = row.w || 1; const d = row.d || 1; const h = row.h || 1; hero = { u0: 0, u1: w, d0: 0, d1: d, y0: 0, y1: h }; }
    const all = [...ghosts.map((b) => ({ b, g: true })), { b: hero, g: false }];
    all.sort((x, y) => ((x.b.u0 + x.b.u1) / 2 - (x.b.d0 + x.b.d1) / 2) - ((y.b.u0 + y.b.u1) / 2 - (y.b.d0 + y.b.d1) / 2) || (x.b.y0 + x.b.y1) - (y.b.y0 + y.b.y1) || (x.g ? -1 : 1));
    let out = ''; let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    // a thin part is lifted to a minimum thickness so it stays visible
    const draw = ({ b, g }) => {
      const F = boxFaces(b);
      [F.top, F.right, F.front].forEach((f) => f.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
      if (g) {
        const o = 'opacity:.8;';
        out += `<polygon points="${poly(F.top)}" ${st(pal.top, pal.line, 0.6, o)}/><polygon points="${poly(F.right)}" ${st(pal.side, pal.line, 0.6, o)}/><polygon points="${poly(F.front)}" ${st(pal.front, pal.line, 0.6, o)}/>`;
      } else {
        out += `<polygon points="${poly(F.top)}" ${st(pal.hiFill, pal.hi, 1.2, 'fill-opacity:.7;stroke-linejoin:round;')}/><polygon points="${poly(F.right)}" ${st(pal.hiFill, pal.hi, 1.2, 'fill-opacity:1;stroke-linejoin:round;')}/><polygon points="${poly(F.front)}" ${st(pal.hiFill, pal.hi, 1.2, 'fill-opacity:.85;stroke-linejoin:round;')}/>`;
      }
    };
    all.forEach(draw);
    const w = Math.max(1, x1 - x0); const h = Math.max(1, y1 - y0); const pad = Math.max(w, h) * 0.06;
    const side = Math.max(w, h) + 2 * pad;
    const vb = `${f2(x0 - pad - (side - w - 2 * pad) / 2)} ${f2(y0 - pad - (side - h - 2 * pad) / 2)} ${f2(side)} ${f2(side)}`;
    const sw = Math.max(0.3, side / 140);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}" role="img" aria-label="${esc(row.name)}" style="--sw:${f2(sw)}">${out}</svg>`;
  });
}

/* ------------------------------ edge-banding sketch ------------------------------ */
/** mini part sketch: the rectangle in the part's L x W proportions, banded edges drawn thick. flags = { L1, L2, W1, W2 } */
export function edgeSketchSvg(row, { w = 52, h = 32, pal = PAL_UI, codes = true, key = 'ui' } = {}) {
  const fl = row.flags || {};
  return cached(`edge|${key}|${w}|${h}|${row.cut.L}|${row.cut.W}|${row.edges}|${codes}`, () => {
    const L = Math.max(1, row.cut.L); const W = Math.max(1, row.cut.W);
    const pad = codes ? 7 : 3; const iw = w - 2 * pad; const ih = h - 2 * pad;
    const k = Math.min(iw / L, ih / W); const rw = Math.max(6, L * k); const rh = Math.max(4, W * k);
    const x = (w - rw) / 2; const y = (h - rh) / 2;
    const band = (on, x1, y1, x2, y2) => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" style="stroke:${on ? pal.band : 'none'};stroke-width:2.6;stroke-linecap:butt"/>`;
    let s = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(rw)}" height="${f1(rh)}" ${st(pal.front, pal.mute, 0.8)}/>`;
    s += band(fl.L1, x, y, x + rw, y) + band(fl.L2, x, y + rh, x + rw, y + rh) + band(fl.W1, x, y, x, y + rh) + band(fl.W2, x + rw, y, x + rw, y + rh);
    if (codes) {
      const t = (txt, tx, ty, on) => `<text x="${f1(tx)}" y="${f1(ty)}" text-anchor="middle" style="font:600 5.5px sans-serif;fill:${on ? pal.band : pal.mute}">${txt}</text>`;
      s += t('L1', w / 2, y - 2, fl.L1) + t('L2', w / 2, y + rh + 6, fl.L2) + t('W1', x - 3.5, y + rh / 2 + 2, fl.W1) + t('W2', x + rw + 3.5, y + rh / 2 + 2, fl.W2);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(row.edgeText || 'edges')}">${s}</svg>`;
  });
}

/* --------------------------------- grain arrow --------------------------------- */
const arrow = (x1, y1, x2, y2, pal, w = 1) => {
  const a = Math.atan2(y2 - y1, x2 - x1); const h = 5;
  const p = (ang) => `${f1(x2 - h * Math.cos(a - ang))},${f1(y2 - h * Math.sin(a - ang))}`;
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" style="stroke:${pal.mute};stroke-width:${w}"/><polygon points="${f1(x2)},${f1(y2)} ${p(0.4)} ${p(-0.4)}" style="fill:${pal.mute}"/>`;
};
export const grainArrowSvg = (grain, { size = 14, pal = PAL_UI } = {}) => {
  if (!grain || grain === '-') return '';
  const vertical = grain === 'W';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" role="img" aria-label="grain ${grain}">${vertical ? arrow(8, 14, 8, 2, pal, 1.4) : arrow(2, 8, 14, 8, pal, 1.4)}</svg>`;
};

/* ------------------------------ dimensioned part drawing ------------------------------ */
/**
 * The part as a flat drawing: L horizontal, W vertical (cut size), banded edges, grain arrow, holes / grooves / cut-outs when the scene is
 * known, dimension lines with the L, W and T figures and the tolerance. Returns { svg, w, h } (px of the viewBox).
 */
export function partDrawingSvg(row, { scene, pal = PAL_UI, lang = 'en', tol = 0.5, key = 'ui' } = {}) {
  return cached(`draw|${key}|${lang}|${row.key}|${tol}|${scene && row.rep ? sceneId(scene) : 0}`, () => {
    const W0 = 520; const H0 = 340; const m = 64;
    const uL = Math.max(1, row.cut.L); const uW = Math.max(1, row.cut.W);
    const k = Math.min((W0 - 2 * m) / uL, (H0 - 2 * m) / uW);
    const rw = uL * k; const rh = uW * k; const x = (W0 - rw) / 2; const y = (H0 - rh) / 2 - 6;
    let d = '';
    d += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(rw)}" height="${f1(rh)}" ${st(pal.front, pal.ink, 1.4)}/>`;
    // banded edges
    const fl = row.flags || {};
    const band = (on, x1, y1, x2, y2) => (on ? `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" style="stroke:${pal.band};stroke-width:4"/>` : '');
    d += band(fl.L1, x, y, x + rw, y) + band(fl.L2, x, y + rh, x + rw, y + rh) + band(fl.W1, x, y, x, y + rh) + band(fl.W2, x + rw, y, x + rw, y + rh);
    const code = (t, tx, ty, on) => `<text x="${f1(tx)}" y="${f1(ty)}" text-anchor="middle" style="font:600 10px sans-serif;fill:${on ? pal.band : pal.mute}">${t}</text>`;
    d += code('L1', x + rw / 2, y - 6, fl.L1) + code('L2', x + rw / 2, y + rh + 14, fl.L2) + code('W1', x - 12, y + rh / 2 + 3, fl.W1) + code('W2', x + rw + 12, y + rh / 2 + 3, fl.W2);
    // grain
    if (row.grain && row.grain !== '-') d += row.grain === 'W' ? arrow(x + rw / 2, y + rh * 0.8, x + rw / 2, y + rh * 0.2, pal, 1.4) : arrow(x + rw * 0.2, y + rh / 2, x + rw * 0.8, y + rh / 2, pal, 1.4);
    // holes, grooves, cut-outs (scene needed)
    let holes = 0;
    if (scene && row.rep) {
      try {
        const dr = panelDrill(scene, row.rep);
        // panelDrill works on the UNCUT panel (L = ext along its first plane axis); scale to the cut rectangle
        const sx = rw / Math.max(1, dr.L); const sy = rh / Math.max(1, dr.W);
        dr.circles.forEach((c) => {
          const cx = x + c.x * sx; const cy = y + c.y * sy; const r = Math.max(2, c.r * Math.min(sx, sy));
          d += c.type === 'cup' ? `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" ${st('none', pal.hole, 1.2)}/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="1.2" style="fill:${pal.hole}"/>` : `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(Math.max(2.2, r))}" ${st(pal.hole, pal.hole, 0.5, 'fill-opacity:.55;')}/>`;
          holes += 1;
        });
        dr.lines.forEach((l) => { d += `<line x1="${f1(x + l.x1 * sx)}" y1="${f1(y + l.y1 * sy)}" x2="${f1(x + l.x2 * sx)}" y2="${f1(y + l.y2 * sy)}" ${st('none', l.type === 'cutout' ? pal.hole : pal.mute, l.type === 'cutout' ? 1.4 : 1, l.type === 'groove' ? 'stroke-dasharray:4 3;' : '')}/>`; holes += 1; });
      } catch (e) { /* no drilling data for this panel */ }
    }
    // dimension lines
    const dim = (x1, y1, x2, y2, label, rot) => {
      const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
      return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" style="stroke:${pal.ink};stroke-width:.9"/><line x1="${f1(x1 + (y1 === y2 ? 0 : -4))}" y1="${f1(y1 + (y1 === y2 ? -4 : 0))}" x2="${f1(x1 + (y1 === y2 ? 0 : 4))}" y2="${f1(y1 + (y1 === y2 ? 4 : 0))}" style="stroke:${pal.ink};stroke-width:.9"/><line x1="${f1(x2 + (y1 === y2 ? 0 : -4))}" y1="${f1(y2 + (y1 === y2 ? -4 : 0))}" x2="${f1(x2 + (y1 === y2 ? 0 : 4))}" y2="${f1(y2 + (y1 === y2 ? 4 : 0))}" style="stroke:${pal.ink};stroke-width:.9"/><text x="${f1(mx)}" y="${f1(my)}" text-anchor="middle" ${rot ? `transform="rotate(-90 ${f1(mx)} ${f1(my)})"` : ''} dy="${rot ? -5 : -5}" style="font:700 12px sans-serif;fill:${pal.ink};paint-order:stroke;stroke:${pal.paper};stroke-width:3px">${label}</text>`;
    };
    d += dim(x, y + rh + 30, x + rw, y + rh + 30, `L ${f1(row.cut.L)}`, false);
    d += dim(x + rw + 34, y, x + rw + 34, y + rh, `W ${f1(row.cut.W)}`, true);
    const tolTxt = tol ? ` ±${tol}` : '';
    d += `<text x="${W0 / 2}" y="${H0 - 8}" text-anchor="middle" style="font:600 11px sans-serif;fill:${pal.mute}">T ${f1(row.cut.T)} mm${tolTxt}${row.grain && row.grain !== '-' ? ` · ${lang === 'ar' ? 'العرق' : 'grain'} ${row.grain}` : ''}</text>`;
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W0} ${H0}" width="${W0}" height="${H0}" role="img" aria-label="${esc(row.name)}">${d}</svg>`, w: W0, h: H0, holes };
  });
}

/* ------------------------------- hardware icons ------------------------------- */
const HW = {
  hinge: (p) => `<circle cx="12" cy="12" r="6" ${st('none', p.ink, 1.4)}/><circle cx="12" cy="12" r="2" style="fill:${p.ink}"/><path d="M18 12h4" ${st('none', p.ink, 1.4)}/>`,
  plate: (p) => `<rect x="4" y="8" width="16" height="8" rx="2" ${st('none', p.ink, 1.4)}/><circle cx="8" cy="12" r="1.2" style="fill:${p.ink}"/><circle cx="16" cy="12" r="1.2" style="fill:${p.ink}"/>`,
  flipHinge: (p) => `<path d="M5 17l7-9 7 9" ${st('none', p.ink, 1.6)}/><circle cx="12" cy="8" r="2" style="fill:${p.ink}"/>`,
  liftStay: (p) => `<path d="M4 18L16 6M16 6h4M4 18h3" ${st('none', p.ink, 1.6)}/>`,
  runner: (p) => `<rect x="3" y="9" width="18" height="6" rx="1" ${st('none', p.ink, 1.4)}/><path d="M7 12h10" ${st('none', p.ink, 1.4)}/>`,
  handleBar: (p) => `<path d="M5 8v4M19 8v4M5 8h14" ${st('none', p.ink, 1.8)}/>`,
  handleKnob: (p) => `<circle cx="12" cy="12" r="4.5" ${st('none', p.ink, 1.6)}/><path d="M12 16.5V20" ${st('none', p.ink, 1.6)}/>`,
  handleProfile: (p) => `<rect x="3" y="9" width="18" height="4" ${st('none', p.ink, 1.6)}/><path d="M3 13l2 3h14l2-3" ${st('none', p.ink, 1.2)}/>`,
  pin: (p) => `<path d="M12 4v13" ${st('none', p.ink, 2.2)}/><path d="M8 17h8" ${st('none', p.ink, 1.6)}/>`,
  minifix: (p) => `<circle cx="12" cy="12" r="6" ${st('none', p.ink, 1.4)}/><path d="M12 6v12M6 12h12" ${st('none', p.ink, 1)}/>`,
  cam: (p) => `<circle cx="12" cy="12" r="6" ${st('none', p.ink, 1.4)}/><path d="M9 12h6" ${st('none', p.ink, 1.6)}/>`,
  dowel: (p) => `<rect x="9" y="4" width="6" height="16" rx="1" ${st('none', p.ink, 1.4)}/><path d="M9 8h6M9 16h6" ${st('none', p.ink, 1)}/>`,
  leg: (p) => `<path d="M12 4v10M8 20h8M10 14h4l1 6H9z" ${st('none', p.ink, 1.4)}/>`,
  pole: (p) => `<path d="M12 3v18" ${st('none', p.ink, 2.4)}/><circle cx="12" cy="8" r="3" ${st('none', p.ink, 1.2)}/>`,
  bracket: (p) => `<path d="M5 5v14h4M5 5h14M5 19L19 5" ${st('none', p.ink, 1.6)}/>`,
  sink: (p) => `<rect x="3" y="7" width="18" height="10" rx="2" ${st('none', p.ink, 1.4)}/><circle cx="12" cy="12" r="1.6" style="fill:${p.ink}"/>`,
  hob: (p) => `<rect x="3" y="6" width="18" height="12" rx="2" ${st('none', p.ink, 1.4)}/><circle cx="8.5" cy="10" r="1.8" ${st('none', p.ink, 1.1)}/><circle cx="15.5" cy="10" r="1.8" ${st('none', p.ink, 1.1)}/><circle cx="8.5" cy="14.5" r="1.4" ${st('none', p.ink, 1.1)}/><circle cx="15.5" cy="14.5" r="1.4" ${st('none', p.ink, 1.1)}/>`,
};
export const HW_KINDS = Object.keys(HW);
/** icon for a hardware kind (generic box if unknown). `image` (a catalogue / inventory image path or data URL of the Hub item) wins when given. */
export function hwIconSvg(kind, { size = 28, pal = PAL_UI, image } = {}) {
  if (image && /^(data:image\/|\/[A-Za-z0-9_./-]+$)/.test(image)) return `<img src="${esc(image)}" width="${size}" height="${size}" alt="" style="object-fit:contain"/>`;
  const f = HW[kind] || ((p) => `<rect x="5" y="5" width="14" height="14" rx="2" ${st('none', p.ink, 1.4)}/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${esc(kind)}">${f(pal)}</svg>`;
}
