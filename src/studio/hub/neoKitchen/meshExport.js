/* =============================================================================
 * Neo Kitchen Designer - 3D mesh for the OBJ / STL / 3DM exporters.
 * ONE triangulation for all three formats: every manufactured panel of the live scene
 * (scene.parts + worktops + splash + plinth + niche appliances) becomes a closed, outward-facing
 * solid. Hidden units are not in the scene at all (geometry.js skips them). Doors and drawers are
 * exported CLOSED (the open/explode state of the 3D view is never read). Hardware (hinges, handles,
 * pins, feet) is not modelled - it is in the Hardware list, not in the 3D file.
 *
 * AXES (the same frame the 3D view uses, before its centring offset):
 *   +X = along the main run, left -> right as seen from the front (0 = left end of the main run)
 *   +Y = up (0 = floor)
 *   +Z = from the back wall towards the room (front of the doors)       -> right-handed, Y-up
 * The left / right legs of an L or U kitchen are placed exactly as the 3D view places them.
 * UNITS: millimetres here. (OBJ / STL carry no unit field; the exporters say so in their header.) [NEO-OUTPUT-UX34] The Output setting converts to cm / inch
 * in the WRITERS (objExport / stlExport / rhino3dm), never here, so volumes, bounds and tests stay in mm; its Precision scales the segment count of every
 * curved primitive below (x0.5 draft, x1 standard = the counts quoted here, x2.5 ultra).
 * Optional `zUp` rotates the result to Z-up (Rhino / CAD convention): (x, y, z) -> (x, -z, y).
 * Box faces are quads in the mesh; STL splits each into 2 triangles. A cylinder (carousel shelf)
 * is a 40-sided prism.
 * ===========================================================================*/

import { CAT_MATS, isCatMat } from './propMats';
import { curveSegs } from './outputSettings';
const CAT_MESH = Object.fromEntries(Object.entries(CAT_MATS).map(([k, c]) => [`cat_${k}`, { name: c.name, kd: c.kd, d: 1 }]));

/** vertices of an outward-facing box, local order: 0..3 = back (z0) ring, 4..7 = front (z1) ring */
const BOX_FACES = [[4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6], [0, 4, 7, 3], [3, 7, 6, 2], [0, 1, 5, 4]]; // +z, -z, +x, -x, +y, -y

const CYL_SEG = 40;

/** run frame -> world (mirrors Kitchen3D: right leg at x = main length rotated -90deg, left leg at z = its length rotated +90deg) */
function frameXform(scene, run) {
  const Wm = scene.runs[0].L;
  if (run.key === 'right') return (u, y, d) => [Wm - d, y, u];
  if (run.key === 'left') return (u, y, d) => [d, y, run.L - u];
  if (run.frame && run.key !== 'main') { // UX29 run 2 / peninsula / island: the same rotation + placement Kitchen3D gives the run frame
    const { x, z, rot } = run.frame; const c = Math.cos(rot), s = Math.sin(rot);
    return (u, y, d) => [x + u * c + d * s, y, z - u * s + d * c];
  }
  return (u, y, d) => [u, y, d];
}

/** a box (u0..u1, y0..y1, d0..d1) as a mesh; rotY (radians, about the box centre, three.js sense) for diagonal doors */
function boxMesh(b, xf, rotY = 0) {
  const cu = (b.u0 + b.u1) / 2, cd = (b.d0 + b.d1) / 2;
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const corner = (u, y, d) => {
    let du = u - cu, dd = d - cd;
    if (rotY) { const nu = du * c + dd * s; const nd = -du * s + dd * c; du = nu; dd = nd; }
    return xf(cu + du, y, cd + dd);
  };
  const verts = [
    corner(b.u0, b.y0, b.d0), corner(b.u1, b.y0, b.d0), corner(b.u1, b.y1, b.d0), corner(b.u0, b.y1, b.d0),
    corner(b.u0, b.y0, b.d1), corner(b.u1, b.y0, b.d1), corner(b.u1, b.y1, b.d1), corner(b.u0, b.y1, b.d1),
  ];
  return { verts, faces: BOX_FACES.map((f) => f.slice()) };
}

