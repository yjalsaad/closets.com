/* Neo Kitchen Designer - pure logic behind the Wall tab cards (UX-17): which section types a wall unit offers, the leaf choices,
 * the isometric preview layout, the width-drag maths, "Match wall widths to base row" and the one-click "Add unit" planner.
 * No React, no DOM; unit-tested. */
import { SECTYPES, UNIT_W } from './constants';
import { secHeights } from './geometry';
import { rowWidth, wallSpan, patchUnit, addUnit } from './model';
import { isCornerType } from './unitDraft';

/** the section types the dropdown offers. Appliance fronts (sink / hob / oven / fridge) cut the WORKTOP or need a base niche, so only the base row has them. */
const BASE_ONLY = ['sink', 'hob', 'oven', 'fridge'];
export const sectionTypeChoices = (row) => Object.keys(SECTYPES).filter((k) => row === 'base' || !BASE_ONLY.includes(k));
/** sections with a leaf / drawer / shelf count, and the largest count the model accepts (same limits as setSectionCount) */
export const countKind = (t) => (t === 'door' || t === 'glass' || t === 'sink' ? 'leaf' : t === 'drawer' || t === 'hob' ? 'drawer' : t === 'open' ? 'shelf' : null);
export const countMax = (t) => (countKind(t) === 'leaf' ? 4 : 8);
/** the count buttons shown in a row: 1 | 2 (3 | 4 for drawers and open shelves), plus the current value when it is outside that list */
export function countChoices(sec) {
  const k = countKind(sec.t); if (!k) return [];
  const base = k === 'leaf' ? [1, 2] : [1, 2, 3, 4];
  return base.includes(sec.n) ? base : [...base, sec.n].sort((a, b) => a - b);
}

/* ---- isometric preview ---- */
export const ISO = { s: 0.26, vw: 360, dx: 44, dy: 24, top: 40, foot: 40 };
/** layout of the preview in SVG units: front face, side depth, one box per section. Fixed scale (mm -> px), so a width / height change is a
 *  visible change and a drag keeps a stable mm-per-pixel. The front face is centred horizontally. */
export function isoLayout(unit, W, H, rowH = H) {
  const { s, vw, dx, dy, top } = ISO;
  const fw = W * s; const fh = H * s;
  const x0 = (vw - dx - fw) / 2; const y0 = top + dy;
  const secs = isCornerType(unit.type) ? [{ t: 'door', n: 1, h: 0 }] : unit.secs;
  const hs = secHeights(secs, H);
  let y = y0;
  const sections = secs.map((sec, i) => {
    const h = hs[i] * s; const r = { i, t: sec.t, n: sec.n, shelves: sec.shelves || 0, hinge: sec.hinge, x: x0, y, w: fw, h }; y += h; return r;
  });
  return { s, fw, fh, x0, y0, dx, dy, sections, vw, vh: y0 + Math.max(H, rowH) * s + ISO.foot, right: x0 + fw, bottom: y0 + fh };
}
/** width after dragging an edge by `dxSvg` SVG units (the face stays centred, so the edge moves half of the growth): side 1 = right edge, -1 = left edge */
export const dragWidth = (w0, dxSvg, side, s = ISO.s) => Math.round(w0 + (2 * side * dxSvg) / s);
export const dragHeight = (h0, dySvg, s = ISO.s) => Math.round(h0 + dySvg / s);

/* ---- Match wall widths to base row ---- */
/** Rule: the wall row must span exactly the space the base row leaves between its tall units (wallSpan), i.e. the width the base cabinets run
 *  under it. The difference is shared across the wall units in proportion to their widths (rounded to whole cm), every unit stays inside
 *  UNIT_W.min..max, and what rounding / clamping leaves over is handed unit by unit. Unit order, sections and heights are untouched. */
export function matchWallPlan(model, rk) {
  const run = model.runs[rk]; const wall = run.wall || [];
  const target = wallSpan(run.base); const cur = rowWidth(wall);
  if (!wall.length) return { ok: false, reason: 'empty', en: 'Add a wall unit first.', ar: 'أضف وحدة علوية أولاً.', target, cur };
  if (!(run.base || []).length || target <= 0) return { ok: false, reason: 'nobase', en: 'The base row has no space to match.', ar: 'الصف السفلي لا يحتوي مساحة للمطابقة.', target, cur };
  if (Math.abs(target - cur) < 0.5) return { ok: false, reason: 'same', en: 'The wall row already matches the base row.', ar: 'الصف العلوي مطابق للصف السفلي أصلاً.', target, cur };
  if (target < wall.length * UNIT_W.min || target > wall.length * UNIT_W.max) {
    return { ok: false, reason: 'range', en: `${wall.length} unit(s) cannot span ${Math.round(target / 10)} cm (each unit is ${UNIT_W.min / 10}-${UNIT_W.max / 10} cm).`, ar: `لا يمكن لـ ${wall.length} وحدة تغطية ${Math.round(target / 10)} سم (كل وحدة ${UNIT_W.min / 10}-${UNIT_W.max / 10} سم).`, target, cur };
  }
  const clampW = (v) => Math.min(UNIT_W.max, Math.max(UNIT_W.min, v));
  const ws = wall.map((u) => clampW(Math.round((u.w * target) / cur / 10) * 10));
  let diff = target - ws.reduce((a, b) => a + b, 0);
  for (let guard = 0; Math.abs(diff) >= 0.5 && guard < 400; guard++) {
    let moved = false;
    for (let i = 0; i < ws.length && Math.abs(diff) >= 0.5; i++) {
      const step = Math.sign(diff) * Math.min(10, Math.abs(diff));
      const nw = clampW(ws[i] + step);
      if (nw !== ws[i]) { diff -= nw - ws[i]; ws[i] = nw; moved = true; }
    }
    if (!moved) break;
  }
  return { ok: Math.abs(diff) < 0.5, reason: 'ok', widths: ws, target, cur, en: '', ar: '' };
}
export function matchWallToBase(model, rk) {
  const p = matchWallPlan(model, rk);
  if (!p.ok) return model;
  return (model.runs[rk].wall || []).reduce((m, u, i) => patchUnit(m, rk, 'wall', u.id, (x) => ({ ...x, w: p.widths[i] })), model);
}

