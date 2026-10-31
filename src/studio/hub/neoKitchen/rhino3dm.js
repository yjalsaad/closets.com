/* =============================================================================
 * Neo Kitchen Designer - Rhino 3DM writer (openNURBS archive version 5, "50", 8-byte chunk lengths).
 * A small, dependency-free writer written from the public openNURBS source (MIT licence, github.com/mcneel/opennurbs:
 * opennurbs_archive.cpp chunk framing, opennurbs_mesh.cpp ON_Mesh::Write v3.5, opennurbs_3dm_attributes.cpp,
 * opennurbs_layer.cpp). It writes ONLY what the kitchen needs:
 *   - properties table (openNURBS version + revision history), settings table (model unit = millimetres + tolerances)
 *   - one layer per material class (name + colour), every panel is one MESH object on its layer, named after the part
 *   - everything else is an empty table, in the order openNURBS writes them.
 * Geometry: the same mesh as OBJ / STL (meshExport.js), Z-up (Rhino convention), millimetres, single-precision
 * vertices with flat per-face normals (24 vertices per box so box edges stay crisp when Rhino shades them).
 *
 * VERIFICATION (see the PR): the files are read back with the openNURBS toolkit (python `rhino3dm` 8.x) - object, layer
 * and vertex counts and bounding box are checked; chunk CRCs are verified in the unit tests. They have NOT been opened
 * in the Rhino application itself.
 * ===========================================================================*/
import { crc32 } from './crc32';
import { buildMesh, meshStats } from './meshExport';
import { appName } from './productInfo';
import { outOf, UNIT_INFO } from './outputSettings';

const TC = {
  COMMENT: 0x00000001, END_OF_FILE: 0x00007fff,
  PROPERTIES: 0x10000014, SETTINGS: 0x10000015, BITMAP: 0x10000016, USER: 0x10000017, GROUP: 0x10000018, FONT: 0x10000019, DIMSTYLE: 0x10000020, INSTANCE: 0x10000021, HATCH: 0x10000022,
  LINETYPE: 0x10000023, TEXMAP: 0x10000025, HISTORY: 0x10000026, MATERIAL: 0x10000010, LAYER: 0x10000011, LIGHT: 0x10000012, OBJECT: 0x10000013,
  OPENNURBS_VERSION: 0xa0000026, REVISION: 0x20008021, UNITS: 0x20008031, CURRENT_LAYER: 0xa0000038,
  LAYER_RECORD: 0x20008050, OBJECT_RECORD: 0x20008070, OBJECT_TYPE: 0x82000071, OBJECT_ATTRS: 0x02008072, OBJECT_END: 0x8200007f,
  CLASS: 0x00027ffa, CLASS_UUID: 0x0002fffb, CLASS_DATA: 0x0002fffc, CLASS_END: 0x80027fff, END_OF_TABLE: 0xffffffff,
};
const OBJ_MESH = 32; // ON::mesh_object
export const ON_VERSION = 202609088; // the openNURBS release whose chunk layouts are written (numbers in the file header of every 3dm it writes)
const UUID_MESH = [0xe4, 0xd4, 0xd7, 0x4e, 0x47, 0xe9, 0xd3, 0x11, 0xbf, 0xe5, 0x00, 0x10, 0x83, 0x01, 0x22, 0xf0]; // 4ED7D4E4-E947-11d3-BFE5-0010830122F0
const UUID_LAYER = [0x13, 0x98, 0x80, 0x95, 0x85, 0xe9, 0xd3, 0x11, 0xbf, 0xe5, 0x00, 0x10, 0x83, 0x01, 0x22, 0xf0]; // 95809813-E985-11d3-BFE5-0010830122F0
const hex = (s) => Uint8Array.from(s.match(/../g).map((h) => parseInt(h, 16)));
/* constant sub-records captured from an openNURBS-written file (all-default values): rendering attributes of a layer, mapping tag of a mesh */
const LAYER_NESTED = hex('008000401000000000000000010000000000000000000000008a70e0');
const MESH_TTAG = hex('00800040a40000000000000001000000010000000000000000000000000000000000000000000000000000000000f03f0000000000000000000000000000000000000000000000000000000000000000000000000000f03f0000000000000000000000000000000000000000000000000000000000000000000000000000f03f0000000000000000000000000000000000000000000000000000000000000000000000000000f03f00000000693c98a3');
const UNSET = hex('d21d339ebdf8e5ff'); // ON_UNSET_VALUE as a little-endian double

