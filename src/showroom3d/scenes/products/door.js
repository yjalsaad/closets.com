/* Door: a statement PIVOT interior door in a fluted feature wall, with a brass reveal, brass pull bars, a floor and head pivot detail,
 * a lit room beyond (console, lamp, art, plant) and a swatch board showing the four sample finishes. The leaf is a separate mesh that swings
 * about an off-centre vertical axis (the defining pivot-door motion). SAMPLE CONFIGURATION. */
import * as THREE from 'three';
import { bevelBox, flutedPanel, placed, prep, mergeColored } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { finishList } from '../../products/finishes';
import { createKit } from './kit';
import { buildCanopy, buildWallWash, propMesh, CANOPY_Y } from './stage';
import { swatchMaterial } from './materials';
import * as pr from './props';

const WALL_X = -1.2, WALL_T = 0.16, OPEN_W = 1.0, OPEN_H = 2.4, PIV_Z = -0.3;

export function artTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 340; const g = c.getContext('2d');
  g.fillStyle = '#' + P.artD.toString(16).padStart(6, '0'); g.fillRect(0, 0, 256, 340);
  const blob = (x, y, rx, ry, col, a) => { g.globalAlpha = a; g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, 7); g.fill(); };
  blob(110, 130, 90, 70, P.artB, 1); blob(150, 210, 80, 90, P.artA, 0.92); blob(90, 250, 60, 40, P.artC, 0.9); blob(170, 110, 34, 34, P.artE, 0.95);
  g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildDoor({ M, tier, registry, reduced }) {
  const kit = createKit({ product: 'door', M, tier, registry, reduced });
  const { group, lod } = kit, FR = M.frame.door, FL = M.wallFlute, LEAF = M.front.door, METAL = M.metal.door, fin = bevelBox;
  const wallH = CANOPY_Y;

  kit.floor();
  // ---- the feature wall: fluted left / right of the opening + header, all real geometry ----
  const lw = 3.1 - OPEN_W / 2, mk = (w, h, cz, cy, off) => { const m = new THREE.Mesh(flutedPanel(w, h, WALL_T, { pitch: 0.04, relief: 0.012, off }).rotateY(Math.PI / 2), FL); m.position.set(WALL_X, cy, cz); m.castShadow = m.receiveShadow = true; group.add(m); return m; };
  mk(lw, wallH, -(OPEN_W / 2 + lw / 2), wallH / 2, [0.1, 0.2]); mk(lw, wallH, OPEN_W / 2 + lw / 2, wallH / 2, [0.6, 0.5]); mk(OPEN_W, wallH - OPEN_H, 0, OPEN_H + (wallH - OPEN_H) / 2, [0.9, 0.3]);
  // brass reveal lining the opening (a 6 mm brass edge: the shadow-gap detail on a premium door)
  const rv = [placed(fin(WALL_T + 0.004, OPEN_H, 0.008, { b: 0.0006 }), { x: WALL_X, y: OPEN_H / 2, z: -OPEN_W / 2 + 0.004 }), placed(fin(WALL_T + 0.004, OPEN_H, 0.008, { b: 0.0006 }), { x: WALL_X, y: OPEN_H / 2, z: OPEN_W / 2 - 0.004 }), placed(fin(WALL_T + 0.004, 0.008, OPEN_W, { b: 0.0006 }), { x: WALL_X, y: OPEN_H - 0.004 })];
  rv.forEach((g) => kit.addStatic(g, METAL));
  // pivot hardware: floor plate with a disc and a head cap
  kit.addStatic(placed(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 24), { x: WALL_X, y: 0.007, z: PIV_Z }), METAL);
  kit.addStatic(placed(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 20), { x: WALL_X, y: OPEN_H - 0.04, z: PIV_Z }), METAL);
  kit.addStatic(placed(fin(0.09, 0.012, 0.09, { b: 0.001 }), { x: WALL_X, y: OPEN_H - 0.014, z: PIV_Z }), METAL);

  // ---- the leaf (separate mesh, pivots about the off-centre axis) ----
  const LW = OPEN_W - 0.03, LT = 0.045, LH = OPEN_H - 0.02;
  const pivot = new THREE.Group(); pivot.position.set(WALL_X, 0.012 + LH / 2, PIV_Z); group.add(pivot);
  const zc = -0.0 - PIV_Z;                                        // leaf centre relative to the pivot axis
  const leaf = new THREE.Mesh(fin(LT, LH, LW, { b: 0.0025, grain: 'y', off: [0.2, 0.4] }), LEAF); leaf.position.z = zc; leaf.castShadow = leaf.receiveShadow = true; leaf.name = 'd-pivot:leaf'; pivot.add(leaf);
  const hit = [leaf];
  // vertical brass pull bars on both faces, on stand-off posts, plus a lock escutcheon
  const bars = [];
  for (const sx of [1, -1]) {
    bars.push(prep(placed(new THREE.CylinderGeometry(0.0125, 0.0125, 0.95, 16), { x: sx * (LT / 2 + 0.055), y: 0.05, z: zc + LW / 2 - 0.09 })));
    for (const yy of [-0.38, 0.48]) bars.push(prep(placed(new THREE.CylinderGeometry(0.008, 0.008, 0.055, 10), { x: sx * (LT / 2 + 0.0275), y: yy + 0.05, z: zc + LW / 2 - 0.09, rz: Math.PI / 2 })));
    bars.push(prep(placed(fin(0.008, 0.16, 0.034, { b: 0.0008 }), { x: sx * (LT / 2 + 0.004), y: -0.02, z: zc + LW / 2 - 0.035 })));
  }
  const pull = new THREE.Mesh(mergeGeometries(bars), METAL); pull.castShadow = true; pull.name = 'd-pivot:pull'; pivot.add(pull); hit.push(pull);
  const st = kit.state; const apply = () => { pivot.rotation.y = (100 * Math.PI / 180) * st.part('d-pivot').value; };
  kit.updaters.push(apply); apply();
  registry.register({ id: 'd-pivot', product: 'door', kind: 'pivot', label: { en: 'Pivot door', ar: 'الباب المحوري' }, hit, object: pivot });

  // ---- the lit room beyond ----
  const roomX = -2.78;
  const glowBack = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 3.1), new THREE.MeshStandardMaterial({ color: P.plaster, roughness: 0.9, emissive: new THREE.Color(P.ledWarm), emissiveIntensity: 0.42, envMapIntensity: 0.3 }));
  glowBack.position.set(roomX, 1.55, 0); glowBack.rotation.y = Math.PI / 2; group.add(glowBack);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.8, envMapIntensity: 0.3 })); art.position.set(roomX + 0.03, 1.5, 0.05); art.rotation.y = Math.PI / 2; group.add(art);
  kit.addStatic(placed(fin(0.03, 0.9, 0.7, { b: 0.002 }), { x: roomX + 0.015, y: 1.5, z: 0.05 }), METAL);
  // console table with lamp, vase and books
  kit.addStatic(placed(fin(0.4, 0.04, 1.3, { b: 0.002, grain: 'z', off: [0.4, 0.4] }), { x: -2.55, y: 0.78, z: 0.1 }), FR);
  for (const z of [-0.5, 0.7]) kit.addStatic(placed(fin(0.34, 0.76, 0.03, { b: 0.001 }), { x: -2.55, y: 0.38, z }), METAL);
  const L = pr.tableLamp(-2.55, 0.8, 0.5);
  const lampBody = new THREE.Mesh(mergeColored(L.body), M.propMetal); lod.props.add(lampBody);
  const shadeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.shadeLinen).multiplyScalar(2.2), side: THREE.DoubleSide, toneMapped: false }); kit.mesh(L.shade, shadeMat, { cast: false, parent: lod.props });
  kit.pool(-2.2, 0.01, 0.4, 2.6, 0.3);
  const matte = [...pr.books(-2.55, 0.8, -0.2, { n: 4, seed: 6, ry: 1.2 })], ceramic = [...pr.vase(-2.55, 0.8, -0.05, { h: 0.3, r: 0.07, color: P.ceramicTerra })];
  const pl1 = pr.plant(-2.35, 0, -1.5, { h: 1.7, leaves: 50, potR: 0.2, seed: 3 }), pl2 = pr.plant(-0.55, 0, -2.5, { h: 1.5, leaves: 46, potR: 0.2, seed: 12 }), leaves = [...pr.stems(-2.55, 1.1, -0.05, { n: 6, h: 0.6, seed: 8 }), ...pl1.body, ...pl2.body];

  // ---- visitor side: swatch board of the four finishes, rug, plant, a bench ----
  const fins = finishList('door');
  const board = []; const bx = WALL_X + WALL_T / 2 + 0.03;
  kit.addStatic(placed(fin(0.02, 0.9, 1.9, { b: 0.002 }), { x: bx - 0.002, y: 1.35, z: 1.95 }), METAL);
  fins.forEach((f, i) => { const sm = swatchMaterial(M, 'door', f.id); const m = new THREE.Mesh(fin(0.016, 0.74, 0.4, { b: 0.0015, grain: 'y', off: [i * 0.2, i * 0.3] }), sm); m.position.set(bx + 0.012, 1.35, 1.95 - 0.7 + i * 0.47); m.castShadow = true; group.add(m); board.push(m); });
  kit.group.userData.swatches = board;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.0), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(0.1, 0.012, 0.0); rug.receiveShadow = true; group.add(rug);

  const bench = [placed(fin(0.4, 0.05, 1.3, { b: 0.004, grain: 'z', off: [0.8, 0.2] }), { x: -0.3, y: 0.42, z: 2.0 })];
  bench.forEach((g) => kit.addStatic(g, FR));
  for (const z of [1.45, 2.55]) kit.addStatic(placed(fin(0.34, 0.4, 0.03, { b: 0.001 }), { x: -0.3, y: 0.2, z }), METAL);
  const soft = [...pr.foldedStack(-0.3, 0.445, 1.8, { n: 3, seed: 9, w: 0.3, d: 0.3 })];

  kit.ao([-1.115, 3.05, 0], [0, 0, 1], [0, 1, 0], 6.2, 0.9, '+v', 0.28); kit.ao([-1.0, 0.011, 0], [0, 0, 1], [1, 0, 0], 6.0, 0.5, '-v', 0.4);
  kit.ao([-2.78, 1.5, 0], [0, 0, 1], [0, 1, 0], 2.8, 0.7, '+v', 0.4); kit.ao([-2.78, 0.4, 0], [0, 0, 1], [0, 1, 0], 2.8, 0.7, '-v', 0.4);
  buildCanopy(kit, { downlights: [[-0.6, -1.8], [-0.6, 0], [-0.6, 1.8], [1.3, -1.8], [1.3, 0], [1.3, 1.8]] }); buildWallWash(kit, { z: 0, len: 6.0, x: WALL_X + WALL_T / 2 + 0.002 });
  kit.contactShadow({ x: -0.9, z: 0, w: 2.2, d: 6.2, strength: 0.4, blur: 26 });
  const add = (items, mat, cast = true) => { if (items.length) lod.props.add(propMesh(items, mat, { cast })); };
  add(matte, M.matte); add(ceramic, M.ceramic); add(leaves, M.leaves, false); add([...pl1.cards, ...pl2.cards], M.leafCard, false); add(soft, M.fabric);
  kit.flushStatics();
  return kit;
}
