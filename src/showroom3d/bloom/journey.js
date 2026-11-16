/* ORDER JOURNEY: the full path of an order, from "Quote accepted" to "Final payment", for the Order Journey wall on Floor 2 (the companion of the Lead Roadmap wall). PURE.
 * STATIC, ILLUSTRATIVE content only: stage names and one-line descriptions. No order numbers, no names, no figures, no dates, no live read (nothing comes from the Hub or the site).
 * Three runs: the CLOSETS lane (up to the LPO gate), the YAS FACTORY lane (production), then back to the CLOSETS colour (packing to final payment).
 * The "LPO approved" step is the GATE between the two lanes: it is auto-approved for now, and it is where the order is handed to YAS Factory.
 * Colours: the Closets colour is the brand orange, the YAS Factory colour is the Volukus Marble of the YAS Wood Collection (the palette the rest of Floor 2 uses). */
import { BLOOM_LIGHT, FINISHES } from './palette';

const T = (en, ar) => ({ en, ar });
export const JOURNEY_LANES = Object.freeze({
  closets: { id: 'closets', title: T('CLOSETS', 'الخزائن'), color: BLOOM_LIGHT.orange },
  factory: { id: 'factory', title: T('YAS FACTORY', 'مصنع YAS'), color: FINISHES.volukus.color },
});
/** lane of a stage: 'closets' (before the gate), 'gate', 'factory', 'after' (back in the Closets colour) */
export const JOURNEY_STAGES = Object.freeze([
  { id: 'quote', lane: 'closets', title: T('Quote accepted', 'قبول عرض السعر'), desc: T('The customer accepts our quotation and the order opens.', 'يقبل العميل عرض السعر ويُفتح الطلب.') },
  { id: 'survey', lane: 'closets', title: T('Site survey', 'معاينة الموقع'), desc: T('We visit the site and measure the space.', 'نزور الموقع ونقيس المساحة.') },
  { id: 'design', lane: 'closets', title: T('Design approval', 'اعتماد التصميم'), desc: T('The customer signs off the final design and finishes.', 'يعتمد العميل التصميم النهائي والتشطيبات.') },
  { id: 'deposit', lane: 'closets', title: T('Deposit / payment', 'الدفعة المقدمة'), desc: T('The agreed deposit is received.', 'استلام الدفعة المقدمة المتفق عليها.') },
  { id: 'lpo-issued', lane: 'closets', title: T('LPO issued', 'إصدار أمر الشراء'), desc: T('A local purchase order (LPO) is raised for the order.', 'يُصدر أمر شراء محلي (LPO) للطلب.') },
  { id: 'lpo-approved', lane: 'gate', gate: true, title: T('LPO APPROVED', 'اعتماد أمر الشراء'), desc: T('Auto-approved for now. The order is handed to YAS Factory.', 'اعتماد تلقائي حاليًا. يُسلَّم الطلب إلى مصنع YAS.') },
  { id: 'production', lane: 'factory', title: T('Production order created', 'إنشاء أمر الإنتاج'), desc: T('YAS Factory opens the production order.', 'يفتح مصنع YAS أمر الإنتاج.') },
  { id: 'cutting', lane: 'factory', title: T('Materials & cutting', 'المواد والقص'), desc: T('Boards and materials are prepared and cut to size.', 'تُجهَّز الألواح والمواد وتُقصّ حسب المقاس.') },
  { id: 'assembly', lane: 'factory', title: T('Assembly & finishing', 'التجميع والتشطيب'), desc: T('Units are assembled and finished.', 'تُجمَّع الوحدات وتُشطَّب.') },
  { id: 'qc', lane: 'factory', title: T('QC', 'مراقبة الجودة'), desc: T('Each unit is quality-checked before it leaves the factory.', 'تُفحص جودة كل وحدة قبل خروجها من المصنع.') },
  { id: 'packing', lane: 'after', title: T('Packing', 'التغليف'), desc: T('Finished units are packed for transport.', 'تُغلَّف الوحدات الجاهزة للنقل.') },
  { id: 'delivery', lane: 'after', title: T('Delivery', 'التوصيل'), desc: T('Units are delivered to the customer\'s site.', 'تُوصَّل الوحدات إلى موقع العميل.') },
  { id: 'install', lane: 'after', title: T('Installation', 'التركيب'), desc: T('Our team installs everything on site.', 'يركّب فريقنا كل شيء في الموقع.') },
  { id: 'snag', lane: 'after', title: T('Snag list', 'قائمة الملاحظات'), desc: T('Small remaining fixes are listed and corrected.', 'تُسجَّل الملاحظات الصغيرة المتبقية وتُصحَّح.') },
  { id: 'handover', lane: 'after', title: T('Handover', 'التسليم'), desc: T('The finished work is handed over to the customer.', 'يُسلَّم العمل المكتمل إلى العميل.') },
  { id: 'final', lane: 'after', title: T('Final payment', 'الدفعة النهائية'), desc: T('The balance is settled and the order closes.', 'تُسدَّد الدفعة المتبقية ويُغلق الطلب.') },
]);
export const JOURNEY_TITLE = T('Order Journey', 'رحلة الطلب');
export const JOURNEY_SUB = T('From accepted quote to final payment. Closets hands the order to YAS Factory at the LPO gate.', 'من قبول عرض السعر إلى الدفعة النهائية. تسلّم الخزائن الطلب إلى مصنع YAS عند بوابة اعتماد أمر الشراء.');
export const JOURNEY_AFTER = T('AFTER PRODUCTION: back with CLOSETS', 'بعد الإنتاج: العودة إلى الخزائن');
export const JOURNEY_NOTE = T('Static overview: no live orders, no real figures', 'نظرة عامة ثابتة: بلا طلبات حقيقية ولا أرقام فعلية');
export const JOURNEY_GATE_LABEL = T('GATE', 'بوابة');
/** the colour of a stage: the lane colour (the gate glows in the Closets colour, the after-production run returns to it) */
export const stageLane = (s) => (s.lane === 'factory' ? 'factory' : 'closets');
export const stageColor = (s) => JOURNEY_LANES[stageLane(s)].color;
export const journeyRuns = () => ({ before: JOURNEY_STAGES.filter((s) => s.lane === 'closets'), gate: JOURNEY_STAGES.find((s) => s.gate), factory: JOURNEY_STAGES.filter((s) => s.lane === 'factory'), after: JOURNEY_STAGES.filter((s) => s.lane === 'after') });
