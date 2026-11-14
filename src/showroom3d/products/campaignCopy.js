/* Ikhtarha (اختارها) campaign copy used by the showroom stage and its panel.
 * EVERY string here is copied from the existing campaign code, nothing is written fresh and nothing is invented:
 *   src/campaign/HomeCampaign.jsx   home.ikh.* defaults (eyebrow, title, sub, steps s1..s3 + descriptions, CTA labels, fine print)
 *   src/campaign/IkhtarhaRoot.jsx   BRAND.slogan_ar / slogan_en, S.how* (how it works)
 * Deliberately NOT here: prizes, discount values, dates, counts. The brand kit rule in HomeCampaign.jsx says public materials never name
 * prizes or values (the prize is revealed only inside the game), and the dates are a CMS-editable setting of the live campaign.
 * The a unit test checks these strings against the campaign source files so they cannot drift silently. */
export const IK = {
  name: { en: 'Ikhtarha', ar: 'اختارها' },
  eyebrow: { en: 'Ikhtarha · by The Closets', ar: 'حملة اختارها · من الخزائن' },
  title: { en: 'Beautiful designs… and the prize is your choice.', ar: 'تصاميم روعة… والجائزة باختيارك' },
  slogan: { en: 'Beautiful designs. Ready for you.', ar: 'تصاميم جميلة. جاهزة لك.' },
  lead: { en: 'Price your design and pick your prize box.', ar: 'سعّر تصميمك واختار صندوق جائزتك.' },
  steps: [
    { t: { en: 'Price your design', ar: 'سعّر تصميمك' }, d: { en: 'Visit a showroom or book a free home visit — every quotation takes part.', ar: 'زر معرضنا أو احجز زيارة منزلية مجانية — كل عروض الأسعار تشارك.' } },
    { t: { en: 'Get your Ikhtarha code', ar: 'استلم كود اختارها' }, d: { en: 'Your quotation comes with a personal code and link.', ar: 'يوصلك مع عرض السعر كود ورابط خاص فيك.' } },
    { t: { en: 'Pick your prize box', ar: 'اختار صندوق جائزتك' }, d: { en: 'Open it and reveal your prize — it’s added to your quotation.', ar: 'افتحه واكتشف جائزتك — وتنضاف على عرض السعر.' } },
  ],
  cta: { price: { en: 'Price & pick your box', ar: 'سعّر واختار صندوقك' }, play: { en: 'I have a code — play', ar: 'عندي كود — العب الآن' }, demo: { en: 'Try a sample game', ar: 'جرّب لعبة تجريبية' } },
  fine: { en: 'One game per quotation. Prizes are drawn by our system. Terms & conditions apply.', ar: 'لعبة واحدة لكل عرض سعر. يتم سحب الجوائز آليًا. تطبق الشروط والأحكام.' },
};
export const ikt = (o, lang) => (lang === 'ar' ? o.ar : o.en);
