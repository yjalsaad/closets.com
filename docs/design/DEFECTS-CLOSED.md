# Audit defects: status after the redesign

Source: `website-audit/visual-ux.md` (art-director audit). **Closed** = verified in the build (screenshots in `docs/design/screens/`, axe, Playwright). **Partial** = improved, residue named. **Open** = not done, reason given.
Evidence: axe (wcag2a/aa/21aa incl. color-contrast) = **0 violations** on 25 routes x EN/AR x desktop/phone x warm/sea (200 page runs) and on 32 interaction states (consent strip, mega menu, mobile drawer, cart drawer, sign-in dialog); no horizontal overflow on any run; 100/100 Jest; `seo:check` OK.

## P0

| # | Defect | Status | Notes |
|---|---|---|---|
| 1 | No serif / wrong type system | **Closed** | Fraunces (EN display, 400-500) + Inter; Noto Naskh Arabic + IBM Plex Sans Arabic; self-hosted, no Google Fonts on the marketing site |
| 2 | Palette contradicts brief | **Closed, owner decision pending** | `warm` (default) and `sea` implemented as tokens, switchable (`REACT_APP_THEME`, `?theme=`); DESIGN.md section 0 + decisions log updated; `theme-color` meta follows |
| 3 | Planner gated by sign-up modal on load | **Open (by instruction)** | Studio logic untouched. It is a product decision: open anonymously, ask for e-mail on Save/Quote. The gate card chrome got the icon/tokens only |
| 4 | "Step inside our showroom" overlap / void | **Closed** | rebuilt as the one dark band: static list of five rooms; sticky image crossfade is progressive enhancement; no pin, no void if JS/images fail |
| 5 | Empty "coming soon" pages | **Closed** | designed empty states (Showrooms, Projects, FAQ, Offers, Blog, Careers, Services, Gallery); "0+ Projects delivered" removed; home hides projects/testimonials without data. Pages are still linked (they exist; content is CMS-driven) |
| 6 | Image tiles without fallback | **Closed** (hosting **Open**) | `Photo` falls back to a tonal `.ph` placeholder; third-party image hosts remain (ASSETS-NEEDED.md) |

## P1

| # | Defect | Status | Notes |
|---|---|---|---|
| 1 | Emoji as icons | **Partial** | shell, home, booking, contact, cart, auth use the line-icon set; pictographs are stripped from every translated UI string at render (`noEmoji`). Still present: planners/Design Lab/AI YAS/games interiors |
| 2 | Header overloaded | **Closed** | wordmark, 6 items, one CTA, language, account, cart; pills demoted into the Design studio menu |
| 3 | Hero stacks 4 controls | **Closed** | one image, one CTA + one text link, no thumbnails; consent is a slim strip; chat bubble appears after the first screen |
| 4 | Hero eyebrow contrast on photo | **Partial** | scrim + light-gold eyebrow; axe cannot measure text over photos. Worst case (a very bright photo) is about 3.8:1: raise `.hero-ed__scrim` alpha if the final photo is bright |
| 5 | Footer clutter / `meetTeam` / orphan Support / vendor credit | **Closed** | brand+contact column + 4 sitemap columns, one legal row, neutral credit |
| 6 | Pages begin under the fixed nav | **Closed** | `--page-top` / `--nav-h` on every page touched; checked on all 25 routes |
| 7 | Inconsistent page headers | **Partial** | one `PageHeader` for the 12 directory-style pages (FAQ, Offers, Showrooms, Blog, Careers, Booking, Projects, Services, Gallery, Warranty, Maintenance, Category). Photo-hero pages (category, About) remain the second template. AI Lab / planners untouched |
| 8 | Content column alignment varies | **Closed** on redesigned pages | single 1280 container with 16/24/32 gutters (codemod normalised 1100-1280 wrappers) |
| 9 | Pill-chip overload on /kitchen | **Open** | `.spec-table` exists but the kitchen worktop block was not rebuilt |
| 10 | Price display strategy | **Open (owner)** | no change |
| 11 | Arabic: untranslated English strings | **Partial** | all chrome I touched is authored Arabic; CMS-data strings (kitchen style/layout names etc.) still English |
| 12 | Arabic punctuation / weight | **Closed** for chrome | Naskh 600, line-height 1.45, no tracking; the full stop correctly sits at the visual left in RTL. Legacy stored strings not audited |
| 13 | Arabic eyebrows tiny | **Closed** | 14px, no uppercase, no tracking |
| 14 | Mobile menu discoverability | **Closed** | burger + drawer; phones get a Book / WhatsApp / Call bar |
| 15 | Brochure screenshot in How it works | **Open** | asset needed |
| 16 | Business section on home | **Closed** | removed from home (component retained, unused) |
| 17 | Contradictory stats | **Closed pending owner** | `facts.js`, FACTS-TO-CONFIRM.md |
| 18 | Form styling | **Partial** | visible labels, 1px borders, error/hint/disabled states, long-form date hint; native select and date input remain (the date format follows the browser locale) |

## P2

| # | Defect | Status |
|---|---|---|
| 1 | Cookie banner covers content | **Closed** (slim strip) |
| 2 | Uneven section rhythm | **Partial** (home rebuilt; /kitchen block order unchanged) |
| 3 | Mixed radii and heavy shadows | **Closed** in JSX (numeric radii mapped to 6 tokens); radii inside the big CSS template string in `App.js` and in studio/visualizer CSS remain |
| 4 | Button radius mix | **Partial** (all `.btn-*` are 2px; some inline pill buttons on legacy pages remain) |
| 5 | Marquee ticker | **Closed** (removed from home) |
| 6 | Emoji tab titles (AI Lab) | **Open** |
| 7 | Same `<h1>` on five planner routes | **Open** |
| 8 | AI bubble competes with WhatsApp | **Partial** (quiet bubble after first screen; WhatsApp is in the phone bar, footer, booking, home CTA) |
| 9 | Motion / reduced motion | **Closed** (tokens; verified with `reducedMotion: reduce` for all 200 runs; carousels already honoured it) |
| 10 | Home too long | **Closed** (13.4k px to about 8.2k desktop) |
