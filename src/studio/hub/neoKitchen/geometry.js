/* =============================================================================
 * Neo Kitchen Designer - geometry. ONE source of truth for every view:
 * buildScene(model) returns every panel as a box in its run frame
 *   (u = along the run as seen from the front, left->right; y = up; d = depth from the wall)
 * plus hinge / handle / pin / joint / appliance lists. The 2D elevation, 3D scene,
 * X-ray, explode, cut list and DXF are all derived from this one structure, so a
 * control change updates all of them together. Pure functions, unit-tested.
 * ===========================================================================*/
import { MFG, APPLIANCE, DEFAULT_GRAIN, LED } from './constants';
import {
  sum, isTall, tallH, wallOffset, rowWidth, runWallH, runHasTop, runDepth, lowerH, normDigits,
  activeRunKeys, isFlipRun, runHiddenBase, runOpenBack,
} from './model';

const r2 = (v) => Math.round(v * 100) / 100;

/** heights of the sections of a unit (fixed `h` sections keep it, the rest share the remainder) */
export function secHeights(secs, H) {
  const fixed = sum(secs.map((s) => s.h || 0));
  const autos = secs.filter((s) => !s.h).length;
  const rest = Math.max(0, H - fixed);
  return secs.map((s) => (s.h ? s.h : autos ? rest / autos : 0));
}
export const hingeCount = (h) => (h <= 900 ? 2 : h <= 1500 ? 3 : h <= 2000 ? 4 : 5);
export function runnerLen(g, D) {
  const avail = D - g.inset - g.back - 10;
  const ok = MFG.runnerLens.filter((l) => l <= avail);
  return ok.length ? ok[ok.length - 1] : MFG.runnerLens[0];
}
const hingeYs = (yb, yt) => {
  const n = hingeCount(yt - yb);
  const a = yb + MFG.hingeEnd, b = yt - MFG.hingeEnd;
  return Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1)));
};

