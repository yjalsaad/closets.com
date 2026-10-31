/* =============================================================================
 * Neo Office Furniture Designer [NEO-CATEGORIES-UX26] - desks and storage in the generic Neo category studio.
 *   units : desk (straight; with an L or U return on the Global tab) - panel or steel (or electric sit-stand) legs, modesty panel, privacy panel,
 *           monitor shelf, keyboard tray, cable grommets, cable tray - pedestal (box / file / mixed drawers), credenza (+ hutch), bookcase, filing cabinet
 *   tabs  : Global | M&S | Units | Desk & ergonomics | Layout & return | Hardware | Price
 * A desk module has no carcass: its top, legs, panels and trays are parts added to a synthetic module; pedestals, credenzas, bookcases and filing
 * cabinets are real Neo Kitchen units. Ergonomic height presets (sit 740 / stand 1100) set the desk height; the pedestal follows it.
 * ===========================================================================*/
import { baseG, assemble, leafCount } from '../categoryModel';
import { registerProduct } from '../../neoKitchen/productInfo';
import { registerArabicNames, registerArabicNotes } from '../../neoKitchen/cutlist';
import { addPart, addProp, addModule, setCounters, addCutout, findInst } from '../categoryKit';
import { U, S } from '../../neoKitchen/model';

const sp = (o) => o;
const kw = (re) => re;
const IN = 25.4;
export const PARAMS = [
  /* Global + ergonomics */
  sp({ k: 'deskH', t: 'num', min: 600, max: 1300, step: 10, def: 740, en: 'Desk height (top surface)', ar: 'ارتفاع المكتب (سطح الطاولة)', quick: [[740, 'Sit', 'جلوس'], [1100, 'Stand', 'وقوف']], help: ['Sitting: 720-760 mm. Standing: 1000-1250 mm. The pedestals follow this height.', 'جلوسًا: ٧٢٠-٧٦٠ مم. وقوفًا: ١٠٠٠-١٢٥٠ مم. تتبع الوحدات هذا الارتفاع.'] }),
  sp({ k: 'deskD', t: 'num', min: 500, max: 900, step: 10, def: 700, en: 'Desk depth', ar: 'عمق المكتب' }),
  sp({ k: 'topThk', t: 'num', min: 18, max: 50, step: 1, def: 25, en: 'Desk top thickness', ar: 'سماكة سطح المكتب' }),
  sp({ k: 'top', t: 'seg', def: 'oakslab', opts: [['oakslab', 'Solid oak', 'بلوط صلب'], ['laminate', 'Laminate', 'لامينيت'], ['quartz', 'Quartz', 'كوارتز'], ['granite', 'Granite', 'جرانيت'], ['marble', 'Marble', 'رخام']], en: 'Top material', ar: 'مادة السطح' }),
  sp({ k: 'glide', t: 'num', min: 20, max: 150, step: 5, def: 30, en: 'Glide / castor height', ar: 'ارتفاع القدم / العجلة' }),
  sp({ k: 'lift', t: 'tog', def: false, en: 'Electric sit-stand frame', ar: 'هيكل كهربائي (جلوس / وقوف)', help: ['Replaces the panel legs with two electric lift columns and a controller.', 'يستبدل الأرجل اللوحية بعمودين كهربائيين ووحدة تحكم.'] }),
  sp({ k: 'credH', t: 'num', min: 500, max: 1000, step: 10, def: 720, en: 'Credenza height', ar: 'ارتفاع الكريدنزا' }),
  sp({ k: 'credD', t: 'num', min: 300, max: 600, step: 10, def: 450, en: 'Credenza / filing depth', ar: 'عمق الكريدنزا / الملفات' }),
  sp({ k: 'hutchH', t: 'num', min: 250, max: 1000, step: 10, def: 600, en: 'Hutch height (above a credenza)', ar: 'ارتفاع الجزء العلوي (فوق الكريدنزا)' }),
  sp({ k: 'towerH', t: 'num', min: 1000, max: 2400, step: 50, def: 1800, en: 'Bookcase / filing height', ar: 'ارتفاع المكتبة / خزانة الملفات' }),
  sp({ k: 'bookD', t: 'num', min: 250, max: 450, step: 10, def: 320, en: 'Bookcase depth', ar: 'عمق المكتبة' }),
  /* Desk & accessories */
  sp({ k: 'modestyH', t: 'num', min: 150, max: 600, step: 10, def: 350, en: 'Modesty panel height', ar: 'ارتفاع اللوح الخلفي (الستر)' }),
  sp({ k: 'privacyH', t: 'num', min: 150, max: 600, step: 10, def: 300, en: 'Privacy panel height', ar: 'ارتفاع لوح الخصوصية' }),
  sp({ k: 'monitorH', t: 'num', min: 100, max: 300, step: 10, def: 160, en: 'Monitor shelf: height above the desk', ar: 'رف الشاشة: الارتفاع فوق المكتب' }),
  sp({ k: 'monitorW', t: 'num', min: 400, max: 1400, step: 50, def: 800, en: 'Monitor shelf: width', ar: 'رف الشاشة: العرض' }),
  sp({ k: 'holeD', t: 'num', min: 40, max: 80, step: 2, def: 60, en: 'Cable grommet diameter', ar: 'قطر حلقة الكابل' }),
  sp({ k: 'monitors', t: 'step', min: 0, max: 3, def: 1, kw: kw(/monitors?|screens?|شاشات|شاشة/), en: 'Monitors on the desk', ar: 'الشاشات على المكتب' }),
  sp({ k: 'monitorSize', t: 'num', unit: 'in', min: 19, max: 40, step: 1, def: 27, en: 'Monitor size (diagonal)', ar: 'مقاس الشاشة (القطر)', when: (c) => c.p.monitors > 0, why: ['No monitors on the desk.', 'لا شاشات على المكتب.'] }),
  sp({ k: 'chair', t: 'tog', def: true, en: 'Show an office chair', ar: 'إظهار كرسي مكتب' }),
  /* Layout */
  sp({ k: 'shape', t: 'seg', def: 'straight', opts: [['straight', 'Straight', 'مستقيم'], ['L', 'L-shape', 'حرف L'], ['U', 'U-shape', 'حرف U']], en: 'Desk shape', ar: 'شكل المكتب' }),
  sp({ k: 'returnSide', t: 'seg', def: 'right', opts: [['right', 'Right', 'يمين'], ['left', 'Left', 'يسار']], en: 'Return on the', ar: 'الجناح على جهة', when: (c) => c.p.shape === 'L', why: ['Only for an L-shaped desk (a U has both).', 'لمكتب حرف L فقط (حرف U له الجهتان).'] }),
  sp({ k: 'returnLen', t: 'num', min: 900, max: 2400, step: 50, def: 1500, en: 'Return reach (from the back wall)', ar: 'امتداد الجناح (من الحائط الخلفي)', when: (c) => c.p.shape !== 'straight', why: ['Choose an L or U desk first.', 'اختر مكتب حرف L أو U أولًا.'], help: ['Measured from the back wall: the first desk-depth is under the main desk.', 'يُقاس من الحائط الخلفي: أول عمق مكتب يقع تحت المكتب الرئيسي.'] }),
  /* Materials */
  sp({ k: 'boardType', t: 'seg', def: 'mdf', opts: [['mdf', 'MDF 18 mm', 'MDF ١٨ مم'], ['ply', 'Birch plywood', 'أبلكاش بتولا'], ['mel', 'Melamine chipboard', 'ميلامين']], en: 'Board', ar: 'اللوح' }),
];

