/* =============================================================================
 * Neo Wardrobe Studio [NEO-CLOSETS-UX31] - the QUICK-EDIT floating menu: pure rules (no React, no DOM, no three.js).
 *
 *   classify()     the clicked item -> its kind (door, drawer, column, shelf, rail, divider, plinth, topbox, carcass) and its column
 *   ITEM_ACTIONS   ONE table: kind -> the quick actions that apply to THAT kind ({ primary, more })  - unit-tested
 *   ACTIONS        ONE registry: action id -> control type, icon and its EN / AR name + tooltip
 *   quickItems()   the controls the menu shows for a selection, each with its current value and, when it cannot apply, WHY (reason)
 *   applyQuick()   one action -> the next design (the SAME model setters the per-column editor and the Global cards use: setColumnWidth,
 *                  addColumn, removeColumn, setZoneType, setHeightPart ...) or a UI effect (open / close, edit in panel, select the column)
 *   placeMenu()    where the floating menu goes: next to the anchor, inside the drawing box, clamped, never over the anchor when it can help it
 *
 * Nothing here keeps state: the studio's one design object stays the single source of truth, every action is one undo step.
 * ===========================================================================*/
import { clamp } from '../neoKitchen/model';
import { FLOAT } from '../neoKitchen/floatRect';
import {
  normalizeX, setColumnWidth, addColumn, removeColumn, ZONE_DEFAULT, zonesOf, setHeightPart, clampField, modExtras, doorSystemFor,
  COL_W, TOTAL_W, WING_TOTAL_W, DOOR_STYLES, HANG_KEYS, RI, DRAWER_H, DRAWER_H_RANGE, DRAWER_MODES, DOOR_COVERS, drawerModeOf,
} from './wardrobeModel';

/* ---------- the item kinds ---------- */
export const KINDS = ['door', 'drawer', 'column', 'shelf', 'rail', 'divider', 'plinth', 'topbox', 'carcass'];
export const KIND_NAME = {
  door: ['Door', 'باب'], drawer: ['Drawer', 'درج'], column: ['Column', 'عمود'], shelf: ['Shelf', 'رف'], rail: ['Hanging rail', 'معلاق'],
  divider: ['Divider', 'فاصل'], plinth: ['Plinth', 'القاعدة'], topbox: ['Top box', 'الصندوق العلوي'], carcass: ['Carcass', 'الهيكل'],
};
export const QE_STEP = { rail: 50, width: 10 };

/** the kind of one scene part (a door leaf, a drawer front / box, a shelf, a divider, a top / bottom board, the carcass side / back = the column) */
export function kindOfPart(p, x) {
  if (!p) return 'column';
  const k = p.kind; const pt = p.ptype;
  if (k === 'door' || pt === 'door' || pt === 'glass' || /^(glass|frame|bar|track|leaf)/.test(k || '')) return x && x.topBoxH > 0 && p.sec === 0 ? 'topbox' : 'door';
  if (k === 'drawerFront' || k === 'drawerBox' || pt === 'drawer') return 'drawer';
  if (k === 'shelf') return 'shelf';
  if (k === 'divider') return 'divider';
  if (k === 'top' || k === 'bottom') return 'carcass';
  return 'column'; // side / back / anything else of the carcass = the column
}

/** the selection card's name / size for a picked rail or plinth (the studio's selectionInfo only knows scene parts): returns info unchanged for anything else */
export function nameFix(info, sel, scene, ar) {
  const pid = sel && sel.partId ? String(sel.partId) : '';
  if (!info || !/^(rail|plinth):/.test(pid)) return info;
  if (pid.startsWith('rail:')) {
    const r = (scene.props || []).find((q) => q.kind === 'rail' && q.unitId === sel.unitId);
    return { ...info, name: `${info.inst.label} - ${ar ? KIND_NAME.rail[1] : KIND_NAME.rail[0]}`, ptype: 'baseUnit', dims: r ? [r.box.u1 - r.box.u0, r.box.d1 - r.box.d0, r.box.y1 - r.box.y0] : info.dims, mat: 'Rail', area: null };
  }
  const run = scene.runs.find((q) => q.key === pid.slice(7)); const pl = run && run.plinth;
  return { ...info, name: ar ? KIND_NAME.plinth[1] : KIND_NAME.plinth[0], ptype: 'plinth', dims: pl ? [pl.u1 - pl.u0, pl.d1 - pl.d0, pl.y1 - pl.y0] : info.dims, mat: 'Plinth', area: null };
}

/** which column + which kind a selection is. `cols` = buildWardrobe(...).cols, `x` = normalized design.x (top box). null when nothing is selected. */
export function classify(info, sel, cols, x) {
  if (!info) return null;
  const uid = info.inst.unit.id;
  const c = (cols || []).find((q) => q.unitId === uid) || null;
  const col = c ? { part: c.part === 'wing' ? 'w' : 'm', idx: c.idx, key: `${c.part === 'wing' ? 'w' : 'm'}${c.idx}`, unitId: uid } : null;
  const pid = sel && sel.partId ? String(sel.partId) : '';
  let kind = 'column';
  if (/^rail:/.test(pid)) kind = 'rail';
  else if (/^plinth:/.test(pid)) kind = 'plinth';
  else if (info.part) kind = kindOfPart(info.part, x);
  if (!col && kind !== 'plinth') return { kind: 'carcass', col: null };
  return { kind, col };
}

