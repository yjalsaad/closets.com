/* Room Visualizer — catalogue PDF [ROOM-VIZ 2026-11-07, DIGITAL-SHOWROOM 2026-11-08]
 * Pages are drawn on canvas (so Arabic shapes and RTL come from the browser) and placed into a real A4 PDF with jsPDF.
 * Cover (uploaded image or built-in) · optional contents page · 4 / 6 / 9 products per page, each with a QR that opens it
 * in the visualizer, its labels, size, finish, code, box details and (optionally) price · optional back page.
 * opts.design comes from the "catalog_pdf" visualizer setting (Bonsai → Digital Showroom → Catalogue PDF). */
import { swatch, displayName, isContinuous } from './materials';
import { KIND_LABEL, FINISH_LABEL } from './strings';
import { qrDataUrl } from './ui';

const PW = 1240, PH = 1754;   // A4 @ 150 dpi
const FONT = '-apple-system, "SF Pro Text", "Segoe UI", Roboto, "Noto Sans Arabic", "IBM Plex Sans Arabic", Arial, sans-serif';
const load = (src) => new Promise((res) => { if (!src) { res(null); return; } const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const page = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, PW, PH); return [c, g]; };
const GRID = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };

function text(g, s, x, y, { size = 22, weight = 500, color = '#1b2a27', align = 'left', ar = false, max } = {}) {
  g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color; g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = align; g.textBaseline = 'alphabetic';
  let t = String(s || ''); if (max) { while (t.length > 1 && g.measureText(t).width > max) t = t.slice(0, -2) + '…'; }
  g.fillText(t, x, y);
}
function fullPage(img) { const [c, g] = page(); const k = Math.max(PW / img.width, PH / img.height); g.drawImage(img, (PW - img.width * k) / 2, (PH - img.height * k) / 2, img.width * k, img.height * k); return c; }

export async function buildCatalogPdf({ products, title, ar, prices, roomImage, origin, onProgress, design = {}, labels = {} }) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
  const A4W = pdf.internal.pageSize.getWidth(), A4H = pdf.internal.pageSize.getHeight();
  const M = 80; const start = ar ? PW - M : M; const align = ar ? 'right' : 'left'; const end = ar ? M : PW - M; const alignEnd = ar ? 'left' : 'right';
  const date = new Date().toLocaleDateString(ar ? 'ar-BH' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const footer = (ar ? design.footer_ar : design.footer_en) || (origin || '').replace(/^https?:\/\//, '');
  const per = GRID[design.per_page] ? Number(design.per_page) : 6; const [cols, rows] = GRID[per];
  const pages = [];

  // cover
  const coverImg = await load(design.cover_url);
  if (coverImg) pages.push(fullPage(coverImg));
  else {
    const [c, g] = page();
    g.fillStyle = '#f6f3ee'; g.fillRect(0, 0, PW, PH);
    text(g, ar ? 'الخزائن' : 'THE CLOSETS', start, 150, { size: 44, weight: 800, align, ar });
    text(g, ar ? 'كتالوج التشطيبات' : 'FINISHES CATALOGUE', start, 196, { size: 22, weight: 600, color: '#A94A22', align, ar });
    text(g, title, start, 330, { size: 64, weight: 800, align, ar, max: PW - 2 * M });
    text(g, date + ' · ' + products.length + (ar ? ' منتج' : ' products'), start, 384, { size: 26, color: '#5f6d68', align, ar });
    let y = 450;
    if (roomImage) { const im = await load(roomImage); if (im) { const w = PW - 2 * M, h = Math.min(640, w * im.height / im.width); g.drawImage(im, M, y, w, h); y += h + 40; } }
    const n = Math.min(products.length, roomImage ? 6 : 12); const cc = roomImage ? 6 : 4; const s = (PW - 2 * M - (cc - 1) * 16) / cc;
    for (let i = 0; i < n; i++) {
      const sw = await load(products[i].thumb_url || await swatch(products[i], 360)); const col = i % cc, row = Math.floor(i / cc);
      const x = ar ? PW - M - (col + 1) * s - col * 16 : M + col * (s + 16);
      if (sw) g.drawImage(sw, x, y + row * (s + 16), s, s);
    }
    text(g, footer, start, PH - 90, { size: 22, color: '#5f6d68', align, ar });
    pages.push(c);
  }

  // contents
  const groups = [];
  products.forEach((p, i) => { const k = (KIND_LABEL[p.kind] || KIND_LABEL.other)[ar ? 1 : 0]; const last = groups[groups.length - 1]; if (!last || last.k !== k) groups.push({ k, first: i, n: 1 }); else last.n++; });
  const hasIndex = design.index !== false && groups.length > 1;
  if (hasIndex) {
    const [c, g] = page();
    text(g, ar ? 'المحتويات' : 'Contents', start, 170, { size: 54, weight: 800, align, ar });
    g.fillStyle = '#e3e0d8'; g.fillRect(M, 200, PW - 2 * M, 2);
    groups.forEach((gr, i) => {
      const pg = 3 + Math.floor(gr.first / per);
      text(g, gr.k, start, 280 + i * 64, { size: 30, weight: 600, align, ar });
      text(g, `${gr.n} · ${ar ? 'صفحة' : 'page'} ${pg}`, end, 280 + i * 64, { size: 26, color: '#5f6d68', align: alignEnd, ar });
    });
    pages.push(c);
  }

  // products
  const gap = 36; const cardW = (PW - 2 * M - (cols - 1) * gap) / cols, cardH = (PH - 2 * M - 120 - 80 - (rows - 1) * gap) / rows;
  const small = cols === 3; const fs = small ? 0.8 : 1;
  for (let pi = 0; pi * per < products.length; pi++) {
    const [c, g] = page();
    text(g, ar ? 'الخزائن' : 'THE CLOSETS', start, 90, { size: 24, weight: 800, align, ar });
    text(g, title, end, 90, { size: 22, color: '#5f6d68', align: alignEnd, ar, max: PW / 2 });
    g.fillStyle = '#e3e0d8'; g.fillRect(M, 110, PW - 2 * M, 2);
    const slice = products.slice(pi * per, pi * per + per);
    for (let i = 0; i < slice.length; i++) {
      const p = slice[i]; const col = i % cols, row = Math.floor(i / cols);
      const x = ar ? PW - M - (col + 1) * cardW - col * gap : M + col * (cardW + gap); const y = 150 + row * (cardH + gap);
      const imgH = cardH - Math.round(210 * fs);
      const sw = await load(p.thumb_url || await swatch(p, 600));
      if (sw) { g.save(); g.beginPath(); g.rect(x, y, cardW, imgH); g.clip(); const k = Math.max(cardW / sw.width, imgH / sw.height); g.drawImage(sw, x + (cardW - sw.width * k) / 2, y + (imgH - sw.height * k) / 2, sw.width * k, sw.height * k); g.restore(); }
      // labels on the image
      let lx = ar ? x + cardW - 12 : x + 12;
      (p.labels || []).slice(0, 3).forEach((l) => {
        const meta = labels[l] || {}; g.font = `700 ${Math.round(18 * fs)}px ${FONT}`; const w = g.measureText(l).width + 20;
        const bx = ar ? lx - w : lx; g.fillStyle = meta.color || '#A94A22'; g.beginPath(); if (g.roundRect) g.roundRect(bx, y + 12, w, 30 * fs, 15 * fs); else g.rect(bx, y + 12, w, 30 * fs); g.fill();
        g.fillStyle = meta.text_color || '#ffffff'; g.textAlign = 'left'; g.direction = 'ltr'; g.textBaseline = 'middle'; g.fillText(l, bx + 10, y + 12 + 15 * fs);
        lx = ar ? bx - 8 : bx + w + 8;
      });
      const tx = ar ? x + cardW : x; const qrS = Math.round(150 * fs); const maxT = cardW - qrS - 20;
      text(g, displayName(p, ar), tx, y + imgH + 46 * fs, { size: Math.round(30 * fs), weight: 700, align, ar, max: maxT });
      text(g, (KIND_LABEL[p.kind] || KIND_LABEL.other)[ar ? 1 : 0] + (p.collection ? ' · ' + p.collection : ''), tx, y + imgH + 82 * fs, { size: Math.round(20 * fs), color: '#5f6d68', align, ar, max: maxT });
      const specs = [];
      if (!isContinuous(p)) specs.push(`${p.tile_w_mm} × ${p.tile_h_mm} mm`);
      specs.push((FINISH_LABEL[p.finish] || [p.finish, p.finish])[ar ? 1 : 0]);
      if (p.sku) specs.push(p.sku);
      text(g, specs.join(' · '), tx, y + imgH + 114 * fs, { size: Math.round(20 * fs), color: '#3d4f4b', align, ar, max: maxT });
      if (p.sell_by_box && (p.m2_per_box || p.pcs_per_box)) text(g, [p.pcs_per_box ? `${p.pcs_per_box} ${ar ? 'قطعة' : 'pcs'}` : '', p.m2_per_box ? `${Number(p.m2_per_box)} ${ar ? 'م²' : 'm²'}` : ''].filter(Boolean).join(' · ') + (ar ? ' / صندوق' : ' / box'), tx, y + imgH + 142 * fs, { size: Math.round(19 * fs), color: '#3d4f4b', align, ar, max: maxT });
      if (prices && p.price_per_m2) { const unit = { m2: ar ? 'م²' : 'm²', box: ar ? 'صندوق' : 'box', piece: ar ? 'قطعة' : 'piece', sheet: ar ? 'لوح' : 'sheet', litre: ar ? 'لتر' : 'litre' }[p.price_unit || 'm2']; text(g, `BD ${Number(p.price_per_m2).toFixed(3)} / ${unit}`, tx, y + imgH + 176 * fs, { size: Math.round(22 * fs), weight: 700, color: '#A94A22', align, ar }); }
      const qr = await load(qrDataUrl(`${origin}/visualizer?product=${encodeURIComponent(p.id)}`, 300, 1));
      if (qr) g.drawImage(qr, ar ? x : x + cardW - qrS, y + imgH + 20, qrS, qrS);
    }
    text(g, footer, start, PH - 50, { size: 18, color: '#8a8a8a', align, ar });
    text(g, String(pages.length + 1), end, PH - 50, { size: 18, color: '#8a8a8a', align: alignEnd });
    pages.push(c);
    if (onProgress) onProgress((pi + 1) * per / products.length);
  }

  const backImg = await load(design.back_url);
  if (backImg) pages.push(fullPage(backImg));

  pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, A4W, A4H, undefined, 'FAST'); });
  return pdf.output('blob');
}
