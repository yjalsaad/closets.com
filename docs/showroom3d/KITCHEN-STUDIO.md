# YAS Bloom: Kitchen Design Studio

A station in the showroom where visitors walk up to a **big design wall** and design a custom kitchen with **the same options, the same features, the same BHD prices and the same quote hand-off as the website**, on a larger canvas: a 4.8 x 2.7 m screen in the world, and a true full-viewport designer when they press E / tap Interact.

Branch `claude/web-kitchen-studio`, add-only on production `main` (nothing outside `src/showroom3d/**`, `public/yas-bloom/**`, `docs/showroom3d/**`, `scripts/**`).

## 1. Interpretation (confirmed from the code)

The website already has a customer-facing kitchen design experience. In `src/App.js`:

| Route | Page | What it is |
|---|---|---|
| `/design-studio/kitchen-planner` (alias `/kitchen-planner`) | `KitchenPlannerWizard` | the **"3D kitchen planner"** (nav string `navl3dKitchen`): 9 steps Room shape, Dimensions, Openings, Layout (single wall / galley / L / U / island / peninsula), Work triangle, Cabinets, Materials (carcass, door finish, worktop), Accessories (handles, LED), Summary and quote (bill of materials, manufacturing list, installation list, PDF, quote request); live 2D plan, 3D view (three.js r128 from cdnjs), the "Room Designer" overlay, a live **BHD** total in the footer bar |
| `/kitchen` | `KitchenPage` | marketing page for kitchens |
| `/design-studio` | `PlannerPage` | generic design studio |
| `/studio/kitchen` | `NeoKitchenDesigner` (`src/studio`) | the Neo parametric kitchen designer, its own app shell (`index.js` mounts `StudioRoot`), account-based, "indicative" price mode |

`CustomConfigurator.jsx` is no longer mounted (see the comment above `export default function App`). The owner's list (layout, room size, cabinets, doors / finishes, worktop, handles, appliances, 3D, live BHD price, quote / booking) is exactly the **kitchen planner wizard**, so that is what the station opens. The Neo Kitchen Designer is a second, different tool; it is a candidate "pro mode" (see section 9, owner decision 3).

Important fact found on the way: the planner routes are **gated to signed-in customers** (`PLANNER_PAGES` / `plannerLocked` in `AppInner`). A visitor who is not signed in sees the website's own "Design & price your own" sign-in screen. The station keeps that behaviour (it must be byte-identical); the loading screen tells signed-out visitors about it (see owner decision 1).

## 2. What exists

| Where | What |
|---|---|
| `src/showroom3d/designstudio/sections.js` | the **section registry** (only `kitchen-studio` enabled) |
| `.../layout.js` | pure geometry: slot, screen / sign / podium sizes, stand point, zone, colliders, quick-nav graph extension, quality tiers, attract-loop timing |
| `.../wall.js` | the three.js station: name sign, 4.8 x 2.7 m 16:9 screen with bronze bezel + LED halo, walnut / travertine base, touch podium with a "Start designing" tablet, floor halo |
| `.../logic.js` | pure: embed URL, language sync, open / close **state machine**, dirty-design tracker, adviser intents |
| `.../useDesigner.js` | hook: pause / resume of the render loop, browser Back, history entry, language write |
| `.../DesignerOverlay.jsx` + `designstudio.css` | the full-viewport designer under a slim showroom bar |
| `.../strings.js` | EN / AR strings |
| `public/yas-bloom/design-studio/kitchen-{1,2,3}-{en,ar}.webp` | the wall's attract-loop frames: **real screenshots of the real designer** (`scripts/showroom3d-qa/studio-posters.js`), 34 to 57 KB each (limit 200 KB) |
| `src/showroom3d/designstudio/__tests__/*` | 59 Jest tests for the new code (state machine, embed URL, language, pause / resume hook, overlay, explorer, zone, graph, adviser intents, menu, poster files) |
| `scripts/showroom3d-qa/kitchenstudio.js` | Playwright QA (38 checks) |