const BOARD_NAME = { mdf: 'MDF 18 mm (veneer / lacquer grade)', ply: 'Birch plywood 18 mm', mel: 'Melamine chipboard 18 mm' };
const UPLIFT = { mdf: 1, ply: 1.6, mel: 0.75 };
const DESKISH = ['desk', 'pedestal'];

const UNIT_TYPES = {
  desk: {
    en: 'Desk', ar: 'مكتب', tag: 'D', w: { min: 800, max: 2400, def: 1600 },
    opts: [
      sp({ k: 'legs', t: 'seg', def: 'panel', opts: [['panel', 'Panel legs', 'أرجل لوحية'], ['steel', 'Steel legs', 'أرجل معدنية']], en: 'Legs', ar: 'الأرجل' }),
      sp({ k: 'modesty', t: 'tog', def: true, en: 'Modesty panel (back)', ar: 'لوح ستر خلفي' }),
      sp({ k: 'privacy', t: 'seg', def: 'none', opts: [['none', 'None', 'بدون'], ['front', 'Front knee panel', 'لوح أمامي'], ['screen', 'Desktop screen', 'ستارة فوق المكتب']], en: 'Privacy panel', ar: 'لوح الخصوصية' }),
      sp({ k: 'monitorShelf', t: 'tog', def: false, en: 'Monitor shelf', ar: 'رف الشاشة' }),
      sp({ k: 'tray', t: 'tog', def: false, en: 'Keyboard tray (pull-out)', ar: 'درج لوحة المفاتيح' }),
      sp({ k: 'grommets', t: 'step', min: 0, max: 3, def: 1, kw: kw(/grommets?|cable holes?|فتحات كابلات|حلقات/), en: 'Cable grommets in the top', ar: 'حلقات الكابلات في السطح' }),
      sp({ k: 'cableTray', t: 'tog', def: true, en: 'Cable tray under the top', ar: 'صينية كابلات تحت السطح' }),
    ],
    build: () => ({}), // a desk module has no kitchen carcass: decorate() adds it
  },
  pedestal: {
    en: 'Pedestal', ar: 'وحدة أدراج', tag: 'P', w: { min: 350, max: 600, def: 450 },
    opts: [
      sp({ k: 'kind', t: 'seg', def: 'mixed', opts: [['box', 'Box drawers', 'أدراج عادية'], ['file', 'File drawers', 'أدراج ملفات'], ['mixed', 'Box + file', 'عادي + ملفات']], en: 'Drawers', ar: 'الأدراج' }),
      sp({ k: 'lock', t: 'tog', def: true, en: 'Central lock', ar: 'قفل مركزي' }),
      sp({ k: 'castors', t: 'tog', def: false, en: 'Castors (mobile)', ar: 'عجلات (متحرك)' }),
    ],
    build: (u, c) => ({ base: U(u.w, u.kind === 'box' ? [S('drawer', 3)] : u.kind === 'file' ? [S('drawer', 2)] : [S('drawer', 2, { h: 270 }), S('drawer', 1)]) }),
  },
  credenza: {
    en: 'Credenza', ar: 'كريدنزا', tag: 'C', w: { min: 800, max: 2000, def: 1400 },
    opts: [
      sp({ k: 'front', t: 'seg', def: 'mixed', opts: [['doors', 'Doors', 'أبواب'], ['drawers', 'Drawers', 'أدراج'], ['mixed', 'Drawers + doors', 'أدراج + أبواب']], en: 'Front', ar: 'الواجهة' }),
      sp({ k: 'drawers', t: 'step', min: 1, max: 4, def: 2, kw: kw(/drawers?|أدراج|ادراج|درج/), en: 'Drawers', ar: 'الأدراج', when: (c) => c.u.front !== 'doors', why: ['Front is Doors.', 'الواجهة أبواب.'] }),
      sp({ k: 'hutch', t: 'seg', def: 'none', opts: [['none', 'None', 'بدون'], ['open', 'Open hutch', 'علوي مفتوح'], ['doors', 'Hutch doors', 'علوي بأبواب']], en: 'Hutch above', ar: 'الجزء العلوي' }),
    ],
    build(u, c) {
      const { p, S: S1, U: U1 } = c; const secs = [];
      if (u.hutch === 'open') secs.push(S1('open', 1, { shelves: 0, h: p.hutchH })); else if (u.hutch === 'doors') secs.push(S1('door', leafCount(u.w, 600), { shelves: 1, h: p.hutchH, hinge: c.hinge(c.i) }));
      if (u.front === 'doors') secs.push(S1('door', leafCount(u.w, 600), { shelves: 1, hinge: c.hinge(c.i) }));
      else if (u.front === 'drawers') secs.push(S1('drawer', u.drawers));
      else { secs.push(S1('drawer', u.drawers, { shelves: 0, h: u.drawers * 160 })); secs.push(S1('door', leafCount(u.w, 600), { shelves: 1, hinge: c.hinge(c.i) })); }
      return { base: U1(u.w, secs, { type: 'tall', h: Math.max(400, p.credH + (u.hutch !== 'none' ? p.hutchH : 0) - c.g.plinthH), d: p.credD }) };
    },
  },
  bookcase: {
    en: 'Bookcase', ar: 'مكتبة', tag: 'B', w: { min: 400, max: 1200, def: 800 },
    opts: [
      sp({ k: 'shelves', t: 'step', min: 2, max: 8, def: 5, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves', ar: 'الرفوف' }),
      sp({ k: 'lower', t: 'seg', def: 'doors', opts: [['none', 'All open', 'مفتوحة كلها'], ['doors', 'Lower doors', 'أبواب سفلية'], ['drawers', 'Lower drawers', 'أدراج سفلية']], en: 'Lower part', ar: 'الجزء السفلي' }),
      sp({ k: 'books', t: 'tog', def: true, en: 'Show books', ar: 'إظهار الكتب' }),
    ],
    build(u, c) {
      const secs = [c.S('open', u.shelves, { shelves: 0 })];
      if (u.lower === 'doors') secs.push(c.S('door', leafCount(u.w, 600), { shelves: 1, h: 600, hinge: c.hinge(c.i) })); else if (u.lower === 'drawers') secs.push(c.S('drawer', 2, { shelves: 0, h: 480 }));
      return { base: c.U(u.w, secs, { type: 'tall', h: Math.max(800, c.p.towerH - c.g.plinthH), d: c.p.bookD }) };
    },
  },
  filing: {
    en: 'Filing cabinet', ar: 'خزانة ملفات', tag: 'F', w: { min: 450, max: 900, def: 600 },
    opts: [
      sp({ k: 'drawers', t: 'step', min: 2, max: 5, def: 3, kw: kw(/drawers?|أدراج|ادراج|درج/), en: 'File drawers', ar: 'أدراج الملفات' }),
      sp({ k: 'lock', t: 'tog', def: true, en: 'Central lock', ar: 'قفل مركزي' }),
    ],
    build: (u, c) => ({ base: c.U(u.w, [c.S('drawer', u.drawers)], { type: 'tall', h: Math.max(700, Math.round(c.p.towerH * 0.75) - c.g.plinthH), d: c.p.credD }) }),
  },
};

function toKitchen(d, { rules }) {
  const { p } = d;
  const g = {
    ...baseG(d), plinthH: p.glide, baseH: Math.max(300, p.deskH - p.topThk - p.glide), counterThk: p.topThk, overhang: 0, backsplashH: 0,
    baseD: p.deskD, wallD: 320, gap: 600, wallH: 600, edgeBand: 1,
  };
  const r = assemble(OFFICE, d, g, { rules });
  r.model.counter = p.top;
  const wing = p.shape !== 'straight';
  if (wing) {
    const sides = p.shape === 'U' ? ['left', 'right'] : [p.returnSide];
    sides.forEach((s) => {
      r.model.legs = { ...r.model.legs, [s]: { ...r.model.legs[s], on: true, matchD: true, matchH: true, length: p.returnLen } };
      r.model.runs[s] = { base: [U(p.returnLen, [S('open', 1, { shelves: 0 })], { id: `cw-wing-${s}`, hidden: true })], wall: [], top: [] };
    });
  }
  return { ...r, notes: [], g };
}

const monitorProps = (scene, inst, cu, y1, p, onShelf, D) => {
  const sz = p.monitorSize; const mw = Math.round(sz * IN * 0.8716); const mh = Math.round(sz * IN * 0.4903);
  const n = p.monitors; const boxes = [];
  const gap = 25; const total = n * mw + (n - 1) * gap;
  for (let k = 0; k < n; k++) {
    const u0 = cu - total / 2 + k * (mw + gap); const yb = y1 + (onShelf ? 0 : 0) + 110; const d0 = D * 0.62 - 12; const d1 = D * 0.62 + 12;
    boxes.push({ u0, u1: u0 + mw, y0: yb, y1: yb + mh, d0, d1, mat: 'bezel' }, { u0: u0 + 6, u1: u0 + mw - 6, y0: yb + 6, y1: yb + mh - 6, d0: d1, d1: d1 + 1.5, mat: 'screen' }, { u0: u0 + mw / 2 - 18, u1: u0 + mw / 2 + 18, y0: y1, y1: yb, d0: d0 + 4, d1: d1 - 4, mat: 'dark' }, { u0: u0 + mw / 2 - 110, u1: u0 + mw / 2 + 110, y0: y1, y1: y1 + 10, d0: D * 0.62 - 90, d1: D * 0.62 + 90, mat: 'dark' });
  }
  if (n) addProp(scene, { kind: 'monitor', unitId: inst.unit.id, row: 'counter', boxes });
};

function decorate(scene, built, d) {
  const { p, x } = d; const { g } = built.model; const run = scene.runs[0];
  const hwRows = []; const D = g.baseD; const t = x.board; const pt = x.board;
  const yBaseTop = g.plinthH + g.baseH; const y1 = yBaseTop + g.counterThk; // underside / top of the desk top
  scene.noFeet = true; run.plinth = null; // stands on glides / castors, no plinth board
  const find = (id) => { const f = id ? findInst(scene, id) : null; return f ? f.inst : null; };
  /* module positions along the run */
  let u = 0; const pos = built.placed.map((pl) => { const r0 = u; u += pl.unit.w; return r0; });
  /* the desk-top groups: consecutive desks + pedestals share one top */
  const groups = []; let cur = null;
  built.placed.forEach((pl, i) => {
    if (DESKISH.includes(pl.unit.type)) { if (cur && Math.abs(cur.u1 - pos[i]) < 1) { cur.u1 = pos[i] + pl.unit.w; } else { cur = { u0: pos[i], u1: pos[i] + pl.unit.w }; groups.push(cur); } } else cur = null;
  });
  setCounters(scene, 'main', groups, { y0: yBaseTop, thk: g.counterThk, d1: D });
  let desks = 0; let castors = 0; let locks = 0; let lifts = 0; let trays = 0; let cableTrays = 0; let grom = 0; let files = 0; let books = 0; const mainDesks = [];
  built.placed.forEach((pl, i) => {
    const un = pl.unit; const u0 = pos[i]; const bi = find(pl.ids.base);
    if (un.type === 'desk') {
      desks += 1; const n = desks;
      const inst = addModule(scene, 'main', { id: `cm-${un.id}`, u0, w: un.w, y0: g.plinthH, H: yBaseTop - g.plinthH, D, label: `Desk ${n}`, tag: `D${n}`, group: 'Desk' });
      mainDesks.push(inst);
      const fu0 = inst.fu0; const fu1 = fu0 + un.w; const cu = fu0 + un.w / 2;
      const P = (spec) => addPart(scene, inst, spec);
      const leftPed = i > 0 && built.placed[i - 1].unit.type === 'pedestal'; const rightPed = i < built.placed.length - 1 && built.placed[i + 1].unit.type === 'pedestal';
      if (p.lift || un.legs === 'steel') {
        const lg = []; const a = [fu0 + 60, fu1 - 60 - 50]; const dd = [70, D - 70 - 50];
        a.forEach((uu) => { if ((uu < fu0 + 100 && leftPed) || (uu > fu1 - 110 && rightPed)) return; dd.forEach((d0) => lg.push({ u0: uu, u1: uu + 50, y0: g.plinthH, y1: yBaseTop - 40, d0, d1: d0 + 50, mat: 'steel' })); });
        lg.push({ u0: fu0 + 60, u1: fu1 - 60, y0: yBaseTop - 40, y1: yBaseTop - 10, d0: 80, d1: 130, mat: 'steel' }, { u0: fu0 + 60, u1: fu1 - 60, y0: yBaseTop - 40, y1: yBaseTop - 10, d0: D - 130, d1: D - 80, mat: 'steel' });
        addProp(scene, { kind: 'frame', unitId: inst.unit.id, row: 'base', boxes: lg });
        hwRows.push(p.lift ? { k: 'liftFrame', en: 'Electric sit-stand lift columns (pair) + controller', ar: 'عمودا رفع كهربائيان (زوج) مع وحدة تحكم', qty: 1 } : { k: 'steelFrame', en: 'Steel desk legs + rails (set)', ar: 'أرجل مكتب معدنية مع قضبان (طقم)', qty: 1 }); lifts += 1;
      } else {
        const side = (uu0, uu1) => P({ kind: 'side', name: 'Leg panel', mat: 'Carcass', ptype: 'cover', view: 'internal', edges: [{ axis: 'y', where: 'front' }, { axis: 'u', where: 'top' }], box: { u0: uu0, u1: uu1, y0: g.plinthH, y1: yBaseTop, d0: 30, d1: D - 30 } });
        if (!leftPed) side(fu0, fu0 + pt); if (!rightPed) side(fu1 - pt, fu1);
      }
      if (un.modesty) { const l = fu0 + (leftPed || p.lift || un.legs === 'steel' ? 0 : pt); const r = fu1 - (rightPed || p.lift || un.legs === 'steel' ? 0 : pt); P({ kind: 'divider', name: 'Modesty panel', mat: 'Carcass', ptype: 'cover', view: 'internal', edges: [{ axis: 'u', where: 'both' }], box: { u0: l, u1: r, y0: yBaseTop - p.modestyH, y1: yBaseTop - 20, d0: 40, d1: 40 + pt } }); }
      if (un.privacy === 'front') P({ kind: 'door', name: 'Privacy panel (front)', mat: 'Door', ptype: 'cover', view: 'front', edges: [{ axis: 'u', where: 'both' }], box: { u0: fu0 + pt + 10, u1: fu1 - pt - 10, y0: yBaseTop - p.privacyH, y1: yBaseTop - 20, d0: D - 60 - pt, d1: D - 60 } });
      if (un.privacy === 'screen') P({ kind: 'door', name: 'Privacy screen (desktop)', mat: 'Door', ptype: 'cover', view: 'front', edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }], box: { u0: fu0 + 30, u1: fu1 - 30, y0: y1, y1: y1 + p.privacyH, d0: D - 70 - pt, d1: D - 70 } });
      if (un.monitorShelf) {
        const sw = Math.min(p.monitorW, un.w - 100); const y0 = y1 + p.monitorH; const sd0 = D * 0.5; const sd1 = D * 0.95;
        P({ kind: 'shelf', name: 'Monitor shelf', mat: 'Shelf', ptype: 'shelf', view: 'front', edges: [{ axis: 'u', where: 'front' }], fixed: true, box: { u0: cu - sw / 2, u1: cu + sw / 2, y0, y1: y0 + g.shelfThk, d0: sd0, d1: sd1 } });
        [cu - sw / 2 + 20, cu + sw / 2 - 20 - pt].forEach((uu) => P({ kind: 'divider', name: 'Monitor shelf riser', mat: 'Carcass', ptype: 'cover', view: 'front', edges: [{ axis: 'y', where: 'front' }], box: { u0: uu, u1: uu + pt, y0: y1, y1: y0, d0: sd0 + 10, d1: sd1 - 10 } }));
        hwRows.push({ k: 'shelfFix', en: 'Monitor shelf fixing screws (set)', ar: 'براغي تثبيت رف الشاشة (طقم)', qty: 1 });
      }
      if (un.tray) {
        const tw = Math.min(660, un.w - 200); const ty = yBaseTop - 80;
        P({ kind: 'shelf', name: 'Keyboard tray', mat: 'Shelf', ptype: 'shelf', view: 'internal', edges: [{ axis: 'u', where: 'front' }], fixed: true, box: { u0: cu - tw / 2, u1: cu + tw / 2, y0: ty - g.shelfThk, y1: ty, d0: D - 400, d1: D - 40 } });
        addProp(scene, { kind: 'keyboard', unitId: inst.unit.id, row: 'base', boxes: [{ u0: cu - 220, u1: cu + 220, y0: ty, y1: ty + 20, d0: D - 330, d1: D - 150, mat: 'dark' }, { u0: cu + 260, u1: cu + 300, y0: ty, y1: ty + 25, d0: D - 280, d1: D - 220, mat: 'dark' }] });
        hwRows.push({ k: 'trayRunner', en: 'Keyboard tray runners (pair)', ar: 'سكك درج لوحة المفاتيح (زوج)', qty: 1 }); trays += 1;
      } else addProp(scene, { kind: 'keyboard', unitId: inst.unit.id, row: 'counter', boxes: [{ u0: cu - 220, u1: cu + 220, y0: y1, y1: y1 + 18, d0: D - 290, d1: D - 110, mat: 'dark' }, { u0: cu + 260, u1: cu + 300, y0: y1, y1: y1 + 24, d0: D - 250, d1: D - 190, mat: 'dark' }] });
      if (un.cableTray) { addProp(scene, { kind: 'cableTray', unitId: inst.unit.id, row: 'base', boxes: [{ u0: fu0 + 120, u1: fu1 - 120, y0: yBaseTop - 110, y1: yBaseTop - 95, d0: 60, d1: 200, mat: 'steel' }] }); hwRows.push({ k: 'cableTray', en: 'Under-desk cable tray', ar: 'صينية كابلات تحت المكتب', qty: 1 }); cableTrays += 1; }
      if (un.grommets > 0) {
        const run0 = scene.runs[0];
        for (let k = 0; k < un.grommets; k++) addCutout(run0, { type: 'grommet', name: 'Cable grommet', cu: fu0 + (un.w * (k + 1)) / (un.grommets + 1), w: p.holeD, d: p.holeD, dOff: 110 });
        grom += un.grommets;
      }
      /* monitors + the first desk's chair */
      monitorProps(scene, inst, cu, un.monitorShelf ? y1 + p.monitorH + g.shelfThk : y1, p, !!un.monitorShelf, D);
      if (p.chair && n === 1) {
        const dd0 = D + 120; const yS = 430;
        addProp(scene, { kind: 'chair', unitId: inst.unit.id, row: 'counter', boxes: [{ u0: cu - 240, u1: cu + 240, y0: yS, y1: yS + 55, d0: dd0, d1: dd0 + 470, mat: 'fabric' }, { u0: cu - 230, u1: cu + 230, y0: yS + 55, y1: yS + 470, d0: dd0 + 440, d1: dd0 + 490, mat: 'fabric' }, { u0: cu - 25, u1: cu + 25, y0: 60, y1: yS, d0: dd0 + 200, d1: dd0 + 250, mat: 'dark' }, { u0: cu - 300, u1: cu + 300, y0: 25, y1: 60, d0: dd0 + 150, d1: dd0 + 300, mat: 'dark' }, { u0: cu - 40, u1: cu + 40, y0: 25, y1: 60, d0: dd0 - 100, d1: dd0 + 550, mat: 'dark' }] });
      }
    }
    if (un.type === 'pedestal' && bi) { bi.noFeet = true; if (un.lock) locks += 1; if (un.castors) { castors += 1; addProp(scene, { kind: 'castors', unitId: bi.unit.id, row: 'base', boxes: [[bi.fu0 + 30, 40], [bi.fu0 + bi.W - 60, 40], [bi.fu0 + 30, D - 80], [bi.fu0 + bi.W - 60, D - 80]].map(([uu, dd]) => ({ u0: uu, u1: uu + 30, y0: 0, y1: g.plinthH, d0: dd, d1: dd + 30, mat: 'dark' })) }); } if (un.kind !== 'box') files += un.kind === 'file' ? 2 : 1; }
    if (un.type === 'filing' && bi) { bi.noFeet = true; if (un.lock) locks += 1; files += un.drawers; }
    if (un.type === 'credenza' && bi) bi.noFeet = true;
    if (un.type === 'bookcase' && bi) {
      bi.noFeet = true;
      if (un.books) {
        const sh = bi.parts.filter((q) => q.kind === 'shelf').sort((a, b) => a.box.y0 - b.box.y0); const levels = [bi.bounds[bi.bounds.length - 1].bot + t, ...sh.map((q) => q.box.y1)];
        const boxes = []; const w0 = bi.fu0 + t + 15; const w1 = bi.fu0 + bi.W - t - 15;
        levels.forEach((yy, k) => { let uu = w0 + (k % 3) * 20; let j = 0; while (uu < w1 - 40 && j < 14) { const bw = 22 + ((k * 7 + j * 13) % 4) * 6; const bh = 190 + ((k * 11 + j * 17) % 5) * 22; if (uu + bw > w1) break; boxes.push({ u0: uu, u1: uu + bw, y0: yy, y1: yy + bh, d0: 70, d1: 70 + 200, mat: (k + j) % 3 === 0 ? 'paper' : (k + j) % 3 === 1 ? 'fabric' : 'wood' }); uu += bw + 3; j += 1; if (j % 5 === 0) uu += 90; } });
        addProp(scene, { kind: 'books', unitId: bi.unit.id, row: 'base', boxes: boxes.filter((b) => b.y1 < (levels[levels.length - 1] + 4000)) });
        books += 1;
      }
    }
  });
  /* the return desk(s) of an L / U shape: a module along the side wall */
  if (p.shape !== 'straight') {
    const sides = p.shape === 'U' ? ['left', 'right'] : [p.returnSide];
    sides.forEach((s) => {
      const wr = scene.runs.find((r) => r.key === s); if (!wr) return;
      const L = wr.L;
      const inst = addModule(scene, s, { id: `cm-wing-${s}`, u0: 0, w: L, y0: g.plinthH, H: yBaseTop - g.plinthH, D, label: `Return desk ${s === 'left' ? 'L' : 'R'}`, tag: s === 'left' ? 'RL' : 'RR', group: 'Return desk' });
      const topU = wr.flip ? { u0: 0, u1: L - D } : { u0: D, u1: L };
      setCounters(scene, s, [topU], { y0: yBaseTop, thk: g.counterThk, d1: D });
      const far = wr.flip ? { u0: 0, u1: pt } : { u0: L - pt, u1: L };
      addPart(scene, inst, { kind: 'side', name: 'Leg panel', mat: 'Carcass', ptype: 'cover', view: 'internal', edges: [{ axis: 'y', where: 'front' }, { axis: 'u', where: 'top' }], box: { ...far, y0: g.plinthH, y1: yBaseTop, d0: 30, d1: D - 30 } });
      hwRows.push({ k: 'cornerFix', en: 'Desk corner joint plate set', ar: 'طقم صفائح وصلة زاوية المكتب', qty: 1 });
      addProp(scene, { kind: 'keyboard', unitId: inst.unit.id, row: 'counter', boxes: [{ u0: (topU.u0 + topU.u1) / 2 - 150, u1: (topU.u0 + topU.u1) / 2 + 150, y0: y1, y1: y1 + 14, d0: D / 2 - 90, d1: D / 2 + 90, mat: 'paper' }] });
    });
  }
  if (grom) hwRows.push({ k: 'grommet', en: `Cable grommet Ø${p.holeD}`, ar: `حلقة كابل Ø${p.holeD}`, qty: grom });
  if (locks) hwRows.push({ k: 'lock', en: 'Central drawer lock + 2 keys', ar: 'قفل مركزي للأدراج مع مفتاحين', qty: locks });
  if (files) hwRows.push({ k: 'fileRail', en: 'Hanging file rail set (per file drawer)', ar: 'سكة ملفات معلقة (لكل درج ملفات)', qty: files });
  if (castors) hwRows.push({ k: 'castor', en: 'Castor set (4)', ar: 'طقم عجلات (٤)', qty: castors });
  void desks; void lifts; void trays; void cableTrays; void books; void mainDesks;
  return { hw: hwRows };
}

function rules(d, out) {
  const { p } = d; const w = []; const add = (id, en, ar) => w.push({ id, en, ar });
  const desks = d.units.filter((u) => u.type === 'desk');
  if (!desks.length) add('no-desk', 'There is no desk: add one in the Units tab.', 'لا يوجد مكتب: أضفه من تبويب الوحدات.');
  const stand = p.deskH >= 950;
  if (!stand && (p.deskH < 700 || p.deskH > 780)) add('sit-h', `A sitting desk ${p.deskH} mm high is outside the comfortable 720-760 mm.`, `مكتب جلوس بارتفاع ${p.deskH} مم خارج المريح ٧٢٠-٧٦٠ مم.`);
  if (stand && (p.deskH < 1000 || p.deskH > 1250)) add('stand-h', `A standing desk ${p.deskH} mm high is outside the usual 1000-1250 mm.`, `مكتب وقوف بارتفاع ${p.deskH} مم خارج المعتاد ١٠٠٠-١٢٥٠ مم.`);
  if (stand && d.units.some((u) => u.type === 'pedestal')) add('stand-ped', 'A pedestal under a standing desk is very tall: use a mobile pedestal beside it, or a sit-stand desk without one.', 'وحدة أدراج تحت مكتب وقوف طويلة جدًا: استخدم وحدة متحركة بجانبه أو مكتبًا بدونها.');
  if (p.lift && d.units.some((u) => u.type === 'pedestal')) add('lift-ped', 'An electric sit-stand desk cannot carry a fixed pedestal: the pedestal does not move with the top.', 'المكتب الكهربائي لا يحمل وحدة أدراج ثابتة: لا تتحرك مع السطح.');
  if (p.deskD < 600) add('shallow', `A ${p.deskD} mm deep desk is too shallow for a monitor and a keyboard.`, `مكتب بعمق ${p.deskD} مم ضيق جدًا لشاشة ولوحة مفاتيح.`);
  desks.forEach((u, i) => {
    const ped = d.units.filter((q) => q.type === 'pedestal').reduce((s, q) => s + q.w, 0);
    const knee = u.w - (d.units.some((q) => q.type === 'pedestal') ? Math.min(ped, u.w) : 0) - (u.legs === 'steel' || p.lift ? 0 : 36);
    if (knee < 600) add(`knee-${i}`, `Only about ${Math.round(knee)} mm of knee room under the desk (600 mm minimum): widen the desk or drop a pedestal.`, `نحو ${Math.round(knee)} مم فقط لمساحة الركبتين تحت المكتب (الحد الأدنى ٦٠٠ مم): وسّع المكتب أو احذف وحدة أدراج.`);
    if (p.monitors * Math.round(p.monitorSize * IN * 0.8716) + (p.monitors - 1) * 25 > u.w - 60 && i === 0) add('monitor-w', `${p.monitors} monitor${p.monitors === 1 ? '' : 's'} of ${p.monitorSize}" do not fit on a ${u.w} mm desk.`, `${p.monitors} شاشات ${p.monitorSize}" لا تتسع على مكتب ${u.w} مم.`);
    if (u.tray && u.w < 900) add(`tray-${i}`, 'A keyboard tray needs a desk at least 900 mm wide.', 'درج لوحة المفاتيح يحتاج مكتبًا بعرض ٩٠٠ مم على الأقل.');
    if (u.monitorShelf && p.monitorH < 120) add(`shelf-${i}`, 'A monitor shelf under 120 mm leaves no room for the monitor stand.', 'رف شاشة أقل من ١٢٠ مم لا يترك مكانًا لقاعدة الشاشة.');
  });
  if (p.shape !== 'straight') {
    if (p.returnLen < p.deskD + 600) add('return-short', `A return of ${p.returnLen} mm (including the ${p.deskD} mm under the main desk) leaves under 600 mm of usable top.`, `جناح ${p.returnLen} مم (يشمل ${p.deskD} مم تحت المكتب الرئيسي) يترك أقل من ٦٠٠ مم سطحًا مفيدًا.`);
    const last = d.units[d.units.length - 1]; const first = d.units[0];
    const end = (u) => u && DESKISH.includes(u.type);
    if ((p.shape === 'L' && p.returnSide === 'right' && !end(last)) || (p.shape === 'L' && p.returnSide === 'left' && !end(first)) || (p.shape === 'U' && (!end(last) || !end(first)))) add('return-end', 'The return desk starts at the end of the run: put the desk (or a pedestal) at that end, not a credenza or bookcase.', 'يبدأ الجناح عند نهاية الصف: ضع المكتب (أو وحدة أدراج) عند ذلك الطرف وليس كريدنزا أو مكتبة.');
  }
  if (!d.units.some((u) => u.type === 'desk' && u.grommets > 0)) add('no-grommet', 'No cable grommet in the desk top: monitor and charger cables will run over the front edge.', 'لا توجد حلقة كابلات في سطح المكتب: ستمر كابلات الشاشة والشاحن فوق الحافة الأمامية.');
  void out;
  return w;
}

