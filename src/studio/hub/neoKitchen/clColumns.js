/* [NEO-CUTLIST-UX32] Cut list pro: column catalogue + the view state (order, widths, hidden, sort, filters, grouping, thumbnail size).
 * Pure functions, unit-tested. The view is remembered per user in this browser (localStorage, wrapped: it may be blocked); a file
 * export (CSV / XLSX / labels) uses the SAME visible columns in the SAME order, so what you see is what you get. */
import { fmt } from './clParts';

const num = (v) => (Number.isFinite(+v) ? +v : 0);

/** id, en, ar, width (px), align, sort kind, text getter (for search / CSV / copy), default visibility */
export const COLUMNS = [
  { id: 'pic', en: 'Picture', ar: 'الصورة', w: 76, fixed: true, sort: false, csv: false, def: true, text: () => '' },
  { id: 'pid', en: 'Part ID', ar: 'رمز القطعة', w: 116, sort: 's', def: true, align: 's', text: (r) => r.pid },
  { id: 'no', en: '#', ar: '#', w: 44, sort: 'n', def: true, align: 'c', text: (r) => String(r.no).padStart(2, '0') },
  { id: 'name', en: 'Component', ar: 'المكوّن', w: 230, sort: 's', def: true, align: 's', text: (r, c) => (c.ar ? (r.nameAr || c.nameAr(r.name)) : r.name) },
  { id: 'group', en: 'Cabinet / group', ar: 'الخزانة / المجموعة', w: 120, sort: 's', def: false, align: 's', text: (r, c) => (c.ar && c.nameAr ? c.nameAr(r.group) : r.group) },
  { id: 'room', en: 'Run / room', ar: 'الصف / الغرفة', w: 100, sort: 's', def: false, align: 's', text: (r) => r.room },
  { id: 'dims', en: 'L × W × T (cut)', ar: 'ط × ع × س (قص)', w: 210, sort: 'n', def: true, align: 's', text: (r) => `${fmt(r.cut.L)} x ${fmt(r.cut.W)} x ${fmt(r.cut.T)} +/-${r.tol}`, val: (r) => r.cut.L * 1e4 + r.cut.W },
  { id: 'w', en: 'W', ar: 'W', w: 64, sort: 'n', def: false, text: (r) => fmt(r.w), val: (r) => r.w },
  { id: 'd', en: 'D', ar: 'D', w: 64, sort: 'n', def: false, text: (r) => fmt(r.d), val: (r) => r.d },
  { id: 'h', en: 'H', ar: 'H', w: 64, sort: 'n', def: false, text: (r) => fmt(r.h), val: (r) => r.h },
  { id: 'thk', en: 'Thk', ar: 'السماكة', w: 56, sort: 'n', def: true, text: (r) => fmt(r.thk), val: (r) => r.thk },
  { id: 'qty', en: 'Qty', ar: 'العدد', w: 56, sort: 'n', def: true, text: (r) => String(r.qty), val: (r) => r.qty },
  { id: 'material', en: 'Material', ar: 'المادة', w: 150, sort: 's', def: true, align: 's', text: (r) => r.matName },
  { id: 'grain', en: 'Grain', ar: 'العرق', w: 64, sort: 's', def: true, align: 'c', text: (r) => (r.grain && r.grain !== '-' ? r.grain : '-') },
  { id: 'edges', en: 'Edge banding', ar: 'شريط الحواف', w: 190, sort: 's', def: true, align: 's', text: (r) => r.edgeText, val: (r) => r.edges || '' },
  { id: 'ops', en: 'Drilling / machining', ar: 'الثقب / التشغيل', w: 190, sort: 's', def: true, align: 's', text: (r, c) => r.ops.map((o) => (c.ar ? o.ar : o.en)).join('; '), val: (r) => r.ops.length },
  { id: 'hw', en: 'Hardware', ar: 'الاكسسوارات', w: 130, sort: 's', def: false, align: 's', text: (r, c) => r.hw.map((o) => (c.ar ? o.ar : o.en)).join('; '), val: (r) => r.hw.length },
  { id: 'notes', en: 'Notes', ar: 'ملاحظات', w: 240, sort: 's', def: true, align: 's', text: (r, c) => (c.ar ? (r.noteAr || c.noteAr(r.note)) : c.noteEn(r.note)) },
  { id: 'rot', en: 'Rotate', ar: 'تدوير', w: 60, sort: 's', def: false, align: 'c', text: (r, c) => (r.rot ? (c.ar ? 'نعم' : 'Yes') : (c.ar ? 'لا' : 'No')) },
  { id: 'area', en: 'm² (total)', ar: 'م² (إجمالي)', w: 84, sort: 'n', def: true, text: (r) => r.area.toFixed(3), val: (r) => r.area },
  { id: 'maps', en: 'Map', ar: 'خريطة', w: 90, sort: 's', def: false, align: 's', text: (r) => r.maps.slice(0, 6).join(' ') },
];
export const COLUMN_IDS = COLUMNS.map((c) => c.id);
export const colById = (id) => COLUMNS.find((c) => c.id === id);
export const MIN_W = 40; export const MAX_W = 520;

