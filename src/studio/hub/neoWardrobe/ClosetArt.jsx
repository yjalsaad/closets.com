/* Neo Wardrobe Studio [NEO-CLOSETS-UX25] - the two diagrams that are new for the closet (the rest are the Neo Kitchen diagrams).
 *   HeightsArt: front + side elevation with numbered callouts 1 plinth, 2 body, 3 top box, 4 closet depth, 5 plinth setback (the dimension lines are drawn from the live values).
 *   RailArt:    front view, rail tube under the top, two shelves between the sides, callouts 1 shelf thickness, 2 rail diameter, 3 rail drop, 4 rail height from floor.
 * Colours: only the .nk-sh-* classes of neoKitchen.css and the .nkw-art-* ones of wardrobeStudio.css (tokens). `active` = the part ids the active row highlights. */
import React from 'react';
import { heightsArtLayout, railArtLayout, HEIGHTS_ART, RAIL_ART } from './closetArtLayout';

const hl = (active, id) => (active && active.indexOf(id) >= 0 ? '1' : '0');
const Badge = ({ c, label, onPick, r = 13 }) => (
  <g className="nk-sh-call nkw-art-call" role="button" tabIndex={0} aria-label={label} data-call={c.n}
    onClick={() => onPick && onPick(c.n - 1)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(c.n - 1); } }}>
    <circle cx={c.badge[0]} cy={c.badge[1]} r={r} /><text x={c.badge[0]} y={c.badge[1] + 4.6} textAnchor="middle">{c.n}</text>
  </g>
);
const Lead = ({ c }) => (
  <g>
    <path className="nk-sh-lead" d={`M${c.dot[0]} ${c.dot[1]}L${c.badge[0]} ${c.badge[1]}`} />
    <circle className="nk-sh-ref" cx={c.dot[0]} cy={c.dot[1]} r="3" />
  </g>
);

export const HEIGHTS_NAMES = {
  en: ['Control 1: plinth height', 'Control 2: body height (computed)', 'Control 3: top box height', 'Control 4: closet depth', 'Control 5: plinth setback'],
  ar: ['التحكم 1: ارتفاع القاعدة', 'التحكم 2: ارتفاع الهيكل (محسوب)', 'التحكم 3: ارتفاع الصندوق العلوي', 'التحكم 4: عمق الخزانة', 'التحكم 5: تراجع القاعدة'],
};

export function HeightsArt({ v, active, onPick, lang = 'en' }) {
  const A = heightsArtLayout(v); const ar = lang === 'ar'; const names = HEIGHTS_NAMES[ar ? 'ar' : 'en'];
  const { front: F, side: S } = A;
  const R = ({ r, cls, id }) => (r ? <rect className={cls} x={r.x} y={r.y} width={r.w} height={r.h} data-part={id} data-hl={hl(active, id)} /> : null);
  return (
    <svg viewBox={`0 0 ${HEIGHTS_ART.W} ${HEIGHTS_ART.H}`} className="nk-art nkw-art nkw-art-heights" role="group" data-testid="heights-art"
      aria-label={ar ? 'الخزانة من الأمام ومن الجانب: القاعدة والهيكل والصندوق العلوي والعمق وتراجع القاعدة' : 'The closet from the front and from the side: plinth, body, top box, depth and plinth setback'}
      data-h={v.h} data-plinth={v.plinthH} data-topbox={v.topBoxH} data-depth={v.depth} data-setback={v.setback}>
      <line className="nkw-art-floor" x1="20" y1={F.floorY} x2={HEIGHTS_ART.W - 20} y2={F.floorY} />
      {/* front elevation */}
      <rect className="nk-sh-frame" x={F.frame.x} y={F.frame.y} width={F.frame.w} height={F.frame.h} />
      <R r={F.body} cls="nk-sh-open nkw-art-body" id="body" />
      <R r={F.topBox} cls="nk-sh-open nkw-art-topbox" id="topbox" />
      {F.dividers.map((x) => <line key={x} className="nkw-art-div" x1={x} y1={F.body.y} x2={x} y2={F.body.y + F.body.h} />)}
      <R r={F.plinth} cls="nk-sh-board nkw-art-plinth" id="plinth" />
      {/* side elevation */}
      <R r={S.door} cls="nk-sh-frame nkw-art-door" id="door" />
      <R r={S.body} cls="nk-sh-open nkw-art-sidebody" id="sidebody" />
      <R r={S.topBox} cls="nk-sh-open nkw-art-sidetop" id="sidetop" />
      <R r={S.plinth} cls="nk-sh-board nkw-art-plinth" id="plinth" />
      {/* dimension lines */}
      <path className="nk-sh-meas" data-measure="overall" d={A.measures.overall} />
      <path className="nk-sh-meas" data-measure="body" d={A.measures.bodyTop} />
      <path className="nk-sh-meas" data-measure="plinth" d={A.measures.plinth} data-hl={hl(active, 'plinth')} />
      <path className="nk-sh-meas" data-measure="depth" d={A.measures.depth} data-hl={hl(active, 'depth')} />
      {A.measures.setback && <path className="nk-sh-meas" data-measure="setback" d={A.measures.setback} data-hl={hl(active, 'setback')} />}
      {A.callouts.map((c) => <Lead key={`l${c.n}`} c={c} />)}
      {A.callouts.map((c, i) => <Badge key={c.n} c={c} label={names[i]} onPick={onPick} />)}
    </svg>
  );
}

