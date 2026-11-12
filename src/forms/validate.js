// validate.js — form validation for every public form (booking, quote, contact, maintenance/warranty,
// newsletter, checkout, sign-in). Pure functions, bilingual messages, Bahrain (+973) aware, Arabic-Indic digits accepted.
const AR_INDIC = /[٠-٩]/g;      // ٠-٩
const FA_INDIC = /[۰-۹]/g;      // ۰-۹ (Persian digits appear on Arabic keyboards too)
export function normalizeDigits(s) {
  return String(s == null ? '' : s)
    .replace(AR_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(FA_INDIC, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/٫/g, '.').replace(/٬/g, ',');
}

export const LIMITS = { name: 120, email: 254, phone: 20, address: 300, city: 80, message: 2000, notes: 2000, subject: 200, short: 200 };

const M = {
  required: { en: 'This field is required.', ar: 'هذا الحقل مطلوب.' },
  name: { en: 'Please enter your name (letters only, no < or >).', ar: 'يرجى إدخال اسمك (أحرف فقط، دون < أو >).' },
  email: { en: 'Enter a valid e-mail address, for example name@example.com.', ar: 'أدخل بريداً إلكترونياً صحيحاً، مثل name@example.com.' },
  phone: { en: 'Enter a valid phone number, for example 3612 3456 or +973 3612 3456.', ar: 'أدخل رقم هاتف صحيحاً، مثل 36123456 أو +97336123456.' },
  tooLong: { en: 'Too long (maximum {n} characters).', ar: 'النص طويل جداً (الحد الأقصى {n} حرفاً).' },
  datePast: { en: 'Choose a date from today onwards.', ar: 'اختر تاريخاً من اليوم فصاعداً.' },
  dateFar: { en: 'Choose a date within the next 12 months.', ar: 'اختر تاريخاً خلال الأشهر الاثني عشر القادمة.' },
  dateBad: { en: 'Enter a valid date.', ar: 'أدخل تاريخاً صحيحاً.' },
  html: { en: 'Please remove < and > characters.', ar: 'يرجى إزالة الرمزين < و >.' },
  offline: { en: 'You are offline. Check your connection, then send again. Your details are kept.', ar: 'أنت غير متصل بالإنترنت. تحقّق من الاتصال ثم أرسل مجدداً. بياناتك محفوظة.' },
  slow: { en: 'Still working. Your connection looks slow, please keep this page open.', ar: 'ما زلنا نعمل. يبدو أن الاتصال بطيء، يرجى إبقاء الصفحة مفتوحة.' },
  failed: { en: 'We could not send this. Nothing was lost; please try again.', ar: 'تعذّر الإرسال. لم يضِع شيء، يرجى المحاولة مرة أخرى.' },
  fix: { en: 'Please fix the highlighted fields.', ar: 'يرجى تصحيح الحقول المحدَّدة.' },
};
export const msg = (k, lang = 'en', n) => { const e = M[k] || M.required; return (e[lang] || e.en).replace('{n}', n); };

export function validateEmail(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s || s.length > LIMITS.email) return false;
  if ((s.match(/@/g) || []).length !== 1) return false;            // 'bad@@email', 'a@b@c.com'
  const [local, domain] = s.split('@');
  if (!local || local.length > 64 || !domain) return false;
  if (/\s/.test(s) || /^\.|\.$|\.\./.test(local)) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(domain)) return false;
  return /\.[A-Za-z]{2,}$/.test(domain);
}

/** ASCII phone string: Arabic-Indic digits converted, spaces/dashes/dots/parentheses removed, a leading + or 00 kept as +. */
export function normalizePhone(v) {
  let s = normalizeDigits(v).trim().replace(/[\s().\-‎‏‪-‮]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  return s;
}
/** valid Bahrain number (8 digits, optionally with 973 / +973 / 00973) or any other international number written with a leading + (7-15 digits). */
export function validatePhone(v) {
  const s = normalizePhone(v);
  if (!s || s.length > LIMITS.phone) return false;
  if (/^[1-9]\d{7}$/.test(s)) return true;               // bare 8-digit Bahrain number
  if (/^\+?973[1-9]\d{7}$/.test(s)) return true;         // 973... / +973...
  return /^\+[1-9]\d{6,14}$/.test(s);
}
export function validateName(v) {
  const s = String(v == null ? '' : v).trim();
  return s.length >= 2 && s.length <= LIMITS.name && !/[<>]/.test(s);
}
/** YYYY-MM-DD (as from <input type=date>), today..+365 days */
export function validateDate(v, now = new Date()) {
  const s = normalizeDigits(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'dateBad';
  const d = new Date(s + 'T00:00:00'); if (Number.isNaN(d.getTime())) return 'dateBad';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d < today) return 'datePast';
  const max = new Date(today); max.setFullYear(max.getFullYear() + 1);
  if (d > max) return 'dateFar';
  return null;
}

/**
 * validateForm(values, schema, lang) -> { ok, errors:{field:message}, clean:{field:value}, first }
 * schema field: { type:'name'|'email'|'phone'|'date'|'text', required?, max? }
 */
export function validateForm(values, schema, lang = 'en', now) {
  const errors = {}; const clean = {};
  Object.keys(schema).forEach((k) => {
    const f = schema[k]; const raw = values[k];
    let v = raw == null ? '' : String(raw);
    const empty = v.trim() === '';
    if (f.type === 'phone') v = empty ? '' : normalizePhone(v); else v = v.trim();
    if (empty) { if (f.required) errors[k] = msg('required', lang); clean[k] = ''; return; }
    const max = f.max || (f.type === 'email' ? LIMITS.email : f.type === 'phone' ? LIMITS.phone : f.type === 'name' ? LIMITS.name : LIMITS.message);
    if (v.length > max) { errors[k] = msg('tooLong', lang, max); clean[k] = v; return; }
    if (f.type === 'name' && !validateName(v)) errors[k] = msg('name', lang);
    else if (f.type === 'email' && !validateEmail(v)) errors[k] = msg('email', lang);
    else if (f.type === 'phone' && !validatePhone(v)) errors[k] = msg('phone', lang);
    else if (f.type === 'date') { const e = validateDate(v, now); if (e) errors[k] = msg(e, lang); }
    else if ((f.type === 'text' || !f.type) && /[<>]/.test(v)) errors[k] = msg('html', lang);
    clean[k] = v;
  });
  const keys = Object.keys(errors);
  return { ok: keys.length === 0, errors, clean, first: keys[0] || null };
}

/** the honeypot field is named so password managers ignore it; humans never see it. A filled value = bot. */
export const HONEYPOT_NAME = 'company_website';
export const isBot = (v) => String(v == null ? '' : v).trim() !== '';
