/* Procedural planting: date palms (curved tapered trunk + merged frond cards), olive-like trees and clipped shrubs.
 * All palms share ONE trunk InstancedMesh and ONE merged frond geometry => two draw calls regardless of count. */
import * as THREE from 'three';
import { mulberry32 } from './noise';
import { mergeGeometries, instanced } from './geom';
import { placed, mergeColored } from './builders';
import { leafCardTexture } from './pbr';

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
const _cardMat = new WeakMap();
function cardMaterial(M) {
  if (!_cardMat.has(M)) _cardMat.set(M, new THREE.MeshStandardMaterial({ map: leafCardTexture(), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.6, envMap: M.leaf.envMap, envMapIntensity: 0.5 }));
  return _cardMat.get(M);
}
/** olive tree: a leaning trunk, three limbs and a canopy of ~300 narrow leaf cards (alpha cut-outs, bent, tinted silver-green) in five crowns: no blobs */
export function buildOlive(M, x, z, s = 1, baseY = 0) {
  const grp = new THREE.Group(); grp.position.set(x, baseY, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.15 * s, 2.0 * s, 8), M.trunk);
  trunk.position.y = 1.0 * s; trunk.rotation.z = 0.06; trunk.castShadow = true; grp.add(trunk);
  const r = mulberry32(Math.floor(x * 31 + z * 17 + 5)), limbs = [], items = [], tints = [0x6f8a52, 0x85997a, 0x5c7a45, 0x9aa88a, 0x72875a];
  const crowns = [[0, 2.7, 0, 0.95], [-0.8, 2.45, 0.35, 0.7], [0.85, 2.55, -0.3, 0.75], [0.1, 3.15, 0.5, 0.6], [-0.2, 2.35, -0.8, 0.65]];
  crowns.forEach(([cx, cy, cz, cr], ci) => {
    const len = Math.hypot(cx, cy - 1.9, cz); const limb = new THREE.CylinderGeometry(0.03 * s, 0.06 * s, len * s, 6); limb.translate(0, len * s / 2, 0);
    limb.rotateZ(-Math.atan2(cx, cy - 1.9)); limb.rotateX(Math.atan2(cz, cy - 1.9)); limb.translate(0, 1.9 * s, 0); limbs.push(limb);
    for (let i = 0; i < 62; i++) {
      const a = r() * 6.283, b = Math.acos(2 * r() - 1), rr = cr * (0.35 + 0.65 * Math.cbrt(r())), px = cx + Math.sin(b) * Math.cos(a) * rr, py = cy + Math.cos(b) * rr * 0.7, pz = cz + Math.sin(b) * Math.sin(a) * rr;
      const lg = new THREE.PlaneGeometry(0.07 * s, 0.26 * s, 1, 3), p = lg.attributes.position;
      for (let v = 0; v < p.count; v++) { const t = (p.getY(v) + 0.13 * s) / (0.26 * s); p.setY(v, t * 0.26 * s); p.setZ(v, p.getZ(v) + t * t * 0.07 * s); }
      lg.computeVertexNormals();
      items.push({ geo: placed(lg, { x: px * s, y: py * s, z: pz * s, ry: r() * 6.283, rx: -(0.3 + r() * 1.1), rz: (r() - 0.5) * 0.6 }), color: tints[(ci + i) % tints.length] });
    }
  });
  const limbMesh = new THREE.Mesh(mergeGeometries(limbs.map((g) => { const n = g.index ? g.toNonIndexed() : g; return n; })), M.trunk); limbMesh.castShadow = true; grp.add(limbMesh);
  const canopy = new THREE.Mesh(mergeColored(items), cardMaterial(M)); canopy.castShadow = true; canopy.receiveShadow = true; grp.add(canopy);
  return grp;
}
