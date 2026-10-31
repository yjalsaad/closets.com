/* =============================================================================
 * Neo Kitchen Designer - spec constants (ranges, defaults, part types).
 * Pure data, no React. Every range below is the owner's reference list
 * (docs in the PR body); entries with src:'ref' come from the reference
 * screenshots, src:'new' are Neo additions shown with a NEW badge in the UI.
 * No colours live in JS: all swatches are CSS custom properties in
 * neoKitchen.css ("constants block" at the top of that file).
 * ===========================================================================*/

/* ---- numbered global control cards (Global + M&S tabs) -------------------- */
/* f: k = key in model.g, min/max/def in mm (except where unit says otherwise).
   d = plain-language description (EN/AR). n = callout number in the card art. */
export const CARDS = [
  { id: 'heights', tab: 'global', art: 'section', en: 'Kitchen Section', ar: 'مقطع المطبخ',
    d: { en: 'The same kitchen from the front and from the side - one height scale, every value pinned.', ar: 'نفس المطبخ من الأمام ومن الجانب - بمقياس ارتفاع واحد وكل قيمة مثبتة.' },
    f: [
      { k: 'plinthH', en: 'Plinth / toe-kick height', ar: 'ارتفاع القاعدة (التوكيك)', min: 50, max: 180, def: 100, d: { en: 'The recessed base the units stand on.', ar: 'القاعدة المتراجعة التي تقف عليها الوحدات.' } },
      { k: 'baseH', en: 'Base carcass height', ar: 'ارتفاع هيكل الوحدة السفلية', min: 600, max: 850, def: 700, d: { en: 'Height of the base cabinet box, without plinth and worktop.', ar: 'ارتفاع صندوق الوحدة السفلية بدون القاعدة والسطح.' } },
      { k: 'counterThk', en: 'Countertop thickness', ar: 'سماكة سطح العمل', min: 20, max: 80, def: 50, d: { en: 'Thickness of the worktop slab.', ar: 'سماكة لوح سطح العمل.' } },
      { k: 'gap', en: 'Counter to wall-cabinet gap', ar: 'الفراغ بين السطح والعلوي', min: 500, max: 700, def: 600, d: { en: 'Vertical space between the worktop and the wall cabinets.', ar: 'المسافة العمودية بين سطح العمل والخزائن العلوية.' } },
      { k: 'wallH', en: 'Wall carcass height', ar: 'ارتفاع هيكل الوحدة العلوية', min: 400, max: 900, def: 720, d: { en: 'Height of the wall cabinet box.', ar: 'ارتفاع صندوق الوحدة العلوية.' } },
      { k: 'topH', en: 'Top carcass height', ar: 'ارتفاع الهيكل الثالث', min: 300, max: 700, def: 580, d: { en: 'Stacked upper third-tier cabinets above the wall row.', ar: 'الخزائن العلوية المكدسة (الصف الثالث) فوق الصف العلوي.' } },
      { k: 'baseD', en: 'Base depth', ar: 'عمق الوحدة السفلية', min: 500, max: 700, def: 600, d: { en: 'Front-to-back depth of base carcasses.', ar: 'العمق من الأمام للخلف للوحدات السفلية.' } },
      { k: 'wallD', en: 'Wall and top depth', ar: 'عمق العلوي والثالث', min: 300, max: 400, def: 320, d: { en: 'Depth of wall and top carcasses.', ar: 'عمق الوحدات العلوية والثالثة.' } },
      { k: 'overhang', en: 'Countertop overhang', ar: 'بروز سطح العمل', min: 10, max: 50, def: 30, d: { en: 'How far the worktop front edge projects beyond the cabinet doors.', ar: 'مقدار بروز حافة السطح الأمامية عن أبواب الخزائن.' } },
      { k: 'plinthSetback', en: 'Plinth setback', ar: 'تراجع القاعدة', min: 0, max: 120, def: 60, d: { en: 'How far back the plinth is recessed under the cabinets (range not given by the owner: 0-120 assumed).', ar: 'مقدار تراجع القاعدة تحت الخزائن (المدى غير محدد من المالك: ٠-١٢٠ افتراضي).' } },
    ] },
  { id: 'carcass', tab: 'ms', art: 'carcass', en: 'Carcass Boards', ar: 'ألواح الهيكل',
    d: { en: 'The boards every box is cut from — and the groove the back board sits in.', ar: 'الألواح التي يُقصّ منها كل صندوق — والمجرى الذي يجلس فيه لوح الظهر.' },
    f: [
      { k: 'board', en: 'Carcass board', ar: 'لوح الهيكل', min: 10, max: 30, def: 18, step: 0.5, d: { en: 'Sides, bottom and stretchers.', ar: 'الجوانب والقاعدة والروابط.' } },
      { k: 'back', en: 'Back board', ar: 'لوح الظهر', min: 3, max: 20, def: 8, step: 0.5, d: { en: 'The thin back panel.', ar: 'لوح الظهر الرقيق.' } },
      { k: 'inset', en: 'Back inset', ar: 'تراجع الظهر', min: 0, max: 50, def: 15, step: 0.5, d: { en: 'Back panel distance from the rear edge (groove position).', ar: 'بعد لوح الظهر عن الحافة الخلفية (موضع المجرى).' } },
      { k: 'stretcher', en: 'Top stretcher width', ar: 'عرض الرباط العلوي', min: 40, max: 250, def: 100, step: 1, d: { en: 'The two rails that replace a full top on base units.', ar: 'الرباطان اللذان يحلان محل اللوح العلوي الكامل في الوحدات السفلية.' } },
      { k: 'grooveD', en: 'Back groove depth', ar: 'عمق مجرى الظهر', min: 3, max: 15, def: 8, step: 0.5, src: 'new', d: { en: 'How deep the back panel sits into the sides and bottom (rabbet depth).', ar: 'عمق دخول لوح الظهر في الجوانب والقاعدة.' } },
    ] },
  { id: 'doors', tab: 'ms', art: 'door', en: 'Doors & Hinges', ar: 'الأبواب والمفصلات',
    d: { en: 'Front boards, their gaps, and where the hinge cups are drilled — one door open to show its thickness and cups.', ar: 'ألواح الواجهات وفراغاتها ومواضع ثقوب كوب المفصلة — باب مفتوح يُظهر سماكته والكوبات.' },
    f: [
      { k: 'doorThk', en: 'Door / front board', ar: 'لوح الباب / الواجهة', min: 12, max: 40, def: 18, step: 0.5, d: { en: 'Door and drawer-front thickness.', ar: 'سماكة الباب وواجهة الدرج.' } },
      { k: 'doorGap', en: 'Door gap', ar: 'فراغ الباب', min: 0, max: 10, def: 3, step: 0.5, d: { en: 'Reveal between fronts and around the carcass.', ar: 'الفراغ بين الواجهات وحول الهيكل.' } },
      { k: 'hingeCup', en: 'Hinge cup Ø', ar: 'قطر كوب المفصلة Ø', min: 15, max: 60, def: 35, step: 0.5, d: { en: 'Cup bore diameter (35 mm is standard).', ar: 'قطر ثقب الكوب (35 مم هو القياسي).' } },
      { k: 'cupEdge', en: 'Cup edge distance', ar: 'مسافة حافة الكوب', min: 0, max: 15, def: 5, step: 0.5, d: { en: 'From the door edge to the cup rim.', ar: 'من حافة الباب إلى حافة الكوب.' } },
    ] },
  { id: 'drawers', tab: 'ms', art: 'drawer', en: 'Drawers', ar: 'الأدراج',
    d: { en: 'The drawer box in its opening: the gap between fronts, the runner clearance per side, the bottom groove.', ar: 'صندوق الدرج في فتحته: الفراغ بين الواجهات وخلوص السكة لكل جانب ومجرى القاع.' },
    f: [
      { k: 'drawerGap', en: 'Drawer vertical gap', ar: 'الفراغ العمودي للأدراج', min: 0, max: 10, def: 3, step: 0.5, d: { en: 'Reveal between stacked drawer fronts.', ar: 'الفراغ بين واجهات الأدراج المتراصة.' } },
      { k: 'drawerSide', en: 'Drawer side clearance', ar: 'خلوص جانب الدرج', min: 0, max: 30, def: 13, step: 0.5, d: { en: 'Space per side for the runner between box and carcass.', ar: 'المسافة لكل جانب للسكة بين الصندوق والهيكل.' } },
      { k: 'drawerBottom', en: 'Drawer bottom inset', ar: 'تراجع قاع الدرج', min: 0, max: 40, def: 12, step: 0.5, d: { en: 'Height of the bottom groove above the box edge.', ar: 'ارتفاع مجرى القاع فوق حافة الصندوق.' } },
    ] },
  { id: 'shelves', tab: 'ms', art: 'shelf', en: 'Shelves', ar: 'الرفوف',
    d: { en: 'The shelf board and the play that lets it lift in and out.', ar: 'لوح الرف والخلوص الذي يسمح برفعه وإنزاله.' },
    f: [
      { k: 'shelfThk', en: 'Shelf board', ar: 'لوح الرف', min: 6, max: 50, def: 18, step: 0.5, d: { en: 'Thickness of adjustable and fixed shelves.', ar: 'سماكة الرفوف المتحركة والثابتة.' } },
      { k: 'shelfPlay', en: 'Shelf clearance', ar: 'خلوص الرف', min: 0, max: 20, def: 1, step: 0.5, d: { en: 'Play per side between the shelf and the sides.', ar: 'الخلوص لكل جانب بين الرف والجوانب.' } },
    ] },
  { id: 'worktop', tab: 'ms', art: 'worktop', en: 'Worktop, edge banding & backsplash', ar: 'السطح وشريط الحواف والباكسبلاش',
    d: { en: 'Edge-band thickness deducted from cut sizes, and the splash strip above the counter.', ar: 'سماكة شريط الحواف المخصومة من أحجام القص وشريط الباكسبلاش فوق السطح.' },
    f: [
      { k: 'edgeBand', en: 'Edge banding thickness', ar: 'سماكة شريط الحواف', min: 0, max: 3, def: 1, step: 0.1, src: 'new', d: { en: 'Deducted from the cut size of every banded edge.', ar: 'تُخصم من مقاس القص لكل حافة مشطوبة.' } },
      { k: 'backsplashH', en: 'Backsplash height', ar: 'ارتفاع الباكسبلاش', min: 0, max: 600, def: 100, src: 'ref', d: { en: 'Splash strip above the worktop (0 = none).', ar: 'شريط الحماية فوق السطح (٠ = بدون).' } },
    ] },
];

