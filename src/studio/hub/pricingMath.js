// src/pricingMath.js — the quote arithmetic, in one pure place.
//
// WHY THIS FILE EXISTS
// --------------------
// The ladder from line items to "Total" used to live inline in PricePlus.jsx,
// and the deposit split and the margin were each computed in three places with
// two different answers. That is how the printed quote came to disagree with
// the screen, and how a healthy quote came to be blocked as "below floor".
//
// Everything here is a pure function of numbers, so it can be asserted against
// worked examples (scripts/pricing-verify.mjs) rather than eyeballed — which
// matters because a pricing error does not look like a bug. It looks like a
// price.
//
// CURRENCY: Bahraini Dinar. THREE decimals, 1 BD = 1000 fils. Never two.

/** Round to BHD precision. Applied after every multiply, never before. */
export const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

export const VAT_RATE = 0.10;      // Bahrain VAT
export const MAX_DISCOUNT_PCT = 50; // staff ceiling

/** Clamp a user-entered discount to the sane range. */
export const clampDiscount = (d) => Math.min(Math.max(Number(d) || 0, 0), MAX_DISCOUNT_PCT);

/**
 * The full quote ladder.
 *
 * Order is the whole point: the discount applies to the GROSS subtotal, VAT to
 * the discounted (net) figure, and each step is re-rounded so the stored numbers
 * are exactly the numbers shown.
 *
 * Returns `subtotal` (gross, = the sum of the visible line items) separately
 * from `net`. Printing `net` under the heading "Subtotal" and then showing a
 * discount line below it deducts the discount twice on the face of the
 * document — which is precisely what the PDF used to do.
 */
export function quoteTotals({ cabinets = 0, accessories = 0, services = 0, discountPct = 0 } = {}) {
  const cab = r3(cabinets);
  const acc = r3(accessories);
  const svc = r3(services);
  const subtotal = r3(cab + acc + svc);
  const pct = clampDiscount(discountPct);
  const discount = r3(subtotal * (pct / 100));
  const net = r3(subtotal - discount);
  const vat = r3(net * VAT_RATE);
  const total = r3(net + vat);
  return { cabinets: cab, accessories: acc, services: svc, subtotal, discountPct: pct, discount, net, vat, total };
}

/**
 * Cabinet revenue after the discount, allocated PRO RATA.
 *
 * Margin is a cabinet-only measure here (accessory and service costs are not
 * tracked), so the denominator has to be the cabinets' share of the discounted
 * revenue — not `net - accessories - services`, which subtracts the discount
 * attributable to accessories and services a second time out of cabinet
 * revenue and understates margin whenever a discount is applied.
 */
export function cabinetNet({ cabinets, subtotal, net }) {
  const sub = r3(subtotal);
  if (!(sub > 0)) return 0;
  return r3(r3(cabinets) * (r3(net) / sub));
}

/**
 * True margin: (revenue − cost) / REVENUE. Returns null when it cannot be known.
 *
 * Distinct from markup, which is (price − cost) / COST. The costing panel's
 * `margin_pct` field is a MARKUP — 20 there yields a 16.7% margin — so the two
 * must never be compared directly. `marginFromMarkup` below converts.
 */
export function marginPct({ revenue, cost }) {
  const rev = r3(revenue);
  const c = r3(cost);
  if (!(rev > 0) || !(c > 0)) return null;
  return Math.round((1 - c / rev) * 100);
}

/** A markup on cost, expressed as the margin it actually realises. */
export const marginFromMarkup = (markupPct) => {
  const m = Math.max(0, Number(markupPct) || 0);
  return m > 0 ? (m / (100 + m)) * 100 : 0;
};

/** The markup needed to realise a target margin. The inverse of the above. */
export const markupForMargin = (targetMarginPct) => {
  const t = Math.max(0, Math.min(99.99, Number(targetMarginPct) || 0));
  return t > 0 ? (t / (100 - t)) * 100 : 0;
};

/**
 * Resolve the deposit split.
 *
 * The server price engine is the source of truth so that the customer never
 * sees a client-guessed split — EXCEPT when staff have explicitly negotiated a
 * percentage, in which case the negotiated figure is what the customer agreed
 * to and must be what they are charged. The returned `pct` is derived from the
 * resolved amount, never from the input, so the label on a document can never
 * contradict the dinars printed beside it.
 */
export function depositSplit({ total, staffPct, engineDepositBd, overridden = false }) {
  const g = r3(total);
  const engineUsable = !overridden && engineDepositBd != null && Number.isFinite(Number(engineDepositBd));
  const amount = engineUsable
    ? r3(Number(engineDepositBd))
    : r3(g * (Math.min(100, Math.max(0, Number(staffPct) || 0)) / 100));
  const balance = r3(g - amount);
  const pct = g > 0 ? Math.round((amount / g) * 100) : Math.min(100, Math.max(0, Number(staffPct) || 0));
  return { amount, balance, pct, fromEngine: !!engineUsable };
}

export default { r3, quoteTotals, cabinetNet, marginPct, marginFromMarkup, markupForMargin, depositSplit, clampDiscount, VAT_RATE, MAX_DISCOUNT_PCT };
