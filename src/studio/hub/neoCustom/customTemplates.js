/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - starter templates (pure data).
 * A template is NOT a fixed preset: it is a set of ordinary parts with constraints (fill / align / equal spacing), so changing the overall size, a
 * thickness or any part keeps the piece consistent. Every template solves with no collision, no floating part and no envelope warning at its own
 * size and at the sizes in `SCALES` (tested). Nothing here is a price or a rate.
 * ===========================================================================*/
import { ax, normalizeDesign, DEFAULT_G } from './customModel';

const part = (id, type, name, x, y, z, extra = {}) => ({ id, type, name, x, y, z, ...extra });
const rep = (n, axis, mode = 'even') => ({ n, axis, mode });
const ALL4 = ['L1', 'L2', 'W1', 'W2'];

/* ---- table ---------------------------------------------------------------------------------------------------- */
const table = (w, h, d) => [
  part('p1', 'panel', 'Table top', ax('fill', 0, 0, 0), ax('max', 0, 30), ax('fill', 0, 0, 0), { eb: ALL4 }),
  part('p2', 'frame', 'Front leg', ax('min', 40, 70, 40), ax('fill', 0, 0, 0, 'p1'), ax('max', 40, 70), { rep: rep(2, 'x', 'edge') }),
  part('p3', 'frame', 'Rear leg', ax('min', 40, 70, 40), ax('fill', 0, 0, 0, 'p1'), ax('min', 40, 70), { rep: rep(2, 'x', 'edge') }),
  part('p4', 'frame', 'Front apron', ax('fill', 110, 0, 110), ax('before', 0, 90, 0, 'p1'), ax('max', 64, 22)),
  part('p5', 'frame', 'Rear apron', ax('fill', 110, 0, 110), ax('before', 0, 90, 0, 'p1'), ax('min', 64, 22)),
  part('p6', 'frame', 'Side apron', ax('min', 64, 22, 64), ax('before', 0, 90, 0, 'p1'), ax('fill', 110, 0, 110), { rep: rep(2, 'x', 'edge') }),
];

/* ---- bed ------------------------------------------------------------------------------------------------------ */
const bed = () => [
  part('p1', 'panel', 'Headboard', ax('fill', 0, 0, 0), ax('fill', 250, 0, 0), ax('min', 0, 40), { eb: ALL4 }),
  part('p2', 'panel', 'Side rail', ax('min', 0, 30, 0), ax('min', 250, 250), ax('fill', 40, 0, 40), { rep: rep(2, 'x', 'edge'), eb: ['L1'] }),
  part('p3', 'panel', 'Footboard', ax('fill', 30, 0, 30), ax('min', 250, 300), ax('max', 0, 40), { eb: ALL4 }),
  part('p4', 'frame', 'Rear leg', ax('min', 0, 60, 0), ax('min', 0, 250), ax('min', 0, 60), { rep: rep(2, 'x', 'edge') }),
  part('p5', 'frame', 'Front leg', ax('min', 0, 60, 0), ax('min', 0, 250), ax('max', 0, 60), { rep: rep(2, 'x', 'edge') }),
  part('p6', 'frame', 'Slat ledger', ax('min', 30, 30, 30), ax('min', 330, 40), ax('fill', 40, 0, 40), { rep: rep(2, 'x', 'edge') }),
  part('p7', 'frame', 'Slat', ax('fill', 35, 0, 35), ax('min', 370, 20), ax('fill', 60, 70, 60), { rep: { n: 14, axis: 'z', mode: 'even' }, grain: 'x' }),
];

