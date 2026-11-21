/* VENDORED for the add-only YAS Bloom port (docs/showroom3d/ADDON-PORT.md): a read-only GET against the site's public REST endpoint.
 * main's src/App.js does not export its `api`, and App.js must stay untouched, so the VIP gallery wall uses this one-GET client.
 * Same public project URL + anon key that main's bundle already ships (src/App.js SUPA_URL / SUPA_KEY). No writes. */
import { SUPA_URL, SUPA_KEY } from '../../studio/hub/supaConfig';

export async function api(path) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
  if (!r.ok) throw new Error('request failed (' + r.status + ')');
  return r.json();
}
