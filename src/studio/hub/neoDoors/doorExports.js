/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - export writers. Pure: each returns a string; the studio downloads it.
 *   buildDoorDXF  AutoCAD R12 ASCII, one drawing per leaf in millimetres: front view (seen from outside) with panels, glass, bores and hinge
 *                 recesses, then the hinge-edge view (hinge mortises) and the lock-edge view (lock mortise + forend). Layers:
 *                 OUTLINE, PANELS, GLASS, HINGE, LOCK, BORES, ANNOT. LINE / CIRCLE / TEXT only (everything R12 reads).
 *   doorCSV       the cut list. doorOBJ  the closed door as boxes (Y up, millimetres). doorMachining  the operations list the DXF draws.
 * ===========================================================================*/
import { C } from './doorModel';
import { cellKind } from './doorGeometry';
import { dxfKit, dimNumber, dimText, outOf, isDefaultOutput, UNIT_INFO } from '../neoKitchen/outputSettings';

const f = (n) => (Math.round(n * 1000) / 1000).toFixed(3);
export const HINGE_RECESS = { butt: { w: 32, d: 3 }, ball: { w: 34, d: 3.5 }, concealed: { w: 32, d: 14 }, pivot: { w: 60, d: 12 } };

/** every machining operation of one leaf, in leaf-local millimetres (the DXF draws exactly these) */
export function doorMachining(d, W, li = 0) {
  const lf = W.leaves[li]; const S = W.S; const ops = [];
  const hy = d.lock.handleH - S.y0;
  if (!S.slides) {
    const rc = HINGE_RECESS[d.hinges.type];
    W.scene.hingeYs.forEach((y, i) => ops.push({ op: 'hinge', n: i + 1, edge: lf.hingeSide, y, len: d.hinges.type === 'pivot' ? 0 : d.hinges.len, w: rc.w, depth: rc.d }));
  }
  if (lf.hasLock) {
    const lx = lf.lockSide === 'left' ? d.lock.backset : S.leafW - d.lock.backset;
    ops.push({ op: 'lock-mortise', edge: lf.lockSide, y: hy, h: C.CASE_H, t: C.CASE_T, depth: d.lock.backset + 30 });
    if (d.lock.handle === 'lever' || d.lock.handle === 'knob') ops.push({ op: 'spindle-bore', x: lx, y: hy, dia: C.SPINDLE_BORE });
    if (d.lock.cyl) ops.push({ op: 'cylinder-bore', x: lx, y: hy - C.CYL_DROP, dia: C.CYL_BORE });
    if (d.lock.handle === 'pull') [-C.PULL_SPACING / 2, C.PULL_SPACING / 2].forEach((o, i) => ops.push({ op: 'pull-bore', n: i + 1, x: lx, y: hy + o, dia: 8 }));
  }
  if (W.apertures.vision) { const v = W.apertures.vision; ops.push({ op: 'vision-cutout', x0: v.x0, x1: v.x1, y0: v.y0, y1: v.y1 }); }
  if (W.apertures.grille) { const g = W.apertures.grille; ops.push({ op: 'grille-cutout', x0: g.x0, x1: g.x1, y0: g.y0, y1: g.y1 }); }
  return ops;
}

/** [NEO-OUTPUT-UX34] `output` = { unit, precision }: coordinates, text and labels in mm / cm / inch, $INSUNITS 4 / 5 / 1, decimals by precision; omitted = mm, 3 decimals (legacy bytes).
 * Every hole and bore stays a true CIRCLE entity at every precision; a door has no curved outline. */
