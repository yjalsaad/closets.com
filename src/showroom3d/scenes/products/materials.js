/* Physically based materials for the furnished departments, built from the procedural sets in 3d/pbr.js and swapped by finish
 * (finishes.js). Reflections come from the generated INTERIOR environment (pbr.buildInteriorEnv), not the sky.
 * Glass: transmission on the high tier (real refraction pass, drawn after the opaque pass by three); alpha-blended, depth-write-off,
 * renderOrder-sorted glass on the lighter tiers. */
import * as THREE from 'three';
import { PALETTE as P } from '../../3d/palette';
import { timberSet, marbleSet, brushedSet, peelSet, rugSet, toTex, hobTexture, tileSet, leafCardTexture, aoTexture, plankSet, weaveSet, boucleSet, terrazzoSet } from '../../3d/pbr';
import { viaReal } from '../../3d/realism/registry';
import { addMacroVariation } from '../../3d/materials';
import { getFinish } from '../../products/finishes';

const C = (n) => new THREE.Color(n);

export function createProductTextures(tier) {
  const S = tier.texSize >= 1024 ? 1024 : tier.texSize >= 512 ? 512 : 256, a = tier.anisotropy;
  const T = (set, k, srgb) => (set[k] ? toTex(set[k], { srgb, anisotropy: a }) : null);
  const mk = (set) => ({ map: T(set, 'map', true), rough: T(set, 'rough', false), normal: tier.normalMaps ? T(set, 'normal', false) : null });
  const marbleS = Math.max(256, S >> 1);
  return {
    oak: mk(timberSet(S, 3, 0)), walnut: mk(timberSet(S, 8, 1)),
    marble: { white: mk(marbleSet(marbleS, 11, 'white')), dark: mk(marbleSet(marbleS, 12, 'dark')), sand: mk(marbleSet(marbleS, 13, 'sand')), green: mk(marbleSet(marbleS, 14, 'green')), terrazzo: mk(terrazzoSet(marbleS, 91)) },
    boucle: mk(boucleSet(256, 77)),
    // real CC0 sets that have no procedural twin: an empty set until the lazy download lands (materials fall back to their plain colour / other maps)
    velvet: mk(viaReal('velvet', 512, () => ({}))), leather: mk(viaReal('leather', 512, () => ({}))), stucco: mk(viaReal('plaster', S, () => ({}))), travertine: mk(viaReal('stone', S, () => ({}))),
    tiles: { sand: mk(tileSet(S >= 1024 ? 1024 : S, 41, 'sand')), white: mk(tileSet(S >= 1024 ? 1024 : S, 42, 'white')), dark: mk(tileSet(S >= 1024 ? 1024 : S, 43, 'dark')), grey: mk(tileSet(S >= 1024 ? 1024 : S, 44, 'grey')) },
    leaf: leafCardTexture(), ao: aoTexture(),
    planks: { oak: mk(plankSet(S >= 1024 ? 1024 : S, 61, 0)), walnut: mk(plankSet(S >= 1024 ? 1024 : S, 62, 1)) }, weave: mk(weaveSet(256, 71)),
    brushed: mk(brushedSet(256, 23)), peel: mk(peelSet(256, 29)), rug: mk(rugSet(Math.max(256, S >> 1), 31)), hob: hobTexture(),
  };
}

