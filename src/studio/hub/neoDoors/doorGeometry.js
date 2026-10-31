/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - geometry. Pure functions: a design in, sizes + a list of PARTS out.
 * ONE list of parts drives the elevation drawing, the 3D scene, the cut list, the weight and the price, so they always agree.
 *
 * Coordinates
 *   leaf-local: x across the leaf from its LEFT edge as seen from outside, y up from the leaf bottom, z from the inside face (0) to the outside face (T)
 *   door:       x across from the middle of the opening (right is +, seen from outside), y up from the floor, z through the wall (outside is +, 0 = wall middle)
 * A part has `boxes` (one or several solid boxes, so a skin with a vision-panel hole is still ONE cut-list piece).
 * ===========================================================================*/
import { C, construction, leafCount } from './doorModel';

const r1 = (v) => Math.round(v * 10) / 10;

/* ----------------------------- sizes ----------------------------- */
export function sizes(d) {
  const { w: OW, h: OH, wall } = d.opening;
  const fr = d.frame; const sliding = d.type === 'barn';
  const frameOn = fr.on && !sliding;
  const pack = frameOn ? fr.pack : 0;
  const bodyT = frameOn ? fr.jambThk - fr.rebate : 0;
  const jd = frameOn ? (fr.jambDepth || wall) : wall;
  const thrH = frameOn && fr.threshold !== 'none' ? fr.thrH : 0;
  const floorGap = d.vent.mode === 'undercut' ? d.vent.gap : d.clear.floor;
  const T = d.leaf.thk;
  const n = leafCount(d);
  let clearW; let clearH; let leafW; let leafH; let y0;
  if (sliding) {
    clearW = OW; clearH = OH;
    leafW = OW + 2 * d.barn.overlap;
    leafH = OH + d.barn.cover - d.clear.floor;
    y0 = d.clear.floor;
  } else {
    clearW = OW - 2 * pack - 2 * bodyT;
    clearH = OH - pack - bodyT - thrH;
    leafW = n === 2 ? (clearW - 2 * d.clear.side - d.clear.meet) / 2 : clearW - 2 * d.clear.side;
    leafH = clearH - d.clear.head - floorGap;
    y0 = thrH + floorGap;
  }
  return {
    OW, OH, wall, frameOn, pack, bodyT, jd, thrH, floorGap, T, n, clearW: r1(clearW), clearH: r1(clearH), leafW: r1(leafW), leafH: r1(leafH), y0: r1(y0),
    jambLen: OH - pack, sliding, slides: sliding || d.type === 'pocket', pocket: d.type === 'pocket', double: n === 2, cT: T - 2 * d.leaf.skinT,
  };
}

/** hinge centres (leaf-local y) for a leaf: the top hinge sits `topOff` (150) mm below the head of the leaf, the bottom one `botOff` (225) mm above its foot, the others share the space evenly */
export function hingeYs(leafH, count, len, type, topOff = 150, botOff = 225) {
  if (type === 'pivot') return [30, leafH - 30];
  const top = leafH - topOff - len / 2; const bot = botOff + len / 2;
  const out = [];
  for (let i = 0; i < count; i++) out.push(r1(count === 1 ? top : top - (i * (top - bot)) / (count - 1)));
  return out;
}
export const HINGE_CAP = { butt: 25, ball: 40, concealed: 40, pivot: 100 }; // kg a single hinge is rated for (placeholder catalogue values)
export function autoHinges(weightKg, leafH, fireRating) {
  let n = leafH <= 1800 && weightKg <= 20 ? 2 : leafH <= 2250 && weightKg <= 40 ? 3 : leafH <= 2600 && weightKg <= 70 ? 4 : 5;
  if (fireRating !== 'none') n = Math.max(3, n);
  return n;
}

/* a rectangle minus holes -> boxes (so a skin with a vision panel / grille is drawn as a ring of boxes) */
export function punch(x0, x1, y0, y1, holes) {
  const hs = (holes || []).filter(Boolean);
  if (!hs.length) return [{ x0, x1, y0, y1 }];
  const ys = [...new Set([y0, y1, ...hs.flatMap((h) => [h.y0, h.y1])].filter((v) => v >= y0 && v <= y1))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const a = ys[i]; const b = ys[i + 1]; if (b - a < 0.01) continue;
    const mid = (a + b) / 2;
    const cut = hs.filter((h) => mid > h.y0 && mid < h.y1).map((h) => [Math.max(x0, h.x0), Math.min(x1, h.x1)]).sort((p, q) => p[0] - q[0]);
    let cx = x0;
    cut.forEach(([c0, c1]) => { if (c0 > cx + 0.01) out.push({ x0: cx, x1: c0, y0: a, y1: b }); cx = Math.max(cx, c1); });
    if (x1 > cx + 0.01) out.push({ x0: cx, x1, y0: a, y1: b });
  }
  return out;
}

export const MAT = {
  timber: { en: 'Solid timber', ar: 'خشب صلب', dens: 600, sheet: false },
  coreSolid: { en: 'Solid core (blockboard)', ar: 'قلب صلب (بلوك بورد)', dens: 520, sheet: true },
  coreHoney: { en: 'Honeycomb core fill', ar: 'حشوة قلب عسلي', dens: 45, sheet: true },
  coreChip: { en: 'Engineered core (tubular chipboard)', ar: 'قلب هندسي (شيب بورد أنبوبي)', dens: 330, sheet: true },
  skinPaint: { en: 'HDF skin (paint grade)', ar: 'جلد HDF (للدهان)', dens: 850, sheet: true },
  skinVeneer: { en: 'Veneered HDF skin', ar: 'جلد HDF مغطى بقشرة', dens: 850, sheet: true },
  skinLacquer: { en: 'MDF skin (lacquer grade)', ar: 'جلد MDF (للّكر)', dens: 750, sheet: true },
  skinLaminate: { en: 'HPL laminate on HDF', ar: 'لامينيت HPL على HDF', dens: 900, sheet: true },
  skinMoulded: { en: 'Moulded HDF skin', ar: 'جلد HDF مقولب', dens: 900, sheet: true },
  mdf: { en: 'MDF (paint grade)', ar: 'MDF (للدهان)', dens: 750, sheet: true },
  mdfVeneer: { en: 'Veneered MDF', ar: 'MDF مغطى بقشرة', dens: 760, sheet: true },
  glass: { en: 'Glass', ar: 'زجاج', dens: 2500, sheet: false },
  frame: { en: 'Frame timber', ar: 'خشب الحلق', dens: 600, sheet: false },
};
export const SHEET = [2440, 1220];
export const STOCK_LEN = 3000;
const SKIN_MAT = { paint: 'skinPaint', veneer: 'skinVeneer', lacquer: 'skinLacquer', laminate: 'skinLaminate' };
export const TIMBER_DENS = { softwood: 480, hardwood: 700 };
export const volumeM3 = (b) => ((b.x1 - b.x0) * (b.y1 - b.y0) * (b.z1 - b.z0)) / 1e9;