/* ---------- the action registry ---------- */
/* ctl: btn (one click) | tog (on / off button) | seg (a few choices) | step (a count) | num (a number field with nudge) | sw (finish swatches) */
export const ACTIONS = {
  open:      { ctl: 'btn', icon: 'open', en: 'Open / close', ar: 'فتح / إغلاق', tip: ['Open or close this item in 3D', 'فتح أو إغلاق هذا العنصر في العرض ثلاثي الأبعاد'] },
  material:  { ctl: 'seg', icon: 'look', en: 'Material', ar: 'المادة', tip: ['Door material of this column: Wood, Glass or Smoked', 'مادة باب هذا العمود: خشب أو زجاج أو مدخّن'] },
  finish:    { ctl: 'sw', icon: 'look', en: 'Finish · whole wardrobe', ar: 'التشطيب · كل الخزانة', tip: ['Board finish colour (the whole wardrobe)', 'لون تشطيب الألواح (كل الخزانة)'] },
  doorType:  { ctl: 'seg', icon: 'doors', en: 'Door type · all columns', ar: 'نوع الباب · كل الأعمدة', tip: ['Hinged or sliding: one door system for the whole wardrobe', 'مفصلي أو منزلق: نظام أبواب واحد لكل الخزانة'] },
  leaves:    { ctl: 'seg', icon: 'doors', en: 'Leaves', ar: 'الضلف', tip: ['One or two leaves for this column', 'ضلفة أو ضلفتان لهذا العمود'] },
  hinge:     { ctl: 'seg', icon: 'doors', en: 'Hinge side', ar: 'جهة المفصلة', tip: ['Hinge on the left or the right', 'المفصلة يسار أو يمين'] },
  mirror:    { ctl: 'btn', icon: 'retry', en: 'Mirror', ar: 'عكس', tip: ['Flip the hinge side of this door', 'عكس جهة مفصلة هذا الباب'] },
  divisions: { ctl: 'step', icon: 'layers', en: 'Division bars · all glass doors', ar: 'قضبان التقسيم · كل الزجاج', tip: ['Glazing bars across every glass or smoked door', 'قضبان عبر كل أبواب الزجاج والمدخّن'] },
  handle:    { ctl: 'tog', icon: 'hardware', en: 'Handle', ar: 'مقبض', tip: ['Handles on or off (the whole wardrobe)', 'تشغيل أو إيقاف المقابض (كل الخزانة)'] },
  noDoor:    { ctl: 'tog', icon: 'close', en: 'No door', ar: 'بدون باب', tip: ['Remove the door of this column (open front); press again to bring it back', 'إزالة باب هذا العمود (واجهة مفتوحة)؛ اضغط مجددًا لإعادته'] },
  drawers:   { ctl: 'step', icon: 'drawers', en: 'Drawers', ar: 'الأدراج', tip: ['How many drawers this column has', 'عدد أدراج هذا العمود'] },
  drawerH:   { ctl: 'num', icon: 'drawers', en: 'Drawer height (mm)', ar: 'ارتفاع الدرج (مم)', tip: ['Height of each drawer in this column (the column gets taller / shorter drawers)', 'ارتفاع كل درج في هذا العمود'] },
  dMode:     { ctl: 'seg', icon: 'drawers', en: 'Drawer position', ar: 'موضع الأدراج', tip: ['Exposed fronts, or INSIDE the carcass behind this column\'s door', 'واجهات ظاهرة، أو داخل الهيكل خلف باب هذا العمود'] },
  doorCover: { ctl: 'seg', icon: 'doors', en: 'Door covers', ar: 'الباب يغطي', tip: ['Inside drawers: the door spans the drawers (full) or stops above them', 'الأدراج الداخلية: الباب يغطي الأدراج (كامل) أو يتوقف فوقها'] },
  toDoor:    { ctl: 'btn', icon: 'doors', en: 'Convert to door', ar: 'تحويل إلى باب', tip: ['Remove the drawers and give the column a door', 'إزالة الأدراج وإعطاء العمود بابًا'] },
  width:     { ctl: 'num', icon: 'resize', en: 'Width (cm)', ar: 'العرض (سم)', tip: ['Column width in cm', 'عرض العمود بالسنتيمتر'] },
  addLeft:   { ctl: 'btn', icon: 'plus', en: 'Add left', ar: 'إضافة يسار', tip: ['Add a column on the left of this one', 'إضافة عمود على يسار هذا العمود'] },
  addRight:  { ctl: 'btn', icon: 'plus', en: 'Add right', ar: 'إضافة يمين', tip: ['Add a column on the right of this one', 'إضافة عمود على يمين هذا العمود'] },
  duplicate: { ctl: 'btn', icon: 'plus', en: 'Duplicate', ar: 'تكرار', tip: ['Add a copy of this column next to it', 'إضافة نسخة من هذا العمود بجانبه'] },
  delete:    { ctl: 'btn', icon: 'close', en: 'Delete', ar: 'حذف', tip: ['Delete this item', 'حذف هذا العنصر'] },
  hide:      { ctl: 'tog', icon: 'eyeOff', en: 'Hide', ar: 'إخفاء', tip: ['Hide this column (it leaves the 3D, the cut list and the price)', 'إخفاء هذا العمود (يخرج من العرض ثلاثي الأبعاد وقائمة القص والسعر)'] },
  pin:       { ctl: 'tog', icon: 'pin', en: 'Pin width', ar: 'تثبيت العرض', tip: ['Pin: this column keeps its width when the closet width changes', 'تثبيت: يحتفظ العمود بعرضه عند تغيّر عرض الخزانة'] },
  addShelf:  { ctl: 'btn', icon: 'shelves', en: '+ Shelf', ar: '+ رف', tip: ['Add one shelf (shelves are spaced evenly by the engine)', 'إضافة رف (توزع المحرك الرفوف بالتساوي)'] },
  delShelf:  { ctl: 'btn', icon: 'shelves', en: '− Shelf', ar: '− رف', tip: ['Remove one shelf', 'إزالة رف'] },
  addRail:   { ctl: 'btn', icon: 'rails', en: '+ Rail', ar: '+ معلاق', tip: ['Add a hanging rail to this column', 'إضافة معلاق لهذا العمود'] },
  addDrawers:{ ctl: 'btn', icon: 'drawers', en: '+ Drawers', ar: '+ أدراج', tip: ['Add drawers (or one more drawer) to this column', 'إضافة أدراج (أو درج إضافي) لهذا العمود'] },
  applyAll:  { ctl: 'btn', icon: 'layers', en: 'Apply to all', ar: 'تطبيق على الكل', tip: ['Copy this column\'s shelves, rail, drawers and door settings to every other column', 'نسخ رفوف وأدراج ومعلاق وإعدادات باب هذا العمود إلى كل الأعمدة'] },
  railH:     { ctl: 'num', icon: 'rails', en: 'Rail height from floor (mm)', ar: 'ارتفاع المعلاق عن الأرض (مم)', tip: ['Height of the rail tube above the floor', 'ارتفاع أنبوب المعلاق عن الأرض'] },
  railUp:    { ctl: 'btn', icon: 'up', en: 'Rail up', ar: 'المعلاق لأعلى', tip: ['Raise the rail by 50 mm (it stops at the top of its zone)', 'رفع المعلاق 50 مم (يتوقف عند أعلى منطقته)'] },
  railDown:  { ctl: 'btn', icon: 'down', en: 'Rail down', ar: 'المعلاق لأسفل', tip: ['Lower the rail by 50 mm', 'خفض المعلاق 50 مم'] },
  railType:  { ctl: 'seg', icon: 'rails', en: 'Rail type', ar: 'نوع المعلاق', tip: ['Single, double or long-coat rail', 'مفرد أو مزدوج أو للمعاطف'] },
  delRail:   { ctl: 'btn', icon: 'close', en: 'Remove rail', ar: 'إزالة المعلاق', tip: ['Remove the hanging rail of this column', 'إزالة معلاق هذا العمود'] },
  plinthH:   { ctl: 'num', icon: 'plinth', en: 'Plinth height (mm)', ar: 'ارتفاع القاعدة (مم)', tip: ['Plinth height', 'ارتفاع القاعدة'] },
  setback:   { ctl: 'num', icon: 'plinth', en: 'Plinth setback (mm)', ar: 'تراجع القاعدة (مم)', tip: ['How far the plinth sits back from the front', 'مقدار تراجع القاعدة عن الواجهة'] },
  topBoxH:   { ctl: 'num', icon: 'top', en: 'Top box height (mm)', ar: 'ارتفاع الصندوق العلوي (مم)', tip: ['Height of the top box (loft); 0 = none', 'ارتفاع الصندوق العلوي؛ 0 = بدون'] },
  delTopBox: { ctl: 'btn', icon: 'close', en: 'Remove top box', ar: 'إزالة الصندوق العلوي', tip: ['Set the top box height to 0', 'جعل ارتفاع الصندوق العلوي 0'] },
  height:    { ctl: 'num', icon: 'resize', en: 'Overall height (mm)', ar: 'الارتفاع الكلي (مم)', tip: ['Overall height of the wardrobe', 'الارتفاع الكلي للخزانة'] },
  depth:     { ctl: 'num', icon: 'resize', en: 'Depth (mm)', ar: 'العمق (مم)', tip: ['Depth of the wardrobe', 'عمق الخزانة'] },
  parent:    { ctl: 'btn', icon: 'base', en: 'Select column', ar: 'تحديد العمود', tip: ['Select the column this item belongs to', 'تحديد العمود الذي ينتمي إليه هذا العنصر'] },
  panel:     { ctl: 'btn', icon: 'params', en: 'Edit in panel', ar: 'تعديل في اللوحة', tip: ['Open the full controls in the Parameters panel', 'فتح كل التحكمات في لوحة المعاملات'] },
  undo:      { ctl: 'btn', icon: 'undo', en: 'Undo', ar: 'تراجع', tip: ['Undo the last change (Ctrl+Z)', 'تراجع عن آخر تغيير (Ctrl+Z)'] },
};

