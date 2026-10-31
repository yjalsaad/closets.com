/* =============================================================================
 * Neo Bathroom Designer [NEO-CATEGORIES-UX26] - the bathroom-cabinet config of the generic category studio.
 *   units : vanity (wall-hung or floor standing on legs / a plinth; drawers with plumbing clearance; mirror cabinet / LED mirror / open shelf above),
 *           tall storage column, open shelf niche, wall cabinet
 *   tabs  : Global | M&S (moisture-resistant board + waterproof edge band) | Units | Sink & plumbing | Top | Mirror & light | Hardware | Price
 * Everything below is DATA + two functions (toKitchen, decorate); the studio, the cut list, the files and the price are the shared ones.
 * ===========================================================================*/
import { baseG, assemble, leafCount } from '../categoryModel';
import { registerProduct } from '../../neoKitchen/productInfo';
import { registerArabicNames, registerArabicNotes } from '../../neoKitchen/cutlist';
import { addPart, addProp, addLed, addCutout, setBox, clonePart, findInst, frameBoxes, tubBoxes, setPlinthParts, plinthSpans, r1 } from '../categoryKit';

const sp = (o) => o;
/* ---- parameters (category tab specs) -------------------------------------------------------------------------------------------------- */
export const PARAMS = [
  /* Global: size + mounting */
  sp({ k: 'depth', t: 'num', min: 320, max: 600, step: 10, def: 460, en: 'Vanity depth', ar: 'عمق وحدة الحوض', help: ['Front to back. 450-550 mm is usual; slim vanities go down to 350 mm.', 'من الأمام للخلف. المعتاد ٤٥٠-٥٥٠ مم والوحدات الضيقة حتى ٣٥٠ مم.'] }),
  sp({ k: 'vanityH', t: 'num', min: 700, max: 1000, step: 10, def: 850, en: 'Vanity height (top surface)', ar: 'ارتفاع الوحدة (سطح الطاولة)', help: ['Floor to the top surface. 800-900 mm is the comfortable range.', 'من الأرض إلى سطح الطاولة. المريح ٨٠٠-٩٠٠ مم.'] }),
  sp({ k: 'mount', t: 'seg', def: 'wall', opts: [['wall', 'Wall-hung', 'معلّق'], ['floor', 'Floor standing', 'أرضي']], en: 'Mounting', ar: 'التركيب' }),
  sp({ k: 'hangGap', t: 'num', min: 100, max: 700, step: 10, def: 250, en: 'Floor clearance (wall-hung)', ar: 'الفراغ تحت الوحدة (معلّق)', when: (c) => c.p.mount === 'wall', why: ['Only for a wall-hung vanity.', 'للوحدة المعلّقة فقط.'] }),
  sp({ k: 'foot', t: 'seg', def: 'legs', opts: [['legs', 'Legs', 'أرجل'], ['plinth', 'Plinth', 'قاعدة']], en: 'Floor standing on', ar: 'الوقوف على', when: (c) => c.p.mount === 'floor', why: ['Choose Floor standing to pick legs or a plinth.', 'اختر أرضي لاختيار الأرجل أو القاعدة.'] }),
  sp({ k: 'legH', t: 'num', min: 100, max: 250, step: 10, def: 150, en: 'Leg height', ar: 'ارتفاع الأرجل', when: (c) => c.p.mount === 'floor' && c.p.foot === 'legs', why: ['Only for a floor-standing vanity on legs.', 'للوحدة الأرضية على أرجل فقط.'] }),
  sp({ k: 'plinthH', t: 'num', min: 60, max: 150, step: 5, def: 100, en: 'Plinth height', ar: 'ارتفاع القاعدة', when: (c) => c.p.mount === 'floor' && c.p.foot === 'plinth', why: ['Only for a floor-standing vanity on a plinth.', 'للوحدة الأرضية على قاعدة فقط.'] }),
  sp({ k: 'columnH', t: 'num', min: 1000, max: 2200, step: 50, def: 1800, en: 'Tall column height (from the floor)', ar: 'ارتفاع العمود الطويل (من الأرض)' }),
  sp({ k: 'columnD', t: 'num', min: 250, max: 600, step: 10, def: 350, en: 'Tall column depth', ar: 'عمق العمود الطويل' }),
  /* Sink & plumbing */
  sp({ k: 'basins', t: 'seg', def: 'single', opts: [['none', 'None', 'بدون'], ['single', 'Single', 'مفرد'], ['double', 'Double', 'مزدوج']], en: 'Basins', ar: 'الأحواض' }),
  sp({ k: 'basinType', t: 'seg', def: 'top', opts: [['top', 'Top-mount', 'فوق السطح'], ['under', 'Undermount', 'تحت السطح'], ['vessel', 'Vessel', 'وعاء']], en: 'Basin type', ar: 'نوع الحوض', when: (c) => c.p.basins !== 'none', why: ['Choose Single or Double basins first.', 'اختر حوضًا مفردًا أو مزدوجًا أولًا.'] }),
  sp({ k: 'basinW', t: 'num', min: 360, max: 700, step: 10, def: 480, en: 'Basin width (each)', ar: 'عرض الحوض (لكل حوض)', when: (c) => c.p.basins !== 'none', why: ['No basin selected.', 'لم يُحدد حوض.'] }),
  sp({ k: 'basinD', t: 'num', min: 300, max: 480, step: 10, def: 380, en: 'Basin depth (front to back)', ar: 'عمق الحوض (أمامي-خلفي)', when: (c) => c.p.basins !== 'none', why: ['No basin selected.', 'لم يُحدد حوض.'] }),
  sp({ k: 'bowlD', t: 'num', min: 100, max: 220, step: 10, def: 150, en: 'Bowl depth', ar: 'عمق الوعاء', when: (c) => c.p.basins !== 'none', why: ['No basin selected.', 'لم يُحدد حوض.'], help: ['A deep bowl lowers the box of the drawer under it.', 'الوعاء العميق يخفّض صندوق الدرج تحته.'] }),
  sp({ k: 'faucet', t: 'seg', def: 'deck', opts: [['deck', 'Deck tap', 'خلاط على السطح'], ['wall', 'Wall spout', 'خلاط جداري']], en: 'Tap', ar: 'الخلاط', when: (c) => c.p.basins !== 'none', why: ['No basin selected.', 'لم يُحدد حوض.'] }),
  sp({ k: 'plumbDrawer', t: 'tog', def: true, en: 'U-shaped top drawer around the trap', ar: 'الدرج العلوي بشكل U حول السيفون', when: (c) => c.p.basins !== 'none', why: ['No basin selected.', 'لم يُحدد حوض.'] }),
  sp({ k: 'notchW', t: 'num', min: 120, max: 320, step: 10, def: 200, en: 'Plumbing notch width', ar: 'عرض فتحة السباكة', when: (c) => c.p.basins !== 'none' && c.p.plumbDrawer, why: ['Turn on the U-shaped top drawer.', 'فعّل الدرج العلوي بشكل U.'] }),
  sp({ k: 'notchD', t: 'num', min: 150, max: 350, step: 10, def: 250, en: 'Plumbing notch depth', ar: 'عمق فتحة السباكة', when: (c) => c.p.basins !== 'none' && c.p.plumbDrawer, why: ['Turn on the U-shaped top drawer.', 'فعّل الدرج العلوي بشكل U.'] }),
  sp({ k: 'topDrawerH', t: 'num', min: 140, max: 320, step: 10, def: 200, en: 'Top drawer front height (combo vanity)', ar: 'ارتفاع واجهة الدرج العلوي (النمط المركّب)' }),
  /* Top */
  sp({ k: 'top', t: 'seg', def: 'quartz', opts: [['quartz', 'Quartz', 'كوارتز'], ['marble', 'Marble', 'رخام'], ['granite', 'Granite', 'جرانيت'], ['laminate', 'Laminate', 'لامينيت'], ['oakslab', 'Solid oak', 'بلوط صلب']], en: 'Top material', ar: 'مادة السطح' }),
  sp({ k: 'topThk', t: 'num', min: 12, max: 60, step: 2, def: 30, en: 'Top thickness', ar: 'سماكة السطح' }),
  sp({ k: 'overhang', t: 'num', min: 0, max: 50, step: 5, def: 20, en: 'Front overhang', ar: 'بروز السطح الأمامي' }),
  sp({ k: 'splashH', t: 'num', min: 0, max: 200, step: 10, def: 100, en: 'Back splash height', ar: 'ارتفاع الباكسبلاش', help: ['0 = no splash.', '٠ = بدون.'] }),
  /* Mirror & light */
  sp({ k: 'mirrorH', t: 'num', min: 300, max: 1200, step: 10, def: 700, en: 'Mirror / cabinet height', ar: 'ارتفاع المرآة / الخزانة' }),
  sp({ k: 'mirrorGap', t: 'num', min: 150, max: 500, step: 10, def: 250, en: 'Gap above the top surface', ar: 'الفراغ فوق السطح' }),
  sp({ k: 'wallD', t: 'num', min: 100, max: 250, step: 10, def: 150, en: 'Mirror cabinet depth', ar: 'عمق خزانة المرآة' }),
  sp({ k: 'mirrorLed', t: 'seg', def: 'frame', opts: [['off', 'No LED', 'بدون LED'], ['frame', 'LED frame', 'إطار LED'], ['back', 'Backlit halo', 'توهج خلفي']], en: 'Mirror lighting', ar: 'إضاءة المرآة' }),
  sp({ k: 'ledOn', t: 'tog', def: true, en: 'LED light on', ar: 'تشغيل إضاءة LED', when: (c) => c.p.mirrorLed !== 'off', why: ['Choose an LED frame or a backlit halo.', 'اختر إطار LED أو توهجًا خلفيًا.'] }),
  /* Materials */
  sp({ k: 'boardType', t: 'seg', def: 'mr', opts: [['standard', 'Standard', 'عادي'], ['mr', 'MR board', 'MR'], ['hmr', 'HMR board', 'HMR'], ['marine', 'Marine ply', 'خشب بحري']], en: 'Board', ar: 'اللوح' }),
  sp({ k: 'edgeBand', t: 'seg', def: 'pvc', opts: [['pvc', 'PVC 2 mm', 'PVC ٢ مم'], ['abs', 'ABS 1 mm', 'ABS ١ مم'], ['veneer', 'Veneer', 'قشرة']], en: 'Edge band', ar: 'شريط الحواف' }),
];

