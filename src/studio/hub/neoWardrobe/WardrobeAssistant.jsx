/* Neo Wardrobe Studio [NEO-CLOSETS-UX22] - Haneen, the Bonsai assistant, for wardrobes. Same persona, markup and styles as the
 * kitchen assistant (neoKitchen/persona.jsx, assistantPersona.css); the interpreter is the wardrobe one (wardrobeCommands.js).
 * Every change is shown as a review card first; Apply builds a new design and hands it to the studio (one undo step). */
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Ic } from '../neoKitchen/icons';
import { useFloatGesture } from '../neoKitchen/useFloatGesture';
import { download } from '../neoKitchen/exporters';
import { PersonaAvatar, PERSONA, assistantTitle, personaName, loadAsstLang, saveAsstLang } from '../neoKitchen/persona';
import '../neoKitchen/assistantPersona.css';
import { interpretWardrobe, planWardrobe, executeWardrobe, wardrobeGreeting, describeWardrobe, EXAMPLES } from './wardrobeCommands';

export default function WardrobeAssistant({ design, lang: appLang, rules, seed, onApply, onUi, onUndo, onRedo, canUndo, canRedo, onClose, docked = false, onLang, selectedLabel, now, children, rect, bounds, rtl = false, onRect, onRectCommit, canDock = false, onToggleMode, onCollapse }) {
  /* floating by default (the kitchen's default too): a window over the drawing that takes no layout width; `docked` puts it beside the drawing on wide screens */
  const { floating, startGesture, moveGesture, endGesture, keyGesture } = useFloatGesture({ docked, rect, bounds, rtl, onRect, onRectCommit });
  const [chosen, setChosen] = useState(() => loadAsstLang());
  const lang = chosen || appLang;
  const L = (en, a) => (lang === 'ar' ? a : en);
  const clock = () => (typeof now === 'function' ? now() : new Date());
  const [screen, setScreen] = useState(() => (loadAsstLang() ? 'chat' : 'welcome'));
  const [input, setInput] = useState('');
  const [log, setLog] = useState(() => { const l0 = loadAsstLang(); return l0 ? [{ who: 'ai', text: wardrobeGreeting(l0, clock()), at: clock().getTime(), id: 'greet' }] : []; });
  const [pend, setPend] = useState(null);
  const [listening, setListening] = useState(false);
  const [cmds, setCmds] = useState([]);
  const [histOpen, setHistOpen] = useState(false);
  const scrollRef = useRef(null);
  const recRef = useRef(null);
  const inRef = useRef(null);
  const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const say = (who, text, tone) => setLog((l) => [...l.slice(-30), { who, text, tone, at: Date.now(), id: l.length + Math.random() }]);
  useEffect(() => { if (seed) { setInput(seed.text || ''); setTimeout(() => inRef.current && inRef.current.focus(), 30); } }, [seed]);
  useEffect(() => () => { try { recRef.current && recRef.current.abort(); } catch (e) { /* ignore */ } }, []);
  const firstScroll = useRef(true);
  useLayoutEffect(() => { if (firstScroll.current) { firstScroll.current = false; return; } const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [log, pend]);
  const newChat = () => { setLog([]); setPend(null); setInput(''); setHistOpen(false); setScreen('welcome'); };
  const choose = (l) => {
    setChosen(l); saveAsstLang(l); setPend(null); setHistOpen(false); setScreen('chat');
    setLog([{ who: 'ai', text: wardrobeGreeting(l, clock()), at: clock().getTime(), id: 'greet', offer: l !== appLang && typeof onLang === 'function' ? l : null }]);
    setTimeout(() => inRef.current && inRef.current.focus(), 30);
  };
  const fmtTime = (t) => { try { return new Date(t).toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const saveChat = () => { if (log.length) download('bonsai-assistant-conversation.txt', log.map((m) => `${m.who === 'me' ? L('You', 'أنت') : personaName(lang)}: ${m.text}`).join('\n'), 'text/plain'); };

  const run = (textIn) => {
    const text = (textIn !== undefined ? textIn : input).trim();
    if (!text) return;
    setScreen('chat'); say('me', text); setInput(''); setPend(null); setCmds((c) => [text, ...c.filter((x) => x !== text)].slice(0, 20));
    const { items, rest } = interpretWardrobe(text, design);
    if (!items.length) {
      if (/(size|dimension|how big|الأبعاد|المقاس)/i.test(text)) { say('ai', describeWardrobe(design, lang)); return; }
      say('ai', L('Sorry, I did not understand that. Nothing was changed. Try one of the examples below.', 'عذرًا، لم أفهم الأمر. لم يتغير شيء. جرّب أحد الأمثلة أدناه.'), 'warn'); return;
    }
    const designCmds = items.filter((c) => c.type === 'design');
    if (!designCmds.length) { items.forEach((c) => (c.type === 'meta' ? (c.action === 'undo' ? onUndo() : onRedo()) : onUi(c))); say('ai', L('Done.', 'تم.'), 'ok'); return; }
    const cards = planWardrobe(designCmds, design, lang, rules);
    setPend({ items, cards, rest });
    say('ai', L(`I understood ${designCmds.length} change${designCmds.length > 1 ? 's' : ''}. Review before applying:`, `فهمت ${designCmds.length} تغيير. راجع قبل التطبيق:`));
    if (rest.length) say('ai', L(`Not understood: "${rest.join('", "')}"`, `لم أفهم: "${rest.join('", "')}"`), 'warn');
  };
  const apply = () => {
    if (!pend) return;
    let d = design; let n = 0;
    pend.cards.forEach((c) => { if (!c.ok) return; d = executeWardrobe(d, c.cmd, rules).design; n++; });
    if (d !== design) onApply(d);
    pend.items.filter((c) => c.type === 'ui').forEach(onUi);
    pend.items.filter((c) => c.type === 'meta').forEach((c) => (c.action === 'undo' ? onUndo() : onRedo()));
    setPend(null);
    say('ai', L(`✓ Applied ${n} change${n === 1 ? '' : 's'}. You can undo this.`, `✓ تم تطبيق ${n} تغيير. يمكنك التراجع.`), 'ok');
  };
  const voice = () => {
    if (!SR) return;
    if (listening) { try { recRef.current.stop(); } catch (e) { /* ignore */ } return; }
    try {
      const r = new SR(); recRef.current = r;
      r.lang = lang === 'ar' ? 'ar-BH' : 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e) => { const t = e.results[0] && e.results[0][0] ? e.results[0][0].transcript : ''; if (t) run(t); };
      r.onerror = (e) => { say('ai', L(`Voice input failed (${e.error || 'error'}). Type the command instead.`, `فشل الإدخال الصوتي (${e.error || 'خطأ'}). اكتب الأمر بدلًا من ذلك.`), 'warn'); setListening(false); };
      r.onend = () => setListening(false);
      r.start(); setListening(true);
    } catch (e) { say('ai', L('Voice input is not available here. Type the command instead.', 'الإدخال الصوتي غير متاح هنا. اكتب الأمر.'), 'warn'); setListening(false); }
  };

  return (
    <section className="nk-asst" role={docked ? 'complementary' : 'dialog'} aria-label={assistantTitle(lang)} dir={lang === 'ar' ? 'rtl' : 'ltr'} data-lang={lang} data-screen={screen} data-testid="assistant" data-docked={docked ? '1' : '0'} data-floating={floating ? '1' : '0'}
      style={floating ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h, insetInlineEnd: 'auto', insetBlockEnd: 'auto' } : undefined}
      onKeyDown={(e) => { if (e.key === 'Escape' && !docked && !histOpen) { e.stopPropagation(); onClose(); } }}>
      <header className="nk-asst-head" onPointerDown={startGesture('move')} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} data-draggable={floating ? '1' : '0'}>
        {floating && <button type="button" className="nk-ib nk-asst-grip" aria-label={L('Move the assistant (arrow keys)', 'نقل المساعد (الأسهم)')} data-tip={L('Drag to move', 'اسحب للنقل')} onKeyDown={keyGesture('move')} data-testid="assistant-move"><Ic n="move" size={16} /></button>}
        <PersonaAvatar lang={lang} size={30} online={false} ring={false} />
        <div className="nk-asst-ttl">
          <span className="nk-asst-name"><b data-testid="assistant-title">{assistantTitle(lang)}</b><i className="nk-online" role="img" aria-label={L('Online', 'متصل')} title={L('Online', 'متصل')} /></span>
          <small>{L('type or speak - English / العربية', 'اكتب أو تكلّم - English / العربية')}</small>
        </div>
        <div className="nk-asst-ctl">
          <button type="button" className={`nk-ib${screen === 'welcome' ? ' nk-ib-hi' : ''}`} data-tip={L('New conversation', 'محادثة جديدة')} aria-label={L('New conversation', 'محادثة جديدة')} onClick={newChat} data-testid="assistant-new"><Ic n="plus" size={16} /></button>
          <button type="button" className="nk-ib" data-tip={L('History of commands', 'سجل الأوامر')} aria-label={L('History of commands', 'سجل الأوامر')} aria-expanded={histOpen} onClick={() => setHistOpen(!histOpen)} data-testid="assistant-history"><Ic n="history" size={16} /></button>
          <button type="button" className="nk-ib" data-tip={L('Download the conversation (.txt)', 'تنزيل المحادثة (.txt)')} aria-label={L('Download the conversation', 'تنزيل المحادثة')} disabled={!log.length} onClick={saveChat} data-testid="assistant-download"><Ic n="download" size={16} /></button>
          {canDock && onToggleMode && <button type="button" className="nk-ib" data-tip={docked ? L('Float over the drawing', 'اجعله عائمًا فوق الرسم') : L('Dock beside the drawing', 'ثبّته بجانب الرسم')} aria-label={docked ? L('Float the assistant', 'تعويم المساعد') : L('Dock the assistant', 'تثبيت المساعد')} aria-pressed={!docked} onClick={onToggleMode} data-testid="assistant-mode"><Ic n={docked ? 'float' : 'dockR'} size={16} /></button>}
          {onCollapse && <button type="button" className="nk-ib" data-tip={L('Minimize', 'تصغير')} aria-label={L('Minimize the assistant', 'تصغير المساعد')} onClick={onCollapse} data-testid="assistant-collapse"><Ic n={docked ? 'collapseR' : 'minimize'} size={16} /></button>}
          <button type="button" className="nk-ib" data-tip={L('Close assistant', 'إغلاق المساعد')} aria-label={L('Close assistant', 'إغلاق المساعد')} onClick={onClose} data-testid="assistant-close"><Ic n="close" size={16} /></button>
        </div>
        {histOpen && (
          <div className="nk-asst-hist" role="dialog" aria-label={L('History of commands', 'سجل الأوامر')} data-testid="assistant-history-list">
            {cmds.length === 0 && <div className="nk-sub">{L('No commands yet in this session.', 'لا توجد أوامر بعد في هذه الجلسة.')}</div>}
            {cmds.map((c) => <button key={c} type="button" className="nk-mi" dir="auto" onClick={() => { setInput(c); setHistOpen(false); setTimeout(() => inRef.current && inRef.current.focus(), 0); }}>{c}</button>)}
          </div>
        )}
      </header>
      <div className="nk-asst-scroll" ref={scrollRef}>
        {selectedLabel && <div className="nk-asst-ctx">{L('Selected', 'المحدد')}: <b>{selectedLabel}</b></div>}
        {screen === 'welcome' && (
          <div className="nk-onb" data-testid="assistant-onboarding">
            <PersonaAvatar lang={lang} size={96} />
            <h2 className="nk-onb-name" data-testid="assistant-persona-name">{personaName(lang)}</h2>
            <p className="nk-onb-role">{PERSONA.role[lang === 'ar' ? 'ar' : 'en']}</p>
            <p className="nk-onb-ask" dir="auto">Choose your language / اختار لغتك</p>
            <div className="nk-onb-pills">
              <button type="button" className="nk-pill nk-pill-primary" lang="ar" onClick={() => choose('ar')} data-testid="assistant-lang-ar">العربية</button>
              <button type="button" className="nk-pill" lang="en" onClick={() => choose('en')} data-testid="assistant-lang-en">English</button>
            </div>
          </div>
        )}
        {screen === 'chat' && (
          <div className="nk-log" role="log" aria-live="polite" aria-relevant="additions" data-testid="assistant-log">
            {log.map((m, i) => (
              <React.Fragment key={m.id}>
                {m.who === 'ai' && (!log[i - 1] || log[i - 1].who !== 'ai') && (
                  <div className="nk-msg-meta" data-testid="assistant-msg-meta"><PersonaAvatar lang={lang} size={22} online={false} ring={false} /><b>{personaName(lang)}</b><time>{fmtTime(m.at)}</time></div>
                )}
                <div className={`nk-msg nk-msg-${m.who}${m.tone ? ' nk-msg-' + m.tone : ''}`} dir="auto">{m.text}</div>
                {m.offer && appLang !== m.offer && typeof onLang === 'function' && (
                  <button type="button" className="nk-asst-sw" onClick={() => { onLang(m.offer); setLog((l) => l.map((x) => (x.id === m.id ? { ...x, offer: null } : x))); }} data-testid="assistant-switch-app-lang">
                    {m.offer === 'ar' ? 'حوّل التطبيق كله إلى العربية' : 'Switch the whole app to English'}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        {pend && (
          <div className="nk-review" role="group" aria-label={L('Review changes', 'مراجعة التغييرات')} data-testid="assistant-review">
            {pend.cards.map((c, i) => (
              <div key={i} className={`nk-rv${c.ok ? '' : ' nk-rv-bad'}`}>
                <div className="nk-rv-t">{c.title}</div>
                {c.detail && <div className="nk-rv-d" dir="ltr">{c.detail}</div>}
                {c.note && <div className="nk-rv-n">{c.note}</div>}
              </div>
            ))}
            <div className="nk-rv-act">
              <button type="button" className="nk-btn" onClick={() => { setPend(null); say('ai', L('Cancelled. Nothing changed.', 'أُلغي. لم يتغير شيء.')); }}>{L('Cancel', 'إلغاء')}</button>
              <button type="button" className="nk-btn nk-btn-primary" onClick={apply} data-testid="assistant-apply">{L('Apply', 'تطبيق')}</button>
            </div>
          </div>
        )}
        {children}
        {screen === 'chat' && <div className="nk-chips nk-chips-sm" aria-label={L('Examples', 'أمثلة')}>
          {EXAMPLES[lang].map((x) => <button key={x} type="button" className="nk-chip nk-chip-sm" onClick={() => { setInput(x); inRef.current && inRef.current.focus(); }}>{x}</button>)}
        </div>}
      </div>
      <form className="nk-asst-form" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input ref={inRef} type="text" className="nk-inp nk-inp-wide" dir="auto" value={input} onChange={(e) => setInput(e.target.value)} aria-label={L('Command', 'الأمر')} placeholder={L('e.g. 4m sliding wardrobe, two hanging, three drawers', 'مثال: عرض ٣٠٠٠')} data-testid="assistant-input" />
        <button type="button" className={`nk-ib nk-mic${listening ? ' nk-on' : ''}`} onClick={voice} disabled={!SR} aria-pressed={listening} aria-label={SR ? L('Voice input', 'إدخال صوتي') : L('Voice input is not supported in this browser', 'الإدخال الصوتي غير مدعوم في هذا المتصفح')}><Ic n="mic" size={16} /></button>
        <button type="submit" className="nk-btn nk-btn-primary nk-send" data-testid="assistant-send" aria-label={L('Send', 'إرسال')}><span className="nk-send-t">{L('Send', 'إرسال')}</span><Ic n="send" size={16} /></button>
      </form>
      {floating && <button type="button" className="nk-asst-resize" aria-label={L('Resize the assistant (arrow keys)', 'تغيير حجم المساعد (الأسهم)')} data-tip={L('Drag to resize', 'اسحب لتغيير الحجم')} onPointerDown={startGesture('resize')} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onKeyDown={keyGesture('resize')} data-testid="assistant-resize"><Ic n="resize" size={14} /></button>}
      {!SR && <div className="nk-sub">{L('Voice input is not supported in this browser - typing works the same.', 'الإدخال الصوتي غير مدعوم في هذا المتصفح - الكتابة تعمل بنفس الطريقة.')}</div>}
      <div className="nk-asst-foot">
        <button type="button" className="nk-btn" disabled={!canUndo} onClick={onUndo}><Ic n="undo" size={16} /> {L('Undo', 'تراجع')}</button>
        <button type="button" className="nk-btn" disabled={!canRedo} onClick={onRedo}><Ic n="redo" size={16} /> {L('Redo', 'إعادة')}</button>
      </div>
    </section>
  );
}
