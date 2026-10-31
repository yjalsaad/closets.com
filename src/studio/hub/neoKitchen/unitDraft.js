/* Neo Kitchen Designer - pure helpers behind the assistant dock's selected-cabinet card (UX-1b).
 * Every function takes a model and returns a NEW model built from the SAME setters the manual editors use (setUnitWidth, setUnitType,
 * patchUnit, setSecCount ...), so Apply = commit(draft) is identical to a manual edit and Cancel simply drops the draft.
 * Nothing here touches React or the DOM. */
import { UNIT_W, UNIT_TYPES } from './constants';
import { setUnitWidth, setUnitType, patchUnit, setSecCount, setSectionHeight, isTall, tallH, runWallH, clamp, rowWidth, runLenRange } from './model';
import { secHeights } from './geometry';

export const IN_MM = 25.4;

/** find a unit in the model; null when it is gone (deleted / undone) */
export function findUnit(model, rk, row, id) {
  const arr = model && model.runs && model.runs[rk] && model.runs[rk][row];
  return (arr || []).find((u) => u.id === id) || null;
}

/** carcass height of a unit, mirroring what geometry.js draws (tall = its own height, base = baseH, wall = run wall height, top = topH) */
export function unitHeight(model, rk, row, u) {
  if (row === 'base') return isTall(u) ? tallH(u) : model.g.baseH;
  if (row === 'wall') return u.h ? Math.min(u.h, runWallH(model, rk)) : runWallH(model, rk);
  return u.h ? Math.min(u.h, model.g.topH) : model.g.topH;
}

/** width step in mm for the -5 / -1 / +1 / +5 buttons: whole centimetres, or whole inches when the project shows inches */
export const stepMM = (k, unit) => k * (unit === 'in' ? IN_MM : 10);
/** unit shown next to the width ('cm' for mm projects, 'in' for inch projects) */
export const widthUnit = (unit) => (unit === 'in' ? 'in' : 'cm');
export const widthShown = (mm, unit) => (unit === 'in' ? Math.round((mm / IN_MM) * 10) / 10 : Math.round(mm) / 10);
export const widthFromShown = (v, unit) => (unit === 'in' ? v * IN_MM : v * 10);

/** change one unit width by `deltaMM`, honouring model.keepWidth exactly like the sidebar editor */
export function stepWidth(model, rk, row, id, deltaMM) {
  const u = findUnit(model, rk, row, id);
  if (!u) return { model, clamped: false };
  return setUnitWidth(model, rk, row, id, u.w + Math.round(deltaMM));
}

/** Normal <-> Tall (base row only; corner types have no such switch) */
export function canSwitchTall(model, rk, row, id) {
  const u = findUnit(model, rk, row, id);
  return !!u && row === 'base' && (u.type === 'normal' || u.type === 'tall');
}
export function switchTall(model, rk, row, id) {
  if (!canSwitchTall(model, rk, row, id)) return model;
  const u = findUnit(model, rk, row, id);
  return setUnitType(model, rk, row, id, isTall(u) ? 'normal' : 'tall');
}

/** change the front type of one section; keeps the same count / shelf rules as the sidebar's section editor */
export function setSectionType(model, rk, row, id, si, t) {
  return patchUnit(model, rk, row, id, (u) => ({
    ...u,
    secs: u.secs.map((s, j) => (j !== si ? s : {
      ...s, t,
      n: Math.max(1, Math.min(t === 'door' || t === 'glass' || t === 'sink' ? 4 : 8, s.n)),
      shelves: t === 'door' || t === 'glass' || t === 'flip' ? Math.max(s.shelves, 1) : 0,
    })),
  }));
}
export function setSectionCount(model, rk, row, id, si, n) {
  return patchUnit(model, rk, row, id, (u) => ({ ...u, secs: u.secs.map((s, j) => (j === si ? { ...s, n: clamp(n, 1, s.t === 'door' || s.t === 'glass' || s.t === 'sink' ? 4 : 8) } : s)) }));
}
export const removeSection = (model, rk, row, id, si) => patchUnit(model, rk, row, id, (u) => (u.secs.length < 2 ? u : { ...u, secs: u.secs.filter((_, j) => j !== si) }));
export const setDivisions = (model, rk, row, id, n) => patchUnit(model, rk, row, id, (u) => setSecCount(u, n));