const UN = (id, type, w, o) => ({ id, type, w, ...o });
const PRESETS = [
  { id: 'straight', en: 'Straight desk 1600 + pedestal', ar: 'مكتب مستقيم ١٦٠٠ مع وحدة أدراج', make: () => ({ units: [UN('u1', 'desk', 1600, { legs: 'panel', grommets: 2 }), UN('u2', 'pedestal', 450, { kind: 'mixed' })], p: {} }) },
  { id: 'lshape', en: 'L-desk 1800 + return + credenza + bookcase', ar: 'مكتب L ١٨٠٠ مع جناح وكريدنزا ومكتبة', make: () => ({ units: [UN('u1', 'bookcase', 800), UN('u2', 'credenza', 1400, { hutch: 'open' }), UN('u3', 'desk', 1500, { legs: 'panel', monitorShelf: true, grommets: 2 }), UN('u4', 'pedestal', 450, { kind: 'box' })], p: { shape: 'L', returnSide: 'right', returnLen: 1500, monitors: 2 } }) },
  { id: 'ushape', en: 'U-desk executive + credenza', ar: 'مكتب U تنفيذي مع كريدنزا', make: () => ({ units: [UN('u1', 'desk', 1800, { legs: 'panel', privacy: 'front', grommets: 3 })], p: { shape: 'U', returnLen: 1600, deskD: 800, top: 'marble', monitors: 3 } }) },
  { id: 'sitstand', en: 'Sit-stand 1400 (electric) + tray + shelf', ar: 'مكتب كهربائي ١٤٠٠ مع درج ورف', make: () => ({ units: [UN('u1', 'desk', 1400, { legs: 'steel', tray: true, monitorShelf: true, modesty: false, grommets: 2 })], p: { lift: true, deskH: 1100, monitors: 2, top: 'laminate' } }) },
  { id: 'storage', en: 'Storage wall: bookcase + filing + desk', ar: 'جدار تخزين: مكتبة وملفات ومكتب', make: () => ({ units: [UN('u1', 'bookcase', 900), UN('u2', 'filing', 600, { drawers: 4 }), UN('u3', 'bookcase', 900), UN('u4', 'desk', 1400, { legs: 'panel', privacy: 'screen' })], p: { towerH: 2100, bookD: 350 } }) },
];

