/* =============================================================================
 * Neo Kitchen Designer - CUTTING PLAN (nested sheets) + its DXF (AutoCAD R12 / AC1009 ASCII).
 *
 * nestBOM(bom, { sheetW, sheetH, kerf }) lays every piece of the BOM out on sheets of the board material
 * (one pool per production material name + thickness) with a simple SHELF (guillotine) packer:
 *   - pieces are the CUT sizes of the BOM (after the edge-band deduction): cut.L x cut.W
 *   - grain runs along the sheet LENGTH (X). BOM grain 'L' = grain along the cut length -> the piece keeps L along X;
 *     'W' = grain along the cut width -> the piece is turned so W runs along X; '-' = no grain, free to turn
 *   - kerf is the saw cut between neighbours (and between shelves); nothing is added at the sheet edges
 *   - Countertop and Glass are not sheet goods: listed in `skipped`; a piece bigger than the sheet in every allowed
 *     orientation is listed in `oversize`. Nothing is silently dropped.
 * Each BOM row expands to `qty` pieces, ids "<no>-<copy>".
 * DXF layers: SHEET (outline), PARTS (piece outlines), LABELS (id + size text), GRAIN (arrow along the grain),
 * NOTES (sheet title / usage). Units: mm. Sheets are placed side by side along X, 400 mm apart.
 * ===========================================================================*/
import { dxfKit } from './outputSettings';
import { qrPayload } from './docInfo';

export const SHEET_DEFAULT = { sheetW: 2800, sheetH: 2070, kerf: 4 };
export const SHEET_LIMITS = { sheet: [300, 6000], kerf: [0, 20] };
const NOT_SHEET = new Set(['Countertop', 'Glass', 'Timber']);

export function cleanSheet(o = {}) {
  const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  return {
    sheetW: num(o.sheetW, SHEET_DEFAULT.sheetW, ...SHEET_LIMITS.sheet),
    sheetH: num(o.sheetH, SHEET_DEFAULT.sheetH, ...SHEET_LIMITS.sheet),
    kerf: num(o.kerf, SHEET_DEFAULT.kerf, ...SHEET_LIMITS.kerf),
  };
}

/** pieces of the BOM that go on sheets */
export function expandPieces(bom) {
  const pieces = []; const skipped = [];
  bom.rows.forEach((r) => {
    if (NOT_SHEET.has(r.mat)) { skipped.push({ no: r.no, name: r.name, qty: r.qty, mat: r.mat, reason: r.mat === 'Glass' ? 'glass' : r.mat === 'Timber' ? 'solid timber' : 'worktop' }); return; }
    const L = r.cut.L, W = r.cut.W;
    // allowed orientations as [x extent, y extent]; grain along X
    const orients = r.grain === 'W' ? [[W, L]] : r.grain === 'L' ? [[L, W]] : [[Math.max(L, W), Math.min(L, W)], [Math.min(L, W), Math.max(L, W)]];
    for (let i = 1; i <= r.qty; i++) pieces.push({ id: `${String(r.no).padStart(2, '0')}-${i}`, no: r.no, name: r.name, mat: r.matName, thk: r.cut.T, grain: r.grain, L, W, orients, rotated: false });
  });
  return { pieces, skipped };
}

