/* =============================================================================
 * Neo Wardrobe Studio [NEO-CLOSETS-UX22] - Haneen (Bonsai assistant) for wardrobes: pure interpreter, planner and executor.
 * Text (English or Arabic) -> commands -> review cards -> a NEW design object. Nothing here draws geometry: the commands only
 * change the same design the Parameters panel edits, so the 3D view, cut list and exports follow exactly as for a manual edit.
 * Full descriptions ("4m sliding wardrobe, two hanging, three drawers") go through the existing, tested wardrobe parser
 * (neo/engines/wardrobe/aiparse.mjs). That parser is English-only; the short commands below also understand Arabic.
 * ===========================================================================*/
import { normDigits } from '../neoKitchen/model';
import { PERSONA, dayPart } from '../neoKitchen/persona';
import { parseWardrobeBrief, commandToConfig } from '../neo/engines/wardrobe/aiparse.mjs';
import { optimizeModules, normRules } from '../neo/engines/wardrobe/config.mjs';
import { remapModules, normalizeX, doorSystemFor, HANG_KEYS, distribute } from './wardrobeModel';

const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const AR_WORD = { 'واحد': 1, 'واحدة': 1, 'اثنين': 2, 'اثنان': 2, 'ثلاثة': 3, 'ثلاث': 3, 'اربعة': 4, 'أربعة': 4, 'اربع': 4, 'أربع': 4, 'خمسة': 5, 'خمس': 5 };
const EN_WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

export const EXAMPLES = {
  en: ['add 3 drawers inside', 'doors out', 'column 2 drawers inside, door outside', '4m sliding wardrobe, two hanging, three drawers', 'width 3000', 'height 2300', 'column 2 drawers 4', 'column 1 double hanging', 'hinged glass doors', 'smoked glass doors, 2 divisions', 'L-shape with a right wing 1200', 'return column 1 drawers 3', 'show 3d', 'x-ray', 'open doors', 'daylight', 'hide clothes'],
  ar: ['أضف ٣ أدراج داخلية', 'الباب بره', 'عمود ٢ أدراج داخل والباب بره', 'خزانة ٣ متر منزلقة', 'عرض ٣٠٠٠', 'ارتفاع ٢٣٠٠', 'عمود ٢ أدراج ٤', 'عمود ١ تعليق مزدوج', 'أبواب زجاج مفصلية', 'زجاج مدخن، تقسيمات ٢', 'خزانة L بجناح يمين ١٢٠٠', 'عمود الجناح ١ أدراج ٣', 'اعرض ثلاثي الأبعاد', 'أشعة', 'افتح الأبواب', 'ضوء النهار', 'أخفِ الملابس'],
};

/** the assistant's first message: only describes what the interpreter below really does */
export function wardrobeGreeting(lang, date = new Date()) {
  const part = dayPart(date);
  if (lang === 'ar') {
    const hi = part === 'morning' ? 'صباح الخير' : 'مساء الخير';
    return `${hi}! أهلًا بيك في ${PERSONA.company.ar}، أنا ${PERSONA.name.ar} وهساعدك تصمم خزانتك. اوصفلي العرض والارتفاع ونوع الأبواب (منزلقة أو مفصلية أو مفتوحة) وعدد الأدراج والتعليق — أو غيّر عمودًا واحدًا. كل تغيير يُعرض للمراجعة قبل التطبيق، وزر التراجع يرجّع التصميم السابق.`;
  }
  const hi = part === 'morning' ? 'Good morning' : part === 'afternoon' ? 'Good afternoon' : 'Good evening';
  return `${hi}! Welcome to ${PERSONA.company.en} — I'm ${PERSONA.name.en} and I'll help you design your wardrobe. Tell me the width, height and door type (sliding, hinged or open), the drawers and hanging — or change one column. Every change is shown for review before it is applied, and Undo brings the previous design back.`;
}

