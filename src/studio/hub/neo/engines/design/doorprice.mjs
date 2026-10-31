// NeoFactory · Door / Shutter pricing engine (pure, deterministic).
// Composable with the carcase catalog: a unit's sell price = carcase price + door module.
// Door module = shutter area (m²) × per-type rate, scaled by the finish Group index,
// plus per-leaf hardware (sliding tracks/rollers), floored at a minimum charge.
// No I/O, no Date/random. Mirrors the app's finish-group model (price_index, fixed overrides).

const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

/** Shutter face area in m² for a unit front, times an optional coverage fraction (0..1). */
export function doorArea(widthMm, heightMm, coverage = 1) {
  const cov = coverage == null ? 1 : Number(coverage);
  return ((Number(widthMm) || 0) * (Number(heightMm) || 0)) / 1e6 * cov;
}

/**
 * Price one door/shutter module.
 *   type: { basis:'m2'|'leaf'|'flat', rate, by_group, fixed_rates:{groupNo:rate}, hardware_per_leaf, min_charge, coverage }
 *   ctx:  { widthMm, heightMm, leaves, groupNo, groupIndex }
 * groupIndex is the finish group's price_index (100 = default). A per-group fixed_rate
 * override (keyed by groupNo, like fixed_prices) wins and is used as-is (already group-specific).
 */
export function doorPrice(type, ctx = {}) {
  if (!type) return 0;
  const { widthMm = 0, heightMm = 0, leaves = 1, groupNo = null, groupIndex = 100 } = ctx;
  const L = Math.max(0, Math.round(Number(leaves) || 0));
  const area = doorArea(widthMm, heightMm, type.coverage);

  let rate = Number(type.rate) || 0;
  let scaleByGroup = !!type.by_group;
  if (groupNo != null && type.fixed_rates && type.fixed_rates[String(groupNo)] != null) {
    rate = Number(type.fixed_rates[String(groupNo)]) || 0;
    scaleByGroup = false; // explicit per-group rate — already tier-specific
  }

  let base;
  if (type.basis === 'flat') base = rate;
  else if (type.basis === 'leaf') base = rate * L;
  else base = rate * area; // 'm2'
  if (scaleByGroup) base = base * ((Number(groupIndex) || 100) / 100);

  const hardware = (Number(type.hardware_per_leaf) || 0) * L; // hardware is not tier-scaled
  const total = base + hardware;
  return r3(Math.max(total, Number(type.min_charge) || 0));
}

/** Carcase + door composed unit price. */
export function unitWithDoor(carcasePrice, type, ctx = {}) {
  return r3((Number(carcasePrice) || 0) + doorPrice(type, ctx));
}

/** Resolve a group's price_index from a groups list (fallback 100). */
export function groupIndexOf(groups, groupNo) {
  const g = (groups || []).find((x) => x.group_no === groupNo);
  return g ? (Number(g.price_index) || 100) : 100;
}
