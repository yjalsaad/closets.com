/* =============================================================================
 * Neo Kitchen Designer - PDF Production Report: the DATA of the report (PdfReportSheet.jsx renders it).
 * Every number is the one the Cutting List screen shows (bom / bomData): pieces, board m2, unique parts, material
 * cards, rows, hardware, warnings. Nothing is recomputed here except the cover facts (layout, overall size, date).
 * ===========================================================================*/
import { layoutName } from './model';
import { BOARD, FINISHES, COUNTERS } from './constants';
import { partNameAr, noteAr, noteEn } from './cutlist';
import { productNoun, productInfo } from './productInfo';
import { dimText, unitLabel } from './outputSettings';

export const LAYOUT_LABEL = {
  straight: ['Single wall', 'جدار واحد'], 'l-left': ['L-shape (left leg)', 'حرف L (ساق يسار)'], 'l-right': ['L-shape (right leg)', 'حرف L (ساق يمين)'], u: ['U-shape', 'حرف U'],
  galley: ['Galley (two parallel runs)', 'مطبخ ممر (صفّان متوازيان)'], peninsula: ['Peninsula (wall run + open return)', 'جزيرة ممتدة (صف جداري + امتداد مفتوح)'], island: ['Island (freestanding run)', 'جزيرة (صف حر)'],
};

/** a wardrobe's second run is a return wing, not a kitchen leg */
export const WARDROBE_LAYOUT_LABEL = {
  straight: ['Straight', 'مستقيم'], 'l-left': ['L-shape (return wing on the left)', 'حرف L (جناح جانبي يسار)'], 'l-right': ['L-shape (return wing on the right)', 'حرف L (جناح جانبي يمين)'], u: ['U-shape', 'حرف U'],
};

/** cover facts: project name, date, layout, overall size (W x D x H of the whole kitchen, mm), finish, worktop */
/** `output` (optional, [NEO-OUTPUT-UX34]): the overall size is written in that unit; omitted = millimetres (legacy text) */
export function reportMeta(model, scene, { lang = 'en', date = new Date(), product, output } = {}) {
  const ar = lang === 'ar';
  const b = scene.bounds;
  const lay = product === 'custom' && model.customLabel ? model.customLabel : ((productInfo(product) && productInfo(product).layoutLabel) || (product === 'wardrobe' ? WARDROBE_LAYOUT_LABEL : LAYOUT_LABEL))[layoutName(model)] || LAYOUT_LABEL.straight; // custom furniture: the piece's own name is the "layout"
  const W = Math.round(b.x1 - b.x0), D = Math.round(b.z1 - b.z0), H = Math.round(b.h);
  return {
    title: model.title || productNoun(product, ar),
    date: date.toLocaleDateString(ar ? 'ar-BH-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
    dateIso: date.toISOString().slice(0, 10),
    layout: ar ? lay[1] : lay[0],
    overall: output ? `${dimText(W, output)} × ${dimText(D, output)} × ${dimText(H, output)} ${unitLabel(output.unit, 'en')}` : `${W} × ${D} × ${H} mm`,
    overallMm: { w: W, d: D, h: H },
    finish: (FINISHES[model.finish] || FINISHES.white)[lang],
    counter: (COUNTERS[model.counter] || COUNTERS.marble)[lang],
  };
}

/** the numbers + rows of the report, straight from the cut list */
export function reportData({ model, scene, bom, hardware, warnings, lang = 'en', date, product, output }) {
  const ar = lang === 'ar';
  return {
    meta: reportMeta(model, scene, { lang, date, product, output }),
    metrics: { pieces: bom.pieces, boardM2: bom.boardArea, unique: bom.unique, edgeMetres: bom.edgeMetres },
    cards: bom.cards.map((c) => ({ k: c.k, label: BOARD[c.k][lang], pcs: c.pcs, m2: c.m2 })),
    named: Object.keys(bom.named).map((k) => ({ name: k, pcs: bom.named[k].pcs, m2: bom.named[k].m2 })),
    warnings: warnings.map((w) => ({ id: w.id, text: w[lang] })),
    rows: bom.rows.map((r) => ({
      no: r.no, name: ar ? (r.nameAr || partNameAr(r.name)) : r.name, w: r.w, d: r.d, h: r.h, qty: r.qty, area: r.area,
      material: r.matName === BOARD[r.mat].en ? BOARD[r.mat][lang] : r.matName, grain: r.grain, edges: r.edges, cut: r.cut, note: ar ? (r.noteAr || noteAr(r.note)) : noteEn(r.note),
    })),
    hardware: hardware.map((h) => ({ k: h.k, text: h[lang], qty: h.qty })),
    runs: scene.runs.map((r) => ({ key: r.key, label: r.label, L: r.L })),
  };
}
