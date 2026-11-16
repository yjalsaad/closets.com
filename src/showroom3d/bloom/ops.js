/* ILLUSTRATIVE operations data for the Staff Operations bay and the Leads wall of Bloom Meeting. PURE.
 * Everything here is SAMPLE data made up for the display: it is labelled "Illustrative" on every panel, it contains no customer, no name, no phone, no address and no real figure,
 * and it is never read from the site or the Hub. (The Hub's real data is not exposed to guests.) The "live" feel comes from a deterministic drift (opsFrame) of the sample numbers. */
export const ILLUSTRATIVE = { en: 'Illustrative data', ar: 'بيانات توضيحية' };
const T = (en, ar) => ({ en, ar });
export const STAGES = [
  { id: 'new', title: T('New', 'جديد'), base: 24 }, { id: 'contacted', title: T('Contacted', 'تم التواصل'), base: 17 },
  { id: 'quoted', title: T('Proposal Sent', 'تم إرسال العرض'), base: 9 }, { id: 'won', title: T('Won', 'تم الإنجاز'), base: 4 },
];
/** generic sample cards: a code and a product line only (never a person) */
export const SAMPLE_CARDS = {
  new: [T('Lead A-104 · Wardrobe', 'عميل A-104 · خزانة'), T('Lead A-105 · Kitchen', 'عميل A-105 · مطبخ'), T('Lead A-106 · Walk-in closet', 'عميل A-106 · غرفة ملابس')],
  contacted: [T('Lead A-097 · Kitchen', 'عميل A-097 · مطبخ'), T('Lead A-099 · Bedroom', 'عميل A-099 · غرفة نوم')],
  quoted: [T('Lead A-081 · Wardrobe', 'عميل A-081 · خزانة'), T('Lead A-084 · Doors', 'عميل A-084 · أبواب')],
  won: [T('Lead A-070 · Kitchen', 'عميل A-070 · مطبخ')],
};
export const TASKS = [
  { id: 't1', title: T('Confirm site measurement', 'تأكيد قياس الموقع'), done: true }, { id: 't2', title: T('Send sample finishes', 'إرسال عيّنات التشطيبات'), done: true },
  { id: 't3', title: T('Follow up open quotations', 'متابعة عروض الأسعار المفتوحة'), done: false }, { id: 't4', title: T('Schedule production slot', 'جدولة موعد الإنتاج'), done: false },
  { id: 't5', title: T('Prepare installation pack', 'تجهيز ملف التركيب'), done: false },
];
export const TARGETS = [
  { id: 'leads', title: T('Leads handled', 'العملاء المحتملون'), pct: 72 }, { id: 'quotes', title: T('Quotations sent', 'عروض الأسعار المرسلة'), pct: 58 }, { id: 'visits', title: T('Showroom visits', 'زيارات الصالة'), pct: 81 },
];
/** the funnel for a time t (seconds): the sample numbers drift a little so the wall looks alive; deterministic, never negative, stage counts never increase down the funnel */
export function opsFrame(t = 0) {
  const stages = STAGES.map((s, i) => ({ id: s.id, title: s.title, n: Math.max(1, Math.round(s.base + Math.sin(t / 7 + i * 1.7) * (2.4 - i * 0.4)))}));
  for (let i = 1; i < stages.length; i++) stages[i].n = Math.min(stages[i].n, stages[i - 1].n - 1);
  const targets = TARGETS.map((x, i) => ({ ...x, pct: Math.max(1, Math.min(99, Math.round(x.pct + Math.sin(t / 11 + i) * 2))) }));
  return { stages, targets, tasks: TASKS, tick: Math.floor(t) };
}

