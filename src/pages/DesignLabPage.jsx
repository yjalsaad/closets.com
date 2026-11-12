// Route chunk "DesignLabPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DesignLabPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { formatBHDRange } from '../i18n/format';
import { aiFetch } from '../privacy/ai';
import { handleError } from '../errors';
import { AiNotice } from '../privacy/FormNotice';
import * as acct from '../account/api';
import { CMS_LANG, SUPA_KEY, SUPA_URL, Spark, api, toast, useI18n, useMobile } from '../App';
import { YasChip, yasReadImage } from './shared_AiYasPage_DesignLabPage';

// ════════════════════════════════════════════════════════════════════════
//  DESIGN LAB — viral growth hub. Self-contained page with 4 tabs:
//  1) AI Room Glow-Up  2) Style Quiz  3) Refer & Earn  4) Community Gallery.
//  Defensive everywhere — every backend call is best-effort and never crashes
//  the UI. Bilingual + RTL-aware. Reuses yasReadImage / SUPA_URL edge call /
//  api() / rpc / toast / useI18n / useMobile / Photo / Spark.
// ════════════════════════════════════════════════════════════════════════
const DL_STYLES = ['Warm Minimalist', 'Modern', 'Classic', 'Luxe', 'Scandi'];

const DL_STYLE_AR = {
  'Warm Minimalist': 'بساطة دافئة', 'Modern': 'عصري', 'Classic': 'كلاسيكي',
  'Luxe': 'فاخر', 'Scandi': 'إسكندنافي',
};

const DL_STYLE_MAP = {
  'Warm Minimalist': 'warm_oak', 'Modern': 'minimal', 'Classic': 'warm_oak',
  'Luxe': 'modern_luxe', 'Scandi': 'scandinavian',
};

const DL_STYLE_DESC = {
  'Warm Minimalist': { en: 'Clean lines, natural oak and soft neutrals — calm spaces that feel effortless.', ar: 'خطوط نظيفة، بلوط طبيعي وألوان محايدة ناعمة — مساحات هادئة تبدو بلا جهد.' },
  'Modern': { en: 'Crisp geometry, handleless fronts and confident contrast for a sharp, current look.', ar: 'هندسة أنيقة، واجهات بلا مقابض وتباين واثق لإطلالة عصرية حادّة.' },
  'Classic': { en: 'Timeless detailing, warm woods and elegant proportion that never dates.', ar: 'تفاصيل خالدة، أخشاب دافئة ونِسَب أنيقة لا تتقادم.' },
  'Luxe': { en: 'Marble, brushed gold and deep tones — quietly opulent and beautifully finished.', ar: 'رخام، ذهب مصقول ودرجات عميقة — فخامة هادئة وتشطيب جميل.' },
  'Scandi': { en: 'Light woods, airy palettes and cosy texture for bright, welcoming rooms.', ar: 'أخشاب فاتحة، ألوان مشرقة وملمس دافئ لغرف مضيئة ومرحّبة.' },
};

const DL_STYLE_PICKS = {
  'Warm Minimalist': [['Warm oak wardrobe', 'wardrobe-planner'], ['Minimalist kitchen', 'kitchen-planner']],
  'Modern': [['Handleless kitchen', 'kitchen-planner'], ['Modern TV unit', 'tv-planner']],
  'Classic': [['Classic wardrobe', 'wardrobe-planner'], ['Timeless kitchen', 'kitchen-planner']],
  'Luxe': [['Luxe kitchen', 'kitchen-planner'], ['Statement wardrobe', 'wardrobe-planner']],
  'Scandi': [['Bright kitchen', 'kitchen-planner'], ['Scandi office', 'office-planner']],
};

const DL_SITE = 'https://closets-website.vercel.app';

// Stable anonymous fingerprint (for gallery voting) — generated once, cached.
function dlFingerprint() {
  try {
    let fp = localStorage.getItem('cl_fp');
    if (!fp) { fp = 'anon-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('cl_fp', fp); }
    return fp;
  } catch (_) { return 'anon-' + Math.random().toString(36).slice(2, 10); }
}

// Derive a stable short referral code from the user (best-effort).
function dlReferralCode(user) {
  if (user && user.referral_code) return String(user.referral_code);
  const seed = (user && (user.id || user.email)) ? String(user.id || user.email) : 'guest';
  let h = 0; for (let i = 0; i < seed.length; i++) { h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
  return 'CL' + h.toString(36).toUpperCase().slice(0, 6);
}

function dlShareCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function dlCopy(text, okMsg) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); }
    else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    toast(okMsg, 'success');
  } catch (_) { toast(okMsg, 'success'); }
}

