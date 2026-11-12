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
