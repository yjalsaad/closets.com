/* GLB character adapter: loads a rigged humanoid (GLTFLoader + SkeletonUtils.clone, optional Draco / meshopt), maps its bones BY NAME (Mixamo / Ready Player Me / Reallusion / MetaHuman
 * naming variants) and exposes the SAME interface as characters/rig.js buildCharacter (group, setPose, setFar, drawCalls, dispose, label, meshes, bounds), so staffScene / visitorAvatar
 * can swap it in without touching the staff logic. The procedural pose() angles are applied as additive rotations on top of each bone's rest rotation (retargeting by bone name).
 * Any failure (404, unsupported file, missing bones) resolves to null and the caller keeps the procedural character. Not exercised against a real licensed asset yet (none available). */
import * as THREE from 'three';

const strip = (n) => String(n).replace(/^.*[:|]/, '').replace(/^mixamorig[_:]?/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
export const BONE_NAMES = {
  hips: ['hips', 'pelvis', 'root'], spine: ['spine', 'spine0', 'abdomen'], chest: ['spine2', 'spine1', 'chest', 'upperchest'], neck: ['neck'], head: ['head'],
  shoulderL: ['leftarm', 'larm', 'upperarml', 'armleft', 'clavicleleft'], shoulderR: ['rightarm', 'rarm', 'upperarmr', 'armright', 'clavicleright'],
  elbowL: ['leftforearm', 'lforearm', 'lowerarml', 'forearmleft'], elbowR: ['rightforearm', 'rforearm', 'lowerarmr', 'forearmright'],
  hipL: ['leftupleg', 'lupleg', 'thighl', 'upperlegleft', 'leftupperleg'], hipR: ['rightupleg', 'rupleg', 'thighr', 'upperlegright', 'rightupperleg'],
  kneeL: ['leftleg', 'lleg', 'calfl', 'lowerlegleft', 'leftlowerleg'], kneeR: ['rightleg', 'rleg', 'calfr', 'lowerlegright', 'rightlowerleg'],
};
/** find the bones of a skeleton by name variants; returns { map, missing } */
export function mapBones(root) {
  const bones = []; root.traverse((o) => { if (o.isBone) bones.push(o); });
  const by = new Map(); bones.forEach((b) => { const k = strip(b.name); if (!by.has(k)) by.set(k, b); });
  const map = {}, missing = [];
  for (const [role, names] of Object.entries(BONE_NAMES)) { const hit = names.map((n) => by.get(n)).find(Boolean); if (hit) map[role] = hit; else missing.push(role); }
  return { map, missing };
}
const REQUIRED = ['hips', 'head', 'shoulderL', 'shoulderR', 'hipL', 'hipR'];

/** wrap an already-loaded scene (THREE.Object3D with a skeleton) into the character interface; exported for tests */
export function wrapRigged(scene, { height = 1.68, label = 'licensed character' } = {}) {
  const { map, missing } = mapBones(scene); if (REQUIRED.some((r) => !map[r])) return null;
  const root = new THREE.Group(); root.name = 'character-glb'; root.add(scene);
  const box = new THREE.Box3().setFromObject(scene), h = box.max.y - box.min.y || 1, s = height / h; scene.scale.multiplyScalar(s); scene.position.y -= box.min.y * s;
  const rest = {}; Object.entries(map).forEach(([k, b]) => { rest[k] = b.quaternion.clone(); });
  const meshes = []; scene.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { meshes.push(o); o.castShadow = true; o.frustumCulled = false; } });
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  const set = (role, x = 0, y = 0, z = 0) => { const b = map[role]; if (!b) return; e.set(x, y, z); q.setFromEuler(e); b.quaternion.copy(rest[role]).multiply(q); };
  const api = { group: root, glb: true, gender: 'f', outfit: 'glb', q: 1, label, meshes, scale: 1, missingBones: missing, far: null, farOn: false, bounds: new THREE.Box3().setFromObject(root), joints: {} };
  api.setFar = (v) => { api.farOn = v; };
  api.drawCalls = () => meshes.length;
  api.setPose = (p) => {
    set('hips', 0, p.hipsRotY, p.hipsRotZ); set('spine', p.spineX, p.spineY || 0, 0); set('neck', p.neckX, 0, 0); set('head', p.headX, p.headY, p.headZ);
    set('shoulderL', p.shL.x, 0, p.shL.z); set('shoulderR', p.shR.x, 0, p.shR.z); set('elbowL', p.elL.x, 0, 0); set('elbowR', p.elR.x, 0, 0);
    set('hipL', p.hipL.x, 0, 0); set('hipR', p.hipR.x, 0, 0); set('kneeL', p.knL.x, 0, 0); set('kneeR', p.knR.x, 0, 0);
  };
  api.dispose = () => { scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((x) => { Object.values(x).forEach((v) => { if (v && v.isTexture) v.dispose(); }); x.dispose(); }); } }); };
  return api;
}

/** load a GLB (Draco / meshopt supported) and wrap it; resolves to null on any failure so the procedural character stays */
export async function loadGlbCharacter(url, { height = 1.68, dracoPath, label } = {}) {
  try {
    const [{ GLTFLoader }, { clone }] = await Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/utils/SkeletonUtils.js')]);
    const loader = new GLTFLoader();
    try { const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js'); const d = new DRACOLoader(); d.setDecoderPath(dracoPath || '/yas-bloom/realism/draco/'); loader.setDRACOLoader(d); } catch (e) { /* optional */ }
    try { const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js'); loader.setMeshoptDecoder(MeshoptDecoder); } catch (e) { /* optional */ }
    const gltf = await loader.loadAsync(url);
    return wrapRigged(clone(gltf.scene), { height, label });
  } catch (e) { return null; }
}
