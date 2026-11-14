/* The grand double-height hall: polished stone floor, timber-clad walls, plaster upper walls with a daylight slot, timber cross beams,
 * recessed linear LED lines with soft additive glow, suspended light bars, a lit logo wall and planted stone benches.
 * `update({led})` scales every emitter so the hall "comes alive" as the doors open. */
import * as THREE from 'three';
import { HALL } from '../../3d/dimensions';
import { box, mesh, instanced, worldUV } from '../../3d/geom';
import { buildOlive } from '../../3d/vegetation';
import { LOGO_ASPECT } from '../../logo';
import { PALETTE } from '../../3d/palette';
import { poolTexture } from '../../3d/pbr';

export function buildHallShell({ M, tier, logoTex, glowTex }) {
  const g = new THREE.Group(); g.name = 'hall';
  const H = HALL, W = H.halfWidth * 2, D = H.depth, h = H.height;
  const glows = [];
  const addGlow = (w, l, x, y, z, op = 1) => {
    const mat = M.glow(glowTex); mat.opacity = op;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 4; g.add(m); glows.push(mat); return m;
  };

  // floor
  const fg = new THREE.PlaneGeometry(W, D); fg.rotateX(-Math.PI / 2); worldUV(fg, 2.4);
  const floor = new THREE.Mesh(fg, M.floor); floor.position.set(0, 0, -D / 2); floor.receiveShadow = true; floor.name = 'floor'; g.add(floor);

  // ceiling
  const cg = new THREE.PlaneGeometry(W, D); cg.rotateX(Math.PI / 2); worldUV(cg, 3);
  const ceil = new THREE.Mesh(cg, M.ceilDark || M.ceiling); ceil.position.set(0, h, -D / 2); ceil.receiveShadow = true; g.add(ceil);

  // side walls: walnut base + oak slat rhythm to 4.5 m, plaster above with a daylight slot
  const slatStep = 0.16 / tier.slatDensity;
  for (const s of [-1, 1]) {
    const x = s * H.halfWidth, inward = -s;
    const base = new THREE.PlaneGeometry(D, 4.5); worldUV(base, 2.4);
    const wb = new THREE.Mesh(base, M.walnut); wb.position.set(x + inward * 0.005, 2.25, -D / 2); wb.rotation.y = inward * Math.PI / 2; wb.receiveShadow = true; g.add(wb);
    const slats = []; for (let z = -0.4; z > -D + 0.2; z -= slatStep) slats.push({ x: x + inward * 0.05, y: 2.25, z });
    g.add(instanced(box(0.09, 4.4, 0.07, 1.2), M.oak, slats, { receive: true }));
    const up = new THREE.PlaneGeometry(D, h - 4.5); worldUV(up, 3);
    const wu = new THREE.Mesh(up, M.plaster); wu.position.set(x + inward * 0.005, 4.5 + (h - 4.5) / 2, -D / 2); wu.rotation.y = inward * Math.PI / 2; wu.receiveShadow = true; g.add(wu);
    g.add(mesh(box(0.12, 0.1, D), M.brass, { x: x + inward * 0.06, y: 4.55, z: -D / 2 }));
    g.add(mesh(box(0.1, 0.16, D - 1), M.ledCool, { x: x + inward * 0.07, y: 8.3, z: -D / 2 }));      // daylight slot
    const gl = addGlow(1.8, D - 2, 0, 0, 0, 0.5); gl.rotation.set(0, inward * Math.PI / 2, Math.PI / 2); gl.position.set(x + inward * 0.02, 8.3, -D / 2);
  }

  // inside faces of the two solid front wings (x = +-14..22, z = -0.8): walkers can now stand beside them, so they get the same walnut + plaster finish
  for (const s of [-1, 1]) {
    const cx = s * (H.glassHalf + H.halfWidth) / 2, ww = H.halfWidth - H.glassHalf;
    const wb = new THREE.PlaneGeometry(ww, 4.5); worldUV(wb, 2.4); const lo = new THREE.Mesh(wb, M.walnut); lo.position.set(cx, 2.25, -0.81); lo.rotation.y = Math.PI; lo.receiveShadow = true; g.add(lo);
    const wu = new THREE.PlaneGeometry(ww, h - 4.5); worldUV(wu, 3); const hi = new THREE.Mesh(wu, M.plaster); hi.position.set(cx, 4.5 + (h - 4.5) / 2, -0.81); hi.rotation.y = Math.PI; hi.receiveShadow = true; g.add(hi);
    g.add(mesh(box(ww, 0.1, 0.12), M.brass, { x: cx, y: 4.55, z: -0.87 }));
  }

  // back wall: vertical oak slats on walnut, lit logo panel, brass reveal frame
  const bw = new THREE.PlaneGeometry(W, h); worldUV(bw, 2.4);
  const back = new THREE.Mesh(bw, M.walnut); back.position.set(0, h / 2, -D + 0.005); back.receiveShadow = true; g.add(back);
  const bslats = []; for (let x = -H.halfWidth + 0.3; x < H.halfWidth; x += slatStep * 1.35) bslats.push({ x, y: h / 2, z: -D + 0.06 });
  g.add(instanced(box(0.1, h - 0.2, 0.08, 1.2), M.oak, bslats, { receive: true }));
  const lw = 12.4, lh = lw / LOGO_ASPECT;
  g.add(mesh(box(lw + 0.7, lh + 0.7, 0.12), M.brass, { x: 0, y: 5.1, z: -D + 0.12 }));
  if (logoTex) g.add(mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({ map: logoTex, toneMapped: false }), { x: 0, y: 5.1, z: -D + 0.23 }));

  // suspended walnut slat ceiling over the nave (4-4.8 m reads as a premium showroom; the double-height volume stays above it as a lit plenum),
  // linear LED coves on every edge, recessed spots on a grid with soft light pools on the floor, and a warm LED guide line on the floor along the aisle
  const cy = 6.1, cw = (H.glassHalf + 2) * 2 - 4.4, cz0 = -2.2, cz1 = -D + 1.2, cl = cz0 - cz1, cx = (cz0 + cz1) / 2;
  const slatSp = 0.13 / tier.slatDensity, slats = []; for (let x = -cw / 2 + 0.05; x <= cw / 2; x += slatSp) slats.push({ x, y: cy - 0.05, z: cx });
  g.add(instanced(box(0.065, 0.1, cl, 0.8), M.slat || M.walnut, slats, { receive: true }));
  g.add(mesh(box(cw, 0.04, cl), M.ceilDark || M.charcoal, { x: 0, y: cy, z: cx }));
  const coves = [];   // four edge coves: slim emissive strips just inside the slat field edge, facing down + a wash up the wall
  coves.push({ x: -cw / 2 - 0.1, y: cy - 0.1, z: cx, sx: 0.07, sz: cl }, { x: cw / 2 + 0.1, y: cy - 0.1, z: cx, sx: 0.07, sz: cl });
  g.add(instanced(box(1, 0.035, 1), M.led, coves.map((c) => ({ ...c, sy: 1 })), {}));
  g.add(mesh(box(cw + 0.3, 0.035, 0.07), M.led, { x: 0, y: cy - 0.1, z: cz1 - 0.1 })); g.add(mesh(box(cw + 0.3, 0.035, 0.07), M.led, { x: 0, y: cy - 0.1, z: cz0 + 0.1 }));
  // recessed spots (HDR discs, one draw call) + their light pools on the floor (one additive draw call)
  const spotsAt = []; for (let x = -12; x <= 12; x += 6) for (let z = -5; z > -D + 2; z -= 5.5) if (Math.abs(x) > 6 || z > -14 || z < -28) spotsAt.push({ x, z });
  const disc = new THREE.CircleGeometry(0.085, 14); disc.rotateX(Math.PI / 2);
  g.add(instanced(disc, M.led, spotsAt.map((p) => ({ x: p.x, y: cy - 0.062, z: p.z })), {}));
  const pool = new THREE.PlaneGeometry(3.4, 3.4); pool.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTexture(0.0), color: new THREE.Color(PALETTE.ledWarm).multiplyScalar(0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.55 });
  g.add(instanced(pool, poolMat, spotsAt.map((p) => ({ x: p.x, y: 0.012, z: p.z })), {})); glows.push(poolMat);
  // floor guide line: two continuous warm LED lines along the aisle (flush, emissive) with a soft glow either side
  for (const x of [-5.4, 5.4]) {
    g.add(mesh(box(0.05, 0.012, D - 3), M.led, { x, y: 0.011, z: -D / 2 }));
    const f = addGlow(0.7, D - 3, x, 0.016, -D / 2, 0.55); f.rotation.x = -Math.PI / 2;
  }

  // planted stone benches along the nave axis + two specimen trees by the entrance
  for (const z of [-15, -26]) {
    g.add(mesh(box(6.4, 0.42, 1.5, 2.4), M.stoneInlay, { x: 0, y: 0.21, z, cast: true, receive: true }));
      }
  for (const x of [-13, 13]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 0.7, 24), M.stoneInlay); pot.position.set(x, 0.35, -5.2); pot.castShadow = pot.receiveShadow = true; g.add(pot);
    g.add(buildOlive(M, x, -5.2, 1.0, 0.7));
  }
  return { group: g, glows };
}