/* ---------- the item -> actions table (the contract; see quickEditLogic.test.js) ---------- */
/* primary = always visible, more = behind the "..." button. Every kind ends with the generic ones (parent column, edit in panel, undo). */
export const ITEM_ACTIONS = {
  door: { primary: ['open', 'material', 'leaves', 'hinge', 'mirror', 'noDoor'], more: ['doorType', 'divisions', 'handle', 'finish', 'duplicate', 'parent', 'panel', 'undo'] },
  drawer: { primary: ['open', 'drawers', 'drawerH', 'dMode', 'handle', 'toDoor'], more: ['doorCover', 'finish', 'duplicate', 'parent', 'panel', 'undo'] },
  column: { primary: ['width', 'addLeft', 'addRight', 'duplicate', 'delete', 'hide', 'pin'], more: ['addShelf', 'addRail', 'addDrawers', 'applyAll', 'open', 'panel', 'undo'] },
  shelf: { primary: ['addShelf', 'delShelf'], more: ['addRail', 'addDrawers', 'duplicate', 'parent', 'panel', 'undo'] },
  rail: { primary: ['railH', 'railUp', 'railDown', 'railType', 'delRail', 'addShelf'], more: ['duplicate', 'parent', 'panel', 'undo'] },
  divider: { primary: ['addShelf', 'addRail', 'addDrawers'], more: ['duplicate', 'delete', 'parent', 'panel', 'undo'] },
  plinth: { primary: ['plinthH', 'setback'], more: ['parent', 'panel', 'undo'] },
  topbox: { primary: ['topBoxH', 'delTopBox'], more: ['parent', 'panel', 'undo'] },
  carcass: { primary: ['height', 'depth', 'plinthH', 'topBoxH'], more: ['parent', 'panel', 'undo'] },
};
/** the Parameters tab "Edit in panel" jumps to, per kind (the column editor lives in Main; Doors / Drawers / Shelves / Rails / Global are the cards) */
export const PANEL_TAB = { door: 'main', drawer: 'drawers', column: 'main', shelf: 'shelves', rail: 'rails', divider: 'main', plinth: 'global', topbox: 'global', carcass: 'global' };
/** what each item can NOT do in this model, shown by the tests and the docs (nothing in the menu pretends otherwise) */
export const NOT_BUILT = ['Move a shelf up / down (shelf positions are even, set by the engine)', 'Per-door handle on / off (handles are closet-wide)', 'Hinged <-> sliding per column (one door system per wardrobe)', 'Full-height vs partial door', 'Mirror (glass) fronts'];

