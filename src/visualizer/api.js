/* Room Visualizer — data access [ROOM-VIZ 2026-11-07, DIGITAL-SHOWROOM 2026-11-08]
 * Public RPCs only (viz_catalog, viz_public_settings, viz_taxonomy_public, viz_share_create/get, viz_log, viz_session_ping,
 * viz_request_quote, viz_capture). Until the visualizer catalogue is published (or if it cannot be reached) the built-in
 * catalogue + the public finishes table are used. Visitor sessions record device / browser / time-zone country / referrer /
 * campaign tags and time spent — no IP address is stored and nothing personal until the visitor fills in a form. */
import { SUPA_URL, SUPA_KEY } from '../studio/hub/supaConfig';
import { hasConsent, whenConsent } from '../privacy/consent';
import { FALLBACK_PRODUCTS, finishesToProducts } from './materials';

const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
async function rpc(fn, body, opts = {}) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body || {}), keepalive: !!opts.keepalive });
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

export const DEFAULT_SETTINGS = {
  show_prices: false, rooms: {}, photo_mode: true, pano: true, catalog: true, quote_cta: true, wastage_pct: 10,
  kiosk: { idle_seconds: 90, attract_en: 'Touch to design your room', attract_ar: 'المس لتصميم غرفتك', branch: '', phone_qr: true },
  features: {}, texts: {},
  grout: { mm: null, colors: ['#f4f2ec', '#d8d4cc', '#b5aea3', '#8a847b', '#4a4a4a', '#1f1f1f', '#c9b08a'], min_mm: 0.5, max_mm: 10 },
  watermark: { enabled: true, text: 'THE CLOSETS', text_ar: 'الخزائن', logo_url: null, position: 'top', size: 100, footer: true },
  forms: { visitor_enabled: true, visitor_button_en: 'Ask an expert', visitor_button_ar: 'اسأل خبيراً', download_gate: false, fields: [] },
  widget: {}, catalog_pdf: {}, tax: { filters: [], labels: [], sizes: [] },
};
const BLOCKS = ['kiosk', 'features', 'texts', 'grout', 'watermark', 'forms', 'widget', 'catalog_pdf'];
export const feature = (s, k) => !s || !s.features || s.features[k] !== false;

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
  let s = null; let tax = null;
  try { [s, tax] = await Promise.all([rpc('viz_public_settings'), rpc('viz_taxonomy_public').catch(() => null)]); } catch (e) { /* defaults */ }
  if (!s || typeof s !== 'object') return DEFAULT_SETTINGS;
  const out = { ...DEFAULT_SETTINGS, ...s };
  BLOCKS.forEach((k) => { out[k] = { ...DEFAULT_SETTINGS[k], ...((s && typeof s[k] === 'object' && s[k]) || {}) }; });
  out.tax = { ...DEFAULT_SETTINGS.tax, ...((tax && typeof tax === 'object' && tax) || {}) };
  return out;
}

export async function createShare(state, source = 'share', label = null) {
  try { const r = await rpc('viz_share_create', { p_state: state, p_source: source, p_label: label }); if (r && r.ok) return r.code; } catch (e) { /* fall back to a long link */ }
  return null;
}
export async function getShare(code) { try { return await rpc('viz_share_get', { p_code: code }); } catch (e) { return null; } }

