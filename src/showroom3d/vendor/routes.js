/* Was VENDORED + ADAPTED for the add-only YAS Bloom port (docs/showroom3d/ADDON-PORT.md), when production main had no /ar/<page> URLs.
 * With the go-live integration (PR #3) every public page has an /ar URL, so the showroom uses the site's own registry again:
 * /ar/yas-bloom stays the showroom's Arabic path, and links out to the main site ('/booking', '/projects', ...) get the /ar prefix in Arabic,
 * while the separate app shells (/studio, /visualizer, /campaign/..., /ikhtarha/...) stay unprefixed (see src/seo/routes.js withLang). */
export { splitLangPath, withLang } from '../../seo/routes';
