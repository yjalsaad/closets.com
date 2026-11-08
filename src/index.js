import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import reportWebVitals from './reportWebVitals';

const container = document.getElementById('root');

// [WEB-STUDIO 2026-10-31] /studio/* = the Neo Design Studio (the 8 Bonsai Neo designers for signed-in customers): its own lazy chunk,
// mounted instead of the marketing site so the designers get the full screen.
const isStudio = /^\/studio(\/|$)/i.test(window.location.pathname || '');
const StudioRoot = React.lazy(() => import('./studio/StudioRoot'));
// [ROOM-VIZ 2026-11-07] /visualizer/* = the Room Visualizer (Tilesview-style): its own lazy chunk and full-screen shell
const isViz = /^\/visualizer(\/|$)/i.test(window.location.pathname || '');
const VizRoot = React.lazy(() => import('./visualizer/VizRoot'));
// [IKHTARHA 2026-11-08] /campaign/ikhtarha = the «اختارها» choose-your-box reward campaign (lazy chunk; three.js loads only there)
const isIkhtarha = /^\/campaign\/ikhtarha(\/|$)/i.test(window.location.pathname || '');
const IkhtarhaRoot = React.lazy(() => import('./campaign/IkhtarhaRoot'));

// When the page was prerendered (the postbuild puppeteer crawl writes static
// markup into #root), hydrate it so the prerendered DOM is reused — no flash of
// empty content, and crawlers see real text. Otherwise (normal dev / a route
// that wasn't prerendered) mount fresh with createRoot.
if (isIkhtarha) {
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
} else if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    container,
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
