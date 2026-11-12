# Virtual Showroom 3D: architecture (Phases 0 to 3, Phase 4 furnishing, Phase 5 interaction core)

Route: `/showroom-3d` and `/ar/showroom-3d` (noindex, own lazy chunk, own full-screen shell like `/visualizer`).
Status: **Phase 0 (this doc), Phase 1 (architectural environment), Phase 2 (cinematic intro, loader, hand-over), Phase 3 (first-person roaming, collision, department quick-nav), Phase 4 (Kitchens, Wardrobes, Doors furnished as procedural, animated sample configurations + the Ikhtarha stage), Phase 5 interaction core (focus, picking, panel, finishes, LED, quotation hand-off).**
The other five departments are still empty ("to be furnished"). Phases 5 (favourites / backend quote workflow), 6 and 7 are not built (see the end).

## Honest scope statement

- **There are no GLB / Blender / photographic assets in this build.** Every surface, tree and fixture is *procedural*: geometry
  from three.js primitives, PBR textures drawn on canvas from seeded noise (`src/showroom3d/3d/textures.js`).
- It is **not photoreal** and should not be presented as such. It is a clean, lit, architecturally plausible stylised model.
  Swapping in authored GLBs later is a drop-in per scene module (see `assets/README`-style notes below).
- **Phase 4 furnishes three bays only** (Kitchens, Wardrobes, Doors) with procedural, parametric, animated products labelled "Sample configuration" on the signs and in the panel. The other five bays are **still empty and labelled "To be furnished"**.
- **Real photorealism needs authored GLBs with baked lighting** (Blender / DCC, baked AO + lightmaps, photographed or scanned materials, KTX2 textures). This build does not claim it and does not approximate it with tricks: it is a clean real-time PBR model. Two AI-generated single-mesh GLB models exist elsewhere in the project; they are **not used here** (a single fused mesh cannot open a drawer, swap a finish or switch an LED, which is the point of this phase).
- The only non-procedural asset is the **owner-supplied official logo** (`assets/the-closets-logo-official.jpg`), used unaltered.

## Stack decisions

| Question | Decision | Why |
|---|---|---|
| three.js | Keep the existing `three@0.160.0` | already a dependency; Jest/CRA already configured for it |
| React Three Fiber / drei | **Not added** | The experience is an imperative, camera-timeline-driven scene with its own render loop, adaptive resolution and disposal. R3F adds ~150 KB+ and a React reconciler for a scene whose state is a few scalars (door, light level, camera). It also needs ESM-only helpers that CRA's Jest cannot parse (the repo already stubs `three/examples/jsm`). Vanilla three keeps the pure logic unit-testable. R3F/drei can still be adopted in Phase 4 for the product configurator UI if wanted. |
| GSAP | **Added, `gsap@3.13.0`** (exact pin) | Brief asks for GSAP camera animation. One paused master timeline (`cinematic/director.js`); only loaded in the showroom chunk. GSAP's "no charge" standard license applies; the owner should confirm it is acceptable for the commercial site. |
| TypeScript | **Stay JS (JSDoc where useful)** | The whole app is JS. CRA 5 supports TS, but adding `tsconfig.json` + `typescript` + fork-ts-checker changes the build for every page and slows it, for one feature. |
| Tailwind | **Not added** | CRA 5 needs PostCSS plumbing and a global preflight that can restyle existing pages. We use plain CSS with the site's design tokens instead. |
| Colours | `src/showroom3d/3d/palette.js` is the **only** file with colour literals | brand colours are sampled from the official logo; DOM CSS reads `--sr-*` variables generated from it; spacing / radius / fonts use `--space-*`, `--radius-*`, `--font-*` tokens |
| i18n | `src/showroom3d/strings.js` (`{en, ar}` per key), same pattern as the Visualizer's `strings.js` | the shell does not load `App.js`'s dictionary; language comes from the URL (`/ar` prefix, `ENABLE_AR_URLS`) |
| 2D fallback | `src/safety/WebGLGate` + `ui/Fallback2D.jsx` | same gate the other 3D sections use; also catches a runtime start failure |

