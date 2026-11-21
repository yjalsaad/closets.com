// account/api.js with faked responses: session twin vs legacy params, fallback, legacy switch-off, minimal stored profile
jest.mock('../studio/customerAuth', () => {
  const state = { session: null, rpcImpl: null, calls: [] };
  return {
    __state: state,
    getSession: () => state.session,
    isLinked: () => !!state.session,
    claims: () => ({ customer_id: 'cust-from-token' }),
    // plain function (CRA's jest config uses resetMocks, which would wipe a jest.fn implementation)
    rpc: (fn, body) => { state.calls.push([fn, body]); return state.rpcImpl(fn, body); },
  };
});
const auth = require('../studio/customerAuth');
const acct = require('../account/api');

const calls = [];
beforeEach(() => {
  calls.length = 0; auth.__state.session = null; auth.__state.rpcImpl = null; auth.__state.calls = []; acct.setLegacyEnabled(true); localStorage.clear();
  global.fetch = jest.fn(async (url, init) => { const fn = String(url).split('/rpc/')[1]; calls.push({ fn, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => (fn === 'my_orders' ? [{ id: 1 }] : { ok: true, points: 5 }) }; });
});
const legacyUser = { id: 'u-1', email: 'a@b.com', phone: '36123456', name: 'Amina' };

describe('legacy identity (no session): unchanged behaviour', () => {
  test('my_orders keeps the old parameters', async () => {
    const r = await acct.myOrders(legacyUser);
    expect(r).toEqual([{ id: 1 }]);
    expect(calls[0]).toEqual({ fn: 'my_orders', body: { p_email: 'a@b.com', p_customer_id: 'u-1' } });
  });
  test('all reads map to the same legacy RPCs', async () => {
    await acct.myInvoices(legacyUser); await acct.rewards(legacyUser); await acct.loyaltyBalance(legacyUser); await acct.bookingsList(legacyUser); await acct.savedDesigns(legacyUser);
    expect(calls.map((c) => c.fn)).toEqual(['my_invoices', 'customer_rewards_get', 'loyalty_balance', 'customer_bookings_list', 'my_saved_designs']);
    expect(calls[2].body).toEqual({ p_phone: '36123456' });
  });
  test('signed-out: nothing is called', async () => {
    await expect(acct.myOrders(null)).rejects.toMatchObject({ code: 'not_signed_in' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('loyalty needs the profile\'s own phone (never a typed one)', async () => {
    await expect(acct.loyaltyBalance({ id: 'x', email: 'a@b.com' })).rejects.toMatchObject({ code: 'not_signed_in' });
  });
});

describe('signed session: token-bound twins, no raw identity sent', () => {
  beforeEach(() => { auth.__state.session = { access_token: 't', user: { email: 'tok@b.com', name: 'T' } }; auth.__state.rpcImpl = async () => []; });
  test('uses cp_* with an empty body and never touches the anon legacy endpoint', async () => {
    await acct.myOrders(legacyUser); await acct.rewards(legacyUser); await acct.loyaltyBalance(legacyUser); await acct.savedDesigns(legacyUser);
    expect(auth.__state.calls.map((c) => c[0])).toEqual(['cp_orders_list', 'cp_rewards_get', 'cp_loyalty_balance', 'cp_saved_designs']);
    auth.__state.calls.forEach((c) => expect(c[1]).toEqual({}));
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('identity comes from the token, not from localStorage', () => {
    localStorage.setItem('closets_user', JSON.stringify({ id: 'ATTACKER', email: 'victim@x.com' }));
    expect(acct.identity(acct.loadUser())).toMatchObject({ mode: 'session', id: 'cust-from-token', email: 'tok@b.com', phone: null });
  });
  test('profile / photo writes use the twin without an id', async () => {
    await acct.updateProfile(legacyUser, { name: 'N', phone: '3' }); await acct.setCardPhoto(legacyUser, 'https://x/y.png');
    expect(auth.__state.calls[0]).toEqual(['cp_update_profile', { p_display_name: 'N', p_phone: '3' }]);
    expect(auth.__state.calls[1]).toEqual(['cp_card_set_photo', { p_photo_url: 'https://x/y.png' }]);
  });
  test('referral count adapts the object response to a number', async () => {
    auth.__state.rpcImpl = async () => ({ ok: true, count: 4 });
    expect(await acct.referralCount(legacyUser)).toBe(4);
  });
  test('an authentication failure falls back to legacy while legacy is enabled', async () => {
    auth.__state.rpcImpl = async () => { throw Object.assign(new Error('jwt expired'), { status: 401 }); };
    const r = await acct.myOrders(legacyUser);
    expect(r).toEqual([{ id: 1 }]);
    expect(calls[0].fn).toBe('my_orders');
  });
  test('...and surfaces the error once legacy is switched off (backend enforcing sessions)', async () => {
    acct.setLegacyEnabled(false);
    auth.__state.rpcImpl = async () => { throw Object.assign(new Error('jwt expired'), { status: 401 }); };
    await expect(acct.myOrders(legacyUser)).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('a non-auth error (server 500) is not masked by a legacy retry', async () => {
    auth.__state.rpcImpl = async () => { throw Object.assign(new Error('boom'), { status: 500 }); };
    await expect(acct.myOrders(legacyUser)).rejects.toMatchObject({ status: 500 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('legacy off + no session', () => {
  test('is refused client-side', async () => {
    acct.setLegacyEnabled(false);
    await expect(acct.myOrders(legacyUser)).rejects.toMatchObject({ code: 'not_signed_in' });
    await expect(acct.redeemPoints('CUS1', 10, 'r', 'ref')).rejects.toMatchObject({ code: 'not_signed_in' });
  });
});

describe('stored profile is minimal', () => {
  test('persistUser drops everything the UI and legacy RPCs do not need', () => {
    const stored = acct.persistUser({ id: 'u1', name: 'A', email: 'a@b.com', phone: '3', tier: 'Gold', points: 5, referral_code: 'R', role: 'admin', password_hash: 'x', token: 'abc', nested: { a: 1 } });
    expect(stored).toEqual({ id: 'u1', name: 'A', email: 'a@b.com', phone: '3', tier: 'Gold', points: 5, referral_code: 'R' });
    expect(JSON.parse(localStorage.getItem('closets_user'))).toEqual(stored);
    expect(acct.loadUser()).toEqual(stored);
    acct.clearUser(); expect(acct.loadUser()).toBeNull();
  });
  test('a previously stored fat object is reduced on load', () => {
    localStorage.setItem('closets_user', JSON.stringify({ id: 'u1', email: 'a@b.com', role: 'admin', token: 'x' }));
    expect(acct.loadUser()).toEqual({ id: 'u1', email: 'a@b.com' });
  });
  test('login response is sent through persistUser by callers; login/register call the legacy RPC with the e-mail given', async () => {
    await acct.login('a@b.com', 'pw');
    expect(calls[0]).toEqual({ fn: 'account_login', body: { p_email: 'a@b.com', p_password: 'pw' } });
  });
});
