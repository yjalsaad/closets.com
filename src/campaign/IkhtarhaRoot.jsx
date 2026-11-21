/* =============================================================================
 * [IKHTARHA 2026-11-08] اختارها — "Choose your box. Unlock your reward."  /campaign/ikhtarha
 *   hero (3D wardrobe preview) → name + quotation no. (+ code, prefilled from ?code=) → server validation
 *   → cinematic wardrobe (camera dolly, doors open, lit shelves) → choose a box → «اختارها» → the server draws the reward
 *   → box flies forward, lid bursts open → reward card (print certificate · view quotation)
 *   /campaign/ikhtarha/verify?t=…  → QR verification of a printed certificate
 * Arabic first (RTL), English available. Reduced motion respected. Non-3D fallback when WebGL is missing.
 * The page never knows the prizes: the reward arrives from ikh_reveal after the box is chosen.
 * ===========================================================================*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ModalPanel } from '../a11y/dialog';
import FormNotice from '../privacy/FormNotice';
import ConsentBanner from '../privacy/ConsentBanner';
import { SkipLink } from '../a11y/RouteA11y';
import './ikhtarha.css';
import * as api from './api';
import ScratchCard from './ScratchCard';
import { certificateDocument, rewardSentence, rewardValueText, kitColours } from './certificate';

/* campaign identity — the اختارها brand pack; Bonsai (Ad Campaigns → campaign identity) overrides any key per campaign */
const BRAND = { logo: '/brand/ikhtarha/logo.png', logo_light: '/brand/ikhtarha/logo-light.png', hero_wide: '/brand/ikhtarha/hero-wide.jpg', hero_portrait: '/brand/ikhtarha/hero-portrait.jpg',
  hero_has_logo: false, hero_text_side: 'right', primary: '#4A2C82', accent: '#23807C', sand: '#FFFFFF', taupe: '#9FDDD8', charcoal: '#3A1F6B', slogan_ar: 'تصاميم جميلة. جاهزة لك.', slogan_en: 'Beautiful designs. Ready for you.' };
