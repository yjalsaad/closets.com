import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { t } from '../strings';
import { createRateLimiter, guardAiReply } from '../staff/guide';
import { supportChatFetch, tr, hasConsent } from '../siteBridge';
import { FACTS } from '../vendor/facts';
import { reply, opening, newSession, resetSession, meetingRequest, INFO_LINE, FACTSHEET_VERSION } from '../investor/haneenPublic';
import { BLOOM, L } from '../bloom/strings';

const limiter = createRateLimiter({ max: 6, windowMs: 30000 });
const pick = (v, lang) => L(v, lang);
const qrSvg = (text) => { try { const q = qrcode(0, 'M'); q.addData(String(text)); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { return ''; } };
const UI = {
  reset: { en: 'Reset session', ar: 'إعادة ضبط الجلسة' }, resetNote: { en: 'Chat cleared. Nothing was stored.', ar: 'تم مسح المحادثة. لم يُحفظ شيء.' },
  meeting: { en: 'Request a meeting with the team', ar: 'اطلب اجتماعًا مع الفريق' }, contactCard: { en: 'Contact card', ar: 'بطاقة التواصل' }, presenter: { en: 'Presenter mode (big text)', ar: 'وضع العرض (خط كبير)' },
  voice: { en: 'Read answers aloud (off by default)', ar: 'قراءة الإجابات بصوت مسموع (متوقفة افتراضيًا)' }, lang: { en: 'العربية', ar: 'English' }, close: { en: 'Close', ar: 'إغلاق' },
  name: { en: 'Name', ar: 'الاسم' }, email: { en: 'Email', ar: 'البريد الإلكتروني' }, phone: { en: 'Phone', ar: 'الهاتف' }, company: { en: 'Company', ar: 'الشركة' }, message: { en: 'Message', ar: 'الرسالة' },
  openMail: { en: 'Open in my email app', ar: 'افتح في تطبيق البريد' }, openWa: { en: 'Open in WhatsApp', ar: 'افتح في واتساب' }, back: { en: 'Back to chat', ar: 'العودة إلى المحادثة' },
  meetNote: { en: 'Nothing is sent from this page: your own email or WhatsApp app opens with these details so you can send them.', ar: 'لا يُرسل شيء من هذه الصفحة: يفتح تطبيق البريد أو واتساب لديك بهذه البيانات لترسلها بنفسك.' },
  fix: { en: 'Please add your name and an email or phone number.', ar: 'يرجى إضافة اسمك وبريدًا إلكترونيًا أو رقم هاتف.' },
  scan: { en: 'Scan to message the team on WhatsApp', ar: 'امسح للتواصل مع الفريق عبر واتساب' }, profile: { en: 'Company profile PDF: coming from management', ar: 'ملف الشركة PDF: بانتظار الإدارة' },
  aiCtx: "You are Haneen AI, the investor assistant of The Closets Co. and YAS Factory. Answer briefly in the language of the question, only in general terms about what the company makes. NEVER state any number, figure, date, financial information, valuation, revenue, funding, equity, returns or forecast, and never promise anything. If asked, say the team provides confirmed details.",
};

/** Haneen AI: the investor assistant of Bloom Meeting. Offline, fact-sheet answers first (investor/haneen.js); only when it does not understand does it offer the site's existing opt-in AI chat
 *  (consent-gated, guarded, rate-limited). Nothing the visitor types is stored: the chat lives in this component's memory and "Reset session" clears it for the next visitor. */
export default function HaneenChat({ lang, onLang, reduced, onClose, aiFetcher = supportChatFetch }) {
  const [msgs, setMsgs] = useState([]), [typing, setTyping] = useState(true), [text, setText] = useState(''), [busy, setBusy] = useState(false);
  const [view, setView] = useState('chat'), [big, setBig] = useState(false), [voice, setVoice] = useState(false), [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' }), [formErr, setFormErr] = useState(false);
  const mem = useRef(newSession()), history = useRef([]), logRef = useRef(null), inputRef = useRef(null), timers = useRef([]), alive = useRef(true);
  const later = (fn, ms) => { if (reduced || ms <= 0) { fn(); return; } const id = setTimeout(() => { if (alive.current) fn(); }, ms); timers.current.push(id); };
  const speak = useCallback((s) => { if (!voice || typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return; try { window.speechSynthesis.cancel(); const u = new window.SpeechSynthesisUtterance(s); u.lang = lang === 'ar' ? 'ar-SA' : 'en-US'; window.speechSynthesis.speak(u); } catch (e) { /* optional */ } }, [voice, lang]);
  const push = useCallback((m) => { setMsgs((x) => [...x, m]); history.current.push({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }); if (history.current.length > 12) history.current.shift(); }, []);
  const start = useCallback(() => { const o = opening(lang); later(() => { setTyping(false); push({ from: 'bot', text: o.text, chips: o.chips, actions: [], intent: 'greeting' }); speak(o.text); }, 450); }, [lang, push, speak]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { alive.current = true; start(); return () => { alive.current = false; timers.current.forEach(clearTimeout); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }; }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing, view]);
  useEffect(() => { if (view === 'chat' && inputRef.current) inputRef.current.focus({ preventScroll: true }); }, [view]);

  const answer = useCallback((input, label) => {
    if (label) push({ from: 'me', text: label }); setTyping(true);
    later(() => { const r = reply(input, { lang, memory: mem.current }); mem.current = r.memory; setTyping(false); push({ from: 'bot', text: r.text, chips: r.chips, actions: r.actions, askAi: r.askAi, intent: r.intent, factIds: r.factIds }); speak(r.text); }, 320);
  }, [lang, push, speak]);   // eslint-disable-line react-hooks/exhaustive-deps

  const askAi = async () => {
    if (busy) return; if (!limiter.take()) { push({ from: 'bot', text: t('chatAiWait', lang), chips: [], actions: [] }); return; }
    setBusy(true); setTyping(true);
    try {
      const r = await aiFetcher([{ role: 'user', content: UI.aiCtx + ' Reply in ' + (lang === 'ar' ? 'Arabic' : 'English') + '.' }, ...history.current.slice(-6)]); if (!alive.current) return;
      if (r && r.ok) { const g = guardAiReply(r.reply); push({ from: 'bot', text: g || t('chatAiRejected', lang), chips: [], actions: [], ai: !!g }); if (g) speak(g); }
      else push({ from: 'bot', text: r && r.declined ? t('chatAiDeclined', lang) : t('chatAiOffline', lang), chips: [], actions: [] });
    } catch (e) { if (alive.current) push({ from: 'bot', text: t('chatAiOffline', lang), chips: [], actions: [] }); }
    if (alive.current) { setTyping(false); setBusy(false); }
  };
  const doReset = () => { timers.current.forEach(clearTimeout); timers.current = []; try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } mem.current = resetSession(); history.current = []; setMsgs([]); setText(''); setForm({ name: '', email: '', phone: '', company: '', message: '' }); setFormErr(false); setBusy(false); setView('chat'); setTyping(true); setBig(false); setVoice(false); setMsgs([{ from: 'bot', text: pick(UI.resetNote, lang), chips: [], actions: [], intent: 'reset' }]); start(); };
  const submit = (e) => { e.preventDefault(); const v = text.trim().slice(0, 300); if (!v) return; setText(''); answer(v, v); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
  const mr = useMemo(() => meetingRequest(form, { lang, factsEmail: FACTS.email, factsWhatsapp: FACTS.whatsappHref }), [form, lang]);
  const qr = useMemo(() => qrSvg(FACTS.whatsappHref || ''), []);
  const last = msgs.length ? msgs[msgs.length - 1] : null, consent = hasConsent && hasConsent('ai'), name = pick(BLOOM.haneenName, lang);
  const act = (a) => { if (a.type === 'meeting') setView('meeting'); };

  return (
    <aside className={'sr-panel sr-chat sr-haneen' + (big ? ' is-big' : '')} role="dialog" aria-label={name} data-testid="sr-haneen" data-view={view} onKeyDown={onKey}>
      <header className="sr-panel-head">
        <span className="sr-chat-avatar sr-haneen-avatar" aria-hidden="true"><b>{lang === 'ar' ? 'ح' : 'H'}</b></span>
        <div className="sr-chat-title"><h2 tabIndex={-1}>{name}</h2><span className="sr-chat-badge" data-testid="sr-haneen-badge">{t('chatBadge', lang)}</span></div>
        <div className="sr-haneen-tools">
          <button type="button" className="sr-btn sr-btn-line" onClick={() => onLang && onLang(lang === 'ar' ? 'en' : 'ar')} data-testid="sr-haneen-lang" lang={lang === 'ar' ? 'en' : 'ar'}>{pick(UI.lang, lang)}</button>
          <button type="button" className="sr-btn sr-btn-line sr-chat-close" onClick={onClose} aria-label={pick(UI.close, lang)} data-testid="sr-haneen-close">{'×'}</button>
        </div>
      </header>
      <p className="sr-chat-note sr-haneen-info" data-testid="sr-haneen-info">{pick(INFO_LINE, lang)}</p>
      {view === 'chat' && <>
        <div className="sr-chat-log" ref={logRef} role="log" aria-live="polite" data-testid="sr-haneen-log">
          {msgs.map((m, i) => (
            <div key={i} className={'sr-chat-msg is-' + (m.from === 'me' ? 'me' : 'staff')} data-from={m.from} data-intent={m.intent || ''} data-facts={(m.factIds || []).join(',')}>
              <span className="sr-chat-who">{m.from === 'me' ? t('chatYou', lang) : name}{m.ai ? ' · ' + t('chatBadge', lang) : ''}</span><p>{m.text}</p>
              {m.actions && m.actions.length > 0 && i === msgs.length - 1 && <div className="sr-chat-actions">{m.actions.map((a, k) => <button key={k} type="button" className="sr-btn" onClick={() => act(a)} data-testid="sr-haneen-action">{pick(a.label, lang)}</button>)}</div>}
            </div>))}
          {typing && <div className="sr-chat-msg is-staff is-typing" role="status" data-testid="sr-haneen-typing"><span className="sr-chat-who">{name} {t('chatTyping', lang)}</span><p aria-hidden="true"><i /><i /><i /></p></div>}
        </div>
        <div className="sr-chat-chips" data-testid="sr-haneen-chips">
          {last && last.from === 'bot' && !typing && (last.chips || []).map((c) => <button key={c.token} type="button" className="sr-btn sr-btn-line sr-chip" onClick={() => answer(c.token, pick(c.label, lang))} data-token={c.token}>{pick(c.label, lang)}</button>)}
          {last && last.askAi && !typing && <button type="button" className="sr-btn sr-chip sr-chip-ai" onClick={askAi} disabled={busy} data-testid="sr-haneen-askai">{t('chatAskAi', lang)}</button>}
        </div>
        <form className="sr-chat-form" onSubmit={submit}>
          <input ref={inputRef} className="sr-chat-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t('chatInput', lang)} aria-label={t('chatInput', lang)} data-testid="sr-haneen-input" autoComplete="off" />
          <button type="submit" className="sr-btn" data-testid="sr-haneen-send">{t('chatSend', lang)}</button>
        </form>
      </>}
      {view === 'meeting' && <form className="sr-haneen-form" onSubmit={(e) => { e.preventDefault(); setFormErr(!mr.ok); }} data-testid="sr-haneen-meeting">
        <h3>{pick(UI.meeting, lang)}</h3>
        {['name', 'email', 'phone', 'company'].map((k) => <label key={k} className="sr-haneen-field"><span>{pick(UI[k], lang)}</span><input value={form[k]} maxLength={k === 'phone' ? 40 : 100} type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} autoComplete="off" onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={'sr-haneen-' + k} /></label>)}
        <label className="sr-haneen-field"><span>{pick(UI.message, lang)}</span><textarea rows={3} maxLength={400} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="sr-haneen-message" /></label>
        <p className="sr-chat-note">{pick(UI.meetNote, lang)}</p>
        {formErr && !mr.ok && <p className="sr-haneen-err" role="alert">{pick(UI.fix, lang)}</p>}
        <div className="sr-chat-actions">
          {mr.mailto && <a className={'sr-btn' + (mr.ok ? '' : ' is-off')} href={mr.ok ? mr.mailto : undefined} aria-disabled={!mr.ok} onClick={(e) => { if (!mr.ok) { e.preventDefault(); setFormErr(true); } }} data-testid="sr-haneen-mailto">{pick(UI.openMail, lang)}</a>}
          {mr.whatsapp && <a className={'sr-btn sr-btn-line' + (mr.ok ? '' : ' is-off')} href={mr.ok ? mr.whatsapp : undefined} aria-disabled={!mr.ok} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!mr.ok) { e.preventDefault(); setFormErr(true); } }} data-testid="sr-haneen-whatsapp">{pick(UI.openWa, lang)}</a>}
          <button type="button" className="sr-btn sr-btn-line" onClick={() => setView('chat')}>{pick(UI.back, lang)}</button>
        </div>
        <div className="sr-haneen-card" data-testid="sr-haneen-contact"><div className="sr-haneen-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label={pick(UI.scan, lang)} role="img" /><div><p><b>{pick(UI.contactCard, lang)}</b></p><p>{FACTS.phone}</p><p>{FACTS.email}</p><p className="sr-chat-note">{pick(UI.scan, lang)}</p><p className="sr-chat-note" data-testid="sr-haneen-profile">{pick(UI.profile, lang)}</p></div></div>
      </form>}
      <div className="sr-haneen-foot">
        <button type="button" className="sr-btn sr-btn-line sr-chip" onClick={() => setView(view === 'meeting' ? 'chat' : 'meeting')} data-testid="sr-haneen-meeting-btn" aria-pressed={view === 'meeting'}>{pick(UI.meeting, lang)}</button>
        <button type="button" className="sr-btn sr-btn-line sr-chip" onClick={() => setBig(!big)} aria-pressed={big} data-testid="sr-haneen-big">{pick(UI.presenter, lang)}</button>
        <button type="button" className="sr-btn sr-btn-line sr-chip" onClick={doReset} data-testid="sr-haneen-reset">{pick(UI.reset, lang)}</button>
      </div>
      <details className="sr-chat-about"><summary>{t('chatAbout', lang)}</summary>
        <p>{tr('aiBody', lang)}</p><p className="sr-chat-state">{consent ? '✓ ' : ''}{tr('aiTitle', lang)}</p>
        <label className="sr-chat-voice"><input type="checkbox" checked={voice} onChange={() => { setVoice(!voice); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }} data-testid="sr-haneen-voice" /> {pick(UI.voice, lang)}</label>
        <p className="sr-chat-note">{FACTSHEET_VERSION}</p>
      </details>
    </aside>
  );
}
