// ai.js — gate for every call that sends the visitor's photo / chat text to a third-party AI processor.
//   ensureAiConsent() -> Promise<boolean>   shows a small modal the first time; remembers the answer
//   aiFetch(url, init)                      fetch() that first requires that consent; rejects with name 'AiConsentDeclined'
import { createRoot } from 'react-dom/client';
import { setConsent, hasConsent } from './consent';
import { tr, curLang } from './strings';
import { ModalPanel } from '../a11y/dialog';

let pending = null;

function AiConsentModal({ onDone }) {
  const lang = curLang(); const rtl = lang === 'ar';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <ModalPanel label={tr('aiTitle', lang)} onClose={() => onDone(false)} dir={rtl ? 'rtl' : 'ltr'}
        style={{ background: '#fff', color: '#1d1d1f', maxWidth: 440, width: '100%', borderRadius: 18, padding: 24, textAlign: rtl ? 'right' : 'left', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <h2 style={{ fontSize: 19, margin: '0 0 10px' }}>{tr('aiTitle', lang)}</h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: '0 0 18px' }}>{tr('aiBody', lang)} <a href="/privacy" style={{ textDecoration: 'underline' }}>{tr('privacyLink', lang)}</a></p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: rtl ? 'flex-start' : 'flex-end' }}>
          <button type="button" onClick={() => onDone(false)} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.3)', borderRadius: 980, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', minHeight: 44, font: 'inherit' }}>{tr('aiDeny', lang)}</button>
          <button type="button" data-autofocus onClick={() => onDone(true)} style={{ background: '#1d1d1f', color: '#fff', border: '1px solid #1d1d1f', borderRadius: 980, padding: '10px 22px', fontWeight: 600, cursor: 'pointer', minHeight: 44, font: 'inherit' }}>{tr('aiAllow', lang)}</button>
        </div>
      </ModalPanel>
    </div>
  );
}

export function ensureAiConsent() {
  if (hasConsent('ai')) return Promise.resolve(true);
  if (pending) return pending;
  pending = new Promise((resolve) => {
    const host = document.createElement('div');
    host.setAttribute('data-ai-consent', '');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (ok) => {
      if (ok) setConsent({ ai: true }, { decide: false });   // the banner (analytics) question stays open
      setTimeout(() => { try { root.unmount(); } catch (e) { /* ignore */ } host.remove(); }, 0);
      pending = null; resolve(!!ok);
    };
    root.render(<AiConsentModal onDone={done} />);
  });
  return pending;
}

export class AiConsentDeclined extends Error {
  constructor() { super('ai_consent_declined'); this.name = 'AiConsentDeclined'; }
}

// brief, polite, non-modal confirmation that nothing was sent
function notify(text) {
  try {
    const d = document.createElement('div');
    d.setAttribute('role', 'status'); d.setAttribute('data-ai-declined', '');
    d.textContent = text;
    Object.assign(d.style, { position: 'fixed', left: '16px', right: '16px', bottom: '24px', maxWidth: '460px', margin: '0 auto', zIndex: 100002, background: '#1d1d1f', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', textAlign: 'center' });
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 5000);
  } catch (e) { /* ignore */ }
}

/**
 * Drop-in replacement for fetch() on the AI edge functions. If the visitor has not allowed AI processing it asks once;
 * on "Not now" NOTHING is sent and the caller receives a Response-like { ok:false, status:451, json() -> {ok:false,error:'ai_consent_declined'} }
 * so every existing `d.ok` failure branch keeps working (no exception, no data leaves the browser).
 */
export async function aiFetch(url, init) {
  const ok = await ensureAiConsent();
  if (!ok) {
    notify(tr('aiDeclined', curLang()));
    const body = { ok: false, error: 'ai_consent_declined' };
    return { ok: false, status: 451, json: async () => body, text: async () => JSON.stringify(body) };
  }
  return fetch(url, init);
}
