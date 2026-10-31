/* =============================================================================
 * Neo Wardrobe Studio [NEO-CLOSETS-UX22] - the pure model (no React, no DOM).
 *
 * ONE design object drives everything on screen:
 *   design = { dims:{w,h,d}, type:'sliding'|'hinged'|'open', doorSystem, finishId, optIdx, mods:[{id,width,hanging,shelves,drawers}], x:{...extras} }
 * (the first six are exactly the state NeoWardrobeCAD already owns; `x` holds what only the studio edits: boards, plinth,
 *  door style, handles, clothes).
 *
 * The wardrobe is expressed as a Neo Kitchen model made only of TALL units (one per column), so the proven kitchen engine
 * (buildScene -> elevation, 3D, X-Ray, Explode, Open, cut list, hardware, DXF / OBJ / STL / 3DM / xlsx / PDF) is reused as is.
 * What the kitchen engine does not know (hanging rails, hanging / folded clothes, sliding leaves, "Column" naming, shelves
 * that sit above the hanging zone) is added here by decorateScene(), on the fresh scene object only - never in the kitchen code.
 * ===========================================================================*/
import { makeInitial, U, S, clamp } from '../neoKitchen/model';
import { normalizePaint, normalizeMatMap } from '../neoKitchen/materials';
import { MAT_SLOTS } from '../neoKitchen/constants';
import { buildScene } from '../neoKitchen/geometry';
import { buildBOM, buildHardware, buildWarnings } from '../neoKitchen/cutlist';
import { FINISHES, TALL_H, UNIT_W } from '../neoKitchen/constants';
import { optimizeModules } from '../neo/engines/wardrobe/config.mjs';
import { normWing, WING_SIDES, CORNERS, WING_DEPTH } from '../neo/engines/wardrobe/lshape.mjs';

export const RI = (v) => Math.max(0, Math.round(Number(v) || 0));
export const FORMAT = 'neo-wardrobe';
export const VERSION = 1;

/** drawer front height (mm) and the height of the hanging zone per rail type (mm) */
export const DRAWER_H = 220;
export const HANG_H = { single: 1150, double: 1750, long: 1850 };
export const HANG_KEYS = ['none', 'single', 'double', 'long'];
export const DOOR_STYLES = ['solid', 'glass', 'smoked']; // [NEO-CLOSETS-UX24] Wood | Glass | Smoked
export const DENSITIES = ['light', 'medium', 'full'];
/** [NEO-CLOSETS-UX30] where a drawer zone's boxes sit: 'front' = exposed fronts, the door stops above them (today's wardrobe) | 'inside' = drawer boxes inside the carcass behind the column's door */
export const DRAWER_MODES = ['front', 'inside'];
export const INNER_FRONTS = ['inner', 'box'];  // inside drawers: a thin inset front board on the box | the box front is the front
export const DOOR_COVERS = ['full', 'above'];  // inside drawers: the door spans the drawer zone | stops above it (the drawers then show an inset front)
export const DRAWER_H_RANGE = { min: 120, max: 400 };
const PITCH = { light: 120, medium: 70, full: 45 };

/** [NEO-CLOSETS-UX25] every numeric field of the Global tab cards: range (mm), step and default. ONE table: normalizeX clamps with it and the cards show it.
 *  Owner defaults from the reference: back inset 0 (flush, no groove), plinth setback 0, drawer vertical gap 2, front side gap 2, cup edge 5, rail drop 50. */
export const WFIELD = {
  board: { min: 10, max: 30, step: 0.5, def: 18 }, back: { min: 3, max: 20, step: 0.5, def: 8 }, inset: { min: 0, max: 50, step: 0.5, def: 0 },
  doorThk: { min: 12, max: 40, step: 0.5, def: 18 }, doorGap: { min: 0, max: 10, step: 0.5, def: 3 },
  hingeCup: { min: 15, max: 60, step: 0.5, def: 35 }, cupEdge: { min: 0, max: 15, step: 0.5, def: 5 },
  drawerGap: { min: 0, max: 10, step: 0.5, def: 2 }, drawerSide: { min: 0, max: 30, step: 0.5, def: 13 }, drawerBottom: { min: 0, max: 40, step: 0.5, def: 12 }, drawerFrontSide: { min: 0, max: 10, step: 0.5, def: 2 },
  shelfThk: { min: 6, max: 50, step: 0.5, def: 18 }, shelfPlay: { min: 0, max: 20, step: 0.5, def: 1 },
  railDia: { min: 16, max: 40, step: 1, def: 25 }, railDrop: { min: 20, max: 200, step: 1, def: 50 }, railH: { min: 0, max: 2200, step: 10, def: 0 },
  innerThk: { min: 8, max: 25, step: 0.5, def: 16 }, innerClear: { min: 0, max: 40, step: 0.5, def: 10 },
  plinthH: { min: 50, max: 180, step: 1, def: 100 }, plinthSetback: { min: 0, max: 120, step: 1, def: 0 }, topBoxH: { min: 0, max: 900, step: 10, def: 0 },
};
const rnd1 = (v) => Math.round(v * 10) / 10;
/** clamp one field to its WFIELD range. Returns { value, clamped, min, max }. topBoxH: 0 = no top box, otherwise at least 100 mm. */
export function clampField(k, raw) {
  const f = WFIELD[k]; if (!f) return null;
  let v = Number(raw); if (!Number.isFinite(v)) v = f.def;
  let c = clamp(v, f.min, f.max);
  if (k === 'topBoxH' && c > 0 && c < 100) c = 100;
  const val = f.step < 1 ? Math.round(c / f.step) * f.step : Math.round(c);
  return { value: f.step < 1 ? rnd1(val) : val, clamped: c !== v, min: f.min, max: f.max };
}

export const DEFAULT_X = {
  title: 'My Wardrobe',
  doorStyle: 'solid',
  finishKey: 'oak',
  board: 18, back: 8, inset: 0, plinthH: 100, plinthSetback: 0, topBoxH: 0,
  doorThk: 18, doorGap: 3, hingeCup: 35, cupEdge: 5,
  shelfThk: 18, shelfPlay: 1, drawerGap: 2, drawerSide: 13, drawerBottom: 12, drawerFrontSide: 2,
  railDrop: 50, railH: 0,
  drawerMode: 'front', innerFront: 'inner', innerThk: 16, innerClear: 10, doorCover: 'full', // [NEO-CLOSETS-UX30] default drawer mode of every column + the inside-drawer settings
  keepW: true, keepH: true,   // [NEO-CLOSETS-UX25] "Keep the closet's total width" / "Keep the closet's overall height" (the Global + Main cards share them)
  handle: { style: 'bar', len: 128, pos: 'auto' },
  railDia: 25,
  clothes: { on: true, density: 'medium' },
  divisions: 0,             // [NEO-CLOSETS-UX24] glazing bars along the height of every glass / smoked leaf (0-6): divisions + 1 panes
  paint: {}, mats: {}, matMap: {}, // [NEO-CLOSETS-UX24] M&S tab: Look colours / textures, production-material names, name -> inventory link (the kitchen's own shapes)
  wing: null,               // [NEO-CLOSETS-UX24] L-shape return wing, see normalizeWingX
};

