# Performance and build foundation report

Branch `claude/web-perf-foundation`, **a delta on top of `claude/web-integration` (PR #3)**, which already contains the SEO/i18n work (PR #1) and the
a11y/safety/privacy work (PR #2). The route split was re-applied by re-running the codemod on the integration branch's unsplit `App.js`. All numbers below are for the
COMBINED result (integration + this PR) against the integration branch itself; the original `origin/main` numbers from the first measurement are kept for reference.

## 1. Before / after

Method: same harness as the audit (Playwright Chromium, CDP network and CPU throttling, in-page PerformanceObservers, local HTTPS server with brotli and
`max-age=0, must-revalidate`, prerendered build of each branch). External hosts are stand-ins (170 KB JPEG per remote photo), so image weights are assumptions.
desktop-lh = 10 Mbps / 40 ms / 1x CPU; mobile = 390x844 DPR 2, Fast-3G 1.6 Mbps / 562 ms RTT, CPU 4x. Desktop: 2 runs per cell; mobile: 1 run per cell (the integration
build needs about 2 minutes per mobile run). Medians; lab numbers, not field data.

### Bundles (production build, gzip -9 / brotli)

| | origin/main | integration (#3) | integration + this PR |
|---|---|---|---|
| `main.js` raw | 2,061,569 B | 2,157,308 B | 593,511 B |
| `main.js` gzip | 483,681 B | 511,645 B | **171,255 B** (target <= ~180 KB) |
| `main.js` brotli | 364,903 B | 384,724 B | 140,880 B |
| model-viewer (global, every route) | +254 KB gz | +254 KB gz | 0 (only for a product with a 3D model) |
| three r128 from cdnjs (Wardrobe/planners) | +150 KB gz third party | same | 0 third party (same file, same origin, planner routes only) |
| Arabic dictionary | ~58 KB gz inside `main.js` | same | 0 in main; 32 KB gz `static/media/ar-dict.<hash>.txt`, Arabic only |
| three.js 0.160 in first load | 143 KB gz | same | 0 (route chunk ~132 KB gz, planner routes only) |
| `public/` | 69 MB | 69 MB | 8 MB |
| build output (no source maps) | about 75 MB | 80.6 MB | 17.4 MB |

### Runtime (integration -> integration + this PR)

| profile / route | metric | integration | combined |
|---|---|---|---|
| desktop `/` | FCP / LCP | 400 / 400 ms | 376 / 376 ms |
| desktop `/kitchen` | FCP / LCP | 236 / 1108 ms | 240 / 1092 ms |
| desktop `/wardrobes` | FCP / LCP | 256 / 1084 ms | 248 / 996 ms |
| desktop (3 routes) | TBT | 125-170 ms | 0-5 ms |
| desktop (3 routes) | JS transferred (br) | 665 KB | 155-162 KB |
| desktop (3 routes) | CLS | 0 | 0 |
| mobile `/` | FCP / LCP | 1748 / 1748 ms | 1568 / 1568 ms |
| mobile `/kitchen` | FCP / LCP | 1540 / 7132 ms | 1468 / 6444 ms |
| mobile `/wardrobes` | FCP / LCP | 1632 / 6660 ms | 1520 / 6260 ms |
| mobile `/`, `/kitchen`, `/wardrobes` | TBT | 2400 / 1840 / 1755 ms | 472 / 1074 / 1176 ms |
| mobile | JS transferred (br) | 665 KB | 155-162 KB |
| mobile | total transfer `/` | 14.3 MB | 8.1 MB |
| all | console errors at load | 1 (React #418) | 0 |

Reference, first measurement on `origin/main` (before PR #1/#2/#3): mobile TBT 1700 / 1110 / 1111 ms, JS 641 KB, main.js 483.7 KB gz.

How to read it:
- **TBT and JS bytes are the real wins** (first-load JS -77%; mobile TBT -35% to -80%).
- Mobile LCP on `/kitchen`, `/wardrobes` is bandwidth-bound by the large hero photos (6+ s on this profile with my stand-in sizes); the JS saving helps by about 0.4-0.7 s. Real hero
  sizes are unknown (CDNs are blocked here): treat LCP as a shape, not a number.
- CLS (standard, input-excluded): 0 for all routes on desktop and mobile. The `clsAll` column (includes shifts flagged as input) is 0.47-0.54 on integration and 0.10-0.74 combined and is dominated by
  the harness's scripted click phase (language toggle etc.); it is not a scroll regression (a throttled scroll-only run showed no shift above 0.005).
- Small cost of splitting: a route page now waits for its chunk before hydrating (the prerendered page stays visible; the prerender adds `<link rel=preload>` so the chunk fetches in parallel with `main.js`).

### Per-route first-load JS (transferred, brotli, measured)

| route | origin/main | combined |
|---|---|---|
| `/` | 641 KB | 155 KB |
| `/kitchen`, `/wardrobes` | 641 KB | 161-162 KB |
| planner routes (`/design-studio/*`) | 641 KB + three r128 from cdnjs on Wardrobe | main + planner chunk + shared three chunk (not measured at runtime, WebGL headless) |

## 2. What changed (one commit each)

1. **Route-level code splitting.** `src/App.js` (17,000 lines) is split into 49 route chunks in `src/pages/*.jsx`: every non-home page, every planner/wizard, the 4 `*3D.jsx` scenes and their
   data tables. The split is mechanical (an AST pass partitions top-level declarations by which routes reach them; shared helpers stay in `App.js` and are imported back, shared route
   data goes to `shared_*` chunks), so nothing was rewritten. `src/lazyPage.js` replaces `React.lazy` + `<Suspense>`: a Suspense boundary needs `<!--$-->` markers in
   the HTML, which the DOM-serialising prerender cannot produce, so it would break hydration. `lazyPage` renders the component synchronously once its chunk is loaded, a `minHeight:100vh`
   skeleton while it loads (no shift: the footer is pushed below the fold), and rethrows a failed chunk load into `PageBoundary`/`ErrorBoundary`. `index.js` awaits `preloadRoute()` before
   hydrating. `<main id=main>`, `SectionBoundary route:<page>`, `RouteAnnouncer`, `SkipLink` and `PageBoundary` all stay in `AppInner`, around the lazy pages, so the a11y route-change
   focus/announce, the landmark and the per-route error boundaries behave as before. Dead code that references moved code went to `src/pages/unused.jsx` (never imported).
2. **model-viewer** loads on demand (`src/modelViewerLoader.js`, only from the product AR block). **three r128**: not replaced by the bundled three 0.160. It is not visually
   identical (colour management and light units changed in r152-r155, ACES changed, `CapsuleGeometry` exists in 0.160 but not r128, so the human-scale figure changes). It is now self-hosted
   at `/vendor/three-r128.min.js` (same file, MIT), including for the studio Cabinets3D/Kitchen3D viewports that loaded it from cdnjs too. Porting the planner scenes to 0.160 belongs in the
   visual redesign pass.
3. **Fonts.** The render-blocking Google Fonts `<link>` and the duplicate `@import` are gone. `src/fonts.js` adds one `display=swap` stylesheet when the browser is idle after load, or
   immediately in Arabic. `preconnect` to `fonts.gstatic.com`. Font files are fetched by unicode-range only when text uses them, so an English visitor without a live campaign band no longer
   downloads them. Deviation from the brief: the campaign band/pill use these fonts for English visitors too when the campaign is live, so they are NOT limited to Arabic; limiting them would change the visuals.
4. **Images.** Hero slide 1 is `loading=eager fetchpriority=high`; slides 2-4 mount after the page has loaded and is idle, and the carousel advances only to a loaded slide. ShowroomTour images are
   lazy + async decode. The four planner `/layouts` card photos get real `width`/`height` (`src/layoutDims.js`). The campaign pill logo has a 7 KB lossless WebP with the PNG as fallback.
   No format conversion of the layout JPGs (about 3.4 MB; a visual-identity risk for a small gain).
5. **Deleted** `public/layouts/incoming/` (53.7 MB) and `public/layouts/Old images /` (8.8 MB) after grepping every path and file name in `src/`, `scripts/`, `public/*.html`, `vercel.json`, `package.json`.
6. **Arabic dictionary.** `I18N` entries are `{ en }` in `App.js`; `CMS_AR` is empty at load. Arabic lives in `src/i18n/ar-dict.txt` (UTF-8 JSON, 1766 + 139 keys) and is merged in place by `ensureArabic()`, so every
   lookup is unchanged. It is a `.txt` asset (hashed, `/static/media/`) fetched with `fetch`, **not** a dynamic `import()`: CRA's terser runs with `ascii_only`, so a JS chunk would
   still be `\uXXXX` escapes (~3x). English stays synchronous. `/ar/*` pages and the toggle load the dictionary before the UI flips.
7. **Hydration.** See section 3.
8. **`vercel.json` headers.** See section 4.

## 3. Hydration (React #418)

Causes fixed:
- prerender serialised the post-effect DOM: the cookie banner (`data-noprerender`, stripped), the injected brand-font link, hero slides 2-4 (client-only after idle) are removed;
- adjacent text nodes are separated with an empty comment (PR #1 had added this too; kept);
- `useMobile()` and the saved `user` now start from the prerender's defaults (desktop, signed out) while `hydration.active` is true (`src/hydration.js`) and apply the real values in an effect;
- PR #1's prerender aborted third-party images; a failed `<img>` makes `<Photo>` render a fallback `<div>` (mismatch). Images now get a 1x1 GIF;
- `hydrateRoot` has `onRecoverableError` -> `console.warn`, so a mismatch can never reach `ErrorBoundary`'s window `error` listener and POST to Supabase.

Verified (production build + prerender, 45 pages incl. `/ar/*`): hydration with no #418, no console error and no `log_client_error` request, on 21 EN routes at 1350 px, at 390 px, and with a saved user, plus
`/ar`, `/ar/kitchen`, `/ar/faq`, `/ar/about`.

**Mobile hydration decision (owner may flip):** hydration at 390 px is clean, but the prerender is a desktop-width layout, so hydrating keeps those nodes and then re-lays them out for mobile, which Chrome records
as a 0.7 layout shift (not counted in the harness only because it is flagged as input). So below 768 px `index.js` client-renders over the prerender (React replaces it; this is what happened before, minus the error).
`HYDRATE_NARROW = true` in `src/index.js` turns phone hydration on. The proper fix is a viewport-agnostic first pass or a mobile prerender.

## 4. `vercel.json`

Added `headers` (PR #1's `redirects`/`rewrites`/`trailingSlash` untouched):
- `/static/*` and `/vendor/*`: `public, max-age=31536000, immutable`; `/layouts/*`, `/brand/*`: 1 week + 1 day SWR; icons/manifest: 1 day; `/visualizer-embed.js`: 1 hour + SWR.
- All paths: `Strict-Transport-Security: max-age=31536000` (no includeSubDomains/preload: unknown subdomains), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()` (microphone: the studio voice assistants use SpeechRecognition).
- `X-Frame-Options: SAMEORIGIN` + `Content-Security-Policy-Report-Only` on source `/((?!visualizer/embed).*)`; `/visualizer/embed/:path*` gets the CSP without `frame-ancestors` and no X-Frame-Options (stays framable).
  The CSP allows `cdn.jsdelivr.net` + `www.gstatic.com` (model-viewer and its Draco/KTX decoders), `'wasm-unsafe-eval'`, Google Fonts, Supabase, `img-src https:`, `frame-src 'self' blob: about:`. There is no report endpoint, so violations show in the browser console only; add `report-uri` before relying on it.
- `X-Robots-Tag: noindex` for `/(studio|visualizer|campaign|ikhtarha)(/.*)?` (rule from PR #1's `docs/SEO-DECISIONS.md`).
- Missing static assets: PR #1's rewrites are an explicit list (no catch-all), so `/static/js/missing.js`, `/favicon.png`, ... match no rewrite and Vercel returns 404 (verified with the matching harness below).

## 4b. Fixes found while rebasing onto the integration branch

- `/privacy` and `/terms` rendered **Page not found** on the integration branch (`isKnownPage` did not know them and `vercel.json` had no rewrite for them). Added them to `src/seo/routes.js`
  (`index:false`, so not prerendered or in the sitemap; flip to `index:true` if the legal pages should be indexed) and four `/app-shell.html` rewrites.
- `FormNotice` linked to a plain `/privacy` on Arabic pages (`seo-check` failed); it now keeps the `/ar` prefix.
- `ConsentBanner` and the saved user start from the prerender's defaults while hydrating (`hydration.active`), the banner section carries `data-noprerender`.

## 5. Verified vs not verified

Verified here:
- `react-scripts build` compiles; `CI=true react-scripts test`: 8 suites, 100 tests pass (integration suites + `seo.test.js`); `seo-check` OK on 44 pages + 404; prerender 45/45.
- axe-core (all rules except colour contrast) on `/ /kitchen /wardrobes /booking /contact /faq /about /gallery /privacy`, EN and AR: 0 violations (region and label included). Colour-contrast counts are the known open item from the a11y hand-off, unchanged.
- Production build with faked Supabase, same results as the integration build: skip link focuses `<main>`, route change focuses the h1 and announces the title, consent banner shows once and persists, cart and auth dialogs trap focus and close on Esc, mobile menu opens/closes, `/privacy`, `/terms`, `/ar/kitchen`, `/ar/privacy` render (the first two were broken on integration), unknown EN and AR URLs show the noindex 404 page. The checkout failure path could not be driven end to end by my script (the Place Order click made no RPC, identically on the integration build); it is covered by `checkout.test.js`.
- 36 routes (public pages, `/ar`, planners with a signed-in user, `/category/*`, `/product-*`) render the same text as before the split (hash of visible text identical to origin/main per route), no page errors.
- Before/after screenshots of 6 routes (/, /kitchen, /wardrobes, /gallery, /faq, /about) at 1350 and 390 px: pixel difference below 0.1% (a few anti-aliased nav pixels). Page height of `/` differs by the footer sitemap added in PR #1.
- Arabic: stored `ar`, `/ar/...`, runtime toggle both ways, dictionary requested once and only for Arabic.
- `vercel.json` is valid JSON; header matching for 20 sample paths and non-matching of rewrites for missing assets, with a small Node harness. The harness uses path-to-regexp 3.3 plus a raw-regex path for `(?!...)` sources because
  Vercel uses a newer version: **real Vercel matching, header precedence and trailing-slash behaviour are not verified**; check the Preview deployment (`curl -I` for `/static/js/*.js`, `/visualizer/embed`, `/studio`, a missing `/static/js/x.js`).

Not verified:
- Real-network numbers (CDN images are stand-ins), field LCP/INP/CLS, real phones, Safari/Firefox.
- Planner and studio runtime with WebGL (chunks load; scenes not rendered headless); the planners were only checked for load without errors.
- `@sparticuz/chromium` prerender on Vercel (PR #1); I ran PR #1's script with the local Chromium (`PUPPETEER_EXECUTABLE_PATH`).
- model-viewer on a product with a `model_url` (no such data here); CSP report-only has not been exercised against the real third parties.
- Whether any CMS/DB row points at the deleted `/layouts/incoming/...` or `/layouts/Old images /...` files (the repo cannot see it).

## 6. Risks and decisions for the owner

- **Merge order / conflicts.** `src/App.js` was split, so any other branch that edits App.js page code will conflict. The split is reproducible: take the other branch's `App.js`, re-run the codemod (`scripts/codemod/`), and apply the small
  non-mechanical edits listed in section 2. This branch was already rebuilt that way on top of PR #1.
- Mobile: hydrate or client-render (section 3). Cookie-banner timing and `useMobile` first pass are the touch points.
- `HSTS includeSubDomains/preload`: not set; decide once all subdomains are known HTTPS.
- Switch the CSP from Report-Only to enforcing after a week of console/report data; add a reporting endpoint.
- Deleted images: confirm no DB references (query for `layouts/incoming` and `Old%20images`).
- Hero images: still large third-party PNGs of unknown size; moving them into `public/` as AVIF/WebP with `srcset` is the next real LCP win.
- First-time language toggle on a slow network now waits for a 32 KB dictionary (prefetched on pointer-enter).
