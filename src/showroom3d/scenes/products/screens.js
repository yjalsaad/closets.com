/* Canvas-drawn wall screens / panels for the departments (emissive planes, redrawn when the language changes). Everything shown is existing site copy
 * (routes meta, strings, content/facts.js); nothing is invented. Fonts are the site's (IBM Plex Sans Arabic / Inter). */
import * as THREE from 'three';
import { PALETTE as P, hex } from '../../3d/palette';
import { FACTS } from '../../../content/facts';

export const FONT = "'IBM Plex Sans Arabic','Inter','Segoe UI',system-ui,sans-serif";
/** a canvas texture + redraw(lang). draw(g, w, h, lang, L) where L = (en, ar) => text */
export function makePanel(w, h, draw, lang = 'en', { design = null, anisotropy = 4 } = {}) {
  // `design`: the size the draw function was laid out for; the canvas can be bigger (crisper on high-DPR screens) and the drawing is scaled to fit
  // readability: draw at 2x the layout size (crisp on high-DPR screens, mipmapped + anisotropic) unless the caller sets its own `design`
  if (!design && anisotropy > 1) { design = { w, h }; w *= 2; h *= 2; }
  const c = document.createElement('canvas'); c.width = w; c.height = h; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = anisotropy; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const api = { canvas: c, tex, lang, redraw(l) { api.lang = l === 'ar' ? 'ar' : 'en'; const g = c.getContext('2d'); g.save(); g.direction = api.lang === 'ar' ? 'rtl' : 'ltr'; const dw = design ? design.w : w, dh = design ? design.h : h; if (design) g.scale(w / dw, h / dh); draw(g, dw, dh, api.lang, (en, ar) => (api.lang === 'ar' ? ar : en)); g.restore(); tex.needsUpdate = true; } };
  api.redraw(lang); return api;
}
export const wrap = (g, text, x, y, maxW, lh, align = 'left') => {
  const words = String(text).split(/\s+/); let line = '', yy = y; g.textAlign = align;
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = t; }
  if (line) g.fillText(line, x, yy); return yy + lh;
};
export const roundedRect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

/** the Design Studio entry screen: existing route meta copy + a simplified illustrative room plan */
export function drawStudioScreen(g, w, h, lang, L) {
  const rtl = lang === 'ar', x0 = rtl ? w - 56 : 56, al = rtl ? 'right' : 'left';
  g.fillStyle = hex(P.screenDark); g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(P.charcoal)); gr.addColorStop(1, hex(P.screenDark)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = hex(P.brandOrange); g.fillRect(rtl ? w - 56 - 70 : 56, 52, 70, 5);
  g.fillStyle = hex(P.sand); g.font = `700 32px ${FONT}`; g.textAlign = al; g.fillText(L('THE CLOSETS CO.', 'ذا كلوزتس'), x0, 98);
  g.font = `700 76px ${FONT}`; g.fillText(L('Design Studio', 'استوديو التصميم'), x0, 190);
  g.fillStyle = hex(P.sand); g.font = `500 34px ${FONT}`; wrap(g, L('Plan your room in 3D and get a live price estimate, then book a designer to make it real.', 'صمّم غرفتك ثلاثية الأبعاد واحصل على تقدير سعر فوري، ثم احجز مصمّماً لتنفيذها.'), x0, 252, w * 0.52, 46, al);
  g.fillStyle = hex(P.brandOrange); roundedRect(g, rtl ? w - 56 - 420 : 56, h - 128, 420, 76, 38); g.fill();
  g.fillStyle = hex(P.ink); g.font = `700 34px ${FONT}`; g.textAlign = 'center'; g.fillText(L('Open the Design Studio', 'افتح استوديو التصميم'), (rtl ? w - 56 - 420 : 56) + 210, h - 90);
  // illustrative plan: a room outline with a wall run, an island and a door arc
  const px = rtl ? 60 : w * 0.58, py = 70, pw = w * 0.36, ph = h * 0.6; g.strokeStyle = 'rgba(233,226,214,0.75)'; g.lineWidth = 3; g.strokeRect(px, py, pw, ph);
  g.strokeStyle = hex(P.brass); g.lineWidth = 2; g.strokeRect(px + 12, py + 12, pw - 24, 30); g.strokeRect(px + 12, py + 12, 30, ph - 24); g.strokeRect(px + pw * 0.35, py + ph * 0.45, pw * 0.4, ph * 0.2);
  g.beginPath(); g.arc(px + pw - 2, py + ph - 2, 46, Math.PI, Math.PI * 1.5); g.stroke(); g.fillStyle = 'rgba(233,226,214,0.5)'; g.font = `600 24px ${FONT}`; g.textAlign = 'center'; g.fillText(L('Illustrative', 'للتوضيح'), px + pw / 2, py + ph + 28);
}

/** the Lounge consultation panel: existing booking copy + the existing contact details from content/facts.js (phone, hours) */
export function drawConsultPanel(g, w, h, lang, L) {
  const rtl = lang === 'ar', x0 = rtl ? w - 56 : 56, al = rtl ? 'right' : 'left';
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(P.brandBrown)); gr.addColorStop(1, hex(P.ink)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = hex(P.brandOrange); g.fillRect(rtl ? w - 56 - 70 : 56, 48, 70, 5);
  g.fillStyle = hex(P.sand); g.font = `700 32px ${FONT}`; g.textAlign = al; g.fillText(L('CONSULTATION LOUNGE', 'صالة الاستشارات'), x0, 96);
  g.font = `700 64px ${FONT}`; wrap(g, L('Book a free design consultation', 'احجز استشارة تصميم مجانية'), x0, 176, w - 112, 76, al);
  g.fillStyle = hex(P.sand); g.font = `500 34px ${FONT}`;
  let y = 360; if (FACTS.phone) { g.fillStyle = hex(P.sand); g.font = `700 42px ${FONT}`; g.direction = 'ltr'; g.textAlign = rtl ? 'right' : 'left'; g.fillText(FACTS.phone, x0, y); g.direction = rtl ? 'rtl' : 'ltr'; y += 58; }
  if (FACTS.hours) { g.fillStyle = hex(P.sand); g.font = `500 32px ${FONT}`; g.textAlign = al; g.fillText(FACTS.hours[lang] || FACTS.hours.en, x0, y); }
  g.fillStyle = hex(P.brandOrange); roundedRect(g, rtl ? w - 56 - 400 : 56, h - 128, 400, 76, 38); g.fill();
  g.fillStyle = hex(P.ink); g.font = `700 34px ${FONT}`; g.textAlign = 'center'; g.fillText(L('Book a consultation', 'احجز استشارة'), (rtl ? w - 56 - 400 : 56) + 200, h - 90);
}

/** a sheet of paper with a simple floor plan drawn on it (for the design table) */
export function planPaperTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 180; const g = c.getContext('2d'); g.fillStyle = hex(P.paperWhite); g.fillRect(0, 0, 256, 180);
  g.strokeStyle = 'rgba(60,50,40,0.7)'; g.lineWidth = 2; g.strokeRect(24, 20, 208, 140); g.strokeRect(24, 20, 70, 20); g.strokeRect(24, 20, 20, 90); g.strokeRect(120, 80, 80, 40);
  g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 6; i++) { g.moveTo(24 + i * 40, 20); g.lineTo(24 + i * 40, 160); } g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
