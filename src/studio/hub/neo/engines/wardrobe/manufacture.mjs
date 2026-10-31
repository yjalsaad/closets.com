// Standard Wardrobe · Manufacturing engine (pure, deterministic).
// Derives a cutting list, BOQ and manufacturing estimate from the SAME WardrobeConfiguration.
// Formulas are transparent geometric estimates (thickness/back/setback are configurable);
// they are NOT approved production tolerances — the real rules override these when supplied.
import { slidingLeafWidth } from './config.mjs';

const r = (n) => Math.round(Number(n) || 0);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const defaults = (o = {}) => ({
  thickness: o.thickness || 18,
  backThickness: o.backThickness || 8,
  material: o.material || 'Melamine 18mm',
  backMaterial: o.backMaterial || 'HDF 8mm',
  shelfSetback: o.shelfSetback == null ? 20 : o.shelfSetback,   // shelf shorter than depth
  hasBack: o.hasBack !== false,
});

/** Per-leaf door face width for the current type. */
function leafWidth(config, rules) {
  const leaves = Number(config.doors) || 0;
  if (leaves <= 0) return 0;
  if (config.type === 'sliding') return slidingLeafWidth(config.width, leaves, rules || {});
  return r(config.width / leaves); // hinged: face divides the opening
}

/** Flat cutting list of parts with sizes, qty, material, edged-edge count and module ref. */
export function cuttingList(config, opts = {}) {
  const o = defaults(opts); const parts = [];
  const add = (part, w, h, qty, edges, material, module) => { if (qty > 0 && w > 0 && h > 0) parts.push({ part, width: r(w), height: r(h), qty: r(qty), edges, material, module: module || '—' }); };
  const mods = config.modules || []; const n = mods.length;
  const { height, depth } = config;

  // Carcase: shared vertical gables (n+1), horizontal top/bottom per module, optional back per module.
  add('Gable / side', depth, height, n + 1, 2, o.material, 'carcase');
  for (const m of mods) {
    const clear = Math.max(0, m.width - o.thickness); // between gables (one shared gable removed)
    add('Top', clear, depth, 1, 1, o.material, m.id);
    add('Bottom', clear, depth, 1, 1, o.material, m.id);
    if (o.hasBack) add('Back panel', m.width, height, 1, 0, o.backMaterial, m.id);
    const sh = Number(m.shelves) || 0;
    if (sh > 0) add('Shelf', clear, depth - o.shelfSetback, sh, 1, o.material, m.id);
    const dr = Number(m.drawers) || 0;
    if (dr > 0) { add(m.dMode === 'inside' ? 'Inner drawer front' : 'Drawer front', clear, 160, dr, 4, o.material, m.id); add('Drawer box side', depth - 40, 140, dr * 2, 0, o.material, m.id); add('Drawer box f/b', clear - 60, 140, dr * 2, 0, o.material, m.id); add('Drawer base', clear - 40, depth - 60, dr, 0, o.backMaterial, m.id); }
  }
  // Doors / shutters
  const leaves = Number(config.doors) || 0;
  if (leaves > 0 && config.type !== 'open') add(config.type === 'sliding' ? 'Sliding shutter' : 'Hinged door', leafWidth(config, opts.rules), height, leaves, 4, o.material, 'doors');
  return parts;
}

/** Bill of Quantities — assembly-level line items with counts (spec §54). */
export function boq(config, opts = {}) {
  const mods = config.modules || []; const leaves = Number(config.doors) || 0;
  const totShelves = mods.reduce((s, m) => s + (Number(m.shelves) || 0), 0);
  const totDrawers = mods.reduce((s, m) => s + (Number(m.drawers) || 0), 0);
  const items = [];
  const push = (item, qty, unit) => { if (qty > 0) items.push({ item, qty: r2(qty), unit: unit || 'pc' }); };
  push('Wardrobe carcass (modules)', mods.length, 'unit');
  if (config.type === 'sliding') { push('Sliding shutter', leaves); push('Sliding track set', 1, 'set'); push('Roller set', leaves * 2); push('Sliding profile / handle', leaves, 'm'); }
  else if (config.type === 'hinged') { push('Hinged door', leaves); push('Hinge', leaves * 2); push('Handle', leaves); }
  push('Shelf', totShelves); push('Drawer set (runners + box)', totDrawers);
  push('Soft-close', totDrawers + (config.type === 'hinged' ? leaves : 0));
  if (config.filler) push('Filler', 1);
  push('Plinth', 1, 'm');
  for (const a of (config.accessories || [])) push('Accessory: ' + (a.name || a.code || 'item'), a.qty || 1);
  return items;
}

/** Aggregate manufacturing estimate (board/back area, edge band, part & hardware counts). */
export function manufacturingEstimate(config, opts = {}) {
  const o = defaults(opts); const parts = cuttingList(config, opts);
  let boardM2 = 0, backM2 = 0, edgeM = 0, cutParts = 0;
  for (const p of parts) {
    const area = (p.width * p.height) / 1e6 * p.qty;
    if (p.material === o.backMaterial) backM2 += area; else boardM2 += area;
    edgeM += (p.edges === 4 ? 2 * (p.width + p.height) : p.edges === 2 ? 2 * p.height : p.edges === 1 ? p.width : 0) / 1000 * p.qty;
    cutParts += p.qty;
  }
  const mods = config.modules || []; const leaves = Number(config.doors) || 0;
  const totDrawers = mods.reduce((s, m) => s + (Number(m.drawers) || 0), 0);
  const totShelves = mods.reduce((s, m) => s + (Number(m.shelves) || 0), 0);
  const hardware = (config.type === 'sliding' ? leaves * 2 + 2 : config.type === 'hinged' ? leaves * 2 : 0) + totDrawers * 2;
  return { boardM2: r2(boardM2), backM2: r2(backM2), edgeBandM: r2(edgeM), doors: leaves, shelves: totShelves, drawers: totDrawers, cutParts: r(cutParts), hardware: r(hardware), modules: mods.length };
}
