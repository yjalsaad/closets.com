/* =============================================================================
 * Bonsai Assistant (Haneen) - bilingual (English / Arabic) command parser. Pure functions.
 *   interpret(text, ctx)  -> { items:[cmd], rest:[unparsed clauses] }
 *   plan(cmds, model, lang) -> review cards (before -> after, clamp notes)
 *   execute(model, cmd)   -> { model, ui? }   (model commands are undoable as ONE step)
 * Understands Arabic-Indic digits (٨٠), Persian digits, Arabic decimal sep, diacritics,
 * alef/ya/ta-marbuta variants, the "ال" prefix, mm / cm / m / in units, relative
 * ("increase by 2" / "زود ٢") and multi-clause sentences ("... and ..." / "و").
 * Every spec control has EN + AR aliases (see ALIASES).
 * ===========================================================================*/
import { FIELD, FINISHES, COUNTERS, HANDLES, HANDLE_LENS, LEG, KITCHEN, UNIT_W, SECTYPES, UNIT_TYPES, TALL_H, XL } from './constants';
import {
  normDigits, clampSpec, setGlobal, setLeg, setUnitWidth, setRunWidth, setKitchenHeight, addUnit, deleteUnit, patchUnit, setUnitType,
  setLayout, toggleLeg, newUnit, newSection, clamp, rowWidth, setSecCount, setXl, xlKind, penProjection, penLengthFor,
} from './model';
import { layoutIssues } from './layoutRules';
import { moveSection } from './unitDraft';

/* ---- normalisation ----------------------------------------------------------- */
export function norm(text) {
  let s = normDigits(String(text || '')).toLowerCase();
  s = s.replace(/[ً-ٰٟـ]/g, '')            // diacritics + tatweel
    .replace(/[أإآٱ]/g, 'ا')          // alef variants
    .replace(/ى/g, 'ي').replace(/ة/g, 'ه') // alef maqsura, ta marbuta
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[،؛]/g, ',')                            // Arabic comma / semicolon
    .replace(/[“”«»″]/g, '"')
    .replace(/[?!؟]/g, ' ');
  // strip the definite article "ال" from Arabic words longer than 3 letters
  s = s.split(/\s+/).map((w) => (/^ال[؀-ۿ]{2,}/.test(w) ? w.slice(2) : w)).join(' ');
  return s.replace(/\s+/g, ' ').trim();
}
const N = norm;

/* ---- vocabulary ---------------------------------------------------------------- */
const ALIASES = {
  plinthH: ['plinth height', 'toe kick height', 'toe-kick height', 'toekick height', 'plinth', 'toe kick', 'toekick', 'ارتفاع التوكيك', 'ارتفاع السوكل', 'ارتفاع القاعده السفليه', 'توكيك', 'سوكل'],
  plinthSetback: ['plinth setback', 'plinth recess', 'toe kick setback', 'toe-kick setback', 'تراجع التوكيك', 'تراجع السوكل'],
  baseH: ['base carcass height', 'base cabinet height', 'base height', 'ارتفاع هيكل السفلي', 'ارتفاع الوحده السفليه', 'ارتفاع السفلي', 'ارتفاع القواعد'],
  counterThk: ['countertop thickness', 'counter top thickness', 'counter thickness', 'worktop thickness', 'سماكه السطح', 'سماكه سطح العمل', 'سمك السطح'],
  gap: ['counter to wall gap', 'counter-to-wall gap', 'counter to wall', 'wall gap', 'counter gap', 'الفراغ بين السطح والعلوي', 'فراغ السطح', 'المسافه بين السطح'],
  wallH: ['wall carcass height', 'wall cabinet height', 'wall height', 'upper height', 'ارتفاع هيكل العلوي', 'ارتفاع الوحده العلويه', 'ارتفاع العلوي'],
  topH: ['top carcass height', 'third tier height', 'top row height', 'top height', 'ارتفاع الثالث', 'ارتفاع الصف الثالث', 'ارتفاع هيكل الثالث'],
  baseD: ['base depth', 'base cabinet depth', 'kitchen depth', 'depth of base', 'عمق السفلي', 'عمق القواعد', 'عمق الوحده السفليه', 'عمق المطبخ'],
  wallD: ['wall and top depth', 'wall depth', 'top depth', 'upper depth', 'عمق العلوي', 'عمق الوحده العلويه', 'عمق الثالث'],
  overhang: ['countertop overhang', 'counter overhang', 'worktop overhang', 'overhang', 'بروز السطح', 'بروز'],
  board: ['carcass board thickness', 'carcass thickness', 'board thickness', 'carcass board', 'سماكه لوح الهيكل', 'سماكه الهيكل', 'سمك الهيكل', 'سماكه الالواح'],
  back: ['back board thickness', 'backboard thickness', 'back panel thickness', 'back thickness', 'back board', 'سماكه لوح الظهر', 'سماكه الظهر', 'سمك الظهر'],
  inset: ['back inset depth', 'back inset', 'groove setback', 'inset', 'عمق تراجع الظهر', 'تراجع الظهر'],
  stretcher: ['top stretcher width', 'stretcher width', 'rail width', 'stretcher', 'عرض الرباط', 'الرباط العلوي', 'رباط'],
  grooveD: ['back groove depth', 'groove depth', 'rabbet depth', 'عمق مجري الظهر', 'عمق المجري'],
  doorThk: ['door board thickness', 'door thickness', 'front thickness', 'سماكه لوح الباب', 'سماكه الباب', 'سمك الباب', 'سماكه الواجهه'],
  doorGap: ['door gap reveal', 'door gap', 'door reveal', 'reveal', 'gap', 'فراغ الباب', 'خلوص الباب', 'فراغ الابواب'],
  hingeCup: ['hinge cup diameter', 'hinge cup', 'cup diameter', 'hinge diameter', 'قطر كوب المفصله', 'كوب المفصله', 'قطر المفصله'],
  cupEdge: ['cup edge distance', 'hinge edge distance', 'cup edge', 'مسافه حافه الكوب', 'حافه الكوب'],
  drawerGap: ['drawer vertical gap', 'drawer gap', 'drawer reveal', 'فراغ الادراج', 'فراغ الدرج', 'الفراغ العمودي'],
  drawerSide: ['drawer side clearance', 'runner clearance', 'drawer clearance', 'drawer side', 'خلوص جانب الدرج', 'خلوص الدرج', 'خلوص السكه'],
  drawerBottom: ['drawer bottom inset', 'drawer bottom', 'bottom inset', 'تراجع قاع الدرج', 'قاع الدرج'],
  shelfThk: ['shelf board thickness', 'shelf thickness', 'shelf board', 'shelf thk', 'سماكه الرف', 'سمك الرف', 'سماكه الرفوف'],
  shelfPlay: ['shelf play clearance', 'shelf clearance', 'shelf play', 'shelf gap', 'خلوص الرف', 'خلوص الرفوف'],
  edgeBand: ['edge banding thickness', 'edge band thickness', 'edge banding', 'edge band', 'edgeband', 'سماكه شريط الحواف', 'شريط الحواف'],
  backsplashH: ['backsplash height', 'splash height', 'splashback height', 'backsplash', 'splashback', 'ارتفاع الباكسبلاش', 'باكسبلاش'],
};
const KITCHEN_ALIASES = {
  width: ['kitchen width', 'total width', 'overall width', 'run width', 'main run width', 'عرض المطبخ', 'العرض الكلي', 'اجمالي العرض', 'اجمالي عرض المطبخ'],
  height: ['kitchen height', 'overall height', 'total height', 'ارتفاع المطبخ', 'الارتفاع الكلي', 'اجمالي الارتفاع'],
};
const ROW_WORDS = {
  base: ['base', 'bottom', 'lower', 'floor', 'قاعده', 'قواعد', 'سفلي', 'سفليه', 'ارضي', 'ارضيه', 'سفلى'],
  wall: ['wall', 'upper', 'hanging', 'علوي', 'علويه', 'حائط', 'جداري', 'جداريه'],
  top: ['top', 'third', 'tier', 'عالي', 'عاليه', 'ثالث', 'ثالثه', 'اعلي'],
};
const SEC_WORDS = {
  drawer: ['drawers', 'drawer', 'ادراج', 'درج'],
  glass: ['glass doors', 'glass door', 'glass', 'زجاج', 'زجاجي', 'زجاجيه'],
  flip: ['flip-up', 'flip up', 'flip', 'lift-up', 'قلاب', 'رفع'],
  open: ['open shelf', 'open shelves', 'open niche', 'رف مفتوح', 'رفوف مفتوحه', 'مفتوح'],
  cover: ['cover panel', 'cover', 'filler', 'غطاء', 'لوح تغطيه'],
  sink: ['sink', 'حوض', 'مغسله'],
  hob: ['hob', 'cooktop', 'موقد', 'غاز', 'طباخ'],
  oven: ['oven', 'فرن'],
  fridge: ['fridge', 'refrigerator', 'ثلاجه'],
  door: ['doors', 'door', 'ابواب', 'باب'],
};
const TYPE_WORDS = {
  tall: ['tall', 'pantry', 'طويل', 'طويله', 'دولاب'],
  blind: ['blind corner', 'blind', 'ركن اعمي', 'ركن اعمى'],
  carousel: ['carousel', 'lazy susan', 'دوار', 'ركن دوار'],
  diagonal: ['diagonal', 'قطري', 'ركن قطري'],
  normal: ['normal', 'standard', 'عادي', 'عاديه'],
};
const FINISH_WORDS = { oak: ['natural oak', 'oak', 'بلوط'], walnut: ['dark walnut', 'walnut', 'جوز', 'عنابي'], white: ['matte white', 'white', 'lacquer', 'ابيض', 'لاكيه'], charcoal: ['charcoal grey', 'charcoal', 'grey', 'gray', 'رمادي', 'فحمي', 'فحم'] };
const COUNTER_WORDS = { marble: ['marble', 'رخام'], quartz: ['quartz', 'كوارتز'], granite: ['granite', 'جرانيت'], laminate: ['laminate', 'لامينيت', 'فورمايكا'], oakslab: ['solid oak', 'oak slab', 'wood top', 'بلوط صلب'] };
const HANDLE_WORDS = { bar: ['bar', 'شريط', 'عصا'], knob: ['knob', 'كره', 'مقبض دائري'], profile: ['profile', 'j-pull', 'j pull', 'gola', 'بروفايل'], push: ['push', 'ضغط', 'بدون مقبض ضغط'], none: ['none', 'no handle', 'no handles', 'بدون'] };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s, w) => new RegExp(`(^|[\\s,.])${esc(N(w))}($|[\\s,.])`).test(s);
const findWord = (s, words) => words.map(N).sort((a, b) => b.length - a.length).find((w) => has(s, w)) || null;
const hasAny = (s, words) => !!findWord(s, words);

