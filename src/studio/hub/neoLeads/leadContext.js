/* =============================================================================
 * Lead context for the Neo studios [NEO-LEADS-UX37] - the ONE source of truth for "which lead / customer is this studio session for".
 * Shared by the studio header chip, the auto-save to the lead profile, the quick actions on a lead and the Quote builder's Customer / Lead picker
 * (the quote picker should read getCurrentLead() / useLeadContext() instead of keeping its own copy).
 *
 * A context is { leadId, leadRef, leadName, phone, branch, owner, studio, projectId, projectName, mode: 'new' | 'continue' | 'attach' (attach = link the design already on screen), designId, ts }.
 * It is kept per studio, persisted in sessionStorage (survives a reload of the tab, not a new tab) and mirrored in the URL hash as
 * `#nlead=<leadId>&nstudio=<studioId>` so a link / reload re-opens the same lead in the same studio.
 * Pure helpers + a tiny external store (subscribe / snapshot) so React reads it with useSyncExternalStore. No Supabase here.
 * ===========================================================================*/
import { useSyncExternalStore, useEffect } from 'react';
import { getDesigner, defaultProjectName, newProjectId } from './designers';

export const CTX_KEY = 'neo_lead_ctx_v1';

const clean = (v, n = 120) => String(v == null ? '' : v).trim().slice(0, n);

/** build a context from a lead row (any of the lead shapes the Hub uses) */
export function makeContext(lead, studio, opts = {}) {
  const l = lead || {};
  const id = clean(l.id || l.leadId || l.lead_id, 80);
  if (!id || !getDesigner(studio)) return null;
  const name = clean(l.name || l.leadName || l.customer_name || l.company, 120);
  return {
    leadId: id,
    leadRef: clean(l.lead_no || l.ref || l.code || l.leadRef || id, 60),
    leadName: name,
    phone: clean(l.phone || l.mobile, 40),
    branch: clean(l.branch || l.showroom || l.company_id, 60),
    owner: clean(l.assigned_to || l.assignee || l.owner, 80),
    studio,
    projectId: clean(opts.projectId, 60) || newProjectId(),
    projectName: clean(opts.projectName, 140) || defaultProjectName(name, studio, !!opts.ar),
    mode: opts.mode === 'continue' || opts.mode === 'attach' ? opts.mode : 'new',
    designId: opts.designId || null,
    autoQuote: !!opts.autoQuote,   // one-shot: the studio opens its Quote panel as soon as it is ready (Designs tab > Create quote)
    ts: opts.ts || Date.now(),
  };
}

/** the two-part chip text: "Lead: Mohammed Al Satrawi - LD-123" */
export function chipText(ctx, ar) {
  if (!ctx) return '';
  const ref = ctx.leadRef && ctx.leadRef !== ctx.leadId ? ctx.leadRef : ctx.leadId;
  return `${ar ? 'العميل' : 'Lead'}: ${ctx.leadName || '-'} · ${ref}`;
}

