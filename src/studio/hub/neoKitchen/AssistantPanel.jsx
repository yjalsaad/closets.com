/* Bonsai Assistant (Haneen) - bilingual EN/AR text + voice commands with a review-before-apply step, undo and a clear
 * "not understood" state. Voice uses the Web Speech API (ar-BH / en-US) with a graceful fallback. */
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { interpret, plan, execute } from './assistant';
import { answer } from './assistantInfo';
import { previewRows, previewSummary } from './assistantPreview';
import { useFloatGesture } from './useFloatGesture';
import { Ic } from './icons';
import { download } from './exporters';
import { PersonaAvatar, PERSONA, assistantTitle, personaName, greeting, loadAsstLang, saveAsstLang } from './persona';
import './assistantPersona.css';

const EXAMPLES = {
  en: ['Set door gap to 3mm', 'base 2 width 80', 'plinth height 120', 'add a wall unit', 'u-shape', 'dark walnut finish', 'show 3d', 'What is the overall size?', 'What can you do?'],
  ar: ['خلي قاعدة ٢ عرضها ٨٠', 'فراغ الباب ٣ مم', 'ارتفاع التوكيك ١٢٠', 'أضف وحدة علوية', 'شكل U', 'لون جوز', 'اعرض ثلاثي الأبعاد', 'ما الأبعاد الكلية؟', 'ماذا تستطيع أن تفعل؟'],
};

/* shown instead of the first examples while a cabinet is selected: they are interpreted against THAT cabinet */
const SEL_EXAMPLES = {
  en: ['Make this cabinet 80 cm wide', 'Divide into two doors and three drawers', 'Make it tall', 'Move section 2 up'],
  ar: ['خلي هذه الخزانة عرضها ٨٠', 'قسمها بابين و٣ أدراج', 'خلي هذه الخزانة طويلة', 'انقل القسم ٢ لأعلى'],
};

/** `docked`: desktop dock (a flex column beside the drawing, >=1280px); otherwise the floating popover / phone bottom sheet.
 * `children` (the selected-cabinet card) renders inside the scrolling conversation area. */
