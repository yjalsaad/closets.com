import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

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
const AppCtx = createContext(null);

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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
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
    width: 700px; height: 700px; background: #F97316;
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
    width: 400px; height: 400px; background: #F97316;
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
  .inp:focus { outline: none; background: #fff; border-color: #F97316; box-shadow: 0 0 0 4px rgba(249,115,22,.1); }
  .inp::placeholder { color: #86868b; }
  .btn { background: #F97316; color: #fff; border: none; border-radius: 14px; padding: 15px 24px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 50px; -webkit-tap-highlight-color: transparent; }
  .btn:active { transform: scale(.97); background: #ea6c0a; }
  .btn-sm { background: #F97316; color: #fff; border: none; border-radius: 12px; padding: 11px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; }
  .btn-sm:active { transform: scale(.97); background: #ea6c0a; }
  .btn-secondary { background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 14px; padding: 15px 24px; font-size: 16px; font-weight: 500; cursor: pointer; transition: all .15s; min-height: 50px; }
  .btn-secondary:active { background: #e8e8ed; transform: scale(.97); }
  .btn-ghost { background: transparent; border: 1.5px solid #e6e6e6; border-radius: 14px; padding: 14px 22px; font-size: 15px; font-weight: 500; cursor: pointer; color: #1d1d1f; transition: all .15s; }
  .card { background: #fff; border-radius: 20px; border: 1px solid #e6e6e6; overflow: hidden; }
  select.inp { background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%2386868b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; appearance: none; -webkit-appearance: none; }
  @media (max-width: 767px) {
    .hide-mobile { display: none !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .grid-3 { grid-template-columns: 1fr 1fr !important; }
    .grid-4 { grid-template-columns: 1fr 1fr !important; }
  }
  @media (min-width: 768px) {
    .hide-desktop { display: none !important; }
    .btn:hover { background: #ea6c0a; opacity: .9; }
    .card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.08); transform: translateY(-2px); }
    .card { transition: box-shadow .3s, transform .3s; }
  }
`;

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } }), { threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

/* ── NAV (desktop) + BOTTOM TAB BAR (mobile) ── */
function Nav({ page, setPage, cart, setCartOpen, user, openAuth, siteLogo, lang, setLang }) {
  const [scrolled, setScrolled] = useState(false);
  const mobile = useMobile();
  const tr = (k) => (I18N[k] ? (I18N[k][lang] || I18N[k].en) : k);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 20); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);

  const tabs = [
    { id: 'home', label: 'Home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: 'products', label: 'Gallery', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id: 'cart-btn', label: 'Cart', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
    { id: 'contact', label: 'Contact', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: user ? 'portal' : 'auth', label: user ? (user.name?.split(' ')[0] || 'Hub') : 'Sign In', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ];

  if (mobile) {
    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(20px) saturate(180%)', borderTop: '1px solid rgba(0,0,0,.08)', paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex' }}>
        {tabs.map(tab => {
          const active = tab.id === page || (tab.id === 'cart-btn' && false);
          const isCart = tab.id === 'cart-btn';
          return (
            <button type="button" key={tab.id} onClick={() => { if (isCart) setCartOpen(true); else if (tab.id === 'auth') openAuth('login'); else setPage(tab.id); }}
              style={{ flex: 1, background: 'none', border: 'none', padding: '10px 4px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', color: active ? '#F97316' : '#86868b', position: 'relative', transition: 'color .15s' }}>
              <div style={{ position: 'relative' }}>
                {tab.icon}
                {isCart && cart.length > 0 && <span style={{ position: 'absolute', top: -4, right: -6, background: '#F97316', color: '#fff', borderRadius: 20, width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cart.length}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', background: scrolled ? 'rgba(255,255,255,.88)' : 'rgba(255,255,255,.72)', backdropFilter: 'blur(20px) saturate(180%)', borderBottom: scrolled ? '1px solid rgba(0,0,0,.08)' : '1px solid transparent', transition: 'all .3s' }}>
      <button type="button" onClick={() => setPage('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        {siteLogo
          ? <img src={siteLogo} alt="logo" style={{ height:34, width:'auto', maxWidth:120, objectFit:'contain', borderRadius:6 }} />
          : <><div style={{ width: 28, height: 28, borderRadius: 7, background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="12" rx="1.5" fill="white"/><rect x="9" y="2" width="5" height="7" rx="1.5" fill="white"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-.02em' }}>Closets Co.</span></>}
      </button>
      <div style={{ display: 'flex', gap: 0 }}>
        {[['home','home','Home'],['products','gallery','Gallery'],['projects','projects','Projects'],['planner','design','Design'],['ai','ai','AI Designer'],['services','services','Services'],['showrooms','showrooms','Showrooms'],['directory','directory','Directory'],['blog','blog','Inspiration'],['contact','contact','Contact']].map(([p, key, label]) => (
          <button type="button" key={p} onClick={() => setPage(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', fontSize: 14, fontWeight: page === p ? 500 : 400, color: page === p ? '#1d1d1f' : '#86868b', borderRadius: 8, transition: 'color .2s' }}>{label || tr(key)}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => setPage('booking')} style={{ background: '#F97316', border: 'none', borderRadius: 980, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', minHeight: 34 }}>Book a visit</button>
        <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title="Language" style={{ background: '#f5f5f7', border: 'none', borderRadius: 980, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', minHeight: 34 }}>
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
        {user ? <button type="button" onClick={() => setPage('portal')} style={{ background: 'rgba(249,115,22,.1)', border: 'none', borderRadius: 980, padding: '7px 16px', fontSize: 13, fontWeight: 500, color: '#F97316', cursor: 'pointer' }}>{user.name?.split(' ')[0]}</button>
          : <button type="button" className="btn-secondary" onClick={() => openAuth('login')} style={{ padding: '7px 16px', fontSize: 13, borderRadius: 980, minHeight: 34 }}>{tr('signIn')}</button>}
        <button type="button" onClick={() => setCartOpen(true)} style={{ background: cart.length > 0 ? '#F97316' : '#f5f5f7', border: 'none', borderRadius: 980, padding: '7px 16px', fontSize: 13, fontWeight: 500, color: cart.length > 0 ? '#fff' : '#1d1d1f', cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6, minHeight: 34 }}>
          Cart {cart.length > 0 && <span style={{ background: 'rgba(255,255,255,.3)', borderRadius: 20, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{cart.length}</span>}
        </button>
      </div>
    </nav>
  );
}

/* ── HERO ── */
function Hero({ setPage, banners }) {
  const mobile = useMobile();
  const { t } = useI18n();
  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => {
    if (!banners || banners.length < 2) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners]);
  const banner = banners?.[bannerIdx];

  return (
    <>
      {/* ── Banner strip ── */}
      {banners.length > 0 && (
        <div className="banner-strip" style={{ paddingTop: mobile ? 0 : 0, marginTop: mobile ? 0 : 56 }}>
          <div className="banner-strip-inner" key={bannerIdx}>
            {banner?.badge && (
              <span style={{ background: '#F97316', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase' }}>{banner.badge}</span>
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
                <button key={i} type="button" onClick={() => setBannerIdx(i)}
                  style={{ width: i === bannerIdx ? 16 : 5, height: 5, borderRadius: 10, background: i === bannerIdx ? '#F97316' : 'rgba(255,255,255,.3)', border: 'none', cursor: 'pointer', transition: 'all .3s', padding: 0 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Hero section ── */}
      <section style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: mobile ? '80px 24px 40px' : '0 40px', position: 'relative', overflow: 'hidden', background: '#fafafa' }}>

        {/* Animated gradient blobs */}
        <div className="hero-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
        </div>

        {/* Subtle grid */}
        <div className="hero-grid" />

        {/* Shimmer sweep */}
        <div className="hero-shimmer" />

        {/* Content */}
        <div className="hero-content" style={{ maxWidth: 700, animation: 'fadeUp .7s .1s both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,.1)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#F97316' }}>Bespoke Storage · Bahrain</span>
          </div>
          <h1 style={{ fontSize: mobile ? 44 : 80, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-.04em', color: '#1d1d1f', marginBottom: 24 }}>
            Beautifully<br />designed<br /><span style={{ color: '#F97316' }}>storage.</span>
          </h1>
          <p style={{ fontSize: mobile ? 16 : 19, fontWeight: 300, color: '#6e6e73', lineHeight: 1.6, maxWidth: 440, margin: '0 auto 36px' }}>
            Walk-in closets, wardrobes and storage systems handcrafted for your home.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexDirection: mobile ? 'column' : 'row', maxWidth: 360, margin: '0 auto' }}>
            <button type="button" className="btn" onClick={() => setPage('products')} style={{ fontSize: 16, padding: '15px 28px' }}>{t('viewCollection')}</button>
            <button type="button" className="btn-secondary" onClick={() => setPage('planner')} style={{ fontSize: 16, padding: '15px 28px' }}>{t('designYours')}</button>
          </div>
        </div>

        {/* Stats */}
        <div className="hero-content" style={{ display: 'flex', gap: mobile ? 0 : 0, marginTop: 60, borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 36, width: '100%', maxWidth: 500, justifyContent: 'space-around', animation: 'fadeUp .7s .3s both' }}>
          {[['500+','Projects'],['15yr','Experience'],['4','Showrooms'],['100%','Bespoke']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: mobile ? 22 : 28, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-.02em' }}>{val}</div>
              <div style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ProductCard({ product: p, setPage, addToCart, setConfigProduct }) {
  return (
    <div className="card reveal" onClick={() => setPage('product-' + p.id)} style={{ cursor: 'pointer' }}>
      <div style={{ aspectRatio: '4/3', background: 'linear-gradient(145deg, #f5f5f7, #e8e8ed)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <svg width="56" height="56" viewBox="0 0 64 64" fill="none"><rect x="8" y="8" width="18" height="48" rx="3" fill="#d2d2d7"/><rect x="30" y="8" width="26" height="28" rx="3" fill="#d2d2d7"/></svg>}
        {p.badge && <span style={{ position: 'absolute', top: 12, left: 12, background: '#F97316', color: '#fff', padding: '4px 10px', borderRadius: 980, fontSize: 11, fontWeight: 600 }}>{p.badge}</span>}
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 2, letterSpacing: '-.01em' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: '#86868b' }}>{p.category}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{fmt(p.price)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-sm" style={{ flex: 1, borderRadius: 12 }} onClick={e => { e.stopPropagation(); addToCart(p); toast('Added to cart ✓', 'success'); }}>Add</button>
          <button type="button" style={{ background: '#f5f5f7', border: 'none', borderRadius: 12, padding: '11px 14px', fontSize: 15, cursor: 'pointer', minHeight: 44, color: '#1d1d1f' }} onClick={e => { e.stopPropagation(); setPage('planner'); }}>✦</button>
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
    <div style={{ minHeight: '100vh', paddingTop: mobile ? 16 : 72, paddingBottom: mobile ? 80 : 0, background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: mobile ? '16px 16px 0' : '40px 40px 0' }}>
        <h1 style={{ fontSize: mobile ? 32 : 48, fontWeight: 700, letterSpacing: '-.03em', color: '#1d1d1f', marginBottom: 4 }}>Collection</h1>
        <p style={{ fontSize: 15, color: '#86868b', marginBottom: 20 }}>Handcrafted pieces for every space.</p>
        <div style={{ marginBottom: 20 }}>
          <input className="inp" placeholder="Search collection…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 16 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', marginBottom: 24, paddingBottom: 4, scrollbarWidth: 'none' }}>
          {cats.map(c => (
            <button type="button" key={c} onClick={() => setCat(c)} style={{ padding: '8px 18px', borderRadius: 980, border: 'none', background: cat === c ? '#1d1d1f' : '#f5f5f7', color: cat === c ? '#fff' : '#6e6e73', fontSize: 14, fontWeight: cat === c ? 500 : 400, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 36, flexShrink: 0 }}>{c}</button>
          ))}
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#86868b' }}>No pieces found</div>
          : <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 18, paddingBottom: 40 }}>
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
    <div style={{ minHeight: '100vh', paddingTop: mobile ? 0 : 72, paddingBottom: mobile ? 100 : 0, background: '#fff' }}>
      {mobile && (
        <div style={{ position: 'relative' }}>
          <div style={{ aspectRatio: '1/1', background: 'linear-gradient(145deg, #f5f5f7, #e8e8ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="80" height="80" viewBox="0 0 64 64" fill="none"><rect x="8" y="8" width="18" height="48" rx="3" fill="#d2d2d7"/><rect x="30" y="8" width="26" height="28" rx="3" fill="#d2d2d7"/></svg>}
          </div>
          <button type="button" onClick={() => setPage('products')} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>
      )}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: mobile ? '24px 16px' : '40px 40px 80px' }}>
        {!mobile && <button type="button" onClick={() => setPage('products')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#86868b', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}>← Collection</button>}
        {!mobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, marginBottom: 80 }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', background: 'linear-gradient(145deg, #f5f5f7, #e8e8ed)', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="80" height="80" viewBox="0 0 64 64" fill="none"><rect x="8" y="8" width="18" height="48" rx="3" fill="#d2d2d7"/><rect x="30" y="8" width="26" height="28" rx="3" fill="#d2d2d7"/></svg>}
            </div>
            <ProductInfo product={product} qty={qty} setQty={setQty} addToCart={addToCart} setConfigProduct={setConfigProduct} setPage={setPage} mobile={false} />
          </div>
        ) : (
          <ProductInfo product={product} qty={qty} setQty={setQty} addToCart={addToCart} setConfigProduct={setConfigProduct} setPage={setPage} mobile={true} />
        )}
        <ProductAR product={product} mobile={mobile} />
        {related.length > 0 && (
          <div>
            <h2 style={{ fontSize: mobile ? 20 : 24, fontWeight: 700, letterSpacing: '-.02em', color: '#1d1d1f', marginBottom: 18 }}>{recLabel}</h2>
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
      <h2 style={{ fontSize: mobile ? 20 : 24, fontWeight: 700, letterSpacing: '-.02em', color: '#1d1d1f', marginBottom: 14 }}>See it in 3D &amp; your room</h2>
      {React.createElement('model-viewer', {
        src: product.model_url,
        'ios-src': product.ar_ios_url || undefined,
        ar: true, 'ar-modes': 'webxr scene-viewer quick-look',
        'camera-controls': true, 'auto-rotate': true, 'shadow-intensity': '1',
        poster: product.image_url || undefined, alt: product.name,
        style: { width: '100%', height: mobile ? 320 : 460, background: '#f5f5f7', borderRadius: 18 },
      },
        React.createElement('button', { slot: 'ar-button', key: 'arbtn', style: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: '#F97316', color: '#fff', border: 'none', borderRadius: 980, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' } }, '📱 View in your room')
      )}
      <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>Drag to rotate · on a phone tap “View in your room” for AR. Representative model — your exact unit is finalised at your free design visit.</div>
    </div>
  );
}
function ProductInfo({ product, qty, setQty, addToCart, setConfigProduct, setPage, mobile }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#F97316', marginBottom: 8 }}>{product.category}</div>
      <h1 style={{ fontSize: mobile ? 28 : 40, fontWeight: 700, letterSpacing: '-.03em', color: '#1d1d1f', marginBottom: 10, lineHeight: 1.1 }}>{product.name}</h1>
      <div style={{ fontSize: mobile ? 24 : 30, fontWeight: 700, color: '#1d1d1f', marginBottom: 18 }}>{fmt(product.price)}</div>
      {product.description && <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, marginBottom: 24 }}>{product.description}</p>}
      <div style={{ background: '#f5f5f7', borderRadius: 16, marginBottom: 24 }}>
        {[['Materials', product.materials], ['Lead Time', product.lead_time], ['SKU', product.sku]].filter(([,v]) => v).map(([k, v], i, arr) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid #e6e6e6' : 'none' }}>
            <span style={{ fontSize: 14, color: '#86868b' }}>{k}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: 14, overflow: 'hidden' }}>
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', padding: '13px 18px', fontSize: 20, cursor: 'pointer', color: '#1d1d1f', minWidth: 50 }}>−</button>
          <span style={{ padding: '13px 16px', fontSize: 16, fontWeight: 600, color: '#1d1d1f', borderLeft: '1px solid #e6e6e6', borderRight: '1px solid #e6e6e6', minWidth: 48, textAlign: 'center' }}>{qty}</span>
          <button type="button" onClick={() => setQty(q => q + 1)} style={{ background: 'none', border: 'none', padding: '13px 18px', fontSize: 20, cursor: 'pointer', color: '#1d1d1f', minWidth: 50 }}>+</button>
        </div>
        <button type="button" className="btn" style={{ flex: 1, borderRadius: 14 }} onClick={() => { for (let i = 0; i < qty; i++) addToCart(product); toast(`${qty} item${qty>1?'s':''} added ✓`, 'success'); }}>Add to Cart</button>
        <button type="button" className="btn-ghost" style={{ padding: '13px 16px', minHeight: 50 }} onClick={() => setPage('planner')}>✦</button>
      </div>
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
          <button type="button" onClick={() => setOpen(false)} style={{ background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#86868b', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
                    {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22, opacity: .3 }}>◻</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#86868b', marginBottom: 4 }}>{item.category}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>{fmt(item.price)}</div>
                  </div>
                  <button type="button" onClick={() => setCart(c => c.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868b', padding: '4px', alignSelf: 'flex-start', fontSize: 16 }}>✕</button>
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
function Wardrobe3D({ finishHex, layout, glass, handles, led, mobile, fallback, tall, widthCm, heightCm, depthCm, product }) {
  const { ready, failed } = useThreeLoaded();
  const mountRef = useRef(null);
  const stateRef = useRef({ finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, product });
  const sceneRef = useRef(null);
  useEffect(() => { stateRef.current = { finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, product }; if (sceneRef.current) sceneRef.current.rebuild(); }, [finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, product]);

  useEffect(() => {
    if (!ready || !mountRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    // Measure after layout settles to avoid a 0/skewed aspect ratio
    let w = mount.clientWidth || 600, h = mount.clientHeight || 460;
    if (w < 50) w = 600; if (h < 50) h = 460;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100); camera.position.set(0, 0, 9);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    const k = new THREE.DirectionalLight(0xffffff, 0.7); k.position.set(5, 8, 6); scene.add(k);
    const f = new THREE.DirectionalLight(0xffffff, 0.28); f.position.set(-5, 3, -4); scene.add(f);

    let group = null, raf = 0, drag = false, px = 0, py = 0, rotY = -0.5, rotX = 0.05;
    // interactive-configurator targets (smooth orbit + zoom)
    let zoom = 9, tRotY = -0.5, tRotX = 0.05, tZoom = 9, pinchD = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mat = (c) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c) });
    const box = (bw, bh, bd, m) => new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);

    function cabinet(W, H, D, doors, st) {
      const fin = st.finishHex || '#c89b5e';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.7));
      const doorMat = st.glass ? new THREE.MeshLambertMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.45 }) : mat(fin);
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
      const doorMat = st.glass ? new THREE.MeshLambertMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.5 }) : mat(fin);
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
      const doorMat = isGlass ? new THREE.MeshLambertMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.45 }) : mat(fin);
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
        if (isGlass) { const pane = box(lw * 0.7, H * 0.78, 0.02, new THREE.MeshLambertMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0.4 })); pane.position.set(dx, 0, z + D / 2); g.add(pane); }
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

    function rebuild() {
      const st = stateRef.current;
      if (group) scene.remove(group);
      group = new THREE.Group();
      if (st.product === 'tv') {
        group.add(buildTV(st));
        scene.add(group);
        return;
      }
      if (st.product === 'doors') { group.add(buildDoors(st)); scene.add(group); return; }
      if (st.product === 'kitchen') { group.add(buildKitchen(st)); scene.add(group); return; }
      if (st.product === 'storage') { group.add(buildStorage(st)); scene.add(group); return; }
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
        scene.add(group);
        return;
      }
      // map cm -> 3D units (so 200cm wide ≈ 4 units, 240cm tall ≈ 4.4)
      const W = Math.max(2, Math.min(8, (st.widthCm || 200) / 50));
      const H = Math.max(3, Math.min(6, (st.heightCm || 240) / 54.5));
      const D = Math.max(0.8, Math.min(2.2, (st.depthCm || 60) / 46));
      const doors = Math.max(2, Math.min(5, Math.round(W / 1.35)));
      const main = cabinet(W, H, D, doors, st); group.add(main);
      const sideW = Math.max(1.8, W * 0.6);
      if (st.layout === 'l-shape') { const w2 = cabinet(sideW, H, D, 2, st); w2.position.set(-(W/2+D/2), 0, sideW/2 - D/2); w2.rotation.y = Math.PI / 2; group.add(w2); }
      if (st.layout === 'walk-in') { const w2 = cabinet(sideW, H, D, 2, st); w2.position.set(-(W/2+D/2), 0, sideW/2 - D/2); w2.rotation.y = Math.PI / 2; group.add(w2); const w3 = cabinet(sideW, H, D, 2, st); w3.position.set(W/2+D/2, 0, sideW/2 - D/2); w3.rotation.y = -Math.PI / 2; group.add(w3); }
      scene.add(group);
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
    sceneRef.current = { rebuild, zoomBy: (d) => { tZoom = clamp(tZoom + d, 5, 16); }, reset: () => { tRotY = -0.5; tRotX = 0.05; tZoom = 9; } };
    const onResize = () => { const nw = mount.clientWidth || w, nh = mount.clientHeight || h; if (nw < 50 || nh < 50) return; renderer.setSize(nw, nh); camera.aspect = nw / nh; camera.updateProjectionMatrix(); };
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
      renderer.dispose(); sceneRef.current = null;
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
function PlannerPage({ setPage, user }) {
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
  const [openSec, setOpenSec] = useState('door_finishes');
  const priceTimer = useRef(null);

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

  // When the product changes, reset layout + option selections to that product's defaults
  const lastProdRef = useRef(prodKey);
  useEffect(() => {
    if (lastProdRef.current !== prodKey) {
      lastProdRef.current = prodKey;
      const firstLayout = (prodLayouts && prodLayouts[0]?.id) || 'single';
      setLayout(firstLayout);
      setSel({});
    }
  }, [prodKey, prodLayouts]);

  const buildSelection = useCallback(() => {
    const ids = [];
    Object.values(sel).forEach(v => { if (Array.isArray(v)) ids.push(...v); else if (v) ids.push(v); });
    const w = layout === 'l-shape' ? (Number(dims.sideA) + Number(dims.sideB)) : dims.width;
    return { product: prodKey, width_cm: w, height_cm: dims.height, depth_cm: dims.depth, delivery: false, installation: false, modules: [{ options: ids }], layout };
  }, [sel, dims, layout, prodKey]);

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
    const c = active ? '#F97316' : '#c7c7cc';
    const sw = 2.4;
    const P = (d) => <path d={d} stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    const R = (x,y,w,h,fill) => <rect x={x} y={y} width={w} height={h} rx="1.5" stroke={c} strokeWidth={sw} fill={fill?(active?'#FCE9DD':'#f0f0f2'):'none'} />;
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
      product_name:(selProduct?.name ? selProduct.name+' — ' : '')+'Custom ('+layout+', '+(layout==='l-shape'?(dims.sideA+'+'+dims.sideB):dims.width)+'×'+dims.height+'cm)',
      configuration:buildSelection(), total_price:total, subtotal:price?.goods_subtotal||null,
      discount_amount:price?.discount_amount||null, vat_amount:price?.vat_amount||null, price_breakdown:price||null,
      status, share_token:id, created_at:new Date().toISOString() }] });
    return id;
  };
  const save = async () => {
    setBusy(true);
    try { await persist('saved'); setSaved(true); toast('Design saved','success'); }
    catch (e) { toast('Could not save: ' + (e?.message || 'please try again'), 'error'); }
    finally { setBusy(false); }
  };
  const requestQuote = async () => {
    // Collect contact details if not signed in, so the team can follow up
    let name = user?.name, phone = user?.phone, email = user?.email;
    if (!user) {
      name = window.prompt('Your name (so our team can reach you):', '') || '';
      if (!name) { setBusy(false); return; }
      phone = window.prompt('Your phone number (+973...):', '') || '';
      if (!phone) { toast('A phone number helps us send your quote', 'error'); return; }
    }
    setBusy(true);
    try {
      const cfgId = await persist('quoted');
      const leadId = 'LEAD-' + Date.now().toString(36).toUpperCase();
      // Build a readable design summary so the sales team sees the spec in the lead itself
      const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
      const sizeStr = layout==='l-shape' ? `${dims.sideA}+${dims.sideB}×${dims.height}×${dims.depth}cm` : `${dims.width}×${dims.height}×${dims.depth}cm`;
      const chosenOpts = Object.keys(sel).map(ck => { const lbl = catChosen(ck); return lbl ? `${cats[ck]?.label||ck}: ${lbl}` : null; }).filter(Boolean);
      const noteLines = [
        `🪟 Website Planner quote`,
        `Product: ${selProduct?.name || 'Wardrobe'}`,
        `Layout: ${layout}  |  Finish: ${finName}  |  Size: ${sizeStr}`,
        chosenOpts.length ? `Options — ${chosenOpts.join(', ')}` : 'Options — base only',
        `Estimated total: BHD ${total}`,
        `Config ref: ${cfgId}`,
      ];
      await api('leads', { method:'POST', body:[{ id:leadId, name: name||'Website Visitor', email: email||null, phone: phone||null, source:'website_planner', status:'New', stage:'New', platform:'Website', interest: (selProduct?.name||'Wardrobe')+' (planner)', budget: total, value: total, notes: noteLines.join('\n'), created_at: new Date().toISOString() }] });
      toast('Quote requested — our team will contact you soon','success');
      setPage('home');
    } catch (e) { toast('Could not send quote: ' + (e?.message || 'please try again'), 'error'); }
    finally { setBusy(false); }
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
    <div style={{ minHeight:'100vh', paddingTop:96, paddingBottom:80, maxWidth:900, margin:'0 auto', padding:'96px 20px 80px' }}>
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <h2 style={{ fontSize: mobile?24:30, fontWeight:700, marginBottom:8 }}>{t('whatDesign')}</h2>
        <p style={{ color:'#86868b' }}>{t('pickProduct')}</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:16 }}>
        {PLANNER_PRODUCTS.map(p=>{
          const on = selProduct?.id === p.id;
          // Ready = has product config, enabled, and prices reviewed (not placeholder)
          const pc = settings?.products?.[p.id];
          const ready = p.id === 'wardrobe' ? true : !!(pc && pc.enabled !== false && !pc.placeholder_prices);
          return (
            <div key={p.id} onClick={()=>setSelProduct({ id:p.id, name:p.name, ready })} style={{ cursor:'pointer', border: on?'2px solid #F97316':'0.5px solid #e6e6e6', borderRadius:16, overflow:'hidden', background:'#fff', textAlign:'left', position:'relative' }}>
              <div style={{ height:100, background:'#f5f5f7', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={on?'#F97316':'#86868b'} strokeWidth="1.5" aria-hidden="true"><path d={p.icon}/></svg>
                {on && <i className="ti ti-circle-check" style={{ position:'absolute', top:8, right:8, color:'#F97316', fontSize:20, background:'#fff', borderRadius:'50%' }} aria-hidden="true" />}
                {!ready && <span style={{ position:'absolute', top:8, left:8, fontSize:10, fontWeight:600, color:'#86868b', background:'#fff', padding:'2px 7px', borderRadius:6 }}>{t('quoteOnly')}</span>}
              </div>
              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:15, fontWeight:600 }}>{p.name}</div>
                <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{p.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
      {selProduct && !selProduct.ready && (
        <div style={{ maxWidth:520, margin:'24px auto 0', padding:'16px 20px', background:'#FAECE7', borderRadius:14, color:'#993C1D', textAlign:'center' }}>
          <div style={{ fontWeight:600, marginBottom:4 }}>{selProduct.name} — request a quote</div>
          <div style={{ fontSize:13, marginBottom:12 }}>Online design for {selProduct.name.toLowerCase()} is coming soon. Our team will design it with you.</div>
          <button type="button" className="btn" onClick={()=>setPage('contact')} style={{ borderRadius:12 }}>{t('requestQuote')}</button>
        </div>
      )}
      {selProduct && selProduct.ready && (
        <div style={{ textAlign:'center', marginTop:28 }}>
          <button type="button" className="btn" onClick={()=>setStage('ai')} style={{ borderRadius:14, minWidth:160 }}>Continue →</button>
        </div>
      )}
      <div style={{ textAlign:'center', marginTop:24 }}>
        <span onClick={()=>setPage('home')} style={{ cursor:'pointer', fontSize:13, color:'#aaa' }}>Close ✕</span>
      </div>
    </div>
  );

  // ── STAGE 2: AI STARTER ──
  if (stage === 'ai') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'96px 20px 80px' }}>
      <div style={{ maxWidth:560, width:'100%', background:'#f5f5f7', borderRadius:20, padding: mobile?20:28 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14 }}>
          <i className="ti ti-sparkles" style={{ fontSize:22, color:'#F97316' }} aria-hidden="true" />
          <span style={{ fontSize:17, fontWeight:600 }}>Describe your space — we'll design a starting point</span>
        </div>
        <textarea value={aiText} onChange={e=>setAiText(e.target.value)} placeholder="e.g. a walk-in closet for a master bedroom, warm oak, lots of shoes and hanging space, with soft lighting" rows={3} style={{ width:'100%', padding:'12px 14px', border:'0.5px solid #d0d0d0', borderRadius:12, fontSize:15, fontFamily:'inherit', resize:'vertical', marginBottom:12 }} />
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          {['Small bedroom, sliding doors, white','Walk-in, oak, lots of shoes','Modern L-shape kitchen, white, quartz'].map(chip=>(
            <button key={chip} type="button" onClick={()=>setAiText(chip)} style={{ fontSize:12, border:'0.5px solid #d0d0d0', borderRadius:16, padding:'6px 13px', background:'#fff', cursor:'pointer' }}>{chip}</button>
          ))}
        </div>
        {/* Room photo (vision) */}
        <label style={{ display:'flex', alignItems:'center', gap:12, background:'#fff', border:'0.5px dashed #c0c0c0', borderRadius:12, padding:'12px 14px', cursor:'pointer', marginBottom:16 }}>
          {aiImage
            ? <img src={aiImage.dataUrl} alt="room" style={{ width:54, height:42, objectFit:'cover', borderRadius:8 }} />
            : <i className="ti ti-camera" style={{ fontSize:22, color:'#F97316' }} aria-hidden="true" />}
          <span style={{ fontSize:14, color:'#1d1d1f', fontWeight:500 }}>{aiImage ? 'Photo added — tap to change' : 'Add a photo of your room (optional)'}</span>
          <input type="file" accept="image/*" onChange={e=>onAiPhoto(e.target.files?.[0])} style={{ display:'none' }} />
          {aiImage && <span onClick={e=>{ e.preventDefault(); setAiImage(null); }} style={{ marginLeft:'auto', color:'#aaa', fontSize:18 }}>×</span>}
        </label>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button type="button" className="btn" disabled={aiBusy || (!aiText.trim() && !aiImage)} onClick={runAI} style={{ borderRadius:12, opacity:(aiBusy||(!aiText.trim()&&!aiImage))?0.6:1 }}>{aiBusy ? 'Designing…' : 'Generate my design ✦'}</button>
          <button type="button" onClick={()=>setStage('config')} style={{ background:'none', border:'none', color:'#86868b', fontSize:14, cursor:'pointer' }}>or start from scratch →</button>
        </div>
        <div style={{ marginTop:18 }}><span onClick={()=>setStage('product')} style={{ cursor:'pointer', fontSize:13, color:'#aaa' }}>‹ Back</span></div>
      </div>
    </div>
  );

  // ── STAGE 3: SINGLE-SCREEN CONFIG ──
  const sizeW = layout === 'l-shape' ? (Number(dims.sideA)+Number(dims.sideB)) : dims.width;
  // status: 'done' (green check + chosenLabel), 'open' (orange), 'empty' (hollow)
  const renderSection = (id, title, children, status, chosenLabel) => {
    const isOpen = openSec === id;
    const st = isOpen ? 'open' : status;
    return (
      <div key={id} style={{ border: isOpen?'2px solid #F97316':'0.5px solid #e6e6e6', borderRadius:12, overflow:'hidden', flexShrink:0 }}>
        <div onClick={()=>setOpenSec(isOpen?'':id)} style={{ cursor:'pointer', padding:'0 15px', minHeight:50, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14, fontWeight:600, background:'#fff', lineHeight:1.2 }}>
          <span style={{ display:'flex', alignItems:'center', gap:9 }}>
            {st==='done' && <span style={{ width:22, height:22, borderRadius:'50%', background:'#1D9E75', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" /></span>}
            {st==='open' && <span style={{ width:22, height:22, borderRadius:'50%', border:'2px solid #F97316', flexShrink:0 }} />}
            {st==='empty' && <span style={{ width:22, height:22, borderRadius:'50%', border:'1.5px solid #d0d0d0', flexShrink:0 }} />}
            <span style={{ color: st==='empty'?'#86868b':'#1d1d1f' }}>{title}</span>
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!isOpen && chosenLabel && <span style={{ fontSize:12, color:'#86868b', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{chosenLabel}</span>}
            <i className={`ti ti-chevron-${isOpen?'down':'right'}`} style={{ color:'#aaa' }} aria-hidden="true" />
          </span>
        </div>
        {isOpen && <div style={{ padding:'4px 15px 16px' }}>{children}</div>}
      </div>
    );
  };

  return (
    <div style={{ minHeight:'100vh', paddingTop:80, paddingBottom:40 }}>
      <div style={{ maxWidth:1240, margin:'0 auto', padding:'0 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'12px 0 14px' }}>
          <span onClick={()=>setStage('product')} style={{ cursor:'pointer', fontSize:13, color:'#6e6e73' }}>‹ All products</span>
          <span style={{ fontSize:13, color:'#86868b' }}>{selProduct?.name || 'Wardrobe'}</span>
          <span onClick={()=>setPage('home')} style={{ cursor:'pointer', fontSize:13, color:'#aaa' }}>Close ✕</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.7fr 1fr', gap:14, alignItems:'stretch' }}>
          {/* BIG 3D STAGE */}
          <div style={{ background:'#f5f5f7', borderRadius:20, position:'relative', minHeight: mobile?340:560, overflow:'hidden' }}>
            <Wardrobe3D finishHex={finishHex} layout={layout} glass={hasGlass} handles={hasHandles} led={hasLed} mobile={mobile} tall product={prodKey} widthCm={layout==='l-shape' ? (Number(dims.sideA)+Number(dims.sideB)) : dims.width} heightCm={dims.height} depthCm={dims.depth} />
            {aiSummary && <div style={{ position:'absolute', top:12, left:12, right:12, fontSize:12, background:'#FAECE7', color:'#993C1D', padding:'8px 12px', borderRadius:12 }}><i className="ti ti-sparkles" aria-hidden="true" /> {aiSummary}</div>}
            <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:6, alignItems:'center', fontSize:11, color:'#86868b', background:'rgba(255,255,255,.85)', padding:'5px 10px', borderRadius:10 }}>
              <i className="ti ti-rotate-360" aria-hidden="true" /> {t('dragRotate')}
            </div>
            <div style={{ position:'absolute', bottom:12, left:12, display:'flex', gap:6, alignItems:'center', fontSize:12, color:'#6e6e73', background:'rgba(255,255,255,.85)', padding:'5px 10px', borderRadius:10 }}>
              <i className="ti ti-ruler-2" aria-hidden="true" />
              {layout==='l-shape' ? `${dims.sideA}+${dims.sideB} × ${dims.height} × ${dims.depth} cm` : `${dims.width} × ${dims.height} × ${dims.depth} cm`}
            </div>
          </div>

          {/* OPTIONS RAIL */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight: mobile?'none':560, overflowY: mobile?'visible':'auto', overflowX:'hidden', paddingRight:4 }}>
            {(() => {
              const allSecs = ['layout','door_finishes','size',...catKeys.filter(k=>k!=='door_finishes')];
              const done = 2 /* layout+finish always set */ + 1 /* size always set */ + catKeys.filter(k=>k!=='door_finishes' && catStatus(k)==='done').length;
              const totalSecs = allSecs.length;
              const pct = Math.round((done/totalSecs)*100);
              return (
                <div style={{ marginBottom:2 }}>
                  <div style={{ height:6, background:'#eee', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:pct+'%', height:'100%', background:'#F97316', borderRadius:3, transition:'width .3s' }} />
                  </div>
                  <div style={{ fontSize:12, color:'#aaa', marginTop:6 }}>{done} / {totalSecs} {t('sectionsDone')}</div>
                </div>
              );
            })()}
            {renderSection("layout", t("layout"), (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, paddingTop:8 }}>
                {(prodLayouts || LAYOUTS).map(l=>{
                  const on = layout===l.id;
                  return (
                    <button key={l.id} type="button" onClick={()=>setLayout(l.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border: on?'2px solid #F97316':'0.5px solid #e6e6e6', borderRadius:12, background: on?'#FFF7F2':'#fff', cursor:'pointer', textAlign:'left' }}>
                      {layoutIcon(l.id, on)}
                      <span style={{ fontSize:13, fontWeight:on?600:500, color:'#1d1d1f' }}>{l.label}{(l.price>0)&&<span style={{ display:'block', fontSize:11, color:'#993C1D', fontWeight:400 }}>+{fmt(l.price)}</span>}</span>
                    </button>
                  );
                })}
              </div>
            ), 'done', ((prodLayouts || LAYOUTS).find(l=>l.id===layout)||{}).label)}

            {renderSection("door_finishes", t("finish"), (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingTop:8 }}>
                {FINISHES.map(f=>(
                  <button key={f.id} type="button" onClick={()=>setFinishId(f.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:5, border: finishId===f.id?'2px solid #F97316':'0.5px solid #e6e6e6', borderRadius:8, background:'#fff', cursor:'pointer' }}>
                    <span style={{ width:34, height:34, borderRadius:5, background:f.hex, border:'0.5px solid rgba(0,0,0,.12)' }} />
                    <span style={{ fontSize:10, color:'#6e6e73' }}>{f.name}</span>
                  </button>
                ))}
              </div>
            ), 'done', (FINISHES.find(f=>f.id===finishId)||{}).name)}

            {renderSection("size", t("size"), (
              layout==='l-shape' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:8 }}>
                  {[['Side A','sideA'],['Side B','sideB'],['Height','height'],['Depth','depth']].map(([lbl,key])=>(
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:12, color:'#6e6e73', width:54 }}>{lbl}</span>
                      <input type="number" value={dims[key]} onChange={e=>setDims(c=>({...c,[key]:parseInt(e.target.value)||0}))} style={{ width:90, padding:'6px 8px', border:'0.5px solid #d0d0d0', borderRadius:6 }} /><span style={{ fontSize:12, color:'#aaa' }}>cm</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ paddingTop:8 }}>
                  {[['Width','width',120,400],['Height','height',180,300],['Depth','depth',40,80]].map(([lbl,key,min,max])=>(
                    <div key={key} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><span style={{ fontSize:12, color:'#6e6e73' }}>{lbl}</span><span style={{ fontSize:13, fontWeight:600, color:'#F97316' }}>{dims[key]}cm</span></div>
                      <input type="range" min={min} max={max} value={dims[key]} onChange={e=>setDims(c=>({...c,[key]:parseInt(e.target.value)}))} style={{ width:'100%', accentColor:'#F97316' }} />
                    </div>
                  ))}
                </div>
              )
            ), 'done', (layout==='l-shape' ? `${dims.sideA}+${dims.sideB}×${dims.height}` : `${dims.width}×${dims.height}×${dims.depth}cm`))}

            {catKeys.filter(k=>k!=='door_finishes').map(ck=>{
              const cat = cats[ck]; const multi = cat.select==='multi';
              return (
                renderSection(ck, (cat.label || ck), (
                  <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, paddingTop:8 }}>
                    {(cat.items||[]).filter(it=>it.active!==false).map(it=>{
                      const on = isOn(ck, it.id, multi);
                      const incl = it.price_type==='included' || +it.price===0;
                      return (
                        <div key={it.id} onClick={()=>pick(ck,it.id,multi)} style={{ cursor:'pointer', border: on?'2px solid #F97316':'0.5px solid #e6e6e6', borderRadius:10, overflow:'hidden', background:'#fff' }}>
                          <div style={{ height:72, background:cardBg(it), position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {!it.image_url && !it.swatch && <i className="ti ti-photo" style={{ fontSize:20, color:'rgba(0,0,0,.22)' }} aria-hidden="true" />}
                            {on && <span style={{ position:'absolute', top:6, right:6, width:22, height:22, borderRadius:'50%', background:'#F97316', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" /></span>}
                          </div>
                          <div style={{ padding:'8px 10px' }}>
                            <div style={{ fontSize:13, fontWeight:500, lineHeight:1.2 }}>{it.name}</div>
                            {it.type_label && <div style={{ fontSize:11, color:'#86868b', marginTop:2, lineHeight:1.3 }}>{it.type_label}</div>}
                            <div style={{ fontSize:12, color: incl?'#aaa':'#993C1D', marginTop:3 }}>{incl?'Included':'+ '+fmt(it.price)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const selId = sel[ck]; const chosen = (cat.items||[]).find(i => i.id === (Array.isArray(selId)?selId[0]:selId));
                    return chosen && chosen.notes ? <div style={{ fontSize:12, color:'#6e6e73', marginTop:10, padding:'9px 12px', background:'#f5f5f7', borderRadius:8, lineHeight:1.45 }}>{chosen.notes}</div> : null;
                  })()}
                  </>
                ), catStatus(ck), catChosen(ck))
              );
            })}

            {/* PRICE + CTA */}
            <div style={{ marginTop:6, background:'#fff', border:'0.5px solid #e6e6e6', borderRadius:14, padding:'14px 16px', position: mobile?'static':'sticky', bottom:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <span style={{ fontSize:12, color:'#86868b' }}>Estimated total · Standard</span>
                <span style={{ fontSize:22, fontWeight:700, color:'#F97316' }}>{pricing?'…':fmt(total)}</span>
              </div>
              {total>0 && !pricing && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#86868b', marginBottom:6 }}>Choose your package</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {[['Economy',0.72,'Quality essentials'],['Standard',1,'Most popular'],['Premium',1.45,'Premium finishes'],['Luxury',2.1,'Top-tier materials']].map(([name,mult,hl],i)=>(
                      <div key={name} style={{ border:'0.5px solid '+(i===1?'#F97316':'#e6e6e6'), background:i===1?'#FFF7EF':'#fff', borderRadius:10, padding:'8px 6px', textAlign:'center' }}>
                        <div style={{ fontSize:11, fontWeight:700, color:i===1?'#F97316':'#1d1d1f' }}>{name}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', marginTop:3 }}>{fmt(Math.round(total*mult))}</div>
                        <div style={{ fontSize:9, color:'#999', marginTop:2, lineHeight:1.2 }}>{hl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:'#aaa', marginTop:5 }}>Indicative ranges — your free design visit confirms an exact quote.</div>
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="btn-secondary" disabled={busy} onClick={save} style={{ flex:1, borderRadius:12, color: saved?'#1a7a40':'#6e6e73' }}>{saved?'✓ Saved':'Save'}</button>
                <button type="button" className="btn" disabled={busy} onClick={requestQuote} style={{ flex:2, borderRadius:12 }}>Get a quote →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    api(`product_configurations?customer_id=eq.${user.id}&order=created_at.desc&limit=20`).then(r => setDesigns(Array.isArray(r)?r:[])).catch(()=>{});
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
  const tabs = [['dashboard','Dashboard'],['card','My Card'],['svcbookings','Bookings'],['ledger','Ledger'],['orders','Orders'],['designs','Designs'],['rewards','Rewards'],['requests','Requests'],['support','Support'],['profile','Profile']];
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
    <div style={{ minHeight: '100vh', paddingTop: mobile ? 0 : 56, paddingBottom: mobile ? 80 : 0, background: '#f5f5f7' }}>
      {/* Mobile header */}
      {mobile && (
        <div style={{ background: '#fff', padding: '16px 16px 0', borderBottom: '1px solid #f5f5f7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(249,115,22,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#F97316' }}>{user.name?.[0]||'?'}</div>
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
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(249,115,22,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#F97316', marginBottom: 12 }}>{user.name?.[0]||'?'}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#86868b', marginBottom: 10 }}>{user.email}</div>
              <Pill label={`${user.tier||'Bronze'} · ${(user.points||0).toLocaleString()} pts`} color={tierC[user.tier||'Bronze']} bg={`${tierC[user.tier||'Bronze']}18`} />
            </div>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e6e6e6' }}>
              {tabs.map(([key, label]) => (
                <button type="button" key={key} onClick={() => setTab(key)} style={{ width: '100%', padding: '12px 18px', background: tab === key ? 'rgba(249,115,22,.08)' : 'transparent', border: 'none', borderBottom: '1px solid #f5f5f7', cursor: 'pointer', fontSize: 14, fontWeight: tab === key ? 500 : 400, color: tab === key ? '#F97316' : '#6e6e73', textAlign: 'left', transition: 'all .15s' }}>{label}</button>
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
                    <button type="button" onClick={()=>document.getElementById('cust-photo-input').click()} title="Change photo" style={{ position:'absolute', right:-2, bottom:-2, width:24, height:24, borderRadius:'50%', border:'2px solid #fff', background:'#F97316', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>✎</button>
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
              {[['Total Invested', fmt(totalSpent), '#F97316'], ['Active Orders', orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length, '#1d1d1f'], ['Points', (user.points||0).toLocaleString(), '#b8860b'], ['Designs', designs.length, '#1d1d1f']].map(([label,val,color])=>(
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
                  <span style={{ fontSize:14, fontWeight:700, color:'#F97316' }}>{pct}%</span>
                </div>
                <div style={{ background:'#f5f5f7', borderRadius:980, height:6, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#F97316,#ea6c0a)', borderRadius:980, transition:'width 1s ease' }} />
                </div>
                <div style={{ fontSize:12, color:'#86868b', marginTop:6 }}>{order.status||'In Progress'}</div>
              </div>;
            })}
            {mobile && <button type="button" onClick={() => { setUser(null); localStorage.removeItem('closets_user'); setPage('home'); }} style={{ width: '100%', background: 'transparent', border: '1.5px solid #fecaca', borderRadius: 14, padding: '13px', color: '#d93025', fontSize: 15, cursor: 'pointer', marginTop: 12 }}>Sign Out</button>}
          </>}

          {tab === 'ledger' && <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em' }}>Ledger</h2>
              <span style={{ fontSize:18, fontWeight:700, color:'#F97316' }}>{fmt(totalSpent)}</span>
            </div>
            {invoices.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'#86868b', background:'#fff', borderRadius:16, fontSize:14 }}>No invoices yet</div> : (
              <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', border:'1px solid #e6e6e6' }}>
                {invoices.map((inv,i)=>(
                  <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:i<invoices.length-1?'1px solid #f5f5f7':'none' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:'#F97316', marginBottom:2 }}>{inv.invoice_number||inv.id}</div>
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
              const col = /complet/.test(s)?'#16a34a' : /cancel|disput/.test(s)?'#dc2626' : /request/.test(s)?'#F97316' : '#3b82f6';
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
                <div style={{ textAlign:'right' }}><div style={{ fontSize:15, fontWeight:700, color:'#1d1d1f', marginBottom:6 }}>{fmt(o.total_amount||o.amount)}</div><Pill label={o.status||'Processing'} color="#F97316" bg="rgba(249,115,22,.1)" /></div>
              </div>
            ))}
          </>}

          {tab === 'designs' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>Saved Designs</h2>
            {designs.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'#86868b', background:'#fff', borderRadius:16, fontSize:14 }}>No saved designs yet</div> : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {designs.map(d=>(
                  <div key={d.id} style={{ background:'#fff', borderRadius:16, padding:18, border:'1px solid #e6e6e6' }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'#1d1d1f', marginBottom:8 }}>{d.product_name}</div>
                    {d.configuration&&typeof d.configuration==='object'&&Object.entries(d.configuration).filter(([k])=>!['interiors','width','height','depth'].includes(k)).slice(0,2).map(([k,v])=>(
                      <div key={k} style={{ fontSize:12, color:'#86868b', marginBottom:2 }}>{k}: <span style={{ color:'#1d1d1f' }}>{v}</span></div>
                    ))}
                    <div style={{ fontSize:16, fontWeight:700, color:'#F97316', marginTop:10 }}>{fmt(d.total_price)}</div>
                  </div>
                ))}
              </div>
            )}
          </>}

          {tab === 'rewards' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>Rewards</h2>
            <div style={{ background:'#fff', borderRadius:20, padding:24, marginBottom:14, border:'1px solid #e6e6e6' }}>
              <div style={{ fontSize:12, color:'#86868b', marginBottom:4 }}>Balance</div>
              <div style={{ fontSize:44, fontWeight:700, color:'#F97316', letterSpacing:'-.03em', marginBottom:4 }}>{(user.points||0).toLocaleString()}</div>
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
              <textarea className="inp" rows={3} placeholder="Describe your issue…" value={cmpForm.description} onChange={e=>setCmpForm(p=>({...p,description:e.target.value}))} style={{ marginBottom:12, resize:'vertical' }} />
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
              <input className="inp" placeholder="Subject" value={tktForm.subject} onChange={e=>setTktForm(p=>({...p,subject:e.target.value}))} style={{ marginBottom:10 }} />
              <textarea className="inp" rows={3} placeholder="Description…" value={tktForm.description} onChange={e=>setTktForm(p=>({...p,description:e.target.value}))} style={{ marginBottom:10, resize:'vertical' }} />
              <select className="inp" value={tktForm.priority} onChange={e=>setTktForm(p=>({...p,priority:e.target.value}))} style={{ marginBottom:12 }}>
                {['Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}
              </select>
              <button type="button" className="btn" onClick={submitTicket} style={{ borderRadius:12 }}>Submit Ticket</button>
            </div>
            {tickets.map(t=>(
              <div key={t.id} style={{ background:'#fff', borderRadius:14, padding:'14px 18px', border:'1px solid #e6e6e6', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, fontWeight:500, color:'#1d1d1f', marginBottom:2 }}>{t.subject}</div><div style={{ fontSize:12, color:'#86868b' }}>{t.id} · {t.priority}</div></div>
                <Pill label={t.status||'Open'} color="#F97316" bg="rgba(249,115,22,.1)" />
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
function AuthModal({ mode, setMode, setUser, onClose }) {
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'' });
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
          {mode==='register'&&<input className="inp" placeholder="Full name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />}
          <input className="inp" placeholder={t("email")} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} autoCapitalize="none" />
          {mode==='register'&&<input className="inp" placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />}
          <input className="inp" placeholder="Password" type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&submit()} />
          <button type="button" className="btn" onClick={submit} disabled={loading} style={{ borderRadius:14, opacity:loading?.7:1 }}>{loading?'Please wait…':mode==='login'?'Sign In':'Create Account'}</button>
        </div>)}
        {mode==='reset' && (<div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input className="inp" placeholder={t("email")} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} autoCapitalize="none" />
          {rstep==='request' && (<>
            <button type="button" className="btn" onClick={()=>reqReset('email')} disabled={loading} style={{ borderRadius:14 }}>📧 Email me a reset link</button>
            <button type="button" onClick={()=>reqReset('otp')} disabled={loading} style={{ borderRadius:14, padding:'12px', background:'#fff', color:'#F97316', border:'1px solid #F97316', fontWeight:600, cursor:'pointer' }}>📱 Text me a code</button>
          </>)}
          {rstep==='emailsent' && (<div style={{ fontSize:13, color:'#86868b', textAlign:'center' }}>Check your email for a reset link — it opens your account to set a new password.</div>)}
          {rstep==='otp' && (<>
            <input className="inp" placeholder="6-digit code" inputMode="numeric" value={rotp} onChange={e=>setRotp(e.target.value)} />
            <input className="inp" placeholder="New password (6+ characters)" type="password" value={rnew} onChange={e=>setRnew(e.target.value)} />
            <button type="button" className="btn" onClick={doResetOtp} disabled={loading} style={{ borderRadius:14 }}>Set new password</button>
          </>)}
        </div>)}
        <div style={{ textAlign:'center', marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
          {mode!=='reset' && <button type="button" onClick={()=>setMode(mode==='login'?'register':'login')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#F97316', fontWeight:500 }}>{mode==='login'?'New here? Register →':'Already have an account? Sign in →'}</button>}
          {mode==='login' && <button type="button" onClick={()=>{ setRstep('request'); setMode('reset'); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#86868b', fontWeight:500 }}>Forgot your password?</button>}
          {mode==='reset' && <button type="button" onClick={()=>{ setMode('login'); setRstep('request'); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#86868b', fontWeight:500 }}>← Back to sign in</button>}
        </div>
        {!mobile && <button type="button" onClick={onClose} style={{ position:'absolute', top:14, right:16, background:'#f5f5f7', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#86868b', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>}
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
    <div style={{ minHeight:'100vh', paddingTop: mobile ? 16 : 72, paddingBottom: mobile ? 80 : 0, background:'#fff' }}>
      <div style={{ maxWidth:860, margin:'0 auto', padding: mobile ? '24px 16px 60px' : '60px 40px 100px' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#F97316', marginBottom:12 }}>{t('ourStory')}</div>
        <h1 style={{ fontSize: mobile ? 36 : 64, fontWeight:700, letterSpacing:'-.04em', color:'#1d1d1f', lineHeight:1.05, marginBottom:32 }}>{t('precision')}<br />{t('permanence')}</h1>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: mobile ? 16 : 40, marginBottom:48 }}>
          <p style={{ fontSize:16, lineHeight:1.8, color:'#6e6e73' }}>{t('aboutP1')}</p>
          <p style={{ fontSize:16, lineHeight:1.8, color:'#6e6e73' }}>{t('aboutP2')}</p>
        </div>
        {[['2010','Founded in Manama, Bahrain'],['2013','First flagship showroom'],['2016','Bespoke configurator launched'],['2019','Expanded to four locations'],['2022','500+ projects completed'],['2024','Digital hub launched']].map(([year,event],i)=>(
          <div key={year} className="reveal" style={{ transitionDelay:`${i*.07}s`, display:'flex', gap:28, padding:'18px 0', borderBottom:'1px solid #f5f5f7', alignItems:'center' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#F97316', minWidth:40 }}>{year}</span>
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
  const theme = { corporate:'#F97316', executive:'#D4AF37', vendor:'#22C55E', vip:'#A855F7' }[c.theme] || '#F97316';
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
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, trade or location…"
        style={{ width:'100%', maxWidth:520, padding:'13px 18px', borderRadius:980, border:'1px solid #ececec', fontSize:15, marginBottom:16, fontFamily:'inherit' }}/>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {tabs.map(([id,label]) => (
          <button type="button" key={id||'all'} onClick={()=>setType(id)} style={{ padding:'8px 16px', borderRadius:980, border:'1px solid #ececec', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background: type===id ? '#F97316' : '#fff', color: type===id ? '#fff' : '#1d1d1f' }}>{label}</button>
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
  const [team, setTeam] = useState([]);
  useEffect(() => {
    cardRpc('card_directory', { p_type:'employee', p_search:null, p_limit:12 })
      .then(r => setTeam(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);
  const mobile = useMobile();
  const { t } = useI18n();
  const submit = async () => {
    if (!form.name||!form.email) { toast('Name and email required', 'error'); return; }
    // Route through the audited public_lead_submit RPC (validates, writes lead, queues team notification)
    await api('rpc/public_lead_submit', { method:'POST', body:{
      p_name: form.name, p_phone: form.phone || null, p_email: form.email || null,
      p_source: 'Website - Contact', p_interest: form.product || null,
      p_message: form.message || null, p_budget: form.budget ? Number(form.budget) : null,
      p_meta: { page: 'contact' }
    }});
    setSent(true); toast('Message sent ✓', 'success');
  };
  return (
    <div style={{ minHeight:'100vh', paddingTop: mobile ? 16 : 72, paddingBottom: mobile ? 80 : 0, background:'#fff' }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding: mobile ? '24px 16px' : '60px 40px 100px', display: mobile ? 'block' : 'grid', gridTemplateColumns:'1fr 1fr', gap:80 }}>
        <div style={{ marginBottom: mobile ? 32 : 0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#F97316', marginBottom:12 }}>{t('contact')}</div>
          <h1 style={{ fontSize: mobile ? 32 : 52, fontWeight:700, letterSpacing:'-.04em', color:'#1d1d1f', marginBottom:16, lineHeight:1.05 }}>{t('startProject')}</h1>
          <p style={{ fontSize:16, color:'#6e6e73', lineHeight:1.7, marginBottom:28 }}>Book a free home visit — no obligation.</p>
          {[['📍','Showrooms','Manama · Riffa · Saar · Isa Town'],['📞','Phone','+973 1700 0000'],['✉️','Email','hello@theclosets.co'],['⏰','Hours','Sat–Thu 9am–8pm']].map(([icon,label,val])=>(
            <div key={label} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:'1px solid #f5f5f7' }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <div><div style={{ fontSize:11, fontWeight:500, color:'#86868b', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:2 }}>{label}</div><div style={{ fontSize:14, color:'#1d1d1f' }}>{val}</div></div>
            </div>
          ))}
        </div>
        {sent ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding: mobile ? '40px 0' : 0 }}>
            <div>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(26,122,64,.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28 }}>✓</div>
              <h3 style={{ fontSize:22, fontWeight:700, color:'#1d1d1f', marginBottom:8 }}>{t('msgReceived')}</h3>
              <p style={{ color:'#86868b', fontSize:15 }}>We'll be in touch within 24 hours.</p>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <input className="inp" placeholder={t("yourName")} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
            <input className="inp" placeholder="Email" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} />
            <input className="inp" placeholder={t("phone")} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
            <select className="inp" value={form.product} onChange={e=>setForm(p=>({...p,product:e.target.value}))}>
              <option value="">Interested in…</option>
              {['Walk-In Wardrobe','Sliding Door','Hinged Door','Kitchen','Office','Kids Room'].map(o=><option key={o}>{o}</option>)}
            </select>
            <select className="inp" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))}>
              <option value="">{t('budgetRange')}</option>
              {['BD 200–500','BD 500–1,000','BD 1,000–2,500','BD 2,500–5,000','BD 5,000+'].map(o=><option key={o}>{o}</option>)}
            </select>
            <textarea className="inp" rows={4} placeholder={t("tellProject")} value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} style={{ resize:'vertical' }} />
            <button type="button" className="btn" onClick={submit} style={{ borderRadius:14 }}>{t('sendMessage')}</button>
          </div>
        )}
      </div>
      {team.length > 0 && (
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 40px 100px' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#F97316', marginBottom:8 }}>Our team</div>
          <div style={{ fontSize:24, fontWeight:600, color:'#1d1d1f', marginBottom:24 }}>Save a specialist's card</div>
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
    <div style={{ minHeight:'100vh', paddingTop: mobile ? 0 : 56, paddingBottom: mobile ? 80 : 0, background:'#f5f5f7' }}>
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
                <span style={{ fontSize:20, fontWeight:700, color:'#F97316' }}>{fmt(total)}</span>
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
                    <button type="button" key={p} onClick={()=>{ setForm(f=>({...f,payment:p})); setMonths(0); }} style={{ flex:1, padding:'12px 8px', borderRadius:12, border:`1.5px solid ${form.payment===p&&months===0?'#F97316':'#e6e6e6'}`, background:form.payment===p&&months===0?'rgba(249,115,22,.08)':'#fff', color:form.payment===p&&months===0?'#F97316':'#6e6e73', fontSize:13, cursor:'pointer', fontWeight:form.payment===p&&months===0?500:400, transition:'all .15s' }}>{p}</button>
                  ))}
                </div>
                {instEnabled && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', marginBottom:8 }}>Or split into monthly installments</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {plans.map(m=>(
                        <button type="button" key={m} onClick={()=>setMonths(months===m?0:m)} style={{ padding:'10px 14px', borderRadius:12, border:`1.5px solid ${months===m?'#F97316':'#e6e6e6'}`, background:months===m?'rgba(249,115,22,.08)':'#fff', cursor:'pointer', textAlign:'left' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:months===m?'#F97316':'#1d1d1f' }}>{m} months</div>
                          <div style={{ fontSize:12, color:'#86868b' }}>BHD {(total/m).toFixed(2)}/mo</div>
                        </button>
                      ))}
                    </div>
                    {months>0 && <div style={{ marginTop:10, fontSize:13, color:'#16a34a', fontWeight:600 }}>✓ {months} payments of BHD {monthly.toFixed(2)} — our team will confirm the plan with you.</div>}
                  </div>
                )}
                <textarea className="inp" rows={3} placeholder="Notes…" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{ resize:'vertical', marginBottom:16 }} />
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
        <button type="button" onClick={()=>setPage('ai')} style={{ background:'#F97316', color:'#fff', border:'none', borderRadius:980, padding:'13px 26px', fontSize:15, fontWeight:600, cursor:'pointer' }}>Try the AI Designer ✦</button>
      </div>
    </section>
    {offers.length>0 && (
      <section style={{ padding:`28px ${P} 0`, maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:12 }}>
          {offers.map(o=>(<button type="button" key={o.id} onClick={()=>setPage('offers')} className="reveal" style={{ textAlign:'left', background:'#FFF7EF', border:'1px solid #F9731622', borderRadius:16, padding:'16px 18px', cursor:'pointer' }}>
            {o.badge && <span style={{ fontSize:11, fontWeight:700, color:'#F97316' }}>{o.badge}</span>}
            <div style={{ fontSize:15, fontWeight:700, color:'#1d1d1f', marginTop:4 }}>{o.title}</div>
            <div style={{ fontSize:13, color:'#86868b', marginTop:3 }}>{o.subtitle}</div>
          </button>))}
        </div>
      </section>
    )}
  </>);
}
function HomePage({ products, testimonials, banners, siteLogo, setPage, addToCart, setConfigProduct }) {
  const { t } = useI18n();
  const mobile = useMobile();
  useReveal();
  const featured = products.filter(p => p.active !== false).slice(0, mobile ? 4 : 6);
  const P = mobile ? '16px' : '40px';
  return (
    <div style={{ background:'#fff' }}>
      <Hero setPage={setPage} banners={banners} />
      <HomeAIOffers setPage={setPage} mobile={mobile} P={P} />
      {/* Collections */}
      <section style={{ padding:`72px ${P}`, maxWidth:1200, margin:'0 auto' }}>
        <div className="reveal" style={{ marginBottom:28 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#F97316', marginBottom:8 }}>{t('collections')}</div>
          <h2 style={{ fontSize: mobile ? 26 : 40, fontWeight:700, letterSpacing:'-.03em', color:'#1d1d1f' }}>{t('designedEvery')}</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: mobile ? 10 : 14 }}>
          {[['Walk-In','Private dressing room','🚪'],['Sliding','Space-smart elegance','⬛'],['Kitchen','Precision cabinetry','🍽️'],['Office','Focus-built storage','💼']].map(([name,desc,icon],i)=>(
            <button type="button" key={name} className="reveal" onClick={()=>setPage('products')} style={{ transitionDelay:`${i*.08}s`, background:i===0?'#1d1d1f':'#f5f5f7', border:'none', borderRadius:18, padding: mobile ? '22px 16px' : '28px 22px', textAlign:'left', cursor:'pointer', minHeight: mobile ? 140 : 180 }}>
              <div style={{ fontSize: mobile ? 24 : 28, marginBottom:10 }}>{icon}</div>
              <div style={{ fontSize: mobile ? 15 : 17, fontWeight:700, color:i===0?'#fff':'#1d1d1f', marginBottom:4 }}>{name}</div>
              <div style={{ fontSize: mobile ? 11 : 13, color:i===0?'rgba(255,255,255,.5)':'#86868b', lineHeight:1.5 }}>{desc}</div>
              <div style={{ fontSize:12, color:'#F97316', marginTop:12, fontWeight:600 }}>→</div>
            </button>
          ))}
        </div>
      </section>
      {/* Featured */}
      {featured.length > 0 && (
        <section style={{ padding:`0 ${P} 72px`, maxWidth:1200, margin:'0 auto' }}>
          <div className="reveal" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:'#F97316', marginBottom:8 }}>{t('featured')}</div>
              <h2 style={{ fontSize: mobile ? 24 : 38, fontWeight:700, letterSpacing:'-.03em', color:'#1d1d1f' }}>{t('currentColl')}</h2>
            </div>
            <button type="button" className="btn-secondary" onClick={()=>setPage('products')} style={{ borderRadius:980, fontSize:13, minHeight:36, padding:'8px 16px' }}>{t('viewAll')}</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 10 : 18 }}>
            {featured.map(p => <ProductCard key={p.id} product={p} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />)}
          </div>
        </section>
      )}
      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section style={{ padding:`72px ${P}`, background:'#f5f5f7' }}>
          <div style={{ maxWidth:1200, margin:'0 auto' }}>
            <div className="reveal" style={{ marginBottom:28 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#F97316', marginBottom:8 }}>{t('clients')}</div>
              <h2 style={{ fontSize: mobile ? 24 : 38, fontWeight:700, letterSpacing:'-.03em', color:'#1d1d1f' }}>{t('whatPeopleSay')}</h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 18 }}>
              {testimonials.slice(0,mobile?2:3).map((t,i)=>(
                <div key={t.id} className="card reveal" style={{ transitionDelay:`${i*.1}s`, padding: mobile ? 20 : 26 }}>
                  <div style={{ display:'flex', gap:2, marginBottom:12 }}>{Array.from({length:t.rating||5}).map((_,j)=><span key={j} style={{ color:'#F97316', fontSize:14 }}>★</span>)}</div>
                  <p style={{ fontSize:15, color:'#3d3d3f', lineHeight:1.7, marginBottom:20 }}>"{t.text}"</p>
                  <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:16, borderTop:'1px solid #f5f5f7' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(249,115,22,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#F97316', overflow:'hidden', flexShrink:0 }}>
                      {t.image_url?<img src={t.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />:t.name?.[0]}
                    </div>
                    <div><div style={{ fontSize:14, fontWeight:600, color:'#1d1d1f' }}>{t.name}</div><div style={{ fontSize:12, color:'#86868b' }}>{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* CTA */}
      <section style={{ padding:`80px ${P}`, textAlign:'center' }}>
        <div className="reveal" style={{ maxWidth:540, margin:'0 auto' }}>
          <h2 style={{ fontSize: mobile ? 28 : 52, fontWeight:700, letterSpacing:'-.04em', color:'#1d1d1f', marginBottom:14, lineHeight:1.1 }}>{t('readyTransform')}</h2>
          <p style={{ fontSize: mobile ? 15 : 17, color:'#6e6e73', marginBottom:28, lineHeight:1.7 }}>Book a free home consultation — no obligation.</p>
          <button type="button" className="btn" onClick={()=>setPage('contact')} style={{ fontSize:16, padding:'15px 32px', borderRadius:16 }}>{t('bookConsult')}</button>
        </div>
      </section>
      {/* Footer rendered globally in App */}
      {/* Bottom spacer on mobile */}
      {mobile && <div style={{ height:80 }} />}
    </div>
  );
}

/* ── APP ── */
// ── CMS-driven pages (read from Bonsai Hub tables) ──────────────────
function PageWrap({ title, sub, children }) {
  const mobile = useMobile();
  return (<div style={{ minHeight:'100vh', paddingTop: mobile?80:96, paddingBottom:80, background:'#fff' }}>
    <div style={{ maxWidth:1100, margin:'0 auto', padding: mobile?'0 16px':'0 24px' }}>
      <h1 style={{ fontSize: mobile?30:40, fontWeight:700, color:'#1d1d1f', letterSpacing:'-.02em' }}>{title}</h1>
      {sub && <p style={{ fontSize:17, color:'#86868b', marginTop:8, marginBottom:36 }}>{sub}</p>}
      {children}
    </div>
  </div>);
}
function ShowroomsPage() {
  const [rows,setRows]=useState([]);
  // Single source of truth: same content the Hub manages & the app shows.
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'showroom'}}).then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap title="Visit a showroom" sub="Experience our craftsmanship in person across Bahrain.">
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
      {rows.map(s=>{ const m=s.meta||{}; return (<div key={s.id} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        {s.image_url ? <div style={{ height:140, background:`url('${s.image_url}') center/cover` }} /> : <div style={{ height:80, background:'#FFF1E8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34 }}>🏛</div>}
        <div style={{ padding:22 }}>
          <div style={{ fontSize:18, fontWeight:600, color:'#1d1d1f' }}>{s.title}</div>
          <div style={{ fontSize:14, color:'#86868b', marginTop:6, lineHeight:1.6 }}>{m.address||s.subtitle}</div>
          {(m.hours)&&<div style={{ fontSize:13, color:'#86868b', marginTop:8 }}>🕑 {m.hours}</div>}
          {(m.phone)&&<a href={'tel:'+m.phone} style={{ display:'inline-block', marginTop:12, color:'#F97316', fontWeight:600, fontSize:14, textDecoration:'none' }}>{m.phone}</a>}
        </div>
      </div>); })}
      {rows.length===0 && <div style={{ color:'#aaa' }}>Showroom details coming soon.</div>}
    </div>
  </PageWrap>);
}
function BlogPage() {
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'inspiration'}}).then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap title="Inspiration & guides" sub="Ideas, tips and trends for kitchens, wardrobes and storage.">
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20 }}>
      {rows.map(b=>(<div key={b.id} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ height:130, background: b.image_url?`url('${b.image_url}') center/cover`:'linear-gradient(135deg,#FFF1E8,#F5F5F7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:44 }}>{!b.image_url && '📖'}</div>
        <div style={{ padding:20 }}>
          {b.subtitle && <div style={{ fontSize:12, color:'#F97316', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>{b.subtitle}</div>}
          <div style={{ fontSize:17, fontWeight:600, color:'#1d1d1f', marginTop:6 }}>{b.title}</div>
          <div style={{ fontSize:14, color:'#86868b', marginTop:8, lineHeight:1.6 }}>{b.body}</div>
        </div>
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>Articles coming soon.</div>}
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
          <button type="button" onClick={()=>setOpenId(openId===j.id?null:j.id)} style={{ background:'#F97316', color:'#fff', border:'none', borderRadius:980, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{openId===j.id?'Close':'Apply'}</button>
        </div>
        {j.description && <div style={{ fontSize:14, color:'#555', marginTop:12, lineHeight:1.6 }}>{j.description}</div>}
        {j.requirements && <div style={{ fontSize:13, color:'#86868b', marginTop:8, lineHeight:1.6 }}><strong>Requirements:</strong> {j.requirements}</div>}
        {openId===j.id && (sentFor===j.id
          ? <div style={{ marginTop:16, color:'#1D7A4D', fontWeight:600 }}>Thank you — we&#39;ll be in touch.</div>
          : <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input placeholder="Full name *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={inp} />
              <input placeholder="Phone *" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} style={inp} />
              <input placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} style={inp} />
              <input placeholder="Note (optional)" value={f.note} onChange={e=>setF({...f,note:e.target.value})} style={inp} />
              <button type="button" onClick={()=>apply(j)} style={{ gridColumn:'1 / -1', background:'#1d1d1f', color:'#fff', border:'none', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Submit application</button>
            </div>)}
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>No open roles right now — check back soon.</div>}
    </div>
  </PageWrap>);
}
const inp = { background:'#f5f5f7', border:'1px solid #e5e5e7', borderRadius:12, padding:'11px 14px', fontSize:14, color:'#1d1d1f', width:'100%' };

function OffersPage({ setPage }) {
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('store_offers?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap title="Offers & promotions" sub="Current savings on bespoke kitchens, wardrobes and storage.">
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
      {rows.map(o=>(<div key={o.id} style={{ background:'linear-gradient(135deg,#FFF7EF,#fff)', border:'1px solid #F9731633', borderRadius:18, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        {o.badge && <span style={{ display:'inline-block', background:'#F97316', color:'#fff', fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:980 }}>{o.badge}</span>}
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
          <span>{q.question}</span><span style={{ color:'#F97316', flexShrink:0 }}>{open===q.id?'–':'+'}</span>
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
    <div style={{ paddingTop: 96, paddingBottom: 80, maxWidth: 1100, margin: '0 auto', padding: '96px 24px 80px' }}>
      <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-.03em', marginBottom: 6 }}>Book a Service</h1>
      <p style={{ color: '#86868b', fontSize: 17, marginBottom: 34 }}>Carpentry, repairs, cleaning, AC & more — scheduled or ASAP. {user ? '' : 'Sign in to book.'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 18 }}>
        {cats.map(c => (
          <div key={c.id} onClick={() => open(c)} style={{ background: '#fff', border: '1px solid #ececec', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ height: 120, background: c.image_url ? `center/cover url(${c.image_url})` : '#FFF4EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{c.image_url ? '' : '🛠️'}</div>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{c.name_en}</div>
              <div style={{ color: '#86868b', fontSize: 13, marginTop: 4 }}>{price(c)} · ⏱ ~{c.est_minutes}m{Number(c.points) > 0 ? ' · ★ ' + c.points + ' pts' : ''}</div>
              {Number(c.discount_pct) > 0 && <span style={{ display: 'inline-block', marginTop: 8, background: '#FEE2E2', color: '#dc2626', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>-{c.discount_pct}%</span>}
              {Number(c.warranty_months) > 0 && <span style={{ display: 'inline-block', marginTop: 8, marginLeft: 6, background: '#DCFCE7', color: '#16a34a', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{c.warranty_months}-mo warranty</span>}
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div onClick={() => setSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 18 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, maxWidth: 460, width: '100%', padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{sel.name_en}</h2>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#86868b' }}>✕</button>
            </div>
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 44 }}>✅</div>
                <p style={{ fontWeight: 600, fontSize: 18, marginTop: 8 }}>Request sent!</p>
                <p style={{ color: '#86868b', fontSize: 14 }}>We've sent it to available providers. Track it in your account.</p>
                <button className="btn" onClick={() => { setSel(null); setPage('portal'); }} style={{ marginTop: 14, borderRadius: 12 }}>Go to my account</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                  {[['scheduled', 'Schedule'], ['on_demand', 'ASAP']].map(([m, l]) => (
                    <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#F97316' : '#86868b' }}>{l}</button>
                  ))}
                </div>
                {mode === 'scheduled' && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #ddd', fontSize: 15 }} />
                    <select value={slot} onChange={e => setSlot(e.target.value)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #ddd', fontSize: 15 }}>
                      {(sel.slots || ['Morning', 'Afternoon', 'Evening']).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area (e.g. Riffa)" style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd', fontSize: 15, marginBottom: 10 }} />
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address / building, road, block" style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd', fontSize: 15, marginBottom: 10 }} />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What do you need? Describe the job…" rows={3} style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #ddd', fontSize: 15, marginBottom: 14, resize: 'vertical' }} />
                <button className="btn" disabled={busy} onClick={submit} style={{ width: '100%', borderRadius: 12 }}>{busy ? 'Sending…' : 'Send request'}</button>
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
  if(sent) return (<PageWrap title="Thank you"><div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:32, maxWidth:560 }}><div style={{ fontSize:40 }}>✅</div><div style={{ fontSize:20, fontWeight:600, color:'#1d1d1f', marginTop:12 }}>Your {f.type.toLowerCase()} is requested.</div><div style={{ fontSize:15, color:'#86868b', marginTop:8 }}>Our design team will call you to confirm the time. No obligation, completely free.</div><button type="button" onClick={()=>setPage('home')} style={{ marginTop:20, background:'#F97316', color:'#fff', border:'none', borderRadius:980, padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Back to home</button></div></PageWrap>);
  return (<PageWrap title="Book your free visit" sub="A designer measures your space and creates a bespoke 2D & 3D concept — free, with no obligation.">
    <div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding: mobile?20:28, maxWidth:720, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize:12, color:'#86868b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Appointment type</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
        {APPT_KINDS.map(k=>(<button type="button" key={k} onClick={()=>set('type',k)} style={{ padding:'9px 15px', borderRadius:980, cursor:'pointer', fontSize:13, fontWeight:600, background:f.type===k?'#F97316':'#f5f5f7', color:f.type===k?'#fff':'#1d1d1f', border:'none' }}>{k}</button>))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:12 }}>
        <input placeholder="Full name *" value={f.name} onChange={e=>set('name',e.target.value)} style={inp} />
        <input placeholder="Phone *" value={f.phone} onChange={e=>set('phone',e.target.value)} style={inp} />
        <input placeholder="Email" value={f.email} onChange={e=>set('email',e.target.value)} style={inp} />
        <select value={f.interest} onChange={e=>set('interest',e.target.value)} style={inp}>{['Kitchen','Wardrobe','Walk-In Closet','TV Unit','Doors','Storage','Other'].map(x=><option key={x}>{x}</option>)}</select>
        <input type="date" value={f.date} onChange={e=>set('date',e.target.value)} style={inp} />
        <select value={f.slot} onChange={e=>set('slot',e.target.value)} style={inp}>{APPT_SLOTS.map(x=><option key={x}>{x}</option>)}</select>
        <input placeholder="Address (for home/site visit)" value={f.address} onChange={e=>set('address',e.target.value)} style={{...inp, gridColumn: mobile?'auto':'1 / -1'}} />
        <textarea placeholder="Notes (optional)" rows={3} value={f.notes} onChange={e=>set('notes',e.target.value)} style={{...inp, gridColumn: mobile?'auto':'1 / -1', resize:'vertical'}} />
      </div>
      <button type="button" disabled={busy} onClick={submit} style={{ marginTop:18, width:'100%', background:'#F97316', color:'#fff', border:'none', borderRadius:14, padding:'14px', fontSize:15, fontWeight:600, cursor:'pointer', opacity:busy?.6:1 }}>{busy?'Submitting…':'Request my free visit'}</button>
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
        <input placeholder="Full name *" value={f.name} onChange={e=>set('name',e.target.value)} style={inp} />
        <input placeholder="Phone *" value={f.phone} onChange={e=>set('phone',e.target.value)} style={inp} />
        <input placeholder="Email" value={f.email} onChange={e=>set('email',e.target.value)} style={inp} />
        <input placeholder={refLabel+' (optional)'} value={f.ref} onChange={e=>set('ref',e.target.value)} style={inp} />
        <textarea placeholder="Describe the issue / request" rows={4} value={f.message} onChange={e=>set('message',e.target.value)} style={{...inp, gridColumn: mobile?'auto':'1 / -1', resize:'vertical'}} />
      </div>
      <button type="button" disabled={busy} onClick={submit} style={{ marginTop:18, width:'100%', background:'#F97316', color:'#fff', border:'none', borderRadius:14, padding:'14px', fontSize:15, fontWeight:600, cursor:'pointer', opacity:busy?.6:1 }}>{busy?'Submitting…':'Submit request'}</button>
    </div>
  </PageWrap>);
}
function AIDesignerPage({ setPage, user }) {
  const mobile=useMobile();
  const [f,setF]=useState({ requirements:'', product:'', w:'', h:'', d:'', budget:'' });
  const [image,setImage]=useState(null); const [busy,setBusy]=useState(false); const [concept,setConcept]=useState(null); const [saved,setSaved]=useState(false);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const saveConcept=async()=>{
    if(!user){ toast('Sign in to save this concept to your account','info'); setPage('portal'); return; }
    try{
      const id='AIC-'+Date.now().toString(36).toUpperCase();
      await api('product_configurations',{method:'POST',body:[{ id, customer_id:user.id, customer_name:user.name, customer_email:user.email, product_name:'AI concept — '+concept.title, configuration:concept, total_price:concept.estimate_bhd, status:'ai-concept', share_token:id, created_at:new Date().toISOString() }]});
      setSaved(true); toast('Saved to your account ✓','success');
    }catch{ toast('Could not save right now','error'); }
  };
  const onPhoto=(file)=>{ if(!file) return; const rd=new FileReader(); rd.onload=()=>{ const im=new Image(); im.onload=()=>{ const max=1024; let{width:w,height:h}=im; if(w>h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>max){w=Math.round(w*max/h);h=max;} const c=document.createElement('canvas'); c.width=w;c.height=h; c.getContext('2d').drawImage(im,0,0,w,h); const u=c.toDataURL('image/jpeg',0.72); setImage({ dataUrl:u, media_type:'image/jpeg', base64:u.split(',')[1] }); }; im.src=rd.result; }; rd.readAsDataURL(file); };
  const generate=async()=>{
    if(!f.requirements.trim() && !image){ toast('Describe your space or add a photo','error'); return; }
    setBusy(true); setConcept(null);
    try{
      const r=await fetch(SUPA_URL+'/functions/v1/ai_design_concept',{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({ requirements:f.requirements, product:f.product||undefined, budget:f.budget?Number(f.budget):undefined, dimensions:{ width_cm:f.w?Number(f.w):undefined, height_cm:f.h?Number(f.h):undefined, depth_cm:f.d?Number(f.d):undefined }, image_base64:image?.base64, media_type:image?.media_type })});
      const d=await r.json();
      if(d.ok&&d.concept){ setConcept(d.concept); setSaved(false); } else { toast('Could not generate — try adding more detail','error'); }
    }catch{ toast('AI is unavailable right now','error'); } finally{ setBusy(false); }
  };
  const chip=(t)=>(<span style={{ background:'#FFF3E9', color:'#9a4d12', borderRadius:980, padding:'6px 12px', fontSize:13, fontWeight:500 }}>{t}</span>);
  return (<PageWrap title="AI Interior Designer" sub="Describe your space or upload a photo — get a tailored concept with materials, storage ideas and indicative pricing in seconds.">
    <div className="resp-2col" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'420px 1fr', gap:28, alignItems:'start' }}>
      {/* Intake */}
      <div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:22, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <textarea value={f.requirements} onChange={e=>set('requirements',e.target.value)} rows={4} placeholder="e.g. A walk-in closet for a master bedroom, warm oak, lots of shoe and hanging space, soft lighting, island in the middle" style={{...inp, resize:'vertical', marginBottom:12}} />
        <label style={{ display:'flex', alignItems:'center', gap:12, border:'0.5px dashed #c0c0c0', borderRadius:12, padding:'12px 14px', cursor:'pointer', marginBottom:12 }}>
          {image ? <img src={image.dataUrl} alt="room" style={{ width:54, height:42, objectFit:'cover', borderRadius:8 }} /> : <i className="ti ti-camera" style={{ fontSize:22, color:'#F97316' }} aria-hidden="true" />}
          <span style={{ fontSize:14, fontWeight:500 }}>{image?'Photo added — tap to change':'Add a room photo (optional)'}</span>
          <input type="file" accept="image/*" onChange={e=>onPhoto(e.target.files?.[0])} style={{ display:'none' }} />
        </label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <select value={f.product} onChange={e=>set('product',e.target.value)} style={inp}><option value="">Any product</option>{[['wardrobe','Wardrobe'],['kitchen','Kitchen'],['walkin','Walk-In Closet'],['tv','TV Unit'],['doors','Doors'],['storage','Storage / Office']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          <input value={f.budget} onChange={e=>set('budget',e.target.value)} placeholder="Budget (BHD)" inputMode="numeric" style={inp} />
          <input value={f.w} onChange={e=>set('w',e.target.value)} placeholder="Width cm" inputMode="numeric" style={inp} />
          <input value={f.h} onChange={e=>set('h',e.target.value)} placeholder="Height cm" inputMode="numeric" style={inp} />
        </div>
        <button type="button" disabled={busy} onClick={generate} style={{ width:'100%', background:'#F97316', color:'#fff', border:'none', borderRadius:14, padding:'14px', fontSize:15, fontWeight:600, cursor:'pointer', opacity:busy?.6:1 }}>{busy?'Designing your concept…':'Generate my concept ✦'}</button>
      </div>
      {/* Result */}
      <div>
        {!concept && !busy && <div style={{ color:'#aaa', fontSize:15, padding:'30px 0' }}>Your AI concept — layout, materials, colours, storage ideas and four package options — will appear here.</div>}
        {busy && <div style={{ color:'#86868b', fontSize:15, padding:'30px 0' }}>✦ Reading your brief and composing a concept…</div>}
        {concept && (<div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding: mobile?20:28, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
          <div style={{ fontSize:12, color:'#F97316', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>AI concept</div>
          <h2 style={{ fontSize:24, fontWeight:700, color:'#1d1d1f', margin:'6px 0 4px' }}>{concept.title}</h2>
          <div style={{ fontSize:13, color:'#86868b' }}>{concept.product} · {concept.layout} · {concept.finish_id} finish · {concept.width_cm}×{concept.height_cm}cm</div>
          <p style={{ fontSize:15, color:'#444', lineHeight:1.65, marginTop:12 }}>{concept.summary}</p>
          {concept.materials?.length>0 && <><div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', marginTop:16, marginBottom:8 }}>MATERIALS</div><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{concept.materials.map((m,i)=><span key={i}>{chip(m)}</span>)}</div></>}
          {concept.colors?.length>0 && <><div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', marginTop:16, marginBottom:8 }}>COLOURS</div><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{concept.colors.map((m,i)=><span key={i}>{chip(m)}</span>)}</div></>}
          {concept.storage_ideas?.length>0 && <><div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', marginTop:16, marginBottom:8 }}>STORAGE IDEAS</div><ul style={{ margin:0, paddingLeft:18, color:'#444', fontSize:14, lineHeight:1.7 }}>{concept.storage_ideas.map((m,i)=><li key={i}>{m}</li>)}</ul></>}
          <div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', marginTop:18, marginBottom:8 }}>PACKAGES (indicative)</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {(concept.packages||[]).map((p,i)=>(<div key={p.tier} style={{ border:'0.5px solid '+(i===1?'#F97316':'#e6e6e6'), background:i===1?'#FFF7EF':'#fff', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:i===1?'#F97316':'#1d1d1f' }}>{p.tier}{i===1?' · recommended':''}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'#1d1d1f', marginTop:3 }}>BD {p.price_from.toLocaleString()}–{p.price_to.toLocaleString()}</div>
              <div style={{ fontSize:11, color:'#86868b', marginTop:4, lineHeight:1.4 }}>{p.includes}</div>
            </div>))}
          </div>
          <div style={{ fontSize:11, color:'#aaa', marginTop:8 }}>Indicative only — your free design visit confirms an exact, itemised quote.</div>
          <div style={{ display:'flex', gap:10, marginTop:18, flexWrap:'wrap' }}>
            <button type="button" onClick={()=>setPage('planner')} style={{ background:'#1d1d1f', color:'#fff', border:'none', borderRadius:980, padding:'11px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Refine in 3D planner</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'#F97316', color:'#fff', border:'none', borderRadius:980, padding:'11px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Book a free visit</button>
            <button type="button" disabled={saved} onClick={saveConcept} style={{ background:'#fff', color: saved?'#1a7a40':'#1d1d1f', border:'1px solid '+(saved?'#1a7a40':'#d0d0d0'), borderRadius:980, padding:'11px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{saved?'✓ Saved to account':(user?'Save to my account':'Sign in to save')}</button>
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
        {col('Explore',[['Gallery','products'],['Projects','projects'],['3D Planner','planner'],['AI Designer','ai'],['Inspiration','blog']])}
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
    <button type="button" onClick={()=>setOpen(o=>!o)} aria-label="Chat with us" style={{ position:'fixed', right: mobile?16:24, bottom: mobile?88:24, zIndex:1400, width:56, height:56, borderRadius:'50%', background:'#F97316', border:'none', boxShadow:'0 6px 20px rgba(249,115,22,.4)', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <i className={open?'ti ti-x':'ti ti-message-2'} style={{ fontSize:24 }} aria-hidden="true" />
    </button>
    {open && (
      <div style={{ position:'fixed', right: mobile?10:24, bottom: mobile?150:92, zIndex:1400, width: mobile?'calc(100vw - 20px)':380, maxWidth:'calc(100vw - 20px)', height:520, maxHeight:'70vh', background:'#fff', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.22)', border:'1px solid #ececec', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ background:'#1d1d1f', color:'#fff', padding:'14px 18px' }}>
          <div style={{ fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:8 }}><i className="ti ti-sparkles" style={{ color:'#F9A35C' }} aria-hidden="true" /> Closets Assistant</div>
          <div style={{ fontSize:12, color:'#bdbdbd', marginTop:2 }}>AI-powered · replies in seconds</div>
        </div>
        <div ref={listRef} style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10, background:'#fafafa' }}>
          {msgs.map((m,i)=>(<div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'85%', background: m.role==='user'?'#F97316':'#fff', color: m.role==='user'?'#fff':'#1d1d1f', border: m.role==='user'?'none':'1px solid #ececec', borderRadius:14, padding:'10px 13px', fontSize:14, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{m.content}</div>))}
          {busy && <div style={{ alignSelf:'flex-start', color:'#aaa', fontSize:13, padding:'4px 6px' }}>typing…</div>}
          {msgs.length<=1 && <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>{chips.map(c=>(<button key={c} type="button" onClick={()=>{ if(c==='Book a free visit'){ setOpen(false); setPage('booking'); } else send(c); }} style={{ fontSize:12, border:'1px solid #e0e0e0', borderRadius:16, padding:'6px 12px', background:'#fff', cursor:'pointer', color:'#1d1d1f' }}>{c}</button>))}</div>}
        </div>
        <div style={{ display:'flex', gap:8, padding:'12px', borderTop:'1px solid #ececec' }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} placeholder="Ask anything…" style={{ flex:1, border:'1px solid #e0e0e0', borderRadius:980, padding:'10px 16px', fontSize:14, outline:'none' }} />
          <button type="button" onClick={()=>send()} disabled={busy||!input.trim()} style={{ background:'#F97316', color:'#fff', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', flexShrink:0, opacity:(busy||!input.trim())?0.5:1 }}><i className="ti ti-send" style={{ fontSize:18 }} aria-hidden="true" /></button>
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
          <div style={{ fontSize:12, color:'#F97316', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>{[p.category,p.client_type].filter(Boolean).join(' · ')}</div>
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
      <button type="button" onClick={()=>setPage('booking')} style={{ background:'#F97316', color:'#fff', border:'none', borderRadius:980, padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Book a free design visit</button>
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
  const openAuth = (mode = 'login') => { setAuthMode(mode); setAuthOpen(true); };
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
      {page==='ai' && <AIDesignerPage setPage={setPage} user={user} />}
      {page.startsWith('cat:') && <CategoryPage category={page.slice(4)} products={products} setPage={setPage} addToCart={addToCart} />}
      {!['portal','checkout'].includes(page) && <SiteFooter setPage={setPage} />}
      <ChatWidget setPage={setPage} />
      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} setOpen={setCartOpen} setPage={setPage} />
      {page==='planner' && <PlannerPage setPage={setPage} user={user} />}
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} setUser={setUser} onClose={()=>setAuthOpen(false)} />}
      <Toasts />
    </AppCtx.Provider>
  );
}