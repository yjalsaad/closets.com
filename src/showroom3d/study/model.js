/* YAS WOOD study: the content model, its sanitiser and the pure edit helpers. PURE: no DOM, no storage, no network.
 *
 *   Study   = { v: 1, id, title, subtitle?, meta?, sample?: true, rate?: number, sections: Section[] }
 *   Section = { id, part?: 'dashboard' | 'full', kicker?, title, lead?, blocks: Block[] }
 *   Block   = { id, type, ... } with type one of
 *     paragraph { text }                         bullets  { title?, items: string[], ordered? }
 *     stats     { items: [{ label, value, note?, usd?, detail? }] }                      (value is TEXT, kept exactly as written)
 *     cards     { title?, items: [{ title, tag?, text?, imageId?, detail? }] }           (detail = { desc?, metrics: [{ label, val }], bullets: string[] })
 *     table     { title?, head: string[], rows: string[][], note? }
 *     chart     { title?, kind: 'bar' | 'hbar' | 'donut' | 'combo', unit?, labels: string[], series: [{ name, values: number[], line?: boolean }], note? }
 *     lists     { title?, groups: [{ title, items: string[] }] }
 *     kv        { title?, items: [{ k, v }] }
 *     callout   { title?, text }
 *     image     { imageId?, alt?, caption? }
 *     simulator { title?, base: { rev, cogsPct, intRate, otherOpexPct, depreciation, loan, principal, maint, tax, minDscr }, note? }
 *
 * Every string goes through cleanText() from the VIP deck sanitiser (tags, script blocks, control and bidi-override characters removed, whitespace
 * collapsed, capped): edited or imported text can never carry markup. Images are never part of the study: only an `imageId` (a-z, 0-9, dash) that
 * points into the device image store (imageStore.js). */
import { cleanText } from '../vip/deckSchema';

export const STUDY_VERSION = 1;
export const LIMITS = Object.freeze({
  maxChars: 400000, maxSections: 40, maxBlocks: 80, maxItems: 60, maxRows: 60, maxCols: 8, maxLabels: 24, maxSeries: 6, maxGroups: 6, maxBullets: 40,
  title: 160, short: 80, text: 1200, para: 3000, cell: 200, maxId: 48,
});
export const BLOCK_TYPES = ['paragraph', 'bullets', 'stats', 'cards', 'table', 'chart', 'lists', 'kv', 'callout', 'image', 'simulator'];
export const CHART_KINDS = ['bar', 'hbar', 'donut', 'combo'];
export const PARTS = ['dashboard', 'full'];
export const SIM_FIELDS = ['rev', 'cogsPct', 'intRate', 'otherOpexPct', 'depreciation', 'loan', 'principal', 'maint', 'tax', 'minDscr'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const T = (v, max) => cleanText(typeof v === 'number' ? String(v) : v, max);
const slug = (s, fb) => { const x = String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, LIMITS.maxId); return x || fb; };
export const IMAGE_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
let seq = 0;
/** a short unique id for sections / blocks / images created in the editor */
export const uid = (p = 'n') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
const num = (v, lo = -1e12, hi = 1e12) => { const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };

