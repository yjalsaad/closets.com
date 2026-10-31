/* Neo Kitchen Designer - the Base screen's plan diagram and add-unit rules (UX-14), as pure functions of the LIVE model.
 * basePlanLayout() = rowPlan.planLayout() (same scale, tall units in the base footprint, pale wall / top ghosts, hidden units dashed)
 * plus what the base screen adds: the door / drawer fronts of every base unit, the sink marker, a width label under each unit, one
 * draggable divider between every two neighbouring units and the two total-width handles. moveDivider() / planAddUnit() are the
 * edits behind those controls; they return NEW models built from the same setters the manual editors use, so every change goes
 * through the designer's commit() as one undoable step. Nothing here touches React or the DOM; model values are mm. */
import { planLayout } from './rowPlan';
import { secHeights } from './geometry';
import { UNIT_W, TALL_H } from './constants';
import { rowWidth, isTall, tallH, clamp, newSection, normUnit, addUnit, patchUnit, setUnitWidth, sum, runLenRange, isFlipRun } from './model';
import { isCornerType } from './unitDraft';

const rng = (rk) => runLenRange(rk);

/* ------------------------------------------------------------------------------------------------------------------ plan */
/** the door / drawer fronts of one unit as rectangles inside its plan rectangle (px), top section first, like the 3D front */
function frontsOf(unit, model, it, s) {
  const H = isTall(unit) ? tallH(unit) : model.g.baseH;
  const corner = isCornerType(unit.type);
  const secs = corner ? [{ t: 'door', n: 1, shelves: 0 }] : unit.secs;
  const hs = secHeights(secs, H);
  const pad = 1.2; let y = it.y + pad;
  const innerW = Math.max(1, it.width - pad * 2);
  return secs.map((sec, i) => {
    const h = Math.max(1, hs[i] * s - (i === secs.length - 1 ? pad : 0)); const f = { i, t: sec.t, n: sec.n, x: it.x + pad, y, w: innerW, h, lines: [] };
    y += hs[i] * s;
    const leaves = sec.t === 'door' || sec.t === 'glass' || sec.t === 'sink';
    if (leaves && sec.n > 1) for (let k = 1; k < Math.min(4, sec.n); k++) f.lines.push({ x1: f.x + (innerW * k) / sec.n, x2: f.x + (innerW * k) / sec.n, y1: f.y, y2: f.y + f.h });
    if (sec.t === 'drawer' || sec.t === 'hob') for (let k = 1; k < sec.n; k++) f.lines.push({ x1: f.x, x2: f.x + innerW, y1: f.y + (f.h * k) / sec.n, y2: f.y + (f.h * k) / sec.n });
    if (sec.t === 'open') for (let k = 1; k <= Math.min(sec.n, 4); k++) f.lines.push({ x1: f.x, x2: f.x + innerW, y1: f.y + (f.h * k) / (sec.n + 1), y2: f.y + (f.h * k) / (sec.n + 1) });
    return f;
  });
}

/**
 * @param {object} model
 * @param {{rk?: string, selId?: string|null, W?: number}} o
 * @returns the planLayout() structure with: items[].fronts / sink / cm, dividers[], bars, widths[], total line, H adjusted for the dimension rows
 */
export function basePlanLayout(model, { rk = 'main', selId = null, W = 250 } = {}) {
  const lay = planLayout(model, { rk, row: 'base', selId, W });
  const { s, floorY } = lay;
  const arr = model.runs[rk].base; const byId = new Map(arr.map((u) => [u.id, u]));
  const flip = isFlipRun(model, rk);
  const items = lay.items.map((it) => {
    if (!it.focus) return it;
    const u = byId.get(it.id);
    const fronts = it.hidden ? [] : frontsOf(u, model, it, s);
    const sink = !it.hidden && fronts.some((f) => f.t === 'sink');
    const sf = fronts.find((f) => f.t === 'sink');
    return { ...it, fronts, sink, sinkAt: sf ? { x: sf.x + sf.w / 2, y: sf.y - 2 } : null, cm: Math.round(it.w / 10) };
  });
  const focus = items.filter((i) => i.focus).sort((a, b) => a.idx - b.idx);
  const xmin = focus.length ? Math.min(...focus.map((i) => i.x)) : 0; const xmax = focus.length ? Math.max(...focus.map((i) => i.x + i.width)) : 0;
  /* one divider between every two neighbours (array order; on the mirrored left leg the first unit is on the right) */
  const dividers = focus.slice(0, -1).map((a, k) => {
    const b = focus[k + 1];
    const edge = flip ? a.x : a.x + a.width; // px of the boundary
    return { key: `${a.id}|${b.id}`, aId: a.id, bId: b.id, x: edge, y: floorY + 4, dir: flip ? -1 : 1, aEdge: flip ? a.x + a.width : a.x, aMM: a.w, bMM: b.w };
  });
  const total = rowWidth(arr);
  const barH = Math.min(30, Math.max(14, lay.mmH * s * 0.2)); const barY = floorY - barH - 6;
  const bars = focus.length ? { y: barY, h: barH, left: xmin - 9, right: xmax + 5, total, s } : null;
  const widthY = floorY + 18; const lineY = floorY + 26; const textY = floorY + 39;
  const line = { x0: xmin, x1: xmax, y: lineY, cx: (xmin + xmax) / 2, ty: textY, mm: total };
  return { ...lay, items, dividers, bars, widthY, line, H: Math.round(textY + 8), xmin, xmax, flip, count: focus.length };
}