export const ALL_FIELDS = CARDS.flatMap((c) => c.f.map((f) => ({ ...f, card: c.id })));
export const FIELD = Object.fromEntries(ALL_FIELDS.map((f) => [f.k, f]));
export const DEFAULT_G = Object.fromEntries(ALL_FIELDS.map((f) => [f.k, f.def]));

/* ---- ranges that are not on a card ---------------------------------------- */
export const LEG = {
  depth: { min: 400, max: 800, def: 600 },
  height: { min: 1800, max: 2400, def: 1990 },
  length: { min: 1200, max: 3600, def: 2100 },
};
export const KITCHEN = { width: { min: 600, max: 20000 }, height: { min: 1000, max: 4000 }, depth: { min: 500, max: 700 } };
export const UNIT_W = { min: 200, max: 1200 };
export const TALL_H = { min: 1200, max: 3200, def: 2470 };
export const SEC_N = { min: 1, max: 8 };
/* UX-17: LED strip under the wall units of the main run (a groove in the underside of the bottom board + an emissive strip in 3D) */
export const LED = { w: { min: 10, max: 100, def: 30 }, off: { min: 0, max: 200, def: 40 }, depth: 6 };
export const SHELVES_N = { min: 0, max: 6 };

/* ---- fixed manufacturing constants (documented, not user controls) -------- */
export const MFG = {
  hingeEnd: 100,        // hinge centre from door top/bottom edge (mm)
  handleEdge: 40,       // handle hole line from the free edge (mm)
  boxThk: 16,           // drawer box board thickness (mm)
  boxClearV: 40,        // vertical clearance of drawer box inside its slot (mm)
  shelfSetback: 10,     // shelf stops short of the carcass front (mm) - matches the reference BOM (567 on 600)
  frameW: 50,           // glass-door frame stile / rail width (mm)
  barW: 30,             // glazing bar (a "division" of a glass leaf) width (mm) [NEO-CLOSETS-UX24]
  maxDiv: 6,            // most divisions per leaf
  glassThk: 4,
  blindW: 450,          // fixed blind-corner panel width (mm)
  pinPitch: 32,         // 32 mm system pitch
  pinEdge: 37,          // first pin column from the carcass front / back (mm)
  pinR: 2.5,            // 5 mm shelf pin Ø
  bsThk: 20,            // backsplash board thickness
  maxSlab: 3000,        // longest worktop slab before a joint (mm)
  runnerLens: [250, 300, 350, 400, 450, 500, 550],
};

