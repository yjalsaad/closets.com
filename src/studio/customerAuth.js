/* =============================================================================
 * Customer accounts for the Neo Design Studio [WEB-STUDIO 2026-10-31]
 * Supabase Auth (e-mail + password) on the Bonsai project, through the plain GoTrue REST API (no SDK in the bundle).
 *   sign up  -> confirmation e-mail -> back to /studio/account with the session in the URL hash
 *   sign in  -> cp_claim_account() links the auth user to its website_customers row (by the CONFIRMED e-mail) -> token refresh
 *               so the access-token hook mints role customer_user -> the cp_studio_* RPCs work.
 * The session lives in localStorage under SESSION_KEY and is refreshed a minute before it expires.
 * ===========================================================================*/
import { SUPA_URL, SUPA_KEY } from './hub/supaConfig';

export const SESSION_KEY = 'closets_studio_auth_v1';
const listeners = new Set();
let session = read();
let refreshing = null;

function read() {
  try { const j = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return j && j.access_token ? j : null; } catch (e) { return null; }
}
function write(s) {
  session = s && s.access_token ? s : null;
  try { if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); } catch (e) { /* private window */ }
  listeners.forEach((f) => { try { f(session); } catch (e) { /* a listener must not break the others */ } });
}
const norm = (j) => (j && j.access_token ? {
  access_token: j.access_token, refresh_token: j.refresh_token,
  expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (Number(j.expires_in) || 3600),
  user: j.user ? { id: j.user.id, email: j.user.email, name: (j.user.user_metadata || {}).name || '' } : (session && session.user) || null,
} : null);

export const getSession = () => session;
export const onSession = (f) => { listeners.add(f); return () => listeners.delete(f); };
export function claims(s = session) {
  try { return JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return {}; }
}
/** signed in AND the token is a linked customer token (role customer_user with a customer_id) */
export const isLinked = (s = session) => { const c = claims(s); return !!s && c.role === 'customer_user' && !!c.customer_id; };

