/* Shared furnishing helpers for the five departments added after Phase 4 (bedroom, walk-in closet, living, studio, lounge): carcass shells, rails
 * with garments, seating, tables and a few small props. Every helper only RETURNS placed geometry (or {geo,color} items) so the caller merges it
 * per material (one draw call per material class). Product frame: +X toward the visitor, wall at x = -3, Y up. */
import * as THREE from 'three';
import { bevelBox, placed, prep } from '../../3d/builders';
import { PALETTE as P } from '../../3d/palette';
import * as pr from './props';

export const fin = bevelBox;
const T = (g, t) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(t.x || 0, t.y || 0, t.z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, t.ry || 0, 0)), new THREE.Vector3(1, 1, 1)); g.applyMatrix4(m); return g; };
/** move / rotate (about Y) a list of geometries as one rigid object */
export const xf = (list, t) => list.map((g) => T(g, t));
export const GARMENT_COLS = [P.fabricLinen, P.fabricSage, P.fabricClay, P.fabricNavy, P.fabricCream, P.fabricCharcoal, P.fabricBlush];

/** carcass of a cabinet run: back (against x0), top, bottom, two ends and dividers. Returns an array of geometries (add with kit.addStatic(g, carcassMat)). */
export function shell({ x0, x1, y0, y1, z0, z1, divs = [], th = 0.018, grain = 'y' }) {
  const d = x1 - x0, H = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, L = z1 - z0, out = [];
  out.push(placed(fin(th, H, L, { b: 0.0008, grain }), { x: x0 + th / 2, y: cy, z: (z0 + z1) / 2 }), placed(fin(d, th, L, { b: 0.0008, grain: 'z' }), { x: cx, y: y1 - th / 2, z: (z0 + z1) / 2 }), placed(fin(d, th, L, { b: 0.0008, grain: 'z' }), { x: cx, y: y0 + th / 2, z: (z0 + z1) / 2 }));
  for (const z of [z0 + th / 2, ...divs, z1 - th / 2]) out.push(placed(fin(d - 0.02, H, th, { b: 0.0008, grain, off: [z, 0] }), { x: cx - 0.01, y: cy, z }));
  return out;
}
/** a shelf (edge-banded in the second material list) */
export function shelf(x0, depth, y, z0, z1, lists, { th = 0.022 } = {}) {
  lists.board.push(placed(fin(depth, th, z1 - z0, { b: 0.001, grain: 'z', off: [y, 0.2] }), { x: x0 + depth / 2 + 0.018, y, z: (z0 + z1) / 2 }));
  lists.band.push(placed(fin(0.004, th + 0.004, z1 - z0, { b: 0.0006, tile: 0.4 }), { x: x0 + depth + 0.02, y, z: (z0 + z1) / 2 }));
}
/** clothes rail along Z: tube + two end brackets, into `hw` */
export function rail(hw, x, y, z0, z1) {
  hw.push(prep(placed(new THREE.CylinderGeometry(0.0125, 0.0125, z1 - z0, 12), { x, y, z: (z0 + z1) / 2, rx: Math.PI / 2 })), prep(placed(fin(0.04, 0.04, 0.012, { b: 0.001 }), { x, y: y + 0.02, z: z0 })), prep(placed(fin(0.04, 0.04, 0.012, { b: 0.001 }), { x, y: y + 0.02, z: z1 })));
}
/** garments hung along a rail, like clothes in a real wardrobe (soft = vertex-coloured items) */
export function hang(soft, x, y, z0, z1, types, seed = 1, { s = 0.82 } = {}) {
  let z = z0, i = 0;
  while (z < z1 - 0.03) { const type = types[(i + seed) % types.length]; soft.push(...pr.garment(type, x, y, z, { color: GARMENT_COLS[(i * 3 + seed) % GARMENT_COLS.length], s: type === 'dress' || type === 'coat' ? s - 0.02 : s, ry: Math.PI / 2, seed: i + seed })); z += 0.062 + (i % 3) * 0.01; i++; }
}

