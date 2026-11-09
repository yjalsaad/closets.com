/* [IKHTARHA GAMES 2026-11-09] /ikhtarha/games — the Games Hub, an extra activity of the اختارها campaign.
 * Customer enters name + OneQuote quotation number → chooses one of six games → plays → the server draws the prize from the
 * Games Hub prize pool (separate from the campaign's main reward boxes) → result screen with the winning code.
 * Routes: /ikhtarha/games · /ikhtarha/games/<game> · /ikhtarha/games/verify?t=…   (?demo=1 = sample run, nothing saved) */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './api';
import { GAMES } from './Games';
import { Confetti, isMuted, setMuted, sfx, valueText, money } from './fx';
import '../campaign/ikhtarha.css';
import './games.css';

const LANG_KEY = 'closets_lang';
const BASE = '/ikhtarha/games';
const S = {
  title: ['Choose your game', 'اختر لعبتك'], sub: ['Your next surprise is just one game away.', 'مفاجأتك القادمة على بُعد لعبة واحدة.'],
  enterT: ['Enter the Games Hub', 'ادخل إلى صالة الألعاب'], enterS: ['Enter your name and mobile number to play. Have a The Closets quotation? Add its number too.', 'أدخل اسمك ورقم جوالك للعب. لديك عرض سعر من الخزائن؟ أضف رقمه أيضًا.'], enterQ: ['Use the name and quotation number on your The Closets quotation.', 'استخدم الاسم ورقم عرض السعر الموجودين في عرض السعر من الخزائن.'],
  name: ['Your name', 'اسمك'], quote: ['Quotation number', 'رقم عرض السعر'], quoteOpt: ['Quotation number (optional)', 'رقم عرض السعر (اختياري)'], phone: ['Mobile number', 'رقم الجوال'], mobile: ['Mobile', 'الجوال'],
  invalid_phone: ['Please enter a valid mobile number.', 'من فضلك أدخل رقم جوال صحيح.'], invalid_name: ['Please enter your name.', 'من فضلك أدخل اسمك.'],
  quote_required: ['Please enter your quotation number.', 'من فضلك أدخل رقم عرض السعر.'], go: ['Enter', 'دخول'], checking: ['Checking…', 'جارٍ التحقق…'],
  invalid: ['We couldn’t match that name and quotation number. Check both and try again.', 'لم نتمكن من مطابقة الاسم ورقم عرض السعر. تأكد منهما وحاول مرة أخرى.'],
  not_eligible: ['This quotation isn’t eligible for the games yet. Ask your consultant.', 'عرض السعر هذا غير مؤهل للألعاب بعد. تواصل مع مستشارك.'],
  closed: ['The Games Hub is closed right now.', 'صالة الألعاب مغلقة حاليًا.'], expired: ['The Games Hub has ended. Thank you for playing.', 'انتهت صالة الألعاب. شكرًا لمشاركتك.'],
  rate_limited: ['Too many tries. Please wait a few minutes.', 'محاولات كثيرة. انتظر بضع دقائق من فضلك.'], failed: ['Connection failed. Please try again.', 'تعذّر الاتصال. حاول مرة أخرى.'],
  session: ['Your session ended. Please enter again.', 'انتهت جلستك. ادخل مرة أخرى من فضلك.'], sold_out: ['All prizes for this game have been given out.', 'تم توزيع جميع جوائز هذه اللعبة.'],
  no_attempts: ['You have already played this game.', 'لقد لعبت هذه اللعبة مسبقًا.'], locked: ['This game isn’t available right now.', 'هذه اللعبة غير متاحة حاليًا.'],
  busy: ['Busy — please try again.', 'مشغول — حاول مرة أخرى.'], invalid_game: ['This game doesn’t exist.', 'هذه اللعبة غير موجودة.'],
  hello: ['Hello, {n}', 'أهلًا {n}'], play: ['Play now', 'العب الآن'], played: ['Played', 'تم اللعب'], lockedS: ['Locked', 'مقفلة'], available: ['Available', 'متاحة'],
  left: ['{n} left', 'متبقي {n}'], back: ['Back to games', 'العودة للألعاب'], how: ['How to play', 'طريقة اللعب'], sound: ['Sound', 'الصوت'],
  won: ['You won!', 'مبروك! ربحت'], lost: ['Not this time', 'ليس هذه المرة'], lostS: ['Thanks for playing — try another game.', 'شكرًا لمشاركتك — جرّب لعبة أخرى.'],
  code: ['Winning code', 'رمز الفوز'], valid: ['Valid until', 'صالحة حتى'], disc: ['Discount value', 'قيمة الخصم'], quoteNo: ['Quotation', 'عرض السعر'],
  keep: ['Show this code with your mobile number at The Closets when you order.', 'اعرض هذا الرمز مع رقم جوالك في الخزائن عند الطلب.'],
  yourPrizes: ['Your prizes', 'جوائزك'], sample: ['Sample preview — prizes here are not real', 'معاينة تجريبية — الجوائز هنا ليست حقيقية'],
  extra: ['An extra activity of the Ikhtarha campaign — separate from your reward box.', 'نشاط إضافي في حملة اختارها — منفصل عن صندوق جائزتك.'],
  verifyT: ['Prize check', 'التحقق من الجائزة'], vValid: ['Valid prize', 'جائزة صالحة'], vRedeemed: ['Already used', 'تم استخدامها'], vExpired: ['Expired', 'منتهية'], vBad: ['We couldn’t verify this prize.', 'تعذّر التحقق من هذه الجائزة.'],
  print: ['Print', 'طباعة'], change: ['Not you?', 'لست أنت؟'], retry: ['Try again', 'حاول مرة أخرى'], loading: ['Loading…', 'جارٍ التحميل…'],
};
const t = (k, ar, v) => { let s = (S[k] || [k, k])[ar ? 1 : 0]; if (v) Object.entries(v).forEach(([a, b]) => { s = s.replace('{' + a + '}', b); }); return s; };
const route = () => { const p = (window.location.pathname || '').replace(/\/+$/, ''); const m = p.match(/^\/ikhtarha\/games\/([a-z-]+)$/i); return m ? m[1].toLowerCase() : null; };
const keepQs = () => (api.DEMO ? '?demo=1' : '');

