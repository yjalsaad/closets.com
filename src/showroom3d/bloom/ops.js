/* ILLUSTRATIVE operations data for the Staff Operations bay and the Leads wall of Bloom Meeting. PURE.
 * Everything here is SAMPLE data made up for the display: it is labelled "Illustrative" on every panel, it contains no customer, no name, no phone, no address and no real figure,
 * and it is never read from the site or the Hub. (The Hub's real data is not exposed to guests.) The "live" feel comes from a deterministic drift (opsFrame) of the sample numbers. */
export const ILLUSTRATIVE = { en: 'Illustrative data', ar: 'بيانات توضيحية' };
const T = (en, ar) => ({ en, ar });
export const STAGES = [
  { id: 'new', title: T('New', 'جديد'), base: 24 }, { id: 'contacted', title: T('Contacted', 'تم التواصل'), base: 17 },
  { id: 'quoted', title: T('Quoted', 'عُرض سعر'), base: 9 }, { id: 'won', title: T('Won', 'تم الإنجاز'), base: 4 },
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
