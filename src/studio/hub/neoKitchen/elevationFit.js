/* Neo Kitchen Designer UX-23 - pure drawing-fit rules for the 2D elevation (no React, no DOM).
 * The drawing is laid out in model millimetres and scaled to the viewport by its viewBox, so a 6 m kitchen in a 600px stage prints its
 * 90 mm dimension text at 7px. fitLabelScale() returns the factor (>= 1) by which the label font (and with it the lane spacing) must grow so
 * that labels are at least MIN_LABEL_PX tall ON SCREEN at the fitted zoom. Only the label size and lane gaps grow: no measured value,
 * extent or dimension is changed.
 * Zoom: one predictable ladder (fit = 100%, wheel / buttons step 1.25x, max 8x); pan is clamped so the drawing never leaves the view. */

export const MIN_LABEL_PX = 11.5;
export const MAX_LABEL_GROWTH = 3.2;
export const COMPACT_STEP = 2.85; // lane pitch (x label font) used while the labels have to grow: 3.3 -> 2.85, i.e. 14% less margin per lane
export const COMPACT_MARGIN = COMPACT_STEP / 3.3;
export const Z_MIN = 1;
export const Z_MAX = 8;
export const Z_STEP = 1.25;

/** extent of the viewBox when the label font is `f` times the base one: the model core stays, the label margins grow with f */
const extent = (core, total0, f) => core + (total0 - core) * f * (f > 1 ? COMPACT_MARGIN : 1);

/**
 * @param fs0     base label font size in model mm (elevFontSize)
 * @param vbW0    viewBox width at fs0, vbH0 its height
 * @param coreW   model width of the drawing without any label margin (the run length), coreH the same for height
 * @param cw, ch  the canvas box in CSS px
 * @returns factor f in [1, MAX_LABEL_GROWTH]
 */
export function fitLabelScale({ fs0, vbW0, vbH0, coreW, coreH, cw, ch }) {
  if (!(cw > 0) || !(ch > 0) || !(fs0 > 0)) return 1;
  const px = (f) => Math.min(cw / extent(coreW, vbW0, f), ch / extent(coreH, vbH0, f));
  const labelPx = (f) => fs0 * f * px(f);
  if (labelPx(1) >= MIN_LABEL_PX) return 1;
  let lo = 1; let hi = MAX_LABEL_GROWTH;
  if (labelPx(hi) < MIN_LABEL_PX) return hi; // as large as allowed
  for (let i = 0; i < 24; i += 1) { const mid = (lo + hi) / 2; if (labelPx(mid) >= MIN_LABEL_PX) hi = mid; else lo = mid; }
  return Math.round(hi * 100) / 100;
}

export const clampZoom = (k) => Math.min(Z_MAX, Math.max(Z_MIN, k));
export const zoomLabel = (k) => `${Math.round(clampZoom(k) * 100)}%`;

/** keep the visible window (w/k x h/k) inside the viewBox (w x h) */
export function clampPan(view, w, h) {
  const k = clampZoom(view.k);
  const vw = w / k; const vh = h / k;
  return { k, tx: Math.min(Math.max(0, view.tx), w - vw), ty: Math.min(Math.max(0, view.ty), h - vh) };
}

/** zoom by `factor` keeping the point (px, py) (viewBox units; default centre) fixed on screen */
export function zoomAbout(view, factor, w, h, px, py) {
  const k0 = clampZoom(view.k); const k = clampZoom(k0 * factor);
  const w0 = w / k0; const h0 = h / k0; const w1 = w / k; const h1 = h / k;
  const fx = px === undefined ? 0.5 : (px - view.tx) / w0; const fy = py === undefined ? 0.5 : (py - view.ty) / h0;
  return clampPan({ k, tx: view.tx + fx * (w0 - w1), ty: view.ty + fy * (h0 - h1) }, w, h);
}
