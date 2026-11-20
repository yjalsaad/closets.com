/* Image upload for the study: validation (type, size, magic numbers), downscaling and the browser step that re-encodes through a canvas.
 * The pure parts are unit-tested; processImage() needs a browser. Re-encoding through a canvas also drops EXIF (GPS, camera) from the stored copy. */
import { STUDY_PALETTE } from './palette';
import { hex } from '../3d/palette';

export const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 3 * 1024 * 1024;      // the file the person picks
export const MAX_EDGE = 1600;                  // longest side after downscaling
export const MAX_STORED_BYTES = 600 * 1024;    // the stored copy (after re-encoding)
export const MAX_PIXELS = 40e6;                // refuse decompression bombs before decoding
export const ERR = { type: 'type', size: 'size', sniff: 'sniff', decode: 'decode', empty: 'empty', big: 'big' };

/** the real type from the first bytes ('jpeg' | 'png' | 'webp' | null); the file name and the declared MIME type are never trusted */
export function sniffImage(bytes) {
  const b = bytes || []; if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return null;
}
/** -> null when acceptable, else an ERR code. head = first bytes of the file */
export function checkFile({ type, size }, head) {
  if (!size) return ERR.empty;
  if (!ALLOWED.includes(type)) return ERR.type;
  if (size > MAX_BYTES) return ERR.size;
  const k = sniffImage(head); if (!k) return ERR.sniff;
  if (`image/${k}` !== type) return ERR.sniff;   // a PNG renamed .jpg (or the reverse) is refused, not guessed
  return null;
}
/** scale (w, h) so the longest side is at most `max`; never upscales */
export function fitSize(w, h, max = MAX_EDGE) {
  if (!(w > 0) || !(h > 0)) return { w: 0, h: 0 };
  const k = Math.min(1, max / Math.max(w, h)); return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}
export const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
/** decode a data URL to bytes, or null; used by the import so a hostile file cannot smuggle SVG / HTML in as an "image" */
export function dataUrlBytes(url) {
  const m = DATA_URL.exec(typeof url === 'string' ? url : ''); if (!m) return null;
  let bin; try { bin = typeof atob === 'function' ? atob(m[2]) : Buffer.from(m[2], 'base64').toString('binary'); } catch (e) { return null; }
  const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
/** an imported data URL is acceptable when its bytes really are the declared type and it is not larger than a stored copy may be */
export function checkDataUrl(url) {
  const m = DATA_URL.exec(typeof url === 'string' ? url : ''); if (!m) return ERR.type;
  const bytes = dataUrlBytes(url); if (!bytes) return ERR.decode; if (bytes.length > MAX_STORED_BYTES * 2) return ERR.big;
  return sniffImage(bytes) === m[1] ? null : ERR.sniff;
}
export const ERR_TEXT = {
  type: { ar: 'نوع الملف غير مدعوم. استخدم JPEG أو PNG أو WebP.', en: 'Unsupported file type. Use JPEG, PNG or WebP.' },
  size: { ar: 'الصورة أكبر من 3 ميغابايت.', en: 'The image is larger than 3 MB.' },
  sniff: { ar: 'محتوى الملف لا يطابق نوع الصورة المعلن.', en: 'The file content does not match an image of that type.' },
  decode: { ar: 'تعذّر قراءة الصورة.', en: 'The image could not be read.' },
  empty: { ar: 'الملف فارغ.', en: 'The file is empty.' },
  big: { ar: 'الصورة كبيرة جداً حتى بعد التصغير.', en: 'The image is still too large after downscaling.' },
};

/** browser only: validate, decode, downscale to MAX_EDGE, re-encode (WebP, else JPEG) -> { blob, w, h } or throws { code } */
export async function processImage(file, env = {}) {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const bad = checkFile({ type: file.type, size: file.size }, head); if (bad) throw { code: bad };
  const doc = env.document || document, create = env.createImageBitmap || (typeof createImageBitmap === 'function' ? createImageBitmap : null);
  let src, w, h;
  try {
    if (create) { src = await create(file); w = src.width; h = src.height; }
    else { const u = URL.createObjectURL(file); src = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; }); URL.revokeObjectURL(u); w = src.naturalWidth; h = src.naturalHeight; }
  } catch (e) { throw { code: ERR.decode }; }
  if (!w || !h || w * h > MAX_PIXELS) throw { code: ERR.decode };
  const f = fitSize(w, h), c = doc.createElement('canvas'); c.width = f.w; c.height = f.h;
  const ctx = c.getContext('2d'); if (!ctx) throw { code: ERR.decode };
  ctx.fillStyle = hex(STUDY_PALETTE.white); ctx.fillRect(0, 0, f.w, f.h);   // transparent PNGs get a white ground (the page is light behind images)
  ctx.drawImage(src, 0, 0, f.w, f.h); if (src.close) src.close();
  const toBlob = (type, q) => new Promise((ok) => c.toBlob((b) => ok(b), type, q));
  let blob = await toBlob('image/webp', 0.82); if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.85);
  if (!blob) throw { code: ERR.decode };
  if (blob.size > MAX_STORED_BYTES) { const q = await toBlob('image/jpeg', 0.7); if (q && q.size < blob.size) blob = q; }
  if (blob.size > MAX_STORED_BYTES * 2) throw { code: ERR.big };
  return { blob, w: f.w, h: f.h };
}
