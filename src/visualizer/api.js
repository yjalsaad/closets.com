/* Room Visualizer — data access [ROOM-VIZ 2026-11-07]
 * Public RPCs only (viz_catalog, viz_public_settings, viz_share_create/get, viz_log, viz_request_quote).
 * Until the visualizer catalogue is published (or if it cannot be reached) the built-in catalogue + the public finishes table are used. */
import { SUPA_URL, SUPA_KEY } from '../studio/hub/supaConfig';
import { FALLBACK_PRODUCTS, finishesToProducts } from './materials';

const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
async function rpc(fn, body, opts = {}) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body || {}), keepalive: !!opts.keepalive });
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

export const DEFAULT_SETTINGS = {
  show_prices: false, rooms: {}, photo_mode: true, pano: true, catalog: true, quote_cta: true, wastage_pct: 10,
  kiosk: { idle_seconds: 90, attract_en: 'Touch to design your room', attract_ar: 'المس لتصميم غرفتك', branch: '' },
};

let catalogP = null;
export function loadCatalog() {
  if (catalogP) return catalogP;
  catalogP = (async () => {
    try {
      const rows = await rpc('viz_catalog');
      if (Array.isArray(rows) && rows.length) return { products: rows, source: 'db' };
    } catch (e) { /* not published yet */ }
    let boards = [];
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/pp_finishes?select=id,name,material_type,hex,texture_url,sku&deleted_at=is.null&active=eq.true&order=sort`, { headers: H });
      if (r.ok) boards = finishesToProducts(await r.json());
    } catch (e) { /* offline */ }
    return { products: [...FALLBACK_PRODUCTS, ...boards], source: 'fallback' };
  })();
  return catalogP;
}

export async function loadSettings() {
  try { const s = await rpc('viz_public_settings'); if (s && typeof s === 'object') return { ...DEFAULT_SETTINGS, ...s, kiosk: { ...DEFAULT_SETTINGS.kiosk, ...(s.kiosk || {}) } }; } catch (e) { /* defaults */ }
  return DEFAULT_SETTINGS;
}

export async function createShare(state, source = 'share', label = null) {
  try { const r = await rpc('viz_share_create', { p_state: state, p_source: source, p_label: label }); if (r && r.ok) return r.code; } catch (e) { /* fall back to a long link */ }
  return null;
}
export async function getShare(code) { try { return await rpc('viz_share_get', { p_code: code }); } catch (e) { return null; } }

export async function requestQuote(payload) { return rpc('viz_request_quote', { p: payload }); }

/* ── analytics: batched, best-effort ───────────────────────────────────────────────────────────────────────── */
const SESSION = (() => { try { let s = sessionStorage.getItem('vz_session'); if (!s) { s = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('vz_session', s); } return s; } catch (e) { return Math.random().toString(36).slice(2, 12); } })();
let queue = []; let timer = null; let channel = 'web';
export const setChannel = (c) => { channel = c; };
export function track(kind, data = {}) {
  queue.push({ session: SESSION, kind, channel, ...data });
  if (queue.length >= 20) flush(); else if (!timer) timer = setTimeout(flush, 5000);
}
export function flush(keepalive = false) {
  clearTimeout(timer); timer = null; if (!queue.length) return;
  const batch = queue.splice(0, 50);
  rpc('viz_log', { p_events: batch }, { keepalive }).catch(() => {});
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => flush(true));
