// strings.js — copy for the privacy UI. Plain-language UI text, NOT legal text; the owner reviews it
// (docs/PRIVACY-DECISIONS.md). Where a fact is unknown the text says nothing about it rather than guess.
export const PV = {
  bannerTitle: { en: 'Your privacy choices', ar: 'خياراتك بخصوص الخصوصية' },
  bannerBody: { en: 'We use essential storage to make the site work (language, cart, sign-in). With your permission we also measure how the visualizer and site are used so we can improve them. Nothing optional runs until you choose.', ar: 'نستخدم تخزيناً أساسياً لتشغيل الموقع (اللغة والسلة وتسجيل الدخول). وبإذنك نقيس أيضاً كيفية استخدام المُصوِّر والموقع لتحسينهما. لا يعمل أي شيء اختياري قبل أن تختار.' },
  accept: { en: 'Allow measurement', ar: 'السماح بالقياس' },
  decline: { en: 'Essential only', ar: 'الأساسي فقط' },
  privacyLink: { en: 'Privacy notice', ar: 'إشعار الخصوصية' },
  termsLink: { en: 'Terms', ar: 'الشروط' },
  settings: { en: 'Privacy settings', ar: 'إعدادات الخصوصية' },
  aiTitle: { en: 'Send this to our AI service?', ar: 'إرسال هذا إلى خدمة الذكاء الاصطناعي؟' },
  aiBody: { en: 'To create the result, your photo or message is sent to a third-party AI service provider that processes it for us. Please do not upload photos of people or documents. You can withdraw this permission at any time from Privacy settings.', ar: 'لإنشاء النتيجة، تُرسل صورتك أو رسالتك إلى مزوّد خدمة ذكاء اصطناعي خارجي يعالجها نيابةً عنا. يُرجى عدم رفع صور أشخاص أو مستندات. يمكنك سحب هذا الإذن في أي وقت من إعدادات الخصوصية.' },
  aiAllow: { en: 'Allow and continue', ar: 'السماح والمتابعة' },
  aiDeny: { en: 'Not now', ar: 'ليس الآن' },
  aiDeclined: { en: 'AI features need your permission to send data to our AI service.', ar: 'تحتاج ميزات الذكاء الاصطناعي إلى إذنك لإرسال البيانات إلى خدمة الذكاء الاصطناعي.' },
  aiInline: { en: 'Photos and chat messages you send to AI features are processed by a third-party AI service provider.', ar: 'تُعالَج الصور والرسائل التي ترسلها إلى ميزات الذكاء الاصطناعي لدى مزوّد خدمة ذكاء اصطناعي خارجي.' },
  formNote: { en: 'We use these details only to answer your request. See our', ar: 'نستخدم هذه البيانات فقط للرد على طلبك. اطّلع على' },
  formNoteLink: { en: 'Privacy notice', ar: 'إشعار الخصوصية' },
  formNoteOrder: { en: 'We use these details to process and deliver your order and to contact you about it. See our', ar: 'نستخدم هذه البيانات لمعالجة طلبك وتوصيله والتواصل معك بشأنه. اطّلع على' },
  formNoteNews: { en: 'We will use your e-mail only to send our newsletter; you can unsubscribe at any time. See our', ar: 'سنستخدم بريدك الإلكتروني لإرسال نشرتنا فقط، ويمكنك إلغاء الاشتراك في أي وقت. اطّلع على' },
};
export const tr = (k, lang) => { const e = PV[k]; return e ? (e[lang] || e.en) : k; };
export const curLang = () => { try { return (localStorage.getItem('closets_lang') || document.documentElement.lang) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } };
