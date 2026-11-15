import React, { useEffect, useState } from 'react';
import { t } from '../strings';

/** "Downloading the showroom... NN%": the preload store's real progress (preload/assetStore.js), small and unobtrusive, never in the way (pointer-events none). Shows only while the download runs
 *  (after the loading screen has gone), then "Showroom downloaded" for a few seconds. Nothing at all when the preload is skipped (data saver, 2g, ?bloomprefetch=0) or already complete from a previous visit. */
export default function PreloadPill({ store, lang, show }) {
  const [v, setV] = useState(store ? store.view : null);
  const [flash, setFlash] = useState(false);
  useEffect(() => (store ? store.subscribe((x) => setV({ ...x })) : undefined), [store]);
  const ran = !!v && v.state === 'done' && v.files > v.fromCache;   // finished AFTER downloading something (a pure cache hit shows nothing)
  useEffect(() => { if (!ran) return undefined; setFlash(true); const id = setTimeout(() => setFlash(false), 3500); return () => clearTimeout(id); }, [ran]);
  if (!show || !v) return null;
  const running = v.state === 'running' && v.pct < 100 && v.total > v.loaded;
  if (!running && !flash) return null;
  const n = running ? Math.min(99, Math.max(0, Math.round(v.pct))) : 100;
  return (
    <div className={'sr-prepill' + (running ? '' : ' is-done')} role="status" aria-live="off" data-testid="sr-preload">
      <span className="sr-prepill-text">{running ? t('bloomDownloading', lang) : t('bloomReady', lang)}</span>
      {running ? <span className="sr-prepill-pct" dir="ltr" data-testid="sr-preload-pct">{n}%</span> : null}
      <span className="sr-prepill-bar" aria-hidden="true"><i style={{ transform: `scaleX(${n / 100})` }} /></span>
    </div>
  );
}
