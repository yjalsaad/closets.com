/* Collision footprints of the furnished bays and the Ikhtarha stage (pure data, plan view). Local product frame -> world via the bay's facing, exactly
 * like the scene modules, so the walker cannot clip through the kitchen run / island, the wardrobe, the door wall or the stage. The numbers are the
 * footprints used by scenes/products/*.js (kitchen RUN / ISL, wardrobe X0..X1, door WALL_X) with a few centimetres of margin. */
import { layoutBays } from '../scenes/main-hall/departments';
import { STAGE } from '../products/catalog';

/** local (x0, x1, z0, z1) boxes per product; x = -3 is the wall. Boxes run the FULL bay width (to the portal posts) and fill the aisle between the kitchen run and
 *  island, so no gap narrower than the walker (0.7 m) is left behind: such pockets make a sliding circle jitter between two obstacles. */
export const LOCAL_BOXES = {
  kitchen: [['run', -3.0, -2.12, -3.45, 3.45], ['island', -3.0, 0.27, -1.36, 1.36]],
  wardrobe: [['wardrobe', -3.0, -2.1, -3.45, 3.45], ['plant', -3.0, -1.5, 2.6, 3.45]],
  door: [['wall', -3.0, -1.1, -3.45, 3.45], ['bench', -3.0, -0.08, 1.3, 3.45], ['plant', -3.0, -0.25, -3.45, -2.2]],
  bedroom: [['wall', -3.0, -2.3, -3.45, 3.45], ['bed', -3.0, -0.2, -0.75, 1.9]],
  walkin: [['wall', -3.0, -2.2, -3.45, 3.45], ['island', -3.0, -0.35, -1.2, 1.2]],
  living: [['wall', -3.0, -2.1, -3.45, 3.45], ['cluster', -3.0, -0.05, -2.6, 2.6], ['console', -3.0, 0.6, -0.95, 0.95]],
  studio: [['wall', -3.0, -2.3, -3.45, 3.45], ['table', -3.0, 0.25, -1.3, 1.5]],
  lounge: [['wall', -3.0, -2.5, -3.45, 3.45], ['desk', -3.0, -1.05, -2.55, 0.35], ['cluster', -3.0, 0.15, 0.3, 3.45]],
};
export const LOCAL_CIRCLES = { kitchen: [], wardrobe: [], door: [], bedroom: [['plant', -1.15, -0.95, 0.3]], walkin: [], living: [['plant', -0.8, -3.0, 0.3]], studio: [['plant', -0.4, -2.6, 0.3]], lounge: [['plant', -0.5, -3.0, 0.3]] };

export function productColliders(bays = layoutBays()) {
  const out = [];
  for (const b of bays) {
    if (!b.product) continue;
    const s = b.facing, to = (x, z) => [b.x + s * x, b.z + s * z];
    for (const [id, x0, x1, z0, z1] of LOCAL_BOXES[b.product] || []) {
      const [ax, az] = to(x0, z0), [bx, bz] = to(x1, z1);
      out.push({ type: 'box', id: `${b.product}-${id}`, minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minZ: Math.min(az, bz), maxZ: Math.max(az, bz) });
    }
    for (const [id, x, z, r] of LOCAL_CIRCLES[b.product] || []) { const [cx, cz] = to(x, z); out.push({ type: 'circle', id: `${b.product}-${id}`, x: cx, z: cz, r }); }
  }
  // Ikhtarha stage: round platform + the screen blade behind it
  out.push({ type: 'circle', id: 'ikhtarha-platform', x: STAGE.x, z: STAGE.z, r: STAGE.radius });
  // the box reaches forward to the platform centre line so circle + blade form ONE solid (no narrow pocket between them for the walker to jam in)
  out.push({ type: 'box', id: 'ikhtarha-blade', minX: STAGE.x - 3.15, maxX: STAGE.x + 3.15, minZ: STAGE.z - 2.9 - 0.25, maxZ: STAGE.z });
  return out;
}
