/* The showroom advisers' brain: a deterministic, OFFLINE guide (no network, no randomness). PURE: given the visitor's words (or a quick-reply token) and a small memory object it returns
 * the answer text, quick-reply chips, actions (glide to a room / open a page) and the updated memory. English + Arabic.
 *
 * Knowledge comes ONLY from existing site data: department names + finishes (products/catalog, finishes), page labels + meta copy (seo PAGES via siteBridge), contact facts
 * (FACTS via siteBridge) and the existing VIP station titles. It never quotes a price, a discount, a delivery or lead time, a stock level or a promise: for those it says the team
 * confirms after a consultation (tested: every canned answer is scanned for digits, currency and promise phrases).
 * Selling is discovery: which room, which look, a rough budget BAND (asked, never quoted), then a recommended finish and a hand-off to /booking with a summary in the notes. */
import { FACTS, PAGES, withLang } from '../siteBridge';
import { DEPARTMENTS } from '../scenes/main-hall/departments';
import { PRODUCTS } from '../products/catalog';
import { FINISHES, finishList } from '../products/finishes';
import { INTEREST, NOTES_MAX } from '../products/quote';
import { STATIONS, DISCLAIMER } from '../products/vipContent';

const AR = (lang) => lang === 'ar';
export const pick = (o, lang) => (o && typeof o === 'object' ? (AR(lang) ? o.ar || o.en : o.en) : o);