export default function GamesRoot() {
  const [lang, setLangS] = useState(() => { try { return new URLSearchParams(window.location.search).get('lang') || localStorage.getItem(LANG_KEY) || 'ar'; } catch (e) { return 'ar'; } });
  const ar = lang !== 'en';
  const setLang = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } setLangS(l); };
  const [slug, setSlug] = useState(route);
  const [hub, setHub] = useState(undefined);           // undefined loading · null error · object
  const [sess, setSess] = useState(() => api.loadSession());
  const [st, setSt] = useState(null);                  // ikg_state
  const [muted, setMutedS] = useState(isMuted());
  const [msg, setMsg] = useState(null);

  useEffect(() => { document.documentElement.lang = ar ? 'ar' : 'en'; document.documentElement.dir = ar ? 'rtl' : 'ltr'; document.title = (ar ? 'ألعاب اختارها' : 'Ikhtarha Games') + ' — The Closets'; }, [ar]);
  useEffect(() => {
    if (!document.getElementById('ikg-font')) { const l = document.createElement('link'); l.id = 'ikg-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Alexandria:wght@500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'; document.head.appendChild(l); }
    api.hub().then(setHub).catch(() => setHub(null));
    const onPop = () => setSlug(route()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop);
  }, []);
  const refresh = useCallback(async (s = sess) => {
    if (!s) return null;
    const r = await api.state(s.token).catch(() => null);
    if (r && r.ok) { setSt(r); return r; }
    if (r && r.state === 'session') { api.clearSession(); setSess(null); setSt(null); setMsg('session'); }
    return null;
  }, [sess]);
  useEffect(() => { if (sess) refresh(sess); }, [sess, refresh]);

  const nav = (to) => { window.history.pushState(null, '', (to ? BASE + '/' + to : BASE) + keepQs()); setSlug(to); window.scrollTo(0, 0); };
  const toggleSound = () => { const m = !muted; setMuted(m); setMutedS(m); if (!m) sfx('tap'); };

  if (slug === 'verify') return <Verify ar={ar} setLang={setLang} />;
  const game = slug ? GAMES.find((g) => g.id === slug) : null;

  return (
    <div className="ikg" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      {api.DEMO && <div className="ikg-demo" role="note">{t('sample', ar)}</div>}
      <header className="ikg-head">
        <a href="/" className="ikg-logo" aria-label="The Closets"><img src="/brand/closets-logo-white.png" alt="The Closets" /></a>
        <button type="button" className="ikg-brand" onClick={() => nav(null)}><img src="/brand/ikhtarha/logo-light.png" alt={ar ? 'اختارها' : 'Ikhtarha'} /></button>
        <span className="ikg-grow" />
        <button type="button" className="ikg-icon" aria-pressed={!muted} onClick={toggleSound} title={t('sound', ar)} aria-label={t('sound', ar)}>{muted ? '🔈' : '🔊'}</button>
        <button type="button" className="ikg-lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'EN' : 'ع'}</button>
      </header>
      <main className="ikg-main">
        {hub === undefined ? <div className="ikg-center"><span className="ikg-spin" aria-label={t('loading', ar)} /></div>
          : !hub ? <Notice ar={ar} k="failed" onRetry={() => { setHub(undefined); api.hub().then(setHub).catch(() => setHub(null)); }} />
          : !hub.live ? <Notice ar={ar} k="closed" />
          : !sess ? <Enter ar={ar} msg={msg} req={!!hub.require_quote} onIn={(s) => { api.saveSession(s); setMsg(null); setSess(s); setSt({ ok: true, games: s.games, wins: [], first_name: s.first_name, quote_no: s.quote_no, phone_tail: s.phone_tail }); }} />
          : game ? <Play ar={ar} game={game} sess={sess} st={st} hub={hub} onBack={() => { refresh(); nav(null); }} onRefresh={refresh} />
          : <Hub ar={ar} st={st} onPlay={nav} onOut={() => { api.clearSession(); setSess(null); setSt(null); }} />}
      </main>
      <footer className="ikg-foot">{t('extra', ar)}</footer>
    </div>
  );
}

