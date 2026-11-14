import React, { useEffect, useRef } from 'react';
import { t } from '../strings';
import { SlideBody } from './VipSlide';

/** READING MODE on a portrait screen (phones): the 3D wall cannot fill a narrow viewport legibly, so the slide is shown full-screen in large type instead. Same content, same controls. */
export function VipReader({ lang, deckTitle, slide, raw, idx, n, touch, reduced, tier, onPrev, onNext, onExit }) {
  const ref = useRef(null), rtl = lang === 'ar';
  useEffect(() => { if (ref.current) ref.current.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [idx]);
  return (
    <div className="sr-vip-reader" role="dialog" aria-modal="true" aria-label={t('vipReading', lang)} ref={ref} tabIndex={-1} dir={rtl ? 'rtl' : 'ltr'} data-testid="sr-vip-reader">
      <header className="sr-vip-reader-top"><span>{deckTitle} · {idx + 1} / {n}</span><button type="button" className="sr-btn sr-btn-line" onClick={onExit} data-testid="sr-vip-reader-exit">{t('vipPresentExit', lang)}</button></header>
      {raw.builtin ? <p className="sr-lead">{slide.title}</p> : <><h2 className="sr-vip-reader-title">{slide.title}</h2><SlideBody key={raw.id} lang={lang} slide={slide} reduced={reduced} tier={tier} /></>}
      <nav className="sr-vip-reader-nav" aria-label={t('vipSlides', lang)}>
        <button type="button" className="sr-btn sr-btn-line" onClick={onPrev} disabled={idx === 0} data-testid="sr-vip-reader-prev">{t('vipPrev', lang)}</button>
        <button type="button" className="sr-btn" onClick={onNext} disabled={idx === n - 1} data-testid="sr-vip-reader-next">{t('vipNext', lang)}</button>
      </nav>
    </div>
  );
}
