/* PBR material library built from the procedural texture sets. Interior surfaces take less image-based light than exterior ones
 * (the environment map has no occlusion, so an un-attenuated sky would wash out the hall). */
import * as THREE from 'three';
import { PALETTE } from './palette';
import { toTexture } from './textures';

const tex = (c, o) => (c ? toTexture(c, o) : null);

export function createMaterials(sets, tier, envMap, envInterior = null) {
  const an = tier.anisotropy;
  const nm = tier.normalMaps;
  const T = (canvas, repeat, srgb = true) => tex(canvas, { srgb, repeat, anisotropy: an });
  const std = (o) => new THREE.MeshStandardMaterial({ envMap, ...o });
  const phys = (o) => new THREE.MeshPhysicalMaterial({ envMap, ...o });
  const envI = envInterior || envMap;   // inside the hall every surface is lit by the interior HDRI, the sky only reflects on the exterior
  const stdI = (o) => std({ envMap: envI, ...o }), physI = (o) => phys({ envMap: envI, ...o });
  const M = {};
  const floorOpts = {
    map: T((sets.floor || sets.stone).map, [1, 1]), roughnessMap: T((sets.floor || sets.stone).rough, [1, 1], false), roughness: 1,
    normalMap: nm ? T((sets.floor || sets.stone).normal, [1, 1], false) : null, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 0.6,
  };
  floorOpts.color = new THREE.Color(PALETTE.floorTint);
  M.floor = tier.physicalFloor ? physI({ ...floorOpts, clearcoat: 0.55, clearcoatRoughness: 0.18 }) : stdI(floorOpts);
  M.stoneWall = stdI({ map: T(sets.stone.map, [1, 1]), roughnessMap: T(sets.stone.rough, [1, 1], false), roughness: 1, normalMap: nm ? T(sets.stone.normal, [1, 1], false) : null, envMapIntensity: 0.7 });
  M.stoneExt = std({ map: T(sets.stone.map, [1, 1]), roughnessMap: T(sets.stone.rough, [1, 1], false), roughness: 1, normalMap: nm ? T(sets.stone.normal, [1, 1], false) : null, envMapIntensity: 0.9 });
  M.stoneInlay = stdI({ map: T(sets.stone.map, [1, 1]), color: new THREE.Color(PALETTE.floorTint), roughness: 0.2, roughnessMap: null, envMapIntensity: 0.6 });
  M.oak = stdI({ map: T(sets.oak.map, [1, 1]), roughnessMap: T(sets.oak.rough, [1, 1], false), roughness: 1, normalMap: nm ? T(sets.oak.normal, [1, 1], false) : null, envMapIntensity: 0.5 });
  M.oakExt = std({ map: T(sets.oak.map, [1, 1]), roughnessMap: T(sets.oak.rough, [1, 1], false), roughness: 1, normalMap: nm ? T(sets.oak.normal, [1, 1], false) : null, envMapIntensity: 0.9 });
  M.walnut = stdI({ map: T(sets.walnut.map, [1, 1]), roughnessMap: T(sets.walnut.rough, [1, 1], false), roughness: 1, normalMap: nm ? T(sets.walnut.normal, [1, 1], false) : null, envMapIntensity: 0.5 });
  M.plaster = stdI({ map: T(sets.plaster.map, [1, 1]), normalMap: nm ? T(sets.plaster.normal, [1, 1], false) : null, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.92, envMapIntensity: 0.4 });
  M.ceiling = stdI({ map: T(sets.plaster.map, [1, 1]), color: new THREE.Color(PALETTE.ceilingTint), roughness: 0.95, envMapIntensity: 0.25 });
  M.ceilDark = stdI({ color: PALETTE.ceilDark, roughness: 0.95, envMapIntensity: 0.15 });
  M.slat = stdI({ map: T(sets.walnut.map, [1, 1]), normalMap: nm ? T(sets.walnut.normal, [1, 1], false) : null, color: new THREE.Color(PALETTE.slatTint), roughness: 0.66, envMapIntensity: 0.25 });   // ceiling slats: matte, never a mirror for the spots
  M.paver = std({ map: T(sets.paver.map, [1, 1]), normalMap: nm ? T(sets.paver.normal, [1, 1], false) : null, roughness: 0.82, envMapIntensity: 0.7 });
  M.grass = std({ map: T(sets.grass.map, [1, 1]), roughness: 0.95, envMapIntensity: 0.5 });
  M.sand = std({ map: T(sets.sand.map, [1, 1]), roughness: 0.98, envMapIntensity: 0.5 });
  M.leaf = std({ map: T(sets.leaf.map, [1, 1]), roughness: 0.85, envMapIntensity: 0.6 });
  M.trunk = std({ map: T(sets.trunk.map, [1, 1]), normalMap: nm ? T(sets.trunk.normal, [1, 1], false) : null, roughness: 0.9, envMapIntensity: 0.4 });
  M.frond = std({ map: tex(sets.frond, { anisotropy: an }), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, envMapIntensity: 0.6 });
  M.bronze = stdI({ color: PALETTE.bronze, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.0 });
  M.brass = stdI({ color: PALETTE.brass, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 });
  M.charcoal = stdI({ color: PALETTE.charcoal, roughness: 0.6, envMapIntensity: 0.5 });
  M.glass = new THREE.MeshStandardMaterial({ color: PALETTE.glass, metalness: 0.0, roughness: 0.04, transparent: true, opacity: 0.16, envMap, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
  M.water = phys({ color: PALETTE.water, metalness: 0.0, roughness: 0.03, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.02 });
  // light sources: HDR values, not tone-mapped so they read as emitters
  M.led = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.ledWarm).multiplyScalar(3.2), toneMapped: false });
  M.ledCool = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.ledCool).multiplyScalar(2.6), toneMapped: false });
  M.glow = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(PALETTE.ledWarm).multiplyScalar(0.8) });
  return M;
}

/** soft gradient sprite texture used for additive light "glow" planes under LED strips */
export function glowTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.58, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