## Folder structure

```
src/showroom3d/
  ShowroomRoot.jsx          shell (lang, noindex meta, WebGL gate)   <- lazy-imported from src/index.js
  ShowroomExperience.jsx    canvas + engine + director + overlays
  route.js                  SHOWROOM_PATH_RE (shared by index.js and tests)
  strings.js  logo.js
  3d/        engine, quality tiers, loading progress, palette, noise, textures, materials, sky/IBL, vegetation, geometry helpers
  cinematic/ timeline.js (pure data + math)  director.js (GSAP)
  navigation/ Phase 3, pure JS unless noted:
              colliders.js (2D circle vs AABB / OBB / circle, sub-stepped sliding, door state)  walker.js (speed, smoothing, head-bob)
              navgraph.js (department route graph, Dijkstra)  interaction.js (bay zones)  lookAround.js (yaw / pitch helpers only)
              explorer.js (DOM + engine glue: keys, pointer lock, drag fallback, touch input, GSAP glide, QA hooks)
  ui/        LoadingScreen, IntroLayer, Hud (top bar, guidance, prompts), TouchControls (joystick / look / interact), Menus (department sheet,
             pause menu, coach marks), useDialog (focus trap), Fallback2D, LogoImg, showroom.css
  scenes/
    exterior/   facade (stone shell, glazing, roof slab, fins, logo wall), landscape (site, pools, lawns, palms, hedges, skyline)
    entrance/   sliding glass doors
    main-hall/  hall (floor, walls, ceiling, beams, LED lines, pendants), bays + signs + departments data
  assets/    the-closets-logo-official.jpg
  __tests__/ 109 Jest tests (pure logic + UI)
```

## What is built

**Exterior / environment (Phase 1)**: stone-clad single-storey volume with a double-height hall; 28 m bronze-framed glass curtain
wall with mullions and transoms; 6 m cantilevered roof slab with soffit downlights; timber-fin wing; lit logo wall; two raised
reflecting basins; paved forecourt and approach path; lawns, clipped hedges, date palms (1 trunk draw + 1 merged frond draw for all
palms), olive trees, bollard lights, hazy skyline. Golden-hour sky dome (gradient, sun, fbm clouds) also baked into a PMREM
environment map. Sun is a shadow-casting directional light (2048 / 1024 map by tier); glass does not cast, so sun patches
land on the hall floor. ACES filmic tone mapping, sRGB output, exponential fog.

**Hall**: 44 x 36 x 9.6 m, polished limestone floor (clearcoat, roughness + normal maps), walnut/oak-slat walls, plaster upper
walls with a daylight slot, timber cross beams, 7 recessed LED lines with additive glow, three suspended light bars, lit logo wall,
two planted-free stone benches, two olive planters. Interior lights ramp up as the doors open.

**Departments**: 8 bays (4 per wall): Kitchens, Wardrobes, Walk-in Closets, Bedrooms, Doors, Living, Custom Studio, Consultation
Lounge. Each is an empty zone: floor inlay, brass border, timber portal, lit alcove, bilingual sign with "To be furnished".
Layout data is in `scenes/main-hall/departments.js` (reused by collision / interaction in Phase 3).

**Cinematic (Phase 2)**: 27 s master clock. logo on cream veil -> veil lifts on an exterior crane shot -> approach -> doors slide
open (13.2 to 16.4 s, never crossed before fully open: unit-tested) -> into the hall -> eases to the hand-over pose. Camera path is a
non-uniform cubic Hermite through keyframes (continuous velocity, rests at both ends). GSAP tweens drive doors, light level and veil;
captions / shot ids are pure functions of the clock so seeking is deterministic. **Skip intro** = cream wash, jump to end state,
wash away (no hard cut). Letterbox bars during the intro.

**Loader**: real weighted progress (`3d/progress.js`): logo, fonts, each procedural texture, environment, exterior, hall, shader
compile, first frame. Monotonic; shown as a percentage with an ARIA progress bar.

