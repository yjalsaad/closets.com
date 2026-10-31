/* Neo Kitchen Designer - read-only answers for the Bonsai Assistant (Haneen) (UX-1).
 * The assistant's design operations (interpret / plan / execute in assistant.js) stay review-before-apply. This module only ANSWERS
 * a few plain questions from the current project (overall size, finish, countertop, handles, doors, plinth, unit counts). It never
 * changes the model, never guesses: a question it cannot answer from the project returns null and the assistant says so.
 * Pure + bilingual (EN / AR), unit-tested. */
import { totalH, rowWidth, layoutName } from './model';
import { FINISHES, COUNTERS, HANDLES, XL_RUN_OF } from './constants';

const IN = 25.4;
const num = (n) => Math.round(n * 10) / 10;
export const fmt = (mm, unit) => (unit === 'in' ? `${num(mm / IN)} in` : unit === 'cm' ? `${num(mm / 10)} cm` : `${num(mm)} mm`);

const TOPICS = [
  ['help', /\b(help|what can you|can you do|capabilit)/i, /(مساعدة|ماذا تستطيع|ماذا يمكنك|ايش تقدر)/],
  ['size', /\b(size|dimension|dimensions|width|wide|height|tall|high|depth|deep|how big|overall)\b/i, /(أبعاد|ابعاد|عرض|ارتفاع|عمق|حجم|مقاس|كم طول)/],
  ['finish', /\b(finish|colou?r|material|wood|oak|walnut|lacquer)\b/i, /(لون|تشطيب|خامة|مادة|خشب)/],
  ['counter', /\b(counter|worktop|countertop|marble|granite|quartz)\b/i, /(سطح|رخام|جرانيت)/],
  ['handle', /\b(handle|handles|knob|pull)\b/i, /(مقبض|مقابض|يد الباب)/],
  ['doors', /\b(door|doors|drawer|drawers|gap|hinge|hinges)\b/i, /(باب|أبواب|ابواب|درج|أدراج|مفصل)/],
  ['plinth', /\b(plinth|toe.?kick|feet|legs)\b/i, /(قاعدة|توكيك|أرجل|ارجل)/],
  ['count', /\b(how many|count|number of|units|cabinets|components)\b/i, /(كم|عدد|وحدات|خزائن|مكونات)/],
];

export function topicOf(text) {
  const t = String(text || '');
  const hit = TOPICS.find(([, en, ar]) => en.test(t) || ar.test(t));
  return hit ? hit[0] : null;
}

function unitCounts(model) {
  const out = { base: 0, wall: 0, top: 0 };
  Object.keys(model.runs || {}).forEach((rk) => {
    if (rk !== 'main' && !(model.legs && model.legs[rk] && model.legs[rk].on) && rk !== (model.xl && model.xl.kind && XL_RUN_OF[model.xl.kind])) return; // UX29: the run of a galley / peninsula / island counts too
    ['base', 'wall', 'top'].forEach((r) => { out[r] += ((model.runs[rk] || {})[r] || []).length; });
  });
  if (!model.topOn) out.top = 0;
  return out;
}

/** a short plain-language answer, or null when the question is not one this module can answer from the project */
export function answer(text, model, lang, unit = 'mm') {
  const topic = topicOf(text);
  if (!topic || !model || !model.g) return null;
  const ar = lang === 'ar'; const g = model.g; const u = unit;
  const L = (en, a) => (ar ? a : en);
  switch (topic) {
    case 'help':
      return L('I can change the design (e.g. "set door gap to 3mm", "base 2 width 80", "add a wall unit", "dark walnut finish", "u-shape"), switch views (show 3D, X-ray, explode, open doors) and answer simple questions about the current size, finish, countertop, handles, doors, plinth and unit counts. Every change is shown for review before it is applied.',
        'أستطيع تعديل التصميم (مثل «فراغ الباب ٣ مم»، «قاعدة ٢ عرضها ٨٠»، «أضف وحدة علوية»، «لون جوز»، «شكل U») وتبديل العروض (ثلاثي الأبعاد، الأشعة، التفكيك، فتح الأبواب) والإجابة عن أسئلة بسيطة عن الأبعاد والتشطيب وسطح العمل والمقابض والأبواب والقاعدة وعدد الوحدات. كل تغيير يُعرض للمراجعة قبل تطبيقه.');
    case 'size': {
      const W = rowWidth(model.runs.main.base);
      return L(`Overall: ${fmt(W, u)} wide × ${fmt(totalH(model), u)} high, base depth ${fmt(g.baseD, u)} (layout: ${layoutName(model)}).`,
        `الأبعاد الكلية: العرض ${fmt(W, u)} × الارتفاع ${fmt(totalH(model), u)}، عمق السفلي ${fmt(g.baseD, u)} (التخطيط: ${layoutName(model)}).`);
    }
    case 'finish': {
      const f = FINISHES[model.finish];
      return f ? L(`The cabinet fronts use ${f.en}. Carcass boards are ${fmt(g.board, u)} thick, doors ${fmt(g.doorThk, u)}.`, `واجهات الخزائن بتشطيب ${f.ar}. سماكة لوح الهيكل ${fmt(g.board, u)} والأبواب ${fmt(g.doorThk, u)}.`) : null;
    }
    case 'counter': {
      const c = COUNTERS[model.counter];
      return c ? L(`Countertop: ${c.en}, ${fmt(g.counterThk, u)} thick, ${fmt(g.overhang, u)} overhang, backsplash ${g.backsplashH ? fmt(g.backsplashH, u) : 'none'}.`,
        `سطح العمل: ${c.ar}، السماكة ${fmt(g.counterThk, u)}، البروز ${fmt(g.overhang, u)}، الباكسبلاش ${g.backsplashH ? fmt(g.backsplashH, u) : 'بدون'}.`) : null;
    }
    case 'handle': {
      const h = model.handle; const st = HANDLES[h.style];
      return st ? L(`Handles: ${st.en}${h.style === 'bar' ? `, ${h.len} mm centres` : ''}, position ${h.pos}.`, `المقابض: ${st.ar}${h.style === 'bar' ? `، مسافة ${h.len} مم` : ''}، الموضع ${h.pos}.`) : null;
    }
    case 'doors':
      return L(`Door gap ${fmt(g.doorGap, u)}, door board ${fmt(g.doorThk, u)}, drawer gap ${fmt(g.drawerGap, u)}, hinge cup ${fmt(g.hingeCup, u)}.`,
        `فراغ الباب ${fmt(g.doorGap, u)}، لوح الباب ${fmt(g.doorThk, u)}، فراغ الأدراج ${fmt(g.drawerGap, u)}، كوب المفصلة ${fmt(g.hingeCup, u)}.`);
    case 'plinth':
      return L(`Plinth ${fmt(g.plinthH, u)} high, set back ${fmt(g.plinthSetback, u)}.`, `ارتفاع القاعدة ${fmt(g.plinthH, u)} وتراجعها ${fmt(g.plinthSetback, u)}.`);
    case 'count': {
      const c = unitCounts(model);
      return L(`${c.base} base, ${c.wall} wall and ${c.top} top cabinet${c.base + c.wall + c.top === 1 ? '' : 's'} in this project.`, `${c.base} سفلي و${c.wall} علوي و${c.top} ثالث في هذا المشروع.`);
    }
    default: return null;
  }
}