/* ---- shelving unit -------------------------------------------------------------------------------------------- */
const shelving = () => [
  part('p1', 'panel', 'Side', ax('min', 0, 18, 0), ax('fill', 0, 0, 0), ax('fill', 0, 0, 0), { rep: rep(2, 'x', 'edge'), eb: ['L1'] }),
  part('p2', 'panel', 'Top', ax('fill', 18, 0, 18), ax('max', 0, 18), ax('fill', 8, 0, 0), { eb: ['L1'] }),
  part('p3', 'panel', 'Bottom', ax('fill', 18, 0, 18), ax('min', 60, 18), ax('fill', 8, 0, 0), { eb: ['L1'] }),
  part('p4', 'panel', 'Plinth', ax('fill', 18, 0, 18), ax('min', 0, 60), ax('min', 40, 22), { mat: 'plinth', eb: ['L1'] }),
  part('p5', 'back', 'Back', ax('fill', 18, 0, 18), ax('fill', 60, 0, 0), ax('min', 0, 8)),
  part('p6', 'shelf', 'Shelf', ax('fill', 18, 0, 18), ax('min', 78, 18, 18), ax('fill', 8, 0, 10), { rep: rep(4, 'y', 'even'), eb: ['L1'], fix: 'adjustable' }),
];

/* ---- console -------------------------------------------------------------------------------------------------- */
const consoleT = () => [
  part('p1', 'panel', 'Top', ax('fill', 0, 0, 0), ax('max', 0, 25), ax('fill', 0, 0, 0), { eb: ALL4 }),
  part('p2', 'panel', 'Side', ax('min', 0, 18, 0), ax('fill', 200, 0, 0, 'p1'), ax('fill', 0, 0, 0), { rep: rep(2, 'x', 'edge'), eb: ['L1'] }),
  part('p3', 'panel', 'Bottom', ax('fill', 18, 0, 18), ax('min', 200, 18), ax('fill', 8, 0, 0), { eb: ['L1'] }),
  part('p4', 'back', 'Back', ax('fill', 18, 0, 18), ax('fill', 200, 0, 0, 'p1'), ax('min', 0, 8)),
  part('p5', 'shelf', 'Shelf', ax('fill', 18, 0, 18), ax('min', 380, 25), ax('fill', 8, 0, 10), { eb: ['L1'] }),
  part('p6', 'drawer', 'Drawer', ax('fill', 18, 582, 18), ax('before', 0, 150, 0, 'p1'), ax('fill', 8, 0, 0), { rep: rep(2, 'x', 'edge') }),
  part('p7', 'frame', 'Front leg', ax('min', 0, 60, 0), ax('min', 0, 200), ax('max', 0, 60), { rep: rep(2, 'x', 'edge'), sec: 'round' }),
  part('p8', 'frame', 'Rear leg', ax('min', 0, 60, 0), ax('min', 0, 200), ax('min', 0, 60), { rep: rep(2, 'x', 'edge'), sec: 'round' }),
];

/* ---- bench ---------------------------------------------------------------------------------------------------- */
const bench = () => [
  part('p1', 'panel', 'Seat', ax('fill', 0, 0, 0), ax('max', 0, 30), ax('fill', 0, 0, 0), { eb: ALL4 }),
  part('p2', 'frame', 'Front leg', ax('min', 60, 50, 60), ax('fill', 0, 0, 0, 'p1'), ax('max', 40, 50), { rep: rep(2, 'x', 'edge'), sec: 'round' }),
  part('p3', 'frame', 'Rear leg', ax('min', 60, 50, 60), ax('fill', 0, 0, 0, 'p1'), ax('min', 40, 50), { rep: rep(2, 'x', 'edge'), sec: 'round' }),
  part('p4', 'frame', 'Front apron', ax('fill', 110, 0, 110), ax('before', 0, 70, 0, 'p1'), ax('max', 55, 20)),
  part('p5', 'frame', 'Rear apron', ax('fill', 110, 0, 110), ax('before', 0, 70, 0, 'p1'), ax('min', 55, 20)),
  part('p6', 'frame', 'Side stretcher', ax('min', 70, 30, 70), ax('min', 120, 40), ax('fill', 90, 0, 90), { rep: rep(2, 'x', 'edge') }),
];

