/* Neo Kitchen Designer - simple SVG illustrations for the numbered control cards.
 * Numbered callouts match the numbered controls under each card; click a callout to focus its input. */
import React from 'react';
import { shelfArtLayout, SHELF_ART } from './shelfLogic';
import DrawerDiagram from './DrawerDiagram';
import DoorDiagram from './DoorDiagram';
import { isHl } from './activeRow';

function Call({ n, x, y, onPick }) {
  return (
    <g className="nk-art-call" role="button" tabIndex={0} aria-label={`Control ${n}`} onClick={() => onPick && onPick(n - 1)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(n - 1); } }}>
      <circle cx={x} cy={y} r="8.5" />
      <text x={x} y={y + 3.4} textAnchor="middle">{n}</text>
    </g>
  );
}
const Dim = ({ x1, y1, x2, y2 }) => <path className="nk-art-dim" d={`M${x1} ${y1}L${x2} ${y2}M${x1 - 3} ${y1}h6M${x2 - 3} ${y2}h6`} />;
const DimH = ({ x1, y1, x2, y2 }) => <path className="nk-art-dim" d={`M${x1} ${y1}L${x2} ${y2}M${x1} ${y1 - 3}v6M${x2} ${y2 - 3}v6`} />;

function SectionArt({ g, onPick }) {
  const topH = g.topH;
  const total = g.plinthH + g.baseH + g.counterThk + g.gap + g.wallH + topH * 0.6;
  const s = 130 / total, y0 = 158;
  const Y = (mm) => y0 - mm * s;
  const rows = [
    ['plinth', 0, g.plinthH], ['base', g.plinthH, g.plinthH + g.baseH], ['counter', g.plinthH + g.baseH, g.plinthH + g.baseH + g.counterThk],
    ['wall', g.plinthH + g.baseH + g.counterThk + g.gap, g.plinthH + g.baseH + g.counterThk + g.gap + g.wallH],
  ];
  const wallTop = rows[3][2];
  const dsc = 0.14; // depth scale
  const sx = 175;
  return (
    <svg viewBox="0 0 300 175" className="nk-art" role="group" aria-label="Kitchen section">
      <text className="nk-art-cap" x="20" y="12">FRONT</text><text className="nk-art-cap" x="190" y="12">SIDE</text>
      {rows.map(([k, a, b]) => <rect key={k} className={`nk-art-fill nk-art-${k}`} x="20" y={Y(b)} width="92" height={(b - a) * s} />)}
      <rect className="nk-art-ghost" x="20" y={Y(wallTop + topH)} width="92" height={topH * s} />
      <line className="nk-art-axis" x1="112" y1={Y(0)} x2="112" y2={Y(wallTop + topH)} />
      <Call n={1} x={126} y={Y(g.plinthH / 2)} onPick={onPick} />
      <Call n={2} x={126} y={Y(g.plinthH + g.baseH / 2)} onPick={onPick} />
      <Call n={3} x={126} y={Y(g.plinthH + g.baseH + g.counterThk / 2) - 2} onPick={onPick} />
      <Call n={4} x={126} y={Y(g.plinthH + g.baseH + g.counterThk + g.gap / 2)} onPick={onPick} />
      <Call n={5} x={126} y={Y(wallTop - g.wallH / 2)} onPick={onPick} />
      <Call n={6} x={126} y={Y(wallTop + topH / 2)} onPick={onPick} />
      <rect className="nk-art-fill nk-art-wall" x={sx} y={Y(wallTop)} width={g.wallD * dsc * 1.5} height={g.wallH * s} />
      <rect className="nk-art-fill nk-art-base" x={sx} y={Y(g.plinthH + g.baseH)} width={g.baseD * dsc} height={g.baseH * s} />
      <rect className="nk-art-fill nk-art-counter" x={sx} y={Y(g.plinthH + g.baseH + g.counterThk)} width={g.baseD * dsc + g.overhang * dsc + 6} height={g.counterThk * s} />
      <rect className="nk-art-fill nk-art-plinth" x={sx + g.plinthSetback * dsc} y={Y(g.plinthH)} width={g.baseD * dsc - g.plinthSetback * dsc} height={g.plinthH * s} />
      <line className="nk-art-wallline" x1={sx - 1} y1="18" x2={sx - 1} y2="160" />
      <DimH x1={sx} y1="166" x2={sx + g.baseD * dsc} y2="166" />
      <Call n={7} x={sx + (g.baseD * dsc) / 2} y={Y(g.plinthH + g.baseH / 2)} onPick={onPick} />
      <Call n={8} x={sx + (g.wallD * dsc * 1.5) / 2} y={Y(wallTop - g.wallH / 2)} onPick={onPick} />
      <Call n={9} x={sx + g.baseD * dsc + 14} y={Y(g.plinthH + g.baseH + g.counterThk) - 12} onPick={onPick} />
      <Call n={10} x={sx + 14} y={Y(g.plinthH / 2) + 14} onPick={onPick} />
    </svg>
  );
}

