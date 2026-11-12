import { placeOrder, buildOrderItems, fingerprint, serverTotal, computeTotal, CheckoutError, failureMessage, clearAttempt } from '../checkout/checkout';

const cart = [{ id: 'p1', name: 'Oak wardrobe', category: 'Wardrobes', price: 400, image_url: 'x', secret: 'do-not-send' }, { id: 'p1', name: 'Oak wardrobe', category: 'Wardrobes', price: 400 }, { id: 'p2', name: { evil: 1 }, price: 'abc' }];
const form = { name: 'Amina', email: 'a@b.com', phone: '36123456', address: 'Road 1', city: 'Manama', payment: 'Card', notes: '' };
const user = { id: 'u1', name: 'Amina' };

function deps(over = {}) {
  const calls = [];
  const rpc = jest.fn(async (fn, body) => {
    calls.push(fn);
    if (over[fn]) return over[fn](body);
    if (fn === 'public_order_submit') return 'SO-1';
    if (fn === 'store_checkout') return { ok: true, id: 'ORD-9', total: 805.5 };
    return null;
  });
  return { rpc, calls, award: jest.fn().mockResolvedValue(null), redeem: jest.fn().mockResolvedValue(null) };
}
const run = (d, extra = {}) => placeOrder({ deps: d, cart, form, user, months: 0, monthly: 0, payable: 800, pointsUsed: 0, loyalty: null, lang: 'en', ...extra });

beforeEach(() => { sessionStorage.clear(); clearAttempt(); });

describe('items and totals', () => {
  test('items are sent as ids + qty with advisory labels only; hostile values are coerced', () => {
    const items = buildOrderItems(cart);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ id: 'p1', qty: 1, name: 'Oak wardrobe', category: 'Wardrobes', price: 400 });
    expect(items[0].secret).toBeUndefined(); expect(items[0].image_url).toBeUndefined();
    expect(items[2]).toMatchObject({ id: 'p2', name: '', price: 0 });
  });
  test('client total ignores non-numeric prices (display only)', () => { expect(computeTotal(cart)).toBe(800); });
  test('server total is read from the RPC response when present', () => {
    expect(serverTotal({ ok: true, total: '812.500' })).toBe(812.5);
    expect(serverTotal({ ok: true })).toBeNull();
  });
});

describe('failure path: surfaced, cart kept, retry allowed, no duplicates', () => {
  test('store_checkout failure on a card order throws (no success), and a retry only repeats the failed step', async () => {
    let fail = true;
    const d = deps({ store_checkout: async () => { if (fail) throw new Error('boom'); return { ok: true, id: 'ORD-9', total: 800 }; } });
    await expect(run(d)).rejects.toBeInstanceOf(CheckoutError);
    expect(d.calls).toEqual(['public_order_submit', 'store_checkout']);
    expect(d.award).not.toHaveBeenCalled();            // no loyalty side effects without a confirmed order
    fail = false;
    const res = await run(d);                          // retry
    expect(res.ok).toBe(true);
    expect(d.calls).toEqual(['public_order_submit', 'store_checkout', 'store_checkout']);   // public_order_submit NOT repeated
    expect(res.redirectUrl).toBe('/pay.html?kind=store_order&ref=ORD-9&lang=en');
  });
  test('an HTTP-200 response without ok/id is NOT a success', async () => {
    const d = deps({ store_checkout: async () => ({ ok: false, error: 'nope' }) });
    await expect(run(d)).rejects.toMatchObject({ name: 'CheckoutError', step: 'payment_link' });
  });
  test('public_order_submit failure: nothing recorded, store_checkout never called', async () => {
    const d = deps({ public_order_submit: async () => { throw new Error('500'); } });
    await expect(run(d)).rejects.toMatchObject({ step: 'order' });
    expect(d.calls).toEqual(['public_order_submit']);
  });
  test('public_order_submit returning no id is a failure', async () => {
    const d = deps({ public_order_submit: async () => null });
    await expect(run(d)).rejects.toMatchObject({ step: 'order' });
  });
  test('non-card orders: the confirmed ERP order is success even if the shop record failed (flagged partial, not hidden)', async () => {
    const d = deps({ store_checkout: async () => { throw new Error('boom'); } });
    const res = await run(d, { form: { ...form, payment: 'Cash' } });
    expect(res).toMatchObject({ ok: true, partial: true, redirectUrl: null, orderId: null });
  });
  test('every request of one attempt carries the same reference, and p_total is advisory', async () => {
    const bodies = [];
    const d = deps(); const orig = d.rpc;
    d.rpc = jest.fn(async (fn, b) => { bodies.push(b); return orig(fn, b); });
    await run(d);
    const refs = bodies.map((b) => /\[web-ref ([^\]]+)\]/.exec(b.p_notes)[1]);
    expect(refs[0]).toBe(refs[1]);
    expect(bodies[0].p_items[0].id).toBe('p1');
  });
  test('the total shown afterwards is the SERVER-confirmed one', async () => {
    const res = await run(deps());
    expect(res.total).toBe(805.5); expect(res.totalSource).toBe('server');
  });
  test('points are awarded once, from the confirmed total, only after success', async () => {
    const d = deps();
    await run(d);
    expect(d.award).toHaveBeenCalledTimes(1);
    expect(d.award).toHaveBeenCalledWith(user, 8055, 'Website order');
  });
  test('a different cart/details start a fresh attempt (no stale reuse)', () => {
    expect(fingerprint({ cart, form, months: 0, payment: 'Card' })).not.toBe(fingerprint({ cart: cart.slice(1), form, months: 0, payment: 'Card' }));
  });
  test('failure messages are bilingual and honest', () => {
    expect(failureMessage(new CheckoutError('order', new Error('x')), 'en')).toMatch(/nothing was charged/i);
    expect(failureMessage(new CheckoutError('payment_link', new Error('x')), 'en')).toMatch(/will not create a second order/i);
    expect(failureMessage(new CheckoutError('order', new Error('x')), 'ar')).toMatch(/[؀-ۿ]/);
  });
});
