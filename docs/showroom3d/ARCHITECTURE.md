# YAS Bloom (virtual showroom 3D): architecture (Phases 0 to 3, Phase 4 furnishing, Phase 5 interaction core)

Route: **`/yas-bloom` and `/ar/yas-bloom`** (brand **YAS Bloom** / **ياس بلوم**; noindex until the owner decides, own lazy chunk, own full-screen shell like `/visualizer`). The former `/showroom-3d` and `/ar/showroom-3d` (with sub-paths) redirect to them (`vercel.json` redirects; `src/index.js` also replaces the URL client-side for hosts without that rule). The site shell links to it from the mega-menu column "Room visualizer" (`🌸 YAS Bloom` / `🌸 ياس بلوم`, target `yb:`). Robots Disallow, the `X-Robots-Tag: noindex` header and `seo-check` know the new path. Source attributes in booking links stay `showroom-3d*` (analytics continuity).
Status: **Phase 0 (this doc), Phase 1 (architectural environment), Phase 2 (cinematic intro, loader, hand-over), Phase 3 (first-person roaming, collision, department quick-nav), Phase 4 (Kitchens, Wardrobes, Doors furnished as procedural, animated sample configurations + the Ikhtarha stage), Phase 5 interaction core (focus, picking, panel, finishes, LED, quotation hand-off).**
**Phase 5b furnishes the other five departments (Bedrooms, Walk-in Closets, Living, Custom Studio, Consultation Lounge) and adds a 9th room, the VIP Meeting Room (investor / partner boardroom).** All eight bays are furnished; nothing is "to be furnished" any more. Favourites / backend quote workflow, sound and production assets are not built (see the end).

## Honest scope statement

- **There are no GLB / Blender / photographic assets in this build.** Every surface, tree and fixture is *procedural*: geometry
  from three.js primitives, PBR textures drawn on canvas from seeded noise (`src/showroom3d/3d/textures.js`).
- It is **not photoreal** and should not be presented as such. It is a clean, lit, architecturally plausible stylised model.
  Swapping in authored GLBs later is a drop-in per scene module (see `assets/README`-style notes below).
- **Phases 4 + 5b furnish all eight bays** (Kitchens, Wardrobes, Walk-in Closets, Bedrooms, Doors, Living, Custom Studio, Consultation Lounge) with procedural, parametric, animated products labelled "Sample configuration" on the signs and in the panel, plus the **VIP Meeting Room**.
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

## Phase 5b: the five remaining departments (what is built)

Same kit, materials, lighting, baked AO decals, leaf-card props and interaction system as Phase 4 (`scenes/products/kit.js`, `materials.js`, `stage.js`, `props.js`), plus new shared helpers (`furnish.js`: carcass shells, rails with garments, sofa / chair / table / pouf builders; `screens.js`: canvas wall screens redrawn on language change). Every part is a separate mesh that really moves; every department has the E / tap Interact focus, panel with one button per part, LED switch, 3 to 4 finishes, views, quote link, raycast picking, keyboard, reduced motion, EN / AR with RTL, colliders and a nav-graph stand point.

