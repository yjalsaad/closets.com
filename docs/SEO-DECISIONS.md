# SEO / head / i18n: what changed and what the owner must decide

Branch `claude/web-seo-i18n`. Audit brief: `website-audit/seo-a11y-i18n.md`. Date: 2026-11-12.

## 1. Owner decisions needed (ordered by impact)

| # | Decision | Default shipped | How to change |
|---|---|---|---|
| 1 | **Production domain** (apex vs www; the brand domain looks like `the-closets.com`) | `https://closets-website.vercel.app` | Set Vercel env `REACT_APP_SITE_URL=https://www.the-closets.com` (no trailing slash) and redeploy. Canonical, og:url, og:image, JSON-LD, sitemap and robots all read it (`src/seo/siteConfig.js`). Then attach the domain in Vercel and add a 301 from `*.vercel.app` (see 1b). |
| 1b | Redirect the `*.vercel.app` alias to the production domain | not done (domain unknown) | Vercel > Domains > redirect, or a `redirects` entry with `"has": [{"type":"host","value":"closets-website.vercel.app"}]`. Do this AFTER step 1 or the site redirects to a host that does not serve it. |
| 2 | **Index Arabic?** (`/ar/...` URLs) | ON | `REACT_APP_ENABLE_AR_URLS=0` (build env) turns it off: one URL per page again, localStorage toggle as before, no hreflang, no `/ar` in sitemap. Constant: `ENABLE_AR_URLS` in `src/seo/siteConfig.js`. Tradeoffs in section 4. |
| 3 | **noindex rules** | Design Studio planners (`/design-studio/*`), `/signin`, `/cart`, `/checkout`, `/directory`, `/ai-designer`, product pages `product-<id>` and `category/<x>` are `noindex, follow`, excluded from sitemap, Disallowed in robots.txt where static | Edit `index:false/true` per page in `src/seo/routes.js`. Note `/design-studio` is login-gated (logged-out visitors get the sign-in gate), hence noindex. **Product detail pages are CMS-driven and not indexable yet**: they need a sitemap generated from the `website_products` table (needs a build-time Supabase read; not done, no DB access in this task). |
| 4 | **Arabic brand name** (ذا كلوزتس vs الخزائن) | "ذا كلوزتس" (already in titles) | `BRAND` in `src/seo/routes.js` and route titles. See `docs/AR-COPY-REVIEW.md`. |
| 5 | **Share image per category** | one `/og-image.jpg` for every route | add images to `public/` and an `ogImage` field per route (small change in `buildHead`). |
| 6 | **Production prerender method** (section 5) | `@sparticuz/chromium` inside the Vercel build, fail-loud | Fallback documented below if it does not run on Vercel. |

### Facts used in JSON-LD (all already in the site source) and facts still MISSING

Used: name "The Closets Co." / "ذا كلوزتس", legal name "The Closets International W.L.L." (invoice template), phone `+973 17555095`,
email `info@the-closets.com`, address `Building 2249, Road 90, Block 1014, P.O. Box 31613, Hamala, BH` (invoice template, i.e. the
registered address), hours Sat-Thu 09:00-20:00 (contact page), Instagram `https://www.instagram.com/theclosets/` (footer), logo `/logo512.png`.

TODO (not in the source, NOT invented; the JSON-LD omits them):
- [ ] **geo coordinates** (latitude/longitude) of the business/showrooms.
- [ ] **Per-showroom street addresses** for Manama, Riffa, Saar, Isa Town (the site only lists the names). Best practice is one `LocalBusiness` node per showroom.
- [ ] Confirm the Hamala address is a *public* address (it comes from an invoice header). If not, remove `address` from `BUSINESS` in `src/seo/siteConfig.js`.
- [ ] Confirm opening hours are the same for every showroom.
- [ ] Facebook / TikTok / YouTube / LinkedIn / Google Business Profile URLs for `sameAs` (only Instagram exists).
- [ ] Price range (`priceRange` was `"$$$"` in the old JSON-LD; removed, no source).
- [ ] Real customer reviews with a verifiable source before any `aggregateRating`/`review` (the test suite fails the build if one appears).
- [ ] Analytics: `GA_MEASUREMENT_ID` is still the placeholder `G-XXXXXXXXXX` (audit P2-14), out of scope here.

## 2. What was implemented

