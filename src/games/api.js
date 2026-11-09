/* [IKHTARHA GAMES 2026-11-09] Games Hub data access — public RPCs only: ikg_hub, ikg_enter, ikg_state, ikg_game_prizes, ikg_play, ikg_verify.
 * The browser sends the customer's name + quotation number once, then a short-lived session token, the chosen game and (for some games)
 * the position they picked. It never sends or decides a prize: ikg_play draws it on the server.
 * Demo: /ikhtarha/games?demo=1 runs every game with local sample prizes — nothing is sent, drawn or saved. */
import { SUPA_URL, SUPA_KEY } from '../studio/hub/supaConfig';

const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
async function rpc(fn, body) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body || {}) });
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

export const GAME_IDS = ['mystery-boxes', 'spin-win', 'scratch-win', 'lucky-key', 'memory-match', 'lucky-claw'];
export const DEMO = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';

// ── demo ──
const SAMPLE = [
  { type: 'fixed', value: 25, name_ar: 'قسيمة ٢٥ د.ب', name_en: 'BD 25 voucher' },
  { type: 'percent', value: 5, name_ar: 'خصم ٥٪ إضافي', name_en: 'Extra 5% off' },
  { type: 'gift', value: 0, name_ar: 'منظّم أدراج مجاني', name_en: 'Free drawer organiser' },
  { type: 'premium', value: 0, name_ar: 'إضاءة LED مجانية', name_en: 'Free LED lighting' },
  { type: 'none', value: 0, name_ar: 'حظ أوفر المرة القادمة', name_en: 'Better luck next time' },
];
const demoPlays = {}; let demoName = 'Guest';
const demoGames = () => GAME_IDS.map((id, i) => ({ id, enabled: true, sort: i, attempts: 1, used: demoPlays[id] ? 1 : 0, state: demoPlays[id] ? 'played' : 'available' }));
const later = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

export const hub = () => (DEMO ? later(200, { live: true, name_ar: 'اختارها', name_en: 'Ikhtarha', games: demoGames(), brand: {} }) : rpc('ikg_hub'));
export const enter = (p) => (DEMO
  ? later(600, { ok: true, token: 'demo', first_name: (demoName = String((p && p.name) || 'Guest').trim().split(/\s+/)[0]), quote_no: 'QT-SAMPLE', games: demoGames() })
  : rpc('ikg_enter', { p }));
export const state = (token) => (DEMO
  ? later(150, { ok: true, games: demoGames(), wins: Object.values(demoPlays).filter((x) => x.won), first_name: demoName, quote_no: 'QT-SAMPLE', live: true })
  : rpc('ikg_state', { p: { token } }));
export const gamePrizes = (token, game) => (DEMO ? later(150, { ok: true, prizes: SAMPLE.map((x, i) => ({ ...x, id: 'demo-' + i })) }) : rpc('ikg_game_prizes', { p: { token, game } }));
export const play = (token, game, pick) => {
  if (!DEMO) return rpc('ikg_play', { p: { token, game, pick } });
  if (demoPlays[game]) return later(300, { ok: false, state: 'no_attempts', last: demoPlays[game] });
  const i = Math.floor(Math.random() * SAMPLE.length); const s = SAMPLE[i];
  const won = s.type !== 'none';
  const res = { ...s, game, won, prize_id: 'demo-' + i, code: won ? 'SAMPLE-' + new Date().getFullYear() + '-00000' + (Object.keys(demoPlays).length + 1) : null,
    discount_amount: s.type === 'fixed' ? s.value : s.type === 'percent' ? 60 : 0, expires_at: won ? new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) : null,
    quote_no: 'QT-SAMPLE', customer_name: 'Sample Customer', verify_token: '' };
  demoPlays[game] = res;
  return later(500, { ok: true, result: res, games: demoGames() });
};
export const verify = (t) => rpc('ikg_verify', { p_t: t });

const KEY = 'ikg_session';
export const saveSession = (s) => { if (DEMO) return; try { sessionStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() })); } catch (e) { /* private mode */ } };
export const loadSession = () => { if (DEMO) return null; try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return s && Date.now() - s.at < 55 * 60 * 1000 ? s : null; } catch (e) { return null; } };
export const clearSession = () => { try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } };
