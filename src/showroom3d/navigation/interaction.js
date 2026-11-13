/* Interaction zones (Phase 3 stub). A zone is the floor area of a department bay plus a strip toward the nave; standing in it lets the
 * visitor press E (or tap Interact). Phase 3 only highlights the zone and says what is coming; real product interaction is Phase 5. */
import { HALL, BAY } from '../3d/dimensions';
import { layoutBays } from '../scenes/main-hall/departments';
import { STAGE } from '../products/catalog';
import { VIP } from '../scenes/vip/layout';
import { VIP_DEPT } from '../products/vipContent';

const REACH = 4.6;   // metres of nave in front of the bay's floor inlay that still counts as "at the bay" (the glide stand point is 3.5 m out)

export function interactionZones(bays = layoutBays()) {
  return bays.map((b) => {
    const s = b.side === 'left' ? -1 : 1, wall = s * HALL.halfWidth, front = s * (HALL.halfWidth - BAY.depth), reach = front - s * REACH;
    return { id: b.id, en: b.en, ar: b.ar, index: b.index, minX: Math.min(wall, reach), maxX: Math.max(wall, reach), minZ: b.z - b.width / 2, maxZ: b.z + b.width / 2 };
  });
}
/** the zone containing the point (x, z), or null */
export function zoneAt(zones, x, z) {
  for (const q of zones) if (x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ) return q;
  return null;
}

/** the hall-wide Ikhtarha stage zone (centre of the nave) joins the bay zones for the explorer; the 8 bay zones above are unchanged */
export const stageZone = () => ({ id: STAGE.id, en: 'Ikhtarha', ar: 'اختارها', index: 0, ...STAGE.zone, stage: true });
/** the VIP meeting room: the whole room, plus the doorway strip outside the glass so E works as soon as the door has opened */
export const vipZones = () => [{ id: VIP_DEPT.id, en: VIP_DEPT.en, ar: VIP_DEPT.ar, index: 9, vip: true, minX: VIP.x0, maxX: VIP.x1, minZ: VIP.z0, maxZ: VIP.z1 },
  { id: VIP_DEPT.id, en: VIP_DEPT.en, ar: VIP_DEPT.ar, index: 9, vip: true, minX: -1.7, maxX: 1.7, minZ: VIP.z1, maxZ: -26.9 }];
export const allZones = (bays) => [...interactionZones(bays), ...vipZones(), stageZone()];
