/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - geometry: solved parts -> ONE scene that every view reads.
 *
 * The scene has the SAME SHAPE as a Neo Kitchen scene (a single run "main", parts as boxes in (u = x, y, d = z), hinge / handle lists), so the Neo
 * components that draw and export a scene run unchanged: Kitchen3D (3D, X-Ray, Explode, Open, Look, camera), the OBJ / STL / 3DM / xlsx / PDF /
 * DXF-plan writers, OpenControl and the part map. The 2D technical drawing (CustomDrawing.jsx) reads the same `scene.parts`.
 * A scene part carries `unitId` = the DESIGN part it came from, so a click in 3D, a click in the drawing and the Parts list are the same selection.
 * Composite parts expand here: a drawer becomes front + 2 sides + box front + box back + bottom (kitchen-proven dimensions), a hinged door gets its
 * hinge cups and handle. Nothing in this file is drawn; it is plain data.
 * ===========================================================================*/
import { makeInitial } from '../neoKitchen/model';
import { MFG } from '../neoKitchen/constants';
import { matSlots, paintGroupOfKind } from '../neoKitchen/materials';
import { solve } from './customSolve';
import {
  SLOT, HW, numbering, partName, treeOrder, getPart, AUTO_NAME, AXES,
} from './customModel';

const r2 = (v) => Math.round(v * 100) / 100;
const CORNER_EN = { tl: 'top-left', tr: 'top-right', bl: 'bottom-left', br: 'bottom-right' };
export const CORNER_AR = { tl: 'أعلى اليسار', tr: 'أعلى اليمين', bl: 'أسفل اليسار', br: 'أسفل اليمين' };
const ALL_EDGES = ['L1', 'L2', 'W1', 'W2'];

/** the kitchen-shaped model the shared Neo components read (title, finish, Look paint, production names, handle style, global board values) */
export function kitchenModelOf(design) {
  const base = makeInitial();
  const empty = () => ({ base: [], wall: [], top: [] });
  const g = design.g;
  return {
    ...base, title: design.title,
    g: { ...base.g, board: g.board, back: g.back, doorThk: g.doorThk, doorGap: g.doorGap, drawerGap: g.drawerGap, drawerSide: g.drawerSide, edgeBand: g.edgeBand },
    runs: { main: empty(), left: empty(), right: empty() },
    topOn: false, finish: design.finishKey, counter: 'marble', handle: design.x.handle,
    led: { ...base.led, strip: false }, bottomCover: false,
    paint: design.x.paint, mats: design.x.mats, matMap: design.x.matMap,
    customLabel: [design.title, design.title],
  };
}

const hingeYs = (yb, yt) => {
  const h = yt - yb; const n = h <= 900 ? 2 : h <= 1500 ? 3 : h <= 2000 ? 4 : 5;
  const a = yb + MFG.hingeEnd; const b = yt - MFG.hingeEnd;
  return Array.from({ length: n }, (_, i) => r2(a + ((b - a) * i) / (n - 1)));
};

/** the BOM material class of a part */
export function classOf(part) {
  if (part.type === 'frame') return 'Timber';
  if (part.type === 'glass') return 'Glass';
  return (SLOT[part.mat] && SLOT[part.mat].cls) || 'Carcass';
}
const ptypeOf = (part) => {
  switch (part.type) {
    case 'shelf': return 'shelf';
    case 'frame': return part.mat === 'plinth' ? 'plinth' : 'wallUnit';
    case 'door': return part.mode === 'flip' ? 'flip' : part.mode === 'fixed' ? 'cover' : 'door';
    case 'glass': return 'glass';
    case 'back': return 'open';
    case 'drawer': return 'drawer';
    case 'hardware': return 'cover';
    default: return part.mat === 'plinth' ? 'plinth' : part.mat === 'countertop' ? 'counter' : part.mat === 'shelves' ? 'shelf' : part.mat === 'baseDoors' ? 'door' : 'baseUnit';
  }
};
const viewOf = (part) => (part.type === 'door' || part.type === 'glass' || part.type === 'drawer' ? 'front' : part.type === 'back' || part.type === 'shelf' ? 'internal' : 'carcass');

