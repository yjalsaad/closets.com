/* Consultation Lounge: a reception desk (stone counter, fluted front, two drawers toward the visitor) in front of the logo wall, a credenza with doors and
 * drawers under a consultation panel (existing booking copy + the existing contact details), and a lounge group (sofa, two armchairs, coffee table, rug).
 * SAMPLE CONFIGURATION. Product frame: +X toward the visitor, wall at x = -3. */
import * as THREE from 'three';
import { flutedPanel, placed, prep } from '../../3d/builders';
import { PALETTE as P } from '../../3d/palette';
import { LOGO_ASPECT } from '../../logo';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh } from './stage';
import { makePanel, drawConsultPanel } from './screens';
import * as pr from './props';
import * as fu from './furnish';
import { mergeGeometries } from '../../3d/geom';
import * as rl from './reflook';


const { fin } = fu;
const T = 0.019, Y0 = 0.06;

export function buildLounge({ M, tier, registry, reduced, lang = 'en', logoTex = null }) {
  const kit = createKit({ product: 'lounge', M, tier, registry, reduced });
  const { group, lod } = kit, F = M.front.lounge, C = M.carcass.lounge, METAL = M.metal.lounge, UP = M.uphol.lounge, STONE = M.stones.lounge, FL = M.flute.lounge;
  const add = (list, mat) => list.forEach((g) => kit.addStatic(g, mat));
  const soft = [], ceramic = [];
  kit.floor();
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.3), M.travertine); w.position.set(-2.995, 1.65, 0); w.rotation.y = Math.PI / 2; w.receiveShadow = true; group.add(w); }
  // ---- logo wall behind the desk: fluted panel + the owner's logo on a brass-framed panel ----
  { const f = new THREE.Mesh(flutedPanel(3.2, 3.3, 0.04, { pitch: 0.05, relief: 0.014, off: [0.2, 0.1] }).rotateY(Math.PI / 2), FL); f.position.set(-2.96, 1.65, -1.45); f.receiveShadow = true; group.add(f); }
  { const lw = 1.9, lh = lw / LOGO_ASPECT; kit.addStatic(placed(fin(0.03, lh + 0.1, lw + 0.1, { b: 0.004 }), { x: -2.91, y: 2.1, z: -1.45 }), M.brass); if (logoTex) { const m = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({ map: logoTex, toneMapped: false })); m.position.set(-2.893, 2.1, -1.45); m.rotation.y = Math.PI / 2; m.name = 'logo'; group.add(m); } }
  kit.led({ x: -2.93, y: 2.1 + 0.75, z: -1.45, len: 2.2, axis: 'z', thick: 0.012, levelOf: (s) => s.accentLevel(), washPlane: { w: 3.0, h: 1.6, pos: [-2.94, 2.1, -1.45], rot: [0, Math.PI / 2, 0] } });

  // ---- reception desk ----
  const DX0 = -2.1, DX1 = -1.15, DZ0 = -2.6, DZ1 = 0.05, DZc = (DZ0 + DZ1) / 2, DH = 0.76;
  add(fu.shell({ x0: DX0, x1: DX1, y0: 0.08, y1: DH - 0.04, z0: DZ0, z1: DZ1, divs: [DZc] }), C);
  kit.addStatic(placed(fin(DX1 - DX0 + 0.06, 0.04, DZ1 - DZ0 + 0.06, { b: 0.004, tile: 1.6 }), { x: (DX0 + DX1) / 2 + 0.01, y: DH - 0.02, z: DZc }), STONE);
  kit.addStatic(placed(fin(0.22, 0.28, DZ1 - DZ0 + 0.06, { b: 0.004, tile: 1.6 }), { x: DX1 - 0.07, y: DH + 0.12, z: DZc }), STONE);     // raised ledge on the visitor side
  kit.addStatic(placed(fin(DX1 - DX0 - 0.1, 0.08, DZ1 - DZ0 - 0.1, { b: 0.001 }), { x: (DX0 + DX1) / 2 - 0.02, y: 0.04, z: DZc }), M.plinth);
  { const fr = new THREE.Mesh(flutedPanel(DZ1 - DZ0 - 0.02, DH - 0.12, 0.04, { pitch: 0.045, relief: 0.012, off: [0.3, 0.2] }).rotateY(Math.PI / 2), FL); fr.position.set(DX1 + 0.015, 0.08 + (DH - 0.12) / 2 + 0.02, DZc); fr.castShadow = fr.receiveShadow = true; fr.name = 'desk-front'; group.add(fr); }
  [['lg-desk-1', DZ0 + 0.7], ['lg-desk-2', DZ1 - 0.7]].forEach(([id, z], i) => kit.drawer({ id, x: DX1 + 0.04 + T / 2, y: 0.56, z, w: 1.1, h: 0.26, depth: 0.5, travel: 0.4, grainOff: [0.3 * i, 0.6], frontMat: F, metalMat: METAL, bodyMat: M.interior, organiser: false }));
  kit.led({ x: DX1 + 0.02, y: 0.075, z: DZc, len: DZ1 - DZ0 - 0.2, axis: 'z', thick: 0.012, levelOf: (s) => 0.8 * s.accentLevel(), washPlane: { w: DZ1 - DZ0, h: 0.7, pos: [DX1 + 0.35, 0.006, DZc], rot: [-Math.PI / 2, 0, Math.PI / 2] } });
  { const c = fu.chair({ x: -2.4, z: DZc, ry: 0 }); add(c.soft, UP); add(c.hard, METAL); }
  { const lens = M.ledWarm(); kit.addStatic(placed(new THREE.BoxGeometry(0.14, 0.01, 0.01), { x: -1.4, y: DH + 0.012, z: DZc + 0.9 }), M.darkInterior); void lens; }
  ceramic.push(...pr.vase(-1.5, DH + 0.27, DZc - 0.9, { h: 0.3, r: 0.07, color: P.ceramicSand }), ...pr.bowl(-1.5, DH + 0.27, DZc + 0.8, { r: 0.1, h: 0.05, color: P.ceramicDark })); soft.push(...pr.books(-1.75, DH + 0.002, DZc + 0.3, { n: 3, seed: 2, w: 0.24 }));
  const L = pr.tableLamp(-1.95, DH + 0.002, DZ1 - 0.25); lod.props.add(propMesh(L.body, M.propMetal)); kit.mesh(prep(L.shade), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.shadeLinen).multiplyScalar(2.2), side: THREE.DoubleSide, toneMapped: false }), { cast: false, parent: lod.props });

  // ---- credenza with the consultation panel above it ----
  const CZ0 = 1.0, CZ1 = 3.25, CX1 = -2.55, CY1 = 0.82;
  add(fu.shell({ x0: -3.0, x1: CX1, y0: 0.1, y1: CY1, z0: CZ0, z1: CZ1, divs: [2.15] }), C);
  kit.addStatic(placed(fin(0.5, 0.035, CZ1 - CZ0 + 0.02, { b: 0.004, tile: 1.6 }), { x: -2.76, y: CY1 + 0.0175 }), STONE); kit.addStatic(placed(fin(0.4, 0.1, CZ1 - CZ0 - 0.1, { b: 0.001 }), { x: -2.78, y: 0.05 }), M.plinth);
  kit.doorPair({ id: 'lg-cred-doors', x: CX1 + T / 2, y: 0.46, z0: CZ0 + 0.005, z1: 2.145, w: 0.565, h: 0.7, t: T, maxDeg: 108, frontMat: F, metalMat: METAL, hingeMat: M.steel, grainOff: [0.2, 0.3] });
  [['lg-cred-d1', 0.64], ['lg-cred-d2', 0.28]].forEach(([id, y], i) => kit.drawer({ id, x: CX1 + T / 2 - 0.001, y, z: (2.155 + CZ1) / 2, w: CZ1 - 2.155 - 0.015, h: 0.34, depth: 0.38, travel: 0.34, grainOff: [0.4 * i, 0.2], frontMat: F, metalMat: METAL, bodyMat: M.interior, organiser: false }));
  const cta = makePanel(1024, 576, drawConsultPanel, lang);
  kit.addStatic(placed(fin(0.04, 1.06, 1.84, { b: 0.004 }), { x: -2.955, y: 1.75, z: 2.1 }), M.darkInterior);
  { const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.99), new THREE.MeshBasicMaterial({ map: cta.tex, toneMapped: false })); sm.position.set(-2.932, 1.75, 2.1); sm.rotation.y = Math.PI / 2; sm.name = 'cta-panel'; group.add(sm); }
  kit.led({ x: -2.95, y: 1.75, z: 2.1, len: 1.7, axis: 'z', thick: 0.01, levelOf: (s) => s.accentLevel(), washPlane: { w: 2.8, h: 1.9, pos: [-2.97, 1.75, 2.1], rot: [0, Math.PI / 2, 0] } });
  kit.relabel = (l) => cta.redraw(l);
  ceramic.push(...pr.mug(-2.75, CY1 + 0.04, 1.4, { color: P.ceramicWhite }), ...pr.mug(-2.7, CY1 + 0.04, 1.55, { color: P.ceramicTerra, ry: 0.6 }), ...pr.vase(-2.8, CY1 + 0.04, 2.9, { h: 0.3, r: 0.06, color: P.ceramicDark })); soft.push(...pr.books(-2.75, CY1 + 0.04, 2.4, { n: 3, seed: 8, w: 0.22 }));

  // ---- seating group ----
  { const s = fu.sofa({ x: -0.4, z: 1.95, ry: Math.PI, w: 1.9, d: 0.95, seats: 2 }); add(s.soft, UP); add(s.hard, METAL); }
  for (const [z, ry] of [[0.8, -Math.PI / 2], [3.0, Math.PI / 2]]) { const s = fu.sofa({ x: -1.35, z, ry, w: 0.95, d: 0.9, seats: 1 }); add(s.soft, UP); add(s.hard, METAL); }
  { const t = fu.tableTop({ x: -1.35, z: 1.95, w: 0.9, d: 0.9, h: 0.4, th: 0.05, legInset: 0.07 }); add(t.top, STONE); add(t.legs, METAL); }
  { const rug = new THREE.Mesh(rl.organicRug(3.79, 3.54, 11), M.rugRust); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.0, 0.0125, 1.95); rug.receiveShadow = true; lod.props.add(rug); }
  ceramic.push(...pr.bowl(-1.35, 0.425, 1.95, { r: 0.13, h: 0.06, color: P.ceramicSand }), ...pr.vase(-1.45, 0.425, 2.2, { h: 0.18, r: 0.04, color: P.ceramicTerra })); soft.push(...pr.books(-1.3, 0.425, 1.7, { n: 3, seed: 15 }));
  { const pl = rl.tree(-0.5, -3.0, { h: 2.3, seed: 22 }); lod.props.add(propMesh(pl.body, M.leaves, { cast: false }), propMesh(pl.cards, M.leafCard, { cast: false })); }
  kit.mesh(rl.curtain(3.2, 3.26, { seed: 5 }), M.curtain, { x: -0.9, y: 0.01, z: 3.36, cast: false, receive: false, parent: lod.props, name: 'curtain' });
  kit.mesh(mergeGeometries(rl.sideTable(-0.38, 0.72, { r: 0.18, h: 0.48 })), M.mirrorSteel, { parent: lod.props });
  kit.ao([-2.99, 3.05, 0], [0, 0, 1], [0, 1, 0], 6.2, 0.9, '+v', 0.3);
  buildCanopy(kit, { downlights: [[-1.8, -2.0], [-1.8, 0.2], [-1.8, 2.2], [0.9, -2.0], [0.9, 0.2], [0.9, 2.2]] }); buildWallWash(kit, { z: 0, len: 6.2, x: -2.995 });
  kit.contactShadow({ x: -1.6, z: DZc, w: 1.2, d: 2.8, strength: 0.5, blur: 26 }); kit.contactShadow({ x: -0.4, z: 1.95, w: 1.3, d: 2.1, strength: 0.45, blur: 24 });
  kit.pool(-1.2, 0.005, 0.2, 4.2, 0.15);
  const adds = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  adds(soft.filter((x) => x.geo.attributes && x.geo.attributes.position.count > 0), M.fabric); adds(ceramic, M.ceramic);
  kit.flushStatics();
  return kit;
}
