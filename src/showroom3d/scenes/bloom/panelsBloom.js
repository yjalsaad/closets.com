/* Canvas drawings of Floor 2: the Staff Operations wall, the Leads wall, the lobby sign and the Haneen AI hologram card. They use the SAME drawing kit and type scale as the VIP
 * panels (scenes/vip/panels.js: kit, TYPE) and the same canvas pipeline (makePanel: anisotropy 8, mipmaps, design-size scaling), so text is as crisp as in the VIP room.
 * All numbers on the Ops and Leads walls are SAMPLE data (bloom/ops.js) and every panel says "Illustrative data". RTL aware. */
import { PALETTE as P, hex, rgba } from '../../3d/palette';
import { FONT, roundedRect } from '../products/screens';
import { kit } from '../vip/panels';
import { BLOOM, L } from '../../bloom/strings';
import { ILLUSTRATIVE, opsFrame, roadmapFrame, ROADMAP_STAGES, ROADMAP_FILTERS, ROADMAP_RULES, ROADMAP_BADGES, ROADMAP_NOTE } from '../../bloom/ops';
import { OPTIONS_SOON } from '../../bloom/offices';
import { BLOOM_LIGHT } from '../../bloom/palette';
import { JOURNEY_LANES, JOURNEY_TITLE, JOURNEY_SUB, JOURNEY_AFTER, JOURNEY_NOTE, JOURNEY_GATE_LABEL, journeyRuns, stageColor as journeyColor } from '../../bloom/journey';

export const DESIGN = { ops: { w: 2304, h: 768 }, leads: { w: 3072, h: 819 }, floor: { w: 2048, h: 256 }, journey: { w: 3072, h: 900 }, plate: { w: 1024, h: 256 }, options: { w: 1024, h: 640 }, sign: { w: 1536, h: 384 }, haneen: { w: 768, h: 512 } };
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

const stageColor = (id) => ({ new: BLOOM_LIGHT.cream, contacted: BLOOM_LIGHT.warm, proposal: BLOOM_LIGHT.brass, won: BLOOM_LIGHT.orange, lost: P.taupe }[id] || P.sand);

