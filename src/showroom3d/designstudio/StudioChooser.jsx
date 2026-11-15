/* "Which studio?": the small chooser E / Interact opens at a design wall that carries more than one section (Kitchen + TV Unit) when the visitor has not already named one
 * (a quick-nav entry, an adviser, a podium-tablet button all name one and skip this). One card per section with its own poster frame; choosing opens that designer. */
import React from 'react';
import { useDialog } from '../ui/useDialog';
import { dt, sdt } from './strings';
import { sectionName, posterUrls, stationName } from './sections';

export default function StudioChooser({ lang, sections, onPick, onClose, fallbackFocus }) {
  const L = lang === 'ar' ? 'ar' : 'en', ref = useDialog(true, onClose, fallbackFocus);
  return (
    <div className="sr-modal sr-modal-sheet sr-ds-choose-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sr-dialog sr-ds-choose" role="dialog" aria-modal="true" aria-labelledby="sr-ds-choose-t" ref={ref} data-testid="sr-ds-choose" dir={L === 'ar' ? 'rtl' : 'ltr'}>
        <div className="sr-dialog-head">
          <h2 id="sr-ds-choose-t">{stationName(sections, L)}<small>{dt('chooseTitle', L)}</small></h2>
          <button type="button" className="sr-btn sr-btn-line" onClick={onClose} data-testid="sr-ds-choose-close">{dt('chooseClose', L)}</button>
        </div>
        <p className="sr-dialog-sub">{dt('chooseHint', L)}</p>
        <ul className="sr-ds-choose-list">
          {sections.map((s, i) => (
            <li key={s.id}>
              <button type="button" className="sr-ds-card" onClick={() => onPick(s.id)} data-testid={'sr-ds-pick-' + s.id} data-autofocus={i === 0 ? '' : undefined}>
                <img src={posterUrls(s, L)[0]} alt="" decoding="async" width="320" height="180" />
                <span className="sr-ds-card-t">{sectionName(s, L)}</span>
                <span className="sr-ds-card-s">{sdt(s, 'guideBlurb', L)}</span>
                <span className="sr-ds-card-go">{dt('chooseOpen', L)} <span aria-hidden="true">{L === 'ar' ? '←' : '→'}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
