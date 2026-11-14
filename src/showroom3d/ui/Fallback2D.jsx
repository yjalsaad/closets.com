import React from 'react';
import { t } from '../strings';
import LogoImg from './LogoImg';
import { DEPARTMENTS } from '../scenes/main-hall/departments';
import { withLang } from '../vendor/routes';

/** 2D alternative when WebGL is missing or the 3D start fails: same brand, the same eight departments, real links onward. */
export default function Fallback2D({ lang, onRetry, error }) {
  const L = lang === 'ar' ? 'ar' : 'en';
  return (
    <main className="sr-fb" data-webgl-fallback data-testid="sr-fallback">
      <div className="sr-fb-card">
        <LogoImg className="sr-fb-logo" alt={t('brand', L)} width="240" height="137" />
        <h1>{error ? t('errorTitle', L) : t('fbTitle', L)}</h1>
        <p>{t('fbBody', L)}</p>
        <h2>{t('fbDepartments', L)}</h2>
        <ul className="sr-fb-grid">
          {DEPARTMENTS.map((d, i) => (<li key={d.id}><b dir="ltr">{String(i + 1).padStart(2, '0')}</b><span>{L === 'ar' ? d.ar : d.en}</span></li>))}
        </ul>
        <div className="sr-fb-actions">
          <a className="sr-btn" href={withLang('/projects', L)}>{t('fbGallery', L)}</a>
          <a className="sr-btn sr-btn-line" href="/visualizer">{t('fbVisualizer', L)}</a>
          <a className="sr-btn sr-btn-line" href={withLang('/booking', L)}>{t('fbBook', L)}</a>
          {onRetry && <button type="button" className="sr-btn sr-btn-line" onClick={onRetry}>{t('errorRetry', L)}</button>}
        </div>
      </div>
    </main>
  );
}
