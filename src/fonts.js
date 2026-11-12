// Brand web fonts (Alexandria + IBM Plex Sans Arabic) — used by Arabic UI text and the Ikhtarha campaign band.
// They used to be pulled by a render-blocking <link> in public/index.html PLUS a duplicate @import inside the
// inline CSS template (App.js). Now: one non-blocking stylesheet, added after the page has loaded (idle), or
// immediately when the UI language is Arabic. The stylesheet is only ~3 KB; the font FILES (Google splits them
// by unicode-range) are only downloaded when text on the page actually uses them, so English visitors without a
// live campaign band download none. font-display: swap comes from the `display=swap` URL parameter.
const BRAND_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Alexandria:wght@500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';

export function ensureBrandFonts() {
  if (typeof document === 'undefined') return;
  try {
    if (document.getElementById('brand-fonts')) return;
    const l = document.createElement('link');
    l.id = 'brand-fonts';
    l.rel = 'stylesheet';
    l.href = BRAND_FONTS_HREF;
    document.head.appendChild(l);
  } catch (e) { /* fonts are progressive enhancement; the system stack still renders */ }
}

// Called once from src/index.js for every app shell: loads the stylesheet when the browser is idle after `load`.
export function scheduleBrandFonts() {
  if (typeof window === 'undefined') return;
  const run = () => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    idle(ensureBrandFonts);
  };
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run, { once: true });
}