/* ---- URL hash: #nlead=<id>&nstudio=<studio> ------------------------------------------------------------------------------------------- */
export function buildLeadHash(ctx) {
  if (!ctx) return '';
  return `#nlead=${encodeURIComponent(ctx.leadId)}&nstudio=${encodeURIComponent(ctx.studio)}`;
}
export function parseLeadHash(hash) {
  const m = String(hash || '').replace(/^#/, '').split('&').map((s) => s.split('='));
  const g = (k) => { const e = m.find((x) => x[0] === k); try { return e ? decodeURIComponent(e[1] || '') : ''; } catch (err) { return ''; } };
  const leadId = g('nlead'); const studio = g('nstudio');
  return leadId && getDesigner(studio) ? { leadId, studio } : null;
}

/* ---- the external store -------------------------------------------------------------------------------------------------------------- */
let state = null; // { byStudio: {}, current: studioId | null, last: ctx | null }
const fresh = new Set();   // ts of the contexts created in THIS page load (anything else was restored from sessionStorage = the tab was reloaded)
const listeners = new Set();
const store = () => { try { return typeof window !== 'undefined' ? window.sessionStorage : null; } catch (e) { return null; } };
function load() {
  if (state) return state;
  state = { byStudio: {}, current: null, last: null };
  try { const s = store(); const t = s && s.getItem(CTX_KEY); if (t) { const j = JSON.parse(t); if (j && j.byStudio && typeof j.byStudio === 'object') state = { byStudio: j.byStudio, current: j.current || null, last: j.last || null }; } } catch (e) { /* a damaged value reads as none */ }
  return state;
}
function persist() { try { const s = store(); if (s) s.setItem(CTX_KEY, JSON.stringify(state)); } catch (e) { /* private window: the context lives for this page view only */ } }
function emit() { snap = { n: snap.n + 1 }; listeners.forEach((f) => { try { f(); } catch (e) { /* a listener must not break the others */ } }); }
let snap = { n: 0 };
export const subscribeLeadContext = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const getSnap = () => snap;

export function getLeadContext(studio) { return load().byStudio[studio] || null; }
export function setLeadContext(ctx) {
  if (!ctx || !ctx.studio) return null;
  load(); fresh.add(ctx.ts); state = { byStudio: { ...state.byStudio, [ctx.studio]: ctx }, current: ctx.studio, last: ctx }; persist(); emit(); return ctx;
}
export function patchLeadContext(studio, patch) {
  const c = getLeadContext(studio); if (!c) return null; return setLeadContext({ ...c, ...patch, studio });
}
/** the user unlinked the lead: forget it completely */
export function clearLeadContext(studio) {
  load(); const by = { ...state.byStudio }; delete by[studio];
  state = { byStudio: by, current: state.current === studio ? (Object.keys(by).pop() || null) : state.current, last: state.last && state.last.studio === studio ? null : state.last }; persist(); emit();
}
/** the user left the studio (menu, another page): the studio opens unlinked next time, but the Quote builder can still ask who the last lead was */
export function leaveLeadContext(studio) {
  load(); const by = { ...state.byStudio }; const gone = by[studio]; delete by[studio];
  state = { byStudio: by, current: state.current === studio ? (Object.keys(by).pop() || null) : state.current, last: gone || state.last }; persist(); emit();
}
/** true when the context was created in this page load (a launch from a lead / the picker); false = restored after a tab reload */
export const isFreshContext = (ctx) => !!ctx && fresh.has(ctx.ts);
/** forget everything (sign-out) */
export function resetLeadContext() { state = { byStudio: {}, current: null, last: null }; persist(); emit(); }
/** For the Quote builder's picker: the lead of the studio session the user is in right now (or came from), or null. */
export function getCurrentLead() {
  const s = load(); const c = (s.current && s.byStudio[s.current]) || s.last; if (!c) return null;
  return { id: c.leadId, ref: c.leadRef, name: c.leadName, phone: c.phone, branch: c.branch, owner: c.owner, studio: c.studio, projectId: c.projectId, designId: c.designId };
}

/** the Neo Quote Builder names its product 'wardrobe' | 'kitchen' | 'door' | 'custom' | 'category:<id>'; this is the studio id of that product */
export const PRODUCT_STUDIO = { wardrobe: 'neo-closets', kitchen: 'neo-kitchen', door: 'neo-doors', custom: 'neo-custom' };
export const studioOfProduct = (product) => {
  const p = String(product || ''); if (PRODUCT_STUDIO[p]) return PRODUCT_STUDIO[p];
  const m = /^category:(\w+)$/.exec(p); return m ? 'neo-' + m[1] : null;
};
/** the lead of the studio session that is open NOW for this quote product (not the last one): the Quote panel's customer. Null when the studio is not lead-linked. */
export function leadForProduct(product) { const s = studioOfProduct(product); return s ? getLeadContext(s) : null; }

/** React: the context of ONE studio (re-renders on change) */
export function useLeadContext(studio) {
  useSyncExternalStore(subscribeLeadContext, getSnap, getSnap);
  return getLeadContext(studio);
}

/* ---- design meta published by the studio (the numbers it already shows) --------------------------------------------------------------- */
const metaStore = {};
const metaListeners = new Set();
export function publishDesignMeta(studio, meta) { metaStore[studio] = { ...(metaStore[studio] || {}), ...(meta || {}), at: Date.now() }; metaListeners.forEach((f) => { try { f(studio); } catch (e) { /* ignore */ } }); }
export const getDesignMeta = (studio) => metaStore[studio] || null;
export const clearDesignMeta = (studio) => { delete metaStore[studio]; };
/** a studio calls this with the price it displays: usePublishDesignMeta('neo-doors', { price: price.total, currency: price.currency }) */
export function usePublishDesignMeta(studio, meta) {
  const p = meta && Number(meta.price); const c = meta && meta.currency;
  useEffect(() => { if (Number.isFinite(p)) publishDesignMeta(studio, { price: p, currency: c || 'BD' }); }, [studio, p, c]);
}

/* ---- explicit Save: a studio calls notifyExplicitSave('neo-kitchen') after File > Save; the lead host saves to the lead right away ------- */
export const EXPLICIT_SAVE_EVENT = 'neo-design-explicit-save';
export function notifyExplicitSave(studio) { try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EXPLICIT_SAVE_EVENT, { detail: { studio } })); } catch (e) { /* ignore */ } }

