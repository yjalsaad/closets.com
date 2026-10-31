/* Neo Kitchen Designer - "05 Shelves" parameter card (UX-2): white card, front-view diagram, two numbered numeric rows.
 * Same data path as every other control: NumField -> setGlobal (clamps to FIELD.shelfThk / shelfPlay) -> commit(model).
 * model.g feeds buildScene, so the diagram, the 3D shelf meshes, the elevation and the cut list all follow the typed value. */
import React from 'react';
import { useActiveRow, CardRows } from './activeRow';
import { ShelfArt } from './Art';
import { shelfIssues } from './shelfLogic';

export default function ShelvesCard({ card, num, P }) {
  const { model, lang } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const active = useActiveRow(card);
  const issues = shelfIssues(model);
  return (
    <section className="nk-card nk-ccard nk-shelfcard" id={`nk-card-${card.id}`} aria-labelledby={`nk-card-h-${card.id}`}>
      <div className="nk-card-head">
        <span className="nk-cnum">{String(num).padStart(2, '0')}</span>
        <h3 className="nk-h3" id={`nk-card-h-${card.id}`}>{L(card.en, card.ar)}</h3>
      </div>
      <p className="nk-cdesc">{card.d[lang]}</p>
      <figure className="nk-shelf-stage">
        <ShelfArt g={model.g} onPick={active.pick} active={active.parts} lang={lang} />
        <figcaption className="nk-shelf-cap">{L('front view · shelf between the two sides', 'منظر أمامي · الرف بين الجانبين')}</figcaption>
      </figure>
      <CardRows card={card} P={P} active={active} />
      {issues.length > 0 && (
        <ul className="nk-shelf-warn" role="status" aria-live="polite" data-testid="shelf-issues">
          {issues.map((it, i) => <li key={i} data-level={it.level}>{L(it.en, it.ar)}</li>)}
        </ul>
      )}
    </section>
  );
}
