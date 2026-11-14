/* Design Studio logic. PURE (no three.js, no React; the DOM / storage objects are passed in), unit-tested:
 * the embed URL, language sync with the website, the open / close state machine, the "dirty design" tracker, the chrome-hiding CSS and the advisers' intents. */
import { SECTIONS, sectionById, enabledSections, BYLINE } from './sections';
import { dt } from './strings';

export { BYLINE };
export const LANG_KEY = 'closets_lang';          // the website's own language key (src/App.js): the designer reads it when it starts
export const USER_KEY = 'closets_user';          // the website's own signed-in customer record
/** attribution only: GA4 (if the visitor accepted the site's cookie notice) records the page URL, so the owner can see designer sessions that began in YAS Bloom. The site ignores the parameter. */
export const SRC_PARAM = 'src', SRC_VALUE = 'yas-bloom';

// ---------------------------------------------------------------- the designer URL (same origin, so the website's own account, language, consent and storage apply)
const clean = (p) => (typeof p === 'string' && /^\/[A-Za-z0-9/_-]*$/.test(p) ? p : null);
/** site-relative URL of the designer for the frame (never an absolute URL: the frame can only ever be same-origin) */
export function buildEmbedUrl(section, { src = SRC_VALUE } = {}) {
  const path = section && section.designer && clean(section.designer.path); if (!path) return null;
  return `${path}?${SRC_PARAM}=${encodeURIComponent(src)}`;
}
/** the same designer as a normal website page, for "Open on the website" (a new tab, no attribution change) */
export function buildSiteUrl(section) { return buildEmbedUrl(section); }
/** is `pathname` (the frame's current location) still the designer? Anything else means the visitor pressed the designer's Exit / finished (it navigates to /kitchen or /) */
export function stillOnDesigner(pathname, section) {
  const want = section && section.designer && clean(section.designer.path); if (!want) return false;
  return String(pathname || '').replace(/\/+$/, '').toLowerCase() === want.toLowerCase();
}

// ---------------------------------------------------------------- language: the showroom owns it in its URL (/ar/yas-bloom), the website in localStorage
export const normLang = (l) => (l === 'ar' ? 'ar' : 'en');
/** write the showroom's language where the website reads it. Returns true when the stored value is now `lang`. */
export function syncLang(lang, storage) {
  const L = normLang(lang);
  try { storage.setItem(LANG_KEY, L); return storage.getItem(LANG_KEY) === L; } catch (e) { return false; }
}
export function readLang(storage) { try { return storage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } }
/** the website's designer pages need a signed-in customer (App.js PLANNER_PAGES): tell the visitor before the frame opens */
export function isSignedIn(storage) { try { const u = storage.getItem(USER_KEY); return !!(u && JSON.parse(u)); } catch (e) { return false; } }

// ---------------------------------------------------------------- the designer lays itself out below the site header (App.js KitchenPlannerWizard: marginTop HEADER = 104 desktop / 72 under 768 px)
/** Desktop (>= 768 px): the wizard is `height: calc(100dvh - 104px)` under a 104 px margin, so the frame is shifted UP by 104 px (and made 104 px taller): the site header sits outside the
 *  visible window and the designer fills it exactly. Phones (< 768 px): the wizard is `100dvh` under a 72 px margin (the page scrolls by 72 px), so the frame is NOT shifted; instead its
 *  document is kept scrolled by 72 px, which puts the designer's top bar at the top and its Back / Next / total bar at the bottom of the screen. Nothing is edited in the site. */
export const HEADER_SHIFT = { desktop: 104, mobile: 72, breakpoint: 768 };
export const frameShift = (width) => (width < HEADER_SHIFT.breakpoint ? 0 : HEADER_SHIFT.desktop);
export const scrollOffset = (width) => (width < HEADER_SHIFT.breakpoint ? HEADER_SHIFT.mobile : 0);
/** one small stylesheet injected (from this same-origin parent) into the designer document: hides the site header and footer (belt and braces on desktop, where the frame shift already hides the
 *  header) and stops the visitor scrolling the page (script scrolling still works: phones rely on it). If the site's markup changes the selectors simply stop matching: the header / footer would then sit outside the visible window (desktop) or the
 *  header over the designer (phone), never break it. */
export const EMBED_CSS = 'nav,footer{display:none!important}html{overflow:hidden!important}';
export const EMBED_STYLE_ID = 'sr-ds-embed';

