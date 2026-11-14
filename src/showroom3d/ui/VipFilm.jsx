import React, { useEffect, useRef } from 'react';
import { t } from '../strings';
import { L, DISCLAIMER } from '../vip/deckSchema';
import { FILM_TITLE, FILM_AI_LABEL, fmtTime } from '../vip/film';

const live = (fs) => !!fs && (fs.status === 'playing' || fs.status === 'paused' || fs.status === 'ended' || fs.status === 'ready');

/** FILM mode in the panel: what the film is, its state ("Film coming soon" when the files are not there yet), the current caption, the AI label and the closing notice */
export function FilmBody({ lang, fs }) {
  const status = fs ? fs.status : 'idle', title = L((fs && fs.film && fs.film.title) || FILM_TITLE, lang);
  return (
    <div className="sr-vip-slide sr-vip-film" data-testid="sr-vip-film" data-status={status}>
      <p className="sr-lead">{title}</p>
      {status === 'missing' && <><p className="sr-vip-film-soon" role="status" data-testid="sr-vip-film-soon">{t('filmSoon', lang)}</p><p className="sr-note">{t('filmSoonNote', lang)}</p></>}
      {(status === 'idle' || status === 'loading') && <p className="sr-note" role="status">{t('filmLoading', lang)}</p>}
      {live(fs) && <p className="sr-note">{t('filmHint', lang)}</p>}
      {live(fs) && fs.caption !== 'off' && fs.cue && <p className="sr-vip-film-cue" dir={fs.caption === 'ar' ? 'rtl' : 'ltr'} lang={fs.caption} data-testid="sr-vip-film-cue">{fs.cue}</p>}
      {status !== 'missing' && <p className="sr-note sr-vip-film-ai" data-testid="sr-vip-film-ai">{L(FILM_AI_LABEL, lang)}</p>}
      <p className="sr-note sr-vip-disc" data-testid="sr-vip-disclaimer">{L(DISCLAIMER, lang)}</p>
    </div>
  );
}

/** play / pause, seek, volume, captions, cinema mode, big screen. Play is a button press (a user gesture): the film is never started automatically. */
export function FilmControls({ lang, ex, fs, touch, big }) {
  const ok = live(fs), playing = !!fs && fs.status === 'playing', dur = (fs && fs.duration) || 0, cap = fs ? fs.caption : 'off';
  return (
    <div className="sr-vip-present sr-vip-filmbar" role="group" aria-label={t('vipPresenter', lang)} data-testid="sr-vip-filmbar">
      <button type="button" className="sr-btn" onClick={() => ex.filmToggle()} disabled={!ok} aria-pressed={playing} data-testid="sr-vip-film-play">{playing ? t('filmPause', lang) : fs && fs.status === 'ended' ? t('filmReplay', lang) : t('filmPlay', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">P</kbd>}</button>
      <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.filmCaptions()} disabled={!ok} data-testid="sr-vip-film-cc">{t('filmCaptions', lang)}: {cap === 'off' ? t('filmCaptionsOff', lang) : cap.toUpperCase()}</button>
      <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setCinema(true)} disabled={!ok} data-testid="sr-vip-film-cinema">{t('filmCinema', lang)}</button>
      {!big && <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setPresentMode('big')} data-testid="sr-vip-big">{t('vipPresent', lang)}</button>}
      {big && <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.setPresentMode('panel')} data-testid="sr-vip-exit-present">{t('vipPresentExit', lang)}</button>}
      <label className="sr-vip-film-range sr-vip-film-seek"><span>{fmtTime(fs ? fs.time : 0)} / {fmtTime(dur)}</span>
        <input type="range" min={0} max={Math.max(1, Math.round(dur))} step={1} value={Math.min(Math.round(fs ? fs.time : 0), Math.max(1, Math.round(dur)))} onChange={(e) => ex.filmSeek(Number(e.target.value))} disabled={!ok || !ex.film || !ex.film.video} aria-label={t('filmSeek', lang)} data-testid="sr-vip-film-seek" /></label>
      <label className="sr-vip-film-range sr-vip-film-vol"><span>{t('filmVolume', lang)}</span>
        <input type="range" min={0} max={1} step={0.05} value={fs && !fs.muted ? fs.volume : 0} onChange={(e) => ex.filmVolume(Number(e.target.value))} disabled={!ok} aria-label={t('filmVolume', lang)} data-testid="sr-vip-film-vol" /></label>
    </div>
  );
}

/** cinema mode: the explorer's film host (the one <video>, now with native controls and native captions) covers the stage; this adds the exit button and the AI label on top */
export function VipCinema({ lang, ex }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus({ preventScroll: true }); }, []);
  return (
    <div className="sr-vip-cinema" role="dialog" aria-modal="true" aria-label={t('filmCinema', lang)} data-testid="sr-vip-cinema" dir={lang === 'ar' ? 'rtl' : 'ltr'} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); ex.setCinema(false); } }}>
      <button type="button" className="sr-btn sr-btn-line" ref={ref} onClick={() => ex.setCinema(false)} data-testid="sr-vip-cinema-exit">{t('filmCinemaExit', lang)}</button>
      <span className="sr-vip-cinema-ai">{L(FILM_AI_LABEL, lang)}</span>
    </div>
  );
}
