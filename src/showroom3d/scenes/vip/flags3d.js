/* The two national flags of the VIP meeting room (Kingdom of Bahrain, Kingdom of Saudi Arabia): two brass flagpoles with a cross-bar, flanking the big wall screen, the cloth hanging
 * from the bar. Equal pole height, equal cloth height (each flag at its OFFICIAL proportions: Bahrain 3:5, Saudi Arabia 2:3, so the widths differ a little, as protocol has it).
 *
 * Respect / accuracy rules, all enforced here and unit-tested (__tests__/vipFlags.test.js):
 *  - the cloth texture is the flag's own vector drawing (vip/flags.js) rasterised once to a canvas: nothing is re-drawn by hand and the Saudi inscription is never typed;
 *  - the cloth is double-faced and the shahada reads the right way round on BOTH faces (the back face uses a flipped texture so it is not a mirror image);
 *  - the cloth only ever moves along its depth axis (z), more towards its lower / fly part and never at the bar, so the inscription and emblem are not stretched, squeezed or hidden;
 *  - flags stand upright on poles at the room's back wall: never on the floor, never small, never as trim; the poles are solid (small colliders in scenes/vip/layout.js);
 *  - motion: gentle, only while somebody is in the room (or presenting), not on the low tier, not under reduced motion (a still, softly draped cloth instead);
 *  - budget: 4 cloth meshes + 1 merged brass mesh (5 draw calls), textures 768 / 1024 / 1280 px wide by tier, geometry / textures disposed with the room. */
import * as THREE from 'three';
import { prep, placed } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { FLAG_IDS, FLAGS, flagAspect, drawFlag } from '../../vip/flags';
import { VIP_FLAGS } from './layout';

/** where the flags stand (metres, scenes/vip/layout.js): either side of the wall screen. Bahrain on the viewer's left, Saudi Arabia on the right. */
export const FLAG_RIG = VIP_FLAGS;
export const flagPlacements = () => FLAG_IDS.map((id, i) => ({ id, x: (i === 0 ? -1 : 1) * FLAG_RIG.poleX, z: FLAG_RIG.poleZ, w: FLAG_RIG.clothH * flagAspect(id), h: FLAG_RIG.clothH }));
/** cloth mesh resolution + motion by tier */
export const CLOTH = { high: { seg: [28, 14], amp: 0.04, hz: 24 }, medium: { seg: [20, 10], amp: 0.032, hz: 15 }, low: { seg: [12, 6], amp: 0.016, hz: 0 } };
export const TEX_WIDTH = { high: 1280, medium: 1024, low: 768 };
/** how far the cloth is pushed along its depth axis at (u across 0..1 from the hoist, v down 0..1 from the bar) and time t. 0 at the bar, growing downwards; never a lateral / vertical move. Pure. */
export function clothOffset(u, v, t, amp) {
  const pull = Math.pow(Math.max(0, Math.min(1, v)), 1.35), wave = 0.55 * Math.sin(u * 7.2 + t * 1.15) + 0.3 * Math.sin(u * 13.1 - t * 0.8 + v * 2.1) + 0.15 * Math.sin(v * 5.0 + t * 0.6);
  return amp * pull * (wave + 0.55 * Math.sin(u * 4.4 + 0.8));   // the second term is the still drape (folds) that remains even when t is frozen
}
const BAR_DZ = 0.05;   // distance of the cross-bar in front of the pole axis (m)
const posAttr = (geo) => geo.attributes.position;

