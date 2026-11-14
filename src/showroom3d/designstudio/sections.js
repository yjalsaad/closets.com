/* Design Studio SECTIONS: the registry that makes "walk up to a big screen and design it" repeatable. PURE data (no three.js, no DOM), unit-tested.
 *
 * A section is one station of the showroom where the visitor opens one of the WEBSITE's own designers on a big canvas. The designer is never re-implemented:
 * the section only names the site route to open (same-origin full-viewport frame, see DESIGNER-EMBED in docs/showroom3d/KITCHEN-STUDIO.md), so the options, the
 * features, the BHD prices and the quote hand-off are the website's by construction.
 *
 * To add a section (wardrobe, TV unit, doors, home office, visualizer): add one entry here (copy `kitchen`), give it a free slot in layout.js SLOTS, ship its poster
 * frames (scripts/showroom3d-qa/studio-posters.js <id>) and add the Playwright check. Nothing else is kitchen-specific: the zone, collider, quick-nav stop, menu entry,
 * HUD prompt, adviser intent, overlay, pause / resume and tests all read this list. Only `kitchen` is enabled today (`enabled: true`). */

const N = (en, ar) => ({ en, ar });

/** the brand line under every station sign (identical to the hall's column plates / reception: BRAND_LINE in scenes/main-hall/hall.js) */
export const BYLINE = N('by YAS WOOD', 'من ياس وود');

export const SECTIONS = [
  {
    id: 'kitchen-studio',
    kind: 'kitchen',
    enabled: true,
    slot: 'left-wing',
    name: N('Kitchen Design Studio', 'استوديو تصميم المطابخ'),
    /** the website route that IS the designer (src/App.js PATH_TO_PAGE: '/design-studio/kitchen-planner' -> KitchenPlannerWizard) */
    designer: { path: '/design-studio/kitchen-planner', siteName: N('3D kitchen planner', 'مخطّط المطابخ ثلاثي الأبعاد') },
    /** which showroom adviser talks about it (staff/roster.js id) */
    adviser: 'kitchens',
    /** the attract loop on the wall screen: poster frames (public/yas-bloom/design-studio/<name>-<n>-<lang>.webp), real screenshots of the designer */
    poster: { base: 'kitchen', frames: 3 },
    /** words the advisers listen for (normalised: lower-case, Arabic letters unified; see logic.js norm()) */
    keywords: {
      open: ['start designing', 'design my kitchen', 'design a kitchen', 'plan my kitchen', 'kitchen planner', 'kitchen designer', 'صمم مطبخي', 'صمم مطبخ', 'ابدا التصميم', 'مصمم المطابخ', 'مخطط المطابخ'],
      go: ['design studio', 'kitchen studio', 'kitchen design studio', 'design wall', 'big screen', 'استوديو تصميم', 'استوديو المطابخ', 'شاشه التصميم'],
    },
  },
];

export const enabledSections = (list = SECTIONS) => list.filter((s) => s && s.enabled);
export const sectionById = (id, list = SECTIONS) => list.find((s) => s.id === id) || null;
export const sectionByKind = (kind, list = SECTIONS) => list.find((s) => s.kind === kind) || null;
export const sectionName = (s, lang) => (s ? (lang === 'ar' ? s.name.ar : s.name.en) : '');
/** the entry the department quick-nav menu / HUD prompt use (same shape as DEPARTMENTS / COLLECTIONS_DEPT) */
export const sectionDept = (s) => ({ id: s.id, en: s.name.en, ar: s.name.ar, designStudio: true });
export const SECTION_DEPTS = enabledSections().map(sectionDept);

/** poster frame URLs for a section + language (served from public/yas-bloom/design-studio/) */
export function posterUrls(s, lang, base = (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL ? process.env.PUBLIC_URL : '')) {
  const L = lang === 'ar' ? 'ar' : 'en', out = [];
  for (let i = 1; i <= s.poster.frames; i++) out.push(`${base}/yas-bloom/design-studio/${s.poster.base}-${i}-${L}.webp`);
  return out;
}
