/* =============================================================================
 * Neo Design Studio — website shell [WEB-STUDIO 2026-10-31]
 *   /studio                 the 8 designers
 *   /studio/<kind>          one designer (kitchen | closets | custom | bathroom | laundry | tv | office | doors)
 *                           ?design=<id> re-opens a saved design · ?new=1 starts a fresh one
 *   /studio/account         sign in / create account · My designs & quote requests
 * The designers are the Bonsai Neo studios (src/studio/hub, ported 1:1). Admin options (price mode, designers on/off, exports)
 * come from studio_public_settings(), set in Bonsai > Website Studio.
 * ===========================================================================*/
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './studio.css';
import { DESIGNERS, byKind, designerComponent, restoreStorage, nameOf } from './designers';
import { setStudio, useStudio, fmtBD, indicative } from './studioStore';
import { getSession, onSession, signOut, rpc, publicRpc, consumeUrlSession, setNewPassword, authError } from './customerAuth';
import AuthForm from './AuthDialog';
import { factRows } from './QuoteDialog';

const LANG_KEY = 'closets_lang';
const readLang = () => { try { return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } };
const parse = () => {
  const p = (window.location.pathname || '/studio').replace(/\/+$/, '').split('/').filter(Boolean);   // ['studio', kind?]
  return { seg: p[1] || '', q: new URLSearchParams(window.location.search) };
};
function go(path) { window.history.pushState(null, '', path); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo(0, 0); }

const STATUS = {
  draft: ['Draft', 'مسودة'], requested: ['Quote requested', 'تم طلب عرض السعر'], in_review: ['With our designers', 'لدى المصممين'],
  quoted: ['Quote sent', 'تم إرسال العرض'], closed: ['Closed', 'مغلق'],
};

function useToast() {
  const [t, setT] = useState(null); const tm = useRef(null);
  const toast = useCallback((msg, kind) => { setT({ msg: String(msg || ''), kind: kind || 'info' }); clearTimeout(tm.current); tm.current = setTimeout(() => setT(null), 3200); }, []);
  useEffect(() => () => clearTimeout(tm.current), []);
  return [t, toast];
}

