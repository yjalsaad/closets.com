/* Neo Kitchen Designer - the "Drilling" plan of one selected part [NEO-HINGES-UX35].
 * A 2D plan of the part with every bore (hinge cups on a door, plate screws / shelf pins on a side panel, handle holes) at its real position, and a list
 * with the same numbers: diameter, depth, X / Y from the part's lower-left corner in the drawn plane - the very coordinates the DXF flat-panel sheet and the
 * cut list machining use (hingeHw.drillPlan wraps cutlist.panelDrill). Click a hole (or its row) to read its dimensions. Colours: tokens only. */
import React, { useState, useEffect } from 'react';
import { drillPlan, drillTypeLabel, opText } from './hingeHw';

const AXN = { W: ['width', 'العرض'], D: ['depth', 'العمق'], H: ['height', 'الارتفاع'] };

export default function DrillPlan({ scene, part, lang = 'en', onClose }) {
  const ar = lang === 'ar';
  const plan = React.useMemo(() => drillPlan(scene, part), [scene, part]);
  const [pick, setPick] = useState(null);
  useEffect(() => { setPick(null); }, [part && part.id]);
  if (!plan) return null;
  const L = plan.L, W = plan.W;
  // the plan is drawn long side across: x = along the part's long axis, y = across
  const pad = 14, scale = Math.min(520 / Math.max(L, 1), 150 / Math.max(W, 1));
  const w = L * scale, h = W * scale;
  const sel = plan.ops.find((o) => o.n === pick) || null;
  const axName = (k) => AXN[k][ar ? 1 : 0];
  const n1 = (v) => String(Math.round(v * 10) / 10);
  return (
    <section className="nk-dp" data-testid="drill-plan" aria-label={ar ? 'مخطط الثقوب' : 'Drilling plan'}>
      <header className="nk-dp-h">
        <b>{ar ? 'مخطط الثقوب' : 'Drilling plan'}</b>
        <small dir="ltr">{n1(L)} × {n1(W)} mm · X = {axName(plan.axes[0])} · Y = {axName(plan.axes[1])}</small>
        {onClose && <button type="button" className="nk-ib" aria-label={ar ? 'إغلاق' : 'Close'} onClick={onClose} data-testid="drill-close">×</button>}
      </header>
      <div className="nk-dp-body">
        <svg className="nk-dp-svg" viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`} role="group" aria-label={ar ? 'مخطط ثقوب القطعة' : 'Drilling plan of the part'} dir="ltr">
          <rect x="0" y="0" width={w} height={h} className="nk-dp-part" />
          {plan.ops.map((o) => (
            <g key={o.n} className={`nk-dp-op nk-dp-${o.type}${pick === o.n ? ' nk-dp-on' : ''}`} role="button" tabIndex={0} data-op={o.n}
              aria-label={opText(o, lang)} onClick={() => setPick(pick === o.n ? null : o.n)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPick(pick === o.n ? null : o.n); } }}>
              <circle cx={o.x * scale} cy={h - o.y * scale} r={Math.max(2.2, o.r * scale)} />
              <circle cx={o.x * scale} cy={h - o.y * scale} r={Math.max(7, o.r * scale + 4)} className="nk-dp-hit" />
              <text x={o.x * scale} y={h - o.y * scale} textAnchor="middle" dominantBaseline="central" className="nk-dp-n">{o.n}</text>
              <title>{opText(o, lang)}</title>
            </g>
          ))}
        </svg>
        <div className="nk-dp-side">
          <ol className="nk-dp-list">
            {plan.ops.map((o) => (
              <li key={o.n}>
                <button type="button" className={`nk-dp-row${pick === o.n ? ' nk-dp-on' : ''}`} data-op={o.n} aria-pressed={pick === o.n} onClick={() => setPick(pick === o.n ? null : o.n)}>
                  <span className={`nk-dp-dot nk-dp-${o.type}`} aria-hidden="true">{o.n}</span>
                  <span dir="auto" className="nk-dp-t">{drillTypeLabel(o.type, lang)}</span>
                  <span dir="ltr" className="nk-dp-v">Ø{n1(o.dia)} × {o.depth === null ? (ar ? 'نافذ' : 'thru') : n1(o.depth)} · {n1(o.x)}, {n1(o.y)}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="nk-dp-info" dir="auto" data-testid="drill-info" aria-live="polite">
            {sel ? opText(sel, lang) : (ar ? 'اضغط على ثقب لعرض أبعاده.' : 'Click a hole to see its dimensions.')}
          </p>
          {plan.grooves > 0 && <p className="nk-dp-note" dir="auto">{ar ? `+ ${plan.grooves} مجرى للظهر (انظر ملف DXF)` : `+ ${plan.grooves} back-panel groove lines (see the DXF)`}</p>}
        </div>
      </div>
    </section>
  );
}
