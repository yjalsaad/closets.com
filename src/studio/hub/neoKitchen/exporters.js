/* Neo Kitchen Designer - exporters: project JSON (round-trip), CSV cut list, price table, download helper. */
import { FORMAT, VERSION, normalizeModel } from './model';
import { BOARD, COUNTERS } from './constants';
import { noteEn } from './cutlist';
import { normName, materialsData } from './materials';
import { dimNumber, outOf, UNIT_INFO } from './outputSettings';

export function projectJSON(model, extra = {}) {
  return JSON.stringify({ format: FORMAT, v: VERSION, exportedAt: new Date().toISOString(), model, ...extra }, null, 2);
}
/** parse + validate + clamp; returns { model, issues, extra } or throws */
export function parseProject(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON file'); }
  if (raw && raw.format && raw.format !== FORMAT) throw new Error(`Unknown format "${raw.format}"`);
  const { model, issues } = normalizeModel(raw);
  return { model, issues, prices: raw && raw.prices ? raw.prices : null, unit: raw && raw.unit === 'in' ? 'in' : 'mm', docInfo: raw && raw.docInfo ? raw.docInfo : null, output: raw && raw.output && typeof raw.output === 'object' ? raw.output : null }; // [NEO-OUTPUT-UX34] output = the project's units / precision, when it carries them
}

/** the cut list exactly as the screen shows it (same rows, same area convention) - embedded in the project JSON export */
export function bomData(bom, model) {
  const mm = (model && model.matMap) || {};
  const inv = (r) => { const e = mm[normName(r.matName)]; return e ? { id: e.id, sku: e.sku, name: e.name } : null; };
  return {
    areaConvention: 'm2 = qty x largest face of the cut part (product of its two largest dimensions)',
    metrics: { pieces: bom.pieces, boardM2: +bom.boardArea.toFixed(3), uniqueParts: bom.unique },
    materials: bom.cards.map((c) => ({ board: BOARD[c.k].en, pcs: c.pcs, m2: +c.m2.toFixed(3) })),
    rows: bom.rows.map((r) => ({ no: r.no, part: r.name, w: r.w, d: r.d, h: r.h, qty: r.qty, material: r.matName, board: BOARD[r.mat].en, m2: +r.area.toFixed(3), note: noteEn(r.note), ...(inv(r) ? { inventory: inv(r) } : {}) })),
    ...(model ? { productionMaterials: materialsData(model, bom) } : {}),
  };
}

const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** "Material" is the production name when one was typed (else the generic board label). With a matMap (name -> inventory item) two
 * columns are appended - Inventory code / Inventory item - only for linked rows; without links the file keeps its original columns. */
/** [NEO-OUTPUT-UX34] `output` = { unit, precision }: W / D / H / Cut L / Cut W / Thk are written in mm / cm / inch (the header names the unit when it is not mm) and rounded
 * by the precision (millimetres at standard are the model values, untouched); omitted = the legacy columns. Edge m and m2 are metres / square metres in every unit. */
export function bomCSV(bom, matMap, output) {
  const mm = matMap && Object.keys(matMap).length ? matMap : null;
  const o = outOf(output); const tag = output && o.unit !== 'mm' ? ` (${UNIT_INFO[o.unit].en})` : ''; const v = (x) => (output ? dimNumber(x, o) : x);
  const head = ['#', 'Part', `W${tag}`, `D${tag}`, `H${tag}`, 'Qty', 'Material', 'Board', 'Grain', 'Edges', `Cut L${tag}`, `Cut W${tag}`, `Thk${tag}`, 'Edge m', 'm2', 'Note', ...(mm ? ['Inventory code', 'Inventory item'] : [])];
  const rows = bom.rows.map((r) => {
    const e = mm ? mm[normName(r.matName)] : null;
    return [r.no, r.name, v(r.w), v(r.d), v(r.h), r.qty, r.matName, BOARD[r.mat].en, r.grain, r.edges, v(r.cut.L), v(r.cut.W), v(r.cut.T), (r.edgeLen * r.qty).toFixed(2), r.area.toFixed(3), noteEn(r.note), ...(mm ? [e ? (e.sku || e.id) : '', e ? e.name : ''] : [])];
  });
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/* ---- price table (NEW): editable, kept in the browser only ------------------ */
export const DEFAULT_PRICES = {
  currency: 'BHD',
  board: { Carcass: 6.5, Back: 3.2, Shelf: 6.5, Door: 11, Drawer: 5.5, Plinth: 6.5, Glass: 14 },
  counter: Object.fromEntries(Object.entries(COUNTERS).map(([k, v]) => [k, v.price])),
  edgeBandM: 0.35,
  hw: { hinge: 1.2, plate: 0.3, flipHinge: 2.5, liftStay: 6, runner: 4.5, handleBar: 1.8, handleKnob: 0.9, handleProfile: 3.5, pin: 0.02, minifix: 0.12, cam: 0.12, dowel: 0.03, leg: 0.4, pole: 18, sink: 8, hob: 8, bracket: 6 },
  labourPct: 25, vatPct: 10,
};
export function estimate(model, bom, hardware, prices = DEFAULT_PRICES) {
  const lines = [];
  const board = {};
  bom.rows.forEach((r) => {
    if (r.mat === 'Countertop') return;
    board[r.mat] = (board[r.mat] || 0) + r.area;
  });
  Object.keys(board).forEach((k) => lines.push({ k: `board-${k}`, en: `${BOARD[k].en} ${board[k].toFixed(2)} m2`, ar: `${BOARD[k].ar} ${board[k].toFixed(2)} م²`, amount: board[k] * (prices.board[k] || 0) }));
  const ctArea = bom.rows.filter((r) => r.mat === 'Countertop').reduce((s, r) => s + r.area, 0);
  lines.push({ k: 'counter', en: `${COUNTERS[model.counter].en} ${ctArea.toFixed(2)} m2`, ar: `${COUNTERS[model.counter].ar} ${ctArea.toFixed(2)} م²`, amount: ctArea * (prices.counter[model.counter] || 0) });
  lines.push({ k: 'edge', en: `Edge banding ${bom.edgeMetres.toFixed(1)} m`, ar: `شريط حواف ${bom.edgeMetres.toFixed(1)} م`, amount: bom.edgeMetres * prices.edgeBandM });
  hardware.forEach((h) => lines.push({ k: `hw-${h.k}`, en: `${h.en} x${h.qty}`, ar: `${h.ar} ×${h.qty}`, amount: h.qty * (prices.hw[h.k] !== undefined ? prices.hw[h.k] : (DEFAULT_PRICES.hw[h.k] || 0)) }));
  const sub = lines.reduce((s, l) => s + l.amount, 0);
  const labour = sub * (prices.labourPct / 100);
  const net = sub + labour;
  const vat = net * (prices.vatPct / 100);
  return { lines, sub, labour, net, vat, total: net + vat };
}

export function download(name, text, mime) {
  try {
    const blob = new Blob([text], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (e) { return false; }
}
export const safeName = (s) => String(s || 'kitchen').trim().replace(/[^\w؀-ۿ-]+/g, '_').slice(0, 40) || 'kitchen';

/* ---- local autosave ---------------------------------------------------------- */
const KEY = 'neoKitchen.autosave.v1';
export function saveLocal(payload) { try { localStorage.setItem(KEY, JSON.stringify(payload)); return true; } catch (e) { return false; } }
export function loadLocal() { try { const t = localStorage.getItem(KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
export function clearLocal() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
