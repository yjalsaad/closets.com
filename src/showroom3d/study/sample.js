/* A LAYOUT SAMPLE with placeholder numbers (1, 2, 3, 10, 20 ...). It exists so the page, the editor and the tests can be shown without the confidential
 * study: the real study file is NOT part of this repository (it is a public repository) and is loaded on the owner's device with "Import".
 * Nothing here is a figure of YAS WOOD. The study carries sample: true, which the page shows as a banner. */
export const SAMPLE_STUDY = {
  v: 1, id: 'yas-wood-study-sample', sample: true, rate: 1000,
  title: 'دراسة جدوى (نموذج للتخطيط فقط)',
  subtitle: 'هذا نموذج لشكل الصفحة بأرقام وهمية. استورد ملف الدراسة الحقيقي من جهازك.',
  meta: 'نموذج • أرقام وهمية',
  sections: [
    { id: 'summary', part: 'dashboard', kicker: 'الملخص', title: 'الملخص التنفيذي', lead: 'فقرة تمهيدية قصيرة تظهر هنا (نص تجريبي).', blocks: [
      { id: 'kpis', type: 'stats', items: [
        { label: 'المؤشر الأول', value: '$1.0M', usd: 1000000, note: 'ملاحظة', detail: { desc: 'شرح تجريبي للمؤشر.', metrics: [{ label: 'قياس', val: '10' }], bullets: ['نقطة تجريبية'] } },
        { label: 'المؤشر الثاني', value: '20%' }, { label: 'المؤشر الثالث', value: '3 أشهر' }, { label: 'المؤشر الرابع', value: '$2.0M', usd: 2000000 },
      ] },
      { id: 'mix', type: 'chart', kind: 'donut', title: 'توزيع (نموذج)', unit: '%', labels: ['أ', 'ب', 'ج'], series: [{ name: 'النسبة', values: [50, 30, 20] }] },
    ] },
    { id: 'gallery', part: 'dashboard', kicker: 'الصور', title: 'معرض الصور', lead: 'ارفع صورة لكل بطاقة من وضع التحرير.', blocks: [
      { id: 'g', type: 'cards', items: [{ title: 'صورة 1', tag: 'وسم', text: 'وصف تجريبي.' }, { title: 'صورة 2', tag: 'وسم', text: 'وصف تجريبي.' }, { title: 'صورة 3', tag: 'وسم', text: 'وصف تجريبي.' }] },
    ] },
    { id: 'market', part: 'dashboard', kicker: 'السوق', title: 'السوق', blocks: [
      { id: 'hb', type: 'chart', kind: 'hbar', title: 'مخطط أفقي (نموذج)', unit: 'ألف', labels: ['أ', 'ب', 'ج', 'د'], series: [{ name: 'القيمة', values: [40, 30, 20, 10] }] },
      { id: 'sw', type: 'lists', title: 'قوائم', groups: [{ title: 'القائمة الأولى', items: ['عنصر 1', 'عنصر 2'] }, { title: 'القائمة الثانية', items: ['عنصر 1', 'عنصر 2'] }] },
    ] },
    { id: 'finance', part: 'dashboard', kicker: 'المالية', title: 'النموذج المالي', blocks: [
      { id: 'combo', type: 'chart', kind: 'combo', title: 'مخطط مركب (نموذج)', unit: 'مليون', labels: ['السنة 1', 'السنة 2', 'السنة 3'], series: [{ name: 'السلسلة 1', values: [10, 12, 14] }, { name: 'السلسلة 2', values: [3, 4, 5] }, { name: 'خط', values: [2, 5, 9], line: true }] },
      { id: 'sim', type: 'simulator', title: 'محاكي (قيم وهمية)', base: { rev: 20000000, cogsPct: 50, intRate: 8, otherOpexPct: 20, depreciation: 400000, loan: 4000000, principal: 2000000, maint: 300000, tax: 15, minDscr: 1.35 } },
      { id: 'tb', type: 'table', title: 'جدول (نموذج)', head: ['البند', 'السنة 1', 'السنة 2'], rows: [['الصف 1', '1', '2'], ['الصف 2', '3', '4'], ['الإجمالي', '4', '6']] },
    ] },
    { id: 'details', part: 'full', kicker: 'التفاصيل', title: 'تفاصيل الدراسة', blocks: [
      { id: 'kv', type: 'kv', title: 'بطاقة تعريف', items: [{ k: 'الاسم', v: 'نص تجريبي' }, { k: 'الموقع', v: 'نص تجريبي' }] },
      { id: 'bl', type: 'bullets', title: 'نقاط', items: ['نقطة 1', 'نقطة 2'] },
      { id: 'im', type: 'image', alt: 'صورة', caption: 'صورة مستقلة (ارفع صورة)' },
      { id: 'co', type: 'callout', title: 'التوصية', text: 'نص التوصية التجريبي.' },
    ] },
  ],
};
