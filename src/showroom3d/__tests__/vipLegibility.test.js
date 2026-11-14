/* LEGIBILITY of the generic wall slides: draws every slide of every committed deck (EN + AR) onto a recording 2D context and checks type size (as % of the screen height), weight, contrast,
 * safe margins, overflow and text length. The built-in investor stations keep their own dense drawings (see docs/showroom3d/VIP-DECKS.md, "Reading mode"). */
import { drawSlide, TYPE } from '../scenes/vip/panels';
import { PERMANENT_DECKS } from '../vip/decks';
import { EXAMPLE_MARKDOWN } from '../vip/example';
import { parseMarkdownDeck } from '../vip/deckMarkdown';
import { sanitizeDeck, resolveDeck } from '../vip/deckSchema';
import { PALETTE as P } from '../3d/palette';

const W = 1536, H = 864;
function fakeCtx() {
  const state = { font: '10px sans-serif' }; const noop = () => {};
  return new Proxy(state, { get(t, k) { if (k === 'measureText') return (s) => { const m = /(\d+(?:\.\d+)?)px/.exec(t.font); return { width: String(s).length * (m ? Number(m[1]) : 10) * 0.56 }; }; if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop }); return k in t ? t[k] : noop; }, set(t, k, v) { t[k] = v; return true; } });
}
const lum = (hex) => { const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

function draw(deck, i, lang) {
  const rd = resolveDeck({ ...deck, slides: [deck.slides[i]] }, lang), metrics = []; drawSlide(fakeCtx(), W, H, { lang, slide: rd.slides[0], index: i, count: deck.slides.length, deckTitle: rd.title, images: new Map(), metrics });
  return { rd: rd.slides[0], metrics };
}
const DECKS = PERMANENT_DECKS.filter((d) => d.id !== 'default' && !d.film);
const CASES = DECKS.flatMap((d) => d.slides.map((s, i) => [`${d.id}/${s.id}`, d, i]));

describe.each(['en', 'ar'])('wall legibility (%s)', (lang) => {
  test.each(CASES)('%s: type scale, weight, contrast, margins, overflow', (name, deck, i) => {
    const { rd, metrics } = draw(deck, i, lang), recs = metrics.filter((m) => m.s && m.s.trim());
    const title = recs.find((m) => m.s === rd.title); expect(title).toBeTruthy(); expect(title.size / H).toBeGreaterThanOrEqual(0.07);
    if (rd.lead) { const l = recs.find((m) => m.s === rd.lead); expect(l.size / H).toBeGreaterThanOrEqual(0.04); }
    for (const b of rd.bullets) { const m = recs.find((r) => r.s === b.replace(/^\d{4}:\s*/, '')) || recs.find((r) => r.s === b); expect(m).toBeTruthy(); expect(m.size / H).toBeGreaterThanOrEqual(0.034); }
    for (const m of recs) { expect(m.size).toBeGreaterThanOrEqual(22); expect(m.weight).toBeGreaterThanOrEqual(500); }
    const bg = [P.screenDark, P.ink]; for (const m of recs) if (typeof m.color === 'number') for (const b of bg) expect(contrast(m.color, b)).toBeGreaterThanOrEqual(4.5);
    for (const m of recs.filter((r) => r.k === 'para' && r.maxW)) {
      const left = m.align === 'right' ? m.x - m.maxW : m.align === 'center' ? m.x - m.maxW / 2 : m.x, right = left + m.maxW; expect(left).toBeGreaterThanOrEqual(TYPE.safeX - 4); expect(right).toBeLessThanOrEqual(W - TYPE.safeX + 4);
      if (m.size > TYPE.fine && m.size !== TYPE.meta) expect(m.y1).toBeLessThanOrEqual(H - TYPE.safeBottom - 70 + 10);   // body text ends above the source line and the disclaimer
    }
    const fine = recs.filter((m) => m.size === TYPE.fine || m.size === TYPE.meta); for (const m of fine) expect(m.y).toBeLessThanOrEqual(H - 40);   // the baseline of the last fine-print line keeps a 40 px bottom margin
  });
  test.each(CASES)('%s: short lines, few bullets', (name, deck, i) => {
    const s = deck.slides[i], rd = resolveDeck({ ...deck, slides: [s] }, lang).slides[0], hasBlocks = (s.blocks || []).length > 0, lay = s.layout || 'split';
    for (const b of rd.bullets) expect(words(b.replace(/^\d{4}:\s*/, ''))).toBeLessThanOrEqual(14);
    expect(rd.bullets.length).toBeLessThanOrEqual(lay === 'duo' || lay === 'hero' ? 2 : hasBlocks ? 4 : 6); expect(words(rd.title)).toBeLessThanOrEqual(10);
    if (rd.lead) expect(words(rd.lead)).toBeLessThanOrEqual(12);
  });
});

describe('imported decks use the same legible scale', () => {
  test('the markdown example (EN + AR) draws within the scale and margins', () => {
    const r = parseMarkdownDeck(EXAMPLE_MARKDOWN, sanitizeDeck); expect(r.ok).toBe(true);
    for (const lang of ['en', 'ar']) for (let i = 0; i < r.deck.slides.length; i++) { const { metrics } = draw(r.deck, i, lang); for (const m of metrics.filter((x) => x.s && x.s.trim())) { expect(m.size).toBeGreaterThanOrEqual(22); if (m.k === 'para' && m.maxW && m.size > 22) expect(m.y1).toBeLessThanOrEqual(H - TYPE.safeBottom - 70 + 10); } }
  });
  test('the type scale constants match the brief: title >= 7% and body >= 3.5% of the screen height (bullets: 30-34 px of 864 = 3.5-3.9%)', () => {
    expect(TYPE.title / H).toBeGreaterThanOrEqual(0.07); expect(Math.min(...TYPE.bullet) / H).toBeGreaterThanOrEqual(0.0345); expect(TYPE.cell / H).toBeGreaterThanOrEqual(0.0345);
  });
});
