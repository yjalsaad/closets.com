import React, { useEffect, useRef, useState } from 'react';
import { t } from '../strings';
import { PRODUCTS, STAGE_VIEWS, nameOf } from '../products/catalog';
import { finishList, getFinish, finishLabel } from '../products/finishes';
import { buildQuoteUrl, campaignLinks, extraLinks } from '../products/quote';
import { IK, ikt } from '../products/campaignCopy';
import { hex } from '../3d/palette';

const isOpenState = (s) => s === 'open' || s === 'opening';

function Views({ lang, views, current, onPick }) {
  return (
    <div className="sr-panel-sec">
      <h3>{t('panelView', lang)}</h3>
      <div className="sr-chips" role="group" aria-label={t('panelView', lang)}>
        {views.map((v) => <button type="button" key={v.id} className="sr-chip" aria-pressed={current === v.id} onClick={() => onPick(v.id)} data-testid={'sr-view-' + v.id}>{nameOf(v.label, lang)}</button>)}
      </div>
    </div>
  );
}

/** Focused-product panel: name, honest spec lines, per-part open / close buttons, LED switch, finishes, views and the quotation link. */
export function ProductPanel({ lang, touch, explorerRef, st }) {
  const ex = explorerRef.current, ps = ex ? ex.productState() : null, headRef = useRef(null);
  const [live, setLive] = useState('');
  useEffect(() => { if (headRef.current) headRef.current.focus({ preventScroll: true }); }, [st.focus]);
  useEffect(() => {
    if (!st.lastToggle || !ex) return;
    const [id, open] = String(st.lastToggle).split(':'), part = PRODUCTS[st.focus] && PRODUCTS[st.focus].parts.find((p) => p.id === id);
    if (part) setLive(`${nameOf(part.label, lang)}: ${t(open === '1' ? 'partOpened' : 'partClosed', lang)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.lastToggle]);
  const p = PRODUCTS[st.focus]; if (!p || !ps) return null;
  const finish = getFinish(p.id, ps.finishId), anyOpen = p.parts.some((x) => ps.parts[x.id] && isOpenState(ps.parts[x.id].state));
  const quote = buildQuoteUrl({ product: p.id, productName: nameOf(p.name, lang), finishId: ps.finishId, finishName: finishLabel(p.id, ps.finishId, lang), lang, consult: p.cta === 'consult' });
  const links = extraLinks(p.id, lang), consult = p.cta === 'consult';
  return (
    <aside className="sr-panel" aria-label={t('panelAria', lang)} data-testid="sr-panel" data-product={p.id}>
      <header className="sr-panel-head">
        <p className="sr-eyebrow">{nameOf(p.kicker, lang)}</p>
        <h2 tabIndex={-1} ref={headRef}>{nameOf(p.name, lang)}</h2>
        <button type="button" className="sr-btn sr-btn-line sr-panel-close" onClick={() => ex.exitFocus()} data-testid="sr-panel-close">{t('panelBack', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">Esc</kbd>}</button>
      </header>
      <div className="sr-panel-body">
        <div className="sr-panel-sec">
          <h3>{t('panelDetails', lang)}</h3>
          <ul className="sr-spec">{p.spec.map((l, i) => <li key={i}>{nameOf(l, lang)}</li>)}</ul>
          <p className="sr-note">{t('panelSampleNote', lang)}</p>
        </div>
        <div className="sr-panel-sec">
          <div className="sr-sec-row"><h3>{t('panelParts', lang)}</h3>
            <button type="button" className="sr-link" onClick={() => ex.openAll(!anyOpen)} data-testid="sr-open-all">{anyOpen ? t('panelCloseAll', lang) : t('panelOpenAll', lang)}</button></div>
          <ul className="sr-parts">
            {p.parts.map((x) => {
              const s = ps.parts[x.id], open = s && isOpenState(s.state);
              return (
                <li key={x.id}>
                  <button type="button" className={'sr-part' + (ps.partFocus === x.id ? ' is-focus' : '')} aria-pressed={!!open} onClick={() => ex.togglePart(x.id)} data-part={x.id} data-testid={'sr-part-' + x.id}
                    onPointerEnter={() => ex.products && ex.products.setHover(x.id)} onPointerLeave={() => ex.products && ex.products.setHover(null)} onFocus={() => ex.products && ex.products.setHover(x.id)} onBlur={() => ex.products && ex.products.setHover(null)}>
                    <span>{nameOf(x.label, lang)}</span><em>{t(open ? 'stateOpen' : 'stateClosed', lang)}</em>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="sr-panel-sec">
          <h3>{t('panelLight', lang)}</h3>
          <button type="button" className="sr-switch" role="switch" aria-checked={ps.led} onClick={() => ex.toggleLed()} data-testid="sr-led"><i aria-hidden="true" /><span>{t(ps.led ? 'ledOn' : 'ledOff', lang)}</span>{!touch && <kbd className="sr-kbd" aria-hidden="true">L</kbd>}</button>
        </div>
        <div className="sr-panel-sec">
          <h3>{t('panelFinish', lang)}</h3>
          <div className="sr-swatches" role="radiogroup" aria-label={t('panelFinish', lang)}>
            {finishList(p.id).map((f) => (
              <button type="button" key={f.id} role="radio" aria-checked={f.id === ps.finishId} aria-label={lang === 'ar' ? f.ar : f.en} title={lang === 'ar' ? f.ar : f.en} className="sr-swatch" style={{ '--sw': hex(f.swatch) }} onClick={() => ex.setFinish(f.id)} data-testid={'sr-finish-' + f.id} />
            ))}
          </div>
          <p className="sr-finish-name" data-testid="sr-finish-name">{finish ? (lang === 'ar' ? finish.ar : finish.en) : ''}{!touch && <kbd className="sr-kbd" aria-hidden="true">F</kbd>}</p>
        </div>
        <Views lang={lang} views={p.views} current={ps.view} onPick={(v) => ex.setView(v)} />
        <p className="sr-hint-inline">{t(touch ? 'focusHintTouch' : 'focusHintDesk', lang)}</p>
      </div>
      <footer className="sr-panel-foot">
        <a className="sr-btn sr-quote" href={quote} data-testid="sr-quote">{t(consult ? 'panelConsult' : 'panelQuote', lang)}</a>
        <p className="sr-note">{t(consult ? 'panelConsultNote' : 'panelQuoteNote', lang)}</p>
        {links.length > 0 && (
          <div className="sr-extra" data-testid="sr-extra-links">
            {links.map((l) => (l.href
              ? <a key={l.id} className="sr-btn sr-btn-line" href={l.href} {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} dir={l.dir} data-testid={'sr-link-' + l.id}>{l.label}</a>
              : <p key={l.id} className="sr-note" data-testid={'sr-link-' + l.id}>{l.text}</p>))}
            {links[0].note && <p className="sr-note">{links[0].note}</p>}
          </div>
        )}
      </footer>
      <div className="sr-sr-only" role="status" aria-live="polite">{live}</div>
    </aside>
  );
}

/** Ikhtarha stage panel: the campaign's own copy (campaignCopy.js) and links to its existing pages. No prizes, values or dates. */
export function CampaignPanel({ lang, touch, explorerRef, st }) {
  const ex = explorerRef.current, headRef = useRef(null), links = campaignLinks(lang);
  useEffect(() => { if (headRef.current) headRef.current.focus({ preventScroll: true }); }, [st.focus]);
  const view = st.focusView || 'overview';
  return (
    <aside className="sr-panel sr-panel-ik" aria-label={t('ikPanelAria', lang)} data-testid="sr-ik-panel">
      <header className="sr-panel-head">
        <p className="sr-eyebrow">{ikt(IK.eyebrow, lang)}</p>
        <h2 tabIndex={-1} ref={headRef}>{ikt(IK.title, lang)}</h2>
        <button type="button" className="sr-btn sr-btn-line sr-panel-close" onClick={() => ex.exitFocus()} data-testid="sr-panel-close">{t('panelBack', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">Esc</kbd>}</button>
      </header>
      <div className="sr-panel-body">
        <p className="sr-lead">{ikt(IK.lead, lang)}</p>
        <div className="sr-panel-sec">
          <h3>{t('ikHow', lang)}</h3>
          <ol className="sr-steps">{IK.steps.map((s, i) => <li key={i}><span className="sr-step-n" aria-hidden="true">{i + 1}</span><div><b>{ikt(s.t, lang)}</b><span>{ikt(s.d, lang)}</span></div></li>)}</ol>
        </div>
        <Views lang={lang} views={STAGE_VIEWS} current={view} onPick={(v) => ex.setView(v)} />
        <p className="sr-note">{ikt(IK.fine, lang)}</p>
        <p className="sr-note">{t('ikNoteShowroom', lang)}</p>
      </div>
      <footer className="sr-panel-foot sr-ik-ctas">
        <a className="sr-btn sr-btn-teal" href={links.price} data-testid="sr-ik-price">{ikt(IK.cta.price, lang)}</a>
        <a className="sr-btn sr-btn-purple" href={links.play} data-testid="sr-ik-play">{ikt(IK.cta.play, lang)}</a>
        <a className="sr-link" href={links.demo} data-testid="sr-ik-demo">{ikt(IK.cta.demo, lang)}</a>
      </footer>
    </aside>
  );
}
