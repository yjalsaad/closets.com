/* URL builders for the EXISTING site flows. Nothing here talks to a backend: it only builds a link to a page that already exists.
 *  - the booking / consultation page (/booking, src/pages/BookingPage.jsx). It understands ?interest= (one of its own interest values) and
 *    ?notes= (pre-filled into the notes box, editable) since this release; the visitor still reviews and submits the form themselves.
 *  - the Ikhtarha campaign shell (/campaign/ikhtarha, /campaign/ikhtarha/demo): separate app shell, not localised by URL (see seo/routes.js). */
import { withLang } from '../../seo/routes';

/** showroom department -> the booking form's own English "interest" option */
export const INTEREST = { kitchen: 'Kitchen', wardrobe: 'Wardrobe', door: 'Doors' };
export const NOTES_MAX = 600;

export const BOOKING_PATH = '/booking';
export const IKHTARHA_PLAY = '/campaign/ikhtarha';
export const IKHTARHA_DEMO = '/campaign/ikhtarha/demo';

const clean = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * @param {{product: string, productName?: string, finishId?: string, finishName?: string, lang?: string}} o
 * @returns {string} site-relative URL, e.g. /booking?interest=Kitchen&source=showroom-3d&finish=oak-white-stone&notes=...
 */
export function buildQuoteUrl({ product, productName = '', finishId = '', finishName = '', lang = 'en' } = {}) {
  const L = lang === 'ar' ? 'ar' : 'en';
  const q = new URLSearchParams();
  if (INTEREST[product]) q.set('interest', INTEREST[product]);
  q.set('source', 'showroom-3d');
  if (finishId) q.set('finish', clean(finishId).slice(0, 40));
  const bits = [L === 'ar' ? 'من المعرض الافتراضي (نموذج تصميم، وليس عرض سعر)' : 'From the virtual showroom (sample configuration, not a quotation)'];
  if (productName) bits.push((L === 'ar' ? 'المنتج: ' : 'Product: ') + clean(productName));
  if (finishName) bits.push((L === 'ar' ? 'التشطيب: ' : 'Finish: ') + clean(finishName));
  q.set('notes', bits.join('. ').slice(0, NOTES_MAX));
  return withLang(BOOKING_PATH, L) + '?' + q.toString();
}

/** campaign CTAs: price your design (existing booking page, generic), play (needs a code), demo (sample game, nothing saved) */
export function campaignLinks(lang = 'en') {
  const L = lang === 'ar' ? 'ar' : 'en';
  const q = new URLSearchParams({ source: 'showroom-3d-ikhtarha' });
  return { price: withLang(BOOKING_PATH, L) + '?' + q.toString(), play: IKHTARHA_PLAY + (L === 'en' ? '?lang=en' : ''), demo: IKHTARHA_DEMO + (L === 'en' ? '?lang=en' : '') };
}

/** read the prefill the booking page honours (kept here so the page and the tests share one parser). Unknown interests are dropped. */
export function parseBookingPrefill(search = '') {
  const q = new URLSearchParams(search);
  const interest = Object.values(INTEREST).includes(q.get('interest')) ? q.get('interest') : null;
  const notes = clean(q.get('notes')).slice(0, NOTES_MAX);
  return { interest, notes: notes || null };
}
