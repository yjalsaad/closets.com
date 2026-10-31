/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - the pure model (no React, no DOM).
 *
 * A custom piece of furniture is an ASSEMBLY OF PARTS inside an overall W x H x D envelope (mm; x = width left->right, y = height up,
 * z = depth back->front). The design is one plain object:
 *   design = { v, title, tpl, dims:{w,h,d}, g:{ board, back, doorThk, doorGap, drawerGap, drawerSide, edgeBand },
 *              finishKey, x:{ paint, mats, matMap, handle, rates, joinery, snap }, parts:[Part] }
 * and a Part is
 *   { id, type, name, parent, x:AX, y:AX, z:AX, rep, mat, grain, eb:[...], cuts:[...], sec, hinge, mode, handle, hw, fix, note }
 * Every axis has ONE constraint (AX): the part is placed against its parent's range on that axis by an anchor
 *   min / max / center / fill ("fill remaining": from offset o to e before the far side) / after / before (a sibling) and an offset.
 * `rep` repeats the part n times with EQUAL SPACING along one axis. customSolve.js turns this into boxes; nothing here knows geometry.
 * Parents are 'group' parts (or null = the envelope), so a leg set, a drawer unit or a base can be moved as one.
 * Every function returns a NEW design (history, autosave and the studio rely on that).
 * ===========================================================================*/
export const FORMAT = 'neo-custom';
export const VERSION = 1;

export const DIM = { w: [200, 6000], h: [50, 3500], d: [100, 3000] };
export const AXES = ['x', 'y', 'z'];
export const AXIS_NAME = { x: ['Width', 'العرض'], y: ['Height', 'الارتفاع'], z: ['Depth', 'العمق'] };
export const AXIS_SHORT = { x: ['W', 'ع'], y: ['H', 'ا'], z: ['D', 'ق'] };
export const ANCHORS = ['min', 'max', 'center', 'fill', 'after', 'before'];
export const ANCHOR_NAME = {
  min: ['Start', 'البداية'], max: ['End', 'النهاية'], center: ['Centre', 'المنتصف'], fill: ['Fill', 'ملء'], after: ['After', 'بعد'], before: ['Before', 'قبل'],
};
export const ANCHOR_TIP = {
  min: ['Distance from the parent\'s low side (left / bottom / back)', 'المسافة من الجانب الأدنى للأصل (يسار / أسفل / خلف)'],
  max: ['Distance from the parent\'s high side (right / top / front)', 'المسافة من الجانب الأعلى للأصل (يمين / أعلى / أمام)'],
  center: ['Offset from the parent\'s centre', 'الإزاحة من منتصف الأصل'],
  fill: ['Fill the remaining space between two margins', 'ملء المساحة المتبقية بين هامشين'],
  after: ['Start after another part (stack on it / next to it)', 'يبدأ بعد جزء آخر (فوقه / بجانبه)'],
  before: ['End before another part', 'ينتهي قبل جزء آخر'],
};

/* ---- part types ------------------------------------------------------------------------------------------------ */
export const TYPES = [
  { k: 'panel', en: 'Panel / board', ar: 'لوح / بورد' },
  { k: 'shelf', en: 'Shelf', ar: 'رف' },
  { k: 'frame', en: 'Frame member / leg / rail', ar: 'عضو إطار / رجل / عارضة' },
  { k: 'drawer', en: 'Drawer', ar: 'درج' },
  { k: 'door', en: 'Door / front', ar: 'باب / واجهة' },
  { k: 'back', en: 'Back panel', ar: 'لوح خلفي' },
  { k: 'glass', en: 'Glass panel', ar: 'لوح زجاج' },
  { k: 'hardware', en: 'Hardware', ar: 'اكسسوار' },
  { k: 'group', en: 'Group', ar: 'مجموعة' },
];
export const TYPE_NAME = Object.fromEntries(TYPES.map((t) => [t.k, [t.en, t.ar]]));
/** short names used for generated part names ("Shelf 2") */
export const AUTO_NAME = {
  panel: ['Panel', 'لوح'], shelf: ['Shelf', 'رف'], frame: ['Frame', 'عضو إطار'], drawer: ['Drawer', 'درج'], door: ['Door', 'باب'], back: ['Back', 'ظهر'],
  glass: ['Glass', 'زجاج'], hardware: ['Hardware', 'اكسسوار'], group: ['Group', 'مجموعة'],
};