/** names (EN / AR) used by the cut list; `ptype` colours the drawing and the legend */
const N = {
  skin: ['Skin', 'جلد'], skinM: ['Moulded skin', 'جلد مقولب'], lipL: ['Lipping (long edge)', 'شريط حافة (طويل)'], lipS: ['Lipping (short edge)', 'شريط حافة (قصير)'],
  coreSlab: ['Core slab', 'لوح القلب'], cStile: ['Core stile', 'عمود القلب'], cRail: ['Core rail', 'عارضة القلب'], cFill: ['Core fill', 'حشوة القلب'],
  lock: ['Lock block', 'قطعة القفل'], hingeBlk: ['Hinge block', 'قطعة المفصلات'],
  stile: ['Stile', 'ضلع جانبي'], top: ['Top rail', 'عارضة علوية'], bottom: ['Bottom rail', 'عارضة سفلية'], mid: ['Mid rail', 'عارضة وسطى'], muntin: ['Muntin', 'قاطع عمودي'],
  panel: ['Panel', 'بانوه'], mouldH: ['Moulding (horizontal)', 'قولبة (أفقية)'], mouldV: ['Moulding (vertical)', 'قولبة (عمودية)'],
  glass: ['Glass light', 'لوح زجاج'], beadH: ['Glazing bead (horizontal)', 'شريط تثبيت زجاج (أفقي)'], beadV: ['Glazing bead (vertical)', 'شريط تثبيت زجاج (عمودي)'],
  barV: ['Glazing bar (vertical)', 'قاطع زجاج (عمودي)'], barH: ['Glazing bar (horizontal)', 'قاطع زجاج (أفقي)'], slat: ['Louvre slat', 'شيش'],
  vGlass: ['Vision panel glass', 'زجاج فتحة الرؤية'], vLinV: ['Vision lining (vertical)', 'بطانة فتحة (عمودي)'], vLinH: ['Vision lining (horizontal)', 'بطانة فتحة (أفقي)'],
  vBeadH: ['Vision bead (horizontal)', 'شريط فتحة (أفقي)'], vBeadV: ['Vision bead (vertical)', 'شريط فتحة (عمودي)'],
  jamb: ['Frame jamb', 'جانب الحلق'], head: ['Frame head', 'رأس الحلق'], thr: ['Threshold', 'عتبة'], archV: ['Architrave (vertical)', 'كورنيش (عمودي)'], archH: ['Architrave (head)', 'كورنيش (علوي)'],
};
export const PNAME = N;

/** the grid of cells of a stile-and-rail / moulded leaf */
export function gridOf(d, S) {
  const p = d.panels; const cols = p.cols; const rows = p.rows;
  const innerH = S.leafH - p.topRail - p.bottomRail - (rows - 1) * p.midRail;
  const rowH = innerH / rows;
  const colW = (S.leafW - 2 * p.stile - (cols - 1) * p.muntin) / cols;
  const xs = []; for (let c = 0; c < cols; c++) xs.push(p.stile + c * (colW + p.muntin));
  const ys = []; for (let r = 0; r < rows; r++) { const y1 = S.leafH - p.topRail - r * (rowH + p.midRail); ys.push({ y0: y1 - rowH, y1 }); }
  return { cols, rows, colW, rowH, xs, ys, innerH };
}
export function cellKind(d, r) {
  const k = construction(d); const rows = d.panels.rows;
  if (k === 'glazed') return r < d.glass.rows ? 'glass' : 'panel';
  if (k === 'louvre') {
    const z = d.louvre.zone;
    return z === 'full' || (z === 'upper' && r === 0) || (z === 'lower' && r === rows - 1) ? 'louvre' : 'panel';
  }
  return 'panel';
}

/* vision panel / vent grille apertures (leaf-local), kept inside the leaf */
export function apertures(d, S) {
  const k = construction(d); const flushy = k === 'flush' || k === 'moulded';
  let vision = null; let grille = null;
  if (d.glass.vision && flushy) {
    const vw = Math.min(d.glass.vw, S.leafW - 200); const vh = Math.min(d.glass.vh, S.leafH - 400);
    const cy = Math.min(S.leafH - 150 - vh / 2, Math.max(150 + vh / 2, d.glass.vcy - S.y0));
    vision = { x0: (S.leafW - vw) / 2, x1: (S.leafW + vw) / 2, y0: cy - vh / 2, y1: cy + vh / 2, w: vw, h: vh };
  }
  if (d.vent.mode === 'grille') {
    const gw = Math.min(d.vent.grW, S.leafW - 200); const gh = Math.min(d.vent.grH, 400);
    grille = { x0: (S.leafW - gw) / 2, x1: (S.leafW + gw) / 2, y0: 200, y1: 200 + gh, w: gw, h: gh };
  }
  return { vision, grille };
}

