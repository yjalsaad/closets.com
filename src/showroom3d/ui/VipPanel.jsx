import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../strings';
import * as C from '../products/vipContent';
import { projectCard } from '../products/projectsFeed';
import { resolveDeck } from '../vip/deckSchema';
import { MAX_USER_DECKS } from '../vip/deckStore';
import { SlideBody } from './VipSlide';
import { VipDeckDialog } from './VipDeckDialog';
import { VipReader } from './VipReader';
import { FilmBody, FilmControls, VipCinema, MeetingBody } from './VipFilm';
import { nextAgendaItem } from '../vip/meeting';

const reading0 = (e) => (e.presMode || 'panel') === 'read';
const BUILTIN_IDX = { story: 0, projects: 1, hub: 2, contact: 3 };

const Lx = C.L;

function Station({ lang, idx, ex, st }) {
  if (idx === 0) {
    const cf = C.contestedFacts();
    return (<>
      <p className="sr-lead">{Lx(C.STATIONS[0].lead, lang)}</p>
      <ul className="sr-spec">{C.storyLines().map((l, i) => <li key={i}>{Lx(l, lang)}</li>)}</ul>
      <ul className="sr-vip-facts" data-testid="sr-vip-facts">{cf.map((f) => (
        <li key={f.key} className={f.confirmed ? 'is-ok' : 'is-ph'} data-fact={f.key} data-confirmed={f.confirmed ? '1' : '0'}>
          <span>{Lx(f.label, lang)}</span><b>{Lx(f.value, lang)}</b><em>{t(f.confirmed ? 'vipConfirmed' : 'vipPlaceholderTag', lang)}</em>
        </li>))}</ul>
    </>);
  }
  if (idx === 1) {
    const rows = (ex && ex.vipRows) || [], status = st.vipProjects || (ex && ex.projectsPromise ? 'loading' : 'idle');
    return (<>
      <p className="sr-lead">{Lx(C.STATIONS[1].lead, lang)}</p>
      <div className="sr-panel-sec">
        <h3>{t('vipBusinessLines', lang)}</h3>
        <ul className="sr-vip-lines" data-testid="sr-vip-lines">{C.businessLines(lang).map((l) => (
          <li key={l.id}>{l.href ? <a href={l.href} data-testid={'sr-vip-line-' + l.id}>{Lx(l.name, lang)}</a> : <span data-testid={'sr-vip-line-' + l.id}>{Lx(l.name, lang)} <em>{t('vipNoPage', lang)}</em></span>}</li>))}</ul>
      </div>
      <div className="sr-panel-sec" data-testid="sr-vip-projects" data-status={status}>
        <h3>{status === 'ok' ? t('vipProjectsFrom', lang) : t('vipProjectsNone', lang)}</h3>
        {status === 'ok' && <ul className="sr-vip-projects">{rows.map((r, i) => { const c = projectCard(r, lang); return <li key={c.id + i}><b>{c.title}</b>{c.meta && <span>{c.meta}</span>}</li>; })}</ul>}
        {status === 'idle' || status === 'loading' ? <p className="sr-note">{t('vipProjectsLoading', lang)}</p> : null}
        <a className="sr-btn sr-btn-line" href={C.projectsHref(lang)} data-testid="sr-vip-projects-link">{t('vipOpenProjects', lang)}</a>
      </div>
    </>);
  }
  if (idx === 2) {
    return (<>
      <p className="sr-lead">{Lx(C.STATIONS[2].lead, lang)}</p>
      <ol className="sr-vip-flow" data-testid="sr-vip-flow">{C.HUB_FLOW.map((s) => <li key={s.id}><b>{Lx(s.name, lang)}</b><span>{Lx(s.sub, lang)}</span></li>)}</ol>
      <ul className="sr-vip-caps" data-testid="sr-vip-caps">{C.HUB_CAPABILITIES.map((c) => <li key={c.id}><b>{Lx(c.title, lang)}</b><span>{Lx(c.body, lang)}</span></li>)}</ul>
      <div className="sr-panel-sec"><h3>{lang === 'ar' ? 'الوحدات لكل قسم' : 'Modules per department'}</h3>
        <ul className="sr-vip-depts">{C.HUB_DEPARTMENTS.map((d) => <li key={d.name.en}><span>{Lx(d.name, lang)}</span><b>{d.modules} {t('vipModules', lang)}</b></li>)}</ul></div>
      <p className="sr-note">{Lx(C.ILLUSTRATIVE, lang)}. {t('vipHubSource', lang)}</p>
    </>);
  }
  const contact = C.contactLines(lang);
  return (<>
    <p className="sr-lead">{Lx(C.STATIONS[3].lead, lang)}</p>
    <ul className="sr-vip-contact">{contact.map((c) => <li key={c.id}>{Lx(c.label, lang)}: {c.href ? <a href={c.href} dir={c.dir} data-testid={'sr-vip-' + c.id}>{c.text}</a> : <span data-testid={'sr-vip-' + c.id}>{c.text}</span>}</li>)}</ul>
    <p className="sr-note sr-vip-disc" data-testid="sr-vip-disclaimer">{Lx(C.DISCLAIMER, lang)}</p>
  </>);
}

