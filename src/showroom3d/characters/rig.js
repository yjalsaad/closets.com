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
const sph = (r, q) => new THREE.SphereGeometry(r, q ? 14 : 8, q ? 10 : 6);
const cyl = (rt, rb, h, q) => new THREE.CylinderGeometry(rt, rb, h, q ? 10 : 6, 1);
const V = (a) => a.map(([r, y]) => new THREE.Vector2(r, y));
/** rounded, tapered limb hanging down from y = 0 (top cap radius rT) to y = -len (bottom cap radius rB): a lathe with hemispherical ends */
function limb(rT, rB, len, q, bulge = 0) {
  const n = q ? 3 : 2, pts = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push([rB * Math.sin(a), -len - rB * Math.cos(a)]); }
  if (bulge) pts.push([(rT + rB) / 2 + bulge, -len * 0.5]);
  for (let i = n; i >= 0; i--) { const a = (i / n) * Math.PI / 2; pts.push([rT * Math.sin(a), rT * Math.cos(a)]); }
  pts[0][0] = 0.0005; pts[pts.length - 1][0] = 0.0005;
  return new THREE.LatheGeometry(V(pts), q ? 10 : 6);
}
const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); };

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
  const skin = P[SKINS.includes(o.skin) ? o.skin : 'skinB'], long = outfit === 'abaya' || outfit === 'thobe', skinD = shade(skin, 0.9);
  const cloth = o.color != null ? o.color : outfit === 'abaya' ? P.abayaBlack : outfit === 'thobe' ? P.thobeWhite : outfit === 'coat' ? P.coatTeal : guest ? P.suitGrey : P.suitNavy;
  const hairC = o.hairColor != null ? o.hairColor : P.hairDark, scarfC = o.scarfColor != null ? o.scarfColor : (male ? P.ghutraWhite : P.scarfCream);
  const sh = male ? 0.2 : guest ? 0.19 : 0.172, chestR = male ? 0.15 : 0.13, scale = male ? 1 : guest ? 0.97 : 0.94, fem = !male && !guest;
  const root = new THREE.Group(); root.name = 'character'; root.userData.label = `${male ? 'male' : guest ? 'guest' : 'female'} character, ${outfit}`;
  const hips = J(root, 0, 0.95, 0, 'hips'), legs = {}, arms = {};
  const legC = long ? P.shoeDark : outfit === 'coat' ? P.abayaBlack : cloth, sleeveW = outfit === 'abaya' ? 0.02 : 0;
  // ---- hips: pelvis (+ for a coat the long skirt); a long garment's skirt is its own joint so it can swing with a spring
  const hipItems = [G(sph(0.135, q), cloth, { y: 0.01, s: [1.12, 0.85, 0.78] })];
  if (outfit === 'coat') hipItems.push(G(new THREE.LatheGeometry(V([[0.001, -0.58], [0.2, -0.58], [0.2, -0.2], [0.165, 0.05], [0.001, 0.05]]), q ? 14 : 8), cloth, { s: [1, 1, 0.8] }));
  const hipsMesh = M(hipItems, hips, 'hipsMesh');
  const waist0 = chestR * (fem ? 0.74 : 0.86) * 1.0;
  let skirt = null, skirtMesh = null;
  if (long) {
    const hem = outfit === 'abaya' ? 0.33 : 0.265, items = [G(new THREE.LatheGeometry(V([[0.001, -0.89], [hem, -0.89], [hem * 0.86, -0.65], [0.22, -0.3], [0.18, -0.05], [0.145, 0.06], [waist0, 0.19], [0.001, 0.19]]), q ? 16 : 8), cloth, { s: [1, 1, 0.86] })];
    if (outfit === 'abaya') items.push(G(new THREE.TorusGeometry(hem * 0.995, 0.008, 4, q ? 16 : 8), shade(cloth, 0.7), { y: -0.885, rx: Math.PI / 2, s: [1, 0.86, 1] }));
    skirt = J(hips, 0, 0, 0, 'skirt'); skirtMesh = M(items, skirt, 'skirtMesh');
  }
  // ---- legs: rounded thigh + shin with a proper rounded shoe
  for (const side of [-1, 1]) {
    const hj = J(hips, side * 0.085, -0.02, 0, side < 0 ? 'hipR' : 'hipL'), thigh = M([G(limb(0.068, 0.052, 0.4, q), outfit === 'coat' ? P.abayaBlack : cloth)], hj, 'thigh');
    const kj = J(hj, 0, -0.44, 0, 'knee');
    const shin = M([G(limb(0.05, 0.036, 0.36, q), legC), G(sph(0.05, q), P.shoeDark, { y: -0.425, z: 0.055, s: [0.82, 0.62, 2.1] }), G(sph(0.03, 0), P.shoeDark, { y: -0.385, z: -0.01, s: [1, 1.1, 1] })], kj, 'shin');
    legs[side < 0 ? 'R' : 'L'] = { hip: hj, knee: kj, thigh, shin };
  }
  // ---- spine / chest (tapered torso, shoulders) / neck / head
  const spine = J(hips, 0, 0.0, 0, 'spine'), chest = J(spine, 0, 0.22, 0, 'chest');
  const waist = chestR * (fem ? 0.74 : 0.86), bust = chestR * (fem ? 1.0 : 1.08);
  const chestItems = [G(new THREE.LatheGeometry(V([[0.001, -0.1], [waist, -0.1], [waist * 1.02, 0.04], [bust, 0.27], [sh * 1.0, 0.4], [sh * 0.72, 0.465], [0.07, 0.505], [0.001, 0.505]]), q ? 16 : 8), cloth, { s: [1, 1, fem ? 0.6 : 0.64] }), G(limb(0.046, 0.05, 0.1, q), skin, { y: 0.58 })];
  if (male && outfit === 'suit' || guest) chestItems.push(G(new THREE.BoxGeometry(0.1, 0.2, 0.02), P.shirtWhite, { y: 0.39, z: bust * 0.62 - 0.004 }), G(new THREE.BoxGeometry(0.022, 0.2, 0.012), P.suitNavy, { y: 0.36, z: bust * 0.62 + 0.008 }));
  if (outfit === 'coat') chestItems.push(G(new THREE.BoxGeometry(0.05, 0.2, 0.012), shade(cloth, 1.25), { y: 0.3, z: bust * 0.6 + 0.002 }));
  const chestMesh = M(chestItems, chest, 'chestMesh');
  const neck = J(chest, 0, 0.5, 0, 'neck'), head = J(neck, 0, 0.12, 0, 'head');
  const headItems = [G(sph(0.105, q), skin, { s: [0.9, 1.06, 0.98] }), G(sph(0.07, q), skin, { y: -0.055, z: 0.028, s: [1, 0.85, 0.95] }),
    G(sph(0.014, 0), skinD, { y: -0.012, z: 0.099, s: [0.9, 1.25, 1.1] }),
    G(sph(0.02, 0), skinD, { x: -0.093, y: 0.0, s: [0.5, 1.1, 0.8] }), G(sph(0.02, 0), skinD, { x: 0.093, y: 0.0, s: [0.5, 1.1, 0.8] }),
    G(new THREE.BoxGeometry(0.03, 0.0055, 0.006), hairC, { x: -0.038, y: 0.048, z: 0.095, rz: 0.12 }), G(new THREE.BoxGeometry(0.03, 0.0055, 0.006), hairC, { x: 0.038, y: 0.048, z: 0.095, rz: -0.12 })];
  const wedge = (r, extra = 0.7) => new THREE.SphereGeometry(r, q ? 14 : 8, q ? 9 : 6, Math.PI / 2 + extra, Math.PI * 2 - 2 * extra, 0, 1.95);
  const covered = o.scarf || (male && outfit === 'thobe');
  if (covered) {
    headItems.push(G(wedge(0.124, 0.7), scarfC, { y: 0.012, z: -0.008 }), G(new THREE.LatheGeometry(V([[0.125, -0.02], [0.2, -0.17], [0.215, -0.27], [0.001, -0.27]]).reverse(), q ? 14 : 8), scarfC, { y: -0.01, z: -0.02, s: [1, 1, 0.82] }));
    if (male) headItems.push(G(new THREE.TorusGeometry(0.115, 0.009, 4, q ? 14 : 8), P.agalBlack, { y: 0.065, rx: Math.PI / 2 }));
  } else if (o.hair !== 'none') {
    const hs = o.hair || (male || guest ? 'short' : 'bun');
    headItems.push(G(wedge(0.112, hs === 'short' ? 0.55 : 0.82), hairC, { y: 0.008, z: -0.004 }));
    if (hs === 'bun') headItems.push(G(sph(0.05, q), hairC, { y: 0.1, z: -0.095 }));
    if (hs === 'long') headItems.push(G(limb(0.085, 0.06, 0.28, q), hairC, { y: -0.04, z: -0.07, s: [1.1, 1, 0.55] }));
  }
  const headMesh = M(headItems, head, 'headMesh');
  const eyes = M([-1, 1].flatMap((x) => [G(sph(0.0125, 0), 0xf3efe8, { x: x * 0.036, s: [1.25, 0.9, 0.6] }), G(sph(0.0072, 0), P.eyeDark, { x: x * 0.036, z: 0.006, s: [1, 1.05, 0.6] })]), head, 'eyes'); eyes.position.set(0, 0.022, 0.087); eyes.castShadow = false;
  const mouth = M([G(sph(0.02, 0), P.lipTone, { s: [1.3, 0.45, 0.5] })], head, 'mouth'); mouth.position.set(0, -0.05, 0.088); mouth.castShadow = false;
  // ---- arms: rounded upper arm + forearm (a bell sleeve on the abaya), mitten hand with a thumb
  const fore0 = outfit === 'suit' && male ? P.shirtWhite : cloth;
  for (const side of [-1, 1]) {
    const sj = J(chest, side * (sh + 0.018), 0.41, 0, side < 0 ? 'shoulderR' : 'shoulderL'), upper = M([G(limb(0.05, 0.039, 0.25, q), cloth)], sj, 'upperArm');
    const ej = J(sj, 0, -0.27, 0, 'elbow');
    const fore = M([G(limb(0.039, 0.032 + sleeveW, 0.22, q, sleeveW * 0.5), fore0), G(sph(0.03, q), skin, { y: -0.285, s: [0.62, 1.3, 0.95] }), G(sph(0.024, q), skin, { y: -0.33, z: 0.004, s: [0.6, 1.25, 0.8] }), G(sph(0.0135, 0), skin, { x: -side * 0.022, y: -0.3, z: 0.018, s: [1, 1.7, 1] })], ej, 'foreArm');
    arms[side < 0 ? 'R' : 'L'] = { shoulder: sj, elbow: ej, upper, fore };
  }
  root.scale.setScalar(scale);
  const api = { group: root, joints: { hips, spine, chest, neck, head, legs, arms, eyes, mouth, skirt }, scale, gender, outfit, q, label: root.userData.label, meshes: [], far: null, farOn: false };
  root.traverse((n) => { if (n.isMesh) api.meshes.push(n); });
  // ---- baked rest-pose mesh for far LOD (1 draw call)
  root.updateMatrixWorld(true); const parts = []; api.meshes.forEach((m) => parts.push(prep(m.geometry.clone().applyMatrix4(m.matrixWorld))));
  if (q && !o._noFar) { const lo = buildCharacter({ ...o, q: 0, _noFar: true }); lo.group.updateMatrixWorld(true); parts.length = 0; lo.meshes.forEach((m) => parts.push(prep(m.geometry.clone().applyMatrix4(m.matrixWorld)))); lo.dispose(); }
  const far = new THREE.Mesh(mergeKeep(parts), material()); far.name = 'far'; far.visible = false; far.castShadow = false; root.add(far); far.matrixAutoUpdate = false; api.far = far; far.geometry.computeBoundingBox(); api.bounds = far.geometry.boundingBox.clone();
  api.setFar = (v) => { if (v === api.farOn) return; api.farOn = v; far.visible = v; for (const m of api.meshes) m.visible = !v; };
  api.drawCalls = () => (api.farOn ? 1 : api.meshes.length);
  const sk = { x: 0, vx: 0, z: 0, vz: 0 }, stride = long ? 0.5 : 1;   // a long garment limits the stride so the feet do not escape the hem
  api.setPose = (p, dt = 0.016) => {
    hips.position.y = 0.95 + p.hipsY; hips.rotation.z = p.hipsRotZ; hips.rotation.y = p.hipsRotY; spine.rotation.y = p.spineY || 0; spine.rotation.x = p.spineX; chest.position.y = 0.22 + p.chestLift; chest.scale.setScalar(p.chestScale);
    neck.rotation.x = p.neckX; head.rotation.set(p.headX, p.headY - (p.spineY || 0) * 0.8 - p.hipsRotY * 0.5, p.headZ); eyes.scale.y = Math.max(0.08, 1 - p.blink * 0.92); mouth.scale.y = 1 + p.jaw * 2.6; mouth.position.y = -0.05 - p.jaw * 0.006;
    arms.L.shoulder.rotation.set(p.shL.x, 0, p.shL.z); arms.R.shoulder.rotation.set(p.shR.x, 0, p.shR.z); arms.L.elbow.rotation.x = p.elL.x; arms.R.elbow.rotation.x = p.elR.x; arms.R.elbow.rotation.z = p.wrR.z * 0.4;
    legs.L.hip.rotation.x = p.hipL.x * stride; legs.R.hip.rotation.x = p.hipR.x * stride; legs.L.knee.rotation.x = p.knL.x * stride; legs.R.knee.rotation.x = p.knR.x * stride; hipsMesh.rotation.y = p.skirtSway;
    if (skirt) {   // secondary motion: the skirt is a damped spring that trails behind the walking hips (hem swings back, then side to side with the stride)
      const h = Math.min(0.05, Math.max(0.001, dt)), W = p.walk || 0, tx = 0.07 * W + p.skirtSway * 1.5, tz = -(p.hipsRotZ || 0) * 1.6;
      sk.vx += ((tx - sk.x) * 90 - sk.vx * 9) * h; sk.x += sk.vx * h; sk.vz += ((tz - sk.z) * 90 - sk.vz * 9) * h; sk.z += sk.vz * h;
      skirt.rotation.set(sk.x, 0, sk.z);
    }
  };
  api.dispose = () => { for (const m of api.meshes) m.geometry.dispose(); far.geometry.dispose(); };
  void chestMesh; void headMesh; void skirtMesh;
  return api;
}
