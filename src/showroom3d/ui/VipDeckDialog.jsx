import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../strings';
import { useDialog } from './useDialog';
import { SlideBody } from './VipSlide';
import { sanitizeDeck, resolveDeck, LIMITS } from '../vip/deckSchema';
import { parseMarkdownDeck } from '../vip/deckMarkdown';
import { ERR } from '../vip/deckStore';
import { EXAMPLE_MARKDOWN } from '../vip/example';

/** parse what the person gave us (JSON when it starts with "{", otherwise markdown) -> { ok, deck, errors, warnings } ; never throws */
export function parseInput(text) {
  const s = typeof text === 'string' ? text : '';
  if (!s.trim()) return { empty: true, ok: false, deck: null, errors: [], warnings: [] };
  if (s.trimStart().startsWith('{')) return sanitizeDeck(s);
  return parseMarkdownDeck(s, sanitizeDeck);
}
const saveMessage = (err, lang, max) => (err === ERR.full ? t('vdErrFull', lang) : err === ERR.max ? t('vdErrMax', lang).replace('{n}', String(max)) : t('vdErrBlocked', lang));

/** "Add presentation": import a JSON / markdown file or paste markdown, preview, validate, save on this device only. No network, no backend. */
export function VipDeckDialog({ lang, ex, max, onClose }) {
  const [text, setText] = useState(''), [fileErr, setFileErr] = useState(''), [saveErr, setSaveErr] = useState(''), [pi, setPi] = useState(0), rtl = lang === 'ar';
  const ref = useDialog(true, onClose);
  useEffect(() => { ex.setVipDialog(true); return () => ex.setVipDialog(false); }, [ex]);
  const res = useMemo(() => parseInput(text), [text]), statusRef = useRef(null);
  const rd = useMemo(() => (res.ok ? resolveDeck(res.deck, lang) : null), [res, lang]);
  const slide = rd ? rd.slides[Math.min(pi, rd.slides.length - 1)] : null;
  useEffect(() => { setPi(0); setSaveErr(''); }, [text]);
  useEffect(() => { const n = statusRef.current; if (n && !res.empty && res.errors.length && n.scrollIntoView) n.scrollIntoView({ block: 'center' }); }, [res]);   // the errors are never left below the fold
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; setFileErr(''); if (!f) return;
    if (f.size > LIMITS.maxInput * 2) { setFileErr(t('vdErrFileBig', lang)); return; }
    const r = new FileReader(); r.onload = () => setText(String(r.result || '').slice(0, LIMITS.maxInput + 1)); r.onerror = () => setFileErr(t('vdErrFileRead', lang)); r.readAsText(f);
  };
  const save = () => { if (!res.ok) return; const r = ex.addDeck(res.deck, true); if (r.ok) onClose(); else setSaveErr(saveMessage(r.error, lang, max)); };
  return (
    <div className="sr-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sr-dialog sr-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="sr-vd-title" ref={ref} data-testid="sr-vd-dialog" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="sr-dialog-head"><h2 id="sr-vd-title">{t('vdTitle', lang)}</h2><button type="button" className="sr-btn sr-btn-line" onClick={onClose} data-testid="sr-vd-close">{t('vdCancel', lang)}</button></div>
        <p className="sr-dialog-sub">{t('vdIntro', lang)}</p>
        <p className="sr-vd-notice" data-testid="sr-vd-responsible">{t('vdResponsible', lang)}</p>
        <p className="sr-vd-notice sr-vd-local" data-testid="sr-vd-local">{t('vdLocal', lang)}</p>
        <div className="sr-vd-row">
          <label className="sr-btn sr-btn-line sr-vd-file">{t('vdFile', lang)}<input type="file" accept=".json,.md,.txt,application/json,text/markdown,text/plain" onChange={onFile} data-testid="sr-vd-file" data-autofocus /></label>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => setText(EXAMPLE_MARKDOWN)} data-testid="sr-vd-example">{t('vdExample', lang)}</button>
        </div>
        <label className="sr-vd-label" htmlFor="sr-vd-text">{t('vdPaste', lang)}</label>
        <textarea id="sr-vd-text" className="sr-vd-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} spellCheck={false} dir="auto" data-testid="sr-vd-text" aria-describedby="sr-vd-syntax" />
        <p className="sr-dialog-note" id="sr-vd-syntax" dir="ltr">{t('vdSyntax', lang)}</p>
        {fileErr && <p className="sr-vd-error" role="alert" data-testid="sr-vd-fileerr">{fileErr}</p>}
        <div aria-live="polite" ref={statusRef} data-testid="sr-vd-status" data-state={res.empty ? 'empty' : res.ok ? 'ok' : 'error'}>
          {res.empty && <p className="sr-dialog-note">{t('vdEmpty', lang)}</p>}
          {!res.empty && res.errors.length > 0 && <div className="sr-vd-error" role="alert"><b>{t('vdErrors', lang)}</b><ul data-testid="sr-vd-errors">{res.errors.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
          {!res.empty && res.warnings.length > 0 && <div className="sr-vd-warn"><b>{t('vdWarnings', lang)}</b><ul data-testid="sr-vd-warnings">{res.warnings.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
          {res.ok && <p className="sr-vd-ok" data-testid="sr-vd-valid">{t('vdValid', lang)} {res.deck.slides.length} {t('vdSlidesCount', lang)}</p>}
        </div>
        {res.ok && rd && slide && (
          <section className="sr-vd-preview" aria-label={t('vdPreview', lang)} data-testid="sr-vd-preview">
            <h3>{t('vdPreview', lang)}: {rd.title}</h3>
            <div className="sr-vd-pv-nav"><button type="button" className="sr-btn sr-btn-line" onClick={() => setPi(Math.max(0, pi - 1))} disabled={pi === 0}>{t('vdPrevSlide', lang)}</button>
              <span>{pi + 1} / {rd.slides.length}</span><button type="button" className="sr-btn sr-btn-line" onClick={() => setPi(Math.min(rd.slides.length - 1, pi + 1))} disabled={pi >= rd.slides.length - 1}>{t('vdNextSlide', lang)}</button></div>
            <h4 data-testid="sr-vd-pv-title">{slide.title}</h4><SlideBody lang={lang} slide={slide} />
          </section>)}
        <div className="sr-vd-actions">{saveErr && <p className="sr-vd-error sr-vd-saveerr" role="alert" data-testid="sr-vd-saveerr"><b>{t('vdSaveFailed', lang)}.</b> {saveErr}</p>}<button type="button" className="sr-btn" onClick={save} disabled={!res.ok} data-testid="sr-vd-save">{t('vdSave', lang)}</button><button type="button" className="sr-btn sr-btn-line" onClick={onClose}>{t('vdCancel', lang)}</button></div>
      </div>
    </div>
  );
}
