/* [WEB-STUDIO 2026-10-31] Website shim of Bonsai's src/supaConfig.js for the ported Neo designers.
 * Same Supabase project and the same PUBLIC anon key the website already ships (src/App.js). The designers only read public
 * catalogue tables with it (finishes, door types, price groups); everything a customer saves goes through studio/customerAuth.js
 * with the customer's own session token. */
export const SUPA_URL = process.env.REACT_APP_SUPABASE_URL || 'https://jflmbfxbhpioyniibjsj.supabase.co';
export const SUPA_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbG1iZnhiaHBpb3luaWlianNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjkyNjQsImV4cCI6MjA5MDQ0NTI2NH0.XnQHF1Ivzhv6Zj12qe1Gh2x6ZyLdFfmUBweE_5SZnu0';
export const SU = SUPA_URL;
export const SK = SUPA_KEY;
export const SUPA_HEADERS = Object.freeze({ apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' });
export const H = SUPA_HEADERS;
export function supaFetch(path, opts = {}) {
  const url = String(path).startsWith('http') ? path : (SUPA_URL + path);
  return fetch(url, Object.assign({}, opts, { headers: Object.assign({ apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }, opts.headers || {}) }));
}
