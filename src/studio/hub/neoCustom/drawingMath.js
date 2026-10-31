/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - the pure side of the technical drawing (no React, no DOM).
 *   projection   a solved box -> a rectangle in one of three views (front x-y, side z-y, top x-z), screen y down
 *   sheet layout the three views on one sheet, sized to the measured container so the text is always ~12 px
 *   culling      parts hidden behind a nearer opaque part are not drawn (unless "Internal" is on)
 *   outlines     a board with notches / rounded corners is drawn with its real outline in the view where its face is seen
 *   dragging     moveAxis / applyMove turn a mouse drag into the NEW anchor offsets; snapMove snaps to edges, centres and a 5 mm grid
 * Third-angle layout: FRONT (x-y) top-left, SIDE seen from the right (front of the piece on the left) to its right, TOP (x-z, front at the bottom) below.
 * ===========================================================================*/
import { AXES } from './customModel';

export const VIEW_KEYS = ['front', 'side', 'top'];
export const VIEW_NAME = { front: ['Front', 'أمامي'], side: ['Side', 'جانبي'], top: ['Top', 'علوي'] };
/** which two model axes a view shows (horizontal, vertical) and the one it looks along */
export const VIEW_AXES = { front: { h: 'x', v: 'y', depth: 'z' }, side: { h: 'z', v: 'y', depth: 'x' }, top: { h: 'x', v: 'z', depth: 'y' } };
const r2 = (v) => Math.round(v * 100) / 100;

/** a box in a view: { x0, x1, y0, y1 } (screen mm, y DOWN, origin at the view's top-left), plus `near` = how close to the viewer the part's nearest face is */
export function viewRect(box, view, dims) {
  const H = dims.h; const D = dims.d;
  if (view === 'side') return { x0: r2(D - box.z1), x1: r2(D - box.z0), y0: r2(H - box.y1), y1: r2(H - box.y0), near: box.x1, far: box.x0 };
  if (view === 'top') return { x0: r2(box.x0), x1: r2(box.x1), y0: r2(box.z0), y1: r2(box.z1), near: box.y1, far: box.y0 };
  return { x0: r2(box.x0), x1: r2(box.x1), y0: r2(H - box.y1), y1: r2(H - box.y0), near: box.z1, far: box.z0 };
}
export const viewSize = (view, dims) => (view === 'side' ? { w: dims.d, h: dims.h } : view === 'top' ? { w: dims.w, h: dims.d } : { w: dims.w, h: dims.h });
/** model axis -> sign / origin of its position inside a view, used by the drag code: moving +dx on screen changes the model axis by sign * dx */
export function dragAxes(view) {
  if (view === 'side') return { h: { axis: 'z', sign: -1 }, v: { axis: 'y', sign: -1 } };
  if (view === 'top') return { h: { axis: 'x', sign: 1 }, v: { axis: 'z', sign: 1 } };
  return { h: { axis: 'x', sign: 1 }, v: { axis: 'y', sign: -1 } };
}

/* ---- sheet layout ----------------------------------------------------------------------------------------------- */
export const SHEET_VIEWS = { all: ['front', 'side', 'top'], front: ['front'], side: ['side'], top: ['top'] };

/** one pass: margins from `mmpp` (millimetres per screen pixel) */
function layoutOnce(dims, mode, mmpp) {
  const { w, h, d } = dims;
  const M = 56 * mmpp; // room for the dimension lines + text on the outside
  const G = Math.max(0.06 * Math.max(w, h, d), 96 * mmpp); // gap between views (dimension lines of two views live here)
  const keys = SHEET_VIEWS[mode] || SHEET_VIEWS.all;
  const pos = {};
  if (keys.length === 1) {
    const s = viewSize(keys[0], dims);
    pos[keys[0]] = { ox: M, oy: M, w: s.w, h: s.h };
    return { vbW: s.w + 2 * M, vbH: s.h + 2 * M, views: pos, M, G, mmpp };
  }
  pos.front = { ox: M, oy: M, w, h };
  pos.side = { ox: M + w + G, oy: M, w: d, h };
  pos.top = { ox: M, oy: M + h + G, w, h: d };
  return { vbW: M + w + G + d + M, vbH: M + h + G + d + M, views: pos, M, G, mmpp };
}

