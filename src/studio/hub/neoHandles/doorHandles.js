/* =============================================================================
 * [NEO-HANDLES-UX36] Neo Doors Designer handles (the elevation "seen from outside" and the plan section). PURE.
 * Coordinates are the drawing's own millimetres: x from the opening's centre, y up from the floor (elevation) / z from the wall centre, outside = +z (plan).
 * Every apply(v) writes ONE design path (the studio's `set(path, v)`: setIn + normalizeDesign, which clamps to RANGES), so a drag and the panel field agree:
 *   opening width / height (the opening is centred, so the pill moves half as far as the value: ratio 2 for the width), leaf gaps (head / floor / side),
 *   stile / top rail / bottom rail / mid rail / muntin widths, panel columns and rows, glazing bars, hinge heights + count, handle height, vision panel size and height,
 *   and, in the plan, the wall thickness.
 * ===========================================================================*/
import { RANGES, normalizeDesign, construction } from '../neoDoors/doorModel';
import { makeHandle, T } from './handleModel';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const setIn = (o, path, v) => { const ks = path.split('.'); const out = { ...o }; let c = out; for (let i = 0; i < ks.length - 1; i++) { c[ks[i]] = { ...c[ks[i]] }; c = c[ks[i]]; } c[ks[ks.length - 1]] = v; return out; };
const getIn = (o, path) => path.split('.').reduce((c, k) => (c == null ? c : c[k]), o);

/** one design path as a handle: value / range from the model, apply = setIn + normalizeDesign (the same clamp the studio's commit does) */
function field(d, { id, path, range, dir, at, label, tip, ratio, kind = 'position', step = 10, snap = [], level = 1, group = 'unit', unit = 'mm', min, max, pitch, reasons, unitId }) {
  const lo = min !== undefined ? min : range[0]; const hi = max !== undefined ? max : range[1];
  return makeHandle({
    id, unitId, kind, dir, at, value: getIn(d, path), min: lo, max: hi, step, snap: snap.filter((s) => s >= lo && s <= hi), ratio, pitch, group, level, unit,
    label, tip, reasons: reasons || { min: T(`Minimum ${lo} ${unit || ''}`.trim(), `الحد الأدنى ${lo}`), max: T(`Maximum ${hi} ${unit || ''}`.trim(), `الحد الأقصى ${hi}`) },
    apply: (v) => { const n = Math.round(v * 10) / 10; const next = normalizeDesign(setIn(d, path, kind === 'count' ? Math.round(v) : (step >= 1 ? Math.round(n) : n))); return { next, value: getIn(next, path), clamped: getIn(next, path) !== n }; },
  });
}

