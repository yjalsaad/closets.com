/* Exterior architecture: stone-clad shell, cantilevered roof slab with soffit lighting, timber-fin wing, logo wall, glazed curtain wall
 * (everything except the sliding doors, which live in ../entrance). All procedural geometry. */
import * as THREE from 'three';
import { HALL } from '../../3d/dimensions';
import { box, mesh, instanced, worldUV } from '../../3d/geom';
import { LOGO_ASPECT } from '../../logo';


export function buildFacade({ M, logoTex }) {
  const g = new THREE.Group(); g.name = 'facade';
  const H = HALL, wallH = H.height;
  const stone = (w, h, d, x, y, z) => g.add(mesh(box(w, h, d, 2.4), M.stoneExt, { x, y, z, cast: true, receive: true }));

  // shell: side walls, back wall, front wings
  stone(0.8, wallH, H.depth, -(H.halfWidth + 0.4), wallH / 2, -(H.depth / 2) - 0.8 + 0);
  stone(0.8, wallH, H.depth, (H.halfWidth + 0.4), wallH / 2, -(H.depth / 2) - 0.8 + 0);
  stone(H.halfWidth * 2 + 1.6, wallH, 0.8, 0, wallH / 2, -H.depth - 0.4);
  stone(8.8, wallH, 0.8, 18.4, wallH / 2, -0.4);                                   // right wing (logo wall)
  g.add(mesh(box(8.8, wallH, 0.8), M.charcoal, { x: -18.4, y: wallH / 2, z: -0.4, cast: true, receive: true })); // left wing backing

  // timber fins over the left wing
  const fins = []; for (let x = -22.6; x <= -14.2; x += 0.34) fins.push({ x, y: wallH / 2, z: 0.16 });
  g.add(instanced(box(0.16, wallH - 0.5, 0.32, 1.2), M.oakExt, fins, { cast: true, receive: true }));

  // roof slab (cantilevers 6 m over the forecourt) + soffit lighting
  const zFront = H.overhang + 0.5, zBack = -(H.depth + 0.8), slabD = zFront - zBack;
  g.add(mesh(box(H.halfWidth * 2 + 4, H.slab, slabD, 2.4), M.stoneExt, { x: 0, y: wallH + H.slab / 2, z: (zFront + zBack) / 2, cast: true, receive: true }));
  const sy = wallH - 0.012;
  const spots = []; for (let x = -20; x <= 20; x += 4) for (const z of [2.2, 4.4]) spots.push({ x, y: sy, z });
  g.add(instanced(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), M.led, spots));
  g.add(mesh(box(H.halfWidth * 2 + 3.6, 0.05, 0.1), M.led, { x: 0, y: sy, z: H.overhang - 0.15 }));

  // logo wall panel (right wing): the official logo image itself is the lit face (its paper colour is the panel), in a bronze frame
  const pw = 7.4, ph = pw / LOGO_ASPECT;
  g.add(mesh(box(pw + 0.4, ph + 0.4, 0.08), M.bronze, { x: 18.4, y: 5.1, z: 0.04 }));
  if (logoTex) g.add(mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: logoTex, toneMapped: false }), { x: 18.4, y: 5.1, z: 0.09 }));

  // glazed curtain wall
  const gz = -0.05;
  const glassPiece = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), M.glass); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, gz); m.renderOrder = 5; g.add(m); };
  glassPiece(-14, -3.2, 0, wallH); glassPiece(3.2, 14, 0, wallH); glassPiece(-3.2, 3.2, H.doorHeight + 0.1, wallH);
  const full = [], upper = [], depth = 0.26, mw = 0.09;
  for (let x = -14; x <= -4.2; x += 1.4) { full.push({ x, y: wallH / 2, z: 0.04 }); full.push({ x: -x, y: wallH / 2, z: 0.04 }); }
  full.push({ x: -3.2, y: wallH / 2, z: 0.04 }, { x: 3.2, y: wallH / 2, z: 0.04 });
  for (const x of [-1.6, 0, 1.6]) upper.push({ x, y: (H.doorHeight + 0.1 + wallH) / 2, z: 0.04 });
  g.add(instanced(box(mw, wallH, depth), M.bronze, full, { cast: true }));
  g.add(instanced(box(mw, wallH - H.doorHeight - 0.1, depth), M.bronze, upper, { cast: true }));
  for (const y of [H.doorHeight + 0.05, 6.9, wallH - 0.08]) g.add(mesh(box(28.2, y > 6 && y < 8 ? 0.12 : 0.22, depth + 0.04), M.bronze, { x: 0, y, z: 0.04, cast: true }));
  g.add(mesh(box(28.2, 0.14, depth + 0.1), M.bronze, { x: 0, y: 0.07, z: 0.04 }));

  // entrance pad: large-format stone slab flush with the forecourt (no steps: level, barrier-free threshold)
  const padG = new THREE.PlaneGeometry(9.4, 3.2); padG.rotateX(-Math.PI / 2); worldUV(padG, 2.4);
  const pad = new THREE.Mesh(padG, M.stoneInlay); pad.position.set(0, 0.046, 1.6); pad.receiveShadow = true; g.add(pad);
  return { group: g };
}
