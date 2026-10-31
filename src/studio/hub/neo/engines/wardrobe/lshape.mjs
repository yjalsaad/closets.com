// Standard Wardrobe · L-shape engine [NEO-CLOSETS-UX24] (pure, deterministic).
// An L-shaped wardrobe is a MAIN wardrobe plus a RETURN WING along a side wall. The wing is stored on the one
// WardrobeConfiguration as `config.wing = { side:'right'|'left', corner:'main'|'wing', depth, width, doors, modules[] }`.
// Every engine that reads a configuration works on ONE straight wardrobe, so this file gives them two views of the same L:
//   - partConfigs(config)     main + wing as two standalone configurations (cut list, BOQ, hardware, CNC: exact per part)
//   - developedConfig(config) ONE straight configuration of the developed length (main + wing). Price and the Quote Max hand-off use it, so
//                             the Studio, the engine and the quote always show the same number (the quote code is unchanged).
// A straight wardrobe (wing null / off) passes through every function unchanged.
import { newWardrobeConfig, doorCountFor, validateConfig, normRules } from './config.mjs';

const r = (n) => Math.round(Number(n) || 0);
export const WING_SIDES = ['right', 'left'];
export const CORNERS = ['main', 'wing'];          // who runs through the corner: the main wardrobe (wing starts in front of it) or the wing
export const WING_DEPTH = { min: 400, max: 800, def: 450 };
export const WING_COL_W = { min: 200, max: 1200 };
const HANG = ['none', 'single', 'double', 'long'];

export const sumW = (mods) => (mods || []).reduce((s, m) => s + r(m.width), 0);

/** a clean wing (or null): side / corner / depth clamped, 1-8 modules with ids R01.. and known fields */
export function normWing(w) {
  if (!w || typeof w !== 'object') return null;
  const mods = (Array.isArray(w.modules) ? w.modules : []).slice(0, 8).map((m, i) => ({
    id: 'R' + String(i + 1).padStart(2, '0'),
    width: Math.min(WING_COL_W.max, Math.max(WING_COL_W.min, r(m.width) || 600)),
    hanging: HANG.includes(m.hanging) ? m.hanging : 'none',
    shelves: Math.min(8, Math.max(0, r(m.shelves))), drawers: Math.min(6, Math.max(0, r(m.drawers))),
  }));
  if (!mods.length) return null;
  return {
    side: WING_SIDES.includes(w.side) ? w.side : 'right',
    corner: CORNERS.includes(w.corner) ? w.corner : 'main',
    depth: Math.min(WING_DEPTH.max, Math.max(WING_DEPTH.min, r(w.depth) || WING_DEPTH.def)),
    width: sumW(mods), modules: mods,
  };
}

/** wing door leaves for its own width (same rule as the main wardrobe) */
export const wingDoors = (wing, type, rules) => (type === 'open' ? 0 : doorCountFor(wing.width, type, rules));

/** the wing as its own standalone configuration (null for a straight wardrobe) */
export function wingConfig(config, rules) {
  const w = config && normWing(config.wing); if (!w) return null;
  return newWardrobeConfig({
    width: w.width, height: config.height, depth: w.depth, type: config.type, doors: wingDoors(w, config.type, rules),
    modules: w.modules, doorSystem: config.doorSystem, carcassFinish: config.carcassFinish, doorFinish: config.doorFinish, interiorFinish: config.interiorFinish,
  });
}
const mainOnly = (config) => ({ ...config, wing: null });
export const isL = (config) => !!(config && config.wing && normWing(config.wing));
/** [main, wing?] - each a standalone straight configuration */
export function partConfigs(config, rules) { const w = wingConfig(config, rules); return w ? [mainOnly(config), w] : [config]; }

