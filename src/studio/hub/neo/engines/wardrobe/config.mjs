// Standard Wardrobe · Configuration engine (pure, deterministic — the single source of truth).
// Produces/validates a normalized WardrobeConfiguration and the module/door/filler math.
// No I/O, no Date/random. All limits come from DB `wardrobe_rules` (DEFAULT_RULES is only a fallback).

const r = (n) => Math.round(Number(n) || 0);

/** Fallback rules — the real ones load from public.wardrobe_rules. */
export const DEFAULT_RULES = {
  min_width: 600, max_width: 6000, min_height: 1800, max_height: 3000,
  min_depth: 350, max_depth: 700, standard_height: 2400, standard_depth: 600,
  min_module_width: 300, max_module_width: 1200,
  preferred_module_widths: [400, 450, 500, 600, 800, 900, 1000, 1200],
  max_hinged_door_width: 600, max_sliding_leaves: 6,
  sliding_overlap_mm: 30, sliding_end_clearance_mm: 20,
  max_shelf_span: 900, drawer_limit: 4, filler_max_mm: 150,
  vat_pct: 10, deposit_pct: 50, margin_floor_pct: 15,
  glass_rate_m2: 25, smoked_extra_m2: 12, division_rate_m: 6,   // [NEO-CLOSETS-UX24] glass doors: BD per m2 of door face, smoked extra per m2, glazing bar per metre (placeholders until wardrobe_rules carries them)
  discount_max: { sales: 10, manager: 50, admin: 100 },
};

/** Normalize DB rules onto the default shape (so missing columns fall back safely). */
export function normRules(row) {
  const R = { ...DEFAULT_RULES, ...(row || {}) };
  if (typeof R.preferred_module_widths === 'string') { try { R.preferred_module_widths = JSON.parse(R.preferred_module_widths); } catch (e) { R.preferred_module_widths = DEFAULT_RULES.preferred_module_widths; } }
  if (!Array.isArray(R.preferred_module_widths) || !R.preferred_module_widths.length) R.preferred_module_widths = DEFAULT_RULES.preferred_module_widths;
  if (typeof R.discount_max === 'string') { try { R.discount_max = JSON.parse(R.discount_max); } catch (e) { R.discount_max = DEFAULT_RULES.discount_max; } }
  return R;
}

/** The normalized WardrobeConfiguration — every subsystem (3D/2D/quote/BOQ/price) reads this. */
export function newWardrobeConfig(o = {}) {
  return {
    width: r(o.width), height: r(o.height == null ? 2400 : o.height), depth: r(o.depth == null ? 600 : o.depth),
    type: o.type || 'sliding',                 // 'sliding' | 'hinged' | 'open'
    modules: Array.isArray(o.modules) ? o.modules : [],
    doors: o.doors == null ? 0 : r(o.doors),
    carcassFinish: o.carcassFinish || null,
    doorFinish: o.doorFinish || null,
    interiorFinish: o.interiorFinish || null,
    accessories: Array.isArray(o.accessories) ? o.accessories : [],
    hardware: o.hardware || {},                // { handle, softClose }
    services: Array.isArray(o.services) ? o.services : [],
    filler: o.filler || null,                  // { side, width }
    preset: o.preset || null,
    glass: o.glass || null,                    // NEO-CLOSETS-UX24: { style:'glass'|'smoked', divisions } for glass doors (priced by price.mjs), null = solid doors
    wing: o.wing || null,                      // NEO-CLOSETS-UX24: optional L-shape return wing { side, corner, depth, width, doors, modules } (see lshape.mjs); null = a straight wardrobe
  };
}

/** Split a total width into n as-equal-as-possible whole-mm modules (leftover mm on the first modules). */
export function splitEqual(width, n) {
  const W = r(width), N = Math.max(1, r(n));
  const base = Math.floor(W / N); let rem = W - base * N;
  return Array.from({ length: N }, (_, i) => base + (i < rem ? 1 : 0));
}
const isPreferred = (w, prefs, tol = 20) => (prefs || []).some((p) => Math.abs(p - w) <= tol);

/**
 * Rank practical standard module breakdowns for a width. Considers manufacturing-standard
 * widths, symmetry, usable module size and module count (spec §11) — NOT price alone.
 * Returns up to `top` options: { modules:[mm], count, moduleWidth, score, reason }.
 */