const BOARD_NAME = { standard: 'Standard MDF 18 mm', mr: 'MR board 18 mm (moisture resistant)', hmr: 'HMR board 18 mm (high moisture resistant)', marine: 'Marine plywood 18 mm' };
const EDGE_NAME = { pvc: 'PVC waterproof edge band 2 mm', abs: 'ABS edge band 1 mm', veneer: 'Wood veneer edge band 0.6 mm' };
const EDGE_T = { pvc: 2, abs: 1, veneer: 0.6 };
const TAP_H = { deck: 180, vessel: 290, wall: 0 };
const AR_UP = { standard: 'MDF عادي', mr: 'لوح MR مقاوم للرطوبة', hmr: 'لوح HMR عالي المقاومة', marine: 'خشب بحري' };

/* ---- unit types ------------------------------------------------------------------------------------------------------------------------ */
const UNIT_TYPES = {
  vanity: {
    en: 'Vanity', ar: 'وحدة حوض', wallEn: 'Mirror cabinet', wallAr: 'خزانة مرآة', tag: 'V', w: { min: 500, max: 1500, def: 800 },
    opts: [
      sp({ k: 'front', t: 'seg', def: 'combo', opts: [['doors', 'Doors', 'أبواب'], ['drawers', 'Drawers', 'أدراج'], ['combo', 'Drawer + doors', 'درج + أبواب']], en: 'Front', ar: 'الواجهة' }),
      sp({ k: 'drawers', t: 'step', min: 1, max: 3, def: 2, en: 'Drawers (stacked)', ar: 'الأدراج (متراصة)', when: (c) => c.u.front === 'drawers', why: ['Front is not Drawers.', 'الواجهة ليست أدراجًا.'] }),
      sp({ k: 'shelves', t: 'step', min: 0, max: 3, def: 1, en: 'Shelves behind the doors', ar: 'الرفوف خلف الأبواب', when: (c) => c.u.front !== 'drawers', why: ['Front is Drawers.', 'الواجهة أدراج.'] }),
      sp({ k: 'above', t: 'seg', def: 'cabinet', opts: [['none', 'Nothing', 'لا شيء'], ['cabinet', 'Mirror cabinet', 'خزانة مرآة'], ['ledmirror', 'LED mirror', 'مرآة LED'], ['shelf', 'Open shelf', 'رف مفتوح']], en: 'Above the vanity', ar: 'فوق الوحدة' }),
    ],
    build(u, c) {
      const { p, S, U } = c;
      const lv = leafCount(u.w);
      const hinge = c.hinge(c.i);
      const secs = u.front === 'doors' ? [S('door', lv, { shelves: u.shelves, hinge })]
        : u.front === 'drawers' ? [S('drawer', u.drawers)]
          : [S('drawer', 1, { h: p.topDrawerH }), S('door', lv, { shelves: Math.min(1, u.shelves), hinge })];
      const wall = u.above === 'cabinet' ? U(u.w, [S('door', lv, { shelves: 2, hinge })]) : u.above === 'shelf' ? U(u.w, [S('open', 2, { shelves: 0 })]) : null;
      return { base: U(u.w, secs), wall };
    },
  },
  tall: {
    en: 'Tall column', ar: 'عمود طويل', tag: 'T', w: { min: 300, max: 600, def: 400 },
    opts: [
      sp({ k: 'doors', t: 'step', min: 1, max: 2, def: 1, en: 'Door leaves', ar: 'عدد الضلف' }),
      sp({ k: 'shelves', t: 'step', min: 0, max: 6, def: 4, en: 'Shelves', ar: 'الرفوف' }),
      sp({ k: 'drawers', t: 'step', min: 0, max: 3, def: 1, en: 'Drawers (bottom)', ar: 'الأدراج (أسفل)' }),
      sp({ k: 'topNiche', t: 'tog', def: true, en: 'Open niche at the top', ar: 'فتحة مفتوحة في الأعلى' }),
    ],
    build(u, c) {
      const { p, g, S, U } = c;
      const secs = [];
      if (u.topNiche) secs.push(S('open', 2, { shelves: 0, h: 420 }));
      secs.push(S('door', u.doors, { shelves: u.shelves, hinge: c.hinge(c.i) }));
      if (u.drawers) secs.push(S('drawer', u.drawers, { shelves: 0, h: u.drawers * 200 }));
      return { base: U(u.w, secs, { type: 'tall', h: Math.max(800, p.columnH - g.plinthH), d: p.columnD }) };
    },
  },
  niche: {
    en: 'Open niche', ar: 'فتحة مفتوحة', tag: 'N', w: { min: 250, max: 800, def: 400 },
    opts: [sp({ k: 'shelves', t: 'step', min: 1, max: 6, def: 3, en: 'Shelves', ar: 'الرفوف' })],
    build(u, c) { return { wall: c.U(u.w, [c.S('open', u.shelves, { shelves: 0 })]) }; },
  },
  wallcab: {
    en: 'Wall cabinet', ar: 'خزانة جدارية', tag: 'W', w: { min: 300, max: 1000, def: 600 },
    opts: [sp({ k: 'doors', t: 'step', min: 1, max: 2, def: 1, en: 'Door leaves', ar: 'عدد الضلف' }), sp({ k: 'shelves', t: 'step', min: 0, max: 4, def: 1, en: 'Shelves', ar: 'الرفوف' })],
    build(u, c) { return { wall: c.U(u.w, [c.S('door', Math.max(u.doors, c.leaf(u.w)), { shelves: u.shelves, hinge: c.hinge(c.i) })]) }; },
  },
};

