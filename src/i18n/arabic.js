// Arabic dictionary loader.
//
// The English strings stay in App.js (I18N / cms fallbacks), so the English path is fully synchronous. The Arabic
// strings (I18N[*].ar and the static CMS_AR) live in ar-dict.txt, are only fetched when the Arabic UI is
// requested, and are merged into the in-memory tables by ensureArabic() in App.js.
//
// Why a hashed static asset + fetch() and not import('./ar.js'): CRA's minifier runs terser with
// `ascii_only`, which turns every Arabic character in a JS bundle into a six-byte \uXXXX escape (~3x the size).
// A .txt import is emitted as /static/media/ar-dict.<hash>.txt — immutable-cacheable, UTF-8, compressed by the CDN.
import arDictUrl from './ar-dict.txt';

let pending = null;

export function fetchArabicDict() {
  if (!pending) {
    pending = fetch(arDictUrl).then((r) => {
      if (!r.ok) throw new Error('ar-dict ' + r.status);
      return r.json();
    }).catch((e) => { pending = null; throw e; });   // allow a retry after a failed load
  }
  return pending;
}
