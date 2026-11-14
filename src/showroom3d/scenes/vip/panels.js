/* Canvas drawings of the VIP room: the five station screens (animated by `t` seconds), the gallery wall, the Hub department chart, the floor map and the three
 * floating panels. Everything is drawn from existing copy / data (products/vipContent.js, content/facts.js, the site's project rows); mock-ups are labelled
 * "illustrative". RTL aware: text anchors flip, shapes mirror. Fonts: the site's IBM Plex Sans Arabic / Inter. */
import { PALETTE as P, hex, rgba } from '../../3d/palette';
import { FONT, wrap, roundedRect } from '../products/screens';
import * as C from '../../products/vipContent';
import { FILM_TITLE, FILM_ENTRY, FILM_AI_LABEL, FILM_SOON, fmtTime } from '../../vip/film';
import { businessLines } from '../../products/vipContent';
import { projectCard } from '../../products/projectsFeed';
import { clamp01, easeOutCubic, stagger, countValue, formatNumber } from '../../vip/motion';

const Lx = C.L;
/** small drawing toolkit bound to a canvas context + language */
function kit(g, w, h, lang, rec = null) {
  const rtl = lang === 'ar', al = rtl ? 'right' : 'left';
  return {
    rtl, al, mx: (x) => (rtl ? w - x : x), L: (o) => Lx(o, lang),
    text(s, x, y, { size = 28, weight = 400, color = P.sand, align = al, max } = {}) { if (rec) rec.push({ k: 'text', s: String(s), size, weight, x, y, align, max: max || 0, color: typeof color === 'number' ? color : undefined }); g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = typeof color === 'string' ? color : hex(color); g.textAlign = align; g.textBaseline = 'alphabetic'; if (max) { g.save(); g.fillText(s, x, y, max); g.restore(); } else g.fillText(s, x, y); },
    para(s, x, y, maxW, { size = 26, weight = 400, color = P.taupe, lh = size * 1.4, align = al } = {}) { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = hex(color); const y1 = wrap(g, s, x, y, maxW, lh, align); if (rec) rec.push({ k: 'para', s: String(s), size, weight, x, y, y1, maxW, align, color }); return y1; },
    bg(a = P.screenDark, b = P.ink) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(a)); gr.addColorStop(1, hex(b)); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = rgba(P.screenGlow, 0.05); g.lineWidth = 1; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } },
    card(x, y, cw, ch, { fill = rgba(P.sand, 0.06), line = rgba(P.sand, 0.18), dash = false, r = 14 } = {}) { roundedRect(g, x, y, cw, ch, r); g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = 2; g.setLineDash(dash ? [10, 7] : []); g.stroke(); g.setLineDash([]); },
    rule(x, y, len, color = P.brandOrange) { g.fillStyle = hex(color); g.fillRect(rtl ? x - len : x, y, len, 5); },
  };
}
const head = (k, w, eyebrow, title, y0 = 70) => { k.rule(k.mx(70), y0 - 38, 90); k.text(eyebrow, k.mx(70), y0, { size: 24, weight: 600, color: P.brassPale }); k.text(title, k.mx(70), y0 + 70, { size: 66, weight: 700 }); };
const footer = (k, w, h, lang, extra) => { k.text(Lx(C.DISCLAIMER, lang), k.mx(70), h - 96, { size: 22, color: P.taupe, max: w - 140 }); if (extra) k.text(extra, k.mx(w - 70), h - 36, { size: 20, color: P.taupe, align: k.rtl ? 'left' : 'right' }); };
const tagIllus = (k, w, lang, y) => { k.text(Lx(C.ILLUSTRATIVE, lang), k.mx(w - 70), y, { size: 20, color: P.brassPale, align: k.rtl ? 'left' : 'right' }); };

/** station 1: the company story and brand */
export function drawStory(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o; k.bg(); head(k, w, lang === 'ar' ? `المحطة 1 من ${C.STATIONS.length}` : `STATION 1 OF ${C.STATIONS.length}`, Lx(C.STATIONS[0].title, lang));
  if (o.logo) { const lw = 280, lh = lw / (o.logo.width / o.logo.height || 1.75), x = k.rtl ? w - 70 - lw : 70; g.fillStyle = hex(P.logoPaper); roundedRect(g, x - 12, 210, lw + 24, lh + 24, 12); g.fill(); g.drawImage(o.logo, x, 222, lw, lh); }
  const lines = C.storyLines().slice(0, 3); let y = 470; const tx = k.mx(70);
  k.text(Lx(C.STATIONS[0].lead, lang), tx, 440, { size: 38, weight: 600, color: P.brandOrange });
  for (const l of lines) y = k.para(Lx(l, lang), tx, y + 14, w * 0.46, { size: 26, lh: 34 }) + 8;
  const cf = C.contestedFacts(), gx = k.rtl ? 70 : w * 0.56, gw = w * 0.44 - 70, cw = (gw - 24) / 2, chh = 170;
  cf.forEach((f, i) => { const cx = gx + (i % 2) * (cw + 24), cy = 230 + Math.floor(i / 2) * (chh + 24); k.card(cx, cy, cw, chh, { dash: !f.confirmed, line: f.confirmed ? rgba(P.sand, 0.3) : rgba(P.brandOrange, 0.7) });
    const ax = k.rtl ? cx + cw - 24 : cx + 24; k.text(Lx(f.label, lang), ax, cy + 56, { size: 24, weight: 600, color: P.taupe }); k.para(Lx(f.value, lang), ax, cy + 100, cw - 48, { size: f.confirmed ? 40 : 28, weight: f.confirmed ? 700 : 600, color: f.confirmed ? P.sand : P.brandOrange, lh: 34 }); if (!f.confirmed) k.text(lang === 'ar' ? 'بانتظار الإدارة' : 'PLACEHOLDER', ax, cy + chh - 18, { size: 16, weight: 700, color: P.brassPale }); });
  k.card(gx, 230 + 2 * (chh + 24), gw, 110, { line: rgba(P.brass, 0.7) }); const bx = k.rtl ? gx + gw - 24 : gx + 24; k.text(lang === 'ar' ? 'ضمان' : 'Warranty', bx, 230 + 2 * (chh + 24) + 42, { size: 22, weight: 600, color: P.taupe }); k.text(Lx(C.storyLines()[1], lang), bx, 230 + 2 * (chh + 24) + 84, { size: 26, weight: 600, max: gw - 48 });
  footer(k, w, h, lang);
}

/** station 2: the business-line map (a hub-and-spoke diagram of the real departments and services) + status of the project gallery */
export function drawProjectsScreen(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o; k.bg(); head(k, w, lang === 'ar' ? `المحطة 2 من ${C.STATIONS.length}` : `STATION 2 OF ${C.STATIONS.length}`, Lx(C.STATIONS[1].title, lang));
  const lines = businessLines(lang), cx = k.rtl ? w * 0.3 : w * 0.7, cy = h * 0.55, R = Math.min(w * 0.22, h * 0.36);
  g.strokeStyle = rgba(P.screenGlow, 0.25); g.lineWidth = 2; for (const rr of [R * 0.55, R]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = hex(P.brandOrange); g.beginPath(); g.arc(cx, cy, 54, 0, Math.PI * 2); g.fill(); k.text(lang === 'ar' ? 'الخزائن' : 'The Closets', cx, cy + 7, { size: 20, weight: 700, color: P.ink, align: 'center' });
  lines.forEach((l, i) => { const a = (i / lines.length) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; g.strokeStyle = rgba(P.brassPale, 0.35); g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i), nr = 12 + pulse * 3; g.fillStyle = l.href ? hex(P.brassPale) : hex(P.taupe); g.beginPath(); g.arc(x, y, nr, 0, Math.PI * 2); g.fill();
    const right = Math.cos(a) >= 0, tx = x + (right ? 24 : -24); k.text(Lx(l.name, lang), tx, y + 8, { size: 24, weight: 600, align: right ? 'left' : 'right' }); });
  const lx = k.mx(70), pr = o.projects || { status: 'idle', cards: [] };
  k.card(k.rtl ? lx - 640 : lx, 280, 640, 250, { fill: rgba(P.sand, 0.06), line: rgba(P.brass, 0.6) });
  const ix = k.rtl ? lx - 36 : lx + 36;
  k.text(lang === 'ar' ? 'المشاريع' : 'Projects', ix, 336, { size: 22, weight: 600, color: P.brassPale });
  const msg = pr.status === 'ok' ? (lang === 'ar' ? 'أحدث المشاريع من صفحة مشاريعنا معروضة على الجدار الجانبي.' : 'The latest projects from our Projects page are on the side wall.') : (lang === 'ar' ? 'المشاريع معروضة في صفحة مشاريعنا.' : 'Projects are shown on our Projects page.');
  k.para(msg, ix, 392, 570, { size: 30, weight: 600, color: P.sand, lh: 42 });
  k.text(lang === 'ar' ? 'كل خط عمل يفتح صفحته الفعلية من اللوحة.' : 'Each line opens its real page from the panel.', ix, 490, { size: 22, color: P.taupe, max: 580 });
  footer(k, w, h, lang);
}

/** station 3: the Bonsai Hub: an animated lead-to-finance flow, the department module counts and six real capabilities */
export function drawHub(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o; k.bg(); head(k, w, lang === 'ar' ? `المحطة 3 من ${C.STATIONS.length}` : `STATION 3 OF ${C.STATIONS.length}`, Lx(C.STATIONS[2].title, lang));
  const fl = C.HUB_FLOW, y0 = 320, x0 = 120, x1 = w - 120, step = (x1 - x0) / (fl.length - 1);
  g.strokeStyle = rgba(P.screenGlow, 0.35); g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  fl.forEach((s, i) => { const x = k.rtl ? x1 - i * step : x0 + i * step, on = ((t * 0.7) % fl.length) | 0; const act = i === on; g.fillStyle = act ? hex(P.brandOrange) : hex(P.brassPale); g.beginPath(); g.arc(x, y0, act ? 20 : 14, 0, Math.PI * 2); g.fill();
    k.text(Lx(s.name, lang), x, y0 + 62, { size: 30, weight: 700, align: 'center' }); k.text(Lx(s.sub, lang), x, y0 + 96, { size: 19, color: P.taupe, align: 'center', max: step - 20 }); });
  const p = ((t * 0.7) % fl.length), seg = Math.min(fl.length - 2, p | 0), f = p - seg, dx = (k.rtl ? x1 - (seg + f) * step : x0 + (seg + f) * step); g.fillStyle = hex(P.sand); g.beginPath(); g.arc(dx, y0, 8, 0, Math.PI * 2); g.fill();
  // department module counts (real, from the Hub module map)
  const bx = k.mx(70), bw = w * 0.42, rowH = 34, by = 488, max = Math.max(...C.HUB_DEPARTMENTS.map((d) => d.modules));
  k.text(lang === 'ar' ? 'عدد الوحدات لكل قسم (من خريطة وحدات المنصة)' : 'Modules per department (from the Hub module map)', bx, by - 14, { size: 22, weight: 600, color: P.brassPale });
  C.HUB_DEPARTMENTS.slice(0, 6).forEach((d, i) => { const y = by + 14 + i * rowH, len = (d.modules / max) * (bw - 330), grow = Math.min(1, (t * 0.8 - i * 0.12) + 0.2); const gl = Math.max(0, Math.min(1, grow)) * len;
    k.text(Lx(d.name, lang), bx, y + 22, { size: 20, max: 250 }); const sx = k.rtl ? bx - 270 : bx + 270; g.fillStyle = hex(P.brandOrange); g.fillRect(k.rtl ? sx - gl : sx, y + 6, gl, 18); k.text(String(d.modules), k.rtl ? sx - gl - 10 : sx + gl + 10, y + 22, { size: 20, color: P.taupe }); });
  // capabilities
  const cx0 = k.rtl ? 70 : w * 0.52, cw = (w * 0.48 - 70 - 20) / 2;
  C.HUB_CAPABILITIES.forEach((c, i) => { const x = cx0 + (i % 2) * (cw + 20), y = 468 + Math.floor(i / 2) * 92; k.card(x, y, cw, 84, { line: rgba(P.brass, 0.4) }); const ax = k.rtl ? x + cw - 18 : x + 18; k.text(Lx(c.title, lang), ax, y + 32, { size: 22, weight: 700, color: P.brassPale, max: cw - 36 }); k.para(Lx(c.body, lang), ax, y + 56, cw - 36, { size: 15, lh: 18 }); });
  tagIllus(k, w, lang, 120); footer(k, w, h, lang, lang === 'ar' ? 'المصدر: مستودع المنصة' : 'Source: the Hub repository');
}

/** station 4: the generic contact hand-off (routes to the existing booking page; the real button is in the panel) */
export function drawContact(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o, N = C.STATIONS.length; k.bg(P.brandBrown, P.ink); head(k, w, lang === 'ar' ? `المحطة ${N} من ${N}` : `STATION ${N} OF ${N}`, Lx(C.STATIONS[N - 1].title, lang));
  k.para(Lx(C.STATIONS[N - 1].lead, lang), k.mx(70), 330, w * 0.7, { size: 40, weight: 600, color: P.sand, lh: 52 });
  const bw = 620, bh = 96, bx = k.rtl ? w - 70 - bw : 70, by = 500, glow = 0.5 + 0.5 * Math.sin(t * 2.2);
  g.shadowColor = rgba(P.brandOrange, 0.5 + 0.3 * glow); g.shadowBlur = 30 + 20 * glow; g.fillStyle = hex(P.brandOrange); roundedRect(g, bx, by, bw, bh, 48); g.fill(); g.shadowBlur = 0;
  k.text(lang === 'ar' ? 'احجز استشارة' : 'Book a consultation', bx + bw / 2, by + 62, { size: 34, weight: 700, color: P.ink, align: 'center' });
  const ct = C.contactLines(lang); ct.forEach((c, i) => k.text(`${Lx(c.label, lang)}: ${c.dir === 'ltr' ? '\u2066' + c.text + '\u2069' : c.text}`, k.mx(70), 664 + i * 44, { size: 30, weight: 600, color: P.sand })); footer(k, w, h, lang);
}
export const STATION_DRAW = [drawStory, drawProjectsScreen, drawHub, drawContact];

/** gallery wall: 3 x 2 project cards. Real rows only; an image is drawn when it has loaded (CORS permitting), otherwise a styled procedural card. */
export function drawGallery(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o, pr = o.projects || { status: 'idle', cards: [] }; k.bg(P.ink, P.screenDark);
  k.text(lang === 'ar' ? 'مشاريعنا' : 'Our projects', k.mx(48), 62, { size: 40, weight: 700 }); k.rule(k.mx(48), 80, 80);
  if (pr.status !== 'ok' || !pr.cards.length) { k.card(48, 130, w - 96, h - 190, { dash: true, line: rgba(P.brandOrange, 0.6) }); k.para(pr.status === 'idle' ? (lang === 'ar' ? 'جارٍ تحميل المشاريع…' : 'Loading projects…') : (lang === 'ar' ? 'المشاريع معروضة في صفحة مشاريعنا.' : 'Projects are shown on our Projects page.'), w / 2, h / 2 - 10, w - 220, { size: 44, weight: 600, color: P.sand, align: 'center', lh: 56 }); k.text('/projects', w / 2, h / 2 + 90, { size: 30, color: P.brassPale, align: 'center' }); return; }
  const cols = 3, gap = 24, cw = (w - 96 - gap * 2) / cols, rows = Math.ceil(pr.cards.length / cols), ch = (h - 130 - 40 - gap * (rows - 1)) / rows;
  pr.cards.forEach((c, i) => { const x = 48 + (i % cols) * (cw + gap), y = 120 + Math.floor(i / cols) * (ch + gap); k.card(x, y, cw, ch, { fill: rgba(P.sand, 0.07) }); const ih = ch * 0.62;
    if (c.img) { g.save(); roundedRect(g, x, y, cw, ih, 14); g.clip(); const s = Math.max(cw / c.img.width, ih / c.img.height); g.drawImage(c.img, x + (cw - c.img.width * s) / 2, y + (ih - c.img.height * s) / 2, c.img.width * s, c.img.height * s); g.restore(); }
    else { const gr = g.createLinearGradient(x, y, x + cw, y + ih); gr.addColorStop(0, hex(P.brandBrown)); gr.addColorStop(1, hex(P.charcoal)); g.fillStyle = gr; g.save(); roundedRect(g, x, y, cw, ih, 14); g.fill(); g.restore(); k.text((c.title.replace(/[^A-Za-z0-9؀-ۿ ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('') || '·').toUpperCase(), x + cw / 2, y + ih / 2 + 22, { size: 72, weight: 800, color: P.brandOrange, align: 'center' }); }
    const ax = k.rtl ? x + cw - 20 : x + 20; k.text(c.title, ax, y + ih + 40, { size: 28, weight: 700, max: cw - 40 }); if (c.meta) k.text(c.meta, ax, y + ih + 72, { size: 20, color: P.taupe, max: cw - 40 }); });
}

/** right wall: the Hub's department module counts as a chart (real counts, from the module map) */
export function drawHubWall(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o; k.bg(P.screenDark, P.charcoal); k.text(lang === 'ar' ? 'منصة بونساي هب' : 'Bonsai Hub', k.mx(40), 60, { size: 40, weight: 700 }); k.rule(k.mx(40), 78, 70);
  const max = Math.max(...C.HUB_DEPARTMENTS.map((d) => d.modules)), rh = (h - 150) / C.HUB_DEPARTMENTS.length;
  C.HUB_DEPARTMENTS.forEach((d, i) => { const y = 120 + i * rh; k.text(Lx(d.name, lang), k.mx(40), y + rh * 0.62, { size: 22, max: 330 }); const x0 = k.rtl ? w - 40 - 350 : 390, len = (d.modules / max) * (w - 520); g.fillStyle = hex(P.brandOrange); g.fillRect(k.rtl ? x0 - len : x0, y + rh * 0.25, len, rh * 0.45); k.text(String(d.modules), k.rtl ? x0 - len - 10 : x0 + len + 10, y + rh * 0.62, { size: 22, color: P.taupe }); });
  k.text(lang === 'ar' ? 'عدد الوحدات لكل قسم، من خريطة وحدات المنصة' : 'Modules per department, from the Hub module map', k.mx(40), h - 22, { size: 18, color: P.taupe, max: w - 80 });
}

/** floor map: the eight showroom departments + the VIP room around a centre ring (additive glow, drawn on a disc) */
export function drawFloorMap(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o, cx = w / 2, cy = h / 2; g.clearRect(0, 0, w, h);
  g.strokeStyle = rgba(P.brassPale, 0.8); g.lineWidth = 6; for (const r of [w * 0.46, w * 0.36, w * 0.18]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
  const names = businessLines(lang).filter((l) => ['kitchens', 'wardrobes', 'walkin', 'bedroom', 'doors', 'living', 'studio', 'lounge'].includes(l.id));
  names.forEach((l, i) => { const a = (i / names.length) * Math.PI * 2 - Math.PI / 2, r = w * 0.41, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; g.fillStyle = hex(P.brandOrange); g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill(); g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2 + (Math.sin(a) > 0.2 ? Math.PI : 0)); g.font = `600 30px ${FONT}`; g.fillStyle = hex(P.sand); g.textAlign = 'center'; g.fillText(Lx(l.name, lang), 0, Math.sin(a) > 0.2 ? 52 : -34); g.restore(); });
  g.font = `700 42px ${FONT}`; g.fillStyle = hex(P.sand); g.textAlign = 'center'; g.fillText(lang === 'ar' ? 'خريطة المعرض' : 'Showroom map', cx, cy + 14);
}
/** the three floating panels above the table */
export function drawHolo(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, which = 0 } = o; g.clearRect(0, 0, w, h); k.card(6, 6, w - 12, h - 12, { fill: rgba(P.screenGlow, 0.08), line: rgba(P.screenGlow, 0.8), r: 18 });
  const title = [C.HUB_FLOW[0].name, { en: 'Manager workspace', ar: 'مساحة عمل المدير' }, { en: 'Roles and audit', ar: 'الأدوار والتدقيق' }][which];
  k.text(Lx(title, lang), k.mx(34), 64, { size: 36, weight: 700, color: P.screenGlow });
  if (which === 0) C.HUB_FLOW.slice(0, 4).forEach((s, i) => { const y = 108 + i * 54; g.fillStyle = hex(P.brandOrange); g.beginPath(); g.arc(k.mx(48), y, 9, 0, Math.PI * 2); g.fill(); k.text(Lx(s.name, lang), k.mx(76), y + 8, { size: 26 }); if (i < 3) { g.strokeStyle = rgba(P.screenGlow, 0.6); g.beginPath(); g.moveTo(k.mx(48), y + 12); g.lineTo(k.mx(48), y + 42); g.stroke(); } });
  if (which === 1) C.HUB_KPI_NAMES.forEach((n, i) => { const y = 100 + i * 46; k.text(Lx(n, lang), k.mx(34), y + 24, { size: 22, max: w - 200 }); const len = [0.82, 0.55, 0.3, 0.68, 0.45][i] * (w - 240); g.fillStyle = rgba(P.screenGlow, 0.55); g.fillRect(k.rtl ? 34 + 0 : w - 34 - len, y + 6, len, 18); });
  if (which === 2) ['admin', 'sales', 'design', 'finance'].forEach((n, i) => { const y = 100 + i * 52; k.card(34, y, w - 68, 40, { r: 8 }); k.text({ admin: lang === 'ar' ? 'مدير' : 'Administrator', sales: lang === 'ar' ? 'مبيعات' : 'Sales', design: lang === 'ar' ? 'تصميم' : 'Designer', finance: lang === 'ar' ? 'مالية' : 'Finance' }[n], k.mx(52), y + 29, { size: 22 }); ['V', 'E', 'A'].forEach((c, j) => { g.fillStyle = rgba(P.brandOrange, [0.8, 0.5, 0.25][(i + j) % 3]); g.fillRect(w - 150 + j * 34, y + 8, 24, 24); }); });
  k.text(Lx(C.ILLUSTRATIVE, lang), k.mx(34), h - 22, { size: 16, color: P.taupe, max: w - 68 });
}

// ================================================================ decks: generic slides + deck chips on the wall screen
/** the rich built-in renderers, by the `builtin` key of a default-deck slide */
export const BUILTIN_DRAW = { story: drawStory, projects: drawProjectsScreen, hub: drawHub, contact: drawContact, film: drawFilmIdle };
const ACCENT = { orange: P.brandOrange, brass: P.brassPale, sand: P.sand, sage: P.ikMint };

/** deck chips along the top of the wall screen (only drawn when there is more than one deck). Pure layout in design pixels, shared by the drawing and the click hit-test. */
export function chipLayout(titles, w, rtl, max = 3, active = 0) {
  const n = Math.min(titles.length, max), start = Math.max(0, Math.min(titles.length - n, active - 1)), gap = 16, h = 46, y = 18; let total = 0;   // a window of `max` chips that always contains the active deck
  const widths = titles.slice(start, start + n).map((t) => { const cw = Math.min(CHIP_MAX, 44 + t.length * 12); total += cw; return cw; }); total += gap * (n - 1);
  let x = rtl ? 70 : w - 70 - total; return widths.map((cw, i) => { const r = { i: start + i, x, y, w: cw, h }; x += cw + gap; return r; });
}
const CHIP_MAX = 250, CHIP_PAD = 18;
/** the longest prefix of `s` (plus an ellipsis) that fits `maxW` in the CURRENT font; `measure` is g.measureText(...).width. Pure, so it is unit-tested. */
export function ellipsize(s, maxW, measure) {
  const str = String(s); if (measure(str) <= maxW) return str; let lo = 0, hi = str.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (measure(str.slice(0, mid).trimEnd() + '…') <= maxW) lo = mid; else hi = mid - 1; }
  return lo > 0 ? str.slice(0, lo).trimEnd() + '…' : '…';
}
/** room left for the slide stamp line ("Deck title · SLIDE 2 OF 23") beside the chips, in design pixels (0 = no limit: no chips are drawn) */
export function stampRoom(titles, w, rtl, max = 3, active = 0, X = 70, gap = 28) {
  if (!titles || titles.length < 2) return 0; const rects = chipLayout(titles, w, rtl, max, active);
  return Math.max(120, rtl ? w - X - (rects[rects.length - 1].x + rects[rects.length - 1].w) - gap : rects[0].x - X - gap);
}
export function drawDeckChips(g, w, h, o) {
  const k = kit(g, w, h, o.lang), titles = o.decks; if (!titles || titles.length < 2) return; const rects = chipLayout(titles, w, k.rtl, o.max || 3, o.deckIndex || 0);
  // every label is clipped to its own chip with an ellipsis, so neighbouring chips (and the slide stamp line) never run into each other
  rects.forEach((r) => { const on = r.i === o.deckIndex; k.card(r.x, r.y, r.w, r.h, { fill: on ? rgba(P.brandOrange, 0.3) : rgba(P.screenDark, 0.72), line: on ? rgba(P.brandOrange, 0.95) : rgba(P.sand, 0.35), r: 23 }); const wt = on ? 700 : 600; g.font = `${wt} 22px ${FONT}`; k.text(ellipsize(titles[r.i], r.w - 2 * CHIP_PAD, (t) => g.measureText(t).width), r.x + r.w / 2, r.y + 31, { size: 22, weight: wt, color: on ? P.sand : P.taupe, align: 'center' }); });
  if (titles.length > rects.length) k.text(`+${titles.length - rects.length}`, k.rtl ? 70 : w - 70, 86, { size: 22, weight: 700, color: P.taupe, align: k.rtl ? 'left' : 'right' });
}

/** cover-fit an image into a rounded rect, with an optional slow zoom (Ken Burns): scale >= 1 and a pan in 0..1 across the spare room */
function drawCover(g, im, x, y, w, h, scale = 1, pan = 0.5, r = 14) {
  g.save(); roundedRect(g, x, y, w, h, r); g.clip(); const s0 = Math.max(w / im.width, h / im.height) * scale, iw = im.width * s0, ih = im.height * s0;
  g.drawImage(im, x - (iw - w) * pan, y - (ih - h) * 0.5, iw, ih); g.restore();
}
const YEAR = /^(\d{4}):\s*(.*)$/;
/** LEGIBILITY SCALE of the generic slides (design units of the 1536 x 864 wall, i.e. % of the screen height): title 66 (7.6 %), lead 38 (4.4 %), bullets 30-52 (3.5-6 %; the largest size that fits the slide is chosen), table / stat labels 28-30,
 *  captions 24, source + illustrative labels 22, disclaimer 22. Weights 600+ (no thin type), no squeezed text (no maxWidth), safe margins 70 px (sides) and 52 px (bottom). Tested by
 *  __tests__/vipLegibility.test.js against every slide of every committed deck in both languages. */
export const TYPE = { title: 66, hero: 80, lead: 38, bullet: [52, 48, 44, 40, 36, 34, 32, 30], cell: 30, stat: 30, caption: 24, meta: 22, fine: 22, stamp: 26, safeX: 70, safeBottom: 52, bodyBottom: 724 };
/** the LARGEST bullet size whose wrapped text fits the space (so short slides use big type instead of leaving the screen half empty); never below the 30 px floor */
function fitBullets(g, bullets, maxW, availH, sizes) {
  for (const size of sizes) {
    g.font = `600 ${size}px ${FONT}`; let hgt = 0;
    for (const b of bullets) { const m = YEAR.exec(b), txt = m ? m[2] : b, mw = m ? maxW - Math.round(size * 3.3) : maxW; let line = '', lines = 1; for (const wd of String(txt).split(/\s+/)) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > mw && line) { lines++; line = wd; } else line = t; } hgt += lines * size * 1.3 + 8 + size * 0.25; }
    if (hgt <= availH) return size;
  }
  return sizes[sizes.length - 1];
}
/** one generic slide (imported / saved / profile decks): title, lead, bullets, image / table / bar / stat blocks, source + illustrative labels, the disclaimer in the footer.
 *  Layouts: split (default), hero (first image full-bleed, title over it), duo (two images side by side).
 *  o: { lang, slide (resolved), index, count, deckTitle, images: Map url -> HTMLImageElement, anim?: { t seconds since the slide appeared, level (vip/motion.js motionLevel) }, metrics?: [] (collects every text drawn) }
 *  Without `anim` the slide is drawn in its final state (tests, reduced motion). */
export function drawSlide(g, w, h, o) {
  const k = kit(g, w, h, o.lang, o.metrics || null), { lang, slide: s } = o, A = o.anim || null, lv = A && A.level && A.level.on ? A.level : null, t = A && lv ? A.t : 99, X = TYPE.safeX;
  const accent = ACCENT[s.accent] !== undefined ? ACCENT[s.accent] : P.brandOrange, imgs = (s.blocks || []).filter((b) => b.type === 'image'), others = (s.blocks || []).filter((b) => b.type !== 'image');
  const rev = (i, base = 0) => (lv && lv.stagger ? stagger(t, i, { delay: 0.3 + base }) : 1);
  const kb = lv && lv.kenBurns ? 1 + 0.07 * clamp01(t / 16) : 1, pan = lv && lv.kenBurns ? 0.5 + 0.35 * Math.sin(clamp01(t / 16) * Math.PI * 0.5) * (k.rtl ? -1 : 1) : 0.5;
  const word = lang === 'ar' ? 'الشريحة' : 'SLIDE', of = lang === 'ar' ? 'من' : 'OF', stamp = `${o.deckTitle} · ${word} ${o.index + 1} ${of} ${o.count}`;
  const tags = [s.illustrative || (s.blocks || []).some((b) => b.illustrative) ? Lx(C.ILLUSTRATIVE, lang) : '', s.source ? (lang === 'ar' ? 'المصدر: ' : 'Source: ') + s.source : '', ...(s.blocks || []).filter((b) => b.source && b.source !== s.source).map((b) => (lang === 'ar' ? 'المصدر: ' : 'Source: ') + b.source)].filter(Boolean);
  const tagsAndFine = (hero) => {   // source / illustrative labels and the disclaimer: wrapped, never squeezed
    let y = h - TYPE.safeBottom - 40; if (hero) { g.fillStyle = 'rgba(10,8,6,0.55)'; g.fillRect(0, y - 70, w, 140); }
    k.para(Lx(C.DISCLAIMER, lang), k.mx(X), h - TYPE.safeBottom + 6, w - 2 * X, { size: TYPE.fine, weight: 500, color: P.sand, lh: 28 });
    tags.slice(0, 2).reverse().forEach((tt, i) => { k.para(tt, k.mx(X), y - i * 30, w - 2 * X, { size: TYPE.meta, weight: 600, color: P.brassPale, lh: 28 }); });
  };
  const titleIn = (fn) => { const e = lv ? easeOutCubic(t / 0.5) : 1; g.save(); g.globalAlpha = e; g.translate((1 - e) * 46 * (k.rtl ? -1 : 1), 0); fn(); g.restore(); };
  const bulletRow = (b, x, y, maxW, size, e) => {   // one bullet (a "2013: ..." line gets the year in the accent colour); returns the next y
    g.save(); g.globalAlpha = e; g.translate(0, (1 - e) * 22); const m = YEAR.exec(b), yw = Math.round(size * 3.3); let ny;
    if (m) { k.text(m[1], x, y, { size, weight: 800, color: accent, align: k.al }); ny = k.para(m[2], k.rtl ? x - yw : x + yw, y, maxW - yw, { size, weight: 600, color: P.sand, lh: size * 1.3 }) + 8; }
    else { g.fillStyle = hex(accent); g.beginPath(); g.arc(k.rtl ? x + 18 : x - 18, y - size * 0.3, 7, 0, Math.PI * 2); g.fill(); ny = k.para(b, x, y, maxW, { size, weight: 600, color: P.sand, lh: size * 1.3 }) + 8; }
    g.restore(); return ny;
  };
  const head = () => { k.rule(k.mx(X), 32, 90); g.fillStyle = hex(accent); g.fillRect(k.rtl ? w - X - 90 : X, 32, 90, 5); g.font = `600 ${TYPE.stamp}px ${FONT}`; k.text(o.stampMax ? ellipsize(stamp, o.stampMax, (tt) => g.measureText(tt).width) : stamp, k.mx(X), 76, { size: TYPE.stamp, weight: 600, color: P.brassPale }); };

  if (s.layout === 'hero' && imgs.length) {   // ---------------- hero: full-bleed photo, gradient, title bottom-start
    const b = imgs[0], im = o.images && o.images.get(b.url); g.fillStyle = hex(P.ink); g.fillRect(0, 0, w, h);
    if (im && im.width) drawCover(g, im, 0, 0, w, h, kb, pan, 0); else { k.bg(); k.para(b.alt || '', w / 2, h / 2, w * 0.6, { size: 30, weight: 600, color: P.sand, align: 'center', lh: 38 }); }
    const gr = g.createLinearGradient(0, h * 0.2, 0, h); gr.addColorStop(0, 'rgba(10,8,6,0)'); gr.addColorStop(0.5, 'rgba(10,8,6,0.82)'); gr.addColorStop(1, 'rgba(10,8,6,0.96)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(10,8,6,0.55)'; g.fillRect(0, 0, w, 100); head();
    let y = 410; titleIn(() => { y = k.para(s.title, k.mx(X), y, w - 2 * X, { size: TYPE.hero, weight: 800, color: P.sand, lh: 88 }); });
    if (s.lead) { g.save(); g.globalAlpha = rev(0, 0.1); y = k.para(s.lead, k.mx(X), y + 4, w - 2 * X, { size: TYPE.lead, weight: 600, color: accent, lh: 50 }); g.restore(); }
    s.bullets.slice(0, 2).forEach((bt, i) => { y = bulletRow(bt, k.mx(X) + (k.rtl ? -22 : 22), y + 8, w - 2 * X - 44, 32, rev(i + 1)); });
    tagsAndFine(true); return;
  }

  k.bg(); head();
  let ty = 0; titleIn(() => { ty = k.para(s.title, k.mx(X), 150, w - 2 * X, { size: TYPE.title, weight: 800, color: P.sand, lh: 74 }); });
  let y = ty - 20; if (s.lead) { g.save(); g.globalAlpha = rev(0, 0.1); y = k.para(s.lead, k.mx(X), y + 8, w - 2 * X, { size: TYPE.lead, weight: 600, color: accent, lh: 48 }); g.restore(); }
  const bottom = TYPE.bodyBottom, top = Math.max(y + 10, 260);

  if (s.layout === 'duo' && imgs.length) {   // ---------------- duo: bullets under the title, two photos side by side with captions
    let by = top + 28; s.bullets.slice(0, 2).forEach((bt, i) => { by = bulletRow(bt, k.mx(X) + (k.rtl ? -26 : 26), by, w - 2 * X - 52, 32, rev(i + 1)); });
    const itop = Math.min(Math.max(by - 6, 300), bottom - 250), gap = 28, cw = (w - 2 * X - gap) / 2, ch = bottom - itop;
    imgs.slice(0, 2).forEach((b, i) => {
      const x = k.rtl ? w - X - cw - i * (cw + gap) : X + i * (cw + gap), e = rev(i + 1, 0.2), im = o.images && o.images.get(b.url), cap = b.caption ? 48 : 0;
      g.save(); g.globalAlpha = e; g.translate(0, (1 - e) * 28); k.card(x, itop, cw, ch, { fill: rgba(P.sand, 0.05), line: rgba(P.sand, 0.25) });
      if (im && im.width) drawCover(g, im, x, itop, cw, ch - cap, kb, pan); else k.para(b.alt || '', x + cw / 2, itop + (ch - cap) / 2, cw - 40, { size: TYPE.caption, weight: 600, color: P.sand, align: 'center', lh: 32 });
      if (b.caption) { g.fillStyle = 'rgba(10,8,6,0.78)'; g.fillRect(x + 1, itop + ch - 48, cw - 2, 47); k.text(b.caption, x + cw / 2, itop + ch - 14, { size: TYPE.caption + 2, weight: 700, color: P.sand, align: 'center' }); }
      g.restore();
    });
    tagsAndFine(false); return;
  }

  // ---------------- split: bullets on the start side, blocks on the other (full width when there are no blocks)
  const blocks = s.blocks || [], hasBlocks = blocks.length > 0, textW = hasBlocks ? 690 : w - 2 * X - 40, blockW = hasBlocks ? w - 2 * X - 690 - 56 : 0;
  const tableOnly = hasBlocks && others.length === blocks.length && others.every((b) => b.type === 'table'), size = s.bullets.length ? fitBullets(g, s.bullets, textW - 26, bottom - top - 34, hasBlocks ? TYPE.bullet.filter((z) => z <= 40) : TYPE.bullet) : TYPE.bullet[4];
  let by = top + 16 + size; if (!tableOnly) s.bullets.forEach((b, i) => { by = bulletRow(b, k.rtl ? w - X - 26 : X + 26, by, textW - 26, size, rev(i + 1)) + size * 0.25; });
  if (hasBlocks) {
    const ordered = [...imgs, ...others], bx0 = tableOnly ? X : (k.rtl ? X : w - X - blockW), bw = tableOnly ? w - 2 * X : blockW, btop = tableOnly ? top + 12 : Math.max(top, 270), bh = (bottom - btop - 16 * (ordered.length - 1)) / ordered.length; let cy = btop;
    ordered.forEach((b, i) => { const e = rev(s.bullets.length + i + 1, 0.1); g.save(); g.globalAlpha = e; g.translate(0, (1 - e) * 26); drawBlock(k, g, b, bx0, cy, bw, bh, lang, o, accent, { t, lv, kb, pan }); g.restore(); cy += bh + 16; });
  }
  tagsAndFine(false);
}
function drawBlock(k, g, b, x, y, bw, bh, lang, o, accent, mo) {
  const { t, lv, kb, pan } = mo; k.card(x, y, bw, bh, { fill: rgba(P.sand, 0.05), line: rgba(P.sand, 0.25) });
  if (b.type === 'image') {
    const im = o.images && o.images.get(b.url), cap = b.caption ? 44 : 0;
    if (im && im.width) drawCover(g, im, x, y, bw, bh - cap, kb, pan); else k.para(b.alt || '', x + bw / 2, y + (bh - cap) / 2, bw - 40, { size: TYPE.caption, weight: 600, color: P.sand, align: 'center', lh: 32 });
    if (b.caption) k.text(b.caption, x + bw / 2, y + bh - 12, { size: TYPE.caption, weight: 600, color: P.sand, align: 'center' });
  } else if (b.type === 'table') {
    const rows = b.rows || [], head = b.head, cols = Math.max(1, rows[0] ? rows[0].length : 1), cw = (bw - 48) / cols, all = head ? [head, ...rows] : rows, rh = Math.min(76, (bh - 24) / all.length), fs = TYPE.cell;
    all.forEach((r, ri) => { const yy = y + 12 + ri * rh; if (head && ri === 0) { g.fillStyle = rgba(P.brandOrange, 0.28); g.fillRect(x + 12, yy, bw - 24, rh - 6); }
      r.forEach((c, ci) => k.para(c, k.rtl ? x + bw - 24 - ci * cw : x + 24 + ci * cw, yy + rh * 0.62, cw - 20, { size: fs, weight: head && ri === 0 ? 800 : 600, color: P.sand, lh: fs * 1.15 })); });
  } else if (b.type === 'bar') {
    const d = b.data || [], max = Math.max(...d.map((v) => v.value), 1e-9), top = y + (b.title ? 56 : 20), rowH = Math.min(60, (bh - (top - y) - 16) / d.length), labelW = bw * 0.34, maxLen = bw - labelW - 150;
    if (b.title) k.text(b.title, k.rtl ? x + bw - 20 : x + 20, y + 42, { size: TYPE.stat, weight: 700, color: P.brassPale });
    d.forEach((v, i) => { const yy = top + i * rowH, grow = lv && lv.countUp ? easeOutCubic((t - 0.3 - i * 0.12) / 1.0) : 1, len = Math.max(2, (v.value / max) * maxLen * grow), lx = k.rtl ? x + bw - 20 : x + 20, bx = k.rtl ? x + bw - 20 - labelW : x + 20 + labelW;
      k.text(v.label, lx, yy + rowH * 0.66, { size: TYPE.caption, weight: 600, color: P.sand }); g.fillStyle = hex(accent); g.fillRect(k.rtl ? bx - len : bx, yy + rowH * 0.18, len, rowH * 0.52);
      k.text(formatNumber(lv && lv.countUp ? countValue(v.value, t, { delay: 0.3 + i * 0.12, dur: 1.0 }) : v.value) + (b.unit ? ' ' + b.unit : ''), k.rtl ? bx - len - 8 : bx + len + 8, yy + rowH * 0.66, { size: TYPE.caption, weight: 700, color: P.sand, align: k.rtl ? 'right' : 'left' }); });
  } else if (b.type === 'stat') {
    const it = b.items || [], n = it.length, gap = 16, cw = (bw - 32 - gap * (n - 1)) / n;
    it.forEach((v, i) => { const cx = k.rtl ? x + bw - 16 - cw - i * (cw + gap) : x + 16 + i * (cw + gap), cur = lv && lv.countUp ? countValue(v.value, t, { delay: 0.3 + i * 0.15 }) : v.value, ax = cx + cw / 2;
      k.card(cx, y + 16, cw, bh - 32, { fill: rgba(P.brandOrange, 0.1), line: rgba(accent, 0.7) });
      k.text((v.prefix || '') + formatNumber(cur) + (v.suffix || ''), ax, y + 16 + (bh - 32) * 0.44, { size: Math.min(84, Math.max(56, cw / 3.4)), weight: 800, color: accent, align: 'center' }); k.para(v.label, ax, y + 16 + (bh - 32) * 0.44 + 50, cw - 36, { size: TYPE.stat, weight: 600, color: P.sand, align: 'center', lh: 36 }); });
  }
}
/** auto-play badge + progress bar along the bottom of the wall (drawn over any slide while playing) */
export function drawPlayOverlay(g, w, h, o) {
  if (!(o.progress >= 0)) return; const k = kit(g, w, h, o.lang), bw = w - 140, x = 70;
  g.fillStyle = rgba(P.sand, 0.2); g.fillRect(x, h - 24, bw, 8); g.fillStyle = hex(P.brandOrange); g.fillRect(k.rtl ? x + bw - bw * o.progress : x, h - 24, bw * clamp01(o.progress), 8);
  k.text((o.lang === 'ar' ? 'عرض تلقائي · ' : 'AUTO-PLAY · ') + o.speed + 'x', k.mx(w - 70), h - 36, { size: 22, weight: 700, color: P.brassPale, align: k.rtl ? 'left' : 'right' });
}

// ================================================================ FILM mode
/** the wall while the film is NOT running: the poster (when the manifest gave one) with the title and a Play hint, "Loading", or "Film coming soon" when there is no film yet.
 *  o.film = { status, title, poster: HTMLImageElement|null, duration } (explorer.filmView()) */
export function drawFilmIdle(g, w, h, o) {
  const k = kit(g, w, h, o.lang, o.metrics || null), { lang } = o, f = o.film || { status: 'idle' }, X = TYPE.safeX, missing = f.status === 'missing', title = Lx(f.title || FILM_TITLE, lang);
  g.fillStyle = hex(P.ink); g.fillRect(0, 0, w, h); if (f.poster && f.poster.width && !missing) drawCover(g, f.poster, 0, 0, w, h, 1, 0.5, 0); else k.bg(P.brandBrown, P.ink);
  const gr = g.createLinearGradient(0, h * 0.15, 0, h); gr.addColorStop(0, 'rgba(10,8,6,0.35)'); gr.addColorStop(0.55, 'rgba(10,8,6,0.8)'); gr.addColorStop(1, 'rgba(10,8,6,0.96)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,8,6,0.55)'; g.fillRect(0, 0, w, 100); g.fillStyle = hex(P.brandOrange); g.fillRect(k.rtl ? w - X - 90 : X, 32, 90, 5); k.text(Lx(FILM_ENTRY, lang), k.mx(X), 76, { size: TYPE.stamp, weight: 600, color: P.brassPale });
  if (!missing && f.status !== 'loading' && f.status !== 'idle') {   // play button
    const cx = w / 2, cy = 290, r = 74; g.fillStyle = rgba(P.brandOrange, 0.92); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.fillStyle = hex(P.ink); g.beginPath(); g.moveTo(cx - 22, cy - 36); g.lineTo(cx + 40, cy); g.lineTo(cx - 22, cy + 36); g.closePath(); g.fill();
  }
  let y = k.para(title, k.mx(X), 470, w - 2 * X, { size: TYPE.hero, weight: 800, color: P.sand, lh: 88 });
  const line = missing ? Lx(FILM_SOON, lang) : f.status === 'loading' || f.status === 'idle' ? (lang === 'ar' ? 'جارٍ التحميل…' : 'Loading…') : f.status === 'ended' ? (lang === 'ar' ? 'اضغط تشغيل للمشاهدة من جديد.' : 'Press Play to watch again.') : (lang === 'ar' ? 'اضغط تشغيل للمشاهدة. الصوت مفعَّل والتعليق بالعربية.' : 'Press Play to watch. Sound on; narration in Arabic, captions in English.');
  y = k.para(line, k.mx(X), y + 4, w - 2 * X, { size: missing ? 52 : TYPE.lead, weight: 700, color: P.brandOrange, lh: 56 });
  const meta = [missing ? '' : Lx(FILM_AI_LABEL, lang), !missing && f.duration ? fmtTime(f.duration) : ''].filter(Boolean).join(' · ');
  if (meta) k.para(meta, k.mx(X), h - TYPE.safeBottom - 40, w - 2 * X, { size: TYPE.meta, weight: 600, color: P.brassPale, lh: 28 });
  k.para(Lx(C.DISCLAIMER, lang), k.mx(X), h - TYPE.safeBottom + 6, w - 2 * X, { size: TYPE.fine, weight: 500, color: P.sand, lh: 28 });
}
/** the strip over the bottom of the playing film: the current caption (large, on a dark band) and the small "AI-generated illustration" label. Drawn on its own transparent canvas (w x h = 1536 x 220). */
export function drawFilmOverlay(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o; g.clearRect(0, 0, w, h);
  if (o.cue) { g.font = `700 40px ${FONT}`; const lines = []; let line = ''; for (const wd of String(o.cue).split(/\s+/)) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 240 && line) { lines.push(line); line = wd; } else line = t; } if (line) lines.push(line); const ls = lines.slice(0, 2), bh = ls.length * 52 + 28, by = h - 58 - bh;
    const bw = Math.min(w - 120, Math.max(...ls.map((l) => g.measureText(l).width)) + 64); g.fillStyle = 'rgba(8,6,5,0.78)'; roundedRect(g, (w - bw) / 2, by, bw, bh, 14); g.fill(); g.direction = o.capLang === 'ar' ? 'rtl' : 'ltr'; ls.forEach((l, i) => k.text(l, w / 2, by + 50 + i * 52, { size: 40, weight: 700, color: P.sand, align: 'center' })); g.direction = lang === 'ar' ? 'rtl' : 'ltr'; }
  const lab = Lx(FILM_AI_LABEL, lang); g.font = `600 22px ${FONT}`; const lw = g.measureText(lab).width + 28, lx = k.rtl ? 40 : w - 40 - lw; g.fillStyle = 'rgba(8,6,5,0.6)'; roundedRect(g, lx, h - 46, lw, 34, 8); g.fill(); k.text(lab, lx + lw / 2, h - 21, { size: 22, weight: 600, color: P.sand, align: 'center' });
}
