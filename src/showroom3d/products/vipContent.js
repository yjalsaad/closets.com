/* VIP meeting room (company presentation boardroom): PURE content + helpers (unit-tested). No DOM, no three.js, no network.
 *
 * Honesty rules (owner brief):
 *  - company facts come ONLY from src/content/facts.js and existing site / showroom copy; the facts the site itself contradicts
 *    (years of craft, homes delivered, production model, showroom count) are shown as MARKED PLACEHOLDERS ("to be confirmed by management")
 *    until facts.js holds a confirmed value, then they appear automatically;
 *  - the Bonsai Hub station only lists capabilities that exist in the Hub repository (module map, RBAC model, audit modules, lead KPI engine, ...);
 *    the module UIs drawn on the screens are simplified procedural mock-ups and say "illustrative";
 *  - no figures, returns, valuation, equity amounts, ROI or guarantees anywhere in the built-in content, and the disclaimer is always shown (the investor path was removed at the owner's request);
 *  - what management must still supply is listed in OWNER_INPUTS (and in docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md). */
import { FACTS, hasFact } from '../../content/facts';
import { withLang } from '../../seo/routes';
import { DISCLAIMER, PLACEHOLDER, FORBIDDEN_FINANCIAL, L, resolveText } from '../vip/deckSchema';
import { DEFAULT_DECK } from '../vip/decks/default';

export { DISCLAIMER, PLACEHOLDER, FORBIDDEN_FINANCIAL, L };

export const VIP_ID = 'vip';
export const VIP_DEPT = { id: VIP_ID, en: 'VIP Meeting Room', ar: 'غرفة الاجتماعات VIP', index: 9, vip: true };


/** the five stations of the DEFAULT deck (src/showroom3d/vip/decks/default.js): id, title, lead */
export const STATIONS = DEFAULT_DECK.slides.map(({ id, title, lead }) => ({ id, title, lead }));
export const stationIds = () => STATIONS.map((s) => s.id);
/** station state machine (pure): clamp, no wrap-around, so "Next" on the last station is disabled and the contact CTA stays the end of the path */
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
export function storyLines() { return DEFAULT_DECK.slides[0].bullets.map((b) => ({ en: resolveText(b, 'en'), ar: resolveText(b, 'ar') })); }

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

// ---- station 4: the generic contact hand-off, routed to the EXISTING booking flow (no investor wording, no special interest) ----
export const CONTACT_SOURCE = 'showroom-3d-vip';
export function contactUrl(lang = 'en') {
  const L2 = lang === 'ar' ? 'ar' : 'en'; return withLang('/booking', L2) + '?' + new URLSearchParams({ source: CONTACT_SOURCE }).toString();
}
export function contactLines(lang = 'en') {
  const out = []; if (FACTS.phone) out.push({ id: 'phone', label: { en: 'Phone', ar: 'الهاتف' }, text: FACTS.phone, href: FACTS.phoneHref, dir: 'ltr' });
  if (FACTS.hours) out.push({ id: 'hours', label: { en: 'Hours', ar: 'ساعات العمل' }, text: FACTS.hours[lang === 'ar' ? 'ar' : 'en'] });
  return out;
}

/** what management must still supply (mirrors docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md; the room shows each as a marked placeholder) */
export const OWNER_INPUTS = ['yearsOfCraft', 'homesDelivered', 'productionModel', 'showroomCount', 'confirmHubFigures', 'projectsData', 'arabicReview', 'legalDisclaimer'];
