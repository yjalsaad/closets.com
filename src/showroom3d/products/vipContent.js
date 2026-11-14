/* VIP meeting room (investor / partner boardroom): PURE content + helpers (unit-tested). No DOM, no three.js, no network.
 *
 * Honesty rules (owner brief):
 *  - company facts come ONLY from src/content/facts.js and existing site / showroom copy; the facts the site itself contradicts
 *    (years of craft, homes delivered, production model, showroom count) are shown as MARKED PLACEHOLDERS ("to be confirmed by management")
 *    until facts.js holds a confirmed value, then they appear automatically;
 *  - the Bonsai Hub station only lists capabilities that exist in the Hub repository (module map, RBAC model, audit modules, lead KPI engine, ...);
 *    the module UIs drawn on the screens are simplified procedural mock-ups and say "illustrative";
 *  - the investor path is a PROCESS: no figures, returns, valuation, equity amounts, ROI or guarantees anywhere, and the disclaimer is always shown;
 *  - what management must still supply is listed in OWNER_INPUTS (and in docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md). */
import { FACTS, hasFact } from '../../content/facts';
import { withLang } from '../../seo/routes';

export const VIP_ID = 'vip';
export const VIP_DEPT = { id: VIP_ID, en: 'VIP Meeting Room', ar: 'غرفة الاجتماعات VIP', index: 9, vip: true };

export const L = (o, lang) => (lang === 'ar' ? o.ar || o.en : o.en);
export const PLACEHOLDER = { en: 'To be confirmed by management', ar: 'يؤكَّد من الإدارة' };
export const DISCLAIMER = { en: 'Information only, not an offer or financial advice; details provided directly by management.', ar: 'للاطلاع فقط، وليس عرضًا ولا نصيحة مالية؛ تُقدَّم التفاصيل مباشرة من الإدارة.' };

export const STATIONS = [
  { id: 'story', title: { en: 'Company story and brand', ar: 'قصة الشركة وهويتها' },
    lead: { en: 'Designed, made and fitted in Bahrain.', ar: 'تصميم وتصنيع وتركيب في البحرين.' } },
  { id: 'projects', title: { en: 'Our projects and business lines', ar: 'مشاريعنا وخطوط أعمالنا' },
    lead: { en: 'The departments you can walk through in this showroom, and the projects listed on our website.', ar: 'الأقسام التي يمكنك التجول فيها في هذا المعرض، والمشاريع المعروضة على موقعنا.' } },
  { id: 'hub', title: { en: 'The power of the Bonsai Hub', ar: 'قوة منصة بونساي هب' },
    lead: { en: 'The management platform behind the business: one place for leads, quotes, orders, production, finance and people.', ar: 'منصة الإدارة خلف الأعمال: مكان واحد للعملاء المحتملين وعروض الأسعار والطلبات والإنتاج والمالية والموظفين.' } },
  { id: 'invest', title: { en: 'How to join and invest', ar: 'كيف تنضم وتستثمر' },
    lead: { en: 'A clear, step-by-step process. It contains no figures and no promises.', ar: 'مسار واضح خطوة بخطوة. لا يتضمن أرقامًا ولا وعودًا.' } },
  { id: 'briefing', title: { en: 'Request a private investor briefing', ar: 'اطلب إحاطة خاصة للمستثمرين' },
    lead: { en: 'Start with a conversation. Our management answers directly.', ar: 'ابدأ بحوار. تجيب إدارتنا مباشرة.' } },
];
export const stationIds = () => STATIONS.map((s) => s.id);
/** station state machine (pure): clamp, no wrap-around, so "Next" on the last station is disabled and the briefing CTA stays the end of the path */
export function stepStation(i, dir, n = STATIONS.length) { return Math.max(0, Math.min(n - 1, (Number.isInteger(i) ? i : 0) + (dir > 0 ? 1 : dir < 0 ? -1 : 0))); }
export const clampStation = (i, n = STATIONS.length) => Math.max(0, Math.min(n - 1, Number.isInteger(i) ? i : 0));
/** left / right arrow -> prev / next, mirrored in RTL */
export const arrowDir = (code, rtl) => { const d = code === 'ArrowRight' ? 1 : code === 'ArrowLeft' ? -1 : 0; return rtl ? -d : d; };

