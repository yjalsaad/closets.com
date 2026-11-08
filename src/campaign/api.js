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
/* [IKHTARHA 2026-11-08 · DEMO] /campaign/ikhtarha/demo — a sample run for reviewing the experience: the campaign look comes from the
 * live campaign (read-only), everything else is local sample data. Nothing is validated, drawn or saved on the server. */
export const DEMO = typeof window !== 'undefined' && /^\/campaign\/ikhtarha\/demo\/?$/i.test(window.location.pathname || '');
const SAMPLES = [
  { type: 'percent', value: 10, name_ar: 'خصم 10٪', name_en: '10% off', description_ar: 'على طلبك من الخزائن العالمية', description_en: 'On your order' },
  { type: 'fixed', value: 150, name_ar: 'خصم 150 دينار', name_en: 'BD 150 off' },
  { type: 'gift', value: 0, name_ar: 'منظم أدراج مجاني', name_en: 'Free drawer organiser' },
  { type: 'premium', value: 0, name_ar: 'إضاءة LED مجانية للخزانة', name_en: 'Free wardrobe LED lighting' },
];
const demoReward = (box) => {
  const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]; const total = 1200;
  const disc = s.type === 'percent' ? (total * s.value) / 100 : s.type === 'fixed' ? s.value : 0;
  const d = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  return { ...s, ref: 'SAMPLE-' + new Date().getFullYear() + '-000000', discount_amount: disc, quote_total: total, quote_no: 'QT-SAMPLE', customer_name: 'Sample Customer',
    expires_at: d, revealed_at: new Date().toISOString(), verify_token: '', box_index: box, terms_ar: 'هذه معاينة — الجائزة ليست حقيقية.', terms_en: 'This is a preview — the prize is not real.' };
};
const later = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
export const landing = (code) => rpc('ikh_landing', { p_code: code || null });
export const validate = (p) => (DEMO ? later(700, { ok: true, state: 'ready', token: 'demo', first_name: String((p && p.name) || '').trim().split(/\s+/)[0] || 'Guest', boxes: 9 }) : rpc('ikh_validate', { p }));
export const reveal = (token, box) => (DEMO ? later(400, { ok: true, state: 'revealed', reward: demoReward(box) }) : rpc('ikh_reveal', { p: { token, box } }));
export const reward = (token) => (DEMO ? Promise.resolve({ ok: false }) : rpc('ikh_reward', { p: { token } }));
export const verify = (t) => rpc('ikh_verify', { p_t: t });

const KEY = 'ikh_session';
export const saveSession = (s) => { if (DEMO) return; try { sessionStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() })); } catch (e) { /* private mode */ } };
export const loadSession = () => { if (DEMO) return null; try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return s && Date.now() - s.at < 40 * 60 * 1000 ? s : null; } catch (e) { return null; } };
export const clearSession = () => { try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } };
