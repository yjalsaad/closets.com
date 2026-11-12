# Virtual Showroom 3D: architecture (Phases 0 to 3)

Route: `/showroom-3d` and `/ar/showroom-3d` (noindex, own lazy chunk, own full-screen shell like `/visualizer`).
Status: **Phase 0 (this doc), Phase 1 (architectural environment), Phase 2 (cinematic intro, loader, hand-over), Phase 3 (first-person roaming, collision, department quick-nav).**
Phases 4 to 7 are not built (see the end).

## Honest scope statement

- **There are no GLB / Blender / photographic assets in this build.** Every surface, tree and fixture is *procedural*: geometry
  from three.js primitives, PBR textures drawn on canvas from seeded noise (`src/showroom3d/3d/textures.js`).
- It is **not photoreal** and should not be presented as such. It is a clean, lit, architecturally plausible stylised model.
  Swapping in authored GLBs later is a drop-in per scene module (see `assets/README`-style notes below).
- The eight department bays are **empty and labelled "To be furnished"** on their signs and in the UI. Nothing is furnished.
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


## Integration touch points (outside `src/showroom3d`)

- `src/index.js`: `isShowroomPath` + `React.lazy` + one render branch (about +480 bytes in the main bundle).
- `vercel.json`: rewrites for `/showroom-3d`, `/ar/showroom-3d` to the app shell; `X-Robots-Tag: noindex`.
- `scripts/seo-build.js` (robots Disallow) and `scripts/seo-check.js` (route check).
- `package.json` / lock: `gsap@3.13.0`.
- No existing page was changed. **No link to the showroom was added to the site** (App.js is one 17k-line file; a footer or nav link is
  a one-line follow-up once the owner approves the entry point).

## Testing

`npx react-scripts test` : 209 tests pass (52 from Phases 0 to 2, 57 from Phase 3). Phase 0 to 2 suites cover timeline integrity, quality tier selection and adaptive scale,
loading progress, department layout, strings (EN/AR parity), look-around maths, noise/tiling, GSAP director seek/finish/reset,
route regex, loader / fallback UI. Phase 3 adds colliders (circle vs box / OBB / circle, sliding, corners, large dt, spawn validity, door states,
fuzzed bounds), navgraph (every bay reachable, every edge clear, walked routes), walker (speeds, smoothing, bob, reduced motion), explorer (keys, pause,
pointer lock fallback, glide, interaction) and the overlays (focus trap, EN/AR, joystick). Visual QA: Playwright + SwiftShader screenshots in `docs/showroom3d/screenshots/`.
Debug hooks: `?debug=1` exposes `window.__showroom` (`seek(t)`, `info()`, `state()`); `&at=SECONDS` holds the intro at a time;
`&aa=0` disables MSAA (SwiftShader shows MSAA artefacts on the logo panel; they are absent with `aa=0` and on the low tier).

## Not built (Phases 4 to 7)

4 furnishing the departments, product interaction, customisation.
5 favourites and quote workflow to the backend. 6 sound, analytics, deeper EN/AR review (Arabic copy needs native review).
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
