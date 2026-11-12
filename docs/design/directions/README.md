# Home page art directions (exploration, not for merge)

Preview: append `?direction=a|b|c` to any URL (kept for the tab session; `?direction=off` clears). Works with `?theme=` untouched and with EN/AR.
Default site is unchanged when no direction is set. Code: `src/design/direction.js`, `src/design/directions.css` (scoped palette, the only hex),
`src/home/direction-home.css` (layout/type), `src/home/art/*` (procedural SVG scenes + swatches), `src/home/DirectionHero.jsx`.

| Direction | Name | Screenshots |
|---|---|---|
| A | Noir & Champagne (dark cinematic, Cormorant) | a-d-en / a-m-en / a-d-ar (-hero.png viewport, -full.png page) |
| B | Washi & Oak (light gallery, Fraunces light) | b-d-en / b-m-en / b-d-ar |
| C | Forest & Brass (bold modern, Bricolage Grotesque) | c-d-en / c-m-en / c-d-ar |

`iterations/` holds v1 (first pass), v2, v3 heroes. Imagery is procedural illustration (not photography) and is not presented as delivered work.
Text/background pairs (computed): A 7.3-16.5, B 5.1-14.7, C 6.0-13.8 (all >= 4.5); axe wcag2a/aa/21aa: 0 violations on all 9 views
(axe cannot measure text over SVG art; hero text over art checked by eye).
