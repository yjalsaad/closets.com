// scrub.js — remove personal data from text that is about to leave the browser in an error report.
const EMAIL = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+|00)?\d[\d\s().\-]{6,}\d/g;
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const TOKEN = /\b(?:eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{5,}\.[A-Za-z0-9_\-]{5,}|[A-Fa-f0-9]{32,})\b/g;
const QUERYVAL = /([?&](?:email|phone|name|token|access_token|refresh_token|code|key|apikey)=)[^&#\s]*/gi;
export function scrubText(s, max = 3500) {
  if (s == null) return s;
  let t = String(s).replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xF));
  t = t.replace(QUERYVAL, '$1[redacted]').replace(TOKEN, '[token]').replace(EMAIL, '[email]').replace(PHONE, '[number]');
  return t.slice(0, max);
}
// path only, never the query string or hash (they can carry e-mails, tokens, referral codes)
export function safePath() {
  try { return window.location.pathname || ''; } catch (e) { return ''; }
}
