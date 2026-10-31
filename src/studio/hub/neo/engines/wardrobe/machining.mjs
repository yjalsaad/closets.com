// Standard Wardrobe · Machining engine (pure, deterministic) — spec §19, §20.
// Turns the WardrobeConfiguration + construction profile into per-panel machining OPERATIONS with real
// coordinates (hole series, hinge cups, connectors, groove) and a machine-agnostic intermediate format
// (MIF) that a CNC post-processor consumes later. No I/O, no Date/random.

import { recommendHinges } from './hardware.mjs';

const r = (n) => Math.round(Number(n) || 0);

export const DEFAULT_MACHINING = {
  shelf_row_inset: 37,     // mm from front/back edge to the two pin rows (system-32)
  shelf_pitch: 32,
  pin_dia: 5, pin_depth: 12,
  hinge_bore_inset: 22.5,  // cup centre from the hinge-side edge
  hinge_dia: 35, hinge_depth: 12.5,
  connector_dia: 8,
  runner_row_inset: 37,
};

/** Per-panel operations with x/y coordinates (mm). face is the panel face the tool enters. */
export function machiningPlan(config, profileRow = {}, opts = {}) {
  const M = { ...DEFAULT_MACHINING, ...(opts.machining || {}) };
  const t = profileRow.panel_thickness || 18;
  const H = r(config.height), D = r(config.depth), W = r(config.width);
  const mods = config.modules || [];
  const panels = []; let ops = 0, holes = 0;
  const add = (part, arr) => { if (!arr.length) return; panels.push({ part, ops: arr }); ops += arr.length; for (const o of arr) holes += (o.count || 1); };

  mods.forEach((m) => {
    const sh = r(m.shelves), dr = r(m.drawers);
    const g = [];
    if (sh > 0) {
      const zoneTop = r(H * 0.15), zoneBot = r(H * 0.85);
      const count = Math.max(4, Math.round((zoneBot - zoneTop) / M.shelf_pitch));
      [M.shelf_row_inset, D - M.shelf_row_inset].forEach((x) =>
        g.push({ type: 'HOLE_SERIES', face: 'INNER', x: r(x), y0: zoneTop, pitch: M.shelf_pitch, count, dia: M.pin_dia, depth: M.pin_depth, note: 'adjustable-shelf pins' }));
    }
    if (dr > 0) {
      const each = Math.min(H * 0.5, dr * 210) / dr;
      for (let i = 0; i < dr; i++) {
        const y = r(50 + i * each);
        [M.runner_row_inset, D - M.runner_row_inset].forEach((x) =>
          g.push({ type: 'DRILL', face: 'INNER', x: r(x), y, dia: M.pin_dia, depth: M.pin_depth, count: 1, note: 'runner fixing' }));
      }
    }
    if (g.length) add('Gable ' + m.id + ' (both sides)', g);
    add('Top/Bottom ' + m.id, [
      { type: 'CONNECTOR', face: 'EDGE', x: r(m.width * 0.15), y: r(D / 2), dia: M.connector_dia, count: 2, note: 'cam + dowel to gable' },
      { type: 'CONNECTOR', face: 'EDGE', x: r(m.width * 0.85), y: r(D / 2), dia: M.connector_dia, count: 2, note: 'cam + dowel to gable' },
    ]);
  });

  const leaves = r(config.doors);
  if (leaves > 0 && config.type === 'hinged') {
    const rec = recommendHinges(r(W / leaves), H, t);
    add('Door (×' + leaves + ')', rec.positions.map((y) => ({ type: 'HINGE_CUP', face: 'BACK', x: M.hinge_bore_inset, y: r(y), dia: M.hinge_dia, depth: M.hinge_depth, count: 1, note: '35 mm hinge cup' })));
  }
  if ((profileRow.back || 'groove') === 'groove') {
    add('Carcase (back groove)', [{ type: 'GROOVE', face: 'INNER', x: 0, y: 0, width: (profileRow.back_thickness || 8) + 0.2, depth: profileRow.back_groove_depth || 8, count: 1, note: 'back-panel groove' }]);
  }

  return { panels, totals: { panels: panels.length, ops, holes } };
}

/** Machine-agnostic intermediate format — the input to a future CNC post-processor (spec §20). */
export function toMIF(plan, config = {}) {
  return {
    format: 'NEO-MIF/1', unit: 'mm',
    design: { width: r(config.width), height: r(config.height), depth: r(config.depth), type: config.type || 'sliding' },
    partCount: plan.panels.length,
    operations: plan.panels.flatMap((p) => p.ops.map((o) => ({ part: p.part, ...o }))),
  };
}
