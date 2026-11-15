# Hub screen capture (needs a checkout of the Hub repo; nothing here touches it permanently)

1. In the Hub checkout (`HUB=/path/to/closets-hub`, `node_modules` installed), copy this folder to `$HUB/.film/` and `cp $HUB/docs/yas-bloom-studio/harness/entry.jsx $HUB/.film/studio-entry.jsx` (then `sed -i "s#'../../../src#'../src#g"`), copy the IBM Plex Sans Arabic woff2 files (400/500/600/700) to `$HUB/.film/fonts/`.
2. `node .film/build.cjs .film/roadmap-entry.jsx .film/out-roadmap docs/lead-roadmap/harness/mockSupa.js` and the same for the studio entry (`.film/out-studio`, `docs/yas-bloom-studio/harness/mockSupa.js`).
3. `node .film/cap-roadmap.cjs <out>/roadmap` and `node .film/cap-studio.cjs <out>/studio` (Playwright, 2x scale, dark theme, real mouse; writes JPEG frame sequences and `track.json` cursor tracks). The roadmap entry is the Hub's harness entry with all sample names replaced by invented ones; use only such synthetic data.
4. Put the output as `<work>/assets/rm` and `<work>/assets/st` (plus fonts, `launcher.jpg`, the Bonsai / Closets logos, see `../film.html`) and run `../render.cjs`, `../encode.sh`.