/** the floor clearance / plinth under the base units (mm) */
export const clearance = (p) => (p.mount === 'wall' ? p.hangGap : p.foot === 'legs' ? p.legH : p.plinthH);

/* ---- design -> Neo Kitchen model ------------------------------------------------------------------------------------------------------- */
function toKitchen(d, { rules }) {
  const { p, x } = d;
  const notes = [];
  const clr = clearance(p);
  const g = {
    ...baseG(d), plinthH: clr, baseH: Math.max(300, p.vanityH - p.topThk - clr), counterThk: p.topThk, overhang: p.overhang, backsplashH: p.splashH,
    baseD: p.depth, wallD: p.wallD, gap: p.mirrorGap, wallH: p.mirrorH, edgeBand: EDGE_T[p.edgeBand],
  };
  const r = assemble(BATHROOM, d, g, { rules });
  r.model.counter = p.top;
  return { ...r, notes, g };
}

/* ---- decorate: what the kitchen engine does not know ------------------------------------------------------------------------------------ */
function ledSet(scene, inst, rect, p, mode, dFront) {
  const on = p.ledOn;
  const mat = on ? 'led' : 'dark';
  const t = 12;
  if (mode === 'frame') {
    addProp(scene, { kind: 'led', unitId: inst.unit.id, row: 'wall', boxes: frameBoxes(rect.u0 - t, rect.u1 + t, rect.y0 - t, rect.y1 + t, dFront, dFront + 8, t, mat) });
  } else if (mode === 'back') {
    addProp(scene, { kind: 'led', unitId: inst.unit.id, row: 'wall', boxes: frameBoxes(rect.u0 - 30, rect.u1 + 30, rect.y0 - 30, rect.y1 + 30, 0, 14, 12, mat) });
  }
  if (mode !== 'off') addLed(scene, inst, { on, u0: rect.u0, u1: rect.u1, y0: rect.y1 - 6, y1: rect.y1 - 2, d0: dFront + 2, d1: dFront + 14, w: 12, off: 0 });
}

