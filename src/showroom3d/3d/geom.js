/* Small geometry helpers (no three/examples imports: those are ESM-only and stubbed under Jest). */
import * as THREE from 'three';

/** planar world-space UVs for axis-aligned geometry: u,v follow the dominant face axis, one texture tile = `tile` metres */
export function worldUV(geometry, tile = 1, offset = [0, 0]) {
  const pos = geometry.attributes.position, nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let a, b;
    if (ny >= nx && ny >= nz) { a = pos.getX(i); b = pos.getZ(i); }
    else if (nx >= nz) { a = pos.getZ(i); b = pos.getY(i); }
    else { a = pos.getX(i); b = pos.getY(i); }
    uv[i * 2] = (a + offset[0]) / tile; uv[i * 2 + 1] = (b + offset[1]) / tile;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

export function box(w, h, d, tile = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (tile) worldUV(g, tile);
  return g;
}

/** merge BufferGeometries that all carry position/normal/uv (+ optional index) into one (single draw call) */
export function mergeGeometries(list) {
  let vCount = 0, iCount = 0;
  for (const g of list) { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < n; i++) idx[io++] = vo + i;
    vo += n;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}

export function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = false, receive = false, name } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = cast; m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
/** InstancedMesh from [{x,y,z,sx,sy,sz,ry}] */
export function instanced(geo, mat, items, { cast = false, receive = false } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    _p.set(it.x || 0, it.y || 0, it.z || 0); _e.set(it.rx || 0, it.ry || 0, it.rz || 0); _q.setFromEuler(_e);
    _s.set(it.sx == null ? 1 : it.sx, it.sy == null ? 1 : it.sy, it.sz == null ? 1 : it.sz);
    _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
  });
  im.instanceMatrix.needsUpdate = true; im.castShadow = cast; im.receiveShadow = receive; im.frustumCulled = false;
  return im;
}

/** dispose geometries / materials / textures under a root */
export function disposeTree(root) {
  const seen = new Set();
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      if (seen.has(m)) continue; seen.add(m);
      for (const k of Object.keys(m)) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
      m.dispose();
    }
  });
}
