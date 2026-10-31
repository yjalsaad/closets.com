// Standard Wardrobe · Pricing engine (pure, deterministic). AI never prices — this does.
// Hybrid method: carcase (finish-adjusted) + door module + interior + accessories + hardware
// + services − discount → VAT → total → deposit/balance, with cost→margin & rule checks.
// Reads the same WardrobeConfiguration as every other subsystem (single source of truth).

import { doorPrice } from '../design/doorprice.mjs';
import { normRules, DEFAULT_RULES } from './config.mjs';

const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

/**
 * priceWardrobe(config, ctx) → full price breakdown.
 * ctx: {
 *   rules, groupIndex, doorType (a pp_door_types row), carcaseBase, finishMultiplier,
 *   interior, accessories:[{sell|price, cost, qty}], hardware, services:[{price, cost}],
 *   costTotal, discountPct, role
 * }
 * All money is deterministic and rounded to 3 dp (BD fils).
 */
export function priceWardrobe(config, ctx = {}) {
  const R = normRules(ctx.rules || DEFAULT_RULES);
  const c = config || {};
  const {
    groupIndex = 100, doorType = null, carcaseBase = 0, finishMultiplier = 1,
    interior = 0, accessories = [], hardware = 0, services = [],
    discountPct = 0, role = 'sales',
  } = ctx;

  const lines = [];
  const add = (key, label, sell, cost) => { if (sell || cost) lines.push({ key, label, sell: r3(sell), cost: r3(cost || 0) }); };

  // 1) Carcase (finish multiplier applies to the box)
  const carcase = r3((Number(carcaseBase) || 0) * (Number(finishMultiplier) || 1));
  add('carcase', 'Wardrobe carcase', carcase, ctx.carcaseCost);

  // 2) Door / shutter module (uses the door engine; leaves = config.doors)
  const leaves = Number(c.doors) || 0;
  const doorSell = doorType ? doorPrice(doorType, { widthMm: c.width, heightMm: c.height, leaves, groupIndex, groupNo: ctx.groupNo }) : 0;
  add('door', 'Door / shutter' + (doorType && doorType.name ? ' — ' + doorType.name : ''), doorSell, ctx.doorCost);

  // 3) Interior configuration (shelves / hanging / drawers) — a precomputed total
  add('interior', 'Internal configuration', interior, ctx.interiorCost);

  // 3b) Glass doors [NEO-CLOSETS-UX24]: config.glass = { style:'glass'|'smoked', divisions } on a wardrobe with doors. Glass area = the door face (width x height, m2) x the glass rate,
  //     smoked glass adds its extra per m2, every division is one glazing bar across the whole width (m) x the bar rate. Rates come from wardrobe_rules (fallbacks below, like the interior rates).
  const gl = c.glass && c.type !== 'open' ? c.glass : null;
  if (gl && (gl.style === 'glass' || gl.style === 'smoked')) {
    const area = (Number(c.width) || 0) * (Number(c.height) || 0) / 1e6;
    const num = (v, d) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
    const div = Math.max(0, Math.round(Number(gl.divisions) || 0));
    const sell = area * num(R.glass_rate_m2, 25) + (gl.style === 'smoked' ? area * num(R.smoked_extra_m2, 12) : 0) + div * ((Number(c.width) || 0) / 1000) * num(R.division_rate_m, 6);
    add('glass', gl.style === 'smoked' ? 'Smoked glass doors' + (div ? ' — ' + div + ' division' + (div > 1 ? 's' : '') : '') : 'Glass doors' + (div ? ' — ' + div + ' division' + (div > 1 ? 's' : '') : ''), sell, ctx.glassCost);
  }

  // 4) Accessories
  const accSell = (accessories || []).reduce((s, a) => s + (Number(a.sell != null ? a.sell : a.price) || 0) * (Number(a.qty) || 1), 0);
  const accCost = (accessories || []).reduce((s, a) => s + (Number(a.cost) || 0) * (Number(a.qty) || 1), 0);
  add('accessories', 'Accessories', accSell, accCost);

  // 5) Hardware (handles / soft-close / tracks not already in the door module)
  add('hardware', 'Hardware', hardware, ctx.hardwareCost);

  // 6) Services (installation / delivery / measurement) — kept separate from product
  const svcSell = (services || []).reduce((s, x) => s + (Number(x.price) || 0), 0);
  const svcCost = (services || []).reduce((s, x) => s + (Number(x.cost) || 0), 0);
  add('services', 'Services', svcSell, svcCost);

  const subtotal = r3(lines.reduce((s, l) => s + l.sell, 0));
  const discountPctN = Number(discountPct) || 0;
  const discount = r3(subtotal * discountPctN / 100);
  const taxable = r3(subtotal - discount);
  const vatPct = R.vat_pct == null ? 10 : Number(R.vat_pct);
  const vat = r3(taxable * vatPct / 100);
  const total = r3(taxable + vat);
  const depositPct = R.deposit_pct == null ? 50 : Number(R.deposit_pct);
  const deposit = r3(total * depositPct / 100);
  const balance = r3(total - deposit);

  // Cost & margin (cost = explicit costTotal, else sum of line costs)
  const lineCost = r3(lines.reduce((s, l) => s + (l.cost || 0), 0));
  const cost = r3(ctx.costTotal != null ? ctx.costTotal : lineCost);
  const margin = r3(taxable - cost);
  const marginPct = taxable ? Math.round((margin / taxable) * 1000) / 10 : null;
  const marginFloor = R.margin_floor_pct == null ? 15 : Number(R.margin_floor_pct);
  const belowFloor = cost > 0 && marginPct != null && marginPct < marginFloor;

  const discMax = (R.discount_max || {})[role];
  const discountOver = discMax != null && discountPctN > Number(discMax);

  return {
    lines, subtotal, discountPct: discountPctN, discount, taxable, vatPct, vat, total,
    depositPct, deposit, balance, cost, margin, marginPct, marginFloor, belowFloor,
    discMax: discMax == null ? null : Number(discMax), discountOver,
  };
}

/** "Why this price?" — the additive breakdown lines (sell side) for sales transparency. */
export function priceExplain(priced) {
  return (priced && priced.lines ? priced.lines : []).filter((l) => l.sell).map((l) => ({ label: l.label, amount: l.sell }));
}
