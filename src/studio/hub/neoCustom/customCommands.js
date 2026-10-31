/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - Haneen (Bonsai assistant) for custom furniture: pure interpreter, planner and executor.
 * Text (English or Arabic) -> commands -> review cards -> a NEW design object. The commands only change the same design the Parts / Global tabs edit, so the
 * drawing, the 3D view, the cut list and every export follow exactly as for a manual edit. Nothing is applied without the review card.
 * ===========================================================================*/
import { normDigits } from '../neoKitchen/model';
import { PERSONA, dayPart } from '../neoKitchen/persona';
import {
  setDims, setG, updatePart, setAx, setRep, deletePart, duplicatePart, mirrorPart, addPart, normalizeDesign, DIM, G_RANGE, PRESET, getPart, partName, FINISH_KEYS,
} from './customModel';
import { TEMPLATES, fromTemplate } from './customTemplates';
import { solve } from './customSolve';

const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (s) => { const n = parseFloat(normDigits(String(s)).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const toMm = (v, unit) => { if (v == null) return null; const u = (unit || '').toLowerCase(); if (u === 'cm' || u === 'سم') return Math.round(v * 10); if (u === 'm' || u === 'متر') return Math.round(v * 1000); return Math.round(v); };

export const EXAMPLES = {
  en: ['new table', 'width 1800', 'height 900', 'depth 700', 'shelves 5', 'round legs', 'legs 80', 'top thickness 40', 'add a drawer', 'add a shelf', 'duplicate', 'mirror', 'walnut finish', 'show 3D', 'x-ray', 'explode'],
  ar: ['طاولة جديدة', 'عرض ١٨٠٠', 'ارتفاع ٩٠٠', 'عمق ٧٠٠', 'رفوف ٥', 'أرجل دائرية', 'الأرجل ٨٠', 'سماكة السطح ٤٠', 'أضف درج', 'أضف رف', 'تكرار', 'عكس', 'تشطيب جوز', 'اعرض ثلاثي', 'أشعة', 'تفكيك'],
};

/** the assistant's first message: describes only what the interpreter below really does */
export function customGreeting(lang, date = new Date()) {
  const part = dayPart(date);
  if (lang === 'ar') {
    const hi = part === 'morning' ? 'صباح الخير' : 'مساء الخير';
    return `${hi}! أهلًا بيك في ${PERSONA.company.ar}، أنا ${PERSONA.name.ar} وهساعدك تصمم قطعتك الخاصة. ابدأ من قالب (طاولة، سرير، رفوف، كونسول، كرسي طويل، منضدة استقبال، ظهر سرير، وحدة عرض) أو اطلب أبعادًا، عدد الرفوف، شكل الأرجل، سماكة السطح، إضافة درج أو رف. كل تغيير يظهر للمراجعة قبل التطبيق، والتراجع متاح.`;
  }
  const hi = part === 'morning' ? 'Good morning' : part === 'afternoon' ? 'Good afternoon' : 'Good evening';
  return `${hi}! Welcome to ${PERSONA.company.en} — I'm ${PERSONA.name.en} and I'll help you design your one-off piece. Start from a template (table, bed, shelving unit, console, bench, reception counter, headboard, display unit) or tell me the size, the number of shelves, round or square legs, the top thickness, or ask me to add a drawer or a shelf. Every change is shown for review before it is applied, and Undo brings it back.`;
}

const TPL_WORDS = { table: /\b(table)\b|طاولة|ترابيزة/, bed: /\bbed\b(?!\s*head)|سرير/, shelving: /\bshel(f|ving)( unit)?\b|وحدة رفوف|مكتبة/, console: /\bconsole\b|كونسول/, bench: /\bbench\b|كرسي طويل|دكة|بنش/, reception: /\breception\b|منضدة استقبال|استقبال/, headboard: /\bhead ?board\b|ظهر سرير|ظهر السرير/, display: /\bdisplay( unit| cabinet)?\b|وحدة عرض|فتارين|فاترينة/ };
const UI_WORDS = [
  [/\b(show |open |go to )?(3d|three d)\b|ثلاثي(?: الأبعاد)?|اعرض ثلاثي/, { action: 'view', value: '3d' }],
  [/\b(cut ?list|cutting list)\b|قائمة القص/, { action: 'view', value: 'cut' }],
  [/\b(show |go to )?(design|drawing|2d)\b|^تصميم$|الرسم|اعرض التصميم/, { action: 'view', value: 'design' }],
  [/\b(no|hide|disable|turn off) x-?ray\b|إخفاء الأشعة/, { action: 'xray', value: false }],
  [/\bx-?ray\b|أشعة|اشعة/, { action: 'xray', value: true }],
  [/\b(no|stop|hide) explode\b|اغلق التفكيك/, { action: 'explode', value: false }],
  [/\bexplode\b|تفكيك|فكك/, { action: 'explode', value: true }],
  [/\b(close|shut) (the )?(doors|drawers)\b|اغلق الأبواب|أغلق الأبواب/, { action: 'open', value: false }],
  [/\bopen (the )?(doors|drawers|all)\b|افتح الأبواب|افتح الكل/, { action: 'open', value: true }],
  [/\b(no |turn off |disable )daylight\b/, { action: 'daylight', value: false }],
  [/\bdaylight\b|ضوء النهار/, { action: 'daylight', value: true }],
];
const FINISH_WORDS = { oak: /\boak\b|بلوط/, walnut: /\bwalnut\b|جوز/, white: /\bwhite\b|أبيض|ابيض/, charcoal: /\bcharcoal\b|رمادي|فحمي/ };
const MENTION = [
  ['shelf', /\bshel(f|ves)\b|رف|رفوف/], ['drawer', /\bdrawers?\b|درج|أدراج/], ['leg', /\blegs?\b|رجل|أرجل|الأرجل/], ['top', /\b(top|tabletop)\b|السطح|سطح/], ['door', /\bdoors?\b|باب|أبواب/],
];

/** text -> { items, rest }. Items: { type:'ui', action, value } | { type:'design', kind, ... } | { type:'meta', action } */
export function interpretCustom(textIn, design, ctx = {}) {
  const text = normDigits(String(textIn || '')).toLowerCase().trim();
  const items = []; const rest = [];
  if (!text) return { items, rest };
  if (/^(undo|تراجع)$/.test(text)) return { items: [{ type: 'meta', action: 'undo' }], rest };
  if (/^(redo|إعادة|اعادة)$/.test(text)) return { items: [{ type: 'meta', action: 'redo' }], rest };
  const parts = text.split(/\s*(?:,|;|\band\b|\bthen\b|،|؛)\s*/).filter(Boolean);
  parts.forEach((seg) => {
    const ui = UI_WORDS.find(([re]) => re.test(seg));
    if (ui && !/\d{2,}/.test(seg)) { items.push({ type: 'ui', ...ui[1] }); return; }
    /* a new piece from a template */
    if (/\b(new|start|create|make)\b|جديد|ابدأ|انشئ|أنشئ/.test(seg)) {
      const t = Object.keys(TPL_WORDS).find((k) => TPL_WORDS[k].test(seg));
      if (t) { items.push({ type: 'design', kind: 'template', key: t }); return; }
    }
    /* overall size: "1800 x 750 x 900" / "size 1.8m x 0.75m x 0.9m" */
    const tri = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|مم|سم|متر)?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|مم|سم|متر)?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|مم|سم|متر)?/.exec(seg);
    if (tri) { items.push({ type: 'design', kind: 'dims', w: toMm(num(tri[1]), tri[2]), h: toMm(num(tri[3]), tri[4]), d: toMm(num(tri[5]), tri[6]) }); return; }
    const dim = /(?:\b(width|length|height|depth)\b|(عرض|طول|ارتفاع|عمق))\s*(?:of|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|مم|سم|متر)?/.exec(seg);
    if (dim) {
      const k = (dim[1] || dim[2]); const key = /width|length|عرض|طول/.test(k) ? 'w' : /height|ارتفاع/.test(k) ? 'h' : 'd';
      items.push({ type: 'design', kind: 'dims', [key]: toMm(num(dim[3]), dim[4]) }); return;
    }
    const fin = Object.keys(FINISH_WORDS).find((k) => FINISH_WORDS[k].test(seg));
    if (fin && /finish|تشطيب|colou?r|لون/.test(seg)) { items.push({ type: 'design', kind: 'finish', key: fin }); return; }
    const m = MENTION.find(([, re]) => re.test(seg));
    const n = /(\d+)/.exec(seg);
    /* round / square legs */
    if (/\bround\b|دائر/.test(seg) && /leg|رجل|أرجل|الأرجل/.test(seg)) { items.push({ type: 'design', kind: 'legSection', sec: 'round' }); return; }
    if (/\b(square|rectang\w*)\b|مربع|مستطيل/.test(seg) && /leg|رجل|أرجل|الأرجل/.test(seg)) { items.push({ type: 'design', kind: 'legSection', sec: 'rect' }); return; }
    /* thickness of the top / boards */
    if (/thick|سماكة|سمك/.test(seg) && n) {
      const v = clampN(num(n[1]), 6, 60);
      items.push({ type: 'design', kind: m && m[0] === 'top' ? 'topThickness' : 'board', value: v }); return;
    }
    if (/\b(add|new|another)\b|أضف|اضف|زد/.test(seg) && m) { items.push({ type: 'design', kind: 'add', preset: m[0] === 'leg' ? 'leg' : m[0] === 'top' ? 'top' : m[0] === 'door' ? 'door' : m[0] === 'drawer' ? 'drawer' : 'shelf' }); return; }
    if (m && n) {
      const v = num(n[1]);
      if (m[0] === 'leg') { items.push({ type: 'design', kind: 'legSize', value: clampN(v, 20, 300) }); return; }
      if (m[0] === 'shelf' || m[0] === 'drawer' || m[0] === 'door') { items.push({ type: 'design', kind: 'count', what: m[0], value: clampN(Math.round(v), 1, 60) }); return; }
    }
    if (/^(delete|remove|احذف|حذف)( this| the selected| المحدد)?$/.test(seg)) { items.push({ type: 'design', kind: 'delete' }); return; }
    if (/^(duplicate|copy|تكرار|انسخ)$/.test(seg)) { items.push({ type: 'design', kind: 'duplicate' }); return; }
    if (/^(mirror|flip|عكس)$/.test(seg)) { items.push({ type: 'design', kind: 'mirror' }); return; }
    rest.push(seg);
  });
  void ctx;
  return { items, rest };
}