/* ---- reception counter ---------------------------------------------------------------------------------------- */
const reception = () => [
  part('p1', 'panel', 'Counter top', ax('fill', 0, 0, 0), ax('max', 150, 40), ax('fill', 0, 0, 0), { eb: ALL4 }),
  part('p2', 'panel', 'End panel', ax('min', 0, 18, 0), ax('fill', 100, 0, 0, 'p1'), ax('fill', 0, 0, 0), { rep: rep(2, 'x', 'edge'), eb: ['L1'] }),
  part('p3', 'panel', 'Divider', ax('min', 468, 18), ax('fill', 118, 0, 0, 'p1'), ax('fill', 18, 0, 18), { eb: ['L1'] }),
  part('p4', 'panel', 'Front panel', ax('fill', 486, 0, 18), ax('fill', 100, 0, 0, 'p1'), ax('max', 0, 18), { eb: ALL4 }),
  part('p5', 'panel', 'Rear panel', ax('fill', 18, 0, 18), ax('fill', 100, 0, 0, 'p1'), ax('min', 0, 18), { eb: ['L1'] }),
  part('p6', 'panel', 'Bottom', ax('fill', 18, 0, 18), ax('min', 100, 18), ax('fill', 18, 0, 18), { eb: ['L1'] }),
  part('p7', 'panel', 'Plinth', ax('fill', 18, 0, 18), ax('min', 0, 100), ax('min', 60, 22), { mat: 'plinth', eb: ['L1'] }),
  part('p8', 'shelf', 'Shelf', ax('fill', 486, 0, 18), ax('min', 500, 25), ax('fill', 18, 0, 18), { eb: ['L1'] }),
  part('p9', 'group', 'Drawer unit', ax('min', 18, 450), ax('fill', 118, 0, 0, 'p1'), ax('fill', 18, 0, 0)),
  part('p10', 'drawer', 'Drawer', ax('fill', 0, 0, 0), ax('min', 0, 300), ax('fill', 0, 0, 0), { parent: 'p9', rep: rep(3, 'y', 'edge') }),
  part('p11', 'glass', 'Glass screen', ax('fill', 100, 0, 100), ax('after', 0, 150, 0, 'p1'), ax('max', 40, 8)),
];

/* ---- headboard ------------------------------------------------------------------------------------------------ */
const headboard = () => [
  part('p1', 'frame', 'Post', ax('min', 0, 60, 0), ax('fill', 0, 0, 0), ax('min', 0, 100), { rep: rep(2, 'x', 'edge') }),
  part('p2', 'panel', 'Back board', ax('fill', 60, 0, 60), ax('fill', 200, 0, 60), ax('min', 0, 30), { eb: ALL4 }),
  part('p3', 'panel', 'Padded panel', ax('fill', 80, 480, 80), ax('fill', 300, 0, 120), ax('min', 30, 60), { rep: rep(3, 'x', 'even'), eb: ALL4 }),
  part('p4', 'frame', 'Top rail', ax('fill', 60, 0, 60), ax('max', 0, 60), ax('min', 0, 100)),
];

