import React from 'react';
import { t } from '../strings';
import LogoImg from './LogoImg';

/** Overlay for the cinematic: cream veil + logo card (driven by refs for per-frame updates), letterbox bars, captions, Skip. */
const IntroLayer = React.forwardRef(function IntroLayer({ lang, caption, onSkip, active }, refs) {
  return (
    <div className={'sr-intro' + (active ? ' is-active' : '')} aria-hidden={active ? undefined : true}>
      <div className="sr-veil" ref={refs.veil} />
      <div className="sr-logocard" ref={refs.logo}>
        <LogoImg alt={t('brand', lang) + ' ' + t('brandByline', lang)} width="420" height="240" />
        <span className="sr-byline">{t('brandByline', lang)}</span>
        <span className="sr-logocard-rule" />
        <span className="sr-logocard-sub">{t('capBrand', lang)}</span>
      </div>
      <div className="sr-bars" ref={refs.bars}><i /><i /></div>
      <p className={'sr-caption' + (caption ? ' is-on' : '')} aria-live="polite" key={caption || 'none'}>{caption ? t(caption, lang) : ''}</p>
      {active && <button type="button" className="sr-skip" onClick={onSkip} data-testid="sr-skip">{t('skipIntro', lang)}<span aria-hidden="true" className="sr-skip-arrow" /></button>}
    </div>
  );
});
export default IntroLayer;
