/* The ONLY place the showroom reaches into the rest of the site for helpers (so the showroom can be ported as an additive page: vendor this file's targets).
 * Tiny on purpose. */
export { str, arr, isObj, num } from '../safety/sanitize';
export { FACTS, hasFact } from '../content/facts';
export { withLang } from '../seo/routes';
