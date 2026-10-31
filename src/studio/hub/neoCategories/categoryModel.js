/* =============================================================================
 * Neo category studios [NEO-CATEGORIES-UX26] - the generic, config-driven model (pure: no React, no DOM).
 *
 * ONE design object per studio:
 *   design = { cat, title, units:[{ id, type, w, ...options }], p:{ ...category parameters }, x:{ ...shared cabinet parameters } }
 * `units` is the run of units along the main wall (a vanity, a tall column, a washer niche, a TV tower, a desk ...), `p` holds what the
 * category tab edits (every key is a spec in cfg.params), `x` the boards / doors / drawers / handles / finish / Look paint and the
 * production-material names every cabinet studio shares.
 *
 * A category config (bathroom.js, laundry.js, tv.js, office.js) is DATA plus two functions:
 *   toKitchen(d)  -> { model, placed }   the design as a Neo Kitchen model (units of the base / wall rows)
 *   decorate(scene, built, d) -> { hw }   what the kitchen engine does not know: sink cut-outs, mirrors, appliances, panels, LED ...
 * and this file builds everything else (scene, cut list, hardware, warnings, price) the same way for all four.
 * ===========================================================================*/
import { makeInitial, U, S, clamp, clampSpec } from '../neoKitchen/model';
import { normalizePaint, normalizeMatMap } from '../neoKitchen/materials';
import { MAT_SLOTS, FINISHES, DEFAULT_G, UNIT_W } from '../neoKitchen/constants';
import { buildScene } from '../neoKitchen/geometry';
import { buildBOM, buildHardware, buildWarnings } from '../neoKitchen/cutlist';
import { priceCategory } from './categoryPrice';

export const FORMAT_PREFIX = 'neo-';
export const VERSION = 1;
export const RI = (v) => Math.round(Number(v) || 0);

/* ---- specs: the declarative parameter list every tab is drawn from ---------------------------------------------------------------
 * { k, t:'num'|'step'|'seg'|'tog', en, ar, min, max, step, def, unit, opts:[[value, en, ar]], help:[en, ar], when:(ctx)=>bool, why:[en, ar], tab }
 * `when` receives { p, x, unit?, d } and says whether the control applies; a disabled control shows `why` on screen. */
export function normSpec(sp, v) {
  if (sp.t === 'seg') return sp.opts.some((o) => o[0] === v) ? v : sp.def;
  if (sp.t === 'tog') return typeof v === 'boolean' ? v : !!sp.def;
  let n = Number(v); if (!Number.isFinite(n)) n = sp.def;
  n = clamp(n, sp.min, sp.max);
  const st = sp.step || 1;
  n = Math.round(n / st) * st;
  return Math.round(n * 1000) / 1000;
}
export const defaultsOf = (specs) => Object.fromEntries(specs.map((s) => [s.k, s.def]));
export const normObj = (specs, obj) => { const o = obj || {}; return Object.fromEntries(specs.map((s) => [s.k, normSpec(s, o[s.k])])); };

/* ---- shared cabinet parameters (x) --------------------------------------------------------------------------------------------------- */
export const DEFAULT_X = {
  board: 18, back: 8, doorThk: 18, doorGap: 3, shelfThk: 18, drawerGap: 3, drawerSide: 13, plinthH: 100, plinthSetback: 60,
  handle: { style: 'bar', len: 128, pos: 'auto' }, finishKey: 'oak', paint: {}, mats: {}, matMap: {},
};
const X_FIELDS = ['board', 'back', 'doorThk', 'doorGap', 'shelfThk', 'drawerGap', 'drawerSide', 'plinthH', 'plinthSetback'];
export function normalizeX(raw, def = DEFAULT_X) {
  const x = { ...DEFAULT_X, ...def, ...(raw || {}) };
  X_FIELDS.forEach((k) => { const c = clampSpec(k, x[k]); x[k] = c ? c.value : DEFAULT_X[k]; });
  x.finishKey = FINISHES[x.finishKey] ? x.finishKey : 'oak';
  x.paint = normalizePaint(x.paint); x.matMap = normalizeMatMap(x.matMap);
  const mats = {}; MAT_SLOTS.forEach(({ k }) => { if (x.mats && typeof x.mats[k] === 'string' && x.mats[k].trim()) mats[k] = x.mats[k].trim().slice(0, 60); }); x.mats = mats;
  const h = { ...DEFAULT_X.handle, ...(x.handle || {}) };
  x.handle = { style: ['bar', 'knob', 'profile', 'push', 'none'].includes(h.style) ? h.style : 'bar', len: [96, 128, 160, 192, 256, 320].includes(+h.len) ? +h.len : 128, pos: ['auto', 'top', 'center', 'bottom'].includes(h.pos) ? h.pos : 'auto' };
  return x;
}