/* ---- production-material slots (the M&S names) and what they mean ---------------------------------------------- */
export const SLOTS = [
  { k: 'structure', en: 'Structure / frame', ar: 'الهيكل / الإطار', cls: 'Carcass', kind: 'side' },
  { k: 'shelves', en: 'Shelves', ar: 'الرفوف', cls: 'Shelf', kind: 'shelf' },
  { k: 'back', en: 'Back', ar: 'الظهر', cls: 'Back', kind: 'back' },
  { k: 'baseDoors', en: 'Doors and fronts', ar: 'الأبواب والواجهات', cls: 'Door', kind: 'door' },
  { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج', cls: 'Door', kind: 'drawerFront' },
  { k: 'drawers', en: 'Drawer boxes', ar: 'صناديق الأدراج', cls: 'Drawer', kind: 'drawerBox' },
  { k: 'plinth', en: 'Plinth / feet board', ar: 'القاعدة', cls: 'Plinth', kind: 'plinth' },
  { k: 'countertop', en: 'Top / worktop', ar: 'السطح', cls: 'Countertop', kind: 'counter' },
  { k: 'glass', en: 'Glass and frames', ar: 'الزجاج والإطارات', cls: 'Glass', kind: 'glass' },
  { k: 'handles', en: 'Handles', ar: 'المقابض', cls: null, kind: null },
];
export const SLOT = Object.fromEntries(SLOTS.map((s) => [s.k, s]));
/** the slots a board / frame / panel may be assigned to in the Parts tab */
export const BOARD_SLOTS = ['structure', 'shelves', 'back', 'baseDoors', 'drawerFronts', 'drawers', 'plinth', 'countertop'];
export const DEFAULT_SLOT = { panel: 'structure', shelf: 'shelves', frame: 'structure', drawer: 'drawers', door: 'baseDoors', back: 'back', glass: 'glass', hardware: 'handles', group: 'structure' };

/* ---- hardware items a "Hardware" part can be ------------------------------------------------------------------- */
export const HW = {
  bar: { en: 'Bar handle', ar: 'مقبض شريط', size: [128, 12, 14] },
  knob: { en: 'Knob', ar: 'مقبض كرة', size: [24, 24, 24] },
  profile: { en: 'Profile handle', ar: 'مقبض بروفايل', size: [300, 10, 14] },
  foot: { en: 'Adjustable foot', ar: 'قدم قابلة للضبط', size: [40, 30, 40] },
  castor: { en: 'Castor (lockable)', ar: 'عجلة (بقفل)', size: [50, 60, 50] },
  bracket: { en: 'Shelf / table bracket', ar: 'حامل رف / طاولة', size: [20, 150, 150] },
  support: { en: 'Concealed shelf support', ar: 'حامل رف مخفي', size: [20, 20, 120] },
};
export const HW_KEYS = Object.keys(HW);

export const GRAINS = ['auto', 'x', 'y', 'z', 'none'];
export const EDGE_CODES = ['L1', 'L2', 'W1', 'W2'];
export const CUT_KINDS = ['notch', 'radius', 'hole'];
export const CORNERS = ['tl', 'tr', 'bl', 'br'];
export const HANDLE_STYLES = ['auto', 'bar', 'knob', 'profile', 'push', 'none'];
export const FINISH_KEYS = ['oak', 'walnut', 'white', 'charcoal'];

/* ---- helpers --------------------------------------------------------------------------------------------------- */
export const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const r1 = (v) => Math.round(v * 10) / 10;
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const RI = (v) => Math.round(num(v, 0));
const str = (v, n = 80) => (typeof v === 'string' ? v.slice(0, n) : '');
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

/** axis constraint */
export const ax = (a = 'min', o = 0, s = 18, e = 0, r = '') => ({ a, o, s, e, r });
export const normAx = (raw, d) => {
  const q = raw && typeof raw === 'object' ? raw : {};
  const dd = d || ax();
  const a = oneOf(q.a, ANCHORS, dd.a);
  return { a, o: clampN(num(q.o, dd.o), -20000, 20000), s: clampN(num(q.s, dd.s), 0.5, 20000), e: clampN(num(q.e, dd.e), -20000, 20000), r: str(q.r, 24) };
};

export const nextId = (parts) => {
  let m = 0;
  parts.forEach((p) => { const n = /^p(\d+)$/.exec(p.id); if (n) m = Math.max(m, +n[1]); });
  return `p${m + 1}`;
};

export const blankPart = (type, id, patch = {}) => ({
  id, type, name: '', parent: null,
  x: ax('min', 0, 100), y: ax('min', 0, 100), z: ax('min', 0, 100), rep: null,
  mat: DEFAULT_SLOT[type] || 'structure', grain: 'auto', eb: [], cuts: [], sec: 'rect', hinge: 'L', mode: 'door', handle: 'auto', hw: 'bar', fix: 'fixed', note: '',
  ...patch,
});

const normCut = (c) => {
  if (!c || typeof c !== 'object') return null;
  const k = oneOf(c.k, CUT_KINDS, null); if (!k) return null;
  if (k === 'hole') return { k, x: clampN(num(c.x, 50), 0, 20000), y: clampN(num(c.y, 50), 0, 20000), d: clampN(num(c.d, 35), 2, 2000) };
  if (k === 'radius') return { k, c: oneOf(c.c, CORNERS, 'tl'), r: clampN(num(c.r, 20), 1, 1000) };
  return { k, c: oneOf(c.c, CORNERS, 'tl'), w: clampN(num(c.w, 50), 1, 5000), h: clampN(num(c.h, 50), 1, 5000) };
};

export function normPart(raw, i = 0) {
  const q = raw && typeof raw === 'object' ? raw : {};
  const type = oneOf(q.type, TYPES.map((t) => t.k), 'panel');
  const id = /^[A-Za-z0-9_-]{1,24}$/.test(q.id || '') ? q.id : `p${i + 1}`;
  const rep = q.rep && typeof q.rep === 'object' && type !== 'group' && RI(q.rep.n) > 1
    ? { n: clampN(RI(q.rep.n), 2, 60), axis: oneOf(q.rep.axis, AXES, 'x'), mode: oneOf(q.rep.mode, ['even', 'edge'], 'even') } : null;
  return {
    id, type, name: str(q.name, 60), parent: q.parent ? str(q.parent, 24) : null,
    x: normAx(q.x), y: normAx(q.y), z: normAx(q.z), rep,
    mat: oneOf(q.mat, SLOTS.map((s) => s.k), DEFAULT_SLOT[type]),
    grain: oneOf(q.grain, GRAINS, 'auto'),
    eb: [...new Set((Array.isArray(q.eb) ? q.eb : []).filter((c) => EDGE_CODES.includes(c)))],
    cuts: (Array.isArray(q.cuts) ? q.cuts : []).slice(0, 12).map(normCut).filter(Boolean),
    sec: oneOf(q.sec, ['rect', 'round'], 'rect'), hinge: oneOf(q.hinge, ['L', 'R'], 'L'), mode: oneOf(q.mode, ['door', 'flip', 'fixed'], 'door'),
    handle: oneOf(q.handle, HANDLE_STYLES, 'auto'), hw: oneOf(q.hw, HW_KEYS, 'bar'), fix: oneOf(q.fix, ['fixed', 'adjustable'], 'fixed'), note: str(q.note, 200),
  };
}

export const DEFAULT_G = { board: 18, back: 8, doorThk: 18, doorGap: 3, drawerGap: 3, drawerSide: 13, drawerBottom: 12, edgeBand: 1 };
export const G_RANGE = {
  board: [6, 60, 'Board thickness (new panels)', 'سماكة اللوح (للألواح الجديدة)'], back: [3, 20, 'Back board', 'لوح الظهر'], doorThk: [12, 40, 'Door / front board', 'لوح الباب / الواجهة'],
  doorGap: [0, 10, 'Door gap', 'فراغ الباب'], drawerGap: [0, 10, 'Drawer gap', 'فراغ الدرج'], drawerSide: [0, 30, 'Drawer side clearance', 'خلوص جانب الدرج'], drawerBottom: [0, 40, 'Drawer bottom inset', 'تراجع قاع الدرج'], edgeBand: [0, 3, 'Edge banding thickness', 'سماكة شريط الحواف'],
};
export const DEFAULT_X = { paint: {}, mats: {}, matMap: {}, handle: { style: 'bar', len: 128, pos: 'auto' }, rates: {}, joinery: true, snap: true };

export function normG(raw) {
  const g = { ...DEFAULT_G };
  Object.keys(DEFAULT_G).forEach((k) => { const r = G_RANGE[k]; g[k] = clampN(num(raw && raw[k], DEFAULT_G[k]), r[0], r[1]); });
  return g;
}
export function normX(raw) {
  const q = raw && typeof raw === 'object' ? raw : {};
  const h = q.handle && typeof q.handle === 'object' ? q.handle : {};
  const rates = q.rates && typeof q.rates === 'object' ? q.rates : {};
  const cleanRates = {};
  ['labourPct', 'vatPct', 'edgeBandM'].forEach((k) => { if (rates[k] !== undefined && Number.isFinite(Number(rates[k]))) cleanRates[k] = clampN(Number(rates[k]), 0, 1000); });
  ['board', 'hw', 'timberM'].forEach((grp) => {
    if (rates[grp] && typeof rates[grp] === 'object') {
      cleanRates[grp] = {};
      Object.keys(rates[grp]).slice(0, 40).forEach((k) => { const v = Number(rates[grp][k]); if (Number.isFinite(v)) cleanRates[grp][k] = clampN(v, 0, 100000); });
    }
  });
  if (typeof rates.currency === 'string') cleanRates.currency = rates.currency.slice(0, 4);
  return {
    paint: q.paint && typeof q.paint === 'object' ? q.paint : {}, mats: q.mats && typeof q.mats === 'object' ? q.mats : {}, matMap: q.matMap && typeof q.matMap === 'object' ? q.matMap : {},
    handle: { style: oneOf(h.style, ['bar', 'knob', 'profile', 'push', 'none'], 'bar'), len: oneOf(h.len, [96, 128, 160, 192, 256, 320], 128), pos: oneOf(h.pos, ['auto', 'top', 'center', 'bottom'], 'auto') },
    rates: cleanRates, joinery: q.joinery !== false, snap: q.snap !== false,
  };
}

/** a design from anything: clamps every number, drops unknown fields, repairs parents / refs. Never throws. */
export function normalizeDesign(raw) {
  const q = raw && typeof raw === 'object' ? raw : {};
  const d = q.dims && typeof q.dims === 'object' ? q.dims : {};
  const seen = new Set();
  let parts = (Array.isArray(q.parts) ? q.parts : []).slice(0, 400).map((p, i) => normPart(p, i)).filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  const byId = new Map(parts.map((p) => [p.id, p]));
  parts = parts.map((p) => {
    const par = p.parent && byId.has(p.parent) && byId.get(p.parent).type === 'group' && p.parent !== p.id ? p.parent : null;
    const fix = (a) => (a.r && !byId.has(a.r) ? { ...a, r: '' } : a);
    return { ...p, parent: par, x: fix(p.x), y: fix(p.y), z: fix(p.z) };
  });
  /* a parent chain must end at the envelope: break any loop */
  const parentOf = new Map(parts.map((p) => [p.id, p.parent]));
  parts = parts.map((p) => { let c = p.parent; let n = 0; while (c && n++ < 50) { if (c === p.id) return { ...p, parent: null }; c = parentOf.get(c); } return p; });
  return {
    v: VERSION, title: str(q.title, 80) || 'Custom piece', tpl: str(q.tpl, 24) || 'blank',
    dims: { w: clampN(RI(d.w) || 1200, DIM.w[0], DIM.w[1]), h: clampN(RI(d.h) || 750, DIM.h[0], DIM.h[1]), d: clampN(RI(d.d) || 600, DIM.d[0], DIM.d[1]) },
    g: normG(q.g), finishKey: oneOf(q.finishKey, FINISH_KEYS, 'oak'), x: normX(q.x), parts,
  };
}

export const blankDesign = (dims = { w: 1200, h: 750, d: 600 }) => normalizeDesign({ title: 'New custom piece', tpl: 'blank', dims, parts: [] });

/* ---- reading --------------------------------------------------------------------------------------------------- */
export const getPart = (design, id) => design.parts.find((p) => p.id === id) || null;
export const childrenOf = (design, id) => design.parts.filter((p) => (p.parent || null) === (id || null));
/** every descendant id of a part (children, grandchildren ...) */
export function descendants(design, id) {
  const out = [];
  const walk = (pid) => childrenOf(design, pid).forEach((c) => { out.push(c.id); walk(c.id); });
  walk(id);
  return out;
}
/** parts in tree pre-order with their depth (what the Parts list and the callout numbers follow) */
export function treeOrder(design) {
  const out = [];
  const walk = (pid, depth) => childrenOf(design, pid).forEach((p) => { out.push({ part: p, depth }); if (p.type === 'group') walk(p.id, depth + 1); });
  walk(null, 0);
  return out;
}
/** the number printed in the drawing bubble and in the cut-list Map column: pre-order position among non-group parts (1-based) */
export function numbering(design) {
  const m = new Map(); let n = 0;
  treeOrder(design).forEach(({ part }) => { if (part.type !== 'group') m.set(part.id, ++n); });
  return m;
}
/** the Arabic of the names the templates and the Add menu give their parts (a name the user typed is shown as typed) */
export const NAME_AR = {
  'Table top': 'سطح الطاولة', 'Front leg': 'رجل أمامية', 'Rear leg': 'رجل خلفية', 'Front apron': 'حزام أمامي', 'Rear apron': 'حزام خلفي', 'Side apron': 'حزام جانبي',
  Headboard: 'ظهر السرير', 'Side rail': 'جانب السرير', Footboard: 'مقدمة السرير', 'Slat ledger': 'حامل الشرائح', Slat: 'شريحة', Side: 'جانب', Top: 'سطح', Bottom: 'قاع', Plinth: 'قاعدة',
  Back: 'ظهر', Shelf: 'رف', Drawer: 'درج', Seat: 'مقعد', 'Side stretcher': 'رباط جانبي', 'Counter top': 'سطح المنضدة', 'End panel': 'لوح طرفي', Divider: 'فاصل', 'Front panel': 'لوح أمامي',
  'Rear panel': 'لوح خلفي', 'Drawer unit': 'وحدة الأدراج', 'Glass screen': 'حاجز زجاجي', Post: 'عمود', 'Back board': 'لوح الظهر', 'Padded panel': 'لوح منجّد', 'Top rail': 'عارضة علوية',
  'Cupboard top': 'سطح الخزانة', 'Cupboard door': 'باب الخزانة', 'Glass shelf': 'رف زجاجي', 'Glass front': 'واجهة زجاجية', Leg: 'رجل', 'Round leg': 'رجل دائرية', Rail: 'عارضة', Foot: 'قدم',
  Handle: 'مقبض', Bracket: 'حامل', Group: 'مجموعة', 'Flip-up door': 'باب قلاب',
};
/** a part's display name: its own, or "Shelf 2" (n = ordinal among parts of the same type). Arabic shows the dictionary form of a template name. */
export function partName(design, part, lang = 'en') {
  if (part.name) return lang === 'ar' && NAME_AR[part.name] ? NAME_AR[part.name] : part.name;
  const same = design.parts.filter((p) => p.type === part.type);
  const n = same.findIndex((p) => p.id === part.id) + 1;
  const base = AUTO_NAME[part.type] || AUTO_NAME.panel;
  return `${base[lang === 'ar' ? 1 : 0]} ${n}`;
}

/* ---- editing (pure) -------------------------------------------------------------------------------------------- */
const replacePart = (design, id, fn) => ({ ...design, parts: design.parts.map((p) => (p.id === id ? normPart(fn(p)) : p)) });
export function updatePart(design, id, patch) { return replacePart(design, id, (p) => ({ ...p, ...patch })); }
/** patch ONE axis constraint, e.g. setAx(d, 'p3', 'y', { a: 'max', o: 20 }) */
export function setAx(design, id, axis, patch) { return replacePart(design, id, (p) => ({ ...p, [axis]: { ...p[axis], ...patch } })); }
export function setRep(design, id, rep) { return replacePart(design, id, (p) => ({ ...p, rep })); }
export const setDims = (design, patch) => normalizeDesign({ ...design, dims: { ...design.dims, ...patch } });
export const setG = (design, patch) => ({ ...design, g: normG({ ...design.g, ...patch }) });
export const setX = (design, patch) => ({ ...design, x: normX({ ...design.x, ...patch }) });

/** removes the part and everything inside it; sibling references to a removed part are cleared (that axis falls back to Start) */
export function deletePart(design, id) {
  const gone = new Set([id, ...descendants(design, id)]);
  const fix = (a) => (gone.has(a.r) ? { ...a, a: a.a === 'after' || a.a === 'before' ? 'min' : a.a, r: '' } : a);
  return { ...design, parts: design.parts.filter((p) => !gone.has(p.id)).map((p) => ({ ...p, x: fix(p.x), y: fix(p.y), z: fix(p.z) })) };
}

/** moves a part one step up / down among its siblings (draw order, numbering) */
export function movePart(design, id, dir) {
  const p = getPart(design, id); if (!p) return design;
  const sibs = childrenOf(design, p.parent).map((s) => s.id);
  const i = sibs.indexOf(id); const j = i + (dir < 0 ? -1 : 1);
  if (j < 0 || j >= sibs.length) return design;
  const a = design.parts.findIndex((q) => q.id === sibs[i]); const b = design.parts.findIndex((q) => q.id === sibs[j]);
  const parts = design.parts.slice(); [parts[a], parts[b]] = [parts[b], parts[a]];
  return { ...design, parts };
}

/** puts a part inside another group (or null = the envelope). Its position is kept in absolute terms by the studio (see reparentKeep). */
export function setParent(design, id, parent) {
  if (parent && (parent === id || descendants(design, id).includes(parent) || !getPart(design, parent) || getPart(design, parent).type !== 'group')) return design;
  return replacePart(design, id, (p) => ({ ...p, parent: parent || null }));
}

/** deep copy of a part with its subtree: new ids, internal references remapped. Returns { design, id }. */
export function duplicatePart(design, id, { shift = 40 } = {}) {
  const src = getPart(design, id); if (!src) return { design, id: null };
  const ids = [id, ...descendants(design, id)];
  const parts = design.parts.slice();
  const map = new Map();
  let n0 = Number(nextId(design.parts).slice(1)) - 1;
  ids.forEach((old) => { n0 += 1; map.set(old, `p${n0}`); });
  const copies = ids.map((old) => {
    const p = getPart(design, old);
    const remap = (a) => (a.r && map.has(a.r) ? { ...a, r: map.get(a.r) } : a);
    return { ...p, id: map.get(old), parent: old === id ? p.parent : map.get(p.parent), name: old === id && p.name ? `${p.name} copy` : p.name, x: remap(p.x), y: remap(p.y), z: remap(p.z) };
  });
  /* the copy of the top part is nudged along x so it is visible; fill / after / before become a plain Start offset only when needed */
  const top = copies[0];
  const nudge = (a) => (a.a === 'min' ? { ...a, o: a.o + shift } : a.a === 'max' ? { ...a, o: a.o - shift } : a.a === 'center' ? { ...a, o: a.o + shift } : a.a === 'fill' ? { ...a, o: a.o + shift, e: Math.max(0, a.e - shift) } : { ...a, o: a.o + shift });
  copies[0] = { ...top, x: nudge(top.x) };
  /* insert right after the source (and its subtree) so the numbering stays tidy */
  const lastIdx = Math.max(...ids.map((i) => design.parts.findIndex((p) => p.id === i)));
  parts.splice(lastIdx + 1, 0, ...copies.map((c) => normPart(c)));
  return { design: { ...design, parts }, id: copies[0].id };
}

/** mirror a part (and its subtree) across the middle of its parent on one axis. Returns { design, id } (the mirrored copy is added; `inPlace` mirrors the part itself).
 *  Anchors flip (Start <-> End, Centre offset negates, Fill margins swap); After / Before become a plain Start offset taken from the solved box (`solved`). */
export function mirrorPart(design, id, axis = 'x', { solved = null, inPlace = false } = {}) {
  const src = getPart(design, id); if (!src || !AXES.includes(axis)) return { design, id: null };
  const flipA = (a, whole) => {
    if (a.a === 'min') return { ...a, a: 'max' };
    if (a.a === 'max') return { ...a, a: 'min' };
    if (a.a === 'center') return { ...a, o: -a.o };
    if (a.a === 'fill') return { ...a, o: a.e, e: a.o };
    /* after / before: keep it simple and exact - re-express as a Start offset from the solved box when we have it */
    if (whole && solved) {
      const it = solved.byBase.get(id); const pb = parentRange(design, solved, src.parent, axis);
      if (it && pb) { const lo = it[0].box[`${axis}0`]; const hi = it[it.length - 1].box[`${axis}1`]; return { ...a, a: 'min', o: r1(pb[1] - hi - pb[0]), r: '' }; }
    }
    return { ...a, a: 'min', o: 0, r: '' };
  };
  const flipPart = (p, isRoot) => {
    const out = { ...p, [axis]: isRoot ? flipA(p[axis], true) : p[axis] };
    if (axis === 'x' && isRoot && p.type === 'door') out.hinge = p.hinge === 'L' ? 'R' : 'L';
    return out;
  };
  if (inPlace) return { design: replacePart(design, id, (p) => flipPart(p, true)), id };
  const dup = duplicatePart(design, id, { shift: 0 });
  /* undo the nudge duplicatePart would apply (shift 0 = none) and flip the new top part */
  const parts = dup.design.parts.map((p) => (p.id === dup.id ? normPart({ ...flipPart(p, true), name: p.name ? `${src.name} (mirror)` : '' }) : p));
  return { design: { ...dup.design, parts }, id: dup.id };
}
function parentRange(design, solved, parentId, axis) {
  if (!parentId) { const r = solved.root; return [r[`${axis}0`], r[`${axis}1`]]; }
  const it = solved.byBase.get(parentId); if (!it) return null;
  return [it[0].box[`${axis}0`], it[0].box[`${axis}1`]];
}

/* ---- palette (what the "Add" menu creates) ---------------------------------------------------------------------- */
/** each preset builds a part that fits INSIDE its parent box `pb` = { w, h, d } (so a new part is always visible and sensible) */
export const PRESETS = [
  { k: 'side', type: 'panel', en: 'Side panel (vertical)', ar: 'لوح جانبي (عمودي)', make: (pb, g) => ({ name: '', mat: 'structure', x: ax('min', 0, g.board), y: ax('fill', 0, 0, 0), z: ax('fill', 0, 0, 0), eb: ['L1'] }) },
  { k: 'horiz', type: 'panel', en: 'Horizontal panel', ar: 'لوح أفقي', make: (pb, g) => ({ mat: 'structure', x: ax('fill', 0, 0, 0), y: ax('min', Math.round(pb.h / 2), g.board), z: ax('fill', 0, 0, 0), eb: ['L1'] }) },
  { k: 'top', type: 'panel', en: 'Top / worktop', ar: 'سطح / توب', make: (pb, g) => ({ name: 'Top', mat: 'structure', x: ax('fill', 0, 0, 0), y: ax('max', 0, 30), z: ax('fill', 0, 0, 0), eb: ['L1', 'L2', 'W1', 'W2'] }) },
  { k: 'shelf', type: 'shelf', en: 'Shelf', ar: 'رف', make: (pb, g) => ({ mat: 'shelves', x: ax('fill', g.board, 0, g.board), y: ax('min', Math.round(pb.h / 2), g.board), z: ax('fill', 0, 0, 10), eb: ['L1'] }) },
  { k: 'back', type: 'back', en: 'Back panel', ar: 'لوح خلفي', make: (pb, g) => ({ mat: 'back', x: ax('fill', 0, 0, 0), y: ax('fill', 0, 0, 0), z: ax('min', 0, g.back) }) },
  { k: 'plinth', type: 'panel', en: 'Plinth / kick board', ar: 'قاعدة', make: (pb, g) => ({ name: 'Plinth', mat: 'plinth', x: ax('fill', g.board, 0, g.board), y: ax('min', 0, 100), z: ax('min', 60, g.board), eb: ['L1'] }) },
  { k: 'leg', type: 'frame', en: 'Leg (rectangular)', ar: 'رجل (مربعة)', make: (pb) => ({ name: 'Leg', mat: 'structure', x: ax('min', 0, 60), y: ax('min', 0, Math.min(Math.round(pb.h * 0.9), 720)), z: ax('min', 0, 60), sec: 'rect' }) },
  { k: 'leg-round', type: 'frame', en: 'Leg (round)', ar: 'رجل (دائرية)', make: (pb) => ({ name: 'Round leg', mat: 'structure', x: ax('min', 0, 60), y: ax('min', 0, Math.min(Math.round(pb.h * 0.9), 720)), z: ax('min', 0, 60), sec: 'round' }) },
  { k: 'rail', type: 'frame', en: 'Rail (horizontal)', ar: 'عارضة (أفقية)', make: (pb) => ({ name: 'Rail', mat: 'structure', x: ax('fill', 60, 0, 60), y: ax('max', 20, 80), z: ax('min', 20, 20), sec: 'rect' }) },
  { k: 'drawer', type: 'drawer', en: 'Drawer', ar: 'درج', make: (pb, g) => ({ mat: 'drawers', x: ax('fill', g.board, 0, g.board), y: ax('min', g.board, Math.min(180, Math.max(80, Math.round(pb.h / 4)))), z: ax('fill', 0, 0, 0) }) },
  { k: 'door', type: 'door', en: 'Door (hinged)', ar: 'باب (مفصلي)', make: (pb, g) => ({ mat: 'baseDoors', mode: 'door', x: ax('fill', 0, 0, 0), y: ax('fill', 0, 0, 0), z: ax('max', 0, g.doorThk) }) },
  { k: 'flip', type: 'door', en: 'Flip-up door', ar: 'باب قلاب', make: (pb, g) => ({ name: 'Flip-up door', mat: 'baseDoors', mode: 'flip', x: ax('fill', 0, 0, 0), y: ax('fill', 0, 0, 0), z: ax('max', 0, g.doorThk) }) },
  { k: 'front', type: 'door', en: 'Fixed front panel', ar: 'واجهة ثابتة', make: (pb, g) => ({ name: 'Front panel', mat: 'baseDoors', mode: 'fixed', x: ax('fill', 0, 0, 0), y: ax('fill', 0, 0, 0), z: ax('max', 0, g.doorThk) }) },
  { k: 'glass', type: 'glass', en: 'Glass panel', ar: 'لوح زجاج', make: (pb) => ({ mat: 'glass', x: ax('fill', 0, 0, 0), y: ax('fill', 0, 0, 0), z: ax('center', 0, 6) }) },
  { k: 'foot', type: 'hardware', en: 'Adjustable foot', ar: 'قدم قابلة للضبط', make: () => ({ name: 'Foot', hw: 'foot', mat: 'handles', x: ax('min', 40, 40), y: ax('min', 0, 30), z: ax('min', 40, 40) }) },
  { k: 'handle', type: 'hardware', en: 'Handle (bar)', ar: 'مقبض (شريط)', make: (pb) => ({ name: 'Handle', hw: 'bar', mat: 'handles', x: ax('center', 0, 128), y: ax('center', 0, 12), z: ax('max', 0, 14) }) },
  { k: 'bracket', type: 'hardware', en: 'Bracket', ar: 'حامل', make: () => ({ name: 'Bracket', hw: 'bracket', mat: 'handles', x: ax('min', 0, 20), y: ax('min', 0, 150), z: ax('min', 0, 150) }) },
  { k: 'group', type: 'group', en: 'Group (assembly)', ar: 'مجموعة (تجميع)', make: (pb) => ({ name: 'Group', x: ax('fill', 0, 0, 0), y: ax('fill', 0, 0, 0), z: ax('fill', 0, 0, 0) }) },
];
export const PRESET = Object.fromEntries(PRESETS.map((p) => [p.k, p]));

/** add a part from a preset. `pb` = the parent's size { w, h, d } (the studio passes the solved box; the envelope when parent is null). Returns { design, id }. */
export function addPart(design, presetKey, { parent = null, pb = null, patch = {} } = {}) {
  const pr = PRESET[presetKey] || PRESET.horiz;
  const size = pb || { w: design.dims.w, h: design.dims.h, d: design.dims.d };
  const id = nextId(design.parts);
  const base = pr.make(size, design.g);
  const par = parent && getPart(design, parent) && getPart(design, parent).type === 'group' ? parent : null;
  const part = normPart({ ...blankPart(pr.type, id), ...base, ...patch, id, type: pr.type, parent: par });
  return { design: { ...design, parts: [...design.parts, part] }, id };
}

/* ---- persistence ----------------------------------------------------------------------------------------------- */
export function designJSON(design) {
  return JSON.stringify({ format: FORMAT, v: VERSION, exportedAt: new Date().toISOString(), design: normalizeDesign(design) }, null, 2);
}
/** parse + validate + clamp a saved file; throws a short message on a bad file */
export function parseDesign(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON file'); }
  if (!raw || raw.format !== FORMAT) throw new Error(raw && raw.format ? `Unknown format "${raw.format}"` : 'Not a Neo Custom file');
  if (!raw.design || !Array.isArray(raw.design.parts)) throw new Error('The file has no parts');
  return normalizeDesign(raw.design);
}
export const designKey = (d) => JSON.stringify({ t: d.title, tpl: d.tpl, dims: d.dims, g: d.g, f: d.finishKey, x: d.x, p: d.parts });
