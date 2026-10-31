/* =============================================================================
 * Neo Quote Builder [NEO-QUOTE-UX33] - the quote arithmetic. Pure (no React, no fetching).
 *
 * WHY A NEW FILE: the studios already price a design (priceWardrobe, estimate, priceDoor, estimateCustom, priceCategory). This file never
 * re-prices a design: it takes those priced lines AS THEY ARE ("auto" lines, unit price = the studio's own figure, ex-VAT) and layers the
 * commercial edits on top (units, extra lines, discounts, overrides, VAT basis, deposit). Money is integer fils (1 BHD = 1000 fils), the VAT
 * split is the app's one shared calculator `src/finance/vatCalc.js` (docs/vat/UNIFIED-RULE.md), the deposit split is `src/erp/quotePlan.js`.
 *
 * CANONICAL BASIS: every unit price / fixed discount in a line is stored EX-VAT (the studios' own basis). The VAT mode only decides the
 * customer-facing basis: 'exclusive' = Subtotal, Discount, Net, VAT, Total; 'inclusive' = the same total price, VAT shown as the part of it
 * (VAT = total x r / (1 + r), the statutory split), line amounts shown VAT-inclusive.
 *
 * LINE      { id, kind:'auto'|'extra', group, en, ar, qty, unit, unitPrice, autoPrice, perUnit, discount:{mode:'pct'|'amt',value}|null,
 *             override:{price, reason, by, at}|null, note? }
 * QUOTE     { units, lines[], discount:{mode,value}|null, totalOverride:{total, reason, by, at}|null, vat:{ratePct, mode}, depositPct }
 * ===========================================================================*/
import { calcDocument, calcLineFils, toFils, fromFils } from '../finance/vatCalc';
import { quoteSplit } from '../erp/quotePlan';

export const HARD_MAX_DISCOUNT_PCT = 50;           // the staff ceiling the app already uses (pricingMath.MAX_DISCOUNT_PCT)
export const DEFAULT_REP_DISCOUNT_PCT = 10;        // PricePlus: a rep is capped at the costing row's max_discount_pct, default 10
export const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** round(a * b / 100) in fils, half away from zero, integer-safe */
const pctOfFils = (fils, pct) => Math.round((fils * clampN(num(pct), 0, 100)) / 100);

/** discount spec -> fils, capped at `base` fils. {mode:'pct'|'amt', value} ; null / 0 -> 0 */
export function discountFils(d, baseFils) {
  if (!d || !(num(d.value) > 0)) return 0;
  const raw = d.mode === 'amt' ? toFils(d.value) : pctOfFils(baseFils, d.value);
  return clampN(raw, 0, Math.max(0, baseFils));
}

/** the effective unit price of a line (an override wins) */
export const effectiveUnit = (l) => (l && l.override && Number.isFinite(Number(l.override.price)) ? Number(l.override.price) : num(l && l.unitPrice));
/** the quantity that is billed: qty, times the number of identical units for a per-unit line */
export const effectiveQty = (l, units) => num(l && l.qty, 1) * (l && l.perUnit ? Math.max(1, Math.round(num(units, 1))) : 1);

/** largest-remainder split of `totalFils` over `weights` (>= 0): integers that sum to exactly totalFils */
export function spreadFils(totalFils, weights) {
  const w = weights.map((x) => Math.max(0, num(x)));
  const sum = w.reduce((s, x) => s + x, 0);
  if (!(sum > 0) || !weights.length) return weights.map(() => 0);
  const raw = w.map((x) => (totalFils * x) / sum);
  const out = raw.map((x) => Math.floor(x));
  let rest = totalFils - out.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) out[order[k].i] += 1;
  return out;
}

/**
 * Scale priced lines so that they add up to `targetNet` EXACTLY (BHD, 3 dp). Used for studios whose price has a hidden margin / markup step
 * (doors, categories): the margin is allocated pro rata to the visible lines instead of showing "our margin" to the customer. The studio's
 * net is the source of truth; nothing is re-priced. lines: [{amount}] -> same objects with amount adjusted.
 */
export function allocateToTotal(lines, targetNet) {
  const target = toFils(targetNet);
  const parts = spreadFils(target, lines.map((l) => toFils(l.amount)));
  return lines.map((l, i) => ({ ...l, amount: fromFils(parts[i]) }));
}

/** VAT rate percent as the quote holds it (blank -> the standard 10, an explicit 0 stays 0) */
function ratePctOf(v) { return v && v.ratePct !== undefined && v.ratePct !== null && v.ratePct !== '' ? num(v.ratePct, 10) : 10; }

