import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../strings';
import { reply, opening, newMemory, pick, guardAiReply, createRateLimiter } from '../staff/guide';
import { staffById } from '../staff/roster';
import { supportChatFetch, tr, hasConsent } from '../siteBridge';

const VOICE_KEY = 'closets_yb_voice';
const readVoice = () => { try { return localStorage.getItem(VOICE_KEY) === '1'; } catch (e) { return false; } };
const writeVoice = (v) => { try { localStorage.setItem(VOICE_KEY, v ? '1' : '0'); } catch (e) { /* private mode */ } };
const limiter = createRateLimiter({ max: 6, windowMs: 30000 });
const fill = (s, name) => s.replace('{name}', name);

/** the AI adviser chat: offline guide first (deterministic), quick-reply chips, typing indicator, optional read-aloud (off by default),
 *  and an opt-in question to the site's existing consent-gated AI chat when the guide does not understand. EN + AR (RTL follows the .sr3d root). */
export default function StaffChat({ lang, reduced, explorerRef, engineRef, staffId, onClose, aiFetcher = supportChatFetch }) {
  const def = useMemo(() => staffById(staffId), [staffId]);
  const name = def ? pick(def.name, lang) : '';
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(true);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(readVoice);
  const [busy, setBusy] = useState(false);
  const mem = useRef(newMemory()), history = useRef([]), logRef = useRef(null), inputRef = useRef(null), timers = useRef([]), alive = useRef(true);
  const staff = useMemo(() => ({ id: def && def.id, room: def && def.room, name: def && def.name, first: def && def.first, role: def && def.role }), [def]);
  const later = (fn, ms) => { if (reduced || ms <= 0) { fn(); return; } const id = setTimeout(() => { if (alive.current) fn(); }, ms); timers.current.push(id); };
  const say = useCallback((s) => {
    const E = engineRef && engineRef.current && engineRef.current.engine; if (E && E.staff && def) E.staff.say(def.id, s);
    if (voice && typeof window !== 'undefined' && window.speechSynthesis && window.SpeechSynthesisUtterance) { try { window.speechSynthesis.cancel(); const u = new window.SpeechSynthesisUtterance(s); u.lang = lang === 'ar' ? 'ar-SA' : 'en-US'; window.speechSynthesis.speak(u); } catch (e) { /* optional */ } }
  }, [def, engineRef, lang, voice]);
  const push = useCallback((m) => { setMsgs((x) => [...x, m]); history.current.push({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }); }, []);

  const run = useCallback((action) => {
    if (!action) return;
    if (action.type === 'glide') { const x = explorerRef.current; onClose(); if (x) setTimeout(() => x.glideTo(action.id), 60); }
  }, [explorerRef, onClose]);

  const answer = useCallback((input, label) => {
    if (label) push({ from: 'me', text: label });
    setTyping(true);
    later(() => {
      const r = reply(input, { lang, staff, memory: mem.current }); mem.current = r.memory;
      setTyping(false); push({ from: 'staff', text: r.text, chips: r.chips, actions: r.actions, askAi: r.askAi, intent: r.intent }); say(r.text);
      if (r.auto) later(() => run(r.auto), 1500);
    }, 380 + Math.min(700, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, staff, say, run, push]);

  useEffect(() => { // opening line
    alive.current = true; const o = opening(staff, lang);
    later(() => { setTyping(false); push({ from: 'staff', text: o.text, chips: o.chips, actions: [], intent: 'greeting' }); say(o.text); }, 500);
    const E = engineRef && engineRef.current && engineRef.current.engine; if (E && E.staff && def) E.staff.setChatting(def.id);
    return () => { alive.current = false; timers.current.forEach(clearTimeout); const E2 = engineRef && engineRef.current && engineRef.current.engine; if (E2 && E2.staff) { E2.staff.setChatting(null); if (def) E2.staff.say(def.id, ''); } try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing]);
  useEffect(() => { if (inputRef.current) inputRef.current.focus({ preventScroll: true }); }, []);

  const askAi = async () => {
    if (busy) return;
    if (!limiter.take()) { push({ from: 'staff', text: t('chatAiWait', lang), chips: [], actions: [] }); return; }
    setBusy(true); setTyping(true);
    const ctxMsg = { role: 'user', content: `You are the ${def ? def.name.en : 'showroom adviser'} at The Closets Co. virtual showroom. Answer briefly in ${lang === 'ar' ? 'Arabic' : 'English'}, only about the company's services. Never state prices, discounts, delivery times, warranty terms or stock; say the team confirms them.` };
    try {
      const r = await aiFetcher([ctxMsg, ...history.current.slice(-6)]);
      if (!alive.current) return;
      if (r && r.ok) { const g = guardAiReply(r.reply); push({ from: 'staff', text: g || t('chatAiRejected', lang), chips: [], actions: [], ai: !!g }); if (g) say(g); }
      else push({ from: 'staff', text: r && r.declined ? t('chatAiDeclined', lang) : t('chatAiOffline', lang), chips: [], actions: [] });
    } catch (e) { if (alive.current) push({ from: 'staff', text: t('chatAiOffline', lang), chips: [], actions: [] }); }
    if (alive.current) { setTyping(false); setBusy(false); }
  };

  const submit = (e) => { e.preventDefault(); const v = text.trim().slice(0, 300); if (!v) return; setText(''); answer(v, v); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
  const toggleVoice = () => { const v = !voice; setVoice(v); writeVoice(v); if (!v) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } } };
  const last = msgs.length ? msgs[msgs.length - 1] : null;
  const consent = hasConsent && hasConsent('ai');

  return (
    <aside className="sr-panel sr-chat" role="dialog" aria-label={fill(t('chatTitle', lang), name)} data-testid="sr-chat" data-staff={staffId} onKeyDown={onKey}>
      <header className="sr-panel-head">
        <div className="sr-chat-title"><h2 tabIndex={-1}>{name}</h2><span className="sr-chat-badge" data-testid="sr-chat-badge">{t('chatBadge', lang)}</span></div>
        <button type="button" className="sr-btn sr-btn-line sr-chat-close" onClick={onClose} aria-label={t('chatClose', lang)} data-testid="sr-chat-close">{'×'}</button>
      </header>
      <p className="sr-chat-note" data-testid="sr-chat-disclosure">{t('chatDisclosure', lang)}</p>
      <div className="sr-chat-log" ref={logRef} role="log" aria-live="polite" data-testid="sr-chat-log">
        {msgs.map((m, i) => (
          <div key={i} className={'sr-chat-msg is-' + m.from} data-from={m.from} data-intent={m.intent || ''}>
            <span className="sr-chat-who">{m.from === 'me' ? t('chatYou', lang) : name}{m.ai ? ' · ' + t('chatBadge', lang) : ''}</span>
            <p>{m.text}</p>
            {m.actions && m.actions.length > 0 && i === msgs.length - 1 && <div className="sr-chat-actions">{m.actions.map((a, k) => a.type === 'link'
              ? <a key={k} className="sr-btn" href={a.href} data-testid="sr-chat-link">{pick(a.label, lang)}</a>
              : <button key={k} type="button" className="sr-btn" onClick={() => run(a)} data-testid="sr-chat-glide">{pick(a.label, lang)}</button>)}</div>}
          </div>))}
        {typing && <div className="sr-chat-msg is-staff is-typing" data-testid="sr-chat-typing" role="status"><span className="sr-chat-who">{name} {t('chatTyping', lang)}</span><p aria-hidden="true"><i /><i /><i /></p></div>}
      </div>
      <div className="sr-chat-chips" data-testid="sr-chat-chips">
        {last && last.from === 'staff' && !typing && (last.chips || []).map((c) => <button key={c.token} type="button" className="sr-btn sr-btn-line sr-chip" onClick={() => answer(c.token, pick(c.label, lang))} data-token={c.token}>{pick(c.label, lang)}</button>)}
        {last && last.askAi && !typing && <button type="button" className="sr-btn sr-chip sr-chip-ai" onClick={askAi} disabled={busy} data-testid="sr-chat-askai">{t('chatAskAi', lang)}</button>}
      </div>
      <form className="sr-chat-form" onSubmit={submit}>
        <input ref={inputRef} className="sr-chat-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t('chatInput', lang)} aria-label={t('chatInput', lang)} data-testid="sr-chat-input" autoComplete="off" />
        <button type="submit" className="sr-btn" data-testid="sr-chat-send">{t('chatSend', lang)}</button>
      </form>
      <details className="sr-chat-about"><summary>{t('chatAbout', lang)}</summary>
        <p>{t('chatAboutGuide', lang)}</p><p>{tr('aiBody', lang)}</p>
        <p className="sr-chat-state">{consent ? '✓ ' : ''}{tr('aiTitle', lang)}</p>
        <label className="sr-chat-voice"><input type="checkbox" checked={voice} onChange={toggleVoice} data-testid="sr-chat-voice" /> {t('chatVoice', lang)}</label>
      </details>
    </aside>
  );
}