const HEX = /^#[0-9A-Fa-f]{6}$/;
const OLD_TAGS = ['افتح خزانة المفاجآت واكتشف جائزتك.', 'Choose your box and unlock your reward.'];   // pre-kit default tagline → the kit line
const safeUrl = (u) => (typeof u === 'string' && /^(https:\/\/|\/brand\/)/.test(u) ? u : '');
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (x) => Math.max(0, Math.min(255, Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((x) => f(x).toString(16).padStart(2, '0')).join(''); };
function brandOf(cfg) {
  const b = { ...BRAND, ...kitColours((cfg && cfg.brand) || {}) };
  ['primary', 'accent', 'sand', 'taupe', 'charcoal'].forEach((k) => { if (!HEX.test(b[k] || '')) b[k] = BRAND[k]; });
  ['logo', 'logo_light', 'hero_wide', 'hero_portrait'].forEach((k) => { b[k] = safeUrl(b[k]); });
  if (b.hero_wide === BRAND.hero_wide) b.hero_has_logo = false;   // [2026-11-09] the kit key visuals carry no logo — the page shows it
  return b;
}
const brandStyle = (b) => ({ '--ik-orange': b.accent, '--ik-orange-2': shade(b.accent, 0.22), '--ik-burgundy': b.primary, '--ik-wine': shade(b.primary, -0.55), '--ik-ink': shade(b.primary, -0.8), '--ik-cream': b.sand, '--ik-taupe': b.taupe });

const S = {
  brand: ['The Closets International', 'الخزائن العالمية'],
  eyebrow: ['Beautiful designs… and the prize is your choice.', 'تصاميم روعة… والجائزة باختيارك'],
  title: ['Ikhtarha', 'اختارها'],
  tagline: ['Price your design and pick your prize box.', 'سعّر تصميمك واختار صندوق جائزتك.'],
  start: ['Start your experience', 'ابدأ تجربتك'], how: ['How does it work?', 'كيف تعمل الحملة؟'],
  how1: ['Visit The Closets showroom and finish your quotation.', 'زر معرض الخزائن العالمية وخلّص الكوتيشن.'],
  how2: ['Open your personal link or scan the QR on your quotation.', 'افتح رابطك الخاص أو امسح الكود الموجود في الكوتيشن.'],
  how3: ['Enter your name — your wardrobe of surprises opens.', 'اكتب اسمك — وتنفتح خزانة المفاجآت.'],
  how4: ['Choose one box. Your reward is linked to your quotation.', 'اختار صندوق واحد. جائزتك ترتبط بالكوتيشن مباشرة.'],
  close: ['Close', 'إغلاق'], back: ['Back', 'رجوع'],
  formTitle: ['Your wardrobe is waiting', 'خزانتك بانتظارك'], formSub: ['Enter the details from your quotation.', 'اكتب البيانات الموجودة في الكوتيشن.'],
  name: ['Your name', 'اسمك'], namePh: ['As written on the quotation', 'كما هو مكتوب في الكوتيشن'], quote: ['Quotation number', 'رقم الكوتيشن'],
  code: ['Campaign code', 'كود الحملة'], codeOk: ['Your campaign code is ready', 'كود الحملة جاهز'], go: ['Open my wardrobe', 'افتح خزانتي'],
  checking: ['Checking your details…', 'نتأكد من بياناتك…'], ok: ['Welcome! Your surprise wardrobe is ready.', 'أهلًا بك! خزانة المفاجآت جاهزة.'],
  invalid: ['Check the quotation number or the code and try again.', 'تأكد من رقم الكوتيشن أو الكود وحاول مرة ثانية.'],
  already: ['You have already discovered your reward.', 'لقد اكتشفت جائزتك مسبقًا.'],
  expired: ['This campaign has ended. Thank you for being with us.', 'انتهت هذه الحملة. شكرًا لوجودك معنا.'],
  closed: ['The campaign is not open right now.', 'الحملة غير متاحة حاليًا.'],
  sold_out: ['No reward is available for this quotation right now — our team will contact you.', 'لا توجد جائزة متاحة لعرض السعر هذا حاليًا — سيتواصل معك فريقنا.'],
  home: ['Back to website', 'العودة للموقع'], restart: ['Back to start', 'العودة للبداية'],
  locked: ['Too many attempts. Please contact your sales consultant.', 'محاولات كثيرة. تواصل مع مستشار المبيعات.'],
  rate_limited: ['Too many attempts — please wait a few minutes.', 'محاولات كثيرة — انتظر بضع دقائق.'],
  session: ['Your session ended — please enter your details again.', 'انتهت الجلسة — أدخل بياناتك مرة أخرى.'],
  failed: ['Something went wrong — please try again.', 'حدث خطأ — حاول مرة أخرى.'],
  greet: ['Welcome, {n}', 'أهلًا {n}'], pick: ['Choose one box', 'اختار صندوق واحد'], pickSub: ['Tap a box to select it. Only one can be opened.', 'المس صندوقًا لاختياره. يمكن فتح صندوق واحد فقط.'],
  box: ['Box {n}', 'صندوق {n}'], selected: ['Box {n} selected', 'تم اختيار الصندوق {n}'], choose: ['Ikhtarha', 'اختارها'], opening: ['Opening your box…', 'نفتح صندوقك…'],
  congrats: ['Congratulations!', 'مبروك!'],
  drawOf: ['Draw {n} of {t}', 'السحب {n} من {t}'], nextDraw: ['🎁 You have another draw — play now', '🎁 لديك سحب آخر — العب الآن'],
  nextLeft: ['{n} more draw waiting for you', 'بقي لك {n} سحب'], allPrizes: ['Your prizes', 'جوائزك'], printAll: ['Print all certificates', 'طباعة كل الشهادات'], arrived: ['You chose — and your reward is here!', 'اختارها وجائزتك وصلت!'],
  onOrder: ['On your order with The Closets International.', 'على طلبك من الخزائن العالمية.'],
  ref: ['Reward reference', 'مرجع الجائزة'], quoteNo: ['Quotation', 'الكوتيشن'], customer: ['Customer', 'العميل'], validUntil: ['Valid until', 'صالحة حتى'], discount: ['Discount value', 'قيمة الخصم'],
  howUse: ['Show this reward (printed or on your phone) when you confirm your order. It is linked to your quotation and can be used once.', 'اعرض جائزتك (مطبوعة أو على جوالك) عند تأكيد طلبك. الجائزة مرتبطة بالكوتيشن وتُستخدم مرة واحدة.'],
  print: ['Print your reward', 'اطبع جائزتك'], viewQuote: ['View quotation', 'عرض الكوتيشن'], noQuoteLink: ['Ask your consultant for your quotation link', 'اطلب رابط الكوتيشن من مستشارك'],
  whatsapp: ['Questions? WhatsApp us', 'استفسار؟ راسلنا واتساب'], soundOn: ['Sound on', 'الصوت مفعّل'], soundOff: ['Sound off', 'الصوت مطفأ'],
  steps: [['Details', 'البيانات'], ['Wardrobe', 'الخزانة'], ['Choose', 'الاختيار'], ['Reward', 'الجائزة']],
  stepsScratch: [['Details', 'البيانات'], ['Card', 'البطاقة'], ['Scratch', 'المسح'], ['Reward', 'الجائزة']],
  noWebgl: ['Simple view (3D is not available on this device)', 'عرض مبسّط (العرض ثلاثي الأبعاد غير متاح على هذا الجهاز)'],
  verifyTitle: ['Reward verification', 'التحقق من الجائزة'], vValid: ['Valid reward', 'جائزة صالحة'], vRedeemed: ['Already used', 'تم استخدامها'], vExpired: ['Expired', 'منتهية'], vVoid: ['Cancelled', 'ملغاة'], vBad: ['This certificate could not be verified.', 'تعذّر التحقق من هذه الشهادة.'],
  ended: ['Campaign ends', 'تنتهي الحملة'],
};
const T = (k, ar, v) => { let s = (S[k] || [k, k])[ar ? 1 : 0]; if (v) Object.entries(v).forEach(([a, b]) => { s = s.replace('{' + a + '}', b); }); return s; };
const fmtDay = (d, ar) => (d ? new Date(String(d).length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(ar ? 'ar-BH' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
const money = (n) => 'BD ' + Number(n || 0).toFixed(3);
const LANG_KEY = 'closets_lang';
const prefersReduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/* soft chime (Web Audio, no files) — only when the customer turns sound on */
function chime(kind) {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return; const a = chime.ctx || (chime.ctx = new C()); const now = a.currentTime;
    const notes = kind === 'open' ? [659.25, 830.61, 987.77, 1318.5] : [523.25, 659.25];
    notes.forEach((f, i) => { const o = a.createOscillator(); const g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, now + i * 0.09); g.gain.linearRampToValueAtTime(0.12, now + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.9); o.connect(g).connect(a.destination); o.start(now + i * 0.09); o.stop(now + i * 0.09 + 1); });
  } catch (e) { /* no audio */ }
}

/* subtle confetti (2D canvas, a few seconds, respects reduced motion) */
function Confetti({ on, calm }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!on || prefersReduced()) return undefined;
    const c = ref.current; const g = c && c.getContext && c.getContext('2d'); if (!g) return undefined;
    const W = (c.width = window.innerWidth); const H = (c.height = window.innerHeight);
    const cols = ['#D9692F', '#B8924E', '#F3ECE2', '#4B1F24', '#E4884F'];
    const P = Array.from({ length: calm ? 60 : 150 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 9, r: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0] }));
    let raf; const t0 = performance.now();
    const step = (now) => { const k = (now - t0) / 1000; g.clearRect(0, 0, W, H); P.forEach((p) => { p.vy += 0.22; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.globalAlpha = Math.max(0, 1 - k / 4); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); }); if (k < 4.2) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [on, calm]);
  return <canvas ref={ref} className="ik-confetti" aria-hidden="true" />;
}