function decorate(scene, built, d) {
  const { p, x } = d;
  const { g } = built.model;
  const run = scene.runs[0];
  const hwRows = [];
  const clr = clearance(p);
  const floating = p.mount === 'wall';
  const dt = g.doorThk;
  scene.noFeet = floating || p.foot !== 'legs';
  run.plinth = null; // the engine's single plinth record is replaced: wall-hung and leg-standing vanities have none, a plinth stands in front of each unit at ITS depth (a slim column is shallower than the vanity)
  if (p.mount === 'floor' && p.foot === 'plinth') setPlinthParts(scene, 'main', plinthSpans(run), { h: g.plinthH, setback: g.plinthSetback, board: g.board, D: g.baseD });
  let basinsDone = false; let ledLen = 0; let notchN = 0; let mirrorM2Parts = 0;
  const yTopBase = g.plinthH + g.baseH; const yCt1 = yTopBase + g.counterThk;
  const wallY0 = yCt1 + g.gap;
  const N = p.basins === 'double' ? 2 : p.basins === 'single' ? 1 : 0;
  const first = built.placed.find((pl) => pl.unit.type === 'vanity');
  built.placed.forEach((pl) => {
    const bf = pl.ids.base ? findInst(scene, pl.ids.base) : null; const wf = pl.ids.wall ? findInst(scene, pl.ids.wall) : null;
    const bi = bf && bf.inst; const wi = wf && wf.inst;
    const u = pl.unit;
    if (bi && floating) { // wall-hung: a hanging rail on the wall behind the cabinet (display) - listed as hardware
      addProp(scene, { kind: 'rail', unitId: bi.unit.id, row: 'base', boxes: [{ u0: bi.fu0 + 20, u1: bi.fu0 + bi.W - 20, y0: yTopBase - 90, y1: yTopBase - 50, d0: 0, d1: 8, mat: 'steel' }] });
      hwRows.push({ k: 'bracket', en: 'Wall-hung cabinet rail + bracket set', ar: 'سكة تعليق جدارية مع حوامل', qty: Math.ceil(u.w / 600) * (u.type === 'tall' ? 2 : 1) });
    }
    if (u.type === 'vanity' && bi) {
      /* ---- basins in the first vanity: cut-outs in the top, ceramic bowls, taps ---- */
      const ct = run.counters.find((k) => bi.fu0 + bi.W / 2 >= k.u0 && bi.fu0 + bi.W / 2 <= k.u1);
      const hasBasin = N > 0 && first === pl && ct;
      if (hasBasin) {
        basinsDone = true;
        const bw = Math.max(300, Math.min(p.basinW, (bi.W - 70) / N - 10));
        const bd = Math.max(280, Math.min(p.basinD, ct.d1 - 110));
        const dc = ct.d1 - bd / 2 - 60;
        for (let i = 0; i < N; i++) {
          const cu = bi.fu0 + (bi.W * (2 * i + 1)) / (2 * N);
          const vessel = p.basinType === 'vessel';
          const cw = vessel ? 60 : p.basinType === 'under' ? bw - 60 : bw - 20; const cdp = vessel ? 60 : p.basinType === 'under' ? bd - 60 : bd - 20;
          addCutout(run, { type: 'basin', name: vessel ? 'Drain' : p.basinType === 'under' ? 'Undermount basin' : 'Basin', cu, w: cw, d: cdp, dOff: dc });
          const y1 = ct.y1; const bowl = p.bowlD;
          const boxes = [];
          if (vessel) boxes.push(...tubBoxes(cu - bw / 2, cu + bw / 2, y1, y1 + bowl, dc - bd / 2, dc + bd / 2, 9, 'ceramic'));
          else {
            boxes.push(...tubBoxes(cu - cw / 2 - 6, cu + cw / 2 + 6, y1 - bowl, p.basinType === 'top' ? y1 : y1 - 1, dc - cdp / 2 - 6, dc + cdp / 2 + 6, 8, 'ceramic'));
            if (p.basinType === 'top') boxes.push(...frameBoxes(cu - cw / 2 - 14, cu + cw / 2 + 14, dc - cdp / 2 - 14, dc + cdp / 2 + 14, y1, y1 + 5, 14, 'ceramic').map((b) => ({ u0: b.u0, u1: b.u1, y0: b.d0, y1: b.d1, d0: b.y0, d1: b.y1, mat: b.mat }))); // rim ring flat on the top
          }
          addProp(scene, { kind: 'basin', unitId: bi.unit.id, row: 'counter', boxes });
          /* tap */
          const tb = [];
          if (p.faucet === 'wall') {
            tb.push({ u0: cu - 30, u1: cu + 30, y0: y1 + 175, y1: y1 + 205, d0: 0, d1: 8, mat: 'chrome' }, { u0: cu - 8, u1: cu + 8, y0: y1 + 185, y1: y1 + 201, d0: 8, d1: vessel ? 230 : 190, mat: 'chrome' }, { u0: cu - 8, u1: cu + 8, y0: y1 + 205, y1: y1 + 245, d0: 14, d1: 30, mat: 'chrome' });
          } else {
            const hh = vessel ? 290 : 160;
            tb.push({ u0: cu - 20, u1: cu + 20, y0: y1, y1: y1 + 22, d0: 30, d1: 70, mat: 'chrome' }, { u0: cu - 9, u1: cu + 9, y0: y1 + 22, y1: y1 + hh, d0: 41, d1: 59, mat: 'chrome' }, { u0: cu - 8, u1: cu + 8, y0: y1 + hh - 18, y1: y1 + hh, d0: 41, d1: vessel ? 190 : 150, mat: 'chrome' }, { u0: cu + 12, u1: cu + 40, y0: y1 + 70, y1: y1 + 82, d0: 44, d1: 56, mat: 'chrome' });
          }
          addProp(scene, { kind: 'tap', unitId: bi.unit.id, row: 'counter', boxes: tb });
        }
        hwRows.push({ k: 'basinCut', en: p.basinType === 'vessel' ? 'Vessel basin drain hole (labour)' : 'Basin cut-out (labour)', ar: p.basinType === 'vessel' ? 'ثقب تصريف حوض وعاء (عمل)' : 'فتحة حوض (عمل)', qty: N });
        /* ---- plumbing clearance: the drawer under the basin is U-shaped and its box is lowered under the bowl ---- */
        if (p.plumbDrawer && p.basinType !== 'vessel' && u.front !== 'doors') {
          const fronts = bi.parts.filter((q) => q.kind === 'drawerFront').sort((a, b) => b.box.y1 - a.box.y1);
          const top = fronts[0];
          if (top) {
            const boxP = bi.parts.filter((q) => q.kind === 'drawerBox' && q.anim === top.anim);
            const clear = Math.max(0, p.bowlD - p.topThk - 20 + 10);
            boxP.forEach((q) => { if (/side$|box front$|box back$/.test(q.name)) { const room = q.box.y1 - q.box.y0 - 60; setBox(q, { y1: q.box.y1 - Math.min(clear, Math.max(0, room)) }); } });
            const bot = boxP.find((q) => /bottom$/.test(q.name)); const back = boxP.find((q) => /box back$/.test(q.name));
            const nw = Math.min(p.notchW, bi.W - 2 * g.board - 2 * g.drawerSide - 60); const nd = p.notchD; const cuN = bi.fu0 + bi.W / 2;
            if (bot && back && nw > 60) {
              const B = bot.box; const K = back.box; notchN += 1;
              const note = `Plumbing notch ${Math.round(nw)} x ${Math.round(nd)}`;
              clonePart(scene, bi, bot, { name: bot.name.replace(/bottom$/, 'bottom (front)'), box: { ...B, d0: B.d0 + nd }, note });
              clonePart(scene, bi, bot, { name: bot.name.replace(/bottom$/, 'bottom (rear left)'), box: { ...B, u1: cuN - nw / 2, d1: B.d0 + nd }, note });
              clonePart(scene, bi, bot, { name: bot.name.replace(/bottom$/, 'bottom (rear right)'), box: { ...B, u0: cuN + nw / 2, d1: B.d0 + nd }, note });
              clonePart(scene, bi, back, { name: back.name.replace(/box back$/, 'box back (left)'), box: { ...K, u1: cuN - nw / 2 }, note });
              clonePart(scene, bi, back, { name: back.name.replace(/box back$/, 'box back (right)'), box: { ...K, u0: cuN + nw / 2 }, note });
              [bot, back].forEach((q) => { bi.parts = bi.parts.filter((z) => z !== q); scene.parts = scene.parts.filter((z) => z !== q); });
            }
          }
        }
      }
      /* ---- above the vanity: the mirror on the cabinet doors, a frameless LED mirror, or nothing ---- */
      if (u.above === 'cabinet' && wi) {
        const doors = wi.parts.filter((q) => q.kind === 'door' && q.anim && q.anim.k === 'door');
        doors.forEach((dp) => {
          const b = dp.box;
          addPart(scene, wi, { kind: 'glass', mirror: true, name: 'Mirror 5 mm', mat: 'Glass', ptype: 'glass', slot: 'glass', view: 'front', noMap: true, anim: dp.anim, edges: [], note: 'Polished edge', box: { u0: b.u0 + 15, u1: b.u1 - 15, y0: b.y0 + 15, y1: b.y1 - 15, d0: b.d1, d1: b.d1 + 5 } });
          mirrorM2Parts += 1;
        });
        const R = { u0: wi.fu0 + 30, u1: wi.fu0 + wi.W - 30, y0: wallY0 + 30, y1: wallY0 + wi.H - 30 };
        if (p.mirrorLed !== 'off') { ledSet(scene, wi, R, p, p.mirrorLed, g.wallD + dt + 6); ledLen += (2 * (R.u1 - R.u0) + 2 * (R.y1 - R.y0)) / 1000; }
      } else if (u.above === 'ledmirror') {
        const mw = Math.max(300, bi.W - 120); const mh = p.mirrorH; const mu0 = bi.fu0 + (bi.W - mw) / 2;
        addPart(scene, bi, { kind: 'glass', mirror: true, name: 'LED mirror 5 mm', mat: 'Glass', ptype: 'glass', slot: 'glass', row: 'wall', view: 'front', edges: [], note: 'Polished edge, wall mounted', box: { u0: mu0, u1: mu0 + mw, y0: wallY0, y1: wallY0 + mh, d0: 12, d1: 17 } });
        mirrorM2Parts += 1;
        const R = { u0: mu0, u1: mu0 + mw, y0: wallY0, y1: wallY0 + mh };
        if (p.mirrorLed !== 'off') { ledSet(scene, bi, R, p, p.mirrorLed, 17); ledLen += (2 * mw + 2 * mh) / 1000; }
        hwRows.push({ k: 'mirrorHang', en: 'LED mirror hanging cleat + switch', ar: 'حامل تعليق مرآة LED مع مفتاح', qty: 1 });
      }
    }
  });
  if (ledLen > 0) {
    hwRows.push({ k: 'ledStrip', en: 'LED strip (per metre)', ar: 'شريط LED (للمتر)', qty: Math.ceil(ledLen) });
    hwRows.push({ k: 'ledDriver', en: 'LED driver 12 V', ar: 'محوّل LED ١٢ فولت', qty: 1 });
  }
  void basinsDone; void notchN; void mirrorM2Parts; void clr; void x; void r1;
  const hw = (bom) => [
    ...hwRows,
    { k: 'edgeBand', en: `${EDGE_NAME[p.edgeBand]} (m)`, ar: `شريط حواف (م) - ${p.edgeBand === 'pvc' ? 'PVC مقاوم للماء ٢ مم' : p.edgeBand === 'abs' ? 'ABS ١ مم' : 'قشرة ٠٫٦ مم'}`, qty: Math.ceil(bom.edgeMetres) },
  ];
  return { hw };
}

