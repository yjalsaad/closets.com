// src/finance/vatCalc.js  [VAT-UI 2026-10-24]
// Shared decimal-safe VAT calculator. Pure; amounts are integer fils (1 BHD = 1000 fils) internally, so no float
// drift. It follows the SAME rule as invoiceTotals in finWrites.js:
//   - every line is rounded to fils;  - the document discount is capped at the subtotal;
//   - exclusive: VAT = round(net x rate) ONCE per document;
//   - inclusive: net = round(gross / (1 + rate)), VAT = gross - net.
// A blank rate means the Bahrain standard rate (10 %); an explicit 0 stays 0 (never defaults to 10).
// Rounding is half away from zero. Not wired into any screen yet.

export const STANDARD_RATE_PCT = 10;

// Parse a decimal (number or decimal string) into an integer scaled by 10^scale, rounding half away from zero.
// Works on the decimal digits, not by float multiplication. Non-numeric input gives NaN.
function scaled(value, scale) {
  if (value === null || value === undefined || value === '') return NaN;
  let s;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return NaN;
    s = /e/i.test(String(value)) ? value.toFixed(12) : String(value);
  } else {
    s = String(value).trim().replace(/,/g, '');
  }
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m || (m[2] === '' && !m[3])) return NaN;
  const intPart = m[2] || '0';
  const frac = m[3] || '';
  const kept = (frac + '0'.repeat(scale)).slice(0, scale);
  let n = Number(intPart + kept);
  if (frac.length > scale && frac.charCodeAt(scale) >= 53) n += 1; // next digit >= 5 rounds the magnitude up
  return m[1] === '-' ? -n : n;
}

// round(a / b) half away from zero, exact (BigInt intermediates so large products cannot lose precision).
function divRound(a, b) {
  const A = BigInt(a); const B = BigInt(b);
  const neg = (A < 0n) !== (B < 0n);
  const absA = A < 0n ? -A : A; const absB = B < 0n ? -B : B;
  const q = (absA * 2n + absB) / (absB * 2n);
  return Number(neg ? -q : q);
}

/** BHD amount (number or decimal string) -> integer fils. Invalid -> 0. */
export function toFils(amount) {
  const n = scaled(amount, 3);
  return Number.isFinite(n) ? n : 0;
}
/** integer fils -> BHD number with at most 3 decimals. */
export function fromFils(fils) {
  const f = Math.round(Number(fils) || 0);
  return Number((f / 1000).toFixed(3));
}

/** One line in fils: round(qty x unitPrice), less a line discount capped at the line gross. */
export function calcLineFils({ qty, unitPrice, discount } = {}) {
  const q = scaled(qty, 6);
  const u = scaled(unitPrice, 6); // unit price keeps up to 6 decimals; only the LINE is rounded to fils
  const gross = Number.isFinite(q) && Number.isFinite(u) ? divRound(BigInt(q) * BigInt(u), 1000000000) : 0;
  const d = Math.max(0, Math.min(toFils(discount), Math.max(gross, 0)));
  return { gross, discount: d, net: gross - d };
}
/** One line in BHD: { gross, discount, net }. */
export function calcLine(line) {
  const r = calcLineFils(line);
  return { gross: fromFils(r.gross), discount: fromFils(r.discount), net: fromFils(r.net) };
}

// Rate is held as percent x 10^4 (10 -> 100000), so 5.5 % stays exact.
function resolveRate(ratePct) {
  if (ratePct === '' || ratePct === null || ratePct === undefined) return { s: STANDARD_RATE_PCT * 10000, pct: STANDARD_RATE_PCT, ok: true };
  const s = scaled(ratePct, 4);
  const ok = Number.isFinite(s) && s >= 0 && s <= 1000000;
  return { s: ok ? s : 0, pct: ok ? s / 10000 : 0, ok };
}

/**
 * calcDocument({ lines:[{qty,unitPrice,discount?}], discount, ratePct, mode:'exclusive'|'inclusive' })
 *  -> { subtotal, discount, net, vat, total, mode, ratePct, rateOk }   (money in BHD, 3 decimals)
 */
export function calcDocument({ lines, discount, ratePct, mode } = {}) {
  const m = mode === 'inclusive' ? 'inclusive' : 'exclusive';
  const list = Array.isArray(lines) ? lines : [];
  const sub = list.reduce((s, l) => s + calcLineFils(l).net, 0);
  const disc = Math.max(0, Math.min(toFils(discount), Math.max(sub, 0)));
  const base = sub - disc;
  const rate = resolveRate(ratePct);
  const ONE = 1000000; // 100 % x 10^4
  let net; let vat; let total;
  if (m === 'inclusive') {
    total = base;
    net = divRound(BigInt(base) * BigInt(ONE), ONE + rate.s);
    vat = total - net;
  } else {
    net = base;
    vat = divRound(BigInt(base) * BigInt(rate.s), ONE);
    total = net + vat;
  }
  return { subtotal: fromFils(sub), discount: fromFils(disc), net: fromFils(net), vat: fromFils(vat), total: fromFils(total), mode: m, ratePct: rate.pct, rateOk: rate.ok };
}
