/* =============================================================================
 * [NEO-CUTLIST-UX32] Part labels: presets, layout maths, selection / sorting, HTML (print), ZPL (Zebra) and CSV.
 * Pure functions (unit-tested); the dialog (LabelsDialog.jsx) only holds state. All sizes are millimetres.
 *   sheet presets  A4 sheets of die-cut labels: label size, columns x rows, top / left margin, gaps  (editable: "Custom")
 *   roll presets   thermal rolls: the page IS the label (one label per page), no margins
 * Print HTML uses @page size in mm with zero margin, one .page per sheet / label, and literal black on white (a label must print the
 * same on every printer and never follow the dark theme).
 * ===========================================================================*/
import { qrSvg, code128Svg } from './clCodes';
import { qrPayload } from './docInfo';
import { edgeSketchSvg, grainArrowSvg, isoPicSvg, PAL_PRINT } from './clPics';

export const A4 = { w: 210, h: 297 };
export const PRESETS = [
  { id: 'a4-3x7', group: 'sheet', en: 'A4 sheet 3 × 7 (70 × 42.4)', ar: 'ورقة A4 ‏3 × 7 (70 × 42.4)', w: 70, h: 42.4, cols: 3, rows: 7, top: 0.1, left: 0, gx: 0, gy: 0 },
  { id: 'a4-2x7', group: 'sheet', en: 'A4 sheet 2 × 7 (99.1 × 38.1)', ar: 'ورقة A4 ‏2 × 7 (99.1 × 38.1)', w: 99.1, h: 38.1, cols: 2, rows: 7, top: 15.15, left: 4.65, gx: 2.5, gy: 0 },
  { id: 'a4-3x8', group: 'sheet', en: 'A4 sheet 3 × 8 (70 × 36)', ar: 'ورقة A4 ‏3 × 8 (70 × 36)', w: 70, h: 36, cols: 3, rows: 8, top: 4.5, left: 0, gx: 0, gy: 0 },
  { id: 'a4-l7160', group: 'sheet', en: 'A4 sheet 3 × 7 (63.5 × 38.1, L7160 style)', ar: 'ورقة A4 ‏3 × 7 (63.5 × 38.1، نمط L7160)', w: 63.5, h: 38.1, cols: 3, rows: 7, top: 15.15, left: 7.2, gx: 2.54, gy: 0 },
  { id: 'roll-50x30', group: 'roll', en: 'Thermal roll 50 × 30', ar: 'رول حراري 50 × 30', w: 50, h: 30, cols: 1, rows: 1, top: 0, left: 0, gx: 0, gy: 0 },
  { id: 'roll-60x40', group: 'roll', en: 'Thermal roll 60 × 40', ar: 'رول حراري 60 × 40', w: 60, h: 40, cols: 1, rows: 1, top: 0, left: 0, gx: 0, gy: 0 },
  { id: 'roll-100x50', group: 'roll', en: 'Thermal roll 100 × 50', ar: 'رول حراري 100 × 50', w: 100, h: 50, cols: 1, rows: 1, top: 0, left: 0, gx: 0, gy: 0 },
  { id: 'roll-100x150', group: 'roll', en: 'Thermal roll 100 × 150 (shipping)', ar: 'رول حراري 100 × 150 (شحن)', w: 100, h: 150, cols: 1, rows: 1, top: 0, left: 0, gx: 0, gy: 0 },
  { id: 'custom', group: 'custom', en: 'Custom size', ar: 'مقاس مخصص', w: 70, h: 40, cols: 3, rows: 6, top: 10, left: 0, gx: 0, gy: 0 },
];
export const presetById = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];