/* ---- rules / warnings -------------------------------------------------------------------------------------------------------------------- */
function rules(d, out) {
  const { p } = d; const w = [];
  const add = (id, en, ar) => w.push({ id, en, ar });
  const N = p.basins === 'double' ? 2 : p.basins === 'single' ? 1 : 0;
  const first = d.units.find((u) => u.type === 'vanity');
  if (N && !first) add('no-vanity', 'A basin needs a vanity unit - add one in the Units tab.', 'الحوض يحتاج وحدة حوض - أضفها من تبويب الوحدات.');
  if (N && first) {
    const need = N * p.basinW + 70 + (N > 1 ? 40 : 0);
    if (first.w < need) add('basin-fit', `${N === 2 ? 'Two basins of' : 'The basin of'} ${p.basinW} mm need a vanity at least ${need} mm wide (this one is ${first.w} mm) - the basin is drawn narrower.`, `${N === 2 ? 'حوضان بعرض' : 'الحوض بعرض'} ${p.basinW} مم يحتاجان وحدة بعرض ${need} مم على الأقل (هذه ${first.w} مم) - رُسم الحوض أضيق.`);
    if (N === 2 && first.w < 1000) add('double-min', 'A double basin needs a vanity of 1000 mm or more.', 'الحوض المزدوج يحتاج وحدة ١٠٠٠ مم أو أكثر.');
    if (p.basinD > p.depth + p.overhang + d.x.doorThk - 110) add('basin-depth', `Basin depth ${p.basinD} mm leaves less than 50 mm behind it for the tap and less than 60 mm at the front: it is drawn shorter. Use a deeper vanity.`, `عمق الحوض ${p.basinD} مم لا يترك ٥٠ مم خلفه للخلاط و٦٠ مم أمامه: رُسم أقصر. استخدم وحدة أعمق.`);
    if (first.front !== 'doors' && !p.plumbDrawer && p.basinType !== 'vessel') add('trap-clash', 'The drawer under the basin is not notched - the trap and pipes will hit the drawer box. Turn on the U-shaped top drawer.', 'الدرج تحت الحوض بدون فتحة - السيفون والمواسير ستصطدم بصندوق الدرج. فعّل الدرج العلوي بشكل U.');
    if (first.front !== 'doors' && p.plumbDrawer && p.basinType !== 'vessel') {
      const room = p.topDrawerH - 20 - (Math.max(0, p.bowlD - p.topThk - 20 + 10)) - 60;
      if (first.front === 'combo' && room < 0) add('bowl-deep', `The ${p.bowlD} mm bowl leaves no room for a drawer box in a ${p.topDrawerH} mm top drawer - raise the top drawer front or use a shallower bowl.`, `وعاء ${p.bowlD} مم لا يترك مكانًا لصندوق الدرج في واجهة علوية ${p.topDrawerH} مم - ارفع الواجهة أو استخدم وعاءً أقل عمقًا.`);
    }
    if (p.notchW > first.w - 2 * d.x.board - 2 * d.x.drawerSide - 60) add('notch-w', 'The plumbing notch is wider than the drawer allows: it is drawn narrower.', 'فتحة السباكة أعرض مما يسمح به الدرج: رُسمت أضيق.');
    const tap = TAP_H[p.faucet === 'wall' ? 'wall' : p.basinType === 'vessel' ? 'vessel' : 'deck'];
    if (d.units.some((u) => u.above === 'cabinet') && p.mirrorGap < tap + 60) add('tap-clash', `A mirror cabinet ${p.mirrorGap} mm above the top is too close to a ${tap} mm tap - raise the cabinet to at least ${tap + 60} mm.`, `خزانة مرآة على ارتفاع ${p.mirrorGap} مم قريبة جدًا من خلاط ${tap} مم - ارفعها إلى ${tap + 60} مم على الأقل.`);
  }
  if (p.vanityH < 780 || p.vanityH > 920) add('vanity-h', `A vanity top ${p.vanityH} mm high is outside the usual 800-900 mm.`, `سطح بارتفاع ${p.vanityH} مم خارج المعتاد ٨٠٠-٩٠٠ مم.`);
  if (p.boardType === 'standard') add('board-wet', 'Standard MDF swells in a wet room. Choose MR, HMR or marine plywood.', 'اللوح العادي ينتفخ في الأماكن الرطبة. اختر MR أو HMR أو خشبًا بحريًا.');
  if (p.edgeBand === 'veneer') add('edge-wet', 'A wood veneer edge lets water in. Use PVC or ABS edge band in a bathroom.', 'قشرة الخشب تسمح بدخول الماء. استخدم شريط PVC أو ABS في الحمام.');
  if (p.mount === 'wall') {
    const wide = d.units.find((u) => u.type === 'vanity' && u.w > 1000);
    if (wide) add('wall-load', `A wall-hung vanity ${wide.w} mm wide with a stone top is heavy: use two rails and a solid wall (blockwork or backing board), never plasterboard alone.`, `وحدة معلّقة بعرض ${wide.w} مم مع سطح حجري ثقيلة: استخدم سكتين وجدارًا صلبًا وليس جبسًا فقط.`);
    if (d.units.some((u) => u.type === 'tall') && p.columnH > 1600) add('wall-tall', 'A wall-hung tall column must be fixed to a solid wall with two rails.', 'العمود الطويل المعلّق يجب تثبيته بجدار صلب بسكتين.');
  }
  if (out && out.scene && d.units.some((u) => u.type === 'tall') && p.columnH < p.vanityH + 200) add('tall-low', 'The tall column is barely higher than the vanity.', 'العمود الطويل بالكاد أعلى من الوحدة.');
  return w;
}

