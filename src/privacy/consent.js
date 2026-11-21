// consent.js — the single source of truth for what the visitor agreed to.
//   analytics : non-essential first-party measurement (visualizer session pings and events, usage analytics, GA4 if ever enabled)
//   ai        : sending the visitor's photos / chat text to third-party AI processors
// Strictly necessary storage (language choice, cart, sign-in, this consent record) needs no consent.
// Nothing non-essential may run until `decided` is true AND the matching flag is true.
const KEY = 'closets_consent_v2';
const LEGACY = 'closets_consent';              // 'accepted' | 'declined' (old banner: analytics only)
const EVT = 'closets:consent';
const OPEN = 'closets:consent-open';

let memo = null;                                // used when storage is blocked (private window)
const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const j = JSON.parse(raw); if (j && j.v === 2) return j; }
    const old = localStorage.getItem(LEGACY);
    if (old === 'accepted') return { v: 2, decided: true, analytics: true, ai: false, ts: 0, migrated: true };
    if (old === 'declined') return { v: 2, decided: true, analytics: false, ai: false, ts: 0, migrated: true };
  } catch (e) { /* storage blocked */ }
  return memo;
};

export function getConsent() {
  const c = read();
  return c ? { decided: !!c.decided, analytics: !!c.analytics, ai: !!c.ai } : { decided: false, analytics: false, ai: false };
}
export const isDecided = () => getConsent().decided;
export const hasConsent = (cat) => !!getConsent()[cat];   // flags are only ever true after an explicit choice

// `decided` = the visitor has answered the banner. Answering the AI prompt alone does not mark it decided.
export function setConsent(partial, { decide = true } = {}) {
  const cur = getConsent();
  const next = { v: 2, analytics: cur.analytics, ai: cur.ai, ...partial, decided: decide ? true : cur.decided, ts: Date.now() };
  memo = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* keep memo */ }
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: getConsent() })); } catch (e) { /* ignore */ }
  return getConsent();
}
export function clearConsent() {
  memo = null;
  try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY); } catch (e) { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: getConsent() })); } catch (e) { /* ignore */ }
}
export function onConsentChange(fn) {
  const h = () => fn(getConsent());
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}
/** run `fn` now if the visitor allowed `cat`, else as soon as they do. Returns an unsubscribe. */
export function whenConsent(cat, fn) {
  let done = false;
  const go = () => { if (!done && hasConsent(cat)) { done = true; try { fn(); } catch (e) { /* ignore */ } } };
  go();
  if (done) return () => {};
  const off = onConsentChange(go);
  return off;
}
/** let any "Privacy settings" link re-open the banner */
export const openConsentSettings = () => { try { window.dispatchEvent(new CustomEvent(OPEN)); } catch (e) { /* ignore */ } };
export const onOpenConsentSettings = (fn) => { window.addEventListener(OPEN, fn); return () => window.removeEventListener(OPEN, fn); };
export const _resetForTests = () => { memo = null; };
