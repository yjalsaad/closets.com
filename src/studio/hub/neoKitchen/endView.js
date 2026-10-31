/* =============================================================================
 * Neo Kitchen Designer - the END VIEW of an open run (peninsula / island), NEO-KITCHEN-UX29, as pure geometry.
 * The run seen from its open end: depth runs left (back) -> right (front), height up. Every number comes from the scene
 * (counter extents, panel boxes, plinth) and the model, so it is the same cross-section the cut list and the 3D view are built from.
 * ===========================================================================*/
import { XL } from './constants';

export function endViewModel(scene, rk) {
  const run = scene.runs.find((r) => r.key === rk);
  if (!run) return null;
  const g = scene.model.g; const xl = scene.model.xl || {};
  const x = run.units.find((q) => q.row === 'base');
  const D = run.D; const dt = g.doorThk;
  const bp = xl.backPanel ? dt : 0;
  const top = g.plinthH + g.baseH;
  const c = run.counters[0] || { d0: -(bp + (xl.seatOn ? xl.seatD : 0)), d1: D + dt + g.overhang, y0: top, y1: top + g.counterThk };
  const H = x ? x.y0 + x.H : top;
  const rects = [];
  rects.push({ k: 'unit', d0: 0, d1: D, y0: g.plinthH, y1: top });
  rects.push({ k: 'unit', d0: D, d1: D + dt, y0: g.plinthH, y1: top }); // door front
  rects.push({ k: 'plinth', d0: D - g.plinthSetback - g.board, d1: D - g.plinthSetback, y0: 0, y1: g.plinthH });
  if (H > top) rects.push({ k: 'unit', d0: 0, d1: D, y0: top, y1: H, tall: true }); // a tall unit at the end
  rects.push({ k: 'top', d0: c.d0, d1: c.d1, y0: c.y0, y1: c.y1 });
  // finished end panel (drawn solid when it exists, dashed when the option is off: the carcass side shows) and back panel
  rects.push({ k: 'panel', d0: -bp, d1: D + dt, y0: 0, y1: top, off: !xl.endPanel, name: 'end' });
  if (xl.backPanel) rects.push({ k: 'panel', d0: -bp, d1: 0, y0: 0, y1: H, name: 'back' });
  const seat = xl.seatOn ? xl.seatD : 0;
  const support = seat > XL.seat.supportAbove ? { d0: -bp - seat, d1: -bp, y: c.y0, drop: Math.min(150, seat / 2), legs: seat > 450 } : null;
  const dims = [
    { id: 'depth', k: 'h', a: c.d0, b: c.d1, label: `${Math.round(c.d1 - c.d0)}` },
    { id: 'height', k: 'v', a: 0, b: c.y1, label: `${Math.round(c.y1)}` },
  ];
  if (seat) dims.push({ id: 'seat', k: 'h2', a: c.d0, b: -bp, label: `${Math.round(seat)}` });
  return { run: rk, D, dt, bp, rects, support, dims, d0: c.d0, d1: c.d1, h: c.y1, seat };
}