/** longest alias hit across a table; returns {key, alias, end} */
function matchTable(s, table) {
  let best = null;
  Object.entries(table).forEach(([key, list]) => list.forEach((a) => {
    const na = N(a);
    const m = new RegExp(`(^|[\\s,.])${esc(na)}($|[\\s,.])`).exec(s);
    if (m && (!best || na.length > best.alias.length)) best = { key, alias: na, start: m.index + m[1].length, end: m.index + m[1].length + na.length };
  }));
  return best;
}

/* ---- numbers -------------------------------------------------------------------- */
const UNIT_RE = '(mm|millimet(?:er|re)s?|cm|centimet(?:er|re)s?|m|met(?:er|re)s?|in|inch|inches|"|مم|ملم|ملي|سم|سنتي|متر|انش|بوصه)?';
const NUM_RE = new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*${UNIT_RE}(?=$|[\\s,.])`, 'g');
const toMM = (v, u) => {
  if (!u) return { v, unit: null };
  if (/^(mm|millimet|مم|ملم|ملي)/.test(u)) return { v, unit: 'mm' };
  if (/^(cm|centimet|سم|سنتي)/.test(u)) return { v: v * 10, unit: 'cm' };
  if (/^(in|inch|"|انش|بوصه)/.test(u)) return { v: v * 25.4, unit: 'in' };
  return { v: v * 1000, unit: 'm' };
};
function numbers(s, from = 0) {
  const out = []; NUM_RE.lastIndex = 0; let m;
  const sub = s.slice(from);
  const re = new RegExp(NUM_RE.source, 'g');
  while ((m = re.exec(sub))) { const r = toMM(parseFloat(m[1]), m[2]); out.push({ raw: parseFloat(m[1]), ...r, at: from + m.index, end: from + m.index + m[0].length }); }
  return out;
}
/** mm value; unitless values that fall outside the range are read as cm when that fits */
function smartMM(n, min, max, defaultCm = false) {
  if (n.unit) return { v: n.v, note: n.unit === 'mm' ? '' : `${n.raw}${n.unit}` };
  if (defaultCm && n.v < 200) return { v: n.v * 10, note: `${n.raw}cm` };
  if (n.v < min && n.v * 10 >= min && n.v * 10 <= max) return { v: n.v * 10, note: `${n.raw}cm` };
  return { v: n.v, note: '' };
}

/* ---- clause interpreter ---------------------------------------------------------- */
const SELECTED_WORDS = ['selected', 'selected cabinet', 'selected unit', 'this unit', 'this cabinet', 'this one', 'current unit', 'current cabinet', 'it', 'المحدد', 'المختاره', 'الخزانه المحدده', 'هذه الوحده', 'هذي الوحده', 'هذه الخزانه', 'هذي الخزانه', 'هاي الخزانه'];
function unitRef(s, ctx) {
  const rowAlt = Object.entries(ROW_WORDS).flatMap(([row, ws]) => ws.map((w) => [row, N(w)])).sort((a, b) => b[1].length - a[1].length);
  for (const [row, w] of rowAlt) {
    const re = new RegExp(`(^|[\\s,.])${esc(w)}(?:\\s+(?:unit|units|cabinet|cabinets|وحده|وحدات|خزانه))?\\s*(?:no\\.?|number|#|رقم)?\\s*(\\d{1,2})(?=$|[\\s,.])`);
    const m = re.exec(s);
    if (m) return { row, idx: parseInt(m[2], 10) - 1, start: m.index + m[1].length, end: m.index + m[0].length };
  }
  // "unit 3" / "وحده 3" -> base row by default (or the active row)
  if (hasAny(s, SELECTED_WORDS) && ctx && ctx.selected) return { row: ctx.selected.row, id: ctx.selected.id, run: ctx.selected.rk, start: 0, end: 0, sel: true };
  const m2 = /(^|[\s,.])(?:unit|cabinet|وحده)\s*(?:no\.?|number|#|رقم)?\s*(\d{1,2})(?!\s*(?:mm|cm|مم|سم))(?=$|[\s,.])/.exec(s);
  if (m2) return { row: (ctx && ctx.row) || 'base', idx: parseInt(m2[2], 10) - 1, start: m2.index + m2[1].length, end: m2.index + m2[0].length };
  return null;
}
const runWord = (s, ctx) => {
  if (/(^|\s)(left|يسار|يسري|شمال)(\s|$)/.test(s)) return 'left';
  if (/(^|\s)(right|يمين|يمني)(\s|$)/.test(s)) return 'right';
  return (ctx && ctx.run) || 'main';
};
const WORDS_ADD = ['add', 'new', 'insert', 'create', 'append', 'اضف', 'زود وحده', 'ضيف', 'اضافه', 'زيد وحده'];
const WORDS_DEL = ['delete', 'remove', 'drop', 'erase', 'احذف', 'امسح', 'شيل', 'ازل', 'حذف', 'ازاله'];
const WORDS_UP = ['increase', 'raise', 'bigger', 'grow', 'add to', 'زود', 'زيد', 'كبر', 'ارفع', 'زياده'];
const WORDS_DOWN = ['decrease', 'reduce', 'lower', 'smaller', 'shrink', 'less', 'نقص', 'قلل', 'صغر', 'انقص', 'خفض', 'قلل'];


