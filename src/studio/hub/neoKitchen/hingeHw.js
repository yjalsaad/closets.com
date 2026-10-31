/* Neo Kitchen Designer - hinge hardware model [NEO-HINGES-UX35]. Pure functions (no THREE, no React, no colours), unit-tested.
 *
 * ONE source of truth for the REAL hinge picture used by the 3D view (Kitchen3D / hingeHw3d.js), the elevation drilling marks, the selected-door
 * callouts and the drilling plan card. Nothing here invents a position: the cup centres are scene.hinges (the same rows the DXF draws and the cut
 * list counts, count = hingeCount(door height)), and the mounting-plate screw holes are the ones cutlist.panelDrill() puts on the side panel
 * (a test compares both, so the 3D hole and the CNC / DXF hole can never drift apart). Changing the cup diameter, the cup edge distance, the door
 * thickness or the door height changes scene.hinges and therefore everything drawn from it.
 *
 * Geometry conventions (same as geometry.js): u = along the run (left -> right as seen from the front), y = up, d = depth from the wall (front = max d). */
import { MFG } from './constants';
import { CUP_DEPTH } from './doorLogic';
import { panelDrill } from './cutlist';

/** door open angle used by Kitchen3D (degrees) - the hinge arm is solved for the same swing */
export const OPEN_DEG = 100;
/** mm: mounting-plate screw pairs sit this far above / below the hinge centre (cutlist.panelDrill uses +-16, a 32 mm pair) */
export const PLATE_DY = 16;
/** mm: depth of the plate screw pilot holes drawn in the drilling plan (the 3D screw is as long) */
export const PLATE_SCREW_DEPTH = 10;
/** mm: how far the cup body (the clip-on boss) stands out of the bore into the carcass */
export const BOSS = 8;
/** mm: arm link cross-section height (y) and thickness */
export const ARM = { h: 12, t: 3 };
/** mm: mounting plate board (thickness along u, length along y, width along d) */
export const PLATE = { t: 2, len: 48, w: 14 };

const r1 = (v) => Math.round(v * 10) / 10;
const num = (v) => String(r1(v));

/** the L / R hinge side letters of a door, as the hinge rows carry them ('T' = flip-up, hinged on the top edge) */
export const handOf = (h) => (h.side === 'L' || h.side === 'R' ? h.side : 'T');

/**
 * Every hinge of the scene as a drawable set: cup (bore) on the door's back face + the mounting plate on the carcass side panel that carries it.
 * [{ id, partId, unitId, runKey, row, flip, side, index, count, cup:{u,y,d,r,depth,fromEdge,fromTop,fromBottom},
 *    plate:{ partId, u, d, dir, y, screws:[y,y], r } | null, pivot:{u,d} | null, h }]
 * `d` of the cup is the door's BACK face (where the bore starts); `plate.u` is the inner face of the side panel, `plate.dir` is +1 when the plate sits
 * on a left panel (its face looks along +u) and -1 on a right panel.
 */
export function hingeSets(scene) {
  if (!scene || !scene.hinges || !scene.hinges.length) return []; // a custom piece / category scene may carry no hinge rows
  const byId = new Map(scene.parts.map((p) => [p.id, p]));
  const perDoor = new Map();
  scene.hinges.forEach((h) => { perDoor.set(h.partId, (perDoor.get(h.partId) || 0) + 1); });
  const seen = new Map();
  const sideOf = new Map();
  scene.parts.forEach((p) => { if (p.kind === 'side') sideOf.set(`${p.unitId}|${p.sideR ? 'R' : 'L'}`, p); });
  const out = [];
  scene.hinges.forEach((h) => {
    const p = byId.get(h.partId); if (!p) return;
    const face = p.elevBox || p.box; // glass doors: the bore is in the frame's inner face (elevBox = whole door), not the thinner glass pane
    const idx = seen.get(h.partId) || 0; seen.set(h.partId, idx + 1);
    const count = perDoor.get(h.partId) || 1;
    const fromEdge = h.flip ? null : h.side === 'L' ? h.u - face.u0 : face.u1 - h.u;
    const fromTop = face.y1 - h.y, fromBottom = h.y - face.y0;
    const sp = h.flip ? null : sideOf.get(`${h.unitId}|${h.side === 'R' ? 'R' : 'L'}`);
    const right = h.side === 'R';
    const plate = h.flip ? null : {
      partId: sp ? sp.id : null,
      u: sp ? (right ? sp.box.u0 : sp.box.u1) : h.sideU,
      d: (sp ? sp.box.d1 : face.d0) - MFG.pinEdge,
      dir: right ? -1 : 1,
      y: h.y, screws: [h.y - PLATE_DY, h.y + PLATE_DY], r: MFG.pinR,
    };
    const anim = p.anim && p.anim.k === 'door' ? p.anim : null;
    out.push({
      id: `${h.partId}@${idx}`, partId: h.partId, unitId: h.unitId, runKey: p.runKey, row: p.row, flip: !!h.flip, side: handOf(h), index: idx, count,
      cup: { u: h.u, y: h.y, d: face.d0, r: h.r, depth: CUP_DEPTH, fromEdge, fromTop, fromBottom }, plate,
      pivot: anim ? { u: anim.pivotU, d: anim.pivotD } : null, h,
    });
  });
  return out;
}