**Hand-over**: the intro ends on the spawn pose (0, 1.65 m, -9, looking down the hall) and the first-person explorer (Phase 3, below) takes over seamlessly.

**Quality tiers** (`3d/quality.js`): `high` (desktop), `medium` (tablet / weaker desktop), `low` (phones, data-saver, software GL).
Differences: pixel-ratio cap, shadow map, MSAA, point lights, palm count, texture size, normal maps, clouds, floor material.
Override with `?quality=high|medium|low`. Adaptive resolution lowers the render scale (to 0.5) below ~24 fps and recovers above ~55.
**Reduced motion**: no intro; the finished scene (doors open) is shown immediately; "Play the cinematic intro" is offered.

**Logo**: the owner's raster JPG has an off-white background. In 3D it is the face of the lit logo panels. In the DOM it is
colour-to-alpha keyed once on a canvas (every kept pixel keeps its colour; nothing is traced or redrawn) and shown multiplied until
the keyed copy is ready. **A vector SVG or PNG with alpha is still needed for production** (edges are only as good as the JPEG).

## Phase 3: first-person roaming (what is built)

**Desktop**: W A S D and the arrow keys; Shift = jog; mouse look through Pointer Lock (click the scene; a hint says so). If the lock is refused or
unsupported (or fails twice) it falls back to drag-look and says so. E = interact (stub, below). 1 to 8 = glide to a department. Esc, or the
browser releasing the lock, opens the pause menu (resume, departments, replay intro, language, head-bob on/off, show tips, back to website).
Keyboard-only turning: `,` and `.` (or Alt + Left / Right). Dialogs move focus in, trap Tab, close on Esc and give focus back.

**Mobile**: floating virtual joystick (left half; rim of the stick = jog), touch look (right half), a round Interact button, a Departments button
that opens a bottom sheet and glides the camera (GSAP) to the bay entrance. Each gesture owns its element with pointer capture and
`touch-action: none`, so page scroll / pinch never see it and both thumbs work together; a second finger in the same zone is ignored.
Layout honours `env(safe-area-inset-*)`; `viewport-fit=cover` is added while the showroom route is mounted and restored on leave. Joystick left /
look right / interact right are **physical** (thumbs do not mirror in RTL); the top bar and all text mirror in Arabic.
The control scheme follows the last input device (touch overlay for fingers, keyboard + mouse otherwise).

**Movement**: 1.4 m/s walk, 2.5 m/s jog, velocity eased with a ~0.11 s time constant (no instant start / stop), eye height 1.65 m, head-bob
(+-1 cm vertical, 1 cm sway, one dip per 0.78 m step, driven by distance actually travelled so it stops against a wall). Bob can be turned off in
the menu (remembered) and is forced off for `prefers-reduced-motion`, which also makes department jumps instant.

**Collision** (`navigation/colliders.js`, pure JS, no three.js): the walker is a circle of radius 0.35 m (camera near plane is 0.15 m, so the lens
cannot poke through anything). Obstacles are AABBs, OBBs and circles; a move is cut into sub-steps of <= 0.0875 m and pushed out of every obstacle
after each one, so the circle slides along walls, rounds corners, and cannot tunnel at any dt (a 400 m step is unit-tested against a 0.3 m wall).
Built from the real scene: building shell, solid front wings, glass curtain wall (the doorway is a 3.2 m gap that is solid again if the doors are
closed, e.g. during the replayed intro), both benches, both planters, the 16 bay portal posts, and outside the reflecting basins, olive planters,
hedge rows, kerbs and an end stop on the approach path 36 m from the facade. **There are no pillars in the hall and the roof beams are at 9.4 m, so
neither needs a collider** (the module supports circles / OBBs for when Phase 4 adds fixtures). The exterior walkable area is the paved forecourt
(49 x 22 m) plus the first 14 m of the approach path.

**Department glide**: `navgraph.js` holds a small graph (street, gate, forecourt, door, lobby, two lanes between benches and bays, one stand point
per bay 3.5 m in front of its inlay, lanes round the basins and olive planters). From any standable point the route goes to the nearest node with a
clear line, then Dijkstra to the bay; tests check every edge is collision-free, every bay reachable from a 3 m grid of the whole walkable area, and
that the collision-checked walker can follow every route. GSAP eases along the polyline and settles yaw / pitch so the sign, the alcove and the floor
zone are in frame. Movement input cancels a glide.

