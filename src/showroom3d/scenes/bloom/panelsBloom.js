/* Canvas drawings of Floor 2: the Staff Operations wall, the Leads wall, the lobby sign and the Haneen AI hologram card. They use the SAME drawing kit and type scale as the VIP
 * panels (scenes/vip/panels.js: kit, TYPE) and the same canvas pipeline (makePanel: anisotropy 8, mipmaps, design-size scaling), so text is as crisp as in the VIP room.
 * All numbers on the Ops and Leads walls are SAMPLE data (bloom/ops.js) and every panel says "Illustrative data". RTL aware. */
import { PALETTE as P, hex, rgba } from '../../3d/palette';
import { FONT, roundedRect } from '../products/screens';
import { kit } from '../vip/panels';
import { BLOOM, L } from '../../bloom/strings';
import { ILLUSTRATIVE, opsFrame, SAMPLE_CARDS, STAGES } from '../../bloom/ops';
import { BLOOM_LIGHT } from '../../bloom/palette';

export const DESIGN = { ops: { w: 2304, h: 768 }, leads: { w: 2816, h: 742 }, sign: { w: 1536, h: 384 }, haneen: { w: 768, h: 512 } };
const num = (n, lang) => String(n);   // Western digits in both languages, as everywhere in the VIP decks

const frame = (g, w, h) => { g.fillStyle = hex(0x0e0d0f); g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(0x1b1714)); gr.addColorStop(1, hex(0x0b0a0c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); };

/** Staff operations wall: pipeline funnel (left), today's tasks (middle), targets (right) */
export function drawOpsWall(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o, f = opsFrame(t); frame(g, w, h);
  k.rule(k.mx(56), 30, 90); k.text(L(BLOOM.opsTitle, lang), k.mx(56), 82, { size: 52, weight: 700, color: P.sand });
  k.text(L(ILLUSTRATIVE, lang), k.mx(w - 56), 72, { size: 30, weight: 700, color: BLOOM_LIGHT.brass, align: k.rtl ? 'left' : 'right' });
  const colW = (w - 56 * 2 - 48 * 2) / 3, top = 124, ch = h - top - 48, X = (i) => (k.rtl ? w - 56 - colW - i * (colW + 48) : 56 + i * (colW + 48));
  // 1. pipeline funnel
  { const x = X(0); k.card(x, top, colW, ch, { line: rgba(P.brass, 0.5) }); k.text(L(BLOOM.pipeline, lang), k.mx(x + (k.rtl ? colW - 28 : 28) ), top + 52, { size: 34, weight: 700, color: P.brassPale });
    const max = f.stages[0].n; f.stages.forEach((s, i) => { const bw = (colW - 56) * (0.28 + 0.72 * s.n / max), by = top + 84 + i * 96, bx = x + (colW - bw) / 2;
      g.fillStyle = rgba(BLOOM_LIGHT.orange, 0.95 - i * 0.2); roundedRect(g, bx, by, bw, 76, 12); g.fill();
      k.text(L(s.title, lang), bx + bw / 2, by + 34, { size: 28, weight: 700, color: P.ink, align: 'center' }); k.text(num(s.n, lang), bx + bw / 2, by + 66, { size: 34, weight: 800, color: P.ink, align: 'center' }); }); }
  // 2. today's tasks
  { const x = X(1), tx = k.rtl ? x + colW - 28 : x + 28; k.card(x, top, colW, ch, { line: rgba(P.brass, 0.5) }); k.text(L(BLOOM.tasksToday, lang), k.mx(tx), top + 52, { size: 34, weight: 700, color: P.brassPale });
    f.tasks.forEach((tk, i) => { const y = top + 112 + i * 78, bx = k.rtl ? x + colW - 28 - 30 : x + 28; g.strokeStyle = hex(tk.done ? BLOOM_LIGHT.orange : P.taupe); g.lineWidth = 4; roundedRect(g, bx, y - 26, 30, 30, 7); g.stroke();
      if (tk.done) { g.fillStyle = hex(BLOOM_LIGHT.orange); roundedRect(g, bx + 6, y - 20, 18, 18, 4); g.fill(); }
      k.text(L(tk.title, lang), k.rtl ? bx - 20 : bx + 48, y, { size: 30, weight: tk.done ? 500 : 700, color: tk.done ? P.taupe : P.sand }); }); }
  // 3. targets (progress bars, the fill animates with the sample drift)
  { const x = X(2), bw = colW - 56; k.card(x, top, colW, ch, { line: rgba(P.brass, 0.5) }); k.text(L(BLOOM.targets, lang), k.mx(k.rtl ? x + colW - 28 : x + 28), top + 52, { size: 34, weight: 700, color: P.brassPale });
    f.targets.forEach((tg, i) => { const y = top + 112 + i * 118, bx = x + 28; k.text(L(tg.title, lang), k.mx(k.rtl ? x + colW - 28 : x + 28), y, { size: 30, weight: 600, color: P.sand });
      g.fillStyle = 'rgba(245,240,230,0.16)'; roundedRect(g, bx, y + 22, bw, 26, 13); g.fill(); g.fillStyle = hex(BLOOM_LIGHT.orange); const fw = Math.max(26, bw * tg.pct / 100); roundedRect(g, k.rtl ? bx + bw - fw : bx, y + 22, fw, 26, 13); g.fill();
      k.text(num(tg.pct, lang) + '%', k.rtl ? bx : bx + bw, y + 4, { size: 30, weight: 800, color: BLOOM_LIGHT.brass, align: k.rtl ? 'left' : 'right' }); }); }
}

