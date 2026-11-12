/* Wardrobe: sliding fluted doors, hinged fluted doors, smoked-glass doors in a bronze frame, hanging rails with garments, shelving with folded
 * linen, four pull-out drawers, vertical LED strips that fade up as each section opens. Every opening part is a SEPARATE mesh (kit.js).
 * SAMPLE CONFIGURATION. Garments are plain silhouettes on slim hangers. */
import * as THREE from 'three';
import { bevelBox, placed, prep } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh } from './stage';
import * as pr from './props';

const X0 = -2.8, X1 = -2.18, Z0 = -2.4, Z1 = 2.4, Y0 = 0.06, Y1 = 2.62, T = 0.019;

export function buildWardrobe({ M, tier, registry, reduced }) {
  const kit = createKit({ product: 'wardrobe', M, tier, registry, reduced });
  const { group, lod } = kit, F = M.front.wardrobe, C = M.carcass.wardrobe, METAL = M.metal.wardrobe, fin = bevelBox;
  const cx = (X0 + X1) / 2, d = X1 - X0, H = Y1 - Y0, cy = (Y0 + Y1) / 2;

  // ---- carcass: back, top, bottom, ends and three full-height dividers (static, one draw call) ----
  const shell = [placed(fin(0.018, H, Z1 - Z0, { b: 0.0008, grain: 'y' }), { x: X0 + 0.009, y: cy }), placed(fin(d, 0.02, Z1 - Z0, { b: 0.0008, grain: 'z' }), { x: cx, y: Y1 - 0.01 }), placed(fin(d, 0.02, Z1 - Z0, { b: 0.0008, grain: 'z' }), { x: cx, y: Y0 + 0.01 })];
  for (const z of [Z0 + 0.009, -1.2, 0, 1.2, Z1 - 0.009]) shell.push(placed(fin(d - 0.02, H, 0.018, { b: 0.0008, grain: 'y', off: [z, 0] }), { x: cx - 0.01, y: cy, z }));
  shell.forEach((g) => kit.addStatic(g, C));
  kit.addStatic(placed(fin(d - 0.1, Y0, Z1 - Z0 - 0.1, { b: 0.001 }), { x: cx - 0.04, y: Y0 / 2 }), M.plinth);
  // feature wall behind and either side is the bay's alcove; a stone-coloured cornice line above the wardrobe
  kit.addStatic(placed(fin(0.04, 0.02, Z1 - Z0 + 0.02, { b: 0.001 }), { x: X1 - 0.01, y: Y1 + 0.01 }), METAL);

  // ---- sliding section (z -2.4 .. 0): tracks + two fluted leaves ----
  kit.addStatic(placed(fin(0.07, 0.014, 2.4, { b: 0.001 }), { x: -2.205, y: Y1 - 0.025, z: -1.2 }), METAL);
  kit.addStatic(placed(fin(0.07, 0.01, 2.4, { b: 0.001 }), { x: -2.205, y: Y0 + 0.02, z: -1.2 }), METAL);
  const LH = Y1 - Y0 - 0.06, LY = Y0 + 0.03 + LH / 2;
  const s1 = kit.slider({ id: 'w-slide-1', x: -2.19, y: LY, z: -1.775, w: 1.25, h: LH, t: 0.022, travel: 1.15, fluted: true, grainOff: [0.2, 0.1], frontMat: F, flutedMat: M.flute.wardrobe, metalMat: METAL, pullSign: 1 });
  const s2 = kit.slider({ id: 'w-slide-2', x: -2.222, y: LY, z: -0.625, w: 1.25, h: LH, t: 0.022, travel: -1.15, fluted: true, grainOff: [0.5, 0.7], frontMat: F, flutedMat: M.flute.wardrobe, metalMat: METAL, pullSign: -1 });
  void s1; void s2;

  // interior of the sliding bays: long hang (left) and double hang (right), shelf above, edge-banded
  const hardware = [], soft = [], matte = [], ceramic = [], metalP = [];
  const rail = (y, z0, z1) => hardware.push(prep(placed(new THREE.CylinderGeometry(0.0125, 0.0125, z1 - z0, 12), { x: -2.5, y, z: (z0 + z1) / 2, rx: Math.PI / 2 })), prep(placed(fin(0.04, 0.04, 0.012, { b: 0.001 }), { x: -2.5, y: y + 0.02, z: z0 })), prep(placed(fin(0.04, 0.04, 0.012, { b: 0.001 }), { x: -2.5, y: y + 0.02, z: z1 })));
  rail(2.02, -2.38, -1.22); rail(2.02, -1.18, -0.02); rail(1.08, -1.18, -0.02);
  const shelf = (y, z0, z1, depth = 0.58) => {
    kit.addStatic(placed(fin(depth, 0.022, z1 - z0, { b: 0.001, grain: 'z', off: [y, 0.2] }), { x: X0 + depth / 2 + 0.018, y, z: (z0 + z1) / 2 }), M.interior);
    kit.addStatic(placed(fin(0.004, 0.026, z1 - z0, { b: 0.0006, tile: 0.4 }), { x: X0 + depth + 0.018 + 0.002, y, z: (z0 + z1) / 2 }), M.paintWhite);   // edge banding strip (a different tone, so it reads as banding)
  };
  shelf(2.3, -2.38, -1.22); shelf(2.3, -1.18, -0.02); shelf(0.32, -2.38, -1.22, 0.5);
  // garments: hung perpendicular to the rail, spaced like clothes in a real wardrobe
  const cols = [P.fabricLinen, P.fabricSage, P.fabricClay, P.fabricNavy, P.fabricCream, P.fabricCharcoal, P.fabricBlush];
  const hang = (y, z0, z1, types, seed) => { let z = z0, i = 0; while (z < z1 - 0.03) { const type = types[(i + seed) % types.length]; soft.push(...pr.garment(type, -2.5, y, z, { color: cols[(i * 3 + seed) % cols.length], s: type === 'dress' || type === 'coat' ? 0.8 : 0.82, ry: Math.PI / 2 })); z += 0.062 + (i % 3) * 0.01; i++; } };
  hang(2.0, -2.34, -1.26, ['dress', 'coat', 'dress', 'shirt', 'coat'], 1);
  hang(2.0, -1.14, -0.06, ['shirt', 'shirt', 'knit', 'shirt'], 2); hang(1.06, -1.14, -0.06, ['trousers', 'trousers', 'knit', 'trousers'], 3);
  soft.push(...pr.foldedStack(-2.5, 2.3 + 0.011, -1.85, { n: 4, seed: 2 }), ...pr.foldedStack(-2.5, 2.3 + 0.011, -0.55, { n: 5, seed: 4, w: 0.36 }), ...pr.storageBox(-2.52, 2.3 + 0.011, -0.95, { w: 0.3, h: 0.18, d: 0.3 }), ...pr.storageBox(-2.52, 2.3 + 0.011, -1.45, { w: 0.3, h: 0.22, d: 0.3, color: P.fabricSage }));
  soft.push(...pr.shoe(-2.45, 0.32 + 0.011, -2.3, { ry: Math.PI / 2 }), ...pr.shoe(-2.45, 0.32 + 0.011, -2.2, { ry: Math.PI / 2, color: P.fabricClay }), ...pr.shoe(-2.45, 0.32 + 0.011, -2.05, { ry: Math.PI / 2 }), ...pr.shoe(-2.45, 0.32 + 0.011, -1.95, { ry: Math.PI / 2, color: P.fabricCream }));
  soft.push(...pr.bag(-2.55, 0.011 + Y0, -1.6, { color: P.fabricClay, ry: Math.PI / 2 }), ...pr.bag(-2.55, Y0 + 0.011, -1.9, { color: P.fabricCream, ry: Math.PI / 2, w: 0.34 }));

  // vertical LED strips: they fade up as the sliding doors open (and only while the LED switch is on)
  const slideLevel = (s) => Math.max(s.ledLevel('w-slide-1'), s.ledLevel('w-slide-2'));
  const vstrip = (z, levelOf, face = 1) => kit.led({ x: -2.236, y: cy, z, len: H - 0.1, axis: 'y', thick: 0.012, levelOf, intensity: 1.7, washPlane: { w: H - 0.1, h: 0.56, pos: [-2.52, cy, z + face * 0.012], rot: [0, 0, -Math.PI / 2] } });
  for (const [z, f] of [[Z0 + 0.03, 1], [-1.2 - 0.016, -1], [-1.2 + 0.016, 1], [-0.03, -1]]) vstrip(z, slideLevel, f);

  // ---- hinged section (z 0 .. 1.2) ----
  const hl = kit.hinged({ id: 'w-hinge-l', x: X1 + T / 2, y: LY, z: 0.004, w: 0.594, h: LH, t: T, side: 1, maxDeg: 112, fluted: true, grainOff: [0.3, 0.2], pull: 'finger', frontMat: F, flutedMat: M.flute.wardrobe, metalMat: METAL, hingeMat: M.steel });
  const hr = kit.hinged({ id: 'w-hinge-r', x: X1 + T / 2, y: LY, z: 1.196, w: 0.594, h: LH, t: T, side: -1, maxDeg: 112, fluted: true, grainOff: [0.7, 0.4], pull: 'finger', frontMat: F, flutedMat: M.flute.wardrobe, metalMat: METAL, hingeMat: M.steel });
  registry.register({ id: 'w-hinge-l', product: 'wardrobe', kind: 'door', label: { en: 'Hinged door, left', ar: 'الباب المفصلي (الأيسر)' }, hit: hl.hit, object: hl.group });
  registry.register({ id: 'w-hinge-r', product: 'wardrobe', kind: 'door', label: { en: 'Hinged door, right', ar: 'الباب المفصلي (الأيمن)' }, hit: hr.hit, object: hr.group });
  for (const y of [0.5, 0.9, 1.3, 1.7, 2.1]) shelf(y, 0.02, 1.18);
  [[0.5, 1], [0.9, 2], [1.3, 3], [1.7, 4], [2.1, 5]].forEach(([y, k], i) => {
    soft.push(...pr.foldedStack(-2.5, y + 0.011, 0.32, { n: 3 + (k % 3), seed: k }), ...pr.foldedStack(-2.5, y + 0.011, 0.84, { n: 4 - (k % 2), seed: k + 7 }));
    if (i === 4) soft.push(...pr.storageBox(-2.5, y + 0.011, 0.58, { w: 0.2, h: 0.2, d: 0.28, color: P.fabricSage }));
  });
  const hingeLevel = (s) => Math.max(s.ledLevel('w-hinge-l'), s.ledLevel('w-hinge-r'));
  vstrip(0.03, hingeLevel, 1); vstrip(1.17, hingeLevel, -1);

  // ---- glass + drawer section (z 1.2 .. 2.4) ----
  const gl = kit.hinged({ id: 'w-glass-l', x: X1 + T / 2, y: 1.9, z: 1.204, w: 0.594, h: 1.38, t: T, side: 1, maxDeg: 112, glass: true, pull: 'finger', frontMat: F, metalMat: M.bronze, glassMat: M.glassSmoke, hingeMat: M.steel });
  const gr = kit.hinged({ id: 'w-glass-r', x: X1 + T / 2, y: 1.9, z: 2.396, w: 0.594, h: 1.38, t: T, side: -1, maxDeg: 112, glass: true, pull: 'finger', frontMat: F, metalMat: M.bronze, glassMat: M.glassSmoke, hingeMat: M.steel });
  registry.register({ id: 'w-glass-l', product: 'wardrobe', kind: 'door', label: { en: 'Smoked glass door, left', ar: 'باب الزجاج المدخّن (الأيسر)' }, hit: gl.hit, object: gl.group });
  registry.register({ id: 'w-glass-r', product: 'wardrobe', kind: 'door', label: { en: 'Smoked glass door, right', ar: 'باب الزجاج المدخّن (الأيمن)' }, hit: gr.hit, object: gr.group });
  for (const y of [1.2, 1.55, 1.9, 2.25]) shelf(y, 1.22, 2.38);
  soft.push(...pr.bag(-2.5, 1.211, 1.5, { color: P.fabricClay, ry: Math.PI / 2 }), ...pr.bag(-2.5, 1.211, 1.95, { color: P.fabricNavy, ry: Math.PI / 2, w: 0.26, h: 0.2 }), ...pr.shoe(-2.45, 1.561, 1.5, { ry: Math.PI / 2 }), ...pr.shoe(-2.45, 1.561, 1.7, { ry: Math.PI / 2, color: P.fabricCream }), ...pr.storageBox(-2.5, 1.561, 2.1, { w: 0.3, h: 0.2, d: 0.3 }), ...pr.storageBox(-2.5, 1.911, 1.55, { w: 0.3, h: 0.22, d: 0.3, color: P.fabricSage }), ...pr.bag(-2.5, 1.911, 2.05, { color: P.fabricCharcoal, ry: Math.PI / 2, w: 0.3 }));
  ceramic.push(...pr.vase(-2.5, 2.261, 1.6, { h: 0.28, r: 0.06, color: P.ceramicSand }), ...pr.vase(-2.5, 2.261, 2.1, { h: 0.2, r: 0.05, color: P.ceramicTerra }));
  const glassLevel = (s) => s.accentLevel() * (0.5 + 0.5 * Math.max(s.part('w-glass-l').value, s.part('w-glass-r').value));
  for (const [z, f] of [[1.23, 1], [2.37, -1]]) kit.led({ x: -2.236, y: 1.9, z, len: 1.3, axis: 'y', thick: 0.012, levelOf: glassLevel, washPlane: { w: 1.3, h: 0.56, pos: [-2.52, 1.9, z + f * 0.012], rot: [0, 0, -Math.PI / 2] } });
  const dys = [0.2, 0.466, 0.732, 0.998];
  dys.forEach((y, i) => kit.drawer({ id: 'w-drawer-' + (i + 1), x: X1 + T / 2 - 0.001, y, z: 1.8, w: 1.18, h: 0.258, depth: 0.5, travel: 0.44, grainOff: [0.12 * i, 0.3 + 0.2 * i], frontMat: F, metalMat: METAL, bodyMat: M.interior }));

  // trims: slim bronze reveals between sections (a visible shadow gap) and kick
  for (const z of [0, 1.2]) kit.addStatic(placed(fin(0.006, H - 0.04, 0.008, { b: 0.0006 }), { x: X1 + 0.002, y: cy, z }), METAL);

  // ---- stage ----
  buildCanopy(kit); buildWallWash(kit, { z: 0, len: 6.0 });
  kit.contactShadow({ x: -1.7, z: 0, w: 1.7, d: 5.4, strength: 0.55, blur: 26 });
  kit.pool(-0.9, 0.005, 0, 4.2, 0.18);
  // props on top and beside
  ceramic.push(...pr.vase(-2.5, Y1 + 0.011, -0.8, { h: 0.4, r: 0.09, color: P.ceramicDark }));
  const leaves = [...pr.stems(-2.5, Y1 + 0.011 + 0.2, -0.8, { n: 7, h: 0.55, seed: 11 }), ...pr.plant(-1.8, 0, 2.95, { h: 1.35, leaves: 34, potR: 0.18, seed: 5 })];
  const add = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  add(soft.filter((x) => x.geo.attributes && x.geo.attributes.position.count > 0), M.fabric); add(ceramic, M.ceramic); add(leaves, M.leaves, false); add(metalP, M.propMetal);
  const hw = new THREE.Mesh(mergeGeometries(hardware), METAL); hw.castShadow = true; lod.detail.add(hw);
  kit.flushStatics();
  return kit;
}