/* ---- presets --------------------------------------------------------------------------------------------------------------------------- */
const UN = (id, type, w, o) => ({ id, type, w, ...o });
const PRESETS = [
  { id: 'wall800', en: 'Wall-hung 800 + mirror cabinet', ar: 'معلّقة ٨٠٠ مع خزانة مرآة', make: () => ({ units: [UN('u1', 'vanity', 800, { front: 'combo', above: 'cabinet' }), UN('u2', 'tall', 400)], p: {} }) },
  { id: 'double1400', en: 'Double vanity 1400 + LED mirror', ar: 'وحدة مزدوجة ١٤٠٠ مع مرآة LED', make: () => ({ units: [UN('u1', 'vanity', 1400, { front: 'drawers', drawers: 2, above: 'ledmirror' }), UN('u2', 'tall', 400)], p: { basins: 'double', basinType: 'under', mirrorH: 800, top: 'marble' } }) },
  { id: 'floor900', en: 'Floor-standing 900 + column + niche', ar: 'أرضية ٩٠٠ مع عمود وفتحة', make: () => ({ units: [UN('u1', 'vanity', 900, { front: 'doors', above: 'cabinet' }), UN('u2', 'niche', 400, { shelves: 3 }), UN('u3', 'tall', 400)], p: { mount: 'floor', foot: 'plinth', top: 'laminate', basinType: 'top' } }) },
  { id: 'powder500', en: 'Guest powder room 500 (vessel basin)', ar: 'حمام ضيوف ٥٠٠ (حوض وعاء)', make: () => ({ units: [UN('u1', 'vanity', 600, { front: 'doors', above: 'ledmirror' })], p: { basinType: 'vessel', basinW: 400, basinD: 340, bowlD: 140, faucet: 'deck', mirrorH: 600, top: 'oakslab', depth: 380 } }) },
  { id: 'family', en: 'Family run: column + double 1200 + niche', ar: 'تشكيلة عائلية: عمود + مزدوجة ١٢٠٠ + فتحة', make: () => ({ units: [UN('u1', 'tall', 450), UN('u2', 'vanity', 1200, { front: 'combo', above: 'cabinet' }), UN('u3', 'niche', 350, { shelves: 4 }), UN('u4', 'wallcab', 450, { doors: 1, shelves: 2 })], p: { basins: 'double', basinType: 'top', mount: 'floor', foot: 'legs', top: 'granite' } }) },
];

/* ---- price (every rate is a PLACEHOLDER until the owner supplies the bathroom price list) ------------------------------------------------- */
const UPLIFT = { standard: 1, mr: 1.25, hmr: 1.45, marine: 1.9 };
const PRICE = {
  topName: ['Vanity top', 'سطح الحوض'],
  rates: {
    board: { Carcass: 6.5, Back: 2.8, Shelf: 6.5, Door: 11, Drawer: 6, Plinth: 4.5, Glass: 22 },
    top: { quartz: 85, marble: 105, granite: 78, laminate: 26, oakslab: 70 },
    edge: 0.9, wastePct: 0.12, labourPct: 0.35, marginPct: 0.2,
    hw: { hinge: 0.9, plate: 0.3, runner: 5.5, handleBar: 1.5, handleKnob: 1, handleProfile: 4, pin: 0.04, minifix: 0.25, cam: 0.2, dowel: 0.03, leg: 0.8, bracket: 7.5, basinCut: 6, ledStrip: 9, ledDriver: 12, mirrorHang: 6 },
  },
  adjust(d, r) {
    const up = UPLIFT[d.p.boardType] || 1;
    return { ...r, board: Object.fromEntries(Object.entries(r.board).map(([k, v]) => [k, k === 'Glass' ? v : Math.round(v * up * 100) / 100])), edge: { pvc: 0.9, abs: 0.6, veneer: 0.5 }[d.p.edgeBand] };
  },
  extra: (out) => {
    const lines = []; const p = out.d.p;
    if (p.basins !== 'none' && out.d.units.some((u) => u.type === 'vanity')) lines.push({ k: 'plumbing', en: 'Plumbing notch work (per U-drawer)', ar: 'تجهيز فتحة السباكة (لكل درج U)', qty: out.scene.parts.filter((q) => /bottom \(front\)$/.test(q.name)).length, unit: 'pcs', rate: 4 });
    return lines;
  },
};

