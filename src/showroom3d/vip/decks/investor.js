/* Two decks for Bloom Meeting's investors, built ONLY from content already committed in the repo (the same facts the Haneen AI fact sheet marks 'confirmed'; src/showroom3d/investor/factsheet.js):
 *   'investor'      "Investor welcome": overview, factories, products and collections, markets, technology, team, contact. Anything not confirmed by management shows the standing
 *                   placeholder "To be confirmed by management" instead of a figure. No financials, returns, valuation or forecasts.
 *   'factory-tour'  "Factory tour": the factory floor, the machinery and the systems, from the Closets company profile deck's own photos and wording (no capacity figure).
 * The disclaimer slide is appended by withDisclaimer (decks/index.js). Arabic awaits native review. */
import { PLACEHOLDER } from '../deckSchema';
import { FACTS } from '../../vendor/facts';
import { COLLECTIONS } from '../../collections/data';

const T = (en, ar) => ({ en, ar });
const IMG = (name, alt, caption) => ({ type: 'image', url: `/yas-bloom/profile/${name}.webp`, alt, ...(caption ? { caption } : {}) });
const CP = (pp) => T(`The Closets Company Profile, ${/[-,]/.test(pp) ? 'pp.' : 'p.'} ${pp}`, `ملف شركة الخزائن، ص ${pp}`);
const YP = (pp) => T(`YAS Wood profile, p. ${pp}`, `ملف YAS Wood، ص ${pp}`);
const finishes = COLLECTIONS[0] && COLLECTIONS[0].images ? COLLECTIONS[0].images.length : 0;

export const INVESTOR_DECK_ID = 'investor';
export const INVESTOR_DECK = {
  id: INVESTOR_DECK_ID, unit: 'slide', builtin: true,
  title: T('Investor welcome', 'ترحيب المستثمرين'),
  slides: [
    { id: 'welcome', layout: 'hero', accent: 'brass', title: T('Welcome to YAS Factory and The Closets', 'أهلاً بكم في مصنع YAS والخزائن'),
      lead: T('Haneen AI answers questions from confirmed company information only.', 'تجيب حنين AI من معلومات الشركة المؤكَّدة فقط.'),
      blocks: [IMG('closets-factory-aerial', T('Overhead view of The Closets factory floor', 'منظر علوي لأرضية مصنع الخزائن'))], source: CP('1-2') },
    { id: 'overview', accent: 'orange', title: T('Company overview', 'نظرة عامة على الشركة'),
      bullets: [
        T('The Closets Co. makes and installs custom closets and kitchens in Bahrain.', 'تصنّع الخزائن وتركّب الخزائن والمطابخ المخصصة في البحرين.'),
        T('The profile states it was established in 2007.', 'يذكر الملف أنها تأسست عام 2007.'),
        T('YAS Wood, a sister company in YAS Holding, supplies decorative surfaces and faced panels.', 'YAS Wood، شركة شقيقة في YAS Holding، تقدّم أسطحًا زخرفية وألواحًا مكسوّة.'),
      ], source: CP('2') },
    { id: 'factories', accent: 'brass', title: T('Factory and quality', 'المصنع والجودة'),
      bullets: [
        T('The Closets factory is in Askar, Bahrain, with automated panel processing.', 'يقع مصنع الخزائن في عسكر بالبحرين ويعتمد معالجة آلية للألواح.'),
        T('Cutting, edging, boring and carcass assembly are done in-house.', 'القص والتحديد والثقب وتجميع الهياكل تتم داخل المصنع.'),
        T('The profile lists an ISO 9001 quality management system.', 'يذكر الملف نظام إدارة الجودة ISO 9001.'),
        T(`Number of factories and capacity: ${PLACEHOLDER.en}.`, `عدد المصانع والطاقة الإنتاجية: ${PLACEHOLDER.ar}.`),
      ], blocks: [IMG('closets-factory-floor', T('The factory floor with panel saws and stacked boards', 'أرضية المصنع مع مناشير الألواح'))], source: CP('6, 16') },
    { id: 'products', accent: 'sage', title: T('Products and collections', 'المنتجات والمجموعات'),
      bullets: [
        T('Closets, kitchens, floorings, bedrooms, pantries, TV units and living rooms, per the profile.', 'خزائن ومطابخ وأرضيات وغرف نوم ومخازن ووحدات تلفاز وغرف معيشة، حسب الملف.'),
        finishes ? T(`The YAS Wood Collection shows ${finishes} finishes on the showroom Collections wall.`, `تعرض مجموعة YAS Wood ${finishes} تشطيبًا على جدار المجموعات.`) : T('The YAS Wood Collection is on the showroom Collections wall.', 'مجموعة YAS Wood على جدار المجموعات.'),
        T(`${FACTS.warrantyYears} years of warranty on cabinetry and soft-close hardware is standard.`, `الكفالة المعتمدة ${FACTS.warrantyYears} سنوات على الخزائن ومفصلات الإغلاق الهادئ.`),
      ], blocks: [IMG('closets-kitchen', T('A fitted kitchen with an island', 'مطبخ مركّب مع جزيرة وسطية'))], source: CP('7-15') },
    { id: 'markets', accent: 'orange', title: T('Markets', 'الأسواق'),
      bullets: [
        T('The profile lists headquarters and showrooms in Bahrain, Saudi Arabia and Qatar.', 'يذكر الملف مقرًا ومعارض في البحرين والسعودية وقطر.'),
        T('It is an older document; the team confirms today\'s footprint.', 'وهو ملف أقدم؛ ويؤكد الفريق الوضع الحالي.'),
        T(`Other markets and distribution agreements: ${PLACEHOLDER.en}.`, `الأسواق الأخرى واتفاقيات التوزيع: ${PLACEHOLDER.ar}.`),
      ], source: CP('2, 4') },
    { id: 'technology', accent: 'brass', title: T('Technology', 'التقنية'),
      bullets: [
        T('ERP, CAD and CAD+T systems link design to manufacturing data.', 'أنظمة ERP وCAD وCAD+T تربط التصميم ببيانات التصنيع.'),
        T('Bonsai Hub is the company\'s own platform for running operations.', 'Bonsai Hub هي منصة الشركة الخاصة لإدارة العمليات.'),
        T(`Patents and intellectual property: ${PLACEHOLDER.en}.`, `براءات الاختراع والملكية الفكرية: ${PLACEHOLDER.ar}.`),
      ], source: CP('19') },
    { id: 'team', accent: 'sage', title: T('Team', 'الفريق'),
      bullets: [T(`Leadership team and titles: ${PLACEHOLDER.en}.`, `فريق القيادة والمسميات: ${PLACEHOLDER.ar}.`), T('Names and titles will be added by management.', 'ستضيف الإدارة الأسماء والمسميات.')], source: T('Placeholder until management supplies the wording', 'عنصر نائب إلى أن تزوّد الإدارة بالصياغة') },
    { id: 'contact', accent: 'orange', title: T('Talk to the team', 'تحدّث مع الفريق'),
      bullets: [
        T(`Phone ${FACTS.phone} (WhatsApp works too) or ${FACTS.email}.`, `الهاتف ${FACTS.phone} (وواتساب متاح) أو ${FACTS.email}.`),
        T(`Hours: ${FACTS.hours.en}.`, `ساعات العمل: ${FACTS.hours.ar}.`),
        T('Ask Haneen AI to request a meeting with the team.', 'اطلب من حنين AI ترتيب اجتماع مع الفريق.'),
      ], source: T('Company contact details (vendor/facts.js)', 'بيانات التواصل للشركة (vendor/facts.js)') },
  ],
};