export const GROUP_BY = ['none', 'material', 'thickness', 'group', 'room'];
export const PIC_SIZES = { S: 40, M: 64, L: 96 };

export const defaultView = () => ({
  order: COLUMN_IDS.slice(), hidden: COLUMNS.filter((c) => !c.def).map((c) => c.id), widths: {}, sort: [], group: 'none', pic: true, picSize: 'M',
  filters: { material: [], group: [], thk: [], grain: [], edge: 'any', qtyMin: '' }, search: '',
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** a stored / foreign view -> a safe one (unknown columns dropped, new columns appended, widths clamped) */
export function cleanView(raw) {
  const d = defaultView();
  if (!raw || typeof raw !== 'object') return d;
  const known = new Set(COLUMN_IDS);
  const order = (Array.isArray(raw.order) ? raw.order : []).filter((c, i, a) => known.has(c) && a.indexOf(c) === i);
  COLUMN_IDS.forEach((c) => { if (!order.includes(c)) order.push(c); });
  const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter((c) => known.has(c) && !colById(c).fixed) : d.hidden;
  const widths = {};
  Object.keys(raw.widths || {}).forEach((k) => { if (known.has(k) && Number.isFinite(+raw.widths[k])) widths[k] = clamp(Math.round(+raw.widths[k]), MIN_W, MAX_W); });
  const sort = (Array.isArray(raw.sort) ? raw.sort : []).filter((s) => s && known.has(s.id) && colById(s.id).sort).slice(0, 2).map((s) => ({ id: s.id, dir: s.dir === 'desc' ? 'desc' : 'asc' }));
  const f = raw.filters || {};
  const arr = (a) => (Array.isArray(a) ? a.map(String).slice(0, 60) : []);
  return {
    order, hidden, widths, sort, group: GROUP_BY.includes(raw.group) ? raw.group : 'none', pic: raw.pic !== false, picSize: PIC_SIZES[raw.picSize] ? raw.picSize : 'M',
    filters: { material: arr(f.material), group: arr(f.group), thk: arr(f.thk), grain: arr(f.grain), edge: ['any', 'none', 'with'].includes(f.edge) ? f.edge : 'any', qtyMin: f.qtyMin === '' || f.qtyMin == null ? '' : String(clamp(Math.round(+f.qtyMin) || 0, 0, 9999)) },
    search: typeof raw.search === 'string' ? raw.search.slice(0, 80) : '',
  };
}
/** the columns shown, in order (the picture column follows the `pic` switch) */
export function visibleColumns(view) {
  return view.order.map(colById).filter((c) => c && !view.hidden.includes(c.id) && (c.id !== 'pic' || view.pic));
}
export const setWidth = (view, id, w) => ({ ...view, widths: { ...view.widths, [id]: clamp(Math.round(w), MIN_W, MAX_W) } });
export const widthOf = (view, c) => view.widths[c.id] || c.w;
export function toggleColumn(view, id) {
  const c = colById(id); if (!c || c.fixed) return view;
  return { ...view, hidden: view.hidden.includes(id) ? view.hidden.filter((x) => x !== id) : [...view.hidden, id] };
}
/** move column `id` by `delta` places in the order (keyboard / drag drop) */
export function moveColumn(view, id, delta) {
  const o = view.order.slice(); const i = o.indexOf(id); if (i < 0) return view;
  const j = clamp(i + delta, 0, o.length - 1); if (i === j) return view;
  o.splice(i, 1); o.splice(j, 0, id); return { ...view, order: o };
}
export function moveColumnTo(view, id, beforeId) {
  const o = view.order.filter((c) => c !== id); const j = o.indexOf(beforeId); if (j < 0 || !view.order.includes(id)) return view;
  o.splice(j, 0, id); return { ...view, order: o };
}
/** click = sort by it (asc, then desc, then off); shift = add as secondary */
export function cycleSort(view, id, add = false) {
  const c = colById(id); if (!c || !c.sort) return view;
  const cur = view.sort.find((s) => s.id === id);
  const next = !cur ? { id, dir: 'asc' } : cur.dir === 'asc' ? { id, dir: 'desc' } : null;
  if (!add) return { ...view, sort: next ? [next] : [] };
  const rest = view.sort.filter((s) => s.id !== id);
  return { ...view, sort: (next ? [...rest, next] : rest).slice(-2) };
}
export const resetView = () => defaultView();

/* ---- persistence (per user, per browser; failure is silent) ---- */
export const viewKey = (user) => `neoCutList.view.v1.${user || 'anon'}`;
export function loadView(user) { try { return cleanView(JSON.parse(localStorage.getItem(viewKey(user)) || 'null')); } catch (e) { return defaultView(); } }
export function saveView(user, view) { try { localStorage.setItem(viewKey(user), JSON.stringify(view)); return true; } catch (e) { return false; } }

/* ---- filter / search / sort / group ---- */
export function filterOptions(rows) {
  const u = (f) => [...new Set(rows.map(f))];
  return {
    material: u((r) => r.matName).sort(), group: u((r) => r.group), thk: u((r) => fmt(r.thk)).sort((a, b) => +a - +b), grain: u((r) => (r.grain && r.grain !== '-' ? r.grain : '-')),
  };
}
const hay = (r, ctx) => [r.pid, r.name, r.nameAr, r.group, r.room, r.matName, r.note, r.edgeText, r.dims, r.ops.map((o) => o.en).join(' '), r.hw.map((o) => o.en).join(' '), ctx && ctx.ar ? (ctx.nameAr ? ctx.nameAr(r.name) : '') : ''].join(' ').toLowerCase();
export function applyFilters(rows, view, ctx) {
  const f = view.filters; const q = view.search.trim().toLowerCase();
  const qMin = f.qtyMin === '' ? 0 : +f.qtyMin;
  return rows.filter((r) => {
    if (f.material.length && !f.material.includes(r.matName)) return false;
    if (f.group.length && !f.group.includes(r.group)) return false;
    if (f.thk.length && !f.thk.includes(fmt(r.thk))) return false;
    if (f.grain.length && !f.grain.includes(r.grain && r.grain !== '-' ? r.grain : '-')) return false;
    const has = !!r.edges;
    if (f.edge === 'none' && has) return false;
    if (f.edge === 'with' && !has) return false;
    if (r.qty < qMin) return false;
    if (q && !q.split(/\s+/).every((t) => hay(r, ctx).includes(t))) return false;
    return true;
  });
}
export const filtersActive = (view) => { const f = view.filters; return !!(view.search.trim() || f.material.length || f.group.length || f.thk.length || f.grain.length || f.edge !== 'any' || f.qtyMin !== ''); };
export function clearFilters(view) { return { ...view, search: '', filters: defaultView().filters }; }

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
export function applySort(rows, view, ctx) {
  if (!view.sort.length) return rows;
  const keyed = rows.map((r, i) => ({ r, i }));
  keyed.sort((x, y) => {
    for (const s of view.sort) {
      const c = colById(s.id); const get = c.val || ((r) => c.text(r, ctx));
      const a = get(x.r); const b = get(y.r);
      const d = c.sort === 'n' ? cmp(num(a), num(b)) : natural(a, b);
      if (d) return s.dir === 'desc' ? -d : d;
    }
    return x.i - y.i;
  });
  return keyed.map((k) => k.r);
}
const GROUP_KEY = { material: (r) => r.matName, thickness: (r) => `${fmt(r.thk)} mm`, group: (r) => r.group, room: (r) => r.room };
/** [{ key, rows, pieces, area, edgeM }] ; one group holding everything when group = 'none' */
export function groupRows(rows, groupBy) {
  const total = (rs) => ({ rows: rs, pieces: rs.reduce((s, r) => s + r.qty, 0), area: rs.reduce((s, r) => s + r.area, 0), edgeM: rs.reduce((s, r) => s + r.edgeLen * r.qty, 0) });
  if (!GROUP_KEY[groupBy]) return [{ key: '', ...total(rows) }];
  const m = new Map();
  rows.forEach((r) => { const k = GROUP_KEY[groupBy](r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  return [...m.entries()].map(([key, rs]) => ({ key, ...total(rs) }));
}
/** the totals bar: pieces, m², edge metres (+ boards and waste when a nesting result is given) */
export function totals(rows, nest) {
  const pieces = rows.reduce((s, r) => s + r.qty, 0);
  const area = rows.reduce((s, r) => s + r.area, 0);
  const edgeM = rows.reduce((s, r) => s + r.edgeLen * r.qty, 0);
  let boards = 0; let waste = null;
  if (nest) { boards = nest.totalSheets; const sh = nest.materials.reduce((s, m) => s + m.sheetM2, 0); const used = nest.materials.reduce((s, m) => s + m.usedM2, 0); waste = sh > 0 ? Math.max(0, (1 - used / sh) * 100) : null; }
  return { pieces, area, edgeM, boards, waste, unique: rows.length };
}
/** rows -> a table of text cells for the visible columns (CSV / clipboard / label CSV). `ctx`: { ar, nameAr, noteAr, noteEn } */
export function tableText(rows, cols, ctx) {
  const use = cols.filter((c) => c.csv !== false && c.id !== 'pic');
  return { head: use.map((c) => (ctx.ar ? c.ar : c.en)), rows: rows.map((r) => use.map((c) => c.text(r, ctx))), ids: use.map((c) => c.id) };
}
const cell = (v) => { const s = String(v == null ? '' : v); return /[",\n;\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function tableCSV(rows, cols, ctx) { const t = tableText(rows, cols, ctx); return '﻿' + [t.head, ...t.rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'; }
export function tableTSV(rows, cols, ctx) { const t = tableText(rows, cols, ctx); return [t.head, ...t.rows].map((r) => r.map((v) => String(v).replace(/[\t\n]/g, ' ')).join('\t')).join('\n'); }
