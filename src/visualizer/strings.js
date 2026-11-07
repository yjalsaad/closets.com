/* Room Visualizer — bilingual copy [ROOM-VIZ 2026-11-07]. One language on screen at a time (the site language). */
const S = {
  brand: ['Room Visualizer', 'مُصوِّر الغرف'],
  heroEyebrow: ['Room Visualizer', 'مُصوِّر الغرف'],
  heroTitle: ['See it in your room before you buy.', 'شاهده في غرفتك قبل أن تشتري.'],
  heroLede: ['Floors, walls, tiles, worktops, cabinets and wardrobes — swap finishes in real 3D rooms, look around in 360°, or try them on a photo of your own room.',
    'الأرضيات والجدران والبلاط وأسطح العمل والخزائن — بدّل التشطيبات في غرف ثلاثية الأبعاد حقيقية، تجوّل بزاوية 360°، أو جرّبها على صورة غرفتك.'],
  pickRoom: ['Choose a room', 'اختر غرفة'],
  modeRoom: ['Room view', 'عرض الغرفة'], mode360: ['360°', '360°'], modePhoto: ['Your photo', 'صورتك'],
  tryPhoto: ['Use a photo of your room', 'استخدم صورة غرفتك'], tryPhotoSub: ['Upload or take a photo, mark the floor or wall, and see our products on it.', 'ارفع صورة أو التقطها، حدّد الأرضية أو الجدار، وشاهد منتجاتنا عليها.'],
  catalog: ['Product catalogue (PDF)', 'كتالوج المنتجات (PDF)'], catalogSub: ['Build and download a catalogue of the finishes you like.', 'أنشئ كتالوجًا للتشطيبات التي تعجبك ونزّله.'],
  open360: ['Walk around in 360°', 'تجوّل بزاوية 360°'],
  surfaces: ['Surfaces', 'الأسطح'], products: ['Products', 'المنتجات'], search: ['Search finishes…', 'ابحث في التشطيبات…'], all: ['All', 'الكل'],
  tapSurface: ['Tap any surface in the room to change it', 'المس أي سطح في الغرفة لتغييره'],
  layout: ['Layout', 'طريقة التركيب'], grout: ['Grout', 'الترويب'], groutWidth: ['Joint width', 'عرض الفاصل'], groutColour: ['Joint colour', 'لون الفاصل'],
  rotation: ['Rotation', 'الدوران'], mixWith: ['Mix with', 'امزج مع'], none: ['None', 'لا شيء'],
  size: ['Size', 'المقاس'], finish: ['Finish', 'التشطيب'], code: ['Code', 'الرمز'], area: ['Area', 'المساحة'], qty: ['To order', 'الكمية المطلوبة'], est: ['Estimate', 'التقدير'],
  inclWaste: ['incl. {n}% cutting allowance', 'تشمل {n}٪ هدر القص'], perM2: ['/ m²', '/ م²'],
  view: ['View', 'زاوية'], compare: ['Compare', 'قارن'], compareOn: ['Drag to compare with your pinned design', 'اسحب للمقارنة مع التصميم المثبّت'], pin: ['Pin this look', 'ثبّت هذا التصميم'], unpin: ['Stop comparing', 'إيقاف المقارنة'],
  save: ['Save image', 'حفظ الصورة'], share: ['Share', 'مشاركة'], quote: ['Get a quote', 'اطلب عرض سعر'], reset: ['Reset room', 'إعادة ضبط الغرفة'],
  rooms: ['Rooms', 'الغرف'], back: ['Back', 'رجوع'], close: ['Close', 'إغلاق'], loading: ['Loading…', 'جارٍ التحميل…'], building: ['Building your room…', 'جارٍ تجهيز غرفتك…'],
  gyro: ['Move phone to look', 'حرّك الهاتف للنظر'], dragLook: ['Drag to look around · pinch or scroll to zoom', 'اسحب للنظر حولك · قرّب بإصبعين أو بالعجلة'],
  shareTitle: ['Share this room', 'شارك هذه الغرفة'], shareSub: ['Anyone with the link or QR code opens exactly this design.', 'أي شخص لديه الرابط أو رمز QR يفتح هذا التصميم نفسه.'],
  copy: ['Copy link', 'نسخ الرابط'], copied: ['Copied', 'تم النسخ'], downloadQr: ['Download QR', 'تنزيل رمز QR'], whatsapp: ['WhatsApp', 'واتساب'],
  open2d: ['Room view', 'عرض الغرفة'], open360q: ['360° view', 'عرض 360°'],
  quoteTitle: ['Get a quote for this room', 'اطلب عرض سعر لهذه الغرفة'], quoteSub: ['Our design team will call you to confirm measurements and send your quotation.', 'سيتصل بك فريق التصميم لتأكيد المقاسات وإرسال عرض السعر.'],
  name: ['Full name', 'الاسم الكامل'], phone: ['Mobile', 'الجوال'], email: ['E-mail (optional)', 'البريد الإلكتروني (اختياري)'], note: ['Anything we should know? (optional)', 'هل هناك ما يجب أن نعرفه؟ (اختياري)'],
  send: ['Send request', 'إرسال الطلب'], sending: ['Sending…', 'جارٍ الإرسال…'], sent: ['Request sent', 'تم إرسال الطلب'], sentSub: ['Thank you — our team will contact you shortly.', 'شكرًا لك — سيتواصل معك فريقنا قريبًا.'], ref: ['Reference', 'المرجع'],
  needContact: ['Please add your name and mobile or e-mail.', 'يرجى إدخال اسمك ورقم الجوال أو البريد الإلكتروني.'], failed: ['Something went wrong — please try again.', 'حدث خطأ — يرجى المحاولة مرة أخرى.'], rateLimited: ['You have sent several requests — our team will be in touch.', 'لقد أرسلت عدة طلبات — سيتواصل معك فريقنا.'],
  yourSelection: ['Your selection', 'اختياراتك'],
  // photo mode
  photoTitle: ['Your room photo', 'صورة غرفتك'], upload: ['Upload a photo', 'ارفع صورة'], takePhoto: ['Take a photo', 'التقط صورة'], photoHint: ['A straight, well-lit photo of the room works best.', 'تعمل الصورة المستقيمة جيدة الإضاءة بشكل أفضل.'],
  addFloor: ['+ Floor', '+ أرضية'], addWall: ['+ Wall', '+ جدار'], addCounter: ['+ Worktop / splash', '+ سطح / حاجز'],
  cornersHint: ['Drag the 4 corners onto the corners of the floor or wall. They can go outside the photo.', 'اسحب الزوايا الأربع إلى زوايا الأرضية أو الجدار. يمكن أن تتجاوز حدود الصورة.'],
  brushHint: ['Paint over furniture to keep it in front.', 'لوّن فوق الأثاث لإبقائه في المقدمة.'],
  realSize: ['Real size of the marked area', 'المقاس الحقيقي للمنطقة المحددة'], widthM: ['Width (m)', 'العرض (م)'], depthM: ['Depth / height (m)', 'العمق / الارتفاع (م)'],
  edit: ['Corners', 'الزوايا'], keep: ['Keep (furniture)', 'إبقاء (الأثاث)'], restore: ['Restore', 'استعادة'], brush: ['Brush', 'الفرشاة'], shadows: ['Keep shadows', 'إبقاء الظلال'], remove: ['Remove', 'حذف'], newPhoto: ['New photo', 'صورة جديدة'],
  photoEmpty: ['Add a floor or wall to start.', 'أضف أرضية أو جدارًا للبدء.'],
  // catalogue
  catTitle: ['Product catalogue', 'كتالوج المنتجات'], catSub: ['Pick the finishes to include. Every product gets a QR code that opens it in the visualizer.', 'اختر التشطيبات التي تريد تضمينها. لكل منتج رمز QR يفتحه في المُصوِّر.'],
  catName: ['Catalogue title', 'عنوان الكتالوج'], selectAll: ['Select all', 'تحديد الكل'], clear: ['Clear', 'مسح'], selected: ['{n} selected', '{n} محدد'],
  makePdf: ['Download PDF', 'تنزيل PDF'], making: ['Building PDF…', 'جارٍ إنشاء PDF…'], includeRoom: ['Include my current room design', 'تضمين تصميم غرفتي الحالي'], withPrices: ['Show prices', 'إظهار الأسعار'],
  // kiosk
  kioskStart: ['Touch to start', 'المس للبدء'], continuePhone: ['Continue on your phone', 'تابع على هاتفك'], scanMe: ['Scan to take this design with you', 'امسح لتأخذ هذا التصميم معك'], startOver: ['Start over', 'ابدأ من جديد'],
  poweredBy: ['The Closets · Room Visualizer', 'الخزائن · مُصوِّر الغرف'], openFull: ['Open full visualizer ↗', 'افتح المُصوِّر الكامل ↗'],
  notFound: ['This saved design was not found.', 'لم يتم العثور على هذا التصميم المحفوظ.'],
};
export function T(key, ar, vars) {
  const v = S[key]; let s = v ? v[ar ? 1 : 0] : key;
  if (vars) Object.entries(vars).forEach(([k, val]) => { s = s.replace('{' + k + '}', val); });
  return s;
}
export const KIND_LABEL = {
  tile: ['Tiles', 'بلاط'], wood_floor: ['Wood floors', 'أرضيات خشبية'], laminate: ['Laminate', 'لامينيت'], vinyl: ['SPC / Vinyl', 'SPC / فينيل'], marble: ['Marble look', 'مظهر رخامي'],
  quartz: ['Quartz', 'كوارتز'], granite: ['Granite', 'جرانيت'], stone: ['Stone', 'حجر'], paint: ['Paint', 'دهان'], wallpaper: ['Wallpaper', 'ورق جدران'], wall_panel: ['Wall panels', 'ألواح جدارية'],
  board: ['Board finishes', 'تشطيبات الألواح'], carpet: ['Carpet', 'سجاد'], other: ['Other', 'أخرى'],
};
export const FINISH_LABEL = { matt: ['Matt', 'مطفي'], satin: ['Satin', 'ساتان'], gloss: ['Gloss', 'لامع'], textured: ['Textured', 'محبّب'], polished: ['Polished', 'مصقول'] };