/* ---- units ---------------------------------------------------------------------------------------------------------------------------- */
export const typeOf = (cfg, u) => cfg.unitTypes[u.type] || cfg.unitTypes[Object.keys(cfg.unitTypes)[0]];
/** the width range of a unit: static (type.w) unless the type derives it from the category parameters (type.range(p): a washer niche, a TV niche) */
export const urange = (cfg, u, p) => { const t = typeOf(cfg, u); const r = t.range ? t.range(p || {}) : null; return r ? { min: r.min, max: r.max, def: r.def !== undefined ? r.def : clamp(t.w.def, r.min, r.max) } : { min: t.w.min, max: t.w.max, def: t.w.def }; };
export function normalizeUnit(cfg, raw, i = 0, p) {
  const types = Object.keys(cfg.unitTypes);
  const type = types.includes(raw && raw.type) ? raw.type : types[0];
  const t = cfg.unitTypes[type];
  const rg = urange(cfg, { type }, p);
  const w = clamp(RI(raw && raw.w) || rg.def, rg.min, rg.max);
  const o = normObj(t.opts || [], raw);
  return { id: String((raw && raw.id) || `u${i + 1}`).slice(0, 16), type, w, ...o };
}
export function newUnitId(units) { return `u${Math.max(0, ...units.map((u) => parseInt(String(u.id).replace(/\D/g, ''), 10) || 0)) + 1}`; }
export const totalWidth = (units) => units.reduce((s, u) => s + u.w, 0);
export function makeUnit(cfg, type, units, extra, p) { const t = cfg.unitTypes[type]; return normalizeUnit(cfg, { ...defaultsOf(t.opts || []), ...extra, type, w: (extra && extra.w) || urange(cfg, { type }, p).def, id: newUnitId(units) }, 0, p); }

export function normalizeDesign(cfg, raw) {
  const r = raw || {};
  const p = normObj(cfg.params, r.p);
  const units = (Array.isArray(r.units) && r.units.length ? r.units : cfg.presets[0].make().units).slice(0, 24).map((u, i) => normalizeUnit(cfg, u, i, p));
  const seen = new Set(); units.forEach((u, i) => { if (seen.has(u.id)) u.id = `u${i + 1}${i}`; seen.add(u.id); });
  const x = normalizeX(r.x, cfg.x);
  const d = { cat: cfg.id, title: String(r.title || cfg.defaultTitle[0]).slice(0, 80), units, p, x };
  return cfg.normalize ? cfg.normalize(d) : d;
}
/** a preset by id or index, as a complete design */
export function presetDesign(cfg, which = 0) {
  const pr = typeof which === 'number' ? cfg.presets[which] : cfg.presets.find((q) => q.id === which);
  const m = (pr || cfg.presets[0]).make();
  return normalizeDesign(cfg, { title: cfg.defaultTitle[0], ...m });
}
export const defaultDesign = (cfg) => presetDesign(cfg, 0);
/** the blank design (File > New): one unit of the first type with its defaults, category parameters at their defaults */
export function blankDesign(cfg) {
  const t = Object.keys(cfg.unitTypes)[0];
  return normalizeDesign(cfg, { title: cfg.defaultTitle[0], units: [makeUnit(cfg, t, [], null, defaultsOf(cfg.params))], p: defaultsOf(cfg.params) });
}
export const designKey = (cfg, d) => JSON.stringify(normalizeDesign(cfg, d));

/** share `target` mm over the units in proportion, every unit inside its type's range; null when impossible */
export function distributeWidths(cfg, units, target, p) {
  const n = units.length; if (!n) return null;
  const lo = units.map((u) => urange(cfg, u, p).min); const hi = units.map((u) => urange(cfg, u, p).max);
  const sLo = lo.reduce((a, b) => a + b, 0); const sHi = hi.reduce((a, b) => a + b, 0);
  if (target < sLo || target > sHi) return null;
  const cur = totalWidth(units) || 1;
  const w = units.map((u, i) => clamp(Math.round((u.w * target) / cur), lo[i], hi[i]));
  let diff = target - w.reduce((a, b) => a + b, 0);
  for (let pass = 0; diff !== 0 && pass < 40000; pass++) { const i = pass % n; const st = diff > 0 ? 1 : -1; if (w[i] + st >= lo[i] && w[i] + st <= hi[i]) { w[i] += st; diff -= st; } }
  return diff === 0 ? w : null;
}
export const withWidths = (units, widths) => units.map((u, i) => ({ ...u, w: widths[i] }));

