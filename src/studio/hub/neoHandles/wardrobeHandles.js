/* =============================================================================
 * [NEO-HANDLES-UX36] Neo Closets (wardrobe studio) handles. PURE: design + scene in, handleModel handles out. Each apply(v) composes the SAME model functions the
 * panel fields call (resizeTotal / optimizeModules / remapModules for the closet width, setColumnWidth for a column divider, setHeightPart for the plinth and the top box,
 * clampField / WFIELD ranges), so dragging a pill and typing the number give the same design. The studio keeps ONE design (`design.x`, `design.mods`, wing in `design.x.wing`).
 *   level 1: closet width (right edge), overall height (top), plinth height, top box height, every column divider, rail and drawer height (up to 4 columns)
 *   level 2 (the selected column): rail height, drawer height, drawer / shelf counts
 * ===========================================================================*/
import {
  normalizeX, normalizeMod, setColumnWidth, resizeTotal, remapModules, setHeightPart, clampField, WFIELD, COL_W, WING_TOTAL_W, DRAWER_H_RANGE, DRAWER_H, RI,
} from '../neoWardrobe/wardrobeModel';
import { optimizeModules } from '../neo/engines/wardrobe/config.mjs';
import { makeHandle, snapList, T, STD_WIDTHS } from './handleModel';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const sumW = (mods) => mods.reduce((s, m) => s + m.width, 0);

/** the closet-width range the panel's Width field uses */
export function dimRangeOf(design, R) {
  const x = normalizeX(design.x);
  return { w: [Math.max(600, R.min_width || 0), Math.min(6000, R.max_width || 6000)], h: [Math.max(1300 + x.plinthH, R.min_height || 0), Math.min(3300 + x.plinthH, R.max_height || 6000)], d: [Math.max(500, R.min_depth || 0), Math.min(700, R.max_depth || 700)] };
}

/** the panel's Width field (setDim 'w'): the change goes to the last free column; when that cannot hold it the columns are re-split by the rules engine */
export function editWidth(design, v, R) {
  const d = design; const grown = resizeTotal(d.mods, v);
  if (grown) return { ...d, dims: { ...d.dims, w: v }, mods: grown.mods };
  const opts = optimizeModules(v, R, 3); const i = Math.min(d.optIdx || 0, Math.max(0, opts.length - 1));
  return { ...d, dims: { ...d.dims, w: v }, optIdx: i, mods: remapModules(d.mods, opts[i] ? opts[i].modules : [v]) };
}
/** one column's width (main) with the keep-total rule, exactly as the Columns card / the column editor do (applyCols) */
export function editColWidth(design, i, v) {
  const d = design; const x = normalizeX(d.x);
  const r = setColumnWidth(d.mods, i, v, x.keepW);
  if (r.mods === d.mods) return null;
  return { ...d, mods: r.mods, dims: { ...d.dims, w: sumW(r.mods) } };
}
export function editWingColWidth(design, j, v) {
  const d = design; const x = normalizeX(d.x); const wm = x.wing.mods;
  const r = setColumnWidth(wm, j, v, x.wing.keep, WING_TOTAL_W);
  if (r.mods === wm) return null;
  return { ...d, x: { ...x, wing: { ...x.wing, mods: r.mods } } };
}
export function editWingLength(design, v) {
  const d = design; const x = normalizeX(d.x); const r = resizeTotal(x.wing.mods, v, WING_TOTAL_W);
  return r ? { ...d, x: { ...x, wing: { ...x.wing, mods: r.mods } } } : null;
}
/** one column's own setting (part 'm' = main, 'w' = wing) */
export function patchColumn(design, part, i, patch) {
  const d = design;
  if (part === 'm') return { ...d, mods: d.mods.map((m, j) => (j === i ? { ...m, ...patch } : m)) };
  const x = normalizeX(d.x);
  return { ...d, x: { ...x, wing: { ...x.wing, mods: x.wing.mods.map((m, j) => (j === i ? { ...m, ...patch } : m)) } } };
}

/**
 * @param {{ design, scene, runKey, rules, cols?: array, selected?: {unitId}, layers?: object }} o
 */
