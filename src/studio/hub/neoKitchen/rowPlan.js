/* Neo Kitchen Designer - the front-plan diagram of the Wall / Top / L-Left / L-Right screens (UX-6), as pure geometry.
 * planLayout(model, { rk, row, selId }) turns the LIVE model into pixel rectangles (viewBox units): every unit of the run is drawn at
 * the same scale (one factor for width and height), the focused row is solid, every other row and the main run (on a leg screen) is
 * a pale ghost. Nothing is hard-coded: widths, heights, offsets and labels all come from model.runs / model.g / model.legs, so a
 * changed control always moves the drawing. RowPlan.jsx only paints this structure. */
import {
  rowWidth, isTall, tallH, lowerH, runWallH, wallOffset, runHasTop, sum, totalH, worktopH, overallH, isFlipRun, isExtraRun,
} from './model';

export const PLAN = { W: 260, PAD: 10, MARK: 52, MAXH: 170, BOT: 40, GAP_MM: 240, MAIN_WIN_MM: 1500 };

const rowKey = (rk, row) => `${rk}:${row}`;

/** every unit of one run as a rectangle in mm (x along the run seen from the front, y up from the floor), shifted right by `ox` */
export function runItems(model, rk, ox = 0, { includeOffTop = true } = {}) {
  const g = model.g; const run = model.runs[rk];
  const L = rowWidth(run.base); const flip = isFlipRun(model, rk);
  const off = wallOffset(run.base);
  const wallH = runWallH(model, rk);
  const out = [];
  const place = (row, arr, start, y0, H) => {
    let u = start;
    (arr || []).forEach((unit, idx) => {
      const x0 = flip ? L - (u + unit.w) : u;
      const tall = isTall(unit);
      const baseRow = row === 'base';
      const h = baseRow ? g.plinthH + (tall ? tallH(unit) : g.baseH) : (unit.h ? Math.min(unit.h, H) : H);
      const yy = baseRow ? 0 : y0;
      out.push({
        id: unit.id, rk, row, idx, w: unit.w, tall, hidden: !!unit.hidden, flip, off: row === 'top' && !runHasTop(model, rk),
        x0: ox + x0, x1: ox + x0 + unit.w, y0: yy, y1: yy + h,
      });
      u += unit.w;
    });
  };
  place('base', run.base, 0, 0, null);
  place('wall', run.wall, off, lowerH(g), wallH);
  if (includeOffTop || runHasTop(model, rk)) place('top', run.top, off, lowerH(g) + wallH, g.topH);
  return out;
}

/** "Wall row" / "Top row" / "Right leg - base cabinets" ... (EN / AR) */
export function rowTitle(rk, row, lang = 'en') {
  const ar = lang === 'ar';
  const rows = { base: ['base cabinets', 'الوحدات السفلية'], wall: ['wall cabinets', 'الوحدات العلوية'], top: ['top cabinets', 'وحدات الصف الثالث'] };
  const legs = { left: ['Left leg', 'الرجل اليسرى'], right: ['Right leg', 'الرجل اليمنى'], run2: ['Run 2', 'الصف ٢'], pen: ['Peninsula', 'الجزيرة الممتدة'], isl: ['Island', 'الجزيرة'] };
  if (rk === 'main') return { base: ['Base cabinets', 'الوحدات السفلية'], wall: ['Wall cabinets', 'الوحدات العلوية'], top: ['Top cabinets', 'الوحدات العلوية الثالثة'] }[row][ar ? 1 : 0];
  return `${legs[rk][ar ? 1 : 0]} — ${rows[row][ar ? 1 : 0]}`;
}
/** the caption under the blue row line: "Wall row 200 cm" */
export function rowLineLabel(rk, row, mm, lang = 'en') {
  const ar = lang === 'ar'; const cm = Math.round(mm / 10);
  if (rk !== 'main' && row === 'base') {
    if (isExtraRun(rk)) { const n = { run2: ['Run 2', 'الصف ٢'], pen: ['Peninsula', 'الجزيرة الممتدة'], isl: ['Island', 'الجزيرة'] }[rk]; return ar ? `${n[1]} ${cm} سم` : `${n[0]} ${cm} cm`; }
    return ar ? `${rk === 'left' ? 'الرجل اليسرى' : 'الرجل اليمنى'} ${cm} سم` : `${rk === 'left' ? 'Left' : 'Right'} leg ${cm} cm`;
  }
  const name = { base: ['Base row', 'الصف السفلي'], wall: ['Wall row', 'الصف العلوي'], top: ['Top row', 'الصف الثالث'] }[row][ar ? 1 : 0];
  return `${name} ${cm} ${ar ? 'سم' : 'cm'}`;
}

/**
 * @param {object} model
 * @param {{rk?: string, row?: string, selId?: string|null, W?: number}} o  rk: 'main' | 'left' | 'right'; row: the focused row
 */
