# YAS WOOD feasibility study page (VIP room)

Route: `/yas-bloom/study` and `/ar/yas-bloom/study` (linked from the VIP deck bar: "YAS WOOD feasibility study"). Code: `src/showroom3d/study/`.

## Confidentiality (read first)
* The repository is public and the VIP room has **no gate** (only `noindex`). So the real study is **never committed or shipped**. The owner imports the study file in their own browser.
* Nothing is uploaded. Text lives in `localStorage` (`sr3d.yasWoodStudy.v1`, original in `...base.v1`), images in IndexedDB (`sr3d.yasWoodStudy`). Other devices, visitors and Claude never see them; clearing site data removes them. Export writes a JSON bundle (study + images as data URLs) to move between devices.
* With nothing imported, only `sample.js` is shown: invented numbers, labelled **SAMPLE** (tag, banner, `data-sample="1"`).
* Route is noindex: `vercel.json` header on `/yas-bloom/:path*` and the robots meta set by `ShowroomRoot`; two rewrites serve the lean shell.
* To make the room itself private later, add Vercel password protection or an authenticated route; that is a separate decision.

## Import (`importer.js`)
HTML is parsed by `DOMParser` into an inert document; only text is read. Scripts, styles, handlers, iframes, forms, links and images are never copied. Chart numbers are read from `new Chart(document.getElementById('x'), {...})` by a literal-only tokenizer (strings and numbers; the script is never evaluated). Sections, headings, paragraphs, lists, tables and charts map to the model; everything then goes through `sanitizeStudy`. The preview lists what was mapped and what was **not** (script-held data such as SWOT lists or modal details, images). JSON bundles are accepted too; their images must pass a magic-number check.

## Edit
Titles, paragraphs, bullets, table cells, chart numbers, stat values; add / remove / move sections and blocks; section part (dashboard / full); Reset to original; Export. Image upload (JPEG, PNG, WebP, 3 MB, real-bytes check, downscaled to 1600 px, re-encoded so EXIF is dropped, 40 images max) says "Images are saved on this device only".

## Design notes
Brand tokens are `--yws-*` custom properties set from `study/palette.js` (the only file with hex literals); CSS and SVG read variables only. Charts are dependency-free SVG with a data table behind each one. 44 px targets, RTL through logical properties, mobile first (checked at 390 px; no horizontal overflow). Screenshots: `docs/showroom3d/study/*.jpg` (made by `scripts/showroom3d-study/shots.js` from a synthetic fixture).