/* ---------- column helpers ---------- */
const sum = (a) => a.reduce((t, m) => t + m.width, 0);
const modsOf = (d, p) => (p === 'w' ? normalizeX(d.x).wing.mods : d.mods);
const keepOf = (d, p) => (p === 'w' ? normalizeX(d.x).wing.keep : normalizeX(d.x).keepW);
const limOf = (p) => (p === 'w' ? WING_TOTAL_W : TOTAL_W);
const setCols = (d, p, mods) => {
  if (p === 'w') { const x0 = normalizeX(d.x); return { ...d, x: { ...x0, wing: { ...x0.wing, mods } } }; }
  return { ...d, mods, dims: { ...d.dims, w: sum(mods) } };
};
const patchMod = (d, p, i, patch) => {
  const mods = modsOf(d, p).map((m, j) => (j === i ? { ...m, ...patch } : m));
  if (p === 'w') { const x0 = normalizeX(d.x); return { ...d, x: { ...x0, wing: { ...x0.wing, mods } } }; }
  return { ...d, mods };
};
const unitIdOf = (p, m) => `${p === 'w' ? 'wr' : 'wc'}-${m.id}`;
const maxDrawers = (rules) => Math.min(6, (rules && rules.drawer_limit) || 4);
/** insert a new column before (side 'L') or after (side 'R') column i; `tpl` = a column to copy the interior from. Returns { mods, at } or null (no room). */
export function insertColumn(mods, i, side, keep, lim, prefix, tpl) {
  const r = addColumn(mods, keep, tpl ? tpl.width : 600, lim, prefix) || (tpl ? addColumn(mods, keep, 600, lim, prefix) : null);
  if (!r) return null;
  const made = r.mods[r.mods.length - 1]; const rest = r.mods.slice(0, -1);
  const col = tpl ? { ...made, hanging: tpl.hanging, shelves: tpl.shelves, drawers: tpl.drawers, ...modExtras({ ...tpl, pin: false, hidden: false }) } : made;
  const at = side === 'L' ? i : i + 1;
  return { mods: [...rest.slice(0, at), col, ...rest.slice(at)], at };
}

/* ---------- context ---------- */
/** ctx = { design, rules, kind, col:{part,idx,key,unitId}|null, railY, dimRange, openable, canUndo } */
const effStyle = (d, m) => m.style || normalizeX(d.x).doorStyle;
const NO = (en, ar) => ({ en, ar });