Hooks into existing showroom files (all inside `src/showroom3d/`): `3d/engine.js` (build, language, per-frame update, dispose), `navigation/explorer.js` (graph, zone, E, click on the screen, stop pitch), `navigation/colliders.js`, `ShowroomExperience.jsx` (overlay, pause), `ui/Menus.jsx` (quick-nav entry 11), `ui/Hud.jsx` (zone name), `ui/StaffChat.jsx` + `staff/guide.js` (adviser).

### The world

* **Where:** the inside face of the **left front wing** (x = -22..-14, z = -0.8), the mirror of the Collections wall. It was plain walnut + plaster, outside every bay, clear of the aisles, the planter, the Reception desk and the columns, so it blocks nothing. The hall has no other free wall; every bay and the VIP room are taken (see section 8 for how more stations get slots).
* **Sign:** "Kitchen Design Studio" / "استوديو تصميم المطابخ" with "by YAS WOOD" / "من ياس وود" (the same line as the column plates and Reception), brass border on charcoal like the bay signs; redrawn on a language change.
* **Screen:** 4.8 x 2.7 m (16:9), centre 2.0 m, bronze bezel with a brass cap line, a warm additive halo on the wall and floor (no real light, so no extra shader variants for the hall), and a "Preview of the designer" tag so it is never mistaken for a live session. It cross-fades three real designer screenshots (Layout, Materials in 3D, Summary and quote with real BHD numbers; 6 s hold, 1.1 s fade). It is a **poster**: no second WebGL context, no designer running in the world. Frames load only when the visitor is within 18 m (never at start-up); the low tier shows one still frame; reduced motion shows one still frame.
* **Podium:** walnut body, marble top, brass line, a slanted tablet ("Start designing", "Press E" / "Tap Interact"), a floor halo that fades in near it and pulses on E.
* **Registration:** interaction zone (id `kitchen-studio`, index 11), colliders (the base spans the whole wing like collections, the podium is a peninsula joined to it: no pocket narrower than the walker), quick-nav stop 11 + menu entry (no digit key: only 1..9 have keys), HUD prompt, and a click on the screen / podium opens the designer when standing there or walks there otherwise. The glide arrives looking a little up (`stop.pitch`, a new optional field) so the screen and its sign are in frame. E at the station opens the designer even though the kitchens adviser stands 1.3 m away (she is reached with T or the Talk button).
* **Advisers:** the kitchens adviser opens with two chips ("Walk me to the design studio", "Open the designer"); in any adviser chat "take me to the design studio" glides there, "open the designer" / "start designing" / "plan my kitchen" / "افتح المصمم" opens it. "Custom studio" and "interior designer" are not hijacked. Reception lists the station under "What do you offer?". Every reply passes the guide's guardrails (no digits, currency or promises).

## 3. Approach chosen and the rejected alternatives

**Chosen: (A) a same-origin full-viewport `<iframe>` of the website's own designer route** (`/design-studio/kitchen-planner?src=yas-bloom`), under a slim showroom bar. Nothing is injected into the designer's logic; the parent only shifts the frame, injects one CSS rule and watches.

**Rejected: (B) lazy-importing the designer React components into the showroom chunk.** `KitchenPlannerWizard` is a function inside the 17 000-line `src/App.js`, **not exported**, and it depends on `AppCtx`, the site's i18n, `useLayouts`, the CMS store, the auth modal and ~30 sibling helpers declared in the same module. Using it would need an `export` (an edit to `App.js`, forbidden) and would pull the whole site into the showroom chunk. The only self-contained designer components are the Neo ones (`src/studio/hub/*`), which are a different tool.