export function buildDoorDXF(d, W, output) {
  const K = dxfKit(output); const f = K.f;
  const ent = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ext = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  const line = (layer, x1, y1, x2, y2) => { ext(x1, y1); ext(x2, y2); ent.push('0', 'LINE', '8', layer, '10', f(x1), '20', f(y1), '30', '0.0', '11', f(x2), '21', f(y2), '31', '0.0'); };
  const rect = (layer, x, y, w, h) => { line(layer, x, y, x + w, y); line(layer, x + w, y, x + w, y + h); line(layer, x + w, y + h, x, y + h); line(layer, x, y + h, x, y); };
  const circle = (layer, x, y, r) => { ext(x - r, y - r); ext(x + r, y + r); ent.push('0', 'CIRCLE', '8', layer, '10', f(x), '20', f(y), '30', '0.0', '40', f(r)); };
  const text = (layer, x, y, h, s) => { ext(x, y); ent.push('0', 'TEXT', '8', layer, '10', f(x), '20', f(y), '30', '0.0', '40', f(h), '1', String(s).replace(/[^\x20-\x7e]/g, '?')); };
  const g = W.grid;
  let ox = 0;
  W.leaves.forEach((lf, li) => {
    const lw = lf.w; const lh = lf.h; const T = lf.t;
    const ops = doorMachining(d, W, li);
    text('ANNOT', ox, lh + 160, 40, `${d.title || 'Door'} - leaf ${li + 1} of ${W.leaves.length} - ${d.type.toUpperCase()}`);
    text('ANNOT', ox, lh + 100, 28, `Leaf ${K.raw(lw)} x ${K.raw(lh)} x ${K.raw(T)}${K.suffix}  |  seen from outside  |  ${lf.hingeSide === 'left' ? 'LH' : 'RH'} hinges ${lf.hingeSide}`);
    /* front view */
    rect('OUTLINE', ox, 0, lw, lh);
    if (g) {
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
        const k = cellKind(d, r);
        rect(k === 'glass' ? 'GLASS' : 'PANELS', ox + g.xs[c], g.ys[r].y0, g.colW, g.rowH);
      }
    }
    W.scene.parts.filter((p) => p.leaf === li && p.kind === 'glass' && p.bom).forEach((p) => { const b = p.boxes[0]; rect('GLASS', ox + b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); });
    ops.forEach((o) => {
      if (o.op === 'hinge') { const x0 = o.edge === 'left' ? 0 : lw - o.depth; if (o.len) rect('HINGE', ox + x0, o.y - o.len / 2, o.depth, o.len); else circle('HINGE', ox + (o.edge === 'left' ? 30 : lw - 30), o.y, 12); text('ANNOT', ox + (o.edge === 'left' ? 14 : lw - 150), o.y - 6, 14, `H${o.n} y=${f(o.y)}`); }
      if (o.op === 'spindle-bore' || o.op === 'cylinder-bore' || o.op === 'pull-bore') { circle('BORES', ox + o.x, o.y, o.dia / 2); text('ANNOT', ox + o.x + o.dia, o.y - 6, 14, `dia ${K.raw(o.dia)}`); }
      if (o.op === 'lock-mortise') { const x0 = o.edge === 'left' ? 0 : lw - o.depth; rect('LOCK', ox + x0, o.y - o.h / 2, o.depth, o.h); }
      if (o.op === 'vision-cutout' || o.op === 'grille-cutout') rect('GLASS', ox + o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
    });
    /* hinge-edge view and lock-edge view (thickness across, height up) */
    const ex = ox + lw + 200; const lx = ex + T + 200;
    text('ANNOT', ex, lh + 30, 24, 'HINGE EDGE'); text('ANNOT', lx, lh + 30, 24, 'LOCK EDGE');
    rect('OUTLINE', ex, 0, T, lh); rect('OUTLINE', lx, 0, T, lh);
    ops.forEach((o) => {
      if (o.op === 'hinge' && o.len) rect('HINGE', ex + (T - o.w) / 2, o.y - o.len / 2, o.w, o.len);
      if (o.op === 'lock-mortise') { rect('LOCK', lx + (T - o.t) / 2, o.y - o.h / 2, o.t, o.h); rect('LOCK', lx + (T - 24) / 2, o.y - 117.5, 24, 235); text('ANNOT', lx + T + 20, o.y, 18, `mortice ${K.raw(o.t)} x ${K.raw(o.h)} x ${K.raw(o.depth)} deep`); }
    });
    /* simple dimensions */
    line('ANNOT', ox, -60, ox + lw, -60); line('ANNOT', ox, -72, ox, -48); line('ANNOT', ox + lw, -72, ox + lw, -48); text('ANNOT', ox + lw / 2 - 40, -110, 28, K.present ? K.label(lw) : f(lw).replace('.000', ''));
    line('ANNOT', ox - 60, 0, ox - 60, lh); line('ANNOT', ox - 72, 0, ox - 48, 0); line('ANNOT', ox - 72, lh, ox - 48, lh); text('ANNOT', ox - 200, lh / 2, 28, K.present ? K.label(lh) : f(lh).replace('.000', ''));
    ox = lx + T + 700;
  });
  const layers = [['OUTLINE', 7], ['PANELS', 3], ['GLASS', 5], ['HINGE', 1], ['LOCK', 2], ['BORES', 6], ['ANNOT', 4]];
  const out = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', String(K.code), '9', '$EXTMIN', '10', f(minX), '20', f(minY), '9', '$EXTMAX', '10', f(maxX), '20', f(maxY), '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(layers.length)];
  layers.forEach(([n, c]) => out.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', 'CONTINUOUS'));
  out.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...ent, '0', 'ENDSEC', '0', 'EOF');
  return `${out.join('\n')}\n`;
}