/** the nearest ancestor group name ('' for a root part) */
function groupNames(design) {
  const m = new Map();
  design.parts.forEach((p) => {
    let c = p.parent; let name = '';
    while (c) { const q = getPart(design, c); if (!q) break; name = partName(design, q); break; }
    m.set(p.id, name);
  });
  return m;
}

/* ---- cut-out notes ---------------------------------------------------------------------------------------------- */
export function cutNotes(cuts) {
  const en = []; const ar = [];
  (cuts || []).forEach((c) => {
    if (c.k === 'notch') { en.push(`Notch ${c.w} x ${c.h} at ${CORNER_EN[c.c]}`); ar.push(`شق ${c.w} × ${c.h} عند ${CORNER_AR[c.c]}`); }
    else if (c.k === 'radius') { en.push(`Radius R${c.r} at ${CORNER_EN[c.c]}`); ar.push(`تدوير R${c.r} عند ${CORNER_AR[c.c]}`); }
    else { en.push(`Hole D${c.d} at ${c.x}, ${c.y}`); ar.push(`ثقب قطر ${c.d} عند ${c.x}، ${c.y}`); }
  });
  return { en: en.join('; '), ar: ar.join('؛ ') };
}

/**
 * @returns the scene (see header) with extra fields: product 'custom', solved, numbering, mapRects, hardwareExtra
 */
