/* =============================================================================
 * Neo Kitchen Designer - the floor PLAN of a layout (NEO-KITCHEN-UX29), as pure geometry.
 * planView(scene) walks the same scene every other view uses and returns rectangles in world millimetres (x along the main run,
 * z towards the room: the main run's wall is at the top of the drawing), so the plan can never disagree with the 3D view,
 * the elevations or the cut list. LayoutPlan.jsx only paints it.
 *   rects  : { run, kind: 'base' | 'tall' | 'wall' | 'counter' | 'panel', x0, z0, x1, z1 }
 *   aisles : the clear distance between two worktop fronts that face each other (galley / island / U), drawn as a dimension line
 *   box    : the bounding box of everything (+ margin), for the viewBox
 * ===========================================================================*/
import { isTall } from './model';

/** world position of a point of a run frame (u along the run, d from the run's back); rotations are multiples of 90 degrees */
export function toWorld(frame, u, d) {
  const c = Math.round(Math.cos(frame.rot)); const s = Math.round(Math.sin(frame.rot));
  return { x: frame.x + u * c + d * s, z: frame.z - u * s + d * c };
}
const rectOf = (frame, u0, u1, d0, d1) => {
  const a = toWorld(frame, u0, d0); const b = toWorld(frame, u1, d1);
  return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) };
};

export function planView(scene) {
  const g = scene.model.g;
  const rects = [];
  scene.runs.forEach((r) => {
    const f = r.frame || { x: 0, z: 0, rot: 0 };
    r.units.forEach((x) => {
      const depth = x.row === 'base' ? x.D + g.doorThk : x.D;
      rects.push({ run: r.key, kind: x.row === 'base' ? (isTall(x.unit) ? 'tall' : 'base') : 'wall', ...rectOf(f, x.fu0, x.fu0 + x.W, 0, depth) });
    });
    r.counters.forEach((c) => rects.push({ run: r.key, kind: 'counter', ...rectOf(f, c.u0, c.u1, c.d0 || 0, c.d1) }));
  });
  scene.parts.forEach((p) => {
    if (!p.panelOf) return; // the finished end / back panels of an open run
    const r = scene.runs.find((q) => q.key === p.runKey); if (!r) return;
    rects.push({ run: r.key, kind: 'panel', ...rectOf(r.frame || { x: 0, z: 0, rot: 0 }, p.box.u0, p.box.u1, p.box.d0, p.box.d1) });
  });
  const aisles = [];
  const m = scene.model; const xl = m.xl;
  const main = scene.runs.find((r) => r.key === 'main');
  const other = scene.runs.find((r) => r.key === 'run2' || r.key === 'isl');
  if (main && other && xl) {
    const mc = main.counters.length ? main.counters.reduce((a, c) => Math.max(a, c.d1), 0) : 0;
    const oc = other.counters.length ? Math.min(...other.counters.map((c) => toWorld(other.frame, c.u0, c.d1).z)) : null;
    if (oc !== null && mc > 0) {
      const ox = rectOf(other.frame, 0, other.L, 0, 1);
      const x = (Math.max(0, ox.x0) + Math.min(main.L, ox.x1)) / 2; // middle of the stretch where the two runs face each other
      aisles.push({ x, z0: mc, z1: oc, mm: Math.round(oc - mc) });
    }
  }
  if (!xl && scene.runs.some((r) => r.key === 'left') && scene.runs.some((r) => r.key === 'right')) {
    const l = scene.runs.find((r) => r.key === 'left'); const rr = scene.runs.find((r) => r.key === 'right');
    const lx = Math.max(...l.counters.map((c) => c.d1), 0); const rx = main.L - Math.max(...rr.counters.map((c) => c.d1), 0);
    if (l.counters.length && rr.counters.length) aisles.push({ horizontal: true, z: Math.max(l.L, rr.L) + 160, x0: lx, x1: rx, mm: Math.round(rx - lx) });
  }
  const xs = rects.flatMap((q) => [q.x0, q.x1]); const zs = rects.flatMap((q) => [q.z0, q.z1]);
  const pad = 260;
  const box = rects.length
    ? { x0: Math.min(...xs) - pad, z0: Math.min(...zs) - pad, x1: Math.max(...xs) + pad, z1: Math.max(...zs) + pad + (aisles.some((a) => a.horizontal) ? 220 : 0) }
    : { x0: -pad, z0: -pad, x1: 2000, z1: 1000 };
  return { rects, aisles, box, w: box.x1 - box.x0, h: box.z1 - box.z0 };
}

/** the six layouts of the picker with their one-line descriptions (EN / AR) - the single source for the picker, the File menu and the assistant */
export const LAYOUT_CHOICES = [
  { id: 'straight', en: 'Single wall', ar: 'جدار واحد', d: { en: 'One run along a wall', ar: 'صف واحد على جدار' } },
  { id: 'galley', en: 'Galley', ar: 'ممر (متوازي)', d: { en: 'Two parallel runs', ar: 'صفّان متوازيان' } },
  { id: 'l', en: 'L-shape', ar: 'شكل L', d: { en: 'Two connected walls', ar: 'جداران متصلان' } },
  { id: 'u', en: 'U-shape', ar: 'شكل U', d: { en: 'Three walls wrap around', ar: 'ثلاثة جدران تحيط بالمطبخ' } },
  { id: 'peninsula', en: 'Peninsula', ar: 'جزيرة ممتدة', d: { en: 'Wall run + open return', ar: 'صف جداري + امتداد مفتوح' } },
  { id: 'island', en: 'Island', ar: 'جزيرة', d: { en: 'Freestanding run, open on all sides', ar: 'صف حر ومفتوح من كل الجهات' } },
];
/** picker id <-> model.layoutName id (the two L variants are one picker card with a left / right mirror choice) */
export const pickerIdOf = (name) => (name === 'l-left' || name === 'l-right' ? 'l' : name);