const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** [NEO-OUTPUT-UX34] `output`: L / W / T in the chosen unit (the header names the unit when it is not mm), rounded by the precision; omitted = the legacy mm columns */
export function doorCSV(d, W, output) {
  const o = outOf(output); const tag = output && o.unit !== 'mm' ? ` (${UNIT_INFO[o.unit].en})` : ''; const v = (x) => (output ? dimNumber(x, o) : x);
  const head = ['#', 'Group', 'Part', `L${tag}`, `W${tag}`, `T${tag}`, 'Qty', 'Material', 'Grain', 'm2', 'Note'];
  const rows = W.bom.rows.map((r) => [r.no, r.group, r.name, v(r.L), v(r.W), v(r.T), r.qty, r.matName, r.grain, r.area.toFixed(3), r.note]);
  const hw = W.hardware.map((h, i) => ['H' + (i + 1), 'Hardware', h.en, '', '', '', h.qty, h.unit, '', '', h.note]);
  return '﻿' + [head, ...rows, ...hw].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** the price lines as CSV (placeholder rates are marked on every line) */
export function priceCSV(W) {
  const head = ['Item', 'Qty', 'Unit', 'Rate (BHD)', 'Amount (BHD)', 'Rate status'];
  const rows = W.price.lines.map((l) => [l.en, l.qty, l.unit, l.rate, l.amount.toFixed(3), 'PLACEHOLDER - owner to supply']);
  return '﻿' + [head, ...rows, ['Cost', '', '', '', W.price.cost.toFixed(3), ''], ['Total incl. VAT', '', '', '', W.price.total.toFixed(3), 'PLACEHOLDER']].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** the closed door as a Wavefront OBJ: one group per part, millimetres, Y up (x across, z through the wall) */
export function doorOBJ(d, W, output) {
  const O = outOf(output); const k = output ? 1 / UNIT_INFO[O.unit].factor : 1;
  const g = (n) => (isDefaultOutput(output) ? f(n) : String(Math.round(n * k * 10 ** 4) / 10 ** 4)); // default (mm, standard): the legacy 3-decimal text
  const L = [`# Neo Doors Designer - closed door, ${UNIT_INFO[O.unit].obj}, Y up`, `# ${d.title}`];
  let vi = 1;
  W.scene.parts.forEach((p) => {
    const lf = p.leaf == null ? null : W.leaves[p.leaf];
    L.push(`g ${p.id}`);
    p.boxes.forEach((b) => {
      const ox = lf ? lf.x0 : 0; const oy = lf ? lf.y0 : 0; const oz = lf ? lf.z0 : 0;
      const x0 = b.x0 + ox, x1 = b.x1 + ox, y0 = b.y0 + oy, y1 = b.y1 + oy, z0 = b.z0 + oz, z1 = b.z1 + oz;
      [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].forEach((v) => L.push(`v ${g(v[0])} ${g(v[1])} ${g(v[2])}`));
      [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]].forEach((q) => L.push(`f ${q.map((i) => vi + i).join(' ')}`));
      vi += 8;
    });
  });
  return `${L.join('\n')}\n`;
}

/** a short plain-text job card (the hand-off note that rides with the quote) */
export function doorSummary(d, W, lang = 'en', output) { // [NEO-OUTPUT-UX34] `output` (optional): the sizes in the note follow the Output unit (omitted = millimetres)
  const S = W.S; const ar = lang === 'ar';
  const T = (en, a) => (ar ? a : en);
  const u = output ? ` ${UNIT_INFO[outOf(output).unit].en}` : ' mm'; const v = (x) => (output ? dimText(x, output) : x);
  return [
    `${d.title} - ${T('door set', 'طقم باب')}`,
    `${T('Opening', 'الفتحة')}: ${v(S.OW)} x ${v(S.OH)}${u}, ${T('wall', 'الجدار')} ${v(S.wall)}${u}`,
    `${T('Leaf', 'الضلفة')}: ${v(S.leafW)} x ${v(S.leafH)} x ${v(S.T)}${u}${S.n > 1 ? ` x ${S.n}` : ''}`,
    `${T('Hinges', 'المفصلات')}: ${W.hingeCount} ${d.hinges.type}, ${T('swing', 'الفتح')} ${d.swing.dir}, ${T('hand', 'اليد')} ${d.swing.hand}`,
    `${T('Fire', 'الحريق')}: ${d.fire.rating}`,
    `${T('Weight', 'الوزن')}: ${W.weight.join(' / ')} kg`,
  ].join('\n');
}
