/* Neo Kitchen Designer UX-23 - pure rules for the floating assistant window (the default state of the assistant): a compact window over the
 * drawing that takes NO layout width. Position and size are the person's (dragged / resized, remembered); these rules keep it usable: inside
 * the body box at every size, never smaller than a chat needs, its title bar always reachable, and - by default - placed clear of the toolbar
 * row (top) and the selected-part card (bottom centre).
 * Coordinates are px from the top-left of the .nk-body box (physical, so RTL needs no special case once placed). */

export const FLOAT = { minW: 320, minH: 320, defW: 400, defH: 560, pad: 8, keepBar: 56, step: 16, bigStep: 64, tools: 84, foot: 84, top: 112 };

export function clampFloatRect(r, W, H) {
  const bw = Math.max(FLOAT.minW + 2 * FLOAT.pad, Math.floor(+W || 0));
  const bh = Math.max(FLOAT.minH + 2 * FLOAT.pad, Math.floor(+H || 0));
  const w = Math.min(bw - 2 * FLOAT.pad, Math.max(FLOAT.minW, Math.round(+r.w || FLOAT.defW)));
  const x = Math.min(bw - w - FLOAT.pad, Math.max(FLOAT.pad, Math.round(Number.isFinite(+r.x) ? +r.x : 0)));
  const y = Math.min(bh - FLOAT.keepBar - FLOAT.pad, Math.max(FLOAT.pad, Math.round(Number.isFinite(+r.y) ? +r.y : 0)));
  const h = Math.min(bh - y - FLOAT.pad, Math.max(FLOAT.minH, Math.round(+r.h || FLOAT.defH)));
  return { x, y, w, h: Math.max(Math.min(h, bh - 2 * FLOAT.pad), Math.min(FLOAT.minH, bh - y - FLOAT.pad)) };
}

/** first placement: the inline-end side, just clear of the viewport tools column, below the toolbar row and above the selected-part card */
export function defaultFloatRect(W, H, rtl = false) {
  const bw = Math.max(FLOAT.minW + 2 * FLOAT.pad, Math.floor(+W || 0));
  const bh = Math.max(FLOAT.minH + 2 * FLOAT.pad, Math.floor(+H || 0));
  const w = Math.min(FLOAT.defW, bw - 2 * FLOAT.pad);
  const y = bh - FLOAT.top - FLOAT.pad >= FLOAT.minH ? FLOAT.top : FLOAT.pad; // below the toolbar + mode-bar rows when the body is tall enough
  const h = Math.min(FLOAT.defH, Math.max(FLOAT.minH, bh - y - FLOAT.foot >= FLOAT.minH ? bh - y - FLOAT.foot : bh - y - FLOAT.pad));
  return clampFloatRect({ x: rtl ? FLOAT.tools : bw - w - FLOAT.tools, y, w, h }, bw, bh);
}

export const moveFloatRect = (r, dx, dy, W, H) => clampFloatRect({ ...r, x: r.x + dx, y: r.y + dy }, W, H);
/** the resize grip is at the bottom inline-end corner: bottom-right in LTR, bottom-left in RTL (growing then moves the left edge) */
export const resizeFloatRect = (r, dw, dh, W, H, rtl = false) => (rtl
  ? clampFloatRect({ x: r.x - dw, y: r.y, w: r.w + dw, h: r.h + dh }, W, H)
  : clampFloatRect({ ...r, w: r.w + dw, h: r.h + dh }, W, H));
export const cleanFloatRect = (r) => (r && ['x', 'y', 'w', 'h'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]))
  ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) } : null);
