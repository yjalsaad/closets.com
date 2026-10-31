/* =============================================================================
 * [NEO-HANDLES-UX36] Neo Kitchen Designer handles (also the base of every category studio that draws through the kitchen elevation). PURE.
 * Input: the studio's current model + scene + the run on screen + the selection. Output: handleModel handles. Every `apply(v)` calls the SAME setters
 * the parameter panel calls (setUnitWidth, setRunWidth, setGlobal, setRowHeight, setKitchenHeight, setUnitHeight, setSectionHeight, setLeg, patchUnit), so a drag
 * gives byte-identical cut lists to typing the value in the panel (tests compare them).
 *   level 1 (always): the run's overall width, the overall / wall / gap / base / plinth heights, every unit's width edge, a tall unit's height
 *   level 2 (the selected unit): wall / top unit height, section dividers (drag = section height), section counts (drawers / shelves)
 * ===========================================================================*/
import {
  setUnitWidth, setRunWidth, setGlobal, setRowHeight, setKitchenHeight, setUnitHeight, setSectionHeight, setLeg, patchUnit,
  totalH, lowerH, rowWidth, runLenRange, runHasTop, runWallH, isTall, tallH, unitDrawH, penProjection, penLengthFor, isFlipRun, clamp,
} from '../neoKitchen/model';
import { FIELD, UNIT_W, TALL_H, KITCHEN, LEG, SEC_N, SHELVES_N, XL } from '../neoKitchen/constants';
import { partNameAr } from '../neoKitchen/cutlist';
import { makeHandle, snapList, T, STD_WIDTHS } from './handleModel';

const ar = (s) => partNameAr(String(s));
const lim = (en, ar2) => T(en, ar2);

/** the studio's field ranges as reasons: "Maximum 1200 mm - widest unit" */
const widthReasons = (lo, hi) => ({ min: lim(`Narrowest unit is ${lo} mm`, `أضيق وحدة ${lo} مم`), max: lim(`Widest unit is ${hi} mm`, `أعرض وحدة ${hi} مم`) });

/** a global height field of model.g as a handle (written through setGlobal, the panel's own path) */
function gField(model, k, { at, label, tip, snap, dir = 'up', group = 'overall' }) {
  const f = FIELD[k];
  return makeHandle({
    id: `g:${k}`, kind: 'height', dir, at, value: model.g[k], min: f.min, max: f.max, step: f.step || 10, snap: snap || [], group, level: 1, label, tip,
    reasons: { min: lim(`Minimum ${f.min} mm`, `الحد الأدنى ${f.min} مم`), max: lim(`Maximum ${f.max} mm`, `الحد الأقصى ${f.max} مم`) },
    apply: (v) => { const r = setGlobal(model, k, v); return { next: r.model, value: r.value, clamped: !!r.clamped }; },
  });
}

/**
 * @param {{ model, scene, runKey, selected?: {unitId?:string}, layers?: object }} o
 * @returns handles for the run drawn in the elevation (coordinates = the elevation's own: u along the run, y up from the floor)
 */
export function kitchenHandles({ model, scene, runKey, selected = null, layers = null }) {
  const run = scene && scene.runs.find((r) => r.key === runKey);
  if (!run) return [];
  const g = model.g; const L = run.L; const flip = !!run.flip;
  const on = (row) => !layers || layers[row] !== false;
  const out = [];
  const mainLike = runKey === 'main' || runKey === 'run2';
  const leg = runKey === 'left' || runKey === 'right';
  const ownLeg = leg && !model.legs[runKey].matchH;
  const lowerTop = lowerH(g);

  /* ---- the run's overall width (right end, or the left end of a mirrored run) ---- */
  {
    const rng = runLenRange(runKey); const isPen = runKey === 'pen';
    const cur = isPen ? penProjection(model) : L;
    /* what the run can really reach: setRunWidth scales the free units inside their own 200-1200 mm (tall units keep their width), so the pill's limit is the real one */
    const reach = (t) => { const r = setRunWidth(model, runKey, isPen ? penLengthFor(model, t) : t); return isPen ? r.value - g.baseD : r.value; };
    const lo = Math.max(isPen ? XL.minProj : rng.min, reach(isPen ? XL.minProj : rng.min)); const hi = Math.min(isPen ? rng.max - g.baseD : rng.max, reach(isPen ? rng.max - g.baseD : rng.max));
    const hMax = Math.max(...run.units.map((x) => x.y0 + x.H), g.plinthH + g.baseH);
    out.push(makeHandle({
      id: `run:${runKey}:len`, kind: 'width', dir: flip ? 'left' : 'right', at: { u: flip ? 0 : L, y: Math.max(g.plinthH + g.baseH + g.counterThk + 140, hMax * 0.5) }, value: cur, min: lo, max: hi, step: 10, snap: snapList(lo, hi, [], [1200, 1800, 2400, 3000, 3600, 4200, 4800, 6000]),
      group: 'overall', level: 1, label: runKey === 'main' ? T('Kitchen width', 'عرض المطبخ') : T(`${isPen ? 'Projection' : 'Run length'}`, isPen ? 'البروز' : 'طول الصف'), tip: T('Drag left / right: whole run width', 'اسحب يمينًا/يسارًا: عرض الصف كاملًا'),
      reasons: { min: lim(`The shortest this run can reach is ${lo} mm`, `أقصر طول يبلغه الصف ${lo} مم`), max: lim(`The longest this run can reach is ${hi} mm (units are 200-1200 mm wide)`, `أطول طول يبلغه الصف ${hi} مم (عرض الوحدة 200-1200 مم)`) },
      apply: (v) => { const r = setRunWidth(model, runKey, isPen ? penLengthFor(model, v) : v); return { next: r.model, value: isPen ? r.value - g.baseD : r.value, clamped: !!r.clamped }; },
    }));
  }

  /* ---- global heights: on the left edge of the drawing (level 1) ---- */
  const edge = 0;
  if (on('plinth') || on('base')) {
    out.push(gField(model, 'plinthH', { at: { u: edge, y: g.plinthH }, snap: [100, 120, 150], label: T('Plinth height', 'ارتفاع القاعدة'), tip: T('Drag up / down: plinth (toe-kick) height', 'اسحب لأعلى/لأسفل: ارتفاع القاعدة') }));
  }
  if (on('base')) {
    out.push(gField(model, 'baseH', { at: { u: edge, y: g.plinthH + g.baseH }, snap: [700, 720, 760, 800], label: T('Base carcass height', 'ارتفاع الوحدة السفلية'), tip: T('Drag up / down: base cabinet height', 'اسحب لأعلى/لأسفل: ارتفاع الوحدة السفلية') }));
  }
  const hasWall = run.units.some((x) => x.row === 'wall');
  if (hasWall && on('wall')) {
    out.push(gField(model, 'gap', { at: { u: edge, y: lowerTop }, snap: [500, 550, 600, 650, 700], label: T('Counter to wall-unit gap', 'الفراغ بين السطح والعلوي'), tip: T('Drag up / down: where the wall units start', 'اسحب لأعلى/لأسفل: بداية الوحدات العلوية') }));
    const wallDraw = runWallH(model, runKey);
    if (!ownLeg && (model.topOn || run.units.some((x) => x.row === 'top'))) {
      const f = FIELD.wallH;
      out.push(makeHandle({
        id: `g:wallH`, kind: 'height', dir: 'up', at: { u: edge, y: lowerTop + wallDraw }, value: g.wallH, min: f.min, max: f.max, step: 10, snap: [600, 720, 900], group: 'overall', level: 1,
        label: T('Wall row height', 'ارتفاع الصف العلوي'), tip: T('Drag up / down: wall units height', 'اسحب لأعلى/لأسفل: ارتفاع الوحدات العلوية'),
        reasons: { min: lim(`Minimum ${f.min} mm`, `الحد الأدنى ${f.min} مم`), max: lim(`Maximum ${f.max} mm`, `الحد الأقصى ${f.max} مم`) },
        apply: (v) => { const r = setRowHeight(model, 'wall', v); return { next: r.model, value: r.value, clamped: !!r.clamped }; },
      }));
    }
  }
  /* the top row (a third tier above the wall units): its own height, through the same keep-overall-height rule as the Top row screen */
  if (!ownLeg && runHasTop(model, runKey) && run.units.some((x) => x.row === 'top') && on('top')) {
    const f = FIELD.topH;
    out.push(makeHandle({
      id: 'g:topH', kind: 'height', dir: 'up', at: { u: L * 0.82, y: lowerTop + runWallH(model, runKey) + g.topH }, value: g.topH, min: f.min, max: f.max, step: 10, snap: [400, 500, 580, 700], group: 'overall', level: 1,
      label: T('Top row height', 'ارتفاع الصف الثالث'), tip: T('Drag up / down: top units height', 'اسحب لأعلى/لأسفل: ارتفاع الوحدات الثالثة'),
      reasons: { min: lim(`Minimum ${f.min} mm`, `الحد الأدنى ${f.min} مم`), max: lim(`Maximum ${f.max} mm`, `الحد الأقصى ${f.max} مم`) },
      apply: (v) => { const r = setRowHeight(model, 'top', v); return { next: r.model, value: r.value, clamped: !!r.clamped }; },
    }));
  }
  /* overall height: the top edge. Main run / run 2 = the Kitchen height field; a leg with its own height = its Leg height field */
  const topY = Math.max(...run.units.map((x) => x.y0 + x.H), g.plinthH + g.baseH + g.counterThk);
  if (mainLike && (on('wall') || on('base'))) {
    const cur = totalH(model);
    out.push(makeHandle({
      id: 'kitchen:H', kind: 'height', dir: 'up', at: { u: L / 2, y: Math.max(topY, hasWall ? cur : topY) }, value: cur, min: KITCHEN.height.min, max: KITCHEN.height.max, step: 10, snap: [2200, 2400, 2600, 2700, 3000], group: 'overall', level: 1,
      label: T('Overall height', 'الارتفاع الكلي'), tip: T('Drag up / down: overall kitchen height', 'اسحب لأعلى/لأسفل: الارتفاع الكلي للمطبخ'),
      reasons: { min: lim(`Lowest kitchen is ${KITCHEN.height.min} mm`, `أقل ارتفاع ${KITCHEN.height.min} مم`), max: lim(`Highest kitchen is ${KITCHEN.height.max} mm`, `أعلى ارتفاع ${KITCHEN.height.max} مم`) },
      apply: (v) => { const r = setKitchenHeight(model, v); return { next: r.model, value: r.value, clamped: !!r.clamped }; },
    }));
  } else if (ownLeg) {
    out.push(makeHandle({
      id: `leg:${runKey}:H`, kind: 'height', dir: 'up', at: { u: L / 2, y: topY }, value: model.legs[runKey].height, min: LEG.height.min, max: LEG.height.max, step: 10, group: 'overall', level: 1,
      label: T('Leg height', 'ارتفاع الرجل'), tip: T('Drag up / down: this leg height', 'اسحب لأعلى/لأسفل: ارتفاع هذه الرجل'),
      reasons: { min: lim(`Lowest leg is ${LEG.height.min} mm`, `أقل ارتفاع ${LEG.height.min} مم`), max: lim(`Highest leg is ${LEG.height.max} mm`, `أعلى ارتفاع ${LEG.height.max} مم`) },
      apply: (v) => { const r = setLeg(model, runKey, 'height', v); return { next: r.model, value: r.value, clamped: !!r.clamped }; },
    }));
  }

  /* ---- every unit: its width edge (level 1) + the selected unit's own handles (level 2) ---- */
  const byRow = {};
  run.units.forEach((x) => { (byRow[x.row] = byRow[x.row] || []).push(x); });
  Object.keys(byRow).forEach((row) => {
    if (!on(row)) return;
    const units = byRow[row]; const widths = units.map((x) => x.unit.w);
    units.forEach((x, i) => {
      const u = x.unit; const id = u.id; const tall = isTall(u);
      const lastOfRow = i === units.length - 1;
      const others = widths.filter((_, j) => j !== i);
      /* the width this unit can really take: setUnitWidth's own clamp (with "keep the run width" the others must stay inside 200-1200 mm too) */
      const wOf = (t) => setUnitWidth(model, runKey, row, id, t).model.runs[runKey][row].find((q) => q.id === id).w;
      const wLo = Math.min(u.w, wOf(UNIT_W.min)); const wHi = Math.max(u.w, wOf(UNIT_W.max));
      const lbl = x.label || id;
      out.push(makeHandle({
        id: `unit:${id}:w`, unitId: id, kind: lastOfRow ? 'width' : 'split', dir: flip ? 'left' : 'right', at: { u: flip ? x.fu0 : x.fu0 + x.W, y: x.y0 + x.H * (row === 'base' && !tall ? 0.42 : 0.5) },
        value: u.w, min: wLo, max: wHi, step: 10, snap: snapList(wLo, wHi, others, STD_WIDTHS), group: 'unit', level: 1,
        label: T(`${lbl} width`, `عرض ${ar(lbl)}`), tip: T('Drag left / right: unit width', 'اسحب يمينًا/يسارًا: عرض الوحدة'), reasons: model.keepWidth && (wHi < UNIT_W.max || wLo > UNIT_W.min) ? { min: lim(`The other units need room (at least ${wLo} mm here)`, `تحتاج الوحدات الأخرى مساحة (الحد الأدنى ${wLo} مم)`), max: lim(`The other units need room (at most ${wHi} mm here)`, `تحتاج الوحدات الأخرى مساحة (الحد الأقصى ${wHi} مم)`) } : widthReasons(UNIT_W.min, UNIT_W.max),
        apply: (v) => { const r = setUnitWidth(model, runKey, row, id, v); return { next: r.model, value: r.model.runs[runKey][row].find((q) => q.id === id).w, clamped: !!r.clamped }; },
      }));
      /* a tall unit's own height (level 1: it is the tallest thing on the drawing) */
      if (tall) {
        out.push(makeHandle({
          id: `unit:${id}:h`, unitId: id, kind: 'height', dir: 'up', at: { u: x.fu0 + x.W / 2, y: x.y0 + x.H }, value: tallH(u), min: TALL_H.min, max: TALL_H.max, step: 10, snap: [2100, 2200, 2400, 2470, 2700], group: 'unit', level: 1,
          label: T(`${lbl} height`, `ارتفاع ${ar(lbl)}`), tip: T('Drag up / down: tall unit height', 'اسحب لأعلى/لأسفل: ارتفاع الوحدة الطويلة'), reasons: { min: lim(`Shortest tall unit is ${TALL_H.min} mm`, `أقصر وحدة طويلة ${TALL_H.min} مم`), max: lim(`Tallest is ${TALL_H.max} mm`, `الأطول ${TALL_H.max} مم`) },
          apply: (v) => { const h = clamp(Math.round(v), TALL_H.min, TALL_H.max); return { next: patchUnit(model, runKey, row, id, (q) => ({ ...q, h })), value: h, clamped: h !== Math.round(v) }; },
        }));
      }
      const sel = !!(selected && selected.unitId === id);
      /* wall / top unit height (this one unit, bottom-aligned): level 2 */
      if (!tall && (row === 'wall' || row === 'top')) {
        const rowH = row === 'wall' ? runWallH(model, runKey) : g.topH; const mn = Math.min(row === 'wall' ? FIELD.wallH.min : FIELD.topH.min, rowH);
        out.push(makeHandle({
          id: `unit:${id}:h`, unitId: id, kind: 'height', dir: 'up', at: { u: x.fu0 + x.W / 2, y: x.y0 + x.H }, value: unitDrawH(model, runKey, row, u), min: mn, max: rowH, step: 10, snap: [], group: 'unit', level: sel ? 1 : 2,
          label: T(`${lbl} height`, `ارتفاع ${ar(lbl)}`), tip: T('Drag up / down: this unit height (bottom-aligned)', 'اسحب لأعلى/لأسفل: ارتفاع هذه الوحدة'), reasons: { max: lim(`Not taller than its row (${rowH} mm)`, `لا تزيد عن الصف (${rowH} مم)`) },
          apply: (v) => { const m = setUnitHeight(model, runKey, row, id, Math.min(rowH, Math.max(200, v))); const q = m.runs[runKey][row].find((z) => z.id === id); return { next: m, value: q.h ? Math.min(q.h, rowH) : rowH, clamped: false }; },
        }));
      }
      /* the selected unit: section dividers + counts */
      if (sel) {
        const secs = u.secs; const fixed = (skip) => secs.reduce((s, q, j) => s + (j !== skip && q.h ? q.h : 0), 0);
        x.bounds.forEach((b, si) => {
          if (si < x.bounds.length - 1) {
            const autos = secs.filter((q, j) => j !== si && !q.h).length;
            const maxH = Math.max(100, x.H - fixed(si) - autos * 100);
            out.push(makeHandle({
              id: `sec:${id}:${si}`, unitId: id, kind: 'split', dir: 'down', at: { u: x.fu0 + x.W / 2, y: b.bot }, value: Math.round(b.top - b.bot), min: 100, max: maxH, step: 10, snap: [], group: 'member', level: 2,
              label: T(`${lbl} section ${si + 1} height`, `${ar(lbl)}: ارتفاع القسم ${si + 1}`), tip: T('Drag up / down: section height', 'اسحب لأعلى/لأسفل: ارتفاع القسم'), reasons: { min: lim('Sections are at least 100 mm', 'أقل قسم 100 مم'), max: lim('The other sections need room (100 mm each)', 'الأقسام الأخرى تحتاج مساحة (100 مم لكل قسم)') },
              apply: (v) => { const m = setSectionHeight(model, runKey, row, id, si, v, x.H); const h = m.runs[runKey][row].find((z) => z.id === id).secs[si].h; return { next: m, value: h, clamped: h !== Math.round(v) }; },
            }));
          }
        });
        secs.forEach((s, si) => {
          const b = x.bounds[si]; if (!b) return;
          const isDrawer = s.t === 'drawer' || s.t === 'hob'; const isOpen = s.t === 'open';
          const field = isDrawer || isOpen ? 'n' : (s.t === 'door' || s.t === 'glass' || s.t === 'flip' || s.t === 'sink') ? 'shelves' : null;
          if (!field) return;
          const rng = field === 'n' ? SEC_N : SHELVES_N;
          out.push(makeHandle({
            id: `sec:${id}:${si}:${field}`, unitId: id, kind: 'count', dir: 'up', at: { u: x.fu0 + Math.min(70, x.W * 0.2), y: (b.top + b.bot) / 2 }, value: s[field], min: rng.min, max: rng.max, step: 1, pitch: 70, group: 'count', level: 2,
            label: isDrawer ? T(`${lbl} section ${si + 1} drawers`, `${ar(lbl)}: أدراج القسم ${si + 1}`) : T(`${lbl} section ${si + 1} shelves`, `${ar(lbl)}: رفوف القسم ${si + 1}`),
            tip: isDrawer ? T('Drag up / down: number of drawers', 'اسحب لأعلى/لأسفل: عدد الأدراج') : T('Drag up / down: number of shelves', 'اسحب لأعلى/لأسفل: عدد الرفوف'), unit: '',
            reasons: { min: lim(`At least ${rng.min}`, `على الأقل ${rng.min}`), max: lim(`At most ${rng.max}`, `على الأكثر ${rng.max}`) },
            apply: (v) => { const n = clamp(Math.round(v), rng.min, rng.max); return { next: patchUnit(model, runKey, row, id, (q) => ({ ...q, secs: q.secs.map((z, j) => (j === si ? { ...z, [field]: n } : z)) })), value: n, clamped: n !== Math.round(v) }; },
          }));
        });
      }
    });
  });
  void rowWidth; void isFlipRun;
  return out;
}