function Notice({ ar, k, onRetry }) {
  return <div className="ikg-center"><div className="ikg-panel ikg-notice" role="status"><h2>{t(k, ar)}</h2>{onRetry && <button type="button" className="ikg-btn ikg-btn-main" onClick={onRetry}>{t('retry', ar)}</button>}<a className="ikg-link" href="/campaign/ikhtarha">{ar ? 'صفحة حملة اختارها' : 'Ikhtarha campaign page'}</a></div></div>;
}

function Enter({ ar, msg, onIn, req }) {
  const [f, setF] = useState(api.DEMO ? { name: 'Sara', phone: '3311 2233', quote_no: '', website: '' } : { name: '', phone: '', quote_no: '', website: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(msg);
  const submit = async (e) => {
    e.preventDefault(); if (busy) return;
    if (f.name.trim().length < 2) { setErr('invalid_name'); return; }
    if (req && !f.quote_no.trim()) { setErr('quote_required'); return; }
    if (!req && !f.quote_no.trim() && f.phone.replace(/\D/g, '').length < 8) { setErr('invalid_phone'); return; }
    setBusy(true); setErr(null);
    try { const r = await api.enter({ name: f.name.trim(), phone: f.phone.trim(), quote_no: f.quote_no.trim(), website: f.website });
      if (r && r.ok) { sfx('match'); onIn(r); } else setErr((r && r.state) || 'invalid');
    } catch (er) { setErr('failed'); } finally { setBusy(false); }
  };
  return (
    <section className="ikg-enter">
      <div className="ikg-hero-copy">
        <p className="ikg-eyebrow">{ar ? 'ألعاب اختارها' : 'Ikhtarha games'}</p>
        <h1 className="ikg-display">{t('title', ar)}</h1>
        <p className="ikg-lead">{t('sub', ar)}</p>
        <div className="ikg-hero-stack" aria-hidden="true">{GAMES.map((g, i) => <span key={g.id} className={'ikg-prev ikg-prev-' + g.id} style={{ '--i': i }}><Preview id={g.id} /></span>)}</div>
      </div>
      <form className="ikg-panel ikg-form" onSubmit={submit} noValidate aria-busy={busy}>
        <h2>{t('enterT', ar)}</h2><p className="ikg-muted">{t(req ? 'enterQ' : 'enterS', ar)}</p>
        <label>{t('name', ar)}<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" maxLength={120} required data-testid="ikg-name" /></label>
        {!req && <label>{t('phone', ar)}<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="3XXX XXXX" maxLength={20} required data-testid="ikg-phone" /></label>}
        <label>{t(req ? 'quote' : 'quoteOpt', ar)}<input value={f.quote_no} onChange={(e) => setF({ ...f, quote_no: e.target.value })} dir="ltr" autoCapitalize="characters" maxLength={40} required={req} data-testid="ikg-quote" /></label>
        <input className="ikg-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} aria-hidden="true" />
        {err && <div className="ikg-err" role="alert">{t(err, ar)}</div>}
        <button type="submit" className="ikg-btn ikg-btn-main ikg-wide" disabled={busy} data-testid="ikg-go">{busy ? t('checking', ar) : t('go', ar)}</button>
      </form>
    </section>
  );
}

function Hub({ ar, st, onPlay, onOut }) {
  if (!st) return <div className="ikg-center"><span className="ikg-spin" /></div>;
  const games = (st.games || []).map((g) => ({ ...g, def: GAMES.find((x) => x.id === g.id) })).filter((g) => g.def);
  const wins = (st.wins || []).filter((w) => w.won);
  return (
    <section className="ikg-hub">
      <div className="ikg-hub-head">
        <p className="ikg-eyebrow">{t('hello', ar, { n: st.first_name || '' })} · <bdi dir="ltr">{st.quote_no || (st.phone_tail ? '•••• ' + st.phone_tail : '')}</bdi> · <button type="button" className="ikg-link" onClick={onOut}>{t('change', ar)}</button></p>
        <h1 className="ikg-display">{t('title', ar)}</h1>
        <p className="ikg-lead">{t('sub', ar)}</p>
      </div>
      <div className="ikg-grid">
        {games.map((g, i) => { const [name, desc] = ar ? g.def.ar : g.def.en; const left = Math.max(0, g.attempts - g.used);
          return (
            <article key={g.id} className={'ikg-card is-' + g.state} style={{ '--i': i }} data-testid={'ikg-card-' + g.id}>
              <div className={'ikg-prev ikg-prev-' + g.id} aria-hidden="true"><Preview id={g.id} /></div>
              <div className="ikg-card-body">
                <span className={'ikg-chip is-' + g.state}>{g.state === 'available' ? (g.attempts > 1 ? t('left', ar, { n: left }) : t('available', ar)) : g.state === 'played' ? t('played', ar) : t('lockedS', ar)}</span>
                <h3>{name}</h3><p>{desc}</p>
                <button type="button" className="ikg-btn ikg-btn-main" disabled={g.state !== 'available'} onClick={() => { sfx('tap'); onPlay(g.id); }} data-testid={'ikg-play-' + g.id}>{g.state === 'played' ? t('played', ar) : t('play', ar)}</button>
              </div>
            </article>
          ); })}
      </div>
      {wins.length > 0 && (
        <div className="ikg-panel ikg-wins" data-testid="ikg-wins">
          <h2>{t('yourPrizes', ar)}</h2>
          <ul>{wins.map((w) => <li key={w.code}><b dir="auto">{valueText(w, ar)}</b><span>{ar ? w.name_ar : w.name_en}</span><code dir="ltr">{w.code}</code></li>)}</ul>
          <p className="ikg-muted">{t('keep', ar)}</p>
        </div>
      )}
    </section>
  );
}

function Play({ ar, game, sess, st, hub, onBack, onRefresh }) {
  const [prizes, setPrizes] = useState(game.needsPrizes ? undefined : []);
  const [result, setResult] = useState(null); const [err, setErr] = useState(null); const [key, setKey] = useState(0);
  const g = st && (st.games || []).find((x) => x.id === game.id);
  useEffect(() => { if (game.needsPrizes) api.gamePrizes(sess.token, game.id).then((r) => setPrizes(r && r.ok ? r.prizes : [])).catch(() => setPrizes([])); }, [game, sess]);
  const onPlay = useCallback((pick) => api.play(sess.token, game.id, pick), [sess, game]);
  const onDone = useCallback((r) => {
    if (r && r.ok) { setResult(r.result); onRefresh(); }
    else { setErr((r && r.state) || 'failed'); if (r && r.state === 'no_attempts' && r.last) setResult(r.last); }
  }, [onRefresh]);
  const [name, , how] = ar ? game.ar : game.en; const G = game.C;
  const blocked = g && g.state !== 'available' && !result;
  return (
    <section className={'ikg-play ikg-play-' + game.id}>
      <div className="ikg-play-head">
        <button type="button" className="ikg-back" onClick={onBack} data-testid="ikg-back"><span aria-hidden="true">{ar ? '→' : '←'}</span> {t('back', ar)}</button>
        <h1 className="ikg-display">{name}</h1>
        <p className="ikg-how"><b>{t('how', ar)}:</b> {how}</p>
      </div>
      <div className="ikg-stage">
        {result ? <Result ar={ar} r={result} onBack={onBack} />
          : blocked ? <div className="ikg-panel ikg-notice"><h2>{t(g.state === 'played' ? 'no_attempts' : 'locked', ar)}</h2><button type="button" className="ikg-btn ikg-btn-main" onClick={onBack}>{t('back', ar)}</button></div>
          : err ? <div className="ikg-panel ikg-notice" role="alert"><h2>{t(err, ar)}</h2><div className="ikg-row">
              {['busy', 'failed'].includes(err) && <button type="button" className="ikg-btn ikg-btn-main" onClick={() => { setErr(null); setKey((k) => k + 1); }}>{t('retry', ar)}</button>}
              <button type="button" className="ikg-btn ikg-btn-ghost" onClick={onBack}>{t('back', ar)}</button></div></div>
          : prizes === undefined ? <span className="ikg-spin" />
          : <G key={key} ar={ar} onPlay={onPlay} onDone={onDone} prizes={prizes} brand={hub && hub.brand} />}
      </div>
    </section>
  );
}

function Result({ ar, r, onBack }) {
  const won = !!r.won;
  return (
    <div className={'ikg-result' + (won ? ' is-won' : ' is-lost')} data-testid="ikg-result">
      <Confetti on={won} />
      <div className="ikg-result-card">
        <p className="ikg-eyebrow">{won ? t('won', ar) : t('lost', ar)}</p>
        {r.image_url && /^https:\/\//.test(r.image_url) && <img className="ikg-prize-img" src={r.image_url} alt="" />}
        <div className="ikg-value" dir="auto" data-testid="ikg-value">{won ? valueText(r, ar) : (ar ? r.name_ar : r.name_en)}</div>
        {won && (r.type === 'percent' || r.type === 'fixed') && <p className="ikg-rname">{ar ? r.name_ar : r.name_en}</p>}
        {!won && <p className="ikg-muted">{t('lostS', ar)}</p>}
        {won && (
          <dl className="ikg-facts">
            <div><dt>{t('code', ar)}</dt><dd dir="ltr" data-testid="ikg-code">{r.code}</dd></div>
            {r.quote_no ? <div><dt>{t('quoteNo', ar)}</dt><dd dir="ltr">{r.quote_no}</dd></div> : r.phone_tail ? <div><dt>{t('mobile', ar)}</dt><dd dir="ltr">•••• {r.phone_tail}</dd></div> : null}
            {r.expires_at && <div><dt>{t('valid', ar)}</dt><dd>{new Date(r.expires_at).toLocaleDateString(ar ? 'ar-BH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>}
            {Number(r.discount_amount) > 0 && <div><dt>{t('disc', ar)}</dt><dd>{money(r.discount_amount, ar)}</dd></div>}
          </dl>
        )}
        {won && <p className="ikg-muted">{t('keep', ar)}</p>}
        <div className="ikg-row">
          <button type="button" className="ikg-btn ikg-btn-main" onClick={onBack} data-testid="ikg-result-back">{t('back', ar)}</button>
          {won && <button type="button" className="ikg-btn ikg-btn-ghost" onClick={() => window.print()}>{t('print', ar)}</button>}
        </div>
      </div>
    </div>
  );
}

function Verify({ ar, setLang }) {
  const tok = useMemo(() => new URLSearchParams(window.location.search).get('t') || '', []);
  const [v, setV] = useState(undefined);
  useEffect(() => { api.verify(tok).then(setV).catch(() => setV({ ok: false })); }, [tok]);
  const st = v && v.ok ? v.status : null;
  return (
    <div className="ikg" dir={ar ? 'rtl' : 'ltr'}>
      <header className="ikg-head"><a href="/" className="ikg-logo"><img src="/brand/closets-logo-white.png" alt="The Closets" /></a><span className="ikg-grow" /><button type="button" className="ikg-lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'EN' : 'ع'}</button></header>
      <main className="ikg-main ikg-center"><div className="ikg-panel ikg-result-card">
        <p className="ikg-eyebrow">{t('verifyT', ar)}</p>
        {v === undefined ? <span className="ikg-spin" /> : !v.ok ? <h2>{t('vBad', ar)}</h2> : <>
          <div className={'ikg-verify is-' + st}>{({ valid: '✓ ' + t('vValid', ar), redeemed: t('vRedeemed', ar), expired: t('vExpired', ar) })[st]}</div>
          <div className="ikg-value">{valueText(v, ar)}</div>{(v.type === 'percent' || v.type === 'fixed') && <p className="ikg-rname">{ar ? v.name_ar : v.name_en}</p>}
          <dl className="ikg-facts"><div><dt>{t('code', ar)}</dt><dd dir="ltr">{v.ref}</dd></div>{v.quote_no ? <div><dt>{t('quoteNo', ar)}</dt><dd dir="ltr">{v.quote_no}</dd></div> : v.phone_tail ? <div><dt>{t('mobile', ar)}</dt><dd dir="ltr">•••• {v.phone_tail}</dd></div> : null}<div><dt>{ar ? 'العميل' : 'Customer'}</dt><dd>{v.customer}</dd></div></dl>
        </>}
      </div></main>
    </div>
  );
}

/* CSS-built 3D previews for the cards (no images, no WebGL) */
function Preview({ id }) {
  switch (id) {
    case 'mystery-boxes': return <span className="pv pv-box"><i className="pv-b b1" /><i className="pv-b b2" /><i className="pv-b b3" /></span>;
    case 'spin-win': return <span className="pv pv-wheel"><i /><b /></span>;
    case 'scratch-win': return <span className="pv pv-scratch"><i /><b /></span>;
    case 'lucky-key': return <span className="pv pv-key"><i className="pv-chest" /><b className="pv-k" /></span>;
    case 'memory-match': return <span className="pv pv-mem">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>;
    case 'lucky-claw': return <span className="pv pv-claw"><i className="pv-arm" /><b className="pv-c c1" /><b className="pv-c c2" /><b className="pv-c c3" /></span>;
    default: return null;
  }
}
