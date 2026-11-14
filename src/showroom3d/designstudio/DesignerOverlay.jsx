/* The full-viewport designer: the WEBSITE's own kitchen designer (same route, same code, so the same options, features, BHD prices and quote hand-off) in a same-origin frame
 * under a slim showroom bar (Back to the showroom, Open on the website, language). The showroom render loop is paused by the parent while this is open.
 *
 * Why a frame and not the React components: App.js does not export the designer and cannot be changed for this add-only feature, so importing it would pull the whole site
 * into the showroom chunk and still need the site's providers. A same-origin frame is the same code by construction. See docs/showroom3d/KITCHEN-STUDIO.md.
 *
 * What this component does to the frame (the site is never edited): shifts it up so the site header sits outside the window (desktop), hides the footer with one injected rule,
 * waits until the designer has really rendered, watches its route (its own Exit / sent quote navigate away -> back to the showroom), keeps Esc / Back / focus sane. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dt } from './strings';
import { sectionById, sectionName } from './sections';
import { buildEmbedUrl, buildSiteUrl, stillOnDesigner, headerShift, HEADER_SHIFT, EMBED_CSS, EMBED_STYLE_ID, LOAD_TIMEOUT_MS, isEditingKey, escapeShouldClose, isSignedIn, normLang, designerRendered } from './logic';
import './designstudio.css';

const POLL_MS = 250;

export default function DesignerOverlay({ state, dispatch, lang, onBack, onLang, storage = window.localStorage }) {
  const section = sectionById(state.sectionId), L = normLang(lang), rtl = L === 'ar';
  const frameRef = useRef(null), stageRef = useRef(null), rootRef = useRef(null), backRef = useRef(null);
  const [shift, setShift] = useState(() => headerShift(window.innerWidth));
  const url = useMemo(() => buildEmbedUrl(section), [section]);
  const siteUrl = useMemo(() => buildSiteUrl(section), [section]);
  const signedIn = useMemo(() => isSignedIn(storage), [storage, state.attempt]);  // eslint-disable-line react-hooks/exhaustive-deps
  const status = state.status, loading = status === 'loading', failed = status === 'failed', confirm = status === 'confirm';
  const stRef = useRef(state); stRef.current = state;
  const langRef = useRef(L); langRef.current = L;

  useEffect(() => { const f = () => setShift(headerShift(window.innerWidth)); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);

  // modal behaviour: the showroom behind the overlay is inert (no Tab, no screen reader) while it is open
  useEffect(() => {
    const root = rootRef.current, host = root && root.parentNode; if (!host) return undefined;
    const kids = [...host.children].filter((n) => n !== root); kids.forEach((n) => { n.inert = true; });
    const prev = document.activeElement; if (backRef.current) backRef.current.focus({ preventScroll: true });
    return () => { kids.forEach((n) => { n.inert = false; }); if (prev && document.contains(prev) && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } };
  }, []);

  // Esc in the showroom bar -> leave (with the confirmation when a design is in progress)
  useEffect(() => {
    const f = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); if (stRef.current.status === 'confirm') dispatch({ type: 'stay' }); else onBack(); } };
    const el = rootRef.current; el.addEventListener('keydown', f); return () => el.removeEventListener('keydown', f);
  }, [dispatch, onBack]);

  // watch the frame while it loads and while it is open
  useEffect(() => {
    if (!section || !(status === 'loading')) return undefined;
    const frame = frameRef.current; if (!frame) return undefined;
    let alive = true, t0 = Date.now(), timer = null;
    const inject = (doc) => { try { if (!doc.getElementById(EMBED_STYLE_ID) && doc.head) { const st = doc.createElement('style'); st.id = EMBED_STYLE_ID; st.textContent = EMBED_CSS; doc.head.appendChild(st); } } catch (e) { /* ignore */ } };
    const fail = (reason) => { if (alive) { alive = false; clearInterval(timer); dispatch({ type: 'fail', reason }); } };
    timer = setInterval(() => {
      if (!alive) return;
      let win, doc;
      try { win = frame.contentWindow; doc = win && win.document; if (!doc || !doc.location || !/^https?:$|^http:$/.test(doc.location.protocol)) throw new Error('not-http'); void doc.location.pathname; }
      catch (e) { if (Date.now() - t0 > 4000) fail('blocked'); return; }       // a chrome error page / blocked frame is cross-origin: reading it throws
      if (doc.location.href === 'about:blank') { if (Date.now() - t0 > LOAD_TIMEOUT_MS) fail('timeout'); return; }
      inject(doc);
      if (designerRendered(doc)) { alive = false; clearInterval(timer); dispatch({ type: 'loaded' }); try { frame.focus(); } catch (e) { /* ignore */ } return; }
      if (Date.now() - t0 > LOAD_TIMEOUT_MS) fail('timeout');
    }, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [status === 'loading', state.attempt, section]);      // eslint-disable-line react-hooks/exhaustive-deps

  // once open: keep listeners (re-wired after the designer re-renders its document), watch the route, scroll into place on phones
  useEffect(() => {
    if (!section || !(status === 'open' || status === 'confirm')) return undefined;
    const frame = frameRef.current; if (!frame) return undefined;
    let off = [], wired = null;
    const tick = () => {
      let win, doc; try { win = frame.contentWindow; doc = win.document; void doc.location.pathname; } catch (e) { return; }
      if (!stillOnDesigner(doc.location.pathname, section)) { dispatch({ type: 'left' }); return; }
      if (wired !== doc) {
        wired = doc; off.forEach((f) => f()); off = [];
        const onKey = (e) => { if (e.key === 'Escape') { if (escapeShouldClose(doc)) { e.preventDefault(); onBack(); } return; } if (e.isTrusted && isEditingKey(e.key)) dispatch({ type: 'interact' }); };
        const onDown = (e) => { if (e.isTrusted) dispatch({ type: 'interact' }); };
        win.addEventListener('keydown', onKey, true); win.addEventListener('pointerdown', onDown, true);
        off.push(() => { try { win.removeEventListener('keydown', onKey, true); win.removeEventListener('pointerdown', onDown, true); } catch (e) { /* frame gone */ } });
        if (!doc.getElementById(EMBED_STYLE_ID) && doc.head) { const st = doc.createElement('style'); st.id = EMBED_STYLE_ID; st.textContent = EMBED_CSS; doc.head.appendChild(st); }
      }
      if (window.innerWidth < HEADER_SHIFT.breakpoint) { try { const need = HEADER_SHIFT.mobile; if (Math.abs((win.scrollY || 0) - need) > 1) win.scrollTo(0, need); } catch (e) { /* ignore */ } }
    };
    tick(); const id = setInterval(tick, 400);
    return () => { clearInterval(id); off.forEach((f) => f()); };
  }, [status === 'open' || status === 'confirm', state.attempt, section]);   // eslint-disable-line react-hooks/exhaustive-deps

  // language: the website reads it from localStorage when the designer starts (written by the parent before opening). A switch while open clicks the designer's own language
  // button (no design lost); if that is not possible the designer is reloaded in the new language.
  const prevLang = useRef(L);
  useEffect(() => {
    if (prevLang.current === L) return; prevLang.current = L;
    const frame = frameRef.current; if (!frame || !(stRef.current.status === 'open' || stRef.current.status === 'confirm')) return;
    let done = false;
    try {
      const doc = frame.contentWindow.document;
      if (doc.documentElement.lang === L) done = true;
      else { const b = doc.querySelector('nav button[title="Language"]'); if (b) { b.click(); done = doc.documentElement.lang === L || true; } }
    } catch (e) { done = false; }
    const id = setTimeout(() => {
      let ok = false; try { ok = frame.contentWindow.document.documentElement.lang === L; } catch (e) { ok = false; }
      if (!ok) dispatch({ type: 'reload' });
    }, done ? 600 : 0);
    return () => clearTimeout(id);
  }, [L, dispatch]);

  const onFrameLoad = useCallback(() => { /* readiness is polled (the designer renders after `load`) */ }, []);
  if (!section) return null;
  const name = sectionName(section, L);
  const frameStyle = { marginTop: -shift, height: `calc(100% + ${shift}px)` };

  return (
    <div className="sr-ds" role="dialog" aria-modal="true" aria-label={dt('frameAria', L)} ref={rootRef} data-testid="sr-ds" data-status={status} data-section={section.id} dir={rtl ? 'rtl' : 'ltr'}>
      <header className="sr-ds-bar">
        <button type="button" className="sr-btn sr-btn-line sr-ds-back" onClick={onBack} ref={backRef} data-testid="sr-ds-back" data-autofocus>
          <span aria-hidden="true">{rtl ? '→' : '←'}</span><span className="sr-ds-back-t">{dt('back', L)}</span><span className="sr-ds-back-s">{dt('backShort', L)}</span><kbd className="sr-kbd" aria-hidden="true">Esc</kbd>
        </button>
        <p className="sr-ds-title"><b>{name}</b><small>{dt('byline', L)}</small></p>
        <span className="sr-ds-grow" />
        <a className="sr-btn sr-btn-line sr-ds-site" href={siteUrl} target="_blank" rel="noopener noreferrer" data-testid="sr-ds-site">{dt('onSite', L)} <span aria-hidden="true">{'↗'}</span><span className="sr-sr-only"> ({dt('onSiteNote', L)})</span></a>
        <button type="button" className="sr-btn sr-btn-line sr-ds-lang" onClick={onLang} lang={rtl ? 'en' : 'ar'} aria-label={dt('langLabel', L)} data-testid="sr-ds-lang">{dt('langBtn', L)}</button>
      </header>
      <div className="sr-ds-stage" ref={stageRef}>
        {!failed && <iframe key={state.attempt} ref={frameRef} className="sr-ds-frame" title={dt('frameTitle', L)} src={url} style={frameStyle} onLoad={onFrameLoad} allow="fullscreen; clipboard-write" data-testid="sr-ds-frame" />}
        {loading && (
          <div className="sr-ds-veil" role="status" data-testid="sr-ds-loading">
            <div className="sr-ds-veil-in"><span className="sr-ds-spin" aria-hidden="true" /><h2>{dt('loading', L)}</h2><p>{dt('loadingNote', L)}</p>{!signedIn && <p className="sr-ds-note">{dt('signInNote', L)}</p>}</div>
          </div>)}
        {failed && (
          <div className="sr-ds-veil is-failed" role="alert" data-testid="sr-ds-failed">
            <div className="sr-ds-veil-in"><h2>{dt('failTitle', L)}</h2><p>{dt('failBody', L)}</p>
              <div className="sr-ds-actions">
                <button type="button" className="sr-btn" onClick={() => dispatch({ type: 'retry' })} data-testid="sr-ds-retry" data-autofocus>{dt('retry', L)}</button>
                <a className="sr-btn sr-btn-line" href={siteUrl} target="_blank" rel="noopener noreferrer" data-testid="sr-ds-failed-site">{dt('onSite', L)} <span aria-hidden="true">{'↗'}</span><span className="sr-sr-only"> ({dt('onSiteNote', L)})</span></a>
                <button type="button" className="sr-btn sr-btn-line" onClick={onBack}>{dt('back', L)}</button>
              </div></div>
          </div>)}
        {confirm && (
          <div className="sr-ds-veil is-confirm" role="alertdialog" aria-labelledby="sr-ds-confirm-t" data-testid="sr-ds-confirm">
            <div className="sr-ds-veil-in"><h2 id="sr-ds-confirm-t">{dt('confirmTitle', L)}</h2><p>{dt('confirmBody', L)}</p>
              <div className="sr-ds-actions"><button type="button" className="sr-btn" onClick={() => dispatch({ type: 'stay' })} data-testid="sr-ds-stay" data-autofocus>{dt('confirmStay', L)}</button>
                <button type="button" className="sr-btn sr-btn-line" onClick={() => dispatch({ type: 'leave' })} data-testid="sr-ds-leave">{dt('confirmLeave', L)}</button></div></div>
          </div>)}
      </div>
    </div>
  );
}
