/* Bedroom: one styled room. Upholstered headboard panel and bed on a floating base, two floating bedside units with two drawers each, a dressing unit
 * with a mirror and two drawers, a wardrobe wall (two double-door sections, fluted fronts) with hanging rails, shelving, folded linen and LED.
 * Every opening part is a separate mesh (kit.js). SAMPLE CONFIGURATION; nothing here is a specification. Product frame: +X toward the visitor. */
import * as THREE from 'three';
import { placed, prep, mergeColored } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh } from './stage';
import * as pr from './props';
import * as fu from './furnish';

const { fin } = fu;
const T = 0.019, ZB = 0.3;            // door thickness; bed centre line (z)

export function buildBedroom({ M, tier, registry, reduced }) {
  const kit = createKit({ product: 'bedroom', M, tier, registry, reduced });
  const { group, lod } = kit, F = M.front.bedroom, C = M.carcass.bedroom, METAL = M.metal.bedroom, FL = M.flute.bedroom, UP = M.uphol.bedroom, STONE = M.stones.bedroom;
  const add = (list, mat) => list.forEach((g) => kit.addStatic(g, mat));

  kit.floor();
  // ---- wall: warm plaster plane + a vertical LED cove behind the headboard ----
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.3), M.plaster); w.position.set(-2.995, 1.65, 0); w.rotation.y = Math.PI / 2; w.receiveShadow = true; group.add(w); }

  // ---- wardrobe wall: z -3.25 .. -1.2, two double-door sections (fluted fronts), rails + shelves + folded linen inside ----
  const WX0 = -3.0, WX1 = -2.38, Y0 = 0.06, Y1 = 2.62, H = Y1 - Y0, LH = H - 0.06, LY = Y0 + 0.03 + LH / 2, W = 0.505;
  add(fu.shell({ x0: WX0, x1: WX1, y0: Y0, y1: Y1, z0: -3.25, z1: -1.2, divs: [-2.225] }), C);
  kit.addStatic(placed(fin(WX1 - WX0 - 0.1, Y0, 2.0, { b: 0.001 }), { x: -2.72, y: Y0 / 2, z: -2.225 }), M.plinth);
  kit.addStatic(placed(fin(0.04, 0.02, 2.07, { b: 0.001 }), { x: WX1 - 0.01, y: Y1 + 0.01, z: -2.225 }), METAL);
  const doorOpts = { y: LY, h: LH, t: T, w: W, maxDeg: 108, fluted: true, frontMat: F, flutedMat: FL, metalMat: METAL, hingeMat: M.steel };
  kit.doorPair({ id: 'bd-ward-a', x: WX1 + T / 2, z0: -3.245, z1: -2.235, grainOff: [0.3, 0.2], ...doorOpts });
  kit.doorPair({ id: 'bd-ward-b', x: WX1 + T / 2, z0: -2.215, z1: -1.205, grainOff: [0.7, 0.5], ...doorOpts });
  const hw = [], soft = [], ceramic = [], board = [], band = [];
  fu.rail(hw, -2.66, 2.02, -3.22, -2.24);
  fu.hang(soft, -2.66, 2.0, -3.2, -2.26, ['dress', 'coat', 'dress', 'shirt', 'coat'], 1);
  fu.shelf(WX0, 0.5, 2.3, -3.23, -2.24, { board, band }); fu.shelf(WX0, 0.5, 0.36, -3.23, -2.24, { board, band });
  soft.push(...pr.shoe(-2.6, 0.371, -3.0, { ry: Math.PI / 2 }), ...pr.shoe(-2.6, 0.371, -2.85, { ry: Math.PI / 2, color: P.fabricClay }), ...pr.shoe(-2.6, 0.371, -2.7, { ry: Math.PI / 2, color: P.fabricCream }), ...pr.storageBox(-2.7, 2.311, -2.7, { w: 0.3, h: 0.2, d: 0.3 }), ...pr.storageBox(-2.7, 2.311, -3.05, { w: 0.3, h: 0.22, d: 0.3, color: P.fabricSage }));
  for (const y of [0.5, 0.9, 1.3, 1.7, 2.1]) fu.shelf(WX0, 0.5, y, -2.2, -1.22, { board, band });
  [[0.5, 1], [0.9, 2], [1.3, 3], [1.7, 4], [2.1, 5]].forEach(([y, k]) => soft.push(...pr.foldedStack(-2.7, y + 0.011, -1.9, { n: 3 + (k % 3), seed: k }), ...pr.foldedStack(-2.7, y + 0.011, -1.5, { n: 4 - (k % 2), seed: k + 7 })));
  add(board, M.interior); add(band, M.paintWhite);
  const levelA = (s) => s.ledLevel('bd-ward-a'), levelB = (s) => s.ledLevel('bd-ward-b');
  for (const [z, lv, f] of [[-3.22, levelA, 1], [-2.24, levelA, -1], [-2.2, levelB, 1], [-1.22, levelB, -1]]) kit.led({ x: -2.42, y: (Y0 + Y1) / 2, z, len: H - 0.1, axis: 'y', thick: 0.012, levelOf: lv, intensity: 1.6, washPlane: { w: H - 0.1, h: 0.5, pos: [-2.72, (Y0 + Y1) / 2, z + f * 0.012], rot: [0, 0, -Math.PI / 2] } });

  // ---- bed: headboard panel of vertical upholstered channels, floating base, mattress, duvet, pillows, throw ----
  const hb = [placed(fin(0.04, 1.5, 2.5, { b: 0.004, grain: 'z' }), { x: -2.975, y: 1.12, z: ZB })];
  kit.addStatic(hb[0], M.plinth);
  for (let i = 0; i < 5; i++) kit.addStatic(placed(fin(0.13, 1.28, 0.452, { b: 0.05, tile: 0.3 }), { x: -2.9, y: 1.08, z: ZB + (i - 2) * 0.465 }), UP);
  kit.addStatic(placed(fin(1.98, 0.1, 1.9, { b: 0.01 }), { x: -1.96, y: 0.07, z: ZB }), M.plinth);
  kit.addStatic(placed(fin(2.05, 0.28, 1.98, { b: 0.025, tile: 0.3 }), { x: -1.93, y: 0.27, z: ZB }), UP);   // base
  const bedding = [
    { geo: placed(fin(1.98, 0.2, 1.8, { b: 0.06 }), { x: -1.93, y: 0.52, z: ZB }), color: P.fabricCream },                                         // mattress
    { geo: placed(fin(1.5, 0.09, 1.86, { b: 0.04 }), { x: -1.68, y: 0.66, z: ZB }), color: P.fabricLinen },                                         // duvet
    { geo: placed(fin(0.46, 0.09, 1.72, { b: 0.04 }), { x: -1.0, y: 0.685, z: ZB }), color: P.fabricClay },                                            // throw across the foot
  ];
  for (const dz of [-0.46, 0.46]) bedding.push({ geo: placed(fin(0.3, 0.17, 0.66, { b: 0.07 }), { x: -2.7, y: 0.74, z: ZB + dz, rz: -0.28 }), color: P.fabricCream }, { geo: placed(fin(0.24, 0.15, 0.52, { b: 0.06 }), { x: -2.5, y: 0.78, z: ZB + dz * 0.75, rz: -0.25, ry: dz * 0.2 }), color: P.fabricLinen });
  bedding.push({ geo: placed(fin(0.14, 0.14, 0.4, { b: 0.05 }), { x: -2.4, y: 0.8, z: ZB, rz: -0.2 }), color: P.fabricSage });
  group.add(propMesh(bedding, M.fabric, { cast: true }));
  kit.led({ x: -1.95, y: 0.105, z: ZB, len: 1.86, axis: 'z', thick: 0.012, levelOf: (s) => 0.7 * s.accentLevel(), washPlane: { w: 2.2, h: 2.2, pos: [-1.95, 0.008, ZB], rot: [-Math.PI / 2, 0, 0] } });
  kit.led({ x: -2.955, y: 1.84, z: ZB, len: 2.3, axis: 'z', thick: 0.016, levelOf: (s) => s.accentLevel(), washPlane: { w: 2.5, h: 1.0, pos: [-2.993, 2.05, ZB], rot: [0, Math.PI / 2, 0] } });
  // bench at the foot of the bed
  kit.addStatic(placed(fin(0.42, 0.2, 1.5, { b: 0.06, tile: 0.3 }), { x: -0.62, y: 0.36, z: ZB }), UP); kit.addStatic(placed(fin(0.34, 0.2, 1.4, { b: 0.01 }), { x: -0.62, y: 0.1, z: ZB }), M.plinth);

  // ---- floating bedside units (two drawers each) + lamps ----
  const bedside = (id, zc, off) => {
    add(fu.shell({ x0: WX0, x1: -2.56, y0: 0.26, y1: 0.7, z0: zc - 0.25, z1: zc + 0.25 }), C);
    kit.addStatic(placed(fin(0.46, 0.03, 0.52, { b: 0.004, grain: 'z' }), { x: -2.78, y: 0.715 }), F);
    [[1, 0.57], [2, 0.37]].forEach(([k, y], i) => kit.drawer({ id: `bd-bs-${id}${k}`, x: -2.56 + T / 2 - 0.001, y, z: zc, w: 0.488, h: 0.19, depth: 0.38, travel: 0.34, grainOff: [off + i * 0.3, 0.2], frontMat: F, metalMat: METAL, bodyMat: M.interior }));
    kit.ao([-2.545, 0.2, zc], [0, 0, 1], [0, 1, 0], 0.7, 0.18, '+v', 0.45);
  };
  bedside('l', ZB - 1.18, 0.1); bedside('r', ZB + 1.18, 0.6);
  const lampBody = [], shadeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.shadeLinen).multiplyScalar(2.2), side: THREE.DoubleSide, toneMapped: false }), shades = [];
  for (const zc of [ZB - 1.18, ZB + 1.18]) { const L = pr.tableLamp(-2.8, 0.73, zc); lampBody.push(...L.body); shades.push(prep(L.shade)); ceramic.push(...pr.books(-2.65, 0.73, zc + (zc < ZB ? 0.12 : -0.12), { n: 2, seed: 5, w: 0.16, d: 0.12 })); }
  lod.props.add(new THREE.Mesh(mergeColored(lampBody), M.propMetal)); kit.mesh(mergeGeometries(shades), shadeMat, { cast: false, parent: lod.props });

  // ---- dressing unit (z 1.95 .. 3.25): two drawers, stone top, mirror in a metal frame with a backlit halo, pouf ----
  const VZ = 2.6, VW = 1.3;
  add(fu.shell({ x0: WX0, x1: -2.54, y0: 0.26, y1: 0.76, z0: VZ - VW / 2, z1: VZ + VW / 2, divs: [] }), C);
  kit.addStatic(placed(fin(0.5, 0.035, VW + 0.02, { b: 0.004, tile: 1.4 }), { x: -2.77, y: 0.7775 }), STONE);
  [[1, 0.65], [2, 0.4]].forEach(([k, y], i) => kit.drawer({ id: `bd-van-${k}`, x: -2.54 + T / 2 - 0.001, y, z: VZ, w: VW - 0.04, h: 0.23, depth: 0.4, travel: 0.36, grainOff: [0.5 + i * 0.3, 0.4], frontMat: F, metalMat: METAL, bodyMat: M.interior }));
  kit.addStatic(placed(fin(0.03, 1.12, 0.98, { b: 0.004 }), { x: -2.965, y: 1.55, z: VZ }), METAL);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.04), M.mirror); m.position.set(-2.948, 1.55, VZ); m.rotation.y = Math.PI / 2; m.name = 'mirror'; group.add(m); }
  kit.led({ x: -2.985, y: 1.55, z: VZ + 0.52, len: 1.12, axis: 'y', thick: 0.01, levelOf: (s) => s.accentLevel(), washPlane: { w: 1.12, h: 0.5, pos: [-2.97, 1.55, VZ + 0.52], rot: [0, 0, -Math.PI / 2] } });
  kit.led({ x: -2.985, y: 1.55, z: VZ - 0.52, len: 1.12, axis: 'y', thick: 0.01, levelOf: (s) => s.accentLevel() });
  { const p = fu.pouf({ x: -2.0, z: VZ, r: 0.2, h: 0.44 }); add(p.soft, UP); add(p.hard, M.plinth); }
  ceramic.push(...fu.bottle(-2.85, 0.795, VZ - 0.4), ...fu.bottle(-2.8, 0.795, VZ - 0.3, { h: 0.1, color: P.ceramicSand }), ...pr.vase(-2.8, 0.795, VZ + 0.45, { h: 0.2, r: 0.045, color: P.ceramicTerra }), ...pr.candle(-2.7, 0.795, VZ + 0.12));
  ceramic.push(...fu.trayOf(-2.72, 0.795, VZ - 0.05, { w: 0.4, d: 0.24 }).map((o) => ({ ...o })));

  // ---- rug, plant, canopy, light ----
  { const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.6), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.45, 0.0125, ZB); rug.receiveShadow = true; lod.props.add(rug); }
  const pl = pr.plant(-1.15, 0, -0.95, { h: 1.5, leaves: 46, potR: 0.18, seed: 21 });
  kit.ao([-2.99, 3.05, 0], [0, 0, 1], [0, 1, 0], 6.2, 0.9, '+v', 0.3);
  buildCanopy(kit, { downlights: [[-1.6, -2.2], [-1.6, 0.3], [-1.6, 2.4], [0.9, -2.2], [0.9, 0.3], [0.9, 2.4]] }); buildWallWash(kit, { z: -2.2, len: 2.2, x: -2.995 });
  kit.contactShadow({ x: -1.9, z: ZB, w: 2.4, d: 2.5, strength: 0.5, blur: 26 }); kit.contactShadow({ x: -2.7, z: -2.2, w: 1.3, d: 2.2, strength: 0.5, blur: 24 });
  kit.pool(-1.2, 0.005, ZB, 4.0, 0.16);
  const adds = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  adds(soft.filter((x) => x.geo.attributes && x.geo.attributes.position.count > 0), M.fabric); adds(ceramic, M.ceramic); adds(pl.body, M.leaves, false); adds(pl.cards, M.leafCard, false);
  const hwm = new THREE.Mesh(mergeGeometries(hw), METAL); hwm.castShadow = true; lod.detail.add(hwm);
  kit.flushStatics();
  return kit;
}
