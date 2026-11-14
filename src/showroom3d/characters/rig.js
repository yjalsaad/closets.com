/* Procedural character rig (no GLB, no external assets): a hierarchical skeleton of THREE.Group joints (hips, spine, chest, neck, head, shoulders, elbows, hips, knees)
 * with stylised, abstract faces (two dark eyes that blink, a soft mouth whose height follows the jaw) and modest, professional outfits:
 *   female: 'abaya' | 'coat' (modern long coat), optional light headscarf, hair 'bun' | 'long' | 'short' | 'none'
 *   male:   'thobe' (+ ghutra and agal) | 'suit'            guest: 'suit' in neutral colours, no headwear
 * Skin tones are a plain choice (skinA..D). Everything is merged per joint into vertex-coloured meshes sharing ONE material: 13 draw calls per character, 1 when far
 * (a baked rest-pose mesh). Character front is +Z, height is about 1.65 m (f) / 1.75 m (m). Joint angles come from characters/anim.js pose(). */
import * as THREE from 'three';
import { PALETTE as P } from '../3d/palette';
import { placed, prep, mergeColored } from '../3d/builders';
import { mergeGeometries } from '../3d/geom';

let _mat = null;
const material = () => _mat || (_mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.02, envMapIntensity: 0.3 }));
export const SKINS = ['skinA', 'skinB', 'skinC', 'skinD'];
export const OUTFITS = { f: ['abaya', 'coat'], m: ['thobe', 'suit'], guest: ['suit'] };
export const HAIRS = ['bun', 'long', 'short', 'none'];
const G = (geo, color, t) => ({ geo: t ? placed(geo, t) : geo, color });
const sph = (r, q) => new THREE.SphereGeometry(r, q ? 18 : 10, q ? 14 : 8);
const cyl = (rt, rb, h, q) => new THREE.CylinderGeometry(rt, rb, h, q ? 14 : 8, 1);

function mergeKeep(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3).fill(1); let o = 0;
  for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); if (g.attributes.color) col.set(g.attributes.color.array, o * 3); o += c; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); return m;
}
const J = (parent, x = 0, y = 0, z = 0, name) => { const g = new THREE.Group(); g.position.set(x, y, z); if (name) g.name = name; parent.add(g); return g; };
const M = (items, parent, name) => { const m = new THREE.Mesh(mergeColored(items), material()); m.name = name; m.castShadow = true; m.matrixAutoUpdate = true; parent.add(m); return m; };

/**
 * @param {{gender?: 'f'|'m'|'guest', outfit?: string, scarf?: boolean, hair?: string, skin?: string, color?: number, scarfColor?: number, q?: 0|1, name?: string}} o   q: 1 = full detail (medium / high tier), 0 = low tier
 */