**Interaction (stub)**: each bay has a zone (its floor plus 4.6 m of nave). Standing in it shows a "Press E / Tap Interact" prompt and a soft
highlight on the floor inlay; E pulses the highlight and shows "products arrive in a later release". E outside a bay explains what to do. Real
product interaction is Phase 5.

**Coach marks / guidance**: first visit shows a three-tip card (desktop or touch wording, EN / AR), stored in localStorage
(`closets_showroom_coach`); "Show tips" in the menu brings it back. A bottom hint explains the controls and fades after the visitor starts moving.
No minimap (not cheap enough to be worth it yet).

**Inside faces of the two front wings** were an unlit black box (nobody could stand near them before); they now carry the same walnut + plaster finish
as the side walls.

### QA hooks and scripts

`?debug=1` adds `window.__showroom.explore`: `pos() yaw() pitch() speed() camY() zone() state()`, `teleport(x, z, yaw, pitch)` (collision-resolved)
and `sim(seconds, {fwd, right, jog}, step)` which runs the *same* Walker + collision code as the frame loop without needing frames (SwiftShader is
~2 fps, so wall-clock walking would take minutes). In debug mode GSAP lag smoothing is off so glides take their real time.
`scripts/showroom3d-qa/phase3.js` (Playwright, headless Chromium on SwiftShader; serve a build with `scripts/showroom3d-qa/serve.js`) runs 101 checks:
real key presses, 14 wall / bench / planter / post / glass / corner collisions, large-dt and 150 fuzzed random walks, out through the doors and back,
glide to all 8 bays (from the spawn and from the street), pause menu focus trap, pointer lock denied / granted / real, 390x844 touch joystick with CDP
multi-touch, pinch / swipe not zooming or scrolling, EN + AR layouts, reduced motion. Screenshots: `docs/showroom3d/screenshots/phase3-*`.


## Phase 4: the furnished departments (what is built)

Three bays are furnished as **sample configurations**: Kitchens (island + wall run), Wardrobes (sliding + hinged + smoked-glass doors, drawers), Doors (pivot door in a
fluted wall with a swatch board). Everything is generated in code (no GLB, no photographs).

**Parametric, separate meshes (`scenes/products/kit.js`).** Every part that can move is its own mesh in its own group, so it really moves:
- *drawer*: bevelled front panel (grain along the width) + a separate body (sides, back, bottom, tray dividers) that slides out along +X on its own travel, brass L-profile finger pull on the front, in-drawer LED strip + light wash on the drawer floor.
- *hinged door*: leaf swings about a vertical hinge axis (either hand, 105 to 112 degrees), concealed-hinge cups on the inside face, optional smoked glass in a bronze frame (frame + pane are separate meshes).
- *sliding leaf*: translates along the front on its own track (two leaves on two rails, so they pass each other like the real thing).
- *pivot door*: swings about an off-centre vertical axis (about 100 degrees), brass pull bars on both faces on stand-off posts, floor pivot plate and head cap.
- static carcass, worktop, plinth, tracks and trims are merged **per material** (one draw call each).

**Kitchen**: waterfall stone worktop as ONE U-profile extrusion with a continuous vein coordinate over the edge, sink cut-out (real hole in the slab) with steel basin and brass gooseneck tap, induction hob glass, brass hood, handleless fronts with slim brass finger pulls, fluted feature wall (real reeded geometry with baked groove darkening), under-cabinet LED + splashback wash, plinth LED, pendants, stools tucked under the overhang, 9 interactive parts (7 drawers, 2 pairs of doors).
**Wardrobe**: 10 interactive parts (2 sliding, 2 hinged, 2 smoked-glass, 4 drawers), hanging rails with garment silhouettes on hangers, shelving with edge banding and folded linen, boxes, bags and shoes, vertical LED strips that fade up as each section opens, bronze or brass metal by finish.
**Door**: pivot leaf, brass reveal around the opening, lit room beyond (console, lamp, art, plant), swatch board with the 4 finishes (static materials that never change, so a swatch always matches its label), rug, bench.
Detail level: bevel on every edge (so highlights catch), grain direction chosen per panel (UV projection puts the grain along the long axis of drawer fronts and along the height of doors), edge-banding strips on shelves, hinge cups, runners are not modelled (not visible in a closed or open drawer).

