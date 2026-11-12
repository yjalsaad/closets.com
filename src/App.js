import { useState, useEffect, useCallback, useRef, createContext, useContext, Component } from 'react';
import { errMsg } from './errors';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { LangLink as Link, LangContext } from './seo/lang'; // [SEO] <Link> that keeps the /ar prefix
import { useRouteHead } from './seo/head';
import { ENABLE_AR_URLS } from './seo/siteConfig';
import { splitLangPath, withLang, isKnownPage, LEGACY_REDIRECTS } from './seo/routes';
import NotFound from './seo/NotFound';
import FooterSitemap from './seo/FooterSitemap';
import { formatBHD } from './i18n/format';
import { SkipLink, RouteAnnouncer } from './a11y/RouteA11y'; // [A11Y] skip link + route-change focus/announce
import { ModalPanel, useDialog } from './a11y/dialog'; // [A11Y] real modals: role=dialog, focus trap, Esc, focus return
import { useAutoAdvance } from './a11y/motion';
import SectionBoundary from './safety/SectionBoundary'; // [RESILIENCE] granular error boundaries
import { sanitizeProducts, sanitizeBanners, sanitizeTestimonials, sanitizeProjects, sanitizeRows, cmsValue, str as safeStr } from './safety/sanitize';
import ConsentBanner from './privacy/ConsentBanner'; // [PRIVACY] consent that gates non-essential processing
import { onConsentChange, hasConsent, openConsentSettings } from './privacy/consent';
import { aiFetch } from './privacy/ai';
import FormNotice, { AiNotice } from './privacy/FormNotice';
import { PrivacyPage, TermsPage } from './privacy/LegalPages';
import Field, { Honeypot } from './forms/Field';
import { validateForm, msg as vmsg, isBot } from './forms/validate';
import { useSubmit } from './forms/useSubmit';
import * as acct from './account/api'; // [IDENTITY] every account / loyalty / order RPC lives here
import { computeTotal } from './checkout/checkout';
import ShowroomTour from './home/ShowroomTour'; // [HOME 2026-11-09] scroll-driven showroom walk-through
import { useIkhLanding, IkhtarhaSpotlight, IkhtarhaGames, IkhtarhaDesigns, BusinessBand, CampaignPill } from './campaign/HomeCampaign'; // [IKHTARHA 2026-11-09] home page campaign + business sections
import lazyPage from './lazyPage';
import { ensureBrandFonts } from './fonts';
import { hydration } from './hydration';
import { fetchArabicDict } from './i18n/arabic';

// Guarded polyfills for browser APIs absent in non-browser/test (jsdom) environments.
// Inert in real browsers (only defined when missing) — keeps the app rendering safely everywhere.
if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, media: '', onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } });
  }
  if (typeof window.IntersectionObserver !== 'function') {
    window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  }
  if (typeof window.ResizeObserver !== 'function') {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (typeof window.scrollTo !== 'function') { window.scrollTo = () => {}; }
}

// build: services-nav-redeploy 2026-06-25 r2
// ── Analytics (consent-gated GA4) ──
// Set GA_MEASUREMENT_ID to a real 'G-XXXXXXXXXX' id to enable Google Analytics.
// While it stays the placeholder below, GA never loads (no-op) — but the
// cookie-consent banner / consent flow still works exactly the same.
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
const SUPA_URL = 'https://jflmbfxbhpioyniibjsj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbG1iZnhiaHBpb3luaWlianNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjkyNjQsImV4cCI6MjA5MDQ0NTI2NH0.XnQHF1Ivzhv6Zj12qe1Gh2x6ZyLdFfmUBweE_5SZnu0';
const H = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };
const api = async (path, opts = {}) => {
  let r;
  try {
    r = await fetch(SUPA_URL + '/rest/v1/' + path, { headers: H, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch (netErr) {
    // No connection / DNS / CORS — classify as network so callers show the right message.
    netErr.__kind = 'network';
    throw netErr;
  }
  if (!r.ok) {
    let msg = 'request failed (' + r.status + ')';
    try { const e = await r.json(); msg = e.message || e.hint || e.details || msg; } catch (_) {}
    const err = new Error(msg); err.status = r.status;
    throw err;
  }
  if (r.status === 204) return true;
  try { return await r.json(); } catch (_) { return true; }
};
const fmt = n => formatBHD(n, CMS_LANG);   // [i18n] one BHD formatter (src/i18n/format.js)
const AppCtx = createContext(null);

// ── Site content (CMS) layer ──────────────────────────────────────────
// All editable header/footer/page copy lives in public.website_content
// (key → value). We fetch every row once on mount, build a module-level
// {key: value} map, and expose cms(key, fallback) to read it anywhere.
// A context provider re-renders the tree once content arrives so the first
// paint uses fallbacks and silently upgrades to managed copy when loaded.
const CMS_MAP = {};                 // module-level cache: { 'home.hero.title': 'value', ... }
const SiteContentCtx = createContext(0);
// ── Language-aware CMS layer ──────────────────────────────────────────
// cms() is read during render. CMS_LANG is a module-global mirror of the
// app language (kept in sync by setCmsLang from the lang React state), so
// when the language toggle re-renders the tree, cms() re-reads in the new
// language. Arabic resolution order: optional DB override ('<key>::ar'),
// then the static CMS_AR dictionary below, then the English DB value /
// fallback. Static Arabic for EVERY cms key used in this file lives in
// CMS_AR (see definition immediately after this block).
let CMS_LANG = (typeof localStorage !== 'undefined' && localStorage.getItem('closets_lang')) || 'en';
function setCmsLang(l) { CMS_LANG = l; }
// cms('home.hero.title', 'Made to fit your life.') → managed value if present & non-empty, else fallback (Arabic-aware).
function cms(key, fallback = '') {
  if (CMS_LANG === 'ar') {
    const arDb = CMS_MAP[key + '::ar'];                       // optional Arabic DB override
    if (arDb !== undefined && arDb !== null && String(arDb).trim() !== '') return arDb;
    const arStatic = CMS_AR[key];                             // static Arabic dictionary (below)
    if (arStatic !== undefined && arStatic !== null && String(arStatic).trim() !== '') return arStatic;
  }
  const v = CMS_MAP[key];
  return (v !== undefined && v !== null && String(v).trim() !== '') ? v : fallback;
}
// Static Modern-Standard-Arabic for every cms(...) key used in this file.
// Brand rendered as 'ذا كلوزتس' to match the app's existing Arabic (I18N).
// Directional arrows flipped for RTL (← / ‹). Keep numbers, units, em-dashes.
const CMS_AR = {};
function useSiteContent() { return useContext(SiteContentCtx); }
function SiteContentProvider({ children }) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await api('website_content?active=is.true&deleted_at=is.null');
        if (!alive) return;
        if (Array.isArray(rows)) {
          rows.forEach(r => { if (r && typeof r === 'object' && r.key != null) CMS_MAP[r.key] = cmsValue(r.value); });   // [RESILIENCE] a non-string value can never reach .split()
          setVersion(v => v + 1);   // bump → re-render tree so cms() reads fresh values
        }
      } catch (_) { /* resilient: keep empty map, fallbacks render */ }
    })();
    return () => { alive = false; };
  }, []);
  return <SiteContentCtx.Provider value={version}>{children}</SiteContentCtx.Provider>;
}

