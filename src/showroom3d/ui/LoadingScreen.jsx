import React from 'react';
import { t } from '../strings';
import LogoImg from './LogoImg';

/** Full-screen loading view. `pct` is REAL progress (texture generation, scene build, shader compile, first frame). */
export default function LoadingScreen({ pct, lang, leaving }) {
  const n = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={'sr-loading' + (leaving ? ' is-leaving' : '')} role="status" aria-live="polite" data-testid="sr-loading">
      <div className="sr-loading-inner">
        <LogoImg className="sr-loading-logo" alt={t('brand', lang)} width="300" height="171" />
        <h1 className="sr-loading-title">{t('loadingTitle', lang)}</h1>
        <div className="sr-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={n} aria-label={t('loadStageLabel', lang)}>
          <span style={{ transform: `scaleX(${n / 100})` }} />
        </div>
        <div className="sr-pct" dir="ltr"><span data-testid="sr-pct">{n}</span><i>%</i></div>
        <p className="sr-loading-sub">{t('loadingSub', lang)}</p>
      </div>
    </div>
  );
}