function cleanDetail(d, w) {
  if (!isObj(d)) return undefined;
  const out = { metrics: [], bullets: [] }; const desc = T(d.desc, LIMITS.text); if (desc) out.desc = desc;
  arr(d.metrics).slice(0, 12).forEach((m) => { if (isObj(m)) { const label = T(m.label, LIMITS.short), val = T(m.val, LIMITS.short); if (label || val) out.metrics.push({ label, val }); } });
  arr(d.bullets).slice(0, 12).forEach((b) => { const s = T(b, LIMITS.text); if (s) out.bullets.push(s); });
  return out.desc || out.metrics.length || out.bullets.length ? out : undefined;
}
const strList = (v, max, cap) => arr(v).slice(0, cap).map((x) => T(x, max)).filter((x) => x !== '');
function cleanBlock(rb, at, warnings, errors, ids) {
  if (!isObj(rb)) { errors.push(`${at}: not an object.`); return null; }
  if (!BLOCK_TYPES.includes(rb.type)) { errors.push(`${at}: block type "${T(rb.type, 20)}" is not supported (${BLOCK_TYPES.join(', ')}).`); return null; }
  let id = slug(rb.id, 'b' + ids.size); while (ids.has(id)) id += '-' + ids.size; ids.add(id);
  const b = { id, type: rb.type };
  const title = T(rb.title, LIMITS.title); if (title && rb.type !== 'paragraph' && rb.type !== 'stats' && rb.type !== 'image') b.title = title;
  switch (rb.type) {
    case 'paragraph': b.text = T(rb.text, LIMITS.para); break;
    case 'callout': b.text = T(rb.text, LIMITS.para); break;
    case 'bullets': b.items = strList(rb.items, LIMITS.text, LIMITS.maxBullets); if (rb.ordered === true) b.ordered = true; break;
    case 'stats': b.items = arr(rb.items).slice(0, LIMITS.maxItems).filter(isObj).map((x) => {
      const it = { label: T(x.label, LIMITS.short), value: T(x.value, LIMITS.short) }; const note = T(x.note, LIMITS.short); if (note) it.note = note;
      const usd = num(x.usd, 0); if (usd !== null) it.usd = usd; const d = cleanDetail(x.detail); if (d) it.detail = d; return it;
    }); break;
    case 'cards': b.items = arr(rb.items).slice(0, LIMITS.maxItems).filter(isObj).map((x) => {
      const it = { title: T(x.title, LIMITS.title) }; const tag = T(x.tag, LIMITS.short), text = T(x.text, LIMITS.text); if (tag) it.tag = tag; if (text) it.text = text;
      if (typeof x.imageId === 'string' && IMAGE_ID.test(x.imageId)) it.imageId = x.imageId; const alt = T(x.alt, LIMITS.short); if (alt) it.alt = alt;
      const d = cleanDetail(x.detail); if (d) it.detail = d; return it;
    }); break;
    case 'table': {
      let rows = arr(rb.rows).slice(0, LIMITS.maxRows).map((r) => arr(r).slice(0, LIMITS.maxCols).map((c) => T(c, LIMITS.cell)));
      if (arr(rb.rows).length > LIMITS.maxRows) warnings.push(`${at}: only the first ${LIMITS.maxRows} rows are kept.`);
      const head = arr(rb.head).slice(0, LIMITS.maxCols).map((c) => T(c, LIMITS.cell));
      const cols = Math.max(1, head.length, ...rows.map((r) => r.length)); rows = rows.map((r) => { const p = r.slice(); while (p.length < cols) p.push(''); return p; });
      while (head.length && head.length < cols) head.push(''); b.head = head; b.rows = rows; const note = T(rb.note, LIMITS.text); if (note) b.note = note; break;
    }
    case 'chart': {
      b.kind = CHART_KINDS.includes(rb.kind) ? rb.kind : 'bar'; const unit = T(rb.unit, 24); if (unit) b.unit = unit;
      b.labels = arr(rb.labels).slice(0, LIMITS.maxLabels).map((x) => T(x, LIMITS.short));
      b.series = arr(rb.series).slice(0, LIMITS.maxSeries).filter(isObj).map((s) => {
        const o = { name: T(s.name, LIMITS.short), values: b.labels.map((_, i) => { const n = num(arr(s.values)[i]); return n === null ? 0 : n; }) }; if (s.line === true) o.line = true; return o;
      });
      if (b.kind === 'donut' && b.series.length > 1) b.series = b.series.slice(0, 1);
      if (!b.series.length) b.series = [{ name: '', values: b.labels.map(() => 0) }];
      const note = T(rb.note, LIMITS.text); if (note) b.note = note; break;
    }
    case 'lists': b.groups = arr(rb.groups).slice(0, LIMITS.maxGroups).filter(isObj).map((g) => ({ title: T(g.title, LIMITS.short), items: strList(g.items, LIMITS.text, LIMITS.maxBullets) })); break;
    case 'kv': b.items = arr(rb.items).slice(0, LIMITS.maxItems).filter(isObj).map((x) => ({ k: T(x.k, LIMITS.short), v: T(x.v, LIMITS.text) })); break;
    case 'image': { if (typeof rb.imageId === 'string' && IMAGE_ID.test(rb.imageId)) b.imageId = rb.imageId; b.alt = T(rb.alt, LIMITS.short); const c = T(rb.caption, LIMITS.text); if (c) b.caption = c; break; }
    case 'simulator': {
      const base = isObj(rb.base) ? rb.base : {}; b.base = {}; SIM_FIELDS.forEach((k) => { const n = num(base[k], 0); b.base[k] = n === null ? 0 : n; });
      const note = T(rb.note, LIMITS.text); if (note) b.note = note; break;
    }
    default: break;
  }
  return b;
}

