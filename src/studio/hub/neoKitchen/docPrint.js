/* =============================================================================
 * [NEO-CUTLIST-UX32] Printed production documents as self-contained HTML strings (A4 landscape, mm units, explicit pages so "Sheet X of Y"
 * is exact): the CAD-style TITLE BLOCK (logo, company, project fields, document title, sheet X of Y, scale, revision, QR), the cut list
 * (the user's visible columns, pictures, totals) and the nesting sheets (one page per board with a legend). The same title block is
 * embedded in the PDF report (PdfReportSheet) so every production document carries the same block.
 * Paper is white: literal ink colours are used on purpose (DESIGN.md print exemption); nothing follows the app theme. Every inserted value
 * is escaped. No external request: logo is a data: URL or a same-origin path, QR / barcode / pictures are inline SVG.
 * ===========================================================================*/
import { qrSvg } from './clCodes';
import { qrPayload, todayIso, PROJECT_LABELS } from './docInfo';
import { isoPicSvg, edgeSketchSvg, grainArrowSvg, hwIconSvg, PAL_PRINT } from './clPics';
import { sheetSvg, materialStats } from './clSheet';
import { fmt } from './clParts';

export const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** the title block rules alone (the PDF report embeds them next to the title block; DOC_CSS adds the page rules of the stand-alone documents) */
export const TB_CSS = `
.tb{display:grid;grid-template-columns:62mm 1fr 58mm;border:.35mm solid #111;min-height:22mm;flex:0 0 auto}
.tb>div{padding:1.6mm 2.2mm;border-inline-end:.25mm solid #111}.tb>div:last-child{border-inline-end:0}
.tb-co{display:flex;gap:2.4mm;align-items:flex-start}.tb-co img{max-width:22mm;max-height:16mm;object-fit:contain;flex:0 0 auto}
.tb-co b{display:block;font-size:9.5pt}.tb-co span{display:block;font-size:6.6pt;color:#444}
.tb-pj{display:grid;grid-template-columns:repeat(4,1fr);gap:.8mm 3mm;align-content:start}
.tb-pj div{min-width:0}.tb-pj small{display:block;font-size:5.8pt;letter-spacing:.04em;text-transform:uppercase;color:#555}.tb-pj span{display:block;font-size:7.6pt;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tb-pj .wide{grid-column:span 2}
.tb-dc{display:grid;grid-template-columns:1fr 20mm;gap:1mm 2mm;align-items:start}
.tb-dc h1{font-size:11pt;letter-spacing:.04em;grid-column:1/-1}.tb-dc .meta{font-size:7pt;line-height:1.5}.tb-dc .meta b{font-size:8.6pt}
.tb-dc .qr svg{width:20mm;height:20mm;display:block}
.tb.compact{min-height:12mm}.tb.compact .tb-co span,.tb.compact .tb-pj .x{display:none}
.tb.portrait{grid-template-columns:1fr 54mm;font-size:8pt}.tb.portrait>div:nth-child(2){grid-column:1/-1;order:3;border-top:.25mm solid #111;border-inline-end:0}.tb.portrait>div:nth-child(1){border-inline-end:.25mm solid #111}.tb.portrait>div:nth-child(3){order:2;border-inline-end:0}.tb.portrait .tb-pj{grid-template-columns:repeat(4,1fr)}
`;

