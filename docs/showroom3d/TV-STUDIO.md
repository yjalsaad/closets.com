# YAS Bloom: TV Unit Studio

A second Design Studio section in the showroom. Visitors walk up to the big design wall, pick the **TV Unit Studio** and design a TV unit / media wall with **the same options, the same features, the same BHD price and the same quote hand-off as the website's Neo TV Unit Designer**, on a full-viewport canvas (1440 x 900, 1920 x 1080 and 2560 x 1440 are verified), **without signing in**.

Branch `claude/web-tv-studio`, add-only on production `main` (nothing outside `src/showroom3d/**`, `public/yas-bloom/**`, `docs/showroom3d/**`, `scripts/**`). It follows the pattern of the Kitchen Design Studio (`docs/showroom3d/KITCHEN-STUDIO.md`); read that first for the embed mechanics, the state machine and the registry.

## 1. Interpretation (confirmed from the code)

"Bloom" is the YAS Bloom 3D showroom (`/yas-bloom`, `/ar/yas-bloom`, `src/showroom3d`). "Neo TV Unit" is the website's **Neo TV Unit Designer**. "Bonsai hub" is the owner's name for the website's Neo Design Studio, whose designers are the Bonsai Neo studios.

There are two TV designers on the website, and they are different tools:

| | Neo TV Unit Designer | classic TV unit planner |
|---|---|---|
| Route | `/studio/tv` (`src/studio/designers.js` kind `tv`, `src/studio/hub/NeoTvDesigner.jsx` over the generic `neoCategories` studio, nav id `neo-tv`) | `/design-studio/tv-planner` (`TVUnitPlannerWizard` in `src/App.js`, also `TVUnit3D.jsx`) |
| What | parametric 2D elevation + 3D, units / TV / panel / LED / hardware, cut-list-grade quantities, indicative price | 4-step wizard, 2D elevation, BOM, quote |
| Sign-in | **none to design.** Only Save and Request a quote need an account | **required** (`PLANNER_PAGES` + `plannerLocked` in `App.js`: signed-out visitors get the sign-in gate) |
| Language | EN / AR (RTL) | EN / AR |

**The Neo one is the right one** because (1) the owner said "Neo TV Unit", (2) it is the studio app of the site, with the full option set (below), (3) it is the one that **already works without login**, which is the owner's requirement, and (4) it is the same family as the Neo Kitchen Designer that the kitchen decision (owner decision 3 in KITCHEN-STUDIO.md) left open.

### What the internal Bonsai Hub (`yjalsaad/closets-hub`, read-only check) has

The same designer: `src/neoCategories/configs/tv.js` is **byte-identical** to the website's `src/studio/hub/neoCategories/configs/tv.js` (model, parameters, presets, rules, prices); `categoryModel.js`, `categoryPrice.js`, `categoryKit.js`, `categoryCommands.js` and `CategoryAssistant.jsx` are identical too. The website port differs in three small, intentional places: `CategoryStudio.jsx` (customer subtitle "THE CLOSETS · NEO STUDIO" instead of "BONSAI HUB · PARAMETRIC", and the **Cut List** tab is shown only when the admin turns factory outputs on, `wsShowFactory()`), `NeoCategoryApp.jsx` (`startLang`, `--studio-h` so it fits the studio shell), and the customer **Get quote** dialog replaces the staff **Quote Max** panel (hidden with CSS on the website). So: **no TV designer exists in the hub with other options**; the website one is the hub one minus the staff-only parts. The station shows the website's version, as the owner asked ("with all option" = what customers get).

## 2. The sign-in question

Checked in code and in the running site (Playwright, a browser with no account at all):