/** the controls of the menu for this selection: [{ id, group: 'primary'|'more', ctl, icon, label, tip, value, options, min, max, step, disabled, reason, pressed }] */
export function quickItems(ctx) {
  const { design: d, rules, kind, col } = ctx; const x = normalizeX(d.x);
  const spec = ITEM_ACTIONS[kind]; if (!spec) return [];
  const m = col ? modsOf(d, col.part)[col.idx] : null;
  const out = [];
  const add = (id, group) => {
    const a = ACTIONS[id]; if (!a) return;
    const it = { id, group, ctl: a.ctl, icon: a.icon, label: { en: a.en, ar: a.ar }, tip: { en: a.tip[0], ar: a.tip[1] }, disabled: false, reason: null };
    const off = (en, ar) => { it.disabled = true; it.reason = NO(en, ar); };
    const hasDoor = d.type !== 'open' && !(m && m.noDoor);
    switch (id) {
      case 'open': if (!ctx.openable) off('Nothing to open here', 'لا يوجد ما يُفتح هنا'); break;
      case 'material': it.value = m ? effStyle(d, m) : x.doorStyle; it.options = [['solid', { en: 'Wood', ar: 'خشب' }], ['glass', { en: 'Glass', ar: 'زجاج' }], ['smoked', { en: 'Smoked', ar: 'مدخّن' }]]; break;
      case 'finish': it.value = x.finishKey; break;
      case 'doorType': it.value = d.type === 'sliding' ? 'sliding' : 'hinged'; it.options = [['hinged', { en: 'Hinged', ar: 'مفصلي' }], ['sliding', { en: 'Sliding', ar: 'منزلق' }]]; break;
      case 'leaves': {
        it.value = String((m && m.leaves) || (ctx.leaves || 1)); it.options = [['1', { en: '1', ar: '1' }], ['2', { en: '2', ar: '2' }]];
        if (d.type !== 'hinged' || !hasDoor) off(d.type === 'sliding' ? 'Sliding doors have two tracks; leaves apply to hinged doors' : 'Leaves need a hinged door', d.type === 'sliding' ? 'الأبواب المنزلقة لها سكتان؛ الضلف للأبواب المفصلية' : 'الضلف تحتاج بابًا مفصليًا');
        break;
      }
      case 'hinge':
        it.value = (m && m.hinge) || (col && col.idx % 2 ? 'R' : 'L'); it.options = [['L', { en: 'Left', ar: 'يسار' }], ['R', { en: 'Right', ar: 'يمين' }]];
        if (d.type !== 'hinged' || !hasDoor) off('Hinges need a hinged door', 'المفصلات تحتاج بابًا مفصليًا');
        else if (Number(ctx.leaves || (m && m.leaves) || 1) !== 1) off('Two leaves are hinged at the outer edges; pick 1 leaf to choose a side', 'الضلفتان مفصلتان من الحافتين؛ اختر ضلفة واحدة لتحديد الجهة');
        break;
      case 'mirror':
        if (d.type !== 'hinged' || !hasDoor) off('Mirror flips a hinged door', 'العكس لباب مفصلي');
        else if (Number(ctx.leaves || (m && m.leaves) || 1) !== 1) off('Two leaves already open from the centre', 'الضلفتان تفتحان من المنتصف');
        break;
      case 'divisions': {
        it.value = x.divisions; it.min = 0; it.max = 6;
        const glassy = m ? effStyle(d, m) !== 'solid' : x.doorStyle !== 'solid';
        if (!glassy || d.type === 'open') off('Division bars split glass or smoked doors: pick Glass or Smoked first', 'القضبان تقسّم أبواب الزجاج أو المدخّن: اختر زجاج أو مدخّن أولًا');
        break;
      }
      case 'handle': it.pressed = x.handle.style !== 'none'; if (d.type === 'open') off('No doors, no handles', 'لا أبواب، لا مقابض'); break;
      case 'noDoor': it.pressed = !!(m && m.noDoor); if (d.type === 'open') off('The whole wardrobe is open already', 'الخزانة كلها مفتوحة'); break;
      case 'drawers': it.value = m ? m.drawers : 0; it.min = 0; it.max = maxDrawers(rules); break;
      case 'drawerH': if (m) { it.value = m.drawerH || DRAWER_H; it.min = DRAWER_H_RANGE.min; it.max = DRAWER_H_RANGE.max; it.step = 10; } if (!m || m.drawers === 0) off('This column has no drawers', 'هذا العمود بلا أدراج'); break;
      case 'dMode':
        it.value = m ? drawerModeOf(m, x) : x.drawerMode; it.options = [['front', { en: 'Front', ar: 'أمامي' }], ['inside', { en: 'Inside', ar: 'داخلي' }]];
        if (!m || m.drawers === 0) off('This column has no drawers', 'هذا العمود بلا أدراج');
        else if (!hasDoor) off('Inside drawers need a door to hide them behind', 'الأدراج الداخلية تحتاج بابًا يخفيها');
        break;
      case 'doorCover':
        it.value = (m && m.cover) || x.doorCover; it.options = [['full', { en: 'Full height', ar: 'كامل' }], ['above', { en: 'Above drawers', ar: 'فوق الأدراج' }]];
        if (!m || drawerModeOf(m, x) !== 'inside' || m.drawers === 0) off('Only for inside drawers: set Drawer position to Inside first', 'للأدراج الداخلية فقط: اضبط موضع الأدراج على «داخلي» أولًا');
        break;
      case 'toDoor': if (!m || m.drawers === 0) off('This column has no drawers', 'هذا العمود بلا أدراج'); break;
      case 'width': if (m) { it.value = m.width; it.min = COL_W.min; it.max = COL_W.max; it.step = QE_STEP.width; } break;
      case 'addLeft': case 'addRight': case 'duplicate': if (!col) off('Pick a column first', 'اختر عمودًا أولًا'); break;
      case 'delete':
        if (kind === 'divider') { it.label = { en: 'Delete column', ar: 'حذف العمود' }; }
        if (col && modsOf(d, col.part).length <= 1) off('A wardrobe needs at least one column', 'تحتاج الخزانة إلى عمود واحد على الأقل');
        break;
      case 'hide': it.pressed = !!(m && m.hidden); break;
      case 'pin': it.pressed = !!(m && m.pin); break;
      case 'addShelf': if (m && m.shelves >= 8) off('At most 8 shelves', 'ثمانية رفوف كحد أقصى'); break;
      case 'delShelf': if (!m || m.shelves <= 0) off('No shelves left', 'لا رفوف'); break;
      case 'addRail': if (m && m.hanging && m.hanging !== 'none') off('This column has a rail already', 'لهذا العمود معلاق بالفعل'); break;
      case 'addDrawers': if (m && m.drawers >= maxDrawers(rules)) off(`At most ${maxDrawers(rules)} drawers`, `${maxDrawers(rules)} أدراج كحد أقصى`); break;
      case 'applyAll': if (modsOf(d, 'm').length + (x.wing.on ? x.wing.mods.length : 0) < 2) off('There is only one column', 'يوجد عمود واحد فقط'); break;
      case 'railH': it.value = Math.round(ctx.railY || 0) || null; it.min = 100; it.max = 2200; it.step = QE_STEP.rail; if (ctx.railY == null) off('This column has no rail', 'هذا العمود بلا معلاق'); break;
      case 'railUp': case 'railDown': if (ctx.railY == null) off('This column has no rail', 'هذا العمود بلا معلاق'); break;
      case 'railType': it.value = m && m.hanging; it.options = HANG_KEYS.filter((k) => k !== 'none').map((k) => [k, { en: { single: 'Single', double: 'Double', long: 'Long' }[k], ar: { single: 'مفرد', double: 'مزدوج', long: 'طويل' }[k] }]); break;
      case 'delRail': if (!m || !m.hanging || m.hanging === 'none') off('This column has no rail', 'هذا العمود بلا معلاق'); break;
      case 'plinthH': it.value = x.plinthH; it.min = 50; it.max = 180; it.step = 10; break;
      case 'setback': it.value = x.plinthSetback; it.min = 0; it.max = 120; it.step = 5; break;
      case 'topBoxH': it.value = x.topBoxH; it.min = 0; it.max = 900; it.step = 10; break;
      case 'delTopBox': if (!x.topBoxH) off('There is no top box', 'لا يوجد صندوق علوي'); break;
      case 'height': it.value = d.dims.h; it.min = (ctx.dimRange && ctx.dimRange.h[0]) || 1000; it.max = (ctx.dimRange && ctx.dimRange.h[1]) || 4000; it.step = 10; break;
      case 'depth': it.value = d.dims.d; it.min = (ctx.dimRange && ctx.dimRange.d[0]) || 500; it.max = (ctx.dimRange && ctx.dimRange.d[1]) || 700; it.step = 10; break;
      case 'parent': if (!col) off('No column', 'لا عمود'); break;
      case 'undo': if (!ctx.canUndo) off('Nothing to undo', 'لا شيء للتراجع'); break;
      default: break;
    }
    out.push(it);
  };
  spec.primary.forEach((id) => add(id, 'primary'));
  spec.more.forEach((id) => add(id, 'more'));
  return out;
}