/* ------------------------------------------------------------------------------------------------------- divider dragging */
/**
 * Move the boundary between unit A and its right-hand neighbour B so that A is `wantA` mm wide.
 * keepWidth on: B takes (or gives) the difference, the run total is unchanged, both stay inside UNIT_W.
 * keepWidth off: only A changes (the run grows or shrinks), within the run's own width range.
 * @returns {{ model, clamped: boolean, a: number, b: number }}
 */
export function moveDivider(model, rk, aId, bId, wantA) {
  const arr = model.runs[rk].base;
  const a = arr.find((u) => u.id === aId); const b = arr.find((u) => u.id === bId);
  if (!a || !b) return { model, clamped: false, a: a ? a.w : 0, b: b ? b.w : 0 };
  const want = Math.round(+wantA || 0);
  if (model.keepWidth) {
    const T = a.w + b.w;
    const lo = Math.max(UNIT_W.min, T - UNIT_W.max); const hi = Math.min(UNIT_W.max, T - UNIT_W.min);
    const na = clamp(want, lo, hi); const nb = T - na;
    if (na === a.w) return { model, clamped: na !== want, a: a.w, b: b.w };
    const next = arr.map((u) => (u.id === aId ? { ...u, w: na } : u.id === bId ? { ...u, w: nb } : u));
    return { model: { ...model, runs: { ...model.runs, [rk]: { ...model.runs[rk], base: next } } }, clamped: na !== want, a: na, b: nb };
  }
  const r = setUnitWidth(model, rk, 'base', aId, want);
  const total = rowWidth(r.model.runs[rk].base); const R = rng(rk);
  if (total < R.min || total > R.max) return { model, clamped: true, a: a.w, b: b.w };
  const na = r.model.runs[rk].base.find((u) => u.id === aId).w;
  return { model: r.model, clamped: na !== want, a: na, b: b.w };
}

/* ------------------------------------------------------------------------------------------------------------ add a unit */
const D = (n, extra) => newSection('door', n, extra);
/** the unit types the add menu offers - only what the model really supports (UNIT_TYPES + the section types of SECTYPES) */
export const ADD_TYPES = [
  { key: 'standard', en: 'Standard unit', ar: 'وحدة عادية', hint: ['2 doors · 1 shelf', 'ضلفتان · رف'], w: 600, make: () => ({ type: 'normal', secs: [D(2, { shelves: 1 })] }) },
  { key: 'drawers', en: 'Drawers', ar: 'أدراج', hint: ['3 drawers', '٣ أدراج'], w: 600, make: () => ({ type: 'normal', secs: [newSection('drawer', 3)] }) },
  { key: 'sink', en: 'Sink unit', ar: 'وحدة حوض', hint: ['doors + worktop cut-out', 'أبواب + فتحة السطح'], w: 800, make: () => ({ type: 'normal', secs: [newSection('sink', 2, { shelves: 0 })] }) },
  { key: 'hob', en: 'Hob unit', ar: 'وحدة موقد', hint: ['drawers + worktop cut-out', 'أدراج + فتحة السطح'], w: 600, make: () => ({ type: 'normal', secs: [newSection('hob', 3)] }) },
  { key: 'open', en: 'Open shelf', ar: 'رف مفتوح', hint: ['3 open shelves', '٣ رفوف مفتوحة'], w: 600, make: () => ({ type: 'normal', secs: [newSection('open', 3)] }) },
  { key: 'tall', en: 'Tall unit', ar: 'وحدة طويلة', hint: [`${TALL_H.def / 10} cm high · 3 doors`, `${TALL_H.def / 10} سم · ٣ أبواب`], w: 600, make: () => ({ type: 'tall', h: TALL_H.def, secs: [D(1, { shelves: 0 }), D(1, { shelves: 0 }), D(1, { shelves: 0 })] }) },
  { key: 'blind', en: 'Blind corner', ar: 'ركن أعمى', hint: ['one corner front', 'واجهة ركن واحدة'], w: 900, make: () => ({ type: 'blind', secs: [D(1, { shelves: 0 })] }) },
  { key: 'carousel', en: 'Carousel corner', ar: 'ركن دوّار', hint: ['bi-fold + carousel', 'ضلفتان + أرفف دوّارة'], w: 900, make: () => ({ type: 'carousel', secs: [D(1, { shelves: 0 })] }) },
  { key: 'diagonal', en: 'Diagonal corner', ar: 'ركن قطري', hint: ['diagonal door', 'باب قطري'], w: 900, make: () => ({ type: 'diagonal', secs: [D(1, { shelves: 0 })] }) },
];

