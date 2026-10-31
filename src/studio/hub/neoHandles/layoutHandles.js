/* =============================================================================
 * [NEO-HANDLES-UX36] Kitchen layout drawings: the FLOOR PLAN and the END VIEW of a peninsula / island. PURE.
 *
 * Floor plan (neoKitchen/planView.js: world millimetres, x along the main run, z towards the room = DOWN the drawing):
 *   - every run's free end (leg length, peninsula projection, island / second-run length): the same setters as the elevation's run-length pill
 *   - the galley AISLE and the island's clearance (`xl.aisle` / `xl.gap`), the island's START along the main run (`xl.off`)
 * End view (neoKitchen/endView.js: depth runs left (back) -> right (front), height up; handle coordinates are {u: depth, y: height}):
 *   - base depth, countertop overhang + thickness, plinth height + setback, base carcass height, the seating overhang (`xl.seatD`)
 * ===========================================================================*/
import { setRunWidth, setGlobal, setXl, runLenRange, penProjection, penLengthFor } from '../neoKitchen/model';
import { FIELD, XL } from '../neoKitchen/constants';
import { planView, toWorld } from '../neoKitchen/planView';
import { endViewModel } from '../neoKitchen/endView';
import { makeHandle, snapList, T } from './handleModel';

export function planHandles({ model, scene }) {
  if (!scene) return [];
  const out = []; const g = model.g; const xl = model.xl || null;
  const pv = planView(scene);
  scene.runs.forEach((r) => {
    const f = r.frame || { x: 0, z: 0, rot: 0 };
    const uEnd = r.flip ? 0 : r.L; const uIn = uEnd + (r.flip ? 100 : -100);
    const pe = toWorld(f, uEnd, r.D / 2); const pi = toWorld(f, uIn, r.D / 2);
    const dx = pe.x - pi.x; const dz = pe.z - pi.z;
    const dir = Math.abs(dz) > Math.abs(dx) ? (dz > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
    const isPen = r.key === 'pen'; const rng = runLenRange(r.key);
    const reach = (t) => { const q = setRunWidth(model, r.key, isPen ? penLengthFor(model, t) : t); return isPen ? q.value - g.baseD : q.value; };
    const lo = Math.max(isPen ? XL.minProj : rng.min, reach(isPen ? XL.minProj : rng.min)); const hi = Math.min(isPen ? rng.max - g.baseD : rng.max, reach(isPen ? rng.max - g.baseD : rng.max));
    const nm = { main: ['Kitchen width', 'عرض المطبخ'], left: ['Left leg length', 'طول الرجل اليسرى'], right: ['Right leg length', 'طول الرجل اليمنى'], run2: ['Second run length', 'طول الصف الثاني'], pen: ['Peninsula projection', 'بروز الجزيرة الممتدة'], isl: ['Island length', 'طول الجزيرة'] }[r.key] || ['Run length', 'طول الصف'];
    out.push(makeHandle({
      id: `run:${r.key}:len`, kind: 'width', dir, at: { u: pe.x, y: pe.z }, value: isPen ? penProjection(model) : r.L, min: lo, max: hi, step: 10, snap: snapList(lo, hi, [], [1200, 1800, 2400, 3000, 3600, 4200]), group: 'overall', level: 1,
      label: T(nm[0], nm[1]), tip: T('Drag along the run: its length', 'اسحب على امتداد الصف: طوله'),
      reasons: { min: T(`Shortest is ${lo} mm`, `الأقصر ${lo} مم`), max: T(`Longest is ${hi} mm`, `الأطول ${hi} مم`) },
      apply: (v) => { const q = setRunWidth(model, r.key, isPen ? penLengthFor(model, v) : v); return { next: q.model, value: isPen ? q.value - g.baseD : q.value, clamped: !!q.clamped }; },
    }));
  });
  /* the aisle between two facing worktops: dragging the far run's front away from the main run widens it */
  const a = pv.aisles.find((q) => !q.horizontal);
  if (a && xl && (xl.kind === 'galley' || xl.kind === 'island')) {
    const k = xl.kind === 'galley' ? 'aisle' : 'gap'; const rg = XL[k];
    out.push(makeHandle({
      id: `xl:${k}`, kind: 'position', dir: 'down', at: { u: a.x, y: a.z1 }, value: xl[k], min: rg.min, max: rg.max, step: 50, snap: snapList(rg.min, rg.max, rg.rec, [900, 1000, 1200, 1500]), group: 'overall', level: 1,
      label: xl.kind === 'galley' ? T('Aisle width', 'عرض الممر') : T('Island clearance', 'الفراغ حول الجزيرة'), tip: T('Drag up / down: the clear space between the two worktop fronts', 'اسحب لأعلى/لأسفل: المسافة الصافية بين واجهتي السطحين'),
      reasons: { min: T(`Narrowest is ${rg.min} mm`, `الأضيق ${rg.min} مم`), max: T(`Widest is ${rg.max} mm`, `الأعرض ${rg.max} مم`) },
      apply: (v) => { const m = setXl(model, { [k]: Math.round(v) }); return { next: m, value: m.xl[k], clamped: m.xl[k] !== Math.round(v) }; },
    }));
  }
  /* the island's start along the main run */
  const isl = scene.runs.find((r) => r.key === 'isl');
  if (isl && xl && xl.kind === 'island') {
    const rs = pv.rects.filter((q) => q.run === 'isl'); const x0 = Math.min(...rs.map((q) => q.x0)); const zs = rs.flatMap((q) => [q.z0, q.z1]);
    const mainL = scene.runs.find((r) => r.key === 'main').L;
    out.push(makeHandle({
      id: 'xl:off', kind: 'position', dir: 'right', at: { u: x0, y: (Math.min(...zs) + Math.max(...zs)) / 2 }, value: xl.off, min: -Math.round(isl.L), max: mainL, step: 50, snap: [0, Math.round((mainL - isl.L) / 2)], group: 'overall', level: 1,
      label: T('Island position', 'موضع الجزيرة'), tip: T('Drag left / right: where the island starts along the main run', 'اسحب يمينًا/يسارًا: بداية الجزيرة على امتداد الصف الرئيسي'),
      apply: (v) => { const m = setXl(model, { off: Math.round(v) }); return { next: m, value: m.xl.off, clamped: m.xl.off !== Math.round(v) }; },
    }));
  }
  return out;
}

export function endViewHandles({ model, scene, runKey }) {
  const m = endViewModel(scene, runKey); if (!m) return [];
  const g = model.g; const xl = model.xl || {}; const out = [];
  const top = g.plinthH + g.baseH; const cy = top + g.counterThk / 2;
  const gf = (k, id, at, dir, label, tip, extra = {}) => {
    const f = FIELD[k];
    out.push(makeHandle({
      id, kind: extra.kind || 'depth', dir, at, value: g[k], min: f.min, max: f.max, step: f.step || 10, snap: extra.snap || [], group: 'overall', level: 1, label, tip,
      reasons: { min: T(`Minimum ${f.min} mm`, `الحد الأدنى ${f.min} مم`), max: T(`Maximum ${f.max} mm`, `الحد الأقصى ${f.max} مم`) },
      apply: (v) => { const r = setGlobal(model, k, v); return { next: r.model, value: r.value, clamped: !!r.clamped }; },
    }));
  };
  gf('baseD', 'g:baseD', { u: m.D + m.dt, y: g.plinthH + g.baseH * 0.5 }, 'right', T('Base depth', 'عمق الوحدة السفلية'), T('Drag left / right: base cabinet depth', 'اسحب يمينًا/يسارًا: عمق الوحدة السفلية'), { snap: [550, 600, 650] });
  gf('overhang', 'g:overhang', { u: m.d1, y: cy }, 'right', T('Countertop overhang', 'بروز سطح العمل'), T('Drag left / right: how far the worktop projects past the doors', 'اسحب يمينًا/يسارًا: بروز السطح عن الأبواب'), { snap: [20, 30, 40] });
  gf('counterThk', 'g:counterThk', { u: (m.d0 + m.d1) / 2, y: top + g.counterThk }, 'up', T('Countertop thickness', 'سماكة سطح العمل'), T('Drag up / down: worktop thickness', 'اسحب لأعلى/لأسفل: سماكة سطح العمل'), { kind: 'height', snap: [30, 40, 50, 60] });
  gf('plinthH', 'g:plinthH', { u: m.D * 0.35, y: g.plinthH }, 'up', T('Plinth height', 'ارتفاع القاعدة'), T('Drag up / down: plinth height', 'اسحب لأعلى/لأسفل: ارتفاع القاعدة'), { kind: 'height', snap: [100, 120, 150] });
  gf('baseH', 'g:baseH', { u: m.D * 0.12, y: top }, 'up', T('Base carcass height', 'ارتفاع الوحدة السفلية'), T('Drag up / down: base cabinet height', 'اسحب لأعلى/لأسفل: ارتفاع الوحدة السفلية'), { kind: 'height', snap: [700, 720, 760] });
  gf('plinthSetback', 'g:plinthSetback', { u: m.D - g.plinthSetback, y: g.plinthH / 2 }, 'left', T('Plinth setback', 'تراجع القاعدة'), T('Drag left / right: how far the plinth is set back', 'اسحب يمينًا/يسارًا: تراجع القاعدة'), { snap: [0, 60, 80] });
  if (xl.seatOn) {
    out.push(makeHandle({
      id: 'xl:seatD', kind: 'depth', dir: 'left', at: { u: m.d0, y: cy }, value: xl.seatD, min: XL.seat.min, max: XL.seat.max, step: 10, snap: [250, 300, 350, 400], group: 'overall', level: 1,
      label: T('Seating overhang', 'بروز الجلوس'), tip: T('Drag left / right: the seating overhang beyond the finished back', 'اسحب يمينًا/يسارًا: بروز منطقة الجلوس'),
      reasons: { min: T(`Minimum ${XL.seat.min} mm`, `الحد الأدنى ${XL.seat.min} مم`), max: T(`Maximum ${XL.seat.max} mm`, `الحد الأقصى ${XL.seat.max} مم`) },
      apply: (v) => { const q = setXl(model, { seatD: Math.round(v) }); return { next: q, value: q.xl.seatD, clamped: q.xl.seatD !== Math.round(v) }; },
    }));
  }
  return out;
}