/* ---------- applying an action ---------- */
const fail = (en, ar) => ({ error: { en, ar } });
const done = (design, extra) => ({ design, ...extra });
const selectCol = (d, p, i) => { const m = modsOf(d, p)[i]; return m ? { key: `${p}${i}`, unitId: unitIdOf(p, m) } : null; };

/** apply one action. Returns { design?, select?, effect?, error?, clamped?, value?, coalesce? } - design = the next design (one undo step), effect = a UI command
 *  ('open' | 'undo' | 'panel' | 'parent'), select = the column to select afterwards, error = a short EN / AR reason when nothing could change. */
export function applyQuick(id, arg, ctx) {
  const { design: d, rules, col } = ctx; const x = normalizeX(d.x);
  const p = col && col.part; const i = col && col.idx; const mods = col ? modsOf(d, p) : null; const m = mods ? mods[i] : null;
  const cols = (patch, extra) => done(patchMod(d, p, i, patch), extra);
  switch (id) {
    case 'open': return { effect: 'open' };
    case 'undo': return { effect: 'undo' };
    case 'panel': return { effect: 'panel' };
    case 'parent': return col ? { effect: 'parent', select: selectCol(d, p, i) } : null;
    case 'material': {
      if (!m || !DOOR_STYLES.includes(arg)) return null;
      const patch = { style: arg === x.doorStyle ? undefined : arg, noDoor: false };
      let next = patchMod(d, p, i, patch);
      if (d.type === 'open') next = { ...next, type: 'hinged', doorSystem: doorSystemFor('hinged', d.doorSystem) }; // a glass / wood leaf needs doors
      return done(next); // the studio re-picks the same kind of part in this column once the scene is rebuilt
    }
    case 'finish': return arg && x.finishKey !== arg ? done({ ...d, x: { ...x, finishKey: arg } }) : null;
    case 'doorType': return arg === d.type ? null : done({ ...d, type: arg, doorSystem: doorSystemFor(arg, d.doorSystem) });
    case 'leaves': return m ? cols({ leaves: clamp(RI(arg), 1, 4) }) : null;
    case 'hinge': return m && (arg === 'L' || arg === 'R') ? cols({ hinge: arg }) : null;
    case 'mirror': { if (!m) return null; const cur = m.hinge || (i % 2 ? 'R' : 'L'); return cols({ hinge: cur === 'L' ? 'R' : 'L' }); }
    case 'divisions': { const v = clamp(RI(arg), 0, 6); return v === x.divisions ? null : done({ ...d, x: { ...x, divisions: v } }); }
    case 'handle': { const on = x.handle.style !== 'none'; return done({ ...d, x: { ...x, handle: { ...x.handle, style: on ? 'none' : 'profile' } } }); }
    case 'noDoor': return m ? done(patchMod(d, p, i, { noDoor: !m.noDoor }), { select: selectCol(d, p, i) }) : null;
    case 'drawers': { if (!m) return null; const v = clamp(RI(arg), 0, maxDrawers(rules)); return v === m.drawers ? null : cols({ drawers: v }); }
    case 'drawerH': { if (!m || m.drawers === 0) return null; const v = clamp(RI(arg), DRAWER_H_RANGE.min, DRAWER_H_RANGE.max); return cols({ drawerH: v === DRAWER_H ? 0 : v }, { coalesce: true, value: v }); }
    case 'dMode': return m && DRAWER_MODES.includes(arg) ? cols({ dMode: arg }) : null;
    case 'doorCover': return m && DOOR_COVERS.includes(arg) ? cols({ cover: arg }) : null;
    case 'toDoor': { if (!m) return null; let next = patchMod(d, p, i, { drawers: 0, noDoor: false }); if (d.type === 'open') next = { ...next, type: 'hinged', doorSystem: doorSystemFor('hinged', d.doorSystem) }; return done(next, { select: selectCol(d, p, i) }); }
    case 'width': {
      if (!m) return null;
      const r = setColumnWidth(mods, i, arg, keepOf(d, p), limOf(p));
      if (r.mods === mods) return fail('That width does not fit: columns are 20-120 cm and the total must stay in range.', 'هذا العرض لا يتسع: الأعمدة 20-120 سم ويجب أن يبقى الإجمالي ضمن المدى.');
      return done(setCols(d, p, r.mods), { clamped: r.clamped, value: r.mods[i].width, coalesce: true });
    }
    case 'addLeft': case 'addRight': case 'duplicate': {
      if (!m) return null;
      const side = id === 'addLeft' ? 'L' : 'R';
      const r = insertColumn(mods, i, side, keepOf(d, p), limOf(p), p === 'w' ? 'R' : 'M', id === 'duplicate' ? m : null);
      if (!r) return fail('No room for another column: columns are 20-120 cm.', 'لا يتسع عمود آخر: الأعمدة 20-120 سم.');
      return done(setCols(d, p, r.mods), { select: selectCol(setCols(d, p, r.mods), p, r.at) });
    }
    case 'delete': {
      if (!m) return null;
      const r = removeColumn(mods, i, keepOf(d, p), limOf(p));
      if (!r) return fail('That column cannot be deleted (a wardrobe needs one, and the total must stay in range).', 'لا يمكن حذف هذا العمود (تحتاج الخزانة إلى عمود والإجمالي ضمن المدى).');
      const next = setCols(d, p, r.mods);
      return done(next, { select: selectCol(next, p, Math.min(i, r.mods.length - 1)) });
    }
    case 'hide': return m ? cols({ hidden: !m.hidden }) : null;
    case 'pin': return m ? cols({ pin: !m.pin }) : null;
    case 'addShelf': { if (!m) return null; if (m.shelves >= 8) return null; return cols({ shelves: m.shelves + 1 }); }
    case 'delShelf': { if (!m || m.shelves <= 0) return null; return cols({ shelves: m.shelves - 1 }); }
    case 'addRail': { if (!m) return null; return zonesOf(m).includes('rail') ? null : cols({ hanging: ZONE_DEFAULT.rail.hanging }); }
    case 'addDrawers': {
      if (!m) return null; const mx = maxDrawers(rules);
      if (zonesOf(m).includes('drawers')) return m.drawers >= mx ? null : cols({ drawers: m.drawers + 1 });
      return cols({ drawers: ZONE_DEFAULT.drawers.drawers });
    }
    case 'applyAll': {
      if (!m) return null;
      const settings = { hanging: m.hanging, shelves: m.shelves, drawers: m.drawers, ...modExtras({ style: m.style, noDoor: m.noDoor, leaves: m.leaves, railH: m.railH }) };
      const apply = (o) => { const { style, noDoor, leaves, railH, ...rest } = o; return { ...rest, ...settings }; }; // eslint-disable-line no-unused-vars
      const x0 = normalizeX(d.x);
      const nm = d.mods.map(apply);
      const nw = x0.wing.on ? x0.wing.mods.map(apply) : x0.wing.mods;
      return done({ ...d, mods: nm, x: { ...x0, wing: { ...x0.wing, mods: nw } } });
    }
    case 'railH': {
      if (!m) return null; const v = clamp(RI(arg), 100, 2200);
      return cols({ railH: v }, { coalesce: true, value: v });
    }
    case 'railUp': case 'railDown': {
      if (!m || ctx.railY == null) return null;
      const v = clamp(Math.round(ctx.railY) + (id === 'railUp' ? QE_STEP.rail : -QE_STEP.rail), 100, 2200);
      return cols({ railH: v });
    }
    case 'railType': return m && HANG_KEYS.includes(arg) && arg !== 'none' ? cols({ hanging: arg }) : null;
    case 'delRail': return m ? cols({ hanging: 'none', railH: 0 }) : null;
    case 'plinthH': case 'topBoxH': { const r = setHeightPart(d, id, arg); return done(r.design, { clamped: r.clamped, value: r.value, coalesce: true }); }
    case 'delTopBox': { const r = setHeightPart(d, 'topBoxH', 0); return done(r.design); }
    case 'setback': { const c = clampField('plinthSetback', arg); return done({ ...d, x: { ...x, plinthSetback: c.value } }, { clamped: c.clamped, value: c.value, coalesce: true }); }
    case 'height': case 'depth': {
      const k = id === 'height' ? 'h' : 'd'; const lo = (ctx.dimRange && ctx.dimRange[k][0]) || 0; const hi = (ctx.dimRange && ctx.dimRange[k][1]) || 99999;
      const v = clamp(RI(arg), lo, hi);
      return done({ ...d, dims: { ...d.dims, [k]: v } }, { clamped: v !== RI(arg), value: v, coalesce: true });
    }
    default: return null;
  }
}