export function wardrobeHandles({ design, scene, runKey, rules, cols = [], selected = null, layers = null }) {
  const run = scene && scene.runs.find((r) => r.key === runKey);
  if (!run) return [];
  const R = rules || {}; const x = normalizeX(design.x);
  const isMain = run.key === 'main'; const flip = !!run.flip; const L = run.L;
  const dr = dimRangeOf(design, R); const out = [];
  const units = run.units.filter((q) => q.row === 'base');
  if (layers && layers.base === false) return out;
  const top = Math.max(...units.map((q) => q.y0 + q.H), x.plinthH + 1000);
  const body0 = x.plinthH;
  const midBody = body0 + (top - body0) * 0.5;
  const mods = isMain ? design.mods : x.wing.mods;
  const idxOf = (unitId) => mods.findIndex((m) => `${isMain ? 'wc' : 'wr'}-${m.id}` === unitId);
  const few = mods.length <= 4;

  /* ---- the closet width / the wing length: the free end of the run ---- */
  if (isMain) {
    out.push(makeHandle({
      id: 'w:total', kind: 'width', dir: flip ? 'left' : 'right', at: { u: flip ? 0 : L, y: midBody }, value: design.dims.w, min: dr.w[0], max: dr.w[1], step: 10, snap: snapList(dr.w[0], dr.w[1], [], [1200, 1500, 1800, 2000, 2400, 3000, 3600, 4800, 6000]),
      group: 'overall', level: 1, label: T('Closet width', 'عرض الخزانة'), tip: T('Drag left / right: closet width', 'اسحب يمينًا/يسارًا: عرض الخزانة'),
      reasons: { min: T(`Narrowest closet is ${dr.w[0]} mm`, `أضيق خزانة ${dr.w[0]} مم`), max: T(`Widest closet is ${dr.w[1]} mm`, `أعرض خزانة ${dr.w[1]} مم`) },
      apply: (v) => { const next = editWidth(design, Math.round(v), R); return { next, value: next.dims.w, clamped: false }; },
    }));
  } else {
    out.push(makeHandle({
      id: 'wing:len', kind: 'width', dir: flip ? 'left' : 'right', at: { u: flip ? 0 : L, y: midBody }, value: sumW(x.wing.mods), min: WING_TOTAL_W.min, max: WING_TOTAL_W.max, step: 10, snap: snapList(WING_TOTAL_W.min, WING_TOTAL_W.max, [], [600, 900, 1200, 1800, 2400]),
      group: 'overall', level: 1, label: T('Wing length', 'طول الجناح'), tip: T('Drag left / right: return wing length', 'اسحب يمينًا/يسارًا: طول الجناح'),
      reasons: { min: T(`Shortest wing is ${WING_TOTAL_W.min} mm`, `أقصر جناح ${WING_TOTAL_W.min} مم`), max: T(`Longest wing is ${WING_TOTAL_W.max} mm`, `أطول جناح ${WING_TOTAL_W.max} مم`) },
      apply: (v) => { const next = editWingLength(design, Math.round(v)); return { next, value: next ? sumW(next.x.wing.mods) : sumW(x.wing.mods), clamped: !next }; },
    }));
  }

  /* ---- heights: overall (top edge), plinth, top box ---- */
  out.push(makeHandle({
    id: 'h:total', kind: 'height', dir: 'up', at: { u: L / 2, y: top }, value: design.dims.h, min: dr.h[0], max: dr.h[1], step: 10, snap: snapList(dr.h[0], dr.h[1], [], [2000, 2100, 2200, 2400, 2600, 2700, 3000]),
    group: 'overall', level: 1, label: T('Overall height', 'الارتفاع الكلي'), tip: T('Drag up / down: overall closet height', 'اسحب لأعلى/لأسفل: الارتفاع الكلي للخزانة'),
    reasons: { min: T(`Lowest closet is ${dr.h[0]} mm`, `أقل ارتفاع ${dr.h[0]} مم`), max: T(`Highest closet is ${dr.h[1]} mm`, `أعلى ارتفاع ${dr.h[1]} مم`) },
    apply: (v) => { const h = clamp(Math.round(v), dr.h[0], dr.h[1]); return { next: { ...design, dims: { ...design.dims, h } }, value: h, clamped: h !== Math.round(v) }; },
  }));
  const part = (key, id, label, tip, at, extra = {}) => {
    const f = WFIELD[key];
    out.push(makeHandle({
      id, kind: 'height', dir: extra.dir || 'up', at, value: x[key], min: f.min, max: f.max, step: f.step >= 1 ? f.step : 1, snap: extra.snap || [], group: 'overall', level: 1, label, tip,
      reasons: { min: T(`Minimum ${f.min} mm`, `الحد الأدنى ${f.min} مم`), max: T(`Maximum ${f.max} mm`, `الحد الأقصى ${f.max} مم`) },
      apply: (v) => { const r = setHeightPart(design, key, Math.round(v)); return { next: r.design, value: r.value, clamped: !!r.clamped }; },
    }));
  };
  part('plinthH', 'g:plinthH', T('Plinth height', 'ارتفاع القاعدة'), T('Drag up / down: plinth height', 'اسحب لأعلى/لأسفل: ارتفاع القاعدة'), { u: flip ? L : 0, y: x.plinthH }, { snap: [60, 80, 100, 120, 150] });
  part('topBoxH', 'g:topBoxH', T('Top box height', 'ارتفاع الصندوق العلوي'), T('Drag down from the top: top box (loft) height', 'اسحب لأسفل من الأعلى: ارتفاع الصندوق العلوي'), { u: L * 0.18, y: top - (scene.wd ? scene.wd.topBoxH : 0) }, { dir: 'down', snap: [0, 300, 400, 500, 600] });

  /* ---- column dividers (level 1) + the columns' own members ---- */
  const vis = units.filter((q) => idxOf(q.unit.id) >= 0).sort((a, b) => a.fu0 - b.fu0);
  const widths = mods.map((m) => m.width);
  vis.forEach((q, n) => {
    const i = idxOf(q.unit.id); const m = mods[i];
    const lastVisible = isMain ? n === vis.length - 1 : false;
    const edgeU = flip ? q.fu0 : q.fu0 + q.W;
    const lbl = `${isMain ? 'Column' : 'Return column'} ${i + 1}`; const lblAr = `${isMain ? 'العمود' : 'عمود الجناح'} ${i + 1}`;
    if (!(isMain && lastVisible)) {
      /* the width this column can really take (keep-total: its neighbours stay inside 200-1200 mm; pinned columns never move): setColumnWidth's own answer */
      const effW = (t) => { const r = isMain ? setColumnWidth(mods, i, t, x.keepW) : setColumnWidth(mods, i, t, x.wing.keep, WING_TOTAL_W); return r.mods[i].width; };
      const cLo = Math.min(m.width, effW(COL_W.min)); const cHi = Math.max(m.width, effW(COL_W.max));
      out.push(makeHandle({
        id: `col:${q.unit.id}:w`, unitId: q.unit.id, kind: 'split', dir: flip ? 'left' : 'right', at: { u: edgeU, y: body0 + (top - body0) * 0.45 }, value: m.width, min: cLo, max: cHi, step: 10,
        snap: snapList(cLo, cHi, widths.filter((_, j) => j !== i), [400, 500, 600, 700, 800, 900, 1000]), group: 'unit', level: 1,
        label: T(`${lbl} width`, `عرض ${lblAr}`), tip: T('Drag left / right: column width (the divider)', 'اسحب يمينًا/يسارًا: عرض العمود (الفاصل)'),
        reasons: { min: T(`Narrowest column is ${COL_W.min} mm`, `أضيق عمود ${COL_W.min} مم`), max: T(`Widest column is ${COL_W.max} mm`, `أعرض عمود ${COL_W.max} مم`) },
        apply: (v) => {
          const next = isMain ? editColWidth(design, i, v) : editWingColWidth(design, i, v);
          const nm = next ? (isMain ? next.mods : next.x.wing.mods)[i].width : m.width;
          return { next, value: nm, clamped: !next || nm !== Math.round(v) };
        },
      }));
    }
    const col = cols.find((c) => c.unitId === q.unit.id);
    if (!col) return;
    const sel = !!(selected && selected.unitId === q.unit.id);
    const lv = sel ? 1 : 2;
    const pc = isMain ? 'm' : 'w';
    const t = x.board; const zoneUnit = q.fu0 + Math.min(60, q.W * 0.2);
    /* rail height (from the floor) */
    const rail = (scene.props || []).filter((p) => p.kind === 'rail' && p.unitId === q.unit.id).sort((a, b) => b.box.y0 - a.box.y0)[0];
    if (rail && col.hang > 0) {
      const botY = col.inside ? q.y0 + col.zoneH.drawers + t / 2 : q.bounds.length - (col.topBox > 0 ? 1 : 0) === 1 ? q.y0 + t : q.bounds[col.topBox > 0 ? 1 : 0].bot + t / 2;
      const hz = botY + col.hang; const maxR = Math.round(hz - x.railDrop); const minR = Math.round(botY + x.railDia);
      out.push(makeHandle({
        id: `col:${q.unit.id}:rail`, unitId: q.unit.id, kind: 'position', dir: 'up', at: { u: q.fu0 + q.W / 2, y: (rail.box.y0 + rail.box.y1) / 2 }, value: Math.round((rail.box.y0 + rail.box.y1) / 2), min: minR, max: Math.max(minR, maxR), step: 10, snap: [], group: 'member', level: few ? 1 : lv,
        label: T(`${lbl} rail height`, `ارتفاع ماسورة ${lblAr}`), tip: T('Drag up / down: hanging rail height from the floor', 'اسحب لأعلى/لأسفل: ارتفاع ماسورة التعليق من الأرض'),
        reasons: { min: T('The rail needs room above the zone floor', 'تحتاج الماسورة مساحة فوق أرضية المنطقة'), max: T(`The rail drops ${x.railDrop} mm below the top of its zone`, `تنزل الماسورة ${x.railDrop} مم تحت أعلى المنطقة`) },
        apply: (v) => { const r = clamp(Math.round(v), minR, Math.max(minR, maxR)); return { next: patchColumn(design, pc, i, { railH: r }), value: r, clamped: r !== Math.round(v) }; },
      }));
    }
    /* drawers: zone height (drag the zone's top edge; one drawer's height changes by 1/n of the travel) + the count */
    if (m.drawers > 0) {
      const yz = q.y0 + col.zoneH.drawers; const dH = col.drawerH || DRAWER_H;
      out.push(makeHandle({
        id: `col:${q.unit.id}:drawerH`, unitId: q.unit.id, kind: 'height', dir: 'up', ratio: 1 / m.drawers, at: { u: q.fu0 + q.W * 0.72, y: yz }, value: dH, min: DRAWER_H_RANGE.min, max: DRAWER_H_RANGE.max, step: 10, snap: [180, 200, 220, 250, 300], group: 'member', level: few ? 1 : lv,
        label: T(`${lbl} drawer height`, `ارتفاع أدراج ${lblAr}`), tip: T('Drag up / down: height of each drawer', 'اسحب لأعلى/لأسفل: ارتفاع كل درج'),
        reasons: { min: T(`Drawers are at least ${DRAWER_H_RANGE.min} mm high`, `أقل ارتفاع للدرج ${DRAWER_H_RANGE.min} مم`), max: T(`Drawers are at most ${DRAWER_H_RANGE.max} mm high`, `أعلى ارتفاع للدرج ${DRAWER_H_RANGE.max} مم`) },
        apply: (v) => { const h = clamp(Math.round(v), DRAWER_H_RANGE.min, DRAWER_H_RANGE.max); return { next: patchColumn(design, pc, i, { drawerH: h }), value: h, clamped: h !== Math.round(v) }; },
      }));
      out.push(makeHandle({
        id: `col:${q.unit.id}:drawers`, unitId: q.unit.id, kind: 'count', dir: 'up', pitch: Math.max(60, dH * 0.9), at: { u: zoneUnit, y: q.y0 + col.zoneH.drawers / 2 }, value: m.drawers, min: 1, max: 6, step: 1, group: 'count', level: 2, unit: '',
        label: T(`${lbl} drawers`, `أدراج ${lblAr}`), tip: T('Drag up / down: number of drawers', 'اسحب لأعلى/لأسفل: عدد الأدراج'), reasons: { min: T('At least 1 drawer (use the zone type to remove)', 'درج واحد على الأقل'), max: T('At most 6 drawers', 'ستة أدراج على الأكثر') },
        apply: (v) => { const n = clamp(Math.round(v), 1, 6); return { next: patchColumn(design, pc, i, { drawers: n }), value: n, clamped: n !== Math.round(v) }; },
      }));
    }
    /* shelves: the count, at the topmost shelf */
    const shelvesP = scene.parts.filter((p) => p.unitId === q.unit.id && p.kind === 'shelf');
    if (m.shelves > 0 && shelvesP.length) {
      const yTop = Math.max(...shelvesP.map((p) => (p.box.y0 + p.box.y1) / 2));
      out.push(makeHandle({
        id: `col:${q.unit.id}:shelves`, unitId: q.unit.id, kind: 'count', dir: 'up', pitch: 90, at: { u: zoneUnit, y: yTop }, value: m.shelves, min: 1, max: 8, step: 1, group: 'count', level: 2, unit: '',
        label: T(`${lbl} shelves`, `رفوف ${lblAr}`), tip: T('Drag up / down: number of shelves', 'اسحب لأعلى/لأسفل: عدد الرفوف'), reasons: { min: T('At least 1 shelf (use the zone type to remove)', 'رف واحد على الأقل'), max: T('At most 8 shelves', 'ثمانية رفوف على الأكثر') },
        apply: (v) => { const n = clamp(Math.round(v), 1, 8); return { next: patchColumn(design, pc, i, { shelves: n }), value: n, clamped: n !== Math.round(v) }; },
      }));
    }
  });
  void normalizeMod; void clampField; void RI; void STD_WIDTHS;
  return out;
}
