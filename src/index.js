import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './design/tokens.css';
import './design/base.css';
import './design/shell.css';
import './design/home.css';
import { applyTheme } from './design/theme';
import App, { preloadRoute, ensureArabic } from './App';
import ErrorBoundary from './ErrorBoundary';
import reportWebVitals from './reportWebVitals';
import { scheduleBrandFonts } from './fonts';
import { hydration } from './hydration';
import { ENABLE_AR_URLS } from './seo/siteConfig';
import { splitLangPath } from './seo/routes';

scheduleBrandFonts();   // non-blocking brand fonts (see src/fonts.js)
applyTheme();   // data-theme on <html>: REACT_APP_THEME default, ?theme= preview override (src/design/theme.js)
const container = document.getElementById('root');
function HydrationDone() { React.useEffect(() => { hydration.active = false; }, []); return null; }

// [WEB-STUDIO 2026-10-31] /studio/* = the Neo Design Studio (the 8 Bonsai Neo designers for signed-in customers): its own lazy chunk,
// mounted instead of the marketing site so the designers get the full screen.
// [SEO] Prerendered HTML carries data-prerender-path (the URL it was rendered for). If this URL differs (404.html served for a
// route the rewrite table missed, a mixed-case path, ...) do NOT hydrate: drop the static markup and mount fresh.
const preMarker = container.getAttribute('data-prerender-path');
if (preMarker !== null && preMarker !== ((window.location.pathname || '/').replace(/\/+$/, '') || '/')) container.innerHTML = '';

const isStudio = /^\/studio(\/|$)/i.test(window.location.pathname || '');
const StudioRoot = React.lazy(() => import('./studio/StudioRoot'));
// [ROOM-VIZ 2026-11-07] /visualizer/* = the Room Visualizer (Tilesview-style): its own lazy chunk and full-screen shell
const isViz = /^\/visualizer(\/|$)/i.test(window.location.pathname || '');
const VizRoot = React.lazy(() => import('./visualizer/VizRoot'));
// [IKHTARHA 2026-11-08] /campaign/ikhtarha = the «اختارها» choose-your-box reward campaign (lazy chunk; three.js loads only there)
const isIkhtarha = /^\/campaign\/ikhtarha(\/|$)/i.test(window.location.pathname || '');
const IkhtarhaRoot = React.lazy(() => import('./campaign/IkhtarhaRoot'));
// [IKHTARHA GAMES 2026-11-09] /ikhtarha/games = the Games Hub (extra activity of the campaign; its own lazy chunk)
const isGames = /^\/ikhtarha\/games(\/|$)/i.test(window.location.pathname || '');
const GamesRoot = React.lazy(() => import('./games/GamesRoot'));

// When the page was prerendered (the postbuild puppeteer crawl writes static
// markup into #root), hydrate it so the prerendered DOM is reused — no flash of
// empty content, and crawlers see real text. Otherwise (normal dev / a route
// that wasn't prerendered) mount fresh with createRoot.
if (isGames) {
  if (container.hasChildNodes()) container.innerHTML = '';
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <React.Suspense fallback={null}><GamesRoot /></React.Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else if (isIkhtarha) {
  if (container.hasChildNodes()) container.innerHTML = '';
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <React.Suspense fallback={null}><IkhtarhaRoot /></React.Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else if (isViz) {
  if (container.hasChildNodes()) container.innerHTML = '';
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <React.Suspense fallback={null}><VizRoot /></React.Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else if (isStudio) {
  if (container.hasChildNodes()) container.innerHTML = '';
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <React.Suspense fallback={null}><StudioRoot /></React.Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  // Main marketing site. Two things must be ready before the first React render so the page never flashes a skeleton or the wrong language:
  //  - the current route's code-split chunk (see lazyPage.js) — so prerendered markup hydrates against real components;
  //  - the Arabic dictionary (src/i18n/arabic.js) when the visitor's saved language is Arabic. English is always synchronous.
  // Arabic is needed up-front when the URL is /ar/... (ENABLE_AR_URLS) or, in legacy mode, when the saved language is Arabic.
  const storedAr = (() => { try { return localStorage.getItem('closets_lang') === 'ar'; } catch (e) { return false; } })();
  const wantsAr = ENABLE_AR_URLS ? splitLangPath(window.location.pathname).lang === 'ar' : storedAr;
  const app = (
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  const prerendered = container.hasChildNodes();
  const ready = Promise.all([prerendered ? preloadRoute(window.location.pathname) : null, wantsAr ? ensureArabic() : null]);
  // Phones: the prerender is a desktop-width layout. Hydrating it works (verified clean at 390px) but keeps those nodes and then re-lays them out
  // for mobile, which Chrome records as a ~0.7 layout shift. Client-rendering over it (React replaces the markup on first commit) does not.
  // Flip HYDRATE_NARROW once the prerender has a mobile-safe first pass (viewport-agnostic markup).
  const HYDRATE_NARROW = false;
  const narrow = !HYDRATE_NARROW && window.innerWidth < 768;
  const start = () => {
    // /ar URLs are prerendered in Arabic, so they hydrate like any other route. Only legacy mode (language in localStorage, no /ar URLs)
    // has English-only prerender markup that an Arabic visitor must client-render over.
    if (prerendered && (ENABLE_AR_URLS || !wantsAr) && !narrow) {
      // First pass must equal the prerendered markup (desktop width, signed out): hydration.active makes useMobile()/user start from
      // those defaults; HydrationDone clears the flag after the first commit and the real values are applied in effects.
      hydration.active = true;
      setTimeout(() => { hydration.active = false; }, 8000);
      ReactDOM.hydrateRoot(container, <>{app}<HydrationDone /></>, {
        // A hydration mismatch is recoverable (React re-renders on the client). Keep it a console warning: the default handler
        // re-throws it on window, where ErrorBoundary's global listener would POST it to Supabase log_client_error on every page view.
        onRecoverableError: (err) => { try { console.warn('[hydration] recoverable error:', err && err.message); } catch (e) { /* ignore */ } },
      });
    }
    else ReactDOM.createRoot(container).render(app);   // React replaces any prerendered markup on the first commit
  };
  if (prerendered || wantsAr) ready.then(start, start); else start();
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