export function buildFlags({ tier, reduced = false, brass, makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } }) {
  const tid = CLOTH[tier && tier.id] ? tier.id : 'medium', cfg = CLOTH[tid], tw = TEX_WIDTH[tid], R = FLAG_RIG;
  const group = new THREE.Group(); group.name = 'vip-flags';
  const place = flagPlacements(), disposables = [], cloths = [];
  // ---- poles: base plate, pole, finial, cross-bar with two end knobs (one merged brass mesh) ----
  const parts = [];
  for (const p of place) {
    parts.push(prep(placed(new THREE.CylinderGeometry(R.baseR, R.baseR + 0.02, R.baseH, 28), { x: p.x, y: R.baseH / 2, z: p.z })));
    parts.push(prep(placed(new THREE.CylinderGeometry(R.poleR, R.poleR * 1.15, R.poleH, 16), { x: p.x, y: R.poleH / 2, z: p.z })));
    parts.push(prep(placed(new THREE.SphereGeometry(0.045, 18, 12), { x: p.x, y: R.poleH + 0.03, z: p.z })));
    const bw = p.w + 0.1;
    parts.push(prep(placed(new THREE.CylinderGeometry(0.013, 0.013, bw, 12), { x: p.x, y: R.barY, z: p.z + BAR_DZ, rz: Math.PI / 2 })));   // the cross-bar stands clear IN FRONT of the pole, the cloth hangs in front of both
    parts.push(prep(placed(new THREE.CylinderGeometry(0.011, 0.011, BAR_DZ, 10), { x: p.x, y: R.barY, z: p.z + BAR_DZ / 2, rx: Math.PI / 2 })));   // the bracket that joins bar and pole
    for (const s of [-1, 1]) parts.push(prep(placed(new THREE.SphereGeometry(0.026, 14, 10), { x: p.x + s * bw / 2, y: R.barY, z: p.z + BAR_DZ })));
  }
  const poles = new THREE.Mesh(mergeGeometries(parts), brass); poles.name = 'vip-flag-poles'; poles.castShadow = false; poles.receiveShadow = true; group.add(poles); disposables.push(poles.geometry);
  // ---- cloth: one segmented plane per flag (shared by its two faces) ----
  for (const p of place) {
    const F = FLAGS[p.id], th = Math.round(tw / flagAspect(p.id)), cv = makeCanvas(tw, th), g = cv.getContext('2d');
    if (g) drawFlag(g, p.id, 0, 0, tw, th);
    const front = new THREE.CanvasTexture(cv); front.colorSpace = THREE.SRGBColorSpace; front.anisotropy = tid === 'low' ? 4 : 8; front.generateMipmaps = true; front.minFilter = THREE.LinearMipmapLinearFilter;
    const back = front.clone(); back.repeat.set(-1, 1); back.offset.set(1, 0); back.needsUpdate = true;   // seen from behind, u runs the other way: flipping it keeps the drawing un-mirrored (the shahada reads correctly, the sword stays under it)
    const mk = (map, side) => new THREE.MeshStandardMaterial({ map, side, roughness: 0.88, metalness: 0, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.4 });
    const mf = mk(front, THREE.FrontSide), mb = mk(back, THREE.BackSide);
    const geo = new THREE.PlaneGeometry(p.w, p.h, cfg.seg[0], cfg.seg[1]); geo.userData.base = Float32Array.from(posAttr(geo).array);
    const y = R.barY - p.h / 2 - 0.004, z = p.z + BAR_DZ + 0.022;   // in front of the bar, so the pole can never show through the flag
    const a = new THREE.Mesh(geo, mf), b = new THREE.Mesh(geo, mb); for (const m of [a, b]) { m.position.set(p.x, y, z); m.receiveShadow = false; m.castShadow = false; m.userData.flag = p.id; group.add(m); }
    a.name = 'vip-flag-' + p.id; b.name = 'vip-flag-' + p.id + '-back';
    cloths.push({ id: p.id, geo, w: p.w, h: p.h, uv: geo.attributes.uv, mats: [mf, mb], tex: [front, back], meshes: [a, b], F });
    disposables.push(geo, mf, mb, front, back);
  }
  const state = { t: 0, acc: 0, reduced: !!reduced, active: false };
  const shape = (t) => {
    for (const c of cloths) {
      const pa = posAttr(c.geo), base = c.geo.userData.base, uv = c.uv;
      for (let i = 0; i < pa.count; i++) { const u = uv.getX(i), v = 1 - uv.getY(i); pa.setXYZ(i, base[i * 3], base[i * 3 + 1], base[i * 3 + 2] + clothOffset(u, v, t, cfg.amp)); }
      pa.needsUpdate = true; c.geo.computeVertexNormals();
    }
  };
  shape(0);   // the still drape
  return {
    group, cloths, state, poles,
    /** frame update: `active` = somebody is in the room / presenting. Animates only then, only on tiers that allow it, never under reduced motion. */
    update(dt, active) {
      state.active = !!active; if (!active || state.reduced || !cfg.hz) return false;
      state.t += dt; state.acc += dt; if (state.acc < 1 / cfg.hz) return false; state.acc = 0; shape(state.t); return true;
    },
    setReduced(v) { state.reduced = !!v; if (state.reduced) shape(0); },
    /** QA / tests: freeze the cloth at time t */
    freeze(t) { state.t = t; shape(t); },
    dispose() { disposables.forEach((d) => d && d.dispose && d.dispose()); },
  };
}