// ---------------------------------------------------------------- state machine: closed -> loading -> open (-> confirm) | failed
export const DIRTY_AFTER = 3;          // trusted clicks / key presses inside the designer before leaving asks for confirmation
export const LOAD_TIMEOUT_MS = 25000;  // no `load` event by then: show the failure screen
export const initialState = { status: 'closed', sectionId: null, attempt: 0, interactions: 0, reason: null };
export function reduce(s, a) {
  switch (a.type) {
    case 'open': return s.status === 'closed' && sectionById(a.sectionId) ? { status: 'loading', sectionId: a.sectionId, attempt: s.attempt + 1, interactions: 0, reason: null } : s;
    case 'loaded': return s.status === 'loading' ? { ...s, status: 'open' } : s;
    case 'fail': return s.status === 'loading' || s.status === 'open' ? { ...s, status: 'failed', reason: a.reason || 'error' } : s;
    case 'retry': return s.status === 'failed' ? { ...s, status: 'loading', attempt: s.attempt + 1, interactions: 0, reason: null } : s;
    case 'interact': return s.status === 'open' || s.status === 'confirm' ? { ...s, interactions: s.interactions + (a.n || 1) } : s;
    case 'request-close': return s.status === 'closed' || s.status === 'confirm' ? s : s.status === 'open' && s.interactions >= DIRTY_AFTER ? { ...s, status: 'confirm' } : { ...initialState, attempt: s.attempt, reason: 'user' };   // while the question is on screen a second Back / Esc changes nothing (its buttons decide)
    case 'stay': return s.status === 'confirm' ? { ...s, status: 'open' } : s;
    case 'leave': return s.status === 'confirm' ? { ...initialState, attempt: s.attempt, reason: 'user' } : s;
    case 'close': return s.status === 'closed' ? s : { ...initialState, attempt: s.attempt, reason: a.reason || 'back' };   // the browser Back button, when there is no design to protect
    case 'left': return s.status === 'closed' ? s : { ...initialState, attempt: s.attempt, reason: 'exit' };   // the designer navigated away (its own Exit / sent quote)
    case 'reload': return s.status === 'open' || s.status === 'confirm' ? { ...s, status: 'loading', attempt: s.attempt + 1, interactions: 0 } : s;
    default: return s;
  }
}
/** the showroom renders nothing and its explorer ignores input while any of these holds */
export const isActive = (s) => s.status !== 'closed';
export const isDirty = (s) => s.interactions >= DIRTY_AFTER;
/** keys that are navigation, not editing: they do not make a design "dirty" */
export const isEditingKey = (key) => !['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'CapsLock', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key);
/** has the designer really rendered (not just the HTML shell)? Its step bar / sign-in gate are buttons: three or more under #root. Pure on a document-like object. */
export function designerRendered(doc) { try { return !!doc && doc.readyState !== 'loading' && doc.querySelectorAll('#root button').length >= 3; } catch (e) { return false; } }
/** Esc from INSIDE the designer leaves (with the confirmation when a design is in progress) unless the designer has a real dialog of its own open ([role=dialog] / [aria-modal]; its quote form is a plain overlay that ignores Esc, so there the confirmation protects the design) */
export function escapeShouldClose(doc) {
  try { return !doc.querySelector('[role="dialog"],[aria-modal="true"]'); } catch (e) { return true; }
}

// ---------------------------------------------------------------- the advisers' intents ("take me to the design studio" / "open the designer")
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^a-z0-9؀-ۿ\s#:_-]/g, ' ').replace(/\s+/g, ' ').trim();
const hasAny = (n, words) => words.some((w) => n.includes(norm(w)));
const OPEN_RE = [/\b(open|launch|start|begin|use|try|run|show)\b.{0,24}\b(designer|planner|design tool)\b/, /\b(design|plan) (my|a|our|your) kitchen\b/, /\bstart designing\b/, /\bkitchen (designer|planner)\b/,
  /(افتح|فتح|شغل|ابدا|استخدم).{0,24}(المصمم|مصمم|المخطط|مخطط|التصميم)/];
const CUSTOM_RE = /\bcustom studio\b|استوديو التصميم المخصص/;
export const GO_TOKEN = (id) => '#go:' + id, OPEN_TOKEN = (id) => '#open:' + id;
/** which intent the words carry for a section: 'open' | 'go' | null */
export function designStudioIntent(input, section = SECTIONS[0]) {
  const n = norm(input); if (!n || !section) return null;
  if (n === GO_TOKEN(section.id)) return 'go';
  if (n === OPEN_TOKEN(section.id)) return 'open';
  if (CUSTOM_RE.test(n)) return null;                          // "custom studio" stays the existing Custom Studio bay
  if (OPEN_RE.some((r) => r.test(n)) || hasAny(n, section.keywords.open)) return 'open';
  if (hasAny(n, section.keywords.go)) return 'go';
  return null;
}
/** a reply in the shape staff/guide.js `reply()` returns, or null when the words are not about the design studio */
export function designStudioReply(input, { lang = 'en', memory = {}, sections = enabledSections() } = {}) {
  for (const s of sections) {
    const intent = designStudioIntent(input, s); if (!intent) continue;
    const L = lang === 'ar' ? 'ar' : 'en', label = (k) => ({ en: dt(k, 'en'), ar: dt(k, 'ar') });
    const go = { type: 'glide', id: s.id, label: label('guideGo') }, open = { type: 'designer', id: s.id, label: label('guideOpen') };
    const mem = { ...memory, turns: (memory.turns || 0) + 1 };
    if (intent === 'open') return { intent: 'designer-open', text: dt('guideOpenReply', L), chips: [], actions: [open], memory: mem, askAi: false, auto: open };
    return { intent: 'designer-go', text: dt('guideGoReply', L), chips: [{ token: OPEN_TOKEN(s.id), label: label('guideOpen') }], actions: [go, open], memory: mem, askAi: false, auto: go };
  }
  return null;
}
/** the entry for the Reception adviser's service list (same shape as guide.js `services()` items) */
export const designStudioServices = (lang = 'en', sections = enabledSections()) => sections.map((s) => ({ id: s.id, label: lang === 'ar' ? s.name.ar : s.name.en, blurb: dt('guideBlurb', lang), room: s.id, href: null }));
/** the two quick-reply chips the kitchen adviser offers */
export const adviserChips = (sections = enabledSections()) => sections.flatMap((s) => [{ token: GO_TOKEN(s.id), label: { en: dt('guideGo', 'en'), ar: dt('guideGo', 'ar') } }, { token: OPEN_TOKEN(s.id), label: { en: dt('guideOpen', 'en'), ar: dt('guideOpen', 'ar') } }]);
