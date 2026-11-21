/* Canvas-drawn department signs (bilingual, redrawn when the language changes). Fonts come from the site's @fontsource faces. */
import * as THREE from 'three';
import { PALETTE, hex } from '../../3d/palette';
import { t } from '../../strings';

export const SIGN_W = 5.6, SIGN_H = 1.4;
const SS = 2;   // sign canvases are drawn at 2x (2048 x 512) and mipmapped: crisp at the stand points and on high-DPR screens

export async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
  const sample = 'Aa 01 الخزائن';
  await Promise.all(['600 64px "Noto Naskh Arabic"', '500 40px "IBM Plex Sans Arabic"', '400 64px "Fraunces"', '500 36px "Inter"']
    .map((f) => document.fonts.load(f, sample).catch(() => null)));
}

export function drawBaySign(canvas, { index, name, lang, furnished = false }) {
  const k = canvas.width / 1024, w = 1024, h = 256, g = canvas.getContext('2d'), ar = lang === 'ar';
  g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, w, h);
  g.fillStyle = hex(PALETTE.charcoal); g.fillRect(0, 0, w, h);
  g.strokeStyle = hex(PALETTE.brass); g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28);
  g.textBaseline = 'middle';
  const pad = 70, dir = ar ? -1 : 1, x0 = ar ? w - pad : pad;
  g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = ar ? 'right' : 'left';
  g.fillStyle = hex(PALETTE.brass); g.font = `600 48px "Inter", sans-serif`; g.fillText(String(index).padStart(2, '0'), x0, h * 0.5);
  const tx = x0 + dir * 120;
  g.fillStyle = hex(PALETTE.sand);
  g.font = ar ? `700 96px "Noto Naskh Arabic", "IBM Plex Sans Arabic", serif` : `600 90px "Fraunces", Georgia, serif`;
  g.fillText(name, tx, h * 0.4, w - pad * 2 - 140);
  // marker: orange = empty / to be furnished, brass = furnished with a sample configuration
  g.fillStyle = hex(furnished ? PALETTE.brass : PALETTE.brandOrange); g.beginPath(); g.arc(tx + dir * 9, h * 0.74, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = hex(PALETTE.sand);
  g.font = ar ? `600 44px "IBM Plex Sans Arabic", sans-serif` : `600 40px "Inter", sans-serif`;
  g.fillText(t(furnished ? 'baySample' : 'bayPending', lang), tx + dir * 34, h * 0.74);
}

export function makeSignTexture(bay, lang) {
  const c = document.createElement('canvas'); c.width = 1024 * SS; c.height = 256 * SS;
  drawBaySign(c, { index: bay.index, name: lang === 'ar' ? bay.ar : bay.en, lang, furnished: !!bay.product });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function redrawSign(tex, bay, lang) {
  drawBaySign(tex.image, { index: bay.index, name: lang === 'ar' ? bay.ar : bay.en, lang, furnished: !!bay.product });
  tex.needsUpdate = true;
}
