/* VENDORED REPLACEMENT (copied over src/showroom3d/siteBridge.js by the port script; its './x' imports are rewritten to './vendor/x') for src/showroom3d/siteBridge.js on production main (add-only port; docs/showroom3d/ADDON-PORT.md).
 * The integration-branch siteBridge reaches into src/privacy/* (consent store, AI consent modal, strings), which main does not have.
 * This copy keeps the same exports; the AI opt-in is a self-contained, showroom-only consent (one native confirm, remembered in localStorage) -
 * nothing is sent to the AI function unless the visitor agrees, and nothing outside the showroom is affected. */
import { FACTS } from './facts';
import { withLang } from './routes';
import { PAGES } from './pages';

export { FACTS, withLang, PAGES };
export { str, arr, isObj, num } from './sanitize';   // VIP decks
export { hasFact } from './facts';

const KEY = 'sr3d_ai_consent';
const STR = {
  aiTitle: { en: 'Send this to our AI service?', ar: 'إرسال هذا إلى خدمة الذكاء الاصطناعي؟' },
  aiBody: { en: 'To create the result, your message is sent to a third-party AI service provider that processes it for us. Please do not share personal documents or photos of people.', ar: 'لإنشاء النتيجة، تُرسل رسالتك إلى مزوّد خدمة ذكاء اصطناعي خارجي يعالجها نيابةً عنا. يُرجى عدم مشاركة مستندات شخصية أو صور أشخاص.' },
  aiDeclined: { en: 'AI features need your permission to send data to our AI service.', ar: 'تحتاج ميزات الذكاء الاصطناعي إلى إذنك لإرسال البيانات إلى خدمة الذكاء الاصطناعي.' },
};
const lang = () => { try { return (localStorage.getItem('closets_lang') || document.documentElement.lang) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } };
export const tr = (k, l) => { const e = STR[k]; return e ? (e[l || lang()] || e.en) : k; };
export const hasConsent = (cat) => { if (cat !== 'ai') return false; try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };

export async function aiFetch(url, init) {
  if (!hasConsent('ai')) {
    let ok = false;
    try { ok = window.confirm(tr('aiTitle') + '\n\n' + tr('aiBody')); } catch (e) { ok = false; }
    if (ok) { try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ } }
    else { const body = { ok: false, error: 'ai_consent_declined' }; return { ok: false, status: 451, json: async () => body, text: async () => JSON.stringify(body) }; }
  }
  return fetch(url, init);
}

export async function supportChatFetch(messages) {
  const { SUPA_URL, SUPA_KEY } = await import('./supa');
  const r = await aiFetch(SUPA_URL + '/functions/v1/support_chat', { method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
  const d = await r.json(); return d && d.ok && typeof d.reply === 'string' ? { ok: true, reply: d.reply } : { ok: false, declined: d && d.error === 'ai_consent_declined' };
}
