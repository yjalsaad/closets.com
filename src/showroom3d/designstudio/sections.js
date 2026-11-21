/* Design Studio SECTIONS: the registry that makes "walk up to a big screen and design it" repeatable. PURE data (no three.js, no DOM), unit-tested.
 *
 * A section is one station of the showroom where the visitor opens one of the WEBSITE's own designers on a big canvas. The designer is never re-implemented:
 * the section only names the site route to open (same-origin full-viewport frame, see DESIGNER-EMBED in docs/showroom3d/KITCHEN-STUDIO.md), so the options, the
 * features, the BHD prices and the quote hand-off are the website's by construction.
 *
 * To add a section (wardrobe, TV unit, doors, home office, visualizer): add one entry here (copy `kitchen`), give it a free slot in layout.js SLOTS, ship its poster
 * frames (scripts/showroom3d-qa/studio-posters.js <id>) and add the Playwright check. Nothing else is kitchen-specific: the zone, collider, quick-nav stop, menu entry,
 * HUD prompt, adviser intent, overlay, pause / resume and tests all read this list. `kitchen` and `tv` are enabled today (`enabled: true`).
 *
 * SHARED WALL: the hall has one free wall (the left front wing). Sections with the same `slot` share ONE station (one screen, one podium, one collider, one zone); the screen loops
 * every section's poster frames, the podium tablet offers one button per section, and E / Interact opens a small chooser unless the visitor already named a section (quick-nav
 * entry, adviser, tablet button). With a single enabled section everything behaves exactly as the original Kitchen Design Studio. */

const N = (en, ar) => ({ en, ar });

/** the brand line under every station sign (identical to the hall's column plates / reception: BRAND_LINE in scenes/main-hall/hall.js) */
export const BYLINE = N('by YAS WOOD', 'من ياس وود');

/** the neutral per-section embed settings: the website's classic planner pages (src/App.js) sit under a 104 px header on desktop / 72 px on phones and need a signed-in customer */
export const EMBED_CLASSIC = { shift: { desktop: 104, mobile: 72 }, css: 'nav,footer{display:none!important}html{overflow:hidden!important}' };