/* ---- one unit -------------------------------------------------------------- */
function buildUnit(model, ctx) {
  const { g } = model;
  const { unit, rk, row, fu0, y0, H, D, group, label, tag } = ctx;
  const t = g.board, dt = g.doorThk, W = unit.w, G = g.grooveD;
  const parts = [], hinges = [], handles = [], pins = [], joints = [], elev = [], appliances = [], cutouts = [], leds = [];
  const tall = isTall(unit);
  const ptBase = row === 'wall' || row === 'top' ? 'wallUnit' : 'baseUnit';
  let n = 0;
  const add = (o) => {
    const b = o.box;
    const p = {
      id: `${unit.id}#${n++}`, unitId: unit.id, runKey: rk, row, group, qty: 1, grain: 'auto', edges: [], note: '', ...o,
      ext: { w: r2(b.u1 - b.u0), d: r2(b.d1 - b.d0), h: r2(b.y1 - b.y0) },
    };
    parts.push(p);
    return p;
  };
  const box = (u0, y, d0, u1, y1, d1) => ({ u0, y0: y, d0, u1, y1, d1 });
  const x0 = fu0, x1 = fu0 + W;
  const yTop = y0 + H;
  const corner = unit.type === 'blind' || unit.type === 'carousel' || unit.type === 'diagonal';
  const secs = corner ? [{ t: 'door', n: 1, shelves: 0, hinge: unit.cornerHinge || 'L' }] : unit.secs;
  const hs = secHeights(secs, H);
  const nsec = secs.length;
  /* [NEO-CLOSETS-UX25] g.flushBack (a wardrobe with back inset 0): the back panel sits flush on the rear edge, no groove (a kitchen never sets it) */
  const Gb = g.flushBack ? 0 : G;
  const noteGroove = g.flushBack ? `Back panel ${g.back}mm, flush with the rear edge - no groove` : `Rabbet groove: ${g.back}mm wide x ${G}mm deep @ ${g.inset}mm - back edge`;
  const isBaseNormal = row === 'base' && !tall;

  /* carcass */
  add({ kind: 'side', name: 'Side', mat: 'Carcass', ptype: ptBase, view: 'carcass', box: box(x0, y0, 0, x0 + t, yTop, D), edges: [{ axis: 'y', where: 'front' }], note: noteGroove });
  add({ kind: 'side', sideR: true, name: 'Side', mat: 'Carcass', ptype: ptBase, view: 'carcass', box: box(x1 - t, y0, 0, x1, yTop, D), edges: [{ axis: 'y', where: 'front' }], note: noteGroove });
  /* UX-17 wall options (main run, normal wall units): "Bottom cover" = a cover board (door board) hung flush under the carcass bottom, and the
   * LED strip = a groove in the UNDERSIDE of the lowest board (the cover when there is one, else the bottom board) + one strip record the
   * 3D view draws as an emissive mesh. A groove removes material inside the board, so the cut size does not change (machining note only). */
  const wallOpt = row === 'wall' && rk === 'main' && !corner;
  const led = wallOpt && model.led && model.led.strip ? model.led : null;
  const ledOff = led ? Math.max(0, Math.min(led.off, D - led.w - 10)) : 0;
  const ledNote = led ? `LED groove: ${led.w}mm wide x ${LED.depth}mm deep @ ${ledOff}mm - underside, front edge` : '';
  const botPart = add({ kind: 'bottom', name: 'Bottom', mat: 'Carcass', ptype: ptBase, view: 'carcass', box: box(x0 + t, y0, 0, x1 - t, y0 + t, D), edges: [{ axis: 'u', where: 'front' }], note: noteGroove + (led && !(wallOpt && model.bottomCover) ? `; ${ledNote}` : '') });
  let low = botPart; let yLow = y0;
  if (wallOpt && model.bottomCover) {
    low = add({ ...{ kind: 'door', mat: 'Door', ptype: 'cover', view: 'front', grainFront: unit.grainFront }, name: 'Bottom cover', box: box(x0 + g.doorGap, y0 - dt, 0, x1 - g.doorGap, y0, D + dt), edges: [{ axis: 'u', where: 'front' }], note: led ? ledNote : '' });
    yLow = y0 - dt;
  }
  if (led) {
    low.ledGroove = { w: led.w, depth: LED.depth, off: ledOff };
    leds.push({ unitId: unit.id, partId: low.id, runKey: rk, on: led.on !== false, u0: x0 + t + 10, u1: x1 - t - 10, y0: yLow - 1, y1: yLow + 3, d0: D - ledOff - led.w + 2, d1: D - ledOff - 2, w: led.w, off: ledOff });
  }

  if (isBaseNormal) {
    add({ kind: 'stretcher', name: 'Top stretcher (front)', mat: 'Carcass', ptype: ptBase, view: 'carcass', box: box(x0 + t, yTop - t, D - g.stretcher, x1 - t, yTop, D), edges: [{ axis: 'u', where: 'front' }] });
    add({ kind: 'stretcher', name: 'Top stretcher (rear)', mat: 'Carcass', ptype: ptBase, view: 'carcass', box: box(x0 + t, yTop - t, 0, x1 - t, yTop, g.stretcher), note: noteGroove });
  } else {
    add({ kind: 'top', name: 'Top', mat: 'Carcass', ptype: ptBase, view: 'carcass', box: box(x0 + t, yTop - t, 0, x1 - t, yTop, D), edges: [{ axis: 'u', where: 'front' }], note: noteGroove });
  }
  add({ kind: 'back', name: 'Back', mat: 'Back', ptype: ptBase, view: 'internal', box: box(x0 + t - Gb, y0 + t - Gb, g.inset, x1 - t + Gb, yTop - t + Gb, g.inset + g.back) });
  const backPart = parts[parts.length - 1];

  /* joinery (explode): side<->horizontal = 2 minifix + 2 dowels, stretcher = cam + dowel */
  const horiz = parts.filter((p) => p.kind === 'bottom' || p.kind === 'top');
  const jd = (type, p, u, y, d, axis) => joints.push({ type, partId: p.id, unitId: unit.id, u, y, d, axis });
  horiz.forEach((p) => {
    [x0 + t, x1 - t].forEach((u, i) => {
      const dir = i === 0 ? 1 : -1;
      [60, D - 60].forEach((d) => jd('dowel', p, u, (p.box.y0 + p.box.y1) / 2, d, 'u'));
      [D * 0.3, D * 0.7].forEach((d) => jd('minifix', p, u + dir * 20, p.kind === 'bottom' ? p.box.y1 : p.box.y0, d, 'y'));
    });
  });
  parts.filter((p) => p.kind === 'stretcher').forEach((p) => {
    [x0 + t, x1 - t].forEach((u) => { jd('cam', p, u, (p.box.y0 + p.box.y1) / 2, (p.box.d0 + p.box.d1) / 2, 'u'); });
  });

  /* section boundaries (fixed dividers) */
  const bounds = []; // y of each section's top
  let acc = yTop;
  hs.forEach((h, i) => { bounds.push({ top: acc, bot: acc - h }); acc -= h; });
  for (let i = 1; i < nsec; i++) {
    const yb = bounds[i].top;
    add({ kind: 'divider', name: 'Divider', mat: 'Carcass', ptype: ptBase, view: 'internal', box: box(x0 + t, yb - t / 2, g.inset + g.back, x1 - t, yb + t / 2, D), edges: [{ axis: 'u', where: 'front' }] });
  }

  const gap = g.doorGap;
  const hand = model.handle;
  const addHandle = (part, o) => { if (hand.style !== 'none' && hand.style !== 'push') handles.push({ partId: part.id, unitId: unit.id, style: hand.style, len: hand.len, ...o }); };
  const posFor = (yb, yt) => {
    const mode = hand.pos === 'auto' ? (tall ? 'center' : row === 'base' ? 'top' : 'bottom') : hand.pos;
    const len = hand.style === 'knob' ? 20 : hand.len;
    if (yt - yb < len + 120) return (yb + yt) / 2;
    if (mode === 'top') return yt - 60 - len / 2;
    if (mode === 'bottom') return yb + 60 + len / 2;
    return (yb + yt) / 2;
  };
  const rowTag = row === 'base' ? (tall ? 'Tall' : 'Base') : row === 'wall' ? 'Wall' : 'Top';
  const frontMat = (kind) => ({ kind, mat: 'Door', ptype: kind === 'drawerFront' ? 'drawer' : 'door', view: 'front', grainFront: unit.grainFront });

  /* door leaves (also used for glass / sink / corner doors) */
  const leaves = (si, yb, yt, count, opts = {}) => {
    const wTot = opts.width || W;
    const u00 = opts.u0 !== undefined ? opts.u0 : x0;
    const lw = (wTot - gap * (count + 1)) / count;
    const sec = secs[si];
    const out = [];
    for (let l = 0; l < count; l++) {
      const lu0 = u00 + gap + l * (lw + gap), lu1 = lu0 + lw;
      const side = count === 1 ? (opts.hinge || sec.hinge || 'L') : l < count / 2 ? 'L' : 'R';
      const isGlass = opts.glass;
      const bx = box(lu0, yb + gap, D, lu1, yt - gap, D + dt);
      const nm = `S${si + 1} ${isGlass ? 'Glass door' : opts.bifold ? 'Bi-fold door' : 'Door'}`;
      let p;
      if (isGlass) {
        const fw = MFG.frameW;
        const an = opts.fixed ? null : { k: 'door', side, pivotU: side === 'L' ? lu0 : lu1, pivotD: D };
        /* NEO-CLOSETS-UX24: optional "divisions" (horizontal glazing bars splitting the leaf into div + 1 panes) and smoked glass. Both default to
         * off (a kitchen glass door has neither), and with div = 0 the parts below are exactly the ones this branch always produced. */
        const nd = Math.max(0, Math.min(MFG.maxDiv, Math.round(Number(opts.div) || 0)));
        const smoked = !!opts.smoked;
        const fm = { ...frontMat('door'), ptype: 'glass', sec: si, anim: an, noMap: true, frame: true };
        add({ ...fm, name: `S${si + 1} Glass frame stile`, box: box(lu0, bx.y0, D, lu0 + fw, bx.y1, D + dt), edges: [{ axis: 'y', where: 'both' }] });
        add({ ...fm, name: `S${si + 1} Glass frame stile`, box: box(lu1 - fw, bx.y0, D, lu1, bx.y1, D + dt), edges: [{ axis: 'y', where: 'both' }] });
        add({ ...fm, name: `S${si + 1} Glass frame rail`, box: box(lu0 + fw, bx.y0, D, lu1 - fw, bx.y0 + fw, D + dt), edges: [{ axis: 'u', where: 'both' }] });
        add({ ...fm, name: `S${si + 1} Glass frame rail`, box: box(lu0 + fw, bx.y1 - fw, D, lu1 - fw, bx.y1, D + dt), edges: [{ axis: 'u', where: 'both' }] });
        const iy0 = bx.y0 + fw, iy1 = bx.y1 - fw, bw = MFG.barW;
        const paneH = (iy1 - iy0 - nd * bw) / (nd + 1);
        for (let k = 0; k < nd; k++) {
          const by0 = iy0 + (k + 1) * paneH + k * bw;
          add({ ...fm, name: `S${si + 1} Glass frame bar`, box: box(lu0 + fw, by0, D, lu1 - fw, by0 + bw, D + dt), edges: [{ axis: 'u', where: 'both' }] });
        }
        for (let k = 0; k <= nd; k++) {
          const py0 = iy0 + k * (paneH + bw);
          const pane = add({ kind: 'glass', mat: 'Glass', ptype: 'glass', view: 'front', name: `S${si + 1} ${smoked ? 'Smoked glass' : 'Glass'} panel`, box: box(lu0 + fw - 8, py0 - 8, D + dt / 2 - MFG.glassThk / 2, lu1 - fw + 8, py0 + paneH + 8, D + dt / 2 + MFG.glassThk / 2), sec: si, anim: an, pane: true, elevBox: bx, ...(smoked ? { smoked: true } : null), ...(k > 0 ? { noMap: true } : null) });
          if (k === 0) p = pane;
        }
      } else {
        p = add({ ...frontMat('door'), name: nm, box: bx, sec: si, edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }], anim: opts.fixed ? null : { k: 'door', side, pivotU: side === 'L' ? lu0 : lu1, pivotD: D }, ptype: opts.cover ? 'cover' : 'door' });
      }
      out.push({ p, side, lu0, lu1, lw });
      if (!opts.fixed) {
        // hinge cups on the hinge side edge
        const cx = side === 'L' ? lu0 + g.cupEdge + g.hingeCup / 2 : lu1 - g.cupEdge - g.hingeCup / 2;
        hingeYs(bx.y0, bx.y1).forEach((hy) => hinges.push({ partId: p.id, unitId: unit.id, u: cx, y: hy, d: D + dt, r: g.hingeCup / 2, side, sideU: side === 'L' ? x0 + t : x1 - t }));
        const hu = side === 'L' ? lu1 - MFG.handleEdge : lu0 + MFG.handleEdge;
        const hy = posFor(bx.y0, bx.y1);
        addHandle(p, { u: hu, y: hy, orient: 'v', holes: hand.style === 'bar' ? [[hu, hy - hand.len / 2], [hu, hy + hand.len / 2]] : hand.style === 'knob' ? [[hu, hy]] : [], d: D + dt });
      }
    }
    return out;
  };

  /* shelves inside a section range */
  const shelfParts = (si, yLow, yHigh, count, fixed) => {
    for (let j = 0; j < count; j++) {
      const ys = yLow + ((yHigh - yLow) * (j + 1)) / (count + 1);
      add({ kind: 'shelf', name: `S${si + 1} Shelf`, mat: 'Shelf', ptype: 'shelf', view: 'internal', sec: si,
        box: box(x0 + t + g.shelfPlay, ys - g.shelfThk / 2, g.inset + g.back, x1 - t - g.shelfPlay, ys + g.shelfThk / 2, D - MFG.shelfSetback), edges: [{ axis: 'u', where: 'front' }], fixed });
    }
  };

  secs.forEach((sec, si) => {
    const yt = bounds[si].top, yb = bounds[si].bot;
    const yLow = si === nsec - 1 ? y0 + t : yb + t / 2, yHigh = si === 0 ? yTop - t : yt - t / 2;
    const sh = yt - yb;
    const pieces = { si, type: sec.t, yb, yt, h: sh };
    elev.push({ kind: 'sec', ...pieces });
    if (corner) { buildCorner(); return; }
    switch (sec.t) {
      case 'door': case 'sink': {
        const cnt = sec.t === 'sink' ? Math.max(2, sec.n) : sec.n;
        /* [NEO-CLOSETS-UX30] a door section may carry `inner` = drawers INSIDE the carcass, at the bottom of the section, behind this section's door.
         * Only a wardrobe sets it (kitchen sections never have it), so without it every line below is exactly what it always was. */
        const inn = sec.t === 'door' && sec.inner && sec.inner.n > 0 ? sec.inner : null;
        const zTop = inn ? yb + inn.h : 0; // top of the drawer zone: a fixed divider board sits on it
        leaves(si, inn && inn.cover === 'above' ? zTop : yb, yt, cnt);
        shelfParts(si, inn ? zTop + t / 2 : yLow, yHigh, sec.shelves);
        pinRows(si, inn ? zTop + t / 2 : yLow, yHigh, sec.shelves);
        if (inn) innerDrawers(si, yb, zTop, inn);
        break;
      }
      case 'glass': {
        const inn = sec.inner && sec.inner.n > 0 ? sec.inner : null; // [NEO-CLOSETS-UX30] drawers inside, seen through the glass
        const zTop = inn ? yb + inn.h : 0;
        leaves(si, inn && inn.cover === 'above' ? zTop : yb, yt, sec.n, { glass: true, div: sec.div, smoked: sec.smoked });
        shelfParts(si, inn ? zTop + t / 2 : yLow, yHigh, sec.shelves);
        pinRows(si, inn ? zTop + t / 2 : yLow, yHigh, sec.shelves);
        if (inn) innerDrawers(si, yb, zTop, inn);
        break;
      }
      case 'flip': {
        const bx = box(x0 + gap, yb + gap, D, x1 - gap, yt - gap, D + dt);
        const p = add({ ...frontMat('door'), ptype: 'flip', name: `S${si + 1} Flip-up door`, box: bx, sec: si, edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }], anim: { k: 'flip', pivotY: bx.y1, pivotD: D } });
        hingeYs(bx.y0, bx.y1).slice(0, 2).forEach((_, i) => hinges.push({ partId: p.id, unitId: unit.id, u: bx.u0 + 120 + i * (bx.u1 - bx.u0 - 240), y: bx.y1 - g.cupEdge - g.hingeCup / 2, d: D + dt, r: g.hingeCup / 2, side: 'T', sideU: i ? x1 - t : x0 + t, flip: true }));
        const hy = bx.y0 + 40;
        addHandle(p, { u: (bx.u0 + bx.u1) / 2, y: hy, orient: 'h', holes: hand.style === 'bar' ? [[(bx.u0 + bx.u1) / 2 - hand.len / 2, hy], [(bx.u0 + bx.u1) / 2 + hand.len / 2, hy]] : hand.style === 'knob' ? [[(bx.u0 + bx.u1) / 2, hy]] : [], d: D + dt });
        shelfParts(si, yLow, yHigh, sec.shelves);
        break;
      }
      case 'cover': {
        add({ ...frontMat('door'), ptype: 'cover', name: `S${si + 1} Cover panel`, box: box(x0 + gap, yb + gap, D, x1 - gap, yt - gap, D + dt), sec: si, edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }] });
        break;
      }
      case 'drawer': case 'hob': {
        const cnt = sec.n, fh = sh / cnt;
        const rl = runnerLen(g, D);
        const bw = W - 2 * t - 2 * g.drawerSide;
        const fsg = g.drawerFrontSide != null ? g.drawerFrontSide : gap; // [NEO-CLOSETS-UX25] gap each side between a drawer front and the column sides (default: the door gap, as before)
        for (let d = 0; d < cnt; d++) {
          const ft = yt - d * fh, fb = ft - fh;
          const bx = box(x0 + fsg, fb + g.drawerGap / 2, D, x1 - fsg, ft - g.drawerGap / 2, D + dt);
          const slide = rl * 0.7;
          const an = { k: 'drawer', slide };
          const front = add({ ...frontMat('drawerFront'), ptype: 'drawer', name: `S${si + 1} Drawer front`, box: bx, sec: si, edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }], anim: an });
          const hy = bx.y1 - 40;
          addHandle(front, { u: (bx.u0 + bx.u1) / 2, y: hy, orient: 'h', holes: hand.style === 'bar' ? [[(bx.u0 + bx.u1) / 2 - hand.len / 2, hy], [(bx.u0 + bx.u1) / 2 + hand.len / 2, hy]] : hand.style === 'knob' ? [[(bx.u0 + bx.u1) / 2, hy]] : [], d: D + dt });
          const hb = Math.max(60, fh - MFG.boxClearV), by0 = fb + 20, by1 = by0 + hb;
          const bu0 = x0 + t + g.drawerSide, bu1 = bu0 + bw, bt = MFG.boxThk;
          const dback = D - rl;
          const dn = `S${si + 1} Drawer`;
          const bm = { mat: 'Drawer', ptype: 'drawer', view: 'internal', sec: si, anim: an, group };
          add({ ...bm, kind: 'drawerBox', name: `${dn} side`, box: box(bu0, by0, dback, bu0 + bt, by1, D), edges: [{ axis: 'd', where: 'top' }] });
          add({ ...bm, kind: 'drawerBox', name: `${dn} side`, box: box(bu1 - bt, by0, dback, bu1, by1, D), edges: [{ axis: 'd', where: 'top' }] });
          add({ ...bm, kind: 'drawerBox', name: `${dn} box front`, box: box(bu0 + bt, by0, D - bt, bu1 - bt, by1, D) });
          add({ ...bm, kind: 'drawerBox', name: `${dn} box back`, box: box(bu0 + bt, by0, dback, bu1 - bt, by1 - 20, dback + bt) });
          add({ ...bm, kind: 'drawerBox', mat: 'Drawer', name: `${dn} bottom`, box: box(bu0 + bt - G, by0 + g.drawerBottom, dback + bt - G, bu1 - bt + G, by0 + g.drawerBottom + g.back, D - bt + G), note: `Bottom groove: ${g.back}mm wide x ${G}mm deep @ ${g.drawerBottom}mm above the box edge` });
          hardwareExtra.runners += 1;
        }
        break;
      }
      case 'open': {
        shelfParts(si, yLow, yHigh, sec.n, true);
        elev.push({ kind: 'open', si, yb, yt });
        break;
      }
      case 'oven': case 'fridge': {
        const sz = APPLIANCE[sec.t];
        const ah = Math.min(sz.h, sh - 2 * t);
        const aw = Math.min(sz.w, W - 2 * t);
        const au0 = (x0 + x1) / 2 - aw / 2;
        appliances.push({ type: sec.t, u0: au0, u1: au0 + aw, y0: yb + t + (sec.t === 'fridge' ? 0 : 10), y1: yb + t + ah, d0: g.inset + g.back + 10, d1: D - 10, unitId: unit.id });
        elev.push({ kind: 'niche', si, type: sec.t, yb, yt });
        if (ah < sz.h) warns.push({ k: 'niche', type: sec.t, label, have: Math.round(ah), need: sz.h });
        break;
      }
      default: break;
    }
    if (sec.t === 'sink' || sec.t === 'hob') {
      const ap = APPLIANCE[sec.t];
      cutouts.push({ type: sec.t, unitId: unit.id, cu: (x0 + x1) / 2, w: Math.min(ap.w, W - 2 * t - 20), d: ap.d });
    }
  });

  /** [NEO-CLOSETS-UX30] drawer boxes INSIDE the carcass. The door of the section is the only front (inn.cover 'full'); with cover 'above' the door stops above the
   *  zone and the drawers show an inset front of their own. inn = { n, h (zone height from the section bottom), front: 'inner' | 'box', ift (inner front board mm), clear (gap behind the door mm), cover }.
   *  The drawer front plane sits `clear` behind the door's back face, so the runner (and the box depth) is that much shorter; box side clearance, bottom groove and gaps are the Drawers card's. */
  function innerDrawers(si, yb, zTop, inn) {
    const cnt = inn.n, zb = yb + t, zt = zTop - t / 2, slotH = (zt - zb) / cnt;
    const exposed = inn.cover === 'above';
    const ift = inn.front === 'inner' || exposed ? Math.max(0, inn.ift || 0) : 0;
    const Df = D - Math.max(0, inn.clear || 0), Db = Df - ift;
    const rl = runnerLen(g, Db);
    const bw = W - 2 * t - 2 * g.drawerSide;
    const fsg = g.drawerFrontSide != null ? g.drawerFrontSide : gap;
    add({ kind: 'divider', name: 'Divider', mat: 'Carcass', ptype: ptBase, view: 'internal', box: box(x0 + t, zTop - t / 2, g.inset + g.back, x1 - t, zTop + t / 2, D), edges: [{ axis: 'u', where: 'front' }], inner: true, behind: !exposed });
    for (let d = 0; d < cnt; d++) {
      const st = zt - d * slotH, sb = st - slotH;
      const an = { k: 'drawer', slide: rl * 0.7 };
      const dn = `S${si + 1} Drawer`;
      const hb = Math.max(60, slotH - MFG.boxClearV), by0 = sb + 20, by1 = by0 + hb;
      const bu0 = x0 + t + g.drawerSide, bu1 = bu0 + bw, bt = MFG.boxThk, dback = Db - rl;
      const bm = { mat: 'Drawer', ptype: 'drawer', view: 'internal', sec: si, anim: an, group, inner: true, behind: !exposed };
      if (ift > 0) {
        const fb = box(x0 + t + fsg, sb + g.drawerGap / 2, Db, x1 - t - fsg, st - g.drawerGap / 2, Df);
        const edges = [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }];
        if (exposed) {
          const front = add({ ...frontMat('drawerFront'), ptype: 'drawer', name: `${dn} front (inset)`, box: fb, sec: si, edges, anim: an, inner: true });
          const hy = fb.y1 - 40;
          addHandle(front, { u: (fb.u0 + fb.u1) / 2, y: hy, orient: 'h', holes: hand.style === 'bar' ? [[(fb.u0 + fb.u1) / 2 - hand.len / 2, hy], [(fb.u0 + fb.u1) / 2 + hand.len / 2, hy]] : hand.style === 'knob' ? [[(fb.u0 + fb.u1) / 2, hy]] : [], d: Df });
        } else add({ ...bm, kind: 'drawerBox', name: `${dn} inner front`, box: fb, edges });
      }
      add({ ...bm, kind: 'drawerBox', name: `${dn} side`, box: box(bu0, by0, dback, bu0 + bt, by1, Db), edges: [{ axis: 'd', where: 'top' }] });
      add({ ...bm, kind: 'drawerBox', name: `${dn} side`, box: box(bu1 - bt, by0, dback, bu1, by1, Db), edges: [{ axis: 'd', where: 'top' }] });
      add({ ...bm, kind: 'drawerBox', name: `${dn} box front`, box: box(bu0 + bt, by0, Db - bt, bu1 - bt, by1, Db) });
      add({ ...bm, kind: 'drawerBox', name: `${dn} box back`, box: box(bu0 + bt, by0, dback, bu1 - bt, by1 - 20, dback + bt) });
      add({ ...bm, kind: 'drawerBox', mat: 'Drawer', name: `${dn} bottom`, box: box(bu0 + bt - G, by0 + g.drawerBottom, dback + bt - G, bu1 - bt + G, by0 + g.drawerBottom + g.back, Db - bt + G), note: `Bottom groove: ${g.back}mm wide x ${G}mm deep @ ${g.drawerBottom}mm above the box edge` });
      hardwareExtra.runners += 1;
    }
  }

  function pinRows(si, yLow, yHigh, count) {
    if (!count) return;
    const a = yLow + 64, b = yHigh - 64;
    for (let y = a; y <= b + 0.01; y += MFG.pinPitch) {
      [[x0 + t, 'L'], [x1 - t, 'R']].forEach(([u, sd]) => [D - MFG.pinEdge, g.inset + g.back + MFG.pinEdge].forEach((d) => pins.push({ unitId: unit.id, u, y, d, side: sd, si })));
    }
  }

  function buildCorner() {
    const si = 0, yb = bounds[0].bot, yt = bounds[0].top;
    if (unit.type === 'blind') {
      const bw = MFG.blindW;
      const dw = W - bw;
      const hingeSide = unit.cornerHinge || 'L';
      const du0 = hingeSide === 'L' ? x0 : x0 + bw;
      leaves(si, yb, yt, 1, { width: dw, u0: du0, hinge: hingeSide });
      const fu0b = hingeSide === 'L' ? x0 + dw : x0;
      add({ ...frontMat('door'), ptype: 'cover', name: 'Blind panel', box: box(fu0b + gap, yb + gap, D, fu0b + bw - gap, yt - gap, D + dt), sec: si, edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }] });
      add({ kind: 'shelf', name: 'S1 Shelf', mat: 'Shelf', ptype: 'shelf', view: 'internal', sec: si, box: box(x0 + t + g.shelfPlay, (yb + yt) / 2, g.inset + g.back, x1 - t - g.shelfPlay, (yb + yt) / 2 + g.shelfThk, D - MFG.shelfSetback), edges: [{ axis: 'u', where: 'front' }] });
    } else if (unit.type === 'carousel') {
      leaves(si, yb, yt, 2, { bifold: true });
      const dia = Math.min(W - 2 * t, D - g.inset - g.back) - 20;
      [0.33, 0.66].forEach((f, j) => add({ kind: 'carousel', name: `Carousel shelf ${j + 1}`, mat: 'Shelf', ptype: 'shelf', view: 'internal', sec: si, round: true,
        box: box((x0 + x1) / 2 - dia / 2, yb + (yt - yb) * f - g.shelfThk / 2, g.inset + g.back + 10, (x0 + x1) / 2 + dia / 2, yb + (yt - yb) * f + g.shelfThk / 2, g.inset + g.back + 10 + dia) }));
      hardwareExtra.poles += 1;
    } else {
      const chord = Math.max(300, Math.round(Math.SQRT2 * (W - D)));
      const cu = (x0 + x1) / 2;
      add({ ...frontMat('door'), ptype: 'door', name: 'Diagonal door', box: box(cu - chord / 2 + gap, yb + gap, D - 30, cu + chord / 2 - gap, yt - gap, D - 30 + dt), sec: si, rotY: Math.PI / 4, edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }] });
    }
  }

  /* map rectangles for the elevation (fu, y) */
  return { parts, hinges, handles, pins, joints, appliances, cutouts, leds, elev, bounds, backPart, tall, rowTag, W, H, D, y0, fu0, tag, label, group, unit, rk, row };
}

