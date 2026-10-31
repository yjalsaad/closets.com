/* =============================================================================
 * Neo Laundry Designer [NEO-CATEGORIES-UX26] - laundry cabinets in the generic Neo category studio.
 *   units : washer niche, dryer niche (side by side, worktop over both), stacked washer + dryer column, base cabinet, pull-out hamper, utility sink
 *           base, tall pantry / broom unit, hanging rail zone, ironing-board unit - each with optional wall cabinets above
 *   tabs  : Global | M&S | Units | Machines & ventilation | Worktop & wall | Hardware | Price
 * Machine niches stand on the floor (their sides run down to it, no bottom board, no plinth in front) and are sized from the machine:
 * niche width = machine width + 2 x (side clearance + board). Ventilation clearances (sides, top, back, dryer duct) are real parameters, rules and parts.
 * ===========================================================================*/
import { baseG, assemble, leafCount } from '../categoryModel';
import { registerProduct } from '../../neoKitchen/productInfo';
import { registerArabicNames, registerArabicNotes } from '../../neoKitchen/cutlist';
import { addProp, addLed, markNiche, setBox, removeParts, setPlinthParts, plinthSpans, cutCounters, findInst, frameBoxes } from '../categoryKit';

const sp = (o) => o;
const kw = (re) => re;
export const PARAMS = [
  /* Global */
  sp({ k: 'worktopH', t: 'num', min: 850, max: 1050, step: 10, def: 960, en: 'Worktop height (top surface)', ar: 'ارتفاع سطح العمل', help: ['Floor to the top surface. It must clear the machines: see Machines & ventilation.', 'من الأرض إلى السطح. يجب أن يتجاوز ارتفاع الغسالات: انظر تبويب الأجهزة والتهوية.'] }),
  sp({ k: 'depth', t: 'num', min: 500, max: 850, step: 10, def: 750, en: 'Cabinet depth', ar: 'عمق الخزائن', help: ['Machine depth + the space behind it for hoses and the vent.', 'عمق الجهاز + الفراغ خلفه للخراطيم والتهوية.'] }),
  sp({ k: 'tallH', t: 'num', min: 1800, max: 2600, step: 50, def: 2100, en: 'Tall unit height (pantry, rail, ironing)', ar: 'ارتفاع الوحدات الطويلة (مخزن، معلاق، كوي)' }),
  sp({ k: 'plinthH', t: 'num', min: 60, max: 150, step: 5, def: 100, en: 'Plinth height', ar: 'ارتفاع القاعدة' }),
  /* Machines & ventilation */
  sp({ k: 'machineW', t: 'num', min: 540, max: 700, step: 5, def: 600, en: 'Machine width', ar: 'عرض الجهاز', help: ['Standard built-in machines are 595-600 mm.', 'الأجهزة المدمجة القياسية ٥٩٥-٦٠٠ مم.'] }),
  sp({ k: 'machineD', t: 'num', min: 480, max: 700, step: 5, def: 600, en: 'Machine depth', ar: 'عمق الجهاز' }),
  sp({ k: 'machineH', t: 'num', min: 800, max: 950, step: 5, def: 850, en: 'Machine height', ar: 'ارتفاع الجهاز' }),
  sp({ k: 'side', t: 'num', min: 5, max: 60, step: 5, def: 20, en: 'Side clearance (each side)', ar: 'الفراغ الجانبي (لكل جانب)', help: ['At least 15 mm for vibration and air.', 'لا يقل عن ١٥ مم للاهتزاز والهواء.'] }),
  sp({ k: 'topClear', t: 'num', min: 10, max: 120, step: 5, def: 50, en: 'Clearance above the machine', ar: 'الفراغ فوق الجهاز', help: ['Between the top of the machine and the underside of the worktop board.', 'بين أعلى الجهاز وأسفل لوح السطح.'] }),
  sp({ k: 'backClear', t: 'num', min: 50, max: 250, step: 10, def: 100, en: 'Space behind the machine (hoses, vent)', ar: 'الفراغ خلف الجهاز (الخراطيم والتهوية)' }),
  sp({ k: 'vent', t: 'tog', def: true, en: 'Dryer vent hole in the back', ar: 'فتحة تهوية المجفف في الظهر' }),
  sp({ k: 'ventD', t: 'num', min: 80, max: 160, step: 2, def: 102, en: 'Vent hole diameter', ar: 'قطر فتحة التهوية', when: (c) => c.p.vent, why: ['Turn on the dryer vent hole.', 'فعّل فتحة تهوية المجفف.'] }),
  /* Worktop & wall */
  sp({ k: 'worktop', t: 'tog', def: true, en: 'Worktop over the machines', ar: 'سطح عمل فوق الأجهزة', help: ['Off: the machines stand free under no worktop (the cabinets keep theirs).', 'إيقاف: لا سطح فوق الأجهزة (تحتفظ الخزائن بسطحها).'] }),
  sp({ k: 'top', t: 'seg', def: 'laminate', opts: [['laminate', 'Laminate', 'لامينيت'], ['quartz', 'Quartz', 'كوارتز'], ['granite', 'Granite', 'جرانيت'], ['marble', 'Marble', 'رخام'], ['oakslab', 'Solid oak', 'بلوط صلب']], en: 'Worktop material', ar: 'مادة السطح' }),
  sp({ k: 'topThk', t: 'num', min: 18, max: 60, step: 2, def: 38, en: 'Worktop thickness', ar: 'سماكة السطح' }),
  sp({ k: 'overhang', t: 'num', min: 0, max: 50, step: 5, def: 20, en: 'Front overhang', ar: 'بروز السطح الأمامي' }),
  sp({ k: 'splashH', t: 'num', min: 0, max: 200, step: 10, def: 60, en: 'Back splash height', ar: 'ارتفاع الباكسبلاش' }),
  sp({ k: 'wallGap', t: 'num', min: 450, max: 900, step: 10, def: 600, en: 'Gap: worktop to wall cabinets', ar: 'الفراغ بين السطح والخزائن العلوية' }),
  sp({ k: 'wallH', t: 'num', min: 300, max: 1000, step: 10, def: 700, en: 'Wall cabinet height', ar: 'ارتفاع الخزائن العلوية' }),
  sp({ k: 'wallD', t: 'num', min: 250, max: 450, step: 10, def: 330, en: 'Wall cabinet depth', ar: 'عمق الخزائن العلوية' }),
  sp({ k: 'underLed', t: 'tog', def: true, en: 'LED under the wall cabinets', ar: 'إضاءة LED أسفل الخزائن العلوية' }),
  /* Materials */
  sp({ k: 'boardType', t: 'seg', def: 'mr', opts: [['standard', 'Standard', 'عادي'], ['mr', 'MR board', 'MR'], ['hmr', 'HMR board', 'HMR']], en: 'Board', ar: 'اللوح' }),
];

