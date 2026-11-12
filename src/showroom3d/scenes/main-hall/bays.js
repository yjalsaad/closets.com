/* Eight department bays (Phase 4: kitchens, wardrobes and doors are furnished by scenes/products; the other five stay EMPTY): floor inlay, brass zone border, timber portal, back-lit alcove wall and a sign.
 * Nothing is furnished here in Phase 1/2 and the sign says so ("To be furnished"). */
import * as THREE from 'three';
import { HALL, BAY } from '../../3d/dimensions';
import { PALETTE } from '../../3d/palette';
import { box, mesh, worldUV } from '../../3d/geom';
import { layoutBays } from './departments';
import { makeSignTexture, redrawSign, SIGN_W, SIGN_H } from './signs';

export function buildBays({ M, lang, products = null }) {
  const g = new THREE.Group(); g.name = 'bays';
  const bays = layoutBays();
  const signs = [], glows = new Map();
  const alcove = new THREE.MeshStandardMaterial({ color: PALETTE.stoneMid, roughness: 0.9, emissive: new THREE.Color(PALETTE.ledWarm), emissiveIntensity: 0.07 });
  for (const b of bays) {
    const s = b.side === 'left' ? -1 : 1, wallX = s * HALL.halfWidth, inward = -s;   // inward: direction toward the nave
    const grp = new THREE.Group(); grp.position.set(b.x, 0, b.z); g.add(grp);
    // floor inlay
    const ig = new THREE.PlaneGeometry(b.depth - 0.6, b.width - 0.6); ig.rotateX(-Math.PI / 2); worldUV(ig, 2.4);
    const inlay = new THREE.Mesh(ig, M.stoneInlay); inlay.position.y = 0.006; inlay.receiveShadow = true; grp.add(inlay);
    // brass zone border
    const bw = b.depth - 0.6, bd = b.width - 0.6, t = 0.035;
    for (const [w, d, x, z] of [[bw, t, 0, bd / 2], [bw, t, 0, -bd / 2], [t, bd, bw / 2, 0], [t, bd, -bw / 2, 0]]) grp.add(mesh(box(w, 0.012, d), M.brass, { x, y: 0.012, z }));
    // interaction highlight (Phase 3 stub): a soft additive wash over the floor inlay, faded in when the visitor stands in the zone and pulsed on E
    const hm = new THREE.MeshBasicMaterial({ color: PALETTE.brandOrange, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const hg = new THREE.PlaneGeometry(b.depth - 0.5, b.width - 0.5); hg.rotateX(-Math.PI / 2);
    const hl = new THREE.Mesh(hg, hm); hl.position.y = 0.02; hl.renderOrder = 3; hl.visible = false; grp.add(hl);
    glows.set(b.id, { mesh: hl, mat: hm, near: 0, nearGoal: 0, pulse: 0 });
    // alcove: lit back wall + timber portal on the side wall
    const lx = wallX - b.x + inward * 0.15;   // in front of the wall slats
    const furnished = !!(products && products.attach(b, grp));      // Phase 4: a furnished bay brings its own feature wall; the plain lit alcove plane is only for empty bays
    if (!furnished) grp.add(mesh(new THREE.PlaneGeometry(b.width - 0.5, 3.8), alcove, { x: lx, y: 2.5, z: 0, ry: inward * Math.PI / 2 }));
    for (const dz of [-1, 1]) grp.add(mesh(box(0.34, 4.7, 0.3, 1.2), M.walnut, { x: lx + inward * 0.17, y: 2.35, z: dz * (b.width / 2 - 0.15), cast: true, receive: true }));
    grp.add(mesh(box(0.34, 0.32, b.width, 1.2), M.walnut, { x: lx + inward * 0.17, y: 4.56, z: 0, cast: true, receive: true }));
    // sign
    const tex = makeSignTexture(b, lang);
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(PALETTE.signTint) });
    grp.add(mesh(new THREE.PlaneGeometry(SIGN_W, SIGN_H), mat, { x: lx + inward * 0.05, y: BAY.signY, z: 0, ry: inward * Math.PI / 2 }));
    signs.push({ tex, bay: b });
  }
  const relabel = (l) => signs.forEach((s) => redrawSign(s.tex, s.bay, l));
  /** zone highlight API used by the first-person explorer */
  const highlight = {
    setNear(id) { glows.forEach((v, k) => { v.nearGoal = k === id ? 1 : 0; }); },
    pulse(id) { const v = glows.get(id); if (v) v.pulse = 1; },
    tick(dt) {
      glows.forEach((v) => {
        v.near += (v.nearGoal - v.near) * (1 - Math.exp(-6 * dt)); v.pulse = Math.max(0, v.pulse - dt / 1.6);
        const o = v.near * 0.1 + v.pulse * (0.35 + 0.15 * Math.sin(v.pulse * 12));
        v.mat.opacity = o; v.mesh.visible = o > 0.004;
      });
    },
  };
  return { group: g, bays, relabel, highlight };
}
