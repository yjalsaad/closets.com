/* Haneen AI fact sheet: the ONLY source of what the investor assistant may say about the company. PURE data (no DOM, no three.js), versioned, EN + AR.
 *
 * Every entry is built from something ALREADY in this repository (vendor/facts.js, the committed VIP profile decks and their cited PDF pages, collections/data.js, the film manifests).
 * Nothing is invented. Each fact has a status:
 *   'confirmed'                Haneen may state `text` (EN + AR). Source is named. Facts taken from the owner's undated profile PDFs are worded "the company profile lists ..." (no claim that they are current).
 *   'needs-owner-confirmation' Haneen must NEVER state the figure or claim. `draft` records what the repo shows (for the owner checklist ONLY: it is never output); answers say
 *                              UNCONFIRMED and offer the team. The owner flips status to 'confirmed' and fills `text` (docs/bloom-meeting-haneen.md).
 * Editing: change a fact here, bump VERSION, run the Jest suite (investor.test.js enforces grounding + EN/AR parity). */
import { FACTS } from '../vendor/facts';

export const FACTSHEET_VERSION = '2026-11-15.1';
export const CONFIRMED = 'confirmed';
export const PENDING = 'needs-owner-confirmation';
const T = (en, ar) => ({ en, ar });

export const TOPICS = ['who', 'factories', 'products', 'markets', 'track', 'tech', 'team', 'invest', 'visit', 'human'];
export const TOPIC_TITLE = {
  who: T('Who we are', 'من نحن'), factories: T('Factories & capacity', 'المصانع والطاقة الإنتاجية'), products: T('Products & collections', 'المنتجات والمجموعات'),
  markets: T('Markets (GCC, Iraq, Jordan)', 'الأسواق (الخليج والعراق والأردن)'), track: T('Track record', 'سجل الإنجازات'), tech: T('Technology (Bonsai Hub, patents)', 'التقنية (Bonsai Hub وبراءات الاختراع)'),
  team: T('Team', 'الفريق'), invest: T('Investment opportunity', 'فرصة الاستثمار'), visit: T('Visit the factory', 'زيارة المصنع'), human: T('Talk to a human', 'التحدث إلى فريقنا'),
};

const phone = FACTS.phone || '', hours = FACTS.hours || T('', '');
const SRC_CLOSETS = (p) => `The Closets Company Profile, p. ${p} (committed deck src/showroom3d/vip/decks/closets-profile.js)`;
const SRC_YAS = (p) => `YAS Wood profile, p. ${p} (src/showroom3d/vip/decks/yas-profile.js)`;