export default function AssistantPanel({ model, lang: appLang, ctx, seed, onApplyModel, onUi, onUndo, onRedo, canUndo, canRedo, onClose, activeRun, unit, docked = false, onLang, now, children, memo, canDock = false, onToggleMode, onCollapse, rect, bounds, rtl = false, onRect, onRectCommit }) {
  /* the assistant's own language (chosen on the first-run screen, remembered): defaults to the app language, never changes the app by itself */
  const mem = (memo && memo.current) || {};
  const [chosen, setChosen] = useState(() => loadAsstLang());
  const lang = chosen || appLang;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const clock = () => (typeof now === 'function' ? now() : new Date());
  const [screen, setScreen] = useState(() => mem.screen || (loadAsstLang() ? 'chat' : 'welcome')); // 'welcome' = the first-run / new-conversation screen
  const [input, setInput] = useState(mem.input || '');
  const [log, setLog] = useState(() => { const l0 = loadAsstLang(); if (mem.log) return mem.log; return l0 ? [{ who: 'ai', text: greeting(l0, clock()), at: clock().getTime(), id: 'greet' }] : []; });
  const [pend, setPend] = useState(mem.pend || null);
  const [applied, setApplied] = useState(null); // { n } right after Apply: a confirmation with Undo
  const [listening, setListening] = useState(false);
  const [cmds, setCmds] = useState(mem.cmds || []); // every command typed / spoken this session (survives "new conversation")
  const [histOpen, setHistOpen] = useState(false);
  const scrollRef = useRef(null);
  /* floating window: drag by the move handle / title bar, resize by the corner grip (pointer or arrow keys), Esc closes */
  const { floating, startGesture, moveGesture, endGesture, keyGesture } = useFloatGesture({ docked, rect, bounds, rtl, onRect, onRectCommit });
  const recRef = useRef(null);
  const inRef = useRef(null);
  const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const say = (who, text, tone) => setLog((l) => [...l.slice(-30), { who, text, tone, at: Date.now(), id: l.length + Math.random() }]);
  useEffect(() => { if (seed) { setInput(seed.text || ''); setTimeout(() => inRef.current && inRef.current.focus(), 30); } }, [seed]);
  useEffect(() => () => { try { recRef.current && recRef.current.abort(); } catch (e) { /* ignore */ } }, []);
  const pendRef = useRef(null); pendRef.current = pend;
  if (memo) memo.current = { screen, input, log, pend, cmds };
  const selId = ctx.selected ? ctx.selected.id : null;
  useEffect(() => { // a review aimed at "this cabinet" must not be applied after the selection moved to another one
    if (pendRef.current && pendRef.current.items.some((c) => c.sel)) { setPend(null); say('ai', L('The selection changed, so the pending review was dismissed. Nothing was changed.', 'تغيّر التحديد فتم إغلاق المراجعة. لم يتغير شيء.'), 'warn'); }
  }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstScroll = useRef(true);
  const reviewRef = useRef(null);
  useLayoutEffect(() => { // follow the conversation as it grows (not on first open, so the selected-cabinet card starts in view); a new proposal is brought to the top of the view
    if (firstScroll.current) { firstScroll.current = false; return; }
    const el = scrollRef.current; if (!el) return;
    if (pend && reviewRef.current) el.scrollTop = Math.max(0, reviewRef.current.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 8); else el.scrollTop = el.scrollHeight;
  }, [log, pend]);
  useEffect(() => {
    if (!histOpen) return undefined;
    const k = (e) => { if (e.key === 'Escape') setHistOpen(false); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [histOpen]);
  const newChat = () => { setLog([]); setPend(null); setInput(''); setHistOpen(false); setScreen('welcome'); }; // back to the first-run screen; the remembered language stays
  const choose = (l) => { // the language buttons: sets the assistant language (remembered) and opens the conversation with the greeting
    setChosen(l); saveAsstLang(l); setPend(null); setHistOpen(false); setScreen('chat');
    setLog([{ who: 'ai', text: greeting(l, clock()), at: clock().getTime(), id: 'greet', offer: l !== appLang && typeof onLang === 'function' ? l : null }]);
    setTimeout(() => inRef.current && inRef.current.focus(), 30);
  };
  const fmtTime = (t) => { try { return new Date(t).toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const saveChat = () => {
    if (!log.length) return;
    download('bonsai-assistant-conversation.txt', log.map((m) => `${m.who === 'me' ? L('You', 'أنت') : personaName(lang)}: ${m.text}`).join('\n'), 'text/plain');
  };

  const run = (textIn) => {
    const text = (textIn !== undefined ? textIn : input).trim();
    if (!text) return;
    setScreen('chat'); say('me', text); setInput(''); setPend(null); setApplied(null); setCmds((c) => [text, ...c.filter((x) => x !== text)].slice(0, 20));
    const { items, rest } = interpret(text, ctx);
    if (!items.length) {
      const info = answer(text, model, lang, unit);
      if (info) { say('ai', info); return; }
      say('ai', L('Sorry, I did not understand that. Nothing was changed. Try one of the examples below.', 'عذرًا، لم أفهم الأمر. لم يتغير شيء. جرّب أحد الأمثلة أدناه.'), 'warn'); return; }
    const modelCmds = items.filter((c) => c.type !== 'ui' && c.type !== 'meta');
    const cards = plan(modelCmds, model, lang, ctx);
    if (!modelCmds.length) { items.forEach((c) => (c.type === 'meta' ? (c.action === 'undo' ? onUndo() : onRedo()) : onUi(c))); say('ai', L('Done.', 'تم.'), 'ok'); return; }
    setPend({ items, cards, rest });
    say('ai', L(`I understood ${modelCmds.length} change${modelCmds.length > 1 ? 's' : ''}. Review before applying:`, `فهمت ${modelCmds.length} تغيير. راجع قبل التطبيق:`));
    if (rest.length) say('ai', L(`Not understood: "${rest.join('", "')}"`, `لم أفهم: "${rest.join('", "')}"`), 'warn');
  };
  const apply = () => {
    if (!pend) return;
    let m = model; let n = 0;
    pend.cards.forEach((c) => { if (!c.ok) return; m = execute(m, c.cmd, ctx).model; n++; });
    if (m !== model) onApplyModel(m);
    pend.items.filter((c) => c.type === 'ui').forEach(onUi);
    pend.items.filter((c) => c.type === 'meta').forEach((c) => (c.action === 'undo' ? onUndo() : onRedo()));
    setPend(null); setApplied({ n });
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
            {cmds.map((c) => (
              <button key={c} type="button" className="nk-mi" dir="auto" onClick={() => { setInput(c); setHistOpen(false); setTimeout(() => inRef.current && inRef.current.focus(), 0); }}>{c}</button>
            ))}
          </div>
        )}
      </header>
      <div className="nk-asst-scroll" ref={scrollRef}>
        {ctx.selectedLabel && <div className="nk-asst-ctx">{L('Target', 'الهدف')}: <b>{ctx.selectedLabel}</b></div>}
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
            <button type="button" className="nk-onb-hist" onClick={() => setHistOpen(true)} data-testid="assistant-onb-history">{L('History', 'السجل')}</button>
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
        {pend && (() => {
          const rows = previewRows(pend.cards); const sum = previewSummary(pend.cards);
          return (
            <div className="nk-review" ref={reviewRef} role="group" aria-label={L('Review changes', 'مراجعة التغييرات')} data-testid="assistant-review" data-count={sum.ok}>
              <div className="nk-rv-head"><b>{L('Proposal', 'الاقتراح')}</b><span className="nk-rv-legend"><i className="nk-rv-k nk-rv-k-saved" />{L('Saved', 'المحفوظ')}<i className="nk-rv-k nk-rv-k-new" />{L('Proposed', 'المقترح')}</span></div>
              {pend.cards.map((c, i) => {
                const r = rows[i];
                return (
                  <div key={i} className={`nk-rv${c.ok ? '' : ' nk-rv-bad'}`} data-kind={r.kind}>
                    <div className="nk-rv-t">{c.title}</div>
                    {r.kind === 'change' && (
                      <div className="nk-rv-d nk-rv-delta" dir="ltr"><span className="nk-rv-old" title={L('Saved value', 'القيمة المحفوظة')}>{r.saved}</span><span className="nk-rv-arrow" aria-hidden="true">→</span><b className="nk-rv-new" title={L('Proposed value', 'القيمة المقترحة')}>{r.proposed}</b></div>
                    )}
                    {r.kind === 'set' && <div className="nk-rv-d nk-rv-delta" dir="ltr"><b className="nk-rv-new">{r.proposed}</b></div>}
                    {(r.kind === 'plain' || r.kind === 'blocked') && r.text && <div className="nk-rv-d" dir="ltr">{r.text}</div>}
                    {c.ok === false && <div className="nk-rv-n nk-rv-skip">{L('Cannot be applied - it will be skipped.', 'لا يمكن تطبيقه - سيتم تخطيه.')}</div>}
                    {c.note && <div className="nk-rv-n">{c.note}</div>}
                  </div>
                );
              })}
              <div className="nk-rv-act">
                <span className="nk-rv-sum" role="status">{sum.canApply ? L(`${sum.ok} will apply${sum.skipped ? `, ${sum.skipped} skipped` : ''}`, `سيتم تطبيق ${sum.ok}${sum.skipped ? `، وتخطي ${sum.skipped}` : ''}`) : L('Nothing here can be applied', 'لا شيء هنا يمكن تطبيقه')}</span>
                <button type="button" className="nk-btn" onClick={() => { setPend(null); say('ai', L('Cancelled. Nothing changed.', 'أُلغي. لم يتغير شيء.')); }} data-testid="assistant-cancel">{L('Cancel', 'إلغاء')}</button>
                <button type="button" className="nk-btn nk-btn-primary" onClick={apply} disabled={!sum.canApply} data-testid="assistant-apply">{L('Apply', 'تطبيق')}</button>
              </div>
            </div>
          );
        })()}
        {applied && !pend && (
          <div className="nk-applied" role="status" data-testid="assistant-applied">
            <span><Ic n="check" size={16} /> {L(`Applied ${applied.n} change${applied.n === 1 ? '' : 's'}`, `تم تطبيق ${applied.n} تغيير`)}</span>
            <button type="button" className="nk-btn" onClick={() => { onUndo(); setApplied(null); say('ai', L('Undone. The saved values are back.', 'تم التراجع. عادت القيم المحفوظة.')); }} disabled={!canUndo} data-testid="assistant-applied-undo"><Ic n="undo" size={16} /> {L('Undo', 'تراجع')}</button>
          </div>
        )}
        {children}
        {screen === 'chat' && <div className="nk-chips nk-chips-sm" aria-label={L('Examples', 'أمثلة')}>
          {(ctx.selected ? [...SEL_EXAMPLES[lang], ...EXAMPLES[lang].slice(0, 4)] : EXAMPLES[lang]).map((x) => <button key={x} type="button" className="nk-chip nk-chip-sm" onClick={() => { setInput(x); inRef.current && inRef.current.focus(); }}>{x}</button>)}
        </div>}
      </div>
      <form className="nk-asst-form" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input ref={inRef} type="text" className="nk-inp nk-inp-wide" dir="auto" value={input} onChange={(e) => setInput(e.target.value)} aria-label={L('Command', 'الأمر')} placeholder={L('e.g. Set door gap to 3mm', 'مثال: خلي قاعدة ٢ عرضها ٨٠')} data-testid="assistant-input" />
        <button type="button" className={`nk-ib nk-mic${listening ? ' nk-on' : ''}`} onClick={voice} disabled={!SR} aria-pressed={listening} aria-label={SR ? L('Voice input', 'إدخال صوتي') : L('Voice input is not supported in this browser', 'الإدخال الصوتي غير مدعوم في هذا المتصفح')} title={SR ? (lang === 'ar' ? 'ar-BH' : 'en-US') : L('Voice input is not supported in this browser - type instead', 'الإدخال الصوتي غير مدعوم - اكتب الأمر')}><Ic n="mic" size={16} /></button>
        <button type="submit" className="nk-btn nk-btn-primary nk-send" data-testid="assistant-send" aria-label={L('Send', 'إرسال')}><span className="nk-send-t">{L('Send', 'إرسال')}</span><Ic n="send" size={16} /></button>
      </form>
      {floating && <button type="button" className="nk-asst-resize" aria-label={L('Resize the assistant (arrow keys)', 'تغيير حجم المساعد (الأسهم)')} data-tip={L('Drag to resize', 'اسحب لتغيير الحجم')} onPointerDown={startGesture('resize')} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onKeyDown={keyGesture('resize')} data-testid="assistant-resize"><Ic n="resize" size={14} /></button>}
      {!SR && <div className="nk-sub">{L('Voice input is not supported in this browser - typing works the same.', 'الإدخال الصوتي غير مدعوم في هذا المتصفح - الكتابة تعمل بنفس الطريقة.')}</div>}
      <div className="nk-asst-foot">
        <button type="button" className="nk-btn" disabled={!canUndo} onClick={onUndo}><Ic n="undo" size={16} /> {L('Undo', 'تراجع')}</button>
        <button type="button" className="nk-btn" disabled={canRedo === false} onClick={onRedo}><Ic n="redo" size={16} /> {L('Redo', 'إعادة')}</button>
        <span className="nk-sub">{L('Run', 'الصف')}: {activeRun}</span>
      </div>
    </section>
  );
}
