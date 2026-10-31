/* =============================================================================
 * Neo category studios [NEO-CATEGORIES-UX26] - Haneen (the Bonsai assistant) for bathroom, laundry, TV and office: pure interpreter, planner and
 * executor, driven by the category's vocabulary (cfg.assistant: nums, words, addWords, examples, greeting).
 * Text (English or Arabic) -> commands -> review cards -> a NEW design object. Nothing here draws geometry: the commands only change the same
 * design the Parameters panel edits, so the 3D view, cut list, price and exports follow exactly as for a manual edit.
 * ===========================================================================*/
import { normDigits } from '../neoKitchen/model';
import { PERSONA, dayPart } from '../neoKitchen/persona';
import { normSpec, normalizeDesign, typeOf, setUnitWidth, setTotalWidth, addUnit, removeUnit, presetDesign, totalWidth, widthRange } from './categoryModel';

const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** a regex's source with its capture groups made non-capturing, so it can be embedded in a bigger pattern whose group 1 is the number */
const ncg = (re) => re.source.replace(/(?<!\\)\((?!\?)/g, '(?:');
const num = (s) => { const n = parseFloat(normDigits(s).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const UNIT_RE = '(mm|cm|m|in|inch|inches|مم|سم|متر|بوصة|"|″)?';
const toUnit = (v, u, kind, spec) => {
  if (v == null) return null; const w = (u || '').toLowerCase();
  if (!w && spec && kind !== 'in') { /* a bare number: millimetres when the parameter's range allows it, else centimetres, else metres */ for (const k of [1, 10, 1000]) if (v * k >= spec.min && v * k <= spec.max) return Math.round(v * k); }
  if (kind === 'in') return /^(cm|سم)$/.test(w) ? v / 2.54 : /^(mm|مم)$/.test(w) ? v / 25.4 : /^(m|متر)$/.test(w) ? v * 39.37 : v;
  if (/^(cm|سم)$/.test(w)) return Math.round(v * 10); if (/^(m|متر)$/.test(w)) return Math.round(v * 1000); if (/^(in|inch|inches|بوصة|"|″)$/.test(w)) return Math.round(v * 25.4); if (/^(mm|مم)$/.test(w)) return Math.round(v);
  return v < 20 ? Math.round(v * 1000) : v < 250 ? Math.round(v * 10) : Math.round(v);
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
];

const EN_WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const AR_WORD = { 'واحد': 1, 'واحدة': 1, 'اثنين': 2, 'اثنان': 2, 'ثلاثة': 3, 'ثلاث': 3, 'اربعة': 4, 'أربعة': 4, 'خمسة': 5, 'ستة': 6 };
const wordNum = (w) => (w == null ? null : /^[\d٠-٩.]+$/.test(w) ? num(w) : EN_WORD[w] || AR_WORD[w] || null);

export function greeting(cfg, lang, date = new Date()) {
  const part = dayPart(date);
  const g = cfg.assistant.greet;
  if (lang === 'ar') return `${part === 'morning' ? 'صباح الخير' : 'مساء الخير'}! أهلًا بيك في ${PERSONA.company.ar}، أنا ${PERSONA.name.ar} ${g[1]}`;
  return `${part === 'morning' ? 'Good morning' : part === 'afternoon' ? 'Good afternoon' : 'Good evening'}! Welcome to ${PERSONA.company.en} — I'm ${PERSONA.name.en} and I'll help you ${g[0]}`;
}

/** text -> { items, rest }. Items: { type:'ui', action, value } | { type:'design', kind, ... } | { type:'meta', action:'undo'|'redo' } */
export function interpretCategory(cfg, textIn, design) {
  const text = normDigits(String(textIn || '')).toLowerCase().trim();
  const items = []; const rest = [];
  if (!text) return { items, rest };
  const A = cfg.assistant;
  const clauses = text.split(/[,;،]|\band\b|\bthen\b|\bwith\b|\bثم\b|\bمع\b|\bو(?=\s)/).map((s) => s.trim()).filter(Boolean);
  const nU = design && design.units ? design.units.length : 1;
  const numSpecs = [...cfg.params.filter((s) => s.t === 'num' || s.t === 'step').map((s) => ({ key: s.k, spec: s }))];
  clauses.forEach((c) => {
    if (/^(undo|تراجع)$/.test(c)) { items.push({ type: 'meta', action: 'undo' }); return; }
    if (/^(redo|إعادة|اعادة)$/.test(c)) { items.push({ type: 'meta', action: 'redo' }); return; }
    const ui = UI_WORDS.find(([re]) => re.test(c));
    if (ui) { items.push({ type: 'ui', ...ui[1] }); return; }
    /* preset */
    const pm = c.match(/(?:preset|template|نموذج|قالب)\s*(\d+)?/);
    if (pm) { const byName = cfg.presets.findIndex((p) => c.includes(p.id) || c.includes(p.en.toLowerCase().slice(0, 8))); const i = pm[1] ? clampN(+pm[1], 1, cfg.presets.length) - 1 : byName; if (i >= 0) { items.push({ type: 'design', kind: 'preset', index: i }); return; } }
    /* add / remove a unit */
    const rm = c.match(/(?:remove|delete|احذف|إحذف)\s*(?:unit|وحدة)?\s*(\d+)/);
    if (rm) { items.push({ type: 'design', kind: 'remove', idx: clampN(+rm[1], 1, nU) - 1 }); return; }
    if (/^(add|new|أضف|اضف)\b/.test(c)) {
      const t = (A.addWords || []).find((w) => w.re.test(c));
      if (t) { items.push({ type: 'design', kind: 'add', unitType: t.type }); return; }
    }
    /* a unit-targeted command: "unit 2 drawers 3" / "وحدة ٢ عرض ٩٠٠" */
    const um = c.match(/(?:unit|section|وحدة)\s*(\d+)/);
    const idx = um ? clampN(+um[1], 1, nU) - 1 : null;
    let hit = false;
    if (idx != null && design && design.units[idx]) {
      const t = typeOf(cfg, design.units[idx]);
      const wm = c.match(new RegExp(`(?:width|wide|عرض)\\s*(?:of|is|=|:|to)?\\s*([\\d.,]+)\\s*${UNIT_RE}`));
      if (wm) { const v = toUnit(num(wm[1]), wm[2]); if (v) { items.push({ type: 'design', kind: 'unitWidth', idx, value: v }); hit = true; } }
      const patch = {};
      (t.opts || []).forEach((o) => {
        if (o.t === 'step' && o.kw) { const W6 = '(\\d+|one|two|three|four|five|six)'; const a = c.match(new RegExp(`(?:${ncg(o.kw)})\\s*${W6}`)); const b = c.match(new RegExp(`${W6}\\s*(?:${ncg(o.kw)})`)); const v = a ? wordNum(a[1]) : b ? wordNum(b[1]) : null; if (v != null) patch[o.k] = v; }
      });
      (A.words || []).forEach((w) => { if (w.unitSet && Object.keys(w.unitSet).every((k) => (t.opts || []).some((o) => o.k === k)) && w.re.test(c)) Object.assign(patch, w.unitSet); });
      if (Object.keys(patch).length) { items.push({ type: 'design', kind: 'unit', idx, patch }); hit = true; }
      if (hit) return;
    }
    /* "<unit type> <width>": "vanity 1200", "tall column 450" -> the width of the first unit of that type */
    (A.addWords || []).forEach((w) => {
      const m = c.match(new RegExp(`(?:${ncg(w.re)})\\s*(?:of|is|=|:|to)?\\s*(\\d{3,4}(?:[.,]\\d)?)\\s*${UNIT_RE}`));
      const at = design && design.units ? design.units.findIndex((u) => u.type === w.type) : -1;
      if (m && at >= 0) { const v = toUnit(num(m[1]), m[2]); if (v) { items.push({ type: 'design', kind: 'unitWidth', idx: at, value: v }); hit = true; } }
    });
    /* parameters: "<word> <number><unit>" or "<number><unit> <word>" */
    (A.nums || []).forEach((n0) => {
      const spec = cfg.params.find((s) => s.k === n0.key); if (!spec) return;
      const kind = spec.unit === 'in' ? 'in' : 'mm';
      const a = c.match(new RegExp(`(?:${ncg(n0.re)})\\s*(?:of|is|=|:|to|الى|إلى)?\\s*([\\d.,]+)\\s*${UNIT_RE}`));
      const b = c.match(new RegExp(`([\\d.,]+)\\s*${UNIT_RE}\\s*(?:${ncg(n0.re)})`));
      const m = a || b; if (!m) return;
      const v = a ? toUnit(num(a[1]), a[2], kind, spec) : toUnit(num(b[1]), b[2], kind, spec);
      if (v != null) { items.push({ type: 'design', kind: 'param', key: n0.key, value: v }); hit = true; }
    });
    void numSpecs;
    /* total width of the run */
    const tw = !hit && c.match(new RegExp(`(?:width|wide|عرض)\\s*(?:of|is|=|:|to)?\\s*([\\d.,]+)\\s*${UNIT_RE}`));
    if (tw) { const v = toUnit(num(tw[1]), tw[2]); if (v) { items.push({ type: 'design', kind: 'totalWidth', value: v }); hit = true; } }
    /* words (seg / toggle values and unit options for every unit that has them) */
    (A.words || []).forEach((w) => {
      if (!w.re.test(c)) return;
      if (w.set) { items.push({ type: 'design', kind: 'param', set: w.set }); hit = true; }
      if (w.unitSet) { items.push({ type: 'design', kind: 'unitAll', patch: w.unitSet }); hit = true; }
    });
    if (hit) return;
    rest.push(c);
  });
  return { items, rest };
}

/* ---- executing on a design ------------------------------------------------------------------------------------------------------ */
export function executeCategory(cfg, design, cmd) {
  const d = normalizeDesign(cfg, design);
  const notes = [];
  if (cmd.kind === 'param') {
    const p = { ...d.p };
    if (cmd.set) Object.entries(cmd.set).forEach(([k, v]) => { const sp = cfg.params.find((s) => s.k === k); if (sp) p[k] = normSpec(sp, v); });
    else {
      const sp = cfg.params.find((s) => s.k === cmd.key);
      if (sp) { const v = normSpec(sp, cmd.value); if (v !== Math.round(cmd.value * 1000) / 1000) notes.push({ en: `Limited to ${v} ${sp.unit || 'mm'} (range ${sp.min}-${sp.max}).`, ar: `ضُبط على ${v} ${sp.unit === 'in' ? 'بوصة' : 'مم'} (المدى ${sp.min}-${sp.max}).` }); p[cmd.key] = v; }
    }
    d.p = p;
  } else if (cmd.kind === 'totalWidth') {
    const [lo, hi] = widthRange(cfg, d.units, d.p); const t = clampN(Math.round(cmd.value), lo, hi);
    const u = setTotalWidth(cfg, d.units, t, d.p);
    if (!u) return { design, notes: [{ en: `${t} mm does not fit these units.`, ar: `${t} مم لا يناسب هذه الوحدات.` }] };
    if (t !== Math.round(cmd.value)) notes.push({ en: `Limited to ${t} mm (range ${lo}-${hi}).`, ar: `ضُبط على ${t} مم (المدى ${lo}-${hi}).` });
    d.units = u;
  } else if (cmd.kind === 'unitWidth') {
    const r = d.units[cmd.idx] ? setUnitWidth(cfg, d.units, cmd.idx, cmd.value, false, d.p) : null;
    if (!r) return { design, notes: [{ en: 'No such unit.', ar: 'لا توجد هذه الوحدة.' }] };
    if (r.clamped) notes.push({ en: 'Limited to the unit\'s range.', ar: 'ضُبط على مدى الوحدة.' });
    d.units = r.units;
  } else if (cmd.kind === 'unit' || cmd.kind === 'unitAll') {
    const patchOne = (u) => { const t = typeOf(cfg, u); const ok = Object.keys(cmd.patch).every((k) => (t.opts || []).some((o) => o.k === k)); return ok ? { ...u, ...cmd.patch } : u; };
    if (cmd.kind === 'unit') { if (!d.units[cmd.idx]) return { design, notes: [{ en: 'No such unit.', ar: 'لا توجد هذه الوحدة.' }] }; d.units = d.units.map((u, i) => (i === cmd.idx ? patchOne(u) : u)); } else d.units = d.units.map(patchOne);
  } else if (cmd.kind === 'add') {
    d.units = addUnit(cfg, d.units, cmd.unitType, false, d.p);
  } else if (cmd.kind === 'remove') {
    const left = removeUnit(cfg, d.units, cmd.idx, false, d.p);
    if (!left) return { design, notes: [{ en: 'A design needs at least one unit.', ar: 'يحتاج التصميم وحدة واحدة على الأقل.' }] };
    d.units = left;
  } else if (cmd.kind === 'preset') {
    return { design: presetDesign(cfg, cmd.index), notes: [] };
  }
  return { design: normalizeDesign(cfg, d), notes };
}

/** review cards (title / detail / note / ok) for the chosen commands, computed from what executeCategory would really do */
export function planCategory(cfg, items, design, lang) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const name = (sp) => (ar ? sp.ar : sp.en);
  const valText = (sp, v) => (sp.t === 'seg' ? (sp.opts.find((o) => o[0] === v) || [v, v, v])[ar ? 2 : 1] : sp.t === 'tog' ? (v ? L('on', 'تشغيل') : L('off', 'إيقاف')) : `${v} ${sp.unit === 'in' ? L('in', 'بوصة') : 'mm'}`);
  return items.filter((i) => i.type === 'design').map((cmd) => {
    const r = executeCategory(cfg, design, cmd);
    const nt = r.notes.map((n) => n[ar ? 'ar' : 'en']).join(' ');
    const same = r.design === design;
    if (cmd.kind === 'param') {
      const keys = cmd.set ? Object.keys(cmd.set) : [cmd.key];
      const sp0 = cfg.params.find((s) => s.k === keys[0]);
      if (!sp0) return { cmd, ok: false, title: L('Unknown setting', 'إعداد غير معروف'), detail: '', note: '' };
      const detail = keys.map((k) => { const sp = cfg.params.find((s) => s.k === k); return sp ? `${name(sp)}: ${valText(sp, design.p[k])} → ${valText(sp, r.design.p[k])}` : ''; }).join(' · ');
      return { cmd, ok: true, title: name(sp0), detail, note: nt };
    }
    if (cmd.kind === 'totalWidth') return { cmd, ok: !same, title: `${L('Total width', 'العرض الكلي')}: ${totalWidth(design.units)} → ${totalWidth(r.design.units)} mm`, detail: '', note: nt };
    if (cmd.kind === 'unitWidth') return { cmd, ok: !same, title: `${L('Unit', 'الوحدة')} ${cmd.idx + 1} ${L('width', 'العرض')}: ${design.units[cmd.idx] ? design.units[cmd.idx].w : '-'} → ${r.design.units[cmd.idx] ? r.design.units[cmd.idx].w : '-'} mm`, detail: '', note: nt };
    if (cmd.kind === 'unit' || cmd.kind === 'unitAll') {
      const t = (cmd.kind === 'unit' ? design.units[cmd.idx] : design.units.find((u) => Object.keys(cmd.patch).every((k) => (typeOf(cfg, u).opts || []).some((o) => o.k === k))));
      if (!t) return { cmd, ok: false, title: L('No unit has this option', 'لا توجد وحدة بهذا الخيار'), detail: '', note: '' };
      const detail = Object.entries(cmd.patch).map(([k, v]) => { const o = (typeOf(cfg, t).opts || []).find((q) => q.k === k); return o ? `${name(o)}: ${valText(o, v)}` : `${k}: ${v}`; }).join(' · ');
      return { cmd, ok: true, title: cmd.kind === 'unit' ? `${L('Unit', 'الوحدة')} ${cmd.idx + 1}` : L('All matching units', 'كل الوحدات المناسبة'), detail, note: nt };
    }
    if (cmd.kind === 'add') return { cmd, ok: true, title: L(`Add a ${cfg.unitTypes[cmd.unitType].en.toLowerCase()}`, `إضافة ${cfg.unitTypes[cmd.unitType].ar}`), detail: L(`${design.units.length} → ${r.design.units.length} units`, `${design.units.length} → ${r.design.units.length} وحدات`), note: nt };
    if (cmd.kind === 'remove') return { cmd, ok: !same, title: L(`Remove unit ${cmd.idx + 1}`, `حذف الوحدة ${cmd.idx + 1}`), detail: '', note: nt };
    return { cmd, ok: true, title: L(`Start from: ${cfg.presets[cmd.index].en}`, `البدء من: ${cfg.presets[cmd.index].ar}`), detail: `${r.design.units.length} ${L('units', 'وحدات')} · ${totalWidth(r.design.units)} mm`, note: L('This replaces the current design. Undo brings it back.', 'هذا يستبدل التصميم الحالي. التراجع يعيده.') };
  });
}

export function describeCategory(cfg, design, lang) {
  const ar = lang === 'ar'; const d = normalizeDesign(cfg, design);
  const list = d.units.map((u, i) => `${i + 1}. ${ar ? typeOf(cfg, u).ar : typeOf(cfg, u).en} ${u.w}`).join(' · ');
  return ar ? `${cfg.noun[1]}: ${totalWidth(d.units)} مم، ${d.units.length} وحدات — ${list}.` : `${cfg.noun[0]}: ${totalWidth(d.units)} mm wide, ${d.units.length} units — ${list}.`;
}
