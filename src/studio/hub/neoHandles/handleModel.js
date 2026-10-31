/* =============================================================================
 * [NEO-HANDLES-UX36] SMART HANDLES - the pure core shared by every Neo studio (no React, no DOM, no colours).
 *
 * A handle is a small data object a studio's builder returns for its CURRENT scene / model:
 *   {
 *     id        stable id ('unit:u3:w'), the same across renders so a drag survives the model changing under it
 *     kind      'width' | 'height' | 'depth' | 'position' | 'split' | 'count'
 *     dir       the SCREEN direction that INCREASES the value: 'right' | 'left' | 'up' | 'down'  (axis 'x' | 'y' follows from it)
 *     at        { u, y }  where the pill sits, in the drawing's own millimetres (an elevation: u along the run, y up from the floor)
 *     value, min, max, step, snap[]   current value, clamps (from the studio's existing rules), grid step, standard sizes / neighbour values to snap to
 *     pitch     (kind 'count') millimetres of drag for one more / one less;   ratio  value change per millimetre of pill travel (default 1)
 *     label {en,ar}, tip {en,ar}, reasons { min:{en,ar}, max:{en,ar} }   what the bubble / tooltip / red limit state say
 *     unitId / unitIds   the unit(s) a level-2 handle belongs to (a category unit can be a base half + a wall half)
 *     group     'overall' | 'unit' | 'member' | 'count' | 'niche' | 'door' | ...   level 1 = always shown, 2 = selected unit only
 *     apply(v)  -> { next, value, clamped }   the studio's OWN validated setter(s) applied to the model the builder was given;
 *               `next` is the whole new model / design. No parallel state: the studio commits `next` exactly as its panel field would.
 *   }
 * Everything here is arithmetic on those objects, so it is unit-tested without a browser: drag maths, snapping (grid, neighbours, standard
 * sizes; Shift = fine, Alt = free), clamps with a "limit" state + reason, keyboard nudging, ARIA, pointer -> drawing conversion (any zoom / pan),
 * on-screen de-cluttering, and the history keys that make ONE drag = ONE undo step.
 * ===========================================================================*/

export const KINDS = ['width', 'height', 'depth', 'position', 'split', 'count'];
/** standard cabinet widths (mm) a width handle snaps to when it is close */
export const STD_WIDTHS = [150, 200, 300, 400, 450, 500, 600, 700, 800, 900, 1000, 1200];
/** a drag's history key: unique per drag, so one gesture is one undo step however long the pointer rests (the studios merge `hdl:` keys unconditionally) */
export const DRAG_PREFIX = 'hdl:';
export const dragKey = (id, seq) => `${DRAG_PREFIX}${id}:${seq}`;
/** a keyboard nudge: the studios' normal "same key within a moment" merge applies, so a burst of arrow presses is one step */
export const nudgeKey = (id) => `hk:${id}`;
export const isDragKey = (k) => typeof k === 'string' && k.startsWith(DRAG_PREFIX);

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const axisOf = (dir) => (dir === 'left' || dir === 'right' ? 'x' : 'y');

/** normalise a builder's spec into a complete handle (defaults, finite numbers, axis from dir) */
export function makeHandle(spec) {
  const dir = ['left', 'right', 'up', 'down'].includes(spec.dir) ? spec.dir : 'right';
  const kind = KINDS.includes(spec.kind) ? spec.kind : 'position';
  const min = Number.isFinite(+spec.min) ? +spec.min : -Infinity;
  const max = Number.isFinite(+spec.max) ? +spec.max : Infinity;
  const value = fin(spec.value);
  return {
    pitch: kind === 'count' ? 60 : 0, step: kind === 'count' ? 1 : 10, snap: [], group: 'unit', level: 1, unit: kind === 'count' ? '' : 'mm', ...spec,
    kind, dir, axis: axisOf(dir), min, max, value: Math.max(min, Math.min(max, value)), at: { u: fin(spec.at && spec.at.u), y: fin(spec.at && spec.at.y) },
  };
}

/** value change for a pointer move of (dx, dy) drawing-millimetres on screen (dy positive = DOWN the screen) */
export function dragDelta(h, dx, dy) {
  switch (h.dir) {
    case 'right': return dx;
    case 'left': return -dx;
    case 'up': return -dy;
    default: return dy;
  }
}