// ---- station 1: story and brand ----
const CONTESTED = [
  ['yearsOfCraft', { en: 'Years of craft', ar: 'سنوات الخبرة' }],
  ['homesDelivered', { en: 'Homes delivered', ar: 'المنازل المنفَّذة' }],
  ['productionModel', { en: 'Production model', ar: 'نموذج الإنتاج' }],
  ['showroomCount', { en: 'Showrooms', ar: 'صالات العرض' }],
];
/** the facts the site contradicts itself on: a confirmed value shows as is, otherwise a marked placeholder (never a guess) */
export function contestedFacts(facts = FACTS, has = hasFact) {
  return CONTESTED.map(([key, label]) => { const ok = facts === FACTS ? has(key) : facts[key] !== null && facts[key] !== undefined; return { key, label, confirmed: ok, value: ok ? (typeof facts[key] === 'object' ? facts[key] : { en: String(facts[key]), ar: String(facts[key]) }) : PLACEHOLDER }; });
}
export function storyLines() {
  return [
    { en: 'The Closets Co. designs, makes and fits kitchens, wardrobes, walk-in closets, bedrooms, doors and living-room units for homes in Bahrain.', ar: 'ذا كلوزتس تصمّم وتصنّع وتركّب المطابخ وخزائن الملابس وغرف الملابس وغرف النوم والأبواب ووحدات المعيشة للمنازل في البحرين.' },
    { en: `${FACTS.warrantyYears} years on cabinetry and soft-close hardware.`, ar: `${FACTS.warrantyYears} سنوات على الخزائن وملحقات الإغلاق الهادئ.` },
    { en: 'Every piece is made to measure: we survey, design, make and fit.', ar: 'كل قطعة تُصنع على المقاس: نقيس ونصمّم ونصنّع ونركّب.' },
    { en: 'Customers can plan a room online in the Design Studio, then book a designer.', ar: 'يمكن للعملاء تخطيط غرفتهم عبر الإنترنت في استوديو التصميم ثم حجز مصمّم.' },
  ];
}

// ---- station 2: business lines (real departments of this showroom + the site's own services), each with its REAL route ----
/** route: site-relative path of an existing page (localised with /ar where the page is), or null when the department has no page of its own */
const LINES = [
  { id: 'kitchens', name: { en: 'Kitchens', ar: 'المطابخ' }, route: '/kitchen' },
  { id: 'wardrobes', name: { en: 'Wardrobes', ar: 'خزائن الملابس' }, route: '/wardrobes' },
  { id: 'walkin', name: { en: 'Walk-in Closets', ar: 'غرف الملابس' }, route: null },
  { id: 'bedroom', name: { en: 'Bedrooms', ar: 'غرف النوم' }, route: null },
  { id: 'doors', name: { en: 'Doors', ar: 'الأبواب' }, route: '/doors' },
  { id: 'living', name: { en: 'Living and TV units', ar: 'المعيشة ووحدات التلفاز' }, route: '/tv' },
  { id: 'studio', name: { en: 'Custom Design Studio', ar: 'استوديو التصميم' }, route: '/studio', plain: true },
  { id: 'planners', name: { en: 'Room planners', ar: 'مخططات الغرف' }, route: '/design-studio' },
  { id: 'ikhtarha', name: { en: 'Ikhtarha campaign', ar: 'حملة اختارها' }, route: '/campaign/ikhtarha', plain: true },
  { id: 'lounge', name: { en: 'Consultation', ar: 'الاستشارات' }, route: '/booking' },
];
export function businessLines(lang = 'en') { return LINES.map((l) => ({ ...l, href: l.route ? (l.plain ? l.route : withLang(l.route, lang === 'ar' ? 'ar' : 'en')) : null })); }
export const PROJECTS_ROUTE = '/projects';
export const projectsHref = (lang = 'en') => withLang(PROJECTS_ROUTE, lang === 'ar' ? 'ar' : 'en');

