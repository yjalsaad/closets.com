/* Haneen AI: the investor assistant of Bloom Meeting. PURE, deterministic, offline-first (no network, no storage, no DOM).
 * An answer is ALWAYS assembled from fact-sheet entries (investor/factsheet.js) and carries the ids of the facts it used (`factIds`), so every sentence is traceable.
 * Rules (investors, legal exposure):
 *   - a fact whose status is 'needs-owner-confirmation' is never stated: the reply is UNCONFIRMED ("I don't have a confirmed figure for that; I'll connect you with the team")
 *   - questions about money (valuation, revenue, funding, equity, returns, price ...) are always UNCONFIRMED with the meeting action; no promise, no ROI, no forecast
 *   - a question it does not understand falls back to the topic chips, and only then offers the existing opt-in AI chat (`askAi`), which stays consent-gated and guarded
 *   - the session memory holds only the turn count and the last topic; resetSession() clears it. Nothing is stored. */
import { FACT_SHEET, FACTS_BY_TOPIC, TOPICS, TOPIC_TITLE, CONFIRMED, PENDING, UNCONFIRMED, NOT_UNDERSTOOD, INFO_LINE, factById } from './haneenData';

export const newSession = () => ({ turns: 0, topic: null });
/** the visitor's own wording is never kept: only counters */
export const resetSession = () => newSession();

const AR = (lang) => lang === 'ar';
const pick = (v, lang) => (v && typeof v === 'object' ? v[AR(lang) ? 'ar' : 'en'] : v);
/** lower-case, no Arabic diacritics / tatweel, unified alef / ya / ta marbuta, collapsed spaces */
export const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^a-z0-9؀-ۿ#:\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (n, list) => list.some((k) => (k instanceof RegExp ? k.test(n) : n.includes(norm(k))));

const MONEY = [/\b(valuation|revenue|turnover|profit|ebitda|funding|raise|equity|stake|shares?|dividends?|returns?|roi|yield|invest(ment|or|ing)?|financials?|price|cost|how much|worth|margin)\b/, 'تقييم', 'ايراد', 'ارباح', 'ربح', 'تمويل', 'حصه', 'اسهم', 'عائد', 'استثمار', 'مستثمر', 'مالي', 'كم سعر', 'كم تكلف', 'كم قيمه', 'هامش'];
const TOPIC_KW = {
  who: [/\b(who|about|company|overview|story|history|founded|since|mission|vision|yas|closets)\b/, 'من انتم', 'من نحن', 'عن الشركه', 'نبذه', 'تاسيس', 'تاريخ', 'رساله', 'رؤيه'],
  factories: [/\b(factory|factories|plant|production|manufactur\w*|machin\w*|capacity|quality|iso|askar)\b/, 'مصنع', 'مصانع', 'انتاج', 'تصنيع', 'الات', 'طاقه', 'جوده', 'عسكر'],
  products: [/\b(products?|collections?|finish\w*|kitchens?|closets?|wardrobes?|doors?|floorings?|surfaces?|range|warranty|catalog\w*)\b/, 'منتج', 'مجموعه', 'مجموعات', 'تشطيب', 'مطبخ', 'مطابخ', 'خزانه', 'خزائن', 'ضمان', 'ابواب'],
  markets: [/\b(markets?|gcc|gulf|iraq|jordan|saudi|qatar|bahrain|countries|regions?|export|abroad|distribut\w*|showrooms?)\b/, 'سوق', 'اسواق', 'الخليج', 'العراق', 'الاردن', 'السعوديه', 'قطر', 'البحرين', 'دول', 'معارض', 'توزيع'],
  track: [/\b(track record|projects?|milestones?|achievements?|clients?|customers?|references?|experience|delivered)\b/, 'سجل', 'انجاز', 'مشاريع', 'مشروع', 'محطات', 'عملاء', 'خبره'],
  tech: [/\b(tech\w*|bonsai|hub|erp|cad|software|patents?|innovation|digital|platform|system)\b/, 'تقني', 'تكنولوجيا', 'برنامج', 'براءه', 'براءات', 'ابتكار', 'منصه', 'نظام'],
  team: [/\b(team|management|leadership|leaders?|ceo|founders?|directors?|people|staff)\b/, 'فريق', 'ادارة', 'الاداره', 'قياده', 'مدير', 'مؤسس', 'موظف'],
  invest: [/\b(invest\w*|opportunit\w*|partner\w*|join|briefing|proposal)\b/, 'فرصه', 'شراكه', 'شريك', 'انضم', 'استثمار'],
  visit: [/\b(visit|tour|see the factory|come to|appointment|site visit)\b/, 'زياره', 'جوله', 'موعد', 'نزور'],
  human: [/\b(human|person|someone|call|phone|whatsapp|email|contact|talk to|speak to|meeting|meet)\b/, 'موظف', 'شخص', 'اتصال', 'اتصل', 'واتساب', 'تواصل', 'اجتماع', 'تكلم', 'كلم'],
};
const GREET = [/\b(hi|hello|hey|salam|good (morning|evening))\b/, 'مرحبا', 'اهلا', 'السلام', 'هلا', 'صباح', 'مساء'];
const THANKS = [/\b(thanks?|thank you|great|ok(ay)?)\b/, 'شكرا', 'ممتاز', 'تمام'];
const OFFTOPIC = ['weather', 'football', 'soccer', 'politic', 'election', 'bitcoin', 'crypto', 'joke', 'recipe', 'movie', 'celebrity', 'horoscope', 'religion', 'الطقس', 'كره القدم', 'سياس', 'نكته', 'وصفه', 'فيلم', 'برج'];