/* ── visitor session ─────────────────────────────────────────────────────────────────────────────────────────── */
export const SESSION = (() => { try { let s = sessionStorage.getItem('vz_session'); if (!s) { s = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('vz_session', s); } return s; } catch (e) { return Math.random().toString(36).slice(2, 12); } })();
const TZ_CC = { 'Asia/Bahrain': 'BH', 'Asia/Riyadh': 'SA', 'Asia/Kuwait': 'KW', 'Asia/Qatar': 'QA', 'Asia/Dubai': 'AE', 'Asia/Muscat': 'OM', 'Asia/Baghdad': 'IQ', 'Asia/Amman': 'JO', 'Africa/Cairo': 'EG', 'Asia/Beirut': 'LB', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Manila': 'PH', 'Europe/London': 'GB', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Los_Angeles': 'US' };
function deviceInfo() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const tablet = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  const device = tablet ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  const os = /iPhone|iPad|iOS/i.test(ua) || (/Macintosh/.test(ua) && tablet) ? 'iOS' : /Android/i.test(ua) ? 'Android' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Other';
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  return { device, os, browser };
}
let started = 0; let activeMs = 0; let lastTick = 0; let pingTimer = null; let sessionChannel = 'web';
function seconds() { if (lastTick && (typeof document === 'undefined' || !document.hidden)) { const n = Date.now(); activeMs += n - lastTick; lastTick = n; } return Math.round(activeMs / 1000); }
function ping(keepalive) {
  if (!started) return;
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
  const q = new URLSearchParams(window.location.search); const utm = {};
  ['source', 'medium', 'campaign', 'content', 'term'].forEach((k) => { const v = q.get('utm_' + k); if (v) utm[k] = v.slice(0, 80); });
  let ref = ''; try { const h = document.referrer ? new URL(document.referrer).hostname : ''; ref = h && h !== window.location.hostname ? h.replace(/^www\./, '') : ''; } catch (e) { /* ignore */ }
  rpc('viz_session_ping', { p: { session: SESSION, channel: sessionChannel, ...deviceInfo(), tz, country: TZ_CC[tz] || null, lang: (navigator.language || '').slice(0, 10), referrer: ref, utm: Object.keys(utm).length ? utm : null, landing: window.location.pathname.slice(0, 200), seconds: seconds() } }, { keepalive }).catch(() => {});
}
// [PRIVACY] session pings (device, OS, browser, timezone, language, referrer host, UTM, landing path, active seconds) are
// non-essential first-party measurement: they start ONLY after the visitor allowed measurement (src/privacy/consent.js).
export function startSession(channel) {
  sessionChannel = channel || 'web';
  if (started || typeof window === 'undefined') return;
  whenConsent('analytics', () => {
    if (started) return;
    started = Date.now(); lastTick = Date.now(); ping(false);
    pingTimer = setInterval(() => { if (!document.hidden) ping(false); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { seconds(); lastTick = 0; ping(true); } else lastTick = Date.now(); });
  });
}
export const stopSession = () => { clearInterval(pingTimer); };

/* ── inquiries ──────────────────────────────────────────────────────────────────────────────────────────────── */
let quoted = false; const applied = [];
export const noteApplied = (pid) => { if (pid && !applied.includes(pid)) applied.push(pid); };
export async function requestQuote(payload) { const r = await rpc('viz_request_quote', { p: { ...payload, session: SESSION } }); if (r && r.ok) { quoted = true; rememberContact(payload); } return r; }
export async function capture(payload) { const r = await rpc('viz_capture', { p: { ...payload, session: SESSION, channel: payload.channel || channel } }); if (r && r.ok) rememberContact(payload); return r; }
const CONTACT_KEY = 'vz_contact';
function rememberContact(p) { try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: p.name || '', phone: p.phone || '', email: p.email || '' })); } catch (e) { /* ignore */ } }
export function knownContact() { try { return JSON.parse(localStorage.getItem(CONTACT_KEY) || 'null'); } catch (e) { return null; } }

/* ── favourites (this browser) ─────────────────────────────────────────────────────────────────────────────── */
export function favorites() { try { return JSON.parse(localStorage.getItem('vz_favs') || '[]'); } catch (e) { return []; } }
export function toggleFavorite(pid) {
  const f = favorites(); const on = !f.includes(pid); const n = on ? [...f, pid] : f.filter((x) => x !== pid);
  try { localStorage.setItem('vz_favs', JSON.stringify(n.slice(-100))); } catch (e) { /* ignore */ }
  if (on) track('favorite', { product_id: pid });
  return on;
}

/* ── analytics: batched, best-effort ───────────────────────────────────────────────────────────────────────── */
let queue = []; let timer = null; let channel = 'web';
export const setChannel = (c) => { channel = c; sessionChannel = c; };
export function track(kind, data = {}) {
  if (!hasConsent('analytics')) return;   // [PRIVACY] usage events are dropped (not queued) until measurement is allowed
  queue.push({ session: SESSION, kind, channel, ...data });
  if (queue.length >= 20) flush(); else if (!timer) timer = setTimeout(flush, 5000);
}
export function flush(keepalive = false) {
  clearTimeout(timer); timer = null; if (!queue.length) return;
  const batch = queue.splice(0, 50);
  rpc('viz_log', { p_events: batch }, { keepalive }).catch(() => {});
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (applied.length && !quoted) applied.slice(-5).forEach((pid) => queue.push({ session: SESSION, kind: 'abandon', channel, product_id: pid }));
    applied.length = 0;
    flush(true); if (started) { seconds(); ping(true); }
  });
}