/**
 * computeQuote(quote) -> {
 *   rows[{id, qty, unit, gross, discount, net, listNet, overridden}],          // BHD, ex-VAT canonical, after line discounts
 *   subtotal, discount, adjustment, net, vat, total, deposit, balance, depositPct, vatPct, vatMode,
 *   subtotalDisp / discountDisp (the same two figures on the customer basis: VAT-inclusive in 'inclusive' mode),
 *   listNet, reductionPct, lineDiscount, overallDiscount, flags{overrides[], totalOverride, discountPct}, errors[]
 * }
 * `subtotal` = sum of the line nets (after line discounts); `discount` = the overall discount; `adjustment` = the manual total override as
 * a net amount (negative = price taken down). exclusive: net = subtotal - discount + adjustment, vat = round(net x r), total = net + vat.
 * inclusive: the SAME total price, then vat = total x r / (1 + r) and net = total - vat.
 */
export function computeQuote(q) {
  const units = Math.max(1, Math.round(num(q && q.units, 1)));
  const lines = Array.isArray(q && q.lines) ? q.lines : [];
  const ratePct = ratePctOf(q && q.vat);
  const mode = q && q.vat && q.vat.mode === 'inclusive' ? 'inclusive' : 'exclusive';
  const errors = [];
  let lineDisc = 0; let listFils = 0;
  const rows = lines.map((l) => {
    const qty = effectiveQty(l, units);
    const unit = effectiveUnit(l);
    const g = calcLineFils({ qty, unitPrice: unit }).gross;
    const d = discountFils(l.discount, g);
    const net = g - d;
    const list = l.kind === 'auto' ? calcLineFils({ qty, unitPrice: num(l.autoPrice, unit) }).gross : g;
    lineDisc += d; listFils += list;
    const overridden = !!(l.override && Number.isFinite(Number(l.override.price)) && r3(l.override.price) !== r3(l.autoPrice !== undefined ? l.autoPrice : l.unitPrice));
    if (overridden && !String(l.override.reason || '').trim()) errors.push({ key: 'override_reason_required', id: l.id });
    return { id: l.id, qty, unit, gross: g, discount: d, net, listNet: list, overridden };
  });
  const subFils = rows.reduce((s, r) => s + r.net, 0);
  const overall = discountFils(q && q.discount, subFils);
  const baseFils = subFils - overall;
  // the unified calculator: one synthetic line (the lines are already rounded to fils), the document discount, the rate and the basis
  const gross = (f) => (mode === 'inclusive' ? Math.round((f * (100 + ratePct)) / 100) : f);
  const doc = calcDocument({ lines: [{ qty: 1, unitPrice: fromFils(gross(subFils)) }], discount: fromFils(gross(overall)), ratePct, mode });
  let net = doc.net; let vat = doc.vat; let total = doc.total;
  const to = q && q.totalOverride;
  let adjustment = 0;
  if (to && Number.isFinite(Number(to.total)) && toFils(to.total) !== toFils(total)) {
    if (!String(to.reason || '').trim()) errors.push({ key: 'total_override_reason_required' });
    const T = toFils(to.total);
    const vatF = Math.round((T * ratePct) / (100 + ratePct));       // the statutory inclusive split of the agreed total
    adjustment = fromFils(T - vatF) - net;
    total = fromFils(T); vat = fromFils(vatF); net = fromFils(T - vatF);
  }
  const split = quoteSplit({ total, depositPct: q && q.depositPct });
  const netFils = toFils(net);
  const reductionPct = listFils > 0 ? Math.max(0, Math.round(((listFils - netFils) / listFils) * 10000) / 100) : 0;
  if (!rows.length) errors.push({ key: 'no_lines' });
  else if (!(toFils(total) > 0)) errors.push({ key: 'zero_total' });
  const overrides = lines.map((l, i) => ({ l, r: rows[i] })).filter((x) => x.r.overridden)
    .map(({ l, r }) => ({ id: l.id, en: l.en, ar: l.ar, from: r3(l.autoPrice), to: r3(l.override.price), reason: String(l.override.reason || '').trim(), by: l.override.by || null, at: l.override.at || null }));
  return {
    rows: rows.map((r) => ({ id: r.id, qty: r.qty, unit: r.unit, gross: fromFils(r.gross), discount: fromFils(r.discount), net: fromFils(r.net), listNet: fromFils(r.listNet), overridden: r.overridden })),
    subtotal: fromFils(subFils), discount: fromFils(overall), subtotalDisp: doc.subtotal, discountDisp: doc.discount, adjustment: r3(adjustment), net: r3(net), vat: r3(vat), total: r3(total),
    deposit: split.deposit, balance: split.balance, depositPct: split.pct, vatPct: ratePct, vatMode: mode,
    listNet: fromFils(listFils), reductionPct, lineDiscount: fromFils(lineDisc), overallDiscount: fromFils(overall),
    flags: { overrides, totalOverride: to && adjustment !== 0 ? { total: r3(to.total), reason: String(to.reason || '').trim(), by: to.by || null, at: to.at || null, adjustment: r3(adjustment) } : null,
      discountPct: reductionPct },
    errors,
  };
}