/** chunk-aware byte writer: a chunk's CRC covers only the bytes written directly into it (not nested chunks), like ON_BinaryArchive */
class Arc {
  constructor() { this.st = [{ parts: [], direct: [], tc: 0 }]; }
  top() { return this.st[this.st.length - 1]; }
  raw(u8) { this.top().parts.push(u8); this.top().direct.push(u8); }
  nested(u8) { this.top().parts.push(u8); } // an already framed child chunk
  u8(v) { this.raw(Uint8Array.of(v & 255)); }
  i32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, v, true); this.raw(b); }
  u32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); this.raw(b); }
  i16(v) { const b = new Uint8Array(2); new DataView(b.buffer).setInt16(0, v, true); this.raw(b); }
  f64(v) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v, true); this.raw(b); }
  f32s(a) { const b = new Uint8Array(4 * a.length); const dv = new DataView(b.buffer); a.forEach((v, i) => dv.setFloat32(4 * i, v, true)); this.raw(b); }
  str(s) { // int length (UTF-16 units + terminating zero; 0 for empty) then the units
    if (!s) { this.i32(0); return; }
    const n = s.length; const b = new Uint8Array(2 * (n + 1)); const dv = new DataView(b.buffer);
    for (let i = 0; i < n; i++) dv.setUint16(2 * i, s.charCodeAt(i), true);
    this.i32(n + 1); this.raw(b);
  }
  begin(tc) { this.st.push({ parts: [], direct: [], tc }); }
  end() {
    const f = this.st.pop();
    const crc = (f.tc & 0x8000) ? crc32(cat(f.direct)) : null;
    const dlen = f.parts.reduce((s, p) => s + p.length, 0) + (crc !== null ? 4 : 0);
    const h = new Uint8Array(12); const dv = new DataView(h.buffer);
    dv.setUint32(0, f.tc >>> 0, true); dv.setBigInt64(4, BigInt(dlen), true);
    const out = [h, ...f.parts];
    if (crc !== null) { const c = new Uint8Array(4); new DataView(c.buffer).setUint32(0, crc, true); out.push(c); }
    this.nestedOrRoot(cat(out));
  }
  nestedOrRoot(u8) { this.top().parts.push(u8); }
  short(tc, value) { const h = new Uint8Array(12); const dv = new DataView(h.buffer); dv.setUint32(0, tc >>> 0, true); dv.setBigInt64(4, BigInt(value), true); this.top().parts.push(h); }
  bytes() { return cat(this.top().parts); }
  get length() { return this.top().parts.reduce((s, p) => s + p.length, 0); }
}
function cat(list) { const n = list.reduce((s, p) => s + p.length, 0); const out = new Uint8Array(n); let o = 0; list.forEach((p) => { out.set(p, o); o += p.length; }); return out; }

function makeUuid(rand) {
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(rand() * 256);
  b[7] = (b[7] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; // version 4 / variant 1, in the little-endian field layout
  return b;
}
function cbuf(a, f32) { // WriteCompressedBuffer with method 0 (stored): size, crc32 of the raw data, method, data
  const raw = new Uint8Array(4 * f32.length); const dv = new DataView(raw.buffer);
  f32.forEach((v, i) => dv.setFloat32(4 * i, v, true));
  a.u32(raw.length); a.u32(crc32(raw)); a.u8(0); a.raw(raw);
}

/** flat-shaded arrays for one panel: each polygon gets its own vertices + its face normal; n-gons are fan-split */
export function flatMesh(o) {
  const V = []; const N = []; const F = [];
  o.faces.forEach((face) => {
    const polys = [];
    if (face.length <= 4) polys.push(face); else for (let i = 1; i < face.length - 1; i++) polys.push([face[0], face[i], face[i + 1]]);
    // Newell normal of the (planar) face
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < face.length; i++) { const p = o.verts[face[i]]; const q = o.verts[face[(i + 1) % face.length]]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); }
    const l = Math.hypot(nx, ny, nz) || 1; const n = [nx / l, ny / l, nz / l];
    polys.forEach((poly) => {
      const base = V.length / 3;
      poly.forEach((i) => { V.push(o.verts[i][0], o.verts[i][1], o.verts[i][2]); N.push(n[0], n[1], n[2]); });
      F.push(poly.length === 4 ? [base, base + 1, base + 2, base + 3] : [base, base + 1, base + 2, base + 2]);
    });
  });
  return { V: Float32Array.from(V), N: Float32Array.from(N), F, vcount: V.length / 3 };
}

