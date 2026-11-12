/* Procedural planting: date palms (curved tapered trunk + merged frond cards), olive-like trees and clipped shrubs.
 * All palms share ONE trunk InstancedMesh and ONE merged frond geometry => two draw calls regardless of count. */
import * as THREE from 'three';
import { mulberry32 } from './noise';
import { mergeGeometries, instanced } from './geom';

function frondGeometry(len, width, droop, curl) {
  const segs = 8, g = new THREE.PlaneGeometry(width, len, 1, segs);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = (p.getY(i) + len / 2) / len;                 // 0 at the base, 1 at the tip
    p.setY(i, v * len * Math.cos(v * droop * 0.6));
    p.setZ(i, Math.sin(v * droop) * len * 0.42 * v + Math.abs(p.getX(i)) * curl * v);
    p.setX(i, p.getX(i) * (1 - 0.35 * v));
  }
  g.computeVertexNormals();
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function transformed(g, x, y, z, rx, ry, rz, s) {
  const c = g.clone(); _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(s, s, s); _m.compose(_v, _q, _s); c.applyMatrix4(_m); return c;
}

/** palms: [{x,z,h,seed}] -> { trunks: InstancedMesh, crowns: Mesh } */
export function buildPalms(palms, M, frondsPerPalm) {
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.34, 1, 10, 6, true);
  trunkGeo.translate(0, 0.5, 0);
  const trunkItems = [], parts = [];
  const frondG = frondGeometry(3.4, 1.15, 1.25, 0.25), frondGShort = frondGeometry(2.4, 0.95, 1.5, 0.3);
  palms.forEach((p, k) => {
    const r = mulberry32((p.seed || 1) * 977 + k);
    const lean = (r() - 0.5) * 0.12, ry = r() * Math.PI * 2, h = p.h || 8 + r() * 3;
    trunkItems.push({ x: p.x, y: 0, z: p.z, sx: 1, sy: h, sz: 1, rx: lean, rz: lean * 0.7, ry });
    const top = [p.x + Math.sin(lean * 0.7) * h * 0.5, h, p.z + Math.sin(lean) * h * 0.5];
    const n = frondsPerPalm;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.35, elev = i % 3 === 0 ? 0.95 + r() * 0.3 : 0.25 + r() * 0.55;
      const g = i % 3 === 0 ? frondGShort : frondG;
      // frond cards lie along +Y; tilt out by `up`, then spin around the crown
      parts.push(transformed(g, top[0], top[1], top[2], Math.PI / 2 - elev, a, 0, 0.9 + r() * 0.35));
    }
  });
  const trunks = instanced(trunkGeo, M.trunk, trunkItems, { cast: true, receive: true });
  const crowns = new THREE.Mesh(mergeGeometries(parts), M.frond);
  crowns.receiveShadow = false; crowns.castShadow = false; crowns.frustumCulled = false;
  parts.forEach((g) => g.dispose());
  return { trunks, crowns };
}

/** shrubs / clipped topiary: displaced icospheres on a shared geometry, tinted per instance */
export function buildShrubs(items, M, seed = 3) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position, r = mulberry32(seed);
  for (let i = 0; i < p.count; i++) { const k = 1 + (r() - 0.5) * 0.22; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.82, p.getZ(i) * k); }
  g.computeVertexNormals();
  const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * 0.5 + 0.5; uv[i * 2 + 1] = p.getZ(i) * 0.5 + 0.5; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const im = instanced(g, M.leaf, items.map((s) => ({ x: s.x, y: s.r * 0.78, z: s.z, sx: s.r, sy: s.r * (s.flat || 1), sz: s.r * (s.depth || 1), ry: (s.ry || 0) })), { cast: true, receive: true });
  return im;
}

/** a single olive-type tree: gnarled trunk + clustered canopy; used in the hall planters and the entrance court */
export function buildOlive(M, x, z, s = 1, baseY = 0) {
  const grp = new THREE.Group(); grp.position.set(x, baseY, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.16 * s, 2.1 * s, 8), M.trunk);
  trunk.position.y = 1.05 * s; trunk.rotation.z = 0.06; trunk.castShadow = true; grp.add(trunk);
  const blobs = new THREE.IcosahedronGeometry(1, 2), r = mulberry32(Math.floor(x * 31 + z * 17 + 5));
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(blobs, M.leaf), k = (0.75 + r() * 0.5) * s;
    b.position.set((r() - 0.5) * 1.6 * s, (2.4 + r() * 0.9) * s, (r() - 0.5) * 1.6 * s); b.scale.set(k, k * 0.72, k); b.castShadow = true; b.receiveShadow = true; grp.add(b);
  }
  return grp;
}
