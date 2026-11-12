/* Physically based materials for the furnished departments, built from the procedural sets in 3d/pbr.js and swapped by finish
 * (finishes.js). Reflections come from the generated INTERIOR environment (pbr.buildInteriorEnv), not the sky.
 * Glass: transmission on the high tier (real refraction pass, drawn after the opaque pass by three); alpha-blended, depth-write-off,
 * renderOrder-sorted glass on the lighter tiers. */
import * as THREE from 'three';
import { PALETTE as P } from '../../3d/palette';
import { timberSet, marbleSet, brushedSet, peelSet, rugSet, toTex, hobTexture } from '../../3d/pbr';
import { getFinish } from '../../products/finishes';

const C = (n) => new THREE.Color(n);

export function createProductTextures(tier) {
  const S = tier.texSize >= 1024 ? 1024 : tier.texSize >= 512 ? 512 : 256, a = tier.anisotropy;
  const T = (set, k, srgb) => (set[k] ? toTex(set[k], { srgb, anisotropy: a }) : null);
  const mk = (set) => ({ map: T(set, 'map', true), rough: T(set, 'rough', false), normal: tier.normalMaps ? T(set, 'normal', false) : null });
  const marbleS = Math.max(256, S >> 1);
  return {
    oak: mk(timberSet(S, 3, 0)), walnut: mk(timberSet(S, 8, 1)),
    marble: { white: mk(marbleSet(marbleS, 11, 'white')), dark: mk(marbleSet(marbleS, 12, 'dark')), sand: mk(marbleSet(marbleS, 13, 'sand')) },
    brushed: mk(brushedSet(256, 23)), peel: mk(peelSet(256, 29)), rug: mk(rugSet(Math.max(256, S >> 1), 31)), hob: hobTexture(),
  };
}

export function createProductMaterials({ tier, env, tex }) {
  const hi = tier.id === 'high';
  const E = (o) => ({ envMap: env, ...o });
  const std = (o) => new THREE.MeshStandardMaterial(E(o));
  const phys = (o) => new THREE.MeshPhysicalMaterial(E(o));
  const M = { tex };

  // ---- finish-swapped surfaces: one material per role per product ----
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.colorSpace = THREE.SRGBColorSpace; white.needsUpdate = true; M.white = white;
  const surface = () => phys({ map: tex.oak.map, roughnessMap: tex.oak.rough, normalMap: tex.oak.normal, roughness: 0.6, metalness: 0, envMapIntensity: 0.42, clearcoat: hi ? 0.1 : 0, clearcoatRoughness: 0.35, normalScale: new THREE.Vector2(0.55, 0.55) });
  M.front = { kitchen: surface(), wardrobe: surface(), door: surface() };
  // reeded (fluted) geometry carries baked groove darkening in vertex colours, so it needs its own vertexColors twin of each finish material
  const fl = () => { const m = surface(); m.vertexColors = true; return m; };
  M.flute = { kitchen: fl(), wardrobe: fl(), door: fl() };
  M.wallFlute = fl(); M.wallFlute.map = white; M.wallFlute.roughnessMap = tex.peel.rough; M.wallFlute.normalMap = tex.peel.normal; M.wallFlute.color.setHex(P.wallGreige); M.wallFlute.roughness = 0.7;   // door-bay feature wall: neutral, never swapped, so the door stays the hero
  M.carcass = { kitchen: surface(), wardrobe: surface() };
  M.frame = { door: surface() };
  M.interior = std({ map: tex.oak.map, roughnessMap: tex.oak.rough, normalMap: tex.oak.normal, color: C(0xf2e6d2), roughness: 1, envMapIntensity: 0.5 });
  M.stone = phys({ map: tex.marble.white.map, roughness: 0.14, metalness: 0, envMapIntensity: 1.0, clearcoat: hi ? 0.5 : 0, clearcoatRoughness: 0.08, roughnessMap: tex.marble.white.rough });
  M.paintWhite = std({ color: C(P.lacquerIvory), roughness: 0.7, envMapIntensity: 0.55 });
  M.plinth = std({ color: C(P.ink), roughness: 0.85, envMapIntensity: 0.2 });

  // ---- metals (anisotropic brushed brass / bronze) ----
  const metal = (color, rough) => phys({ color: C(color), metalness: 1, roughness: rough, anisotropy: hi || tier.id === 'medium' ? 0.65 : 0, anisotropyRotation: 0, roughnessMap: tex.brushed.rough, normalMap: tier.normalMaps ? tex.brushed.normal : null, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.25 });
  M.brass = metal(P.brassBrushed, 0.3);
  M.bronze = metal(P.bronzeDark, 0.42);
  M.metal = { kitchen: metal(P.brassBrushed, 0.3), wardrobe: metal(P.bronzeDark, 0.42), door: metal(P.brassBrushed, 0.3) };   // recoloured by applyFinish
  M.steel = phys({ color: C(P.steel), metalness: 1, roughness: 0.3, anisotropy: hi ? 0.5 : 0, roughnessMap: tex.brushed.rough, envMapIntensity: 1.0 });
  M.hob = phys({ map: tex.hob, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 });
  M.darkInterior = std({ color: C(0x1a1410), roughness: 1, envMapIntensity: 0.1 });

  // ---- glass ----
  M.glassSmoke = hi
    ? new THREE.MeshPhysicalMaterial(E({ color: C(P.glassSmoke), metalness: 0, roughness: 0.06, transmission: 0.92, thickness: 0.012, ior: 1.46, attenuationColor: C(P.glassSmoke), attenuationDistance: 0.22, envMapIntensity: 1.1, specularIntensity: 1 }))
    : new THREE.MeshStandardMaterial(E({ color: C(P.glassSmoke), metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.5, depthWrite: false, envMapIntensity: 1.3 }));
  M.glassSmoke.name = 'glassSmoke';
  M.glassClear = new THREE.MeshStandardMaterial(E({ color: C(0xdfeceb), metalness: 0, roughness: 0.04, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.6 }));

  // ---- props: vertex-coloured, so a whole shelf of objects is one draw call ----
  M.matte = std({ vertexColors: true, roughness: 0.88, envMapIntensity: 0.45 });
  M.ceramic = phys({ vertexColors: true, roughness: 0.22, clearcoat: hi ? 0.6 : 0, clearcoatRoughness: 0.1, envMapIntensity: 0.9 });
  M.fabric = std({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.35, normalMap: tex.peel.normal, normalScale: new THREE.Vector2(1.2, 1.2) });
  M.propMetal = std({ vertexColors: true, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.1 });
  M.leaves = std({ vertexColors: true, roughness: 0.6, envMapIntensity: 0.55, side: THREE.DoubleSide });
  M.rug = std({ map: tex.rug.map, normalMap: tier.normalMaps ? tex.rug.normal : null, roughness: 1, envMapIntensity: 0.2 });
  M.rug.map.repeat.set(1, 1);

  // ---- light: emissive (HDR, not tone mapped so it reads as an emitter) and additive wash decals ----
  M.ledWarm = () => new THREE.MeshBasicMaterial({ color: C(P.ledWarm).multiplyScalar(3.4), toneMapped: false });
  M.wash = (map, k = 0.3) => new THREE.MeshBasicMaterial({ map, color: C(P.ledCool).multiplyScalar(k * 0.6), side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  M.shadowDecal = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, color: 0x000000, opacity: 1 });
  return M;
}

