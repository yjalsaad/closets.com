/* =============================================================================
 * [NEO-CUTLIST-UX32] Cut list pro: pure data layer shared by the table, the part drawing, the sheet view, the labels and every printed /
 * exported production document. Nothing here changes a quantity or a dimension: it ADDS fields (stable part id, edge notation, machining
 * ops, hardware, room) to the BOM rows that cutlist.buildBOM already produced.
 *
 * PART ID SCHEME  <product>-<cabinet code><slot>-P<nn>[variant]       e.g. K-B01-P03
 *   product  K kitchen, W wardrobe, C custom, BT bathroom, LD laundry, TV, OF office, D doors
 *   cabinet  row letter (B base, U wall, T tall, X top row, CT countertop, PL plinth) with a run letter in front for L / R / run 2 /
 *            peninsula / island (LB = left leg base), then the 2-digit unit slot from the part name ("Base S1 Door" -> 01, none -> 00)
 *   P<nn>    order of the part NAME inside its cabinet code, from the BOM order; two sizes of the same name get a letter (P03a, P03b)
 * The id depends only on the BOM rows of its own cabinet code, so adding a cabinet elsewhere never renumbers it; a copy of a part is
 * "<id>-<n>" (n of qty). Unit ids (random) are never used.
 * ===========================================================================*/
import { panelDrill } from './cutlist';

export const PRODUCT_PREFIX = { wardrobe: 'W', custom: 'C', bathroom: 'BT', laundry: 'LD', tv: 'TV', office: 'OF', doors: 'D' };
export const productPrefix = (p) => PRODUCT_PREFIX[p] || 'K';

const RUN_LETTER = [[/^left\b|^l-left\b/i, 'L'], [/^right\b|^l-right\b/i, 'R'], [/^run 2\b/i, '2'], [/^peninsula\b|^pen\b/i, 'P'], [/^island\b/i, 'I'], [/^return wing\b/i, 'R']];
const ROW_CODE = [[/countertop/i, 'CT'], [/plinth/i, 'PL'], [/\btall\b/i, 'T'], [/\bwall\b/i, 'U'], [/\btop\b/i, 'X'], [/\bbase\b/i, 'B'], [/wardrobe/i, 'WR'], [/column/i, 'CO']];

/** cabinet code of a BOM row: run letter + row code, e.g. "B", "LB", "CT"; unknown groups use their first two letters */
export function cabinetCode(group) {
  const g = String(group || '').trim();
  let run = '';
  for (const [re, l] of RUN_LETTER) if (re.test(g)) { run = l; break; }
  for (const [re, c] of ROW_CODE) if (re.test(g)) return (c === 'CT' || c === 'PL' ? '' : run) + c;
  const letters = g.replace(/[^A-Za-z؀-ۿ]/g, '').slice(0, 2).toUpperCase();
  return run + (letters || 'XX');
}
export const slotOf = (name) => { const m = /\bS(\d+)\b/.exec(String(name || '')); return m ? String(Math.min(99, +m[1])).padStart(2, '0') : '00'; };
const baseName = (name) => String(name || '').replace(/^.*?\bS\d+\s+/, '').replace(/^.*? - /, '').trim().toLowerCase();

/** ids aligned with `rows`. Deterministic and independent of other cabinets. */
export function assignPartIds(rows, product) {
  const pre = productPrefix(product);
  const names = new Map(); // cabinet key -> Map(baseName -> { seq, variants: [] })
  const ids = rows.map((r) => {
    const cab = `${cabinetCode(r.group)}${slotOf(r.name)}`;
    if (!names.has(cab)) names.set(cab, new Map());
    const m = names.get(cab);
    const bn = baseName(r.name);
    if (!m.has(bn)) m.set(bn, { seq: m.size + 1, variants: [] });
    const e = m.get(bn);
    e.variants.push(r);
    return { cab, e, r };
  });
  return ids.map(({ cab, e, r }) => {
    const v = e.variants.indexOf(r);
    const letter = e.variants.length > 1 ? String.fromCharCode(97 + Math.min(v, 25)) : '';
    return `${pre}-${cab}-P${String(e.seq).padStart(2, '0')}${letter}`;
  });
}

