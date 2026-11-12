/* eslint-disable */
/**
 * SEO route registry + head builder (CommonJS: shared by the app and the Node build scripts).
 * One entry per page id used by App.js (PATH_TO_PAGE / PAGE_TO_PATH). Bilingual, authored copy.
 */
const { SITE_URL, ENABLE_AR_URLS, OG_IMAGE_PATH, LOGO_PATH, BUSINESS } = require('./siteConfig');

const BRAND = { en: 'The Closets Co.', ar: 'ذا كلوزتس' };

// index:true => in sitemap, prerendered (EN + AR), indexable. index:false => noindex, not in sitemap, not prerendered.
// label = short breadcrumb / footer-sitemap name. group = footer-sitemap column.
const PAGES = [
  { page: 'home', path: '/', index: true, group: 'main', label: { en: 'Home', ar: 'الرئيسية' },
    meta: { en: ['The Closets Co. — Bespoke Kitchens, Wardrobes & Storage in Bahrain', 'Premium bespoke kitchens, wardrobes, walk-in closets and storage — designed, made and installed in the Kingdom of Bahrain.'],
            ar: ['ذا كلوزتس — مطابخ وخزائن وحلول تخزين مصمّمة خصيصاً في البحرين', 'مطابخ وخزائن وغرف ملابس وحلول تخزين فاخرة تُصمّم وتُصنّع وتُركّب في مملكة البحرين.'] } },
  { page: 'kitchen', path: '/kitchen', index: true, group: 'rooms', service: 'Bespoke kitchens', label: { en: 'Kitchens', ar: 'المطابخ' },
    meta: { en: ['Bespoke Kitchens — The Closets Co.', 'Handcrafted bespoke kitchens designed around how you cook — cabinetry, stone worktops and integrated appliances, made in Bahrain.'],
            ar: ['مطابخ مصمّمة خصيصاً — ذا كلوزتس', 'مطابخ فاخرة تُصمّم حسب أسلوب حياتك — خزائن وأسطح حجرية وأجهزة مدمجة، صناعة بحرينية.'] } },
  { page: 'wardrobes', path: '/wardrobes', index: true, group: 'rooms', service: 'Fitted wardrobes', label: { en: 'Wardrobes', ar: 'خزائن الملابس' },
    meta: { en: ['Fitted Wardrobes — The Closets Co.', 'Sliding, hinged and handleless fitted wardrobes, floor to ceiling — bespoke storage handcrafted in Bahrain.'],
            ar: ['خزائن ملابس مدمجة — ذا كلوزتس', 'خزائن ملابس منزلقة ومفصّلية وبدون مقابض، من الأرض إلى السقف — تخزين مصمّم خصيصاً في البحرين.'] } },
  { page: 'tv', path: '/tv', index: true, group: 'rooms', service: 'TV units and media walls', label: { en: 'TV Units', ar: 'وحدات التلفاز' },
    meta: { en: ['TV Units & Media Walls — The Closets Co.', 'Bespoke TV units, media walls and living-room storage that disappear into the architecture. Made in Bahrain.'],
            ar: ['وحدات تلفاز وجدران وسائط — ذا كلوزتس', 'وحدات تلفاز وجدران وسائط وحلول تخزين للمعيشة مصمّمة بإتقان. صناعة بحرينية.'] } },
  { page: 'doors', path: '/doors', index: true, group: 'rooms', service: 'Wooden doors and joinery', label: { en: 'Doors', ar: 'الأبواب' },
    meta: { en: ['Wood Doors — The Closets Co.', 'Bespoke wooden doors and joinery, crafted to your home. Made in Bahrain.'],
            ar: ['أبواب خشبية — ذا كلوزتس', 'أبواب خشبية ونجارة مصمّمة خصيصاً لمنزلك. صناعة بحرينية.'] } },
  { page: 'office', path: '/office', index: true, group: 'rooms', service: 'Home office joinery', label: { en: 'Home Office', ar: 'المكتب المنزلي' },
    meta: { en: ['Home Office & Study — The Closets Co.', 'Bespoke home-office joinery, desks and storage designed around the way you work. Made in Bahrain.'],
            ar: ['مكتب منزلي — ذا كلوزتس', 'أثاث ومكاتب وحلول تخزين للمكتب المنزلي مصمّمة حسب طريقة عملك. صناعة بحرينية.'] } },
  { page: 'products', path: '/gallery', index: true, group: 'explore', label: { en: 'Gallery', ar: 'المعرض' },
    meta: { en: ['Gallery — The Closets Co.', 'Browse our full collection of bespoke kitchens, wardrobes, closets and storage.'],
            ar: ['المعرض — ذا كلوزتس', 'تصفّح مجموعتنا الكاملة من المطابخ والخزائن وغرف الملابس وحلول التخزين المصمّمة خصيصاً.'] } },
  { page: 'projects', path: '/projects', index: true, group: 'explore', label: { en: 'Our Work', ar: 'أعمالنا' },
    meta: { en: ['Our Work — The Closets Co.', 'Recent bespoke kitchen, wardrobe and closet projects delivered across Bahrain.'],
            ar: ['أعمالنا — ذا كلوزتس', 'أحدث مشاريع المطابخ والخزائن وغرف الملابس المصمّمة خصيصاً في مملكة البحرين.'] } },
  { page: 'offers', path: '/offers', index: true, group: 'explore', label: { en: 'Offers', ar: 'العروض' },
    meta: { en: ['Offers — The Closets Co.', 'Current offers on bespoke kitchens, wardrobes and storage. Book a free design consultation.'],
            ar: ['العروض — ذا كلوزتس', 'عروضنا الحالية على المطابخ والخزائن وحلول التخزين. احجز استشارة تصميم مجانية.'] } },
  { page: 'blog', path: '/blog', index: true, group: 'explore', label: { en: 'Journal', ar: 'المجلة' },
    meta: { en: ['Design Journal — The Closets Co.', 'Ideas, buying guides and stories on bespoke kitchens, wardrobes and storage from our team in Bahrain.'],
            ar: ['مجلة التصميم — ذا كلوزتس', 'أفكار وأدلة شراء وقصص من فريقنا في البحرين حول المطابخ والخزائن وحلول التخزين المصمّمة خصيصاً.'] } },
  { page: 'design-lab', path: '/ai-lab', index: true, group: 'explore', label: { en: 'AI Lab', ar: 'مختبر الذكاء الاصطناعي' },
    meta: { en: ['AI Lab — The Closets Co.', 'Explore AI design tools to imagine and price your bespoke room.'],
            ar: ['مختبر الذكاء الاصطناعي — ذا كلوزتس', 'استكشف أدوات التصميم بالذكاء الاصطناعي لتخيّل غرفتك المخصّصة وتسعيرها.'] } },
  { page: 'ai-yas', path: '/ai-lab/yas', index: true, parent: 'design-lab', group: 'explore', label: { en: 'YAS', ar: 'ياس' },
    meta: { en: ['YAS — AI Interior Designer — The Closets Co.', 'Describe your space and let YAS, our AI designer, suggest a bespoke layout and finishes.'],
            ar: ['ياس — مصمّم داخلي بالذكاء الاصطناعي — ذا كلوزتس', 'صف مساحتك ودع ياس، مصمّمنا الذكي، يقترح تصميماً وتشطيبات مخصّصة.'] } },
  { page: 'booking', path: '/booking', index: true, group: 'help', label: { en: 'Book a Visit', ar: 'احجز زيارة' },
    meta: { en: ['Book a Free Consultation — The Closets Co.', 'Book a free home design visit. We measure, design in 3D and install — one team, start to finish.'],
            ar: ['احجز استشارة مجانية — ذا كلوزتس', 'احجز زيارة تصميم منزلية مجانية. نقيس ونصمّم ثلاثي الأبعاد ونركّب — فريق واحد من البداية للنهاية.'] } },
  { page: 'services', path: '/services', index: true, group: 'help', label: { en: 'Services', ar: 'خدماتنا' },
    meta: { en: ['Services — The Closets Co.', 'Design, manufacture, installation, maintenance and warranty — the full bespoke service, in-house.'],
            ar: ['خدماتنا — ذا كلوزتس', 'التصميم والتصنيع والتركيب والصيانة والضمان — خدمة متكاملة من فريقنا.'] } },
  { page: 'how-it-works', path: '/how-it-works', index: true, group: 'help', label: { en: 'How It Works', ar: 'كيف نعمل' },
    meta: { en: ['How It Works — The Closets Co.', 'From consultation to installation in four considered steps — design, visualise, craft, install.'],
            ar: ['كيف نعمل — ذا كلوزتس', 'من الاستشارة إلى التركيب في أربع خطوات — التصميم والتصوّر والصناعة والتركيب.'] } },
  { page: 'faq', path: '/faq', index: true, group: 'help', label: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
    meta: { en: ['FAQ — The Closets Co.', 'Answers on pricing, timelines, materials and the bespoke process.'],
            ar: ['الأسئلة الشائعة — ذا كلوزتس', 'إجابات حول الأسعار والمدد والخامات وعملية التصميم المخصّص.'] } },
  { page: 'warranty', path: '/warranty', index: true, group: 'help', label: { en: 'Warranty', ar: 'الضمان' },
    meta: { en: ['Warranty Service — The Closets Co.', 'Register a warranty claim for your Closets Co. installation — we stand behind every installation.'],
            ar: ['خدمة الضمان — ذا كلوزتس', 'سجّل مطالبة ضمان لتركيبك من ذا كلوزتس — نحن نضمن كل عملية تركيب.'] } },
  { page: 'maintenance', path: '/maintenance', index: true, group: 'help', label: { en: 'Maintenance', ar: 'الصيانة' },
    meta: { en: ['Maintenance Request — The Closets Co.', 'Need an adjustment or repair? Log a maintenance request and our team will arrange a visit.'],
            ar: ['طلب صيانة — ذا كلوزتس', 'تحتاج إلى تعديل أو إصلاح؟ سجّل طلب صيانة وسيرتّب فريقنا زيارة.'] } },
  { page: 'about', path: '/about', index: true, group: 'company', ldType: 'AboutPage', label: { en: 'About', ar: 'من نحن' },
    meta: { en: ['About — The Closets Co.', 'Bespoke storage and kitchens, designed, manufactured and installed in the Kingdom of Bahrain.'],
            ar: ['من نحن — ذا كلوزتس', 'حلول تخزين ومطابخ مصمّمة ومصنّعة ومركّبة في مملكة البحرين.'] } },
  { page: 'showrooms', path: '/showrooms', index: true, group: 'company', label: { en: 'Showrooms', ar: 'صالات العرض' },
    meta: { en: ['Showrooms — The Closets Co.', 'Visit our showrooms in Bahrain to see the craftsmanship and materials up close.'],
            ar: ['صالات العرض — ذا كلوزتس', 'قم بزيارة صالات العرض في البحرين لترى الحرفية والخامات عن قرب.'] } },
  { page: 'contact', path: '/contact', index: true, group: 'company', ldType: 'ContactPage', label: { en: 'Contact', ar: 'اتصل بنا' },
    meta: { en: ['Contact — The Closets Co.', 'Get in touch with The Closets Co. in Bahrain — call, WhatsApp or book a free consultation.'],
            ar: ['اتصل بنا — ذا كلوزتس', 'تواصل مع ذا كلوزتس في البحرين — اتصال أو واتساب أو احجز استشارة مجانية.'] } },
  { page: 'careers', path: '/careers', index: true, group: 'company', label: { en: 'Careers', ar: 'وظائف' },
    meta: { en: ['Careers — The Closets Co.', 'Join a team that builds beautiful, lasting spaces. See current openings at The Closets Co. in Bahrain.'],
            ar: ['وظائف — ذا كلوزتس', 'انضم إلى فريق يبني مساحات جميلة وباقية. تعرّف على الوظائف المتاحة لدى ذا كلوزتس في البحرين.'] } },

  // ---- noindex: interactive / account / transactional pages (no SEO value, thin or login-gated) ----
  { page: 'planner', path: '/design-studio', index: false, meta: { en: ['Design Studio — The Closets Co.', 'Plan your room in 3D and get a live price estimate, then book a designer to make it real.'],
      ar: ['استوديو التصميم — ذا كلوزتس', 'صمّم غرفتك ثلاثية الأبعاد واحصل على تقدير سعر فوري، ثم احجز مصمّماً لتنفيذها.'] } },
  { page: 'kitchen-planner', path: '/design-studio/kitchen-planner', index: false, meta: { en: ['Kitchen Planner — The Closets Co.', 'Plan your kitchen in 3D.'], ar: ['مخطّط المطبخ — ذا كلوزتس', 'صمّم مطبخك ثلاثي الأبعاد.'] } },
  { page: 'wardrobe-planner', path: '/design-studio/wardrobe-planner', index: false, meta: { en: ['Wardrobe Planner — The Closets Co.', 'Plan your wardrobe in 3D.'], ar: ['مخطّط الخزائن — ذا كلوزتس', 'صمّم خزانتك ثلاثية الأبعاد.'] } },
  { page: 'tv-planner', path: '/design-studio/tv-planner', index: false, meta: { en: ['TV Unit Planner — The Closets Co.', 'Plan your TV unit in 3D.'], ar: ['مخطّط وحدة التلفاز — ذا كلوزتس', 'صمّم وحدة التلفاز ثلاثية الأبعاد.'] } },
  { page: 'door-planner', path: '/design-studio/door-planner', index: false, meta: { en: ['Door Planner — The Closets Co.', 'Plan your doors in 3D.'], ar: ['مخطّط الأبواب — ذا كلوزتس', 'صمّم أبوابك ثلاثية الأبعاد.'] } },
  { page: 'office-planner', path: '/design-studio/office-planner', index: false, meta: { en: ['Office Planner — The Closets Co.', 'Plan your home office in 3D.'], ar: ['مخطّط المكتب — ذا كلوزتس', 'صمّم مكتبك المنزلي ثلاثي الأبعاد.'] } },
  { page: 'design-builder', path: '/design-studio/builder', index: false, meta: { en: ['Design Builder — The Closets Co.', 'Build your own design.'], ar: ['منشئ التصميم — ذا كلوزتس', 'أنشئ تصميمك بنفسك.'] } },
  { page: 'ai', path: '/ai-designer', index: false, meta: { en: ['AI Designer — The Closets Co.', 'Redesign your room with AI.'], ar: ['المصمّم الذكي — ذا كلوزتس', 'أعد تصميم غرفتك بالذكاء الاصطناعي.'] } },
  { page: 'portal', path: '/signin', index: false, meta: { en: ['My Closets — The Closets Co.', 'Sign in to your account.'], ar: ['حسابي — ذا كلوزتس', 'سجّل الدخول إلى حسابك.'] } },
  { page: 'checkout', path: '/checkout', index: false, meta: { en: ['Checkout — The Closets Co.', 'Complete your order.'], ar: ['إتمام الطلب — ذا كلوزتس', 'أكمل طلبك.'] } },
  { page: 'cart', path: '/cart', index: false, meta: { en: ['Your Cart — The Closets Co.', 'Review the items in your cart.'], ar: ['سلّتك — ذا كلوزتس', 'راجع المنتجات في سلّتك.'] } },
  { page: 'privacy', path: '/privacy', index: false, meta: { en: ['Privacy Policy — The Closets Co.', 'How The Closets Co. collects and uses personal data.'], ar: ['سياسة الخصوصية — ذا كلوزتس', 'كيف تجمع ذا كلوزتس البيانات الشخصية وتستخدمها.'] } },
  { page: 'terms', path: '/terms', index: false, meta: { en: ['Terms — The Closets Co.', 'Terms of use and sale.'], ar: ['الشروط والأحكام — ذا كلوزتس', 'شروط الاستخدام والبيع.'] } },
  { page: 'directory', path: '/directory', index: false, meta: { en: ['Directory — The Closets Co.', 'Pages directory.'], ar: ['الدليل — ذا كلوزتس', 'دليل الصفحات.'] } },
];

