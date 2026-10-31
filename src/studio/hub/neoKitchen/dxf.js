/* =============================================================================
 * Neo Kitchen Designer - CNC DXF (AutoCAD R12 / AC1009 ASCII).
 * Layers: CARCASS, DOORS, DRILL, DIMS. Entities: LINE, CIRCLE, TEXT only
 * (everything R12 can read). Sheet 1 = front elevations, sheet 2 = every unique
 * panel laid flat with its drilling (cups, handle holes, pins, grooves, cut-outs).
 * ===========================================================================*/
import { buildBOM, panelDrill } from './cutlist';
import { elevationItems } from './geometry';
import { dxfKit } from './outputSettings';

export const DXF_LAYERS = [
  { name: 'CARCASS', color: 7 },
  { name: 'DOORS', color: 3 },
  { name: 'DRILL', color: 1 },
  { name: 'DIMS', color: 4 },
];
const FRONT_TYPES = new Set(['door', 'drawer', 'flip', 'glass', 'cover']);

/** [NEO-OUTPUT-UX34] `output` = { unit: mm | cm | in, precision }: every coordinate, radius, text height and label is written in that unit with the precision's decimals and
 * the header carries $INSUNITS (4 mm, 5 cm, 1 inch). Omitted = millimetres, 3 decimals, the legacy header (byte-identical). The model stays in mm. */
export function buildDXF(scene, bom = buildBOM(scene), output) {
  const K = dxfKit(output); const f = K.f;
  const ent = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ext = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  const line = (layer, x1, y1, x2, y2) => { ext(x1, y1); ext(x2, y2); ent.push('0', 'LINE', '8', layer, '10', f(x1), '20', f(y1), '30', '0.0', '11', f(x2), '21', f(y2), '31', '0.0'); };
  const rect = (layer, x, y, w, h) => { line(layer, x, y, x + w, y); line(layer, x + w, y, x + w, y + h); line(layer, x + w, y + h, x, y + h); line(layer, x, y + h, x, y); };
  const circle = (layer, x, y, r) => { ext(x - r, y - r); ext(x + r, y + r); ent.push('0', 'CIRCLE', '8', layer, '10', f(x), '20', f(y), '30', '0.0', '40', f(r)); };
  const text = (layer, x, y, h, s) => { ext(x, y); ent.push('0', 'TEXT', '8', layer, '10', f(x), '20', f(y), '30', '0.0', '40', f(h), '1', String(s).replace(/[^\x20-\x7e]/g, '?')); };
  const dimH = (x1, x2, y, label, th = 28) => { line('DIMS', x1, y, x2, y); line('DIMS', x1, y - 12, x1, y + 12); line('DIMS', x2, y - 12, x2, y + 12); text('DIMS', (x1 + x2) / 2 - String(label).length * th * 0.3, y - th - 8, th, label); };
  const dimV = (x, y1, y2, label, th = 28) => { line('DIMS', x, y1, x, y2); line('DIMS', x - 12, y1, x + 12, y1); line('DIMS', x - 12, y2, x + 12, y2); text('DIMS', x + 18, (y1 + y2) / 2, th, label); };

  /* --- sheet 1: elevations side by side --- */
  let ox = 0;
  let topY = 0;
  scene.runs.forEach((r) => {
    const items = elevationItems(scene, r.key);
    const H = Math.max(...r.units.map((x) => x.y0 + x.H), 0);
    topY = Math.max(topY, H);
    text('DIMS', ox, H + 120, 40, `${r.label.toUpperCase()}  ${K.label(r.L)}${K.suffix}`);
    items.forEach((it) => {
      const layer = FRONT_TYPES.has(it.type) ? 'DOORS' : 'CARCASS';
      if (it.type === 'open' || it.type === 'shelf') return;
      rect(layer, ox + it.u0, it.y0, it.u1 - it.u0, it.y1 - it.y0);
    });
    scene.hinges.filter((h) => r.units.some((x) => x.unit.id === h.unitId)).forEach((h) => circle('DRILL', ox + h.u, h.y, h.r));
    scene.handles.filter((h) => r.units.some((x) => x.unit.id === h.unitId)).forEach((h) => h.holes.forEach((p) => circle('DRILL', ox + p[0], p[1], 2.5)));
    // shelf pins (front column only)
    scene.pins.filter((p) => r.units.some((x) => x.unit.id === p.unitId) && p.d > 200).forEach((p) => circle('DRILL', ox + p.u, p.y, 2.5));
    // module dimensions along the base row and the wall row
    r.units.filter((x) => x.row === 'base').forEach((x) => dimH(ox + x.fu0, ox + x.fu0 + x.W, -60, K.label(x.W)));
    r.units.filter((x) => x.row === 'wall').forEach((x) => dimH(ox + x.fu0, ox + x.fu0 + x.W, H + 60, K.label(x.W)));
    dimH(ox, ox + r.L, -150, `${K.label(r.L)} total`);
    const g = scene.model.g;
    const hx = ox + r.L + 80;
    dimV(hx, 0, g.plinthH, K.raw(g.plinthH));
    dimV(hx, g.plinthH, g.plinthH + g.baseH, K.raw(g.baseH));
    dimV(hx, g.plinthH + g.baseH, g.plinthH + g.baseH + g.counterThk, K.raw(g.counterThk));
    dimV(hx + 160, 0, H, `${K.label(H)} overall`);
    ox += r.L + 700;
  });

  /* --- sheet 2: flat panels --- */
  let cx = 0, cy = -600, rowH = 0;
  const maxW = Math.max(6000, ox);
  const gap = 90;
  bom.rows.forEach((row) => {
    const p = row.rep;
    const dr = panelDrill(scene, p);
    const w = dr.L, h = dr.W;
    if (cx + w > maxW) { cx = 0; cy -= rowH + gap + 90; rowH = 0; }
    const y = cy - h;
    const layer = row.mat === 'Door' || row.mat === 'Glass' ? 'DOORS' : 'CARCASS';
    rect(layer, cx, y, w, h);
    dr.circles.forEach((c) => circle('DRILL', cx + c.x, y + c.y, c.r));
    dr.lines.forEach((l) => line('DRILL', cx + l.x1, y + l.y1, cx + l.x2, y + l.y2));
    text('DIMS', cx, y + h + 14, 24, `${row.name} ${K.raw(row.w)}x${K.raw(row.d)}x${K.raw(row.h)} x${row.qty}`);
    cx += w + gap; rowH = Math.max(rowH, h);
  });

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
  const out = [];
  const P = (...a) => out.push(...a.map(String));
  P('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', ...K.header, '9', '$INSBASE', '10', '0.0', '20', '0.0', '30', '0.0',
    '9', '$EXTMIN', '10', f(minX), '20', f(minY), '30', '0.0', '9', '$EXTMAX', '10', f(maxX), '20', f(maxY), '30', '0.0', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB',
    '0', 'TABLE', '2', 'LAYER', '70', String(DXF_LAYERS.length + 1), '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS');
  DXF_LAYERS.forEach((l) => P('0', 'LAYER', '2', l.name, '70', '0', '62', l.color, '6', 'CONTINUOUS'));
  P('0', 'ENDTAB', '0', 'TABLE', '2', 'STYLE', '70', '1', '0', 'STYLE', '2', 'STANDARD', '70', '0', '40', '0.0', '41', '1.0', '50', '0.0', '71', '0', '42', '2.5', '3', 'txt', '4', '', '0', 'ENDTAB', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'ENTITIES', ...ent, '0', 'ENDSEC', '0', 'EOF');
  return out.join('\n') + '\n';
}

