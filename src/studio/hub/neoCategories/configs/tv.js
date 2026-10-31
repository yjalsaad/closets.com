/* =============================================================================
 * Neo TV Unit Designer [NEO-CATEGORIES-UX26] - TV units in the generic Neo category studio.
 *   units : media console (doors / drawers / open) with the TV niche above it, AV shelf unit (open, glass or vented door), electric fireplace unit,
 *           side tower, wall shelf
 *   tabs  : Global | M&S | Units | TV & niche | Wall panel & LED | Hardware | Price
 * The TV size (inches) drives the niche: niche width = TV width + 2 x (side clearance + board), niche height = TV height + clearances (+ a soundbar).
 * The back wall panel (with vertical slats and an LED backlight), cable grommet holes, a floating or floor-standing unit and the wall-hung depth are
 * parameters; the panel, the slats and the holes are real cut-list parts and notes.
 * ===========================================================================*/
import { baseG, assemble, leafCount } from '../categoryModel';
import { registerProduct } from '../../neoKitchen/productInfo';
import { registerArabicNames, registerArabicNotes } from '../../neoKitchen/cutlist';
import { addPart, addProp, addLed, markNiche, findInst, frameBoxes, setPlinthParts, plinthSpans } from '../categoryKit';

const sp = (o) => o;
const kw = (re) => re;
export const PARAMS = [
  /* TV & niche */
  sp({ k: 'tvSize', t: 'num', unit: 'in', min: 32, max: 98, step: 1, def: 65, en: 'TV size (diagonal)', ar: 'مقاس التلفاز (القطر)', quick: [[43, '43"', '٤٣"'], [55, '55"', '٥٥"'], [65, '65"', '٦٥"'], [75, '75"', '٧٥"'], [85, '85"', '٨٥"']], help: ['16:9. The niche is sized from the real width and height of the screen.', '١٦:٩. تُحسب الفتحة من العرض والارتفاع الحقيقيين للشاشة.'] }),
  sp({ k: 'tvMount', t: 'seg', def: 'wall', opts: [['wall', 'Wall bracket (niche)', 'حامل جداري (فتحة)'], ['stand', 'On the unit (stand)', 'على الوحدة (قاعدة)']], en: 'TV mounting', ar: 'تركيب التلفاز' }),
  sp({ k: 'sideClear', t: 'num', min: 20, max: 200, step: 5, def: 80, en: 'Clearance each side of the TV', ar: 'الفراغ على جانبي التلفاز', when: (c) => c.p.tvMount === 'wall', why: ['Only for a wall-mounted TV in a niche.', 'للتلفاز المعلّق في فتحة فقط.'] }),
  sp({ k: 'topClear', t: 'num', min: 30, max: 300, step: 5, def: 90, en: 'Clearance above the TV (air)', ar: 'الفراغ فوق التلفاز (هواء)', when: (c) => c.p.tvMount === 'wall', why: ['Only for a wall-mounted TV in a niche.', 'للتلفاز المعلّق في فتحة فقط.'] }),
  sp({ k: 'bottomClear', t: 'num', min: 0, max: 200, step: 5, def: 30, en: 'Clearance below the TV', ar: 'الفراغ تحت التلفاز', when: (c) => c.p.tvMount === 'wall', why: ['Only for a wall-mounted TV in a niche.', 'للتلفاز المعلّق في فتحة فقط.'] }),
  sp({ k: 'nicheD', t: 'num', min: 80, max: 300, step: 10, def: 160, en: 'Niche depth (wall-hung depth)', ar: 'عمق الفتحة (العمق المعلّق)', when: (c) => c.p.tvMount === 'wall', why: ['Only for a wall-mounted TV in a niche.', 'للتلفاز المعلّق في فتحة فقط.'], help: ['The TV needs about 115 mm behind its front for the bracket.', 'يحتاج التلفاز نحو ١١٥ مم خلف واجهته للحامل.'] }),
  sp({ k: 'nicheGap', t: 'num', min: 0, max: 600, step: 10, def: 120, en: 'Gap: unit top to the niche', ar: 'الفراغ بين أعلى الوحدة والفتحة', when: (c) => c.p.tvMount === 'wall', why: ['Only for a wall-mounted TV in a niche.', 'للتلفاز المعلّق في فتحة فقط.'] }),
  sp({ k: 'soundbar', t: 'seg', def: 'below', opts: [['none', 'None', 'بدون'], ['below', 'Below the TV', 'تحت التلفاز'], ['unit', 'On the unit', 'على الوحدة']], en: 'Soundbar', ar: 'مكبر الصوت (ساوندبار)' }),
  sp({ k: 'sbH', t: 'num', min: 50, max: 140, step: 5, def: 70, en: 'Soundbar height', ar: 'ارتفاع الساوندبار', when: (c) => c.p.soundbar !== 'none', why: ['No soundbar.', 'بدون ساوندبار.'] }),
  /* Unit */
  sp({ k: 'mount', t: 'seg', def: 'floating', opts: [['floating', 'Floating (wall-hung)', 'معلّقة'], ['floor', 'Floor standing', 'أرضية']], en: 'Media unit', ar: 'وحدة الوسائط' }),
  sp({ k: 'floatH', t: 'num', min: 100, max: 700, step: 10, def: 300, en: 'Floor clearance (floating)', ar: 'الفراغ تحت الوحدة (معلّقة)', when: (c) => c.p.mount === 'floating', why: ['Only for a floating unit.', 'للوحدة المعلّقة فقط.'] }),
  sp({ k: 'foot', t: 'seg', def: 'legs', opts: [['legs', 'Legs', 'أرجل'], ['plinth', 'Plinth', 'قاعدة']], en: 'Floor standing on', ar: 'الوقوف على', when: (c) => c.p.mount === 'floor', why: ['Choose Floor standing first.', 'اختر أرضية أولًا.'] }),
  sp({ k: 'legH', t: 'num', min: 80, max: 250, step: 10, def: 120, en: 'Leg / plinth height', ar: 'ارتفاع الأرجل / القاعدة', when: (c) => c.p.mount === 'floor', why: ['Choose Floor standing first.', 'اختر أرضية أولًا.'] }),
  sp({ k: 'unitH', t: 'num', min: 250, max: 700, step: 10, def: 400, en: 'Media unit height (with its top)', ar: 'ارتفاع وحدة الوسائط (مع السطح)' }),
  sp({ k: 'unitD', t: 'num', min: 250, max: 550, step: 10, def: 380, en: 'Unit depth', ar: 'عمق الوحدة' }),
  sp({ k: 'topThk', t: 'num', min: 18, max: 50, step: 2, def: 30, en: 'Top board thickness', ar: 'سماكة لوح السطح' }),
  sp({ k: 'towerH', t: 'num', min: 1200, max: 2600, step: 50, def: 2000, en: 'Side tower height (from the floor)', ar: 'ارتفاع الأبراج الجانبية (من الأرض)' }),
  sp({ k: 'towerD', t: 'num', min: 200, max: 550, step: 10, def: 320, en: 'Side tower depth', ar: 'عمق الأبراج الجانبية' }),
  sp({ k: 'top', t: 'seg', def: 'oakslab', opts: [['oakslab', 'Solid oak', 'بلوط صلب'], ['laminate', 'Laminate', 'لامينيت'], ['marble', 'Marble', 'رخام'], ['granite', 'Granite', 'جرانيت'], ['quartz', 'Quartz', 'كوارتز']], en: 'Top material', ar: 'مادة السطح' }),
  /* Wall panel */
  sp({ k: 'panel', t: 'tog', def: true, en: 'Back wall panel', ar: 'لوح الجدار الخلفي' }),
  sp({ k: 'panelH', t: 'num', min: 1200, max: 2800, step: 50, def: 2200, en: 'Panel top (from the floor)', ar: 'أعلى اللوح (من الأرض)', when: (c) => c.p.panel, why: ['Turn on the back wall panel.', 'فعّل لوح الجدار الخلفي.'] }),
  sp({ k: 'panelThk', t: 'num', min: 12, max: 40, step: 2, def: 18, en: 'Panel board thickness', ar: 'سماكة لوح الجدار', when: (c) => c.p.panel, why: ['Turn on the back wall panel.', 'فعّل لوح الجدار الخلفي.'] }),
  sp({ k: 'slats', t: 'tog', def: true, en: 'Vertical slats', ar: 'شرائح عمودية', when: (c) => c.p.panel, why: ['Turn on the back wall panel.', 'فعّل لوح الجدار الخلفي.'] }),
  sp({ k: 'slatZone', t: 'seg', def: 'sides', opts: [['sides', 'Beside the niche', 'بجانب الفتحة'], ['full', 'Whole panel', 'اللوح كاملًا']], en: 'Slats cover', ar: 'تغطي الشرائح', when: (c) => c.p.panel && c.p.slats, why: ['Turn on the panel and the slats.', 'فعّل اللوح والشرائح.'] }),
  sp({ k: 'slatW', t: 'num', min: 20, max: 80, step: 2, def: 40, en: 'Slat width', ar: 'عرض الشريحة', when: (c) => c.p.panel && c.p.slats, why: ['Turn on the panel and the slats.', 'فعّل اللوح والشرائح.'] }),
  sp({ k: 'slatGap', t: 'num', min: 5, max: 40, step: 1, def: 15, en: 'Gap between slats', ar: 'الفراغ بين الشرائح', when: (c) => c.p.panel && c.p.slats, why: ['Turn on the panel and the slats.', 'فعّل اللوح والشرائح.'] }),
  sp({ k: 'slatT', t: 'num', min: 10, max: 30, step: 2, def: 18, en: 'Slat thickness', ar: 'سماكة الشريحة', when: (c) => c.p.panel && c.p.slats, why: ['Turn on the panel and the slats.', 'فعّل اللوح والشرائح.'] }),
  sp({ k: 'led', t: 'seg', def: 'niche', opts: [['off', 'No LED', 'بدون LED'], ['niche', 'Niche backlight', 'إضاءة الفتحة'], ['under', 'Under the unit', 'أسفل الوحدة'], ['both', 'Both', 'الاثنان']], en: 'LED lighting', ar: 'إضاءة LED' }),
  sp({ k: 'ledOn', t: 'tog', def: true, en: 'LED light on', ar: 'تشغيل إضاءة LED', when: (c) => c.p.led !== 'off', why: ['Choose an LED option first.', 'اختر خيار LED أولًا.'] }),
  /* Cables */
  sp({ k: 'cableHoles', t: 'step', min: 0, max: 6, def: 2, kw: kw(/cable holes?|grommets?|ثقوب الكابلات|فتحات كابلات/), en: 'Cable grommet holes', ar: 'فتحات الكابلات' }),
  sp({ k: 'holeD', t: 'num', min: 40, max: 80, step: 2, def: 60, en: 'Grommet hole diameter', ar: 'قطر فتحة الكابل', when: (c) => c.p.cableHoles > 0, why: ['No cable holes.', 'بدون فتحات كابلات.'] }),
  sp({ k: 'cableDuct', t: 'tog', def: true, en: 'Cable duct behind the TV', ar: 'مجرى كابلات خلف التلفاز' }),
  /* Materials */
  sp({ k: 'boardType', t: 'seg', def: 'mdf', opts: [['mdf', 'MDF 18 mm', 'MDF ١٨ مم'], ['ply', 'Birch plywood', 'أبلكاش بتولا'], ['mr', 'MR board', 'MR']], en: 'Board', ar: 'اللوح' }),
];

