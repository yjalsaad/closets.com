// checkout.js — client side of store checkout. Pure logic (no React, no App.js imports) so it is unit-tested.
//
// Guarantees (see docs/BACKEND-PROPOSALS.md for what only the server can add):
//   * "Order placed" is reported ONLY after the server confirmed it (a returned order id).
//   * A failed step surfaces as an error, keeps the cart and allows a retry — nothing is cleared or swallowed.
//   * A retry never repeats a step that already succeeded (progress is kept in sessionStorage per cart+details fingerprint),
//     so a double click, a flaky network or "try again" cannot create duplicate order rows.
//   * Every request of one attempt carries the same reference ([web-ref KEY] in the notes) so staff can see, and the
//     server can later enforce, idempotency.
//   * Items are sent as ids (+ quantity); name / category / price are advisory labels. p_total is advisory too: the
//     total the customer is shown after ordering is the one the SERVER returned, when it returns one.
import { str, num } from '../safety/sanitize';

const KEY = 'closets_checkout_attempt_v1';

export class CheckoutError extends Error {
  constructor(step, cause) { super('checkout_' + step); this.name = 'CheckoutError'; this.step = step; this.cause = cause; }
}

export const computeTotal = (cart) => (Array.isArray(cart) ? cart : []).reduce((s, i) => s + num(i && i.price, 0), 0);

/** ids / qty are the primary data; name, category, price are labels only. One row per unit, as before (server sums rows). */
export function buildOrderItems(cart) {
  return (Array.isArray(cart) ? cart : []).filter((i) => i && typeof i === 'object').map((i) => ({
    id: i.id != null ? String(i.id) : null, qty: 1,
    name: str(i.name || i.product_name), category: str(i.category), price: num(i.price, 0),
  }));
}

export function newKey() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* ignore */ }
  return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
export function fingerprint({ cart, form, months, payment }) {
  const items = buildOrderItems(cart).map((i) => i.id + ':' + i.price).join('|');
  return hash([items, form && form.name, form && form.email, form && form.phone, form && form.address, form && form.city, months || 0, payment || ''].join('~'));
}

const store = () => { try { return window.sessionStorage; } catch (e) { return null; } };
export function loadAttempt(fp) {
  try { const s = store(); const j = s && JSON.parse(s.getItem(KEY) || 'null'); if (j && j.fp === fp && Date.now() - j.ts < 6 * 3600e3) return j; } catch (e) { /* ignore */ }
  return { fp, key: newKey(), ts: Date.now(), steps: {} };
}
export function saveAttempt(a) { try { const s = store(); if (s) s.setItem(KEY, JSON.stringify(a)); } catch (e) { /* ignore */ } }
export function clearAttempt() { try { const s = store(); if (s) s.removeItem(KEY); } catch (e) { /* ignore */ } }

/** the total the server confirmed, if the RPC returned one */
export function serverTotal(res) {
  if (!res || typeof res !== 'object') return null;
  for (const k of ['total', 'total_bd', 'amount', 'total_amount', 'grand_total']) { const n = parseFloat(res[k]); if (Number.isFinite(n) && n >= 0) return n; }
  return null;
}

/**
 * placeOrder — runs the checkout steps with progress kept in `attempt`.
 * deps.rpc(fn, body, {signal}) -> parsed JSON (throws on HTTP/network error)
 * deps.onProgress?(attempt)
 * returns { ok, orderId, erpId, total, totalSource:'server'|null, redirectUrl, partial }
 */