function CarcassArt({ g, onPick }) {
  const t = Math.max(6, g.board * 1.1), W = 120, D = 100, x = 40, y = 30;
  return (
    <svg viewBox="0 0 300 175" className="nk-art" role="group" aria-label="Carcass cross-section">
      <text className="nk-art-cap" x="20" y="14">PLAN</text>
      <rect className="nk-art-fill nk-art-board" x={x} y={y} width={t} height={D} />
      <rect className="nk-art-fill nk-art-board" x={x + W - t} y={y} width={t} height={D} />
      <rect className="nk-art-fill nk-art-back" x={x + t - 5} y={y + 14} width={W - 2 * t + 10} height="6" />
      <rect className="nk-art-fill nk-art-board" x={x + t} y={y + D - 26} width={W - 2 * t} height="10" />
      <rect className="nk-art-fill nk-art-board" x={x + t} y={y} width={W - 2 * t} height="10" opacity=".5" />
      <Dim x1={x - 10} y1={y} x2={x - 10} y2={y + 14} />
      <DimH x1={x} y1={y + D + 12} x2={x + t} y2={y + D + 12} />
      <Call n={1} x={x + t / 2} y={y + D + 28} onPick={onPick} />
      <Call n={2} x={x + W / 2} y={y + 6} onPick={onPick} />
      <Call n={3} x={x - 24} y={y + 8} onPick={onPick} />
      <Call n={4} x={x + W + 22} y={y + D - 22} onPick={onPick} />
      <text className="nk-art-cap" x="200" y="14">GROOVE</text>
      <circle className="nk-art-zoom" cx="236" cy="72" r="42" />
      <rect className="nk-art-fill nk-art-board" x="212" y="38" width="22" height="66" />
      <rect className="nk-art-fill nk-art-back" x="226" y="52" width="40" height="8" />
      <Call n={5} x="250" y="84" onPick={onPick} />
    </svg>
  );
}

/* Front view of a cabinet with two shelves, generated from the real values (see shelfLogic.shelfArtLayout):
   shelf thickness and per-side play are drawn proportionally, so typing a number redraws the picture. */
export function ShelfArt({ g, onPick, active, lang = 'en' }) {
  const A = shelfArtLayout(g); const s1 = A.shelves[0];
  const ar = lang === 'ar';
  const Badge = ({ n, x, y, label }) => (
    <g className="nk-sh-call" role="button" tabIndex={0} aria-label={label} onClick={() => onPick && onPick(n - 1)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(n - 1); } }}>
      <circle cx={x} cy={y} r="11" /><text x={x} y={y + 4.5} textAnchor="middle">{n}</text>
    </g>
  );
  const bx = A.FX1 + 24, refY = s1.y - 26, pb = A.FX0 - 36;
  return (
    <svg viewBox={`0 0 ${SHELF_ART.W} ${SHELF_ART.H}`} className="nk-art nk-sh-art" role="group" aria-label={ar ? 'منظر أمامي للرفوف' : 'Shelves, front view'} data-thk={g.shelfThk} data-play={g.shelfPlay}>
      <rect className="nk-sh-frame" x={A.FX0} y={A.FY0} width={A.FX1 - A.FX0} height={A.FY1 - A.FY0} />
      <rect className="nk-sh-open" x={A.ix0} y={A.iy0} width={A.ix1 - A.ix0} height={A.iy1 - A.iy0} />
      {A.shelves.map((r, i) => (
        <g key={i}>
          <rect className="nk-sh-board" x={r.x} y={r.y} width={r.w} height={r.h} data-shelf={i + 1} data-part={`shelf-${i + 1}`} data-hl={isHl(active, `shelf-${i + 1}`)} />
          {A.dotX.map((dx) => <circle key={dx} className="nk-sh-dot" cx={dx} cy={r.dotY} r="2.6" />)}
        </g>
      ))}
      {A.play >= 3 && <path className="nk-sh-meas" data-part="play" data-hl={isHl(active, 'play')} d={`M${A.ix0} ${s1.cy}H${A.ix0 + A.play}M${A.ix0} ${s1.cy - 4}v8M${A.ix0 + A.play} ${s1.cy - 4}v8`} />}
      <path className="nk-sh-meas" d={`M${A.FX1 + 8} ${s1.y}v${s1.h}M${A.FX1 + 3} ${s1.y}h10M${A.FX1 + 3} ${s1.y + s1.h}h10`} />
      <Badge n={1} x={bx + 14} y={s1.cy} label={ar ? 'التحكم 1: لوح الرف' : 'Control 1: shelf board'} />
      <path className="nk-sh-lead" d={`M${pb + 11} ${refY}H${A.ix0}`} />
      <circle className="nk-sh-ref" cx={A.ix0} cy={refY} r="3.6" />
      <Badge n={2} x={pb} y={refY} label={ar ? 'التحكم 2: خلوص الرف' : 'Control 2: shelf clearance'} />
    </svg>
  );
}

