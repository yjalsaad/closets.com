import { createElement, useEffect, useState } from 'react';

// Route-level lazy loading WITHOUT <Suspense>.
//
// Why not React.lazy + <Suspense>: the prerendered HTML (scripts/prerender.js) is a serialisation of the
// client-rendered DOM, which has no `<!--$-->` Suspense markers, so a <Suspense> boundary in the tree would
// fail hydration (React #418). This helper renders the real component synchronously once its chunk is
// loaded (index.js preloads the current route's chunk before hydrateRoot) and a fixed-height skeleton
// while it loads on client-side navigation, so there is no layout shift either way.
//
// A failed chunk load (offline / stale deploy) is re-thrown into the render phase so the nearest
// error boundary (PageBoundary / ErrorBoundary) handles it exactly like a render error; the next mount retries.
export default function lazyPage(loader, { fallback } = {}) {
  let mod = null;
  let promise = null;
  const load = () => {
    if (!promise) {
      promise = loader().then(
        (m) => { mod = m; return m; },
        (e) => { promise = null; throw e; }
      );
    }
    return promise;
  };
  function LazyPage(props) {
    const [, setTick] = useState(0);
    useEffect(() => {
      if (mod) return undefined;
      let alive = true;
      load().then(
        () => { if (alive) setTick((n) => n + 1); },
        (e) => { if (alive) setTick(() => { throw e; }); }
      );
      return () => { alive = false; };
    }, []);
    if (mod) return createElement(mod, props);
    return fallback !== undefined ? fallback : createElement('div', { className: 'route-skeleton', 'aria-busy': 'true', style: { minHeight: '100vh' } });
  }
  LazyPage.preload = load;
  return LazyPage;
}
