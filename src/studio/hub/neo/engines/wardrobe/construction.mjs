// Standard Wardrobe · Construction engine (pure, deterministic, data-driven).
// Turns a WardrobeConfiguration + a ConstructionProfile into NUMBERED panels (exact sizes + per-edge
// banding) and MACHINING operations. This is the engineering model that BOM / cutting / CNC read.
// No I/O, no Date/random. Rules live here — never inside React or Three.js (spec §12, §13, §42).

const r = (n) => Math.round(Number(n) || 0);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Fallback construction profile — the real one loads from a construction_profiles row later. */
export const DEFAULT_PROFILE = {
  panel_thickness: 18,
  back_thickness: 8,
  top: 'between',            // 'between' (top fits between sides) | 'over' (top caps the sides)
  bottom: 'between',
  back: 'groove',            // 'inset' | 'overlay' | 'groove'
  back_groove_depth: 8,
  plinth_height: 100,
  shelf_setback: 20,         // shelf shorter than depth
  edge: '1mm ABS',
  material: null,            // board label (falls back to "Board 18")
  back_material: null,
  hinge_min: 2,
  shelf_pin_pitch: 32,       // system-32 adjustable-shelf holes
};

export function normProfile(row) { return { ...DEFAULT_PROFILE, ...(row || {}) }; }

const EDGE_ALL = (e) => ({ top: e, bottom: e, left: e, right: e });
const EDGE_NONE = { top: null, bottom: null, left: null, right: null };

/**
 * Numbered panel list (P-001…) with construction rules applied. Every panel carries exact
 * width/height/thickness, grain, per-edge banding, quantity and the module it belongs to (spec §14, §24).
 */
export function panels(config, profileRow = {}) {
  const P = normProfile(profileRow);
  const t = P.panel_thickness, bt = P.back_thickness, e = P.edge;
  const H = r(config.height), D = r(config.depth), W = r(config.width);
  const mods = config.modules || [], n = mods.length;
  const board = P.material || ('Board ' + t), backMat = P.back_material || ('HDF ' + bt);
  const out = []; let seq = 0;
  const add = (o) => { seq++; out.push({ partNumber: 'P-' + String(seq).padStart(3, '0'), thickness: t, qty: 1, grain: 'none', edges: EDGE_NONE, material: board, module: 'carcase', ...o }); };

  // Sides shorten when the top/bottom caps sit OVER them.
  const sideH = H - (P.top === 'over' ? t : 0) - (P.bottom === 'over' ? t : 0);
  add({ name: 'Gable / side', role: 'gable', width: D, height: sideH, qty: n + 1, grain: 'vertical', edges: { top: e, bottom: e, left: null, right: e } });

  // interior clear height between top & bottom (for the back)
  const innerH = sideH - (P.top === 'between' ? t : 0) - (P.bottom === 'between' ? t : 0);
  for (const m of mods) {
    const clear = Math.max(0, r(m.width) - t);                 // between the two shared gables
    add({ name: 'Top', role: 'top', width: P.top === 'over' ? r(m.width) : clear, height: D, grain: 'horizontal', edges: { top: null, bottom: null, left: null, right: e }, module: m.id });
    add({ name: 'Bottom', role: 'bottom', width: P.bottom === 'over' ? r(m.width) : clear, height: D, grain: 'horizontal', edges: { top: null, bottom: null, left: null, right: e }, module: m.id });
    // back: overlay covers the whole module face; inset/groove sit inside the opening (+groove both sides)
    const g2 = P.back === 'groove' ? 2 * P.back_groove_depth : 0;
    add({ name: 'Back panel', role: 'back', width: P.back === 'overlay' ? r(m.width) : clear + g2, height: P.back === 'overlay' ? H : innerH + g2, thickness: bt, grain: 'none', edges: EDGE_NONE, material: backMat, module: m.id });
    const sh = r(m.shelves);
    if (sh > 0) add({ name: 'Shelf', role: 'shelf', width: clear, height: D - P.shelf_setback, qty: sh, grain: 'horizontal', edges: { top: null, bottom: null, left: null, right: e }, module: m.id });
    const dr = r(m.drawers);
    if (dr > 0) {
      add({ name: m.dMode === 'inside' ? 'Inner drawer front' : 'Drawer front', role: 'drawer_front', width: clear, height: 160, qty: dr, grain: 'horizontal', edges: EDGE_ALL(e), module: m.id });
      add({ name: 'Drawer box side', role: 'drawer_side', width: D - 40, height: 140, qty: dr * 2, grain: 'horizontal', module: m.id });
      add({ name: 'Drawer box f/b', role: 'drawer_fb', width: clear - 60, height: 140, qty: dr * 2, grain: 'horizontal', module: m.id });
      add({ name: 'Drawer base', role: 'drawer_base', width: clear - 40, height: D - 60, thickness: bt, material: backMat, qty: dr, module: m.id });
    }
  }
  const leaves = r(config.doors);
  if (leaves > 0 && config.type !== 'open') {
    const isSliding = config.type === 'sliding';
    const leafW = isSliding ? r((W + (leaves - 1) * 30) / leaves) : r(W / leaves);
    add({ name: isSliding ? 'Sliding shutter' : 'Hinged door', role: 'door', width: leafW, height: H, qty: leaves, grain: 'vertical', edges: EDGE_ALL(e), module: 'doors' });
  }
  if (P.plinth_height > 0) add({ name: 'Plinth', role: 'plinth', width: W - 2 * t, height: P.plinth_height, grain: 'horizontal', edges: { top: e, bottom: null, left: null, right: null } });
  return out;
}