/** sanitizeStudy(raw) -> { ok, study, errors, warnings }. raw is an object or a JSON string; never throws. */
export function sanitizeStudy(raw) {
  const errors = [], warnings = []; let src = raw;
  if (typeof raw === 'string') {
    if (raw.length > LIMITS.maxChars) return { ok: false, study: null, errors: [`The file is too long (${raw.length} characters; the limit is ${LIMITS.maxChars}).`], warnings };
    try { src = JSON.parse(raw); } catch (e) { return { ok: false, study: null, errors: ['This is not valid JSON: ' + T(e && e.message, 120)], warnings }; }
  }
  if (isObj(src) && isObj(src.study) && !Array.isArray(src.sections)) src = src.study;   // an export bundle { study, images }
  if (!isObj(src)) return { ok: false, study: null, errors: ['A study must be a JSON object with a "title" and a "sections" list.'], warnings };
  const title = T(src.title, LIMITS.title); if (!title) errors.push('The study needs a "title".');
  if (!Array.isArray(src.sections) || !src.sections.length) errors.push('The study needs at least one section.');
  else if (src.sections.length > LIMITS.maxSections) errors.push(`Too many sections (${src.sections.length}; the limit is ${LIMITS.maxSections}).`);
  if (errors.length) return { ok: false, study: null, errors, warnings };
  const sids = new Set(), sections = [];
  src.sections.forEach((rs, i) => {
    const at = `Section ${i + 1}`; if (!isObj(rs)) { errors.push(`${at} is not an object.`); return; }
    const st = T(rs.title, LIMITS.title); if (!st) { errors.push(`${at} needs a "title".`); return; }
    let id = slug(rs.id, 's' + (i + 1)); while (sids.has(id)) id += '-' + (i + 1); sids.add(id);
    const s = { id, part: PARTS.includes(rs.part) ? rs.part : 'dashboard', title: st };
    const kicker = T(rs.kicker, LIMITS.short), lead = T(rs.lead, LIMITS.text); if (kicker) s.kicker = kicker; if (lead) s.lead = lead;
    const bl = arr(rs.blocks); if (bl.length > LIMITS.maxBlocks) warnings.push(`${at}: only the first ${LIMITS.maxBlocks} blocks are kept.`);
    const bids = new Set(); s.blocks = []; bl.slice(0, LIMITS.maxBlocks).forEach((rb, j) => { const r = cleanBlock(rb, `${at}, block ${j + 1}`, warnings, errors, bids); if (r) s.blocks.push(r); });
    sections.push(s);
  });
  if (errors.length) return { ok: false, study: null, errors, warnings };
  const study = { v: STUDY_VERSION, id: slug(src.id, 'yas-wood-study'), title, sections };
  const sub = T(src.subtitle, LIMITS.text), meta = T(src.meta, LIMITS.text); if (sub) study.subtitle = sub; if (meta) study.meta = meta;
  const rate = num(src.rate, 1, 1e7); if (rate !== null) study.rate = rate;
  if (src.sample === true) study.sample = true;
  return { ok: true, study, errors, warnings };
}