export const FACTORY_TOUR_DECK_ID = 'factory-tour';
export const FACTORY_TOUR_DECK = {
  id: FACTORY_TOUR_DECK_ID, unit: 'slide', builtin: true,
  title: T('Factory tour', 'جولة المصنع'),
  slides: [
    { id: 'tour-cover', layout: 'hero', accent: 'orange', title: T('Factory tour', 'جولة المصنع'), lead: T('The factory in Askar, its machinery and its systems.', 'المصنع في عسكر وآلاته وأنظمته.'),
      blocks: [IMG('closets-factory-aerial', T('Overhead view of The Closets factory floor with panel-processing machinery', 'منظر علوي لأرضية مصنع الخزائن مع آلات معالجة الألواح'))], source: CP('1-2, 16') },
    { id: 'tour-floor', accent: 'orange', title: T('The factory floor', 'أرضية المصنع'),
      bullets: [T('Located in Askar.', 'يقع في عسكر.'), T('Automated panel processing on a large scale.', 'معالجة آلية للألواح على نطاق واسع.'), T('In-house cutting, edging, boring and carcass assembly.', 'قص وتحديد وثقب وتجميع الهياكل داخليًا.'), T('Doors made in-house, or bought for specialist finishes.', 'أبواب تُصنع داخليًا أو تُشترى للتشطيبات الخاصة.')],
      blocks: [IMG('closets-factory-floor', T('The factory floor with panel saws and stacked boards', 'أرضية المصنع مع مناشير الألواح ولوحات مكدّسة'))], source: CP('16') },
    { id: 'tour-machines', accent: 'brass', title: T('Machinery', 'الآلات'),
      bullets: [T('SCHELLING FH4, HOMAG-BRANDT, SCM CNC, CPC packaging line.', 'SCHELLING FH4 وHOMAG-BRANDT وSCM CNC وخط التغليف CPC.'), T('SCM automatic cabinet assembly clamps and drilling machine CYFLEX HP.', 'مشابك التجميع الآلي SCM وماكينة الثقب CYFLEX HP.'), T('Quality tests conform to international standards.', 'اختبارات جودة تتوافق مع المعايير الدولية.')],
      blocks: [IMG('closets-machine', T('A technician at an edge-banding line in the factory', 'فني عند خط تحديد الحواف في المصنع'))], source: CP('18') },
    { id: 'tour-systems', accent: 'sage', title: T('Systems', 'الأنظمة'),
      bullets: [T('ERP system: an integrated view of core business processes.', 'نظام ERP: رؤية متكاملة لعمليات الأعمال الأساسية.'), T('CAD+T and CAD: faster, better designs.', 'CAD+T وCAD: تصاميم أسرع وأفضل.'), T('CAD data builds a database for manufacturing.', 'بيانات CAD تبني قاعدة بيانات للتصنيع.'), T(`Capacity and number of factories: ${PLACEHOLDER.en}.`, `الطاقة الإنتاجية وعدد المصانع: ${PLACEHOLDER.ar}.`)], source: CP('19') },
  ],
};