export function createProductMaterials({ tier, env, tex }) {
  const hi = tier.id === 'high';
  const E = (o) => ({ envMap: env, ...o });
  const std = (o) => new THREE.MeshStandardMaterial(E(o));
  const phys = (o) => new THREE.MeshPhysicalMaterial(E(o));
  const M = { tex, tier: tier.id };

  // ---- finish-swapped surfaces: one material per role per product ----
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.colorSpace = THREE.SRGBColorSpace; white.needsUpdate = true; M.white = white;
  const surface = () => phys({ map: tex.oak.map, roughnessMap: tex.oak.rough, normalMap: tex.oak.normal, roughness: 0.6, metalness: 0, envMapIntensity: 0.42, clearcoat: tier.id === 'low' ? 0 : 0.1, clearcoatRoughness: 0.35, normalScale: new THREE.Vector2(0.55, 0.55) });
  const IDS = ['kitchen', 'wardrobe', 'door', 'bedroom', 'walkin', 'living', 'studio', 'lounge'], mapIds = (ids, f) => Object.fromEntries(ids.map((id) => [id, f(id)]));
  M.front = mapIds(IDS, surface);
  // reeded (fluted) geometry carries baked groove darkening in vertex colours, so it needs its own vertexColors twin of each finish material
  const fl = () => { const m = surface(); m.vertexColors = true; return m; };
  M.flute = mapIds(IDS, fl);
  M.wallFlute = fl(); M.wallFlute.map = white; M.wallFlute.roughnessMap = tex.peel.rough; M.wallFlute.normalMap = tex.peel.normal; M.wallFlute.color.setHex(P.wallGreige); M.wallFlute.roughness = 0.7;   // door-bay feature wall: neutral, never swapped, so the door stays the hero
  M.carcass = mapIds(IDS.filter((id) => id !== 'door'), surface);
  M.frame = { door: surface() };
  M.interior = std({ map: tex.oak.map, roughnessMap: tex.oak.rough, normalMap: tex.oak.normal, color: C(0xf2e6d2), roughness: 1, envMapIntensity: 0.5 });
  M.stone = phys({ color: C(0xe9e6df), map: tex.marble.white.map, roughness: 0.14, metalness: 0, envMapIntensity: 1.0, clearcoat: hi ? 0.5 : 0, clearcoatRoughness: 0.08, roughnessMap: tex.marble.white.rough });
  M.stones = { kitchen: M.stone, ...mapIds(['bedroom', 'walkin', 'living', 'studio', 'lounge'], () => M.stone.clone()) };     // one stone per department, so finishes never leak between bays
  M.plaster = std({ map: tex.stucco.map || white, roughnessMap: tex.peel.rough, normalMap: tex.stucco.normal || tex.peel.normal, normalScale: new THREE.Vector2(0.4, 0.4), color: C(P.plasterWarm), roughness: 0.85, envMapIntensity: 0.3 });
  M.mirror = phys({ color: 0x8d9a9e, metalness: 1, roughness: 0.14, envMapIntensity: 0.7 });
  M.mirrorSteel = phys({ color: C(P.steel), metalness: 1, roughness: 0.06, envMapIntensity: 1.3 });
  // per-bay floor zones (large-format polished stone, a different stone per room, so each bay reads as its own room): kitchen sand, wardrobe pale grey, door deep grey
  const floor = (t, ei = 0.85) => phys({ map: t.map, roughnessMap: t.rough, normalMap: t.normal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 1, metalness: 0, clearcoat: tier.id === 'low' ? 0 : 0.75, clearcoatRoughness: 0.06, envMapIntensity: ei });
  const plank = (t) => phys({ map: t.map, roughnessMap: t.rough, normalMap: t.normal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, metalness: 0, clearcoat: tier.id === 'low' ? 0 : 0.35, clearcoatRoughness: 0.28, envMapIntensity: 0.45 });
  M.floorBay = { kitchen: floor(tex.tiles.sand), wardrobe: floor(tex.tiles.white), door: floor(tex.tiles.grey, 0.7), bedroom: plank(tex.planks.oak), walkin: plank(tex.planks.walnut), living: floor(tex.tiles.dark, 0.8), studio: floor(tex.tiles.grey, 0.7), lounge: floor(tex.tiles.sand, 0.85) };
  // upholstery: woven micro-relief, tinted by the finish (bed, sofas, chairs, stools). One per department so a finish swap in one bay never touches another.
  const uph = () => std({ map: white, roughnessMap: tex.weave.rough, normalMap: tex.weave.normal, normalScale: new THREE.Vector2(0.9, 0.9), color: C(P.fabricLinen), roughness: 1, envMapIntensity: 0.3 });
  M.uphol = mapIds(['bedroom', 'walkin', 'living', 'studio', 'lounge'], uph);
  // upholstery character per room (reference look): bouclé in living / lounge / bedroom, velvet in the walk-in, leather on the studio chairs
  for (const id of ['living', 'lounge', 'bedroom']) { const u = M.uphol[id]; u.normalMap = tex.boucle.normal; u.roughnessMap = tex.boucle.rough; u.normalScale.set(1.5, 1.5); u.userData.uvScale = 2.2; }
  { const u = M.uphol.walkin; if (tex.velvet.normal) { u.normalMap = tex.velvet.normal; u.roughnessMap = tex.velvet.rough; u.normalScale.set(0.8, 0.8); } }
  { const u = M.uphol.studio; if (tex.leather.normal) { u.normalMap = tex.leather.normal; u.roughnessMap = tex.leather.rough; u.normalScale.set(0.9, 0.9); u.roughness = 0.75; } }
  // rugs: looped-wool organic rugs (oat / rust), a sheer curtain, the green marble of the walk-in vanity, travertine feature walls, opal globe pendants
  const rugOf = (color) => std({ map: white, normalMap: tier.normalMaps ? tex.boucle.normal : null, roughnessMap: tex.boucle.rough, normalScale: new THREE.Vector2(1.8, 1.8), color: C(color), roughness: 1, envMapIntensity: 0.15 });
  M.rugSoft = rugOf(P.rugOat); M.rugRust = rugOf(P.rugRust);
  M.curtain = new THREE.MeshStandardMaterial(E({ color: C(P.sheer), roughness: 1, metalness: 0, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.25, emissive: C(P.ledWarm), emissiveIntensity: 0.05 })); M.curtain.name = 'curtain';
  M.greenMarble = phys({ color: C(0xffffff), map: tex.marble.green.map, roughnessMap: tex.marble.green.rough, roughness: 0.16, metalness: 0, envMapIntensity: 1.0, clearcoat: hi ? 0.6 : 0, clearcoatRoughness: 0.06 });
  M.terrazzo = phys({ map: tex.marble.terrazzo.map, roughnessMap: tex.marble.terrazzo.rough, roughness: 1, metalness: 0, envMapIntensity: 0.9, clearcoat: hi ? 0.4 : 0, clearcoatRoughness: 0.1 });
  M.travertine = std({ map: tex.travertine.map || white, normalMap: tex.travertine.normal || null, roughnessMap: tex.travertine.rough || null, color: C(tex.travertine.map ? 0xffffff : P.travertineTint), roughness: tex.travertine.rough ? 1 : 0.8, envMapIntensity: 0.35 });
  for (const k of ['map', 'normalMap', 'roughnessMap']) if (M.travertine[k]) M.travertine[k].repeat.set(2.4, 1.3);   // the 6.2 x 3.3 m wall planes carry 0..1 UVs: about 2.6 m slabs
  if (tier.id !== 'low') { Object.values(M.floorBay).forEach((m) => addMacroVariation(m, 0.06, 0.45)); addMacroVariation(M.travertine, 0.07, 0.5); }
  M.globe = new THREE.MeshBasicMaterial({ color: C(P.globeOpal).multiplyScalar(1.9), toneMapped: false });
  // baked ambient occlusion decals (one shared material; geometry carries per-quad strength in the vertex alpha)
  M.ao = new THREE.MeshBasicMaterial({ map: tex.ao, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: true });
  M.leafCard = new THREE.MeshStandardMaterial(E({ map: tex.leaf, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.5, envMapIntensity: 0.5 }));
  M.paintWhite = std({ color: C(P.lacquerIvory), roughness: 0.7, envMapIntensity: 0.55 });
  M.plinth = std({ color: C(P.ink), roughness: 0.85, envMapIntensity: 0.2 });

  // ---- metals (anisotropic brushed brass / bronze) ----
  const metal = (color, rough) => phys({ color: C(color), metalness: 1, roughness: rough, anisotropy: hi || tier.id === 'medium' ? 0.65 : 0, anisotropyRotation: 0, roughnessMap: tex.brushed.rough, normalMap: tier.normalMaps ? tex.brushed.normal : null, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.15 });
  M.brass = metal(P.brassBrushed, 0.26);
  M.bronze = metal(P.bronzeDark, 0.42);
  M.metal = mapIds(IDS, (id) => (id === 'wardrobe' ? metal(P.bronzeDark, 0.42) : metal(P.brassBrushed, 0.3)));   // recoloured by applyFinish
  M.steel = phys({ color: C(P.steel), metalness: 1, roughness: 0.3, anisotropy: hi ? 0.5 : 0, roughnessMap: tex.brushed.rough, envMapIntensity: 1.0 });
  M.hob = phys({ map: tex.hob, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 });
  M.darkInterior = std({ color: C(0x1a1410), roughness: 1, envMapIntensity: 0.1 });

  // ---- glass ----
  M.glassSmoke = hi
    ? new THREE.MeshPhysicalMaterial(E({ color: C(P.glassSmoke), metalness: 0, roughness: 0.06, transmission: 0.92, thickness: 0.012, ior: 1.46, attenuationColor: C(P.glassSmoke), attenuationDistance: 0.22, envMapIntensity: 1.1, specularIntensity: 1 }))
    : new THREE.MeshStandardMaterial(E({ color: C(P.glassSmoke), metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.5, depthWrite: false, envMapIntensity: 1.3 }));
  M.glassSmoke.name = 'glassSmoke';
  // always-alpha twin (no transmission pass): used where a second full-scene refraction pass would double the draw calls of a busy bay (living)
  M.glassSmokeAlpha = new THREE.MeshStandardMaterial(E({ color: C(P.glassSmoke), metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.5, depthWrite: false, envMapIntensity: 1.3 }));
  M.glassClear = new THREE.MeshStandardMaterial(E({ color: C(0xdfeceb), metalness: 0, roughness: 0.04, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.6 }));

  // ---- props: vertex-coloured, so a whole shelf of objects is one draw call ----
  M.matte = std({ vertexColors: true, roughness: 0.88, envMapIntensity: 0.45 });
  M.ceramic = phys({ vertexColors: true, roughness: 0.22, clearcoat: hi ? 0.6 : 0, clearcoatRoughness: 0.1, envMapIntensity: 0.9 });
  M.fabric = std({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.35, normalMap: tex.peel.normal, normalScale: new THREE.Vector2(0.7, 0.7) });
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
    mat.clearcoat = M.tier === 'low' ? 0 : spec.kind === 'paint' ? 0.32 : 0.1; mat.clearcoatRoughness = spec.kind === 'paint' ? 0.3 : 0.35;   // satin lacquer sheen on paint, a light finish coat on timber
    mat.needsUpdate = true;
  };
  if (product === 'door') { apply(M.front.door, f.leaf); apply(M.frame.door, f.frame); apply(M.flute.door, f.frame); }
  else { apply(M.front[product], f.front); apply(M.carcass[product], f.carcass); apply(M.flute[product], f.front); }
  if (f.stone) {
    const s = M.tex.marble[f.stone], st = (M.stones && M.stones[product]) || M.stone; st.map = s.map; st.roughnessMap = s.rough; st.needsUpdate = true;
    st.color.setHex(0xe9e6df);
  }
  if (f.fabric != null && M.uphol && M.uphol[product]) { const u = M.uphol[product]; u.color.setHex(f.fabric).multiplyScalar(0.84); u.needsUpdate = true; }
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
