import React, { useEffect, useRef, useState } from 'react';
import { useDialog } from '../ui/useDialog';
import { COLLECTIONS } from './data';
import { ct } from './strings';
import { buildCollectionQuoteUrl, itemLabel, keyStep, pickL, stepIndex, swipeStep } from './logic';
import './collections.css';

/** Collections panel (same panel language as the product panels): the collection's own copy from the site, a finish gallery (arrow keys / swipe /
 *  buttons), the booking hand-off with the collection + finish as controlled text, and a link to the source page. Images are only requested while it is open. */
export function CollectionsPanel({ lang, touch, collectionId, onClose, fallbackFocus }) {
  const col = COLLECTIONS.find((c) => c.id === collectionId) || COLLECTIONS[0];
  const ref = useDialog(true, onClose, fallbackFocus), rtl = lang === 'ar';
  const [i, setI] = useState(0), drag = useRef(null), strip = useRef(null);
  const n = col ? col.items.length : 0, it = col ? col.items[i] : null;
  const go = (step) => setI((v) => (step === 'first' ? 0 : step === 'last' ? n - 1 : stepIndex(v, step, n)));
  useEffect(() => { const el = strip.current && strip.current.querySelector('[aria-current="true"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [i]);
  if (!col || !it) return null;
  const onKey = (e) => { const s = keyStep(e.key, rtl); if (s) { e.preventDefault(); go(s); } };
  const down = (e) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const up = (e) => { const d = drag.current; drag.current = null; if (!d) return; const s = swipeStep(e.clientX - d.x, e.clientY - d.y, rtl); if (s) go(s); };
  const img = it.image && (it.image.hero || it.image.thumb), quote = buildCollectionQuoteUrl({ collectionId: col.id, itemId: it.id, lang });
  return (
    <aside className="sr-panel sr-panel-col" role="dialog" aria-modal="false" aria-label={ct('panelAria', lang)} ref={ref} data-testid="sr-collections-panel" data-collection={col.id}>
      <header className="sr-panel-head">
        <p className="sr-eyebrow">{pickL(col.eyebrow, lang)}</p>
        <h2 tabIndex={-1} data-autofocus>{pickL(col.name, lang)}</h2>
        <button type="button" className="sr-btn sr-btn-line sr-panel-close" onClick={onClose} data-testid="sr-collections-close">{ct('back', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">Esc</kbd>}</button>
      </header>
      <div className="sr-panel-body">
        <div className="sr-panel-sec sr-col-gallery" role="group" aria-roledescription="carousel" aria-label={ct('gallery', lang)} tabIndex={0} onKeyDown={onKey} data-testid="sr-col-gallery">
          <div className="sr-col-stage" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { drag.current = null; }} data-has-image={img ? '1' : '0'}>
            {img
              ? <img key={it.id} src={img} alt={pickL(it.alt, lang)} width={it.image.w} height={it.image.h} loading="lazy" decoding="async" draggable={false} data-testid="sr-col-hero" />
              : <div className="sr-col-card" data-testid="sr-col-card"><span className="sr-col-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><b dir="ltr">{it.name.en}</b><span dir="ltr">{it.code || '—'}</span></div>}
            <button type="button" className="sr-col-nav sr-col-prev" onClick={() => go(-1)} aria-label={ct('prev', lang)} data-testid="sr-col-prev"><span aria-hidden="true">{rtl ? '›' : '‹'}</span></button>
            <button type="button" className="sr-col-nav sr-col-next" onClick={() => go(1)} aria-label={ct('next', lang)} data-testid="sr-col-next"><span aria-hidden="true">{rtl ? '‹' : '›'}</span></button>
          </div>
          <div className="sr-col-cap" aria-live="polite">
            <p className="sr-col-name"><b dir="ltr" data-testid="sr-col-name">{it.name.en}</b><span className="sr-col-count">{ct('of', lang).replace('{n}', String(i + 1)).replace('{total}', String(n))}</span></p>
            <p className="sr-note">{it.code ? <>{ct('code', lang)}: <span dir="ltr" data-testid="sr-col-code">{it.code}</span></> : ct('noCode', lang)}</p>
            {!img && <p className="sr-note" data-testid="sr-col-noimage">{ct('noImage', lang)}</p>}
          </div>
          <p className="sr-hint-inline">{ct('keysHint', lang)}</p>
        </div>
        <div className="sr-panel-sec">
          <h3>{ct('about', lang)}</h3>
          <p className="sr-col-desc" data-testid="sr-col-desc">{pickL(col.description, lang)}</p>
        </div>
        <div className="sr-panel-sec">
          <h3>{ct('materials', lang)}</h3>
          <ul className="sr-col-mats" data-testid="sr-col-materials">{col.materials.map((m) => <li key={m.en}>{pickL(m, lang)}</li>)}</ul>
        </div>
        <div className="sr-panel-sec">
          <h3>{ct('finishes', lang)} <span className="sr-col-count">{n} {pickL(col.countLabel, lang)}</span></h3>
          <ol className="sr-col-strip" ref={strip} data-testid="sr-col-strip">
            {col.items.map((x, k) => (
              <li key={x.id}><button type="button" className="sr-col-item" aria-current={k === i ? 'true' : undefined} onClick={() => setI(k)} data-item={x.id}>
                {x.image && x.image.small ? <img src={x.image.small} alt="" loading="lazy" decoding="async" width="40" height="40" /> : null}
                <span dir="ltr"><b>{x.name.en}</b><em>{x.code}</em></span>
              </button></li>
            ))}
          </ol>
        </div>
      </div>
      <footer className="sr-panel-foot">
        <a className="sr-btn" href={quote} data-testid="sr-col-quote" data-interest={itemLabel(it)}>{ct('quote', lang)}</a>
        <p className="sr-note">{ct('quoteNote', lang)}</p>
        <a className="sr-link sr-col-site" href={col.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="sr-col-site">{ct('site', lang)} <span aria-hidden="true">{'↗'}</span><span className="sr-sr-only"> ({ct('siteNote', lang)})</span></a>
      </footer>
    </aside>
  );
}
export default CollectionsPanel;