/* ---- section (front) types ------------------------------------------------ */
export const SECTYPES = {
  door: { en: 'Door', ar: 'باب', part: 'door' },
  drawer: { en: 'Drawers', ar: 'أدراج', part: 'drawer' },
  flip: { en: 'Flip-up', ar: 'باب قلاب', part: 'flip' },
  glass: { en: 'Glass door', ar: 'باب زجاج', part: 'glass' },
  open: { en: 'Open shelf', ar: 'رف مفتوح', part: 'open' },
  cover: { en: 'Cover panel', ar: 'لوح تغطية', part: 'cover' },
  sink: { en: 'Sink (doors + cut-out)', ar: 'حوض (أبواب + فتحة)', part: 'door', src: 'new' },
  hob: { en: 'Hob (drawers + cut-out)', ar: 'موقد (أدراج + فتحة)', part: 'drawer', src: 'new' },
  oven: { en: 'Oven niche', ar: 'فتحة فرن', part: 'open', src: 'new' },
  fridge: { en: 'Under-counter fridge', ar: 'ثلاجة تحت السطح', part: 'open', src: 'new' },
};
export const UNIT_TYPES = {
  normal: { en: 'Normal unit', ar: 'وحدة عادية' },
  tall: { en: 'Tall unit', ar: 'وحدة طويلة' },
  blind: { en: 'Blind corner', ar: 'ركن أعمى', src: 'new' },
  carousel: { en: 'Carousel corner', ar: 'ركن دوّار', src: 'new' },
  diagonal: { en: 'Diagonal corner', ar: 'ركن قطري', src: 'new' },
};
/* standard appliance sizes (mm) - cut-out in the worktop / niche in the unit */
export const APPLIANCE = {
  sink: { w: 780, d: 440, en: 'Sink cut-out', ar: 'فتحة الحوض' },
  hob: { w: 560, d: 490, en: 'Hob cut-out', ar: 'فتحة الموقد' },
  oven: { w: 565, h: 595, en: 'Oven niche', ar: 'فتحة الفرن' },
  fridge: { w: 600, h: 820, en: 'Fridge niche', ar: 'فتحة الثلاجة' },
};

