/* Clean procedural props: vases, bowls, books, plates, glasses, garments on hangers, folded linen, bags, boxes, stools, plants, lamps.
 * Each builder returns [{geo, color}] (geometry already placed) so a whole shelf merges into ONE vertex-coloured mesh (mergeColored).
 * Deliberately simple and tidy: these are styling objects, not product claims. */
import * as THREE from 'three';
import { PALETTE as P } from '../../3d/palette';
import { bevelBox, placed, tube } from '../../3d/builders';
import { mulberry32 } from '../../3d/noise';

const G = (geo, color, t) => ({ geo: t ? placed(geo, t) : geo, color });
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export function vase(x, y, z, { h = 0.3, r = 0.07, color = P.ceramicSand, neck = 0.35, s = 1 } = {}) {
  const pts = [[0.001, 0], [r * 0.7, 0.002], [r, h * 0.28], [r * 0.95, h * 0.55], [r * neck, h * 0.86], [r * neck * 1.12, h], [r * neck * 0.9, h * 0.995], [0.001, h * 0.98]];
  return [G(lathe(pts, 22), color, { x, y, z, s })];
}
export function bowl(x, y, z, { r = 0.13, h = 0.06, color = P.ceramicWhite, s = 1 } = {}) {
  return [G(lathe([[0.001, 0], [r * 0.4, 0.003], [r * 0.85, h * 0.55], [r, h], [r * 0.97, h], [r * 0.82, h * 0.6], [r * 0.36, 0.012], [0.001, 0.012]], 22), color, { x, y, z, s })];
}
export function plateStack(x, y, z, n = 4, { r = 0.13, color = P.ceramicWhite } = {}) {
  const out = []; for (let i = 0; i < n; i++) out.push(G(lathe([[0.001, 0], [r * 0.7, 0.002], [r, 0.014], [r * 0.99, 0.016], [r * 0.7, 0.006], [0.001, 0.006]], 22), color, { x, y: y + i * 0.016, z })); return out;
}
export function glass(x, y, z, { h = 0.11, r = 0.034 } = {}) {
  return [G(lathe([[0.001, 0], [r * 0.7, 0.002], [r, h], [r * 0.93, h], [r * 0.66, 0.008], [0.001, 0.008]], 14), P.ceramicWhite, { x, y, z })];
}
export function mug(x, y, z, { color = P.ceramicTerra, ry = 0 } = {}) {
  return [G(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 14, 1), color, { x, y: y + 0.045, z }), G(new THREE.TorusGeometry(0.026, 0.006, 6, 12, Math.PI), color, { x: x + 0.045 * Math.cos(ry), y: y + 0.045, z: z - 0.045 * Math.sin(ry), rz: -Math.PI / 2, ry })];
}
export function books(x, y, z, { n = 4, w = 0.2, d = 0.15, ry = 0, seed = 1, horizontal = true } = {}) {
  const r = mulberry32(seed), cols = [P.bookA, P.bookB, P.bookC, P.bookD], out = []; let yy = y;
  for (let i = 0; i < n; i++) {
    const h = 0.022 + r() * 0.018, ww = w * (0.85 + r() * 0.25);
    out.push(G(bevelBox(ww, h, d * (0.9 + r() * 0.15), { b: 0.001 }), cols[(i + seed) % 4], { x: x + (r() - 0.5) * 0.015, y: yy + h / 2, z: z + (r() - 0.5) * 0.015, ry: ry + (r() - 0.5) * 0.12 })); yy += h;
  }
  return out;
}
export function bookRow(x, y, z, n, { seed = 2, h = 0.26, d = 0.18, along = 'z' } = {}) {
  const r = mulberry32(seed), cols = [P.bookA, P.bookB, P.bookC, P.bookD, P.fabricClay, P.ceramicSand], out = []; let p = 0;
  for (let i = 0; i < n; i++) { const t = 0.022 + r() * 0.03, hh = h * (0.85 + r() * 0.2); out.push(G(bevelBox(along === 'z' ? d : t, hh, along === 'z' ? t : d, { b: 0.001 }), cols[(i * 5 + seed) % 6], { x: along === 'z' ? x : x + p + t / 2, y: y + hh / 2, z: along === 'z' ? z + p + t / 2 : z })); p += t + 0.002; }
  return out;
}
export function fruitBowl(x, y, z, seed = 3) {
  const r = mulberry32(seed), out = bowl(x, y, z, { r: 0.16, h: 0.07, color: P.ceramicDark }), cols = [P.fruitLemon, P.fruitApple, P.fruitOrange, P.fruitLemon];
  for (let i = 0; i < 6; i++) { const a = r() * 6.28, rr = r() * 0.07, rad = 0.032 + r() * 0.008; out.push(G(new THREE.SphereGeometry(rad, 10, 8), cols[i % 4], { x: x + Math.cos(a) * rr, y: y + 0.05 + (i > 3 ? 0.04 : 0) + rad * 0.5, z: z + Math.sin(a) * rr, s: [1, 0.92, 1] })); }
  return out;
}
export function potOnHob(x, y, z) {
  return [G(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 20), P.steelPot, { x, y: y + 0.06, z }), G(new THREE.CylinderGeometry(0.104, 0.104, 0.012, 20), P.steelPot, { x, y: y + 0.126, z }),
    G(new THREE.SphereGeometry(0.014, 8, 6), P.brassLamp, { x, y: y + 0.14, z }), G(bevelBox(0.09, 0.012, 0.022, { b: 0.0008 }), P.steelPot, { x: x + 0.15, y: y + 0.105, z })];
}
export function utensilCrock(x, y, z) {
  const out = [G(lathe([[0.001, 0], [0.05, 0], [0.052, 0.14], [0.046, 0.14], [0.044, 0.01], [0.001, 0.01]], 14), P.ceramicWhite, { x, y, z })];
  [[-0.02, 0.2, 0.1], [0.01, 0.24, -0.15], [0.025, 0.21, 0.2]].forEach(([dx, hh, tilt], i) => out.push(G(new THREE.CylinderGeometry(0.006, 0.009, hh, 6), P.woodSpoon, { x: x + dx, y: y + 0.09 + hh / 2, z: z + (i - 1) * 0.01, rz: tilt })));
  return out;
}
export function cuttingBoard(x, y, z, { ry = 0.3 } = {}) {
  const out = [G(bevelBox(0.36, 0.022, 0.24, { b: 0.003 }), P.woodSpoon, { x, y: y + 0.011, z, ry })];
  for (const [dx, dz] of [[-0.04, 0.02], [0.05, -0.03], [0.0, 0.05]]) out.push(G(new THREE.SphereGeometry(0.03, 10, 8), P.fruitLemon, { x: x + dx, y: y + 0.04, z: z + dz, s: [1.25, 0.85, 1] }));
  return out;
}
export function candle(x, y, z, { h = 0.12, color = P.fabricCream } = {}) { return [G(new THREE.CylinderGeometry(0.03, 0.03, h, 14), color, { x, y: y + h / 2, z })]; }
export function pendantShade(x, y, z, { r = 0.17, h = 0.2 } = {}) { return lathe([[0.012, h], [r * 0.45, h * 0.92], [r, 0.0], [r * 0.97, 0.0], [r * 0.42, h * 0.86], [0.01, h * 0.99]], 24).translate(x, y, z); }

