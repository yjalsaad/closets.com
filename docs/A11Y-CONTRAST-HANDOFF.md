# Colour-contrast hand-off for the design pass (WCAG 1.4.3, AA)

This is the **only** axe rule still failing after the accessibility work (see the PR for before / after). The single other hit is `page-has-heading-one` on the unknown-URL page, which has no `<h1>` because it renders only the shell (a real not-found view belongs to the SEO / routing work). With the consent banner visible (first visit) axe reports no additional violations on `/`, `/booking`, `/privacy`. Colours, tokens and typography were deliberately
**not** changed in this branch: the design agent owns them. Everything below is measured by axe-core 4.x (repo `node_modules`) on the production build,
desktop 1366x900 and phone 390x844, English and Arabic, network faked, consent pre-seeded so the banner does not add noise.
Totals counted over 100 page runs (25 routes x 4 variants); a node is counted once per run.

## Failing colour pairs (grouped)

| # | Foreground on background | Ratio | Needs | Text size | Nodes | Routes | Nearest passing colour (same hue, darkened) | Example selectors (route, variant) |
|---|---|---|---|---|---|---|---|---|
| 1 | `#6d7c77` on `#f7faf9` | 4.16 | 4.5:1 | 9.4pt (12.5px) | 230 | 23 | #687672 (4.50:1) | `div > div > span` (/ desktop/en)<br>`.hit44[href$="privacy"]` (/ desktop/en)<br>`a[href$="terms"]` (/ desktop/en)<br>`div > .hit44[type="button"]` (/ desktop/en) |
| 2 | `#86868b` on `#fefefe` | 3.59 | 4.5:1 | 7.9pt (10.5px) | 158 | 16 | #75757a (4.53:1) | `a[aria-label="Home"] > span` (/gallery desktop/en)<br>`a[aria-label="Services"] > span` (/gallery desktop/en)<br>`button[aria-label="Menu"] > span` (/gallery desktop/en)<br>`a[aria-label="Gallery"] > span` (/offers desktop/en) |
| 3 | `#c65d2e` on `#ffffff` | 4.19 | 4.5:1 | 9.4pt (12.5px) | 112 | 5 | #be592c (4.50:1) | `.lift > div > div` (/kitchen desktop/en) |
| 4 | `#c65d2e` on `#e2ece9` | 3.47 | 4.5:1 | 10.5pt (14px) | 92 | 23 | #a95027 (4.51:1) | `div > a[rel="noopener"][target="_blank"]` (/ desktop/en) |
| 5 | `#6d7c77` on `#ffffff` | 4.37 | 4.5:1 | 9.8pt (13px) | 84 | 5 | #6b7a75 (4.53:1) | `.in.reveal-stagger.reveal > .lift > div > div` (/kitchen desktop/en)<br>`.lift > div > div` (/kitchen desktop/en) |
| 6 | `#c65d2e` on `#f7faf9` | 3.99 | 4.5:1 | 9.4pt (12.5px) | 69 | 23 | #b8562b (4.52:1) | `a[href$="www.365neo.com"]` (/ desktop/en) |
| 7 | `#ffffff` on `#c65d2e` | 4.19 | 4.5:1 | 10.5pt (14px) | 51 | 23 | background #be592c (4.50:1) | `div > .btn-clay[type="button"]` (/ desktop/en)<br>`div > .btn-clay` (/kitchen desktop/en)<br>`.btn-clay` (/gallery desktop/en)<br>`.btn-clay[type="button"]` (/booking desktop/en) |
| 8 | `#ffffff` on `#c65d2e` | 4.19 | 4.5:1 | 12.0pt (16px) | 49 | 11 | background #be592c (4.50:1) | `.vis.rv > .btn-clay[type="button"]` (/ desktop/en)<br>`div > .btn-clay` (/kitchen desktop/en)<br>`button[type="submit"]` (/booking desktop/en)<br>`section > div > div > .btn-clay` (/how-it-works desktop/en) |
| 9 | `#c65d2e` on `#f1f5f4` | 3.81 | 4.5:1 | 9.0pt (12px) | 40 | 14 | #b3542a (4.52:1) | `.in > .eyebrow` (/kitchen desktop/en)<br>`section > .eyebrow` (/kitchen desktop/en)<br>`.in.reveal > .eyebrow` (/wardrobes desktop/en)<br>`.eyebrow` (/gallery desktop/en) |
| 10 | `#ffffff` on `#c65d2e` | 4.19 | 4.5:1 | 9.8pt (13px) | 26 | 24 | background #be592c (4.50:1) | `div > a[href$="booking"]` (/ desktop/en)<br>`div > div > button[type="button"]` (/booking desktop/en)<br>`a[href$="booking"]` (/design-studio desktop/en) |
| 11 | `#86868b` on `#fdfdfd` | 3.56 | 4.5:1 | 7.9pt (10.5px) | 20 | 2 | #757579 (4.54:1) | `a[aria-label="Home"] > span` (/terms desktop/en)<br>`a[aria-label="Gallery"] > span` (/terms desktop/en)<br>`a[aria-label="Services"] > span` (/terms desktop/en)<br>`button[aria-label="Menu"] > span` (/terms desktop/en) |
| 12 | `#86868b` on `#f1f5f4` | 3.29 | 4.5:1 | 9.4pt (12.5px) | 14 | 1 | #6f6f73 (4.54:1) | `.reveal.in.vis > div > div` (/projects desktop/en)<br>`div > div` (/projects desktop/en)<br>`#main > div > div > div` (/projects desktop/en) |
| 13 | `#86868b` on `#ffffff` | 3.62 | 4.5:1 | 7.9pt (10.5px) | 12 | 2 | #76767a (4.53:1) | `a[aria-label="Home"] > span` (/how-it-works desktop/en)<br>`a[aria-label="Gallery"] > span` (/how-it-works desktop/en)<br>`a[aria-label="Services"] > span` (/how-it-works desktop/en)<br>`button[aria-label="Menu"] > span` (/how-it-works desktop/en) |
| 14 | `#6d7c77` on `#f1f5f4` | 3.98 | 4.5:1 | 8.3pt (11px) | 12 | 1 | #65736e (4.53:1) | `div > div > div` (/contact desktop/en) |
| 15 | `#6d7c77` on `#f1f5f4` | 3.98 | 4.5:1 | 12.0pt (16px) | 10 | 4 | #65736e (4.53:1) | `div > div > div` (/gallery desktop/en)<br>`#main > div > div > div > div` (/services desktop/en)<br>`.reveal > div` (/showrooms desktop/en)<br>`div > div` (/gallery phone/en) |
| 16 | `#aaaaaa` on `#f1f5f4` | 2.11 | 4.5:1 | 12.0pt (16px) | 9 | 4 | #6f6f6f (4.55:1) | `.reveal > div` (/offers desktop/en)<br>`#main > div > div > div` (/projects desktop/en)<br>`#main > div > div > div > div` (/careers desktop/en) |
| 17 | `#6d7c77` on `#f1f5f4` | 3.98 | 4.5:1 | 10.1pt (13.5px) | 9 | 1 | #65736e (4.53:1) | `div > span` (/how-it-works desktop/en) |
| 18 | `#c65d2e` on `#fefefe` | 4.15 | 4.5:1 | 7.9pt (10.5px) | 6 | 2 | #bd592c (4.50:1) | `a[aria-label="Gallery"] > span` (/gallery desktop/en)<br>`a[aria-label="Services"] > span` (/services desktop/en) |
| 19 | `#c65d2e` on `#f1f5f4` | 3.81 | 4.5:1 | 11.3pt (15px) | 6 | 1 | #b3542a (4.52:1) | `.rv-l > div > div > a[href="tel:+97317555095"]` (/contact desktop/en)<br>`a[href="mailto:info@the-closets.com"]` (/contact desktop/en) |
| 20 | `#6d7c77` on `#eef3f1` | 3.9 | 4.5:1 | 10.5pt (14px) | 6 | 1 | #64716d (4.52:1) | `p` (/design-studio desktop/en)<br>`#main > div > div > button[type="button"]` (/design-studio desktop/en) |
| 21 | `#86868b` on `#edeeee` | 3.11 | 4.5:1 | 7.9pt (10.5px) | 4 | 1 | #6c6c70 (4.51:1) | `a[aria-label="Home"] > span` (/about desktop/en)<br>`a[aria-label="Gallery"] > span` (/about desktop/en)<br>`a[aria-label="Services"] > span` (/about desktop/en)<br>`button[aria-label="Menu"] > span` (/about desktop/en) |
| 22 | `#ffffff` on `#c65d2e` | 4.19 | 4.5:1 | 11.3pt (15px) | 4 | 2 | background #be592c (4.50:1) | `button[type="submit"]` (/warranty desktop/en) |
| 23 | `#c65d2e` on `#ffffff` | 4.19 | 4.5:1 | 9.0pt (12px) | 3 | 2 | #be592c (4.50:1) | `div > .eyebrow` (/wardrobes desktop/en)<br>`section > div > .vis.rv > .eyebrow` (/how-it-works desktop/en) |
| 24 | `#ffffff` on `#c65d2e` | 4.19 | 4.5:1 | 10.1pt (13.5px) | 3 | 2 | background #be592c (4.50:1) | `.rv.vis > div > button` (/gallery desktop/en)<br>`button[title="Design & price your own"]` (/design-studio desktop/en) |
| 25 | `#c65d2e` on `#ffffff` | 4.19 | 4.5:1 | 8.3pt (11px) | 3 | 1 | #be592c (4.50:1) | `div > .eyebrow` (/booking desktop/en) |
| 26 | `#6d7c77` on `#f1f5f4` | 3.98 | 4.5:1 | 9.8pt (13px) | 2 | 1 | #65736e (4.53:1) | `.hide-mobile` (/gallery desktop/en) |
| 27 | `#6d7c77` on `#f1f5f4` | 3.98 | 4.5:1 | 9.0pt (12px) | 2 | 1 | #65736e (4.53:1) | `div > div > div` (/ai-lab desktop/en)<br>`div > div > div > div` (/ai-lab phone/en) |
| 28 | `#6d7c77` on `#eef3f1` | 3.9 | 4.5:1 | 12.0pt (16px) | 2 | 1 | #64716d (4.52:1) | `p` (/design-studio desktop/en) |
| 29 | `#86868b` on `#ffffff` | 3.62 | 4.5:1 | 10.5pt (14px) | 2 | 1 | #76767a (4.53:1) | `div > div` (/design-studio desktop/en)<br>`div[aria-labelledby="auth-title"] > div > div` (/design-studio phone/en) |
| 30 | `#86868b` on `#faf2ee` | 3.27 | 4.5:1 | 7.9pt (10.5px) | 2 | 1 | #6f6f73 (4.51:1) | `a[aria-label="Home"] > span` (/ai-lab phone/ar)<br>`a[aria-label="Gallery"] > span` (/ai-lab phone/ar) |