/* ------------------------------------------------------------------------------------------------------------------------------------------------------------
 * LEAD ROADMAP: the STRUCTURE of the Bonsai Hub "Lead Roadmap" page (closets-hub, branch claude/lead-roadmap, docs/lead-roadmap/DESIGN.md), reproduced as an illustration.
 * Mapped: the five stages and their order, the labels (EN / AR as on the Hub's Leads page), the card anatomy (code, product line, follow-up badge, stale badge), the
 * move rules and the 5 s undo, the filters. LEFT OUT on purpose: any live read (no Hub / Supabase call), names, phones, emails, companies, deal values (BD amounts), owners,
 * real counts and dates. The counts below are made-up and drift slowly; the wall says "Illustrative data".
 * ------------------------------------------------------------------------------------------------------------------------------------------------------------ */
export const ROADMAP_STAGES = [
  { id: 'new', title: T('New', 'جديد'), base: 24, rank: 0 },
  { id: 'contacted', title: T('Contacted', 'تم التواصل'), base: 17, rank: 1 },
  { id: 'proposal', title: T('Proposal Sent', 'تم إرسال العرض'), base: 9, rank: 2 },
  { id: 'won', title: T('Won', 'مكسوبة'), base: 5, rank: 3 },
  { id: 'lost', title: T('Lost', 'خاسرة'), base: 7, rank: 3 },
];
export const ROADMAP_CARDS = {
  new: [{ code: 'A-104', line: T('Wardrobe', 'خزانة'), due: true }, { code: 'A-105', line: T('Kitchen', 'مطبخ') }, { code: 'A-106', line: T('Walk-in closet', 'غرفة ملابس'), stale: true }],
  contacted: [{ code: 'A-097', line: T('Kitchen', 'مطبخ'), due: true }, { code: 'A-099', line: T('Bedroom', 'غرفة نوم') }],
  proposal: [{ code: 'A-081', line: T('Wardrobe', 'خزانة'), stale: true }, { code: 'A-084', line: T('Doors', 'أبواب') }],
  won: [{ code: 'A-070', line: T('Kitchen', 'مطبخ') }],
  lost: [{ code: 'A-052', line: T('Doors', 'أبواب'), reason: true }],
};
export const ROADMAP_FILTERS = [T('Owner', 'المسؤول'), T('Source', 'المصدر'), T('Search', 'بحث'), T('Stale only', 'المتأخرة فقط')];
export const ROADMAP_RULES = [
  T('Drag a card to a later stage: any later stage, skipping is allowed.', 'اسحب البطاقة إلى مرحلة لاحقة: يُسمح بتخطي المراحل.'),
  T('Won needs a deal value; Lost needs a reason.', 'الإنجاز يحتاج قيمة الصفقة؛ الخسارة تحتاج سببًا.'),
  T('Back or reopen: managers only, with a reason. Won and Lost: reopen first.', 'الرجوع أو إعادة الفتح للمديرين فقط مع سبب. من مكسوبة إلى خاسرة: أعد الفتح أولًا.'),
  T('Undo within 5 seconds; the move is saved when the window ends.', 'تراجع خلال 5 ثوانٍ؛ يُحفظ النقل بعد انتهاء المهلة.'),
];
export const ROADMAP_BADGES = { due: T('Follow-up due', 'متابعة مستحقة'), stale: T('Stale 14 days', 'راكدة 14 يومًا'), reason: T('Reason set', 'السبب مسجّل') };
export const ROADMAP_NOTE = T('Mapped from the Bonsai Hub Lead Roadmap (structure only)', 'مأخوذ من خارطة العملاء المحتملين في Bonsai Hub (الهيكل فقط)');
/** the roadmap counts at time t (seconds): slow deterministic drift; later open stages never exceed the stage before them */
export function roadmapFrame(t = 0) {
  const stages = ROADMAP_STAGES.map((s, i) => ({ ...s, n: Math.max(1, Math.round(s.base + Math.sin(t / 8 + i * 1.3) * (2 - i * 0.25))) }));
  for (let i = 1; i < 3; i++) stages[i].n = Math.min(stages[i].n, stages[i - 1].n - 1);
  return { stages, cards: ROADMAP_CARDS };
}
