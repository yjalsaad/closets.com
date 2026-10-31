/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - Haneen (Bonsai assistant) for doors: pure interpreter, planner and executor.
 * Text (English or Arabic) -> commands -> review cards -> a NEW design object. Nothing here draws: a command only changes the same design the
 * Parameters panel edits, so the drawing, the 3D view, the cut list and the price follow exactly as for a manual edit.
 * ===========================================================================*/
import { normDigits } from '../neoKitchen/model';
import { PERSONA, dayPart } from '../neoKitchen/persona';
import { normalizeDesign, RANGES, TYPES, FINISH_KEYS } from './doorModel';

export const EXAMPLES = {
  en: ['door 900 x 2100', 'shaker door with 6 panels', 'double door, width 1800', 'glazed door with 2 bars', 'oak veneer, solid core', 'opens out, left hand', 'fire door FD30', 'barn door', 'handle height 1050', 'open the door'],
  ar: ['باب ٩٠٠ × ٢١٠٠', 'باب شيكر ٦ بانوه', 'باب ضلفتين عرض ١٨٠٠', 'باب زجاج مع قواطع', 'قشرة سنديان قلب صلب', 'يفتح للخارج يد يسار', 'باب حريق FD30', 'باب جرار', 'ارتفاع المقبض ١٠٥٠', 'افتح الباب'],
};

export function doorGreeting(lang, date = new Date()) {
  const part = dayPart(date);
  if (lang === 'ar') {
    const hi = part === 'morning' ? 'صباح الخير' : 'مساء الخير';
    return `${hi}! أهلًا بيك في ${PERSONA.company.ar}، أنا ${PERSONA.name.ar} وهساعدك تصمم بابك. قولي المقاس ونوع الباب (مسطح، بانوه، زجاج، شيش، جرار، ضلفتين، جيبي) والخشب والتشطيب والفتح. كل تغيير بتراجعه قبل التطبيق، وCtrl+Z يرجّع.`;
  }
  const hi = part === 'morning' ? 'Good morning' : part === 'afternoon' ? 'Good afternoon' : 'Good evening';
  return `${hi}! Welcome to ${PERSONA.company.en} - I'm ${PERSONA.name.en} and I'll help you design your door. Tell me the size and the type (flush, panel, glazed, louvre, barn, double or pocket), the timber, finish and swing. You review every change before it applies, and Ctrl+Z brings it back.`;
}

const TYPE_WORDS = [
  ['double', /\bdouble( leaf| door)?\b|ضلفتين|مزدوج|ضلفتان/], ['pocket', /\bpocket\b|جيبي/], ['barn', /\bbarn\b|\bsliding\b|جرار|منزلق/],
  ['louvre', /\blouv(re|er)(d)?\b|شيش/], ['glazed', /\bglazed\b|\bhalf[- ]?glass\b|\bglass door\b|باب زجاج|زجاجي/], ['moulded', /\bmou?lded\b|مقولب/],
  ['panel', /\bshaker\b|\bpanel(l?ed)?( door)?\b|بانوه|شيكر|بانو/], ['flush', /\bflush\b|مسطح|سادة/],
];
const FIN_WORDS = [['oak', /\boak\b|سنديان|بلوط/], ['walnut', /\bwalnut\b|جوز/], ['pine', /\bpine\b|صنوبر/], ['mahogany', /\bmahogany\b|ماهوجني/], ['white', /\bwhite\b|أبيض|ابيض/], ['ivory', /\bivory\b|عاجي/], ['grey', /\bgr[ae]y\b|رمادي/], ['black', /\bblack\b|أسود|اسود/]];

