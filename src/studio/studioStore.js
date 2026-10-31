/* [WEB-STUDIO 2026-10-31] Tiny shared store between the studio shell (StudioRoot) and the Get-quote button the ported studios render
 * (hub/neoQuote/QuoteLauncher.jsx): which designer / saved design is open, the admin options (price mode), the language, and the hook
 * that opens the sign-in dialog. */
import { useSyncExternalStore } from 'react';

let state = {
  kind: null, designId: null, title: '', status: 'draft', lang: 'en',
  settings: { price_mode: 'indicative', designers: {}, show_exports: false },
  openAuth: null,           // (reason) => Promise<boolean>  — resolves true once signed in
  onSaved: null,            // (row) => void                — the shell tracks the open design
};
const listeners = new Set();
export const getStudio = () => state;
export function setStudio(patch) { state = { ...state, ...patch }; listeners.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); }
const sub = (f) => { listeners.add(f); return () => listeners.delete(f); };
export const useStudio = () => useSyncExternalStore(sub, getStudio, getStudio);

export const fmtBD = (n) => 'BD ' + (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
/** the indicative figure: rounded UP to the next BD 10 so it never reads as an exact quote */
export const indicative = (n) => Math.ceil((Number(n) || 0) / 10) * 10;