const partsOf = (design, what) => design.parts.filter((p) => (what === 'leg' ? p.type === 'frame' && /leg|رجل/i.test(p.name) : what === 'top' ? /top|سطح/i.test(p.name) : p.type === what));

/** items -> review cards [{ ok, title, detail, note, cmd }] (nothing is changed here) */
export function planCustom(cmds, design, lang = 'en', ctx = {}) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const sel = ctx.selectedId ? getPart(design, ctx.selectedId) : null;
  return cmds.map((c) => {
    switch (c.kind) {
      case 'template': { const t = TEMPLATES.find((x) => x.k === c.key); return { ok: true, cmd: c, title: L(`Start a new ${t.en.toLowerCase()}`, `بدء ${t.ar} جديدة`), detail: `${t.dims.w} × ${t.dims.h} × ${t.dims.d} mm`, note: L('Replaces the current design (Undo brings it back).', 'يستبدل التصميم الحالي (التراجع يعيده).') }; }
      case 'dims': {
        const bad = ['w', 'h', 'd'].some((k) => c[k] != null && (c[k] < DIM[k][0] || c[k] > DIM[k][1]));
        const parts = ['w', 'h', 'd'].filter((k) => c[k] != null).map((k) => `${k.toUpperCase()} ${design.dims[k]} → ${clampN(c[k], DIM[k][0], DIM[k][1])}`);
        return { ok: true, cmd: c, title: L('Change the overall size', 'تغيير الأبعاد الكلية'), detail: parts.join('  ·  '), note: bad ? L('Out of range - it will be clamped.', 'خارج المدى - سيُقيَّد.') : '' };
      }
      case 'finish': return { ok: true, cmd: c, title: L(`Board finish: ${c.key}`, `تشطيب الألواح: ${c.key}`), detail: `${design.finishKey} → ${c.key}` };
      case 'legSection': { const n = partsOf(design, 'leg').length; return { ok: n > 0, cmd: c, title: c.sec === 'round' ? L('Legs: round', 'الأرجل: دائرية') : L('Legs: rectangular', 'الأرجل: مستطيلة'), detail: L(`${n} leg part(s)`, `${n} جزء أرجل`), note: n ? '' : L('This piece has no legs.', 'هذه القطعة بلا أرجل.') }; }
      case 'legSize': { const n = partsOf(design, 'leg').length; return { ok: n > 0, cmd: c, title: L(`Legs ${c.value} mm square / diameter`, `الأرجل ${c.value} مم`), detail: L(`${n} leg part(s)`, `${n} جزء أرجل`), note: n ? '' : L('This piece has no legs.', 'هذه القطعة بلا أرجل.') }; }
      case 'topThickness': { const t = partsOf(design, 'top')[0]; return { ok: !!t, cmd: c, title: L(`Top thickness ${c.value} mm`, `سماكة السطح ${c.value} مم`), detail: t ? partName(design, t, lang) : '', note: t ? '' : L('No part named "top" - rename one or select it.', 'لا جزء باسم "top".') }; }
      case 'board': return { ok: true, cmd: c, title: L(`New-panel board thickness ${c.value} mm`, `سماكة اللوح للألواح الجديدة ${c.value} مم`), detail: `${design.g.board} → ${clampN(c.value, G_RANGE.board[0], G_RANGE.board[1])}` };
      case 'count': {
        const ps = partsOf(design, c.what); const p = sel && sel.type === c.what ? sel : ps[0];
        return { ok: !!p, cmd: c, title: L(`${p ? partName(design, p, lang) : c.what}: ${c.value} copies`, `${p ? partName(design, p, lang) : c.what}: ${c.value} نسخة`), detail: p ? `${p.rep ? p.rep.n : 1} → ${c.value}` : '', note: p ? '' : L(`There is no ${c.what} in this piece - say "add a ${c.what}".`, `لا يوجد ${c.what} في هذه القطعة.`) };
      }
      case 'add': return { ok: true, cmd: c, title: L(`Add: ${PRESET[c.preset].en}`, `إضافة: ${PRESET[c.preset].ar}`), detail: sel && sel.type === 'group' ? L(`inside ${partName(design, sel, lang)}`, `داخل ${partName(design, sel, lang)}`) : '' };
      case 'delete': return { ok: !!sel, cmd: c, title: L('Delete the selected part', 'حذف الجزء المحدد'), detail: sel ? partName(design, sel, lang) : '', note: sel ? '' : L('Select a part first.', 'حدد جزءًا أولًا.') };
      case 'duplicate': return { ok: !!sel, cmd: c, title: L('Duplicate the selected part', 'تكرار الجزء المحدد'), detail: sel ? partName(design, sel, lang) : '', note: sel ? '' : L('Select a part first.', 'حدد جزءًا أولًا.') };
      case 'mirror': return { ok: !!sel, cmd: c, title: L('Mirror the selected part (left-right)', 'عكس الجزء المحدد (يمين-يسار)'), detail: sel ? partName(design, sel, lang) : '', note: sel ? '' : L('Select a part first.', 'حدد جزءًا أولًا.') };
      default: return { ok: false, cmd: c, title: L('Unknown command', 'أمر غير معروف') };
    }
  });
}

