/* Custom Design Studio: a consultation wall with a large material-and-finish sample board (the static swatches of the kitchen, wardrobe and door finish
 * systems + the three stones), a sample chest of three drawers, two sliding sample-rail panels, a wall screen introducing the EXISTING Design Studio
 * (/studio; the panel carries the link), and a design table with chairs, plan, tablet and a linear pendant. SAMPLE CONFIGURATION. */
import * as THREE from 'three';
import { placed, prep } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { finishList } from '../../products/finishes';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh } from './stage';
import { swatchMaterial } from './materials';
import { makePanel, drawStudioScreen, planPaperTexture } from './screens';
import * as pr from './props';
import * as fu from './furnish';

const { fin } = fu;
const T = 0.019, Y0 = 0.06;

export function buildStudio({ M, tier, registry, reduced, lang = 'en' }) {
  const kit = createKit({ product: 'studio', M, tier, registry, reduced });
  const { group, lod } = kit, F = M.front.studio, C = M.carcass.studio, METAL = M.metal.studio, UP = M.uphol.studio, STONE = M.stones.studio;
  const add = (list, mat) => list.forEach((g) => kit.addStatic(g, mat));
  const soft = [], ceramic = [];
  kit.floor();
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.3), M.plaster); w.position.set(-2.995, 1.65, 0); w.rotation.y = Math.PI / 2; w.receiveShadow = true; group.add(w); }

  // ---- sample board: backing panel + 3 rows x 5 columns of static swatches (never swapped, so each always matches its label) ----
  const BZ0 = -3.25, BZ1 = -0.75, BY0 = 1.0, BY1 = 2.6, cols = 5, rows = 3, tw = (BZ1 - BZ0) / cols, th = (BY1 - BY0) / rows;
  kit.addStatic(placed(fin(0.03, BY1 - BY0 + 0.1, BZ1 - BZ0 + 0.1, { b: 0.004 }), { x: -2.965, y: (BY0 + BY1) / 2, z: (BZ0 + BZ1) / 2 }), M.plinth);
  const mats = new Map(), tiles = new Map(); const key = (spec) => spec.kind + (spec.tone || 0) + spec.color;
  const swatch = (product, f) => { const spec = product === 'door' ? f.leaf : f.front, k = key(spec); if (!mats.has(k)) mats.set(k, swatchMaterial(M, product, f.id)); return mats.get(k); };
  const stoneMat = (v) => { const k = 'stone' + v; if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ map: M.tex.marble[v].map, roughness: 0.2, envMap: M.stone.envMap, envMapIntensity: 0.8 })); return mats.get(k); };
  [['kitchen', 'white'], ['wardrobe', 'dark'], ['door', 'sand']].forEach(([prod, stone], r) => {
    const list = [...finishList(prod).map((f) => swatch(prod, f)), stoneMat(stone)];
    list.forEach((mat, c) => { if (!tiles.has(mat)) tiles.set(mat, []); tiles.get(mat).push(prep(placed(fin(0.016, th - 0.07, tw - 0.07, { b: 0.0015, grain: 'y', off: [c * 0.2, r * 0.3] }), { x: -2.935, y: BY1 - th * (r + 0.5), z: BZ0 + tw * (c + 0.5) }))); });
  });
  for (const [mat, list] of tiles) kit.mesh(mergeGeometries(list), mat, { cast: false });
  for (let r = 1; r < rows; r++) kit.addStatic(placed(fin(0.02, 0.008, BZ1 - BZ0, { b: 0.0008 }), { x: -2.94, y: BY1 - th * r }), M.brass);
  kit.led({ x: -2.9, y: BY1 + 0.06, z: (BZ0 + BZ1) / 2, len: BZ1 - BZ0, axis: 'z', thick: 0.012, levelOf: (s) => s.accentLevel(), washPlane: { w: BZ1 - BZ0, h: 1.5, pos: [-2.945, BY1 - 0.75, (BZ0 + BZ1) / 2], rot: [0, Math.PI / 2, 0] } });

  // ---- sample chest under the board: three drawers (swatch chips inside) ----
  add(fu.shell({ x0: -3.0, x1: -2.55, y0: Y0, y1: 0.92, z0: BZ0, z1: BZ1 }), C); kit.addStatic(placed(fin(0.48, 0.035, BZ1 - BZ0 + 0.02, { b: 0.004, tile: 1.4 }), { x: -2.76, y: 0.9375 }), STONE);
  kit.addStatic(placed(fin(0.4, Y0, BZ1 - BZ0 - 0.1, { b: 0.001 }), { x: -2.78, y: Y0 / 2 }), M.plinth);
  [['st-sample-1', 0.77], ['st-sample-2', 0.5], ['st-sample-3', 0.23]].forEach(([id, y], i) => {
    const g = kit.drawer({ id, x: -2.55 + T / 2 - 0.001, y, z: (BZ0 + BZ1) / 2, w: BZ1 - BZ0 - 0.04, h: 0.25, depth: 0.4, travel: 0.36, grainOff: [0.25 * i, 0.2], frontMat: F, metalMat: METAL, bodyMat: M.interior, organiser: false });
    const chips = [], cc = [P.oakLight, P.walnutDeep, P.lacquerSage, P.lacquerStone, P.lacquerClay, P.lacquerCharcoal, P.fabricNavy, P.fabricBlush];
    for (let k = 0; k < 8; k++) chips.push({ geo: placed(fin(0.12, 0.012, 0.22, { b: 0.002 }), { x: -0.1 - (k % 3) * 0.13, y: -0.07 + (k % 3) * 0.004, z: -0.95 + k * 0.27 }), color: cc[(k + i * 3) % cc.length] });
    const m = propMesh(chips, M.matte, { cast: false }); m.matrixAutoUpdate = true; g.add(m); g.userData.inner.push(m);
  });

  // ---- sample rail: a hanging swatch strip rack with two sliding panels ----
  const RZ0 = -0.3, RZ1 = 1.1, RY = 1.45, RH = 1.9;
  kit.addStatic(placed(fin(0.03, RH + 0.1, RZ1 - RZ0 + 0.1, { b: 0.004 }), { x: -2.965, y: RY, z: (RZ0 + RZ1) / 2 }), M.plinth);
  { const strips = [], cc = [P.oakLight, P.walnutDeep, P.lacquerSage, P.lacquerIvory, P.lacquerClay, P.lacquerCharcoal, P.fabricNavy, P.fabricBlush, P.oakPale, P.smokedOak]; for (let k = 0; k < 10; k++) for (let j = 0; j < 4; j++) strips.push({ geo: placed(fin(0.014, 0.4, 0.1, { b: 0.002 }), { x: -2.935, y: RY + 0.68 - j * 0.45, z: RZ0 + 0.09 + k * 0.13 }), color: cc[(k * 3 + j) % cc.length] }); group.add(propMesh(strips, M.matte, { cast: false })); }
  kit.addStatic(placed(fin(0.05, 0.02, RZ1 - RZ0 + 0.7, { b: 0.001 }), { x: -2.9, y: RY + RH / 2 + 0.02, z: (RZ0 + RZ1) / 2 }), METAL); kit.addStatic(placed(fin(0.05, 0.02, RZ1 - RZ0 + 0.7, { b: 0.001 }), { x: -2.9, y: RY - RH / 2 - 0.02, z: (RZ0 + RZ1) / 2 }), METAL);
  kit.slider({ id: 'st-rail-1', x: -2.85, y: RY, z: RZ0 + 0.36, w: 0.72, h: RH, t: 0.022, travel: -0.62, grainOff: [0.2, 0.1], frontMat: F, metalMat: METAL, pullSign: 1 });
  kit.slider({ id: 'st-rail-2', x: -2.88, y: RY, z: RZ1 - 0.36, w: 0.72, h: RH, t: 0.022, travel: 0.62, grainOff: [0.5, 0.7], frontMat: F, metalMat: METAL, pullSign: -1 });
  kit.led({ x: -2.92, y: RY + RH / 2 + 0.05, z: (RZ0 + RZ1) / 2, len: RZ1 - RZ0, axis: 'z', thick: 0.01, levelOf: (s) => Math.max(s.ledLevel('st-rail-1'), s.ledLevel('st-rail-2')), washPlane: { w: RZ1 - RZ0, h: RH, pos: [-2.94, RY, (RZ0 + RZ1) / 2], rot: [0, Math.PI / 2, 0] } });

  // ---- wall screen: the existing Design Studio entry ----
  const scr = makePanel(1024, 576, drawStudioScreen, lang);
  kit.addStatic(placed(fin(0.04, 1.06, 1.84, { b: 0.004 }), { x: -2.955, y: 1.55, z: 2.5 }), M.darkInterior);
  { const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.99), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false })); sm.position.set(-2.932, 1.55, 2.5); sm.rotation.y = Math.PI / 2; sm.name = 'studio-screen'; group.add(sm); }
  kit.led({ x: -2.95, y: 1.55, z: 2.5, len: 1.7, axis: 'z', thick: 0.01, levelOf: (s) => s.accentLevel(), washPlane: { w: 2.8, h: 1.9, pos: [-2.97, 1.55, 2.5], rot: [0, Math.PI / 2, 0] } });
  kit.relabel = (l) => scr.redraw(l);

  // ---- design table: stone top on two trestle slabs, apron with two drawers, chairs, plan, tablet, pendant ----
  const TX0 = -1.5, TX1 = -0.5, TZ0 = -1.15, TZ1 = 1.35, TZc = (TZ0 + TZ1) / 2, TH = 0.76;
  kit.addStatic(placed(fin(TX1 - TX0 + 0.08, 0.04, TZ1 - TZ0 + 0.1, { b: 0.004, tile: 1.4 }), { x: (TX0 + TX1) / 2, y: TH - 0.02, z: TZc }), STONE);
  for (const z of [TZ0 + 0.06, TZ1 - 0.06]) kit.addStatic(placed(fin(TX1 - TX0 - 0.1, TH - 0.04, 0.05, { b: 0.004, grain: 'y' }), { x: (TX0 + TX1) / 2, y: (TH - 0.04) / 2, z }), F);
  add(fu.shell({ x0: TX0 + 0.05, x1: TX1 - 0.03, y0: 0.58, y1: 0.72, z0: TZ0 + 0.09, z1: TZ1 - 0.09 }), C);
  [['st-table-1', TZc - 0.62], ['st-table-2', TZc + 0.62]].forEach(([id, z], i) => kit.drawer({ id, x: TX1 - 0.03 + T / 2 - 0.001, y: 0.65, z, w: 1.1, h: 0.13, depth: 0.4, travel: 0.36, grainOff: [0.3 * i, 0.6], frontMat: F, metalMat: METAL, bodyMat: M.interior, organiser: false }));
  for (const [x, z, ry] of [[-0.05, 0.0, Math.PI], [-0.05, 0.9, Math.PI], [-1.95, 0.0, 0], [-1.95, 0.9, 0]]) { const c = fu.chair({ x, z, ry }); add(c.soft, UP); add(c.hard, METAL); }
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44), new THREE.MeshStandardMaterial({ map: planPaperTexture(), roughness: 0.9 })); plan.rotation.set(-Math.PI / 2, 0, Math.PI / 2); plan.position.set(-1.0, TH + 0.003, TZc - 0.4); plan.receiveShadow = true; lod.props.add(plan);
  kit.addStatic(placed(fin(0.2, 0.01, 0.28, { b: 0.003 }), { x: -0.8, y: TH + 0.005, z: TZc + 0.55, ry: 0.15 }), M.darkInterior);
  { const sw = []; for (let k = 0; k < 6; k++) sw.push({ geo: placed(fin(0.2, 0.006, 0.05, { b: 0.001 }), { x: -1.2, y: TH + 0.004 + k * 0.0015, z: TZc + 0.05, ry: -0.5 + k * 0.17 }), color: [P.oakLight, P.walnutDeep, P.lacquerSage, P.lacquerClay, P.lacquerStone, P.lacquerIvory][k] }); soft.push(...sw); }
  ceramic.push(...pr.mug(-0.7, TH + 0.002, TZc - 0.9, { color: P.ceramicTerra }), ...pr.utensilCrock(-1.3, TH + 0.002, TZc + 0.95)); soft.push(...pr.books(-1.35, TH + 0.002, TZc - 0.95, { n: 3, seed: 4 }));
  kit.mesh(prep(placed(fin(0.08, 0.04, 2.0, { b: 0.006 }), { x: -1.0, y: 2.1, z: TZc })), METAL, { cast: false });
  { const lens = M.ledWarm(); kit.mesh(prep(placed(fin(0.05, 0.006, 1.9, { b: 0.001 }), { x: -1.0, y: 2.077, z: TZc })), lens, { cast: false }); const wr = []; for (const z of [TZc - 0.8, TZc + 0.8]) wr.push(prep(placed(new THREE.CylinderGeometry(0.003, 0.003, 3.3 - 2.12, 5), { x: -1.0, y: (3.3 + 2.12) / 2, z }))); kit.mesh(mergeGeometries(wr), METAL, { cast: false }); }
  { const pl = pr.plant(-0.4, 0, -2.6, { h: 1.5, leaves: 46, potR: 0.18, seed: 17 }); lod.props.add(propMesh(pl.body, M.leaves, { cast: false }), propMesh(pl.cards, M.leafCard, { cast: false })); }
  { const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.2), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.0, 0.0125, TZc); rug.receiveShadow = true; lod.props.add(rug); }
  kit.ao([-2.99, 3.05, 0], [0, 0, 1], [0, 1, 0], 6.2, 0.9, '+v', 0.3); kit.ao([-2.5, 0.011, -2.0], [0, 0, 1], [1, 0, 0], 2.5, 0.3, '-v', 0.35);
  buildCanopy(kit, { downlights: [[-1.8, -2.0], [-1.8, 0.2], [-1.8, 2.2], [0.9, -2.0], [0.9, 0.2], [0.9, 2.2]] }); buildWallWash(kit, { z: 0, len: 6.2, x: -2.995 });
  kit.contactShadow({ x: -1.0, z: TZc, w: 1.3, d: 2.7, strength: 0.5, blur: 26 });
  kit.pool(-1.2, 0.005, 0.3, 4.2, 0.15);
  const adds = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  adds(soft.filter((x) => x.geo.attributes && x.geo.attributes.position.count > 0), M.fabric); adds(ceramic, M.ceramic);
  kit.flushStatics();
  return kit;
}