export async function placeOrder({ deps, cart, form, user, months, monthly, payable, pointsUsed, loyalty, lang, signal }) {
  const payment = months > 0 ? 'Installments' : form.payment;
  const attempt = loadAttempt(fingerprint({ cart, form, months, payment }));
  const persist = () => { saveAttempt(attempt); if (deps.onProgress) deps.onProgress(attempt); };
  const isCard = form.payment === 'Card' && !(months > 0);
  const payLabel = months > 0 ? `Installments — ${months} months @ BHD ${Number(monthly || 0).toFixed(2)}/mo` : form.payment;
  const planNote = months > 0 ? `[Installment plan: ${months} months × BHD ${Number(monthly || 0).toFixed(2)}] ` : '';
  const notes = planNote + (form.notes || '') + ` [web-ref ${attempt.key}]`;
  const items = buildOrderItems(cart);

  // 1. audited ERP order intake
  if (!attempt.steps.erp) {
    let id;
    try {
      id = await deps.rpc('public_order_submit', {
        p_name: form.name, p_phone: form.phone || null, p_email: form.email || null,
        p_address: (form.address ? form.address + ', ' : '') + form.city,
        p_items: items, p_total: payable /* advisory */, p_payment: payLabel, p_notes: notes,
        p_customer_id: (user && user.id) || null,
      }, { signal });
    } catch (e) { throw new CheckoutError('order', e); }
    const erpId = id && typeof id === 'object' ? (id.id || id.order_id) : id;
    if (!erpId) throw new CheckoutError('order', new Error('no_order_id'));
    attempt.steps.erp = { id: String(erpId) }; persist();
  }

  // 2. store order = the record the payment page charges against (card) / the shop record (others)
  if (!attempt.steps.shop) {
    try {
      const so = await deps.rpc('store_checkout', {
        p_customer_id: (user && user.id) || null, p_customer_name: form.name, p_customer_email: form.email || null,
        p_customer_phone: form.phone || null, p_items: items, p_total: payable /* advisory */,
        p_installment_months: months > 0 ? months : null,
        p_address: { line: form.address, city: form.city }, p_notes: notes,
      }, { signal });
      if (!(so && so.ok && so.id)) throw new Error((so && so.error) || 'store_checkout_not_confirmed');
      attempt.steps.shop = { id: String(so.id), total: serverTotal(so) }; persist();
    } catch (e) {
      if (isCard) throw new CheckoutError('payment_link', e);          // card: without this id there is nothing to pay against
      attempt.partial = true; persist();                                // other methods: the ERP order is confirmed; record, do not hide
    }
  }

  const confirmed = (attempt.steps.shop && attempt.steps.shop.total != null) ? attempt.steps.shop.total : null;
  const awardBase = confirmed != null ? confirmed : payable;

  // 3. loyalty side effects: best-effort, at most once per attempt
  if (!attempt.steps.loyalty) {
    attempt.steps.loyalty = true; persist();
    const orderRef = (attempt.steps.shop && attempt.steps.shop.id) || attempt.steps.erp.id;
    if (pointsUsed > 0 && loyalty && loyalty.customer_no && deps.redeem) { try { await deps.redeem(loyalty.customer_no, pointsUsed, 'Store order', 'order:' + orderRef); } catch (e) { /* surfaced server-side; never blocks the order */ } }
    if (user && deps.award) { try { await deps.award(user, Math.floor(awardBase * 10), 'Website order'); } catch (e) { /* ignore */ } }
  }

  const orderId = attempt.steps.shop ? attempt.steps.shop.id : null;
  const redirectUrl = isCard && orderId ? '/pay.html?kind=store_order&ref=' + encodeURIComponent(orderId) + '&lang=' + (lang === 'ar' ? 'ar' : 'en') : null;
  const result = { ok: true, orderId, erpId: attempt.steps.erp.id, total: confirmed, totalSource: confirmed != null ? 'server' : null, redirectUrl, partial: !!attempt.partial };
  clearAttempt();
  return result;
}

const MSG = {
  order: { en: 'We could not place your order, so nothing was charged and your cart is still here. Please try again.', ar: 'تعذّر تسجيل طلبك، لذلك لم يتم خصم أي مبلغ وما زالت سلتك كما هي. يرجى المحاولة مرة أخرى.' },
  payment_link: { en: 'Your order was received, but we could not open the payment page. Please press "Place order" again; it will not create a second order.', ar: 'استلمنا طلبك لكن تعذّر فتح صفحة الدفع. اضغط «تأكيد الطلب» مرة أخرى، ولن يُنشأ طلب ثانٍ.' },
  offline: { en: 'You are offline. Your cart is kept; reconnect and try again.', ar: 'أنت غير متصل بالإنترنت. سلتك محفوظة، أعد الاتصال وحاول مرة أخرى.' },
  invalid: { en: 'Please check the highlighted details.', ar: 'يرجى مراجعة البيانات المحدَّدة.' },
  confirmedTotal: { en: 'Confirmed total', ar: 'الإجمالي المؤكَّد' },
  estimatedTotal: { en: 'Estimated total', ar: 'الإجمالي التقديري' },
  estimateNote: { en: 'The final amount is confirmed by our system when you place the order.', ar: 'يؤكّد نظامنا المبلغ النهائي عند تأكيد الطلب.' },
  orderRef: { en: 'Order reference', ar: 'رقم الطلب' },
};
export const checkoutMsg = (k, lang) => { const e = MSG[k] || MSG.order; return e[lang === 'ar' ? 'ar' : 'en']; };
export function failureMessage(err, lang) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return checkoutMsg('offline', lang);
  if (err && err.name === 'CheckoutError') return checkoutMsg(err.step === 'payment_link' ? 'payment_link' : 'order', lang);
  return checkoutMsg('order', lang);
}
