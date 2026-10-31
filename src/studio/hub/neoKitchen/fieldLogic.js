/* Neo Kitchen Designer UX-23 - pure logic behind the ONE shared parameter input (ParameterField.jsx).
 * No React, no DOM: parsing of typed text (Arabic-Indic digits, decimal comma), range validation, the clamp message, keyboard stepping and the
 * unit / display conversion. Every value that leaves a field is in model millimetres (or the field's own unit when it is not a length);
 * the field only changes how a value is shown and what is announced - it never alters a dimension the model computes.
 *
 * A "scale" says how a model value is shown: { to(model) -> shown, from(shown) -> model, label, step }.
 *   scaleOf('mm', 'mm')            millimetres, shown rounded to 2 dp
 *   scaleOf('mm', 'in')            inches (2 dp) for an inch project
 *   scaleOf('%', 'mm')             any other unit passes through unchanged
 *   cmScale('mm' | 'in')           centimetres (1 dp) - or inches - for the unit-width fields */
import { normDigits } from './model';
import { parseLength, getOutput } from './outputSettings';

export const IN = 25.4;
const r2 = (v) => Math.round(v * 100) / 100;

/** typed text -> number (NaN when it is not one). Accepts Arabic-Indic digits and a decimal comma. */
export function parseEntry(text, unitId) {
  if (unitId === 'mm' || unitId === 'cm' || unitId === 'in') return parseLength(text, unitId); // [NEO-OUTPUT-UX34] 3/4, 1 3/4, 1'-6", 60cm in any length field
  const n = parseFloat(normDigits(String(text === undefined || text === null ? '' : text)).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** the scale of a length / plain-number field (mm model value shown as mm or, in an inch project, as inches) */
export function scaleOf(unit = 'mm', uiUnit = 'mm', step = 1) {
  const inch = uiUnit === 'in' && unit === 'mm';
  const cm = uiUnit === 'cm' && unit === 'mm'; // [NEO-OUTPUT-UX34] centimetres display: 1 cm = 10 mm, the model stays in mm
  return {
    to: (v) => (inch ? r2(v / IN) : cm ? r2(v / 10) : r2(v)),
    from: (n) => (inch ? n * IN : cm ? n * 10 : n),
    label: unit === 'mm' ? (inch ? 'in' : cm ? 'cm' : 'mm') : unit,
    step: inch ? 0.05 : cm ? 0.1 : step,
    id: unit === 'mm' ? (inch ? 'in' : cm ? 'cm' : 'mm') : undefined, // which length unit the typed text is read in (undefined = a plain number: %, degrees ...)
  };
}

/** the scale of a unit-width field: centimetres (1 dp) for an mm project, inches for an inch project (same maths as unitDraft.widthShown) */
export function cmScale(uiUnit) {
  const auto = uiUnit === undefined; // no argument: follow the Output setting (ParameterField re-reads it when it changes)
  const inch = (auto ? getOutput().unit : uiUnit) === 'in';
  return {
    auto, kind: 'width', id: inch ? 'in' : 'cm',
    to: (mm) => (inch ? Math.round((mm / IN) * 10) / 10 : Math.round(mm) / 10),
    from: (n) => (inch ? n * IN : n * 10),
    label: inch ? 'in' : 'cm',
    step: inch ? 0.5 : 1,
  };
}

/** the allowed range as text, e.g. "600–20000 mm" */
export const rangeText = (min, max, scale) => `${scale.to(min)}–${scale.to(max)} ${scale.label}`;

/**
 * Validate what the person typed.
 *   state 'empty'   nothing typed
 *   state 'invalid' not a number            -> never committed, inline error
 *   state 'out'     number outside min..max -> committed only when the entry is finished (blur / Enter), clamped
 *   state 'ok'      number inside the range -> committed live
 * `mm` is the model value (millimetres for a length; the field's own unit otherwise); `clamped` is that value limited to min..max.
 */
export function validateEntry(text, { min, max, scale }) {
  const t = String(text === undefined || text === null ? '' : text).trim();
  if (!t) return { state: 'empty', mm: NaN };
  const n = parseEntry(t, scale.id);
  if (Number.isNaN(n)) return { state: 'invalid', mm: NaN };
  const mm = scale.from(n);
  const inRange = mm >= min - 1e-6 && mm <= max + 1e-6;
  return { state: inRange ? 'ok' : 'out', mm, clamped: Math.min(max, Math.max(min, mm)) };
}

/** the sentence shown after a value was clamped (EN / AR) */
export function clampMessage(lang, modelValue, min, max, scale) {
  const v = scale.to(modelValue); const a = scale.to(min); const b = scale.to(max);
  return lang === 'ar' ? `ضُبطت القيمة على ${v} (المدى ${a}–${b})` : `Clamped to ${v} (range ${a}–${b})`;
}

/** the inline hint while the typed value is wrong and not committed yet (EN / AR) */
export function entryHint(lang, state, min, max, scale) {
  if (state !== 'invalid' && state !== 'out') return '';
  const r = rangeText(min, max, scale);
  if (state === 'invalid') return lang === 'ar' ? `أدخل رقمًا (${r})` : `Enter a number (${r})`;
  return lang === 'ar' ? `خارج المدى ${r} - سيُضبط عند الإدخال` : `Outside ${r} - it will be set to the nearest limit`;
}

/** one arrow-key step from the typed text (falls back to the current shown value); Shift = x10. Returns the new display number. */
export function stepEntry(text, currentShown, dir, step, shift, unitId) {
  const n = parseEntry(text, unitId);
  const base = Number.isFinite(n) ? n : currentShown;
  return r2(base + (dir > 0 ? 1 : -1) * step * (shift ? 10 : 1));
}

/** overall state of a field for styling: 'error' (invalid / external error), 'warn' (out of range or clamped), 'ok' */
export function fieldState({ entry, error, clampedNote }) {
  if (error || (entry && entry.state === 'invalid')) return 'error';
  if ((entry && entry.state === 'out') || clampedNote) return 'warn';
  return 'ok';
}