/** every imageId a study points to */
export function imageIds(study) {
  const out = new Set();
  ((study && study.sections) || []).forEach((s) => s.blocks.forEach((b) => { if (b.imageId) out.add(b.imageId); (b.items || []).forEach((it) => { if (it && it.imageId) out.add(it.imageId); }); }));
  return [...out];
}

// ---------------------------------------------------------------- immutable edit helpers (paths are arrays: ['sections', 1, 'blocks', 0, 'text'])
export const getAt = (o, path) => path.reduce((a, k) => (a == null ? undefined : a[k]), o);
export function setAt(o, path, value) {
  if (!path.length) return value; const [k, ...rest] = path;
  const copy = Array.isArray(o) ? o.slice() : { ...(o || {}) }; copy[k] = setAt(o == null ? undefined : o[k], rest, value); return copy;
}
export function insertAt(o, path, index, value) { const list = (getAt(o, path) || []).slice(); list.splice(Math.max(0, Math.min(index, list.length)), 0, value); return setAt(o, path, list); }
export function removeAt(o, path, index) { const list = (getAt(o, path) || []).slice(); if (index < 0 || index >= list.length) return o; list.splice(index, 1); return setAt(o, path, list); }
export function moveAt(o, path, index, delta) {
  const list = (getAt(o, path) || []).slice(), to = index + delta; if (index < 0 || index >= list.length || to < 0 || to >= list.length) return o;
  const [x] = list.splice(index, 1); list.splice(to, 0, x); return setAt(o, path, list);
}
/** edit a text leaf: the value is sanitised exactly as on import (cap by the field's kind) */
export function cleanLeaf(value, kind = 'text') { return T(value, kind === 'para' ? LIMITS.para : kind === 'title' ? LIMITS.title : kind === 'cell' ? LIMITS.cell : kind === 'short' ? LIMITS.short : LIMITS.text); }
export function cleanNumber(value) { const n = num(value); return n === null ? null : n; }

/** a new, empty block of a type (what "Add block" inserts) */
export function newBlock(type) {
  const id = uid('b');
  switch (type) {
    case 'paragraph': return { id, type, text: 'نص جديد' };
    case 'bullets': return { id, type, title: '', items: ['نقطة جديدة'] };
    case 'stats': return { id, type, items: [{ label: 'عنوان', value: '0' }] };
    case 'cards': return { id, type, title: '', items: [{ title: 'بطاقة جديدة', text: '' }] };
    case 'table': return { id, type, title: '', head: ['العمود 1', 'العمود 2'], rows: [['', '']] };
    case 'chart': return { id, type, title: '', kind: 'bar', unit: '', labels: ['أ', 'ب', 'ج'], series: [{ name: 'السلسلة', values: [1, 2, 3] }] };
    case 'lists': return { id, type, title: '', groups: [{ title: 'مجموعة', items: ['عنصر'] }] };
    case 'kv': return { id, type, title: '', items: [{ k: 'البند', v: 'القيمة' }] };
    case 'callout': return { id, type, title: '', text: 'ملاحظة' };
    case 'image': return { id, type, alt: '', caption: '' };
    case 'simulator': return { id, type, title: '', base: { rev: 0, cogsPct: 0, intRate: 0, otherOpexPct: 0, depreciation: 0, loan: 0, principal: 0, maint: 0, tax: 15, minDscr: 1.35 } };
    default: return null;
  }
}
export const newSection = (part = 'dashboard') => ({ id: uid('s'), part, title: 'قسم جديد', blocks: [] });