/* ---- section division commands for ONE cabinet ("two doors and three drawers", "3 sections", "move section 2 up") ----------- */
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, 'واحد': 1, 'واحده': 1, 'اثنين': 2, 'اثنان': 2, 'اتنين': 2, 'اثنتين': 2, 'ثلاثه': 3, 'ثلاث': 3, 'تلاته': 3, 'اربعه': 4, 'اربع': 4, 'خمسه': 5, 'خمس': 5, 'سته': 6, 'ست': 6, 'سبعه': 7, 'سبع': 7, 'ثمانيه': 8, 'ثمان': 8 };
const NUM_ALT = `\\d+|${Object.keys(NUMW).sort((a, b) => b.length - a.length).join('|')}`;
const DUALS = { 'بابين': ['door', 2], 'ضلفتين': ['door', 2], 'درجين': ['drawer', 2], 'رفين': ['open', 2] };
const KIND_ALT = (() => {
  const all = []; Object.entries(SEC_WORDS).forEach(([k, ws]) => ws.forEach((w) => all.push([N(w), k])));
  Object.entries(DUALS).forEach(([w, [k]]) => all.push([w, k]));
  all.sort((a, b) => b[0].length - a[0].length);
  return { re: all.map(([w]) => esc(w)).join('|'), map: new Map(all) };
})();
const toNum = (t) => (t === undefined || t === null || t === '' ? null : /^\d+$/.test(t) ? parseInt(t, 10) : NUMW[t] || null);
/** every "<count> <front kind>" pair in order: [{kind, n}] */
export function frontPairs(s) {
  // "<count> <kind>" (two doors / 3 drawers / و٣ أدراج) or, Arabic style, "<kind> <count>" (باب واحد); an attached و (and) is allowed
  const re = new RegExp(`(?:^|[\\s,.])(?:و)?(?:(${NUM_ALT})\\s+)?(${KIND_ALT.re})(?:\\s+(${NUM_ALT}))?(?=$|[\\s,.])`, 'g');
  const out = []; let m;
  while ((m = re.exec(s))) {
    const w = m[2]; const dual = DUALS[w];
    const suffix = !m[1] && m[3] ? toNum(m[3]) : null;
    out.push({ kind: dual ? dual[0] : KIND_ALT.map.get(w), n: dual ? dual[1] : toNum(m[1]) || suffix || 1 });
    re.lastIndex = m.index + m[0].length - (m[1] && m[3] ? m[3].length : 0); // a number after a counted kind belongs to the NEXT pair
  }
  return out;
}
const DIVIDE_VERB = /(^|\s)(divide|split|make|set|change|turn|build|configure|قسم|قسمها|قسمه|خلي|خليها|اجعل|اجعلها|غير|حول)(\s|$)/;
const SECTIONS_RE = new RegExp(`(?:^|\\s)(${NUM_ALT})\\s+(?:sections?|parts|اقسام|قسم)(?=$|[\\s,.])`);
const MOVE_RE = /(?:^|\s)(?:move|shift|send|نقل|انقل|حرك)\s+(?:section|sec|قسم)\s*(\d)\s+(up|down|top|bottom|first|last|اعلي|لاعلي|فوق|اسفل|لاسفل|تحت|الاول|الاخير)/;
function divideTarget(s, ctx) {
  const ref = unitRef(s, ctx);
  if (ref) return { row: ref.row, idx: ref.idx, id: ref.id, run: ref.run || (ctx && ctx.run), sel: !!ref.sel };
  if (ctx && ctx.selected) return { row: ctx.selected.row, id: ctx.selected.id, run: ctx.selected.rk || (ctx && ctx.run), sel: true };
  return null;
}
/** whole-sentence command for one cabinet's front division; null when the text is not one */
export function divideClause(clean, ctx) {
  const s = clean;
  const mv = MOVE_RE.exec(s);
  const sec = SECTIONS_RE.exec(s);
  const pairs = frontPairs(s);
  const verb = DIVIDE_VERB.test(s) && !/\d+\s*(mm|cm|مم|سم)/.test(s);
  if (!(mv || (sec && verb) || (verb && pairs.length >= 2))) return null;
  const tgt = divideTarget(s, ctx); if (!tgt) return null;
  const base = { row: tgt.row, idx: tgt.idx, id: tgt.id, run: tgt.run, sel: tgt.sel, text: s };
  if (mv) { const w = mv[2]; const to = /(top|first|الاول)/.test(w) ? 'first' : /(bottom|last|الاخير)/.test(w) ? 'last' : /(up|اعلي|لاعلي|فوق)/.test(w) ? 'up' : 'down'; return { type: 'unitSecMove', ...base, sec: +mv[1] - 1, to }; }
  if (pairs.length >= 2) return { type: 'unitDivide', ...base, secs: pairs };
  const n = toNum(sec[1]); if (!n || n < 1 || n > 8) return null;
  return { type: 'unitDivisions', ...base, n };
}

