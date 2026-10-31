/* =============================================================================
 * Neo category studios [NEO-CATEGORIES-UX26] - the price of a design, from the SAME cut list and hardware list the screen and the files show.
 * Lines: boards (m2 of the cut list x a rate per board class), the worktop (m2 x a rate per stone / laminate), edge band (metres), glass /
 * mirror (m2), hardware (quantity x a rate per hardware key), the category's own lines (cfg.price.extra), waste, labour and margin.
 *
 * EVERY RATE BELOW IS A PLACEHOLDER (the owner has not supplied a price list for these four categories yet). They live in each category
 * config (cfg.price.rates) so one edit replaces them; the studio prints "placeholder rates" next to the price and the Quote Max hand-off
 * carries `placeholder: true`.
 * ===========================================================================*/
import { BOARD } from '../neoKitchen/constants';
import { dimText, unitLabel, isDefaultOutput } from '../neoKitchen/outputSettings';

export const money = (n) => `BD ${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

/** out = the result of buildCategory() before `price` is attached: { cfg, d, bom, hardware, model, scene, dec } */
export function priceCategory(cfg, out) {
  const P = cfg.price || { rates: {} };
  const R = P.adjust ? P.adjust(out.d, P.rates || {}) : (P.rates || {}); // adjust(): rates that follow a choice (board type, edge band type)
  const lines = [];
  const add = (k, en, ar, qty, unit, rate, group, ph = true) => { if (qty > 0) lines.push({ k, en, ar, qty: r3(qty), unit, rate, amount: r2(qty * rate), group, ph }); };
  /* boards: m2 per board class straight from the cut list cards (the area convention of the Cutting List screen) */
  const cards = out.bom.cards || [];
  cards.forEach((c) => {
    if (c.k === 'Countertop') {
      const rate = (R.top && R.top[out.model.counter]) || 0;
      add('top', `${(P.topName || ['Worktop', 'سطح العمل'])[0]} (${out.model.counter})`, `${(P.topName || ['Worktop', 'سطح العمل'])[1]}`, c.m2, 'm²', rate, 'boards');
    } else add(`board:${c.k}`, BOARD[c.k].en, BOARD[c.k].ar, c.m2, 'm²', (R.board && R.board[c.k]) || 0, 'boards');
  });
  const boardsAmt = lines.reduce((s, l) => s + l.amount, 0);
  if (R.wastePct) add('waste', `Board waste ${Math.round(R.wastePct * 100)}%`, `هدر الألواح ${Math.round(R.wastePct * 100)}٪`, 1, 'lot', r2(boardsAmt * R.wastePct), 'boards');
  add('edge', 'Edge banding', 'شريط الحواف', out.bom.edgeMetres, 'm', R.edge || 0, 'boards');
  /* hardware: the same rows as the Hardware list */
  out.hardware.forEach((h) => { const rate = (R.hw && R.hw[h.k]); if (rate !== undefined) add(`hw:${h.k}`, h.en, h.ar, h.qty, 'pcs', rate, 'hardware'); });
  /* the category's own lines (basin cut-outs, LED, ventilation kit ...) */
  (P.extra ? P.extra(out) : []).forEach((l) => add(l.k, l.en, l.ar, l.qty, l.unit || 'pcs', l.rate, 'extras'));
  const materials = r2(lines.reduce((s, l) => s + l.amount, 0));
  const labour = r2(materials * (R.labourPct || 0));
  const margin = r2((materials + labour) * (R.marginPct || 0));
  const total = r2(materials + labour + margin);
  return { cur: 'BD', lines, materials, labour, labourPct: R.labourPct || 0, margin, marginPct: R.marginPct || 0, total, placeholder: true, text: money(total) };
}

/** what "Send to Quote Max" carries: the total, the lines and the design - one custom quote line per studio design */
/** `output` ([NEO-OUTPUT-UX34], optional): the Output setting rides with the hand-off, and a non-default one adds `sizeText` ("1800 x 600 x 2400 cm") for the quote description; w / d / h stay millimetres */
export function handoffOf(cfg, out, output) {
  const b = out.scene.bounds;
  const w = Math.round(b.x1 - b.x0); const dd = Math.round(b.z1 - b.z0); const hh = Math.round(b.h);
  return {
    ...(output ? { output, ...(isDefaultOutput(output) ? {} : { sizeText: `${dimText(w, output)} x ${dimText(dd, output)} x ${dimText(hh, output)} ${unitLabel(output.unit)}` }) } : {}),
    category: cfg.id, title: out.d.title, name: `${cfg.app[0].replace('Designer', 'design')} - ${out.d.title}`, qty: 1, price: out.price.total,
    w: Math.round(b.x1 - b.x0), d: Math.round(b.z1 - b.z0), h: Math.round(b.h), placeholder: true, currency: 'BD',
    lines: out.price.lines.map((l) => ({ k: l.k, en: l.en, qty: l.qty, unit: l.unit, rate: l.rate, amount: l.amount })), design: out.d, ts: Date.now(),
  };
}
