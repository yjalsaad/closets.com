/* The five executive offices of Floor 2 (Bloom Meeting): titles only, no person names, no photos. PURE config.
 *
 * `options` is the owner's hook: each office has an `options` array that is drawn on the small wall panel inside the office. It is EMPTY by default, which shows
 * "Options coming soon / الخيارات قريبًا". To add options later, put entries in the array (EN + AR), e.g.
 *     options: [{ id: 'dashboard', title: { en: 'Operations dashboard', ar: 'لوحة العمليات' }, note: { en: 'Live KPIs', ar: 'مؤشرات مباشرة' } }]
 * (at most 6 are drawn; `note` is optional). Nothing else needs to change: the panel, the layout and the tests read this file.
 * `accent` is the colour of the office's own accent light (a Bloom / collection colour, 3D palette only). */
import { BLOOM_LIGHT } from './palette';

const T = (en, ar) => ({ en, ar });
export const OFFICES = [
  { id: 'it', title: T('IT Head', 'رئيس تقنية المعلومات'), accent: BLOOM_LIGHT.orange, options: [] },
  { id: 'ops', title: T('Operations Head', 'رئيس العمليات'), accent: BLOOM_LIGHT.brass, options: [] },
  { id: 'managing-partner', title: T('Managing Partner', 'الشريك المدير'), accent: BLOOM_LIGHT.cream, options: [] },
  { id: 'managing-director', title: T('Managing Director', 'المدير العام'), accent: BLOOM_LIGHT.warm, options: [] },
  { id: 'strategy', title: T('Partner Strategy', 'شريك الاستراتيجية'), accent: BLOOM_LIGHT.orange, options: [] },
];
export const OPTIONS_SOON = T('Options coming soon', 'الخيارات قريبًا');
export const MAX_OPTIONS = 6;
/** the options shown on an office's wall panel: at most MAX_OPTIONS, each { title, note? } with both languages; anything malformed is dropped */
export function officeOptions(office) {
  const ok = (v) => v && typeof v.en === 'string' && typeof v.ar === 'string' && v.en.trim() && v.ar.trim();
  return (Array.isArray(office && office.options) ? office.options : []).filter((o) => o && ok(o.title)).slice(0, MAX_OPTIONS).map((o) => ({ id: String(o.id || ''), title: o.title, note: ok(o.note) ? o.note : null }));
}