**Materials (`3d/pbr.js`, `scenes/products/materials.js`)**, all procedural and tileable: timber with the grain along U (oak: straight with open pores; walnut: denser, deeper), polished veined stone in three variants (white with grey + thin gold veins, dark, sand; domain-warped ridged noise on a diagonal), brushed brass / bronze (roughness streaks + normal along U, `MeshPhysicalMaterial.anisotropy`), matt lacquer orange-peel normal, woven rug, hob glass, smoked glass (**transmission on the high tier**, alpha-sorted depth-write-off glass on medium / low). Finishes swap **parameters** on existing materials (maps, colour, roughness), never the shader program, so there is no recompile hitch. Finish names are descriptive labels, not a catalogue.
**Light**: a generated warm interior environment (ceiling strips, daylight window, bounce floor; PMREM) is the reflection source for furniture, so brass and stone reflect a room instead of the outdoor sky. ACES filmic, sRGB output (unchanged). Each bay has a lowered plaster canopy with a lit cove, recessed downlights and a wall wash. **One** moving key spot light follows the visitor to the nearest bay / the stage (shadow-casting on medium and high with tuned bias / normalBias), plus one fill point light; nothing else casts shadows beyond the existing sun. Baked contact-shadow decals sit under every piece, additive wash decals fake the light spill of LEDs. **Restrained bloom on the high tier only** (lazy chunk: half-float MSAA target, `UnrealBloomPass` strength 0.16, threshold 1.6, `OutputPass` for tone mapping). Not used: SSAO / GTAO, RectAreaLight, screen-space reflections (cost / compatibility), so contact darkening is baked decals and vertex-colour AO, not real.
**Staging**: plinths, a fluted feature wall in each bay, canopy with cove and downlights, plants, vases, books, tableware, fruit, stools, garments, bags, shoes, boxes, a rug, a console with a lamp and art, signage ("Sample configuration" with a brass marker; the five other bays keep "To be furnished" with the orange marker).
**Quality tiers** (`3d/quality.js`, products read `tier`): `high` = 1024 px timber, 512 px stone, anisotropic metal, clearcoat, key-light shadow 2048, point fill, transmission glass, bloom; `medium` = 512 px, shadow 1024, anisotropy on, no bloom, alpha glass; `low` = 256 px, no normal maps, no clearcoat, no anisotropy, no shadow-casting product light and no fill light (one spot only), alpha glass. Product groups hide when the visitor is outside the hall; props hide beyond 20 m from a bay.
**Collision**: `navigation/productColliders.js` adds solid footprints for the kitchen run + island (the aisle is filled in), wardrobe, door wall + bench + plants, and the Ikhtarha platform + screen. Boxes run the full bay width (no gap narrower than the 0.7 m walker, which would jam the sliding circle); unit tests walk random long moves and every department stand point stays free.

## Phase 5 (interaction core)

