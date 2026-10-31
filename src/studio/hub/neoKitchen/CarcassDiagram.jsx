/* Neo Kitchen Designer - the "02 Carcass Boards" technical diagram, drawn as vector SVG from the live model.g values
 * (see carcassArt.js for the scale). Isometric carcass seen from the back: sides, bottom, two top stretchers, the back
 * panel in its groove. `sel` is the highlighted board (pale yellow, orange outline). Colours: only the .nk-cc-* classes
 * in carcassCard.css. */
import React from 'react';
import { carcassArtLayout, CARCASS_ART, CARCASS_SEL } from './carcassArt';

const Board = ({ p, on }) => (
  <g className={`nk-cc-p nk-cc-b-${p.id}${on ? ' nk-cc-sel' : ''}`} data-part={p.id} data-sel={on ? '1' : '0'}>
    <path className="nk-cc-top" d={p.top} />
    <path className="nk-cc-rear" d={p.rear} />
    <path className="nk-cc-side" d={p.side} />
  </g>
);

export const CARCASS_NAMES = {
  en: ['Control 1: carcass board thickness', 'Control 2: back board thickness', 'Control 3: back inset', 'Control 4: top stretcher width', 'Control 5: back groove depth'],
  ar: ['التحكم 1: سماكة لوح الهيكل', 'التحكم 2: سماكة لوح الظهر', 'التحكم 3: تراجع الظهر', 'التحكم 4: عرض الرباط العلوي', 'التحكم 5: عمق مجرى الظهر'],
};

export default function CarcassDiagram({ g, sel = 0, onPick, lang = 'en', closet = false }) {
  const A = carcassArtLayout(g, { closet }); const ar = lang === 'ar';
  const target = CARCASS_SEL[sel];
  const names = CARCASS_NAMES[lang] || CARCASS_NAMES.en;
  const on = (id) => ((id === 'right' || (closet && (id === 'top' || id === 'left'))) && target === 'right') || (id === 'back' && (target === 'back' || target === 'groove')) || ((id === 'stretchF' || id === 'stretchR') && target === 'stretchers');
  return (
    <svg viewBox={`0 0 ${CARCASS_ART.W} ${CARCASS_ART.H}`} className="nk-art nk-cc-art" role="group" data-sel={target}
      aria-label={ar ? 'هيكل خزانة من الخلف: جانبان وقاعدة ولوح ظهر في مجراه ورباطان علويان، منظر أيزومتري' : 'Cabinet carcass seen from the back: two sides, bottom, back panel in its groove and two top stretchers, isometric view'}
      data-closet={closet ? '1' : '0'} data-board={g.board} data-back={g.back} data-inset={g.inset} data-stretcher={g.stretcher} data-groove={g.grooveD}>
      {!closet && <text className="nk-cc-lbl" x={A.labelDot[0]} y="26" textAnchor="middle">{ar ? 'الرباط الأمامي' : 'FRONT STRETCHER'}</text>}
      <text className="nk-cc-lbl" x={CARCASS_ART.W / 2} y={CARCASS_ART.H - 14} textAnchor="middle">{ar ? 'منظر من الخلف' : 'SEEN FROM THE BACK'}</text>
      {['left', 'bottom'].map((id) => <Board key={id} p={A.by[id]} on={closet && id === 'left' && target === 'right'} />)}
      <path className={`nk-cc-recess${target === 'inset' ? ' nk-cc-sel' : ''}`} data-recess="L" d={A.recessL} />
      <path className={`nk-cc-recess${target === 'inset' ? ' nk-cc-sel' : ''}`} data-recess="B" d={A.recessB} />
      <path className={`nk-cc-slot${target === 'groove' ? ' nk-cc-sel' : ''}`} data-slot="L" d={A.slotL} />
      <path className={`nk-cc-slot${target === 'groove' ? ' nk-cc-sel' : ''}`} data-slot="B" d={A.slotB} />
      {(closet ? ['back', 'top', 'right'] : ['stretchF', 'back', 'stretchR', 'right']).map((id) => <Board key={id} p={A.by[id]} on={on(id)} />)}
      {!closet && <circle className="nk-cc-dot" cx={A.labelDot[0]} cy={A.labelDot[1]} r="3" />}
      {A.callouts.map((c) => (
        <g key={`l${c.n}`}>
          <path className="nk-sh-lead" d={`M${c.dot[0]} ${c.dot[1]}L${c.badge[0]} ${c.badge[1]}`} />
          <circle className="nk-sh-ref" cx={c.dot[0]} cy={c.dot[1]} r="3.4" />
        </g>
      ))}
      {A.callouts.map((c, i) => (
        <g key={c.n} className="nk-sh-call nk-cc-call" role="button" tabIndex={0} aria-label={names[i]} data-call={c.n}
          onClick={() => onPick && onPick(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(i); } }}>
          <circle cx={c.badge[0]} cy={c.badge[1]} r="14" /><text x={c.badge[0]} y={c.badge[1] + 5.5} textAnchor="middle">{c.n}</text>
        </g>
      ))}
    </svg>
  );
}
