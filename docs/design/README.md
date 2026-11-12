# The Closets: premium redesign, design system overview

Direction (from the art-director audit): **Editorial Atelier** as the base, the restrained serif rhythm of **Curatorial Gallery**, **one** dark espresso "showroom" band, the finish picker stays inside the Studio. Rejected: kinetic type, dark-everywhere. No invented numbers, awards, reviews, projects or prices anywhere.

## Switching the palette (owner decision pending)

Two complete themes share every token name and the same layout.

| How | What |
|---|---|
| Build default | `REACT_APP_THEME=warm` (default, set in `.env`) or `sea`. In Vercel: project env var `REACT_APP_THEME`. |
| Preview any page | append `?theme=sea` or `?theme=warm` to any URL (kept for the tab session; `?theme=default` clears it) |
| Where | `src/design/theme.js` sets `<html data-theme>`; `public/index.html` writes the build default; `meta[name=theme-color]` follows |

Open the same URL twice, e.g. `/?theme=warm` and `/?theme=sea`, to compare side by side. **warm** = cream `#f5f1ea`, ink `#1f1913`, clay `#a14525`, walnut, brass, espresso band. **sea** = the previously deployed sea-mist `#f1f5f4`, pine band `#12302b`, coral `#a64e26`, with the same type and spacing.

## Files

| File | Role |
|---|---|
| `src/design/tokens.css` | fonts (@font-face), type scale, spacing 4/8, radius, shadow, motion, container, z-index, **both themes**, legacy aliases (`--ink --cream --clay --sand --line --brass …` still resolve, so old inline styles re-theme) |
| `src/design/base.css` | document defaults, headings, buttons, links, focus ring, forms, cards, chips, tables, skeleton, icons, page header, empty state, imagery (`.img-frame`, `.ar-*`, `.ph`), motion + reduced motion |
| `src/design/shell.css` | header, mega menu, mobile drawer, phone action bar, consent strip, chat bubble, footer |
| `src/design/home.css` | home sections |
| `src/design/Icon.jsx` | the one icon set (24px grid, 1.5 stroke, inline SVG, `aria-hidden`) |
| `src/design/PageHeader.jsx` | `PageHeader`, `Breadcrumb`, `EmptyState` |
| `src/design/strings.js` | new/changed chrome strings, English + authored Arabic |
| `src/content/facts.js` | **single source of business facts**; contested ones are `null` (hidden) |
| `scripts/design-qa/` | `shoot.js` (screenshots + axe), `states.js` (menus/dialogs/consent), `vitals.js` (FCP/LCP/CLS), `tokenize.py` (the style codemod) |

## Tokens in one screen

- **Type** `--fs-2xs…4xl` (fluid on the large steps), `--font-display` Fraunces (weight 400-500; headings are forced to `--fw-display-strong`), `--font-body` Inter; Arabic: `--font-ar-display` Noto Naskh Arabic 600, `--font-ar` IBM Plex Sans Arabic. Eyebrow: 12px/600/.2em uppercase (EN); 14px, no tracking, no uppercase (AR).
- **Space** `--space-1…10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 140; `--section-y`, `--gutter`, `--container` 1280, `--nav-h`, `--page-top`.
- **Radius** `--radius-xs/sm/md/lg/xl/pill` = 2/4/6/8/12/999. Buttons and fields 2px, cards 12px. The old inline numeric radii were mapped onto this scale by `scripts/design-qa/tokenize.py`.
- **Elevation** `--shadow-1/2/3` use the theme's shadow colour; hairlines do most of the work.
- **Motion** `--dur-fast/base/slow/reveal`, `--ease-out/in-out/standard`; everything collapses under `prefers-reduced-motion` (CSS + the JS carousels).
- **Colour** semantic `--c-canvas/surface/sunken/line/line-strong/text/text-2/text-3/accent/accent-hover/on-accent/metal/metal-text/dark/on-dark/gold/ok/warn/err`. `--c-metal` (brass) is decoration only, never text; use `--c-metal-text`.

## Components and states

Buttons `.btn-clay` (primary), `.btn-ink`, `.btn-line`, `.btn-text`, `.btn-secondary`: hover, `:focus-visible` (one 2px accent ring), active, `:disabled`, `aria-busy` (spinner). Fields `.inp` + `.field-label` (visible label, `aria-invalid` red border + message, hint, disabled). `<Field>` now renders visible labels by default. Cards `.card/.media-card/.offer-card`, chips `.chip[aria-pressed]`, tables `.spec-table`, empty states `<EmptyState>`, images `.img-frame .ar-45 .ar-43 .ar-169 .ar-219`, placeholder `.ph`.

## Rules

1. No hex values in components; read tokens. (A few legacy inline hexes remain in planners/pay pages; see DEFECTS-CLOSED.)
2. Contested facts only through `facts.js`.
3. Empty data = designed empty state or a hidden section, never "coming soon" or "0+".
4. Arabic is authored: logical properties (`inline-start/end`, `text-align:start`), `.icon-flip` for arrows/chevrons, digits stay Latin in both languages (site convention, `src/i18n/format.js`), Arabic display weight 600, line-height 1.45+.
5. One primary action per viewport.