| Dept (bay) | Furnished as | Moving parts (all registered, panel + picking + keyboard) |
|---|---|---|
| **Bedrooms** | one styled room: upholstered headboard of five padded channels and a floating bed (mattress, duvet, pillows, throw, bench), two floating bedsides with lamps, a dressing unit with a framed mirror and backlit halo, a wardrobe wall (fluted fronts, rails, garments, shelves, LED), oak plank floor, rug | 2 double-door sections, 4 bedside drawers, 2 dressing-unit drawers |
| **Walk-in Closet** | shoe wall, open double-hang sections with garments, two glass display cabinets with LED shelves, full-length mirror, central island with a stone top and a pendant bar, walnut plank floor | 4 tilting shoe shelves (hinged at the bottom edge, shoes ride on the inner face), 2 glass-cabinet door pairs, 2 pull-out accessory trays (velvet inserts), 4 island drawers |
| **Living** | fluted slat media wall with LED backlight and an idle TV, floating TV unit, two tall cabinets (one with smoked glass + LED), floating shelves, console behind a sofa, two armchairs, coffee table, rug, floor lamp | 2 double-door pairs, 2 drawers (TV unit), 2 tall-cabinet door pairs, console drawer |
| **Custom Studio** | consultation wall with a 3 x 5 sample board (the **static** swatches of the kitchen / wardrobe / door finish systems + the three stones: never swapped, so a swatch always matches its label), a sample chest, a hanging swatch-strip rack, a wall screen introducing the **existing** Design Studio (the panel links to `/studio`), a stone design table with chairs, plan, tablet and a linear pendant | 2 table drawers, 3 sample drawers (chips inside), 2 sliding sample-rail panels |
| **Consultation Lounge** | reception desk (fluted front, stone counter) in front of the owner's logo wall, credenza under a consultation panel (existing booking copy + the existing phone number and hours from `content/facts.js`), sofa + armchairs + coffee table | 2 desk drawers, credenza door pair, 2 credenza drawers |

Kit additions: `doorPair` (two leaves, one part id), `tilt` (bottom-hinged fold-out shelf), `drawer(..., organiser:false)` for trays, **a closed drawer hides its body and contents** (they sit behind the front), `tilt` / `tray` animation kinds. Materials: one upholstery, stone and floor per department (finishes never leak between bays), plank floors (`3d/pbr.js plankSet`), woven upholstery normal (`weaveSet`), mirror. Finishes (`products/finishes.js`): 4 per department (oak / walnut / lacquer variants with brass or bronze; upholstery colour for bedroom, living and lounge; stone for walk-in, studio and lounge).

**Links**: bedrooms, studio and lounge use the booking form's existing **Other** interest (the notes name the product and the finish), walk-in uses **Walk-In Closet**, living **TV Unit** (all existing options). The lounge's button says "Book a consultation" and its notes say "consultation request, not a quotation"; its extra links (call, WhatsApp, hours) come **only** from `FACTS` in `src/content/facts.js`; the studio's extra link is `/studio` (the existing Neo Design Studio shell; not localised by URL, like the campaign).

**Wall shift**: the hall's wall slats stand 9.5 cm proud of the wall plane, so the five new products sit 0.11 m forward (`kit.wallShift`) or the slats poke through the back panels.

### Draw-call work (the first version of eight furnished bays doubled the Phase 4 budget)
First measurement with eight bays: low 484 to 599 calls at a department, high 1 047 to 1 376. Fixes: (1) **far proxies**: every product's closed fronts are merged per material into 2 to 4 meshes and drawn instead of every drawer / door / pull when the visitor is farther than ~9.8 m (hysteresis 8.8 m) or when nothing is open; the real parts return when near or as soon as anything is open; (2) **accent LEDs merged**: every LED that follows only the LED switch (cove, under-cabinet, plinth, wall wash) is merged into one strip mesh and one additive wash mesh with per-vertex colour = level (the part-driven LEDs inside drawers / doors stay separate and are hidden while closed); (3) far products **stop casting shadows** (the sun and key-light shadow passes only need what is near); (4) props / detail LOD distances 20 / 24 m to 15 / 18 m; (5) the bay portals and brass borders merged into one draw call each; (6) the floor-mirror pass skips products farther than 13 m; (7) living uses an always-alpha smoked glass (the high-tier transmission glass adds a second full-scene pass: the wardrobe keeps it).