/** Lead Roadmap wall (leads zone): the structure of the Bonsai Hub Lead Roadmap (path of five stages with counts, five columns with cards, filters, move rules). Sample data only. */
export function drawRoadmapWall(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o, f = roadmapFrame(t); frame(g, w, h);
  k.rule(k.mx(56), 24, 90); k.text(lang === 'ar' ? 'خارطة العملاء المحتملين' : 'Lead Roadmap', k.mx(56), 76, { size: 54, weight: 800, color: P.sand });
  k.text(L(ROADMAP_NOTE, lang), k.mx(56), 112, { size: 26, weight: 500, color: P.taupe });
  k.text(L(ILLUSTRATIVE, lang), k.mx(w - 56), 70, { size: 32, weight: 800, color: BLOOM_LIGHT.brass, align: k.rtl ? 'left' : 'right' });
  // the filter chips (Owner, Source, Search, Stale only)
  { let x = w - 56; const y = 100; ROADMAP_FILTERS.slice().reverse().forEach((c) => { const label = L(c, lang); g.font = `600 24px ${FONT}`; const cw = g.measureText(label).width + 36; const cx = k.rtl ? w - x : x - cw; g.strokeStyle = rgba(P.sand, 0.3); g.lineWidth = 2; roundedRect(g, k.rtl ? w - x : cx, y, cw, 36, 18); g.stroke(); k.text(label, (k.rtl ? w - x : cx) + cw / 2, y + 26, { size: 24, weight: 600, color: P.sand, align: 'center' }); x -= cw + 12; }); }
  // the roadmap path: New > Contacted > Proposal Sent > Won, with Lost as the branch
  const n = f.stages.length, pad = 56, top = 160, pathH = 96, colGap = 24, colW = (w - pad * 2 - colGap * (n - 1)) / n, idx = (i) => (k.rtl ? n - 1 - i : i);
  f.stages.forEach((s, i) => { const x = pad + idx(i) * (colW + colGap), cx = x + colW / 2, cy = top + pathH / 2, col = stageColor(s.id);
    if (i > 0 && i < 4) { const px = pad + idx(i - 1) * (colW + colGap) + colW / 2; g.strokeStyle = rgba(P.brass, 0.7); g.lineWidth = 5; g.beginPath(); g.moveTo(px + (k.rtl ? -34 : 34), cy); g.lineTo(cx + (k.rtl ? 34 : -34), cy); g.stroke(); }
    if (i === 4) { const px = pad + idx(2) * (colW + colGap) + colW / 2; g.setLineDash([12, 9]); g.strokeStyle = rgba(P.taupe, 0.8); g.lineWidth = 4; g.beginPath(); g.moveTo(px, cy + 34); g.quadraticCurveTo((px + cx) / 2, cy + 90, cx, cy + 34); g.stroke(); g.setLineDash([]); }
    g.fillStyle = hex(col); g.beginPath(); g.arc(cx, cy, 34, 0, Math.PI * 2); g.fill(); k.text(String(s.n), cx, cy + 12, { size: 34, weight: 800, color: P.ink, align: 'center' }); });
  // the five columns with cards
  const colTop = top + pathH + 26, colH = 392;
  f.stages.forEach((s, i) => { const x = pad + idx(i) * (colW + colGap), col = stageColor(s.id), ax = k.rtl ? x + colW - 24 : x + 24; k.card(x, colTop, colW, colH, { line: rgba(col, 0.55) });
    g.fillStyle = hex(col); g.fillRect(x + 1, colTop + 1, colW - 2, 8); k.text(L(s.title, lang), ax, colTop + 52, { size: 36, weight: 800, color: col });
    (f.cards[s.id] || []).forEach((c, j) => { const cy = colTop + 78 + j * 104; k.card(x + 16, cy, colW - 32, 90, { fill: rgba(P.sand, 0.07), line: rgba(P.sand, 0.14), r: 10 });
      k.text(c.code + ' · ' + L(c.line, lang), ax, cy + 36, { size: 28, weight: 700, color: P.sand });
      const badge = c.due ? ['due', BLOOM_LIGHT.orange] : c.stale ? ['stale', BLOOM_LIGHT.brass] : c.reason ? ['reason', P.taupe] : null;
      if (badge) { const label = L(ROADMAP_BADGES[badge[0]], lang); g.font = `600 22px ${FONT}`; const bw = g.measureText(label).width + 24, bx = k.rtl ? x + colW - 16 - 24 - bw : x + 40; g.strokeStyle = hex(badge[1]); g.lineWidth = 2; roundedRect(g, bx, cy + 50, bw, 30, 15); g.stroke(); k.text(label, bx + bw / 2, cy + 72, { size: 22, weight: 600, color: badge[1], align: 'center' }); } }); });
  // the move rules
  { const ry = colTop + colH + 22, rw = (w - pad * 2 - 3 * 18) / 4; ROADMAP_RULES.forEach((r, i) => { const rx = pad + (k.rtl ? 3 - i : i) * (rw + 18); k.card(rx, ry, rw, 112, { fill: rgba(P.brass, 0.08), line: rgba(P.brass, 0.4), r: 12 }); k.para(L(r, lang), k.rtl ? rx + rw - 18 : rx + 18, ry + 36, rw - 36, { size: 24, weight: 600, color: P.sand, lh: 30 }); }); }
}

/** the roadmap path inlaid in the lobby floor in front of the wall (flat, readable from a few metres) */
export function drawRoadmapFloor(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, t = 0 } = o, f = roadmapFrame(t); g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(12,10,9,0.72)'; roundedRect(g, 6, 6, w - 12, h - 12, 28); g.fill(); g.strokeStyle = rgba(BLOOM_LIGHT.brass, 0.9); g.lineWidth = 4; g.stroke();
  const n = 4, gap = (w - 200) / (n - 1);
  for (let i = 0; i < n; i++) { const x = k.rtl ? w - 100 - i * gap : 100 + i * gap, s = f.stages[i]; if (i < n - 1) { g.strokeStyle = rgba(BLOOM_LIGHT.brass, 0.8); g.lineWidth = 6; g.beginPath(); g.moveTo(x, h / 2); g.lineTo(k.rtl ? x - gap : x + gap, h / 2); g.stroke(); }
    g.fillStyle = hex(stageColor(s.id)); g.beginPath(); g.arc(x, h / 2, 26, 0, Math.PI * 2); g.fill(); k.text(String(s.n), x, h / 2 + 9, { size: 26, weight: 800, color: P.ink, align: 'center' }); k.text(L(s.title, lang), x, h / 2 - 40, { size: 28, weight: 700, color: P.sand, align: 'center' }); }
  k.text(L(ILLUSTRATIVE, lang), w / 2, h - 24, { size: 22, weight: 700, color: BLOOM_LIGHT.brass, align: 'center' });
}

