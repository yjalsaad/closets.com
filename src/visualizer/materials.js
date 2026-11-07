/* =============================================================================
 * Room Visualizer — materials [ROOM-VIZ 2026-11-07]
 * A product is a real texture photo (texture_url) OR a procedural recipe (procedural: {type, base, …}).
 * tileImages(product) -> Promise<[canvas, …]>: a few variants of ONE tile / plank / slab at true proportions, used by layout.js.
 * Everything is cached per product. Pure canvas, no network except the product's own texture image.
 * ===========================================================================*/

/* ── seeded random + value noise ─────────────────────────────────────────────────────────────────────────────── */
export function rng(seed) {
  let s = (Math.floor(seed) || 1) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeNoise(seed) {
  const r = rng(seed); const P = new Uint8Array(512); const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const V = new Float32Array(256); for (let i = 0; i < 256; i++) V[i] = r();
  const fade = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = V[P[(P[xi & 255] + yi) & 511] & 255], b = V[P[(P[(xi + 1) & 255] + yi) & 511] & 255];
    const c = V[P[(P[xi & 255] + yi + 1) & 511] & 255], d = V[P[(P[(xi + 1) & 255] + yi + 1) & 511] & 255];
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, oct = 4) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
  return { n2, fbm };
}

/* ── colour helpers ──────────────────────────────────────────────────────────────────────────────────────────── */
export function hexRgb(h) {
  const s = String(h || '#cccccc').replace('#', ''); const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s.padEnd(6, '0');
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
}
export const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function shade(hex, k) { const c = hexRgb(hex); return rgbHex(c[0] * k, c[1] * k, c[2] * k); }
export function lum(hex) { const c = hexRgb(hex); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

/* ── classification ──────────────────────────────────────────────────────────────────────────────────────────── */
/** continuous = no tile joints (paint, boards, slabs, wallpaper, wall panels): layouts and grout do not apply */
export function isContinuous(p) {
  if (!p) return true;
  const proc = p.procedural || {};
  return ['paint', 'board', 'wallpaper', 'wall_panel', 'quartz', 'granite'].includes(p.kind) || proc.type === 'paint';
}
export const isPlank = (p) => !!p && (['wood_floor', 'laminate', 'vinyl'].includes(p.kind) || (p.tile_w_mm / p.tile_h_mm >= 3.5) || (p.tile_h_mm / p.tile_w_mm >= 3.5));
/** physical size (m) one texture image covers for continuous materials */
export function repeatSizeM(p) {
  if (!p) return [1, 1];
  const proc = p.procedural || {};
  if (p.kind === 'wallpaper') return [p.tile_w_mm / 1000, p.tile_h_mm / 1000];
  if (proc.type === 'fluted') return [0.6, 0.6];
  if (p.texture_url) return [1.0, 1.0];
  return [1.4, 1.4];
}
export function roughnessOf(p) {
  return ({ polished: 0.08, gloss: 0.14, satin: 0.38, matt: 0.72, textured: 0.82 })[p && p.finish] ?? 0.6;
}
export const displayName = (p, ar) => (p ? ((ar && p.name_ar) || p.name) : '');

/* ── procedural tile painter ─────────────────────────────────────────────────────────────────────────────────── */
function paintProcedural(p, w, h, seed) {
  const proc = p.procedural || {};
  const type = proc.type || 'solid';
  const base = hexRgb(proc.base || p.hex || '#cccccc');
  const c = canvas(w, h); const g = c.getContext('2d');
  if (type === 'paint') { g.fillStyle = rgbHex(...base); g.fillRect(0, 0, w, h); return c; }
  const N = makeNoise((proc.seed || 1) * 131 + seed * 977);
  const R = rng((proc.seed || 1) * 31 + seed * 7);
  const img = g.createImageData(c.width, c.height); const d = img.data;
  const W = c.width, H = c.height;
  const dark = hexRgb(proc.dark || rgbHex(base[0] * 0.62, base[1] * 0.6, base[2] * 0.58));
  const vein = hexRgb(proc.vein || '#888888');
  const sx = 1 / Math.max(W, H);
  const ang = R() * Math.PI; const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let col = base; const u = x * sx, v = y * sx;
      if (type === 'wood') {
        // grain runs along the long side
        const along = W >= H ? u : v, across = W >= H ? v : u;
        // fine straight grain along the plank, gentle cathedral bends, long colour streaks, rare knots
        const warp = N.fbm(along * 1.6, across * 2, 3);
        const grain = Math.sin(across * 520 + warp * 4.5 + N.fbm(along * 0.7, across * 9, 2) * 3.5);
        const streak = N.fbm(along * 1.2, across * 38, 3);
        const tone = N.fbm(along * 0.9 + 3.1, across * 1.5, 2);
        let t = 0.52 + 0.16 * grain * (0.35 + streak) + (streak - 0.5) * 0.7 + (tone - 0.5) * 0.45;
        const knot = N.fbm(along * 16, across * 16, 2); if (knot > 0.8) t -= (knot - 0.8) * 2.4;
        col = mix(dark, base, Math.max(0, Math.min(1, t)));
      } else if (type === 'marble') {
        const ru = u * ca - v * sa, rv = u * sa + v * ca;
        const f = N.fbm(ru * 3.2, rv * 3.2, 5);
        const vv = Math.abs(Math.sin((ru * 7 + f * 9.5) * Math.PI));
        const vv2 = Math.abs(Math.sin((rv * 4 + N.fbm(ru * 6, rv * 6, 4) * 7) * Math.PI));
        const sharp = proc.bold ? 0.09 : 0.05;
        let veinT = Math.max(0, 1 - vv / sharp) * 0.95 + Math.max(0, 1 - vv2 / (sharp * 0.6)) * 0.45;
        const cloud = (N.fbm(ru * 9, rv * 9, 3) - 0.5) * 0.12;
        col = mix(mix(base, vein, Math.min(1, veinT * 0.9)), [255, 255, 255], Math.max(0, cloud));
        col = mix(col, dark, Math.max(0, -cloud) * 0.6);
      } else if (type === 'stone' || type === 'concrete') {
        const f = N.fbm(u * (type === 'stone' ? 5 : 3), v * (type === 'stone' ? 9 : 3), 5);
        const fine = N.n2(u * 260, v * 260);
        let t = proc.fine ? 0.5 + (fine - 0.5) * 0.25 + (f - 0.5) * 0.35 : f;
        col = mix(dark, base, 0.35 + t * 0.75);
        if (type === 'stone' && proc.pits && N.n2(u * 120, v * 40) > 0.86) col = mix(col, dark, 0.55);
        if (type === 'concrete' && fine > 0.93) col = mix(col, [30, 30, 30], 0.25);
        if (type === 'concrete' && fine < 0.05) col = mix(col, [255, 255, 255], 0.18);
      } else if (type === 'terrazzo') {
        const f = N.fbm(u * 6, v * 6, 3);
        col = mix(base, mix(base, dark, 0.25), f * 0.4);
      } else if (type === 'zellige') {
        const f = N.fbm(u * 2.2, v * 2.2, 3); const g2 = N.fbm(u * 9, v * 9, 3);
        col = mix(mix(base, dark, 0.45), mix(base, [255, 255, 255], 0.22), f * 0.9 + (g2 - 0.5) * 0.4);
        const e = Math.min(x, y, W - 1 - x, H - 1 - y) / Math.min(W, H);
        if (e < 0.06) col = mix(col, dark, (0.06 - e) * 6);
      } else if (type === 'linen') {
        const wx = Math.sin(x * (proc.coarse ? 0.9 : 1.6)), wy = Math.sin(y * (proc.coarse ? 0.9 : 1.6));
        const nn = N.fbm(u * 40, v * 3, 2), mm = N.fbm(u * 3, v * 40, 2);
        col = mix(dark, base, 0.72 + (wx * 0.5 + nn - 0.5) * 0.12 + (wy * 0.5 + mm - 0.5) * 0.12);
      } else if (type === 'fluted') {
        const period = W / 18; const ph = (x % period) / period;
        const prof = Math.sin(ph * Math.PI);
        const grain = N.fbm(u * 2, v * 30, 3);
        col = mix(dark, base, 0.45 + prof * 0.45 + (grain - 0.5) * 0.3);
      } else {
        const f = N.fbm(u * 4, v * 4, 3);
        col = mix(base, mix(base, dark, 0.3), (f - 0.5) * 0.18 + 0.05);
      }
      const i = (y * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  if (type === 'terrazzo') {
    const chips = (proc.chips || ['#999999']); const n = Math.round(W * H / (proc.fine ? 60 : 260));
    for (let k = 0; k < n; k++) {
      g.fillStyle = chips[Math.floor(R() * chips.length)];
      const cx = R() * W, cy = R() * H, rr = (proc.fine ? 0.6 : 1.2 + R() * R() * 7) * (W / 256);
      g.beginPath(); const sides = 5 + Math.floor(R() * 3);
      for (let s = 0; s < sides; s++) { const a = (s / sides) * Math.PI * 2 + R() * 0.6; const rad = rr * (0.6 + R() * 0.6); g[s ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
      g.closePath(); g.fill();
    }
  }
  if (type === 'stripe' || type === 'arches') {
    g.fillStyle = rgbHex(...base); g.fillRect(0, 0, W, H);
    const lc = proc.line || rgbHex(...dark); g.strokeStyle = lc; g.fillStyle = lc;
    if (type === 'stripe') { const n = 14; for (let k = 0; k < n; k++) g.fillRect((k + 0.5) * W / n - W / 900 - 0.5, 0, Math.max(1, W / 450), H); }
    else {
      g.lineWidth = Math.max(1, W / 220); const cols = 4, rows = 3, cw = W / cols, rh = H / rows;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const x0 = k * cw + cw * 0.18, x1 = (k + 1) * cw - cw * 0.18, y1 = (r + 1) * rh - rh * 0.08, top = r * rh + rh * 0.12, rad = (x1 - x0) / 2;
        g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, top + rad); g.arc(x0 + rad, top + rad, rad, Math.PI, 0); g.lineTo(x1, y1); g.stroke();
      }
    }
    const N2 = makeNoise(9); const id = g.getImageData(0, 0, W, H); const dd = id.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (N2.n2(x * 0.7, y * 0.7) - 0.5) * 10; const i = (y * W + x) * 4; dd[i] += k; dd[i + 1] += k; dd[i + 2] += k; }
    g.putImageData(id, 0, 0);
  }
  if (proc.bevel) {
    const b = Math.max(2, Math.round(Math.min(W, H) * 0.07));
    const gr = (x0, y0, x1, y1, a) => { const gg = g.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, `rgba(${a > 0 ? '255,255,255' : '0,0,0'},${Math.abs(a)})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); return gg; };
    g.fillStyle = gr(0, 0, 0, b, 0.55); g.fillRect(0, 0, W, b);
    g.fillStyle = gr(0, 0, b, 0, 0.35); g.fillRect(0, 0, b, H);
    g.fillStyle = gr(0, H, 0, H - b, -0.22); g.fillRect(0, H - b, W, b);
    g.fillStyle = gr(W, 0, W - b, 0, -0.16); g.fillRect(W - b, 0, b, H);
  }
  return c;
}

/* ── texture photos ──────────────────────────────────────────────────────────────────────────────────────────── */
const imgCache = new Map();
export function loadImage(url) {
  if (!url) return Promise.reject(new Error('no url'));
  if (imgCache.has(url)) return imgCache.get(url);
  const pr = new Promise((resolve, reject) => {
    const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
    im.onload = () => resolve(im); im.onerror = () => { imgCache.delete(url); reject(new Error('image failed')); };
    im.src = url;
  });
  imgCache.set(url, pr); return pr;
}

/* ── public: tile variants ───────────────────────────────────────────────────────────────────────────────────── */
const tileCache = new Map();
/** variants of one tile at its true aspect; longest side <= maxPx */
export function tileImages(p, maxPx = 512, count = 4) {
  if (!p) return Promise.resolve([]);
  const key = p.id + '|' + (p.texture_url || '') + '|' + JSON.stringify(p.procedural || {}) + '|' + p.tile_w_mm + 'x' + p.tile_h_mm + '|' + maxPx;
  if (tileCache.has(key)) return tileCache.get(key);
  const tw = p.tile_w_mm, th = p.tile_h_mm; const k = maxPx / Math.max(tw, th);
  const W = Math.max(8, Math.round(tw * k)), H = Math.max(8, Math.round(th * k));
  const pr = (async () => {
    if (p.texture_url) {
      try {
        const im = await loadImage(p.texture_url);
        const R = rng(7 + p.id.length);
        const out = [];
        for (let i = 0; i < count; i++) {
          const c = canvas(W, H); const g = c.getContext('2d');
          // crop a region of the photo with the tile's aspect (planks take long strips across the grain direction of the photo)
          const ia = im.width / im.height, ta = W / H;
          let cw, ch; if (ta > ia) { cw = im.width; ch = im.width / ta; } else { ch = im.height; cw = im.height * ta; }
          const scale = isPlank(p) ? 1 : 0.85 + R() * 0.15; cw *= scale; ch *= scale;
          const sx = R() * Math.max(0, im.width - cw), sy = R() * Math.max(0, im.height - ch);
          g.drawImage(im, sx, sy, cw, ch, 0, 0, W, H);
          out.push(c);
        }
        return out;
      } catch (e) { /* fall through to colour */ }
    }
    const out = [];
    const n = (p.procedural && p.procedural.type === 'paint') ? 1 : count;
    for (let i = 0; i < n; i++) out.push(paintProcedural(p.procedural ? p : { ...p, procedural: { type: 'solid', base: p.hex || '#cccccc' } }, W, H, i + 1));
    return out;
  })();
  tileCache.set(key, pr);
  return pr;
}

/** a small square swatch for the product picker */
const swCache = new Map();
export function swatch(p, px = 160) {
  if (!p) return Promise.resolve(null);
  const key = p.id + '|' + px + '|' + (p.texture_url || '') + '|' + JSON.stringify(p.procedural || {});
  if (swCache.has(key)) return swCache.get(key);
  const pr = (async () => {
    const c = canvas(px, px); const g = c.getContext('2d');
    if (isContinuous(p)) {
      const [im] = await tileImages(p, 512, 1);
      if (im) g.drawImage(im, 0, 0, Math.min(im.width, im.height), Math.min(im.width, im.height), 0, 0, px, px);
    } else {
      const { drawLayout } = await import('./layout');
      const size = Math.max(p.tile_w_mm, p.tile_h_mm) / 1000 * (isPlank(p) ? 1.1 : 2.2);
      const lay = await drawLayout(p, { w: size, h: size, maxPx: px, layout: p.default_layout || 'straight', grout: defaultGrout(p) });
      g.drawImage(lay.canvas, 0, 0, px, px);
    }
    return c.toDataURL('image/jpeg', 0.86);
  })();
  swCache.set(key, pr);
  return pr;
}

export function defaultGrout(p) {
  if (!p) return { mm: 2, color: '#d9d6cf' };
  if (isPlank(p)) return { mm: 0.6, color: shade(p.hex || '#888888', 0.55) };
  if (p.kind === 'marble' || p.kind === 'quartz') return { mm: 1.5, color: shade(p.hex || '#eeeeee', 0.9) };
  const l = lum(p.hex || '#cccccc');
  return { mm: p.tile_w_mm <= 120 || p.tile_h_mm <= 120 ? 2 : 2.5, color: l > 0.55 ? '#d8d4cc' : '#4a4a4a' };
}

/* ── fallback catalogue (used until the database catalogue is published, or if it cannot be reached) ────────── */
export const FALLBACK_PRODUCTS = [
  ['vp_oak_natural', 'Natural Oak Plank', 'باركيه بلوط طبيعي', 'wood_floor', ['floor', 'wall_panel'], { type: 'wood', base: '#c49a64', dark: '#8a6234', seed: 11 }, 1200, 190, 'satin', 'brick', 'Wood floors', true],
  ['vp_oak_smoked', 'Smoked Oak Plank', 'باركيه بلوط مدخّن', 'wood_floor', ['floor', 'wall_panel'], { type: 'wood', base: '#7d5b3f', dark: '#4a321f', seed: 21 }, 1200, 190, 'satin', 'brick', 'Wood floors'],
  ['vp_oak_white', 'White Oak Herringbone', 'بلوط أبيض متعرّج', 'wood_floor', ['floor'], { type: 'wood', base: '#d9c2a0', dark: '#a88a63', seed: 31 }, 600, 120, 'matt', 'herringbone', 'Wood floors', true],
  ['vp_walnut', 'Walnut Plank', 'باركيه جوز', 'wood_floor', ['floor', 'wall_panel'], { type: 'wood', base: '#6a4630', dark: '#3d2617', seed: 41 }, 1500, 220, 'satin', 'brick', 'Wood floors'],
  ['vp_grey_lam', 'Ash Grey Laminate', 'لامينيت رمادي', 'laminate', ['floor'], { type: 'wood', base: '#a8a29a', dark: '#7a746c', seed: 51 }, 1380, 193, 'matt', 'brick', 'Laminate'],
  ['vp_spc_honey', 'Honey Oak SPC', 'أرضيات SPC عسلي', 'vinyl', ['floor'], { type: 'wood', base: '#b98a52', dark: '#86602f', seed: 61 }, 1220, 180, 'matt', 'brick', 'SPC / Vinyl'],
  ['vp_carrara', 'Carrara Marble', 'رخام كرارا', 'marble', ['floor', 'wall', 'backsplash', 'countertop', 'shower'], { type: 'marble', base: '#eeeeec', vein: '#9a9ea3', seed: 7 }, 600, 1200, 'polished', 'straight', 'Marble look', true],
  ['vp_calacatta', 'Calacatta Gold', 'كالاكاتا ذهبي', 'marble', ['floor', 'wall', 'backsplash', 'countertop', 'shower'], { type: 'marble', base: '#f4f1ea', vein: '#b8a17a', seed: 17, bold: 1 }, 600, 1200, 'polished', 'straight', 'Marble look', true],
  ['vp_nero', 'Nero Marquina', 'نيرو ماركينا', 'marble', ['floor', 'wall', 'backsplash', 'countertop', 'shower'], { type: 'marble', base: '#1f1f21', vein: '#d8d8d8', seed: 27 }, 600, 600, 'polished', 'straight', 'Marble look'],
  ['vp_travertine', 'Beige Travertine', 'ترافرتين بيج', 'stone', ['floor', 'wall', 'shower'], { type: 'stone', base: '#d8c7a9', dark: '#b9a37e', seed: 37, pits: 1 }, 600, 600, 'matt', 'brick', 'Stone look'],
  ['vp_concrete', 'Concrete Grey', 'خرساني رمادي', 'tile', ['floor', 'wall', 'backsplash', 'countertop'], { type: 'concrete', base: '#9c9b97', seed: 47 }, 600, 1200, 'matt', 'straight', 'Stone look', true],
  ['vp_terrazzo', 'Terrazzo Bianco', 'تيرازو أبيض', 'tile', ['floor', 'wall', 'backsplash'], { type: 'terrazzo', base: '#ece8e1', chips: ['#b9b2a7', '#7d7a74', '#d6a58a', '#5c6b73'], seed: 57 }, 600, 600, 'matt', 'straight', 'Terrazzo'],
  ['vp_sandstone', 'Sand Stone', 'حجر رملي', 'stone', ['floor', 'wall', 'shower'], { type: 'stone', base: '#cdb995', dark: '#a8936d', seed: 67 }, 300, 600, 'matt', 'thirds', 'Stone look'],
  ['vp_slate', 'Black Slate', 'أردواز أسود', 'stone', ['floor', 'wall', 'shower'], { type: 'concrete', base: '#3b3d40', seed: 77 }, 600, 600, 'textured', 'straight', 'Stone look'],
  ['vp_subway_white', 'White Subway Gloss', 'بلاط ميترو أبيض لامع', 'tile', ['wall', 'backsplash', 'shower'], { type: 'solid', base: '#f6f5f1', bevel: 1, seed: 3 }, 300, 75, 'gloss', 'brick', 'Wall tiles', true],
  ['vp_subway_sage', 'Sage Zellige', 'زليج أخضر', 'tile', ['wall', 'backsplash', 'shower'], { type: 'zellige', base: '#8fa38a', seed: 13 }, 100, 100, 'gloss', 'straight', 'Wall tiles', true],
  ['vp_zellige_white', 'White Zellige', 'زليج أبيض', 'tile', ['wall', 'backsplash', 'shower'], { type: 'zellige', base: '#ece7dc', seed: 23 }, 100, 100, 'gloss', 'straight', 'Wall tiles'],
  ['vp_navy_hex', 'Navy Hexagon', 'سداسي كحلي', 'tile', ['floor', 'wall', 'backsplash', 'shower'], { type: 'solid', base: '#2d3a55', seed: 33 }, 200, 200, 'satin', 'hexagon', 'Wall tiles'],
  ['vp_terracotta', 'Terracotta', 'تيراكوتا', 'tile', ['floor', 'wall', 'backsplash'], { type: 'stone', base: '#b8673f', dark: '#93502f', seed: 43 }, 200, 200, 'matt', 'straight', 'Wall tiles'],
  ['vp_q_white', 'Pure White Quartz', 'كوارتز أبيض', 'quartz', ['countertop', 'backsplash', 'wall_panel'], { type: 'concrete', base: '#f3f2ee', seed: 8, fine: 1 }, 3000, 1400, 'polished', 'straight', 'Worktops', true],
  ['vp_q_calacatta', 'Calacatta Quartz', 'كوارتز كالاكاتا', 'quartz', ['countertop', 'backsplash', 'wall_panel'], { type: 'marble', base: '#f2f0eb', vein: '#a69a86', seed: 18 }, 3000, 1400, 'polished', 'straight', 'Worktops', true],
  ['vp_q_nero', 'Nero Quartz', 'كوارتز أسود', 'quartz', ['countertop', 'backsplash', 'wall_panel'], { type: 'concrete', base: '#24262a', seed: 28, fine: 1 }, 3000, 1400, 'polished', 'straight', 'Worktops'],
  ['vp_granite', 'Absolute Black Granite', 'جرانيت أسود', 'granite', ['countertop', 'floor'], { type: 'terrazzo', base: '#1d1d1f', chips: ['#3a3a3c', '#4a4a4d', '#2a2a2c'], seed: 38, fine: 1 }, 3000, 1400, 'polished', 'straight', 'Worktops'],
  ['vp_p_white', 'Pure White', 'أبيض نقي', 'paint', ['wall', 'ceiling'], { type: 'paint', base: '#f7f6f2' }, 1000, 1000, 'matt', 'straight', 'Paint', true],
  ['vp_p_stone', 'Soft Stone', 'حجري ناعم', 'paint', ['wall', 'ceiling'], { type: 'paint', base: '#e3ddd1' }, 1000, 1000, 'matt', 'straight', 'Paint'],
  ['vp_p_clay', 'Clay Beige', 'بيج طيني', 'paint', ['wall'], { type: 'paint', base: '#d4c4b0' }, 1000, 1000, 'matt', 'straight', 'Paint'],
  ['vp_p_sage', 'Eucalyptus', 'أوكالبتوس', 'paint', ['wall'], { type: 'paint', base: '#a7b6a6' }, 1000, 1000, 'matt', 'straight', 'Paint', true],
  ['vp_p_navy', 'Deep Navy', 'كحلي داكن', 'paint', ['wall'], { type: 'paint', base: '#2f3b52' }, 1000, 1000, 'matt', 'straight', 'Paint'],
  ['vp_p_charcoal', 'Charcoal', 'فحمي', 'paint', ['wall'], { type: 'paint', base: '#3b3d3f' }, 1000, 1000, 'matt', 'straight', 'Paint'],
  ['vp_p_terracotta', 'Desert Rose', 'وردي صحراوي', 'paint', ['wall'], { type: 'paint', base: '#c99a86' }, 1000, 1000, 'matt', 'straight', 'Paint'],
  ['vp_wp_linen', 'Linen Weave', 'نسيج كتاني', 'wallpaper', ['wall'], { type: 'linen', base: '#ddd3c3', seed: 9 }, 530, 530, 'textured', 'straight', 'Wallpaper'],
  ['vp_wp_stripe', 'Pinstripe Ivory', 'خطوط عاجية', 'wallpaper', ['wall'], { type: 'stripe', base: '#efe9de', line: '#c9bba3', seed: 19 }, 530, 530, 'matt', 'straight', 'Wallpaper'],
  ['vp_wp_arch', 'Arches Sand', 'أقواس رملية', 'wallpaper', ['wall'], { type: 'arches', base: '#e6dccb', line: '#b99f78', seed: 29 }, 530, 530, 'matt', 'straight', 'Wallpaper', true],
  ['vp_fluted_oak', 'Fluted Oak Panel', 'ألواح بلوط مضلّعة', 'wall_panel', ['wall', 'wall_panel'], { type: 'fluted', base: '#b88a4e', dark: '#8a6232', seed: 39 }, 2800, 1200, 'satin', 'straight', 'Wall panels', true],
  ['vp_fluted_black', 'Fluted Charcoal Panel', 'ألواح فحمية مضلّعة', 'wall_panel', ['wall', 'wall_panel'], { type: 'fluted', base: '#3a3836', dark: '#242322', seed: 49 }, 2800, 1200, 'satin', 'straight', 'Wall panels'],
  ['vp_gloss_white', 'White Gloss Front', 'واجهة بيضاء لامعة', 'board', ['cabinet', 'wardrobe', 'door'], { type: 'paint', base: '#f7f7f5' }, 2800, 2070, 'gloss', 'straight', 'Board finishes'],
  ['vp_matt_navy', 'Super Matt Navy', 'كحلي مطفي', 'board', ['cabinet', 'wardrobe', 'door'], { type: 'paint', base: '#2c3550' }, 2800, 2070, 'matt', 'straight', 'Board finishes'],
  ['vp_matt_sage', 'Super Matt Sage', 'أخضر مطفي', 'board', ['cabinet', 'wardrobe', 'door'], { type: 'paint', base: '#7f8d77' }, 2800, 2070, 'matt', 'straight', 'Board finishes', true],
  ['vp_matt_cashmere', 'Super Matt Cashmere', 'كشميري مطفي', 'board', ['cabinet', 'wardrobe', 'door'], { type: 'paint', base: '#d8cfc0' }, 2800, 2070, 'matt', 'straight', 'Board finishes'],
  ['vp_carpet_grey', 'Soft Loop Carpet', 'سجاد رمادي', 'carpet', ['floor'], { type: 'linen', base: '#8f8b86', seed: 59, coarse: 1 }, 500, 500, 'textured', 'straight', 'Carpet tiles'],
].map(([id, name, name_ar, kind, applications, procedural, tile_w_mm, tile_h_mm, finish, default_layout, collection, featured], i) => ({
  id, name, name_ar, kind, applications, procedural, hex: procedural.base, tile_w_mm, tile_h_mm, finish, default_layout, collection, featured: !!featured, sort: i, texture_url: null, sku: null,
}));

/** pp_finishes rows (public catalogue table) -> visualizer board products, for the fallback catalogue */
export function finishesToProducts(rows) {
  return (rows || []).filter((f) => f && (f.texture_url || f.hex)).map((f, i) => ({
    id: 'vp_' + f.id, name: f.name, name_ar: null, kind: f.material_type === 'stone' ? 'stone' : 'board',
    applications: f.material_type === 'stone' ? ['cabinet', 'wardrobe', 'wall_panel', 'countertop', 'backsplash'] : ['cabinet', 'wardrobe', 'wall_panel', 'door'],
    texture_url: f.texture_url || null, procedural: f.texture_url ? null : { type: 'paint', base: f.hex }, hex: f.hex, tile_w_mm: 2800, tile_h_mm: 2070,
    finish: f.texture_url ? 'textured' : 'matt', default_layout: 'straight', sku: f.sku || null, brand: 'The Closets', collection: 'Board finishes', sort: 300 + i, featured: false,
  }));
}
