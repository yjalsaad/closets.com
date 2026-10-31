/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - the constraint solver (pure).
 * solve(design) turns every part's three axis constraints (customModel.js) into absolute boxes in mm:
 *   box = { x0, x1, y0, y1, z0, z1 }   x = width (left -> right), y = height (up), z = depth (back -> front), envelope at 0..W / 0..H / 0..D.
 * Constraints per axis (placed against the PARENT's range [p0, p1], the envelope for a root part):
 *   min    lo = p0 + o,            hi = lo + s            "align to the start of the parent"
 *   max    hi = p1 - o,            lo = hi - s            "align to the end"
 *   center c  = mid + o            lo = c - s/2           "centred"
 *   fill   lo = p0 + o,            hi = p1 - e            "fill the remaining space"
 *   after  lo = ref.hi + o,        hi = lo + s            "stack on / next to a sibling"
 *   before hi = ref.lo - o,        lo = hi - s
 * `rep` (n >= 2) repeats a part with EQUAL SPACING along one axis inside [p0 + o, p1 - e]: mode 'even' puts equal gaps at both ends and
 * between the copies, mode 'edge' puts the first copy at the start and the last at the end.
 * The solve is order independent (a reference is resolved on demand; a loop falls back to Start and is reported).
 * ===========================================================================*/
import { AXES, treeOrder, getPart } from './customModel';

const r2 = (v) => Math.round(v * 100) / 100;

/** one axis of one (non repeated) part: [lo, hi] */
export function axisSpan(a, p0, p1, refSpan) {
  const s = a.s;
  switch (a.a) {
    case 'max': { const hi = p1 - a.o; return [r2(hi - s), r2(hi)]; }
    case 'center': { const c = (p0 + p1) / 2 + a.o; return [r2(c - s / 2), r2(c + s / 2)]; }
    case 'fill': {
      /* "fill remaining" up to / from a sibling: when a part is named, the far end is that part's near face (a leg fills from the floor to the underside of the top) */
      if (refSpan) {
        if ((refSpan[0] + refSpan[1]) / 2 >= (p0 + p1) / 2) return [r2(p0 + a.o), r2(refSpan[0] - a.e)];
        return [r2(refSpan[1] + a.o), r2(p1 - a.e)];
      }
      return [r2(p0 + a.o), r2(p1 - a.e)];
    }
    case 'after': { const lo = (refSpan ? refSpan[1] : p0) + a.o; return [r2(lo), r2(lo + s)]; }
    case 'before': { const hi = (refSpan ? refSpan[0] : p1) - a.o; return [r2(hi - s), r2(hi)]; }
    default: { const lo = p0 + a.o; return [r2(lo), r2(lo + s)]; }
  }
}

/** the n spans of a repeated part along its repeat axis (equal spacing). Region = [p0 + o, p1 - e]. */
export function repSpans(a, p0, p1, n, mode) {
  const lo = p0 + a.o; const hi = p1 - a.e; const s = a.s;
  const out = [];
  if (mode === 'edge') {
    const g = n > 1 ? (hi - lo - n * s) / (n - 1) : 0;
    for (let i = 0; i < n; i += 1) out.push([r2(lo + i * (s + g)), r2(lo + i * (s + g) + s)]);
  } else {
    const g = (hi - lo - n * s) / (n + 1);
    for (let i = 0; i < n; i += 1) out.push([r2(lo + g + i * (s + g)), r2(lo + g + i * (s + g) + s)]);
  }
  return out;
}
/** the gap between repeated copies (for the dimension chain and the warning "copies overlap") */
export function repGap(a, p0, p1, n, mode) {
  const lo = p0 + a.o; const hi = p1 - a.e;
  return r2(mode === 'edge' ? (n > 1 ? (hi - lo - n * a.s) / (n - 1) : 0) : (hi - lo - n * a.s) / (n + 1));
}

/**
 * @returns {{ root, items, byBase, bounds, warns }}
 *   items: every instance in tree order { id, base, i, n, part, box, parentId, depth }
 *   byBase: Map(part id -> its instances)
 *   bounds: the union of all non-group boxes (what the camera and the exports frame)
 */
export function solve(design) {
  const { w, h, d } = design.dims;
  const root = { x0: 0, x1: w, y0: 0, y1: h, z0: 0, z1: d };
  const warns = [];
  const order = treeOrder(design);
  const depthOf = new Map(order.map((o) => [o.part.id, o.depth]));
  const byBase = new Map();
  const state = new Map(); // id -> 'busy' | 'done'
  const reportedLoop = new Set();

  const rangeOf = (id, axis) => {
    const its = byBase.get(id); if (!its || !its.length) return null;
    return [Math.min(...its.map((q) => q.box[`${axis}0`])), Math.max(...its.map((q) => q.box[`${axis}1`]))];
  };

  const resolve = (id) => {
    if (state.get(id) === 'done') return byBase.get(id) || [];
    if (state.get(id) === 'busy') return null;
    const p = getPart(design, id); if (!p) return [];
    state.set(id, 'busy');
    let pb = root;
    if (p.parent) {
      const pit = resolve(p.parent);
      pb = pit && pit.length ? pit[0].box : root;
    }
    const spans = {};
    AXES.forEach((axis) => {
      const a = p[axis];
      const p0 = pb[`${axis}0`]; const p1 = pb[`${axis}1`];
      let ref = null;
      if (a.a === 'after' || a.a === 'before' || (a.a === 'fill' && a.r)) {
        if (a.r && a.r !== p.id) {
          const got = resolve(a.r);
          if (got === null) {
            if (!reportedLoop.has(p.id)) { reportedLoop.add(p.id); warns.push({ id: `loop-${p.id}`, partId: p.id, en: `${p.name || p.id}: the ${axis.toUpperCase()} reference loops back to itself - it was placed at Start.`, ar: `${p.name || p.id}: مرجع المحور ${axis.toUpperCase()} يدور على نفسه - وُضع عند البداية.` }); }
          } else ref = rangeOf(a.r, axis);
        }
        if (!ref && a.a !== 'fill') {
          if (!reportedLoop.has(`${p.id}${axis}`)) { reportedLoop.add(`${p.id}${axis}`); if (!a.r) warns.push({ id: `noref-${p.id}-${axis}`, partId: p.id, en: `${p.name || p.id}: "${a.a}" on ${axis.toUpperCase()} has no part to follow - pick one.`, ar: `${p.name || p.id}: «${a.a}» على ${axis.toUpperCase()} بلا جزء مرجعي - اختر جزءًا.` }); }
        }
      }
      spans[axis] = { a, p0, p1, ref };
    });
    const n = p.rep && p.type !== 'group' ? p.rep.n : 1;
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const box = {};
      AXES.forEach((axis) => {
        const { a, p0, p1, ref } = spans[axis];
        let sp;
        if (n > 1 && p.rep.axis === axis) sp = repSpans(a, p0, p1, n, p.rep.mode)[i];
        else sp = axisSpan(ref === null && (a.a === 'after' || a.a === 'before') ? { ...a, a: 'min' } : a, p0, p1, ref);
        box[`${axis}0`] = Math.min(sp[0], sp[1]); box[`${axis}1`] = Math.max(sp[0], sp[1]);
      });
      out.push({ id: n > 1 ? `${p.id}.${i + 1}` : p.id, base: p.id, i, n, part: p, box, parentId: p.parent || null, depth: depthOf.get(p.id) || 0 });
    }
    byBase.set(id, out);
    state.set(id, 'done');
    return out;
  };

  order.forEach(({ part }) => resolve(part.id));
  const items = [];
  order.forEach(({ part }) => items.push(...(byBase.get(part.id) || [])));
  const solid = items.filter((it) => it.part.type !== 'group');
  const bounds = solid.length
    ? { x0: Math.min(...solid.map((q) => q.box.x0)), x1: Math.max(...solid.map((q) => q.box.x1)), y0: Math.min(...solid.map((q) => q.box.y0)), y1: Math.max(...solid.map((q) => q.box.y1)), z0: Math.min(...solid.map((q) => q.box.z0)), z1: Math.max(...solid.map((q) => q.box.z1)) }
    : { ...root };
  return { root, items, byBase, bounds, warns };
}

/** size of a box on each axis */
export const sizeOf = (b) => ({ x: r2(b.x1 - b.x0), y: r2(b.y1 - b.y0), z: r2(b.z1 - b.z0) });
export const centerOf = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: (b.z0 + b.z1) / 2 });
/** overlap length of two boxes on one axis (negative = a gap) */
export const overlapOn = (a, b, axis) => Math.min(a[`${axis}1`], b[`${axis}1`]) - Math.max(a[`${axis}0`], b[`${axis}0`]);
