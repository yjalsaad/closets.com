/* Neo Kitchen Designer - "02 Carcass Boards" parameter card (UX-5): white card, isometric diagram seen from the back, numbered numeric rows, in-card warnings.
 * Same data path as every other control: NumField -> setGlobal (clamps to FIELD.board / back / inset / stretcher / grooveD) -> commit(model).
 * model.g feeds buildScene, so the 3D side / bottom / stretcher / back meshes, the elevation and the cut list all follow the typed value.
 * The selected row highlights the matching board in the diagram (the 3D view selects whole cabinets / single parts by click, not from a card). */
import React from 'react';
import { useActiveRow, CardRows } from './activeRow';
import { carcassIssues } from './carcassLogic';
import CarcassDiagram from './CarcassDiagram';
import './carcassCard.css';

export default function CarcassCard({ card, num, P, closet = false, children = null }) {
  const { model, lang } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const active = useActiveRow(card); const { sel, pick } = active;
  const issues = carcassIssues(model);
  return (
    <section className="nk-card nk-ccard nk-shelfcard nk-carcasscard" id={`nk-card-${card.id}`} aria-labelledby={`nk-card-h-${card.id}`}>
      <div className="nk-card-head">
        <span className="nk-cnum">{String(num).padStart(2, '0')}</span>
        <h3 className="nk-h3" id={`nk-card-h-${card.id}`}>{L(card.en, card.ar)}</h3>
      </div>
      <p className="nk-cdesc">{card.d[lang]}</p>
      <figure className="nk-shelf-stage nk-cc-stage">
        <CarcassDiagram g={model.g} sel={sel} onPick={pick} lang={lang} closet={closet} />
      </figure>
      <CardRows card={card} P={P} active={active} rowClass="nk-cc-row" />
      {children}
      {issues.length > 0 && (
        <ul className="nk-shelf-warn" role="status" aria-live="polite" data-testid="carcass-issues">
          {issues.map((it, i) => <li key={i} data-level={it.level} data-k={it.k}>{L(it.en, it.ar)}</li>)}
        </ul>
      )}
    </section>
  );
}
