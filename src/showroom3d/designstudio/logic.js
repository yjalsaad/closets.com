/* Design Studio logic. PURE (no three.js, no React; the DOM / storage objects are passed in), unit-tested:
 * the embed URL, language sync with the website, the open / close state machine, the "dirty design" tracker, the chrome-hiding CSS and the advisers' intents. */
import { SECTIONS, sectionById, enabledSections, BYLINE } from './sections';
import { dt, sdt } from './strings';

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
/** is there a signed-in customer for this section's designer? Kitchen: the website's own `closets_user` record (its planner pages need one); the Neo studios: the studio account session (only Save / Quote need it) */
export function isSignedIn(storage, section) {
  const a = section && section.designer && section.designer.auth, key = (a && a.key) || USER_KEY;
  try { const u = JSON.parse(storage.getItem(key)); return !!(u && (!(a && a.field) || u[a.field])); } catch (e) { return false; }
}
/** does a visitor need an account to USE the designer (not just to save / send)? Only the website's classic planner pages do */
export const needsSignIn = (section) => !!(section && section.designer && section.designer.auth && section.designer.auth.required);

// ---------------------------------------------------------------- the designer lays itself out below the site header (App.js KitchenPlannerWizard: marginTop HEADER = 104 desktop / 72 under 768 px)
/** Desktop (>= 768 px): the wizard is `height: calc(100dvh - 104px)` under a 104 px margin, so the frame is shifted UP by 104 px (and made 104 px taller): the site header sits outside the
 *  visible window and the designer fills it exactly. Phones (< 768 px): the wizard is `100dvh` under a 72 px margin (the page scrolls by 72 px), so the frame is NOT shifted; instead its
 *  document is kept scrolled by 72 px, which puts the designer's top bar at the top and its Back / Next / total bar at the bottom of the screen. Nothing is edited in the site. */
export const HEADER_SHIFT = { desktop: 104, mobile: 72, breakpoint: 768 };
const embedOf = (section) => (section && section.designer && section.designer.embed) || null;
/** `section` (optional) carries its own embed settings (the Neo studio has no site header over the designer: shift 0); without one the classic planner values above apply */
export const frameShift = (width, section) => { const e = embedOf(section); return width < HEADER_SHIFT.breakpoint ? 0 : e ? e.shift.desktop : HEADER_SHIFT.desktop; };
export const scrollOffset = (width, section) => { const e = embedOf(section); return width < HEADER_SHIFT.breakpoint ? (e ? e.shift.mobile : HEADER_SHIFT.mobile) : 0; };
export const embedCss = (section) => { const e = embedOf(section); return e ? e.css : EMBED_CSS; };
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
export function designerRendered(doc, section) {
  try { const sel = section && section.designer && section.designer.ready; if (sel) return !!doc && doc.readyState !== 'loading' && !!doc.querySelector(sel); return !!doc && doc.readyState !== 'loading' && doc.querySelectorAll('#root button').length >= 3; } catch (e) { return false; }
}
/** Esc from INSIDE the designer leaves (with the confirmation when a design is in progress) unless the designer has a real dialog of its own open ([role=dialog] / [aria-modal]; its quote form is a plain overlay that ignores Esc, so there the confirmation protects the design) */
export function escapeShouldClose(doc) {
  try { return !doc.querySelector('[role="dialog"],[aria-modal="true"]'); } catch (e) { return true; }
}

// ---------------------------------------------------------------- the advisers' intents ("take me to the design studio" / "open the designer")
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^a-z0-9؀-ۿ\s#:_-]/g, ' ').replace(/\s+/g, ' ').trim();
const hasAny = (n, words) => words.some((w) => n.includes(norm(w)));
/** words that mean "open a designer" without naming which one: it is the adviser's own section (kitchens adviser -> kitchen, living adviser -> TV), the first section when no adviser is given, a question when the adviser has none of her own */
const GENERIC_OPEN_RE = [/\b(open|launch|start|begin|use|try|run|show)\b.{0,24}\b(designer|planner|design tool)\b/, /\bstart designing\b/,
  /(افتح|فتح|شغل|ابدا|استخدم).{0,24}(المصمم|مصمم|المخطط|مخطط|التصميم)/];