export const FACT_SHEET = [
  // ------------------------------------------------------------------ who
  { id: 'who.brand', topic: 'who', status: CONFIRMED, source: SRC_CLOSETS('1-2') + '; ' + SRC_YAS('2'),
    text: T('The Closets Co. designs, manufactures and installs custom closets and kitchens in the Kingdom of Bahrain. YAS Wood, a sister company within YAS Holding, supplies decorative surfaces and faced panels for furniture and interiors.',
      'تصمّم شركة الخزائن وتصنّع وتركّب الخزائن والمطابخ المخصصة في مملكة البحرين. أما YAS Wood، وهي شركة شقيقة ضمن YAS Holding، فتقدّم أسطحًا زخرفية وألواحًا مكسوّة للأثاث والتصميم الداخلي.') },
  { id: 'who.since', topic: 'who', status: CONFIRMED, source: SRC_CLOSETS('2') + '; ' + SRC_YAS('2'),
    text: T('The company profile states that The Closets was established in 2007 in Bahrain, and that YAS Wood has delivered products and services since 2007.', 'يذكر ملف الشركة أن الخزائن تأسست عام 2007 في البحرين، وأن YAS Wood تقدّم منتجاتها وخدماتها منذ عام 2007.') },
  { id: 'who.mission', topic: 'who', status: CONFIRMED, source: SRC_CLOSETS('3') + '; ' + SRC_YAS('3'),
    text: T('Our mission is quality products and excellent service, and our vision is steady growth with long-term client relationships.', 'رسالتنا منتجات عالية الجودة وخدمة ممتازة، ورؤيتنا نمو مستمر وعلاقات طويلة الأمد مع العملاء.') },
  { id: 'who.origin', topic: 'who', status: PENDING, kw: ['pandemic', 'covid', 'born', 'origin story', 'how did yas factory start', 'first of its kind', 'first in bahrain', 'جائحه', 'جائحة', 'كورونا', 'ولد', 'ولدت', 'الاول من نوعه', 'الأول من نوعه'], source: 'film script (Journey v2): YAS Factory born after the pandemic; "first of its kind in Bahrain"; docs/showroom3d/JOURNEY-V2-FACTS.md claims 6 and 7',
    draft: T('YAS Factory was born after the pandemic; first of its kind in Bahrain', 'وُلد مصنع ياس بعد الجائحة؛ الأول من نوعه في البحرين'), ask: T('Confirm the origin story and whether "first of its kind" has a documented basis.', 'أكّد قصة النشأة وهل لعبارة «الأول من نوعه» أساس موثّق.') },
  // ------------------------------------------------------------------ factories
  { id: 'factories.where', topic: 'factories', status: CONFIRMED, source: SRC_CLOSETS('16'),
    text: T('The Closets factory is in Askar, Bahrain. It uses automated panel processing, with cutting, edging, boring and carcass assembly done in-house; doors are made in-house or bought for specialist finishes.',
      'يقع مصنع الخزائن في عسكر بالبحرين، ويعتمد معالجة آلية للألواح، مع القص والتحديد والثقب وتجميع الهياكل داخل المصنع؛ وتُصنع الأبواب داخليًا أو تُشترى للتشطيبات الخاصة.') },
  { id: 'factories.machinery', topic: 'factories', status: CONFIRMED, source: SRC_CLOSETS('18'),
    text: T('The profile lists machinery from SCHELLING, HOMAG-BRANDT and SCM, with a CPC packaging line, and states that quality tests conform to international standards.', 'يذكر الملف آلات من SCHELLING وHOMAG-BRANDT وSCM مع خط تغليف CPC، ويفيد بأن اختبارات الجودة تتوافق مع المعايير الدولية.') },
  { id: 'factories.quality', topic: 'factories', status: CONFIRMED, source: SRC_CLOSETS('6'),
    text: T('The profile lists an ISO 9001 quality management system.', 'يذكر الملف نظام إدارة الجودة ISO 9001.') },
  { id: 'factories.count', topic: 'factories', status: PENDING, kw: ['how many factories', 'number of factories', 'two factories', 'كم مصنع', 'عدد المصانع'], source: 'film script and one campaign band say "two factories"; home/about pages say one workshop (vendor/facts.js productionModel is null)',
    draft: T('two factories in Bahrain', 'مصنعان في البحرين'), ask: T('How many factories are operating today, and where?', 'كم مصنعًا يعمل اليوم وأين؟') },
  { id: 'factories.capacity', topic: 'factories', status: PENDING, kw: ['capacity', 'units per year', 'output', 'production volume', 'sqm', 'square met', 'الطاقة', 'طاقه', 'سعه', 'مساحه', 'انتاج سنوي'], source: 'closets-profile deck "Capacity" (undated profile PDF)',
    draft: T('over 70,000 kitchen units per year on a single shift; 5000 sqm factory (2014)', 'أكثر من 70,000 وحدة مطبخ سنويًا في وردية واحدة؛ مصنع 5000 متر مربع (2014)'), ask: T('Confirm today\'s capacity and factory area, and the date they apply to.', 'أكّد الطاقة الحالية ومساحة المصنع وتاريخ سريانها.') },
  // ------------------------------------------------------------------ products
  { id: 'products.range', topic: 'products', status: CONFIRMED, source: SRC_CLOSETS('7-15'),
    text: T('The profile lists custom closets, kitchens, wooden floorings, bedrooms, pantries, TV units and living rooms.', 'يذكر الملف الخزائن المخصصة والمطابخ والأرضيات الخشبية وغرف النوم والمخازن ووحدات التلفاز وغرف المعيشة.') },
  { id: 'products.collections', topic: 'products', status: CONFIRMED, source: 'src/showroom3d/collections/data.js (the site\'s own collection page)',
    text: T('The showroom\'s Collections wall shows the YAS Wood Collection: 36 finishes in wood, stone and solid melamine, each with its reference code.', 'يعرض جدار المجموعات في صالة العرض مجموعة YAS Wood: 36 تشطيبًا من الخشب والحجر والميلامين الصلب، لكل منها رمزه المرجعي.') },
  { id: 'products.partners', topic: 'products', status: CONFIRMED, source: SRC_YAS('5'),
    text: T('YAS Wood works with the decorative paper makers Interprint Impress and Schattdecor.', 'تتعاون YAS Wood مع مصنّعي الأوراق الزخرفية Interprint Impress وSchattdecor.') },
  { id: 'products.exclusive', topic: 'products', status: PENDING, kw: ['exclusive', 'worldwide', 'حصري', 'حصريه', 'حصرية', 'عالميا', 'عالميًا'], source: 'film script (Journey v2): "exclusive designs and colours worldwide" (JOURNEY-V2-FACTS.md claim 9); the YAS Wood decors come from partner makers',
    draft: T('exclusive designs and colours worldwide', 'تصاميم وألوان حصرية عالميًا'), ask: T('Which designs, if any, are exclusive, and where?', 'أي التصاميم حصرية، إن وُجدت، وأين؟') },
  { id: 'products.warranty', topic: 'products', status: CONFIRMED, source: 'src/showroom3d/vendor/facts.js warrantyYears',
    text: T(`The company standard is ${FACTS.warrantyYears} years of warranty on cabinetry and soft-close hardware.`, `الكفالة المعتمدة لدى الشركة ${FACTS.warrantyYears} سنوات على الخزائن ومفصلات الإغلاق الهادئ.`) },
  // ------------------------------------------------------------------ markets
  { id: 'markets.presence', topic: 'markets', status: CONFIRMED, source: SRC_CLOSETS('2, 4') + ' (the latest milestone in that PDF is 2019)',
    text: T('The company profile lists headquarters and showrooms in Bahrain, Saudi Arabia and Qatar. It is an older document, so the team confirms today\'s footprint.', 'يذكر ملف الشركة مقرًا ومعارض في البحرين والسعودية وقطر. وهو ملف أقدم، لذا يؤكد الفريق الوضع الحالي.') },
  { id: 'markets.distribution', topic: 'markets', status: PENDING, kw: ['iraq', 'jordan', 'distribut', 'agreement', 'export', 'العراق', 'الاردن', 'الأردن', 'توزيع', 'اتفاقيه', 'اتفاقية', 'تصدير'], source: 'film script (Journey v2): distribution agreements across the Gulf, Iraq and Jordan',
    draft: T('distribution agreements across the Gulf, Iraq and Jordan', 'اتفاقيات توزيع في الخليج والعراق والأردن'), ask: T('Which markets have signed agreements today, and with whom may we name them?', 'ما الأسواق الموقّعة اتفاقياتها اليوم، ومع من يمكن ذكرها؟') },
  { id: 'markets.showrooms', topic: 'markets', status: PENDING, kw: ['how many showrooms', 'number of showrooms', 'كم معرض', 'عدد المعارض'], source: 'vendor/facts.js showroomCount is null (site says 4 but lists none)',
    draft: T('4 showrooms', '4 معارض'), ask: T('How many showrooms are open today, and where?', 'كم معرضًا مفتوحًا اليوم وأين؟') },
  // ------------------------------------------------------------------ track record
  { id: 'track.milestones', topic: 'track', status: CONFIRMED, source: SRC_CLOSETS('4-5'),
    text: T('The profile\'s milestones include the first factory in 2008, ISO 9001 certification in 2013 and a larger factory in 2014, with showrooms added in Bahrain, Saudi Arabia and Qatar.', 'تتضمن محطات الملف المصنع الأول عام 2008 وشهادة ISO 9001 عام 2013 ومصنعًا أكبر عام 2014، مع افتتاح معارض في البحرين والسعودية وقطر.') },
  { id: 'track.projects', topic: 'track', status: PENDING, kw: ['how many projects', 'projects completed', 'homes', 'villas', 'clients', 'customers', 'reference', 'which projects', 'كم مشروع', 'عدد المشاريع', 'مشاريع', 'عملاء', 'فلل', 'منازل'], source: 'film script says "more than 50,000 projects"; closets-profile deck names developments and unit counts; the site contradicts itself on homes delivered',
    draft: T('more than 50,000 projects; named developments (Water Bay, The Grand Tower, Hidd Heights, Dar Al Salam, Alsidra ...)', 'أكثر من 50,000 مشروع؛ مشاريع مسمّاة'), ask: T('Confirm the project figure and its basis, and which named projects may be cited to investors.', 'أكّد رقم المشاريع وأساسه، وأي المشاريع المسمّاة يجوز ذكرها للمستثمرين.') },
  // ------------------------------------------------------------------ technology
  { id: 'tech.systems', topic: 'tech', status: CONFIRMED, source: SRC_CLOSETS('19'),
    text: T('The profile lists an ERP system for an integrated view of core processes, and CAD and CAD+T design software whose data builds the manufacturing database.', 'يذكر الملف نظام ERP لرؤية متكاملة للعمليات الأساسية، وبرمجيات التصميم CAD وCAD+T التي تبني بياناتها قاعدة بيانات التصنيع.') },
  { id: 'tech.bonsai', topic: 'tech', status: CONFIRMED, source: 'public/yas-bloom/film/films.json (bonsai-hub entry) and the Bonsai Hub film',
    text: T('Bonsai Hub is the company\'s own platform for running its operations. Our Bonsai film shows it in about a minute; the screens in the film use synthetic demo data, not real customer data.', 'Bonsai Hub هي منصة الشركة الخاصة لإدارة عملياتها. يعرضها فيلم Bonsai في نحو دقيقة، وتستخدم شاشاته بيانات تجريبية اصطناعية وليست بيانات عملاء حقيقية.') },
  { id: 'tech.patents', topic: 'tech', status: PENDING, kw: ['patent', 'intellectual property', 'براءه', 'براءة', 'براءات', 'ملكيه فكريه', 'ملكية فكرية'], source: 'film script says "more than 27 patents"; nothing else in the repo',
    draft: T('more than 27 patents', 'أكثر من 27 براءة اختراع'), ask: T('Confirm the patent count, the holder entity and the jurisdictions.', 'أكّد عدد براءات الاختراع والجهة المالكة والدول.') },
  // ------------------------------------------------------------------ team
  { id: 'team.management', topic: 'team', status: PENDING, kw: ['who runs', 'ceo', 'founder', 'owner', 'management', 'managing director', 'leadership', 'مدير', 'المؤسس', 'مالك', 'الإدارة', 'الاداره', 'قياده', 'قيادة', 'رئيس'], source: 'closets-profile deck names two managers; docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md: "confirm you want them shown"',
    draft: T('two named managers with qualifications (profile p. 5)', 'مديران مسمّيان مع مؤهلاتهما (ص 5)'), ask: T('Which team members and titles may Haneen name, and in what wording?', 'أي أعضاء الفريق والمسميات يجوز أن تذكرها حنين، وبأي صياغة؟') },
  // ------------------------------------------------------------------ investment (never numbers)
  { id: 'invest.terms', topic: 'invest', status: PENDING, kw: ['invest', 'funding', 'raise', 'round', 'equity', 'stake', 'shares', 'valuation', 'revenue', 'profit', 'turnover', 'financial', 'ebitda', 'return', 'roi', 'yield', 'dividend', 'price', 'how much', 'استثمار', 'تمويل', 'حصه', 'حصة', 'اسهم', 'أسهم', 'تقييم', 'ايراد', 'إيراد', 'ارباح', 'أرباح', 'ربح', 'عائد', 'مالي', 'مبلغ', 'كم سعر'], source: 'owner removed the "How to join and invest" stations from the VIP room (VIP-ROOM-OWNER-INPUTS.md); no financial information exists in the repo',
    draft: T('(no figure exists)', '(لا يوجد رقم)'), ask: T('Whether and how investment information may be shared, and who presents it.', 'هل يجوز مشاركة معلومات الاستثمار وكيف، ومن يعرضها.') },
  // ------------------------------------------------------------------ visit + human (contact facts from vendor/facts.js)
  { id: 'visit.how', topic: 'visit', status: CONFIRMED, source: 'src/showroom3d/vendor/facts.js (phone, email, hours); the factory is in Askar (closets-profile p. 16)',
    text: T(`Factory and showroom visits are arranged by the team. Call ${phone}, message us on WhatsApp or email ${FACTS.email}. Hours: ${hours.en}. Use "Request a meeting with the team" below to send your details.`, `ترتّب الزيارات للمصنع وصالة العرض عبر الفريق. اتصل على ${phone} أو راسلنا على واتساب أو عبر ${FACTS.email}. ساعات العمل: ${hours.ar}. استخدم «اطلب اجتماعًا مع الفريق» أدناه لإرسال بياناتك.`) },
  { id: 'human.contact', topic: 'human', status: CONFIRMED, source: 'src/showroom3d/vendor/facts.js (phone, whatsappHref, email, hours)',
    text: T(`You can reach the team on ${phone} (WhatsApp works too) or at ${FACTS.email}. Hours: ${hours.en}.`, `يمكنك التواصل مع الفريق على ${phone} (وواتساب متاح أيضًا) أو عبر ${FACTS.email}. ساعات العمل: ${hours.ar}.`) },
];

export const factById = (id) => FACT_SHEET.find((f) => f.id === id) || null;
export const factsOf = (topic, status) => FACT_SHEET.filter((f) => f.topic === topic && (!status || f.status === status));
export const confirmedFacts = () => FACT_SHEET.filter((f) => f.status === CONFIRMED);
export const pendingFacts = () => FACT_SHEET.filter((f) => f.status === PENDING);

/** what Haneen says when she has no confirmed figure (never a number, never a guess) */
export const UNCONFIRMED = T("I don't have a confirmed figure for that; I'll connect you with the team.", 'ليس لديّ رقم مؤكَّد بهذا الخصوص؛ سأوصلك بالفريق.');
export const INFO_LINE = T('AI assistant: answers are informational, not investment advice.', 'مساعد ذكاء اصطناعي: الإجابات للاطلاع فقط وليست نصيحة استثمارية.');
export const NOT_UNDERSTOOD = T("I'm not sure I understood. Pick one of the topics below, or ask the team directly.", 'لست متأكدة أنني فهمت. اختر أحد المواضيع أدناه، أو اسأل الفريق مباشرة.');
