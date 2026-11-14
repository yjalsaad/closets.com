/* /yas-bloom and /ar/yas-bloom (formerly /showroom-3d): the virtual showroom app shell (its own lazy chunk; mounted from src/index.js like the Visualizer).
 * The 3D experience only mounts when WebGL works (src/safety/WebGLGate); otherwise a 2D page with the same departments and links. */
import React, { useEffect, useState } from 'react';
import WebGLGate from './vendor/WebGLGate';
import { webglAvailable } from './vendor/webgl';
import { ENABLE_AR_URLS } from './vendor/siteConfig';
import { splitLangPath, withLang } from './vendor/routes';
import { cssVars } from './3d/palette';
import { t } from './strings';
import ShowroomExperience from './ShowroomExperience';
import Fallback2D from './ui/Fallback2D';
import './vendor/tokens.css';   // scoped design tokens (main has none)
import './ui/showroom.css';

const LANG_KEY = 'closets_lang';
function initialLang() {
  const { lang } = splitLangPath(window.location.pathname || '/');
  if (ENABLE_AR_URLS) return lang;
  try { return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; }
}

export default function ShowroomRoot() {
  const [lang, setLang] = useState(initialLang);
  const [failed, setFailed] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const ar = lang === 'ar';

  useEffect(() => {
    document.documentElement.lang = lang; document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.title = t('pageTitle', lang);
    let m = document.querySelector('meta[name="robots"]'); const created = !m;
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m); }
    const prev = m.content; m.content = 'noindex, nofollow';
    // phones with a notch / home bar: let the page draw edge to edge so the HUD can use env(safe-area-inset-*) (restored on leave)
    const vp = document.querySelector('meta[name="viewport"]'), vpPrev = vp ? vp.content : null;
    if (vp && !/viewport-fit/.test(vpPrev)) vp.content = vpPrev + ', viewport-fit=cover';
    return () => { if (created) m.remove(); else m.content = prev; if (vp && vpPrev !== null) vp.content = vpPrev; };
  }, [lang, ar]);

  const switchLang = () => {
    const next = ar ? 'en' : 'ar';
    try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* ignore */ }
    if (ENABLE_AR_URLS) {
      const { path } = splitLangPath(window.location.pathname || '/');
      window.history.replaceState(null, '', withLang(path, next) + window.location.search + window.location.hash);
    }
    setLang(next);
  };

  const fb = <Fallback2D lang={lang} error={!!failed} onRetry={failed ? () => { setFailed(null); setAttempt((n) => n + 1); } : undefined} />;
  return (
    <div className="sr3d" style={cssVars()} dir={ar ? 'rtl' : 'ltr'} lang={lang}>
      {failed || !webglAvailable()
          ? fb
          : <WebGLGate fallback={fb} name="showroom3d"><ShowroomExperience key={attempt} lang={lang} onLang={switchLang} onFail={setFailed} /></WebGLGate>}
    </div>
  );
}