/** a box whose BOTTOM face depth is scaled by b.tb about the centre (a flared skirt): same 8-vertex layout and faces as boxMesh */
function boxMeshTaper(b, xf) {
  const dc = (b.d0 + b.d1) / 2; const hb = ((b.d1 - b.d0) / 2) * b.tb; const e0 = dc - hb; const e1 = dc + hb;
  const verts = [xf(b.u0, b.y0, e0), xf(b.u1, b.y0, e0), xf(b.u1, b.y1, b.d0), xf(b.u0, b.y1, b.d0), xf(b.u0, b.y0, e1), xf(b.u1, b.y0, e1), xf(b.u1, b.y1, b.d1), xf(b.u0, b.y1, b.d1)];
  return { verts, faces: BOX_FACES.map((f) => f.slice()) };
}

/** a horizontal prism along u (a hanging rail): `seg` sides, diameter = box height */
function prismU(b, xf, seg = 14) {
  const cy = (b.y0 + b.y1) / 2, cd = (b.d0 + b.d1) / 2, r = (b.y1 - b.y0) / 2;
  const verts = [];
  [b.u0, b.u1].forEach((u) => { for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; verts.push(xf(u, cy + r * Math.sin(a), cd + r * Math.cos(a))); } });
  const faces = [];
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; faces.push([i, seg + i, seg + j, j]); }
  faces.push(Array.from({ length: seg }, (_, i) => seg + i));
  faces.push(Array.from({ length: seg }, (_, i) => seg - 1 - i));
  return { verts, faces };
}

/** a round bar lying along u (width) or d (depth): `seg` sides, diameter = the smaller cross-section side [NEO-CUSTOM-UX28 round rails / slats] */
function prismAxis(b, xf, axis, seg = 24) {
  const cu = (b.u0 + b.u1) / 2, cd = (b.d0 + b.d1) / 2, cy = (b.y0 + b.y1) / 2;
  const r = (axis === 'u' ? Math.min(b.y1 - b.y0, b.d1 - b.d0) : Math.min(b.y1 - b.y0, b.u1 - b.u0)) / 2;
  const verts = [];
  const ends = axis === 'u' ? [b.u0, b.u1] : [b.d0, b.d1];
  ends.forEach((e) => { for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; verts.push(axis === 'u' ? xf(e, cy + r * Math.sin(a), cd + r * Math.cos(a)) : xf(cu + r * Math.cos(a), cy + r * Math.sin(a), e)); } });
  const faces = [];
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; faces.push(axis === 'u' ? [i, seg + i, seg + j, j] : [i, j, seg + j, seg + i]); }
  faces.push(Array.from({ length: seg }, (_, i) => seg + i));
  faces.push(Array.from({ length: seg }, (_, i) => seg - 1 - i));
  return { verts, faces };
}

/** a vertical cylinder (carousel shelf): axis along y, diameter = box width */
function cylMesh(b, xf, seg = CYL_SEG) {
  const cu = (b.u0 + b.u1) / 2, cd = (b.d0 + b.d1) / 2, r = (b.u1 - b.u0) / 2;
  const verts = [];
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; verts.push(xf(cu + r * Math.cos(a), b.y0, cd - r * Math.sin(a))); }
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; verts.push(xf(cu + r * Math.cos(a), b.y1, cd - r * Math.sin(a))); }
  const faces = [];
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; faces.push([i, j, seg + j, seg + i]); } // side quads (outward)
  faces.push(Array.from({ length: seg }, (_, i) => seg + i));            // top cap (n-gon)
  faces.push(Array.from({ length: seg }, (_, i) => seg - 1 - i));        // bottom cap (n-gon)
  return { verts, faces };
}