// Inline-SVG icons for high-visibility customer-facing AI/chat surfaces.
// These render reliably even if the Tabler icon web-font fails to load.
const Spark = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={style}>
    <path d="M12 2l1.6 5.5a4 4 0 0 0 2.9 2.9L22 12l-5.5 1.6a4 4 0 0 0-2.9 2.9L12 22l-1.6-5.5a4 4 0 0 0-2.9-2.9L2 12l5.5-1.6a4 4 0 0 0 2.9-2.9z" />
  </svg>
);
const SendIcon = ({ size = 18, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" />
  </svg>
);

// ── i18n: interface translation (EN / AR) ──
const I18N = {
  // consent / legal (Phase-1 go-live polish)
  consentTitle:   { en:'We value your privacy' },
  consentBody:    { en:'We use essential cookies to run this site. With your consent we also use analytics cookies to understand how the site is used and improve it.' },
  consentAccept:  { en:'Accept' },
  consentDecline: { en:'Decline' },
  consentPrivacy: { en:'Privacy Policy' },
  legalPrivacy:   { en:'Privacy Policy' },
  legalTerms:     { en:'Terms' },
  // nav
  home:        { en:'Home' },
  gallery:     { en:'Gallery' },
  design:      { en:'Design' },
  story:       { en:'Story' },
  contact:     { en:'Contact' },
  signIn:      { en:'Sign In' },
  // hero / home
  designYours: { en:'Design Yours' },
  contactUs:   { en:'Contact us' },
  // planner
  whatDesign:  { en:'What are you designing?' },
  pickProduct: { en:'Pick a product to start.' },
  quoteOnly:   { en:'Quote only' },
  requestQuote:{ en:'Request a quote →' },
  layout:      { en:'Layout' },
  finish:      { en:'Finish' },
  size:        { en:'Size' },
  width:       { en:'Width' },
  height:      { en:'Height' },
  depth:       { en:'Depth' },
  getQuote:    { en:'Get a quote' },
  saveDesign:  { en:'Save design' },
  total:       { en:'Total' },
  included:    { en:'Included' },
  sectionsDone:{ en:'sections completed' },
  dragRotate:  { en:'drag to rotate · scroll to zoom' },
  close:       { en:'Close' },
  // contact
  getInTouch:  { en:'Get in touch' },
  yourName:    { en:'Your name' },
  phone:       { en:'Phone' },
  message:     { en:'Message' },
  send:        { en:'Send' },
  // hero / home sections
  viewCollection:{ en:'View Collection' },
  designedEvery:{ en:'Designed for every space.' },
  collections: { en:'Collections' },
  currentColl: { en:'Current Collection' },
  viewAll:     { en:'View all' },
  featured:    { en:'Featured' },
  whatPeopleSay:{ en:'What people say.' },
  clients:     { en:'Clients' },
  readyTransform:{ en:'Ready to transform your space?' },
  bookConsult: { en:'Book Free Consultation' },
  signInHub:   { en:'Sign In to Your Hub' },
  // HomeHub account bar + invoices
  hubBackToSite:   { en:'Back to site' },
  hubSignOut:      { en:'Sign Out' },
  hubInvoice:      { en:'Invoice' },
  hubView:         { en:'View' },
  hubPrint:        { en:'Print' },
  hubDownload:     { en:'Download' },
  hubItems:        { en:'Items' },
  hubQty:          { en:'Qty' },
  hubUnitPrice:    { en:'Unit price' },
  hubLineTotal:    { en:'Line total' },
  hubNoItems:      { en:'No items' },
  hubSubtotal:     { en:'Subtotal' },
  hubDiscount:     { en:'Discount' },
  hubShipping:     { en:'Shipping' },
  hubTax:          { en:'Tax' },
  hubTotal:        { en:'Total' },
  hubViewItems:    { en:'View items' },
  hubHideItems:    { en:'Hide items' },
  hubBillTo:       { en:'Bill to' },
  hubInvoiceNo:    { en:'Invoice' },
  hubOrderNo:      { en:'Order' },
  hubDate:         { en:'Date' },
  hubStatus:       { en:'Status' },
  w4PDashboardTab: { en:'Dashboard' },
  w4PLedgerTab:    { en:'Ledger' },
  w4POrdersTab:    { en:'Orders' },
  // about
  ourStory:    { en:'Our Story' },
  precision:   { en:'Precision.' },
  permanence:  { en:'Permanence.' },
  aboutP1:     { en:'Founded on a single belief: that storage should be as beautiful as the room it lives in. Every piece is a bespoke commission.' },
  aboutP2:     { en:'Scandinavian precision meets Bahraini craft. We obsess over every millimetre and finish — so you never have to.' },
  // contact
  startProject:{ en:'Start your project' },
  email:       { en:'Email' },
  budgetRange: { en:'Budget range' },
  tellProject: { en:'Tell us about your project…' },
  sendMessage: { en:'Send Message' },
  msgReceived: { en:'Message received' },
  // checkout / cart
  checkout:    { en:'Checkout' },
  summary:     { en:'Summary' },
  address:     { en:'Address' },
  notes:       { en:'Notes…' },
  placeOrder:  { en:'Place Order' },
  orderPlaced: { en:'Order placed' },
  backHome:    { en:'Back to Home' },
  cart:        { en:'Cart' },
  yourCart:    { en:'Your Cart' },
  cartEmpty:   { en:'Your cart is empty' },
  addToCart:   { en:'Add to Cart' },

  // ── Wave 1: top nav + mega-menu group titles ──
  navWardrobes:{ en:'Wardrobes' },
  navKitchens: { en:'Kitchens' },
  navDoors:    { en:'Doors & more' },
  navStudio:   { en:'Design studio' },
  navPricing:  { en:'Pricing & finance' },
  navInspiration:{ en:'Inspiration' },
  navOffers:   { en:'Offers' },
  navShowrooms:{ en:'Showrooms' },
  navMore:     { en:'More' },
  navAiDesignLab:{ en:'AI + Design Lab' },
  navAiYasSub: { en:'AI interior designer' },
  navDesignLabSub:{ en:'Glow-ups, quiz, gallery' },
  navGalleryTop:{ en:'Gallery' },
  navHowItWorksTop:{ en:'How it works' },
  navContactTop:{ en:'Contact' },
  // mega-menu column headers
  navByStyle:  { en:'By style' },
  navByFinish: { en:'By finish' },
  navGetStarted:{ en:'Get started' },
  navBuildSpec:{ en:'Build & spec' },
  navRoomsProducts:{ en:'Rooms & products' },
  navExplore:  { en:'Explore' },
  navPlanYourself:{ en:'Plan it yourself' },
  navTalkDesigner:{ en:'Talk to a designer' },
  // [WEB-STUDIO 2026-10-31]
  navNeoDesigners:{ en:'Neo designers' },
  // [ROOM-VIZ 2026-11-07]
  navVizCol:{ en:'Room visualizer' }, navlViz:{ en:'🎨 Room visualizer' }, navlViz360:{ en:'360° rooms' },
  navlVizPhoto:{ en:'Visualize your room photo' }, navlVizPdf:{ en:'Finishes catalogue (PDF)' },
  navlNeoKitchen:{ en:'Neo Kitchen Designer' }, navlNeoClosets:{ en:'Neo Closets Designer' },
  navlNeoCustom:{ en:'Neo Custom Designer' }, navlNeoBathroom:{ en:'Neo Bathroom Designer' },
  navlNeoLaundry:{ en:'Neo Laundry Designer' }, navlNeoTv:{ en:'Neo TV Unit Designer' },
  navlNeoOffice:{ en:'Neo Office Designer' }, navlNeoDoors:{ en:'Neo Doors Designer' },
  navlNeoAccount:{ en:'My designs & quotes →' },
  navPlanBudget:{ en:'Plan your budget' },
  navWaysToPay:{ en:'Ways to pay' },
  navSeeSave:  { en:'See & save ideas' },
  navGuides:   { en:'Guides' },
  navExploreRange:{ en:'Explore the range →' },
  menu:        { en:'Menu' },
  navlViewAll: { en:'View all' },
  // mega-menu / drawer leaf links
  navlWalkin:  { en:'Walk-in dressing rooms' },
  navlSliding: { en:'Sliding-door wardrobes' },
  navlHinged:  { en:'Hinged-door wardrobes' },
  navlFitted:  { en:'Fitted & reach-in' },
  navlFree:    { en:'Free-standing' },
  navlWalnut:  { en:'Walnut' },
  navlOak:     { en:'Oak' },
  navlMattLac: { en:'Matt lacquer' },
  navlGloss:   { en:'High gloss' },
  navlTwoTone: { en:'Two-tone' },
  navlAllWardrobes:{ en:'View all wardrobes →' },
  navlWardrobePlanner:{ en:'Wardrobe planner' },
  navl3dWardrobe:{ en:'3D wardrobe planner' },
  navlWhyClosets:{ en:'Why The Closets' },
  navlHandleless:{ en:'Modern handleless' },
  navlShaker:  { en:'Shaker' },
  navlTraditional:{ en:'Traditional' },
  navlCompactGalley:{ en:'Compact & galley' },
  navlWorktops:{ en:'Worktops' },
  navlFinishesColours:{ en:'Finishes & colours' },
  navlAppliances:{ en:'Appliances' },
  navlAllKitchens:{ en:'View all kitchens →' },
  navl3dKitchen:{ en:'3D kitchen planner' },
  navlBookDesignVisit:{ en:'Book a design visit' },
  navlDoors:   { en:'Doors' },
  navlTvMedia: { en:'TV & media units' },
  navlHomeOffice:{ en:'Home office' },
  navlStorageOffice:{ en:'Storage & home office' },
  navlVanity:  { en:'Vanity units' },
  navlDoorPlanner:{ en:'Wood door planner' },
  navlTvPlanner:{ en:'TV & media unit planner' },
  navlOfficePlanner:{ en:'Office planner' },
  navlFullGallery:{ en:'Browse the full gallery →' },
  navlRecentProjects:{ en:'Recent projects' },
  navlAiYas:   { en:'✨ AI YAS' },
  navlHowItWorks:{ en:'How it works' },
  navlKitchenPlanner:{ en:'Kitchen planner' },
  navlTvUnitPlanner:{ en:'TV unit planner' },
  navlAiDesigner:{ en:'AI interior designer' },
  navlHowPlannerWorks:{ en:'How the planner works →' },
  navlBookAppointment:{ en:'Book a design appointment →' },
  navlVisitShowroom:{ en:'Visit a showroom' },
  navlFreeQuote:{ en:'Get a free quote' },
  navlPriceEstimator:{ en:'Try the price estimator' },
  navlFlexiblePay:{ en:'Flexible payment options' },
  navlWhatItCosts:{ en:'What it costs' },
  navlProjectGallery:{ en:'Project gallery' },
  navlDesignJournal:{ en:'Design journal' },
  navlBuyingGuides:{ en:'Buying guides' },
  navlDesignIdeas:{ en:'Design ideas' },
  // global CTAs
  startDesigning:{ en:'Start designing' },
  startDesigningArrow:{ en:'Start designing →' },
  bookVisit:   { en:'Book a visit' },
  bookFreeVisit:{ en:'Book a free visit' },
  bookFreeConsult:{ en:'Book a free consultation' },
  bookFreeDesignVisit:{ en:'Book a free design visit' },
  bookFreeDesignConsult:{ en:'Book a free design consultation' },
  bookFreeDesignConsultArrow:{ en:'Book a free design consultation →' },
  requestQuoteCta:{ en:'Request a quote' },
  openRoomDesigner:{ en:'Open Room Designer' },
  openRoomDesignerArrow:{ en:'Open the Room Designer →' },
  openDesignStudio:{ en:'Open the Design Studio →' },
  openOfficePlanner:{ en:'Open the office planner →' },
  openDoorPlanner:{ en:'Open the wood door planner →' },
  openTvPlanner:{ en:'Open the TV unit planner →' },
  next:        { en:'Next' },
  back:        { en:'Back' },
  exit:        { en:'Exit' },
  renderPhotoreal:{ en:'Render photoreal' },
  whatsappUs:  { en:'WhatsApp us' },
  designIt3d:  { en:'Design it in 3D' },
  add:         { en:'Add' },
  // footer
  footHelp:    { en:'Here to help' },
  footWaysShop:{ en:'Ways to shop' },
  footAbout:   { en:'About' },
  footFollow:  { en:'Follow us' },
  devBy:       { en:'Developed by' },
  footBlurb:   { en:'Premium bespoke wardrobes, kitchens and storage — designed, manufactured and installed in the Kingdom of Bahrain.' },
  footFaq:     { en:'FAQ' },
  footDelivery:{ en:'Delivery & install' },
  footWarranty:{ en:'Warranty service' },
  footMaintenance:{ en:'Maintenance' },
  footReviews: { en:'Reviews' },
  footBookAppt:{ en:'Book an appointment' },
  footBrochure:{ en:'Request a brochure' },
  footFinance: { en:'Finance & payment' },
  footFindShowroom:{ en:'Find a showroom' },
  footRecommend:{ en:'Recommend a friend' },
  footAboutClosets:{ en:'About The Closets' },
  footCareers: { en:'Careers' },
  footSitemap: { en:'Sitemap' },
  footDevBy:   { en:'Developed by' },
  footStaffLogin:{ en:'Staff login' },
  footSupport: { en:'Support' },
  footMyClosets:{ en:'My Closets' },
  footCustomerHub:{ en:'Open Customer Hub' },
  footMyAccount:{ en:'My account' },
  footMyOrders:{ en:'My orders' },
  footMyDesigns:{ en:'My designs' },
  footMyRewards:{ en:'My rewards' },
  footTrackRequest:{ en:'Track a request' },
  footBookVisit:{ en:'Book a visit' },
  // AI YAS page
  yasHeroTag:  { en:'Your AI design partner — describe it, see it, build it. Real renders, tailored concepts and instant pricing for kitchens, wardrobes and every room.' },
  yasPromptPh: { en:'Describe your dream kitchen, wardrobe or room…' },
  yasGenerate: { en:'✨ Generate' },
  yasHubEyebrow:{ en:'One hub · Every AI tool' },
  yasHubTitle: { en:'Everything AI can do for your space.' },
  yasHubSub:   { en:'Tap any tool to launch it right here — no waiting, no forms.' },
  yasHowTitle: { en:'How AI YAS works' },
  yasHowHeadline:{ en:'Describe → Generate → Refine.' },
  yasCapsTitle:{ en:'Capabilities' },
  yasCapsHeadline:{ en:'One AI, end to end.' },
  yasCtaTitle: { en:'Start designing with AI.' },
  yasCtaSub:   { en:'Let YAS sketch your concept in seconds — then have our Bahrain team measure, refine and quote it for free.' },
  yasDisclaimer:{ en:'AI impression — confirmed at your free design consultation.' },
  // AI YAS tool cards
  yasT1t:{ en:'Text-to-Design' },
  yasT1v:{ en:'Describe it in words — get a full concept, materials & pricing.' },
  yasT2t:{ en:'AI Room Redesign' },
  yasT2v:{ en:'Upload a photo of your room, pick a style, see it transformed.' },
  yasT3t:{ en:'Style Finder & Moodboard' },
  yasT3v:{ en:'Choose a few looks — AI builds a style, colour & material board.' },
  yasT4t:{ en:'Budget Assistant' },
  yasT4v:{ en:'Set a budget in BHD — AI recommends the best spec for it.' },
  yasT5t:{ en:'Material & Product Picks' },
  yasT5v:{ en:'Smart picks from our live collection, tailored to your room.' },
  yasT6t:{ en:'Ask YAS — Design Chat' },
  yasT6v:{ en:'Chat with our AI about products, process, finance and lead times.' },
  yasT7t:{ en:'Photoreal Render' },
  yasT7v:{ en:'Turn a design into a lifelike, photorealistic room render.' },
  yasT8t:{ en:'AI Visualiser — Room Designer' },
  yasT8v:{ en:'Design your space live in our interactive 3D Room Designer.' },
  // How-it-works guide
  guideEyebrow:{ en:'How the planner works' },
  guideHeadline:{ en:'Design your space in minutes' },
  guideSub:    { en:'Plan a kitchen, wardrobe, TV unit, door or home office online — pick a layout, set your space, choose your finishes and see your price in BHD. Bespoke, manufactured and installed in Bahrain.' },
  guideHowEyebrow:{ en:'How it works' },
  guideHowTitle:{ en:'Four simple steps' },
  guideS1t:{ en:'Pick your product & layout' },
  guideS2t:{ en:'Set your space' },
  guideS3t:{ en:'Choose finishes & accessories' },
  guideS4t:{ en:'See your price & request a quote' },
  guideTryRoomDesigner:{ en:'Try the Room Designer →' },
  guideQuestions:{ en:'Questions' },
  guideFaqTitle:{ en:'Frequently asked' },
  guideReady:  { en:'Ready to start?' },
  guideQ1:{ en:'Is the planner free to use?' },
  guideQ2:{ en:'Do I need exact measurements?' },
  guideQ3:{ en:'Can I save my design?' },
  guideQ4:{ en:'Is the price final?' },
  guideQ5:{ en:'Can I change materials later?' },
  guideQ6:{ en:'Do you install?' },
  // category landing pages — H1 / subhead / CTA
  kitchenHeroTitle:{ en:'Precision cabinetry, engineered for daily life.' },
  kitchenHeroSub:{ en:'Designed, manufactured and installed by our own team. Choose your layout, cabinets and worktop — then see it in 3D with a live quote.' },
  wardrobeHeroTitle:{ en:'Storage that disappears into the architecture.' },
  wardrobeHeroSub:{ en:'Our flagship craft — walk-in dressing rooms, sliding and fitted wardrobes, designed to the centimetre. Choose your type, interior and finish, then see it in 3D with a live quote.' },
  doorHeroTitle:{ en:'Doors made to measure, finished to match.' },
  doorHeroSub:{ en:'From a flush interior leaf to a statement pivot or a grand double majlis door — designed to the millimetre. Choose your type, wood and finish, then plan it with a live quote.' },
  tvHeroTitle:{ en:'A media wall built around your living room.' },
  tvHeroSub:{ en:'From a minimal floating panel to a full floor-to-ceiling wall with display, storage, lighting and a fireplace — designed to the centimetre. Choose your layout and finish, then plan it with a live quote.' },
  officeHeroTitle:{ en:'A workspace built around the way you work.' },
  officeHeroSub:{ en:'From a floating desk in the bedroom to a full storage wall with an integrated worktop — designed to the centimetre. Choose your layout, desk and finish, then plan it with a live quote.' },

  // ── Wave 2: planner SHELL chrome (shared across all planner wizards) ──
  pGetQuote:        { en:'Get quote' },
  pGetQuoteArrow:   { en:'Get quote →' },
  pGetMyQuoteArrow: { en:'Get my quote →' },
  pSignInQuoteArrow:{ en:'Sign in & get quote →' },
  pSignInQuote:     { en:'Sign in & quote' },
  pSaveDesign:      { en:'Save design' },
  pDownloadPdf:     { en:'Download PDF quotation' },
  pSendQuoteReq:    { en:'Send quote request' },
  pSignInSend:      { en:'Sign in & send' },
  pSending:         { en:'Sending…' },
  pCancel:          { en:'Cancel' },
  pBack:            { en:'‹ Back' },
  pExit:            { en:'‹ Exit' },
  pNextArrow:       { en:'Next →' },
  pTotal:           { en:'Total' },
  pEstimatedTotal:  { en:'Estimated total' },
  pBillOfMaterials: { en:'Bill of materials' },
  pHide:            { en:'Hide' },
  pPreview:         { en:'Preview' },
  p2dPlan:          { en:'2D plan' },
  p3dView:          { en:'3D view' },
  pOpenRoomDesigner:{ en:'🎨 Open Room Designer' },
  p2dElevation:     { en:'2D elevation · front view' },
  pAlmostThere:     { en:'Almost there' },
  pYourName:        { en:'Your name' },
  pModularBlocks:   { en:'Modular blocks' },
  // quote-modal titles
  pQuoteTitleTV:    { en:'Get your TV unit quote' },
  pQuoteTitleOffice:{ en:'Get your home office quote' },
  pQuoteTitleDoor:  { en:'Get your wood door quote' },
  pQuoteTitleKitchen:{ en:'Get your kitchen quote' },
  pQuoteTitleWardrobe:{ en:'Get your wardrobe quote' },

  // ── Wave 2: dimension / parameter field labels ──
  fWidth:        { en:'Width' },
  fHeight:       { en:'Height' },
  fDepth:        { en:'Depth' },
  fLength:       { en:'Length' },
  fWallWidth:    { en:'Wall width' },
  fWallHeight:   { en:'Wall height' },
  fCeilingHeight:{ en:'Ceiling height' },
  fRoomWidth:    { en:'Room width' },
  fRoomLength:   { en:'Room length' },
  fWardrobeDepth:{ en:'Wardrobe depth' },
  fNumberOfDoors:{ en:'Number of doors' },
  fTvSize:       { en:'TV size' },
  fCabinetLength:{ en:'Cabinet length' },
  fCabinetDepth: { en:'Cabinet depth' },
  fCabinetHeight:{ en:'Cabinet height' },
  fRunLength:    { en:'Run length' },
  fDeskLength:   { en:'Desk length' },
  fDeskDepth:    { en:'Desk depth' },
  fDeskShape:    { en:'Desk shape' },
  fTotalWallLength:{ en:'Total wall length' },
  fOpeningWidth: { en:'Opening width' },
  fOpeningHeight:{ en:'Opening height' },
  fWallThickness:{ en:'Wall thickness' },
  fFloorFinish:  { en:'Floor finish thickness' },
  fType:         { en:'Type' },
  fPosition:     { en:'Position' },

  // ── Wave 2: parameter group / section sub headers ──
  gParameters:   { en:'parameters' },
  gCarcass:      { en:'Carcass' },
  gFinish:       { en:'Finish' },
  gDoorFinish:   { en:'Door finish' },
  gCountertop:   { en:'Countertop' },
  gWorktopMaterial:{ en:'Worktop material' },
  gDecorativePanels:{ en:'Decorative panels' },
  gConnectedDevices:{ en:'Connected devices' },
  gBaseUnits:    { en:'Base units' },
  gWallUnits:    { en:'Wall units' },
  gTallUnits:    { en:'Tall units' },

  // ── Wave 2: validation / helper / status messages ──
  vNoTarget:     { en:'No target' },
  vCircTight:    { en:'⚠ Circulation below 900mm is tight for a walk-in.' },
  vModulesExceedWall:{ en:'Modules exceed available wall' },
  vTriangleOk:   { en:'within recommended guidelines ✓' },
  vTriangleBad:  { en:'one or more legs out of range ⚠' },
  vWorkTriangle: { en:'Work triangle' },
  vAddOpening:   { en:'+ Add opening' },
  vAddOpeningConstraint:{ en:'+ Add opening / constraint' },
  vAddConstraint:{ en:'+ Add constraint' },
  // PlannerPage stage labels
  pgProduct:   { en:'Product' },
  pgKickstart: { en:'Kickstart' },
  pgConfigure: { en:'Configure' },
  pgVisualise: { en:'Visualise' },
  pgQuote:     { en:'Quote' },
  pgSignInQuoteArrow:{ en:'Sign in & quote →' },
  pgClose:     { en:'Close ✕' },
  pContinueArrow:{ en:'Continue →' },

  // ── Wave 2: section headers (title + sub) — KITCHEN ──
  shK0t:{ en:'Room shape' },
  shK0s:{ en:'Start with the overall footprint of your space.' },
  shK1t:{ en:'Room dimensions' },
  shK1s:{ en:'Enter interior wall-to-wall measurements in millimetres.' },
  shK2t:{ en:'Openings & obstacles' },
  shK2s:{ en:'Add doors, windows, columns, beams and AC ducts — they appear on the plan.' },
  shK3t:{ en:'Select layout' },
  shK3s:{ en:'Pick a configuration — then set its parameters below.' },
  shK4t:{ en:'Work triangle' },
  shK4s:{ en:'Drag Fridge (F), Sink (S) and Hob (H) on the plan. Each leg should be 1.2–2.7m.' },
  shK5t:{ en:'Cabinets' },
  shK5s:{ en:'Add base, wall and tall units with quantities.' },
  shK6t:{ en:'Materials' },
  shK6s:{ en:'Carcass, door finish and countertop drive the price.' },
  shK7t:{ en:'Accessories' },
  shK7s:{ en:'Set quantities for the finishing details.' },
  shSummaryT:{ en:'Summary & quote' },
  shSummaryS:{ en:'Your bill of materials, live cost estimate and next steps.' },

  // ── section headers — TV ──
  shTv0t:{ en:'Room type' },
  shTv0s:{ en:'Where will this media unit live?' },
  shTv1t:{ en:'Wall dimensions' },
  shTv1s:{ en:'Measure the wall the unit will sit against, in millimetres.' },
  shOpeningsT:{ en:'Openings & constraints' },
  shOpeningsS:{ en:'Add doors, windows, columns, AC units and outlets — they appear on the elevation.' },
  shTv3t:{ en:'Layout' },
  shTv3s:{ en:'Pick a configuration — then tune its parameters and modular blocks.' },
  shTv4t:{ en:'TV details' },
  shTv4s:{ en:'Tell us about the screen and connected devices.' },
  shTv5t:{ en:'Storage requirements' },
  shTv5s:{ en:'What needs a home in the unit?' },
  shTv6t:{ en:'Materials' },
  shTv6s:{ en:'Carcass, finish and the decorative panel drive the look and the price.' },
  shTv7t:{ en:'Lighting' },
  shTv7s:{ en:'Integrated lighting transforms a media wall after dark.' },

  // ── section headers — OFFICE ──
  shOf0t:{ en:'Room type' },
  shOf0s:{ en:'Where will this home office live?' },
  shOf1t:{ en:'Wall / room dimensions' },
  shOf1s:{ en:'Measure the wall the office will sit against, in millimetres.' },
  shOf3t:{ en:'Layout' },
  shOf3s:{ en:'Pick a configuration — then tune its modular blocks below.' },
  shOf4t:{ en:'Desk & worktop' },
  shOf4s:{ en:'Size your desk and choose the worktop material.' },
  shOf5t:{ en:'Storage' },
  shOf5s:{ en:'How much storage does the office need?' },
  shOf6t:{ en:'Materials' },
  shOf6s:{ en:'Carcass and finish drive the look and the price.' },
  shOf7t:{ en:'Lighting' },
  shOf7s:{ en:'Integrated lighting keeps the desk bright and the shelves glowing.' },

  // ── section headers — WARDROBE ──
  shW0t:{ en:'Room type' },
  shW0s:{ en:'Where will this wardrobe live? This shapes the recommended layouts.' },
  shW1t:{ en:'Room dimensions' },
  shW1s:{ en:'Interior wall-to-wall measurements in millimetres. Default wardrobe depth is 600mm.' },
  shW2t:{ en:'Room constraints' },
  shW2s:{ en:'Add doors, windows, columns, beams, AC units and outlets — they appear on the plan.' },
  shW3t:{ en:'Wardrobe layout' },
  shW3s:{ en:'Pick a configuration — then set its parameters below.' },
  shW4t:{ en:'User profile' },
  shW4s:{ en:'This drives the AI storage allocation — be honest about what you own.' },
  shW5t:{ en:'Internal configuration' },
  shW5s:{ en:'Pre-seeded from the AI allocation. Adjust quantities to suit.' },
  shW6t:{ en:'Door selection' },
  shW6sOpen:{ en:'This open / walk-in layout has no fronted doors — internal modules only.' },
  shW7t:{ en:'Materials' },
  shW7s:{ en:'Carcass and finish drive the price and the look.' },
  shW8t:{ en:'Lighting' },
  shW8s:{ en:'Layer in integrated lighting — toggle what you want.' },
  shW9s:{ en:'Your bill of materials, the AI allocation, live cost and next steps.' },

  // ── section headers — DOOR ──
  shD0t:{ en:'Door type' },
  shD0s:{ en:'Choose a configuration — or start from a popular preset.' },
  shD1t:{ en:'Location' },
  shD1s:{ en:'Where will this door go? We pre-fill recommended dimensions.' },
  shD2t:{ en:'Opening dimensions' },
  shD2s:{ en:'Measure the structural opening, in millimetres.' },
  shD3t:{ en:'Opening direction' },
  shD3sSlide:{ en:'Which way does the leaf slide?' },
  shD3sSwing:{ en:'Hinge side and swing direction — shown live on the elevation.' },
  shD4t:{ en:'Construction' },
  shD4s:{ en:'Core sets weight & performance; frame supports the leaf.' },
  shD5t:{ en:'Finish' },
  shD5s:{ en:'Choose the wood species and the surface treatment.' },
  shD6t:{ en:'Design style' },
  shD6s:{ en:'From minimal modern to luxury inlays — drawn live on the leaf.' },
  shD7t:{ en:'Glass options' },
  shD7s:{ en:'Add glazing — reflected on the elevation immediately.' },
  shD8t:{ en:'Hardware' },
  shD8s:{ en:'Hinges, lock and handle — weight-aware recommendations.' },
  shD9t:{ en:'Accessories' },
  shD9s:{ en:'Optional extras for comfort, safety and performance.' },
  shDSummaryS:{ en:'Your bill of materials, live cost estimate and validation.' },

  // ── Wave 3: option CARD names/subs (rendered via trOpt; English stays the data key) ──
  // Kitchen shapes
  optSingleWall:{ en:'Single Wall' },
  optGalley:{ en:'Galley' },
  optGalleyKitchen:{ en:'Galley Kitchen' },
  optLShape:{ en:'L-Shape' },
  optLShaped:{ en:'L-shaped' },
  optLShapedKitchen:{ en:'L-Shaped Kitchen' },
  optUShape:{ en:'U-Shape' },
  optUShaped:{ en:'U-shaped' },
  optUShapedKitchen:{ en:'U-Shaped Kitchen' },
  optUShapeWalkin:{ en:'U-Shape walk-in' },
  optPeninsula:{ en:'Peninsula' },
  optIsland:{ en:'Island' },
  optStraight:{ en:'Straight' },
  optStraightWall:{ en:'Straight / single-wall' },
  optStraightSub:{ en:'One run along a single wall' },
  optStraightCleanSub:{ en:'One clean run along a single wall' },
  optGalleySub:{ en:'Two runs facing each other' },
  optLShapeSub:{ en:'Two runs that meet in a corner' },
  optLShapeMeetSub:{ en:'Two runs meeting in a corner' },
  optUShapeSub:{ en:'Three runs around three walls' },
  optIslandSub:{ en:'A run plus a central island' },
  optPeninsulaSub:{ en:'A connected return / breakfast bar' },
  // Wardrobe layouts
  optWalkinRoom:{ en:'Walk-in room' },
  optWalkinRoomSub:{ en:'Open dressing room with island' },
  optSliding:{ en:'Sliding' },
  optSlidingSub:{ en:'Sliding-door fitted wardrobe' },
  optHinged:{ en:'Hinged' },
  optHingedSub:{ en:'Hinged-door fitted wardrobe' },
  optStraightSingleSub:{ en:'One run along a single wall' },
  // Wardrobe product cards (planner picker)
  optWalkinCloset:{ en:'Walk-in closet' },
  optWalkinClosetSub:{ en:'A private dressing room of your own' },
  optSlidingWardrobe:{ en:'Sliding-door wardrobe' },
  optSlidingWardrobeSub:{ en:'Space-saving, seamless fronts' },
  optHingedWardrobe:{ en:'Hinged / fitted wardrobe' },
  optHingedWardrobeSub:{ en:'Classic doors, fully fitted' },
  optReachin:{ en:'Fitted / reach-in' },
  optReachinSub:{ en:'Built-in storage that disappears' },
  // TV layouts
  optFloating:{ en:'Floating' },
  optFloatingSub:{ en:'Floating base + wall panel' },
  optFullWall:{ en:'Full Wall' },
  optFullWallSub:{ en:'Tall cabinets + display' },
  optDisplayShelves:{ en:'Display Shelves' },
  optDisplayShelvesSub:{ en:'Open shelves + niches' },
  optFireplace:{ en:'Fireplace' },
  optFireplaceSub:{ en:'Electric fire + cladding' },
  optMinimal:{ en:'Minimal' },
  optMinimalSub:{ en:'Panel + floating shelf' },
  optStorageWall:{ en:'Storage Wall' },
  optStorageWallSub:{ en:'Bookcases + cabinets' },
  // TV room types
  optLivingRoom:{ en:'Living room' },
  optLivingRoomSub:{ en:'Main lounge media wall' },
  optMajlis:{ en:'Majlis' },
  optMajlisSub:{ en:'Formal seating room' },
  optBedroomTv:{ en:'Bedroom' },
  optBedroomTvSub:{ en:'TV facing the bed' },
  optFamilyRoom:{ en:'Family room' },
  optFamilyRoomSub:{ en:'Casual everyday space' },
  optOfficeTv:{ en:'Office' },
  optOfficeTvSub:{ en:'Display + work storage' },
  // Door types
  optSingleSwing:{ en:'Single Swing' },
  optSingleSwingSub:{ en:'One hinged leaf' },
  optDoubleSwing:{ en:'Double Swing' },
  optDoubleSwingSub:{ en:'Two hinged leaves' },
  optSlidingDoor:{ en:'Sliding' },
  optSlidingDoorSub:{ en:'Slides on a track' },
  optPivot:{ en:'Pivot' },
  optPivotSub:{ en:'Centre / offset pivot' },
  optHidden:{ en:'Hidden' },
  optHiddenSub:{ en:'Flush concealed frame' },
  optFolding:{ en:'Folding' },
  optFoldingSub:{ en:'Bi-fold panels' },
  // Door styles
  optFlush:{ en:'Flush' },
  optFlushSub:{ en:'Smooth flat leaf' },
  optGrooveLines:{ en:'Groove lines' },
  optGrooveLinesSub:{ en:'Routed grooves' },
  optSlatted:{ en:'Slatted' },
  optSlattedSub:{ en:'Vertical slats' },
  optRaisedPanels:{ en:'Raised panels' },
  optRaisedPanelsSub:{ en:'Framed panels' },
  optMouldings:{ en:'Decorative mouldings' },
  optMouldingsSub:{ en:'Ornate trims' },
  optMetalInlays:{ en:'Metal inlays' },
  optMetalInlaysSub:{ en:'Brass / steel lines' },
  optStoneInserts:{ en:'Stone inserts' },
  optStoneInsertsSub:{ en:'Marble accents' },
  optLeatherPanels:{ en:'Leather panels' },
  optLeatherPanelsSub:{ en:'Upholstered panels' },
  optGlassInserts:{ en:'Glass inserts' },
  optGlassInsertsSub:{ en:'Decorative glazing' },
  // Door types (catalog cards)
  optFlushInterior:{ en:'Flush Interior Door' },
  optFlushInteriorSub:{ en:'Simplest modern leaf' },
  optGrooveModern:{ en:'Groove Modern Door' },
  optGrooveModernSub:{ en:'Routed groove lines' },
  optSlidingCatalog:{ en:'Sliding Door' },
  optSlidingCatalogSub:{ en:'Track-mounted leaf' },
  optDoubleMajlis:{ en:'Double Majlis Door' },
  optDoubleMajlisSub:{ en:'Twin grand leaves' },
  optPivotEntrance:{ en:'Pivot Entrance Door' },
  optPivotEntranceSub:{ en:'Architectural pivot' },
  optHiddenDoorSystem:{ en:'Hidden Door System' },
  optHiddenDoorSystemSub:{ en:'Flush, frameless look' },
  // Door locations
  optMainEntrance:{ en:'Main entrance' },
  optMainEntranceSub:{ en:'Front of the home' },
  optBedroomDoor:{ en:'Bedroom' },
  optBedroomDoorSub:{ en:'Private rooms' },
  optBathroom:{ en:'Bathroom' },
  optBathroomSub:{ en:'Wet areas' },
  optKitchenDoor:{ en:'Kitchen' },
  optKitchenDoorSub:{ en:'Cooking spaces' },
  optOfficeDoor:{ en:'Office' },
  optOfficeDoorSub:{ en:'Study / work room' },
  optMajlisDoor:{ en:'Majlis' },
  optMajlisDoorSub:{ en:'Formal reception' },
  optUtilityRoom:{ en:'Utility room' },
  optUtilityRoomSub:{ en:'Laundry / store' },
  // Door core / frame / finish / surface
  optHollow:{ en:'Hollow' },
  optHollowSub:{ en:'Light interior core' },
  optSemiSolid:{ en:'Semi-solid' },
  optSemiSolidSub:{ en:'Tubular / honeycomb' },
  optSolidCore:{ en:'Solid' },
  optSolidCoreSub:{ en:'Solid timber / MDF core' },
  optFireRated:{ en:'Fire-rated' },
  optFireRatedSub:{ en:'60-min certified core' },
  optFrameStandard:{ en:'Standard' },
  optFrameStandardSub:{ en:'Timber lining + architrave' },
  optFrameHidden:{ en:'Hidden' },
  optFrameHiddenSub:{ en:'Concealed aluminium jamb' },
  optFrameAluminum:{ en:'Aluminum' },
  optFrameAluminumSub:{ en:'Powder-coated alloy' },
  optFrameSteel:{ en:'Steel-reinforced' },
  optFrameSteelSub:{ en:'For heavy / security leaves' },
  optVeneerFinish:{ en:'Veneer' },
  optVeneerFinishSub:{ en:'Real wood veneer' },
  optLaminateFinish:{ en:'Laminate' },
  optLaminateFinishSub:{ en:'Durable HPL' },
  optMelamineFinish:{ en:'Melamine' },
  optMelamineFinishSub:{ en:'Budget faced' },
  optLacquerPaint:{ en:'Lacquer paint' },
  optLacquerPaintSub:{ en:'Smooth sprayed' },
  optPuPaint:{ en:'PU paint' },
  optPuPaintSub:{ en:'Premium PU finish' },
  // Office layouts
  optWallStorage:{ en:'Wall Storage Office' },
  optWallStorageSub:{ en:'Full storage wall + desk' },
  optCornerOffice:{ en:'Corner Home Office' },
  optCornerOfficeSub:{ en:'Two-wall corner desk' },
  optBuiltIn:{ en:'Built-in Office with Shelves' },
  optBuiltInSub:{ en:'Joinery + display shelving' },
  optStorageDesk:{ en:'Storage Wall with Desk' },
  optStorageDeskSub:{ en:'Floor-to-ceiling + worktop' },
  optMinimalOffice:{ en:'Minimal Home Office' },
  optMinimalOfficeSub:{ en:'Floating desk + shelf' },
  optLShapedOffice:{ en:'L-Shaped Home Office' },
  optLShapedOfficeSub:{ en:'L-return desk + storage' },
  // Office room types
  optHomeOffice:{ en:'Home office' },
  optHomeOfficeSub:{ en:'Dedicated work room' },
  optStudy:{ en:'Study' },
  optStudySub:{ en:'Reading & focus space' },
  optBedroomCorner:{ en:'Bedroom corner' },
  optBedroomCornerSub:{ en:'Desk in the bedroom' },
  optLivingNook:{ en:'Living room nook' },
  optLivingNookSub:{ en:'Work in the lounge' },
  optGuestRoomOffice:{ en:'Guest room' },
  optGuestRoomOfficeSub:{ en:'Dual-use spare room' },
  // Wardrobe room types
  optMasterBedroom:{ en:'Master bedroom' },
  optMasterBedroomSub:{ en:'Primary suite wardrobe wall' },
  optBedroom:{ en:'Bedroom' },
  optBedroomSub:{ en:'Standard fitted wardrobe' },
  optGuestRoom:{ en:'Guest room' },
  optGuestRoomSub:{ en:'Occasional-use storage' },
  optWalkinRoomType:{ en:'Walk-in room' },
  optWalkinRoomTypeSub:{ en:'Dedicated walk-in closet' },
  optDressingRoom:{ en:'Dressing room' },
  optDressingRoomSub:{ en:'Island, vanity & seating' },
  // Room shapes (kitchen)
  optRectangle:{ en:'Rectangle' },
  optRectangleSub:{ en:'Standard four-wall room' },
  optSquare:{ en:'Square' },
  optSquareSub:{ en:'Equal length & width' },
  optLRoom:{ en:'L-shaped room' },
  optLRoomSub:{ en:'Room with a return wall' },
  optCustom:{ en:'Custom' },
  optCustomSub:{ en:'Irregular — set dimensions' },
  // Material / finish option names + subs
  optMelamine:{ en:'Melamine' },
  optMelamineSub:{ en:'Durable, exceptional value' },
  optMelamineBoardSub:{ en:'Melamine-faced chipboard' },
  optAcrylicGloss:{ en:'High-gloss acrylic' },
  optAcrylicGlossSub:{ en:'Reflective, premium' },
  optVeneer:{ en:'Real-wood veneer' },
  optVeneerSub:{ en:'Natural grain, luxe' },
  optMattLacquer:{ en:'Matt lacquer' },
  optMattLacquerSub:{ en:'Smooth painted, any RAL' },
  optGlassFront:{ en:'Glass / mirror front' },
  optGlassFrontSub:{ en:'Display & dressing' },
  optLaminate:{ en:'Laminate' },
  optLaminateSub:{ en:'Budget-friendly, huge choice' },
  optSolidWood:{ en:'Solid wood / butcher block' },
  optSolidWoodSub:{ en:'Warm & natural' },
  optGranite:{ en:'Granite' },
  optGraniteSub:{ en:'Natural stone, unique' },
  optQuartzStone:{ en:'Quartz (engineered stone)' },
  optQuartzStoneSub:{ en:'Durable premium' },
  optSolidSurface:{ en:'Solid surface (acrylic)' },
  optSolidSurfaceSub:{ en:'Seamless, repairable' },
  // Kitchen door styles
  optShaker:{ en:'Shaker' },
  optShakerSub:{ en:'Framed door, timeless' },
  optFlatSlab:{ en:'Flat / slab' },
  optFlatSlabSub:{ en:'Clean, handleless-ready' },
  optHandleless:{ en:'Handleless J-pull' },
  optHandlelessSub:{ en:'Seamless, contemporary' },
  optInframe:{ en:'In-frame' },
  optInframeSub:{ en:'Heritage craftsmanship' },
  optHighGloss:{ en:'High-gloss' },
  optHighGlossSub:{ en:'Reflective, premium' },
  optRealWoodVeneer:{ en:'Real-wood veneer' },
  optRealWoodVeneerSub:{ en:'Natural grain, luxe' },
  // Construction (carcass)
  optMdf:{ en:'MDF' },
  optMdfSub:{ en:'Moisture-resistant board' },
  optPlywood:{ en:'Plywood' },
  optPlywoodSub:{ en:'Premium, screw-holding' },
  optMfc:{ en:'MFC' },
  optMfcSub:{ en:'Melamine-faced chipboard' },
  // Wardrobe internals / zones
  optShortHanging:{ en:'Short hanging' },
  optShortHangingSub:{ en:'1000–1100mm drop' },
  optLongHanging:{ en:'Long hanging' },
  optLongHangingSub:{ en:'1600–1800mm drop' },
  optDoubleHanging:{ en:'Double hanging' },
  optDoubleHangingSub:{ en:'Two rails stacked' },
  optAdjShelves:{ en:'Adjustable shelves' },
  optAdjShelvesSub:{ en:'350–450mm deep' },
  optFixedShelves:{ en:'Fixed shelves' },
  optFixedShelvesSub:{ en:'Structural, 400mm' },
  optSmallDrawers:{ en:'Small drawers' },
  optSmallDrawersSub:{ en:'450–500mm runners' },
  optDeepDrawers:{ en:'Deep drawers' },
  optDeepDrawersSub:{ en:'Knitwear / folded' },
  optJewelryDrawer:{ en:'Jewelry drawer' },
  optJewelryDrawerSub:{ en:'Felt-lined tray' },
  optShoeRack:{ en:'Shoe rack' },
  optShoeRackSub:{ en:'300–350mm angled' },
  // Sliding / hinged door fronts
  optGlassFrontW:{ en:'Glass' },
  optMirror:{ en:'Mirror' },
  optWood:{ en:'Wood' },
  optAluFrame:{ en:'Aluminium frame' },
  optFlatPanel:{ en:'Flat panel' },
  optShakerDoor:{ en:'Shaker' },
  optGrooveFluted:{ en:'Groove / fluted' },
  optGlassInsertW:{ en:'Glass insert' },

  // ── Room Designer UI ──
  rdRoomDesigner:{ en:'Room Designer' },
  rdClose:{ en:'Close' },
  rd3d:{ en:'3D' },
  rdPhoto:{ en:'Photo' },
  rdLive:{ en:'Live' },
  rdChooseFinish:{ en:'Choose finish' },
  rdYourFinishes:{ en:'Your finishes' },
  rdChoose:{ en:'Choose' },
  rdRenderPhotoreal:{ en:'Render photoreal' },
  rdRendering:{ en:'Rendering…' },
  rdIndicativeTotal:{ en:'Indicative total' },
  rdPhotorealRender:{ en:'Photoreal render' },
  rdBackToDesign:{ en:'Back to design' },
  rdDownloadRender:{ en:'Download render' },
  rdAiDisclaimer:{ en:'Indicative AI impression. Exact finishes confirmed at your free design consultation.' },
  rdLoading:{ en:'Loading the room designer…' },
  rdUnavailable:{ en:'Room designer unavailable' },
  rdNoOptions:{ en:'No finishes available for this surface yet.' },
  rdShowingAvailable:{ en:'Showing finishes available for this surface.' },
  rdAllShown:{ en:'All finishes shown.' },
  rdOption:{ en:'option' },
  rdOptions:{ en:'options' },
  rdSceneSwitcher:{ en:'Choose room layout' },
  rdHintOrbit:{ en:'Drag to orbit · tap a surface or chip to change its finish' },
  rdHintOrbitPhoto:{ en:' · switch to Photo for the masked view' },
  rdHintMarker:{ en:'Tap a marker or chip to change a finish' },
  rdHint3d:{ en:' · switch to 3D for a live preview' },
  rdPanelEmpty:{ en:'are being set up. Your planner selections still apply to your quote.' },
  // Room Designer DB-driven surface labels + material values
  rdsCabinets:{ en:'Cabinets' },
  rdsWorktop:{ en:'Worktop' },
  rdsSplashback:{ en:'Splashback' },
  rdsWall:{ en:'Wall' },
  rdsFloor:{ en:'Floor' },
  rdsHandles:{ en:'Handles' },
  rdsDoorFace:{ en:'Door face' },
  rdsDoorFront:{ en:'Door front' },
  rdsFrame:{ en:'Frame' },
  rdsUnits:{ en:'Units' },
  rdsFeatureWall:{ en:'Feature wall' },
  rdsShelves:{ en:'Shelves' },
  rdsDeskTop:{ en:'Desk top' },
  rdsInterior:{ en:'Interior' },
  rdsCarcass:{ en:'Carcass' },
  rdsBody:{ en:'Body' },
  rdsCountertop:{ en:'Countertop' },
  rdsBacksplash:{ en:'Backsplash' },
  // Room Designer material values (group/name)
  rdmFinishes:{ en:'Finishes' },
  rdmSolidColour:{ en:'Solid colour' },
  rdmSolidColor:{ en:'Solid color' },
  rdmWoodgrain:{ en:'Woodgrain' },
  rdmStone:{ en:'Stone' },
  rdmQuartz:{ en:'Quartz' },
  rdmGranite:{ en:'Granite' },
  rdmMarble:{ en:'Marble' },
  rdmOakVeneer:{ en:'Oak Veneer' },
  rdmWalnutVeneer:{ en:'Walnut Veneer' },
  rdmMatt:{ en:'Matt' },
  rdmGloss:{ en:'Gloss' },
  // Room Designer product nouns + summary CTA
  rdNounKitchen:{ en:'kitchen' },
  rdNounWardrobe:{ en:'wardrobe' },
  rdNounTv:{ en:'TV unit' },
  rdNounDoor:{ en:'door' },
  rdNounOffice:{ en:'home office' },
  rdNounDesign:{ en:'design' },
  rdGoToSummary:{ en:'Go to Summary' },
  rdStyleYour:{ en:'Style your' },
  rdSettingUp:{ en:'are being set up. Your selections in the planner still flow through to your quote.' },
  rdTapMarker:{ en:'Tap a' },
  rdInThe3d:{ en:'(or a surface in the 3D view)' },
  rdMarkerToChoose:{ en:'marker' },
  rdToChooseFinishesFor:{ en:'to choose finishes for' },
  rdAndMore:{ en:'and more.' },
  rdEachSurface:{ en:'each surface' },
  rdRenderingYour:{ en:'Rendering your' },
  rdCompositing:{ en:'Compositing your finishes into a photoreal scene. This usually takes 15–25 seconds.' },

  // ── Wave 4: long-tail (toasts, BOM/spec, auth/portal, product & marketing) ──
  // Toasts — generic
  w4DesignSaved:{ en:'Design saved' },
  w4DesignSavedRef:{ en:'Design saved — reference' },
  w4CouldNotSave:{ en:'Could not save:' },
  w4TryAgain:{ en:'try again' },
  w4PleaseTryAgain:{ en:'please try again' },
  w4AddNamePhone:{ en:'Please add your name and phone' },
  w4AddNamePhoneFirst:{ en:'Please add your name and phone first' },
  w4AllowPopups:{ en:'Allow pop-ups to download the quotation' },
  w4CouldNotSend:{ en:'Could not send:' },
  w4QuoteSentDesign:{ en:'Quote request sent — our design team will be in touch' },
  w4QuoteSentDoor:{ en:'Quote request sent — our door team will be in touch' },
  w4QuoteSentKitchen:{ en:'Quote request sent — our kitchen team will be in touch' },
  w4ApptKitchen:{ en:'Appointment requested — our kitchen team will be in touch' },
  w4DraftSaved:{ en:'Draft saved' },
  w4SubmittedApproval:{ en:'Submitted for approval — our design team will be in touch' },
  w4CouldNotSubmit:{ en:'Could not submit:' },
  w4CouldNotSavePhoto:{ en:'Could not save photo' },
  w4CouldNotSaveNow:{ en:'Could not save right now' },
  w4SignInToSaveConcept:{ en:'Sign in to save this concept to your account' },
  w4SavedToAccount:{ en:'Saved to your account ✓' },
  // Render / photoreal status & prose
  w4RenderNotOn:{ en:'Photorealistic rendering isn’t switched on yet — your live preview above still reflects every finish.' },
  w4RenderDidntCome:{ en:'Render didn’t come through this time. Please try again in a moment.' },
  w4NetworkHiccup:{ en:'Network hiccup — please try again in a moment.' },
  w4AiImpression:{ en:'AI-generated impression — exact finishes confirmed in your free design consultation.' },
  w4VisualiseDesign:{ en:'Visualise my design →' },
  // Spec / BOM on-screen labels
  w4SpecDimsIndicative:{ en:'Dimensions indicative.' },
  w4SpecUnits:{ en:'units' },
  w4SpecAccessoryLines:{ en:'accessory lines' },
  w4SpecAppliances:{ en:'appliances' },
  w4SpecWorktop:{ en:'worktop' },
  w4SpecCarcass:{ en:'carcass' },
  w4SpecFronts:{ en:'fronts' },
  w4SpecFinishWord:{ en:'finish' },
  w4SpecPanelsTotal:{ en:'panels total' },
  w4SpecEdgeBand:{ en:'Edge-band ~' },
  w4SpecHinges:{ en:'hinges' },
  w4SpecRunnerPairs:{ en:'runner pairs' },
  w4SpecFactoryIndic:{ en:'All factory figures indicative — confirm against CNC nesting.' },
  w4SpecUnitsToInstall:{ en:'units to install' },
  w4SpecWorktopCap:{ en:'Worktop' },
  w4SpecEstTime:{ en:'Est. time' },
  w4SpecDay:{ en:'day(s), indicative)' },
  w4SpecAppliancesConnect:{ en:'Appliances to connect' },
  w4SpecNoneFlagged:{ en:'None flagged' },
  w4SpecHandlesFit:{ en:'Handles & accessories to fit' },
  w4SpecNone:{ en:'None' },
  w4SpecCabinetExceeds:{ en:'⚠ Cabinet run exceeds available wall length — reduce modules or extend walls.' },
  w4SoonSuffix:{ en:'soon' },
  w4SoonAiSuggestions:{ en:'AI design suggestions' },
  w4SoonMfgDrawings:{ en:'Manufacturing drawings' },
  w4SoonCncCut:{ en:'CNC cut list' },
  w4SoonRevHistory:{ en:'Revision history' },
  w4SoonApproval:{ en:'Approval workflow' },
  // Auth modal
  w4AuthReset:{ en:'Reset password' },
  w4AuthWelcome:{ en:'Welcome back' },
  w4AuthCreate:{ en:'Create account' },
  w4AuthResetSub:{ en:'We’ll help you back in' },
  w4AuthLoginSub:{ en:'Sign in to your Hub' },
  w4AuthRegisterSub:{ en:'Join and earn 100 welcome points' },
  w4AuthFullName:{ en:'Full name' },
  w4AuthPassword:{ en:'Password' },
  w4AuthPleaseWait:{ en:'Please wait…' },
  w4AuthSignIn:{ en:'Sign In' },
  w4AuthCreateBtn:{ en:'Create Account' },
  w4AuthEmailLink:{ en:'📧 Email me a reset link' },
  w4AuthTextCode:{ en:'📱 Text me a code' },
  w4AuthCheckEmail:{ en:'Check your email for a reset link — it opens your account to set a new password.' },
  w4AuthCode6:{ en:'6-digit code' },
  w4AuthNewPassword:{ en:'New password' },
  w4AuthSetNew:{ en:'Set new password' },
  w4AuthRegisterLink:{ en:'New here? Register →' },
  w4AuthLoginLink:{ en:'Already have an account? Sign in →' },
  w4AuthForgot:{ en:'Forgot your password?' },
  w4AuthBackToSignIn:{ en:'← Back to sign in' },
  w4AuthWelcomeToast:{ en:'Welcome back ✓' },
  w4AuthAccountCreated:{ en:'Account created — 100 points added ✓' },
  w4AuthEmailPwReq:{ en:'Email and password required' },
  w4AuthNameReq:{ en:'Name required' },
  w4AuthCouldNotSignIn:{ en:'Could not sign in' },
  w4AuthEnterEmail:{ en:'Enter your email' },
  w4AuthCodeSent:{ en:'Code sent (if the account exists)' },
  w4AuthLinkSent:{ en:'Reset link sent (if the account exists)' },
  w4AuthCouldNotReset:{ en:'Could not start reset' },
  w4AuthPwMin:{ en:'Password must meet all requirements (8+ chars, upper & lower, number, special)' },
  w4AuthPwUpdated:{ en:'Password updated ✓' },
  w4AuthBadCode:{ en:'Incorrect or expired code' },
  w4Optional:{ en:'optional' },
  // Portal / account
  w4PSpecification:{ en:'Specification' },
  w4PTotal:{ en:'Total' },
  w4PDesignAgain:{ en:'Design again' },
  w4PMyDesigns:{ en:'My Designs' },
  w4PNoDesigns:{ en:'No saved designs yet' },
  w4PStartStudio:{ en:'Start one in the Design Studio.' },
  w4POpenStudio:{ en:'Open Design Studio' },
  w4PDesignFallback:{ en:'Design' },
  w4PRewards:{ en:'Rewards' },
  w4PBalance:{ en:'Balance' },
  w4PPoints:{ en:'points' },
  w4PMember:{ en:'member' },
  w4PServiceRequests:{ en:'Service Requests' },
  w4PDescribeIssue:{ en:'Describe your issue…' },
  w4PSubmitRequest:{ en:'Submit Request' },
  w4PSupport:{ en:'Support' },
  w4PSubject:{ en:'Subject' },
  w4PDescription:{ en:'Description…' },
  w4PSubmitTicket:{ en:'Submit Ticket' },
  w4PProfile:{ en:'Profile' },
  w4PFullName:{ en:'Full Name' },
  w4PEmail:{ en:'Email' },
  w4PPhone:{ en:'Phone' },
  w4PSaveChanges:{ en:'Save Changes' },
  // Products / Gallery
  w4ProdAll:{ en:'All' },
  w4ProdSearch:{ en:'Search collection…' },
  w4ProdSearchAria:{ en:'Search collection' },
  w4ProdEyebrow:{ en:'The collection' },
  w4ProdTitle:{ en:'Every piece, made to measure.' },
  w4ProdSub:{ en:'Browse a selection of our kitchens, wardrobes, walk-ins and storage — each one designed, built and fitted in Bahrain.' },
  w4ProdPiece:{ en:'piece' },
  w4ProdPieces:{ en:'pieces' },
  w4ProdNothing:{ en:'Nothing here yet' },
  w4ProdTryDifferent:{ en:'Try a different category or search.' },
  // Product detail / info
  w4PdBack:{ en:'← Collection' },
  w4PdBespoke:{ en:'Bespoke' },
  w4PdMaterials:{ en:'Materials' },
  w4PdLeadTime:{ en:'Lead time' },
  w4PdSku:{ en:'SKU' },
  w4PdAddToCart:{ en:'Add to cart' },
  w4PdCustomise:{ en:'Customise this piece' },
  w4PdBookConsult:{ en:'Book a free design consultation →' },
  w4PdYouMayLike:{ en:'You may also like' },
  w4PdRecommended:{ en:'Recommended for you ✦' },
  // Showrooms / Inspiration / Offers empty states
  w4ShowroomsSoon:{ en:'Showroom details coming soon.' },
  w4ArticlesSoon:{ en:'Articles coming soon.' },
  w4ClaimOffer:{ en:'Claim this offer' },
  w4NoOffers:{ en:'No active offers right now.' },

  // ── Final sweep: home / marketing / footer / banners ──
  // Hero
  swHeroAlt:{ en:'Bespoke walk-in closet interior by The Closets' },
  swShowAnnouncement:{ en:'Show announcement' },
  // Appointment band
  swApptOnline:{ en:'Online design' },
  swApptOnlineSub:{ en:'Plan from anywhere with a video design consultation.' },
  swApptHome:{ en:'Home design' },
  swApptHomeSub:{ en:'A designer visits with samples and a tailored 3D concept.' },
  swApptShowroom:{ en:'Showroom visit' },
  swApptShowroomSub:{ en:'See real finishes and hardware in one of our 4 showrooms.' },
  swApptMeasure:{ en:'Home measure' },
  swApptMeasureSub:{ en:'We come to you, measure up and talk through ideas — free.' },
  swBookFree:{ en:'Book free →' },
  // Rooms band
  swRoomWardrobes:{ en:'Wardrobes' },
  swRoomWardrobesSub:{ en:'Walk-in, sliding & fitted' },
  swRoomKitchens:{ en:'Kitchens' },
  swRoomKitchensSub:{ en:'Modern, shaker & handleless' },
  swRoomOffice:{ en:'Home office' },
  swRoomOfficeSub:{ en:'Desks, storage & built-ins' },
  swRoomDoors:{ en:'Doors' },
  swRoomDoorsSub:{ en:'Swing, sliding, pivot & hidden' },
  swRoomTv:{ en:'TV & media units' },
  swRoomTvSub:{ en:'Floating, full-wall & storage' },
  swExplore:{ en:'Explore →' },
  // Designs band
  swDesignWardrobesDesc:{ en:'Fitted, sliding & walk-in storage built around your life.' },
  swDesignKitchensDesc:{ en:'Precision cabinetry, worktops and finishes for daily living.' },
  swView:{ en:'View' },
  // Style quick-links
  swStyleWalkin:{ en:'Walk-in closets' },
  swStyleSliding:{ en:'Sliding wardrobes' },
  swStyleShaker:{ en:'Shaker kitchens' },
  swStyleHandleless:{ en:'Handleless kitchens' },
  // Featured ranges
  swFeaturedEyebrow:{ en:'Featured ranges' },
  swFeaturedTitle:{ en:'Popular right now.' },
  swViewAllArrow:{ en:'View all →' },
  swSave:{ en:'Save' },
  swFrom:{ en:'from' },
  swViewArrow:{ en:'View →' },
  swCatBespoke:{ en:'Bespoke' },
  // Featured / product card badge + category eyebrow (displayed only; data stays English)
  cardFeatured:{ en:'Featured' },
  // CAT_KEY: product card category eyebrow (display translation; product NAME stays English)
  catWardrobes:{ en:'Wardrobes' },
  catSlidingWardrobes:{ en:'Sliding Wardrobes' },
  catWalkInClosets:{ en:'Walk-in Closets' },
  catKitchens:{ en:'Kitchens' },
  catTvUnits:{ en:'TV Units' },
  catDoors:{ en:'Doors' },
  catHomeOffice:{ en:'Home Office' },
  catStorage:{ en:'Storage' },
  catVanities:{ en:'Vanities' },
  catShelving:{ en:'Shelving' },
  // Booking / appointment form (displayed labels; saved/posted values stay English)
  bkApptType:{ en:'Appointment type' },
  bkKindDesignConsult:{ en:'Design Consultation' },
  bkKindFreeSiteVisit:{ en:'Free Site Visit' },
  bkKindShowroomVisit:{ en:'Showroom Visit' },
  bkKindOnlineConsult:{ en:'Online Consultation' },
  bkFullName:{ en:'Full name *' },
  bkPhone:{ en:'Phone *' },
  bkEmail:{ en:'Email' },
  bkAddress:{ en:'Address (for home/site visit)' },
  bkNotes:{ en:'Notes (optional)' },
  bkSubmit:{ en:'Request my free visit' },
  bkSubmitting:{ en:'Submitting…' },
  bkNamePhoneReq:{ en:'Name and phone are required' },
  bkRequested:{ en:'Booking requested — we’ll confirm by phone' },
  bkSubmitErr:{ en:'Could not submit, please try again' },
  bkBooked:{ en:'Booked' },
  bkThankYou:{ en:'Thank you.' },
  bkRequestedPrefix:{ en:'Your' },
  bkRequestedSuffix:{ en:'is requested.' },
  bkBackHome:{ en:'Back to home' },
  // Booking appointment-type as a display label (used in success line)
  bkApptDesignConsultLc:{ en:'design consultation' },
  bkApptFreeSiteVisitLc:{ en:'free site visit' },
  bkApptShowroomVisitLc:{ en:'showroom visit' },
  bkApptOnlineConsultLc:{ en:'online consultation' },
  // Booking interest / product select (display only; posted value stays English)
  bkIntKitchen:{ en:'Kitchen' },
  bkIntWardrobe:{ en:'Wardrobe' },
  bkIntWalkIn:{ en:'Walk-In Closet' },
  bkIntTvUnit:{ en:'TV Unit' },
  bkIntDoors:{ en:'Doors' },
  bkIntStorage:{ en:'Storage' },
  bkIntOther:{ en:'Other' },
  // Booking time-slot select (display only; posted value stays English)
  bkSlotMorning:{ en:'Morning (9–12)' },
  bkSlotAfternoon:{ en:'Afternoon (12–4)' },
  bkSlotEvening:{ en:'Evening (4–7)' },
  // Why band stats + badges
  swStatProjects:{ en:'Projects delivered' },
  swStatCraft:{ en:'Of craftsmanship' },
  swStatYrs:{ en:' yrs' },
  swStatShowrooms:{ en:'Showrooms' },
  swStatBespoke:{ en:'Bespoke & fitted' },
  swBadgeWorkshop:{ en:'Our own workshop' },
  swBadge15:{ en:'15 years of craft' },
  swBadge2yr:{ en:'10-year warranty' },
  swBadgeFreeDesign:{ en:'Free design service' },
  // Process timeline
  swHowEyebrow:{ en:'How it works' },
  swHowTitle:{ en:'From first sketch to final fit.' },
  swStep1Title:{ en:'Consultation' },
  swStep1Desc:{ en:'A free home or showroom visit to understand your space, style and budget.' },
  swStep2Title:{ en:'Design' },
  swStep2Desc:{ en:'3D layouts, materials and finishes — refined with you until it’s right.' },
  swStep3Title:{ en:'Craft' },
  swStep3Desc:{ en:'Built in our own Bahrain workshop with premium hardware and joinery.' },
  swStep4Title:{ en:'Install' },
  swStep4Desc:{ en:'Fitted by our own team, finished and cleaned, ready to use.' },
  // Marquee items
  swMarqWorkshop:{ en:'Own Bahrain workshop' },
  swMarqConsult:{ en:'Free design consultation' },
  swMarqHardware:{ en:'Premium European hardware' },
  swMarq15:{ en:'15 years of craft' },
  swMarq4:{ en:'4 showrooms' },
  swMarq2yr:{ en:'10-year warranty' },
  swMarqInstall:{ en:'Installed by our own team' },
  // AI designer band
  swAiBadge:{ en:'New · AI Interior Designer' },
  swAiTitle1:{ en:'See your room,' },
  swAiTitle2:{ en:'redesigned in seconds.' },
  swAiDesc:{ en:'Upload a photo or describe your space — our AI returns a tailored layout, materials and a photorealistic render you can refine with our designers.' },
  swAiTry:{ en:'Try the AI Designer →' },
  swAiFree:{ en:'Free · no signup' },
  swAiAfter:{ en:'After ✦' },
  swAiLivingAlt:{ en:'A living room reimagined by The Closets AI designer' },
  // Offers strip
  swOffersEyebrow:{ en:'Limited time' },
  swOffersTitle:{ en:'Current offers.' },
  swSeeAllOffers:{ en:'See all offers →' },
  swClaimOffer:{ en:'Claim offer →' },
  // ── Offers: common seeded offer cards (DB-driven; display-map on title/subtitle/badge). ──
  // Unknown/custom offers fall back to the English DB value (edit those in the Hub).
  offTitleKitchenUpgrade:{ en:'Kitchen Upgrade' },
  offTitleFinance0:{ en:'Finance 0%' },
  offTitleWalkInSeason:{ en:'Walk-In Closet Season' },
  offTitleWardrobeSale:{ en:'Wardrobe Sale' },
  offTitleFreeDesign:{ en:'Free Design Consultation' },
  offTitleFreeInstall:{ en:'Free Installation' },
  offTitleSummerSale:{ en:'Summer Sale' },
  offSubKitchenUpgrade:{ en:'Complimentary quartz worktop upgrade on full kitchens' },
  offSubFinance0:{ en:'Interest-free over up to 4 years on selected projects' },
  offSubWalkInSeason:{ en:'Save on bespoke walk-in dressing rooms' },
  offSubWardrobeSale:{ en:'Bespoke fitted wardrobes at special prices' },
  offSubFreeDesign:{ en:'Book a free design consultation with our experts' },
  offSubFreeInstall:{ en:'Free professional installation on selected projects' },
  offSubSummerSale:{ en:'Limited-time savings across the collection' },
  offBadgeFreeUpgrade:{ en:'Free upgrade' },
  offBadgeApr0:{ en:'APR 0%' },
  offBadgeUpTo25:{ en:'Up to 25% off' },
  offBadgeUpTo20:{ en:'Up to 20% off' },
  offBadgeUpTo30:{ en:'Up to 30% off' },
  offBadgeFree:{ en:'Free' },
  offBadgeLimited:{ en:'Limited time' },
  offBadgeNew:{ en:'New' },
  offViewOffer:{ en:'View offer' },
  // ── AI YAS: feature/capability chips ──
  yasCapTextToDesign:{ en:'Text-to-design' },
  yasCapRoomRedesign:{ en:'Room redesign' },
  yasCapPhotorealRender:{ en:'Photoreal render' },
  yasCapStyleMoodboards:{ en:'Style moodboards' },
  yasCapBudgetPlanning:{ en:'Budget planning' },
  yasCapProductPicks:{ en:'Product picks' },
  yasCapDesignChat:{ en:'Design chat' },
  yasCap3dVisualiser:{ en:'3D visualiser' },
  yasCapSmartRecs:{ en:'Smart recommendations' },
  yasCapInstantConcepts:{ en:'Instant concepts' },
  // ── AI YAS: how-it-works steps ──
  yasStep1Title:{ en:'Describe' },
  yasStep1Desc:{ en:'Tell YAS what you want in plain words, or upload a photo of your room.' },
  yasStep2Title:{ en:'Generate' },
  yasStep2Desc:{ en:'AI composes a concept — layout, materials, colours and indicative pricing in seconds.' },
  yasStep3Title:{ en:'Refine & quote' },
  yasStep3Desc:{ en:'Open it in the 3D planner or book a free visit for an exact, itemised quote.' },
  // ── AI YAS: hero/tools micro-copy ──
  yasCtaDescribeGenerate:{ en:'Describe & generate' },
  yasCtaUploadRestyle:{ en:'Upload & restyle' },
  yasCtaBuildMoodboard:{ en:'Build a moodboard' },
  yasCtaPlanToBudget:{ en:'Plan to budget' },
  yasCtaGetPicks:{ en:'Get picks' },
  yasCtaStartChatting:{ en:'Start chatting' },
  yasCtaOpenInPlanner:{ en:'Open in planner' },
  yasHeroInstantConcepts:{ en:'Instant concepts' },
  yasByClosets:{ en:'by The Closets' },
  // ── Planner wizard "Describe your space" step ──
  plDesigning:{ en:'Designing:' },
  plDescribeSpace:{ en:'Describe your space' },
  plDescribePh:{ en:'e.g. a walk-in closet for a master bedroom, warm oak, lots of shoes and hanging space, with soft lighting' },
  plChipWalkInOak:{ en:'Walk-in, oak, lots of shoes' },
  plChipSmallBedroom:{ en:'Small bedroom, sliding doors, white' },
  plChipLShapeKitchen:{ en:'Modern L-shape kitchen, white, quartz' },
  plAddPhoto:{ en:'Add a photo of your room (optional)' },
  plPhotoAdded:{ en:'Photo added — tap to change' },
  imgHintRoomPhoto:{ en:'Recommended: a clear, well-lit landscape photo · ≥1024px wide · JPG/PNG · under 8MB' },
  // ── Design Lab (viral growth hub) ──
  dlNav:{ en:'✨ Design Lab' },
  dlHeroEyebrow:{ en:'Design Lab' },
  dlHeroTitle:{ en:'Redesign your room in seconds with AI.' },
  dlHeroSub:{ en:'Redesign any room with AI, find your style, invite friends and earn rewards — all in one place.' },
  dlTabGlowup:{ en:'AI Room Glow-Up' },
  dlTabQuiz:{ en:'Style Quiz' },
  dlTabRefer:{ en:'Refer & Earn' },
  dlTabGallery:{ en:'Community Gallery' },
  // Tab 1 — Glow-Up
  dlGuUpload:{ en:'Upload a photo of your room' },
  dlGuChange:{ en:'Photo added — tap to change' },
  dlGuPickStyle:{ en:'Pick a style' },
  dlGuRun:{ en:'Redesign my room' },
  dlGuRunning:{ en:'Rendering your room…' },
  dlGuNeedPhoto:{ en:'Add a room photo first' },
  dlGuErr:{ en:'Couldn’t process that one — try another photo.' },
  dlGuBefore:{ en:'BEFORE' },
  dlGuAfter:{ en:'AFTER ✦' },
  dlGuCardTitle:{ en:'✨ The Closets — AI Room Glow-Up' },
  dlGuShareMsg:{ en:'Look what The Closets AI did to my room! ✨ Design yours free' },
  dlShareWhatsapp:{ en:'WhatsApp' },
  dlShareX:{ en:'X' },
  dlShareFacebook:{ en:'Facebook' },
  dlShareCopy:{ en:'Copy link' },
  dlLinkCopied:{ en:'Link copied!' },
  dlGuDownload:{ en:'Download' },
  dlGuPublish:{ en:'Publish to gallery' },
  dlGuPublishing:{ en:'Publishing…' },
  dlGuPublished:{ en:'Published to the community gallery! 🎉' },
  dlGuMakeReal:{ en:'Make it real →' },
  dlSoftGate:{ en:'Create a free account to publish and earn rewards.' },
  dlSignUp:{ en:'Create account' },
  // Tab 2 — Quiz
  dlQuizIntro:{ en:'Six quick taps to reveal your design personality.' },
  dlQuizStart:{ en:'Start the quiz' },
  dlQuizQ:{ en:'Question' },
  dlQuizOf:{ en:'of' },
  dlQuizBack:{ en:'← Back' },
  dlQuizResult:{ en:'Your style is' },
  dlQuizRetake:{ en:'Retake quiz' },
  dlQuizShare:{ en:'Share my result' },
  dlQuizShareMsg:{ en:'I took The Closets style quiz — my style is' },
  dlQuizExplore:{ en:'Explore matching designs' },
  dlQuizMatches:{ en:'Perfect matches for you' },
  // Tab 3 — Refer
  dlReferTitle:{ en:'Give BD 50, get BD 50' },
  dlReferSub:{ en:'Share your code. When a friend orders, you both get BD 50 off.' },
  dlReferYourCode:{ en:'Your referral code' },
  dlReferCopyCode:{ en:'Copy code' },
  dlReferCodeCopied:{ en:'Code copied!' },
  dlReferWhatsapp:{ en:'Invite on WhatsApp' },
  dlReferInviteMsg:{ en:'Design your dream kitchen with The Closets — we both get BD 50 off. Start here:' },
  dlReferProgress:{ en:'Invite 5 friends → free upgrade' },
  dlReferInvited:{ en:'invited' },
  dlReferLeaderboard:{ en:'Top referrers' },
  dlReferLbEmpty:{ en:'Be the first on the leaderboard — start inviting!' },
  dlReferSignIn:{ en:'Sign in to get your code' },
  dlReferInvites:{ en:'invites' },
  // Tab 4 — Gallery
  dlGalTitle:{ en:'Community Gallery' },
  dlGalSub:{ en:'Real rooms glowed up by our community. Vote for your favourites.' },
  dlGalDesignOfMonth:{ en:'Design of the Month' },
  dlGalVote:{ en:'Vote' },
  dlGalVoted:{ en:'Voted' },
  dlGalPublishCta:{ en:'Publish your design' },
  dlGalEmpty:{ en:'No designs yet — be the first to publish yours!' },
  dlGalBy:{ en:'by' },
  dlGalLoading:{ en:'Loading gallery…' },
  imgHintAvatar:{ en:'Recommended: a square photo ~400×400px · under 1MB' },
  plGenerateMyDesign:{ en:'Generate my design ✦' },
  plDesigningNow:{ en:'Designing…' },
  plBack:{ en:'‹ Back' },
  // Product display-map for the "Designing: {product}" planner label.
  plProdWardrobe:{ en:'Wardrobe' },
  plProdKitchen:{ en:'Kitchen' },
  plProdTvUnit:{ en:'TV Unit' },
  plProdDoors:{ en:'Doors' },
  plProdWalkInCloset:{ en:'Walk-in Closet' },
  plProdStorageOffice:{ en:'Storage / Office' },
  // Customer stories
  swStoriesEyebrow:{ en:'#TheClosets makeovers' },
  swStoriesTitle:{ en:'Real homes, real transformations.' },
  swViewGallery:{ en:'View the gallery →' },
  // Testimonials
  swTestiEyebrow:{ en:'Our clients' },
  swTestiTitle:{ en:'Loved across Bahrain.' },
  // How can we help
  swHelpEyebrow:{ en:'Next steps' },
  swHelpTitle:{ en:'How can we help?' },
  swHelpBrowse:{ en:'Browse our products' },
  swHelpBrowseDesc:{ en:'Explore every range across kitchens, wardrobes, doors and storage.' },
  swHelpStudio:{ en:'Use the Design Studio' },
  swHelpStudioDesc:{ en:'Plan your space in 3D and get a live price estimate.' },
  swHelpOffers:{ en:'View current offers' },
  swHelpOffersDesc:{ en:'Save on bespoke pieces with our latest promotions.' },
  swGo:{ en:'Go →' },
  // Newsletter
  swNlEyebrow:{ en:'Stay inspired' },
  swNlTitle:{ en:'Ideas, offers & new ranges — straight to your inbox.' },
  swNlDesc:{ en:'Join our mailing list for design inspiration and exclusive savings. Unsubscribe any time.' },
  swNlOnList:{ en:'You’re on the list.' },
  swNlThanks:{ en:'Thanks for subscribing to The Closets.' },
  swNlPlaceholder:{ en:'Your email address' },
  swNlAria:{ en:'Email address' },
  swNlSubscribe:{ en:'Subscribe' },
  swNlInvalid:{ en:'Please enter a valid email.' },
  swNlWelcome:{ en:'You’re subscribed — welcome to The Closets.' },
  // Cinematic CTA
  swCtaDesignOnline:{ en:'Design online' },
  swCtaTrust:{ en:'Own Bahrain workshop · 10-year warranty · Installed by our team' },
  // Footer trust badges
  swFootBadgeWorkshop:{ en:'Own Bahrain workshop' },
  swFootBadge2yr:{ en:'10-year warranty' },
  swFootBadgeFreeDesign:{ en:'Free design service' },
  swFootBadgeInstall:{ en:'Installed by our team' },
  swFootBadge15:{ en:'15 years of craft' },
  // Footer link labels (rendered via trLabel)
  swFlHowItWorks:{ en:'How it works' },
  swFlFaq:{ en:'FAQ' },
  swFlDelivery:{ en:'Delivery & install' },
  swFlWarranty:{ en:'Warranty service' },
  swFlMaintenance:{ en:'Maintenance' },
  swFlReviews:{ en:'Reviews' },
  swFlContactUs:{ en:'Contact us' },
  swFlBookAppt:{ en:'Book an appointment' },
  swFlBrochure:{ en:'Request a brochure' },
  swFlFinance:{ en:'Finance & payment' },
  swFlFindShowroom:{ en:'Find a showroom' },
  swFlRecommend:{ en:'Recommend a friend' },
  swFlAbout:{ en:'About The Closets' },
  swFlWhy:{ en:'Why The Closets' },
  swFlCareers:{ en:'Careers' },
  swFlOffers:{ en:'Offers' },
  swFlSitemap:{ en:'Sitemap' },
  // Chat widget
  swChatHello:{ en:'Hi! 👋 I can help with kitchens, wardrobes, pricing, showrooms and booking a free design visit. What are you planning?' },
  swChatError:{ en:'Sorry, I had trouble there. You can reach our team on WhatsApp or book a free visit.' },
  swChatOffline:{ en:'I’m offline for a moment — please try again or book a free visit.' },
  swChatChipKitchen:{ en:'Design a kitchen' },
  swChatChipPricing:{ en:'Wardrobe pricing' },
  swChatChipBook:{ en:'Book a free visit' },
  swChatChipShowrooms:{ en:'Where are your showrooms?' },
  swChatTitle:{ en:'Closets Assistant' },
  swChatSubtitle:{ en:'AI-powered · replies in seconds' },
  swChatTyping:{ en:'typing…' },
  swChatAria:{ en:'Chat with us' },
  swChatPlaceholder:{ en:'Ask anything…' },
  // Maintenance / Warranty pages
  swMaintTitle:{ en:'Maintenance request' },
  swMaintSub:{ en:'Need an adjustment or repair? Log a request and our team will arrange a visit.' },
  swMaintRef:{ en:'Order / reference no.' },
  swWarrTitle:{ en:'Warranty service' },
  swWarrSub:{ en:'Register a warranty claim — we stand behind every installation.' },
  swWarrRef:{ en:'Order / warranty no.' },
  // Portfolio page
  swPortGallerySoon:{ en:'Project gallery coming soon.' },
  swPortExploreByRoom:{ en:'Explore by room' },
  swPortCatKitchens:{ en:'Kitchens' },
  swPortCatWardrobes:{ en:'Wardrobes' },
  swPortCatWalkin:{ en:'Walk-In Closets' },
  swPortCatTv:{ en:'TV Units' },
  swPortCatDoors:{ en:'Doors' },
  swPortCatStorage:{ en:'Storage Solutions' },
  swPortCatOffice:{ en:'Office Furniture' },
  // Request page (maintenance / warranty form)
  swReqNamePhoneReq:{ en:'Name and phone are required' },
  swReqReceived:{ en:'Request received ✓' },
  swReqFailed:{ en:'Could not submit, please try again' },
  swReqThankYou:{ en:'Thank you' },
  swReqLoggedPrefix:{ en:'Your' },
  swReqLoggedSuffix:{ en:'request is logged.' },
  swReqLoggedSub:{ en:'Our team will contact you to arrange the next step.' },
  swReqFullName:{ en:'Full name *' },
  swReqFullNameAria:{ en:'Full name' },
  swReqPhone:{ en:'Phone *' },
  swReqPhoneAria:{ en:'Phone' },
  swReqEmail:{ en:'Email' },
  swReqOptional:{ en:'(optional)' },
  swReqDescribe:{ en:'Describe the issue / request' },
  swReqSubmitting:{ en:'Submitting…' },
  swReqSubmit:{ en:'Submit request' },
  swMaintKind:{ en:'maintenance' },
  swWarrKind:{ en:'warranty' },
  // FAQ empty
  swFaqSoon:{ en:'FAQs coming soon.' },
  // Services / Careers empty
  swServicesSoon:{ en:'Services coming soon.' },
  swCareersNoRoles:{ en:'No open roles right now — check back soon.' },
  // Careers
  swCarNamePhoneReq:{ en:'Name and phone are required' },
  swCarReceived:{ en:'Application received ✓' },
  swCarClose:{ en:'Close' },
  swCarApply:{ en:'Apply' },
  swCarRequirements:{ en:'Requirements:' },
  swCarThankYou:{ en:'Thank you — we’ll be in touch.' },
  swCarFullName:{ en:'Full name *' },
  swCarFullNameAria:{ en:'Full name' },
  swCarPhone:{ en:'Phone *' },
  swCarPhoneAria:{ en:'Phone' },
  swCarEmail:{ en:'Email' },
  swCarNote:{ en:'Note (optional)' },
  swCarSubmit:{ en:'Submit application' },
  // Services empty + booking modal
  swSvcRequestSent:{ en:'Request sent' },
  swSvcSentBody:{ en:"We've sent it to available providers. Track it in your account." },
  swSvcGoAccount:{ en:'Go to my account' },
  swSvcSchedule:{ en:'Schedule' },
  swSvcAsap:{ en:'ASAP' },
  swSvcSignInToBook:{ en:' Sign in to book.' },
  // Category page (category name is dynamic English; {x} = lowercased category)
  swCatSubPre:{ en:'Bespoke' },
  swCatSubPost:{ en:', designed, made and installed in Bahrain.' },
  swCatEmptyPre:{ en:'New' },
  swCatEmptyPost:{ en:'designs coming soon — book a visit to start yours.' },
  // Planner guide page (residual section copy)
  swGuideHowDesc:{ en:'The same easy flow whatever you are planning — from first layout to a price you can act on.' },
  swGuideRdEyebrow:{ en:'The Room Designer' },
  swGuideRdTitle:{ en:'See it before you build it' },
  swGuideRdDesc:{ en:'Our interactive visualiser turns your choices into a real room you can play with. Click any surface to change its finish, flip between a live photo and 3D, then render a photoreal image. It works for kitchens, wardrobes, TV units, doors and offices.' },
  swGuideRdBadge:{ en:'🎨 Room Designer' },
  swGuideRdAlt:{ en:'Interactive Room Designer with clickable surfaces' },
  swGuidePlanEyebrow:{ en:'Plan any product' },
  swGuidePlanTitle:{ en:'One planner for every room' },
  swGuidePlanDesc:{ en:'Each planner is tuned to its product, with the right layouts, finishes and accessories built in.' },
  swGuideStepsLabel:{ en:'steps' },
  swGuideStartPlannerPre:{ en:'Start' },
  swGuideStartPlannerPost:{ en:'planner →' },
  swGuideTipsEyebrow:{ en:'Tips for a great design' },
  swGuideTipsTitle:{ en:'Get it right, first time' },
  // PageBoundary error
  swErrTitle:{ en:'Something went wrong on this page' },
  swErrBody:{ en:'Please try again — your work elsewhere is safe.' },
  swErrTryAgain:{ en:'Try again' },
  // Contact page confirmations
  swContactWithin24:{ en:'We’ll be in touch within 24 hours.' },
  swContactConfirm24:{ en:'We’ll confirm within 24 hours.' },
  swContactSaveCard:{ en:'Save a specialist’s card' },
  swContactEmail:{ en:'Email' },
  swContactInterested:{ en:'Interested in…' },
  swContactInterestedAria:{ en:'Interested in' },
  swContactSending:{ en:'Sending…' },
  swContactOurTeam:{ en:'Our team' },
  swCheckoutSplit:{ en:'Or split into monthly installments' },
  // Checkout page (residual)
  swCoLoyaltyPts:{ en:'loyalty points' },
  swCoStep1:{ en:'01 / Contact' },
  swCoStep2:{ en:'02 / Payment' },
  swCoFullName:{ en:'Full name' },
  swCoEmail:{ en:'Email' },
  swCoPhone:{ en:'Phone' },
  swCoCity:{ en:'City' },
  swCoAddress:{ en:'Address' },
  swCoContinue:{ en:'Continue →' },
  swCoNameEmailReq:{ en:'Name and email required' },
  swCoOrderFailed:{ en:'Could not place your order. Please try again.' },
  swCoPlacing:{ en:'Placing order…' },
  swCoCard:{ en:'Card' },
  swCoCardNote:{ en:'Pay securely by card on the next step — Visa, Mastercard, Benefit or Apple Pay. We never see your card details.' },
  swCoBankTransfer:{ en:'Bank Transfer' },
  swCoCash:{ en:'Cash' },
  swCoCheque:{ en:'Cheque' },
  swCoMonths:{ en:'months' },
  swCoInstConfirmPre:{ en:'payments of BHD' },
  swCoInstConfirmPost:{ en:'— our team will confirm the plan with you.' },
  swCoNotes:{ en:'Notes…' },
  swCoNotesAria:{ en:'Notes' },
  swCoBack:{ en:'← Back' },
  swCoPlaceOrder:{ en:'Place Order' },

  /* ── sw2: landing-page + studio sweep ── */
  // KitchenStudio
  sw2KsEyebrow:{ en:'Kitchen Design Studio' },
  sw2KsTitle:{ en:'Design your kitchen, step by step.' },
  sw2KsSub:{ en:'Pick a layout, choose your cabinets, worktop and finishes — see it in 3D and watch your quote build live.' },
  sw2Ks3dView:{ en:'3D view' },
  sw2Ks2dPlan:{ en:'2D plan' },
  sw2KsIndicEst:{ en:'Indicative estimate' },
  sw2KsRun:{ en:'run' },
  sw2KsCabinets:{ en:'Cabinets' },
  sw2KsWorktop:{ en:'Worktop' },
  sw2KsHandles:{ en:'Handles' },
  sw2KsAppliances:{ en:'Appliances' },
  sw2KsStorageAddons:{ en:'Storage add-ons' },
  sw2KsStorage:{ en:'Storage' },
  sw2KsGuideNote:{ en:'A transparent guide price — your free design visit confirms exact dimensions, units and an itemised quote.' },
  sw2KsViewSpec:{ en:'View full spec & pricing detail' },
  sw2KsGetQuote:{ en:'Get my quote →' },
  sw2KsSignInQuote:{ en:'Sign in & get quote →' },
  sw2KsGetQuoteShort:{ en:'Get quote' },
  sw2KsSignInQuoteShort:{ en:'Sign in & quote' },
  sw2KsStep1:{ en:'1 · Choose your layout' },
  sw2KsWrapQ:{ en:'How does your kitchen wrap around the room?' },
  sw2KsStep2:{ en:'2 · Cabinet style' },
  sw2KsStep2Sub:{ en:'The door design sets the tone — and the cabinetry rate.' },
  sw2KsStep3:{ en:'3 · Worktop / countertop' },
  sw2KsStep3Sub:{ en:'Priced per linear metre of base run.' },
  sw2KsStep4:{ en:'4 · Cabinet finish & colour' },
  sw2KsStep4Sub:{ en:'Recolours your 3D preview instantly.' },
  sw2KsStep5:{ en:'5 · Appliance package' },
  sw2KsStep5Sub:{ en:'Tap to add — each appliance is priced per unit.' },
  sw2KsStep6:{ en:'6 · Hardware / handles' },
  sw2KsStep6Sub:{ en:'The finishing detail on every door and drawer.' },
  sw2KsStep7:{ en:'7 · Storage & interiors' },
  sw2KsStep7Sub:{ en:'Clever add-ons that make the kitchen work harder.' },
  sw2KsYourKitchen:{ en:'Your kitchen' },
  sw2KsReviewSub:{ en:'Review your design, then book a free visit for an exact quote.' },
  sw2KsLayout:{ en:'Layout' },
  sw2KsNoneSelected:{ en:'None selected' },
  sw2KsEstimate:{ en:'Estimate' },
  sw2KsFreeVisitNote:{ en:'Free design visit · no obligation · exact itemised quote on the day' },
  sw2KsBackKitchens:{ en:'‹ Back to Kitchens' },
  sw2KsSpecPricing:{ en:'Spec & pricing' },
  sw2KsYourName:{ en:'Your name' },
  sw2KsPhone:{ en:'Phone' },
  sw2KsPhonePh:{ en:'Phone (+973…)' },
  sw2KsEmail:{ en:'Email' },
  sw2KsEmailOpt:{ en:'Email (optional)' },
  sw2Cancel:{ en:'Cancel' },
  sw2Sending:{ en:'Sending…' },
  sw2KsSendQuoteReq:{ en:'Send quote request' },
  sw2KsSignInSend:{ en:'Sign in & send' },

  // Shared landing-page strings
  sw2BookFreeVisit:{ en:'Book a free visit' },
  sw2SeeProjects:{ en:'See real projects →' },
  sw2StartingPoints:{ en:'Starting points' },
  sw2DesignThis3d:{ en:'Design this in 3D →' },
  sw2DesignYours:{ en:'Design yours →' },
  sw2SurfacesLast:{ en:'Surfaces that last.' },
  sw2GoodToKnow:{ en:'Good to know' },
  sw2OneTeam:{ en:'One team, end to end' },
  sw2OneTeamDesc:{ en:'Design, manufacture, deliver and install — handled by our own team, never sub-let.' },
  sw2MadeToMeasure:{ en:'Made to measure' },
  sw2Transformations:{ en:'Transformations' },

  // WardrobesPage
  sw2WardTypesEyebrow:{ en:'Interior & storage' },
  sw2WardOrganised:{ en:'Organised to the centimetre.' },
  sw2WardTypesSub:{ en:'From a full walk-in dressing room to a flush reach-in run — four ways to bring order to your bedroom.' },
  sw2WardInteriorSub:{ en:'Mix hanging, drawers, shelving and accessories — every fitting priced transparently per unit.' },
  sw2WardFinishesEyebrow:{ en:'Finishes & materials' },
  sw2WardFinishesSub:{ en:'Transparent per-metre pricing on every finish, with full specs so you can compare like for like.' },
  sw2WardSpecEyebrow:{ en:'Specification & pricing' },
  sw2WardSpecTitle:{ en:'How it is built & priced.' },
  sw2WardPriceDrivers:{ en:'Price drivers' },
  sw2WardTypicalSizes:{ en:'Typical sizes' },
  sw2WardInteriorConstr:{ en:'Interior construction' },
  sw2WardHardwareBrands:{ en:'Hardware brands' },
  sw2WardBuild3d:{ en:'Build a live quote in 3D →' },
  sw2WardF1:{ en:'Made to measure' },
  sw2WardF1Desc:{ en:'Surveyed, scribed and fitted to your exact walls — no gaps, no filler panels.' },
  sw2WardF2:{ en:'Blum soft-close' },
  sw2WardF2Desc:{ en:'Blum soft-close hinges and full-extension runners on every door and drawer, backed for 10 years.' },
  sw2WardPopular:{ en:'Popular wardrobes.' },
  sw2WardCluttered:{ en:'From cluttered to curated.' },
  sw2WardTransDesc:{ en:'We have transformed bedrooms and dressing rooms across Bahrain — from compact apartments to villa master suites. Start with a free design visit and we will show you what is possible in your space.' },
  sw2After:{ en:'After' },
  sw2Detail:{ en:'Detail' },
  sw2WardFaqTitle:{ en:'Wardrobe questions, answered.' },
  sw2WardDreamCta:{ en:'Your dream wardrobe starts here.' },
  sw2WardDreamSub:{ en:'Design it in 3D with a live quote, or book a free home visit — no obligation.' },
  sw2OpenDesignStudioArrow:{ en:'Open Design Studio →' },
  sw2WardFaq:{ en:[
    ['How much does a fitted wardrobe cost?', 'Reach-in and kids wardrobes start from around BD 540, fitted hinged wardrobes from BD 720, sliding wardrobes from BD 1,000, and a full walk-in dressing room from BD 5,200. Price is driven transparently by the metres of run, your finish and the interior fittings you choose — build a live estimate in the Design Studio.'],
    ['How long does it take?', 'Most wardrobes are designed, manufactured and installed within 4–7 weeks of sign-off. Real-wood veneer and hand-sprayed lacquer finishes sit at the longer end.'],
    ['Do you measure and fit everything?', 'Yes — survey, design, manufacture, delivery and installation are all handled by our own team across Bahrain. Every wardrobe is scribed and fitted to your exact walls.'],
    ['Can you fit around sloped ceilings or awkward walls?', 'Absolutely. Our fitted and walk-in wardrobes are made to measure — we build into eaves, alcoves and sloped ceilings so every centimetre is used.'],
    ['What hardware do you use?', 'Blum soft-close hinges and full-extension drawer runners as standard, Hettich lift systems, and anodised aluminium rails — all backed by our 10-year cabinetry warranty.'],
    ['What warranty do I get?', '10 years on cabinetry and soft-close hardware, plus 5–10 years on finishes depending on the material you choose.'],
  ] },

  // KitchenPage
  sw2KpFindLook:{ en:'Find your look.' },
  sw2KpStylesEyebrow:{ en:'Kitchen styles' },
  sw2KpStylesSub:{ en:'From classic shaker to handleless — six door styles, dozens of finishes.' },
  sw2KpDesignStyle:{ en:'Design this style →' },
  sw2KpEveryLayout:{ en:'Every layout' },
  sw2KpFitRoom:{ en:'Made to fit your room.' },
  sw2KpWorktopsEyebrow:{ en:'Worktops & materials' },
  sw2KpWorktopsSub:{ en:'Transparent per-metre pricing on every worktop, with full specs so you can compare like for like.' },
  sw2KpF1:{ en:'Made in Bahrain' },
  sw2KpF1Desc:{ en:'Manufactured in our own workshop — full control over quality and lead time.' },
  sw2KpF2:{ en:'Soft-close as standard' },
  sw2KpF2Desc:{ en:'Blum soft-close hinges and runners on every door and drawer, backed for 10 years.' },
  sw2KpF3Desc:{ en:'Design, build, deliver, fit and template — handled by us, never sub-let.' },
  sw2KpPopular:{ en:'Popular kitchens.' },
  sw2KpTiredTimeless:{ en:'From tired to timeless.' },
  sw2KpTransDesc:{ en:'We have transformed kitchens across Bahrain — from compact apartments to villa open-plan spaces. Start with a free design visit and we will show you what is possible in your room.' },
  sw2KpFaqTitle:{ en:'Kitchen questions, answered.' },
  sw2KpDreamCta:{ en:'Your dream kitchen starts here.' },
  sw2KpDreamSub:{ en:'Design it in 3D with a live quote, or book a free home visit — no obligation.' },
  sw2KpFaq:{ en:[
    ['How much does a bespoke kitchen cost?', 'Our kitchens start from around BD 2,200 for a compact modular L-shape and BD 4,200+ for a fully bespoke design. Price is driven transparently by the metres of cabinetry, your door style, worktop choice and appliances — build a live estimate in the Design Studio.'],
    ['How long does it take?', 'Most kitchens are designed, manufactured and installed within 6–9 weeks of sign-off, depending on door style and worktop. In-frame and veneer doors sit at the longer end.'],
    ['Do you handle the full project?', 'Yes — design, manufacture, delivery, fitting, worktop templating and appliance installation are all handled by our own team across Bahrain.'],
    ['Can I keep my existing appliances?', 'Absolutely. Choose only the appliance housings you need in the Design Studio and we will build around your existing units.'],
    ['What warranty do I get?', '10 years on cabinetry and soft-close hardware, plus 2–15 years on worktops depending on the material you choose.'],
  ] },

  // OfficePage
  sw2OfLayoutsEyebrow:{ en:'Office layouts' },
  sw2OfFindSetup:{ en:'Find your setup.' },
  sw2OfLayoutsSub:{ en:'Six ways to bring a proper, productive workspace into your home — from minimal to a full storage wall.' },
  sw2OfDeskEyebrow:{ en:'Desk & storage' },
  sw2OfDeskSub:{ en:'Mix open shelving, closed cabinets, drawers, tall units and file storage — every element priced transparently per unit.' },
  sw2OfPer:{ en:'per' },
  sw2OfWorktopsEyebrow:{ en:'Worktops & materials' },
  sw2OfWorkHard:{ en:'Surfaces that work hard.' },
  sw2OfWorktopsSub:{ en:'From durable laminate to engineered quartz — pick the worktop and finish that suit your work and your room.' },
  sw2OfF2:{ en:'Cable management built in' },
  sw2OfF2Desc:{ en:'Trays, grommets and a dedicated power route keep the desk tidy and the wiring hidden.' },
  sw2OfF1Desc:{ en:'Surveyed, scribed and fitted to your exact walls and alcoves — no gaps, no filler panels.' },
  sw2OfPopular:{ en:'Popular home offices.' },
  sw2OfFaqTitle:{ en:'Home office questions, answered.' },
  sw2OfDreamCta:{ en:'Your dream home office starts here.' },
  sw2OfDreamSub:{ en:'Plan it with a live quote, or book a free home visit — no obligation.' },
  sw2OfOpenPlanner:{ en:'Open the office planner →' },
  sw2OfFaq:{ en:[
    ['How much does a fitted home office cost?', 'A minimal floating desk setup starts from around BD 540, a corner or built-in office from BD 1,100, and a full floor-to-ceiling storage wall with integrated desk from BD 2,400+. Price is driven transparently by the metres of cabinetry, your worktop and storage — build a live estimate in the office planner.'],
    ['How long does it take?', 'Most home offices are designed, manufactured and installed within 4–7 weeks of sign-off. Real-wood veneer and quartz worktops sit at the longer end.'],
    ['Can you build into an alcove or awkward corner?', 'Absolutely. Every office is made to measure — we scribe desks and storage into alcoves, corners and sloped ceilings so every centimetre works.'],
    ['Do you handle cable management?', 'Yes — we build in cable trays, grommets and a dedicated power route behind the desk so the setup stays tidy and the wiring stays hidden.'],
    ['What hardware do you use?', 'Blum soft-close hinges and full-extension drawer runners as standard, plus warm 3000K LED for shelves and under-cabinet task light — all backed by our 10-year cabinetry warranty.'],
    ['What warranty do I get?', '10 years on cabinetry and soft-close hardware, plus 5–10 years on finishes depending on the material you choose.'],
  ] },

  // TVUnitPage
  sw2TvPopular:{ en:'Popular media walls.' },
  sw2TvF2:{ en:'Cable & AV management built in' },
  sw2TvF2Desc:{ en:'Trays, conduits and ventilated bays for your console, receiver and router keep the wall tidy and the wiring hidden.' },
  sw2TvF1Desc:{ en:'Surveyed, scribed and fitted to your exact wall — around fireplaces, columns and AC units, with no gaps or filler panels.' },

  // DoorsPage
  sw2DrPopular:{ en:'Popular doors.' },
  sw2DrF1Desc:{ en:'Surveyed and built to your exact opening — the leaf, frame and hardware all scribed so the door sits flush and swings true.' },
  sw2DrF2:{ en:'Solid cores & quiet hardware' },
  sw2DrF2Desc:{ en:'Hollow, semi-solid, solid or fire-rated cores with soft-close hinges and European locks for a reassuring, silent close.' },

  // WrenPlannerPage
  sw2WrEyebrow:{ en:'Kitchen design · online planner' },
  sw2WrTitle:{ en:'Plan your dream kitchen.' },
  sw2WrSub:{ en:'Five quick steps to a layout, a look and a free design appointment.' },
  sw2WrIndicStd:{ en:'Indicative estimate · Standard' },
  sw2WrWorktop:{ en:'worktop' },
  sw2WrGuideNote:{ en:'A guide price — your free design appointment confirms an exact, itemised quote.' },
  sw2WrStep1:{ en:'1 · Choose your shape' },
  sw2WrWrapQ:{ en:'How does your kitchen wrap around the room?' },
  sw2WrStep2:{ en:'2 · Measure your runs' },
  sw2WrStep2Sub:{ en:'Approximate wall lengths — we confirm exact sizes on the home visit.' },
  sw2WrRunA:{ en:'Run A' },
  sw2WrRunB:{ en:'Run B' },
  sw2WrRunC:{ en:'Run C' },
  sw2WrIsland:{ en:'Island' },
  sw2WrStep3:{ en:'3 · Pick a door style' },
  sw2WrStep3Sub:{ en:'The look that sets the tone for the whole room.' },
  sw2WrStep4:{ en:'4 · Worktop & handles' },
  sw2WrStep4Sub:{ en:'The finishing touches that make it yours.' },
  sw2WrWorktopHead:{ en:'WORKTOP' },
  sw2WrHandlesHead:{ en:'HANDLES' },
  sw2WrStep5:{ en:'5 · Your kitchen & appointment' },
  sw2WrStep5Sub:{ en:'Book a free design visit — no obligation, exact quote on the day.' },
  sw2WrShape:{ en:'Shape' },
  sw2WrStyle:{ en:'Style' },
  sw2WrWorktopLbl:{ en:'Worktop' },
  sw2WrHandlesLbl:{ en:'Handles' },
  sw2WrEstimate:{ en:'Estimate' },
  sw2WrBookBtn:{ en:'Book my free design appointment' },

  // KitchenStudioPage (room planner)
  sw2StTitle:{ en:'Design your kitchen, unit by unit.' },
  sw2StSub:{ en:'Set your room, drop in cabinets along each wall, choose your look — watch the plan and price update live.' },
  sw2StIndic:{ en:'Indicative estimate' },
  sw2StUnits:{ en:'units' },
  sw2StGuideNote:{ en:'worktop · {h} handles. A guide price — your free design visit confirms an exact quote.' },
  sw2StBookBtn:{ en:'Book a free design appointment' },
  sw2StTabUnits:{ en:'Units' },
  sw2StTabRoom:{ en:'Room' },
  sw2StTabStyle:{ en:'Style' },
  sw2StTabFinish:{ en:'Finishes' },
  sw2StChooseWall:{ en:'1 · Choose a wall, then add units to it.' },
  sw2StTop:{ en:'Top' },
  sw2StBottom:{ en:'Bottom' },
  sw2StLeft:{ en:'Left' },
  sw2StRight:{ en:'Right' },
  sw2StUnitsLower:{ en:'units' },
  sw2StClearWall:{ en:'Clear wall' },
  sw2StNoUnits:{ en:'No units yet — tap one above to add it here.' },
  sw2StRemove:{ en:'Remove' },
  sw2StRoomSize:{ en:'Set the approximate size of your room.' },
  sw2StWidth:{ en:'Width' },
  sw2StLength:{ en:'Length' },
  sw2StWorktopHead:{ en:'WORKTOP' },
  sw2StHandlesHead:{ en:'HANDLES' },
  sw2StBookTitle:{ en:'Book your free design visit' },
  sw2StWorktopWord:{ en:'worktop' },
  sw2StRequestAppt:{ en:'Request appointment' },
  sw2StOnWall:{ en:'On {wall} wall' },

  // DesignBuilderPage
  sw2DbStepReq:{ en:'Requirements' },
  sw2DbStepSurvey:{ en:'Site Survey' },
  sw2DbStepBuild:{ en:'Design Builder' },
  sw2DbStepStyle:{ en:'Style' },
  sw2DbStepMaterials:{ en:'Materials' },
  sw2DbStepMood:{ en:'Moodboard' },
  sw2DbStepCost:{ en:'Cost' },
  sw2DbStepAi:{ en:'AI Assistant' },
  sw2DbEyebrow:{ en:'Design Builder · guided end-to-end' },
  sw2DbTitle:{ en:'Design your space, step by step.' },
  sw2DbSub:{ en:'Tell us what you need, lay out the parts, choose your look — and watch the price update live.' },
  sw2DbCatErr:{ en:'Our design catalogue is taking a moment to load. You can still build a layout — pricing and styles will appear shortly.' },
  sw2DbSelected:{ en:'Selected' },
  sw2DbOverlapping:{ en:'· overlapping' },
  sw2DbRemove:{ en:'Remove' },
  sw2DbLiveEst:{ en:'Live estimate' },
  sw2DbUpdating:{ en:'updating…' },
  sw2DbCurrentPrice:{ en:'Current price' },
  sw2DbVariation:{ en:'Variation vs previous' },
  sw2DbMargin:{ en:'Margin' },
  sw2DbEstDelivery:{ en:'Estimated delivery' },
  sw2DbMaterials:{ en:'Materials' },
  sw2DbLabour:{ en:'Labour' },
  sw2DbDelivery:{ en:'Delivery' },
  sw2DbInstall:{ en:'Install' },
  sw2DbIndicConf:{ en:'Indicative — confirmed at your free design visit.' },
  sw2DbWhatDesign:{ en:'What are you designing?' },
  sw2DbPickType:{ en:'Pick a project type, then fill in your needs.' },
  sw2DbHangStorage:{ en:'Hanging & storage' },
  sw2DbLongHang:{ en:'Long hanging sections' },
  sw2DbShortHang:{ en:'Short hanging sections' },
  sw2DbDrawerBanks:{ en:'Drawer banks' },
  sw2DbShoeStorage:{ en:'Shoe storage units' },
  sw2DbAccessories:{ en:'Accessories' },
  sw2DbSafeBox:{ en:'Safe box' },
  sw2DbJewelry:{ en:'Jewelry drawer' },
  sw2DbIroning:{ en:'Pull-out ironing board' },
  sw2DbLaundry:{ en:'Laundry basket' },
  sw2DbTvSize:{ en:'TV size' },
  sw2DbConsole:{ en:'Floating console' },
  sw2DbDisplayShelves:{ en:'Display shelves' },
  sw2DbGaming:{ en:'Gaming storage' },
  sw2DbSound:{ en:'Sound system / soundbar' },
  sw2DbAppliances:{ en:'Appliances' },
  sw2DbOven:{ en:'Built-in oven' },
  sw2DbHob:{ en:'Hob & extractor' },
  sw2DbDishwasher:{ en:'Dishwasher' },
  sw2DbFridge:{ en:'Integrated fridge' },
  sw2DbMicrowave:{ en:'Microwave' },
  sw2DbCooking:{ en:'Cooking habits' },
  sw2DbCookLight:{ en:'Light' },
  sw2DbCookEveryday:{ en:'Everyday' },
  sw2DbCookAvid:{ en:'Avid cook' },
  sw2DbCookEntertainer:{ en:'Entertainer' },
  sw2DbStoragePantry:{ en:'Storage & pantry' },
  sw2DbPantry:{ en:'Tall pantry unit' },
  sw2DbExtraStorage:{ en:'Extra deep storage' },
  sw2DbIslandStorage:{ en:'Island with storage' },
  sw2DbMainFeatures:{ en:'Main features' },
  sw2DbHanging:{ en:'Hanging sections' },
  sw2DbShelving:{ en:'Open shelving units' },
  sw2DbIslandDresser:{ en:'Central island / dresser' },
  sw2DbMirror:{ en:'Full-length mirror' },
  sw2DbLighting:{ en:'Sensor LED lighting' },
  sw2DbRoomType:{ en:'Room type' },
  sw2DbFamilyMembers:{ en:'Family members' },
  sw2DbLifestyle:{ en:'Lifestyle' },
  sw2DbLifeMinimal:{ en:'Minimal' },
  sw2DbLifeFamily:{ en:'Family' },
  sw2DbLifeCollector:{ en:'Collector' },
  sw2DbLifeBusy:{ en:'Busy professional' },
  sw2DbLifeLuxury:{ en:'Luxury' },
  sw2DbBudgetRange:{ en:'Budget range' },
  sw2DbBudgetTo:{ en:'to' },
  sw2DbTimeline:{ en:'Timeline' },
  sw2DbTl1:{ en:'2-3 weeks' },
  sw2DbTl2:{ en:'4-6 weeks' },
  sw2DbTl3:{ en:'2-3 months' },
  sw2DbTlFlexible:{ en:'Flexible' },
  sw2DbSpecialReq:{ en:'Special requirements & style/colour notes' },
  sw2DbSpecialAria:{ en:'Special requests' },
  sw2DbSpecialPh:{ en:'e.g. warm oak tones, soft-close everywhere, allergy-safe finishes…' },
  sw2DbSiteSurvey:{ en:'Site survey' },
  sw2DbSurveySub:{ en:'Set your room size and flag anything we should design around.' },
  sw2DbRoomWidth:{ en:'Room width' },
  sw2DbRoomLength:{ en:'Room length' },
  sw2DbCeilingHeight:{ en:'Ceiling height' },
  sw2DbExistingFeatures:{ en:'Existing features in the room' },
  sw2DbFeatWindows:{ en:'Windows' },
  sw2DbFeatDoors:{ en:'Doors' },
  sw2DbFeatOutlets:{ en:'Electrical outlets' },
  sw2DbFeatAc:{ en:'AC unit' },
  sw2DbFeatColumns:{ en:'Columns' },
  sw2DbFeatBeams:{ en:'Beams' },
  sw2DbFeatPlumbing:{ en:'Plumbing' },
  sw2DbFeatLighting:{ en:'Existing lighting' },
  sw2DbRoomPhotos:{ en:'Room photos' },
  sw2DbDesignBuilder:{ en:'Design builder' },
  sw2DbBuilderSub:{ en:'Tap a part to drop it on the canvas, then drag it to reposition. Parts snap to the grid; overlaps are highlighted in red.' },
  sw2DbPlaceWall:{ en:'Place on wall' },
  sw2DbWallBack:{ en:'Back' },
  sw2DbWallLeft:{ en:'Left' },
  sw2DbWallRight:{ en:'Right' },
  sw2DbWallFront:{ en:'Front' },
  sw2DbAddPart:{ en:'Add a part' },
  sw2DbPlacedParts:{ en:'Placed parts' },
  sw2DbClearAll:{ en:'Clear all' },
  sw2DbNoParts:{ en:'No parts yet — tap one above to add it to the canvas.' },
  sw2DbChooseStyle:{ en:'Choose a style' },
  sw2DbStyleSub:{ en:'Selecting a style shows its suggested palette and can auto-apply matching materials.' },
  sw2DbStylesLoading:{ en:'Styles are loading…' },
  sw2DbStyleSelected:{ en:'· selected' },
  sw2DbMaterialsLbl:{ en:'Materials' },
  sw2DbHandlesLbl:{ en:'Handles' },
  sw2DbLightingLbl:{ en:'Lighting' },
  sw2DbAccessoriesLbl:{ en:'Accessories' },
  sw2DbProfilesLbl:{ en:'Profiles' },
  sw2DbMaterialsShowroom:{ en:'Materials showroom' },
  sw2DbMaterialsShowroomSub:{ en:'Pick a board and finish, and compare the spec of every option.' },
  sw2DbBoards:{ en:'Boards' },
  sw2DbFinishes:{ en:'Finishes' },
  sw2DbLoading:{ en:'Loading…' },
  sw2DbHardwareAccessories:{ en:'Hardware & accessories' },
  sw2DbThMaterial:{ en:'Material' },
  sw2DbThCost:{ en:'Cost' },
  sw2DbThWarranty:{ en:'Warranty' },
  sw2DbThDurability:{ en:'Durability' },
  sw2DbThScratch:{ en:'Scratch' },
  sw2DbThWater:{ en:'Water' },
  sw2DbThLead:{ en:'Lead' },
  sw2DbThSupplier:{ en:'Supplier' },
  sw2DbThMaint:{ en:'Maint.' },
  sw2DbMoodboard:{ en:'Moodboard' },
  sw2DbMoodSub:{ en:'Add inspiration links, colour swatches and notes for our designers.' },
  sw2DbInspoUrl:{ en:'Inspiration image URL' },
  sw2DbAdd:{ en:'Add' },
  sw2DbColourPalette:{ en:'Colour palette' },
  sw2DbAddSwatch:{ en:'Add swatch' },
  sw2DbSampleNote:{ en:'Sample note' },
  sw2DbMoodNotePh:{ en:'e.g. matte brass handles like the showroom' },
  sw2DbInspoNoteAria:{ en:'Inspiration note' },
  sw2DbNothingPinned:{ en:'Nothing pinned yet.' },
  sw2DbRealtimeCost:{ en:'Real-time cost' },
  sw2DbCostSub:{ en:'Your live estimate, broken down. It updates automatically as you change the design.' },
  sw2DbAddPartsHint:{ en:'Add parts or pick a board in the previous steps to generate a price.' },
  sw2DbMaterialCost:{ en:'Material cost' },
  sw2DbInstallation:{ en:'Installation' },
  sw2DbSubtotal:{ en:'Subtotal' },
  sw2DbTotalMargin:{ en:'Total ({m}% margin)' },
  sw2DbAiAssistant:{ en:'AI assistant' },
  sw2DbAiSub:{ en:'Smart suggestions based on your current design. Apply any with one tap.' },
  sw2DbAiNone:{ en:'Looking good — no changes recommended right now.' },
  sw2DbApply:{ en:'Apply' },
  sw2DbYourDetails:{ en:'Your details (so we can reach you)' },
  sw2DbBack:{ en:'← Back' },
  sw2DbNext:{ en:'Next →' },
  sw2DbSaving:{ en:'Saving…' },
  sw2DbUpdateDraft:{ en:'Update draft' },
  sw2DbSaveDraft:{ en:'Save draft' },
  sw2DbSubmitting:{ en:'Submitting…' },
  sw2DbSubmitApproval:{ en:'Submit for approval' },
  sw2DbStyleApplied:{ en:'Style applied' },
  sw2DbStyleAppliedMat:{ en:'Style applied — suggested materials selected' },
  sw2DbAiSwitchFin:{ en:'Switch {a} → {b} to save ~{s}' },
  sw2DbAiFinSwitched:{ en:'Finish switched to {n}' },
  sw2DbAiAddLed:{ en:'Add sensor LED lighting (+{c}) to lift perceived value' },
  sw2DbAiLedAdded:{ en:'LED lighting added' },
  sw2DbAiAddDrawer:{ en:'Add a drawer bank for folded clothing & accessories' },
  sw2DbAiDrawerAdded:{ en:'Drawer added' },
  sw2DbAiUseBoard:{ en:'Use {n} board to save ~{s} (lower durability)' },
  sw2DbAiBoardSwitched:{ en:'Board switched to {n}' },
  sw2DbAiStart:{ en:'Open the Design Builder and add at least one cabinet to begin pricing' },
  sw3ArSeeIn3D:{ en:'See it in 3D & your room' },
  sw3ArHint:{ en:'Drag to rotate · on a phone tap “View in your room” for AR. Representative model — your exact unit is finalised at your free design visit.' },
  sw3CartEmpty:{ en:'Your cart is empty' },
  sw3FreeDelivery:{ en:'Free delivery across Bahrain' },
  sw3DragRotateZoom:{ en:'Drag to rotate · scroll to zoom' },
  sw3PlannerLoadErr:{ en:"Couldn't load the planner" },
  sw3PlannerLoadErrSub:{ en:"We're having trouble reaching our design service. Please try again in a moment." },
  sw3PlannerTailored:{ en:"We'll design a tailored starting point in seconds." },
  sw3PlannerScratch:{ en:'or start from scratch →' },
  sw3PlannerIndic30:{ en:'Indicative — valid 30 days. Your free design visit confirms an exact, itemised quote.' },
  sw3PlannerRendering:{ en:'Creating your photorealistic render… ~15–25 seconds.' },
  sw3PlannerCreateAcct:{ en:'Create a free account to track your quote, save this design and follow your order.' },
  sw3PlannerCustomSize:{ en:'Use Custom size for an exact measurement.' },
  sw3PlannerLShape:{ en:'L-shape — set each run, then the height & depth.' },
  sw3PlannerSnap:{ en:'Exact sizes snap to the nearest buildable measurement.' },
  sw3PlannerIndic:{ en:'Indicative — your free design visit confirms an exact, itemised quote.' },
  sw3PlannerSendQuote:{ en:'Where shall we send your quote?' },
  sw3HubCardLive:{ en:'Your personal digital card is live. Share it to let people save your contact, view your membership and book with us.' },
  sw3HubNoCard:{ en:'No digital card yet' },
  sw3HubNoCardSub:{ en:'Ask our team to activate your free digital membership card — it carries your tier, points and rewards.' },
  sw3HubNoBookings:{ en:'No service bookings yet.' },
  sw3AiOffersBadge:{ en:'New · AI Interior Designer' },
  sw3AiOffersTitle:{ en:'Describe your room or upload a photo — get a tailored design in seconds.' },
  sw3AiOffersSub:{ en:'Layout, materials, colours, storage ideas and indicative pricing, composed by AI.' },
  sw3AiOffersTry:{ en:'Try the AI Designer ✦' },
  sw3DigCardTitle:{ en:'Your digital membership card' },
  sw3DigCardSub:{ en:'Set it up in your account to share your details instantly.' },
  sw3BookCallConfirm:{ en:'Our design team will call you to confirm the time. No obligation, completely free.' },
  sw3YasRefine3D:{ en:'Refine in 3D planner' },
  sw3YasWarming:{ en:"Our live AI is warming up — here's a starter concept." },
  sw3YasForTailored:{ en:'for a tailored design.' },
  sw3YasPickVibes:{ en:'Pick up to 3 styles' },
  sw3YasUse3D:{ en:'Use in 3D planner' },
  sw3YasRecWarming:{ en:'Our recommender is warming up.' },
  sw3YasBrowseAll:{ en:'Browse the full collection' },
  sw3YasPoweredBy:{ en:'Powered by The Closets AI · Bahrain' },
  sw3YasNoSignup:{ en:'No sign-up to try' },
  sw3YasVisitConfirm:{ en:'Free design visit to confirm' },
  sw3AiRedesigning:{ en:'Redesigning your room… ~15–25 seconds.' },
  sw3AiSliderCompare:{ en:'Drag the slider to compare. AI impression — finishes confirmed at your visit.' },
  sw3AiIndicOnly:{ en:'Indicative only — your free design visit confirms an exact, itemised quote.' },
  optBestStraight:{ en:'Compact kitchens & open-plan walls' },
  optBestGalley:{ en:'Narrow rooms, serious cooks' },
  optBestLShape:{ en:'The all-rounder — most popular' },
  optBestUShape:{ en:'Maximum storage & worktop' },
  optBestIsland:{ en:'Sociable, open-plan entertaining' },
  optLead56:{ en:'5–6 weeks' },
  optLead67:{ en:'6–7 weeks' },
  optLead78:{ en:'7–8 weeks' },
  optLead79:{ en:'7–9 weeks' },
  // [SEO/i18n 2026-11-12] leaks found in the audit
  closeCart:{ en:'Close cart' },
  meetTeam:{ en:'Meet our team' },
  dockServices:{ en:'Services' },
  browseCollection:{ en:'Browse Collection' },
};
// Arabic is loaded on demand (src/i18n/arabic.js): merge the dictionary into the English-keyed tables in place, so every existing
// lookup (I18N[k][lang] || I18N[k].en, cms()) keeps working unchanged. Resolves immediately once loaded.
let AR_LOADED = false;
function ensureArabic() {
  if (AR_LOADED) return Promise.resolve();
  return fetchArabicDict().then((d) => {
    Object.keys(d.i18n || {}).forEach((k) => { if (I18N[k]) I18N[k].ar = d.i18n[k]; });
    Object.assign(CMS_AR, d.cms || {});
    AR_LOADED = true;
  });
}
function useI18n() {
  const ctx = useContext(AppCtx);
  const lang = ctx?.lang || 'en';
  const t = (key) => (I18N[key] ? (I18N[key][lang] || I18N[key].en) : key);
  return { lang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' };
}

function useMobile() {
  // While hydrating prerendered HTML the first pass must match the (desktop-width) crawl; the real width is applied right after mount.
  const [mobile, setMobile] = useState(() => (hydration.active ? false : window.innerWidth < 768));
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

let _toast = null;
const toast = (msg, type = 'info') => {
  if (!_toast) return;
  const id = Date.now();
  _toast(p => [...p.slice(-2), { id, msg, type }]);
  setTimeout(() => _toast(p => p.filter(t => t.id !== id)), 3200);
};
function Toasts() {
  const [list, setList] = useState([]);
  const mobile = useMobile();
  _toast = setList;
  const c = { success: '#1a7a40', error: '#d93025', info: '#1d1d1f' };
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: mobile ? 90 : 28, left: mobile ? 16 : 'auto', right: mobile ? 16 : 28, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map(t => (
        <div key={t.id} role={t.type === 'error' ? 'alert' : undefined} style={{ background: c[t.type], color: '#fff', padding: '13px 18px', borderRadius: 14, fontSize: 14, boxShadow: '0 4px 24px rgba(0,0,0,.18)', animation: 'toastIn .25s ease' }}>{t.msg}</div>
      ))}
    </div>
  );
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-tap-highlight-color: transparent; }
  /* ── RTL logical fixes (reach what inline styles don't) ── */
  [dir="rtl"] input, [dir="rtl"] textarea, [dir="rtl"] select { text-align: right; }
  [dir="rtl"] ul, [dir="rtl"] ol { padding-right: 20px; padding-left: 0; }
  /* Opt-in mirror for inline directional arrows (→ ← ‹ › » «) inside RTL */
  [dir="rtl"] .diri { display: inline-block; transform: scaleX(-1); }
  /* Flip hard-coded inline text-align under RTL (reaches inline styles that CSS otherwise can't) */
  [dir="rtl"] [style*="text-align: left"]  { text-align: right !important; }
  [dir="rtl"] [style*="text-align: right"] { text-align: left  !important; }
  /* ── Animated background blobs ── */
  .hero-bg {
    position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
  }
  .blob {
    position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.18;
  }
  .blob-1 {
    width: 700px; height: 700px; background: var(--clay);
    top: -200px; left: -150px;
    animation: blob1 18s ease-in-out infinite;
  }
  .blob-2 {
    width: 600px; height: 600px; background: var(--peach);
    top: -100px; right: -200px;
    animation: blob2 22s ease-in-out infinite;
  }
  .blob-3 {
    width: 500px; height: 500px; background: var(--brass);
    bottom: -150px; left: 30%;
    animation: blob3 16s ease-in-out infinite;
  }
  .blob-4 {
    width: 400px; height: 400px; background: var(--clay);
    bottom: 0; right: 10%;
    animation: blob1 20s ease-in-out infinite reverse;
    opacity: 0.1;
  }
  @keyframes blob1 {
    0%,100% { transform: translate(0,0) scale(1); }
    25%     { transform: translate(40px,-60px) scale(1.08); }
    50%     { transform: translate(-30px,30px) scale(0.95); }
    75%     { transform: translate(20px,50px) scale(1.05); }
  }
  @keyframes blob2 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(-50px,40px) scale(1.12); }
    66%     { transform: translate(30px,-40px) scale(0.9); }
  }
  @keyframes blob3 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%     { transform: translate(60px,-30px) scale(1.1); }
    70%     { transform: translate(-40px,20px) scale(0.92); }
  }
  /* Grid overlay */
  .hero-grid {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent);
  }
  /* Shimmer line */
  .hero-shimmer {
    position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(168,75,41,0.04), transparent);
    animation: shimmer 6s ease-in-out infinite;
    pointer-events: none; z-index: 0;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 200%; }
  }
  /* Banner strip */
  .banner-strip {
    background: linear-gradient(90deg, var(--shop-ink, #1d1d1f), #2d2d2f, #1d1d1f);
    color: #fff; font-size: 13px; font-weight: 500;
    display: flex; align-items: center; justify-content: center;
    gap: 20px; padding: 10px 20px;
    overflow: hidden; position: relative;
  }
  .banner-strip-inner {
    display: flex; align-items: center; gap: 12px;
    animation: bannerFade 0.4s ease;
  }
  @keyframes bannerFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .hero-content { position: relative; z-index: 1; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #d2d2d7; border-radius: 2px; }
  input, select, textarea, button { font-family: inherit; }
  @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  /* ── Editorial-luxury design tokens (Home redesign) ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
  }
  @media (min-width:768px){
  }
  /* ── Cinematic scroll animations (Home) ── */
  @media (prefers-reduced-motion: reduce){ .kenburns{ animation:none !important; } .marquee{ animation:none !important; } }
  .scroll-cue { width:26px; height:42px; border:1.5px solid rgba(255,255,255,.65); border-radius:16px; position:relative; }
  .scroll-cue::after { content:''; position:absolute; left:50%; top:7px; width:3px; height:8px; background:#fff; border-radius:2px; transform:translateX(-50%); animation:cue 1.9s ease-in-out infinite; }
  @keyframes cue { 0%,100%{ opacity:0; transform:translate(-50%,0);} 40%{ opacity:1;} 80%{ opacity:0; transform:translate(-50%,13px);} }
  .marquee-wrap { overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
  .marquee { display:flex; gap:56px; width:max-content; animation:marquee 34s linear infinite; align-items:center; }
  .marquee-wrap:hover .marquee { animation-play-state:paused; }
  @keyframes marquee { to { transform:translateX(-50%); } }
  .glass { background:rgba(245,241,234,.72); backdrop-filter:blur(18px) saturate(1.4); -webkit-backdrop-filter:blur(18px) saturate(1.4); }
  #scrollProgress { position:fixed; top:0; left:0; height:3px; background:var(--clay); z-index:1200; width:0; transition:width .08s linear; }
  .par { will-change:transform; }
  @media (max-width: 767px) {
    .hide-mobile { display: none !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .grid-3 { grid-template-columns: 1fr 1fr !important; }
    .grid-4 { grid-template-columns: 1fr 1fr !important; }
    /* Mobile overflow guard — clip horizontal without creating a scroll container
       (overflow-x:hidden on html/body traps the mouse wheel; overflow-x:clip does not) */
    body { overflow-x: clip; max-width: 100%; }
    /* Any auto-fill grid with a large min collapses to a single column on phones */
    .resp-2col { grid-template-columns: 1fr !important; }
  }
  /* Global safety net: clip stray horizontal overflow WITHOUT trapping the wheel */
  body { overflow-x: clip; }
  @media (min-width: 768px) {
    .hide-desktop { display: none !important; }
  }

  /* ── ui-ux-pro-max: site-wide UX baseline ── */
  /* Accessibility: visible keyboard focus on every interactive element (CRITICAL) */
  /* Touch & interaction: remove 300ms tap delay, kill grey tap flash, comfortable targets */
  a, button, [role="button"], input[type="submit"], label { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  button:not(:disabled), a[href], [role="button"] { cursor: pointer; }
  /* Anchor offset for the fixed header. (No global smooth-scroll — it can make
     wheel/trackpad scrolling feel laggy or "stuck" on some devices.) */
  :target { scroll-margin-top: 96px; }
  /* Data legibility: tabular figures for prices, stats and counters */
  .tnum, .price, .stat-num { font-variant-numeric: tabular-nums; }
  /* Images never collapse layout while loading */
  img { max-width: 100%; }
  /* Respect reduced-motion: calm the whole site for users who ask for it (CRITICAL) */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }
    .kenburns, .marquee, .blob-1, .blob-2, .blob-3, .blob-4 { animation: none !important; }
    .rv, .rv-l, .rv-r, .rv-sc, .rv-words .w { opacity: 1 !important; transform: none !important; }
    .yas-aurora, .yas-orb, .yas-spark, .yas-shimmer-box { animation: none !important; }
  }
  /* ── AI YAS flagship page (warm Closets palette) ── */
  .yas-hero { position:relative; overflow:hidden; background:var(--cream); color:var(--ink); }
  .yas-aurora { position:absolute; inset:-30% -10%; z-index:0; pointer-events:none;
    background:
      radial-gradient(40% 50% at 20% 30%, rgba(168,75,41,.16), transparent 60%),
      radial-gradient(45% 55% at 80% 20%, rgba(168,75,41,.10), transparent 60%),
      radial-gradient(50% 50% at 60% 80%, rgba(194,65,12,.10), transparent 60%),
      radial-gradient(40% 40% at 15% 85%, rgba(168,75,41,.12), transparent 60%);
    filter:blur(46px); animation:yasAurora 22s ease-in-out infinite; }
  @keyframes yasAurora {
    0%,100% { transform:translate3d(0,0,0) scale(1); }
    33%     { transform:translate3d(3%,-2%,0) scale(1.08); }
    66%     { transform:translate3d(-3%,2%,0) scale(0.96); }
  }
  .yas-gridlines { position:absolute; inset:0; z-index:0; pointer-events:none;
    background-image:linear-gradient(rgba(33,28,24,.04) 1px, transparent 1px),linear-gradient(90deg, rgba(33,28,24,.04) 1px, transparent 1px);
    background-size:54px 54px; mask-image:radial-gradient(ellipse 90% 70% at 50% 40%, black, transparent); -webkit-mask-image:radial-gradient(ellipse 90% 70% at 50% 40%, black, transparent); }
  .yas-orb { position:absolute; border-radius:50%; filter:blur(3px); pointer-events:none; z-index:0;
    background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.95), rgba(168,75,41,.28)); animation:yasFloat 9s ease-in-out infinite; }
  @keyframes yasFloat { 0%,100% { transform:translateY(0); opacity:.35; } 50% { transform:translateY(-22px); opacity:.7; } }
  .yas-noise { position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.6;
    background:radial-gradient(circle at 50% 0%, rgba(168,75,41,.06), transparent 55%); }
  .yas-promptbar { background:#fff; border:1px solid var(--line); border-radius:20px;
    box-shadow:0 24px 60px -34px rgba(33,28,24,.4); }
  .yas-prompt-input { background:transparent; border:none; outline:none; color:var(--ink); font-size:17px; width:100%; font-family:inherit; }
  .yas-prompt-input::placeholder { color:var(--muted); }
  .yas-glass { background:#fff; border:1px solid var(--line); border-radius:20px; transition:transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .25s; }
  @media (min-width:768px){ .yas-glass.yas-int:hover { transform:translateY(-5px); box-shadow:0 30px 60px -30px rgba(33,28,24,.4); border-color:rgba(168,75,41,.55); } }
  .yas-chip { border-radius:999px; padding:8px 15px; font-size:13.5px; font-weight:600; cursor:pointer; transition:all .18s; border-width:1.5px; border-style:solid; }
  .yas-spark { display:inline-block; animation:yasSpin 4s linear infinite; }
  @keyframes yasSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
  .yas-shimmer-box { position:relative; overflow:hidden; background:linear-gradient(100deg,var(--sand, #ebe4d8) 30%,#f5f1ea 50%,#ebe4d8 70%); background-size:200% 100%; animation:yasShimmer 1.4s ease-in-out infinite; border-radius:12px; }
  @keyframes yasShimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }
  .yas-cap { display:inline-flex; align-items:center; gap:7px; background:var(--sand); border:1px solid var(--line); color:var(--clay-deep); border-radius:999px; padding:9px 15px; font-size:13px; font-weight:600; }
  /* AI YAS sub-brand lockup */
  .yas-lockup { display:inline-flex; align-items:center; gap:14px; }
  .yas-lockup .yas-lockup-spark { display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; border-radius:16px; background:var(--sand); border:1px solid var(--line); color:var(--clay); flex-shrink:0; }
  .yas-lockup .yas-lockup-spark svg { animation:yasSpin 6s linear infinite; }
  .yas-lockup-word { line-height:1; }
  .yas-lockup-kicker { font-size:13px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin-top:6px; }
  .yas-modal-back { position:fixed; inset:0; z-index:1200; background:rgba(14,12,20,.62); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:flex-start; justify-content:center; padding:24px 16px; overflow-y:auto; animation:fadeIn .2s ease; }
  .yas-modal { background:var(--cream); border-radius:24px; width:100%; max-width:880px; margin:auto; box-shadow:0 40px 100px -30px rgba(0,0,0,.6); animation:fadeUp .3s cubic-bezier(.22,1,.36,1); overflow:hidden; }
  .yas-typing span { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--clay); margin:0 2px; animation:yasBlink 1.2s infinite both; }
  .yas-typing span:nth-child(2){ animation-delay:.2s; } .yas-typing span:nth-child(3){ animation-delay:.4s; }
  @keyframes yasBlink { 0%,80%,100%{ opacity:.25; transform:translateY(0);} 40%{ opacity:1; transform:translateY(-3px);} }

  /* ════════════════════════════════════════════════════════════
     ── Premium site-wide MOTION layer (additive polish) ──
     Scroll-reveal · staggered grids · hover micro-interactions · float
     Same easing (.22,.61,.36,1) / durations everywhere for consistency.
     ════════════════════════════════════════════════════════════ */
  /* Staggered cascade: children stay hidden until the parent is .in */
  .reveal-stagger.in > * { animation:revealUp .6s cubic-bezier(.22,.61,.36,1) both; }
  @keyframes revealUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  .reveal-stagger.in > *:nth-child(1){ animation-delay:.04s; }
  .reveal-stagger.in > *:nth-child(2){ animation-delay:.10s; }
  .reveal-stagger.in > *:nth-child(3){ animation-delay:.16s; }
  .reveal-stagger.in > *:nth-child(4){ animation-delay:.22s; }
  .reveal-stagger.in > *:nth-child(5){ animation-delay:.28s; }
  .reveal-stagger.in > *:nth-child(6){ animation-delay:.34s; }
  .reveal-stagger.in > *:nth-child(7){ animation-delay:.40s; }
  .reveal-stagger.in > *:nth-child(8){ animation-delay:.46s; }
  .reveal-stagger.in > *:nth-child(n+9){ animation-delay:.52s; }
  /* Gentle premium lift on cards */
  /* Image zoom inside its own clipping wrapper */
  /* Tactile button feedback (append to existing styles, do not replace) */
  /* Hero accent float */
  @keyframes floatY { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
  .floaty { animation:floatY 6s ease-in-out infinite; }
  /* Honour reduced-motion: reveal everything, kill all motion */
  @media (prefers-reduced-motion: reduce) {
    .reveal, .reveal.in, .reveal-stagger.in > *, .floaty {
      opacity:1 !important; transform:none !important; animation:none !important; transition:none !important;
    }
  }
  /* ─────────────  Apple-style site-wide polish  ───────────── */
  /* Deeper, softer, springier lift on every card */
  /* Universal tactile press + smooth state transitions on buttons/links */
  /* Brand-coloured focus ring for accessibility */
  @media (prefers-reduced-motion: reduce){
    html{ scroll-behavior:auto; }
    .lift{ transition:none; } .lift:hover{ transform:none; box-shadow:0 18px 40px rgba(20,16,12,.12); }
  }
`;

function useReveal() {
  useEffect(() => {
    const SEL = '.reveal, .rv, .rv-l, .rv-r, .rv-sc, .rv-words';
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } }), { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });
    const observeAll = () => {
      document.querySelectorAll(SEL).forEach(el => {
        if (el.classList.contains('vis')) return;
        const r = el.getBoundingClientRect();
        // Reveal anything already in (or above) the viewport immediately, observe the rest.
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('vis');
        else obs.observe(el);
      });
    };
    observeAll();
    // Pick up nodes added after first paint (lazy data, route content).
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
    // Safety net: content must never stay permanently hidden if the observer is starved.
    const onScroll = () => observeAll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const failsafe = setTimeout(() => { document.querySelectorAll(SEL).forEach(el => el.classList.add('vis')); }, 2600);
    return () => { obs.disconnect(); mo.disconnect(); window.removeEventListener('scroll', onScroll); clearTimeout(failsafe); };
  }, []);
}

/* ── NAV (desktop) + BOTTOM TAB BAR (mobile) ── */
// Mega-menu information architecture for The Closets. Every leaf routes to a real page id.
// `go` shape: a page id string, or a `cat:<category>` deep link into ProductsPage/CategoryPage.
const NAV_GROUPS = [
  {
    key: 'wardrobes', label: 'Wardrobes', feature: 'wardrobes',
    columns: [
      { title: 'By style', items: [
        ['Walk-in dressing rooms', 'wardrobes'], ['Sliding-door wardrobes', 'wardrobes'],
        ['Hinged-door wardrobes', 'wardrobes'], ['Fitted & reach-in', 'wardrobes'],
        ['Free-standing', 'wardrobes'],
      ] },
      { title: 'By finish', items: [
        ['Walnut', 'wardrobes'], ['Oak', 'wardrobes'], ['Matt lacquer', 'wardrobes'],
        ['High gloss', 'wardrobes'], ['Two-tone', 'wardrobes'],
      ] },
      { title: 'Get started', items: [
        ['View all wardrobes →', 'wardrobes'], ['Wardrobe planner', 'wardrobe-planner'], ['3D wardrobe planner', 'wardrobe-planner'], ['Why The Closets', 'about'],
      ], accent: true },
    ],
  },
  {
    key: 'kitchens', label: 'Kitchens', feature: 'kitchen',
    columns: [
      { title: 'By style', items: [
        ['Modern handleless', 'kitchen'], ['Shaker', 'kitchen'],
        ['Traditional', 'kitchen'], ['Compact & galley', 'kitchen'],
      ] },
      { title: 'Build & spec', items: [
        ['Worktops', 'kitchen'], ['Finishes & colours', 'kitchen'], ['Appliances', 'kitchen'],
      ] },
      { title: 'Get started', items: [
        ['View all kitchens →', 'kitchen'], ['3D kitchen planner', 'kitchen-planner'], ['Book a design visit', 'booking'],
      ], accent: true },
    ],
  },
  {
    key: 'doors', label: 'Doors & more',
    columns: [
      { title: 'Rooms & products', items: [
        ['Doors', 'doors'], ['TV & media units', 'tv'],
        ['Home office', 'office'], ['Storage & home office', 'cat:Storage Solutions'], ['Vanity units', 'cat:Vanity Units'],
      ] },
      { title: 'Explore', items: [
        ['Wood door planner', 'door-planner'], ['TV & media unit planner', 'tv-planner'], ['Office planner', 'office-planner'], ['Browse the full gallery →', 'products'], ['Recent projects', 'projects'],
      ], accent: true },
    ],
  },
  {
    key: 'studio', label: 'Design studio',
    columns: [
      { title: 'Plan it yourself', items: [
        ['✨ AI YAS', 'ai-yas'], ['How it works', 'how-it-works'], ['Wardrobe planner', 'wardrobe-planner'], ['Kitchen planner', 'kitchen-planner'], ['TV unit planner', 'tv-planner'], ['Office planner', 'office-planner'], ['Wood door planner', 'door-planner'], ['AI interior designer', 'ai'],
      ] },
      { title: 'Room visualizer', items: [
        ['🎨 Room visualizer', 'viz:'], ['360° rooms', 'viz:room/living?mode=360'], ['Visualize your room photo', 'viz:photo'], ['Finishes catalogue (PDF)', 'viz:catalog'],
      ] }, // [ROOM-VIZ 2026-11-07]
      { title: 'Neo designers', items: [
        ['Neo Kitchen Designer', 'neo:kitchen'], ['Neo Closets Designer', 'neo:closets'], ['Neo Custom Designer', 'neo:custom'], ['Neo Bathroom Designer', 'neo:bathroom'],
        ['Neo Laundry Designer', 'neo:laundry'], ['Neo TV Unit Designer', 'neo:tv'], ['Neo Office Designer', 'neo:office'], ['Neo Doors Designer', 'neo:doors'],
        ['My designs & quotes →', 'neo:account'],
      ] }, // [WEB-STUDIO 2026-10-31]
      { title: 'Talk to a designer', items: [
        ['How the planner works →', 'how-it-works'], ['Book a design appointment →', 'booking'], ['Visit a showroom', 'showrooms'],
      ], accent: true },
    ],
  },
  {
    key: 'pricing', label: 'Pricing & finance',
    columns: [
      { title: 'Plan your budget', items: [
        ['Get a free quote', 'booking'], ['Try the price estimator', 'planner'],
      ] },
      { title: 'Ways to pay', items: [
        ['Flexible payment options', 'booking'], ['What it costs', 'faq'],
      ], accent: true },
    ],
  },
  {
    key: 'inspiration', label: 'Inspiration',
    columns: [
      { title: 'See & save ideas', items: [
        ['Project gallery', 'projects'], ['Design journal', 'blog'],
      ] },
      { title: 'Guides', items: [
        ['Buying guides', 'blog'], ['Design ideas', 'projects'],
      ], accent: true },
    ],
  },
];
// Flat top-level links that have no dropdown.
const NAV_FLAT = [['Offers', 'offers'], ['Showrooms', 'showrooms']];
// Priority + More layout: only these 4 mega groups render as top-level buttons, in order.
const NAV_PRIMARY_KEYS = ['kitchens', 'wardrobes', 'doors', 'studio'];
// "More ▾" dropdown — a simple 3-column mega grouping the demoted groups + utility pages.
// Column labels reuse existing NAV_LABEL_KEY entries; leaf labels reuse existing keys where possible.
const MORE_GROUP = {
  key: 'more', label: 'More',
  columns: [
    { title: 'See & save ideas', items: [
      ['Inspiration', 'blog'], ['Project gallery', 'projects'], ['Design journal', 'blog'],
    ] },
    { title: 'Pricing & finance', items: [
      ['Get a free quote', 'booking'], ['Try the price estimator', 'planner'],
      ['Flexible payment options', 'booking'], ['What it costs', 'faq'],
    ] },
    { title: 'Explore', items: [
      ['Showrooms', 'showrooms'], ['Gallery', 'products'],
      ['How it works', 'how-it-works'], ['Contact', 'contact'],
    ], accent: true },
  ],
};
// Accent pill dropdown — one "✨ AI + Design Lab" pill opening two rows.
const AI_PILL_ITEMS = [
  { emoji: '✨', label: '✨ AI YAS', subKey: 'navAiYasSub', target: 'ai-yas' },
  { emoji: '✨', label: '✨ Design Lab', labelAr: '✨ مختبر التصميم', subKey: 'navDesignLabSub', target: 'design-lab' },
];

// i18n: map the English nav/footer labels (used as data keys) → I18N keys.
// Wave-1 surfaces translate at render time via trLabel() so the data arrays
// stay byte-identical and English remains the fallback for anything unmapped.
const NAV_LABEL_KEY = {
  // group titles
  'Wardrobes': 'navWardrobes', 'Kitchens': 'navKitchens', 'Doors & more': 'navDoors',
  'Design studio': 'navStudio', 'Pricing & finance': 'navPricing', 'Inspiration': 'navInspiration',
  'Offers': 'navOffers', 'Showrooms': 'navShowrooms',
  // mega-menu column headers
  'By style': 'navByStyle', 'By finish': 'navByFinish', 'Get started': 'navGetStarted',
  'Build & spec': 'navBuildSpec', 'Rooms & products': 'navRoomsProducts', 'Explore': 'navExplore',
  'Plan it yourself': 'navPlanYourself', 'Talk to a designer': 'navTalkDesigner',
  // [WEB-STUDIO 2026-10-31] Neo designers column
  'Room visualizer': 'navVizCol', '🎨 Room visualizer': 'navlViz', '360° rooms': 'navlViz360', 'Visualize your room photo': 'navlVizPhoto', 'Finishes catalogue (PDF)': 'navlVizPdf', // [ROOM-VIZ]
  'Neo designers': 'navNeoDesigners', 'Neo Kitchen Designer': 'navlNeoKitchen', 'Neo Closets Designer': 'navlNeoClosets', 'Neo Custom Designer': 'navlNeoCustom',
  'Neo Bathroom Designer': 'navlNeoBathroom', 'Neo Laundry Designer': 'navlNeoLaundry', 'Neo TV Unit Designer': 'navlNeoTv', 'Neo Office Designer': 'navlNeoOffice',
  'Neo Doors Designer': 'navlNeoDoors', 'My designs & quotes →': 'navlNeoAccount',
  'Plan your budget': 'navPlanBudget', 'Ways to pay': 'navWaysToPay',
  'See & save ideas': 'navSeeSave', 'Guides': 'navGuides', 'Explore the range →': 'navExploreRange',
  // wardrobe links
  'Walk-in dressing rooms': 'navlWalkin', 'Sliding-door wardrobes': 'navlSliding',
  'Hinged-door wardrobes': 'navlHinged', 'Fitted & reach-in': 'navlFitted', 'Free-standing': 'navlFree',
  'Walnut': 'navlWalnut', 'Oak': 'navlOak', 'Matt lacquer': 'navlMattLac', 'High gloss': 'navlGloss',
  'Two-tone': 'navlTwoTone', 'View all wardrobes →': 'navlAllWardrobes',
  'Wardrobe planner': 'navlWardrobePlanner', '3D wardrobe planner': 'navl3dWardrobe',
  'Why The Closets': 'navlWhyClosets',
  // kitchen links
  'Modern handleless': 'navlHandleless', 'Shaker': 'navlShaker', 'Traditional': 'navlTraditional',
  'Compact & galley': 'navlCompactGalley', 'Worktops': 'navlWorktops',
  'Finishes & colours': 'navlFinishesColours', 'Appliances': 'navlAppliances',
  'View all kitchens →': 'navlAllKitchens', '3D kitchen planner': 'navl3dKitchen',
  'Book a design visit': 'navlBookDesignVisit',
  // doors & more links
  'Doors': 'navlDoors', 'TV & media units': 'navlTvMedia', 'Home office': 'navlHomeOffice',
  'Storage & home office': 'navlStorageOffice', 'Vanity units': 'navlVanity',
  'Wood door planner': 'navlDoorPlanner', 'TV & media unit planner': 'navlTvPlanner',
  'Office planner': 'navlOfficePlanner', 'Browse the full gallery →': 'navlFullGallery',
  'Recent projects': 'navlRecentProjects',
  // design studio links
  '✨ AI YAS': 'navlAiYas', 'How it works': 'navlHowItWorks', 'Kitchen planner': 'navlKitchenPlanner',
  'TV unit planner': 'navlTvUnitPlanner', 'AI interior designer': 'navlAiDesigner',
  'How the planner works →': 'navlHowPlannerWorks', 'Book a design appointment →': 'navlBookAppointment',
  'Visit a showroom': 'navlVisitShowroom',
  // pricing & finance links
  'Get a free quote': 'navlFreeQuote', 'Try the price estimator': 'navlPriceEstimator',
  'Flexible payment options': 'navlFlexiblePay', 'What it costs': 'navlWhatItCosts',
  // inspiration links
  'Project gallery': 'navlProjectGallery', 'Design journal': 'navlDesignJournal',
  'Buying guides': 'navlBuyingGuides', 'Design ideas': 'navlDesignIdeas',
  // footer column headings + links
  'Here to help': 'footHelp', 'Ways to shop': 'footWaysShop', 'About': 'footAbout',
  'FAQ': 'footFaq', 'Delivery & install': 'footDelivery', 'Warranty service': 'footWarranty',
  'Maintenance': 'footMaintenance', 'Reviews': 'footReviews', 'Contact us': 'contactUs',
  'Book an appointment': 'footBookAppt', 'Request a brochure': 'footBrochure',
  'Finance & payment': 'footFinance', 'Find a showroom': 'footFindShowroom',
  'Recommend a friend': 'footRecommend', 'About The Closets': 'footAboutClosets',
  'Careers': 'footCareers', 'Sitemap': 'footSitemap', 'Gallery': 'gallery', 'Contact': 'contact',
  // My Closets account column
  'My account': 'footMyAccount', 'My orders': 'footMyOrders', 'My designs': 'footMyDesigns',
  'My rewards': 'footMyRewards', 'Track a request': 'footTrackRequest', 'Book a visit': 'footBookVisit',
};
// trLabel(label, lang): translate a data-driven label by lookup; falls back to the
// English literal (so unmapped labels render unchanged).
function trLabel(label, lang) {
  const k = NAV_LABEL_KEY[label];
  return (k && I18N[k]) ? (I18N[k][lang] || I18N[k].en) : label;
}

// CAT_KEY: product-card category eyebrow → I18N key (display only; product NAME data stays English).
// Unknown categories fall back to the English value unchanged.
const CAT_KEY = {
  'Wardrobes':'catWardrobes', 'Wardrobe':'catWardrobes',
  'Sliding Wardrobes':'catSlidingWardrobes', 'Sliding Wardrobe':'catSlidingWardrobes',
  'Walk-in Closets':'catWalkInClosets', 'Walk-in Closet':'catWalkInClosets',
  'Walk-In Closets':'catWalkInClosets', 'Walk-In Closet':'catWalkInClosets',
  'Kitchens':'catKitchens', 'Kitchen':'catKitchens',
  'TV Units':'catTvUnits', 'TV Unit':'catTvUnits',
  'Doors':'catDoors', 'Door':'catDoors',
  'Home Office':'catHomeOffice', 'Office':'catHomeOffice',
  'Storage':'catStorage', 'Vanities':'catVanities', 'Vanity':'catVanities',
  'Shelving':'catShelving',
};
// trCat(value, lang): translate a displayed category eyebrow; English fallback for unknowns.
function trCat(value, lang) {
  if (!value) return value;
  const k = CAT_KEY[value];
  return (k && I18N[k]) ? (I18N[k][lang] || I18N[k].en) : value;
}
// trMap(value, map, lang): generic display translator over one of the booking maps above.
function trMap(value, map, lang) {
  if (!value) return value;
  const k = map[value];
  return (k && I18N[k]) ? (I18N[k][lang] || I18N[k].en) : value;
}

// ── Offers display-maps (DB-driven store_offers; translate common seeded values only). ──
// Keyed on the known English title / subtitle / badge strings. Unknown / fully-custom
// offers fall back to the English DB value (translate those by editing them in the Hub).
const OFFER_TITLE_KEY = {
  'Kitchen Upgrade':'offTitleKitchenUpgrade', 'Finance 0%':'offTitleFinance0',
  'Walk-In Closet Season':'offTitleWalkInSeason', 'Walk-in Closet Season':'offTitleWalkInSeason',
  'Wardrobe Sale':'offTitleWardrobeSale', 'Free Design Consultation':'offTitleFreeDesign',
  'Free Installation':'offTitleFreeInstall', 'Summer Sale':'offTitleSummerSale',
};
const OFFER_SUB_KEY = {
  'Complimentary quartz worktop upgrade on full kitchens':'offSubKitchenUpgrade',
  'Interest-free over up to 4 years on selected projects':'offSubFinance0',
  'Save on bespoke walk-in dressing rooms':'offSubWalkInSeason',
  'Bespoke fitted wardrobes at special prices':'offSubWardrobeSale',
  'Book a free design consultation with our experts':'offSubFreeDesign',
  'Free professional installation on selected projects':'offSubFreeInstall',
  'Limited-time savings across the collection':'offSubSummerSale',
};
const OFFER_BADGE_KEY = {
  'Free upgrade':'offBadgeFreeUpgrade', 'APR 0%':'offBadgeApr0',
  'Up to 25% off':'offBadgeUpTo25', 'Up to 20% off':'offBadgeUpTo20',
  'Up to 30% off':'offBadgeUpTo30', 'Free':'offBadgeFree',
  'Limited time':'offBadgeLimited', 'New':'offBadgeNew',
};

// [SEO] Top-nav item: a REAL <a href> when it has a destination (keyboard, middle-click, crawlers), a button otherwise.
function NavTop({ to, children, style, ...rest }) {
  if (to) return <Link to={to} style={{ ...style, textDecoration:'none' }} {...rest}>{children}</Link>;
  return <button type="button" style={style} {...rest}>{children}</button>;
}
function Nav({ page, setPage, cart, setCartOpen, user, openAuth, siteLogo, lang, setLang }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMega, setOpenMega] = useState(null);     // desktop hover/click dropdown key
  const [openAcc, setOpenAcc] = useState(null);       // mobile drawer accordion key
  const mobile = useMobile();
  const tr = (k) => (I18N[k] ? (I18N[k][lang] || I18N[k].en) : k);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 20); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);
  useEffect(() => { const h = () => setOpenMega(null); window.addEventListener('scroll', h, { passive:true }); return () => window.removeEventListener('scroll', h); }, []);
  const closeTimer = useRef(null);
  const openMenu = (k) => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } setOpenMega(k); };
  const scheduleClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpenMega(null), 220); };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  // Navigate from any mega/drawer leaf — supports both plain page ids and `cat:` deep links.
  const navTo = (target) => {
    setOpenMega(null); setMenuOpen(false);
    if (target === 'cat:Doors') { setPage('door-planner'); }
    else if (typeof target === 'string' && target.startsWith('cat:')) { setPage('products'); }
    else { setPage(target); }
  };

  // [A11Y] keyboard model for the mega menus: Enter/Space = button action, ArrowDown opens + enters the panel, Esc closes and
  // returns focus to the trigger, Left/Right move between triggers (mirrored in RTL), Up/Down move inside the panel.
  const focusTrigger = (k) => { const el = typeof document !== 'undefined' && document.querySelector('[data-mega-trigger="' + k + '"]'); if (el) el.focus(); };
  const onTriggerKey = (e, k) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(k); setTimeout(() => { const a = document.querySelector('#mega-panel a[href]'); if (a) a.focus(); }, 40); }
    else if (e.key === 'Escape') { if (openMega) { e.preventDefault(); setOpenMega(null); } }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const all = Array.from(document.querySelectorAll('nav [data-mega-trigger]')); const i = all.indexOf(e.currentTarget);
      const nx = all[i + ((e.key === 'ArrowRight') === (lang !== 'ar') ? 1 : -1)];
      if (nx) { e.preventDefault(); nx.focus(); if (openMega) openMenu(nx.getAttribute('data-mega-trigger')); }
    }
  };
  const onPanelKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); const k = openMega; setOpenMega(null); if (k) focusTrigger(k); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(e.currentTarget.querySelectorAll('a[href]')); if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      e.preventDefault(); const nx = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]; if (nx) nx.focus();
    }
  };
  const onPanelBlur = (e) => { const n = e.relatedTarget; if (n && !e.currentTarget.contains(n) && !(n.closest && n.closest('[data-mega-trigger]'))) setOpenMega(null); };
  const DOCK = [
    { id:'home', label:tr('home'), icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id:'products', label:tr('gallery'), icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id:'planner', label:tr('design'), fab:true, icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> },
    { id:'services', label:tr('dockServices'), icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-.5-.5-2z"/></svg> },
    { id:'menu', label:tr('menu'), icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> },
  ];
  const go = (id) => { if (id==='menu') setMenuOpen(true); else { setOpenAcc(null); navTo(id); } };

  return (<>
    {/* Slim top bar — logo + actions */}
    <nav aria-label={lang==='ar' ? 'التنقل الرئيسي' : 'Main'} onMouseLeave={scheduleClose} style={{ position:'fixed', top:0, left:0, right:0, zIndex:900, height:58, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding: mobile?'0 16px':'0 24px', background: scrolled?'rgba(245,241,234,.92)':'rgba(245,241,234,.72)', backdropFilter:'blur(18px) saturate(180%)', borderBottom: scrolled?'1px solid var(--line)':'1px solid transparent', transition:'all .3s' }}>
      <Link to="/" className="hit44" onClick={()=>{ setMenuOpen(false); }} aria-label="The Closets — home" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8 }}>
        {(cms('header.logo', '') || siteLogo)
          ? <img src={cms('header.logo', '') || siteLogo} alt="The Closets" style={{ height:32, width:'auto', maxWidth:120, objectFit:'contain', borderRadius:6 }} />
          : <span style={{ fontFamily:'var(--font-sans)', fontSize:16, fontWeight:600, color:'var(--ink)', letterSpacing:'.02em' }}>{cms('header.brand', 'THE CLOSETS')}</span>}
      </Link>

      {/* 🧩 Design your own — pinned to the LEFT, right beside the logo.
          Logged-out visitors land on the sign-in gate (PLANNER_PAGES is gated). */}
      {!mobile && (
        <button type="button" onClick={()=>{ setOpenMega(null); setMenuOpen(false); navTo('planner'); }}
          title={lang==='ar' ? 'صمّم واحسب سعرك بنفسك' : 'Design & price your own'}
          style={{ flexShrink:0, cursor:'pointer', padding:'7px 14px', fontSize:13.5, fontWeight:700,
                   color: page==='planner' ? '#fff' : 'var(--clay-deep)',
                   background: page==='planner' ? 'var(--clay)' : 'var(--sand)',
                   border:'1px solid ' + (page==='planner' ? 'var(--clay)' : 'rgba(168,75,41,.35)'),
                   borderRadius:999, display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
          <span aria-hidden="true">🧩</span>
          {lang==='ar' ? 'صمّم بنفسك' : 'Design your own'}
        </button>
      )}

      {!mobile && (
        <div onMouseLeave={scheduleClose} style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', justifyContent:'center', gap:2, flexWrap:'nowrap', overflow:'visible' }}>
          {NAV_PRIMARY_KEYS.map(key => {
            const g = NAV_GROUPS.find(x=>x.key===key); if (!g) return null;
            const on = openMega===g.key;
            const active = (g.feature && page===g.feature);
            return (
              <div key={g.key} onMouseEnter={()=>openMenu(g.key)} style={{ position:'static', flexShrink:1, minWidth:0 }}>
                <NavTop to={g.feature ? navToPath(g.feature) : null}
                  onClick={()=> g.feature ? (setOpenMega(null), setMenuOpen(false)) : setOpenMega(on?null:g.key)}
                  aria-expanded={on} aria-haspopup="true" aria-controls={on ? 'mega-panel' : undefined} data-mega-trigger={g.key} onKeyDown={(e)=>onTriggerKey(e, g.key)}
                  style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:'8px 10px', fontSize:14, fontWeight: (on||active)?600:500, color:(on||active)?'var(--clay-deep)':'var(--ink)', borderRadius:10, whiteSpace:'nowrap' }}>
                  {trLabel(g.label, lang)}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: on?'rotate(180deg)':'none', transition:'transform .2s', opacity:.6 }}><polyline points="6 9 12 15 18 9"/></svg>
                </NavTop>
              </div>
            );
          })}
          {/* Offers — direct visible link after Design studio */}
          <Link to="/offers" onMouseEnter={()=>setOpenMega(null)} onClick={()=>{ setOpenMega(null); setMenuOpen(false); }}
            style={{ textDecoration:'none', padding:'8px 10px', fontSize:14, fontWeight: page==='offers'?600:500, color: page==='offers'?'var(--clay-deep)':'var(--ink)', borderRadius:10, whiteSpace:'nowrap' }}>{trLabel('Offers', lang)}</Link>
          {/* More ▾ — demoted groups + utility pages */}
          <div onMouseEnter={()=>openMenu('more')} style={{ position:'static', flexShrink:0 }}>
            <button type="button" onClick={()=>setOpenMega(openMega==='more'?null:'more')} aria-expanded={openMega==='more'} aria-haspopup="true" aria-controls={openMega==='more' ? 'mega-panel' : undefined} data-mega-trigger="more" onKeyDown={(e)=>onTriggerKey(e, 'more')}
              style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:'8px 10px', fontSize:14, fontWeight: openMega==='more'?600:500, color: openMega==='more'?'var(--clay-deep)':'var(--ink)', borderRadius:10, whiteSpace:'nowrap' }}>
              {tr('navMore')}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openMega==='more'?'rotate(180deg)':'none', transition:'transform .2s', opacity:.6 }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          {/* One accent pill — ✨ AI + Design Lab, opens a small dropdown */}
          <div onMouseEnter={()=>openMenu('ai')} style={{ position:'static', flexShrink:0 }}>
            <button type="button" onClick={()=>setOpenMega(openMega==='ai'?null:'ai')} aria-expanded={openMega==='ai'} aria-haspopup="true" aria-controls={openMega==='ai' ? 'mega-panel' : undefined} data-mega-trigger="ai" onKeyDown={(e)=>onTriggerKey(e, 'ai')}
              style={{ cursor:'pointer', padding:'6px 12px', fontSize:14, fontWeight:700, color:(page==='ai-yas'||page==='design-lab')?'#fff':'var(--clay-deep)', background:(page==='ai-yas'||page==='design-lab')?'var(--clay)':'var(--sand)', border:'1px solid '+((page==='ai-yas'||page==='design-lab')?'var(--clay)':'rgba(168,75,41,.35)'), borderRadius:999, display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap', flexShrink:0 }}>
              <span aria-hidden="true">✨ </span>{tr('navAiDesignLab')}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openMega==='ai'?'rotate(180deg)':'none', transition:'transform .2s', opacity:.7 }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
        {!mobile && <Link to="/booking" style={{ textDecoration:'none', display:'inline-block', background:'var(--clay)', border:'none', borderRadius:980, padding:'8px 16px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer' }}>{cms('header.cta.book', tr('bookVisit'))}</Link>}
        <button type="button" onClick={()=>setLang(lang==='ar'?'en':'ar')} onPointerEnter={ensureArabic} aria-label={lang==='ar' ? 'English' : 'العربية'} lang={lang==='ar' ? 'en' : 'ar'} title={lang==='ar' ? 'English' : 'العربية'} className="hit44" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:980, padding:'7px 13px', fontSize:13, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{lang==='ar'?'EN':'ع'}</button>
        {user ? <Link to="/portal" className="hit44" style={{ textDecoration:'none', display:'inline-block', background:'rgba(168,75,41,.12)', border:'none', borderRadius:980, padding:'7px 14px', fontSize:13, fontWeight:500, color:'var(--clay-deep)', cursor:'pointer' }}>{String(user.name || '').split(' ')[0]}</Link>
          : <button type="button" className="hit44" onClick={()=>openAuth('login')} style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:980, padding:'7px 14px', fontSize:13, fontWeight:500, color:'var(--ink)', cursor:'pointer' }}>{tr('signIn')}</button>}
        <button type="button" onClick={()=>setCartOpen(true)} aria-label={tr('cart') + (cart.length>0 ? ' (' + cart.length + ')' : '')} className="hit44" style={{ position:'relative', background: cart.length>0?'var(--clay)':'#fff', border:'1px solid var(--line)', borderRadius:980, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: cart.length>0?'#fff':'var(--ink)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cart.length>0 && <span style={{ position:'absolute', top:-4, right:-4, background:'var(--ink)', color:'#fff', borderRadius:999, fontSize:10, fontWeight:700, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{cart.length}</span>}
        </button>
      </div>
    </nav>

    {/* Desktop AI + Design Lab pill dropdown — small two-row menu */}
    {!mobile && openMega==='ai' && (
      <div id="mega-panel" role="group" aria-label={tr('navAiDesignLab')} onKeyDown={onPanelKey} onBlur={onPanelBlur} onMouseEnter={()=>setOpenMega('ai')} onMouseLeave={()=>setOpenMega(null)} style={{ position:'fixed', top:58, left:0, right:0, zIndex:899, display:'flex', justifyContent:'flex-end', pointerEvents:'none' }}>
        <div onMouseEnter={()=>openMenu('ai')} onMouseLeave={scheduleClose} style={{ pointerEvents:'auto', margin: lang==='ar' ? '10px auto 0 24px' : '10px 24px 0 auto', width:280, background:'var(--cream)', border:'1px solid var(--line)', borderRadius:14, boxShadow:'0 26px 48px -28px rgba(33,28,24,.4)', padding:8, animation:'fadeUp .2s both' }}>
          {AI_PILL_ITEMS.map(it => {
            const on = page===it.target;
            const lbl = (lang==='ar' && it.labelAr) ? it.labelAr : it.label;
            return (
              <Link key={it.target} to={navToPath(it.target)} onClick={()=>{ setOpenMega(null); setMenuOpen(false); }} style={{ textDecoration:'none', display:'block', width:'100%', textAlign: lang==='ar'?'right':'left', background: on?'var(--sand)':'none', border:'none', cursor:'pointer', borderRadius:10, padding:'10px 12px', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--sand)'} onMouseLeave={e=>e.currentTarget.style.background=on?'var(--sand)':'transparent'}>
                <div style={{ fontSize:14.5, fontWeight:700, color:'var(--clay-deep)' }}>{lbl}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{tr(it.subKey)}</div>
              </Link>
            );
          })}
        </div>
      </div>
    )}

    {/* Desktop mega dropdown panel — fixed under the single bar */}
    {!mobile && openMega && openMega!=='ai' && (() => {
      const g = openMega==='more' ? MORE_GROUP : NAV_GROUPS.find(x=>x.key===openMega); if (!g) return null;
      return (
        <div id="mega-panel" role="group" aria-label={trLabel(g.label, lang)} onKeyDown={onPanelKey} onBlur={onPanelBlur} onMouseEnter={()=>openMenu(openMega)} onMouseLeave={scheduleClose} style={{ position:'fixed', top:58, left:0, right:0, zIndex:899, background:'var(--cream)', borderBottom:'1px solid var(--line)', boxShadow:'0 26px 48px -28px rgba(33,28,24,.4)', animation:'fadeUp .22s both' }}>
          <div style={{ maxWidth:1280, margin:'0 auto', padding:'30px 24px 34px', display:'grid', gridTemplateColumns: g.feature ? '1.3fr repeat('+g.columns.length+',1fr)' : 'repeat('+g.columns.length+',1fr)', gap:36 }}>
            {g.feature && (
              <Link to={navToPath(g.feature)} onClick={()=>{ setOpenMega(null); setMenuOpen(false); }} className="tile-zoom lift" style={{ display:'block', textDecoration:'none', position:'relative', border:'none', padding:0, borderRadius:16, overflow:'hidden', cursor:'pointer', textAlign:'left', minHeight:200, background:'#15110e' }}>
                <Photo src={g.feature==='kitchen'?HOME_IMG.kitchen:HOME_IMG.walkin} alt={g.label} imgClass="tz" style={{ position:'absolute', inset:0 }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(20,16,12,0) 40%, rgba(20,16,12,.86) 100%)' }} />
                <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:18, zIndex:2 }}>
                  <div className="display" style={{ color:'#fff', fontSize:22 }}>{trLabel(g.label, lang)}</div>
                  <div style={{ color:'#E7BBA0', fontSize:12.5, fontWeight:600, marginTop:6, letterSpacing:'.04em' }}>{tr('navExploreRange')}</div>
                </div>
              </Link>
            )}
            {g.columns.map((col,ci) => (
              <div key={ci}>
                <div className="eyebrow" style={{ fontSize:11, letterSpacing:'.16em', marginBottom:14, color: col.accent?'var(--clay)':'var(--muted)' }}>{trLabel(col.title, lang)}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {col.items.map(([colLabel,target]) => (
                    <Link key={colLabel} to={navToPath(target)} onClick={()=>{ setOpenMega(null); setMenuOpen(false); }} style={{ display:'block', textDecoration:'none', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'7px 0', fontSize:14, fontWeight: col.accent?600:500, color: col.accent?'var(--clay-deep)':'var(--ink-soft)', transition:'color .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.color='var(--clay)'} onMouseLeave={e=>e.currentTarget.style.color=col.accent?'var(--clay-deep)':'var(--ink-soft)'}>{trLabel(colLabel, lang)}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    })()}

    {/* Spacer so fixed mega-nav doesn't overlap page content on desktop home/landing */}
    {!mobile && <div style={{ height: 0 }} aria-hidden="true" />}

    {/* Floating bottom dock — hidden on the planner (all screen sizes) so it can't cover the planner's own Back/Close/CTA navigation */}
    {!['planner','kitchen-planner','tv-planner','door-planner','wardrobe-planner','office-planner','cat:Doors'].includes(page) && (
    <div role="navigation" aria-label={lang==='ar' ? 'التنقل السريع' : 'Quick navigation'} style={{ position:'fixed', bottom: mobile?'calc(14px + env(safe-area-inset-bottom))':18, left:'50%', transform:'translateX(-50%)', zIndex:900, display:'flex', alignItems:'flex-end', gap: mobile?16:24, maxWidth:'calc(100vw - 24px)', background:'rgba(255,255,255,.92)', backdropFilter:'blur(18px) saturate(180%)', border:'1px solid rgba(0,0,0,.06)', borderRadius:999, padding: mobile?'7px 18px':'8px 24px', boxShadow:'0 10px 34px rgba(33,28,24,.16)' }}>
      {DOCK.map(d => {
        const active = page===d.id;
        const fabInner = (<>
          <span style={{ width:46, height:46, borderRadius:'50%', background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:-24, border:'3px solid #fff', boxShadow:'0 6px 16px rgba(168,75,41,.45)' }}>{d.icon}</span>
          <span style={{ fontSize:10.5, fontWeight:600, color:'var(--clay-deep)' }}>{d.label}</span>
        </>);
        const tabInner = (<>{d.icon}<span style={{ fontSize:10.5, fontWeight: active?600:400 }}>{d.label}</span></>);
        const baseStyle = { background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', ...(d.fab?{}:{ color: active?'var(--clay)':'#86868b' }) };
        // The Menu fab opens the drawer (not a page) — keep it a button.
        if (d.id === 'menu') return <button type="button" key={d.id} className="hit44" onClick={()=>go(d.id)} aria-label={d.label} style={baseStyle}>{d.fab?fabInner:tabInner}</button>;
        return <Link key={d.id} to={pageToPath(d.id)} className="hit44" onClick={()=>setOpenAcc(null)} aria-label={d.label} style={baseStyle}>{d.fab?fabInner:tabInner}</Link>;
      })}
    </div>
    )}

    {/* Mobile drawer menu — full grouped accordion mirroring the desktop mega-nav */}
    {menuOpen && (
      <div onClick={()=>setMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(20,16,12,.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
        <ModalPanel label={tr('menu')} onClose={()=>setMenuOpen(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:560, padding:'18px 18px calc(22px + env(safe-area-inset-bottom))', maxHeight:'86vh', overflow:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span className="display" style={{ fontSize:22, color:'var(--ink)' }}>{tr('menu')}</span>
            <button type="button" aria-label={lang==='ar' ? 'إغلاق' : 'Close'} className="hit44" onClick={()=>setMenuOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:24 }}>✕</button>
          </div>
          {/* Quick links */}
          <Link to="/" onClick={()=>{ setMenuOpen(false); setOpenAcc(null); }} style={{ textDecoration:'none', display:'block', width:'100%', textAlign:'left', background: page==='home'?'var(--sand)':'#fff', border:'1px solid var(--line)', borderRadius:12, padding:'13px 15px', fontSize:15, fontWeight:600, color: page==='home'?'var(--clay-deep)':'var(--ink)', cursor:'pointer', marginBottom:8 }}>{tr('home')}</Link>
          {/* Grouped accordions */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {NAV_PRIMARY_KEYS.map(key => {
              const g = NAV_GROUPS.find(x=>x.key===key); if (!g) return null;
              const open = openAcc===g.key;
              return (
                <div key={g.key} style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
                  <button type="button" onClick={()=>setOpenAcc(open?null:g.key)} aria-expanded={open} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:'14px 15px', fontSize:15.5, fontWeight:600, color:'var(--ink)' }}>
                    {trLabel(g.label, lang)}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open?'rotate(180deg)':'none', transition:'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {open && (
                    <div style={{ padding:'0 15px 14px' }}>
                      {g.feature && <Link to={navToPath(g.feature)} onClick={()=>{ setMenuOpen(false); setOpenAcc(null); }} style={{ textDecoration:'none', display:'block', width:'100%', textAlign:'left', background:'var(--sand)', border:'none', borderRadius:10, padding:'10px 12px', fontSize:14, fontWeight:600, color:'var(--clay-deep)', cursor:'pointer', marginBottom:8 }}>{tr('navlViewAll')} {trLabel(g.label, lang).toLowerCase()} {lang==='ar'?'←':'→'}</Link>}
                      {g.columns.map((col,ci)=>(
                        <div key={ci} style={{ marginBottom: ci<g.columns.length-1?10:0 }}>
                          <div className="eyebrow" style={{ fontSize:10.5, letterSpacing:'.14em', margin:'4px 0 6px', color:'var(--muted)' }}>{trLabel(col.title, lang)}</div>
                          {col.items.map(([label,target])=>(
                            <Link key={label} to={navToPath(target)} onClick={()=>{ setMenuOpen(false); setOpenAcc(null); }} style={{ textDecoration:'none', display:'block', width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'7px 0', fontSize:14, color: col.accent?'var(--clay-deep)':'var(--ink-soft)', fontWeight: col.accent?600:400 }}>{trLabel(label, lang)}</Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Offers — direct link */}
            <Link to="/offers" onClick={()=>{ setMenuOpen(false); setOpenAcc(null); }} style={{ textDecoration:'none', display:'block', width:'100%', textAlign:'left', background: page==='offers'?'var(--sand)':'#fff', border:'1px solid var(--line)', borderRadius:12, padding:'13px 15px', fontSize:15, fontWeight:600, color: page==='offers'?'var(--clay-deep)':'var(--ink)', cursor:'pointer' }}>{trLabel('Offers', lang)}</Link>
            {/* More — demoted groups + utility pages, as an accordion */}
            {(() => {
              const open = openAcc==='more';
              return (
                <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
                  <button type="button" onClick={()=>setOpenAcc(open?null:'more')} aria-expanded={open} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:'14px 15px', fontSize:15.5, fontWeight:600, color:'var(--ink)' }}>
                    {tr('navMore')}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open?'rotate(180deg)':'none', transition:'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {open && (
                    <div style={{ padding:'0 15px 14px' }}>
                      {MORE_GROUP.columns.map((col,ci)=>(
                        <div key={ci} style={{ marginBottom: ci<MORE_GROUP.columns.length-1?10:0 }}>
                          <div className="eyebrow" style={{ fontSize:10.5, letterSpacing:'.14em', margin:'4px 0 6px', color:'var(--muted)' }}>{trLabel(col.title, lang)}</div>
                          {col.items.map(([label,target])=>(
                            <Link key={label+target} to={navToPath(target)} onClick={()=>{ setMenuOpen(false); setOpenAcc(null); }} style={{ textDecoration:'none', display:'block', width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'7px 0', fontSize:14, color: col.accent?'var(--clay-deep)':'var(--ink-soft)', fontWeight: col.accent?600:400 }}>{trLabel(label, lang)}</Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* ✨ AI + Design Lab — accent section */}
            {(() => {
              const open = openAcc==='ai';
              const activeAi = page==='ai-yas' || page==='design-lab';
              return (
                <div style={{ background: activeAi?'var(--clay)':'var(--sand)', border:'1px solid '+(activeAi?'var(--clay)':'rgba(168,75,41,.35)'), borderRadius:12, overflow:'hidden' }}>
                  <button type="button" onClick={()=>setOpenAcc(open?null:'ai')} aria-expanded={open} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:'14px 15px', fontSize:15, fontWeight:700, color: activeAi?'#fff':'var(--clay-deep)' }}>
                    <span aria-hidden="true">✨ </span>{tr('navAiDesignLab')}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open?'rotate(180deg)':'none', transition:'transform .2s', opacity:.85 }}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {open && (
                    <div style={{ padding:'0 12px 12px', background:'var(--cream)' }}>
                      {AI_PILL_ITEMS.map(it => {
                        const lbl = (lang==='ar' && it.labelAr) ? it.labelAr : it.label;
                        return (
                          <Link key={it.target} to={navToPath(it.target)} onClick={()=>{ setMenuOpen(false); setOpenAcc(null); }} style={{ textDecoration:'none', display:'block', width:'100%', textAlign:'left', background: page===it.target?'var(--sand)':'none', border:'none', cursor:'pointer', borderRadius:10, padding:'10px 10px', marginTop:8 }}>
                            <div style={{ fontSize:14.5, fontWeight:700, color:'var(--clay-deep)' }}>{lbl}</div>
                            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{tr(it.subKey)}</div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <button type="button" onClick={()=>{ setPage('booking'); setMenuOpen(false); }} className="btn-clay" style={{ width:'100%', borderRadius:12, marginTop:14 }}>{tr('bookFreeVisit')}</button>
        </ModalPanel>
      </div>
    )}
  </>);
}

/* ── HERO ── */
// ── Home redesign helpers (editorial-luxury) ──────────────────────────
const HOME_IMG = {
  // Brand story imagery — generated for The Closets (warm walnut, brass, soft daylight).
  hero:    'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_154323_ed082b3f-44ad-4a97-9ca4-278b83a6e9f6.png',
  walkin:  'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_160149_897b07fc-8a2a-4e1d-8a77-e77cacffa5b0.png',
  kitchen: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_154428_5823e707-b25e-41bc-b372-6acd7166bddf.png',
  wardrobe:'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1400&q=80',
  living:  'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_155945_016fe59a-81d0-465d-9f96-1a674fd99b99.png',
  detail:  'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80',
};
// [HOME 2026-11-09] Showroom tour rooms — recent (2025–26) free-license Unsplash photography; override per room from the CMS (home.tour.*).
const TOUR_IMG = {
  walkin:   'https://images.unsplash.com/photo-1778731660196-1b57aa0f7ef5?auto=format&fit=crop&w=1920&q=78',   // luxurious closet with chandelier, seen through open doors
  kitchen:  'https://images.unsplash.com/photo-1785535573585-8f962fa3cda5?auto=format&fit=crop&w=1920&q=78',   // modern kitchen, large marble island, bar stools
  living:   'https://images.unsplash.com/photo-1738168259543-d0c58e2b91ed?auto=format&fit=crop&w=1920&q=78',   // living room with a large TV wall
  wardrobe: 'https://images.unsplash.com/photo-1785395407788-71b829c98bb4?auto=format&fit=crop&w=1920&q=78',   // minimalist walk-in wardrobe, wooden shelves
  door:     'https://images.unsplash.com/photo-1764592119348-0aaeab50e2d0?auto=format&fit=crop&w=1920&q=78',   // modern wooden door with a spotlight
};
// Modern category hero photography (curated free-license stock — Pexels).
const HERO_IMG = {
  kitchen: 'https://images.pexels.com/photos/35189706/pexels-photo-35189706.jpeg?auto=compress&cs=tinysrgb&w=1920',
  tv:      'https://images.pexels.com/photos/34153693/pexels-photo-34153693.jpeg?auto=compress&cs=tinysrgb&w=1920',
  door:    'https://images.pexels.com/photos/19227221/pexels-photo-19227221.jpeg?auto=compress&cs=tinysrgb&w=1920',
  door2:   'https://images.pexels.com/photos/6035346/pexels-photo-6035346.jpeg?auto=compress&cs=tinysrgb&w=1600',
  wardrobe:'https://images.pexels.com/photos/6670657/pexels-photo-6670657.jpeg?auto=compress&cs=tinysrgb&w=1920',
  office:  'https://images.pexels.com/photos/7014764/pexels-photo-7014764.jpeg?auto=compress&cs=tinysrgb&w=1920',
};
// Image with graceful warm-gradient fallback (so a missing/blocked photo never looks broken).
// `priority` = the LCP image: eager + fetchpriority=high (everything else stays lazy). The <img> fills an absolutely-sized
// wrapper, so it cannot shift layout; decoding=async keeps big photos off the main thread.
function Photo({ src, alt = '', style, className = '', imgClass = '', par, priority = false, onLoad, noPrerender = false }) {
  const [err, setErr] = useState(false);
  const cls = (className + (par ? ' par' : '')).trim();
  const dpr = { ...(par ? { 'data-par': par } : {}), ...(noPrerender ? { 'data-noprerender': '1' } : {}) };   // data-noprerender: client-only node, stripped from the prerendered HTML
  if (err) return <div className={cls} {...dpr} {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': 'true' })} style={{ ...style, background: 'linear-gradient(135deg,var(--sand),#d8ccbb)' }} />;
  return <div className={cls} {...dpr} style={{ ...style, overflow: 'hidden' }}>
    <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} {...(priority ? { fetchPriority: 'high' } : {})} decoding="async" onLoad={onLoad} onError={() => setErr(true)} className={imgClass} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  </div>;
}
// Animated count-up statistic.
function Stat({ to, suffix = '', label }) {
  const ref = useRef(null); const [v, setV] = useState(0); const done = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !done.current) { done.current = true; if (prefersReducedMotionNow()) { setV(to); return; } const dur = 1500, t0 = performance.now();
        const tick = t => { const p = Math.min(1, (t - t0) / dur); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }), { threshold: 0.4 });
    obs.observe(el); return () => obs.disconnect();
  }, [to]);
  return <div ref={ref} style={{ textAlign: 'center' }}>
    <div className="display stat-num" style={{ fontSize: 'clamp(40px,5vw,64px)', color: 'var(--ink)', lineHeight: 1 }}>{v}{suffix}</div>
    <div style={{ fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 10 }}>{label}</div>
  </div>;
}
// Scroll progress bar + lightweight parallax for .par[data-par] elements.
function useHomeFx() {
  useEffect(() => {
    let raf = 0;
    const run = () => { raf = 0;
      const h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      const bar = document.getElementById('scrollProgress'); if (bar) bar.style.width = ((max > 0 ? h.scrollTop / max : 0) * 100) + '%';
      const vh = window.innerHeight;
      const still = prefersReducedMotionNow();   // [A11Y] no scroll-driven parallax under prefers-reduced-motion
      document.querySelectorAll('.par').forEach(el => {
        if (still) { el.style.transform = ''; return; }
        const sp = parseFloat(el.getAttribute('data-par')) || 0.1;
        const r = el.getBoundingClientRect(); const c = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (-c * sp).toFixed(1) + 'px,0)';
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(run); };
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); run();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
}
// Rotating editorial testimonial.
function TestiCarousel({ items }) {
  const [i, setI] = useState(0);
  useAutoAdvance(() => setI(x => (x + 1) % items.length), 5500, items.length >= 2);   // [A11Y] no auto-advance under prefers-reduced-motion
  if (!items.length) return null;
  const cur = items[i];
  return <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
    <div key={i} style={{ animation: 'fadeUp .7s both' }}>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 22 }}>{Array.from({ length: cur.rating || 5 }).map((_, j) => <span key={j} style={{ color: 'var(--clay)', fontSize: 16 }}>★</span>)}</div>
      <p className="display" style={{ fontWeight: 400, fontSize: 'clamp(22px,3vw,34px)', color: 'var(--ink)', lineHeight: 1.4 }}>“{cur.text}”</p>
      <div style={{ marginTop: 26, fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{cur.name}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{cur.role}</div>
    </div>
    {items.length > 1 && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 30 }}>{items.map((_, j) => <button key={j} type="button" onClick={() => setI(j)} aria-label={'Go to slide ' + (j + 1)} style={{ width: j === i ? 22 : 8, height: 8, borderRadius: 8, border: 'none', background: j === i ? 'var(--clay)' : 'var(--line)', cursor: 'pointer', transition: 'all .3s', padding: 0 }} />)}</div>}
  </div>;
}

function Hero({ setPage, banners }) {
  const { t } = useI18n();
  const mobile = useMobile();
  const [bannerIdx, setBannerIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const heroRef = useRef(null);
  useAutoAdvance(() => setBannerIdx(i => (i + 1) % banners.length), 5000, !!banners && banners.length >= 2);   // [A11Y] reduced-motion aware
  // Cross-fading multi-image hero — the site's own curated rooms.
  const HERO_SLIDES = [cms('home.hero.image', HOME_IMG.hero), HOME_IMG.walkin, HOME_IMG.kitchen, HOME_IMG.living].filter(Boolean);
  // Only the first slide (the LCP image) loads with the page. The other slides are mounted once the page has loaded and the browser
  // is idle, and the carousel only advances to a slide that has finished loading, so the slides never pop in blank.
  const [warm, setWarm] = useState(false);
  const [slideLoaded, setSlideLoaded] = useState({});
  useEffect(() => {
    const go = () => { const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300)); idle(() => setWarm(true)); };
    if (document.readyState === 'complete') { go(); return undefined; }
    window.addEventListener('load', go, { once: true });
    return () => window.removeEventListener('load', go);
  }, []);
  const slideLoadedRef = useRef(slideLoaded); slideLoadedRef.current = slideLoaded;
  useAutoAdvance(() => setSlideIdx(i => { const n = (i + 1) % HERO_SLIDES.length; return slideLoadedRef.current[n] ? n : i; }), 6000, HERO_SLIDES.length >= 2);
  const banner = banners?.[bannerIdx];
  const onHeroMove = (e) => { const el = heroRef.current; if (!el || mobile) return; const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.querySelectorAll('.hero-img').forEach(img => { img.style.transform = `scale(1.14) translate(${x * -16}px, ${y * -16}px)`; }); };
  const HWORDS = cms('home.hero.title', 'Made to fit your life.').split(/\s+/);

  return (
    <>
      {/* ── Banner strip ── */}
      {banners.length > 0 && (
        <div className="banner-strip" style={{ paddingTop: mobile ? 0 : 0, marginTop: mobile ? 0 : 56 }}>
          <div className="banner-strip-inner" key={bannerIdx}>
            {banner?.badge && (
              <span style={{ background: 'var(--clay)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase' }}>{banner.badge}</span>
            )}
            <span>{banner?.title}{banner?.subtitle ? ' — ' + banner.subtitle : ''}</span>
            {banner?.cta_text && (
              <button type="button" onClick={() => setPage('products')}
                style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {banner.cta_text} →
              </button>
            )}
          </div>
          {banners.length > 1 && (
            <div style={{ display: 'flex', gap: 5, marginLeft: 12 }}>
              {banners.map((_, i) => (
                <button key={i} type="button" onClick={() => setBannerIdx(i)} aria-label={t('swShowAnnouncement') + ' ' + (i + 1)}
                  style={{ width: i === bannerIdx ? 16 : 5, height: 5, borderRadius: 10, background: i === bannerIdx ? 'var(--clay)' : 'rgba(255,255,255,.3)', border: 'none', cursor: 'pointer', transition: 'all .3s', padding: 0 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cinematic hero ── */}
      <section ref={heroRef} onMouseMove={onHeroMove} style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', background: '#15110e' }}>
        {HERO_SLIDES.map((src, i) => (i === 0 || warm) && (
          <Photo key={i} src={src} alt={t('swHeroAlt')} priority={i === 0} noPrerender={i > 0} onLoad={() => setSlideLoaded(m => (m[i] ? m : { ...m, [i]: true }))} imgClass="hero-img kenburns" style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: i === slideIdx ? 1 : 0, transition: 'opacity 1.4s ease' }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(20,16,12,.34) 0%, rgba(20,16,12,.12) 38%, rgba(20,16,12,.82) 100%)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', mixBlendMode: 'overlay', opacity: .07, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1280, margin: '0 auto', padding: mobile ? '120px 24px 72px' : '0 48px 88px' }}>
          <div className="rv eyebrow" style={{ color: '#E7BBA0', marginBottom: 18 }}>{cms('home.hero.eyebrow', 'Bespoke furniture · Kingdom of Bahrain')}</div>
          <h1 className="display rv-words" style={{ color: '#fff', fontSize: mobile ? 'clamp(42px,12.5vw,60px)' : 'clamp(64px,7.2vw,112px)', maxWidth: 1040, marginBottom: 24 }}>
            {HWORDS.map((w, i) => <span key={i} className="w" style={{ transitionDelay: (.12 + i * .11) + 's', marginRight: '.26em' }}>{w}</span>)}
          </h1>
          <p className="rv" style={{ '--d': '.5s', color: 'rgba(255,255,255,.84)', fontSize: mobile ? 17 : 21, fontWeight: 300, lineHeight: 1.6, maxWidth: 540, marginBottom: 34 }}>
            {cms('home.hero.subtitle', 'Walk-in closets, kitchens and storage — handcrafted in our own Bahrain workshop and designed around the way you live.')}
          </p>
          <div className="rv" style={{ '--d': '.66s', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn-clay" onClick={() => setPage('planner')} style={{ fontSize: 16, padding: '16px 30px' }}>{cms('home.hero.cta', 'Design yours →')}</button>
            <button type="button" onClick={() => setPage('products')} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.45)', borderRadius: 14, padding: '15px 28px', fontSize: 16, fontWeight: 500, cursor: 'pointer', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', minHeight: 50 }}>{cms('home.hero.cta2', 'View collection')}</button>
          </div>
        </div>
        {!mobile && HERO_SLIDES.length > 1 && (
          <div style={{ position: 'absolute', bottom: 34, right: 48, zIndex: 2, display: 'flex', gap: 10 }}>
            {HERO_SLIDES.map((src, i) => (
              <button key={i} type="button" onClick={() => { setWarm(true); setSlideIdx(i); }} aria-label={'Show hero image ' + (i + 1)}
                style={{ width: i === slideIdx ? 60 : 46, height: 46, borderRadius: 12, border: i === slideIdx ? '2px solid #fff' : '2px solid rgba(255,255,255,.4)', background: (i === 0 || warm) ? `url('${src}') center/cover, #2a221c` : '#2a221c', cursor: 'pointer', padding: 0, transition: 'width .4s cubic-bezier(.22,1,.36,1), border-color .3s', boxShadow: '0 10px 24px -10px rgba(0,0,0,.6)' }} />
            ))}
          </div>
        )}
        {!mobile && <div className="scroll-cue" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }} />}
      </section>
    </>
  );
}