/** set one unit's width. keep = the other units share the change (the total stays); else the total follows. Returns { units, clamped } or null */
export function setUnitWidth(cfg, units, idx, raw, keep, p) {
  const t = urange(cfg, units[idx], p);
  const w = clamp(RI(raw), t.min, t.max);
  const next = units.map((u, i) => (i === idx ? { ...u, w } : u));
  if (!keep || units.length === 1) return { units: next, clamped: w !== RI(raw) };
  const total = totalWidth(units);
  const others = units.filter((_, i) => i !== idx);
  const dist = distributeWidths(cfg, others, total - w, p);
  if (!dist) return null;
  let k = 0;
  return { units: units.map((u, i) => (i === idx ? { ...u, w } : { ...u, w: dist[k++] })), clamped: w !== RI(raw) };
}
export function setTotalWidth(cfg, units, target, p) {
  const dist = distributeWidths(cfg, units, RI(target), p); return dist ? withWidths(units, dist) : null;
}
export function widthRange(cfg, units, p) { return [units.reduce((s, u) => s + urange(cfg, u, p).min, 0), units.reduce((s, u) => s + urange(cfg, u, p).max, 0)]; }
export function addUnit(cfg, units, type, keep, p) {
  const u = makeUnit(cfg, type, units, null, p);
  if (!keep) return [...units, u];
  const total = totalWidth(units);
  const all = [...units, u]; const dist = distributeWidths(cfg, all, total, p);
  return dist ? withWidths(all, dist) : [...units, u];
}
export function removeUnit(cfg, units, idx, keep, p) {
  if (units.length <= 1) return null;
  const left = units.filter((_, i) => i !== idx);
  if (!keep) return left;
  const dist = distributeWidths(cfg, left, totalWidth(units), p); return dist ? withWidths(left, dist) : left;
}
export function moveUnit(units, idx, dir) { const j = idx + dir; if (j < 0 || j >= units.length) return units; const a = units.slice(); [a[idx], a[j]] = [a[j], a[idx]]; return a; }
export function duplicateUnit(cfg, units, idx) { const u = { ...units[idx], id: newUnitId(units) }; const a = units.slice(); a.splice(idx + 1, 0, u); return a; }

/* ---- design -> Neo Kitchen model ------------------------------------------------------------------------------------------------------- */
const hiddenUnit = (id, w) => U(w, [S('open', 1, { shelves: 0 })], { id, hidden: true });
export const leafCount = (width, maxLeaf = 600) => clamp(Math.ceil(width / maxLeaf), 1, 4);

/** assemble the main run from the design's units. `g` = the engine's global numbers (already complete). Each unit type's build(u, ctx) returns
 *  { base?: kitchen unit, wall?: kitchen unit } (ids are set here: cb-<id> / cw-<id>); a missing half is a hidden filler of the same width. */