export const SECTIONS = [
  {
    id: 'kitchen-studio',
    kind: 'kitchen',
    enabled: true,
    slot: 'left-wing',
    name: N('Kitchen Design Studio', 'استوديو تصميم المطابخ'),
    short: N('Kitchen', 'مطبخ'),
    /** the website route that IS the designer (src/App.js PATH_TO_PAGE: '/design-studio/kitchen-planner' -> KitchenPlannerWizard) */
    designer: { path: '/design-studio/kitchen-planner', siteName: N('3D kitchen planner', 'مخطّط المطابخ ثلاثي الأبعاد'),
      /** the website gates this page to signed-in customers (App.js PLANNER_PAGES): the loading screen tells a signed-out visitor */
      auth: { required: true, key: 'closets_user' }, embed: EMBED_CLASSIC },
    /** which showroom adviser talks about it (staff/roster.js id) */
    adviser: 'kitchens',
    /** the attract loop on the wall screen: poster frames (public/yas-bloom/design-studio/<name>-<n>-<lang>.webp), real screenshots of the designer */
    poster: { base: 'kitchen', frames: 3 },
    /** words the advisers listen for (normalised: lower-case, Arabic letters unified; see logic.js norm()) */
    keywords: {
      open: ['design my kitchen', 'design a kitchen', 'plan my kitchen', 'kitchen planner', 'kitchen designer', 'صمم مطبخي', 'صمم مطبخ', 'ابدا التصميم', 'مصمم المطابخ', 'مخطط المطابخ'],
      go: ['design studio', 'kitchen studio', 'kitchen design studio', 'design wall', 'big screen', 'استوديو تصميم', 'استوديو المطابخ', 'شاشه التصميم'],
      /** phrases only this section claims (the generic "open the designer" belongs to the adviser's own section, see logic.js) */
      openRe: [/\b(design|plan) (my|a|our|your) kitchen\b/, /\bkitchen (designer|planner)\b/],
    },
  },
  {
    id: 'tv-studio',
    kind: 'tv',
    enabled: true,
    slot: 'left-wing',
    name: N('TV Unit Studio', 'استوديو وحدات التلفزيون'),
    short: N('TV unit', 'وحدة تلفزيون'),
    /** the website's NEO TV Unit Designer (src/studio/designers.js kind 'tv': /studio/tv). It is the studio app of the website: it opens for everybody (no sign-in to design); only Save and Request a quote ask for an account. */
    designer: {
      path: '/studio/tv', siteName: N('Neo TV Unit Designer', 'مصمم وحدات التلفزيون نيو'),
      /** rendered once its own page element exists (the studio shell has buttons of its own long before the designer mounts) */
      ready: '[data-testid="cat-page-tv"]',
      /** guests are welcome: the studio shell only needs `closets_studio_auth_v1` for save / quote (customerAuth.js SESSION_KEY) */
      auth: { required: false, key: 'closets_studio_auth_v1', field: 'access_token' },
      /** the studio shell is a 56 px bar (brand, designer switcher, language, sign in) over the designer: hidden here (the showroom has its own bar) and the designer takes its height back (studio.css --ws-bar-h) */
      embed: { shift: { desktop: 0, mobile: 0 }, css: '.ws-bar{display:none!important}.ws-root{--ws-bar-h:0px!important}html{overflow:hidden!important}' },
      /** the studio's own language switch (a button group inside the designer; no design is lost) and the shell's, both clicked from the showroom */
      langButtons: ['.nk-lang .nk-seg-b', '.ws-lang'],
      /** a link in the studio that would navigate the frame away (My designs after saving) opens in a new tab instead, so the visitor never loses the showroom or the design */
      newTabLinks: true,
    },
    adviser: 'living',
    poster: { base: 'tv', frames: 3 },
    keywords: {
      open: ['design my tv', 'design a tv', 'design the tv', 'plan my tv', 'tv unit designer', 'tv designer', 'tv planner', 'tv unit planner', 'media wall designer', 'design my media wall', 'صمم وحده التلفزيون', 'صمم وحده تلفزيون', 'صمم وحده التلفاز', 'صمم جدار التلفزيون', 'صمم جدار التلفاز', 'مصمم وحدات التلفزيون', 'مصمم التلفزيون', 'مصمم وحدات التلفاز'],
      go: ['tv unit studio', 'tv studio', 'tv design studio', 'tv unit design studio', 'media wall studio', 'استوديو وحدات التلفزيون', 'استوديو التلفزيون', 'استوديو وحدات التلفاز'],
      openRe: [/\b(design|plan) (my|a|our|your|the) (tv|media)\b/, /\b(tv|media) (unit |wall )?(designer|planner)\b/],
    },
    /** wording that differs from the kitchen defaults in strings.js DS (everything not listed falls back to those) */
    text: {
      tagline: N('Design your TV unit on a big screen', 'صمّم وحدة التلفزيون على شاشة كبيرة'),
      preview: N('Preview of the TV designer', 'معاينة لمصمم التلفزيون'),
      frameAria: N('TV unit designer', 'مصمم وحدات التلفزيون'),
      frameTitle: N('Neo TV Unit Designer (same as our website)', 'مصمم وحدات التلفزيون نيو (نفسه في موقعنا)'),
      loading: N('Opening the TV Unit Studio', 'جارٍ فتح استوديو وحدات التلفزيون'),
      signInNote: N('No account needed to design. Saving your design or asking for a quote will ask you to sign in or create a free account.', 'لا حاجة إلى حساب للتصميم. حفظ تصميمك أو طلب عرض سعر سيطلب منك تسجيل الدخول أو إنشاء حساب مجاني.'),
      confirmBody: N('Your design stays in this browser, so you can pick it up next time. To send it to our team, use Get quote in the designer first.', 'يبقى تصميمك في هذا المتصفح لتتابعه لاحقًا. لإرساله إلى فريقنا استخدم زر طلب عرض السعر في المصمم أولًا.'),
      guideGo: N('Walk me to the TV unit studio', 'خذني إلى استوديو وحدات التلفزيون'),
      guideOpen: N('Open the TV designer', 'افتح مصمم التلفزيون'),
      guideGoReply: N('Of course. The TV Unit Studio shares the big design wall on the left of the entrance: design your own media wall with the same options as our website. I will take you there.', 'بكل سرور. استوديو وحدات التلفزيون على جدار التصميم الكبير يسار المدخل: صمّم جدار الوسائط الخاص بك بالخيارات نفسها كما في موقعنا. سآخذك إلى هناك.'),
      guideOpenReply: N('Opening the TV unit designer for you now. It is the same designer as on our website, on a big screen, and you do not need an account to design. Press the back button at the top to return to the showroom.', 'أفتح لك مصمم وحدات التلفزيون الآن. هو المصمم نفسه في موقعنا، على شاشة كبيرة، ولا تحتاج إلى حساب للتصميم. اضغط زر العودة في الأعلى للرجوع إلى المعرض.'),
      guideBlurb: N('Design your own TV unit and media wall on a big screen', 'صمّم وحدة التلفزيون وجدار الوسائط بنفسك على شاشة كبيرة'),
    },
  },
];