/** the L-Shape tab's state: { on, side, corner, depth, mods[] } (always complete; `on` false = a straight wardrobe) */
export const DEFAULT_WING_MODS = [
  { id: 'R01', width: 600, hanging: 'single', shelves: 3, drawers: 0 },
  { id: 'R02', width: 600, hanging: 'none', shelves: 4, drawers: 2 },
];
/** [NEO-CLOSETS-UX25] the per-column extras (door leaves, hinge side, hidden, pinned, own rail height); only the set ones are present, so an untouched column is unchanged */
export function modExtras(m) {
  const o = {}; if (!m) return o;
  if (m.leaves) o.leaves = clamp(RI(m.leaves), 1, 4);
  if (m.hinge === 'L' || m.hinge === 'R') o.hinge = m.hinge;
  if (m.hidden) o.hidden = true;
  if (m.pin) o.pin = true;
  if (m.noDoor) o.noDoor = true;                                   // this column has no door (an open column in a closet with doors)
  if (DOOR_STYLES.includes(m.style)) o.style = m.style;            // this column's own door material (else the closet-wide one)
  if (m.railH > 0) o.railH = clamp(RI(m.railH), 0, WFIELD.railH.max);
  if (DRAWER_MODES.includes(m.dMode)) o.dMode = m.dMode;                                 // [NEO-CLOSETS-UX30] this column's own drawer mode (else the closet-wide default)
  if (m.drawerH > 0) o.drawerH = clamp(RI(m.drawerH), DRAWER_H_RANGE.min, DRAWER_H_RANGE.max); // this column's drawer height (front / slot, mm; else DRAWER_H)
  if (DOOR_COVERS.includes(m.cover)) o.cover = m.cover;                                  // inside drawers: door full height | above the drawers only
  return o;
}
export function normalizeWingX(raw) {
  const w = raw && typeof raw === 'object' ? raw : {};
  const rawMods = Array.isArray(w.mods) && w.mods.length ? w.mods : DEFAULT_WING_MODS;
  const n = normWing({ side: w.side, corner: w.corner, depth: w.depth, modules: rawMods });
  return { on: !!w.on, keep: w.keep !== false, side: n.side, corner: n.corner, depth: n.depth, mods: n.modules.map((m, i) => ({ ...m, ...modExtras(rawMods[i]) })) }; // the engine view keeps only the five engine fields: the studio's per-column extras ride along by index
}

/* ---- normalising ------------------------------------------------------------ */
export function normalizeX(raw) {
  const x = { ...DEFAULT_X, ...(raw || {}) };
  Object.keys(WFIELD).forEach((k) => { x[k] = clampField(k, x[k]).value; });
  x.keepW = x.keepW !== false; x.keepH = x.keepH !== false;
  x.title = String(x.title || DEFAULT_X.title).slice(0, 80);
  x.doorStyle = DOOR_STYLES.includes(x.doorStyle) ? x.doorStyle : 'solid';
  x.divisions = clamp(Math.round(Number(x.divisions) || 0), 0, 6);
  x.drawerMode = DRAWER_MODES.includes(x.drawerMode) ? x.drawerMode : 'front'; x.innerFront = INNER_FRONTS.includes(x.innerFront) ? x.innerFront : 'inner'; x.doorCover = DOOR_COVERS.includes(x.doorCover) ? x.doorCover : 'full';
  x.paint = normalizePaint(x.paint); x.matMap = normalizeMatMap(x.matMap);
  const mats = {}; MAT_SLOTS.forEach(({ k }) => { if (x.mats && typeof x.mats[k] === 'string' && x.mats[k].trim()) mats[k] = x.mats[k].trim().slice(0, 60); }); x.mats = mats;
  x.wing = normalizeWingX(x.wing);
  x.finishKey = FINISHES[x.finishKey] ? x.finishKey : 'oak';
  const h = { ...DEFAULT_X.handle, ...(x.handle || {}) };
  x.handle = { style: ['bar', 'knob', 'profile', 'push', 'none'].includes(h.style) ? h.style : 'bar', len: [96, 128, 160, 192, 256, 320].includes(+h.len) ? +h.len : 128, pos: ['auto', 'top', 'center', 'bottom'].includes(h.pos) ? h.pos : 'auto' };
  const c = { ...DEFAULT_X.clothes, ...(x.clothes || {}) };
  x.clothes = { on: c.on !== false, density: DENSITIES.includes(c.density) ? c.density : 'medium' };
  return x;
}

/** keep each column's interior when the column count / widths change (same rule NeoWardrobeCAD uses) */
export function remapModules(prev, widths) {
  return widths.map((w, i) => {
    const p = prev && prev[i];
    return { id: 'M' + String(i + 1).padStart(2, '0'), width: w, hanging: p ? p.hanging : (i % 2 === 0 ? 'double' : 'none'), shelves: p ? p.shelves : 2, drawers: p ? p.drawers : (i === 1 ? 3 : 0), ...modExtras(p) };
  });
}

/** [NEO-CLOSETS-UX30] a column's drawer mode: its own, else the closet-wide default */
export const drawerModeOf = (m, x) => (DRAWER_MODES.includes(m.dMode) ? m.dMode : (x && x.drawerMode) || 'front');

export const normalizeMod = (m) => ({
  id: m.id, width: RI(m.width),
  hanging: HANG_KEYS.includes(m.hanging) ? m.hanging : 'none',
  shelves: clamp(RI(m.shelves), 0, 8), drawers: clamp(RI(m.drawers), 0, 6),
  ...modExtras(m),
});

/** the one default wardrobe (also File > Default wardrobe) and the blank one (File > New) */
export function defaultDesign(rules) {
  const opts = optimizeModules(2400, rules || {}, 3);
  const i = Math.max(0, opts.findIndex((o) => o.count === 3)); // 3 x 800: the option list then agrees with the columns
  const mods = remapModules(null, opts[i] ? opts[i].modules : [800, 800, 800]);
  return { dims: { w: 2400, h: 2400, d: 600 }, type: 'hinged', doorSystem: 'hinged_lam', finishId: '', optIdx: i, mods, x: normalizeX({}) };
}
export function blankDesign() {
  return { dims: { w: 600, h: 2400, d: 600 }, type: 'open', doorSystem: 'hinged_lam', finishId: '', optIdx: 0, mods: [{ id: 'M01', width: 600, hanging: 'none', shelves: 0, drawers: 0 }], x: normalizeX({}) };
}

/** the door-system code that goes with a door type (keeps the current one when it already fits) */
export const doorSystemFor = (type, cur) => (type === 'open' ? cur : type === 'sliding' ? (/slid/.test(cur || '') ? cur : 'sliding_alu') : (!cur || /slid/.test(cur) ? 'hinged_lam' : cur));

/* ---- columns: free widths, "keep the closet's total width", add / remove ---------------- */
export const COL_W = { min: 200, max: 1200 };
export const TOTAL_W = { min: 600, max: 6000 };
export const WING_TOTAL_W = { min: 200, max: 6000 };   // the L-Shape tab's return wing: from one narrow column
const sumW = (a) => a.reduce((t, x) => t + x, 0);

/** share `target` mm over `widths` in proportion, whole mm, every one inside COL_W; null when it cannot be done */
export function distribute(widths, target) {
  const n = widths.length; if (!n) return null;
  if (target < n * COL_W.min || target > n * COL_W.max) return null;
  const cur = sumW(widths) || 1;
  const w = widths.map((x) => clamp(Math.round((x * target) / cur), COL_W.min, COL_W.max));
  let diff = target - sumW(w);
  for (let pass = 0; diff !== 0 && pass < 20000; pass++) { const i = pass % n; const st = diff > 0 ? 1 : -1; if (w[i] + st >= COL_W.min && w[i] + st <= COL_W.max) { w[i] += st; diff -= st; } }
  return diff === 0 ? w : null;
}
const withWidths = (mods, widths) => mods.map((m, i) => ({ ...m, width: widths[i] }));

/** [NEO-CLOSETS-UX25] a column that is "pinned" never moves when the closet's width changes: growth goes to the LAST FREE column first, then the free ones before it */
export const isFree = (m) => !m.pin;
const freeIdxs = (mods) => mods.map((m, i) => (isFree(m) ? i : -1)).filter((i) => i >= 0);

/** change the total to `target`: the delta goes to the last free column (up to COL_W.max / down to COL_W.min), then the free column before it ... Returns { mods } or null (no free column / not enough room) */
export function resizeTotal(mods, target, lim = TOTAL_W) {
  const t = Math.round(Number(target) || 0);
  if (t < lim.min || t > lim.max) return null;
  let delta = t - sumW(mods.map((m) => m.width)); const w = mods.map((m) => m.width);
  freeIdxs(mods).reverse().forEach((i) => {
    if (!delta) return;
    const step = delta > 0 ? Math.min(COL_W.max - w[i], delta) : -Math.min(w[i] - COL_W.min, -delta);
    w[i] += step; delta -= step;
  });
  return delta === 0 ? { mods: withWidths(mods, w) } : null;
}