/** the value a drag asks for before snapping: start value + the pointer's travel (a count moves one step per `pitch` mm; Shift slows the travel to a quarter) */
export function rawFromDrag(h, startValue, delta, { fine = false } = {}) {
  const d = fine && h.kind !== 'count' ? delta / 4 : delta;
  if (h.kind === 'count') return startValue + Math.round(d / (h.pitch || 60));
  return startValue + d * (h.ratio || 1); // ratio: a handle whose value moves less / more than its pill (a per-drawer height on a whole drawer-zone edge)
}

/**
 * Snap + clamp. `raw` is the unsnapped value; options: fine (Shift: whole millimetres, no snapping), free (Alt: no snapping at all), tol (snap distance in mm,
 * the layer passes ~8 screen px). Returns { value, raw, snapped (the list value it landed on, or null), limit: 'min' | 'max' | null }.
 * A count is always a whole number. The clamp comes from the handle's min / max (the studio's own range), so a handle can never ask for a value the panel refuses.
 */
export function resolveValue(h, raw, { fine = false, free = false, tol = 8 } = {}) {
  let v = fin(raw); let snapped = null;
  if (h.kind === 'count') v = Math.round(v);
  else if (free || fine) v = Math.round(v);
  else {
    let bd = Math.max(0, tol);
    (h.snap || []).forEach((s) => { const d = Math.abs(s - v); if (d <= bd) { snapped = s; bd = d; } });
    if (snapped !== null) v = snapped;
    else { const st = h.step > 0 ? h.step : 1; v = Math.round(v / st) * st; }
  }
  let limit = null;
  if (fin(raw) < h.min - 0.5) limit = 'min'; else if (fin(raw) > h.max + 0.5) limit = 'max';
  if (v < h.min) { v = h.min; if (!limit) limit = 'min'; } else if (v > h.max) { v = h.max; if (!limit) limit = 'max'; }
  return { value: v, raw: fin(raw), snapped, limit };
}

/** the text of a limit ("Maximum 1200 mm - unit width") - the handle's own reason when it has one */
export function limitReason(h, limit, lang = 'en') {
  if (!limit) return '';
  const own = h.reasons && h.reasons[limit];
  const l = lang === 'ar' ? 'ar' : 'en';
  if (own && own[l]) return own[l];
  const n = limit === 'min' ? h.min : h.max; const u = h.unit ? ` ${h.unit}` : '';
  return l === 'ar' ? `${limit === 'min' ? 'الحد الأدنى' : 'الحد الأقصى'} ${n}${u}` : `${limit === 'min' ? 'Minimum' : 'Maximum'} ${n}${u}`;
}

/** the value bubble while dragging: "2256 mm" (a count: "3") */
export const bubbleText = (h, value) => `${Math.round(value)}${h.unit ? ` ${h.unit}` : ''}`;
export const labelOf = (h, lang = 'en') => (h.label ? (lang === 'ar' ? h.label.ar || h.label.en : h.label.en) : h.id);
export const tipOf = (h, lang = 'en') => (h.tip ? (lang === 'ar' ? h.tip.ar || h.tip.en : h.tip.en) : labelOf(h, lang));

/** arrow-key nudge. ArrowLeft / Right move a horizontal handle (Right = towards its `dir`); Up / Down move a vertical one; the other pair acts as a slider (Up / Right = more).
 *  Shift = 1 mm, PageUp / PageDown = 10 steps, Home / End = min / max. Returns { value, limit } or null for a key the handle ignores. */
export function nudge(h, key, { shift = false } = {}) {
  const unit = h.kind === 'count' ? 1 : shift ? 1 : (h.step > 0 ? h.step : 1);
  let s = 0; let mult = 1;
  const horiz = { ArrowRight: 1, ArrowLeft: -1 }; const vert = { ArrowUp: 1, ArrowDown: -1 };
  if (key === 'Home') return { value: h.min, limit: null };
  if (key === 'End') return { value: h.max, limit: null };
  if (key === 'PageUp') { s = 1; mult = 10; } else if (key === 'PageDown') { s = -1; mult = 10; }
  else if (h.axis === 'x') { if (horiz[key]) s = horiz[key] * (h.dir === 'right' ? 1 : -1); else if (vert[key]) s = vert[key]; }
  else if (vert[key]) s = vert[key] * (h.dir === 'up' ? 1 : -1); else if (horiz[key]) s = horiz[key];
  if (!s) return null;
  const r = resolveValue(h, h.value + s * mult * unit, { free: true });
  return { value: r.value, limit: r.limit };
}