/* ----------------------------- the parts of one leaf ----------------------------- */
function leafParts(d, S, li, xs) {
  const parts = []; const id = (s) => `l${li}-${s}`;
  const k = construction(d); const T = S.T; const sk = d.leaf.skinT; const cT = S.cT;
  const lw = S.leafW; const lh = S.leafH;
  const add = (p) => { parts.push({ leaf: li, bom: true, view: 'front', face: 'mid', qty: 1, ...p }); };
  const tim = 'timber';

  if (k === 'flush' || k === 'moulded') {
    const { vision, grille } = apertures(d, S);
    const skinMat = k === 'moulded' ? 'skinMoulded' : SKIN_MAT[d.leaf.skin];
    const holes = [vision, grille].filter(Boolean);
    const nm = k === 'moulded' ? N.skinM : N.skin;
    add({ id: id('skin-out'), kind: 'skin', ptype: 'leaf', name: nm[0], ar: nm[1], group: 'Leaf', mat: skinMat, grain: 'L', cut: { L: lh, W: lw, T: sk }, boxes: punch(0, lw, 0, lh, holes).map((b) => ({ ...b, z0: T - sk, z1: T })), face: 'front', note: holes.length ? 'cut-outs: vision panel / grille' : '' });
    add({ id: id('skin-in'), kind: 'skin', ptype: 'leaf', name: nm[0], ar: nm[1], group: 'Leaf', mat: skinMat, grain: 'L', cut: { L: lh, W: lw, T: sk }, boxes: punch(0, lw, 0, lh, holes).map((b) => ({ ...b, z0: 0, z1: sk })), face: 'back', view: 'back', note: holes.length ? 'cut-outs: vision panel / grille' : '' });
    const ih = lh - 2 * C.LIP; const iw = lw - 2 * C.LIP;
    add({ id: id('lip-l'), kind: 'lip', ptype: 'core', name: N.lipL[0], ar: N.lipL[1], group: 'Leaf', mat: tim, grain: 'L', qty: 2, cut: { L: lh, W: C.LIP, T }, boxes: [{ x0: 0, x1: C.LIP, y0: 0, y1: lh, z0: 0, z1: T }], face: 'core', view: 'internal' });
    add({ id: id('lip-r'), kind: 'lip', ptype: 'core', name: N.lipL[0], ar: N.lipL[1], group: 'Leaf', mat: tim, grain: 'L', qty: 0, cut: { L: lh, W: C.LIP, T }, boxes: [{ x0: lw - C.LIP, x1: lw, y0: 0, y1: lh, z0: 0, z1: T }], face: 'core', view: 'internal', dup: true });
    add({ id: id('lip-b'), kind: 'lip', ptype: 'core', name: N.lipS[0], ar: N.lipS[1], group: 'Leaf', mat: tim, grain: 'L', qty: 2, cut: { L: iw, W: C.LIP, T }, boxes: [{ x0: C.LIP, x1: lw - C.LIP, y0: 0, y1: C.LIP, z0: 0, z1: T }], face: 'core', view: 'internal' });
    add({ id: id('lip-t'), kind: 'lip', ptype: 'core', name: N.lipS[0], ar: N.lipS[1], group: 'Leaf', mat: tim, grain: 'L', qty: 0, cut: { L: iw, W: C.LIP, T }, boxes: [{ x0: C.LIP, x1: lw - C.LIP, y0: lh - C.LIP, y1: lh, z0: 0, z1: T }], face: 'core', view: 'internal', dup: true });
    const coreHoles = holes.map((h) => (h === vision ? { x0: h.x0 - C.LINING, x1: h.x1 + C.LINING, y0: h.y0 - C.LINING, y1: h.y1 + C.LINING } : h));
    const z0 = sk; const z1 = T - sk;
    if (d.leaf.core === 'solid') {
      add({ id: id('core'), kind: 'core', ptype: 'core', name: N.coreSlab[0], ar: N.coreSlab[1], group: 'Leaf', mat: 'coreSolid', grain: '-', cut: { L: ih, W: iw, T: cT }, boxes: punch(C.LIP, lw - C.LIP, C.LIP, lh - C.LIP, coreHoles).map((b) => ({ ...b, z0, z1 })), face: 'core', view: 'internal' });
    } else {
      const cf = C.CORE_FRAME; const fillMat = d.leaf.core === 'hollow' ? 'coreHoney' : 'coreChip';
      add({ id: id('cs-l'), kind: 'core', ptype: 'core', name: N.cStile[0], ar: N.cStile[1], group: 'Leaf', mat: tim, grain: 'L', qty: 2, cut: { L: ih, W: cf, T: cT }, boxes: [{ x0: C.LIP, x1: C.LIP + cf, y0: C.LIP, y1: lh - C.LIP, z0, z1 }], face: 'core', view: 'internal' });
      add({ id: id('cs-r'), kind: 'core', ptype: 'core', name: N.cStile[0], ar: N.cStile[1], group: 'Leaf', mat: tim, grain: 'L', qty: 0, dup: true, cut: { L: ih, W: cf, T: cT }, boxes: [{ x0: lw - C.LIP - cf, x1: lw - C.LIP, y0: C.LIP, y1: lh - C.LIP, z0, z1 }], face: 'core', view: 'internal' });
      add({ id: id('cr-b'), kind: 'core', ptype: 'core', name: N.cRail[0], ar: N.cRail[1], group: 'Leaf', mat: tim, grain: 'L', qty: 2, cut: { L: iw - 2 * cf, W: cf, T: cT }, boxes: [{ x0: C.LIP + cf, x1: lw - C.LIP - cf, y0: C.LIP, y1: C.LIP + cf, z0, z1 }], face: 'core', view: 'internal' });
      add({ id: id('cr-t'), kind: 'core', ptype: 'core', name: N.cRail[0], ar: N.cRail[1], group: 'Leaf', mat: tim, grain: 'L', qty: 0, dup: true, cut: { L: iw - 2 * cf, W: cf, T: cT }, boxes: [{ x0: C.LIP + cf, x1: lw - C.LIP - cf, y0: lh - C.LIP - cf, y1: lh - C.LIP, z0, z1 }], face: 'core', view: 'internal' });
      add({ id: id('cfill'), kind: 'core', ptype: 'core', name: N.cFill[0], ar: N.cFill[1], group: 'Leaf', mat: fillMat, grain: '-', cut: { L: ih - 2 * cf, W: iw - 2 * cf, T: cT }, boxes: punch(C.LIP + cf, lw - C.LIP - cf, C.LIP + cf, lh - C.LIP - cf, coreHoles).map((b) => ({ ...b, z0, z1 })), face: 'core', view: 'internal' });
      const lockLeft = xs.lockSide === 'left';
      const hy = d.lock.handleH - S.y0;
      if (xs.hasLock) {
        const bx = lockLeft ? [C.LIP + cf, C.LIP + 2 * cf] : [lw - C.LIP - 2 * cf, lw - C.LIP - cf];
        add({ id: id('lockblk'), kind: 'block', ptype: 'core', name: N.lock[0], ar: N.lock[1], group: 'Leaf', mat: tim, grain: 'L', cut: { L: C.LOCK_BLOCK, W: cf, T: cT }, boxes: [{ x0: bx[0], x1: bx[1], y0: hy - C.LOCK_BLOCK / 2, y1: hy + C.LOCK_BLOCK / 2, z0: z0 - 0.4, z1: z1 + 0.4 }], face: 'core', view: 'internal' });
      }
      if (d.leaf.core === 'engineered' && xs.hinges.length) {
        const hl = xs.hingeSide === 'left';
        const bx = hl ? [C.LIP + cf, C.LIP + 2 * cf] : [lw - C.LIP - 2 * cf, lw - C.LIP - cf];
        xs.hinges.forEach((y, i) => add({ id: id(`hblk-${i}`), kind: 'block', ptype: 'core', name: N.hingeBlk[0], ar: N.hingeBlk[1], group: 'Leaf', mat: tim, grain: 'L', cut: { L: C.HINGE_BLOCK, W: cf, T: cT }, boxes: [{ x0: bx[0], x1: bx[1], y0: y - C.HINGE_BLOCK / 2, y1: y + C.HINGE_BLOCK / 2, z0: z0 - 0.4, z1: z1 + 0.4 }], face: 'core', view: 'internal' }));
      }
    }
    if (vision) {
      const vw = vision.w; const vh = vision.h; const gz0 = (T - d.glass.thk) / 2;
      add({ id: id('vglass'), kind: 'glass', ptype: 'glass', name: N.vGlass[0], ar: N.vGlass[1], group: 'Glazing', mat: 'glass', grain: '-', cut: { L: r1(vh + 2 * C.GL_REB), W: r1(vw + 2 * C.GL_REB), T: d.glass.thk }, boxes: [{ x0: vision.x0, x1: vision.x1, y0: vision.y0, y1: vision.y1, z0: gz0, z1: gz0 + d.glass.thk }], glassKind: d.glass.kind, note: `${d.glass.safety} safety glass` });
      const lin = C.LINING;
      add({ id: id('vlin-l'), kind: 'lining', ptype: 'core', name: N.vLinV[0], ar: N.vLinV[1], group: 'Leaf', mat: tim, grain: 'L', qty: 2, cut: { L: vh + 2 * lin, W: cT, T: lin }, boxes: [{ x0: vision.x0 - lin, x1: vision.x0, y0: vision.y0 - lin, y1: vision.y1 + lin, z0, z1 }], face: 'core', view: 'internal' });
      add({ id: id('vlin-r'), kind: 'lining', ptype: 'core', name: N.vLinV[0], ar: N.vLinV[1], group: 'Leaf', mat: tim, grain: 'L', qty: 0, dup: true, cut: { L: vh + 2 * lin, W: cT, T: lin }, boxes: [{ x0: vision.x1, x1: vision.x1 + lin, y0: vision.y0 - lin, y1: vision.y1 + lin, z0, z1 }], face: 'core', view: 'internal' });
      add({ id: id('vlin-b'), kind: 'lining', ptype: 'core', name: N.vLinH[0], ar: N.vLinH[1], group: 'Leaf', mat: tim, grain: 'L', qty: 2, cut: { L: vw, W: cT, T: lin }, boxes: [{ x0: vision.x0, x1: vision.x1, y0: vision.y0 - lin, y1: vision.y0, z0, z1 }], face: 'core', view: 'internal' });
      add({ id: id('vlin-t'), kind: 'lining', ptype: 'core', name: N.vLinH[0], ar: N.vLinH[1], group: 'Leaf', mat: tim, grain: 'L', qty: 0, dup: true, cut: { L: vw, W: cT, T: lin }, boxes: [{ x0: vision.x0, x1: vision.x1, y0: vision.y1, y1: vision.y1 + lin, z0, z1 }], face: 'core', view: 'internal' });
      const bz = [sk - 0.2, sk + C.BEAD];
      add({ id: id('vbead-b'), kind: 'bead', ptype: 'glass', name: N.vBeadH[0], ar: N.vBeadH[1], group: 'Glazing', mat: tim, grain: 'L', qty: 2, cut: { L: vw + 2 * C.BEAD, W: C.BEAD, T: C.BEAD }, boxes: [{ x0: vision.x0 - C.BEAD, x1: vision.x1 + C.BEAD, y0: vision.y0 - C.BEAD, y1: vision.y0, z0: bz[0], z1: bz[1] }], face: 'back', view: 'back', note: 'mitred, fixed on the inside face' });
      add({ id: id('vbead-t'), kind: 'bead', ptype: 'glass', name: N.vBeadH[0], ar: N.vBeadH[1], group: 'Glazing', mat: tim, grain: 'L', qty: 0, dup: true, cut: { L: vw + 2 * C.BEAD, W: C.BEAD, T: C.BEAD }, boxes: [{ x0: vision.x0 - C.BEAD, x1: vision.x1 + C.BEAD, y0: vision.y1, y1: vision.y1 + C.BEAD, z0: bz[0], z1: bz[1] }], face: 'back', view: 'back' });
      add({ id: id('vbead-l'), kind: 'bead', ptype: 'glass', name: N.vBeadV[0], ar: N.vBeadV[1], group: 'Glazing', mat: tim, grain: 'L', qty: 2, cut: { L: vh + 2 * C.BEAD, W: C.BEAD, T: C.BEAD }, boxes: [{ x0: vision.x0 - C.BEAD, x1: vision.x0, y0: vision.y0 - C.BEAD, y1: vision.y1 + C.BEAD, z0: bz[0], z1: bz[1] }], face: 'back', view: 'back', note: 'mitred, fixed on the inside face' });
      add({ id: id('vbead-r'), kind: 'bead', ptype: 'glass', name: N.vBeadV[0], ar: N.vBeadV[1], group: 'Glazing', mat: tim, grain: 'L', qty: 0, dup: true, cut: { L: vh + 2 * C.BEAD, W: C.BEAD, T: C.BEAD }, boxes: [{ x0: vision.x1, x1: vision.x1 + C.BEAD, y0: vision.y0 - C.BEAD, y1: vision.y1 + C.BEAD, z0: bz[0], z1: bz[1] }], face: 'back', view: 'back' });
    }
    if (k === 'moulded') {
      /* the pressed panel pattern: display only (it is part of the moulded skin, not a separate piece) */
      const g = gridOf(d, S); const dz = 3;
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
        const y0 = g.ys[r].y0; const y1 = g.ys[r].y1; const x0 = g.xs[c]; const x1 = x0 + g.colW;
        if (vision && x1 > vision.x0 && x0 < vision.x1 && y1 > vision.y0 && y0 < vision.y1) continue;
        if (grille && x1 > grille.x0 && x0 < grille.x1 && y1 > grille.y0 && y0 < grille.y1) continue;
        add({ id: id(`press-${r}-${c}`), kind: 'deco', ptype: 'panel', name: 'Pressed panel', ar: 'بانوه مضغوط', group: 'Leaf', mat: skinMat, bom: false, boxes: [{ x0: x0 + 10, x1: x1 - 10, y0: y0 + 10, y1: y1 - 10, z0: T, z1: T + dz }, { x0: x0 + 10, x1: x1 - 10, y0: y0 + 10, y1: y1 - 10, z0: -dz, z1: 0 }], cell: { r, c } });
      }
    }
    return parts;
  }

  /* ----- stile and rail leaf: panel / glazed / louvre ----- */
  const p = d.panels; const g = gridOf(d, S); const T0 = T;
  const tn = C.TENON;
  const railL = r1(lw - 2 * p.stile + 2 * tn);
  add({ id: id('stile-l'), kind: 'stile', ptype: 'leaf', name: N.stile[0], ar: N.stile[1], group: 'Leaf', mat: tim, grain: 'L', qty: 2, cut: { L: lh, W: p.stile, T: T0 }, boxes: [{ x0: 0, x1: p.stile, y0: 0, y1: lh, z0: 0, z1: T0 }] });
  add({ id: id('stile-r'), kind: 'stile', ptype: 'leaf', name: N.stile[0], ar: N.stile[1], group: 'Leaf', mat: tim, grain: 'L', qty: 0, dup: true, cut: { L: lh, W: p.stile, T: T0 }, boxes: [{ x0: lw - p.stile, x1: lw, y0: 0, y1: lh, z0: 0, z1: T0 }] });
  add({ id: id('rail-t'), kind: 'rail', ptype: 'leaf', name: N.top[0], ar: N.top[1], group: 'Leaf', mat: tim, grain: 'L', cut: { L: railL, W: p.topRail, T: T0 }, boxes: [{ x0: p.stile, x1: lw - p.stile, y0: lh - p.topRail, y1: lh, z0: 0, z1: T0 }], note: `tenons ${tn} mm each end` });
  add({ id: id('rail-b'), kind: 'rail', ptype: 'leaf', name: N.bottom[0], ar: N.bottom[1], group: 'Leaf', mat: tim, grain: 'L', cut: { L: railL, W: p.bottomRail, T: T0 }, boxes: [{ x0: p.stile, x1: lw - p.stile, y0: 0, y1: p.bottomRail, z0: 0, z1: T0 }], note: `tenons ${tn} mm each end` });
  for (let r = 0; r < g.rows - 1; r++) {
    const yTop = g.ys[r].y0;
    add({ id: id(`rail-m${r}`), kind: 'rail', ptype: 'leaf', name: N.mid[0], ar: N.mid[1], group: 'Leaf', mat: tim, grain: 'L', qty: r === 0 ? g.rows - 1 : 0, dup: r > 0, cut: { L: railL, W: p.midRail, T: T0 }, boxes: [{ x0: p.stile, x1: lw - p.stile, y0: yTop - p.midRail, y1: yTop, z0: 0, z1: T0 }], note: `tenons ${tn} mm each end` });
  }
  if (g.cols > 1) {
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols - 1; c++) {
      const first = r === 0 && c === 0;
      add({ id: id(`mun-${r}-${c}`), kind: 'muntin', ptype: 'leaf', name: N.muntin[0], ar: N.muntin[1], group: 'Leaf', mat: tim, grain: 'L', qty: first ? (g.cols - 1) * g.rows : 0, dup: !first, cut: { L: r1(g.rowH + 2 * tn), W: p.muntin, T: T0 }, boxes: [{ x0: g.xs[c] + g.colW, x1: g.xs[c] + g.colW + p.muntin, y0: g.ys[r].y0, y1: g.ys[r].y1, z0: 0, z1: T0 }], note: `tenons ${tn} mm each end` });
    }
  }
  const panelMat = d.leaf.skin === 'veneer' ? 'mdfVeneer' : 'mdf';
  const pT = Math.min(p.panelThk, T0 - 6);
  const pz0 = (T0 - pT) / 2;
  
  const mouldOn = k === 'panel' && p.mould !== 'none';
  const mT = 14;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    const x0 = g.xs[c]; const x1 = x0 + g.colW; const y0 = g.ys[r].y0; const y1 = g.ys[r].y1;
    const ck = cellKind(d, r);
    if (ck === 'panel') {
      add({ id: id(`panel-${r}-${c}`), kind: 'panel', ptype: 'panel', name: N.panel[0], ar: N.panel[1], group: 'Leaf', mat: panelMat, grain: 'L', cell: { r, c }, profile: p.profile, thk: pT, cut: { L: r1(g.rowH + 2 * C.GROOVE), W: r1(g.colW + 2 * C.GROOVE), T: pT }, boxes: [{ x0, x1, y0, y1, z0: pz0, z1: pz0 + pT }], note: `${p.profile} profile, ${C.GROOVE} mm into the grooves` });
      if (mouldOn) {
        const mw = p.mouldW;
        const sides = p.mouldSides === 1 ? [1] : [1, 0];
        sides.forEach((front) => {
          const zz = front ? [T0 - Math.min(mT, (T0 - pT) / 2), T0] : [0, Math.min(mT, (T0 - pT) / 2)];
          const ring = (name, nm, x0b, x1b, y0b, y1b, L, key) => add({ id: id(`mould-${key}-${r}-${c}-${front}`), kind: 'mould', ptype: 'panel', name: nm[0], ar: nm[1], group: 'Leaf', mat: tim, grain: 'L', cell: { r, c }, cut: { L, W: mw, T: mT }, boxes: [{ x0: x0b, x1: x1b, y0: y0b, y1: y1b, z0: zz[0], z1: zz[1] }], face: front ? 'front' : 'back', view: front ? 'front' : 'back', note: `${p.mould} profile, mitred` });
          ring('h1', N.mouldH, x0, x1, y1 - mw, y1, r1(g.colW + 2 * mw), 'h1'); ring('h2', N.mouldH, x0, x1, y0, y0 + mw, r1(g.colW + 2 * mw), 'h2');
          ring('v1', N.mouldV, x0, x0 + mw, y0 + mw, y1 - mw, r1(g.rowH + 2 * mw), 'v1'); ring('v2', N.mouldV, x1 - mw, x1, y0 + mw, y1 - mw, r1(g.rowH + 2 * mw), 'v2');
        });
      }
    } else if (ck === 'louvre') {
      const lv = d.louvre; const cnt = Math.max(1, Math.floor(g.rowH / lv.pitch)); const span = cnt * lv.pitch;
      const off = (g.rowH - span) / 2;
      for (let s = 0; s < cnt; s++) {
        const yc = y1 - off - lv.pitch / 2 - s * lv.pitch;
        add({ id: id(`slat-${r}-${c}-${s}`), kind: 'slat', ptype: 'louvre', name: N.slat[0], ar: N.slat[1], group: 'Leaf', mat: tim, grain: 'L', cell: { r, c }, tilt: 35, cut: { L: r1(g.colW + 2 * C.GROOVE), W: lv.slatW, T: lv.slatT }, boxes: [{ x0: x0 - C.GROOVE, x1: x1 + C.GROOVE, y0: yc - lv.slatW / 2 * Math.cos((35 * Math.PI) / 180), y1: yc + lv.slatW / 2 * Math.cos((35 * Math.PI) / 180), z0: T0 / 2 - lv.slatT / 2, z1: T0 / 2 + lv.slatT / 2 }], note: `tilted 35 deg, ${C.GROOVE} mm into the stiles` });
      }
    } else {
      const gl = d.glass; const aw = (g.colW - gl.barsV * gl.barW) / (gl.barsV + 1); const ah = (g.rowH - gl.barsH * gl.barW) / (gl.barsH + 1);
      const gz0 = (T0 - gl.thk) / 2;
      for (let j = 0; j < gl.barsH + 1; j++) for (let i = 0; i < gl.barsV + 1; i++) {
        const lx0 = x0 + i * (aw + gl.barW); const ly1 = y1 - j * (ah + gl.barW);
        add({ id: id(`glass-${r}-${c}-${j}-${i}`), kind: 'glass', ptype: 'glass', name: N.glass[0], ar: N.glass[1], group: 'Glazing', mat: 'glass', grain: '-', cell: { r, c }, glassKind: gl.kind, cut: { L: r1(ah + 2 * C.GL_REB), W: r1(aw + 2 * C.GL_REB), T: gl.thk }, boxes: [{ x0: lx0, x1: lx0 + aw, y0: ly1 - ah, y1: ly1, z0: gz0, z1: gz0 + gl.thk }], note: `${gl.safety} ${gl.kind} glass, ${C.GL_REB} mm rebate each side` });
        const bz = [0 - 0.2, C.BEAD];
        const bd = (key, nm, bx0, bx1, by0, by1, L) => add({ id: id(`bead-${r}-${c}-${j}-${i}-${key}`), kind: 'bead', ptype: 'glass', name: nm[0], ar: nm[1], group: 'Glazing', mat: tim, grain: 'L', face: 'back', view: 'back', cut: { L, W: C.BEAD, T: C.BEAD }, boxes: [{ x0: bx0, x1: bx1, y0: by0, y1: by1, z0: bz[0], z1: bz[1] }], note: 'mitred, fixed on the inside face' });
        bd('b', N.beadH, lx0 - C.BEAD, lx0 + aw + C.BEAD, ly1 - ah - C.BEAD, ly1 - ah, r1(aw + 2 * C.BEAD)); bd('t', N.beadH, lx0 - C.BEAD, lx0 + aw + C.BEAD, ly1, ly1 + C.BEAD, r1(aw + 2 * C.BEAD));
        bd('l', N.beadV, lx0 - C.BEAD, lx0, ly1 - ah - C.BEAD, ly1 + C.BEAD, r1(ah + 2 * C.BEAD)); bd('r', N.beadV, lx0 + aw, lx0 + aw + C.BEAD, ly1 - ah - C.BEAD, ly1 + C.BEAD, r1(ah + 2 * C.BEAD));
        if (j > 0) add({ id: id(`barh-${r}-${c}-${j}-${i}`), kind: 'bar', ptype: 'glass', name: N.barH[0], ar: N.barH[1], group: 'Glazing', mat: tim, grain: 'L', cut: { L: r1(aw), W: gl.barW, T: C.BAR_T }, boxes: [{ x0: lx0, x1: lx0 + aw, y0: ly1 + 0, y1: ly1 + gl.barW, z0: (T0 - C.BAR_T) / 2, z1: (T0 + C.BAR_T) / 2 }] });
      }
      for (let i = 0; i < gl.barsV; i++) {
        const bx0 = x0 + (i + 1) * aw + i * gl.barW;
        add({ id: id(`barv-${r}-${c}-${i}`), kind: 'bar', ptype: 'glass', name: N.barV[0], ar: N.barV[1], group: 'Glazing', mat: tim, grain: 'L', cut: { L: r1(g.rowH), W: gl.barW, T: C.BAR_T }, boxes: [{ x0: bx0, x1: bx0 + gl.barW, y0, y1, z0: (T0 - C.BAR_T) / 2, z1: (T0 + C.BAR_T) / 2 }] });
      }
    }
  }
  return parts;
}

