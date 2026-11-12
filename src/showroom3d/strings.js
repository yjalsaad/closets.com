/* Showroom UI copy, English + authored Arabic. One language on screen at a time (the site language).
 * Arabic is written, not machine-converted; it has NOT had a native copy review yet (see docs/showroom3d/ARCHITECTURE.md). */
export const STRINGS = {
  brand: { en: 'The Closets', ar: 'الخزائن' },
  pageTitle: { en: 'Virtual Showroom | The Closets', ar: 'المعرض الافتراضي | الخزائن' },
  loadingTitle: { en: 'Preparing the showroom', ar: 'نجهّز المعرض' },
  loadingSub: { en: 'Building the architecture, materials and light in your browser.', ar: 'نبني العمارة والخامات والإضاءة داخل متصفحك.' },
  loadStageLabel: { en: 'Loading', ar: 'جارٍ التحميل' },
  skipIntro: { en: 'Skip intro', ar: 'تخطي المقدمة' },
  replayIntro: { en: 'Replay intro', ar: 'أعد المقدمة' },
  playIntro: { en: 'Play the cinematic intro', ar: 'شغّل المقدمة السينمائية' },
  enter: { en: 'Enter the showroom', ar: 'ادخل المعرض' },
  exit: { en: 'Back to website', ar: 'العودة إلى الموقع' },
  langToggle: { en: 'العربية', ar: 'English' },
  langToggleLabel: { en: 'Switch to Arabic', ar: 'التبديل إلى الإنجليزية' },
  capBrand: { en: 'Virtual Showroom', ar: 'المعرض الافتراضي' },
  capCraft: { en: 'Designed, made and fitted in Bahrain.', ar: 'تصميم وتصنيع وتركيب في البحرين.' },
  capWelcome: { en: 'Welcome.', ar: 'أهلاً بك.' },
  capLook: { en: 'Look around the hall.', ar: 'تجوّل بنظرك في القاعة.' },
  hintLook: { en: 'Drag to look around. Scroll or pinch to move closer.', ar: 'اسحب للنظر حولك. مرّر أو قرّب بإصبعين للاقتراب.' },
  previewBadge: { en: 'Preview build', ar: 'نسخة تجريبية' },
  previewNote: { en: 'The eight department bays are empty for now. They are furnished in a later release.', ar: 'أجنحة الأقسام الثمانية فارغة حالياً، وسيتم تجهيزها في إصدار لاحق.' },
  bayPending: { en: 'To be furnished', ar: 'قيد التجهيز' },
  qualityLabel: { en: 'Graphics', ar: 'الرسومات' },
  qualityHigh: { en: 'High', ar: 'عالية' },
  qualityMedium: { en: 'Balanced', ar: 'متوازنة' },
  qualityLow: { en: 'Light', ar: 'خفيفة' },
  // 2D fallback (no WebGL / failed to start)
  fbTitle: { en: 'Our virtual showroom needs 3D graphics', ar: 'معرضنا الافتراضي يحتاج إلى الرسومات ثلاثية الأبعاد' },
  fbBody: { en: 'This device or browser has 3D (WebGL) switched off, so we cannot open the walkthrough. Here is what the showroom will hold, and ways to see our work right now.', ar: 'الرسومات ثلاثية الأبعاد (WebGL) معطّلة على هذا الجهاز أو المتصفح، لذا لا يمكننا فتح الجولة. هذا ما سيضمّه المعرض، وطرق لمشاهدة أعمالنا الآن.' },
  fbDepartments: { en: 'Departments', ar: 'الأقسام' },
  fbGallery: { en: 'Browse our work', ar: 'تصفّح أعمالنا' },
  fbVisualizer: { en: 'Room visualizer', ar: 'معاين الغرف' },
  fbBook: { en: 'Book a free design visit', ar: 'احجز زيارة تصميم مجانية' },
  errorTitle: { en: 'The showroom could not start', ar: 'تعذّر تشغيل المعرض' },
  errorRetry: { en: 'Try again', ar: 'حاول مرة أخرى' },
};

export const t = (key, lang) => { const e = STRINGS[key]; return e ? (lang === 'ar' ? e.ar : e.en) : key; };