/** what the station is called when more than one section shares it (the sign, the HUD prompt, the chooser, the attract screen) */
export const STATION_NAME = N('Design Studios', 'استوديوهات التصميم');

export const enabledSections = (list = SECTIONS) => list.filter((s) => s && s.enabled);
export const sectionById = (id, list = SECTIONS) => list.find((s) => s.id === id) || null;
export const sectionByKind = (kind, list = SECTIONS) => list.find((s) => s.kind === kind) || null;
export const sectionName = (s, lang) => (s ? (lang === 'ar' ? s.name.ar : s.name.en) : '');
export const sectionShort = (s, lang) => (s ? (lang === 'ar' ? s.short.ar : s.short.en) : '');
/** the enabled sections that share a section's station (its slot), in registry order */
export const stationSections = (s, list = SECTIONS) => (s ? enabledSections(list).filter((x) => x.slot === s.slot) : []);
/** the name of the station a section belongs to: the section's own name alone on a wall, "Design Studios" when it is shared */
export const stationName = (sections, lang) => (sections && sections.length > 1 ? (lang === 'ar' ? STATION_NAME.ar : STATION_NAME.en) : sectionName(sections && sections[0], lang));
/** the station name for a ZONE id (a zone carries its first section's id): null when that id is not a design studio zone, or the zone has a single section */
export function zoneStationName(id, lang, list = SECTIONS) { const s = sectionById(id, list); const g = s ? stationSections(s, list) : []; return g.length > 1 ? stationName(g, lang) : null; }
/** the entry the department quick-nav menu / HUD prompt use (same shape as DEPARTMENTS / COLLECTIONS_DEPT) */
export const sectionDept = (s) => ({ id: s.id, en: s.name.en, ar: s.name.ar, designStudio: true });
export const SECTION_DEPTS = enabledSections().map(sectionDept);

/** poster frame URLs for a section + language (served from public/yas-bloom/design-studio/) */
export function posterUrls(s, lang, base = (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL ? process.env.PUBLIC_URL : '')) {
  const L = lang === 'ar' ? 'ar' : 'en', out = [];
  for (let i = 1; i <= s.poster.frames; i++) out.push(`${base}/yas-bloom/design-studio/${s.poster.base}-${i}-${L}.webp`);
  return out;
}