const chip = (token, label) => ({ token, label });
export const topicChips = () => TOPICS.map((id) => chip('#' + id, TOPIC_TITLE[id]));
const meetingAction = { type: 'meeting', label: { en: 'Request a meeting with the team', ar: 'اطلب اجتماعًا مع الفريق' } };

export const opening = (lang = 'en') => ({
  text: AR(lang)
    ? 'أهلاً بك في اجتماع بلوم. أنا حنين، مساعدة ذكاء اصطناعي. أجيب عن أسئلتك حول YAS Factory من معلومات الشركة المؤكَّدة فقط، ولا أذكر أرقامًا لم تؤكدها الإدارة. بماذا تودّ أن نبدأ؟'
    : "Welcome to Bloom Meeting. I'm Haneen, an AI assistant. I answer questions about YAS Factory from the company's confirmed information only, and I never quote a figure management has not confirmed. Where would you like to start?",
  chips: topicChips(), factIds: [], intent: 'greeting', actions: [], askAi: false,
});

/** one topic: the confirmed facts, plus one honest line when part of the topic is still awaiting management */
function topicReply(topic, lang, mem) {
  const facts = FACTS_BY_TOPIC[topic] || [], ok = facts.filter((f) => f.status === CONFIRMED), pend = facts.filter((f) => f.status === PENDING);
  const lines = ok.map((f) => pick(f.text, lang));
  if (pend.length) lines.push(pick(UNCONFIRMED, lang));
  if (!lines.length) lines.push(pick(UNCONFIRMED, lang));
  const actions = pend.length || !ok.length || topic === 'invest' || topic === 'human' || topic === 'visit' ? [meetingAction] : [];
  return { text: lines.join(' '), chips: topicChips().filter((c) => c.token !== '#' + topic).slice(0, 6), factIds: [...ok, ...pend].map((f) => f.id), pending: pend.map((f) => f.id), intent: 'topic:' + topic, actions, askAi: false, memory: { ...mem, topic } };
}
const unconfirmed = (ids, lang, mem, intent = 'unconfirmed') => ({ text: pick(UNCONFIRMED, lang), chips: topicChips().slice(0, 6), factIds: ids, pending: ids, intent, actions: [meetingAction], askAi: false, memory: mem });