/** the widest unit that can still be added, in mm (0 = none): keepWidth -> what the other free units can give up, else what is left of the run's maximum */
export function addRoom(model, rk) {
  const arr = model.runs[rk].base;
  if (model.keepWidth) {
    const free = arr.filter((u) => !isTall(u));
    return free.length ? Math.max(0, Math.min(UNIT_W.max, sum(free.map((u) => u.w)) - free.length * UNIT_W.min)) : 0;
  }
  return Math.max(0, Math.min(UNIT_W.max, rng(rk).max - rowWidth(arr)));
}

/**
 * Validate and build "add this type with this width" (width in mm; null = the type's default).
 * @returns {{ ok: boolean, model: object, id?: string, w?: number, en?: string, ar?: string }} on failure `model` is the unchanged input
 */
export function planAddUnit(model, rk, key, widthMM = null) {
  const spec = ADD_TYPES.find((t) => t.key === key);
  const fail = (en, ar) => ({ ok: false, model, en, ar });
  if (!spec) return fail('Unknown unit type.', 'نوع وحدة غير معروف.');
  const w = widthMM == null ? spec.w : Math.round(widthMM);
  if (!Number.isFinite(w) || w < UNIT_W.min || w > UNIT_W.max) return fail(`Width must be ${UNIT_W.min / 10}-${UNIT_W.max / 10} cm.`, `يجب أن يكون العرض ${UNIT_W.min / 10}-${UNIT_W.max / 10} سم.`);
  if (['blind', 'carousel', 'diagonal'].includes(spec.key) && w < 900) return fail('A corner unit must be at least 90 cm wide.', 'وحدة الركن يجب ألا تقل عن ٩٠ سم.');
  const room = addRoom(model, rk);
  if (room < UNIT_W.min) {
    return model.keepWidth
      ? fail(`No free space: with the total width kept, the other units cannot shrink below ${UNIT_W.min / 10} cm. Untick "Keep the kitchen's total width" or make a unit narrower.`, `لا توجد مساحة: مع تثبيت العرض الكلي لا تستطيع الوحدات الأخرى أن تصغر عن ${UNIT_W.min / 10} سم. ألغِ التثبيت أو قلّل عرض وحدة.`)
      : fail(`The run is already at its maximum width (${rng(rk).max / 10} cm).`, `الصف وصل إلى أقصى عرض (${rng(rk).max / 10} سم).`);
  }
  if (w > room) return fail(`Only ${Math.floor(room / 10)} cm is free${model.keepWidth ? ' (the other units can share that much)' : ''}. Choose a narrower unit.`, `المتاح ${Math.floor(room / 10)} سم فقط${model.keepWidth ? ' (ما تستطيع الوحدات الأخرى التنازل عنه)' : ''}. اختر وحدة أضيق.`);
  const made = normUnit({ ...spec.make(), w, grainFront: 'auto' });
  const before = model.runs[rk].base; const total = rowWidth(before);
  const next = addUnit(model, rk, 'base', made);
  const after = next.runs[rk].base; const added = after[after.length - 1];
  const tot = rowWidth(after);
  if (model.keepWidth && Math.abs(tot - total) > 0.5) return fail('The other units cannot share this width. Choose a narrower unit.', 'لا تستطيع الوحدات الأخرى تقاسم هذا العرض. اختر وحدة أضيق.');
  if (tot < rng(rk).min || tot > rng(rk).max) return fail(`The run would be ${tot / 10} cm; it must stay within ${rng(rk).min / 10}-${rng(rk).max / 10} cm.`, `سيصبح الصف ${tot / 10} سم؛ ويجب أن يبقى بين ${rng(rk).min / 10}-${rng(rk).max / 10} سم.`);
  return { ok: true, model: next, id: added.id, w: added.w };
}

/** turn a unit off / on: hidden = not built (left out of the 3D view, elevation, cut list, DXF), its configuration is kept and its width still counts */
export const toggleUnitOff = (model, rk, id) => patchUnit(model, rk, 'base', id, (u) => ({ ...u, hidden: !u.hidden }));