// ---------------------------------------------------------------- normalising / matching
/** lower-case, strip Arabic diacritics + tatweel, unify alef / ya / ta-marbuta, drop punctuation */
export function norm(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^a-z0-9؀-ۿ\s#:_-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const has = (n, words) => words.some((w) => (w instanceof RegExp ? w.test(n) : n.includes(norm(w))));

// ---------------------------------------------------------------- rooms
/** showroom rooms the guide can talk about / walk to (ids = explorer glide ids) */
export const ROOMS = [
  { id: 'walkin', product: 'walkin', kw: ['walk-in', 'walk in', 'walkin', 'dressing room', 'غرفه ملابس', 'غرف الملابس', 'غرفة ملابس', 'غرف ملابس'] },
  { id: 'kitchens', product: 'kitchen', kw: ['kitchen', 'cook', 'مطبخ', 'مطابخ'] },
  { id: 'wardrobes', product: 'wardrobe', kw: ['wardrobe', 'closet', 'cupboard', 'خزانه', 'خزائن', 'دولاب', 'خزانة'] },
  { id: 'bedroom', product: 'bedroom', kw: ['bedroom', 'bed room', 'bed ', 'sleep', 'غرفه نوم', 'غرف النوم', 'نوم', 'سرير'] },
  { id: 'doors', product: 'door', kw: ['door', 'joinery', 'باب', 'ابواب', 'أبواب'] },
  { id: 'living', product: 'living', kw: ['living', 'tv', 'television', 'media wall', 'معيشه', 'معيشة', 'تلفاز', 'تلفزيون'] },
  { id: 'studio', product: 'studio', kw: ['studio', 'design studio', 'استوديو', 'ستوديو'] },
  { id: 'lounge', product: 'lounge', kw: ['consultation', 'lounge', 'استشار', 'صاله', 'صالة'] },
  { id: 'vip', product: null, kw: ['vip', 'investor', 'invest', 'partner', 'boardroom', 'board room', 'meeting room', 'مستثمر', 'استثمار', 'شراكه', 'شراكة', 'اجتماعات', 'شريك'] },
  { id: 'reception', product: null, kw: ['reception', 'entrance', 'استقبال', 'المدخل'] },
];
export const roomById = (id) => ROOMS.find((r) => r.id === id) || null;
export function detectRoom(text) { const n = norm(text); const r = ROOMS.find((x) => has(n, x.kw)); return r ? r.id : null; }
export const roomName = (id, lang) => {
  if (id === 'vip') return AR(lang) ? 'غرفة الاجتماعات VIP' : 'VIP Meeting Room';
  if (id === 'reception') return AR(lang) ? 'الاستقبال' : 'Reception';
  const d = DEPARTMENTS.find((x) => x.id === id); return d ? pick({ en: d.en, ar: d.ar }, lang) : id;
};

// ---------------------------------------------------------------- site-derived content
const page = (id) => PAGES.find((p) => p.page === id);
const pageLabel = (id, lang) => { const p = page(id); return p ? pick(p.label, lang) : id; };
const pageBlurb = (id, lang) => { const p = page(id); return p && p.meta ? (AR(lang) ? p.meta.ar : p.meta.en)[1] : ''; };
export const pageHref = (id, lang) => { const p = page(id); return p ? withLang(p.path, AR(lang) ? 'ar' : 'en') : null; };
const nameOf = (product, lang) => pick(PRODUCTS[product].name, lang);

/** EVERY service the site offers, from its own data: the eight showroom rooms, the extra service pages (TV units, home office), design/installation/maintenance/warranty. */
export function services(lang = 'en') {
  const out = [];
  for (const r of ROOMS.filter((x) => x.product)) out.push({ id: r.id, label: roomName(r.id, lang), blurb: nameOf(r.product, lang), room: r.id, href: null });
  for (const id of ['office']) out.push({ id, label: pageLabel(id, lang), blurb: pageBlurb(id, lang), room: null, href: pageHref(id, lang) });
  for (const id of ['services', 'maintenance', 'warranty', 'booking']) out.push({ id, label: pageLabel(id, lang), blurb: pageBlurb(id, lang), room: null, href: pageHref(id, lang) });
  return out;
}

// ---------------------------------------------------------------- discovery: style -> finish
export const STYLES = {
  warm: { en: 'Warm natural wood', ar: 'خشب طبيعي دافئ', re: /oak|walnut/ },
  light: { en: 'Light and airy', ar: 'فاتح ومشرق', re: /ivory|white|oak/ },
  dark: { en: 'Dark and dramatic', ar: 'داكن وجريء', re: /charcoal|ebony|walnut/ },
  soft: { en: 'Soft colour', ar: 'ألوان هادئة', re: /sage|stone|clay|blush/ },
  unsure: { en: 'Not sure yet', ar: 'لست متأكدًا بعد', re: null },
};
export const BUDGETS = { lower: { en: 'A lower band', ar: 'فئة أقل' }, mid: { en: 'A middle band', ar: 'فئة متوسطة' }, premium: { en: 'A premium band', ar: 'فئة مميزة' }, skip: { en: 'Prefer not to say', ar: 'أفضّل عدم الذكر' } };
const STYLE_KW = { warm: ['warm', 'wood', 'oak', 'natural', 'walnut', 'دافئ', 'خشب', 'بلوط', 'جوز', 'طبيعي'], light: ['light', 'airy', 'bright', 'white', 'ivory', 'فاتح', 'ابيض', 'مشرق', 'عاجي'], dark: ['dark', 'dramatic', 'charcoal', 'black', 'داكن', 'اسود', 'فحمي'], soft: ['colour', 'color', 'soft', 'sage', 'blush', 'pastel', 'هادئ', 'لون', 'الوان'], unsure: ['not sure', 'unsure', 'dont know', "don't know", 'لست متاكد', 'مش متاكد', 'ما اعرف'] };
const BUDGET_KW = { lower: ['lower', 'low', 'small', 'economy', 'اقل', 'منخفض'], mid: ['middle', 'mid', 'medium', 'متوسط'], premium: ['premium', 'high', 'luxury', 'مميز', 'فاخر', 'عالي'], skip: ['prefer not', 'rather not', 'skip', 'no idea', 'عدم', 'لا اريد'] };
const parseKw = (n, table) => Object.keys(table).find((k) => has(n, table[k])) || null;
/** the finish of a product that best matches a style word (falls back to the first sample finish): the ids are the real ones from finishes.js */
export function pickFinish(product, style) {
  const list = finishList(product); if (!list.length) return null;
  const rule = style && STYLES[style] && STYLES[style].re; if (!rule) return list[0];
  return list.find((f) => rule.test(f.id)) || list[0];
}

// ---------------------------------------------------------------- hand-off to the existing booking page (query params only)
// eslint-disable-next-line no-control-regex
const clean = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
/** /booking?interest=<existing option>&source=showroom-3d-staff&finish=<id>&notes=<summary>. The summary is built from CONTROLLED vocabulary only (room, look, budget band words), never the visitor's free text. */
export function buildHandoff({ lang = 'en', memory = {}, room = null } = {}) {
  const L = AR(lang) ? 'ar' : 'en', r = memory.room || room, def = r && roomById(r), product = def && def.product;
  const q = new URLSearchParams();
  if (product && INTEREST[product]) q.set('interest', INTEREST[product]);
  q.set('source', r === 'vip' ? 'showroom-3d-staff-vip' : 'showroom-3d-staff');
  const fin = product && memory.finish ? getFin(product, memory.finish) : null;
  if (fin) q.set('finish', clean(fin.id).slice(0, 40));
  const bits = [AR(lang) ? 'من مستشارة المعرض الافتراضي (ليس عرض سعر)' : 'From the virtual showroom adviser (not a quotation)'];
  if (r && r !== 'reception') bits.push((AR(lang) ? 'المساحة: ' : 'Space: ') + roomName(r, lang));
  if (memory.style && STYLES[memory.style] && memory.style !== 'unsure') bits.push((AR(lang) ? 'الطابع: ' : 'Look: ') + pick(STYLES[memory.style], lang));
  if (memory.budget && memory.budget !== 'skip' && BUDGETS[memory.budget]) bits.push((AR(lang) ? 'فئة الميزانية (تقدير للفريق): ' : 'Budget band (a hint for the team): ') + pick(BUDGETS[memory.budget], lang));
  if (fin) bits.push((AR(lang) ? 'التشطيب: ' : 'Finish: ') + pick(fin, lang));
  q.set('notes', clean(bits.join('. ')).slice(0, NOTES_MAX));
  return withLang('/booking', L) + '?' + q.toString();
}
const getFin = (product, id) => finishList(product).find((f) => f.id === id) || null;

// ---------------------------------------------------------------- guardrails
const FACT_TOKENS = () => {
  const out = []; if (FACTS.phone) out.push(String(FACTS.phone));
  if (FACTS.hours) for (const k of ['en', 'ar']) if (FACTS.hours[k]) out.push(FACTS.hours[k]);
  if (FACTS.phoneHref) out.push(String(FACTS.phoneHref)); if (FACTS.whatsappHref) out.push(String(FACTS.whatsappHref));
  if (FACTS.warrantyYears) out.push(`${FACTS.warrantyYears} years`, `${FACTS.warrantyYears} سنوات`);
  out.push('3D', 'ثلاثي الأبعاد');
  return out;
};
const PROMISE = /(guarantee|(a|special|big|huge|your) discount|discount (of|on|for)|% off|free delivery|delivered (in|within|by)|in stock|out of stock|lead time of|within (a|an|the) (day|week|month)|cheapest|best price|price match|special offer|no obligation|investment return|returns? of|expected return|roi)/i;
const CURRENCY = /[$€£]|\b(bhd|bd|usd|aed|sar|kwd|dinars?|dollars?)\b|دينار|دولار|ريال|درهم|%/i;
/** why a text is NOT allowed to be said by an adviser (null = fine): digits and currency (apart from the existing contact facts / warranty years), promise phrases */
export function violation(text) {
  let t = String(text == null ? '' : text); for (const f of FACT_TOKENS()) t = t.split(f).join(' ');
  if (/[0-9٠-٩]/.test(t)) return 'digits';
  if (CURRENCY.test(t)) return 'currency';
  if (PROMISE.test(t)) return 'promise';
  return null;
}
/** filter for a reply from the opt-in AI service: stripped of markup, trimmed, and dropped (-> null) when it breaks the guardrails */
export function guardAiReply(text) {
  if (typeof text !== 'string') return null;
  const t = text.replace(/<[^>]*>/g, ' ').replace(/[`*_#>]/g, '').replace(/\s+/g, ' ').trim();
  if (!t || t.length > 700 || violation(t)) return null;
  return t;
}
/** client-side rate limit: at most `max` AI questions per `windowMs` (default 6 per 30 s) */
export function createRateLimiter({ max = 6, windowMs = 30000, now = () => Date.now() } = {}) {
  let hits = [];
  return {
    take() { const t = now(); hits = hits.filter((h) => t - h < windowMs); if (hits.length >= max) return false; hits.push(t); return true; },
    retryIn() { const t = now(); hits = hits.filter((h) => t - h < windowMs); return hits.length < max ? 0 : Math.max(0, windowMs - (t - hits[0])); },
  };
}

// ---------------------------------------------------------------- the engine
const chip = (token, en, ar) => ({ token, label: { en, ar } });
const roomChips = () => [['kitchens', 'Kitchens', 'المطابخ'], ['wardrobes', 'Wardrobes', 'خزائن الملابس'], ['walkin', 'Walk-in closets', 'غرف الملابس'], ['bedroom', 'Bedrooms', 'غرف النوم'], ['doors', 'Doors', 'الأبواب'], ['living', 'Living', 'غرف المعيشة']].map(([id, en, ar]) => chip('#room:' + id, en, ar));
const baseChips = (room) => [chip('#services', 'What do you offer?', 'ما الذي تقدمونه؟'), chip('#plan', 'Help me plan my space', 'ساعدني في تخطيط مساحتي'), chip('#book', 'Book a visit', 'احجز زيارة'), ...(room && room !== 'reception' ? [chip('#go:' + room, 'Take me to ' + roomName(room, 'en'), 'خذني إلى ' + roomName(room, 'ar'))] : [chip('#goto', 'Take me to a room', 'خذني إلى غرفة')])];

export const OFFTOPIC = ['weather', 'football', 'soccer', 'politic', 'election', 'bitcoin', 'crypto', 'joke', 'recipe', 'movie', 'celebrity', 'horoscope', 'religion', 'الطقس', 'كره القدم', 'سياس', 'نكته', 'وصفه', 'فيلم', 'برج'];

/** the conversation memory a fresh chat starts with */
export const newMemory = () => ({ room: null, style: null, budget: null, step: null, finish: null, turns: 0 });

function recommend(lang, mem) {
  const def = roomById(mem.room), product = def && def.product, fin = product ? pickFinish(product, mem.style) : null; mem.finish = fin ? fin.id : null; mem.step = 'done';
  const name = roomName(mem.room, lang), finName = fin ? pick(fin, lang) : '';
  const text = AR(lang)
    ? `شكرًا. بحسب ما ذكرتَ لـ${name}، أقترح أن تنظر إلى نموذج «${finName}» في المعرض. هذا نموذج تصميم وليس عرض سعر؛ يؤكد فريقنا الأسعار والتفاصيل بعد استشارة مجانية. هل أجهّز لك طلب حجز يحمل هذا الملخص؟`
    : `Thank you. From what you told me about your ${name.toLowerCase()}, I would look at the sample "${finName}" in the showroom. It is a sample configuration, not a quotation; the team confirms prices and details after a free consultation. Shall I prepare a booking request that carries this summary?`;
  return { text, chips: [chip('#book', 'Book a visit with this summary', 'احجز زيارة بهذا الملخص'), chip('#go:' + mem.room, 'Show me the room', 'أرني الغرفة'), chip('#plan', 'Start again', 'ابدأ من جديد')], actions: [{ type: 'link', href: buildHandoff({ lang, memory: mem }), label: { en: 'Open the booking request', ar: 'افتح طلب الحجز' } }, { type: 'glide', id: mem.room, label: { en: 'Walk me there', ar: 'خذني إلى هناك' } }] };
}
function askRoom(lang, mem) {
  mem.step = 'room';
  return { text: AR(lang) ? 'يسعدني ذلك. أي مساحة تخططون لها؟' : 'Happy to help. Which space are you planning?', chips: roomChips(), actions: [] };
}
function askStyle(lang, mem) {
  mem.step = 'style';
  return { text: AR(lang) ? `جميل. أي طابع تميلون إليه لـ${roomName(mem.room, lang)}؟` : `Lovely. Which look do you lean towards for the ${roomName(mem.room, lang).toLowerCase()}?`, chips: Object.keys(STYLES).map((k) => chip('#style:' + k, STYLES[k].en, STYLES[k].ar)), actions: [] };
}
function askBudget(lang, mem) {
  mem.step = 'budget';
  return { text: AR(lang) ? 'سؤال أخير: هل لديكم فئة ميزانية تقريبية؟ لا أستطيع ذكر أسعار أو وعود، لكنها تساعد الفريق على التحضير، والفريق هو من يؤكد كل شيء.' : 'One last question: do you have a rough budget band in mind? I cannot quote prices or promise anything, but it helps the team prepare, and the team confirms everything.', chips: Object.keys(BUDGETS).map((k) => chip('#budget:' + k, BUDGETS[k].en, BUDGETS[k].ar)), actions: [] };
}

/**
 * @param {string} input  the visitor's words, or a chip token ('#services', '#room:kitchens', ...)
 * @param {{lang?: string, staff?: {id: string, room: string, name?: object}, memory?: object}} ctx
 * @returns {{intent: string, text: string, chips: Array, actions: Array, memory: object, askAi: boolean, auto: object|null}}
 */
export function reply(input, ctx = {}) {
  const lang = AR(ctx.lang) ? 'ar' : 'en', staff = ctx.staff || {}, here = staff.room || null;
  const mem = { ...newMemory(), ...(ctx.memory || {}) }; mem.turns++;
  const raw = String(input == null ? '' : input).slice(0, 400), n = norm(raw);
  const done = (intent, text, chips = baseChips(here), actions = [], extra = {}) => ({ intent, text, chips, actions, memory: mem, askAi: false, auto: null, ...extra });
  const tok = /^#(\w+)(?::([\w-]+))?$/.exec(raw.trim());
  const T = tok ? tok[1] : null, A = tok ? tok[2] : null;

  // ---- chips / tokens
  if (T === 'room' && roomById(A)) { mem.room = A; return mem.step === 'room' || mem.step === null ? withStyle(lang, mem) : withStyle(lang, mem); }
  if ((T === 'style' || T === 'budget') && !mem.room) return { ...askRoom(lang, mem), intent: 'plan', memory: mem, askAi: false, auto: null };
  if (T === 'style' && STYLES[A]) { mem.style = A; return { ...askBudget(lang, mem), intent: 'plan', memory: mem, askAi: false, auto: null }; }
  if (T === 'budget' && BUDGETS[A]) { mem.budget = A; return { ...recommend(lang, mem), intent: 'plan', memory: mem, askAi: false, auto: null }; }
  if (T === 'plan') { mem.style = null; mem.budget = null; mem.finish = null; mem.room = (here && roomById(here) && roomById(here).product) ? here : null; return { ...(mem.room ? askStyle(lang, mem) : askRoom(lang, mem)), intent: 'plan', memory: mem, askAi: false, auto: null }; }
  if (T === 'services') return servicesReply(lang, mem, here);
  if (T === 'goto') return done('goto', AR(lang) ? 'إلى أي غرفة أخذك؟' : 'Which room shall I take you to?', [...roomChips(), chip('#go:vip', 'VIP Meeting Room', 'غرفة الاجتماعات VIP'), chip('#go:studio', 'Custom Studio', 'استوديو التصميم'), chip('#go:lounge', 'Consultation Lounge', 'صالة الاستشارات')]);
  if (T === 'go' && roomById(A)) return goReply(lang, mem, A);
  if (T === 'present' && PRESENTABLE.some((d) => d.id === A)) return presentReply(lang, mem, A);
  if (T === 'book') return bookReply(lang, mem, here);
  if (T === 'info' && roomById(A)) return infoReply(lang, mem, A, here);

  // ---- an awaited answer in the planning flow
  if (mem.step === 'room') { const r = detectRoom(n); if (r && roomById(r).product) { mem.room = r; return withStyle(lang, mem); } }
  if (mem.step === 'style') { const s = parseKw(n, STYLE_KW); if (s) { mem.style = s; return { ...askBudget(lang, mem), intent: 'plan', memory: mem, askAi: false, auto: null }; } }
  if (mem.step === 'budget') { const b = parseKw(n, BUDGET_KW); if (b) { mem.budget = b; return { ...recommend(lang, mem), intent: 'plan', memory: mem, askAi: false, auto: null }; } }

  // ---- free text intents, in priority order
  if (!n) return done('empty', AR(lang) ? 'تفضّل بالسؤال، أو اختر من الاقتراحات.' : 'Go ahead and ask, or pick one of the suggestions.');
  if (has(n, [/\b(management meeting|start the meeting|begin the meeting|the meeting|agenda)\b/, 'اجتماع الاداره', 'ابدا الاجتماع', 'جدول الاعمال', 'الاجتماع'])) return presentReply(lang, mem, 'meeting');
  if (has(n, [/\b(film|video|documentary|your story|our story|the story|journey)\b/, 'فيلم', 'الفيلم', 'فيديو', 'حكايه', 'حكايتكم', 'حكايتنا', 'قصتكم', 'وثائقي'])) return presentReply(lang, mem, 'film');
  if (has(n, OFFTOPIC)) return done('offtopic', AR(lang) ? 'أعتذر، أنا هنا لأساعدك في خدمات ذا كلوزتس فقط: المطابخ والخزائن وغرف الملابس والأبواب وغيرها. بماذا أخدمك؟' : 'Sorry, I can only help with The Closets Co. and its services: kitchens, wardrobes, walk-in closets, doors and more. What can I help you with?');
  if (has(n, [/\b(take me|bring me|walk me|guide me|lead me|go to|show me the|where is|where are|how do i get)\b/, 'خذني', 'اوصلني', 'خذنا', 'وين', 'اين', 'ارني', 'وجهني'])) { const r = detectRoom(n); if (r) return goReply(lang, mem, r); return done('goto', AR(lang) ? 'إلى أي غرفة أخذك؟' : 'Which room shall I take you to?', [...roomChips(), chip('#go:vip', 'VIP Meeting Room', 'غرفة الاجتماعات VIP'), chip('#go:studio', 'Custom Studio', 'استوديو التصميم'), chip('#go:lounge', 'Consultation Lounge', 'صالة الاستشارات')]); }
  if (has(n, [/\b(hello|hi|hey|good (morning|afternoon|evening)|salam|welcome)\b/, 'مرحبا', 'اهلا', 'السلام', 'هلا', 'صباح', 'مساء'])) return greetReply(lang, mem, staff);
  if (has(n, [/\b(thanks|thank you|cheers)\b/, 'شكرا', 'مشكور', 'يعطيك'])) return done('thanks', AR(lang) ? 'على الرحب والسعة. هل أستطيع مساعدتك بشيء آخر؟' : 'You are welcome. Is there anything else I can help with?');
  if (has(n, [/\b(bye|goodbye|see you)\b/, 'مع السلامه', 'وداعا', 'الى اللقاء'])) return done('bye', AR(lang) ? 'مع السلامة، ويسعدنا استقبالك في أي وقت.' : 'Goodbye, and we would be glad to welcome you any time.');
  if (has(n, [/\b(what do you (offer|do|make|sell)|services|everything)\b/, 'ماذا تقدمون', 'شو تقدمون', 'ايش تقدمون', 'خدمات'])) return servicesReply(lang, mem, here);
  if (has(n, [/\b(price|prices|cost|costs|how much|quote|quotation|estimate|budget|cheap|expensive|discount|sale)\b/, 'سعر', 'اسعار', 'كم يكلف', 'تكلفه', 'تكلفة', 'عرض سعر', 'خصم', 'عروض', 'ميزانيه', 'ميزانية', 'بكم'])) return priceReply(lang, mem, here);
  if (has(n, [/\b(warranty|guarantee|guaranteed)\b/, 'ضمان', 'كفاله'])) return warrantyReply(lang, mem, here);
  if (has(n, [/\b(deliver\w*|shipping|lead time|how long|how soon|install\w*|timeline|stock|available|availability)\b/, 'توصيل', 'تسليم', 'كم يستغرق', 'كم تاخذ', 'مده', 'تركيب', 'متوفر', 'مخزون'])) return timingReply(lang, mem, here);
  if (has(n, [/\b(phone|call|whatsapp|contact|email|hours|open|opening|address|where are you|location)\b/, 'هاتف', 'اتصال', 'واتساب', 'تواصل', 'ساعات', 'دوام', 'عنوان', 'موقع', 'رقم'])) return contactReply(lang, mem, here);
  if (has(n, [/\b(book|booking|appointment|visit|consultation|meet|reserve)\b/, 'احجز', 'حجز', 'موعد', 'زياره', 'زيارة', 'استشاره', 'استشارة'])) return bookReply(lang, mem, here);
  if (has(n, [/\b(services|service|what do you (offer|do|make|sell)|products|everything|all (rooms|departments)|catalog)\b/, 'خدمات', 'ماذا تقدمون', 'شو تقدمون', 'ايش تقدمون', 'منتجات', 'كل الاقسام', 'ماذا تصنعون'])) return servicesReply(lang, mem, here);
  if (has(n, [/\b(finish|finishes|colour|colours|color|colors|material|materials|options|samples?)\b/, 'تشطيب', 'تشطيبات', 'لون', 'الوان', 'خامه', 'خامات', 'مواد', 'خيارات'])) { const r = detectRoom(n) || here; if (r && roomById(r) && roomById(r).product) return finishesReply(lang, mem, r); return done('finishes', AR(lang) ? 'لأي غرفة تريد رؤية التشطيبات؟' : 'For which room would you like to see the finishes?', roomChips()); }
  if (has(n, [/\b(want|looking for|need|plan|planning|renovat\w*|build|building|redo|new home|moving|help me (choose|decide|pick)|recommend\w*|suggest\w*|advice)\b/, 'اريد', 'ابغى', 'ابي', 'احتاج', 'ابحث', 'اخطط', 'تجديد', 'انصحني', 'اقترح', 'ساعدني'])) { const r = detectRoom(n) || (here && roomById(here) && roomById(here).product ? here : null); mem.style = null; mem.budget = null; mem.finish = null; if (r && roomById(r).product) { mem.room = r; return withStyle(lang, mem); } return { ...askRoom(lang, mem), intent: 'plan', memory: mem, askAi: false, auto: null }; }
  if (has(n, [/\b(present|presenting|presentation|slides?|company profile|profile|big screen)\b/, 'اعرض', 'عرض تقديمي', 'ملف الشركة', 'قدم لي', 'الشاشة الكبيرة'])) { const d = PRESENTABLE.find((x) => has(n, x.kw)) || PRESENTABLE[0]; return presentReply(lang, mem, d.id); }
  if (has(n, [/\b(investor\w*|invest\w*|partner\w*|join|briefing|boardroom)\b/, 'مستثمر', 'استثمار', 'شراكه', 'شراكة', 'انضم', 'احاطه', 'إحاطة'])) return vipReply(lang, mem);
  if (has(n, [/\b(ai|assistant|bot|robot|human|real person|who are you|are you)\b/, 'ذكاء', 'روبوت', 'من انت', 'انسان'])) return done('about', AR(lang) ? 'أنا مستشارة المعرض الافتراضية (مساعد ذكاء اصطناعي). أجيب من معلومات موقع ذا كلوزتس، ولا أعطي أسعارًا أو وعودًا؛ فريقنا يؤكد كل التفاصيل.' : 'I am the showroom adviser, an AI assistant. I answer from The Closets Co. website information and I never give prices or promises; the team confirms every detail.');
  const r = detectRoom(n); if (r) return infoReply(lang, mem, r, here);
  if (has(n, ['project', 'work', 'portfolio', 'gallery', 'مشاريع', 'اعمال', 'معرض الاعمال'])) return done('projects', AR(lang) ? 'يمكنك مشاهدة أحدث أعمالنا في صفحة «أعمالنا» على الموقع.' : 'You can see our recent work on the Our Work page of the website.', baseChips(here), [{ type: 'link', href: pageHref('projects', lang), label: { en: 'Open Our Work', ar: 'افتح أعمالنا' } }]);
  // ---- not understood: stay polite, offer the guided paths, and (only then) the opt-in AI
  return done('unknown', AR(lang) ? 'لم أفهم تمامًا. أستطيع أن أعرض خدماتنا، أو أساعدك في تخطيط مساحتك، أو آخذك إلى غرفة، أو أجهّز لك حجز زيارة. وإن شئت، يمكنني سؤال مساعد الذكاء الاصطناعي بموافقتك.' : 'I did not quite catch that. I can show you what we offer, help you plan your space, walk you to a room, or prepare a visit request. If you like, I can also ask the AI service, with your permission.', baseChips(here), [], { askAi: true });
}

function withStyle(lang, mem) { return { ...askStyle(lang, mem), intent: 'plan', memory: mem, askAi: false, auto: null }; }
function servicesReply(lang, mem, here) {
  const list = services(lang), lines = list.map((s) => `• ${s.label}${s.blurb ? ': ' + s.blurb : ''}`);
  const head = AR(lang) ? 'هذه خدماتنا كما هي مذكورة على موقعنا:' : 'Here is everything we offer, as listed on our website:';
  const tail = AR(lang) ? 'أخبرني بما يهمك وآخذك إلى الغرفة المناسبة.' : 'Tell me what interests you and I will take you to the right room.';
  return { intent: 'services', text: [head, ...lines, tail].join('\n'), chips: baseChips(here), actions: [], memory: mem, askAi: false, auto: null };
}
function infoReply(lang, mem, id, here) {
  const def = roomById(id); if (id === 'vip') return vipReply(lang, mem); if (id === 'reception') return greetReply(lang, mem, {});
  const p = PRODUCTS[def.product], spec = p.spec.slice(0, 3).map((s) => '• ' + pick(s, lang)), fins = finishList(def.product).map((f) => pick(f, lang));
  const text = [AR(lang) ? `${roomName(id, lang)}: ${pick(p.name, lang)}.` : `${roomName(id, lang)}: ${pick(p.name, lang)}.`, ...spec, (AR(lang) ? 'التشطيبات النموذجية: ' : 'Sample finishes: ') + fins.join(AR(lang) ? '، ' : '; ') + '.', AR(lang) ? 'هذا نموذج تصميم وليس عرض سعر.' : 'This is a sample configuration, not a quotation.'].join('\n');
  mem.room = id;
  return { intent: 'room', text, chips: [chip('#go:' + id, 'Take me there', 'خذني إلى هناك'), chip('#plan', 'Help me plan this', 'ساعدني في التخطيط'), chip('#book', 'Book a visit', 'احجز زيارة'), chip('#services', 'What else do you offer?', 'ماذا تقدمون أيضًا؟')], actions: [], memory: mem, askAi: false, auto: null };
}
function finishesReply(lang, mem, id) {
  const def = roomById(id), fins = finishList(def.product).map((f) => '• ' + pick(f, lang));
  mem.room = id;
  return { intent: 'finishes', text: [AR(lang) ? `التشطيبات النموذجية لـ${roomName(id, lang)}:` : `Sample finishes for ${roomName(id, lang)}:`, ...fins, AR(lang) ? 'يمكنك تجربتها بنفسك داخل الغرفة. هذه نماذج وليست عرض سعر.' : 'You can try them yourself inside the room. These are samples, not a quotation.'].join('\n'), chips: [chip('#plan', 'Help me choose', 'ساعدني في الاختيار'), chip('#go:' + id, 'Take me there', 'خذني إلى هناك'), chip('#book', 'Book a visit', 'احجز زيارة')], actions: [], memory: mem, askAi: false, auto: null };
}
function goReply(lang, mem, id) {
  const here = id; mem.room = roomById(id).product ? id : mem.room;
  return { intent: 'goto', text: AR(lang) ? `بكل سرور، سآخذك إلى ${roomName(id, lang)} الآن.` : `Of course, I will take you to ${roomName(id, lang)} now.`, chips: baseChips(here), actions: [{ type: 'glide', id, label: { en: 'Walk me there', ar: 'خذني إلى هناك' } }], memory: mem, askAi: false, auto: { type: 'glide', id } };
}
function bookReply(lang, mem, here) {
  const href = buildHandoff({ lang, memory: mem, room: here });
  return { intent: 'book', text: AR(lang) ? 'يسعدنا ذلك. سأفتح لك طلب الحجز الحالي في الموقع مع ملخص قصير في الملاحظات. الفريق يؤكد الموعد والتفاصيل.' : 'Happy to. I will open the website\'s existing booking request with a short summary in the notes. The team confirms the appointment and the details.', chips: baseChips(here), actions: [{ type: 'link', href, label: { en: 'Open the booking request', ar: 'افتح طلب الحجز' } }], memory: mem, askAi: false, auto: null };
}
function priceReply(lang, mem, here) {
  return { intent: 'price', text: AR(lang) ? 'لا أستطيع ذكر أسعار أو خصومات هنا، فكل مشروع مصنوع على المقاس. يجهّز فريقنا عرضًا بعد استشارة مجانية. إن أردت، أساعدك في تحديد ما تحتاجه ليكون الطلب واضحًا.' : 'I cannot give prices or discounts here, because every project is made to measure. The team prepares a quotation after a free consultation. If you like, I can help you pin down what you need so the request is clear.', chips: [chip('#plan', 'Help me plan my space', 'ساعدني في تخطيط مساحتي'), chip('#book', 'Book a free consultation', 'احجز استشارة مجانية'), ...baseChips(here).slice(0, 1)], actions: [], memory: mem, askAi: false, auto: null };
}
function warrantyReply(lang, mem, here) {
  const y = FACTS.warrantyYears, href = pageHref('warranty', lang);
  return { intent: 'warranty', text: AR(lang) ? `المذكور على موقعنا: ${y} سنوات على الخزائن وملحقات الإغلاق الهادئ. تفاصيل الضمان لطلبك يؤكدها الفريق، وصفحة الضمان تشرح كيفية تسجيل مطالبة.` : `Our website states ${y} years on cabinetry and soft-close hardware. The team confirms the warranty details for your order, and the Warranty page explains how to register a claim.`, chips: baseChips(here), actions: href ? [{ type: 'link', href, label: { en: 'Open the Warranty page', ar: 'افتح صفحة الضمان' } }] : [], memory: mem, askAi: false, auto: null };
}
function timingReply(lang, mem, here) {
  const href = pageHref('how-it-works', lang);
  return { intent: 'timing', text: AR(lang) ? 'ليست لدي مواعيد توصيل أو تركيب أو معلومات مخزون هنا، ولا أعد بشيء منها. يؤكد فريقنا الجدول بعد زيارة التصميم. تشرح صفحة «كيف نعمل» الخطوات من الاستشارة إلى التركيب.' : 'I do not have delivery, installation or stock information here, and I will not promise any of it. The team confirms the schedule after the design visit. The How It Works page explains the steps from consultation to installation.', chips: baseChips(here), actions: href ? [{ type: 'link', href, label: { en: 'Open How It Works', ar: 'افتح كيف نعمل' } }] : [], memory: mem, askAi: false, auto: null };
}
function contactReply(lang, mem, here) {
  const L = AR(lang) ? 'ar' : 'en', bits = [];
  if (FACTS.phone) bits.push((AR(lang) ? 'الهاتف: ' : 'Phone: ') + '⁦' + FACTS.phone + '⁩'); if (FACTS.hours && FACTS.hours[L]) bits.push((AR(lang) ? 'ساعات العمل: ' : 'Hours: ') + FACTS.hours[L]);
  const actions = []; if (FACTS.phoneHref) actions.push({ type: 'link', href: FACTS.phoneHref, label: { en: 'Call us', ar: 'اتصل بنا' } }); if (FACTS.whatsappHref) actions.push({ type: 'link', href: FACTS.whatsappHref, label: { en: 'WhatsApp', ar: 'واتساب' } });
  return { intent: 'contact', text: [AR(lang) ? 'يمكنك التواصل معنا مباشرة:' : 'You can reach the team directly:', ...bits].join('\n'), chips: baseChips(here), actions, memory: mem, askAi: false, auto: null };
}
/** the decks the adviser can put on the VIP big screen (ids = src/showroom3d/vip/decks); `kw` picks one from free text, the first is the default */
const PRESENTABLE = [
  { id: 'closets-profile', name: { en: 'The Closets company profile', ar: 'ملف شركة ذا كلوزتس' }, kw: [/\b(closets|company|factory|profile)\b/, 'ذا كلوزتس', 'ملف الشركة', 'المصنع'] },
  { id: 'yas-profile', name: { en: 'the YAS Wood profile', ar: 'ملف YAS Wood' }, kw: [/\b(yas|wood|decor\w*|panels?|laminates?)\b/, 'ياس', 'الواح', 'ألواح'] },
  { id: 'meeting', meeting: true, name: { en: 'the management meeting', ar: 'اجتماع الإدارة' }, kw: [/\b(meeting|agenda)\b/, 'اجتماع'] },
  { id: 'film', film: true, name: { en: 'our story (the film)', ar: 'حكايتنا (الفيلم)' }, kw: [/\b(film|movie|video|story)\b/, 'فيلم', 'حكايه'] },
  { id: 'default', name: { en: 'the company presentation', ar: 'عرض الشركة' }, kw: [/\b(overview|stations?|vip)\b/, 'نظره عامه', 'المحطات'] },
];
function presentReply(lang, mem, id) {
  const d = PRESENTABLE.find((x) => x.id === id) || PRESENTABLE[0]; mem.room = 'vip';
  const others0 = PRESENTABLE.filter((x) => x.id !== id).map((x) => chip('#present:' + x.id, (x.film ? 'Play ' : x.meeting ? 'Start ' : 'Present ') + x.name.en, (x.film ? 'شغّل ' : x.meeting ? 'ابدأ ' : 'اعرض ') + x.name.ar));
  if (d.meeting) return { intent: 'meeting', text: AR(lang) ? 'بكل سرور، لنبدأ اجتماع الإدارة. سأفتح جدول الأعمال على الشاشة الكبيرة: فيلما الشركة أولًا ثم العروض التقديمية. اضغط «ابدأ الاجتماع» ليبدأ الفيلم الأول بالصوت.' : 'With pleasure, let us start the management meeting. I will open the agenda on the big screen: our two company films first, then the presentations. Press "Start meeting" and the first film plays with sound.', chips: [chip('#present:closets-profile', 'Present the company profile', 'اعرض ملف الشركة'), chip('#book', 'Book a free consultation', 'احجز استشارة مجانية')], actions: [], memory: mem, askAi: false, auto: { type: 'present', deck: 'meeting' } };
  if (d.film) return { intent: 'film', text: AR(lang) ? 'بكل سرور، دعني أشغّل حكايتنا. سأفتح الفيلم على الشاشة الكبيرة في غرفة الاجتماعات VIP؛ اضغط «شغّل الفيلم» ليبدأ بالصوت. الصور فيه توضيحية مولَّدة بالذكاء الاصطناعي.' : 'With pleasure, let me play our story. I will open the film on the big screen in the VIP Meeting Room; press "Play film" and it starts with sound. Its pictures are AI-generated illustrations.', chips: [...others0, chip('#book', 'Book a free consultation', 'احجز استشارة مجانية')], actions: [], memory: mem, askAi: false, auto: { type: 'present', deck: 'film' } };
  const text = AR(lang)
    ? `بكل سرور، سأعرض ${pick(d.name, lang)} على الشاشة الكبيرة في غرفة الاجتماعات VIP. المحتوى من الملفات التي قدمتها الإدارة، وتذكر كل شريحة صفحة مصدرها. ` + pick(DISCLAIMER, lang)
    : `Happy to. Let me present ${pick(d.name, lang)} on the big screen in the VIP Meeting Room. The content comes from the documents management supplied, and each slide cites its source page. ` + pick(DISCLAIMER, lang);
  const others = others0;
  return { intent: 'present', text, chips: [...others, chip('#book', 'Book a free consultation', 'احجز استشارة مجانية')], actions: [], memory: mem, askAi: false, auto: { type: 'present', deck: id } };
}
function vipReply(lang, mem) {
  const st = STATIONS.map((s, i) => `${AR(lang) ? '' : ''}• ${pick(s.title, lang)}`);
  const text = [AR(lang) ? 'غرفة الاجتماعات VIP تبدأ باجتماع الإدارة (فيلما الشركة ثم العروض). في عرض الشركة أربع محطات، إضافة إلى عرضين لملف الشركة:' : 'The VIP Meeting Room opens with the Management meeting (our two company films, then the presentations). The company presentation has four stations, plus two company-profile presentations:', ...st, AR(lang) ? 'لا أستطيع الحديث عن أرقام أو عوائد أو وعود؛ تُناقَش أي تفاصيل مباشرة مع الإدارة. ' + pick(DISCLAIMER, lang) : 'I cannot speak about figures, returns or promises; any details are discussed directly with management. ' + pick(DISCLAIMER, lang)].join('\n');
  mem.room = 'vip';
  return { intent: 'vip', text, chips: [chip('#go:vip', 'Take me to the VIP room', 'خذني إلى غرفة VIP'), chip('#present:meeting', 'Start the management meeting', 'ابدأ اجتماع الإدارة'), chip('#present:closets-profile', 'Present the company profile', 'اعرض ملف الشركة'), chip('#present:film', 'Watch our story', 'شاهد حكايتنا'), chip('#book', 'Book a free consultation', 'احجز استشارة مجانية'), chip('#services', 'What do you offer?', 'ما الذي تقدمونه؟')], actions: [], memory: mem, askAi: false, auto: null };
}
function greetReply(lang, mem, staff) {
  const nm = staff && staff.name ? pick(staff.name, lang) : '';
  const room = staff && staff.room;
  const text = room === 'reception'
    ? (AR(lang) ? `أهلًا بك في المعرض. أنا ${nm || 'مستشارة الاستقبال'} (مساعد ذكاء اصطناعي). أستطيع أن أعرض لك كل ما نقدمه، أو آخذك إلى أي غرفة، أو أساعدك في تخطيط مساحتك وحجز زيارة.` : `Welcome to the showroom. I am the ${nm || 'Reception advisor'}, an AI assistant. I can show you everything we offer, take you to any room, or help you plan your space and book a visit.`)
    : room === 'vip' ? (AR(lang) ? `أهلًا بك في غرفة الاجتماعات. أنا ${nm} (مساعد ذكاء اصطناعي). أشرح لك المحطات وأعرض ملف الشركة على الشاشة الكبيرة، دون أرقام أو وعود.` : `Welcome to the meeting room. I am the ${nm}, an AI assistant. I can explain the stations and present the company profile on the big screen, with no figures and no promises.`)
      : (AR(lang) ? `أهلًا بك. أنا ${nm || 'مستشارة'} هذه الغرفة (مساعد ذكاء اصطناعي). يسعدني أن أشرح لك ما تراه هنا وأساعدك في اختيار ما يناسبك.` : `Welcome. I am the ${nm || 'adviser'} for this room, an AI assistant. I am glad to explain what you see here and help you choose what suits you.`);
  return { intent: 'greeting', text, chips: baseChips(room), actions: [], memory: mem, askAi: false, auto: null };
}
/** the first thing an adviser says when the chat opens (also used by the Reception greeting bubble) */
export function opening(staff, lang = 'en') { const r = greetReply(lang, newMemory(), staff); return { text: r.text, chips: r.chips }; }

/** every canned sentence an adviser can say, for the guardrail test (both languages, every room) */
export function allCannedTexts() {
  const out = [];
  for (const lang of ['en', 'ar']) {
    const probes = ['#services', '#plan', '#goto', '#book', '#room:kitchens', '#style:warm', '#budget:mid', 'hello', 'thanks', 'bye', 'what is the price', 'warranty', 'delivery time', 'contact', 'investor', 'finishes for the wardrobe', 'weather', 'asdf qwer', 'ما هو السعر', 'ضمان', 'توصيل', 'تواصل', 'مستثمر', 'الطقس', 'خذني إلى المطابخ', 'مرحبا', 'شكرا', 'مع السلامه', 'من انت'];
    for (const r of ROOMS) probes.push('#go:' + r.id, '#info:' + r.id);
    for (const sid of ['reception', 'kitchens', 'vip']) for (const p of probes) { const m = reply(p, { lang, staff: { id: sid, room: sid, name: { en: 'Advisor', ar: 'مستشارة' } } }); out.push(m.text); for (const c of m.chips) out.push(pick(c.label, lang)); }
    // the whole planning flow for every product, with every look and budget band
    for (const r of ROOMS.filter((x) => x.product)) for (const st of Object.keys(STYLES)) for (const b of Object.keys(BUDGETS)) { let m = reply('#room:' + r.id, { lang }); m = reply('#style:' + st, { lang, memory: m.memory }); m = reply('#budget:' + b, { lang, memory: m.memory }); out.push(m.text); }
  }
  return out;
}
export const FINISH_IDS = Object.fromEntries(Object.keys(FINISHES).map((k) => [k, FINISHES[k].map((f) => f.id)]));