| Area | Files |
|---|---|
| One origin + switches | `src/seo/siteConfig.js` (`SITE_URL`, `ENABLE_AR_URLS`, `BUSINESS`) |
| Route registry: bilingual authored title/description, breadcrumbs, JSON-LD, noindex flags, footer-sitemap grouping, legacy redirects | `src/seo/routes.js` (replaces `ROUTE_META` in App.js; slug-generated fallback titles removed) |
| Head manager (no new dependency): title, description, robots, canonical, hreflang, og:* incl. locale, twitter:*, JSON-LD, `<html lang dir>` | `src/seo/head.js`, called once from `AppInner` via `useRouteHead` |
| Soft-404 -> NotFound page (h1, noindex, link set), real 404 status via `vercel.json` | `src/seo/NotFound.jsx`, `vercel.json` |
| `/ar/...` routes, language toggle navigates to sibling URL, stored-Arabic visitors redirected once, `<Link>` keeps the prefix | `src/seo/lang.js` (`LangLink` shadows react-router `Link` in App.js), `AppInner` |
| sitemap.xml (EN+AR, `xhtml:link` alternates, `lastmod`), robots.txt, `__SITE_URL__` substitution, 404.html | `scripts/seo-build.js` (public/robots.txt and public/sitemap.xml deleted; generated at build) |
| Prerender that fails loudly | `scripts/prerender.js` |
| Crawl/validation of prerendered output | `scripts/seo-check.js` (`npm run seo:check`), `src/seo/seo.test.js` |
| Internal links | top-nav items with a destination are real `<a href>` (`NavTop`), home category/room/service tiles and chips are `<Link>`, footer has a crawlable grouped sitemap (`src/seo/FooterSitemap.jsx`) |
| i18n | raw `meetTeam` key, hard-coded English dock and cart strings, kitchen style/layout names and lead times on `/kitchen`, one `formatBHD/formatDate` helper (`src/i18n/format.js`) used by every price and date in `App.js` |

`App.js` edits are localized: imports, `AppInner` router/lang block, `NavTop`, tile tags, dock labels, formatter call sites, i18n keys, `ROUTE_META` removal.

### Legacy / duplicate paths -> 301 (vercel.json `redirects`, EN and `/ar` variants)
`/home /kitchens /wardrobe /tv-units /door /guide /ai /ai-yas /products /design-lab /planner /*-planner /design-builder /portal`
(single table: `LEGACY_REDIRECTS` in `src/seo/routes.js`; the client router also redirects, covering dev and non-Vercel hosts).

### Real 404 status mechanism
`vercel.json` no longer has the `/(.*) -> /index.html` catch-all (which made every URL return 200). Instead:
1. the prerender writes real files for every indexable page (`/kitchen/index.html`, `/ar/kitchen/index.html`, ...), which Vercel serves first;
2. SPA-only routes (product pages, categories, cart, signin, checkout, planners, studio, visualizer, campaign) are explicitly rewritten to `/app-shell.html` (the pristine SPA shell the prerender keeps, because it overwrites `index.html` with the prerendered home page);
3. everything else falls through to Vercel's 404, served from `404.html` (the prerendered NotFound page, noindex) **with HTTP 404**.
Safety net: if a valid SPA route is missed in the table it gets HTTP 404 from Vercel but the page still renders for people (the app boots from `404.html`, `src/index.js` refuses to reuse the static markup when the path differs, and the router shows the right page). Bots would see a 404 for that URL, so `scripts/seo-check.js` asserts the routing table covers every known route.
**Merge note for the performance agent:** my change to `vercel.json` is `trailingSlash`, `redirects` and the whole `rewrites` array (one object per line). Their `headers` block should merge cleanly. If it does not, keep both and re-run `npm run seo:check`.

## 3. i18n

- URL language: `/ar/...` is the Arabic site. `lang` is derived from the URL (single source), `<html lang dir>` set in the prerendered HTML.
- Language toggle: same button, now navigates to the sibling URL and stores `closets_lang`. Returning visitors with `closets_lang=ar` who open an English URL are redirected once to `/ar/...` after load (crawlers never are). Deep links keep working: `/kitchen` and `/ar/kitchen` are both real pages.
- Formatting: BHD has 3 decimals. EN `BD 1,234.500`, AR `1,234.500 د.ب`, Latin digits in both languages (matches phone numbers and invoices; flip `ARABIC_INDIC_DIGITS` in `src/i18n/format.js` for Arabic-Indic digits). Approximate marketing ranges use `{whole:true}` (`BD 4,500 – 9,000`). Dates: Gregorian, `en-GB` / `ar-BH`, Latin digits. Printed quotes/invoices stay English.
- `t()` still returns the key when a key is missing; a repo-wide scan found no other missing keys (only `meetTeam` was missing).
- Remaining English inside Arabic pages: ~300 distinct strings in material/feature tables, see `docs/AR-COPY-REVIEW.md` (need authored Arabic, not machine translation). The budget `<select>` values on the booking form ("BD 200-500") are posted values and were left unchanged.