export function buildCharacter(o = {}) {
  const gender = o.gender || 'f', male = gender === 'm', guest = gender === 'guest', q = o.q === 0 ? 0 : 1;
  const outfit = (OUTFITS[gender] || OUTFITS.f).includes(o.outfit) ? o.outfit : OUTFITS[gender][0];
  const skin = P[SKINS.includes(o.skin) ? o.skin : 'skinB'], long = outfit === 'abaya' || outfit === 'thobe';
  const cloth = o.color != null ? o.color : outfit === 'abaya' ? P.abayaBlack : outfit === 'thobe' ? P.thobeWhite : outfit === 'coat' ? P.coatTeal : guest ? P.suitGrey : P.suitNavy;
  const hairC = o.hairColor != null ? o.hairColor : P.hairDark, scarfC = o.scarfColor != null ? o.scarfColor : (male ? P.ghutraWhite : P.scarfCream);
  const sh = male ? 0.215 : guest ? 0.2 : 0.185, chestR = male ? 0.165 : 0.145, scale = male ? 1 : guest ? 0.97 : 0.94;
  const root = new THREE.Group(); root.name = 'character'; root.userData.label = `${male ? 'male' : guest ? 'guest' : 'female'} character, ${outfit}`;
  const hips = J(root, 0, 0.95, 0, 'hips'), legs = {}, arms = {};
  // ---- hips: pelvis + the long garment's skirt
  const hipItems = [G(cyl(chestR * 0.95, chestR * 0.9, 0.2, q), cloth, { y: 0.03, s: [1, 1, 0.72] })];
  if (long) { const hem = outfit === 'abaya' ? 0.29 : 0.24, pts = [[0.001, 0.12], [0.16, 0.1], [0.19, -0.2], [hem * 0.8, -0.6], [hem, -0.9], [0.001, -0.9]].map(([r, y]) => new THREE.Vector2(r, y)).reverse(); hipItems.push(G(new THREE.LatheGeometry(pts, q ? 20 : 10), cloth, { s: [1, 1, 0.88] })); }
  else if (outfit === 'coat') { const pts = [[0.001, 0.12], [0.165, 0.1], [0.19, -0.1], [0.21, -0.55], [0.001, -0.55]].map(([r, y]) => new THREE.Vector2(r, y)).reverse(); hipItems.push(G(new THREE.LatheGeometry(pts, q ? 20 : 10), cloth, { s: [1, 1, 0.8] })); }
  const hipsMesh = M(hipItems, hips, 'hipsMesh');
  // ---- legs: thigh + shin / shoe on knee joints
  const trouser = outfit === 'coat' ? P.abayaBlack : long ? cloth : cloth;
  for (const side of [-1, 1]) {
    const hj = J(hips, side * 0.085, -0.02, 0, side < 0 ? 'hipR' : 'hipL'), thigh = M([G(cyl(0.065, 0.055, 0.44, q), trouser, { y: -0.22 })], hj, 'thigh');
    const kj = J(hj, 0, -0.44, 0, 'knee'), shin = M([G(cyl(0.052, 0.042, 0.42, q), trouser, { y: -0.21 }), G(new THREE.BoxGeometry(0.085, 0.055, 0.25), P.shoeDark, { y: -0.425, z: 0.06 })], kj, 'shin');
    legs[side < 0 ? 'R' : 'L'] = { hip: hj, knee: kj, thigh, shin };
  }
  // ---- spine / chest / neck / head
  const spine = J(hips, 0, 0.0, 0, 'spine'), chest = J(spine, 0, 0.22, 0, 'chest');
  const chestItems = [G(cyl(chestR * 0.9, chestR, 0.5, q), cloth, { y: 0.17, s: [1, 1, 0.7] }), G(cyl(0.042, 0.048, 0.1, q), skin, { y: 0.47 })];
  if (outfit === 'suit' && !long) chestItems.push(G(new THREE.BoxGeometry(0.07, 0.2, 0.02), P.shirtWhite, { y: 0.3, z: chestR * 0.7 - 0.005 }));
  const chestMesh = M(chestItems, chest, 'chestMesh');
  const neck = J(chest, 0, 0.5, 0, 'neck'), head = J(neck, 0, 0.12, 0, 'head');
  const headItems = [G(sph(0.105, q), skin, { s: [0.92, 1.08, 1] })];
  const wedge = (r, extra = 0.7) => new THREE.SphereGeometry(r, q ? 18 : 10, q ? 12 : 8, Math.PI / 2 + extra, Math.PI * 2 - 2 * extra, 0, 1.95);
  const covered = o.scarf || (male && outfit === 'thobe');
  if (covered) {
    headItems.push(G(wedge(0.122, 0.78), scarfC, { y: 0.012, z: -0.006 }), G(cyl(0.12, 0.2, 0.2, q), scarfC, { y: -0.14, z: -0.012, s: [1, 1, 0.9] }));
    if (male) headItems.push(G(new THREE.TorusGeometry(0.11, 0.009, 6, q ? 20 : 12), P.agalBlack, { y: 0.065, rx: Math.PI / 2 }));
  } else if (o.hair !== 'none' && !(male && outfit === 'suit' && o.hair === 'none')) {
    const hs = o.hair || (male || guest ? 'short' : 'bun');
    headItems.push(G(wedge(0.111, hs === 'short' ? 0.95 : 0.82), hairC, { y: 0.008, z: -0.004 }));
    if (hs === 'bun') headItems.push(G(sph(0.05, q), hairC, { y: 0.1, z: -0.095 }));
    if (hs === 'long') headItems.push(G(cyl(0.085, 0.07, 0.3, q), hairC, { y: -0.12, z: -0.06, s: [1.1, 1, 0.55] }));
  }
  const headMesh = M(headItems, head, 'headMesh');
  const eyes = M([G(sph(0.0115, 0), P.eyeDark, { x: -0.04, s: [1, 1.15, 0.7] }), G(sph(0.0115, 0), P.eyeDark, { x: 0.04, s: [1, 1.15, 0.7] })], head, 'eyes'); eyes.position.set(0, 0.025, 0.097); eyes.castShadow = false;
  const mouth = M([G(sph(0.02, 0), P.lipTone, { s: [1.3, 0.45, 0.5] })], head, 'mouth'); mouth.position.set(0, -0.045, 0.094); mouth.castShadow = false;
  // ---- arms
  const sleeve = outfit === 'suit' && !male && !guest ? cloth : cloth;
  for (const side of [-1, 1]) {
    const sj = J(chest, side * (sh + 0.025), 0.42, 0, side < 0 ? 'shoulderR' : 'shoulderL'), upper = M([G(cyl(0.042, 0.038, 0.27, q), sleeve, { y: -0.135 })], sj, 'upperArm');
    const ej = J(sj, 0, -0.27, 0, 'elbow'), fore = M([G(cyl(0.037, 0.03, 0.25, q), outfit === 'suit' && male ? P.shirtWhite : sleeve, { y: -0.125 }), G(sph(0.04, q), skin, { y: -0.275, s: [1, 1.15, 0.85] })], ej, 'foreArm');
    arms[side < 0 ? 'R' : 'L'] = { shoulder: sj, elbow: ej, upper, fore };
  }
  root.scale.setScalar(scale);
  const api = { group: root, joints: { hips, spine, chest, neck, head, legs, arms, eyes, mouth }, scale, gender, outfit, q, label: root.userData.label, meshes: [], far: null, farOn: false };
  root.traverse((n) => { if (n.isMesh) api.meshes.push(n); });
  // ---- baked rest-pose mesh for far LOD (1 draw call)
  root.updateMatrixWorld(true); const parts = []; api.meshes.forEach((m) => parts.push(prep(m.geometry.clone().applyMatrix4(m.matrixWorld))));
  const far = new THREE.Mesh(mergeKeep(parts), material()); far.name = 'far'; far.visible = false; far.castShadow = false; root.add(far); far.matrixAutoUpdate = false; api.far = far; far.geometry.computeBoundingBox(); api.bounds = far.geometry.boundingBox.clone();
  api.setFar = (v) => { if (v === api.farOn) return; api.farOn = v; far.visible = v; for (const m of api.meshes) m.visible = !v; };
  api.drawCalls = () => (api.farOn ? 1 : api.meshes.length);
  api.setPose = (p) => {
    hips.position.y = 0.95 + p.hipsY; hips.rotation.z = p.hipsRotZ; hips.rotation.y = p.hipsRotY; spine.rotation.x = p.spineX; chest.position.y = 0.22 + p.chestLift; chest.scale.setScalar(p.chestScale);
    neck.rotation.x = p.neckX; head.rotation.set(p.headX, p.headY, p.headZ); eyes.scale.y = Math.max(0.08, 1 - p.blink * 0.92); mouth.scale.y = 1 + p.jaw * 2.6; mouth.position.y = -0.045 - p.jaw * 0.006;
    arms.L.shoulder.rotation.set(p.shL.x, 0, p.shL.z); arms.R.shoulder.rotation.set(p.shR.x, 0, p.shR.z); arms.L.elbow.rotation.x = p.elL.x; arms.R.elbow.rotation.x = p.elR.x; arms.R.elbow.rotation.z = p.wrR.z * 0.4;
    legs.L.hip.rotation.x = p.hipL.x; legs.R.hip.rotation.x = p.hipR.x; legs.L.knee.rotation.x = p.knL.x; legs.R.knee.rotation.x = p.knR.x; hipsMesh.rotation.y = p.skirtSway;
  };
  api.dispose = () => { for (const m of api.meshes) m.geometry.dispose(); far.geometry.dispose(); };
  void chestMesh; void headMesh;
  return api;
}
