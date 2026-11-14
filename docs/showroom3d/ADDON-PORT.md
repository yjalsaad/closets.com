# YAS Bloom add-on port (ADD-ONLY onto production main)

Owner decision: production main receives ONLY the YAS Bloom 3D showroom; everything that exists on main (including the glass look) stays byte-for-byte unchanged.
Branch: `claude/yas-bloom-addon` (from `origin/main` 07589ed). Source: `origin/claude/web-showroom-3d`.

## Re-run (repeatable)
```
scripts/port-yas-bloom.sh [<ref>]      # default origin/claude/web-showroom-3d
```
It runs `git checkout <ref> -- src/showroom3d docs/showroom3d scripts/showroom3d-qa` and then `node scripts/port-yas-bloom.js`, which (idempotently)
rewrites imports of integration-only modules to `src/showroom3d/vendor/*`, adds the scoped token import to `ShowroomRoot.jsx`, and re-points / skips the few copied unit tests that assert integration-branch facts.
Files that are NOT on the source ref and therefore survive a re-run: `src/showroom3d/vendor/*`, `src/showroom3d/__tests__/addon.test.js`, this file, `scripts/port-yas-bloom.*`.

## Modified existing files (all tiny)
| file | change |
|---|---|
| `src/index.js` | +1 import (`SHOWROOM_PATH_RE` from `./showroom3d/route`), +3 lines (`isShowroom`, lazy `ShowroomRoot`), one new `if (isShowroom) {...}` branch before the existing chain (`if (isGames)` became `else if (isGames)`). Same pattern as the Visualizer / Studio shells. |
| `vercel.json` | +3 lines: a `headers` entry, `X-Robots-Tag: noindex` for `/yas-bloom*` and `/ar/yas-bloom*`. No rewrite is needed: the existing catch-all `/(.*) -> /index.html` already serves both paths. `buildCommand` (CI=false) untouched. |
| `package.json`, `package-lock.json` | `gsap` 3.13.0 pinned (exact), +8 lines total; no other version changes. `three` on main is 0.160.0, identical to the showroom branch. |

## Vendored dependencies (`src/showroom3d/vendor/`)
| showroom imports (integration only) | vendored as | notes |
|---|---|---|
| `a11y/motion` | `motion.js` | verbatim copy (`useReducedMotion`) |
| `safety/webgl` | `webgl.js` | verbatim copy |
| `safety/WebGLGate` | `WebGLGate.jsx` | verbatim copy |
| `safety/SectionBoundary` (used by WebGLGate) | `SectionBoundary.jsx` | reduced: no server error reporter (main's `errors.js` has no `reportError`), logs to console |
| `safety/sanitize` | `sanitize.js` | verbatim copy |
| `content/facts` | `facts.js` | verbatim copy (phone, hours, warranty; contested facts stay null) |
| `seo/siteConfig` | `siteConfig.js` | reduced to `ENABLE_AR_URLS`, `BUSINESS` |
| `seo/routes` (`withLang`, `splitLangPath`) | `routes.js` | ADAPTED: main has no `/ar/<page>` URLs, so `/ar` is prefixed only for the showroom itself; links to `/booking`, `/projects`, `/kitchen`... are never prefixed |
| `App` (`api`) | `siteApi.js` | one read-only GET using main's existing `studio/hub/supaConfig` (same public URL/anon key main already ships); main's `App.js` does not export `api` |
| `design/tokens.css` (`--space-*`, `--fs-*`, `--radius-*`, `--font-*`, ...) | `tokens.css` | declared on `.sr3d` ONLY (never global) |

Existing main file the showroom does import: `src/studio/hub/supaConfig.js` (exists on main).

## Excluded, and why
- Shell/nav/footer/menu link to YAS Bloom, i18n dictionaries, `ar-dict.txt`: showroom strings live in `src/showroom3d/strings.js`.
- BookingPage prefill (`parseBookingPrefill`): existing-page change. Showroom quote links open `/booking?interest=...&source=...&notes=...`; main's booking page ignores unknown query params.
- `App.js`, existing CSS, SEO scripts, `robots.txt`, `sitemap.xml`, existing tests.
- Legacy `/showroom-3d` redirects: main never had that path.
- Self-hosted Inter / Fraunces / Noto Naskh fonts (new npm deps on the integration branch): English falls back to system serif/sans; Arabic uses IBM Plex Sans Arabic, which main already loads from Google Fonts. Owner decision if the exact brand fonts are wanted.

## Tests re-pointed / skipped by the port script
`/ar/<page>` expectations become `/<page>`; reads of `pages/BookingPage.jsx` / `DoorsPage.jsx` read `App.js`; `content/facts.js` reads the vendored copy.
Skipped (integration-only coupling): booking prefill reader; business lines vs `seo/routes` PAGES; App.js `sanitizeProjects` source check; vercel rewrite/redirect test (replaced by `addon.test.js`); robots / seo-check / shell link test.

## Owner decisions
1. `robots.txt` `Disallow: /yas-bloom` was not added (the generator/file would be edited); the page carries `<meta robots noindex>` and the header above.
2. Shell link to the showroom (nav/footer) is not added; the page is reachable by URL only.
3. Brand fonts (above). 4. Booking prefill (above).

## Evidence (built app, local)
- `git diff --stat origin/main`: modified existing files = `src/index.js`, `vercel.json`, `package.json`, `package-lock.json` only. Added: `src/showroom3d/**`, `docs/showroom3d/**`, `scripts/showroom3d-qa/**`, `scripts/port-yas-bloom.{sh,js}`, `scripts/yas-bloom-regression.js`.
- Jest, whole suite: 27 suites, 257 passed, 5 skipped (the skipped ones are listed above), 0 failed.
- `CI=true react-scripts build` FAILS on origin/main itself (12 "Conflicting order" CSS warnings, all in `src/studio/hub/*` CSS). Identical 12 on this branch, none from the showroom. `vercel.json` builds with `CI=false` ("Compiled with warnings"), which succeeds on both. The showroom is its own chunk (`showroom3d.*.chunk.js` 107 kB + css 5 kB); gsap/three load only on /yas-bloom.
- Prerender (`PUPPETEER_EXECUTABLE_PATH=... node scripts/prerender.js`): 21/21 routes on both main and this branch (main's own script; no seo-build/seo-check on main).
- Showroom QA on the built app (SwiftShader): `phase5vip.js` flows 24/24, ar 8/8, mobile 8/8; `/yas-bloom` and `/ar/yas-bloom` at 1440 and 390 load, enter explore, walk, no page errors; `<html lang/dir>` and `noindex` correct (`docs/showroom3d/addon-qa/yasbloom-*.jpg`).
- Existing-page regression (`scripts/yas-bloom-regression.js`): home, kitchen, TV, office, wardrobe, door, booking x EN/AR x 1440/390, full-page, reduced motion, external requests blocked. 28 pairs main-vs-branch: 20 byte-identical; the other 8 differ by 4 to 77 pixels, or 13-17k pixels on two mobile pages, and in every case the SAME build also differs from itself between runs (animated carousels / spot pings), and re-sampling 4x makes branch match a main sample for the pages retested. The glass look is intact (`html.glassy`, `glass-back`, `showcase-*` present on kitchen/TV/office/wardrobe/door in both). Results: `docs/showroom3d/addon-qa/regression.json`; branch screenshots `docs/showroom3d/addon-qa/{en,ar}-{d,m}-*.jpg`.