/* the 3D stage (lazy-loads three.js) with a 2D fallback */
function Stage({ cfg, mode, onReady, onPick, selected, reduced, apiRef, onBurst, engine }) {
  const host = useRef(null); const [fallback, setFallback] = useState(false);
  useEffect(() => {
    let v = null; let alive = true;
    (async () => {
      try {
        const mod = engine === 'classic' ? await import('./wardrobe3d') : await import('./wardrobe3dPro');   // game style from the campaign: cinematic (default) · classic
        if (!alive || !host.current) return;
        if (!mod.webglAvailable()) { setFallback(true); if (onReady) onReady(null); return; }
        v = mod.createWardrobe(host.current, { boxes: cfg.boxes, theme: cfg.theme, brand: brandOf(cfg), reduced, preview: mode === 'preview', side: mode === 'preview' ? (document.documentElement.dir === 'rtl' ? -1 : 1) : 0, calm: cfg.reveal === 'glow', onPick: (i) => onPick && onPick(i), onBurst: () => onBurst && onBurst() });
        if (apiRef) apiRef.current = v; if (onReady) onReady(v);
      } catch (e) { setFallback(true); if (onReady) onReady(null); }
    })();
    return () => { alive = false; if (v) v.dispose(); if (apiRef) apiRef.current = null; };
  }, [cfg.boxes, cfg.theme, cfg.reveal, JSON.stringify(cfg.brand || null), mode, reduced, engine]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (apiRef && apiRef.current && selected != null) apiRef.current.select(selected); }, [selected, apiRef]);
  return (
    <div className={'ik-stage' + (mode === 'preview' ? ' ik-stage-preview' : '')}>
      <div ref={host} className="ik-host" />
      {fallback && mode !== 'preview' && <div className="ik-fallback-note">{T('noWebgl', document.documentElement.dir === 'rtl')}</div>}
      {fallback && <div className="ik-fallback-wardrobe" aria-hidden="true"><span /><span /></div>}
    </div>
  );
}