let warns = [];
let hardwareExtra = { runners: 0, poles: 0 };

/* ---- runs ------------------------------------------------------------------ */
const GROUP_LABEL = { main: '', left: 'L-Left ', right: 'L-Right ', run2: 'Run 2 ', pen: 'Peninsula ', isl: 'Island ' };
const RUN_LABEL = { main: 'Main', left: 'L-Left', right: 'L-Right', run2: 'Run 2', pen: 'Peninsula', isl: 'Island' };
/** the letter in front of a run's map numbers in the cut list (main has none): L / R as before, G(alley run 2), P(eninsula), I(sland) */
export const RUN_PREFIX = { main: '', left: 'L', right: 'R', run2: 'G', pen: 'P', isl: 'I' };

/** where a run stands in the room (mm, world frame of the 3D view: x along the main run, z towards the room, rotY about the vertical).
 *  left / right legs keep the placement Kitchen3D always used; a galley run 2 and an island face the main run (rotated 180 degrees about the
 *  point (x, z)); a peninsula is placed like the leg on its side. */
export function runFrame(model, rk, L, Lmain, D, frontMain) {
  const g = model.g; const xl = model.xl || {};
  const front = (d) => d + g.doorThk + g.overhang; // worktop front edge measured from the run's back
  if (rk === 'right') return { x: Lmain, z: 0, rot: -Math.PI / 2 };
  if (rk === 'left') return { x: 0, z: L, rot: Math.PI / 2 };
  if (rk === 'pen') return xl.side === 'left' ? { x: 0, z: L, rot: Math.PI / 2 } : { x: Lmain, z: 0, rot: -Math.PI / 2 };
  if (rk === 'run2' || rk === 'isl') {
    const clear = rk === 'run2' ? xl.aisle : xl.gap;
    const off = rk === 'isl' ? (xl.off || 0) : 0;
    return { x: off + L, z: frontMain + clear + front(D), rot: Math.PI };
  }
  return { x: 0, z: 0, rot: 0 };
}