* `/studio/tv` mounts the designer for everybody. `StudioRoot.jsx` `DesignerPage` renders `<Comp ... currentUser={null} />` with no session check; the only `getSession()` there is for opening a **saved design by id** (`?design=<id>`). A unit test pins this (`tvstudio.test.jsx`, "GUEST ACCESS").
* What needs an account is only **Save to My designs** and **Request a quote** (`QuoteDialog.jsx` -> `ensureSignedIn()` -> the studio's own sign-in / create-account dialog -> `cp_studio_design_save` / `cp_studio_request_quote`).
* The owner approved a client-side "fake sign-in" in the frame **only if** the designer needed a signed-in user and had no supported guest path. It has a supported guest path, so **that approval was not used**: no shim, no user object, no storage key of ours. After leaving the showroom the main site is exactly as before (the only things the frame writes are the website's own `closets_lang` and the studio's own autosave `neo_cat_tv_v1`, the same keys the website writes).
* So **no bypass was needed and none was built.** The frame is the real page, signed out. No `sessionStorage` / `localStorage` key was set, no Supabase session was forged, no `App.js` / `src/studio` edit was made.

### What a guest keeps and what they do not

| | Guest in the showroom frame | Signed-in customer |
|---|---|---|
| Every option, 2D, 3D, looks, presets, undo / redo, rules and warnings, hardware list, the assistant | yes | yes |
| Live BHD price chip, and the indicative "from BD ..." in the quote dialog | yes | yes |
| **Autosave in this browser** (`neo_cat_tv_v1`, same key as the website) and "restored" on the next visit | yes (a re-opened designer shows the last design; see owner decision 4) | yes |
| File menu: save / load a design file | yes (the studio's own menu) | yes |
| PDF / exports | only what the admin enabled for everyone (`show_exports`; off by default) | same |
| **Save to My designs** (server, account) | **no: asks to sign in or create a free account** | yes |
| **Request a quote** (lead to the Bonsai team) | **no: asks to sign in or create a free account** | yes |
| My designs list (`/studio/account`) | no | yes (opens in a new tab from the frame) |

### How the quote / lead hand-off behaves for a guest

Get quote opens the website's quote dialog (design picture, facts, indicative price). **Save** and **Request a quote** call `ensureSignedIn()`; for a guest the studio opens its own "Sign in / Create account" dialog **inside the frame** ("Sign in to save your design and request a quote."). After a real sign-in the same dialog continues and saves under **that** account. A guest can never write anything that looks like another user's data:

* every write goes through `customerAuth.js` `rpc()`, which throws `not_signed_in` **before** any network request when there is no session; the server RPCs (`cp_studio_*`) additionally need the `customer_user` role in the access token;
* the QA records every Supabase request the framed designer makes while a guest designs, opens Get quote and presses Save: the **only** one is the public read `studio_public_settings` (the admin's price-mode switch). No `/auth/v1`, no `cp_*`;
* a confirmation e-mail link (sign-up) goes to `/studio/account` on the website in the visitor's mail client, exactly as on the website; **it cannot return to the showroom** (owner decision 3);
* links in the studio that would take the frame away (e.g. "My designs" after saving) open in a **new tab** (`newTabLinks`), so the visitor keeps the showroom and the design.

Not verifiable in this sandbox (Supabase is unreachable): a real sign-in / sign-up from inside the frame, a saved design, a sent quote, the confirmation e-mail round trip, and whether e-mail / password autofill works in an iframe. The dialog, its fields and the guest prompt were verified; the same code runs on the website.

## 3. What was built

| Where | What |
|---|---|
| `designstudio/sections.js` | the registry gets the `tv-studio` entry (route `/studio/tv`, guest auth info, embed settings, language buttons, poster base `tv`, the living adviser, keywords, its own wording), `STATION_NAME`, `stationSections`, `stationName`, `zoneStationName`, `sectionShort` |
| `designstudio/layout.js` | **one station per slot**: sections that share a slot share one zone (id of the first section, plus `sectionIds`), one wall collider and one podium collider; quick-nav stops stay one per section (12th entry) |
| `designstudio/wall.js` | the station draws "Design Studios" on the sign when it is shared; the screen loops **every section's frames** (3 kitchen, 3 TV) with a "Preview of the TV designer" tag and a pill per section (the one on screen filled); the podium tablet shows **one button per section** (a click / tap on a half names its section: `pickSection`); `sectionShown()` says which section is on screen |
| `designstudio/StudioChooser.jsx` | "Which studio?" (E at the wall when no section was named): two cards with their poster, Esc / Close, focus trap, RTL |
| `designstudio/logic.js` | per-section embed (frame shift, CSS, readiness selector), `isSignedIn(storage, section)` (kitchen: `closets_user`; studio: `closets_studio_auth_v1`), `switchDesignerLanguage` / `designerLanguageIs` (clicks the studio's own EN / ع group and the shell toggle), section-aware adviser intents (named section wins; the generic "open the designer" is the adviser's own section; Reception asks which) |
| `designstudio/DesignerOverlay.jsx` | uses the section's embed settings and wording; guest note instead of the kitchen's "you may be asked to sign in"; **new-tab links** for the studio; the studio's language switch; the leave confirmation says the design stays in this browser |
| `designstudio/strings.js` | shared-wall strings (tagline, chooser, tablet) and `sdt(section, key, lang)` (a section's own wording, else the kitchen defaults) |
| `navigation/explorer.js` | `studioTarget` / `studioFocus`: arriving at a section **by name** (quick-nav entry, adviser, tablet button) makes E open **that** section; walking in by hand makes E open the chooser; a click on the screen means the section on it; leaving the zone forgets |
| `ShowroomExperience.jsx`, `ui/Hud.jsx`, `ui/StaffChat.jsx`, `staff/guide.js` | the chooser, the zone name "Design Studios", the adviser's room, per-adviser chips (kitchens -> kitchen, living -> TV) |
| `public/yas-bloom/design-studio/tv-{1,2,3}-{en,ar}.webp` | the wall's TV frames: **real screenshots of the real designer** as a guest (`studio-posters.js tv`), 51 to 69 KB each (limit 200 KB), 1600 x 900. They show **no price** (see owner decision 2) |
| `scripts/showroom3d-qa/studio-posters.js`, `tvstudio.js` | poster generator (`kitchen` | `tv`), Playwright QA |
| tests | `designstudio/__tests__/tvstudio.test.jsx` (new, 29 tests) and the existing tests whose counts must change (menu 12 entries, graph 12 stops, E at the station) |

## 4. Approach chosen and the rejected alternatives

The hall has **one free wall** (the left front wing, taken by the Kitchen Design Studio); every bay, the VIP room and the Collections wing are taken. Options for a second station:

| | Verdict |
|---|---|
| **A. Shared wall: one big screen, one podium, a section per designer (chosen)** | cheapest, uses what the registry was built for (KITCHEN-STUDIO.md section 8b), keeps the kitchen exactly as it was (E after gliding to the kitchen opens the kitchen directly; with the TV entry set `enabled: false` the station is byte-for-byte the old one), no new geometry or colliders |
| B. Two smaller screens side by side on the wing | the wing is 8 m: two 3.6 m screens would shrink the kitchen screen and need new colliders / signage; a larger change to a merged station |
| C. A screen on the 3.7 m return wall at x = -22 | a small screen next to the first bay, inside the kitchen's zone; two overlapping zones |
| D. A separate "Design Studio" room next to the VIP room | the right long-term answer for 4+ designers (wardrobe, doors, office); new walls, colliders, ceiling, lights; not needed for two |

Embed: the same same-origin frame as the kitchen (the designer is never re-implemented: `NeoTvDesigner` is exportable, but the studio shell, the account, the price mode and the quote dialog live in `src/studio`, which must stay untouched). What is different from the kitchen frame: the studio shell is a **56 px bar** (`.ws-bar`: brand, designer switcher, language, Sign in) over the designer, not a 104 px site header, so one injected rule hides it and gives its height back to the designer (`.ws-bar{display:none!important}.ws-root{--ws-bar-h:0px!important}`, the studio's own `--studio-h` custom property); no frame shift and no phone scroll are needed. Readiness is the designer's own page element (`[data-testid="cat-page-tv"]`).

## 5. Every option the framed designer exposes

It is the website page, so this list is the website's (verified identical, tab by tab, in the QA). Prices are the website's own.

**Top bar:** project title, autosave state, undo / redo, price chip, **Get quote**, **File** (new blank, default, save design, load design), EN / ع, the assistant button (suggestions and commands).
**Views:** Design (2D elevation, zoom / fit, layers: dimensions, internal, map, handles, centre lines, legend, "checks" panel with rule warnings), **3D View** (orbit / pan / zoom, Views, Fit, Reset, Hold, Grid, Guides, Layers, X-Ray, Explode, Open doors, Daylight, **Look**: Standard / Studio / Daylight / Evening, double-click a part to focus, drag a unit edge to resize).
**Tabs (left panel):**

| Tab | Options |
|---|---|
| **Global** | total width (1200 to 4800 mm), footprint / height read-out; media unit floating or floor standing; floor clearance (floating, 100 to 700); legs or plinth and its height (floor); media unit height (250 to 700) and depth (250 to 550); top board thickness (18 to 50); **top material** solid oak / laminate / marble / granite / quartz; side tower height (1200 to 2600) and depth (200 to 550); 3D look; output units (mm / cm / inch), precision (draft / standard / ultra) |
| **M&S** | board finish (Natural Oak, Dark Walnut, Matte White Lacquer, Charcoal Grey); board type (MDF 18, birch plywood, MR); carcass / back / shelf / door board thicknesses, door gap, drawer-front gap, runner clearance; per-part look (carcass, doors, drawer fronts, shelves, back, countertop, plinth, handles: default / wood grain / marble / colour), reset look; production material names |
| **Units** | **5 presets** (Floating 65" with slat panel + towers, Floor unit with electric fireplace, Console + AV shelves 55", Low unit with TV on a stand 43", Wall-hung 85" cinema wall); the unit strip (width of each unit, "keep the total width"); per unit: **Media console** (doors / drawers / open, 1 to 3 drawers, shelves, TV niche above on / off), **AV shelf unit** (open / glass door / vented door, 1 to 4 shelves, show equipment), **Electric fireplace** (flame on, TV niche above), **Side tower** (doors / open shelves / open + doors, 2 to 8 shelves, 0 to 3 drawers), **Wall shelf** (1 to 4 shelves); move left / right, duplicate, remove; add any of the five; pieces count |
| **TV & niche** | **TV size 32 to 98" (quick 43 / 55 / 65 / 75 / 85)**; mounting (wall bracket in a niche, or on the unit on a stand); clearance each side / above / below the TV; niche depth; gap from unit top to the niche; **soundbar** none / below the TV / on the unit and its height |
| **Panel & LED** | back wall panel on / off, its top (1200 to 2800) and thickness; **vertical slats** on / off, cover (beside the niche / whole panel), width, gap, thickness; **LED lighting** none / niche backlight / under the unit / both, light on / off; **cable grommet holes** (0 to 6) and diameter; cable duct behind the TV |
| **Hardware** | handles (bar, knob, J-pull profile, push-to-open, none), length (96 to 320) and position (auto / top / centre / bottom); the **hardware list** (hinges, plates, runners, handles, shelf pins, connectors, cam locks, dowels, cable duct, TV bracket, slat fixings, panel fixing, grommets, wall-hung brackets, LED strip and driver, fireplace insert, vent grilles) with quantities |
| **Price** | the price tab (see owner decision 2: the designer itself says the TV category runs on **placeholder rates**) |

Also, as the website decides: a **Cut List** tab and the Export menu only when the admin turns "factory outputs" on (`show_exports`); the price display (none / indicative / full) is the admin's `price_mode`. The framed designer reads the same `studio_public_settings`, so the owner controls the showroom and the website together.

## 6. Price and option parity (Playwright, `scripts/showroom3d-qa/tvstudio.js`)

Eleven changes were made, one after another, in the frame and on `/studio/tv` opened directly (a fresh browser context, so no autosave leaks across), both as a guest, same build:

| # | Change | Frame | Website route |
|---|---|---|---|
| 0 | default design | BD 758.84 | BD 758.84 |
| 1 | TV size 75" | BD 742.39 | BD 742.39 |
| 2 | total width 3600 mm | BD 820.22 | BD 820.22 |
| 3 | floor standing unit | BD 796.22 | BD 796.22 |
| 4 | top: Marble | BD 864.04 | BD 864.04 |
| 5 | board: birch plywood | BD 1039.00 | BD 1039.00 |
| 6 | LED: niche + under the unit | BD 1084.36 | BD 1084.36 |
| 7 | no soundbar | BD 1082.24 | BD 1082.24 |
| 8 | + AV shelf unit | BD 1111.99 | BD 1111.99 |
| 9 | handles: knob | BD 1105.27 | BD 1105.27 |
| 10 | preset: floor unit with electric fireplace | BD 721.21 | BD 721.21 |

Also identical: the **text of all seven tabs** (every option, label, range and the hardware list) at the start and after the changes, and the **Get quote dialog** (facts, indicative price "from BD 730", "you will sign in first"). The figures are the website's placeholder rates (owner decision 2), not final prices.

## 7. Phones, big screens

* **Big screens**: the designer fills the stage exactly (no scroll bars) at 1440 x 900, 1920 x 1080 and 2560 x 1440 (`tv-designer-*x*-*.jpg`); the 2D plan and the 3D view scale with the larger canvas.
* **Phone portrait (390 x 844, touch)**: Tap Interact at the station (after the quick-nav entry) opens the full-screen designer; the studio's own responsive layout is used; the Get quote button is inside the visible window.

## 8. Performance and memory

* The render loop is stopped while any overlay is active (0 frames in 1.5 s, checked) and runs again after; the frame is destroyed on leaving (its heap and WebGL context go with it). Same code path as the kitchen.
* Wall textures: the kitchen set was 3 frames (1600 x 900). The shared wall loads **6** (3 per section) at medium / high: about 7.7 MB of GPU memory each with mipmaps, **about 46 MB** (was 23 MB). The **low** tier loads one frame per section (2, about 15 MB) and alternates them. Frames load only when the visitor is within 18 m, never at start-up, and a language change fetches the other language's set. **Not measured on a real GPU or a phone.**
* Bundle: the showroom chunk grows from 201.6 kB to 205.0 kB gzip (+3.4 kB); the `main` chunk is the same file as on `main` (see the PR evidence).

## 9. Owner decisions

1. **Shared wall or its own place.** The TV section shares the kitchen's wall (sign now reads "Design Studios"; E asks "Which studio?" unless you arrived by name). If you prefer the sign to keep "Kitchen Design Studio", or want a separate room for TV / wardrobe / doors / office, say so: section 4 option D is ~3 days.
2. **TV prices are placeholders.** The designer's own Price tab says: "Placeholder rates: the owner has not supplied a price list for this category yet." The website already shows these numbers (BD 758.84 for the default design, "from BD 760" in the quote dialog), and so does the showroom frame (same page). The **wall posters show no price** on purpose. Decide whether the website and the showroom should keep showing them until the real price list is entered (`neoCategories/configs/tv.js`, `src/studio`, outside this add-only change).
3. **Sign-up confirmation links** open the website (`/studio/account`), not the showroom. Returning to the showroom needs a change in `src/studio` (a `redirect_to`), outside this scope.
4. **Autosave and shared computers.** The studio autosaves the design in the browser (`neo_cat_tv_v1`). Fine on a visitor's own device; on a **shared kiosk** the next visitor would see the previous design. If a kiosk is planned, add a "start fresh on open" (a `?new=1` on the frame URL does exactly that on the website: one extra registry field).
5. **Arabic copy.** The Arabic strings (station name "استوديوهات التصميم", "استوديو وحدات التلفزيون", advisers, chooser, guest note) are drafts to confirm. "استوديو التصميم" alone is the Custom Studio bay's name, so the shared name is the plural.
6. **Wording "TV Unit Studio" vs "Neo TV Unit Studio".** Visitors see "TV Unit Studio" on the wall and the designer's own title "Neo TV Unit Designer" inside.

## 10. Re-running everything

```
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false src/showroom3d
CI=false node node_modules/react-scripts/bin/react-scripts.js build
node scripts/showroom3d-qa/serve.js build 5075 &
BASE=http://localhost:5075 THREE_R128=<three r128 min.js> OUT=docs/showroom3d/screenshots/tv-studio node scripts/showroom3d-qa/tvstudio.js     # BEAUTY=1 adds the high-tier shots, ONLY=phone runs the phone part
BASE=http://localhost:5075 THREE_R128=<...> node scripts/showroom3d-qa/studio-posters.js tv                                                  # regenerate the TV wall frames
BASE=http://localhost:5075 THREE_R128=<...> OUT=docs/showroom3d/screenshots/kitchen-studio node scripts/showroom3d-qa/kitchenstudio.js      # the kitchen QA still passes unchanged
```

## 11. Evidence

* **Tests:** whole Jest suite 44 suites, 758 passed, 5 skipped (pre-existing skips); 29 new tests in `tvstudio.test.jsx`; existing tests changed only where counts must change (menu 12 entries, graph 12 stops, E at the station opens the chooser).
* **QA:** `tvstudio.js` 56 checks (55/56 in the single full run; the one miss, "Arabic HUD prompt", is a timing flake of the check itself that passed in isolation and after making the check wait; its fixed form is in the script), the kitchen QA `kitchenstudio.js` re-run on this build: 38/38 pass (only its HUD-prompt regex changed to "Design Studios").
* **Build:** `CI=false npm run build` compiles; warnings identical to a `main` build. 439 of 452 branch files byte-identical to `main` (everything except `index.html`, `asset-manifest.json`, the showroom chunk and its CSS, `main.js` which differs in 27 bytes: hashes in the chunk map and the lazy-import module id, same size 2,149,895 bytes, and the 7 new / changed poster files). Main JS chunk 508.21 kB gzip unchanged; showroom chunk 201.6 -> 205.0 kB.
* **Production safety:** diff by directory is `docs/showroom3d`, `public/yas-bloom`, `scripts/showroom3d-qa`, `src/showroom3d` only. Pixel regression (reduced motion, 3 samples, main vs branch): `/`, `/kitchen`, `/services`, `/booking`, `/contact`, `/tv`, `/studio/tv` (the designer route itself) are 0 differing pixels beyond the builds' own noise; `/design-studio/tv-planner` (the gated classic planner) shows the same 102 px of self-noise in main-vs-main on a longer run.
