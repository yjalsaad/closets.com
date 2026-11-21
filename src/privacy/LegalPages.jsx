// LegalPages.jsx — /privacy and /terms on THIS site, written for the Kingdom of Bahrain:
// Personal Data Protection Law (Law No. 30 of 2018), Consumer Protection Law (Law No. 35 of 2012) and the
// Electronic Transactions Law (Decree-Law No. 54 of 2018). Facts come from the site itself (siteConfig, forms,
// edge functions). Anything that is the owner's to decide is worded as a principle, not a number.
import { BUSINESS } from '../seo/siteConfig';

const UPDATED = { en: 'Last updated: 21 November 2026', ar: 'آخر تحديث: 21 نوفمبر 2026' };
const B = { en: 'The Closets International W.L.L. (trading as The Closets Co.)', ar: 'شركة الخزائن العالمية ذ.م.م (تعمل باسم ذا كلوزتس)' };

const L = {
  privacy: {
    h1: { en: 'Privacy policy', ar: 'سياسة الخصوصية' },
    intro: { en: 'This policy explains what personal data we collect through the-closets.com, why, who receives it and what rights you have under the Personal Data Protection Law of the Kingdom of Bahrain (Law No. 30 of 2018).', ar: 'توضح هذه السياسة ما البيانات الشخصية التي نجمعها عبر موقع the-closets.com، ولماذا، ومن يتلقاها، وما حقوقك بموجب قانون حماية البيانات الشخصية في مملكة البحرين (القانون رقم 30 لسنة 2018).' },
    sections: [
      { h: { en: '1. Who is responsible for your data', ar: '1. الجهة المسؤولة عن بياناتك' }, p: [
        { en: `${B.en} is the data controller. Address: ${BUSINESS.address.streetAddress}, ${BUSINESS.address.addressLocality}, Kingdom of Bahrain. Phone: ${BUSINESS.telephone}. E-mail: ${BUSINESS.email}. Our commercial registration number appears on our invoices.`, ar: `${B.ar} هي المسؤولة عن معالجة بياناتك. العنوان: مبنى 2249، طريق 90، مجمع 1014، هملة، مملكة البحرين. الهاتف: ${BUSINESS.telephone}. البريد الإلكتروني: ${BUSINESS.email}. يظهر رقم سجلنا التجاري في فواتيرنا.` }] },
      { h: { en: '2. What we collect and why', ar: '2. ما الذي نجمعه ولماذا' }, p: [
        { en: 'We collect only what a form or feature needs, and use it for that purpose.', ar: 'نجمع فقط ما يحتاجه النموذج أو الخدمة، ونستخدمه لهذا الغرض وحده.' }],
        ul: [
        { en: 'Booking, quote, contact and studio forms: name, phone, e-mail, message and project details, to answer your request and arrange a visit or a quote. Basis: your request and our legitimate interest in replying.', ar: 'نماذج الحجز وطلب العرض والتواصل والاستوديو: الاسم والهاتف والبريد والرسالة وتفاصيل المشروع، للرد على طلبك وترتيب زيارة أو عرض سعر. الأساس: طلبك ومصلحتنا المشروعة في الرد.' },
        { en: 'Orders and checkout: name, delivery address, phone, e-mail and order details, to process, deliver and invoice your order and meet accounting and tax duties. Basis: performing the contract and legal obligations.', ar: 'الطلبات والدفع: الاسم وعنوان التوصيل والهاتف والبريد وتفاصيل الطلب، لمعالجة طلبك وتوصيله وفوترته والوفاء بالالتزامات المحاسبية والضريبية. الأساس: تنفيذ العقد والالتزامات القانونية.' },
        { en: 'Account: sign-in details and your saved designs and orders, so you can come back to them.', ar: 'الحساب: بيانات الدخول وتصاميمك وطلباتك المحفوظة لتعود إليها.' },
        { en: 'Newsletter: your e-mail, only to send our newsletter. Basis: your consent, which you can withdraw at any time.', ar: 'النشرة البريدية: بريدك الإلكتروني لإرسال نشرتنا فقط. الأساس: موافقتك، ويمكنك سحبها في أي وقت.' },
        { en: 'Verification codes: your phone number, to send a one-time code by SMS or WhatsApp where a campaign or sign-in needs it.', ar: 'رموز التحقق: رقم هاتفك لإرسال رمز لمرة واحدة عبر الرسائل أو واتساب حيث تتطلبه حملة أو تسجيل دخول.' },
        { en: 'AI features (room visualizer, design concepts, chat assistant): the photo or message you send. Basis: your consent, asked before each use. Please do not upload photos of people or documents.', ar: 'ميزات الذكاء الاصطناعي (معاينة الغرفة، مفاهيم التصميم، المساعد): الصورة أو الرسالة التي ترسلها. الأساس: موافقتك التي نطلبها قبل كل استخدام. نرجو عدم رفع صور لأشخاص أو مستندات.' },
        { en: 'Essential storage on your device (language, cart, sign-in). Optional usage measurement runs only if you allow it in the privacy banner.', ar: 'تخزين أساسي على جهازك (اللغة والسلة وتسجيل الدخول). ولا يعمل القياس الاختياري للاستخدام إلا إذا سمحت به في شريط الخصوصية.' },
      ] },
      { h: { en: '3. Who we share it with, and transfers abroad', ar: '3. مع من نشاركها ونقلها إلى الخارج' }, p: [
        { en: 'We do not sell personal data. We share it only with service providers who process it for us, under our instructions:', ar: 'لا نبيع البيانات الشخصية. نشاركها فقط مع مزوّدي خدمات يعالجونها لصالحنا وفق تعليماتنا:' }],
        ul: [
        { en: 'Supabase: hosting of our database, accounts and file storage.', ar: 'Supabase: استضافة قاعدة البيانات والحسابات وتخزين الملفات.' },
        { en: 'MyFatoorah: online card and payment processing. Card details go to the payment gateway, not to us.', ar: 'ماي فاتورة (MyFatoorah): معالجة الدفع الإلكتروني. تذهب بيانات البطاقة إلى بوابة الدفع وليس إلينا.' },
        { en: 'Anthropic and fal.ai: AI providers that process the photos and messages you choose to send to AI features.', ar: 'Anthropic وfal.ai: مزوّدا ذكاء اصطناعي يعالجان الصور والرسائل التي تختار إرسالها إلى ميزات الذكاء الاصطناعي.' },
        { en: 'Resend: sending our e-mails. Twilio and WhatsApp: sending verification codes.', ar: 'Resend: إرسال رسائلنا البريدية. Twilio وواتساب: إرسال رموز التحقق.' },
        { en: 'Delivery and installation partners, only the details needed to reach you and complete the job.', ar: 'شركاء التوصيل والتركيب، وبالقدر اللازم فقط للوصول إليك وإتمام العمل.' },
        { en: 'Public authorities, where the law requires it.', ar: 'الجهات العامة عندما يوجب القانون ذلك.' },
        ], p2: [
        { en: 'Some of these providers are located or store data outside Bahrain. We transfer personal data abroad only as the Personal Data Protection Law allows: to providers bound to protect it, on your consent (for AI features), or where needed to perform your contract.', ar: 'يقع بعض هؤلاء المزوّدين أو يخزّن البيانات خارج البحرين. ولا ننقل البيانات الشخصية إلى الخارج إلا بالقدر الذي يسمح به قانون حماية البيانات الشخصية: إلى مزوّدين ملتزمين بحمايتها، أو بموافقتك (لميزات الذكاء الاصطناعي)، أو عند الحاجة لتنفيذ عقدك.' }] },
      { h: { en: '4. How long we keep it', ar: '4. مدة الاحتفاظ' }, p: [
        { en: 'We keep personal data only as long as needed for the purpose it was collected for. Enquiries are kept while we deal with your request and for a reasonable period after. Order, invoice and payment records are kept for as long as accounting, tax and warranty obligations require. Newsletter data is kept until you unsubscribe. When the period ends we delete or anonymise the data.', ar: 'نحتفظ بالبيانات الشخصية فقط للمدة اللازمة للغرض الذي جُمعت من أجله. نحتفظ بالاستفسارات أثناء معالجة طلبك ولمدة معقولة بعدها. ونحتفظ بسجلات الطلبات والفواتير والدفع للمدة التي تفرضها الالتزامات المحاسبية والضريبية والضمان. ونحتفظ ببيانات النشرة حتى تلغي اشتراكك. وعند انتهاء المدة نحذف البيانات أو نجعلها مجهولة الهوية.' }] },
      { h: { en: '5. Security', ar: '5. الأمان' }, p: [
        { en: 'We use encrypted connections, access controls and reputable providers to protect your data. No system is completely secure; if a breach affects your rights we will notify you and the authority as the law requires.', ar: 'نستخدم اتصالات مشفّرة وضوابط وصول ومزوّدين موثوقين لحماية بياناتك. ولا يوجد نظام آمن تماماً؛ وإن مسّ اختراق حقوقك فسنبلغك والجهة المختصة وفق ما يوجبه القانون.' }] },
      { h: { en: '6. Your rights and how to use them', ar: '6. حقوقك وكيفية ممارستها' }, p: [
        { en: 'Under the Personal Data Protection Law you may:', ar: 'بموجب قانون حماية البيانات الشخصية يحق لك:' }],
        ul: [
        { en: 'ask whether we hold your data and get a copy;', ar: 'أن تسأل عمّا إذا كنا نحتفظ ببياناتك وتحصل على نسخة منها؛' },
        { en: 'ask us to correct, block or erase data that is inaccurate or no longer needed;', ar: 'أن تطلب تصحيح البيانات غير الدقيقة أو التي لم تعد لازمة أو حجبها أو محوها؛' },
        { en: 'object to processing, including direct marketing, and withdraw consent at any time (this does not affect what was done before);', ar: 'أن تعترض على المعالجة بما في ذلك التسويق المباشر، وأن تسحب موافقتك في أي وقت (دون أثر على ما سبق)؛' },
        { en: 'complain to the Personal Data Protection Authority of the Kingdom of Bahrain.', ar: 'أن تتقدم بشكوى إلى هيئة حماية البيانات الشخصية في مملكة البحرين.' },
        ], p2: [
        { en: `To use a right, write to ${BUSINESS.email} or call ${BUSINESS.telephone}. We may ask you to confirm your identity and will reply within a reasonable time. You can also change your cookie and measurement choice at any time from "Privacy options" in the footer.`, ar: `لممارسة أي حق، راسلنا على ${BUSINESS.email} أو اتصل بنا على ${BUSINESS.telephone}. قد نطلب منك إثبات هويتك وسنرد خلال مدة معقولة. ويمكنك أيضاً تغيير اختيارك للقياس من «خيارات الخصوصية» في أسفل الموقع.` }] },
      { h: { en: '7. Children', ar: '7. الأطفال' }, p: [
        { en: 'Our services are for adults. We do not knowingly collect data from children; if you believe we have, contact us and we will delete it.', ar: 'خدماتنا موجهة للبالغين. ولا نجمع عمداً بيانات من الأطفال؛ وإن اعتقدت أننا فعلنا فتواصل معنا لنحذفها.' }] },
      { h: { en: '8. Changes to this policy', ar: '8. تغييرات هذه السياسة' }, p: [
        { en: 'We will update this page when our practices change and show the date above.', ar: 'سنحدّث هذه الصفحة عند تغيّر ممارساتنا ونُظهر التاريخ أعلاه.' }] },
    ],
  },
  terms: {
    h1: { en: 'Terms and conditions', ar: 'الشروط والأحكام' },
    intro: { en: 'By using this website or ordering from us you agree to these terms. They are governed by the laws of the Kingdom of Bahrain and do not reduce any right you have under the Consumer Protection Law (Law No. 35 of 2012).', ar: 'باستخدامك هذا الموقع أو بالطلب منا فإنك توافق على هذه الشروط. وتخضع لقوانين مملكة البحرين ولا تنتقص من أي حق لك بموجب قانون حماية المستهلك (القانون رقم 35 لسنة 2012).' },
    sections: [
      { h: { en: '1. Who we are', ar: '1. من نحن' }, p: [
        { en: `The site is operated by ${B.en}, ${BUSINESS.address.addressLocality}, Kingdom of Bahrain. E-mail ${BUSINESS.email}, phone ${BUSINESS.telephone}.`, ar: `يُشغّل الموقع ${B.ar}، هملة، مملكة البحرين. البريد ${BUSINESS.email}، الهاتف ${BUSINESS.telephone}.` }] },
      { h: { en: '2. Using this website', ar: '2. استخدام الموقع' }, p: [
        { en: 'Use the site lawfully and for your own genuine requests. Do not misuse it, try to break its security, or copy its content, photos, designs or software without our written permission; they belong to us or our licensors. We may change or stop any feature at any time.', ar: 'استخدم الموقع بصورة مشروعة ولطلباتك الحقيقية. لا تسئ استخدامه ولا تحاول اختراق أمنه ولا تنسخ محتواه أو صوره أو تصاميمه أو برمجياته دون إذن كتابي منا؛ فهي ملك لنا أو لمرخّصينا. ويجوز لنا تعديل أي ميزة أو إيقافها في أي وقت.' }] },
      { h: { en: '3. Prices, orders and payment', ar: '3. الأسعار والطلبات والدفع' }, p: [
        { en: 'Prices are in Bahraini dinars (BHD), with VAT added where it applies at the rate in force in Bahrain. An order is accepted when we confirm it. Made-to-measure work starts after the final design, measurements and the agreed payment are confirmed in writing. Online payments are processed by MyFatoorah. We may correct an obvious pricing error and will tell you before you are charged.', ar: 'الأسعار بالدينار البحريني، وتُضاف ضريبة القيمة المضافة حيث تنطبق بالنسبة السارية في البحرين. يُقبل الطلب عند تأكيدنا له. ويبدأ العمل المصنّع حسب المقاس بعد تأكيد التصميم النهائي والقياسات والدفعة المتفق عليها كتابةً. تُعالج المدفوعات الإلكترونية عبر ماي فاتورة. ويجوز لنا تصحيح أي خطأ واضح في السعر مع إبلاغك قبل أي خصم.' }] },
      { h: { en: '4. Delivery, installation and changes', ar: '4. التوصيل والتركيب والتعديل' }, p: [
        { en: 'Delivery and installation dates are agreed with you and are estimates until confirmed. Please make sure the site is ready and measurements are accurate. Because made-to-measure items are produced specially for you, changes or cancellation after production starts depend on the work already done and are agreed in writing; this does not limit your statutory rights.', ar: 'تُحدَّد مواعيد التوصيل والتركيب بالاتفاق معك وتبقى تقديرية حتى تأكيدها. نرجو التأكد من جاهزية الموقع ودقة القياسات. ولأن المنتجات المصنّعة حسب الطلب تُنتج خصيصاً لك، فإن التعديل أو الإلغاء بعد بدء الإنتاج يعتمد على ما أُنجز من عمل ويُتفق عليه كتابةً، ولا يحدّ ذلك من حقوقك النظامية.' }] },
      { h: { en: '5. Warranty', ar: '5. الضمان' }, p: [
        { en: 'We give a 10-year warranty on cabinetry and soft-close hardware against manufacturing defects under normal household use. It does not cover misuse, water damage, unauthorised changes or normal wear. To claim, contact us with your invoice and photos.', ar: 'نقدّم ضمان 10 سنوات على الخزائن ومفصلات الإغلاق الهادئ ضد عيوب التصنيع مع الاستخدام المنزلي المعتاد. ولا يشمل الضمان سوء الاستخدام أو أضرار المياه أو التعديلات غير المصرّح بها أو البلى العادي. وللمطالبة تواصل معنا مع فاتورتك وصور.' }] },
      { h: { en: '6. Estimates, designs and AI previews', ar: '6. التقديرات والتصاميم ومعاينات الذكاء الاصطناعي' }, p: [
        { en: 'Online estimates and planner results are guides, not a final quote. AI-generated previews and concepts are illustrations: colours, proportions and details may differ from the finished product. Only a written quote or order confirmation from us is binding. By using an AI feature you confirm you have the right to upload the photo and agree to it being processed as described in the Privacy policy.', ar: 'التقديرات ونتائج المخطِّط إرشادية وليست عرض سعر نهائياً. أما معاينات ومفاهيم الذكاء الاصطناعي فهي رسوم توضيحية قد تختلف ألوانها ونسبها وتفاصيلها عن المنتج النهائي. ولا يُلزمنا إلا عرض سعر مكتوب أو تأكيد طلب منا. وباستخدام ميزة الذكاء الاصطناعي تؤكد أن لك الحق في رفع الصورة وتوافق على معالجتها كما في سياسة الخصوصية.' }] },
      { h: { en: '7. Our liability', ar: '7. مسؤوليتنا' }, p: [
        { en: 'We are responsible for loss that is a foreseeable result of our breach or negligence. We do not exclude liability that cannot be excluded under Bahraini law. We are not liable for delays or failures caused by events outside our reasonable control.', ar: 'نتحمل المسؤولية عن الخسارة التي تكون نتيجة متوقعة لإخلالنا أو إهمالنا. ولا نستبعد مسؤولية لا يجوز استبعادها بموجب القانون البحريني. ولا نسأل عن التأخير أو الإخفاق الناتج عن أحداث خارجة عن سيطرتنا المعقولة.' }] },
      { h: { en: '8. Complaints, governing law and courts', ar: '8. الشكاوى والقانون الواجب التطبيق والمحاكم' }, p: [
        { en: `Tell us first at ${BUSINESS.email} and we will try to resolve it quickly. These terms are governed by the laws of the Kingdom of Bahrain and the courts of Bahrain have jurisdiction, without affecting your right as a consumer to approach the Ministry of Industry and Commerce.`, ar: `أخبرنا أولاً عبر ${BUSINESS.email} وسنسعى لحل الأمر سريعاً. تخضع هذه الشروط لقوانين مملكة البحرين وتختص بها محاكم البحرين، دون المساس بحقك كمستهلك في اللجوء إلى وزارة الصناعة والتجارة.` }] },
      { h: { en: '9. Changes', ar: '9. التعديلات' }, p: [
        { en: 'We may update these terms; the version on this page on the day you order applies to that order.', ar: 'يجوز لنا تحديث هذه الشروط؛ وتسري على طلبك النسخة المنشورة في هذه الصفحة يوم الطلب.' }] },
    ],
  },
};