/* ---- assistant vocabulary --------------------------------------------------------------------------------------------------------------- */
const ASSISTANT = {
  greet: ['design your bathroom cabinets. Tell me the vanity width, wall-hung or floor standing, one or two basins, the mirror and the tall column — or change one unit. Every change is shown for review before it is applied, and Undo brings the previous design back.', 'وهساعدك تصمم خزائن حمامك. اوصفلي عرض الوحدة ومعلّقة أو أرضية وحوض أو اثنين والمرآة والعمود الطويل — أو غيّر وحدة واحدة. كل تغيير يُعرض للمراجعة قبل التطبيق، وزر التراجع يرجّع التصميم السابق.'],
  examples: { en: ['wall-hung vanity 1200 with double basin', 'floor standing on legs', 'undermount basin', 'vessel basin', 'LED mirror', 'mirror cabinet', 'moisture resistant board', 'quartz top', 'unit 1 width 1000', 'add tall column', 'show 3d', 'x-ray', 'open doors', 'daylight'], ar: ['وحدة معلقة ١٢٠٠ بحوضين', 'أرضية على أرجل', 'حوض تحت السطح', 'حوض وعاء', 'مرآة LED', 'خزانة مرآة', 'لوح مقاوم للرطوبة', 'سطح كوارتز', 'وحدة ١ عرض ١٠٠٠', 'أضف عمود طويل', 'اعرض ثلاثي الأبعاد', 'أشعة', 'افتح الأبواب', 'ضوء النهار'] },
  nums: [
    { re: /\b(vanity )?height|ارتفاع الوحدة/, key: 'vanityH' }, { re: /\bdepth|عمق/, key: 'depth' }, { re: /basin width|عرض الحوض/, key: 'basinW' }, { re: /bowl( depth)?|عمق الوعاء/, key: 'bowlD' },
    { re: /clearance|floor gap|فراغ/, key: 'hangGap' }, { re: /mirror (height|cabinet height)|ارتفاع المرآة/, key: 'mirrorH' }, { re: /column height|ارتفاع العمود/, key: 'columnH' }, { re: /top thickness|سماكة السطح/, key: 'topThk' },
  ],
  words: [
    { re: /double (basin|sink)|حوضين|حوض مزدوج|بحوضين/, set: { basins: 'double' } }, { re: /single (basin|sink)|حوض مفرد|حوض واحد/, set: { basins: 'single' } }, { re: /no (basin|sink)|بدون حوض/, set: { basins: 'none' } },
    { re: /undermount|under-mount|تحت السطح/, set: { basinType: 'under' } }, { re: /top[- ]?mount|فوق السطح/, set: { basinType: 'top' } }, { re: /vessel|وعاء/, set: { basinType: 'vessel' } },
    { re: /wall[- ]?hung|floating|wall mounted|معلق|معلّق/, set: { mount: 'wall' } }, { re: /floor[ -]?standing|on legs|أرضي|أرضية/, set: { mount: 'floor' } }, { re: /plinth|قاعدة/, set: { mount: 'floor', foot: 'plinth' } },
    { re: /\blegs\b|أرجل/, set: { mount: 'floor', foot: 'legs' } },
    { re: /led mirror|مرآة led|مراة led/, unitSet: { above: 'ledmirror' } }, { re: /mirror cabinet|خزانة مرآة|خزانة مراة/, unitSet: { above: 'cabinet' } }, { re: /open shelf above|رف مفتوح فوق/, unitSet: { above: 'shelf' } },
    { re: /no led|led off|بدون led/, set: { mirrorLed: 'off' } }, { re: /backlit|halo|توهج/, set: { mirrorLed: 'back' } }, { re: /led frame|إطار led/, set: { mirrorLed: 'frame' } },
    { re: /\b(mr|moisture[- ]resistant)\b|مقاوم للرطوبة/, set: { boardType: 'mr' } }, { re: /\bhmr\b/, set: { boardType: 'hmr' } }, { re: /marine/, set: { boardType: 'marine' } },
    { re: /pvc/, set: { edgeBand: 'pvc' } }, { re: /\babs\b/, set: { edgeBand: 'abs' } },
    { re: /quartz|كوارتز/, set: { top: 'quartz' } }, { re: /marble|رخام/, set: { top: 'marble' } }, { re: /granite|جرانيت/, set: { top: 'granite' } }, { re: /laminate|لامينيت/, set: { top: 'laminate' } },
    { re: /wall tap|wall spout|خلاط جداري/, set: { faucet: 'wall' } }, { re: /deck tap|خلاط على السطح/, set: { faucet: 'deck' } },
  ],
  addWords: [{ re: /tall (column|unit)|عمود طويل/, type: 'tall' }, { re: /vanity|وحدة حوض/, type: 'vanity' }, { re: /niche|فتحة مفتوحة/, type: 'niche' }, { re: /wall cabinet|خزانة جدارية/, type: 'wallcab' }],
};