export function planLayout(model, { rk = 'main', row = 'wall', selId = null, W = PLAN.W } = {}) {
  const { PAD, MARK, MAXH, BOT, GAP_MM } = PLAN;
  const Lm = rowWidth(model.runs.main.base);
  let items; let legSpan = null; let totalW; let mainWin = null;
  if (rk === 'main' || isExtraRun(rk)) { items = runItems(model, rk, 0); totalW = Math.max(1, ...items.map((i) => i.x1)); } // UX29: run 2 / peninsula / island are drawn alone, like the main run
  else {
    /* a leg screen shows the leg at the same scale as only the last stretch of the main run next to it (clipped), so the leg stays readable */
    const Ll = rowWidth(model.runs[rk].base); const Wm = Math.min(Lm, PLAN.MAIN_WIN_MM);
    if (rk === 'right') {
      const ox = -(Lm - Wm);
      items = [...runItems(model, 'main', ox).filter((i) => i.x1 > 0), ...runItems(model, 'right', Wm + GAP_MM)];
      legSpan = [Wm + GAP_MM, Wm + GAP_MM + Ll]; mainWin = [0, Wm];
    } else {
      items = [...runItems(model, 'left', 0), ...runItems(model, 'main', Ll + GAP_MM).filter((i) => i.x0 < Ll + GAP_MM + Wm)];
      legSpan = [0, Ll]; mainWin = [Ll + GAP_MM, Ll + GAP_MM + Wm];
    }
    totalW = Wm + GAP_MM + Ll;
  }
  const hmm = Math.max(1, ...items.map((i) => i.y1));
  const s = Math.min((W - 2 * PAD - MARK) / totalW, MAXH / hmm);
  const H = Math.round(PAD + hmm * s + BOT);
  const floorY = PAD + hmm * s;
  const X = (mm) => PAD + mm * s; const Y = (mm) => PAD + (hmm - mm) * s;

  const out = items.map((i) => {
    const focus = i.rk === rk && i.row === row;
    return {
      ...i, key: `${i.rk}-${i.row}-${i.id}`, focus, ghost: !focus, sel: i.id === selId,
      x: X(i.x0), y: Y(i.y1), width: (i.x1 - i.x0) * s, height: (i.y1 - i.y0) * s, label: String(Math.round(i.w / 10)),
    };
  });

  const focused = out.filter((i) => i.focus);
  const fx0 = focused.length ? Math.min(...focused.map((i) => i.x0)) : 0; const fx1 = focused.length ? Math.max(...focused.map((i) => i.x1)) : 0;
  const selItem = out.find((i) => i.sel && i.focus) || null;
  const mk = selItem || (focused.length ? { y0: Math.min(...focused.map((i) => i.y0)), y1: Math.max(...focused.map((i) => i.y1)) } : null);
  const marker = mk ? { x: X(totalW) + 8, y0: Y(mk.y1), y1: Y(mk.y0), mm: mk.y1 - mk.y0, label: `${Math.round((mk.y1 - mk.y0) / 10)} cm` } : null;
  const rowMM = sum((model.runs[rk][row] || []).map((u) => u.w));
  const line = { x0: X(fx0), x1: X(fx1), y: floorY + 12, y2: floorY + 12, mm: rowMM, cx: (X(fx0) + X(fx1)) / 2, ty: floorY + 28 };

  /* the grab handle of the selected unit: on its free edge (the right edge, or the left edge on the mirrored left leg) */
  let handle = null;
  if (selItem && !selItem.hidden) {
    const flip = selItem.flip;
    handle = {
      id: selItem.id, rk: selItem.rk, row: selItem.row, flip, x: flip ? selItem.x : selItem.x + selItem.width, y: selItem.y + selItem.height / 2,
      px0: selItem.x, px1: selItem.x + selItem.width, pillX: selItem.x + selItem.width / 2, pillY: selItem.y + selItem.height + 5,
    };
  }
  const legBars = legSpan ? { x0: X(legSpan[0]) - 2, x1: X(legSpan[1]) - 1, y0: Y(Math.max(...out.filter((i) => i.rk === rk).map((i) => i.y1))), y1: floorY } : null;
  const mainClip = mainWin ? { x: X(mainWin[0]), w: (mainWin[1] - mainWin[0]) * s, y: 0, h: H } : null;
  return { W, H, s, mmH: hmm, floorY, items: out, marker, line, handle, legBars, mainClip, focusCount: focused.length, rk, row };
}

/** the numbers of the three summary cards (mm). base-row screens of a leg show leg length / overall / worktop, the rest row width / bottom / top. */
export function rowStats(model, rk, row) {
  const g = model.g; const run = model.runs[rk];
  const wallH = runWallH(model, rk);
  const arr = run[row] || [];
  const width = rowWidth(arr);
  if (row === 'base') return { width, bottom: 0, top: g.plinthH + g.baseH + g.counterThk, length: rowWidth(run.base), overall: overallH(model), worktop: worktopH(g) };
  if (row === 'wall') {
    const h = arr.length ? Math.max(...arr.map((u) => (u.h ? Math.min(u.h, wallH) : wallH))) : wallH;
    return { width, bottom: lowerH(g), top: lowerH(g) + h, height: wallH, overall: overallH(model), worktop: worktopH(g), length: rowWidth(run.base) };
  }
  return { width, bottom: lowerH(g) + wallH, top: lowerH(g) + wallH + g.topH, height: g.topH, overall: totalH(model), worktop: worktopH(g), length: rowWidth(run.base) };
}

export { rowKey };
