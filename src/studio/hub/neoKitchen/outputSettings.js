/* =============================================================================
 * [NEO-OUTPUT-UX34] OUTPUT settings shared by EVERY Neo studio (Kitchen, Closets, Bathroom / Laundry / TV / Office, Custom, Doors).
 * PURE: no React, no DOM except the guarded localStorage in loadOutput / saveOutput. The React control is OutputSettingsControl.jsx.
 *
 *   output = { unit: 'mm' | 'cm' | 'in', precision: 'draft' | 'standard' | 'ultra', fraction: boolean }
 *   DEFAULT_OUTPUT = { unit: 'mm', precision: 'standard', fraction: false }  -> every export is byte-identical to the output before this setting existed.
 *
 * RULE: the model stays in millimetres, always. Nothing in this file changes a stored value or a calculation; conversion happens only at the
 * boundary (exported file, printed table, on-screen field / label). The converters go through millimetres, so mm -> cm -> in -> mm is stable.
 *
 * UNITS    mm (DXF $INSUNITS 4, 3DM unit system 2) | cm (5, 3) | inch (1, 8).
 * PRECISION  draft = 12 points per full curve | standard = 24 | ultra = 60+. Each curved primitive keeps its own standard segment count (a 14-sided
 *            hanging rail, a 24-sided round bar, a 40-sided carousel) and the precision scales it: x0.5 / x1 / x2.5. The 4-segments-per-corner
 *            radius of a custom board is 3 / 6 / 15 per quarter. Precision also sets the decimals written to DXF / CSV (see DXF_DP / DIM_DP).
 * ===========================================================================*/

export const IN_MM = 25.4;
export const UNITS = ['mm', 'cm', 'in'];
export const PRECISIONS = ['draft', 'standard', 'ultra'];
export const DEFAULT_OUTPUT = Object.freeze({ unit: 'mm', precision: 'standard', fraction: false });
export const OUTPUT_KEY = 'neo.output.v1';

/** factor = millimetres per unit; dxf = $INSUNITS code (1 inches, 4 millimetres, 5 centimetres); on3dm = openNURBS ON::LengthUnitSystem */
export const UNIT_INFO = {
  mm: { factor: 1, dxf: 4, on3dm: 2, en: 'mm', ar: 'مم', name: ['millimetres', 'مليمتر'], obj: 'millimetres' },
  cm: { factor: 10, dxf: 5, on3dm: 3, en: 'cm', ar: 'سم', name: ['centimetres', 'سنتيمتر'], obj: 'centimetres' },
  in: { factor: IN_MM, dxf: 1, on3dm: 8, en: 'in', ar: 'بوصة', name: ['inches', 'بوصة'], obj: 'inches' },
};
/** the segmented-control labels (the owner's screenshot shows MM | CM | INCH and DRAFT | STANDARD | ULTRA) */
export const UNIT_LABEL = { mm: ['MM', 'مم'], cm: ['CM', 'سم'], in: ['INCH', 'بوصة'] };
export const PRECISION_LABEL = { draft: ['Draft', 'مسودة'], standard: ['Standard', 'قياسي'], ultra: ['Ultra', 'فائق'] };

/** the table of one precision: nominal points per curve, the factor applied to a primitive's own segment count, the segments per quarter of a corner radius */
export const PRECISION_INFO = {
  draft: { points: 12, plus: false, scale: 0.5, quarter: 3 },
  standard: { points: 24, plus: false, scale: 1, quarter: 6 },
  ultra: { points: 60, plus: true, scale: 2.5, quarter: 15 },
};
/** decimals written for a coordinate in a DXF: the resolution is 0.1 mm (draft), 0.001 mm (standard = what the DXF always used), 0.0001 mm (ultra) */
export const DXF_DP = { draft: { mm: 1, cm: 2, in: 3 }, standard: { mm: 3, cm: 4, in: 5 }, ultra: { mm: 4, cm: 5, in: 6 } };
/** decimals of a DIMENSION column in CSV / Excel (mm standard = null: the value as the model holds it, no rounding at all) and of printed tables */
export const DIM_DP = { draft: { mm: 0, cm: 1, in: 2 }, standard: { mm: null, cm: 1, in: 3 }, ultra: { mm: 2, cm: 2, in: 4 } };
export const TEXT_DP = { draft: { mm: 0, cm: 1, in: 2 }, standard: { mm: 1, cm: 1, in: 3 }, ultra: { mm: 2, cm: 2, in: 4 } };
/** denominator of the inch fraction: 1/8 (draft), 1/16 (standard), 1/32 (ultra) */
export const FRACTION_DEN = { draft: 8, standard: 16, ultra: 32 };