export const BATHROOM = {
  id: 'bathroom', menuId: 'neo-bathroom', storageKey: 'neo_cat_bathroom_v1',
  app: ['Neo Bathroom Designer', 'مصمم حمامات نيو'], noun: ['Bathroom cabinets', 'خزائن الحمام'], unitNoun: ['unit', 'وحدة'], defaultTitle: ['My Bathroom', 'حمامي'], file: 'bathroom',
  layoutLabel: ['Bathroom run', 'تشكيلة حمام'], icon: '🛁', single: ['bathroom', 'حمام'],
  unitTypes: UNIT_TYPES, params: PARAMS, presets: PRESETS,
  x: { board: 18, back: 8, finishKey: 'white' },
  names: { counter: ['Vanity top', 'سطح الحوض'], splash: ['Back splash', 'باكسبلاش'] },
  legend: { keys: ['baseUnit', 'wallUnit', 'door', 'drawer', 'glass', 'open', 'shelf', 'counter', 'plinth'], names: { baseUnit: ['Vanity / column', 'وحدة / عمود'], glass: ['Mirror', 'مرآة'] } },
  slotRows: [
    { k: 'structure', en: 'Structure', ar: 'الهيكل' }, { k: 'shelves', en: 'Shelves', ar: 'الرفوف' }, { k: 'back', en: 'Back', ar: 'الظهر' }, { k: 'baseDoors', en: 'Doors', ar: 'الأبواب' },
    { k: 'glass', en: 'Mirror', ar: 'المرآة' }, { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج' }, { k: 'drawers', en: 'Drawer boxes', ar: 'صناديق الأدراج' }, { k: 'plinth', en: 'Plinth', ar: 'القاعدة' },
    { k: 'countertop', en: 'Vanity top', ar: 'سطح الحوض' }, { k: 'handles', en: 'Handles', ar: 'المقابض' },
  ],
  tabs: [
    { id: 'sink', icon: 'counter', en: 'Sink & plumbing', ar: 'الحوض والسباكة', cards: [
      { en: 'Basin', ar: 'الحوض', keys: ['basins', 'basinType', 'basinW', 'basinD', 'bowlD', 'faucet'], note: ['Basins are fitted in the first vanity. Top-mount sits on the top, undermount hangs below it, a vessel basin stands on it.', 'تُركّب الأحواض في أول وحدة حوض. فوق السطح يجلس على الطاولة، وتحت السطح يتدلى أسفلها، والوعاء يقف فوقها.'] },
      { en: 'Plumbing clearance', ar: 'فراغ السباكة', keys: ['plumbDrawer', 'notchW', 'notchD', 'topDrawerH'], note: ['The top drawer gets a U-shaped bottom and back around the trap, and its box is lowered under the bowl. All parts are in the cut list.', 'الدرج العلوي يحصل على قاع وظهر بشكل U حول السيفون وينخفض صندوقه تحت الوعاء. كل القطع في قائمة القص.'] },
    ] },
    { id: 'top', icon: 'plinth', en: 'Top', ar: 'السطح', cards: [{ en: 'Countertop', ar: 'سطح الطاولة', keys: ['top', 'topThk', 'overhang', 'splashH'] }] },
    { id: 'mirror', icon: 'look', en: 'Mirror & light', ar: 'المرآة والإضاءة', cards: [{ en: 'Mirror cabinet / LED mirror', ar: 'خزانة المرآة / مرآة LED', keys: ['mirrorH', 'mirrorGap', 'wallD', 'mirrorLed', 'ledOn'], note: ['Choose what sits above each vanity in the Units tab: a mirror cabinet, a frameless LED mirror or an open shelf.', 'اختر ما يوضع فوق كل وحدة من تبويب الوحدات: خزانة مرآة أو مرآة LED بلا إطار أو رف مفتوح.'] }] },
  ],
  globalCards: [
    { en: 'Vanity size & mounting', ar: 'حجم الوحدة والتركيب', keys: ['depth', 'vanityH', 'mount', 'hangGap', 'foot', 'legH', 'plinthH', 'columnH', 'columnD'] },
  ],
  msCards: [{ en: 'Moisture-resistant materials', ar: 'مواد مقاومة للرطوبة', keys: ['boardType', 'edgeBand'], note: ['The board and the edge band name the production materials in the cut list (you can still type your own names below). Rates follow the choice.', 'اللوح وشريط الحواف يسميان مواد الإنتاج في قائمة القص (ويمكنك كتابة أسمائك أدناه). الأسعار تتبع الاختيار.'] }],
  matNames: (d) => ({ structure: BOARD_NAME[d.p.boardType], shelves: BOARD_NAME[d.p.boardType], back: 'Back board 8 mm (waterproof)', baseDoors: BOARD_NAME[d.p.boardType], drawers: BOARD_NAME[d.p.boardType], plinth: BOARD_NAME[d.p.boardType] }),
  toKitchen, decorate, rules, price: PRICE, assistant: ASSISTANT,
  hwNames: EDGE_NAME, boardNamesAr: AR_UP,
};

registerProduct('bathroom', {
  app: BATHROOM.app, noun: BATHROOM.noun, file: 'bathroom', layoutLabel: { straight: ['Bathroom run', 'تشكيلة حمام'], 'l-left': ['L-run', 'تشكيلة L'], 'l-right': ['L-run', 'تشكيلة L'], u: ['U-run', 'تشكيلة U'] },
  legend: BATHROOM.legend, worktop: ['Top', 'السطح'], runNames: { main: ['Main run', 'الصف الرئيسي'] },
  propsNote: ['Basins, taps, rails and LED strips in OBJ / STL / 3DM. Display only: never in the cut list or the price.', 'الأحواض والخلاطات والسكك وشرائط LED في OBJ / STL / 3DM. للعرض فقط: ليست في قائمة القص أو السعر.'],
});
registerArabicNames([
  [/Mirror cabinet/g, 'خزانة مرآة'], [/LED mirror 5 mm/g, 'مرآة LED ٥ مم'], [/Mirror 5 mm/g, 'مرآة ٥ مم'], [/Tall column/g, 'عمود طويل'], [/Open niche/g, 'فتحة مفتوحة'], [/Wall cabinet/g, 'خزانة جدارية'], [/Vanity top/g, 'سطح الحوض'], [/Back splash/g, 'باكسبلاش'], [/\bVanity\b/g, 'وحدة حوض'],
  [/bottom \(front\)/g, 'قاع (أمامي)'], [/bottom \(rear left\)/g, 'قاع (خلفي يسار)'], [/bottom \(rear right\)/g, 'قاع (خلفي يمين)'], [/box back \(left\)/g, 'خلف الصندوق (يسار)'], [/box back \(right\)/g, 'خلف الصندوق (يمين)'],
]);
registerArabicNotes([[/Plumbing notch (\d+) x (\d+)/g, 'فتحة سباكة $1 × $2'], [/Polished edge, wall mounted/g, 'حافة مصقولة، تركيب جداري'], [/Polished edge/g, 'حافة مصقولة'], [/Undermount basin cut-out/g, 'فتحة حوض تحت السطح'], [/Basin cut-out/g, 'فتحة حوض'], [/Drain cut-out/g, 'فتحة تصريف']]);

export default BATHROOM;