function prefersReducedMotionNow() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

/* ── CART DRAWER ── */
function CartDrawer({ cart, setCart, open, setOpen, setPage }) {
  const total = computeTotal(cart);
  const mobile = useMobile();
  const { t, lang } = useI18n();
  const panelRef = useRef(null);
  useDialog(panelRef, { open, onClose: () => setOpen(false) });   // [A11Y] real modal: focus trap, Esc, focus return, scroll lock
  return (
    <>
      <div aria-hidden="true" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', transition: 'opacity .3s', backdropFilter: 'blur(4px)' }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="cart-title" tabIndex={-1} inert={!open} aria-hidden={!open} style={mobile ? { outline: 'none', position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 1001, transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .4s cubic-bezier(.25,.46,.45,.94)', display: 'flex', flexDirection: 'column', maxHeight: '90svh', borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom)' }
        : { outline: 'none', position: 'fixed', right: 0, top: 0, bottom: 0, width: 400, background: '#fff', zIndex: 1001, transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .35s cubic-bezier(.25,.46,.45,.94)', display: 'flex', flexDirection: 'column' }}>
        {mobile && <div style={{ width: 36, height: 4, background: 'var(--shop-line, #e6e6e6)', borderRadius: 2, margin: '12px auto 0' }} />}
        <div style={{ padding: mobile ? '16px 20px' : '22px 26px', borderBottom: '1px solid var(--shop-fill, #f5f5f7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div id="cart-title" role="heading" aria-level={2} style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>{t('cart')} {cart.length > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--shop-muted, #86868b)' }}>({cart.length})</span>}</div>
          <button type="button" aria-label={t('closeCart')} className="hit44" onClick={() => setOpen(false)} style={{ background: 'var(--shop-fill, #f5f5f7)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'var(--shop-muted, #86868b)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: mobile ? '16px 20px' : '20px 26px', WebkitOverflowScrolling: 'touch' }}>
          {cart.length === 0
            ? <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 48, opacity: .15, marginBottom: 12 }}>◻</div>
                <div style={{ fontSize: 15, color: 'var(--shop-muted, #86868b)', marginBottom: 18 }}>{t('sw3CartEmpty')}</div>
                {/* Same trap as Checkout: setOpen(false) runs navigate(-1), which would
                    cancel the navigation. Navigating away closes the drawer by itself. */}
                <button type="button" className="btn-secondary" style={{ borderRadius: 980 }} onClick={() => setPage('products')}>{t('browseCollection')}</button>
              </div>
            : cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--shop-fill, #f5f5f7)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--shop-fill, #f5f5f7)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image_url ? <img src={item.image_url} alt={safeStr(item.name || item.product_name, 'Cart item')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22, opacity: .3 }}>◻</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--shop-ink, #1d1d1f)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeStr(item.name)}</div>
                    <div style={{ fontSize: 12, color: 'var(--shop-muted, #86868b)', marginBottom: 4 }}>{safeStr(item.category)}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--shop-ink, #1d1d1f)' }}>{fmt(item.price)}</div>
                  </div>
                  <button type="button" aria-label={(lang === 'ar' ? 'إزالة ' : 'Remove ') + safeStr(item.name, 'item')} className="hit44" onClick={() => setCart(c => c.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--shop-muted, #86868b)', padding: '4px', alignSelf: 'flex-start', fontSize: 16 }}>✕</button>
                </div>
              ))
          }
        </div>
        {cart.length > 0 && (
          <div style={{ padding: mobile ? '16px 20px 24px' : '18px 26px', borderTop: '1px solid var(--shop-fill, #f5f5f7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 16, color: 'var(--shop-ink-2, #6e6e73)' }}>{t('total')}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--shop-ink, #1d1d1f)' }}>{fmt(total)}</span>
            </div>
            {/* Do NOT call setOpen(false) here.
                The cart drawer is backed by a history entry (?cart=1), so closing it
                runs navigate(-1) — a real history back. Calling it alongside
                setPage('checkout') pushed /checkout and then immediately went back,
                landing the customer on the shop again. The Checkout button appeared dead.

                Navigating away closes the cart on its own: cartOpen is derived from
                ?cart=1, and that param is gone the moment we leave the page. */}
            <button type="button" className="btn" style={{ width: '100%', borderRadius: 16 }} onClick={() => setPage('checkout')}>Checkout</button>
            <div style={{ fontSize: 12, color: 'var(--shop-muted, #86868b)', textAlign: 'center', marginTop: 10 }}>{t('sw3FreeDelivery')}</div>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ k, v, sub }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding: sub?'4px 0 4px 10px':'8px 0', borderBottom: sub?'none':'1px solid var(--shop-line, #e6e6e6)' }}>
      <span style={{ fontSize: sub?12:13, color: sub?'var(--shop-muted, #86868b)':'#1d1d1f' }}>{k}</span>
      <span style={{ fontSize: sub?12:13, fontWeight: sub?400:500 }}>{v}</span>
    </div>
  );
}

/* ── AUTH ── */
function AuthModal({ mode, setMode, setUser, onClose, prefill }) {
  const [form, setForm] = useState({ name: prefill?.name||'', email: prefill?.email||'', password:'', phone: prefill?.phone||'' });
  const [loading, setLoading] = useState(false);
  const [rstep, setRstep] = useState('request');
  const [rotp, setRotp] = useState('');
  const [rnew, setRnew] = useState('');
  const [errs, setErrs] = useState({});          // [FORMS] per-field validation errors (announced + linked via aria-describedby)
  const [formErr, setFormErr] = useState('');
  const [hp, setHp] = useState('');              // honeypot
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const focusFirstErr = (first) => { setTimeout(() => { const el = document.getElementById('auth-' + first); if (el) el.focus(); }, 0); };
  const submit = async () => {
    setFormErr('');
    if (isBot(hp)) { onClose(); return; }     // bots fill the hidden field: pretend, send nothing
    const schema = mode==='login'
      ? { email:{ type:'email', required:true }, password:{ type:'text', required:true, max:200 } }
      : { name:{ type:'name', required:true }, email:{ type:'email', required:true }, phone:{ type:'phone' }, password:{ type:'text', required:true, max:200 } };
    const v = validateForm(form, schema, lang);
    setErrs(v.errors);
    if (!v.ok) { setFormErr(vmsg('fix', lang)); focusFirstErr(v.first); return; }
    if (!navigator.onLine) { setFormErr(vmsg('offline', lang)); return; }
    setLoading(true);
    // Secure server-side auth (bcrypt) — passwords never handled or read by the browser. All calls go through src/account/api.js.
    try {
      const email = v.clean.email.toLowerCase();
      const u = mode==='login'
        ? await acct.login(email, form.password)
        : await acct.register({ email, password: form.password, name: v.clean.name, phone: v.clean.phone || null });
      if (!u || !u.id) throw new Error('Unexpected response');
      setUser(acct.persistUser(u));   // minimal profile only
      // New account → ensure a CUS Customer ID by phone + capture any referral (?ref).
      if (mode !== 'login' && v.clean.phone) {
        try {
          const ref = new URLSearchParams(window.location.search).get('ref');
          acct.referralSignup(v.clean.name, v.clean.phone, ref).catch(()=>{});
        } catch (_) {}
      }
      toast(mode==='login'?t('w4AuthWelcomeToast'):t('w4AuthAccountCreated'), 'success'); onClose();
    } catch (e) {
      // never print raw server text; bad credentials get the product message, everything else the shared bilingual taxonomy
      const k = errMsg(e).kind;
      setFormErr(k==='network' ? errMsg(e).text : (k==='unknown'||k==='validation'||k==='auth'||k==='permission'||k==='notfound') ? t('w4AuthCouldNotSignIn') : errMsg(e).text);
    } finally { setLoading(false); }
  };
  const reqReset = async (channel) => {
    if (!form.email) { toast(t('w4AuthEnterEmail'), 'error'); return; }
    setLoading(true);
    try {
      await acct.requestReset(form.email, channel);
      setRstep(channel==='otp'?'otp':'emailsent');
      toast(channel==='otp'?t('w4AuthCodeSent'):t('w4AuthLinkSent'), 'success');
    } catch (e) { toast(e.message || t('w4AuthCouldNotReset'), 'error'); } finally { setLoading(false); }
  };
  const doResetOtp = async () => {
    if (!(/[a-z]/.test(rnew)&&/[A-Z]/.test(rnew)&&/[0-9]/.test(rnew)&&/[^A-Za-z0-9]/.test(rnew)&&(rnew||'').length>=8)) { toast(t('w4AuthPwMin'), 'error'); return; }
    setLoading(true);
    try {
      const r = await acct.resetWithOtp(form.email, rotp, rnew);
      if (r && r.ok) { toast(t('w4AuthPwUpdated'), 'success'); setMode('login'); setRstep('request'); setRotp(''); setRnew(''); }
      else throw new Error(t('w4AuthBadCode'));
    } catch (e) { toast(e.message || t('w4AuthBadCode'), 'error'); } finally { setLoading(false); }
  };
  return (
    <>
      <div aria-hidden="true" onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:2000, backdropFilter:'blur(8px)', animation:'fadeIn .2s ease' }} />
      <ModalPanel labelledBy="auth-title" onClose={onClose} style={mobile ? { position:'fixed', left:0, right:0, bottom:0, background:'#fff', zIndex:2001, borderRadius:'24px 24px 0 0', padding:'28px 20px 36px', animation:'slideUp .3s ease', paddingBottom:'calc(36px + env(safe-area-inset-bottom))', maxHeight:'92svh', overflowY:'auto', WebkitOverflowScrolling:'touch' }
        : { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(390px,95vw)', maxHeight:'90svh', overflowY:'auto', background:'#fff', borderRadius:24, padding:'44px 40px', zIndex:2001, animation:'fadeUp .3s ease', boxShadow:'0 24px 64px rgba(0,0,0,.15)' }}>
        {mobile && <div style={{ width:36, height:4, background:'var(--shop-line, #e6e6e6)', borderRadius:2, margin:'-12px auto 20px' }} />}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(168,75,41,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:22 }}>◼</div>
          <h2 id="auth-title" style={{ fontSize:22, fontWeight:700, color:'var(--shop-ink, #1d1d1f)', letterSpacing:'-.02em', marginBottom:5 }}>{mode==='reset'?t('w4AuthReset'):mode==='login'?t('w4AuthWelcome'):t('w4AuthCreate')}</h2>
          <div style={{ fontSize:14, color:'var(--shop-muted, #86868b)' }}>{mode==='reset'?t('w4AuthResetSub'):mode==='login'?t('w4AuthLoginSub'):t('w4AuthRegisterSub')}</div>
        </div>
        {mode!=='reset' && (<form noValidate onSubmit={e=>{ e.preventDefault(); submit(); }} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {mode==='register'&&<Field id="auth-name" className="inp" label={t('w4AuthFullName')} required error={errs.name} placeholder={t('w4AuthFullName')} autoComplete="name" maxLength={120} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />}
          <Field id="auth-email" className="inp" label={t('email')} required error={errs.email} placeholder={t("email")} type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} autoCapitalize="none" />
          {mode==='register'&&<Field id="auth-phone" className="inp" label={t('phone')} error={errs.phone} placeholder={t('phone')+' ('+t('w4Optional')+')'} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />}
          <Field id="auth-password" className="inp" label={t('w4AuthPassword')} required error={errs.password} placeholder={t('w4AuthPassword')} type="password" autoComplete={mode==='login' ? 'current-password' : 'new-password'} maxLength={200} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} />
          {mode==='register' && <Honeypot value={hp} onChange={setHp} />}
          {mode==='register' && <FormNotice kind="request" lang={lang} />}
          <div aria-live="polite" role="status">{formErr && <div className="form-banner form-banner--err" role="alert">{formErr}</div>}</div>
          <button type="submit" className="btn" disabled={loading} aria-busy={loading} style={{ borderRadius:14, opacity:loading?.7:1 }}>{loading?t('w4AuthPleaseWait'):mode==='login'?t('w4AuthSignIn'):t('w4AuthCreateBtn')}</button>
        </form>)}
        {mode==='reset' && (<div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input className="inp" placeholder={t("email")} aria-label={t("email")} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} autoCapitalize="none" />
  {rstep==='request' && (<>
            <button type="button" className="btn" onClick={()=>reqReset('email')} disabled={loading} style={{ borderRadius:14 }}>{t('w4AuthEmailLink')}</button>
            <button type="button" onClick={()=>reqReset('otp')} disabled={loading} style={{ borderRadius:14, padding:'12px', background:'#fff', color:'var(--clay)', border:'1px solid var(--clay)', fontWeight:600, cursor:'pointer' }}>{t('w4AuthTextCode')}</button>
          </>)}
          {rstep==='emailsent' && (<div style={{ fontSize:13, color:'var(--shop-muted, #86868b)', textAlign:'center' }}>{t('w4AuthCheckEmail')}</div>)}
          {rstep==='otp' && (<>
            <input className="inp" placeholder={t('w4AuthCode6')} aria-label={t('w4AuthCode6')} inputMode="numeric" value={rotp} onChange={e=>setRotp(e.target.value)} />
            <input className="inp" placeholder={t('w4AuthNewPassword')} aria-label={t('w4AuthNewPassword')} type="password" value={rnew} onChange={e=>setRnew(e.target.value)} />
            {rnew.length>0 && (()=>{
              const c={ case:/[a-z]/.test(rnew)&&/[A-Z]/.test(rnew), number:/[0-9]/.test(rnew), special:/[^A-Za-z0-9]/.test(rnew), length:rnew.length>=8 };
              const met=[c.case,c.number,c.special,c.length].filter(Boolean).length;
              const label=met>=4?'Strong':met===3?'Good':met===2?'Fair':'Weak';
              const color=met>=4?'#22c55e':met===3?'#84cc16':met===2?'#f59e0b':'#ef4444';
              const R=[['case','Lowercase & uppercase letters'],['number','At least one number (0–9)'],['special','One special character (!@#$%^&*)'],['length','At least 8 characters']];
              return (<div style={{ marginTop:8, padding:'10px 12px', borderRadius:12, background:'rgba(0,0,0,.04)', border:'1px solid rgba(0,0,0,.08)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, marginBottom:6 }}><span style={{ color:'#6b7280' }}>Password strength</span><span style={{ fontWeight:700, color }}>{label}</span></div>
                <div style={{ height:6, borderRadius:6, background:'#e5e7eb', overflow:'hidden', marginBottom:8 }}><div style={{ height:'100%', width:(met*25)+'%', background:color, transition:'width .2s' }}/></div>
                {R.map(([k,l])=>(<div key={k} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, marginTop:4 }}><span style={{ width:18, height:18, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background:c[k]?'#22c55e':'#e5e7eb', color:c[k]?'#fff':'#9ca3af' }}>{c[k]?'✓':''}</span><span style={{ color:c[k]?'#111827':'#6b7280' }}>{l}</span></div>))}
              </div>);
            })()}
            <button type="button" className="btn" onClick={doResetOtp} disabled={loading} style={{ borderRadius:14 }}>{t('w4AuthSetNew')}</button>
          </>)}
        </div>)}
        <div style={{ textAlign:'center', marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
          {mode!=='reset' && <button type="button" onClick={()=>setMode(mode==='login'?'register':'login')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--clay)', fontWeight:500 }}>{mode==='login'?t('w4AuthRegisterLink'):t('w4AuthLoginLink')}</button>}
          {mode==='login' && <button type="button" onClick={()=>{ setRstep('request'); setMode('reset'); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--shop-muted, #86868b)', fontWeight:500 }}>{t('w4AuthForgot')}</button>}
          {mode==='reset' && <button type="button" onClick={()=>{ setMode('login'); setRstep('request'); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--shop-muted, #86868b)', fontWeight:500 }}>{t('w4AuthBackToSignIn')}</button>}
        </div>
        {!mobile && <button type="button" aria-label={lang==='ar' ? 'إغلاق' : 'Close'} className="hit44" onClick={onClose} style={{ position:'absolute', top:14, right:16, background:'var(--shop-fill, #f5f5f7)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'var(--shop-muted, #86868b)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>}
      </ModalPanel>
    </>
  );
}

/* ── HOME PAGE ── */
function HomeAIOffers({ setPage, mobile, P }) {
  const { t } = useI18n();
  const [offers, setOffers] = useState([]);
  useEffect(() => { api('store_offers?active=eq.true&order=sort_order.asc&limit=3').then(d => { if (Array.isArray(d)) setOffers(sanitizeRows(d)); }).catch(()=>{}); }, []);
  return (<>
    <section style={{ padding:`0 ${P}`, maxWidth:1200, margin:'28px auto 0' }}>
      <div className="reveal" style={{ background:'linear-gradient(135deg,var(--shop-ink, #1d1d1f),#3a3530)', borderRadius:20, padding: mobile?24:36, color:'#fff', display:'flex', flexWrap:'wrap', gap:16, alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ maxWidth:580 }}>
          <div style={{ fontSize:12, letterSpacing:'.15em', textTransform:'uppercase', color:'#F9A35C' }}>{t('sw3AiOffersBadge')}</div>
          <div style={{ fontSize: mobile?22:30, fontWeight:700, margin:'8px 0', lineHeight:1.15 }}>{t('sw3AiOffersTitle')}</div>
          <div style={{ fontSize:14, color:'#c9c7c3' }}>{t('sw3AiOffersSub')}</div>
        </div>
        <button type="button" onClick={()=>setPage('ai')} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:980, padding:'13px 26px', fontSize:15, fontWeight:600, cursor:'pointer' }}>{t('sw3AiOffersTry')}</button>
      </div>
    </section>
    {offers.length>0 && (
      <section style={{ padding:`28px ${P} 0`, maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:12 }}>
          {offers.map(o=>(<button type="button" key={o.id} onClick={()=>setPage('offers')} className="reveal" style={{ textAlign:'left', background:'var(--sand)', border:'1px solid var(--clay)22', borderRadius:16, padding:'16px 18px', cursor:'pointer' }}>
            {o.badge && <span style={{ fontSize:11, fontWeight:700, color:'var(--clay)' }}>{o.badge}</span>}
            <div style={{ fontSize:15, fontWeight:700, color:'var(--shop-ink, #1d1d1f)', marginTop:4 }}>{o.title}</div>
            <div style={{ fontSize:13, color:'var(--shop-muted, #86868b)', marginTop:3 }}>{o.subtitle}</div>
          </button>))}
        </div>
      </section>
    )}
  </>);
}
/* ── PREMIUM 3D DIGITAL-CARD CAROUSEL ──
   Ported faithfully from the supplied Tailwind v4 + TSX source.
   All TypeScript types stripped; every Tailwind class converted to inline styles.
   The 3D math (progress rAF loop, mouse damping/inertia, smoothstep, perspective,
   thickness layers, offset wrapping, transforms) is reproduced verbatim. */
const CARD_VIDEOS = [
  'https://videos.pexels.com/video-files/3129671/3129671-uhd_3840_2160_30fps.mp4',
  'https://videos.pexels.com/video-files/2098988/2098988-hd_1920_1080_30fps.mp4',
  'https://videos.pexels.com/video-files/3045163/3045163-uhd_3840_2160_25fps.mp4',
  'https://videos.pexels.com/video-files/4990234/4990234-uhd_3840_2160_30fps.mp4',
  'https://videos.pexels.com/video-files/5752729/5752729-uhd_3840_2160_30fps.mp4',
  'https://videos.pexels.com/video-files/2611250/2611250-uhd_3840_2160_30fps.mp4',
  'https://videos.pexels.com/video-files/3209828/3209828-uhd_3840_2160_25fps.mp4',
];
const CARD_COLORS = ['#1a1a1a', '#0f1c2e', '#2e0f1c', '#1c2e0f', '#2e1c0f', '#0f2e2e', '#1c0f2e', '#2e0f0f', '#0f2e0f'];
const CARD_DETAILS = [
  { name: 'ALEX MORGAN', number: '4829 1573 9024 6618', cvv: '284' },
  { name: 'JORDAN CHASE', number: '5392 8841 2076 5530', cvv: '917' },
  { name: 'TAYLOR REID', number: '3714 4963 5398 4312', cvv: '435' },
  { name: 'CASEY BLAKE', number: '6011 2748 9163 0027', cvv: '628' },
  { name: 'RILEY STONE', number: '4127 6630 8845 1192', cvv: '751' },
];

function HomePage({ user, products, testimonials, banners, siteLogo, setPage, addToCart, setConfigProduct }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const ikh = useIkhLanding();
  useReveal();
  useHomeFx();
  const P = mobile ? '24px' : '48px';
  const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  const activeProducts = products.filter(p => p.active !== false);
  // Featured ranges — prefer badged products, then fill to 6 by sort order.
  const featuredRanges = [...activeProducts].sort((a,b)=> (b.badge?1:0)-(a.badge?1:0)).slice(0, mobile ? 4 : 6);

  // i. Offers strip — from store_offers (with customer_offers fallback).
  const [offers, setOffers] = useState([]);
  // i(stories). Customer stories — from website_projects.
  const [projects, setProjects] = useState([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    api('store_offers?active=eq.true&order=sort_order.asc&limit=3').then(d => {
      if (Array.isArray(d) && d.length) { setOffers(sanitizeRows(d)); return; }
      api('customer_offers?active=eq.true&order=sort_order.asc&limit=3').then(c => { if (Array.isArray(c)) setOffers(sanitizeRows(c)); }).catch(()=>{});
    }).catch(()=>{});
    api('website_projects?active=eq.true&order=sort_order.asc&limit=6').then(d => { if (Array.isArray(d)) setProjects(sanitizeProjects(d)); }).catch(()=>{});
  }, []);
  const nlSub = useSubmit(); const [nlErr, setNlErr] = useState(''); const [nlHp, setNlHp] = useState('');
  const subscribe = async () => {
    setNlErr('');
    if (isBot(nlHp)) { setSubscribed(true); return; }
    const v = validateForm({ email }, { email: { type:'email', required:true } }, lang);
    if (!v.ok) { setNlErr(v.errors.email); toast(t('swNlInvalid'), 'error'); return; }
    // Goes through the audited, rate-limited public_lead_submit RPC (not a raw table insert). Success is shown ONLY once the server confirmed it.
    const res = await nlSub.run((signal) => api('rpc/public_lead_submit', { method:'POST', signal, body: { p_name:'Newsletter subscriber', p_phone:null, p_email:v.clean.email, p_source:'Website newsletter', p_interest:'Newsletter', p_message:null, p_meta:{ type:'newsletter' } } }));
    if (res.ok) { setSubscribed(true); setEmail(''); toast(t('swNlWelcome'), 'success'); }
    else if (res.offline) setNlErr(vmsg('offline', lang));
    else if (!res.skipped) setNlErr(vmsg('failed', lang));
  };

  // c. Free appointment options.
  const appointments = [
    [t('swApptMeasure'), t('swApptMeasureSub'), '📏'],
    [t('swApptShowroom'), t('swApptShowroomSub'), '🏬'],
    [t('swApptHome'), t('swApptHomeSub'), '🏡'],
    [t('swApptOnline'), t('swApptOnlineSub'), '💻'],
  ];
  // d. Room types — managed from Bonsai Hub (website_room_cards table), with a built-in fallback.
  const [roomCards, setRoomCards] = useState(null);
  useEffect(() => { let alive = true;
    api('website_room_cards?active=eq.true&deleted_at=is.null&order=sort_order.asc')
      .then(d => { if (alive && Array.isArray(d) && d.length) setRoomCards(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const roomsFallback = [
    [t('swRoomWardrobes'), t('swRoomWardrobesSub'), HERO_IMG.wardrobe, 'wardrobes'],
    [t('swRoomKitchens'), t('swRoomKitchensSub'), HERO_IMG.kitchen, 'kitchen'],
    [t('swRoomOffice'), t('swRoomOfficeSub'), HERO_IMG.office, 'office'],
    [t('swRoomDoors'), t('swRoomDoorsSub'), HERO_IMG.door2, 'doors'],
    [t('swRoomTv'), t('swRoomTvSub'), HERO_IMG.tv, 'tv'],
  ];
  const rooms = (roomCards && roomCards.length)
    ? roomCards.map(rc => [ (lang === 'ar' ? (rc.title_ar || rc.title_en) : rc.title_en), (lang === 'ar' ? (rc.sub_ar || rc.sub_en) : rc.sub_en), rc.image_url, rc.route ])
    : roomsFallback;
  // e. Style quick-links.
  const styleLinks = [
    [t('swStyleWalkin'), 'wardrobes'], [t('swStyleSliding'), 'wardrobes'], [t('swStyleShaker'), 'kitchen'],
    [t('swStyleHandleless'), 'kitchen'], [t('swRoomTv'), 'tv'], [t('swRoomOffice'), 'office'],
  ];
  const steps = [
    ['01', t('swStep1Title'), t('swStep1Desc')],
    ['02', t('swStep2Title'), t('swStep2Desc')],
    ['03', t('swStep3Title'), t('swStep3Desc')],
    ['04', t('swStep4Title'), t('swStep4Desc')],
  ];
  const finishDots = ['#5a3b26', '#caa472', '#e9e3d8', '#2b2b2b'];
  const marqueeItems = [t('swMarqWorkshop'), t('swMarqConsult'), t('swMarqHardware'), t('swMarq15'), t('swMarq4'), t('swMarq2yr'), t('swMarqInstall')];
  return (
    <div style={{ background: 'var(--cream)' }}>
      <div id="scrollProgress" />
      <SectionBoundary name="home:hero" silent><Hero setPage={setPage} banners={banners} /></SectionBoundary>
      {/* [IKHTARHA 2026-11-09] live reward campaign — shows only while the campaign is live */}
      <IkhtarhaSpotlight cfg={ikh} lang={lang} mobile={mobile} cms={cms} setPage={setPage} />
      <IkhtarhaGames cfg={ikh} lang={lang} cms={cms} />{/* [HOME-GAMES 2026-11-10] «العب الآن» poster for the Games Hub */}
      <IkhtarhaDesigns cfg={ikh} lang={lang} cms={cms} setPage={setPage} />
      {/* [HOME 2026-11-09] walk into the showroom */}
      <ShowroomTour lang={lang} setPage={setPage} img={{ walkin: cms('home.tour.walkin', TOUR_IMG.walkin), kitchen: cms('home.tour.kitchen', TOUR_IMG.kitchen), living: cms('home.tour.living', TOUR_IMG.living), wardrobe: cms('home.tour.wardrobe', TOUR_IMG.wardrobe), door: cms('home.tour.door', TOUR_IMG.door) }} fallback={{ walkin: HOME_IMG.walkin, kitchen: HOME_IMG.kitchen, living: HOME_IMG.living, wardrobe: HERO_IMG.wardrobe, door: HERO_IMG.door }} />

      {/* Trust marquee */}
      <div className="marquee-wrap" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '18px 0', background: 'var(--cream)' }}>
        <div className="marquee">
          {[0, 1].flatMap(k => marqueeItems.map((s, idx) => (
            <span key={k + '-' + idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 56, color: 'var(--ink-soft)', fontSize: 14, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{s}<span style={{ color: 'var(--clay)' }}>✦</span></span>
          )))}
        </div>
      </div>

      {/* c. Choose a free appointment */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 56 : 88}px ${P} ${mobile ? 8 : 24}px` }}>
        <div className="rv" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{cms('home.appt.eyebrow', 'It starts with a chat')}</div>
          <h2 className="display" style={{ fontSize: mobile ? 28 : 42, color: 'var(--ink)' }}>{cms('home.appt.title', 'Choose a free appointment.')}</h2>
          <p style={{ fontSize: mobile ? 15 : 17, color: 'var(--ink-soft)', lineHeight: 1.7, marginTop: 14 }}>{cms('home.appt.subtitle', 'However you like to plan, there’s no charge and no obligation — just expert ideas for your space.')}</p>
        </div>
        <div className="rv reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: mobile ? 12 : 18 }}>
          {appointments.map(([title, desc, ic], i) => (
            <Link to={navToPath('booking')} key={title} className="lift" style={{ textDecoration: 'none', color: 'inherit', display: 'block', '--d': (i * 0.06) + 's', background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: mobile ? '20px 16px' : '28px 22px', textAlign: 'left', cursor: 'pointer' }}>
              <div aria-hidden="true" style={{ fontSize: 30, marginBottom: 12 }}>{ic}</div>
              <div className="display" style={{ fontSize: mobile ? 17 : 20, color: 'var(--ink)', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 12 }}>{desc}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clay)' }}>{t('swBookFree')}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* d. Choose your room type */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 48 : 72}px ${P}` }}>
        <div className="rv" style={{ marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{cms('home.rooms.eyebrow', 'What are you planning?')}</div>
          <h2 className="display" style={{ fontSize: mobile ? 28 : 44, color: 'var(--ink)' }}>{cms('home.rooms.title', 'Choose your room.')}</h2>
        </div>
        <div className="rv reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: mobile ? 16 : 20 }}>
          {rooms.map(([name, sub, img, route], i) => (
            <Link to={navToPath(route)} key={name} className="tile-zoom lift" style={{ textDecoration: 'none', color: 'inherit', display: 'block', '--d': (i * 0.07) + 's', position: 'relative', border: 'none', padding: 0, borderRadius: 22, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', minHeight: mobile ? 260 : 360, background: '#15110e' }}>
              <Photo src={img} alt={name} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,12,0) 38%, rgba(20,16,12,.86) 100%)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, zIndex: 2 }}>
                <div className="display" style={{ color: '#fff', fontSize: mobile ? 24 : 28 }}>{name}</div>
                <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 14, marginTop: 5 }}>{sub}</div>
                <div style={{ color: '#E7BBA0', fontSize: 13, fontWeight: 600, marginTop: 14, letterSpacing: '.04em' }}>{t('swExplore')}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* e. Designs you'll love — split tiles + style quick-links */}
      <section style={{ background: 'var(--sand)', padding: `${mobile ? 56 : 96}px ${P}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="rv" style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 40px' }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>{cms('home.designs.eyebrow', 'Where to begin')}</div>
            <h2 className="display" style={{ fontSize: mobile ? 28 : 44, color: 'var(--ink)' }}>{cms('home.designs.title', 'Designs you’ll love.')}</h2>
          </div>
          <div className="rv" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: mobile ? 16 : 22, marginBottom: 28 }}>
            {[[t('swRoomWardrobes'), t('swDesignWardrobesDesc'), '/layouts/wardrobe/wardrobe-walkin.jpg', 'wardrobes'], [t('swRoomKitchens'), t('swDesignKitchensDesc'), '/layouts/kitchen/island.jpg', 'kitchen']].map(([name, desc, img, route]) => (
              <Link to={navToPath(route)} key={name} className="tile-zoom lift" style={{ textDecoration: 'none', color: 'inherit', display: 'block', position: 'relative', border: 'none', padding: 0, borderRadius: 24, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', minHeight: mobile ? 300 : 420, background: '#15110e' }}>
                <Photo src={img} alt={name} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,12,.05) 30%, rgba(20,16,12,.85) 100%)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: mobile ? 26 : 34, zIndex: 2 }}>
                  <div className="display" style={{ color: '#fff', fontSize: mobile ? 28 : 36 }}>{name}</div>
                  <div style={{ color: 'rgba(255,255,255,.85)', fontSize: mobile ? 14.5 : 16, marginTop: 8, lineHeight: 1.55, maxWidth: 380 }}>{desc}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 18, background: 'var(--clay)', color: '#fff', borderRadius: 980, padding: '10px 20px', fontSize: 14, fontWeight: 600 }}>{lang==='ar' ? <>← {t('swView')} {name.toLowerCase()}</> : <>{t('swView')} {name.toLowerCase()} →</>}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="rv" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {styleLinks.map(([label, route]) => (
              <Link to={navToPath(route)} key={label} style={{ textDecoration: 'none', display: 'inline-block', background: '#fff', border: '1px solid var(--line)', borderRadius: 980, padding: '9px 18px', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer' }}>{label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* f. Featured ranges — product cards from website_products */}
      {featuredRanges.length > 0 && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 56 : 96}px ${P}` }}>
          <div className="rv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>{t('swFeaturedEyebrow')}</div>
              <h2 className="display" style={{ fontSize: mobile ? 28 : 44, color: 'var(--ink)' }}>{t('swFeaturedTitle')}</h2>
            </div>
            <button type="button" className="btn-line" onClick={() => setPage('products')}>{t('swViewAllArrow')}</button>
          </div>
          <div className="reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 20 }}>
            {featuredRanges.map((p, i) => {
              const hasSave = p.original_price && Number(p.original_price) > Number(p.price);
              return (
                <div key={p.id} className="rv lift" onClick={() => setPage('product-' + p.id)} style={{ '--d': (i * 0.05) + 's', cursor: 'pointer', background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <div className="tile-zoom zoomwrap" style={{ position: 'relative', aspectRatio: mobile ? '1/1' : '4/3' }}>
                    <Photo src={p.image_url || HOME_IMG.wardrobe} alt={p.name} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
                    {p.badge && <span style={{ position: 'absolute', top: 12, left: 12, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 980 }}>{p.badge === 'Featured' ? t('cardFeatured') : p.badge}</span>}
                    {hasSave && <span style={{ position: 'absolute', top: 12, right: 12, background: 'var(--ink)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 980 }}>{t('swSave')} {fmt(Number(p.original_price) - Number(p.price))}</span>}
                  </div>
                  <div style={{ padding: mobile ? 14 : 18 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5 }}>{p.category ? trCat(p.category, lang) : t('swCatBespoke')}</div>
                    <div className="display" style={{ fontSize: mobile ? 15.5 : 18, color: 'var(--ink)', marginBottom: 8, lineHeight: 1.2 }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                      {finishDots.map((c, j) => <span key={j} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,.1)' }} />)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t('swFrom')}</span>
                      <span style={{ fontSize: mobile ? 16 : 18, fontWeight: 700, color: 'var(--ink)' }}>{fmt(p.price)}</span>
                      {hasSave && <span style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'line-through' }}>{fmt(p.original_price)}</span>}
                    </div>
                    <span style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--clay)' }}>{t('swViewArrow')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* g. Why The Closets / value strip + animated counters */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: `${mobile ? 48 : 80}px ${P}` }}>
        <div className="rv" style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 56px' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>{cms('home.why.eyebrow', 'Why The Closets')}</div>
          <h2 className="display" style={{ fontSize: mobile ? 30 : 46, color: 'var(--ink)' }}>{cms('home.why.title', 'A workshop, not a warehouse.')}</h2>
          <p style={{ fontSize: mobile ? 16 : 18, color: 'var(--ink-soft)', lineHeight: 1.7, marginTop: 18 }}>{cms('home.why.subtitle', 'Everything we make is designed, built and installed by our own people in Bahrain — so the piece you imagine is the piece you live with.')}</p>
        </div>
        <div className="rv" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: mobile ? 28 : 20 }}>
          <Stat to={10} suffix="K+" label={t('swStatProjects')} />
          <Stat to={19} suffix={t('swStatYrs')} label={t('swStatCraft')} />
          <Stat to={4} label={t('swStatShowrooms')} />
          <Stat to={100} suffix="%" label={t('swStatBespoke')} />
        </div>
        <div className="rv" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginTop: 44 }}>
          {[['🏭', t('swBadgeWorkshop')], ['🛠️', t('swBadge15')], ['🛡️', t('swBadge2yr')], ['🎁', t('swBadgeFreeDesign')]].map(([ic, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
              <span style={{ fontSize: 20 }}>{ic}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Process timeline */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--ink)', color: '#fff', padding: `${mobile ? 64 : 110}px ${P}` }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .05, mixBlendMode: 'overlay', backgroundImage: NOISE }} />
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto' }}>
          <div className="rv" style={{ maxWidth: 560, marginBottom: 56 }}>
            <div className="eyebrow" style={{ color: '#E7BBA0', marginBottom: 14 }}>{t('swHowEyebrow')}</div>
            <h2 className="display" style={{ fontSize: mobile ? 30 : 48 }}>{t('swHowTitle')}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(4,1fr)', gap: mobile ? 28 : 24 }}>
            {steps.map(([n, title, desc], i) => (
              <div key={n} className="rv" style={{ '--d': (i * 0.1) + 's', borderTop: '1px solid rgba(255,255,255,.18)', paddingTop: 22 }}>
                <div className="display" style={{ fontSize: 34, color: '#E7BBA0' }}>{n}</div>
                <div style={{ fontSize: 18, fontWeight: 600, margin: '10px 0 8px' }}>{title}</div>
                <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,.65)', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* [IKHTARHA 2026-11-09] The Closets for Business */}
      <BusinessBand lang={lang} mobile={mobile} cms={cms} setPage={setPage} live={!!ikh} />

      {/* AI designer band — editorial hero banner (safe-zone text left, photo right, single CTA) */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 56 : 100}px ${P}` }}>
        <div className="rv-sc" style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', background: '#15110e', display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.05fr .95fr', alignItems: 'stretch', minHeight: mobile ? 'auto' : 440 }}>
          {mobile && <Photo src={HOME_IMG.living} alt="" par=".06" style={{ position: 'absolute', inset: 0, opacity: .32, zIndex: 0 }} />}
          {mobile && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,12,.55), rgba(20,16,12,.92))', zIndex: 1 }} />}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .06, mixBlendMode: 'overlay', backgroundImage: NOISE, zIndex: 1 }} />
          <div style={{ position: 'relative', zIndex: 2, padding: mobile ? '40px 26px 44px' : '64px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="floaty" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', background: 'rgba(231,187,160,.14)', border: '1px solid rgba(231,187,160,.3)', color: '#E7BBA0', fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 980, marginBottom: 18 }}>✦ {cms('home.ai.badge', t('swAiBadge'))}</span>
            <h2 className="display" style={{ color: '#fff', fontSize: mobile ? 30 : 46, lineHeight: 1.05, letterSpacing: '-.02em', marginBottom: 16 }}>{cms('home.ai.title1', t('swAiTitle1'))}<br />{cms('home.ai.title2', t('swAiTitle2'))}</h2>
            <p style={{ color: 'rgba(255,255,255,.78)', fontSize: mobile ? 15 : 17, lineHeight: 1.65, marginBottom: 28, maxWidth: 440 }}>{cms('home.ai.desc', t('swAiDesc'))}</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn-clay" onClick={() => setPage('ai')} style={{ fontSize: 15, padding: '14px 26px' }}>{cms('home.ai.cta', t('swAiTry'))}</button>
              <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>{t('swAiFree')}</span>
            </div>
          </div>
          {!mobile && (
            <div style={{ position: 'relative', minHeight: 440 }}>
              <Photo src={HOME_IMG.living} alt={t('swAiLivingAlt')} style={{ position: 'absolute', inset: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #15110e 0%, rgba(21,17,14,.25) 24%, rgba(21,17,14,0) 52%)' }} />
              <span style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(20,16,12,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: 980, border: '1px solid rgba(255,255,255,.2)' }}>{t('swAiAfter')}</span>
            </div>
          )}
        </div>
      </section>

      {/* h. Offers strip — from store_offers / customer_offers */}
      {offers.length > 0 && (
<SectionBoundary name="home:offers" silent>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 48 : 80}px ${P}` }}>
          <div className="rv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>{t('swOffersEyebrow')}</div>
              <h2 className="display" style={{ fontSize: mobile ? 28 : 42, color: 'var(--ink)' }}>{t('swOffersTitle')}</h2>
            </div>
            <button type="button" className="btn-line" onClick={() => setPage('offers')}>{t('swSeeAllOffers')}</button>
          </div>
          <div className="rv" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(' + Math.min(offers.length, 3) + ',1fr)', gap: mobile ? 14 : 20 }}>
            {offers.slice(0, 3).map(o => (
              <button type="button" key={o.id} className="lift" onClick={() => setPage('offers')} style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line)', borderRadius: 18, cursor: 'pointer', textAlign: 'left', padding: 0, minHeight: 180, background: o.image_url ? '#15110e' : 'linear-gradient(135deg, var(--sand), #fff)' }}>
                {o.image_url && <><Photo src={o.image_url} alt={o.title} style={{ position: 'absolute', inset: 0 }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,12,.15), rgba(20,16,12,.82))' }} /></>}
                <div style={{ position: 'relative', zIndex: 2, padding: 24, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', minHeight: 180 }}>
                  {o.badge && <span style={{ alignSelf: 'flex-start', background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 980, marginBottom: 10 }}>{trMap(o.badge, OFFER_BADGE_KEY, lang)}</span>}
                  <div className="display" style={{ fontSize: 22, color: o.image_url ? '#fff' : 'var(--ink)' }}>{trMap(o.title, OFFER_TITLE_KEY, lang)}</div>
                  <div style={{ fontSize: 14, color: o.image_url ? 'rgba(255,255,255,.85)' : 'var(--ink-soft)', marginTop: 6, lineHeight: 1.5 }}>{trMap(o.subtitle, OFFER_SUB_KEY, lang)}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: o.image_url ? '#E7BBA0' : 'var(--clay)', marginTop: 14 }}>{t('swClaimOffer')}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </SectionBoundary>
)}

      {/* i. Customer stories — gallery from website_projects */}
      {projects.length > 0 && (
<SectionBoundary name="home:projects" silent>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 48 : 80}px ${P}` }}>
          <div className="rv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>{t('swStoriesEyebrow')}</div>
              <h2 className="display" style={{ fontSize: mobile ? 28 : 44, color: 'var(--ink)' }}>{t('swStoriesTitle')}</h2>
            </div>
            <button type="button" className="btn-line" onClick={() => setPage('projects')}>{t('swViewGallery')}</button>
          </div>
          <div className="rv reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 10 : 16 }}>
            {projects.slice(0, 6).map((pr, i) => (
              <button type="button" key={pr.id} className="tile-zoom lift" onClick={() => setPage('projects')} style={{ '--d': (i * 0.05) + 's', position: 'relative', border: 'none', padding: 0, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', aspectRatio: '4/3', background: '#15110e' }}>
                <Photo src={pr.cover_url || pr.after_url || HOME_IMG.walkin} alt={pr.name} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,12,0) 45%, rgba(20,16,12,.82) 100%)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: mobile ? 12 : 16, zIndex: 2 }}>
                  <div className="display" style={{ color: '#fff', fontSize: mobile ? 14 : 17 }}>{pr.name}</div>
                  {pr.location && <div style={{ color: 'rgba(255,255,255,.78)', fontSize: 12, marginTop: 3 }}>{pr.location}</div>}
                </div>
              </button>
            ))}
          </div>
        </section>
      </SectionBoundary>
)}

      {/* Testimonials carousel */}
      {testimonials.length > 0 && (
        <section style={{ background: 'var(--sand)', padding: `${mobile ? 64 : 104}px ${P}` }}>
          <div className="rv" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>{t('swTestiEyebrow')}</div>
            <h2 className="display" style={{ fontSize: mobile ? 28 : 42, color: 'var(--ink)' }}>{t('swTestiTitle')}</h2>
          </div>
          <div className="rv"><SectionBoundary name="home:testimonials" silent><TestiCarousel items={testimonials} /></SectionBoundary></div>
        </section>
      )}

      {/* j. How can we help — 3 cards */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 56 : 88}px ${P} ${mobile ? 24 : 40}px` }}>
        <div className="rv" style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 36px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{t('swHelpEyebrow')}</div>
          <h2 className="display" style={{ fontSize: mobile ? 28 : 42, color: 'var(--ink)' }}>{t('swHelpTitle')}</h2>
        </div>
        <div className="rv reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: mobile ? 14 : 20 }}>
          {[[t('swHelpBrowse'), t('swHelpBrowseDesc'), '🛋️', 'products'], [t('swHelpStudio'), t('swHelpStudioDesc'), '✏️', 'planner'], [t('swHelpOffers'), t('swHelpOffersDesc'), '🏷️', 'offers']].map(([title, desc, ic, route], i) => (
            <Link to={navToPath(route)} key={title} className="lift" style={{ textDecoration: 'none', color: 'inherit', display: 'block', '--d': (i * 0.06) + 's', background: '#fff', border: '1px solid var(--line)', borderRadius: 20, padding: mobile ? '24px 20px' : '32px 26px', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontSize: 34, marginBottom: 14 }}>{ic}</div>
              <div className="display" style={{ fontSize: mobile ? 19 : 22, color: 'var(--ink)', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 14 }}>{desc}</div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--clay)' }}>{t('swGo')}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* k. Newsletter signup */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 24 : 40}px ${P} ${mobile ? 48 : 80}px` }}>
        <div className="rv-sc" style={{ background: 'var(--ink)', borderRadius: 26, padding: mobile ? '36px 24px' : '56px 64px', display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.1fr 1fr', gap: mobile ? 24 : 48, alignItems: 'center' }}>
          <div>
            <div className="eyebrow" style={{ color: '#E7BBA0', marginBottom: 14 }}>{t('swNlEyebrow')}</div>
            <h2 className="display" style={{ color: '#fff', fontSize: mobile ? 26 : 38, lineHeight: 1.1 }}>{t('swNlTitle')}</h2>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: mobile ? 14.5 : 16, lineHeight: 1.6, marginTop: 14 }}>{t('swNlDesc')}</p>
          </div>
          <div>
            {subscribed ? (
              <div style={{ background: 'rgba(231,187,160,.14)', border: '1px solid rgba(231,187,160,.3)', borderRadius: 16, padding: '22px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
                <div className="display" style={{ color: '#fff', fontSize: 20 }}>{t('swNlOnList')}</div>
                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, marginTop: 6 }}>{t('swNlThanks')}</div>
              </div>
            ) : (
              <form noValidate onSubmit={e => { e.preventDefault(); subscribe(); }}>
              <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 10 }}>
                <input id="nl-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} aria-invalid={nlErr ? 'true' : undefined} aria-describedby={nlErr ? 'nl-err' : undefined} placeholder={t('swNlPlaceholder')} aria-label={t('swNlAria')} style={{ flex: 1, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 14, padding: '15px 18px', fontSize: 15, color: '#fff', outline: 'none' }} />
                <button type="submit" className="btn-clay" disabled={nlSub.busy} aria-busy={nlSub.busy} style={{ flexShrink: 0 }}>{t('swNlSubscribe')}</button>
              </div>
              <Honeypot value={nlHp} onChange={setNlHp} />
              {nlErr && <div id="nl-err" role="alert" className="form-error" style={{ color: '#ffd3c4' }}>{nlErr}</div>}
              <FormNotice kind="newsletter" lang={lang} style={{ color: 'rgba(255,255,255,.7)', marginTop: 10 }} />
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Cinematic CTA — full-width hero banner */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#15110e' }}>
        <Photo src={HOME_IMG.hero} alt="" par=".08" style={{ position: 'absolute', inset: '-10%', opacity: .42 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 18%, rgba(20,16,12,.35), rgba(20,16,12,.9) 78%)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .07, mixBlendMode: 'overlay', backgroundImage: NOISE }} />
        <div className="rv" style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: `${mobile ? 84 : 140}px ${P}` }}>
          <div className="eyebrow" style={{ color: '#E7BBA0', marginBottom: 18, justifyContent: 'center' }}>{cms('home.cta.eyebrow', 'Start your project')}</div>
          <h2 className="display" style={{ color: '#fff', fontSize: mobile ? 36 : 64, lineHeight: 1.05, letterSpacing: '-.02em', marginBottom: 18 }}>{cms('home.cta.title', 'Let’s design your space.')}</h2>
          <p style={{ color: 'rgba(255,255,255,.82)', fontSize: mobile ? 16 : 19, lineHeight: 1.6, marginBottom: 34, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>{cms('home.cta.subtitle', 'Book a free home consultation — no obligation, just ideas, measured and quoted by our own team.')}</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-clay" onClick={() => setPage('contact')} style={{ fontSize: 16, padding: '16px 32px' }}>{cms('home.cta.button', 'Book a consultation →')}</button>
            <button type="button" onClick={() => setPage('planner')} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.45)', borderRadius: 14, padding: '15px 30px', fontSize: 16, fontWeight: 500, cursor: 'pointer', minHeight: 50, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>{t('swCtaDesignOnline')}</button>
          </div>
          <div style={{ marginTop: 26, color: 'rgba(255,255,255,.55)', fontSize: 13, letterSpacing: '.03em' }}>{t('swCtaTrust')}</div>
        </div>
      </section>

      <CampaignPill cfg={ikh} lang={lang} />
      {mobile && <div style={{ height: 80 }} />}
    </div>
  );
}

const YAS_DISCLAIMER = 'AI impression — confirmed at your free design consultation.';
function SiteFooter({ setPage, siteLogo }) {
  const mobile=useMobile();
  const { t, lang } = useI18n();
  const logo = cms('header.logo', '') || siteLogo;
  const col=(title,items)=>(<div><div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>{title}</div>{items.map(([label,go])=>(<Link to={pageToPath(go)} key={label} style={{ display:'block', color:'var(--ink-soft)', fontSize:14, padding:'6px 0', textAlign:'left', textDecoration:'none' }}>{trLabel(label, lang)}</Link>))}</div>);
  // Only verified profiles are linked. Instagram handle confirmed as @theclosets
  // (business phone 17555095 matches this site). Facebook/Pinterest/YouTube were
  // placeholder links to bare domains — removed until real profile URLs exist.
  const social=[
    ['Instagram','https://www.instagram.com/theclosets/','M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5-2.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z'],
  ];
  return (<footer style={{ borderTop:'1px solid var(--line)', background:'var(--sand)', padding: mobile?'48px 18px 132px':'72px 40px 116px' }}>
    <div style={{ maxWidth:1280, margin:'0 auto' }}>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'2fr 1fr 1fr 1fr 1fr', gap: mobile?28:48 }}>
        <div style={{ gridColumn: mobile?'1 / -1':'auto' }}>
          <div className="display" style={{ fontSize:22, color:'var(--ink)' }}>{cms('footer.brand', 'The Closets Co.')}</div>
          <div style={{ fontSize:14, color:'var(--ink-soft)', marginTop:12, lineHeight:1.65, maxWidth:300 }}>{cms('footer.blurb', t('footBlurb'))}</div>
          <div style={{ display:'flex', gap:14, marginTop:18, flexWrap:'wrap' }}>
            <button type="button" onClick={()=>setPage('booking')} className="btn-clay" style={{ padding:'12px 22px', fontSize:14 }}>{cms('footer.cta.book', t('bookFreeVisit'))}</button>
            <a href="https://wa.me/97317555095" style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#fff', color:'var(--ink)', border:'1px solid var(--line)', borderRadius:980, padding:'11px 18px', fontSize:13.5, fontWeight:600, textDecoration:'none' }}>{cms('footer.cta.whatsapp', t('whatsappUs'))}</a>
            <a href="https://closets-hub.vercel.app/team.html" target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#fff', color:'var(--ink)', border:'1px solid var(--line)', borderRadius:980, padding:'11px 18px', fontSize:13.5, fontWeight:600, textDecoration:'none' }}>{cms('footer.cta.team', t('meetTeam'))}</a>
          </div>
        </div>
        {col(cms('footer.col1.title',t('footHelp')),[['✨ AI YAS','ai-yas'],['How it works','how-it-works'],['FAQ','faq'],['Delivery & install','contact'],['Warranty service','warranty'],['Maintenance','maintenance'],['Reviews','projects'],['Contact us','contact']])}
        {col(cms('footer.col2.title',t('footWaysShop')),[['Book an appointment','booking'],['Request a brochure','contact'],['Finance & payment','booking'],['Find a showroom','showrooms'],['Recommend a friend','contact']])}
        {col(cms('footer.col3.title',t('footAbout')),[['About The Closets','about'],['Why The Closets','about'],['Careers','careers'],['Offers','offers'],['Sitemap','products']])}
        {/* My Closets — account column (parity with Customer Hub) */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>{t('footMyClosets')}</div>
          {[['My account','portal'],['My orders','portal'],['My designs','portal'],['My rewards','portal'],['Track a request','portal'],['Book a visit','booking']].map(([label,go])=>(
            <button type="button" key={label} onClick={()=>setPage(go)} style={{ display:'block', background:'none', border:'none', cursor:'pointer', color:'var(--ink-soft)', fontSize:14, padding:'6px 0', textAlign:'left' }}>{trLabel(label, lang)}</button>
          ))}
          <a href="https://closets-hub.vercel.app/customer.html" target="_blank" rel="noopener" style={{ display:'block', color:'var(--clay)', fontSize:14, fontWeight:600, padding:'8px 0 0', textDecoration:'none' }}>{t('footCustomerHub')} {lang==='ar' ? '←' : '→'}</a>
        </div>
      </div>

      <FooterSitemap lang={lang} />

      {/* Support — external link (Staff login removed from public footer) */}
      <div style={{ display:'flex', gap:18, marginTop:24, flexWrap:'wrap' }}>
        <a href="https://closets-hub.vercel.app/form.html" target="_blank" rel="noopener" style={{ color:'var(--ink-soft)', fontSize:14, textDecoration:'none' }}>{t('footSupport')}</a>
      </div>

      {/* Social row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:40, flexWrap:'wrap' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{cms('footer.social.title', t('footFollow'))}</span>
        {social.map(([name,href,d])=>(
          <a key={name} href={href} aria-label={name} target="_blank" rel="noreferrer" style={{ width:38, height:38, borderRadius:'50%', background:'#fff', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d}/></svg>
          </a>
        ))}
      </div>

      {/* Trust / accreditation badges */}
      <div style={{ display:'flex', gap:10, marginTop:24, flexWrap:'wrap' }}>
        {[t('swFootBadgeWorkshop'),t('swFootBadge2yr'),t('swFootBadgeFreeDesign'),t('swFootBadgeInstall'),t('swFootBadge15')].map(b=>(
          <span key={b} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#fff', border:'1px solid var(--line)', borderRadius:980, padding:'8px 14px', fontSize:12.5, fontWeight:600, color:'var(--ink-soft)' }}><span style={{ color:'var(--clay)' }}>✦</span>{b}</span>
        ))}
      </div>

      {/* Slim glass bar — Option C · translucent one-line footer, clears the floating nav + AI button */}
      <div style={{
        marginTop:40,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexDirection: mobile?'column':'row', gap: mobile?14:20,
        background:'rgba(255,255,255,.72)',
        backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)',
        border:'1px solid var(--line)', borderRadius:18,
        padding: mobile?'16px 18px':'14px 22px',
        boxShadow:'0 8px 30px rgba(0,0,0,.06)'
      }}>
        {/* Left — Closets logo + copyright + 365Neo credit */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent: mobile?'center':'flex-start' }}>
          {logo
            ? <img src={logo} alt="The Closets" style={{ height:26, width:'auto', maxWidth:110, objectFit:'contain' }} />
            : <span className="display" style={{ fontSize:16, color:'var(--ink)' }}>{cms('footer.brand', 'The Closets Co.')}</span>}
          <span style={{ fontSize:12.5, color:'var(--muted)', lineHeight:1.5, textAlign: mobile?'center':'left' }}>
            {cms('footer.copyright', '© 2026 The Closets Co. W.L.L. — Manama, Bahrain')}
            <span style={{ margin:'0 8px', opacity:.45 }}>·</span>
            {t('devBy')} <a href="https://www.365neo.com" target="_blank" rel="noopener" lang="en" dir="ltr" style={{ color:'var(--clay)', textDecoration:'none', fontWeight:600 }}>365Neo Digital Services</a>
          </span>
        </div>
        {/* Right — contact + legal */}
        <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', justifyContent: mobile?'center':'flex-end', fontSize:12.5 }}>
          <a href="tel:+97317555095" className="hit44" style={{ color:'var(--ink-soft)', textDecoration:'none' }}><bdi dir="ltr">+973 17555095</bdi></a>
          <span style={{ opacity:.35 }}>·</span>
          <Link to="/privacy" className="hit44" style={{ color:'var(--muted)', textDecoration:'none' }}>{t('legalPrivacy')}</Link>
          <Link to="/terms" className="hit44" style={{ color:'var(--muted)', textDecoration:'none' }}>{t('legalTerms')}</Link>
          <button type="button" className="hit44" onClick={openConsentSettings} style={{ background:'none', border:'none', padding:0, cursor:'pointer', font:'inherit', color:'var(--muted)', textDecoration:'none' }}>{lang==='ar' ? 'إعدادات الخصوصية' : 'Privacy settings'}</button>
        </div>
      </div>
    </div>
  </footer>);
}
function ChatWidget({ setPage }) {
  const { t } = useI18n();
  const mobile = useMobile();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([{ role:'assistant', content:t('swChatHello') }]);
  const listRef = useRef(null);
  const btnRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, open, busy]);
  const send = async (text) => {
    const q = (text ?? input).trim(); if (!q || busy) return;
    const next = [...msgs, { role:'user', content:q }];
    setMsgs(next); setInput(''); setBusy(true);
    try {
      const r = await aiFetch(SUPA_URL + '/functions/v1/support_chat', { method:'POST', headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json' }, body: JSON.stringify({ messages: next.map(m=>({ role:m.role, content:m.content })) }) });
      const d = await r.json();
      setMsgs(m => [...m, { role:'assistant', content: (d && d.ok && d.reply) ? d.reply : t('swChatError') }]);
    } catch { setMsgs(m => [...m, { role:'assistant', content:t('swChatOffline') }]); }
    finally { setBusy(false); }
  };
  const chips = [
    { key:'kitchen', label:t('swChatChipKitchen') },
    { key:'pricing', label:t('swChatChipPricing') },
    { key:'book', label:t('swChatChipBook') },
    { key:'showrooms', label:t('swChatChipShowrooms') },
  ];
  return (<aside aria-label={t('swChatAria')}>
    <button type="button" ref={btnRef} onClick={()=>setOpen(o=>!o)} aria-expanded={open} aria-haspopup="dialog" aria-label={t('swChatAria')} style={{ position:'fixed', right: mobile?16:24, bottom: mobile?88:24, zIndex:1400, width:56, height:56, borderRadius:'50%', background:'var(--clay)', border:'none', boxShadow:'0 6px 20px rgba(168,75,41,.4)', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {open
        ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>}
      {!open && <span style={{ position:'absolute', top:-3, right:-3, background:'var(--ink)', color:'#fff', fontSize:10, fontWeight:700, borderRadius:999, padding:'1px 6px', lineHeight:1.4 }}>AI</span>}
    </button>
    {open && (
      <div role="dialog" aria-label={t('swChatTitle')} onKeyDown={e=>{ if (e.key==='Escape') { e.stopPropagation(); setOpen(false); if (btnRef.current) btnRef.current.focus(); } }} style={{ position:'fixed', right: mobile?10:24, bottom: mobile?150:92, zIndex:1400, width: mobile?'calc(100vw - 20px)':380, maxWidth:'calc(100vw - 20px)', height:520, maxHeight:'70vh', background:'#fff', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.22)', border:'1px solid #ececec', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ background:'var(--shop-ink, #1d1d1f)', color:'#fff', padding:'14px 18px' }}>
          <div style={{ fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:8 }}><Spark size={16} color="#F9A35C" /> {t('swChatTitle')}</div>
          <div style={{ fontSize:12, color:'#bdbdbd', marginTop:2 }}>{t('swChatSubtitle')}</div>
          <AiNotice style={{ color:'#bdbdbd', marginTop:4, fontSize:11.5 }} />
        </div>
        <div ref={listRef} role="log" aria-live="polite" style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10, background:'#fafafa' }}>
          {msgs.map((m,i)=>(<div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'85%', background: m.role==='user'?'var(--clay)':'#fff', color: m.role==='user'?'#fff':'var(--shop-ink, #1d1d1f)', border: m.role==='user'?'none':'1px solid #ececec', borderRadius:14, padding:'10px 13px', fontSize:14, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{m.content}</div>))}
          {busy && <div style={{ alignSelf:'flex-start', color:'#aaa', fontSize:13, padding:'4px 6px' }}>{t('swChatTyping')}</div>}
          {msgs.length<=1 && <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>{chips.map(c=>(<button key={c.key} type="button" onClick={()=>{ if(c.key==='book'){ setOpen(false); setPage('booking'); } else send(c.label); }} style={{ fontSize:12, border:'1px solid #e0e0e0', borderRadius:16, padding:'6px 12px', background:'#fff', cursor:'pointer', color:'var(--shop-ink, #1d1d1f)' }}>{c.label}</button>))}</div>}
        </div>
        <div style={{ display:'flex', gap:8, padding:'12px', borderTop:'1px solid #ececec' }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} aria-label={t('swChatPlaceholder')} placeholder={t('swChatPlaceholder')} style={{ flex:1, border:'1px solid #e0e0e0', borderRadius:980, padding:'10px 16px', fontSize:14, outline:'none' }} />
          <button type="button" onClick={()=>send()} disabled={busy||!input.trim()} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', flexShrink:0, opacity:(busy||!input.trim())?0.5:1 }}><SendIcon size={18} color="#fff" /></button>
        </div>
      </div>
    )}
  </aside>);
}

/* ── Robustness: a render error in one page must never blank the whole site ── */
class PageBoundary extends Component {
  constructor(p){ super(p); this.state={ err:null }; }
  static contextType = AppCtx;
  static getDerivedStateFromError(err){ return { err }; }
  componentDidCatch(err,info){ try{ console.error('Page render error:', err, info); }catch(e){} }
  render(){
    const lang = (this.context && this.context.lang) || 'en';
    const tr = (k) => (I18N[k] ? (I18N[k][lang] || I18N[k].en) : k);
    if(this.state.err) return (
      <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px', textAlign:'center' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>{tr('swErrTitle')}</div>
        <div style={{ fontSize:14, color:'var(--ink-soft)', maxWidth:420, marginBottom:18 }}>{tr('swErrBody')}</div>
        <button type="button" className="btn-clay" onClick={()=>this.setState({ err:null })} style={{ borderRadius:12 }}>{tr('swErrTryAgain')}</button>
        <div style={{ marginTop:14, fontSize:11, color:'var(--muted)', maxWidth:520, wordBreak:'break-word' }}>{String((this.state.err&&(this.state.err.message||this.state.err))||'').slice(0,200)}</div>
      </div>
    );
    return this.props.children;
  }
}

/* ── Wren-style guided KITCHEN PLANNER (shape → dimensions → style → finishes → summary) ── */
const KITCHEN_SHAPES = [
  { id:'straight', name:'Straight', sub:'One run along a single wall', runs:['a'] },
  { id:'galley', name:'Galley', sub:'Two runs facing each other', runs:['a','b'] },
  { id:'l-shape', name:'L-shaped', sub:'Two runs that meet in a corner', runs:['a','b'] },
  { id:'u-shape', name:'U-shaped', sub:'Three runs around three walls', runs:['a','b','c'] },
  { id:'island', name:'Island', sub:'A run plus a central island', runs:['a','island'] },
];
const KITCHEN_STYLES = [
  { id:'shaker_oak', name:'Shaker Oak', sub:'Timeless & warm', hex:'#b07e44', g:'linear-gradient(135deg,#c89b5e,#9c6b34)', mult:1 },
  { id:'handleless_white', name:'Handleless White', sub:'Clean & modern', hex:'#e9e5dd', g:'linear-gradient(135deg,#f3f3f1,#d6cfc4)', mult:1.15 },
  { id:'matt_graphite', name:'Matt Graphite', sub:'Bold & contemporary', hex:'#3a3a3c', g:'linear-gradient(135deg,#3a3a3c,#171717)', mult:1.2 },
  { id:'sage_shaker', name:'Sage Shaker', sub:'Soft & characterful', hex:'#8f9d7e', g:'linear-gradient(135deg,#9aa88a,#6f7d60)', mult:1.1 },
  { id:'gloss_navy', name:'Gloss Navy', sub:'Striking & premium', hex:'#27384f', g:'linear-gradient(135deg,#2c3e57,#16243a)', mult:1.25 },
  { id:'walnut', name:'Walnut', sub:'Rich & luxurious', hex:'#5a3a20', g:'linear-gradient(135deg,#6b4423,#3f2a17)', mult:1.35 },
];
const KITCHEN_WORKTOPS = [['laminate','Laminate','Budget-friendly',0],['solid_wood','Solid wood','Warm & natural',650],['quartz','Quartz','Durable premium',1400],['granite','Granite','Natural stone',1200]];
const KITCHEN_HANDLES = [['bar','Brushed bar','Modern',0],['knob','Classic knob','Traditional',0],['handleless','Handleless / J-pull','Seamless',180],['brass','Antique brass','Statement',120]];

/* ════════════════════════════════════════════════════════════════════════
   WARDROBES SECTION — the flagship product. Rich editorial catalogue/landing
   page that mirrors the Kitchen build. The DESIGN STUDIO + live 3D already
   exists as PlannerPage (route 'planner') with Wardrobe3D — this page is the
   catalogue, spec & pricing surface; its CTAs route to the existing studio.
   All prices in BHD. Drivers are transparent: cabinetry is priced per linear
   metre of run; interior fittings & accessories per unit; finish carries a
   per-metre multiplier. Confirmed exactly on the free design visit.

   Catalogue anchors pulled from website_products (Wardrobes / Walk-In / Storage):
     wp-walk-01 Lumina Walk-In Dressing Room   BD 5200
     wp-101     Walk-In Wardrobe — Premium     BD 1450
     wp-wd-01   Executive Hinged Wardrobe      BD 2800
     wp-102     Sliding-Door Wardrobe          BD 1000
     wp-wd-02   Manhattan Sliding Wardrobe     BD 1650
     wp-103     Hinged 4-Door Wardrobe         BD 720
     wp-st-01   Modular Storage System         BD 890
     wp-104     Kids Room Wardrobe             BD 540
   Finishes/hardware/accessories sourced from design_materials (real cost/specs).
   ──────────────────────────────────────────────────────────────────────── */

const WARDROBE_CATALOG_ANCHORS = {
  walkin:  { id:'wp-walk-01', name:'Lumina Walk-In Dressing Room', from:5200 },
  premium: { id:'wp-101',     name:'Walk-In Wardrobe — Premium',   from:1450 },
  hinged:  { id:'wp-wd-01',   name:'Executive Hinged Wardrobe',    from:2800 },
  sliding: { id:'wp-wd-02',   name:'Manhattan Sliding Wardrobe',   from:1650 },
};

// WARDROBE FINISH COLOURS — recolour the 3D studio (hex literal ok in canvas).
const W_COLOURS = [
  { id:'cashmere', name:'Cashmere',     hex:'#e4ddcf' },
  { id:'pure_white',name:'Pure white',  hex:'#f5f3ee' },
  { id:'oak',      name:'Natural oak',  hex:'#c89b5e' },
  { id:'walnut',   name:'Walnut',       hex:'#5a3a20' },
  { id:'graphite', name:'Matt graphite',hex:'#3a3a3c' },
  { id:'sage',     name:'Sage green',   hex:'#8f9d7e' },
  { id:'navy',     name:'Deep navy',    hex:'#27384f' },
  { id:'clay',     name:'Terracotta',   hex:'#c2774a' },
];

// CABINET FINISH / COLOUR — recolours the 3D (hex literal, ok inside canvas).
const K_FINISHES = [
  { id:'cashmere',  name:'Cashmere',     hex:'#e4ddcf' },
  { id:'pure_white',name:'Pure white',   hex:'#f5f3ee' },
  { id:'sage',      name:'Sage green',   hex:'#8f9d7e' },
  { id:'navy',      name:'Deep navy',    hex:'#27384f' },
  { id:'graphite',  name:'Matt graphite',hex:'#3a3a3c' },
  { id:'oak',       name:'Natural oak',  hex:'#c89b5e' },
  { id:'walnut',    name:'Walnut',       hex:'#5a3a20' },
  { id:'clay',      name:'Terracotta',   hex:'#c2774a' },
];

// APPLIANCE PACKAGES — per-unit, transparent.
const K_APPLIANCES = [
  { id:'hob',   name:'Hob',          sub:'Induction / gas / ceramic', price:240, ic:'M5 5h14v14H5z M9 9h0 M15 9h0 M9 15h0 M15 15h0' },
  { id:'oven',  name:'Built-in oven',sub:'Single multifunction',      price:320, ic:'M5 4h14v16H5z M5 9h14 M9 6h0' },
  { id:'hood',  name:'Extractor hood',sub:'Chimney / integrated',     price:180, ic:'M4 9h16l-2 5H6z M9 4h6v3H9z' },
  { id:'sink',  name:'Sink & tap',   sub:'Undermount + mixer',        price:160, ic:'M4 9h16v3H4z M9 12v4a3 3 0 006 0M12 4v5' },
  { id:'fridge',name:'Fridge-freezer',sub:'Integrated tall',          price:520, ic:'M7 3h10v18H7z M7 9h10 M9 6h0 M9 12h0' },
  { id:'dish',  name:'Dishwasher',   sub:'Fully integrated 60cm',     price:300, ic:'M4 4h16v16H4z M4 8h16 M8 12h8 M8 16h8' },
  { id:'micro', name:'Microwave',    sub:'Built-in combi',            price:240, ic:'M3 6h18v12H3z M16 6v12 M6 10h6 M6 14h6' },
  { id:'wine',  name:'Wine cooler',  sub:'Under-counter',             price:380, ic:'M8 3h8v6a4 4 0 01-8 0z M12 13v6 M9 21h6' },
];

// STORAGE & INTERIOR ADD-ONS — per-unit upgrades.
const K_STORAGE = [
  { id:'larder',   name:'Pull-out larder', sub:'Full-height tandem',  price:340, ic:'M7 3h10v18H7z M7 9h10 M7 15h10' },
  { id:'corner',   name:'Magic corner',    sub:'Swing-out corner kit', price:220, ic:'M4 4h16v16H4z M4 12a8 8 0 008-8' },
  { id:'cutlery',  name:'Cutlery inserts',  sub:'Soft-close drawer set', price:60, ic:'M4 7h16v10H4z M8 7v10 M12 7v10 M16 7v10' },
  { id:'bin',      name:'Recycling bin set',sub:'Integrated 2/3-way',   price:130, ic:'M6 7h12l-1 13H7z M9 4h6v3H9z' },
  { id:'spice',    name:'Spice pull-out',   sub:'150mm base unit',      price:90,  ic:'M9 3h6v18H9z M9 9h6' },
  { id:'led',      name:'LED under-cabinet', sub:'Warm 3000K strip',    price:120, ic:'M5 8h14 M7 12h10 M9 16h6' },
  { id:'plinth',   name:'Plinth drawers',   sub:'Hidden toe-kick store', price:150, ic:'M4 16h16v3H4z M6 16v-2h12v2' },
  { id:'pantry',   name:'Walk-in pantry',   sub:'Bespoke shelving wall', price:480, ic:'M5 3h14v18H5z M5 8h14 M5 13h14' },
];

/* ── Interactive Wren-style kitchen ROOM PLANNER: build it unit by unit ── */
const KU_UNITS = [
  { key:'base', name:'Base unit', w:60, price:120, tier:'base', ic:'M4 8h16v12H4z' },
  { key:'drawer', name:'Drawer pack', w:50, price:165, tier:'base', ic:'M4 8h16v12H4z M4 12h16 M4 16h16' },
  { key:'sink', name:'Sink unit', w:80, price:185, tier:'base', ic:'M4 8h16v12H4z M9 13a3 3 0 0 1 6 0' },
  { key:'corner', name:'Corner unit', w:90, price:230, tier:'base', ic:'M4 8h16v12H4z' },
  { key:'oven', name:'Oven housing', w:60, price:225, tier:'base', ic:'M5 5h14v14H5z M8 9h8' },
  { key:'wall', name:'Wall cabinet', w:60, price:95, tier:'wall', ic:'M4 6h16v9H4z' },
  { key:'tall', name:'Tall / larder', w:60, price:340, tier:'tall', ic:'M7 3h10v18H7z' },
  { key:'fridge', name:'Fridge housing', w:60, price:310, tier:'tall', ic:'M7 3h10v18H7z M9 8h0' },
];
const KU_WT = { laminate:60, solid_wood:180, quartz:320, granite:280 };

// ── loadGA4(): inject gtag.js exactly once, only after consent + a real id ──
function loadGA4() {
  if (typeof window === 'undefined') return;
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return; // placeholder => no-op
  if (window.__closetsGaLoaded) return;
  window.__closetsGaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
}

// ── CookieConsent: privacy-first, consent-gated measurement ──
// [PRIVACY] The banner and the stored choice live in src/privacy/consent.js (shared by every shell). Nothing optional
// (GA4 if ever enabled, visualizer session pings / events) runs until the visitor chose; "Essential only" is the equal-weight alternative.
function CookieConsent() {
  const { lang } = useI18n();
  useEffect(() => {
    const go = (c) => { if (c && c.analytics) loadGA4(); };
    go({ analytics: hasConsent('analytics') });
    return onConsentChange(go);
  }, []);
  return <ConsentBanner lang={lang} linkAs={Link} />;
}

export default function App() {
  // CustomConfigurator removed: its only entry point was a floating pill pinned to the
  // bottom-centre, which sat on top of the mobile dock's ✏️ Design button. The dock FAB
  // and the header's 🧩 Design your own button both already lead to the planner.
  return <BrowserRouter><SiteContentProvider><AppInner /></SiteContentProvider></BrowserRouter>;
}
const PATH_TO_PAGE = { '/privacy':'privacy','/terms':'terms','':'home','/':'home','/home':'home','/kitchen':'kitchen','/kitchens':'kitchen','/wardrobes':'wardrobes','/wardrobe':'wardrobes','/tv':'tv','/tv-units':'tv','/doors':'doors','/door':'doors','/office':'office','/about':'about','/contact':'contact','/services':'services','/showrooms':'showrooms','/blog':'blog','/faq':'faq','/offers':'offers','/projects':'projects','/booking':'booking','/directory':'directory','/portal':'portal','/how-it-works':'how-it-works','/guide':'how-it-works','/ai-yas':'ai-yas','/ai':'ai-yas','/ai-designer':'ai','/design-lab':'design-lab',
  // Task 2 route table — canonical + back-compat aliases
  '/gallery':'products','/products':'products','/signin':'portal','/portal':'portal',
  '/design-studio':'planner','/planner':'planner',
  '/design-studio/kitchen-planner':'kitchen-planner','/kitchen-planner':'kitchen-planner',
  '/design-studio/wardrobe-planner':'wardrobe-planner','/wardrobe-planner':'wardrobe-planner',
  '/design-studio/tv-planner':'tv-planner','/tv-planner':'tv-planner',
  '/design-studio/door-planner':'door-planner','/door-planner':'door-planner',
  '/design-studio/office-planner':'office-planner','/office-planner':'office-planner',
  '/design-studio/builder':'design-builder','/design-builder':'design-builder',
  '/ai-lab':'design-lab','/ai-lab/yas':'ai-yas',
  '/warranty':'warranty','/maintenance':'maintenance','/careers':'careers','/checkout':'checkout','/cart':'home' };
// Canonical page → URL path (reverse of PATH_TO_PAGE). Non-listed keys fall back to '/'+key.
const PAGE_TO_PATH = {
  home:'/', kitchen:'/kitchen', wardrobes:'/wardrobes', tv:'/tv', doors:'/doors', office:'/office',
  about:'/about', contact:'/contact', services:'/services', showrooms:'/showrooms', blog:'/blog',
  faq:'/faq', offers:'/offers', projects:'/projects', booking:'/booking', directory:'/directory',
  'how-it-works':'/how-it-works', ai:'/ai-designer',
  products:'/gallery', portal:'/signin',
  // Design Studio group
  planner:'/design-studio',
  'kitchen-planner':'/design-studio/kitchen-planner', 'wardrobe-planner':'/design-studio/wardrobe-planner',
  'tv-planner':'/design-studio/tv-planner', 'door-planner':'/design-studio/door-planner',
  'office-planner':'/design-studio/office-planner', 'design-builder':'/design-studio/builder',
  // AI Lab group
  'design-lab':'/ai-lab', 'ai-yas':'/ai-lab/yas',
  // Utility
  checkout:'/checkout', cart:'/cart', warranty:'/warranty', maintenance:'/maintenance', careers:'/careers',
};
// The full route table (canonical paths) — used by sitemap/prerender.
const ROUTE_TABLE = [
  '/', '/kitchen', '/wardrobes', '/tv', '/doors', '/office', '/gallery',
  '/design-studio', '/design-studio/kitchen-planner', '/design-studio/wardrobe-planner',
  '/design-studio/tv-planner', '/design-studio/door-planner', '/design-studio/office-planner',
  '/ai-lab', '/ai-lab/yas', '/offers', '/booking', '/projects', '/services', '/showrooms',
  '/how-it-works', '/faq', '/about', '/contact', '/blog', '/careers', '/warranty', '/maintenance',
];
// [SEO] ROUTE_META moved to src/seo/routes.js (single registry: meta, JSON-LD, sitemap, prerender).
function pageToPath(p) {
  if (p == null || p === '' || p === 'home') return '/';
  if (typeof p === 'string' && p.startsWith('cat:')) return '/category/' + p.slice(4);
  if (typeof p === 'string' && p.startsWith('product-')) return '/' + p;
  if (PAGE_TO_PATH[p]) return PAGE_TO_PATH[p];
  return '/' + p;
}
// Resolve a nav target (incl. category shortcuts) to a URL path — mirrors navTo().
// [WEB-STUDIO 2026-10-31] 'neo:<kind>' = a Neo designer page of the Design Studio app (/studio/<kind>); 'neo:account' = My designs
function neoStudioPath(target) { const k = String(target).slice(4); return k === 'account' ? '/studio/account' : k ? '/studio/' + k : '/studio'; }
// [ROOM-VIZ 2026-11-07] 'viz:<path>' = the Room Visualizer app (/visualizer/<path>)
function vizPath(target) { const k = String(target).slice(4); return k ? '/visualizer/' + k : '/visualizer'; }
function navToPath(target) {
  if (typeof target === 'string' && target.startsWith('neo:')) return neoStudioPath(target);
  if (typeof target === 'string' && target.startsWith('viz:')) return vizPath(target);
  if (target === 'cat:Doors') return pageToPath('door-planner');
  if (typeof target === 'string' && target.startsWith('cat:')) return pageToPath('products');
  return pageToPath(target);
}
function pathToPage(pathname) {
  const raw = (pathname || '/').replace(/\/+$/, '') || '/';
  const lower = raw.toLowerCase();
  if (PATH_TO_PAGE[lower]) return PATH_TO_PAGE[lower];
  if (lower.startsWith('/product-')) return raw.slice(1);            // preserve id case
  if (lower.startsWith('/category/')) return 'cat:' + raw.slice('/category/'.length);  // preserve category case
  const seg = raw.slice(1);
  return seg || 'home';
}
function initialPage() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const qp = (sp.get('page') || sp.get('p') || '').toLowerCase();
    if (qp && PATH_TO_PAGE['/' + qp]) return PATH_TO_PAGE['/' + qp];
    if (qp) return qp;
    const path = (window.location.pathname || '/').replace(/\/+$/, '').toLowerCase() || '/';
    if (PATH_TO_PAGE[path]) return PATH_TO_PAGE[path];
    if (path.startsWith('/product-')) return path.slice(1);
  } catch (e) {}
  return 'home';
}

// ── 🧩 Design your own — the pages that require a customer account ────────────
const PLANNER_PAGES = ['planner','kitchen-planner','wardrobe-planner','tv-planner',
                       'door-planner','office-planner','design-builder','cat:Doors'];

// The screen a logged-out visitor sees instead of the planner.
const GATE_COPY = {
  title:   { en:'Design & price your own',            ar:'صمّم واحسب سعرك بنفسك' },
  body:    { en:'Sign in or create a free account to use the design studio — set your sizes and materials and see your price instantly.',
             ar:'سجّل الدخول أو أنشئ حساباً مجانياً لاستخدام استوديو التصميم — حدّد المقاسات والخامات وشاهد السعر فوراً.' },
  why:     { en:'Your account keeps every design you make, so you can come back to it, share it, and turn it into a quotation whenever you are ready.',
             ar:'يحفظ حسابك كل تصميم تنشئه، لتعود إليه وتشاركه وتحوّله إلى عرض سعر متى شئت.' },
  create:  { en:'Create a free account',              ar:'أنشئ حساباً مجانياً' },
  signIn:  { en:'I already have an account',          ar:'لديّ حساب بالفعل' },
  back:    { en:'← Back to the site',                 ar:'العودة إلى الموقع →' },
};
function PlannerLoginGate({ openAuth, setPage, lang }) {
  const g = (k) => (GATE_COPY[k] ? (GATE_COPY[k][lang] || GATE_COPY[k].en) : '');
  return (
    <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 20px' }}>
      <div style={{ maxWidth:560, textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:18 }}>🧩</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(28px,4vw,42px)', lineHeight:1.15, margin:'0 0 14px', color:'var(--ink,#1a1a1a)' }}>
          {g('title')}
        </h1>
        <p style={{ fontSize:16, lineHeight:1.7, color:'var(--muted,#6b6b6b)', margin:'0 0 12px' }}>{g('body')}</p>
        <p style={{ fontSize:14, lineHeight:1.7, color:'var(--muted,#8a8a8a)', margin:'0 0 30px' }}>{g('why')}</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button type="button" className="btn-clay" onClick={() => openAuth('register')}
            style={{ fontSize:16, padding:'15px 30px' }}>
            {g('create')}
          </button>
          <button type="button" onClick={() => openAuth('login')}
            style={{ background:'#fff', border:'1px solid var(--line,#e2e2e2)', borderRadius:980, padding:'15px 30px',
                     fontSize:16, fontWeight:500, color:'var(--ink,#1a1a1a)', cursor:'pointer' }}>
            {g('signIn')}
          </button>
        </div>
        <button type="button" onClick={() => setPage('home')}
          style={{ marginTop:26, background:'none', border:'none', color:'var(--muted,#8a8a8a)',
                   fontSize:14, cursor:'pointer', textDecoration:'underline' }}>
          {g('back')}
        </button>
      </div>
    </div>
  );
}
// ── Route-level code splitting ───────────────────────────────────────────────
// Every non-home page lives in its own chunk (src/pages/*.jsx) and is loaded on demand, so first-load
// JS holds only the home path. lazyPage() renders a stable-height skeleton until the chunk arrives.
const ProductsPage = lazyPage(() => import(/* webpackChunkName: "page-ProductsPage" */ './pages/ProductsPage').then(m => m.ProductsPage));
const ProductDetailPage = lazyPage(() => import(/* webpackChunkName: "page-ProductDetailPage" */ './pages/ProductDetailPage').then(m => m.ProductDetailPage));
const HomeHub = lazyPage(() => import(/* webpackChunkName: "page-HomeHub" */ './pages/HomeHub').then(m => m.HomeHub));
const CheckoutPage = lazyPage(() => import(/* webpackChunkName: "page-CheckoutPage" */ './pages/CheckoutPage').then(m => m.CheckoutPage));
const AboutPage = lazyPage(() => import(/* webpackChunkName: "page-AboutPage" */ './pages/AboutPage').then(m => m.AboutPage));
const PlannerGuidePage = lazyPage(() => import(/* webpackChunkName: "page-PlannerGuidePage" */ './pages/PlannerGuidePage').then(m => m.PlannerGuidePage));
const ContactPage = lazyPage(() => import(/* webpackChunkName: "page-ContactPage" */ './pages/ContactPage').then(m => m.ContactPage));
const DirectoryPage = lazyPage(() => import(/* webpackChunkName: "page-DirectoryPage" */ './pages/DirectoryPage').then(m => m.DirectoryPage));
const ShowroomsPage = lazyPage(() => import(/* webpackChunkName: "page-ShowroomsPage" */ './pages/ShowroomsPage').then(m => m.ShowroomsPage));
const BlogPage = lazyPage(() => import(/* webpackChunkName: "page-BlogPage" */ './pages/BlogPage').then(m => m.BlogPage));
const CareersPage = lazyPage(() => import(/* webpackChunkName: "page-CareersPage" */ './pages/CareersPage').then(m => m.CareersPage));
const OffersPage = lazyPage(() => import(/* webpackChunkName: "page-OffersPage" */ './pages/OffersPage').then(m => m.OffersPage));
const FaqPage = lazyPage(() => import(/* webpackChunkName: "page-FaqPage" */ './pages/FaqPage').then(m => m.FaqPage));
const BookingPage = lazyPage(() => import(/* webpackChunkName: "page-BookingPage" */ './pages/BookingPage').then(m => m.BookingPage));
const ServicesPage = lazyPage(() => import(/* webpackChunkName: "page-ServicesPage" */ './pages/ServicesPage').then(m => m.ServicesPage));
const PortfolioPage = lazyPage(() => import(/* webpackChunkName: "page-PortfolioPage" */ './pages/PortfolioPage').then(m => m.PortfolioPage));
const MaintenancePage = lazyPage(() => import(/* webpackChunkName: "page-MaintenancePage" */ './pages/MaintenancePage').then(m => m.MaintenancePage));
const WarrantyPage = lazyPage(() => import(/* webpackChunkName: "page-WarrantyPage" */ './pages/WarrantyPage').then(m => m.WarrantyPage));
const AiYasPage = lazyPage(() => import(/* webpackChunkName: "page-AiYasPage" */ './pages/AiYasPage').then(m => m.AiYasPage));
const DesignLabPage = lazyPage(() => import(/* webpackChunkName: "page-DesignLabPage" */ './pages/DesignLabPage').then(m => m.DesignLabPage));
const AIDesignerPage = lazyPage(() => import(/* webpackChunkName: "page-AIDesignerPage" */ './pages/AIDesignerPage').then(m => m.AIDesignerPage));
const WardrobesPage = lazyPage(() => import(/* webpackChunkName: "page-WardrobesPage" */ './pages/WardrobesPage').then(m => m.WardrobesPage));
const KitchenPage = lazyPage(() => import(/* webpackChunkName: "page-KitchenPage" */ './pages/KitchenPage').then(m => m.KitchenPage));
const KitchenPlannerWizard = lazyPage(() => import(/* webpackChunkName: "page-KitchenPlannerWizard" */ './pages/KitchenPlannerWizard').then(m => m.KitchenPlannerWizard));
const TVUnitPlannerWizard = lazyPage(() => import(/* webpackChunkName: "page-TVUnitPlannerWizard" */ './pages/TVUnitPlannerWizard').then(m => m.TVUnitPlannerWizard));
const DoorPlannerWizard = lazyPage(() => import(/* webpackChunkName: "page-DoorPlannerWizard" */ './pages/DoorPlannerWizard').then(m => m.DoorPlannerWizard));
const WardrobePlannerWizard = lazyPage(() => import(/* webpackChunkName: "page-WardrobePlannerWizard" */ './pages/WardrobePlannerWizard').then(m => m.WardrobePlannerWizard));
const OfficePage = lazyPage(() => import(/* webpackChunkName: "page-OfficePage" */ './pages/OfficePage').then(m => m.OfficePage));
const TVUnitPage = lazyPage(() => import(/* webpackChunkName: "page-TVUnitPage" */ './pages/TVUnitPage').then(m => m.TVUnitPage));
const DoorsPage = lazyPage(() => import(/* webpackChunkName: "page-DoorsPage" */ './pages/DoorsPage').then(m => m.DoorsPage));
const OfficePlannerWizard = lazyPage(() => import(/* webpackChunkName: "page-OfficePlannerWizard" */ './pages/OfficePlannerWizard').then(m => m.OfficePlannerWizard));
const DesignBuilderPage = lazyPage(() => import(/* webpackChunkName: "page-DesignBuilderPage" */ './pages/DesignBuilderPage').then(m => m.DesignBuilderPage));
const PlannerPage = lazyPage(() => import(/* webpackChunkName: "page-PlannerPage" */ './pages/PlannerPage').then(m => m.PlannerPage));
const CategoryPage = lazyPage(() => import(/* webpackChunkName: "page-CategoryPage" */ './pages/CategoryPage').then(m => m.CategoryPage));

// page key (see pathToPage) → its lazy route component, for preloading (deep links / hydration of prerendered routes).
const PAGE_CHUNKS = { products: ProductsPage, portal: HomeHub, checkout: CheckoutPage, about: AboutPage, 'how-it-works': PlannerGuidePage,
  contact: ContactPage, directory: DirectoryPage, showrooms: ShowroomsPage, blog: BlogPage, careers: CareersPage, offers: OffersPage, faq: FaqPage,
  booking: BookingPage, services: ServicesPage, projects: PortfolioPage, maintenance: MaintenancePage, warranty: WarrantyPage, 'ai-yas': AiYasPage,
  'design-lab': DesignLabPage, ai: AIDesignerPage, wardrobes: WardrobesPage, kitchen: KitchenPage, 'kitchen-planner': KitchenPlannerWizard,
  'tv-planner': TVUnitPlannerWizard, 'door-planner': DoorPlannerWizard, 'wardrobe-planner': WardrobePlannerWizard, office: OfficePage, tv: TVUnitPage,
  doors: DoorsPage, 'office-planner': OfficePlannerWizard, 'design-builder': DesignBuilderPage, planner: PlannerPage, 'cat:Doors': DoorPlannerWizard };
// Resolves once the route chunk for `pathname` has loaded (or immediately if the route is on the home path). index.js awaits this before
// hydrateRoot so the prerendered page hydrates against already-loaded code instead of a loading skeleton.
export function preloadRoute(pathname) {
  try {
    const page = pathToPage(splitLangPath(pathname).path);
    const C = PAGE_CHUNKS[page] || (page.startsWith('product-') ? ProductDetailPage : page.startsWith('cat:') ? CategoryPage : null);
    return C ? C.preload() : Promise.resolve();
  } catch (e) { return Promise.resolve(); }
}
function AppInner() {
  useSiteContent();   // subscribe: re-render the whole tree once managed content loads
  // ── react-router-dom v6 is the source of truth for navigation ──
  // `page` is derived from the URL; `setPage(x)` navigates (keeps all existing setPage callers working).
  const location = useLocation();
  const navigate = useNavigate();
  // [SEO] Language lives in the URL (/ar/...) when ENABLE_AR_URLS; the rest of the path is language-neutral.
  const urlInfo = splitLangPath(location.pathname);
  const barePath = urlInfo.path;
  const page = pathToPage(barePath);
  const notFound = !isKnownPage(page);
  useEffect(() => { if (/^\/(studio|visualizer)(\/|$)/i.test(location.pathname)) window.location.reload(); }, [location.pathname]); // [WEB-STUDIO] the studio is its own app shell (src/index.js)
  const [legacyLang, setLegacyLang] = useState(() => { try { return localStorage.getItem('closets_lang') || 'en'; } catch { return 'en'; } });
  const lang = ENABLE_AR_URLS ? urlInfo.lang : legacyLang;
  // Navigate to a path in the CURRENT language (setPage / cart / redirects).
  const goPath = useCallback((path, opts) => navigate(withLang(path, lang), opts), [navigate, lang]);
  const setPage = useCallback((p) => {
    if (typeof p === 'string' && p.startsWith('neo:')) { window.location.assign(neoStudioPath(p)); return; }   // [WEB-STUDIO] separate app shell
    if (typeof p === 'string' && p.startsWith('viz:')) { window.location.assign(vizPath(p)); return; }        // [ROOM-VIZ] separate app shell
    if (p != null) goPath(pageToPath(p));
  }, [goPath]);
  // Language toggle: with /ar URLs it navigates to the sibling URL (and remembers the choice); otherwise legacy state.
  const setLang = useCallback((l) => {
    try { localStorage.setItem('closets_lang', l); } catch {}
    const go = () => { if (ENABLE_AR_URLS) navigate({ pathname: withLang(barePath, l), search: location.search, hash: location.hash }); else setLegacyLang(l); };
    if (l === 'ar') ensureArabic().then(go, go);   // the Arabic dictionary is lazy: have it before the UI flips (no English flash)
    else go();
  }, [navigate, barePath, location.search, location.hash]);
  // Returning Arabic visitors (localStorage) who land on an English URL are sent once to the matching /ar URL.
  // Crawlers have no localStorage, so they always get the URL they asked for. (Runs AFTER hydration so markup matches.)
  const langRedirected = useRef(false);
  useEffect(() => {
    if (langRedirected.current) return; langRedirected.current = true;
    if (!ENABLE_AR_URLS || urlInfo.lang === 'ar') return;
    let stored = null; try { stored = localStorage.getItem('closets_lang'); } catch {}
    if (stored === 'ar' && !/^\/(studio|visualizer|campaign|ikhtarha)(\/|$)/i.test(barePath)) { const go = () => navigate({ pathname: withLang(barePath, 'ar'), search: location.search, hash: location.hash }, { replace: true }); ensureArabic().then(go, go); }
    // eslint-disable-next-line
  }, []);
  // Legacy / duplicate paths (/kitchens, /wardrobe, /ai, ...) are 301'd by vercel.json; do the same client-side.
  useEffect(() => {
    const target = LEGACY_REDIRECTS[barePath.replace(/\/+$/, '').toLowerCase() || '/'];
    if (target) navigate({ pathname: withLang(target, lang), search: location.search, hash: location.hash }, { replace: true });
    // eslint-disable-next-line
  }, [barePath]);
  // Scroll to top on route change
  useEffect(() => {
    try { const el = (typeof document !== 'undefined') && (document.scrollingElement || document.documentElement); if (el) el.scrollTop = 0; }
    catch (e) { /* unsupported env — ignore */ }
  }, [location.pathname]);
  setCmsLang(lang);   // sync DURING render (before children render) so cms() resolves the current language without lagging a toggle
  useEffect(() => {
    setCmsLang(lang);   // keep module-global CMS language in sync so cms() resolves Arabic on re-render
    if (lang === 'ar') ensureBrandFonts();   // Arabic UI: fetch the Arabic font stylesheet right away (otherwise it loads when idle, see fonts.js)
    if (!ENABLE_AR_URLS) { try { localStorage.setItem('closets_lang', lang); } catch {} }
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', lang);
      document.body.style.fontFamily = lang === 'ar' ? 'var(--font-ar)' : '';
    }
  }, [lang]);
  // [SEO] Per-route head (title, description, canonical, hreflang, og:*, twitter:*, robots, JSON-LD) — src/seo/head.js.
  // The prerender snapshots exactly what this writes. Unknown URLs get the noindex NotFound head.
  useRouteHead(notFound ? null : (barePath === '/cart' ? 'cart' : page), lang);
  // ── Global scroll-reveal observer (premium motion layer). Re-scans on route change.
  // Adds `.in` to `.reveal` elements as they enter the viewport; marks already-visible
  // ones immediately so above-the-fold content is never left hidden. Honours reduced-motion.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || reduce) {
      const t0 = setTimeout(() => { document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in')); }, 60);
      return () => clearTimeout(t0);
    }
    let io = null;
    const t = setTimeout(() => {
      io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.reveal:not(.in)').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in'); // already in view
        else io.observe(el);
      });
    }, 80);
    return () => { clearTimeout(t); if (io) io.disconnect(); };
  }, [page]);
  const [products, setProducts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [cart, setCart] = useState([]);
  // Cart is a drawer backed by history (?cart=1) so refresh/back/deep-link work and Back closes it (never exits the site).
  const cartOpen = new URLSearchParams(location.search).get('cart') === '1' || barePath === '/cart';
  const setCartOpen = useCallback((open) => {
    if (open) {
      if (new URLSearchParams(location.search).get('cart') === '1') return;
      navigate({ pathname: barePath === '/cart' ? withLang('/', lang) : location.pathname, search: '?cart=1' });
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);   // pop the ?cart=1 entry — same as pressing Back
    } else {
      navigate({ pathname: barePath === '/cart' ? withLang('/', lang) : location.pathname, search: '' }, { replace: true });
    }
  }, [navigate, location.pathname, location.search, barePath, lang]);
  const [configProduct, setConfigProduct] = useState(null);
  const skippedUser = useRef(hydration.active);   // hydrating the (signed-out) prerender: start signed-out, then pick the saved user up after mount
  const [user, setUser] = useState(() => (hydration.active ? null : acct.loadUser()));
  useEffect(() => { if (skippedUser.current) { skippedUser.current = false; const u = acct.loadUser(); if (u) setUser(u); } }, []);   // eslint-disable-line react-hooks/exhaustive-deps   // [IDENTITY] minimal stored profile only; RPC identity comes from src/account/api.js
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authPrefill, setAuthPrefill] = useState(null);
  const [siteLogo, setSiteLogo] = useState(null);
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    api('website_products?active=eq.true&order=sort_order.asc').then(d => { if (Array.isArray(d)) setProducts(sanitizeProducts(d)); }).catch(()=>{});   // [RESILIENCE] coerce at the boundary
    api('website_testimonials?active=eq.true&order=sort_order.asc').then(d => { if (Array.isArray(d)) setTestimonials(sanitizeTestimonials(d)); }).catch(()=>{});
    api('website_configurator_settings?id=eq.main-config&select=config').then(d => {
      const cfg = d?.[0]?.config; if (cfg && typeof cfg.site_logo_url === 'string' && cfg.site_logo_url) setSiteLogo(cfg.site_logo_url);
    }).catch(()=>{});
    api('website_banners?active=eq.true&order=sort_order.asc&limit=10').then(d => {
      if (Array.isArray(d) && d.length) setBanners(sanitizeBanners(d));
    }).catch(()=>{});
  }, []);
  const addToCart = item => setCart(c => [...c, item]);
  const openAuth = (mode = 'login', prefill) => { setAuthMode(mode); setAuthPrefill(prefill && typeof prefill==='object' ? prefill : null); setAuthOpen(true); };
  const productId = page.startsWith('product-') ? page.replace('product-','') : null;

  // ── 🧩 DESIGN YOUR OWN — logged-in customers only ───────────────────────────
  // Gated centrally at the router rather than at all 34 setPage() call sites, so
  // no entry point can bypass it. The page state is kept, so the moment the
  // customer signs in the planner they asked for renders — no re-navigation.
  const plannerLocked = PLANNER_PAGES.includes(page) && !user;
  useEffect(() => {
    if (plannerLocked) openAuth('register');   // prompt immediately; they can dismiss and still see why
    // eslint-disable-next-line
  }, [plannerLocked]);

  return (
    <LangContext.Provider value={lang}>
    <AppCtx.Provider value={{ user, setUser, cart, setCart, addToCart, setPage, lang, setLang }}>
      <style>{CSS}</style>
      <SkipLink lang={lang} />
      <RouteAnnouncer pathname={location.pathname} lang={lang} />
      {page!=='portal' && <Nav page={page} setPage={setPage} cart={cart} setCartOpen={setCartOpen} user={user} openAuth={openAuth} siteLogo={siteLogo} lang={lang} setLang={setLang} />}
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
      <SectionBoundary name={'route:' + page} resetKey={page}>
      {notFound && <NotFound lang={lang} />}
      {page==='home' && <HomePage user={user} banners={banners} siteLogo={siteLogo} products={products} testimonials={testimonials} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />}
      {page==='products' && <ProductsPage products={products} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />}
      {productId && <ProductDetailPage productId={productId} products={products} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />}
      {page==='portal' && (user ? <HomeHub user={user} setUser={setUser} setPage={setPage} /> : <div style={{ paddingTop:120, textAlign:'center', padding:'120px 24px' }}><button type="button" className="btn" onClick={()=>openAuth('login')} style={{ borderRadius:14 }}>{I18N.signInHub[lang]||I18N.signInHub.en}</button></div>)}
      {page==='checkout' && <CheckoutPage cart={cart} setCart={setCart} user={user} setPage={setPage} />}
      {page==='about' && <AboutPage setPage={setPage} />}
      {page==='how-it-works' && <PlannerGuidePage setPage={setPage} />}
      {page==='contact' && <ContactPage />}
      {page==='directory' && <DirectoryPage setPage={setPage} />}
      {page==='showrooms' && <ShowroomsPage />}
      {page==='blog' && <BlogPage />}
      {page==='careers' && <CareersPage />}
      {page==='offers' && <OffersPage setPage={setPage} />}
      {page==='faq' && <FaqPage />}
      {page==='booking' && <BookingPage setPage={setPage} />}
      {page==='services' && <ServicesPage user={user} setPage={setPage} openAuth={openAuth} />}
      {page==='projects' && <PortfolioPage setPage={setPage} />}
      {page==='maintenance' && <MaintenancePage />}
      {page==='warranty' && <WarrantyPage />}
      {page==='ai-yas' && <PageBoundary key="ai-yas"><AiYasPage setPage={setPage} user={user} /></PageBoundary>}
      {page==='design-lab' && <PageBoundary key="design-lab"><DesignLabPage user={user} setPage={setPage} openAuth={openAuth} /></PageBoundary>}
      {page==='ai' && <PageBoundary key="ai"><AIDesignerPage setPage={setPage} user={user} /></PageBoundary>}
      {page==='wardrobes' && <PageBoundary key="wardrobes"><WardrobesPage setPage={setPage} products={products} /></PageBoundary>}
      {page==='kitchen' && <PageBoundary key="kitchen"><KitchenPage setPage={setPage} products={products} /></PageBoundary>}
      {page==='kitchen-planner' && !plannerLocked && <PageBoundary key="kp"><KitchenPlannerWizard setPage={setPage} user={user} openAuth={openAuth} /></PageBoundary>}
      {page==='tv-planner' && !plannerLocked && <PageBoundary key="tvp"><TVUnitPlannerWizard setPage={setPage} user={user} openAuth={openAuth} /></PageBoundary>}
      {page==='door-planner' && !plannerLocked && <PageBoundary key="dp"><DoorPlannerWizard setPage={setPage} user={user} openAuth={openAuth} /></PageBoundary>}
      {page==='wardrobe-planner' && !plannerLocked && <PageBoundary key="wp"><WardrobePlannerWizard setPage={setPage} user={user} openAuth={openAuth} /></PageBoundary>}
      {page==='office' && <PageBoundary key="office"><OfficePage setPage={setPage} products={products} /></PageBoundary>}
      {page==='tv' && <PageBoundary key="tv"><TVUnitPage setPage={setPage} products={products} /></PageBoundary>}
      {page==='doors' && <PageBoundary key="doors"><DoorsPage setPage={setPage} products={products} /></PageBoundary>}
      {page==='office-planner' && !plannerLocked && <PageBoundary key="op"><OfficePlannerWizard setPage={setPage} user={user} openAuth={openAuth} /></PageBoundary>}
      {page==='design-builder' && !plannerLocked && <PageBoundary key="db"><DesignBuilderPage setPage={setPage} user={user} /></PageBoundary>}
      {page==='planner' && !plannerLocked && <PageBoundary key="planner"><PlannerPage setPage={setPage} user={user} openAuth={openAuth} siteLogo={siteLogo} /></PageBoundary>}
      {page==='cat:Doors' && !plannerLocked && <PageBoundary key="dpc"><DoorPlannerWizard setPage={setPage} user={user} openAuth={openAuth} /></PageBoundary>}
      {/* 🧩 Design your own — logged-out visitors get the sign-in gate, never the planner */}
      {plannerLocked && <PlannerLoginGate openAuth={openAuth} setPage={setPage} lang={lang} />}
      {page.startsWith('cat:') && page!=='cat:Doors' && <CategoryPage category={page.slice(4)} products={products} setPage={setPage} addToCart={addToCart} />}
      {page==='privacy' && <PrivacyPage lang={lang} />}
      {page==='terms' && <TermsPage lang={lang} />}
      </SectionBoundary>
      </main>
      {!['portal','checkout','planner'].includes(page) && <SiteFooter setPage={setPage} siteLogo={siteLogo} />}
      {!['kitchen-planner','tv-planner','door-planner','wardrobe-planner','office-planner','planner'].includes(page) && <ChatWidget setPage={setPage} />}
      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} setOpen={setCartOpen} setPage={setPage} />
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} setUser={setUser} prefill={authPrefill} onClose={()=>{ setAuthOpen(false); setAuthPrefill(null); }} />}
      <CookieConsent />
      <Toasts />
    </AppCtx.Provider>
    </LangContext.Provider>
  );
}

// Shared helpers consumed by the route chunks in src/pages/ (they only load after this module has evaluated).
export { CARD_COLORS, CARD_VIDEOS, CMS_LANG, H, HERO_IMG, HOME_IMG, I18N, KITCHEN_HANDLES, KITCHEN_SHAPES, KITCHEN_STYLES, KITCHEN_WORKTOPS, KU_UNITS, KU_WT, K_APPLIANCES, K_FINISHES, K_STORAGE, OFFER_BADGE_KEY, OFFER_SUB_KEY, OFFER_TITLE_KEY, Photo, SUPA_KEY, SUPA_URL, Spark, api, cms, fmt, prefersReducedMotionNow, toast, trCat, trMap, useI18n, useMobile, useReveal };
export { ensureArabic };