export function assemble(cfg, d, g, { extra, legs, rules } = {}) {
  const x = d.x;
  const base = makeInitial();
  const ctx = { d, p: d.p, x, g, rules: rules || {}, U, S, hinge: (i) => (i % 2 ? 'R' : 'L'), leaf: leafCount };
  const placed = [];
  const baseRow = []; const wallRow = [];
  let lead = 0; let leading = true;
  d.units.forEach((u, i) => {
    const r = typeOf(cfg, u).build(u, { ...ctx, i }) || {};
    const bu = r.base ? { ...r.base, id: `cb-${u.id}` } : hiddenUnit(`cf-${u.id}`, u.w);
    /* the wall half is ONE unit of the column's width, or a list of units (pads + a niche narrower than the column) that adds up to it */
    const wlist = (Array.isArray(r.wall) ? r.wall : r.wall ? [r.wall] : []).map((q, k) => (q.hidden ? { ...q, id: `wp-${u.id}-${k}` } : { ...q, id: `cw-${u.id}` }));
    if (wlist.length === 1 && !wlist[0].hidden) wlist[0].w = u.w;
    const wu = wlist.find((q) => !q.hidden) || null;
    if (r.base) bu.w = u.w;
    baseRow.push(bu);
    if (leading && r.base && r.base.type === 'tall') lead += 1; else leading = false;
    placed.push({ unit: u, idx: i, ids: { base: r.base ? bu.id : null, wall: wu ? wu.id : null }, base: r.base || null, wall: wu });
    if (i >= lead || !leading) wallRow.push({ u, wlist });
  });
  /* the wall row starts after the leading tall units (the engine's rule): everything before that has no wall slot */
  const wall = wallRow.flatMap(({ u, wlist }) => (wlist.length ? wlist : [hiddenUnit(`wf-${u.id}`, u.w)]));
  const wallUsed = wallRow.some((q) => q.wlist.length);
  const wallClean = wallUsed ? wall : [];
  const model = {
    ...base, title: d.title,
    g: { ...DEFAULT_G, ...g },
    runs: { main: { base: baseRow, wall: wallClean, top: [] }, left: { base: [], wall: [], top: [] }, right: { base: [], wall: [], top: [] } },
    legs: legs || base.legs,
    topOn: false, finish: x.finishKey, counter: (extra && extra.counter) || 'marble', handle: x.handle, paint: {}, led: { ...base.led, strip: false }, bottomCover: false,
    mats: {}, matMap: x.matMap,
  };
  void lead;
  return { model, placed };
}

/** the engine's global numbers from the shared cabinet parameters; the category adds its own on top (baseH, counterThk, plinthH, wallD ...) */
export function baseG(d) {
  const x = d.x;
  return { board: x.board, back: x.back, doorThk: x.doorThk, doorGap: x.doorGap, shelfThk: x.shelfThk, drawerGap: x.drawerGap, drawerSide: x.drawerSide, plinthH: x.plinthH, plinthSetback: x.plinthSetback };
}

/* ---- the one build --------------------------------------------------------------------------------------------------------------------- */
const DROP_WARN = /^(param-|flush-|corner-|splash$|legh-|wide-cm-)/; // kitchen-only rules (field ranges, row alignment, corner, backsplash, leg height) and the 'centre divider' hint for a desk module that has no carcass
export function buildCategory(cfg, design, { rules } = {}) {
  const d = normalizeDesign(cfg, design);
  const built = cfg.toKitchen(d, { rules });
  const nm = { ...(cfg.matNames ? cfg.matNames(d) : {}), ...d.x.mats };
  const model = { ...built.model, paint: { ...built.model.paint, ...d.x.paint }, mats: nm, matMap: d.x.matMap };
  const scene = buildScene(model);
  scene.product = cfg.id; scene.props = []; scene.cat = cfg.id;
  /* names, tags and cut-list groups of the placed units */
  const counts = {};
  built.placed.forEach((pl) => {
    const t = typeOf(cfg, pl.unit); counts[pl.unit.type] = (counts[pl.unit.type] || 0) + 1;
    const n = counts[pl.unit.type];
    const lab = `${t.en} ${n}`;
    [['base', pl.ids.base], ['wall', pl.ids.wall]].forEach(([half, id]) => {
      if (!id) return;
      const f = scene.runs.reduce((a, r) => a || r.units.find((q) => q.unit.id === id), null); if (!f) return;
      const above = half === 'wall' && pl.ids.base ? (t.wallEn || `${t.en} (upper)`) : t.en;
      f.label = half === 'wall' && pl.ids.base ? `${above} ${n}` : lab; f.tag = `${t.tag}${n}`; f.group = above;
      f.parts.forEach((p) => { p.group = above; });
    });
  });
  const dec = (cfg.decorate && cfg.decorate(scene, { ...built, model, d }, d)) || {};
  /* the overall height covers every manufactured part and worktop (an LED mirror, a TV wall panel, a desk top) - not display props, so the dimension guides and the camera frame the furniture */
  scene.bounds = { ...scene.bounds, h: Math.max(scene.bounds.h, ...scene.parts.map((q) => q.box.y1), ...scene.runs.flatMap((r) => r.counters.map((c) => c.y1))) };
  const bom = buildBOM(scene);
  const names = cfg.names || {};
  bom.rows.forEach((r) => {
    if (names.counter && /Countertop$/.test(r.group)) { // the worktop of the main run and of a return ('L-Right Countertop') take the category's own name
      r.group = r.group.replace(/Countertop$/, names.counter[0]);
      r.name = r.name.replace(/^(.*?)Countertop - (Countertop|Backsplash) (\d+)$/, (m, pre, kind, n) => `${pre}${kind === 'Backsplash' ? (names.splash || names.counter)[0] : names.counter[0]} ${n}`);
    }
  });
  const units = built.placed;
  bom.nominal = [{ key: 'main', base: totalWidth(d.units), wall: 0, top: 0, units: units.length }];
  const decHw = typeof dec.hw === 'function' ? dec.hw(bom) : (dec.hw || []); // a category may need the cut list for a line (edge band metres)
  const merged = new Map(); /* one row per hardware key: a category adds the same line from several units */
  [...buildHardware(scene), ...decHw].forEach((h) => { const m = merged.get(h.k); if (m) m.qty += h.qty; else merged.set(h.k, { ...h }); });
  const hardware = [...merged.values()].filter((h) => h.qty > 0);
  const warnings = [...(built.notes || []).map((n) => ({ id: n.id, en: n.en, ar: n.ar })), ...(cfg.rules ? cfg.rules(d, { ...built, model, scene, bom, hardware }) : []), ...buildWarnings(scene).filter((w) => !DROP_WARN.test(w.id))];
  const out = { d, x: d.x, p: d.p, model, scene, bom, hardware, warnings, placed: built.placed, cfg, dec };
  out.price = priceCategory(cfg, out);
  return out;
}

