/* [IKHTARHA 2026-11-08] اختارها — website data access. Public RPCs only: ikh_landing, ikh_validate, ikh_reveal, ikh_reward, ikh_verify.
 * The browser never sends a reward, value or eligibility — it sends the code, the name and the quotation number once, then a
 * short-lived session token and the chosen box number. Everything else is decided by the server. */
import { SUPA_URL, SUPA_KEY } from '../studio/hub/supaConfig';

const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
async function rpc(fn, body) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body || {}) });
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
export const landing = (code) => rpc('ikh_landing', { p_code: code || null });
export const validate = (p) => rpc('ikh_validate', { p });
export const reveal = (token, box) => rpc('ikh_reveal', { p: { token, box } });
export const reward = (token) => rpc('ikh_reward', { p: { token } });
export const verify = (t) => rpc('ikh_verify', { p_t: t });

const KEY = 'ikh_session';
export const saveSession = (s) => { try { sessionStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() })); } catch (e) { /* private mode */ } };
export const loadSession = () => { try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return s && Date.now() - s.at < 40 * 60 * 1000 ? s : null; } catch (e) { return null; } };
export const clearSession = () => { try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } };
