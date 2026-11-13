/* Canvas drawings of the VIP room: the five station screens (animated by `t` seconds), the gallery wall, the Hub department chart, the floor map and the three
 * floating panels. Everything is drawn from existing copy / data (products/vipContent.js, content/facts.js, the site's project rows); mock-ups are labelled
 * "illustrative". RTL aware: text anchors flip, shapes mirror. Fonts: the site's IBM Plex Sans Arabic / Inter. */
import { PALETTE as P, hex, rgba } from '../../3d/palette';
import { FONT, wrap, roundedRect } from '../products/screens';
import * as C from '../../products/vipContent';
import { businessLines } from '../../products/vipContent';
import { projectCard } from '../../products/projectsFeed';

const Lx = C.L;
/** small drawing toolkit bound to a canvas context + language */
function kit(g, w, h, lang) {
  const rtl = lang === 'ar', al = rtl ? 'right' : 'left';
  return {
    rtl, al, mx: (x) => (rtl ? w - x : x), L: (o) => Lx(o, lang),
    text(s, x, y, { size = 28, weight = 400, color = P.sand, align = al, max } = {}) { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = typeof color === 'string' ? color : hex(color); g.textAlign = align; g.textBaseline = 'alphabetic'; if (max) { g.save(); g.fillText(s, x, y, max); g.restore(); } else g.fillText(s, x, y); },
    para(s, x, y, maxW, { size = 26, weight = 400, color = P.taupe, lh = size * 1.4, align = al } = {}) { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = hex(color); return wrap(g, s, x, y, maxW, lh, align); },
    bg(a = P.screenDark, b = P.ink) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(a)); gr.addColorStop(1, hex(b)); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = rgba(P.screenGlow, 0.05); g.lineWidth = 1; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } },
    card(x, y, cw, ch, { fill = rgba(P.sand, 0.06), line = rgba(P.sand, 0.18), dash = false, r = 14 } = {}) { roundedRect(g, x, y, cw, ch, r); g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = 2; g.setLineDash(dash ? [10, 7] : []); g.stroke(); g.setLineDash([]); },
    rule(x, y, len, color = P.brandOrange) { g.fillStyle = hex(color); g.fillRect(rtl ? x - len : x, y, len, 5); },
  };
}
const head = (k, w, eyebrow, title, y0 = 70) => { k.rule(k.mx(70), y0 - 38, 90); k.text(eyebrow, k.mx(70), y0, { size: 24, weight: 600, color: P.brassPale }); k.text(title, k.mx(70), y0 + 70, { size: 66, weight: 700 }); };
const footer = (k, w, h, lang, extra) => { k.text(Lx(C.DISCLAIMER, lang), k.mx(70), h - 36, { size: 22, color: P.taupe, max: w - 140 }); if (extra) k.text(extra, k.mx(w - 70), h - 36, { size: 20, color: P.taupe, align: k.rtl ? 'left' : 'right' }); };
const tagIllus = (k, w, lang, y) => { k.text(Lx(C.ILLUSTRATIVE, lang), k.mx(w - 70), y, { size: 20, color: P.brassPale, align: k.rtl ? 'left' : 'right' }); };

/** station 1: the company story and brand */
export function drawStory(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o; k.bg(); head(k, w, lang === 'ar' ? 'المحطة 1 من 5' : 'STATION 1 OF 5', Lx(C.STATIONS[0].title, lang));
  if (o.logo) { const lw = 360, lh = lw / (o.logo.width / o.logo.height || 1.75), x = k.rtl ? w - 70 - lw : 70; g.fillStyle = hex(P.logoPaper); roundedRect(g, x - 14, 210, lw + 28, lh + 28, 14); g.fill(); g.drawImage(o.logo, x, 224, lw, lh); }
  const lines = C.storyLines(); let y = 480; const tx = k.mx(70);
  k.text(Lx(C.STATIONS[0].lead, lang), tx, 440, { size: 40, weight: 600, color: P.brandOrange });
  for (const l of lines) y = k.para(Lx(l, lang), tx, y + 14, w * 0.46, { size: 28 }) + 6;
  const cf = C.contestedFacts(), gx = k.rtl ? 70 : w * 0.56, gw = w * 0.44 - 70, cw = (gw - 24) / 2, chh = 200;
  cf.forEach((f, i) => { const cx = gx + (i % 2) * (cw + 24), cy = 230 + Math.floor(i / 2) * (chh + 24); k.card(cx, cy, cw, chh, { dash: !f.confirmed, line: f.confirmed ? rgba(P.sand, 0.3) : rgba(P.brandOrange, 0.7) });
    const ax = k.rtl ? cx + cw - 24 : cx + 24; k.text(Lx(f.label, lang), ax, cy + 56, { size: 24, weight: 600, color: P.taupe }); k.para(Lx(f.value, lang), ax, cy + 108, cw - 48, { size: f.confirmed ? 40 : 28, weight: f.confirmed ? 700 : 600, color: f.confirmed ? P.sand : P.brandOrange, lh: 36 }); if (!f.confirmed) k.text(lang === 'ar' ? 'بانتظار الإدارة' : 'PLACEHOLDER', ax, cy + chh - 22, { size: 16, weight: 700, color: P.brassPale }); });
  k.card(gx, 230 + 2 * (chh + 24), gw, 120, { line: rgba(P.brass, 0.7) }); const bx = k.rtl ? gx + gw - 24 : gx + 24; k.text(lang === 'ar' ? 'ضمان' : 'Warranty', bx, 230 + 2 * (chh + 24) + 46, { size: 22, weight: 600, color: P.taupe }); k.text(Lx(C.storyLines()[1], lang), bx, 230 + 2 * (chh + 24) + 92, { size: 26, weight: 600, max: gw - 48 });
  footer(k, w, h, lang);
}

