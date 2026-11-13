/* The interactive products: ids, parts (what can move), camera views and honest spec lines. PURE data (unit-tested).
 *
 * Spec lines use ONLY facts the site already states: made to measure, designed / made / fitted in Bahrain (strings.js capCraft + brand copy),
 * the 10-year cabinetry and soft-close hardware warranty (content/facts.js FACTS.warrantyYears), and the door FAQ copy (door.faq.a3 / a5).
 * There are NO dimensions, prices, lead times or material grades here: the model is a SAMPLE CONFIGURATION and says so.
 *
 * Local frame of every product: origin at the bay centre on the floor, +X toward the nave (the visitor), -X is the wall (x = -3), Z along the wall.
 * Right-hand bays are the left-hand frame rotated by PI about Y, see toWorld(). */
import { HALL, BAY } from '../3d/dimensions';

export const WARRANTY_YEARS = 10;   // mirrors src/content/facts.js (FACTS.warrantyYears); a unit test compares them

const P = (id, kind, en, ar, extra = {}) => ({ id, kind, label: { en, ar }, ...extra });

export const PRODUCTS = {
  kitchen: {
    id: 'kitchen', dept: 'kitchens', interest: 'Kitchen',
    name: { en: 'Island and wall run', ar: 'جزيرة مطبخ مع وحدات جدارية' },
    kicker: { en: 'Kitchens · sample configuration', ar: 'المطابخ · نموذج تصميم' },
    spec: [
      { en: 'Handleless profile with slim brass finger pulls.', ar: 'واجهات بلا مقابض مع مقابض نحاسية رفيعة.' },
      { en: 'Waterfall stone worktop, hob and sink detail.', ar: 'سطح حجري بنهاية شلال مع موقد وحوض.' },
      { en: 'LED under the wall units and inside the drawers.', ar: 'إضاءة LED تحت الوحدات العلوية وداخل الأدراج.' },
      { en: 'Made to measure, designed, made and fitted in Bahrain.', ar: 'مصنوعة على المقاس: تصميم وتصنيع وتركيب في البحرين.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [
      P('k-island-a1', 'drawer', 'Island drawer, top left', 'درج الجزيرة العلوي (يسار)', { group: 'island' }),
      P('k-island-a2', 'drawer', 'Island drawer, middle left', 'درج الجزيرة الأوسط (يسار)', { group: 'island' }),
      P('k-island-a3', 'drawer', 'Island drawer, bottom left', 'درج الجزيرة السفلي (يسار)', { group: 'island' }),
      P('k-island-b1', 'drawer', 'Island shallow drawer, right', 'درج الجزيرة الضحل (يمين)', { group: 'island' }),
      P('k-island-door', 'door', 'Island cupboard doors', 'أبواب خزانة الجزيرة', { group: 'island' }),
      P('k-run-d1', 'drawer', 'Wall run drawers, first bank', 'أدراج الوحدة الجدارية الأولى', { group: 'run' }),
      P('k-run-sink', 'door', 'Sink cupboard doors', 'أبواب وحدة الحوض', { group: 'run' }),
      P('k-run-d3', 'drawer', 'Wall run drawers, second bank', 'أدراج الوحدة الجدارية الثانية', { group: 'run' }),
      P('k-run-hob', 'drawer', 'Hob unit pan drawer', 'درج الأواني تحت الموقد', { group: 'run' }),
    ],
    views: [
      { id: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, pos: [3.9, 1.62, 0.2], look: [-1.0, 1.0, 0.1], fov: 52 },
      { id: 'island', label: { en: 'Island', ar: 'الجزيرة' }, pos: [2.5, 1.38, 0.7], look: [-0.1, 0.7, -0.1], fov: 46 },
      { id: 'drawers', label: { en: 'Inside the drawers', ar: 'داخل الأدراج' }, pos: [1.15, 1.85, 0.05], look: [0.5, 0.55, -0.66], fov: 48 },
      { id: 'detail', label: { en: 'Handle and LED close-up', ar: 'تفصيل المقبض والإضاءة' }, pos: [0.95, 1.12, -0.42], look: [0.22, 0.72, -0.62], fov: 40 },
    ],
  },
  wardrobe: {
    id: 'wardrobe', dept: 'wardrobes', interest: 'Wardrobe',
    name: { en: 'Sliding, hinged and glass wardrobe', ar: 'خزانة بأبواب منزلقة ومفصلية وزجاج' },
    kicker: { en: 'Wardrobes · sample configuration', ar: 'خزائن الملابس · نموذج تصميم' },
    spec: [
      { en: 'Sliding doors, hinged doors and smoked glass in a bronze frame.', ar: 'أبواب منزلقة ومفصلية وزجاج مدخّن بإطار برونزي.' },
      { en: 'Hanging rails, shelving and pull-out drawers inside.', ar: 'قضبان تعليق ورفوف وأدراج سحب في الداخل.' },
      { en: 'LED strips switch on as each section opens.', ar: 'شرائط LED تضيء عند فتح كل قسم.' },
      { en: 'Made to measure, designed, made and fitted in Bahrain.', ar: 'مصنوعة على المقاس: تصميم وتصنيع وتركيب في البحرين.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [
      P('w-slide-1', 'slider', 'Sliding door, left leaf', 'الباب المنزلق (الأيسر)', { group: 'slide' }),
      P('w-slide-2', 'slider', 'Sliding door, right leaf', 'الباب المنزلق (الأيمن)', { group: 'slide' }),
      P('w-hinge-l', 'door', 'Hinged door, left', 'الباب المفصلي (الأيسر)', { group: 'hinged' }),
      P('w-hinge-r', 'door', 'Hinged door, right', 'الباب المفصلي (الأيمن)', { group: 'hinged' }),
      P('w-glass-l', 'door', 'Smoked glass door, left', 'باب الزجاج المدخّن (الأيسر)', { group: 'glass' }),
      P('w-glass-r', 'door', 'Smoked glass door, right', 'باب الزجاج المدخّن (الأيمن)', { group: 'glass' }),
      P('w-drawer-1', 'drawer', 'Drawer 1 (top)', 'الدرج 1 (العلوي)', { group: 'drawers' }),
      P('w-drawer-2', 'drawer', 'Drawer 2', 'الدرج 2', { group: 'drawers' }),
      P('w-drawer-3', 'drawer', 'Drawer 3', 'الدرج 3', { group: 'drawers' }),
      P('w-drawer-4', 'drawer', 'Drawer 4 (bottom)', 'الدرج 4 (السفلي)', { group: 'drawers' }),
    ],
    views: [
      { id: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, pos: [3.6, 1.5, 0.0], look: [-2.2, 1.25, 0.0], fov: 54 },
      { id: 'interior', label: { en: 'Inside the doors', ar: 'داخل الأبواب' }, pos: [0.15, 1.5, -1.0], look: [-2.3, 1.25, -1.3], fov: 56 },
      { id: 'detail', label: { en: 'Drawers and pulls', ar: 'الأدراج والمقابض' }, pos: [-0.55, 1.0, 1.4], look: [-2.2, 0.62, 1.55], fov: 44 },
    ],
  },
  door: {
    id: 'door', dept: 'doors', interest: 'Doors',
    name: { en: 'Pivot interior door', ar: 'باب داخلي محوري' },
    kicker: { en: 'Doors · sample configuration', ar: 'الأبواب · نموذج تصميم' },
    spec: [
      { en: 'A statement pivot door with a solid frame and a brass pull.', ar: 'باب محوري بارز بإطار متين ومقبض نحاسي.' },
      { en: 'Concealed and standard hinges, soft-close systems, European locks and handles.', ar: 'مفصلات مخفية وعادية وأنظمة إغلاق هادئ وأقفال ومقابض أوروبية.' },
      { en: 'Every door is made to measure: we survey the opening and match the wood, finish and hardware.', ar: 'كل باب يُصنع على المقاس: نقيس الفتحة ونطابق الخشب والتشطيب والإكسسوارات.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [P('d-pivot', 'pivot', 'Pivot door', 'الباب المحوري', { group: 'door' })],
    views: [
      { id: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, pos: [3.4, 1.6, 0.0], look: [-2.3, 1.2, 0.0], fov: 52 },
      { id: 'detail', label: { en: 'Handle and hinge close-up', ar: 'تفصيل المقبض والمفصلة' }, pos: [0.1, 1.22, 0.62], look: [-1.2, 1.1, 0.4], fov: 38 },
    ],
  },
  bedroom: {
    id: 'bedroom', dept: 'bedroom', interest: 'Other',
    name: { en: 'Bedroom set with wardrobe wall', ar: 'غرفة نوم متكاملة مع جدار خزائن' },
    kicker: { en: 'Bedrooms · sample configuration', ar: 'غرف النوم · نموذج تصميم' },
    spec: [
      { en: 'Upholstered headboard panel and bed base, with floating bedside units.', ar: 'لوح رأس سرير منجّد وقاعدة سرير مع وحدات جانبية معلّقة.' },
      { en: 'Dressing unit with a mirror and drawers.', ar: 'وحدة تزيين بمرآة وأدراج.' },
      { en: 'A wardrobe wall in the same finish, with hanging rails, shelving and LED.', ar: 'جدار خزائن بنفس التشطيب مع قضبان تعليق ورفوف وإضاءة LED.' },
      { en: 'Made to measure, designed, made and fitted in Bahrain.', ar: 'مصنوعة على المقاس: تصميم وتصنيع وتركيب في البحرين.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [
      P('bd-ward-a', 'door', 'Wardrobe wall, hanging section doors', 'جدار الخزائن: أبواب قسم التعليق', { group: 'wardrobe' }),
      P('bd-ward-b', 'door', 'Wardrobe wall, shelving section doors', 'جدار الخزائن: أبواب قسم الرفوف', { group: 'wardrobe' }),
      P('bd-bs-l1', 'drawer', 'Left bedside, top drawer', 'الوحدة الجانبية اليسرى: الدرج العلوي', { group: 'bedside' }),
      P('bd-bs-l2', 'drawer', 'Left bedside, bottom drawer', 'الوحدة الجانبية اليسرى: الدرج السفلي', { group: 'bedside' }),
      P('bd-bs-r1', 'drawer', 'Right bedside, top drawer', 'الوحدة الجانبية اليمنى: الدرج العلوي', { group: 'bedside' }),
      P('bd-bs-r2', 'drawer', 'Right bedside, bottom drawer', 'الوحدة الجانبية اليمنى: الدرج السفلي', { group: 'bedside' }),
      P('bd-van-1', 'drawer', 'Dressing unit, top drawer', 'وحدة التزيين: الدرج العلوي', { group: 'vanity' }),
      P('bd-van-2', 'drawer', 'Dressing unit, bottom drawer', 'وحدة التزيين: الدرج السفلي', { group: 'vanity' }),
    ],
    views: [
      { id: 'overview', label: { en: 'Whole room', ar: 'الغرفة كاملة' }, pos: [3.9, 1.65, 0.1], look: [-1.8, 0.95, 0.1], fov: 56 },
      { id: 'bed', label: { en: 'Bed and bedsides', ar: 'السرير والوحدات الجانبية' }, pos: [1.1, 1.45, 0.4], look: [-2.4, 0.7, 0.3], fov: 50 },
      { id: 'wardrobe', label: { en: 'Wardrobe wall', ar: 'جدار الخزائن' }, pos: [0.2, 1.5, -2.2], look: [-2.5, 1.2, -2.2], fov: 54 },
      { id: 'dressing', label: { en: 'Dressing unit and mirror', ar: 'وحدة التزيين والمرآة' }, pos: [0.0, 1.35, 2.5], look: [-2.6, 1.0, 2.6], fov: 50 },
    ],
  },
  walkin: {
    id: 'walkin', dept: 'walkin', interest: 'Walk-In Closet',
    name: { en: 'Walk-in closet with island', ar: 'غرفة ملابس مع جزيرة أدراج' },
    kicker: { en: 'Walk-in Closets · sample configuration', ar: 'غرف الملابس · نموذج تصميم' },
    spec: [
      { en: 'An island of drawers with pull-out accessory trays.', ar: 'جزيرة أدراج مع صواني إكسسوارات قابلة للسحب.' },
      { en: 'Glass display cabinets with LED, a shoe wall with tilting shelves, hanging rails and a mirror.', ar: 'خزائن عرض زجاجية بإضاءة LED وجدار أحذية برفوف مائلة وقضبان تعليق ومرآة.' },
      { en: 'Integrated LED lighting that follows the doors and drawers.', ar: 'إضاءة LED مدمجة تتبع فتح الأبواب والأدراج.' },
      { en: 'Made to measure, designed, made and fitted in Bahrain.', ar: 'مصنوعة على المقاس: تصميم وتصنيع وتركيب في البحرين.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [
      P('wi-shoe-1', 'tilt', 'Shoe wall, tilting shelf 1 (top)', 'جدار الأحذية: الرف المائل 1 (العلوي)', { group: 'shoes' }),
      P('wi-shoe-2', 'tilt', 'Shoe wall, tilting shelf 2', 'جدار الأحذية: الرف المائل 2', { group: 'shoes' }),
      P('wi-shoe-3', 'tilt', 'Shoe wall, tilting shelf 3', 'جدار الأحذية: الرف المائل 3', { group: 'shoes' }),
      P('wi-shoe-4', 'tilt', 'Shoe wall, tilting shelf 4 (bottom)', 'جدار الأحذية: الرف المائل 4 (السفلي)', { group: 'shoes' }),
      P('wi-glass-a', 'door', 'Glass display cabinet, left', 'خزانة العرض الزجاجية (اليسرى)', { group: 'display' }),
      P('wi-glass-b', 'door', 'Glass display cabinet, right', 'خزانة العرض الزجاجية (اليمنى)', { group: 'display' }),
      P('wi-tray-1', 'tray', 'Island accessory tray, left', 'صينية إكسسوارات الجزيرة (يسار)', { group: 'island' }),
      P('wi-tray-2', 'tray', 'Island accessory tray, right', 'صينية إكسسوارات الجزيرة (يمين)', { group: 'island' }),
      P('wi-isl-1', 'drawer', 'Island drawer, upper left', 'درج الجزيرة العلوي (يسار)', { group: 'island' }),
      P('wi-isl-2', 'drawer', 'Island drawer, upper right', 'درج الجزيرة العلوي (يمين)', { group: 'island' }),
      P('wi-isl-3', 'drawer', 'Island drawer, lower left', 'درج الجزيرة السفلي (يسار)', { group: 'island' }),
      P('wi-isl-4', 'drawer', 'Island drawer, lower right', 'درج الجزيرة السفلي (يمين)', { group: 'island' }),
    ],
    views: [
      { id: 'overview', label: { en: 'Whole closet', ar: 'الغرفة كاملة' }, pos: [3.9, 1.65, 0.0], look: [-1.8, 1.1, 0.0], fov: 56 },
      { id: 'island', label: { en: 'Island and trays', ar: 'الجزيرة والصواني' }, pos: [1.9, 1.75, 0.0], look: [-0.8, 0.75, 0.0], fov: 46 },
      { id: 'shoes', label: { en: 'Shoe wall', ar: 'جدار الأحذية' }, pos: [0.0, 1.45, -1.5], look: [-2.5, 1.1, -2.4], fov: 50 },
      { id: 'display', label: { en: 'Glass display', ar: 'خزائن العرض' }, pos: [0.0, 1.5, 1.0], look: [-2.5, 1.35, 1.2], fov: 46 },
    ],
  },
  living: {
    id: 'living', dept: 'living', interest: 'TV Unit',
    name: { en: 'TV unit and media wall', ar: 'وحدة تلفاز وجدار وسائط' },
    kicker: { en: 'Living · sample configuration', ar: 'غرف المعيشة · نموذج تصميم' },
    spec: [
      { en: 'A media wall with a TV unit, doors and drawers, slat wall panels and floating shelves.', ar: 'جدار وسائط بوحدة تلفاز وأبواب وأدراج وألواح جدارية مشقوقة ورفوف معلّقة.' },
      { en: 'LED backlight behind the panels and inside the display cabinet.', ar: 'إضاءة LED خلفية خلف الألواح وداخل خزانة العرض.' },
      { en: 'Shown with a console, lounge seating and a rug as styling.', ar: 'معروضة مع كونسول ومقاعد جلوس وسجادة كعناصر تنسيق.' },
      { en: 'Made to measure, designed, made and fitted in Bahrain.', ar: 'مصنوعة على المقاس: تصميم وتصنيع وتركيب في البحرين.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [
      P('lv-base-l', 'door', 'TV unit, left doors', 'وحدة التلفاز: الأبواب اليسرى', { group: 'tv' }),
      P('lv-base-r', 'door', 'TV unit, right doors', 'وحدة التلفاز: الأبواب اليمنى', { group: 'tv' }),
      P('lv-drawer-1', 'drawer', 'TV unit, top drawer', 'وحدة التلفاز: الدرج العلوي', { group: 'tv' }),
      P('lv-drawer-2', 'drawer', 'TV unit, bottom drawer', 'وحدة التلفاز: الدرج السفلي', { group: 'tv' }),
      P('lv-tall-l', 'door', 'Tall cabinet doors', 'أبواب الخزانة الطويلة', { group: 'tall' }),
      P('lv-tall-r', 'door', 'Glass display cabinet doors', 'أبواب خزانة العرض الزجاجية', { group: 'tall' }),
      P('lv-console', 'drawer', 'Console drawer', 'درج الكونسول', { group: 'console' }),
    ],
    views: [
      { id: 'overview', label: { en: 'Whole room', ar: 'الغرفة كاملة' }, pos: [3.9, 1.6, 0.0], look: [-2.2, 1.2, 0.0], fov: 56 },
      { id: 'tv', label: { en: 'TV unit', ar: 'وحدة التلفاز' }, pos: [1.3, 1.9, 0.0], look: [-2.6, 1.0, 0.0], fov: 50 },
      { id: 'display', label: { en: 'Display cabinet', ar: 'خزانة العرض' }, pos: [0.0, 1.5, 1.9], look: [-2.6, 1.3, 2.5], fov: 48 },
      { id: 'lounge', label: { en: 'Seating and console', ar: 'الجلوس والكونسول' }, pos: [3.5, 1.7, 2.6], look: [-0.4, 0.5, -0.3], fov: 56 },
    ],
  },
  studio: {
    id: 'studio', dept: 'studio', interest: 'Other',
    name: { en: 'Design table and sample wall', ar: 'طاولة تصميم وجدار عينات' },
    kicker: { en: 'Custom Studio · sample configuration', ar: 'استوديو التصميم · نموذج تصميم' },
    spec: [
      { en: 'A design table and a wall of material and finish samples.', ar: 'طاولة تصميم وجدار من عينات الخامات والتشطيبات.' },
      { en: 'The samples show the finishes of our kitchens, wardrobes and doors.', ar: 'تعرض العينات تشطيبات المطابخ والخزائن والأبواب لدينا.' },
      { en: 'A screen introduces the Design Studio; open it to plan your own room.', ar: 'شاشة تعرّف باستوديو التصميم؛ افتحه لتصميم غرفتك.' },
      { en: 'Made to measure, designed, made and fitted in Bahrain.', ar: 'مصنوعة على المقاس: تصميم وتصنيع وتركيب في البحرين.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [
      P('st-table-1', 'drawer', 'Design table, left drawer', 'طاولة التصميم: الدرج الأيسر', { group: 'table' }),
      P('st-table-2', 'drawer', 'Design table, right drawer', 'طاولة التصميم: الدرج الأيمن', { group: 'table' }),
      P('st-sample-1', 'drawer', 'Sample drawer 1', 'درج العينات 1', { group: 'samples' }),
      P('st-sample-2', 'drawer', 'Sample drawer 2', 'درج العينات 2', { group: 'samples' }),
      P('st-sample-3', 'drawer', 'Sample drawer 3', 'درج العينات 3', { group: 'samples' }),
      P('st-rail-1', 'slider', 'Sample rail, left panel', 'سكة العينات: اللوح الأيسر', { group: 'rails' }),
      P('st-rail-2', 'slider', 'Sample rail, right panel', 'سكة العينات: اللوح الأيمن', { group: 'rails' }),
    ],
    views: [
      { id: 'overview', label: { en: 'Whole studio', ar: 'الاستوديو كاملاً' }, pos: [3.9, 1.65, 0.0], look: [-2.0, 1.2, 0.0], fov: 56 },
      { id: 'board', label: { en: 'Sample board', ar: 'لوح العينات' }, pos: [0.6, 1.55, -2.0], look: [-2.6, 1.55, -2.0], fov: 52 },
      { id: 'screen', label: { en: 'Design Studio screen', ar: 'شاشة استوديو التصميم' }, pos: [0.4, 1.55, 2.5], look: [-2.6, 1.5, 2.5], fov: 44 },
      { id: 'table', label: { en: 'Design table', ar: 'طاولة التصميم' }, pos: [2.4, 1.9, 0.6], look: [-1.0, 0.8, 0.0], fov: 50 },
    ],
  },
  lounge: {
    id: 'lounge', dept: 'lounge', interest: 'Other', cta: 'consult',
    name: { en: 'Reception and consultation lounge', ar: 'الاستقبال وصالة الاستشارات' },
    kicker: { en: 'Consultation Lounge · sample configuration', ar: 'صالة الاستشارات · نموذج تصميم' },
    spec: [
      { en: 'A reception desk, lounge seating and a credenza, in one finish.', ar: 'مكتب استقبال ومقاعد جلوس وخزانة جانبية بتشطيب واحد.' },
      { en: 'Book a free design consultation: the button opens our booking page.', ar: 'احجز استشارة تصميم مجانية: يفتح الزر صفحة الحجز لدينا.' },
      { en: 'Made to measure, designed, made and fitted in Bahrain.', ar: 'مصنوعة على المقاس: تصميم وتصنيع وتركيب في البحرين.' },
      { en: `${WARRANTY_YEARS} years on cabinetry and soft-close hardware.`, ar: `${WARRANTY_YEARS} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    ],
    parts: [
      P('lg-desk-1', 'drawer', 'Reception desk, left drawer', 'مكتب الاستقبال: الدرج الأيسر', { group: 'desk' }),
      P('lg-desk-2', 'drawer', 'Reception desk, right drawer', 'مكتب الاستقبال: الدرج الأيمن', { group: 'desk' }),
      P('lg-cred-doors', 'door', 'Credenza doors', 'أبواب الخزانة الجانبية', { group: 'credenza' }),
      P('lg-cred-d1', 'drawer', 'Credenza drawer, top', 'درج الخزانة الجانبية العلوي', { group: 'credenza' }),
      P('lg-cred-d2', 'drawer', 'Credenza drawer, bottom', 'درج الخزانة الجانبية السفلي', { group: 'credenza' }),
    ],
    views: [
      { id: 'overview', label: { en: 'Whole lounge', ar: 'الصالة كاملة' }, pos: [3.9, 1.65, 0.0], look: [-1.8, 1.1, 0.0], fov: 56 },
      { id: 'desk', label: { en: 'Reception desk', ar: 'مكتب الاستقبال' }, pos: [1.9, 1.5, 0.2], look: [-2.2, 0.9, -0.3], fov: 50 },
      { id: 'cta', label: { en: 'Consultation panel', ar: 'لوحة الاستشارة' }, pos: [0.4, 1.7, 2.1], look: [-2.6, 1.7, 2.1], fov: 46 },
      { id: 'seating', label: { en: 'Lounge seating', ar: 'منطقة الجلوس' }, pos: [3.6, 1.7, -2.4], look: [-0.5, 0.5, 2.0], fov: 54 },
    ],
  },
};

export const PRODUCT_LIST = Object.values(PRODUCTS);
export const productForDept = (deptId) => PRODUCT_LIST.find((p) => p.dept === deptId) || null;
export const nameOf = (o, lang) => (lang === 'ar' ? o.ar || o.en : o.en);

/** the movers + finishes of a product in the shape createProductState() expects */
export function stateDef(product, finishes) {
  const p = PRODUCTS[product]; return { id: p.id, parts: p.parts.map((x) => ({ id: x.id, kind: x.kind })), finishes, ledOn: true };
}

/** local product frame -> world, for a bay from layoutBays() (right-hand bays face -x, i.e. the frame is rotated by PI about Y) */
export function toWorld(bay, p) {
  const s = bay.facing;                        // +1 left bays (face +x), -1 right bays
  return [bay.x + s * p[0], p[1], bay.z + s * p[2]];
}
/** a view's camera pose in world space */
export function viewWorld(bay, view) { return { pos: toWorld(bay, view.pos), look: toWorld(bay, view.look), fov: view.fov }; }

/** the hall-wide stage zone for the campaign (centre of the nave); the bay zones live in navigation/interaction.js */
export const STAGE = { id: 'ikhtarha', x: 0, z: -20.5, radius: 2.7, zone: { minX: -5.2, maxX: 5.2, minZ: -25.2, maxZ: -15.8 } };
export { HALL, BAY };

/** camera views of the Ikhtarha stage (world space, metres; there is no bay frame for the stage) */
export const STAGE_VIEWS = [
  { id: 'overview', label: { en: 'Stage', ar: 'المنصة' }, pos: [0, 1.6, -15.9], look: [0, 1.7, -23.0], fov: 52 },
  { id: 'boxes', label: { en: 'Gift boxes', ar: 'صناديق الهدايا' }, pos: [1.9, 1.25, -17.9], look: [0.1, 0.55, -20.4], fov: 46 },
  { id: 'screen', label: { en: 'Screen', ar: 'الشاشة' }, pos: [0, 1.7, -19.2], look: [0, 1.9, -23.4], fov: 46 },
];
