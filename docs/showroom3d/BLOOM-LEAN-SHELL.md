# YAS Bloom lean shell, cache headers and the smaller Ikhtarha logo

Owner-approved (2026-11-15, VIP meeting 2026-11-16 on an iPad over venue Wi-Fi). Rule kept: nothing outside the showroom changes behaviour.

## What and why
* `/yas-bloom`, `/yas-bloom/`, `/ar/yas-bloom`, `/ar/yas-bloom/` (any query string) are rewritten to `public/yas-bloom/shell.html` instead of the home page's prerendered `index.html` (which makes the browser fetch four home hero PNGs, 8.2 MB, before any showroom code runs). Rewrites sit **before** the unchanged `/(.*)` catch-all; files on disk still win over rewrites.
* The shell is about 2 KB: charset, viewport (`viewport-fit=cover`), `noindex`, the theme-colour / icons / manifest of the home head, the same Google Fonts (loaded without blocking the first paint), a cream loading card (the showroom's own loading backdrop: veil `#f6efe4`, brown, orange), `<div id="root">`.
* Entry tags: `scripts/bloom-shell.js` (second `postbuild` step, after `prerender.js`) replaces a marked block with the real hashed `<link rel=stylesheet>` + `<script defer>` of CRA's entrypoints and adds `<link rel=preload>` for the showroom lazy chunks that `main.js` loads together (`Promise.all([n.e(dep), n.e(showroom)])`), so they download in parallel with `main.js` instead of after it runs. **Fail soft**: if anything is missing the marked block stays, and its inline script reads `/asset-manifest.json` (`cache: 'no-cache'`) at run time and appends the entrypoints in order. The shell is served `max-age=0, must-revalidate`; hashed files are immutable, so a stale cache cannot pair an old shell with new files.
* Language and `lang`/`dir` stay the app's job (`splitLangPath` on the path, `ShowroomRoot` sets `<html lang dir>` and the title); the shell only localises its loading text from `/ar/` and the failure message (script `onerror`: "could not be loaded", Reload button).
* The shell does not load `model-viewer` (home-only) or the home JSON-LD; the showroom never used them.
* Headers: `/static/(.*)` immutable one year (every file in `/static` is content-hashed by CRA: js, css, media, LICENSE.txt); `/yas-bloom/(realism|staff|collections|design-studio|profile)/(.*)` 1 h + 24 h stale-while-revalidate. Not films.json / film.json / mp4s / the shell. The six noindex rules are untouched and still add `X-Robots-Tag` on those paths (different header key, so the rules merge).
* Additive re-encode: `public/brand/ikhtarha/logo-light-1040.webp` (48 KB, 1040 px wide, drawn at 520 px) replaces the 282 KB PNG in the showroom; the PNG stays (the campaign pages use it). The preload manifest was regenerated. Skipped: `journey-poster.jpg` (already near its optimum: q76 gives 134 KB, q60 would be visible), parquet/planks (25-38 KB saving, loader change), the duplicate logo requests (loader change, not worth the risk the night before).

## QA tools
`scripts/showroom3d-qa/vercel-emu.js` (static emulation of vercel.json), `serve-prod.js` with `HEADERS=vercel [VERCEL_JSON=file]`, `routing-matrix.js <before build> <before json> <after build> <after json> [control build]`, `lean-summary.js <label>` (summarises `waterfall.js` runs; raw data `docs/showroom3d/bloom-preload/lean-*.json`).

## Rollback
Revert the PR's merge commit (Vercel redeploys), or in the Vercel dashboard promote the previous production deployment ("Instant Rollback"). Soft switches that need no deploy: none; the shell only exists for the four URLs.
