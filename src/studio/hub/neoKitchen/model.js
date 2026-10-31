/* =============================================================================
 * Neo Kitchen Designer - the parametric model (pure functions, no React).
 * The model is plain JSON: { g, runs, legs, ... }. Every setter clamps to the
 * spec range and returns a NEW model plus (for UI) what was clamped.
 * ===========================================================================*/
import {
  FIELD, DEFAULT_G, LEG, KITCHEN, UNIT_W, TALL_H, SEC_N, SHELVES_N, SECTYPES, UNIT_TYPES, FINISHES, COUNTERS,
  HANDLES, HANDLE_LENS, DEFAULT_GRAIN, GRAIN_KINDS, MAT_SLOTS, ROWS, RUNS, LED, XRUNS, XL_KINDS, XL_RUN_OF, XL,
} from './constants';
import { normalizePaint, normalizeMatMap } from './materials';

export const FORMAT = 'neo-kitchen';
export const VERSION = 2;

let seq = 0;
export const uid = () => `u${(Date.now() % 1e8).toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const round1 = (v) => Math.round(v * 10) / 10;

/* ---- Arabic-Indic digit / separator normalisation ------------------------- */
export function normDigits(s) {
  return String(s)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.').replace(/٬/g, '');
}

/* ---- clamp helpers --------------------------------------------------------- */
export function clampSpec(k, raw) {
  const f = FIELD[k];
  if (!f) return null;
  let v = Number(raw);
  if (!Number.isFinite(v)) v = f.def;
  const step = f.step || 1;
  const c = clamp(v, f.min, f.max);
  const val = step < 1 ? Math.round(c / step) * step : Math.round(c);
  return { value: step < 1 ? round1(val) : val, clamped: c !== v, min: f.min, max: f.max };
}

/* ---- sections / units ------------------------------------------------------ */
export const newSection = (t = 'door', n = 1, extra) => ({ t, n, shelves: t === 'door' || t === 'glass' || t === 'flip' ? 1 : 0, hinge: 'L', ...extra });
export function newUnit(row, extra) {
  return { id: uid(), w: 600, type: 'normal', secs: [newSection(row === 'base' ? 'door' : 'door', row === 'base' ? 2 : 1)], grainFront: 'auto', ...extra };
}
const emptyRun = () => ({ base: [], wall: [], top: [] });

export const U = (w, secs, extra) => ({ id: uid(), w, type: 'normal', secs, grainFront: 'auto', ...extra });
export const S = newSection;

export function makeInitial() {
  return {
    format: FORMAT, v: VERSION,
    title: 'My Kitchen',
    g: { ...DEFAULT_G },
    runs: {
      main: {
        base: [
          U(600, [S('door', 1, { shelves: 0 }), S('door', 1, { shelves: 0 }), S('door', 1, { shelves: 0 })], { type: 'tall', h: 2470 }),
          U(600, [S('door', 1, { hinge: 'R', shelves: 1 })]),
          U(800, [S('drawer', 3), S('door', 2, { shelves: 0 })]),
          U(600, [S('cover', 1), S('sink', 2, { shelves: 0 })]),
          U(600, [S('door', 1, { shelves: 0 }), S('door', 1, { shelves: 0 }), S('open', 1)], { type: 'tall', h: 2470 }),
        ],
        wall: [
          U(600, [S('glass', 1, { shelves: 3 })]),
          U(800, [S('glass', 2, { shelves: 3 })]),
          U(600, [S('drawer', 2)]),
        ],
        top: [],
      },
      left: emptyRun(),
      right: emptyRun(),
    },
    legs: {
      left: { on: false, depth: LEG.depth.def, matchD: true, height: LEG.height.def, matchH: true, length: LEG.length.def },
      right: { on: false, depth: LEG.depth.def, matchD: true, height: LEG.height.def, matchH: true, length: LEG.length.def },
    },
    topOn: false, keepWidth: true, keepHeight: true, finish: 'oak', counter: 'marble',
    led: { strip: false, on: true, w: LED.w.def, off: LED.off.def }, bottomCover: false, // UX-17: LED strip + bottom cover off by default = every existing project is unchanged
    handle: { style: 'bar', len: 128, pos: 'auto' },
    grain: { ...DEFAULT_GRAIN },
    mats: {},
    paint: {}, // UX-16 Look: per part-group colour / texture overrides (display only)
    matMap: {}, // UX-16 production material name -> inventory item link
  };
}

/* ---- derived numbers ------------------------------------------------------- */
export const worktopH = (g) => g.plinthH + g.baseH + g.counterThk;
export const lowerH = (g) => g.plinthH + g.baseH + g.counterThk + g.gap;
export const totalH = (model) => lowerH(model.g) + model.g.wallH + (model.topOn ? model.g.topH : 0);
export const isTall = (u) => u.type === 'tall';
export const rowWidth = (arr) => sum((arr || []).map((u) => u.w));
export const baseSpan = (run) => rowWidth(run.base);
export const tallH = (u) => u.h || TALL_H.def;
export const overallH = (model) => {
  const xrk = xlRunKey(model); // UX29: only the extra run the current layout uses counts
  const talls = [...RUNS, ...(xrk && model.runs[xrk] ? [xrk] : [])].flatMap((rk) => (model.runs[rk].base || []).filter(isTall)).map((u) => model.g.plinthH + tallH(u));
  return Math.max(totalH(model), ...talls);
};

/** sum of the width of leading tall units: the wall/top rows start after them */
export function wallOffset(base) {
  let o = 0;
  for (const u of base || []) { if (isTall(u)) o += u.w; else break; }
  return o;
}
/** width the wall/top rows should span = base row minus its tall units */
export const wallSpan = (base) => sum((base || []).filter((u) => !isTall(u)).map((u) => u.w));

export const runHasTop = (model, rk) => {
  if (rk === 'pen' || rk === 'isl') return false; // UX29: a peninsula / island has no wall or top units
  return model.topOn && (rk === 'main' || rk === 'run2' || model.legs[rk].matchH);
};
export function runWallH(model, rk) {
  if (rk === 'main' || isExtraRun(rk) || model.legs[rk].matchH) return model.g.wallH;
  return clamp(model.legs[rk].height - lowerH(model.g), FIELD.wallH.min, FIELD.wallH.max);
}
/** a leg's depth: the main kitchen's base depth while it is inherited (matchD), its own `depth` once overridden */
export const runDepth = (model, rk) => (rk === 'main' || isExtraRun(rk) || model.legs[rk].matchD ? model.g.baseD : model.legs[rk].depth);
/** the height a leg screen shows: the main kitchen's overall height (clamped to the leg range) while inherited, its own once overridden */
export const legHeightShown = (model, side) => { const l = model.legs[side]; return l.matchH ? clamp(totalH(model), LEG.height.min, LEG.height.max) : l.height; };
export const runLen = (model, rk) => baseSpan(model.runs[rk]);

export function layoutName(model) {
  const k = xlKind(model);
  if (k) return k; // UX29: galley | peninsula | island
  const l = model.legs.left.on, r = model.legs.right.on;
  return l && r ? 'u' : l ? 'l-left' : r ? 'l-right' : 'straight';
}

/* ---- NEO-KITCHEN-UX29: galley / peninsula / island (additive; model.xl is absent in every older file) ------------------- */
export const isExtraRun = (rk) => XRUNS.includes(rk);
export const xlKind = (model) => (model && model.xl && XL_KINDS.includes(model.xl.kind) ? model.xl.kind : null);
/** the extra run key the current layout builds ('run2' | 'pen' | 'isl'), or null */
export const xlRunKey = (model) => { const k = xlKind(model); return k ? XL_RUN_OF[k] : null; };
/** the run keys that are built in the scene: main, the legs that are on, the extra run of the layout (when it exists in model.runs) */
export const activeRunKeys = (model) => {
  const x = xlRunKey(model);
  return ['main', ...(model.legs.left.on ? ['left'] : []), ...(model.legs.right.on ? ['right'] : []), ...(x && model.runs[x] ? [x] : [])];
};
/** left-side runs are drawn mirrored (u runs from the corner towards the room): the left leg, and a peninsula on the left */
export const isFlipRun = (model, rk) => rk === 'left' || (rk === 'pen' && !!model.xl && model.xl.side === 'left');
/** the first `hiddenBase` mm of a run sit behind another run (legs and the peninsula start in the corner) */
export const runHiddenBase = (model, rk) => (rk === 'left' || rk === 'right' || rk === 'pen' ? model.g.baseD : 0);
/** island / peninsula: the carcass back (and the ends) are open to the room and get finished panels */
export const runOpenBack = (rk) => rk === 'pen' || rk === 'isl';

/** allowed total length of a run (mm): main = kitchen width, legs = leg length, extra runs = their own range */
export const runLenRange = (rk) => (rk === 'main' ? KITCHEN.width : isExtraRun(rk) ? XL.len[rk] : LEG.length);
/** [EN, AR] names of the runs used in the screens */
export const RUN_NAMES = {
  main: ['Main run', 'الصف الرئيسي'], left: ['Left leg', 'الرجل اليسرى'], right: ['Right leg', 'الرجل اليمنى'],
  run2: ['Run 2', 'الصف ٢'], pen: ['Peninsula', 'الجزيرة الممتدة'], isl: ['Island', 'الجزيرة'],
};

/** the sanitised layout block. null = no extra layout (Single wall / L / U). */
export function normXl(raw) {
  if (!raw || typeof raw !== 'object' || !XL_KINDS.includes(raw.kind)) return null;
  const num = (v, r, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? clamp(n, r.min, r.max) : d; };
  return {
    kind: raw.kind,
    aisle: num(raw.aisle, XL.aisle, XL.aisle.def), // galley: clear space between the two worktop fronts
    match: raw.match === undefined ? true : !!raw.match, // galley: run 2 follows the main run length
    gap: num(raw.gap, XL.gap, XL.gap.def), // island: clearance between the main worktop front and the island worktop front
    off: num(raw.off, { min: -20000, max: 20000 }, 0), // island: start of the island along the main run (mm from its left end)
    side: raw.side === 'left' ? 'left' : 'right', // peninsula: which end of the main run it projects from
    seatOn: !!raw.seatOn, seatD: num(raw.seatD, XL.seat, XL.seat.def), // seating overhang beyond the finished back
    endPanel: raw.endPanel === undefined ? true : !!raw.endPanel, backPanel: raw.backPanel === undefined ? true : !!raw.backPanel,
    hint: XL.hintKinds.includes(raw.hint) ? raw.hint : 'none', // island: indicative hob / sink cut-out in the worktop
  };
}
/** the default content of an extra run (only the base row for a peninsula / island; a galley also gets a wall row) */
function defaultXRun(rk) {
  if (rk === 'run2') {
    return { base: [U(600, [S('door', 2)]), U(800, [S('drawer', 3)]), U(600, [S('door', 2)]), U(600, [S('drawer', 2)]), U(600, [S('door', 2)])], wall: [U(800, [S('door', 2)]), U(800, [S('door', 2)]), U(800, [S('door', 2)]), U(800, [S('door', 2)])], top: [] };
  }
  if (rk === 'pen') return { base: [U(900, [S('door', 2)]), U(600, [S('drawer', 3)]), U(600, [S('door', 2)])], wall: [], top: [] };
  return { base: [U(600, [S('drawer', 3)]), U(600, [S('door', 2)]), U(600, [S('drawer', 2)])], wall: [], top: [] };
}
/** a peninsula's run length counts the corner unit hidden behind the main run (base depth); what the owner sees is the projection beyond it */
export const penProjection = (model) => Math.max(0, rowWidth(model.runs.pen ? model.runs.pen.base : []) - model.g.baseD);
export const penLengthFor = (model, projection) => Math.round(projection + model.g.baseD);

/** keeps a galley's run 2 as long as the main run while "match main" is on; returns the SAME model when nothing changes */
export function syncLayout(model) {
  if (!model || !model.xl || model.xl.kind !== 'galley' || !model.xl.match || !model.runs.run2) return model;
  const want = rowWidth(model.runs.main.base);
  if (want <= 0 || rowWidth(model.runs.run2.base) === want) return model;
  return setRunWidth(model, 'run2', want).model;
}

/** change layout options (clamped); creates the run the layout needs. Returns a new model. */
export function setXl(model, patch) {
  const cur = model.xl || { kind: patch.kind };
  const xl = normXl({ ...cur, ...patch });
  if (!xl) return model;
  const rk = XL_RUN_OF[xl.kind];
  let m = { ...model, xl };
  if (!m.runs[rk] || !(m.runs[rk].base || []).length) m = { ...m, runs: { ...m.runs, [rk]: defaultXRun(rk) } };
  return syncLayout(m);
}

/* ---- width redistribution ("Keep total run width fixed") ------------------- */
/** Scale the NON-tall units of `arr` so they sum to `target`. Returns new array or null if infeasible. */
export function fitRow(arr, target, onlyFree = true) {
  const free = arr.filter((u) => !(onlyFree && isTall(u)));
  if (!free.length) return null;
  const fixed = sum(arr.filter((u) => onlyFree && isTall(u)).map((u) => u.w));
  const want = Math.round(target - fixed);
  if (want < free.length * UNIT_W.min || want > free.length * UNIT_W.max) return null;
  const cur = sum(free.map((u) => u.w));
  const w = free.map((u) => clamp(Math.round((u.w * want) / cur), UNIT_W.min, UNIT_W.max));
  // push the rounding remainder into units with slack
  let diff = want - sum(w);
  for (let pass = 0; diff !== 0 && pass < 4000; pass++) {
    const i = pass % w.length;
    const step = diff > 0 ? 1 : -1;
    if (w[i] + step >= UNIT_W.min && w[i] + step <= UNIT_W.max) { w[i] += step; diff -= step; }
  }
  if (diff !== 0) return null;
  let k = 0;
  return arr.map((u) => (onlyFree && isTall(u) ? u : { ...u, w: w[k++] }));
}

/** change one unit width. keepWidth: the other free units share the change. */
export function setUnitWidth(model, rk, row, id, raw) {
  const arr = model.runs[rk][row];
  const i = arr.findIndex((u) => u.id === id);
  if (i < 0) return { model, clamped: false };
  const want = clamp(Math.round(+raw || 0), UNIT_W.min, UNIT_W.max);
  let w = want;
  let next = arr.map((u) => (u.id === id ? { ...u, w } : u));
  if (model.keepWidth) {
    const total = rowWidth(arr);
    const others = arr.filter((u) => u.id !== id && !isTall(u));
    if (!others.length) { return { model, clamped: true }; }
    const fixed = sum(arr.filter((u) => u.id === id || isTall(u)).map((u) => (u.id === id ? w : u.w)));
    const room = total - fixed;
    const lo = others.length * UNIT_W.min, hi = others.length * UNIT_W.max;
    if (room < lo) { w = w - (lo - room); }
    else if (room > hi) { w = w + (room - hi); }
    w = clamp(w, UNIT_W.min, UNIT_W.max);
    const base = arr.map((u) => (u.id === id ? { ...u, w } : u));
    const target = total;
    const fit = fitRowExcept(base, id, target);
    next = fit || base;
  }
  return { model: patchRow(model, rk, row, next), clamped: w !== +raw };
}
function fitRowExcept(arr, id, target) {
  const rest = arr.filter((u) => u.id !== id && !isTall(u));
  const fixed = sum(arr.filter((u) => u.id === id || isTall(u)).map((u) => u.w));
  const want = Math.round(target - fixed);
  if (want < rest.length * UNIT_W.min || want > rest.length * UNIT_W.max) return null;
  const fit = fitRow(rest, want, false);
  if (!fit) return null;
  const m = new Map(fit.map((u) => [u.id, u]));
  return arr.map((u) => m.get(u.id) || u);
}
const patchRow = (model, rk, row, arr) => ({ ...model, runs: { ...model.runs, [rk]: { ...model.runs[rk], [row]: arr } } });

/** Set the total run width: main = base row width (600-20000), legs = leg length (1200-3600) */
export function setRunWidth(model, rk, raw) {
  const rng = rk === 'main' ? KITCHEN.width : isExtraRun(rk) ? XL.len[rk] : LEG.length;
  const target = clamp(Math.round(+raw || rng.min), rng.min, rng.max);
  const run = model.runs[rk];
  let m = model;
  let base = fitRow(run.base, target);
  let applied = target;
  if (!base) {
    // not reachable by scaling (e.g. too many fixed tall units): absorb in the last free unit
    const cur = rowWidth(run.base);
    const free = [...run.base].reverse().find((u) => !isTall(u));
    if (!free) return { model, clamped: true, value: cur };
    const nw = clamp(free.w + (target - cur), UNIT_W.min, UNIT_W.max);
    base = run.base.map((u) => (u.id === free.id ? { ...u, w: nw } : u));
    applied = rowWidth(base);
  }
  m = patchRow(m, rk, 'base', base);
  {
    const span = wallSpan(base);
    ['wall', 'top'].forEach((row) => {
      if (!m.runs[rk][row].length) return;
      const f = fitRow(m.runs[rk][row], span, false);
      if (f) m = patchRow(m, rk, row, f);
    });
  }
  if (rk === 'left' || rk === 'right') m = { ...m, legs: { ...m.legs, [rk]: { ...m.legs[rk], length: rowWidth(m.runs[rk].base) } } };
  return { model: m, clamped: applied !== +raw, value: applied };
}

/** overall (base + wall [+ top]) height; keeps plinth + base carcass and re-fits wall / top */
export function setKitchenHeight(model, raw) {
  const H = clamp(Math.round(+raw || KITCHEN.height.min), KITCHEN.height.min, KITCHEN.height.max);
  const rem = H - lowerH(model.g);
  const g = { ...model.g };
  if (model.topOn) {
    g.topH = clamp(rem - g.wallH, FIELD.topH.min, FIELD.topH.max);
    if (rem - g.topH < FIELD.wallH.min || rem - g.topH > FIELD.wallH.max) g.wallH = clamp(rem - g.topH, FIELD.wallH.min, FIELD.wallH.max);
  } else {
    g.wallH = clamp(rem, FIELD.wallH.min, FIELD.wallH.max);
  }
  const m = { ...model, g };
  return { model: m, clamped: totalH(m) !== H, value: totalH(m) };
}

/** Wall / Top height slider. With model.keepHeight the OTHER part takes the opposite change so totalH() stays: the wall row absorbs a top change,
 *  the top row (or, when the top row is off, the counter-to-wall gap) absorbs a wall change. The change is limited to what the absorber's own
 *  range allows - the overall height never silently moves. Returns { model, clamped, value, kept, absorbed } (clamped = the request was limited). */
/** a unit height that is now taller than its (shrunk) row goes back to inheriting the row height */
function dropTallerUnitHeights(model, row) {
  const H = row === 'wall' ? model.g.wallH : model.g.topH;
  if (!(model.runs.main[row] || []).some((u) => u.h && u.h > H)) return model;
  return patchRow(model, 'main', row, model.runs.main[row].map((u) => { if (!(u.h && u.h > H)) return u; const x = { ...u }; delete x.h; return x; }));
}
export function setRowHeight(model, row, raw) {
  const k = row === 'top' ? 'topH' : 'wallH';
  const want = clampSpec(k, raw);
  if (!want) return { model, clamped: false, value: model.g[k], kept: true, absorbed: null };
  const g = model.g;
  const absorb = row === 'wall' ? (model.topOn ? 'topH' : 'gap') : (model.topOn ? 'wallH' : null);
  const fit = (m) => dropTallerUnitHeights(dropTallerUnitHeights(m, 'wall'), 'top');
  if (!model.keepHeight || !absorb) return { model: fit({ ...model, g: { ...g, [k]: want.value } }), clamped: want.clamped, value: want.value, kept: !absorb || !model.keepHeight, absorbed: null };
  const f = FIELD[absorb];
  const delta = want.value - g[k];
  const lo = g[absorb] - f.max; const hi = g[absorb] - f.min; // the change the absorber can take
  const d = lo <= hi ? clamp(delta, lo, hi) : 0;
  const next = fit({ ...model, g: { ...g, [k]: g[k] + d, [absorb]: g[absorb] - d } });
  return { model: next, clamped: want.clamped || d !== delta, value: g[k] + d, kept: totalH(next) === totalH(model), absorbed: absorb };
}

export function setGlobal(model, k, raw) {
  const c = clampSpec(k, raw);
  if (!c) return { model, clamped: false };
  return { model: { ...model, g: { ...model.g, [k]: c.value } }, clamped: c.clamped, value: c.value, min: c.min, max: c.max };
}

export function setLeg(model, side, k, raw) {
  const rng = LEG[k];
  if (!rng) return { model, clamped: false };
  if (k === 'length') return setRunWidth(model, side, raw);
  const c = clamp(Math.round(+raw || rng.def), rng.min, rng.max);
  return { model: { ...model, legs: { ...model.legs, [side]: { ...model.legs[side], [k]: c, ...(k === 'height' ? { matchH: false } : {}), ...(k === 'depth' ? { matchD: false } : {}) } } }, clamped: c !== +raw, value: c };
}
/** drop a leg's own depth / height and inherit the main kitchen's again (the stored own value is kept for a later override) */
export function clearLegOverride(model, side, k) {
  const flag = k === 'depth' ? 'matchD' : k === 'height' ? 'matchH' : null;
  if (!flag || !model.legs[side]) return model;
  return { ...model, legs: { ...model.legs, [side]: { ...model.legs[side], [flag]: true } } };
}

export function toggleLeg(model, side, on = !model.legs[side].on) {
  let runs = model.runs;
  if (on && !runs[side].base.length) {
    runs = { ...runs, [side]: {
      base: [U(900, [S('door', 2)]), U(600, [S('drawer', 3)]), U(600, [S('door', 2)])],
      wall: [U(600, [S('door', 1)]), U(600, [S('door', 1)]), U(900, [S('door', 2)])],
      top: [],
    } };
  }
  const leg = { ...model.legs[side], on };
  if (on) leg.length = rowWidth(runs[side].base);
  return { ...model, runs, legs: { ...model.legs, [side]: leg } };
}
export function setLayout(model, name) {
  let m = model;
  if (XL_KINDS.includes(name)) {
    /* UX29: galley / peninsula / island - the legs go off (one layout at a time); the previous kind's run stays in the file, switched off */
    const fresh = !m.xl || m.xl.kind !== name;
    m = toggleLeg(toggleLeg(m, 'left', false), 'right', false);
    const patch = { kind: name };
    if (fresh && name === 'island') {
      const len = rowWidth((m.runs.isl && m.runs.isl.base.length ? m.runs.isl : defaultXRun('isl')).base);
      patch.off = Math.round((rowWidth(m.runs.main.base) - len) / 2 / 10) * 10; // centred on the main run
    }
    return setXl(m, patch);
  }
  const want = { straight: [false, false], 'l-left': [true, false], 'l-right': [false, true], u: [true, true] }[name];
  if (!want) return m;
  if (m.xl) { const { xl, ...rest } = m; void xl; m = rest; } // back to Single wall / L / U: the extra layout block goes (its run stays stored, unused)
  m = toggleLeg(m, 'left', want[0]);
  m = toggleLeg(m, 'right', want[1]);
  return m;
}

/* ---- unit CRUD -------------------------------------------------------------- */
export function addUnit(model, rk, row, unit) {
  const u = unit ? { ...unit, id: uid(), secs: unit.secs.map((s) => ({ ...s })) } : newUnit(row);
  const cur = model.runs[rk][row];
  let next = [...cur, u];
  let m = patchRow(model, rk, row, next);
  if (model.keepWidth && row === 'base') {
    // keep the run width: the other free units share the new unit's width
    const total = rowWidth(cur);
    const f = fitRowExcept(next, u.id, total);
    if (f) m = patchRow(model, rk, row, f);
  } else if (model.keepWidth && (row === 'wall' || row === 'top')) {
    // wall / top rows fill the free space of the base run first (never overlapping the tall units); once it is full the others share the change
    const span = wallSpan(model.runs[rk].base); const total = rowWidth(cur); const free = span - total;
    if (free >= UNIT_W.min) {
      const w = Math.min(u.w, free);
      m = patchRow(model, rk, row, [...cur, { ...u, w }]);
    } else if (total > 0) {
      const f = fitRowExcept(next, u.id, total);
      if (f) m = patchRow(model, rk, row, f);
    }
  }
  return m;
}
export function deleteUnit(model, rk, row, id) {
  return patchRow(model, rk, row, model.runs[rk][row].filter((u) => u.id !== id));
}
export function moveUnit(model, rk, row, id, dir) {
  const arr = [...model.runs[rk][row]];
  const i = arr.findIndex((u) => u.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return model;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  return patchRow(model, rk, row, arr);
}
export function patchUnit(model, rk, row, id, fn) {
  return patchRow(model, rk, row, model.runs[rk][row].map((u) => (u.id === id ? normUnit(fn(u)) : u)));
}
export function setUnitType(model, rk, row, id, type) {
  return patchUnit(model, rk, row, id, (u) => {
    const x = { ...u, type };
    if (type === 'tall') { x.h = u.h || TALL_H.def; x.w = clamp(u.w, UNIT_W.min, UNIT_W.max); }
    else delete x.h;
    if (type === 'blind' || type === 'carousel' || type === 'diagonal') { x.w = Math.max(x.w, 900); x.secs = [newSection('door', 1, { shelves: 0 })]; }
    return x;
  });
}
export function setSecCount(unit, n) {
  n = clamp(n, 1, 8);
  const secs = unit.secs.slice(0, n);
  while (secs.length < n) secs.push(newSection('door', 1));
  return { ...unit, secs };
}
/** fix a section height; auto sections must keep >= 100 mm */
export function setSectionHeight(model, rk, row, id, si, mm, H) {
  return patchUnit(model, rk, row, id, (u) => {
    const secs = u.secs.map((s) => ({ ...s }));
    if (mm == null || mm === '') { delete secs[si].h; return { ...u, secs }; }
    const others = secs.reduce((s, x, i) => s + (i !== si && x.h ? x.h : 0), 0);
    const autos = secs.filter((x, i) => i !== si && !x.h).length;
    const maxH = H - others - autos * 100;
    secs[si].h = clamp(Math.round(+mm), 100, Math.max(100, maxH));
    return { ...u, secs };
  });
}

/** Unit height of ONE wall / top unit (bottom-aligned, never taller than its row). null or >= the row height = inherit the row height again. */
export function setUnitHeight(model, rk, row, id, mm) {
  const rowH = row === 'wall' ? runWallH(model, rk) : model.g.topH;
  const min = row === 'wall' ? FIELD.wallH.min : FIELD.topH.min;
  return patchUnit(model, rk, row, id, (u) => {
    const x = { ...u };
    const v = mm == null || mm === '' ? null : Math.round(+mm);
    if (v == null || !Number.isFinite(v) || v >= rowH) delete x.h; else x.h = clamp(v, Math.min(min, rowH), rowH);
    return x;
  });
}
/** the same unit height for every unit of a wall / top row (what the Unit height row does when no unit is selected) */
export function setRowUnitsHeight(model, rk, row, mm) {
  return (model.runs[rk][row] || []).reduce((m, u) => setUnitHeight(m, rk, row, u.id, mm), model);
}
/** the height one wall / top unit is really drawn at */
export const unitDrawH = (model, rk, row, u) => { const H = row === 'wall' ? runWallH(model, rk) : model.g.topH; return u.h ? Math.min(u.h, H) : H; };

/* ---- unit library (NEW presets) --------------------------------------------- */
export const PRESETS = [
  { k: 'drawers4', row: 'base', en: 'Drawer stack (4)', ar: 'ستاك أدراج (٤)', unit: () => U(600, [S('drawer', 4)]) },
  { k: 'drawers3', row: 'base', en: 'Drawer stack (3)', ar: 'ستاك أدراج (٣)', unit: () => U(800, [S('drawer', 3)]) },
  { k: 'sinkBase', row: 'base', en: 'Sink base 800', ar: 'وحدة حوض ٨٠٠', unit: () => U(800, [S('cover', 1), S('sink', 2, { shelves: 0 })]) },
  { k: 'hobBase', row: 'base', en: 'Hob base (3 drawers)', ar: 'وحدة موقد (٣ أدراج)', unit: () => U(600, [S('hob', 3)]) },
  { k: 'ovenUnit', row: 'base', en: 'Oven + drawer unit', ar: 'وحدة فرن + درج', unit: () => U(600, [S('drawer', 1), S('oven', 1)]) },
  { k: 'tallOven', row: 'base', en: 'Tall oven unit', ar: 'وحدة طويلة للفرن', unit: () => U(600, [S('door', 1, { shelves: 1 }), S('oven', 1), S('drawer', 1)], { type: 'tall', h: 2470 }) },
  { k: 'tallPantry', row: 'base', en: 'Tall pantry', ar: 'وحدة طويلة للمؤن', unit: () => U(600, [S('door', 1, { shelves: 1 }), S('door', 1, { shelves: 3 })], { type: 'tall', h: 2470 }) },
  { k: 'blind', row: 'base', en: 'Blind corner 900', ar: 'ركن أعمى ٩٠٠', unit: () => U(900, [S('door', 1, { shelves: 0 })], { type: 'blind' }) },
  { k: 'carousel', row: 'base', en: 'Carousel corner 900', ar: 'ركن دوّار ٩٠٠', unit: () => U(900, [S('door', 1, { shelves: 0 })], { type: 'carousel' }) },
  { k: 'diagonal', row: 'base', en: 'Diagonal corner 900', ar: 'ركن قطري ٩٠٠', unit: () => U(900, [S('door', 1, { shelves: 0 })], { type: 'diagonal' }) },
  { k: 'wallGlass', row: 'wall', en: 'Wall glass 2-door', ar: 'علوي زجاج بابين', unit: () => U(800, [S('glass', 2, { shelves: 3 })]) },
  { k: 'wallFlip', row: 'wall', en: 'Wall flip-up', ar: 'علوي قلاب', unit: () => U(800, [S('flip', 1, { shelves: 1 })]) },
  { k: 'wallOpen', row: 'wall', en: 'Wall open shelf', ar: 'علوي رف مفتوح', unit: () => U(600, [S('open', 2)]) },
  { k: 'wallHood', row: 'wall', en: 'Wall hood cover', ar: 'علوي غطاء شفاط', unit: () => U(600, [S('cover', 1)]) },
];

/* ---- sanitising (import / autosave / undo) ----------------------------------- */
function normSec(s) {
  const t = SECTYPES[s && s.t] ? s.t : 'door';
  const out = { t, n: clamp(Math.round(+(s && s.n) || 1), SEC_N.min, SEC_N.max), shelves: clamp(Math.round(+(s && s.shelves) || 0), SHELVES_N.min, SHELVES_N.max), hinge: s && s.hinge === 'R' ? 'R' : 'L' };
  if (s && +s.h > 0) out.h = clamp(Math.round(+s.h), 100, 3000);
  if (t === 'drawer' || t === 'hob') out.shelves = 0;
  if (t === 'open') out.shelves = 0;
  return out;
}
export function normUnit(u) {
  const type = UNIT_TYPES[u && u.type] ? u.type : 'normal';
  const out = {
    id: (u && u.id) || uid(),
    w: clamp(Math.round(+(u && u.w) || 600), UNIT_W.min, UNIT_W.max),
    type,
    secs: Array.isArray(u && u.secs) && u.secs.length ? u.secs.slice(0, SEC_N.max).map(normSec) : [normSec({})],
    grainFront: ['auto', 'V', 'H'].includes(u && u.grainFront) ? u.grainFront : 'auto',
  };
  if (type === 'tall') out.h = clamp(Math.round(+(u && u.h) || TALL_H.def), TALL_H.min, TALL_H.max);
  else if (u && +u.h > 0) out.h = clamp(Math.round(+u.h), 200, 1000); // a wall / top unit shorter than its row (bottom-aligned); geometry caps it at the row height
  if (u && u.hidden) out.hidden = true;
  return out;
}

/** Validate + clamp an arbitrary JSON (import, autosave, undo). Throws Error(list) when it is not a Neo kitchen. */
export function normalizeModel(raw) {
  const issues = [];
  if (!raw || typeof raw !== 'object') throw new Error('Not a JSON object');
  const src = raw.model && typeof raw.model === 'object' ? raw.model : raw;
  if (!src.g || !src.runs || !src.runs.main) throw new Error('Not a Neo Kitchen project (missing g / runs.main)');
  const base = makeInitial();
  const g = { ...DEFAULT_G };
  Object.keys(DEFAULT_G).forEach((k) => {
    if (src.g[k] === undefined) return;
    const c = clampSpec(k, src.g[k]);
    if (c.clamped) issues.push(`${k}: ${src.g[k]} -> ${c.value} (range ${c.min}-${c.max})`);
    g[k] = c.value;
  });
  const runs = {};
  RUNS.forEach((rk) => {
    const r = src.runs[rk] || emptyRun();
    runs[rk] = {};
    ROWS.forEach((row) => { runs[rk][row] = Array.isArray(r[row]) ? r[row].map(normUnit) : []; });
  });
  /* UX29: the extra runs are normalised only when the file has them (older files get exactly the runs they always had) */
  XRUNS.forEach((rk) => {
    const r = src.runs[rk]; if (!r || typeof r !== 'object') return;
    runs[rk] = {}; ROWS.forEach((row) => { runs[rk][row] = Array.isArray(r[row]) ? r[row].map(normUnit) : []; });
  });
  const legs = {};
  ['left', 'right'].forEach((side) => {
    const l = (src.legs && src.legs[side]) || {};
    const depth = clamp(Math.round(+l.depth || LEG.depth.def), LEG.depth.min, LEG.depth.max);
    legs[side] = {
      on: !!l.on,
      depth,
      // files saved before the flag existed: a leg whose depth equals the main base depth was effectively inheriting it
      matchD: l.matchD === undefined ? depth === g.baseD : !!l.matchD,
      height: clamp(Math.round(+l.height || LEG.height.def), LEG.height.min, LEG.height.max),
      matchH: l.matchH === undefined ? true : !!l.matchH,
      length: clamp(Math.round(+l.length || LEG.length.def), LEG.length.min, LEG.length.max),
    };
  });
  const handle = src.handle || {};
  const grain = { ...DEFAULT_GRAIN };
  GRAIN_KINDS.forEach((k) => { if (src.grain && ['V', 'H', 'N'].includes(src.grain[k])) grain[k] = src.grain[k]; });
  const mats = {};
  MAT_SLOTS.forEach(({ k }) => { if (src.mats && typeof src.mats[k] === 'string' && src.mats[k].trim()) mats[k] = src.mats[k].trim().slice(0, 60); });
  const model = {
    ...base, g, runs, legs,
    title: typeof src.title === 'string' && src.title.trim() ? src.title.trim().slice(0, 80) : base.title,
    topOn: !!src.topOn, keepWidth: src.keepWidth === undefined ? true : !!src.keepWidth,
    keepHeight: src.keepHeight === undefined ? true : !!src.keepHeight, // files saved before the flag existed behave as the screens now default: keep the overall height
    finish: FINISHES[src.finish] ? src.finish : 'oak',
    counter: COUNTERS[src.counter] ? src.counter : 'marble',
    handle: {
      style: HANDLES[handle.style] ? handle.style : 'bar',
      len: HANDLE_LENS.includes(+handle.len) ? +handle.len : 128,
      pos: ['auto', 'top', 'center', 'bottom'].includes(handle.pos) ? handle.pos : 'auto',
    },
    led: normLed(src.led), bottomCover: !!src.bottomCover,
    grain, mats, paint: normalizePaint(src.paint), matMap: normalizeMatMap(src.matMap),
  };
  const xl = normXl(src.xl);
  if (xl) { model.xl = xl; if (!model.runs[XL_RUN_OF[xl.kind]]) model.runs = { ...model.runs, [XL_RUN_OF[xl.kind]]: defaultXRun(XL_RUN_OF[xl.kind]) }; } // absent in older files = Single wall / L / U, unchanged; a layout always has its run
  return { model, issues };
}

/** the LED options (UX-17): strip on/off, light on/off, groove width in mm. Anything missing / out of range falls back to the safe default. */
export function normLed(l) {
  const s = l && typeof l === 'object' ? l : {};
  const w = Math.round(+s.w);
  const off = Math.round(+s.off);
  const cl = (v, r, d) => (Number.isFinite(v) ? Math.min(r.max, Math.max(r.min, v)) : d);
  return { strip: !!s.strip, on: s.on === undefined ? true : !!s.on, w: cl(w, LED.w, LED.w.def), off: cl(off, LED.off, LED.off.def) };
}
/** set one LED option; returns a new model (same commit() path as every other edit, so it is one undo step) */
export function setLed(model, patch) { return { ...model, led: normLed({ ...normLed(model.led), ...patch }) }; }

/* ---- undo / redo history (coalesces slider drags with the same key) ---------- */
export function makeHistory(model) { return { past: [], present: model, future: [], key: null, at: 0 }; }
export function pushHistory(h, model, key, now = Date.now()) {
  if (model === h.present) return h;
  const merge = key && h.key === key && (now - h.at < 700 || String(key).startsWith('hdl:')); // [NEO-HANDLES-UX36] a handle drag is one step however long the pointer rests
  return { past: merge ? h.past : [...h.past, h.present].slice(-100), present: model, future: [], key: key || null, at: now };
}
export const undoHistory = (h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], key: null, at: 0 } : h);
export const redoHistory = (h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), key: null, at: 0 } : h);