/** the name plate on an office's fascia: the title in both languages, an accent bar in the office's colour (titles only, no person) */
export function drawNamePlate(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, office } = o; frame(g, w, h);
  g.fillStyle = hex(office.accent); g.fillRect(k.rtl ? w - 40 - 10 : 40, 40, 10, h - 80);
  k.text(L(office.title, lang), k.mx(70), 118, { size: 64, weight: 800, color: P.sand, max: w - 140 });
  k.text(lang === 'ar' ? office.title.en : office.title.ar, k.mx(70), 192, { size: 44, weight: 500, color: P.taupe, max: w - 140 });
}
/** the small wall panel inside an office: the owner's options (office.options, empty by default) or "Options coming soon" */
export function drawOptionsPanel(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang, office, options = [] } = o; frame(g, w, h);
  g.fillStyle = hex(office.accent); g.fillRect(k.rtl ? w - 56 - 80 : 56, 40, 80, 6); k.text(L(office.title, lang), k.mx(56), 100, { size: 40, weight: 700, color: P.brassPale, max: w - 112 });
  if (!options.length) { k.text(L(OPTIONS_SOON, lang), k.mx(56), 300, { size: 64, weight: 800, color: P.sand, max: w - 112 }); k.text(lang === 'ar' ? 'سيُضيف المالك الخيارات لاحقًا' : 'The owner will add options here', k.mx(56), 372, { size: 34, weight: 500, color: P.taupe, max: w - 112 }); return; }
  options.forEach((op, i) => { const y = 150 + i * 74; g.fillStyle = hex(office.accent); g.beginPath(); g.arc(k.rtl ? w - 80 : 80, y + 24, 9, 0, Math.PI * 2); g.fill(); k.text(L(op.title, lang), k.mx(112), y + 34, { size: 36, weight: 700, color: P.sand, max: w - 190 }); if (op.note) k.text(L(op.note, lang), k.mx(112), y + 64, { size: 24, weight: 500, color: P.taupe, max: w - 190 }); });
}