export default function IkhtarhaRoot() {
  const path = (window.location.pathname || '').replace(/\/+$/, '');
  const q = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlCode = api.DEMO ? 'DEMO-SAMP-LE00' : (q.get('code') || '').trim();
  const [lang, setLangS] = useState(() => { try { return q.get('lang') || localStorage.getItem(LANG_KEY) || 'ar'; } catch (e) { return 'ar'; } });
  const ar = lang !== 'en';
  const setLang = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } setLangS(l); };
  const [cfg, setCfg] = useState({ boxes: 9, theme: 'walnut', anim_ms: api.DEMO ? 3200 : 2600, sound: false, live: true });
  const [phase, setPhase] = useState(/\/verify$/.test(path) ? 'verify' : 'hero');
  const [how, setHow] = useState(false);
  const [form, setForm] = useState(api.DEMO ? { name: 'Sara', quote_no: 'QT-SAMPLE', code: urlCode, website: '' } : { name: '', quote_no: '', code: urlCode, website: '' });
  const [msg, setMsg] = useState(null); // { kind: 'error'|'ok'|'info', key }
  const [session, setSession] = useState(null); // { token, first_name }
  const [selected, setSelected] = useState(null);
  const [reward, setReward] = useState(null);
  // [IKHTARHA 2026-11-08g] draw rules: a quotation can have several draws — { total, done, remaining, rewards[] }
  const [draws, setDraws] = useState({ total: 1, done: 0, remaining: 0, rewards: [] });
  const [drawKey, setDrawKey] = useState(0);
  const takeDraws = useCallback((r) => { if (!r) return; const list = Array.isArray(r.rewards) && r.rewards.length ? r.rewards : r.reward ? [r.reward] : [];
    setDraws({ total: Math.max(Number(r.draws_total) || 1, list.length || 1), done: list.length, remaining: Math.max(Number(r.remaining) || 0, 0), rewards: list }); }, []);
  const [burst, setBurst] = useState(false);
  const [sound, setSound] = useState(false);
  const [ready3d, setReady3d] = useState(false);
  const reduced = useMemo(prefersReduced, []);
  const B = useMemo(() => brandOf(cfg), [cfg]);
  const viewer = useRef(null);

  // the game name is a campaign setting (Bonsai → campaign → reward boxes): اختارها / Ikhtarha by default
  const gameName = ar ? (cfg.name_ar || 'اختارها') : (cfg.name_en || 'Ikhtarha');
  // game style (Bonsai → campaign → reward game): cinematic 3D wardrobe (default) · classic 3D wardrobe · scratch card. /demo?game=… previews any.
  const GAMES = ['cinematic', 'classic', 'scratch'];
  const game = (api.DEMO && GAMES.includes(q.get('game'))) ? q.get('game') : GAMES.includes(cfg.game) ? cfg.game : 'cinematic';
  const scratchMode = game === 'scratch';
  const scratchReq = useRef(null);
  const startScratch = useCallback(() => { if (!scratchReq.current) scratchReq.current = api.reveal(session && session.token, 0).catch(() => null); return scratchReq.current; }, [session]);
  const scratchDone = useCallback((r) => {
    if (r && r.ok && r.reward) { setReward(r.reward); takeDraws(r); setBurst(true); if (sound) chime('open'); setPhase('reward'); }
    else { const k = (r && r.state) || 'failed'; if (k === 'session') api.clearSession(); setMsg({ kind: 'error', key: k === 'already' ? 'already' : k }); setPhase(k === 'session' ? 'form' : 'error'); }
  }, [sound, takeDraws]);
  useEffect(() => { document.documentElement.lang = ar ? 'ar' : 'en'; document.documentElement.dir = ar ? 'rtl' : 'ltr'; document.title = gameName + (ar ? ' — الخزائن العالمية' : ' — The Closets International'); }, [ar, gameName]);
  useEffect(() => {
    if (!document.getElementById('ik-font')) { const l = document.createElement('link'); l.id = 'ik-font'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Alexandria:wght@500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'; document.head.appendChild(l); }
    api.landing(api.DEMO ? null : urlCode).then((c) => { if (c) setCfg((x) => ({ ...x, ...c, ...(api.DEMO ? { anim_ms: 3200, live: true } : {}) })); }).catch(() => {});
    const s = api.loadSession();
    if (s && s.token && phase !== 'verify') {
      api.reward(s.token).then((r) => {
        if (r && r.ok && r.state === 'revealed') { setSession(s); setReward(r.reward); takeDraws(r); setPhase('reward'); }
        else if (r && r.ok && r.state === 'ready') { setSession(s); setDraws({ total: Number(r.draws_total) || 1, done: 0, remaining: Number(r.draws_total) || 1, rewards: [] }); setPhase('experience'); }
        else api.clearSession();
      }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault(); if (phase === 'checking') return;
    if (!form.name.trim() || !form.quote_no.trim() || !form.code.trim()) { setMsg({ kind: 'error', key: 'invalid' }); return; }
    setPhase('checking'); setMsg({ kind: 'info', key: 'checking' });
    try {
      const r = await api.validate({ code: form.code.trim(), name: form.name.trim(), quote_no: form.quote_no.trim(), website: form.website });
      if (r && r.ok && (r.state === 'ready' || r.state === 'partial')) {
        const s = { token: r.token, first_name: r.first_name }; setSession(s); api.saveSession(s);
        if (r.state === 'partial') { const rw = await api.reward(r.token).catch(() => null); if (rw && rw.ok) takeDraws(rw); }
        else setDraws({ total: Number(r.draws_total) || 1, done: 0, remaining: Number(r.draws_total) || 1, rewards: [] });
        if (r.boxes) setCfg((x) => ({ ...x, boxes: r.boxes, anim_ms: r.anim_ms || x.anim_ms }));
        setMsg({ kind: 'ok', key: 'ok' }); setTimeout(() => setPhase('experience'), 700);
      } else if (r && r.ok && r.state === 'already') {
        const s = { token: r.token, first_name: r.first_name }; setSession(s); api.saveSession(s);
        const rw = await api.reward(r.token);
        if (rw && rw.reward) { setReward(rw.reward); takeDraws(rw); setMsg({ kind: 'info', key: 'already' }); setPhase('reward'); } else { setPhase('form'); setMsg({ kind: 'error', key: 'already' }); }
      } else { setPhase('form'); setMsg({ kind: 'error', key: (r && r.state) || 'invalid' }); }
    } catch (er) { setPhase('form'); setMsg({ kind: 'error', key: 'failed' }); }
  };

  const onPick = useCallback((i) => { if (phase === 'experience') { setSelected(i); if (sound) chime('pick'); } }, [phase, sound]);
  const choose = async () => {
    if (selected == null || phase !== 'experience' || !session) return;
    setPhase('revealing');
    const req = api.reveal(session.token, selected).catch(() => null);
    const anim = viewer.current ? viewer.current.reveal(selected, cfg.anim_ms || 2600) : new Promise((r) => setTimeout(r, reduced ? 300 : Math.min(cfg.anim_ms || 2600, 2400)));
    const [r] = await Promise.all([req, anim]);
    if (r && r.ok && r.reward) { setReward(r.reward); takeDraws(r); if (sound) chime('open'); setBurst(true); setTimeout(() => setPhase('reward'), reduced ? 100 : game === 'classic' ? 650 : 1500); }   // cinematic: let the burst play before the card
    else { const k = (r && r.state) || 'failed'; if (k === 'session') api.clearSession(); setMsg({ kind: 'error', key: k === 'already' ? 'already' : k }); setPhase(k === 'session' ? 'form' : 'error'); }
  };
  const printReward = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const list = (draws.rewards.length ? draws.rewards : [reward]).map((x) => ({ ...x, brand: x.brand || B }));
    const totalDiscount = list.reduce((n, x) => n + (Number(x.discount_amount) || 0), 0);
    w.document.write(certificateDocument(list, { ar, title: list.map((x) => x.ref).join(' · '), totalDiscount })); w.document.close();
  };
  // next draw: a fresh wardrobe / scratch card with the same session (the server decides which prize types this draw can give)
  // [2026-11-09] back from every screen: hero → website, any other screen → the start (the saved session brings the customer straight back)
  const goBack = () => { if (phase === 'hero') { window.location.href = '/'; return; } setMsg(null); setBurst(false); setPhase(phase === 'reward' || phase === 'experience' || phase === 'error' ? 'hero' : 'hero'); };
  const nextDraw = () => { scratchReq.current = null; setSelected(null); setBurst(false); setReward(null); setMsg(null); setReady3d(false); setDrawKey((k) => k + 1); setPhase('experience'); };
  const drawLabel = draws.total > 1 && (phase === 'experience' || phase === 'revealing') ? T('drawOf', ar, { n: Math.min(draws.done + 1, draws.total), t: draws.total }) : '';

  const step = phase === 'hero' ? -1 : phase === 'form' || phase === 'checking' ? 0 : phase === 'experience' ? (selected == null ? 1 : 2) : phase === 'revealing' ? 2 : phase === 'reward' ? 3 : -1;
  if (phase === 'verify') return <Verify ar={ar} setLang={setLang} q={q} />;

  return (
    <div className={'ik-root ik-phase-' + phase + ((B.hero_wide || B.hero_portrait) ? ' ik-kv-' + (B.hero_text_side === 'left' ? 'left' : 'right') : '')} dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'} style={brandStyle(B)}>
      <SkipLink lang={ar ? 'ar' : 'en'} />
      <ConsentBanner lang={ar ? 'ar' : 'en'} />
      {api.DEMO && <div className="ik-demo" role="note">{ar ? 'معاينة تجريبية — الجوائز هنا ليست حقيقية' : 'Sample preview — prizes here are not real'}</div>}
      <header className="ik-head">
        <button type="button" className="ik-back" onClick={goBack} disabled={phase === 'revealing' || phase === 'checking'} aria-label={phase === 'hero' ? T('home', ar) : T('back', ar)} data-testid="ik-back">
          <span aria-hidden="true">{ar ? '→' : '←'}</span><em>{phase === 'hero' ? T('home', ar) : T('back', ar)}</em></button>
        <a href="/" className="ik-logo" aria-label={T('brand', ar)}><img src="/brand/closets-logo-white.png" alt={T('brand', ar)} /></a>
        {phase !== 'hero' && B.logo_light && <img className="ik-clogo-head" src={B.logo_light} alt={gameName} />}
        {step >= 0 && (
          <ol className="ik-steps" aria-label={ar ? 'المراحل' : 'Progress'}>
            {(scratchMode ? S.stepsScratch : S.steps).map((s, i) => <li key={i} className={i < step ? 'done' : i === step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}><span>{i + 1}</span><em>{s[ar ? 1 : 0]}</em></li>)}
          </ol>
        )}
        <span className="ik-grow" />
        {cfg.sound && <button type="button" className="ik-icon" aria-pressed={sound} onClick={() => setSound((v) => !v)} title={sound ? T('soundOn', ar) : T('soundOff', ar)} aria-label={sound ? T('soundOn', ar) : T('soundOff', ar)}>{sound ? '🔊' : '🔈'}</button>}
        <button type="button" className="ik-lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'EN' : 'ع'}</button>
      </header>

      {(phase === 'hero' || phase === 'form' || phase === 'checking') && (B.hero_wide || B.hero_portrait) && (
        <div className="ik-kv" aria-hidden="true">
          <picture>
            {B.hero_portrait && <source media="(max-width: 760px)" srcSet={B.hero_portrait} />}
            <img src={B.hero_wide || B.hero_portrait} alt="" onLoad={() => setReady3d(true)} />
          </picture>
        </div>
      )}
      {(phase === 'hero' || phase === 'form' || phase === 'checking') && !(B.hero_wide || B.hero_portrait) && (
        <Stage engine={game} cfg={cfg} mode="preview" reduced={reduced} onReady={() => setReady3d(true)} />
      )}
      {scratchMode && (phase === 'experience' || phase === 'reward' || phase === 'error') && (B.hero_wide || B.hero_portrait) && (
        <div className="ik-kv ik-kv-soft" aria-hidden="true"><picture>{B.hero_portrait && <source media="(max-width: 760px)" srcSet={B.hero_portrait} />}<img src={B.hero_wide || B.hero_portrait} alt="" /></picture></div>
      )}
      {scratchMode && phase === 'experience' && (
        <ScratchCard key={'sc' + drawKey} drawLabel={drawLabel} ar={ar} brand={B} gameName={gameName} firstName={session && session.first_name} reduced={reduced} onStart={startScratch} onDone={scratchDone} />
      )}
      {!scratchMode && (phase === 'experience' || phase === 'revealing' || (phase === 'reward' && viewer.current) || phase === 'error') && (
        <Stage key={'st' + drawKey} engine={game} cfg={cfg} mode="play" reduced={reduced} apiRef={viewer} selected={selected} onPick={onPick} onBurst={() => setBurst(true)}
          onReady={(v) => { setReady3d(true); if (v && phase === 'experience') v.intro(); }} />
      )}

      {phase === 'hero' && (
        <main id="main" tabIndex={-1} className="ik-hero">
          <p className="ik-eyebrow">{T('eyebrow', ar)}</p>
          {(() => { const kvLogo = (B.hero_wide || B.hero_portrait) && B.hero_has_logo; const name = gameName;
            return kvLogo ? <h1 className="ik-sr">{name}</h1>
              : B.logo_light ? <h1 className="ik-title ik-title-logo"><img src={B.logo_light} alt={name} /></h1>
              : <h1 className="ik-title">{name}</h1>; })()}
          <p className="ik-tag">{(() => { const tg = ar ? cfg.tagline_ar : cfg.tagline_en; return !tg || OLD_TAGS.includes(tg) ? T('tagline', ar) : tg; })()}</p>
          {(ar ? B.slogan_ar : B.slogan_en) && <p className="ik-tag ik-tag-2">{ar ? B.slogan_ar : B.slogan_en}</p>}
          <div className="ik-ctas">
            <button type="button" className="ik-btn ik-btn-primary" onClick={() => { setPhase('form'); setMsg(null); }} data-testid="ik-start">{T('start', ar)}</button>
            <button type="button" className="ik-btn ik-btn-ghost" onClick={() => setHow(true)}>{T('how', ar)}</button>
          </div>
          {cfg.ends && <p className="ik-small">{T('ended', ar)} · {fmtDay(cfg.ends, ar)}</p>}
        </main>
      )}

      {(phase === 'form' || phase === 'checking') && (
        <main id="main" tabIndex={-1} className="ik-panel-wrap">
          <form className="ik-panel" onSubmit={submit} noValidate aria-busy={phase === 'checking'}>
            <h2>{T('formTitle', ar)}</h2>
            <p className="ik-muted">{T('formSub', ar)}</p>
            <label>{T('name', ar)}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" placeholder={T('namePh', ar)} maxLength={120} required data-testid="ik-name" /></label>
            <label>{T('quote', ar)}<input value={form.quote_no} onChange={(e) => setForm({ ...form, quote_no: e.target.value })} dir="ltr" inputMode="text" autoCapitalize="characters" maxLength={40} required data-testid="ik-quote" /></label>
            {urlCode ? <div className="ik-codeok">✓ {T('codeOk', ar)} <code dir="ltr">{urlCode.slice(0, 4)}-••••-••••</code></div>
              : <label>{T('code', ar)}<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} dir="ltr" autoCapitalize="characters" placeholder="XXXX-XXXX-XXXX" maxLength={20} required data-testid="ik-code" /></label>}
            <FormNotice kind="request" lang={ar ? 'ar' : 'en'} />
            <input className="ik-hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} aria-hidden="true" />
            {msg && <div className={'ik-msg ik-msg-' + msg.kind} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.kind === 'info' && phase === 'checking' && <span className="ik-spin" />}{T(msg.key, ar)}</div>}
            <button type="submit" className="ik-btn ik-btn-primary ik-wide" disabled={phase === 'checking'} data-testid="ik-go">{phase === 'checking' ? T('checking', ar) : T('go', ar)}</button>
            <button type="button" className="ik-btn ik-btn-link" onClick={() => setPhase('hero')}>{T('back', ar)}</button>
          </form>
        </main>
      )}

      {!scratchMode && (phase === 'experience' || phase === 'revealing') && (
        <div className="ik-hud">
          <div className="ik-hud-top">
            <p className="ik-eyebrow">{session && session.first_name ? T('greet', ar, { n: session.first_name }) : ''}{drawLabel ? <span className="ik-draw-chip" data-testid="ik-draw-label">{drawLabel}</span> : null}</p>
            <h2>{phase === 'revealing' ? T('opening', ar) : T('pick', ar)}</h2>
            {phase === 'experience' && <p className="ik-muted">{T('pickSub', ar)}</p>}
          </div>
          <div className={'ik-hud-bottom' + (phase === 'revealing' ? ' ik-hud-quiet' : '')}>
            <div className="ik-dots" role="radiogroup" aria-label={T('pick', ar)}>
              {Array.from({ length: cfg.boxes || 9 }, (_, i) => (
                <button key={i} type="button" role="radio" aria-checked={selected === i} disabled={phase !== 'experience'} className={'ik-dot' + (selected === i ? ' on' : '')}
                  onClick={() => onPick(i)} aria-label={T('box', ar, { n: i + 1 })} data-testid="ik-box">{i + 1}</button>
              ))}
            </div>
            <div className="ik-choose-row">
              <span className="ik-selnote" aria-live="polite">{selected != null ? T('selected', ar, { n: selected + 1 }) : ''}</span>
              <button type="button" className="ik-btn ik-btn-primary ik-choose" disabled={selected == null || phase !== 'experience'} onClick={choose} data-testid="ik-choose">{gameName}</button>
            </div>
          </div>
          {!ready3d && <div className="ik-loading"><span className="ik-spin" /></div>}
        </div>
      )}

      {phase === 'error' && msg && (
        <main id="main" tabIndex={-1} className="ik-panel-wrap"><div className="ik-panel" role="alert"><h2>{T(msg.key, ar)}</h2>
          {cfg.whatsapp && <a className="ik-btn ik-btn-ghost ik-wide" href={'https://wa.me/' + String(cfg.whatsapp).replace(/\D/g, '')} target="_blank" rel="noopener noreferrer">{T('whatsapp', ar)}</a>}
          <button type="button" className="ik-btn ik-btn-link ik-wide" onClick={goBack}>{T('restart', ar)}</button>
          <a className="ik-btn ik-btn-link ik-wide" href="/">{T('home', ar)}</a></div></main>
      )}

      {phase === 'reward' && reward && <RewardCard ar={ar} reward={reward} draws={draws} onNext={nextDraw} note={msg && msg.key === 'already' && !draws.remaining ? T('already', ar) : null} onPrint={printReward} whatsapp={cfg.whatsapp} logo={B.logo || B.logo_light} onBack={goBack} />}
      <Confetti on={burst && phase === 'reward'} calm={cfg.reveal === 'glow'} />

      {how && (
        <div className="ik-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setHow(false); }}>
          <ModalPanel className="ik-sheet" label={T('how', ar)} onClose={() => setHow(false)}>
            <h2>{T('how', ar)}</h2>
            <ol className="ik-how">{['how1', 'how2', 'how3', 'how4'].map((k, i) => <li key={k}><span>{i + 1}</span>{T(k, ar)}</li>)}</ol>
            <button type="button" className="ik-btn ik-btn-primary ik-wide" autoFocus onClick={() => { setHow(false); setPhase('form'); }}>{T('start', ar)}</button>
            <button type="button" className="ik-btn ik-btn-link" onClick={() => setHow(false)}>{T('close', ar)}</button>
          </ModalPanel>
        </div>
      )}
    </div>
  );
}

