/* Design Studio UI strings (EN / AR). Kept here, not in ../strings.js, so the feature stays self-contained. No digits, currency or promises in anything an adviser says
 * (the guide's guardrail test scans these too). The Arabic is a draft for the owner to confirm (docs/showroom3d/KITCHEN-STUDIO.md, owner decisions). */
export const DS = {
  title: { en: 'Kitchen Design Studio', ar: 'استوديو تصميم المطابخ' },
  byline: { en: 'by YAS WOOD', ar: 'من ياس وود' },
  tagline: { en: 'Design your kitchen on a big screen', ar: 'صمّم مطبخك على شاشة كبيرة' },
  screenHint: { en: 'Same options and prices as our website', ar: 'الخيارات والأسعار نفسها كما في موقعنا' },
  start: { en: 'Start designing', ar: 'ابدأ التصميم' },
  podiumKey: { en: 'Press E', ar: 'اضغط E' },
  podiumTouch: { en: 'Tap Interact', ar: 'اضغط تفاعل' },
  // overlay frame
  frameAria: { en: 'Kitchen designer', ar: 'مصمم المطابخ' },
  back: { en: 'Back to the showroom', ar: 'العودة إلى المعرض' },
  backShort: { en: 'Showroom', ar: 'المعرض' },
  onSite: { en: 'Open on the website', ar: 'افتح في الموقع' },
  onSiteNote: { en: 'Opens in a new tab.', ar: 'يفتح في تبويب جديد.' },
  langBtn: { en: 'العربية', ar: 'English' },
  langLabel: { en: 'Switch to Arabic', ar: 'التبديل إلى الإنجليزية' },
  frameTitle: { en: 'Designer (same as our website)', ar: 'المصمم (نفسه في موقعنا)' },
  loading: { en: 'Opening the Kitchen Design Studio', ar: 'جارٍ فتح استوديو تصميم المطابخ' },
  loadingNote: { en: 'The same designer, options and prices as our website, on a bigger canvas.', ar: 'المصمم والخيارات والأسعار نفسها كما في موقعنا، على مساحة أكبر.' },
  signInNote: { en: 'Like on our website, you may be asked to sign in or create a free account.', ar: 'كما في موقعنا، قد يُطلب منك تسجيل الدخول أو إنشاء حساب مجاني.' },
  failTitle: { en: 'The designer could not load', ar: 'تعذّر تحميل المصمم' },
  failBody: { en: 'Please check your connection and try again, or open the designer on our website.', ar: 'يُرجى التحقق من اتصالك والمحاولة مرة أخرى، أو افتح المصمم في موقعنا.' },
  retry: { en: 'Try again', ar: 'حاول مرة أخرى' },
  confirmTitle: { en: 'Leave the designer?', ar: 'مغادرة المصمم؟' },
  confirmBody: { en: 'The design you are working on will be closed. If you want to keep it, send it with the designer’s own quote button first.', ar: 'سيُغلق التصميم الذي تعمل عليه. إن أردت الاحتفاظ به فأرسله أولًا بزر طلب العرض في المصمم.' },
  confirmStay: { en: 'Keep designing', ar: 'تابع التصميم' },
  confirmLeave: { en: 'Back to the showroom', ar: 'العودة إلى المعرض' },
  closedNote: { en: 'Welcome back to the showroom.', ar: 'أهلًا بعودتك إلى المعرض.' },
  // advisers
  guideGo: { en: 'Walk me to the design studio', ar: 'خذني إلى استوديو التصميم' },
  guideOpen: { en: 'Open the designer', ar: 'افتح المصمم' },
  guideGoReply: { en: 'Of course. The Kitchen Design Studio is on the left of the entrance: a big screen where you can design your own kitchen with the same options as our website. I will take you there.', ar: 'بكل سرور. استوديو تصميم المطابخ على يسار المدخل: شاشة كبيرة تصمّم عليها مطبخك بالخيارات نفسها كما في موقعنا. سآخذك إلى هناك.' },
  guideOpenReply: { en: 'Opening the kitchen designer for you now. It is the same designer as on our website, on a big screen. Press the back button at the top to return to the showroom.', ar: 'أفتح لك مصمم المطابخ الآن. هو المصمم نفسه في موقعنا، على شاشة كبيرة. اضغط زر العودة في الأعلى للرجوع إلى المعرض.' },
  guideBlurb: { en: 'Design your own kitchen on a big screen', ar: 'صمّم مطبخك بنفسك على شاشة كبيرة' },
};
export const dt = (key, lang) => { const s = DS[key]; return s ? (lang === 'ar' ? s.ar : s.en) : key; };
Object.assign(DS, {
  preview: { en: 'Preview of the designer', ar: 'معاينة للمصمم' },
});

// ---- shared wall: more than one section on the station (sign, attract screen, tablet, chooser) ----
Object.assign(DS, {
  stationTagline: { en: 'Design a kitchen or a TV unit on a big screen', ar: 'صمّم مطبخًا أو وحدة تلفزيون على شاشة كبيرة' },
  chooseTitle: { en: 'Which studio?', ar: 'أي استوديو؟' },
  chooseHint: { en: 'Both open the same designers as our website, on a big canvas.', ar: 'كلاهما يفتح المصممين أنفسهم كما في موقعنا، على مساحة كبيرة.' },
  chooseClose: { en: 'Close', ar: 'إغلاق' },
  chooseOpen: { en: 'Open', ar: 'افتح' },
  chooseAria: { en: 'Choose a design studio', ar: 'اختر استوديو التصميم' },
  tabletPick: { en: 'Pick a studio', ar: 'اختر استوديو' },
  guideChoose: { en: 'Which designer would you like to open?', ar: 'أي مصمم تودّ فتحه؟' },
});

/** a string for one section: the section's own wording (registry `text`) when it has one, else the shared / kitchen default above */
export const sdt = (section, key, lang) => { const o = section && section.text && section.text[key]; return o ? (lang === 'ar' ? o.ar : o.en) : dt(key, lang); };
