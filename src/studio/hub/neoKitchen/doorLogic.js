/* Neo Kitchen Designer - pure logic behind the "03 Doors & Hinges" card (no React, no colours).
 * doorIssues(model): plain-language warnings for values that are legal but physically risky, or that cannot be drilled.
 * The isometric diagram geometry lives in doorArt.js. */
import { MFG } from './constants';

/** depth (mm) a 35 mm hinge cup is bored; Kitchen3D draws the bore 12 mm deep */
export const CUP_DEPTH = 12.5;

/** width (mm) of the narrowest hinged door leaf in the kitchen; null when no unit has a hinged door */
export function narrowestLeaf(model) {
  const g = model.g; let best = null;
  Object.values(model.runs || {}).forEach((run) => ['base', 'wall', 'top'].forEach((row) => (run[row] || []).forEach((u) => {
    const corner = u.type === 'blind' || u.type === 'carousel' || u.type === 'diagonal';
    const secs = corner ? [{ t: 'door', n: 1 }] : (u.secs || []);
    secs.forEach((s) => {
      if (s.t !== 'door' && s.t !== 'glass' && s.t !== 'sink') return;
      const n = s.t === 'sink' ? Math.max(2, s.n || 1) : (s.n || 1);
      const w = (u.w - g.doorGap * (n + 1)) / n;
      if (best === null || w < best) best = w;
    });
  })));
  return best;
}

/** true when any section is a glass door (its frame stile is MFG.frameW wide and carries the hinge cup) */
export function hasGlassDoor(model) {
  return Object.values(model.runs || {}).some((run) => ['base', 'wall', 'top'].some((row) => (run[row] || []).some((u) => (u.secs || []).some((s) => s.t === 'glass'))));
}

/** [{ level: 'warn' | 'error', k, en, ar }] - empty when the door values are fine */
export function doorIssues(model) {
  const g = model.g; const out = [];
  const leaf = narrowestLeaf(model);
  const need = g.hingeCup + g.cupEdge;
  if (leaf !== null && need > leaf) out.push({ level: 'error', k: 'hingeCup', en: `A ${g.hingeCup} mm cup at ${g.cupEdge} mm from the edge needs ${need} mm, but the narrowest door is only ${Math.round(leaf)} mm wide. Use a smaller cup.`, ar: `كوب ${g.hingeCup} مم على بعد ${g.cupEdge} مم من الحافة يحتاج ${need} مم، لكن أضيق باب عرضه ${Math.round(leaf)} مم فقط. استخدم كوبًا أصغر.` });
  else if (leaf !== null && need > leaf - 20) out.push({ level: 'warn', k: 'hingeCup', en: `The cup leaves under 20 mm of board beside it on the narrowest door (${Math.round(leaf)} mm wide).`, ar: `يترك الكوب أقل من 20 مم من اللوح بجانبه في أضيق باب (عرضه ${Math.round(leaf)} مم).` });
  if (need > MFG.frameW && hasGlassDoor(model)) out.push({ level: 'warn', k: 'hingeCup', en: `The cup needs ${need} mm but the glass-door frame stile is only ${MFG.frameW} mm wide - the bore reaches into the glass.`, ar: `يحتاج الكوب ${need} مم لكن عمود إطار الباب الزجاجي ${MFG.frameW} مم فقط - سيصل الثقب إلى الزجاج.` });
  const left = g.doorThk - CUP_DEPTH;
  if (left <= 0) out.push({ level: 'error', k: 'doorThk', en: `A ${g.doorThk} mm board is thinner than the ${CUP_DEPTH} mm cup bore - the bore would break through the front.`, ar: `لوح ${g.doorThk} مم أرق من ثقب الكوب ${CUP_DEPTH} مم - سيخترق الثقب الواجهة.` });
  else if (g.doorThk < 16) out.push({ level: 'warn', k: 'doorThk', en: `Only ${left} mm of board is left behind the cup bore. Standard hinges need a board of 16 mm or more.`, ar: `يتبقى ${left} مم فقط من اللوح خلف ثقب الكوب. المفصلات القياسية تحتاج لوحًا 16 مم أو أكثر.` });
  else if (g.doorThk > 25) out.push({ level: 'warn', k: 'doorThk', en: `A ${g.doorThk} mm door is heavy and thick - check that the hinge arm can reach it.`, ar: `باب ${g.doorThk} مم ثقيل وسميك - تأكد أن ذراع المفصلة يصل إليه.` });
  if (g.cupEdge === 0) out.push({ level: 'warn', k: 'cupEdge', en: 'A 0 mm edge distance puts the cup rim on the door edge - the bore breaks out of the side.', ar: 'مسافة حافة 0 مم تضع حافة الكوب على حافة الباب - سيخرج الثقب من الجانب.' });
  else if (g.cupEdge < 3) out.push({ level: 'warn', k: 'cupEdge', en: `${g.cupEdge} mm from the edge is under the usual 3-6 mm - the wall beside the cup is thin and can chip.`, ar: `${g.cupEdge} مم من الحافة أقل من المعتاد 3-6 مم - الجدار بجانب الكوب رقيق وقد يتشقق.` });
  else if (g.cupEdge > 8) out.push({ level: 'warn', k: 'cupEdge', en: `${g.cupEdge} mm from the edge is more than most hinge arms reach (3-6 mm usual).`, ar: `${g.cupEdge} مم من الحافة أكثر مما تصل إليه معظم أذرع المفصلات (المعتاد 3-6 مم).` });
  if (g.hingeCup !== 35 && (g.hingeCup < 26 || g.hingeCup > 40)) out.push({ level: 'warn', k: 'hingeCup', en: `${g.hingeCup} mm is not a standard cup bore (26, 35 or 40 mm) - the hinges must be made for it.`, ar: `${g.hingeCup} مم ليس قياسًا معتادًا لثقب الكوب (26 أو 35 أو 40 مم) - يجب أن تُصنع المفصلات لهذا القياس.` });
  if (g.doorGap === 0) out.push({ level: 'warn', k: 'doorGap', en: 'A 0 mm gap leaves the doors touching each other and the carcass - they will rub when they open.', ar: 'فراغ 0 مم يجعل الأبواب تلامس بعضها والهيكل - ستحتك عند الفتح.' });
  else if (g.doorGap < 2) out.push({ level: 'warn', k: 'doorGap', en: `A ${g.doorGap} mm gap is tight - the doors may catch on each other.`, ar: `فراغ ${g.doorGap} مم ضيق - قد تعلق الأبواب ببعضها.` });
  else if (g.doorGap > 6) out.push({ level: 'warn', k: 'doorGap', en: `A ${g.doorGap} mm gap is wider than the usual 2-4 mm.`, ar: `فراغ ${g.doorGap} مم أوسع من المعتاد 2-4 مم.` });
  return out;
}