/* ---- save status of a studio that saves itself (the Neo Design Studio writes neo_projects): it reports, the host shows ------------------------------- */
const statusListeners = new Set();
export const emitLeadStatus = (studio, st) => { statusListeners.forEach((f) => { try { f(studio, st); } catch (e) { /* a listener must not break the studio */ } }); };
export const subscribeLeadStatus = (fn) => { statusListeners.add(fn); return () => statusListeners.delete(fn); };

/* ---- quote hand-off: stamp the lead on the studio's own hand-off key so "Send to Quote" is pre-linked ----------------------------------- */
export const HANDOFF_KEYS = ['neo_wardrobe_handoff', 'neo_category_handoff', 'neo_custom_handoff', 'neo_doors_handoff', 'neo_kitchen_handoff'];
export function leadStamp(ctx, designId) {
  return ctx ? { leadId: ctx.leadId, leadRef: ctx.leadRef, name: ctx.leadName, phone: ctx.phone, branch: ctx.branch, owner: ctx.owner, designId: designId || ctx.designId || null, studio: ctx.studio, projectId: ctx.projectId } : null;
}
/** the raw text of every hand-off key right now (take one when the studio mounts, compare when it leaves: a different text = written in THIS session) */
export function readHandoffs(storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null); const out = {};
  HANDOFF_KEYS.forEach((k) => { try { out[k] = s ? s.getItem(k) : null; } catch (e) { out[k] = null; } });
  return out;
}
/** stamp the lead on every hand-off whose text changed since `before` (and only those). Returns { changed: [keys], after } - `after` is the new baseline. */
export function stampChangedHandoffs(ctx, designId, before, storage) {
  const s = storage || (typeof window !== 'undefined' ? window.localStorage : null); const now = readHandoffs(s); const changed = [];
  if (!s || !ctx) return { changed, after: now };
  const stamp = leadStamp(ctx, designId);
  HANDOFF_KEYS.forEach((k) => {
    if (!now[k] || now[k] === (before || {})[k]) return;
    try { const j = JSON.parse(now[k]); if (!j || typeof j !== 'object') return; const next = JSON.stringify({ ...j, lead: stamp }); s.setItem(k, next); now[k] = next; changed.push(k); } catch (e) { /* leave it */ }
  });
  return { changed, after: now };
}