const num = (s) => { const n = parseFloat(normDigits(String(s)).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const toMm = (v, unit, bare) => { if (v == null) return null; const u = (unit || '').toLowerCase(); if (u === 'cm' || u === 'سم') return Math.round(v * 10); if (u === 'm' || u === 'متر') return Math.round(v * 1000); if (u === 'mm' || u === 'مم') return Math.round(v); return v <= 4 ? Math.round(v * 1000) : v <= 300 && v >= 50 && !u && bare !== 'mm' ? Math.round(v * 10) : Math.round(v); };
const NUM = '(\\d+(?:\\.\\d+)?)\\s*(mm|cm|m|مم|سم|متر)?';
const P = (en, ar, ...pairs) => ({ type: 'design', title: [en, ar], patch: pairs });
const UI_WORDS = [
  [/\b(show |open |go to )?(3d|three d)\b|ثلاثي/, { action: 'view', value: '3d' }],
  [/\b(cut ?list|cutting list)\b|قائمة القص/, { action: 'view', value: 'cut' }],
  [/\b(show |go to )?(design|elevation|2d|drawing)\b|^تصميم$|واجهة|الرسم/, { action: 'view', value: 'design' }],
  [/\b(no|hide|turn off) x-?ray\b|إخفاء الأشعة/, { action: 'xray', value: false }], [/\bx-?ray\b|أشعة|اشعة/, { action: 'xray', value: true }],
  [/\b(no|stop|hide) explode\b|اغلق التفكيك/, { action: 'explode', value: false }], [/\bexplode\b|تفكيك|فكك/, { action: 'explode', value: true }],
  [/\b(close|shut) (the )?(door|doors|leaf)\b|اغلق الباب|أغلق الباب/, { action: 'open', value: false }], [/\bopen (the )?(door|doors|leaf)\b|افتح الباب/, { action: 'open', value: true }],
  [/\b(no |turn off |disable )daylight\b|\bstandard look\b/, { action: 'daylight', value: false }], [/\bdaylight\b|ضوء النهار/, { action: 'daylight', value: true }],
];

/** text -> { items, rest }. Items: { type:'ui', action, value } | { type:'design', title, patch:[[path, value]] } | { type:'meta', action:'undo'|'redo' } */
export function interpretDoor(textIn, design) {
  const text = normDigits(String(textIn || '')).toLowerCase().trim();
  const items = []; const rest = [];
  if (!text) return { items, rest };
  const clauses = text.split(/\s*(?:[,;،]|\band\b|\bwith\b|\bplus\b| و | مع )\s*/).map((s) => s.trim()).filter(Boolean);
  clauses.forEach((c) => {
    let hit = false;
    const push = (it) => { items.push(it); hit = true; };
    if (/^(undo|تراجع)$/.test(c)) { push({ type: 'meta', action: 'undo' }); return; }
    if (/^(redo|إعادة|اعادة)$/.test(c)) { push({ type: 'meta', action: 'redo' }); return; }
    for (const [re, cmd] of UI_WORDS) if (re.test(c)) { push({ type: 'ui', ...cmd }); return; }
    let m;
    /* size: 900 x 2100 */
    if ((m = c.match(new RegExp(`${NUM}\\s*(?:x|×|by|\\*)\\s*${NUM}`)))) {
      const a = toMm(num(m[1]), m[2] || m[4]); const b = toMm(num(m[3]), m[4] || m[2]);
      const w = Math.min(a, b); const h = Math.max(a, b);
      push(P(`Opening ${w} x ${h} mm`, `الفتحة ${w} × ${h} مم`, ['opening.w', w], ['opening.h', h]));
    }
    if ((m = c.match(new RegExp(`(?:wall|جدار|حائط)(?: thickness| سماكة)?\\s*(?:of|=|:)?\\s*${NUM}`))) && num(m[1]) != null) push(P(`Wall ${toMm(num(m[1]), m[2], 'mm')} mm`, `الجدار ${toMm(num(m[1]), m[2], 'mm')} مم`, ['opening.wall', toMm(num(m[1]), m[2], 'mm')]));
    else if ((m = c.match(new RegExp(`(?:width|wide|عرض)\\s*(?:of|=|:)?\\s*${NUM}`)))) push(P(`Opening width ${toMm(num(m[1]), m[2])} mm`, `عرض الفتحة ${toMm(num(m[1]), m[2])} مم`, ['opening.w', toMm(num(m[1]), m[2])]));
    else if ((m = c.match(new RegExp(`(?:height|high|tall|ارتفاع)\\s*(?:of|=|:)?\\s*${NUM}`))) && !/handle|مقبض/.test(c)) push(P(`Opening height ${toMm(num(m[1]), m[2])} mm`, `ارتفاع الفتحة ${toMm(num(m[1]), m[2])} مم`, ['opening.h', toMm(num(m[1]), m[2])]));
    if (!/wall|جدار|حائط/.test(c) && (m = c.match(new RegExp(`(?:thickness|thick|سماكة الباب|سمك الباب)\\s*(?:of|=|:)?\\s*${NUM}`)))) push(P(`Leaf thickness ${toMm(num(m[1]), m[2], 'mm')} mm`, `سماكة الضلفة ${toMm(num(m[1]), m[2], 'mm')} مم`, ['leaf.thk', toMm(num(m[1]), m[2], 'mm')]));
    if ((m = c.match(/(?:handle|مقبض)[a-z؀-ۿ ]*?(?:height|ارتفاع)?\s*(?:at|=|:)?\s*(\d{3,4})/)) && /handle|مقبض/.test(c)) push(P(`Handle height ${num(m[1])} mm`, `ارتفاع المقبض ${num(m[1])} مم`, ['lock.handleH', num(m[1])]));
    if ((m = c.match(/(?:backset|باكست)\s*(?:=|:)?\s*(\d{2,3})/))) push(P(`Lock backset ${num(m[1])} mm`, `باكست القفل ${num(m[1])} مم`, ['lock.backset', num(m[1])]));
    /* type */
    for (const [t, re] of TYPE_WORDS) if (re.test(c) && TYPES.includes(t)) { push(P(`Door type: ${t}`, `نوع الباب: ${t}`, ['type', t])); break; }
    if (/\b(\d)[- ]?panel/.test(c) || /(\d)\s*بانوه/.test(c)) {
      const n = num((c.match(/(\d)[- ]?panel/) || c.match(/(\d)\s*بانوه/))[1]);
      const lay = { 1: [1, 1], 2: [1, 2], 3: [1, 3], 4: [2, 2], 5: [1, 5], 6: [2, 3], 8: [2, 4] }[n];
      if (lay) push(P(`${n} panels (${lay[0]} x ${lay[1]})`, `${n} بانوه (${lay[0]} × ${lay[1]})`, ['panels.cols', lay[0]], ['panels.rows', lay[1]]));
    }
    if ((m = c.match(/(?:cols?|columns?|أعمدة)\s*(\d)/))) push(P(`${num(m[1])} panel columns`, `${num(m[1])} أعمدة بانوه`, ['panels.cols', num(m[1])]));
    if ((m = c.match(/(?:rows?|صفوف)\s*(\d)/))) push(P(`${num(m[1])} panel rows`, `${num(m[1])} صفوف بانوه`, ['panels.rows', num(m[1])]));
    if ((m = c.match(/(\d)\s*(?:glazing )?bars?|(\d)\s*قواطع/))) { const n = num(m[1] || m[2]); push(P(`${n} glazing bar(s) each way`, `${n} قاطع زجاج`, ['glass.barsV', n], ['glass.barsH', n])); }
    if (/\bglass\b.*\b(frosted|مصنفر)|مصنفر|frosted/.test(c)) push(P('Frosted glass', 'زجاج مصنفر', ['glass.kind', 'frosted']));
    else if (/smoked|مدخن/.test(c)) push(P('Smoked glass', 'زجاج مدخن', ['glass.kind', 'smoked']));
    if (/vision panel|فتحة رؤية/.test(c)) push(P('Vision panel on', 'فتحة رؤية', ['glass.vision', true]));
    /* core, skin, finish */
    if (/\bsolid core\b|قلب صلب/.test(c)) push(P('Solid core', 'قلب صلب', ['leaf.core', 'solid']));
    else if (/\bhollow( core)?\b|مجوف/.test(c)) push(P('Hollow core', 'قلب مجوف', ['leaf.core', 'hollow']));
    else if (/\bengineered( core)?\b|هندسي/.test(c)) push(P('Engineered core', 'قلب هندسي', ['leaf.core', 'engineered']));
    if (/\bveneer(ed)?\b|قشرة/.test(c)) push(P('Veneer skin', 'جلد قشرة', ['leaf.skin', 'veneer']));
    else if (/\blacquer(ed)?\b|لكر|لاكر/.test(c)) push(P('Lacquer finish', 'تشطيب لكر', ['leaf.skin', 'lacquer']));
    else if (/\bpaint(ed)?\b|دهان|مدهون/.test(c)) push(P('Painted skin', 'جلد مدهون', ['leaf.skin', 'paint']));
    else if (/\blaminate\b|لامينيت/.test(c)) push(P('Laminate skin', 'جلد لامينيت', ['leaf.skin', 'laminate']));
    for (const [k, re] of FIN_WORDS) if (FINISH_KEYS.includes(k) && re.test(c)) { push(P(`Finish: ${k}`, `اللون: ${k}`, ['leaf.finish', k])); break; }
    if (/\bhardwood\b|خشب صلب/.test(c)) push(P('Hardwood', 'خشب صلب', ['leaf.timber', 'hardwood'])); else if (/\bsoftwood\b|خشب لين/.test(c)) push(P('Softwood', 'خشب لين', ['leaf.timber', 'softwood']));
    /* swing and hardware */
    if (/\b(left[- ]hand(ed)?|lh)\b|يد يسار|يسار/.test(c) && !/handle|مقبض/.test(c)) push(P('Left hand (hinges on the left)', 'يد يسار (المفصلات يسار)', ['swing.hand', 'LH']));
    else if (/\b(right[- ]hand(ed)?|rh)\b|يد يمين|يمين/.test(c) && !/handle|مقبض/.test(c)) push(P('Right hand (hinges on the right)', 'يد يمين (المفصلات يمين)', ['swing.hand', 'RH']));
    if (/\bopens? out(wards)?\b|للخارج|swing out/.test(c)) push(P('Opens out', 'يفتح للخارج', ['swing.dir', 'out']));
    else if (/\bopens? in(wards)?\b|للداخل|swing in/.test(c)) push(P('Opens in', 'يفتح للداخل', ['swing.dir', 'in']));
    if ((m = c.match(/(\d)\s*(?:hinges?|مفصلات)|(?:hinges?|مفصلات)\s*(\d)/))) push(P(`${num(m[1] || m[2])} hinges`, `${num(m[1] || m[2])} مفصلات`, ['hinges.count', num(m[1] || m[2])]));
    if (/\bball[- ]bearing\b|بلي/.test(c)) push(P('Ball-bearing hinges', 'مفصلات بلي', ['hinges.type', 'ball']));
    else if (/\bconcealed hinges?\b|مفصلات مخفية/.test(c)) push(P('Concealed hinges', 'مفصلات مخفية', ['hinges.type', 'concealed']));
    if (/\blever\b|ذراع/.test(c)) push(P('Lever handle', 'مقبض ذراع', ['lock.handle', 'lever']));
    else if (/\bknob\b|كرة/.test(c)) push(P('Knob handle', 'مقبض كرة', ['lock.handle', 'knob']));
    else if (/\bpull handle\b|مقبض سحب/.test(c)) push(P('Pull handle', 'مقبض سحب', ['lock.handle', 'pull']));
    if (/\b(no lock|without (a )?lock)\b|بدون قفل/.test(c)) push(P('No lock', 'بدون قفل', ['lock.on', false]));
    if (/\bfd ?60\b/.test(c)) push(P('Fire rating FD60', 'مقاومة حريق FD60', ['fire.rating', 'FD60'], ['leaf.thk', 54], ['leaf.core', 'solid']));
    else if (/\bfd ?30\b|\bfire( rated| door)?\b|حريق/.test(c)) push(P('Fire rating FD30', 'مقاومة حريق FD30', ['fire.rating', 'FD30'], ['leaf.thk', 44], ['leaf.core', 'solid']));
    if (/\bno frame\b|without (a )?frame|بدون حلق/.test(c)) push(P('No frame', 'بدون حلق', ['frame.on', false]));
    else if (/\bwith frame\b|\bframe on\b/.test(c)) push(P('Frame on', 'مع حلق', ['frame.on', true]));
    if (/\bthreshold\b|عتبة/.test(c)) push(P('Flat threshold', 'عتبة مسطحة', ['frame.threshold', 'flat']));
    if (/\bgrille\b|شبكة/.test(c)) push(P('Ventilation grille', 'شبكة تهوية', ['vent.mode', 'grille']));
    else if (/\bundercut\b|تهوية سفلية/.test(c)) push(P('Undercut ventilation', 'تهوية سفلية', ['vent.mode', 'undercut']));
    if (!hit) rest.push(c);
  });
  return { items, rest };
}

const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split('.'); const out = { ...o }; let cur = out; for (let i = 0; i < ks.length - 1; i++) { cur[ks[i]] = { ...cur[ks[i]] }; cur = cur[ks[i]]; } cur[ks[ks.length - 1]] = v; return out; };
const RANGE_OF = { 'opening.w': RANGES.ow, 'opening.h': RANGES.oh, 'opening.wall': RANGES.wall, 'leaf.thk': RANGES.thk, 'lock.handleH': RANGES.handleH, 'lock.backset': RANGES.backset, 'panels.cols': RANGES.cols, 'panels.rows': RANGES.rows, 'glass.barsV': RANGES.barsV, 'glass.barsH': RANGES.barsH, 'hinges.count': RANGES.hingeCount };

/** review cards: what changes (saved -> proposed) and whether it can be applied */
export function planDoor(cmds, design, lang) {
  const ar = lang === 'ar';
  return cmds.map((c) => {
    const notes = []; let ok = true;
    const detail = c.patch.map(([path, val]) => {
      const was = getPath(design, path); let to = val;
      const rg = RANGE_OF[path];
      if (rg && typeof val === 'number' && (val < rg[0] || val > rg[1])) { to = Math.min(rg[1], Math.max(rg[0], val)); notes.push(ar ? `${path}: المسموح ${rg[0]} - ${rg[1]}؛ سيصبح ${to}` : `${path}: allowed ${rg[0]} - ${rg[1]}; will become ${to}`); }
      return `${path}: ${was} -> ${to}`;
    }).join(' | ');
    if (c.patch.every(([p, v]) => getPath(design, p) === v)) { ok = false; notes.push(ar ? 'لا تغيير: القيمة نفسها' : 'No change: already this value'); }
    return { cmd: c, ok, title: ar ? c.title[1] : c.title[0], detail, note: notes.join(' ') };
  });
}
export function executeDoor(design, cmd) {
  let d = design;
  cmd.patch.forEach(([p, v]) => { d = setPath(d, p, v); });
  if (cmd.patch.some(([p, v]) => p === 'type' && (v === 'barn' || v === 'pocket' || v === 'double'))) {
    const t = cmd.patch.find(([p]) => p === 'type')[1];
    if (t === 'double' && design.type !== 'double') d = setPath(d, 'style', 'panel');
  }
  return { design: normalizeDesign(d) };
}
export function describeDoor(d, W, lang) {
  const ar = lang === 'ar';
  const S = W.S;
  return ar ? `الفتحة ${S.OW} × ${S.OH} مم، الضلفة ${S.leafW} × ${S.leafH} × ${S.T} مم، ${W.hingeCount} مفصلات، الوزن ${W.weight.join(' / ')} كغ.`
    : `Opening ${S.OW} x ${S.OH} mm, leaf ${S.leafW} x ${S.leafH} x ${S.T} mm, ${W.hingeCount} hinges, ${W.weight.join(' / ')} kg.`;
}