/* ---------- placement ---------- */
export const QE_PLACE = { pad: FLOAT.pad, gap: 10 };
/** clamp a w x h box inside a W x H area (px) with `pad` around it. Unlike floatRect's clampFloatRect (which keeps the assistant window at least 320 px) this takes any size. */
export function clampBox(x, y, w, h, W, H, pad = QE_PLACE.pad) {
  const mx = Math.max(pad, W - w - pad); const my = Math.max(pad, H - h - pad);
  return { x: Math.round(Math.min(mx, Math.max(pad, x))), y: Math.round(Math.min(my, Math.max(pad, y))) };
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/**
 * Where the menu (w x h) goes. anchor = { x, y, w, h } of the selected item, ALL in the coordinates of the drawing box { W, H } (the menu is clamped inside
 * that box, which never contains the toolbar, the Open bar, the viewport tools or the selection card). Tries the inline-end side first (right in LTR,
 * left in RTL), then the other side, below, above; the first that fits whole without covering the item wins. When none does (a huge or off-screen item)
 * the menu sits clamped at the inline-end edge of the box. Returns { x, y, side, covers }.
 */
export const QE_MIN_W = 232; // the narrowest the menu may be squeezed to (its rows wrap) to fit beside the item and clear of the box's own controls
export function placeMenu(anchor, size, box, { rtl = false, gap = QE_PLACE.gap, pad = QE_PLACE.pad, avoid = [] } = {}) {
  const { w, h } = size; const { W, H } = box;
  const a = anchor && Number.isFinite(anchor.x) ? anchor : null;
  if (!a) { const c = clampBox(rtl ? pad : W - w - pad, pad, w, h, W, H, pad); return { ...c, side: 'edge', covers: false, w }; }
  const ax = Math.max(0, Math.min(W, a.x)); const ay = Math.max(0, Math.min(H, a.y));
  const aw = Math.max(0, Math.min(W, a.x + a.w) - ax); const ah = Math.max(0, Math.min(H, a.y + a.h) - ay);
  const A = { x: ax, y: ay, w: aw, h: ah };
  const midY = A.y + A.h / 2 - h / 2; const midX = A.x + A.w / 2 - w / 2;
  const sides = rtl ? ['left', 'right', 'below', 'above'] : ['right', 'left', 'below', 'above'];
  const spot = (side, ww) => (side === 'right' ? { side, x: A.x + A.w + gap, y: midY } : side === 'left' ? { side, x: A.x - ww - gap, y: midY }
    : side === 'below' ? { side, x: midX, y: A.y + A.h + gap } : { side, x: midX, y: A.y - h - gap });
  const near = (v0) => (p1, p2) => Math.abs(p1 - v0) - Math.abs(p2 - v0);
  /* sliding a side placement up / down / outwards dodges the box's own controls (zoom, legend, the column's drag handles) */
  const dodge = (c, ww) => {
    if (c.side !== 'right' && c.side !== 'left') return [c];
    const ys = [c.y, ...avoid.flatMap((r) => [r.y - h - gap, r.y + r.h + gap]), pad, H - h - pad].sort(near(c.y));
    const xs = [c.x, ...avoid.map((r) => (c.side === 'right' ? r.x + r.w + gap : r.x - ww - gap))].sort(near(c.x));
    return xs.flatMap((x) => ys.map((y) => ({ ...c, x, y })));
  };
  const fits = (c, ww, strict) => {
    const okAxis = c.side === 'right' || c.side === 'left' ? c.x >= pad && c.x + ww <= W - pad : c.y >= pad && c.y + h <= H - pad;
    const cl = clampBox(c.x, c.y, ww, h, W, H, pad); const mb = { x: cl.x, y: cl.y, w: ww, h };
    return okAxis && !overlap(mb, A) && (!strict || avoid.every((r) => !overlap(mb, r))) ? cl : null;
  };
  /* pass 1: clear of the item AND of the box's own controls, at the natural width, then squeezed (rows wrap) down to QE_MIN_W; pass 2: clear of the item only */
  const widths = [w, ...[288, 256, QE_MIN_W].filter((v) => v < w)];
  for (const ww of widths) for (const side of sides) for (const c of dodge(spot(side, ww), ww)) { const cl = fits(c, ww, true); if (cl) return { ...cl, side, covers: false, w: ww }; }
  for (const side of sides) { const c = spot(side, w); const cl = fits(c, w, false); if (cl) return { ...cl, side, covers: false, w }; }
  /* nothing fits clear of the item: the inline-end edge of the box, vertically next to the item (covers it only if it must) */
  const cl = clampBox(rtl ? pad : W - w - pad, midY, w, h, W, H, pad);
  return { ...cl, side: 'edge', covers: overlap({ x: cl.x, y: cl.y, w, h }, A), w };
}