function writeMeshData(a, m) {
  a.u8(0x35); // chunk version 3.5
  a.i32(m.vcount); a.i32(m.F.length);
  for (let i = 0; i < 8; i++) a.raw(UNSET);          // packed texture domains + surface domains (unset)
  a.f64(0); a.f64(0);                                   // surface scale
  a.f32s([1, 1, 1, -1, -1, -1]); a.f32s([1, 1, 1, -1, -1, -1]); a.f32s([1, 1, -1, -1]); // vertex / normal / texture boxes: "not computed"
  a.i32(-1);                                            // closed: unknown
  a.u8(0); a.u8(0); a.u8(0); a.u8(0); a.u8(0);          // no mesh parameters, no curvature stats
  const isz = m.vcount < 256 ? 1 : m.vcount < 65536 ? 2 : 4;
  a.i32(isz);
  m.F.forEach((f) => f.forEach((i) => { if (isz === 1) a.u8(i); else if (isz === 2) { a.u8(i & 255); a.u8(i >> 8); } else a.i32(i); }));
  cbuf(a, m.V); cbuf(a, m.N); a.u32(0); a.u32(0); a.u32(0); // vertices, normals; no texture coords / curvatures / colours
  a.i32(0); a.raw(new Uint8Array(16)); a.u32(0);        // packed_tex_rotate, mapping id (nil), no surface parameters
  a.nested(MESH_TTAG);                                  // texture mapping tag (default)
  a.u8(0); a.u8(0); a.u8(0);                            // manifold / oriented / solid: unknown
}

function writeTable(a, tc, fill) { a.begin(tc); if (fill) fill(); a.short(TC.END_OF_TABLE, 0); a.end(); }

