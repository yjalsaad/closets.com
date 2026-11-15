/* The glass lift in the main hall (ground floor): a lit glass tower with a bronze frame and a brass cab that rises when somebody rides; the sign over the door says
 * "Floor 2 · Bloom Meeting"; a warm light ring on the floor marks where to stand. Lazy: built with the Bloom chunk after the first interactive moment. Few draws (merged). */
import * as THREE from 'three';
import { bevelBox, placed, prep } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { makePanel } from '../products/screens';
import { drawBloomSign, DESIGN } from './panelsBloom';
import { LIFT_G, LIFT_STAND } from './layout';
import { BLOOM_LIGHT } from '../../bloom/palette';

export function buildHallLift({ M, tier, lang = 'en', glowTex = null, reduced = false }) {
  const group = new THREE.Group(); group.name = 'hall-lift'; group.position.set(LIFT_G.x, 0, LIFT_G.z);
  const { w, d, height: H } = LIFT_G, env = M.stone.envMap;
  const glass = M.glassClear.clone(); glass.opacity = 0.14; glass.envMapIntensity = 1.2;
  const orange = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLOOM_LIGHT.orange).multiplyScalar(1.4), toneMapped: false });
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLOOM_LIGHT.warm).multiplyScalar(2.2), toneMapped: false });
  const bronze = M.bronze, brass = M.brass, bronzeParts = [], brassParts = [], glowParts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { bronzeParts.push(prep(placed(bevelBox(0.1, H, 0.1, { b: 0.004 }), { x: sx * w / 2, y: H / 2, z: sz * d / 2 }))); glowParts.push(prep(placed(new THREE.BoxGeometry(0.016, H - 0.4, 0.016), { x: sx * (w / 2 - 0.07), y: H / 2, z: sz * (d / 2 - 0.07) }))); }
  for (const y of [0.04, 3.6, H - 0.06]) { bronzeParts.push(prep(placed(bevelBox(w + 0.1, 0.08, 0.1, { b: 0.004 }), { x: 0, y, z: d / 2 })), prep(placed(bevelBox(w + 0.1, 0.08, 0.1, { b: 0.004 }), { x: 0, y, z: -d / 2 })), prep(placed(bevelBox(0.1, 0.08, d, { b: 0.004 }), { x: -w / 2, y, z: 0 })), prep(placed(bevelBox(0.1, 0.08, d, { b: 0.004 }), { x: w / 2, y, z: 0 }))); }
  bronzeParts.push(prep(placed(bevelBox(w + 0.3, 0.45, d + 0.3, { b: 0.02 }), { x: 0, y: H + 0.2, z: 0 })));   // cap
  brassParts.push(prep(placed(bevelBox(w + 0.3, 0.12, d + 0.3, { b: 0.01 }), { x: 0, y: 0.06, z: 0 })));        // plinth
  brassParts.push(prep(placed(bevelBox(0.06, 2.6, 0.06, { b: 0.004 }), { x: -0.5, y: 1.25, z: d / 2 + 0.04 })), prep(placed(bevelBox(0.06, 2.6, 0.06, { b: 0.004 }), { x: 0.5, y: 1.25, z: d / 2 + 0.04 })));   // door posts
  { const m = new THREE.Mesh(mergeGeometries(bronzeParts), bronze); group.add(m); const b = new THREE.Mesh(mergeGeometries(brassParts), brass); group.add(b); const l = new THREE.Mesh(mergeGeometries(glowParts), orange); group.add(l); }
  // glass: back and two sides full height; the front has the door gap (two panes) above a header
  for (const [pw, ph, x, y, z, ry] of [[w, H - 0.2, 0, H / 2, -d / 2, 0], [d, H - 0.2, -w / 2, H / 2, 0, Math.PI / 2], [d, H - 0.2, w / 2, H / 2, 0, -Math.PI / 2], [(w - 1.0) / 2, H - 0.2, -(w + 1.0) / 4, H / 2, d / 2, 0], [(w - 1.0) / 2, H - 0.2, (w + 1.0) / 4, H / 2, d / 2, 0]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), glass); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); }
  // the cab: brass floor + ceiling frame with a lit roof, glass walls; it rises when somebody rides
  const cab = new THREE.Group(); { const cf = []; cf.push(prep(placed(bevelBox(w - 0.3, 0.05, d - 0.3, { b: 0.004 }), { y: 0.14 })), prep(placed(bevelBox(w - 0.3, 0.06, d - 0.3, { b: 0.004 }), { y: 2.7 })));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cf.push(prep(placed(bevelBox(0.05, 2.6, 0.05, { b: 0.003 }), { x: sx * (w / 2 - 0.15), y: 1.42, z: sz * (d / 2 - 0.15) })));
    cab.add(new THREE.Mesh(mergeGeometries(cf), brass)); { const roof = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.01, d - 0.5), warm); roof.position.set(0, 2.66, 0); cab.add(roof); }
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 2.5), glass); g.position.set(0, 1.4, -(d / 2 - 0.15)); cab.add(g); const g2 = new THREE.Mesh(new THREE.PlaneGeometry(d - 0.3, 2.5), glass); g2.position.set(-(w / 2 - 0.15), 1.4, 0); g2.rotation.y = Math.PI / 2; cab.add(g2); const g3 = g2.clone(); g3.position.x = w / 2 - 0.15; cab.add(g3); }
  group.add(cab);
  // sign over the door (canvas, same pipeline as the VIP panels)
  const sign = makePanel(1536, 384, (g, pw, ph, l) => drawBloomSign(g, pw, ph, { lang: l }), lang, { design: DESIGN.sign, anisotropy: 8 });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: sign.tex, toneMapped: false })); m.position.set(0, 3.2, d / 2 + 0.07); group.add(m); }
  // the floor ring where to stand (in the hall frame) and a soft light pool
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.6, 48).rotateX(-Math.PI / 2), orange); ring.position.set(LIFT_STAND[0] - LIFT_G.x, 0.016, LIFT_STAND[1] - LIFT_G.z); group.add(ring);
  if (glowTex) { const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(BLOOM_LIGHT.orange).multiplyScalar(0.5) })); pool.position.set(0, 0.02, d / 2 + 1.1); group.add(pool); }
  const st = { ride: 0, t: 0 };
  return {
    group, cab,
    /** 0..1: the cab rises up the tower (the visitor rides while the screen fades) */
    setRide(k) { st.ride = Math.max(0, Math.min(1, k)); cab.position.y = st.ride * (H - 3.2); },
    update(dt) { st.t += dt; if (!reduced) { ring.material.color.copy(new THREE.Color(BLOOM_LIGHT.orange).multiplyScalar(1.0 + 0.4 * Math.sin(st.t * 2))); } },
    setLanguage(l) { sign.redraw(l); },
    dispose() { sign.tex.dispose(); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