/** a layout that fits the container (cw x ch px): iterates until the margin in mm matches ~56 px, so labels never collide with the border */
export function fitSheet(dims, mode, cw, ch) {
  const W = Math.max(120, cw || 800); const Hh = Math.max(120, ch || 520);
  let mmpp = Math.max(dims.w, dims.h, dims.d) / 400;
  let lay = layoutOnce(dims, mode, mmpp);
  for (let i = 0; i < 6; i += 1) {
    const scale = Math.min(W / lay.vbW, Hh / lay.vbH);
    const next = 1 / scale;
    if (Math.abs(next - mmpp) / mmpp < 0.004) break;
    mmpp = next; lay = layoutOnce(dims, mode, mmpp);
  }
  const scale = Math.min(W / lay.vbW, Hh / lay.vbH);
  return { ...lay, scale, mmpp: 1 / scale, fs: 12 / scale };
}

/* ---- what is visible --------------------------------------------------------------------------------------------- */
const OPAQUE = (it) => it.part.type !== 'glass' && it.part.type !== 'hardware' && it.part.type !== 'group';
const inside = (a, b, tol = 0.6) => a.x0 >= b.x0 - tol && a.x1 <= b.x1 + tol && a.y0 >= b.y0 - tol && a.y1 <= b.y1 + tol;

/**
 * The items to draw in a view, back to front. Each: { it, r } (r = viewRect). Unless `internal`, an item completely covered by a NEARER opaque item is dropped.
 * Groups are never drawn. Hardware is drawn (it is small).
 */
export function visibleItems(items, view, dims, { internal = false } = {}) {
  const list = items.filter((it) => it.part.type !== 'group').map((it) => ({ it, r: viewRect(it.box, view, dims) }));
  list.sort((a, b) => a.r.near - b.r.near || a.r.far - b.r.far);
  if (internal) return list;
  return list.filter((q) => !list.some((o) => o !== q && OPAQUE(o.it) && o.it.base !== q.it.base && o.r.near > q.r.near + 0.5 && inside(q.r, o.r)));
}

/* ---- outlines (notch / radius) ---------------------------------------------------------------------------------- */
const arc = (cx, cy, r, a0, a1, n = 6) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });

/**
 * The polygon (screen mm) of a flat board seen face-on, with its notches and rounded corners; null when the board has none or is not seen face-on.
 * `faceOn`: the view axes are the board's two long axes. The cut-out corners are given in the cut sheet (L horizontal, W vertical, W up): tl tr bl br.
 */
/** [NEO-OUTPUT-UX34] `segs` = segments per rounded corner (default 6 = what the drawing always used); `arcs` = keep each rounded corner as ONE { arc, cx, cy, r, a0, a1 } item (screen angles, y down) instead of its polyline, for the DXF's true ARC entities */
export function outlineOf(r, cuts, { transposed = false, segs = 6, arcs = false } = {}) {
  const cs = (cuts || []).filter((c) => c.k === 'notch' || c.k === 'radius');
  if (!cs.length) return null;
  const w = r.x1 - r.x0; const h = r.y1 - r.y0;
  /* sheet corner -> screen corner; a board whose long side is vertical on screen is the cut sheet turned a quarter turn */
  const SC = { tl: [0, 0], tr: [1, 0], bl: [0, 1], br: [1, 1] };
  const cut = {};
  cs.forEach((c) => { const t = SC[c.c]; const m = transposed ? [t[1], t[0]] : t; cut[`${m[0]}${m[1]}`] = c; });
  const P = [];
  const A = (cx, cy, rr, a0, a1) => (arcs ? [{ arc: true, cx, cy, r: rr, a0, a1 }] : arc(cx, cy, rr, a0, a1, segs));
  const corner = (ix, iy) => {
    const c = cut[`${ix}${iy}`]; const X = r.x0 + ix * w; const Y = r.y0 + iy * h;
    if (!c) { P.push([X, Y]); return; }
    if (c.k === 'notch') {
      const [a, b] = transposed ? [c.h, c.w] : [c.w, c.h];
      const nw = Math.min(a, w * 0.9); const nh = Math.min(b, h * 0.9);
      if (ix === 0 && iy === 0) P.push([X, Y + nh], [X + nw, Y + nh], [X + nw, Y]);
      else if (ix === 1 && iy === 0) P.push([X - nw, Y], [X - nw, Y + nh], [X, Y + nh]);
      else if (ix === 1 && iy === 1) P.push([X, Y - nh], [X - nw, Y - nh], [X - nw, Y]);
      else P.push([X + nw, Y], [X + nw, Y - nh], [X, Y - nh]);
      return;
    }
    const rr = Math.min(c.r, Math.min(w, h) / 2);
    if (ix === 0 && iy === 0) P.push(...A(X + rr, Y + rr, rr, Math.PI, Math.PI * 1.5));
    else if (ix === 1 && iy === 0) P.push(...A(X - rr, Y + rr, rr, Math.PI * 1.5, Math.PI * 2));
    else if (ix === 1 && iy === 1) P.push(...A(X - rr, Y - rr, rr, 0, Math.PI / 2));
    else P.push(...A(X + rr, Y - rr, rr, Math.PI / 2, Math.PI));
  };
  corner(0, 0); corner(1, 0); corner(1, 1); corner(0, 1);
  return P.map((q) => (q.arc ? { ...q, cx: r2(q.cx), cy: r2(q.cy), r: r2(q.r) } : [r2(q[0]), r2(q[1])]));
}
export const pathOf = (pts) => (pts ? `M${pts.map((p) => `${p[0]} ${p[1]}`).join('L')}Z` : '');