/** set one column's width. keep = the other FREE columns share the change (total stays; pinned ones never move); otherwise the total follows. Returns { mods, clamped } */
export function setColumnWidth(mods, idx, raw, keep, lim = TOTAL_W) {
  const total = sumW(mods.map((m) => m.width));
  let w = clamp(Math.round(Number(raw) || 0), COL_W.min, COL_W.max);
  if (!keep || mods.length === 1) {
    const next = withWidths(mods, mods.map((m, i) => (i === idx ? w : m.width)));
    return sumW(next.map((m) => m.width)) > lim.max ? { mods, clamped: true } : { mods: next, clamped: w !== Math.round(Number(raw)) };
  }
  const others = mods.map((m, i) => i).filter((i) => i !== idx);
  const free = others.filter((i) => isFree(mods[i]));
  const pinnedSum = sumW(others.filter((i) => !isFree(mods[i])).map((i) => mods[i].width));
  if (!free.length) return { mods, clamped: true };
  const n = free.length; const pool = total - pinnedSum;
  w = clamp(w, pool - n * COL_W.max, pool - n * COL_W.min);
  w = clamp(w, COL_W.min, COL_W.max);
  const shared = distribute(free.map((i) => mods[i].width), pool - w);
  if (!shared) return { mods, clamped: true };
  const out = mods.map((m, i) => (i === idx ? w : m.width));
  free.forEach((i, k) => { out[i] = shared[k]; });
  return { mods: withWidths(mods, out), clamped: w !== Math.round(Number(raw)) };
}

/** add a column at the end (an empty hinged-style column). keep = the new column takes its width from the free column(s) (the last one first), the total stays. Returns { mods } or null */
export function addColumn(mods, keep, width = 600, lim = TOTAL_W, prefix = 'M') {
  const id = prefix + String(Math.max(0, ...mods.map((m) => parseInt(String(m.id).slice(1), 10) || 0)) + 1).padStart(2, '0');
  const col = { id, width, hanging: 'none', shelves: 2, drawers: 0 };
  if (!keep) { const next = [...mods, col]; return sumW(next.map((m) => m.width)) > lim.max ? null : { mods: next }; }
  const w = mods.map((m) => m.width); let need = width;
  freeIdxs(mods).reverse().forEach((i) => { if (!need) return; const take = Math.min(w[i] - COL_W.min, need); if (take > 0) { w[i] -= take; need -= take; } });
  const got = width - need;
  if (got >= COL_W.min) return { mods: withWidths([...mods, { ...col, width: got }], [...w, got]) };
  const free = freeIdxs(mods); if (!free.length) return null;
  const total = sumW(mods.map((m) => m.width)); const pinned = sumW(mods.filter((m) => !isFree(m)).map((m) => m.width));
  const sh = distribute([...free.map((i) => mods[i].width), width], total - pinned);
  if (!sh) return null;
  const out = mods.map((m) => m.width); free.forEach((i, k) => { out[i] = sh[k]; });
  return { mods: withWidths([...mods, col], [...out, sh[sh.length - 1]]) };
}

/** remove a column. keep = its width goes to the last free column (then the ones before it) so the total stays. Returns { mods } or null (last column / cannot fit) */
export function removeColumn(mods, idx, keep, lim = TOTAL_W) {
  if (mods.length <= 1) return null;
  const left = mods.filter((_, i) => i !== idx);
  if (!keep) return sumW(left.map((m) => m.width)) < lim.min ? null : { mods: left };
  const w = left.map((m) => m.width); let give = mods[idx].width;
  freeIdxs(left).reverse().forEach((i) => { if (!give) return; const put = Math.min(COL_W.max - w[i], give); if (put > 0) { w[i] += put; give -= put; } });
  if (!give) return { mods: withWidths(left, w) };
  const free = freeIdxs(left); if (!free.length) return null;
  const pinned = sumW(left.filter((m) => !isFree(m)).map((m) => m.width));
  const sh = distribute(free.map((i) => left[i].width), sumW(mods.map((m) => m.width)) - pinned);
  if (!sh) return null;
  const out = left.map((m) => m.width); free.forEach((i, k) => { out[i] = sh[k]; });
  return { mods: withWidths(left, out) };
}

/** the divider handle of the return wing: move the boundary between column i and i+1 to `newW` (column i's new width); the pair keeps its sum. Returns { mods, clamped } */
export function moveBoundary(mods, i, newW) {
  if (i < 0 || i >= mods.length - 1) return { mods, clamped: true };
  const pair = mods[i].width + mods[i + 1].width;
  const w = clamp(Math.round(Number(newW) || 0), Math.max(COL_W.min, pair - COL_W.max), Math.min(COL_W.max, pair - COL_W.min));
  const out = mods.map((m, k) => (k === i ? { ...m, width: w } : k === i + 1 ? { ...m, width: pair - w } : m));
  return { mods: out, clamped: w !== Math.round(Number(newW)) };
}

/** [NEO-CLOSETS-UX25] inner size read-outs under Width / Height: outer minus two carcass boards (the height also loses the plinth) */
export function innerSize(design) {
  const x = normalizeX(design.x);
  return { w: Math.round(design.dims.w - 2 * x.board), h: Math.round(design.dims.h - x.plinthH - 2 * x.board) };
}
/** the body: the carcass between the plinth and the top box (read-only on the Heights card; it follows the overall height) */
export const bodyHeight = (design) => { const x = normalizeX(design.x); return Math.round(design.dims.h - x.plinthH - x.topBoxH); };

/** [NEO-CLOSETS-UX25] plinth height / top box height with "Keep the closet's overall height": ON = the overall stays and the body absorbs the change, OFF = the body stays and the overall follows.
 *  Returns { design, clamped, value } so the field can say what was done. */
export function setHeightPart(design, key, raw) {
  const x = normalizeX(design.x); const d = design;
  const c = clampField(key, raw); let v = c.value; let clamped = c.clamped;
  if (x.keepH) {
    /* the body must stay usable: at least 1000 mm of body */
    const other = key === 'plinthH' ? x.topBoxH : x.plinthH;
    const maxV = d.dims.h - other - 1000;
    if (v > maxV) { v = key === 'topBoxH' ? Math.max(0, Math.floor(maxV / 10) * 10) : Math.max(WFIELD.plinthH.min, maxV); clamped = true; }
    if (key === 'topBoxH' && v > 0 && v < 100) v = 0;
    return { design: { ...d, x: { ...x, [key]: v } }, clamped, value: v };
  }
  const delta = v - x[key]; const h = d.dims.h + delta;
  if (h < 1000 || h > 4000) return { design: d, clamped: true, value: x[key] };
  return { design: { ...d, dims: { ...d.dims, h }, x: { ...x, [key]: v } }, clamped, value: v };
}

