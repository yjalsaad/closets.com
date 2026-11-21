/* Walk-in closet: a shoe wall with four tilting shelves, open hanging sections with garments, two glass display cabinets lit by LED, a full-length mirror
 * and a central island (stone top) with two pull-out accessory trays and four drawers. Every opening part is a separate mesh (kit.js).
 * SAMPLE CONFIGURATION: nothing here is a specification. Product frame: +X toward the visitor, wall at x = -3. */
import * as THREE from 'three';
import { placed, prep, mergeColored } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh } from './stage';
import * as pr from './props';
import * as fu from './furnish';
import * as rl from './reflook';


const { fin } = fu;
const WX0 = -3.0, WX1 = -2.4, Y0 = 0.06, Y1 = 2.62, T = 0.019;

export function buildWalkin({ M, tier, registry, reduced }) {
  const kit = createKit({ product: 'walkin', M, tier, registry, reduced });
  const { group, lod } = kit, F = M.front.walkin, C = M.carcass.walkin, METAL = M.metal.walkin, UP = M.uphol.walkin, STONE = M.stones.walkin;
  const add = (list, mat) => list.forEach((g) => kit.addStatic(g, mat));
  const hw = [], soft = [], ceramic = [], board = [], band = [], H = Y1 - Y0;
  kit.floor();
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.3), M.travertine); w.position.set(-2.995, 1.65, 0); w.rotation.y = Math.PI / 2; w.receiveShadow = true; group.add(w); }
  add(fu.shell({ x0: WX0, x1: WX1, y0: Y0, y1: Y1, z0: -3.25, z1: 3.25, divs: [-1.55, -0.18, 0.78, 1.72] }), C);
  kit.addStatic(placed(fin(WX1 - WX0 - 0.1, Y0, 6.4, { b: 0.001 }), { x: -2.72, y: Y0 / 2 }), M.plinth);
  kit.addStatic(placed(fin(0.04, 0.02, 6.5, { b: 0.001 }), { x: WX1 - 0.01, y: Y1 + 0.01 }), METAL);

  // ---- shoe wall: four tilting shelves (stored shoes ride on the inner face), open shelves above ----
  const SZ0 = -3.25, SZ1 = -1.55, SZc = (SZ0 + SZ1) / 2, TH = 0.36;
  [0.12, 0.52, 0.92, 1.32].forEach((y, i) => {
    const id = 'wi-shoe-' + (4 - i), tl = kit.tilt({ id, x: WX1 + 0.012, y, z: SZc, w: SZ1 - SZ0 - 0.04, h: TH, t: 0.022, maxDeg: 62, grainOff: [0.2 * i, 0.4], frontMat: F, metalMat: METAL });
    const items = []; for (let k = 0; k < 4; k++) for (const s of [-1, 1]) for (const it of pr.shoe(0, 0, 0, { color: [P.fabricCharcoal, P.fabricClay, P.fabricCream, P.fabricNavy, P.fabricSage][(k + i * 2 + (s > 0 ? 1 : 0)) % 5] })) { it.geo = placed(it.geo, { rz: Math.PI / 2 }); it.geo.translate(-0.011 - 0.002, 0.21, -0.7 + k * 0.42 + s * 0.065 + 0.06); items.push(it); }
    const m = propMesh(items, M.fabric, { cast: false }); m.matrixAutoUpdate = true; tl.group.add(m); tl.group.userData.inner.push(m);
    kit.addStatic(placed(fin(0.5, 0.02, SZ1 - SZ0 - 0.05, { b: 0.001, grain: 'z' }), { x: -2.7, y: y + 0.0 }), M.interior);
  });
  for (const y of [1.78, 2.2]) fu.shelf(WX0, 0.52, y, SZ0 + 0.02, SZ1 - 0.02, { board, band });
  for (const y of [1.78, 2.2]) for (let k = 0; k < 5; k++) soft.push(...pr.shoe(-2.62, y + 0.011, SZ0 + 0.22 + k * 0.33, { ry: Math.PI / 2, color: [P.fabricCharcoal, P.fabricClay, P.fabricCream, P.fabricNavy, P.fabricSage][(k + (y > 2 ? 2 : 0)) % 5] }));
  soft.push(...pr.bag(-2.62, 2.211, SZ0 + 0.22, { color: P.fabricCream, ry: Math.PI / 2, w: 0.3, h: 0.2 }));
  kit.led({ x: -2.43, y: (Y0 + Y1) / 2, z: SZ1 + 0.01, len: H - 0.1, axis: 'y', thick: 0.012, levelOf: (s) => s.accentLevel(), intensity: 1.4, washPlane: { w: H - 0.1, h: 0.5, pos: [-2.7, (Y0 + Y1) / 2, SZ1 + 0.02], rot: [0, 0, -Math.PI / 2] } });
  kit.led({ x: -2.43, y: (Y0 + Y1) / 2, z: SZ0 + 0.03, len: H - 0.1, axis: 'y', thick: 0.012, levelOf: (s) => s.accentLevel() });

  // ---- open hanging section (double hang) ----
  fu.rail(hw, -2.7, 2.02, -1.5, -0.22); fu.rail(hw, -2.7, 1.08, -1.5, -0.22);
  fu.hang(soft, -2.7, 2.0, -1.5, -0.24, ['shirt', 'dress', 'coat', 'shirt'], 2); fu.hang(soft, -2.7, 1.06, -1.5, -0.24, ['trousers', 'knit', 'trousers', 'shirt'], 5);
  fu.shelf(WX0, 0.58, 2.3, -1.52, -0.2, { board, band }); fu.shelf(WX0, 0.58, 0.32, -1.52, -0.2, { board, band });
  soft.push(...pr.foldedStack(-2.7, 2.311, -1.1, { n: 5, seed: 3, w: 0.36 }), ...pr.foldedStack(-2.7, 0.331, -0.9, { n: 4, seed: 6 }), ...pr.storageBox(-2.7, 2.311, -0.5, { w: 0.3, h: 0.2, d: 0.3, color: P.fabricSage }));
  kit.led({ x: -2.43, y: (Y0 + Y1) / 2, z: -0.19, len: H - 0.1, axis: 'y', thick: 0.012, levelOf: (s) => s.accentLevel(), washPlane: { w: H - 0.1, h: 0.5, pos: [-2.7, (Y0 + Y1) / 2, -0.2], rot: [0, 0, -Math.PI / 2] } });

  // ---- glass display cabinets (two double-door cabinets, shelves of glass with LED) ----
  const GY0 = 0.2, GY1 = 2.5, GH = GY1 - GY0, GYc = (GY0 + GY1) / 2, dopts = { y: GYc, h: GH - 0.04, t: T, w: 0.435, maxDeg: 110, glass: true, frontMat: F, metalMat: M.bronze, glassMat: M.glassClear, hingeMat: M.steel };
  kit.doorPair({ id: 'wi-glass-a', x: WX1 + T / 2, z0: -0.17, z1: 0.77, ...dopts }); kit.doorPair({ id: 'wi-glass-b', x: WX1 + T / 2, z0: 0.8, z1: 1.7, ...dopts, w: 0.425 });
  const shelfGlass = new THREE.MeshStandardMaterial({ color: P.glass, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false, envMap: M.stone.envMap, envMapIntensity: 1.2 });
  const gs = []; for (const [z0, z1] of [[-0.16, 0.76], [0.81, 1.71]]) for (const y of [0.75, 1.3, 1.85]) gs.push(prep(placed(fin(0.5, 0.012, z1 - z0, { b: 0.002 }), { x: -2.72, y, z: (z0 + z1) / 2 })));
  kit.mesh(mergeGeometries(gs), shelfGlass, { cast: false, parent: lod.detail });
  for (const [z0, z1] of [[-0.16, 0.76], [0.81, 1.71]]) {
    for (const y of [0.75, 1.3, 1.85, 2.45]) kit.led({ x: -2.5, y: y - 0.01, z: (z0 + z1) / 2, len: z1 - z0 - 0.06, axis: 'z', thick: 0.012, levelOf: (s) => 0.8 * s.accentLevel(), intensity: 0.8 });
    const zc = (z0 + z1) / 2;
    soft.push(...pr.bag(-2.7, 0.761, zc - 0.2, { color: P.fabricClay, ry: Math.PI / 2, w: 0.3 }), ...pr.bag(-2.7, 0.761, zc + 0.22, { color: P.fabricCharcoal, ry: Math.PI / 2, w: 0.28, h: 0.2 }), ...pr.shoe(-2.7, 1.321, zc - 0.2, { ry: Math.PI / 2, color: P.fabricCream }), ...pr.shoe(-2.7, 1.321, zc + 0.05, { ry: Math.PI / 2, color: P.fabricNavy }), ...pr.bag(-2.7, 1.871, zc, { color: P.fabricSage, ry: Math.PI / 2, w: 0.28 }));
    ceramic.push(...pr.vase(-2.7, 1.316, zc + 0.28, { h: 0.2, r: 0.04, color: P.ceramicTerra }), ...pr.vase(-2.7, 0.756 + 0.0, zc, { h: 0.0001, r: 0.001 }));
  }
  // ---- mirror + ottoman ----
  // reference look: a floating deep-green marble vanity (slab + upstand) under a round mirror in a brass ring
  kit.addStatic(placed(fin(0.56, 0.09, 1.42, { b: 0.006, tile: 1.2 }), { x: -2.69, y: 0.84, z: 2.5 }), M.greenMarble);
  kit.addStatic(placed(fin(0.03, 0.36, 1.42, { b: 0.003, tile: 1.2 }), { x: -2.955, y: 1.065, z: 2.5 }), M.greenMarble);
  { const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 56), M.mirror); m.position.set(-2.93, 1.8, 2.5); m.rotation.y = Math.PI / 2; m.name = 'mirror'; group.add(m); }
  kit.mesh(prep(placed(new THREE.TorusGeometry(0.506, 0.014, 10, 64), { x: -2.93, y: 1.8, z: 2.5, ry: Math.PI / 2 })), METAL, { cast: false });
  ceramic.push(...fu.bottle(-2.72, 0.886, 2.12), ...fu.bottle(-2.78, 0.886, 2.24, { h: 0.1, color: P.ceramicSand }), ...fu.trayOf(-2.66, 0.886, 2.82, { w: 0.36, d: 0.22 }), ...pr.candle(-2.66, 0.898, 2.78));
  // vertical LED edge strips on the glass-fronted cabinets
  for (const z of [-0.145, 0.745, 0.825, 1.685]) kit.led({ x: -2.43, y: 1.35, z, len: 2.2, axis: 'y', thick: 0.01, levelOf: (st) => st.accentLevel(), intensity: 1.2 });
  kit.led({ x: -2.975, y: 1.25, z: 3.06, len: 2.1, axis: 'y', thick: 0.01, levelOf: (s) => s.accentLevel(), washPlane: { w: 2.1, h: 0.6, pos: [-2.9, 1.25, 3.0], rot: [0, 0, -Math.PI / 2] } });
  kit.led({ x: -2.975, y: 1.25, z: 1.94, len: 2.1, axis: 'y', thick: 0.01, levelOf: (s) => s.accentLevel() });
  { const p = fu.pouf({ x: -1.9, z: 2.5, r: 0.28, h: 0.42 }); add(p.soft, UP); add(p.hard, M.plinth); }
  add(board, M.interior); add(band, M.paintWhite);

  // ---- island: carcass, stone top, two accessory trays and four drawers on the visitor side ----
  const IX0 = -1.6, IX1 = -0.58, IZ = 1.0, IY = 0.9;
  add(fu.shell({ x0: IX0, x1: IX1, y0: 0.1, y1: IY, z0: -IZ, z1: IZ, divs: [0] }), C);
  kit.addStatic(placed(fin(IX1 - IX0 - 0.1, 0.1, 2 * IZ - 0.1, { b: 0.001 }), { x: (IX0 + IX1) / 2 - 0.02, y: 0.05 }), M.plinth);
  kit.addStatic(placed(fin(IX1 - IX0 + 0.08, 0.04, 2 * IZ + 0.08, { b: 0.003, tile: 1.4 }), { x: (IX0 + IX1) / 2 + 0.02, y: IY + 0.02 }), STONE);
  const fx = IX1 + T / 2 - 0.001, dw = IZ - 0.03;
  const trays = [];
  [[-0.5, 'wi-tray-1'], [0.5, 'wi-tray-2']].forEach(([z, id], i) => {
    const g = kit.drawer({ id, x: fx, y: 0.835, z, w: dw, h: 0.1, depth: 0.5, travel: 0.42, grainOff: [0.3 * i, 0.5], frontMat: F, metalMat: METAL, bodyMat: M.interior, organiser: false });
    const it = [{ geo: placed(fin(0.46, 0.02, dw - 0.08, { b: 0.004 }), { x: -0.27, y: -0.03 }), color: P.velvetDark }];
    for (let k = 0; k < 4; k++) it.push({ geo: placed(fin(0.07, 0.03, 0.09, { b: 0.012 }), { x: -0.12 - (k % 2) * 0.12, y: -0.012, z: -0.3 + k * 0.2 }), color: P.velvetWine }, { geo: placed(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20), { x: -0.38, y: -0.016, z: -0.3 + k * 0.2 }), color: [P.brassPale, P.steelPot][k % 2] });
    const m = propMesh(it, M.fabric, { cast: false }); m.matrixAutoUpdate = true; g.add(m); g.userData.inner.push(m); trays.push(g);
  });
  [['wi-isl-1', 0.62, -0.5], ['wi-isl-2', 0.62, 0.5], ['wi-isl-3', 0.35, -0.5], ['wi-isl-4', 0.35, 0.5]].forEach(([id, y, z], i) => kit.drawer({ id, x: fx, y, z, w: dw, h: 0.255, depth: 0.5, travel: 0.46, grainOff: [0.2 * i, 0.1], frontMat: F, metalMat: METAL, bodyMat: M.interior }));
  kit.led({ x: IX1 - 0.04, y: 0.098, z: 0, len: 1.9, axis: 'z', thick: 0.012, levelOf: (s) => 0.7 * s.accentLevel(), washPlane: { w: 1.9, h: 0.6, pos: [IX1 + 0.27, 0.006, 0], rot: [-Math.PI / 2, 0, Math.PI / 2] } });
  // pendant bar over the island
  kit.mesh(prep(placed(fin(0.06, 0.04, 1.6, { b: 0.006 }), { x: -1.1, y: 2.2 })), METAL, { cast: false });
  { const lens = M.ledWarm(); lens.color.multiplyScalar(0.9); kit.mesh(prep(placed(fin(0.03, 0.006, 1.5, { b: 0.001 }), { x: -1.1, y: 2.178 })), lens, { cast: false }); const wr = []; for (const z of [-0.7, 0.7]) wr.push(prep(placed(new THREE.CylinderGeometry(0.003, 0.003, 3.3 - 2.22, 5), { x: -1.1, y: (3.3 + 2.22) / 2, z }))); kit.mesh(mergeGeometries(wr), METAL, { cast: false }); }
  ceramic.push(...pr.vase(-1.05, IY + 0.04, -0.7, { h: 0.26, r: 0.05, color: P.ceramicDark }), ...fu.bottle(-1.1, IY + 0.04, 0.55), ...fu.bottle(-1.2, IY + 0.04, 0.68, { h: 0.1, color: P.ceramicSand }));
  { const wc = []; for (let k = 0; k < 4; k++) wc.push({ geo: placed(fin(0.1, 0.05, 0.1, { b: 0.02 }), { x: -1.0 + (k % 2) * 0.12, y: IY + 0.065, z: -0.1 + k * 0.1 - (k % 2) * 0.01 }), color: P.velvetDark }, { geo: placed(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 18), { x: -1.0 + (k % 2) * 0.12, y: IY + 0.095, z: -0.1 + k * 0.1 - (k % 2) * 0.01 }), color: P.brassPale }); lod.props.add(propMesh(wc, M.fabric, { cast: false })); }

  const pl = rl.tree(-0.2, -3.0, { h: 2.2, seed: 8, potR: 0.26 });
  { const rug = new THREE.Mesh(rl.organicRug(3.68, 2.83, 29), M.rugSoft); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.0, 0.0125, 0); rug.receiveShadow = true; lod.props.add(rug); }
  kit.ao([-2.99, 3.05, 0], [0, 0, 1], [0, 1, 0], 6.2, 0.9, '+v', 0.3); kit.ao([-2.38, 0.012, 0], [0, 0, 1], [1, 0, 0], 6.4, 0.3, '-v', 0.3);
  buildCanopy(kit, { downlights: [[-1.8, -2.2], [-1.8, 0], [-1.8, 2.2], [0.9, -2.2], [0.9, 0], [0.9, 2.2]] }); buildWallWash(kit, { z: 0, len: 6.2, x: -2.995 });
  kit.contactShadow({ x: -1.1, z: 0, w: 1.5, d: 2.3, strength: 0.55, blur: 26 }); kit.contactShadow({ x: -2.6, z: 0, w: 0.9, d: 6.4, strength: 0.45, blur: 24 });
  kit.pool(-1.2, 0.005, 0, 4.0, 0.16);
  const adds = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  adds(soft.filter((x) => x.geo.attributes && x.geo.attributes.position.count > 0), M.fabric); adds(ceramic.filter((x) => x.geo.attributes.position.count > 0 && x.geo.boundingBox !== 0), M.ceramic); adds(pl.body, M.leaves, false); adds(pl.cards, M.leafCard, false);
  const hwm = new THREE.Mesh(mergeGeometries(hw), METAL); hwm.castShadow = true; lod.detail.add(hwm);
  kit.flushStatics();
  return kit;
}
