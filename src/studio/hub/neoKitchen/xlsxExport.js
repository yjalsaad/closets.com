/* =============================================================================
 * Neo Kitchen Designer - Excel cutting list (.xlsx). A minimal OOXML SpreadsheetML writer: no library, no
 * dependency. The package is a ZIP written with the STORE method (no compression) and CRC-32 checksums.
 * Sheets: Cutting List, Summary (by material), Hardware, Warnings. Numbers are real numeric cells and come from
 * the same bom rows as the screen / CSV / JSON (mm, area = qty x largest face of the cut part, 3 decimals).
 * Text uses inline strings (no sharedStrings part). In Arabic the sheets are right-to-left.
 * ===========================================================================*/
import { BOARD } from './constants';
import { partNameAr, noteAr, noteEn } from './cutlist';
import { crc32 } from './crc32';
import { appName, productNoun } from './productInfo';
import { dimNumber, outOf, UNIT_INFO, isDefaultOutput, PRECISION_LABEL } from './outputSettings';

/* ---------------- ZIP (store) ---------------- */
export { crc32 };
const enc = (s) => new TextEncoder().encode(s);
/** files: [{ name, data: string | Uint8Array }] -> Uint8Array (a valid .zip, method 0) */
export function zipStore(files, now = new Date()) {
  const dosT = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosD = ((Math.max(0, now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  const parts = []; const central = []; let off = 0;
  files.forEach((f) => {
    const name = enc(f.name); const data = typeof f.data === 'string' ? enc(f.data) : f.data; const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, dosT, true); lh.setUint16(12, dosD, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosT, true); ch.setUint16(14, dosD, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((s, a) => s + a.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, a) => s + a.length, 0)); let p = 0;
  all.forEach((a) => { out.set(a, p); p += a.length; });
  return out;
}

/* ---------------- SpreadsheetML ---------------- */
const esc = (s) => String(s == null ? '' : s).replace(/[^\x09\x0a\x0d\x20-퟿-�]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i) => { let s = ''; let n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

/* cellXfs ids */
export const ST = { def: 0, head: 1, int: 2, mm: 3, m2: 4, title: 5, totLabel: 6, totInt: 7, tot2: 8, wrap: 9, mute: 10 };
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="0.0"/><numFmt numFmtId="165" formatCode="0.000"/><numFmt numFmtId="166" formatCode="0.00"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font><font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF9"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF9AA5B8"/></bottom><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF9AA5B8"/></top><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="1" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="166" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** a cell: string -> inline string; finite number -> numeric; null -> empty. `s` = style id */
const C = (v, s = 0) => ({ v, s });

function sheetXml(rows, { widths = [], freeze = 0, filterCols = 0, filterTo = 0, rtl = false, rowHt = 0, rowHts = null, drawing = false } = {}) {
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');
  out.push(`<sheetViews><sheetView workbookViewId="0"${rtl ? ' rightToLeft="1"' : ''}>${freeze ? `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${freeze + 1}" sqref="A${freeze + 1}"/>` : ''}</sheetView></sheetViews>`);
  out.push('<sheetFormatPr defaultRowHeight="15"/>');
  if (widths.length) out.push(`<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`);
  out.push('<sheetData>');
  rows.forEach((row, ri) => {
    const cells = row.map((cell, ci) => {
      if (cell == null || cell.v == null || cell.v === '') return cell && cell.s ? `<c r="${colName(ci)}${ri + 1}" s="${cell.s}"/>` : '';
      const ref = `${colName(ci)}${ri + 1}`; const st = cell.s ? ` s="${cell.s}"` : '';
      if (typeof cell.v === 'number' && Number.isFinite(cell.v)) return `<c r="${ref}"${st}><v>${cell.v}</v></c>`;
      return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`;
    }).join('');
    const ht = rowHts && rowHts[ri] ? rowHts[ri] : (rowHt && ri > 0 ? rowHt : 0);
    out.push(`<row r="${ri + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`);
  });
  out.push('</sheetData>');
  if (filterCols && filterTo > 1) out.push(`<autoFilter ref="A1:${colName(filterCols - 1)}${filterTo}"/>`);
  out.push('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/>');
  if (drawing) out.push('<drawing r:id="rId1"/>');
  out.push('</worksheet>');
  return out.join('');
}

/** the rows the Cutting List sheet holds (also what the tests compare with bomData) */
export function cutRows(bom, { ar = false, output } = {}) {
  const v = (x) => (output ? dimNumber(x, output) : x); // [NEO-OUTPUT-UX34] no options = the model's millimetres, untouched
  return bom.rows.map((r) => ({
    no: r.no, name: ar ? (r.nameAr || partNameAr(r.name)) : r.name, w: v(r.w), d: v(r.d), h: v(r.h), qty: r.qty, material: r.matName, board: BOARD[r.mat][ar ? 'ar' : 'en'],
    m2: +r.area.toFixed(3), grain: r.grain, edges: r.edges, cutL: v(r.cut.L), cutW: v(r.cut.W), thk: v(r.cut.T), note: ar ? (r.noteAr || noteAr(r.note)) : noteEn(r.note),
  }));
}

/**
 * buildXLSX({ model, scene, bom, hardware, warnings, lang, layout, overall, date }) -> { bytes, sheets }
 * `layout` / `overall` are the same strings the PDF cover prints (pdfReport.reportMeta).
 */
/** [NEO-OUTPUT-UX34] `output` = { unit, precision }: the W / D / H / Cut / Thickness columns are numeric cells in mm / cm / inch (the headers name the unit), rounded by the precision;
 * omitted = millimetres untouched (the legacy file). Areas stay m2. */
export function buildXLSX({ model, bom, hardware, warnings, lang = 'en', meta = {}, date = new Date(), product, output, doc, pro }) {
  const app = appName(product); // file metadata + fallback title name the product the file came from (registered product, else the kitchen)
  const ar = lang === 'ar';
  const T = (en, a) => (ar ? a : en);
  const names = [T('Cutting List', 'قائمة القص'), T('Summary', 'الملخص'), T('Hardware', 'الاكسسوارات'), T('Warnings', 'التنبيهات')];
  const rtl = ar;
  const O = outOf(output); const un = UNIT_INFO[O.unit]; const dimSt = O.unit === 'in' ? ST.m2 : ST.mm; // inch columns show 3 decimals, mm / cm 1
  const uE = `(${un.en})`; const uA = `(${un.ar})`;

  /* 1 - Cutting List */
  const head = [T('No.', 'رقم'), T('Component', 'المكوّن'), T(`W ${uE}`, `العرض ${uA}`), T(`D ${uE}`, `العمق ${uA}`), T(`H ${uE}`, `الارتفاع ${uA}`), T('Qty', 'العدد'), T('Material', 'المادة'), T('Board class', 'فئة اللوح'), T('Area (m²)', 'المساحة (م²)'), T('Grain', 'العرق'), T('Edges', 'الحواف'), T(`Cut L ${uE}`, `طول القص ${uA}`), T(`Cut W ${uE}`, `عرض القص ${uA}`), T(`Thickness ${uE}`, `السماكة ${uA}`), T('Notes', 'ملاحظات')];
  const cl = [head.map((h) => C(h, ST.head))];
  cutRows(bom, { ar, output }).forEach((r) => cl.push([C(r.no, ST.int), C(r.name), C(r.w, dimSt), C(r.d, dimSt), C(r.h, dimSt), C(r.qty, ST.int), C(r.material), C(r.board), C(r.m2, ST.m2), C(r.grain), C(r.edges), C(r.cutL, dimSt), C(r.cutW, dimSt), C(r.thk, dimSt), C(r.note, ST.wrap)]));
  cl.push([C(null, ST.totLabel), C(T('Total', 'الإجمالي'), ST.totLabel), C(null, ST.totLabel), C(null, ST.totLabel), C(null, ST.totLabel), C(bom.pieces, ST.totInt), C(null, ST.totLabel), C(null, ST.totLabel), C(+bom.boardArea.toFixed(3), ST.tot2), ...Array(6).fill(C(null, ST.totLabel))]);
  const s1 = sheetXml(cl, { widths: [6, 34, 10, 10, 10, 7, 24, 18, 11, 7, 9, 11, 11, 11, 52], freeze: 1, filterCols: head.length, filterTo: cl.length - 1, rtl });

  /* [NEO-CUTLIST-UX32] pro: sheet 1 holds the VISIBLE columns of the cut list view, in the view's order (numbers stay numeric); a picture column embeds a PNG per row */
  let proDraw = null; let s1x = s1; let filterColsN = head.length; let filterRowsN = cl.length - 1;
  if (pro) {
    const use = pro.cols.filter((c) => c.id !== 'pic' || pro.pics);
    const NUM = { qty: ST.int, no: ST.int, thk: ST.mm, w: ST.mm, d: ST.mm, h: ST.mm, area: ST.m2 };
    const hd = use.map((c) => C(ar ? c.ar : c.en, ST.head));
    const body = pro.rows.map((r) => use.map((c) => {
      if (c.id === 'pic') return C(null);
      const raw = c.text(r, pro.ctx);
      if (NUM[c.id] !== undefined) { const n = Number(String(raw).replace(/^0+(?=\d)/, '')); return Number.isFinite(n) ? C(n, NUM[c.id]) : C(raw); }
      return C(raw, c.id === 'notes' || c.id === 'ops' ? ST.wrap : 0);
    }));
    const tr = use.map((c, i) => (i === 0 ? C(T('Total', 'الإجمالي'), ST.totLabel) : c.id === 'qty' ? C(pro.rows.reduce((a, r) => a + r.qty, 0), ST.totInt) : c.id === 'area' ? C(+pro.rows.reduce((a, r) => a + r.area, 0).toFixed(3), ST.tot2) : C(null, ST.totLabel)));
    const W = { pic: 12, pid: 16, no: 6, name: 34, group: 18, room: 14, dims: 26, w: 9, d: 9, h: 9, thk: 9, qty: 7, material: 24, grain: 8, edges: 26, ops: 36, hw: 24, notes: 52, rot: 8, area: 11, maps: 14 };
    const withPic = use.some((c) => c.id === 'pic');
    filterColsN = use.length; filterRowsN = body.length + 1;
    s1x = sheetXml([hd, ...body, tr], { widths: use.map((c) => W[c.id] || 14), freeze: 1, filterCols: use.length, filterTo: body.length + 1, rtl, rowHt: withPic ? 54 : 0, drawing: withPic });
    if (withPic) {
      const pi = use.findIndex((c) => c.id === 'pic');
      proDraw = { anchors: pro.rows.map((r, i) => ({ col: pi, row: i + 1, dx: 38100, dy: 38100, cx: 48 * 9525, cy: 48 * 9525, img: pro.pics[i], alt: r.pid })).filter((a) => a.img) };
    }
  }

  /* [NEO-CUTLIST-UX32] cover sheet: logo, company, project details, QR (only when the caller passes `doc` with `cover`) */
  let cover = null;
  if (doc && doc.cover) {
    const P = doc.project; const Co = doc.company; const rowsC = [];
    rowsC.push([C(P.project || model.title || T(productNoun(product, false), productNoun(product, true)), ST.title)]);
    rowsC.push([C(ar && Co.nameAr ? Co.nameAr : Co.name, ST.head), C(null, ST.head)]);
    [[T('Address', 'العنوان'), Co.address], [T('Phone', 'الهاتف'), Co.phone], [T('Email', 'البريد الإلكتروني'), Co.email], [T('CR no.', 'السجل التجاري'), Co.cr]].forEach(([k, v]) => { if (v) rowsC.push([C(k, ST.mute), C(v)]); });
    rowsC.push([]);
    rowsC.push([C(T('Project details', 'تفاصيل المشروع'), ST.head), C(null, ST.head)]);
    (doc.fields || []).forEach(([k, v]) => { if (v) rowsC.push([C(k, ST.mute), C(v, ST.wrap)]); });
    rowsC.push([]);
    rowsC.push([C(T('Scale', 'المقياس'), ST.mute), C(doc.opts.scale)]);
    rowsC.push([C(T('Tolerance (mm)', 'السماحية (مم)'), ST.mute), C(doc.opts.tolerance, ST.m2)]);
    const hasImgs = !!(doc.images && (doc.images.logo || doc.images.qr));
    const anchors = [];
    if (doc.images && doc.images.logo) anchors.push({ col: 3, row: 0, dx: 0, dy: 0, cx: 150 * 9525, cy: 80 * 9525, img: doc.images.logo, alt: 'logo' });
    if (doc.images && doc.images.qr) anchors.push({ col: 3, row: 6, dx: 0, dy: 0, cx: 130 * 9525, cy: 130 * 9525, img: doc.images.qr, alt: 'QR' });
    cover = { xml: sheetXml(rowsC, { widths: [26, 46, 3, 30], rtl, drawing: hasImgs }), draw: anchors.length ? { anchors } : null };
  }

  /* 2 - Summary */
  const sm = [];
  sm.push([C(model.title || T(productNoun(product, false), productNoun(product, true)), ST.title)]);
  sm.push([C(T('Date', 'التاريخ'), ST.mute), C(date.toISOString().slice(0, 10))]);
  if (meta.layout) sm.push([C(T('Layout', 'التخطيط'), ST.mute), C(meta.layout)]);
  if (meta.overall) sm.push([C(T('Overall size', 'الأبعاد الكلية'), ST.mute), C(meta.overall)]);
  if (output && !isDefaultOutput(output)) sm.push([C(T('Output', 'المخرجات'), ST.mute), C(`${un.en} · ${PRECISION_LABEL[O.precision][ar ? 1 : 0]}${O.fraction ? ' · 1/16' : ''}`)]);
  sm.push([]);
  sm.push([C(T('Totals', 'الإجماليات'), ST.head), C(null, ST.head), C(null, ST.head)]);
  sm.push([C(T('Pieces', 'قطع')), C(bom.pieces, ST.int)]);
  sm.push([C(T('Board m²', 'م² ألواح')), C(+bom.boardArea.toFixed(3), ST.m2)]);
  sm.push([C(T('Unique parts', 'قطع فريدة')), C(bom.unique, ST.int)]);
  sm.push([C(T('Edge banding (m)', 'شريط الحواف (م)')), C(+bom.edgeMetres.toFixed(2), ST.m2)]);
  sm.push([]);
  sm.push([C(T('Material', 'المادة'), ST.head), C(T('Pieces', 'قطع'), ST.head), C(T('Area (m²)', 'المساحة (م²)'), ST.head)]);
  Object.keys(bom.named).forEach((k) => sm.push([C(k), C(bom.named[k].pcs, ST.int), C(+bom.named[k].m2.toFixed(3), ST.m2)]));
  sm.push([]);
  sm.push([C(T('Board class', 'فئة اللوح'), ST.head), C(T('Pieces', 'قطع'), ST.head), C(T('Area (m²)', 'المساحة (م²)'), ST.head)]);
  bom.cards.forEach((c) => sm.push([C(BOARD[c.k][ar ? 'ar' : 'en']), C(c.pcs, ST.int), C(+c.m2.toFixed(3), ST.m2)]));
  sm.push([]);
  sm.push([C(T('Area = quantity x the largest face of the cut part (product of its two largest dimensions), in m².', 'المساحة = العدد × أكبر وجه للقطعة المقصوصة (حاصل أكبر بعدين)، بالمتر المربع.'), ST.mute)]);
  const s2 = sheetXml(sm, { widths: [34, 18, 16], rtl });

  /* 3 - Hardware */
  const hw = [[C(T('Item', 'البند'), ST.head), C(T('Qty', 'العدد'), ST.head), C(T('Item (other language)', 'البند (اللغة الأخرى)'), ST.head)]];
  hardware.forEach((h) => hw.push([C(ar ? h.ar : h.en), C(h.qty, ST.int), C(ar ? h.en : h.ar)]));
  if (!hardware.length) hw.push([C(T('No hardware', 'لا اكسسوارات'))]);
  const s3 = sheetXml(hw, { widths: [44, 9, 44], freeze: 1, rtl });

  /* 4 - Warnings */
  const wr = [[C('#', ST.head), C(T('Warning', 'التنبيه'), ST.head)]];
  warnings.forEach((w, i) => wr.push([C(i + 1, ST.int), C(ar ? w.ar : w.en, ST.wrap)]));
  if (!warnings.length) wr.push([C(null), C(T('No warnings - the design passes every check.', 'لا تنبيهات - التصميم يجتاز كل الفحوصات.'))]);
  const s4 = sheetXml(wr, { widths: [6, 110], freeze: 1, rtl });

  const defs = [
    ...(cover ? [{ name: T('Cover', 'الغلاف'), xml: cover.xml, draw: cover.draw }] : []),
    { name: names[0], xml: s1x, draw: proDraw }, { name: names[1], xml: s2 }, { name: names[2], xml: s3 }, { name: names[3], xml: s4 },
  ];
  const sheets = defs.map((d) => d.xml);
  const sheetNames = defs.map((d) => d.name);
  const cutIdx = cover ? 1 : 0;
  /* drawings: one part per sheet that has pictures; PNGs are shared (de-duplicated by content) under xl/media */
  const media = []; const mediaKey = new Map(); const drawFiles = []; const sheetRels = []; const drawIdx = [];
  const mediaIndex = (img) => { const k = `${img.length}:${crc32(img)}`; if (!mediaKey.has(k)) { mediaKey.set(k, media.length); media.push(img); } return mediaKey.get(k); };
  defs.forEach((d, si) => {
    if (!d.draw || !d.draw.anchors.length) return;
    const n = drawFiles.length / 2 + 1; const rel = new Map(); const rels = [];
    const anchors = d.draw.anchors.map((a, i) => {
      const mi = mediaIndex(a.img);
      if (!rel.has(mi)) { rel.set(mi, `rId${rel.size + 1}`); rels.push(`<Relationship Id="${rel.get(mi)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${mi + 1}.png"/>`); }
      return `<xdr:oneCellAnchor><xdr:from><xdr:col>${a.col}</xdr:col><xdr:colOff>${a.dx || 0}</xdr:colOff><xdr:row>${a.row}</xdr:row><xdr:rowOff>${a.dy || 0}</xdr:rowOff></xdr:from><xdr:ext cx="${a.cx}" cy="${a.cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="Picture ${i + 1}" descr="${esc(a.alt || '')}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${rel.get(mi)}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${a.cx}" cy="${a.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    }).join('');
    drawFiles.push({ name: `xl/drawings/drawing${n}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>` });
    drawFiles.push({ name: `xl/drawings/_rels/drawing${n}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>` });
    sheetRels.push({ name: `xl/worksheets/_rels/sheet${si + 1}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>` });
    drawIdx.push(n);
  });
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${media.length ? '<Default Extension="png" ContentType="image/png"/>' : ''}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}${drawIdx.map((n) => `<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>' },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(model.title)}</dc:title><dc:creator>${app}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${date.toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>` },
    { name: 'docProps/app.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>' + app + '</Application></Properties>' },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets>${sheetNames.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="${cutIdx}" hidden="1">'${esc(sheetNames[cutIdx])}'!$A$1:$${colName(filterColsN - 1)}$${filterRowsN}</definedName></definedNames></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: STYLES },
    ...sheets.map((x, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: x })),
    ...sheetRels, ...drawFiles,
    ...media.map((m, i) => ({ name: `xl/media/image${i + 1}.png`, data: m })),
  ];
  return { bytes: zipStore(files, date), sheets: sheetNames, files: files.map((f) => f.name), pictures: media.length };
}
