// Standard Wardrobe · Hardware / fittings engine (pure, deterministic, data-driven).
// From a WardrobeConfiguration (+ construction profile) it derives the full fittings list, with SMART
// selection of hinges / drawer runners / handles and engineering warnings when a user override is unsafe.
// No I/O, no Date/random. Rules live here — never in React or Three.js (spec §17, §18, §42).

const r = (n) => Math.round(Number(n) || 0);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Fallback fitting rules — real values load from hardware_rules later. Prices are NOT hard-coded here. */
export const DEFAULT_HW_RULES = {
  board_density: 700,          // kg/m³ (18mm MDF-ish) → door weight estimate
  hinge_min: 2,
  hinge_base_height: 900,      // doors up to this get the minimum hinge count
  hinge_add_step: 450,         // then ~one extra hinge every 450 mm of extra height
  hinge_weight_step: 9,        // ~one extra hinge every 9 kg of leaf
  hinge_end_inset: 100,        // first/last hinge inset from top/bottom
  runner_lengths: [250, 300, 350, 400, 450, 500, 550, 600],
  runner_load: 30,             // kg per pair (full-extension ball-bearing baseline)
  soft_close: true,
  handle_style: 'bar',         // bar | knob | recessed | none | gola
  rail_support_each: 2,
  shelf_pins_per_shelf: 4,
};

export function normHwRules(row) { return { ...DEFAULT_HW_RULES, ...(row || {}) }; }

/** Approximate panel weight (kg) from size + thickness + board density. */
export function panelWeightKg(widthMm, heightMm, thicknessMm = 18, densityKgM3 = 700) {
  return r2(widthMm / 1000 * heightMm / 1000 * thicknessMm / 1000 * densityKgM3);
}

/** Recommend hinge count + evenly-distributed positions for one door leaf (spec §18). */
export function recommendHinges(doorWmm, doorHmm, thicknessMm = 18, rulesRow = {}) {
  const R = normHwRules(rulesRow);
  const wt = panelWeightKg(doorWmm, doorHmm, thicknessMm, R.board_density);
  const H = r(doorHmm);
  const byHeight = H <= R.hinge_base_height ? R.hinge_min : R.hinge_min + Math.ceil((H - R.hinge_base_height) / R.hinge_add_step);
  const byWeight = R.hinge_min + Math.floor(wt / R.hinge_weight_step);
  const count = Math.max(R.hinge_min, byHeight, byWeight);
  const inset = R.hinge_end_inset, span = Math.max(0, r(doorHmm) - 2 * inset);
  const positions = count <= 1 ? [r(doorHmm / 2)]
    : Array.from({ length: count }, (_, i) => inset + Math.round(span * i / (count - 1)));
  return { count, positions, weightKg: wt };
}

/** Recommend a drawer runner (nearest standard length that fits the depth). */
export function recommendRunner(depthMm, rulesRow = {}) {
  const R = normHwRules(rulesRow);
  const usable = r(depthMm) - 25;                 // leave clearance at the back
  const fit = R.runner_lengths.filter((l) => l <= usable);
  const lengthMm = fit.length ? fit[fit.length - 1] : R.runner_lengths[0];
  return { type: R.soft_close ? 'Ball-bearing full-extension · soft-close' : 'Ball-bearing full-extension', lengthMm, loadKg: R.runner_load };
}