/* ---- dragging --------------------------------------------------------------------------------------------------- */
/** the constraint after the part moves +d mm along an axis (the part keeps its size) */
export function moveAxis(a, d) {
  switch (a.a) {
    case 'max': return { ...a, o: r2(a.o - d) };
    case 'fill': return { ...a, o: r2(a.o + d), e: r2(a.e - d) };
    case 'before': return { ...a, o: r2(a.o - d) };
    default: return { ...a, o: r2(a.o + d) }; // min, center, after
  }
}
/** a drag of the part `id` by { x, y, z } mm (any may be 0 / missing) -> new design. Repeated parts are not moved along their repeat axis. */
export function applyMove(design, id, delta) {
  return {
    ...design,
    parts: design.parts.map((p) => {
      if (p.id !== id) return p;
      const q = { ...p };
      AXES.forEach((k) => {
        const d = delta && delta[k]; if (!d) return;
        if (p.rep && p.rep.axis === k) { q[k] = { ...p[k], o: r2(p[k].o + d), e: r2(p[k].e - d) }; return; } // moves the whole row of copies
        q[k] = moveAxis(p[k], d);
      });
      return q;
    }),
  };
}

/**
 * Snap a drag. `items` = solved instances, `id` = the design part being moved (all its instances move), `delta` = { axis: mm } for the two axes of the view,
 * `tol` = snap distance in mm (about 6 px). Returns { delta, guides:[{ axis, at, kind }] }; an axis snaps to the nearest candidate edge / centre of another part,
 * of the parent or of the envelope, else the drag is rounded to whole millimetres (`grid`). An axis the pointer did not move (delta 0) is never touched.
 */
export function snapMove(solved, design, id, delta, tol, { grid = 1, on = true } = {}) {
  const moving = solved.items.filter((it) => it.base === id);
  const out = { ...delta }; const guides = [];
  if (!moving.length) return { delta: out, guides };
  const part = moving[0].part;
  const parentBox = part.parent && solved.byBase.get(part.parent) ? solved.byBase.get(part.parent)[0].box : solved.root;
  const others = solved.items.filter((it) => it.base !== id && it.part.type !== 'group' && it.part.type !== 'hardware');
  Object.keys(delta).forEach((k) => {
    const d = delta[k]; if (!AXES.includes(k)) return;
    if (!d) { out[k] = 0; return; } // the pointer did not move along this axis: leave the part where it is
    const lo = Math.min(...moving.map((m) => m.box[`${k}0`])) + d; const hi = Math.max(...moving.map((m) => m.box[`${k}1`])) + d; const mid = (lo + hi) / 2;
    if (!on) { out[k] = Math.round(d * 2) / 2; return; }
    const cands = [[solved.root[`${k}0`], 'envelope'], [solved.root[`${k}1`], 'envelope'], [(solved.root[`${k}0`] + solved.root[`${k}1`]) / 2, 'envelope'],
      [parentBox[`${k}0`], 'parent'], [parentBox[`${k}1`], 'parent'], [(parentBox[`${k}0`] + parentBox[`${k}1`]) / 2, 'parent']];
    others.forEach((o) => { cands.push([o.box[`${k}0`], 'part'], [o.box[`${k}1`], 'part'], [(o.box[`${k}0`] + o.box[`${k}1`]) / 2, 'center']); });
    let best = null;
    [[lo, 'lo'], [hi, 'hi'], [mid, 'mid']].forEach(([m, which]) => {
      cands.forEach(([c, kind]) => {
        const dist = c - m; const ad = Math.abs(dist);
        if (ad <= tol && (!best || ad < best.ad - 1e-6 || (Math.abs(ad - best.ad) < 1e-6 && kind === 'part' && best.kind !== 'part'))) best = { ad, shift: dist, c, kind, which };
      });
    });
    if (best) { out[k] = r2(d + best.shift); guides.push({ axis: k, at: r2(best.c), kind: best.kind }); }
    else out[k] = Math.round(d / grid) * grid;
  });
  Object.keys(out).forEach((k) => { out[k] = r2(out[k]); });
  return { delta: out, guides };
}