export const RAIL_NAMES = {
  en: ['Control 1: shelf board thickness', 'Control 2: rail diameter', 'Control 3: rail drop', 'Control 4: rail height from the floor'],
  ar: ['التحكم 1: سماكة لوح الرف', 'التحكم 2: قطر المعلاق', 'التحكم 3: نزول المعلاق', 'التحكم 4: ارتفاع المعلاق من الأرض'],
};

export function RailArt({ v, active, onPick, lang = 'en' }) {
  const A = railArtLayout(v); const ar = lang === 'ar'; const names = RAIL_NAMES[ar ? 'ar' : 'en'];
  return (
    <svg viewBox={`0 0 ${RAIL_ART.W} ${RAIL_ART.H}`} className="nk-art nkw-art nkw-art-rail" role="group" data-testid="rail-art"
      aria-label={ar ? 'منظر أمامي: المعلاق تحت السقف والرفوف بين الجانبين' : 'Front view: the rail under the top, shelves between the sides'}
      data-thk={v.shelfThk} data-dia={v.railDia} data-drop={v.railDrop} data-railh={v.railH}>
      <rect className="nk-sh-frame" x={A.FX0} y={A.FY0} width={A.FX1 - A.FX0} height={A.FY1 - A.FY0} />
      <rect className="nk-sh-open" x={A.ix0} y={A.iy0} width={A.ix1 - A.ix0} height={A.iy1 - A.iy0} />
      {A.shelves.map((r, i) => <rect key={i} className="nk-sh-board" x={r.x} y={r.y} width={r.w} height={r.h} data-part={`shelf-${i + 1}`} data-hl={hl(active, 'shelf')} />)}
      <rect className="nkw-art-rail" x={A.rail.x} y={A.rail.y} width={A.rail.w} height={A.rail.h} rx={A.rail.h / 2} data-part="rail" data-hl={hl(active, 'rail')} />
      <path className="nk-sh-meas" data-measure="thk" d={A.measures.thk} data-hl={hl(active, 'shelf')} />
      <path className="nk-sh-meas" data-measure="dia" d={A.measures.dia} data-hl={hl(active, 'rail')} />
      {A.measures.drop && <path className="nk-sh-meas" data-measure="drop" d={A.measures.drop} data-hl={hl(active, 'drop')} />}
      <path className="nk-sh-meas" data-measure="floor" d={A.measures.floor} data-hl={hl(active, 'floor')} />
      {A.callouts.map((c) => <Lead key={`l${c.n}`} c={c} />)}
      {A.callouts.map((c, i) => <Badge key={c.n} c={c} label={names[i]} onPick={onPick} r={11} />)}
    </svg>
  );
}