/** does the draft differ from the committed model? (setters always return fresh objects, so compare content, not identity) */
export function isDirty(base, draft) { return !!draft && draft !== base && JSON.stringify(draft) !== JSON.stringify(base); }

/** the width limits the card shows as its hint (cm) */
export const widthLimitsCm = () => [UNIT_W.min / 10, UNIT_W.max / 10];

/* ---------------------------------------------------------------------------------------------------------------------------
 * UX-12: reorder, section heights, unit types, validation, section <-> scene part mapping
 * ------------------------------------------------------------------------------------------------------------------------ */
export const isCornerType = (t) => t === 'blind' || t === 'carousel' || t === 'diagonal';

/** move one section from index `from` to index `to` (corner units have a single fixed front, so they never reorder) */
export function moveSection(model, rk, row, id, from, to) {
  return patchUnit(model, rk, row, id, (u) => {
    const n = u.secs.length;
    if (from === to || from < 0 || to < 0 || from >= n || to >= n || isCornerType(u.type)) return u;
    const secs = [...u.secs];
    const [s] = secs.splice(from, 1);
    secs.splice(to, 0, s);
    return { ...u, secs };
  });
}

/** the unit types the dropdown offers: only the base row has them (same rule as the sidebar editor) */
export const unitTypeChoices = (row) => (row === 'base' ? Object.keys(UNIT_TYPES) : []);
export function changeUnitType(model, rk, row, id, type) {
  if (row !== 'base' || !UNIT_TYPES[type]) return model;
  const u = findUnit(model, rk, row, id);
  if (!u || u.type === type) return model;
  return setUnitType(model, rk, row, id, type);
}

/** calculated section heights (mm) exactly as geometry.js lays them out, and whether each is automatic */
export function sectionCalc(model, rk, row, u) {
  const hs = secHeights(u.secs, unitHeight(model, rk, row, u));
  return u.secs.map((s, i) => ({ h: hs[i], auto: !s.h }));
}
/** fix a section height (mm) or return it to auto (mm = null); same setter as the sidebar and the elevation drag */
export function setSectionFixed(model, rk, row, id, si, mm) {
  const u = findUnit(model, rk, row, id);
  if (!u) return model;
  return setSectionHeight(model, rk, row, id, si, mm, unitHeight(model, rk, row, u));
}
/** drag the divider under section `si`: that section gets the height from the unit top to the pointer (fraction 0..1 of the unit) */
export function dragDivider(model, rk, row, id, si, fraction) {
  const u = findUnit(model, rk, row, id);
  if (!u || si < 0 || si >= u.secs.length - 1) return model;
  const H = unitHeight(model, rk, row, u);
  const above = secHeights(u.secs, H).slice(0, si).reduce((a, b) => a + b, 0);
  return setSectionFixed(model, rk, row, id, si, Math.round(fraction * H - above));
}

