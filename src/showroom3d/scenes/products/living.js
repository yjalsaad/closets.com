/* Living: a media wall. Fluted wall panel with LED backlight, a floating TV unit (two double-door sections + two drawers under the TV), a tall closed
 * cabinet and a tall glass display cabinet, floating shelves, and a styled lounge (sofa, two armchairs, coffee table, console with a drawer, rug, lamp, plant).
 * SAMPLE CONFIGURATION. The TV is a dark, idle screen: no content is shown. Product frame: +X toward the visitor, wall at x = -3. */
import * as THREE from 'three';
import { flutedPanel, placed, prep, mergeColored } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P, hex } from '../../3d/palette';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh } from './stage';
import * as pr from './props';
import * as fu from './furnish';

const { fin } = fu;
const T = 0.019, Y0 = 0.06, Y1 = 2.62;

function screenTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 288); gr.addColorStop(0, hex(P.screenDark)); gr.addColorStop(0.55, hex(P.charcoal)); gr.addColorStop(1, hex(P.screenDark)); g.fillStyle = gr; g.fillRect(0, 0, 512, 288);
  const glow = g.createRadialGradient(360, 90, 4, 360, 90, 220); glow.addColorStop(0, 'rgba(120,150,175,0.20)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, 512, 288);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildLiving({ M, tier, registry, reduced }) {
  const kit = createKit({ product: 'living', M, tier, registry, reduced });
  const { group, lod } = kit, F = M.front.living, C = M.carcass.living, METAL = M.metal.living, UP = M.uphol.living, FL = M.flute.living;
  const add = (list, mat) => list.forEach((g) => kit.addStatic(g, mat));
  const soft = [], ceramic = [], hw = [];
  kit.floor();
  // ---- slat wall panel (real geometry) + TV ----
  { const wall = new THREE.Mesh(flutedPanel(6.2, 3.3, 0.04, { pitch: 0.05, relief: 0.014, off: [0.2, 0.1] }).rotateY(Math.PI / 2), FL); wall.position.set(-2.96, 1.65, 0); wall.receiveShadow = true; wall.name = 'feature-wall'; group.add(wall); }
  kit.addStatic(placed(fin(0.03, 1.0, 1.74, { b: 0.004 }), { x: -2.905, y: 1.5 }), M.darkInterior);
  { const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.956), new THREE.MeshStandardMaterial({ map: screenTexture(), roughness: 0.62, metalness: 0, envMap: M.stone.envMap, envMapIntensity: 0.4 })); sc.position.set(-2.888, 1.5, 0); sc.rotation.y = Math.PI / 2; sc.name = 'tv-screen'; group.add(sc); }
  kit.led({ x: -2.93, y: 1.5, z: 0.9, len: 1.0, axis: 'y', thick: 0.01, levelOf: (s) => s.accentLevel(), washPlane: { w: 2.6, h: 1.8, pos: [-2.935, 1.5, 0], rot: [0, Math.PI / 2, 0] } });
  kit.led({ x: -2.93, y: 1.5, z: -0.9, len: 1.0, axis: 'y', thick: 0.01, levelOf: (s) => s.accentLevel() });

  // ---- floating TV unit ----
  const UX1 = -2.52, UY0 = 0.2, UY1 = 0.66, dop = { y: (UY0 + UY1) / 2 + 0.002, h: UY1 - UY0 - 0.012, t: T, w: 0.545, maxDeg: 108, frontMat: F, metalMat: METAL, hingeMat: M.steel };
  add(fu.shell({ x0: -3.0, x1: UX1, y0: UY0, y1: UY1, z0: -1.7, z1: 1.7, divs: [-0.6, 0.6] }), C);
  kit.addStatic(placed(fin(0.5, 0.03, 3.44, { b: 0.004, grain: 'z' }), { x: -2.76, y: UY1 + 0.015 }), F);
  kit.doorPair({ id: 'lv-base-l', x: UX1 + T / 2, z0: -1.695, z1: -0.605, grainOff: [0.2, 0.3], ...dop });
  kit.doorPair({ id: 'lv-base-r', x: UX1 + T / 2, z0: 0.605, z1: 1.695, grainOff: [0.6, 0.1], ...dop });
  [['lv-drawer-1', 0.545], ['lv-drawer-2', 0.34]].forEach(([id, y], i) => kit.drawer({ id, x: UX1 + T / 2 - 0.001, y, z: 0, w: 1.17, h: 0.2, depth: 0.4, travel: 0.36, grainOff: [0.3 * i, 0.5], frontMat: F, metalMat: METAL, bodyMat: M.interior }));
  kit.led({ x: -2.6, y: 0.198, z: 0, len: 3.3, axis: 'z', thick: 0.012, levelOf: (s) => 0.8 * s.accentLevel(), washPlane: { w: 3.4, h: 0.7, pos: [-2.2, 0.006, 0], rot: [-Math.PI / 2, 0, Math.PI / 2] } });

  // ---- tall cabinets: closed (left), smoked glass display with LED (right) ----
  add(fu.shell({ x0: -3.0, x1: -2.4, y0: Y0, y1: Y1, z0: -3.25, z1: -1.85, divs: [] }), C); add(fu.shell({ x0: -3.0, x1: -2.4, y0: Y0, y1: Y1, z0: 1.85, z1: 3.25, divs: [] }), C);
  kit.addStatic(placed(fin(0.5, Y0, 2.9, { b: 0.001 }), { x: -2.72, y: Y0 / 2, z: -2.55 }), M.plinth); kit.addStatic(placed(fin(0.5, Y0, 2.9, { b: 0.001 }), { x: -2.72, y: Y0 / 2, z: 2.55 }), M.plinth);
  const LH = Y1 - Y0 - 0.06, LY = Y0 + 0.03 + LH / 2;
  kit.doorPair({ id: 'lv-tall-l', x: -2.4 + T / 2, y: LY, z0: -3.245, z1: -1.855, w: 0.695, h: LH, t: T, maxDeg: 108, fluted: true, grainOff: [0.4, 0.2], frontMat: F, flutedMat: FL, metalMat: METAL, hingeMat: M.steel });
  kit.doorPair({ id: 'lv-tall-r', x: -2.4 + T / 2, y: LY, z0: 1.855, z1: 3.245, w: 0.695, h: LH, t: T, maxDeg: 108, glass: true, frontMat: F, metalMat: M.bronze, glassMat: M.glassSmokeAlpha || M.glassSmoke, hingeMat: M.steel });
  { const board = [], band = []; for (const y of [0.7, 1.25, 1.8, 2.3]) fu.shelf(-3.0, 0.5, y, 1.87, 3.23, { board, band }); for (const y of [0.9, 1.5, 2.1]) fu.shelf(-3.0, 0.5, y, -3.23, -1.87, { board, band }); add(board, M.interior); add(band, M.paintWhite); }
  for (const z of [1.88, 3.22]) kit.led({ x: -2.43, y: (Y0 + Y1) / 2, z, len: Y1 - Y0 - 0.1, axis: 'y', thick: 0.012, levelOf: (s) => s.ledLevel('lv-tall-r'), intensity: 1.5, washPlane: { w: Y1 - Y0 - 0.1, h: 0.5, pos: [-2.72, (Y0 + Y1) / 2, z + (z < 2.5 ? 0.012 : -0.012)], rot: [0, 0, -Math.PI / 2] } });
  for (const y of [0.7, 1.25, 1.8, 2.3]) soft.push(...pr.bag(-2.7, y + 0.011, 2.3, { color: P.fabricClay, ry: Math.PI / 2, w: 0.26, h: 0.2 }));
  for (const y of [0.7, 1.25, 1.8]) ceramic.push(...pr.vase(-2.7, y + 0.011, 2.9, { h: 0.24, r: 0.05, color: [P.ceramicSand, P.ceramicDark, P.ceramicTerra][Math.round(y * 3) % 3] }), ...pr.books(-2.7, y + 0.011, 2.6, { n: 3, seed: Math.round(y * 5), w: 0.18, d: 0.14 }));

  // ---- floating shelves either side of the TV ----
  const shl = (z0, z1, y) => { kit.addStatic(placed(fin(0.3, 0.04, z1 - z0, { b: 0.004, grain: 'z', off: [y, z0] }), { x: -2.81, y, z: (z0 + z1) / 2 }), F); };
  for (const [z0, z1] of [[-1.7, -1.0], [1.0, 1.7]]) for (const y of [1.0, 1.4, 1.8]) shl(z0, z1, y);
  for (const [z0, z1] of [[-1.7, -1.0], [1.0, 1.7]]) [1.0, 1.4, 1.8].forEach((y, i) => { ceramic.push(...pr.vase(-2.8, y + 0.02, z0 + 0.2 + i * 0.05, { h: 0.22 + i * 0.05, r: 0.05, color: [P.ceramicSand, P.ceramicTerra, P.ceramicDark][(i + (z0 > 0 ? 1 : 0)) % 3] })); soft.push(...pr.books(-2.8, y + 0.02, z1 - 0.25, { n: 3 + i, seed: i + (z0 > 0 ? 4 : 0), w: 0.2, d: 0.16 })); });
  kit.led({ x: -2.95, y: 1.78, z: -1.35, len: 0.7, axis: 'z', thick: 0.01, levelOf: (s) => 0.8 * s.accentLevel() }); kit.led({ x: -2.95, y: 1.78, z: 1.35, len: 0.7, axis: 'z', thick: 0.01, levelOf: (s) => 0.8 * s.accentLevel() });

  // ---- lounge: sofa, two armchairs, coffee table, rug ----
  { const s = fu.sofa({ x: -0.62, z: 0, ry: Math.PI, w: 2.6, d: 0.98, seats: 3 }); add(s.soft, UP); add(s.hard, METAL); }
  for (const [z, ry] of [[2.25, Math.PI / 2], [-2.25, -Math.PI / 2]]) { const s = fu.sofa({ x: -1.5, z, ry, w: 0.95, d: 0.9, seats: 1 }); add(s.soft, UP); add(s.hard, METAL); }
  { const t = fu.tableTop({ x: -1.62, z: 0, w: 1.1, d: 0.62, h: 0.38, th: 0.05, legInset: 0.07 }); add(t.top, M.stones.living); add(t.legs, METAL); }
  { const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.35, 0.0125, 0); rug.receiveShadow = true; lod.props.add(rug); }
  ceramic.push(...pr.bowl(-1.62, 0.405, 0.1, { r: 0.12, h: 0.06, color: P.ceramicDark }), ...pr.vase(-1.7, 0.405, -0.25, { h: 0.2, r: 0.045, color: P.ceramicSand })); soft.push(...pr.books(-1.55, 0.405, 0.28, { n: 3, seed: 9 }));
  // pillows on the sofa
  soft.push({ geo: placed(fin(0.2, 0.4, 0.4, { b: 0.07 }), { x: -0.45, y: 0.72, z: -0.85, rz: 0.2 }), color: P.fabricClay }, { geo: placed(fin(0.2, 0.4, 0.4, { b: 0.07 }), { x: -0.45, y: 0.72, z: 0.85, rz: 0.2 }), color: P.fabricSage });
  // ---- console behind the sofa (drawer toward the visitor) ----
  add(fu.shell({ x0: 0.14, x1: 0.54, y0: 0.14, y1: 0.78, z0: -0.95, z1: 0.95, divs: [] }), C); kit.addStatic(placed(fin(0.42, 0.04, 1.96, { b: 0.004, grain: 'z' }), { x: 0.34, y: 0.8 }), F);
  kit.addStatic(placed(fin(0.34, 0.14, 1.8, { b: 0.001 }), { x: 0.32, y: 0.07 }), M.plinth);
  kit.drawer({ id: 'lv-console', x: 0.54 + T / 2 - 0.001, y: 0.55, z: 0, w: 1.86, h: 0.3, depth: 0.3, travel: 0.3, grainOff: [0.4, 0.4], frontMat: F, metalMat: METAL, bodyMat: M.interior });
  const L = pr.tableLamp(0.3, 0.82, -0.6); lod.props.add(new THREE.Mesh(mergeColored(L.body), M.propMetal)); kit.mesh(prep(L.shade), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.shadeLinen).multiplyScalar(2.2), side: THREE.DoubleSide, toneMapped: false }), { cast: false, parent: lod.props });
  ceramic.push(...pr.vase(0.3, 0.82, 0.55, { h: 0.34, r: 0.07, color: P.ceramicSand })); soft.push(...pr.books(0.3, 0.82, 0.05, { n: 4, seed: 12, w: 0.24 }), ...pr.stems(0.3, 1.16, 0.55, { n: 6, h: 0.5, seed: 2 }));
  // floor lamp + plant
  { const stem = placed(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 8), { x: -0.8, y: 0.8, z: 2.75 }), base = placed(new THREE.CylinderGeometry(0.12, 0.14, 0.02, 20), { x: -0.8, y: 0.01, z: 2.75 }); kit.mesh(mergeGeometries([prep(stem), prep(base)]), METAL, { cast: false, parent: lod.props }); kit.mesh(prep(new THREE.CylinderGeometry(0.17, 0.22, 0.28, 24, 1, true).translate(-0.8, 1.7, 2.75)), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.shadeLinen).multiplyScalar(2.0), side: THREE.DoubleSide, toneMapped: false }), { cast: false, parent: lod.props }); }
  const pl = pr.plant(-0.8, 0, -3.0, { h: 1.5, leaves: 46, potR: 0.19, seed: 14 });
  kit.ao([-2.97, 3.05, 0], [0, 0, 1], [0, 1, 0], 6.2, 0.9, '+v', 0.3); kit.ao([-2.5, 0.011, 0], [0, 0, 1], [1, 0, 0], 3.6, 0.3, '-v', 0.35);
  buildCanopy(kit, { downlights: [[-1.8, -2.0], [-1.8, 0], [-1.8, 2.0], [0.9, -2.0], [0.9, 0], [0.9, 2.0]] }); buildWallWash(kit, { z: 0, len: 6.2, x: -2.995 });
  kit.contactShadow({ x: -0.62, z: 0, w: 1.4, d: 2.9, strength: 0.5, blur: 26 }); kit.contactShadow({ x: -1.5, z: 2.25, w: 1.1, d: 1.1, strength: 0.4, blur: 22 }); kit.contactShadow({ x: -1.5, z: -2.25, w: 1.1, d: 1.1, strength: 0.4, blur: 22 });
  kit.pool(-1.3, 0.005, 0, 4.2, 0.15);
  const adds = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  adds(soft.filter((x) => x.geo.attributes && x.geo.attributes.position.count > 0), M.fabric); adds(ceramic.filter((x) => x.geo.attributes.position.count > 0), M.ceramic); adds(pl.body, M.leaves, false); adds(pl.cards, M.leafCard, false);
  void hw;
  kit.flushStatics();
  return kit;
}