/** material classes -> {name, rgb 0..1, alpha}. Colours are DATA for the viewers (not UI): decimal RGB, no hex. */
export const MESH_MATS = {
  carcass: { name: 'Carcass', kd: [0.82, 0.78, 0.7], d: 1 },
  back: { name: 'Back', kd: [0.86, 0.83, 0.77], d: 1 },
  shelf: { name: 'Shelf', kd: [0.84, 0.8, 0.72], d: 1 },
  drawer: { name: 'DrawerBox', kd: [0.81, 0.79, 0.74], d: 1 },
  plinth: { name: 'Plinth', kd: [0.13, 0.13, 0.14], d: 1 },
  glass: { name: 'Glass', kd: [0.56, 0.7, 0.75], d: 0.35 },
  /* NEO-CLOSETS-UX24 (wardrobe): smoked glass, black door frames and the optional props (hung / folded clothes, rails, hangers) */
  smoked: { name: 'SmokedGlass', kd: [0.1, 0.11, 0.13], d: 0.6 },
  frame: { name: 'DoorFrame', kd: [0.05, 0.055, 0.06], d: 1 },
  rail: { name: 'RailMetal', kd: [0.62, 0.64, 0.66], d: 1 },
  hanger: { name: 'Hanger', kd: [0.72, 0.58, 0.41], d: 1 },
  cloth0: { name: 'Cloth1', kd: [0.73, 0.77, 0.84], d: 1 }, cloth1: { name: 'Cloth2', kd: [0.85, 0.78, 0.69], d: 1 }, cloth2: { name: 'Cloth3', kd: [0.66, 0.75, 0.66], d: 1 },
  cloth3: { name: 'Cloth4', kd: [0.8, 0.71, 0.75], d: 1 }, cloth4: { name: 'Cloth5', kd: [0.55, 0.58, 0.64], d: 1 },
  cloth5: { name: 'Cloth6', kd: [0.9, 0.88, 0.83], d: 1 }, cloth6: { name: 'Cloth7', kd: [0.28, 0.29, 0.35], d: 1 }, cloth7: { name: 'Cloth8', kd: [0.69, 0.44, 0.37], d: 1 },
  appliance: { name: 'Appliance', kd: [0.17, 0.17, 0.18], d: 1 },
  counter: { name: 'Countertop', kd: [0.88, 0.88, 0.88], d: 1 },
};
/** finish / worktop colours: the same swatches the 3D view's CSS vars carry, as decimal RGB data */
const FINISH_KD = { oak: [0.76, 0.6, 0.4], walnut: [0.36, 0.24, 0.16], white: [0.95, 0.95, 0.93], charcoal: [0.25, 0.26, 0.28] };
const COUNTER_KD = { marble: [0.9, 0.9, 0.88], quartz: [0.94, 0.94, 0.94], granite: [0.12, 0.12, 0.13], laminate: [0.78, 0.76, 0.72], oakslab: [0.72, 0.56, 0.36] };