/** ONE straight configuration of the developed length (main + wing). Width, modules and door leaves add up; `lshape` keeps what it came from. */
export function developedConfig(config, rules) {
  const w = isL(config) ? wingConfig(config, rules) : null;
  if (!w) return config;
  const mods = [...(config.modules || []), ...w.modules.map((m, i) => ({ ...m, id: 'R' + String(i + 1).padStart(2, '0') }))];
  return {
    ...config, width: r(config.width) + w.width, modules: mods, doors: r(config.doors) + w.doors, wing: null,
    lshape: { side: config.wing.side, corner: config.wing.corner, mainWidth: r(config.width), wingWidth: w.width, wingDepth: w.depth, wingDoors: w.doors },
  };
}

/** validateConfig on each part; the wing's messages are prefixed. Returns { ok, errors } like validateConfig. */
export function validateLShape(config, rules) {
  const R = normRules(rules);
  const parts = partConfigs(config, R);
  const out = [];
  parts.forEach((p, i) => validateConfig(p, R).errors.forEach((e) => out.push(i ? { ...e, msg: 'Return wing: ' + e.msg } : e)));
  return { ok: out.length === 0, errors: out };
}

/* ---- merging the per-part engine outputs (cut list, BOQ, estimate, panels, hardware, CNC) ------------------------------------ */
const tag = (s, i) => (i ? `${s} (return wing)` : s);
export function mergeCutting(lists) { return lists.flatMap((l, i) => l.map((p) => (i ? { ...p, part: tag(p.part, i), module: p.module === '—' ? '—' : 'R:' + p.module } : p))); }
export function mergeBoq(lists) {
  const m = new Map();
  lists.forEach((l) => l.forEach((x) => { const k = x.item + '|' + x.unit; if (m.has(k)) m.get(k).qty = Math.round((m.get(k).qty + x.qty) * 100) / 100; else m.set(k, { ...x }); }));
  return [...m.values()];
}
export function mergeEstimate(list) {
  const keys = ['boardM2', 'backM2', 'edgeBandM', 'doors', 'shelves', 'drawers', 'cutParts', 'hardware', 'modules'];
  const o = {}; keys.forEach((k) => { o[k] = Math.round(list.reduce((s, e) => s + (e[k] || 0), 0) * 100) / 100; });
  return o;
}
export function mergePanels(lists) {
  let n = 0;
  return lists.flatMap((l, i) => l.map((p) => { n += 1; return { ...p, partNumber: 'P-' + String(n).padStart(3, '0'), name: tag(p.name, i), module: i ? 'R:' + p.module : p.module }; }));
}
export function mergeHardware(list) {
  const m = new Map();
  list.forEach((h) => h.items.forEach((x) => { const k = x.sku + '|' + x.unit; if (m.has(k)) m.get(k).qty += x.qty; else m.set(k, { ...x }); }));
  const items = [...m.values()];
  const t = (k) => list.reduce((s, h) => s + (h.totals[k] || 0), 0);
  return { items, totals: { drawers: t('drawers'), shelves: t('shelves'), hangingSections: t('hangingSections'), doors: t('doors'), pieces: items.reduce((s, i) => s + (i.qty || 0), 0) } };
}
export function mergeMachining(plans) {
  const panels = plans.flatMap((p, i) => p.panels.map((x) => ({ ...x, part: tag(x.part, i) })));
  const sum = (k) => plans.reduce((s, p) => s + p.totals[k], 0);
  return { panels, totals: { panels: panels.length, ops: sum('ops'), holes: sum('holes') } };
}
export function mergeOps(lists) { let n = 0; return lists.flatMap((l, i) => l.map((o) => { n += 1; return { ...o, id: 'OP-' + String(n).padStart(3, '0'), part: tag(o.part, i), module: i ? 'R:' + o.module : o.module }; })); }
export function mergeReview(list) {
  const items = list.flatMap((rv, i) => rv.items.map((x) => (i ? { ...x, msg: 'Return wing: ' + x.msg } : x)));
  return { ok: !items.some((x) => x.level === 'ERROR'), items };
}
