/* Site + landscaping: sand apron, paved forecourt and approach path, raised reflecting basins, lawns, clipped hedges,
 * date palms, olive trees, bollard lights and a hazy distant skyline for scale. */
import * as THREE from 'three';
import { SITE } from '../../3d/dimensions';
import { PALETTE } from '../../3d/palette';
import { mulberry32 } from '../../3d/noise';
import { box, mesh, instanced, worldUV } from '../../3d/geom';
import { buildPalms, buildShrubs, buildOlive } from '../../3d/vegetation';

function plane(w, d, mat, x, y, z, tile, receive = true) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); worldUV(g, tile);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = receive; return m;
}

export function buildLandscape({ M, tier }) {
  const g = new THREE.Group(); g.name = 'landscape';
  const far = SITE.size;
  g.add(plane(far, far, M.sand, 0, -0.02, 0, 10));

  // paved forecourt + approach path
  g.add(plane(52, 22, M.paver, 0, 0.04, 11, 3.2));
  g.add(plane(SITE.pathHalf * 2, 110, M.paver, 0, 0.036, 22 + 55, 3.2));
  // lawns
  const lawn = (x0, x1, z0, z1) => g.add(plane(x1 - x0, z1 - z0, M.grass, (x0 + x1) / 2, 0.01, (z0 + z1) / 2, 4));
  lawn(-80, -SITE.pathHalf - 0.3, 22, 130); lawn(SITE.pathHalf + 0.3, 80, 22, 130);
  lawn(-80, -26, -40, 22); lawn(26, 80, -40, 22);
  // kerbs along the path
  for (const s of [-1, 1]) g.add(mesh(box(0.28, 0.1, 110, 2.4), M.stoneExt, { x: s * (SITE.pathHalf + 0.14), y: 0.05, z: 77, receive: true }));

  // raised reflecting basins either side of the entrance
  for (const s of [-1, 1]) {
    const cx = s * 11.2, cz = 11, w = 10.4, d = 13;
    const t = 0.4, hgt = 0.26;
    g.add(mesh(box(w, hgt, t, 2.4), M.stoneExt, { x: cx, y: hgt / 2 + 0.04, z: cz - d / 2 + t / 2, cast: true, receive: true }));
    g.add(mesh(box(w, hgt, t, 2.4), M.stoneExt, { x: cx, y: hgt / 2 + 0.04, z: cz + d / 2 - t / 2, cast: true, receive: true }));
    g.add(mesh(box(t, hgt, d - 2 * t, 2.4), M.stoneExt, { x: cx - w / 2 + t / 2, y: hgt / 2 + 0.04, z: cz, cast: true, receive: true }));
    g.add(mesh(box(t, hgt, d - 2 * t, 2.4), M.stoneExt, { x: cx + w / 2 - t / 2, y: hgt / 2 + 0.04, z: cz, cast: true, receive: true }));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * t, d - 2 * t).rotateX(-Math.PI / 2), M.water); water.position.set(cx, 0.2, cz); g.add(water);
    g.add(mesh(box(w - 2 * t, 0.15, d - 2 * t), M.charcoal, { x: cx, y: 0.1, z: cz }));   // dark basin floor under the water
  }

  // hedges: clipped shrub rows
  const shrubs = [], r = mulberry32(11);
  for (let x = -25.5; x <= 25.5; x += 1.05) { if (Math.abs(x) < 5.2) continue; shrubs.push({ x, z: 22.7, r: 0.62, flat: 1.15, depth: 0.9 }); }
  for (const s of [-1, 1]) for (let z = 3; z <= 20; z += 1.6) shrubs.push({ x: s * 25.4, z, r: 0.7 + r() * 0.15, flat: 0.9 });
  for (const s of [-1, 1]) for (let z = 28; z <= 100; z += 1.9) shrubs.push({ x: s * (SITE.pathHalf + 1.2), z, r: 0.5, flat: 1.05 });
  g.add(buildShrubs(shrubs, M, 5));

  // date palms (count by tier) — most important first
  const slots = [];
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) slots.push({ x: s * (SITE.pathHalf + 2.2), z: 28 + i * 9, h: 8.5 + (i % 3) * 1.1, seed: i + (s > 0 ? 9 : 1) });
  for (const s of [-1, 1]) for (const z of [4, 12, 19]) slots.push({ x: s * 27.6, z, h: 9.5 + (z % 5) * 0.4, seed: z + 30 });
  const take = Math.min(slots.length, tier.palms);
  // interleave left/right so a reduced count stays symmetrical
  const order = []; for (let i = 0; i < slots.length; i += 2) { order.push(slots[i]); if (slots[i + 1]) order.push(slots[i + 1]); }
  const { trunks, crowns } = buildPalms(order.slice(0, take).map((p) => ({ ...p })), M, tier.fronds);
  g.add(trunks, crowns);

  // olives in the forecourt
  const oliveSpots = [[-20.5, 5], [20.5, 5], [-20.5, 15], [20.5, 15]];
  for (const [x, z] of oliveSpots.slice(0, tier.id === 'low' ? 2 : 4)) {
    g.add(mesh(box(2.2, 0.5, 2.2, 2.4), M.stoneExt, { x, y: 0.29, z, cast: true, receive: true }));
    g.add(buildOlive(M, x, z, 1.15, 0.54));
  }

  // bollard lights along the approach
  const bol = []; for (const s of [-1, 1]) for (let z = 26; z <= 90; z += 8) bol.push({ x: s * (SITE.pathHalf - 0.4), y: 0.45, z });
  g.add(instanced(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 10), M.charcoal, bol, { cast: true }));
  g.add(instanced(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10), M.led, bol.map((b) => ({ ...b, y: 0.9 }))));

  // hazy skyline: simple volumes at the horizon, tinted into the fog
  const sky = new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.fog).lerp(new THREE.Color(PALETTE.taupe), 0.35) });
  const sr = mulberry32(99), blocks = [];
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + sr() * 0.2; const rad = 210 + sr() * 70; const hh = 10 + sr() * 50;
    blocks.push({ x: Math.sin(a) * rad, y: hh / 2, z: Math.cos(a) * rad - 40, sx: 14 + sr() * 24, sy: hh, sz: 14 + sr() * 24, ry: a }); }
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), sky, blocks));
  return { group: g };
}
