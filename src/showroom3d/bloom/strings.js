/* Bloom Meeting UI strings (EN + AR). Arabic awaits native review, like the rest of the room. */
const T = (en, ar) => ({ en, ar });
export const BLOOM = {
  name: T('Bloom Meeting', 'اجتماع بلوم'),
  floorLabel: T('Floor', 'الطابق'), floors: T('Floors', 'الطوابق'),
  goFloor: { ground: T('Go to the ground floor', 'الانتقال إلى الطابق الأرضي'), l2: T('Go to Floor 2: Bloom Meeting', 'الانتقال إلى الطابق الثاني: اجتماع بلوم') },
  riding: T('Taking the lift…', 'جارٍ الصعود بالمصعد…'),
  liftHall: T('Glass lift to Floor 2', 'المصعد الزجاجي إلى الطابق الثاني'),
  zones: { board: T('Boardroom', 'قاعة مجلس الإدارة'), ops: T('Staff operations', 'عمليات الموظفين'), leads: T('Leads wall', 'جدار العملاء المحتملين'), lounge: T('Lounge', 'ركن الاستراحة'), haneen: T('Haneen AI', 'حنين AI') },
  opsTitle: T('Staff operations', 'عمليات الموظفين'), leadsTitle: T('Leads pipeline', 'مسار العملاء المحتملين'), pipeline: T('Lead pipeline', 'مسار العملاء'), tasksToday: T("Today's tasks", 'مهام اليوم'), targets: T('Targets', 'الأهداف'),
  boardTitle: T('Boardroom', 'قاعة مجلس الإدارة'), boardSub: T('VPs and heads of department', 'نواب الرئيس ورؤساء الأقسام'),
  pressPlay: T('Press Play to watch', 'اضغط تشغيل للمشاهدة'),
  haneenName: T('Haneen AI', 'حنين AI'), haneenFloating: T('Ask Haneen AI', 'اسأل حنين AI'), haneenRole: T('Investor assistant', 'مساعدة المستثمرين'),
};
export const L = (v, lang) => (v && typeof v === 'object' ? v[lang === 'ar' ? 'ar' : 'en'] : v);
