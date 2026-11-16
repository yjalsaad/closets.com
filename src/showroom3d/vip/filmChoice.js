/* WHICH Journey film is on the Bloom wall / in the VIP agenda: the owner's switch. PURE logic + one read-only GET (injectable), no storage, no writes.
 *
 * Three versions are registered (public/yas-bloom/film/films.json): v2 (static real photographs), v3 (the leaders in an AI-generated office, camera motion only) and a reserved
 * 'v3-animated' slot (disabled until its files exist). Exactly one is ACTIVE; the others stay on disk but are not listed anywhere. The choice lives in the site's existing
 * CMS table `website_content` (the same read-only mechanism as vip/welcome.js, which already reads the `vip.*` rows):
 *     key    bloom.film.active
 *     value  v1 | v2 | v3 | v3-animated            (anything else, or no row: the default v3)
 * Read once when the film player loads. If the chosen version's files are not there it falls back to v3, then v2 (chooseJourney in vip/film.js): the wall is never empty.
 * `?film=v2|v3` in the URL overrides the row (for testing only). */
import { FILM_CHOICES } from './film';

export const FILM_CHOICE_KEY = 'bloom.film.active';
export const FILM_CHOICE_QUERY = 'website_content?active=is.true&deleted_at=is.null&key=eq.' + FILM_CHOICE_KEY;
/** CMS rows [{ key, value }] -> 'v1' | 'v2' | 'v3' | 'v3-animated' | null (null = missing / invalid: the default applies). Case and spaces are forgiven. */
export function parseFilmChoice(rows) {
  const r = (Array.isArray(rows) ? rows : []).find((x) => x && x.key === FILM_CHOICE_KEY); if (!r || r.value == null) return null;
  const v = String(r.value).trim().toLowerCase().replace(/^"|"$/g, '').replace(/_/g, '-'); return Object.prototype.hasOwnProperty.call(FILM_CHOICES, v) ? v : null;
}
/** read-only GET of the row (injectable `api`); never throws: any failure -> null (the default) */
export async function loadFilmChoice({ api } = {}) {
  try { const get = api || (await import('../vendor/siteApi')).api; return parseFilmChoice(await get(FILM_CHOICE_QUERY)); } catch (e) { return null; }
}
