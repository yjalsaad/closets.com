/* The owner-supplied official logo (raster JPG, off-white background). Used as-is: never traced, recoloured or redrawn.
 * TODO(brand): replace with a vector SVG / PNG-with-alpha for production; until then it is shown on a light plate (3D panels)
 * or multiplied onto the cream veil (DOM) so the paper colour disappears without keying pixels. */
import LOGO_URL from './assets/the-closets-logo-official.jpg';
export { LOGO_URL };
export const LOGO_W = 1290, LOGO_H = 737, LOGO_ASPECT = LOGO_W / LOGO_H;

/** "colour to alpha": remove the JPG's off-white paper so the mark sits cleanly on any background (no shapes are traced or altered;
 *  every kept pixel keeps its colour, only the paper is made transparent). Returns a blob/data URL or null (no canvas). Cached. */
let keyed = null;
export function keyedLogoUrl() {
  if (keyed) return keyed;
  keyed = new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height), px = d.data, P = 251;
          for (let i = 0; i < px.length; i += 4) {
            const a = Math.max(0, (P - px[i]) / P, (P - px[i + 1]) / P, (P - px[i + 2]) / P);
            if (a < 0.05) { px[i + 3] = 0; continue; }
            const k = Math.min(1, a * 1.04);
            for (let j = 0; j < 3; j++) px[i + j] = Math.max(0, Math.min(255, P + (px[i + j] - P) / k));
            px[i + 3] = Math.round(255 * k);
          }
          g.putImageData(d, 0, 0); resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null); img.src = LOGO_URL;
    } catch (e) { resolve(null); }
  });
  return keyed;
}