const PRICE = {
  topName: ['Desk top', 'سطح المكتب'],
  rates: {
    board: { Carcass: 6.5, Back: 2.8, Shelf: 6.5, Door: 12, Drawer: 6, Plinth: 4.5, Glass: 22 },
    top: { quartz: 85, marble: 105, granite: 78, laminate: 26, oakslab: 70 },
    edge: 0.7, wastePct: 0.1, labourPct: 0.35, marginPct: 0.2,
    hw: { hinge: 0.9, plate: 0.3, runner: 5.5, handleBar: 1.5, handleKnob: 1, handleProfile: 4, pin: 0.04, minifix: 0.25, cam: 0.2, dowel: 0.03, leg: 0.8, liftFrame: 190, steelFrame: 55, cableTray: 7, grommet: 1.2, lock: 6, fileRail: 4.5, castor: 6, trayRunner: 9, shelfFix: 1, cornerFix: 5 },
  },
  adjust: (d, r) => ({ ...r, board: Object.fromEntries(Object.entries(r.board).map(([k, v]) => [k, k === 'Glass' ? v : Math.round(v * (UPLIFT[d.p.boardType] || 1) * 100) / 100])) }),
};

const ASSISTANT = {
  greet: ['design your office furniture. Tell me the desk width and shape (straight, L or U), sit or stand height, the pedestal, the credenza and bookcase, the monitor shelf, keyboard tray and cable grommets — or change one unit. Every change is shown for review before it is applied, and Undo brings the previous design back.', 'وهساعدك تصمم أثاث مكتبك. اوصفلي عرض المكتب وشكله (مستقيم أو L أو U) وارتفاع الجلوس أو الوقوف ووحدة الأدراج والكريدنزا والمكتبة ورف الشاشة ودرج لوحة المفاتيح وحلقات الكابلات — أو غيّر وحدة واحدة. كل تغيير يُعرض للمراجعة قبل التطبيق، وزر التراجع يرجّع التصميم السابق.'],
  examples: { en: ['standing desk', 'sitting desk', 'desk height 1100', 'desk depth 800', 'L-shaped desk', 'U-shape desk', 'return length 1600', 'add pedestal', 'add credenza', 'add bookcase', 'unit 1 width 1800', 'keyboard tray', 'monitor shelf', 'electric sit-stand', 'show 3d', 'x-ray', 'open drawers', 'daylight'], ar: ['مكتب وقوف', 'مكتب جلوس', 'ارتفاع المكتب ١١٠٠', 'عمق المكتب ٨٠٠', 'مكتب بشكل L', 'مكتب بشكل U', 'طول الجناح ١٦٠٠', 'أضف وحدة أدراج', 'أضف كريدنزا', 'أضف مكتبة', 'وحدة ١ عرض ١٨٠٠', 'درج لوحة مفاتيح', 'رف شاشة', 'مكتب كهربائي', 'اعرض ثلاثي الأبعاد', 'أشعة', 'افتح الأدراج', 'ضوء النهار'] },
  nums: [
    { re: /desk height|ارتفاع المكتب/, key: 'deskH' }, { re: /desk depth|عمق المكتب|\bdepth/, key: 'deskD' }, { re: /return (length|reach)|طول الجناح|امتداد الجناح/, key: 'returnLen' }, { re: /credenza height|ارتفاع الكريدنزا/, key: 'credH' },
    { re: /bookcase height|ارتفاع المكتبة/, key: 'towerH' }, { re: /monitor size|مقاس الشاشة/, key: 'monitorSize' }, { re: /monitors?|screens?|شاشات|شاشة/, key: 'monitors' }, { re: /top thickness|سماكة السطح/, key: 'topThk' }, { re: /modesty( panel)? height|ارتفاع اللوح الخلفي/, key: 'modestyH' },
  ],
  words: [
    { re: /standing desk|stand(ing)? height|مكتب وقوف/, set: { deskH: 1100 } }, { re: /sitting desk|sit(ting)? height|مكتب جلوس/, set: { deskH: 740 } },
    { re: /l[- ]?shape(d)?|حرف l|شكل l|مكتب l/, set: { shape: 'L' } }, { re: /u[- ]?shape(d)?|حرف u|شكل u|مكتب u/, set: { shape: 'U' } }, { re: /straight desk|مكتب مستقيم/, set: { shape: 'straight' } },
    { re: /return (on the )?left|جناح يسار/, set: { returnSide: 'left' } }, { re: /return (on the )?right|جناح يمين/, set: { returnSide: 'right' } },
    { re: /electric|sit[- ]?stand|كهربائي/, set: { lift: true } }, { re: /no chair|بدون كرسي/, set: { chair: false } },
    { re: /keyboard tray|درج لوحة/, unitSet: { tray: true } }, { re: /monitor shelf|رف الشاشة|رف شاشة/, unitSet: { monitorShelf: true } }, { re: /no modesty|بدون ستر/, unitSet: { modesty: false } }, { re: /steel legs|أرجل معدنية/, unitSet: { legs: 'steel' } }, { re: /panel legs|أرجل لوحية/, unitSet: { legs: 'panel' } },
    { re: /front privacy|لوح أمامي/, unitSet: { privacy: 'front' } }, { re: /privacy screen|ستارة/, unitSet: { privacy: 'screen' } }, { re: /file drawers|أدراج ملفات/, unitSet: { kind: 'file' } },
    { re: /oak|بلوط/, set: { top: 'oakslab' } }, { re: /laminate|لامينيت/, set: { top: 'laminate' } }, { re: /marble|رخام/, set: { top: 'marble' } },
  ],
  addWords: [{ re: /pedestal|وحدة أدراج/, type: 'pedestal' }, { re: /credenza|كريدنزا/, type: 'credenza' }, { re: /bookcase|مكتبة/, type: 'bookcase' }, { re: /filing|ملفات/, type: 'filing' }, { re: /desk|مكتب/, type: 'desk' }],
};