/* ---- columns: zones (shelves / rail / drawers), usual-range warnings ------------------------- */
export const ZONE_KEYS = ['shelves', 'rail', 'drawers'];
export const ZONE_DEFAULT = { shelves: { shelves: 2 }, rail: { hanging: 'single' }, drawers: { drawers: 2 } };
const ZONE_CLEAR = { shelves: { shelves: 0 }, rail: { hanging: 'none' }, drawers: { drawers: 0 } };
/** the zones a column has, top to bottom: shelves (above the rail), the rail zone, drawers (at the bottom) */
export const zonesOf = (m) => ZONE_KEYS.filter((k) => (k === 'shelves' ? m.shelves > 0 : k === 'rail' ? !!m.hanging && m.hanging !== 'none' : m.drawers > 0));
/** a column with `n` zones (0-3): zones are kept in order, new ones are added in the order shelves, rail, drawers */
export function setZoneCount(m, n) {
  const have = zonesOf(m); let out = { ...m };
  const want = clamp(RI(n), 0, 3);
  if (want < have.length) have.slice(want).forEach((k) => { out = { ...out, ...ZONE_CLEAR[k] }; });
  else ZONE_KEYS.filter((k) => !have.includes(k)).slice(0, want - have.length).forEach((k) => { out = { ...out, ...ZONE_DEFAULT[k] }; });
  return out;
}
/** change the type of zone `from` into `to` (a type the column does not already have): the values move across */
export function setZoneType(m, from, to) {
  if (from === to || zonesOf(m).includes(to)) return m;
  const mv = from === 'shelves' ? m.shelves : from === 'drawers' ? m.drawers : null;
  const keep = from === 'rail' ? m.hanging : null;
  const out = { ...m, ...ZONE_CLEAR[from], ...ZONE_DEFAULT[to] };
  if (to === 'shelves' && mv) out.shelves = clamp(mv, 1, 8);
  if (to === 'drawers' && mv) out.drawers = clamp(mv, 1, 6);
  if (to === 'rail' && keep && keep !== 'none') out.hanging = keep;
  return out;
}
/** [NEO-CLOSETS-UX25] the usual ranges (rules engine): a column 400-1000 mm (PAX-style 50 / 75 / 100 cm) and a hinged leaf 300-600 mm. Each warning carries the fix the "Use X" button applies. */
export const USUAL = { col: { min: 400, max: 1000 }, leaf: { min: 300, max: 600 } };
export const leafWidth = (width, leaves, gap) => Math.round(((width - gap * (leaves + 1)) / Math.max(1, leaves)) * 10) / 10;
export function columnWarnings(design, rules) {
  const x = normalizeX(design.x); const out = [];
  const ranges = { min: Math.max(USUAL.col.min, (rules && rules.min_module_width) || 0), max: Math.min(USUAL.col.max, (rules && rules.max_module_width) || USUAL.col.max) };
  const maxLeaf = Math.min(USUAL.leaf.max, (rules && rules.max_hinged_door_width) || USUAL.leaf.max);
  const scan = (mods, part, label) => (mods || []).forEach((m, i) => {
    if (m.hidden) return;
    const key = `${part}${i}`;
    if (m.width < ranges.min || m.width > ranges.max) {
      const to = m.width > ranges.max ? ranges.max : ranges.min;
      out.push({ id: `${key}-w`, col: key, kind: 'width', to, title: { en: `${label} ${i + 1}: ${m.width} mm`, ar: `${label} ${i + 1}: ${m.width} مم` },
        why: { en: `Outside the usual range ${ranges.min}-${ranges.max} mm - PAX-style section 50/75/100 cm`, ar: `خارج المدى المعتاد ${ranges.min}-${ranges.max} مم - قسم بنمط PAX بعرض 50/75/100 سم` } });
    }
    if (design.type === 'hinged') {
      const lv = m.leaves || leafCount(m.width, 'hinged', rules);
      const lw = leafWidth(m.width, lv, x.doorGap);
      if (lw > maxLeaf || lw < USUAL.leaf.min) {
        const to = lw > maxLeaf ? clamp(Math.ceil((m.width - x.doorGap) / (maxLeaf + x.doorGap)), 1, 4) : clamp(lv - 1, 1, 4);
        out.push({ id: `${key}-d`, col: key, kind: 'leaf', to, title: { en: `${label} ${i + 1} - door: ${Math.round(lw)} mm`, ar: `${label} ${i + 1} - الباب: ${Math.round(lw)} مم` },
          why: { en: `Outside the usual range ${USUAL.leaf.min}-${maxLeaf} mm - hinged leaf, wider leaves sag on the hinges`, ar: `خارج المدى المعتاد ${USUAL.leaf.min}-${maxLeaf} مم - ضلفة مفصلية، الضلف الأعرض تتدلّى على المفصلات` } });
      }
    }
  });
  scan(design.mods, 'm', 'Column'); if (x.wing && x.wing.on) scan(x.wing.mods, 'w', 'Return column');
  return out;
}

/* ---- door leaves ------------------------------------------------------------ */
export function leafCount(width, type, rules) {
  if (type === 'open') return 0;
  if (type === 'sliding') return width >= 400 ? 2 : 1;
  const maxLeaf = (rules && rules.max_hinged_door_width) || 600;
  return clamp(Math.ceil(width / maxLeaf), 1, 4);
}

/** the hanging zone height (mm) actually used in a column of interior height `inner` that also holds `shelves` shelves above it */
export function hangZone(hanging, inner, shelves) {
  if (!hanging || hanging === 'none') return 0;
  const want = HANG_H[hanging] || HANG_H.single;
  return Math.max(500, Math.min(want, inner - (shelves > 0 ? 380 : 0)));
}

/* ---- design -> Neo Kitchen model --------------------------------------------- */
/** the corner board: the part of the return-wing's side that the main wardrobe's front (door board) covers. The wing's first visible column starts after it. */
export const cornerGap = (depth, doorThk) => Math.round(depth + doorThk);

export function designToKitchen(design, rules) {
  const x = normalizeX(design.x);
  const notes = [];
  const note = (id, en, ar) => notes.push({ id, en, ar });
  const g0 = makeInitial().g;
  const depth = clamp(RI(design.dims.d), 500, 700);
  if (depth !== RI(design.dims.d)) note(`depth-${depth}`, `Depth ${RI(design.dims.d)} mm is outside the studio range 500-700 mm - drawn at ${depth} mm.`, `العمق ${RI(design.dims.d)} مم خارج مدى الاستوديو 500-700 مم - رُسم بعمق ${depth} مم.`);
  const wantUnitH = RI(design.dims.h) - x.plinthH;
  const unitH = clamp(wantUnitH, TALL_H.min, TALL_H.max);
  const topBoxH = Math.min(x.topBoxH, Math.max(0, unitH - 900)); // the top box needs a body of at least 900 mm under it
  if (unitH !== wantUnitH) note(`height-${unitH}`, `Height ${RI(design.dims.h)} mm is outside the studio range ${TALL_H.min + x.plinthH}-${TALL_H.max + x.plinthH} mm - drawn at ${unitH + x.plinthH} mm.`, `الارتفاع ${RI(design.dims.h)} مم خارج المدى - رُسم بارتفاع ${unitH + x.plinthH} مم.`);
  const wing = x.wing && x.wing.on ? x.wing : null;
  const cols = [];
  /* one tall unit per column; `part` = 'main' | 'wing' (the return wing's columns are Neo Kitchen tall units of the left / right leg) */
  const mkUnits = (mods, part, label) => (mods || []).map(normalizeMod).map((m, i) => {
    const width = clamp(m.width, UNIT_W.min, UNIT_W.max);
    if (width !== m.width) note(`colw-${m.id}`, `${label} ${i + 1} is ${m.width} mm wide - drawn at ${width} mm (range ${UNIT_W.min}-${UNIT_W.max}).`, `${label} ${i + 1} بعرض ${m.width} مم - رُسم بعرض ${width} مم.`);
    const leaves = design.type === 'hinged' && m.leaves ? m.leaves : leafCount(width, design.type, rules); // [NEO-CLOSETS-UX25] a column's own leaf count wins for hinged doors
    const dH = m.drawerH || DRAWER_H;                    // [NEO-CLOSETS-UX30] this column's drawer height (front / slot); DRAWER_H unless set
    const dh = m.drawers * dH;
    const tb = topBoxH;                                  // the top box (loft) is the top section of every column, above a fixed board
    const inner = unitH - tb - dh - 2 * x.board;
    const hz = hangZone(m.hanging, inner, m.shelves);
    const style = m.style || x.doorStyle;
    const glassy = style === 'glass' || style === 'smoked';
    const frontT = design.type === 'open' || m.noDoor ? 'open' : glassy ? 'glass' : 'door';
    const hinge = m.hinge || (i % 2 ? 'R' : 'L');
    /* [NEO-CLOSETS-UX30] drawers INSIDE: the column's door spans the drawer zone (no drawer section of its own, no front board per drawer). A column without a door has nothing to hide them behind, so it keeps exposed fronts. */
    const wantInside = m.drawers > 0 && drawerModeOf(m, x) === 'inside';
    const inside = wantInside && frontT !== 'open';
    const cover = m.cover || x.doorCover;
    const innerSpec = inside ? { inner: { n: m.drawers, h: dh, front: x.innerFront, ift: x.innerThk, clear: x.innerClear, cover } } : null;
    if (wantInside && !inside) note(`idr-nodoor-${m.id}`, `${label} ${i + 1}: drawers set to Inside but the column has no door - drawn as exposed fronts.`, `${label} ${i + 1}: الأدراج مضبوطة «داخلي» لكن العمود بلا باب - رُسمت كواجهات ظاهرة.`);
    const front = frontT === 'open' ? S('open', m.shelves, { shelves: 0 })
      : frontT === 'glass' ? S('glass', leaves, { shelves: m.shelves, hinge, div: x.divisions, smoked: style === 'smoked', ...innerSpec })
        : S('door', leaves, { shelves: m.shelves, hinge, ...innerSpec });
    const topSec = !tb ? null : frontT === 'open' ? S('open', 0, { shelves: 0, h: tb })
      : design.type === 'sliding' ? S('cover', 1, { shelves: 0, h: tb })       // sliding: the loft is a fixed cover panel (the track runs under it)
        : frontT === 'glass' ? S('glass', leaves, { shelves: 0, hinge, div: 0, smoked: style === 'smoked', h: tb })
          : S('door', leaves, { shelves: 0, hinge, h: tb });
    const secs = [...(topSec ? [topSec] : []), front];
    if (m.drawers > 0 && !inside) secs.push(S('drawer', m.drawers, { shelves: 0, h: dh }));
    const unitId = `${part === 'wing' ? 'wr' : 'wc'}-${m.id}`;
    const zoneH = { shelves: m.shelves > 0 ? Math.max(0, inner - hz) : 0, rail: hz, drawers: dh };
    cols.push({ id: m.id, idx: i, part, mod: { ...m, width }, leaves, hang: hz, unitId, hasDrawers: m.drawers > 0, topBox: tb, zoneH, hidden: !!m.hidden, inside, cover: inside ? cover : null, drawerH: dH, frontT });
    return U(width, secs, { id: unitId, type: 'tall', h: unitH, ...(m.hidden ? { hidden: true } : null) });
  });
  const mainUnits = mkUnits(design.mods, 'main', 'Column');
  const base = makeInitial();
  const hidden = (id, w) => U(w, [S('open', 1, { shelves: 0 })], { id, type: 'tall', h: unitH, hidden: true });
  let spacerMain = 0; let spacerWing = 0; let wingUnits = [];
  const legs = { ...base.legs };
  const runs = { main: { base: mainUnits, wall: [], top: [] }, left: { base: [], wall: [], top: [] }, right: { base: [], wall: [], top: [] } };
  if (wing) {
    wingUnits = mkUnits(wing.mods, 'wing', 'Return column');
    if (wing.corner === 'main') spacerWing = cornerGap(depth, x.doorThk); else spacerMain = wing.depth; // who runs through the corner: the other one stops short by the depth of the one that does
    const wl = [...(spacerWing ? [hidden('wr-corner', spacerWing)] : []), ...wingUnits];
    runs[wing.side] = { base: wl, wall: [], top: [] };
    legs[wing.side] = { ...base.legs[wing.side], on: true, depth: wing.depth, matchD: false, matchH: true, length: wl.reduce((t, u) => t + u.w, 0) };
    if (spacerMain) runs.main.base = wing.side === 'left' ? [hidden('wc-corner', spacerMain), ...mainUnits] : [...mainUnits, hidden('wc-corner', spacerMain)];
  }
  const paint = {};
  const model = {
    ...base,
    title: x.title,
    g: {
      ...g0, plinthH: x.plinthH, plinthSetback: x.plinthSetback, baseD: depth, board: x.board, back: x.back, doorThk: x.doorThk, doorGap: x.doorGap, shelfThk: x.shelfThk, drawerGap: x.drawerGap, drawerSide: x.drawerSide,
      /* [NEO-CLOSETS-UX25] the rest of the Global cards: the engine already uses every one of these for the 3D, the elevation, the cut list and the hinge / runner hardware */
      inset: x.inset, flushBack: !(x.inset > 0), hingeCup: x.hingeCup, cupEdge: x.cupEdge, drawerBottom: x.drawerBottom, drawerFrontSide: x.drawerFrontSide, shelfPlay: x.shelfPlay,
    },
    runs, legs,
    topOn: false, finish: x.finishKey, counter: 'marble', handle: x.handle, paint, led: { ...base.led, strip: false }, bottomCover: false,
    mats: x.mats, matMap: x.matMap,
  };
  return { model, cols, notes, x, unitH, topBoxH, depth, wing, spacerMain, spacerWing };
}