/** Leads wall: four stage columns New > Contacted > Quoted > Won with sample counts and sample cards */
export function drawLeadsWall(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o, f = opsFrame(t); frame(g, w, h);
  k.rule(k.mx(56), 28, 90); k.text(L(BLOOM.leadsTitle, lang), k.mx(56), 80, { size: 52, weight: 700, color: P.sand });
  k.text(L(ILLUSTRATIVE, lang), k.mx(w - 56), 70, { size: 30, weight: 700, color: BLOOM_LIGHT.brass, align: k.rtl ? 'left' : 'right' });
  const n = STAGES.length, gap = 28, colW = (w - 56 * 2 - gap * (n - 1)) / n, top = 112, ch = h - top - 36;
  STAGES.forEach((s, i) => { const idx = k.rtl ? n - 1 - i : i, x = 56 + idx * (colW + gap), st = f.stages[i]; k.card(x, top, colW, ch, { line: rgba(P.brass, 0.45) });
    const ax = k.rtl ? x + colW - 26 : x + 26; k.text(L(s.title, lang), ax, top + 50, { size: 36, weight: 700, color: P.brassPale });
    g.fillStyle = hex(BLOOM_LIGHT.orange); const cx = k.rtl ? x + 52 : x + colW - 52; g.beginPath(); g.arc(cx, top + 38, 30, 0, Math.PI * 2); g.fill(); k.text(num(st.n, lang), cx, top + 50, { size: 34, weight: 800, color: P.ink, align: 'center' });
    if (i < n - 1) { const ax2 = k.rtl ? x - gap / 2 : x + colW + gap / 2; g.fillStyle = hex(P.brass); g.beginPath(); g.moveTo(ax2 + (k.rtl ? 8 : -8), top + 22); g.lineTo(ax2 + (k.rtl ? -8 : 8), top + 38); g.lineTo(ax2 + (k.rtl ? 8 : -8), top + 54); g.closePath(); g.fill(); }
    (SAMPLE_CARDS[s.id] || []).forEach((c, j) => { const cy = top + 92 + j * 86; k.card(x + 18, cy, colW - 36, 70, { fill: rgba(P.sand, 0.07), line: rgba(P.sand, 0.14), r: 10 }); k.text(L(c, lang), ax, cy + 44, { size: 28, weight: 600, color: P.sand, max: colW - 70 }); }); });
}

/** the lobby sign over the lift: FLOOR 2 / Bloom Meeting */
export function drawBloomSign(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o; frame(g, w, h);
  g.fillStyle = hex(BLOOM_LIGHT.orange); g.fillRect(k.rtl ? w - 80 - 120 : 80, 56, 120, 8);
  k.text(lang === 'ar' ? 'الطابق الثاني' : 'FLOOR 2', k.mx(80), 130, { size: 40, weight: 600, color: P.brassPale });
  k.text(L(BLOOM.name, lang), k.mx(80), 260, { size: 120, weight: 800, color: P.sand });
  k.text(L(BLOOM.boardSub, lang), k.mx(80), 330, { size: 40, weight: 500, color: P.taupe });
}
/** the Haneen AI hologram card at the lobby desk */
export function drawHaneenCard(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o; g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(8,10,18,0.55)'; roundedRect(g, 6, 6, w - 12, h - 12, 28); g.fill(); g.strokeStyle = rgba(BLOOM_LIGHT.orange, 0.9); g.lineWidth = 4; g.stroke();
  const cx = k.rtl ? w - 120 : 120, cy = 150; for (let i = 0; i < 3; i++) { g.strokeStyle = rgba(BLOOM_LIGHT.orange, 0.8 - i * 0.22); g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, 48 + i * 18 + Math.sin(t * 2 + i) * 3, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = hex(BLOOM_LIGHT.cream); g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill();
  k.text(L(BLOOM.haneenName, lang), k.mx(k.rtl ? 220 : 230), 142, { size: 64, weight: 800, color: P.sand }); k.text(L(BLOOM.haneenRole, lang), k.mx(k.rtl ? 220 : 230), 196, { size: 34, weight: 500, color: P.brassPale });
  k.para(lang === 'ar' ? 'اضغط E أو المس هنا للسؤال عن YAS Factory' : 'Press E or tap to ask about YAS Factory', k.mx(48), 330, w - 96, { size: 34, weight: 600, color: P.sand, lh: 44 });
  k.text(lang === 'ar' ? 'مساعد ذكاء اصطناعي · للاطلاع فقط' : 'AI assistant · informational only', k.mx(48), h - 44, { size: 26, weight: 500, color: P.taupe });
}