| Criterion | (A) same-origin frame | (B) import components |
|---|---|---|
| Same options / features / prices | **by construction** (it is the page) | would need a re-export and the same providers; drift risk |
| Needs an edit outside the allowed dirs | no | **yes** (`export` in App.js): stop rule |
| Showroom bundle | +9 KB gz (the new world / overlay code only) | +hundreds of KB |
| Two WebGL contexts | the designer's context exists only while the frame exists; the showroom render loop is **stopped** meanwhile | both live in one realm, harder to isolate |
| Memory | the frame is **destroyed** on leaving, so the designer's heap, GL context and its CDN three.js are released | stays resident |
| Mobile | works (section 6) | n/a |
| Language | `closets_lang` written before the frame starts; a switch while open clicks the designer's own language button (no design lost), reload only as a fallback | n/a |
| Risk | the frame loads site chrome (handled: header clipped, footer hidden); future header markup changes degrade gracefully | high |

## 4. How the embed behaves

* **Chrome.** Desktop (>= 768 px): the wizard is `height: calc(100dvh - 104px)` under a 104 px margin (`HEADER` in `KitchenPlannerWizard`), so the frame is shifted **up** by 104 px and made 104 px taller: the site header is outside the visible window and the designer fills it exactly. One injected rule (`nav,footer{display:none!important}html{overflow:hidden!important}`) hides the footer and stops page scrolling. Phones: see section 6. If the site's markup changes, the selectors stop matching and the worst case is a footer below the fold; nothing breaks.
* **Readiness.** The frame is polled until the designer has really rendered (three or more buttons under `#root`), not just `load`; a blocked / error page (cross-origin error document) fails after 4 s, a blank one after 25 s. Failure shows a clear message, **Try again**, **Open on the website** (new tab, `rel=noopener`) and Back. QA: the designer URL aborted, then retried successfully.
* **Esc / Back / focus.** The overlay is `role=dialog aria-modal`, everything behind it is `inert` (restored afterwards), Back is focused on open and the frame after load. **Esc** in the showroom bar or inside the designer, the **Back** button and the **browser Back** all return to the showroom; with a design in progress (>= 3 real clicks / keys inside the designer) they ask first ("Keep designing" / "Back to the showroom"; the browser Back puts its history entry back and asks). Esc is ignored while the designer has a real `role=dialog` open; the site's quote form is a plain overlay that ignores Esc, so there the confirmation protects the design. The designer's own **Exit** and a **sent quote** navigate the frame away from the designer route; the overlay notices (route polling) and returns to the showroom.
* **State handoff.** The showroom is never rebuilt: its scene stays in memory, the explorer is only frozen, so the visitor stands **exactly** where they stood (QA compares position, yaw and pitch). The designer is destroyed on leaving, so a re-opened designer starts at step 1. Keeping a half-finished design across a visit is a future option (owner decision 4).
* **Pause / resume.** `engine.stop()` while any overlay state is active (loading, open, confirm, failed); `engine.start()` after (its clock is reset, so no time jump); the tab-visibility handler respects it. QA: 0 showroom frames rendered while open, rendering again after.
* **Language (EN / AR).** The showroom owns language in its URL (`/ar/yas-bloom`), the site in `localStorage.closets_lang`. The language is written before every start / retry, so the designer opens in the showroom's language even when storage said otherwise (tested with `/ar/yas-bloom` and storage = `en`). A switch while open keeps the design (same total, same step in QA).
* **Analytics / consent.** The showroom has no analytics. The designer is the website's own page, so the site's cookie notice and GA4 (only after "accept", stored in the shared `closets_consent`) behave exactly as on the website; the frame URL carries `?src=yas-bloom` so the owner can see sessions that began in YAS Bloom (the site ignores the parameter). Nothing is suppressed or auto-accepted.
* **CSP / X-Frame-Options.** `vercel.json` sets only `X-Robots-Tag` on `/yas-bloom*`; there is no CSP, no `X-Frame-Options`, and no frame-busting code in `App.js` / `index.js` / `index.html`. Same-origin framing works. **If a global `X-Frame-Options: DENY` or `frame-ancestors 'none'` is ever added, the station degrades to the failure screen with the website link; use `SAMEORIGIN` / `frame-ancestors 'self'`.**