/** a hanging garment: silhouette extruded (depth d), hanging from y downward, on a slim hanger. type: shirt | dress | coat | trousers | knit */
export function garment(type, x, y, z, { color = P.fabricLinen, ry = 0, s = 1, seed = 1 } = {}) {
  const sh = new THREE.Shape();
  const poly = {
    shirt: [[-0.07, 0], [-0.2, -0.04], [-0.3, -0.34], [-0.24, -0.38], [-0.185, -0.17], [-0.19, -0.7], [0.19, -0.7], [0.185, -0.17], [0.24, -0.38], [0.3, -0.34], [0.2, -0.04], [0.07, 0]],
    dress: [[-0.06, 0], [-0.19, -0.05], [-0.17, -0.22], [-0.15, -0.34], [-0.3, -1.12], [0.3, -1.12], [0.15, -0.34], [0.17, -0.22], [0.19, -0.05], [0.06, 0]],
    coat: [[-0.08, 0], [-0.23, -0.05], [-0.33, -0.55], [-0.28, -0.6], [-0.22, -0.25], [-0.24, -1.0], [0.24, -1.0], [0.22, -0.25], [0.28, -0.6], [0.33, -0.55], [0.23, -0.05], [0.08, 0]],
    knit: [[-0.08, 0], [-0.2, -0.05], [-0.31, -0.42], [-0.25, -0.46], [-0.2, -0.2], [-0.21, -0.55], [0.21, -0.55], [0.2, -0.2], [0.25, -0.46], [0.31, -0.42], [0.2, -0.05], [0.08, 0]],
    trousers: [[-0.2, 0], [0.2, 0], [0.21, -0.45], [0.2, -0.82], [0.02, -0.82], [0.0, -0.4], [-0.02, -0.82], [-0.2, -0.82], [-0.21, -0.45]],
  }[type] || [];
  poly.forEach(([px, py], i) => (i ? sh.lineTo(px * s, py * s - 0.03) : sh.moveTo(px * s, py * s - 0.03)));
  sh.closePath();
  const depth = type === 'coat' ? 0.07 : 0.045;
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 2 });
  g.translate(0, 0, -depth / 2);
  const out = [G(g, color, { x, y, z, ry })];
  // hanger: slim shoulder bar + hook (rotated with the garment)
  const hb = placed(bevelBox(0.4 * s + 0.04, 0.006, 0.006, { b: 0.0008 }), { y: -0.03, ry }), hook = placed(new THREE.TorusGeometry(0.018, 0.0025, 5, 10, Math.PI * 1.5), { y: 0.0, ry });
  hb.translate(x, y, z); hook.translate(x, y + 0.012, z);
  out.push(G(hb, P.steelPot), G(hook, P.steelPot));
  return out;
}
export function foldedStack(x, y, z, { n = 4, w = 0.34, d = 0.3, seed = 1, colors = [P.fabricLinen, P.fabricSage, P.fabricCream, P.fabricClay] } = {}) {
  const r = mulberry32(seed), out = []; let yy = y;
  for (let i = 0; i < n; i++) { const h = 0.03 + r() * 0.025; out.push(G(bevelBox(w * (0.95 + r() * 0.08), h, d * (0.95 + r() * 0.08), { b: 0.006 }), colors[(i + seed) % colors.length], { x: x + (r() - 0.5) * 0.012, y: yy + h / 2, z: z + (r() - 0.5) * 0.012, ry: (r() - 0.5) * 0.05 })); yy += h; }
  return out;
}
export function bag(x, y, z, { color = P.fabricClay, w = 0.3, h = 0.22, d = 0.12, ry = 0 } = {}) {
  const out = [G(bevelBox(w, h, d, { b: 0.014 }), color, { x, y: y + h / 2, z, ry })];
  const hh = new THREE.TorusGeometry(w * 0.28, 0.006, 6, 14, Math.PI); out.push(G(hh, P.brassLamp, { x, y: y + h, z, ry }));
  return out;
}
export function storageBox(x, y, z, { w = 0.34, h = 0.2, d = 0.28, color = P.fabricCream, lid = true } = {}) {
  const out = [G(bevelBox(w, h, d, { b: 0.006 }), color, { x, y: y + h / 2, z })];
  if (lid) out.push(G(bevelBox(w + 0.01, 0.018, d + 0.01, { b: 0.004 }), P.fabricLinen, { x, y: y + h + 0.009, z }));
  return out;
}
export function shoe(x, y, z, { color = P.fabricCharcoal, ry = 0 } = {}) {
  return [G(bevelBox(0.28, 0.07, 0.095, { b: 0.025 }), color, { x, y: y + 0.035, z, ry }), G(bevelBox(0.1, 0.1, 0.09, { b: 0.03 }), color, { x: x - 0.09 * Math.cos(ry), y: y + 0.06, z: z + 0.09 * Math.sin(ry) * 0, ry }), G(bevelBox(0.075, 0.02, 0.09, { b: 0.006 }), P.fabricCream, { x: x - 0.11, y: y + 0.01, z, ry })];
}

