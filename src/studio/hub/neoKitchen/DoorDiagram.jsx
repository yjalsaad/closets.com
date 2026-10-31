/* Neo Kitchen Designer - the "03 Doors & Hinges" technical diagram, drawn as vector SVG from the live model.g values
 * (see doorArt.js for the scale). Isometric carcass with one door open (true board thickness along its edge, hinge-cup
 * bores on its inner face) and one door closed. Colours come only from the .nk-do-* classes in neoKitchen.css. */
import React from 'react';
import { doorArtLayout, DOOR_ART } from './doorArt';
import { isHl } from './activeRow';

const Face = ({ p, kind, hl }) => (
  <g className={`nk-do-p nk-do-${kind} nk-do-part-${p.id}`} data-part={p.id} data-hl={hl}>
    <path className="nk-do-top" d={p.top} />
    <path className="nk-do-front" d={p.front} />
    <path className="nk-do-right" d={p.right} />
  </g>
);

export default function DoorDiagram({ g, onPick, active, lang = 'en' }) {
  const A = doorArtLayout(g); const ar = lang === 'ar';
  const names = ar
    ? ['التحكم 1: سماكة لوح الباب', 'التحكم 2: فراغ الباب', 'التحكم 3: قطر كوب المفصلة', 'التحكم 4: مسافة حافة الكوب']
    : ['Control 1: door board thickness', 'Control 2: door gap', 'Control 3: hinge cup diameter', 'Control 4: cup edge distance'];
  return (
    <svg viewBox={`0 0 ${DOOR_ART.W} ${DOOR_ART.H}`} className="nk-art nk-do-art" role="group"
      aria-label={ar ? 'هيكل خزانة بباب مفتوح وباب مغلق: منظر أيزومتري' : 'Cabinet carcass with one door open and one closed, isometric view'}
      data-thk={g.doorThk} data-gap={g.doorGap} data-cup={g.hingeCup} data-edge={g.cupEdge}>
      {A.parts.map((p) => <Face key={p.id} p={p} kind={p.id.startsWith('door') ? 'door' : 'carc'} hl={isHl(active, p.id)} />)}
      <path className="nk-do-handle" d={A.handle} />
      {A.cups.map((c) => <path key={c.id} className="nk-do-cup" data-cup={c.id} data-hl={isHl(active, `cup-${c.id}`)} d={c.d} />)}

      <path className="nk-do-ext" d={A.marks.thk.ext} />
      {A.callouts.map((c) => (
        <g key={`l${c.n}`}>
          <path className="nk-sh-lead" d={`M${c.dot[0]} ${c.dot[1]}L${c.badge[0]} ${c.badge[1]}`} />
          <circle className="nk-sh-ref" cx={c.dot[0]} cy={c.dot[1]} r="3.4" />
        </g>
      ))}
      <path className="nk-sh-meas nk-do-meas" data-measure="thk" d={A.marks.thk.d} />
      <path className="nk-sh-meas nk-do-meas" data-measure="gap" d={A.marks.gap.d} />
      <path className="nk-sh-meas nk-do-meas" data-measure="cup" d={A.marks.cup.d} />
      <path className="nk-sh-meas nk-do-meas" data-measure="edge" d={A.marks.edge.d} />
      {A.callouts.map((c, i) => (
        <g key={c.n} className="nk-sh-call nk-do-call" role="button" tabIndex={0} aria-label={names[i]} data-call={c.n}
          onClick={() => onPick && onPick(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(i); } }}>
          <circle cx={c.badge[0]} cy={c.badge[1]} r="14" /><text x={c.badge[0]} y={c.badge[1] + 5.5} textAnchor="middle">{c.n}</text>
        </g>
      ))}
    </svg>
  );
}