/**
 * Customer-facing row amounts on the quote's VAT basis. exclusive: the net of each row. inclusive: each row's net x (1 + r), spread with
 * largest remainder so the rows add up to the inclusive subtotal exactly. Returns { amounts: {id: BHD}, unitPrices: {id: BHD} }.
 */
export function displayAmounts(quote, computed) {
  const c = computed || computeQuote(quote);
  const incl = c.vatMode === 'inclusive';
  const amounts = {}; const unitPrices = {};
  const nets = c.rows.map((r) => toFils(r.net));
  let out = nets;
  if (incl) out = spreadFils(Math.round((nets.reduce((s, x) => s + x, 0) * (100 + c.vatPct)) / 100), nets);
  c.rows.forEach((r, i) => { amounts[r.id] = fromFils(out[i]); unitPrices[r.id] = incl ? r3(r.unit * (1 + c.vatPct / 100)) : r3(r.unit); });
  return { amounts, unitPrices };
}

/** the three customer-facing line presentations: 'itemised' (every line), 'grouped' (one row per group), 'lump' (one row, the whole design) */
export function presentRows(quote, computed, presentation, groupNames) {
  const c = computed || computeQuote(quote);
  const { amounts } = displayAmounts(quote, c);
  const lines = quote.lines || [];
  const mk = (l, amount) => ({ id: l.id, en: l.en, ar: l.ar, qty: effectiveQty(l, quote.units), unit: l.unit || 'pc', amount, kind: l.kind });
  if (presentation === 'itemised' || !presentation) return lines.map((l) => mk(l, amounts[l.id] || 0));
  const auto = lines.filter((l) => l.kind === 'auto');
  const extras = lines.filter((l) => l.kind !== 'auto');
  const rowsOut = [];
  if (presentation === 'lump') {
    const sum = auto.reduce((s, l) => s + toFils(amounts[l.id] || 0), 0);
    if (auto.length) rowsOut.push({ id: 'lump', en: (groupNames && groupNames.lump && groupNames.lump[0]) || 'Design, supply and manufacture', ar: (groupNames && groupNames.lump && groupNames.lump[1]) || 'التصميم والتوريد والتصنيع', qty: 1, unit: 'lot', amount: fromFils(sum), kind: 'auto' });
  } else {
    const order = []; const by = {};
    auto.forEach((l) => { const g = l.group || 'other'; if (!by[g]) { by[g] = 0; order.push(g); } by[g] += toFils(amounts[l.id] || 0); });
    order.forEach((g) => { const nm = (groupNames && groupNames[g]) || [g.charAt(0).toUpperCase() + g.slice(1), g]; rowsOut.push({ id: 'g:' + g, en: nm[0], ar: nm[1], qty: 1, unit: 'lot', amount: fromFils(by[g]), kind: 'auto' }); });
  }
  extras.forEach((l) => rowsOut.push(mk(l, amounts[l.id] || 0)));
  return rowsOut;
}

/* ---- audit ---------------------------------------------------------------------------------------------------------- */
/**
 * The audit entries a save must write to qm_audit_log (entity 'quote'): one per manual price override, one for a total override, one when the
 * discount went above the rep cap (a manager override, like PricePlus's `discount_override`). Pure: the caller writes them.
 */
export function auditEntries(quote, computed, ctx) {
  const c = computed || computeQuote(quote);
  const cap = ctx && Number.isFinite(Number(ctx.capPct)) ? Number(ctx.capPct) : DEFAULT_REP_DISCOUNT_PCT;
  const out = [];
  c.flags.overrides.forEach((o) => out.push({ action: 'price_override', detail: `${o.en || o.id}: BD ${o.from.toFixed(3)} -> BD ${o.to.toFixed(3)} | reason: ${o.reason || '-'}` }));
  if (c.flags.totalOverride) out.push({ action: 'total_override', detail: `total set to BD ${c.flags.totalOverride.total.toFixed(3)} (adjustment BD ${c.flags.totalOverride.adjustment.toFixed(3)} ex-VAT) | reason: ${c.flags.totalOverride.reason || '-'}` });
  if (c.reductionPct > cap) out.push({ action: 'discount_override', detail: `${c.reductionPct}% off list (cap ${cap}%)` });
  return out;
}

/** the manual-override banner lines shown to approvers / in the quote notes (never printed on the customer document) */
export function overrideSummary(computed) {
  const c = computed;
  const out = [];
  (c.flags.overrides || []).forEach((o) => out.push(`${o.en || o.id}: ${o.from.toFixed(3)} -> ${o.to.toFixed(3)} (${o.reason})`));
  if (c.flags.totalOverride) out.push(`Total: BD ${c.flags.totalOverride.total.toFixed(3)} (${c.flags.totalOverride.reason})`);
  return out;
}
