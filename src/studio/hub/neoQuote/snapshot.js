/* =============================================================================
 * Neo Quote Builder [NEO-QUOTE-UX33] - the picture of the design that goes on the quote.
 *   3D view  : the studio's own WebGL canvas (Kitchen3D creates its renderer with preserveDrawingBuffer: true, so the last frame is still there to
 *              read) copied to a small JPEG. It is the CURRENT camera, so the rep frames the shot in the studio and then presses Quote.
 *   Elevation: the front-elevation SVG of the Design view, with its computed styles inlined (the drawing is styled by CSS variables a stand-alone
 *              image does not have), rasterised to a small PNG. Used when the 3D view is not on screen.
 * Never an external host: everything stays a data URL until the quote is created, when it goes to the app's own `attachments` bucket
 * (quoteApi.uploadImage) or, if that fails, stays inside the quote payload. Pure DOM helpers, no React. Never throws.
 * ===========================================================================*/

export const MAX_W = 960;
export const JPEG_Q = 0.82;

const px = (n) => Math.max(1, Math.round(n));

/** the visible 3D canvas inside `root`, or null (the Design / Cut List views do not mount one) */
export function find3dCanvas(root) {
  if (!root || !root.querySelectorAll) return null;
  const list = Array.from(root.querySelectorAll('canvas.nk-canvas'));
  return list.find((c) => c.width > 8 && c.height > 8 && c.style.display !== 'none') || null;
}

/** the front-elevation <svg> inside `root`, or null */
export function findElevationSvg(root) {
  if (!root || !root.querySelector) return null;
  return root.querySelector('svg.nk-elev') || null;
}

function backdrop(root) {
  try {
    const cs = getComputedStyle(root || document.body);
    const v = (cs.getPropertyValue('--bg-1') || cs.getPropertyValue('--bg-2') || '').trim();
    return v || 'white';
  } catch (e) { return 'white'; }
}

/** copy a WebGL / 2D canvas to a scaled JPEG data URL on a solid backdrop */
export function canvasToDataUrl(canvas, root, maxW = MAX_W, quality = JPEG_Q) {
  try {
    const k = Math.min(1, maxW / canvas.width);
    const out = document.createElement('canvas');
    out.width = px(canvas.width * k); out.height = px(canvas.height * k);
    const g = out.getContext('2d');
    if (!g) return null;
    g.fillStyle = backdrop(root); g.fillRect(0, 0, out.width, out.height);
    g.drawImage(canvas, 0, 0, out.width, out.height);
    const url = out.toDataURL('image/jpeg', quality);
    return url && url.length > 200 ? { dataUrl: url, w: out.width, h: out.height } : null;
  } catch (e) { return null; }
}

const STYLE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'display', 'visibility'];
/** an SVG element's computed paint copied into inline style attributes, so the serialised picture looks the same outside the page */
function inlineStyles(src, dst) {
  try {
    const cs = getComputedStyle(src);
    const parts = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    dst.setAttribute('style', parts);
  } catch (e) { /* keep the element as is */ }
  const a = src.children; const b = dst.children;
  for (let i = 0; i < a.length && i < b.length; i++) inlineStyles(a[i], b[i]);
}

/** the elevation SVG -> PNG data URL (async: the image has to load) */
export function svgToDataUrl(svg, root, maxW = MAX_W, timeoutMs = 1500) {
  return new Promise((resolve) => {
    // jsdom has no image decoder (onload never fires) and no 2D canvas: skip instead of waiting; a real browser that stalls is cut off by the timer
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) { resolve(null); return; }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    const done = (v) => { clearTimeout(timer); resolve(v); };
    try {
      const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      const bw = vb.length === 4 && vb[2] > 0 ? vb[2] : svg.clientWidth || 800;
      const bh = vb.length === 4 && vb[3] > 0 ? vb[3] : svg.clientHeight || 400;
      const k = Math.min(2, maxW / bw);
      const clone = svg.cloneNode(true);
      inlineStyles(svg, clone);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(px(bw * k))); clone.setAttribute('height', String(px(bh * k)));
      const xml = new XMLSerializer().serializeToString(clone);
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = px(bw * k); c.height = px(bh * k);
          const g = c.getContext('2d'); g.fillStyle = backdrop(root); g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          done({ dataUrl: c.toDataURL('image/png'), w: c.width, h: c.height });
        } catch (e) { done(null); }
      };
      img.onerror = () => done(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    } catch (e) { done(null); }
  });
}

/**
 * capture(root) -> { view3d: {dataUrl,w,h}|null, elevation: {dataUrl,w,h}|null, reason: ''|'no3d' }
 * Takes the 3D picture when the 3D view is on screen and the elevation when the Design view is; `reason: 'no3d'` tells the panel to say
 * "open 3D View, then Recapture" instead of silently attaching nothing.
 */
export async function capture(root) {
  const out = { view3d: null, elevation: null, reason: '' };
  const cv = find3dCanvas(root);
  if (cv) out.view3d = canvasToDataUrl(cv, root);
  const sv = findElevationSvg(root);
  if (sv) out.elevation = await svgToDataUrl(sv, root);
  if (!out.view3d) out.reason = 'no3d';
  return out;
}

/** approximate bytes of a data URL (for the "small size" guard and the panel caption) */
export const dataUrlBytes = (u) => (u ? Math.round((String(u).length - (String(u).indexOf(',') + 1)) * 0.75) : 0);
