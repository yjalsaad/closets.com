/* Neo Kitchen Designer - checks behind the Wall / Top / L-Left / L-Right screens (UX-6). Pure: model in, a list of
 * { level: 'error' | 'warn', en, ar } out. 'error' = the drawing would be wrong (units overlap / stick out), 'warn' = legal but risky. */
import { UNIT_W, KITCHEN } from './constants';
import { rowWidth, wallSpan, runWallH, totalH, isTall, tallH } from './model';

/** units of one row never overlap by construction (they are laid end to end); what CAN go wrong is a row that runs past the base run or a
 *  unit that is taller than its row. Reported here so the screen can show it instead of silently drawing it. */
export function rowIssues(model, rk, row) {
  const out = [];
  const run = model.runs[rk]; const arr = run[row] || [];
  if (!arr.length) return out;
  const w = rowWidth(arr);
  if (row === 'wall' || row === 'top') {
    const span = wallSpan(run.base);
    if (w > span + 0.5) out.push({ level: 'error', en: `The ${row} row is ${Math.round((w - span) / 10)} cm wider than the space between the tall units (${Math.round(span / 10)} cm): its last units overlap the tall unit or stick out of the run.`, ar: `الصف ${row === 'wall' ? 'العلوي' : 'الثالث'} أعرض بمقدار ${Math.round((w - span) / 10)} سم من المساحة بين الوحدات الطويلة (${Math.round(span / 10)} سم): تتداخل آخر وحداته مع الوحدة الطويلة أو تخرج من الصف.` });
  }
  const H = row === 'wall' ? runWallH(model, rk) : row === 'top' ? model.g.topH : null;
  arr.forEach((u, i) => {
    if (u.w < UNIT_W.min || u.w > UNIT_W.max) out.push({ level: 'error', en: `Unit ${i + 1} is ${u.w} mm wide; the allowed range is ${UNIT_W.min}-${UNIT_W.max} mm.`, ar: `عرض الوحدة ${i + 1} هو ${u.w} مم؛ المدى المسموح ${UNIT_W.min}-${UNIT_W.max} مم.` });
    if (H != null && u.h && u.h > H) out.push({ level: 'warn', en: `Unit ${i + 1} is set to ${u.h} mm but the row is ${H} mm: it is drawn at the row height.`, ar: `الوحدة ${i + 1} مضبوطة على ${u.h} مم لكن الصف ${H} مم: تُرسم بارتفاع الصف.` });
    if (row === 'base' && isTall(u) && tallH(u) + model.g.plinthH > KITCHEN.height.max) out.push({ level: 'error', en: `Tall unit ${i + 1} is taller than ${KITCHEN.height.max} mm.`, ar: `الوحدة الطويلة ${i + 1} أعلى من ${KITCHEN.height.max} مم.` });
  });
  if ((rk === 'left' || rk === 'right' || rk === 'pen') && row === 'base') {
    const first = arr[0];
    if (first && first.w <= model.g.baseD + 100) out.push({ level: 'warn', en: `Unit 1 sits in the corner: its first ${model.g.baseD} mm are hidden behind the main run, so make it wider than ${model.g.baseD + 100} mm.`, ar: `الوحدة 1 في الزاوية: أول ${model.g.baseD} مم مخفية خلف الصف الرئيسي، اجعلها أعرض من ${model.g.baseD + 100} مم.` });
  }
  if (row !== 'base' && totalH(model) > KITCHEN.height.max) out.push({ level: 'error', en: `The kitchen is ${totalH(model)} mm tall; the maximum is ${KITCHEN.height.max} mm.`, ar: `ارتفاع المطبخ ${totalH(model)} مم؛ الحد الأقصى ${KITCHEN.height.max} مم.` });
  return out;
}
