// account/api.js — the ONLY place the public website calls account / loyalty / order RPCs.
//
// Why one module: today these RPCs take an e-mail / phone / customer id that the browser asserts
// (legacy identity, see docs/BACKEND-PROPOSALS.md). When the backend starts requiring a signed customer
// session, only THIS file changes. How it works now:
//   * signed session present (Supabase Auth token linked to a customer, src/studio/customerAuth.js)
//       -> call the token-bound cp_* twin; NO e-mail / phone / id is sent (the server reads them from the token)
//   * no session -> call the legacy RPC with the identity of the localStorage `closets_user`, exactly as before
//       (only while LEGACY is enabled; `REACT_APP_ACCOUNT_LEGACY=0` or setLegacyEnabled(false) turns it off)
// A session call that fails for an authentication reason falls back to legacy while legacy is enabled.
import { SUPA_URL, SUPA_KEY } from '../studio/hub/supaConfig';
import * as auth from '../studio/customerAuth';

const USER_KEY = 'closets_user';
let legacyEnabled = process.env.REACT_APP_ACCOUNT_LEGACY !== '0';
export const setLegacyEnabled = (v) => { legacyEnabled = !!v; };
export const isLegacyEnabled = () => legacyEnabled;

// ── low-level: anon REST call (kept identical to App.js `api` so behaviour does not change) ──
async function anon(fn, body, { prefer, signal } = {}) {
  let r;
  try {
    r = await fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST', signal,
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', Prefer: prefer || 'return=representation' },
      body: JSON.stringify(body || {}),
    });
  } catch (e) { e.__kind = 'network'; throw e; }
  let j = null; try { j = await r.json(); } catch (e) { /* empty */ }
  if (!r.ok) {
    const err = new Error((j && (j.message || j.hint || j.details)) || ('request failed (' + r.status + ')'));
    err.status = r.status; err.code = j && j.code; throw err;
  }
  return j;
}

export function hasSession() {
  try { return !!auth.getSession() && auth.isLinked(); } catch (e) { return false; }
}
const authish = (e) => !!e && (e.code === 'not_signed_in' || e.code === 'not_linked' || e.status === 401 || e.status === 403 || e.status === 404 || e.code === 'PGRST202' || /not_signed_in|not_linked|jwt/i.test(String(e.message || '')));

/** { mode, id, name, email, phone } — identity from the session token when there is one, else from the stored profile */
export function identity(user) {
  if (hasSession()) {
    const s = auth.getSession(); const c = auth.claims(s);
    return { mode: 'session', id: c.customer_id || null, name: (s.user && s.user.name) || (user && user.name) || '', email: (s.user && s.user.email) || null, phone: null };
  }
  if (user && (user.id || user.email)) return { mode: 'legacy', id: user.id != null ? String(user.id) : null, name: user.name || '', email: user.email || null, phone: user.phone || null };
  return { mode: 'none', id: null, name: '', email: null, phone: null };
}

// cp  : [fn, body]  token-bound twin     legacy: [fn, body] | null  (null = not available without a session)
async function dual({ cp, legacy, adapt = (x) => x, user, signal }) {
  if (hasSession() && cp) {
    try { return adapt(await auth.rpc(cp[0], cp[1] || {})); }
    catch (e) { if (!(legacyEnabled && legacy && authish(e))) throw e; }
  }
  if (!legacy || !legacyEnabled) { const e = new Error('not_signed_in'); e.code = 'not_signed_in'; throw e; }
  const id = identity(user);
  if (id.mode === 'none') { const e = new Error('not_signed_in'); e.code = 'not_signed_in'; throw e; }
  return anon(legacy[0], typeof legacy[1] === 'function' ? legacy[1](id) : legacy[1], { signal });
}
const asArray = (r) => (Array.isArray(r) ? r : r && Array.isArray(r.rows) ? r.rows : []);