export function buildScene(design, solvedIn) {
  const solved = solvedIn || solve(design);
  const model = kitchenModelOf(design);
  const g = design.g;
  const nm = numbering(design);
  const gname = groupNames(design);
  const parts = []; const hinges = []; const handles = [];
  let runners = 0;

  solved.items.forEach((it) => {
    const p = it.part;
    if (p.type === 'group') return;
    const b = it.box;
    const box = { u0: b.x0, u1: b.x1, y0: b.y0, y1: b.y1, d0: b.z0, d1: b.z1 };
    const W = r2(b.x1 - b.x0); const H = r2(b.y1 - b.y0); const D = r2(b.z1 - b.z0);
    const label = partName(design, p, 'en'); const labelAr = partName(design, p, 'ar');
    const grp = gname.get(p.id) || '';
    const slot = SLOT[p.type === 'glass' ? 'glass' : p.mat] || SLOT.structure;
    const add = (o, suffix, names) => {
      const bx = o.box;
      const part = {
        id: suffix ? `${it.id}#${suffix}` : it.id, unitId: it.base, baseId: it.base, instance: it.i, no: nm.get(it.base), runKey: 'main', row: 'base', group: grp, qty: 1, grain: 'auto', edges: [], note: '', noteAr: '',
        product: 'custom', name: (names && names[0]) || label, nameAr: (names && names[1]) || labelAr, eb: p.eb, cuts: [], ...o,
        ext: { w: r2(bx.u1 - bx.u0), d: r2(bx.d1 - bx.d0), h: r2(bx.y1 - bx.y0) },
      };
      parts.push(part); return part;
    };
    const cutInfo = cutNotes(p.cuts);
    const flat = { cuts: p.cuts, note: cutInfo.en, noteAr: cutInfo.ar };
    const common = { mat: classOf(p), ptype: ptypeOf(p), view: viewOf(p), box, sec: p.type, fix: p.fix };

    switch (p.type) {
      case 'panel': case 'shelf': case 'back': case 'glass': {
        const kind = p.type === 'glass' ? 'glass' : slot.kind || 'side';
        add({ ...common, ...flat, kind, ...(p.type === 'glass' ? { pane: true } : null), ...(p.type === 'shelf' && p.fix === 'adjustable' ? { fixed: false } : p.type === 'shelf' ? { fixed: true } : null) });
        break;
      }
      case 'frame': {
        const round = p.sec === 'round';
        const axis = H >= W && H >= D ? 'y' : W >= D ? 'u' : 'd';
        const dia = r2(Math.min(...[W, D, H].filter((_, i) => (axis === 'y' ? i !== 2 : axis === 'u' ? i !== 0 : i !== 1))));
        add({ ...common, kind: slot.kind || 'side', ...(round ? { round: true, axis, note: `Round D${dia}`, noteAr: `دائري قطر ${dia}` } : { note: 'Rectangular section', noteAr: 'مقطع مستطيل' }), frameMember: true });
        break;
      }
      case 'door': {
        const hingeSide = p.hinge === 'L' ? 'L' : 'R';
        const isFlip = p.mode === 'flip';
        const fixed = p.mode === 'fixed';
        const an = fixed ? null : isFlip ? { k: 'flip', pivotY: b.y1, pivotD: b.z0 } : { k: 'door', side: hingeSide, pivotU: hingeSide === 'L' ? b.x0 : b.x1, pivotD: b.z0 };
        const part = add({ ...common, ...flat, kind: 'door', anim: an, edges: [], grainFront: 'auto' });
        const hs = design.x.handle; const hstyle = p.handle === 'auto' ? hs.style : p.handle;
        if (!fixed) {
          const cupEdge = 5; const cupD = 35;
          if (isFlip) {
            [0.2, 0.8].forEach((f) => hinges.push({ partId: part.id, unitId: it.base, u: r2(b.x0 + (b.x1 - b.x0) * f), y: r2(b.y1 - cupEdge - cupD / 2), d: b.z1, r: cupD / 2, side: 'T', sideU: f < 0.5 ? b.x0 : b.x1, flip: true }));
          } else {
            const cx = hingeSide === 'L' ? b.x0 + cupEdge + cupD / 2 : b.x1 - cupEdge - cupD / 2;
            hingeYs(b.y0, b.y1).forEach((hy) => hinges.push({ partId: part.id, unitId: it.base, u: r2(cx), y: hy, d: b.z1, r: cupD / 2, side: hingeSide, sideU: hingeSide === 'L' ? b.x0 : b.x1 }));
          }
        }
        if (hstyle !== 'none' && hstyle !== 'push') {
          const len = hs.len; const tall = H > 1000;
          if (isFlip) {
            const hy = b.y0 + 40; const hu = (b.x0 + b.x1) / 2;
            handles.push({ partId: part.id, unitId: it.base, style: hstyle, len, u: hu, y: hy, orient: 'h', holes: hstyle === 'bar' ? [[hu - len / 2, hy], [hu + len / 2, hy]] : hstyle === 'knob' ? [[hu, hy]] : [], d: b.z1 });
          } else {
            const hu = hingeSide === 'L' ? b.x1 - MFG.handleEdge : b.x0 + MFG.handleEdge;
            const mode = hs.pos === 'auto' ? (tall ? 'center' : 'top') : hs.pos;
            const l2 = hstyle === 'knob' ? 20 : len;
            const hy = H < l2 + 120 || mode === 'center' ? (b.y0 + b.y1) / 2 : mode === 'top' ? b.y1 - 60 - l2 / 2 : b.y0 + 60 + l2 / 2;
            handles.push({ partId: part.id, unitId: it.base, style: hstyle, len, u: hu, y: hy, orient: 'v', holes: hstyle === 'bar' ? [[hu, hy - len / 2], [hu, hy + len / 2]] : hstyle === 'knob' ? [[hu, hy]] : [], d: b.z1 });
          }
        }
        break;
      }
      case 'drawer': {
        const gap = g.drawerGap; const dt = Math.min(g.doorThk, D - 40);
        const fb = { u0: b.x0 + g.doorGap, u1: b.x1 - g.doorGap, y0: b.y0 + gap / 2, y1: b.y1 - gap / 2, d0: b.z1 - dt, d1: b.z1 };
        const avail = D - dt - 10;
        const rl = MFG.runnerLens.filter((l) => l <= avail).pop() || MFG.runnerLens[0];
        const slide = rl * 0.7; const an = { k: 'drawer', slide };
        const front = add({ ...common, ...flat, kind: 'drawerFront', mat: 'Door', ptype: 'drawer', view: 'front', box: fb, anim: an, grainFront: 'auto' }, 'f', [`${label} front`, `واجهة ${labelAr}`]);
        const hs = design.x.handle; const hstyle = p.handle === 'auto' ? hs.style : p.handle;
        if (hstyle !== 'none' && hstyle !== 'push') {
          const hu = (fb.u0 + fb.u1) / 2; const hy = fb.y1 - 40; const len = hs.len;
          handles.push({ partId: front.id, unitId: it.base, style: hstyle, len, u: hu, y: hy, orient: 'h', holes: hstyle === 'bar' ? [[hu - len / 2, hy], [hu + len / 2, hy]] : hstyle === 'knob' ? [[hu, hy]] : [], d: b.z1 });
        }
        const fh = fb.y1 - fb.y0; const hb = Math.max(60, fh - MFG.boxClearV); const by0 = fb.y0 + 20; const by1 = by0 + hb;
        const bu0 = b.x0 + g.drawerSide; const bu1 = b.x1 - g.drawerSide; const bt = MFG.boxThk;
        const zf = b.z1 - dt; const zb = zf - rl;
        const bm = { mat: 'Drawer', ptype: 'drawer', view: 'internal', anim: an, kind: 'drawerBox', fix: 'drawer' };
        add({ ...bm, box: { u0: bu0, u1: bu0 + bt, y0: by0, y1: by1, d0: zb, d1: zf }, edges: [{ axis: 'd', where: 'top' }], eb: ['L1'] }, 's1', [`${label} side`, `جانب ${labelAr}`]);
        add({ ...bm, box: { u0: bu1 - bt, u1: bu1, y0: by0, y1: by1, d0: zb, d1: zf }, edges: [{ axis: 'd', where: 'top' }], eb: ['L1'] }, 's2', [`${label} side`, `جانب ${labelAr}`]);
        add({ ...bm, box: { u0: bu0 + bt, u1: bu1 - bt, y0: by0, y1: by1, d0: zf - bt, d1: zf }, eb: [] }, 'bf', [`${label} box front`, `أمام صندوق ${labelAr}`]);
        add({ ...bm, box: { u0: bu0 + bt, u1: bu1 - bt, y0: by0, y1: by1 - 20, d0: zb, d1: zb + bt }, eb: [] }, 'bb', [`${label} box back`, `خلف صندوق ${labelAr}`]);
        add({ ...bm, box: { u0: bu0 + bt - 8, u1: bu1 - bt + 8, y0: by0 + g.drawerBottom, y1: by0 + g.drawerBottom + g.back, d0: zb + bt - 8, d1: zf - bt + 8 }, eb: [], note: `Bottom groove: ${g.back}mm wide x 8mm deep @ ${g.drawerBottom}mm above the box edge`, noteAr: `مجرى القاع: عرض ${g.back} مم × عمق 8 مم عند ${g.drawerBottom} مم فوق حافة الصندوق` }, 'bt', [`${label} bottom`, `قاع ${labelAr}`]);
        runners += 1;
        break;
      }
      case 'hardware': {
        const key = p.hw;
        add({ ...common, kind: 'hw', mat: 'Carcass', ptype: 'cover', view: 'internal', hw: true, hwKey: key, round: key === 'foot' || key === 'castor', axis: 'y' });
        break;
      }
      default: break;
    }
  });

  const bs = solved.bounds;
  const Wm = Math.max(design.dims.w, bs.x1); const Dm = Math.max(design.dims.d, bs.z1); const Hm = Math.max(design.dims.h, bs.y1);
  const run = { key: 'main', L: Wm, D: Dm, flip: false, wallH: 0, hasTop: false, off: 0, wallEnd: 0, hiddenBase: 0, hiddenWall: 0, units: [], counters: [], splashes: [], plinth: null, label: 'Main' };
  const scene = {
    product: 'custom', runs: [run], parts, hinges, handles, pins: [], joints: [], appliances: [], cutouts: [], leds: [], props: [], warns: [], hardwareExtra: { runners, poles: 0 },
    bounds: { x0: 0, x1: Wm, z0: 0, z1: Dm, h: Hm }, model, solved, numbering: nm,
  };
  scene.mapRects = frontRects(scene, design);
  return scene;
}