const BOARD_NAME = { mdf: 'MDF 18 mm (lacquer grade)', ply: 'Birch plywood 18 mm', mr: 'MR board 18 mm' };
const UPLIFT = { mdf: 1, ply: 1.6, mr: 1.2 };
const IN = 25.4;
const HOLDER = ['media', 'fire']; // units a TV niche (or a TV stand) belongs to
/** screen size from the diagonal (16:9) in mm */
export const tvDims = (inches) => ({ w: Math.round(inches * IN * 0.8716), h: Math.round(inches * IN * 0.4903) });
export const nicheNeed = (p, board = 18) => { const t = tvDims(p.tvSize); return { w: t.w + 2 * (p.sideClear + board), h: t.h + p.bottomClear + p.topClear + 2 * board + (p.soundbar === 'below' ? p.sbH + 20 : 0) }; };
export const clearance = (p) => (p.mount === 'floating' ? p.floatH : p.legH);

/** the TV niche above a console: exactly as wide as the TV needs, centred; the rest of the column's width (a pad each side) is left for the wall panel and slats */
const nicheUnits = (u, c, need) => {
  if (!u.tvAbove || c.p.tvMount !== 'wall') return null;
  const nw = Math.min(u.w, Math.max(300, need.w)); const pad = Math.floor((u.w - nw) / 2);
  const niche = c.U(nw, [c.S('open', 0, { shelves: 0 })], { h: need.h });
  if (pad < 1) return [{ ...niche, w: u.w }];
  const h = (k, w) => c.U(w, [c.S('open', 0, { shelves: 0 })], { hidden: true });
  return [h(0, pad), { ...niche, w: nw }, h(1, u.w - nw - pad)];
};

