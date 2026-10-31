/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - price. Pure.
 * ALL RATES BELOW ARE PLACEHOLDERS (BHD): the owner has not supplied a door price list yet. Nothing here is a real supplier or workshop cost.
 * Every line is tagged `placeholder: true` and the studio, the quote hand-off and the exports say so. To use real rates, pass a `rates` object
 * with the same shape (or merge it over DEFAULT_RATES) - the engine never needs to change.
 * ===========================================================================*/
import { MAT } from './doorGeometry';

export const DEFAULT_RATES = {
  currency: 'BHD', placeholder: true, wastePct: 12,
  timberM3: { softwood: 380, hardwood: 780 }, // per m3 of finished timber
  sheetM2: { coreSolid: 18, coreHoney: 4, coreChip: 9, skinPaint: 5.5, skinVeneer: 14, skinLacquer: 9, skinLaminate: 11, skinMoulded: 12, mdf: 8, mdfVeneer: 16 }, // per m2 of sheet
  glassM2: { 6: 22, 8: 28, 10: 36 }, glassKindExtraM2: { clear: 0, frosted: 6, smoked: 8 }, laminatedExtraM2: 10,
  finishM2: { paint: 6, lacquer: 14, veneer: 4, laminate: 0.01 }, // spraying / clear coat per m2 of visible face
  hw: { hinge: 1.8, hingeBall: 3.5, hingeConcealed: 9, pivot: 14, lock: 8.5, cyl: 4.5, handle: 7.5, strike: 0.8, bolt: 2.2, closer: 28, sign: 1.2, seal: 1.6, grille: 6, track: 14, hanger: 11, guide: 3, stop: 2.5, pocket: 85, fix: 2.5 },
  labour: { leaf: 14, perHinge: 0.8, perLight: 1.2, frame: 10, architrave: 6, finishLeaf: 5 },
  fireUpliftPct: { FD30: 18, FD60: 35 },
  markupPct: 35, vatPct: 10,
};
const r3 = (v) => Math.round(v * 1000) / 1000;

export function priceDoor(d, W, rates = DEFAULT_RATES) {
  const R = rates; const lines = []; const waste = 1 + R.wastePct / 100;
  const add = (k, en, ar, qty, unit, rate) => { if (qty > 0 && rate > 0) lines.push({ k, en, ar, qty: Math.round(qty * 1000) / 1000, unit, rate, amount: r3(qty * rate), placeholder: true }); };
  const rows = W.bom.rows;
  const volOf = (f) => rows.filter(f).reduce((s, r) => s + r.vol, 0);
  add('timber', `Leaf timber (${d.leaf.timber})`, `خشب الضلفة (${d.leaf.timber === 'hardwood' ? 'صلب' : 'لين'})`, volOf((r) => r.mat === 'timber') * waste, 'm3', R.timberM3[d.leaf.timber]);
  add('frameTimber', `Frame + architrave timber (${d.leaf.timber})`, 'خشب الحلق والكورنيش', volOf((r) => r.mat === 'frame') * waste, 'm3', R.timberM3[d.leaf.timber]);
  Object.keys(R.sheetM2).forEach((m) => {
    const a = rows.filter((r) => r.mat === m).reduce((s, r) => s + r.area, 0);
    if (a > 0) add(`sheet-${m}`, `${MAT[m].en}`, MAT[m].ar, a * waste, 'm2', R.sheetM2[m]);
  });
  rows.filter((r) => r.mat === 'glass').forEach((r) => {
    const rate = (R.glassM2[d.glass.thk] || R.glassM2[6]) + (R.glassKindExtraM2[d.glass.kind] || 0) + (d.glass.safety === 'laminated' ? R.laminatedExtraM2 : 0);
    add(`glass-${r.no}`, `Glass ${r.L} x ${r.W} x ${r.T} (${d.glass.safety} ${d.glass.kind})`, `زجاج ${r.L} × ${r.W} × ${r.T}`, r.area, 'm2', rate);
  });
  const leafFace = (W.S.leafW * W.S.leafH) / 1e6 * 2 * W.S.n;
  const frameFace = rows.filter((r) => r.group === 'Frame' || r.group === 'Architrave').reduce((s, r) => s + r.area, 0);
  add('finish', `Finishing (${d.leaf.skin}), both faces + frame`, 'التشطيب، الوجهان والحلق', leafFace + frameFace, 'm2', R.finishM2[d.leaf.skin]);
  W.hardware.forEach((h) => {
    const key = h.k === 'hinge' ? (d.hinges.type === 'ball' ? 'hingeBall' : d.hinges.type === 'concealed' ? 'hingeConcealed' : d.hinges.type === 'pivot' ? 'pivot' : 'hinge') : h.k;
    add(`hw-${h.k}`, h.en, h.ar, h.qty, h.unit, R.hw[key]);
  });
  const lights = rows.filter((r) => r.mat === 'glass').reduce((s, r) => s + r.qty, 0);
  const L = R.labour;
  add('lab-leaf', 'Workshop labour: make the leaf', 'عمالة الورشة: تصنيع الضلفة', W.S.n, 'leaf', L.leaf);
  add('lab-finish', 'Workshop labour: finishing', 'عمالة الورشة: التشطيب', W.S.n, 'leaf', L.finishLeaf);
  add('lab-hinge', 'Labour: hinge mortices + hanging', 'عمالة: تجاويف المفصلات والتركيب', W.hingeCount * W.S.n, 'pc', L.perHinge);
  add('lab-glaze', 'Labour: glazing', 'عمالة: تركيب الزجاج', lights, 'light', L.perLight);
  if (W.S.frameOn) add('lab-frame', 'Labour: make + fit the frame', 'عمالة: تصنيع وتركيب الحلق', 1, 'set', L.frame);
  if (d.frame.arch.on) add('lab-arch', 'Labour: architrave', 'عمالة: الكورنيش', d.frame.arch.sides === 'one' ? 1 : 2, 'side', L.architrave);
  const sub = r3(lines.reduce((s, l) => s + l.amount, 0));
  const upl = R.fireUpliftPct[d.fire.rating] || 0;
  const uplift = r3((sub * upl) / 100);
  if (uplift > 0) lines.push({ k: 'fire', en: `Fire-rated build (${d.fire.rating}) allowance ${upl}%`, ar: `إضافة مقاومة الحريق (${d.fire.rating}) ${upl}%`, qty: 1, unit: 'lot', rate: uplift, amount: uplift, placeholder: true });
  const cost = r3(sub + uplift);
  const markup = r3((cost * R.markupPct) / 100);
  const net = r3(cost + markup);
  const vat = r3((net * R.vatPct) / 100);
  return { lines, cost, markup, markupPct: R.markupPct, net, vat, vatPct: R.vatPct, total: r3(net + vat), currency: R.currency, placeholder: true };
}

/** the groups of rates the owner must supply to replace the placeholders (shown in the studio and written in the PR) */
export const RATE_GROUPS = ['timberM3', 'sheetM2', 'glassM2', 'finishM2', 'hw', 'labour', 'fireUpliftPct', 'markupPct', 'vatPct', 'wastePct'];
