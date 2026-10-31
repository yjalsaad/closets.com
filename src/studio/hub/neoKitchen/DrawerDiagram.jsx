/* Neo Kitchen Designer - the "04 Drawers" technical diagram, drawn as vector SVG from the live model.g values
 * (see drawerArt.js for the scale). Isometric drawer assembly in a cabinet opening, a magnified detail circle
 * (side / bottom panel / groove) and a PLAN inset. Colours come only from the .nk-dw-* classes in neoKitchen.css. */
import React, { useId } from 'react';
import { drawerArtLayout, DRAWER_ART } from './drawerArt';
import { isHl } from './activeRow';

const Face = ({ p, hl }) => (
  <g className={`nk-dw-p nk-dw-${p.id}`} data-part={p.id} data-hl={hl}>
    <path className="nk-dw-top" d={p.top} />
    <path className="nk-dw-front" d={p.front} />
    <path className="nk-dw-right" d={p.right} />
  </g>
);

const Rect = ({ r, className, ...rest }) => <rect className={className} x={r.x} y={r.y} width={r.w} height={r.h} {...rest} />;

export default function DrawerDiagram({ g, onPick, active, lang = 'en' }) {
  const A = drawerArtLayout(g); const ar = lang === 'ar';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `nkdwc${uid}`;
  const D = A.detail; const PL = A.plan;
  const labels = ar ? { plan: 'المسقط', sg: 'الجانب · المجرى' } : { plan: 'PLAN', sg: 'SIDE · GROOVE' };
  const names = ar
    ? ['التحكم 1: الفراغ العمودي', 'التحكم 2: خلوص الجانب', 'التحكم 3: تراجع القاع', 'التحكم 4: فراغ الواجهة الجانبي']
    : ['Control 1: vertical gap', 'Control 2: side clearance', 'Control 3: bottom inset', 'Control 4: front side gap'];
  const dx = D.source[0] - D.cx, dy = D.source[1] - D.cy, dl = Math.hypot(dx, dy) || 1;
  const edge = [D.cx + (dx / dl) * D.r, D.cy + (dy / dl) * D.r];
  return (
    <svg viewBox={`0 0 ${DRAWER_ART.W} ${DRAWER_ART.H}`} className="nk-art nk-dw-art" role="group" aria-label={ar ? 'مجمّع الدرج في الفتحة: منظر أيزومتري' : 'Drawer assembly in its opening, isometric view'}
      data-front-side={g.drawerFrontSide != null ? g.drawerFrontSide : undefined} data-gap={g.drawerGap} data-side={g.drawerSide} data-bottom={g.drawerBottom}>
      {A.parts.map((p) => <Face key={p.id} p={p} hl={isHl(active, p.id)} />)}
      <g className="nk-dw-p nk-dw-ghost" aria-hidden="true"><path d={A.ghost.top} /><path d={A.ghost.front} /><path d={A.ghost.right} /></g>

      <path className="nk-dw-ext" d={A.marks.gap.ext} />
      <path className="nk-dw-ext nk-dw-closed" d={A.marks.gap.closed} />

      <line className="nk-dw-src" x1={D.source[0]} y1={D.source[1]} x2={edge[0]} y2={edge[1]} />
      <circle className="nk-sh-ref" cx={D.source[0]} cy={D.source[1]} r="3" />
      <clipPath id={clipId}><circle cx={D.cx} cy={D.cy} r={D.r} /></clipPath>
      <circle className="nk-dw-lens" cx={D.cx} cy={D.cy} r={D.r} />
      <g clipPath={`url(#${clipId})`} data-detail="1" data-dside={D.dSide} data-dbottom={D.dBot}>
        <Rect r={D.carcass} className="nk-dw-d-carc" />
        <Rect r={D.side} className="nk-dw-d-side" />
        <Rect r={D.groove} className="nk-dw-d-groove" />
        <Rect r={D.panel} className="nk-dw-d-panel" />
        <path className="nk-dw-edge" d={D.edgeMark} />
        {D.gapMeasure && <path className="nk-sh-meas" data-measure="d-side" d={D.gapMeasure} />}
        {D.botMeasure && <path className="nk-sh-meas" data-measure="d-bottom" d={D.botMeasure} />}
      </g>
      <circle className="nk-dw-zoom" cx={D.cx} cy={D.cy} r={D.r} />
      <text className="nk-dw-lbl" x={D.labelAt[0]} y={D.labelAt[1]} textAnchor="middle">{labels.sg}</text>

      <g data-plan="1" data-pside={PL.pSide}>
        <rect className="nk-dw-planbox" x={PL.x} y={PL.y} width={PL.w} height={PL.h} />
        <text className="nk-dw-lbl" x={PL.labelAt[0]} y={PL.labelAt[1]} textAnchor="middle">{labels.plan}</text>
        <Rect r={PL.carcL} className="nk-dw-d-carc" /><Rect r={PL.carcR} className="nk-dw-d-carc" />
        <Rect r={PL.boxBottom} className="nk-dw-planfloor" />
        <Rect r={PL.boxL} className="nk-dw-d-side" /><Rect r={PL.boxR} className="nk-dw-d-side" /><Rect r={PL.boxBack} className="nk-dw-d-side" />
        <Rect r={PL.front} className="nk-dw-d-panel" />
        {PL.mL && <path className="nk-sh-meas" d={PL.mL} />}
        {PL.mR && <path className="nk-sh-meas" d={PL.mR} />}
        {PL.fsL && <path className="nk-sh-meas" data-measure="front-side" d={PL.fsL} />}
      </g>

      {A.callouts.map((c) => (
        <g key={`l${c.n}`}>
          <path className="nk-sh-lead" d={`M${c.dot[0]} ${c.dot[1]}L${c.badge[0]} ${c.badge[1]}`} />
          <circle className="nk-sh-ref" cx={c.dot[0]} cy={c.dot[1]} r="3.4" />
        </g>
      ))}
      <path className="nk-sh-meas nk-dw-meas" data-measure="gap" d={A.marks.gap.d} />
      <path className="nk-sh-meas nk-dw-meas" data-measure="side" d={A.marks.side.d} />
      <path className="nk-sh-meas nk-dw-meas" data-measure="bottom" d={A.marks.bottom.d} />
      {A.callouts.map((c, i) => (
        <g key={c.n}>
          <g className="nk-sh-call nk-dw-call" role="button" tabIndex={0} aria-label={names[i]} data-call={c.n}
            onClick={() => onPick && onPick(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(i); } }}>
            <circle cx={c.badge[0]} cy={c.badge[1]} r="14" /><text x={c.badge[0]} y={c.badge[1] + 5.5} textAnchor="middle">{c.n}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}