export const DOC_CSS = `
*{box-sizing:border-box;margin:0;padding:0}html,body{background:#fff;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Arial,Helvetica,"Segoe UI",Tahoma,sans-serif;font-size:8pt;line-height:1.25}
@page{size:297mm 210mm;margin:0}
.pg{width:297mm;height:210mm;padding:8mm;position:relative;page-break-after:always;break-after:page;overflow:hidden;display:flex;flex-direction:column;gap:3mm}
.pg:last-child{page-break-after:auto;break-after:auto}
@media screen{body{background:#cfd3da}.pg{background:#fff;margin:6mm auto;box-shadow:0 0 3mm rgba(0,0,0,.35)}}
${TB_CSS}
table.ct{width:100%;border-collapse:collapse;table-layout:fixed;flex:0 0 auto}
table.ct th{background:#eceef2;font-size:6.4pt;text-transform:uppercase;letter-spacing:.04em;color:#333;border:.2mm solid #111;padding:1mm 1.2mm;text-align:start;height:6mm}
table.ct td{border:.2mm solid #888;padding:.5mm 1.2mm;vertical-align:middle;overflow:hidden;font-size:7pt;height:var(--rh,11mm)}
table.ct td.n,table.ct th.n{text-align:end}.ct .c{text-align:center}.ct .mono{font-family:"Courier New",monospace}.ct .nm{font-weight:700}.ct .sm{font-size:6pt;color:#555}
.ct .pic svg,.ct .pic img{display:block;margin:auto}.ct .ed{display:flex;align-items:center;gap:1.2mm}
.ft{margin-top:auto;display:flex;justify-content:space-between;font-size:6.4pt;color:#444;border-top:.2mm solid #111;padding-top:1mm}
.tot{display:flex;gap:6mm;font-size:8pt;font-weight:700;padding:1mm 0}.tot span small{display:block;font-weight:400;font-size:6pt;color:#555;text-transform:uppercase}
.hw{display:grid;grid-template-columns:repeat(3,1fr);gap:1mm 6mm;font-size:7.4pt}.hw div{display:flex;align-items:center;gap:1.6mm;border-bottom:.15mm solid #bbb;padding:.6mm 0}.hw b{margin-inline-start:auto}
.sheetbox{flex:1 1 auto;min-height:0;display:flex;gap:4mm}.sheetbox .dg{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center}.sheetbox .dg svg{max-width:100%;max-height:100%;width:100%;height:100%}
.lg{flex:0 0 74mm;overflow:hidden;font-size:6.4pt}.lg table{width:100%;border-collapse:collapse}.lg td{border-bottom:.15mm solid #bbb;padding:.3mm .8mm}.lg h3{font-size:8pt;margin-bottom:1mm}
`;

/* ---- title block ---- */
const kv = (label, value, cls = '') => (String(value || '').trim() ? `<div class="${cls}"><small>${esc(label)}</small><span>${esc(value)}</span></div>` : '');
/**
 * doc = { project, company (resolved), opts }.  o = { title, sheet, of, lang, compact, fallbackName, date }
 */
export function titleBlockHtml(doc, o = {}) {
  const ar = o.lang === 'ar'; const P = doc.project; const C = doc.company; const O = doc.opts;
  if (O.titleBlock === false) return '';
  const L = (k) => PROJECT_LABELS[k][ar ? 1 : 0];
  const name = P.project || o.fallbackName || '';
  const logo = O.logo && C.logo ? `<img src="${esc(C.logo)}" alt=""/>` : '';
  const qr = O.qr ? qrSvg(qrPayload(O.qrKind, P, null), { size: 100, quiet: 1 }) : '';
  const co = `<div class="tb-co">${logo}<div><b>${esc(ar && C.nameAr ? C.nameAr : C.name)}</b>${[C.address, [C.phone, C.email].filter(Boolean).join(' · '), C.cr ? `${ar ? 'س.ت' : 'CR'} ${C.cr}` : ''].filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join('')}</div></div>`;
  const pj = `<div class="tb-pj">${kv(L('project'), name, 'wide')}${kv(L('customer'), P.customer, 'wide')}${kv(L('orderNo'), P.orderNo)}${kv(L('jobNo'), P.jobNo)}${kv(L('designer'), P.designer)}${kv(L('salesRep'), P.salesRep)}${kv(L('date'), P.date || o.date || todayIso())}${kv(L('deliveryDate'), P.deliveryDate)}${kv(L('customerPhone'), P.customerPhone, 'x')}${kv(L('siteAddress'), P.siteAddress, 'wide x')}${kv(L('materialSpec'), P.materialSpec, 'wide x')}</div>`;
  const dc = `<div class="tb-dc"><div><h1>${esc(o.title || '')}</h1><div class="meta">${o.sheet ? `<b>${ar ? 'ورقة' : 'Sheet'} ${o.sheet} ${ar ? 'من' : 'of'} ${o.of}</b><br/>` : ''}${ar ? 'المقياس' : 'Scale'} ${esc(O.scale)} · ${ar ? 'مراجعة' : 'Rev'} ${esc(P.revision || '-')}</div></div>${qr ? `<div class="qr">${qr}</div>` : '<div></div>'}</div>`;
  return `<div class="tb${o.compact ? ' compact' : ''}${o.portrait ? ' portrait' : ''}"><div>${co}</div><div>${pj}</div><div>${dc}</div></div>`;
}