/** swap one product's finish: pure parameter changes on existing materials (no new shader programs, so no hitch). */
export function applyFinish(M, product, finishId) {
  const f = getFinish(product, finishId); if (!f) return null;
  const apply = (mat, spec) => {
    if (!mat || !spec) return;
    if (spec.kind === 'timber') {
      const set = spec.tone ? M.tex.walnut : M.tex.oak;
      mat.map = set.map; mat.roughnessMap = set.rough; mat.normalMap = set.normal; mat.roughness = 1; mat.color.setHex(0xffffff).lerp(C(spec.color), 0.28);
      mat.normalScale.set(0.7, 0.7);
    } else {
      mat.map = M.white; mat.roughnessMap = M.tex.peel.rough; mat.normalMap = M.tex.peel.normal; mat.color.setHex(spec.color); mat.roughness = spec.rough || 0.62; mat.normalScale.set(0.5, 0.5);
    }
    mat.needsUpdate = true;
  };
  if (product === 'door') { apply(M.front.door, f.leaf); apply(M.frame.door, f.frame); apply(M.flute.door, f.frame); }
  else { apply(M.front[product], f.front); apply(M.carcass[product], f.carcass); apply(M.flute[product], f.front); }
  if (f.stone) {
    const s = M.tex.marble[f.stone]; M.stone.map = s.map; M.stone.roughnessMap = s.rough; M.stone.needsUpdate = true;
    M.stone.color.setHex(0xffffff);
  }
  const mm = M.metal[product]; if (mm) { mm.color.setHex(f.metal === 'bronze' ? P.bronzeDark : P.brassBrushed); mm.roughness = f.metal === 'bronze' ? 0.42 : 0.3; }
  return f;
}

/** a static material that shows one finish (for the swatch board in the door bay): never swapped, so it always matches its label */
export function swatchMaterial(M, product, finishId) {
  const f = getFinish(product, finishId), spec = product === 'door' ? f.leaf : f.front, hi = M.front[product];
  const m = new THREE.MeshStandardMaterial({ envMap: hi.envMap, envMapIntensity: 0.7, roughness: 0.6, normalScale: new THREE.Vector2(0.7, 0.7) });
  if (spec.kind === 'timber') { const set = spec.tone ? M.tex.walnut : M.tex.oak; m.map = set.map; m.roughnessMap = set.rough; m.normalMap = set.normal; m.roughness = 1; m.color.setHex(0xffffff).lerp(C(spec.color), 0.28); }
  else { m.color.setHex(spec.color); m.roughness = spec.rough || 0.62; m.normalMap = M.tex.peel.normal; m.normalScale.set(0.5, 0.5); }
  return m;
}
