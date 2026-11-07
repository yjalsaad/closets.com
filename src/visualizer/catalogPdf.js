/* Room Visualizer — catalogue PDF [ROOM-VIZ 2026-11-07]
 * Pages are drawn on canvas (so Arabic shapes and RTL come from the browser) and placed into a real A4 PDF with jsPDF.
 * Cover (title, date, optional room render, swatch collage) + 6 products per page, each with a QR that opens it in the visualizer. */
import { swatch, displayName, isContinuous } from './materials';
import { KIND_LABEL, FINISH_LABEL } from './strings';
import { qrDataUrl } from './ui';

const PW = 1240, PH = 1754;   // A4 @ 150 dpi
const FONT = '-apple-system, "SF Pro Text", "Segoe UI", Roboto, "IBM Plex Sans Arabic", Arial, sans-serif';
const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const page = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, PW, PH); return [c, g]; };

function text(g, s, x, y, { size = 22, weight = 500, color = '#1b2a27', align = 'left', ar = false, max } = {}) {
  g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color; g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = align; g.textBaseline = 'alphabetic';
  let t = String(s || ''); if (max) { while (t.length > 1 && g.measureText(t).width > max) t = t.slice(0, -2) + '…'; }
  g.fillText(t, x, y);
}

export async function buildCatalogPdf({ products, title, ar, prices, roomImage, origin, onProgress }) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
  const A4W = pdf.internal.pageSize.getWidth(), A4H = pdf.internal.pageSize.getHeight();
  const M = 80; const start = ar ? PW - M : M; const align = ar ? 'right' : 'left'; const end = ar ? M : PW - M; const alignEnd = ar ? 'left' : 'right';
  const date = new Date().toLocaleDateString(ar ? 'ar-BH' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const pages = [];

  // cover
  {
    const [c, g] = page();
    g.fillStyle = '#f6f3ee'; g.fillRect(0, 0, PW, PH);
    text(g, ar ? 'الخزائن' : 'THE CLOSETS', start, 150, { size: 44, weight: 800, align, ar });
    text(g, ar ? 'كتالوج التشطيبات' : 'FINISHES CATALOGUE', start, 196, { size: 22, weight: 600, color: '#A94A22', align, ar });
    text(g, title, start, 330, { size: 64, weight: 800, align, ar, max: PW - 2 * M });
    text(g, date + ' · ' + products.length + (ar ? ' منتج' : ' products'), start, 384, { size: 26, color: '#5f6d68', align, ar });
    let y = 450;
    if (roomImage) { const im = await load(roomImage); if (im) { const w = PW - 2 * M, h = Math.min(640, w * im.height / im.width); g.drawImage(im, M, y, w, h); y += h + 40; } }
    const n = Math.min(products.length, roomImage ? 6 : 12); const cols = roomImage ? 6 : 4; const s = (PW - 2 * M - (cols - 1) * 16) / cols;
    for (let i = 0; i < n; i++) {
      const sw = await load(await swatch(products[i], 360)); const col = i % cols, row = Math.floor(i / cols);
      const x = ar ? PW - M - (col + 1) * s - col * 16 : M + col * (s + 16);
      if (sw) g.drawImage(sw, x, y + row * (s + 16), s, s);
    }
    text(g, (origin || '').replace(/^https?:\/\//, '') + '/visualizer', start, PH - 90, { size: 22, color: '#5f6d68', align, ar });
    pages.push(c);
  }

  // products: 2 × 3 per page
  const per = 6; const cardW = (PW - 2 * M - 40) / 2, cardH = (PH - 2 * M - 120 - 80) / 3;
  for (let pi = 0; pi * per < products.length; pi++) {
    const [c, g] = page();
    text(g, ar ? 'الخزائن' : 'THE CLOSETS', start, 90, { size: 24, weight: 800, align, ar });
    text(g, title, end, 90, { size: 22, color: '#5f6d68', align: alignEnd, ar, max: PW / 2 });
    g.fillStyle = '#e3e0d8'; g.fillRect(M, 110, PW - 2 * M, 2);
    const slice = products.slice(pi * per, pi * per + per);
    for (let i = 0; i < slice.length; i++) {
      const p = slice[i]; const col = i % 2, row = Math.floor(i / 2);
      const x = ar ? PW - M - (col + 1) * cardW - col * 40 : M + col * (cardW + 40); const y = 150 + row * (cardH + 40);
      const imgH = cardH - 210;
      const sw = await load(await swatch(p, 600));
      if (sw) { g.save(); g.beginPath(); g.rect(x, y, cardW, imgH); g.clip(); const k = Math.max(cardW / sw.width, imgH / sw.height); g.drawImage(sw, x + (cardW - sw.width * k) / 2, y + (imgH - sw.height * k) / 2, sw.width * k, sw.height * k); g.restore(); }
      const tx = ar ? x + cardW : x; const qrS = 150;
      text(g, displayName(p, ar), tx, y + imgH + 46, { size: 30, weight: 700, align, ar, max: cardW - qrS - 20 });
      text(g, (KIND_LABEL[p.kind] || KIND_LABEL.other)[ar ? 1 : 0] + (p.collection ? ' · ' + p.collection : ''), tx, y + imgH + 82, { size: 20, color: '#5f6d68', align, ar, max: cardW - qrS - 20 });
      const specs = [];
      if (!isContinuous(p)) specs.push(`${p.tile_w_mm} × ${p.tile_h_mm} mm`);
      specs.push((FINISH_LABEL[p.finish] || [p.finish, p.finish])[ar ? 1 : 0]);
      if (p.sku) specs.push(p.sku);
      text(g, specs.join(' · '), tx, y + imgH + 116, { size: 20, color: '#3d4f4b', align, ar, max: cardW - qrS - 20 });
      if (prices && p.price_per_m2) text(g, `BD ${Number(p.price_per_m2).toFixed(3)} / ${ar ? 'م²' : 'm²'}`, tx, y + imgH + 152, { size: 22, weight: 700, color: '#A94A22', align, ar });
      const qr = await load(qrDataUrl(`${origin}/visualizer?product=${encodeURIComponent(p.id)}`, 300, 1));
      if (qr) g.drawImage(qr, ar ? x : x + cardW - qrS, y + imgH + 20, qrS, qrS);
    }
    text(g, String(pi + 2), PW / 2, PH - 50, { size: 18, color: '#8a8a8a', align: 'center' });
    pages.push(c);
    if (onProgress) onProgress((pi + 1) * per / products.length);
  }

  pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, A4W, A4H, undefined, 'FAST'); });
  return pdf.output('blob');
}
