import React from 'react';
import { t } from '../strings';

/** Floor 2 only: the state of the Bloom film download. "Preparing film… 40%" while it downloads, "Film ready" once it can start instantly (nothing plays without a click). */
export default function FilmPill({ lang, explorerRef, rev }) {
  const x = explorerRef.current, p = x && x.bloomFilmPrep ? x.bloomFilmPrep() : { state: 'off', pct: 0 };   // rev (vipFilmRev) re-renders this when the download moves
  if (p.state === 'off') return null;
  const ready = p.state === 'ready';
  return <p className={'sr-filmpill' + (ready ? ' is-ready' : '')} role="status" data-testid="sr-filmpill" data-state={p.state} data-rev={rev}>{ready ? t('filmReadyPill', lang) : t('filmPrep', lang) + ' ' + Math.round(p.pct) + '%'}</p>;
}
