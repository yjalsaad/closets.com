/* Geometry builders for furniture: bevelled boxes with grain-aware UVs (highlights catch the 2 mm edge), fluted (reeded) panels as real
 * geometry, lathe props, tube handles, vertex-colour merging (one draw call for many clean props). three core only. */
import * as THREE from 'three';
import { mergeGeometries } from './geom';

const AX = ['x', 'y', 'z'];

/**
 * Planar UVs from the dominant face axis, with the timber GRAIN running along U (the generated timber textures have their grain along U).
 * grain: which model axis the grain follows ('x' | 'y' | 'z'). tile: metres per texture repeat. off: [u, v] offset in metres (varies panels).
 */
export function projectUV(g, { grain = 'x', tile = 0.8, off = [0, 0] } = {}) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = new Float32Array(pos.count * 2), gi = AX.indexOf(grain);
  const p = [0, 0, 0], n = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i); n[0] = Math.abs(nor.getX(i)); n[1] = Math.abs(nor.getY(i)); n[2] = Math.abs(nor.getZ(i));
    const d = n[0] >= n[1] && n[0] >= n[2] ? 0 : n[1] >= n[2] ? 1 : 2, t = [0, 1, 2].filter((k) => k !== d);
    let a, b;
    if (t.includes(gi)) { a = p[gi]; b = p[t.find((k) => k !== gi)]; } else { a = p[t[0]]; b = p[t[1]]; }
    uv[i * 2] = (a + off[0]) / tile; uv[i * 2 + 1] = (b + off[1]) / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** a box w x h x d (centred) with a 1-segment chamfer of `b` metres on every edge. Triangles ~44. */
export function bevelBox(w, h, d, { b = 0.002, grain = 'x', tile = 0.8, off } = {}) {
  b = Math.min(b, w / 2.2, h / 2.2, d / 2.2);
  const s = new THREE.Shape(); const hw = w / 2 - b, hh = h / 2 - b;
  s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  g.computeVertexNormals();
  return projectUV(g, { grain, tile, off });
}

/** rounded-rectangle Shape (for worktop cut-outs and soft-corner pieces) */
export function roundRect(w, h, r, cx = 0, cy = 0) {
  r = Math.min(r, w / 2, h / 2); const x = cx - w / 2, y = cy - h / 2, s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** a slab (shape in the XY plane, extruded along +Z by `depth`, centred) with a small bevel; used for the worktop with the sink hole */
export function slabFromShape(shape, depth, { b = 0.002, tile = 1.6, grain = 'x', off } = {}) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-4, depth - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -(depth - 2 * b) / 2); g.computeVertexNormals();
  return projectUV(g, { grain, tile, off });
}

/**
 * Reeded / fluted panel: `w` wide, `h` tall, the reeds run along Y. A core slab (thickness t - relief) plus a swept reed profile on +Z.
 * Returns ONE merged geometry (single draw call). `grain` of the UVs is vertical so timber grain follows the flutes.
 */
export function flutedPanel(w, h, t, { pitch = 0.04, relief = 0.011, K = 7, tile = 0.8, off = [0, 0], b = 0.002 } = {}) {
  const n = Math.max(1, Math.round(w / pitch)), pw = w / n, core = Math.max(0.004, t - relief);
  const base = bevelBox(w, h, core, { b, grain: 'y', tile, off }); base.translate(0, 0, -t / 2 + core / 2);
  const cols = n * K + 1, pos = new Float32Array(cols * 2 * 3), uv = new Float32Array(cols * 2 * 2), idx = [];
  for (let c = 0; c < cols; c++) {
    const i = Math.min(n - 1, Math.floor(c / K)), k = c - i * K, u = (k / K) * 2 - 1;
    const z = -t / 2 + core + relief * Math.pow(Math.max(0, 1 - u * u), 0.5) * 0.98;
    const x = -w / 2 + i * pw + (k / K) * pw;
    for (let r = 0; r < 2; r++) {
      const y = r ? h / 2 - b : -h / 2 + b, o = (c * 2 + r) * 3;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      const uo = (c * 2 + r) * 2; uv[uo] = (y + off[0]) / tile; uv[uo + 1] = (x + off[1]) / tile;
    }
    if (c < cols - 1) { const a = c * 2, bq = c * 2 + 1, cc = (c + 1) * 2, d = (c + 1) * 2 + 1; idx.push(a, cc, bq, bq, cc, d); }
  }
  const strip = new THREE.BufferGeometry(); strip.setAttribute('position', new THREE.BufferAttribute(pos, 3)); strip.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); strip.setIndex(idx); strip.computeVertexNormals();
  const merged = mergeGeometries([base, strip]);
  // baked ambient occlusion: the groove between two reeds is darker than the ridge (vertex colour; use with a vertexColors material)
  const n1 = base.attributes.position.count, col = new Float32Array(merged.attributes.position.count * 3).fill(1);
  for (let c = 0; c < cols; c++) { const k = (c - Math.min(n - 1, Math.floor(c / K)) * K) / K, ao = 0.42 + 0.58 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, k))), 0.6); for (let r = 0; r < 2; r++) { const o = (n1 + c * 2 + r) * 3; col[o] = col[o + 1] = col[o + 2] = ao; } }
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return merged;
}

