import React from 'react';
import { t } from '../strings';
import LogoImg from './LogoImg';

export default function Hud({ lang, tier, reduced, onLang, onReplay, homeHref }) {
  return (
    <div className="sr-hud" data-testid="sr-hud">
      <header className="sr-hud-top">
        <a className="sr-pill sr-pill-logo" href={homeHref} aria-label={t('exit', lang)}>
          <LogoImg alt="" width="77" height="44" />
        </a>
        <div className="sr-hud-actions">
          <button type="button" className="sr-btn" onClick={onReplay}>{reduced ? t('playIntro', lang) : t('replayIntro', lang)}</button>
          <button type="button" className="sr-btn" onClick={onLang} lang={lang === 'ar' ? 'en' : 'ar'} aria-label={t('langToggleLabel', lang)}>{t('langToggle', lang)}</button>
          <a className="sr-btn sr-btn-line" href={homeHref}>{t('exit', lang)}</a>
        </div>
      </header>
      <footer className="sr-hud-bottom">
        <div className="sr-note">
          <span className="sr-badge">{t('previewBadge', lang)}</span>
          <span>{t('previewNote', lang)}</span>
        </div>
        <p className="sr-hint">{t('hintLook', lang)}</p>
        <span className="sr-quality">{t('qualityLabel', lang)}: {t('quality' + tier.charAt(0).toUpperCase() + tier.slice(1), lang)}</span>
      </footer>
    </div>
  );
}