/** the lobby sign over the lift: FLOOR 2 / Bloom Meeting */
export function drawBloomSign(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o; frame(g, w, h);
  g.fillStyle = hex(BLOOM_LIGHT.orange); g.fillRect(k.rtl ? w - 80 - 120 : 80, 56, 120, 8);
  k.text(lang === 'ar' ? 'الطابق 2' : 'FLOOR 2', k.mx(80), 130, { size: 40, weight: 600, color: P.brassPale });
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

/** Order Journey wall (south wall, east of the wing doorway): the full order path in two runs. Run 1: CLOSETS lane (orange), the glowing LPO APPROVED gate, the YAS FACTORY lane (marble).
 *  Run 2: back in the Closets colour, packing to final payment. Static illustrative content (bloom/journey.js); same kit, type scale and canvas pipeline as the Lead Roadmap wall. */
export function drawJourneyWall(g, w, h, o) {
  const k = kit(g, w, h, o.lang), { lang } = o, R = journeyRuns(), rtl = k.rtl; frame(g, w, h);
  const pad = 56, ink = P.ink, edge = (x, cw) => (rtl ? w - x - cw : x);   // mirror a left-to-right box for Arabic
  k.rule(k.mx(pad), 24, 90); k.text(L(JOURNEY_TITLE, lang), k.mx(pad), 76, { size: 54, weight: 800, color: P.sand });
  k.text(L(JOURNEY_SUB, lang), k.mx(pad), 114, { size: 26, weight: 500, color: P.sand, max: w - pad * 2 - 560 });
  k.text(L(ILLUSTRATIVE, lang), k.mx(w - pad), 70, { size: 32, weight: 800, color: BLOOM_LIGHT.brass, align: rtl ? 'left' : 'right' });
  const arrow = (x, y, col) => { g.fillStyle = hex(col); g.beginPath(); const d = rtl ? -1 : 1; g.moveTo(x + d * 11, y); g.lineTo(x - d * 7, y - 12); g.lineTo(x - d * 7, y + 12); g.closePath(); g.fill(); };
  const badge = (cx, cy, n, col) => { g.fillStyle = hex(col); g.beginPath(); g.arc(cx, cy, 25, 0, Math.PI * 2); g.fill(); k.text(String(n), cx, cy + 11, { size: 30, weight: 800, color: ink, align: 'center' }); };
  const card = (x, y0, cw, ch, s, n, col, { dark = false, inline = false } = {}) => { const ax = rtl ? x + cw - 20 : x + 20, tw = cw - 40, bx = rtl ? x + cw - 20 - 25 : x + 20 + 25;
    k.card(x, y0, cw, ch, { fill: dark ? rgba(col, 0.1) : rgba(P.sand, 0.06), line: rgba(col, 0.6) }); g.fillStyle = hex(col); g.fillRect(x + 1, y0 + 1, cw - 2, 9);
    badge(bx, y0 + 52, n, col);
    if (inline) { const tx = rtl ? bx - 40 : bx + 40; k.text(L(s.title, lang), tx, y0 + 64, { size: 34, weight: 800, color: P.sand, max: cw - 130 }); k.para(L(s.desc, lang), ax, y0 + 118, tw, { size: 26, weight: 500, color: P.sand, lh: 33 }); return; }
    const ty = y0 + 118, ty1 = k.para(L(s.title, lang), ax, ty, tw, { size: 30, weight: 800, color: P.sand, lh: 36 });
    k.para(L(s.desc, lang), ax, Math.max(ty1, ty + 36) + 14, tw, { size: 24, weight: 500, color: P.sand, lh: 31 }); };
  // ---- run 1: 5 CLOSETS cards, the gate, 4 YAS FACTORY cards ----
  const gap = 14, nOn = R.before.length + R.factory.length, cw = (w - pad * 2 - gap * nOn) / (nOn + 1.3), gw = cw * 1.3, y0 = 200, ch = 320;
  const xs = []; { let x = pad; for (let i = 0; i < nOn + 1; i++) { const gate = i === R.before.length, bw = gate ? gw : cw; xs.push([x, bw]); x += bw + gap; } }
  const laneBar = (i0, i1, lane) => { const a = xs[i0], b = xs[i1], x0 = Math.min(edge(a[0], a[1]), edge(b[0], b[1])), x1 = Math.max(edge(a[0], a[1]) + a[1], edge(b[0], b[1]) + b[1]), col = lane.color;
    g.fillStyle = hex(col); g.fillRect(x0, 178, x1 - x0, 6); k.text(L(lane.title, lang), rtl ? x1 : x0, 168, { size: 34, weight: 800, color: col }); };
  laneBar(0, R.before.length - 1, JOURNEY_LANES.closets); laneBar(R.before.length + 1, nOn, JOURNEY_LANES.factory);
  let n = 1;
  R.before.forEach((s, i) => { const [x, bw] = xs[i]; card(edge(x, bw), y0, bw, ch, s, n++, journeyColor(s)); });
  { const [x, bw] = xs[R.before.length], ex = edge(x, bw), s = R.gate, gc = BLOOM_LIGHT.orange, cx = ex + bw / 2, cy = y0 + ch / 2;   // the gate: a glowing frame, taller than the cards
    const gl = g.createRadialGradient(cx, cy, 20, cx, cy, bw * 0.95); gl.addColorStop(0, rgba(gc, 0.55)); gl.addColorStop(0.55, rgba(gc, 0.18)); gl.addColorStop(1, rgba(gc, 0)); g.fillStyle = gl; g.fillRect(ex - bw * 0.5, y0 - 70, bw * 2, ch + 140);
    g.save(); g.shadowColor = hex(gc); g.shadowBlur = 34; g.fillStyle = hex(0x1d140d); roundedRect(g, ex, y0 - 14, bw, ch + 28, 20); g.fill(); g.strokeStyle = hex(BLOOM_LIGHT.brass); g.lineWidth = 6; g.stroke(); g.restore();
    g.strokeStyle = hex(gc); g.lineWidth = 3; roundedRect(g, ex + 10, y0 - 4, bw - 20, ch + 8, 14); g.stroke();
    k.text(L(JOURNEY_GATE_LABEL, lang), cx, y0 + 34, { size: 24, weight: 700, color: BLOOM_LIGHT.brass, align: 'center' });
    badge(cx, y0 + 84, n++, gc);
    const l1 = L(s.title, lang), ty = y0 + 152; g.font = `800 34px ${FONT}`; const one = g.measureText(l1).width < bw - 28;
    if (one) k.text(l1, cx, ty, { size: 34, weight: 800, color: P.sand, align: 'center' }); else k.para(l1, cx, ty, bw - 28, { size: 34, weight: 800, color: P.sand, lh: 40, align: 'center' });
    k.para(L(s.desc, lang), cx, ty + (one ? 52 : 92), bw - 40, { size: 24, weight: 600, color: P.sand, lh: 31, align: 'center' }); }
  R.factory.forEach((s, i) => { const [x, bw] = xs[R.before.length + 1 + i]; card(edge(x, bw), y0, bw, ch, s, n++, journeyColor(s), { dark: true }); });
  for (let i = 0; i < xs.length - 1; i++) { const gx = rtl ? edge(xs[i][0], xs[i][1]) - gap / 2 : xs[i][0] + xs[i][1] + gap / 2, ni = i + 1; arrow(gx, y0 + 52, ni === R.before.length || ni === R.before.length + 1 ? BLOOM_LIGHT.brass : (i >= R.before.length ? JOURNEY_LANES.factory.color : JOURNEY_LANES.closets.color)); }
  // ---- the hand-back: from QC down and round to Packing ----
  const lastF = xs[xs.length - 1], lx = edge(lastF[0], lastF[1]) + lastF[1] / 2, ey = y0 + ch + 20, ry0 = 596, rgap = 20, rw = (w - pad * 2 - rgap * (R.after.length - 1)) / R.after.length, firstCx = edge(pad, rw) + rw / 2;
  g.strokeStyle = hex(BLOOM_LIGHT.orange); g.lineWidth = 5; g.setLineDash([14, 9]); g.beginPath(); g.moveTo(lx, y0 + ch); g.lineTo(lx, ey + 8); g.lineTo(firstCx, ey + 8); g.lineTo(firstCx, ry0 - 14); g.stroke(); g.setLineDash([]);
  g.fillStyle = hex(BLOOM_LIGHT.orange); g.beginPath(); g.moveTo(firstCx, ry0 - 2); g.lineTo(firstCx - 12, ry0 - 20); g.lineTo(firstCx + 12, ry0 - 20); g.closePath(); g.fill();
  k.text(L(JOURNEY_AFTER, lang), rtl ? firstCx - 30 : firstCx + 30, ey + 40, { size: 30, weight: 800, color: BLOOM_LIGHT.orange });
  // ---- run 2: the Closets colour again ----
  R.after.forEach((s, i) => { const x = pad + i * (rw + rgap); card(edge(x, rw), ry0, rw, 200, s, n++, journeyColor(s), { inline: true }); if (i < R.after.length - 1) arrow(rtl ? edge(x, rw) - rgap / 2 : x + rw + rgap / 2, ry0 + 52, JOURNEY_LANES.closets.color); });
  // ---- legend ----
  { const ly = 846; let lx = rtl ? w - pad : pad; const sw = (col, label) => { g.fillStyle = hex(col); roundedRect(g, rtl ? lx - 30 : lx, ly - 22, 30, 30, 7); g.fill(); k.text(label, rtl ? lx - 44 : lx + 44, ly, { size: 26, weight: 700, color: P.sand }); g.font = `700 26px ${FONT}`; const tw = g.measureText(label).width; lx += (rtl ? -1 : 1) * (44 + tw + 44); };
    sw(JOURNEY_LANES.closets.color, L(JOURNEY_LANES.closets.title, lang)); sw(JOURNEY_LANES.factory.color, L(JOURNEY_LANES.factory.title, lang)); sw(BLOOM_LIGHT.brass, lang === 'ar' ? 'بوابة اعتماد أمر الشراء' : 'LPO approved gate');
    k.text(L(JOURNEY_NOTE, lang), k.mx(w - pad), ly, { size: 26, weight: 600, color: P.taupe, align: rtl ? 'left' : 'right' }); }
}
