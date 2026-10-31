/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - contacts and collisions between solved parts (pure).
 *  contacts(solved)  - which solid parts touch face to face (joints: the joinery estimate, the "floating part" check)
 *  overlaps(solved)  - which solid parts occupy the same space (the red collision warnings)
 * Hardware, groups and the drawers' / doors' own sub-parts are not volumes here; a back panel may sit up to 10 mm into a groove and glass up to 10 mm
 * into a rebate without being reported.
 * ===========================================================================*/
import { AXES } from './customModel';
import { overlapOn } from './customSolve';

const VOLUME = new Set(['panel', 'shelf', 'frame', 'back', 'glass', 'door', 'drawer']);
const JOINABLE = new Set(['panel', 'shelf', 'frame']);
export const TOUCH = 0.6; // mm: faces closer than this are touching
export const MIN_OVERLAP = 0.5; // mm: less than this on any axis is not a collision

const volumes = (solved) => solved.items.filter((it) => VOLUME.has(it.part.type));

/** face-to-face contacts between joinable parts: { a, b, axis, len, boardBoard } (len = the longer side of the contact patch, mm) */
export function contacts(solved, types = JOINABLE) {
  const its = solved.items.filter((it) => types.has(it.part.type));
  const out = [];
  for (let i = 0; i < its.length; i += 1) {
    for (let j = i + 1; j < its.length; j += 1) {
      const A = its[i]; const B = its[j];
      if (A.base === B.base) continue;
      for (const axis of AXES) {
        const touch = Math.abs(A.box[`${axis}1`] - B.box[`${axis}0`]) <= TOUCH || Math.abs(B.box[`${axis}1`] - A.box[`${axis}0`]) <= TOUCH;
        if (!touch) continue;
        const others = AXES.filter((k) => k !== axis);
        const o1 = overlapOn(A.box, B.box, others[0]); const o2 = overlapOn(A.box, B.box, others[1]);
        if (Math.min(o1, o2) >= 5 && Math.max(o1, o2) >= 20) {
          out.push({ a: A.id, b: B.id, aBase: A.base, bBase: B.base, axis, len: Math.round(Math.max(o1, o2) * 10) / 10, boardBoard: A.part.type !== 'frame' && B.part.type !== 'frame' });
          break;
        }
      }
    }
  }
  return out;
}

/** pairs whose boxes intersect by more than MIN_OVERLAP on all three axes: { a, b, aBase, bBase, x, y, z } */
export function overlaps(solved) {
  const its = volumes(solved);
  const out = [];
  for (let i = 0; i < its.length; i += 1) {
    for (let j = i + 1; j < its.length; j += 1) {
      const A = its[i]; const B = its[j];
      if (A.base === B.base) continue;
      const o = {}; let ok = true;
      for (const k of AXES) { o[k] = Math.round(overlapOn(A.box, B.box, k) * 10) / 10; if (o[k] <= MIN_OVERLAP) { ok = false; break; } }
      if (!ok) continue;
      /* a back panel sits in a groove and glass in a rebate: a few mm of overlap on the thin axis is the joint, not a collision */
      const groove = (X, Y) => (X.part.type === 'back' || X.part.type === 'glass') && Math.min(o.x, o.y, o.z) <= 10 && Y.part.type !== 'door' && Y.part.type !== 'drawer';
      if (groove(A, B) || groove(B, A)) continue;
      out.push({ a: A.id, b: B.id, aBase: A.base, bBase: B.base, x: o.x, y: o.y, z: o.z });
    }
  }
  return out;
}

/** every design part id that has a contact with another joinable or back part, or rests on the floor (y0 ~ 0) - the rest are "floating" */
export function supportedBases(solved) {
  const set = new Set();
  contacts(solved, new Set([...JOINABLE, 'back'])).forEach((c) => { set.add(c.aBase); set.add(c.bBase); });
  solved.items.forEach((it) => { if (it.box.y0 <= TOUCH) set.add(it.base); });
  return set;
}