async function gotrue(path, body, method = 'POST', token) {
  const r = await fetch(SUPA_URL + '/auth/v1/' + path, {
    method, headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || SUPA_KEY) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null; try { j = await r.json(); } catch (e) { /* empty body */ }
  if (!r.ok) { const e = new Error((j && (j.msg || j.error_description || j.message || j.error)) || ('HTTP ' + r.status)); e.code = j && (j.error_code || j.code); e.status = r.status; throw e; }
  return j;
}

const redirect = () => (typeof window !== 'undefined' ? window.location.origin + '/studio/account' : undefined);

export async function signUp({ email, password, name, phone }) {
  const j = await gotrue('signup?redirect_to=' + encodeURIComponent(redirect()), {
    email: String(email || '').trim().toLowerCase(), password,
    data: { account_type: 'customer', name: String(name || '').trim(), phone: String(phone || '').trim() },
  });
  if (j && j.access_token) { write(norm(j)); await link(name); return { signedIn: true }; }
  return { signedIn: false, confirm: true };          // e-mail confirmation is on: the link brings the customer back here
}

export async function signIn({ email, password }) {
  const j = await gotrue('token?grant_type=password', { email: String(email || '').trim().toLowerCase(), password });
  write(norm(j));
  await link();
  return session;
}

export async function resetPassword(email) {
  await gotrue('recover?redirect_to=' + encodeURIComponent(redirect()), { email: String(email || '').trim().toLowerCase() });
}
export async function setNewPassword(password) {
  await gotrue('user', { password }, 'PUT', session && session.access_token);
}

export async function signOut() {
  const t = session && session.access_token;
  write(null);
  if (t) { try { await gotrue('logout', null, 'POST', t); } catch (e) { /* the local session is gone either way */ } }
}

export async function refresh() {
  if (!session || !session.refresh_token) return null;
  if (refreshing) return refreshing;
  refreshing = gotrue('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
    .then((j) => { write(norm(j)); return session; })
    .catch((e) => { if (e.status === 400 || e.status === 401) write(null); return null; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function token() {
  if (!session) return null;
  if (session.expires_at - 60 < Date.now() / 1000) await refresh();
  return session && session.access_token;
}

/** link the auth user to its customer record, then refresh so the token carries role customer_user + customer_id */
export async function link(name) {
  if (!session || isLinked()) return { ok: true };
  const r = await rpc('cp_claim_account', { p_name: name || (session.user && session.user.name) || null }, { allowUnlinked: true });
  if (r && r.ok) await refresh();
  return r || { ok: false };
}

/** the session from an e-mail link (#access_token=...&type=signup|recovery) — returns the link type or null */
export async function consumeUrlSession() {
  if (typeof window === 'undefined') return null;
  const h = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  if (h.get('error_description')) { window.history.replaceState(null, '', window.location.pathname); const e = new Error(h.get('error_description')); throw e; }
  const at = h.get('access_token'); if (!at) return null;
  write(norm({ access_token: at, refresh_token: h.get('refresh_token'), expires_in: h.get('expires_in'), expires_at: Number(h.get('expires_at')) || undefined }));
  window.history.replaceState(null, '', window.location.pathname);
  try { const u = await gotrue('user', null, 'GET', at); if (u) write({ ...session, user: { id: u.id, email: u.email, name: (u.user_metadata || {}).name || '' } }); } catch (e) { /* keep the token */ }
  const type = h.get('type') || 'signup';
  if (type !== 'recovery') await link();
  return type;
}

export async function rpc(fn, body, opts = {}) {
  const t = await token();
  if (!t) { const e = new Error('not_signed_in'); e.code = 'not_signed_in'; throw e; }
  if (!opts.allowUnlinked && !isLinked()) { const r = await link(); if (!r.ok) { const e = new Error(r.error || 'not_linked'); e.code = r.error || 'not_linked'; throw e; } }
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + (session && session.access_token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  let j = null; try { j = await r.json(); } catch (e) { /* void function */ }
  if (!r.ok) { const e = new Error((j && (j.message || j.hint)) || ('HTTP ' + r.status)); e.code = j && j.code; e.status = r.status; throw e; }
  return j;
}

/** anon call (public settings) */
export async function publicRpc(fn, body) {
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/** customer-facing text for an auth / claim error */
export function authError(e, ar) {
  const m = String((e && (e.code || e.message)) || '').toLowerCase();
  const T = (en, a) => (ar ? a : en);
  if (/invalid.*(login|credential)|invalid_credentials/.test(m)) return T('Wrong e-mail or password.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  if (/email.*not.*confirm|email_not_confirmed/.test(m)) return T('Please confirm your e-mail first — check your inbox for our link.', 'يرجى تأكيد بريدك الإلكتروني أولًا — تحقق من الرسالة في بريدك.');
  if (/already.*registered|user_already_exists|email_exists/.test(m)) return T('An account with this e-mail already exists. Sign in instead.', 'يوجد حساب بهذا البريد. سجّل الدخول بدلًا من ذلك.');
  if (/password/.test(m) && /(weak|short|least|characters)/.test(m)) return T('Choose a stronger password (8+ characters, upper & lower case and a number).', 'اختر كلمة مرور أقوى (8 أحرف على الأقل مع أحرف كبيرة وصغيرة ورقم).');
  if (/rate|too many|over_email_send_rate_limit/.test(m)) return T('Too many attempts — please wait a few minutes.', 'محاولات كثيرة — يرجى الانتظار بضع دقائق.');
  if (/staff_account/.test(m)) return T('This is a staff login — use Bonsai instead.', 'هذا حساب موظف — استخدم بونساي.');
  if (/account_closed/.test(m)) return T('This account is closed. Please contact us.', 'هذا الحساب مغلق. يرجى التواصل معنا.');
  if (/unverified|no_account/.test(m)) return T('Please confirm your e-mail to finish setting up your account.', 'يرجى تأكيد بريدك الإلكتروني لإكمال إعداد حسابك.');
  if (/not_signed_in|jwt|expired/.test(m)) return T('Please sign in again.', 'يرجى تسجيل الدخول مجددًا.');
  return T('Something went wrong — please try again.', 'حدث خطأ — يرجى المحاولة مرة أخرى.');
}