export const ROWS = ['base', 'wall', 'top'];
export const RUNS = ['main', 'left', 'right'];

/* ---- NEO-KITCHEN-UX29 additive layout kinds (galley / peninsula / island) ----------------------------------
 * model.xl is OPTIONAL: a file without it is a Single wall / L / U kitchen exactly as before. The extra runs live in
 * model.runs under XRUNS keys, only when the layout needs them. All ranges in mm. */
export const XRUNS = ['run2', 'pen', 'isl'];
export const XL_KINDS = ['galley', 'peninsula', 'island'];
export const XL_RUN_OF = { galley: 'run2', peninsula: 'pen', island: 'isl' };
export const XL = {
  /* clear space between two worktop fronts. The field accepts the whole buildable range; the "work aisle" is a recommendation that raises a warning */
  aisle: { min: 600, max: 2400, def: 1200, rec: [1000, 1500] },
  /* island: clearance between the main run worktop front and the island worktop front */
  gap: { min: 600, max: 2400, def: 1000, rec: [900, 1200] },
  seat: { min: 200, max: 500, def: 300, supportAbove: 300 }, // seating overhang beyond the finished back; above `supportAbove` a bracket / leg is needed
  /* run lengths (sum of the base row, mm) */
  len: { run2: { min: 600, max: 20000, def: 3200 }, pen: { min: 1200, max: 3600, def: 2100 }, isl: { min: 600, max: 6000, def: 1800 } },
  minProj: 600, // a peninsula must project at least this far beyond the main run
  hintKinds: ['none', 'hob', 'sink'],
};