/** Machining operations derived from construction + hardware (spec §19; real ops, not a full CNC post). */
export function machiningOps(config, profileRow = {}) {
  const P = normProfile(profileRow);
  const H = r(config.height);
  const ops = []; let id = 0;
  const op = (o) => { id++; ops.push({ id: 'OP-' + String(id).padStart(3, '0'), ...o }); };
  const mods = config.modules || [];
  for (const m of mods) {
    if (r(m.shelves) > 0) {
      const count = Math.max(8, Math.round((H - 200) / (P.shelf_pin_pitch || 32)));
      op({ type: 'HOLE_SERIES', face: 'LEFT', part: 'Gable', diameter: 5, pitch: P.shelf_pin_pitch, count, module: m.id, note: 'adjustable shelf pins (system-32)' });
      op({ type: 'HOLE_SERIES', face: 'RIGHT', part: 'Gable', diameter: 5, pitch: P.shelf_pin_pitch, count, module: m.id });
    }
    if (r(m.drawers) > 0) op({ type: 'DRILL', face: 'INNER', part: 'Gable', diameter: 5, count: r(m.drawers) * 2, module: m.id, note: 'drawer runner fixings' });
    op({ type: 'CONNECTOR', face: 'EDGE', part: 'Top/Bottom', diameter: 8, count: 4, module: m.id, note: 'cam / dowel to gables' });
  }
  const leaves = r(config.doors);
  if (leaves > 0 && config.type === 'hinged') {
    const areaM2 = (r(config.width) / leaves) * H / 1e6;
    const hinges = Math.max(P.hinge_min, Math.ceil(H / 500), Math.round(areaM2 * 2) + 2);
    for (let i = 0; i < leaves; i++) op({ type: 'HINGE_CUP', face: 'BACK', part: 'Door', diameter: 35, count: hinges, module: 'doors', note: hinges + ' hinges (by height/area)' });
  }
  if (P.back === 'groove') op({ type: 'GROOVE', face: 'INNER', part: 'Carcase', width: r2(P.back_thickness + 0.2), depth: P.back_groove_depth, module: 'carcase', note: 'back-panel groove' });
  return ops;
}

/** Construction-aware review (rule engine, additive to validateConfig) — returns {ok, items[]}. */
export function constructionReview(config, profileRow = {}, rules = {}) {
  const P = normProfile(profileRow); const items = [];
  const maxShelf = rules.max_shelf_span || 900;
  for (const m of (config.modules || [])) {
    const clear = r(m.width) - P.panel_thickness;
    if (r(m.shelves) > 0 && clear > maxShelf) items.push({ level: 'WARNING', code: 'shelf_span', msg: `Shelf span ${clear}mm in ${m.id} exceeds ${maxShelf}mm`, fix: 'Add a mid partition or a thicker shelf' });
  }
  const leaves = r(config.doors);
  if (config.type === 'hinged' && leaves > 0) {
    const dw = r(config.width / leaves), maxD = rules.max_hinged_door_width || 600;
    if (dw > maxD) items.push({ level: 'ERROR', code: 'door_width', msg: `Hinged door ${dw}mm exceeds ${maxD}mm`, fix: `Use ${Math.ceil(config.width / maxD)} doors` });
  }
  return { ok: !items.some((x) => x.level === 'ERROR'), items };
}

/** Total edge-banding metres from a panel list (each banded edge × its length × qty). */
export function edgeBandTotal(panelList) {
  let m = 0;
  for (const p of (panelList || [])) {
    const e = p.edges || {};
    if (e.top) m += p.width / 1000 * p.qty;
    if (e.bottom) m += p.width / 1000 * p.qty;
    if (e.left) m += p.height / 1000 * p.qty;
    if (e.right) m += p.height / 1000 * p.qty;
  }
  return r2(m);
}
