/* Shell route of the virtual showroom, now branded YAS Bloom: /yas-bloom and /ar/yas-bloom (kept in its own tiny module so src/index.js and the tests share the regexes).
 * The old /showroom-3d and /ar/showroom-3d paths still work: vercel.json redirects them and, as a fallback for hosts without that rule, src/index.js replaces the URL
 * with the canonical one before mounting (the query string is kept). */
export const SHOWROOM_PATH_RE = /^(\/ar)?\/yas-bloom(\/|$)/i;
export const LEGACY_SHOWROOM_PATH_RE = /^(\/ar)?\/showroom-3d(\/|$)/i;
export const isShowroomPath = (p) => SHOWROOM_PATH_RE.test(p || '') || LEGACY_SHOWROOM_PATH_RE.test(p || '');
export const isLegacyShowroomPath = (p) => LEGACY_SHOWROOM_PATH_RE.test(p || '');
/** /showroom-3d -> /yas-bloom, /ar/showroom-3d/x -> /ar/yas-bloom/x; anything else unchanged */
export const canonicalShowroomPath = (p) => String(p || '').replace(/^(\/ar)?\/showroom-3d(?=\/|$)/i, '$1/yas-bloom');
export const BRAND = { en: 'YAS Bloom', ar: 'ياس بلوم' };
