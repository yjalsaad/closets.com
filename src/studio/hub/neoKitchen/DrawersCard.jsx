/* Neo Kitchen Designer - "04 Drawers" parameter card (UX-3): white card, numbered numeric rows, in-card warnings.
 * Same data path as every other control: NumField -> setGlobal (clamps to FIELD.drawerGap / drawerSide / drawerBottom) -> commit(model).
 * model.g feeds buildScene, so the 3D drawer meshes, the elevation and the cut list all follow the typed value. */
import React from 'react';
import { useActiveRow, CardRows } from './activeRow';
import { drawerIssues } from './drawerLogic';
import DrawerDiagram from './DrawerDiagram';

export default function DrawersCard({ card, num, P, children = null }) {
  const { model, lang } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const active = useActiveRow(card);
  const issues = drawerIssues(model);
  return (
    <section className="nk-card nk-ccard nk-shelfcard nk-drawercard" id={`nk-card-${card.id}`} aria-labelledby={`nk-card-h-${card.id}`}>
      <div className="nk-card-head">
        <span className="nk-cnum">{String(num).padStart(2, '0')}</span>
        <h3 className="nk-h3" id={`nk-card-h-${card.id}`}>{L(card.en, card.ar)}</h3>
      </div>
      <p className="nk-cdesc">{card.d[lang]}</p>
      <figure className="nk-shelf-stage">
        <DrawerDiagram g={model.g} onPick={active.pick} active={active.parts} lang={lang} />
        <figcaption className="nk-shelf-cap">{L('isometric schematic - drawn from your values', 'رسم تخطيطي أيزومتري - مرسوم من قيمك')}</figcaption>
      </figure>
      <CardRows card={card} P={P} active={active} />
      {children}
      {issues.length > 0 && (
        <ul className="nk-shelf-warn" role="status" aria-live="polite" data-testid="drawer-issues">
          {issues.map((it, i) => <li key={i} data-level={it.level}>{L(it.en, it.ar)}</li>)}
        </ul>
      )}
    </section>
  );
}
