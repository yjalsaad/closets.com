/* Shared staging for a furnished bay: a lowered plaster canopy with a lit cove, recessed downlights, a wall-wash on the feature wall and a
 * soft floor pool. The canopy gives each bay the scale and the "pool of light" of a real showroom room. Product frame (+X to the visitor). */
import * as THREE from 'three';
import { bevelBox, placed, prep, mergeColored } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';

export const CANOPY_Y = 3.3;

export function buildCanopy(kit, { downlights = [[-1.4, -1.8], [-1.4, 0], [-1.4, 1.8], [0.9, -1.8], [0.9, 0], [0.9, 1.8]], washLen = 6.0 } = {}) {
  const { M } = kit, g = new THREE.Group(); g.name = 'canopy';
  const plaster = new THREE.MeshStandardMaterial({ color: P.ceilingLight, roughness: 0.92, envMapIntensity: 0.3, emissive: new THREE.Color(P.ledCool), emissiveIntensity: 0.34 });
  const parts = [placed(bevelBox(6.0, 0.2, 6.8, { b: 0.004, tile: 2 }), { x: 0, y: CANOPY_Y + 0.1 }), placed(bevelBox(0.06, 0.14, 6.8, { b: 0.002 }), { x: 2.98, y: CANOPY_Y - 0.07 })].map(prep);
  const slab = new THREE.Mesh(mergeGeometries(parts), plaster); slab.castShadow = false; slab.receiveShadow = true; g.add(slab);
  // downlight trims (brass ring + emissive lens), always on: the room's own lighting
  const lens = M.ledWarm(); lens.color.multiplyScalar(0.55); const trim = [];
  for (const [x, z] of downlights) { trim.push(prep(placed(new THREE.TorusGeometry(0.06, 0.007, 6, 18), { x, y: CANOPY_Y - 0.001, z, rx: Math.PI / 2 }))); }
  const trims = new THREE.Mesh(mergeGeometries(trim), M.brass); g.add(trims);
  const lenses = new THREE.Mesh(mergeGeometries(downlights.map(([x, z]) => prep(placed(new THREE.CircleGeometry(0.055, 14), { x, y: CANOPY_Y - 0.004, z, rx: Math.PI / 2 })))), lens); g.add(lenses);
  // cove strip along the nave edge (looks like a light slot): switches with the LED toggle
  kit.led({ x: 2.93, y: CANOPY_Y - 0.15, z: 0, len: 6.6, axis: 'z', thick: 0.02, parent: g, levelOf: (s) => 0.55 + 0.45 * s.accentLevel() });
  kit.group.add(g); return g;
}

/** warm wash from the canopy down the feature wall (the "scallop" of light that sells a fluted wall) */
export function buildWallWash(kit, { z = 0, len = 6.0, top = CANOPY_Y - 0.02, drop = 1.7, x = -2.805 } = {}) {
  return kit.led({ x: x + 0.02, y: top, z, len, axis: 'z', thick: 0.012, levelOf: (s) => s.accentLevel(),
    washPlane: { w: len, h: drop, pos: [x + 0.004, top - drop / 2, z], rot: [0, Math.PI / 2, 0] } });
}

/** merge a props list ([{geo,color}]) into one mesh with the given vertex-colour material */
export function propMesh(items, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(mergeColored(items), mat); m.castShadow = cast; m.receiveShadow = receive; m.matrixAutoUpdate = false; m.updateMatrix(); return m;
}