/* ---- the part map (M&S hover highlight): front-view rectangles of every design part ------------------------------ */
function frontRects(scene, design) {
  const seen = new Set(); const rects = [];
  scene.parts.forEach((p) => {
    if (p.hw || seen.has(p.baseId)) return;
    const base = getPart(design, p.baseId);
    const front = p.kind === 'drawerFront' || p.kind === 'door' || p.kind === 'glass';
    const sub = scene.parts.filter((q) => q.baseId === p.baseId);
    if (base && base.type === 'drawer') {
      const fp = sub.find((q) => q.kind === 'drawerFront'); if (!fp) return;
      seen.add(p.baseId);
      rects.push({ id: `main:${rects.length}`, x0: fp.box.u0, x1: fp.box.u1, y0: fp.box.y0, y1: fp.box.y1, role: 'front', groups: ['drawerFronts'], slots: matSlots(fp), row: 'base' });
      return;
    }
    seen.add(p.baseId);
    const role = front ? 'front' : p.mat === 'Plinth' ? 'plinth' : p.mat === 'Countertop' ? 'counter' : 'unit';
    const gs = [paintGroupOfKind(p.kind)].filter(Boolean);
    rects.push({ id: `main:${rects.length}`, x0: p.box.u0, x1: p.box.u1, y0: p.box.y0, y1: p.box.y1, role, groups: gs, slots: matSlots(p), row: 'base' });
  });
  const w = Math.max(1, scene.bounds.x1); const h = Math.max(1, scene.bounds.h);
  return { rects, w, h };
}
/* ---- selection helpers ----------------------------------------------------------------------------------------- */
const ANIM_K = new Set(['door', 'flip', 'drawer']);
/** the card under the drawing: name, size, material, area and whether it can be opened. `sel` = { unitId } (the design part id). */
export function selectionInfo(design, scene, bom, sel, lang = 'en') {
  if (!sel || !sel.unitId) return null;
  const part = getPart(design, sel.unitId); if (!part) return null;
  const its = scene.solved.byBase.get(part.id) || [];
  const sps = scene.parts.filter((q) => q.baseId === part.id);
  const first = its[0]; if (!first) return { part, name: partName(design, part, lang), dims: [0, 0, 0], mat: null, area: null, openable: false, ptype: ptypeOf(part), count: 0, no: null };
  const b = first.box;
  let area = null;
  if (bom) area = bom.rows.filter((r) => r.unitIds.includes(part.id)).reduce((s, r) => s + r.area, 0);
  const total = { x: Math.max(...its.map((q) => q.box.x1)) - Math.min(...its.map((q) => q.box.x0)), y: Math.max(...its.map((q) => q.box.y1)) - Math.min(...its.map((q) => q.box.y0)), z: Math.max(...its.map((q) => q.box.z1)) - Math.min(...its.map((q) => q.box.z0)) };
  return {
    part, name: partName(design, part, lang), dims: [r2(b.x1 - b.x0), r2(b.z1 - b.z0), r2(b.y1 - b.y0)], mat: part.type === 'group' ? null : classOf(part), area, count: its.length, total,
    openable: sps.some((q) => q.anim && ANIM_K.has(q.anim.k)), ptype: ptypeOf(part), no: scene.numbering.get(part.id) || null,
  };
}
/** the scene part ids a click on "Open" toggles for the selected design part */
export function openIdsFor(scene, info) {
  if (!info) return [];
  return scene.parts.filter((p) => p.baseId === info.part.id && p.anim && ANIM_K.has(p.anim.k)).map((p) => p.id);
}
/** what Kitchen3D / the sheet should highlight: a single-mesh part may carry its part id (halo), a composite one highlights every mesh of the part */
export function selForScene(scene, sel) {
  if (!sel || !sel.unitId) return null;
  const sps = scene.parts.filter((q) => q.baseId === sel.unitId);
  return { unitId: sel.unitId, partId: sps.length === 1 ? sps[0].id : null };
}
/** a Kitchen3D click { unitId, partId } -> the design part id */
export const baseOfScenePick = (pick) => (pick && pick.unitId ? { unitId: pick.unitId } : null);

export { AXES, AUTO_NAME, HW, treeOrder, ALL_EDGES };