Standing in a furnished bay (or at the Ikhtarha stage) shows "Press E" / "Tap Interact". **E / Interact** glides the camera (GSAP, 1.0 to 2.4 s, instant under reduced motion) to the product overview, suspends walking, shifts the view so the product stays centred in the part of the screen the panel leaves free (`camera.setViewOffset`; mirrored in RTL, vertical on phones), and opens the panel:
- name, "sample configuration" kicker, honest spec lines (only existing site facts: made to measure, designed / made / fitted in Bahrain, the **10-year cabinetry and soft-close hardware warranty** from `content/facts.js`, the door FAQ hardware wording; **no prices, dimensions, lead times**), a note that final sizes, materials and price come from a quotation;
- one button per part (`aria-pressed`, "open / closed"), Open all / Close all, an LED switch (`role="switch"`), 4 finish swatches (`radiogroup`, visible name), view chips (overview / island / inside the drawers / handle and LED close-up ...), a live region announcing each toggle;
- **Request a quotation**: a plain link to the existing `/booking` page (or `/ar/booking`) built by `products/quote.js`: `?interest=Kitchen|Wardrobe|Doors&source=showroom-3d&finish=<id>&notes=<sample configuration, product, finish>`. `src/pages/BookingPage.jsx` now **pre-fills** its interest select and notes box from those two parameters (unknown interests are ignored, notes are sanitised and capped at 600 characters); the visitor still reviews and submits the form. **Nothing in the showroom writes to the backend**; a Playwright check asserts no supabase / rpc / rest request is made by any showroom interaction.
- **Picking**: raycast against the registered hit meshes only (front + pull of each part). In focus mode: pointer hover outlines the part (one line-segments draw call) and a click / tap works it; a drag nudges the view a little. While walking: the crosshair (pointer lock) or the pointer (drag-look mode) hovers within 4.2 m and a click works the part; on touch, a quick tap on the scene works it within 4.6 m. Keyboard: Arrow keys move the focus ring between parts, Enter / Space works it, L = LED, F / Shift+F = finish, V = view, Esc = back (Esc closes the focus first, it does not also open the pause menu); keys that land on a panel button are left to the button.
- Reduced motion: no glide, parts snap open / closed, LED switches instantly, no panel animation. EN / AR strings for everything (`strings.js`, `products/catalog.js`, `products/finishes.js`); RTL moves the panel to the left and mirrors the view shift.

## Ikhtarha (اختارها) campaign integration