function WorktopArt({ g, onPick }) {
  const bh = Math.max(14, Math.min(90, g.backsplashH * 0.3));
  return (
    <svg viewBox="0 0 300 175" className="nk-art" role="group" aria-label="Worktop and splashback">
      <line className="nk-art-wallline" x1="70" y1="10" x2="70" y2="165" />
      <rect className="nk-art-fill nk-art-counter" x="70" y="100" width="150" height={Math.max(8, g.counterThk * 0.4)} />
      {g.backsplashH > 0 && <rect className="nk-art-fill nk-art-counter" x="70" y={100 - bh} width="8" height={bh} />}
      <rect className="nk-art-fill nk-art-base" x="70" y={100 + Math.max(8, g.counterThk * 0.4)} width="130" height="50" />
      <circle className="nk-art-zoom" cx="236" cy="52" r="34" />
      <rect className="nk-art-fill nk-art-counter" x="212" y="46" width="48" height="14" />
      <rect className="nk-art-fill nk-art-edge" x="258" y="46" width="3" height="14" />
      <Call n={1} x="262" y="72" onPick={onPick} />
      <Dim x1="62" y1={100 - bh} x2="62" y2="100" />
      <Call n={2} x="44" y={100 - bh / 2} onPick={onPick} />
    </svg>
  );
}

function LegArt({ onPick, depth = 600, length = 2100 }) {
  const k = 0.05;
  return (
    <svg viewBox="0 0 300 175" className="nk-art" role="group" aria-label="Return leg plan">
      <rect className="nk-art-fill nk-art-base" x="30" y="24" width="220" height="34" />
      <rect className="nk-art-fill nk-art-base" x="30" y="58" width={depth * k + 4} height={Math.min(110, length * k)} />
      <rect className="nk-art-hidden" x="30" y="24" width={depth * k + 4} height="34" />
      <DimH x1="30" y1="172" x2={30 + depth * k + 4} y2="172" />
      <Dim x1="14" y1="24" x2="14" y2={24 + Math.min(144, length * k + 34)} />
      <Call n={1} x={30 + (depth * k) / 2 + 2} y="130" onPick={onPick} />
      <Call n={3} x="28" y="100" onPick={onPick} />
      <text className="nk-art-cap" x="150" y="100">MAIN RUN</text>
    </svg>
  );
}

export default function CardArt({ id, g, legs, onPick, lang }) {
  switch (id) {
    case 'heights': return <SectionArt g={g} onPick={onPick} />;
    case 'carcass': return <CarcassArt g={g} onPick={onPick} />;
    case 'doors': return <DoorDiagram g={g} onPick={onPick} lang={lang} />;
    case 'drawers': return <DrawerDiagram g={g} onPick={onPick} lang={lang} />;
    case 'shelves': return <ShelfArt g={g} onPick={onPick} lang={lang} />;
    case 'worktop': return <WorktopArt g={g} onPick={onPick} />;
    case 'leg': return <LegArt onPick={onPick} depth={legs && legs.depth} length={legs && legs.length} />;
    default: return null;
  }
}
