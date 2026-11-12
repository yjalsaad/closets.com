/**
 * ONE place for money and dates (EN + AR).
 *  - Currency: Bahraini dinar has 3 decimals (fils). EN  "BD 1,234.500"   AR  "1,234.500 د.ب"
 *  - Digits:   Latin digits in BOTH languages (matches phone numbers, invoices and the product codes on the site).
 *              Flip ARABIC_INDIC_DIGITS to true to render ١٬٢٣٤٫٥٠٠ instead.
 *  - Dates:    Gregorian calendar, Latin digits, locale month names (en-GB / ar-BH).
 */
export const ARABIC_INDIC_DIGITS = false;
const NU = ARABIC_INDIC_DIGITS ? 'arab' : 'latn';

function pickLang(lang) {
  if (lang === 'ar' || lang === 'en') return lang;
  try { if (typeof document !== 'undefined' && document.documentElement.lang === 'ar') return 'ar'; } catch (e) { /* ignore */ }
  return 'en';
}
const numFmtCache = {};
function numFmt(lang, decimals) {
  const k = lang + decimals;
  if (!numFmtCache[k]) numFmtCache[k] = new Intl.NumberFormat((lang === 'ar' ? 'ar-BH' : 'en-GB') + '-u-nu-' + NU, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return numFmtCache[k];
}

/** formatNumber(1234.5, 'ar') -> "1,234.5" (grouping per locale, digits per ARABIC_INDIC_DIGITS) */
export function formatNumber(n, lang, decimals) {
  const v = Number(n); const x = Number.isFinite(v) ? v : 0;
  const L = pickLang(lang);
  if (decimals == null) return new Intl.NumberFormat((L === 'ar' ? 'ar-BH' : 'en-GB') + '-u-nu-' + NU, { maximumFractionDigits: 3 }).format(x);
  return numFmt(L, decimals).format(x);
}

/**
 * formatBHD(1234.5, 'en') -> "BD 1,234.500"; formatBHD(1234.5, 'ar') -> "1,234.500 د.ب"
 * opts.whole = true  -> no fils, for approximate marketing figures / estimate ranges ("BD 4,500").
 */
export function formatBHD(n, lang, opts) {
  const L = pickLang(lang);
  const s = formatNumber(n, L, opts && opts.whole ? 0 : 3);
  return L === 'ar' ? s + ' د.ب' : 'BD ' + s;
}
/** formatBHDRange(4500, 9000, 'en') -> "BD 4,500 – 9,000" ; AR -> "4,500 – 9,000 د.ب" */
export function formatBHDRange(a, b, lang, opts) {
  const L = pickLang(lang);
  const w = !(opts && opts.whole === false);
  const x = formatNumber(a, L, w ? 0 : 3); const y = formatNumber(b, L, w ? 0 : 3);
  return L === 'ar' ? x + ' – ' + y + ' د.ب' : 'BD ' + x + ' – ' + y;
}

const dateCache = {};
/** formatDate('2026-11-12', 'en') -> "12/11/2026" ; style 'short' (default numeric) | 'medium' ("12 Nov 2026" / "١٢ نوفمبر ٢٠٢٦" per digits setting) */
export function formatDate(d, lang, style) {
  if (d == null || d === '') return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const L = pickLang(lang);
  const k = L + (style || 'short');
  if (!dateCache[k]) {
    dateCache[k] = new Intl.DateTimeFormat((L === 'ar' ? 'ar-BH' : 'en-GB') + '-u-ca-gregory-nu-' + NU,
      style === 'medium' ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return dateCache[k].format(dt);
}