Suggested values are the smallest darkening of the same hue that reaches the required ratio against that exact background. They are a starting point for the token
pass, not a decision: a token must pass on **every** background it is used on (cream `#f7faf9`, sand `#f1f5f4` / `#e2ece9`, white, photos).

## Per route (node count per variant)

| Route | EN desktop | AR desktop | EN phone | AR phone |
|---|---|---|---|---|
| / | color-contrastx9 | color-contrastx3 | color-contrastx8 | color-contrastx4 |
| /kitchen | color-contrastx24 | color-contrastx10 | color-contrastx27 | color-contrastx21 |
| /wardrobes | color-contrastx21 | color-contrastx8 | color-contrastx20 | color-contrastx13 |
| /tv | color-contrastx23 | color-contrastx9 | color-contrastx22 | color-contrastx16 |
| /doors | color-contrastx23 | color-contrastx9 | color-contrastx22 | color-contrastx16 |
| /office | color-contrastx23 | color-contrastx9 | color-contrastx22 | color-contrastx17 |
| /gallery | color-contrastx16 | color-contrastx3 | color-contrastx14 | color-contrastx8 |
| /offers | color-contrastx13 | color-contrastx2 | color-contrastx12 | color-contrastx7 |
| /booking | color-contrastx16 | color-contrastx2 | color-contrastx15 | color-contrastx8 |
| /projects | color-contrastx18 | color-contrastx2 | color-contrastx17 | color-contrastx11 |
| /services | color-contrastx14 | color-contrastx2 | color-contrastx13 | color-contrastx8 |
| /showrooms | color-contrastx14 | color-contrastx2 | color-contrastx13 | color-contrastx7 |
| /how-it-works | color-contrastx19 | color-contrastx4 | color-contrastx13 | color-contrastx12 |
| /faq | color-contrastx13 | color-contrastx2 | color-contrastx12 | color-contrastx8 |
| /about | color-contrastx12 | color-contrastx2 | color-contrastx12 | color-contrastx8 |
| /contact | color-contrastx20 | color-contrastx2 | color-contrastx19 | color-contrastx13 |
| /blog | color-contrastx14 | color-contrastx2 | color-contrastx13 | color-contrastx8 |
| /careers | color-contrastx13 | color-contrastx2 | color-contrastx12 | color-contrastx7 |
| /warranty | color-contrastx13 | color-contrastx2 | color-contrastx12 | color-contrastx7 |
| /maintenance | color-contrastx13 | color-contrastx2 | color-contrastx12 | color-contrastx7 |
| /ai-lab | color-contrastx17 | color-contrastx3 | color-contrastx13 | color-contrastx8 |
| /design-studio | color-contrastx7 | color-contrastx1 | color-contrastx5 | color-contrastx2 |
| /privacy | color-contrastx8 | color-contrastx2 | color-contrastx11 | color-contrastx7 |
| /terms | color-contrastx12 | color-contrastx2 | color-contrastx11 | color-contrastx7 |
| /does-not-exist | color-contrastx12 | color-contrastx2 page-has-heading-onex1 | color-contrastx11 | color-contrastx7 |