/* ---- NEO-KITCHEN-UX29: galley / peninsula / island sentences -------------------------------------------------------------------- */
const LX_WORDS = {
  /* the peninsula is tested before the island: "شبه جزيرة" contains "جزيرة" */
  peninsula: [/\bpeninsula\b/, /شبه جزيره|جزيره ممتده|بينسولا|بنسولا/],
  galley: [/\bgalley\b|parallel (kitchen|runs?|layout|rows?)|two (parallel )?runs?|corridor kitchen/, /متوازي|مطبخ ممر|صفين متقابلين|صفين متوازيين|جالي/],
  island: [/\bisland\b|free ?standing run/, /جزيره|ايلاند/],
};
const SIDE_LEFT = /(^|\s)(left|يسار|يسري|شمال)(\s|$)/; const SIDE_RIGHT = /(^|\s)(right|يمين|يمني)(\s|$)/;
const SEAT_RE = /(seating|\bseats?\b|\bstools?\b|breakfast bar|bar overhang|جلوس|كراسي|مقاعد|(^|\s)بار(\s|$))/;
const NEG_RE = /(^|\s)(no|without|remove|off|dont|don't|بدون|الغاء|ازل|ايقاف)(\s|$)/;
const GAP_RE = /(aisle|clearance|gap|away|apart|distance|ممر|خلوص|مسافه|بعد)/;
function layoutXClause(s) {
  const kind = ['peninsula', 'galley', 'island'].find((k) => LX_WORDS[k].some((re) => re.test(s)));
  if (!kind) return null;
  const ns = numbers(s);
  const out = { type: 'layoutX', kind, length: null, gap: null, side: SIDE_LEFT.test(s) ? 'left' : SIDE_RIGHT.test(s) ? 'right' : null, seat: SEAT_RE.test(s) ? !NEG_RE.test(s) : null, hint: /(hob|cooktop|موقد)/.test(s) ? 'hob' : /(sink|حوض|مغسله)/.test(s) ? 'sink' : null, from: '' };
  /* the number that follows an aisle / clearance word is the gap, the other number is the length (peninsula: the projection into the room) */
  const gapAt = GAP_RE.exec(s);
  const gapN = gapAt ? ns.find((n) => n.at >= gapAt.index) || ns.find((n) => n.end <= gapAt.index + gapAt[0].length + 1) : null;
  const lenN = ns.find((n) => n !== gapN);
  if (gapN) { const rg = kind === 'galley' ? XL.aisle : XL.gap; const r = smartMM(gapN, rg.min, rg.max); out.gap = r.v; if (r.note) out.from = r.note; }
  if (lenN && kind !== 'galley') {
    const rg = kind === 'island' ? XL.len.isl : { min: XL.len.pen.min - 600, max: XL.len.pen.max - 600 }; // peninsula: the projection beyond the main run
    const r = smartMM(lenN, rg.min, rg.max); out.length = r.v; if (r.note) out.from = r.note;
  }
  if (lenN && kind === 'galley' && !gapN) { const r = smartMM(lenN, XL.aisle.min, XL.aisle.max); out.gap = r.v; if (r.note) out.from = r.note; } // "galley 1200" = the aisle
  return out;
}
/** a short follow-up clause of the same sentence ("seating", "no end panels", "with a hob") that edits the layout block */
function layoutXOption(s) {
  const words = s.split(' ').length;
  if (words <= 5 && SEAT_RE.test(s) && !/(unit|cabinet|وحده|خزانه|\d+\s*(mm|cm|مم|سم))/.test(s)) return { type: 'xlOpt', key: 'seat', value: !NEG_RE.test(s) };
  /* only a clause that is nothing but "<n> aisle" / "clearance <n>" (numbers, units and filler words removed): "drawer side clearance 12" is a global control, not this */
  const bare = s.replace(/-?\d+(?:\.\d+)?\s*(?:mm|cm|m|in|مم|سم|متر)?/g, ' ').replace(/(^|\s)(?:the|a|an|of|is|to|at|set|make|with|width|عرض|ال)(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  const cl = /^(aisle|clearance|aisle clearance|ممر|خلوص)$/.exec(bare); const n1 = numbers(s)[0];
  if (cl && n1 && words <= 5) { const r = smartMM(n1, XL.gap.min, XL.gap.max); return { type: 'xlOpt', key: 'clear', value: r.v, from: r.note }; } // "1100 aisle" / "1000 clearance"
  if (words <= 4 && /(end panel|finished end|لوح نهايه)/.test(s)) return { type: 'xlOpt', key: 'endPanel', value: !NEG_RE.test(s) };
  if (words <= 4 && /^(a |the |with )?(hob|cooktop|sink|موقد|حوض)( cut.?out)?$/.test(s)) return { type: 'xlOpt', key: 'hint', value: /(hob|cooktop|موقد)/.test(s) ? 'hob' : 'sink' };
  return null;
}

function clause(sIn, ctx) {
  const s = sIn;
  if (!s) return null;
  // --- UI / meta commands
  if (/^(undo|تراجع|الغاء اخر امر|الغي)$/.test(s)) return { type: 'meta', action: 'undo' };
  if (/^(redo|اعاده)$/.test(s)) return { type: 'meta', action: 'redo' };
  const viewHit = [['3d', ['3d', '3 d', 'three d', 'ثلاثي الابعاد', 'ثري دي', 'عرض ثلاثي']], ['cut', ['cut list', 'cutlist', 'bom', 'cutting list', 'قائمه القص', 'قايمه القص', 'جدول القص']], ['design', ['elevation', 'design view', '2d', 'تصميم', 'واجهه']]]
    .find(([, ws]) => hasAny(s, ws));
  if (viewHit && /(show|open|go|switch|view|display|اعرض|افتح|روح|اظهر|^3d|^cut|^2d|^bom)/.test(s) && !/\d+\s*(mm|cm)/.test(s)) return { type: 'ui', action: 'view', value: viewHit[0] };
  if (hasAny(s, ['x-ray', 'xray', 'x ray', 'اشعه']) && !/off|hide|close|اخفاء|اغلق/.test(s)) return { type: 'ui', action: 'xray', value: true };
  if (hasAny(s, ['x-ray', 'xray', 'x ray', 'اشعه'])) return { type: 'ui', action: 'xray', value: false };
  if (hasAny(s, ['explode', 'exploded', 'تفكيك', 'فك'])) return { type: 'ui', action: 'explode', value: !/off|close|collapse|assemble|اغلق|تجميع/.test(s) };
  if (/(open|افتح|فتح).*(door|ابواب|باب)|(door|ابواب|باب).*(open|فتح)/.test(s) && !/\d/.test(s)) return { type: 'ui', action: 'open', value: !/close|اغلق|قفل/.test(s) };
  if (/(close|اغلق|قفل).*(door|ابواب|باب)/.test(s)) return { type: 'ui', action: 'open', value: false };
  if (/(inch|inches|انش|بوصه)/.test(s) && /(use|unit|switch|show|استخدم|وحده|بدل)/.test(s) && !/\d/.test(s)) return { type: 'ui', action: 'units', value: 'in' };
  if (/(millimet|\bmm\b|مليمتر|مم)/.test(s) && /(use|unit|switch|show|استخدم|وحده|بدل)/.test(s) && !/\d/.test(s)) return { type: 'ui', action: 'units', value: 'mm' };
  if (/(print|طباعه|اطبع)/.test(s)) return { type: 'ui', action: 'print' };
  if (/(export|download|save|صدر|نزل|احفظ).*(dxf)|dxf/.test(s)) return { type: 'ui', action: 'dxf' };
  if (/(export|download|save|صدر|نزل|احفظ).*(json)|json/.test(s)) return { type: 'ui', action: 'json' };

  // --- NEO-KITCHEN-UX29 layouts: galley / peninsula / island ("make it a galley", "add an island 1800 long", "peninsula 1200", EN + AR)
  const lx = layoutXClause(s);
  if (lx) return lx;
  const xo = layoutXOption(s);
  if (xo) return xo;

  // --- layout / legs / toggles
  if (/(u-shape|u shape|u-kitchen|شكل u|حرف u|شكل يو)/.test(s) || /(^|\s)u(\s|$)/.test(s) && /(layout|shape|kitchen|مطبخ)/.test(s)) return { type: 'layout', value: 'u' };
  if (/(?:^|\s)(?:l-left|l left|left l|l-shape left)(?:\s|$)|(?:ركن يسار|شكل l يسار|شكل ل يسار)/.test(s)) return { type: 'layout', value: 'l-left' };
  if (/(?:^|\s)(?:l-right|l right|right l|l-shape right)(?:\s|$)|(?:ركن يمين|شكل l يمين|شكل ل يمين)/.test(s)) return { type: 'layout', value: 'l-right' };
  if (/(straight|one wall|single wall|linear|مستقيم|خط واحد)/.test(s) && !/\d/.test(s)) return { type: 'layout', value: 'straight' };
  if (/(keep|lock|fix|hold|ثبت|ثبّت|احتفظ).*(width|عرض)|keep width|keep total/.test(s)) return { type: 'keepWidth', value: !/(off|unlock|disable|no |don't|dont|ايقاف|الغاء|بدون|فك)/.test(s) };
  if (/(top row|third row|third tier|top tier|الصف الثالث|صف ثالث)/.test(s) && !/\d{3}/.test(s)) return { type: 'topOn', value: !/(off|hide|disable|remove|ايقاف|اخف|الغاء|ازل)/.test(s) };

  const leg = /(leg|return|رجل|ساق|جناح)/.test(s) && /(left|right|يسار|يسري|يمين|يمني)/.test(s);
  if (leg) {
    const side = runWord(s, ctx);
    const prop = /(depth|عمق)/.test(s) ? 'depth' : /(length|long|طول)/.test(s) ? 'length' : /(height|ارتفاع)/.test(s) ? 'height' : null;
    const ns = numbers(s);
    if (prop && ns.length) { const rng = LEG[prop]; const r = smartMM(ns[ns.length - 1], rng.min, rng.max); return { type: 'leg', side, prop, value: r.v, from: r.note }; }
    if (/(enable|on|add|turn on|show|فعل|شغل|اضف|اظهر)/.test(s)) return { type: 'legOn', side, value: true };
    if (/(disable|off|remove|hide|turn off|ايقاف|الغاء|اخف|ازل)/.test(s)) return { type: 'legOn', side, value: false };
    /* UX-20: a bare "left leg" / "a left leg 150" (no verb, no property word) means: turn it on, with the number as its length */
    if (ns.length) { const r = smartMM(ns[ns.length - 1], LEG.length.min, LEG.length.max); return { type: 'leg', side, prop: 'length', value: r.v, from: r.note }; }
    return { type: 'legOn', side, value: true };
  }

  // --- kitchen total dimensions
  const kw = matchTable(s, KITCHEN_ALIASES);
  const ref = unitRef(s, ctx);

  // --- unit commands (a unit reference was given)
  if (ref) {
    const rest = (s.slice(0, ref.start) + ' ' + s.slice(ref.end)).replace(/\s+/g, ' ').trim();
    const base = { row: ref.row, idx: ref.idx, id: ref.id, run: ref.run || (ctx && ctx.run), sel: !!ref.sel };
    if (hasAny(rest, WORDS_DEL) || /^(delete|remove)/.test(rest)) return { type: 'unitDelete', ...base };
    const ns = numbers(rest);
    // type change
    const tw = Object.entries(TYPE_WORDS).find(([, ws]) => hasAny(rest, ws));
    const wMatch = /(width|wide|عرض\w*)/.exec(rest);
    const hMatch = /(height|high|ارتفاع\w*)/.exec(rest);
    if (wMatch && ns.length) {
      const after = ns.find((x) => x.at >= wMatch.index) || ns[ns.length - 1];
      const r = smartMM(after, UNIT_W.min, UNIT_W.max, true);
      const rel = hasAny(rest, WORDS_UP) ? 1 : hasAny(rest, WORDS_DOWN) ? -1 : 0;
      return { type: 'unitWidth', ...base, value: r.v, rel, from: r.note };
    }
    if (hMatch && ns.length) { const r = smartMM(ns[ns.length - 1], TALL_H.min, TALL_H.max, false); return { type: 'unitHeight', ...base, value: r.v }; }
    const sw = Object.entries(SEC_WORDS).map(([k, ws]) => [k, findWord(rest, ws)]).filter(([, w]) => w).sort((a, b) => b[1].length - a[1].length)[0];
    if (sw && !(tw && tw[0] !== 'normal' && sw[0] === 'door' && !ns.length && /tall|blind|diagonal|carousel|طويل|ركن|قطري|دوار/.test(rest))) {
      const cnt = ns.length ? Math.round(ns[ns.length - 1].raw) : null;
      const secM = /(?:section|sec|قسم)\s*(\d)/.exec(rest);
      return { type: 'unitSection', ...base, sec: secM ? +secM[1] - 1 : 0, kind: sw[0], n: cnt && cnt >= 1 && cnt <= 8 ? cnt : null };
    }
    if (tw) return { type: 'unitType', ...base, value: tw[0] };
    if (ns.length && /^(?:to|=|at)?\s*\d/.test(rest)) { const r = smartMM(ns[0], UNIT_W.min, UNIT_W.max, true); return { type: 'unitWidth', ...base, value: r.v, rel: 0, from: r.note }; }
    return null;
  }

  // --- add unit(s)
  if (hasAny(s, WORDS_ADD) || /^(add|new)/.test(s)) {
    const rowKey = Object.entries(ROW_WORDS).find(([, ws]) => hasAny(s, ws));
    if (rowKey || /(unit|cabinet|وحده|خزانه)/.test(s)) {
      const ns = numbers(s);
      const cm = ns.find((n) => /(width|wide|عرض)/.test(s) || n.unit);
      const cnt = ns.find((n) => !n.unit && n.raw >= 1 && n.raw <= 8 && !/(width|wide|عرض)/.test(s));
      return { type: 'unitAdd', row: rowKey ? rowKey[0] : (ctx && ctx.row) || 'base', run: ctx && ctx.run, count: cnt ? Math.round(cnt.raw) : 1, width: cm ? smartMM(cm, UNIT_W.min, UNIT_W.max, true).v : null };
    }
  }

  // --- finish / countertop / handles
  const ctWord = hasAny(s, ['countertop', 'counter top', 'counter', 'worktop', 'top surface', 'سطح', 'سطح العمل']);
  if (ctWord || hasAny(s, ['marble', 'quartz', 'granite', 'laminate', 'رخام', 'كوارتز', 'جرانيت'])) {
    const ct = Object.entries(COUNTER_WORDS).find(([, ws]) => hasAny(s, ws));
    if (ct && (ctWord || ct[0] !== 'oakslab')) return { type: 'counter', value: ct[0] };
  }
  if (hasAny(s, ['handle', 'handles', 'pull', 'knob', 'مقبض', 'مقابض', 'يد'])) {
    const lenN = numbers(s).find((n) => HANDLE_LENS.includes(Math.round(n.v)));
    const len = lenN ? Math.round(lenN.v) : null;
    const hw = Object.entries(HANDLE_WORDS).find(([, ws]) => hasAny(s, ws));
    const pos = /(top|أعلى|اعلي|فوق)/.test(s) ? 'top' : /(bottom|اسفل|تحت)/.test(s) ? 'bottom' : /(center|centre|middle|وسط)/.test(s) ? 'center' : /(auto|تلقائي)/.test(s) ? 'auto' : null;
    if (hw || len || pos) return { type: 'handle', style: hw ? hw[0] : null, len, pos };
  }
  const finishKey = Object.entries(FINISH_WORDS).find(([, ws]) => hasAny(s, ws));
  if (finishKey && (/(finish|color|colour|material|look|لون|تشطيب|خشب)/.test(s) || s.split(' ').length <= 3)) return { type: 'finish', value: finishKey[0] };

  // --- kitchen dims
  if (!kw && /^(?:a |the |my )?(?:kitchen|مطبخ)\s+\d/.test(s) && numbers(s).length === 1) { // UX-20: "kitchen 320 cm" / "مطبخ ٣٢٠ سم" = the main-run width
    const n = numbers(s)[0]; const r = smartMM(n, KITCHEN.width.min, KITCHEN.width.max, false);
    return { type: 'kitchenW', value: !n.unit && n.v < KITCHEN.width.min / 5 ? n.v * 10 : r.v, from: r.note };
  }
  if (kw) {
    const ns = numbers(s, kw.end);
    const all = ns.length ? ns : numbers(s);
    if (all.length) {
      const rng = kw.key === 'width' ? KITCHEN.width : KITCHEN.height;
      const r = smartMM(all[0], rng.min, rng.max, false);
      const v = !all[0].unit && all[0].v < rng.min / 5 ? all[0].v * 10 : r.v;
      return { type: kw.key === 'width' ? 'kitchenW' : 'kitchenH', value: v, from: r.note };
    }
  }

  // --- global controls
  const hit = matchTable(s, ALIASES);
  if (hit) {
    const ns = numbers(s, hit.end);
    const nn = ns.length ? ns[0] : numbers(s)[0];
    if (nn) {
      const f = FIELD[hit.key];
      const r = smartMM(nn, f.min, f.max);
      const rel = hasAny(s, WORDS_UP) ? 1 : hasAny(s, WORDS_DOWN) ? -1 : 0;
      return { type: 'global', k: hit.key, value: r.v, rel: /\bby\b|بمقدار/.test(s) || rel ? rel || 1 : 0, from: r.note };
    }
  }
  return null;
}

export function interpret(text, ctx = {}) {
  const clean = N(text);
  const dv = divideClause(clean, ctx);
  if (dv) return { items: [dv], rest: [] };
  const parts = clean.split(/\s+(?:and then|then|and|also|with|plus|ثم|مع|و)\s+|[,;]+|\s+&\s+/).map((x) => x.trim()).filter(Boolean);
  const items = [], rest = [];
  parts.forEach((p) => { const c = clause(p, ctx); if (c) items.push({ ...c, text: p }); else rest.push(p); });
  return { items, rest };
}

const isCorner = (u) => u.type === 'blind' || u.type === 'carousel' || u.type === 'diagonal';
const divideSecs = (pairs) => pairs.slice(0, 8).map(({ kind, n }) => {
  const t = SECTYPES[kind] ? kind : 'door';
  return { t, n: clamp(n, 1, t === 'door' || t === 'glass' || t === 'sink' ? 4 : 8) };
});
/** destination index of a "move section" command, or null when it would not move */
export function moveTarget(cmd, count) {
  const to = cmd.to === 'first' ? 0 : cmd.to === 'last' ? count - 1 : cmd.to === 'up' ? cmd.sec - 1 : cmd.sec + 1;
  return to < 0 || to >= count || to === cmd.sec ? null : to;
}

/* ---- plan: human-readable review cards ------------------------------------------ */
function findUnit(model, cmd, ctx) {
  const first = cmd.run || (ctx && ctx.run) || 'main';
  const order = [first, ...['main', 'left', 'right', 'run2', 'pen', 'isl'].filter((k) => k !== first)].filter((k) => model.runs[k]);
  for (const rk of (cmd.id ? order : [first])) {
    const arr = (model.runs[rk] && model.runs[rk][cmd.row]) || [];
    const u = cmd.id ? arr.find((x) => x.id === cmd.id) : arr[cmd.idx];
    if (u) return { u, rk, row: cmd.row, idx: arr.indexOf(u) };
  }
  return null;
}
const rowName = { en: { base: 'Base', wall: 'Wall', top: 'Top' }, ar: { base: 'قاعدة', wall: 'علوي', top: 'ثالث' } };

export function plan(cmds, model, lang = 'en', ctx = {}) {
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return cmds.map((cmd, idx) => {
    const card = { cmd, ok: true, title: '', detail: '', note: '' };
    switch (cmd.type) {
      case 'global': {
        const f = FIELD[cmd.k]; const cur = model.g[cmd.k];
        const want = cmd.rel ? cur + cmd.rel * cmd.value : cmd.value;
        const c = clampSpec(cmd.k, want);
        card.title = L(f.en, f.ar);
        card.detail = `${cur} mm  →  ${c.value} mm`;
        if (c.clamped) card.note = L(`Requested ${Math.round(want * 10) / 10} is outside ${c.min}-${c.max} mm: clamped to ${c.value}.`, `القيمة ${Math.round(want * 10) / 10} خارج المدى ${c.min}-${c.max} مم: تم ضبطها على ${c.value}.`);
        else if (cmd.from) card.note = L(`Read "${cmd.from}" as ${c.value} mm.`, `تمت قراءة "${cmd.from}" كـ ${c.value} مم.`);
        break;
      }
      case 'kitchenW': card.title = L('Kitchen width (main run)', 'عرض المطبخ (الصف الرئيسي)'); card.detail = `${rowWidth(model.runs.main.base)} mm → ${clamp(Math.round(cmd.value), KITCHEN.width.min, KITCHEN.width.max)} mm`; if (cmd.value < KITCHEN.width.min || cmd.value > KITCHEN.width.max) card.note = L(`Range ${KITCHEN.width.min}-${KITCHEN.width.max} mm.`, `المدى ${KITCHEN.width.min}-${KITCHEN.width.max} مم.`); break;
      case 'kitchenH': card.title = L('Kitchen height (base + wall)', 'ارتفاع المطبخ (سفلي + علوي)'); card.detail = `→ ${clamp(Math.round(cmd.value), KITCHEN.height.min, KITCHEN.height.max)} mm`; if (cmd.value < KITCHEN.height.min || cmd.value > KITCHEN.height.max) card.note = L(`Range ${KITCHEN.height.min}-${KITCHEN.height.max} mm.`, `المدى ${KITCHEN.height.min}-${KITCHEN.height.max} مم.`); break;
      case 'leg': {
        const rng = LEG[cmd.prop]; const c = clamp(Math.round(cmd.value), rng.min, rng.max);
        card.title = L(`${cmd.side} leg ${cmd.prop}`, `الرجل ${cmd.side === 'left' ? 'اليسرى' : 'اليمنى'}: ${cmd.prop}`);
        card.detail = `→ ${c} mm`; if (c !== Math.round(cmd.value)) card.note = L(`Range ${rng.min}-${rng.max} mm: clamped.`, `المدى ${rng.min}-${rng.max} مم: تم الضبط.`);
        break;
      }
      case 'legOn': card.title = L(`${cmd.value ? 'Enable' : 'Disable'} ${cmd.side} leg`, `${cmd.value ? 'تفعيل' : 'إيقاف'} الرجل ${cmd.side === 'left' ? 'اليسرى' : 'اليمنى'}`); break;
      case 'layout': card.title = L(`Layout: ${cmd.value}`, `التخطيط: ${cmd.value}`); break;
      case 'layoutX': {
        const nm = { galley: ['Galley', 'مطبخ ممر'], peninsula: ['Peninsula', 'جزيرة ممتدة'], island: ['Island', 'جزيرة'] }[cmd.kind];
        const next = execute(model, cmd).model;
        const bits = [];
        if (cmd.kind === 'island' && cmd.length) bits.push(`${rowWidth(next.runs.isl.base)} mm`);
        if (cmd.kind === 'peninsula' && cmd.length) bits.push(`${penProjection(next)} mm ${L('projection', 'امتداد')}`);
        if (cmd.kind === 'galley' && cmd.gap) bits.push(`${L('aisle', 'ممر')} ${next.xl.aisle} mm`);
        if (cmd.kind === 'island' && cmd.gap) bits.push(`${L('clearance', 'خلوص')} ${next.xl.gap} mm`);
        if (cmd.seat !== null && cmd.seat !== undefined) bits.push(cmd.seat ? L('seating overhang', 'بروز للجلوس') : L('no seating overhang', 'بدون بروز'));
        if (cmd.side) bits.push(cmd.side === 'left' ? L('left end', 'الطرف الأيسر') : L('right end', 'الطرف الأيمن'));
        card.title = L(`Layout: ${nm[0]}`, `التخطيط: ${nm[1]}`);
        card.detail = bits.join(' · ');
        const warn = layoutIssues(next).filter((w) => w.level !== 'info')[0];
        if (warn) card.note = lang === 'ar' ? warn.ar : warn.en;
        else if (cmd.from) card.note = L(`Read "${cmd.from}" as a length in mm.`, `تمت قراءة "${cmd.from}" كطول بالمليمتر.`);
        else card.note = L('Legs are switched off: one layout at a time. Undo brings the previous layout back.', 'الأرجل مُطفأة: تخطيط واحد في كل مرة. التراجع يعيد التخطيط السابق.');
        break;
      }
      case 'xlOpt': {
        const labels = { seat: ['Seating overhang', 'بروز للجلوس'], endPanel: ['Finished end panel', 'لوح نهاية مشطّب'], hint: ['Worktop cut-out hint', 'تلميح فتحة السطح'], clear: ['Aisle / clearance', 'الممر / الخلوص'] }[cmd.key];
        card.title = L(`${labels[0]}: ${cmd.key === 'hint' ? cmd.value : cmd.key === 'clear' ? `${cmd.value} mm` : cmd.value ? 'ON' : 'OFF'}`, `${labels[1]}: ${cmd.key === 'hint' ? (cmd.value === 'hob' ? 'موقد' : 'حوض') : cmd.key === 'clear' ? `${cmd.value} مم` : cmd.value ? 'تشغيل' : 'إيقاف'}`);
        /* the layout this option will meet: a layout command earlier in the same sentence wins over the saved model ("island 1800 long with seating") */
        const earlier = cmds.slice(0, idx).filter((c) => c.type === 'layoutX').pop();
        const k = earlier ? earlier.kind : xlKind(model);
        const bad = !k || (cmd.key === 'hint' && k !== 'island') || ((cmd.key === 'seat' || cmd.key === 'endPanel') && k === 'galley') || (cmd.key === 'clear' && k === 'peninsula');
        if (bad) { card.ok = false; card.note = cmd.key === 'clear' ? L('The aisle / clearance belongs to a galley or an island - choose one first.', 'الممر / الخلوص يخص المطبخ الممر أو الجزيرة - اختر أحدهما أولاً.') : L('Choose a peninsula or an island first (e.g. "add an island 1800 long").', 'اختر جزيرة ممتدة أو جزيرة أولاً (مثال: «أضف جزيرة ١٨٠٠»).'); }
        break;
      }
      case 'keepWidth': card.title = L(`Keep total run width: ${cmd.value ? 'ON' : 'OFF'}`, `تثبيت إجمالي العرض: ${cmd.value ? 'تشغيل' : 'إيقاف'}`); break;
      case 'topOn': card.title = L(`Top (third) row: ${cmd.value ? 'ON' : 'OFF'}`, `الصف الثالث: ${cmd.value ? 'تشغيل' : 'إيقاف'}`); break;
      case 'finish': card.title = L(`Finish: ${FINISHES[cmd.value].en}`, `التشطيب: ${FINISHES[cmd.value].ar}`); break;
      case 'counter': card.title = L(`Countertop: ${COUNTERS[cmd.value].en}`, `سطح العمل: ${COUNTERS[cmd.value].ar}`); break;
      case 'handle': card.title = L('Handles', 'المقابض'); card.detail = [cmd.style && HANDLES[cmd.style][lang], cmd.len && `${cmd.len} mm`, cmd.pos].filter(Boolean).join(' · '); break;
      case 'unitAdd':
        card.title = L(`Add ${cmd.count} ${rowName.en[cmd.row]} unit${cmd.count > 1 ? 's' : ''}`, `إضافة ${cmd.count} وحدة ${rowName.ar[cmd.row]}`); card.detail = cmd.width ? `${cmd.width} mm` : '';
        if ((cmd.run === 'pen' || cmd.run === 'isl') && cmd.row !== 'base') { card.ok = false; card.note = L('A peninsula / island has no wall or top units.', 'الجزيرة الممتدة / الجزيرة بلا وحدات علوية أو ثالثة.'); }
        break;
      default: {
        const hit = findUnit(model, cmd, ctx);
        const nm = `${L(rowName.en[cmd.row], rowName.ar[cmd.row])} ${hit ? hit.idx + 1 : (cmd.idx || 0) + 1}`;
        if (!hit) { card.ok = false; card.title = nm; card.detail = L('Unit not found.', 'الوحدة غير موجودة.'); break; }
        if (cmd.type === 'unitWidth') {
          const want = cmd.rel ? hit.u.w + cmd.rel * cmd.value : cmd.value;
          const w = clamp(Math.round(want), UNIT_W.min, UNIT_W.max);
          card.title = L(`${nm} width`, `عرض ${nm}`); card.detail = `${hit.u.w} mm → ${w} mm`;
          if (w !== Math.round(want)) card.note = L(`Range ${UNIT_W.min}-${UNIT_W.max} mm: clamped.`, `المدى ${UNIT_W.min}-${UNIT_W.max} مم: تم الضبط.`);
          else if (cmd.from) card.note = L(`Read "${cmd.from}" as ${w} mm.`, `تمت قراءة "${cmd.from}" كـ ${w} مم.`);
          else if (model.keepWidth) card.note = L('Other units share the change (total stays fixed).', 'باقي الوحدات تتشارك التغيير (الإجمالي ثابت).');
        } else if (cmd.type === 'unitHeight') { card.title = L(`${nm} height`, `ارتفاع ${nm}`); card.detail = `→ ${clamp(Math.round(cmd.value), TALL_H.min, TALL_H.max)} mm`; if (hit.u.type !== 'tall') { card.ok = false; card.note = L('Only tall units have their own height.', 'الوحدات الطويلة فقط لها ارتفاع خاص.'); } }
        else if (cmd.type === 'unitDelete') { card.title = L(`Delete ${nm}`, `حذف ${nm}`); }
        else if (cmd.type === 'unitType') { card.title = L(`${nm} → ${UNIT_TYPES[cmd.value].en}`, `${nm} ← ${UNIT_TYPES[cmd.value].ar}`); }
        else if (cmd.type === 'unitDivide' || cmd.type === 'unitDivisions' || cmd.type === 'unitSecMove') {
          const corner = hit.u.type === 'blind' || hit.u.type === 'carousel' || hit.u.type === 'diagonal';
          if (corner) { card.ok = false; card.title = nm; card.note = L('Corner units have one special front - no sections to edit.', 'وحدات الركن لها واجهة خاصة واحدة - لا أقسام للتعديل.'); }
          else if (cmd.type === 'unitDivide') {
            const secs = divideSecs(cmd.secs);
            card.title = L(`${nm}: divide into ${secs.length} section${secs.length > 1 ? 's' : ''}`, `${nm}: تقسيم إلى ${secs.length} أقسام`);
            card.detail = secs.map((x) => `${SECTYPES[x.t][lang]} x${x.n}`).join('  |  ');
            card.note = cmd.secs.length > 8 ? L('At most 8 sections: the rest were ignored.', 'الحد الأقصى ٨ أقسام: تم تجاهل الباقي.') : L('Each pair is one section (doors = leaves, drawers = drawers).', 'كل زوج قسم واحد (الأبواب = ضلف، الأدراج = أدراج).');
          } else if (cmd.type === 'unitDivisions') {
            card.title = L(`${nm}: ${cmd.n} section${cmd.n > 1 ? 's' : ''}`, `${nm}: ${cmd.n} أقسام`); card.detail = `${hit.u.secs.length} -> ${cmd.n}`;
          } else {
            const to = moveTarget(cmd, hit.u.secs.length);
            if (to === null || cmd.sec >= hit.u.secs.length) { card.ok = false; card.note = L(`Section ${cmd.sec + 1} cannot move that way.`, `لا يمكن نقل القسم ${cmd.sec + 1} بهذا الاتجاه.`); }
            card.title = L(`${nm}: move section ${cmd.sec + 1} ${cmd.to}`, `${nm}: نقل القسم ${cmd.sec + 1}`); if (to !== null) card.detail = `${cmd.sec + 1} -> ${to + 1}`;
          }
        }
        else if (cmd.type === 'unitSection') { card.title = L(`${nm}: section ${cmd.sec + 1} → ${SECTYPES[cmd.kind].en}${cmd.n ? ' ×' + cmd.n : ''}`, `${nm}: القسم ${cmd.sec + 1} ← ${SECTYPES[cmd.kind].ar}${cmd.n ? ' ×' + cmd.n : ''}`); }
      }
    }
    return card;
  });
}

/* ---- execute --------------------------------------------------------------------- */
export function execute(model, cmd, ctx = {}) {
  let m = model;
  switch (cmd.type) {
    case 'global': { const cur = m.g[cmd.k]; return { model: setGlobal(m, cmd.k, cmd.rel ? cur + cmd.rel * cmd.value : cmd.value).model }; }
    case 'kitchenW': return { model: setRunWidth(m, 'main', cmd.value).model };
    case 'kitchenH': return { model: setKitchenHeight(m, cmd.value).model };
    case 'leg': return { model: setLeg(toggleLeg(m, cmd.side, true), cmd.side, cmd.prop, cmd.value).model };
    case 'legOn': return { model: toggleLeg(m, cmd.side, cmd.value) };
    case 'layout': return { model: setLayout(m, cmd.value) };
    case 'layoutX': {
      const fresh = xlKind(m) !== cmd.kind;
      m = setLayout(m, cmd.kind);
      const patch = {};
      if (cmd.kind === 'galley' && cmd.gap) patch.aisle = cmd.gap;
      if (cmd.kind === 'island' && cmd.gap) patch.gap = cmd.gap;
      if (cmd.side && cmd.kind === 'peninsula') patch.side = cmd.side;
      if (cmd.seat !== null && cmd.seat !== undefined && cmd.kind !== 'galley') patch.seatOn = cmd.seat;
      if (cmd.hint && cmd.kind === 'island') patch.hint = cmd.hint;
      if (Object.keys(patch).length) m = setXl(m, patch);
      if (cmd.length && cmd.kind === 'island') {
        m = setRunWidth(m, 'isl', cmd.length).model;
        if (fresh || true) m = setXl(m, { off: Math.round((rowWidth(m.runs.main.base) - rowWidth(m.runs.isl.base)) / 2 / 10) * 10 }); // keep the island centred on the main run
      }
      if (cmd.length && cmd.kind === 'peninsula') m = setRunWidth(m, 'pen', penLengthFor(m, cmd.length)).model;
      return { model: m };
    }
    case 'xlOpt': {
      if (!m.xl) return { model: m };
      if (cmd.key === 'seat') return { model: setXl(m, { seatOn: cmd.value }) };
      if (cmd.key === 'endPanel') return { model: setXl(m, { endPanel: cmd.value }) };
      if (cmd.key === 'hint') return { model: setXl(m, { hint: cmd.value }) };
      if (cmd.key === 'clear') return { model: setXl(m, m.xl.kind === 'galley' ? { aisle: cmd.value } : m.xl.kind === 'island' ? { gap: cmd.value } : {}) };
      return { model: m };
    }
    case 'keepWidth': return { model: { ...m, keepWidth: cmd.value } };
    case 'topOn': return { model: { ...m, topOn: cmd.value } };
    case 'finish': return { model: { ...m, finish: cmd.value } };
    case 'counter': return { model: { ...m, counter: cmd.value } };
    case 'handle': return { model: { ...m, handle: { ...m.handle, ...(cmd.style ? { style: cmd.style } : {}), ...(cmd.len ? { len: cmd.len } : {}), ...(cmd.pos ? { pos: cmd.pos } : {}) } } };
    case 'unitAdd': {
      const rk = cmd.run || 'main';
      if ((rk === 'pen' || rk === 'isl') && cmd.row !== 'base') return { model: m }; // nothing is built there
      for (let i = 0; i < cmd.count; i++) {
        m = addUnit(m, rk, cmd.row, newUnit(cmd.row, cmd.width ? { w: clamp(cmd.width, UNIT_W.min, UNIT_W.max) } : undefined));
      }
      return { model: m };
    }
    default: break;
  }
  const hit = findUnit(m, cmd, ctx);
  if (!hit) return { model: m };
  switch (cmd.type) {
    case 'unitWidth': return { model: setUnitWidth(m, hit.rk, hit.row, hit.u.id, cmd.rel ? hit.u.w + cmd.rel * cmd.value : cmd.value).model };
    case 'unitHeight': return { model: patchUnit(m, hit.rk, hit.row, hit.u.id, (u) => (u.type === 'tall' ? { ...u, h: cmd.value } : u)) };
    case 'unitDelete': return { model: deleteUnit(m, hit.rk, hit.row, hit.u.id) };
    case 'unitType': return { model: setUnitType(m, hit.rk, hit.row, hit.u.id, cmd.value) };
    case 'unitDivide': return { model: patchUnit(m, hit.rk, hit.row, hit.u.id, (u) => (isCorner(u) ? u : { ...u, secs: divideSecs(cmd.secs).map((x) => newSection(x.t, x.n, { hinge: (u.secs[0] && u.secs[0].hinge) || 'L' })) })) };
    case 'unitDivisions': return { model: patchUnit(m, hit.rk, hit.row, hit.u.id, (u) => (isCorner(u) ? u : setSecCount(u, cmd.n))) };
    case 'unitSecMove': { const to = moveTarget(cmd, hit.u.secs.length); return { model: to === null || isCorner(hit.u) ? m : moveSection(m, hit.rk, hit.row, hit.u.id, cmd.sec, to) }; }
    case 'unitSection': return { model: patchUnit(m, hit.rk, hit.row, hit.u.id, (u) => {
      const secs = u.secs.map((s) => ({ ...s }));
      const i = Math.min(cmd.sec, secs.length - 1);
      secs[i] = newSection(SECTYPES[cmd.kind] ? cmd.kind : 'door', cmd.n || (cmd.kind === 'door' ? Math.max(1, secs[i].n) : cmd.kind === 'drawer' ? 3 : 1), { hinge: secs[i].hinge });
      return { ...u, secs };
    }) };
    default: return { model: m };
  }
}
