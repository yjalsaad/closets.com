/* The built-in investor / partner presentation: the five stations of the VIP room, as a deck. TRUSTED content (committed, reviewed); imported decks cannot use
 * `builtin` / `data`. The `builtin` key names the rich renderer (scenes/vip/panels.js on the wall, ui/VipPanel.jsx in the panel) that draws the slide's diagrams
 * from the structured data in products/vipContent.js (business lines, Hub flow, ...). Titles, leads, story lines and the investor steps live HERE.
 * Honesty rules: no figures / returns / valuation; the two closing stations carry the disclaimer themselves (`disclaimer: true`); `{{fact:key}}` resolves from content/facts.js. */
export const DEFAULT_DECK = {
  id: 'default', unit: 'station', builtin: true,
  title: { en: 'Company and investor presentation', ar: 'عرض الشركة والمستثمرين' },
  slides: [
    { id: 'story', builtin: 'story', title: { en: 'Company story and brand', ar: 'قصة الشركة وهويتها' },
      lead: { en: 'Designed, made and fitted in Bahrain.', ar: 'تصميم وتصنيع وتركيب في البحرين.' },
      bullets: [
        { en: 'The Closets Co. designs, makes and fits kitchens, wardrobes, walk-in closets, bedrooms, doors and living-room units for homes in Bahrain.', ar: 'ذا كلوزتس تصمّم وتصنّع وتركّب المطابخ وخزائن الملابس وغرف الملابس وغرف النوم والأبواب ووحدات المعيشة للمنازل في البحرين.' },
        { en: '{{fact:warrantyYears}} years on cabinetry and soft-close hardware.', ar: '{{fact:warrantyYears}} سنوات على الخزائن وملحقات الإغلاق الهادئ.' },
        { en: 'Every piece is made to measure: we survey, design, make and fit.', ar: 'كل قطعة تُصنع على المقاس: نقيس ونصمّم ونصنّع ونركّب.' },
        { en: 'Customers can plan a room online in the Design Studio, then book a designer.', ar: 'يمكن للعملاء تخطيط غرفتهم عبر الإنترنت في استوديو التصميم ثم حجز مصمّم.' },
      ] },
    { id: 'projects', builtin: 'projects', title: { en: 'Our projects and business lines', ar: 'مشاريعنا وخطوط أعمالنا' },
      lead: { en: 'The departments you can walk through in this showroom, and the projects listed on our website.', ar: 'الأقسام التي يمكنك التجول فيها في هذا المعرض، والمشاريع المعروضة على موقعنا.' } },
    { id: 'hub', builtin: 'hub', title: { en: 'The power of the Bonsai Hub', ar: 'قوة منصة بونساي هب' },
      lead: { en: 'The management platform behind the business: one place for leads, quotes, orders, production, finance and people.', ar: 'منصة الإدارة خلف الأعمال: مكان واحد للعملاء المحتملين وعروض الأسعار والطلبات والإنتاج والمالية والموظفين.' } },
    { id: 'invest', builtin: 'invest', disclaimer: true, title: { en: 'How to join and invest', ar: 'كيف تنضم وتستثمر' },
      lead: { en: 'A clear, step-by-step process. It contains no figures and no promises.', ar: 'مسار واضح خطوة بخطوة. لا يتضمن أرقامًا ولا وعودًا.' },
      data: { steps: [
        { id: 'brief', title: { en: 'Request a private briefing', ar: 'اطلب إحاطة خاصة' }, body: { en: 'Tell us you would like to talk. A member of management replies directly.', ar: 'أخبرنا برغبتك في الحديث. يرد عليك أحد أفراد الإدارة مباشرة.' } },
        { id: 'pack', title: { en: 'Receive the information pack', ar: 'استلم الحزمة التعريفية' }, body: { en: 'Management provides the company information it chooses to give.', ar: 'تقدّم الإدارة معلومات الشركة التي تختار تقديمها.' } },
        { id: 'meet', title: { en: 'Meet the team and visit', ar: 'قابل الفريق وزر المعرض' }, body: { en: 'Meet the people, see the showroom and how the work is done.', ar: 'تعرّف على الفريق وزر المعرض وطريقة العمل.' } },
        { id: 'diligence', title: { en: 'Due diligence', ar: 'العناية الواجبة' }, body: { en: 'You review what matters to you, with your own advisers.', ar: 'تراجع ما يهمك مع مستشاريك.' } },
        { id: 'terms', title: { en: 'Terms', ar: 'الشروط' }, body: { en: 'Any terms are discussed and agreed directly with management.', ar: 'تُناقَش أي شروط وتُتفق مباشرة مع الإدارة.' } },
      ] } },
    { id: 'briefing', builtin: 'briefing', disclaimer: true, title: { en: 'Request a private investor briefing', ar: 'اطلب إحاطة خاصة للمستثمرين' },
      lead: { en: 'Start with a conversation. Our management answers directly.', ar: 'ابدأ بحوار. تجيب إدارتنا مباشرة.' } },
  ],
};