export const FIELD_KEYS = ['logo', 'project', 'orderNo', 'customer', 'pid', 'name', 'cabinet', 'dims', 'material', 'grain', 'edges', 'qty', 'notes', 'qr', 'barcode', 'picture'];
export const FIELD_LABELS = {
  logo: ['Logo', 'الشعار'], project: ['Project name', 'اسم المشروع'], orderNo: ['Order no.', 'رقم الطلب'], customer: ['Customer', 'العميل'], pid: ['Part ID', 'رمز القطعة'], name: ['Part name', 'اسم القطعة'],
  cabinet: ['Cabinet / group', 'الخزانة / المجموعة'], dims: ['L × W × T', 'ط × ع × س'], material: ['Material', 'المادة'], grain: ['Grain arrow', 'سهم العرق'], edges: ['Edge-banding diagram', 'مخطط شريط الحواف'],
  qty: ['Qty n / N', 'العدد ن / م'], notes: ['Notes', 'ملاحظات'], qr: ['QR code', 'رمز QR'], barcode: ['Barcode (Code 128)', 'باركود (Code 128)'], picture: ['Picture', 'الصورة'],
};
export const DEFAULT_FIELDS = { logo: false, project: true, orderNo: true, customer: false, pid: true, name: true, cabinet: true, dims: true, material: true, grain: true, edges: true, qty: true, notes: false, qr: true, barcode: false, picture: false };
export const SORTS = ['cabinet', 'material', 'pid', 'nest'];
export const SELECT_MODES = ['all', 'selected', 'material', 'cabinet'];
export const COUNT_MODES = ['each', 'type'];

const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
/** a preset (stored / typed) -> a safe one. Roll presets keep cols = rows = 1 and no margins. */
export function cleanPreset(p) {
  const b = presetById(p && p.id);
  const o = { ...b, ...(p || {}) };
  const out = { id: b.id, group: b.group, en: b.en, ar: b.ar, w: num(o.w, b.w, 15, 300), h: num(o.h, b.h, 10, 300), cols: Math.round(num(o.cols, b.cols, 1, 12)), rows: Math.round(num(o.rows, b.rows, 1, 40)), top: num(o.top, b.top, 0, 100), left: num(o.left, b.left, 0, 100), gx: num(o.gx, b.gx, 0, 50), gy: num(o.gy, b.gy, 0, 50) };
  if (out.group === 'roll') { out.cols = 1; out.rows = 1; out.top = 0; out.left = 0; out.gx = 0; out.gy = 0; }
  return out;
}
export const perPage = (p) => p.cols * p.rows;
/** page size in mm (A4 for a sheet, the label itself for a roll) */
export const pageSize = (p) => (p.group === 'roll' ? { w: p.w, h: p.h } : A4);
/** { ok, issues[] }: does the grid fit the page? */
export function fitCheck(p) {
  const pg = pageSize(p); const issues = [];
  const needW = p.left + p.cols * p.w + (p.cols - 1) * p.gx; const needH = p.top + p.rows * p.h + (p.rows - 1) * p.gy;
  if (needW > pg.w + 0.01) issues.push({ k: 'w', need: Math.round(needW * 100) / 100, have: pg.w });
  if (needH > pg.h + 0.01) issues.push({ k: 'h', need: Math.round(needH * 100) / 100, have: pg.h });
  return { ok: !issues.length, issues, needW, needH };
}
/** top-left corner (mm) of cell i (0-based, row-major) on its page */
export function cellOrigin(p, i) {
  const c = i % p.cols; const r = Math.floor(i / p.cols) % p.rows;
  return { x: p.left + c * (p.w + p.gx), y: p.top + r * (p.h + p.gy) };
}
/** split `items` into pages; `skip` empty cells are left at the start of the first sheet (reprint on a part-used sheet) */
export function paginate(items, p, skip = 0) {
  const n = perPage(p); const s = p.group === 'roll' ? 0 : Math.max(0, Math.min(n - 1, Math.round(skip) || 0));
  const cells = [...Array(s).fill(null), ...items];
  const pages = [];
  for (let i = 0; i < cells.length; i += n) pages.push(cells.slice(i, i + n));
  return pages;
}
export const pageCount = (count, p, skip = 0) => Math.max(0, Math.ceil((count + (p.group === 'roll' ? 0 : skip)) / perPage(p)));