/** the answer to one visitor turn. input: free text or a chip token ('#factories'). Returns { text, chips, factIds, pending, intent, actions, askAi, memory }. Never throws. */
export function reply(input, { lang = 'en', memory = newSession() } = {}) {
  const mem = { ...newSession(), ...memory, turns: ((memory && memory.turns) || 0) + 1 }, raw = String(input == null ? '' : input).slice(0, 300), n = norm(raw);
  if (!n) return { ...opening(lang), intent: 'empty', memory: mem };
  const tok = /^#([a-z]+)$/.exec(n);
  if (tok && TOPICS.includes(tok[1])) return topicReply(tok[1], lang, mem);
  if (has(n, OFFTOPIC)) return { text: AR(lang) ? 'أستطيع الإجابة عن شركتنا فقط. اختر موضوعًا من القائمة.' : 'I can only help with questions about our company. Pick a topic below.', chips: topicChips().slice(0, 6), factIds: [], pending: [], intent: 'offtopic', actions: [], askAi: false, memory: mem };
  // a specific figure the owner has not confirmed (matched by the pending fact's own keywords): never answered
  const hit = FACT_SHEET.filter((f) => f.status === PENDING && f.id !== 'invest.terms' && f.kw && has(n, f.kw)).map((f) => f.id);
  if (has(n, MONEY) || (factById('invest.terms').kw && has(n, factById('invest.terms').kw))) return unconfirmed(['invest.terms', ...hit], lang, mem, 'money');
  if (hit.length) return unconfirmed(hit, lang, mem, 'pending-figure');
  const topics = TOPICS.filter((t) => has(n, TOPIC_KW[t]));
  if (topics.length) { const t = topics.includes('invest') ? 'invest' : topics[0]; return topicReply(t, lang, mem); }
  if (has(n, GREET)) return { ...opening(lang), intent: 'greeting', memory: mem };
  if (has(n, THANKS)) return { text: AR(lang) ? 'على الرحب والسعة. هل من موضوع آخر؟' : "You're welcome. Anything else?", chips: topicChips().slice(0, 6), factIds: [], pending: [], intent: 'thanks', actions: [], askAi: false, memory: mem };
  // not understood: topic chips first; the opt-in AI chat is offered only now
  return { text: pick(NOT_UNDERSTOOD, lang), chips: topicChips(), factIds: [], pending: [], intent: 'unknown', actions: [meetingAction], askAi: true, memory: mem };
}

/** compose the meeting request as a mailto / WhatsApp link (nothing is sent by this site: the visitor's own mail / WhatsApp app opens). Fields are trimmed and length-capped. */
export function meetingRequest({ name, email, phone, company, message } = {}, { lang = 'en', factsEmail = '', factsWhatsapp = '' } = {}) {
  const c = (v, m) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, m);
  const f = { name: c(name, 80), email: c(email, 120), phone: c(phone, 40), company: c(company, 100), message: c(message, 400) };
  const errors = []; if (!f.name) errors.push('name'); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) && !f.phone) errors.push('contact');
  const lines = [AR(lang) ? 'طلب اجتماع مع الفريق (من اجتماع بلوم، مساعدة حنين AI)' : 'Meeting request (Bloom Meeting, Haneen AI)', `${AR(lang) ? 'الاسم' : 'Name'}: ${f.name}`, `${AR(lang) ? 'الشركة' : 'Company'}: ${f.company}`, `${AR(lang) ? 'البريد' : 'Email'}: ${f.email}`, `${AR(lang) ? 'الهاتف' : 'Phone'}: ${f.phone}`, `${AR(lang) ? 'الرسالة' : 'Message'}: ${f.message}`];
  const body = lines.join('\n'), subject = AR(lang) ? 'طلب اجتماع - اجتماع بلوم' : 'Meeting request - Bloom Meeting';
  return { ok: errors.length === 0, errors, fields: f, mailto: factsEmail ? `mailto:${factsEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : '', whatsapp: factsWhatsapp ? `${factsWhatsapp}?text=${encodeURIComponent(body)}` : '' };
}
export { INFO_LINE, UNCONFIRMED, TOPICS, TOPIC_TITLE };
