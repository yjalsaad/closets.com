/* VIP presentation DECKS: schema, validation, sanitising and text resolution. PURE: no DOM, no network, no storage.
 *
 * A deck is JSON (see docs/showroom3d/VIP-DECKS.md):
 *   { id?, title: Text, slides: [ { id?, title: Text, lead?: Text, bullets?: Text[], blocks?: Block[], links?: Link[], accent?, source?: Text, illustrative?: boolean } ] }
 *   Text  = "plain string" | { en: "...", ar: "..." }           (a missing language falls back to the other one)
 *   Block = { type: 'image', url: "https://...", alt: Text, caption?: Text, source?, illustrative? }
 *         | { type: 'table', head?: Text[], rows: Text[][], source?, illustrative? }
 *         | { type: 'bar',   title?: Text, unit?: "string", data: [ { label: Text, value: number } ], source?, illustrative? }
 *   Link  = { label: Text, route: "/kitchen" }                   (route must be on the internal whitelist, never an external URL)
 *
 * Everything a person supplies goes through sanitizeDeck(): tags and control characters are stripped, lengths and counts are capped, images must be https,
 * unknown fields are dropped, and the neutral disclaimer is ALWAYS appended as the final slide (withDisclaimer). Text tokens {{fact:key}} resolve from
 * content/facts.js at render time ("To be confirmed by management" while the fact is null). */
import { str, arr, isObj, FACTS, hasFact } from '../siteBridge';

export const DISCLAIMER = { en: 'Information only, not an offer or financial advice; details provided directly by management.', ar: 'للاطلاع فقط، وليس عرضًا ولا نصيحة مالية؛ تُقدَّم التفاصيل مباشرة من الإدارة.' };
export const PLACEHOLDER = { en: 'To be confirmed by management', ar: 'يؤكَّد من الإدارة' };
export const DISCLAIMER_SLIDE_ID = 'disclaimer';
export const DISCLAIMER_TITLE = { en: 'Important information', ar: 'معلومات مهمة' };

export const LIMITS = Object.freeze({
  maxSlides: 20, maxBullets: 8, maxBlocks: 3, maxLinks: 3, maxDeckTitle: 80, maxSlideTitle: 90, maxLead: 200, maxBullet: 220, maxAlt: 140, maxCaption: 140, maxSource: 140,
  maxTableCols: 6, maxTableRows: 12, maxCell: 60, maxBars: 8, maxLabel: 30, maxUnit: 12, maxUrl: 500, maxId: 40, maxInput: 100000,
});
export const ACCENTS = ['orange', 'brass', 'sand', 'sage'];
/** internal routes a deck may link to (the real pages the showroom already links to elsewhere) */
export const ROUTE_WHITELIST = ['/kitchen', '/wardrobes', '/doors', '/tv', '/studio', '/design-studio', '/campaign/ikhtarha', '/booking', '/projects'];
/** facts a {{fact:key}} token may name */
export const FACT_KEYS = ['yearsOfCraft', 'homesDelivered', 'productionModel', 'showroomCount', 'warrantyYears', 'phone'];
/** words that signal financial promises / figures: imported decks get a WARNING (the owner is responsible), the built-in content must stay clear of them (unit-tested) */
export const FORBIDDEN_FINANCIAL = /\b(roi|returns?|yields?|valuation|equity|stakes?|shares?|dividends?|profits?|guarantee[sd]?|BHD|BD|USD|per\s?cent)\b|[0-9]+\s?(x|times)\b|دينار|عائد|ربح|تقييم|أسهم|ضمان|%/i;

export const L = (o, lang) => (lang === 'ar' ? (o && (o.ar || o.en)) || '' : (o && (o.en || o.ar)) || '');

