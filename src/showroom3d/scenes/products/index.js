/* Products manager: builds the three furnished departments + the Ikhtarha stage, owns the interior environment, the moving key light,
 * hover / focus outlines, picking and the per-frame update. The engine only calls build / update / dispose. */
import * as THREE from 'three';
import { PALETTE as P } from '../../3d/palette';
import { buildInteriorEnv } from '../../3d/pbr';
import { createRegistry } from '../../products/registry';
import { PRODUCTS, productForDept, toWorld, viewWorld, STAGE } from '../../products/catalog';
import { createProductTextures, createProductMaterials, applyFinish } from './materials';
import { buildKitchen } from './kitchen';
import { buildWardrobe } from './wardrobe';
import { buildDoor } from './door';
import { buildBedroom } from './bedroom';
import { buildWalkin } from './walkin';
import { buildLiving } from './living';
import { buildStudio } from './studio';
import { buildLounge } from './lounge';
import { buildStage } from './ikhtarha';
import { buildVipRoom } from '../vip/vipRoom';

const BUILDERS = { kitchen: buildKitchen, wardrobe: buildWardrobe, door: buildDoor, bedroom: buildBedroom, walkin: buildWalkin, living: buildLiving, studio: buildStudio, lounge: buildLounge };
const KEY_E = { kitchen: 1.5, wardrobe: 5.2, door: 3.0, bedroom: 3.2, walkin: 3.2, living: 3.0, studio: 3.0, lounge: 3.0 };
const ANCHORS = { kitchen: { local: [-1.2, 0.8, 0], spot: [1.2, 3.1, 0.2] }, wardrobe: { local: [-2.0, 1.2, 0], spot: [0.9, 3.1, 0] }, door: { local: [-1.0, 1.2, 0], spot: [1.4, 3.1, 0] },
  bedroom: { local: [-2.0, 0.9, 0.2], spot: [1.0, 3.1, 0.2] }, walkin: { local: [-1.6, 1.1, 0], spot: [1.0, 3.1, 0] }, living: { local: [-1.6, 1.0, 0], spot: [1.0, 3.1, 0] }, studio: { local: [-1.6, 1.0, 0], spot: [1.0, 3.1, 0] }, lounge: { local: [-1.6, 1.0, 0], spot: [1.0, 3.1, 0] } };

function outlineObject(color) {
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95, toneMapped: false }));
  m.renderOrder = 20; m.visible = false; m.frustumCulled = false; return m;
}