const rowOf = (m, rk, row) => (m.runs && m.runs[rk] && m.runs[rk][row]) || [];
/** Validate the draft before Apply. errors block Apply; warnings are shown but allowed (the same rules the Warnings list uses). */
export function validateUnitDraft(committed, draft, rk, row, id) {
  const errors = []; const warnings = [];
  const u = findUnit(draft, rk, row, id);
  if (!u) { errors.push({ code: 'missing', en: 'This cabinet no longer exists.', ar: 'هذه الخزانة لم تعد موجودة.' }); return { errors, warnings }; }
  if (u.w < UNIT_W.min || u.w > UNIT_W.max) errors.push({ code: 'width', en: `Width must be ${UNIT_W.min / 10}-${UNIT_W.max / 10} cm.`, ar: `يجب أن يكون العرض ${UNIT_W.min / 10}-${UNIT_W.max / 10} سم.` });
  if (row === 'base') {
    const total = rowWidth(rowOf(draft, rk, 'base'));
    const rng = runLenRange(rk);
    if (total < rng.min || total > rng.max) errors.push({ code: 'run', en: `The run would be ${total / 10} cm; it must stay within ${rng.min / 10}-${rng.max / 10} cm.`, ar: `سيصبح الصف ${total / 10} سم؛ ويجب أن يبقى بين ${rng.min / 10}-${rng.max / 10} سم.` });
    const before = rowWidth(rowOf(committed, rk, 'base'));
    if (draft.keepWidth && total !== before) warnings.push({ code: 'keep', en: `"Keep total width" is on but the run changes from ${before / 10} to ${total / 10} cm (a corner unit has a minimum width).`, ar: `خيار تثبيت العرض مفعّل لكن الصف يتغير من ${before / 10} إلى ${total / 10} سم (وحدة الركن لها حد أدنى).` });
  }
  const H = unitHeight(draft, rk, row, u);
  const fixed = u.secs.reduce((a, s) => a + (s.h || 0), 0);
  const autos = u.secs.filter((s) => !s.h).length;
  if (!isCornerType(u.type)) {
    if (autos === 0 && fixed > H + 0.5) errors.push({ code: 'height', en: `Section heights add up to ${Math.round(fixed) / 10} cm but the cabinet is ${H / 10} cm.`, ar: `مجموع ارتفاعات الأقسام ${Math.round(fixed) / 10} سم والخزانة ${H / 10} سم.` });
    else if (autos > 0 && (H - fixed) / autos < 100) errors.push({ code: 'height', en: 'The automatic sections would be under 10 cm high. Reduce a fixed height or remove a section.', ar: 'الأقسام التلقائية ستصبح أقل من ١٠ سم. قلّل ارتفاعًا ثابتًا أو احذف قسمًا.' });
  }
  if (row === 'base' || row === 'wall') {
    const wallRow = rowOf(draft, rk, 'wall');
    const b = rowOf(draft, rk, 'base').filter((x) => !isTall(x)).reduce((a, x) => a + x.w, 0);
    const w = rowWidth(wallRow);
    if (wallRow.length && Math.abs(b - w) > 0.5) warnings.push({ code: 'flush', en: `Base run (${b / 10} cm) and wall run (${w / 10} cm) differ - the rows will not line up.`, ar: `الصف السفلي (${b / 10} سم) والعلوي (${w / 10} سم) مختلفان - لن يتحاذيا.` });
  }
  return { errors, warnings };
}

/* Selection <-> section mapping. The 3D view and the elevation select PARTS (scene part ids); a section's parts carry `sec`. */
const FRONTS = ['door', 'drawer', 'glass', 'flip', 'cover'];
/** the part to select when a section card is picked: its first front panel, else any part of that section */
export function partForSection(scene, unitId, si) {
  const ps = ((scene && scene.parts) || []).filter((p) => p.unitId === unitId && p.sec === si);
  return ps.find((p) => p.view === 'front' && FRONTS.includes(p.ptype)) || ps.find((p) => FRONTS.includes(p.ptype)) || ps[0] || null;
}
/** the section index the current selection points at (null for a carcass / another unit / nothing) */
export function sectionOfSelection(scene, sel, unitId) {
  if (!sel || sel.unitId !== unitId || !sel.partId) return null;
  const p = ((scene && scene.parts) || []).find((x) => x.id === sel.partId);
  return p && typeof p.sec === 'number' ? p.sec : null;
}
/** do draft and committed have the same section structure? (when not, the 3D view still shows the committed one) */
export function sameStructure(a, b) {
  const sig = (u) => (u ? `${u.type}#${u.secs.map((s) => `${s.t}:${s.n}:${s.h || 0}`).join('|')}` : '');
  return sig(a) === sig(b);
}