// ---------------------------------------------------------------- text sanitising
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
/** one line of plain text: tags / script blocks / entities-as-tags removed, control and bidi-override characters removed, whitespace collapsed, capped */
export function cleanText(v, max) {
  let s = str(v, '');
  s = s.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<\/?[a-z!?][^>]*>?/gi, ' ');
  s = s.replace(/&(lt|gt|#0*60|#x0*3c|#0*62|#x0*3e);/gi, ' ').replace(CTRL, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/\bjavascript\s*:/gi, '').replace(/\bdata\s*:\s*text\/html/gi, '');
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}
/** Text -> { en, ar } (strings fill both languages) or null when empty */
export function cleanBilingual(v, max) {
  if (typeof v === 'string' || typeof v === 'number') { const s = cleanText(v, max); return s ? { en: s, ar: s } : null; }
  if (!isObj(v)) return null;
  const en = cleanText(v.en, max), ar = cleanText(v.ar, max); if (!en && !ar) return null;
  return { en: en || ar, ar: ar || en };
}
/** https only, no credentials, no whitespace, parseable, capped: returns the normalised URL or '' */
export function cleanImageUrl(v) {
  const s = str(v, '').trim(); if (!s || s.length > LIMITS.maxUrl || /\s/.test(s)) return '';
  let u; try { u = new URL(s); } catch (e) { return ''; }
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname || !/\./.test(u.hostname)) return '';
  return u.toString();
}
export const cleanRoute = (v) => { const s = str(v, '').trim(); return ROUTE_WHITELIST.includes(s) ? s : ''; };
const slug = (s, fb) => { const x = str(s, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, LIMITS.maxId); return x || fb; };

// ---------------------------------------------------------------- validation + sanitising
/**
 * sanitizeDeck(raw, { prefix }) -> { ok, deck, errors, warnings }
 *   errors   = reasons the deck was rejected (clear, human sentences);  warnings = things that were dropped / shortened or need the owner's care.
 *   deck     = a clean deck (always with the disclaimer slide appended) when ok.
 */
