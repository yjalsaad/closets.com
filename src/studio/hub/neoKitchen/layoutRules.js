/* =============================================================================
 * Neo Kitchen Designer - layout rules (NEO-KITCHEN-UX29). Pure: model in, a list of
 *   { id, level: 'error' | 'warn' | 'info', en, ar }
 * out. Used by the layout screens (IssueList), the Global layout card and the Cut List warnings.
 * Rules (all numbers are the ones in constants.js XL, documented in DESIGN.md):
 *   galley    aisle between the two worktop fronts 1000-1500 mm (work aisle); run 2 >= 1200 mm
 *   island    clearance from the main run worktop front 900-1200 mm; island >= 900 mm long
 *   peninsula projection >= 600 mm beyond the main run
 *   seating   overhang <= 300 mm unsupported; 300-450 mm needs brackets (hardware line added); > 450 mm needs legs / posts
 *   U-shape   clear space between the two legs >= 1000 mm
 * ===========================================================================*/
import { XL } from './constants';
import { xlKind, rowWidth, runDepth, penProjection } from './model';

const mm = (v) => `${Math.round(v)} mm`;

/** worktop front of a run seen from its back wall (mm) */
export const worktopFront = (model, rk) => runDepth(model, rk) + model.g.doorThk + model.g.overhang;
/** clear space between the two leg worktop fronts of a U (mm) */
export function uClearSpan(model) {
  return rowWidth(model.runs.main.base) - worktopFront(model, 'left') - worktopFront(model, 'right');
}

export function seatingIssues(model, name) {
  const xl = model.xl; const out = [];
  if (!xl || !xl.seatOn) return out;
  const d = xl.seatD;
  if (d > 450) out.push({ id: `seat-legs-${name}`, level: 'warn', en: `${name}: a ${mm(d)} seating overhang is too deep for brackets - add legs or posts under the worktop.`, ar: `${name}: بروز الجلوس ${mm(d)} أعمق من أن تحمله الكوابيل - أضف أرجلاً أو أعمدة تحت السطح.` });
  else if (d > XL.seat.supportAbove) out.push({ id: `seat-brackets-${name}`, level: 'warn', en: `${name}: a ${mm(d)} seating overhang needs concealed brackets (added to the hardware list).`, ar: `${name}: بروز الجلوس ${mm(d)} يحتاج كوابيل مخفية (أُضيفت إلى قائمة الاكسسوار).` });
  return out;
}

export function layoutIssues(model) {
  const out = [];
  const kind = xlKind(model);
  const xl = model.xl;
  if (kind === 'galley') {
    const a = xl.aisle; const [lo, hi] = XL.aisle.rec;
    if (a < lo) out.push({ id: 'galley-aisle', level: a < 900 ? 'error' : 'warn', en: `Galley: the aisle is ${mm(a)} - below the ${lo}-${hi} mm work aisle. Two people cannot pass and doors / drawers open into each other.`, ar: `المطبخ الممر: العرض بين الصفين ${mm(a)} - أقل من ممر العمل ${lo}-${hi} مم. لا يمكن لشخصين المرور وتتصادم الأبواب والأدراج.` });
    else if (a > hi) out.push({ id: 'galley-aisle', level: 'warn', en: `Galley: the aisle is ${mm(a)} - wider than the ${lo}-${hi} mm work aisle, so the work triangle gets long.`, ar: `المطبخ الممر: العرض ${mm(a)} - أوسع من ممر العمل ${lo}-${hi} مم، فيطول مثلث العمل.` });
    const len = rowWidth(model.runs.run2 ? model.runs.run2.base : []);
    if (len < 1200) out.push({ id: 'galley-run2-min', level: 'warn', en: `Run 2 is only ${mm(len)} long - a useful run is at least 1200 mm.`, ar: `الصف الثاني طوله ${mm(len)} فقط - أقل طول مفيد ١٢٠٠ مم.` });
    const lm = rowWidth(model.runs.main.base);
    if (!xl.match && len > 0 && Math.abs(len - lm) > 50) out.push({ id: 'galley-run2-len', level: 'info', en: `Run 2 (${mm(len)}) and the main run (${mm(lm)}) are different lengths.`, ar: `الصف الثاني (${mm(len)}) والرئيسي (${mm(lm)}) بطولين مختلفين.` });
  }
  if (kind === 'island') {
    const a = xl.gap; const [lo, hi] = XL.gap.rec;
    if (a < lo) out.push({ id: 'island-gap', level: a < 800 ? 'error' : 'warn', en: `Island: only ${mm(a)} between the main run and the island - keep ${lo}-${hi} mm so doors and drawers can open and a person can pass.`, ar: `الجزيرة: ${mm(a)} فقط بين الصف الرئيسي والجزيرة - اترك ${lo}-${hi} مم لفتح الأبواب والأدراج ومرور الشخص.` });
    else if (a > hi) out.push({ id: 'island-gap', level: 'warn', en: `Island: ${mm(a)} from the main run is more than the ${lo}-${hi} mm clearance - the island gets far from the work area.`, ar: `الجزيرة: ${mm(a)} من الصف الرئيسي أكثر من الخلوص ${lo}-${hi} مم - تبعد الجزيرة عن منطقة العمل.` });
    const len = rowWidth(model.runs.isl ? model.runs.isl.base : []);
    if (len < 900) out.push({ id: 'island-min', level: 'warn', en: `The island is only ${mm(len)} long - at least 900 mm is a usable island.`, ar: `طول الجزيرة ${mm(len)} فقط - أقل طول مفيد ٩٠٠ مم.` });
    out.push(...seatingIssues(model, 'Island'));
  }
  if (kind === 'peninsula') {
    const p = penProjection(model);
    if (p < XL.minProj) out.push({ id: 'pen-min', level: 'warn', en: `The peninsula projects only ${mm(p)} beyond the main run - at least ${XL.minProj} mm is needed to read as a peninsula.`, ar: `الجزيرة الممتدة تبرز ${mm(p)} فقط عن الصف الرئيسي - يلزم ${XL.minProj} مم على الأقل.` });
    out.push(...seatingIssues(model, 'Peninsula'));
    if (!xl.endPanel) out.push({ id: 'pen-end', level: 'info', en: 'Peninsula: the open end has no finished end panel - the carcass side will show.', ar: 'الجزيرة الممتدة: النهاية المفتوحة بلا لوح نهاية مشطّب - سيظهر جانب الهيكل.' });
  }
  if (!kind && model.legs.left.on && model.legs.right.on) {
    const c = uClearSpan(model);
    if (c < 1000) out.push({ id: 'u-clear', level: c < 900 ? 'error' : 'warn', en: `U-shape: only ${mm(c)} between the two legs - the work aisle should be at least 1000 mm. Widen the main run or reduce the legs' depth.`, ar: `شكل U: ${mm(c)} فقط بين الرجلين - يجب ألا يقل ممر العمل عن ١٠٠٠ مم. وسّع الصف الرئيسي أو قلّل عمق الرجلين.` });
  }
  return out;
}

/** how many concealed worktop brackets a seating overhang needs: one per 800 mm of overhang run, at least 2 per slab (only above the unsupported depth) */
export const BRACKET_PITCH = 800;
export function bracketCount(scene) {
  const xl = scene.model.xl;
  if (!xl || !xl.seatOn || xl.seatD <= XL.seat.supportAbove) return 0;
  return scene.runs.filter((r) => r.key === 'pen' || r.key === 'isl').reduce((n, r) => n + r.counters.reduce((m, c) => m + Math.max(2, Math.ceil((c.u1 - c.u0) / BRACKET_PITCH)), 0), 0);
}