export function buildScene(model) {
  warns = [];
  hardwareExtra = { runners: 0, poles: 0 };
  const g = model.g;
  const runs = [];
  const all = { parts: [], hinges: [], handles: [], pins: [], joints: [], appliances: [], cutouts: [], leds: [] };
  const rkList = activeRunKeys(model); // main, the legs that are on, and (UX29) the run 2 / peninsula / island of the layout
  const xl = model.xl || null;
  const Lmain = rowWidth(model.runs.main.base);
  const frontMain = runDepth(model, 'main') + g.doorThk + g.overhang;
  rkList.forEach((rk) => {
    const run = model.runs[rk];
    const L = rowWidth(run.base);
    const flip = isFlipRun(model, rk);
    const D = runDepth(model, rk);
    const wallH = runWallH(model, rk);
    const hasTop = runHasTop(model, rk);
    const off = wallOffset(run.base);
    const hiddenBase = runHiddenBase(model, rk);
    const hiddenWall = rk === 'main' ? 0 : g.wallD;
    const openBack = runOpenBack(rk); // peninsula / island: no wall behind, finished panels
    const units = [];
    const rowSpec = [
      ['base', run.base, 0, g.plinthH, null, D],
      ...(openBack ? [] : [['wall', run.wall, off, lowerH(g), wallH, g.wallD]]),
      ...(hasTop ? [['top', run.top, off, lowerH(g) + wallH, g.topH, g.wallD]] : []),
    ];
    rowSpec.forEach(([row, arr, start, y0, H, DD]) => {
      let u = start;
      arr.forEach((unit, idx) => {
        if (unit.hidden) { u += unit.w; return; }
        const fu0 = flip ? L - (u + unit.w) : u;
        const tall = isTall(unit);
        const rowName = row === 'base' ? (tall ? 'Tall' : 'Base') : row === 'wall' ? 'Wall' : 'Top';
        const label = `${GROUP_LABEL[rk]}${row === 'base' ? 'Base' : row === 'wall' ? 'Wall' : 'Top'} ${idx + 1}`;
        const tag = `${row === 'base' ? 'B' : row === 'wall' ? 'W' : 'T'}${idx + 1}`;
        const inst = buildUnit(model, {
          unit, rk, row, fu0, y0, H: row === 'base' ? (tall ? tallH(unit) : g.baseH) : (unit.h ? Math.min(unit.h, H) : H), D: row === 'base' ? (unit.d || D) : DD, /* unit.d: a category studio's slimmer tall unit (NEO-CATEGORIES-UX26); a kitchen unit has none */
          group: `${GROUP_LABEL[rk]}${rowName}`, label, tag,
        });
        inst.u0 = u; inst.idx = idx;
        units.push(inst);
        u += unit.w;
      });
    });
    /* worktop / backsplash / plinth */
    const counters = [], splashes = [];
    const baseUnits = units.filter((x) => x.row === 'base');
    let seg = null; const segs = [];
    baseUnits.forEach((x) => {
      if (isTall(x.unit)) { if (seg) { segs.push(seg); seg = null; } return; }
      if (seg && x.u0 - seg.u1 > 0.5) { segs.push(seg); seg = null; } // a unit that is turned off (hidden) leaves a gap: no worktop over it
      if (!seg) seg = { u0: x.u0, u1: x.u0 + x.W, units: [x] }; else { seg.u1 = x.u0 + x.W; seg.units.push(x); }
    });
    if (seg) segs.push(seg);
    const yCt = g.plinthH + g.baseH;
    /* UX29 peninsula / island: the worktop covers the finished end panel(s) and the finished back, and (option) overhangs the back for seating */
    const dtp = g.doorThk;
    const xo = openBack && xl ? {
      endThk: xl.endPanel ? dtp : 0, // a finished end panel of the board thickness: the worktop runs out flush with it
      openStart: rk === 'isl', openEnd: true, // island: both ends open; peninsula: only the far end (logical end) - the start is the corner
      d0: -((xl.backPanel ? dtp : 0) + (xl.seatOn ? xl.seatD : 0)),
    } : null;
    segs.forEach((s) => {
      let su0 = s.u0, su1 = s.u1;
      if (su0 < hiddenBase) su0 = Math.min(su1, hiddenBase); // the corner is covered by the main run worktop
      if (su1 - su0 <= 0) return;
      if (xo) { // only a slab that reaches the open end runs out over the end panel (a tall unit at the end has none)
        if (xo.openStart && s.u0 <= 0.5) su0 -= xo.endThk;
        if (xo.openEnd && s.u1 >= L - 0.5) su1 += xo.endThk;
      }
      const pieces = Math.ceil((su1 - su0) / MFG.maxSlab);
      const each = (su1 - su0) / pieces;
      for (let i = 0; i < pieces; i++) {
        const a = su0 + i * each, b = a + each;
        const fa = flip ? L - b : a, fb = flip ? L - a : b;
        counters.push({ u0: fa, u1: fb, y0: yCt, y1: yCt + g.counterThk, d0: xo ? xo.d0 : 0, d1: D + g.doorThk + g.overhang, runKey: rk, cutouts: [] });
        if (g.backsplashH > 0 && !openBack) splashes.push({ u0: fa, u1: fb, y0: yCt + g.counterThk, y1: yCt + g.counterThk + g.backsplashH, d0: 0, d1: MFG.bsThk, runKey: rk });
      }
    });
    baseUnits.forEach((x) => x.cutouts.forEach((c) => {
      const ct = counters.find((k) => c.cu >= k.u0 && c.cu <= k.u1);
      if (ct) ct.cutouts.push({ ...c, u0: c.cu - c.w / 2, u1: c.cu + c.w / 2, d0: (ct.d1 + (ct.d0 || 0) - c.d) / 2, d1: (ct.d1 + (ct.d0 || 0) + c.d) / 2, y: ct.y1 });
    }));
    /* island: an INDICATIVE hob / sink cut-out (centre of the longest slab) when none of its units provides one. It is a hint in the worktop
     * note and the 3D view only: no labour hardware line, nothing is cut from the model. */
    if (rk === 'isl' && xl && xl.hint && xl.hint !== 'none' && !baseUnits.some((x) => x.cutouts.some((c) => c.type === xl.hint)) && counters.length) {
      const ct = counters.reduce((a, b) => (b.u1 - b.u0 > a.u1 - a.u0 ? b : a), counters[0]);
      const ap = APPLIANCE[xl.hint]; const cu = (ct.u0 + ct.u1) / 2; const w = Math.min(ap.w, ct.u1 - ct.u0 - 100);
      if (w > 200) ct.cutouts.push({ type: xl.hint, hint: true, unitId: null, cu, w, d: ap.d, u0: cu - w / 2, u1: cu + w / 2, d0: (ct.d1 + (ct.d0 || 0) - ap.d) / 2, d1: (ct.d1 + (ct.d0 || 0) + ap.d) / 2, y: ct.y1 });
    }
    /* UX29 finished panels (door board, "cover panel" family): one on each open END of the run and one on the open BACK of every base unit.
     * They belong to the unit they cover, so selection, hide / show, BOM and every export treat them as that unit's parts. */
    if (xo) {
      const bp = xl.backPanel ? dtp : 0;
      const open = baseUnits.filter((x) => !x.unit.hidden);
      const mk = (x, o) => {
        const b = o.box; const n = x.parts.length;
        x.parts.push({ id: `${x.unit.id}#${o.tagId}`, unitId: x.unit.id, runKey: rk, row: 'base', group: x.group, qty: 1, grain: 'auto', note: '', kind: 'door', mat: 'Door', ptype: 'cover', view: 'front', grainFront: x.unit.grainFront, panelOf: o.tagId, ...o.extra, name: o.name, box: b, edges: o.edges, ext: { w: r2(b.u1 - b.u0), d: r2(b.d1 - b.d0), h: r2(b.y1 - b.y0) } });
        void n;
      };
      if (xl.backPanel) {
        open.forEach((x) => mk(x, { tagId: 'back', name: 'Finished back panel', box: { u0: x.fu0, y0: 0, d0: -bp, u1: x.fu0 + x.W, y1: x.y0 + x.H, d1: 0 }, edges: [{ axis: 'u', where: 'top' }], extra: { noMap: true } }));
      }
      if (xl.endPanel && open.length) {
        const ends = [];
        const lo = open.reduce((a, b) => (b.fu0 < a.fu0 ? b : a), open[0]); const hi = open.reduce((a, b) => (b.fu0 + b.W > a.fu0 + a.W ? b : a), open[0]);
        /* fu side of the logical start / end of the run: not flipped = (min, max); flipped (a peninsula on the left) = (max, min) */
        if (rk === 'isl') { ends.push(['min', lo], ['max', hi]); } else { ends.push(flip ? ['min', lo] : ['max', hi]); }
        ends.forEach(([sd, x]) => {
          const uu = sd === 'min' ? x.fu0 : x.fu0 + x.W;
          mk(x, { tagId: `end${sd}`, name: 'Finished end panel', box: { u0: sd === 'min' ? uu - dtp : uu, y0: 0, d0: -bp, u1: sd === 'min' ? uu : uu + dtp, y1: x.y0 + x.H, d1: D + dtp }, edges: [{ axis: 'y', where: 'front' }, { axis: 'd', where: 'top' }] });
        });
      }
    }
    const plinth = baseUnits.length ? { u0: flip ? 0 : hiddenBase, u1: flip ? L - hiddenBase : L, y0: 0, y1: g.plinthH, d0: D - g.plinthSetback - g.board, d1: D - g.plinthSetback, runKey: rk } : null;
    if (plinth && plinth.u1 <= plinth.u0) { plinth.u1 = plinth.u0; }
    const wallEnd = off + rowWidth(run.wall);
    runs.push({ key: rk, L, D, flip, wallH, hasTop, off, wallEnd, hiddenBase, hiddenWall, units, counters, splashes, plinth, label: RUN_LABEL[rk], frame: runFrame(model, rk, L, Lmain, D, frontMain), openBack });
    units.forEach((x) => { Object.keys(all).forEach((k) => all[k].push(...x[k])); });
  });

  /* bounds in world metres-free mm: main along x, legs along z */
  const Lm = runs[0].L;
  const bounds = { x0: 0, x1: Lm, z0: 0, z1: runs[0].D + g.doorThk + g.overhang, h: 0 };
  runs.forEach((r) => {
    if (r.key === 'left') { bounds.z1 = Math.max(bounds.z1, r.L); }
    if (r.key === 'right') { bounds.z1 = Math.max(bounds.z1, r.L); }
    if (r.key === 'pen') { // projects like a leg; its open back / end overhang the main run's outline
      const ovh = xl ? (xl.backPanel ? g.doorThk : 0) + (xl.seatOn ? xl.seatD : 0) : 0;
      bounds.z1 = Math.max(bounds.z1, r.L + (xl && xl.endPanel ? g.doorThk : 0));
      if (xl && xl.side === 'left') bounds.x0 = Math.min(bounds.x0, -ovh); else bounds.x1 = Math.max(bounds.x1, Lm + ovh);
    }
    if (r.key === 'run2' || r.key === 'isl') { // the run behind the aisle: its back plane is at frame.z (plus the open back of an island)
      const ovh = r.key === 'isl' && xl ? (xl.backPanel ? g.doorThk : 0) + (xl.seatOn ? xl.seatD : 0) : 0;
      bounds.z1 = Math.max(bounds.z1, r.frame.z + ovh);
      bounds.x0 = Math.min(bounds.x0, r.frame.x - r.L - (r.key === 'isl' && xl && xl.endPanel ? g.doorThk : 0));
      bounds.x1 = Math.max(bounds.x1, r.frame.x + (r.key === 'isl' && xl && xl.endPanel ? g.doorThk : 0));
    }
  });
  const top = Math.max(...runs.flatMap((r) => r.units.map((x) => x.y0 + x.H)), 0);
  bounds.h = top;
  return { runs, ...all, warns: [...warns], hardwareExtra: { ...hardwareExtra }, bounds, model };
}

