/* VENDORED for the add-only YAS Bloom port (docs/showroom3d/ADDON-PORT.md). Copy of the website-integration branch file; kept here so the main site needs no changes. Do not import from the rest of the app. */
// sanitize.js — coerce CMS / product / banner rows at the boundary so one malformed row
// (object where a string is expected, null name, NaN price) can never reach a renderer
// that calls .split / .toLowerCase / renders an object as a React child.
export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** string-or-fallback: numbers/booleans stringified, everything else (object, array, null) -> fallback */
export function str(v, fb = '') {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return String(v);
  return fb;
}
export function num(v, fb = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fb;
}
export const arr = (v) => (Array.isArray(v) ? v : []);
/** http(s) / site-relative / data:image URL only; anything else -> '' (blocks javascript: and objects) */
export function url(v) {
  const s = str(v).trim();
  return /^(https?:\/\/|\/(?!\/)|data:image\/)/i.test(s) ? s : '';
}

/** Copy of `row` with the named keys coerced. Unknown keys pass through untouched. */
export function cleanRow(row, { strings = [], numbers = [], urls = [], arrays = [] } = {}) {
  if (!isObj(row)) return null;
  const out = { ...row };
  strings.forEach((k) => { if (k in out) out[k] = str(out[k]); });
  numbers.forEach((k) => { if (k in out) out[k] = num(out[k]); });
  urls.forEach((k) => { if (k in out) out[k] = url(out[k]); });
  arrays.forEach((k) => { if (k in out) out[k] = arr(out[k]); });
  return out;
}
/** Map + drop rows that are not objects; optional keep() predicate. Never throws, never returns non-arrays. */
export function cleanRows(list, spec, keep) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const r of list) { const c = cleanRow(r, spec); if (c && (!keep || keep(c))) out.push(c); }
  return out;
}

const PRODUCT = { strings: ['name', 'category', 'description', 'badge', 'sku', 'subtitle', 'tagline', 'material', 'finish', 'name_ar', 'description_ar', 'id'], numbers: ['price', 'old_price', 'sort_order', 'rating'], urls: ['image_url'], arrays: ['images', 'gallery', 'tags', 'features'] };
export const sanitizeProducts = (l) => cleanRows(l, PRODUCT, (p) => p.id !== '' || p.name !== '');
const BANNER = { strings: ['title', 'subtitle', 'cta', 'cta_label', 'link', 'title_ar', 'subtitle_ar', 'eyebrow'], urls: ['image_url', 'video_url'], numbers: ['sort_order'] };
export const sanitizeBanners = (l) => cleanRows(l, BANNER);
const TESTI = { strings: ['name', 'author', 'quote', 'text', 'body', 'location', 'role', 'product', 'quote_ar'], numbers: ['rating', 'sort_order'], urls: ['image_url', 'avatar_url'] };
export const sanitizeTestimonials = (l) => cleanRows(l, TESTI);
const PROJECT = { strings: ['title', 'name', 'category', 'location', 'description', 'summary', 'title_ar'], numbers: ['sort_order'], urls: ['image_url', 'cover_url'], arrays: ['images', 'gallery'] };
export const sanitizeProjects = (l) => cleanRows(l, PROJECT);
const GENERIC_TEXT = { strings: ['title', 'name', 'q', 'a', 'question', 'answer', 'label', 'description', 'subtitle', 'category', 'location', 'title_en', 'title_ar', 'sub_en', 'sub_ar', 'route'], numbers: ['sort_order'], urls: ['image_url'] };   // price / discount are left alone here: they can legitimately be text such as '20%' or 'From 100'
/** for any other CMS-driven list (faqs, jobs, offers, room cards, ...) */
export const sanitizeRows = (l) => cleanRows(l, GENERIC_TEXT);

/** website_content value -> string or '' (so cms(key).split is always safe) */
export const cmsValue = (v) => str(v, '');
