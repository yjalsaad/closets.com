/* VENDORED + ADAPTED for the add-only YAS Bloom port (docs/showroom3d/ADDON-PORT.md).
 * The integration branch localises every page under /ar/...; production main does NOT (its language lives in localStorage 'closets_lang').
 * So here the /ar prefix exists ONLY for the showroom's own path (/ar/yas-bloom); links out to the main site ('/booking', '/studio', ...) are never prefixed. */
export function splitLangPath(pathname) {
  const raw = pathname || '/';
  if (raw === '/ar' || raw === '/ar/') return { lang: 'ar', path: '/' };
  if (/^\/ar\//i.test(raw)) return { lang: 'ar', path: raw.slice(3) || '/' };
  return { lang: 'en', path: raw };
}
export function withLang(path, lang) {
  const p = path || '/';
  if (lang !== 'ar') return p;
  if (!/^\/(yas-bloom|showroom-3d)(\/|$|\?|#)/i.test(p)) return p;   // only the showroom itself has an /ar URL on production main
  return '/ar' + p;
}