export function nestBOM(bom, opts = {}) {
  const { sheetW, sheetH, kerf } = cleanSheet(opts);
  const { pieces, skipped } = expandPieces(bom);
  const pools = new Map();
  pieces.forEach((p) => { const k = `${p.mat}|${p.thk}`; if (!pools.has(k)) pools.set(k, { key: k, material: p.mat, thk: p.thk, pieces: [] }); pools.get(k).pieces.push(p); });
  const oversize = [];
  const materials = [];
  pools.forEach((pool) => {
    const placed = []; const sheets = [];
    // sort: tallest (smaller side) first, then longest - the classic FFDH ordering
    const items = pool.pieces.map((p) => {
      const fit = p.orients.filter(([w, h]) => w <= sheetW && h <= sheetH);
      if (!fit.length) { oversize.push({ id: p.id, name: p.name, material: p.mat, L: p.L, W: p.W }); return null; }
      return { p, fit };
    }).filter(Boolean).sort((a, b) => Math.max(...b.fit.map((o) => o[1])) - Math.max(...a.fit.map((o) => o[1])) || b.p.L * b.p.W - a.p.L * a.p.W);
    items.forEach(({ p, fit }) => {
      let put = false;
      for (let si = 0; si < sheets.length && !put; si++) {
        const sh = sheets[si];
        for (let k = 0; k < sh.shelves.length && !put; k++) {
          const sf = sh.shelves[k];
          const o = fit.find(([w, h]) => h <= sf.h && sf.x + w <= sheetW);
          if (o) { place(sh, sf, p, o); put = true; }
        }
        if (!put) {
          const o = fit.filter(([w, h]) => sh.y + h <= sheetH).sort((a, b) => b[1] - a[1])[0];
          if (o) { const sf = { y: sh.y, h: o[1], x: 0 }; sh.shelves.push(sf); sh.y += o[1] + kerf; place(sh, sf, p, o); put = true; }
        }
      }
      if (!put) {
        const o = fit.slice().sort((a, b) => b[1] - a[1])[0];
        const sh = { index: sheets.length + 1, shelves: [], y: 0, parts: [] };
        sheets.push(sh);
        const sf = { y: 0, h: o[1], x: 0 }; sh.shelves.push(sf); sh.y = o[1] + kerf; place(sh, sf, p, o);
      }
    });
    function place(sh, sf, p, o) {
      const part = { id: p.id, no: p.no, name: p.name, x: sf.x, y: sf.y, w: o[0], h: o[1], grain: p.grain, rotated: o[0] !== p.L || o[1] !== p.W };
      sh.parts.push(part); placed.push(part); sf.x += o[0] + kerf;
    }
    if (!sheets.length) return; // every piece of this pool was oversize: they are in `oversize`, there is no sheet to draw
    const usedArea = placed.reduce((s, q) => s + q.w * q.h, 0);
    materials.push({
      material: pool.material, thk: pool.thk, sheetsCount: sheets.length,
      sheets: sheets.map((sh) => ({ index: sh.index, parts: sh.parts, used: sh.parts.reduce((s, q) => s + q.w * q.h, 0) / (sheetW * sheetH) })),
      pieces: placed.length, usedM2: usedArea / 1e6, sheetM2: (sheets.length * sheetW * sheetH) / 1e6, utilisation: sheets.length ? usedArea / (sheets.length * sheetW * sheetH) : 0,
    });
  });
  return { sheetW, sheetH, kerf, materials, skipped, oversize, pieceCount: pieces.length - oversize.length, totalSheets: materials.reduce((s, m) => s + m.sheetsCount, 0) };
}

/* ---------------- DXF ---------------- */
export const PLAN_LAYERS = [
  { name: 'SHEET', color: 7 }, { name: 'PARTS', color: 3 }, { name: 'LABELS', color: 4 }, { name: 'GRAIN', color: 8 }, { name: 'NOTES', color: 2 },
];
const ascii = (s) => String(s).replace(/[^\x20-\x7e]/g, '?');

/** [NEO-OUTPUT-UX34] `output` = { unit, precision }: sheets, parts and labels are written in mm / cm / inch (the nesting itself is always solved in mm); omitted = mm, 3 decimals (the legacy bytes).
 * `doc` ({ project, company, opts }, optional) writes the title-block facts as NOTES text above the first sheet (ASCII only: DXF R12 text) */