/** thin tube along a CatmullRom path (tap neck, rails) */
export function tube(points, r, { seg = 24, radial = 8 } = {}) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(c, seg, r, radial, false); return g;
}

/** apply position / rotation / uniform or per-axis scale to a geometry and return it (so it can be merged) */
export function placed(g, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s));
  g.applyMatrix4(m); return g;
}

/** flat, non-indexed, with normal + uv guaranteed (what mergeGeometries wants) */
export function prep(g) {
  let o = g.index ? g.toNonIndexed() : g;
  if (!o.attributes.normal) o.computeVertexNormals();
  if (!o.attributes.uv) o.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(o.attributes.position.count * 2), 2));
  return o;
}

/**
 * Merge many geometries that each carry their own colour into ONE geometry with vertex colours (one draw call). Use with a material that has
 * vertexColors: true. Colours are sRGB hex numbers; they are converted to linear like three does for Color.
 */
export function mergeColored(items) {
  const out = []; const tmp = new THREE.Color();
  for (const { geo, color } of items) {
    const g = prep(geo.clone()); tmp.setHex(color); const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); out.push(g);
  }
  const m = mergeGeometries(out);
  let vc = 0; for (const g of out) vc += g.attributes.position.count;
  const col = new Float32Array(vc * 3); let o = 0; for (const g of out) { col.set(g.attributes.color.array, o); o += g.attributes.color.array.length; }
  m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return m;
}

/**
 * A baked ambient-occlusion decal quad: centre c, in-plane axes uDir / vDir (unit vectors), size w x h, darkest along `dark` ('-v' | '+v' | '-u' | '+u'),
 * strength 0..1 (vertex alpha). Use with the decal material (transparent black, alpha gradient map, vertexColors) and merge them per product.
 */
export function aoQuad(c, uDir, vDir, w, h, dark = '-v', strength = 0.5) {
  const U = new THREE.Vector3(...uDir).normalize(), V = new THREE.Vector3(...vDir).normalize(), C = new THREE.Vector3(...c);
  const corner = (su, sv) => C.clone().addScaledVector(U, su * w / 2).addScaledVector(V, sv * h / 2);
  const pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], idx = [0, 1, 2, 0, 2, 3];
  const grad = { '-v': (su, sv) => (sv + 1) / 2, '+v': (su, sv) => (1 - sv) / 2, '-u': (su) => (su + 1) / 2, '+u': (su) => (1 - su) / 2 }[dark];
  const sg = [[-1, -1], [1, -1], [1, 1], [-1, 1]], pos = new Float32Array(18), uv = new Float32Array(12), col = new Float32Array(24);
  idx.forEach((k, i) => { pos.set([pts[k].x, pts[k].y, pts[k].z], i * 3); uv.set([0.5, grad(sg[k][0], sg[k][1])], i * 2); col.set([0, 0, 0, strength], i * 4); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(18).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}
/** merge ao decals (position / uv / 4-component colour) into one geometry = one draw call */
export function mergeAo(list) {
  const n = list.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 4), nor = new Float32Array(n * 3);
  let o = 0; for (const g of list) { pos.set(g.attributes.position.array, o * 3); uv.set(g.attributes.uv.array, o * 2); col.set(g.attributes.color.array, o * 4); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setAttribute('color', new THREE.BufferAttribute(col, 4)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return m;
}