/* ---------------- normalise / compare ---------------- */
const UNIT_ALIAS = { mm: 'mm', millimetre: 'mm', millimetres: 'mm', millimeter: 'mm', millimeters: 'mm', cm: 'cm', centimetre: 'cm', centimeter: 'cm', centimetres: 'cm', centimeters: 'cm', in: 'in', inch: 'in', inches: 'in', '"': 'in' };
export const normUnit = (u) => UNIT_ALIAS[String(u == null ? '' : u).trim().toLowerCase()] || 'mm';
export const normPrecision = (p) => (PRECISIONS.includes(String(p)) ? String(p) : 'standard');
export function normalizeOutput(o) {
  const s = o && typeof o === 'object' ? o : {};
  return { unit: normUnit(s.unit), precision: normPrecision(s.precision), fraction: s.fraction === true };
}
export const isDefaultOutput = (o) => { const n = normalizeOutput(o); return n.unit === 'mm' && n.precision === 'standard' && !n.fraction; };
export const sameOutput = (a, b) => { const x = normalizeOutput(a); const y = normalizeOutput(b); return x.unit === y.unit && x.precision === y.precision && x.fraction === y.fraction; };
/** an export option may be missing: that means the default, and the writer must produce exactly the bytes it always did */
export const outOf = (o) => (o ? normalizeOutput(o) : DEFAULT_OUTPUT);

/* ---------------- converters (always through millimetres) ---------------- */
export const toUnit = (mm, unit) => mm / UNIT_INFO[normUnit(unit)].factor;
export const fromUnit = (v, unit) => v * UNIT_INFO[normUnit(unit)].factor;
export const convert = (v, from, to) => fromUnit(v, from) / UNIT_INFO[normUnit(to)].factor;
/** round half away from zero to `dp` decimals; never returns -0 */
export function roundTo(v, dp) {
  if (!Number.isFinite(v)) return v;
  const k = 10 ** dp; const r = Math.round(Math.abs(v) * k + 1e-9) / k;
  return v < 0 && r !== 0 ? -r : r;
}
export const unitLabel = (unit, lang = 'en') => UNIT_INFO[normUnit(unit)][lang === 'ar' ? 'ar' : 'en'];
/** the unit suffix of a length column in a file / table, e.g. "mm", "cm", "in" (Arabic: مم سم بوصة) */
export const unitWord = unitLabel;

/** a dimension as a NUMBER for a data column (CSV / Excel): standard millimetres = the model value untouched */
export function dimNumber(mm, output) {
  const o = outOf(output); const dp = DIM_DP[o.precision][o.unit];
  const v = toUnit(mm, o.unit);
  return dp == null ? (o.unit === 'mm' ? mm : v) : roundTo(v, dp);
}
/* ---------------- inch fractions ---------------- */
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/** 23.625 -> "23 5/8", 0.5 -> "1/2", 3 -> "3" (rounded to the nearest 1/den, reduced) */
export function formatFraction(inches, den = 16) {
  if (!Number.isFinite(inches)) return String(inches);
  const neg = inches < 0; const a = Math.abs(inches);
  let n = Math.round(a * den); const whole = Math.floor(n / den); n -= whole * den;
  let d = den;
  if (n) { const g = gcd(n, d); n /= g; d /= g; }
  const body = n ? (whole ? `${whole} ${n}/${d}` : `${n}/${d}`) : String(whole);
  return neg && (whole || n) ? `-${body}` : body;
}
/** a dimension as printed text in a table / label: "600", "60", "23.622" or "23 5/8" (no unit suffix; the column header carries the unit) */
export function dimText(mm, output) {
  const o = outOf(output); const dp = TEXT_DP[o.precision][o.unit];
  if (o.unit === 'in' && o.fraction) return formatFraction(mm / IN_MM, FRACTION_DEN[o.precision]);
  if (o.unit === 'mm') return String(roundTo(mm, dp)); // 600, 596.5 - what the screen has always shown at standard
  return toUnit(mm, o.unit).toFixed(dp);
}
/** "600 mm", "60 cm", "23.622 in", "23 5/8 in" */
export const lengthText = (mm, output, lang = 'en') => `${dimText(mm, output)} ${unitLabel(outOf(output).unit, lang)}`;