/** paint a database finish colour on the doors, drawer fronts, carcass and shelves (display only, like the kitchen Look paint); the M&S tab's own Look settings (x.paint) win */
export function withFinishPaint(model, hex, own) {
  const o = own || {};
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(String(hex).trim())) return Object.keys(o).length ? { ...model, paint: { ...model.paint, ...o } } : model;
  const c = String(hex).trim().startsWith('#') ? String(hex).trim() : `#${String(hex).trim()}`;
  return { ...model, paint: { ...model.paint, doors: { c }, drawerFronts: { c }, carcass: { c }, shelves: { c }, ...o } };
}

/* ---- display props: hanging clothes, folded stacks, rails, sliding tracks ---------------------------------------------------
 * Each prop is { kind, unitId, runKey, row, tone, box (overall), boxes: [{u0..d1, mat}] }. `boxes` are the primitives the 3D view merges into a few
 * meshes (mat: cloth | wood | metal | black) and the "Include props" export writes; the overall `box` is what the tests and the camera use. */
const hash = (a, b) => ((a * 2654435761 + b * 40503) >>> 0);
/** garment tones (--nk-w-c0 .. c7 in wardrobeStudio.css) */
export const TONES = 8;
const GARMENT_FORMS = ['shirt', 'dress', 'jacket', 'shirt', 'trousers', 'coat', 'shirt', 'jacket', 'dress', 'shirt'];

/** one hung garment: a hook, a wooden hanger and 2-4 cloth boxes. u = left edge, th = thickness along the rail, rY = rail axis y, len = longest it may be, gd = depth span.
 *  A cloth box may carry `tb` (bottom depth scale: 1.25 = it flares towards the hem, 0.9 = it narrows) - the 3D view and the props export both honour it. */
function garmentBoxes(form, { u, th, rY, len, dMid, gd, h }) {
  const out = [];
  const B = (u0, u1, y0, y1, d0, d1, mat, tb) => out.push({ u0, u1, y0, y1, d0, d1, mat, ...(tb && tb !== 1 ? { tb } : null) });
  const cu = u + th / 2; const top = rY - 24; // hanger bar sits 24 mm under the rail axis
  B(cu - 2, cu + 2, top, rY + 4, dMid - 3, dMid + 3, 'metal');
  B(cu - 3, cu + 3, top - 7, top, dMid - gd * 0.47, dMid + gd * 0.47, 'wood');
  const y0 = top - 7; // shoulders start here
  const L = (f) => Math.max(120, Math.round(len * f));
  const cloth = (ua, ub, ya, yb, hd, tb) => B(ua, ub, yb, ya, dMid - hd, dMid + hd, 'cloth', tb);
  const cx = (t) => [cu - t / 2, cu + t / 2];
  switch (form) {
    case 'dress': { const l = L(0.98 - (h % 5) * 0.02); const [a, b2] = cx(th * 0.7); cloth(a, b2, y0, y0 - l * 0.3, gd * 0.3, 1.1); cloth(a, b2, y0 - l * 0.3, y0 - l, gd * 0.33, 1.45); break; }
    case 'jacket': { const l = L(0.62 + (h % 4) * 0.02); const [a, b2] = cx(th * 1.15); cloth(a, b2, y0, y0 - l * 0.22, gd * 0.46, 0.92); cloth(a, b2, y0 - l * 0.22, y0 - l, gd * 0.42, 1.04); break; }
    case 'coat': { const l = L(0.96); const [a, b2] = cx(th * 1.3); cloth(a, b2, y0, y0 - l * 0.18, gd * 0.46, 0.94); cloth(a, b2, y0 - l * 0.18, y0 - l, gd * 0.42, 1.08); break; }
    case 'trousers': { const l = L(0.5); const [a, b2] = cx(th * 0.85); cloth(a, cu - 1, y0 - 4, y0 - l, gd * 0.27, 0.9); cloth(cu + 1, b2, y0 - 4, y0 - l * 0.96, gd * 0.27, 0.9); break; }
    default: { const l = L(0.58 + (h % 5) * 0.025); const [a, b2] = cx(th * 0.7); cloth(a, b2, y0, y0 - l * 0.2, gd * 0.45, 0.94); cloth(a, b2, y0 - l * 0.2, y0 - l, gd * 0.4, 1.0); break; } // shirt
  }
  return out;
}
const hull = (boxes) => boxes.reduce((a, b) => ({ u0: Math.min(a.u0, b.u0), u1: Math.max(a.u1, b.u1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1), d0: Math.min(a.d0, b.d0), d1: Math.max(a.d1, b.d1) }), { u0: Infinity, u1: -Infinity, y0: Infinity, y1: -Infinity, d0: Infinity, d1: -Infinity });