/* ---- minimal DXF reader (used by the unit tests to validate the output) ------- */
export function parseDXF(txt) {
  const lines = txt.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length % 2) throw new Error('odd number of lines: group code / value pairs broken');
  const pairs = [];
  for (let i = 0; i < lines.length; i += 2) {
    const code = lines[i].trim();
    if (!/^-?\d+$/.test(code)) throw new Error(`bad group code "${code}" at line ${i + 1}`);
    pairs.push([+code, lines[i + 1]]);
  }
  const sections = {};
  let sec = null, item = null, hv = null;
  pairs.forEach(([c, v], i) => {
    if (c === 0 && v === 'SECTION') { sec = { name: pairs[i + 1][1], items: [], vars: {} }; item = null; hv = null; return; }
    if (c === 2 && i > 0 && pairs[i - 1][0] === 0 && pairs[i - 1][1] === 'SECTION') return;
    if (c === 0 && v === 'ENDSEC') { sections[sec.name] = sec; sec = null; item = null; hv = null; return; }
    if (c === 0 && v === 'EOF') return;
    if (!sec) return;
    if (c === 9) { hv = { name: v, g: {} }; sec.vars[v] = hv.g; return; }
    if (c === 0) { item = { type: v, g: {} }; hv = null; sec.items.push(item); return; }
    const target = item ? item.g : hv ? hv.g : null;
    if (target) (target[c] = target[c] || []).push(v);
  });
  const last = pairs[pairs.length - 1];
  return { pairs, sections, endsWithEOF: last[0] === 0 && last[1] === 'EOF' };
}