// ---- station 3: the Bonsai Hub (REAL capabilities, from the Hub repository; every item names where it lives) ----
/** department groups and module counts: copied from DASHBOARD-MODULE-MAP.generated.md in the Hub repository (generated 5 Nov 2026 from src/navConfig.js; the map lists 469 modules including 45 archived ones) */
export const HUB_DEPARTMENTS = [
  ['Finance & Accounting', 'المالية والمحاسبة', 56], ['Sales & Marketing', 'المبيعات والتسويق', 54], ['Manufacturing', 'التصنيع', 46], ['Administration', 'الإدارة', 40], ['Human Resources', 'الموارد البشرية', 39],
  ['E-commerce', 'التجارة الإلكترونية', 39], ['Project Management', 'إدارة المشاريع', 37], ['Design & Engineering', 'التصميم والهندسة', 30], ['Operations', 'العمليات', 22], ['Information Technology', 'تقنية المعلومات', 18],
  ['Executive Management', 'الإدارة التنفيذية', 17], ['Quality Assurance', 'ضمان الجودة', 11], ['Procurement', 'المشتريات', 9],
].map(([en, ar, modules]) => ({ name: { en, ar }, modules }));
export const HUB_MODULE_TOTAL = 469;          // as listed in that map (includes archived modules)
export const HUB_FLOW = [                      // lead -> quote -> order -> production -> delivery -> finance; every step is a real module family in the Hub
  { id: 'lead', name: { en: 'Lead', ar: 'عميل محتمل' }, sub: { en: 'new, contacted, proposal, won, lost', ar: 'جديد، تم التواصل، عرض، فاز، خسر' }, src: 'Leads (LeadsV2, lead KPI engine)' },
  { id: 'quote', name: { en: 'Quote', ar: 'عرض سعر' }, sub: { en: 'quote builder, pricing engine', ar: 'منشئ عروض الأسعار ومحرك التسعير' }, src: 'Quote Builder, Quote Max, Quoti' },
  { id: 'order', name: { en: 'Order', ar: 'طلب' }, sub: { en: 'sales orders linked to the lead', ar: 'طلبات مبيعات مرتبطة بالعميل' }, src: 'sales_orders' },
  { id: 'production', name: { en: 'Production', ar: 'إنتاج' }, sub: { en: 'cutting, nesting, CNC, quality', ar: 'قص وتوزيع وCNC وجودة' }, src: 'NeoFactory, NeoCut, NeoNest, NeoCNC, NeoQC' },
  { id: 'delivery', name: { en: 'Install and service', ar: 'تركيب وخدمة' }, sub: { en: 'installation and after-sales', ar: 'التركيب وخدمة ما بعد البيع' }, src: 'NeoService, installation workflows' },
  { id: 'finance', name: { en: 'Finance', ar: 'المالية' }, sub: { en: 'receivables, ledger, reports', ar: 'الذمم والدفتر والتقارير' }, src: 'Finance & Accounting' },
];
export const HUB_CAPABILITIES = [
  { id: 'workspace', title: { en: 'Manager workspace', ar: 'مساحة عمل المدير' }, body: { en: 'Role-based workspaces and dashboards: executive, design and engineering, operations, projects, finance and people.', ar: 'مساحات عمل ولوحات تحكم حسب الدور: التنفيذية والتصميم والهندسة والعمليات والمشاريع والمالية والموظفين.' }, src: 'workspaces.json, BI dashboards' },
  { id: 'kpi', title: { en: 'One KPI engine', ar: 'محرك مؤشرات واحد' }, body: { en: 'Every Leads screen and report reads one KPI function, with drill-down to the exact leads behind each number.', ar: 'كل شاشة وتقرير للعملاء المحتملين يقرأ دالة مؤشرات واحدة مع تفصيل إلى العملاء خلف كل رقم.' }, src: 'docs/leads/LEADS-KPI-DEFINITIONS.md' },
  { id: 'rbac', title: { en: 'Role-based access', ar: 'صلاحيات حسب الدور' }, body: { en: 'Permissions are role, resource and action grants, edited in an access-control matrix.', ar: 'الصلاحيات منح حسب الدور والمورد والإجراء، وتُعدَّل في مصفوفة التحكم بالوصول.' }, src: 'ENTERPRISE_RBAC_WORKFLOW.md, AdminAccessControl' },
  { id: 'audit', title: { en: 'Audit trail', ar: 'سجل التدقيق' }, body: { en: 'Audit log modules record who changed what.', ar: 'وحدات سجل التدقيق تسجّل من غيّر ماذا.' }, src: 'AuditLogModule, AuditAdminModule' },
  { id: 'bilingual', title: { en: 'English and Arabic', ar: 'الإنجليزية والعربية' }, body: { en: 'The platform and its guides are written for English and Arabic users, including right-to-left layouts.', ar: 'المنصة وأدلتها مكتوبة لمستخدمي الإنجليزية والعربية بما فيها التخطيط من اليمين إلى اليسار.' }, src: 'src/App.js (RTL), bilingual guides' },
  { id: 'automation', title: { en: 'Automation and AI helpers', ar: 'الأتمتة ومساعدو الذكاء الاصطناعي' }, body: { en: 'An automation centre and AI assistants (classifier, daily briefing, design assistant) sit inside the Hub.', ar: 'مركز أتمتة ومساعدون بالذكاء الاصطناعي (مصنِّف، موجز يومي، مساعد تصميم) داخل المنصة.' }, src: 'AutomationCenter, Bonsai AI, daily briefing' },
];
export const HUB_KPI_NAMES = [{ en: 'Total leads', ar: 'إجمالي العملاء المحتملين' }, { en: 'Won', ar: 'تم الفوز' }, { en: 'Lost', ar: 'خسارة' }, { en: 'Open pipeline', ar: 'الفرص المفتوحة' }, { en: 'Revenue vs target', ar: 'الإيراد مقابل الهدف' }];
export const ILLUSTRATIVE = { en: 'Illustrative: simplified mock-up, not real data', ar: 'توضيحي: نموذج مبسّط وليس بيانات حقيقية' };