/** a stack of folded items on a shelf: sizes, offsets and tones vary a little per item (deterministic) */
function foldedStack(seed, { u0, w, y0, levels, d0, dep }) {
  const out = []; let y = y0;
  for (let l = 0; l < levels; l++) {
    const h = hash(seed, l + 11);
    const th = 40 + (h % 5) * 6;                  // 40-64 mm thick
    const iw = Math.round(w * (0.86 + (h % 15) / 100)); // 86-100 % of the stack width
    const id = Math.round(dep * (0.82 + ((h >> 4) % 18) / 100));
    const du = ((h >> 8) % 7) - 3; const dd = (h >> 12) % 9;
    const a = u0 + Math.round((w - iw) / 2) + du;
    out.push({ box: { u0: a, u1: a + iw, y0: y, y1: y + th, d0: d0 + dd, d1: d0 + dd + id }, tone: hash(seed + l, 5) % TONES });
    y += th + 1;
  }
  return out;
}

/* ---- decorate the fresh scene: names, sliding leaves, shelves above the rail, rails + clothes ------------- */
export function decorateScene(scene, built, design) {
  const { model, cols, x, depth, wing } = built;
  const g = model.g; const t = g.board; const dt = g.doorThk;
  const props = [];
  const extraHw = { rails: 0, tracks: 0, rollers: 0 };
  const wingRun = scene.runs.find((r) => r.key !== 'main') || null;
  const mainRun = scene.runs[0];
  const runOf = (unitId) => scene.runs.find((r) => r.units.some((q) => q.unit.id === unitId));

  /* names: "Column N" / "Return column N" in the elevation / selection / cut list instead of "Base N" / "Tall" */
  scene.runs.forEach((run) => {
    const isWing = run.key !== 'main';
    run.label = isWing ? 'Return wing' : 'Main';
    run.units.forEach((inst0) => { const c0 = cols.find((c) => c.unitId === inst0.unit.id); const i = c0 ? c0.idx : 0; const inst = inst0; inst.label = isWing ? `Return column ${i + 1}` : `Column ${i + 1}`; inst.tag = isWing ? `R${i + 1}` : `C${i + 1}`; inst.group = isWing ? 'Return wing' : 'Wardrobe'; });
  });
  scene.parts.forEach((p) => { p.group = p.runKey === 'main' ? 'Wardrobe' : 'Return wing'; p.product = 'wardrobe'; });

  /* the corner: who is hidden behind whom (elevation hatch + plinth) */
  if (wing) {
    const sw = built.spacerWing; const sm = built.spacerMain;
    if (wingRun) {
      wingRun.hiddenBase = sw;
      wingRun.hiddenSpan = sw ? (wingRun.flip ? { u0: wingRun.L - sw, u1: wingRun.L } : { u0: 0, u1: sw }) : null;
      if (wingRun.plinth) { if (wingRun.flip) { wingRun.plinth.u0 = 0; wingRun.plinth.u1 = wingRun.L - sw; } else { wingRun.plinth.u0 = sw; wingRun.plinth.u1 = wingRun.L; } }
    }
    if (sm) {
      mainRun.hiddenSpan = wing.side === 'left' ? { u0: 0, u1: sm } : { u0: mainRun.L - sm, u1: mainRun.L };
      if (mainRun.plinth) { if (wing.side === 'left') { mainRun.plinth.u0 = sm; } else { mainRun.plinth.u1 = mainRun.L - sm; } }
    }
  }

  /* sliding wardrobe: hinged leaves become two tracks; one leaf per column runs along its track (u), the other is fixed in the front track */
  if (design.type === 'sliding') {
    scene.hinges = [];
    const off = dt + 4;
    cols.forEach((col) => {
      const parts = scene.parts.filter((p) => p.unitId === col.unitId && p.anim && p.anim.k === 'door');
      const groups = new Map();
      parts.forEach((p) => { if (!groups.has(p.anim)) groups.set(p.anim, []); groups.get(p.anim).push(p); });
      const leaves = [...groups.values()].map((ps) => ({ ps, u0: Math.min(...ps.map((p) => (p.elevBox || p.box).u0)), u1: Math.max(...ps.map((p) => (p.elevBox || p.box).u1)) })).sort((a, b) => a.u0 - b.u0);
      if (!leaves.length) return;
      const mover = leaves.length > 1 ? (col.idx % 2 === 0 ? 0 : leaves.length - 1) : -1;
      leaves.forEach((lf, li) => {
        const lw = lf.u1 - lf.u0;
        if (li === mover) {
          const an = { k: 'slide', dx: (li === 0 ? 1 : -1) * lw * 0.94 };
          lf.ps.forEach((p) => { p.anim = an; });
          extraHw.rollers += 2;
        } else {
          lf.ps.forEach((p) => {
            p.anim = null;
            if (leaves.length > 1) {
              p.box = { ...p.box, d0: p.box.d0 + off, d1: p.box.d1 + off };
              if (p.elevBox) p.elevBox = { ...p.elevBox, d0: p.elevBox.d0 + off, d1: p.elevBox.d1 + off };
            }
          });
          if (leaves.length > 1) scene.handles.forEach((h) => { if (lf.ps.some((p) => p.id === h.partId)) h.d += off; });
        }
      });
      if (leaves.length > 1) {
        extraHw.tracks += 1;
        const run = runOf(col.unitId); const inst = run && run.units.find((q) => q.unit.id === col.unitId);
        if (inst) { // the two aluminium tracks (top and bottom), black: display only, listed as hardware
          const D = inst.D; const yT = inst.y0 + inst.H - (col.topBox || 0);
          [[yT - 14, yT - 2], [inst.y0 + 2, inst.y0 + 12]].forEach(([y0, y1]) => {
            const b = { u0: inst.fu0 + t, u1: inst.fu0 + inst.W - t, y0, y1, d0: D + 2, d1: D + off + dt - 2 };
            props.push({ kind: 'track', unitId: col.unitId, runKey: run.key, row: 'base', box: b, boxes: [{ ...b, mat: 'black' }] });
          });
        }
      }
    });
  }

  /* shelves sit ABOVE the hanging zone (the kitchen engine spreads them over the whole section) */
  cols.forEach((col) => {
    const run = runOf(col.unitId); if (!run) return;
    const inst = run.units.find((q) => q.unit.id === col.unitId); if (!inst) return;
    const nsec = inst.bounds.length;
    const kb = col.topBox > 0 ? 1 : 0; // [NEO-CLOSETS-UX25] with a top box the first section is the loft; the hanging / shelf zone starts under its fixed board
    const botY = col.inside ? inst.y0 + col.zoneH.drawers + t / 2 : nsec - kb === 1 ? inst.y0 + t : inst.bounds[kb].bot + t / 2; // inside drawers: the zone's divider board, inside the door's section
    const topY = kb ? inst.bounds[kb].top - t / 2 : inst.y0 + inst.H - t;
    const shelves = scene.parts.filter((p) => p.unitId === col.unitId && p.kind === 'shelf').sort((a, b) => a.box.y0 - b.box.y0);
    if (col.hang > 0 && shelves.length) {
      const hz = botY + col.hang;
      shelves.forEach((p, j) => {
        const ys = hz + ((topY - hz) * (j + 1)) / (shelves.length + 1);
        p.box = { ...p.box, y0: ys - g.shelfThk / 2, y1: ys + g.shelfThk / 2 };
      });
    }

    /* rails + hanging clothes (each rail carries its own garments, inside this column only) */
    const x0 = inst.fu0 + t, x1 = inst.fu0 + inst.W - t;
    const dMid = (g.inset + g.back + inst.D) / 2;
    const garmentD = Math.max(180, Math.min(440, inst.D - g.inset - g.back - 80));
    const railRs = [];
    if (col.hang > 0) {
      const hz = botY + col.hang; const kind = col.mod.hanging;
      const rdp = x.railDrop; const own = col.mod.railH || x.railH; // rail drop = the rail centre below the top of its zone; "height from floor" (own value, else the global one, 0 = standard) never goes above the drop
      const r1 = own > 0 ? Math.max(botY + x.railDia, Math.min(own, hz - rdp)) : hz - rdp;
      railRs.push({ y: r1, len: kind === 'long' ? Math.min(1400, col.hang - 140) : kind === 'double' ? 800 : Math.min(850, col.hang - 160) });
      if (kind === 'double') railRs.push({ y: r1 - Math.round(col.hang / 2 - 5), len: Math.min(700, col.hang / 2 - 120) });
    }
    const seedBase = (col.part === 'wing' ? 97 : 0) + col.idx * 31;
    railRs.forEach((rl, ri) => {
      const rd = x.railDia;
      const rb = { u0: x0, u1: x1, y0: rl.y - rd / 2, y1: rl.y + rd / 2, d0: dMid - rd / 2, d1: dMid + rd / 2 };
      props.push({ kind: 'rail', unitId: col.unitId, runKey: run.key, row: 'base', box: rb, boxes: [{ ...rb, mat: 'metal' }] });
      extraHw.rails += 1;
      if (!x.clothes.on) return;
      const pitch = PITCH[x.clothes.density];
      const n = Math.max(0, Math.floor((x1 - x0 - 60) / pitch));
      for (let k = 0; k < n; k++) {
        const h = hash(seedBase + ri * 7 + 3, k + 1);
        const form = GARMENT_FORMS[h % GARMENT_FORMS.length];
        const th = Math.min(form === 'coat' || form === 'jacket' ? 44 : 32, pitch - 8);
        const len = Math.round(rl.len * (0.9 + (h % 11) / 100));
        const u = x0 + 30 + k * pitch + (h % 5);
        const boxes = garmentBoxes(form, { u, th, rY: rl.y, len, dMid, gd: garmentD, h });
        props.push({ kind: 'garment', form, unitId: col.unitId, runKey: run.key, row: 'base', tone: h % TONES, box: hull(boxes), boxes: boxes.map((b) => ({ ...b, tone: h % TONES })) });
      }
    });

    /* folded clothes on every shelf that has room above it */
    if (x.clothes.on) {
      const ordered = scene.parts.filter((p) => p.unitId === col.unitId && p.kind === 'shelf').sort((a, b) => a.box.y0 - b.box.y0);
      ordered.forEach((p, si) => {
        const above = ordered[si + 1] ? ordered[si + 1].box.y0 : topY;
        const room = above - p.box.y1;
        const levels = Math.min(1 + (hash(seedBase + 5, si + 2) % 4), Math.floor((room - 30) / 66));
        if (levels < 1) return;
        const sw = p.box.u1 - p.box.u0;
        const stacks = sw >= 650 ? 2 : 1;
        const stW = Math.min(340, (sw - 40) / stacks - 20);
        if (stW < 120) return;
        const dep = Math.min(300, p.box.d1 - p.box.d0 - 50);
        for (let s = 0; s < stacks; s++) {
          const u0 = p.box.u0 + 20 + s * (stW + 30);
          const lv = levels - (s % 2);
          if (lv < 1) continue;
          foldedStack(hash(seedBase + s, si + 3), { u0, w: stW, y0: p.box.y1, levels: lv, d0: p.box.d0 + 20, dep }).forEach((it) => {
            props.push({ kind: 'folded', unitId: col.unitId, runKey: run.key, row: 'base', tone: it.tone, box: it.box, boxes: [{ ...it.box, mat: 'cloth', tone: it.tone }] });
          });
        }
      });
    }
  });

  /* real overall depth (the kitchen counts a worktop overhang that a wardrobe does not have); the wing's length is the room depth along its wall */
  const mainD = Math.max(depth + dt, ...scene.parts.filter((p) => p.runKey === 'main').map((p) => p.box.d1));
  scene.bounds = { ...scene.bounds, z1: Math.max(mainD, wingRun ? wingRun.L : 0) };
  scene.props = props;
  scene.product = 'wardrobe'; // read by the elevation dimension layer: no kitchen row heights (base / counter / wall) for a wardrobe
  return extraHw;
}