export function buildProducts({ renderer, hallM, tier, lang, bays, reduced = false, logoTex = null }) {
  const env = buildInteriorEnv(renderer), tex = createProductTextures(tier), M = createProductMaterials({ tier, env, tex });
  const registry = createRegistry(), kits = {}, bayOf = {};
  for (const b of bays) { const id = b.product; if (id) bayOf[id] = b; }
  for (const id of Object.keys(BUILDERS)) { kits[id] = BUILDERS[id]({ M, tier, registry, reduced, lang, logoTex }); applyFinish(M, id, kits[id].state.finishId); }
  const stage = buildStage({ M: { ...hallM, brass: M.brass, bronze: M.bronze }, tier, lang });

  // ---- lights: ONE moving key spot (shadow on medium / high) + one fill point light; they glide to whichever product / stage the visitor is nearest to
  const key = new THREE.SpotLight(P.ledCool, 40, 14, 0.56, 0.8, 1.6); key.target = new THREE.Object3D();
  if (tier.id !== 'low') { key.castShadow = true; key.shadow.mapSize.set(tier.id === 'high' ? 2048 : 1024, tier.id === 'high' ? 2048 : 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025; key.shadow.radius = 3; key.shadow.camera.near = 0.4; key.shadow.camera.far = 12; }
  const fill = tier.id === 'low' ? null : new THREE.PointLight(P.ledCool, 6, 9, 2);
  const vip = buildVipRoom({ M, tier, lang, logoTex, reduced });
  const lights = [key, key.target, ...(fill ? [fill] : []), ...vip.lights];
  const anchors = [...Object.keys(kits).map((id) => { const b = bayOf[id], a = ANCHORS[id]; return { id, at: toWorld(b, a.local), spot: toWorld(b, a.spot), E: KEY_E[id], fillK: KEY_E[id] / 1.5 }; }), { id: 'stage', at: [STAGE.x, 0.9, STAGE.z], spot: [STAGE.x + 0.4, 8.6, STAGE.z + 1.2], E: 3.0, fillK: 1.2 }];
  const cur = { at: new THREE.Vector3(...anchors[0].at), spot: new THREE.Vector3(...anchors[0].spot), I: 40, level: 1, fillK: 1 };
  let anchorId = null;
  const lightTo = (a, dt, snap) => {
    cur.fillK += ((a.fillK || 1) - cur.fillK) * (snap ? 1 : 1 - Math.exp(-3.5 * dt));
    const k = snap ? 1 : 1 - Math.exp(-3.5 * dt), at = new THREE.Vector3(...a.at), sp = new THREE.Vector3(...a.spot);
    cur.at.lerp(at, k); cur.spot.lerp(sp, k); key.position.copy(cur.spot); key.target.position.copy(cur.at); key.target.updateMatrixWorld();
    const d = cur.spot.distanceTo(cur.at); key.distance = d * 2.6; key.intensity = a.E * d * d * 1.25 * cur.level;
    if (fill) { fill.position.set(cur.at.x * 0.5 + cur.spot.x * 0.5, cur.at.y + 0.7, cur.at.z * 0.5 + cur.spot.z * 0.5); fill.intensity = 2.0 * cur.fillK * cur.level; }
  };
  lightTo(anchors[0], 0, true);

  // ---- outlines (hover = soft white, focus = brand orange); one draw call each ----
  const hover = outlineObject(P.hoverRing), focus = outlineObject(P.focusRing), _box = new THREE.Box3(), _c = new THREE.Vector3(), _s = new THREE.Vector3();
  const fit = (o, partId) => {
    if (!partId) { o.visible = false; return; }
    const e = registry.get(partId); if (!e) { o.visible = false; return; }
    kits[e.product].partBox(partId, _box); if (_box.isEmpty()) { o.visible = false; return; }
    _box.getCenter(_c); _box.getSize(_s); o.position.copy(_c); o.scale.copy(_s).addScalar(0.012); o.visible = true;
  };

  const api = {
    kits, registry, stage, vip, lights, group: new THREE.Group(), outlines: [hover, focus], env, M, bayOf,
    /** put each product into its bay group (called by buildBays); right-hand bays face -x, so their frame is rotated by PI */
    attach(bay, grp) {
      const kit = bay.product && kits[bay.product]; if (!kit) return false;
      kit.group.rotation.y = bay.facing < 0 ? Math.PI : 0; kit.group.position.x = bay.facing * (kit.wallShift || 0); grp.add(kit.group); return true;
    },
    /** jump the key light straight to the anchor nearest the camera (used after a teleport and by QA; normally it glides) */
    snap(cam) { let best = anchors[0], bd = 1e9; for (const a of anchors) { const d = Math.hypot(cam.position.x - a.at[0], cam.position.z - a.at[2]) * (a.id === 'stage' ? 0.7 : 1); if (d < bd) { bd = d; best = a; } } lightTo(best, 0, true); },
    anchorId: () => anchorId || 'neutral',
    /** groups of the products farther than `d` metres from the camera (the floor-mirror pass skips them: it only needs what the visitor is next to) */
    farGroups(cam, d = 13) { const out = []; for (const [id, k] of Object.entries(kits)) { const b = bayOf[id]; if (Math.hypot(cam.position.x - b.x, cam.position.z - b.z) > d) out.push(k.group); } return out; },
    setLanguage(l) { stage.relabel(l); vip.setLanguage(l); for (const k of Object.values(kits)) if (k.relabel) k.relabel(l); },
    setReduced(v) { for (const k of Object.values(kits)) k.setReduced(v); vip.setReduced(v); },
    /** 0..1: hall light level from the intro (products wake up with the hall) */
    setLevel(k) { cur.level = k; stage.setLevel(k); vip.setLevel(k); },
    setHover(id) { if (registry.setHover(id)) fit(hover, id); },
    setFocusPart(id) { if (registry.setFocus(id)) fit(focus, id); },
    /** raycast: returns {id, distance, part} or null */
    pick(raycaster, { reach = 5, product = null } = {}) {
      const meshes = registry.hitMeshes(product); if (!meshes.length) return null;
      const hit = registry.pick(raycaster.intersectObjects(meshes, false), reach, product);
      return hit ? { ...hit, part: registry.get(hit.id) } : null;
    },
    toggle(partId) { const e = registry.get(partId); if (!e) return null; const st = kits[e.product].state; const open = st.toggle(partId); return { id: partId, open }; },
    productAt(deptId) { const p = productForDept(deptId); return p ? p.id : null; },
    focusView(productId, viewId) { const p = PRODUCTS[productId], v = p.views.find((x) => x.id === viewId) || p.views[0]; return viewWorld(bayOf[productId], v); },
    snapshot(productId) { return kits[productId].state.snapshot(); },
    setFinish(productId, fid) { kits[productId].setFinish(fid); },
    setLed(productId, on) { kits[productId].state.setLed(on); },
    toggleLed(productId) { return kits[productId].state.toggleLed(); },
    /** per frame. cam = THREE.PerspectiveCamera */
    update(dt, cam) {
      const inside = cam.position.z < 0.6;
      let best = null, bd = 1e9;
      for (const a of anchors) { const d = Math.hypot(cam.position.x - a.at[0], cam.position.z - a.at[2]) * (a.id === 'stage' ? 0.7 : 1); if (d < bd) { bd = d; best = a; } }
      if (best.id !== anchorId) anchorId = best.id;
      lightTo(best, dt, false);
      for (const [id, k] of Object.entries(kits)) {
        k.group.visible = inside;
        const b = bayOf[id], d = Math.hypot(cam.position.x - b.x, cam.position.z - b.z);
        k.lod.props.visible = d < 15; k.lod.detail.visible = d < 18; const far = k.far.on ? d > 8.8 : d > 9.8; k.setFar(far); k.setCasting(!far);
        if (inside) k.update(dt);
      }
      stage.group.visible = inside; vip.group.visible = inside; if (inside) vip.update(dt, cam);
      if (registry.hover) fit(hover, registry.hover);
      if (registry.focus) fit(focus, registry.focus);
    },
    stats() { let tris = 0; return { products: Object.keys(kits).length, tris }; },
    dispose() { for (const k of Object.values(kits)) k.dispose(); stage.dispose(); vip.dispose(); env.dispose && env.dispose(); },
  };
  api.group.add(stage.group, vip.group, ...api.outlines);
  return api;
}
