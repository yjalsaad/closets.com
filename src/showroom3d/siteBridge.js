/* The ONLY file in src/showroom3d that reaches into the surrounding website for things the showroom does not own (contact facts, the language-path helper, the page list
 * and its meta copy, the consent-gated AI fetch, the consent state and its wording). When the showroom is ported onto another branch, swap this one file for a vendored copy
 * (or a stub): every new showroom module imports these from here, never from the site directly. */
import { FACTS } from '../content/facts';
import { withLang, PAGES } from '../seo/routes';
import { aiFetch } from '../privacy/ai';
import { hasConsent } from '../privacy/consent';
import { tr } from '../privacy/strings';

export { FACTS, withLang, PAGES, aiFetch, hasConsent, tr };
/** the existing Supabase function URL + anon headers the site already uses for support_chat (read from the same constants App.js exports lazily; no key is stored here) */
export async function supportChatFetch(messages) {
  const { SUPA_URL, SUPA_KEY } = await import('../App');
  const r = await aiFetch(SUPA_URL + '/functions/v1/support_chat', { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
  const d = await r.json(); return d && d.ok && typeof d.reply === 'string' ? { ok: true, reply: d.reply } : { ok: false, declined: d && d.error === 'ai_consent_declined' };
}
