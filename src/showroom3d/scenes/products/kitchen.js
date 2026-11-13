/* Kitchen: island with waterfall stone worktop + a wall run (base units with drawers and hinged doors, hob, sink and tap, wall units with
 * under-cabinet LED, brass-trimmed handleless profile). Every opening part is a SEPARATE mesh driven by the kit (kit.js).
 * SAMPLE CONFIGURATION: proportions follow common kitchen practice (900 mm worktop height, 600 mm run depth) but nothing here is a spec. */
import * as THREE from 'three';
import { bevelBox, flutedPanel, placed, prep, roundRect, slabFromShape, tube } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh, CANOPY_Y } from './stage';
import * as pr from './props';

const BASE = { y0: 0.1, top: 0.865, wt: 0.04 };          // plinth height, carcass top, worktop thickness
const RUN = { x0: -2.8, x1: -2.2, z0: -2.7, z1: 2.7, unit: 0.9 };
const ISL = { x0: -0.7, x1: 0.19, zh: 1.26, wx0: -1.0, wx1: 0.22 };
const T = 0.019;

/** UVs for the waterfall worktop: the top and the leg faces share ONE continuous vein coordinate so the stone appears to fold over the edge */
function waterfallUV(g, k, zEdge) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; }
    else if (az >= ax) { u = x; v = Math.sign(z) * (zEdge + (BASE.top + BASE.wt - y)); }
    else { u = y * 0.5; v = z; }
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function buildKitchen({ M, tier, registry, reduced }) {
  const kit = createKit({ product: 'kitchen', M, tier, registry, reduced });
  const { group, lod } = kit, F = M.front.kitchen, C = M.carcass.kitchen, METAL = M.metal.kitchen;
  const fin = (w, h, d, o) => bevelBox(w, h, d, o);

  kit.floor();
  // ---- feature wall: fluted timber (real geometry) + stone splashback ----
  const wall = new THREE.Mesh(flutedPanel(6.2, 3.3, 0.04, { pitch: 0.04, relief: 0.012, off: [0.2, 0.1] }).rotateY(Math.PI / 2), M.flute.kitchen);
  wall.position.set(-2.84, 1.65, 0); wall.receiveShadow = true; wall.name = 'feature-wall'; group.add(wall);
  kit.addStatic(placed(fin(0.02, 0.6, 5.4, { b: 0.001, tile: 1.6, grain: 'z' }), { x: -2.775, y: 1.2 }), M.stone);

  // ---- wall run: plinth, carcass shell, worktop with sink hole ----
  const sx = (RUN.x0 + RUN.x1) / 2, depth = RUN.x1 - RUN.x0;
  kit.addStatic(placed(fin(depth - 0.1, BASE.y0, 5.4, { b: 0.001 }), { x: sx - 0.04, y: BASE.y0 / 2 }), M.plinth);
  const ch = BASE.top - BASE.y0;
  const shell = [placed(fin(0.018, ch, 5.4, { b: 0.0008 }), { x: RUN.x0 + 0.009, y: BASE.y0 + ch / 2 }), placed(fin(depth, 0.018, 5.4, { b: 0.0008 }), { x: sx, y: BASE.top - 0.009 }), placed(fin(depth, 0.018, 5.4, { b: 0.0008 }), { x: sx, y: BASE.y0 + 0.009 })];
  for (let i = 0; i <= 6; i++) shell.push(placed(fin(depth - 0.02, ch, 0.018, { b: 0.0008 }), { x: sx - 0.01, y: BASE.y0 + ch / 2, z: RUN.z0 + i * RUN.unit + (i === 0 ? 0.009 : i === 6 ? -0.009 : 0) }));
  shell.forEach((g) => kit.addStatic(g, C));
  const wtShape = new THREE.Shape(); wtShape.moveTo(-2.8, -2.7); wtShape.lineTo(-2.16, -2.7); wtShape.lineTo(-2.16, 2.7); wtShape.lineTo(-2.8, 2.7); wtShape.closePath();
  wtShape.holes.push(roundRect(0.4, 0.5, 0.03, -2.5, 1.35));   // shape y = -z, so the sink at z = -1.35 sits at y = +1.35
  const wt = slabFromShape(wtShape, BASE.wt, { tile: 1.6, b: 0.0015 }); wt.rotateX(-Math.PI / 2); wt.translate(0, BASE.top + BASE.wt / 2, 0);
  { const pos = wt.attributes.position, nor = wt.attributes.normal, uv = new Float32Array(pos.count * 2); for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) + 3.1) / 1.7; uv[i * 2 + 1] = (Math.abs(nor.getY(i)) > 0.5 ? pos.getZ(i) : pos.getY(i) * 2 + pos.getZ(i)) / 1.7; } wt.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  kit.addStatic(wt, M.stone);
  // sink: brushed steel basin below the hole, drain, and a brass gooseneck tap with a lever
  const sinkZ = RUN.z0 + 1.5 * RUN.unit, sinkX = -2.5;
  const basin = [placed(fin(0.4, 0.2, 0.012, { b: 0.0008 }), { x: sinkX, y: BASE.top - 0.1, z: sinkZ - 0.25 }), placed(fin(0.4, 0.2, 0.012, { b: 0.0008 }), { x: sinkX, y: BASE.top - 0.1, z: sinkZ + 0.25 }),
    placed(fin(0.012, 0.2, 0.5, { b: 0.0008 }), { x: sinkX - 0.2, y: BASE.top - 0.1, z: sinkZ }), placed(fin(0.012, 0.2, 0.5, { b: 0.0008 }), { x: sinkX + 0.2, y: BASE.top - 0.1, z: sinkZ }),
    placed(fin(0.4, 0.01, 0.5, { b: 0.0008 }), { x: sinkX, y: BASE.top - 0.205, z: sinkZ }), placed(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 16), { x: sinkX, y: BASE.top - 0.198, z: sinkZ })].map(prep);
  kit.addStatic(mergeGeometries(basin), M.steel);
  const tapZ = sinkZ;
  kit.addStatic(placed(new THREE.CylinderGeometry(0.026, 0.03, 0.03, 18), { x: -2.7, y: BASE.top + BASE.wt + 0.015, z: tapZ }), METAL);
  kit.addStatic(placed(tube([[0, 0, 0], [0, 0.26, 0], [0.02, 0.37, 0], [0.12, 0.4, 0], [0.18, 0.34, 0], [0.18, 0.28, 0]], 0.0105, { seg: 30, radial: 12 }), { x: -2.7, y: BASE.top + BASE.wt + 0.03, z: tapZ }), METAL);
  kit.addStatic(placed(new THREE.CylinderGeometry(0.0075, 0.0075, 0.075, 10), { x: -2.7, y: BASE.top + BASE.wt + 0.19, z: tapZ + 0.058, rx: Math.PI / 2 }), METAL);
  // hob
  const hobZ = RUN.z0 + 3.5 * RUN.unit;
  kit.addStatic(placed(fin(0.52, 0.006, 0.58, { b: 0.001 }), { x: -2.5, y: BASE.top + BASE.wt + 0.003, z: hobZ }), M.hob);

  // ---- wall run fronts ----
  const fronts = [], pulls = [];
  const addFront = (w, h, y, z, grain = 'z', off = [Math.random(), 0], pullTop = true) => {
    fronts.push(placed(fin(T, h, w, { grain, off }), { x: RUN.x1 + T / 2 - 0.001, y, z }));
    if (pullTop) { pulls.push(placed(fin(0.004, 0.017, w - 0.006, { b: 0.0008 }), { x: RUN.x1 + T + 0.0, y: y + h / 2 - 0.0105, z }), placed(fin(0.026, 0.004, w - 0.006, { b: 0.0008 }), { x: RUN.x1 + T / 2 - 0.012, y: y + h / 2 - 0.003, z })); }
  };
  const uz = (i) => RUN.z0 + (i + 0.5) * RUN.unit;
  const fy = BASE.y0 + 0.008, fh = ch - 0.016;
  // fixed: shallow drawer above the hob, dishwasher panel, two doors (decor: the openable ones are the drawers / sink doors / island)
  addFront(0.894, 0.148, BASE.top - 0.008 - 0.074, uz(3), 'z', [0.3, 0.2]);
  addFront(0.894, fh, fy + fh / 2, uz(4), 'z', [0.5, 0.4]);
  addFront(0.444, fh, fy + fh / 2, uz(5) - 0.225, 'y', [0.2, 0.6], false); addFront(0.444, fh, fy + fh / 2, uz(5) + 0.225, 'y', [0.8, 0.3], false);
  // finger pull for the two end doors (vertical bar on the inner edge)
  pulls.push(placed(fin(0.02, 0.5, 0.016, { b: 0.0008 }), { x: RUN.x1 + T + 0.004, y: BASE.top - 0.34, z: uz(5) - 0.04 }), placed(fin(0.02, 0.5, 0.016, { b: 0.0008 }), { x: RUN.x1 + T + 0.004, y: BASE.top - 0.34, z: uz(5) + 0.04 }));
  fronts.forEach((g) => kit.addStatic(g, F)); pulls.forEach((g) => kit.addStatic(g, METAL));

  // ---- wall run: moving parts ----
  kit.drawer({ id: 'k-run-d1', x: RUN.x1 + T / 2 - 0.001, y: BASE.y0 + 0.008 + 0.375, z: uz(0), w: 0.894, h: 0.742, depth: 0.52, travel: 0.46, grainOff: [0.15, 0.3], frontMat: F, metalMat: METAL, bodyMat: M.interior });
  kit.drawer({ id: 'k-run-d3', x: RUN.x1 + T / 2 - 0.001, y: BASE.y0 + 0.008 + 0.375, z: uz(2), w: 0.894, h: 0.742, depth: 0.52, travel: 0.46, grainOff: [0.6, 0.1], frontMat: F, metalMat: METAL, bodyMat: M.interior });
  kit.drawer({ id: 'k-run-hob', x: RUN.x1 + T / 2 - 0.001, y: BASE.y0 + 0.008 + 0.298, z: uz(3), w: 0.894, h: 0.596, depth: 0.52, travel: 0.46, grainOff: [0.9, 0.5], frontMat: F, metalMat: METAL, bodyMat: M.interior });
  const hingeMat = M.steel;
  const sa = kit.hinged({ id: 'k-run-sink', x: RUN.x1 + T / 2, y: fy + fh / 2, z: uz(1) - 0.447, w: 0.444, h: fh, t: T, side: 1, maxDeg: 105, grainOff: [0.4, 0.7], pull: 'none', frontMat: F, metalMat: METAL, hingeMat });
  const sb = kit.hinged({ id: 'k-run-sink', x: RUN.x1 + T / 2, y: fy + fh / 2, z: uz(1) + 0.447, w: 0.444, h: fh, t: T, side: -1, maxDeg: 105, grainOff: [0.2, 0.2], pull: 'none', frontMat: F, metalMat: METAL, hingeMat });
  for (const [g, s] of [[sa, 1], [sb, -1]]) { const bar = new THREE.Mesh(prep(placed(fin(0.02, 0.5, 0.016, { b: 0.0008 }), { x: T / 2 + 0.004, y: 0.22, z: s * (0.444 - 0.04) })), METAL); bar.castShadow = true; g.group.add(bar); g.hit.push(bar); }
  registry.register({ id: 'k-run-sink', product: 'kitchen', kind: 'door', label: { en: 'Sink cupboard doors', ar: 'أبواب وحدة الحوض' }, hit: [...sa.hit, ...sb.hit], object: sa.group });
  registry.get('k-run-sink').objects = [sa.group, sb.group];
  // sink cupboard interior: dark cavity + pipes read as "inside" (merged into statics): back panel stays the carcass back
  kit.addStatic(placed(fin(0.4, 0.012, 0.86, { b: 0.0008 }), { x: sx - 0.05, y: 0.3, z: uz(1) }), M.interior);

  // ---- wall units + hood ----
  const upY = 1.5, upH = 0.7, upX0 = RUN.x0, upD = 0.34, upT = 0.019;
  const upper = (i0, n) => {
    const z0 = RUN.z0 + i0 * RUN.unit, w = n * RUN.unit;
    kit.addStatic(placed(fin(upD, upH, w, { b: 0.0008 }), { x: upX0 + upD / 2, y: upY + upH / 2, z: z0 + w / 2 }), C);
    for (let i = 0; i < n; i++) {
      const zc = z0 + (i + 0.5) * RUN.unit;
      kit.addStatic(placed(fin(upT, upH - 0.008, RUN.unit - 0.006, { grain: 'z', off: [i * 0.2 + i0 * 0.13, 0.5] }), { x: upX0 + upD + upT / 2 - 0.001, y: upY + upH / 2, z: zc }), F);
      kit.addStatic(placed(fin(0.004, 0.017, RUN.unit - 0.012, { b: 0.0008 }), { x: upX0 + upD + upT, y: upY + 0.0105 + 0.004, z: zc }), METAL);
      kit.addStatic(placed(fin(0.026, 0.004, RUN.unit - 0.012, { b: 0.0008 }), { x: upX0 + upD + upT / 2 - 0.012, y: upY + 0.004 + 0.003, z: zc }), METAL);
    }
  };
  upper(0, 3); upper(4, 2);
  // brushed-brass canopy hood over the hob
  kit.addStatic(placed(fin(0.5, 0.07, 0.9, { b: 0.004 }), { x: -2.55, y: 1.55, z: hobZ }), METAL);
  kit.addStatic(placed(fin(0.28, 1.65, 0.38, { b: 0.004 }), { x: -2.66, y: 2.47, z: hobZ }), METAL);
  kit.addStatic(placed(fin(0.3, 0.02, 0.3, { b: 0.002 }), { x: -2.55, y: 1.506, z: hobZ }), M.hob);

  // ---- island: carcass, back panelling, waterfall worktop ----
  const ix = (ISL.x0 + ISL.x1) / 2, iw = ISL.x1 - ISL.x0, ih = BASE.top - BASE.y0;
  kit.addStatic(placed(fin(iw - 0.12, BASE.y0, 2 * ISL.zh - 0.1, { b: 0.001 }), { x: ix, y: BASE.y0 / 2 }), M.plinth);
  const ishell = [placed(fin(0.018, ih, 2 * ISL.zh, { b: 0.0008 }), { x: ISL.x0 + 0.009, y: BASE.y0 + ih / 2 }), placed(fin(iw, 0.018, 2 * ISL.zh, { b: 0.0008 }), { x: ix, y: BASE.top - 0.009 }), placed(fin(iw, 0.018, 2 * ISL.zh, { b: 0.0008 }), { x: ix, y: BASE.y0 + 0.009 })];
  for (const z of [-ISL.zh + 0.009, 0, ISL.zh - 0.009]) ishell.push(placed(fin(iw - 0.02, ih, 0.018, { b: 0.0008 }), { x: ix - 0.01, y: BASE.y0 + ih / 2, z }));
  for (const y of [0.395, 0.662]) ishell.push(placed(fin(iw - 0.02, 0.016, ISL.zh - 0.02, { b: 0.0008 }), { x: ix - 0.01, y, z: -ISL.zh / 2 }));   // shelves between the left drawers
  ishell.push(placed(fin(iw - 0.02, 0.016, ISL.zh - 0.02, { b: 0.0008 }), { x: ix - 0.01, y: 0.662, z: ISL.zh / 2 }), placed(fin(iw - 0.04, 0.016, ISL.zh - 0.04, { b: 0.0008 }), { x: ix - 0.01, y: 0.4, z: ISL.zh / 2 }));
  ishell.forEach((g) => kit.addStatic(g, C));
  // aisle-side back: fluted panelling in the front finish
  const back = new THREE.Mesh(flutedPanel(2 * ISL.zh, ih + 0.04, 0.03, { pitch: 0.04, relief: 0.011, off: [0.4, 0.7] }).rotateY(-Math.PI / 2), M.flute.kitchen);
  back.position.set(ISL.x0 - 0.012, BASE.y0 + (ih + 0.04) / 2 - 0.02, 0); back.castShadow = back.receiveShadow = true; group.add(back);
  // waterfall: a single U-shaped stone profile (top + two legs) extruded along X
  const zE = ISL.zh + 0.04, topY = BASE.top + BASE.wt;
  const prof = new THREE.Shape(); prof.moveTo(-zE, 0); prof.lineTo(-zE, topY); prof.lineTo(zE, topY); prof.lineTo(zE, 0); prof.lineTo(ISL.zh, 0); prof.lineTo(ISL.zh, BASE.top); prof.lineTo(-ISL.zh, BASE.top); prof.lineTo(-ISL.zh, 0); prof.closePath();
  const wlen = ISL.wx1 - ISL.wx0, wf = new THREE.ExtrudeGeometry(prof, { depth: wlen - 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 1 });
  wf.translate(0, 0, -(wlen - 0.004) / 2); wf.rotateY(-Math.PI / 2); wf.translate((ISL.wx0 + ISL.wx1) / 2, 0, 0); wf.computeVertexNormals(); waterfallUV(wf, 1 / 1.7, zE);
  kit.addStatic(wf, M.stone);

  // ---- island: moving parts ----
  const ifx = ISL.x1 + T / 2 - 0.001, wL = ISL.zh - 0.016;
  const idef = [['k-island-a1', 0.197, 0.7635, -ISL.zh / 2], ['k-island-a2', 0.267, 0.5285, -ISL.zh / 2], ['k-island-a3', 0.284, 0.25, -ISL.zh / 2]];
  idef.forEach(([id, h, y, z], i) => kit.drawer({ id, x: ifx, y, z, w: wL - 0.012, h, depth: 0.7, travel: 0.58, grainOff: [0.1 + i * 0.27, 0.33], frontMat: F, metalMat: METAL, bodyMat: M.interior }));
  kit.drawer({ id: 'k-island-b1', x: ifx, y: 0.7635, z: ISL.zh / 2, w: wL - 0.012, h: 0.197, depth: 0.7, travel: 0.58, grainOff: [0.77, 0.12], frontMat: F, metalMat: METAL, bodyMat: M.interior });
  const ldoor = (side, z, off) => kit.hinged({ id: 'k-island-door', x: ISL.x1 + T / 2, y: 0.385, z, w: (ISL.zh - 0.02) / 2 - 0.004, h: 0.554, t: T, side, maxDeg: 112, grainOff: off, pull: 'none', frontMat: F, metalMat: METAL, hingeMat });
  const da = ldoor(1, 0.012, [0.5, 0.6]), db = ldoor(-1, ISL.zh - 0.008, [0.25, 0.9]);
  for (const [g, s, w] of [[da, 1, (ISL.zh - 0.02) / 2 - 0.004], [db, -1, (ISL.zh - 0.02) / 2 - 0.004]]) { const bar = new THREE.Mesh(prep(placed(fin(0.016, 0.017, 0.2, { b: 0.0008 }), { x: T / 2 + 0.006, y: 0.554 / 2 - 0.02, z: s * (w - 0.1) })), METAL); bar.castShadow = true; g.group.add(bar); g.hit.push(bar); }
  registry.register({ id: 'k-island-door', product: 'kitchen', kind: 'door', label: { en: 'Island cupboard doors', ar: 'أبواب خزانة الجزيرة' }, hit: [...da.hit, ...db.hit], object: da.group }); registry.get('k-island-door').objects = [da.group, db.group];

  // register the two-leaf parts' updaters already live in kit.hinged; now LED: under the wall units, in the island cupboard, plinth line
  kit.led({ x: -2.5, y: upY - 0.004, z: -1.35, len: 2.62, axis: 'z', thick: 0.014, levelOf: (s) => s.accentLevel(), washPlane: { w: 2.62, h: 0.62, pos: [-2.772, 1.18, -1.35], rot: [0, Math.PI / 2, 0] } });
  kit.led({ x: -2.5, y: upY - 0.004, z: 1.8, len: 1.7, axis: 'z', thick: 0.014, levelOf: (s) => s.accentLevel(), washPlane: { w: 1.7, h: 0.62, pos: [-2.772, 1.18, 1.8], rot: [0, Math.PI / 2, 0] } });
  kit.led({ x: RUN.x1 - 0.06, y: 0.098, z: 0, len: 5.2, axis: 'z', thick: 0.012, levelOf: (s) => 0.6 * s.accentLevel(), washPlane: { w: 5.2, h: 0.55, pos: [RUN.x1 + 0.3, 0.006, 0], rot: [-Math.PI / 2, 0, Math.PI / 2] } });
  kit.led({ x: ix + 0.15, y: 0.098, z: 0, len: 2.2, axis: 'z', thick: 0.012, levelOf: (s) => 0.6 * s.accentLevel(), washPlane: { w: 2.2, h: 0.6, pos: [ISL.x1 + 0.28, 0.006, 0], rot: [-Math.PI / 2, 0, Math.PI / 2] } });
  kit.led({ x: ix, y: 0.64, z: 0.64, len: 0.9, axis: 'z', thick: 0.012, levelOf: (s) => s.ledLevel('k-island-door') });

  // ---- pendants over the island ----
  const pend = [], lamps = [];
  for (const z of [-0.7, 0, 0.7]) {
    pend.push(prep(placed(pr.pendantShade(0, 0, 0, { r: 0.15, h: 0.18 }), { x: -0.25, y: 2.0, z })), prep(placed(new THREE.CylinderGeometry(0.004, 0.004, CANOPY_Y - 2.18, 5), { x: -0.25, y: (CANOPY_Y + 2.18) / 2, z })));
    lamps.push(prep(placed(new THREE.SphereGeometry(0.035, 10, 8), { x: -0.25, y: 2.04, z })));
  }
  kit.mesh(mergeGeometries(pend), METAL, { cast: false });
  const bulb = M.ledWarm(); bulb.color.multiplyScalar(1.4); kit.mesh(mergeGeometries(lamps), bulb, { cast: false });
  kit.pool(-0.2, BASE.top + BASE.wt + 0.004, 0, 1.8, 0.35);

  // ---- baked ambient occlusion (decals): wall under the canopy, splashback under the wall units, island fronts under the overhang, worktop at the splashback ----
  kit.ao([-2.815, 3.05, 0], [0, 0, 1], [0, 1, 0], 6.2, 0.55, '+v', 0.5);
  kit.ao([-2.77, 1.36, -1.35], [0, 0, 1], [0, 1, 0], 2.7, 0.3, '+v', 0.42); kit.ao([-2.77, 1.36, 1.8], [0, 0, 1], [0, 1, 0], 1.8, 0.3, '+v', 0.42);
  kit.ao([-2.5, 0.907, 0], [0, 0, 1], [1, 0, 0], 5.4, 0.2, '-v', 0.3);
  kit.ao([ISL.x1 + T + 0.002, 0.77, 0], [0, 0, 1], [0, 1, 0], 2.4, 0.2, '+v', 0.45);
  kit.ao([-2.2 - 0.1, 0.011, 0], [0, 0, 1], [1, 0, 0], 5.4, 0.3, '-v', 0.35);
  // ---- stage: canopy, wall wash, contact shadows, floor pool ----
  buildCanopy(kit); buildWallWash(kit, { z: 0, len: 6.0 });
  kit.contactShadow({ x: ix - 0.2, z: 0, w: 1.5, d: 3.0, strength: 0.55, blur: 26 });
  kit.contactShadow({ x: sx, z: 0, w: 1.2, d: 6.2, strength: 0.5, blur: 24 });

  { const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.6), M.rug); rug.rotation.x = -Math.PI / 2; rug.rotation.z = Math.PI / 2; rug.position.set(-1.75, 0.0125, 0); rug.receiveShadow = true; lod.props.add(rug); }   // runner in the aisle
  // ---- props (merged by material class: three draw calls for the whole set) ----
  const wtTop = BASE.top + BASE.wt;
  const matte = [], ceramic = [], metalP = [], fabric = [], leaves = [], cards = [];
  ceramic.push(...pr.fruitBowl(-0.12, wtTop, 0.62), ...pr.vase(-0.3, wtTop, -0.6, { h: 0.34, r: 0.075, color: P.ceramicSand }), ...pr.plateStack(-2.45, wtTop, -0.45), ...pr.mug(-2.4, wtTop, -1.0, { color: P.ceramicTerra, ry: 0.5 }), ...pr.mug(-2.35, wtTop, -1.14), ...pr.utensilCrock(-2.7, wtTop, -2.45), ...pr.glass(-0.1, wtTop, -0.2));
  matte.push(...pr.books(-0.35, wtTop, 0.1, { n: 4, seed: 3, ry: 0.2 }), ...pr.cuttingBoard(-2.45, wtTop, -2.0));
  metalP.push(...pr.potOnHob(-2.5, wtTop + 0.007, hobZ));
  { const pl = pr.plant(-2.62, wtTop, 2.42, { h: 0.45, leaves: 14, potR: 0.07, seed: 9, leafSize: 0.05 }); leaves.push(...pl.body); cards.push(...pl.cards); }
  leaves.push(...pr.stems(-0.3, wtTop + 0.3, -0.6, { n: 6, h: 0.55, seed: 4 }));
  const st1 = pr.stool(-1.22, -0.62, { color: P.fabricClay }), st2 = pr.stool(-1.22, 0.62, { color: P.fabricClay });
  fabric.push(...st1.soft, ...st2.soft); metalP.push(...st1.hard, ...st2.hard);
  // dishes inside the island cupboard (seen when the doors open)
  ceramic.push(...pr.plateStack(-0.25, 0.416, 0.36, 5), ...pr.plateStack(-0.25, 0.416, 0.9, 4), ...pr.bowl(-0.25, 0.121, 0.4), ...pr.bowl(-0.25, 0.121, 0.85, { r: 0.1 }));
  const add = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  add(ceramic, M.ceramic); add(matte, M.matte); add(metalP, M.propMetal); add(fabric, M.fabric); add(leaves, M.leaves, false); add(cards, M.leafCard, false);

  kit.flushStatics();
  kit.extents = { x0: -3, x1: 3, z: 3.4 };
  kit.focusPart = { 'k-run-d1': [RUN.x1, 0.5, uz(0)], 'k-run-d3': [RUN.x1, 0.5, uz(2)], 'k-run-hob': [RUN.x1, 0.4, uz(3)], 'k-run-sink': [RUN.x1, 0.5, uz(1)] };
  return kit;
}