/** station 2: the business-line map (a hub-and-spoke diagram of the real departments and services) + status of the project gallery */
export function drawProjectsScreen(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o; k.bg(); head(k, w, lang === 'ar' ? 'المحطة 2 من 5' : 'STATION 2 OF 5', Lx(C.STATIONS[1].title, lang));
  const lines = businessLines(lang), cx = k.rtl ? w * 0.3 : w * 0.7, cy = h * 0.55, R = Math.min(w * 0.22, h * 0.36);
  g.strokeStyle = rgba(P.screenGlow, 0.25); g.lineWidth = 2; for (const rr of [R * 0.55, R]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = hex(P.brandOrange); g.beginPath(); g.arc(cx, cy, 54, 0, Math.PI * 2); g.fill(); k.text(lang === 'ar' ? 'ذا كلوزتس' : 'The Closets', cx, cy + 7, { size: 20, weight: 700, color: P.ink, align: 'center' });
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
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o; k.bg(); head(k, w, lang === 'ar' ? 'المحطة 3 من 5' : 'STATION 3 OF 5', Lx(C.STATIONS[2].title, lang));
  const fl = C.HUB_FLOW, y0 = 320, x0 = 120, x1 = w - 120, step = (x1 - x0) / (fl.length - 1);
  g.strokeStyle = rgba(P.screenGlow, 0.35); g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  fl.forEach((s, i) => { const x = k.rtl ? x1 - i * step : x0 + i * step, on = ((t * 0.7) % fl.length) | 0; const act = i === on; g.fillStyle = act ? hex(P.brandOrange) : hex(P.brassPale); g.beginPath(); g.arc(x, y0, act ? 20 : 14, 0, Math.PI * 2); g.fill();
    k.text(Lx(s.name, lang), x, y0 + 62, { size: 30, weight: 700, align: 'center' }); k.text(Lx(s.sub, lang), x, y0 + 96, { size: 19, color: P.taupe, align: 'center', max: step - 20 }); });
  const p = ((t * 0.7) % fl.length), seg = Math.min(fl.length - 2, p | 0), f = p - seg, dx = (k.rtl ? x1 - (seg + f) * step : x0 + (seg + f) * step); g.fillStyle = hex(P.sand); g.beginPath(); g.arc(dx, y0, 8, 0, Math.PI * 2); g.fill();
  // department module counts (real, from the Hub module map)
  const bx = k.mx(70), bw = w * 0.42, rowH = 40, by = 520, max = Math.max(...C.HUB_DEPARTMENTS.map((d) => d.modules));
  k.text(lang === 'ar' ? 'عدد الوحدات لكل قسم (من خريطة وحدات المنصة)' : 'Modules per department (from the Hub module map)', bx, by - 14, { size: 22, weight: 600, color: P.brassPale });
  C.HUB_DEPARTMENTS.slice(0, 9).forEach((d, i) => { const y = by + 14 + i * rowH, len = (d.modules / max) * (bw - 330), grow = Math.min(1, (t * 0.8 - i * 0.12) + 0.2); const gl = Math.max(0, Math.min(1, grow)) * len;
    k.text(Lx(d.name, lang), bx, y + 22, { size: 20, max: 250 }); const sx = k.rtl ? bx - 270 : bx + 270; g.fillStyle = hex(P.brandOrange); g.fillRect(k.rtl ? sx - gl : sx, y + 6, gl, 18); k.text(String(d.modules), k.rtl ? sx - gl - 10 : sx + gl + 10, y + 22, { size: 20, color: P.taupe }); });
  // capabilities
  const cx0 = k.rtl ? 70 : w * 0.52, cw = (w * 0.48 - 70 - 20) / 2;
  C.HUB_CAPABILITIES.forEach((c, i) => { const x = cx0 + (i % 2) * (cw + 20), y = 500 + Math.floor(i / 3 * 1) * 0 + Math.floor(i / 2) * 118; k.card(x, y, cw, 104, { line: rgba(P.brass, 0.4) }); const ax = k.rtl ? x + cw - 18 : x + 18; k.text(Lx(c.title, lang), ax, y + 38, { size: 24, weight: 700, color: P.brassPale, max: cw - 36 }); k.para(Lx(c.body, lang), ax, y + 68, cw - 36, { size: 16, lh: 20 }); });
  tagIllus(k, w, lang, 120); footer(k, w, h, lang, lang === 'ar' ? 'المصدر: مستودع المنصة' : 'Source: the Hub repository');
}

/** station 4: the investor path: five steps, no figures */
export function drawInvest(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o; k.bg(); head(k, w, lang === 'ar' ? 'المحطة 4 من 5' : 'STATION 4 OF 5', Lx(C.STATIONS[3].title, lang));
  const n = C.INVEST_STEPS.length, mx = 70, gap = 24, cw = (w - 2 * mx - gap * (n - 1)) / n, y = 260, ch = 440, on = ((t * 0.5) % n) | 0;
  C.INVEST_STEPS.forEach((s, i) => { const x = k.rtl ? w - mx - cw - i * (cw + gap) : mx + i * (cw + gap), act = i === on; k.card(x, y, cw, ch, { fill: act ? rgba(P.brandOrange, 0.16) : rgba(P.sand, 0.05), line: act ? rgba(P.brandOrange, 0.9) : rgba(P.sand, 0.2) });
    g.fillStyle = act ? hex(P.brandOrange) : hex(P.brassPale); g.beginPath(); g.arc(x + cw / 2, y + 62, 34, 0, Math.PI * 2); g.fill(); k.text(String(i + 1), x + cw / 2, y + 74, { size: 38, weight: 700, color: P.ink, align: 'center' });
    k.para(Lx(s.title, lang), x + cw / 2, y + 150, cw - 30, { size: 30, weight: 700, color: P.sand, align: 'center', lh: 36 }); k.para(Lx(s.body, lang), x + cw / 2, y + 270, cw - 36, { size: 22, align: 'center', lh: 30 }); });
  k.card(mx, 740, w - 2 * mx, 90, { line: rgba(P.brass, 0.7) }); k.text(Lx(C.DISCLAIMER, lang), w / 2, 796, { size: 28, weight: 600, align: 'center', max: w - 2 * mx - 60 });
  k.text(lang === 'ar' ? 'لا أرقام ولا عوائد ولا وعود في هذه العملية.' : 'No figures, no returns, no promises in this process.', k.mx(70), h - 36, { size: 22, color: P.taupe });
}

/** station 5: the call to action (routes to the existing booking page; the real button is in the panel) */
export function drawBriefing(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o; k.bg(P.brandBrown, P.ink); head(k, w, lang === 'ar' ? 'المحطة 5 من 5' : 'STATION 5 OF 5', Lx(C.STATIONS[4].title, lang));
  k.para(Lx(C.STATIONS[4].lead, lang), k.mx(70), 330, w * 0.5, { size: 38, weight: 600, color: P.sand, lh: 50 });
  const bw = 620, bh = 96, bx = k.rtl ? w - 70 - bw : 70, by = 500, glow = 0.5 + 0.5 * Math.sin(t * 2.2);
  g.shadowColor = rgba(P.brandOrange, 0.5 + 0.3 * glow); g.shadowBlur = 30 + 20 * glow; g.fillStyle = hex(P.brandOrange); roundedRect(g, bx, by, bw, bh, 48); g.fill(); g.shadowBlur = 0;
  k.text(lang === 'ar' ? 'اطلب إحاطة خاصة للمستثمرين' : 'Request a private investor briefing', bx + bw / 2, by + 62, { size: 32, weight: 700, color: P.ink, align: 'center' });
  const px = k.rtl ? 70 : w * 0.58, pw = w * 0.42 - 70; k.card(px, 250, pw, 440, { line: rgba(P.brass, 0.5) }); const ax = k.rtl ? px + pw - 30 : px + 30;
  k.text(lang === 'ar' ? 'ما نحتاجه من الإدارة' : 'Still to be provided by management', ax, 306, { size: 24, weight: 700, color: P.brassPale, max: pw - 60 });
  [[{ en: 'Investor information pack', ar: 'الحزمة التعريفية للمستثمرين' }], [{ en: 'Funding sought', ar: 'التمويل المطلوب' }], [{ en: 'Financial statements', ar: 'القوائم المالية' }], [{ en: 'Dedicated management contact', ar: 'جهة اتصال مخصصة في الإدارة' }]].forEach(([n], i) => { k.card(px + 20, 336 + i * 80, pw - 40, 64, { dash: true, line: rgba(P.brandOrange, 0.7) }); k.text(Lx(n, lang), ax + 4, 376 + i * 80, { size: 22, weight: 600, max: pw * 0.5 }); k.text(lang === 'ar' ? Lx(C.PLACEHOLDER, lang) : 'To be confirmed by management', k.rtl ? px + 36 : px + pw - 36, 376 + i * 80, { size: 18, color: P.brandOrange, align: k.rtl ? 'left' : 'right', max: pw * 0.42 }); });
  const ct = C.contactLines(lang); ct.forEach((c, i) => k.text(`${Lx(c.label, lang)}: ${c.text}`, k.mx(70), 640 + i * 40, { size: 26, color: P.sand })); footer(k, w, h, lang);
}
export const STATION_DRAW = [drawStory, drawProjectsScreen, drawHub, drawInvest, drawBriefing];

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
