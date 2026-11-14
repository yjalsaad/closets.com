/* Collections panel logic. PURE (unit-tested): gallery stepping, the booking hand-off link, and the advisers' "collections" intent. */
import { withLang } from '../vendor/routes';
import { BOOKING_PATH, NOTES_MAX } from '../products/quote';
import { COLLECTIONS } from './data';
import { COLLECTIONS_ID } from './layout';
import { ct } from './strings';

export const collectionById = (id) => COLLECTIONS.find((c) => c.id === id) || null;
export const itemById = (col, id) => (col ? col.items.find((x) => x.id === id) || null : null);
export const pickL = (o, lang) => (o ? (lang === 'ar' ? o.ar || o.en : o.en) : '');
/** "Kaiser Walnut 102019 TX04" (finish names and codes are Latin on the site in both languages) */
export const itemLabel = (it) => (it ? [it.name.en, it.code].filter(Boolean).join(' ') : '');

/** next index in the gallery; wraps. dir = +1 / -1 */
export const stepIndex = (i, dir, n) => (n > 0 ? ((i + dir) % n + n) % n : 0);
/** arrow keys follow the reading direction: in RTL the left arrow goes forward */
export function keyStep(key, rtl = false) {
  if (key === 'ArrowRight') return rtl ? -1 : 1;
  if (key === 'ArrowLeft') return rtl ? 1 : -1;
  if (key === 'Home') return 'first'; if (key === 'End') return 'last';
  return 0;
}
/** horizontal swipe -> step (0 when the gesture is too short or mostly vertical). A swipe toward the start edge goes forward. */
export function swipeStep(dx, dy, rtl = false, min = 40) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.2) return 0;
  const fwd = dx < 0 ? 1 : -1; return rtl ? -fwd : fwd;
}

/**
 * Booking hand-off (the EXISTING /booking page: ?interest= one of its own options, ?notes= pre-filled and editable). The interest text is
 * controlled: only a collection / finish that exists in data.js can reach the URL, never free text.
 * @returns {string|null} site-relative URL, or null for an unknown collection
 */
export function buildCollectionQuoteUrl({ collectionId, itemId = null, lang = 'en' } = {}) {
  const col = collectionById(collectionId); if (!col) return null;
  const L = lang === 'ar' ? 'ar' : 'en', it = itemById(col, itemId), q = new URLSearchParams();
  q.set('interest', 'Other'); q.set('source', 'showroom-3d-collections'); q.set('collection', col.id); if (it) q.set('finish', it.id.slice(0, 40));
  const bits = [L === 'ar' ? 'من المعرض الافتراضي (استفسار عن تشطيب، وليس عرض سعر)' : 'From the virtual showroom (finish enquiry, not a quotation)',
    (L === 'ar' ? 'المجموعة: ' : 'Collection: ') + `${col.brand} ${pickL(col.name, L)}`];
  if (it) bits.push((L === 'ar' ? 'التشطيب: ' : 'Finish: ') + itemLabel(it));
  q.set('notes', bits.join('. ').slice(0, NOTES_MAX));
  return withLang(BOOKING_PATH, L) + '?' + q.toString();
}

/* ---- the advisers' "collections" intent ("show me the collections" / "اعرض المجموعات") ---- */
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const KW = ['collection', 'swatch', 'مجموعات', 'مجموعه', 'المجموع'];
export const isCollectionsIntent = (text) => { const n = norm(text); return n === '#go:' + COLLECTIONS_ID || KW.some((k) => n.includes(k)); };
/** a reply in the shape staff/guide.js `reply()` returns, or null when the words are not about the collections */
export function collectionsReply(input, { lang = 'en', memory = {} } = {}) {
  if (!isCollectionsIntent(input)) return null;
  const L = lang === 'ar' ? 'ar' : 'en', glide = { type: 'glide', id: COLLECTIONS_ID, label: { en: ct('guideGo', 'en'), ar: ct('guideGo', 'ar') } };
  return { intent: 'collections', text: ct('guideReply', L), chips: [], actions: [glide], memory: { ...memory, turns: (memory.turns || 0) + 1 }, askAi: false, auto: glide };
}
/** the entry for the Reception adviser's service list (same shape as guide.js `services()` items) */
export const collectionsService = (lang = 'en') => ({ id: COLLECTIONS_ID, label: ct('title', lang), blurb: ct('guideBlurb', lang), room: COLLECTIONS_ID, href: null });
