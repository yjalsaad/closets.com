/* The WELCOME slide of the VIP presentation: the guests' greeting, the meeting date and the two national flags (Bahrain, Saudi Arabia). PURE: no DOM, no three.js, no storage.
 *
 * THE DATE. The explicit date (ISO yyyy-mm-dd) is the single source of truth; the word "tomorrow" is never typed into the content. It is DERIVED: the slide says
 * "Our meeting is tomorrow" only while the date really is tomorrow (Bahrain time, UTC+3, no daylight saving), "today" on the day, and otherwise just the weekday and date.
 * After the date has passed the meeting line disappears (an old date must never be shown as upcoming); the welcome itself stays.
 * Where the date lives:
 *   1. DEFAULT_MEETING_DATE below (committed, so the slide is right the day this ships), and
 *   2. the site's own CMS table `website_content` (the Hub's "Website Content" manager edits it; the site already reads it with one read-only GET), keys
 *        vip.meeting.date            2026-11-16            (ISO date)
 *        vip.welcome.line            warm welcome sentence, English
 *        vip.welcome.line::ar        the same, Arabic       (the site's "<key>::ar" convention)
 *      read once, when somebody first enters the VIP room. A missing / empty / invalid row falls back to (1), so a typo can never break or blank the slide.
 *      The rows must exist once (see docs/showroom3d/VIP-DECKS.md, "Welcome slide"); after that the owner edits them in the Hub with no deploy.
 * Digits: Western digits in both languages, as everywhere else in the VIP decks (2007, "ص 7-8"). Arabic wording awaits native review. */
import { cleanText } from './deckSchema';

export const WELCOME_SLIDE_ID = 'welcome';
export const DEFAULT_MEETING_DATE = '';   // no committed meeting date: the owner asked for the "meeting tomorrow" line to be removed (15 Nov 2026). A valid vip.meeting.date CMS row brings the line back.
export const BAHRAIN_UTC_OFFSET_HOURS = 3;
export const CMS_KEYS = Object.freeze({ date: 'vip.meeting.date', line: 'vip.welcome.line', lineAr: 'vip.welcome.line::ar' });
export const CMS_QUERY = 'website_content?active=is.true&deleted_at=is.null&key=like.vip.*';

export const WELCOME_TITLE = { en: 'Welcome', ar: 'أهلاً وسهلاً' };
export const WELCOME_LINE = {
  en: 'It is our honour to welcome our guests to The Closets and YAS. We are glad to have you with us.',
  ar: 'يشرفنا استقبال ضيوفنا الكرام في الخزائن وYAS، ويسعدنا وجودكم بيننا.',
};
export const MEETING_KICKER = {
  today: { en: 'Our meeting is today', ar: 'اجتماعنا اليوم' },
  tomorrow: { en: 'Our meeting is tomorrow', ar: 'اجتماعنا غدًا' },
  upcoming: { en: 'Meeting', ar: 'موعد الاجتماع' },
};
export const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};
export const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};
export const GUEST_FLAGS = ['bh', 'sa'];   // Bahrain, Saudi Arabia (alphabetical by English name)

const DAY_MS = 86400000;
/** 'yyyy-mm-dd' -> { y, m, d } for a REAL calendar date, else null (2026-02-30 is invalid) */
export function parseISODate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof v === 'string' ? v.trim() : ''); if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
  return y >= 2000 && y <= 2100 && t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, m: mo, d } : null;
}
const dayNumber = ({ y, m, d }) => Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
/** the calendar date it is NOW in Bahrain (UTC+3) */
export function todayInBahrain(now = new Date()) {
  const t = new Date((now instanceof Date ? now.getTime() : Number(now)) + BAHRAIN_UTC_OFFSET_HOURS * 3600000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
/** whole days from today (Bahrain) to the date: 0 today, 1 tomorrow, negative = past; null for an invalid date */
export function daysUntil(iso, now = new Date()) { const p = parseISODate(iso); return p ? dayNumber(p) - dayNumber(todayInBahrain(now)) : null; }
export const weekdayIndex = (p) => new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
/** 'Monday 16 November 2026' / 'الاثنين 16 نوفمبر 2026' (Western digits) */
export function longDate(iso, lang = 'en') {
  const p = parseISODate(iso); if (!p) return ''; const l = lang === 'ar' ? 'ar' : 'en';
  return `${WEEKDAYS[l][weekdayIndex(p)]} ${p.d} ${MONTHS[l][p.m - 1]} ${p.y}`;
}
/** the meeting line: { rel: 'today' | 'tomorrow' | 'upcoming', kicker, date } or null when there is no valid date or it has passed */
export function meetingLine(iso, lang = 'en', now = new Date()) {
  const n = daysUntil(iso, now); if (n === null || n < 0) return null; const l = lang === 'ar' ? 'ar' : 'en';
  const rel = n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'upcoming';
  return { rel, kicker: MEETING_KICKER[rel][l], date: longDate(iso, l), days: n };
}

/** CMS rows [{ key, value }] -> { date, line: { en, ar } } with ONLY valid values (anything else is ignored, so the committed defaults apply) */
export function parseWelcomeRows(rows) {
  const cfg = {}; const list = Array.isArray(rows) ? rows : [];
  const val = (k) => { const r = list.find((x) => x && x.key === k); return r && r.value != null ? r.value : ''; };
  const date = String(val(CMS_KEYS.date)).trim(); if (parseISODate(date)) cfg.date = date;
  const en = cleanText(val(CMS_KEYS.line), 180), ar = cleanText(val(CMS_KEYS.lineAr), 180);
  if (en || ar) cfg.line = { en: en || '', ar: ar || '' };
  return cfg;
}
/** read-only GET of the CMS rows (injectable `api`); never throws: any failure -> {} (the defaults) */
export async function loadWelcomeConfig({ api } = {}) {
  try {
    const get = api || (await import('../vendor/siteApi')).api;
    return parseWelcomeRows(await get(CMS_QUERY));
  } catch (e) { return {}; }
}

/** everything the slide shows, for one language: { title, line, meeting: {rel, kicker, date} | null, flags: [{ id, name }] } */
export function resolveWelcome(cfg = {}, lang = 'en', now = new Date(), flagNames = null) {
  const l = lang === 'ar' ? 'ar' : 'en', c = cfg || {};
  const line = (c.line && c.line[l]) || WELCOME_LINE[l];
  return { title: WELCOME_TITLE[l], line, meeting: meetingLine(c.date || DEFAULT_MEETING_DATE, l, now), flags: GUEST_FLAGS.map((id) => ({ id, name: flagNames ? flagNames[id][l] : '' })) };
}
/** the slide as the deck engine knows it (the generic fields give the panel, the picker and the screen reader a title and a lead; the renderers draw the rest) */
export const WELCOME_DECK_SLIDE = { id: WELCOME_SLIDE_ID, builtin: 'welcome', title: WELCOME_TITLE, lead: WELCOME_LINE };
