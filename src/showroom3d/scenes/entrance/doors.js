/* The sliding glass entrance: two leaves in bronze frames travelling in front of fixed side panels. `update({doorOpen})` 0..1. */
import * as THREE from 'three';
import { HALL } from '../../3d/dimensions';
import { box, mesh } from '../../3d/geom';

export function buildDoors({ M }) {
  const g = new THREE.Group(); g.name = 'entrance-doors';
  const h = HALL.doorHeight, w = HALL.doorHalfOpening;
  // fixed panels beside the opening + header track
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass); p.position.set(s * (w + w / 2), h / 2, -0.05); p.renderOrder = 5; g.add(p); }
  g.add(mesh(box(w * 4 + 0.2, 0.3, 0.34), M.bronze, { x: 0, y: h + 0.15, z: 0.08, cast: true }));
  g.add(mesh(box(w * 2, 0.02, 0.1), M.brass, { x: 0, y: 0.05, z: 0.12 }));   // threshold
  const leaves = [];
  const frameBar = (lw, lh, x, y) => mesh(box(lw, lh, 0.07), M.bronze, { x, y, z: 0 });
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.14), M.glass); glass.position.set(0, h / 2, 0.01); glass.renderOrder = 6; leaf.add(glass);
    leaf.add(frameBar(w, 0.07, 0, h - 0.035), frameBar(w, 0.1, 0, 0.12), frameBar(0.05, h, -w / 2 + 0.025, h / 2), frameBar(0.05, h, w / 2 - 0.025, h / 2));
    leaf.add(mesh(box(0.025, 1.0, 0.04), M.brass, { x: -s * (w / 2 - 0.16), y: 1.15, z: 0.07 }));   // handle bar on the inner stile
    leaf.position.set(s * w / 2, 0, 0.12);
    leaf.userData.closedX = s * w / 2; leaf.userData.openX = s * (w + w / 2); leaves.push(leaf); g.add(leaf);
  }
  function update(state) {
    const k = state.doorOpen || 0;
    for (const l of leaves) l.position.x = l.userData.closedX + (l.userData.openX - l.userData.closedX) * k;
  }
  update({ doorOpen: 0 });
  return { group: g, update };
}