/** role="slider" attributes */
export function ariaOf(h, lang = 'en') {
  const text = `${labelOf(h, lang)}: ${bubbleText(h, h.value)}`;
  return {
    role: 'slider', tabIndex: 0, 'aria-label': labelOf(h, lang), 'aria-valuenow': Math.round(h.value), 'aria-valuemin': Number.isFinite(h.min) ? h.min : undefined, 'aria-valuemax': Number.isFinite(h.max) ? h.max : undefined,
    'aria-valuetext': text, 'aria-orientation': h.axis === 'x' ? 'horizontal' : 'vertical',
  };
}

/** pointer -> drawing space for an <svg> with a viewBox and preserveAspectRatio "meet" (any zoom / pan: the viewBox already holds both). `rect` = svg.getBoundingClientRect() */
export function viewMap(rect, vb) {
  const s = Math.min(rect.width / vb.w, rect.height / vb.h) || 1;
  const ox = rect.left + (rect.width - vb.w * s) / 2; const oy = rect.top + (rect.height - vb.h * s) / 2;
  return { s, toSvg: (cx, cy) => ({ x: vb.x + (cx - ox) / s, y: vb.y + (cy - oy) / s }) };
}
export function parseViewBox(str) {
  const a = String(str || '').trim().split(/[\s,]+/).map(Number);
  return a.length === 4 && a.every(Number.isFinite) && a[2] > 0 && a[3] > 0 ? { x: a[0], y: a[1], w: a[2], h: a[3] } : null;
}

/** which handles are on screen: level 1 always; level 2 for the selected unit (or the one being dragged / hovered); level 3 only while hovered or dragged */
export function visibleHandles(list, { unitId = null, activeId = null, hoverId = null } = {}) {
  return list.filter((h) => {
    if (h.id === activeId || h.id === hoverId) return true;
    if (h.level <= 1) return true;
    if (h.level === 2) return !!unitId && (h.unitId === unitId || (Array.isArray(h.unitIds) && h.unitIds.includes(unitId)));
    return false;
  });
}

/**
 * De-clutter pills on screen: items [{ id, x, y, w, h }] are screen-pixel boxes centred on (x, y); a box that overlaps an earlier one is pushed along its own
 * long axis ('x' pills slide down, 'y' pills slide right) until it clears. Returns { id: { dx, dy } } offsets (in px). Pure, greedy, stable by input order.
 */
export function declutter(items, { gap = 4, tries = 12 } = {}) {
  const placed = []; const out = {};
  items.forEach((it) => {
    let dx = 0; let dy = 0;
    const hit = (b) => Math.abs(it.x + dx - b.x) * 2 < it.w + b.w + gap && Math.abs(it.y + dy - b.y) * 2 < it.h + b.h + gap;
    for (let i = 0; i < tries && placed.some(hit); i++) { if (it.axis === 'x') dy += it.h + gap; else dx += it.w + gap; }
    out[it.id] = { dx, dy };
    placed.push({ x: it.x + dx, y: it.y + dy, w: it.w, h: it.h });
  });
  return out;
}

/** snap candidates: standard sizes (+ neighbours) inside the handle's range, de-duplicated, ascending */
export const snapList = (lo, hi, extra = [], std = STD_WIDTHS) => [...new Set([...std, ...extra].filter((v) => Number.isFinite(v) && v >= lo && v <= hi))].sort((a, b) => a - b);

/** the on-screen value of one drag: pointer delta -> raw -> resolved. A single place the layer and the tests share. */
export function dragStep(h, start, dx, dy, mods = {}) {
  const raw = rawFromDrag(h, start, dragDelta(h, dx, dy), mods);
  return resolveValue(h, raw, mods);
}

/** English / Arabic pair helper for builders */
export const T = (en, ar) => ({ en, ar: ar || en });

/**
 * The ONE commit path every studio uses for a handle: 'start' opens a new drag (a fresh history key), 'drag' / 'key' call the handle's own `apply` and hand the
 * resulting model to the studio's commit() with the key, 'end' only closes. `commit(next, key, result)`; returns the apply result (or null).
 * Because every drag move shares one `hdl:` key the studios' history merges them: ONE gesture = ONE undo step, however long the pointer rests.
 */
export function createHandleDispatch(commit, seq = { n: 0 }) {
  return (h, v, phase) => {
    if (phase === 'start') { seq.n += 1; return null; }
    if (phase === 'end') return null;
    const r = h.apply(v);
    if (!r || r.next === undefined || r.next === null) return r || null;
    commit(r.next, phase === 'key' ? nudgeKey(h.id) : dragKey(h.id, seq.n), r);
    return r;
  };
}