/* ---- display unit --------------------------------------------------------------------------------------------- */
const display = () => [
  part('p1', 'panel', 'Side', ax('min', 0, 18, 0), ax('fill', 0, 0, 0), ax('fill', 0, 0, 18), { rep: rep(2, 'x', 'edge'), eb: ['L1'] }),
  part('p2', 'panel', 'Top', ax('fill', 18, 0, 18), ax('max', 0, 18), ax('fill', 8, 0, 18), { eb: ['L1'] }),
  part('p3', 'panel', 'Bottom', ax('fill', 18, 0, 18), ax('min', 100, 18), ax('fill', 8, 0, 18), { eb: ['L1'] }),
  part('p4', 'panel', 'Plinth', ax('fill', 18, 0, 18), ax('min', 0, 100), ax('min', 40, 22), { mat: 'plinth', eb: ['L1'] }),
  part('p5', 'back', 'Back', ax('fill', 18, 0, 18), ax('fill', 100, 0, 18), ax('min', 0, 8)),
  part('p6', 'panel', 'Cupboard top', ax('fill', 18, 0, 18), ax('min', 700, 18), ax('fill', 8, 0, 18), { eb: ['L1'] }),
  part('p7', 'door', 'Cupboard door', ax('min', 18, 430), ax('min', 118, 582), ax('max', 0, 18), { hinge: 'L', eb: ALL4 }),
  part('p8', 'door', 'Cupboard door', ax('max', 18, 430), ax('min', 118, 582), ax('max', 0, 18), { hinge: 'R', eb: ALL4 }),
  part('p9', 'glass', 'Glass shelf', ax('fill', 18, 0, 18), ax('min', 718, 8, 18), ax('fill', 8, 0, 30), { rep: rep(3, 'y', 'even') }),
  part('p10', 'glass', 'Glass front', ax('fill', 18, 0, 18), ax('fill', 718, 0, 18), ax('max', 0, 6)),
];

/** the starter templates: dims + the parts; names are bilingual (the part names themselves stay English data, the Arabic UI shows these) */
export const TEMPLATES = [
  { k: 'table', en: 'Table', ar: 'طاولة', dims: { w: 1600, h: 750, d: 850 }, title: 'Dining table', make: table },
  { k: 'bed', en: 'Bed', ar: 'سرير', dims: { w: 1700, h: 1100, d: 2150 }, title: 'Bed with headboard', make: bed },
  { k: 'shelving', en: 'Shelving unit', ar: 'وحدة رفوف', dims: { w: 800, h: 1800, d: 350 }, title: 'Shelving unit', make: shelving },
  { k: 'console', en: 'Console', ar: 'كونسول', dims: { w: 1200, h: 800, d: 350 }, title: 'Console with drawers', make: consoleT },
  { k: 'bench', en: 'Bench', ar: 'كرسي طويل', dims: { w: 1400, h: 450, d: 400 }, title: 'Bench', make: bench },
  { k: 'reception', en: 'Reception counter', ar: 'منضدة استقبال', dims: { w: 2400, h: 1250, d: 700 }, title: 'Reception counter', make: reception },
  { k: 'headboard', en: 'Headboard', ar: 'ظهر سرير', dims: { w: 1700, h: 1200, d: 120 }, title: 'Upholstered headboard', make: headboard },
  { k: 'display', en: 'Display unit', ar: 'وحدة عرض', dims: { w: 900, h: 1900, d: 400 }, title: 'Glass display unit', make: display },
];
export const TEMPLATE = Object.fromEntries(TEMPLATES.map((t) => [t.k, t]));
/** sizes each template is tested at, as fractions of its own size (the constraints must hold) */
export const SCALES = [[1, 1, 1], [1, 0.9, 1], [1, 1.1, 1.2], [1.25, 1, 1], [0.85, 1, 1]];
/** templates with fixed-width parts (drawers, doors) are scaled only where those parts still fit */
export const SCALES_FOR = { console: [[1, 1, 1], [1, 0.9, 1], [1, 1.1, 1.2], [1.25, 1, 1]], reception: [[1, 1, 1], [1, 1.1, 1.2], [1.25, 1, 1]], headboard: [[1, 1, 1], [1, 0.9, 1], [1, 1.1, 1.2], [1.25, 1, 1]], display: [[1, 1, 1], [1, 0.9, 1], [1, 1.1, 1.2]] };

/** a fresh design from a template; `dims` defaults to the template's own size */
export function fromTemplate(key, dims) {
  const t = TEMPLATE[key] || TEMPLATE.table;
  const d = dims || t.dims;
  return normalizeDesign({
    title: t.title, tpl: t.k, dims: d, g: DEFAULT_G, finishKey: 'oak',
    x: { handle: { style: 'bar', len: 128, pos: 'auto' } },
    parts: t.make(d.w, d.h, d.d),
  });
}
export const defaultDesign = () => fromTemplate('table');
