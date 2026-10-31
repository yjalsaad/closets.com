/* Neo Kitchen Designer - pure logic behind the "02 Carcass Boards" card (no React, no colours).
 * carcassIssues(model): plain-language warnings for values that are legal but physically risky or contradictory. Never throws.
 * The isometric diagram geometry lives in carcassArt.js. */
import { UNIT_W } from './constants';

const isNormalBase = (u) => u.type !== 'tall' && u.type !== 'blind' && u.type !== 'carousel' && u.type !== 'diagonal';

/** { depth, width, stretchers } of the kitchen as built: the shallowest carcass depth in use (mm), the narrowest unit (mm),
 *  and whether any unit actually gets two top stretchers (normal base units only). Falls back to the base depth / unit minimum. */
export function carcassFacts(model) {
  const g = model.g; let depth = null; let width = null; let stretchers = false;
  Object.values(model.runs || {}).forEach((run) => ['base', 'wall', 'top'].forEach((row) => (run[row] || []).forEach((u) => {
    const d = row === 'base' ? g.baseD : g.wallD;
    depth = depth === null ? d : Math.min(depth, d);
    width = width === null ? u.w : Math.min(width, u.w);
    if (row === 'base' && isNormalBase(u)) stretchers = true;
  })));
  return { depth: depth === null ? g.baseD : depth, width: width === null ? UNIT_W.min : width, stretchers };
}

/** [{ level: 'warn' | 'error', k, en, ar }] - empty when the carcass values are fine */
export function carcassIssues(model) {
  const g = model.g; const out = [];
  const { depth, width, stretchers } = carcassFacts(model);
  const add = (level, k, en, ar) => out.push({ level, k, en, ar });
  // board
  if (2 * g.board >= width) add('error', 'board', `Two ${g.board} mm sides leave no inside width in the narrowest cabinet (${Math.round(width)} mm wide).`, `جانبان بسماكة ${g.board} مم لا يتركان عرضًا داخليًا في أضيق وحدة (عرضها ${Math.round(width)} مم).`);
  else if (g.board < 15) add('warn', 'board', `${g.board} mm board is thin for a carcass - sides and bottoms may bow and hold screws poorly (15 mm or more is usual).`, `لوح ${g.board} مم رفيع للهيكل - قد تنحني الجوانب والقواعد وتمسك البراغي بضعف (المعتاد 15 مم فأكثر).`);
  else if (g.board > 25) add('warn', 'board', `${g.board} mm board is heavy for a carcass (18 mm is usual) - check the fittings can reach it.`, `لوح ${g.board} مم ثقيل للهيكل (المعتاد 18 مم) - تأكد أن الاكسسوارات تصل إليه.`);
  // back + groove
  if (g.back >= g.board) add('error', 'back', `A ${g.back} mm back is as thick as the ${g.board} mm carcass board - it is not a back panel. Use a thinner back.`, `ظهر ${g.back} مم بنفس سماكة لوح الهيكل ${g.board} مم - لم يعد لوح ظهر. استخدم ظهرًا أرق.`);
  else if (g.back > 12) add('warn', 'back', `A ${g.back} mm back is unusually thick (3-8 mm is usual) - the groove will weaken the sides.`, `ظهر ${g.back} مم سميك على غير المعتاد (المعتاد 3-8 مم) - سيُضعف المجرى الجوانب.`);
  else if (g.back < 4) add('warn', 'back', `A ${g.back} mm back is very thin - it may flex or tear.`, `ظهر ${g.back} مم رقيق جدًا - قد يلين أو يتمزق.`);
  if (g.grooveD >= g.board) add('error', 'grooveD', `A ${g.grooveD} mm groove goes right through the ${g.board} mm board. Make it shallower.`, `مجرى ${g.grooveD} مم يخترق لوح ${g.board} مم. اجعله أقل عمقًا.`);
  else if (g.grooveD > g.board / 2) add('warn', 'grooveD', `A ${g.grooveD} mm groove cuts more than half of the ${g.board} mm board - the sides get weak at the groove.`, `مجرى ${g.grooveD} مم يقطع أكثر من نصف لوح ${g.board} مم - تضعف الجوانب عند المجرى.`);
  // inset
  const reach = g.inset + g.back;
  if (reach >= depth) add('error', 'inset', `Back inset ${g.inset} mm + back ${g.back} mm reaches ${reach} mm, past the ${depth} mm cabinet depth. Reduce the inset.`, `تراجع الظهر ${g.inset} مم + الظهر ${g.back} مم يصل إلى ${reach} مم وهو أكبر من عمق الخزانة ${depth} مم. قلّل التراجع.`);
  else if (reach > depth - 100) add('warn', 'inset', `Back inset + back reaches ${reach} mm of a ${depth} mm depth - under 100 mm is left in front for shelves and drawers.`, `التراجع + الظهر يصل إلى ${reach} مم من عمق ${depth} مم - يبقى أقل من 100 مم في الأمام للرفوف والأدراج.`);
  else if (g.inset < 5 && !g.flushBack) add('warn', 'inset', g.inset === 0 ? 'A 0 mm inset puts the groove on the rear edge - the back is not enclosed.' : `A ${g.inset} mm inset leaves only a thin lip behind the groove - it can chip.`, g.inset === 0 ? 'تراجع 0 مم يضع المجرى على الحافة الخلفية - الظهر غير محصور.' : `تراجع ${g.inset} مم يترك حافة رقيقة خلف المجرى - قد تتشقق.`);
  else if (g.inset > 25) add('warn', 'inset', `A ${g.inset} mm inset wastes inside depth behind the back (15 mm is usual).`, `تراجع ${g.inset} مم يهدر عمقًا داخليًا خلف الظهر (المعتاد 15 مم).`);
  // stretchers (only when a base unit gets them)
  if (stretchers) {
    if (2 * g.stretcher >= depth) add('error', 'stretcher', `Two ${g.stretcher} mm stretchers need ${2 * g.stretcher} mm, but the base depth is ${depth} mm - they would meet or overlap. Use a narrower stretcher.`, `رباطان بعرض ${g.stretcher} مم يحتاجان ${2 * g.stretcher} مم لكن عمق الوحدة ${depth} مم - سيتلامسان أو يتداخلان. استخدم رباطًا أضيق.`);
    else {
      if (g.stretcher > depth / 2 - 50) add('warn', 'stretcher', `${g.stretcher} mm stretchers leave a gap of only ${Math.round(depth - 2 * g.stretcher)} mm between them - that is hardly an open top.`, `رباطان ${g.stretcher} مم يتركان فجوة ${Math.round(depth - 2 * g.stretcher)} مم فقط بينهما - لم يعد السطح العلوي مفتوحًا.`);
      else if (g.stretcher < 60) add('warn', 'stretcher', `${g.stretcher} mm stretchers are narrow - too little board to fix the worktop to.`, `رباطان ${g.stretcher} مم ضيقان - لوح غير كافٍ لتثبيت سطح العمل.`);
      if (g.stretcher < reach + 10) add('warn', 'stretcher', `The rear stretcher (${g.stretcher} mm) is not wider than the groove position (${reach} mm) - the back panel's groove runs out of board.`, `الرباط الخلفي (${g.stretcher} مم) ليس أعرض من موضع المجرى (${reach} مم) - ينتهي اللوح قبل مجرى الظهر.`);
    }
  }
  return out;
}