export function buildPlanDXF(nest, { title = 'Kitchen', doc, output } = {}) {
  const K = dxfKit(output); const f3 = K.f; const u = K.present ? K.unit : 'mm';
  const r1 = K.r1;
  const ent = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ext = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  const line = (layer, x1, y1, x2, y2) => { ext(x1, y1); ext(x2, y2); ent.push('0', 'LINE', '8', layer, '10', f3(x1), '20', f3(y1), '30', '0.0', '11', f3(x2), '21', f3(y2), '31', '0.0'); };
  const rect = (layer, x, y, w, h) => { line(layer, x, y, x + w, y); line(layer, x + w, y, x + w, y + h); line(layer, x + w, y + h, x, y + h); line(layer, x, y + h, x, y); };
  const text = (layer, x, y, h, s) => { ext(x, y); ent.push('0', 'TEXT', '8', layer, '10', f3(x), '20', f3(y), '30', '0.0', '40', f3(h), '1', ascii(s)); };
  const { sheetW, sheetH } = nest;
  let ox = 0;
  nest.materials.forEach((m) => {
    m.sheets.forEach((sh) => {
      rect('SHEET', ox, 0, sheetW, sheetH);
      text('NOTES', ox, sheetH + 60, 40, `${m.material} ${K.raw(m.thk)}${u}  sheet ${sh.index}/${m.sheetsCount}  ${K.raw(sheetW)}x${K.raw(sheetH)}  used ${(sh.used * 100).toFixed(1)}%  - ${title}`);
      sh.parts.forEach((q) => {
        rect('PARTS', ox + q.x, q.y, q.w, q.h);
        const th = Math.max(8, Math.min(24, q.h / 3, q.w / 8));
        text('LABELS', ox + q.x + 6, q.y + q.h / 2 + 2, th, `${q.id}`);
        text('LABELS', ox + q.x + 6, q.y + q.h / 2 - th - 4, th * 0.8, `${r1(q.w)}x${r1(q.h)}${q.grain && q.grain !== '-' ? ' G' : ''}`);
        if (q.grain && q.grain !== '-') { const gy = q.y + q.h - 10; line('GRAIN', ox + q.x + q.w * 0.2, gy, ox + q.x + q.w * 0.8, gy); line('GRAIN', ox + q.x + q.w * 0.8, gy, ox + q.x + q.w * 0.8 - 12, gy + 5); line('GRAIN', ox + q.x + q.w * 0.8, gy, ox + q.x + q.w * 0.8 - 12, gy - 5); }
      });
      ox += sheetW + 400;
    });
  });
  if (doc && nest.materials.length) {
    const P = doc.project; const C = doc.company; const O = doc.opts;
    const lines = [
      C.name, [C.address, C.phone, C.email, C.cr ? `CR ${C.cr}` : ''].filter(Boolean).join(' | '),
      `PROJECT: ${P.project || title}`, [P.customer && `CUSTOMER: ${P.customer}`, P.customerPhone].filter(Boolean).join(' '), [P.orderNo && `ORDER: ${P.orderNo}`, P.jobNo && `JOB: ${P.jobNo}`].filter(Boolean).join('  '),
      P.siteAddress && `SITE: ${P.siteAddress}`, [P.designer && `DESIGNER: ${P.designer}`, P.salesRep && `SALES: ${P.salesRep}`].filter(Boolean).join('  '),
      `REV: ${P.revision || '-'}  DATE: ${P.date || ''}${P.deliveryDate ? `  DELIVERY: ${P.deliveryDate}` : ''}  SCALE: ${O.scale}`, P.materialSpec && `MATERIAL: ${P.materialSpec}`, P.notes && `NOTES: ${P.notes}`,
      `QR: ${qrPayload(O.qrKind, P, null)}`,
    ].filter((x) => x && String(x).trim());
    lines.forEach((ln, i) => text('NOTES', 0, sheetH + 170 + (lines.length - 1 - i) * 56, 36, String(ln).slice(0, 160)));
  }
  if (nest.skipped.length || nest.oversize.length) {
    let ny = -120;
    nest.skipped.forEach((s) => { text('NOTES', 0, ny, 32, `NOT NESTED (${s.reason}): ${s.name} x${s.qty}`); ny -= 50; });
    nest.oversize.forEach((s) => { text('NOTES', 0, ny, 32, `OVERSIZE (does not fit ${K.raw(sheetW)}x${K.raw(sheetH)}): ${s.id} ${s.name} ${K.raw(s.L)}x${K.raw(s.W)}`); ny -= 50; });
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
  const out = [];
  const P = (...a) => out.push(...a.map(String));
  P('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', ...K.header, '9', '$INSBASE', '10', '0.0', '20', '0.0', '30', '0.0',
    '9', '$EXTMIN', '10', f3(minX), '20', f3(minY), '30', '0.0', '9', '$EXTMAX', '10', f3(maxX), '20', f3(maxY), '30', '0.0', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB',
    '0', 'TABLE', '2', 'LAYER', '70', String(PLAN_LAYERS.length + 1), '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS');
  PLAN_LAYERS.forEach((l) => P('0', 'LAYER', '2', l.name, '70', '0', '62', l.color, '6', 'CONTINUOUS'));
  P('0', 'ENDTAB', '0', 'TABLE', '2', 'STYLE', '70', '1', '0', 'STYLE', '2', 'STANDARD', '70', '0', '40', '0.0', '41', '1.0', '50', '0.0', '71', '0', '42', '2.5', '3', 'txt', '4', '', '0', 'ENDTAB', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'ENTITIES', ...ent, '0', 'ENDSEC', '0', 'EOF');
  return out.join('\n') + '\n';
}

/* ---- remembered sheet settings (a per-viewer convenience; the export never depends on it) ---- */
const KEY = 'neoKitchen.cutplan.v1';
export function loadSheet() { try { return cleanSheet(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return cleanSheet(); } }
export function saveSheet(o) { try { localStorage.setItem(KEY, JSON.stringify(cleanSheet(o))); } catch (e) { /* ignore */ } }