/* ---- edge banding notation --------------------------------------------------------------------------------------------------------- */
export const EDGE_CODES = ['L1', 'L2', 'W1', 'W2'];
/** { L1: true, L2: false, W1: true, W2: false } from the BOM edge string ("L1·W1") */
export function edgeFlags(edges) {
  const set = new Set(String(edges || '').split(/[·,\s]+/).filter(Boolean));
  return EDGE_CODES.reduce((o, c) => { o[c] = set.has(c); return o; }, {});
}
/** short material code for the band colour ("Carcass Board" -> "CAR", "White Melamine 18" -> "WHM") */
export const bandColour = (matName) => String(matName || '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map((w) => w.slice(0, 1)).join('').slice(0, 3).toUpperCase() || 'EB';
/** "L1 L2 W1 · 0.8 mm · CB" or "none" */
export function edgeText(row, ebThk, lang = 'en') {
  const f = edgeFlags(row.edges); const on = EDGE_CODES.filter((c) => f[c]);
  if (!on.length) return lang === 'ar' ? 'بدون' : 'none';
  return `${on.join(' ')} · ${ebThk} mm · ${bandColour(row.matName)}`;
}

/* ---- machining ops + hardware per part ----------------------------------------------------------------------------------------------- */
const OPS_EN = { cup: 'Hinge cup', handle: 'Handle hole', pin: 'Shelf-pin hole', plate: 'Plate hole', groove: 'Groove', cutout: 'Cut-out', led: 'LED groove' };
const OPS_AR = { cup: 'كوب مفصلة', handle: 'ثقب مقبض', pin: 'ثقب مسمار رف', plate: 'ثقب قاعدة', groove: 'مجرى', cutout: 'فتحة', led: 'مجرى LED' };
/** [{ k, n, dia?, en, ar }] - from the scene drilling when the scene is known, else from the machining note only */
export function partOps(row, scene) {
  const out = [];
  const tally = {};
  if (scene && row.rep) {
    try {
      const d = panelDrill(scene, row.rep);
      d.circles.forEach((c) => { const k = c.type; const dia = Math.round(c.r * 20) / 10; const key = `${k}|${dia}`; tally[key] = tally[key] || { k, n: 0, dia }; tally[key].n += 1; });
      d.lines.forEach((l) => { const k = l.type; const key = `${k}|`; tally[key] = tally[key] || { k, n: 0 }; tally[key].n += 1; });
    } catch (e) { /* a panel without drilling data */ }
  }
  Object.values(tally).forEach((t) => {
    const n = t.k === 'groove' ? Math.max(1, Math.round(t.n / 2) || 1) : t.k === 'cutout' ? Math.max(1, Math.round(t.n / 4)) : t.n;
    out.push({ k: t.k, n, dia: t.dia, en: `${OPS_EN[t.k] || t.k}${t.dia ? ` Ø${t.dia}` : ''} ×${n}`, ar: `${OPS_AR[t.k] || t.k}${t.dia ? ` Ø${t.dia}` : ''} ×${n}` });
  });
  const note = String(row.note || '');
  if (!tally['groove|'] && /groove/i.test(note) && !/LED groove/i.test(note)) out.push({ k: 'groove', n: 1, en: `${OPS_EN.groove} ×1`, ar: `${OPS_AR.groove} ×1` });
  if (/LED groove/i.test(note)) out.push({ k: 'led', n: 1, en: `${OPS_EN.led} ×1`, ar: `${OPS_AR.led} ×1` });
  if (!tally['cutout|'] && /cut-out/i.test(note)) out.push({ k: 'cutout', n: 1, en: `${OPS_EN.cutout} ×1`, ar: `${OPS_AR.cutout} ×1` });
  return out;
}
/** hardware fitted to this part, from its ops */
export function partHardware(ops) {
  const hw = [];
  const n = (k) => ops.filter((o) => o.k === k).reduce((s, o) => s + o.n, 0);
  if (n('cup')) hw.push({ k: 'hinge', n: n('cup'), en: `Hinge ×${n('cup')}`, ar: `مفصلة ×${n('cup')}` });
  if (n('handle')) hw.push({ k: 'handle', n: Math.ceil(n('handle') / 2), en: `Handle ×${Math.ceil(n('handle') / 2)}`, ar: `مقبض ×${Math.ceil(n('handle') / 2)}` });
  if (n('pin')) hw.push({ k: 'pin', n: n('pin'), en: `Shelf pin ×${n('pin')}`, ar: `مسمار رف ×${n('pin')}` });
  if (n('plate')) hw.push({ k: 'plate', n: n('plate') / 2, en: `Hinge plate ×${n('plate') / 2}`, ar: `قاعدة مفصلة ×${n('plate') / 2}` });
  return hw;
}

/** run key of the part ('main', 'left', ...) and a display label */
export const runKeyOf = (row) => (row.rep && row.rep.runKey) || 'main';

export const fmt = (v) => String(Math.round(v * 10) / 10);

/**
 * Enrich the BOM rows. `opts`: { product, scene, model, tol (mm, default 0.5), runLabel(key)->string }. Adds (never replaces):
 * pid, cab, runKey, room, thk, flags (edge flags), edgeText, ops, hw, rot (rotation allowed), dims "L × W × T", tol.
 */
export function proRows(bom, opts = {}) {
  const { product, scene, model, tol = 0.5 } = opts;
  const ids = assignPartIds(bom.rows, product);
  const eb = (model && model.g && model.g.edgeBand) || 0;
  return bom.rows.map((r, i) => {
    const ops = partOps(r, scene);
    const rk = runKeyOf(r);
    return {
      ...r, pid: ids[i], cab: ids[i].split('-').slice(1, -1).join('-'), runKey: rk, room: opts.runLabel ? opts.runLabel(rk) : rk, thk: r.cut.T, flags: edgeFlags(r.edges), eb,
      edgeText: edgeText(r, eb), ops, hw: partHardware(ops), rot: !r.grain || r.grain === '-', tol, dims: `${fmt(r.cut.L)} × ${fmt(r.cut.W)} × ${fmt(r.cut.T)}`,
    };
  });
}