/* ---- which labels ---- */
/** items: one per piece (qty expanded, n of N) or one per part type. `rows` are proRows. */
export function expandLabels(rows, count = 'each') {
  const out = [];
  rows.forEach((r) => {
    if (count === 'type') out.push({ row: r, pid: r.pid, n: 1, N: r.qty, type: true });
    else for (let n = 1; n <= r.qty; n += 1) out.push({ row: r, pid: r.pid, n, N: r.qty });
  });
  return out;
}
/** pick rows: all | selected (a Set of pids) | material (a name) | cabinet (a group name) */
export function selectRows(rows, mode, arg) {
  if (mode === 'selected') return rows.filter((r) => arg && arg.has(r.pid));
  if (mode === 'material') return rows.filter((r) => r.matName === arg);
  if (mode === 'cabinet') return rows.filter((r) => r.group === arg);
  return rows;
}
/** sort order of the labels. `nestOrder`: Map pid -> [sheet index, position] from the sheet layout. */
export function sortItems(items, order, nestOrder) {
  const nat = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });
  const key = (it) => (order === 'material' ? [it.row.matName, it.row.cab, it.pid] : order === 'pid' ? [it.pid] : order === 'nest' ? [String(((nestOrder && nestOrder.get(it.pid)) || [99, 0])[0]).padStart(3, '0'), String(((nestOrder && nestOrder.get(it.pid)) || [99, 0])[1]).padStart(4, '0'), it.pid] : [it.row.cab, it.pid]);
  return items.map((it, i) => ({ it, i, k: key(it) })).sort((a, b) => { for (let j = 0; j < a.k.length; j += 1) { const d = nat(a.k[j], b.k[j]); if (d) return d; } return a.it.n - b.it.n || a.i - b.i; }).map((x) => x.it);
}

/* ---- HTML ---- */
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mm = (v) => `${Math.round(v * 100) / 100}mm`;
const fmt = (v) => String(Math.round(v * 10) / 10);
/** the part a label's QR describes: the same object for the HTML label, the ZPL label and the CSV (so all three carry the same payload) */
export const partOf = (it) => { const r = it.row; return { pid: it.pid, n: it.type ? 0 : it.n, N: it.N, dims: `${fmt(r.cut.L)}x${fmt(r.cut.W)}x${fmt(r.cut.T)}`, mat: r.matName || '' }; };