const num = (s) => { const n = parseFloat(normDigits(s).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const toMm = (v, unit) => { if (v == null) return null; const u = (unit || '').toLowerCase(); if (u === 'cm' || u === 'سم') return Math.round(v * 10); if (u === 'm' || u === 'متر') return Math.round(v * 1000); if (u === 'mm' || u === 'مم') return Math.round(v); return v < 50 ? Math.round(v * 1000) : v < 400 ? Math.round(v * 10) : Math.round(v); };
/** a drawer height: cm / سم x10, mm as is; a bare number below 40 is read as cm */
const heightMm = (v, unit) => { if (v == null) return null; const u = (unit || '').toLowerCase(); return u === 'cm' || u === 'سم' ? Math.round(v * 10) : u === 'mm' || u === 'مم' ? Math.round(v) : v < 40 ? Math.round(v * 10) : Math.round(v); };
const wordNum = (w) => (w == null ? null : /^[\d٠-٩.]+$/.test(w) ? num(w) : EN_WORD[w] || AR_WORD[w] || null);

/* [NEO-CLOSETS-UX30] drawers inside the carcass, the door outside: EN + AR words */
const DRAWERW = /drawers?|أدراج|ادراج|درج/;
const INSIDE_RE = /\b(inside|internal|inner|within|interior)\b|داخل(?:ي|ية|يه)?|جوا|بالداخل|جوه/;
const DOOR_OUT_RE = /\b(doors?|shutters?)\s*(out|outside|outer|outward|over|covering|covers?)\b|\b(outer|outside) doors?\b|(?:الباب|الابواب|الأبواب|ضلف)\s*(?:بره|برة|بالخارج|خارج|خارجي\S*|فوق\s*الأدراج|فوق\s*الادراج|يغطي)/;
const DOOR_ABOVE_RE = /\b(doors?)\s*(?:stops? )?(?:above|on top of)\s*(?:the )?drawers?\b|\bshort doors?\b|الباب\s*(?:يتوقف )?فوق\s*(?:ال)?(?:أدراج|ادراج)/;
const DRAWER_FRONT_RE = /\b(exposed|visible)\s+drawers?\b|\bdrawers?\s+(?:in front|exposed|visible|outside)\b|\bdrawer fronts?\b|أدراج\s*(?:أمامي\S*|امامي\S*|ظاهر\S*|بره|برة)/;
const drawerModeWords = (c) => {
  const doorOut = DOOR_OUT_RE.test(c); const doorAbove = DOOR_ABOVE_RE.test(c);
  const front = DRAWER_FRONT_RE.test(c) && !doorOut;
  const inside = (INSIDE_RE.test(c) && DRAWERW.test(c) && !front) || doorOut || doorAbove;
  return { inside, front, cover: doorAbove ? 'above' : doorOut ? 'full' : null };
};

const UI_WORDS = [
  [/\b(show |open |go to )?(3d|three d)\b|ثلاثي(?: الأبعاد)?|اعرض ثلاثي/, { action: 'view', value: '3d' }],
  [/\b(cut ?list|cutting list)\b|قائمة القص/, { action: 'view', value: 'cut' }],
  [/\b(show |go to )?(design|elevation|2d)\b|^تصميم$|واجهة|اعرض التصميم/, { action: 'view', value: 'design' }],
  [/\b(no|hide|disable|turn off) x-?ray\b|إخفاء الأشعة|اغلق الاشعة/, { action: 'xray', value: false }],
  [/\bx-?ray\b|أشعة|اشعة/, { action: 'xray', value: true }],
  [/\b(no|stop|hide) explode\b|اغلق التفكيك/, { action: 'explode', value: false }],
  [/\bexplode\b|تفكيك|فكك/, { action: 'explode', value: true }],
  [/\b(close|shut) (the )?(doors|drawers)\b|اغلق الأبواب|أغلق الأبواب/, { action: 'open', value: false }],
  [/\bopen (the )?(doors|drawers|all)\b|افتح الأبواب|افتح الكل/, { action: 'open', value: true }],
  [/\b(no |turn off |disable )daylight\b|\bstandard look\b|إيقاف ضوء النهار/, { action: 'daylight', value: false }],
  [/\bdaylight\b|ضوء النهار/, { action: 'daylight', value: true }],
  [/\b(hide|remove|no|without) (the )?clothes\b|(أخف|اخف|بدون)\S* الملابس/, { action: 'clothes', value: false }],
  [/\b(show|add|with) (the )?clothes\b|اعرض الملابس|أظهر الملابس/, { action: 'clothes', value: true }],
];

/** text -> { items, rest }. Items: { type:'ui', action, value } | { type:'design', kind, ... } | { type:'meta', action:'undo'|'redo' } */
export function interpretWardrobe(textIn, design) {
  const text = normDigits(String(textIn || '')).toLowerCase().trim();
  const items = []; const rest = [];
  if (!text) return { items, rest };
  /* a whole wardrobe description ("4m sliding wardrobe, two hanging, three drawers") goes to the wardrobe parser as one piece */
  const wingish = /\bl[- ]?shape(d)?\b|\bwing\b|جناح|خزانة l\b|حرف l/.test(text); // an L-shape / return-wing command is a short command, not a whole description
  if (!wingish && /(wardrobe|closet|خزانة|دولاب)/.test(text) && /(\d|hanging|drawer|shel|shoe)/.test(text)) {
    const cmd = parseWardrobeBrief(text);
    if (cmd.command === 'CREATE_WARDROBE') {
      const dmw = drawerModeWords(text); // "... three drawers inside, doors out": the brief parser knows no drawer position, so it rides as a second command after the new design
      return { items: [{ type: 'design', kind: 'brief', cmd, text }, ...(dmw.inside || dmw.front || dmw.cover ? [{ type: 'design', kind: 'drawerMode', mode: dmw.inside ? 'inside' : 'front', cover: dmw.cover, count: null }] : [])], rest };
    }
  }
  const clauses = text.split(/[,;،]|\band\b|\bthen\b|\bثم\b/).map((s) => s.trim()).filter(Boolean);
  const nCols = (design && design.mods ? design.mods.length : 1);
  let lastCol = null; // the column item of the previous clause: "column 2 drawers inside, door outside" - the second clause is about the same column
  clauses.forEach((c) => {
    if (/^(undo|تراجع)$/.test(c)) { items.push({ type: 'meta', action: 'undo' }); return; }
    if (/^(redo|إعادة|اعادة)$/.test(c)) { items.push({ type: 'meta', action: 'redo' }); return; }
    const ui = UI_WORDS.find(([re]) => re.test(c));
    if (ui) { items.push({ type: 'ui', ...ui[1] }); return; }

    /* one column: "column 2 drawers 4" / "column 1 double hanging" / "column 3 shelves 5" / "عمود ٢ أدراج ٤" */
    const wcol = c.match(/(?:(?:return|wing)\s*(?:column|col)|عمود\s*الجناح)\s*(\d+)/);
    const col = wcol || c.match(/(?:column|col|section|عمود)\s*(\d+)/);
    if (col) {
      const wingCols = design && design.x && design.x.wing && design.x.wing.mods ? design.x.wing.mods.length : 0;
      const idx = clampN(parseInt(col[1], 10), 1, wcol ? Math.max(1, wingCols) : nCols) - 1;
      const patch = {};
      const W6 = '(\\d+|one|two|three|four|five|six)';
      const cc = c.replace(col[0], ' '); // the column's own number must not be read as a count ("column 2 drawers inside")
      const pick = (nouns) => { const a = cc.match(new RegExp(`(?:${nouns})\\s*${W6}`)); const b = cc.match(new RegExp(`${W6}\\s*(?:${nouns})`)); return a ? wordNum(a[1]) : b ? wordNum(b[1]) : null; };
      const dr = pick('drawers?|أدراج|ادراج|درج'); if (dr != null) patch.drawers = dr;
      const sh = pick('shel(?:f|ves)|رفوف|رف'); if (sh != null) patch.shelves = sh;
      const dmw = drawerModeWords(c);
      if (dmw.inside) patch.dMode = 'inside'; else if (dmw.front) patch.dMode = 'front';
      if (dmw.cover) patch.cover = dmw.cover;
      const dh = c.match(/(?:drawer height|ارتفاع الدرج)\s*(?:of|is|=|:)?\s*([\d.,]+)\s*(mm|cm|مم|سم)?/);
      if (dh) { const v = heightMm(num(dh[1]), dh[2]); if (v) patch.drawerH = v; }
      if (/double hang|تعليق مزدوج/.test(c)) patch.hanging = 'double';
      else if (/long hang|تعليق طويل/.test(c)) patch.hanging = 'long';
      else if (/no hang|without hang|بدون تعليق/.test(c)) patch.hanging = 'none';
      else if (/hang|تعليق/.test(c)) patch.hanging = 'single';
      if (Object.keys(patch).length) { lastCol = { type: 'design', kind: 'column', idx, patch, ...(wcol ? { part: 'wing' } : null) }; items.push(lastCol); return; }
    }

    /* drawers inside / doors out / drawers in front / drawer height, closet-wide: "add 3 drawers inside", "doors out", "drawers in front" */
    {
      const dmw = drawerModeWords(c);
      const dh = c.match(/(?:drawer height|ارتفاع الدرج)\s*(?:of|is|=|:)?\s*([\d.,]+)\s*(mm|cm|مم|سم)?/);
      if ((dmw.inside || dmw.front || dmw.cover) && lastCol && !/\b(all|every|whole|closet|wardrobe)\b|كل|الخزانة/.test(c) && !/(\d|\b(one|two|three|four|five|six)\b)\s*(?:inside |internal |inner )?(?:drawers?|أدراج|ادراج)/.test(c)) {
        if (dmw.inside) lastCol.patch.dMode = 'inside'; else if (dmw.front) lastCol.patch.dMode = 'front';
        if (dmw.cover) lastCol.patch.cover = dmw.cover;
        return;
      }
      if (dmw.inside || dmw.front || dmw.cover || dh) {
        const W6 = '(\\d+|one|two|three|four|five|six)';
        const a = c.match(new RegExp(`${W6}\\s*(?:inside |internal |inner |exposed )?(?:drawers?|أدراج|ادراج|درج)`)); const b = c.match(new RegExp(`(?:drawers?|أدراج|ادراج|درج)\\s*${W6}\\b`));
        const cnt = a ? wordNum(a[1]) : b ? wordNum(b[1]) : null;
        items.push({ type: 'design', kind: 'drawerMode', mode: dmw.inside ? 'inside' : dmw.front ? 'front' : null, cover: dmw.cover, count: cnt, ...(dh && heightMm(num(dh[1]), dh[2]) ? { height: heightMm(num(dh[1]), dh[2]) } : null) });
        return;
      }
    }

    /* overall size */
    const dm = c.match(/(width|wide|عرض|height|tall|ارتفاع|depth|deep|عمق)\s*(?:of|is|=|:|to|الى|إلى)?\s*([\d.,]+)\s*(mm|cm|m|مم|سم|متر)?/);
    if (dm) {
      const key = /width|wide|عرض/.test(dm[1]) ? 'w' : /height|tall|ارتفاع/.test(dm[1]) ? 'h' : 'd';
      const v = toMm(num(dm[2]), dm[3]);
      if (v) { items.push({ type: 'design', kind: 'dim', key, value: v }); return; }
    }

    /* door type / style */
    let hit = false;
    if (/slid|منزلق/.test(c)) { items.push({ type: 'design', kind: 'doorType', value: 'sliding' }); hit = true; }
    else if (/hinge|مفصل/.test(c)) { items.push({ type: 'design', kind: 'doorType', value: 'hinged' }); hit = true; }
    else if (/\bopen (wardrobe|shelving|storage)\b|^open$|مفتوح/.test(c)) { items.push({ type: 'design', kind: 'doorType', value: 'open' }); hit = true; }
    if (/smoked|مدخن|دخاني/.test(c)) { items.push({ type: 'design', kind: 'doorStyle', value: 'smoked' }); hit = true; }
    else if (/glass|زجاج/.test(c)) { items.push({ type: 'design', kind: 'doorStyle', value: 'glass' }); hit = true; }
    else if (/\b(solid|wooden|plain)\b|خشب|سادة/.test(c)) { items.push({ type: 'design', kind: 'doorStyle', value: 'solid' }); hit = true; }
    /* divisions along the door height: "2 divisions" / "divisions 3" / "no divisions" / "تقسيمات ٣" */
    const dv = c.match(/(\d+|one|two|three|four|five|six)\s*(?:divisions?|bars?|panes?|تقسيم(?:ات)?)|(?:divisions?|تقسيم(?:ات)?)\s*(?:of|=|:)?\s*(\d+|one|two|three|four|five|six)/);
    if (dv) { items.push({ type: 'design', kind: 'divisions', value: wordNum(dv[1] || dv[2]) }); hit = true; }
    else if (/\bno (divisions?|bars)\b|بدون تقسيم/.test(c)) { items.push({ type: 'design', kind: 'divisions', value: 0 }); hit = true; }
    /* L-shape: "L-shape with a right wing 1200" / "straight" */
    if (/\b(straight wardrobe|no (return )?wing|remove (the )?(return )?wing)\b|بدون جناح|خزانة مستقيمة/.test(c)) { items.push({ type: 'design', kind: 'wing', on: false }); hit = true; }
    else if (/\bl[- ]?shape(d)?\b|\breturn wing\b|\bwing\b|خزانة l|جناح/.test(c)) {
      const wm = c.match(/(?:wing|جناح)[^\d]*(\d+)\s*(mm|cm|m|مم|سم|متر)?/);
      items.push({ type: 'design', kind: 'wing', on: true, side: /left|يسار/.test(c) ? 'left' : /right|يمين/.test(c) ? 'right' : null, width: wm ? toMm(num(wm[1]), wm[2]) : null }); hit = true;
    }
    if (hit) return;

    rest.push(c);
  });
  return { items, rest };
}

/* ---- executing on a design ------------------------------------------------------ */
const RNG = (R) => ({ w: [Math.max(600, R.min_width), Math.min(6000, R.max_width)], h: [Math.max(1300, R.min_height), Math.min(3300, R.max_height)], d: [Math.max(500, R.min_depth), Math.min(700, R.max_depth)] });

export function executeWardrobe(design, cmd, rulesIn) {
  const R = normRules(rulesIn || {});
  const rng = RNG(R);
  const d = { ...design, dims: { ...design.dims }, mods: design.mods.map((m) => ({ ...m })), x: normalizeX(design.x) };
  const notes = [];
  if (cmd.kind === 'dim') {
    const [lo, hi] = rng[cmd.key]; const v = clampN(Math.round(cmd.value), lo, hi);
    if (v !== Math.round(cmd.value)) notes.push({ en: `Limited to ${v} mm (range ${lo}-${hi}).`, ar: `ضُبط على ${v} مم (المدى ${lo}-${hi}).` });
    d.dims[cmd.key] = v;
    if (cmd.key === 'w') { const opts = optimizeModules(v, R, 3); const o = opts[Math.min(d.optIdx || 0, opts.length - 1)] || opts[0]; d.mods = remapModules(d.mods, o ? o.modules : [v]); d.optIdx = Math.min(d.optIdx || 0, Math.max(0, opts.length - 1)); }
  } else if (cmd.kind === 'doorType') {
    d.type = cmd.value;
    d.doorSystem = doorSystemFor(cmd.value, d.doorSystem);
  } else if (cmd.kind === 'doorStyle') {
    d.x = { ...d.x, doorStyle: cmd.value };
    if (cmd.value !== 'solid' && d.type === 'open') { d.type = 'hinged'; notes.push({ en: 'Glass doors need doors: the wardrobe is now hinged.', ar: 'الأبواب الزجاجية تحتاج أبوابًا: أصبحت الخزانة مفصلية.' }); }
  } else if (cmd.kind === 'divisions') {
    const v = clampN(Math.round(cmd.value || 0), 0, 6);
    if (v !== Math.round(cmd.value || 0)) notes.push({ en: `Limited to ${v} (0-6).`, ar: `ضُبط على ${v} (٠-٦).` });
    d.x = { ...d.x, divisions: v };
    if (v > 0 && d.x.doorStyle === 'solid') { d.x.doorStyle = 'glass'; notes.push({ en: 'Divisions split glass doors: the doors are now glass.', ar: 'التقسيمات تخص الأبواب الزجاجية: أصبحت الأبواب زجاجًا.' }); }
    if (v > 0 && d.type === 'open') { d.type = 'hinged'; notes.push({ en: 'Divisions need doors: the wardrobe is now hinged.', ar: 'التقسيمات تحتاج أبوابًا: أصبحت الخزانة مفصلية.' }); }
  } else if (cmd.kind === 'drawerMode') {
    const strip = (m, keys) => { const o = { ...m }; keys.forEach((k) => { delete o[k]; }); return o; };
    const keys = [...(cmd.mode ? ['dMode'] : []), ...(cmd.cover ? ['cover'] : []), ...(cmd.height ? ['drawerH'] : [])];
    d.mods = d.mods.map((m) => strip(m, keys));
    d.x = { ...d.x, ...(cmd.mode ? { drawerMode: cmd.mode } : null), ...(cmd.cover ? { doorCover: cmd.cover } : null), wing: { ...d.x.wing, mods: d.x.wing.mods.map((m) => strip(m, keys)) } };
    if (cmd.mode === 'inside' && d.mods.every((m) => m.drawers === 0) && cmd.count == null) notes.push({ en: 'No column has drawers yet: add some ("column 2 drawers 3") to see them inside.', ar: 'لا يوجد أدراج في أي عمود بعد: أضف بعضها («عمود ٢ أدراج ٣») لتراها بالداخل.' });
    if (cmd.height) { const hh = clampN(Math.round(cmd.height), 120, 400); if (hh !== Math.round(cmd.height)) notes.push({ en: `Drawer height limited to ${hh} mm (120-400).`, ar: `ارتفاع الدرج ضُبط على ${hh} مم (120-400).` }); d.mods = d.mods.map((m) => (m.drawers > 0 ? { ...m, drawerH: hh } : m)); }
    if (cmd.count != null) {
      const n = clampN(Math.round(cmd.count), 0, Math.min(6, R.drawer_limit || 4));
      if (n !== Math.round(cmd.count)) notes.push({ en: `Drawers limited to ${n} per column.`, ar: `الأدراج ضُبطت على ${n} لكل عمود.` });
      if (d.mods.some((m) => m.drawers > 0)) d.mods = d.mods.map((m) => (m.drawers > 0 ? { ...m, drawers: n } : m));
      else { const mid = Math.floor(d.mods.length / 2); d.mods[mid] = { ...d.mods[mid], drawers: n }; notes.push({ en: `No column had drawers: ${n} added to column ${mid + 1}.`, ar: `لم يكن في أي عمود أدراج: أُضيفت ${n} إلى العمود ${mid + 1}.` }); }
    }
    if (cmd.mode === 'inside' && d.type === 'open') { d.type = 'hinged'; d.doorSystem = doorSystemFor('hinged', d.doorSystem); notes.push({ en: 'Drawers inside need a door in front: the wardrobe is now hinged.', ar: 'الأدراج الداخلية تحتاج بابًا أمامها: أصبحت الخزانة مفصلية.' }); }
  } else if (cmd.kind === 'wing') {
    const w = { ...d.x.wing, mods: d.x.wing.mods.map((m) => ({ ...m })), on: cmd.on };
    if (cmd.on) {
      if (cmd.side) w.side = cmd.side;
      if (cmd.width) {
        const target = clampN(Math.round(cmd.width), 200, 6000);
        const dist = distribute(w.mods.map((m) => m.width), target);
        if (dist) w.mods = w.mods.map((m, i) => ({ ...m, width: dist[i] })); else notes.push({ en: `${target} mm does not fit the wing columns (200-1200 each): width unchanged.`, ar: `${target} مم لا يناسب أعمدة الجناح (200-1200 لكل عمود): لم يتغير العرض.` });
      }
    }
    d.x = { ...d.x, wing: w };
  } else if (cmd.kind === 'column') {
    const wing = cmd.part === 'wing';
    const list = wing ? d.x.wing.mods : d.mods;
    const m = list[cmd.idx]; if (!m || (wing && !d.x.wing.on)) return { design, notes: [{ en: wing ? 'There is no return wing: turn L-shape on first.' : 'No such column.', ar: wing ? 'لا يوجد جناح جانبي: فعّل حرف L أولًا.' : 'لا يوجد هذا العمود.' }] };
    const p = { ...cmd.patch };
    if (p.drawers != null) p.drawers = clampN(Math.round(p.drawers), 0, Math.min(6, R.drawer_limit || 4));
    if (p.drawerH != null) { const hh = clampN(Math.round(p.drawerH), 120, 400); if (hh !== Math.round(p.drawerH)) notes.push({ en: `Drawer height limited to ${hh} mm (120-400).`, ar: `ارتفاع الدرج ضُبط على ${hh} مم (120-400).` }); p.drawerH = hh; }
    if (p.dMode === 'inside' && d.type === 'open') { d.type = 'hinged'; d.doorSystem = doorSystemFor('hinged', d.doorSystem); notes.push({ en: 'Drawers inside need a door in front: the wardrobe is now hinged.', ar: 'الأدراج الداخلية تحتاج بابًا أمامها: أصبحت الخزانة مفصلية.' }); }
    if (p.shelves != null) p.shelves = clampN(Math.round(p.shelves), 0, 8);
    if (p.hanging && !HANG_KEYS.includes(p.hanging)) delete p.hanging;
    if (wing) d.x = { ...d.x, wing: { ...d.x.wing, mods: d.x.wing.mods.map((q, i) => (i === cmd.idx ? { ...q, ...p } : q)) } };
    else d.mods[cmd.idx] = { ...m, ...p };
  } else if (cmd.kind === 'brief') {
    const { config: c } = commandToConfig(cmd.cmd, R);
    d.dims = { w: c.width, h: clampN(c.height, rng.h[0], rng.h[1]), d: clampN(c.depth, rng.d[0], rng.d[1]) };
    d.type = c.type;
    d.doorSystem = doorSystemFor(c.type, d.doorSystem);
    d.mods = c.modules.map((m) => ({ id: m.id, width: m.width, hanging: m.hanging, shelves: m.shelves, drawers: m.drawers }));
    d.dims.w = d.mods.reduce((s, m) => s + m.width, 0);
  }
  return { design: d, notes };
}

/** review cards (title / detail / note / ok) for the chosen commands, computed from what executeWardrobe would really do */
export function planWardrobe(items, design, lang, rules) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  return items.filter((i) => i.type === 'design').map((cmd) => {
    const r = executeWardrobe(design, cmd, rules);
    const nt = r.notes.map((n) => n[ar ? 'ar' : 'en']).join(' ');
    if (cmd.kind === 'dim') {
      const nm = { w: L('Width', 'العرض'), h: L('Height', 'الارتفاع'), d: L('Depth', 'العمق') }[cmd.key];
      return { cmd, ok: true, title: `${nm}: ${design.dims[cmd.key]} → ${r.design.dims[cmd.key]} mm`, detail: cmd.key === 'w' ? L(`${r.design.mods.length} columns`, `${r.design.mods.length} أعمدة`) : '', note: nt };
    }
    if (cmd.kind === 'doorType') return { cmd, ok: true, title: L(`Doors: ${cmd.value}`, `الأبواب: ${{ sliding: 'منزلقة', hinged: 'مفصلية', open: 'مفتوحة' }[cmd.value]}`), detail: '', note: nt };
    if (cmd.kind === 'doorStyle') return { cmd, ok: true, title: L(`Door style: ${cmd.value}`, `نمط الباب: ${{ glass: 'زجاج', smoked: 'زجاج مدخّن', solid: 'سادة' }[cmd.value]}`), detail: '', note: nt };
    if (cmd.kind === 'divisions') return { cmd, ok: true, title: L(`Divisions: ${r.design.x.divisions}`, `التقسيمات: ${r.design.x.divisions}`), detail: L(`${r.design.x.divisions + 1} panes per glass leaf`, `${r.design.x.divisions + 1} ألواح لكل ضلفة زجاج`), note: nt };
    if (cmd.kind === 'drawerMode') {
      const x2 = r.design.x; const n = r.design.mods.reduce((t, m) => t + (m.drawers || 0), 0);
      const title = cmd.mode === 'front' ? L('Drawers: exposed fronts', 'الأدراج: واجهات ظاهرة')
        : cmd.mode === 'inside' ? (cmd.cover === 'above' ? L('Drawers inside, door above them', 'أدراج داخلية والباب فوقها') : L('Drawers inside, door outside', 'أدراج داخلية والباب بالخارج'))
          : cmd.cover === 'above' ? L('Door stops above the drawers', 'الباب يتوقف فوق الأدراج') : cmd.cover ? L('Door covers the drawers', 'الباب يغطي الأدراج') : L('Drawer height', 'ارتفاع الدرج');
      return { cmd, ok: true, title, detail: `${L('drawers', 'أدراج')} ${n} · ${L('position', 'الموضع')} ${x2.drawerMode === 'inside' ? L('inside', 'داخلي') : L('front', 'أمامي')} · ${L('door', 'الباب')} ${x2.doorCover === 'above' ? L('above drawers', 'فوق الأدراج') : L('full', 'كامل')}`, note: nt };
    }
    if (cmd.kind === 'wing') {
      const w = r.design.x.wing;
      return { cmd, ok: true, title: cmd.on ? L(`L-shape: return wing on the ${w.side}`, `حرف L: جناح جانبي ${w.side === 'left' ? 'يسار' : 'يمين'}`) : L('Straight wardrobe (no return wing)', 'خزانة مستقيمة (بدون جناح)'), detail: cmd.on ? `${w.mods.reduce((t, m) => t + m.width, 0)} × ${w.depth} mm · ${w.mods.length} ${L('columns', 'أعمدة')}` : '', note: nt };
    }
    if (cmd.kind === 'column') {
      const wing = cmd.part === 'wing';
      if (!(wing ? design.x && design.x.wing && design.x.wing.on && design.x.wing.mods[cmd.idx] : design.mods[cmd.idx])) return { cmd, ok: false, title: wing ? L('No return wing', 'لا يوجد جناح جانبي') : L('No such column', 'لا يوجد هذا العمود'), detail: '', note: nt };
      const p = wing ? r.design.x.wing.mods[cmd.idx] : r.design.mods[cmd.idx];
      return { cmd, ok: true, title: wing ? L(`Return column ${cmd.idx + 1}`, `عمود الجناح ${cmd.idx + 1}`) : L(`Column ${cmd.idx + 1}`, `العمود ${cmd.idx + 1}`), detail: `${L('hanging', 'تعليق')} ${p.hanging} · ${L('shelves', 'رفوف')} ${p.shelves} · ${L('drawers', 'أدراج')} ${p.drawers}${p.dMode === 'inside' ? ` ${L('(inside)', '(داخلي)')}` : p.dMode === 'front' ? ` ${L('(front)', '(أمامي)')}` : ''}`, note: nt };
    }
    return { cmd, ok: true, title: L('New wardrobe from your description', 'خزانة جديدة من وصفك'), detail: `${r.design.dims.w} × ${r.design.dims.h} × ${r.design.dims.d} mm · ${r.design.type} · ${r.design.mods.length} ${L('columns', 'أعمدة')}`, note: L('This replaces the current design. Undo brings it back.', 'هذا يستبدل التصميم الحالي. التراجع يعيده.') };
  });
}

export function describeWardrobe(design, lang) {
  const ar = lang === 'ar';
  const w = design.dims.w; const h = design.dims.h; const d = design.dims.d;
  const dr = design.mods.reduce((s, m) => s + (m.drawers || 0), 0); const sh = design.mods.reduce((s, m) => s + (m.shelves || 0), 0); const hg = design.mods.filter((m) => m.hanging !== 'none').length;
  const wg = normalizeX(design.x).wing;
  const ww = wg.on ? wg.mods.reduce((s, m) => s + m.width, 0) : 0;
  const base = ar ? `الخزانة ${w} × ${h} × ${d} مم، ${design.mods.length} أعمدة، ${hg} للتعليق، ${sh} رفوف، ${dr} أدراج.` : `The wardrobe is ${w} × ${h} × ${d} mm with ${design.mods.length} columns, ${hg} hanging, ${sh} shelves and ${dr} drawers.`;
  const wing = !wg.on ? '' : ar ? ` مع جناح جانبي ${wg.side === 'left' ? 'يسار' : 'يمين'} ${ww} × ${wg.depth} مم (${wg.mods.length} أعمدة).` : ` Plus a ${wg.side} return wing of ${ww} × ${wg.depth} mm (${wg.mods.length} columns).`;
  return base + wing;
}