// Share button row (WhatsApp / X / Facebook / Copy). `msg` is the text, `link` the URL.
function DlShareRow({ msg, link, showFacebook }) {
  const { t } = useI18n();
  const full = msg + ' ' + link;
  const wa = 'https://wa.me/?text=' + encodeURIComponent(full);
  const tw = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(msg) + '&url=' + encodeURIComponent(link);
  const fb = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link);
  const btn = { padding: '9px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6 };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <a href={wa} target="_blank" rel="noreferrer" style={{ ...btn, background: '#25D366', color: '#fff', border: 'none' }}>🟢 {t('dlShareWhatsapp')}</a>
      <a href={tw} target="_blank" rel="noreferrer" style={{ ...btn, background: 'var(--ink)', color: '#fff', border: 'none' }}>𝕏 {t('dlShareX')}</a>
      {showFacebook && <a href={fb} target="_blank" rel="noreferrer" style={{ ...btn, background: '#1877F2', color: '#fff', border: 'none' }}>f {t('dlShareFacebook')}</a>}
      <button type="button" onClick={() => dlCopy(full, t('dlLinkCopied'))} style={btn}>🔗 {t('dlShareCopy')}</button>
    </div>
  );
}

// ── Tab 1: AI Room Glow-Up ──
function DlGlowUp({ user, setPage, openAuth, referral }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const [image, setImage] = useState(null);
  const [style, setStyle] = useState('Warm Minimalist');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState('');
  const [pos, setPos] = useState(55);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  // Redesign → lead magnet: estimate + contact gate → public_lead_submit (auto CUS ID)
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadBusy, setLeadBusy] = useState(false);
  const [lf, setLf] = useState({ name: (user && user.name) || '', phone: (user && user.phone) || '', email: (user && user.email) || '', room: 'Wardrobe', budget: '' });
  const EST = { 'Wardrobe': [400, 1200], 'Walk-in Closet': [800, 2500], 'Kitchen': [1500, 5000], 'TV Unit': [300, 900], 'Home Office': [500, 1800], 'Full Fit-out': [3000, 15000], 'Other': [400, 3000] };
  const estRange = () => { const e = EST[lf.room] || EST.Other; return formatBHDRange(e[0], e[1], CMS_LANG); };
  const glInp = { padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', background: '#fff', color: 'var(--ink)' };
  const sendLead = async () => {
    if (!lf.name.trim() || !lf.phone.trim()) { toast(lang === 'ar' ? 'أدخل الاسم ورقم الهاتف' : 'Enter your name and phone', 'error'); return; }
    setLeadBusy(true);
    const hosted = (typeof url === 'string' && !url.startsWith('data:')) ? url : null;
    try {
      await api('rpc/public_lead_submit', { method: 'POST', body: {
        p_name: lf.name.trim(), p_phone: lf.phone.trim(), p_email: lf.email.trim() || null,
        p_source: 'Website - AI Redesign', p_interest: lf.room,
        p_message: 'AI Room Glow-Up (' + styleLabel(style) + ') · estimate ' + estRange() + (lf.budget ? (' · budget ' + lf.budget) : '') + (hosted ? (' · design: ' + hosted) : ''),
        p_meta: { type: 'ai_redesign', style: style, room: lf.room, budget: lf.budget || null, estimate: estRange(), after_url: hosted },
      } });
      setLeadSent(true); toast(lang === 'ar' ? 'تم إرسال طلبك ✅' : 'Request sent ✅', 'success');
    } catch (_) { toast(lang === 'ar' ? 'حدث خطأ، حاول مجددًا' : 'Something went wrong, try again', 'error'); }
    setLeadBusy(false);
  };
  const styleLabel = (s) => lang === 'ar' ? (DL_STYLE_AR[s] || s) : s;
  const shareLink = DL_SITE + '/?share=' + dlShareCode() + '&ref=' + encodeURIComponent(referral);

  const run = async () => {
    if (!image) { toast(t('dlGuNeedPhoto'), 'error'); return; }
    setBusy(true); setErr(''); setUrl(null); setPublished(false);
    try {
      const r = await aiFetch(SUPA_URL + '/functions/v1/ai_room_redesign', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: image.base64, media_type: image.media_type, style: DL_STYLE_MAP[style] || 'warm_oak', room: 'living', strength: 0.7 }),
      });
      const d = await r.json().catch(() => ({}));
      const out = d && (d.url || d.image || d.image_url || d.result);
      if (r.ok && out) { setUrl(out); setPos(55); }
      else { setErr(t('dlGuErr')); }
    } catch (_) { setErr(t('dlGuErr')); }
    setBusy(false);
  };

  const publish = async () => {
    if (!user) { if (openAuth) openAuth('register'); return; }
    if (!url) return;
    setPublishing(true);
    try {
      const isData = typeof url === 'string' && url.startsWith('data:');
      const row = {
        id: 'vd-' + Date.now().toString(36),
        user_id: user.id || null,
        author_name: (user && user.name) || 'Guest',
        kind: 'glowup',
        title: styleLabel(style) + ' glow-up',
        style: style,
        before_url: image ? (image.dataUrl && image.dataUrl.length < 200000 ? image.dataUrl : null) : null,
        after_url: isData ? null : url,
        image_url: isData ? null : url,
        votes: 0,
        approved: true,
        share_code: dlShareCode(),
        created_at: new Date().toISOString(),
      };
      await api('viral_designs', { method: 'POST', body: [row] });
      setPublished(true);
      toast(t('dlGuPublished'), 'success');
    } catch (e) { handleError(e, { toast, ctx: { action: 'publishGlowup' } }); }   // [RESILIENCE] never claim "published" when the save failed
    setPublishing(false);
  };

  return (
    <div>
      <AiNotice style={{ margin: '0 0 8px' }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1.5px dashed var(--line)', background: '#fff', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', marginBottom: 10 }}>
        {image ? <img src={image.dataUrl} alt="your room" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 9 }} /> : <Spark size={24} color="var(--clay)" />}
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{image ? t('dlGuChange') : t('dlGuUpload')}</span>
        <input type="file" accept="image/*" onChange={e => yasReadImage(e.target.files && e.target.files[0], img => { if (img) { setImage(img); setUrl(null); setErr(''); setPublished(false); } })} style={{ display: 'none' }} />
      </label>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{t('imgHintRoomPhoto')}</div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{t('dlGuPickStyle')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {DL_STYLES.map(s => <YasChip key={s} active={style === s} onClick={() => setStyle(s)}>{styleLabel(s)}</YasChip>)}
      </div>
      <button type="button" className="btn-clay" disabled={busy} onClick={run} style={{ opacity: busy ? .6 : 1 }}>{busy ? t('dlGuRunning') : t('dlGuRun')}</button>
      {busy && <div className="yas-shimmer-box" style={{ height: 260, marginTop: 18 }} />}
      {!busy && err && <div style={{ marginTop: 18, padding: 16, background: 'var(--sand)', borderRadius: 12, color: 'var(--clay-deep)', fontSize: 14 }}>{err}</div>}
      {!busy && url && image && (
        <div style={{ marginTop: 20, background: '#fff', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 40px rgba(20,16,12,.10)' }}>
          {/* Branded share card */}
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--sand)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontWeight: 800, color: 'var(--clay-deep)', fontSize: 14 }}>{t('dlGuCardTitle')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{styleLabel(style)}</div>
          </div>
          <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#000' }}>
            <img src={url} alt={t('dlGuAfter')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <img src={image.dataUrl} alt={t('dlGuBefore')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: 'inset(0 ' + (100 - pos) + '% 0 0)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: pos + '%', width: 2, background: '#fff', boxShadow: '0 0 8px rgba(0,0,0,.4)' }} />
            <span style={{ position: 'absolute', top: 10, insetInlineStart: 10, background: 'rgba(20,16,12,.7)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>{t('dlGuBefore')}</span>
            <span style={{ position: 'absolute', top: 10, insetInlineEnd: 10, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>{t('dlGuAfter')}</span>
            <input type="range" min={0} max={100} value={pos} onChange={e => setPos(Number(e.target.value))} aria-label="Compare before and after" style={{ position: 'absolute', left: '6%', right: '6%', bottom: 12, width: '88%', accentColor: 'var(--clay)' }} />
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, wordBreak: 'break-all' }}>{DL_SITE} · {referral}</div>
            <DlShareRow msg={t('dlGuShareMsg')} link={shareLink} showFacebook />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <a href={url} download="closets-glow-up.jpg" target="_blank" rel="noreferrer" style={{ padding: '9px 14px', borderRadius: 99, background: 'var(--ink)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>⬇ {t('dlGuDownload')}</a>
              <button type="button" onClick={publish} disabled={publishing || published} className="btn-clay" style={{ padding: '9px 16px', borderRadius: 99, fontSize: 13, opacity: (publishing || published) ? .6 : 1 }}>{published ? '✓' : (publishing ? t('dlGuPublishing') : t('dlGuPublish'))}</button>
              <button type="button" onClick={() => { setLeadOpen(true); setLeadSent(false); }} style={{ padding: '9px 14px', borderRadius: 99, background: 'var(--clay)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>💰 {lang === 'ar' ? 'احصل على عرض سعر' : 'Get my free estimate'}</button>
            </div>
            {leadOpen && !leadSent && (
              <div style={{ marginTop: 14, padding: '14px 16px', background: '#fff', border: '1px solid var(--line)', borderRadius: 14 }}>
                <div style={{ fontWeight: 800, color: 'var(--ink)', marginBottom: 3 }}>{lang === 'ar' ? 'احصل على عرض سعر مجاني' : 'Get your free estimate'}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{lang === 'ar' ? 'سيتواصل معك مصمم لتحويل هذه الفكرة إلى واقع.' : 'A designer will call you to make this design real.'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input placeholder={lang === 'ar' ? 'الاسم' : 'Name'} value={lf.name} onChange={e => setLf(p => ({ ...p, name: e.target.value }))} style={glInp} />
                  <input placeholder={lang === 'ar' ? 'الهاتف' : 'Phone'} value={lf.phone} onChange={e => setLf(p => ({ ...p, phone: e.target.value }))} style={glInp} />
                  <input placeholder={lang === 'ar' ? 'البريد (اختياري)' : 'Email (optional)'} value={lf.email} onChange={e => setLf(p => ({ ...p, email: e.target.value }))} style={glInp} />
                  <select value={lf.room} onChange={e => setLf(p => ({ ...p, room: e.target.value }))} style={glInp}>{Object.keys(EST).map(k => <option key={k} value={k}>{k}</option>)}</select>
                </div>
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--sand)', borderRadius: 10, fontSize: 13.5, color: 'var(--clay-deep)', fontWeight: 700 }}>{lang === 'ar' ? 'التقدير المبدئي: ' : 'Ballpark estimate: '}{estRange()}</div>
                <button type="button" className="btn-clay" disabled={leadBusy} onClick={sendLead} style={{ marginTop: 12, opacity: leadBusy ? .6 : 1 }}>{leadBusy ? (lang === 'ar' ? 'جارٍ الإرسال…' : 'Sending…') : (lang === 'ar' ? 'أرسل الطلب' : 'Send request')}</button>
              </div>
            )}
            {leadSent && (
              <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 14, fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>
                ✅ {lang === 'ar' ? 'تم استلام طلبك! سيتواصل معك مصمم قريبًا مع عرض السعر.' : 'Got it! A designer will contact you shortly with your quote.'}
              </div>
            )}
            {!user && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sand)', borderRadius: 12, fontSize: 13, color: 'var(--ink-soft)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <span>{t('dlSoftGate')}</span>
                <button type="button" onClick={() => openAuth && openAuth('register')} style={{ background: 'var(--clay)', color: '#fff', border: 'none', borderRadius: 99, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t('dlSignUp')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Style Quiz ──
const DL_QUIZ = [
  { q: { en: 'Pick a palette', ar: 'اختر لوحة الألوان' }, a: [
    { en: 'Warm neutrals & oak', ar: 'محايد دافئ وبلوط', s: 'Warm Minimalist' },
    { en: 'Black, white & steel', ar: 'أسود وأبيض وفولاذ', s: 'Modern' },
    { en: 'Rich woods & cream', ar: 'أخشاب غنية وكريمي', s: 'Classic' },
    { en: 'Marble & gold', ar: 'رخام وذهب', s: 'Luxe' },
  ] },
  { q: { en: 'Your ideal room feels…', ar: 'غرفتك المثالية تبدو…' }, a: [
    { en: 'Calm & uncluttered', ar: 'هادئة ومرتّبة', s: 'Warm Minimalist' },
    { en: 'Sharp & current', ar: 'أنيقة وعصرية', s: 'Modern' },
    { en: 'Bright & airy', ar: 'مضيئة ومنعشة', s: 'Scandi' },
    { en: 'Rich & opulent', ar: 'غنية وفاخرة', s: 'Luxe' },
  ] },
  { q: { en: 'Choose a material', ar: 'اختر خامة' }, a: [
    { en: 'Natural oak', ar: 'بلوط طبيعي', s: 'Warm Minimalist' },
    { en: 'Matt lacquer', ar: 'دهان مطفي', s: 'Modern' },
    { en: 'Light birch', ar: 'خشب البتولا الفاتح', s: 'Scandi' },
    { en: 'Brushed brass', ar: 'نحاس مصقول', s: 'Luxe' },
  ] },
  { q: { en: 'Cabinet fronts?', ar: 'واجهات الخزائن؟' }, a: [
    { en: 'Handleless & simple', ar: 'بلا مقابض وبسيطة', s: 'Modern' },
    { en: 'Soft-shaker detail', ar: 'تفاصيل كلاسيكية ناعمة', s: 'Classic' },
    { en: 'Flat warm wood', ar: 'خشب دافئ مسطّح', s: 'Warm Minimalist' },
    { en: 'Glossy statement', ar: 'لامعة ولافتة', s: 'Luxe' },
  ] },
  { q: { en: 'Pick a vibe word', ar: 'اختر كلمة تعبّر عنك' }, a: [
    { en: 'Cosy', ar: 'دافئ', s: 'Scandi' },
    { en: 'Effortless', ar: 'بلا جهد', s: 'Warm Minimalist' },
    { en: 'Timeless', ar: 'خالد', s: 'Classic' },
    { en: 'Bold', ar: 'جريء', s: 'Luxe' },
  ] },
  { q: { en: 'Lighting mood?', ar: 'إضاءة الأجواء؟' }, a: [
    { en: 'Soft & warm', ar: 'ناعمة ودافئة', s: 'Warm Minimalist' },
    { en: 'Crisp & bright', ar: 'نقية وساطعة', s: 'Modern' },
    { en: 'Natural daylight', ar: 'ضوء نهار طبيعي', s: 'Scandi' },
    { en: 'Dramatic accents', ar: 'لمسات درامية', s: 'Luxe' },
  ] },
];

function DlQuiz({ user, setPage, referral }) {
  const { t, lang } = useI18n();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const styleLabel = (s) => lang === 'ar' ? (DL_STYLE_AR[s] || s) : s;
  const done = started && step >= DL_QUIZ.length;

  const result = (() => {
    if (!done) return null;
    const tally = {};
    answers.forEach(s => { tally[s] = (tally[s] || 0) + 1; });
    let best = DL_STYLES[0], bestN = -1;
    DL_STYLES.forEach(s => { if ((tally[s] || 0) > bestN) { bestN = tally[s] || 0; best = s; } });
    return best;
  })();

  useEffect(() => {
    if (!done || !result) return;
    // Fire-and-forget quiz result (never blocks / crashes).
    api('viral_quiz_results', { method: 'POST', body: [{ id: 'vq-' + Date.now().toString(36), style: result, user_id: (user && user.id) || null, created_at: new Date().toISOString() }] }).catch(() => {});
  }, [done, result, user]);

  const pick = (s) => { const next = answers.concat([s]); setAnswers(next); setStep(step + 1); };
  const reset = () => { setStarted(false); setStep(0); setAnswers([]); };

  if (!started) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎨</div>
        <p style={{ fontSize: 16, color: 'var(--ink-soft)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.6 }}>{t('dlQuizIntro')}</p>
        <button type="button" className="btn-clay" onClick={() => setStarted(true)}>{t('dlQuizStart')}</button>
      </div>
    );
  }

  if (done && result) {
    const desc = DL_STYLE_DESC[result] ? DL_STYLE_DESC[result][lang] || DL_STYLE_DESC[result].en : '';
    const picks = DL_STYLE_PICKS[result] || [];
    const shareLink = DL_SITE + '/?share=' + dlShareCode() + '&ref=' + encodeURIComponent(referral);
    return (
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 24, boxShadow: '0 12px 40px rgba(20,16,12,.08)' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{t('dlQuizResult')}</div>
        <h3 className="display" style={{ fontSize: 34, color: 'var(--ink)', marginBottom: 12 }}>{styleLabel(result)}</h3>
        <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 20 }}>{desc}</p>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{t('dlQuizMatches')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
          {picks.map(([label, dest]) => (
            <button key={dest + label} type="button" onClick={() => setPage(dest)} style={{ background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 16px', fontSize: 14, fontWeight: 700, color: 'var(--clay-deep)', cursor: 'pointer' }}>{label} {lang === 'ar' ? '←' : '→'}</button>
          ))}
        </div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{t('dlQuizShare')}</div>
        <DlShareRow msg={t('dlQuizShareMsg') + ' ' + styleLabel(result) + '.'} link={shareLink} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" onClick={reset} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 99, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>{t('dlQuizRetake')}</button>
          <button type="button" onClick={() => setPage('planner')} className="btn-clay" style={{ padding: '9px 16px', borderRadius: 99, fontSize: 13 }}>{t('dlQuizExplore')} {lang === 'ar' ? '←' : '→'}</button>
        </div>
      </div>
    );
  }

  const cur = DL_QUIZ[step];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="eyebrow">{t('dlQuizQ')} {step + 1} {t('dlQuizOf')} {DL_QUIZ.length}</div>
        {step > 0 && <button type="button" onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -1)); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{t('dlQuizBack')}</button>}
      </div>
      <div style={{ height: 6, background: 'var(--line)', borderRadius: 99, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: ((step) / DL_QUIZ.length * 100) + '%', background: 'var(--clay)', borderRadius: 99, transition: 'width .3s' }} />
      </div>
      <h3 className="display" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 18 }}>{cur.q[lang] || cur.q.en}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {cur.a.map((opt, i) => (
          <button key={i} type="button" onClick={() => pick(opt.s)} style={{ textAlign: 'start', background: '#fff', border: '1.5px solid var(--line)', borderRadius: 14, padding: '18px 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', transition: 'all .15s' }}>{opt[lang] || opt.en}</button>
        ))}
      </div>
    </div>
  );
}

// ── Tab 3: Refer & Earn ──
function DlRefer({ user, openAuth }) {
  const { t, lang } = useI18n();
  const [count, setCount] = useState(0);
  const [board, setBoard] = useState([]);
  const code = user ? dlReferralCode(user) : '';
  const inviteLink = DL_SITE + '/?ref=' + encodeURIComponent(code);
  const goal = 5;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      // Scoped SECURITY DEFINER RPCs — direct anon reads on customer_referrals are 403 (RLS).
      // (Old direct read also selected referrer_name, a column that doesn't exist.)
      try {
        const n = await acct.referralCount(user);
        if (alive && typeof n === 'number') setCount(n);
      } catch (_) {}
      try {
        const top = await acct.referralLeaderboard();
        if (alive && Array.isArray(top) && top.length) setBoard(top);
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, [user]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎁</div>
        <h3 className="display" style={{ fontSize: 28, color: 'var(--ink)', marginBottom: 10 }}>{t('dlReferTitle')}</h3>
        <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', maxWidth: 460, margin: '0 auto 22px', lineHeight: 1.6 }}>{t('dlReferSub')}</p>
        <button type="button" className="btn-clay" onClick={() => openAuth && openAuth('login')}>{t('dlReferSignIn')}</button>
      </div>
    );
  }

  const pct = Math.min(100, Math.round(count / goal * 100));
  return (
    <div>
      <h3 className="display" style={{ fontSize: 28, color: 'var(--ink)', marginBottom: 8 }}>{t('dlReferTitle')}</h3>
      <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginBottom: 22, lineHeight: 1.6 }}>{t('dlReferSub')}</p>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 22, marginBottom: 18, textAlign: 'center', boxShadow: '0 10px 30px rgba(20,16,12,.06)' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>{t('dlReferYourCode')}</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 3, color: 'var(--clay-deep)', fontFamily: 'monospace', marginBottom: 16, wordBreak: 'break-all' }}>{code}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          <button type="button" onClick={() => dlCopy(code, t('dlReferCodeCopied'))} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 99, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>🔗 {t('dlReferCopyCode')}</button>
          <a href={'https://wa.me/?text=' + encodeURIComponent(t('dlReferInviteMsg') + ' ' + inviteLink)} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 99, padding: '9px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>🟢 {t('dlReferWhatsapp')}</a>
        </div>
      </div>
      <div style={{ background: 'var(--sand)', borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{t('dlReferProgress')}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>{count} / {goal} {t('dlReferInvited')}</div>
        </div>
        <div style={{ height: 10, background: '#fff', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,var(--clay),var(--clay-deep))', borderRadius: 99, transition: 'width .4s' }} />
        </div>
      </div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>🏆 {t('dlReferLeaderboard')}</div>
      {board.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {board.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? 'var(--clay)' : 'var(--muted)', width: 26 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{row.name}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>{row.n} {t('dlReferInvites')}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '16px', background: '#fff', border: '1px dashed var(--line)', borderRadius: 12, fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center' }}>{t('dlReferLbEmpty')}</div>
      )}
    </div>
  );
}

// ── Tab 4: Community Gallery ──
function DlGallery({ setTab }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const [items, setItems] = useState(null);
  const [voted, setVoted] = useState({});
  const fp = dlFingerprint();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await api('viral_designs?approved=eq.true&deleted_at=is.null&order=votes.desc,created_at.desc&limit=40');
        if (alive) setItems(Array.isArray(rows) ? rows : []);
      } catch (_) { if (alive) setItems([]); }
    })();
    try { setVoted(JSON.parse(localStorage.getItem('cl_voted') || '{}') || {}); } catch (_) {}
    return () => { alive = false; };
  }, []);

  const vote = async (d) => {
    if (voted[d.id]) return;
    const nv = { ...voted, [d.id]: 1 };
    setVoted(nv);
    try { localStorage.setItem('cl_voted', JSON.stringify(nv)); } catch (_) {}
    setItems(list => (list || []).map(x => x.id === d.id ? { ...x, votes: (x.votes || 0) + 1 } : x));
    try { await api('rpc/viral_vote', { method: 'POST', body: { p_design_id: d.id, p_voter: fp } }); } catch (_) {}
  };

  const imgOf = (d) => d && (d.image_url || d.after_url || d.before_url) || '';
  const abs = (u) => { if (!u) return u; if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u; try { return new URL(u, window.location.origin).href; } catch (_) { return u; } };

  if (items === null) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>{t('dlGalLoading')}</div>;
  }

  const featured = items.length ? (items.find(x => x.featured) || items[0]) : null;
  const rest = featured ? items.filter(x => x.id !== featured.id) : items;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)', margin: 0, maxWidth: 460, lineHeight: 1.6 }}>{t('dlGalSub')}</p>
        <button type="button" className="btn-clay" onClick={() => setTab('glowup')} style={{ borderRadius: 99, padding: '9px 16px', fontSize: 13, flexShrink: 0 }}>✨ {t('dlGalPublishCta')}</button>
      </div>
      {!items.length && (
        <div style={{ padding: '40px 20px', background: '#fff', border: '1px dashed var(--line)', borderRadius: 16, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 15 }}>{t('dlGalEmpty')}</div>
      )}
      {featured && (
        <div style={{ background: '#fff', border: '2px solid var(--clay)', borderRadius: 18, overflow: 'hidden', marginBottom: 22, boxShadow: '0 14px 44px rgba(168,75,41,.14)' }}>
          <div style={{ padding: '10px 16px', background: 'var(--clay)', color: '#fff', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>👑 {t('dlGalDesignOfMonth')}</div>
          {imgOf(featured) ? <img src={abs(imgOf(featured))} alt={featured.title || 'design'} style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} /> : <div style={{ width: '100%', aspectRatio: '16 / 9', background: 'var(--sand)' }} />}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{featured.title || (lang === 'ar' ? 'تصميم' : 'Design')}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('dlGalBy')} {featured.author_name || 'Guest'}{featured.style ? ' · ' + featured.style : ''}</div>
            </div>
            <button type="button" onClick={() => vote(featured)} disabled={!!voted[featured.id]} style={{ background: voted[featured.id] ? 'var(--sand)' : 'var(--clay)', color: voted[featured.id] ? 'var(--clay-deep)' : '#fff', border: 'none', borderRadius: 99, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: voted[featured.id] ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>❤ {featured.votes || 0}</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 14 }}>
        {rest.map(d => (
          <div key={d.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {imgOf(d) ? <img src={abs(imgOf(d))} alt={d.title || 'design'} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} /> : <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'var(--sand)' }} />}
            <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{d.title || (lang === 'ar' ? 'تصميم' : 'Design')}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('dlGalBy')} {d.author_name || 'Guest'}</div>
              <button type="button" onClick={() => vote(d)} disabled={!!voted[d.id]} style={{ marginTop: 'auto', background: voted[d.id] ? 'var(--sand)' : '#fff', color: voted[d.id] ? 'var(--clay-deep)' : 'var(--ink)', border: '1px solid var(--line)', borderRadius: 99, padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: voted[d.id] ? 'default' : 'pointer' }}>❤ {voted[d.id] ? t('dlGalVoted') : t('dlGalVote')} · {d.votes || 0}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Design Lab page shell (hero + 4-tab switcher) ──
function DesignLabPage({ user, setPage, openAuth }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const rtl = lang === 'ar';
  const [tab, setTab] = useState('glowup');
  const referral = dlReferralCode(user);
  const tabs = [
    ['glowup', '✨ ' + t('dlTabGlowup')],
    ['quiz', '🎨 ' + t('dlTabQuiz')],
    ['refer', '🎁 ' + t('dlTabRefer')],
    ['gallery', '🖼 ' + t('dlTabGallery')],
  ];
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', paddingTop: mobile ? 88 : 64, paddingBottom: 90, background: 'var(--cream)' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--clay-deep), var(--clay))', color: '#fff', padding: mobile ? '40px 24px 44px' : '64px 32px 68px', textAlign: rtl ? 'right' : 'left' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: .85, marginBottom: 14 }}>{t('dlHeroEyebrow')}</div>
          <h1 className="display" style={{ fontSize: mobile ? 34 : 54, lineHeight: 1.05, marginBottom: 16, maxWidth: 760 }}>{t('dlHeroTitle')}</h1>
          <p style={{ fontSize: mobile ? 16 : 19, opacity: .92, maxWidth: 620, lineHeight: 1.6 }}>{t('dlHeroSub')}</p>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: mobile ? '0 20px' : '0 32px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: mobile ? '20px 0 22px' : '26px 0 28px', overflowX: 'auto' }}>
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} style={{ padding: mobile ? '10px 14px' : '11px 18px', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', border: '1.5px solid ' + (tab === id ? 'var(--clay)' : 'var(--line)'), background: tab === id ? 'var(--clay)' : '#fff', color: tab === id ? '#fff' : 'var(--ink-soft)', flexShrink: 0 }}>{label}</button>
          ))}
        </div>
        <div style={{ maxWidth: 760 }}>
          {tab === 'glowup' && <DlGlowUp user={user} setPage={setPage} openAuth={openAuth} referral={referral} />}
          {tab === 'quiz' && <DlQuiz user={user} setPage={setPage} referral={referral} />}
          {tab === 'refer' && <DlRefer user={user} openAuth={openAuth} />}
        </div>
        {tab === 'gallery' && <div style={{ marginTop: 4 }}><DlGallery setTab={setTab} /></div>}
      </div>
    </div>
  );
}

export { DesignLabPage };
