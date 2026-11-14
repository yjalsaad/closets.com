/* The built-in company presentation: the four stations of the VIP room, as a deck. (The "How to join and invest" station and the investor-briefing station were REMOVED at the owner's request; the last station is now a generic contact one.) TRUSTED content (committed, reviewed); imported decks cannot use
 * `builtin` / `data`. The `builtin` key names the rich renderer (scenes/vip/panels.js on the wall, ui/VipPanel.jsx in the panel) that draws the slide's diagrams
 * from the structured data in products/vipContent.js (business lines, Hub flow, ...). Titles, leads and story lines live HERE.
 * Honesty rules: no figures / returns / valuation; the two closing stations carry the disclaimer themselves (`disclaimer: true`); `{{fact:key}}` resolves from content/facts.js. */
export const DEFAULT_DECK = {
  id: 'default', unit: 'station', builtin: true,
  title: { en: 'Company presentation', ar: 'عرض الشركة' },
  slides: [
    { id: 'story', builtin: 'story', title: { en: 'Company story and brand', ar: 'قصة الشركة وهويتها' },
      lead: { en: 'Designed, made and fitted in Bahrain.', ar: 'تصميم وتصنيع وتركيب في البحرين.' },
      bullets: [
        { en: 'The Closets Co. designs, makes and fits kitchens, wardrobes, walk-in closets, bedrooms, doors and living-room units for homes in Bahrain.', ar: 'شركة الخزائن تصمّم وتصنّع وتركّب المطابخ وخزائن الملابس وغرف الملابس وغرف النوم والأبواب ووحدات المعيشة للمنازل في البحرين.' },
        { en: '{{fact:warrantyYears}} years on cabinetry and soft-close hardware.', ar: '{{fact:warrantyYears}} سنوات على الخزائن وملحقات الإغلاق الهادئ.' },
        { en: 'Every piece is made to measure: we survey, design, make and fit.', ar: 'كل قطعة تُصنع على المقاس: نقيس ونصمّم ونصنّع ونركّب.' },
        { en: 'Customers can plan a room online in the Design Studio, then book a designer.', ar: 'يمكن للعملاء تخطيط غرفتهم عبر الإنترنت في استوديو التصميم ثم حجز مصمّم.' },
      ] },
    { id: 'projects', builtin: 'projects', title: { en: 'Our projects and business lines', ar: 'مشاريعنا وخطوط أعمالنا' },
      lead: { en: 'The departments you can walk through in this showroom, and the projects listed on our website.', ar: 'الأقسام التي يمكنك التجول فيها في هذا المعرض، والمشاريع المعروضة على موقعنا.' } },
    { id: 'hub', builtin: 'hub', title: { en: 'The power of the Bonsai Hub', ar: 'قوة منصة بونساي هب' },
      lead: { en: 'The management platform behind the business: one place for leads, quotes, orders, production, finance and people.', ar: 'منصة الإدارة خلف الأعمال: مكان واحد للعملاء المحتملين وعروض الأسعار والطلبات والإنتاج والمالية والموظفين.' } },
    { id: 'contact', builtin: 'contact', disclaimer: true, title: { en: 'Talk to our team', ar: 'تحدث مع فريقنا' },
      lead: { en: 'Start with a conversation. Our management answers directly.', ar: 'ابدأ بحوار. تجيب إدارتنا مباشرة.' } },
  ],
};