export const OFFICE = {
  id: 'office', menuId: 'neo-office', storageKey: 'neo_cat_office_v1',
  app: ['Neo Office Designer', 'مصمم الأثاث المكتبي نيو'], noun: ['Office furniture', 'الأثاث المكتبي'], unitNoun: ['unit', 'وحدة'], defaultTitle: ['My Office', 'مكتبي'], file: 'office', single: ['office', 'المكتب'],
  layoutLabel: ['Office run', 'تشكيلة مكتب'], icon: '🖥️',
  unitTypes: UNIT_TYPES, params: PARAMS, presets: PRESETS, x: { board: 18, back: 8, finishKey: 'oak' },
  names: { counter: ['Desk top', 'سطح المكتب'] },
  hideGroups: [],
  legend: { keys: ['baseUnit', 'door', 'drawer', 'glass', 'open', 'shelf', 'cover', 'counter'], names: { baseUnit: ['Pedestal / storage', 'أدراج / تخزين'], cover: ['Panel', 'لوح'], counter: ['Desk top', 'سطح المكتب'] } },
  slotRows: [{ k: 'structure', en: 'Structure and panels', ar: 'الهيكل والألواح' }, { k: 'shelves', en: 'Shelves', ar: 'الرفوف' }, { k: 'back', en: 'Back', ar: 'الظهر' }, { k: 'baseDoors', en: 'Fronts and panels', ar: 'الواجهات والألواح' }, { k: 'tallDoors', en: 'Tall fronts', ar: 'واجهات الطويل' }, { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج' }, { k: 'drawers', en: 'Drawer boxes', ar: 'صناديق الأدراج' }, { k: 'countertop', en: 'Desk top', ar: 'سطح المكتب' }, { k: 'handles', en: 'Handles', ar: 'المقابض' }],
  globalCards: [
    { en: 'Desk', ar: 'المكتب', keys: ['deskH', 'deskD', 'topThk', 'top', 'glide', 'lift'], note: ['The sit and stand chips set the desk height. The pedestals and the cabinet fronts follow it.', 'أزرار الجلوس والوقوف تضبط ارتفاع المكتب. تتبعه وحدات الأدراج وواجهات الخزائن.'] },
    { en: 'Storage', ar: 'التخزين', keys: ['credH', 'credD', 'hutchH', 'towerH', 'bookD'] },
  ],
  msCards: [{ en: 'Board', ar: 'اللوح', keys: ['boardType'] }],
  tabs: [
    { id: 'ergo', icon: 'drawers', en: 'Desk & ergonomics', ar: 'المكتب والراحة', cards: [
      { en: 'Panels', ar: 'الألواح', keys: ['modestyH', 'privacyH'], note: ['Switch the modesty panel, privacy panel, monitor shelf, keyboard tray, grommets and cable tray per desk in the Units tab.', 'فعّل لوح الستر ولوح الخصوصية ورف الشاشة ودرج لوحة المفاتيح والحلقات وصينية الكابلات لكل مكتب من تبويب الوحدات.'] },
      { en: 'Monitor shelf and grommets', ar: 'رف الشاشة والحلقات', keys: ['monitorH', 'monitorW', 'holeD'] },
      { en: 'Display only', ar: 'للعرض فقط', keys: ['monitors', 'monitorSize', 'chair'], note: ['Monitors and the chair are drawn to judge space; they are not parts and not in the price.', 'الشاشات والكرسي تُرسم للحكم على المساحة؛ ليست قطعًا وليست في السعر.'] },
    ] },
    { id: 'layout', icon: 'lshape', en: 'Layout & return', ar: 'التخطيط والجناح', cards: [
      { en: 'Desk shape', ar: 'شكل المكتب', keys: ['shape', 'returnSide', 'returnLen'], note: ['L and U desks add a return desk along the side wall(s): put the desk (or a pedestal) at that end of the run.', 'مكاتب L وU تضيف جناحًا على الحائط الجانبي: ضع المكتب (أو وحدة أدراج) عند ذلك الطرف من الصف.'] },
    ] },
  ],
  matNames: (d) => ({ structure: BOARD_NAME[d.p.boardType], shelves: BOARD_NAME[d.p.boardType], back: 'Back board 8 mm', baseDoors: BOARD_NAME[d.p.boardType], tallDoors: BOARD_NAME[d.p.boardType], drawers: BOARD_NAME[d.p.boardType] }),
  toKitchen, decorate, rules, price: PRICE, assistant: ASSISTANT,
};

registerProduct('office', {
  app: OFFICE.app, noun: OFFICE.noun, file: 'office', layoutLabel: { straight: ['Straight desk', 'مكتب مستقيم'], 'l-left': ['L-desk (return on the left)', 'مكتب L (جناح يسار)'], 'l-right': ['L-desk (return on the right)', 'مكتب L (جناح يمين)'], u: ['U-desk', 'مكتب U'] }, legend: OFFICE.legend, worktop: ['Desk top', 'سطح المكتب'],
  runNames: { main: ['Main run', 'الصف الرئيسي'], left: ['Left return', 'الجناح الأيسر'], right: ['Right return', 'الجناح الأيمن'] }, propsNote: ['Monitors, chair, books, frames and trays in OBJ / STL / 3DM. Display only: never in the cut list or the price.', 'الشاشات والكرسي والكتب والهياكل والصواني في OBJ / STL / 3DM. للعرض فقط: ليست في قائمة القص أو السعر.'],
});
registerArabicNames([
  [/Return desk/g, 'مكتب الجناح'], [/Leg panel/g, 'لوح رجل'], [/Modesty panel/g, 'لوح ستر'], [/Privacy panel \(front\)/g, 'لوح خصوصية (أمامي)'], [/Privacy screen \(desktop\)/g, 'ستارة خصوصية (فوق المكتب)'], [/Monitor shelf riser/g, 'دعامة رف الشاشة'], [/Monitor shelf/g, 'رف الشاشة'], [/Keyboard tray/g, 'درج لوحة المفاتيح'],
  [/Desk top/g, 'سطح المكتب'], [/\bDesk\b/g, 'مكتب'], [/Pedestal/g, 'وحدة أدراج'], [/Credenza/g, 'كريدنزا'], [/Bookcase/g, 'مكتبة'], [/Filing cabinet/g, 'خزانة ملفات'], [/Cable grommet/g, 'حلقة كابل'],
]);
registerArabicNotes([[/Cable grommet cut-out/g, 'فتحة حلقة كابل']]);

export default OFFICE;
