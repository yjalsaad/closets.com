// LegalPages.jsx — /privacy and /terms on THIS site.
// *** PLACEHOLDER CONTENT. *** The wording below is intentionally NOT legal text. The owner / their lawyer
// replaces every [PLACEHOLDER] block with approved text (see docs/PRIVACY-DECISIONS.md). Until then the
// page is marked noindex so search engines do not publish an unapproved policy.
import { useEffect } from 'react';

function useNoIndex() {
  useEffect(() => {
    let m = document.head.querySelector('meta[name="robots"]');
    const created = !m;
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'robots'); document.head.appendChild(m); }
    const prev = m.getAttribute('content');
    m.setAttribute('content', 'noindex, nofollow');
    return () => { if (created) m.remove(); else if (prev != null) m.setAttribute('content', prev); };
  }, []);
}

const L = {
  privacy: {
    h1: { en: 'Privacy notice', ar: 'إشعار الخصوصية' },
    sections: [
      { h: { en: 'Who is responsible for your data', ar: 'الجهة المسؤولة عن بياناتك' }, p: { en: '[PLACEHOLDER: registered legal name, commercial registration number and address of the data controller. To be provided by the owner.]', ar: '[نص مؤقت: الاسم القانوني المسجّل ورقم السجل التجاري وعنوان المسؤول عن البيانات. يزوّدنا به المالك.]' } },
      { h: { en: 'What we collect and why', ar: 'ما الذي نجمعه ولماذا' }, p: { en: '[PLACEHOLDER: purposes and legal basis for each form (booking, quote, contact, studio sign-up, newsletter, checkout, account), approved by the owner or their lawyer.]', ar: '[نص مؤقت: الأغراض والأساس القانوني لكل نموذج (الحجز وعرض السعر والتواصل والتسجيل في الاستوديو والنشرة والدفع والحساب)، يعتمدها المالك أو محاميه.]' } },
      { h: { en: 'Who we share it with (processors and transfers)', ar: 'مع من نشاركها (المعالِجون ونقل البيانات)' }, p: { en: '[PLACEHOLDER: list of service providers, including AI image/chat providers, the payment gateway and hosting, with their countries.]', ar: '[نص مؤقت: قائمة مزوّدي الخدمة، بما فيهم مزوّدو الذكاء الاصطناعي للصور والمحادثة وبوابة الدفع والاستضافة، مع دولهم.]' } },
      { h: { en: 'How long we keep it', ar: 'مدة الاحتفاظ' }, p: { en: '[PLACEHOLDER: retention periods.]', ar: '[نص مؤقت: مدد الاحتفاظ.]' } },
      { h: { en: 'Your rights and how to use them', ar: 'حقوقك وكيفية ممارستها' }, p: { en: '[PLACEHOLDER: access, correction, erasure, objection, withdrawal of consent, complaint to the authority, and the contact channel for requests.]', ar: '[نص مؤقت: حق الاطلاع والتصحيح والمحو والاعتراض وسحب الموافقة والشكوى إلى الجهة المختصة وقناة التواصل لتقديم الطلبات.]' } },
    ],
  },
  terms: {
    h1: { en: 'Terms of use', ar: 'شروط الاستخدام' },
    sections: [
      { h: { en: 'Using this website', ar: 'استخدام هذا الموقع' }, p: { en: '[PLACEHOLDER: terms of use text, approved by the owner or their lawyer.]', ar: '[نص مؤقت: نص شروط الاستخدام، يعتمده المالك أو محاميه.]' } },
      { h: { en: 'Orders, payment and delivery', ar: 'الطلبات والدفع والتوصيل' }, p: { en: '[PLACEHOLDER: ordering, price confirmation, payment, delivery, cancellation and warranty terms.]', ar: '[نص مؤقت: شروط الطلب وتأكيد السعر والدفع والتوصيل والإلغاء والضمان.]' } },
      { h: { en: 'Designs, estimates and AI previews', ar: 'التصاميم والتقديرات ومعاينات الذكاء الاصطناعي' }, p: { en: '[PLACEHOLDER: status of online estimates and AI-generated previews.]', ar: '[نص مؤقت: وضع التقديرات عبر الإنترنت ومعاينات الذكاء الاصطناعي.]' } },
    ],
  },
};
const NOTICE = { en: 'This page is a placeholder. The approved text has not been published yet.', ar: 'هذه الصفحة نص مؤقت. لم يُنشر النص المعتمد بعد.' };

function LegalPage({ doc, lang = 'en' }) {
  useNoIndex();
  const d = L[doc]; const l = lang === 'ar' ? 'ar' : 'en';
  return (
    <div dir={l === 'ar' ? 'rtl' : 'ltr'} style={{ maxWidth: 760, margin: '0 auto', padding: '120px 24px 80px' }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '0 0 16px' }}>{d.h1[l]}</h1>
      <p role="note" data-testid="legal-placeholder" style={{ border: '2px dashed currentColor', borderRadius: 12, padding: '12px 16px', margin: '0 0 28px', fontWeight: 600 }}>{NOTICE[l]}</p>
      {d.sections.map((s, i) => (
        <section key={i} style={{ margin: '0 0 24px' }}>
          <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>{s.h[l]}</h2>
          <p style={{ lineHeight: 1.7 }}>{s.p[l]}</p>
        </section>
      ))}
    </div>
  );
}
export const PrivacyPage = ({ lang }) => <LegalPage doc="privacy" lang={lang} />;
export const TermsPage = ({ lang }) => <LegalPage doc="terms" lang={lang} />;