## 5. Price parity and verified features (Playwright, `scripts/showroom3d-qa/kitchenstudio.js`)

The same eight choices were made in the frame and on the website route opened directly (same context, same build): default kitchen, Dimensions length 4600, Layout U-shape, one more cabinet module, door finish Veneer, worktop Marble, one more accessory, Summary and quote.

| Step | Embedded frame | Website route |
|---|---|---|
| default | BD 1,472 | BD 1,472 |
| dimensions | BD 1,472 | BD 1,472 |
| layout U-shape | BD 1,472 | BD 1,472 |
| + cabinet module | BD 1,764 | BD 1,764 |
| door finish Veneer | BD 1,924 | BD 1,924 |
| worktop Marble | BD 2,020 | BD 2,020 |
| + accessory | BD 2,080 | BD 2,080 |
| summary | BD 2,080 | BD 2,080 |

The designer-only bill-of-materials / summary text (header and footer excluded) is **identical**. Also verified inside the frame: 2D plan, the 3D view (three.js r128 served from a local copy of the cdnjs file, because the sandbox cannot reach cdnjs), the step bar, the live total bar, "Get quote" opening the website's own quote form pre-filled from the signed-in account ("U-Shape · Veneer · Marble · BD 2,080"), the designer's Exit, EN and AR (RTL).

Not verifiable in this sandbox (the same on the website, so identical by construction, but not exercised): the Room Designer overlay (needs Supabase `design_scenes` and `model-viewer` from jsdelivr), CMS-driven layout content (Supabase blocked: both routes use the hard-coded fallbacks), sending a quote (network), sign-in / sign-up (Supabase auth), the PDF window.

## 6. Phones

Decision: **a full-screen designer** (the station opens it on Tap Interact). Under 768 px the website's wizard is `100dvh` under a 72 px margin, so the frame is not shifted; instead its document is kept scrolled by 72 px (script scrolling works with `overflow:hidden`) which puts the designer's top bar at the top and its Back / Preview / Total / Next bar at the bottom of the screen, and the site header is hidden by the injected rule. The showroom bar is a 52 px strip with "Showroom", the station name, an icon-only "open on the website" link and the language button. QA at 390 x 844 touch: the step bar and the Next button are inside the visible window. Not verified on a real phone (keyboard / safe-area / address-bar behaviour, touch gestures in the 3D view, iOS).

## 7. Performance and memory (software GL only)

Indicative, SwiftShader on a 4-core CPU, JS heap from CDP, `quality=low`:

