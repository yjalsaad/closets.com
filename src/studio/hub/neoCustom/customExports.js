/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - the exports that are specific to a custom piece (pure, text out).
 *   buildCustomDXF   DXF R12 ("DXF Elevation" in the Export menu's More group): sheet 1 = FRONT / SIDE / TOP views with the overall dimensions and the part numbers,
 *                    sheet 2 = every unique cut part laid flat with its notches, rounded corners and holes.
 * The OBJ / STL / 3DM / xlsx / PDF / DXF cutting plan are the shared Neo writers reading the same scene and cut list (neoKitchen/*).
 * Layers: PANELS, FRONTS, GLASS, FRAME, DIMS, DRILL. Entities: LINE, CIRCLE, TEXT only (everything R12 reads).
 * ===========================================================================*/
import { viewRect, outlineOf } from './drawingMath';
import { dxfKit, quarterSegs, outOf } from '../neoKitchen/outputSettings';

export const CUSTOM_DXF_LAYERS = [
  { name: 'PANELS', color: 7 }, { name: 'FRONTS', color: 3 }, { name: 'GLASS', color: 5 }, { name: 'FRAME', color: 2 }, { name: 'DIMS', color: 4 }, { name: 'DRILL', color: 1 },
];
const layerOf = (p) => (p.type === 'door' || p.type === 'drawer' ? 'FRONTS' : p.type === 'glass' ? 'GLASS' : p.type === 'frame' ? 'FRAME' : 'PANELS');

/** [NEO-OUTPUT-UX34] `output` = { unit, precision }: everything is written in mm / cm / inch with the precision's decimals and $INSUNITS; a rounded corner is
 * 3 / 6 segments per quarter in draft / standard and ONE true ARC entity in ultra. Omitted = mm, 3 decimals, 6 segments (the legacy bytes). */
export function buildCustomDXF(built, output) {
  const { scene, solved, bom, design } = built;
  const K = dxfKit(output); const f = K.f;
  const trueArcs = !!output && outOf(output).precision === 'ultra'; const segs = quarterSegs(output);
  const dims = { w: scene.bounds.x1, h: scene.bounds.h, d: scene.bounds.z1 };
  const ent = [];
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const ext = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  const line = (layer, x1, y1, x2, y2) => { ext(x1, y1); ext(x2, y2); ent.push('0', 'LINE', '8', layer, '10', f(x1), '20', f(y1), '30', '0.0', '11', f(x2), '21', f(y2), '31', '0.0'); };
  const rect = (layer, x, y, w, h) => { line(layer, x, y, x + w, y); line(layer, x + w, y, x + w, y + h); line(layer, x + w, y + h, x, y + h); line(layer, x, y + h, x, y); };
  const arcE = (layer, x, y, r, a0, a1) => { ext(x - r, y - r); ext(x + r, y + r); ent.push('0', 'ARC', '8', layer, '10', f(x), '20', f(y), '30', '0.0', '40', f(r), '50', (a0).toFixed(3), '51', (a1).toFixed(3)); };
  const circle = (layer, x, y, r) => { ext(x - r, y - r); ext(x + r, y + r); ent.push('0', 'CIRCLE', '8', layer, '10', f(x), '20', f(y), '30', '0.0', '40', f(r)); };
  const text = (layer, x, y, h, s) => { ext(x, y); ent.push('0', 'TEXT', '8', layer, '10', f(x), '20', f(y), '30', '0.0', '40', f(h), '1', String(s).replace(/[^\x20-\x7e]/g, '?')); };
  const dimH = (x1, x2, y, label, th = 30) => { line('DIMS', x1, y, x2, y); line('DIMS', x1, y - 12, x1, y + 12); line('DIMS', x2, y - 12, x2, y + 12); text('DIMS', (x1 + x2) / 2 - String(label).length * th * 0.3, y - th - 8, th, label); };
  const dimV = (x, y1, y2, label, th = 30) => { line('DIMS', x, y1, x, y2); line('DIMS', x - 12, y1, x + 12, y1); line('DIMS', x - 12, y2, x + 12, y2); text('DIMS', x + 18, (y1 + y2) / 2, th, label); };
  const poly = (layer, pts, ox, oy) => { for (let i = 0; i < pts.length; i += 1) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; line(layer, ox + a[0], oy + a[1], ox + b[0], oy + b[1]); } };

  /* the outline with its rounded corners as true ARC entities: the polygon is in screen mm (y down), the sheet has W up, so y flips and the angles negate */
  const polyArcs = (layer, items, ox, oy, hh) => {
    const deg = (a) => { const d = ((a * 180) / Math.PI) % 360; return d < 0 ? d + 360 : d; };
    const nodes = items.map((q) => (q.arc
      ? { arc: q, s: [q.cx + q.r * Math.cos(q.a0), q.cy + q.r * Math.sin(q.a0)], e: [q.cx + q.r * Math.cos(q.a1), q.cy + q.r * Math.sin(q.a1)] }
      : { s: q, e: q }));
    nodes.forEach((n, i) => {
      const nx = nodes[(i + 1) % nodes.length];
      if (n.arc) arcE(layer, ox + n.arc.cx, oy + hh - n.arc.cy, n.arc.r, deg(-n.arc.a1), deg(-n.arc.a0));
      if (Math.abs(n.e[0] - nx.s[0]) > 1e-9 || Math.abs(n.e[1] - nx.s[1]) > 1e-9) line(layer, ox + n.e[0], oy + hh - n.e[1], ox + nx.s[0], oy + hh - nx.s[1]);
    });
  };

  /* ---- sheet 1: three views, y UP in the file (screen y is flipped) ---- */
  const G = Math.max(300, Math.max(dims.w, dims.h, dims.d) * 0.12);
  const origins = { front: [0, 0], side: [dims.w + G, 0], top: [0, -(G + dims.d)] };
  const th = Math.max(24, Math.max(dims.w, dims.h, dims.d) / 60);
  ['front', 'side', 'top'].forEach((view) => {
    const [ox, oy] = origins[view];
    const vh = view === 'front' ? dims.h : view === 'side' ? dims.h : dims.d; // view height
    const vw = view === 'side' ? dims.d : dims.w;
    text('DIMS', ox, oy + vh + th * 1.2, th * 1.2, view.toUpperCase());
    rect('DIMS', ox, oy, vw, vh);
    solved.items.filter((it) => it.part.type !== 'group' && it.part.type !== 'hardware').forEach((it) => {
      const r = viewRect(it.box, view, dims); // screen mm, y down
      const x0 = ox + r.x0; const x1 = ox + r.x1; const y0 = oy + vh - r.y1; const y1 = oy + vh - r.y0;
      const layer = layerOf(it.part);
      rect(layer, x0, y0, x1 - x0, y1 - y0);
      const no = scene.numbering.get(it.base);
      if (no && it.i === 0) text('DIMS', (x0 + x1) / 2 - th * 0.3, (y0 + y1) / 2 - th / 2, th, String(no));
    });
    if (view === 'front') { dimH(ox, ox + dims.w, oy - 90, `${K.label(dims.w)} W`); dimV(ox - 90, oy, oy + dims.h, `${K.label(dims.h)} H`); }
    if (view === 'side') dimH(ox, ox + dims.d, oy - 90, `${K.label(dims.d)} D`);
  });
  text('DIMS', 0, origins.top[1] - 160, th, `${design.title} - ${K.label(dims.w)} x ${K.label(dims.h)} x ${K.label(dims.d)}${K.suffix}`);

  /* ---- sheet 2: every unique cut part flat ---- */
  let cx = 0; let cy = origins.top[1] - 600; let rowH = 0;
  const maxW = Math.max(6000, dims.w * 2 + G);
  const gap = 90;
  bom.rows.forEach((row) => {
    const w = row.cut.L; const h = row.cut.W;
    if (cx + w > maxW) { cx = 0; cy -= rowH + gap + 90; rowH = 0; }
    const y = cy - h;
    const layer = row.mat === 'Door' ? 'FRONTS' : row.mat === 'Glass' ? 'GLASS' : row.mat === 'Timber' ? 'FRAME' : 'PANELS';
    const cuts = (row.rep && row.rep.cuts) || [];
    const o = cuts.length ? outlineOf({ x0: 0, x1: w, y0: 0, y1: h }, cuts.map((c) => (c.k === 'hole' ? null : c)).filter(Boolean), { segs, arcs: trueArcs }) : null;
    // the cut sheet has W up: the outline above is screen-style (y down), so flip it
    if (o && trueArcs) polyArcs(layer, o, cx, y, h); else if (o) poly(layer, o.map((p) => [p[0], h - p[1]]), cx, y); else rect(layer, cx, y, w, h);
    cuts.filter((c) => c.k === 'hole').forEach((c) => circle('DRILL', cx + c.x, y + c.y, c.d / 2));
    text('DIMS', cx, y + h + 14, 24, `${String(row.no).padStart(2, '0')} ${row.name} ${K.raw(row.w)}x${K.raw(row.d)}x${K.raw(row.h)} x${row.qty}`);
    cx += w + gap; rowH = Math.max(rowH, h);
  });

  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
  const out = [];
  const P = (...a) => out.push(...a.map(String));
  P('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', ...K.header, '9', '$INSBASE', '10', '0.0', '20', '0.0', '30', '0.0',
    '9', '$EXTMIN', '10', f(minX), '20', f(minY), '30', '0.0', '9', '$EXTMAX', '10', f(maxX), '20', f(maxY), '30', '0.0', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB',
    '0', 'TABLE', '2', 'LAYER', '70', String(CUSTOM_DXF_LAYERS.length + 1), '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS');
  CUSTOM_DXF_LAYERS.forEach((l) => P('0', 'LAYER', '2', l.name, '70', '0', '62', l.color, '6', 'CONTINUOUS'));
  P('0', 'ENDTAB', '0', 'TABLE', '2', 'STYLE', '70', '1', '0', 'STYLE', '2', 'STANDARD', '70', '0', '40', '0.0', '41', '1.0', '50', '0.0', '71', '0', '42', '2.5', '3', 'txt', '4', '', '0', 'ENDTAB', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC');
  P('0', 'SECTION', '2', 'ENTITIES', ...ent, '0', 'ENDSEC', '0', 'EOF');
  return `${out.join('\n')}\n`;
}