/** Full fittings list — every item with SKU, category, qty, unit and what it fixes (spec §17, §25). */
export function hardwareList(config, profileRow = {}, rulesRow = {}) {
  const R = normHwRules(rulesRow);
  const thick = (profileRow && profileRow.panel_thickness) || 18;
  const H = r(config.height), D = r(config.depth), W = r(config.width);
  const mods = config.modules || [], n = mods.length;
  const out = []; const push = (o) => out.push({ unit: 'pc', qty: 1, category: 'other', ...o });

  // carcase assembly hardware
  push({ sku: 'HW-CAM-15', name: 'Cam + dowel connector', category: 'connector', qty: n * 8, note: 'gable ↔ top/bottom joints' });
  push({ sku: 'HW-SCR-4x30', name: 'Assembly screw 4×30', category: 'screw', qty: n * 24, note: 'carcase + backs' });
  push({ sku: 'HW-LEG-100', name: 'Adjustable plinth leg', category: 'leg', qty: Math.max(4, n * 2 + 2), note: 'levelling feet' });
  push({ sku: 'HW-WALL-BRK', name: 'Anti-tip wall bracket', category: 'bracket', qty: Math.max(2, n), note: 'tall-unit safety' });

  let totDrawers = 0, totShelves = 0, hangingSections = 0;
  for (const m of mods) {
    const sh = r(m.shelves), dr = r(m.drawers);
    totShelves += sh; totDrawers += dr;
    if (sh > 0) push({ sku: 'HW-PIN-5', name: 'Shelf support pin', category: 'shelf_support', qty: sh * R.shelf_pins_per_shelf, note: m.id });
    if (dr > 0) {
      const run = recommendRunner(D, R);
      push({ sku: 'HW-RUN-' + run.lengthMm, name: run.type + ' ' + run.lengthMm + 'mm', category: 'runner', qty: dr, unit: 'pair', note: m.id + ' · ' + run.loadKg + 'kg' });
      if (R.handle_style !== 'none' && R.handle_style !== 'gola' && m.dMode !== 'inside') push({ sku: 'HW-HDL-' + R.handle_style, name: R.handle_style + ' handle', category: 'handle', qty: dr, note: m.id + ' · drawers' });
    }
    if (m.hanging && m.hanging !== 'none') {
      hangingSections++;
      const tiers = m.hanging === 'double' ? 2 : 1;
      push({ sku: 'HW-RAIL-OVAL', name: 'Wardrobe rail (oval)', category: 'rail', qty: tiers, unit: 'm', note: m.id + ' · ' + (r2((r(m.width) - thick) / 1000)) + 'm each' });
      push({ sku: 'HW-RAIL-SUP', name: 'Rail end support', category: 'rail_support', qty: tiers * R.rail_support_each, note: m.id });
    }
  }

  // doors
  const leaves = r(config.doors);
  if (leaves > 0 && config.type !== 'open') {
    if (config.type === 'hinged') {
      const rec = recommendHinges(r(W / leaves), H, thick, R);
      push({ sku: 'HW-HNG-CLIP', name: 'Concealed hinge (clip-on)', category: 'hinge', qty: leaves * rec.count, note: rec.count + '/leaf · ' + rec.weightKg + 'kg leaf' });
      push({ sku: 'HW-HNG-PLT', name: 'Hinge mounting plate', category: 'hinge', qty: leaves * rec.count });
      if (R.soft_close) push({ sku: 'HW-HNG-SC', name: 'Hinge soft-close clip', category: 'soft_close', qty: leaves * rec.count });
      if (R.handle_style !== 'none' && R.handle_style !== 'gola') push({ sku: 'HW-HDL-' + R.handle_style, name: R.handle_style + ' handle', category: 'handle', qty: leaves, note: 'doors' });
    } else { // sliding
      push({ sku: 'HW-SLD-TRACK', name: 'Sliding track set (top+bottom)', category: 'track', qty: 1, unit: 'set', note: r2(W / 1000) + 'm run' });
      push({ sku: 'HW-SLD-ROLL', name: 'Roller carriage', category: 'roller', qty: leaves * 2, note: '2/leaf' });
      push({ sku: 'HW-SLD-SOFT', name: 'Sliding soft-close damper', category: 'soft_close', qty: leaves });
      push({ sku: 'HW-SLD-PROF', name: 'Handle profile', category: 'handle', qty: leaves, unit: 'm', note: r2(H / 1000) + 'm/leaf' });
    }
  }

  return { items: out, totals: { drawers: totDrawers, shelves: totShelves, hangingSections, doors: leaves, pieces: out.reduce((s, i) => s + (i.qty || 0), 0) } };
}

/**
 * Review a user override against the recommendation (spec §18). `overrides.hingesPerLeaf` etc.
 * Returns {ok, items:[{level,msg,fix}]} — an ERROR blocks production approval.
 */
export function hardwareReview(config, overrides = {}, profileRow = {}, rulesRow = {}) {
  const R = normHwRules(rulesRow); const items = [];
  const thick = (profileRow && profileRow.panel_thickness) || 18;
  const leaves = r(config.doors);
  if (config.type === 'hinged' && leaves > 0 && overrides.hingesPerLeaf != null) {
    const rec = recommendHinges(r(config.width / leaves), r(config.height), thick, R).count;
    if (overrides.hingesPerLeaf < rec) items.push({ level: 'WARNING', code: 'hinge_count', msg: `Only ${overrides.hingesPerLeaf} hinges/leaf — recommended ${rec} for this door weight/height`, fix: `Use ${rec} hinges` });
  }
  return { ok: !items.some((i) => i.level === 'ERROR'), items };
}

/** Cost of the fittings list via a SKU→price map (real prices stay in the DB, not hard-coded). */
export function hardwareCost(list, priceMap = {}) {
  const items = (list && list.items) || [];
  let total = 0, priced = 0;
  for (const it of items) { const p = priceMap[it.sku]; if (p != null) { total += p * (it.qty || 0); priced++; } }
  return { total: r2(total), pricedLines: priced, totalLines: items.length, complete: priced === items.length };
}