* Showroom render loop: stopped while the overlay is in any active state; 0 frames rendered during a 1.5 s observation; running again after leaving.
* WebGL contexts: the designer's frame creates one (its 3D view) and it is gone with the frame when the visitor leaves; the showroom keeps its own one throughout (never disposed: rebuilding the hall takes seconds).
* JS heap (CDP `JSHeapUsedSize` after a forced GC): 23 MB with the designer and its 3D view open, 19 MB after leaving (the showroom's own memory is mostly GPU textures, which JS heap numbers do not show; it is neither disposed nor grown by the designer).
* Bundle: the showroom chunk grows from 192.3 to 201.6 kB gzip (+9.3 kB); the `main` chunk is the same size and code (see the PR evidence). The three poster frames per language are 34 to 57 KB, loaded only near the wall; the low tier loads one.
* Real GPUs, thermal behaviour, memory on a phone: **not measured**.

## 8. How to add the next sections

A section = one entry in `designstudio/sections.js` + a slot in `layout.js` `SLOTS` + poster frames + one Playwright check. The zone, collider, quick-nav stop, menu entry, HUD prompt, adviser intents, overlay, pause / resume and tests all read the registry (`enabledSections()`).

1. Copy the `kitchen` entry: `id`, `kind`, `name` EN / AR, `designer.path` (a website route), `adviser`, `poster.base`, `keywords`, `enabled: true`.
2. Give it a slot. The hall has **no further free wall**, so the realistic options are (a) a small "Design Studio" room next to the VIP room (new walls in `hall.js` + colliders, same pattern as `scenes/vip`), or (b) turn the existing left-wing screen into a multi-section wall with a section picker on the podium tablet. (b) is cheaper and is what the registry already supports (`placement()` derives everything from a slot; sections would share the slot and the overlay would take the picked section's route).
3. `node scripts/showroom3d-qa/studio-posters.js` (generalise the three steps per designer) and add the section to the QA script.

### Proposed next sections (estimates are focused working days including tests and QA, owner review excluded)

| Section | Website route | Notes | Effort |
|---|---|---|---|
| Wardrobe Design Studio | `/design-studio/wardrobe-planner` (`WardrobePlannerWizard`, 10 steps, AI allocation) | needs the multi-section wall or a slot; posters from the wizard | 2 |
| TV Unit Studio | `/design-studio/tv-planner` | same pattern | 1.5 |
| Doors Studio | `/design-studio/door-planner` | same pattern | 1.5 |
| Home Office Studio | `/design-studio/office-planner` | same pattern | 1.5 |
| Room Visualizer | `/visualizer` (own app shell, own full-screen, WebGL-heavy photo tools) | its own shell needs no clipping; check its camera / upload permissions inside a frame | 3 |
| Multi-section wall + picker (prerequisite for 2 to 4 above) | n/a | podium tablet shows the sections, one screen | 2 |
| "Use these finishes" deep link from the Collections wall | needs a query hook in the designer | **blocked**: requires a change in `App.js`; out of scope | n/a |
| Keep my design across a visit | needs a save hook in the designer | **blocked** the same way | n/a |

## 9. Owner decisions

1. **Sign-in.** The website only lets signed-in customers use the planner; the station keeps that (the website must stay byte-identical). A kiosk guest mode needs a change in `App.js` (`PLANNER_PAGES`).
2. **Arabic copy.** The Arabic strings (station name, advisers, overlay) are drafts; the name "استوديو تصميم المطابخ" is as requested.
3. **Neo Kitchen Designer.** Open `/design-studio/kitchen-planner` (guided, the owner's list) or also offer `/studio/kitchen` (parametric, own full-screen shell, account-based) as a "pro mode"? One extra registry field and a toggle on the podium; not built.
4. **Keep a design across a visit.** Today leaving destroys the frame (memory); the confirmation protects accidental loss. A saved draft needs a hook in the designer.
5. **Where more stations go** (section 8, option a or b).
6. **Attract loop content.** The three frames show the designer with a sample U-shape kitchen, Veneer doors and a Marble worktop, and real BHD totals (1,472 and 2,080 at the time of writing). They go stale if prices change: re-run `studio-posters.js` after a price change.

## 10. Re-running everything

```
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false src/showroom3d      # whole showroom suite
CI=false node node_modules/react-scripts/bin/react-scripts.js build
node scripts/showroom3d-qa/serve.js build 5055 &
BASE=http://localhost:5055 THREE_R128=<three r128 min.js> OUT=docs/showroom3d/screenshots/kitchen-studio node scripts/showroom3d-qa/kitchenstudio.js    # BEAUTY=1 adds the high-tier shots, ONLY=phone runs the phone part
BASE=http://localhost:5055 THREE_R128=<...> node scripts/showroom3d-qa/studio-posters.js                                                              # regenerate the wall frames
```

## 11. Evidence

### Screenshots (`docs/showroom3d/screenshots/kitchen-studio/`, software GL, honest scores out of 10)

| File | What | Score |
|---|---|---|
| `ks-bay-en-high-front.jpg`, `ks-bay-ar-high-front.jpg` | the station from the stand point, EN / AR, high tier, 1440 x 900 | 8: sign, screen and podium read well, the call to action is clear; the poster frame is a little soft at this distance and the HUD buttons sit over the base |
| `ks-bay-en-high-oblique.jpg`, `ks-bay-ar-high-oblique.jpg` | from the aisle: wing, screen, podium, kitchens bay and adviser | 8.5 |
| `ks-bay-en-high-podium.jpg` | podium close-up | 7.5: the tablet is readable, the marble top and halo are plain |
| `ks-designer-1440x900-step1.jpg`, `-quote.jpg`, `ks-designer-1920x1080-quote.jpg`, `ks-designer-ar-1440x900.jpg` | the real designer in the frame, EN / AR, 1440 and 1920 | 9: it is the website's own UI, and at 1920 x 1080 the plan and the bill of materials use the larger canvas |
| `ks-designer-quote-dialog.jpg`, `ks-designer-leave-confirm.jpg`, `ks-designer-failed.jpg` | the site's quote form, the leave confirmation, the load-failure screen | 8 |
| `ks-bay-phone-390x844.jpg`, `ks-designer-phone-390x844-step1.jpg`, `-step2.jpg` | phone portrait, full-screen designer | 7.5: the designer fits (top bar, step bar, Back / Preview / Total / Next); the step bar scrolls sideways as on the website |
| `ks-website-1440x900-quote.jpg` | the website route opened directly, same choices (compare with the framed one) | reference |

Iterations on the weakest: (1) the first front view was keystoned and cramped (screen centre 2.2 m, arrival pitch 0.17) and the base rendered black: screen lowered to 2.0 m, pitch 0.12, emissive walnut base; (2) the podium stood in front of the screen's call to action and the floor halo was a hard rectangle: podium moved 2.35 m toward the glass wall, halo is a soft pool; (3) on phones the designer's bottom bar was cut off and the bar overflowed: the document is kept scrolled by the site header height, the bar is icon-only below 768 px.

`kitchen-studio-qa.json` holds every check with its numbers (38/38 pass) and both runs' totals.

### Production safety (add-only)

* `git diff origin/main...HEAD` by top-level directory: `docs/showroom3d`, `public/yas-bloom`, `scripts/showroom3d-qa`, `src/showroom3d` only; nothing else (`git diff origin/main --stat` outside those directories is empty). `src/App.js`, `src/index.js`, `vercel.json`, `package.json` and every other website file are byte-identical to `main`.
* Build vs a `main` build (same `react-scripts build`): 433 of 439 files are byte-identical, including **every non-showroom CSS file** (`main.6582cfed.css` and the 14 chunk CSS files, md5 equal) and every other JS chunk. The differences are the `showroom3d` JS / CSS chunk, `index.html` and `asset-manifest.json` (only the file name of `main.js`), `main.js` (**25 bytes**: its file name in the licence comment, the showroom chunk's JS and CSS hashes in the chunk map, and the module id of the lazy showroom import; same size, 2 149 895 bytes) and the 7 new poster files.
* Main JS chunk size: **508.21 kB gzip, unchanged**; showroom chunk 192.32 -> 201.6 kB gzip (+9.3 kB, loaded only on `/yas-bloom`), showroom CSS 9.51 -> 10.02 kB.
* Pixel comparison, `scripts/yas-bloom-regression.js` (reduced motion, animations frozen, 3 samples each, main vs branch), desktop 1440 x 900, EN: `/`, `/kitchen`, `/services`, `/booking`, `/contact`, `/design-studio/kitchen-planner` (signed-out gate): **0 differing pixels** main-vs-main (the baseline), branch-vs-branch and main-vs-branch for every page (the sandbox cannot reach Supabase, so /services, /booking and /contact render without their remote content in both builds).
