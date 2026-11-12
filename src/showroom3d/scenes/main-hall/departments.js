/* The eight department bays of the hall. Phase 1/2 builds only the EMPTY bays (floor inlay, alcove, sign): they are marked
 * "to be furnished in Phase 4" on purpose and must never be presented as finished showrooms. */
import { HALL, BAY } from '../../3d/dimensions';

export const DEPARTMENTS = [
  { id: 'kitchens',  side: 'left',  en: 'Kitchens',            ar: 'المطابخ' },
  { id: 'wardrobes', side: 'left',  en: 'Wardrobes',           ar: 'خزائن الملابس' },
  { id: 'walkin',    side: 'left',  en: 'Walk-in Closets',     ar: 'غرف الملابس' },
  { id: 'bedroom',   side: 'left',  en: 'Bedrooms',            ar: 'غرف النوم' },
  { id: 'doors',     side: 'right', en: 'Doors',               ar: 'الأبواب' },
  { id: 'living',    side: 'right', en: 'Living',              ar: 'غرف المعيشة' },
  { id: 'studio',    side: 'right', en: 'Custom Studio',       ar: 'استوديو التصميم' },
  { id: 'lounge',    side: 'right', en: 'Consultation Lounge', ar: 'صالة الاستشارات' },
];

/** world-space layout of every bay (centre x/z, size, which way the front faces) */
export function layoutBays(departments = DEPARTMENTS) {
  const out = [];
  const perSide = { left: 0, right: 0 };
  for (const d of departments) {
    const i = perSide[d.side]++;
    const sign = d.side === 'left' ? -1 : 1;
    out.push({
      ...d,
      index: out.length + 1,
      x: sign * (HALL.halfWidth - BAY.depth / 2),
      z: BAY.startZ - BAY.width / 2 - i * (BAY.width + BAY.gap),
      width: BAY.width, depth: BAY.depth,
      facing: -sign,          // +1 faces +x (toward the nave from the left side), -1 faces -x
    });
  }
  return out;
}

/** do two axis-aligned footprints overlap? (used by tests) */
export function overlaps(a, b) {
  return Math.abs(a.x - b.x) < (a.depth + b.depth) / 2 && Math.abs(a.z - b.z) < (a.width + b.width) / 2;
}