/* ---------------- parsing (inch input accepts decimals and fractions: 3/4, 1 3/4, 1'-6", 18") ---------------- */
const ARABIC = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
export const normText = (s) => String(s == null ? '' : s).replace(/[٠-٩۰-۹]/g, (c) => ARABIC[c]).replace(/[٫,]/g, '.').replace(/[″”“]/g, '"').replace(/[′’‘]/g, "'").replace(/\s+/g, ' ').trim();

const NUM = '(\\d+(?:\\.\\d+)?|\\.\\d+)';
const FT = new RegExp(`^(-)?\\s*(?:${NUM}\\s*(?:'|ft|feet|foot)\\s*-?\\s*)?(?:${NUM}(?:(?:\\s*-\\s*|\\s+)(\\d+)\\s*/\\s*(\\d+)|\\s*/\\s*(\\d+))?\\s*(?:"|in|inch|inches)?)?$`, 'i');
/** typed inches -> a number of inches (NaN when it is not a length): 3/4, 1 3/4, 1-3/4, 18", 1'-6", 1' 6 1/2", 1.5in, 2ft */
export function parseInches(text) {
  const t = normText(text);
  if (!t) return NaN;
  const m = FT.exec(t);
  if (!m) return NaN;
  const [, neg, feet, a, n2, d2, d1] = m;
  if (feet == null && a == null) return NaN;
  let v = 0;
  if (feet != null) v += parseFloat(feet) * 12;
  if (a != null) {
    if (d1 != null) { if (+d1 === 0) return NaN; v += parseFloat(a) / +d1; } // pure fraction: 3/4
    else if (n2 != null) { if (+d2 === 0) return NaN; v += parseFloat(a) + +n2 / +d2; } // mixed: 1 3/4
    else v += parseFloat(a);
  }
  return neg ? -v : v;
}
const SUFFIX = /^(-?\d+(?:\.\d+)?|-?\.\d+)\s*(mm|cm|m|in|inch|inches|ft|feet|"|')$/i;
const SUF_MM = { mm: 1, cm: 10, m: 1000, in: IN_MM, inch: IN_MM, inches: IN_MM, '"': IN_MM, ft: 12 * IN_MM, feet: 12 * IN_MM, "'": 12 * IN_MM };
/**
 * what the person typed in a field whose DISPLAY unit is `unit` -> a number in that display unit (NaN when it is not one).
 * 'mm' / 'cm' keep the lenient parseFloat the fields always had; a typed suffix converts (60cm into a mm field, 1'-6" anywhere); 'in' also reads fractions.
 * `unit` = anything else ('%', '°', undefined) is a plain number.
 */
export function parseLength(text, unit) {
  const t = normText(text);
  const plain = () => { const n = parseFloat(t); return Number.isFinite(n) ? n : NaN; };
  if (unit !== 'mm' && unit !== 'cm' && unit !== 'in') return plain();
  const sm = SUFFIX.exec(t);
  const into = (v, factor) => (factor === UNIT_INFO[unit].factor ? v : (v * factor) / UNIT_INFO[unit].factor); // same unit: no float round trip
  if (sm) return into(parseFloat(sm[1]), SUF_MM[sm[2].toLowerCase()]);
  if (unit === 'in' || /['"]/.test(t) || /\d\s*\/\s*\d/.test(t)) {
    const i = parseInches(t);
    if (Number.isFinite(i)) return into(i, IN_MM);
  }
  return plain();
}
/** the same, returning millimetres */
export const parseToMm = (text, unit) => { const v = parseLength(text, unit); return Number.isFinite(v) ? fromUnit(v, unit) : NaN; };

/* ---------------- precision ---------------- */
/** segments of a curved primitive whose standard count is `base` (a 24-sided bar keeps 24 at standard, 12 in draft, 60 in ultra); never fewer than 6 */
export function curveSegs(base, output) {
  const o = outOf(output);
  return Math.max(6, Math.round(base * PRECISION_INFO[o.precision].scale));
}
/** segments per quarter of a rounded corner (custom board radius): 3 / 6 / 15 */
export const quarterSegs = (output) => PRECISION_INFO[outOf(output).precision].quarter;
/** the caption under the Precision control: "Draft - 12 points per curve", "Ultra - 60+ points per curve" */
export function precisionCaption(precision, lang = 'en') {
  const p = normPrecision(precision); const i = PRECISION_INFO[p];
  const n = i.plus ? (lang === 'ar' ? `+${i.points}` : `${i.points}+`) : String(i.points);
  const name = PRECISION_LABEL[p][lang === 'ar' ? 1 : 0];
  return lang === 'ar' ? `${name} - ${n} نقطة لكل منحنى` : `${name} - ${n} points per curve`;
}

/* ---------------- what a writer needs ---------------- */
/** the DXF writer's number formatter: coordinates in millimetres in, text out in the chosen unit and decimals. No `output` = the legacy 3 decimals in mm. */
export function dxfKit(output) {
  const present = !!output;
  const o = outOf(output); const k = 1 / UNIT_INFO[o.unit].factor; const dp = present ? DXF_DP[o.precision][o.unit] : 3;
  const legacy = !present || (o.unit === 'mm' && o.precision !== 'ultra'); // millimetres, draft or standard: whole-number labels, as the writers always had
  const f = (n) => { const v = (present ? n * k : n); const r = Math.round(v * 10 ** dp) / 10 ** dp; return (Object.is(r, -0) ? 0 : r).toFixed(dp); };
  return {
    present, output: o, k, dp, f, unit: o.unit, code: UNIT_INFO[o.unit].dxf,
    /** the header pair that declares the unit; empty when the writer was called without options (the old header) */
    header: present ? ['9', '$INSUNITS', '70', String(UNIT_INFO[o.unit].dxf)] : [],
    /** a whole-number label of a length for DXF text (default: Math.round of the millimetres, as before) */
    label: (mm) => (legacy ? String(Math.round(mm)) : dimText(mm, o)),
    /** a length passed through untouched (a number, as before) when the file is the legacy one (no options, or mm at standard), else its text in the unit */
    raw: (mm) => (legacy && o.precision === 'standard' ? mm : dimText(mm, o)),
    /** a length rounded to 0.1 (a number) in a legacy file, else its text in the unit */
    r1: (mm) => (legacy && o.precision === 'standard' ? Math.round(mm * 10) / 10 : dimText(mm, o)),
    suffix: present ? ` ${UNIT_INFO[o.unit].en}` : ' mm',
  };
}

/* ---------------- persistence: remembered per user + a store every component shares ---------------- */
export function loadOutput() {
  try { const t = localStorage.getItem(OUTPUT_KEY); return t ? normalizeOutput(JSON.parse(t)) : { ...DEFAULT_OUTPUT }; } catch (e) { return { ...DEFAULT_OUTPUT }; }
}
export function saveOutput(o) { try { localStorage.setItem(OUTPUT_KEY, JSON.stringify(normalizeOutput(o))); return true; } catch (e) { return false; } }

let current = null;
const subs = new Set();
export function getOutput() { if (!current) current = loadOutput(); return current; }
export function setOutput(patch) {
  const next = normalizeOutput({ ...getOutput(), ...(patch || {}) });
  if (sameOutput(next, getOutput())) return getOutput();
  current = next; saveOutput(next); subs.forEach((f) => f());
  return current;
}
export function subscribeOutput(fn) { subs.add(fn); return () => subs.delete(fn); }
/** tests: forget the cached value and the stored one */
export function resetOutput() { current = { ...DEFAULT_OUTPUT }; try { localStorage.removeItem(OUTPUT_KEY); } catch (e) { /* ignore */ } subs.forEach((f) => f()); }

/** the block every project file carries (`output`), and the way a loaded project hands its settings back */
export const outputForProject = () => ({ ...getOutput() });
/** a project file's JSON text with the current Output setting added as `output` (a project reopens with its units + precision) */
export function attachOutput(text, output) {
  try {
    const o = JSON.parse(text);
    if (o && typeof o === 'object' && !Array.isArray(o)) return JSON.stringify({ ...o, output: normalizeOutput(output || getOutput()) }, null, /^\{\s*\n/.test(text) ? 2 : 0);
  } catch (e) { /* not JSON: leave it */ }
  return text;
}
/** the project text a person opened: when it carries an `output` block, it becomes the current setting; returns whether it did */
export function applyOutputFromText(text) {
  try {
    const o = JSON.parse(text);
    if (o && typeof o === 'object' && o.output && typeof o.output === 'object') { applyProjectOutput(o.output); return true; }
  } catch (e) { /* ignore */ }
  return false;
}
export function applyProjectOutput(raw) {
  if (!raw || typeof raw !== 'object') return getOutput();
  return setOutput(normalizeOutput(raw));
}
