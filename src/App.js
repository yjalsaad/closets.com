import { useState, useEffect, useCallback, useRef, createContext, useContext, Component, Fragment, createElement } from 'react';

// build: services-nav-redeploy 2026-06-25 r2
const SUPA_URL = 'https://jflmbfxbhpioyniibjsj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbG1iZnhiaHBpb3luaWlianNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjkyNjQsImV4cCI6MjA5MDQ0NTI2NH0.XnQHF1Ivzhv6Zj12qe1Gh2x6ZyLdFfmUBweE_5SZnu0';
const H = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };
const api = async (path, opts = {}) => {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, { headers: H, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (!r.ok) {
    let msg = 'request failed (' + r.status + ')';
    try { const e = await r.json(); msg = e.message || e.hint || e.details || msg; } catch (_) {}
    throw new Error(msg);
  }
  if (r.status === 204) return true;
  try { return await r.json(); } catch (_) { return true; }
};
const fmt = n => 'BD ' + parseFloat(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Merge two design lists by id (incoming entries override/add; existing kept), newest first
const mergeDesigns = (existing, incoming) => {
  const byId = new Map();
  (existing || []).forEach(d => { if (d && d.id != null) byId.set(String(d.id), d); });
  (incoming || []).forEach(d => { if (d && d.id != null) byId.set(String(d.id), { ...byId.get(String(d.id)), ...d }); });
  return Array.from(byId.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};
const AppCtx = createContext(null);

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
  // nav
  home:        { en:'Home',        ar:'الرئيسية' },
  gallery:     { en:'Gallery',     ar:'المعرض' },
  design:      { en:'Design',      ar:'صمّم' },
  story:       { en:'Story',       ar:'قصتنا' },
  contact:     { en:'Contact',     ar:'تواصل' },
  signIn:      { en:'Sign In',     ar:'تسجيل الدخول' },
  // hero / home
  designYours: { en:'Design Yours',ar:'صمّم خزانتك' },
  contactUs:   { en:'Contact us',  ar:'تواصل معنا' },
  // planner
  whatDesign:  { en:'What are you designing?', ar:'ماذا تريد أن تصمّم؟' },
  pickProduct: { en:'Pick a product to start.', ar:'اختر منتجاً للبدء.' },
  quoteOnly:   { en:'Quote only',  ar:'عرض سعر فقط' },
  requestQuote:{ en:'Request a quote →', ar:'اطلب عرض سعر ←' },
  layout:      { en:'Layout',      ar:'التصميم' },
  finish:      { en:'Finish',      ar:'التشطيب' },
  size:        { en:'Size',        ar:'المقاس' },
  width:       { en:'Width',       ar:'العرض' },
  height:      { en:'Height',      ar:'الارتفاع' },
  depth:       { en:'Depth',       ar:'العمق' },
  getQuote:    { en:'Get a quote', ar:'احصل على عرض سعر' },
  saveDesign:  { en:'Save design', ar:'حفظ التصميم' },
  total:       { en:'Total',       ar:'الإجمالي' },
  included:    { en:'Included',    ar:'مشمول' },
  sectionsDone:{ en:'sections completed', ar:'أقسام مكتملة' },
  dragRotate:  { en:'drag to rotate · scroll to zoom', ar:'اسحب للتدوير · مرّر للتكبير' },
  close:       { en:'Close',       ar:'إغلاق' },
  // contact
  getInTouch:  { en:'Get in touch',ar:'تواصل معنا' },
  yourName:    { en:'Your name',   ar:'الاسم' },
  phone:       { en:'Phone',       ar:'الهاتف' },
  message:     { en:'Message',     ar:'الرسالة' },
  send:        { en:'Send',        ar:'إرسال' },
  // hero / home sections
  viewCollection:{ en:'View Collection', ar:'تصفّح المجموعة' },
  designedEvery:{ en:'Designed for every space.', ar:'مصمّمة لكل مساحة.' },
  collections: { en:'Collections',  ar:'المجموعات' },
  currentColl: { en:'Current Collection', ar:'المجموعة الحالية' },
  viewAll:     { en:'View all',     ar:'عرض الكل' },
  featured:    { en:'Featured',     ar:'مميّز' },
  whatPeopleSay:{ en:'What people say.', ar:'آراء عملائنا.' },
  clients:     { en:'Clients',      ar:'العملاء' },
  readyTransform:{ en:'Ready to transform your space?', ar:'مستعد لتحويل مساحتك؟' },
  bookConsult: { en:'Book Free Consultation', ar:'احجز استشارة مجانية' },
  signInHub:   { en:'Sign In to Your Hub', ar:'سجّل الدخول إلى حسابك' },
  // about
  ourStory:    { en:'Our Story',    ar:'قصتنا' },
  precision:   { en:'Precision.',   ar:'دقة.' },
  permanence:  { en:'Permanence.',  ar:'متانة.' },
  aboutP1:     { en:'Founded on a single belief: that storage should be as beautiful as the room it lives in. Every piece is a bespoke commission.', ar:'تأسّسنا على قناعة واحدة: أن تكون خزائن التخزين بجمال الغرفة التي توضع فيها. كل قطعة مصمّمة خصيصاً لك.' },
  aboutP2:     { en:'Scandinavian precision meets Bahraini craft. We obsess over every millimetre and finish — so you never have to.', ar:'دقة إسكندنافية تلتقي بالحرفية البحرينية. نهتم بكل مليمتر وكل تشطيب — حتى لا تحتاج أنت لذلك.' },
  // contact
  startProject:{ en:'Start your project', ar:'ابدأ مشروعك' },
  email:       { en:'Email',        ar:'البريد الإلكتروني' },
  budgetRange: { en:'Budget range',  ar:'الميزانية التقريبية' },
  tellProject: { en:'Tell us about your project…', ar:'أخبرنا عن مشروعك…' },
  sendMessage: { en:'Send Message', ar:'إرسال الرسالة' },
  msgReceived: { en:'Message received', ar:'تم استلام رسالتك' },
  // checkout / cart
  checkout:    { en:'Checkout',     ar:'إتمام الطلب' },
  summary:     { en:'Summary',      ar:'الملخّص' },
  address:     { en:'Address',      ar:'العنوان' },
  notes:       { en:'Notes…',       ar:'ملاحظات…' },
  placeOrder:  { en:'Place Order',  ar:'تأكيد الطلب' },
  orderPlaced: { en:'Order placed', ar:'تم تأكيد الطلب' },
  backHome:    { en:'Back to Home', ar:'العودة للرئيسية' },
  cart:        { en:'Cart',         ar:'السلة' },
  yourCart:    { en:'Your Cart',    ar:'سلتك' },
  cartEmpty:   { en:'Your cart is empty', ar:'سلتك فارغة' },
  addToCart:   { en:'Add to Cart',  ar:'أضف إلى السلة' },
};
function useI18n() {
  const ctx = useContext(AppCtx);
  const lang = ctx?.lang || 'en';
  const t = (key) => (I18N[key] ? (I18N[key][lang] || I18N[key].en) : key);
  return { lang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' };
}

function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
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
    <div style={{ position: 'fixed', bottom: mobile ? 90 : 28, left: mobile ? 16 : 'auto', right: mobile ? 16 : 28, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map(t => (
        <div key={t.id} style={{ background: c[t.type], color: '#fff', padding: '13px 18px', borderRadius: 14, fontSize: 14, boxShadow: '0 4px 24px rgba(0,0,0,.18)', animation: 'toastIn .25s ease' }}>{t.msg}</div>
      ))}
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; -webkit-tap-highlight-color: transparent; }
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
    width: 600px; height: 600px; background: #8b5cf6;
    top: -100px; right: -200px;
    animation: blob2 22s ease-in-out infinite;
  }
  .blob-3 {
    width: 500px; height: 500px; background: #06b6d4;
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
    background: linear-gradient(90deg, transparent, rgba(249,115,22,0.04), transparent);
    animation: shimmer 6s ease-in-out infinite;
    pointer-events: none; z-index: 0;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 200%; }
  }
  /* Banner strip */
  .banner-strip {
    background: linear-gradient(90deg, #1d1d1f, #2d2d2f, #1d1d1f);
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
  body { background: #fff; color: #1d1d1f; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; -webkit-font-smoothing: antialiased; overscroll-behavior: none; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #d2d2d7; border-radius: 2px; }
  input, select, textarea, button { font-family: inherit; }
  @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .reveal { opacity: 0; transform: translateY(16px); transition: opacity .5s cubic-bezier(.25,.46,.45,.94), transform .5s cubic-bezier(.25,.46,.45,.94); }
  .reveal.vis { opacity: 1; transform: translateY(0); }
  .inp { background: #f5f5f7; border: 1.5px solid transparent; border-radius: 12px; padding: 13px 16px; font-size: 16px; color: #1d1d1f; width: 100%; transition: all .2s; -webkit-appearance: none; }
  .inp:focus { outline: none; background: #fff; border-color: var(--clay); box-shadow: 0 0 0 4px rgba(249,115,22,.1); }
  .inp::placeholder { color: #86868b; }
  .btn { background: var(--clay); color: #fff; border: none; border-radius: 14px; padding: 15px 24px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 50px; -webkit-tap-highlight-color: transparent; }
  .btn:active { transform: scale(.97); background: var(--clay-deep); }
  .btn-sm { background: var(--clay); color: #fff; border: none; border-radius: 12px; padding: 11px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; }
  .btn-sm:active { transform: scale(.97); background: var(--clay-deep); }
  .btn-secondary { background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 14px; padding: 15px 24px; font-size: 16px; font-weight: 500; cursor: pointer; transition: all .15s; min-height: 50px; }
  .btn-secondary:active { background: #e8e8ed; transform: scale(.97); }
  .btn-ghost { background: transparent; border: 1.5px solid #e6e6e6; border-radius: 14px; padding: 14px 22px; font-size: 15px; font-weight: 500; cursor: pointer; color: #1d1d1f; transition: all .15s; }
  .card { background: #fff; border-radius: 20px; border: 1px solid #e6e6e6; overflow: hidden; }
  /* ── Editorial-luxury design tokens (Home redesign) ── */
  :root { --ink:#211c18; --ink-soft:#4a423b; --muted:#8a7f72; --cream:#f7f2ec; --sand:#efe7dc; --line:#e6ddd1; --clay:#F2731C; --clay-deep:#C2410C; }
  .display { font-family:'Fraunces',Georgia,'Times New Roman',serif; font-weight:600; letter-spacing:-.02em; line-height:1.04; }
  .eyebrow { font-size:12px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--clay); }
  .btn-clay { background:var(--clay); color:#fff; border:none; border-radius:14px; padding:15px 26px; font-size:16px; font-weight:600; cursor:pointer; transition:transform .15s, background .2s, box-shadow .2s; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:50px; box-shadow:0 12px 26px -14px rgba(176,97,59,.7); }
  .btn-clay:active { transform:scale(.97); }
  .btn-ink { background:var(--ink); color:#fff; border:none; border-radius:14px; padding:15px 26px; font-size:16px; font-weight:600; cursor:pointer; transition:transform .15s, opacity .2s; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:50px; }
  .btn-ink:active { transform:scale(.97); }
  .btn-line { background:transparent; color:var(--ink); border:1px solid var(--ink); border-radius:14px; padding:14px 24px; font-size:15px; font-weight:500; cursor:pointer; transition:all .2s; min-height:50px; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
  .lift { transition: transform .45s cubic-bezier(.22,1,.36,1), box-shadow .45s; }
  .tile-zoom { overflow:hidden; }
  .tile-zoom > img, .tile-zoom > .tz { transition: transform .9s cubic-bezier(.22,1,.36,1); }
  @media (min-width:768px){
    .btn-clay:hover { background:var(--clay-deep); box-shadow:0 18px 32px -14px rgba(143,76,45,.7); transform:translateY(-1px); }
    .btn-ink:hover { opacity:.88; transform:translateY(-1px); }
    .btn-line:hover { background:var(--ink); color:#fff; }
    .lift:hover { transform:translateY(-4px); box-shadow:0 26px 52px -26px rgba(33,28,24,.38); }
    .tile-zoom:hover > img, .tile-zoom:hover > .tz { transform:scale(1.06); }
  }
  select.inp { background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%2386868b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; appearance: none; -webkit-appearance: none; }
  /* ── Cinematic scroll animations (Home) ── */
  @media (prefers-reduced-motion: reduce){ .kenburns{ animation:none !important; } .marquee{ animation:none !important; } }
  .rv { opacity:0; transform:translateY(34px); transition:opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1); transition-delay:var(--d,0s); will-change:opacity,transform; }
  .rv.vis { opacity:1; transform:none; }
  .rv-l { opacity:0; transform:translateX(-44px); transition:opacity 1s cubic-bezier(.22,1,.36,1), transform 1s cubic-bezier(.22,1,.36,1); transition-delay:var(--d,0s); }
  .rv-l.vis { opacity:1; transform:none; }
  .rv-r { opacity:0; transform:translateX(44px); transition:opacity 1s cubic-bezier(.22,1,.36,1), transform 1s cubic-bezier(.22,1,.36,1); transition-delay:var(--d,0s); }
  .rv-r.vis { opacity:1; transform:none; }
  .rv-sc { opacity:0; transform:scale(.92); transition:opacity 1.1s cubic-bezier(.22,1,.36,1), transform 1.1s cubic-bezier(.22,1,.36,1); transition-delay:var(--d,0s); }
  .rv-sc.vis { opacity:1; transform:none; }
  .rv-words .w { display:inline-block; opacity:0; transform:translateY(42px); transition:opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
  .rv-words.vis .w { opacity:1; transform:none; }
  .kenburns { animation: kenburns 24s ease-in-out infinite alternate; will-change:transform; }
  @keyframes kenburns { 0%{ transform:scale(1.05) translate(0,0);} 100%{ transform:scale(1.18) translate(-2%,-1.5%);} }
  .scroll-cue { width:26px; height:42px; border:1.5px solid rgba(255,255,255,.65); border-radius:16px; position:relative; }
  .scroll-cue::after { content:''; position:absolute; left:50%; top:7px; width:3px; height:8px; background:#fff; border-radius:2px; transform:translateX(-50%); animation:cue 1.9s ease-in-out infinite; }
  @keyframes cue { 0%,100%{ opacity:0; transform:translate(-50%,0);} 40%{ opacity:1;} 80%{ opacity:0; transform:translate(-50%,13px);} }
  .marquee-wrap { overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
  .marquee { display:flex; gap:56px; width:max-content; animation:marquee 34s linear infinite; align-items:center; }
  .marquee-wrap:hover .marquee { animation-play-state:paused; }
  @keyframes marquee { to { transform:translateX(-50%); } }
  .glass { background:rgba(247,242,236,.72); backdrop-filter:blur(18px) saturate(1.4); -webkit-backdrop-filter:blur(18px) saturate(1.4); }
  .hscroll { display:flex; gap:22px; overflow-x:auto; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; padding:4px 0 14px; scrollbar-width:none; }
  .hscroll::-webkit-scrollbar{ display:none; }
  .hscroll > * { scroll-snap-align:center; flex:0 0 auto; }
  #scrollProgress { position:fixed; top:0; left:0; height:3px; background:var(--clay); z-index:1200; width:0; transition:width .08s linear; }
  .par { will-change:transform; }
  @media (max-width: 767px) {
    .hide-mobile { display: none !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .grid-3 { grid-template-columns: 1fr 1fr !important; }
    .grid-4 { grid-template-columns: 1fr 1fr !important; }
  }
  @media (min-width: 768px) {
    .hide-desktop { display: none !important; }
    .btn:hover { background: var(--clay-deep); opacity: .9; }
    .card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.08); transform: translateY(-2px); }
    .card { transition: box-shadow .3s, transform .3s; }
  }

  /* ── ui-ux-pro-max: site-wide UX baseline ── */
  /* Accessibility: visible keyboard focus on every interactive element (CRITICAL) */
  a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible,
  textarea:focus-visible, [role="button"]:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid var(--clay); outline-offset: 2px; border-radius: 4px;
  }
  :focus:not(:focus-visible) { outline: none; }
  /* Touch & interaction: remove 300ms tap delay, kill grey tap flash, comfortable targets */
  a, button, [role="button"], input[type="submit"], label { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  button:not(:disabled), a[href], [role="button"] { cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  /* Smooth in-page navigation + anchor offset for the fixed header */
  html { scroll-behavior: smooth; }
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
  }
`;

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } }), { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal, .rv, .rv-l, .rv-r, .rv-sc, .rv-words').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

/* ── NAV (desktop) + BOTTOM TAB BAR (mobile) ── */
function Nav({ page, setPage, cart, setCartOpen, user, openAuth, siteLogo, lang, setLang }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = useMobile();
  const tr = (k) => (I18N[k] ? (I18N[k][lang] || I18N[k].en) : k);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 20); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);

  const DOCK = [
    { id:'home', label:'Home', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id:'products', label:'Gallery', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id:'planner', label:'Design', fab:true, icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> },
    { id:'services', label:'Services', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-.5-.5-2z"/></svg> },
    { id:'menu', label:'Menu', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> },
  ];
  const go = (id) => { if (id==='menu') setMenuOpen(true); else { setPage(id); setMenuOpen(false); } };
  const ALL_LINKS = [['home','Home'],['products','Gallery'],['projects','Projects'],['planner','Design'],['ai','AI Designer'],['services','Services'],['showrooms','Showrooms'],['directory','Directory'],['blog','Inspiration'],['contact','Contact']];

  return (<>
    {/* Slim top bar — logo + actions */}
    <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:900, height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding: mobile?'0 16px':'0 32px', background: scrolled?'rgba(247,242,236,.92)':'rgba(247,242,236,.72)', backdropFilter:'blur(18px) saturate(180%)', borderBottom: scrolled?'1px solid var(--line)':'1px solid transparent', transition:'all .3s' }}>
      <button type="button" onClick={()=>{ setPage('home'); setMenuOpen(false); }} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
        {siteLogo
          ? <img src={siteLogo} alt="The Closets" style={{ height:32, width:'auto', maxWidth:120, objectFit:'contain', borderRadius:6 }} />
          : <span style={{ fontFamily:'Fraunces, Georgia, serif', fontSize:16, fontWeight:600, color:'var(--ink)', letterSpacing:'.02em' }}>THE CLOSETS</span>}
      </button>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {!mobile && <button type="button" onClick={()=>setPage('booking')} style={{ background:'var(--clay)', border:'none', borderRadius:980, padding:'8px 16px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer' }}>Book a visit</button>}
        <button type="button" onClick={()=>setLang(lang==='ar'?'en':'ar')} title="Language" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:980, padding:'7px 13px', fontSize:13, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{lang==='ar'?'EN':'ع'}</button>
        {user ? <button type="button" onClick={()=>setPage('portal')} style={{ background:'rgba(242,115,28,.12)', border:'none', borderRadius:980, padding:'7px 14px', fontSize:13, fontWeight:500, color:'var(--clay-deep)', cursor:'pointer' }}>{user.name?.split(' ')[0]}</button>
          : <button type="button" onClick={()=>openAuth('login')} style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:980, padding:'7px 14px', fontSize:13, fontWeight:500, color:'var(--ink)', cursor:'pointer' }}>{tr('signIn')}</button>}
        <button type="button" onClick={()=>setCartOpen(true)} aria-label="Cart" style={{ position:'relative', background: cart.length>0?'var(--clay)':'#fff', border:'1px solid var(--line)', borderRadius:980, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: cart.length>0?'#fff':'var(--ink)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cart.length>0 && <span style={{ position:'absolute', top:-4, right:-4, background:'var(--ink)', color:'#fff', borderRadius:999, fontSize:10, fontWeight:700, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{cart.length}</span>}
        </button>
      </div>
    </nav>

    {/* Floating bottom dock */}
    <div style={{ position:'fixed', bottom: mobile?'calc(14px + env(safe-area-inset-bottom))':18, left:'50%', transform:'translateX(-50%)', zIndex:900, display:'flex', alignItems:'flex-end', gap: mobile?16:24, background:'rgba(255,255,255,.92)', backdropFilter:'blur(18px) saturate(180%)', border:'1px solid rgba(0,0,0,.06)', borderRadius:999, padding: mobile?'7px 18px':'8px 24px', boxShadow:'0 10px 34px rgba(33,28,24,.16)' }}>
      {DOCK.map(d => {
        const active = page===d.id;
        if (d.fab) return (
          <button type="button" key={d.id} onClick={()=>go(d.id)} aria-label={d.label} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ width:46, height:46, borderRadius:'50%', background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:-24, border:'3px solid #fff', boxShadow:'0 6px 16px rgba(242,115,28,.45)' }}>{d.icon}</span>
            <span style={{ fontSize:10.5, fontWeight:600, color:'var(--clay-deep)' }}>{d.label}</span>
          </button>
        );
        return (
          <button type="button" key={d.id} onClick={()=>go(d.id)} aria-label={d.label} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: active?'var(--clay)':'#86868b' }}>
            {d.icon}
            <span style={{ fontSize:10.5, fontWeight: active?600:400 }}>{d.label}</span>
          </button>
        );
      })}
    </div>

    {/* Menu sheet */}
    {menuOpen && (
      <div onClick={()=>setMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(20,16,12,.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:560, padding:'18px 20px calc(26px + env(safe-area-inset-bottom))', maxHeight:'80vh', overflow:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span className="display" style={{ fontSize:20, color:'var(--ink)' }}>Menu</span>
            <button type="button" aria-label="Close" onClick={()=>setMenuOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:22 }}>✕</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
            {ALL_LINKS.map(([p,label])=>(
              <button type="button" key={p} onClick={()=>go(p)} style={{ textAlign:'left', background: page===p?'var(--sand)':'#fff', border:'1px solid var(--line)', borderRadius:12, padding:'12px 14px', fontSize:14, fontWeight:500, color: page===p?'var(--clay-deep)':'var(--ink)', cursor:'pointer' }}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={()=>{ setPage('booking'); setMenuOpen(false); }} className="btn-clay" style={{ width:'100%', borderRadius:12 }}>Book a free visit</button>
        </div>
      </div>
    )}
  </>);
}

/* ── HERO ── */
// ── Home redesign helpers (editorial-luxury) ──────────────────────────
const HOME_IMG = {
  // Brand story imagery — generated for The Closets (warm walnut, brass, soft daylight).
  hero:    'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_154323_ed082b3f-44ad-4a97-9ca4-278b83a6e9f6.png',
  heroVideo: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_144509_89e2d612-8af2-45c3-90f4-4831bc60715d.mp4',
  walkin:  'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_160149_897b07fc-8a2a-4e1d-8a77-e77cacffa5b0.png',
  kitchen: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_154428_5823e707-b25e-41bc-b372-6acd7166bddf.png',
  wardrobe:'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1400&q=80',
  living:  'https://d8j0ntlcm91z4.cloudfront.net/user_3FiawGElGuExhG0HJqw6pNPgWpT/hf_20260627_155945_016fe59a-81d0-465d-9f96-1a674fd99b99.png',
  detail:  'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80',
};
// Image with graceful warm-gradient fallback (so a missing/blocked photo never looks broken).
function Photo({ src, alt = '', style, className = '', imgClass = '', par }) {
  const [err, setErr] = useState(false);
  const cls = (className + (par ? ' par' : '')).trim();
  const dpr = par ? { 'data-par': par } : {};
  if (err) return <div className={cls} {...dpr} role="img" aria-label={alt} style={{ ...style, background: 'linear-gradient(135deg,var(--sand),#d8ccbb)' }} />;
  return <div className={cls} {...dpr} style={{ ...style, overflow: 'hidden' }}>
    <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} className={imgClass} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  </div>;
}
// Animated count-up statistic.
function Stat({ to, suffix = '', label }) {
  const ref = useRef(null); const [v, setV] = useState(0); const done = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !done.current) { done.current = true; const dur = 1500, t0 = performance.now();
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
      document.querySelectorAll('.par').forEach(el => {
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
  useEffect(() => { if (items.length < 2) return; const id = setInterval(() => setI(x => (x + 1) % items.length), 5500); return () => clearInterval(id); }, [items.length]);
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
  const mobile = useMobile();
  const [bannerIdx, setBannerIdx] = useState(0);
  const heroRef = useRef(null);
  useEffect(() => {
    if (!banners || banners.length < 2) return;
    const id = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners]);
  const banner = banners?.[bannerIdx];
  const onHeroMove = (e) => { const el = heroRef.current; if (!el || mobile) return; const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; const img = el.querySelector('.hero-img'); if (img) img.style.transform = `scale(1.14) translate(${x * -16}px, ${y * -16}px)`; };
  const HWORDS = ['Made', 'to', 'fit', 'your', 'life.'];

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
                <button key={i} type="button" onClick={() => setBannerIdx(i)} aria-label={'Show announcement ' + (i + 1)}
                  style={{ width: i === bannerIdx ? 16 : 5, height: 5, borderRadius: 10, background: i === bannerIdx ? 'var(--clay)' : 'rgba(255,255,255,.3)', border: 'none', cursor: 'pointer', transition: 'all .3s', padding: 0 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cinematic hero ── */}
      <section ref={heroRef} onMouseMove={onHeroMove} style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', background: '#15110e' }}>
        <video className="hero-img" autoPlay muted loop playsInline preload="auto" poster={HOME_IMG.hero} aria-label="Bespoke interiors by The Closets" style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
          <source src={HOME_IMG.heroVideo} type="video/mp4" />
        </video>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(20,16,12,.34) 0%, rgba(20,16,12,.12) 38%, rgba(20,16,12,.82) 100%)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', mixBlendMode: 'overlay', opacity: .07, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1280, margin: '0 auto', padding: mobile ? '120px 24px 72px' : '0 48px 88px' }}>
          <div className="rv eyebrow" style={{ color: '#E7BBA0', marginBottom: 18 }}>Bespoke furniture · Kingdom of Bahrain</div>
          <h1 className="display rv-words" style={{ color: '#fff', fontSize: mobile ? 'clamp(42px,12.5vw,60px)' : 'clamp(64px,7.2vw,112px)', maxWidth: 1040, marginBottom: 24 }}>
            {HWORDS.map((w, i) => <span key={i} className="w" style={{ transitionDelay: (.12 + i * .11) + 's', marginRight: '.26em' }}>{w}</span>)}
          </h1>
          <p className="rv" style={{ '--d': '.5s', color: 'rgba(255,255,255,.84)', fontSize: mobile ? 17 : 21, fontWeight: 300, lineHeight: 1.6, maxWidth: 540, marginBottom: 34 }}>
            Walk-in closets, kitchens and storage — handcrafted in our own Bahrain workshop and designed around the way you live.
          </p>
          <div className="rv" style={{ '--d': '.66s', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn-clay" onClick={() => setPage('planner')} style={{ fontSize: 16, padding: '16px 30px' }}>Design yours →</button>
            <button type="button" onClick={() => setPage('products')} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.45)', borderRadius: 14, padding: '15px 28px', fontSize: 16, fontWeight: 500, cursor: 'pointer', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', minHeight: 50 }}>View collection</button>
          </div>
        </div>
        {!mobile && <div className="scroll-cue" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }} />}
      </section>
    </>
  );
}

function ProductCard({ product: p, setPage, addToCart, setConfigProduct }) {
  return (
    <div className="rv lift" onClick={() => setPage('product-' + p.id)} style={{ cursor: 'pointer', background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)' }}>
      <div className="tile-zoom" style={{ position: 'relative', aspectRatio: '4/5' }}>
        <Photo src={p.image_url || HOME_IMG.wardrobe} alt={p.name} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
        {p.badge && <span style={{ position: 'absolute', top: 12, left: 12, background: 'var(--clay)', color: '#fff', padding: '4px 11px', borderRadius: 980, fontSize: 11, fontWeight: 600, letterSpacing: '.02em' }}>{p.badge}</span>}
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{p.category || 'Bespoke'}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{p.name}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--clay)', whiteSpace: 'nowrap' }}>{fmt(p.price)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={e => { e.stopPropagation(); addToCart(p); toast('Added to cart ✓', 'success'); }} style={{ flex: 1, background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>Add to cart</button>
          <button type="button" title="Customise this piece" aria-label="Customise this piece" onClick={e => { e.stopPropagation(); setPage('planner'); }} style={{ background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', fontSize: 15, cursor: 'pointer', minHeight: 44, color: 'var(--ink)' }}>✦</button>
        </div>
      </div>
    </div>
  );
}

/* ── GALLERY ── */
function ProductsPage({ products, setPage, addToCart, setConfigProduct }) {
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const mobile = useMobile();
  useReveal();
  const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => (cat === 'All' || p.category === cat) && (!search || p.name?.toLowerCase().includes(search.toLowerCase())));
  return (
    <div style={{ minHeight: '100dvh', paddingTop: mobile ? 72 : 104, paddingBottom: mobile ? 90 : 60, background: 'var(--cream)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: mobile ? '8px 24px 0' : '24px 48px 0' }}>
        <div className="rv" style={{ marginBottom: 28, maxWidth: 660 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>The collection</div>
          <h1 className="display" style={{ fontSize: mobile ? 38 : 60, color: 'var(--ink)', marginBottom: 14 }}>Every piece, made to measure.</h1>
          <p style={{ fontSize: mobile ? 16 : 18, color: 'var(--ink-soft)', lineHeight: 1.7 }}>Browse a selection of our kitchens, wardrobes, walk-ins and storage — each one designed, built and fitted in Bahrain.</p>
        </div>
        <div className="rv" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 30 }}>
          <div style={{ flex: mobile ? '1 1 100%' : '0 0 280px' }}>
            <input className="inp" placeholder="Search collection…" aria-label="Search collection" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 15, background: '#fff', border: '1px solid var(--line)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {cats.map(c => (
              <button type="button" key={c} onClick={() => setCat(c)} style={{ padding: '9px 18px', borderRadius: 980, border: '1px solid ' + (cat === c ? 'var(--clay)' : 'var(--line)'), background: cat === c ? 'var(--clay)' : 'transparent', color: cat === c ? '#fff' : 'var(--ink-soft)', fontSize: 13.5, fontWeight: cat === c ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 38, flexShrink: 0, transition: 'all .2s' }}>{c}</button>
            ))}
          </div>
          <div className="hide-mobile" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} piece{filtered.length === 1 ? '' : 's'}</div>
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}><div className="display" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 8 }}>Nothing here yet</div><div>Try a different category or search.</div></div>
          : <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 22, paddingBottom: 40 }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />)}
            </div>
        }
      </div>
    </div>
  );
}

/* ── PRODUCT DETAIL ── */
function ProductDetailPage({ productId, products, setPage, addToCart, setConfigProduct }) {
  const product = products.find(p => p.id === productId);
  const [qty, setQty] = useState(1);
  const mobile = useMobile();
  const [aiRecIds, setAiRecIds] = useState([]);
  useReveal();
  useEffect(() => {
    if (!product) return; let alive = true;
    fetch(SUPA_URL + '/functions/v1/recommend_products', { method:'POST', headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json' }, body: JSON.stringify({ product_id: product.id, category: product.category }) })
      .then(r => r.json()).then(d => { if (alive && d && d.ok && Array.isArray(d.items)) setAiRecIds(d.items.map(i => i.id)); }).catch(() => {});
    return () => { alive = false; };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!product) return <div style={{ padding: '100px 24px', textAlign: 'center' }}><button type="button" className="btn-secondary" onClick={() => setPage('products')}>← Back</button></div>;
  const localRelated = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, mobile ? 2 : 3);
  const aiRelated = aiRecIds.map(id => products.find(p => p.id === id)).filter(p => p && p.id !== product.id);
  const related = aiRelated.length ? aiRelated.slice(0, mobile ? 2 : 3) : localRelated;
  const recLabel = aiRelated.length ? 'Recommended for you ✦' : 'You may also like';
  return (
    <div style={{ minHeight: '100dvh', paddingTop: mobile ? 0 : 96, paddingBottom: mobile ? 100 : 60, background: 'var(--cream)' }}>
      {mobile && (
        <div style={{ position: 'relative' }}>
          <Photo src={product.image_url || HOME_IMG.wardrobe} alt={product.name} style={{ aspectRatio: '1/1' }} />
          <button type="button" onClick={() => setPage('products')} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>
      )}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: mobile ? '24px 16px' : '40px 40px 80px' }}>
        {!mobile && <button type="button" onClick={() => setPage('products')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#86868b', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}>← Collection</button>}
        {!mobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 64, marginBottom: 90, alignItems: 'center' }}>
            <Photo src={product.image_url || HOME_IMG.wardrobe} alt={product.name} className="rv-l tile-zoom" imgClass="tz" style={{ borderRadius: 24, aspectRatio: '1/1' }} />
            <ProductInfo product={product} qty={qty} setQty={setQty} addToCart={addToCart} setConfigProduct={setConfigProduct} setPage={setPage} mobile={false} />
          </div>
        ) : (
          <ProductInfo product={product} qty={qty} setQty={setQty} addToCart={addToCart} setConfigProduct={setConfigProduct} setPage={setPage} mobile={true} />
        )}
        <ProductAR product={product} mobile={mobile} />
        {related.length > 0 && (
          <div>
            <h2 className="display" style={{ fontSize: mobile ? 22 : 30, color: 'var(--ink)', marginBottom: 20 }}>{recLabel}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 18 }}>
              {related.map(p => <ProductCard key={p.id} product={p} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductAR({ product, mobile }) {
  if (!product || !product.model_url) return null;
  return (
    <div style={{ marginBottom: mobile ? 56 : 80 }}>
      <h2 className="display" style={{ fontSize: mobile ? 24 : 32, color: 'var(--ink)', marginBottom: 16 }}>See it in 3D &amp; your room</h2>
      {createElement('model-viewer', {
        src: product.model_url,
        'ios-src': product.ar_ios_url || undefined,
        ar: true, 'ar-modes': 'webxr scene-viewer quick-look',
        'camera-controls': true, 'auto-rotate': true, 'shadow-intensity': '1',
        poster: product.image_url || undefined, alt: product.name,
        style: { width: '100%', height: mobile ? 320 : 480, background: 'var(--sand)', borderRadius: 20 },
      },
        createElement('button', { slot: 'ar-button', key: 'arbtn', style: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--clay)', color: '#fff', border: 'none', borderRadius: 980, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' } }, '📱 View in your room')
      )}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Drag to rotate · on a phone tap “View in your room” for AR. Representative model — your exact unit is finalised at your free design visit.</div>
    </div>
  );
}
function ProductInfo({ product, qty, setQty, addToCart, setConfigProduct, setPage, mobile }) {
  return (
    <div className={mobile ? '' : 'rv-r'}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{product.category || 'Bespoke'}</div>
      <h1 className="display" style={{ fontSize: mobile ? 30 : 46, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.08 }}>{product.name}</h1>
      <div style={{ fontSize: mobile ? 24 : 30, fontWeight: 700, color: 'var(--clay)', marginBottom: 20 }}>{fmt(product.price)}</div>
      {product.description && <p style={{ fontSize: mobile ? 15 : 16.5, color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: 26 }}>{product.description}</p>}
      <div style={{ background: 'var(--sand)', borderRadius: 16, marginBottom: 26, border: '1px solid var(--line)' }}>
        {[['Materials', product.materials], ['Lead time', product.lead_time], ['SKU', product.sku]].filter(([,v]) => v).map(([k, v], i, arr) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span style={{ fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</span>
            <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', padding: '13px 18px', fontSize: 20, cursor: 'pointer', color: 'var(--ink)', minWidth: 50 }}>−</button>
          <span style={{ padding: '13px 16px', fontSize: 16, fontWeight: 600, color: 'var(--ink)', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', minWidth: 48, textAlign: 'center' }}>{qty}</span>
          <button type="button" onClick={() => setQty(q => q + 1)} style={{ background: 'none', border: 'none', padding: '13px 18px', fontSize: 20, cursor: 'pointer', color: 'var(--ink)', minWidth: 50 }}>+</button>
        </div>
        <button type="button" className="btn-clay" style={{ flex: 1, minWidth: 180 }} onClick={() => { for (let i = 0; i < qty; i++) addToCart(product); toast(`${qty} item${qty>1?'s':''} added ✓`, 'success'); }}>Add to cart</button>
        <button type="button" className="btn-line" title="Customise this piece" aria-label="Customise this piece" style={{ padding: '13px 18px' }} onClick={() => setPage('planner')}>✦</button>
      </div>
      <button type="button" onClick={() => setPage('contact')} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}>Book a free design consultation →</button>
    </div>
  );
}

/* ── CART DRAWER ── */
function CartDrawer({ cart, setCart, open, setOpen, setPage }) {
  const total = cart.reduce((s, i) => s + parseFloat(i.price || 0), 0);
  const mobile = useMobile();
  const { t } = useI18n();
  return (
    <>
      <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', transition: 'opacity .3s', backdropFilter: 'blur(4px)' }} />
      <div style={mobile ? { position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 1001, transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .4s cubic-bezier(.25,.46,.45,.94)', display: 'flex', flexDirection: 'column', maxHeight: '90svh', borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom)' }
        : { position: 'fixed', right: 0, top: 0, bottom: 0, width: 400, background: '#fff', zIndex: 1001, transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .35s cubic-bezier(.25,.46,.45,.94)', display: 'flex', flexDirection: 'column' }}>
        {mobile && <div style={{ width: 36, height: 4, background: '#e6e6e6', borderRadius: 2, margin: '12px auto 0' }} />}
        <div style={{ padding: mobile ? '16px 20px' : '22px 26px', borderBottom: '1px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>Cart {cart.length > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: '#86868b' }}>({cart.length})</span>}</div>
          <button type="button" aria-label="Close cart" onClick={() => setOpen(false)} style={{ background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#86868b', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: mobile ? '16px 20px' : '20px 26px', WebkitOverflowScrolling: 'touch' }}>
          {cart.length === 0
            ? <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 48, opacity: .15, marginBottom: 12 }}>◻</div>
                <div style={{ fontSize: 15, color: '#86868b', marginBottom: 18 }}>Your cart is empty</div>
                <button type="button" className="btn-secondary" style={{ borderRadius: 980 }} onClick={() => { setOpen(false); setPage('products'); }}>Browse Collection</button>
              </div>
            : cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f5f5f7' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: '#f5f5f7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image_url ? <img src={item.image_url} alt={item.name || item.product_name || 'Cart item'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22, opacity: .3 }}>◻</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#86868b', marginBottom: 4 }}>{item.category}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>{fmt(item.price)}</div>
                  </div>
                  <button type="button" aria-label="Remove item" onClick={() => setCart(c => c.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868b', padding: '4px', alignSelf: 'flex-start', fontSize: 16 }}>✕</button>
                </div>
              ))
          }
        </div>
        {cart.length > 0 && (
          <div style={{ padding: mobile ? '16px 20px 24px' : '18px 26px', borderTop: '1px solid #f5f5f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 16, color: '#6e6e73' }}>{t('total')}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f' }}>{fmt(total)}</span>
            </div>
            <button type="button" className="btn" style={{ width: '100%', borderRadius: 16 }} onClick={() => { setOpen(false); setPage('checkout'); }}>Checkout</button>
            <div style={{ fontSize: 12, color: '#86868b', textAlign: 'center', marginTop: 10 }}>Free delivery across Bahrain</div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── PRODUCT CATALOG (planner step 1) ── */
const PLANNER_PRODUCTS = [
  { id:'wardrobe', name:'Wardrobe', sub:'Reach-in & built-in', icon:'M4 3h16v18h-16z M12 3v18 M9 8v3 M15 8v3', ready:true,
    layouts:[{id:'single',label:'Single wall',desc:'One straight run'},{id:'l-shape',label:'L-shaped',desc:'Two sides, corner'},{id:'walk-in',label:'Walk-in',desc:'Dressing room'},{id:'sliding',label:'Sliding doors',desc:'Space-saving'}] },
  { id:'kitchen', name:'Kitchen', sub:'Wall · L · U · island', icon:'M3 3h18v18h-18z', ready:false,
    layouts:[{id:'wall',label:'Wall',desc:'Single run'},{id:'l-shape',label:'L-shaped',desc:'Corner'},{id:'u-shape',label:'U-shaped',desc:'Three sides'},{id:'island',label:'Island',desc:'With centre island'}] },
  { id:'tv', name:'TV Unit', sub:'Floating & full-wall', icon:'M2 6h20v12h-20z', ready:false,
    layouts:[{id:'floating',label:'Floating',desc:'Wall-mounted'},{id:'floor',label:'Floor',desc:'Standing'},{id:'full-wall',label:'Full-wall',desc:'With towers'}] },
  { id:'doors', name:'Doors', sub:'Hinged · sliding', icon:'M5 3h14v18h-14z', ready:false,
    layouts:[{id:'hinged',label:'Hinged',desc:'Classic swing'},{id:'sliding',label:'Sliding',desc:'Space-saving'},{id:'folding',label:'Folding',desc:'Bi-fold'}] },
  { id:'walkin', name:'Walk-in Closet', sub:'Dressing room', icon:'M4 3h16v18h-16z', ready:false,
    layouts:[{id:'u-shape',label:'U-shape',desc:'Three walls'},{id:'l-shape',label:'L-shape',desc:'Two walls'},{id:'parallel',label:'Parallel',desc:'Two facing runs'}] },
  { id:'storage', name:'Storage / Office', sub:'Shelving & cabinets', icon:'M3 4h18v16h-18z', ready:false,
    layouts:[{id:'open',label:'Open',desc:'Shelving'},{id:'closed',label:'Closed',desc:'Cabinets'},{id:'mixed',label:'Mixed',desc:'Open + closed'}] },
];

// Load three.js once from CDN; returns true when window.THREE is ready.
function useThreeLoaded() {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.THREE);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || window.THREE) { setReady(true); return; }
    let s = document.getElementById('three-cdn');
    const onLoad = () => setReady(true);
    const onErr = () => setFailed(true);
    const timer = setTimeout(() => { if (!window.THREE) setFailed(true); }, 9000);
    if (!s) {
      s = document.createElement('script');
      s.id = 'three-cdn';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener('load', onLoad);
    s.addEventListener('error', onErr);
    return () => { clearTimeout(timer); if (s) { s.removeEventListener('load', onLoad); s.removeEventListener('error', onErr); } };
  }, []);
  return { ready, failed };
}

// Live 3D wardrobe preview. Recolours/reshapes from props; drag to rotate.
function Wardrobe3D({ finishHex, layout, glass, handles, led, mobile, fallback, tall, widthCm, heightCm, depthCm, sideACm, sideBCm, product, apiRef, unit = 'cm', preset = 'iso', scaleMode = 'fit' }) {
  const { ready, failed } = useThreeLoaded();
  const mountRef = useRef(null);
  const stateRef = useRef({ finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, sideACm, sideBCm, product, unit, scaleMode });
  const sceneRef = useRef(null);
  useEffect(() => { stateRef.current = { finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, sideACm, sideBCm, product, unit, scaleMode }; if (sceneRef.current) sceneRef.current.rebuild(); }, [finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, sideACm, sideBCm, product, unit, scaleMode]);
  // Camera preset changes are applied imperatively (no rebuild needed).
  // Unit changes flow through the stateRef effect above (rebuild regenerates labels).
  useEffect(() => { if (sceneRef.current && sceneRef.current.setPreset) sceneRef.current.setPreset(preset); }, [preset]);

  useEffect(() => {
    if (!ready || !mountRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    // Measure after layout settles to avoid a 0/skewed aspect ratio
    let w = mount.clientWidth || 600, h = mount.clientHeight || 460;
    if (w < 50) w = 600; if (h < 50) h = 460;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100); camera.position.set(0, 0, 9);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    // ── Image-based lighting: soft studio environment (procedural, no asset) ──
    // Gives MeshStandardMaterial realistic reflections/sheen so wood & paint read as real.
    let envTex = null;
    try {
      const ec = document.createElement('canvas'); ec.width = 32; ec.height = 128;
      const eg = ec.getContext('2d');
      const grd = eg.createLinearGradient(0, 0, 0, 128);
      grd.addColorStop(0.00, '#ffffff'); grd.addColorStop(0.42, '#eef2f6');
      grd.addColorStop(0.62, '#d2dae1'); grd.addColorStop(0.80, '#b4bdc6'); grd.addColorStop(1.00, '#8e98a2');
      eg.fillStyle = grd; eg.fillRect(0, 0, 32, 128);
      const rgl = eg.createRadialGradient(16, 24, 2, 16, 24, 26); // overhead softbox highlight
      rgl.addColorStop(0, 'rgba(255,255,255,0.95)'); rgl.addColorStop(1, 'rgba(255,255,255,0)');
      eg.fillStyle = rgl; eg.fillRect(0, 0, 32, 60);
      const eTex = new THREE.CanvasTexture(ec);
      eTex.mapping = THREE.EquirectangularReflectionMapping; eTex.encoding = THREE.sRGBEncoding;
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromEquirectangular(eTex).texture;
      scene.environment = envTex; eTex.dispose(); pmrem.dispose();
    } catch (e) { /* IBL optional */ }

    // ── Lights: soft fill + warm key + cool rim for form definition ──
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb6c0ca, 0.5));
    const k = new THREE.DirectionalLight(0xffffff, 1.05); k.position.set(5, 8, 6); scene.add(k);
    const f = new THREE.DirectionalLight(0xfff2e6, 0.32); f.position.set(-6, 3, -4); scene.add(f);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.4); rim.position.set(0, 5, -8); scene.add(rim);

    // ── Procedural wood-grain micro-roughness (canvas, no asset) ──
    const grain = (() => {
      const gc = document.createElement('canvas'); gc.width = 256; gc.height = 256;
      const gx = gc.getContext('2d'); gx.fillStyle = '#9a9a9a'; gx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 240; i++) {
        const x = Math.random() * 256, a = 0.04 + Math.random() * 0.10, lite = Math.random() > 0.5 ? 235 : 70;
        gx.strokeStyle = `rgba(${lite},${lite},${lite},${a})`;
        gx.lineWidth = 0.5 + Math.random() * 1.5; gx.beginPath(); gx.moveTo(x, 0);
        gx.bezierCurveTo(x + (Math.random() * 8 - 4), 85, x + (Math.random() * 8 - 4), 170, x + (Math.random() * 6 - 3), 256); gx.stroke();
      }
      const tx = new THREE.CanvasTexture(gc); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 2); return tx;
    })();

    let group = null, raf = 0, drag = false, px = 0, py = 0, rotY = -0.5, rotX = 0.05;
    // interactive-configurator targets (smooth orbit + zoom)
    let zoom = 9, tRotY = -0.5, tRotX = 0.05, tZoom = 9, pinchD = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mat = (c) => {
      const col = new THREE.Color(c);
      const lum = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
      const metalHw = lum < 0.13; // near-black -> handle / hardware
      return new THREE.MeshStandardMaterial({
        color: col,
        roughness: metalHw ? 0.34 : 0.6,
        metalness: metalHw ? 0.85 : 0.0,
        roughnessMap: metalHw ? null : grain,
        envMapIntensity: metalHw ? 1.4 : 1.2,
      });
    };
    const box = (bw, bh, bd, m) => new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);

    function cabinet(W, H, D, doors, st) {
      const fin = st.finishHex || '#c89b5e';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.7));
      const doorMat = st.glass ? new THREE.MeshStandardMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0, envMapIntensity: 1.6 }) : mat(fin);
      const g = new THREE.Group();
      const back = box(W, H, 0.08, carc); back.position.z = -D / 2; g.add(back);
      [-1, 1].forEach(s => { const sd = box(0.08, H, D, carc); sd.position.x = s * W / 2; g.add(sd); });
      const t = box(W, 0.08, D, carc); t.position.y = H / 2; g.add(t);
      const b = t.clone(); b.position.y = -H / 2; g.add(b);
      const dw = W / doors;
      for (let i = 0; i < doors; i++) {
        const dx = -W / 2 + dw / 2 + i * dw;
        const dr = box(dw * 0.92, H * 0.94, 0.06, doorMat); dr.position.set(dx, 0, D / 2); g.add(dr);
        if (st.handles) { const hd = box(0.05, 0.45, 0.05, mat(0x1a1a1a)); hd.position.set(dx + (i < doors / 2 ? dw * 0.36 : -dw * 0.36), 0, D / 2 + 0.08); g.add(hd); }
      }
      if (st.led) { const l = box(W * 0.9, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff3d0 })); l.position.set(0, H / 2 - 0.08, D / 2 - 0.08); g.add(l); }
      return g;
    }
    function buildTV(st) {
      const fin = st.finishHex || '#c89b5e';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.72));
      const doorMat = st.glass ? new THREE.MeshStandardMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.45, roughness: 0.08, metalness: 0, envMapIntensity: 1.6 }) : mat(fin);
      const g = new THREE.Group();
      // wide low media console
      const W = Math.max(3.5, Math.min(8, (st.widthCm || 200) / 38));
      const D = Math.max(0.8, Math.min(1.6, (st.depthCm || 40) / 32));
      const consoleH = 1.1;
      const consoleY = st.layout === 'floor' ? -1.6 : -0.6; // floor stands lower
      const body = box(W, consoleH, D, mat(fin)); body.position.set(0, consoleY, 0); g.add(body);
      // cabinet doors / drawers across the console
      const cells = Math.max(2, Math.round(W / 1.6));
      const cw = W / cells;
      for (let i = 0; i < cells; i++) {
        const dx = -W / 2 + cw / 2 + i * cw;
        const dr = box(cw * 0.9, consoleH * 0.82, 0.06, doorMat); dr.position.set(dx, consoleY, D / 2 + 0.01); g.add(dr);
        if (st.handles) { const hd = box(cw * 0.3, 0.05, 0.05, mat(0x1a1a1a)); hd.position.set(dx, consoleY + consoleH * 0.28, D / 2 + 0.08); g.add(hd); }
      }
      // TV screen above
      const tvW = Math.min(W * 0.8, 4.2), tvH = tvW * 0.56;
      const screen = box(tvW, tvH, 0.08, mat(0x111114));
      const screenY = consoleY + consoleH / 2 + tvH / 2 + 0.5;
      screen.position.set(0, screenY, -0.1); g.add(screen);
      const bezelGlow = box(tvW * 0.96, tvH * 0.9, 0.02, new THREE.MeshBasicMaterial({ color: 0x1a2733 }));
      bezelGlow.position.set(0, screenY, -0.05); g.add(bezelGlow);
      // full-wall: side tower units
      if (st.layout === 'full-wall') {
        [-1, 1].forEach(s => {
          const towerH = tvH + consoleH + 1.4;
          const tower = box(1.1, towerH, D, mat(fin));
          tower.position.set(s * (W / 2 + 0.7), consoleY + towerH / 2 - consoleH / 2, 0); g.add(tower);
        });
      }
      // LED backlight glow behind the screen
      if (st.led) {
        const glow = box(tvW * 1.1, tvH * 1.1, 0.02, new THREE.MeshBasicMaterial({ color: 0xfff3d0 }));
        glow.position.set(0, screenY, -0.2); g.add(glow);
      }
      return g;
    }
    function buildDoors(st) {
      const fin = st.finishHex || '#c89b5e';
      const frameMat = mat(new THREE.Color(fin).multiplyScalar(0.6));
      const isGlass = st.glass;
      const doorMat = isGlass ? new THREE.MeshStandardMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0, envMapIntensity: 1.6 }) : mat(fin);
      const g = new THREE.Group();
      const W = Math.max(2.2, Math.min(5, (st.widthCm || 90) / 26));
      const H = Math.max(3.6, Math.min(5.6, (st.heightCm || 210) / 42));
      const D = 0.18;
      // door frame
      const fr = 0.18;
      [[-W/2, 0, fr, H], [W/2, 0, fr, H], [0, H/2, W + fr, fr], [0, -H/2, W + fr, fr]].forEach(([x, y, fw, fh]) => {
        const bar = box(fw, fh, 0.22, frameMat); bar.position.set(x, y, 0); g.add(bar);
      });
      const leaves = st.layout === 'sliding' ? 2 : (st.layout === 'folding' ? 3 : 2);
      const lw = W / leaves;
      for (let i = 0; i < leaves; i++) {
        const dx = -W / 2 + lw / 2 + i * lw;
        const z = st.layout === 'sliding' ? (i % 2 ? 0.12 : -0.02) : 0;
        const leaf = box(lw * 0.94, H * 0.96, D, doorMat); leaf.position.set(dx, 0, z); g.add(leaf);
        if (isGlass) { const pane = box(lw * 0.7, H * 0.78, 0.02, new THREE.MeshStandardMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0.4, roughness: 0.06, metalness: 0, envMapIntensity: 1.7 })); pane.position.set(dx, 0, z + D / 2); g.add(pane); }
        if (st.handles) { const hd = box(0.07, 0.7, 0.07, mat(0x1a1a1a)); hd.position.set(dx + (i < leaves / 2 ? lw * 0.34 : -lw * 0.34), 0, z + D / 2 + 0.06); g.add(hd); }
      }
      return g;
    }

    function buildKitchen(st) {
      const fin = st.finishHex || '#f3f3f1';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.85));
      const worktop = mat(0xe8e4dc);
      const g = new THREE.Group();
      const W = Math.max(4, Math.min(8.5, (st.widthCm || 300) / 42));
      const D = 1.4, baseH = 2.0, baseY = -1.4;
      function run(rw, x, z, ry) {
        const r = new THREE.Group();
        const body = box(rw, baseH, D, mat(fin)); body.position.y = baseY; r.add(body);
        const cells = Math.max(2, Math.round(rw / 1.5)), cw = rw / cells;
        for (let i = 0; i < cells; i++) { const dx = -rw / 2 + cw / 2 + i * cw; const dr = box(cw * 0.9, baseH * 0.88, 0.06, mat(new THREE.Color(fin).multiplyScalar(1.04))); dr.position.set(dx, baseY, D / 2 + 0.01); r.add(dr); if (st.handles) { const h = box(0.05, 0.4, 0.05, mat(0x1a1a1a)); h.position.set(dx, baseY + baseH * 0.3, D / 2 + 0.07); r.add(h); } }
        const ct = box(rw + 0.1, 0.16, D + 0.1, worktop); ct.position.set(0, baseY + baseH / 2 + 0.08, 0); r.add(ct);
        r.position.set(x, 0, z); if (ry) r.rotation.y = ry; return r;
      }
      g.add(run(W, 0, 0, 0));
      const side = Math.max(2.5, W * 0.5);
      if (st.layout === 'l-shape' || st.layout === 'u-shape') { g.add(run(side, -(W / 2 + D / 2), side / 2 - D / 2, Math.PI / 2)); }
      if (st.layout === 'u-shape') { g.add(run(side, (W / 2 + D / 2), side / 2 - D / 2, -Math.PI / 2)); }
      if (st.layout === 'parallel') { g.add(run(W, 0, 3.4, Math.PI)); }
      if (st.layout === 'island') { const isl = new THREE.Group(); const ib = box(2.8, 1.4, 1.5, mat(fin)); ib.position.y = -1.6; isl.add(ib); const it = box(3.0, 0.16, 1.7, worktop); it.position.y = -0.82; isl.add(it); isl.position.set(0, 0, 3.4); g.add(isl); }
      if (st.led) { const l = box(W * 0.9, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff3d0 })); l.position.set(0, baseY + baseH / 2 + 0.2, D / 2 - 0.1); g.add(l); }
      return g;
    }

    function buildStorage(st) {
      const fin = st.finishHex || '#f3f3f1';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.72));
      const doorMat = mat(fin);
      const g = new THREE.Group();
      const W = Math.max(2, Math.min(6, (st.widthCm || 120) / 40));
      const H = Math.max(3, Math.min(6, (st.heightCm || 180) / 40));
      const D = Math.max(0.7, Math.min(1.4, (st.depthCm || 40) / 32));
      // outer carcass
      const back = box(W, H, 0.06, carc); back.position.z = -D / 2; g.add(back);
      [-1, 1].forEach(s => { const sd = box(0.08, H, D, carc); sd.position.x = s * W / 2; g.add(sd); });
      const t = box(W, 0.08, D, carc); t.position.y = H / 2; g.add(t); const b = t.clone(); b.position.y = -H / 2; g.add(b);
      // shelves
      const rows = Math.max(3, Math.round(H / 1.2));
      for (let r = 1; r < rows; r++) { const sh = box(W * 0.96, 0.06, D * 0.92, carc); sh.position.y = -H / 2 + (H / rows) * r; g.add(sh); }
      // closed lower section if 'closed' or 'mixed'
      if (st.layout === 'closed' || st.layout === 'mixed') {
        const closedH = st.layout === 'mixed' ? H * 0.4 : H * 0.94;
        const cells = Math.max(2, Math.round(W / 1.4)), cw = W / cells;
        for (let i = 0; i < cells; i++) { const dx = -W / 2 + cw / 2 + i * cw; const dr = box(cw * 0.92, closedH * 0.94, 0.05, doorMat); dr.position.set(dx, -H / 2 + closedH / 2, D / 2); g.add(dr); if (st.handles) { const h = box(0.05, 0.3, 0.05, mat(0x1a1a1a)); h.position.set(dx + cw * 0.3, -H / 2 + closedH / 2, D / 2 + 0.06); g.add(h); } }
      }
      if (st.led) { const l = box(W * 0.9, 0.04, 0.04, new THREE.MeshBasicMaterial({ color: 0xfff3d0 })); l.position.set(0, H / 2 - 0.06, D / 2 - 0.06); g.add(l); }
      return g;
    }

    // ── Dimension annotations that live IN the scene (track rotation/zoom) ──
    let curUnit = stateRef.current.unit || 'cm';
    let floorGroup = null;       // faint floor grid + human reference (True-scale)
    const DIM_COL = 0x9a6a3c;    // literal hex only (clay-deep family) — never a CSS var
    // A sprite text label drawn onto a CanvasTexture (literal hex strings only).
    function makeLabel(text) {
      const pad = 8, fs = 44;
      const c = document.createElement('canvas');
      const cx = c.getContext('2d');
      cx.font = `700 ${fs}px Inter, Arial, sans-serif`;
      const tw = Math.ceil(cx.measureText(text).width);
      c.width = tw + pad * 2 + 4; c.height = fs + pad * 2;
      const x = c.getContext('2d');
      // rounded pill background
      const r = 14, w = c.width, h = c.height;
      x.fillStyle = 'rgba(250,245,238,0.94)';
      x.strokeStyle = '#e3d6c6'; x.lineWidth = 2;
      x.beginPath();
      x.moveTo(r, 0); x.arcTo(w, 0, w, h, r); x.arcTo(w, h, 0, h, r);
      x.arcTo(0, h, 0, 0, r); x.arcTo(0, 0, w, 0, r); x.closePath();
      x.fill(); x.stroke();
      x.fillStyle = '#3a2a1c';
      x.font = `700 ${fs}px Inter, Arial, sans-serif`;
      x.textBaseline = 'middle'; x.textAlign = 'center';
      x.fillText(text, w / 2, h / 2 + 2);
      const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sp.renderOrder = 999;
      const scl = 0.0042; sp.scale.set(c.width * scl, c.height * scl, 1);
      return sp;
    }
    const fmtVal = (cm) => curUnit === 'in'
      ? (Math.round((cm / 2.54) * 10) / 10) + ' in'
      : Math.round(cm) + ' cm';
    // A leader line (THREE.Line) with two short end ticks.
    function dimLine(ax, ay, az, bx, by, bz) {
      const g = new THREE.Group();
      const mLine = new THREE.LineBasicMaterial({ color: DIM_COL, transparent: true, opacity: 0.9, depthTest: false });
      const pts = [new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)];
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mLine);
      ln.renderOrder = 998; g.add(ln);
      return g;
    }
    // Build measurement leaders around the model's (post-fit) bounding box.
    function addDimensions(target, st) {
      try {
        const bb = new THREE.Box3().setFromObject(target);
        if (!isFinite(bb.min.x) || !isFinite(bb.max.x)) return;
        const sz = new THREE.Vector3(); bb.getSize(sz);
        const dg = new THREE.Group();
        const off = Math.max(sz.x, sz.y, sz.z) * 0.12 + 0.25;
        const minX = bb.min.x, maxX = bb.max.x, minY = bb.min.y, maxY = bb.max.y, maxZ = bb.max.z, minZ = bb.min.z;
        const isAB = (st.product === 'wardrobe' || st.product === 'walkin') && st.layout === 'l-shape';
        // WIDTH — along bottom front edge
        const wy = minY - off, wz = maxZ;
        dg.add(dimLine(minX, wy, wz, maxX, wy, wz));
        const wl = makeLabel(isAB ? `W ${fmtVal((Number(st.sideACm)||0)+(Number(st.sideBCm)||0))}` : `W ${fmtVal(st.widthCm)}`);
        wl.position.set((minX + maxX) / 2, wy - off * 0.5, wz); dg.add(wl);
        // HEIGHT — along left edge
        const hx = minX - off, hz = maxZ;
        dg.add(dimLine(hx, minY, hz, hx, maxY, hz));
        const hl = makeLabel(`H ${fmtVal(st.heightCm)}`);
        hl.position.set(hx - off * 0.5, (minY + maxY) / 2, hz); dg.add(hl);
        // DEPTH — along one bottom corner (z axis)
        const dx = maxX + off * 0.6, dy = minY;
        dg.add(dimLine(dx, dy, minZ, dx, dy, maxZ));
        const dl = makeLabel(`D ${fmtVal(st.depthCm)}`);
        dl.position.set(dx + off * 0.5, dy, (minZ + maxZ) / 2); dg.add(dl);
        // L-shape legs A / B
        if (isAB) {
          const al = makeLabel(`A ${fmtVal(st.sideACm)}`);
          al.position.set(minX + sz.x * 0.25, minY - off * 1.4, wz); dg.add(al);
          const bl = makeLabel(`B ${fmtVal(st.sideBCm)}`);
          bl.position.set(maxX - sz.x * 0.25, minY - off * 1.4, wz); dg.add(bl);
        }
        target.add(dg);
      } catch (e) { /* dims optional */ }
    }
    // Faint floor grid + a subtle human-scale silhouette for True-scale mode.
    function addFloor(target, st) {
      try {
        if (st.scaleMode !== 'true') return;
        const bb = new THREE.Box3().setFromObject(target);
        const sz = new THREE.Vector3(); bb.getSize(sz);
        const fg = new THREE.Group();
        const span = Math.max(sz.x, sz.z) * 2.4 + 2;
        const grid = new THREE.GridHelper(span, Math.max(6, Math.round(span)), 0xcfc4b4, 0xe3dccf);
        grid.material.transparent = true; grid.material.opacity = 0.5;
        grid.position.y = bb.min.y - 0.01; fg.add(grid);
        // human-scale reference (~170cm) standing beside the model
        const hRef = (170 / (st.heightCm || 240)) * sz.y; // 170cm relative to model height
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(hRef * 0.09, hRef * 0.62, 4, 8) : new THREE.CylinderGeometry(hRef * 0.09, hRef * 0.09, hRef * 0.8, 8),
          new THREE.MeshStandardMaterial({ color: 0xbcae9c, transparent: true, opacity: 0.5, roughness: 1 }));
        torso.position.set(bb.max.x + hRef * 0.45, bb.min.y + hRef * 0.5, bb.max.z);
        fg.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(hRef * 0.11, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xbcae9c, transparent: true, opacity: 0.5, roughness: 1 }));
        head.position.set(bb.max.x + hRef * 0.45, bb.min.y + hRef * 0.92, bb.max.z);
        fg.add(head);
        target.add(fg);
      } catch (e) { /* floor optional */ }
    }

    function rebuild() {
      const st = stateRef.current;
      curUnit = st.unit || 'cm';
      if (group) scene.remove(group);
      group = new THREE.Group();
      if (st.product === 'tv') {
        group.add(buildTV(st));
        scene.add(group); finishBuild(group, st);
        return;
      }
      if (st.product === 'doors') { group.add(buildDoors(st)); scene.add(group); finishBuild(group, st); return; }
      if (st.product === 'kitchen') { group.add(buildKitchen(st)); scene.add(group); finishBuild(group, st); return; }
      if (st.product === 'storage') { group.add(buildStorage(st)); scene.add(group); finishBuild(group, st); return; }
      if (st.product === 'walkin') {
        const W = Math.max(3, Math.min(7, (st.widthCm || 300) / 50));
        const H = Math.max(3.5, Math.min(6, (st.heightCm || 240) / 50));
        const D = Math.max(0.9, Math.min(1.6, (st.depthCm || 60) / 42));
        const sideW = Math.max(2, W * 0.7);
        // back run always
        group.add(cabinet(W, H, D, Math.max(2, Math.round(W / 1.4)), st));
        const left = () => { const c = cabinet(sideW, H, D, 2, st); c.position.set(-(W/2+D/2), 0, sideW/2 - D/2); c.rotation.y = Math.PI/2; return c; };
        const right = () => { const c = cabinet(sideW, H, D, 2, st); c.position.set(W/2+D/2, 0, sideW/2 - D/2); c.rotation.y = -Math.PI/2; return c; };
        if (st.layout === 'u-shape') { group.add(left()); group.add(right()); }
        if (st.layout === 'l-shape') { group.add(left()); }
        if (st.layout === 'parallel') { group.add(left()); group.add(right()); }
        scene.add(group); finishBuild(group, st);
        return;
      }
      // ── Consistent cm → scene scale so the model TRULY reflects entered dims ──
      // One scale for all axes; the whole group is auto-fit afterwards so it always frames nicely.
      const CM = 1 / 50; // 50cm ≈ 1 scene unit (pre auto-fit)
      const W = (st.widthCm || 200) * CM;
      const H = (st.heightCm || 240) * CM;
      const D = Math.max(0.4, (st.depthCm || 60) * CM);
      const doors = Math.max(2, Math.min(6, Math.round((st.widthCm || 200) / 90)));
      const main = cabinet(W, H, D, doors, st); group.add(main);
      const sideW = Math.max(1.2, W * 0.6);
      if (st.layout === 'l-shape') { const w2 = cabinet(sideW, H, D, 2, st); w2.position.set(-(W/2+D/2), 0, sideW/2 - D/2); w2.rotation.y = Math.PI / 2; group.add(w2); }
      if (st.layout === 'walk-in') { const w2 = cabinet(sideW, H, D, 2, st); w2.position.set(-(W/2+D/2), 0, sideW/2 - D/2); w2.rotation.y = Math.PI / 2; group.add(w2); const w3 = cabinet(sideW, H, D, 2, st); w3.position.set(W/2+D/2, 0, sideW/2 - D/2); w3.rotation.y = -Math.PI / 2; group.add(w3); }
      scene.add(group);
      finishBuild(group, st);
    }
    // After the model is built: fit/scale it, then attach dimension leaders + (optional) floor.
    function finishBuild(g, st) {
      autoFit(g);
      // Compute dims in local space (ignore the group scale autoFit just applied), then restore.
      const savedScale = g.scale.x;
      g.scale.setScalar(1);
      addDimensions(g, st);
      addFloor(g, st);
      g.scale.setScalar(savedScale);
    }
    // Uniformly scale + recenter any group so its largest dimension fits a target span.
    // This keeps relative proportions (so editing Side A/B, Height or Depth visibly changes the model)
    // while always framing nicely in the camera.
    function autoFit(g, target) {
      try {
        const tgt = target || 6.4;
        const bb = new THREE.Box3().setFromObject(g);
        if (!isFinite(bb.min.x) || !isFinite(bb.max.x)) return;
        const size = new THREE.Vector3(); bb.getSize(size);
        const center = new THREE.Vector3(); bb.getCenter(center);
        const largest = Math.max(size.x, size.y, size.z) || 1;
        const s = tgt / largest;
        // recenter children around origin, then scale the group
        g.children.forEach(ch => { ch.position.sub(center); });
        g.scale.setScalar(s);
      } catch (e) { /* fit optional */ }
    }
    sceneRef.current = { rebuild };
    rebuild();

    const md = (e) => { drag = true; px = e.clientX; py = e.clientY; };
    const mu = () => { drag = false; };
    const mm = (e) => { if (!drag) return; tRotY += (e.clientX - px) * 0.01; tRotX = clamp(tRotX + (e.clientY - py) * 0.01, -0.5, 0.6); px = e.clientX; py = e.clientY; };
    const wheel = (e) => { e.preventDefault(); tZoom = clamp(tZoom + (e.deltaY > 0 ? 0.6 : -0.6), 5, 16); };
    const ts = (e) => { if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; pinchD = Math.hypot(dx, dy); drag = false; } else { drag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; } };
    const tm = (e) => {
      if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; const d = Math.hypot(dx, dy); if (pinchD) tZoom = clamp(tZoom + (pinchD - d) * 0.02, 5, 16); pinchD = d; return; }
      if (!drag) return; tRotY += (e.touches[0].clientX - px) * 0.01; tRotX = clamp(tRotX + (e.touches[0].clientY - py) * 0.01, -0.5, 0.6); px = e.touches[0].clientX; py = e.touches[0].clientY;
    };
    mount.addEventListener('mousedown', md); window.addEventListener('mouseup', mu); window.addEventListener('mousemove', mm);
    mount.addEventListener('wheel', wheel, { passive: false });
    mount.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchend', mu); mount.addEventListener('touchmove', tm, { passive: true });
    // expose zoom/reset for on-canvas controls
    // Capture the current viewport as a JPEG data URI (composited onto a studio bg) for AI photoreal render.
    const snapshot = () => {
      try {
        renderer.render(scene, camera);
        const src = renderer.domElement;
        const oc = document.createElement('canvas'); oc.width = src.width; oc.height = src.height;
        const ox = oc.getContext('2d');
        ox.fillStyle = '#eef1f4'; ox.fillRect(0, 0, oc.width, oc.height);
        ox.drawImage(src, 0, 0);
        return oc.toDataURL('image/jpeg', 0.9);
      } catch (e) { return null; }
    };
    // Camera presets animate via the smooth rotation/zoom targets (the model rotates, not the camera).
    const applyPreset = (p) => {
      if (p === 'front') { tRotY = 0; tRotX = 0; tZoom = 9; }
      else if (p === 'top') { tRotY = 0; tRotX = 1.45; tZoom = 9; }   // ~83° → clean plan view
      else { tRotY = -0.5; tRotX = 0.05; tZoom = 9; }                 // iso (default)
    };
    const onResize = () => { const nw = mount.clientWidth || w, nh = mount.clientHeight || h; if (nw < 50 || nh < 50) return; renderer.setSize(nw, nh); camera.aspect = nw / nh; camera.updateProjectionMatrix(); };
    sceneRef.current = {
      rebuild,
      zoomBy: (d) => { tZoom = clamp(tZoom + d, 5, 16); },
      reset: () => { tRotY = -0.5; tRotX = 0.05; tZoom = 9; },
      setPreset: applyPreset,
      setUnit: (u) => { curUnit = u; if (stateRef.current) stateRef.current.unit = u; rebuild(); },
      refit: () => { onResize(); },
      snapshot,
    };
    if (apiRef) apiRef.current = sceneRef.current;
    window.addEventListener('resize', onResize);
    // Re-measure once the container has settled (fixes skew from 0-size init)
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => onResize()); ro.observe(mount); }
    setTimeout(onResize, 100); setTimeout(onResize, 400);
    function animate() {
      raf = requestAnimationFrame(animate);
      rotX += (tRotX - rotX) * 0.12; rotY += (tRotY - rotY) * 0.12; zoom += (tZoom - zoom) * 0.12;
      camera.position.z = zoom;
      if (group) group.rotation.set(rotX, rotY, 0);
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener('mousedown', md); window.removeEventListener('mouseup', mu); window.removeEventListener('mousemove', mm);
      mount.removeEventListener('wheel', wheel);
      mount.removeEventListener('touchstart', ts); window.removeEventListener('touchend', mu); mount.removeEventListener('touchmove', tm);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      try { mount.removeChild(renderer.domElement); } catch (e) {}
      try { grain.dispose(); if (envTex) envTex.dispose(); } catch (e) {}
      renderer.dispose(); sceneRef.current = null; if (apiRef) apiRef.current = null;
    };
  }, [ready]);

  if (failed && fallback) return <>{fallback}</>;
  const ctrlBtn = { width: 34, height: 34, borderRadius: 8, border: '1px solid #e3e3e6', background: 'rgba(255,255,255,.92)', color: '#1d1d1f', fontSize: 18, lineHeight: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.08)' };
  return (
    <div style={{ width: '100%', height: tall ? '100%' : (mobile ? 340 : 460), minHeight: tall ? (mobile?340:560) : undefined, position: 'relative' }} ref={mountRef}>
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13 }}>Loading 3D…</div>}
      {ready && tall && (
        <>
          <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 2 }}>
            <button type="button" aria-label="Zoom in" style={ctrlBtn} onClick={() => sceneRef.current && sceneRef.current.zoomBy(-1.2)}>+</button>
            <button type="button" aria-label="Zoom out" style={ctrlBtn} onClick={() => sceneRef.current && sceneRef.current.zoomBy(1.2)}>−</button>
            <button type="button" aria-label="Reset view" style={{ ...ctrlBtn, fontSize: 14 }} onClick={() => sceneRef.current && sceneRef.current.reset()}>⟲</button>
          </div>
          <div style={{ position: 'absolute', left: 12, bottom: 12, fontSize: 11, color: '#8a8a8e', background: 'rgba(255,255,255,.7)', padding: '4px 9px', borderRadius: 20, pointerEvents: 'none' }}>Drag to rotate · scroll to zoom</div>
        </>
      )}
    </div>
  );
}

/* ── CONFIGURATOR ── */
function PlannerPage({ setPage, user, openAuth, siteLogo }) {
  const mobile = useMobile();
  const { t } = useI18n();
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // stage: 'product' -> 'ai' -> 'config'
  const [stage, setStage] = useState('product');
  const [selProduct, setSelProduct] = useState(null);
  const [layout, setLayout] = useState('single');
  const [dims, setDims] = useState({ width: 200, height: 240, depth: 60, sideA: 200, sideB: 150 });
  const [sel, setSel] = useState({});
  const [price, setPrice] = useState(null);
  const [pricing, setPricing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  // Photorealistic AI render (fal.ai FLUX image-to-image)
  const plannerApi = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState(null);
  const [renderErr, setRenderErr] = useState('');
  // Wrap the AI render in a branded "The Closets" template (logo header + footer). Falls back to the raw image on any failure.
  const brandRender = (srcUri) => new Promise((resolve) => {
    const base = new Image();
    base.onload = () => {
      try {
        const iw = base.naturalWidth || 1024, ih = base.naturalHeight || 768;
        const sc = iw > 1280 ? 1280 / iw : 1, w = Math.round(iw * sc), h = Math.round(ih * sc);
        const pad = Math.round(w * 0.045), head = Math.round(w * 0.135), foot = Math.round(w * 0.09);
        const cw = w + pad * 2, ch = head + h + foot;
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const x = cv.getContext('2d');
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, cw, ch);
        const finish = (logoImg) => {
          let tx = pad;
          if (logoImg) {
            const lh = Math.round(head * 0.46);
            const lw = Math.min(Math.round(w * 0.34), Math.round(lh * (logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight))));
            try { x.drawImage(logoImg, pad, Math.round((head - lh) / 2) - Math.round(head * 0.05), lw, lh); tx = pad + lw + Math.round(w * 0.025); } catch (e) {}
          }
          x.textBaseline = 'alphabetic'; x.textAlign = 'left';
          x.fillStyle = '#1d1d1f'; x.font = `800 ${Math.round(head * 0.30)}px Inter, Arial, sans-serif`;
          x.fillText('THE CLOSETS', tx, Math.round(head * 0.46));
          x.fillStyle = '#86868b'; x.font = `500 ${Math.round(head * 0.135)}px Inter, Arial, sans-serif`;
          x.fillText('Bespoke furniture · Kingdom of Bahrain', tx, Math.round(head * 0.69));
          x.fillStyle = '#F2731C'; x.fillRect(pad, head - 4, w, 4);
          x.drawImage(base, pad, head, w, h);
          const fy = head + h;
          x.fillStyle = '#1d1d1f'; x.font = `700 ${Math.round(foot * 0.26)}px Inter, Arial, sans-serif`;
          x.fillText('Your design — photorealistic concept', pad, fy + Math.round(foot * 0.36));
          x.fillStyle = '#9aa0a6'; x.font = `400 ${Math.round(foot * 0.19)}px Inter, Arial, sans-serif`;
          x.fillText('AI impression. Exact finishes confirmed at your free design consultation.', pad, fy + Math.round(foot * 0.66));
          x.textAlign = 'right'; x.fillStyle = '#F2731C'; x.font = `700 ${Math.round(foot * 0.22)}px Inter, Arial, sans-serif`;
          x.fillText('theclosets.co · +973 1700 1700', cw - pad, fy + Math.round(foot * 0.50));
          x.textAlign = 'left';
          try { resolve(cv.toDataURL('image/jpeg', 0.92)); } catch (e) { resolve(srcUri); }
        };
        if (siteLogo) {
          fetch(siteLogo).then(r => r.ok ? r.blob() : Promise.reject(0)).then(bl => {
            const fr = new FileReader();
            fr.onload = () => { const li = new Image(); li.onload = () => finish(li); li.onerror = () => finish(null); li.src = fr.result; };
            fr.onerror = () => finish(null); fr.readAsDataURL(bl);
          }).catch(() => finish(null));
        } else finish(null);
      } catch (e) { resolve(srcUri); }
    };
    base.onerror = () => resolve(srcUri);
    base.src = srcUri;
  });
  const doPhotoreal = async () => {
    if (!user) { if (openAuth) openAuth('register'); else setPage('portal'); return; }
    const api = plannerApi.current;
    if (!api || !api.snapshot) { setRenderErr('The 3D view is still loading — try again in a moment.'); return; }
    const img = api.snapshot();
    if (!img) { setRenderErr('Could not capture the design. Rotate it once, then try again.'); return; }
    setRendering(true); setRenderErr(''); setRenderUrl(null);
    try {
      const r = await fetch(SUPA_URL + '/functions/v1/render_photoreal', {
        method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: img, product: prodKey, finish: finishId })
      });
      const d = await r.json().catch(() => ({}));
      if (d && d.ok && d.url) { const branded = await brandRender(d.url); setRenderUrl(branded || d.url); }
      else setRenderErr(d && d.error === 'Render not configured' ? 'Photorealistic rendering isn’t switched on yet.' : 'Render failed — please try again.');
    } catch (e) { setRenderErr('Network error — please try again.'); }
    setRendering(false);
  };
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiImage, setAiImage] = useState(null); // { dataUrl, media_type, base64 }
  // Downscale an uploaded room photo client-side so the payload stays small.
  const onAiPhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024; let { width:w, height:h } = img;
        if (w > h && w > max) { h = Math.round(h*max/w); w = max; } else if (h > max) { w = Math.round(w*max/h); h = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.72);
        setAiImage({ dataUrl, media_type: 'image/jpeg', base64: dataUrl.split(',')[1] });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  // ── Wave 2: living configurator accordion (multiple sections open at once) ──
  // Essentials open by default; optional categories collapsed.
  // ── Guided one-step-at-a-time configurator ──
  const [stepIndex, setStepIndex] = useState(0);          // current step in the guided flow
  const [visitedSteps, setVisitedSteps] = useState(() => new Set()); // step keys the user has opened/skipped
  const [customSize, setCustomSize] = useState(false);     // Size step: standard presets vs custom numeric inputs
  // ── Wave 2: 3D toolbar state (lifted into PlannerPage, passed to Wardrobe3D) ──
  const [unit, setUnit] = useState('cm');         // 'cm' | 'in'
  const [camPreset, setCamPreset] = useState('iso'); // 'front' | 'iso' | 'top'
  const [scaleMode, setScaleMode] = useState('fit'); // 'fit' | 'true'
  const [railCollapsed, setRailCollapsed] = useState(false); // expand 3D to near full width
  // Re-fit the 3D after the rail collapses/expands (container width changed).
  useEffect(() => {
    const id = setTimeout(() => { try { if (plannerApi.current && plannerApi.current.refit) plannerApi.current.refit(); } catch (e) {} }, 360);
    return () => clearTimeout(id);
  }, [railCollapsed]);
  const [pkg, setPkg] = useState(1); // selected package index (Standard default)
  const [showItemized, setShowItemized] = useState(true);
  const [quoteImg, setQuoteImg] = useState(null); // captured 3D snapshot shown in the quote area
  const [quoteSent, setQuoteSent] = useState(false); // post-submit success (guest → account invite)
  const priceTimer = useRef(null);
  // Package tiers — multipliers + labels (shared between config & quote)
  const PACKAGES = [
    { name:'Economy', mult:0.72, hl:'Quality essentials' },
    { name:'Standard', mult:1, hl:'Most popular' },
    { name:'Premium', mult:1.45, hl:'Premium finishes' },
    { name:'Luxury', mult:2.1, hl:'Top-tier materials' },
  ];

  useEffect(() => {
    let alive = true; setLoadError(false);
    const timer = setTimeout(() => { if (alive && !settings) setLoadError(true); }, 8000);
    api('website_configurator_settings?id=eq.main-config&select=config').then(d => {
      if (!alive) return; clearTimeout(timer);
      if (d && d[0] && d[0].config) { setSettings(d[0].config); setLoadError(false); } else setLoadError(true);
    }).catch(() => { if (alive) { clearTimeout(timer); setLoadError(true); } });
    return () => { alive = false; clearTimeout(timer); };
  }, [loadAttempt]);

  // Product-aware config: prefer the selected product's spec, fall back to flat wardrobe
  const prodKey = selProduct?.id || 'wardrobe';
  const prodCfg = settings?.products?.[prodKey] || null;
  const cats = (prodCfg?.categories) || (prodKey === 'wardrobe' ? (settings?.categories || {}) : {});
  const catKeys = Object.keys(cats);
  const prodLayouts = Array.isArray(prodCfg?.layouts) ? prodCfg.layouts : null;

  // ── Per-product dimension model (driven by DB config) ──
  // Kitchen layouts are runs (length), doors carry a thin "thickness" depth, etc.
  const KITCHEN_RUN_LAYOUTS = ['l-shape','u-shape','parallel'];
  const isKitchen = prodKey === 'kitchen';
  const isDoors = prodKey === 'doors';
  // L-shape Side A/B only makes sense for these products (wardrobe/walkin/walk-in dressing rooms).
  const supportsSideAB = (prodKey === 'wardrobe' || prodKey === 'walkin');
  // Build a {min,max,step,allowed} spec for a dimension from the config array.
  const dimSpec = useCallback((axis, fallback) => {
    const arr = prodCfg && Array.isArray(prodCfg[axis]) ? prodCfg[axis].map(Number).filter(n => !isNaN(n)) : null;
    if (arr && arr.length) {
      const sorted = [...arr].sort((a,b)=>a-b);
      return { min: sorted[0], max: sorted[sorted.length-1], allowed: sorted, discrete: sorted.length > 1 };
    }
    return { min: fallback[0], max: fallback[1], allowed: null, discrete: false };
  }, [prodCfg]);
  const widthSpec  = dimSpec('widths_cm',  [120,400]);
  const heightSpec = dimSpec('heights_cm', [180,300]);
  const depthSpec  = dimSpec('depths_cm',  [40,80]);
  // Snap a value to the nearest allowed discrete value (or clamp into [min,max]).
  const snapDim = useCallback((spec, val) => {
    const v = Number(val);
    if (spec.allowed && spec.allowed.length) {
      return spec.allowed.reduce((best,a)=> Math.abs(a-v) < Math.abs(best-v) ? a : best, spec.allowed[0]);
    }
    return Math.max(spec.min, Math.min(spec.max, isNaN(v) ? spec.min : v));
  }, []);
  // A sensible default for a product: middle-ish allowed value, or midpoint of range.
  const defaultDim = useCallback((spec) => {
    if (spec.allowed && spec.allowed.length) return spec.allowed[Math.floor((spec.allowed.length-1)/2)];
    return Math.round((spec.min + spec.max) / 2);
  }, []);

  // When the product changes, reset layout + option selections + dims to that product's defaults
  const lastProdRef = useRef(prodKey);
  useEffect(() => {
    if (lastProdRef.current !== prodKey) {
      lastProdRef.current = prodKey;
      const firstLayout = (prodLayouts && prodLayouts[0]?.id) || 'single';
      setLayout(firstLayout);
      setSel({});
      // Initialise dims from this product's config so sliders/3D start in-range.
      const w = defaultDim(widthSpec), h = defaultDim(heightSpec), d = defaultDim(depthSpec);
      setDims({ width: w, height: h, depth: d, sideA: w, sideB: Math.round(w * 0.7) });
    }
  }, [prodKey, prodLayouts, widthSpec, heightSpec, depthSpec, defaultDim]);

  const buildSelection = useCallback(() => {
    const ids = [];
    Object.values(sel).forEach(v => { if (Array.isArray(v)) ids.push(...v); else if (v) ids.push(v); });
    const useAB = supportsSideAB && layout === 'l-shape';
    const w = useAB ? (Number(dims.sideA) + Number(dims.sideB)) : dims.width;
    return { product: prodKey, width_cm: w, height_cm: dims.height, depth_cm: dims.depth, delivery: false, installation: false, modules: [{ options: ids }], layout };
  }, [sel, dims, layout, prodKey, supportsSideAB]);

  useEffect(() => {
    if (!settings || stage !== 'config') return;
    setPricing(true);
    if (priceTimer.current) clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(SUPA_URL + '/rest/v1/rpc/fn_configurator_price', {
          method: 'POST', headers: { ...H, 'Prefer': 'return=representation' },
          body: JSON.stringify({ p_selection: buildSelection() }),
        });
        const data = await r.json();
        setPrice(data && !data.error ? data : null);
      } catch { setPrice(null); } finally { setPricing(false); }
    }, 300);
    return () => priceTimer.current && clearTimeout(priceTimer.current);
  }, [settings, buildSelection, stage]);

  const total = price?.total || 0;
  const FINISHES = [
    { id:'oak', name:'Oak', hex:'#c89b5e' }, { id:'walnut', name:'Walnut', hex:'#6b4423' },
    { id:'white', name:'White', hex:'#f3f3f1' }, { id:'graphite', name:'Graphite', hex:'#3a3a3c' },
    { id:'sage', name:'Sage', hex:'#9aa88a' },
  ];
  const [finishId, setFinishId] = useState('oak');
  const finishHex = (FINISHES.find(f => f.id === finishId) || FINISHES[0]).hex;
  const hasGlass = !!sel['glass_options'];
  const hasHandles = !!sel['handles'];
  const hasLed = !!sel['accessories'];

  const LAYOUTS = [
    { id:'single', label:'Single wall' }, { id:'l-shape', label:'L-shaped' },
    { id:'walk-in', label:'Walk-in' }, { id:'sliding', label:'Sliding' },
  ];
  // Small top-down/elevation diagram per layout id (works across products)
  const layoutIcon = (id, active) => {
    const c = active ? 'var(--clay)' : '#c7c7cc';
    const sw = 2.4;
    const P = (d) => <path d={d} stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    const R = (x,y,w,h,fill) => <rect x={x} y={y} width={w} height={h} rx="1.5" stroke={c} strokeWidth={sw} fill={fill?(active?'var(--sand)':'#f0f0f2'):'none'} />;
    let inner = null;
    switch (id) {
      case 'single': case 'wall': case 'hinged': case 'open': case 'standard': case 'floating':
        inner = R(5,9,22,5, id==='floating'); break;
      case 'l-shape':
        inner = <>{R(5,5,5,18)}{R(5,18,22,5)}</>; break;
      case 'u-shape':
        inner = <>{R(5,5,5,18)}{R(5,18,22,5)}{R(22,5,5,18)}</>; break;
      case 'parallel':
        inner = <>{R(5,5,22,4)}{R(5,19,22,4)}</>; break;
      case 'island':
        inner = <>{R(4,4,24,4)}{R(11,15,10,7,true)}</>; break;
      case 'sliding':
        inner = <>{R(4,9,13,6)}{R(15,11,13,6)}</>; break;
      case 'folding':
        inner = P('M5 8 L11 16 L17 8 L23 16 L27 11'); break;
      case 'full-wall':
        inner = <>{R(4,4,4,18)}{R(24,4,4,18)}{R(9,9,14,8,true)}</>; break;
      case 'floor':
        inner = R(6,14,20,6, true); break;
      case 'closed':
        inner = R(6,6,20,16, true); break;
      case 'mixed':
        inner = <>{R(6,6,20,8)}{R(6,15,20,7,true)}</>; break;
      case 'walk-in':
        inner = <>{R(5,5,5,18)}{R(5,18,22,5)}{R(22,5,5,18)}</>; break;
      default:
        inner = R(5,9,22,5); break;
    }
    return <svg width="32" height="28" viewBox="0 0 32 28" aria-hidden="true">{inner}</svg>;
  };

  const pick = (ck, id, multi) => setSel(s => {
    const n = { ...s };
    if (multi) { const a = Array.isArray(s[ck]) ? [...s[ck]] : []; const i = a.indexOf(id); if (i>=0) a.splice(i,1); else a.push(id); n[ck]=a; }
    else n[ck] = s[ck] === id ? null : id;
    return n;
  });
  const isOn = (ck, id, multi) => multi ? (Array.isArray(sel[ck]) && sel[ck].includes(id)) : sel[ck] === id;

  // Completion status + chosen label for a category section
  const catStatus = (ck) => {
    const v = sel[ck];
    const has = Array.isArray(v) ? v.length > 0 : !!v;
    return has ? 'done' : 'empty';
  };
  const catChosen = (ck) => {
    const v = sel[ck]; const items = cats[ck]?.items || [];
    const nameOf = (id) => (items.find(i => i.id === id)?.name) || '';
    if (Array.isArray(v)) return v.length ? (v.length === 1 ? nameOf(v[0]) : v.length + ' selected') : '';
    return v ? nameOf(v) : '';
  };
  // Card image: photo if set, else swatch, else neutral
  const cardBg = (it) => it.image_url ? `center/cover url(${it.image_url})` : (it.swatch || 'linear-gradient(135deg,#ece7df,#ddd5c8)');

  const runAI = async () => {
    if (!aiText.trim() && !aiImage) return;
    setAiBusy(true);
    try {
      const r = await fetch(SUPA_URL + '/functions/v1/planner_ai_design', {
        method: 'POST', headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, product: selProduct?.id || undefined, image_base64: aiImage?.base64, media_type: aiImage?.media_type }),
      });
      const d = await r.json();
      if (d.ok && d.design) {
        const g = d.design;
        // Switch to the AI-chosen product first (this resets layout), then apply the rest after the reset.
        const pp = g.product && PLANNER_PRODUCTS.find(p => p.id === g.product);
        if (pp) setSelProduct({ id: pp.id, name: pp.name, ready: true });
        const apply = () => {
          if (g.layout) setLayout(g.layout);
          if (g.finish_id) setFinishId(g.finish_id);
          setDims(c => ({ ...c, width: g.width_cm || c.width, height: g.height_cm || c.height, depth: g.depth_cm || c.depth }));
          if (g.options && typeof g.options === 'object') {
            const ns = {}; Object.keys(g.options).forEach(k => { ns[k] = g.options[k]; });
            setSel(ns);
          }
          setAiSummary(g.summary || '');
          setStage('config');
        };
        if (pp) setTimeout(apply, 0); else apply();
      } else {
        toast('Could not generate a design — try describing it differently', 'error');
      }
    } catch { toast('AI is unavailable right now', 'error'); }
    finally { setAiBusy(false); }
  };

  const persist = async (status) => {
    const id = uid();
    await api('product_configurations', { method:'POST', body:[{
      id, customer_id:user?.id||null, customer_name:user?.name||null, customer_email:user?.email||null, customer_phone:user?.phone||null,
      product_name:(selProduct?.name ? selProduct.name+' — ' : '')+'Custom ('+layout+', '+((supportsSideAB&&layout==='l-shape')?(dims.sideA+'+'+dims.sideB):dims.width)+'×'+dims.height+'cm)',
      configuration:buildSelection(), total_price:total, subtotal:price?.goods_subtotal||null,
      discount_amount:price?.discount_amount||null, vat_amount:price?.vat_amount||null, price_breakdown:price||null,
      status, share_token:id, created_at:new Date().toISOString() }] });
    return id;
  };
  const save = async () => {
    // Require login to save — remember the intent and resume after auth.
    if (!user) { pendingAction.current = 'save'; if (openAuth) openAuth('register'); else setPage('portal'); return; }
    setBusy(true);
    try { await persist('saved'); setSaved(true); toast('Design saved','success'); }
    catch (e) { toast('Could not save: ' + (e?.message || 'please try again'), 'error'); }
    finally { setBusy(false); }
  };
  // Selected package + package-adjusted total (used by config price card AND the quote)
  const selPkg = PACKAGES[Math.max(0, Math.min(pkg, PACKAGES.length-1))] || PACKAGES[1];
  const pkgTotal = Math.round(total * selPkg.mult);
  // Build a REAL itemized quotation straight from fn_configurator_price:
  // base_price line + each RPC line + layout_price + package adjustment + VAT → TOTAL.
  const buildLineItems = useCallback(() => {
    const p = price || {};
    const items = [];
    const round = (n) => Math.round(Number(n) || 0);
    // 1) Base price (carcass + structure for the chosen size)
    const base = round(p.base_price);
    if (base) items.push({ label:'Base price', detail:`${selProduct?.name || 'Wardrobe'} · ${layout}`, price: base });
    // 2) Real priced lines returned by the RPC (chosen options / materials / glass etc.)
    (Array.isArray(p.lines) ? p.lines : []).forEach(ln => {
      const amt = round(ln.amount);
      items.push({ label: ln.name || 'Option', detail: amt===0 ? 'Included' : null, price: amt });
    });
    // 3) Layout price (e.g. L-shape / island uplift) if any
    const layoutPrice = round(p.layout_price);
    if (layoutPrice) { const lay = (prodLayouts||LAYOUTS).find(l=>l.id===layout); items.push({ label:`Layout — ${lay?.label || layout}`, detail:null, price: layoutPrice }); }
    // Goods subtotal as priced by the RPC (pre-VAT, pre-package).
    const goods = round(p.pre_vat_total != null ? p.pre_vat_total : (p.goods_subtotal != null ? p.goods_subtotal : total));
    // 4) Package adjustment — multiplier applied to goods.
    const goodsPkg = round(goods * selPkg.mult);
    const pkgAdj = goodsPkg - goods;
    // 5) VAT on the package-adjusted goods.
    const vatRate = (typeof p.vat_rate === 'number') ? p.vat_rate : 0;
    const vat = round(goodsPkg * vatRate);
    const grand = goodsPkg + vat;
    return {
      items, subtotal: goods,
      pkgName: selPkg.name, pkgMult: selPkg.mult, pkgAdj,
      vatRate, vat, goodsPkg,
      total: grand,
    };
  }, [price, total, selProduct, layout, prodLayouts, selPkg]);
  const [showQuote, setShowQuote] = useState(false);
  const [qForm, setQForm] = useState({ name:'', phone:'', email:'' });
  const [quoteErr, setQuoteErr] = useState(''); // visible inline error for the quote flow
  // Submit the design as a quote through the shared edge function so the team
  // receives the spec + a copy of the live 3D design. Contact = signed-in user or modal input.
  const submitQuote = async (contact) => {
    const name = contact?.name || user?.name, phone = contact?.phone || user?.phone, email = contact?.email || user?.email;
    setBusy(true); setQuoteErr('');
    // Capture the design image: live 3D snapshot if mounted, else the photoreal render or the snapshot we took entering Visualise.
    let imageB64 = null;
    try { imageB64 = (plannerApi.current && plannerApi.current.snapshot) ? plannerApi.current.snapshot() : null; } catch (e) {}
    if (!imageB64) imageB64 = renderUrl || quoteImg || null;
    try {
      // Build a readable design summary so the sales team sees the spec in the quote itself
      const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
      const sizeStr = (supportsSideAB&&layout==='l-shape') ? `${dims.sideA}+${dims.sideB}×${dims.height}×${dims.depth}cm` : `${dims.width}×${dims.height}×${dims.depth}cm`;
      const chosenOpts = Object.keys(sel).map(ck => { const lbl = catChosen(ck); return lbl ? `${cats[ck]?.label||ck}: ${lbl}` : null; }).filter(Boolean);
      // Full itemized breakdown for the sales team / Bonsai Hub
      const lineData = buildLineItems();
      const noteLines = [
        `🪟 Website Planner quote`,
        `Product: ${selProduct?.name || 'Wardrobe'}`,
        `Layout: ${layout}  |  Finish: ${finName}  |  Size: ${sizeStr}`,
        `Package: ${lineData.pkgName} (×${lineData.pkgMult})`,
        `— Itemized —`,
        ...lineData.items.map(li => `• ${li.label}${li.detail?` (${li.detail})`:''}: BHD ${li.price}`),
        `Subtotal: BHD ${lineData.subtotal}`,
        ...(lineData.pkgAdj ? [`${lineData.pkgName} package: BHD ${lineData.pkgAdj>0?'+':''}${lineData.pkgAdj}`] : []),
        ...(lineData.vat ? [`VAT (${Math.round(lineData.vatRate*100)}%): BHD ${lineData.vat}`] : []),
        `Estimated total (${lineData.pkgName}): BHD ${lineData.total}`,
      ];
      // Attach the REAL line items + breakdown inside the configuration object too
      const configWithItems = { ...buildSelection(), package: lineData.pkgName, package_multiplier: lineData.pkgMult, line_items: lineData.items, subtotal: lineData.subtotal, package_adjustment: lineData.pkgAdj, vat: lineData.vat, vat_rate: lineData.vatRate, total: lineData.total, price_breakdown: price || null };
      const r = await fetch(SUPA_URL + '/functions/v1/submit_design_quote', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'website',
          customer_id: user?.id || null,
          customer_name: name || 'Website Visitor',
          customer_phone: phone || null,
          customer_email: email || null,
          product_name: (selProduct?.name || 'Wardrobe') + ' — Custom (' + layout + ', ' + sizeStr + ', ' + lineData.pkgName + ')',
          configuration: configWithItems,
          total_price: lineData.total,
          image_base64: imageB64,
          notes: noteLines.join('\n'),
          interest: (selProduct?.name || 'Wardrobe') + ' (planner)',
        }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data && data.ok) {
        toast('Quote requested — our team will contact you soon','success');
        setShowQuote(false);
        if (!user) {
          // Guest: invite them to create an account to track the quote
          setQuoteSent({ name: name || qForm.name, phone: phone || qForm.phone, email: email || qForm.email });
        } else {
          setPage('home');
        }
      } else {
        const msg = 'Could not send your quote: ' + ((data && data.error) || 'please check your details and try again') + '.';
        setQuoteErr(msg); toast(msg, 'error');
      }
    } catch (e) { const msg = 'Could not send your quote: ' + (e?.message || 'network error — please try again') + '.'; setQuoteErr(msg); toast(msg, 'error'); }
    finally { setBusy(false); }
  };
  const requestQuote = () => {
    // Require login for a quote — remember the intent, prefill from any guest form, resume after auth.
    if (!user) {
      pendingAction.current = 'quote';
      const pf = (qForm.name || qForm.phone || qForm.email) ? { name:qForm.name, phone:qForm.phone, email:qForm.email } : undefined;
      setQuoteErr('');
      if (openAuth) openAuth('register', pf); else { setShowQuote(true); }
      return;
    }
    submitQuote();
  };
  // Resume a gated action (save/quote) the moment the user finishes logging in.
  const pendingAction = useRef(null);
  useEffect(() => {
    if (user && pendingAction.current) {
      const act = pendingAction.current; pendingAction.current = null;
      if (act === 'save') save();
      else if (act === 'quote') submitQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const goVisualise = () => {
    setQuoteErr('');
    // Capture the live 3D snapshot now, while the config canvas is still mounted, for the quote area.
    try { const s = plannerApi.current && plannerApi.current.snapshot ? plannerApi.current.snapshot() : null; if (s) setQuoteImg(s); } catch (e) {}
    setStage('visualise');
  };
  // Reusable 5-step progress spine (clone of Raumplus/Wren step counter), shared across stages.
  const planSteps = (cur) => {
    const order = ['product','ai','config','visualise','quote'];
    const labels = { product:'Product', ai:'Kickstart', config:'Configure', visualise:'Visualise', quote:'Quote' };
    const ci = order.indexOf(cur);
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexWrap:'wrap', margin:'0 auto 18px', fontSize:12.5, maxWidth:640 }}>
        {order.map((k,i)=>{
          const done = i<ci, now = i===ci;
          const go = (i<ci && (k==='product'||k==='ai'||k==='config'||k==='visualise')) ? ()=>setStage(k) : undefined;
          return (
            <Fragment key={k}>
              <span onClick={go} style={{ display:'flex', alignItems:'center', gap:6, cursor:go?'pointer':'default' }}>
                <span style={{ width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0,
                  background: now?'var(--clay)':done?'var(--clay-deep)':'var(--sand)', color: (!now&&!done)?'var(--muted)':'#fff' }}>{done?'✓':i+1}</span>
                <span style={{ fontWeight: now?700:500, color: now?'var(--ink)':done?'var(--ink-soft)':'var(--muted)' }}>{labels[k]}</span>
              </span>
              {i<order.length-1 && <span style={{ width:18, height:2, background:'var(--line)', borderRadius:2 }} />}
            </Fragment>
          );
        })}
      </div>
    );
  };

  if (!settings) return (
    <div style={{ minHeight:'70vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'140px 24px', textAlign:'center', color:'#86868b' }}>
      {loadError ? (<>
        <div style={{ fontSize:17, fontWeight:600, color:'#1d1d1f', marginBottom:8 }}>Couldn't load the planner</div>
        <div style={{ fontSize:14, marginBottom:20, maxWidth:360 }}>We're having trouble reaching our design service. Please try again in a moment.</div>
        <div style={{ display:'flex', gap:10 }}>
          <button type="button" className="btn" onClick={()=>{ setLoadError(false); setLoadAttempt(a=>a+1); }} style={{ borderRadius:14 }}>Try again</button>
          <button type="button" className="btn-secondary" onClick={()=>setPage('contact')} style={{ borderRadius:14 }}>Contact us</button>
        </div>
      </>) : <div>Loading planner…</div>}
    </div>
  );

  // ── STAGE 1: PRODUCT PICKER ──
  if (stage === 'product') return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop:104, paddingBottom:80 }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px' }}>
        {planSteps('product')}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>Design studio</div>
          <h2 className="display" style={{ fontSize: mobile?30:44, color:'var(--ink)' }}>{t('whatDesign')}</h2>
          <p style={{ color:'var(--ink-soft)', fontSize:16, marginTop:12 }}>{t('pickProduct')}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:16 }}>
          {PLANNER_PRODUCTS.map(p=>{
            const on = selProduct?.id === p.id;
            // Ready = has product config, enabled, and prices reviewed (not placeholder)
            const pc = settings?.products?.[p.id];
            const ready = p.id === 'wardrobe' ? true : !!(pc && pc.enabled !== false && !pc.placeholder_prices);
            return (
              <div key={p.id} className="lift" onClick={()=>setSelProduct({ id:p.id, name:p.name, ready })} style={{ cursor:'pointer', border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:16, background:'#fff', textAlign:'left', position:'relative', padding:'16px 16px 14px' }}>
                {on && <span style={{ position:'absolute', top:12, right:12, width:22, height:22, borderRadius:'50%', background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 6"/></svg></span>}
                {!ready && !on && <span style={{ position:'absolute', top:12, right:12, fontSize:10, fontWeight:600, color:'var(--muted)', background:'var(--sand)', padding:'2px 8px', borderRadius:6 }}>{t('quoteOnly')}</span>}
                <div style={{ width:42, height:42, borderRadius:11, background: on?'var(--clay)':'rgba(242,115,28,.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={on?'#fff':'var(--clay)'} strokeWidth="1.6" aria-hidden="true"><path d={p.icon}/></svg>
                </div>
                <div className="display" style={{ fontSize:17, color:'var(--ink)' }}>{p.name}</div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:3, marginBottom:10 }}>{p.sub}</div>
                <div style={{ fontSize:12.5, color:'var(--clay)', fontWeight:600 }}>{ready ? 'Start' : 'Request a quote'} →</div>
              </div>
            );
          })}
        </div>
        {selProduct && !selProduct.ready && (
          <div style={{ maxWidth:520, margin:'24px auto 0', padding:'18px 22px', background:'#fff', border:'1px solid var(--line)', borderLeft:'3px solid var(--clay)', borderRadius:14, textAlign:'center' }}>
            <div className="display" style={{ fontSize:18, color:'var(--ink)', marginBottom:6 }}>{selProduct.name} — request a quote</div>
            <div style={{ fontSize:14, color:'var(--ink-soft)', marginBottom:14 }}>Online design for {selProduct.name.toLowerCase()} is coming soon. Our team will design it with you.</div>
            <button type="button" className="btn-clay" onClick={()=>setPage('contact')}>{t('requestQuote')}</button>
          </div>
        )}
        {selProduct && selProduct.ready && (
          <div style={{ textAlign:'center', marginTop:30 }}>
            <button type="button" className="btn-clay" onClick={()=>setStage('ai')} style={{ minWidth:180 }}>Continue →</button>
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:24 }}>
          <button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>Close ✕</button>
        </div>
      </div>
    </div>
  );

  // ── STAGE 2: AI STARTER ──
  if (stage === 'ai') return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'104px 24px 80px' }}>
      <div style={{ width:'100%', maxWidth:640 }}>{planSteps('ai')}</div>
      <div style={{ maxWidth:580, width:'100%', background:'#fff', border:'1px solid var(--line)', borderRadius:22, padding: mobile?22:30 }}>
        {(() => { const pp = PLANNER_PRODUCTS.find(p=>p.id===(selProduct?.id||'wardrobe')); return (
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'7px 14px 7px 7px', background:'var(--sand)', border:'1px solid var(--line)', borderRadius:999, marginBottom:16 }}>
            <span style={{ width:30, height:30, borderRadius:9, background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" aria-hidden="true"><path d={pp?.icon || ''}/></svg>
            </span>
            <span style={{ fontSize:13, color:'var(--ink-soft)' }}>Designing: <strong style={{ color:'var(--ink)' }}>{selProduct?.name || pp?.name || 'Wardrobe'}</strong></span>
          </div>
        ); })()}
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
          <Spark size={22} color="var(--clay)" />
          <span className="display" style={{ fontSize:20, color:'var(--ink)' }}>Describe your space</span>
        </div>
        <p style={{ fontSize:14, color:'var(--ink-soft)', marginBottom:16, lineHeight:1.6 }}>We'll design a tailored starting point in seconds.</p>
        <textarea value={aiText} onChange={e=>setAiText(e.target.value)} aria-label="Describe your design" placeholder="e.g. a walk-in closet for a master bedroom, warm oak, lots of shoes and hanging space, with soft lighting" rows={3} style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'var(--cream)', borderRadius:12, fontSize:15, fontFamily:'inherit', resize:'vertical', marginBottom:12 }} />
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          {['Small bedroom, sliding doors, white','Walk-in, oak, lots of shoes','Modern L-shape kitchen, white, quartz'].map(chip=>(
            <button key={chip} type="button" onClick={()=>setAiText(chip)} style={{ fontSize:12, border:'1px solid var(--line)', borderRadius:16, padding:'6px 13px', background:'var(--cream)', color:'var(--ink-soft)', cursor:'pointer' }}>{chip}</button>
          ))}
        </div>
        {/* Room photo (vision) */}
        <label style={{ display:'flex', alignItems:'center', gap:12, background:'var(--cream)', border:'1px dashed var(--line)', borderRadius:12, padding:'12px 14px', cursor:'pointer', marginBottom:16 }}>
          {aiImage
            ? <img src={aiImage.dataUrl} alt="room" style={{ width:54, height:42, objectFit:'cover', borderRadius:8 }} />
            : <i className="ti ti-camera" style={{ fontSize:22, color:'var(--clay)' }} aria-hidden="true" />}
          <span style={{ fontSize:14, color:'var(--ink)', fontWeight:500 }}>{aiImage ? 'Photo added — tap to change' : 'Add a photo of your room (optional)'}</span>
          <input type="file" accept="image/*" onChange={e=>onAiPhoto(e.target.files?.[0])} style={{ display:'none' }} />
          {aiImage && <span onClick={e=>{ e.preventDefault(); setAiImage(null); }} style={{ marginLeft:'auto', color:'var(--muted)', fontSize:18 }}>×</span>}
        </label>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button type="button" className="btn-clay" disabled={aiBusy || (!aiText.trim() && !aiImage)} onClick={runAI} style={{ opacity:(aiBusy||(!aiText.trim()&&!aiImage))?0.6:1 }}>{aiBusy ? 'Designing…' : 'Generate my design ✦'}</button>
          <button type="button" onClick={()=>setStage('config')} style={{ background:'none', border:'none', color:'var(--ink-soft)', fontSize:14, cursor:'pointer' }}>or start from scratch →</button>
        </div>
        <div style={{ marginTop:18 }}><span onClick={()=>setStage('product')} style={{ cursor:'pointer', fontSize:13, color:'var(--muted)' }}>‹ Back</span></div>
      </div>
    </div>
  );

  // ── STAGE 3: SINGLE-SCREEN CONFIG ──
  const sizeW = (supportsSideAB && layout === 'l-shape') ? (Number(dims.sideA)+Number(dims.sideB)) : dims.width;

  // ── STAGE 4: VISUALISE (real stage, after config) ──
  if (stage === 'visualise') {
    const lineData = buildLineItems();
    const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
    const sizeStr = (supportsSideAB&&layout==='l-shape') ? `${dims.sideA}+${dims.sideB} × ${dims.height} × ${dims.depth} cm` : `${dims.width} × ${dims.height} × ${dims.depth} cm`;
    return (
      <div style={{ minHeight:'100dvh', paddingTop:80, paddingBottom:40 }}>
        <div style={{ maxWidth:1440, margin:'0 auto', padding: mobile?'0 16px':'0 28px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'12px 0 10px' }}>
            <span onClick={()=>setStage('config')} style={{ cursor:'pointer', fontSize:13, color:'var(--ink-soft)' }}>‹ Back to configure</span>
            <span style={{ fontSize:13, color:'var(--muted)' }}>{selProduct?.name || 'Wardrobe'}</span>
            <button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>Close ✕</button>
          </div>
          {planSteps('visualise')}
          <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.4fr 1fr', gap:20, alignItems:'start' }}>
            {/* Visual: photoreal render if generated, else live 3D */}
            <div style={{ background:'#f5f5f7', borderRadius:20, position:'relative', minHeight: mobile?320:560, overflow:'hidden' }}>
              {renderUrl
                ? <img src={renderUrl} alt="Photorealistic render of your design" style={{ width:'100%', display:'block' }} />
                : <Wardrobe3D apiRef={plannerApi} finishHex={finishHex} layout={layout} glass={hasGlass} handles={hasHandles} led={hasLed} mobile={mobile} tall product={prodKey} widthCm={sizeW} heightCm={dims.height} depthCm={dims.depth} sideACm={dims.sideA} sideBCm={dims.sideB} unit={unit} />}
              <button type="button" onClick={doPhotoreal} disabled={rendering} style={{ position:'absolute', bottom:12, right:12, display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:12, border:'none', cursor: rendering?'wait':'pointer', background:'linear-gradient(135deg,#F2731C,#C2410C)', color:'#fff', fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(242,115,28,.4)' }}>
                <i className={rendering ? 'ti ti-loader-2' : 'ti ti-sparkles'} aria-hidden="true" />
                {rendering ? 'Rendering…' : (renderUrl ? 'Regenerate' : 'Make it photorealistic')}
              </button>
            </div>
            {/* Summary + itemized detail */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Rendered design image inside the quote area (photoreal if present, else 3D snapshot) + Download */}
              {(renderUrl || quoteImg) && (
                <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:16, padding:12 }}>
                  <img src={renderUrl || quoteImg} alt="Your design" style={{ width:'100%', display:'block', borderRadius:10 }} />
                  <a href={renderUrl || quoteImg} download={renderUrl ? 'closets-design.jpg' : 'closets-design.png'} style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, padding:'8px 14px', borderRadius:10, background:'var(--ink)', color:'#fff', textDecoration:'none', fontSize:12.5, fontWeight:700 }}>
                    <i className="ti ti-download" aria-hidden="true" /> Download image
                  </a>
                </div>
              )}
              <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:16, padding:'18px 18px 16px' }}>
                <div className="display" style={{ fontSize:20, color:'var(--ink)', marginBottom:12 }}>Your design</div>
                {[['Product', selProduct?.name || 'Wardrobe'],['Layout', layout],['Finish', finName],['Size', sizeStr],['Package', `${selPkg.name} (×${selPkg.mult})`]].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--line)', fontSize:13.5 }}>
                    <span style={{ color:'var(--ink-soft)' }}>{k}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:12 }}>
                  <span style={{ fontSize:13, color:'var(--ink-soft)' }}>Estimated total</span>
                  <span style={{ fontSize:24, fontWeight:700, color:'var(--clay)' }}>{fmt(lineData.total)}</span>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:16, padding:'16px 18px' }}>
                <div onClick={()=>setShowItemized(s=>!s)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>Itemized quotation</span>
                  <i className={`ti ti-chevron-${showItemized?'up':'down'}`} style={{ color:'var(--muted)' }} aria-hidden="true" />
                </div>
                {showItemized && (
                  <div style={{ marginTop:12 }}>
                    {lineData.items.map((li,i)=>(
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'6px 0', borderBottom:'1px solid var(--line)', fontSize:13 }}>
                        <span style={{ color:'var(--ink)' }}>{li.label}{li.detail?<span style={{ color:'var(--muted)', display:'block', fontSize:11 }}>{li.detail}</span>:null}</span>
                        <span style={{ fontWeight:600, color: li.price===0?'var(--muted)':'var(--ink)', whiteSpace:'nowrap' }}>{li.price===0?'Included':fmt(li.price)}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:13, color:'var(--ink-soft)' }}>
                      <span>Subtotal</span><span style={{ fontWeight:600 }}>{fmt(lineData.subtotal)}</span>
                    </div>
                    {lineData.pkgAdj !== 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:13, color:'var(--ink-soft)' }}>
                        <span>{selPkg.name} package (×{selPkg.mult})</span><span style={{ fontWeight:600 }}>{lineData.pkgAdj>0?'+ ':'− '}{fmt(Math.abs(lineData.pkgAdj))}</span>
                      </div>
                    )}
                    {lineData.vat > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:13, color:'var(--ink-soft)' }}>
                        <span>VAT ({Math.round(lineData.vatRate*100)}%)</span><span style={{ fontWeight:600 }}>{fmt(lineData.vat)}</span>
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', marginTop:6, borderTop:'2px solid var(--ink)', fontSize:15, fontWeight:800, color:'var(--ink)' }}>
                      <span>TOTAL</span><span style={{ color:'var(--clay)' }}>{fmt(lineData.total)}</span>
                    </div>
                  </div>
                )}
                <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:10 }}>Indicative — your free design visit confirms an exact, itemised quote.</div>
              </div>
              {quoteErr && <div role="alert" style={{ background:'#fdecea', border:'1px solid #f5c6c0', color:'#b3261e', borderRadius:12, padding:'10px 14px', fontSize:13 }}>{quoteErr}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="btn-secondary" disabled={busy} onClick={()=>setStage('config')} style={{ flex:1, borderRadius:12, color:'var(--ink-soft)' }}>‹ Edit</button>
                <button type="button" className="btn-clay" disabled={busy} onClick={requestQuote} style={{ flex:2, borderRadius:12 }}>{busy?'Sending…':(user?'Continue — get my quote →':'Sign in & get my quote →')}</button>
              </div>
            </div>
          </div>
        </div>
        {/* photoreal modal (shared) */}
        {(rendering || renderUrl || renderErr) && (
          <div onClick={()=>{ if(!rendering){ setRenderErr(''); } }} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,18,22,.72)', display: renderErr?'flex':'none', alignItems:'center', justifyContent:'center', padding:20 }}>
            {renderErr && !rendering && <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18, maxWidth:420, padding:'24px', textAlign:'center', color:'#c0392b', fontSize:14 }}>{renderErr}<div style={{ marginTop:14 }}><button type="button" onClick={()=>setRenderErr('')} className="btn-secondary" style={{ borderRadius:12 }}>OK</button></div></div>}
          </div>
        )}
        {rendering && (
          <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,18,22,.72)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:'#fff', borderRadius:18, padding:'40px 50px', textAlign:'center', color:'#6e6e73', fontSize:14 }}><i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize:26 }} /><div style={{ marginTop:10 }}>Creating your photorealistic render… ~15–25 seconds.</div></div>
          </div>
        )}
        {/* guest quote success → account invite */}
        {quoteSent && (
          <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
            <div style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:440, width:'100%', padding:28, textAlign:'center' }}>
              <div style={{ width:54, height:54, borderRadius:'50%', background:'#1D9E7522', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><i className="ti ti-check" style={{ color:'#1D9E75', fontSize:28 }} aria-hidden="true" /></div>
              <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 8px' }}>Quote sent!</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 20px', lineHeight:1.6 }}>Create a free account to track your quote, save this design and follow your order.</p>
              <button type="button" className="btn-clay" onClick={()=>{ const c = quoteSent; if (openAuth) openAuth('register', c && typeof c==='object' ? c : undefined); else setPage('portal'); }} style={{ width:'100%', borderRadius:12, marginBottom:10 }}>Create my account</button>
              <button type="button" onClick={()=>{ setQuoteSent(false); setPage('home'); }} style={{ background:'none', border:'none', fontSize:13.5, color:'var(--muted)', cursor:'pointer' }}>Maybe later</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100dvh', paddingTop:80, paddingBottom: mobile?120:110, fontSize: mobile?15:16 }}>
      <div style={{ maxWidth:1560, margin:'0 auto', padding: mobile?'0 14px':'0 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'12px 0 10px' }}>
          <span onClick={()=>setStage('product')} style={{ cursor:'pointer', fontSize:13, color:'var(--ink-soft)' }}>‹ All products</span>
          <span style={{ fontSize:13, color:'var(--muted)' }}>{selProduct?.name || 'Wardrobe'}</span>
          <button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>Close ✕</button>
        </div>
        {planSteps('config')}

        {(() => {
          // toolbar pill styles (literal hex / tokens only)
          const seg = (active) => ({ padding:'6px 11px', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background: active?'var(--clay)':'transparent', color: active?'#fff':'var(--ink-soft)', borderRadius:8 });
          const segWrap = { display:'flex', gap:2, background:'rgba(255,255,255,.92)', border:'1px solid var(--line)', borderRadius:10, padding:3, boxShadow:'0 1px 3px rgba(0,0,0,.08)' };
          return (<>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':(railCollapsed?'1fr 0px':'1.9fr 1fr'), gap: railCollapsed?0:20, alignItems:'stretch', transition:'grid-template-columns .35s ease, gap .35s ease' }}>
          {/* BIG 3D STAGE */}
          <div style={{ background:'#f5f5f7', borderRadius:20, minHeight: mobile?'46vh':(railCollapsed?720:640), height: mobile?'46vh':undefined, position: mobile?'sticky':'relative', top: mobile?64:undefined, zIndex: mobile?5:undefined, overflow:'hidden' }}>
            <Wardrobe3D apiRef={plannerApi} finishHex={finishHex} layout={layout} glass={hasGlass} handles={hasHandles} led={hasLed} mobile={mobile} tall product={prodKey} widthCm={sizeW} heightCm={dims.height} depthCm={dims.depth} sideACm={dims.sideA} sideBCm={dims.sideB} unit={unit} preset={camPreset} scaleMode={scaleMode} />
            {aiSummary && <div style={{ position:'absolute', top:54, left:12, right:12, fontSize:12, background:'var(--sand)', color:'var(--clay-deep)', padding:'8px 12px', borderRadius:12 }}><Spark size={12} color="var(--clay-deep)" style={{ verticalAlign:'-1px' }} /> {aiSummary}</div>}
            {/* 3D TOOLBAR — units · presets · true-scale · expand rail */}
            <div style={{ position:'absolute', top:12, left:12, right:12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <div style={segWrap} role="group" aria-label="Units">
                <button type="button" style={seg(unit==='cm')} onClick={()=>setUnit('cm')}>cm</button>
                <button type="button" style={seg(unit==='in')} onClick={()=>setUnit('in')}>in</button>
              </div>
              <div style={segWrap} role="group" aria-label="Camera view">
                <button type="button" style={seg(camPreset==='front')} onClick={()=>setCamPreset('front')}>Front</button>
                <button type="button" style={seg(camPreset==='iso')} onClick={()=>setCamPreset('iso')}>Iso</button>
                <button type="button" style={seg(camPreset==='top')} onClick={()=>setCamPreset('top')}>Top</button>
              </div>
              <div style={segWrap} role="group" aria-label="Scale mode">
                <button type="button" style={seg(scaleMode==='fit')} onClick={()=>setScaleMode('fit')}>Fit</button>
                <button type="button" style={seg(scaleMode==='true')} onClick={()=>setScaleMode('true')}>True scale</button>
              </div>
              {!mobile && (
                <button type="button" aria-label={railCollapsed?'Show options':'Expand 3D'} onClick={()=>setRailCollapsed(c=>!c)} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid var(--line)', background:'rgba(255,255,255,.92)', color:'var(--ink-soft)', borderRadius:10, boxShadow:'0 1px 3px rgba(0,0,0,.08)' }}>
                  <i className={`ti ti-${railCollapsed?'layout-sidebar-right-expand':'arrows-maximize'}`} aria-hidden="true" /> {railCollapsed?'Show options':'Expand 3D'}
                </button>
              )}
            </div>
            <div style={{ position:'absolute', bottom:12, left:12, display:'flex', gap:6, alignItems:'center', fontSize:12, color:'#6e6e73', background:'rgba(255,255,255,.85)', padding:'5px 10px', borderRadius:10 }}>
              <i className="ti ti-ruler-2" aria-hidden="true" />
              {(() => { const cv = (cm)=> unit==='in' ? (Math.round((cm/2.54)*10)/10)+' in' : cm+' cm'; return (supportsSideAB&&layout==='l-shape') ? `${cv(dims.sideA)} + ${cv(dims.sideB)} × ${cv(dims.height)} × ${cv(dims.depth)}` : `${cv(dims.width)} × ${cv(dims.height)} × ${cv(dims.depth)}`; })()}
            </div>
            <button type="button" onClick={doPhotoreal} disabled={rendering} style={{ position:'absolute', bottom:12, right:12, display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:12, border:'none', cursor: rendering?'wait':'pointer', background:'linear-gradient(135deg,var(--clay),var(--clay-deep))', color:'#fff', fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(249,115,22,.4)' }}>
              <i className={rendering ? 'ti ti-loader-2' : 'ti ti-sparkles'} aria-hidden="true" />
              {rendering ? 'Rendering…' : 'Make it photorealistic'}
            </button>
          </div>

          {(rendering || renderUrl || renderErr) && (
            <div onClick={()=>{ if(!rendering){ setRenderUrl(null); setRenderErr(''); } }} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,18,22,.72)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
              <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18, maxWidth:880, width:'100%', maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.4)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #eee' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#1d1d1f' }}><Spark size={15} style={{ verticalAlign:'-2px' }} /> Photorealistic render</span>
                  <button type="button" aria-label="Close" onClick={()=>{ if(!rendering){ setRenderUrl(null); setRenderErr(''); } }} style={{ background:'none', border:'none', cursor:'pointer', color:'#999', fontSize:18 }}>✕</button>
                </div>
                <div style={{ padding:18, textAlign:'center' }}>
                  {rendering && <div style={{ padding:'50px 0', color:'#6e6e73', fontSize:14 }}><i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize:26 }} /><div style={{ marginTop:10 }}>Creating your photorealistic render… ~15–25 seconds.</div></div>}
                  {!rendering && renderErr && <div style={{ padding:'40px 10px', color:'#c0392b', fontSize:14 }}>{renderErr}</div>}
                  {!rendering && renderUrl && (<>
                    <img src={renderUrl} alt="Photorealistic render of your design" style={{ width:'100%', borderRadius:12, display:'block' }} />
                    <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:14, flexWrap:'wrap' }}>
                      <a href={renderUrl} download="closets-render.jpg" target="_blank" rel="noreferrer" style={{ padding:'10px 18px', borderRadius:12, background:'#1d1d1f', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700 }}>Download</a>
                      <button type="button" onClick={doPhotoreal} style={{ padding:'10px 18px', borderRadius:12, border:'1px solid #ddd', background:'#fff', color:'#1d1d1f', cursor:'pointer', fontSize:13, fontWeight:700 }}>Regenerate</button>
                    </div>
                    <div style={{ marginTop:10, fontSize:11, color:'#aaa' }}>AI-generated impression — exact finishes confirmed in your free design consultation.</div>
                  </>)}
                </div>
              </div>
            </div>
          )}

          {/* OPTIONS RAIL — living configurator (accordion) + sticky summary */}
          <div style={{ display: railCollapsed?'none':'flex', flexDirection:'column', gap:10, maxHeight: mobile?'none':720, overflowY: mobile?'visible':'auto', overflowX:'hidden', paddingRight:4, marginTop: mobile?14:0 }}>
            {(() => {
              const lay = (prodLayouts || LAYOUTS);
              const layoutBody = (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {lay.map(l=>{ const on = layout===l.id; return (
                    <button key={l.id} type="button" onClick={()=>setLayout(l.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px', border: on?'2px solid var(--clay)':'0.5px solid #e6e6e6', borderRadius:12, background: on?'var(--sand)':'#fff', cursor:'pointer', textAlign:'left' }}>
                      {layoutIcon(l.id, on)}
                      <span style={{ fontSize:13, fontWeight:on?600:500, color:'#1d1d1f' }}>{l.label}{(l.price>0)&&<span style={{ display:'block', fontSize:11, color:'var(--clay-deep)', fontWeight:400 }}>+{fmt(l.price)}</span>}</span>
                    </button> ); })}
                </div>
              );
              // Width label adapts: kitchen/walkin runs are "run length"; doors width is the leaf width.
              const widthLabel = isKitchen ? (KITCHEN_RUN_LAYOUTS.includes(layout) ? 'Run length' : 'Run width')
                : (prodKey==='walkin' ? 'Room width' : (isDoors ? 'Door width' : 'Width'));
              const depthLabel = isDoors ? 'Thickness' : 'Depth';
              const useAB = supportsSideAB && layout==='l-shape';
              // Standard chips: discrete presets straight from the product's dim spec.
              const stdChips = (lbl, key, spec) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:14, fontWeight:600, color:'var(--clay)' }}>{dims[key]} cm</span></div>
                  {spec.allowed && spec.allowed.length ? (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {spec.allowed.map(v=>{ const on = Number(dims[key])===v; return (
                        <button key={v} type="button" onClick={()=>setDims(c=>({ ...c, [key]: snapDim(spec, v) }))} style={{ minWidth:52, padding:'7px 10px', borderRadius:9, border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', fontSize:13, fontWeight: on?700:500, color: on?'var(--clay)':'var(--ink)', cursor:'pointer' }}>{v}</button>
                      ); })}
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:'var(--muted)' }}>Use Custom size for an exact measurement.</div>
                  )}
                </div>
              );
              // Custom numeric input: free value snapped/clamped to the product min/max on blur.
              const numInput = (lbl, key, spec) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:11.5, color:'var(--muted)' }}>{spec.min}–{spec.max} cm</span></div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="number" min={spec.min} max={spec.max} defaultValue={dims[key]} key={dims[key]}
                      onBlur={e=>setDims(c=>({ ...c, [key]: snapDim(spec, e.target.value) }))}
                      onKeyDown={e=>{ if(e.key==='Enter') e.currentTarget.blur(); }}
                      style={{ flex:1, padding:'10px 12px', border:'1px solid var(--line)', background:'#fff', borderRadius:10, fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>cm</span>
                  </div>
                </div>
              );
              const sizeBody = (
                <div>
                  {/* Standard / Custom segmented toggle */}
                  <div style={{ display:'flex', gap:2, background:'var(--sand)', border:'1px solid var(--line)', borderRadius:10, padding:3, marginBottom:14 }} role="group" aria-label="Size mode">
                    <button type="button" onClick={()=>setCustomSize(false)} style={{ flex:1, padding:'8px 10px', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', borderRadius:8, background: !customSize?'var(--clay)':'transparent', color: !customSize?'#fff':'var(--ink-soft)' }}>Standard sizes</button>
                    <button type="button" onClick={()=>setCustomSize(true)} style={{ flex:1, padding:'8px 10px', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', borderRadius:8, background: customSize?'var(--clay)':'transparent', color: customSize?'#fff':'var(--ink-soft)' }}>Custom size</button>
                  </div>
                  {useAB && <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:10 }}>L-shape — set each run, then the height & depth.</div>}
                  {!useAB && isKitchen && KITCHEN_RUN_LAYOUTS.includes(layout) && <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:10 }}>Total run length across all sides of your {layout} kitchen.</div>}
                  {customSize ? (<>
                    {useAB ? (<>{numInput('Side A','sideA',widthSpec)}{numInput('Side B','sideB',widthSpec)}</>) : numInput(widthLabel,'width',widthSpec)}
                    {numInput('Height','height',heightSpec)}
                    {numInput(depthLabel,'depth',depthSpec)}
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Exact sizes snap to the nearest buildable measurement.</div>
                  </>) : (<>
                    {useAB ? (<>{stdChips('Side A','sideA',widthSpec)}{stdChips('Side B','sideB',widthSpec)}</>) : stdChips(widthLabel,'width',widthSpec)}
                    {stdChips('Height','height',heightSpec)}
                    {stdChips(depthLabel,'depth',depthSpec)}
                  </>)}
                </div>
              );
              const finishBody = (
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {FINISHES.map(f=>(
                    <button key={f.id} type="button" onClick={()=>setFinishId(f.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:7, border: finishId===f.id?'2px solid var(--clay)':'0.5px solid #e6e6e6', borderRadius:10, background:'#fff', cursor:'pointer' }}>
                      <span style={{ width:44, height:44, borderRadius:7, background:f.hex, border:'0.5px solid rgba(0,0,0,.12)' }} />
                      <span style={{ fontSize:11, color:'#6e6e73' }}>{f.name}</span>
                    </button>
                  ))}
                </div>
              );
              // ── Option-card UI: pick a style per category (A swatch tile / B list row / C compact chip) ──
              // Style A: swatch/image-forward grid for finish/material/door-ish categories.
              const STYLE_A_KEYS = ['finish','material','door','worktop','glass','cabinet_finish','body_materials'];
              // Style B: rich list rows for richer catalogs.
              const STYLE_B_KEYS = ['handles','accessories','appliances','storage','hanging','shelves','drawers','lighting','hardware'];
              const cardStyleFor = (ck, items) => {
                const k = String(ck).toLowerCase();
                if (STYLE_A_KEYS.some(s => k.includes(s))) return 'A';
                if (STYLE_B_KEYS.some(s => k.includes(s))) return 'B';
                if ((items||[]).length <= 4) return 'C';
                return 'B';
              };
              const catBody = (ck) => {
                const cat=cats[ck]; const multi=cat.select==='multi';
                const items = (cat.items||[]).filter(it=>it.active!==false);
                const style = cardStyleFor(ck, items);
                const inclOf = (it) => it.price_type==='included'||+it.price===0;
                // STYLE A — swatch tile (image/swatch-forward, 2–3 cols, check badge + clay ring + sand bg)
                if (style === 'A') {
                  const cols = items.length >= 6 ? 3 : 2;
                  return (
                    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:8 }}>
                      {items.map(it=>{ const on=isOn(ck,it.id,multi); const incl=inclOf(it); return (
                        <div key={it.id} onClick={()=>pick(ck,it.id,multi)} style={{ cursor:'pointer', border: on?'2px solid var(--clay)':'0.5px solid var(--line)', borderRadius:10, overflow:'hidden', background: on?'var(--sand)':'#fff' }}>
                          <div style={{ height:72, background:cardBg(it), position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {!it.image_url && !it.swatch && <i className="ti ti-photo" style={{ fontSize:20, color:'rgba(0,0,0,.22)' }} aria-hidden="true" />}
                            {on && <span style={{ position:'absolute', top:6, right:6, width:22, height:22, borderRadius:'50%', background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" /></span>}
                          </div>
                          <div style={{ padding:'7px 9px' }}>
                            <div style={{ fontSize:12.5, fontWeight: on?600:500, lineHeight:1.2, color:'var(--ink)' }}>{it.name}</div>
                            <div style={{ fontSize:11.5, color: incl?'var(--muted)':'var(--clay-deep)', marginTop:3 }}>{incl?'Included':'+ '+fmt(it.price)}</div>
                          </div>
                        </div> ); })}
                    </div>
                  );
                }
                // STYLE C — compact chip (swatch dot + label + price, filled clay when selected)
                if (style === 'C') {
                  return (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {items.map(it=>{ const on=isOn(ck,it.id,multi); const incl=inclOf(it); return (
                        <button key={it.id} type="button" onClick={()=>pick(ck,it.id,multi)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:999, cursor:'pointer', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--clay)':'#fff' }}>
                          <span style={{ width:14, height:14, borderRadius:'50%', flexShrink:0, background:cardBg(it), border:'0.5px solid rgba(0,0,0,.15)' }} />
                          <span style={{ fontSize:13, fontWeight:600, color: on?'#fff':'var(--ink)' }}>{it.name}</span>
                          <span style={{ fontSize:11.5, color: on?'rgba(255,255,255,.85)':(incl?'var(--muted)':'var(--clay-deep)') }}>{incl?'Included':'+ '+fmt(it.price)}</span>
                          {on && <i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" />}
                        </button> ); })}
                    </div>
                  );
                }
                // STYLE B — list row (thumbnail + name + small desc + price on right + check/radio)
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {items.map(it=>{ const on=isOn(ck,it.id,multi); const incl=inclOf(it); return (
                      <div key={it.id} onClick={()=>pick(ck,it.id,multi)} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 11px', cursor:'pointer', borderRadius:12, border: on?'2px solid var(--clay)':'0.5px solid var(--line)', background: on?'var(--sand)':'#fff' }}>
                        <span style={{ width:42, height:42, borderRadius:9, flexShrink:0, background:cardBg(it), border:'0.5px solid rgba(0,0,0,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {!it.image_url && !it.swatch && <i className="ti ti-photo" style={{ fontSize:18, color:'rgba(0,0,0,.22)' }} aria-hidden="true" />}
                        </span>
                        <span style={{ flex:1, minWidth:0 }}>
                          <span style={{ display:'block', fontSize:13.5, fontWeight: on?600:500, color:'var(--ink)', lineHeight:1.25 }}>{it.name}</span>
                          {it.type_label && <span style={{ display:'block', fontSize:11.5, color:'var(--muted)', marginTop:1, lineHeight:1.3 }}>{it.type_label}</span>}
                        </span>
                        <span style={{ fontSize:12.5, fontWeight:600, color: incl?'var(--muted)':'var(--clay-deep)', whiteSpace:'nowrap' }}>{incl?'Included':'+ '+fmt(it.price)}</span>
                        <span style={{ width:22, height:22, borderRadius: multi?6:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: on?'var(--clay)':'transparent', border: on?'2px solid var(--clay)':'1.5px solid var(--line)' }}>
                          {on && <i className="ti ti-check" style={{ color:'#fff', fontSize:13 }} aria-hidden="true" />}
                        </span>
                      </div> ); })}
                  </div>
                );
              };
              // ── Living accordion: essentials (expanded) + optional categories (collapsed) ──
              const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
              const layLabel = (lay.find(l=>l.id===layout)||{}).label || layout;
              const sizeLabel = (() => { const cv = (cm)=> unit==='in' ? (Math.round((cm/2.54)*10)/10)+'"' : cm; return (supportsSideAB&&layout==='l-shape') ? `${cv(dims.sideA)}+${cv(dims.sideB)}×${cv(dims.height)}` : `${cv(dims.width)}×${cv(dims.height)}×${cv(dims.depth)} ${unit}`; })();
              const layoutSet = !!layout, sizeSet = dims.width>0 || (supportsSideAB&&layout==='l-shape'), finishSet = !!finishId;
              const readyForQuote = layoutSet && sizeSet && finishSet;
              const optionalCats = catKeys.filter(k=>k!=='door_finishes');
              // ── Guided one-step-at-a-time flow: Layout → Size → Finish → [each option category] ──
              const steps = [
                { id:'layout', title:'Layout', essential:true, body:layoutBody, chosen: layLabel, done: layoutSet },
                { id:'size', title:'Size', essential:true, body:sizeBody, chosen: sizeLabel, done: sizeSet },
                { id:'door_finishes', title:'Finish', essential:true, body:finishBody, chosen: finName, done: finishSet },
                ...optionalCats.map(ck => ({ id:ck, title:(cats[ck].label||ck), essential:false, body:catBody(ck), chosen: catChosen(ck), done: catStatus(ck)==='done' })),
              ];
              const curIdx = Math.max(0, Math.min(stepIndex, steps.length-1));
              const cur = steps[curIdx];
              const isLast = curIdx === steps.length-1;
              const goStep = (i) => { const n = Math.max(0, Math.min(i, steps.length-1)); setStepIndex(n); setVisitedSteps(v=>{ const s=new Set(v); s.add(steps[n].id); return s; }); };
              const stepIsDone = (st) => st.done || (!st.essential && visitedSteps.has(st.id));
              return (<>
                {/* Header + Ready-for-a-quote pill */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                  <span className="eyebrow" style={{ fontSize:12 }}>Your design · step {curIdx+1} of {steps.length}</span>
                  <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:999, transition:'all .25s',
                    color: readyForQuote?'#1D9E75':'var(--muted)', background: readyForQuote?'#1D9E7522':'var(--sand)' }}>
                    {readyForQuote ? '✓ Ready for a quote' : 'Set layout · size · finish'}
                  </span>
                </div>
                {/* COMPLETED steps — compact "done" rows above (tap to edit) */}
                {steps.slice(0, curIdx).map(st => {
                  const done = stepIsDone(st);
                  return (
                    <button key={st.id} type="button" onClick={()=>goStep(steps.indexOf(st))} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:12, border:'0.5px solid var(--line)', background:'#fff', cursor:'pointer', textAlign:'left', flexShrink:0 }}>
                      <span style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: done?'#1D9E75':'var(--sand)' }}>
                        {done ? <i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" /> : <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)' }}>–</span>}
                      </span>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{st.title}</span>
                      <span style={{ marginLeft:'auto', fontSize:12.5, color:'var(--ink-soft)', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{st.chosen || (st.essential?'—':'Skipped')}</span>
                      <i className="ti ti-pencil" style={{ color:'var(--muted)', fontSize:14, flexShrink:0 }} aria-hidden="true" />
                    </button>
                  );
                })}
                {/* CURRENT step — expanded */}
                <div style={{ border:'2px solid var(--clay)', borderRadius:14, overflow:'hidden', flexShrink:0, background:'#fff' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, padding:'14px 16px 6px' }}>
                    <span style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--clay)', color:'#fff', fontSize:12, fontWeight:700 }}>{curIdx+1}</span>
                    <span style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>{cur.title}</span>
                    {!cur.essential && <span style={{ fontSize:10.5, fontWeight:600, color:'var(--muted)', background:'var(--sand)', padding:'2px 8px', borderRadius:6 }}>optional</span>}
                  </div>
                  <div style={{ padding:'6px 16px 16px' }}>{cur.body}</div>
                  {/* Step nav */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 16px 16px' }}>
                    {curIdx>0 && <button type="button" onClick={()=>goStep(curIdx-1)} style={{ background:'none', border:'none', fontSize:13.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer', padding:'8px 4px' }}>‹ Back</button>}
                    {!cur.essential && !isLast && <button type="button" onClick={()=>goStep(curIdx+1)} style={{ background:'none', border:'none', fontSize:13, fontWeight:600, color:'var(--muted)', cursor:'pointer', padding:'8px 4px' }}>Skip</button>}
                    {isLast
                      ? <button type="button" className="btn-clay" disabled={busy} onClick={goVisualise} style={{ marginLeft:'auto', borderRadius:12, padding:'10px 20px', fontSize:14.5 }}>Visualise my design →</button>
                      : <button type="button" className="btn-clay" disabled={cur.essential && !cur.done} onClick={()=>goStep(curIdx+1)} style={{ marginLeft:'auto', borderRadius:12, padding:'10px 22px', fontSize:14.5, opacity:(cur.essential && !cur.done)?0.55:1 }}>Next →</button>}
                  </div>
                </div>
                {/* UPCOMING steps — muted/locked rows below (clickable-forward only if essentials before are done) */}
                {steps.slice(curIdx+1).map((st, i) => {
                  const absIdx = curIdx+1+i;
                  // Allow forward jump only when all essential steps before it are satisfied.
                  const blockingEssential = steps.slice(0, absIdx).some(s => s.essential && !s.done);
                  const locked = blockingEssential;
                  return (
                    <button key={st.id} type="button" disabled={locked} onClick={()=>{ if(!locked) goStep(absIdx); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:12, border:'0.5px solid var(--line)', background: locked?'transparent':'#fff', cursor: locked?'default':'pointer', textAlign:'left', flexShrink:0, opacity: locked?0.55:1 }}>
                      <span style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid var(--line)', color:'var(--muted)', fontSize:11, fontWeight:700 }}>{locked ? <i className="ti ti-lock" style={{ fontSize:12 }} aria-hidden="true" /> : absIdx+1}</span>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--ink-soft)' }}>{st.title}</span>
                      {!st.essential && <span style={{ fontSize:10.5, fontWeight:600, color:'var(--muted)', background:'var(--sand)', padding:'2px 8px', borderRadius:6 }}>optional</span>}
                    </button>
                  );
                })}
              </>);
            })()}

            {/* STICKY SUMMARY — single primary CTA */}
            {!mobile && (
              <div style={{ marginTop:6, background:'#fff', border:'0.5px solid #e6e6e6', borderRadius:14, padding:'16px', position:'sticky', bottom:0, boxShadow:'0 -2px 12px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize:13, color:'var(--ink-soft)', marginBottom:10, lineHeight:1.5 }}>
                  <strong style={{ color:'var(--ink)' }}>{selProduct?.name || 'Wardrobe'}</strong> · {((prodLayouts||LAYOUTS).find(l=>l.id===layout)||{}).label || layout} · {(() => { const cv = (cm)=> unit==='in' ? (Math.round((cm/2.54)*10)/10)+'"' : cm+'cm'; return (supportsSideAB&&layout==='l-shape') ? `${cv(dims.sideA)}+${cv(dims.sideB)}` : `${cv(dims.width)}×${cv(dims.height)}`; })()} · {(FINISHES.find(f=>f.id===finishId)||{}).name || finishId}
                </div>
                {total>0 && !pricing && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:'#86868b', marginBottom:6 }}>Package</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                      {PACKAGES.map((p,i)=>{ const on = i===pkg; return (
                        <button key={p.name} type="button" onClick={()=>setPkg(i)} style={{ border:'1px solid '+(on?'var(--clay)':'#e6e6e6'), background:on?'var(--sand)':'#fff', borderRadius:10, padding:'8px 6px', textAlign:'center', cursor:'pointer' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:on?'var(--clay)':'#1d1d1f' }}>{p.name}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', marginTop:3 }}>{fmt(Math.round(total*p.mult))}</div>
                        </button>
                      ); })}
                    </div>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#86868b' }}>Estimated total · {selPkg.name}</span>
                  <span style={{ fontSize:24, fontWeight:700, color:'var(--clay)' }}>{pricing?'…':fmt(pkgTotal)}</span>
                </div>
                {total>0 && !pricing && (
                  <div style={{ marginBottom:10 }}>
                    <button type="button" onClick={()=>setShowItemized(s=>!s)} style={{ background:'none', border:'none', padding:0, fontSize:12.5, fontWeight:600, color:'var(--clay-deep)', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                      <i className={`ti ti-chevron-${showItemized?'up':'down'}`} aria-hidden="true" /> See itemized breakdown
                    </button>
                    {showItemized && (() => { const ld = buildLineItems(); return (
                      <div style={{ marginTop:8, borderTop:'1px solid var(--line)', paddingTop:8 }}>
                        {ld.items.map((li,i)=>(
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'3px 0', fontSize:12.5 }}>
                            <span style={{ color:'var(--ink-soft)' }}>{li.label}</span>
                            <span style={{ fontWeight:600, color: li.price===0?'var(--muted)':'var(--ink)', whiteSpace:'nowrap' }}>{li.price===0?'Included':fmt(li.price)}</span>
                          </div>
                        ))}
                        {ld.pkgAdj !== 0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:12.5, color:'var(--ink-soft)' }}><span>{ld.pkgName} package</span><span style={{ fontWeight:600 }}>{ld.pkgAdj>0?'+ ':'− '}{fmt(Math.abs(ld.pkgAdj))}</span></div>}
                        {ld.vat>0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:12.5, color:'var(--ink-soft)' }}><span>VAT ({Math.round(ld.vatRate*100)}%)</span><span style={{ fontWeight:600 }}>{fmt(ld.vat)}</span></div>}
                      </div>
                    ); })()}
                  </div>
                )}
                <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:12 }}>Indicative — your free design visit confirms an exact, itemised quote.</div>
                {/* Secondary: save the design (quote/visualise handled by guided steps + sticky bar) */}
                <button type="button" className="btn-secondary" disabled={busy} onClick={save} style={{ width:'100%', borderRadius:12, color: saved?'var(--good)':'var(--ink-soft)' }}>{saved?'✓ Saved':'Save my design'}</button>
              </div>
            )}
          </div>
        </div>
        {/* FULL-WIDTH STICKY ACTION BAR — live total (left) + one big quote button (right).
            Desktop: spans the config area. Mobile: fixed bottom with safe-area. Always visible. */}
        <div style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:40, background:'#fff', borderTop:'1px solid var(--line)', boxShadow:'0 -4px 18px rgba(0,0,0,.08)', padding:`12px 0 calc(12px + env(safe-area-inset-bottom))` }}>
          <div style={{ maxWidth:1560, margin:'0 auto', padding: mobile?'0 14px':'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontSize:11.5, color:'var(--muted)' }}>Estimated · {selPkg.name}</span>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontSize: mobile?22:26, fontWeight:800, color:'var(--clay)' }}>{pricing?'…':fmt(pkgTotal)}</span>
                <span style={{ fontSize:11, color:'var(--muted)' }}>incl. VAT</span>
              </div>
            </div>
            <button type="button" className="btn-clay" disabled={busy} onClick={requestQuote} style={{ borderRadius:14, padding: mobile?'13px 20px':'14px 34px', fontSize: mobile?14.5:16, fontWeight:700, whiteSpace:'nowrap', flexShrink:0 }}>
              {busy ? 'Sending…' : (user ? 'Get my quote →' : 'Sign in & quote →')}
            </button>
          </div>
        </div>
        </>
        );
        })()}
      </div>

      {/* Inline branded quote contact form (replaces window.prompt) */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:440, width:'100%', padding:26 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>Almost there</div>
            <h3 className="display" style={{ fontSize:24, color:'var(--ink)', margin:'0 0 6px' }}>Where shall we send your quote?</h3>
            <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 18px', lineHeight:1.6 }}>Our design team will review your {selProduct?.name?.toLowerCase()||'design'} and get back with an exact, itemised quote.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={qForm.name} onChange={e=>setQForm(s=>({...s,name:e.target.value}))} aria-label="Your name" placeholder="Your name" style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
              <input value={qForm.phone} onChange={e=>setQForm(s=>({...s,phone:e.target.value}))} aria-label="Phone (+973…)" placeholder="Phone (+973…)" inputMode="tel" style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
              <input value={qForm.email} onChange={e=>setQForm(s=>({...s,email:e.target.value}))} aria-label="Email (optional)" placeholder="Email (optional)" inputMode="email" style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
            </div>
            {quoteErr && <div role="alert" style={{ marginTop:12, background:'#fdecea', border:'1px solid #f5c6c0', color:'#b3261e', borderRadius:12, padding:'10px 14px', fontSize:13 }}>{quoteErr}</div>}
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <button type="button" onClick={()=>setShowQuote(false)} disabled={busy} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>Cancel</button>
              <button type="button" className="btn-clay" disabled={busy || !qForm.name.trim() || !qForm.phone.trim()} onClick={()=>submitQuote(qForm)} style={{ flex:2, borderRadius:12, opacity:(busy||!qForm.name.trim()||!qForm.phone.trim())?.6:1 }}>{busy?'Sending…':'Send my quote request'}</button>
            </div>
          </div>
        </div>
      )}

      {/* guest quote success → account invite (also reachable from config-direct quote) */}
      {quoteSent && (
        <div style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <div style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:440, width:'100%', padding:28, textAlign:'center' }}>
            <div style={{ width:54, height:54, borderRadius:'50%', background:'#1D9E7522', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><i className="ti ti-check" style={{ color:'#1D9E75', fontSize:28 }} aria-hidden="true" /></div>
            <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 8px' }}>Quote sent!</h3>
            <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 20px', lineHeight:1.6 }}>Create a free account to track your quote, save this design and follow your order.</p>
            <button type="button" className="btn-clay" onClick={()=>{ const c = quoteSent; if (openAuth) openAuth('register', c && typeof c==='object' ? c : undefined); else setPage('portal'); }} style={{ width:'100%', borderRadius:12, marginBottom:10 }}>Create my account</button>
            <button type="button" onClick={()=>{ setQuoteSent(false); setPage('home'); }} style={{ background:'none', border:'none', fontSize:13.5, color:'var(--muted)', cursor:'pointer' }}>Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, sub }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding: sub?'4px 0 4px 10px':'8px 0', borderBottom: sub?'none':'1px solid #e6e6e6' }}>
      <span style={{ fontSize: sub?12:13, color: sub?'#86868b':'#1d1d1f' }}>{k}</span>
      <span style={{ fontSize: sub?12:13, fontWeight: sub?400:500 }}>{v}</span>
    </div>
  );
}

/* ── HOME HUB ── */
function HomeHub({ user, setUser, setPage }) {
  const [tab, setTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [svcBookings, setSvcBookings] = useState([]);
  const [cardSlug, setCardSlug] = useState(null);
  const [cardPhoto, setCardPhoto] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [cmpForm, setCmpForm] = useState({ category: 'Quality Issue', description: '' });
  const [tktForm, setTktForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const mobile = useMobile();
  const tierC = { Bronze: '#9c6f2e', Silver: '#6e6e73', Gold: '#b8860b', Platinum: '#6e3fa3' };
  useEffect(() => {
    if (!user?.email) return;
    api(`sales_orders?customer_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=20`).then(r => setOrders(Array.isArray(r)?r:[])).catch(()=>{});
    api(`invoices?customer_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=20`).then(r => setInvoices(Array.isArray(r)?r:[])).catch(()=>{});
    api(`website_rewards?customer_id=eq.${user.id}&order=created_at.desc&limit=50`).then(r => setRewards(Array.isArray(r)?r:[])).catch(()=>{});
    api(`product_configurations?customer_id=eq.${user.id}&order=created_at.desc&limit=20`).then(r => setDesigns(p => mergeDesigns(p, Array.isArray(r)?r:[]))).catch(()=>{});
    fetch(SUPA_URL + '/rest/v1/rpc/my_saved_designs', {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ p_customer_id: String(user.id) })
    }).then(r => r.ok ? r.json() : []).then(r => setDesigns(p => mergeDesigns(p, Array.isArray(r)?r:[]))).catch(()=>{});
    api(`complaints?customer_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=20`).then(r => setComplaints(Array.isArray(r)?r:[])).catch(()=>{});
    api(`it_tickets?requester_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=20`).then(r => setTickets(Array.isArray(r)?r:[])).catch(()=>{});
    api('rpc/customer_bookings_list', { method:'POST', body:{ p_customer_id:String(user.id) } }).then(r => setSvcBookings(Array.isArray(r)?r:[])).catch(()=>{});
    cardRpc('card_owner_slug', { p_owner_type:'customer', p_owner_id:user.id }).then(r => { setCardSlug(r && r.slug); setCardPhoto(r && r.photo_url); }).catch(()=>{});
  }, [user]);
  const totalSpent = invoices.reduce((s, i) => s + parseFloat(i.total_amount || i.amount || 0), 0);
  const submitComplaint = async () => {
    if (!cmpForm.description) { toast('Please describe your issue', 'error'); return; }
    const id = 'CMP-' + Date.now().toString(36).toUpperCase();
    await api('complaints', { method: 'POST', body: [{ id, ...cmpForm, customer_name: user.name, customer_email: user.email, customer_id: user.id, status: 'Open', source: 'Hub', created_at: new Date().toISOString() }] });
    setComplaints(p => [{ id, ...cmpForm, status: 'Open', created_at: new Date().toISOString() }, ...p]);
    setCmpForm({ category: 'Quality Issue', description: '' }); toast('Request submitted ✓', 'success');
  };
  const submitTicket = async () => {
    if (!tktForm.subject) { toast('Please add a subject', 'error'); return; }
    const id = 'TKT-' + Date.now().toString(36).toUpperCase();
    await api('it_tickets', { method: 'POST', body: [{ id, ...tktForm, requester: user.name, requester_email: user.email, customer_id: user.id, status: 'Open', source: 'Hub', created_at: new Date().toISOString() }] });
    setTickets(p => [{ id, ...tktForm, status: 'Open', created_at: new Date().toISOString() }, ...p]);
    setTktForm({ subject: '', description: '', priority: 'Medium' }); toast('Ticket submitted ✓', 'success');
  };
  const saveProfile = async () => {
    await api(`customers?id=eq.${user.id}`, { method: 'PATCH', body: { name: editForm.name, phone: editForm.phone, updated_at: new Date().toISOString() } });
    const u = { ...user, ...editForm }; setUser(u); localStorage.setItem('closets_user', JSON.stringify(u)); toast('Saved ✓', 'success');
  };
  const tabs = [['dashboard','Dashboard'],['card','My Card'],['svcbookings','Bookings'],['ledger','Ledger'],['orders','Orders'],['designs','My Designs'],['rewards','Rewards'],['requests','Requests'],['support','Support'],['profile','Profile']];
  const cardUrl = cardSlug ? `${HUB_ORIGIN}/card.html?c=${encodeURIComponent(cardSlug)}` : null;
  const shareCard = async () => {
    if (!cardUrl) return;
    if (navigator.share) { try { await navigator.share({ title: user.name + ' — The Closets', url: cardUrl }); } catch(_){} }
    else { try { await navigator.clipboard.writeText(cardUrl); toast('Card link copied ✓','success'); } catch(_){} }
  };
  const uploadPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }
    setPhotoBusy(true);
    try {
      const path = 'customer/' + user.id + '/photo-' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const up = await fetch(SUPA_URL + '/storage/v1/object/card-media/' + path, {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file
      });
      if (!up.ok) throw new Error('upload failed');
      const publicUrl = SUPA_URL + '/storage/v1/object/public/card-media/' + path;
      const r = await cardRpc('customer_card_set_photo', { p_customer_id: user.id, p_photo_url: publicUrl });
      if (r && r.ok) { setCardPhoto(publicUrl); toast('Profile photo updated ✓', 'success'); }
      else { toast((r && r.error) || 'Could not save photo', 'error'); }
    } catch (_) { toast('Upload failed, please try again', 'error'); }
    setPhotoBusy(false);
    e.target.value = '';
  };
  const Pill = ({ label, color, bg }) => <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 980, background: bg, color, fontSize: 12, fontWeight: 500 }}>{label}</span>;
  return (
    <div style={{ minHeight: '100dvh', paddingTop: mobile ? 0 : 56, paddingBottom: mobile ? 80 : 0, background: '#f5f5f7' }}>
      {/* Mobile header */}
      {mobile && (
        <div style={{ background: '#fff', padding: '16px 16px 0', borderBottom: '1px solid #f5f5f7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(249,115,22,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--clay)' }}>{user.name?.[0]||'?'}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#86868b' }}>{user.tier||'Bronze'} · {(user.points||0).toLocaleString()} pts</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {tabs.map(([key, label]) => (
              <button type="button" key={key} onClick={() => setTab(key)} style={{ padding: '7px 14px', borderRadius: 980, border: 'none', background: tab === key ? '#1d1d1f' : '#f5f5f7', color: tab === key ? '#fff' : '#6e6e73', fontSize: 13, fontWeight: tab === key ? 500 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: mobile ? '16px 16px' : '32px 40px', display: mobile ? 'block' : 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        {/* Desktop sidebar */}
        {!mobile && (
          <div>
            <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, border: '1px solid #e6e6e6' }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(249,115,22,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--clay)', marginBottom: 12 }}>{user.name?.[0]||'?'}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#86868b', marginBottom: 10 }}>{user.email}</div>
              <Pill label={`${user.tier||'Bronze'} · ${(user.points||0).toLocaleString()} pts`} color={tierC[user.tier||'Bronze']} bg={`${tierC[user.tier||'Bronze']}18`} />
            </div>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e6e6e6' }}>
              {tabs.map(([key, label]) => (
                <button type="button" key={key} onClick={() => setTab(key)} style={{ width: '100%', padding: '12px 18px', background: tab === key ? 'rgba(249,115,22,.08)' : 'transparent', border: 'none', borderBottom: '1px solid #f5f5f7', cursor: 'pointer', fontSize: 14, fontWeight: tab === key ? 500 : 400, color: tab === key ? 'var(--clay)' : '#6e6e73', textAlign: 'left', transition: 'all .15s' }}>{label}</button>
              ))}
              <button type="button" onClick={() => { setUser(null); localStorage.removeItem('closets_user'); setPage('home'); }} style={{ width: '100%', padding: '12px 18px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#d93025', textAlign: 'left' }}>Sign Out</button>
            </div>
          </div>
        )}
        {/* Content */}
        <div>
          {tab === 'card' && <>
            {!mobile && <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: '#1d1d1f', marginBottom: 20 }}>My Digital Card</h2>}
            <div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:28, maxWidth:560 }}>
              {cardSlug ? <>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
                  <div style={{ position:'relative', width:64, height:64 }}>
                    <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#A855F7,#A855F799)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff' }}>
                      {cardPhoto ? <img src={cardPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (user.name?.[0]||'?')}
                    </div>
                    <button type="button" onClick={()=>document.getElementById('cust-photo-input').click()} title="Change photo" style={{ position:'absolute', right:-2, bottom:-2, width:24, height:24, borderRadius:'50%', border:'2px solid #fff', background:'var(--clay)', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>✎</button>
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:'#1d1d1f' }}>{user.name}</div>
                    <div style={{ fontSize:13, color:'#86868b' }}>{(user.tier||'Bronze')} member · {(user.points||0).toLocaleString()} pts</div>
                  </div>
                </div>
                <input id="cust-photo-input" type="file" accept="image/*" style={{ display:'none' }} onChange={uploadPhoto} />
                <p style={{ fontSize:14, color:'#6e6e73', lineHeight:1.6, marginBottom:18 }}>Your personal digital card is live. Share it to let people save your contact, view your membership and book with us.</p>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <a href={cardUrl} target="_blank" rel="noreferrer" className="btn" style={{ borderRadius:14, textDecoration:'none' }}>Open my card ↗</a>
                  <button type="button" className="btn-secondary" onClick={shareCard} style={{ borderRadius:14 }}>Share</button>
                  <button type="button" className="btn-secondary" onClick={()=>document.getElementById('cust-photo-input').click()} disabled={photoBusy} style={{ borderRadius:14 }}>{photoBusy ? 'Uploading…' : (cardPhoto ? 'Change photo' : 'Upload photo')}</button>
                </div>
              </> : <>
                <div style={{ fontSize:40, marginBottom:10 }}>🪪</div>
                <div style={{ fontSize:17, fontWeight:600, color:'#1d1d1f' }}>No digital card yet</div>
                <p style={{ fontSize:14, color:'#86868b', marginTop:8 }}>Ask our team to activate your free digital membership card — it carries your tier, points and rewards.</p>
                <button type="button" className="btn" onClick={()=>setPage('contact')} style={{ borderRadius:14, marginTop:14 }}>Contact us</button>
              </>}
            </div>
          </>}
          {tab === 'dashboard' && <>
            {!mobile && <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: '#1d1d1f', marginBottom: 20 }}>Home Hub</h2>}
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[['Total Invested', fmt(totalSpent), 'var(--clay)'], ['Active Orders', orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length, '#1d1d1f'], ['Points', (user.points||0).toLocaleString(), '#b8860b'], ['Designs', designs.length, '#1d1d1f']].map(([label,val,color])=>(
                <div key={label} style={{ background: '#fff', borderRadius: 18, padding: '18px 16px', border: '1px solid #e6e6e6' }}>
                  <div style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color, letterSpacing: '-.02em', marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 12, color: '#86868b' }}>{label}</div>
                </div>
              ))}
            </div>
            {orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).slice(0,2).map(order=>{
              const steps=['Confirmed','Materials','Production','Quality','Ready','Delivered'];
              const idx=Math.max(0,steps.findIndex(s=>(order.status||'').toLowerCase().startsWith(s.toLowerCase().slice(0,4))));
              const pct=Math.round(((idx+1)/steps.length)*100);
              return <div key={order.id} style={{ background:'#fff', borderRadius:16, padding:'18px 20px', border:'1px solid #e6e6e6', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'#1d1d1f' }}>{order.order_number||order.id}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{pct}%</span>
                </div>
                <div style={{ background:'#f5f5f7', borderRadius:980, height:6, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,var(--clay),#ea6c0a)', borderRadius:980, transition:'width 1s ease' }} />
                </div>
                <div style={{ fontSize:12, color:'#86868b', marginTop:6 }}>{order.status||'In Progress'}</div>
              </div>;
            })}
            {mobile && <button type="button" onClick={() => { setUser(null); localStorage.removeItem('closets_user'); setPage('home'); }} style={{ width: '100%', background: 'transparent', border: '1.5px solid #fecaca', borderRadius: 14, padding: '13px', color: '#d93025', fontSize: 15, cursor: 'pointer', marginTop: 12 }}>Sign Out</button>}
          </>}

          {tab === 'ledger' && <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em' }}>Ledger</h2>
              <span style={{ fontSize:18, fontWeight:700, color:'var(--clay)' }}>{fmt(totalSpent)}</span>
            </div>
            {invoices.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'#86868b', background:'#fff', borderRadius:16, fontSize:14 }}>No invoices yet</div> : (
              <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', border:'1px solid #e6e6e6' }}>
                {invoices.map((inv,i)=>(
                  <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:i<invoices.length-1?'1px solid #f5f5f7':'none' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:'var(--clay)', marginBottom:2 }}>{inv.invoice_number||inv.id}</div>
                      <div style={{ fontSize:12, color:'#86868b' }}>{inv.description||'Order'} · {inv.created_at?new Date(inv.created_at).toLocaleDateString('en-GB'):'—'}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#1d1d1f', marginBottom:4 }}>{fmt(inv.total_amount||inv.amount)}</div>
                      <Pill label={inv.status||'Pending'} color={inv.status==='Paid'?'#1a7a40':'#b8860b'} bg={inv.status==='Paid'?'rgba(26,122,64,.1)':'rgba(184,134,11,.1)'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>}

          {tab === 'svcbookings' && <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', margin:0 }}>Service bookings</h2>
              <button type="button" className="btn" onClick={()=>setPage('services')} style={{ borderRadius:12, padding:'8px 16px', fontSize:14 }}>+ Book a service</button>
            </div>
            {svcBookings.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'#86868b', background:'#fff', borderRadius:16, fontSize:14 }}>No service bookings yet.</div> : svcBookings.map(b=>{
              const s=(b.status||'').toLowerCase();
              const col = /complet/.test(s)?'#16a34a' : /cancel|disput/.test(s)?'#dc2626' : /request/.test(s)?'var(--clay)' : '#3b82f6';
              return (
                <div key={b.id} style={{ background:'#fff', borderRadius:16, padding:'16px 18px', border:'1px solid #e6e6e6', marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'#1d1d1f' }}>{b.category_name||'Service'}</div>
                    <Pill label={b.status||'Requested'} color={col} bg={col+'18'} />
                  </div>
                  <div style={{ fontSize:12.5, color:'#86868b', marginTop:5 }}>
                    {b.provider_name?('👷 '+b.provider_name):(b.mode==='on_demand'?'ASAP':'Scheduled')}{b.area?(' · '+b.area):''}{b.slot?(' · '+b.slot):''}
                    {b.price_approval_status==='pending'?'  ·  ⏳ price approval needed':''}
                  </div>
                  {!!b.notes && <div style={{ fontSize:12.5, color:'#6e6e73', marginTop:6 }}>{b.notes}</div>}
                </div>
              );
            })}
          </>}

          {tab === 'orders' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>Orders</h2>
            {orders.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'#86868b', background:'#fff', borderRadius:16, fontSize:14 }}>No orders yet</div> : orders.map(o=>(
              <div key={o.id} style={{ background:'#fff', borderRadius:16, padding:'16px 18px', border:'1px solid #e6e6e6', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, fontWeight:600, color:'#1d1d1f', marginBottom:3 }}>{o.order_number||o.id}</div><div style={{ fontSize:12, color:'#86868b' }}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-GB'):'—'}</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:15, fontWeight:700, color:'#1d1d1f', marginBottom:6 }}>{fmt(o.total_amount||o.amount)}</div><Pill label={o.status||'Processing'} color="var(--clay)" bg="rgba(249,115,22,.1)" /></div>
              </div>
            ))}
          </>}

          {tab === 'designs' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>My Designs</h2>
            {designs.length===0 ? (
              <div style={{ textAlign:'center', padding:'48px 24px', color:'#86868b', background:'#fff', borderRadius:16, border:'1px solid #e6e6e6' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🪟</div>
                <div style={{ fontSize:15, color:'#1d1d1f', fontWeight:600, marginBottom:6 }}>No saved designs yet</div>
                <p style={{ fontSize:13.5, marginBottom:16 }}>Start one in the Design Studio.</p>
                <button type="button" className="btn" onClick={()=>setPage('planner')} style={{ borderRadius:14 }}>Open Design Studio</button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:14 }}>
                {designs.map(d=>{
                  const s=(d.status||'saved').toLowerCase();
                  const sCol = /quote/.test(s)?'#1a7a40' : 'var(--clay)';
                  return (
                    <div key={d.id} onClick={()=>setSelectedDesign(d)} style={{ background:'#fff', borderRadius:16, border:'1px solid #e6e6e6', overflow:'hidden', cursor:'pointer', transition:'box-shadow .15s' }}>
                      <div style={{ width:'100%', height:160, background:'#f5f5f7', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                        {d.render_url
                          ? <img src={d.render_url} alt={d.product_name||'Design'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : <span style={{ fontSize:38, opacity:.45 }}>🪟</span>}
                      </div>
                      <div style={{ padding:16 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                          <div style={{ fontSize:15, fontWeight:600, color:'#1d1d1f' }}>{d.product_name||'Design'}</div>
                          <Pill label={d.status||'Saved'} color={sCol} bg={sCol+'18'} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontSize:16, fontWeight:700, color:'var(--clay)' }}>{fmt(d.total_price)}</div>
                          <div style={{ fontSize:12, color:'#86868b' }}>{d.created_at?new Date(d.created_at).toLocaleDateString('en-GB'):'—'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedDesign && (
              <div onClick={()=>setSelectedDesign(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:1000 }}>
                <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, maxWidth:520, width:'100%', maxHeight:'90vh', overflow:'auto', border:'1px solid #e6e6e6' }}>
                  <div style={{ position:'relative', width:'100%', height:220, background:'#f5f5f7', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                    {selectedDesign.render_url
                      ? <img src={selectedDesign.render_url} alt={selectedDesign.product_name||'Design'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontSize:54, opacity:.45 }}>🪟</span>}
                    <button type="button" onClick={()=>setSelectedDesign(null)} style={{ position:'absolute', top:12, right:12, width:30, height:30, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.5)', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>×</button>
                  </div>
                  <div style={{ padding:22 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:19, fontWeight:700, color:'#1d1d1f' }}>{selectedDesign.product_name||'Design'}</div>
                        <div style={{ fontSize:12, color:'#86868b', marginTop:2 }}>{selectedDesign.created_at?new Date(selectedDesign.created_at).toLocaleDateString('en-GB'):''}</div>
                      </div>
                      <Pill label={selectedDesign.status||'Saved'} color={/quote/.test((selectedDesign.status||'').toLowerCase())?'#1a7a40':'var(--clay)'} bg={(/quote/.test((selectedDesign.status||'').toLowerCase())?'#1a7a40':'var(--clay)')+'18'} />
                    </div>
                    {selectedDesign.configuration && typeof selectedDesign.configuration==='object' && (
                      <div style={{ background:'#f8f8f8', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#86868b', marginBottom:8, textTransform:'uppercase', letterSpacing:'.04em' }}>Specification</div>
                        {Object.entries(selectedDesign.configuration).filter(([,v])=>v!=null && typeof v!=='object').map(([k,v])=>(
                          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid #efefef' }}>
                            <span style={{ color:'#86868b', textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                            <span style={{ color:'#1d1d1f', fontWeight:500, textAlign:'right' }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                      <span style={{ fontSize:13, color:'#86868b' }}>Total</span>
                      <span style={{ fontSize:22, fontWeight:700, color:'var(--clay)' }}>{fmt(selectedDesign.total_price)}</span>
                    </div>
                    <button type="button" className="btn" onClick={()=>{ setSelectedDesign(null); setPage('planner'); }} style={{ borderRadius:14, width:'100%' }}>Design again</button>
                  </div>
                </div>
              </div>
            )}
          </>}

          {tab === 'rewards' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>Rewards</h2>
            <div style={{ background:'#fff', borderRadius:20, padding:24, marginBottom:14, border:'1px solid #e6e6e6' }}>
              <div style={{ fontSize:12, color:'#86868b', marginBottom:4 }}>Balance</div>
              <div style={{ fontSize:44, fontWeight:700, color:'var(--clay)', letterSpacing:'-.03em', marginBottom:4 }}>{(user.points||0).toLocaleString()}</div>
              <div style={{ fontSize:13, color:'#86868b', marginBottom:20 }}>points · {user.tier||'Bronze'} member</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[['Bronze','0–999'],['Silver','1k–5k'],['Gold','5k–15k'],['Platinum','15k+']].map(([tier,range])=>(
                  <div key={tier} style={{ background:user.tier===tier?`${tierC[tier]}15`:'#f5f5f7', borderRadius:12, padding:'10px 8px', opacity:user.tier===tier?1:.4, border:user.tier===tier?`1.5px solid ${tierC[tier]}`:'1.5px solid transparent' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:tierC[tier], marginBottom:1 }}>{tier}</div>
                    <div style={{ fontSize:10, color:'#86868b' }}>{range}</div>
                  </div>
                ))}
              </div>
            </div>
            {rewards.map((r,i)=>(
              <div key={i} style={{ background:'#fff', borderRadius:14, padding:'14px 18px', border:'1px solid #e6e6e6', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, color:'#1d1d1f', marginBottom:2 }}>{r.description}</div><div style={{ fontSize:12, color:'#86868b' }}>{r.created_at?new Date(r.created_at).toLocaleDateString('en-GB'):''}</div></div>
                <span style={{ fontSize:16, fontWeight:700, color:r.type==='earned'?'#1a7a40':'#d93025' }}>{r.type==='earned'?'+':'-'}{r.points}</span>
              </div>
            ))}
          </>}

          {tab === 'requests' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>Service Requests</h2>
            <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #e6e6e6', marginBottom:14 }}>
              <select className="inp" value={cmpForm.category} onChange={e=>setCmpForm(p=>({...p,category:e.target.value}))} style={{ marginBottom:10 }}>
                {['Quality Issue','Delivery Problem','Incomplete Install','Design Discrepancy','Maintenance','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
              <textarea className="inp" rows={3} aria-label="Describe your issue" placeholder="Describe your issue…" value={cmpForm.description} onChange={e=>setCmpForm(p=>({...p,description:e.target.value}))} style={{ marginBottom:12, resize:'vertical' }} />
              <button type="button" className="btn" onClick={submitComplaint} style={{ borderRadius:12 }}>Submit Request</button>
            </div>
            {complaints.map(c=>(
              <div key={c.id} style={{ background:'#fff', borderRadius:14, padding:'14px 18px', border:'1px solid #e6e6e6', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, fontWeight:500, color:'#1d1d1f', marginBottom:2 }}>{c.category}</div><div style={{ fontSize:12, color:'#86868b' }}>{c.id}</div></div>
                <Pill label={c.status||'Open'} color={c.status==='Resolved'?'#1a7a40':'#b8860b'} bg={c.status==='Resolved'?'rgba(26,122,64,.1)':'rgba(184,134,11,.1)'} />
              </div>
            ))}
          </>}

          {tab === 'support' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>Support</h2>
            <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #e6e6e6', marginBottom:14 }}>
              <input className="inp" placeholder="Subject" aria-label="Subject" value={tktForm.subject} onChange={e=>setTktForm(p=>({...p,subject:e.target.value}))} style={{ marginBottom:10 }} />
              <textarea className="inp" rows={3} placeholder="Description…" aria-label="Description" value={tktForm.description} onChange={e=>setTktForm(p=>({...p,description:e.target.value}))} style={{ marginBottom:10, resize:'vertical' }} />
              <select className="inp" value={tktForm.priority} onChange={e=>setTktForm(p=>({...p,priority:e.target.value}))} style={{ marginBottom:12 }}>
                {['Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}
              </select>
              <button type="button" className="btn" onClick={submitTicket} style={{ borderRadius:12 }}>Submit Ticket</button>
            </div>
            {tickets.map(t=>(
              <div key={t.id} style={{ background:'#fff', borderRadius:14, padding:'14px 18px', border:'1px solid #e6e6e6', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, fontWeight:500, color:'#1d1d1f', marginBottom:2 }}>{t.subject}</div><div style={{ fontSize:12, color:'#86868b' }}>{t.id} · {t.priority}</div></div>
                <Pill label={t.status||'Open'} color="var(--clay)" bg="rgba(249,115,22,.1)" />
              </div>
            ))}
          </>}

          {tab === 'profile' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>Profile</h2>
            <div style={{ background:'#fff', borderRadius:20, padding:24, border:'1px solid #e6e6e6' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div><label style={{ fontSize:13, fontWeight:500, color:'#86868b', display:'block', marginBottom:6 }}>Full Name</label><input className="inp" value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} /></div>
                <div><label style={{ fontSize:13, fontWeight:500, color:'#86868b', display:'block', marginBottom:6 }}>Email</label><input className="inp" value={user.email} disabled style={{ opacity:.5 }} /></div>
                <div><label style={{ fontSize:13, fontWeight:500, color:'#86868b', display:'block', marginBottom:6 }}>Phone</label><input className="inp" value={editForm.phone} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))} /></div>
                <button type="button" className="btn" onClick={saveProfile} style={{ borderRadius:14, marginTop:4 }}>Save Changes</button>
              </div>
            </div>
          </>}
        </div>
      </div>
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
  const { t } = useI18n();
  const mobile = useMobile();
  const submit = async () => {
    if (!form.email||!form.password) { toast('Email and password required', 'error'); return; }
    if (mode!=='login' && !form.name) { toast('Name required', 'error'); return; }
    setLoading(true);
    // Secure server-side auth (bcrypt) — passwords never handled or read by the browser.
    const hdr = { ...H, Prefer: 'return=representation' };
    try {
      const u = mode==='login'
        ? await api('rpc/account_login', { method:'POST', headers:hdr, body:{ p_email: form.email, p_password: form.password } })
        : await api('rpc/account_register', { method:'POST', headers:hdr, body:{ p_email: form.email, p_password: form.password, p_name: form.name, p_phone: form.phone||null } });
      if (!u || !u.id) throw new Error('Unexpected response');
      setUser(u); localStorage.setItem('closets_user', JSON.stringify(u));
      toast(mode==='login'?'Welcome back ✓':'Account created — 100 points added ✓', 'success'); onClose();
    } catch (e) {
      toast(e.message || 'Could not sign in', 'error');
    } finally { setLoading(false); }
  };
  const reqReset = async (channel) => {
    if (!form.email) { toast('Enter your email', 'error'); return; }
    setLoading(true);
    try {
      await api('rpc/customer_request_reset', { method:'POST', headers:{ ...H, Prefer:'return=representation' }, body:{ p_email: form.email, p_channel: channel } });
      setRstep(channel==='otp'?'otp':'emailsent');
      toast(channel==='otp'?'Code sent (if the account exists)':'Reset link sent (if the account exists)', 'success');
    } catch (e) { toast(e.message || 'Could not start reset', 'error'); } finally { setLoading(false); }
  };
  const doResetOtp = async () => {
    if ((rnew||'').length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      const r = await api('rpc/customer_reset_with_otp', { method:'POST', headers:{ ...H, Prefer:'return=representation' }, body:{ p_email: form.email, p_otp: rotp, p_new_password: rnew } });
      if (r && r.ok) { toast('Password updated \u2713', 'success'); setMode('login'); setRstep('request'); setRotp(''); setRnew(''); }
      else throw new Error('Incorrect or expired code');
    } catch (e) { toast(e.message || 'Incorrect or expired code', 'error'); } finally { setLoading(false); }
  };
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:2000, backdropFilter:'blur(8px)', animation:'fadeIn .2s ease' }} />
      <div style={mobile ? { position:'fixed', left:0, right:0, bottom:0, background:'#fff', zIndex:2001, borderRadius:'24px 24px 0 0', padding:'28px 20px 36px', animation:'slideUp .3s ease', paddingBottom:'calc(36px + env(safe-area-inset-bottom))' }
        : { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(390px,95vw)', background:'#fff', borderRadius:24, padding:'44px 40px', zIndex:2001, animation:'fadeUp .3s ease', boxShadow:'0 24px 64px rgba(0,0,0,.15)' }}>
        {mobile && <div style={{ width:36, height:4, background:'#e6e6e6', borderRadius:2, margin:'-12px auto 20px' }} />}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(249,115,22,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:22 }}>◼</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#1d1d1f', letterSpacing:'-.02em', marginBottom:5 }}>{mode==='reset'?'Reset password':mode==='login'?'Welcome back':'Create account'}</div>
          <div style={{ fontSize:14, color:'#86868b' }}>{mode==='reset'?"We'll help you back in":mode==='login'?'Sign in to your Hub':'Join and earn 100 welcome points'}</div>
        </div>
        {mode!=='reset' && (<div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {mode==='register'&&<input className="inp" placeholder="Full name" aria-label="Full name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />}
          <input className="inp" placeholder={t("email")} aria-label={t("email")} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} autoCapitalize="none" />
          {mode==='register'&&<input className="inp" placeholder="Phone (optional)" aria-label="Phone (optional)" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />}
          <input className="inp" placeholder="Password" aria-label="Password" type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&submit()} />
          <button type="button" className="btn" onClick={submit} disabled={loading} style={{ borderRadius:14, opacity:loading?.7:1 }}>{loading?'Please wait…':mode==='login'?'Sign In':'Create Account'}</button>
        </div>)}
        {mode==='reset' && (<div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input className="inp" placeholder={t("email")} aria-label={t("email")} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} autoCapitalize="none" />
  {rstep==='request' && (<>
            <button type="button" className="btn" onClick={()=>reqReset('email')} disabled={loading} style={{ borderRadius:14 }}>📧 Email me a reset link</button>
            <button type="button" onClick={()=>reqReset('otp')} disabled={loading} style={{ borderRadius:14, padding:'12px', background:'#fff', color:'var(--clay)', border:'1px solid var(--clay)', fontWeight:600, cursor:'pointer' }}>📱 Text me a code</button>
          </>)}
          {rstep==='emailsent' && (<div style={{ fontSize:13, color:'#86868b', textAlign:'center' }}>Check your email for a reset link — it opens your account to set a new password.</div>)}
          {rstep==='otp' && (<>
            <input className="inp" placeholder="6-digit code" aria-label="6-digit code" inputMode="numeric" value={rotp} onChange={e=>setRotp(e.target.value)} />
            <input className="inp" placeholder="New password (6+ characters)" aria-label="New password (6+ characters)" type="password" value={rnew} onChange={e=>setRnew(e.target.value)} />
            <button type="button" className="btn" onClick={doResetOtp} disabled={loading} style={{ borderRadius:14 }}>Set new password</button>
          </>)}
        </div>)}
        <div style={{ textAlign:'center', marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
          {mode!=='reset' && <button type="button" onClick={()=>setMode(mode==='login'?'register':'login')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--clay)', fontWeight:500 }}>{mode==='login'?'New here? Register →':'Already have an account? Sign in →'}</button>}
          {mode==='login' && <button type="button" onClick={()=>{ setRstep('request'); setMode('reset'); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#86868b', fontWeight:500 }}>Forgot your password?</button>}
          {mode==='reset' && <button type="button" onClick={()=>{ setMode('login'); setRstep('request'); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#86868b', fontWeight:500 }}>← Back to sign in</button>}
        </div>
        {!mobile && <button type="button" aria-label="Close" onClick={onClose} style={{ position:'absolute', top:14, right:16, background:'#f5f5f7', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#86868b', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>}
      </div>
    </>
  );
}

/* ── ABOUT ── */
function AboutPage() {
  const mobile = useMobile();
  const { t } = useI18n();
  useReveal();
  return (
    <div style={{ minHeight:'100dvh', paddingTop: mobile ? 16 : 72, paddingBottom: mobile ? 80 : 0, background:'#fff' }}>
      <div style={{ maxWidth:860, margin:'0 auto', padding: mobile ? '24px 16px 60px' : '60px 40px 100px' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--clay)', marginBottom:12 }}>{t('ourStory')}</div>
        <h1 style={{ fontSize: mobile ? 36 : 64, fontWeight:700, letterSpacing:'-.04em', color:'#1d1d1f', lineHeight:1.05, marginBottom:32 }}>{t('precision')}<br />{t('permanence')}</h1>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: mobile ? 16 : 40, marginBottom:48 }}>
          <p style={{ fontSize:16, lineHeight:1.8, color:'#6e6e73' }}>{t('aboutP1')}</p>
          <p style={{ fontSize:16, lineHeight:1.8, color:'#6e6e73' }}>{t('aboutP2')}</p>
        </div>
        {[['2010','Founded in Manama, Bahrain'],['2013','First flagship showroom'],['2016','Bespoke configurator launched'],['2019','Expanded to four locations'],['2022','500+ projects completed'],['2024','Digital hub launched']].map(([year,event],i)=>(
          <div key={year} className="reveal" style={{ transitionDelay:`${i*.07}s`, display:'flex', gap:28, padding:'18px 0', borderBottom:'1px solid #f5f5f7', alignItems:'center' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'var(--clay)', minWidth:40 }}>{year}</span>
            <span style={{ fontSize:15, color:'#1d1d1f' }}>{event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── CONTACT ── */
const HUB_ORIGIN = 'https://closets-hub.vercel.app';
const cardRpc = (name, body) => api('rpc/' + name, { method:'POST', headers:{ ...H, Prefer:'return=representation' }, body });

// Shared card-grid tile used by Directory + Contact team
function CardTile({ c }) {
  const theme = { corporate:'var(--clay)', executive:'#D4AF37', vendor:'#22C55E', vip:'#A855F7' }[c.theme] || 'var(--clay)';
  const initials = (c.display_name||'?').split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const img = c.photo_url || c.logo_url;
  const ptype = c.owner_type==='partner' ? 'vendor' : c.owner_type;
  const pillBg = { vendor:'#E7F8EE', customer:'#F5EBFE', employee:'#FFF1E6' }[ptype] || '#FFF1E6';
  const pillCol = { vendor:'#1a7a40', customer:'#7a3fb0', employee:'#b5560f' }[ptype] || '#b5560f';
  return (
    <a href={`${HUB_ORIGIN}/card.html?c=${encodeURIComponent(c.slug)}`} target="_blank" rel="noreferrer"
       style={{ textDecoration:'none', color:'#1d1d1f', background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:20, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', transition:'transform .15s, box-shadow .15s' }}
       onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 30px rgba(0,0,0,.08)';}}
       onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
      <div style={{ width:66, height:66, borderRadius:'50%', background:`linear-gradient(135deg,${theme},${theme}99)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff', overflow:'hidden', marginBottom:10 }}>
        {img ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
      </div>
      <div style={{ fontWeight:700, fontSize:15 }}>{c.display_name}</div>
      {c.title && <div style={{ color:theme, fontSize:12.5, marginTop:2 }}>{c.title}</div>}
      {c.location && <div style={{ color:'#86868b', fontSize:12, marginTop:4 }}>{c.location}</div>}
      <span style={{ marginTop:10, fontSize:10.5, fontWeight:700, borderRadius:980, padding:'3px 10px', textTransform:'capitalize', background:pillBg, color:pillCol }}>{ptype}</span>
    </a>
  );
}

function DirectoryPage({ setPage }) {
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const mobile = useMobile();
  useEffect(() => {
    let on = true;
    cardRpc('card_directory', { p_type: type || null, p_search: q || null, p_limit: 120 })
      .then(r => { if (on) setList(Array.isArray(r) ? r : []); }).catch(() => { if (on) setList([]); });
    return () => { on = false; };
  }, [type, q]);
  const tabs = [['','All'],['vendor','Vendors & Partners'],['customer','Members'],['employee','Team']];
  return (
    <PageWrap title="Directory" sub="Verified vendors, partners and members of The Closets International">
      <input value={q} onChange={e=>setQ(e.target.value)} aria-label="Search by name, trade or location" placeholder="Search by name, trade or location…"
        style={{ width:'100%', maxWidth:520, padding:'13px 18px', borderRadius:980, border:'1px solid #ececec', fontSize:15, marginBottom:16, fontFamily:'inherit' }}/>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {tabs.map(([id,label]) => (
          <button type="button" key={id||'all'} onClick={()=>setType(id)} style={{ padding:'8px 16px', borderRadius:980, border:'1px solid #ececec', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background: type===id ? 'var(--clay)' : '#fff', color: type===id ? '#fff' : '#1d1d1f' }}>{label}</button>
        ))}
      </div>
      {list === null ? <div style={{ color:'#86868b', padding:40 }}>Loading…</div>
        : list.length === 0 ? <div style={{ color:'#86868b', padding:40 }}>No cards found.</div>
        : <div style={{ display:'grid', gridTemplateColumns:`repeat(${mobile?2:4}, 1fr)`, gap:14 }}>{list.map(c => <CardTile key={c.slug} c={c} />)}</div>}
    </PageWrap>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', product:'', budget:'', message:'' });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState([]);
  useEffect(() => {
    cardRpc('card_directory', { p_type:'employee', p_search:null, p_limit:12 })
      .then(r => setTeam(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);
  const mobile = useMobile();
  const { t } = useI18n();
  useReveal();
  const submit = async () => {
    if (!form.name||!form.email) { toast('Name and email required', 'error'); return; }
    if (busy) return;
    setBusy(true);
    try {
      // Route through the audited public_lead_submit RPC (validates, writes lead, queues team notification)
      await api('rpc/public_lead_submit', { method:'POST', body:{
        p_name: form.name, p_phone: form.phone || null, p_email: form.email || null,
        p_source: 'Website - Contact', p_interest: form.product || null,
        p_message: form.message || null, p_budget: form.budget ? Number(form.budget) : null,
        p_meta: { page: 'contact' }
      }});
      setSent(true); toast('Message sent ✓', 'success');
    } catch {
      toast('Could not send, please try again', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ minHeight:'100dvh', paddingTop: mobile ? 88 : 112, paddingBottom: mobile ? 80 : 60, background:'var(--cream)' }}>
      <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile ? '0 24px' : '0 32px', display: mobile ? 'block' : 'grid', gridTemplateColumns:'1fr 1fr', gap:72, alignItems:'start' }}>
        <div className="rv-l" style={{ marginBottom: mobile ? 36 : 0 }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>Get in touch</div>
          <h1 className="display" style={{ fontSize: mobile ? 36 : 56, color:'var(--ink)', marginBottom:16, lineHeight:1.05 }}>Let’s start your project.</h1>
          <p style={{ fontSize:17, color:'var(--ink-soft)', lineHeight:1.7, marginBottom:30 }}>Tell us about your space and we’ll arrange a free home or showroom visit — no obligation.</p>
          {[['📍','Showrooms','Manama · Riffa · Saar · Isa Town', null],['📞','Phone','+973 1700 1700','tel:+97317001700'],['✉️','Email','hello@theclosets.co','mailto:hello@theclosets.co'],['⏰','Hours','Sat–Thu · 9am–8pm', null]].map(([icon,label,val,href])=>(
            <div key={label} style={{ display:'flex', gap:14, padding:'15px 0', borderBottom:'1px solid var(--line)' }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <div><div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:3 }}>{label}</div>
                {href ? <a href={href} style={{ fontSize:15, color:'var(--clay)', fontWeight:600, textDecoration:'none' }}>{val}</a> : <div style={{ fontSize:15, color:'var(--ink)' }}>{val}</div>}
              </div>
            </div>
          ))}
        </div>
        {sent ? (
          <div className="rv-r" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:22, padding:'56px 32px', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(176,97,59,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28, color:'var(--clay)' }}>✓</div>
            <h3 className="display" style={{ fontSize:26, color:'var(--ink)', marginBottom:10 }}>{t('msgReceived')}</h3>
            <p style={{ color:'var(--ink-soft)', fontSize:15 }}>We’ll be in touch within 24 hours.</p>
          </div>
        ) : (
          <div className="rv-r" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:22, padding: mobile?22:30, display:'flex', flexDirection:'column', gap:12 }}>
            <input className="inp" placeholder={t("yourName")} aria-label={t("yourName")} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }} />
            <input className="inp" placeholder="Email" aria-label="Email" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }} />
            <input className="inp" placeholder={t("phone")} aria-label={t("phone")} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }} />
            <select className="inp" value={form.product} onChange={e=>setForm(p=>({...p,product:e.target.value}))} aria-label="Interested in" style={{ background:'var(--cream)', border:'1px solid var(--line)' }}>
              <option value="">Interested in…</option>
              {['Walk-In Wardrobe','Sliding Door','Hinged Door','Kitchen','Office','Kids Room'].map(o=><option key={o}>{o}</option>)}
            </select>
            <select className="inp" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} aria-label={t('budgetRange')} style={{ background:'var(--cream)', border:'1px solid var(--line)' }}>
              <option value="">{t('budgetRange')}</option>
              {['BD 200–500','BD 500–1,000','BD 1,000–2,500','BD 2,500–5,000','BD 5,000+'].map(o=><option key={o}>{o}</option>)}
            </select>
            <textarea className="inp" rows={4} placeholder={t("tellProject")} aria-label={t("tellProject")} value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} style={{ resize:'vertical', background:'var(--cream)', border:'1px solid var(--line)' }} />
            <button type="button" className="btn-clay" disabled={busy} onClick={submit} style={{ marginTop:4, opacity:busy?.6:1 }}>{busy ? 'Sending…' : t('sendMessage')}</button>
          </div>
        )}
      </div>
      {team.length > 0 && (
        <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'48px 24px 20px':'72px 32px 20px' }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>Our team</div>
          <h2 className="display" style={{ fontSize: mobile?26:34, color:'var(--ink)', marginBottom:24 }}>Save a specialist’s card</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
            {team.map(c => <CardTile key={c.slug} c={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CHECKOUT ── */
function CheckoutPage({ cart, setCart, user, setPage }) {
  const [step, setStep] = useState(1);
  useReveal();
  const { t } = useI18n();
  const [form, setForm] = useState({ name:user?.name||'', email:user?.email||'', phone:user?.phone||'', address:'', city:'Manama', payment:'Bank Transfer', notes:'' });
  const [settings, setSettings] = useState({});
  const [months, setMonths] = useState(0); // 0 = pay in full
  useEffect(() => { api('rpc/marketplace_settings_get', { method:'POST', body:{} }).then(d => setSettings(d && typeof d==='object' ? d : {})).catch(()=>{}); }, []);
  const total = cart.reduce((s,i)=>s+parseFloat(i.price||0), 0);
  const mobile = useMobile();
  const plans = Array.isArray(settings.installment_plans) ? settings.installment_plans : [];
  const instEnabled = settings.product_installments_enabled && total >= (Number(settings.installment_min_amount)||0) && plans.length > 0;
  const monthly = months > 0 ? (total / months) : 0;
  const place = async () => {
    const payLabel = months > 0 ? `Installments — ${months} months @ BHD ${monthly.toFixed(2)}/mo` : form.payment;
    const planNote = months > 0 ? `[Installment plan: ${months} months × BHD ${monthly.toFixed(2)}] ` : '';
    // Audited order intake (validates, writes sales_order with correct columns, notifies team)
    const id = await api('rpc/public_order_submit', { method:'POST', body:{
      p_name: form.name, p_phone: form.phone || null, p_email: form.email || null,
      p_address: (form.address ? form.address+', ' : '')+form.city,
      p_items: cart, p_total: total, p_payment: payLabel, p_notes: planNote + (form.notes || ''),
      p_customer_id: user?.id || null
    }});
    // also record a store order with the installment plan (no card capture)
    try { await api('rpc/store_checkout', { method:'POST', body:{
      p_customer_id: user?.id || null, p_customer_name: form.name, p_customer_email: form.email || null,
      p_customer_phone: form.phone || null, p_items: cart, p_total: total,
      p_installment_months: months > 0 ? months : null,
      p_address: { line: form.address, city: form.city }, p_notes: form.notes || null,
    }}); } catch(e) {}
    if (user) {
      const pts = Math.floor(total*10);
      await api('website_rewards', { method:'POST', body:[{ id:uid(), customer_id:user.id, type:'earned', points:pts, description:'Website order', created_at:new Date().toISOString() }] });
      await api(`website_customers?id=eq.${user.id}`, { method:'PATCH', body:{ points:(user.points||0)+pts, updated_at:new Date().toISOString() } });
    }
    setCart([]); setStep(3);
  };
  return (
    <div style={{ minHeight:'100dvh', paddingTop: mobile ? 0 : 56, paddingBottom: mobile ? 80 : 0, background:'#f5f5f7' }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding: mobile ? '24px 16px' : '40px 40px 80px' }}>
        <h1 style={{ fontSize: mobile ? 26 : 32, fontWeight:700, letterSpacing:'-.03em', color:'#1d1d1f', marginBottom:24 }}>{t('checkout')}</h1>
        {step===3 ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(26,122,64,.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:32 }}>✓</div>
            <h2 style={{ fontSize:26, fontWeight:700, color:'#1d1d1f', marginBottom:10 }}>{t('orderPlaced')}</h2>
            <p style={{ color:'#86868b', fontSize:15, marginBottom:32 }}>We'll confirm within 24 hours.</p>
            <button type="button" className="btn" onClick={()=>setPage('home')} style={{ borderRadius:14 }}>{t('backHome')}</button>
          </div>
        ) : (
          <div style={{ display: mobile ? 'flex' : 'grid', flexDirection: mobile ? 'column' : undefined, gridTemplateColumns: mobile ? undefined : '1fr 320px', gap:16 }}>
            {/* Order summary — show first on mobile */}
            <div style={{ background:'#fff', borderRadius:20, padding:20, border:'1px solid #e6e6e6', order: mobile ? -1 : 1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#86868b', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:14 }}>{t('summary')}</div>
              {cart.map((item,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, paddingBottom:10, borderBottom:'1px solid #f5f5f7' }}>
                  <span style={{ fontSize:14, color:'#1d1d1f' }}>{item.name}</span>
                  <span style={{ fontSize:14, fontWeight:600, color:'#1d1d1f' }}>{fmt(item.price)}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:4 }}>
                <span style={{ fontSize:16, fontWeight:700 }}>Total</span>
                <span style={{ fontSize:20, fontWeight:700, color:'var(--clay)' }}>{fmt(total)}</span>
              </div>
              {user && <div style={{ fontSize:12, color:'#86868b', marginTop:8 }}>+{Math.floor(total*10)} loyalty points</div>}
            </div>
            <div style={{ background:'#fff', borderRadius:20, padding: mobile ? 20 : 28, border:'1px solid #e6e6e6' }}>
              {step===1&&<>
                <div style={{ fontSize:13, fontWeight:600, color:'#86868b', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:20 }}>01 / Contact</div>
                <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>
                  {[['Full name','name','text'],['Email','email','email'],['Phone','phone','tel'],['City','city','text']].map(([label,key,type])=>(
                    <div key={key}><label style={{ fontSize:13, fontWeight:500, color:'#86868b', display:'block', marginBottom:6 }}>{label}</label><input className="inp" type={type} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} /></div>
                  ))}
                  <div style={{ gridColumn: mobile ? '1' : 'span 2' }}><label style={{ fontSize:13, fontWeight:500, color:'#86868b', display:'block', marginBottom:6 }}>Address</label><input className="inp" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} /></div>
                </div>
                <button type="button" className="btn" onClick={()=>{ if(!form.name||!form.email){toast('Name and email required','error');return;} setStep(2); }} style={{ borderRadius:12 }}>Continue →</button>
              </>}
              {step===2&&<>
                <div style={{ fontSize:13, fontWeight:600, color:'#86868b', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:20 }}>02 / Payment</div>
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                  {['Bank Transfer','Cash','Cheque'].map(p=>(
                    <button type="button" key={p} onClick={()=>{ setForm(f=>({...f,payment:p})); setMonths(0); }} style={{ flex:1, padding:'12px 8px', borderRadius:12, border:`1.5px solid ${form.payment===p&&months===0?'var(--clay)':'#e6e6e6'}`, background:form.payment===p&&months===0?'rgba(249,115,22,.08)':'#fff', color:form.payment===p&&months===0?'var(--clay)':'#6e6e73', fontSize:13, cursor:'pointer', fontWeight:form.payment===p&&months===0?500:400, transition:'all .15s' }}>{p}</button>
                  ))}
                </div>
                {instEnabled && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', marginBottom:8 }}>Or split into monthly installments</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {plans.map(m=>(
                        <button type="button" key={m} onClick={()=>setMonths(months===m?0:m)} style={{ padding:'10px 14px', borderRadius:12, border:`1.5px solid ${months===m?'var(--clay)':'#e6e6e6'}`, background:months===m?'rgba(249,115,22,.08)':'#fff', cursor:'pointer', textAlign:'left' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:months===m?'var(--clay)':'#1d1d1f' }}>{m} months</div>
                          <div style={{ fontSize:12, color:'#86868b' }}>BHD {(total/m).toFixed(2)}/mo</div>
                        </button>
                      ))}
                    </div>
                    {months>0 && <div style={{ marginTop:10, fontSize:13, color:'#16a34a', fontWeight:600 }}>✓ {months} payments of BHD {monthly.toFixed(2)} — our team will confirm the plan with you.</div>}
                  </div>
                )}
                <textarea className="inp" rows={3} placeholder="Notes…" aria-label="Notes" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{ resize:'vertical', marginBottom:16 }} />
                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" className="btn-secondary" onClick={()=>setStep(1)} style={{ borderRadius:12 }}>← Back</button>
                  <button type="button" className="btn" onClick={place} style={{ flex:1, borderRadius:12 }}>Place Order</button>
                </div>
              </>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── HOME PAGE ── */
function HomeAIOffers({ setPage, mobile, P }) {
  const [offers, setOffers] = useState([]);
  useEffect(() => { api('store_offers?active=eq.true&order=sort_order.asc&limit=3').then(d => { if (Array.isArray(d)) setOffers(d); }).catch(()=>{}); }, []);
  return (<>
    <section style={{ padding:`0 ${P}`, maxWidth:1200, margin:'28px auto 0' }}>
      <div className="reveal" style={{ background:'linear-gradient(135deg,#1d1d1f,#3a3530)', borderRadius:20, padding: mobile?24:36, color:'#fff', display:'flex', flexWrap:'wrap', gap:16, alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ maxWidth:580 }}>
          <div style={{ fontSize:12, letterSpacing:'.15em', textTransform:'uppercase', color:'#F9A35C' }}>New · AI Interior Designer</div>
          <div style={{ fontSize: mobile?22:30, fontWeight:700, margin:'8px 0', lineHeight:1.15 }}>Describe your room or upload a photo — get a tailored design in seconds.</div>
          <div style={{ fontSize:14, color:'#c9c7c3' }}>Layout, materials, colours, storage ideas and indicative pricing, composed by AI.</div>
        </div>
        <button type="button" onClick={()=>setPage('ai')} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:980, padding:'13px 26px', fontSize:15, fontWeight:600, cursor:'pointer' }}>Try the AI Designer ✦</button>
      </div>
    </section>
    {offers.length>0 && (
      <section style={{ padding:`28px ${P} 0`, maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:12 }}>
          {offers.map(o=>(<button type="button" key={o.id} onClick={()=>setPage('offers')} className="reveal" style={{ textAlign:'left', background:'var(--sand)', border:'1px solid var(--clay)22', borderRadius:16, padding:'16px 18px', cursor:'pointer' }}>
            {o.badge && <span style={{ fontSize:11, fontWeight:700, color:'var(--clay)' }}>{o.badge}</span>}
            <div style={{ fontSize:15, fontWeight:700, color:'#1d1d1f', marginTop:4 }}>{o.title}</div>
            <div style={{ fontSize:13, color:'#86868b', marginTop:3 }}>{o.subtitle}</div>
          </button>))}
        </div>
      </section>
    )}
  </>);
}
function HomePage({ products, testimonials, banners, siteLogo, setPage, addToCart, setConfigProduct }) {
  const mobile = useMobile();
  useReveal();
  useHomeFx();
  const P = mobile ? '24px' : '48px';
  const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  const featured = products.filter(p => p.active !== false).slice(0, 3);
  const services = [
    ['Kitchens', 'Precision cabinetry, engineered for daily life.', HOME_IMG.kitchen],
    ['Walk-in closets', 'Private dressing rooms, organised to the centimetre.', HOME_IMG.walkin],
    ['Wardrobes', 'Fitted storage that disappears into the architecture.', HOME_IMG.wardrobe],
    ['TV & media units', 'Floating, handleless, built around your screen.', HOME_IMG.living],
    ['Doors', 'Hinged, sliding and folding — made to measure.', HOME_IMG.detail],
    ['Storage & office', 'Shelving and cabinetry for every corner.', HOME_IMG.wardrobe],
  ];
  const steps = [
    ['01', 'Consultation', 'A free home or showroom visit to understand your space, style and budget.'],
    ['02', 'Design', '3D layouts, materials and finishes — refined with you until it’s right.'],
    ['03', 'Craft', 'Built in our own Bahrain workshop with premium hardware and joinery.'],
    ['04', 'Install', 'Fitted by our own team, finished and cleaned, ready to use.'],
  ];
  const marqueeItems = ['Own Bahrain workshop', 'Free design consultation', 'Premium European hardware', '15 years of craft', '4 showrooms', '2-year warranty', 'Installed by our own team'];
  return (
    <div style={{ background: 'var(--cream)' }}>
      <div id="scrollProgress" />
      <Hero setPage={setPage} banners={banners} />

      {/* Trust marquee */}
      <div className="marquee-wrap" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '18px 0', background: 'var(--cream)' }}>
        <div className="marquee">
          {[0, 1].flatMap(k => marqueeItems.map((s, idx) => (
            <span key={k + '-' + idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 56, color: 'var(--ink-soft)', fontSize: 14, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{s}<span style={{ color: 'var(--clay)' }}>✦</span></span>
          )))}
        </div>
      </div>

      {/* Brand trust + animated counters */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: `${mobile ? 64 : 96}px ${P}` }}>
        <div className="rv" style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 56px' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Why The Closets</div>
          <h2 className="display" style={{ fontSize: mobile ? 30 : 46, color: 'var(--ink)' }}>A workshop, not a warehouse.</h2>
          <p style={{ fontSize: mobile ? 16 : 18, color: 'var(--ink-soft)', lineHeight: 1.7, marginTop: 18 }}>Everything we make is designed, built and installed by our own people in Bahrain — so the piece you imagine is the piece you live with.</p>
        </div>
        <div className="rv" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: mobile ? 28 : 20 }}>
          <Stat to={500} suffix="+" label="Projects delivered" />
          <Stat to={15} suffix=" yrs" label="Of craftsmanship" />
          <Stat to={4} label="Showrooms" />
          <Stat to={100} suffix="%" label="Bespoke & fitted" />
        </div>
      </section>

      {/* Services showcase */}
      <section style={{ background: 'var(--sand)', padding: `${mobile ? 64 : 104}px ${P}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="rv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 44 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 14 }}>What we make</div>
              <h2 className="display" style={{ fontSize: mobile ? 30 : 48, color: 'var(--ink)', maxWidth: 560 }}>Bespoke pieces for every room.</h2>
            </div>
            <button type="button" className="btn-line" onClick={() => setPage('products')}>Explore all →</button>
          </div>
          {/* Asymmetric bento grid — a hero tile anchors the composition instead of a uniform 3-up row */}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(6,1fr)', gridAutoRows: mobile ? 'auto' : '224px', gap: mobile ? 16 : 18 }}>
            {services.map(([name, desc, img], i) => {
              const span = mobile ? {} : [
                { gridColumn: 'span 3', gridRow: 'span 2' },
                { gridColumn: 'span 3' },
                { gridColumn: 'span 3' },
                { gridColumn: 'span 2' },
                { gridColumn: 'span 2' },
                { gridColumn: 'span 2' },
              ][i] || { gridColumn: 'span 2' };
              const big = i === 0;
              return (
                <button type="button" key={name} className="rv tile-zoom lift" onClick={() => setPage('products')} style={{ ...span, '--d': (i * 0.07) + 's', position: 'relative', border: 'none', borderRadius: big ? 24 : 18, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', minHeight: mobile ? 280 : 0, padding: 0, background: '#15110e' }}>
                  <Photo src={img} alt={name} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,12,0) 30%, rgba(20,16,12,.88) 100%)' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: big ? 28 : 22, zIndex: 2 }}>
                    <div className="display" style={{ color: '#fff', fontSize: big ? 30 : 22, marginBottom: 6, letterSpacing: '-.01em' }}>{name}</div>
                    <div style={{ color: 'rgba(255,255,255,.82)', fontSize: big ? 15 : 13.5, lineHeight: 1.55, maxWidth: 360 }}>{desc}</div>
                    <div style={{ color: '#E7BBA0', fontSize: 13, fontWeight: 600, marginTop: 14, letterSpacing: '.04em' }}>View →</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured projects — zig-zag case studies */}
      {featured.length > 0 && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 64 : 110}px ${P}` }}>
          <div className="rv" style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 60px' }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Selected work</div>
            <h2 className="display" style={{ fontSize: mobile ? 30 : 48, color: 'var(--ink)' }}>Recent projects.</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 56 : 120 }}>
            {featured.map((p, i) => { const flip = i % 2 === 1; return (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: mobile ? 24 : 64, alignItems: 'center' }}>
                <div className={flip ? 'rv-r' : 'rv-l'} style={{ order: mobile ? 1 : (flip ? 2 : 1) }}>
                  <Photo src={p.image_url || services[i % services.length][2]} alt={p.name} className="tile-zoom lift" imgClass="tz" style={{ borderRadius: 22, aspectRatio: '4/3' }} />
                </div>
                <div className={flip ? 'rv-l' : 'rv-r'} style={{ order: mobile ? 2 : (flip ? 1 : 2) }}>
                  <div className="eyebrow" style={{ marginBottom: 14 }}>{p.category || 'Bespoke'}</div>
                  <h3 className="display" style={{ fontSize: mobile ? 26 : 38, color: 'var(--ink)', marginBottom: 16 }}>{p.name}</h3>
                  <p style={{ fontSize: mobile ? 15 : 17, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 24, maxWidth: 440 }}>{p.description || 'Designed, manufactured and installed by The Closets — tailored to the space, finished to the millimetre.'}</p>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-clay" onClick={() => setPage('product-' + p.id)} style={{ padding: '13px 24px', fontSize: 15 }}>View project</button>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{fmt(p.price)}</span>
                  </div>
                </div>
              </div>
            ); })}
          </div>
        </section>
      )}

      {/* Process timeline */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--ink)', color: '#fff', padding: `${mobile ? 64 : 110}px ${P}` }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .05, mixBlendMode: 'overlay', backgroundImage: NOISE }} />
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto' }}>
          <div className="rv" style={{ maxWidth: 560, marginBottom: 56 }}>
            <div className="eyebrow" style={{ color: '#E7BBA0', marginBottom: 14 }}>How it works</div>
            <h2 className="display" style={{ fontSize: mobile ? 30 : 48 }}>From first sketch to final fit.</h2>
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

      {/* AI designer band — editorial hero banner (safe-zone text left, photo right, single CTA) */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: `${mobile ? 56 : 100}px ${P}` }}>
        <div className="rv-sc" style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', background: '#15110e', display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.05fr .95fr', alignItems: 'stretch', minHeight: mobile ? 'auto' : 440 }}>
          {mobile && <Photo src={HOME_IMG.living} alt="" par=".06" style={{ position: 'absolute', inset: 0, opacity: .32, zIndex: 0 }} />}
          {mobile && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,12,.55), rgba(20,16,12,.92))', zIndex: 1 }} />}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .06, mixBlendMode: 'overlay', backgroundImage: NOISE, zIndex: 1 }} />
          <div style={{ position: 'relative', zIndex: 2, padding: mobile ? '40px 26px 44px' : '64px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', background: 'rgba(231,187,160,.14)', border: '1px solid rgba(231,187,160,.3)', color: '#E7BBA0', fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 980, marginBottom: 18 }}>✦ New · AI Interior Designer</span>
            <h2 className="display" style={{ color: '#fff', fontSize: mobile ? 30 : 46, lineHeight: 1.05, letterSpacing: '-.02em', marginBottom: 16 }}>See your room,<br />reimagined in seconds.</h2>
            <p style={{ color: 'rgba(255,255,255,.78)', fontSize: mobile ? 15 : 17, lineHeight: 1.65, marginBottom: 28, maxWidth: 440 }}>Upload a photo or describe your space — our AI returns a tailored layout, materials and a photorealistic render you can refine with our designers.</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn-clay" onClick={() => setPage('ai')} style={{ fontSize: 15, padding: '14px 26px' }}>Try the AI Designer →</button>
              <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>Free · no signup</span>
            </div>
          </div>
          {!mobile && (
            <div style={{ position: 'relative', minHeight: 440 }}>
              <Photo src={HOME_IMG.living} alt="A living room reimagined by The Closets AI designer" style={{ position: 'absolute', inset: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #15110e 0%, rgba(21,17,14,.25) 24%, rgba(21,17,14,0) 52%)' }} />
              <span style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(20,16,12,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: 980, border: '1px solid rgba(255,255,255,.2)' }}>After ✦</span>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials carousel */}
      {testimonials.length > 0 && (
        <section style={{ background: 'var(--sand)', padding: `${mobile ? 64 : 104}px ${P}` }}>
          <div className="rv" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Our clients</div>
            <h2 className="display" style={{ fontSize: mobile ? 28 : 42, color: 'var(--ink)' }}>Loved across Bahrain.</h2>
          </div>
          <div className="rv"><TestiCarousel items={testimonials} /></div>
        </section>
      )}

      {/* Cinematic CTA — full-width hero banner */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#15110e' }}>
        <Photo src={HOME_IMG.hero} alt="" par=".08" style={{ position: 'absolute', inset: '-10%', opacity: .42 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 18%, rgba(20,16,12,.35), rgba(20,16,12,.9) 78%)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .07, mixBlendMode: 'overlay', backgroundImage: NOISE }} />
        <div className="rv" style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: `${mobile ? 84 : 140}px ${P}` }}>
          <div className="eyebrow" style={{ color: '#E7BBA0', marginBottom: 18, justifyContent: 'center' }}>Start your project</div>
          <h2 className="display" style={{ color: '#fff', fontSize: mobile ? 36 : 64, lineHeight: 1.05, letterSpacing: '-.02em', marginBottom: 18 }}>Let’s design your space.</h2>
          <p style={{ color: 'rgba(255,255,255,.82)', fontSize: mobile ? 16 : 19, lineHeight: 1.6, marginBottom: 34, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>Book a free home consultation — no obligation, just ideas, measured and quoted by our own team.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-clay" onClick={() => setPage('contact')} style={{ fontSize: 16, padding: '16px 32px' }}>Book a consultation →</button>
            <button type="button" onClick={() => setPage('planner')} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.45)', borderRadius: 14, padding: '15px 30px', fontSize: 16, fontWeight: 500, cursor: 'pointer', minHeight: 50, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>Design online</button>
          </div>
          <div style={{ marginTop: 26, color: 'rgba(255,255,255,.55)', fontSize: 13, letterSpacing: '.03em' }}>Own Bahrain workshop · 2-year warranty · Installed by our team</div>
        </div>
      </section>

      {mobile && <div style={{ height: 80 }} />}
    </div>
  );
}

/* ── APP ── */
// ── CMS-driven pages (read from Bonsai Hub tables) ──────────────────
function PageWrap({ title, sub, eyebrow, children }) {
  const mobile = useMobile();
  useReveal();
  return (<div style={{ minHeight:'100dvh', paddingTop: mobile?88:112, paddingBottom:90, background:'var(--cream)' }}>
    <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'0 24px':'0 32px' }}>
      <div className="rv" style={{ maxWidth:700, marginBottom:40 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom:14 }}>{eyebrow}</div>}
        <h1 className="display" style={{ fontSize: mobile?36:54, color:'var(--ink)', lineHeight:1.05 }}>{title}</h1>
        {sub && <p style={{ fontSize: mobile?16:18, color:'var(--ink-soft)', marginTop:16, lineHeight:1.7 }}>{sub}</p>}
      </div>
      {children}
    </div>
  </div>);
}
function ShowroomsPage() {
  const [rows,setRows]=useState([]);
  // Single source of truth: same content the Hub manages & the app shows.
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'showroom'}}).then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow="Visit us" title="Showrooms across Bahrain." sub="Experience our craftsmanship in person — see the finishes, open the drawers, feel the build.">
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:22 }}>
      {rows.map(s=>{ const m=s.meta||{}; return (
        <div key={s.id} className="rv lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, overflow:'hidden' }}>
          <div className="tile-zoom" style={{ position:'relative', height:170 }}>
            <Photo src={s.image_url || HOME_IMG.living} alt={s.title} imgClass="tz" style={{ position:'absolute', inset:0 }} />
          </div>
          <div style={{ padding:'20px 22px' }}>
            <div className="display" style={{ fontSize:20, color:'var(--ink)' }}>{s.title}</div>
            <div style={{ fontSize:14, color:'var(--ink-soft)', marginTop:8, lineHeight:1.6 }}>{m.address||s.subtitle}</div>
            {(m.hours)&&<div style={{ fontSize:13, color:'var(--muted)', marginTop:10 }}>🕑 {m.hours}</div>}
            {(m.phone)&&<a href={'tel:'+m.phone} style={{ display:'inline-block', marginTop:14, color:'var(--clay)', fontWeight:600, fontSize:14, textDecoration:'none' }}>{m.phone} →</a>}
          </div>
        </div>); })}
      {rows.length===0 && <div style={{ color:'var(--muted)' }}>Showroom details coming soon.</div>}
    </div>
  </PageWrap>);
}
function BlogPage() {
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'inspiration'}}).then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow="Inspiration" title="Ideas & guides." sub="Trends, tips and real projects for kitchens, wardrobes and storage.">
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:22 }}>
      {rows.map(b=>(
        <div key={b.id} className="rv lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, overflow:'hidden', cursor:'pointer' }}>
          <div className="tile-zoom" style={{ position:'relative', height:180 }}>
            <Photo src={b.image_url || HOME_IMG.kitchen} alt={b.title} imgClass="tz" style={{ position:'absolute', inset:0 }} />
          </div>
          <div style={{ padding:'20px 22px' }}>
            {b.subtitle && <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{b.subtitle}</div>}
            <div className="display" style={{ fontSize:19, color:'var(--ink)' }}>{b.title}</div>
            <div style={{ fontSize:14, color:'var(--ink-soft)', marginTop:8, lineHeight:1.65 }}>{b.body}</div>
          </div>
        </div>))}
      {rows.length===0 && <div style={{ color:'var(--muted)' }}>Articles coming soon.</div>}
    </div>
  </PageWrap>);
}
function CareersPage() {
  const [rows,setRows]=useState([]); const [openId,setOpenId]=useState(null);
  const [f,setF]=useState({name:'',email:'',phone:'',note:''}); const [sentFor,setSentFor]=useState(null);
  useEffect(()=>{ api('website_jobs?active=eq.true').then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  const apply=async(job)=>{
    if(!f.name||!f.phone){ toast('Name and phone are required','error'); return; }
    await api('rpc/public_lead_submit',{method:'POST',body:{ p_name:f.name, p_phone:f.phone, p_email:f.email||null, p_source:'Website - Careers', p_interest:job.job_title, p_message:'Career application — '+job.job_title+(f.note?(' — '+f.note):''), p_meta:{ job_id:job.id, type:'career' } }});
    setSentFor(job.id); toast('Application received ✓','success');
  };
  return (<PageWrap title="Careers" sub="Join a team that builds beautiful, lasting spaces.">
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {rows.map(j=>(<div key={j.id} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600, color:'#1d1d1f' }}>{j.job_title}</div>
            <div style={{ fontSize:13, color:'#86868b', marginTop:4 }}>{[j.department,j.employment_type,j.location].filter(Boolean).join(' · ')}</div>
          </div>
          <button type="button" onClick={()=>setOpenId(openId===j.id?null:j.id)} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:980, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{openId===j.id?'Close':'Apply'}</button>
        </div>
        {j.description && <div style={{ fontSize:14, color:'#555', marginTop:12, lineHeight:1.6 }}>{j.description}</div>}
        {j.requirements && <div style={{ fontSize:13, color:'#86868b', marginTop:8, lineHeight:1.6 }}><strong>Requirements:</strong> {j.requirements}</div>}
        {openId===j.id && (sentFor===j.id
          ? <div style={{ marginTop:16, color:'#1D7A4D', fontWeight:600 }}>Thank you — we&#39;ll be in touch.</div>
          : <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input placeholder="Full name *" aria-label="Full name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={inp} />
              <input placeholder="Phone *" aria-label="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} style={inp} />
              <input placeholder="Email" aria-label="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} style={inp} />
              <input placeholder="Note (optional)" aria-label="Note (optional)" value={f.note} onChange={e=>setF({...f,note:e.target.value})} style={inp} />
              <button type="button" onClick={()=>apply(j)} style={{ gridColumn:'1 / -1', background:'#1d1d1f', color:'#fff', border:'none', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Submit application</button>
            </div>)}
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>No open roles right now — check back soon.</div>}
    </div>
  </PageWrap>);
}
const inp = { background:'var(--sand)', border:'1px solid var(--line)', borderRadius:12, padding:'11px 14px', fontSize:14, color:'var(--ink)', width:'100%' };

function OffersPage({ setPage }) {
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('store_offers?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap title="Offers & promotions" sub="Current savings on bespoke kitchens, wardrobes and storage.">
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
      {rows.map(o=>(<div key={o.id} style={{ background:'linear-gradient(135deg,var(--sand),#fff)', border:'1px solid var(--clay)33', borderRadius:18, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        {o.badge && <span style={{ display:'inline-block', background:'var(--clay)', color:'#fff', fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:980 }}>{o.badge}</span>}
        <div style={{ fontSize:19, fontWeight:700, color:'#1d1d1f', marginTop:12 }}>{o.title}</div>
        <div style={{ fontSize:14, color:'#86868b', marginTop:6, lineHeight:1.6 }}>{o.subtitle}</div>
        <button type="button" onClick={()=>setPage('booking')} style={{ marginTop:16, background:'#1d1d1f', color:'#fff', border:'none', borderRadius:980, padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer' }}>Claim this offer</button>
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>No active offers right now.</div>}
    </div>
  </PageWrap>);
}
function FaqPage() {
  const [rows,setRows]=useState([]); const [open,setOpen]=useState(null);
  useEffect(()=>{ api('website_faqs?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap title="Frequently asked questions" sub="Everything you need to know about designing with us.">
    <div style={{ maxWidth:760, display:'flex', flexDirection:'column', gap:12 }}>
      {rows.map(q=>(<div key={q.id} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:16, overflow:'hidden' }}>
        <button type="button" onClick={()=>setOpen(open===q.id?null:q.id)} style={{ width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'18px 20px', fontSize:16, fontWeight:600, color:'#1d1d1f', display:'flex', justifyContent:'space-between', gap:12 }}>
          <span>{q.question}</span><span style={{ color:'var(--clay)', flexShrink:0 }}>{open===q.id?'–':'+'}</span>
        </button>
        {open===q.id && <div style={{ padding:'0 20px 18px', fontSize:15, color:'#555', lineHeight:1.65 }}>{q.answer}</div>}
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>FAQs coming soon.</div>}
    </div>
  </PageWrap>);
}
const APPT_KINDS = ['Design Consultation','Free Site Visit','Showroom Visit','Online Consultation'];
const APPT_SLOTS = ['Morning (9–12)','Afternoon (12–4)','Evening (4–7)'];
function ServicesPage({ user, setPage, openAuth }) {
  const [cats, setCats] = useState([]);
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState('scheduled');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useReveal();
  useEffect(() => { api('rpc/services_list', { method: 'POST', body: {} }).then(d => setCats(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const open = (c) => { if (!user) { openAuth && openAuth('login'); return; } setSel(c); setMode('scheduled'); setDate(''); setSlot((c.slots && c.slots[0]) || 'Morning'); setArea(''); setAddress(''); setNotes(''); setDone(false); };
  const submit = async () => {
    if (!notes.trim()) return;
    setBusy(true);
    try {
      await api('rpc/marketplace_book', { method: 'POST', body: {
        p_customer_id: String(user.id), p_customer_name: user.name || 'Customer', p_customer_phone: user.phone || null,
        p_category_id: sel.id, p_mode: mode, p_scheduled_at: mode === 'scheduled' && date ? new Date(date).toISOString() : null,
        p_address: address || null, p_area: area || null, p_notes: notes, p_photos: [], p_lat: null, p_lng: null,
        p_slot: mode === 'scheduled' ? slot : null,
      } });
      setDone(true);
    } catch (e) { alert('Could not send: ' + e.message); }
    setBusy(false);
  };
  const price = (c) => c.pricing_model === 'fixed' ? ('From BD ' + c.base_price) : c.pricing_model === 'hourly' ? ('BD ' + c.base_price + '/hr') : 'Free quote';
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)', paddingTop: 104, paddingBottom: 90 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
        <div className="rv" style={{ maxWidth: 680, marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Home services</div>
          <h1 className="display" style={{ fontSize: 'clamp(36px,5vw,56px)', color: 'var(--ink)', marginBottom: 14 }}>Help around the home, on demand.</h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.7 }}>Carpentry, repairs, cleaning, AC and more — scheduled or ASAP, by vetted providers.{user ? '' : ' Sign in to book.'}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 18 }}>
          {cats.map(c => (
            <div key={c.id} className="rv lift" onClick={() => open(c)} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', cursor: 'pointer' }}>
              <div className="tile-zoom" style={{ position: 'relative', height: 140 }}>
                <Photo src={c.image_url || HOME_IMG.detail} alt={c.name_en} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div className="display" style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{c.name_en}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{price(c)} · ~{c.est_minutes}m{Number(c.points) > 0 ? ' · ★ ' + c.points + ' pts' : ''}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {Number(c.discount_pct) > 0 && <span style={{ background: 'rgba(176,97,59,.1)', color: 'var(--clay)', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>−{c.discount_pct}%</span>}
                  {Number(c.warranty_months) > 0 && <span style={{ background: '#e7f0e9', color: '#3f7a52', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{c.warranty_months}-mo warranty</span>}
                </div>
              </div>
            </div>
          ))}
          {cats.length === 0 && <div style={{ color: 'var(--muted)' }}>Services coming soon.</div>}
        </div>
      </div>

      {sel && (
        <div onClick={() => setSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,12,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 18 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cream)', borderRadius: 22, maxWidth: 480, width: '100%', padding: 26, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: 24, color: 'var(--ink)', margin: 0 }}>{sel.name_en}</h2>
              <button type="button" aria-label="Close" onClick={() => setSel(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 44 }}>✅</div>
                <p className="display" style={{ fontSize: 20, color: 'var(--ink)', marginTop: 8 }}>Request sent</p>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>We've sent it to available providers. Track it in your account.</p>
                <button className="btn-clay" onClick={() => { setSel(null); setPage('portal'); }} style={{ marginTop: 16 }}>Go to my account</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', background: 'var(--sand)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                  {[['scheduled', 'Schedule'], ['on_demand', 'ASAP']].map(([m, l]) => (
                    <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, background: mode === m ? '#fff' : 'transparent', color: mode === m ? 'var(--clay)' : 'var(--muted)' }}>{l}</button>
                  ))}
                </div>
                {mode === 'scheduled' && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <input type="date" className="inp" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1, background: '#fff', border: '1px solid var(--line)' }} />
                    <select className="inp" value={slot} onChange={e => setSlot(e.target.value)} style={{ flex: 1, background: '#fff', border: '1px solid var(--line)' }}>
                      {(sel.slots || ['Morning', 'Afternoon', 'Evening']).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <input className="inp" value={area} onChange={e => setArea(e.target.value)} aria-label="Area (e.g. Riffa)" placeholder="Area (e.g. Riffa)" style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: 10 }} />
                <input className="inp" value={address} onChange={e => setAddress(e.target.value)} aria-label="Address / building, road, block" placeholder="Address / building, road, block" style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: 10 }} />
                <textarea className="inp" value={notes} onChange={e => setNotes(e.target.value)} aria-label="What do you need? Describe the job" placeholder="What do you need? Describe the job…" rows={3} style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: 14, resize: 'vertical' }} />
                <button className="btn-clay" disabled={busy} onClick={submit} style={{ width: '100%' }}>{busy ? 'Sending…' : 'Send request'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BookingPage({ setPage }) {
  const mobile = useMobile();
  const [f,setF]=useState({ type:'Design Consultation', name:'', phone:'', email:'', date:'', slot:APPT_SLOTS[0], address:'', interest:'Kitchen', notes:'' });
  const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const submit=async()=>{
    if(!f.name||!f.phone){ toast('Name and phone are required','error'); return; }
    setBusy(true);
    try{
      await api('rpc/book_appointment',{method:'POST',body:{ p_name:f.name, p_phone:f.phone, p_email:f.email||null, p_type:f.type, p_date:f.date||null, p_slot:f.slot, p_address:f.address||null, p_interest:f.interest, p_notes:f.notes||null }});
      setSent(true); toast('Booking requested — we&#39;ll confirm by phone','success');
    }catch(e){ toast('Could not submit, please try again','error'); }
    finally{ setBusy(false); }
  };
  if(sent) return (<PageWrap eyebrow="Booked" title="Thank you."><div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:36, maxWidth:560 }}><div style={{ fontSize:40 }}>✅</div><div className="display" style={{ fontSize:24, color:'var(--ink)', marginTop:14 }}>Your {f.type.toLowerCase()} is requested.</div><div style={{ fontSize:15, color:'var(--ink-soft)', marginTop:10, lineHeight:1.6 }}>Our design team will call you to confirm the time. No obligation, completely free.</div><button type="button" className="btn-clay" onClick={()=>setPage('home')} style={{ marginTop:22 }}>Back to home</button></div></PageWrap>);
  return (<PageWrap eyebrow="Free design visit" title="Book your free visit." sub="A designer measures your space and creates a bespoke 2D & 3D concept — free, with no obligation.">
    <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?22:30, maxWidth:720 }}>
      <div className="eyebrow" style={{ fontSize:11, marginBottom:10 }}>Appointment type</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
        {APPT_KINDS.map(k=>(<button type="button" key={k} onClick={()=>set('type',k)} style={{ padding:'9px 16px', borderRadius:980, cursor:'pointer', fontSize:13, fontWeight:600, background:f.type===k?'var(--clay)':'var(--sand)', color:f.type===k?'#fff':'var(--ink)', border:'1px solid '+(f.type===k?'var(--clay)':'var(--line)') }}>{k}</button>))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:12 }}>
        <input placeholder="Full name *" aria-label="Full name" value={f.name} onChange={e=>set('name',e.target.value)} style={inp} />
        <input placeholder="Phone *" aria-label="Phone" value={f.phone} onChange={e=>set('phone',e.target.value)} style={inp} />
        <input placeholder="Email" aria-label="Email" value={f.email} onChange={e=>set('email',e.target.value)} style={inp} />
        <select value={f.interest} onChange={e=>set('interest',e.target.value)} style={inp}>{['Kitchen','Wardrobe','Walk-In Closet','TV Unit','Doors','Storage','Other'].map(x=><option key={x}>{x}</option>)}</select>
        <input type="date" value={f.date} onChange={e=>set('date',e.target.value)} style={inp} />
        <select value={f.slot} onChange={e=>set('slot',e.target.value)} style={inp}>{APPT_SLOTS.map(x=><option key={x}>{x}</option>)}</select>
        <input placeholder="Address (for home/site visit)" aria-label="Address (for home/site visit)" value={f.address} onChange={e=>set('address',e.target.value)} style={{...inp, gridColumn: mobile?'auto':'1 / -1'}} />
        <textarea placeholder="Notes (optional)" aria-label="Notes (optional)" rows={3} value={f.notes} onChange={e=>set('notes',e.target.value)} style={{...inp, gridColumn: mobile?'auto':'1 / -1', resize:'vertical'}} />
      </div>
      <button type="button" className="btn-clay" disabled={busy} onClick={submit} style={{ marginTop:18, width:'100%', opacity:busy?.6:1 }}>{busy?'Submitting…':'Request my free visit'}</button>
    </div>
  </PageWrap>);
}

function RequestPage({ kind, title, sub, refLabel }) {
  const mobile=useMobile();
  const [f,setF]=useState({name:'',phone:'',email:'',ref:'',message:''}); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const submit=async()=>{
    if(!f.name||!f.phone){ toast('Name and phone are required','error'); return; }
    setBusy(true);
    try{ await api('rpc/public_lead_submit',{method:'POST',body:{ p_name:f.name, p_phone:f.phone, p_email:f.email||null, p_source:'Website - '+kind, p_interest:kind, p_message:(f.ref?(refLabel+': '+f.ref+' — '):'')+(f.message||''), p_meta:{ type:kind.toLowerCase() } }});
      setSent(true); toast('Request received ✓','success'); }
    catch{ toast('Could not submit, please try again','error'); } finally{ setBusy(false); }
  };
  if(sent) return (<PageWrap title="Thank you"><div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:32, maxWidth:560 }}><div style={{ fontSize:40 }}>✅</div><div style={{ fontSize:19, fontWeight:600, color:'#1d1d1f', marginTop:12 }}>Your {kind.toLowerCase()} request is logged.</div><div style={{ fontSize:15, color:'#86868b', marginTop:8 }}>Our team will contact you to arrange the next step.</div></div></PageWrap>);
  return (<PageWrap title={title} sub={sub}>
    <div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding: mobile?20:28, maxWidth:640, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:12 }}>
        <input placeholder="Full name *" aria-label="Full name" value={f.name} onChange={e=>set('name',e.target.value)} style={inp} />
        <input placeholder="Phone *" aria-label="Phone" value={f.phone} onChange={e=>set('phone',e.target.value)} style={inp} />
        <input placeholder="Email" aria-label="Email" value={f.email} onChange={e=>set('email',e.target.value)} style={inp} />
        <input placeholder={refLabel+' (optional)'} aria-label={refLabel+' (optional)'} value={f.ref} onChange={e=>set('ref',e.target.value)} style={inp} />
        <textarea placeholder="Describe the issue / request" aria-label="Describe the issue / request" rows={4} value={f.message} onChange={e=>set('message',e.target.value)} style={{...inp, gridColumn: mobile?'auto':'1 / -1', resize:'vertical'}} />
      </div>
      <button type="button" disabled={busy} onClick={submit} style={{ marginTop:18, width:'100%', background:'var(--clay)', color:'#fff', border:'none', borderRadius:14, padding:'14px', fontSize:15, fontWeight:600, cursor:'pointer', opacity:busy?.6:1 }}>{busy?'Submitting…':'Submit request'}</button>
    </div>
  </PageWrap>);
}
function AIDesignerPage({ setPage, user }) {
  const mobile=useMobile();
  const STYLES=[
    { id:'warm_oak', name:'Warm Oak', g:'linear-gradient(135deg,#c89b5e,#9c6b34)' },
    { id:'modern_luxe', name:'Modern Luxe', g:'linear-gradient(135deg,#3a3a3c,#171717)' },
    { id:'scandinavian', name:'Scandinavian', g:'linear-gradient(135deg,#e8e2d8,#bfb3a0)' },
    { id:'minimal', name:'Minimal', g:'linear-gradient(135deg,#f3f3f1,#d6cfc4)' },
    { id:'bold_walnut', name:'Bold Walnut', g:'linear-gradient(135deg,#6b4423,#3f2a17)' },
    { id:'coastal', name:'Coastal', g:'linear-gradient(135deg,#dfe7e8,#a9c2c4)' },
  ];
  const ROOMS=[['bedroom','Bedroom'],['living','Living room'],['kitchen','Kitchen'],['office','Home office'],['walkin','Walk-in']];
  const PRODUCTS=[['','Any piece'],['wardrobe','Wardrobe'],['kitchen','Kitchen'],['walkin','Walk-in closet'],['tv','TV unit'],['doors','Doors'],['storage','Storage / office']];
  const MODES=[['redesign','Redesign my room','Restyle the room you have'],['furnish','Furnish empty room','Fill a bare space'],['describe','From a description','No photo — just describe it']];
  const [mode,setMode]=useState('redesign');
  const [f,setF]=useState({ requirements:'', product:'', room:'bedroom', style:'warm_oak', w:'', h:'', budget:'' });
  const [image,setImage]=useState(null);
  const [busy,setBusy]=useState(false); const [concept,setConcept]=useState(null); const [saved,setSaved]=useState(false);
  const [renderUrl,setRenderUrl]=useState(null); const [renderBusy,setRenderBusy]=useState(false); const [renderErr,setRenderErr]=useState('');
  const [baPos,setBaPos]=useState(55);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const needsPhoto = mode!=='describe';
  const inpS={ width:'100%', padding:'11px 13px', border:'1px solid var(--line)', background:'var(--cream)', borderRadius:12, fontSize:14, fontFamily:'inherit', color:'var(--ink)' };
  const saveConcept=async()=>{
    if(!user){ toast('Sign in to save this concept to your account','info'); setPage('portal'); return; }
    try{
      const id='AIC-'+Date.now().toString(36).toUpperCase();
      await api('product_configurations',{method:'POST',body:[{ id, customer_id:user.id, customer_name:user.name, customer_email:user.email, product_name:'AI concept — '+concept.title, configuration:{...concept, render_url:renderUrl||undefined}, total_price:concept.estimate_bhd, status:'ai-concept', share_token:id, created_at:new Date().toISOString() }]});
      setSaved(true); toast('Saved to your account ✓','success');
    }catch{ toast('Could not save right now','error'); }
  };
  const onPhoto=(file)=>{ if(!file) return; const rd=new FileReader(); rd.onload=()=>{ const im=new Image(); im.onload=()=>{ const max=1024; let{width:w,height:h}=im; if(w>h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>max){w=Math.round(w*max/h);h=max;} const c=document.createElement('canvas'); c.width=w;c.height=h; c.getContext('2d').drawImage(im,0,0,w,h); const u=c.toDataURL('image/jpeg',0.72); setImage({ dataUrl:u, media_type:'image/jpeg', base64:u.split(',')[1] }); setRenderUrl(null); }; im.src=rd.result; }; rd.readAsDataURL(file); };
  const renderVisual=async(styleOverride)=>{
    if(!image) return;
    setRenderBusy(true); setRenderErr(''); setRenderUrl(null);
    try{
      const r=await fetch(SUPA_URL+'/functions/v1/ai_room_redesign',{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({ image_base64:image.base64, style:styleOverride||f.style, room:f.room, product:f.product||undefined, strength: mode==='furnish'?0.82:0.7 })});
      const d=await r.json().catch(()=>({}));
      if(d&&d.ok&&d.url){ setRenderUrl(d.url); setBaPos(55); } else { setRenderErr(d&&d.error==='Render not configured'?'Photoreal rendering isn’t switched on yet.':'Could not render — try another photo.'); }
    }catch{ setRenderErr('Network error — please try again.'); } finally{ setRenderBusy(false); }
  };
  const tryStyle=(sid)=>{ set('style',sid); if(image) renderVisual(sid); };
  const generate=async()=>{
    if(needsPhoto && !image){ toast('Add a photo of your room first','error'); return; }
    if(!needsPhoto && !f.requirements.trim()){ toast('Describe your space','error'); return; }
    setBusy(true); setConcept(null);
    const styleName=(STYLES.find(s=>s.id===f.style)||{}).name||'';
    const roomName=(ROOMS.find(r=>r[0]===f.room)||[])[1]||'';
    const brief=[f.requirements, needsPhoto?`Style: ${styleName}. Room: ${roomName}.`:''].filter(Boolean).join(' ');
    if(needsPhoto && image) renderVisual();
    try{
      const r=await fetch(SUPA_URL+'/functions/v1/ai_design_concept',{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({ requirements:brief, product:f.product||undefined, budget:f.budget?Number(f.budget):undefined, dimensions:{ width_cm:f.w?Number(f.w):undefined, height_cm:f.h?Number(f.h):undefined }, image_base64:image?.base64, media_type:image?.media_type })});
      const d=await r.json();
      if(d.ok&&d.concept){ setConcept(d.concept); setSaved(false); } else { toast('Could not generate — try adding more detail','error'); }
    }catch{ toast('AI is unavailable right now','error'); } finally{ setBusy(false); }
  };
  const chip=(t)=>(<span style={{ background:'var(--sand)', color:'var(--clay-deep)', borderRadius:980, padding:'6px 12px', fontSize:13, fontWeight:500 }}>{t}</span>);
  const hasResult = renderUrl || renderBusy || renderErr || concept || busy;
  return (<PageWrap eyebrow="AI design studio" title="Redesign your room in seconds." sub="Upload a photo of your space, pick a style, and our AI reimagines it — then turns it into a tailored concept with materials, storage ideas and indicative pricing.">
    <div className="resp-2col" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'400px 1fr', gap:26, alignItems:'start' }}>
      {/* ── INTAKE ── */}
      <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:20, boxShadow:'var(--shadow)' }}>
        {/* Step 1 — mode */}
        <div className="eyebrow" style={{ marginBottom:10 }}>1 · How do you want to start?</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7, marginBottom:18 }}>
          {MODES.map(([id,label,sub])=>{ const on=mode===id; return (
            <button key={id} type="button" onClick={()=>{ setMode(id); setRenderUrl(null); }} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'#fff':'var(--cream)', borderRadius:12, padding:'9px 10px', cursor:'pointer' }}>
              <div style={{ fontSize:12.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)', lineHeight:1.25 }}>{label}</div>
              <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:3, lineHeight:1.3 }}>{sub}</div>
            </button>); })}
        </div>
        {/* Step 2 — photo */}
        {needsPhoto && (<>
          <div className="eyebrow" style={{ marginBottom:10 }}>2 · Add your room</div>
          <label style={{ display:'flex', alignItems:'center', gap:12, border:'1.5px dashed var(--line)', background:'var(--cream)', borderRadius:14, padding:'14px 16px', cursor:'pointer', marginBottom:18 }}>
            {image ? <img src={image.dataUrl} alt="room" style={{ width:60, height:46, objectFit:'cover', borderRadius:9 }} /> : <i className="ti ti-camera" style={{ fontSize:24, color:'var(--clay)' }} aria-hidden="true" />}
            <span style={{ fontSize:14, fontWeight:500, color:'var(--ink)' }}>{image?'Photo added — tap to change':'Upload or take a photo'}</span>
            <input type="file" accept="image/*" onChange={e=>onPhoto(e.target.files?.[0])} style={{ display:'none' }} />
            {image && <span onClick={e=>{ e.preventDefault(); setImage(null); setRenderUrl(null); }} style={{ marginLeft:'auto', color:'var(--muted)', fontSize:20 }}>×</span>}
          </label>
        </>)}
        {/* Step 3 — room + product */}
        <div className="eyebrow" style={{ marginBottom:10 }}>{needsPhoto?'3':'2'} · Room &amp; piece</div>
        {needsPhoto && <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
          {ROOMS.map(([id,label])=>{ const on=f.room===id; return (
            <button key={id} type="button" onClick={()=>set('room',id)} style={{ fontSize:12.5, fontWeight:500, border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'#fff':'var(--cream)', color: on?'var(--clay-deep)':'var(--ink-soft)', borderRadius:99, padding:'6px 13px', cursor:'pointer' }}>{label}</button>); })}
        </div>}
        <select value={f.product} onChange={e=>set('product',e.target.value)} style={{...inpS, marginBottom:18}}>{PRODUCTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        {/* Step 4 — style */}
        {needsPhoto && (<>
          <div className="eyebrow" style={{ marginBottom:10 }}>4 · Pick a style</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:18 }}>
            {STYLES.map(s=>{ const on=f.style===s.id; return (
              <button key={s.id} type="button" onClick={()=>set('style',s.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:12, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0 }}>
                <div style={{ height:42, background:s.g }} />
                <div style={{ fontSize:11, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)', padding:'6px 4px' }}>{s.name}</div>
              </button>); })}
          </div>
        </>)}
        {/* Notes / describe */}
        <div className="eyebrow" style={{ marginBottom:10 }}>{needsPhoto?'5 · Anything specific? (optional)':'3 · Describe your space'}</div>
        <textarea value={f.requirements} onChange={e=>set('requirements',e.target.value)} rows={needsPhoto?2:4} aria-label="Describe your requirements" placeholder={needsPhoto?'e.g. more shoe storage, soft lighting, hidden laundry':'e.g. a walk-in closet for a master bedroom, warm oak, lots of shoe and hanging space, soft lighting'} style={{...inpS, resize:'vertical', marginBottom:12}} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <input value={f.budget} onChange={e=>set('budget',e.target.value)} aria-label="Budget BHD (optional)" placeholder="Budget BHD (optional)" inputMode="numeric" style={inpS} />
          <input value={f.w} onChange={e=>set('w',e.target.value)} aria-label="Width cm (optional)" placeholder="Width cm (optional)" inputMode="numeric" style={inpS} />
        </div>
        <button type="button" className="btn-clay" disabled={busy||renderBusy} onClick={generate} style={{ width:'100%', borderRadius:14, padding:'14px', fontSize:15, opacity:(busy||renderBusy)?.6:1 }}>{(busy||renderBusy)?'Designing…':'Generate my design ✦'}</button>
      </div>

      {/* ── RESULT ── */}
      <div>
        {!hasResult && <div style={{ border:'1px dashed var(--line)', borderRadius:20, padding:'56px 24px', textAlign:'center', color:'var(--muted)', fontSize:15, background:'#fff' }}>
          <Spark size={30} color="var(--clay)" style={{ display:'block', marginBottom:12 }} />
          {needsPhoto?'Your before / after redesign and a tailored concept will appear here.':'Your AI concept — layout, materials, colours and package options — will appear here.'}
        </div>}

        {/* Visual before/after */}
        {needsPhoto && (renderBusy || renderUrl || renderErr) && (
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:16, boxShadow:'var(--shadow)', marginBottom:16 }}>
            {renderBusy && <div style={{ padding:'60px 0', textAlign:'center', color:'var(--ink-soft)', fontSize:14 }}><i className="ti ti-loader-2" style={{ fontSize:26, color:'var(--clay)' }} aria-hidden="true" /><div style={{ marginTop:10 }}>Redesigning your room… ~15–25 seconds.</div></div>}
            {!renderBusy && renderErr && <div style={{ padding:'40px 12px', textAlign:'center', color:'var(--clay-deep)', fontSize:14 }}>{renderErr}</div>}
            {!renderBusy && renderUrl && (<>
              <div style={{ position:'relative', borderRadius:14, overflow:'hidden', aspectRatio:'4 / 3', background:'#000' }}>
                <img src={renderUrl} alt="After — AI redesign" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                <img src={image.dataUrl} alt="Before — your room" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', clipPath:`inset(0 ${100-baPos}% 0 0)` }} />
                <div style={{ position:'absolute', top:0, bottom:0, left:`${baPos}%`, width:2, background:'#fff', boxShadow:'0 0 8px rgba(0,0,0,.4)' }} />
                <span style={{ position:'absolute', top:10, left:10, background:'rgba(20,16,12,.7)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99 }}>BEFORE</span>
                <span style={{ position:'absolute', top:10, right:10, background:'var(--clay)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99 }}>AFTER ✦</span>
                <input type="range" min={0} max={100} value={baPos} onChange={e=>setBaPos(Number(e.target.value))} style={{ position:'absolute', left:'6%', right:'6%', bottom:12, width:'88%', accentColor:'var(--clay)' }} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'space-between', alignItems:'center', marginTop:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'var(--muted)' }}>Drag the slider to compare. AI impression — finishes confirmed at your visit.</span>
                <div style={{ display:'flex', gap:8 }}>
                  <a href={renderUrl} download="closets-redesign.jpg" target="_blank" rel="noreferrer" style={{ padding:'8px 14px', borderRadius:99, background:'var(--ink)', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:600 }}>Download</a>
                  <button type="button" onClick={()=>renderVisual()} style={{ padding:'8px 14px', borderRadius:99, border:'1px solid var(--line)', background:'#fff', color:'var(--ink)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Regenerate</button>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:12 }}>
                <span style={{ fontSize:11, color:'var(--muted)', alignSelf:'center', marginRight:2 }}>Try another style:</span>
                {STYLES.map(s=>(<button key={s.id} type="button" onClick={()=>tryStyle(s.id)} title={s.name} aria-label={'Try ' + s.name} style={{ width:26, height:26, borderRadius:8, background:s.g, border: f.style===s.id?'2px solid var(--clay)':'1px solid var(--line)', cursor:'pointer' }} />))}
              </div>
            </>)}
          </div>
        )}

        {/* Concept */}
        {busy && !concept && <div style={{ color:'var(--ink-soft)', fontSize:15, padding:'18px 2px' }}>✦ Reading your brief and composing a concept…</div>}
        {concept && (<div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?20:26, boxShadow:'var(--shadow)' }}>
          <div className="eyebrow">AI concept</div>
          <h2 className="display" style={{ fontSize:26, color:'var(--ink)', margin:'6px 0 4px' }}>{concept.title}</h2>
          <div style={{ fontSize:13, color:'var(--muted)' }}>{concept.product} · {concept.layout} · {concept.finish_id} finish · {concept.width_cm}×{concept.height_cm}cm</div>
          <p style={{ fontSize:15, color:'var(--ink-soft)', lineHeight:1.65, marginTop:12 }}>{concept.summary}</p>
          {concept.materials?.length>0 && <><h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:16, marginBottom:8 }}>MATERIALS</h3><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{concept.materials.map((m,i)=><span key={i}>{chip(m)}</span>)}</div></>}
          {concept.colors?.length>0 && <><h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:16, marginBottom:8 }}>COLOURS</h3><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{concept.colors.map((m,i)=><span key={i}>{chip(m)}</span>)}</div></>}
          {concept.storage_ideas?.length>0 && <><h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:16, marginBottom:8 }}>STORAGE IDEAS</h3><ul style={{ margin:0, paddingLeft:18, color:'var(--ink-soft)', fontSize:14, lineHeight:1.7 }}>{concept.storage_ideas.map((m,i)=><li key={i}>{m}</li>)}</ul></>}
          <h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:18, marginBottom:8 }}>PACKAGES (indicative)</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {(concept.packages||[]).map((p,i)=>(<div key={p.tier} style={{ border:'1px solid '+(i===1?'var(--clay)':'var(--line)'), background:i===1?'var(--sand)':'#fff', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:i===1?'var(--clay-deep)':'var(--ink)' }}>{p.tier}{i===1?' · recommended':''}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginTop:3 }}>BD {p.price_from.toLocaleString()}–{p.price_to.toLocaleString()}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4, lineHeight:1.4 }}>{p.includes}</div>
            </div>))}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>Indicative only — your free design visit confirms an exact, itemised quote.</div>
          <div style={{ display:'flex', gap:10, marginTop:18, flexWrap:'wrap' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('booking')} style={{ borderRadius:980, padding:'11px 20px', fontSize:14 }}>Book a free visit</button>
            <button type="button" onClick={()=>setPage('planner')} style={{ background:'var(--ink)', color:'#fff', border:'none', borderRadius:980, padding:'11px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Refine in 3D planner</button>
            <button type="button" disabled={saved} onClick={saveConcept} style={{ background:'#fff', color: saved?'var(--good)':'var(--ink)', border:'1px solid '+(saved?'var(--good)':'var(--line)'), borderRadius:980, padding:'11px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{saved?'✓ Saved to account':(user?'Save to my account':'Sign in to save')}</button>
          </div>
        </div>)}
      </div>
    </div>
  </PageWrap>);
}
function SiteFooter({ setPage }) {
  const mobile=useMobile();
  const col=(title,items)=>(<div><div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:12 }}>{title}</div>{items.map(([label,go])=>(<button type="button" key={label} onClick={()=>setPage(go)} style={{ display:'block', background:'none', border:'none', cursor:'pointer', color:'#86868b', fontSize:14, padding:'5px 0', textAlign:'left' }}>{label}</button>))}</div>);
  return (<footer style={{ borderTop:'1px solid #ececec', background:'#fafafa', padding: mobile?'40px 18px 28px':'56px 40px 32px' }}>
    <div style={{ maxWidth:1200, margin:'0 auto' }}>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'2fr 1fr 1fr 1fr', gap: mobile?28:40 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:'#1d1d1f' }}>The Closets Co.</div>
          <div style={{ fontSize:14, color:'#86868b', marginTop:10, lineHeight:1.6, maxWidth:280 }}>Premium bespoke kitchens, wardrobes and storage — designed, manufactured and installed in the Kingdom of Bahrain.</div>
          <a href="https://wa.me/97317000000" style={{ display:'inline-block', marginTop:14, background:'#25D366', color:'#fff', borderRadius:980, padding:'9px 18px', fontSize:13, fontWeight:600, textDecoration:'none' }}>WhatsApp us</a>
        </div>
        {col('Explore',[['Gallery','products'],['Design Builder','design-builder'],['Kitchen Planner','kitchen-planner'],['3D Planner','planner'],['AI Designer','ai'],['Inspiration','blog']])}
        {col('Company',[['Our Story','about'],['Showrooms','showrooms'],['Careers','careers'],['Offers','offers']])}
        {col('Support',[['Book a visit','booking'],['Contact','contact'],['Maintenance','maintenance'],['Warranty','warranty'],['FAQ','faq']])}
      </div>
      <div style={{ borderTop:'1px solid #ececec', marginTop:32, paddingTop:20, display:'flex', flexDirection: mobile?'column':'row', justifyContent:'space-between', gap:8, fontSize:13, color:'#86868b' }}>
        <span>© 2026 The Closets Co. W.L.L. — Manama, Bahrain</span>
        <span>+973 1700 1700 · hello@theclosets.co</span>
      </div>
    </div>
  </footer>);
}
function ChatWidget({ setPage }) {
  const mobile = useMobile();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([{ role:'assistant', content:'Hi! 👋 I can help with kitchens, wardrobes, pricing, showrooms and booking a free design visit. What are you planning?' }]);
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs, open, busy]);
  const send = async (text) => {
    const q = (text ?? input).trim(); if (!q || busy) return;
    const next = [...msgs, { role:'user', content:q }];
    setMsgs(next); setInput(''); setBusy(true);
    try {
      const r = await fetch(SUPA_URL + '/functions/v1/support_chat', { method:'POST', headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json' }, body: JSON.stringify({ messages: next.map(m=>({ role:m.role, content:m.content })) }) });
      const d = await r.json();
      setMsgs(m => [...m, { role:'assistant', content: (d && d.ok && d.reply) ? d.reply : 'Sorry, I had trouble there. You can reach our team on WhatsApp or book a free visit.' }]);
    } catch { setMsgs(m => [...m, { role:'assistant', content:'I’m offline for a moment — please try again or book a free visit.' }]); }
    finally { setBusy(false); }
  };
  const chips = ['Design a kitchen','Wardrobe pricing','Book a free visit','Where are your showrooms?'];
  return (<>
    <button type="button" onClick={()=>setOpen(o=>!o)} aria-label="Chat with us" style={{ position:'fixed', right: mobile?16:24, bottom: mobile?88:24, zIndex:1400, width:56, height:56, borderRadius:'50%', background:'var(--clay)', border:'none', boxShadow:'0 6px 20px rgba(249,115,22,.4)', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {open
        ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>}
      {!open && <span style={{ position:'absolute', top:-3, right:-3, background:'var(--ink)', color:'#fff', fontSize:10, fontWeight:700, borderRadius:999, padding:'1px 6px', lineHeight:1.4 }}>AI</span>}
    </button>
    {open && (
      <div style={{ position:'fixed', right: mobile?10:24, bottom: mobile?150:92, zIndex:1400, width: mobile?'calc(100vw - 20px)':380, maxWidth:'calc(100vw - 20px)', height:520, maxHeight:'70vh', background:'#fff', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.22)', border:'1px solid #ececec', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ background:'#1d1d1f', color:'#fff', padding:'14px 18px' }}>
          <div style={{ fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:8 }}><Spark size={16} color="#F9A35C" /> Closets Assistant</div>
          <div style={{ fontSize:12, color:'#bdbdbd', marginTop:2 }}>AI-powered · replies in seconds</div>
        </div>
        <div ref={listRef} style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10, background:'#fafafa' }}>
          {msgs.map((m,i)=>(<div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'85%', background: m.role==='user'?'var(--clay)':'#fff', color: m.role==='user'?'#fff':'#1d1d1f', border: m.role==='user'?'none':'1px solid #ececec', borderRadius:14, padding:'10px 13px', fontSize:14, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{m.content}</div>))}
          {busy && <div style={{ alignSelf:'flex-start', color:'#aaa', fontSize:13, padding:'4px 6px' }}>typing…</div>}
          {msgs.length<=1 && <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>{chips.map(c=>(<button key={c} type="button" onClick={()=>{ if(c==='Book a free visit'){ setOpen(false); setPage('booking'); } else send(c); }} style={{ fontSize:12, border:'1px solid #e0e0e0', borderRadius:16, padding:'6px 12px', background:'#fff', cursor:'pointer', color:'#1d1d1f' }}>{c}</button>))}</div>}
        </div>
        <div style={{ display:'flex', gap:8, padding:'12px', borderTop:'1px solid #ececec' }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} aria-label="Ask anything" placeholder="Ask anything…" style={{ flex:1, border:'1px solid #e0e0e0', borderRadius:980, padding:'10px 16px', fontSize:14, outline:'none' }} />
          <button type="button" onClick={()=>send()} disabled={busy||!input.trim()} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', flexShrink:0, opacity:(busy||!input.trim())?0.5:1 }}><SendIcon size={18} color="#fff" /></button>
        </div>
      </div>
    )}
  </>);
}
const MaintenancePage = () => <RequestPage kind="Maintenance" title="Maintenance request" sub="Need an adjustment or repair? Log a request and our team will arrange a visit." refLabel="Order / reference no." />;
const WarrantyPage = () => <RequestPage kind="Warranty" title="Warranty service" sub="Register a warranty claim — we stand behind every installation." refLabel="Order / warranty no." />;

function BeforeAfter({ before, after }) {
  const [show,setShow]=useState('after');
  return (<div style={{ position:'relative' }}>
    <div style={{ height:200, borderRadius:14, background:`url('${show==='after'?after:before}') center/cover`, transition:'background .2s' }} />
    <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:6 }}>
      {['before','after'].map(k=>(<button type="button" key={k} onClick={()=>setShow(k)} style={{ background: show===k?'#1d1d1f':'rgba(255,255,255,.9)', color: show===k?'#fff':'#1d1d1f', border:'none', borderRadius:980, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', textTransform:'capitalize' }}>{k}</button>))}
    </div>
  </div>);
}
function PortfolioPage({ setPage }) {
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('website_projects?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  const cats=['Kitchens','Wardrobes','Walk-In Closets','TV Units','Doors','Storage Solutions','Office Furniture'];
  return (<PageWrap title="Our projects" sub="Real spaces we have designed, manufactured and installed across Bahrain.">
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20, marginBottom:48 }}>
      {rows.map(p=>(<div key={p.id} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        {p.before_url && p.after_url ? <BeforeAfter before={p.before_url} after={p.after_url} />
          : <div style={{ height:200, background:`url('${p.cover_url}') center/cover, #eee` }} />}
        <div style={{ padding:20 }}>
          <div style={{ fontSize:12, color:'var(--clay)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>{[p.category,p.client_type].filter(Boolean).join(' · ')}</div>
          <div style={{ fontSize:17, fontWeight:600, color:'#1d1d1f', marginTop:6 }}>{p.name}</div>
          {p.location && <div style={{ fontSize:13, color:'#aaa', marginTop:4 }}>📍 {p.location}</div>}
          <div style={{ fontSize:14, color:'#86868b', marginTop:8, lineHeight:1.6 }}>{p.description}</div>
        </div>
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>Project gallery coming soon.</div>}
    </div>
    <div style={{ fontSize:13, color:'#86868b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Explore by room</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
      {cats.map(c=>(<button type="button" key={c} onClick={()=>setPage('cat:'+c)} style={{ background:'#f5f5f7', border:'none', borderRadius:14, padding:'18px 16px', textAlign:'left', cursor:'pointer', fontSize:14, fontWeight:600, color:'#1d1d1f' }}>{c} →</button>))}
    </div>
  </PageWrap>);
}
function CategoryPage({ category, products, setPage, addToCart }) {
  const list=(products||[]).filter(p=> (p.category||'').toLowerCase()===category.toLowerCase());
  return (<PageWrap title={category} sub={`Bespoke ${category.toLowerCase()}, designed, made and installed in Bahrain.`}>
    <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
      <button type="button" onClick={()=>setPage('booking')} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:980, padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Book a free design visit</button>
      <button type="button" onClick={()=>setPage('planner')} style={{ background:'#1d1d1f', color:'#fff', border:'none', borderRadius:980, padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Design it in 3D</button>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
      {list.map(p=>(<div key={p.id} onClick={()=>setPage('product-'+p.id)} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, overflow:'hidden', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ height:170, background: p.image_url?`url('${p.image_url}') center/cover`:'linear-gradient(135deg,#FFF1E8,#F5F5F7)' }} />
        <div style={{ padding:16 }}>
          <div style={{ fontSize:16, fontWeight:600, color:'#1d1d1f' }}>{p.name}</div>
          <div style={{ fontSize:13, color:'#86868b', marginTop:4 }}>{p.category}</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
            <span style={{ fontSize:16, fontWeight:700, color:'#1d1d1f' }}>BD {Number(p.price||0).toLocaleString()}</span>
            <button type="button" onClick={e=>{ e.stopPropagation(); addToCart&&addToCart(p); }} style={{ background:'#f5f5f7', border:'none', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer', color:'#1d1d1f' }}>Add</button>
          </div>
        </div>
      </div>))}
      {list.length===0 && <div style={{ color:'#aaa' }}>New {category.toLowerCase()} designs coming soon — book a visit to start yours.</div>}
    </div>
  </PageWrap>);
}

/* ── Robustness: a render error in one page must never blank the whole site ── */
class PageBoundary extends Component {
  constructor(p){ super(p); this.state={ err:null }; }
  static getDerivedStateFromError(err){ return { err }; }
  componentDidCatch(err,info){ try{ console.error('Page render error:', err, info); }catch(e){} }
  render(){
    if(this.state.err) return (
      <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px', textAlign:'center' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>Something went wrong on this page</div>
        <div style={{ fontSize:14, color:'var(--ink-soft)', maxWidth:420, marginBottom:18 }}>Please try again — your work elsewhere is safe.</div>
        <button type="button" className="btn-clay" onClick={()=>this.setState({ err:null })} style={{ borderRadius:12 }}>Try again</button>
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

function WrenPlannerPage({ setPage, user }) {
  const mobile = useMobile();
  const [step, setStep] = useState(1);
  const [shape, setShape] = useState('l-shape');
  const [dims, setDims] = useState({ a:340, b:260, c:220, island:180 });
  const [styleId, setStyleId] = useState('shaker_oak');
  const [worktop, setWorktop] = useState('quartz');
  const [handle, setHandle] = useState('bar');
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });
  const sh = KITCHEN_SHAPES.find(s=>s.id===shape) || KITCHEN_SHAPES[0];
  const st = KITCHEN_STYLES.find(s=>s.id===styleId) || KITCHEN_STYLES[0];
  const wt = KITCHEN_WORKTOPS.find(w=>w[0]===worktop) || KITCHEN_WORKTOPS[0];
  const hd = KITCHEN_HANDLES.find(h=>h[0]===handle) || KITCHEN_HANDLES[0];
  const runM = (sh.runs.reduce((s,k)=>s+(Number(dims[k])||0),0))/100; // cm → m
  const est = Math.max(0, Math.round(runM*480*st.mult + wt[3] + hd[3]));
  const STEPS = ['Shape','Size','Style','Finishes','Summary'];

  // Simple top-down plan preview, tinted by the chosen door style
  const plan = () => {
    const c = st.hex, line = '#cbbfae';
    const R = (x,y,w,h) => <rect x={x} y={y} width={w} height={h} rx="3" fill={c} stroke="rgba(0,0,0,.12)" strokeWidth="1" />;
    let runs = null;
    switch (shape) {
      case 'straight': runs = R(24,150,212,26); break;
      case 'galley': runs = <>{R(24,40,212,26)}{R(24,150,212,26)}</>; break;
      case 'l-shape': runs = <>{R(24,40,26,136)}{R(24,150,212,26)}</>; break;
      case 'u-shape': runs = <>{R(24,40,26,136)}{R(24,150,212,26)}{R(210,40,26,136)}</>; break;
      case 'island': runs = <>{R(24,150,212,26)}{R(86,80,88,40)}</>; break;
      default: runs = R(24,150,212,26);
    }
    return (
      <svg viewBox="0 0 260 200" style={{ width:'100%', height:'auto', display:'block' }} aria-label="Kitchen plan preview">
        <rect x="10" y="14" width="240" height="172" rx="10" fill="#fff" stroke={line} strokeWidth="2" strokeDasharray="5 5" />
        {runs}
      </svg>
    );
  };

  const book = async () => {
    if (!contact.name.trim() || !contact.phone.trim()) { toast('Please add your name and phone','error'); return; }
    setBusy(true);
    try {
      const cfgId = uid();
      const spec = { product:'kitchen', shape, dims, style:styleId, worktop, handle, run_metres:Number(runM.toFixed(2)), estimate_bhd:est };
      await api('product_configurations', { method:'POST', body:[{ id:cfgId, customer_id:user?.id||null, customer_name:contact.name||user?.name||null, customer_email:contact.email||user?.email||null, customer_phone:contact.phone||user?.phone||null, product_name:`Kitchen — ${sh.name}, ${st.name} (${runM.toFixed(1)}m)`, configuration:spec, total_price:est, status:'kitchen-plan', share_token:cfgId, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-' + Date.now().toString(36).toUpperCase();
      const note = [`🍽️ Website Kitchen Planner`, `Shape: ${sh.name}  |  Run: ${runM.toFixed(1)}m`, `Style: ${st.name}  |  Worktop: ${wt[1]}  |  Handles: ${hd[1]}`, `Indicative estimate: BHD ${est}`, contact.date?`Preferred appointment: ${contact.date}`:'', `Plan ref: ${cfgId}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:contact.name||'Website Visitor', email:contact.email||null, phone:contact.phone||null, source:'website_kitchen_planner', status:'New', stage:'New', platform:'Website', interest:'Kitchen (planner)', budget:est, value:est, notes:note, created_at:new Date().toISOString() }] });
      toast('Appointment requested — our kitchen team will be in touch','success');
      setPage('home');
    } catch (e) { toast('Could not send: ' + (e?.message||'please try again'),'error'); }
    finally { setBusy(false); }
  };

  const inS = { width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' };
  const next = () => setStep(s=>Math.min(5,s+1));
  const back = () => setStep(s=>Math.max(1,s-1));

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?86:104, paddingBottom:90 }}>
      <div style={{ maxWidth:1080, margin:'0 auto', padding: mobile?'0 18px':'0 28px' }}>
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>Kitchen design · online planner</div>
          <h1 className="display" style={{ fontSize: mobile?30:46, color:'var(--ink)' }}>Plan your dream kitchen.</h1>
          <p style={{ color:'var(--ink-soft)', fontSize:16, marginTop:10 }}>Five quick steps to a layout, a look and a free design appointment.</p>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexWrap:'wrap', margin:'0 auto 26px', maxWidth:660 }}>
          {STEPS.map((label,i)=>{ const n=i+1, done=n<step, now=n===step; return (
            <Fragment key={label}>
              <span onClick={()=>n<step&&setStep(n)} style={{ display:'flex', alignItems:'center', gap:6, cursor:n<step?'pointer':'default' }}>
                <span style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background: now?'var(--clay)':done?'var(--clay-deep)':'var(--sand)', color:(!now&&!done)?'var(--muted)':'#fff' }}>{done?'✓':n}</span>
                <span style={{ fontSize:12.5, fontWeight: now?700:500, color: now?'var(--ink)':done?'var(--ink-soft)':'var(--muted)' }}>{label}</span>
              </span>
              {i<STEPS.length-1 && <span style={{ width:16, height:2, background:'var(--line)', borderRadius:2 }} />}
            </Fragment>
          ); })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:22, alignItems:'start' }}>
          {/* Plan + live estimate */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:20, boxShadow:'var(--shadow)', position: mobile?'static':'sticky', top:96 }}>
            <div style={{ background:'var(--sand)', borderRadius:14, padding:16, marginBottom:16 }}>{plan()}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Indicative estimate · Standard</span>
              <span className="display" style={{ fontSize:26, color:'var(--clay)' }}>{fmt(est)}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>{sh.name} · {runM.toFixed(1)}m run · {st.name} · {wt[1]} worktop</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>A guide price — your free design appointment confirms an exact, itemised quote.</div>
          </div>

          {/* Step panel */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?18:24, boxShadow:'var(--shadow)' }}>
            {step===1 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>1 · Choose your shape</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>How does your kitchen wrap around the room?</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {KITCHEN_SHAPES.map(s=>{ const on=shape===s.id; return (
                  <button key={s.id} type="button" onClick={()=>setShape(s.id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:14, padding:'13px 14px', cursor:'pointer' }}>
                    <div style={{ fontSize:14.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{s.name}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:3, lineHeight:1.35 }}>{s.sub}</div>
                  </button>); })}
              </div>
            </>)}
            {step===2 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>2 · Measure your runs</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>Approximate wall lengths — we confirm exact sizes on the home visit.</p>
              {sh.runs.map((k)=>{ const labels={a:'Run A',b:'Run B',c:'Run C',island:'Island'}; return (
                <div key={k} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{labels[k]}</span><span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{dims[k]}cm</span></div>
                  <input type="range" min={120} max={600} step={10} value={dims[k]} onChange={e=>setDims(d=>({...d,[k]:parseInt(e.target.value)}))} style={{ width:'100%', accentColor:'var(--clay)' }} />
                </div>); })}
            </>)}
            {step===3 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>3 · Pick a door style</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>The look that sets the tone for the whole room.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {KITCHEN_STYLES.map(s=>{ const on=styleId===s.id; return (
                  <button key={s.id} type="button" onClick={()=>setStyleId(s.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:14, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0, textAlign:'left' }}>
                    <div style={{ height:54, background:s.g }} />
                    <div style={{ padding:'8px 10px' }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{s.name}</div>
                      <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:2 }}>{s.sub}</div>
                    </div>
                  </button>); })}
              </div>
            </>)}
            {step===4 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>4 · Worktop &amp; handles</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 14px' }}>The finishing touches that make it yours.</p>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'4px 0 8px' }}>WORKTOP</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {KITCHEN_WORKTOPS.map(([id,name,sub,add])=>{ const on=worktop===id; return (
                  <button key={id} type="button" onClick={()=>setWorktop(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{sub}{add>0?` · +${fmt(add)}`:''}</div>
                  </button>); })}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'4px 0 8px' }}>HANDLES</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {KITCHEN_HANDLES.map(([id,name,sub,add])=>{ const on=handle===id; return (
                  <button key={id} type="button" onClick={()=>setHandle(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{sub}{add>0?` · +${fmt(add)}`:''}</div>
                  </button>); })}
              </div>
            </>)}
            {step===5 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>5 · Your kitchen &amp; appointment</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 14px' }}>Book a free design visit — no obligation, exact quote on the day.</p>
              <div style={{ background:'var(--sand)', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:13.5, color:'var(--ink-soft)', lineHeight:1.7 }}>
                <div><b style={{ color:'var(--ink)' }}>Shape</b> · {sh.name} ({runM.toFixed(1)}m run)</div>
                <div><b style={{ color:'var(--ink)' }}>Style</b> · {st.name}</div>
                <div><b style={{ color:'var(--ink)' }}>Worktop</b> · {wt[1]} &nbsp; <b style={{ color:'var(--ink)' }}>Handles</b> · {hd[1]}</div>
                <div style={{ marginTop:4 }}><b style={{ color:'var(--clay-deep)' }}>Estimate · {fmt(est)}</b></div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))} aria-label="Your name" placeholder="Your name" style={inS} />
                <input value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} aria-label="Phone (+973…)" placeholder="Phone (+973…)" inputMode="tel" style={inS} />
                <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} aria-label="Email (optional)" placeholder="Email (optional)" inputMode="email" style={inS} />
                <input type="date" value={contact.date} onChange={e=>setContact(c=>({...c,date:e.target.value}))} style={inS} />
              </div>
              <button type="button" className="btn-clay" disabled={busy} onClick={book} style={{ width:'100%', marginTop:14, borderRadius:14, opacity:busy?.6:1 }}>{busy?'Sending…':'Book my free design appointment'}</button>
            </>)}

            {/* Nav */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20, gap:10 }}>
              {step>1 ? <button type="button" onClick={back} style={{ background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'11px 18px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>‹ Back</button> : <button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>Close ✕</button>}
              {step<5 && <button type="button" className="btn-clay" onClick={next} style={{ borderRadius:12, minWidth:140 }}>Continue →</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function KitchenStudioPage({ setPage, user }) {
  const mobile = useMobile();
  const [room, setRoom] = useState({ w:360, l:300 });
  const [wall, setWall] = useState('bottom');
  const [units, setUnits] = useState({ top:[], bottom:[], left:[], right:[] });
  const [styleId, setStyleId] = useState('shaker_oak');
  const [worktop, setWorktop] = useState('quartz');
  const [handle, setHandle] = useState('bar');
  const [tab, setTab] = useState('units');
  const [showBook, setShowBook] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const st = KITCHEN_STYLES.find(s=>s.id===styleId) || KITCHEN_STYLES[0];
  const wt = KITCHEN_WORKTOPS.find(w=>w[0]===worktop) || KITCHEN_WORKTOPS[0];
  const hd = KITCHEN_HANDLES.find(h=>h[0]===handle) || KITCHEN_HANDLES[0];
  const all = [...units.top, ...units.bottom, ...units.left, ...units.right];
  const unitsSum = all.reduce((s,u)=>s+u.price,0);
  const baseRunM = all.filter(u=>u.tier==='base'||u.tier==='tall').reduce((s,u)=>s+u.w,0)/100;
  const handlesAdd = all.length * (handle==='handleless'?12:handle==='brass'?8:0);
  const est = Math.max(0, Math.round(unitsSum*st.mult + (KU_WT[worktop]||0)*baseRunM + handlesAdd + wt[3]*0));
  const add = (u) => setUnits(s => ({ ...s, [wall]: [...s[wall], { id:uid(), ...u }] }));
  const remove = (w,id) => setUnits(s => ({ ...s, [w]: s[w].filter(u=>u.id!==id) }));
  const clearWall = () => setUnits(s => ({ ...s, [wall]: [] }));

  // 2D top-down plan, scaled to room, units laid along each wall
  const PAD=30, VW=420, VH=340, IW=VW-PAD*2, IH=VH-PAD*2, TH=15;
  const sx=IW/room.w, sy=IH/room.l;
  const colFor = (t)=> t==='wall' ? '#d9c4a8' : t==='tall' ? st.hex : st.hex;
  const wallRects = (key) => {
    const list = units[key]; let off=0; const out=[];
    list.forEach((u,i)=>{
      let x,y,w,h;
      if(key==='bottom'){ w=u.w*sx; h=TH; x=PAD+off; y=PAD+IH-TH; off+=w; }
      else if(key==='top'){ w=u.w*sx; h=TH; x=PAD+off; y=PAD; off+=w; }
      else if(key==='left'){ h=u.w*sy; w=TH; x=PAD; y=PAD+off; off+=h; }
      else { h=u.w*sy; w=TH; x=PAD+IW-TH; y=PAD+off; off+=h; }
      out.push(<rect key={u.id} x={x} y={y} width={Math.max(2,w)} height={Math.max(2,h)} rx="2" fill={colFor(u.tier)} stroke="rgba(0,0,0,.18)" strokeWidth="1" opacity={u.tier==='wall'?0.7:1} />);
    });
    return out;
  };
  const wallHi = (key) => {
    const on = wall===key; const c = on?'var(--clay)':'transparent';
    if(key==='bottom') return <rect x={PAD} y={PAD+IH-TH} width={IW} height={TH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
    if(key==='top') return <rect x={PAD} y={PAD} width={IW} height={TH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
    if(key==='left') return <rect x={PAD} y={PAD} width={TH} height={IH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
    return <rect x={PAD+IW-TH} y={PAD} width={TH} height={IH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
  };

  const book = async () => {
    if(!contact.name.trim() || !contact.phone.trim()){ toast('Please add your name and phone','error'); return; }
    setBusy(true);
    try {
      const cfgId = uid();
      const spec = { product:'kitchen', room, style:styleId, worktop, handle, units:all.map(u=>({key:u.key,name:u.name,w:u.w})), unit_count:all.length, run_metres:Number(baseRunM.toFixed(2)), estimate_bhd:est };
      await api('product_configurations', { method:'POST', body:[{ id:cfgId, customer_id:user?.id||null, customer_name:contact.name||user?.name||null, customer_email:contact.email||user?.email||null, customer_phone:contact.phone||user?.phone||null, product_name:`Kitchen — ${all.length} units, ${st.name} (${baseRunM.toFixed(1)}m)`, configuration:spec, total_price:est, status:'kitchen-plan', share_token:cfgId, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const note = [`🍽️ Website Kitchen Planner`, `Room: ${room.w}×${room.l}cm  |  Units: ${all.length}  |  Run: ${baseRunM.toFixed(1)}m`, `Style: ${st.name}  |  Worktop: ${wt[1]}  |  Handles: ${hd[1]}`, `Indicative estimate: BHD ${est}`, contact.date?`Preferred appointment: ${contact.date}`:'', `Plan ref: ${cfgId}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:contact.name||'Website Visitor', email:contact.email||null, phone:contact.phone||null, source:'website_kitchen_planner', status:'New', stage:'New', platform:'Website', interest:'Kitchen (planner)', budget:est, value:est, notes:note, created_at:new Date().toISOString() }] });
      toast('Appointment requested — our kitchen team will be in touch','success');
      setPage('home');
    } catch(e){ toast('Could not send: '+(e?.message||'please try again'),'error'); }
    finally { setBusy(false); }
  };

  const inS = { width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' };
  const wallBtn = (id,label) => { const on=wall===id; return <button type="button" onClick={()=>setWall(id)} style={{ flex:1, padding:'8px 6px', fontSize:12.5, fontWeight:on?700:500, border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', color: on?'var(--clay-deep)':'var(--ink-soft)', borderRadius:10, cursor:'pointer' }}>{label}<div style={{ fontSize:10, color:'var(--muted)', fontWeight:500 }}>{units[id].length} units</div></button>; };
  const TABS=[['units','Units'],['room','Room'],['style','Style'],['finish','Finishes']];

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?86:104, paddingBottom:90 }}>
      <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'0 16px':'0 28px' }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>Kitchen design · online planner</div>
          <h1 className="display" style={{ fontSize: mobile?30:46, color:'var(--ink)' }}>Design your kitchen, unit by unit.</h1>
          <p style={{ color:'var(--ink-soft)', fontSize:16, marginTop:10 }}>Set your room, drop in cabinets along each wall, choose your look — watch the plan and price update live.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.25fr 1fr', gap:20, alignItems:'start' }}>
          {/* CANVAS + price */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:18, boxShadow:'var(--shadow)', position: mobile?'static':'sticky', top:96 }}>
            <div style={{ background:'var(--sand)', borderRadius:14, padding:12 }}>
              <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:'100%', height:'auto', display:'block' }} aria-label="Kitchen plan">
                <rect x={PAD} y={PAD} width={IW} height={IH} rx="8" fill="#fff" stroke="#cbbfae" strokeWidth="2" strokeDasharray="5 5" />
                {['top','bottom','left','right'].map(k=><Fragment key={k}>{wallRects(k)}</Fragment>)}
                {['top','bottom','left','right'].map(k=><Fragment key={'h'+k}>{wallHi(k)}</Fragment>)}
                <text x={VW/2} y={VH-8} textAnchor="middle" fontSize="11" fill="var(--muted)">{room.w} × {room.l} cm</text>
              </svg>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:14 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Indicative estimate · {all.length} units · {baseRunM.toFixed(1)}m</span>
              <span className="display" style={{ fontSize:26, color:'var(--clay)' }}>{fmt(est)}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{st.name} · {wt[1]} worktop · {hd[1]} handles. A guide price — your free design visit confirms an exact quote.</div>
            <button type="button" className="btn-clay" disabled={all.length===0} onClick={()=>setShowBook(true)} style={{ width:'100%', marginTop:14, borderRadius:12, opacity:all.length===0?.5:1 }}>Book a free design appointment</button>
          </div>

          {/* TOOLS */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?16:22, boxShadow:'var(--shadow)' }}>
            <div style={{ display:'flex', gap:6, marginBottom:18, overflowX:'auto' }}>
              {TABS.map(([id,label])=>{ const on=tab===id; return <button key={id} type="button" onClick={()=>setTab(id)} style={{ flexShrink:0, padding:'8px 15px', borderRadius:99, border:'none', fontSize:13.5, fontWeight:600, cursor:'pointer', background: on?'var(--clay)':'var(--sand)', color: on?'#fff':'var(--ink-soft)' }}>{label}</button>; })}
            </div>

            {tab==='units' && (<>
              <div style={{ fontSize:12.5, color:'var(--ink-soft)', marginBottom:8 }}>1 · Choose a wall, then add units to it.</div>
              <div style={{ display:'flex', gap:6, marginBottom:14 }}>{wallBtn('top','Top')}{wallBtn('bottom','Bottom')}{wallBtn('left','Left')}{wallBtn('right','Right')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {KU_UNITS.map(u=>(
                  <button key={u.key} type="button" onClick={()=>add(u)} style={{ display:'flex', alignItems:'center', gap:9, textAlign:'left', border:'1px solid var(--line)', background:'var(--cream)', borderRadius:12, padding:'9px 11px', cursor:'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.6" aria-hidden="true"><path d={u.ic} /></svg>
                    <span style={{ lineHeight:1.2 }}><span style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--ink)' }}>{u.name}</span><span style={{ fontSize:11, color:'var(--muted)' }}>{u.w}cm · {fmt(u.price)}</span></span>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink)' }}>On {wall} wall ({units[wall].length})</span>
                {units[wall].length>0 && <button type="button" onClick={clearWall} style={{ fontSize:12, color:'var(--clay)', background:'none', border:'none', cursor:'pointer' }}>Clear wall</button>}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {units[wall].length===0 && <span style={{ fontSize:13, color:'var(--muted)' }}>No units yet — tap one above to add it here.</span>}
                {units[wall].map(u=>(
                  <button key={u.id} type="button" onClick={()=>remove(wall,u.id)} title="Remove" style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, border:'1px solid var(--line)', background:'#fff', borderRadius:99, padding:'5px 10px', cursor:'pointer', color:'var(--ink)' }}>{u.name} <span style={{ color:'var(--muted)' }}>×</span></button>
                ))}
              </div>
            </>)}

            {tab==='room' && (<>
              <div style={{ fontSize:12.5, color:'var(--ink-soft)', marginBottom:14 }}>Set the approximate size of your room.</div>
              {[['Width','w'],['Length','l']].map(([lbl,k])=>(
                <div key={k} style={{ marginBottom:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{room[k]}cm</span></div>
                  <input type="range" min={180} max={700} step={10} value={room[k]} onChange={e=>setRoom(r=>({...r,[k]:parseInt(e.target.value)}))} style={{ width:'100%', accentColor:'var(--clay)' }} />
                </div>
              ))}
            </>)}

            {tab==='style' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {KITCHEN_STYLES.map(s=>{ const on=styleId===s.id; return (
                  <button key={s.id} type="button" onClick={()=>setStyleId(s.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:14, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0, textAlign:'left' }}>
                    <div style={{ height:50, background:s.g }} />
                    <div style={{ padding:'8px 10px' }}><div style={{ fontSize:12.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{s.name}</div><div style={{ fontSize:10.5, color:'var(--muted)' }}>{s.sub}</div></div>
                  </button>); })}
              </div>
            )}

            {tab==='finish' && (<>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'0 0 8px' }}>WORKTOP</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {KITCHEN_WORKTOPS.map(([id,name,sub])=>{ const on=worktop===id; return (
                  <button key={id} type="button" onClick={()=>setWorktop(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{sub} · {fmt(KU_WT[id]||0)}/m</div></button>); })}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'0 0 8px' }}>HANDLES</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {KITCHEN_HANDLES.map(([id,name,sub])=>{ const on=handle===id; return (
                  <button key={id} type="button" onClick={()=>setHandle(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{sub}</div></button>); })}
              </div>
            </>)}

            <div style={{ marginTop:18, textAlign:'center' }}><button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>Close ✕</button></div>
          </div>
        </div>
      </div>

      {/* Book modal */}
      {showBook && (
        <div onClick={()=>!busy&&setShowBook(false)} style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:440, width:'100%', padding:26 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>Almost there</div>
            <h3 className="display" style={{ fontSize:24, color:'var(--ink)', margin:'0 0 6px' }}>Book your free design visit</h3>
            <div style={{ background:'var(--sand)', borderRadius:12, padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)', lineHeight:1.6 }}>{all.length} units · {st.name} · {wt[1]} worktop · <b style={{ color:'var(--clay-deep)' }}>{fmt(est)}</b></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))} aria-label="Your name" placeholder="Your name" style={inS} />
              <input value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} aria-label="Phone (+973…)" placeholder="Phone (+973…)" inputMode="tel" style={inS} />
              <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} aria-label="Email (optional)" placeholder="Email (optional)" inputMode="email" style={inS} />
              <input type="date" value={contact.date} onChange={e=>setContact(c=>({...c,date:e.target.value}))} style={inS} />
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button type="button" onClick={()=>setShowBook(false)} disabled={busy} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>Cancel</button>
              <button type="button" className="btn-clay" disabled={busy||!contact.name.trim()||!contact.phone.trim()} onClick={book} style={{ flex:2, borderRadius:12, opacity:(busy||!contact.name.trim()||!contact.phone.trim())?.6:1 }}>{busy?'Sending…':'Request appointment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Guided customer-facing DESIGN BUILDER (end-to-end) ── */
const rpc = async (fn, body) => {
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { ...H, 'Prefer': 'return=representation' },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) { let m = 'request failed (' + r.status + ')'; try { const e = await r.json(); m = e.message || e.hint || e.details || m; } catch (_) {} throw new Error(m); }
  try { return await r.json(); } catch (_) { return null; }
};

const DB_PROJECT_TYPES = [
  { id:'wardrobe', name:'Wardrobe', sub:'Hanging, drawers & shelving', ic:'M3 4h18M5 4v16M19 4v16M12 4v16M7 9h2M15 9h2' },
  { id:'tv', name:'TV Unit', sub:'Media wall & console', ic:'M3 5h18v11H3zM8 20h8M12 16v4' },
  { id:'kitchen', name:'Kitchen', sub:'Cabinets, worktops & pantry', ic:'M4 4h16v16H4zM4 10h16M9 4v6M14 14v3' },
  { id:'walkin', name:'Walk-in', sub:'Dressing room & island', ic:'M4 3h16v18H4zM4 12h16M10 3v18' },
  { id:'storage', name:'Storage', sub:'Utility & garage systems', ic:'M3 7h18v13H3zM3 7l9-4 9 4M8 11h8' },
  { id:'doors', name:'Doors', sub:'Sliding & panel systems', ic:'M5 3h14v18H5zM12 3v18M9 12h0.01M15 12h0.01' },
];
const DB_PART_KINDS = [
  { kind:'cabinet',   name:'Cabinet',   w:60, h:200, depth:60, cost:85, ic:'M4 3h16v18H4zM4 9h16M9 6h0.01' },
  { kind:'drawer',    name:'Drawer',    w:60, h:30,  depth:55, cost:34, ic:'M3 7h18v10H3zM10 12h4' },
  { kind:'shelf',     name:'Shelf',     w:90, h:4,   depth:35, cost:14, ic:'M3 12h18M3 12v3M21 12v3' },
  { kind:'hanging',   name:'Hanging',   w:90, h:8,   depth:55, cost:22, ic:'M4 6h16M12 6v3M8 9a4 4 0 008 0' },
  { kind:'accessory', name:'Accessory', w:40, h:40,  depth:40, cost:28, ic:'M5 5h14v14H5zM9 9h6v6H9z' },
  { kind:'lighting',  name:'LED',       w:90, h:3,   depth:4,  cost:18, ic:'M9 18h6M10 21h4M7 9a5 5 0 1110 0c0 2-1 3-2 4H9c-1-1-2-2-2-4z' },
  { kind:'tv',        name:'TV',        w:120,h:70,  depth:6,  cost:0,  ic:'M3 5h18v11H3zM8 20h8' },
  { kind:'panel',     name:'Panel',     w:60, h:240, depth:2,  cost:26, ic:'M7 3h10v18H7zM7 12h10' },
];
const DB_FEATURES = [
  ['windows','Windows'],['doors','Doors'],['outlets','Electrical outlets'],['ac','AC unit'],
  ['columns','Columns'],['beams','Beams'],['plumbing','Plumbing'],['lighting','Existing lighting'],
];
const DB_STEPS = [
  ['req','Requirements'],['survey','Site Survey'],['build','Design Builder'],['style','Style'],
  ['materials','Materials'],['mood','Moodboard'],['cost','Cost'],['ai','AI Assistant'],
];

function DesignBuilderPage({ setPage, user }) {
  const mobile = useMobile();
  const [step, setStep] = useState('req');
  const [catalog, setCatalog] = useState({ styles:[], materials:[] });
  const [catErr, setCatErr] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [busy, setBusy] = useState(false);

  // requirements
  const [ptype, setPtype] = useState('wardrobe');
  const [req, setReq] = useState({});
  const [roomType, setRoomType] = useState('bedroom');
  const [lifestyle, setLifestyle] = useState('');
  const [family, setFamily] = useState(2);
  const [budget, setBudget] = useState({ min:500, max:2500 });
  const [timeline, setTimeline] = useState('4-6 weeks');
  const [special, setSpecial] = useState('');

  // survey
  const [survey, setSurvey] = useState({ room_w:300, room_l:280, ceiling_h:260, features:{}, media:{ photos:[] } });

  // builder
  const [parts, setParts] = useState([]);
  const [activeKind, setActiveKind] = useState('cabinet');
  const [wall, setWall] = useState('back');
  const [selId, setSelId] = useState(null);

  // style / materials
  const [styleId, setStyleId] = useState(null);
  const [boardId, setBoardId] = useState(null);
  const [finishId, setFinishId] = useState(null);

  // moodboard
  const [mood, setMood] = useState([]);
  const [moodUrl, setMoodUrl] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [swatch, setSwatch] = useState('#b0613b');

  // pricing
  const [price, setPrice] = useState(null);
  const [prevTotal, setPrevTotal] = useState(null);
  const [pricing, setPricing] = useState(false);
  const priceT = useRef(null);

  // inline contact (guest)
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'' });

  useEffect(() => {
    let alive = true;
    rpc('design_catalog', {}).then(d => {
      if (!alive) return;
      if (d && (Array.isArray(d.styles) || Array.isArray(d.materials))) setCatalog({ styles:d.styles||[], materials:d.materials||[] });
      else setCatErr(true);
    }).catch(() => { if (alive) setCatErr(true); });
    return () => { alive = false; };
  }, []);

  const boards = catalog.materials.filter(m => m.category === 'board');
  const finishes = catalog.materials.filter(m => m.category === 'finish');
  const hardwares = catalog.materials.filter(m => m.category === 'hardware');
  const accessories = catalog.materials.filter(m => m.category === 'accessory');
  const board = boards.find(b => b.id === boardId);
  const finish = finishes.find(f => f.id === finishId);
  const style = catalog.styles.find(s => s.id === styleId);

  const areaSqm = Math.max(0.5, (survey.room_w / 100) * (survey.room_l / 100));

  // ── live price (debounced) ──
  useEffect(() => {
    if (parts.length === 0 && !board) { setPrice(null); return; }
    setPricing(true);
    if (priceT.current) clearTimeout(priceT.current);
    priceT.current = setTimeout(async () => {
      try {
        const items = parts.map(p => ({ unit_cost: p.unit_cost, qty: p.qty || 1 }));
        const d = await rpc('design_price', {
          items, area_sqm: Number(areaSqm.toFixed(2)),
          board_id: boardId || null, finish_id: finishId || null, margin_pct: 35,
        });
        if (d && !d.error) { setPrice(prev => { if (prev && typeof prev.total_price === 'number') setPrevTotal(prev.total_price); return d; }); }
      } catch (_) { /* keep last */ } finally { setPricing(false); }
    }, 350);
    return () => priceT.current && clearTimeout(priceT.current);
  }, [parts, boardId, finishId, areaSqm, board]);

  // ── builder geometry ──
  const VW = 460, VH = 320, PAD = 26, GRID = 10;
  const IW = VW - PAD * 2, IH = VH - PAD * 2;
  const snap = v => Math.round(v / GRID) * GRID;
  const colForKind = k => k === 'lighting' ? 'var(--clay)' : k === 'tv' ? 'var(--ink)' : k === 'panel' ? 'var(--muted)' : style ? 'var(--clay-deep)' : 'var(--clay)';

  const addPart = (def) => {
    // click-to-place: append along the selected wall left→right, stacking when full
    const same = parts.filter(p => p.wall === wall);
    let x = PAD + 6, y = PAD + 6;
    if (same.length) { const last = same[same.length - 1]; x = snap(last.x + last.vw + 8); y = last.y; if (x + 40 > PAD + IW) { x = PAD + 6; y = snap(last.y + 60); } }
    const vw = Math.max(18, Math.min(IW - 12, def.w * 0.7));
    const vh = Math.max(8, Math.min(IH - 12, def.h * 0.28));
    setParts(p => [...p, { id: uid(), kind: def.kind, name: def.name, wall, x, y, vw, vh, w: def.w, h: def.h, depth: def.depth, qty: 1, unit_cost: def.cost, props: {} }]);
  };
  const removePart = id => { setParts(p => p.filter(x => x.id !== id)); if (selId === id) setSelId(null); };
  const clearParts = () => { setParts([]); setSelId(null); };

  // overlap detection (axis-aligned)
  const overlaps = (a, b) => a.x < b.x + b.vw && a.x + a.vw > b.x && a.y < b.y + b.vh && a.y + a.vh > b.y;
  const overlapSet = (() => { const s = new Set(); for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { if (overlaps(parts[i], parts[j])) { s.add(parts[i].id); s.add(parts[j].id); } } return s; })();

  // free drag via pointer events
  const svgRef = useRef(null);
  const drag = useRef(null);
  const toLocal = (e) => { const svg = svgRef.current; if (!svg) return { x:0, y:0 }; const r = svg.getBoundingClientRect(); const sx = VW / r.width, sy = VH / r.height; return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }; };
  const onPartDown = (e, p) => { e.stopPropagation(); setSelId(p.id); const loc = toLocal(e); drag.current = { id: p.id, dx: loc.x - p.x, dy: loc.y - p.y }; try { e.target.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = (e) => { if (!drag.current) return; const loc = toLocal(e); const d = drag.current; setParts(list => list.map(p => { if (p.id !== d.id) return p; let nx = snap(loc.x - d.dx), ny = snap(loc.y - d.dy); nx = Math.max(PAD, Math.min(PAD + IW - p.vw, nx)); ny = Math.max(PAD, Math.min(PAD + IH - p.vh, ny)); return { ...p, x: nx, y: ny }; })); };
  const onUp = () => { drag.current = null; };

  // ── style auto-apply ──
  const applyStyle = (s) => {
    setStyleId(s.id);
    // try to match a board / finish suggested by the style by name
    const sm = (s.materials || []).map(x => (x || '').toLowerCase());
    const mb = boards.find(b => sm.some(n => (b.name || '').toLowerCase().includes(n) || n.includes((b.name || '').toLowerCase())));
    const mf = finishes.find(f => sm.some(n => (f.name || '').toLowerCase().includes(n) || n.includes((f.name || '').toLowerCase())));
    if (mb) setBoardId(mb.id);
    if (mf) setFinishId(mf.id);
    toast('Style applied' + (mb || mf ? ' — suggested materials selected' : ''), 'success');
  };

  // ── AI heuristic suggestions ──
  const aiSuggestions = (() => {
    const out = [];
    if (finish && /acrylic|gloss/i.test(finish.name || '')) {
      const mel = finishes.find(f => /melamine|matte|laminate/i.test(f.name || ''));
      if (mel) { const delta = Math.max(0, (Number(finish.cost) || 0) - (Number(mel.cost) || 0)) * areaSqm; out.push({ id:'fin', label:'Switch ' + finish.name + ' → ' + mel.name + ' to save ~' + fmt(delta), apply:() => { setFinishId(mel.id); toast('Finish switched to ' + mel.name, 'success'); } }); }
    }
    const hasLed = parts.some(p => p.kind === 'lighting');
    if (!hasLed) { const def = DB_PART_KINDS.find(d => d.kind === 'lighting'); out.push({ id:'led', label:'Add sensor LED lighting (+' + fmt(def.cost) + ') to lift perceived value', apply:() => { addPart(def); toast('LED lighting added', 'success'); } }); }
    const drawers = parts.filter(p => p.kind === 'drawer').length;
    if (parts.length >= 2 && drawers === 0) { const def = DB_PART_KINDS.find(d => d.kind === 'drawer'); out.push({ id:'drw', label:'Add a drawer bank for folded clothing & accessories', apply:() => { addPart(def); toast('Drawer added', 'success'); } }); }
    if (board) { const cheapest = boards.slice().sort((a, b) => (a.cost || 0) - (b.cost || 0))[0]; if (cheapest && cheapest.id !== board.id && (board.cost || 0) > (cheapest.cost || 0)) { const save = ((board.cost || 0) - (cheapest.cost || 0)) * areaSqm; out.push({ id:'brd', label:'Use ' + cheapest.name + ' board to save ~' + fmt(save) + ' (lower durability)', apply:() => { setBoardId(cheapest.id); toast('Board switched to ' + cheapest.name, 'success'); } }); } }
    if (parts.length === 0) out.push({ id:'start', label:'Open the Design Builder and add at least one cabinet to begin pricing', apply:() => setStep('build') });
    return out;
  })();

  // ── save payload ──
  const buildPayload = (stage) => ({
    id: savedId || undefined,
    customer_id: user?.id || null,
    customer_name: contact.name || user?.name || null,
    customer_phone: contact.phone || user?.phone || null,
    customer_email: contact.email || user?.email || null,
    project_type: ptype, room_type: roomType, stage,
    style_id: styleId || null,
    budget_min: budget.min, budget_max: budget.max, timeline,
    requirements: { ...req, lifestyle, family_members: family, special_requirements: special, board_id: boardId, finish_id: finishId },
    survey: { room_w: survey.room_w, room_l: survey.room_l, ceiling_h: survey.ceiling_h, features: survey.features, media: { photos: survey.media.photos } },
    items: parts.map(p => ({ kind: p.kind, name: p.name, wall: p.wall, x: p.x, y: p.y, w: p.w, h: p.h, depth: p.depth, qty: p.qty || 1, unit_cost: p.unit_cost, props: p.props || {} })),
    moodboard: mood.map(m => ({ kind: m.kind, url: m.url || null, note: m.note || null })),
  });
  const needContact = !user && (!contact.name.trim() || !contact.phone.trim());

  const saveDraft = async () => {
    if (needContact) { toast('Please add your name and phone first', 'error'); setStep('req'); return; }
    setBusy(true);
    try { const id = await rpc('design_save', buildPayload('draft')); const rid = (typeof id === 'string') ? id : (id && id.id) || id; if (rid) setSavedId(rid); toast('Draft saved', 'success'); }
    catch (e) { toast('Could not save: ' + (e?.message || 'try again'), 'error'); }
    finally { setBusy(false); }
  };
  const submitApproval = async () => {
    if (needContact) { toast('Please add your name and phone first', 'error'); setStep('req'); return; }
    setBusy(true);
    try {
      const id = await rpc('design_save', buildPayload('review'));
      const rid = (typeof id === 'string') ? id : (id && id.id) || id;
      if (rid) setSavedId(rid);
      await rpc('design_approval', { p_id: rid, p_kind: 'concept', p_status: 'pending', p_by: contact.name || user?.name || 'Customer', p_signature: null, p_note: 'Submitted from website Design Builder' });
      toast('Submitted for approval — our design team will be in touch', 'success');
      setPage('home');
    } catch (e) { toast('Could not submit: ' + (e?.message || 'try again'), 'error'); }
    finally { setBusy(false); }
  };

  // photo upload (compress → data URL)
  const onSurveyPhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024; let { width:w, height:h } = img;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; } else if (h > max) { w = Math.round(w * max / h); h = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.72);
        setSurvey(s => ({ ...s, media: { ...s.media, photos: [...s.media.photos, dataUrl].slice(0, 8) } }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // ── shared field styles ──
  const inS = { width:'100%', padding:'11px 13px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:14.5, fontFamily:'inherit', color:'var(--ink)' };
  const lblS = { fontSize:12.5, fontWeight:600, color:'var(--ink-soft)', marginBottom:6, display:'block' };
  const card = { background:'#fff', border:'1px solid var(--line)', borderRadius:18, padding: mobile?16:22, boxShadow:'var(--shadow)' };
  const chip = (on) => ({ padding:'8px 14px', borderRadius:99, border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', color: on?'var(--clay-deep)':'var(--ink-soft)', fontSize:13, fontWeight: on?700:500, cursor:'pointer' });

  const Toggle = ({ label, val, set }) => (
    <button type="button" onClick={() => set(!val)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'10px 13px', border:'1px solid var(--line)', background: val?'var(--sand)':'#fff', borderRadius:12, cursor:'pointer', fontSize:14, color:'var(--ink)' }}>
      <span>{label}</span><span style={{ width:18, height:18, borderRadius:6, border:'2px solid '+(val?'var(--clay)':'var(--line)'), background: val?'var(--clay)':'#fff', color:'#fff', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{val?'✓':''}</span>
    </button>
  );
  const Counter = ({ label, k }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
      <span style={{ fontSize:14, color:'var(--ink)' }}>{label}</span>
      <span style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button type="button" onClick={() => setReq(r => ({ ...r, [k]: Math.max(0, (r[k]||0) - 1) }))} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--line)', background:'#fff', fontSize:16, cursor:'pointer', color:'var(--ink)' }}>−</button>
        <span style={{ minWidth:22, textAlign:'center', fontWeight:700, color:'var(--clay-deep)' }}>{req[k]||0}</span>
        <button type="button" onClick={() => setReq(r => ({ ...r, [k]: (r[k]||0) + 1 }))} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--line)', background:'#fff', fontSize:16, cursor:'pointer', color:'var(--ink)' }}>+</button>
      </span>
    </div>
  );

  const total = price?.total_price || 0;
  const variation = prevTotal != null ? total - prevTotal : 0;

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?86:104, paddingBottom:90 }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding: mobile?'0 16px':'0 28px' }}>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>Design Builder · guided end-to-end</div>
          <h1 className="display" style={{ fontSize: mobile?28:44, color:'var(--ink)' }}>Design your space, step by step.</h1>
          <p style={{ color:'var(--ink-soft)', fontSize:15.5, marginTop:8 }}>Tell us what you need, lay out the parts, choose your look — and watch the price update live.</p>
        </div>

        {catErr && <div style={{ ...card, marginBottom:16, borderColor:'var(--clay)', color:'var(--clay-deep)', textAlign:'center' }}>Our design catalogue is taking a moment to load. You can still build a layout — pricing and styles will appear shortly.</div>}

        {/* step tabs */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:18, paddingBottom:4 }}>
          {DB_STEPS.map(([id, label], i) => { const on = step === id; return (
            <button key={id} type="button" onClick={() => setStep(id)} style={{ flexShrink:0, display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:99, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: on?'var(--clay)':'var(--sand)', color: on?'#fff':'var(--ink-soft)' }}>
              <span style={{ width:18, height:18, borderRadius:99, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', background: on?'rgba(255,255,255,.25)':'var(--line)', color: on?'#fff':'var(--muted)' }}>{i+1}</span>{label}
            </button>); })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.05fr 1fr', gap:20, alignItems:'start' }}>
          {/* LEFT: live canvas + cost rail (sticky) */}
          <div style={{ position: mobile?'static':'sticky', top:96, display:'flex', flexDirection:'column', gap:16 }}>
            <div style={card}>
              <div style={{ background:'var(--sand)', borderRadius:14, padding:10 }}>
                <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onPointerDown={() => setSelId(null)} style={{ width:'100%', height:'auto', display:'block', touchAction:'none', cursor: drag.current?'grabbing':'default' }} aria-label="Design canvas">
                  <defs>
                    <pattern id="dbgrid" width={GRID} height={GRID} patternUnits="userSpaceOnUse"><path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="rgba(0,0,0,.05)" strokeWidth="1" /></pattern>
                  </defs>
                  <rect x={PAD} y={PAD} width={IW} height={IH} rx="6" fill="#fff" stroke="#cbbfae" strokeWidth="2" strokeDasharray="5 5" />
                  <rect x={PAD} y={PAD} width={IW} height={IH} fill="url(#dbgrid)" />
                  {parts.map(p => { const sel = selId === p.id; const bad = overlapSet.has(p.id); return (
                    <g key={p.id} onPointerDown={e => onPartDown(e, p)} style={{ cursor:'grab' }}>
                      <rect x={p.x} y={p.y} width={p.vw} height={p.vh} rx="3" fill={colForKind(p.kind)} opacity={p.kind==='lighting'?0.75:0.92} stroke={bad?'#d93025':sel?'var(--ink)':'rgba(0,0,0,.18)'} strokeWidth={sel||bad?2:1} />
                      {p.vw > 30 && p.vh > 14 && <text x={p.x + p.vw/2} y={p.y + p.vh/2 + 3} textAnchor="middle" fontSize="9" fill="#fff" style={{ pointerEvents:'none' }}>{p.name}</text>}
                      {sel && <text x={p.x + p.vw/2} y={p.y - 4} textAnchor="middle" fontSize="9" fill="var(--ink)" style={{ pointerEvents:'none' }}>{p.w}×{p.h}cm</text>}
                    </g>); })}
                  <text x={VW/2} y={VH-7} textAnchor="middle" fontSize="10" fill="var(--muted)">{survey.room_w} × {survey.room_l} cm · {parts.length} part{parts.length===1?'':'s'}</text>
                </svg>
              </div>
              {selId && (() => { const p = parts.find(x => x.id === selId); if (!p) return null; return (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, fontSize:12.5, color:'var(--ink-soft)' }}>
                  <span>Selected: <b style={{ color:'var(--ink)' }}>{p.name}</b> · {fmt(p.unit_cost)}{overlapSet.has(p.id) && <span style={{ color:'#d93025', marginLeft:8 }}>· overlapping</span>}</span>
                  <button type="button" onClick={() => removePart(p.id)} style={{ background:'none', border:'1px solid var(--line)', borderRadius:99, padding:'4px 12px', fontSize:12, cursor:'pointer', color:'var(--clay)' }}>Remove</button>
                </div>); })()}
            </div>

            {/* real-time cost panel */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span className="eyebrow" style={{ margin:0 }}>Live estimate</span>
                {pricing && <span style={{ fontSize:11, color:'var(--muted)' }}>updating…</span>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>Current price</div><div className="display" style={{ fontSize:26, color:'var(--clay)' }}>{price?fmt(total):'—'}</div></div>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>Variation vs previous</div><div style={{ fontSize:18, fontWeight:700, color: variation>0?'var(--clay-deep)':variation<0?'var(--clay)':'var(--muted)' }}>{prevTotal!=null?(variation>=0?'+':'')+fmt(Math.abs(variation)).replace('BD ', variation<0?'−BD ':'BD '):'—'}</div></div>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>Margin</div><div style={{ fontSize:18, fontWeight:700, color:'var(--ink)' }}>{price?Math.round(price.margin_pct||0)+'%':'—'}</div></div>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>Estimated delivery</div><div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)' }}>{price?.estimated_delivery?new Date(price.estimated_delivery).toLocaleDateString('en-GB',{ day:'numeric', month:'short' }):'—'}</div></div>
              </div>
              {price && <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--line)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12, color:'var(--ink-soft)' }}>
                <span>Materials</span><span style={{ textAlign:'right' }}>{fmt(price.material_cost)}</span>
                <span>Labour</span><span style={{ textAlign:'right' }}>{fmt(price.labor_cost)}</span>
                <span>Delivery</span><span style={{ textAlign:'right' }}>{fmt(price.delivery_cost)}</span>
                <span>Install</span><span style={{ textAlign:'right' }}>{fmt(price.install_cost)}</span>
              </div>}
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:10 }}>Indicative — confirmed at your free design visit.</div>
            </div>
          </div>

          {/* RIGHT: step panels */}
          <div style={card}>
            {/* STEP 1 — REQUIREMENTS */}
            {step === 'req' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>What are you designing?</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Pick a project type, then fill in your needs.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:18 }}>
                {DB_PROJECT_TYPES.map(t => { const on = ptype === t.id; return (
                  <button key={t.id} type="button" onClick={() => { setPtype(t.id); setReq({}); }} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:14, padding:'11px 12px', cursor:'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5" aria-hidden="true"><path d={t.ic} /></svg>
                    <div style={{ fontSize:13.5, fontWeight:700, color: on?'var(--clay-deep)':'var(--ink)', marginTop:6 }}>{t.name}</div>
                    <div style={{ fontSize:10.5, color:'var(--muted)' }}>{t.sub}</div>
                  </button>); })}
              </div>

              {/* type-aware fields */}
              {ptype === 'wardrobe' && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>Hanging & storage</span>
                <Counter label="Long hanging sections" k="long_hanging" />
                <Counter label="Short hanging sections" k="short_hanging" />
                <Counter label="Drawer banks" k="drawers" />
                <Counter label="Shoe storage units" k="shoe_storage" />
                <span style={{ ...lblS, marginTop:12 }}>Accessories</span>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['safe_box','Safe box'],['jewelry_drawer','Jewelry drawer'],['ironing_board','Pull-out ironing board'],['laundry_basket','Laundry basket']].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}
              {ptype === 'tv' && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>TV size</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>{['43"','55"','65"','75"','85"+'].map(s => <button key={s} type="button" onClick={() => setReq(r => ({ ...r, tv_size: s }))} style={chip(req.tv_size === s)}>{s}</button>)}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['console','Floating console'],['display_shelves','Display shelves'],['gaming','Gaming storage'],['sound_system','Sound system / soundbar']].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}
              {ptype === 'kitchen' && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>Appliances</span>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                  {[['oven','Built-in oven'],['hob','Hob & extractor'],['dishwasher','Dishwasher'],['fridge','Integrated fridge'],['microwave','Microwave']].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
                <span style={lblS}>Cooking habits</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>{['Light','Everyday','Avid cook','Entertainer'].map(s => <button key={s} type="button" onClick={() => setReq(r => ({ ...r, cooking: s }))} style={chip(req.cooking === s)}>{s}</button>)}</div>
                <span style={lblS}>Storage & pantry</span>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['pantry','Tall pantry unit'],['extra_storage','Extra deep storage'],['island','Island with storage']].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}
              {(ptype === 'walkin' || ptype === 'storage' || ptype === 'doors') && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>Main features</span>
                <Counter label="Hanging sections" k="hanging" />
                <Counter label="Drawer banks" k="drawers" />
                <Counter label="Open shelving units" k="shelving" />
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
                  {[['island','Central island / dresser'],['mirror','Full-length mirror'],['lighting','Sensor LED lighting']].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div><span style={lblS}>Room type</span>
                  <select value={roomType} onChange={e => setRoomType(e.target.value)} style={inS}>{['bedroom','master bedroom','living room','dressing room','hallway','kitchen','office','kids room','utility'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><span style={lblS}>Family members</span>
                  <input type="number" min={1} max={12} value={family} onChange={e => setFamily(parseInt(e.target.value) || 1)} style={inS} /></div>
              </div>
              <div style={{ marginBottom:14 }}><span style={lblS}>Lifestyle</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{['Minimal','Family','Collector','Busy professional','Luxury'].map(s => <button key={s} type="button" onClick={() => setLifestyle(s)} style={chip(lifestyle === s)}>{s}</button>)}</div>
              </div>
              <div style={{ marginBottom:14 }}><span style={lblS}>Budget range — {fmt(budget.min)} to {fmt(budget.max)}</span>
                <div style={{ display:'flex', gap:10 }}>
                  <input type="range" min={200} max={10000} step={100} value={budget.min} onChange={e => setBudget(b => ({ ...b, min: Math.min(parseInt(e.target.value), b.max - 100) }))} style={{ flex:1, accentColor:'var(--clay)' }} />
                  <input type="range" min={300} max={20000} step={100} value={budget.max} onChange={e => setBudget(b => ({ ...b, max: Math.max(parseInt(e.target.value), b.min + 100) }))} style={{ flex:1, accentColor:'var(--clay)' }} />
                </div>
              </div>
              <div style={{ marginBottom:14 }}><span style={lblS}>Timeline</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{['2-3 weeks','4-6 weeks','2-3 months','Flexible'].map(s => <button key={s} type="button" onClick={() => setTimeline(s)} style={chip(timeline === s)}>{s}</button>)}</div>
              </div>
              <div style={{ marginBottom:4 }}><span style={lblS}>Special requirements & style/colour notes</span>
                <textarea value={special} onChange={e => setSpecial(e.target.value)} rows={3} aria-label="Special requests" placeholder="e.g. warm oak tones, soft-close everywhere, allergy-safe finishes…" style={{ ...inS, resize:'vertical' }} /></div>
            </Fragment>)}

            {/* STEP 2 — SITE SURVEY */}
            {step === 'survey' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>Site survey</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Set your room size and flag anything we should design around.</p>
              {[['Room width','room_w',150,800],['Room length','room_l',150,800],['Ceiling height','ceiling_h',200,400]].map(([lbl,k,mn,mx]) => (
                <div key={k} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{survey[k]}cm</span></div>
                  <input type="range" min={mn} max={mx} step={5} value={survey[k]} onChange={e => setSurvey(s => ({ ...s, [k]: parseInt(e.target.value) }))} style={{ width:'100%', accentColor:'var(--clay)' }} />
                </div>
              ))}
              <span style={{ ...lblS, marginTop:6 }}>Existing features in the room</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {DB_FEATURES.map(([k,l]) => <Toggle key={k} label={l} val={!!survey.features[k]} set={v => setSurvey(s => ({ ...s, features: { ...s.features, [k]: v } }))} />)}
              </div>
              <span style={lblS}>Room photos ({survey.media.photos.length}/8)</span>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {survey.media.photos.map((src, i) => (
                  <div key={i} style={{ position:'relative', width:78, height:78, borderRadius:12, overflow:'hidden', border:'1px solid var(--line)' }}>
                    <img src={src} alt={'room '+(i+1)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <button type="button" onClick={() => setSurvey(s => ({ ...s, media: { ...s.media, photos: s.media.photos.filter((_, j) => j !== i) } }))} style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:99, border:'none', background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, cursor:'pointer', lineHeight:1 }}>×</button>
                  </div>
                ))}
                {survey.media.photos.length < 8 && (
                  <label style={{ width:78, height:78, borderRadius:12, border:'1.5px dashed var(--line)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--muted)', fontSize:24, background:'var(--cream)' }}>+
                    <input type="file" accept="image/*" onChange={e => onSurveyPhoto(e.target.files?.[0])} style={{ display:'none' }} />
                  </label>
                )}
              </div>
            </Fragment>)}

            {/* STEP 3 — DESIGN BUILDER */}
            {step === 'build' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>Design builder</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 12px' }}>Tap a part to drop it on the canvas, then drag it to reposition. Parts snap to the grid; overlaps are highlighted in red.</p>
              <span style={lblS}>Place on wall</span>
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>{['back','left','right','front'].map(w => <button key={w} type="button" onClick={() => setWall(w)} style={{ ...chip(wall === w), flex:1, textTransform:'capitalize' }}>{w}</button>)}</div>
              <span style={lblS}>Add a part</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {DB_PART_KINDS.map(d => (
                  <button key={d.kind} type="button" onClick={() => { setActiveKind(d.kind); addPart(d); }} style={{ display:'flex', alignItems:'center', gap:9, textAlign:'left', border: activeKind===d.kind?'1.5px solid var(--clay)':'1px solid var(--line)', background:'var(--cream)', borderRadius:12, padding:'9px 11px', cursor:'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.6" aria-hidden="true"><path d={d.ic} /></svg>
                    <span style={{ lineHeight:1.2 }}><span style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--ink)' }}>{d.name}</span><span style={{ fontSize:11, color:'var(--muted)' }}>{d.w}×{d.h}cm · {fmt(d.cost)}</span></span>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink)' }}>Placed parts ({parts.length})</span>
                {parts.length > 0 && <button type="button" onClick={clearParts} style={{ fontSize:12, color:'var(--clay)', background:'none', border:'none', cursor:'pointer' }}>Clear all</button>}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {parts.length === 0 && <span style={{ fontSize:13, color:'var(--muted)' }}>No parts yet — tap one above to add it to the canvas.</span>}
                {parts.map(p => <button key={p.id} type="button" onClick={() => setSelId(p.id)} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, border: selId===p.id?'1.5px solid var(--clay)':'1px solid var(--line)', background:'#fff', borderRadius:99, padding:'5px 10px', cursor:'pointer', color:'var(--ink)' }}>{p.name} <span onClick={e => { e.stopPropagation(); removePart(p.id); }} style={{ color:'var(--muted)' }}>×</span></button>)}
              </div>
            </Fragment>)}

            {/* STEP 4 — STYLE */}
            {step === 'style' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>Choose a style</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Selecting a style shows its suggested palette and can auto-apply matching materials.</p>
              {catalog.styles.length === 0 && <div style={{ fontSize:13, color:'var(--muted)' }}>Styles are loading…</div>}
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:12 }}>
                {catalog.styles.map(s => { const on = styleId === s.id; return (
                  <div key={s.id} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:14, overflow:'hidden', background:'#fff' }}>
                    <button type="button" onClick={() => applyStyle(s)} style={{ width:'100%', textAlign:'left', border:'none', background:'none', cursor:'pointer', padding:0 }}>
                      <div style={{ display:'flex', height:46 }}>{(s.colors && s.colors.length ? s.colors : ['#b0613b','#efe7dc','#211c18']).slice(0,5).map((c, i) => <div key={i} style={{ flex:1, background: c }} />)}</div>
                      <div style={{ padding:'10px 12px' }}>
                        <div style={{ fontSize:14, fontWeight:700, color: on?'var(--clay-deep)':'var(--ink)' }}>{s.name}{on?' · selected':''}</div>
                        <div style={{ fontSize:11.5, color:'var(--muted)' }}>{s.sub}</div>
                      </div>
                    </button>
                    {on && (
                      <div style={{ padding:'0 12px 12px', fontSize:11.5, color:'var(--ink-soft)' }}>
                        {[['Materials', s.materials],['Handles', s.handles],['Lighting', s.lighting],['Accessories', s.accessories],['Profiles', s.profiles]].filter(([, v]) => v && v.length).map(([lbl, v]) => (
                          <div key={lbl} style={{ marginTop:6 }}><b style={{ color:'var(--ink)' }}>{lbl}:</b> {v.join(', ')}</div>
                        ))}
                      </div>
                    )}
                  </div>); })}
              </div>
            </Fragment>)}

            {/* STEP 5 — MATERIALS */}
            {step === 'materials' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>Materials showroom</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Pick a board and finish, and compare the spec of every option.</p>
              {[['Boards', boards, boardId, setBoardId],['Finishes', finishes, finishId, setFinishId]].map(([title, list, sel, setSel]) => (
                <div key={title} style={{ marginBottom:14 }}>
                  <span style={lblS}>{title}</span>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {list.length === 0 && <span style={{ fontSize:12.5, color:'var(--muted)' }}>Loading…</span>}
                    {list.map(m => { const on = sel === m.id; return (
                      <button key={m.id} type="button" onClick={() => setSel(m.id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}>
                        <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{m.name}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{m.sub||''} · {fmt(m.cost)}/{m.unit||'unit'}</div>
                      </button>); })}
                  </div>
                </div>
              ))}
              {(hardwares.length > 0 || accessories.length > 0) && (
                <div style={{ marginBottom:14 }}>
                  <span style={lblS}>Hardware & accessories</span>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {[...hardwares, ...accessories].map(m => <span key={m.id} style={{ fontSize:11.5, border:'1px solid var(--line)', borderRadius:99, padding:'5px 11px', color:'var(--ink-soft)', background:'#fff' }}>{m.name} · {fmt(m.cost)}</span>)}
                  </div>
                </div>
              )}
              {(boards.length + finishes.length) > 0 && (
                <div style={{ marginTop:8, border:'1px solid var(--line)', borderRadius:12, overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5, minWidth:560 }}>
                    <thead><tr style={{ background:'var(--sand)' }}>{['Material','Cost','Warranty','Durability','Scratch','Water','Lead','Supplier','Maint.'].map(h => <th key={h} style={{ textAlign:'left', padding:'8px 10px', color:'var(--ink-soft)', fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...boards, ...finishes].map(m => (
                        <tr key={m.id} style={{ borderTop:'1px solid var(--line)', background:(m.id===boardId||m.id===finishId)?'var(--cream)':'#fff' }}>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap' }}>{m.name}</td>
                          <td style={{ padding:'8px 10px' }}>{fmt(m.cost)}</td>
                          <td style={{ padding:'8px 10px' }}>{m.warranty_months?m.warranty_months+'mo':'—'}</td>
                          <td style={{ padding:'8px 10px' }}>{m.durability||'—'}</td>
                          <td style={{ padding:'8px 10px' }}>{m.scratch_resist||'—'}</td>
                          <td style={{ padding:'8px 10px' }}>{m.water_resist||'—'}</td>
                          <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>{m.lead_days?m.lead_days+'d':'—'}</td>
                          <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>{m.supplier||'—'}{m.supplier_rating?' ★'+m.supplier_rating:''}</td>
                          <td style={{ padding:'8px 10px' }}>{m.maintenance||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Fragment>)}

            {/* STEP 6 — MOODBOARD */}
            {step === 'mood' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>Moodboard</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Add inspiration links, colour swatches and notes for our designers.</p>
              <span style={lblS}>Inspiration image URL</span>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <input value={moodUrl} onChange={e => setMoodUrl(e.target.value)} aria-label="Inspiration image URL" placeholder="https://…" style={inS} />
                <button type="button" onClick={() => { if (!moodUrl.trim()) return; setMood(m => [...m, { id:uid(), kind:'image', url:moodUrl.trim() }]); setMoodUrl(''); }} className="btn-clay" style={{ borderRadius:12, padding:'0 16px', whiteSpace:'nowrap' }}>Add</button>
              </div>
              <span style={lblS}>Colour palette</span>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14 }}>
                <input type="color" value={swatch} onChange={e => setSwatch(e.target.value)} style={{ width:44, height:40, border:'1px solid var(--line)', borderRadius:10, background:'#fff', cursor:'pointer' }} />
                <button type="button" onClick={() => setMood(m => [...m, { id:uid(), kind:'color', note:swatch }])} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:12, padding:'10px 16px', fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--ink)' }}>Add swatch</button>
              </div>
              <span style={lblS}>Sample note</span>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <input value={moodNote} onChange={e => setMoodNote(e.target.value)} aria-label="Inspiration note" placeholder="e.g. matte brass handles like the showroom" style={inS} />
                <button type="button" onClick={() => { if (!moodNote.trim()) return; setMood(m => [...m, { id:uid(), kind:'note', note:moodNote.trim() }]); setMoodNote(''); }} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:12, padding:'0 16px', fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--ink)', whiteSpace:'nowrap' }}>Add</button>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {mood.length === 0 && <span style={{ fontSize:13, color:'var(--muted)' }}>Nothing pinned yet.</span>}
                {mood.map(m => (
                  <div key={m.id} style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid var(--line)' }}>
                    {m.kind === 'image' && <img src={m.url} alt="inspiration" style={{ width:96, height:96, objectFit:'cover', display:'block' }} onError={e => { e.target.style.display='none'; }} />}
                    {m.kind === 'color' && <div style={{ width:96, height:96, background:m.note }} />}
                    {m.kind === 'note' && <div style={{ width:140, height:96, padding:10, fontSize:12, color:'var(--ink-soft)', background:'var(--cream)', overflow:'hidden' }}>{m.note}</div>}
                    <button type="button" onClick={() => setMood(x => x.filter(p => p.id !== m.id))} style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:99, border:'none', background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, cursor:'pointer', lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
            </Fragment>)}

            {/* STEP 7 — COST */}
            {step === 'cost' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>Real-time cost</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Your live estimate, broken down. It updates automatically as you change the design.</p>
              {!price && <div style={{ fontSize:13.5, color:'var(--muted)' }}>Add parts or pick a board in the previous steps to generate a price.</div>}
              {price && (<Fragment>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  {[['Current price', fmt(total), 'var(--clay)'],['Variation vs previous', prevTotal!=null?((variation>=0?'+':'−')+fmt(Math.abs(variation))):'—', variation<0?'var(--clay)':'var(--clay-deep)'],['Margin', Math.round(price.margin_pct||0)+'%', 'var(--ink)'],['Estimated delivery', price.estimated_delivery?new Date(price.estimated_delivery).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' }):'—', 'var(--ink)']].map(([l, v, c]) => (
                    <div key={l} style={{ border:'1px solid var(--line)', borderRadius:12, padding:'12px 14px', background:'var(--cream)' }}><div style={{ fontSize:11, color:'var(--muted)' }}>{l}</div><div className="display" style={{ fontSize:20, color:c, marginTop:2 }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
                  {[['Material cost', price.material_cost],['Labour', price.labor_cost],['Delivery', price.delivery_cost],['Installation', price.install_cost],['Subtotal', price.subtotal]].map(([l, v], i, a) => (
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'11px 14px', fontSize:13.5, borderBottom: i<a.length-1?'1px solid var(--line)':'none', fontWeight: l==='Subtotal'?700:500, color: l==='Subtotal'?'var(--ink)':'var(--ink-soft)', background: l==='Subtotal'?'var(--sand)':'#fff' }}><span>{l}</span><span>{fmt(v)}</span></div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'13px 14px', fontSize:15, fontWeight:700, color:'var(--clay-deep)', background:'var(--sand)', borderTop:'1px solid var(--line)' }}><span>Total ({Math.round(price.margin_pct||0)}% margin)</span><span>{fmt(total)}</span></div>
                </div>
              </Fragment>)}
            </Fragment>)}

            {/* STEP 8 — AI ASSISTANT */}
            {step === 'ai' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>AI assistant</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Smart suggestions based on your current design. Apply any with one tap.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {aiSuggestions.length === 0 && <div style={{ fontSize:13.5, color:'var(--muted)' }}>Looking good — no changes recommended right now.</div>}
                {aiSuggestions.map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'space-between', border:'1px solid var(--line)', borderRadius:14, padding:'12px 14px', background:'var(--cream)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:18 }}>✨</span>
                      <span style={{ fontSize:13.5, color:'var(--ink)', lineHeight:1.45 }}>{s.label}</span>
                    </div>
                    <button type="button" onClick={s.apply} className="btn-clay" style={{ borderRadius:99, padding:'8px 16px', flexShrink:0 }}>Apply</button>
                  </div>
                ))}
              </div>
            </Fragment>)}

            {/* contact (guest) */}
            {!user && (
              <div style={{ marginTop:18, paddingTop:16, borderTop:'1px solid var(--line)' }}>
                <span style={lblS}>Your details (so we can reach you)</span>
                <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:8 }}>
                  <input value={contact.name} onChange={e => setContact(c => ({ ...c, name:e.target.value }))} aria-label="Your name" placeholder="Your name" style={inS} />
                  <input value={contact.phone} onChange={e => setContact(c => ({ ...c, phone:e.target.value }))} aria-label="Phone (+973…)" placeholder="Phone (+973…)" inputMode="tel" style={inS} />
                  <input value={contact.email} onChange={e => setContact(c => ({ ...c, email:e.target.value }))} aria-label="Email (optional)" placeholder="Email (optional)" inputMode="email" style={{ ...inS, gridColumn: mobile?'auto':'1 / -1' }} />
                </div>
              </div>
            )}

            {/* step nav + footer actions */}
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              {(() => { const i = DB_STEPS.findIndex(s => s[0] === step); return (<Fragment>
                <button type="button" disabled={i===0} onClick={() => setStep(DB_STEPS[Math.max(0, i-1)][0])} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor: i===0?'default':'pointer', opacity:i===0?.5:1 }}>← Back</button>
                <button type="button" disabled={i===DB_STEPS.length-1} onClick={() => setStep(DB_STEPS[Math.min(DB_STEPS.length-1, i+1)][0])} className="btn-clay" style={{ flex:1, borderRadius:12, opacity:i===DB_STEPS.length-1?.5:1 }}>Next →</button>
              </Fragment>); })()}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:10 }}>
              <button type="button" disabled={busy} onClick={saveDraft} style={{ flex:1, background:'#fff', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink)', cursor:'pointer', opacity:busy?.6:1 }}>{busy?'Saving…':(savedId?'Update draft':'Save draft')}</button>
              <button type="button" disabled={busy} onClick={submitApproval} className="btn-clay" style={{ flex:1.4, borderRadius:12, opacity:busy?.6:1 }}>{busy?'Submitting…':'Submit for approval'}</button>
            </div>
            <div style={{ marginTop:14, textAlign:'center' }}><button type="button" aria-label="Close" onClick={() => setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>Close ✕</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('closets_lang') || 'en'; } catch { return 'en'; } });
  useEffect(() => {
    try { localStorage.setItem('closets_lang', lang); } catch {}
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', lang);
      document.body.style.fontFamily = lang === 'ar' ? "'Tahoma','Segoe UI',sans-serif" : '';
    }
  }, [lang]);
  const [products, setProducts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [configProduct, setConfigProduct] = useState(null);
  const [user, setUser] = useState(() => { try { const u = localStorage.getItem('closets_user'); return u ? JSON.parse(u) : null; } catch { return null; } });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authPrefill, setAuthPrefill] = useState(null);
  const [siteLogo, setSiteLogo] = useState(null);
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    api('website_products?active=eq.true&order=sort_order.asc').then(d => { if (Array.isArray(d)) setProducts(d); }).catch(()=>{});
    api('website_testimonials?active=eq.true&order=sort_order.asc').then(d => { if (Array.isArray(d)) setTestimonials(d); }).catch(()=>{});
    api('website_configurator_settings?id=eq.main-config&select=config').then(d => {
      const cfg = d?.[0]?.config; if (cfg?.site_logo_url) setSiteLogo(cfg.site_logo_url);
    }).catch(()=>{});
    api('website_banners?active=eq.true&order=sort_order.asc&limit=10').then(d => {
      if (Array.isArray(d) && d.length) setBanners(d);
    }).catch(()=>{});
  }, []);
  const addToCart = item => setCart(c => [...c, item]);
  const openAuth = (mode = 'login', prefill) => { setAuthMode(mode); setAuthPrefill(prefill && typeof prefill==='object' ? prefill : null); setAuthOpen(true); };
  const productId = page.startsWith('product-') ? page.replace('product-','') : null;
  return (
    <AppCtx.Provider value={{ user, setUser, cart, setCart, addToCart, setPage, lang, setLang }}>
      <style>{CSS}</style>
      <Nav page={page} setPage={setPage} cart={cart} setCartOpen={setCartOpen} user={user} openAuth={openAuth} siteLogo={siteLogo} lang={lang} setLang={setLang} />
      {page==='home' && <HomePage banners={banners} siteLogo={siteLogo} products={products} testimonials={testimonials} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />}
      {page==='products' && <ProductsPage products={products} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />}
      {productId && <ProductDetailPage productId={productId} products={products} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />}
      {page==='portal' && (user ? <HomeHub user={user} setUser={setUser} setPage={setPage} /> : <div style={{ paddingTop:120, textAlign:'center', padding:'120px 24px' }}><button type="button" className="btn" onClick={()=>openAuth('login')} style={{ borderRadius:14 }}>{I18N.signInHub[lang]||I18N.signInHub.en}</button></div>)}
      {page==='checkout' && <CheckoutPage cart={cart} setCart={setCart} user={user} setPage={setPage} />}
      {page==='about' && <AboutPage />}
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
      {page==='ai' && <PageBoundary key="ai"><AIDesignerPage setPage={setPage} user={user} /></PageBoundary>}
      {page==='kitchen-planner' && <PageBoundary key="kp"><KitchenStudioPage setPage={setPage} user={user} /></PageBoundary>}
      {page==='design-builder' && <PageBoundary key="db"><DesignBuilderPage setPage={setPage} user={user} /></PageBoundary>}
      {page==='planner' && <PageBoundary key="planner"><PlannerPage setPage={setPage} user={user} openAuth={openAuth} siteLogo={siteLogo} /></PageBoundary>}
      {page.startsWith('cat:') && <CategoryPage category={page.slice(4)} products={products} setPage={setPage} addToCart={addToCart} />}
      {!['portal','checkout','planner'].includes(page) && <SiteFooter setPage={setPage} />}
      <ChatWidget setPage={setPage} />
      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} setOpen={setCartOpen} setPage={setPage} />
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} setUser={setUser} prefill={authPrefill} onClose={()=>{ setAuthOpen(false); setAuthPrefill(null); }} />}
      <Toasts />
    </AppCtx.Provider>
  );
}