function RewardCard({ ar, reward: r, draws = { total: 1, remaining: 0, rewards: [] }, onNext, note, onPrint, whatsapp, logo, onBack }) {
  const many = draws.rewards.length > 1; const totalDisc = draws.rewards.reduce((n, x) => n + (Number(x.discount_amount) || 0), 0);
  const desc = ar ? (r.description_ar || r.description_en) : (r.description_en || r.description_ar);
  return (
    <main id="main" tabIndex={-1} className="ik-reward-wrap">
      <article className="ik-reward" aria-labelledby="ik-congrats">
        {note && <p className="ik-msg ik-msg-info" role="status">{note}</p>}
        {logo && <img className="ik-reward-logo" src={logo} alt="" />}
        <p className="ik-eyebrow">{T('arrived', ar)}</p>
        <h1 id="ik-congrats" className="ik-congrats">{T('congrats', ar)}</h1>
        <p className="ik-sentence">{rewardSentence(r, ar)}</p>
        {r.image_url && /^https:\/\//.test(r.image_url) && <img className="ik-prize-img" src={r.image_url} alt="" />}
        <div className="ik-value" data-testid="ik-value">{rewardValueText(r, ar)}</div>
        <p className="ik-rname">{ar ? r.name_ar : r.name_en}</p>
        {desc && <p className="ik-muted">{desc}</p>}
        <p className="ik-muted">{T('onOrder', ar)}</p>
        <dl className="ik-facts">
          <div><dt>{T('ref', ar)}</dt><dd dir="ltr" data-testid="ik-ref">{r.ref}</dd></div>
          <div><dt>{T('quoteNo', ar)}</dt><dd dir="ltr">{r.quote_no}</dd></div>
          <div><dt>{T('customer', ar)}</dt><dd>{r.customer_name}</dd></div>
          <div><dt>{T('validUntil', ar)}</dt><dd>{fmtDay(r.expires_at, ar)}</dd></div>
          {Number(r.discount_amount) > 0 && <div><dt>{T('discount', ar)}</dt><dd dir="ltr">{money(r.discount_amount)}</dd></div>}
        </dl>
        {many && (
          <div className="ik-allprizes" data-testid="ik-all-prizes">
            <p className="ik-eyebrow">{T('allPrizes', ar)}</p>
            <ul>{draws.rewards.map((x, i) => <li key={x.ref}><span>{T('drawOf', ar, { n: x.draw_no || i + 1, t: draws.total })}</span><b dir="auto">{rewardValueText(x, ar)}</b><em>{ar ? x.name_ar : x.name_en}</em><code dir="ltr">{x.ref}</code></li>)}</ul>
            {totalDisc > 0 && <p className="ik-small">{T('discount', ar)} · <bdi dir="ltr">{money(totalDisc)}</bdi></p>}
          </div>
        )}
        {draws.remaining > 0 && onNext && (
          <div className="ik-next">
            <p className="ik-small">{T('nextLeft', ar, { n: draws.remaining })}</p>
            <button type="button" className="ik-btn ik-btn-primary ik-wide ik-next-btn" onClick={onNext} autoFocus data-testid="ik-next-draw">{T('nextDraw', ar)}</button>
          </div>
        )}
        <p className="ik-small">{T('howUse', ar)}</p>
        <div className="ik-ctas">
          <button type="button" className={'ik-btn ' + (draws.remaining > 0 ? 'ik-btn-ghost' : 'ik-btn-primary')} onClick={onPrint} data-testid="ik-print">{many ? T('printAll', ar) : T('print', ar)}</button>
          {r.quote_url ? <a className="ik-btn ik-btn-ghost" href={r.quote_url} target="_blank" rel="noopener noreferrer">{T('viewQuote', ar)}</a>
            : <span className="ik-btn ik-btn-ghost ik-disabled" title={T('noQuoteLink', ar)}>{T('viewQuote', ar)}</span>}
        </div>
        {!r.quote_url && <p className="ik-small">{T('noQuoteLink', ar)}</p>}
        {whatsapp && <a className="ik-btn ik-btn-link" href={'https://wa.me/' + String(whatsapp).replace(/\D/g, '')} target="_blank" rel="noopener noreferrer">{T('whatsapp', ar)}</a>}
        <div className="ik-backrow">
          {onBack && <button type="button" className="ik-btn ik-btn-link" onClick={onBack} data-testid="ik-reward-back">{ar ? '→' : '←'} {T('restart', ar)}</button>}
          <a className="ik-btn ik-btn-link" href="/">{T('home', ar)}</a>
        </div>
      </article>
    </main>
  );
}

function Verify({ ar, setLang, q }) {
  const [v, setV] = useState(undefined);
  useEffect(() => { const t = q.get('t') || ''; api.verify(t).then(setV).catch(() => setV({ ok: false })); }, [q]);
  const st = v && v.ok ? v.status : null;
  return (
    <div className="ik-root ik-phase-verify" dir={ar ? 'rtl' : 'ltr'}>
      <header className="ik-head"><a href="/" className="ik-back" aria-label={T('home', ar)}><span aria-hidden="true">{ar ? '→' : '←'}</span><em>{T('home', ar)}</em></a><a href="/" className="ik-logo"><img src="/brand/closets-logo-white.png" alt={T('brand', ar)} /></a><span className="ik-grow" /><button type="button" className="ik-lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'EN' : 'ع'}</button></header>
      <main id="main" tabIndex={-1} className="ik-reward-wrap">
        <article className="ik-reward">
          <p className="ik-eyebrow">{T('verifyTitle', ar)}</p>
          {v === undefined ? <span className="ik-spin" /> : !v.ok ? <h1 className="ik-congrats">{T('vBad', ar)}</h1> : <>
            <div className={'ik-verify ik-verify-' + st}>{({ valid: '✓ ' + T('vValid', ar), redeemed: T('vRedeemed', ar), expired: T('vExpired', ar), void: T('vVoid', ar) })[st]}</div>
            <div className="ik-value">{rewardValueText(v, ar)}</div>
            <p className="ik-rname">{ar ? v.name_ar : v.name_en}</p>
            <dl className="ik-facts">
              <div><dt>{T('ref', ar)}</dt><dd dir="ltr">{v.ref}</dd></div>
              <div><dt>{T('quoteNo', ar)}</dt><dd dir="ltr">{v.quote_no}</dd></div>
              <div><dt>{T('customer', ar)}</dt><dd>{v.customer}</dd></div>
              <div><dt>{T('validUntil', ar)}</dt><dd>{fmtDay(v.expires_at, ar)}</dd></div>
            </dl>
          </>}
        </article>
      </main>
    </div>
  );
}