## 4. Arabic URLs: tradeoffs
Pros: Arabic pages are indexable with their own titles/descriptions, hreflang pairs, WhatsApp/social previews in Arabic, correct `lang/dir` without JS.
Cons: doubles the prerendered pages (44 + 404; build time about 30 s locally), doubles sitemap, needs ongoing Arabic copy QA (`docs/AR-COPY-REVIEW.md`), CMS rows that are English-only show English text on `/ar` pages (Hub editor fix), and `og:locale` for Arabic is `ar_AR` (Facebook has no `ar_BH`). Off switch: `REACT_APP_ENABLE_AR_URLS=0`.

## 5. Prerendering on Vercel

`scripts/prerender.js` launches, in order: `PUPPETEER_EXECUTABLE_PATH`/`CHROME_PATH` (+`puppeteer-core`), then **`@sparticuz/chromium`** (+`puppeteer-core`), then full `puppeteer` if present.
- `puppeteer` was removed from devDependencies: its postinstall (Chromium download) is blocked on Vercel (`npm warn install-scripts`), which is why prod never prerendered. `@sparticuz/chromium@153.0.0` ships the browser inside the npm tarball (`bin/chromium.br`, ~70 MB unpacked), has **no install script**, so `npm install --ignore-scripts` works (the lockfile was regenerated with `--ignore-scripts`). Pairs with `puppeteer-core@25.17.0`.
- **Fail loudly**: `PRERENDER_REQUIRED=1` or the `VERCEL` env var => non-zero exit if no browser launches, or any page lacks the expected `<title>`, canonical, `<html lang>`, JSON-LD, robots meta or exactly one `<h1>`. `PRERENDER_REQUIRED=0` forces soft mode (emergency switch). With neither set (local dev) it stays soft and exits 0.
- Network inside the prerender is intercepted: CMS/API calls get `[]`, fonts/images are aborted, so output is deterministic and the build never depends on Supabase. `PRERENDER_ALLOW_NETWORK=1` bakes live CMS content (blog, FAQ, products) into the HTML instead (hydration then re-renders).
- Build time budget: 45 pages, concurrency 2 (`PRERENDER_CONCURRENCY`). The postbuild now runs `seo-build.js` then `prerender.js`.