/** one label's inner HTML, scaled to the label size (font sizes in mm-based pt so a 100 x 150 label is bigger than a 50 x 30) */
export function labelInner(item, ctx) {
  const { fields: f, preset: p, ar, doc, scene, lang } = ctx;
  const r = item.row; const proj = doc.project; const co = doc.company;
  const small = p.h < 32 || p.w < 55;
  const base = Math.max(5.5, Math.min(11, p.h * 0.17)); // pt
  const qrMm = Math.max(10, Math.min(p.w * 0.36, p.h * (small ? 0.62 : 0.5), 38));
  const showQR = f.qr; const showBar = f.barcode;
  const part = partOf(item);
  const payload = qrPayload(doc.opts.qrKind, proj, part);
  const lines = [];
  if (f.project && proj.project) lines.push(`<div class="t1">${esc(proj.project)}</div>`);
  const meta = [f.orderNo && proj.orderNo ? `${ar ? 'طلب' : 'SO'} ${esc(proj.orderNo)}` : '', f.customer && proj.customer ? esc(proj.customer) : ''].filter(Boolean).join(' · ');
  if (meta) lines.push(`<div class="t2">${meta}</div>`);
  if (f.pid) lines.push(`<div class="pid">${esc(item.pid)}${f.qty ? `<span class="qty">${item.type ? `×${item.N}` : `${item.n}/${item.N}`}</span>` : ''}</div>`);
  else if (f.qty) lines.push(`<div class="qty0">${item.type ? `×${item.N}` : `${item.n}/${item.N}`}</div>`);
  if (f.name) lines.push(`<div class="nm">${esc(ar ? (ctx.nameAr ? ctx.nameAr(r.name) : r.name) : r.name)}</div>`);
  if (f.cabinet) lines.push(`<div class="t2">${esc(r.group)}</div>`);
  if (f.dims) lines.push(`<div class="dm">${fmt(r.cut.L)} × ${fmt(r.cut.W)} × ${fmt(r.cut.T)}</div>`);
  if (f.material) lines.push(`<div class="t2">${esc(r.matName)}</div>`);
  if (f.notes && r.note) lines.push(`<div class="t3">${esc(ctx.noteText ? ctx.noteText(r.note) : r.note)}</div>`);
  const side = [];
  if (f.logo && co.logo) side.push(`<img class="lg" src="${esc(co.logo)}" alt=""/>`);
  if (showQR) { const q = qrSvg(payload, { size: 100, quiet: 1, fg: '#000', bg: '#fff' }); if (q) side.push(`<div class="qr">${q}</div>`); }
  const mini = [];
  if (f.edges) mini.push(edgeSketchSvg(r, { w: 54, h: 34, pal: PAL_PRINT, key: 'lbl' }));
  if (f.grain && r.grain && r.grain !== '-') mini.push(grainArrowSvg(r.grain, { size: 16, pal: PAL_PRINT }));
  if (f.picture) mini.push(isoPicSvg(r, { scene, size: 56, pal: PAL_PRINT, key: 'lbl' }));
  const bch = Math.max(4, Math.min(9, p.h * 0.2));
  const wide = p.w >= 85 && p.h < 60; // a wide, short label puts the sketches beside the text instead of under it
  const mh = Math.max(7, Math.min(15, p.h * (wide ? 0.34 : 0.22)));
  const bar = showBar ? `<div class="bc">${code128Svg(item.pid, { height: 30, width: 100, title: item.pid }).replace('width="100"', 'width="100%"')}</div>` : '';
  return `<div class="in" style="--fs:${base}pt;--qr:${mm(qrMm)};--bch:${mm(bch)};--mh:${mm(mh)}"><div class="body"><div class="main${wide ? ' row' : ''}"><div class="txt">${lines.join('')}</div>${mini.length ? `<div class="mini">${mini.join('')}</div>` : ''}</div>${side.length ? `<div class="side">${side.join('')}</div>` : ''}</div>${bar}</div>`;
}

