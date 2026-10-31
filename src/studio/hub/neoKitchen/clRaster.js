/* [NEO-CUTLIST-UX32] SVG / image -> PNG bytes in the browser (canvas), for the pictures embedded in the Excel export. Browser only (the callers catch
 * failures and fall back to an export without pictures). Identical pictures are rasterised once. Nothing leaves the page: SVG strings become blob: URLs,
 * logos are data: URLs or same-origin paths (docInfo only accepts those). */
import { qrSvg } from './clCodes';
import { qrPayload } from './docInfo';

const toBytes = (canvas) => new Promise((resolve, reject) => canvas.toBlob((b) => { if (!b) { reject(new Error('png')); return; } b.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)), reject); }, 'image/png'));
function loadImage(src) { return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('image')); i.src = src; }); }

/** one SVG string -> PNG bytes, `px` square (white background), or null when the SVG cannot be drawn */
export async function rasterizeSvg(svg, px = 96) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const cv = document.createElement('canvas'); cv.width = px; cv.height = px;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, px, px); g.drawImage(img, 0, 0, px, px);
    return await toBytes(cv);
  } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
}
/** list of SVG strings -> list of PNG bytes (same order; duplicates share one raster) */
export async function rasterizeSvgs(list, px = 96) {
  const memo = new Map(); const out = [];
  for (const svg of list) {
    if (!memo.has(svg)) memo.set(svg, await rasterizeSvg(svg, px));
    out.push(memo.get(svg));
  }
  return out;
}
/** a logo (data: URL or same-origin path) -> PNG bytes keeping its aspect ratio, max `box` px on the long side; null on failure */
export async function logoToPng(src, box = 300) {
  if (!src) return null;
  try {
    const img = await loadImage(src);
    const k = Math.min(1, box / Math.max(img.width || box, img.height || box));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round((img.width || box) * k)); cv.height = Math.max(1, Math.round((img.height || box) * k));
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    return await toBytes(cv);
  } catch (e) { return null; }
}
/** { logo, qr } PNG bytes for the cover sheet of a document */
export async function docImages(doc) {
  const [logo, qr] = await Promise.all([
    doc.opts.logo ? logoToPng(doc.company.logo) : Promise.resolve(null),
    doc.opts.qr ? rasterizeSvg(qrSvg(qrPayload(doc.opts.qrKind, doc.project, null), { size: 200, quiet: 2 }), 200) : Promise.resolve(null),
  ]);
  return { logo, qr };
}
