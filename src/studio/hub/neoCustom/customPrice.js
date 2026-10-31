/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - price lines (pure).
 * EVERY RATE BELOW IS A PLACEHOLDER. The owner has not supplied a price list for custom furniture: the numbers are the Neo Kitchen estimate's own
 * placeholder rates (neoKitchen/exporters.js DEFAULT_PRICES) plus a few invented ones for items the kitchen does not have (timber, castors ...).
 * They are shown on screen as placeholders, can be edited in the Global tab (saved inside the design file) and must be replaced by the real list
 * before a price is quoted. Money is in BHD, three decimals, like the rest of the Hub.
 * ===========================================================================*/
import { DEFAULT_PRICES } from '../neoKitchen/exporters';
import { BOARD } from '../neoKitchen/constants';
import { dimText, unitLabel, isDefaultOutput } from '../neoKitchen/outputSettings';

export const PLACEHOLDER_RATES = {
  currency: 'BHD',
  /** per m2 of CUT board, by board class (kitchen placeholders; Countertop is a placeholder for a worktop / top slab) */
  board: { ...DEFAULT_PRICES.board, Countertop: 28 },
  /** per metre run of a solid-timber frame member (legs, rails, slats): rectangular / round section - INVENTED placeholders */
  timberM: { rect: 4, round: 5 },
  edgeBandM: DEFAULT_PRICES.edgeBandM,
  /** per piece */
  hw: { ...DEFAULT_PRICES.hw, foot: 0.9, castor: 2.4, bracket: 1.2, support: 0.6, glassClip: 0.3, frameDowel: 0.05, dowel: 0.03, minifix: 0.12 },
  labourPct: 25,
  vatPct: 10,
};
/** which rate keys are invented here and not even a kitchen placeholder (shown with a stronger warning) */
export const INVENTED = ['timberM.rect', 'timberM.round', 'board.Countertop', 'hw.foot', 'hw.castor', 'hw.bracket', 'hw.support', 'hw.glassClip', 'hw.frameDowel'];

export function mergeRates(over) {
  const o = over || {};
  return {
    currency: o.currency || PLACEHOLDER_RATES.currency,
    board: { ...PLACEHOLDER_RATES.board, ...(o.board || {}) },
    timberM: { ...PLACEHOLDER_RATES.timberM, ...(o.timberM || {}) },
    edgeBandM: o.edgeBandM !== undefined ? o.edgeBandM : PLACEHOLDER_RATES.edgeBandM,
    hw: { ...PLACEHOLDER_RATES.hw, ...(o.hw || {}) },
    labourPct: o.labourPct !== undefined ? o.labourPct : PLACEHOLDER_RATES.labourPct,
    vatPct: o.vatPct !== undefined ? o.vatPct : PLACEHOLDER_RATES.vatPct,
  };
}

const r3 = (v) => Math.round(v * 1000) / 1000;

/** same output shape as neoKitchen/exporters.js estimate(): { lines:[{k,en,ar,amount}], sub, labour, net, vat, total }. `net` = before VAT (what Quote Max takes). */
export function estimateCustom(bom, hardware, ratesIn) {
  const R = mergeRates(ratesIn);
  const lines = [];
  const board = {};
  bom.rows.forEach((r) => { if (r.mat === 'Timber') return; board[r.mat] = (board[r.mat] || 0) + r.area; });
  Object.keys(board).forEach((k) => lines.push({ k: `board-${k}`, en: `${BOARD[k].en} ${board[k].toFixed(2)} m2`, ar: `${BOARD[k].ar} ${board[k].toFixed(2)} م²`, amount: r3(board[k] * (R.board[k] || 0)) }));
  const tim = { rect: 0, round: 0 };
  bom.rows.filter((r) => r.mat === 'Timber').forEach((r) => { tim[r.rep && r.rep.round ? 'round' : 'rect'] += (Math.max(r.w, r.d, r.h) / 1000) * r.qty; });
  if (tim.rect > 0) lines.push({ k: 'timber-rect', en: `Solid timber, rectangular ${tim.rect.toFixed(2)} m`, ar: `خشب صلب مستطيل ${tim.rect.toFixed(2)} م`, amount: r3(tim.rect * R.timberM.rect) });
  if (tim.round > 0) lines.push({ k: 'timber-round', en: `Solid timber, round ${tim.round.toFixed(2)} m`, ar: `خشب صلب دائري ${tim.round.toFixed(2)} م`, amount: r3(tim.round * R.timberM.round) });
  lines.push({ k: 'edge', en: `Edge banding ${bom.edgeMetres.toFixed(1)} m`, ar: `شريط حواف ${bom.edgeMetres.toFixed(1)} م`, amount: r3(bom.edgeMetres * R.edgeBandM) });
  hardware.forEach((h) => lines.push({ k: `hw-${h.k}`, en: `${h.en} x${h.qty}`, ar: `${h.ar} ×${h.qty}`, amount: r3(h.qty * (R.hw[h.k] || 0)) }));
  const sub = r3(lines.reduce((s, l) => s + l.amount, 0));
  const labour = r3(sub * (R.labourPct / 100));
  const net = r3(sub + labour);
  const vat = r3(net * (R.vatPct / 100));
  return { lines, sub, labour, net, vat, total: r3(net + vat), rates: R, timber: tim };
}

export const money = (n) => `BD ${(Math.round((Number(n) || 0) * 1000) / 1000).toFixed(3)}`;

/** the object written to localStorage 'neo_custom_handoff' for Quote Max / Price Plus (one custom line, priced from the placeholder rates until the owner supplies the list) */
export function quoteHandoff(design, bom, est, output) { // [NEO-OUTPUT-UX34] `output` (optional): the description's sizes follow the Output unit; w / h / d stay millimetres
  const { w, h, d } = design.dims;
  const sized = output && !isDefaultOutput(output) ? `${dimText(w, output)} x ${dimText(h, output)} x ${dimText(d, output)} ${unitLabel(output.unit)}` : `${w} x ${h} x ${d} mm`;
  return {
    format: 'neo-custom-handoff', v: 1, ts: Date.now(),
    ...(output ? { output } : {}),
    name: `${design.title} (custom, ${sized})`,
    w, h, d, qty: 1, price: est.net, currency: est.rates.currency, vatPct: est.rates.vatPct,
    pieces: bom.pieces, boardM2: Math.round(bom.boardArea * 100) / 100, placeholderRates: true,
    lines: est.lines.filter((l) => l.amount > 0).map((l) => ({ k: l.k, en: l.en, ar: l.ar, amount: l.amount })),
  };
}