export default function StudioRoot() {
  const [route, setRoute] = useState(parse);
  const [lang, setLangState] = useState(readLang);
  const [session, setSession] = useState(getSession());
  const [authAsk, setAuthAsk] = useState(null);           // { reason, resolve }
  const [toastState, toast] = useToast();
  const st = useStudio();
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);

  useEffect(() => { const f = () => setRoute(parse()); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  useEffect(() => onSession(setSession), []);
  useEffect(() => { publicRpc('studio_public_settings').then((s) => { if (s && typeof s === 'object') setStudio({ settings: { price_mode: 'indicative', designers: {}, show_exports: false, ...s } }); }).catch(() => {}); }, []);
  useEffect(() => {
    setStudio({ lang });
    document.documentElement.lang = lang; document.documentElement.dir = ar ? 'rtl' : 'ltr';
  }, [lang, ar]);
  useEffect(() => {
    window.__hubToast = toast; window.__hubAlert = (o) => toast((o && o.message) || String(o || ''), 'info');
    window.__hubBrand = { name: 'The Closets', logo: '/logo192.png' };
    setStudio({ openAuth: (reason) => new Promise((resolve) => setAuthAsk({ reason, resolve })) });
  }, [toast]);
  const setLang = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } setLangState(l); };

  const kind = byKind(route.seg) ? route.seg : null;
  const enabled = (k) => !st.settings.designers || st.settings.designers[k] !== false;
  useEffect(() => {
    const d = kind ? byKind(kind) : null;
    document.title = (d ? (ar ? d.ar : d.en) : route.seg === 'account' ? L('My designs', 'تصاميمي') : L('Neo Design Studio', 'استوديو نيو للتصميم')) + ' — The Closets';
  }, [kind, route.seg, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAuth = (ok) => { if (authAsk) authAsk.resolve(!!ok); setAuthAsk(null); };

  return (
    <div className={`ws-root ws-price-${st.settings.price_mode || 'indicative'}${st.settings.show_exports ? ' ws-exports' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={lang}>
      <header className="ws-bar">
        <a className="ws-brand" href="/" aria-label="The Closets — home">THE CLOSETS</a>
        <button type="button" className="ws-crumb" onClick={() => go('/studio')}>{L('Neo Design Studio', 'استوديو نيو للتصميم')}</button>
        {kind && (
          <select className="ws-switch" value={kind} aria-label={L('Designer', 'المصمم')} onChange={(e) => go('/studio/' + e.target.value)}>
            {DESIGNERS.filter((d) => enabled(d.kind)).map((d) => <option key={d.kind} value={d.kind}>{ar ? d.short[1] : d.short[0]}</option>)}
          </select>
        )}
        <span className="ws-grow" />
        <button type="button" className="ws-lang" onClick={() => setLang(ar ? 'en' : 'ar')} aria-label={ar ? 'English' : 'العربية'}>{ar ? 'EN' : 'ع'}</button>
        <button type="button" className="ws-acct" onClick={() => go('/studio/account')}>
          {session ? L('My designs', 'تصاميمي') : L('Sign in', 'دخول')}
        </button>
      </header>

      <main className="ws-main">
        {kind ? (enabled(kind) ? <DesignerPage key={kind + (route.q.get('design') || '') + (route.q.get('new') || '')} kind={kind} q={route.q} lang={lang} toast={toast} />
          : <div className="ws-page"><p>{L('This designer is not available right now.', 'هذا المصمم غير متاح حاليًا.')}</p><button type="button" className="wsq-btn" onClick={() => go('/studio')}>{L('All designers', 'جميع المصممين')}</button></div>)
          : route.seg === 'account' ? <AccountPage lang={lang} session={session} toast={toast} />
          : <Gallery lang={lang} enabled={enabled} session={session} />}
      </main>

      {authAsk && (
        <div className="wsq-scrim wsq-scrim-top" dir={ar ? 'rtl' : 'ltr'} onMouseDown={(e) => { if (e.target === e.currentTarget) closeAuth(false); }}>
          <div className="wsq wsq-narrow" role="dialog" aria-modal="true">
            <div className="wsq-head"><span /><button type="button" className="wsq-x" onClick={() => closeAuth(false)} aria-label={L('Close', 'إغلاق')}>×</button></div>
            <div className="wsq-body"><AuthForm lang={lang} reason={authAsk.reason} onDone={(ok) => closeAuth(ok)} /></div>
          </div>
        </div>
      )}
      {toastState && <div className={`ws-toast ws-toast-${toastState.kind}`} role="status">{toastState.msg}</div>}
    </div>
  );
}

function Gallery({ lang, enabled, session }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  return (
    <div className="ws-page">
      <section className="ws-hero">
        <p className="ws-eyebrow">{L('Neo Design Studio', 'استوديو نيو للتصميم')}</p>
        <h1>{L('Design it yourself. We make it.', 'صمّمه بنفسك. ونحن نصنعه.')}</h1>
        <p className="ws-lede">{L('The same parametric designers our team uses in the showroom — in 2D and 3D, millimetre-accurate. Save your design to your account and request a quote when you are ready.',
          'نفس أدوات التصميم التي يستخدمها فريقنا في المعرض — ثنائية وثلاثية الأبعاد وبدقة الملّيمتر. احفظ تصميمك في حسابك واطلب عرض سعر متى كنت جاهزًا.')}</p>
        {!session && <button type="button" className="wsq-btn" onClick={() => go('/studio/account')}>{L('Sign in or create a free account', 'سجّل الدخول أو أنشئ حسابًا مجانيًا')}</button>}
      </section>
      <div className="ws-grid">
        {DESIGNERS.filter((d) => enabled(d.kind)).map((d) => (
          <a key={d.kind} className="ws-card" href={'/studio/' + d.kind} onClick={(e) => { e.preventDefault(); go('/studio/' + d.kind); }} data-testid={'ws-card-' + d.kind}>
            <span className="ws-card-ico" aria-hidden="true">{d.icon}</span>
            <span className="ws-card-t">{ar ? d.ar : d.en}</span>
            <span className="ws-card-s">{ar ? d.blurb[1] : d.blurb[0]}</span>
            <span className="ws-card-go">{L('Start designing →', 'ابدأ التصميم ←')}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function DesignerPage({ kind, q, lang, toast }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const designId = q.get('design');
  const [ready, setReady] = useState(!designId && !q.get('new'));
  const [err, setErr] = useState('');
  const Comp = useMemo(() => designerComponent(kind), [kind]);
  const d = byKind(kind);

  useEffect(() => {
    let on = true;
    if (q.get('new')) { restoreStorage(kind, null); setStudio({ kind, designId: null, title: '', status: 'draft' }); window.history.replaceState(null, '', '/studio/' + kind); setReady(true); return undefined; }
    if (!designId) { setStudio({ kind, designId: null, title: '', status: 'draft' }); return undefined; }
    if (!getSession()) { setErr(L('Sign in to open your saved design.', 'سجّل الدخول لفتح تصميمك المحفوظ.')); return undefined; }
    rpc('cp_studio_design_get', { p_id: designId }).then((row) => {
      if (!on) return;
      if (!row || row.kind !== kind) { setErr(L('Design not found.', 'لم يتم العثور على التصميم.')); return; }
      restoreStorage(kind, (row.design && row.design.storage) || null);
      setStudio({ kind, designId: row.id, title: row.title, status: row.status });
      setReady(true);
    }).catch((e) => { if (on) setErr(authError(e, ar)); });
    return () => { on = false; };
  }, [kind, designId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <div className="ws-page"><p>{err}</p><button type="button" className="wsq-btn" onClick={() => go('/studio/account')}>{L('My designs', 'تصاميمي')}</button></div>;
  if (!ready) return <div className="ws-loading">{L('Opening your design…', 'جارٍ فتح تصميمك…')}</div>;
  return (
    <div className="ws-designer" data-kind={kind}>
      <DesignBar kind={kind} lang={lang} />
      <ErrorCatcher lang={lang}>
        <Suspense fallback={<div className="ws-loading">{L('Loading the ' + d.en + '…', 'جارٍ تحميل ' + d.ar + '…')}</div>}>
          <Comp toast={toast} currentUser={null} startLang={lang} onSendToQuote={null} {...(d.props || {})} />
        </Suspense>
      </ErrorCatcher>
    </div>
  );
}

function DesignBar({ kind, lang }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const st = useStudio();
  if (!st.designId) return null;
  const s = STATUS[st.status] || STATUS.draft;
  return (
    <div className="ws-dbar">
      <span>{L('Editing', 'تعديل')}: <b>{st.title}</b></span>
      <span className={`ws-chip ws-chip-${st.status}`}>{ar ? s[1] : s[0]}</span>
      {st.status !== 'draft' && <span className="ws-dbar-note">{L('Changes are saved as a new copy.', 'تُحفظ التعديلات كنسخة جديدة.')}</span>}
      <span className="ws-grow" />
      <button type="button" className="wsa-link" onClick={() => go('/studio/' + kind + '?new=1')}>{L('Start a new design', 'ابدأ تصميمًا جديدًا')}</button>
    </div>
  );
}

class ErrorCatcher extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { try { console.error('[studio]', err); } catch (e) { /* ignore */ } }
  render() {
    const ar = this.props.lang === 'ar';
    if (this.state.err) return (
      <div className="ws-page"><h2>{ar ? 'حدث خطأ في المصمم' : 'The designer hit a problem'}</h2>
        <p>{ar ? 'أعد تحميل الصفحة. إذا تكرر ذلك فابدأ تصميمًا جديدًا.' : 'Reload the page. If it happens again, start a new design.'}</p>
        <button type="button" className="wsq-btn" onClick={() => window.location.reload()}>{ar ? 'إعادة التحميل' : 'Reload'}</button></div>);
    return this.props.children;
  }
}

function AccountPage({ lang, session, toast }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const st = useStudio();
  const [list, setList] = useState(null);
  const [profile, setProfile] = useState(null);
  const [linkType, setLinkType] = useState(null);
  const [err, setErr] = useState('');
  const [pw, setPw] = useState('');

  useEffect(() => { consumeUrlSession().then((t) => { if (t) setLinkType(t); }).catch((e) => setErr(authError(e, ar))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    if (!getSession()) { setList(null); return; }
    rpc('cp_studio_designs_list', {}).then((r) => setList(Array.isArray(r) ? r : [])).catch((e) => { setErr(authError(e, ar)); setList([]); });
    rpc('cp_profile_get', {}).then(setProfile).catch(() => {});
  }, [ar]);
  useEffect(() => { load(); }, [session, load]);

  if (linkType === 'recovery' && session) {
    return (
      <div className="ws-page ws-narrow">
        <form className="wsa" onSubmit={async (e) => { e.preventDefault(); try { await setNewPassword(pw); setLinkType(null); toast(L('Password updated.', 'تم تحديث كلمة المرور.')); } catch (e2) { setErr(authError(e2, ar)); } }}>
          <h3>{L('Choose a new password', 'اختر كلمة مرور جديدة')}</h3>
          <label className="wsq-field"><span>{L('New password', 'كلمة المرور الجديدة')}</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
          {err && <div className="wsq-err">{err}</div>}
          <button type="submit" className="wsq-btn wsq-primary">{L('Save password', 'حفظ كلمة المرور')}</button>
        </form>
      </div>
    );
  }
  if (!session) {
    return <div className="ws-page ws-narrow">{err && <div className="wsq-err">{err}</div>}<AuthForm lang={lang} onDone={() => load()} /></div>;
  }
  const mode = st.settings.price_mode || 'indicative';
  const del = async (row) => {
    if (!window.confirm(L(`Delete "${row.title}"?`, `حذف "${row.title}"؟`))) return;
    try { await rpc('cp_studio_design_delete', { p_id: row.id }); load(); } catch (e) { toast(authError(e, ar), 'error'); }
  };
  return (
    <div className="ws-page">
      <div className="ws-acct-head">
        <div>
          <p className="ws-eyebrow">{L('My account', 'حسابي')}</p>
          <h1>{(profile && profile.name) || (session.user && (session.user.name || session.user.email)) || ''}</h1>
          <p className="ws-lede">{session.user && session.user.email}</p>
        </div>
        <button type="button" className="wsq-btn" onClick={async () => { await signOut(); toast(L('Signed out.', 'تم تسجيل الخروج.')); }}>{L('Sign out', 'تسجيل الخروج')}</button>
      </div>
      {linkType === 'signup' && <div className="ws-note">{L('Your e-mail is confirmed — welcome!', 'تم تأكيد بريدك الإلكتروني — مرحبًا بك!')}</div>}
      {err && <div className="wsq-err">{err}</div>}
      <h2 className="ws-h2">{L('My designs', 'تصاميمي')}</h2>
      {list == null ? <div className="ws-loading">{L('Loading…', 'جارٍ التحميل…')}</div>
        : list.length === 0 ? (
          <div className="ws-empty">
            <p>{L('No saved designs yet. Pick a designer, then use “Get quote” to save it here.', 'لا توجد تصاميم محفوظة بعد. اختر مصممًا ثم استخدم «اطلب عرض سعر» لحفظه هنا.')}</p>
            <button type="button" className="wsq-btn wsq-primary" onClick={() => go('/studio')}>{L('Open the designers', 'افتح المصممين')}</button>
          </div>
        ) : (
          <div className="ws-list">
            {list.map((r) => {
              const s = STATUS[r.status] || STATUS.draft; const sm = r.summary || {};
              const rows = factRows(sm.facts, ar).slice(0, 2);
              return (
                <div key={r.id} className="ws-item" data-testid="ws-design">
                  {sm.thumb ? <img src={sm.thumb} alt="" /> : <div className="ws-item-ph">{(byKind(r.kind) || {}).icon}</div>}
                  <div className="ws-item-b">
                    <div className="ws-item-k">{nameOf(r.kind, ar)}</div>
                    <div className="ws-item-t">{r.title}</div>
                    {rows.map(([k, v]) => <div key={k} className="ws-item-f">{k}: {v}</div>)}
                    <div className="ws-item-m">
                      <span className={`ws-chip ws-chip-${r.status}`}>{ar ? s[1] : s[0]}</span>
                      {r.quote_no && <span>{L('Quote', 'العرض')} {r.quote_no}</span>}
                      {mode !== 'none' && r.estimate > 0 && <span>{mode === 'full' ? fmtBD(r.estimate) : L('from ', 'من ') + fmtBD(indicative(r.estimate)).replace('.000', '')}</span>}
                      <span className="ws-item-d">{new Date(r.updated_at).toLocaleDateString(ar ? 'ar-BH' : 'en-GB')}</span>
                    </div>
                  </div>
                  <div className="ws-item-a">
                    <button type="button" className="wsq-btn wsq-primary" onClick={() => go(`/studio/${r.kind}?design=${r.id}`)}>{r.status === 'draft' ? L('Open', 'فتح') : L('View', 'عرض')}</button>
                    {r.status === 'draft' && <button type="button" className="wsa-link" onClick={() => del(r)}>{L('Delete', 'حذف')}</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
