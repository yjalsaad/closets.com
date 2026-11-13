/* Finish configuration for the eight furnished departments. PURE data + lookups (colours come from palette.js, the only place with hex).
 * Names are descriptive labels of a SAMPLE CONFIGURATION shown in the showroom; they are not a price list, a catalogue or a claim that
 * these exact materials are offered: the site's own copy lists "warm oak to deep ebony, in veneer, laminate or hand-sprayed PU paint" for doors.
 * Each finish says which procedural material recipe to use; scenes/products/materials.js turns it into three.js materials. */
import { PALETTE as P } from '../3d/palette';

export const PRODUCT_IDS = ['kitchen', 'wardrobe', 'door', 'bedroom', 'walkin', 'living', 'studio', 'lounge'];

const timber = (tone, color) => ({ kind: 'timber', tone, color });
const paint = (color, rough = 0.62) => ({ kind: 'paint', color, rough });

export const FINISHES = {
  kitchen: [
    { id: 'oak-white-stone', en: 'Natural oak with white veined stone', ar: 'بلوط طبيعي مع حجر أبيض معرّق', swatch: P.oakLight, front: timber(0, P.oakLight), carcass: paint(P.lacquerIvory), stone: 'white', metal: 'brass' },
    { id: 'walnut-dark-stone', en: 'Walnut with dark veined stone', ar: 'جوز داكن مع حجر داكن معرّق', swatch: P.walnutDeep, front: timber(1, P.walnutDeep), carcass: paint(P.lacquerCharcoal), stone: 'dark', metal: 'brass' },
    { id: 'sage-sand-stone', en: 'Sage matt lacquer with sand stone', ar: 'طلاء مطفي بلون المريمية مع حجر رملي', swatch: P.lacquerSage, front: paint(P.lacquerSage), carcass: paint(P.lacquerIvory), stone: 'sand', metal: 'brass' },
    { id: 'charcoal-white-stone', en: 'Charcoal matt lacquer with white veined stone', ar: 'طلاء مطفي فحمي مع حجر أبيض معرّق', swatch: P.lacquerCharcoal, front: paint(P.lacquerCharcoal), carcass: paint(P.lacquerCharcoal), stone: 'white', metal: 'brass' },
  ],
  wardrobe: [
    { id: 'fluted-walnut', en: 'Fluted walnut with bronze and smoked glass', ar: 'جوز محزّز مع برونز وزجاج مدخّن', swatch: P.walnutDeep, front: timber(1, P.walnutDeep), carcass: timber(1, P.smokedOak), metal: 'bronze', fluted: true },
    { id: 'fluted-oak', en: 'Fluted natural oak with brass', ar: 'بلوط طبيعي محزّز مع نحاس أصفر', swatch: P.oakLight, front: timber(0, P.oakLight), carcass: timber(0, P.oakPale), metal: 'brass', fluted: true },
    { id: 'stone-grey', en: 'Stone grey matt lacquer with brass', ar: 'طلاء مطفي رمادي حجري مع نحاس أصفر', swatch: P.lacquerStone, front: paint(P.lacquerStone), carcass: paint(P.lacquerIvory), metal: 'brass', fluted: false },
    { id: 'ivory-bronze', en: 'Ivory matt lacquer with bronze', ar: 'طلاء مطفي عاجي مع برونز', swatch: P.lacquerIvory, front: paint(P.lacquerIvory), carcass: paint(P.lacquerIvory), metal: 'bronze', fluted: false },
  ],
  door: [
    { id: 'oak', en: 'Natural oak veneer', ar: 'قشرة بلوط طبيعي', swatch: P.oakLight, leaf: timber(0, P.oakLight), frame: timber(0, P.oakPale), metal: 'brass' },
    { id: 'walnut', en: 'Walnut veneer', ar: 'قشرة جوز', swatch: P.walnutDeep, leaf: timber(1, P.walnutDeep), frame: timber(1, P.smokedOak), metal: 'brass' },
    { id: 'ivory-paint', en: 'Ivory hand-sprayed paint', ar: 'طلاء مرشوش يدويًا بلون عاجي', swatch: P.lacquerIvory, leaf: paint(P.lacquerIvory), frame: paint(P.lacquerIvory), metal: 'brass' },
    { id: 'ebony-paint', en: 'Deep charcoal hand-sprayed paint', ar: 'طلاء مرشوش يدويًا بلون فحمي داكن', swatch: P.lacquerCharcoal, leaf: paint(P.lacquerCharcoal), frame: paint(P.lacquerCharcoal), metal: 'brass' },
  ],
  bedroom: [
    { id: 'oak-linen', en: 'Natural oak with oatmeal linen', ar: 'بلوط طبيعي مع كتان بلون الشوفان', swatch: P.oakLight, front: timber(0, P.oakLight), carcass: paint(P.lacquerIvory), metal: 'brass', fluted: true, fabric: P.fabricLinen },
    { id: 'walnut-sage', en: 'Walnut with sage upholstery', ar: 'جوز مع تنجيد بلون المريمية', swatch: P.walnutDeep, front: timber(1, P.walnutDeep), carcass: timber(1, P.smokedOak), metal: 'brass', fluted: true, fabric: P.fabricSage },
    { id: 'stone-blush', en: 'Stone grey matt lacquer with blush upholstery', ar: 'طلاء مطفي رمادي حجري مع تنجيد وردي هادئ', swatch: P.lacquerStone, front: paint(P.lacquerStone), carcass: paint(P.lacquerIvory), metal: 'brass', fluted: false, fabric: P.fabricBlush },
    { id: 'charcoal-navy', en: 'Charcoal matt lacquer with navy upholstery', ar: 'طلاء مطفي فحمي مع تنجيد كحلي', swatch: P.lacquerCharcoal, front: paint(P.lacquerCharcoal), carcass: paint(P.lacquerCharcoal), metal: 'bronze', fluted: false, fabric: P.fabricNavy },
  ],
  walkin: [
    { id: 'walnut-brass', en: 'Walnut with brass and a dark stone top', ar: 'جوز مع نحاس أصفر وسطح حجري داكن', swatch: P.walnutDeep, front: timber(1, P.walnutDeep), carcass: timber(1, P.smokedOak), stone: 'dark', metal: 'brass', fabric: P.fabricCharcoal },
    { id: 'oak-brass', en: 'Natural oak with brass and a white stone top', ar: 'بلوط طبيعي مع نحاس أصفر وسطح حجري أبيض', swatch: P.oakLight, front: timber(0, P.oakLight), carcass: timber(0, P.oakPale), stone: 'white', metal: 'brass', fabric: P.fabricCream },
    { id: 'ivory-bronze', en: 'Ivory matt lacquer with bronze and a sand stone top', ar: 'طلاء مطفي عاجي مع برونز وسطح حجري رملي', swatch: P.lacquerIvory, front: paint(P.lacquerIvory), carcass: paint(P.lacquerIvory), stone: 'sand', metal: 'bronze', fabric: P.fabricClay },
    { id: 'charcoal-brass', en: 'Charcoal matt lacquer with brass and a dark stone top', ar: 'طلاء مطفي فحمي مع نحاس أصفر وسطح حجري داكن', swatch: P.lacquerCharcoal, front: paint(P.lacquerCharcoal), carcass: paint(P.lacquerCharcoal), stone: 'dark', metal: 'brass', fabric: P.fabricBlush },
  ],
  living: [
    { id: 'walnut-cream', en: 'Fluted walnut with cream seating', ar: 'جوز محزّز مع جلوس بلون الكريم', swatch: P.walnutDeep, front: timber(1, P.walnutDeep), carcass: timber(1, P.smokedOak), metal: 'brass', fluted: true, fabric: P.fabricCream },
    { id: 'oak-sage', en: 'Fluted natural oak with sage seating', ar: 'بلوط طبيعي محزّز مع جلوس بلون المريمية', swatch: P.oakLight, front: timber(0, P.oakLight), carcass: paint(P.lacquerIvory), metal: 'brass', fluted: true, fabric: P.fabricSage },
    { id: 'stone-clay', en: 'Stone grey matt lacquer with clay seating', ar: 'طلاء مطفي رمادي حجري مع جلوس بلون الطين', swatch: P.lacquerStone, front: paint(P.lacquerStone), carcass: paint(P.lacquerStone), metal: 'brass', fluted: false, fabric: P.fabricClay },
    { id: 'charcoal-linen', en: 'Charcoal matt lacquer with linen seating', ar: 'طلاء مطفي فحمي مع جلوس من الكتان', swatch: P.lacquerCharcoal, front: paint(P.lacquerCharcoal), carcass: paint(P.lacquerCharcoal), metal: 'bronze', fluted: false, fabric: P.fabricLinen },
  ],
  studio: [
    { id: 'oak', en: 'Natural oak table and cabinets', ar: 'طاولة وخزائن من البلوط الطبيعي', swatch: P.oakLight, front: timber(0, P.oakLight), carcass: timber(0, P.oakPale), stone: 'white', metal: 'brass', fabric: P.fabricLinen },
    { id: 'walnut', en: 'Walnut table and cabinets', ar: 'طاولة وخزائن من الجوز', swatch: P.walnutDeep, front: timber(1, P.walnutDeep), carcass: timber(1, P.smokedOak), stone: 'dark', metal: 'brass', fabric: P.fabricCharcoal },
    { id: 'ivory', en: 'Ivory matt lacquer table and cabinets', ar: 'طاولة وخزائن بطلاء مطفي عاجي', swatch: P.lacquerIvory, front: paint(P.lacquerIvory), carcass: paint(P.lacquerIvory), stone: 'sand', metal: 'bronze', fabric: P.fabricSage },
    { id: 'charcoal', en: 'Charcoal matt lacquer table and cabinets', ar: 'طاولة وخزائن بطلاء مطفي فحمي', swatch: P.lacquerCharcoal, front: paint(P.lacquerCharcoal), carcass: paint(P.lacquerCharcoal), stone: 'dark', metal: 'brass', fabric: P.fabricClay },
  ],
  lounge: [
    { id: 'oak-clay', en: 'Natural oak with clay seating', ar: 'بلوط طبيعي مع جلوس بلون الطين', swatch: P.oakLight, front: timber(0, P.oakLight), carcass: timber(0, P.oakPale), stone: 'white', metal: 'brass', fluted: true, fabric: P.fabricClay },
    { id: 'walnut-cream', en: 'Walnut with cream seating', ar: 'جوز مع جلوس بلون الكريم', swatch: P.walnutDeep, front: timber(1, P.walnutDeep), carcass: timber(1, P.smokedOak), stone: 'dark', metal: 'brass', fluted: true, fabric: P.fabricCream },
    { id: 'stone-sage', en: 'Stone grey matt lacquer with sage seating', ar: 'طلاء مطفي رمادي حجري مع جلوس بلون المريمية', swatch: P.lacquerStone, front: paint(P.lacquerStone), carcass: paint(P.lacquerIvory), stone: 'sand', metal: 'brass', fluted: false, fabric: P.fabricSage },
    { id: 'charcoal-blush', en: 'Charcoal matt lacquer with blush seating', ar: 'طلاء مطفي فحمي مع جلوس وردي هادئ', swatch: P.lacquerCharcoal, front: paint(P.lacquerCharcoal), carcass: paint(P.lacquerCharcoal), stone: 'dark', metal: 'bronze', fluted: false, fabric: P.fabricBlush },
  ],
};

export const finishList = (product) => FINISHES[product] || [];
export const finishIds = (product) => finishList(product).map((f) => f.id);
export const defaultFinish = (product) => (finishList(product)[0] || {}).id || null;
export const getFinish = (product, id) => finishList(product).find((f) => f.id === id) || finishList(product)[0] || null;
export const finishLabel = (product, id, lang) => { const f = getFinish(product, id); return f ? (lang === 'ar' ? f.ar : f.en) : ''; };
/** next / previous finish id, wrapping */
export function cycleFinish(product, id, dir = 1) {
  const ids = finishIds(product); if (!ids.length) return null;
  const i = Math.max(0, ids.indexOf(id)); return ids[(i + dir + ids.length) % ids.length];
}