function LegalPage({ doc, lang = 'en' }) {
  const d = L[doc]; const l = lang === 'ar' ? 'ar' : 'en';
  return (
    <main dir={l === 'ar' ? 'rtl' : 'ltr'} data-testid="legal-page" style={{ maxWidth: 760, margin: '0 auto', padding: '120px 24px 80px' }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '0 0 8px' }}>{d.h1[l]}</h1>
      <p style={{ margin: '0 0 20px', opacity: 0.7 }}>{UPDATED[l]}</p>
      <p style={{ lineHeight: 1.7, margin: '0 0 28px' }}>{d.intro[l]}</p>
      {d.sections.map((s, i) => (
        <section key={i} style={{ margin: '0 0 24px' }}>
          <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>{s.h[l]}</h2>
          {s.p.map((t, j) => <p key={j} style={{ lineHeight: 1.7, margin: '0 0 8px' }}>{t[l]}</p>)}
          {s.ul && <ul style={{ lineHeight: 1.7, paddingInlineStart: 22, margin: '0 0 8px' }}>{s.ul.map((t, j) => <li key={j}>{t[l]}</li>)}</ul>}
          {s.p2 && s.p2.map((t, j) => <p key={j} style={{ lineHeight: 1.7, margin: '0 0 8px' }}>{t[l]}</p>)}
        </section>
      ))}
    </main>
  );
}
export const PrivacyPage = ({ lang }) => <LegalPage doc="privacy" lang={lang} />;
export const TermsPage = ({ lang }) => <LegalPage doc="terms" lang={lang} />;