/* ---- [NEO-CLOSETS-UX30] drawers inside: coupling with the door, rules --------------------------------------------------- */
const isDoorAnim = (p) => !!(p.anim && (p.anim.k === 'door' || p.anim.k === 'slide'));
/** the checks of the inside-drawer columns (rules engine): a door that spans the drawers gets taller and heavier, a drawer slot must hold a box, the box needs depth */
export const DOOR_MAX_H = 2400;      // mm: a leaf taller than this needs a fifth hinge row / a split
export const DOOR_MAX_KG = 20;       // kg per leaf on cup hinges (about 700 kg/m3 board)
export const BOX_MIN_H = 80;         // mm: shortest useful drawer box
export const BOX_MIN_D = 450;        // mm: shortest useful runner for a wardrobe drawer
export function insideWarnings(scene, built) {
  const out = [];
  built.cols.filter((c) => c.inside).forEach((c) => {
    const name = `${c.part === 'wing' ? 'Return column' : 'Column'} ${c.idx + 1}`;
    const nameAr = `${c.part === 'wing' ? 'عمود الجناح' : 'العمود'} ${c.idx + 1}`;
    const mine = scene.parts.filter((p) => p.unitId === c.unitId);
    if (c.cover === 'full') {
      const leaf = mine.filter((p) => p.kind === 'door' && isDoorAnim(p)).sort((a, b) => b.ext.h * b.ext.w - a.ext.h * a.ext.w)[0];
      if (leaf) {
        const kg = Math.round((leaf.ext.w * leaf.ext.h * leaf.ext.d * 700) / 1e9 * 10) / 10;
        if (leaf.ext.h > DOOR_MAX_H) out.push({ id: `idr-tall-${c.id}`, en: `${name}: the door spans the drawers and is ${Math.round(leaf.ext.h)} mm tall (over ${DOOR_MAX_H}) - it needs 5 hinges and may bow; set the door to "above the drawers" or add a top box.`, ar: `${nameAr}: الباب يغطي الأدراج وارتفاعه ${Math.round(leaf.ext.h)} مم (أكثر من ${DOOR_MAX_H}) - يحتاج 5 مفصلات وقد ينحني؛ اجعل الباب «فوق الأدراج» أو أضف صندوقًا علويًا.` });
        if (kg > DOOR_MAX_KG) out.push({ id: `idr-heavy-${c.id}`, en: `${name}: the door leaf weighs about ${kg} kg (over ${DOOR_MAX_KG} kg) - use 2 leaves or a thinner board.`, ar: `${nameAr}: وزن ضلفة الباب نحو ${kg} كجم (أكثر من ${DOOR_MAX_KG} كجم) - استخدم ضلفتين أو لوحًا أرق.` });
      }
    }
    const box = mine.find((p) => p.kind === 'drawerBox' && /box front$/.test(p.name));
    const side = mine.find((p) => p.kind === 'drawerBox' && /side$/.test(p.name));
    if (box && box.ext.h < BOX_MIN_H) out.push({ id: `idr-h-${c.id}`, en: `${name}: inside drawers are only ${Math.round(box.ext.h)} mm high in the box (minimum ${BOX_MIN_H}) - raise the drawer height or use fewer drawers.`, ar: `${nameAr}: ارتفاع صندوق الدرج الداخلي ${Math.round(box.ext.h)} مم فقط (الحد الأدنى ${BOX_MIN_H}) - ارفع ارتفاع الدرج أو قلّل العدد.` });
    if (side && side.ext.d < BOX_MIN_D) out.push({ id: `idr-d-${c.id}`, en: `${name}: inside drawer box depth ${Math.round(side.ext.d)} mm is under ${BOX_MIN_D} mm (the door clearance and the inner front take depth) - reduce them or deepen the closet.`, ar: `${nameAr}: عمق صندوق الدرج الداخلي ${Math.round(side.ext.d)} مم أقل من ${BOX_MIN_D} مم - قلّل الخلوص أو عمّق الخزانة.` });
    if (scene.parts.some((p) => p.unitId === c.unitId && p.anim && p.anim.k === 'slide')) out.push({ id: `idr-slide-${c.id}`, en: `${name}: drawers behind a sliding door are reachable only through the open leaf.`, ar: `${nameAr}: الأدراج خلف باب منزلق يمكن الوصول إليها فقط عبر الضلفة المفتوحة.` });
  });
  return out;
}
/** the part ids that make a click on the Open bar work for inside drawers: a drawer cannot come out through a closed door, and a door that closes takes its drawers back.
 *  `next` = the open set about to be applied, `prev` = the one before. Returns a new Set (the same one when nothing needs to change). */