## Not measurable by axe (needs a human / design check)
* Text over photographs and gradients (hero, showroom tour, banners, campaign): axe reports these as "incomplete". Check manually.
* Placeholder text colour in inputs, disabled-state colours, focus-ring colour against each background.
* Non-text contrast (1.4.11): borders of inputs and the pill buttons (`1px solid var(--line)`) on cream.
* New components added in this branch use literal colours (white card, near-black text) so they work in every shell: `ConsentBanner`, `ai.js` consent dialog, `WebGLGate` fallback, `FormNotice`, `form-error` / `form-banner` classes in `src/a11y/a11y.css`, legal pages. Please map them to the tokens.
* The hidden-until-focused skip link and the form error colours (`#b3261e` on white = 6.5:1) were chosen to pass AA.

## Accessibility, resilience and checkout: verified / not verified

"Playwright" = production build served locally, all Supabase / CDN / payment traffic faked with route interception (no real backend contacted), Chromium. "Jest" = React Testing Library, `CI=true ... react-scripts test` (87 tests).

| Item | Status | Evidence |
|---|---|---|
| Skip link is the first Tab stop and moves focus to `<main id="main">`; exactly one `<main>` on all 25 routes x 4 variants | Verified | Playwright + axe harness (`landmark`/`region` rules clean), Jest |
| `region`, `label`, `select-name` axe violations (booking: 1 + 2 critical; `region` on every page) | Verified fixed | axe before / after table in the PR |
| Route change: focus moves to the page `<h1>`, polite live region announces the title; language change announced | Verified | Playwright, Jest |
| Cart drawer, auth dialog, mobile menu, planner quote dialogs, YAS modals, room designer, visualizer modal, studio quote + sign-in dialogs, campaign "how it works": `role=dialog aria-modal`, focus trap, Esc, focus returns to trigger, scroll lock | Cart, mobile menu, auth: **verified in a real browser**. Others: shared `ModalPanel` unit-tested; **not individually exercised** in a browser (several need a signed-in planner session) | Playwright, Jest |
| Desktop mega menus by keyboard: Enter/Space, ArrowDown into the panel, Up/Down inside, Esc returns focus to the trigger, Left/Right between triggers (mirrored in RTL), `aria-expanded`/`aria-controls` | Verified (EN). Arabic mirroring of Left/Right **not** exercised | Playwright |
| `/about` horizontal overflow at 320 / 360 / 390 px | Verified fixed (`main#main { overflow-x: clip }`; cause: `.rv-l` / `.rv-r` tiles start translated 44px sideways) | Playwright (before: 22-23px) |
| Honeypot no longer creates 10000px of scroll in RTL (found while testing; the first draft used `left:-10000px`) | Verified fixed | axe harness overflow column |
| `prefers-reduced-motion`: CSS animations / transitions / smooth scroll, hero + banner + testimonial carousels, parallax, count-up, model-viewer auto-rotate, visualizer kiosk attract slides | Verified for CSS and the hero carousel (control run without the preference does advance). The in-repo three.js scenes (`KitchenScene3D`, `Door3D`, `Office3D`, `TVUnit3D`) already honoured it; `Wardrobe3D` and the ShowroomTour pin effect were read, **not run** under the preference | Playwright, code reading |
| `<html lang dir>` flips with the language toggle; toggle names its target language (`aria-label` + `lang`) | Verified | Playwright, Jest |
| Mixed-language fragments get `lang` | **Partial**: language toggle, "365Neo Digital Services", phone numbers (`<bdi dir=ltr>`). Brand names in Arabic body copy and CMS text are not wrapped | code |
| Decorative emoji hidden from assistive tech | **Partial**: nav pills, appointment cards, contact icons, success ticks, `Photo` fallback. Remaining emoji in planners and the games hub were not touched | code |
| Touch targets >= 44px | Invisible 44px hit areas (`.hit44`) on: logo, cart, language, Sign in, account pill, dock items, all close buttons, footer legal links and phone. **Not changed** (would alter the layout): stacked footer link lists (29px tall, still above the 24px AA minimum of 2.5.8), the mega-menu chips on category pages (28-36px), the skip link (42px) | Playwright measurement (`/tmp/small-targets.json` list in the PR) |
| Per-route + per-section error boundaries; one bad product / banner / testimonial / CMS value (object where a string is expected) never blanks the site | Verified | Jest (app + resilience), the audit's repro data |
| WebGL unavailable: visualizer room / photo / share / kiosk show a clear message with catalogue + booking alternatives instead of the global crash screen | Verified in Chromium launched with WebGL disabled (the audit's exact repro). Planners' 3D steps (`Wardrobe3D`, `KitchenScene3D`, `Door3D`, `Office3D`, `TVUnit3D`) are wrapped with the same gate but **not run** without WebGL (need sign-in) | Playwright, Jest |
| Forms: labels, announced errors, validation (e-mail, phone, Arabic-Indic digits, name, date, lengths), honeypot, double-submit guard, offline state, slow-network hint, form data kept on failure | Verified for booking, newsletter and sign-in; the same `Field` / `useSubmit` code is used by contact, maintenance / warranty and checkout (checkout verified separately). Planner quote dialogs use `validateForm` in the submit handler, **not browser-tested** | Playwright, Jest |
| Checkout: failure surfaced, cart kept, retry allowed, success only on a confirmed server response, single `public_order_submit` across failure + retry, button disabled while submitting, server total shown when returned | Verified against faked RPCs. **Real payment, real server totals and the real response shape of `store_checkout` are not verified** (the code reads `total`, `total_bd`, `amount`, `total_amount`, `grand_total` if present) | Playwright, Jest |
| Account module: session twin vs legacy, fallback, legacy switch-off, minimal stored profile | Verified with faked responses. **The `cp_*` RPCs' real response shapes and the main-site session sign-in are not verified** | Jest |
| `log_client_error` PII | Verified | Jest |
| Pay pages: logo path, unified name / phone, cosmetic success wording, NaN guard | Edited; **not loaded in a browser in this pass** apart from the redirect URL; `/brand/closets-logo-clear.png` exists in `public/` | code |
| Screen reader (NVDA / VoiceOver) behaviour, Safari / Firefox, real devices, 200% zoom, text spacing | **Not verified** | |