/** the CSS of a label document (shared by the print and the preview) */
export function labelCss(p) {
  return `*{box-sizing:border-box;margin:0;padding:0}html,body{background:#fff;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,Helvetica,sans-serif}
.lbl{position:absolute;overflow:hidden;width:${mm(p.w)};height:${mm(p.h)};padding:1.2mm 1.6mm;color:#000;background:#fff}
.lbl.box{outline:0.15mm solid #000;outline-offset:-0.15mm}
.in{position:relative;width:100%;height:100%;font-size:var(--fs);line-height:1.18;display:flex;flex-direction:column;gap:.5mm}
.body{flex:1 1 0;min-height:0;display:flex;gap:1mm;overflow:hidden}
.main{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-start;gap:.6mm;overflow:hidden}
.txt{min-width:0}.t1{font-weight:700;font-size:1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.t2{font-size:.82em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.t3{font-size:.7em;max-height:2.4em;overflow:hidden}
.pid{font-family:"Courier New",monospace;font-weight:700;font-size:1.2em;white-space:nowrap}.qty{margin-inline-start:1.5mm;font-size:.8em}.qty0{font-weight:700}
.nm{font-weight:700;font-size:.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dm{font-family:"Courier New",monospace;font-weight:700;font-size:1.05em}
.mini{display:flex;gap:1mm;align-items:center;margin-top:.4mm}.mini svg{display:block;height:var(--mh);width:auto;max-width:100%}.main.row{flex-direction:row;gap:1.5mm}.main.row .txt{flex:1 1 0}.main.row .mini{flex-direction:column;margin-top:0;justify-content:flex-start}
.side{flex:0 0 var(--qr);width:var(--qr);display:flex;flex-direction:column;align-items:flex-end;gap:.8mm}.side .qr svg{display:block;width:var(--qr);height:var(--qr)}.side .lg{max-width:var(--qr);max-height:7mm;object-fit:contain}
.bc{flex:0 0 var(--bch);height:var(--bch)}.bc svg{width:100%;height:100%;display:block}
.pg{position:relative;page-break-after:always;break-after:page;overflow:hidden}.pg:last-child{page-break-after:auto;break-after:auto}
@page{size:${mm(pageSize(p).w)} ${mm(pageSize(p).h)};margin:0}
@media screen{body{background:#ddd}.pg{background:#fff;margin:6mm auto;box-shadow:0 0 3mm rgba(0,0,0,.3)}}`;
}
/** the full printable document. ctx = { fields, preset, ar, doc:{project,company,opts}, scene, nameAr, noteText, cut: draw outlines } */
export function labelsHtml(items, ctx, { skip = 0, title = 'Labels', outline = false } = {}) {
  const p = ctx.preset; const pg = pageSize(p);
  const pages = paginate(items, p, skip);
  const body = pages.map((cells) => `<section class="pg" style="width:${mm(pg.w)};height:${mm(pg.h)}">${cells.map((it, i) => {
    if (!it) return '';
    const o = cellOrigin(p, i);
    return `<div class="lbl${outline ? ' box' : ''}" style="left:${mm(o.x)};top:${mm(o.y)}">${labelInner(it, ctx)}</div>`;
  }).join('')}</section>`).join('');
  return `<!doctype html><html lang="${ctx.lang || 'en'}" dir="${ctx.ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${labelCss(p)}</style></head><body>${body || '<p>-</p>'}</body></html>`;
}
/** alignment test page: every cell outlined and numbered, crosshair at the sheet corners, ruler ticks every 10 mm on the first row */
export function testGridHtml(preset, { ar = false, lang = 'en' } = {}) {
  const p = preset; const pg = pageSize(p); const n = perPage(p);
  const cells = [...Array(n)].map((_, i) => { const o = cellOrigin(p, i); return `<div class="lbl box" style="left:${mm(o.x)};top:${mm(o.y)}"><div style="font:700 4mm Arial">${i + 1}</div><div style="font:2.6mm Arial">${fmt(p.w)} × ${fmt(p.h)} mm</div><div style="position:absolute;left:50%;top:0;bottom:0;border-left:.1mm dashed #000"></div><div style="position:absolute;top:50%;left:0;right:0;border-top:.1mm dashed #000"></div></div>`; }).join('');
  const ticks = [...Array(Math.floor(pg.w / 10))].map((_, i) => `<i style="position:absolute;left:${mm((i + 1) * 10)};top:0;height:${i % 5 === 4 ? '5mm' : '2.5mm'};border-left:.1mm solid #000"></i>`).join('');
  return `<!doctype html><html lang="${lang}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>Label alignment test</title><style>${labelCss(p)}</style></head><body><section class="pg" style="width:${mm(pg.w)};height:${mm(pg.h)}">${ticks}${cells}</section></body></html>`;
}