/** @param {{ W: object (buildDoor), d: design, view: 'elev'|'plan', selected?: object }} o */
export function doorHandles({ W, d, view = 'elev', selected = null }) {
  const S = W.S; const out = []; const k = construction(d);
  const arch = d.frame.arch.on ? d.frame.arch.w + d.frame.arch.reveal : 0;
  if (view === 'plan') {
    out.push(field(d, { id: 'door:ow', path: 'opening.w', range: RANGES.ow, dir: 'right', ratio: 2, at: { u: S.OW / 2, y: S.wall / 2 }, kind: 'width', snap: [700, 762, 800, 826, 900, 1000, 1200, 1500, 1800], label: T('Opening width', 'عرض الفتحة'), tip: T('Drag left / right: opening width (centred)', 'اسحب يمينًا/يسارًا: عرض الفتحة (متمركز)'), group: 'overall' }));
    out.push(field(d, { id: 'door:wall', path: 'opening.wall', range: RANGES.wall, dir: 'down', ratio: 2, at: { u: -(S.OW / 2 + W.scene.wall.ext * 0.55), y: S.wall / 2 }, kind: 'depth', step: 10, snap: [100, 150, 200, 250], label: T('Wall thickness', 'سماكة الجدار'), tip: T('Drag up / down: wall thickness', 'اسحب لأعلى/لأسفل: سماكة الجدار'), group: 'overall' }));
    return out;
  }
  const lf0 = W.leaves[0]; const lf = lf0;
  const parts = W.scene.parts.filter((p) => p.leaf === 0);
  const abs = (b) => ({ x0: lf.x0 + b.x0, x1: lf.x0 + b.x1, y0: lf.y0 + b.y0, y1: lf.y0 + b.y1 });
  const boxesOf = (kind) => parts.filter((p) => p.kind === kind).flatMap((p) => p.boxes.map(abs));

  /* ---- the opening ---- */
  out.push(field(d, { id: 'door:ow', path: 'opening.w', range: RANGES.ow, dir: 'right', ratio: 2, at: { u: S.OW / 2 + arch, y: S.OH * 0.55 }, kind: 'width', snap: [700, 762, 800, 826, 900, 1000, 1200, 1500, 1800], label: T('Opening width', 'عرض الفتحة'), tip: T('Drag left / right: opening width (centred)', 'اسحب يمينًا/يسارًا: عرض الفتحة (متمركز)'), group: 'overall' }));
  out.push(field(d, { id: 'door:oh', path: 'opening.h', range: RANGES.oh, dir: 'up', at: { u: -S.OW * 0.28, y: S.OH + arch }, kind: 'height', snap: [2000, 2040, 2100, 2200, 2400, 2700], label: T('Opening height', 'ارتفاع الفتحة'), tip: T('Drag up / down: opening height', 'اسحب لأعلى/لأسفل: ارتفاع الفتحة'), group: 'overall' }));

  /* ---- the leaf gaps ---- */
  if (!S.slides) {
    out.push(field(d, { id: 'door:head', path: 'clear.head', range: RANGES.head, dir: 'down', at: { u: lf.x0 + lf.w * 0.28, y: lf.y0 + lf.h }, kind: 'depth', step: 1, label: T('Head gap', 'فجوة الرأس'), tip: T('Drag down: gap above the leaf', 'اسحب لأسفل: الفجوة فوق الضلفة'), group: 'unit' }));
    const floorPath = d.vent.mode === 'undercut' ? 'vent.gap' : 'clear.floor'; const floorRange = d.vent.mode === 'undercut' ? RANGES.ventGap : RANGES.floor;
    out.push(field(d, { id: 'door:floor', path: floorPath, range: floorRange, dir: 'up', at: { u: lf.x0 + lf.w * 0.28, y: lf.y0 }, kind: 'depth', step: 1, label: T(d.vent.mode === 'undercut' ? 'Undercut gap' : 'Floor gap', d.vent.mode === 'undercut' ? 'فجوة القص السفلي' : 'فجوة الأرضية'), tip: T('Drag up: gap under the leaf', 'اسحب لأعلى: الفجوة تحت الضلفة'), group: 'unit' }));
    const lockLeft = lf.lockSide === 'left';
    out.push(field(d, { id: 'door:side', path: 'clear.side', range: RANGES.side, dir: lockLeft ? 'right' : 'left', at: { u: lockLeft ? lf.x0 : lf.x0 + lf.w, y: lf.y0 + lf.h * 0.18 }, kind: 'depth', step: 1, label: T('Side gap', 'الفجوة الجانبية'), tip: T('Drag inwards: gap beside the leaf', 'اسحب للداخل: الفجوة بجانب الضلفة'), group: 'unit' }));
  }

  /* ---- stiles, rails, muntins, panel counts (panel / moulded / glazed constructions) ---- */
  if (k === 'panel' || k === 'moulded' || k === 'glazed') {
    const stiles = boxesOf('stile').sort((a, b) => a.x0 - b.x0); const rails = boxesOf('rail').sort((a, b) => b.y1 - a.y1); const mun = boxesOf('muntin').sort((a, b) => a.x0 - b.x0);
    if (stiles.length) { const s = stiles[0]; out.push(field(d, { id: 'door:stile', path: 'panels.stile', range: RANGES.stile, dir: 'right', at: { u: s.x1, y: lf.y0 + lf.h * 0.5 }, kind: 'width', snap: [90, 100, 110, 120, 140], label: T('Stile width', 'عرض العمود الجانبي'), tip: T('Drag left / right: stile width', 'اسحب يمينًا/يسارًا: عرض العمود الجانبي') })); }
    if (rails.length) {
      const top = rails[0]; const bot = rails[rails.length - 1];
      out.push(field(d, { id: 'door:topRail', path: 'panels.topRail', range: RANGES.topRail, dir: 'down', at: { u: lf.x0 + lf.w * 0.62, y: top.y0 }, kind: 'height', snap: [90, 110, 120, 140], label: T('Top rail height', 'ارتفاع الرافدة العلوية'), tip: T('Drag up / down: top rail', 'اسحب لأعلى/لأسفل: الرافدة العلوية') }));
      if (bot !== top) out.push(field(d, { id: 'door:bottomRail', path: 'panels.bottomRail', range: RANGES.bottomRail, dir: 'up', at: { u: lf.x0 + lf.w * 0.62, y: bot.y1 }, kind: 'height', snap: [150, 200, 250], label: T('Bottom rail height', 'ارتفاع الرافدة السفلية'), tip: T('Drag up / down: bottom rail', 'اسحب لأعلى/لأسفل: الرافدة السفلية') }));
      if (rails.length > 2 && d.panels.rows > 1) { const mid = rails[1]; out.push(field(d, { id: 'door:midRail', path: 'panels.midRail', range: RANGES.midRail, dir: 'up', ratio: 2, at: { u: lf.x0 + lf.w * 0.38, y: mid.y1 }, kind: 'height', snap: [90, 110, 120], label: T('Mid rail height', 'ارتفاع الرافدة الوسطى'), tip: T('Drag up / down: mid rail (centred)', 'اسحب لأعلى/لأسفل: الرافدة الوسطى') })); }
    }
    if (mun.length && d.panels.cols > 1) { const m = mun[0]; out.push(field(d, { id: 'door:muntin', path: 'panels.muntin', range: RANGES.muntin, dir: 'right', ratio: 2, at: { u: m.x1, y: lf.y0 + lf.h * 0.3 }, kind: 'width', snap: [60, 70, 90], label: T('Muntin width', 'عرض الفاصل الرأسي'), tip: T('Drag left / right: muntin width (centred)', 'اسحب يمينًا/يسارًا: عرض الفاصل') })); }
    if (k !== 'glazed') {
      out.push(field(d, { id: 'door:cols', path: 'panels.cols', range: RANGES.cols, dir: 'right', pitch: 90, kind: 'count', at: { u: lf.x0 + lf.w * 0.5, y: lf.y0 + lf.h - d.panels.topRail * 0.5 }, unit: '', step: 1, level: 2, group: 'count', label: T('Panel columns', 'أعمدة الألواح'), tip: T('Drag left / right: number of panel columns', 'اسحب يمينًا/يسارًا: عدد أعمدة الألواح') }));
      out.push(field(d, { id: 'door:rows', path: 'panels.rows', range: RANGES.rows, dir: 'up', pitch: 90, kind: 'count', at: { u: lf.x0 + d.panels.stile * 0.5, y: lf.y0 + lf.h * 0.5 }, unit: '', step: 1, level: 2, group: 'count', label: T('Panel rows', 'صفوف الألواح'), tip: T('Drag up / down: number of panel rows', 'اسحب لأعلى/لأسفل: عدد صفوف الألواح') }));
    } else {
      const gb = boxesOf('glass'); const g0 = gb[0];
      if (g0) {
        out.push(field(d, { id: 'door:barsV', path: 'glass.barsV', range: RANGES.barsV, dir: 'right', pitch: 70, kind: 'count', at: { u: (g0.x0 + g0.x1) / 2, y: g0.y1 }, unit: '', step: 1, level: 2, group: 'count', label: T('Vertical glazing bars', 'قواطع زجاج رأسية'), tip: T('Drag left / right: vertical glazing bars', 'اسحب يمينًا/يسارًا: القواطع الرأسية') }));
        out.push(field(d, { id: 'door:barsH', path: 'glass.barsH', range: RANGES.barsH, dir: 'up', pitch: 70, kind: 'count', at: { u: g0.x1, y: (g0.y0 + g0.y1) / 2 }, unit: '', step: 1, level: 2, group: 'count', label: T('Horizontal glazing bars', 'قواطع زجاج أفقية'), tip: T('Drag up / down: horizontal glazing bars', 'اسحب لأعلى/لأسفل: القواطع الأفقية') }));
      }
    }
  }

  /* ---- hinges ---- */
  if (!S.slides && W.scene.hingeYs.length > 1 && d.hinges.type !== 'pivot') {
    const ys = W.scene.hingeYs; const hx = lf.hingeSide === 'left' ? lf.x0 : lf.x0 + lf.w; const tY = Math.max(...ys); const bY = Math.min(...ys);
    out.push(field(d, { id: 'door:hingeTop', path: 'hinges.top', range: RANGES.hingeTop, dir: 'down', at: { u: hx, y: lf.y0 + tY }, kind: 'height', snap: [150, 200], label: T('Top hinge position', 'موضع المفصلة العلوية'), tip: T('Drag up / down: top hinge distance from the head', 'اسحب لأعلى/لأسفل: بعد المفصلة العلوية عن الرأس'), group: 'door' }));
    out.push(field(d, { id: 'door:hingeBottom', path: 'hinges.bottom', range: RANGES.hingeBot, dir: 'up', at: { u: hx, y: lf.y0 + bY }, kind: 'height', snap: [225, 250, 300], label: T('Bottom hinge position', 'موضع المفصلة السفلية'), tip: T('Drag up / down: bottom hinge distance from the foot', 'اسحب لأعلى/لأسفل: بعد المفصلة السفلية عن القدم'), group: 'door' }));
    out.push(makeHandle({
      id: 'door:hingeCount', kind: 'count', dir: 'up', pitch: 90, at: { u: hx, y: lf.y0 + (tY + bY) / 2 }, value: W.scene.hingeYs.length, min: RANGES.hingeCount[0], max: RANGES.hingeCount[1], step: 1, group: 'count', level: 2, unit: '',
      label: T('Hinges', 'المفصلات'), tip: T('Drag up / down: number of hinges (fixes the automatic count)', 'اسحب لأعلى/لأسفل: عدد المفصلات'), reasons: { min: T('At least 2 hinges', 'مفصلتان على الأقل'), max: T('At most 5 hinges', 'خمس مفصلات على الأكثر') },
      apply: (v) => { const n = clamp(Math.round(v), RANGES.hingeCount[0], RANGES.hingeCount[1]); const next = normalizeDesign(setIn(d, 'hinges.count', n)); return { next, value: next.hinges.count, clamped: n !== Math.round(v) }; },
    }));
  }

  /* ---- handle height (from the floor) ---- */
  const hp = parts.find((p) => p.kind === 'handle');
  if (d.lock.on && hp) {
    const b = abs(hp.boxes[0]);
    out.push(field(d, { id: 'door:handleH', path: 'lock.handleH', range: RANGES.handleH, dir: 'up', at: { u: (b.x0 + b.x1) / 2, y: d.lock.handleH }, kind: 'height', snap: [900, 950, 1000, 1050, 1100], label: T('Handle height', 'ارتفاع المقبض'), tip: T('Drag up / down: handle height from the floor', 'اسحب لأعلى/لأسفل: ارتفاع المقبض عن الأرض'), group: 'door' }));
  }

  /* ---- the vision panel (flush / moulded doors) ---- */
  const vis = W.scene.apertures && W.scene.apertures.vision;
  if (vis) {
    out.push(field(d, { id: 'door:vh', path: 'glass.vh', range: RANGES.vh, dir: 'up', ratio: 2, at: { u: lf.x0 + (vis.x0 + vis.x1) / 2, y: lf.y0 + vis.y1 }, kind: 'height', snap: [400, 600, 800], label: T('Vision panel height', 'ارتفاع زجاج الرؤية'), tip: T('Drag up / down: vision panel height (centred)', 'اسحب لأعلى/لأسفل: ارتفاع زجاج الرؤية'), group: 'door' }));
    out.push(field(d, { id: 'door:vw', path: 'glass.vw', range: RANGES.vw, dir: 'right', ratio: 2, at: { u: lf.x0 + vis.x1, y: lf.y0 + (vis.y0 + vis.y1) / 2 }, kind: 'width', snap: [150, 200, 250, 300], label: T('Vision panel width', 'عرض زجاج الرؤية'), tip: T('Drag left / right: vision panel width (centred)', 'اسحب يمينًا/يسارًا: عرض زجاج الرؤية'), group: 'door' }));
    out.push(field(d, { id: 'door:vcy', path: 'glass.vcy', range: RANGES.vcy, dir: 'up', at: { u: lf.x0 + vis.x0, y: lf.y0 + (vis.y0 + vis.y1) / 2 }, kind: 'position', snap: [1200, 1400, 1500, 1600], label: T('Vision panel centre height', 'ارتفاع مركز زجاج الرؤية'), tip: T('Drag up / down: move the vision panel', 'اسحب لأعلى/لأسفل: تحريك زجاج الرؤية'), group: 'door' }));
  }
  void selected;
  return out;
}