export function sanitizeDeck(raw, { prefix = 'user-' } = {}) {
  const errors = [], warnings = [];
  let src = raw;
  if (typeof raw === 'string') {
    if (raw.length > LIMITS.maxInput) return { ok: false, deck: null, errors: [`The text is too long (${raw.length} characters; the limit is ${LIMITS.maxInput}).`], warnings };
    try { src = JSON.parse(raw); } catch (e) { return { ok: false, deck: null, errors: ['This is not valid JSON: ' + cleanText(e && e.message, 120)], warnings }; }
  }
  if (!isObj(src)) return { ok: false, deck: null, errors: ['A deck must be a JSON object with a "title" and a "slides" list.'], warnings };
  const title = cleanBilingual(src.title, LIMITS.maxDeckTitle);
  if (!title) errors.push('The deck needs a "title".');
  if (!Array.isArray(src.slides)) errors.push('The deck needs a "slides" list.');
  else if (!src.slides.length) errors.push('The deck needs at least one slide.');
  if (errors.length) return { ok: false, deck: null, errors, warnings };
  let list = src.slides; if (list.length > LIMITS.maxSlides) { errors.push(`Too many slides (${list.length}; the limit is ${LIMITS.maxSlides}).`); return { ok: false, deck: null, errors, warnings }; }
  const seen = new Set(), slides = [];
  list.forEach((rs, i) => {
    const at = `Slide ${i + 1}`;
    if (!isObj(rs)) { errors.push(`${at} is not an object.`); return; }
    const st = cleanBilingual(rs.title, LIMITS.maxSlideTitle); if (!st) { errors.push(`${at} needs a "title".`); return; }
    if (rs.title && JSON.stringify(rs.title).length > LIMITS.maxSlideTitle * 6) warnings.push(`${at}: the title was shortened.`);
    let id = slug(rs.id || L(st, 'en'), 'slide-' + (i + 1)); if (id === DISCLAIMER_SLIDE_ID) id = 'slide-' + (i + 1); while (seen.has(id)) id += '-' + (i + 1); seen.add(id);
    const s = { id, title: st };
    const lead = cleanBilingual(rs.lead, LIMITS.maxLead); if (lead) s.lead = lead;
    const bl = arr(rs.bullets); if (bl.length > LIMITS.maxBullets) warnings.push(`${at}: only the first ${LIMITS.maxBullets} bullets are kept.`);
    s.bullets = bl.slice(0, LIMITS.maxBullets).map((b) => cleanBilingual(b, LIMITS.maxBullet)).filter(Boolean);
    s.blocks = [];
    const blocks = arr(rs.blocks); if (blocks.length > LIMITS.maxBlocks) warnings.push(`${at}: only the first ${LIMITS.maxBlocks} blocks are kept.`);
    blocks.slice(0, LIMITS.maxBlocks).forEach((rb, j) => { const r = cleanBlock(rb, `${at}, block ${j + 1}`, warnings, errors); if (r) s.blocks.push(r); });
    s.links = [];
    arr(rs.links).slice(0, LIMITS.maxLinks).forEach((rl, j) => {
      const label = isObj(rl) ? cleanBilingual(rl.label, 60) : null, route = isObj(rl) ? cleanRoute(rl.route) : '';
      if (!label || !route) errors.push(`${at}, link ${j + 1}: only the site's own pages can be linked (${ROUTE_WHITELIST.join(', ')}), with a label. External links are not allowed.`); else s.links.push({ label, route });
    });
    if (rs.accent !== undefined) { if (ACCENTS.includes(rs.accent)) s.accent = rs.accent; else warnings.push(`${at}: accent "${cleanText(rs.accent, 20)}" is not one of ${ACCENTS.join(', ')}; the default is used.`); }
    const so = cleanBilingual(rs.source, LIMITS.maxSource); if (so) s.source = so;
    if (rs.illustrative === true) s.illustrative = true;
    slides.push(s);
  });
  if (errors.length) return { ok: false, deck: null, errors, warnings };
  const deck = { id: slug(src.id || L(title, 'en'), 'deck'), title, slides };
  if (!deck.id.startsWith(prefix)) deck.id = (prefix + deck.id).slice(0, LIMITS.maxId + prefix.length);
  const fin = deckWarnings(deck); warnings.push(...fin);
  return { ok: true, deck: withDisclaimer(deck), errors, warnings };
}
function cleanBlock(rb, at, warnings, errors) {
  if (!isObj(rb)) { errors.push(`${at} is not an object.`); return null; }
  const out = { type: rb.type }, so = cleanBilingual(rb.source, LIMITS.maxSource); if (so) out.source = so; if (rb.illustrative === true) out.illustrative = true;
  if (rb.type === 'image') {
    const u = cleanImageUrl(rb.url); if (!u) { errors.push(`${at}: an image needs a valid https:// address (no http, data:, javascript: or file addresses).`); return null; }
    out.url = u; out.alt = cleanBilingual(rb.alt, LIMITS.maxAlt) || { en: 'Image', ar: 'صورة' }; const c = cleanBilingual(rb.caption, LIMITS.maxCaption); if (c) out.caption = c; return out;
  }
  if (rb.type === 'table') {
    const rows = arr(rb.rows).slice(0, LIMITS.maxTableRows).map((r) => arr(r).slice(0, LIMITS.maxTableCols).map((c) => cleanBilingual(c, LIMITS.maxCell) || { en: '', ar: '' }));
    if (!rows.length || !rows.some((r) => r.length)) { errors.push(`${at}: a table needs "rows" (a list of lists of text).`); return null; }
    if (arr(rb.rows).length > LIMITS.maxTableRows) warnings.push(`${at}: only the first ${LIMITS.maxTableRows} table rows are kept.`);
    const cols = Math.max(...rows.map((r) => r.length)); out.rows = rows.map((r) => { const p = r.slice(); while (p.length < cols) p.push({ en: '', ar: '' }); return p; });
    const head = arr(rb.head).slice(0, LIMITS.maxTableCols).map((c) => cleanBilingual(c, LIMITS.maxCell) || { en: '', ar: '' }); if (head.length) { while (head.length < cols) head.push({ en: '', ar: '' }); out.head = head.slice(0, cols); }
    return out;
  }
  if (rb.type === 'bar') {
    const data = []; arr(rb.data).slice(0, LIMITS.maxBars).forEach((d, k) => {
      const label = isObj(d) ? cleanBilingual(d.label, LIMITS.maxLabel) : null, v = isObj(d) ? (typeof d.value === 'number' ? d.value : (typeof d.value === 'string' && d.value.trim() !== '' ? Number(d.value) : NaN)) : NaN;
      if (!label || !Number.isFinite(v) || v < 0 || v > 1e12) errors.push(`${at}, bar ${k + 1}: each bar needs a "label" and a "value" that is a number from 0 up.`); else data.push({ label, value: v });
    });
    if (arr(rb.data).length > LIMITS.maxBars) warnings.push(`${at}: only the first ${LIMITS.maxBars} bars are kept.`);
    if (!data.length) { if (!errors.length) errors.push(`${at}: a bar chart needs "data" with at least one bar.`); return null; }
    out.data = data; const t = cleanBilingual(rb.title, 60); if (t) out.title = t; const un = cleanText(rb.unit, LIMITS.maxUnit); if (un) out.unit = un;
    return out;
  }
  errors.push(`${at}: block type "${cleanText(rb.type, 20)}" is not supported (use image, table or bar).`); return null;
}
const slideTexts = (s) => { const o = []; const add = (t) => { if (t) o.push(t.en, t.ar); }; add(s.title); add(s.lead); (s.bullets || []).forEach(add); add(s.source); (s.blocks || []).forEach((b) => { add(b.title); add(b.caption); add(b.source); (b.head || []).forEach(add); (b.rows || []).forEach((r) => r.forEach(add)); (b.data || []).forEach((d) => { add(d.label); o.push(String(d.value)); }); }); return o; };
/** non-blocking notes for the owner: financial wording, charts / tables with no source and not marked illustrative */
export function deckWarnings(deck) {
  const w = [];
  deck.slides.forEach((s, i) => {
    if (FORBIDDEN_FINANCIAL.test(slideTexts(s).join(' | '))) w.push(`Slide ${i + 1} contains financial wording or figures (returns, valuation, percentages, amounts...). You are responsible for their accuracy.`);
    (s.blocks || []).forEach((b) => { if ((b.type === 'bar' || b.type === 'table') && !b.source && !s.source && !b.illustrative && !s.illustrative) w.push(`Slide ${i + 1}: a ${b.type === 'bar' ? 'chart' : 'table'} has no "source" and is not marked "illustrative".`); });
  });
  return w;
}