/** hinge sets of ONE door part (selection overlay, callouts) */
export const hingesOfPart = (scene, partId) => hingeSets(scene).filter((s) => s.partId === partId);

/* ---------------------------------------------------------------- callouts ---- */
/** 'Ø35 × 12.5 · 22.5 from edge · 100 from top' - the centre distances a driller needs (the first / last hinge sit hingeEnd from the door edge) */
export function cupCallout(set, lang = 'en') {
  const c = set.cup, ar = lang === 'ar';
  const top = c.fromTop <= c.fromBottom;
  const parts = [`Ø${num(c.r * 2)} × ${num(c.depth)}`];
  if (c.fromEdge !== null) parts.push(`${num(c.fromEdge)} ${ar ? 'من الحافة' : 'from edge'}`);
  parts.push(`${num(top ? c.fromTop : c.fromBottom)} ${top ? (ar ? 'من الأعلى' : 'from top') : (ar ? 'من الأسفل' : 'from bottom')}`);
  return parts.join(' · ');
}
/** 'Hinge side L · 3 hinges' */
export function hingeSummary(sets, lang = 'en') {
  if (!sets.length) return '';
  const ar = lang === 'ar', n = sets.length, s = sets[0].side;
  const side = s === 'T' ? (ar ? 'علوي (قلاب)' : 'top (flip-up)') : s === 'L' ? (ar ? 'يسار' : 'left') : (ar ? 'يمين' : 'right');
  return ar ? `جهة المفصلات: ${side} · ${n} مفصلة` : `Hinge side: ${side} · ${n} hinge${n === 1 ? '' : 's'}`;
}

/* --------------------------------------------------------------- arm solver ---- */
/** Door pose about its hinge axis, scene frame: the point (u, d) of the door turned by `t` (0 closed .. 1 open). Mirrors Kitchen3D (node.rotation.y = (L ? -1 : 1) * OPEN * t). */
export function turnAboutPivot(pivot, side, t, u, d) {
  const th = (side === 'L' ? -1 : 1) * (OPEN_DEG * Math.PI / 180) * t;
  const x = u - pivot.u, z = d - pivot.d;
  return { u: pivot.u + x * Math.cos(th) + z * Math.sin(th), d: pivot.d - x * Math.sin(th) + z * Math.cos(th) };
}
/** fixed end of the arm (on the plate) and the moving end (on the cup boss) in the scene frame at open fraction t, plus the two link lengths */
export function armEnds(set, t) {
  if (!set.plate || !set.pivot) return null;
  const P = { u: set.plate.u, d: set.plate.d };
  const q0 = { u: set.cup.u, d: set.cup.d - BOSS };
  const Q = turnAboutPivot(set.pivot, set.side, t, q0.u, q0.d);
  return { P, Q };
}
const dist = (a, b) => Math.hypot(a.u - b.u, a.d - b.d);
/** the two equal link lengths of the folding arm: just long enough to reach across the whole swing, with a small slack so the knee never locks straight */
export function armLinkLen(set) {
  let m = 0;
  for (let i = 0; i <= 20; i++) { const e = armEnds(set, i / 20); if (e) m = Math.max(m, dist(e.P, e.Q)); }
  return Math.max(12, (m / 2) * 1.12);
}
/** knee of a two-link arm from fixed point P to moving point Q (both {u,d}), links `L` long; `side` is the direction ({u,d} unit vector) the knee bends towards.
 *  Out of reach (an exploded view pulls the ends apart): the knee is the middle of P-Q, the arm is straight. */