What exists in the codebase (inspected): `src/campaign/IkhtarhaRoot.jsx` (the game: name + quotation number + code -> server validation -> 3D wardrobe -> choose a box -> server draws the reward; `BRAND` = purple `#4A2C82` / teal `#23807C` kit, slogans), `HomeCampaign.jsx` (home poster copy, steps, CTAs, fine print; "public materials never name prizes or values"), `wardrobe3d*.js` (the game's own renderer), `api.js` (Supabase RPCs `ikh_*`, plus a no-backend `/campaign/ikhtarha/demo` mode), public brand kit under `public/brand/ikhtarha/`.
What the showroom does with it (**reuse only, nothing invented**):
- A **hero stage in the middle of the nave** (the first thing in view from the hand-over pose): round platform with a teal LED ring, three closed gift boxes in white / teal / mint with ribbons (the campaign illustration's own motif, built procedurally), a suspended LED halo and a two-sided screen blade. Front: the campaign's own `hero-wide.jpg` + `logo-light.png` + slogan + title; back: the three "how it works" steps and the fine print. Colours are the kit's (`palette.js` `ik*`, mirrored from `BRAND`).
- Copy lives in `products/campaignCopy.js` and is **copied verbatim from `HomeCampaign.jsx` / `IkhtarhaRoot.jsx`**; a unit test checks every EN and AR string against those source files and that the copy contains **no digits, prizes, values or dates**.
- E at the stage opens the Ikhtarha panel (title, lead, three steps, fine print) with the campaign's CTAs: **Price & pick your box** -> the existing `/booking` page (the same destination as the home poster's button), **I have a code, play** -> `/campaign/ikhtarha`, **Try a sample game** -> `/campaign/ikhtarha/demo` (the campaign's own no-backend sample). The campaign shell is a separate app shell (not localised by URL), so those two links are not `/ar` prefixed; the page picks its language from `?lang=` / the stored language.
What is **not** there / placeholders (stated plainly):
1. The showroom does **not** call `ikh_landing`, so it does not know whether the campaign is live; the stage is always shown and the campaign page itself shows its closed / not-open messages. A one-line follow-up is to reuse `useIkhLanding()` from `HomeCampaign.jsx` to hide the stage when the campaign is not live (it is a read-only RPC; left out here to keep the showroom free of backend calls).
2. **Dates and prizes are deliberately absent** (dates are a CMS-editable campaign setting; prizes are never public). Nothing marks a placeholder on screen because nothing is faked.
3. The campaign uses the Alexandria font (Google Fonts) which the site does not self-host; the stage uses the site's IBM Plex Sans Arabic / Inter instead, so the type is close but not identical to the campaign page.
4. No authored 3D gift-box model or vector logo exists in the repo; the boxes are procedural and the logo is the existing PNG (edges are as good as the PNG).
5. A QR code for the showroom exists only as the placeholder box in the print poster; none is generated here.

## Integration touch points (outside `src/showroom3d`)

- `src/index.js`: `isShowroomPath` + `React.lazy` + one render branch (about +480 bytes in the main bundle).
- `vercel.json`: rewrites for `/showroom-3d`, `/ar/showroom-3d` to the app shell; `X-Robots-Tag: noindex`.
- `scripts/seo-build.js` (robots Disallow) and `scripts/seo-check.js` (route check).
- `package.json` / lock: `gsap@3.13.0`.
- No existing page was changed. **No link to the showroom was added to the site** (App.js is one 17k-line file; a footer or nav link is
  a one-line follow-up once the owner approves the entry point).

## Testing

`npx react-scripts test` : **300 tests pass in 30 suites, whole repo** (Phase 4/5 adds animation state machine, finish config, quote URL builder + booking prefill round trip, pickable registry, catalog / EN-AR strings / campaign-copy-vs-source checks, geometry builders (bevel, grain UVs, fluted panel), the kit's drawer / hinge / slider transforms and LED, explorer focus / keyboard / pointer / touch, panels EN + AR, product colliders). Earlier: 209 tests (52 from Phases 0 to 2, 57 from Phase 3). Phase 0 to 2 suites cover timeline integrity, quality tier selection and adaptive scale,
loading progress, department layout, strings (EN/AR parity), look-around maths, noise/tiling, GSAP director seek/finish/reset,
route regex, loader / fallback UI. Phase 3 adds colliders (circle vs box / OBB / circle, sliding, corners, large dt, spawn validity, door states,
fuzzed bounds), navgraph (every bay reachable, every edge clear, walked routes), walker (speeds, smoothing, bob, reduced motion), explorer (keys, pause,
pointer lock fallback, glide, interaction) and the overlays (focus trap, EN/AR, joystick). Visual QA: Playwright + SwiftShader screenshots in `docs/showroom3d/screenshots/`.
Debug hooks: `?debug=1` exposes `window.__showroom` (`seek(t)`, `info()`, `state()`); `&at=SECONDS` holds the intro at a time;
`&aa=0` disables MSAA (SwiftShader shows MSAA artefacts on the logo panel; they are absent with `aa=0` and on the low tier).

## Phase 4/5 measurements and QA (SwiftShader, CPU: say nothing about real GPUs)

`scripts/showroom3d-qa/phase4.js` (Playwright + headless Chromium; flows, rest, reduced, mobile, ar, stats, gallery). Results this run: kitchen flow (9 parts opened individually, Close all, hover outline, click picking on the pulled-out drawer, keyboard, LED off, 4 finishes with 4 distinct material states, quotation link, real `/booking` page pre-filled) all passed; wardrobe + door + Ikhtarha flow 28/28; reduced motion 5/5; mobile 390x844 12/12; AR / RTL 7/7; gallery no page errors. One kitchen check ("no backend request") was mis-scoped (it counted the booking page's own reads after navigation) and was fixed to count only requests from the showroom page; the wardrobe / door / stage flow, mobile and AR runs assert **zero** supabase / rpc / rest requests and passed; the kitchen flow was not re-run after that fix. Flows run at `scale=0.5` (debug switch) because software GL is slow; the gallery and stats run at full resolution.
Draw calls / triangles per frame (`renderer.info` summed over every pass incl. shadow + bloom, 1280x720):
| tier | spawn | kitchen | wardrobe | door | stage |
|---|---|---|---|---|---|
| low | 293 / 99k | 369 / 149k | 374 / 149k | 272 / 96k | 289 / 113k |
| medium | 331 / 135k | 442 / 198k | 436 / 202k | 316 / 135k | 327 / 149k |
| high | 345 / 139k | 618 / 293k | 616 / 297k | 330 / 139k | 341 / 153k |
(Phase 3 hall alone was about 116 calls / 53k triangles.) High is heavy because the key spot's shadow pass re-draws every caster and bloom adds passes; the 700-call budget check passes. These numbers are not a performance claim: real GPUs / phones are untested.
Bundle (gzip): showroom chunk 66.2 kB (Phase 3 build: about 30 kB), lazy bloom chunks about 17 kB (loaded only on the high tier), main bundle unchanged (160.9 kB), BookingPage chunk 4.4 kB. `CI=true` build still fails only on the 12 pre-existing mini-css "Conflicting order" warnings (count unchanged, no new warnings).
fps under SwiftShader at 1100x640 / 960x540 is 0.3 to 3 fps depending on tier; meaningless for real GPUs.

## Honest visual assessment (Phase 4)

Self-score against luxury archviz: **about 4 / 10**. What works: believable proportions, real opening drawers / doors / sliders with the right motion, readable grain direction, bevel highlights on pulls and edges, brushed brass, veined stone, fluted walls, lit interiors that respond to the LED switch, coherent staging. What is clearly not archviz: no global illumination or real AO (contact shadows are baked decals), flat procedural albedo, stylised plants and garments, the key-light pool and bloom can blow out brass up close, floor sun stripes from the Phase 1 facade dominate the kitchen, pale oak reads slightly yellow, no reflections of the products in the floor. Iterations done (about six passes on lighting and materials): oak desaturation and deeper walnut, interior environment contrast, wall-wash and key-light intensity per bay, canopy brightness, fluted-groove AO, neutral door wall, bloom threshold and strength, door close-up camera.

## Unverified

Real devices and GPUs (frame rate, thermals, memory, shader compile on iOS), screen readers (ARIA roles and live region are present but not tested with VoiceOver / NVDA / TalkBack), a native Arabic review of every new string, touch on real hardware (Playwright touch only), the Ikhtarha campaign being live, and any visual check on Safari / Firefox.

## Not built (Phases 5 backend, 6, 7 and furnishing the other five departments)

4 (continued) furnishing the other five departments (walk-in closets, bedrooms, living, custom studio, consultation lounge).
5 (remaining) favourites and a quote workflow to the backend (today the quotation button only links to the booking page). 6 sound, analytics, deeper EN/AR review (Arabic copy needs native review).
7 production assets (GLB, baked lighting), performance budget on real devices, a11y pass for 3D navigation.

## Known issues / risks

- Not photoreal; trees and palms are stylised, the facade glazing grid is heavy, the hall benches read as plain slabs.
- Performance measured **only under SwiftShader (CPU)**: Phase 2 numbers 1440x900 high 0.47 fps, low 1.2 fps; 390x844 low 4 fps. Phase 3 roaming at
  960x540: low tier 2.6 fps, high tier 1.6 fps; 390x844 low 2.7 fps (requestAnimationFrame rate, includes the QA harness). These say nothing about real
  GPUs. Needs profiling on real phones before launch. The collision step costs one sub-step per frame at walking speed (microseconds).
- Phase 3 is untested on real devices, real GPUs, real touch hardware (iOS Safari pointer-event / safe-area behaviour) and screen readers. Arabic
  copy still needs native review. The approach path ends at an invisible stop 36 m out.
- Texture generation runs on the main thread (about 1 to 3 s on desktop CPUs); a worker / OffscreenCanvas would remove the jank on low-end phones.
- Pre-existing: `CI=true` build fails on 12 mini-css-extract "Conflicting order" warnings from the studio `neoKitchen` CSS
  (cause: ~10 studio files import the same CSS files in different orders, e.g. `workspace.css` vs `workspace3d.css`). Not fixed here: a safe
  fix means choosing a cascade order for the studio designers, which cannot be verified visually in this task.