/* ---- dimension chains -------------------------------------------------------------------------------------------- */
/** the unique edge positions (mm, in view coordinates) of the visible items along the horizontal or vertical axis, for the "internal" dimension chain */
export function chainStops(list, axis) {
  const set = new Set();
  list.forEach(({ r }) => { if (axis === 'h') { set.add(r2(r.x0)); set.add(r2(r.x1)); } else { set.add(r2(r.y0)); set.add(r2(r.y1)); } });
  return [...set].sort((a, b) => a - b);
}
/** gaps between consecutive repeated copies of a part along its repeat axis, as { from, to, len } in the view's own coordinates (empty if the part is not repeated or not seen along that axis) */
export function repGaps(items, view, dims) {
  const out = [];
  const seen = new Map();
  items.forEach((it) => { if (it.n > 2 || (it.n > 1 && it.part.rep.mode === 'even')) { if (!seen.has(it.base)) seen.set(it.base, []); seen.get(it.base).push(it); } }); // two copies flush to the ends are just the inner width: no gap line
  seen.forEach((arr) => {
    const k = arr[0].part.rep.axis; const va = VIEW_AXES[view];
    const horiz = va.h === k; const vert = va.v === k; if (!horiz && !vert) return;
    const rs = arr.map((it) => viewRect(it.box, view, dims)).sort((a, b) => (horiz ? a.x0 - b.x0 : a.y0 - b.y0));
    for (let i = 0; i + 1 < rs.length; i += 1) {
      const a = horiz ? rs[i].x1 : rs[i].y1; const b = horiz ? rs[i + 1].x0 : rs[i + 1].y0;
      if (b - a > 0.5) out.push({ base: arr[0].base, axis: horiz ? 'h' : 'v', from: r2(a), to: r2(b), len: r2(b - a), r: rs[i] });
    }
  });
  return out;
}

/* ---- banded edges ------------------------------------------------------------------------------------------------ */
const U2A = { u: 'x', d: 'z', y: 'y' }; // the cut-list axis letters -> model axes
const SIDE = {
  front: { x: { min: 'left', max: 'right' }, y: { min: 'bottom', max: 'top' } },
  side: { z: { min: 'right', max: 'left' }, y: { min: 'bottom', max: 'top' } },
  top: { x: { min: 'left', max: 'right' }, z: { min: 'top', max: 'bottom' } },
};
/**
 * The banded edges of a flat board as line segments [[x1,y1],[x2,y2]] in the view, only when the board's FACE is seen (its thin axis looks along the view).
 * `aL, aW` = the cut list's long / wide axes ('u' | 'd' | 'y'), `eb` = ['L1','L2','W1','W2']: L1 / L2 are the long edges at the low / high end of the wide axis,
 * W1 / W2 the short edges at the low / high end of the long axis - the same labels the cut list prints.
 */
export function edgeSegments(r, eb, aL, aW, view) {
  const lm = U2A[aL]; const wm = U2A[aW];
  const sd = SIDE[view];
  if (!sd || !sd[lm] || !sd[wm] || !eb || !eb.length) return [];
  const seg = (side) => (side === 'left' ? [[r.x0, r.y0], [r.x0, r.y1]] : side === 'right' ? [[r.x1, r.y0], [r.x1, r.y1]] : side === 'top' ? [[r.x0, r.y0], [r.x1, r.y0]] : [[r.x0, r.y1], [r.x1, r.y1]]);
  const out = [];
  eb.forEach((c) => {
    if (c === 'L1') out.push(seg(sd[wm].min)); else if (c === 'L2') out.push(seg(sd[wm].max));
    else if (c === 'W1') out.push(seg(sd[lm].min)); else if (c === 'W2') out.push(seg(sd[lm].max));
  });
  return out;
}