/* ---- selection card + Open ---------------------------------------------------------------------------------------------------------------- */
const ANIM_K = new Set(['door', 'flip', 'drawer', 'slide']);
const isAnim = (p) => !!(p.anim && ANIM_K.has(p.anim.k));
const dispName = (p) => (/^S\d/.test(p.name) ? `${p.group} ${p.name}` : `${p.group} - ${p.name}`);
/** the design unit id behind a kitchen/synthetic unit id ('cb-u2' -> 'u2') */
export const designIdOf = (unitId) => String(unitId || '').replace(/^c[a-z]-/, '');
export function selectionInfo(scene, bom, sel) {
  if (!sel) return null;
  let inst = null;
  scene.runs.forEach((r) => r.units.forEach((q) => { if (q.unit.id === sel.unitId) inst = q; }));
  if (!inst) return null;
  const part = sel.partId ? scene.parts.find((p) => p.id === sel.partId) : null;
  let area = null;
  if (part) {
    const r1 = (v) => Math.round(v * 10) / 10;
    const row = bom.rows.find((r) => r.name === dispName(part) && r.w === r1(part.ext.w) && r.d === r1(part.ext.d) && r.h === r1(part.ext.h) && r.mat === part.mat);
    area = row ? row.area / Math.max(1, row.qty) : null;
  } else area = bom.rows.filter((r) => r.unitIds.includes(inst.unit.id)).reduce((s, r) => s + r.area, 0);
  return {
    name: part ? `${inst.label} - ${part.name}` : inst.label, dims: part ? [part.ext.w, part.ext.d, part.ext.h] : [inst.W, inst.D, inst.H], mat: part ? part.mat : null, area, part, inst,
    ptype: part ? part.ptype : (inst.row === 'wall' ? 'wallUnit' : 'baseUnit'), openable: part ? isAnim(part) : scene.parts.some((p) => p.unitId === inst.unit.id && isAnim(p)),
  };
}
export function openIdsFor(scene, info) {
  if (!info) return [];
  if (info.part) return scene.parts.filter((p) => p.anim && p.anim === info.part.anim).map((p) => p.id);
  return scene.parts.filter((p) => p.unitId === info.inst.unit.id && isAnim(p)).map((p) => p.id);
}

/* ---- File menu: save / load --------------------------------------------------------------------------------------------------------------- */
export const formatOf = (cfg) => `${FORMAT_PREFIX}${cfg.id}`;
export function designJSON(cfg, design) {
  return JSON.stringify({ format: formatOf(cfg), v: VERSION, exportedAt: new Date().toISOString(), design: normalizeDesign(cfg, design) }, null, 2);
}
/** parse + validate + clamp a saved file; throws a short message on a bad file */
export function parseDesign(cfg, text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON file'); }
  if (!raw || raw.format !== formatOf(cfg)) throw new Error(raw && raw.format ? `Unknown format "${raw.format}"` : `Not a ${cfg.app[0]} file`);
  const d = raw.design || {};
  if (!Array.isArray(d.units) || !d.units.length) throw new Error('The file has no units');
  return normalizeDesign(cfg, d);
}

export { UNIT_W, S, U };