const NOT_FOUND_META = {
  en: ['Page not found — The Closets Co.', 'The page you are looking for does not exist or has moved. Browse our kitchens, wardrobes and storage instead.'],
  ar: ['الصفحة غير موجودة — ذا كلوزتس', 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها. تصفّح المطابخ والخزائن وحلول التخزين لدينا.'],
};

/** Legacy / duplicate paths -> canonical path. Used for 301s in vercel.json AND the client-side redirect. */
const LEGACY_REDIRECTS = {
  '/home': '/', '/kitchens': '/kitchen', '/wardrobe': '/wardrobes', '/tv-units': '/tv', '/door': '/doors',
  '/guide': '/how-it-works', '/ai': '/ai-lab/yas', '/ai-yas': '/ai-lab/yas', '/products': '/gallery',
  '/design-lab': '/ai-lab', '/planner': '/design-studio',
  '/kitchen-planner': '/design-studio/kitchen-planner', '/wardrobe-planner': '/design-studio/wardrobe-planner',
  '/tv-planner': '/design-studio/tv-planner', '/door-planner': '/design-studio/door-planner',
  '/office-planner': '/design-studio/office-planner', '/design-builder': '/design-studio/builder',
  '/portal': '/signin',
};

const BY_PAGE = Object.fromEntries(PAGES.map((p) => [p.page, p]));
const INDEXABLE = PAGES.filter((p) => p.index);
const LANGS = ENABLE_AR_URLS ? ['en', 'ar'] : ['en'];

// ---- language-in-URL helpers ------------------------------------------------------------
function splitLangPath(pathname) {
  const raw = pathname || '/';
  if (ENABLE_AR_URLS) {
    if (raw === '/ar' || raw === '/ar/') return { lang: 'ar', path: '/' };
    if (/^\/ar\//i.test(raw)) return { lang: 'ar', path: raw.slice(3) || '/' };
  }
  return { lang: 'en', path: raw };
}
function withLang(path, lang) {
  const p = path || '/';
  if (!ENABLE_AR_URLS || lang !== 'ar') return p;
  if (/^\/(studio|visualizer|campaign|ikhtarha)(\/|$)/i.test(p)) return p; // separate app shells, not localised by URL
  return p === '/' ? '/ar' : '/ar' + p;
}
function absUrl(path, lang) { return SITE_URL + withLang(path, lang); }

// ---- head builder -----------------------------------------------------------------------
function ldBusiness() {
  const b = BUSINESS;
  const node = {
    '@type': 'HomeGoodsStore', '@id': SITE_URL + '/#business',
    name: b.name, alternateName: b.nameAr, legalName: b.legalName, url: SITE_URL + '/',
    logo: { '@type': 'ImageObject', url: SITE_URL + LOGO_PATH }, image: SITE_URL + OG_IMAGE_PATH,
    telephone: b.telephone, email: b.email,
    address: { '@type': 'PostalAddress', ...b.address },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: b.hours.days, opens: b.hours.opens, closes: b.hours.closes }],
    areaServed: { '@type': 'Country', name: 'Bahrain' },
    knowsLanguage: ['en', 'ar'],
  };
  if (b.geo) node.geo = { '@type': 'GeoCoordinates', latitude: b.geo.lat, longitude: b.geo.lng };
  if (b.sameAs && b.sameAs.length) node.sameAs = b.sameAs;
  return node;
}