const UNIT_TYPES = {
  media: {
    en: 'Media console', ar: 'وحدة وسائط', wallEn: 'TV niche', wallAr: 'فتحة التلفاز', tag: 'M', w: { min: 600, max: 3200, def: 1800 },
    opts: [
      sp({ k: 'front', t: 'seg', def: 'doors', opts: [['doors', 'Doors', 'أبواب'], ['drawers', 'Drawers', 'أدراج'], ['open', 'Open', 'مفتوح']], en: 'Front', ar: 'الواجهة' }),
      sp({ k: 'drawers', t: 'step', min: 1, max: 3, def: 2, kw: kw(/drawers?|أدراج|ادراج|درج/), en: 'Drawers', ar: 'الأدراج', when: (c) => c.u.front === 'drawers', why: ['Front is not Drawers.', 'الواجهة ليست أدراجًا.'] }),
      sp({ k: 'shelves', t: 'step', min: 0, max: 3, def: 1, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves', ar: 'الرفوف', when: (c) => c.u.front !== 'drawers', why: ['Front is Drawers.', 'الواجهة أدراج.'] }),
      sp({ k: 'tvAbove', t: 'tog', def: true, en: 'TV niche above this unit', ar: 'فتحة التلفاز فوق هذه الوحدة' }),
    ],
    build(u, c) {
      const lv = leafCount(u.w, 700);
      const secs = [u.front === 'drawers' ? c.S('drawer', u.drawers) : u.front === 'open' ? c.S('open', Math.max(1, u.shelves)) : c.S('door', lv, { shelves: u.shelves, hinge: c.hinge(c.i) })];
      const need = nicheNeed(c.p, c.x.board);
      return { base: c.U(u.w, secs), wall: nicheUnits(u, c, need) };
    },
  },
  av: {
    en: 'AV shelf unit', ar: 'وحدة رفوف الأجهزة', tag: 'A', w: { min: 400, max: 1200, def: 600 },
    opts: [
      sp({ k: 'door', t: 'seg', def: 'open', opts: [['open', 'Open', 'مفتوح'], ['glass', 'Glass door', 'باب زجاج'], ['vented', 'Vented door', 'باب مفرغ']], en: 'Front', ar: 'الواجهة' }),
      sp({ k: 'shelves', t: 'step', min: 1, max: 4, def: 2, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves', ar: 'الرفوف' }),
      sp({ k: 'gear', t: 'tog', def: true, en: 'Show AV equipment', ar: 'إظهار أجهزة الصوت والصورة' }),
    ],
    build: (u, c) => ({ base: c.U(u.w, [u.door === 'open' ? c.S('open', u.shelves) : u.door === 'glass' ? c.S('glass', leafCount(u.w, 700), { shelves: u.shelves, hinge: c.hinge(c.i) }) : c.S('door', leafCount(u.w, 700), { shelves: u.shelves, hinge: c.hinge(c.i) })]) }),
  },
  fire: {
    en: 'Electric fireplace', ar: 'مدفأة كهربائية', tag: 'F', w: { min: 600, max: 1600, def: 1000 },
    opts: [sp({ k: 'flame', t: 'tog', def: true, en: 'Flame on', ar: 'تشغيل اللهب' }), sp({ k: 'tvAbove', t: 'tog', def: true, en: 'TV niche above this unit', ar: 'فتحة التلفاز فوق هذه الوحدة' })],
    wallEn: 'TV niche', wallAr: 'فتحة التلفاز',
    build: (u, c) => ({ base: c.U(u.w, [c.S('open', 0, { shelves: 0 })]), wall: nicheUnits(u, c, nicheNeed(c.p, c.x.board)) }),
  },
  tower: {
    en: 'Side tower', ar: 'برج جانبي', tag: 'T', w: { min: 300, max: 800, def: 450 },
    opts: [
      sp({ k: 'style', t: 'seg', def: 'mixed', opts: [['doors', 'Doors', 'أبواب'], ['open', 'Open shelves', 'رفوف مفتوحة'], ['mixed', 'Open + doors', 'مفتوح + أبواب']], en: 'Style', ar: 'النمط' }),
      sp({ k: 'shelves', t: 'step', min: 2, max: 8, def: 5, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves', ar: 'الرفوف' }),
      sp({ k: 'drawers', t: 'step', min: 0, max: 3, def: 1, kw: kw(/drawers?|أدراج|ادراج|درج/), en: 'Drawers (bottom)', ar: 'الأدراج (أسفل)' }),
    ],
    build(u, c) {
      const secs = [];
      if (u.style === 'doors') secs.push(c.S('door', leafCount(u.w, 600), { shelves: u.shelves, hinge: c.hinge(c.i) }));
      else if (u.style === 'open') secs.push(c.S('open', u.shelves));
      else { secs.push(c.S('open', Math.ceil(u.shelves / 2), { h: 720 })); secs.push(c.S('door', leafCount(u.w, 600), { shelves: Math.floor(u.shelves / 2), hinge: c.hinge(c.i) })); }
      if (u.drawers) secs.push(c.S('drawer', u.drawers, { shelves: 0, h: u.drawers * 200 }));
      return { base: c.U(u.w, secs, { type: 'tall', h: Math.max(900, c.p.towerH - c.g.plinthH), d: c.p.towerD }) };
    },
  },
  shelf: {
    en: 'Wall shelf', ar: 'رف جداري', tag: 'S', w: { min: 250, max: 1200, def: 500 },
    opts: [sp({ k: 'shelves', t: 'step', min: 1, max: 4, def: 2, kw: kw(/shel(?:f|ves)|رفوف|رف/), en: 'Shelves', ar: 'الرفوف' })],
    build: (u, c) => ({ wall: c.U(u.w, [c.S('open', u.shelves, { shelves: 0 })]) }),
  },
};

function toKitchen(d, { rules }) {
  const { p } = d; const x = d.x;
  const clr = clearance(p);
  const need = nicheNeed(p, x.board);
  const g = {
    ...baseG(d), plinthH: clr, baseH: Math.max(150, p.unitH - p.topThk), counterThk: p.topThk, overhang: 0, backsplashH: 0,
    baseD: p.unitD, wallD: p.tvMount === 'wall' ? p.nicheD : Math.max(200, p.nicheD), gap: p.nicheGap, wallH: need.h, edgeBand: 1,
  };
  const r = assemble(TV, d, g, { rules });
  r.model.counter = p.top;
  return { ...r, notes: [], g };
}

function decorate(scene, built, d) {
  const { p, x } = d; const { g } = built.model; const run = scene.runs[0];
  const hwRows = []; const D = g.baseD;
  const yBase1 = g.plinthH + g.baseH + g.counterThk; // top of the media unit
  const floating = p.mount === 'floating';
  scene.noFeet = floating || p.foot !== 'legs';
  run.plinth = null; // replaced by plinth boards at each unit's own depth (a floor plinth), or none (floating / legs)
  if (!floating && p.foot === 'plinth') setPlinthParts(scene, 'main', plinthSpans(run), { h: g.plinthH, setback: g.plinthSetback, board: g.board, D });
  const tv = tvDims(p.tvSize);
  const ledOn = p.ledOn; const ledMat = ledOn ? 'led' : 'dark';
  const find = (id) => { const f = id ? findInst(scene, id) : null; return f ? f.inst : null; };
  let standDone = false; let ledLen = 0; let vented = 0; let tvMid = null; let firstBase = null; let nicheInst = null;
  built.placed.forEach((pl) => {
    const bi = find(pl.ids.base); const wi = find(pl.ids.wall); const u = pl.unit;
    if (bi && !firstBase && pl.base && pl.base.type !== 'tall') firstBase = bi;
    if (bi && HOLDER.includes(u.type)) {
      const cu = bi.fu0 + bi.W / 2;
      /* cable grommet holes through the back of the console (and the notes the cut list prints) */
      if (p.cableHoles > 0) {
        const back = bi.parts.find((q) => q.kind === 'back'); if (back) back.note = `Cable holes Ø${p.holeD} x ${p.cableHoles}`;
        const boxes = []; for (let k = 0; k < p.cableHoles; k++) { const uu = cu + (k - (p.cableHoles - 1) / 2) * Math.min(160, bi.W / (p.cableHoles + 1)); boxes.push({ u0: uu - p.holeD / 2, u1: uu + p.holeD / 2, y0: bi.y0 + bi.H - 120 - p.holeD / 2, y1: bi.y0 + bi.H - 120 + p.holeD / 2, d0: g.inset + g.back, d1: g.inset + g.back + 3, mat: 'dark' }); }
        addProp(scene, { kind: 'grommet', unitId: bi.unit.id, row: 'base', boxes });
      }
      if (p.soundbar === 'unit') addProp(scene, { kind: 'soundbar', unitId: bi.unit.id, row: 'counter', boxes: [{ u0: cu - tv.w * 0.4, u1: cu + tv.w * 0.4, y0: yBase1, y1: yBase1 + p.sbH, d0: D * 0.5 - 40, d1: D * 0.5 + 40, mat: 'dark' }] });
      if (p.tvMount === 'stand' && !standDone) { standDone = true; /* a TV on a stand on top of the unit */
        const y0 = yBase1 + 60; const d0 = D * 0.5 - 28; const d1 = D * 0.5 + 27;
        addProp(scene, { kind: 'tv', unitId: bi.unit.id, row: 'counter', boxes: [{ u0: cu - 260, u1: cu + 260, y0: yBase1, y1: yBase1 + 14, d0: d0 - 50, d1: d1 + 50, mat: 'dark' }, { u0: cu - 30, u1: cu + 30, y0: yBase1 + 14, y1: y0, d0: d0 + 10, d1: d1 - 10, mat: 'dark' }, { u0: cu - tv.w / 2, u1: cu + tv.w / 2, y0, y1: y0 + tv.h, d0, d1, mat: 'bezel' }, { u0: cu - tv.w / 2 + 9, u1: cu + tv.w / 2 - 9, y0: y0 + 9, y1: y0 + tv.h - 9, d0: d1, d1: d1 + 1.5, mat: 'screen' }] });
        tvMid = y0 + tv.h / 2;
      }
    }
    if (wi && HOLDER.includes(pl.unit.type) && p.tvMount === 'wall') {
      nicheInst = wi; markNiche(wi, 0, 'tv', [`TV ${p.tvSize}"`, `تلفاز ${p.tvSize}"`]);
      const cu = wi.fu0 + wi.W / 2; const n0 = wi.y0 + x.board + (p.soundbar === 'below' ? p.sbH + 20 : 0) + p.bottomClear;
      const d0 = g.inset + g.back + 35; const d1 = d0 + 55;
      addProp(scene, { kind: 'tv', unitId: wi.unit.id, row: 'wall', boxes: [{ u0: cu - tv.w / 2, u1: cu + tv.w / 2, y0: n0, y1: n0 + tv.h, d0, d1, mat: 'bezel' }, { u0: cu - tv.w / 2 + 9, u1: cu + tv.w / 2 - 9, y0: n0 + 9, y1: n0 + tv.h - 9, d0: d1, d1: d1 + 1.5, mat: 'screen' }, { u0: cu - 150, u1: cu + 150, y0: n0 + tv.h / 2 - 100, y1: n0 + tv.h / 2 + 100, d0: g.inset + g.back, d1: d0, mat: 'dark' }] });
      tvMid = n0 + tv.h / 2;
      if (p.soundbar === 'below') addProp(scene, { kind: 'soundbar', unitId: wi.unit.id, row: 'wall', boxes: [{ u0: cu - tv.w * 0.4, u1: cu + tv.w * 0.4, y0: wi.y0 + x.board + 12, y1: wi.y0 + x.board + 12 + p.sbH, d0: d0 + 15, d1: d0 + 15 + 80, mat: 'dark' }] });
      if (p.cableDuct) { addProp(scene, { kind: 'duct', unitId: wi.unit.id, row: 'wall', boxes: [{ u0: cu - 22, u1: cu + 22, y0: yBase1, y1: n0 + tv.h / 2, d0: g.inset, d1: g.inset + 10, mat: 'dark' }] }); hwRows.push({ k: 'cableDuct', en: 'Cable duct 45 x 12 (behind the TV)', ar: 'مجرى كابلات ٤٥ × ١٢ (خلف التلفاز)', qty: 1 }); }
      hwRows.push({ k: 'tvBracket', en: 'TV wall bracket (VESA)', ar: 'حامل تلفاز جداري (VESA)', qty: 1 });
      if (p.led === 'niche' || p.led === 'both') {
        const t = 10; const dd = wi.D - 28;
        addProp(scene, { kind: 'led', unitId: wi.unit.id, row: 'wall', boxes: frameBoxes(wi.fu0 + x.board, wi.fu0 + wi.W - x.board, wi.y0 + x.board, wi.y0 + wi.H - x.board, dd, dd + 8, t, ledMat) });
        addLed(scene, wi, { on: ledOn, u0: wi.fu0 + x.board + 20, u1: wi.fu0 + wi.W - x.board - 20, y0: wi.y0 + wi.H - x.board - 14, y1: wi.y0 + wi.H - x.board - 10, d0: dd, d1: dd + 8, w: 12, off: 0 });
        ledLen += (2 * (wi.W - 2 * x.board) + 2 * (wi.H - 2 * x.board)) / 1000;
      }
    }
    if (bi && HOLDER.includes(u.type) && (p.led === 'under' || p.led === 'both') && g.plinthH > 20) {
      addProp(scene, { kind: 'led', unitId: bi.unit.id, row: 'base', boxes: [{ u0: bi.fu0 + 30, u1: bi.fu0 + bi.W - 30, y0: g.plinthH - 8, y1: g.plinthH, d0: D - 80, d1: D - 60, mat: ledMat }] });
      addLed(scene, bi, { on: ledOn, u0: bi.fu0 + 30, u1: bi.fu0 + bi.W - 30, y0: g.plinthH - 8, y1: g.plinthH - 4, d0: D - 80, d1: D - 60, w: 20, off: 0 });
      ledLen += (bi.W - 60) / 1000;
    }
    if (bi && u.type === 'av') {
      if (u.door === 'vented') { vented += 1; hwRows.push({ k: 'ventGrille', en: 'Ventilation grille / slot set (AV door)', ar: 'شبكة تهوية (باب الأجهزة)', qty: 1 }); bi.parts.filter((q) => q.kind === 'door').forEach((q) => { q.note = 'Ventilation slots 6 x 120 (x 6)'; }); }
      if (u.gear) {
        const cu = bi.fu0 + bi.W / 2; const sh = bi.parts.filter((q) => q.kind === 'shelf').sort((a, b) => a.box.y0 - b.box.y0); const base0 = bi.y0 + x.board;
        const levels = [base0, ...sh.map((q) => q.box.y1)];
        const boxes = levels.slice(0, 3).map((yy, k) => ({ u0: cu - Math.min(210, bi.W / 2 - 40), u1: cu + Math.min(210, bi.W / 2 - 40), y0: yy, y1: yy + (k === 0 ? 90 : 60), d0: D * 0.3, d1: D * 0.3 + 280, mat: k === 1 ? 'bezel' : 'dark' }));
        addProp(scene, { kind: 'gear', unitId: bi.unit.id, row: 'base', boxes });
      }
    }
    if (bi && u.type === 'fire') {
      const cu = bi.fu0 + bi.W / 2; const w0 = bi.fu0 + x.board + 40; const w1 = bi.fu0 + bi.W - x.board - 40; const y0 = bi.y0 + x.board + 60; const y1 = bi.y0 + bi.H - x.board - 50;
      markNiche(bi, 0, 'fire', ['FIREPLACE', 'مدفأة']);
      const bk = g.inset + g.back + 4; // a dark firebox back, the flame glow in front of it, logs in front of the flame
      const boxes = [{ u0: w0, u1: w1, y0, y1, d0: bk, d1: bk + 14, mat: 'dark' }, { u0: w0 + 24, u1: w1 - 24, y0: y0 + 30, y1: y1 - 24, d0: bk + 14, d1: bk + 22, mat: u.flame ? 'fire' : 'dark' }, { u0: w0 + 70, u1: w1 - 70, y0: y0 + 30, y1: y0 + 70, d0: bk + 22, d1: bk + 150, mat: 'wood' }, { u0: w0, u1: w0 + 20, y0, y1, d0: bk, d1: bk + 170, mat: 'dark' }, { u0: w1 - 20, u1: w1, y0, y1, d0: bk, d1: bk + 170, mat: 'dark' }];
      addProp(scene, { kind: 'fire', unitId: bi.unit.id, row: 'base', boxes });
      hwRows.push({ k: 'fireplace', en: `Electric fireplace insert ${Math.round(w1 - w0)} mm`, ar: `مدفأة كهربائية ${Math.round(w1 - w0)} مم`, qty: 1 });
      void cu;
    }
  });
  /* the back wall panel + slats over every stretch between the towers */
  const owner = firstBase;
  if (p.panel && owner) {
    const baseUnits = run.units.filter((q) => q.row === 'base').sort((a, b) => a.fu0 - b.fu0);
    const regions = []; let cur = null;
    baseUnits.forEach((q) => { if (q.tall) { cur = null; return; } if (cur && Math.abs(q.fu0 - cur.u1) < 1) cur.u1 = q.fu0 + q.W; else { cur = { u0: q.fu0, u1: q.fu0 + q.W }; regions.push(cur); } });
    const yP0 = yBase1; const yP1 = Math.max(yP0 + 200, p.panelH);
    const pitch = p.slatW + p.slatGap;
    let slatN = 0;
    regions.forEach((r) => {
      const gro = { kind: 'door', ptype: 'cover', mat: 'Door', view: 'front', row: 'wall', edges: [{ axis: 'u', where: 'both' }, { axis: 'y', where: 'both' }], noMap: false, group: 'TV wall panel' };
      addPart(scene, owner, { ...gro, name: 'Wall panel', box: { u0: r.u0, u1: r.u1, y0: yP0, y1: yP1, d0: 0, d1: p.panelThk } });
      if (!p.slats) return;
      const nU = nicheInst ? { u0: nicheInst.fu0, u1: nicheInst.fu0 + nicheInst.W } : null;
      const nTop = nicheInst ? nicheInst.y0 + nicheInst.H : yP0;
      const cols = Math.floor((r.u1 - r.u0 + p.slatGap) / pitch);
      const used = cols * pitch - p.slatGap; const start = r.u0 + (r.u1 - r.u0 - used) / 2;
      for (let k = 0; k < cols; k++) {
        const a = start + k * pitch; const b = a + p.slatW;
        let y0 = yP0; let skip = false;
        if (nU && b > nU.u0 - 2 && a < nU.u1 + 2) { if (p.slatZone === 'sides') skip = true; else y0 = nTop + 10; }
        if (!skip && p.slatZone === 'sides' && nU) { /* only the stretches beside the niche */ }
        if (skip || yP1 - y0 < 100) continue;
        slatN += 1;
        addPart(scene, owner, { ...gro, ptype: 'cover', noMap: true, name: 'Slat', row: 'wall', box: { u0: a, u1: b, y0, y1: yP1, d0: p.panelThk, d1: p.panelThk + p.slatT } });
      }
    });
    if (slatN) hwRows.push({ k: 'slatGlue', en: 'Slat adhesive + pins (per slat)', ar: 'لاصق ودبابيس للشرائح (لكل شريحة)', qty: slatN });
    hwRows.push({ k: 'panelFix', en: 'Wall panel keyhole / cleat fixing', ar: 'تثبيت لوح الجدار (قفل مفتاحي / حامل)', qty: regions.length * 2 });
  }
  if (p.cableHoles > 0) hwRows.push({ k: 'grommet', en: `Cable grommet Ø${p.holeD}`, ar: `حلقة كابل Ø${p.holeD}`, qty: p.cableHoles });
  if (floating) built.placed.forEach((pl) => { const bi = find(pl.ids.base); if (bi && pl.base && pl.base.type !== 'tall') hwRows.push({ k: 'bracket', en: 'Heavy-duty wall-hung cabinet bracket (pair)', ar: 'حامل خزانة معلّقة ثقيل (زوج)', qty: Math.ceil(bi.W / 600) }); });
  if (ledLen > 0) { hwRows.push({ k: 'ledStrip', en: 'LED strip (per metre)', ar: 'شريط LED (للمتر)', qty: Math.ceil(ledLen) }); hwRows.push({ k: 'ledDriver', en: 'LED driver 12 V', ar: 'محوّل LED ١٢ فولت', qty: 1 }); }
  void vented;
  scene.tvMid = tvMid; scene.tvNeed = nicheNeed(p, x.board);
  return { hw: hwRows, tvMid };
}

function rules(d, out) {
  const { p, x } = d; const w = []; const add = (id, en, ar) => w.push({ id, en, ar });
  const need = nicheNeed(p, x.board); const tv = tvDims(p.tvSize);
  const media = d.units.filter((u) => HOLDER.includes(u.type));
  if (!media.length) add('no-media', 'A TV unit needs a media console or a fireplace unit under the TV: add one in the Units tab.', 'وحدة التلفاز تحتاج وحدة وسائط أو مدفأة تحت التلفاز: أضفها من تبويب الوحدات.');
  media.forEach((u) => {
    if (p.tvMount === 'wall' && u.tvAbove && u.w < need.w) add('niche-narrow', `A ${p.tvSize}" TV (${tv.w} mm wide) needs a niche ${need.w} mm wide: the console is ${u.w} mm. Widen it to ${need.w} mm or more, or choose a smaller TV.`, `تلفاز ${p.tvSize}" (عرض ${tv.w} مم) يحتاج فتحة ${need.w} مم: الوحدة ${u.w} مم. وسّعها أو اختر تلفازًا أصغر.`);
    if (p.tvMount === 'stand' && u.w < tv.w + 80) add('stand-narrow', `The ${tv.w} mm wide TV is almost as wide as the ${u.w} mm console: widen the unit.`, `التلفاز بعرض ${tv.w} مم يكاد يساوي عرض الوحدة ${u.w} مم: وسّع الوحدة.`);
    if (u.w > 1900 && p.mount === 'floating') add('float-wide', `A floating console ${u.w} mm wide needs three brackets into a solid wall (blockwork or backing board), never plasterboard alone.`, `وحدة معلّقة بعرض ${u.w} مم تحتاج ثلاثة حوامل في جدار صلب وليس جبسًا فقط.`);
  });
  if (p.tvMount === 'wall') {
    if (p.nicheD < 115) add('niche-deep', `A niche ${p.nicheD} mm deep leaves no room for the TV (about 55 mm) and its bracket (35 mm): use at least 115 mm.`, `فتحة بعمق ${p.nicheD} مم لا تتسع للتلفاز (٥٥ مم) وحامله (٣٥ مم): استخدم ١١٥ مم على الأقل.`);
    if (p.topClear < 50) add('top-air', `${p.topClear} mm above the TV is not enough air: keep at least 50 mm.`, `${p.topClear} مم فوق التلفاز لا تكفي للتهوية: اترك ٥٠ مم على الأقل.`);
    if (p.sideClear < 30) add('side-air', `${p.sideClear} mm at the sides is tight for the TV cables and air: keep at least 30 mm.`, `${p.sideClear} مم على الجانبين ضيقة للكابلات والتهوية: اترك ٣٠ مم على الأقل.`);
  }
  if (out && out.scene && out.scene.tvMid) {
    const mid = out.scene.tvMid;
    if (mid < 800 || mid > 1400) add('tv-height', `The centre of the TV is ${Math.round(mid)} mm from the floor: seated eye level is about 1000-1200 mm.`, `مركز التلفاز على ارتفاع ${Math.round(mid)} مم: مستوى النظر جالسًا نحو ١٠٠٠-١٢٠٠ مم.`);
  }
  if (d.units.some((u) => u.type === 'fire' && u.tvAbove) && p.tvMount === 'wall' && p.nicheGap < 300 && d.units.some((u) => u.type === 'fire' && u.tvAbove)) add('fire-heat', 'An electric fireplace under a TV: the TV must stay at least 300 mm above the heater outlet - raise the niche gap.', 'مدفأة كهربائية تحت التلفاز: يجب أن يبعد التلفاز ٣٠٠ مم على الأقل عن مخرج الحرارة - زد الفراغ.');
  if (p.cableHoles === 0) add('no-cables', 'No cable holes: the TV and equipment cables will hang in front of the unit.', 'لا توجد فتحات كابلات: ستتدلى كابلات التلفاز والأجهزة أمام الوحدة.');
  if (p.panel && p.slats && p.slatGap > p.slatW) add('slat-gap', 'Gaps wider than the slats show the panel board behind them.', 'الفراغات الأعرض من الشرائح تُظهر لوح الجدار خلفها.');
  if (p.panel && p.slats && p.slatGap < 8) add('slat-dust', 'Gaps under 8 mm between slats collect dust and are hard to clean.', 'فراغات أقل من ٨ مم بين الشرائح تجمع الغبار ويصعب تنظيفها.');
  if (p.panel && p.panelH < p.unitH + p.nicheGap + need.h + clearance(p)) add('panel-low', 'The wall panel stops below the top of the TV niche.', 'يتوقف لوح الجدار تحت أعلى فتحة التلفاز.');
  if (d.units.some((u) => u.type === 'av' && u.door === 'glass')) add('av-glass', 'Glass doors block heat as well as the remote: add a vented AV shelf for amplifiers and consoles.', 'الأبواب الزجاجية تحجب الحرارة وإشارة الريموت: أضف رفًا مهوّىً للمضخمات والأجهزة.');
  return w;
}

const UN = (id, type, w, o) => ({ id, type, w, ...o });
const PRESETS = [
  { id: 'float65', en: 'Floating 65" with slat panel + towers', ar: 'معلّقة ٦٥" مع لوح شرائح وأبراج', make: () => ({ units: [UN('u1', 'tower', 450), UN('u2', 'media', 2300, { front: 'doors' }), UN('u3', 'tower', 450)], p: {} }) },
  { id: 'fire', en: 'Floor unit with electric fireplace', ar: 'وحدة أرضية مع مدفأة كهربائية', make: () => ({ units: [UN('u1', 'tower', 400), UN('u2', 'fire', 1500), UN('u3', 'tower', 400)], p: { mount: 'floor', foot: 'plinth', tvSize: 55, nicheGap: 330, led: 'niche', slats: false } }) },
  { id: 'av', en: 'Console + AV shelves 55"', ar: 'وحدة مع رفوف أجهزة ٥٥"', make: () => ({ units: [UN('u1', 'av', 600, { door: 'vented' }), UN('u2', 'media', 1600, { front: 'drawers', drawers: 2 }), UN('u3', 'shelf', 500, { shelves: 3 })], p: { tvSize: 55, slatZone: 'full', top: 'laminate', slatW: 30, slatGap: 12 } }) },
  { id: 'stand', en: 'Low unit, TV on a stand 43"', ar: 'وحدة منخفضة والتلفاز على قاعدة ٤٣"', make: () => ({ units: [UN('u1', 'media', 1400, { front: 'open', shelves: 1, tvAbove: false })], p: { tvMount: 'stand', tvSize: 43, mount: 'floor', foot: 'legs', unitH: 420, soundbar: 'unit', panel: true, slats: false } }) },
  { id: 'wall85', en: 'Wall-hung 85" cinema wall', ar: 'جدار سينما معلّق ٨٥"', make: () => ({ units: [UN('u1', 'tower', 500), UN('u2', 'media', 2400, { front: 'doors' }), UN('u3', 'tower', 500)], p: { tvSize: 85, panelH: 2400, towerH: 2400, soundbar: 'below', led: 'both', cableHoles: 3 } }) },
];

const PRICE = {
  topName: ['Top board', 'لوح السطح'],
  rates: {
    board: { Carcass: 6, Back: 2.8, Shelf: 6, Door: 12, Drawer: 6, Plinth: 4.5, Glass: 22 },
    top: { quartz: 85, marble: 105, granite: 78, laminate: 26, oakslab: 70 },
    edge: 0.7, wastePct: 0.12, labourPct: 0.4, marginPct: 0.2,
    hw: { hinge: 0.9, plate: 0.3, runner: 5.5, handleBar: 1.5, handleKnob: 1, handleProfile: 4, pin: 0.04, minifix: 0.25, cam: 0.2, dowel: 0.03, leg: 0.8, bracket: 8.5, tvBracket: 16, cableDuct: 2.5, grommet: 0.9, ventGrille: 6, fireplace: 140, ledStrip: 9, ledDriver: 12, slatGlue: 0.15, panelFix: 1.2 },
  },
  adjust: (d, r) => ({ ...r, board: Object.fromEntries(Object.entries(r.board).map(([k, v]) => [k, k === 'Glass' ? v : Math.round(v * (UPLIFT[d.p.boardType] || 1) * 100) / 100])) }),
};

const ASSISTANT = {
  greet: ['design your TV unit. Tell me the TV size in inches, floating or floor standing, the slat panel, LED, side towers, the soundbar and the cable holes — or change one unit. Every change is shown for review before it is applied, and Undo brings the previous design back.', 'وهساعدك تصمم وحدة التلفاز. اوصفلي مقاس التلفاز بالبوصة ومعلّقة أو أرضية ولوح الشرائح والإضاءة والأبراج الجانبية والساوندبار وفتحات الكابلات — أو غيّر وحدة واحدة. كل تغيير يُعرض للمراجعة قبل التطبيق، وزر التراجع يرجّع التصميم السابق.'],
  examples: { en: ['75 inch TV', 'floating unit', 'floor standing on legs', 'no slats', 'slat width 30', 'LED under the unit', 'soundbar below the TV', 'cable holes 3', 'unit 2 width 2200', 'add tower', 'add fireplace', 'TV on a stand', 'show 3d', 'x-ray', 'open doors', 'daylight'], ar: ['تلفاز ٧٥ بوصة', 'وحدة معلّقة', 'أرضية على أرجل', 'بدون شرائح', 'عرض الشريحة ٣٠', 'إضاءة أسفل الوحدة', 'ساوندبار تحت التلفاز', 'فتحات كابلات ٣', 'وحدة ٢ عرض ٢٢٠٠', 'أضف برج', 'أضف مدفأة', 'تلفاز على قاعدة', 'اعرض ثلاثي الأبعاد', 'أشعة', 'افتح الأبواب', 'ضوء النهار'] },
  nums: [
    { re: /tv( size)?|تلفاز|تلفزيون|شاشة|inch(es)?|بوصة/, key: 'tvSize' }, { re: /slat width|عرض الشريحة/, key: 'slatW' }, { re: /slat gap|فراغ الشرائح/, key: 'slatGap' }, { re: /float(ing)? (clearance|height)|ارتفاع المعلّقة|فراغ تحت الوحدة/, key: 'floatH' },
    { re: /niche depth|عمق الفتحة/, key: 'nicheD' }, { re: /unit height|ارتفاع الوحدة/, key: 'unitH' }, { re: /unit depth|\bdepth|عمق/, key: 'unitD' }, { re: /tower height|ارتفاع البرج|ارتفاع الأبراج/, key: 'towerH' }, { re: /panel height|ارتفاع اللوح/, key: 'panelH' },
    { re: /side clear(ance)?|فراغ جانبي/, key: 'sideClear' }, { re: /top clear(ance)?|فراغ علوي/, key: 'topClear' }, { re: /soundbar height|ارتفاع الساوندبار/, key: 'sbH' },
    { re: /cable holes?|grommets?|فتحات كابلات|فتحات الكابلات/, key: 'cableHoles' }, { re: /gap/, key: 'nicheGap' },
  ],
  words: [
    { re: /floating|wall[- ]?hung|معلق|معلّق/, set: { mount: 'floating' } }, { re: /floor[ -]?standing|on (the )?floor|أرضي|أرضية/, set: { mount: 'floor' } }, { re: /\blegs\b|أرجل/, set: { mount: 'floor', foot: 'legs' } }, { re: /plinth|قاعدة/, set: { mount: 'floor', foot: 'plinth' } },
    { re: /on a stand|tv stand|على قاعدة/, set: { tvMount: 'stand' } }, { re: /wall bracket|niche|فتحة|حامل جداري/, set: { tvMount: 'wall' } },
    { re: /no slats?|without slats?|بدون شرائح/, set: { slats: false } }, { re: /(?<!no |without |بدون )(slats?|شرائح)/, set: { panel: true, slats: true } }, { re: /full slats|whole panel|اللوح كاملا/, set: { slatZone: 'full' } },
    { re: /no panel|without (the )?panel|بدون لوح/, set: { panel: false } }, { re: /(?<!no |without |بدون )(wall panel|back panel|لوح الجدار)/, set: { panel: true } },
    { re: /no led|led off|بدون led/, set: { led: 'off' } }, { re: /led (under|below)|إضاءة أسفل|ليد اسفل/, set: { led: 'under' } }, { re: /led (niche|backlight)|backlight|إضاءة الفتحة/, set: { led: 'niche' } }, { re: /led both|both led/, set: { led: 'both' } },
    { re: /no soundbar|بدون ساوندبار/, set: { soundbar: 'none' } }, { re: /soundbar (below|under)|ساوندبار تحت/, set: { soundbar: 'below' } }, { re: /soundbar (on|above)|ساوندبار على/, set: { soundbar: 'unit' } },
    { re: /no cable duct|بدون مجرى/, set: { cableDuct: false } }, { re: /(?<!no |without |بدون )(cable duct|مجرى كابلات)/, set: { cableDuct: true } },
    { re: /oak|بلوط/, set: { top: 'oakslab' } }, { re: /laminate|لامينيت/, set: { top: 'laminate' } }, { re: /marble|رخام/, set: { top: 'marble' } },
    { re: /vented|مفرغ/, unitSet: { door: 'vented' } }, { re: /glass door|باب زجاج/, unitSet: { door: 'glass' } }, { re: /drawers front|front drawers|واجهة أدراج/, unitSet: { front: 'drawers' } }, { re: /open front|واجهة مفتوحة/, unitSet: { front: 'open' } },
    { re: /flame off|بدون لهب/, unitSet: { flame: false } },
  ],
  addWords: [{ re: /tower|برج/, type: 'tower' }, { re: /fireplace|مدفأة/, type: 'fire' }, { re: /av( shelf| shelves)?|أجهزة/, type: 'av' }, { re: /media|console|وحدة وسائط/, type: 'media' }, { re: /wall shelf|رف جداري/, type: 'shelf' }],
};

export const TV = {
  id: 'tv', menuId: 'neo-tv', storageKey: 'neo_cat_tv_v1',
  app: ['Neo TV Unit Designer', 'مصمم وحدات التلفاز نيو'], noun: ['TV unit', 'وحدة التلفاز'], unitNoun: ['unit', 'وحدة'], defaultTitle: ['My TV Unit', 'وحدة التلفاز'], file: 'tv-unit', single: ['TV unit', 'وحدة التلفاز'],
  layoutLabel: ['TV wall', 'جدار تلفاز'], icon: '📺',
  unitTypes: UNIT_TYPES, params: PARAMS, presets: PRESETS, x: { board: 18, back: 12, finishKey: 'walnut' },
  names: { counter: ['Top board', 'لوح السطح'] },
  legend: { keys: ['baseUnit', 'wallUnit', 'door', 'drawer', 'glass', 'open', 'shelf', 'cover', 'counter', 'plinth'], names: { baseUnit: ['Unit / tower', 'وحدة / برج'], wallUnit: ['TV niche', 'فتحة التلفاز'], cover: ['Wall panel / slats', 'لوح / شرائح'], counter: ['Top board', 'لوح السطح'] } },
  slotRows: [{ k: 'structure', en: 'Structure', ar: 'الهيكل' }, { k: 'shelves', en: 'Shelves', ar: 'الرفوف' }, { k: 'back', en: 'Back', ar: 'الظهر' }, { k: 'baseDoors', en: 'Doors, panel and slats', ar: 'الأبواب واللوح والشرائح' }, { k: 'tallDoors', en: 'Tower doors', ar: 'أبواب الأبراج' }, { k: 'wallDoors', en: 'Niche parts', ar: 'قطع الفتحة' }, { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج' }, { k: 'drawers', en: 'Drawer boxes', ar: 'صناديق الأدراج' }, { k: 'plinth', en: 'Plinth', ar: 'القاعدة' }, { k: 'countertop', en: 'Top board', ar: 'لوح السطح' }, { k: 'handles', en: 'Handles', ar: 'المقابض' }],
  globalCards: [{ en: 'Media unit', ar: 'وحدة الوسائط', keys: ['mount', 'floatH', 'foot', 'legH', 'unitH', 'unitD', 'topThk', 'top', 'towerH', 'towerD'], note: ['A floating unit hangs on the wall and shows the floor underneath; a floor unit stands on legs or a plinth.', 'الوحدة المعلّقة تتعلق بالجدار وتُظهر الأرضية تحتها، والأرضية تقف على أرجل أو قاعدة.'] }],
  msCards: [{ en: 'Board', ar: 'اللوح', keys: ['boardType'] }],
  tabs: [
    { id: 'tv', icon: 'look', en: 'TV & niche', ar: 'التلفاز والفتحة', cards: [
      { en: 'TV', ar: 'التلفاز', keys: ['tvSize', 'tvMount'], note: ['The niche is sized from the real screen: width = TV width + 2 × (side clearance + board).', 'تُحسب الفتحة من الشاشة الحقيقية: العرض = عرض التلفاز + ٢ × (الفراغ الجانبي + اللوح).'] },
      { en: 'Niche', ar: 'الفتحة', keys: ['sideClear', 'topClear', 'bottomClear', 'nicheD', 'nicheGap'] },
      { en: 'Soundbar', ar: 'الساوندبار', keys: ['soundbar', 'sbH'] },
    ] },
    { id: 'panel', icon: 'wall', en: 'Panel & LED', ar: 'اللوح والإضاءة', cards: [
      { en: 'Back wall panel', ar: 'لوح الجدار الخلفي', keys: ['panel', 'panelH', 'panelThk'], note: ['The panel and every slat are cut-list parts. Slats are cut to the panel height; pieces of the same size share one row.', 'اللوح وكل شريحة قطع في قائمة القص. تُقصّ الشرائح بارتفاع اللوح، والقطع المتماثلة تشترك في سطر واحد.'] },
      { en: 'Slats', ar: 'الشرائح', keys: ['slats', 'slatZone', 'slatW', 'slatGap', 'slatT'] },
      { en: 'LED backlight', ar: 'إضاءة LED الخلفية', keys: ['led', 'ledOn'] },
      { en: 'Cables', ar: 'الكابلات', keys: ['cableHoles', 'holeD', 'cableDuct'] },
    ] },
  ],
  matNames: (d) => ({ structure: BOARD_NAME[d.p.boardType], shelves: BOARD_NAME[d.p.boardType], back: 'Back board 12 mm', baseDoors: BOARD_NAME[d.p.boardType], tallDoors: BOARD_NAME[d.p.boardType], wallDoors: BOARD_NAME[d.p.boardType], drawers: BOARD_NAME[d.p.boardType], plinth: BOARD_NAME[d.p.boardType] }),
  toKitchen, decorate, rules, price: PRICE, assistant: ASSISTANT,
};

registerProduct('tv', {
  app: TV.app, noun: TV.noun, file: 'tv-unit', layoutLabel: { straight: ['TV wall', 'جدار تلفاز'], 'l-left': ['L-run', 'تشكيلة L'], 'l-right': ['L-run', 'تشكيلة L'], u: ['U-run', 'تشكيلة U'] }, legend: TV.legend, worktop: ['Top board', 'لوح السطح'],
  runNames: { main: ['Main wall', 'الجدار الرئيسي'] }, propsNote: ['The TV, soundbar, equipment, fireplace and LED strips in OBJ / STL / 3DM. Display only: never in the cut list or the price.', 'التلفاز والساوندبار والأجهزة والمدفأة وشرائط LED في OBJ / STL / 3DM. للعرض فقط: ليست في قائمة القص أو السعر.'],
});
registerArabicNames([
  [/TV wall panel/g, 'لوح جدار التلفاز'], [/Wall panel/g, 'لوح الجدار'], [/\bSlat\b/g, 'شريحة'], [/Media console/g, 'وحدة وسائط'], [/TV niche/g, 'فتحة التلفاز'], [/AV shelf unit/g, 'وحدة رفوف الأجهزة'], [/Electric fireplace/g, 'مدفأة كهربائية'], [/Side tower/g, 'برج جانبي'], [/Wall shelf/g, 'رف جداري'], [/Top board/g, 'لوح السطح'],
]);
registerArabicNotes([[/Cable holes Ø(\d+) x (\d+)/g, 'فتحات كابلات Ø$1 × $2'], [/Ventilation slots 6 x 120 \(x 6\)/g, 'فتحات تهوية ٦ × ١٢٠ (× ٦)']]);

export default TV;