/** potted plant: terracotta pot + curved stems with elliptic leaves (two greens). h = overall height */
export function plant(x, y, z, { h = 1.2, leaves = 26, potR = 0.17, seed = 1, potColor = P.potTerra, spread = 0.35, leafSize = 0.11 } = {}) {
  const r = mulberry32(seed), out = [G(lathe([[0.001, 0], [potR * 0.7, 0], [potR, potR * 1.5], [potR * 1.04, potR * 1.62], [potR * 0.92, potR * 1.62], [potR * 0.9, potR * 1.5], [0.001, potR * 1.5]], 18), potColor, { x, y, z })];
  const top = y + potR * 1.5, tall = h - potR * 1.5;
  out.push(G(new THREE.CylinderGeometry(potR * 0.88, potR * 0.88, 0.01, 14), 0x2b2118, { x, y: top - 0.005, z }));
  const stems = 4 + Math.round(leaves / 7);
  for (let s = 0; s < stems; s++) {
    const a = (s / stems) * 6.28 + r(), lean = 0.04 + r() * spread, top2 = tall * (0.55 + r() * 0.45);
    const pts = [[0, 0, 0], [Math.cos(a) * lean * 0.3, top2 * 0.4, Math.sin(a) * lean * 0.3], [Math.cos(a) * lean, top2, Math.sin(a) * lean]];
    out.push(G(tube(pts, 0.006, { seg: 6, radial: 5 }), P.trunk, { x, y: top, z }));
    const n = Math.round(leaves / stems);
    for (let i = 0; i < n; i++) {
      const k = 0.35 + 0.65 * (i / n), px = Math.cos(a) * lean * k * k + (r() - 0.5) * 0.06, pz = Math.sin(a) * lean * k * k + (r() - 0.5) * 0.06, py = top2 * k;
      const lg = new THREE.SphereGeometry(leafSize * (0.8 + r() * 0.5), 7, 5); lg.scale(1, 0.12, 0.55);
      out.push(G(lg, (i + s) % 3 ? P.leaf : P.leafDeep, { x: x + px, y: top + py, z: z + pz, ry: r() * 6.28, rz: (r() - 0.5) * 1.2, rx: (r() - 0.5) * 0.6 }));
    }
  }
  return out;
}
/** pampas / dried stems in a vase */
export function stems(x, y, z, { n = 7, h = 0.7, seed = 5, color = P.fabricCream } = {}) {
  const r = mulberry32(seed), out = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, hh = h * (0.7 + r() * 0.4), lean = 0.04 + r() * 0.1, pts = [[0, 0, 0], [Math.cos(a) * lean * 0.4, hh * 0.5, Math.sin(a) * lean * 0.4], [Math.cos(a) * lean, hh, Math.sin(a) * lean]];
    out.push(G(tube(pts, 0.0035, { seg: 6, radial: 4 }), P.woodSpoon, { x, y, z }));
    const pl = new THREE.SphereGeometry(0.03, 7, 5); pl.scale(0.7, 2.6, 0.7);
    out.push(G(pl, color, { x: x + Math.cos(a) * lean, y: y + hh, z: z + Math.sin(a) * lean, rz: Math.cos(a) * 0.3, rx: -Math.sin(a) * 0.3 }));
  }
  return out;
}
/** bar stool: cushioned seat, four slim legs, a brass foot ring. Returns two lists: soft (fabric) and hard (metal) */
export function stool(x, z, { h = 0.66, color = P.fabricClay, ry = 0 } = {}) {
  const soft = [G(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20), color, { x, y: h - 0.03, z })];
  const hard = [G(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 20), P.steelPot, { x, y: h - 0.066, z })];
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4 + ry; hard.push(G(new THREE.CylinderGeometry(0.012, 0.009, h - 0.07, 6), P.brassLamp, { x: x + Math.cos(a) * 0.15, y: (h - 0.07) / 2, z: z + Math.sin(a) * 0.15, rx: -Math.sin(a) * 0.1, rz: Math.cos(a) * 0.1 })); }
  hard.push(G(new THREE.TorusGeometry(0.15, 0.007, 6, 24), P.brassLamp, { x, y: 0.24, z, rx: Math.PI / 2 }));
  return { soft, hard };
}
export function tableLamp(x, y, z) {
  return { body: [G(lathe([[0.001, 0], [0.07, 0], [0.09, 0.02], [0.03, 0.14], [0.02, 0.28], [0.001, 0.3]], 16), P.brassLamp, { x, y, z })], shade: new THREE.CylinderGeometry(0.1, 0.16, 0.2, 24, 1, true).translate(x, y + 0.4, z) };
}
