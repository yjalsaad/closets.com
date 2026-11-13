/* The VIP room's gallery wall reads the site's own project list through the SAME read-only client path the Projects page / home page use:
 *   api('website_projects?active=eq.true&order=sort_order.asc&limit=6')  then  sanitizeProjects(rows)
 * (src/App.js `api`, src/safety/sanitize.js). One GET, no writes, no new tables. It runs only when a visitor first enters the VIP room, never at load.
 * Failure or an empty list is a graceful state ("shown on our Projects page"); nothing is ever invented and no count is claimed except the loaded rows. Pure + injectable (unit-tested). */
export const PROJECTS_QUERY = 'website_projects?active=eq.true&order=sort_order.asc&limit=6';
export const MAX_CARDS = 6;

/** @returns {Promise<{status: 'ok'|'empty'|'error', rows: object[]}>} */
export async function loadProjects({ api, sanitize, query = PROJECTS_QUERY } = {}) {
  try {
    const d = await api(query);
    const rows = Array.isArray(d) ? sanitize(d) : [];
    return rows.length ? { status: 'ok', rows: rows.slice(0, MAX_CARDS) } : { status: 'empty', rows: [] };
  } catch (e) { return { status: 'error', rows: [] }; }
}
/** the real client path (lazy: App.js is already in the main bundle, so this adds no weight) */
export async function loadSiteProjects() {
  const [{ api }, { sanitizeProjects }] = await Promise.all([import('../../App'), import('../../safety/sanitize')]);
  return loadProjects({ api, sanitize: sanitizeProjects });
}
/** a project row -> what a card shows (title, type / location line, image url or '' for the procedural card). Only fields the record really has. */
export function projectCard(row = {}, lang = 'en') {
  const title = String(row.name || row.title || '').trim() || (lang === 'ar' ? 'مشروع' : 'Project');
  const meta = [row.category, row.location].map((x) => String(x || '').trim()).filter(Boolean).join(' · ');
  const image = String(row.cover_url || row.image_url || '').trim();
  return { id: row.id == null ? title : String(row.id), title, meta, image };
}