export function optimizeModules(width, rules = DEFAULT_RULES, top = 3) {
  const R = normRules(rules); const W = r(width);
  const prefs = R.preferred_module_widths;
  const minN = Math.max(1, Math.ceil(W / R.max_module_width));
  const maxN = Math.max(1, Math.floor(W / R.min_module_width));
  const opts = [];
  for (let n = minN; n <= maxN; n++) {
    const mods = splitEqual(W, n);
    const lo = Math.min(...mods), hi = Math.max(...mods);
    if (lo < R.min_module_width || hi > R.max_module_width) continue;
    const prefBonus = isPreferred(mods[0], prefs) ? 30 : 0;
    const symmetry = (hi - lo <= 1) ? 20 : 0;
    const usable = (mods[0] >= 500 && mods[0] <= 900) ? 15 : 0;   // comfortable interior + door size
    const sweet = Math.max(0, 12 - Math.abs(mods[0] - 600) / 25); // ~600 mm is the standard sweet spot
    const countPenalty = Math.max(0, n - 6) * 4 + Math.max(0, 2 - n) * 6; // avoid too many / too few
    const score = 20 + prefBonus + symmetry + usable + sweet - countPenalty;
    opts.push({ modules: mods, count: n, moduleWidth: mods[0], score, reason: reasonFor(n, mods[0], prefBonus > 0, symmetry > 0) });
  }
  opts.sort((a, b) => b.score - a.score || a.count - b.count);
  return opts.slice(0, top);
}
function reasonFor(n, w, pref, sym) {
  const bits = [];
  if (sym) bits.push('equal ' + n + '×' + w + 'mm');
  if (pref) bits.push('standard module size');
  if (n <= 3) bits.push('large sections'); else if (n >= 6) bits.push('fine division');
  return bits.join(' · ') || (n + ' modules');
}

/** Recommended door/leaf count from width + type (sliding uses leaves; hinged bounded by max door width). */
export function doorCountFor(width, type, rules = DEFAULT_RULES) {
  const R = normRules(rules); const W = r(width);
  if (type === 'open') return 0;
  if (type === 'sliding') {
    let n = Math.max(2, Math.round(W / 1200));           // ~1.2 m leaves as a practical target (3.6 m → 3 doors)
    return Math.min(n, R.max_sliding_leaves || 6);
  }
  const maxDoor = R.max_hinged_door_width || 600;         // hinged: keep each leaf within max width
  return Math.max(1, Math.min(6, Math.ceil(W / maxDoor)));
}

/** Sliding leaf width accounting for overlap between leaves (NOT a plain width/leaves divide, spec §15). */
export function slidingLeafWidth(width, leaves, rules = DEFAULT_RULES) {
  const R = normRules(rules); const L = Math.max(1, r(leaves));
  return r((r(width) + (L - 1) * (R.sliding_overlap_mm || 0)) / L);
}

/** Detect a wall/wardrobe gap and propose a filler (spec §22). */
export function fillerFor(available, wardrobe, rules = DEFAULT_RULES) {
  const R = normRules(rules); const gap = r(available) - r(wardrobe);
  if (gap <= 0) return null;
  const max = R.filler_max_mm || 150;
  if (gap > max * 2) return { side: 'both', width: gap, warn: 'gap exceeds filler range — reduce wardrobe or split' };
  return gap > max ? { side: 'both', width: gap } : { side: 'right', width: gap };
}

/** Validate a configuration against the rules. Never silent — returns explained errors {code,msg,fix}. */
export function validateConfig(config, rules = DEFAULT_RULES) {
  const R = normRules(rules); const e = [];
  const push = (code, msg, fix) => e.push({ code, msg, fix });
  const c = config || {};
  if (c.width < R.min_width || c.width > R.max_width) push('width', `Width ${c.width} mm is outside the standard range`, `Enter ${R.min_width}–${R.max_width} mm`);
  if (c.height < R.min_height || c.height > R.max_height) push('height', `Height ${c.height} mm is outside range`, `Enter ${R.min_height}–${R.max_height} mm`);
  if (c.depth < R.min_depth || c.depth > R.max_depth) push('depth', `Depth ${c.depth} mm is outside range`, `Enter ${R.min_depth}–${R.max_depth} mm`);
  const mods = c.modules || [];
  if (mods.length) {
    const sum = mods.reduce((s, m) => s + (r(m.width) || 0), 0);
    if (Math.abs(sum - c.width) > (R.filler_max_mm || 150)) push('fit', `Modules total ${sum} mm ≠ wardrobe ${c.width} mm`, 'Adjust modules or add a filler');
    for (const m of mods) {
      if (r(m.width) < R.min_module_width) push('module', `Module ${r(m.width)} mm below minimum ${R.min_module_width}`, 'Merge or widen this module');
      if (r(m.width) > R.max_module_width) push('module', `Module ${r(m.width)} mm above maximum ${R.max_module_width}`, 'Split into two modules');
    }
  }
  if (c.type === 'hinged' && c.doors > 0) {
    const dw = c.width / c.doors;
    if (dw > R.max_hinged_door_width) push('door', `Hinged door width ${Math.round(dw)} mm exceeds ${R.max_hinged_door_width} mm`, `Use ${Math.ceil(c.width / R.max_hinged_door_width)} doors`);
  }
  return { ok: e.length === 0, errors: e };
}

/** Convenience: build a fully-suggested config from just size + type (top-ranked modules + door count). */
export function suggestConfig({ width, height, depth, type = 'sliding' } = {}, rules = DEFAULT_RULES) {
  const R = normRules(rules);
  const best = optimizeModules(width, R, 1)[0];
  const mods = best ? best.modules : [];
  const doors = doorCountFor(width, type, R);
  const config = newWardrobeConfig({
    width, height: height || R.standard_height, depth: depth || R.standard_depth, type, doors,
    modules: mods.map((w, i) => ({ id: 'M' + String(i + 1).padStart(2, '0'), width: w, hanging: 'double', shelves: 2, drawers: 0, accessories: [] })),
  });
  return { config, options: optimizeModules(width, R, 3) };
}