const safe = (s) => String(s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/**
 * buildMesh(scene) -> { objects: [{ name, group, mat, kind, verts, faces }], materials: { key: {name, kd, d} }, stats }
 * Every vertex is [x, y, z] in mm, Y-up (see the header). `zUp` swaps to Z-up.
 */
export function buildMesh(scene, { zUp = false, props = false, output } = {}) {
  const model = scene.model;
  const seg = (n) => curveSegs(n, output); // [NEO-OUTPUT-UX34] standard keeps today's 14 / 24 / 40
  const fin = FINISH_KD[model.finish] || FINISH_KD.white;
  const materials = {
    ...MESH_MATS,
    door: { name: 'DoorFinish', kd: fin, d: 1 },
    drawerFront: { name: 'DrawerFrontFinish', kd: fin, d: 1 },
    counter: { name: 'Countertop', kd: COUNTER_KD[model.counter] || MESH_MATS.counter.kd, d: 1 },
    ...CAT_MESH, // NEO-CATEGORIES-UX26 prop materials (only the ones a file uses are written)
  };
  const objects = [];
  const used = new Map();
  const uniq = (base) => { const n = (used.get(base) || 0) + 1; used.set(base, n); return n === 1 ? base : `${base}_${n}`; };
  const post = zUp ? (v) => [v[0], -v[2], v[1]] : null;
  const push = (name, group, mat, kind, m) => {
    const verts = post ? m.verts.map(post) : m.verts;
    let faces = m.faces;
    if (post) faces = faces.map((f) => f.slice()); // the (x,y,z)->(x,-z,y) map is a proper rotation: winding is kept
    objects.push({ name: uniq(safe(name) || 'part'), group: safe(group) || 'Kitchen', mat, kind, verts, faces });
  };
  const runBy = new Map(scene.runs.map((r) => [r.key, r]));
  const matOf = (p) => {
    switch (p.kind) {
      case 'back': return 'back';
      case 'plinth': return 'plinth';
      case 'counter': return 'counter';
      case 'shelf': case 'carousel': return 'shelf';
      case 'drawerBox': return 'drawer';
      case 'plinth': return 'plinth';
      case 'glass': return p.smoked ? 'smoked' : 'glass';
      case 'door': return p.frame && scene.product === 'wardrobe' ? 'frame' : 'door';
      case 'drawerFront': return 'drawerFront';
      default: return 'carcass';
    }
  };
  scene.parts.forEach((p) => {
    if (p.hw) return; // [NEO-CUSTOM-UX28] hardware items (feet, handles ...) are in the hardware list, not in the 3D file
    const run = runBy.get(p.runKey); if (!run) return;
    const xf = frameXform(scene, run);
    const m = p.round ? (p.axis === 'u' || p.axis === 'd' ? prismAxis(p.box, xf, p.axis, seg(24)) : cylMesh(p.box, xf, seg(CYL_SEG))) : boxMesh(p.box, xf, p.rotY || 0);
    push(`${p.group}_${p.name}`, p.group, matOf(p), p.kind, m);
  });
  scene.runs.forEach((r) => {
    const xf = frameXform(scene, r);
    const G = r.key === 'main' ? '' : `${r.label} `;
    r.counters.forEach((c, i) => push(`${G}Countertop_${i + 1}`, `${G}Countertop`, 'counter', 'counter', boxMesh({ u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, d0: c.d0 || 0, d1: c.d1 }, xf)));
    r.splashes.forEach((c, i) => push(`${G}Backsplash_${i + 1}`, `${G}Countertop`, 'counter', 'splash', boxMesh({ u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, d0: 0, d1: c.d1 }, xf)));
    if (r.plinth && r.plinth.u1 > r.plinth.u0) push(`${G}Plinth`, `${G}Plinth`, 'plinth', 'plinth', boxMesh(r.plinth, xf));
  });
  (scene.appliances || []).forEach((a, i) => {
    const run = scene.runs.find((r) => r.units.some((x) => x.unit.id === a.unitId)); if (!run) return;
    push(`Appliance_${a.type}_${i + 1}`, 'Appliances', 'appliance', 'appliance', boxMesh(a, frameXform(scene, run)));
  });
  /* OPT-IN props (wardrobe studio, "Include props"): rails, hangers and clothes as closed solids in the same frame. Never part of the cut list or the price. */
  if (props && scene.props && scene.props.length) {
    const MAT = { metal: 'rail', black: 'frame', wood: 'hanger' };
    let n = 0;
    scene.props.forEach((pr) => {
      const run = runBy.get(pr.runKey); if (!run) return;
      const xf = frameXform(scene, run);
      if (pr.kind === 'rail') { n += 1; push(`Prop_Rail_${n}`, 'Props', 'rail', 'prop', prismU(pr.box, xf, seg(14))); return; }
      (pr.boxes || [{ ...pr.box, mat: 'cloth', tone: pr.tone }]).forEach((b) => { n += 1; push(`Prop_${pr.kind}_${n}`, 'Props', MAT[b.mat] || (isCatMat(b.mat) ? `cat_${b.mat}` : `cloth${(b.tone != null ? b.tone : pr.tone || 0) % 8}`), 'prop', (b.tb ? boxMeshTaper(b, xf) : boxMesh(b, xf))); });
    });
  }
  const stats = meshStats(objects);
  return { objects, materials, stats, zUp };
}

/** triangles of one face list: quads and n-gons are fan-split (all faces here are convex) */
export function triangulate(faces) {
  const tris = [];
  faces.forEach((f) => { for (let i = 1; i < f.length - 1; i++) tris.push([f[0], f[i], f[i + 1]]); });
  return tris;
}
export function meshStats(objects) {
  let vertices = 0, faces = 0, triangles = 0;
  objects.forEach((o) => { vertices += o.verts.length; faces += o.faces.length; triangles += triangulate(o.faces).length; });
  return { objects: objects.length, vertices, faces, triangles };
}
/** signed volume of an object (mm3): positive when the faces point outward (used by the tests) */
export function meshVolume(o) {
  let v = 0;
  triangulate(o.faces).forEach(([a, b, c]) => {
    const p = o.verts[a], q = o.verts[b], r = o.verts[c];
    v += (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;
  });
  return v;
}
export function meshBounds(objects) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  objects.forEach((o) => o.verts.forEach((v) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); } }));
  return { lo, hi };
}