Draw calls / triangles per frame (`renderer.info` summed over every pass, 1280x720, SwiftShader; `docs/showroom3d/phase5-stats.json`):
| tier | spawn | bedroom | walk-in | living | studio | lounge | kitchen | wardrobe | door |
|---|---|---|---|---|---|---|---|---|---|
| low | 304 / 110k | 260 / 114k | 307 / 143k | 316 / 117k | 284 / 106k | 252 / 98k | 269 / 130k | 290 / 149k | 229 / 105k |
| medium | 333 / 148k | 310 / 160k | 364 / 196k | 367 / 165k | 327 / 146k | 294 / 141k | 322 / 179k | 336 / 203k | 260 / 146k |
| high | 389 / 160k | 429 / 196k | 525 / 252k | 540 / 202k* | 483 / 181k | 408 / 161k | 436 / 224k | 744 / 427k | 356 / 175k |
(*living re-measured after switching its glass to alpha: 842 before, 540 after; the table's other numbers are from the same run.) Low tier is lighter than Phase 4 at the original three departments (kitchen 369 to 269, wardrobe 374 to 290, door 272 to 229) while carrying eight furnished bays and the VIP room. The wardrobe on high is the only spot above 700 (transmission glass pass + mirror + shadow): it was 616 before the realism pass and 918 after the mirror, now 744.

### Bug found and fixed on the way (high tier)
Screenshots of the Living bay at 1100x640 came out **completely black** on the high tier (every other size and tier was fine). Cause: a near-mirror specular peak (polished floor clearcoat catching the key spot exactly) exceeds the half-float range, becomes Inf / NaN in the HDR target and the bloom chain spreads it over the frame. Fix: a clamp pass (`min(rgb, 48)`, NaN to 0) before the bloom in `3d/post.js`; verified by re-rendering the same frame (mean brightness 3.6 to 106). This could also have affected Phase 4 bays at other canvas sizes on real GPUs.

## VIP Meeting Room (9th room)

**Where**: a glass-fronted boardroom against the back wall of the hall, centred on the nave, behind the second bench (x -7..7, z -35.5..-28.5, height 4.3 m; layout in `scenes/vip/layout.js`, shared by the scene, collision, navigation and tests). The room's back wall stands 0.5 m in front of the hall's back wall so it hides the hall logo panel behind it.
**Scene** (`scenes/vip/vipRoom.js`, `panels.js`): bronze-framed glass front with a door that slides open as you approach (it opens within 3.8 m, closes beyond 5 m; the door leaf is a solid collider until it is 60 % open), acoustic fluted-walnut side walls, a spot-lit 5.6 m table with ten chairs and a stone LED inlay, a lounge corner, a credenza, a 6.4 x 3.6 m **cinematic wall screen** that shows the guided presentation (animated canvas, redrawn about 7 times a second only while somebody is in the room), a **gallery wall** of the site's real projects, a **Hub chart wall**, three floating "hologram" panels (additive emissive planes) over the table and a glowing **floor map** of the eight departments. Light choreography on entering: the spot and fill ramp up over 2.4 s, the screen brightens, the holograms rise in one after another, the floor map scales in (instant under reduced motion). About 40 draw calls.
**Interaction**: stand in the room (or in the doorway strip) and press E / tap Interact (or key 9, or the department menu: it is the 9th item, and a 9th stop in the nav graph with a route round the bench and through the door). The camera glides to station 1; the panel (`ui/VipPanel.jsx`) shows the station with Previous / Next, five station dots (44 px targets), arrow keys (mirrored in RTL), digits 1 to 5, Home / End, Esc to leave. The panel is real DOM text (accessible), the screen is the cinematic version of the same content.
**Stations** (`products/vipContent.js`, pure and unit-tested): (1) company story and brand: only facts from `content/facts.js` (warranty, phone, hours) and existing copy; **years of craft, homes delivered, production model and showroom count are marked placeholders "To be confirmed by management"** and appear automatically once `facts.js` holds a value; (2) business lines (each with its real route: /kitchen, /wardrobes, /doors, /tv, /design-studio, /studio, /campaign/ikhtarha, /booking; walk-in and bedrooms have no page of their own and say so) and the site's **real project list** on the gallery wall; (3) **Bonsai Hub**: lead -> quote -> order -> production -> install and service -> finance flow, the 13 department groups with their module counts, six capabilities, each with its source, taken from the Hub repository (module map, RBAC model, KPI definitions, audit and automation modules) and labelled "Illustrative: simplified mock-up, not real data"; (4) how to join and invest: a five-step PROCESS with **no figures, returns, valuation, equity, ROI or guarantees** (a unit test scans the content for them, EN + AR) and the disclaimer "Information only, not an offer or financial advice; details provided directly by management."; (5) the CTA.
**Projects read**: `products/projectsFeed.js` reuses the Projects page's own path: `api('website_projects?active=eq.true&order=sort_order.asc&limit=6')` + `sanitizeProjects` (App.js is already in the main bundle, so no extra weight). It runs **once, the first time somebody enters the room** (never at load), is a single GET, and a failure or an empty list shows "Projects are shown on our Projects page." (no cards, no counts). Cards show title, "category · location" and the cover image when the record has one (a styled initial card otherwise); a QA check asserts exactly one backend request and no write.
**CTA**: "Request a private investor briefing" is a plain link to the existing `/booking` (`/ar/booking`) with `interest=investor-briefing&source=showroom-3d-vip&notes=...`; `parseBookingPrefill` maps that interest to the form's existing **Other**. The showroom writes nothing and collects nothing; `docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md` lists everything management must supply (placeholders shown in the room).
Budget (`docs/showroom3d/phase5-vip-stats.json`, calls / triangles): low 158 to 180 / 84k to 86k, medium 186 to 209 / 121k to 124k, high 203 to 229 / 126k to 128k at the five VIP spots (outside the glass, door open, inside, stations 1 and 3); those views do not include the bays, so the spawn numbers above are the worst case.

## Phase 5b tests and QA
Jest (whole repo): **353 pass** (308 before this work). New: `departments5b.test.js` (product configs, finishes, quote / contact links, tilt / tray animation, doorPair / tilt / drawer kit behaviour, product colliders, random walks, nav graph), `vip.test.js` (content honesty, placeholders, station state machine, briefing URL and prefill, projects feed with an injected client, VIP collision / door / zones / routes, Hub numbers vs the Hub repository when present); the Phase 4 suites were updated for eight furnished bays and the 9th stop.
Playwright + headless Chromium on SwiftShader (`scripts/showroom3d-qa/phase5.js`, `phase5vip.js`; serve a build with `serve.js`): departments **flows 84/84** (walk to each bay, E, every part opens and moves, LEDs, 3 to 4 finishes each with distinct material states, quote / consultation link opens the existing /booking pre-filled, studio link, lounge call / WhatsApp, pointer + keyboard picking), reduced 5/5, mobile 10/10, AR 13/13; VIP **flows 24/24** (door, walking in with W, all five stations by buttons / keys / dots, placeholders, no financial words, one GET, CTA opens the booking page pre-filled), states 6/6 (empty and failing project list), nav 6/6 (key 9, menu, from a far bay), AR 8/8 (arrows mirror), mobile 8/8, reduced 4/4 (the "ERR_FAILED" console line of the error mock is the aborted request itself).
Screenshots: `docs/showroom3d/screenshots/phase5-*` (departments) and `phase5-vip-*` (VIP room; the projects wall in the screenshots shows **test fixtures** named "Test fixture project A/B/C" injected by the QA script because the sandbox has no access to the site's database; real records are not shown).

## Honest visual assessment (Phase 5b)
Self-score **about 5 / 10** against luxury archviz for the five new departments (the same as the Phase 4 realism pass; the VIP room about 5.5 / 10 as a stylised space). What works: legible rooms with believable proportions, every opening part really moves (tilting shoe shelves, trays with velvet inserts, double doors, sliding sample rails, door that slides open), consistent materials and light, floor reflections on the high tier, the VIP screen / hologram / floor-map staging reads as a deliberate "wow" without being garish. What still reads as CG: bedding and upholstery are bevelled blocks with a woven normal map (no folds, no real fabric drape), garments are flat silhouettes, the mirrors are env-mapped metal planes (not real reflections of the room), the TV is a dark plane, the hall slats and the plain plaster wall planes look flat, no global illumination or real AO (AO is baked decals), upholstery whites clip under the key light, procedural tiling is visible on large floors, plants are stylised, chair backs hide the bottom of the VIP screen, the studio and lounge wall screens are small unreadable text from walking distance (they are readable in the focus views).

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

`npx react-scripts test` : **353 tests pass in 33 suites, whole repo** (Phase 5b adds 45; the line below is the Phase 4/5 count): 300 tests passed in 30 suites (Phase 4/5 adds animation state machine, finish config, quote URL builder + booking prefill round trip, pickable registry, catalog / EN-AR strings / campaign-copy-vs-source checks, geometry builders (bevel, grain UVs, fluted panel), the kit's drawer / hinge / slider transforms and LED, explorer focus / keyboard / pointer / touch, panels EN + AR, product colliders). Earlier: 209 tests (52 from Phases 0 to 2, 57 from Phase 3). Phase 0 to 2 suites cover timeline integrity, quality tier selection and adaptive scale,
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

## Realism pass (after Phase 4/5)

Before / after at the same cameras: `phase4-10/12/21/30/40` (before) vs `phase4b-10/12/21/30/40` (after). **Screenshot folder housekeeping (Phase 5b): the Phase 1 to 4 galleries were pruned to keep `docs/showroom3d/screenshots` under 4 MB; only `phase4b-10/21/30/40` (kitchen, wardrobe, door, stage) remain next to the new `phase5-*` / `phase5-vip-*` sets. The deleted images are in git history (commit 629e00b and earlier).**
Changes: sun intensity fades with depth into the hall (no hard stripes inside the departments; `3d/lighting.js`); the hall floor and each bay get large-format polished tile (different stone per bay, grout, clearcoat); **high tier only** planar floor reflection of the furnished bays + stage (`3d/mirror.js`, half-res pass, skipped when looking steeply down); baked AO decals (wall under the canopy, splashback, island fronts, wardrobe sections; one merged draw call per product); neutral oak, calmer grain, richer walnut, satin clearcoat on lacquer, darker anisotropic brass; leaf-card plants and olive trees (alpha cut-outs) instead of blobs, drape on garments, rugs, kitchen art; per-room colour grade + vignette pass (high tier, after tone mapping); less warm hall light. Not done: SSAO/GTAO, depth of field (both need an extra depth pass; skipped for budget), real GI.
Budget (draw calls / triangles, 1280x720 SwiftShader): low kitchen 369/149k to 368/155k, medium 442/198k to 431/206k (unchanged); **high kitchen 618/293k to about 918/388k** because the mirror pass re-draws the bays (high tier only; the 700-call check no longer holds on high; the per-tier door/stage numbers in the last stats run were stale frames and are not reported). Tests: 308 whole repo pass; flows 72/72, reduced 5/5, mobile 12/12, AR 7/7 were run before the final tweaks (tree, oak grain, mirror skip) and not re-run after them.
Honest score now: about 5.5 / 10 versus luxury archviz. Still reads CG: no global illumination (AO is decals), plants and clothes are stylised, procedural tiling in textures, flat-colour props, brass still goes flat or blows out up close, fluted reeds are geometry without real light transport, no depth of field, reflections only on the high tier and only of furniture (no walls/ceiling).

## Unverified

Real devices and GPUs (frame rate, thermals, memory, shader compile on iOS), screen readers (ARIA roles and live region are present but not tested with VoiceOver / NVDA / TalkBack), a native Arabic review of every new string, touch on real hardware (Playwright touch only), the Ikhtarha campaign being live, and any visual check on Safari / Firefox.

## Not built (Phases 5 backend, 6, 7)

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