export function kneeOf(P, Q, L, side) {
  const dx = Q.u - P.u, dz = Q.d - P.d, D = Math.hypot(dx, dz);
  const mid = { u: (P.u + Q.u) / 2, d: (P.d + Q.d) / 2 };
  if (D < 1e-6 || D >= 2 * L) return mid;
  const h = Math.sqrt(L * L - (D / 2) * (D / 2));
  const nx = -dz / D, nz = dx / D; // a unit normal of P-Q
  const s = (nx * side.u + nz * side.d) >= 0 ? 1 : -1;
  return { u: mid.u + s * nx * h, d: mid.d + s * nz * h };
}
/** the full arm pose in the scene frame at open fraction t: [P, K, Q] (null for hinges with no arm: flip-up fittings) */
export function armPose(set, t) {
  const e = armEnds(set, t); if (!e) return null;
  const L = armLinkLen(set);
  const K = kneeOf(e.P, e.Q, L, { u: set.plate.dir, d: 0 }); // the knee bends into the carcass (away from the side panel)
  return { P: e.P, K, Q: e.Q, L };
}

/* ------------------------------------------------------------ drilling plan ---- */
export const DRILL_DEPTH = { cup: CUP_DEPTH, plate: PLATE_SCREW_DEPTH, pin: PLATE_SCREW_DEPTH, handle: null };
const TYPE_LABEL = {
  cup: ['Hinge cup bore', 'ثقب كوب المفصلة'], plate: ['Hinge plate screw', 'برغي قاعدة المفصلة'], pin: ['Shelf pin hole', 'ثقب مسمار الرف'], handle: ['Handle hole', 'ثقب المقبض'],
};
export const drillTypeLabel = (type, lang = 'en') => (TYPE_LABEL[type] || [type, type])[lang === 'ar' ? 1 : 0];

/**
 * The 2D drilling plan of ONE part: every bore with its position measured from the part's lower-left corner in the drawn plane (the same coordinates
 * the DXF flat-panel sheet uses), diameter and depth. Returns null for parts with nothing drilled.
 * { L, W, axes, ops:[{ n, type, x, y, r, dia, depth (null = through), label }], grooves:[...] }
 */
export function drillPlan(scene, part) {
  if (!part) return null;
  const dr = panelDrill(scene, part);
  if (!dr.circles.length) return null;
  const thk = part.ext ? Math.min(part.ext.w, part.ext.d, part.ext.h) : null;
  const ops = dr.circles.map((c, i) => ({
    n: i + 1, type: c.type, x: r1(c.x), y: r1(c.y), r: c.r, dia: r1(c.r * 2),
    depth: c.type === 'handle' ? null : DRILL_DEPTH[c.type] === undefined ? null : DRILL_DEPTH[c.type],
  }));
  return { L: dr.L, W: dr.W, axes: dr.axes, thk, ops, grooves: dr.lines.filter((l) => l.type === 'groove').length };
}
/** one line of text for an operation: 'Hinge cup bore · Ø35 × 12.5 deep · X 22.5 · Y 100' */
export function opText(op, lang = 'en') {
  const ar = lang === 'ar';
  const depth = op.depth === null ? (ar ? 'نافذ' : 'through') : `${num(op.depth)} ${ar ? 'عمق' : 'deep'}`;
  return `${drillTypeLabel(op.type, lang)} · Ø${num(op.dia)} × ${depth} · X ${num(op.x)} · Y ${num(op.y)}`;
}

/* ------------------------------------------------------------------- LOD ---- */
/** Level of detail for the 3D hinge hardware: 'full' (cups, arms, plates), 'basic' (bores + plates only, no folding arms) or 'off'.
 *  Far away every hinge is a speck; a big job (many doors) drops the arms first so the draw / matrix work stays flat. */
export const LOD = { farOff: 12000, farBasic: 7500, manyHinges: 240 };
export function hwLod({ dist: dd, hinges }) {
  if (!(hinges > 0)) return 'off';
  if (dd > LOD.farOff) return 'off';
  if (dd > LOD.farBasic || hinges > LOD.manyHinges) return 'basic';
  return 'full';
}