/* ---- ZPL (Zebra) ---- */
export const DPMM = { 203: 8, 300: 12 };
const zText = (s) => String(s == null ? '' : s).replace(/[\^~\\]/g, ' ').replace(/[^\x20-\x7e]/g, '?');
/** one ^XA...^XZ label: border box, text lines, QR (^BQ) and optional Code 128 (^BC). Arabic text cannot be printed with the built-in ZPL fonts: it is replaced by '?'. */
export function zplLabel(item, ctx, dpi = 203) {
  const k = DPMM[dpi] || 8; const p = ctx.preset; const f = ctx.fields; const r = item.row; const proj = ctx.doc.project;
  const W = Math.round(p.w * k); const H = Math.round(p.h * k); const pad = Math.round(1.5 * k);
  const lh = Math.max(14, Math.round(Math.min(p.h * 0.14, 5) * k)); // line height in dots
  const qrDots = Math.round(Math.min(p.w * 0.36, p.h * 0.5, 30) * k);
  const mag = Math.max(2, Math.min(10, Math.floor(qrDots / 29)));
  const textW = f.qr ? W - qrDots - 3 * pad : W - 2 * pad;
  let y = pad; const out = ['^XA', `^PW${W}`, `^LL${H}`, '^LH0,0', '^CI28', `^FO0,0^GB${W},${H},2^FS`];
  const line = (t, size = lh) => { if (!t) return; out.push(`^FO${pad},${y}^A0N,${size},${Math.round(size * 0.85)}^FB${textW},1,0,L,0^FD${zText(t)}^FS`); y += size + 3; };
  if (f.project) line(proj.project);
  if (f.orderNo || f.customer) line([f.orderNo && proj.orderNo ? `SO ${proj.orderNo}` : '', f.customer && proj.customer ? proj.customer : ''].filter(Boolean).join('  '), Math.round(lh * 0.85));
  if (f.pid) line(`${item.pid}${f.qty ? `   ${item.type ? 'x' + item.N : item.n + '/' + item.N}` : ''}`, Math.round(lh * 1.2));
  if (f.name) line(r.name);
  if (f.cabinet) line(r.group, Math.round(lh * 0.85));
  if (f.dims) line(`${fmt(r.cut.L)} x ${fmt(r.cut.W)} x ${fmt(r.cut.T)}`, Math.round(lh * 1.1));
  if (f.material) line(r.matName, Math.round(lh * 0.85));
  if (f.grain && r.grain && r.grain !== '-') line(`Grain ${r.grain}  Edges ${f.edges ? r.edges || '-' : ''}`, Math.round(lh * 0.85));
  else if (f.edges) line(`Edges ${r.edges || '-'}`, Math.round(lh * 0.85));
  if (f.notes && r.note) line(r.note, Math.round(lh * 0.7));
  if (f.qr) out.push(`^FO${W - qrDots - pad},${pad}^BQN,2,${mag}^FDMA,${zText(qrPayload(ctx.doc.opts.qrKind, proj, partOf(item)))}^FS`);
  if (f.barcode) out.push(`^FO${pad},${Math.max(y, H - Math.round(10 * k))}^BY2^BCN,${Math.round(6 * k)},N,N,N^FD${zText(item.pid)}^FS`);
  out.push('^XZ');
  return out.join('\n');
}
export const zplDoc = (items, ctx, dpi = 203) => items.map((it) => zplLabel(it, ctx, dpi)).join('\n') + '\n';

/* ---- CSV for external label software ---- */
export const LABEL_CSV_HEAD = ['project', 'order_no', 'customer', 'part_id', 'copy', 'copies', 'part_name', 'cabinet', 'length', 'width', 'thickness', 'material', 'grain', 'edges', 'notes', 'qr_payload'];
const cell = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function labelsCSV(items, ctx) {
  const proj = ctx.doc.project;
  const rows = items.map((it) => { const r = it.row; return [proj.project, proj.orderNo, proj.customer, it.pid, it.type ? '' : it.n, it.N, r.name, r.group, fmt(r.cut.L), fmt(r.cut.W), fmt(r.cut.T), r.matName, r.grain, r.edges, r.note, qrPayload(ctx.doc.opts.qrKind, proj, partOf(it))]; });
  return '﻿' + [LABEL_CSV_HEAD, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