/* ---- finishes (PBR data; swatch colours live in CSS vars --nk-fin-*) ------ */
export const FINISHES = {
  oak: { en: 'Natural Oak', ar: 'بلوط طبيعي', cssVar: '--nk-fin-oak', rough: 0.62, metal: 0, grain: true },
  walnut: { en: 'Dark Walnut', ar: 'جوز داكن', cssVar: '--nk-fin-walnut', rough: 0.58, metal: 0, grain: true },
  white: { en: 'Matte White Lacquer', ar: 'أبيض مطفي', cssVar: '--nk-fin-white', rough: 0.85, metal: 0, grain: false },
  charcoal: { en: 'Charcoal Grey', ar: 'رمادي فحمي', cssVar: '--nk-fin-charcoal', rough: 0.8, metal: 0, grain: false },
};
export const COUNTERS = {
  marble: { en: 'Marble', ar: 'رخام', cssVar: '--nk-ct-marble', rough: 0.25, price: 120 },
  quartz: { en: 'White quartz', ar: 'كوارتز أبيض', cssVar: '--nk-ct-quartz', rough: 0.3, price: 95 },
  granite: { en: 'Black granite', ar: 'جرانيت أسود', cssVar: '--nk-ct-granite', rough: 0.22, price: 85 },
  laminate: { en: 'Laminate', ar: 'لامينيت', cssVar: '--nk-ct-laminate', rough: 0.55, price: 28 },
  oakslab: { en: 'Solid oak', ar: 'بلوط صلب', cssVar: '--nk-ct-oak', rough: 0.6, price: 75 },
};
export const HANDLES = {
  bar: { en: 'Bar handle', ar: 'مقبض شريط' },
  knob: { en: 'Knob', ar: 'مقبض كرة' },
  profile: { en: 'Profile (J-pull)', ar: 'مقبض بروفايل' },
  push: { en: 'Push-to-open', ar: 'فتح بالضغط' },
  none: { en: 'None', ar: 'بدون' },
};
export const HANDLE_LENS = [96, 128, 160, 192, 256, 320];

/* part types for the 2D legend / colour coding (colours = CSS vars --nk-pt-*) */
export const PART_TYPES = [
  { k: 'baseUnit', en: 'Base unit', ar: 'وحدة سفلية' },
  { k: 'wallUnit', en: 'Wall unit', ar: 'وحدة علوية' },
  { k: 'door', en: 'Door', ar: 'باب' },
  { k: 'drawer', en: 'Drawer', ar: 'درج' },
  { k: 'flip', en: 'Flip-up', ar: 'قلاب' },
  { k: 'glass', en: 'Glass door', ar: 'باب زجاج' },
  { k: 'open', en: 'Open shelf', ar: 'رف مفتوح' },
  { k: 'shelf', en: 'Shelf', ar: 'رف' },
  { k: 'cover', en: 'Sink / hob cover', ar: 'غطاء حوض/موقد' },
  { k: 'counter', en: 'Countertop', ar: 'سطح العمل' },
  { k: 'plinth', en: 'Plinth', ar: 'القاعدة' },
];

/* default board material per part kind -> BOM material class */
export const BOARD = {
  Carcass: { en: 'Carcass Board', ar: 'ألواح الهيكل' },
  Back: { en: 'Back Board', ar: 'ألواح الظهر' },
  Shelf: { en: 'Shelf Board', ar: 'ألواح الرفوف' },
  Door: { en: 'Door Board', ar: 'ألواح الأبواب' },
  Drawer: { en: 'Drawer Board', ar: 'ألواح الأدراج' },
  Plinth: { en: 'Plinth Board', ar: 'ألواح القاعدة' },
  Countertop: { en: 'Countertop', ar: 'سطح العمل' },
  Glass: { en: 'Glass', ar: 'زجاج' },
  Timber: { en: 'Solid timber / frame', ar: 'خشب صلب / إطار' }, // [NEO-CUSTOM-UX28] custom furniture only: legs, rails and frame members (never nested on sheets)
};
export const BOARD_ORDER = ['Carcass', 'Back', 'Shelf', 'Door', 'Drawer', 'Plinth', 'Countertop', 'Glass', 'Timber'];

