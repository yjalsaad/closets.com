/* =============================================================================
 * Neo Quote Builder [NEO-QUOTE-UX33] - the AUTO lines of a quote: each studio's own priced result turned into commercial lines.
 * Nothing is re-priced here. Every adapter returns { lines, net, source } where `net` is the studio's own figure before VAT and the lines add up
 * to it EXACTLY (checked in __tests__/quoteLines.test.js against the real engines). Where a studio has a hidden markup / margin step (doors,
 * the category studios) it is spread over the visible lines pro rata (quoteMath.allocateToTotal) instead of being shown to the customer.
 *
 * line = { id:'a:<key>', kind:'auto', group, en, ar, qty:1, unit:'lot', unitPrice, autoPrice, perUnit:true, discount:null, override:null }
 * ===========================================================================*/
import { allocateToTotal, r3 } from './quoteMath';

/** customer-facing group names (used by the 'grouped' presentation and the panel sections) */
export const GROUP_NAMES = {
  carcass: ['Carcass and structure', 'الهيكل والبنية'],
  doors: ['Doors and fronts', 'الأبواب والواجهات'],
  interior: ['Interior fittings', 'التجهيز الداخلي'],
  materials: ['Materials', 'المواد'],
  hardware: ['Hardware and accessories', 'الاكسسوارات والمعدات'],
  labour: ['Workshop labour', 'عمالة الورشة'],
  finishing: ['Finishing', 'التشطيب'],
  boards: ['Boards and worktop', 'الألواح وسطح العمل'],
  extras: ['Specialist items', 'بنود خاصة'],
  services: ['Services', 'الخدمات'],
  allowance: ['Allowances', 'مخصصات'],
  other: ['Other', 'أخرى'],
  lump: ['Design, supply and manufacture', 'التصميم والتوريد والتصنيع'],
};

const line = (key, group, en, ar, amount) => ({
  id: `a:${key}`, kind: 'auto', group, en, ar, qty: 1, unit: 'lot', unitPrice: r3(amount), autoPrice: r3(amount), perUnit: true, discount: null, override: null,
});

/* ---- wardrobe: priceWardrobe() -> lines[{key,label,sell}] already sell prices ex-VAT ------------------------------------ */
const WD = {
  carcase: ['carcass', 'Wardrobe carcass', 'هيكل الخزانة'],
  door: ['doors', null, 'الأبواب'],
  interior: ['interior', 'Internal configuration', 'التجهيز الداخلي'],
  glass: ['doors', null, 'الزجاج'],
  accessories: ['hardware', 'Accessories', 'الاكسسوارات'],
  hardware: ['hardware', 'Hardware', 'المعدات'],
  services: ['services', 'Services', 'الخدمات'],
};
export function linesFromWardrobe(priced) {
  const src = priced && Array.isArray(priced.lines) ? priced.lines : [];
  const lines = src.filter((l) => Number(l.sell) > 0).map((l) => {
    const m = WD[l.key] || ['other', l.label, l.label];
    return line(l.key, m[0], m[1] || l.label, m[2], l.sell);
  });
  return { lines, net: r3(priced && priced.subtotal !== undefined ? priced.subtotal : lines.reduce((s, l) => s + l.unitPrice, 0)), source: 'priceWardrobe' };
}

/* ---- kitchen / custom: estimate() / estimateCustom() -> lines[{k,en,ar,amount}] + labour = net ------------------------------- */
const kGroup = (k) => (/^hw-/.test(k) ? 'hardware' : 'materials');
function fromEstimate(est, source) {
  const lines = (est.lines || []).filter((l) => Number(l.amount) > 0).map((l) => line(l.k, kGroup(l.k), l.en, l.ar, l.amount));
  if (Number(est.labour) > 0) lines.push(line('labour', 'labour', 'Workshop labour and assembly', 'عمالة الورشة والتجميع', est.labour));
  return { lines, net: r3(est.net), source };
}
export const linesFromKitchen = (est) => fromEstimate(est, 'estimate');
export const linesFromCustom = (est) => fromEstimate(est, 'estimateCustom');

/* ---- doors: priceDoor() -> lines[{k,en,ar,amount}] (cost) + uplift in lines, then markup -> net ------------------------------- */
const dGroup = (k) => (/^lab-/.test(k) ? 'labour' : /^hw-/.test(k) ? 'hardware' : k === 'finish' ? 'finishing' : k === 'fire' ? 'allowance' : 'materials');
export function linesFromDoors(price) {
  const base = (price.lines || []).filter((l) => Number(l.amount) > 0);
  const grown = allocateToTotal(base, price.net);
  const lines = grown.map((l) => line(l.k, dGroup(l.k), l.en, l.ar, l.amount));
  return { lines, net: r3(price.net), source: 'priceDoor' };
}

/* ---- category studios: priceCategory() -> lines + labour + margin = total (no VAT in it) ----------------------------------- */
export function linesFromCategory(price) {
  const base = (price.lines || []).filter((l) => Number(l.amount) > 0).map((l) => ({ ...l, amount: l.amount }));
  if (Number(price.labour) > 0) base.push({ k: 'labour', en: 'Workshop labour and assembly', ar: 'عمالة الورشة والتجميع', amount: price.labour, group: 'labour' });
  const grown = allocateToTotal(base, price.total);
  const lines = grown.map((l) => line(l.k, l.group === 'boards' ? 'boards' : l.group || 'other', l.en, l.ar, l.amount));
  return { lines, net: r3(price.total), source: 'priceCategory' };
}

/* ---- extras the user adds --------------------------------------------------------------------------------------------------- */
export const QUICK_EXTRAS = [
  { key: 'delivery', en: 'Delivery', ar: 'التوصيل', group: 'services' },
  { key: 'install', en: 'Installation', ar: 'التركيب', group: 'services' },
  { key: 'transport', en: 'Transport', ar: 'النقل', group: 'services' },
  { key: 'site', en: 'Site works', ar: 'أعمال الموقع', group: 'services' },
  { key: 'handles', en: 'Extra handles', ar: 'مقابض إضافية', group: 'hardware' },
  { key: 'removal', en: 'Removal of the old unit', ar: 'إزالة الوحدة القديمة', group: 'services' },
];

let seq = 0;
export const newLineId = () => `x:${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
export function newExtra(over) {
  return { id: newLineId(), kind: 'extra', group: 'services', en: '', ar: '', qty: 1, unit: 'pc', unitPrice: 0, autoPrice: 0, perUnit: false, discount: null, override: null, ...(over || {}) };
}