/** VIP meeting room: guided presentation panel. A deck picker, then one slide at a time with Previous / Next + slide dots; arrow keys work too (mirrored in RTL),
 *  1-9 jump to a slide, [ and ] switch deck. The built-in stations keep their rich layouts; any other deck uses the generic slide layout. */
export function VipPanel({ lang, touch, explorerRef, st, reduced = false, tier = 'medium' }) {
  const ex = explorerRef.current, headRef = useRef(null), selRef = useRef(null), [adding, setAdding] = useState(false), [confirmDel, setConfirmDel] = useState(false);
  const idx = Number.isInteger(st.vipStation) ? st.vipStation : 0, deck = ex.deck, decks = ex.allDecks(), rd = resolveDeck(deck, lang), n = deck.slides.length, slide = rd.slides[Math.min(idx, n - 1)], raw = deck.slides[Math.min(idx, n - 1)];
  useEffect(() => { if (headRef.current) headRef.current.focus({ preventScroll: true }); }, [st.focus, idx, deck.id]);
  useEffect(() => { setConfirmDel(false); }, [deck.id]);
  const rtl = lang === 'ar', unit = deck.unit === 'station' ? t('vipStationOf', lang) : t('vipSlideOf', lang), user = !deck.builtin, bi = raw.builtin ? BUILTIN_IDX[raw.builtin] : -1;
  const isFilm = raw.builtin === 'film', isAgenda = raw.builtin === 'meeting', fs = isFilm && ex.film ? ex.film.state : null, nextItem = ex.agendaNow && (ex.meetingOn || deck.meeting) ? nextAgendaItem(ex.agendaNow()) : null;
  const portrait = !!(ex.canvas && ex.canvas.clientWidth && ex.canvas.clientHeight / ex.canvas.clientWidth > 1.1), dom = reading0(ex) && portrait && !isFilm;
  const play = ex.play || { playing: false, speed: 1, loop: true }, mode = ex.presMode || 'panel', prog = typeof st.vipProgress === 'number' ? st.vipProgress : -1, big = mode !== 'panel', reading = mode === 'read';
  const cine = !!ex.cinema;
  // while presenting (big screen / reading / cinema) the showroom's own HUD steps aside so nothing sits over the wall
  useEffect(() => { const stage = ex.canvas && ex.canvas.parentNode; if (!stage || !stage.classList) return undefined; stage.classList.toggle('sr-presenting', big || cine); return () => stage.classList.remove('sr-presenting'); }, [ex, big, cine]);
  const del = () => { ex.removeDeck(deck.id); setConfirmDel(false); if (selRef.current) selRef.current.focus(); };
  return (
    <aside className="sr-panel sr-panel-vip" aria-label={t('vipAria', lang)} data-testid="sr-vip-panel" data-station={raw.id} data-deck={deck.id} data-mode={mode} data-playing={play.playing ? '1' : '0'} dir={rtl ? 'rtl' : 'ltr'}>
      <header className="sr-panel-head">
        <p className="sr-eyebrow">{t('vipKicker', lang)}</p>
        <p className="sr-vip-count" data-testid="sr-vip-count">{unit} <b>{idx + 1}</b> / {n}</p>
        <h2 tabIndex={-1} ref={headRef} data-testid="sr-vip-title">{slide.title}</h2>
        <button type="button" className="sr-btn sr-btn-line sr-panel-close" onClick={() => ex.exitFocus()} data-testid="sr-panel-close">{t('panelBack', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">Esc</kbd>}</button>
        <div className="sr-vip-deckbar" data-testid="sr-vip-deckbar">
          <label className="sr-vip-decklabel"><span className="sr-vip-sronly">{t('vipDeckLabel', lang)}</span>
            <select ref={selRef} value={deck.id} onChange={(e) => ex.setDeck(e.target.value)} aria-label={t('vipDeckSwitch', lang)} title={t('vipDeckSwitch', lang)} data-testid="sr-vip-deck-select">
              {decks.map((d) => <option key={d.id} value={d.id}>{resolveDeck({ ...d, slides: [] }, lang).title}{d.builtin ? '' : ' · ' + t('vipDeckLocalShort', lang)}</option>)}
            </select></label>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => setAdding(true)} data-testid="sr-vip-deck-add">{t('vipDeckAdd', lang)}</button>
          {user && !confirmDel && <div className="sr-vip-userrow"><p className="sr-note sr-vip-local" data-testid="sr-vip-local">{t('vipDeckLocal', lang)}</p>
            <button type="button" className="sr-btn sr-btn-line" onClick={() => setConfirmDel(true)} data-testid="sr-vip-deck-delete">{t('vipDeckDelete', lang)}</button></div>}
          {user && confirmDel && <div className="sr-vip-confirm" role="alertdialog" aria-label={t('vipDeckDeleteAsk', lang)} data-testid="sr-vip-deck-confirm"><span>{t('vipDeckDeleteAsk', lang)}</span>
            <button type="button" className="sr-btn" onClick={del} data-testid="sr-vip-deck-delete-yes" autoFocus>{t('vipDeckDeleteYes', lang)}</button>
            <button type="button" className="sr-btn sr-btn-line" onClick={() => setConfirmDel(false)} data-testid="sr-vip-deck-delete-no">{t('vipDeckKeep', lang)}</button></div>}
        </div>
      </header>
      <div className="sr-panel-body" aria-live="polite">{isAgenda ? <MeetingBody lang={lang} ex={ex} /> : isFilm ? <FilmBody lang={lang} fs={fs} fallbackTitle={raw.title} /> : bi >= 0 ? <Station lang={lang} idx={bi} ex={ex} st={st} /> : <SlideBody key={deck.id + ':' + raw.id} lang={lang} slide={slide} reduced={reduced} tier={tier} />}</div>
      <footer className="sr-panel-foot">
        {!big && raw.builtin === 'contact' && <a className="sr-btn sr-quote" href={C.contactUrl(lang)} data-testid="sr-vip-cta">{t('vipContactCta', lang)}</a>}
        {!big && raw.builtin === 'contact' && <p className="sr-note">{t('vipContactNote', lang)}</p>}
        {nextItem && !isAgenda && <button type="button" className="sr-btn sr-vip-meet-next" onClick={() => ex.nextAgenda()} data-testid="sr-vip-meet-next">{t('meetNext', lang)}: {resolveDeck({ id: 'x', title: nextItem.title, slides: [] }, lang).title}{!touch && <kbd className="sr-kbd" aria-hidden="true">N</kbd>}</button>}
        {isAgenda && big && <button type="button" className="sr-btn sr-vip-meet-next" onClick={() => ex.startMeeting()} data-testid="sr-vip-meet-start-bar">{t('meetStart', lang)}</button>}
        {isFilm && <FilmControls lang={lang} ex={ex} fs={fs} touch={touch} big={big} />}
        {!isFilm && <div className="sr-vip-present" role="group" aria-label={t('vipPresenter', lang)} data-testid="sr-vip-presenter">
          {big && <p className="sr-vip-pbar-title" data-testid="sr-vip-pbar-title">{deck.slides.length > 1 ? `${idx + 1} / ${n} · ` : ''}{slide.title}</p>}
          <button type="button" className="sr-btn" onClick={() => ex.togglePlay()} aria-pressed={play.playing} data-testid="sr-vip-play">{play.playing ? t('vipPause', lang) : t('vipPlay', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">P</kbd>}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.cycleSpeed()} aria-label={`${t('vipSpeed', lang)}: ${play.speed}x`} data-testid="sr-vip-speed">{play.speed}x</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.toggleLoop()} aria-pressed={play.loop} data-testid="sr-vip-loop">{t('vipLoop', lang)}</button>
          {!big && <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setPresentMode('big')} data-testid="sr-vip-big">{t('vipPresent', lang)}</button>}
          {!big && <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setPresentMode('read')} data-testid="sr-vip-read">{t('vipReading', lang)}</button>}
          {!big && <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setPresentMode('full')} data-testid="sr-vip-full">{t('vipPresentFull', lang)}</button>}
          {big && !reading && <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setPresentMode('read')} data-testid="sr-vip-read">{t('vipReading', lang)}</button>}
          {big && <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setPresentMode('panel')} data-testid="sr-vip-exit-present">{t('vipPresentExit', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">Esc</kbd>}</button>}
          {(play.playing || big) && <div className="sr-vip-prog" role="progressbar" aria-label={t('vipProgress', lang)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((prog >= 0 ? prog : 0) * 100)} data-testid="sr-vip-prog"><i style={{ '--p': prog >= 0 ? prog : 0 }} /></div>}
        </div>}
        {(!isFilm || n > 1) && <nav className="sr-vip-nav" aria-label={t('vipSlides', lang)}>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.stepStation(-1)} disabled={idx === 0} data-testid="sr-vip-prev">{t('vipPrev', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">{rtl ? '→' : '←'}</kbd>}</button>
          {n <= 8 ? <ol className="sr-vip-dots">{rd.slides.map((x, i) => <li key={x.id}><button type="button" className="sr-vip-dot" aria-label={`${unit} ${i + 1}: ${x.title}`} aria-current={i === idx ? 'step' : undefined} onClick={() => ex.setStation(i)} data-testid={'sr-vip-dot-' + i} /></li>)}</ol>
            : <label className="sr-vip-scrub"><span className="sr-vip-sronly">{t('vipSlides', lang)}</span><input type="range" min={1} max={n} step={1} value={idx + 1} onChange={(e) => ex.setStation(Number(e.target.value) - 1)} aria-label={t('vipSlides', lang)} aria-valuetext={`${unit} ${idx + 1} / ${n}: ${slide.title}`} data-testid="sr-vip-scrub" /></label>}
          <button type="button" className="sr-btn" onClick={() => ex.stepStation(1)} disabled={idx === n - 1} data-testid="sr-vip-next">{t('vipNext', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">{rtl ? '←' : '→'}</kbd>}</button>
        </nav>}
        {!touch && !big && decks.length > 1 && <p className="sr-note sr-vip-keys">{t('vipDeckKeys', lang)}. {t(isFilm ? 'filmKeys' : 'vipPresentKeys', lang)}</p>}
      </footer>
      {dom && createPortal(<VipReader lang={lang} deckTitle={rd.title} slide={slide} raw={raw} idx={idx} n={n} touch={touch} reduced={reduced} tier={tier} onPrev={() => ex.stepStation(-1)} onNext={() => ex.stepStation(1)} onExit={() => ex.setPresentMode('panel')} />, (ex.canvas && ex.canvas.parentNode) || document.body)}
      {isFilm && ex.cinema && createPortal(<VipCinema lang={lang} ex={ex} />, (ex.canvas && ex.canvas.parentNode) || document.body)}
      {adding && createPortal(<VipDeckDialog lang={lang} ex={ex} max={MAX_USER_DECKS} onClose={() => { setAdding(false); }} />, (ex.canvas && ex.canvas.parentNode) || document.body)}
    </aside>
  );
}