/** the layers = material classes that are used; returns {bytes, stats, layers} */
/** [NEO-OUTPUT-UX34] `output` = { unit, precision }: the model unit system of the file is mm (2) / cm (3) / inch (8) and the vertices are scaled to it; omitted = mm, standard (the legacy bytes) */
export function build3DM(scene, { title = 'Kitchen', rand = Math.random, now = new Date(), product, props = false, output } = {}) {
  const mesh = buildMesh(scene, { zUp: true, props, output });
  const O = outOf(output); const UI = UNIT_INFO[O.unit]; const k = output ? 1 / UI.factor : 1;
  const scaled = (o) => (k === 1 ? o : { ...o, verts: o.verts.map((v) => [v[0] * k, v[1] * k, v[2] * k]) });
  const app = appName(product); // the program named in the file
  const a = new Arc();
  // 32-byte header: "3D Geometry File Format " + version "      50"
  a.raw(new TextEncoder().encode('3D Geometry File Format       50'));
  // start section comment
  a.begin(TC.COMMENT);
  a.raw(new TextEncoder().encode(`${app} - ${String(title).replace(/[^\x20-\x7e]/g, '?')} - ${UI.name[0]}, Z up. Runtime: JavaScript 3DM I/O processor: ${app} (openNURBS archive v5 layout)\n`));
  a.u8(26); a.u8(0);
  a.end();
  // properties
  writeTable(a, TC.PROPERTIES, () => {
    a.short(TC.OPENNURBS_VERSION, ON_VERSION);
    a.begin(TC.REVISION);
    a.u8(0x10); a.str(app);
    const t = () => { [now.getUTCSeconds(), now.getUTCMinutes(), now.getUTCHours(), now.getUTCDate(), now.getUTCMonth(), now.getUTCFullYear() - 1900, now.getUTCDay(), Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(), 0, 1)) / 864e5)].forEach((v) => a.i32(v)); };
    t(); a.str(app); t(); a.i32(1);
    a.end();
  });
  // settings: units + tolerances (model unit = millimetres) and the current layer
  writeTable(a, TC.SETTINGS, () => {
    a.begin(TC.UNITS);
    a.i32(102); a.i32(UI.on3dm); a.f64(0.001 / UI.factor); a.f64(0.017453292519943295); a.f64(0.01); a.i32(0); a.i32(3); a.f64(UI.factor / 1000); a.str('');
    a.end();
    a.short(TC.CURRENT_LAYER, 0);
  });
  [TC.BITMAP, TC.TEXMAP, TC.MATERIAL, TC.LINETYPE].forEach((tc) => writeTable(a, tc));
  // layers: one per material class used
  const classes = [...new Set(mesh.objects.map((o) => o.mat))];
  const layerIndex = new Map(classes.map((k, i) => [k, i]));
  writeTable(a, TC.LAYER, () => {
    classes.forEach((k, i) => {
      const m = mesh.materials[k];
      a.begin(TC.LAYER_RECORD);
      a.begin(TC.CLASS);
      a.begin(TC.CLASS_UUID); a.raw(Uint8Array.from(UUID_LAYER)); a.end();
      a.begin(TC.CLASS_DATA);
      a.u8(0x1f); a.i32(0); a.i32(i); a.i32(-1); a.i32(-1); a.i32(0);
      a.u8(Math.round(m.kd[0] * 255)); a.u8(Math.round(m.kd[1] * 255)); a.u8(Math.round(m.kd[2] * 255)); a.u8(0);
      a.i16(0); a.i16(0); a.f64(0); a.f64(1);
      a.str(m.name); a.u8(1); a.i32(-1); a.u32(0xffffffff); a.f64(0); a.u8(0);
      a.raw(makeUuid(rand)); a.raw(new Uint8Array(16)); a.u8(1);
      a.nested(LAYER_NESTED);
      a.raw(new Uint8Array(17));
      a.end(); // data
      a.short(TC.CLASS_END, 0);
      a.end(); // class
      a.end(); // record
    });
  });
  [TC.GROUP, TC.FONT, TC.DIMSTYLE, TC.LIGHT, TC.HATCH, TC.INSTANCE].forEach((tc) => writeTable(a, tc));
  // objects
  writeTable(a, TC.OBJECT, () => {
    mesh.objects.forEach((o) => {
      const fm = flatMesh(scaled(o));
      a.begin(TC.OBJECT_RECORD);
      a.short(TC.OBJECT_TYPE, OBJ_MESH);
      a.begin(TC.CLASS);
      a.begin(TC.CLASS_UUID); a.raw(Uint8Array.from(UUID_MESH)); a.end();
      a.begin(TC.CLASS_DATA); writeMeshData(a, fm); a.end();
      a.short(TC.CLASS_END, 0);
      a.end();
      a.begin(TC.OBJECT_ATTRS);
      a.u8(0x2d); a.raw(makeUuid(rand)); a.i32(layerIndex.get(o.mat));
      a.u8(1); a.str(o.name);
      a.u8(0);
      a.end();
      a.short(TC.OBJECT_END, 0);
      a.end();
    });
  });
  writeTable(a, TC.HISTORY); // (no user table: an empty one is invalid - ON_BinaryArchive::BeginRead3dmUserTable wants a plug-in id in each)
  // end mark: total file length (including this chunk)
  const total = a.length + 12 + 8;
  a.begin(TC.END_OF_FILE); a.raw(new Uint8Array(8)); a.end();
  const bytes = a.bytes();
  new DataView(bytes.buffer, bytes.byteLength - 8, 8).setBigUint64(0, BigInt(total), true);
  return { bytes, stats: meshStats(mesh.objects), layers: classes.map((k) => mesh.materials[k].name), mesh };
}