/* ---- one-click Add unit ---- */
export const ADD_TYPES = { wall: ['standard', 'glass', 'drawers', 'open', 'flip'], top: ['standard', 'glass', 'drawers', 'open', 'flip'] };
/** Add one unit to a row with a front of the chosen kind. addUnit() (model.js) already picks the width: the free space in the run first,
 *  else the neighbours share the change (keep-total) within UNIT_W; it returns the SAME model when there is no room, which is reported here. */
export function addUnitPlan(model, rk, row, kind = 'standard') {
  const before = model.runs[rk][row] || [];
  const next = addUnit(model, rk, row);
  const arr = next.runs[rk][row] || [];
  const span = row === 'base' ? null : wallSpan(model.runs[rk].base);
  /* with "keep the kitchen's width" on, a wall / top row that would outgrow the base run is refused (no room) instead of silently overlapping */
  if (arr.length <= before.length || (model.keepWidth && span != null && span > 0 && rowWidth(arr) > span + 0.5 && rowWidth(before) <= span + 0.5)) {
    return { ok: false, model, id: null, en: `No room for another unit: the row is full (each unit is at least ${UNIT_W.min / 10} cm). Make a unit narrower first.`, ar: `لا توجد مساحة لوحدة أخرى: الصف ممتلئ (أقل عرض للوحدة ${UNIT_W.min / 10} سم). قلّل عرض وحدة أولاً.` };
  }
  const ids = new Set(before.map((u) => u.id));
  const nu = arr.find((u) => !ids.has(u.id));
  if (!nu) return { ok: false, model, id: null, en: 'Could not add the unit.', ar: 'تعذر إضافة الوحدة.' };
  const MAP = { standard: { t: 'door', n: 1 }, glass: { t: 'glass', n: 1 }, drawers: { t: 'drawer', n: 3 }, open: { t: 'open', n: 2 }, flip: { t: 'flip', n: 1 } };
  const m = MAP[kind] || MAP.standard;
  const out = kind === 'standard' ? next : patchUnit(next, rk, row, nu.id, (u) => ({ ...u, secs: [{ ...u.secs[0], t: m.t, n: m.n, shelves: m.t === 'door' || m.t === 'glass' || m.t === 'flip' ? Math.max(1, u.secs[0].shelves || 0) : 0 }] }));
  return { ok: true, model: out, id: nu.id, width: nu.w };
}

/* ---- row gap warning (leg / main wall + top rows) ---- */
const RUN_EN = { main: '', left: 'Left ', right: 'Right ', run2: 'Run 2 ', pen: 'Peninsula ', isl: 'Island ' };
const RUN_AR = { main: '', left: 'اليسرى ', right: 'اليمنى ', run2: 'الصف ٢ ', pen: 'الجزيرة الممتدة ', isl: 'الجزيرة ' };
/** "Left Wall: a 22 cm gap will stay ..." - the wall / top row is narrower than the space it should fill (the base row between its tall units) and
 *  the units either can still grow (use Match) or are already at the maximum width (add a unit). Numbers come from the model; null when there is no gap. */
export function rowGapIssue(model, rk, row, lang = 'en') {
  if (row !== 'wall' && row !== 'top') return null;
  const run = model.runs[rk]; const arr = run[row] || [];
  if (!arr.length) return null;
  const span = wallSpan(run.base); const gap = span - rowWidth(arr);
  if (gap < 5) return null;
  const room = arr.reduce((a, u) => a + Math.max(0, UNIT_W.max - u.w), 0);
  const cmv = Math.round(gap / 10 * 10) / 10; const maxcm = UNIT_W.max / 10;
  const nameEn = `${RUN_EN[rk]}${row === 'wall' ? 'Wall' : 'Top'}`; const nameAr = `${row === 'wall' ? 'العلوي' : 'الثالث'} ${RUN_AR[rk]}`.trim();
  if (room + 0.5 < gap) {
    return { level: 'warn', code: `gap:${rk}:${row}`, en: `${nameEn}: a ${cmv} cm gap will stay — units go up to ${maxcm} cm. Add a unit to this row (divisions step) or make a smaller change.`, ar: `${nameAr}: سيبقى فراغ ${cmv} سم — الوحدات حتى ${maxcm} سم. أضف وحدة إلى هذا الصف (خطوة التقسيم) أو أجرِ تغييرًا أصغر.` };
  }
  return { level: 'warn', code: `gap:${rk}:${row}`, en: `${nameEn}: the row is ${cmv} cm shorter than the space under it. Use "Match wall widths to base row" or widen a unit.`, ar: `${nameAr}: الصف أقصر بـ ${cmv} سم من المساحة تحته. استخدم «مطابقة عرض العلوي مع الصف السفلي» أو وسّع وحدة.` };
}