/* ----------------------------- the whole door ----------------------------- */
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

export function buildParts(d) {
  const S = sizes(d);
  const k = construction(d);
  const handLeft = d.swing.hand === 'LH';
  /* per leaf layout */
  const leaves = [];
  for (let li = 0; li < S.n; li++) {
    let hingeSide; let x0;
    if (S.double) { hingeSide = li === 0 ? 'left' : 'right'; x0 = li === 0 ? -S.clearW / 2 + d.clear.side : S.clearW / 2 - d.clear.side - S.leafW; } else { hingeSide = handLeft ? 'left' : 'right'; x0 = -S.leafW / 2; }
    const lockSide = hingeSide === 'left' ? 'right' : 'left';
    const activeIdx = S.double ? (d.swing.active === 'left' ? 0 : 1) : 0;
    const hasLock = d.lock.on && li === activeIdx;
    /* z: the leaf rests against the integral stop (on the outside for a door that opens in, on the inside for one that opens out) */
    let z0;
    if (S.sliding) { z0 = d.type === 'barn' ? (d.swing.dir === 'in' ? -S.wall / 2 - 40 - S.T : S.wall / 2 + 40) : -S.T / 2; }
    else if (!S.frameOn) z0 = -S.T / 2;
    else if (d.swing.dir === 'in') z0 = S.jd / 2 - 20 - C.STOP_T - S.T; else z0 = -S.jd / 2 + 20 + C.STOP_T;
    if (S.pocket) z0 = -S.T / 2;
    leaves.push({ id: `leaf${li}`, index: li, x0: r1(x0), y0: S.y0, z0: r1(z0), w: S.leafW, h: S.leafH, t: S.T, hingeSide, lockSide, hasLock, active: li === activeIdx });
  }
  /* first pass without hinges: the weight decides the automatic hinge count */
  const raw = [];
  leaves.forEach((lf) => { leafParts(d, S, lf.index, { lockSide: lf.lockSide, hasLock: lf.hasLock, hingeSide: lf.hingeSide, hinges: [] }).forEach((p) => raw.push(p)); });
  const dens = (p) => (p.mat === 'timber' ? TIMBER_DENS[d.leaf.timber] : MAT[p.mat].dens);
  const partKg = (p) => sum(p.boxes, (b) => volumeM3(b)) * dens(p) * (p.dup || p.qty === 0 ? 1 : 1);
  const kgOf = (li) => sum(raw.filter((p) => p.leaf === li && p.bom), partKg);
  const leafKg = leaves.map((lf) => kgOf(lf.index));
  const maxKg = Math.max(...leafKg);
  const nHinge = S.slides ? 0 : (d.hinges.count || autoHinges(maxKg, S.leafH, d.fire.rating));
  const hys = S.slides ? [] : hingeYs(S.leafH, nHinge, d.hinges.len, d.hinges.type, d.hinges.top, d.hinges.bottom);
  let parts = [];
  if (k === 'flush' || k === 'moulded') {
    /* engineered core needs hinge blocks: build again now the hinge heights are known */
    leaves.forEach((lf) => { leafParts(d, S, lf.index, { lockSide: lf.lockSide, hasLock: lf.hasLock, hingeSide: lf.hingeSide, hinges: hys }).forEach((p) => parts.push(p)); });
  } else parts = raw;
  /* quantities: a pair is one part with qty 2 plus a `dup` part (qty 0) that only carries the second piece's boxes for drawing and 3D */

  /* frame, architrave, threshold (door coordinates) */
  const fparts = [];
  if (S.frameOn) {
    const fr = d.frame; const jd = S.jd; const bt = S.bodyT; const rb = fr.rebate; const cw = S.clearW; const top = S.OH - S.pack;
    const stopZ = d.swing.dir === 'in' ? [jd / 2 - 20 - C.STOP_T, jd / 2 - 20] : [-jd / 2 + 20, -jd / 2 + 20 + C.STOP_T];
    const fadd = (p) => fparts.push({ leaf: null, bom: true, view: 'front', face: 'mid', qty: 1, group: 'Frame', ptype: 'frame', mat: 'frame', grain: 'L', ...p });
    fadd({ id: 'jamb-l', kind: 'jamb', name: N.jamb[0], ar: N.jamb[1], qty: 2, cut: { L: S.jambLen, W: jd, T: fr.jambThk }, boxes: [{ x0: -cw / 2 - bt, x1: -cw / 2, y0: 0, y1: top, z0: -jd / 2, z1: jd / 2 }, { x0: -cw / 2, x1: -cw / 2 + rb, y0: 0, y1: top, z0: stopZ[0], z1: stopZ[1] }], note: `integral stop, rebate ${rb} mm` });
    fadd({ id: 'jamb-r', kind: 'jamb', name: N.jamb[0], ar: N.jamb[1], qty: 0, dup: true, cut: { L: S.jambLen, W: jd, T: fr.jambThk }, boxes: [{ x0: cw / 2, x1: cw / 2 + bt, y0: 0, y1: top, z0: -jd / 2, z1: jd / 2 }, { x0: cw / 2 - rb, x1: cw / 2, y0: 0, y1: top, z0: stopZ[0], z1: stopZ[1] }] });
    fadd({ id: 'head', kind: 'head', name: N.head[0], ar: N.head[1], cut: { L: cw, W: jd, T: fr.jambThk }, boxes: [{ x0: -cw / 2, x1: cw / 2, y0: top - bt, y1: top, z0: -jd / 2, z1: jd / 2 }, { x0: -cw / 2 + rb, x1: cw / 2 - rb, y0: top - bt - rb, y1: top - bt, z0: stopZ[0], z1: stopZ[1] }], note: `integral stop, rebate ${rb} mm` });
    if (S.thrH) fadd({ id: 'threshold', kind: 'threshold', name: N.thr[0], ar: N.thr[1], cut: { L: cw, W: jd, T: S.thrH }, boxes: [{ x0: -cw / 2, x1: cw / 2, y0: 0, y1: S.thrH, z0: -jd / 2, z1: jd / 2 }], note: fr.threshold === 'ramp' ? 'ramped 1:6 both edges' : 'flat' });
    const a = fr.arch;
    if (a.on) {
      const sides = a.sides === 'one' ? [1] : [1, -1];
      const rv = a.reveal; const vL = r1(top - bt + rv + a.w); const hL = r1(cw + 2 * rv + 2 * a.w);
      sides.forEach((sd, si) => {
        const zz = sd > 0 ? [S.wall / 2, S.wall / 2 + a.t] : [-S.wall / 2 - a.t, -S.wall / 2];
        const first = si === 0;
        const aadd = (p) => fadd({ group: 'Architrave', ptype: 'arch', face: sd > 0 ? 'front' : 'back', view: sd > 0 ? 'front' : 'back', ...p });
        aadd({ id: `arch-${sd}-l`, kind: 'architrave', name: N.archV[0], ar: N.archV[1], qty: first ? (sides.length * 2) : 0, dup: !first, cut: { L: vL, W: a.w, T: a.t }, boxes: [{ x0: -cw / 2 - rv - a.w, x1: -cw / 2 - rv, y0: 0, y1: top - bt + rv + a.w, z0: zz[0], z1: zz[1] }], note: `${a.profile} profile, mitred, reveal ${rv} mm` });
        aadd({ id: `arch-${sd}-r`, kind: 'architrave', name: N.archV[0], ar: N.archV[1], qty: 0, dup: true, cut: { L: vL, W: a.w, T: a.t }, boxes: [{ x0: cw / 2 + rv, x1: cw / 2 + rv + a.w, y0: 0, y1: top - bt + rv + a.w, z0: zz[0], z1: zz[1] }] });
        aadd({ id: `arch-${sd}-h`, kind: 'architrave', name: N.archH[0], ar: N.archH[1], qty: first ? sides.length : 0, dup: !first, cut: { L: hL, W: a.w, T: a.t }, boxes: [{ x0: -cw / 2 - rv - a.w, x1: cw / 2 + rv + a.w, y0: top - bt + rv, y1: top - bt + rv + a.w, z0: zz[0], z1: zz[1] }], note: `${a.profile} profile, mitred, reveal ${rv} mm` });
      });
    }
  }

  /* hardware (drawn, listed in the hardware list - not in the cut list) */
  const hw = [];
  const hadd = (p) => hw.push({ bom: false, hardware: true, ptype: 'hardware', group: 'Hardware', mat: 'steel', view: 'front', face: 'mid', qty: 1, ...p });
  const sides0 = d.swing.dir === 'in' ? 0 : S.T;
  leaves.forEach((lf) => {
    const li = lf.index; const lw = S.leafW; const T = S.T;
    const ex = lf.hingeSide === 'left' ? 0 : lw;
    lf.pivot = { x: ex, z: sides0 };
    if (!S.slides) {
      hys.forEach((y, i) => {
        const conc = d.hinges.type === 'concealed';
        hadd({ id: `l${li}-hinge-${i}`, kind: 'hinge', leaf: li, name: 'Hinge', ar: 'مفصلة', hid: conc, boxes: [{ x0: ex - 6, x1: ex + 6, y0: y - d.hinges.len / 2, y1: y + d.hinges.len / 2, z0: sides0 - 7, z1: sides0 + 7 }], hingeY: y, view: conc ? 'internal' : 'front' });
      });
    }
    if (lf.hasLock && d.lock.handle !== 'none') {
      const lx = lf.lockSide === 'left' ? d.lock.backset : lw - d.lock.backset; const hy = d.lock.handleH - S.y0;
      const dirx = lf.lockSide === 'left' ? 1 : -1; // levers point towards the hinge side
      [[T, 1, 'front'], [0, -1, 'back']].forEach(([zf, sg, face]) => {
        const zA = sg > 0 ? zf : zf - 8; const zB = sg > 0 ? zf + 8 : zf;
        const hid = `l${li}-handle-${face}`;
        if (d.lock.handle === 'pull') {
          hadd({ id: hid, kind: 'handle', leaf: li, name: 'Pull handle', ar: 'مقبض سحب', face, view: face, boxes: [{ x0: lx - 8, x1: lx + 8, y0: hy - 200, y1: hy + 200, z0: sg > 0 ? zf + 20 : zf - 40, z1: sg > 0 ? zf + 40 : zf - 20 }, { x0: lx - 4, x1: lx + 4, y0: hy - 150, y1: hy - 140, z0: sg > 0 ? zf : zf - 20, z1: sg > 0 ? zf + 20 : zf }, { x0: lx - 4, x1: lx + 4, y0: hy + 140, y1: hy + 150, z0: sg > 0 ? zf : zf - 20, z1: sg > 0 ? zf + 20 : zf }] });
        } else if (d.lock.handle === 'knob') {
          hadd({ id: hid, kind: 'handle', leaf: li, name: 'Knob', ar: 'كرة', face, view: face, round: true, boxes: [{ x0: lx - 28, x1: lx + 28, y0: hy - 28, y1: hy + 28, z0: sg > 0 ? zf : zf - 40, z1: sg > 0 ? zf + 40 : zf }] });
        } else {
          hadd({ id: hid, kind: 'handle', leaf: li, name: 'Lever handle', ar: 'مقبض ذراع', face, view: face, boxes: [{ x0: lx - 26, x1: lx + 26, y0: hy - 26, y1: hy + 26, z0: zA, z1: zB, round: true }, { x0: dirx > 0 ? lx - 10 : lx - 120, x1: dirx > 0 ? lx + 120 : lx + 10, y0: hy - 10, y1: hy + 10, z0: sg > 0 ? zf + 8 : zf - 30, z1: sg > 0 ? zf + 30 : zf - 8 }] });
        }
        if (d.lock.cyl) hadd({ id: `l${li}-cyl-${face}`, kind: 'cylinder', leaf: li, name: 'Euro cylinder', ar: 'سلندر', face, view: face, round: true, boxes: [{ x0: lx - 14, x1: lx + 14, y0: hy - C.CYL_DROP - 14, y1: hy - C.CYL_DROP + 14, z0: zA, z1: zB }] });
      });
    }
    if (S.double && !lf.active) {
      const bx = lf.lockSide === 'left' ? 0 : lw;
      hadd({ id: `l${li}-bolt-top`, kind: 'bolt', leaf: li, name: 'Flush bolt (top)', ar: 'مزلاج مخفي (علوي)', hid: true, view: 'internal', boxes: [{ x0: bx - 10, x1: bx + 10, y0: S.leafH - 150, y1: S.leafH, z0: T / 2 - 10, z1: T / 2 + 10 }] });
      hadd({ id: `l${li}-bolt-bot`, kind: 'bolt', leaf: li, name: 'Flush bolt (bottom)', ar: 'مزلاج مخفي (سفلي)', hid: true, view: 'internal', boxes: [{ x0: bx - 10, x1: bx + 10, y0: 0, y1: 150, z0: T / 2 - 10, z1: T / 2 + 10 }] });
    }
    if (d.fire.rating !== 'none' && lf.active) {
      /* the "fire door - keep shut" sign on the outside face, above the lock side */
      hadd({ id: `l${li}-fire-sign`, kind: 'plaque', leaf: li, name: 'Fire door sign', ar: 'لافتة باب حريق', face: 'front', view: 'front', boxes: [{ x0: lw / 2 - 80, x1: lw / 2 + 80, y0: S.leafH - 420, y1: S.leafH - 340, z0: T, z1: T + 3 }] });
      const cx = lf.lockSide === 'left' ? lw - 330 : 30; // closer on the hinge side of the leaf, inside face
      hadd({ id: `l${li}-closer`, kind: 'closer', leaf: li, name: 'Overhead door closer', ar: 'ذراع إغلاق علوي', face: 'back', view: 'back', boxes: [{ x0: cx, x1: cx + 300, y0: S.leafH - 80, y1: S.leafH - 20, z0: -50, z1: 0 }] });
    }
    if (d.vent.mode === 'grille') {
      const ap = apertures(d, S).grille;
      if (ap) [[T, 1, 'front'], [0, -1, 'back']].forEach(([zf, sg, face]) => hadd({ id: `l${li}-grille-${face}`, kind: 'grille', leaf: li, name: 'Ventilation grille', ar: 'شبكة تهوية', face, view: face, boxes: [{ x0: ap.x0 - 12, x1: ap.x1 + 12, y0: ap.y0 - 12, y1: ap.y1 + 12, z0: sg > 0 ? zf : zf - 6, z1: sg > 0 ? zf + 6 : zf }] }));
    }
    if (d.type === 'barn') {
      [0.2, 0.8].forEach((f, i) => hadd({ id: `l${li}-hanger-${i}`, kind: 'hanger', leaf: li, name: 'Roller hanger', ar: 'عجلة تعليق', boxes: [{ x0: lw * f - 40, x1: lw * f + 40, y0: S.leafH - 60, y1: S.leafH + 70, z0: d.swing.dir === 'in' ? T : -6, z1: d.swing.dir === 'in' ? T + 6 : 0 }] }));
    }
  });
  let track = null;
  if (d.type === 'barn') {
    const lf = leaves[0]; const railLen = Math.ceil((2 * S.leafW) / 10) * 10; const slideLeft = handLeft;
    const start = slideLeft ? -S.leafW / 2 - 30 - (railLen - S.leafW) : -S.leafW / 2 - 30;
    const zf = d.swing.dir === 'in' ? -S.wall / 2 - 20 : S.wall / 2;
    const yT = lf.y0 + S.leafH + 40;
    track = { x0: start, x1: start + railLen, y: yT, z0: zf, z1: zf + 20, len: railLen, slide: slideLeft ? -1 : 1 };
  }
  if (d.type === 'pocket') track = { x0: -S.clearW / 2, x1: S.clearW / 2 + S.leafW, y: S.y0 + S.leafH + 25, len: 2 * S.leafW + 40, slide: handLeft ? -1 : 1 };

  const wallGeo = { w: S.OW, h: S.OH, t: S.wall, ext: Math.max(700, 0.55 * S.OW), top: 360 };
  return { S, leaves, parts: [...parts, ...fparts], hw, track, hingeCount: nHinge, hingeYs: hys, leafKg, apertures: apertures(d, S), grid: k === 'flush' ? null : gridOf(d, S), wall: wallGeo, kind: k };
}