const CUSTOM_RE = /\bcustom studio\b|استوديو التصميم المخصص/;
export const GO_TOKEN = (id) => '#go:' + id, OPEN_TOKEN = (id) => '#open:' + id;
/** which intent the words carry for a section: 'open' | 'go' | null. `generic: false` ignores the words that do not name a section ("open the designer"), see designStudioReply */
export function designStudioIntent(input, section = SECTIONS[0], { generic = true } = {}) {
  const n = norm(input); if (!n || !section) return null;
  if (n === GO_TOKEN(section.id)) return 'go';
  if (n === OPEN_TOKEN(section.id)) return 'open';
  if (CUSTOM_RE.test(n)) return null;                          // "custom studio" stays the existing Custom Studio bay
  const kw = section.keywords || {};
  if ((kw.openRe || []).some((r) => r.test(n)) || hasAny(n, kw.open || [])) return 'open';
  if (generic && GENERIC_OPEN_RE.some((r) => r.test(n))) return 'open';
  if (hasAny(n, kw.go || [])) return 'go';
  return null;
}
const labels = (s, k) => ({ en: sdt(s, k, 'en'), ar: sdt(s, k, 'ar') });
const replyFor = (s, intent, L, memory) => {
  const go = { type: 'glide', id: s.id, label: labels(s, 'guideGo') }, open = { type: 'designer', id: s.id, label: labels(s, 'guideOpen') };
  const mem = { ...memory, turns: (memory.turns || 0) + 1 };
  if (intent === 'open') return { intent: 'designer-open', text: sdt(s, 'guideOpenReply', L), chips: [], actions: [open], memory: mem, askAi: false, auto: open };
  return { intent: 'designer-go', text: sdt(s, 'guideGoReply', L), chips: [{ token: OPEN_TOKEN(s.id), label: labels(s, 'guideOpen') }], actions: [go, open], memory: mem, askAi: false, auto: go };
};
/** a reply in the shape staff/guide.js `reply()` returns, or null when the words are not about the design studio.
 *  `room`: the adviser who is asked (staff roster `room`). A section named in the words always wins; words that name none ("open the designer") mean the adviser's own section, and when she has none and more than one
 *  section is on the wall she asks which. Without a room (tests, no adviser) the first section answers, as before the TV studio existed. */
export function designStudioReply(input, { lang = 'en', memory = {}, sections = enabledSections(), room } = {}) {
  const L = lang === 'ar' ? 'ar' : 'en';
  for (const s of sections) { const intent = designStudioIntent(input, s, { generic: false }); if (intent) return replyFor(s, intent, L, memory); }   // a section named in the words
  const hit = sections.map((s) => [s, designStudioIntent(input, s)]).find(([, i]) => i); if (!hit) return null;
  const [first, intent] = hit;
  const own = room ? sections.filter((s) => s.adviser === room) : [];
  if (own.length) return replyFor(own[0], intent, L, memory);
  if (room && sections.length > 1 && intent === 'open') {
    const mem = { ...memory, turns: (memory.turns || 0) + 1 };
    return { intent: 'designer-choose', text: dt('guideChoose', L), chips: sections.map((s) => ({ token: OPEN_TOKEN(s.id), label: labels(s, 'guideOpen') })), actions: [], memory: mem, askAi: false, auto: null };
  }
  return replyFor(first, intent, L, memory);
}
/** the entries for the Reception adviser's service list (same shape as guide.js `services()` items), one per section */
export const designStudioServices = (lang = 'en', sections = enabledSections()) => sections.map((s) => ({ id: s.id, label: lang === 'ar' ? s.name.ar : s.name.en, blurb: sdt(s, 'guideBlurb', lang), room: s.id, href: null }));
/** the two quick-reply chips each section's own adviser offers (`room` = that adviser's roster room; none = every section's, as before the TV studio existed) */
export const adviserChips = (room, sections = enabledSections()) => sections.filter((s) => !room || s.adviser === room).flatMap((s) => [{ token: GO_TOKEN(s.id), label: labels(s, 'guideGo') }, { token: OPEN_TOKEN(s.id), label: labels(s, 'guideOpen') }]);

// ---------------------------------------------------------------- switching the designer's language while it is open (no design lost)
/** Click the designer's own language controls so it matches `lang`. Classic planner: its nav button [title="Language"] (a toggle). Neo studio (`designer.langButtons`): its EN / ع button group (clicked when not pressed) and the studio shell's toggle
 *  (clicked when the page language differs). Returns true when the document now reads `lang` (the caller reloads the designer in that language when it does not). Pure on a document-like object. */
export function switchDesignerLanguage(doc, lang, section) {
  const L = normLang(lang);
  try {
    const sels = section && section.designer && section.designer.langButtons;
    if (!sels) { if (doc.documentElement.lang === L) return true; const b = doc.querySelector('nav button[title="Language"]'); if (b) { b.click(); return true; } return false; }
    for (const sel of sels) {
      const nodes = [...doc.querySelectorAll(sel)]; if (!nodes.length) continue;
      if (nodes.length > 1) { const want = nodes.find((n) => (n.textContent || '').trim() === (L === 'ar' ? 'ع' : 'EN')); if (want && want.getAttribute('aria-pressed') !== 'true') want.click(); }
      else if (doc.documentElement.lang !== L) nodes[0].click();
    }
    return true;
  } catch (e) { return false; }
}
/** did the switch take? (the page language, and the button group when there is one) */
export function designerLanguageIs(doc, lang, section) {
  const L = normLang(lang);
  try {
    if (doc.documentElement.lang !== L) return false;
    const sels = section && section.designer && section.designer.langButtons;
    for (const sel of sels || []) { const nodes = [...doc.querySelectorAll(sel)]; if (nodes.length > 1) { const want = nodes.find((n) => (n.textContent || '').trim() === (L === 'ar' ? 'ع' : 'EN')); if (want && want.getAttribute('aria-pressed') !== 'true') return false; } }
    return true;
  } catch (e) { return false; }
}