### NOT VERIFIED: it has not been run on Vercel
It was verified in this sandbox with system Chrome, Playwright's Chromium and the `@sparticuz/chromium` binary (Linux, glibc). Vercel's build image (Amazon Linux 2023, memory/`/tmp` limits, Node version vs the package's `node ^22.17` engine) could not be exercised from here. **First action after the PR deploys: read the Vercel build log for `[prerender] browser: @sparticuz/chromium` and `done: 45/45`.** Because of the fail-loud rule a broken browser fails the deployment instead of silently shipping an empty shell; if that happens use one of:

**Fallback A (recommended if sparticuz fails): GitHub Action builds, prerenders and deploys prebuilt output**
```yaml
# .github/workflows/deploy.yml  (needs repo secrets VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID; and disable Vercel's own Git deploy)
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci --ignore-scripts
      - run: npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}   # runs the project build (postbuild prerender) with PRERENDER_REQUIRED=1 and Chrome from the runner
        env: { PRERENDER_REQUIRED: '1', PUPPETEER_EXECUTABLE_PATH: /usr/bin/google-chrome }
      - run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```
**Fallback B: edge/middleware head injection** (no browser): a Vercel Edge Middleware that rewrites `<head>` of the SPA shell from `buildHead()` output by pathname. Fixes titles, canonical, hreflang, og, JSON-LD and social previews; body stays empty for non-JS crawlers. Hours of work; keep the 404 and redirect tables from section 2.

## 6. Known issues / not done
- **React hydration error #418 on every prerendered route** (reproduced in dev: the first reported mismatch is inside `Nav`/dock; not isolated). The old prerender never shipped so `hydrateRoot` was never exercised in production. Mitigation shipped: `src/index.js` mounts with `createRoot` over the static markup (React replaces it on first commit, no console error, same visual result). Crawlers still get the full static HTML. Follow-up: fix the mismatch then switch back to `hydrateRoot`.
- Mixed-case URLs (`/Kitchen`) and `/ar/` trailing slash rely on Vercel's `trailingSlash:false` behaviour (not verified on Vercel).
- Vercel behaviours not verifiable here: the `redirects`/`rewrites` precedence, `trailingSlash:false` with `dir/index.html`, 404.html status. Locally these were checked against an emulator (`/tmp` script, same rules) only.
- Product/category pages: noindex until a CMS-driven sitemap exists. `/design-studio` family noindex by design.
- Studio/visualizer/campaign shells keep the generic `index.html` head (no canonical) and are Disallowed in robots.txt; add an `X-Robots-Tag: noindex` header for them in `vercel.json` `headers` (left to the perf agent's headers block to avoid a conflict): `{ "source": "/(studio|visualizer|campaign|ikhtarha)(.*)", "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }] }`.
- Other agents' work: a11y (`<main>`, skip link, forms) and perf (code-splitting, headers) are untouched; `NotFound` deliberately uses a `div`, not `<main>`.
- If `package.json`/`package-lock.json` conflict on merge: keep both sides' dependency changes and run `npm install --package-lock-only --ignore-scripts`.

## 7. Verification table (2026-11-12, this sandbox)

| Check | Result |
|---|---|
| `react-scripts build` (CI=false) compiles | **verified** |
| Repo tests (`react-scripts test`): App smoke + 13 new seo/format tests | **verified**, 14/14 pass |
| Prerender locally, system Chrome (PUPPETEER_EXECUTABLE_PATH) | **verified**: 45/45 pages (22 routes x EN+AR + 404), 0 problems |
| Prerender with `@sparticuz/chromium` (no explicit exe path) | **verified in this sandbox**, 2 routes + 404 (not Vercel) |
| Prerender fail-loud (`PRERENDER_REQUIRED=1`, `VERCEL=1`) exits 1 without a browser; soft locally exits 0; `PRERENDER_REQUIRED=0` overrides | **verified** (module-less sandbox copy) |
| Prerender on Vercel | **NOT verified** |
| `npm install --ignore-scripts` of the new deps | **verified** (lockfile regenerated with `--ignore-scripts`; the shared node_modules were not modified; sparticuz installed to a temp dir for testing) |
| `scripts/seo-check.js` on prerendered output: per-page title/description (unique, length), canonical, hreflang triplet, og/twitter, robots, exactly one h1, >=15 internal links, `<html lang dir>`, JSON-LD parse + @id integrity + no ratings, no foreign origin, no raw i18n key, AR pages link only inside /ar | **verified**, 44 pages OK |
| sitemap.xml (44 URLs, 132 xhtml:link, no noindex page) and robots.txt (Sitemap line, disallows) | **verified** (by seo-check) |
| JSON-LD validity | parses and cross-references; **not** run through Google's Rich Results test (no network) |
| Browser e2e (Playwright, network stubbed, Vercel-like emulator): hydrate/mount without console errors on `/ar/kitchen`, `/`; EN<->AR toggle URL+lang+title; client nav keeps `/ar`; stored-`ar` redirect; `/does-not-exist` and `/ar/does-not-exist` -> 404 status + noindex + h1; `/kitchens` -> `/kitchen`; `/product-abc` served from the shell with noindex | **verified** |
| Home nav and tiles are real `<a>` (checked `nav a[href="/kitchen"]` etc.; 68 internal anchors on `/`) | **verified** |
| Mobile dock Arabic labels, footer `meetTeam` | **verified** (dock labels read from DOM; raw key absent from all 22 AR pages) |
| vercel.json redirects/rewrites/404 semantics on real Vercel | **NOT verified** (emulated) |
| Google Search Console / Rich Results / real indexing, social-card scrapers | **NOT verified** |
| Arabic copy quality, RTL visual pass of all pages | **NOT verified** (spot screenshots of `/ar` and `/ar/kitchen` only) |
| hydrateRoot hydration of prerendered markup | **NOT working** (see known issues; createRoot used) |
