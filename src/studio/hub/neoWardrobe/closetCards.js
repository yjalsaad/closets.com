/* Neo Wardrobe Studio [NEO-CLOSETS-UX25] - the numbered rows of the Global tab cards (the owner's closet wording). Ranges / steps / defaults come from ONE table,
 * wardrobeModel.WFIELD, so the field, the clamp in normalizeX and the card text can never disagree. The shapes are the Neo Kitchen CARDS entries
 * ({ id, en, ar, d, f: [{ k, en, ar, d, min, max, step }] }) so the kitchen's CarcassCard / DoorsCard / DrawersCard / CardRows render them unchanged. */
import { WFIELD } from './wardrobeModel';

const row = (k, en, ar, dEn, dAr) => ({ k, en, ar, d: { en: dEn, ar: dAr }, min: WFIELD[k].min, max: WFIELD[k].max, step: WFIELD[k].step, def: WFIELD[k].def });

export const CLOSET_CARDS = {
  heights: {
    id: 'heights', en: 'Heights and depths', ar: 'الارتفاعات والأعماق',
    d: { en: 'The closet from the front and from the side - one height scale, every value pinned.', ar: 'الخزانة من الأمام ومن الجانب - بمقياس ارتفاع واحد وكل قيمة مثبتة.' },
    f: [
      row('plinthH', 'Plinth height', 'ارتفاع القاعدة', 'The recessed base the closet stands on.', 'القاعدة المتراجعة التي تقف عليها الخزانة.'),
      { k: 'bodyH', en: 'Body height', ar: 'ارتفاع الهيكل', readOnly: true, d: { en: 'Carcass between the plinth and the top box (follows the overall height).', ar: 'الهيكل بين القاعدة والصندوق العلوي (يتبع الارتفاع الكلي).' } },
      row('topBoxH', 'Top box height', 'ارتفاع الصندوق العلوي', 'The loft above a fixed board - 0 = no top box.', 'الدور العلوي فوق لوح ثابت - 0 = بدون صندوق علوي.'),
      { k: 'depth', en: 'Closet depth', ar: 'عمق الخزانة', step: 10, d: { en: 'Carcass depth, wall to front face.', ar: 'عمق الهيكل من الحائط إلى الواجهة الأمامية.' } }, // range = the rules' depth range (set by the card)
      row('plinthSetback', 'Plinth setback', 'تراجع القاعدة', 'How far the plinth is recessed behind the front line.', 'مقدار تراجع القاعدة خلف خط الواجهة.'),
    ],
  },
  carcass: {
    id: 'carcass', en: 'Carcass Boards', ar: 'ألواح الهيكل',
    d: { en: 'The boards every box is cut from — and the groove the back board sits in.', ar: 'الألواح التي يُقصّ منها كل صندوق — والمجرى الذي يجلس فيه لوح الظهر.' },
    f: [
      row('board', 'Carcass board', 'لوح الهيكل', 'Sides, top, bottom and dividers.', 'الجوانب والسقف والقاعدة والفواصل.'),
      row('back', 'Back board', 'لوح الظهر', 'The thin back panel.', 'لوح الظهر الرقيق.'),
      row('inset', 'Back inset', 'تراجع الظهر', 'Back panel distance from the rear edge (groove position; 0 = flush, no groove).', 'بعد لوح الظهر عن الحافة الخلفية (موضع المجرى؛ 0 = مستوٍ بلا مجرى).'),
    ],
  },
  doors: {
    id: 'doors', en: 'Doors & Hinges', ar: 'الأبواب والمفصلات',
    d: { en: 'Front boards, their gaps, and where the hinge cups are drilled — one door open to show its thickness and cups.', ar: 'ألواح الواجهات وفراغاتها ومواضع ثقوب كوب المفصلة — باب مفتوح يُظهر سماكته والكوبات.' },
    f: [
      row('doorThk', 'Door / front board', 'لوح الباب / الواجهة', 'Door and drawer-front thickness.', 'سماكة الباب وواجهة الدرج.'),
      row('doorGap', 'Door gap', 'فراغ الباب', 'Reveal between leaves and around the carcass.', 'الفراغ بين الضلف وحول الهيكل.'),
      row('hingeCup', 'Hinge cup Ø', 'قطر كوب المفصلة Ø', 'Cup bore diameter (35 mm is standard).', 'قطر ثقب الكوب (35 مم هو القياسي).'),
      row('cupEdge', 'Cup edge distance', 'مسافة حافة الكوب', 'From the door edge to the cup rim.', 'من حافة الباب إلى حافة الكوب.'),
    ],
  },
  drawers: {
    id: 'drawers', en: 'Drawers', ar: 'الأدراج',
    d: { en: 'The drawer box in its opening: the gap between fronts, the runner clearance per side, the bottom groove, the front side gap.', ar: 'صندوق الدرج في فتحته: الفراغ بين الواجهات وخلوص السكة لكل جانب ومجرى القاع والفراغ الجانبي للواجهة.' },
    f: [
      row('drawerGap', 'Drawer vertical gap', 'الفراغ العمودي للأدراج', 'Reveal between stacked drawer fronts.', 'الفراغ بين واجهات الأدراج المتراصة.'),
      row('drawerSide', 'Drawer side clearance', 'خلوص جانب الدرج', 'Space per side for the runner between box and carcass.', 'المسافة لكل جانب للسكة بين الصندوق والهيكل.'),
      row('drawerBottom', 'Drawer bottom inset', 'تراجع قاع الدرج', 'Height of the bottom groove above the box edge.', 'ارتفاع مجرى القاع فوق حافة الصندوق.'),
      row('drawerFrontSide', 'Front side gap', 'الفراغ الجانبي للواجهة', 'Gap each side between a drawer front and the column sides.', 'الفراغ على كل جانب بين واجهة الدرج وجوانب العمود.'),
    ],
  },
  shelves: {
    id: 'shelves', en: 'Shelves & Rails', ar: 'الرفوف والمعالق',
    d: { en: 'The shelf board, and the hanging rail that sits under the top of a rail zone.', ar: 'لوح الرف، ومعلاق التعليق الذي يجلس أسفل أعلى منطقة التعليق.' },
    f: [
      row('shelfThk', 'Shelf board', 'لوح الرف', 'Thickness of adjustable and fixed shelves.', 'سماكة الرفوف المتحركة والثابتة.'),
      row('railDia', 'Rail Ø', 'قطر المعلاق Ø', 'Hanging rail tube diameter.', 'قطر ماسورة معلاق التعليق.'),
      row('railDrop', 'Rail drop', 'نزول المعلاق', 'Rail centre below the top of its zone.', 'مركز المعلاق أسفل أعلى منطقته.'),
      row('railH', 'Rail height - from floor', 'ارتفاع المعلاق - من الأرض', 'Every rail without its own value; 0 = standard (short zone 1000, long zone 1700), never above the rail drop.', 'لكل معلاق بلا قيمة خاصة؛ 0 = القياسي (منطقة قصيرة 1000، طويلة 1700)، ولا يعلو أبدًا عن نزول المعلاق.'),
    ],
  },
};

/** the numeric keys the cards read out of the wardrobe's x (+ the depth, which lives in design.dims) as the kitchen-style `g` the shared rows / diagrams / issue lists expect */
export const CARD_KEYS = Object.keys(WFIELD);