// ---------------------------------------------------------------- the disclaimer is never optional
export const disclaimerSlide = () => ({ id: DISCLAIMER_SLIDE_ID, title: DISCLAIMER_TITLE, bullets: [DISCLAIMER], blocks: [], links: [], disclaimer: true });
/** a slide that already carries the disclaimer (the built-in "invest" and "briefing" stations draw it themselves: they are flagged `disclaimer: true`) */
export const slideHasDisclaimer = (s) => !!s && (s.disclaimer === true || (s.bullets || []).some((b) => b && b.en === DISCLAIMER.en));
/** returns the deck with the disclaimer as its FINAL slide (idempotent; any user slide pretending to be the disclaimer id was renamed by sanitizeDeck) */
export function withDisclaimer(deck) {
  const slides = deck.slides.slice(); const last = slides[slides.length - 1];
  if (!slideHasDisclaimer(last)) slides.push(disclaimerSlide());
  return { ...deck, slides };
}
export const deckHasDisclaimer = (deck) => !!deck && Array.isArray(deck.slides) && slideHasDisclaimer(deck.slides[deck.slides.length - 1]);

// ---------------------------------------------------------------- {{fact:key}} tokens
const CONTESTED_KEYS = ['yearsOfCraft', 'homesDelivered', 'productionModel', 'showroomCount'];
/** resolve one token to { en, ar } (placeholder while the fact is not confirmed) */
export function resolveFact(key, facts = FACTS, has = hasFact) {
  if (!FACT_KEYS.includes(key)) return PLACEHOLDER;
  const ok = facts === FACTS && CONTESTED_KEYS.includes(key) ? has(key) : facts[key] !== null && facts[key] !== undefined && facts[key] !== '';
  if (!ok) return PLACEHOLDER;
  const v = facts[key]; return isObj(v) ? { en: str(v.en), ar: str(v.ar || v.en) } : { en: String(v), ar: String(v) };
}
/** Text with tokens -> plain string in `lang` */
export function resolveText(t, lang, facts = FACTS, has = hasFact) {
  return L(t, lang).replace(/\{\{\s*fact\s*:\s*([A-Za-z]+)\s*\}\}/g, (m, k) => L(resolveFact(k, facts, has), lang));
}
/** the deck as it is shown: every Text turned into a string for `lang`, tokens resolved, blocks / links kept */
export function resolveDeck(deck, lang = 'en', facts = FACTS, has = hasFact) {
  const R = (t) => resolveText(t, lang, facts, has);
  return {
    id: deck.id, title: R(deck.title), unit: deck.unit || 'slide', builtin: !!deck.builtin,
    slides: deck.slides.map((s) => ({
      id: s.id, title: R(s.title), lead: s.lead ? R(s.lead) : '', bullets: (s.bullets || []).map(R), accent: s.accent || '', disclaimer: slideHasDisclaimer(s), builtin: s.builtin || '', source: s.source ? R(s.source) : '', illustrative: !!s.illustrative,
      links: (s.links || []).map((l) => ({ label: R(l.label), route: l.route })),
      blocks: (s.blocks || []).map((b) => ({ ...b, alt: b.alt ? R(b.alt) : undefined, caption: b.caption ? R(b.caption) : undefined, title: b.title ? R(b.title) : undefined, source: b.source ? R(b.source) : undefined,
        head: b.head ? b.head.map(R) : undefined, rows: b.rows ? b.rows.map((r) => r.map(R)) : undefined, data: b.data ? b.data.map((d) => ({ label: R(d.label), value: d.value })) : undefined })),
    })),
  };
}
