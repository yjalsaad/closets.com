/* "YAS Profile (2023)": the owner's YAS WOOD profile PDF (18 pages), condensed. TRUSTED, committed content; every fact is in the PDF (PDF page numbers in each slide's `source`).
 * Omitted on purpose: QR codes, the lifestyle photo with people (p5 of the images), partner certificate contents (listed for the owner to confirm in docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md).
 * Arabic is a faithful translation awaiting native review. Photos: public/yas-bloom/profile. */
const T = (en, ar) => ({ en, ar });
const SRC = (pp) => T(`YAS Wood Profile 2023, ${/[-,]/.test(pp) ? 'pp.' : 'p.'} ${pp}`, `ملف YAS Wood لعام 2023، ص ${pp}`);
const IMG = (name, alt, caption) => ({ type: 'image', url: `/yas-bloom/profile/${name}.webp`, alt, ...(caption ? { caption } : {}) });
const decorRows = (rows) => rows.map(([code, name]) => [T(code, code), T(name, name)]);

export const YAS_PROFILE_DECK = {
  id: 'yas-profile', unit: 'slide', builtin: true,
  title: T('YAS Profile (2023)', 'ملف YAS (2023)'),
  slides: [
    { id: 'cover', layout: 'hero', accent: 'brass', title: T('YAS Wood: Profile 2023', 'YAS Wood: ملف 2023'),
      lead: T('Surfaces and solutions for furniture and interior design.', 'أسطح وحلول للأثاث والتصميم الداخلي.'),
      bullets: [T('From the YAS Wood profile supplied by management.', 'من ملف YAS Wood المقدَّم من الإدارة.')],
      blocks: [IMG('yas-cover', T('A bright room with a light sideboard, from the YAS Wood profile cover', 'غرفة مضيئة مع بوفيه فاتح، من غلاف ملف YAS Wood'))],
      source: T('YAS Wood Profile 2023, p. 1. Arabic text awaits native review.', 'ملف YAS Wood لعام 2023، ص 1. النص العربي بانتظار مراجعة ناطق أصلي.') },
    { id: 'intro', accent: 'brass', title: T('Introduction', 'مقدمة'),
      bullets: [
        T('Surfaces and solutions for furniture and interior design.', 'أسطح وحلول للأثاث والتصميم الداخلي.'),
        T('Faced panels, laminates and edges made with advanced technologies.', 'ألواح مكسوّة ولامينيت وحواف بتقنيات متقدمة.'),
        T('Delivering products and services since 2007.', 'تقدّم منتجاتها وخدماتها منذ عام 2007.'),
        T('A subsidiary of YAS Holding; sister company of The Closets.', 'تابعة لـ YAS Holding؛ وشقيقة لشركة الخزائن.'),
      ],
      blocks: [IMG('yas-lounge', T('A light-oak cabinet by a window', 'خزانة من خشب البلوط الفاتح عند نافذة'))], source: SRC('2') },
    { id: 'mission-vision', accent: 'sage', title: T('Mission and vision', 'الرسالة والرؤية'),
      bullets: [
        T('Mission: innovative surfaces and solutions for furniture and interiors.', 'الرسالة: أسطح وحلول مبتكرة للأثاث والتصميم الداخلي.'),
        T('Mission: keep researching and developing to exceed expectations.', 'الرسالة: مواصلة البحث والتطوير لتجاوز التوقعات.'),
        T('Vision: the leading provider in the Middle East and beyond.', 'الرؤية: المزوّد الرائد في الشرق الأوسط وخارجه.'),
      ], blocks: [IMG('yas-mission', T('A light-oak door beside a dark console', 'باب من البلوط الفاتح بجانب كونسول داكن'))], source: SRC('3') },
    { id: 'product', accent: 'brass', title: T('The product', 'المنتج'),
      bullets: [
        T('Wood-based faced panels covered with decorative papers, foil, PP or PET.', 'ألواح مكسوّة أساسها خشبي مغطاة بأوراق زخرفية أو فويل أو PP أو PET.'),
        T('Versatile, easy to install and customizable for any project.', 'متعددة الاستخدامات وسهلة التركيب وقابلة للتخصيص.'),
        T('For kitchens, commercial spaces and residential projects.', 'للمطابخ والمساحات التجارية والمشاريع السكنية.'),
        T('Ongoing research and development in technology and design.', 'بحث وتطوير مستمران في التقنية والتصميم.'),
      ], blocks: [IMG('yas-vanity', T('A dark wood-grain vanity unit', 'وحدة مغسلة بسطح خشبي داكن'))], source: SRC('4') },
    { id: 'partners', accent: 'sage', title: T('Partners', 'الشركاء'),
      bullets: [
        T('Decorative paper makers Interprint Impress and Schattdecor.', 'مصنّعو الأوراق الزخرفية Interprint Impress وSchattdecor.'),
        T('A library of designs, textures and finishes.', 'مكتبة من التصاميم والملمسات والتشطيبات.'),
        T('The page shows partner certificates and a formaldehyde-free mark.', 'تعرض الصفحة شهادات للشركاء وعلامة خالٍ من الفورمالدهيد.'),
      ], source: SRC('5') },
    { id: 'gallery-1', layout: 'duo', accent: 'brass', title: T('Gallery: Fribourg and Agostino Oak', 'المعرض: Fribourg وAgostino Oak'),
      blocks: [IMG('yas-fribourg', T('A cabinet with glazed doors in Fribourg Oak', 'خزانة بأبواب زجاجية بديكور Fribourg Oak'), T('Fribourg Oak', 'Fribourg Oak')), IMG('yas-agostino', T('A dark vanity unit in Agostino Oak', 'وحدة مغسلة داكنة بديكور Agostino Oak'), T('Agostino Oak', 'Agostino Oak'))], source: SRC('7-8') },
    { id: 'gallery-2', layout: 'duo', accent: 'brass', title: T('Gallery: Abisko Ash and Montello', 'المعرض: Abisko Ash وMontello'),
      blocks: [IMG('yas-sideboard', T('A sideboard in Abisko Ash with posters above', 'بوفيه بديكور Abisko Ash مع ملصقات فوقه'), T('Abisko Ash', 'Abisko Ash')), IMG('yas-montello', T('Marble-look coffee tables, Montello', 'طاولات قهوة بمظهر الرخام، Montello'), T('Montello', 'Montello'))], source: SRC('9-10') },
    { id: 'gallery-3', layout: 'duo', accent: 'brass', title: T('Gallery: Lucenta and Celestine Oak', 'المعرض: Lucenta وCelestine Oak'),
      blocks: [IMG('yas-wardrobe', T('A wardrobe with grey fronts and an open shelf, Lucenta', 'خزانة ملابس بواجهات رمادية ورف مفتوح، Lucenta'), T('Lucenta', 'Lucenta')), IMG('yas-celestine', T('A cabinet in Celestine Oak', 'خزانة بديكور Celestine Oak'), T('Celestine Oak', 'Celestine Oak'))], source: SRC('11-12') },
    ...[
      ['decors-1', '1', [['32376', 'Mauvella Oak'], ['71139', 'Soho'], ['71165', 'Pitch Black'], ['60168', 'Azul Onyx']], '14'],
      ['decors-2', '2', [['71145', 'Tapiz'], ['28049', 'Comano'], ['60161', 'Tivoli'], ['43103', 'Panaro']], '15'],
      ['decors-3', '3', [['48190', 'Shirin Walnut'], ['60162', 'Esperanza'], ['32374', 'Celestine Oak'], ['71143', 'Akron']], '16'],
      ['decors-4', '4', [['32352', 'Fribourg Oak'], ['48192', 'Sary Walnut'], ['99106', 'Malto'], ['60155', 'Infinity Brown']], '17'],
    ].map(([id, n, rows, pg]) => ({ id, accent: 'orange', title: T(`A glance at the variety (${n} of 4)`, `نظرة على التنوع (${n} من 4)`), lead: T('Decor codes and names from the profile.', 'رموز الديكورات وأسماؤها من الملف.'),
      blocks: [{ type: 'table', head: [T('Code', 'الرمز'), T('Decor', 'الديكور')], rows: decorRows(rows) }], source: SRC(pg) })),
  ],
};