/* ---- map numbering (elevation numbered bubbles; also shown in the cut list) -- */
export function elevationItems(scene, rk, opts = {}) {
  const run = scene.runs.find((r) => r.key === rk);
  if (!run) return [];
  const items = [];
  let no = 0;
  const push = (it) => { items.push({ no: ++no, ...it }); };
  run.units.forEach((x) => {
    const carcassType = x.row === 'base' ? 'baseUnit' : 'wallUnit';
    if (!x.noCarcass) push({ type: carcassType, unitId: x.unit.id, row: x.row, tag: x.tag, label: x.label, u0: x.fu0, u1: x.fu0 + x.W, y0: x.y0, y1: x.y0 + x.H, size: `${x.W} x ${x.D} x ${x.H}`, mat: 'Carcass', carcass: true });
    x.parts.filter((p) => p.view === 'front' && !p.noMap).forEach((p) => {
      push({ type: p.ptype, partId: p.id, unitId: x.unit.id, row: x.row, tag: x.tag, label: `${x.label} - ${p.name}`, u0: (p.elevBox || p.box).u0, u1: (p.elevBox || p.box).u1, y0: (p.elevBox || p.box).y0, y1: (p.elevBox || p.box).y1, size: `${p.ext.w} x ${p.ext.d} x ${p.ext.h}`, mat: p.mat, anim: p.anim, rotY: p.rotY });
    });
    x.elev.filter((e) => e.kind === 'open' || e.kind === 'niche').forEach((e) => {
      push({ type: 'open', unitId: x.unit.id, row: x.row, tag: x.tag, label: `${x.label} - ${e.kind === 'niche' ? e.type : 'open'}`, u0: x.fu0 + x.unit.w * 0 + scene.model.g.board, u1: x.fu0 + x.W - scene.model.g.board, y0: e.yb + (e.si === x.elev.filter((q) => q.kind === 'sec').length - 1 ? scene.model.g.board : 0), y1: e.yt - (e.si === 0 ? scene.model.g.board : 0), size: '', mat: 'Shelf', niche: e.type, ...(e.label ? { nicheLabel: e.label } : null) });
    });
  });
  run.counters.forEach((c, i) => push({ type: 'counter', label: `Countertop ${i + 1}`, u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, size: `${Math.round(c.u1 - c.u0)} x ${Math.round(c.d1)} x ${c.y1 - c.y0}`, mat: 'Countertop', row: 'base' }));
  run.splashes.forEach((c, i) => push({ type: 'counter', label: `Backsplash ${i + 1}`, u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, size: `${Math.round(c.u1 - c.u0)} x ${c.d1} x ${Math.round(c.y1 - c.y0)}`, mat: 'Countertop', row: 'base' }));
  if (run.plinth) push({ type: 'plinth', label: 'Plinth', u0: run.plinth.u0, u1: run.plinth.u1, y0: 0, y1: run.plinth.y1, size: `${Math.round(run.plinth.u1 - run.plinth.u0)} x ${scene.model.g.board} x ${run.plinth.y1}`, mat: 'Plinth', row: 'base' });
  void opts;
  return items;
}

export { normDigits };
export const DEFAULT_GRAIN_KINDS = DEFAULT_GRAIN;