/** sofa / lounge chair, built in its own frame (seat front toward +X, back at -X) then moved to (x, z) turned by ry. Returns {soft, hard}: upholstery + brass feet. */
export function sofa({ x, z, ry = 0, w = 2.3, d = 0.95, seatH = 0.44, backH = 0.84, seats = 3, tile = 0.3 }) {
  const soft = [], hard = [], arm = 0.2, inW = w - 2 * arm, cw = inW / seats;
  soft.push(placed(fin(d, seatH - 0.1, w, { b: 0.04, tile }), { x: 0, y: 0.1 + (seatH - 0.1) / 2 }));                                       // base
  soft.push(placed(fin(0.22, backH - 0.1, w, { b: 0.07, tile }), { x: -d / 2 + 0.11, y: seatH + (backH - seatH) / 2 + 0.05 }));              // back rest
  for (const s of [-1, 1]) soft.push(placed(fin(d, backH * 0.62 - 0.1 + 0.1, arm, { b: 0.06, tile }), { x: 0, y: 0.1 + (backH * 0.62) / 2 + 0.06, z: s * (w / 2 - arm / 2) }));   // arms
  for (let i = 0; i < seats; i++) {
    const zc = -inW / 2 + cw * (i + 0.5);
    soft.push(placed(fin(d - 0.28, 0.14, cw - 0.012, { b: 0.05, tile }), { x: 0.1, y: seatH + 0.06, z: zc }));                                  // seat cushion
    soft.push(placed(fin(0.17, 0.42, cw - 0.04, { b: 0.07, tile }), { x: -d / 2 + 0.32, y: seatH + 0.3, z: zc, rz: -0.2 }));                      // back cushion, leaning
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) hard.push(placed(new THREE.CylinderGeometry(0.02, 0.014, 0.1, 10), { x: sx * (d / 2 - 0.1), y: 0.05, z: sz * (w / 2 - 0.1) }));
  return { soft: xf(soft.map(prep), { x, z, ry }), hard: xf(hard.map(prep), { x, z, ry }) };
}
/** a small round pouf / stool */
export function pouf({ x, z, r = 0.22, h = 0.42 }) { return { soft: [prep(placed(new THREE.CylinderGeometry(r, r * 0.95, h - 0.04, 28), { x, y: 0.04 + (h - 0.04) / 2, z }))], hard: [prep(placed(new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.04, 20), { x, y: 0.02, z }))] }; }
/** dining / studio chair: seat, back, four slim legs. Faces +X when ry = 0. */
export function chair({ x, z, ry = 0, tile = 0.3 }) {
  const soft = [placed(fin(0.46, 0.07, 0.48, { b: 0.025, tile }), { x: 0, y: 0.45 }), placed(fin(0.07, 0.4, 0.46, { b: 0.03, tile }), { x: -0.22, y: 0.72, rz: -0.08 })], hard = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) hard.push(placed(new THREE.CylinderGeometry(0.013, 0.01, 0.43, 8), { x: sx * 0.19, y: 0.215, z: sz * 0.2 }));
  return { soft: xf(soft.map(prep), { x, z, ry }), hard: xf(hard.map(prep), { x, z, ry }) };
}
/** a table top on four legs: top goes in `top`, legs in `legs` */
export function tableTop({ x, z, w, d, h, th = 0.04, legInset = 0.1, legR = 0.022, ry = 0 }) {
  const top = [placed(fin(d, th, w, { b: 0.004, grain: 'z' }), { x: 0, y: h - th / 2 })], legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push(placed(new THREE.CylinderGeometry(legR, legR * 0.8, h - th, 10), { x: sx * (d / 2 - legInset), y: (h - th) / 2, z: sz * (w / 2 - legInset) }));
  return { top: xf(top.map(prep), { x, z, ry }), legs: xf(legs.map(prep), { x, z, ry }) };
}
/** a round-edged brass tray with small bottles (dressing table / console / reception) */
export function trayOf(x, y, z, { w = 0.34, d = 0.2, ry = 0 } = {}) { return [{ geo: placed(fin(d, 0.012, w, { b: 0.004 }), { x, y: y + 0.006, z, ry }), color: P.brassPale }]; }
export function bottle(x, y, z, { h = 0.14, r = 0.026, color = P.ceramicWhite } = {}) { return pr.vase(x, y, z, { h, r, color, neck: 0.4 }); }