/** apply ONE planned command -> { design, selectId? } */
export function executeCustom(design, c, ctx = {}) {
  switch (c.kind) {
    case 'template': return { design: fromTemplate(c.key) };
    case 'dims': {
      const patch = {}; ['w', 'h', 'd'].forEach((k) => { if (c[k] != null) patch[k] = clampN(c[k], DIM[k][0], DIM[k][1]); });
      return { design: setDims(design, patch) };
    }
    case 'finish': return { design: normalizeDesign({ ...design, finishKey: FINISH_KEYS.includes(c.key) ? c.key : design.finishKey }) };
    case 'legSection': { let d = design; partsOf(design, 'leg').forEach((p) => { d = updatePart(d, p.id, { sec: c.sec }); }); return { design: d }; }
    case 'legSize': {
      let d = design;
      partsOf(design, 'leg').forEach((p) => { ['x', 'z'].forEach((k) => { d = setAx(d, p.id, k, { s: c.value }); }); });
      return { design: d };
    }
    case 'topThickness': { const t = partsOf(design, 'top')[0]; return { design: t ? setAx(design, t.id, 'y', { s: c.value }) : design }; }
    case 'board': return { design: setG(design, { board: c.value }) };
    case 'count': {
      const sel = ctx.selectedId ? getPart(design, ctx.selectedId) : null;
      const p = sel && sel.type === c.what ? sel : partsOf(design, c.what)[0];
      if (!p) return { design };
      const axis = p.rep ? p.rep.axis : c.what === 'shelf' ? 'y' : c.what === 'drawer' ? 'y' : 'x';
      return { design: setRep(design, p.id, c.value <= 1 ? null : { n: c.value, axis, mode: p.rep ? p.rep.mode : 'even' }) };
    }
    case 'add': {
      const sel = ctx.selectedId ? getPart(design, ctx.selectedId) : null;
      const parent = sel && sel.type === 'group' ? sel.id : null;
      const s = solve(design); const pb = parent && s.byBase.get(parent) ? s.byBase.get(parent)[0].box : s.root;
      const r = addPart(design, c.preset, { parent, pb: { w: pb.x1 - pb.x0, h: pb.y1 - pb.y0, d: pb.z1 - pb.z0 } });
      return { design: r.design, selectId: r.id };
    }
    case 'delete': return { design: ctx.selectedId ? deletePart(design, ctx.selectedId) : design, selectId: null };
    case 'duplicate': { if (!ctx.selectedId) return { design }; const r = duplicatePart(design, ctx.selectedId); return { design: r.design, selectId: r.id }; }
    case 'mirror': { if (!ctx.selectedId) return { design }; const r = mirrorPart(design, ctx.selectedId, 'x', { solved: solve(design) }); return { design: r.design, selectId: r.id }; }
    default: return { design };
  }
}

export function describeCustom(design, lang = 'en') {
  const { w, h, d } = design.dims;
  return lang === 'ar' ? `${design.title}: ${w} × ${h} × ${d} مم، ${design.parts.filter((p) => p.type !== 'group').length} جزء.` : `${design.title}: ${w} × ${h} × ${d} mm, ${design.parts.filter((p) => p.type !== 'group').length} parts.`;
}
