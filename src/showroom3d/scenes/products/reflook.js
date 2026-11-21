/* Reference-look furnishing helpers (round 2 of the realism pass): soft rounded upholstery forms instead of chamfered boxes, organic rugs, sheer curtains,
 * globe pendants, cylinder side tables and specimen trees. Like furnish.js every helper only RETURNS geometry (or {geo,color} items); the caller merges per material. */
import * as THREE from 'three';
import { projectUV, placed, prep } from '../../3d/builders';
import { mulberry32 } from '../../3d/noise';
import { PALETTE as P } from '../../3d/palette';
import * as pr from './props';

let Q = 1;   // 1 = medium / high (3 segments per rounded corner), 0 = low tier (1 segment)
export const setFurnishQuality = (q) => { Q = q ? 1 : 0; };

/** a soft rounded box (a cushion): dims along x / y / z, corner radius r. Vertices of a segmented box are pushed onto the rounded surface, so normals are exact and it stays one closed mesh. */
export function puff(dx, dy, dz, r = 0.06, { tile = 0.3, k = Q ? 3 : 1 } = {}) {
  r = Math.min(r, dx / 2, dy / 2, dz / 2); const N = 2 * k + 1, g = new THREE.BoxGeometry(dx, dy, dz, N, N, N), p = g.attributes.position, n = g.attributes.normal, h = [dx / 2, dy / 2, dz / 2];
  const remap = (c, hh) => { const i = Math.round(((c + hh) / (2 * hh)) * N); return i <= k ? -hh + r * (i / k) : i >= N - k ? hh - r * ((N - i) / k) : c < 0 ? -hh + r : hh - r; };
  const v = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(remap(p.getX(i), h[0]), remap(p.getY(i), h[1]), remap(p.getZ(i), h[2]));
    c.set(Math.max(-h[0] + r, Math.min(h[0] - r, v.x)), Math.max(-h[1] + r, Math.min(h[1] - r, v.y)), Math.max(-h[2] + r, Math.min(h[2] - r, v.z)));
    d.subVectors(v, c); if (d.lengthSq() > 1e-12) { d.normalize(); v.copy(c).addScaledVector(d, r); n.setXYZ(i, d.x, d.y, d.z); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return projectUV(g, { tile });
}

/** an organic (pebble-shaped) rug outline in the XY plane (the caller lays it flat with rotation.x = -PI/2); w along x, d along y */
export function organicRug(w, d, seed = 1) {
  const r = mulberry32(seed), pts = [], n = 9;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.86 + r() * 0.26; pts.push(new THREE.Vector2(Math.cos(a) * w / 2 * k, Math.sin(a) * d / 2 * k)); }
  const curve = new THREE.SplineCurve([...pts, pts[0]]), sh = new THREE.Shape(curve.getPoints(Q ? 48 : 20));
  const g = new THREE.ShapeGeometry(sh), pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 0.9; uv[i * 2 + 1] = pos.getY(i) / 0.9; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}

/** a sheer floor-to-ceiling curtain: a pleated plane (len along x, h up, pleats along z), centred on its foot line */
export function curtain(len, h, { pleats = 9, amp = 0.045, seed = 3 } = {}) {
  const r = mulberry32(seed), ph = r() * 6, g = new THREE.PlaneGeometry(len, h, pleats * (Q ? 6 : 3), 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len + 0.5, t = p.getY(i) / h + 0.5; p.setZ(i, (amp * (0.75 + 0.25 * t)) * Math.sin(u * pleats * Math.PI * 2 + ph) + amp * 0.3 * Math.sin(u * pleats * 4.7 + ph * 2)); p.setY(i, p.getY(i) + h / 2); }
  g.computeVertexNormals(); return g;
}

/** globe pendant: { glass: [geo] (emissive opal globe), metal: [geo] (cap + cord) } hanging from yTop */
export function globePendant(x, y, z, yTop, { r = 0.11 } = {}) {
  return { glass: [prep(placed(new THREE.SphereGeometry(r, Q ? 24 : 12, Q ? 16 : 8), { x, y, z }))],
    metal: [prep(placed(new THREE.CylinderGeometry(r * 0.32, r * 0.42, r * 0.3, 16), { x, y: y + r * 1.02, z })), prep(placed(new THREE.CylinderGeometry(0.004, 0.004, Math.max(0.05, yTop - y - r), 5), { x, y: (yTop + y + r) / 2, z }))] };
}

/** cylinder side table (mirror steel / brass): a drum with a slightly proud top */
export function sideTable(x, z, { r = 0.2, h = 0.46 } = {}) {
  return [prep(placed(new THREE.CylinderGeometry(r, r, h, Q ? 40 : 16), { x, y: h / 2, z })), prep(placed(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.012, Q ? 40 : 16), { x, y: h + 0.006, z }))];
}

/** a specimen tree in a big dark planter (the reference showrooms use them as room dividers) */
export function tree(x, z, { h = 2.3, seed = 31, potR = 0.3 } = {}) {
  return pr.plant(x, 0, z, { h, leaves: Q ? 90 : 36, potR, seed, potColor: P.ceramicDark, spread: 0.55, leafSize: 0.17 });
}
