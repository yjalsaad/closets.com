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
      bullets: [T('From the YAS Wood profile supplied by management, condensed for this room.', 'من ملف YAS Wood المقدَّم من الإدارة، ومُختصر لهذه الغرفة.')],
      blocks: [IMG('yas-cover', T('A bright room with a light sideboard, from the YAS Wood profile cover', 'غرفة مضيئة مع بوفيه فاتح، من غلاف ملف YAS Wood'))],
      source: T('YAS Wood Profile 2023, p. 1. Arabic text is a translation awaiting native review.', 'ملف YAS Wood لعام 2023، ص 1. النص العربي ترجمة بانتظار مراجعة ناطق أصلي.') },
    { id: 'intro', accent: 'brass', title: T('Introduction', 'مقدمة'),
      lead: T('Surfaces and solutions for furniture and interior design.', 'أسطح وحلول للأثاث والتصميم الداخلي.'),
      bullets: [
        T('YAS WOOD describes itself as an innovative leader in surfaces and solutions for furniture and interior design.', 'تصف YAS WOOD نفسها بأنها رائدة مبتكرة في الأسطح والحلول للأثاث والتصميم الداخلي.'),
        T('Faced panels, laminates and edges made with the finest raw materials and advanced technologies.', 'ألواح مكسوّة ولامينيت وحواف مصنوعة من أجود المواد الخام وبتقنيات متقدمة.'),
        T('Delivering products and services since 2007.', 'تقدّم منتجاتها وخدماتها منذ عام 2007.'),
        T('A subsidiary of YAS Holding, with the expertise of its sister company, The Closets.', 'شركة تابعة لـ YAS Holding، وتستفيد من خبرة شقيقتها ذا كلوزتس.'),
      ],
      blocks: [IMG('yas-lounge', T('A light-oak cabinet by a window', 'خزانة من خشب البلوط الفاتح عند نافذة'))], source: SRC('2') },
    { id: 'mission-vision', accent: 'sage', title: T('Mission and vision', 'الرسالة والرؤية'),
      bullets: [
        T('Mission: to provide innovative surfaces and solutions for the furniture and interior design industries, using prestigious raw materials and advanced technologies, and to keep researching and developing products to exceed clients\' expectations.', 'الرسالة: تقديم أسطح وحلول مبتكرة لصناعتي الأثاث والتصميم الداخلي باستخدام مواد خام مرموقة وتقنيات متقدمة، ومواصلة البحث والتطوير لتجاوز توقعات العملاء.'),
        T('Vision: to be the leading provider of innovative, high-quality faced panels, laminates and edges in the Middle East and beyond.', 'الرؤية: أن نكون المزوّد الرائد للألواح المكسوّة واللامينيت والحواف المبتكرة وعالية الجودة في الشرق الأوسط وخارجه.'),
      ], blocks: [IMG('yas-mission', T('A light-oak door beside a dark console', 'باب من البلوط الفاتح بجانب كونسول داكن'))], source: SRC('3') },
    { id: 'product', accent: 'brass', title: T('The product', 'المنتج'),
      lead: T('Faced panels and edges, versatile and customizable.', 'ألواح مكسوّة وحواف، متعددة الاستخدامات وقابلة للتخصيص.'),
      bullets: [
        T('Faced panels are wood-based and covered with decorative papers, foil, PP or PET for a durable finish.', 'الألواح المكسوّة أساسها خشبي ومغطاة بأوراق زخرفية أو فويل أو PP أو PET لإنتاج تشطيب متين.'),
        T('Designed to be versatile, easy to install and customizable to fit any project.', 'مصممة لتكون متعددة الاستخدامات وسهلة التركيب وقابلة للتخصيص لأي مشروع.'),
        T('Suited to a new kitchen, a commercial space or a residential project.', 'مناسبة لمطبخ جديد أو مساحة تجارية أو مشروع سكني.'),
        T('A commitment to research and development in technology and design.', 'التزام بالبحث والتطوير في التقنية والتصميم.'),
      ], blocks: [IMG('yas-vanity', T('A dark wood-grain vanity unit', 'وحدة مغسلة بسطح خشبي داكن'))], source: SRC('4') },
    { id: 'partners', accent: 'sage', title: T('Partners', 'الشركاء'),
      lead: T('Decorative paper manufacturers from around the world.', 'مصنّعو أوراق زخرفية من حول العالم.'),
      bullets: [
        T('YAS WOOD partners with the decorative papers manufacturers Interprint Impress and Schattdecor.', 'تتعاون YAS WOOD مع مصنّعي الأوراق الزخرفية Interprint Impress وSchattdecor.'),
        T('Access to a library of designs, textures and finishes helps it stay at the forefront of design trends.', 'الوصول إلى مكتبة من التصاميم والملمسات والتشطيبات يبقيها في طليعة اتجاهات التصميم.'),
        T('The page shows partner certification documents and a "formaldehyde-free" mark.', 'تعرض الصفحة وثائق اعتماد للشركاء وعلامة «خالٍ من الفورمالدهيد».'),
      ], source: SRC('5') },
    { id: 'gallery-1', layout: 'duo', accent: 'brass', title: T('Photo gallery: Fribourg and Agostino Oak', 'معرض الصور: Fribourg وAgostino Oak'),
      lead: T('Visualize your vision.', 'تخيّل رؤيتك.'),
      blocks: [IMG('yas-fribourg', T('A cabinet with glazed doors in Fribourg Oak', 'خزانة بأبواب زجاجية بديكور Fribourg Oak'), T('Fribourg Oak', 'Fribourg Oak')), IMG('yas-agostino', T('A dark vanity unit in Agostino Oak', 'وحدة مغسلة داكنة بديكور Agostino Oak'), T('Agostino Oak', 'Agostino Oak'))], source: SRC('7-8') },
    { id: 'gallery-2', layout: 'duo', accent: 'brass', title: T('Photo gallery: Abisko Ash and Montello', 'معرض الصور: Abisko Ash وMontello'),
      blocks: [IMG('yas-sideboard', T('A sideboard in Abisko Ash with posters above', 'بوفيه بديكور Abisko Ash مع ملصقات فوقه'), T('Abisko Ash', 'Abisko Ash')), IMG('yas-montello', T('Marble-look coffee tables, Montello', 'طاولات قهوة بمظهر الرخام، Montello'), T('Montello', 'Montello'))], source: SRC('9-10') },
    { id: 'gallery-3', layout: 'duo', accent: 'brass', title: T('Photo gallery: Lucenta and Celestine Oak', 'معرض الصور: Lucenta وCelestine Oak'),
      blocks: [IMG('yas-wardrobe', T('A wardrobe with grey fronts and an open shelf, Lucenta', 'خزانة ملابس بواجهات رمادية ورف مفتوح، Lucenta'), T('Lucenta', 'Lucenta')), IMG('yas-celestine', T('A cabinet in Celestine Oak', 'خزانة بديكور Celestine Oak'), T('Celestine Oak', 'Celestine Oak'))], source: SRC('11-12') },
    { id: 'decors-1', accent: 'orange', title: T('A glance at the variety: 1 of 2', 'نظرة على التنوع: 1 من 2'),
      lead: T('Decor codes and names as listed in the profile.', 'رموز الديكورات وأسماؤها كما وردت في الملف.'),
      blocks: [{ type: 'table', head: [T('Code', 'الرمز'), T('Decor', 'الديكور')], rows: decorRows([['32376', 'Mauvella Oak'], ['71139', 'Soho'], ['71165', 'Pitch Black'], ['60168', 'Azul Onyx'], ['71145', 'Tapiz'], ['28049', 'Comano'], ['60161', 'Tivoli'], ['43103', 'Panaro']]), source: SRC('14-15') }], source: SRC('14-15') },
    { id: 'decors-2', accent: 'orange', title: T('A glance at the variety: 2 of 2', 'نظرة على التنوع: 2 من 2'),
      blocks: [{ type: 'table', head: [T('Code', 'الرمز'), T('Decor', 'الديكور')], rows: decorRows([['48190', 'Shirin Walnut'], ['60162', 'Esperanza'], ['32374', 'Celestine Oak'], ['71143', 'Akron'], ['32352', 'Fribourg Oak'], ['48192', 'Sary Walnut'], ['99106', 'Malto'], ['60155', 'Infinity Brown']]), source: SRC('16-17') }],
      lead: T('The profile notes that this is just a "glance".', 'يشير الملف إلى أن هذه مجرد «لمحة».'), source: SRC('16-18') },
  ],
};