export function coupleDoors(scene, next, prev) {
  const by = new Map();
  scene.parts.forEach((p) => {
    if (p.behind && p.anim && p.anim.k === 'drawer') { const u = by.get(p.unitId) || { d: [], doors: [] }; u.d.push(p.id); by.set(p.unitId, u); }
  });
  if (!by.size) return next;
  scene.parts.forEach((p) => { const u = by.get(p.unitId); if (u && isDoorAnim(p)) u.doors.push(p.id); });
  const out = new Set(next); const was = prev || new Set();
  by.forEach((u) => {
    if (!u.doors.length) return;
    const doorsNow = u.doors.some((i) => out.has(i));
    const drawersNow = u.d.some((i) => out.has(i)); const pulled = u.d.some((i) => out.has(i) && !was.has(i));
    if (drawersNow && !doorsNow) { if (pulled) u.doors.forEach((i) => out.add(i)); else u.d.forEach((i) => out.delete(i)); } // a drawer was pulled: its door opens first | the door was closed on its drawers: they go back in
  });
  return out;
}

/** hanging rails, sliding track sets and rollers as extra hardware lines (the kitchen hardware rows stay as they are) */
export function wardrobeHardware(scene, extra, rails) {
  const base = buildHardware(scene);
  const panes = scene.parts.filter((p) => p.kind === 'glass').length;
  const bars = scene.parts.filter((p) => /frame bar$/.test(p.name)).length;
  const rows = [
    { k: 'glassClip', en: 'Glass retaining clip (4 per pane)', ar: 'مشبك تثبيت زجاج (٤ لكل لوح)', qty: panes * 4 },
    { k: 'barConnector', en: 'Glazing bar connector (2 per bar)', ar: 'وصلة قضيب زجاج (٢ لكل قضيب)', qty: bars * 2 },
    { k: 'rail', en: `Hanging rail Ø${rails} (per column / tier)`, ar: `ماسورة تعليق Ø${rails} (لكل عمود / طابق)`, qty: extra.rails },
    { k: 'railBracket', en: 'Rail end bracket', ar: 'حامل طرف الماسورة', qty: extra.rails * 2 },
    { k: 'track', en: 'Sliding track set (top + bottom)', ar: 'طقم سكة منزلقة (علوية + سفلية)', qty: extra.tracks },
    { k: 'roller', en: 'Sliding door roller', ar: 'عجلة باب منزلق', qty: extra.rollers },
  ].filter((r) => r.qty > 0);
  return [...base, ...rows];
}

/* ---- the whole thing ------------------------------------------------------------ */
/** hex: the database finish colour (or null). Returns everything the studio and the reused Neo Kitchen components need. */
export function buildWardrobe(design, { rules, hex } = {}) {
  const built = designToKitchen(design, rules);
  const model = withFinishPaint(built.model, hex, built.x.paint);
  const scene = buildScene(model);
  const extra = decorateScene(scene, { ...built, model }, design);
  scene.wd = { plinthH: built.x.plinthH, topBoxH: built.topBoxH }; // [NEO-HANDLES-UX36] the elevation's PLINTH / BODY / TOP BOX side labels and handles read these
  const bom = buildBOM(scene);
  /* nominal sizes of the cut-list footer: the wardrobe's own columns (the engine would count the hidden corner board as a unit) */
  const colsW = (part) => built.cols.filter((c) => c.part === part).reduce((s, c) => s + c.mod.width, 0);
  bom.nominal = [{ key: 'main', base: colsW('main'), wall: 0, top: 0, units: built.cols.filter((c) => c.part === 'main').length },
    ...(built.wing ? [{ key: built.wing.side, base: colsW('wing'), wall: 0, top: 0, units: built.cols.filter((c) => c.part === 'wing').length }] : [])];
  const hardware = wardrobeHardware(scene, extra, built.x.railDia);
  /* the kitchen "unit 01 sits in the corner" rule is about a leg's first unit; the wardrobe's hidden corner board is deliberate */
  const warnings = [...built.notes.map((n) => ({ id: n.id, en: n.en, ar: n.ar })), ...buildWarnings(scene).filter((w) => !/^corner-/.test(w.id)), ...insideWarnings(scene, built)];
  return { model, scene, bom, hardware, warnings, cols: built.cols, x: built.x, notes: built.notes, wing: built.wing };
}

/* ---- selection card -------------------------------------------------------------- */
const ANIM_K = new Set(['door', 'flip', 'drawer', 'slide']);
const isAnim = (p) => !!(p.anim && ANIM_K.has(p.anim.k));
const dispName = (p) => (/^S\d/.test(p.name) ? `${p.group} ${p.name}` : `${p.group} - ${p.name}`);

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
  } else {
    area = bom.rows.filter((r) => r.unitIds.includes(inst.unit.id)).reduce((s, r) => s + r.area, 0);
  }
  return {
    name: part ? `${inst.label} - ${part.name}` : inst.label,
    dims: part ? [part.ext.w, part.ext.d, part.ext.h] : [inst.W, inst.D, inst.H],
    mat: part ? part.mat : null, area, part, inst,
    ptype: part ? part.ptype : 'baseUnit',
    openable: part ? isAnim(part) : scene.parts.some((p) => p.unitId === inst.unit.id && isAnim(p)),
  };
}

/** part ids a click on "Open" toggles: the selected part's whole leaf / drawer, or every door + drawer of the selected column */
export function openIdsFor(scene, info) {
  if (!info) return [];
  if (info.part) return scene.parts.filter((p) => p.anim && p.anim === info.part.anim).map((p) => p.id);
  return scene.parts.filter((p) => p.unitId === info.inst.unit.id && isAnim(p)).map((p) => p.id);
}

/* ---- part legend (the reference tool's: Column, Carcass ... Plinth) ---------------- */
export const LEGEND_KEYS = ['baseUnit', 'door', 'glass', 'drawer', 'shelf', 'open', 'cover', 'plinth'];
export const LEGEND_NAME = { baseUnit: ['Column', 'عمود'], cover: ['Cover panel', 'لوح تغطية'] };

/* ---- stats shown on the Rails / Clothes tabs ---------------------------------------- */
export function propStats(scene) {
  const p = scene.props || [];
  return { rails: p.filter((q) => q.kind === 'rail').length, garments: p.filter((q) => q.kind === 'garment').length, folded: p.filter((q) => q.kind === 'folded').length };
}

/* ---- File menu: save / load ----------------------------------------------------------- */
export function designJSON(design) {
  return JSON.stringify({ format: FORMAT, v: VERSION, exportedAt: new Date().toISOString(), design: { ...design, x: normalizeX(design.x) } }, null, 2);
}
/** parse + validate + clamp a saved file; throws a short message on a bad file */
export function parseDesign(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON file'); }
  if (!raw || raw.format !== FORMAT) throw new Error(raw && raw.format ? `Unknown format "${raw.format}"` : 'Not a Neo Wardrobe file');
  const d = raw.design || {};
  const dims = { w: clamp(RI(d.dims && d.dims.w) || 2400, 600, 6000), h: clamp(RI(d.dims && d.dims.h) || 2400, 1000, 4000), d: clamp(RI(d.dims && d.dims.d) || 600, 350, 800) };
  const mods = (Array.isArray(d.mods) ? d.mods : []).slice(0, 20).map((m, i) => normalizeMod({ ...m, id: m.id || 'M' + String(i + 1).padStart(2, '0'), width: clamp(RI(m.width) || 600, 200, 1200) }));
  if (!mods.length) throw new Error('The file has no columns');
  dims.w = mods.reduce((s, m) => s + m.width, 0);
  return { dims, type: ['sliding', 'hinged', 'open'].includes(d.type) ? d.type : 'hinged', doorSystem: String(d.doorSystem || 'hinged_lam'), finishId: String(d.finishId || ''), optIdx: clamp(RI(d.optIdx), 0, 2), mods, x: normalizeX(d.x) };
}
export const designKey = (d) => JSON.stringify({ dims: d.dims, type: d.type, doorSystem: d.doorSystem, finishId: d.finishId, optIdx: d.optIdx, mods: d.mods, x: normalizeX(d.x) });
