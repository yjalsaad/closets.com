/* Neo Kitchen Designer - binary STL writer. Same triangulation as the OBJ (meshExport.js), but Z-up
 * (the CAD / slicer convention): X along the main run, Y towards the room (depth), Z up; millimetres.
 * Layout: 80-byte header, uint32 triangle count, then 50 bytes per triangle
 * (normal 3 x float32, 3 vertices x 3 x float32, uint16 attribute = 0) -> byte length = 84 + 50 x triangles. */
import { buildMesh, triangulate } from './meshExport';
import { appName } from './productInfo';
import { outOf, UNIT_INFO } from './outputSettings';

/** [NEO-OUTPUT-UX34] `output` = { unit, precision }: vertices in mm / cm / inch, curves at the chosen segment count; omitted = mm, standard (the legacy bytes) */
export function buildSTL(scene, { title = 'Kitchen', product, props = false, output } = {}) {
  const mesh = buildMesh(scene, { zUp: true, props, output });
  const O = outOf(output); const k = output ? 1 / UNIT_INFO[O.unit].factor : 1;
  const sc = k === 1 ? (v) => v : (v) => [v[0] * k, v[1] * k, v[2] * k];
  const tris = [];
  mesh.objects.forEach((o) => triangulate(o.faces).forEach(([a, b, c]) => tris.push([sc(o.verts[a]), sc(o.verts[b]), sc(o.verts[c])])));
  const buf = new ArrayBuffer(84 + 50 * tris.length);
  const dv = new DataView(buf);
  const head = `${appName(product)} binary STL - ${String(title).replace(/[^\x20-\x7e]/g, '?')} - ${UNIT_INFO[O.unit].en}, Z up`.slice(0, 79);
  for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i));
  dv.setUint32(80, tris.length, true);
  let off = 84;
  tris.forEach(([p, q, r]) => {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    [[nx, ny, nz], p, q, r].forEach((v) => { for (let k = 0; k < 3; k++) { dv.setFloat32(off, v[k], true); off += 4; } });
    dv.setUint16(off, 0, true); off += 2;
  });
  return { bytes: new Uint8Array(buf), triangles: tris.length, stats: mesh.stats };
}