// ── reads ───────────────────────────────────────────────────────────────
export const myOrders = (user) => dual({ user, cp: ['cp_orders_list', {}], adapt: asArray, legacy: ['my_orders', (i) => ({ p_email: i.email, p_customer_id: i.id })] });
export const myInvoices = (user) => dual({ user, cp: ['cp_invoices_list', {}], adapt: asArray, legacy: ['my_invoices', (i) => ({ p_email: i.email })] });
export const rewards = (user) => dual({ user, cp: ['cp_rewards_get', {}], legacy: ['customer_rewards_get', (i) => ({ p_customer_id: String(i.id) })] });
export const loyaltyBalance = async (user) => {
  // legacy identity for loyalty is the profile's OWN phone; without one there is nothing to look up
  if (!hasSession() && !(user && user.phone)) throw Object.assign(new Error('not_signed_in'), { code: 'not_signed_in' });
  return dual({ user, cp: ['cp_loyalty_balance', {}], legacy: ['loyalty_balance', (i) => ({ p_phone: i.phone })] });
};
export const bookingsList = (user) => dual({ user, cp: ['cp_bookings_list', {}], adapt: asArray, legacy: ['customer_bookings_list', (i) => ({ p_customer_id: String(i.id) })] });
export const savedDesigns = (user) => dual({ user, cp: ['cp_saved_designs', {}], adapt: asArray, legacy: ['my_saved_designs', (i) => ({ p_customer_id: String(i.id) })] });
const toCount = (r) => (typeof r === 'number' ? r : Number(r && (r.count ?? r.referrals ?? r.referral_count)) || 0);
export const referralCount = (user) => dual({ user, cp: ['cp_referral_get', {}], adapt: toCount, legacy: ['my_referral_count', (i) => ({ p_customer_id: String(i.id) })] });

// ── writes ──────────────────────────────────────────────────────────────
export const updateProfile = (user, { name, phone }) => dual({
  user, cp: ['cp_update_profile', { p_display_name: name, p_phone: phone }],
  legacy: ['customer_update_profile', (i) => ({ p_id: String(i.id), p_display_name: name, p_phone: phone, p_email: null, p_company: null, p_avatar: null, p_notif: null })],
});
export const setCardPhoto = (user, photoUrl) => dual({
  user, cp: ['cp_card_set_photo', { p_photo_url: photoUrl }],
  legacy: ['customer_card_set_photo', (i) => ({ p_customer_id: i.id, p_photo_url: photoUrl })],
});
/** points awarded after a confirmed order. Legacy only: there is no token-bound twin, so with a session this is skipped
 *  (the server awards points itself once it computes the order, see BACKEND-PROPOSALS). */
export const awardPoints = (user, points, reason) => dual({
  user, cp: null, legacy: ['customer_points_award', (i) => ({ p_customer_id: String(i.id), p_points: points, p_reason: reason })],
});
export const redeemPoints = (customerNo, points, reason, ref) => (legacyEnabled
  ? anon('loyalty_redeem', { p_customer_no: customerNo, p_points: points, p_reason: reason, p_ref: ref })
  : Promise.reject(Object.assign(new Error('not_signed_in'), { code: 'not_signed_in' })));

// ── public / pre-session (no identity involved) ──────────────────────────
export const referralLeaderboard = () => anon('referral_leaderboard', {});
export const cardOwnerSlug = (ownerId) => anon('card_owner_slug', { p_owner_type: 'customer', p_owner_id: ownerId });
export const requestReset = (email, channel) => anon('customer_request_reset', { p_email: email, p_channel: channel });
export const resetWithOtp = (email, otp, newPassword) => anon('customer_reset_with_otp', { p_email: email, p_otp: otp, p_new_password: newPassword });
export const referralSignup = (name, phone, ref) => anon('loyalty_referral_signup', { p_name: name, p_phone: phone, p_ref: ref || null });
// Credentials are checked server-side (bcrypt). The response is the LEGACY profile object; callers must run it through
// persistUser() so that only the minimal profile is stored.
export const login = (email, password) => anon('account_login', { p_email: email, p_password: password });
export const register = ({ email, password, name, phone }) => anon('account_register', { p_email: email, p_password: password, p_name: name, p_phone: phone || null });

// ── the stored profile (localStorage `closets_user`) ─────────────────────
// Only what the UI shows and the legacy RPCs need. Everything else the RPC returned (internal ids, flags, tokens)
// is dropped instead of being persisted.
const KEEP = ['id', 'name', 'email', 'phone', 'tier', 'points', 'referral_code'];
export function minimalUser(u) {
  if (!u || typeof u !== 'object') return null;
  const out = {}; KEEP.forEach((k) => { if (u[k] !== undefined && u[k] !== null && typeof u[k] !== 'object') out[k] = u[k]; });
  return out.id != null || out.email ? out : null;
}
export function loadUser() {
  try { const raw = localStorage.getItem(USER_KEY); return raw ? minimalUser(JSON.parse(raw)) : null; } catch (e) { return null; }
}
export function persistUser(u) {
  const m = minimalUser(u);
  try { if (m) localStorage.setItem(USER_KEY, JSON.stringify(m)); else localStorage.removeItem(USER_KEY); } catch (e) { /* private window */ }
  return m;
}
export function clearUser() { try { localStorage.removeItem(USER_KEY); } catch (e) { /* ignore */ } }