function jsonLdFor(entry, lang) {
  const url = absUrl(entry.path, lang);
  const graph = [ldBusiness()];
  graph.push({ '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL + '/', name: BRAND.en, alternateName: BRAND.ar,
    inLanguage: LANGS, publisher: { '@id': SITE_URL + '/#business' } });
  const [title, description] = entry.meta[lang] || entry.meta.en;
  graph.push({ '@type': entry.ldType || 'WebPage', '@id': url + '#webpage', url, name: title, description, inLanguage: lang,
    isPartOf: { '@id': SITE_URL + '/#website' }, about: { '@id': SITE_URL + '/#business' },
    primaryImageOfPage: { '@type': 'ImageObject', url: SITE_URL + OG_IMAGE_PATH } });
  if (entry.page !== 'home') {
    const trail = [BY_PAGE.home];
    if (entry.parent) trail.push(BY_PAGE[entry.parent]);
    trail.push(entry);
    graph.push({ '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
      itemListElement: trail.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.label[lang] || e.label.en, item: absUrl(e.path, lang) })) });
  }
  if (entry.service) {
    graph.push({ '@type': 'Service', '@id': url + '#service', name: entry.service, serviceType: entry.service, description,
      url, provider: { '@id': SITE_URL + '/#business' }, areaServed: { '@type': 'Country', name: 'Bahrain' } });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/**
 * buildHead(page, lang) -> everything that belongs in <head> for that route/language.
 * page === null => the NotFound page.
 */
function buildHead(page, lang) {
  const L = lang === 'ar' ? 'ar' : 'en';
  const entry = page === null ? null : BY_PAGE[page];
  if (!entry && isKnownPage(page)) { // dynamic CMS pages (product-<id>, cat:<name>): noindex until a CMS-driven sitemap exists
    const [title, description] = BY_PAGE.home.meta[L];
    return { title, description, robots: 'noindex, follow', canonical: null, alternates: [], lang: L, indexable: false,
      og: ogFor(title, description, null, L), jsonld: null };
  }
  if (!entry) { // not found (unknown page id)
    const [title, description] = NOT_FOUND_META[L];
    return { title, description, robots: 'noindex, follow', canonical: null, alternates: [], lang: L, indexable: false,
      og: ogFor(title, description, null, L), jsonld: null };
  }
  const [title, description] = entry.meta[L] || entry.meta.en;
  if (!entry.index) {
    return { title, description, robots: 'noindex, follow', canonical: null, alternates: [], lang: L, indexable: false,
      og: ogFor(title, description, null, L), jsonld: null };
  }
  const canonical = absUrl(entry.path, L);
  const alternates = ENABLE_AR_URLS
    ? [{ hreflang: 'en', href: absUrl(entry.path, 'en') }, { hreflang: 'ar', href: absUrl(entry.path, 'ar') }, { hreflang: 'x-default', href: absUrl(entry.path, 'en') }]
    : [];
  return { title, description, robots: 'index, follow, max-image-preview:large', canonical, alternates, lang: L, indexable: true,
    og: ogFor(title, description, canonical, L), jsonld: jsonLdFor(entry, L) };
}
function ogFor(title, description, url, L) {
  return { title, description, url, image: SITE_URL + OG_IMAGE_PATH, locale: L === 'ar' ? 'ar_AR' : 'en_US',
    localeAlt: ENABLE_AR_URLS ? (L === 'ar' ? 'en_US' : 'ar_AR') : null, siteName: BRAND[L] };
}

/** Is this page id something the router renders (vs. the NotFound page)? */
function isKnownPage(page) {
  if (!page) return false;
  if (BY_PAGE[page]) return true;
  return /^(product-|cat:)/.test(page);
}

module.exports = { PAGES, BY_PAGE, INDEXABLE, LANGS, LEGACY_REDIRECTS, NOT_FOUND_META, BRAND, splitLangPath, withLang, absUrl, buildHead, isKnownPage };