/* ---- cut list ---- */
const A4_BODY_MM = 194;
/** how many rows fit: first page carries the full title block, the others a compact one */
export function rowsPerPage(rowH, first) { return Math.max(3, Math.floor((A4_BODY_MM - (first ? 30 : 17) - 6 - 8 - (first ? 0 : 0)) / rowH)); }

function cellHtml(col, r, ctx) {
  const { ar, scene } = ctx;
  switch (col.id) {
    case 'pic': return `<td class="pic c">${isoPicSvg(r, { scene, size: ctx.picPx, pal: PAL_PRINT, key: 'print' })}</td>`;
    case 'pid': return `<td class="mono nm">${esc(r.pid)}</td>`;
    case 'no': return `<td class="c">${String(r.no).padStart(2, '0')}</td>`;
    case 'name': return `<td><div class="nm">${esc(col.text(r, ctx))}</div></td>`;
    case 'dims': return `<td class="mono">${esc(`${fmt(r.cut.L)} × ${fmt(r.cut.W)} × ${fmt(r.cut.T)}`)}<div class="sm">±${r.tol} mm</div></td>`;
    case 'grain': return `<td class="c">${r.grain && r.grain !== '-' ? `${grainArrowSvg(r.grain, { size: 12, pal: PAL_PRINT })} ${esc(r.grain)}` : '-'}</td>`;
    case 'edges': return `<td><div class="ed">${edgeSketchSvg(r, { w: 46, h: 28, pal: PAL_PRINT, key: 'print' })}<span class="sm">${esc(r.edgeText)}</span></div></td>`;
    case 'qty': case 'thk': case 'area': case 'w': case 'd': case 'h': return `<td class="n mono">${esc(col.text(r, ctx))}</td>`;
    default: return `<td>${esc(col.text(r, ctx))}</td>`;
  }
}
/**
 * The cut list print document. ctx = { rows (filtered + sorted pro rows), cols (visible column defs, no hidden), widths: {id: px}, doc, lang, ar, scene,
 * picPx, title, totals {pieces, area, edgeM, boards, waste}, hardware, nameAr, noteAr, noteEn, pic (bool) }
 */
export function cutListHtml(ctx) {
  const { rows, cols, doc, ar, lang } = ctx;
  const useCols = cols.filter((c) => c.id !== 'pic' || ctx.pic);
  const sum = useCols.reduce((s, c) => s + (ctx.widths[c.id] || c.w), 0) || 1;
  const rh = ctx.pic ? 11 : 8.5; const picPx = Math.round((rh - 1.6) * 3.78);
  const c2 = { ...ctx, picPx };
  const first = rowsPerPage(rh, true); const rest = rowsPerPage(rh, false);
  const pages = []; let i = 0;
  pages.push(rows.slice(0, first)); i = first;
  while (i < rows.length) { pages.push(rows.slice(i, i + rest)); i += rest; }
  const hwRows = (ctx.hardware || []).filter((h) => h.qty > 0);
  const extra = (hwRows.length ? 1 : 0);
  const total = Math.max(1, pages.length) + extra;
  const head = `<colgroup>${useCols.map((c) => `<col style="width:${((ctx.widths[c.id] || c.w) / sum * 100).toFixed(2)}%"/>`).join('')}</colgroup><thead><tr>${useCols.map((c) => `<th class="${c.id === 'qty' || c.id === 'area' || c.id === 'thk' ? 'n' : ''}">${esc(ar ? c.ar : c.en)}</th>`).join('')}</tr></thead>`;
  const tot = ctx.totals;
  const totHtml = `<div class="tot"><span><small>${ar ? 'قطع' : 'Pieces'}</small>${tot.pieces}</span><span><small>m²</small>${tot.area.toFixed(2)}</span><span><small>${ar ? 'شريط الحواف م' : 'Edge m'}</small>${tot.edgeM.toFixed(1)}</span>${tot.boards ? `<span><small>${ar ? 'ألواح' : 'Boards'}</small>${tot.boards}</span>` : ''}${tot.waste != null ? `<span><small>${ar ? 'هدر %' : 'Waste %'}</small>${tot.waste.toFixed(1)}</span>` : ''}</div>`;
  const body = pages.map((pr, k) => `<section class="pg"${ctx.pic ? '' : ''} style="--rh:${rh}mm">${titleBlockHtml(doc, { title: ar ? 'قائمة القص' : 'CUTTING LIST', sheet: k + 1, of: total, lang, compact: k > 0, fallbackName: ctx.title })}<table class="ct">${head}<tbody>${pr.map((r) => `<tr>${useCols.map((c) => cellHtml(c, r, c2)).join('')}</tr>`).join('') || `<tr><td colspan="${useCols.length}">-</td></tr>`}</tbody></table>${k === pages.length - 1 ? totHtml : ''}<div class="ft"><span>${esc(ctx.title || '')}</span><span>${ar ? 'م² = العدد × أكبر وجه للقطعة. مقاسات القص بعد خصم شريط الحواف.' : 'm² = qty × largest face of the cut part. Cut sizes are after the edge-band deduction.'}</span></div></section>`).join('');
  const hw = hwRows.length ? `<section class="pg" style="--rh:${rh}mm">${titleBlockHtml(doc, { title: ar ? 'الاكسسوارات' : 'HARDWARE', sheet: total, of: total, lang, compact: true, fallbackName: ctx.title })}<div class="hw">${hwRows.map((h) => `<div>${hwIconSvg(h.k, { size: 20, pal: PAL_PRINT, image: h.image })}<span>${esc(h[lang])}</span><b>${h.qty}</b></div>`).join('')}</div><div class="ft"><span>${esc(ctx.title || '')}</span><span></span></div></section>` : '';
  return `<!doctype html><html lang="${lang}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(ctx.title || 'Cutting list')}</title><style>${DOC_CSS}</style></head><body>${body}${hw}</body></html>`;
}