/* "Production materials" name slots (M&S tab) -> which parts they cover */
export const MAT_SLOTS = [
  { k: 'structure', en: 'Structure', ar: 'الهيكل' },
  { k: 'shelves', en: 'Shelves', ar: 'الرفوف' },
  { k: 'back', en: 'Back', ar: 'الظهر' },
  { k: 'baseDoors', en: 'Base doors', ar: 'أبواب السفلي' },
  { k: 'wallDoors', en: 'Wall doors', ar: 'أبواب العلوي' },
  { k: 'topDoors', en: 'Top doors', ar: 'أبواب الثالث' },
  { k: 'tallDoors', en: 'Tall doors', ar: 'أبواب الطويل' },
  { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج' }, // UX-16: empty = the drawer fronts keep the name of their door row (as before)
  { k: 'drawers', en: 'Drawer boxes', ar: 'صناديق الأدراج' },
  { k: 'plinth', en: 'Plinth', ar: 'القاعدة' },
  { k: 'countertop', en: 'Countertop', ar: 'سطح العمل' },
  { k: 'glass', en: 'Glass and frames', ar: 'الزجاج والإطارات', wd: true }, // NEO-CLOSETS-UX24: wardrobe studio only (panes + frames); the kitchen M&S tab does not list `wd` slots
  { k: 'handles', en: 'Handles', ar: 'المقابض' }, // UX-16: named for the materials list / exports; handles are hardware, not cut-list rows
];

/* ---- UX-16 "Look": per part-group colour + texture overrides (model.paint). Display only - never geometry / BOM ----
 * kinds = engine part kinds the group paints; tex:false = colour only (handles). */
export const PAINT_GROUPS = [
  { k: 'carcass', en: 'Carcass body', ar: 'هيكل الوحدة', tex: true },
  { k: 'doors', en: 'Doors', ar: 'الأبواب', tex: true },
  { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج', tex: true },
  { k: 'shelves', en: 'Shelves', ar: 'الرفوف', tex: true },
  { k: 'back', en: 'Back panel', ar: 'لوح الظهر', tex: true },
  { k: 'counter', en: 'Countertop', ar: 'سطح العمل', tex: true },
  { k: 'plinth', en: 'Plinth', ar: 'القاعدة', tex: true },
  { k: 'handles', en: 'Handles', ar: 'المقابض', tex: false },
];
/* textures reuse the generators the 3D view already has: Off = flat colour, Default = the group's own look, Wood grain, Marble */
export const PAINT_TEX = [
  { k: 'off', en: 'Off', ar: 'بدون' },
  { k: 'default', en: 'Default', ar: 'افتراضي' },
  { k: 'wood', en: 'Wood grain', ar: 'عرق الخشب' },
  { k: 'marble', en: 'Marble', ar: 'رخام' },
];
/* which production-material slot belongs to which Look group (the colour dot of a name row) */
export const SLOT_GROUP = { structure: 'carcass', shelves: 'shelves', back: 'back', baseDoors: 'doors', wallDoors: 'doors', topDoors: 'doors', tallDoors: 'doors', drawerFronts: 'drawerFronts', drawers: 'carcass', plinth: 'plinth', countertop: 'counter', handles: 'handles' };

/* grain per part kind: V vertical, H horizontal, N none */
export const GRAIN_KINDS = ['side', 'bottom', 'top', 'stretcher', 'divider', 'back', 'shelf', 'door', 'drawerFront', 'drawerBox', 'plinth', 'counter'];
export const DEFAULT_GRAIN = { side: 'V', bottom: 'H', top: 'H', stretcher: 'H', divider: 'H', back: 'V', shelf: 'H', door: 'V', drawerFront: 'H', drawerBox: 'H', plinth: 'H', counter: 'H' };