// ---- station 4: the investor path (a PROCESS, no figures) ----
export const INVEST_STEPS = [
  { id: 'brief', title: { en: 'Request a private briefing', ar: 'اطلب إحاطة خاصة' }, body: { en: 'Tell us you would like to talk. A member of management replies directly.', ar: 'أخبرنا برغبتك في الحديث. يرد عليك أحد أفراد الإدارة مباشرة.' } },
  { id: 'pack', title: { en: 'Receive the information pack', ar: 'استلم الحزمة التعريفية' }, body: { en: 'Management provides the company information it chooses to give.', ar: 'تقدّم الإدارة معلومات الشركة التي تختار تقديمها.' } },
  { id: 'meet', title: { en: 'Meet the team and visit', ar: 'قابل الفريق وزر المعرض' }, body: { en: 'Meet the people, see the showroom and how the work is done.', ar: 'تعرّف على الفريق وزر المعرض وطريقة العمل.' } },
  { id: 'diligence', title: { en: 'Due diligence', ar: 'العناية الواجبة' }, body: { en: 'You review what matters to you, with your own advisers.', ar: 'تراجع ما يهمك مع مستشاريك.' } },
  { id: 'terms', title: { en: 'Terms', ar: 'الشروط' }, body: { en: 'Any terms are discussed and agreed directly with management.', ar: 'تُناقَش أي شروط وتُتفق مباشرة مع الإدارة.' } },
];
/** words that must never appear in the investor content (tested): figures, returns, valuation, equity, guarantees */
export const FORBIDDEN_FINANCIAL = /\b(roi|returns?|yields?|valuation|equity|stakes?|shares?|dividends?|profits?|guarantee[sd]?|BHD|BD|USD|per\s?cent)\b|[0-9]+\s?(x|times)\b|دينار|عائد|ربح|تقييم|أسهم|ضمان|%/i;

// ---- station 5: the CTA, routed to the EXISTING booking flow ----
export const BRIEFING_INTEREST = 'investor-briefing';
export const BRIEFING_NOTE = { en: 'Request for a private investor briefing (from the virtual showroom). Information only: nothing has been shared or agreed.', ar: 'طلب إحاطة خاصة للمستثمرين (من المعرض الافتراضي). للاطلاع فقط: لم يُشارَك أو يُتَّفق على شيء.' };
export function briefingUrl(lang = 'en') {
  const L2 = lang === 'ar' ? 'ar' : 'en', q = new URLSearchParams({ interest: BRIEFING_INTEREST, source: 'showroom-3d-vip', notes: BRIEFING_NOTE[L2] });
  return withLang('/booking', L2) + '?' + q.toString();
}
export function contactLines(lang = 'en') {
  const out = []; if (FACTS.phone) out.push({ id: 'phone', label: { en: 'Phone', ar: 'الهاتف' }, text: FACTS.phone, href: FACTS.phoneHref, dir: 'ltr' });
  if (FACTS.hours) out.push({ id: 'hours', label: { en: 'Hours', ar: 'ساعات العمل' }, text: FACTS.hours[lang === 'ar' ? 'ar' : 'en'] });
  return out;
}

/** what management must still supply (mirrors docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md; the room shows each as a marked placeholder) */
export const OWNER_INPUTS = ['yearsOfCraft', 'homesDelivered', 'productionModel', 'showroomCount', 'investorInfoPack', 'fundingSought', 'financials', 'briefingContact', 'confirmHubFigures', 'projectsData', 'arabicReview', 'legalDisclaimer'];