const BOARD_NAME = { standard: 'Standard MDF 18 mm', mr: 'MR board 18 mm (moisture resistant)', hmr: 'HMR board 18 mm (high moisture resistant)' };
const UPLIFT = { standard: 1, mr: 1.25, hmr: 1.45 };
const MACHINE_TYPES = ['washer', 'dryer', 'stack'];
const aboveOpt = sp({ k: 'above', t: 'seg', def: 'doors', opts: [['none', 'Nothing', 'لا شيء'], ['doors', 'Wall cabinet', 'خزانة جدارية'], ['open', 'Open shelves', 'رفوف مفتوحة']], en: 'Above', ar: 'الأعلى' });

const wallHalf = (u, c) => (u.above === 'doors' ? c.U(u.w, [c.S('door', leafCount(u.w), { shelves: 1, hinge: c.hinge(c.i) })]) : u.above === 'open' ? c.U(u.w, [c.S('open', 2, { shelves: 0 })]) : null);
const nicheW = (p, board = 18) => Math.round(p.machineW + 2 * (p.side + board));

const UNIT_TYPES = {
  washer: { en: 'Washer niche', ar: 'فتحة غسالة', wallEn: 'Wall cabinet', wallAr: 'خزانة جدارية', tag: 'W', w: { min: 560, max: 760, def: 656 }, range: (p) => ({ min: nicheW(p), max: nicheW(p) }), opts: [aboveOpt], build: (u, c) => ({ base: c.U(u.w, [c.S('open', 0, { shelves: 0 })]), wall: wallHalf(u, c) }) },
  dryer: { en: 'Dryer niche', ar: 'فتحة مجفف', wallEn: 'Wall cabinet', wallAr: 'خزانة جدارية', tag: 'D', w: { min: 560, max: 760, def: 656 }, range: (p) => ({ min: nicheW(p), max: nicheW(p) }), opts: [aboveOpt], build: (u, c) => ({ base: c.U(u.w, [c.S('open', 0, { shelves: 0 })]), wall: wallHalf(u, c) }) },
  stack: {
    en: 'Stacked washer + dryer', ar: 'غسالة + مجفف فوق بعض', tag: 'S', w: { min: 560, max: 760, def: 656 }, range: (p) => ({ min: nicheW(p), max: nicheW(p) }), opts: [],
    build: (u, c) => { const { p, g, x } = c; const t = x.board; const hb = p.machineH + p.topClear + t / 2 - g.plinthH; const ht = p.machineH + p.topClear + t; return { base: c.U(u.w, [c.S('open', 0, { shelves: 0, h: ht }), c.S('open', 0, { shelves: 0, h: hb })], { type: 'tall', h: hb + ht }) }; },
  },
  base: {
    en: 'Base cabinet', ar: 'خزانة سفلية', wallEn: 'Wall cabinet', wallAr: 'خزانة جدارية', tag: 'B', w: { min: 300, max: 1200, def: 600 },
    opts: [
      sp({ k: 'front', t: 'seg', def: 'doors', opts: [['doors', 'Doors', 'أبواب'], ['drawers', 'Drawers', 'أدراج']], en: 'Front', ar: 'الواجهة' }),
      sp({ k: 'drawers', t: 'step', min: 1, max: 4, def: 2, kw: kw(/drawers?|أدراج|ادراج|درج/), en: 'Drawers', ar: 'الأدراج', when: (c) => c.u.front === 'drawers', why: ['Front is Doors.', 'الواجهة أبواب.'] }),
      sp({ k: 'shelves', t: 'step', min: 0, max: 3, def: 1, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves', ar: 'الرفوف', when: (c) => c.u.front === 'doors', why: ['Front is Drawers.', 'الواجهة أدراج.'] }),
      aboveOpt,
    ],
    build: (u, c) => ({ base: c.U(u.w, [u.front === 'drawers' ? c.S('drawer', u.drawers) : c.S('door', leafCount(u.w), { shelves: u.shelves, hinge: c.hinge(c.i) })]), wall: wallHalf(u, c) }),
  },
  hamper: {
    en: 'Pull-out hamper', ar: 'سلة غسيل سحّابة', wallEn: 'Wall cabinet', wallAr: 'خزانة جدارية', tag: 'H', w: { min: 300, max: 600, def: 450 },
    opts: [sp({ k: 'baskets', t: 'step', min: 1, max: 2, def: 1, kw: kw(/baskets?|hampers?|سلال|سلة/), en: 'Baskets (stacked)', ar: 'السلال (متراصة)' }), aboveOpt],
    build: (u, c) => ({ base: c.U(u.w, [c.S('drawer', u.baskets)]), wall: wallHalf(u, c) }),
  },
  sink: {
    en: 'Utility sink base', ar: 'وحدة حوض خدمة', wallEn: 'Wall cabinet', wallAr: 'خزانة جدارية', tag: 'K', w: { min: 600, max: 1200, def: 800 }, opts: [aboveOpt],
    build: (u, c) => ({ base: c.U(u.w, [c.S('sink', 2, { shelves: 0 })]), wall: wallHalf(u, c) }),
  },
  pantry: {
    en: 'Pantry / broom unit', ar: 'مخزن / وحدة مكانس', tag: 'P', w: { min: 350, max: 900, def: 600 },
    opts: [
      sp({ k: 'doors', t: 'step', min: 1, max: 2, def: 2, en: 'Door leaves', ar: 'عدد الضلف' }),
      sp({ k: 'shelves', t: 'step', min: 0, max: 7, def: 4, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves', ar: 'الرفوف' }),
      sp({ k: 'broom', t: 'tog', def: true, en: 'Broom and mop zone (open, with hooks)', ar: 'منطقة المكانس والمماسح (مفتوحة مع علّاقات)' }),
    ],
    build: (u, c) => { const secs = [c.S('door', u.doors, { shelves: u.shelves, hinge: c.hinge(c.i) })]; if (u.broom) secs.push(c.S('open', 0, { shelves: 0, h: 760 })); return { base: c.U(u.w, secs, { type: 'tall', h: Math.max(900, c.p.tallH - c.g.plinthH) }) }; },
  },
  rail: {
    en: 'Hanging rail zone', ar: 'منطقة معلاق', tag: 'R', w: { min: 400, max: 1200, def: 700 },
    opts: [sp({ k: 'hatShelf', t: 'tog', def: true, en: 'Shelf above the rail', ar: 'رف فوق المعلاق' }), sp({ k: 'garments', t: 'tog', def: true, en: 'Show hanging clothes', ar: 'إظهار الملابس المعلقة' })],
    build: (u, c) => ({ base: c.U(u.w, [c.S('open', u.hatShelf ? 1 : 0, { shelves: 0, h: 480 }), c.S('open', 0, { shelves: 0 })], { type: 'tall', h: Math.max(900, c.p.tallH - c.g.plinthH) }) }),
  },
  iron: {
    en: 'Ironing-board unit', ar: 'وحدة طاولة الكوي', tag: 'I', w: { min: 300, max: 500, def: 400 },
    opts: [sp({ k: 'shelves', t: 'step', min: 1, max: 4, def: 2, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves (iron, starch)', ar: 'الرفوف (المكواة)' }), sp({ k: 'socket', t: 'tog', def: true, en: 'Socket for the iron', ar: 'مقبس للمكواة' })],
    build: (u, c) => ({ base: c.U(u.w, [c.S('door', 1, { shelves: u.shelves, hinge: c.hinge(c.i) })], { type: 'tall', h: Math.max(900, c.p.tallH - c.g.plinthH) }) }),
  },
};

function toKitchen(d, { rules }) {
  const { p } = d;
  const g = {
    ...baseG(d), plinthH: p.plinthH, baseH: Math.max(500, p.worktopH - p.topThk - p.plinthH), counterThk: p.topThk, overhang: p.overhang, backsplashH: p.splashH,
    baseD: p.depth, wallD: p.wallD, gap: p.wallGap, wallH: p.wallH, edgeBand: 1,
  };
  const r = assemble(LAUNDRY, d, g, { rules });
  r.model.counter = p.top;
  return { ...r, notes: [], g };
}

/** the clearance above a machine in a base niche (mm): from the machine top to the underside of the worktop board */
export const clearanceAbove = (p, x) => (p.plinthH + Math.max(500, p.worktopH - p.topThk - p.plinthH) - x.board) - p.machineH;

function machine(scene, inst, kind, y0, p, g) {
  const cu = inst.fu0 + inst.W / 2; const mw = p.machineW; const mh = p.machineH; const md = p.machineD;
  const dd0 = g.inset + g.back + p.backClear; const d1 = Math.min(dd0 + md, g.baseD + 10); /* the machine stands the back clearance away from the back board; a cabinet too shallow pushes it out by up to 10 mm (rule 'depth-short') */
  const boxes = [{ u0: cu - mw / 2, u1: cu + mw / 2, y0, y1: y0 + mh, d0: dd0, d1, mat: 'machine' }];
  const wy = y0 + mh * (kind === 'dryer' ? 0.42 : 0.44); const r = Math.min(mw, mh) * 0.3;
  boxes.push({ u0: cu - r, u1: cu + r, y0: wy - r, y1: wy + r, d0: d1, d1: d1 + 6, mat: 'glassdoor' });
  boxes.push(...frameBoxes(cu - r - 14, cu + r + 14, wy - r - 14, wy + r + 14, d1, d1 + 9, 14, 'steel'));
  boxes.push({ u0: cu - mw / 2 + 10, u1: cu + mw / 2 - 10, y0: y0 + mh - 105, y1: y0 + mh - 20, d0: d1, d1: d1 + 4, mat: 'dark' });
  boxes.push({ u0: cu + mw / 2 - 90, u1: cu + mw / 2 - 60, y0: y0 + mh - 88, y1: y0 + mh - 38, d0: d1 + 4, d1: d1 + 14, mat: 'steel' });
  if (kind === 'washer') boxes.push({ u0: cu - mw / 2 + 25, u1: cu - mw / 2 + 85, y0: y0 + mh - 98, y1: y0 + mh - 30, d0: d1 + 4, d1: d1 + 9, mat: 'steel' });
  addProp(scene, { kind: `machine-${kind}`, unitId: inst.unit.id, row: 'base', boxes });
  return { cu, dd0, d1 };
}

function decorate(scene, built, d) {
  const { p, x } = d; const { g } = built.model; const run = scene.runs[0];
  const hwRows = []; const floorSpans = []; const ledLen = { m: 0 };
  const yBaseTop = g.plinthH + g.baseH; const yCt1 = yBaseTop + g.counterThk;
  const D = g.baseD;
  scene.noFeet = false;
  let hampers = 0; let rails = 0; let irons = 0; let brooms = 0; let stacks = 0; let vents = 0; let sinks = 0;
  built.placed.forEach((pl) => {
    const bf = pl.ids.base ? findInst(scene, pl.ids.base) : null; const wf = pl.ids.wall ? findInst(scene, pl.ids.wall) : null;
    const bi = bf && bf.inst; const wi = wf && wf.inst; const u = pl.unit;
    if (bi && MACHINE_TYPES.includes(u.type)) { // a machine niche stands on the floor: sides run down to it, no bottom board, no plinth in front, no legs
      bi.noFeet = true; floorSpans.push({ u0: bi.fu0, u1: bi.fu0 + bi.W });
      bi.parts.filter((q) => q.kind === 'side' || q.kind === 'back').forEach((q) => setBox(q, { y0: 0 }));
      removeParts(scene, bi, (q) => q.kind === 'bottom');
      const stack = u.type === 'stack';
      const dTop = stack ? bi.y0 + bi.bounds[1].top - 0 : null;
      void dTop;
      if (u.type === 'washer') markNiche(bi, 0, 'washer', ['WASHER', 'غسالة']); else if (u.type === 'dryer') markNiche(bi, 0, 'dryer', ['DRYER', 'مجفف']); else { markNiche(bi, 0, 'dryer', ['DRYER', 'مجفف']); markNiche(bi, 1, 'washer', ['WASHER', 'غسالة']); }
      if (u.type === 'washer' || stack) machine(scene, bi, 'washer', 0, p, g);
      if (u.type === 'dryer') machine(scene, bi, 'dryer', 0, p, g);
      if (stack) {
        stacks += 1;
        const yDiv = bi.bounds[1].top; // top of the lower section = the divider's centre line
        machine(scene, bi, 'dryer', yDiv + x.board / 2, p, g);
        hwRows.push({ k: 'stackKit', en: 'Washer-dryer stacking kit', ar: 'طقم تثبيت غسالة فوق مجفف', qty: 1 });
      }
      if ((u.type === 'dryer' || stack) && p.vent) {
        vents += 1;
        const yv = u.type === 'dryer' ? p.machineH - 150 : yBaseTop + 0; void yv;
        const yy = u.type === 'dryer' ? p.machineH - 160 : bi.bounds[1].top + x.board / 2 + p.machineH - 160;
        const cu = bi.fu0 + bi.W / 2; const hd = p.ventD;
        addProp(scene, { kind: 'vent', unitId: bi.unit.id, row: 'base', boxes: [{ u0: cu - hd / 2, u1: cu + hd / 2, y0: yy - hd / 2, y1: yy + hd / 2, d0: 0, d1: g.inset + g.back + p.backClear, mat: 'dark' }] });
        const back = bi.parts.find((q) => q.kind === 'back'); if (back) back.note = `Dryer vent hole Ø${hd} @ ${Math.round(yy)} high`;
      }
    }
    if (bi && u.type === 'sink') sinks += 1;
    if (bi && u.type === 'hamper') hampers += u.baskets;
    if (bi && u.type === 'pantry') { if (u.broom) { brooms += 1; const bt = bi.bounds[1]; const cu = bi.fu0 + bi.W / 2; const y0 = bt.bot + x.board; addProp(scene, { kind: 'broom', unitId: bi.unit.id, row: 'base', boxes: [{ u0: cu - 10, u1: cu - 4, y0, y1: y0 + 650, d0: 150, d1: 156, mat: 'wood' }, { u0: cu - 30, u1: cu + 6, y0, y1: y0 + 90, d0: 130, d1: 175, mat: 'fabric' }, { u0: cu + 40, u1: cu + 46, y0: y0 + 20, y1: y0 + 700, d0: 150, d1: 156, mat: 'wood' }, { u0: cu + 28, u1: cu + 60, y0: y0 + 20, y1: y0 + 110, d0: 140, d1: 170, mat: 'paper' }, { u0: cu - bi.W / 2 + 40, u1: cu + bi.W / 2 - 40, y0: y0 + 700, y1: y0 + 712, d0: 20, d1: 28, mat: 'steel' }] }); hwRows.push({ k: 'broomHook', en: 'Broom / mop holder rail', ar: 'سكة حامل مكانس ومماسح', qty: 1 }); } }
    if (bi && u.type === 'rail') {
      rails += 1;
      const top = bi.y0 + bi.H; const ry = top - 480 - 70; const cu = bi.fu0 + bi.W / 2; const w0 = bi.fu0 + x.board; const w1 = bi.fu0 + bi.W - x.board;
      addProp(scene, { kind: 'rail', unitId: bi.unit.id, row: 'base', boxes: [{ u0: w0, u1: w1, y0: ry - 12, y1: ry + 12, d0: D / 2 - 12, d1: D / 2 + 12, mat: 'steel' }] });
      if (u.garments) {
        const n = Math.max(2, Math.floor((w1 - w0 - 60) / 70)); const boxes = [];
        for (let k = 0; k < n; k++) { const uu = w0 + 40 + k * ((w1 - w0 - 80) / Math.max(1, n - 1)); const len = 620 + (k * 37) % 180; boxes.push({ u0: uu - 14, u1: uu + 14, y0: ry - 24 - len, y1: ry - 20, d0: D / 2 - 130, d1: D / 2 + 130, mat: k % 3 === 0 ? 'paper' : 'fabric' }); }
        addProp(scene, { kind: 'garments', unitId: bi.unit.id, row: 'base', boxes });
      }
      hwRows.push({ k: 'railRod', en: 'Hanging rail Ø25 + end brackets', ar: 'ماسورة تعليق Ø25 مع حوامل', qty: 1 });
    }
    if (bi && u.type === 'iron') {
      irons += 1; const cu = bi.fu0 + bi.W / 2; const y0 = bi.y0 + x.board + 40;
      addProp(scene, { kind: 'iron', unitId: bi.unit.id, row: 'base', boxes: [{ u0: cu - 120, u1: cu + 120, y0, y1: y0 + 1250, d0: 40, d1: 70, mat: 'dark' }, { u0: cu - 110, u1: cu + 110, y0: y0 + 5, y1: y0 + 1245, d0: 70, d1: 78, mat: 'fabric' }, { u0: cu - 90, u1: cu + 90, y0: bi.y0 + bi.H * 0.62, y1: bi.y0 + bi.H * 0.62 + 120, d0: 120, d1: 260, mat: 'steel' }] });
      hwRows.push({ k: 'ironKit', en: 'Fold-away ironing board kit', ar: 'طقم طاولة كوي قابلة للطي', qty: 1 });
      if (u.socket) hwRows.push({ k: 'socket', en: 'Socket outlet 13 A (iron)', ar: 'مقبس كهرباء ١٣ أمبير (المكواة)', qty: 1 });
    }
    if (wi && p.underLed) { // LED strip under each wall cabinet, over the worktop
      const R = { u0: wi.fu0 + 30, u1: wi.fu0 + wi.W - 30 };
      addProp(scene, { kind: 'led', unitId: wi.unit.id, row: 'wall', boxes: [{ ...R, y0: wi.y0 - 6, y1: wi.y0, d0: wi.D - 60, d1: wi.D - 40, mat: 'led' }] });
      addLed(scene, wi, { on: true, u0: R.u0, u1: R.u1, y0: wi.y0 - 6, y1: wi.y0 - 2, d0: wi.D - 60, d1: wi.D - 40, w: 20, off: 0 });
      ledLen.m += (R.u1 - R.u0) / 1000;
    }
  });
  /* the plinth: boards in front of the cabinets only (machine niches stand on the floor) */
  const spans = plinthSpans(run);
  setPlinthParts(scene, 'main', spans, { h: g.plinthH, setback: g.plinthSetback, board: g.board, D });
  if (!p.worktop) cutCounters(run, floorSpans.filter(() => true));
  if (hampers) hwRows.push({ k: 'hamperFrame', en: 'Pull-out hamper frame + laundry basket', ar: 'هيكل سلة غسيل سحّابة مع سلة', qty: hampers });
  if (vents) hwRows.push({ k: 'ventKit', en: `Dryer vent kit Ø${p.ventD} (hose, duct, wall cap)`, ar: `طقم تهوية مجفف Ø${p.ventD} (خرطوم ومجرى وغطاء)`, qty: vents });
  if (ledLen.m > 0) { hwRows.push({ k: 'ledStrip', en: 'LED strip (per metre)', ar: 'شريط LED (للمتر)', qty: Math.ceil(ledLen.m) }); hwRows.push({ k: 'ledDriver', en: 'LED driver 12 V', ar: 'محوّل LED ١٢ فولت', qty: 1 }); }
  if (floorSpans.length) hwRows.push({ k: 'waterStop', en: 'Machine hose + waste outlet box (per niche)', ar: 'علبة خراطيم وتصريف (لكل فتحة)', qty: floorSpans.length });
  void rails; void irons; void sinks; void stacks;
  return { hw: hwRows };
}

function rules(d, out) {
  const { p, x } = d; const w = []; const add = (id, en, ar) => w.push({ id, en, ar });
  const machines = d.units.filter((u) => MACHINE_TYPES.includes(u.type));
  const needD = p.machineD + p.backClear + x.back + 15 + 15;
  if (machines.length && p.depth < needD) add('depth-short', `The cabinets are ${p.depth} mm deep: the ${p.machineD} mm machine + ${p.backClear} mm behind it needs at least ${needD} mm. The machine is pushed back into the wall space.`, `عمق الخزائن ${p.depth} مم: جهاز ${p.machineD} مم مع ${p.backClear} مم خلفه يحتاج ${needD} مم على الأقل.`);
  const above = clearanceAbove(p, x);
  if (d.units.some((u) => u.type === 'washer' || u.type === 'dryer') && above < p.topClear) add('top-clear', `Only ${Math.round(above)} mm above the machine under the worktop board (needs ${p.topClear} mm): raise the worktop to at least ${Math.round(p.worktopH + (p.topClear - above))} mm.`, `${Math.round(above)} مم فقط فوق الجهاز تحت لوح السطح (المطلوب ${p.topClear} مم): ارفع السطح إلى ${Math.round(p.worktopH + (p.topClear - above))} مم على الأقل.`);
  if (machines.length && p.side < 15) add('side-clear', `Side clearance ${p.side} mm is under 15 mm: the machine will rub the niche when it spins.`, `الفراغ الجانبي ${p.side} مم أقل من ١٥ مم: سيحتك الجهاز بالفتحة أثناء الدوران.`);
  if (machines.length && p.backClear < 80) add('back-clear', `${p.backClear} mm behind the machine is tight for hoses and the dryer vent (80 mm minimum).`, `${p.backClear} مم خلف الجهاز ضيقة للخراطيم وتهوية المجفف (٨٠ مم كحد أدنى).`);
  if (d.units.some((u) => u.type === 'dryer' || u.type === 'stack') && !p.vent) add('no-vent', 'A dryer needs a vent or a condenser model: the vent hole is off.', 'المجفف يحتاج مجرى تهوية أو طراز مكثّف: فتحة التهوية مغلقة.');
  if (p.machineW + 2 * p.side > p.machineW + 80) add('side-wide', 'Side clearance this wide wastes width: the niche is wider than the machine needs.', 'فراغ جانبي بهذا الاتساع يهدر عرضًا.');
  if (d.units.some((u) => u.type === 'stack') && (2 * p.machineH + 2 * p.topClear + 3 * x.board) > 1950) add('stack-high', `The stacked column is ${Math.round(2 * p.machineH + 2 * p.topClear + 3 * x.board)} mm tall: the dryer controls are above shoulder height.`, `العمود المتراص بارتفاع ${Math.round(2 * p.machineH + 2 * p.topClear + 3 * x.board)} مم: أزرار المجفف فوق مستوى الكتف.`);
  if (d.units.some((u) => u.type === 'sink') && p.boardType === 'standard') add('sink-board', 'A utility sink base in standard MDF will swell. Choose MR or HMR board.', 'وحدة حوض الخدمة من MDF العادي ستنتفخ. اختر لوح MR أو HMR.');
  d.units.filter((u) => u.type === 'hamper' && u.w < 350).forEach(() => add('hamper-narrow', 'A pull-out hamper under 350 mm is too narrow for a laundry basket.', 'سلة غسيل أقل من ٣٥٠ مم ضيقة جدًا.'));
  if (d.units.some((u) => u.above && u.above !== 'none') && p.wallGap < 500) add('wall-gap', `Wall cabinets ${p.wallGap} mm above the worktop leave no room to use the machine controls and detergent.`, `خزائن علوية على ارتفاع ${p.wallGap} مم فوق السطح لا تترك مكانًا لاستخدام الأجهزة.`);
  if (machines.length) add('door-room', 'Keep 650 mm clear in front of a front-load machine so the door opens fully.', 'اترك ٦٥٠ مم أمام الغسالة الأمامية لتفتح بابها كاملًا.');
  void out;
  return w;
}

const UN = (id, type, w, o) => ({ id, type, w, ...o });
const PRESETS = [
  { id: 'side', en: 'Side by side + pantry', ar: 'جنبًا إلى جنب مع مخزن', make: () => ({ units: [UN('u1', 'washer', 656, { above: 'doors' }), UN('u2', 'dryer', 656, { above: 'doors' }), UN('u3', 'sink', 800, { above: 'doors' }), UN('u4', 'pantry', 600)], p: {} }) },
  { id: 'stacked', en: 'Stacked column + hamper + rail', ar: 'عمود متراص مع سلة وماسورة', make: () => ({ units: [UN('u1', 'stack', 656), UN('u2', 'hamper', 450, { above: 'none' }), UN('u3', 'base', 600, { front: 'drawers', drawers: 3, above: 'doors' }), UN('u4', 'rail', 700)], p: { top: 'quartz' } }) },
  { id: 'compact', en: 'Compact: washer + dryer under one worktop', ar: 'مدمج: غسالة ومجفف تحت سطح واحد', make: () => ({ units: [UN('u1', 'washer', 656, { above: 'open' }), UN('u2', 'dryer', 656, { above: 'open' })], p: { worktopH: 960, wallH: 600 } }) },
  { id: 'utility', en: 'Utility room: sink, hamper, ironing, broom', ar: 'غرفة خدمات: حوض وسلة وكوي ومكانس', make: () => ({ units: [UN('u1', 'iron', 400), UN('u2', 'washer', 656, { above: 'doors' }), UN('u3', 'dryer', 656, { above: 'doors' }), UN('u4', 'hamper', 450, { above: 'none' }), UN('u5', 'sink', 800, { above: 'doors' }), UN('u6', 'pantry', 600)], p: { top: 'granite', boardType: 'hmr' } }) },
  { id: 'single', en: 'Single washer + storage', ar: 'غسالة واحدة مع تخزين', make: () => ({ units: [UN('u1', 'washer', 656, { above: 'doors' }), UN('u2', 'base', 800, { front: 'doors', above: 'doors' })], p: {} }) },
];

const PRICE = {
  topName: ['Worktop', 'سطح العمل'],
  rates: {
    board: { Carcass: 6.5, Back: 2.8, Shelf: 6.5, Door: 11, Drawer: 6, Plinth: 4.5, Glass: 22 },
    top: { quartz: 85, marble: 105, granite: 78, laminate: 26, oakslab: 70 },
    edge: 0.7, wastePct: 0.1, labourPct: 0.35, marginPct: 0.2,
    hw: { hinge: 0.9, plate: 0.3, runner: 5.5, handleBar: 1.5, handleKnob: 1, handleProfile: 4, pin: 0.04, minifix: 0.25, cam: 0.2, dowel: 0.03, leg: 0.8, sink: 8, stackKit: 14, hamperFrame: 18, ironKit: 22, railRod: 4.5, broomHook: 3.5, ventKit: 9, waterStop: 6, socket: 3.5, ledStrip: 9, ledDriver: 12 },
  },
  adjust: (d, r) => ({ ...r, board: Object.fromEntries(Object.entries(r.board).map(([k, v]) => [k, k === 'Glass' ? v : Math.round(v * (UPLIFT[d.p.boardType] || 1) * 100) / 100])) }),
};

const ASSISTANT = {
  greet: ['design your laundry cabinets. Tell me the machines (side by side or stacked), the worktop, the pantry, the hamper, the sink and the ironing unit — or change one unit. Every change is shown for review before it is applied, and Undo brings the previous design back.', 'وهساعدك تصمم خزائن غرفة الغسيل. اوصفلي الأجهزة (جنبًا إلى جنب أو فوق بعض) والسطح والمخزن وسلة الغسيل والحوض ووحدة الكوي — أو غيّر وحدة واحدة. كل تغيير يُعرض للمراجعة قبل التطبيق، وزر التراجع يرجّع التصميم السابق.'],
  examples: { en: ['machine width 600', 'worktop height 940', 'side clearance 25', 'back clearance 120', 'no worktop', 'dryer vent off', 'add hamper', 'add ironing unit', 'unit 3 drawers 3', 'stacked column', 'quartz worktop', 'show 3d', 'x-ray', 'open doors', 'daylight'], ar: ['عرض الجهاز ٦٠٠', 'ارتفاع السطح ٩٤٠', 'فراغ جانبي ٢٥', 'فراغ خلفي ١٢٠', 'بدون سطح', 'أغلق تهوية المجفف', 'أضف سلة غسيل', 'أضف وحدة كوي', 'وحدة ٣ أدراج ٣', 'سطح كوارتز', 'اعرض ثلاثي الأبعاد', 'أشعة', 'افتح الأبواب', 'ضوء النهار'] },
  nums: [
    { re: /machine width|عرض الجهاز/, key: 'machineW' }, { re: /machine depth|عمق الجهاز/, key: 'machineD' }, { re: /machine height|ارتفاع الجهاز/, key: 'machineH' }, { re: /worktop height|ارتفاع السطح/, key: 'worktopH' },
    { re: /side clear(ance)?|فراغ جانبي/, key: 'side' }, { re: /back clear(ance)?|space behind|فراغ خلفي/, key: 'backClear' }, { re: /top clear(ance)?|فراغ علوي|فراغ فوق/, key: 'topClear' }, { re: /\bdepth|عمق/, key: 'depth' },
    { re: /tall (unit )?height|ارتفاع الوحدات الطويلة/, key: 'tallH' }, { re: /wall cabinet height|ارتفاع الخزائن العلوية/, key: 'wallH' }, { re: /vent (hole )?(diameter|size)|قطر التهوية/, key: 'ventD' },
  ],
  words: [
    { re: /no worktop|without (a )?worktop|بدون سطح/, set: { worktop: false } }, { re: /with (a )?worktop|worktop over|سطح فوق الأجهزة/, set: { worktop: true } },
    { re: /(vent|تهوية).*(off|no|أغلق|بدون)|no vent|vent off|أغلق تهوية/, set: { vent: false } }, { re: /vent (on|hole)|فتح تهوية|فعل تهوية/, set: { vent: true } },
    { re: /no led|led off|بدون led/, set: { underLed: false } }, { re: /under[- ]?cabinet led|led under/, set: { underLed: true } },
    { re: /quartz|كوارتز/, set: { top: 'quartz' } }, { re: /granite|جرانيت/, set: { top: 'granite' } }, { re: /marble|رخام/, set: { top: 'marble' } }, { re: /laminate|لامينيت/, set: { top: 'laminate' } }, { re: /solid oak|بلوط/, set: { top: 'oakslab' } },
    { re: /\bmr\b|moisture/, set: { boardType: 'mr' } }, { re: /\bhmr\b/, set: { boardType: 'hmr' } },
    { re: /no wall cabinets?|بدون خزائن علوية/, unitSet: { above: 'none' } }, { re: /wall cabinets?|خزائن علوية/, unitSet: { above: 'doors' } }, { re: /open shelves above|رفوف مفتوحة فوق/, unitSet: { above: 'open' } },
    { re: /drawers front|front drawers|واجهة أدراج/, unitSet: { front: 'drawers' } },
  ],
  addWords: [{ re: /washer|غسالة/, type: 'washer' }, { re: /dryer|مجفف/, type: 'dryer' }, { re: /stack(ed)?|فوق بعض|متراص/, type: 'stack' }, { re: /hamper|سلة/, type: 'hamper' }, { re: /ironing|iron|كوي/, type: 'iron' }, { re: /sink|حوض/, type: 'sink' }, { re: /pantry|broom|مكنسة|مخزن/, type: 'pantry' }, { re: /rail|hanging|معلاق/, type: 'rail' }, { re: /base( cabinet)?|خزانة سفلية/, type: 'base' }],
};

export const LAUNDRY = {
  id: 'laundry', menuId: 'neo-laundry', storageKey: 'neo_cat_laundry_v1',
  app: ['Neo Laundry Designer', 'مصمم غرف الغسيل نيو'], noun: ['Laundry cabinets', 'خزائن الغسيل'], unitNoun: ['unit', 'وحدة'], defaultTitle: ['My Laundry', 'غرفة الغسيل'], file: 'laundry', single: ['laundry', 'غرفة الغسيل'],
  layoutLabel: ['Laundry run', 'تشكيلة غسيل'], icon: '🧺',
  unitTypes: UNIT_TYPES, params: PARAMS, presets: PRESETS, x: { board: 18, back: 8, finishKey: 'white' },
  names: { counter: ['Worktop', 'سطح العمل'], splash: ['Back splash', 'باكسبلاش'] },
  legend: { keys: ['baseUnit', 'wallUnit', 'door', 'drawer', 'open', 'shelf', 'counter', 'plinth'], names: { baseUnit: ['Cabinet / niche', 'خزانة / فتحة'] } },
  slotRows: [{ k: 'structure', en: 'Structure', ar: 'الهيكل' }, { k: 'shelves', en: 'Shelves', ar: 'الرفوف' }, { k: 'back', en: 'Back', ar: 'الظهر' }, { k: 'baseDoors', en: 'Doors', ar: 'الأبواب' }, { k: 'wallDoors', en: 'Wall doors', ar: 'أبواب العلوي' }, { k: 'tallDoors', en: 'Tall doors', ar: 'أبواب الطويل' }, { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج' }, { k: 'drawers', en: 'Drawer boxes', ar: 'صناديق الأدراج' }, { k: 'plinth', en: 'Plinth', ar: 'القاعدة' }, { k: 'countertop', en: 'Worktop', ar: 'سطح العمل' }, { k: 'handles', en: 'Handles', ar: 'المقابض' }],
  globalCards: [{ en: 'Cabinets', ar: 'الخزائن', keys: ['worktopH', 'depth', 'tallH', 'plinthH'] }],
  msCards: [{ en: 'Board', ar: 'اللوح', keys: ['boardType'], note: ['A utility sink and a washing machine make the room damp: MR or HMR board is the safe choice. Rates follow the board.', 'حوض الخدمة والغسالة يجعلان الغرفة رطبة: لوح MR أو HMR هو الخيار الآمن. الأسعار تتبع اللوح.'] }],
  tabs: [
    { id: 'machines', icon: 'drawers', en: 'Machines', ar: 'الأجهزة', cards: [
      { en: 'Machine size', ar: 'مقاس الجهاز', keys: ['machineW', 'machineD', 'machineH'], note: ['A washer / dryer niche is sized from the machine: niche width = machine width + 2 × (side clearance + board).', 'فتحة الغسالة / المجفف تُحسب من الجهاز: عرض الفتحة = عرض الجهاز + ٢ × (الفراغ الجانبي + اللوح).'] },
      { en: 'Ventilation and service clearance', ar: 'التهوية وفراغ الصيانة', keys: ['side', 'topClear', 'backClear', 'vent', 'ventD'] },
    ] },
    { id: 'worktop', icon: 'counter', en: 'Worktop & wall', ar: 'السطح والعلوي', cards: [
      { en: 'Worktop', ar: 'سطح العمل', keys: ['worktop', 'top', 'topThk', 'overhang', 'splashH'] },
      { en: 'Wall cabinets', ar: 'الخزائن العلوية', keys: ['wallGap', 'wallH', 'wallD', 'underLed'], note: ['Choose what sits above each unit (wall cabinet, open shelves or nothing) in the Units tab.', 'اختر ما يوضع فوق كل وحدة (خزانة جدارية أو رفوف مفتوحة أو لا شيء) من تبويب الوحدات.'] },
    ] },
  ],
  matNames: (d) => ({ structure: BOARD_NAME[d.p.boardType], shelves: BOARD_NAME[d.p.boardType], back: 'Back board 8 mm', baseDoors: BOARD_NAME[d.p.boardType], wallDoors: BOARD_NAME[d.p.boardType], tallDoors: BOARD_NAME[d.p.boardType], drawers: BOARD_NAME[d.p.boardType], plinth: BOARD_NAME[d.p.boardType] }),
  toKitchen, decorate, rules, price: PRICE, assistant: ASSISTANT,
};

registerProduct('laundry', {
  app: LAUNDRY.app, noun: LAUNDRY.noun, file: 'laundry', layoutLabel: { straight: ['Laundry run', 'تشكيلة غسيل'], 'l-left': ['L-run', 'تشكيلة L'], 'l-right': ['L-run', 'تشكيلة L'], u: ['U-run', 'تشكيلة U'] }, legend: LAUNDRY.legend, worktop: ['Worktop', 'سطح العمل'],
  runNames: { main: ['Main run', 'الصف الرئيسي'] }, propsNote: ['Machines, hoses, rails and LED strips in OBJ / STL / 3DM. Display only: never in the cut list or the price.', 'الأجهزة والخراطيم والسكك وشرائط LED في OBJ / STL / 3DM. للعرض فقط: ليست في قائمة القص أو السعر.'],
});
registerArabicNames([
  [/Washer niche/g, 'فتحة غسالة'], [/Dryer niche/g, 'فتحة مجفف'], [/Stacked washer \+ dryer/g, 'غسالة + مجفف فوق بعض'], [/Base cabinet/g, 'خزانة سفلية'], [/Pull-out hamper/g, 'سلة غسيل سحّابة'], [/Utility sink base/g, 'وحدة حوض خدمة'], [/Pantry \/ broom unit/g, 'مخزن / وحدة مكانس'],
  [/Hanging rail zone/g, 'منطقة معلاق'], [/Ironing-board unit/g, 'وحدة طاولة الكوي'], [/Wall cabinet/g, 'خزانة جدارية'], [/Worktop/g, 'سطح العمل'], [/Back splash/g, 'باكسبلاش'],
]);
registerArabicNotes([[/Dryer vent hole Ø(\d+) @ (\d+) high/g, 'فتحة تهوية المجفف Ø$1 على ارتفاع $2']]);

export default LAUNDRY;