/* ---- nesting sheets ---- */
/** one page per board: title block, the diagram, a legend with the parts on it (pictures when ctx.pic) */
export function nestingHtml(ctx) {
  const { plan, doc, ar, lang, rowsByNo } = ctx;
  const stats = materialStats(plan);
  const n = plan.sheets.length;
  const body = plan.sheets.map((s, k) => {
    const st = stats.find((m) => m.material === s.material && m.thk === s.thk) || {};
    const groups = new Map(); s.parts.forEach((q) => { const e = groups.get(q.pid) || { q, n: 0 }; e.n += 1; groups.set(q.pid, e); });
    const legend = [...groups.values()].map(({ q, n: cnt }) => { const row = rowsByNo.get(q.no); return `<tr><td>${ctx.pic && row ? isoPicSvg(row, { scene: ctx.scene, size: 22, pal: PAL_PRINT, key: 'print' }) : ''}</td><td><b>${esc(q.pid)}</b></td><td>${fmt(q.w)}×${fmt(q.h)}</td><td>×${cnt}</td></tr>`; }).join('');
    return `<section class="pg">${titleBlockHtml(doc, { title: ar ? 'خطة القص' : 'CUTTING PLAN', sheet: k + 1, of: n, lang, compact: true, fallbackName: ctx.title })}<div class="sheetbox"><div class="dg">${sheetSvg(plan, s, { pal: PAL_PRINT })}</div><div class="lg"><h3>${esc(s.material)} ${fmt(s.thk)} mm · ${s.index}/${s.of}</h3><p>${plan.sheetW} × ${plan.sheetH} mm · ${ar ? 'منشار' : 'kerf'} ${plan.kerf} mm</p><p>${ar ? 'الاستخدام' : 'Utilisation'} ${(s.used * 100).toFixed(1)}% · ${ar ? 'قطع' : 'Parts'} ${s.parts.length}${st.util != null ? ` · ${ar ? 'الهدر' : 'Waste'} ${st.waste.toFixed(1)}%` : ''}</p><p>${ar ? 'قطع متبقية' : 'Offcuts'}: ${s.offcuts.length ? s.offcuts.map((o) => `${Math.round(o.w)}×${Math.round(o.h)}`).join(', ') : '-'}</p><table>${legend}</table></div></div><div class="ft"><span>${esc(ctx.title || '')}</span><span>${ar ? 'العرق باتجاه طول اللوح' : 'Grain runs along the sheet length'}</span></div></section>`;
  }).join('');
  return `<!doctype html><html lang="${lang}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(ctx.title || 'Cutting plan')}</title><style>${DOC_CSS}</style></head><body>${body || '<p>-</p>'}</body></html>`;
}
