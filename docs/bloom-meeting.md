# Bloom Meeting (Floor 2 of YAS Bloom)

"Bloom Meeting" (AR: اجتماع بلوم) is a new scene on **Floor 2** of the YAS Bloom virtual showroom: the executive floor for the VPs and heads (boardroom), staff operations and leads, with a calm lounge, a night view of the Bahrain skyline and a cinematic video wall that plays the new film. Haneen AI, the investor assistant, sits at the lobby desk (see `docs/bloom-meeting-haneen.md`).
Everything is **add-only** under `src/showroom3d/**`; the main hall, the VIP room, the site and the existing tests keep their meaning (the few updated test expectations are listed at the end).

## How to reach it

* **Glass lift** in the main hall, back-left of the nave (a lit glass tower with a brass cab and a "Floor 2 · Bloom Meeting" sign). Stand on its floor ring and press **E** (or tap Interact).
* **Floor selector** (the `G | 2` pill in the top bar, every screen size) and the **Departments** sheet (a "Floors" section: Ground floor, Floor 2 · Bloom Meeting; on Floor 2 it also lists Lobby, Boardroom, Staff operations, Leads wall, Lounge, Haneen AI). The glass lift also appears as a quick-nav stop.
* **VIP meeting agenda**: two items were added after the AI film: *The Closets: The Journey of Ambition (new cut)* (film id `journey-v2`) and *Bloom Meeting (Floor 2)*. "Next agenda item" on the last film (or clicking the item in the agenda card) takes the meeting up in the lift and puts the film on the Bloom wall.
* Access policy: **identical to the VIP room, nothing loosened**. The VIP room has no login or gate (its glass door opens as you approach); Bloom Meeting has none either. Nothing on Floor 2 reads the site's database; the ops / leads walls are illustrative samples.
* Debug / QA (`?debug=1`): `window.__showroom.engine.ensureBloom()`, then `window.__showroom.explore.rideTo('l2')` (or `'ground'`), `.level()`, `.focusBloom()`, and `.teleport(x, z, yaw, pitch)` (Floor 2 world z = 150 + local z).

## What is on Floor 2 (all procedural, no photographs)

| Zone | What it has |
|---|---|
| Lift lobby | the Floor 2 lift cab (arrival), a backlit "Bloom Meeting" sign, the **Haneen AI** desk with a hologram card and light column, the Leads wall |
| Boardroom (VPs and heads) | glass partitions with bronze frames, a 7.4 m veneer table with a stone inlay, a suspended light blade, 13 leadership chairs (tobacco leather, brass pedestals) seated at the table, a fluted-veneer feature wall and the **7.6 x 4.3 m video wall** (poster, then the film, captions, mixed label) |
| Staff operations | the Ops wall (lead pipeline funnel, today's tasks, targets) and six stone-topped pods with monitors and task chairs |
| Leads wall | columns New > Contacted > Quoted > Won with counts and sample cards; labelled "Illustrative data" |
| Lounge | two sofas, a leather lounge chair, a stone table, a pouf and a rug facing the east windows |
| Wow | night skyline (Bahrain WTC and Financial Harbour **inspired** silhouettes, turbines turning, moon, causeway lights, a mirrored sea), a glossy graphite floor with a mirrored reflection of the screen, coves and ribbons, three animated **light ribbons** in the Bloom colours (orange, brass, cream), light beams with drifting dust over the table, a slow breathing glow in the coves, and the **entrance reveal** (the lift fades, the cab opens and the camera glides through the lobby to a view of the boardroom and the skyline) |

**Collection colours and materials.** The finishes are the average colours of the real YAS Wood Collection swatches (`src/showroom3d/bloom/palette.js`, sampled once from `public/yas-bloom/collections/...`, no swatch image loads at runtime): Kaiser Walnut 102019 TX04 (veneer: table, feature wall), Graphite Grey 12146 TX04 and Charcoal (lacquer: floor, walls, ceiling), Volukus Marble 44201 TX03 (stone inlay, desk tops), Tobacco SS6007 TX01 (leather chairs), Cream SS6017 TX01 (sofas), Black SS6565 (bezels), with the brand orange and brass of `3d/palette.js` for the light and the metal.

## How it is built (files)

* `scenes/bloom/layout.js` pure geometry: floor rectangle, zones, collision boxes, the navigation graph, the lift in the hall, camera poses. Floor 2 lives at world z = 150 (the hall, forecourt and sun are hidden while you are up there; nothing of Floor 2 is drawn at ground level).
* `scenes/bloom/bloomMeeting.js` + `skyline.js` + `panelsBloom.js` + `hallLift.js` the **lazy chunk** (`bloom-meeting`, fetched about 2.5 s after the visitor can explore; skipped on data saver / 2g and with `?bloomprefetch=0`, then fetched on the first lift use). The canvas panels are created on the first visit to Floor 2.
* `3d/engine.js` `ensureBloom()` / `setFloor()`: hide the hall groups, switch the fog and clear colour to night, move the hall's existing point lights into the boardroom and lobby (no new lights, so no shader recompile for the hall), use the sun as a cool moon fill with shadows off.
* `navigation/explorer.js` `level`, `rideTo()`, `focusBloom()`, `goPlace()`; the Floor 2 colliders / graph / zones; the lift stop in the hall graph. `navigation/colliders.js` adds the lift tower to the hall colliders.
* `bloom/ops.js` the illustrative data; `bloom/strings.js` the strings; `ui/bloom.css`, `ui/HaneenChat.jsx`, `ui/Hud.jsx` (floor pill), `ui/Menus.jsx` (floors section).
* `vip/film.js` (`journey-v2`, `FILM_MIXED_LABEL`, `filmLabel`), `vip/meeting.js` (agenda), `vip/decks/investor.js` (Investor welcome, Factory tour).

## How to edit

* Colours / finishes: `bloom/palette.js`. Layout: `scenes/bloom/layout.js` (the zones, stops and colliders come from the same numbers; `__tests__/bloomLayout.test.js` fails if a stop, node or edge lands inside an obstacle).
* Ops / leads sample numbers and cards: `bloom/ops.js` (keep them generic: no customer names, phones or addresses).
* The video wall plays whichever film the VIP film player has selected; Bloom uses `journey-v2`.

## The new film ("Journey of Ambition", new cut) and how to swap it

Registered as its **own film id `journey-v2`** in `public/yas-bloom/film/films.json`, manifest **`film3.json` (film v3, the one for the 16 November meeting)**; the existing `journey` film and the three real films are untouched. Files: `journey3-1080.mp4` (24.9 MiB, desktop / tablet-class tiers), `journey3-720.mp4` (12.2 MiB, phones, iPad / coarse pointer, data saver, low tier), `journey3-poster.jpg`, `journey3.en.vtt` (51 re-cut English cues), `journey3.ar.vtt`, from the film branch `claude/web-journey-v3` (commit 4631435, `docs/showroom3d/JOURNEY-V3.md`). The **v2 files (`film2.json`, `journey2-*`) stay in place as the fallback**: point the entry's manifest back at `film2.json` to revert (and the two label constants if their wording differs). They download in the background (the existing "download, then play" preloader, Ready badge, Cache Storage) and the film never starts without a click.
* **Label.** v3 shows the two real leader photographs with **camera motion only** (no AI animation) inside an **AI-generated office**; everything else is AI illustration. So it carries the mixed label **"Leaders appear from real photographs (camera motion only) in an AI-generated office; all other imagery is AI-generated illustration"** (Arabic in `vip/film.js` and `film3.json`) and the short badge "Leaders: real photos · office and other imagery: AI illustration". No separate image of the leaders is shipped. `film3.json` has `"mixed": true`; `bloomFilm.test.js` fails if its label differs from the constants or if "animated with AI" appears.
* **Film claims.** The film still says (and captions) 50,000+ projects, 27+ patents, two factories, Iraq and Jordan, exclusive designs: the owner's script, all marked needs-owner-confirmation in the Haneen fact sheet (she does not repeat them).

## Captions, Meeting mode and the film swap (meeting-day work)

* **Captions are ON by default**, in the page language: an English page shows `journey3.en.vtt`, an Arabic page `journey3.ar.vtt` (the film's narration is Arabic; English captions are a translation). Switching the page language moves the captions with it until the visitor picks one. On the wall the caption is drawn large (46 px on the 864 px layout, on an 88 % dark bar, centred with safe margins, two lines max); the panel has a **CC** on/off toggle and an **EN / العربية** switch (`aria-pressed`), and the `C` key still cycles. Proof screenshots: `docs/screenshots/bloom/captions-1440x900.jpg`, `captions-1024x768@2x.jpg` (a mid-film seek at about 1:41, real playback in Google Chrome).
* **Meeting mode**: `/yas-bloom?meeting=1` (skips the intro, rides the lift, glides to the lobby view) or Departments > "Meeting mode: open Bloom Meeting". The new film downloads during the ride; the lobby shows a **"Film ready"** pill (or "Preparing film... N%"), and the wall panel says "Ready: starts instantly". Only the new film is fetched (not the other VIP films); phones and iPads (coarse pointer) get the 720p file. Checklist: `docs/bloom-meeting-checklist.md`.
* **The lift is no longer solid-but-invisible**: its collider exists only once the lift is drawn (`buildColliders({ lift })`), and the Bloom chunk is now fetched during the intro (1.2 s after the engine is ready), not after it.
* **Subtle light sweep** along the top LED line of the video wall (one additive quad, a slow sine travel; off under reduced motion). The wall itself is already at the largest 16:9 the 5 m ceiling allows (7.6 x 4.3 m), so it was not enlarged.

### Swapping the film again (v3 is live; this is how it was done and how to go back to v2 or on to a v4)

The new cut has ONE entry, `journey-v2`, so the agenda, the deck, the wall and Haneen never change.

1. Copy the film's files into `public/yas-bloom/film/` and run `node scripts/showroom3d-preload/make-manifest.js` (a `*-poster.jpg` joins the preload manifest).
2. **File 1, one line** in `public/yas-bloom/film/films.json`, the `journey-v2` entry: `"manifest": "/yas-bloom/film/film3.json"` (v2 fallback: `film2.json`).
3. **File 2, two strings** in `src/showroom3d/vip/film.js`: `FILM_MIXED_LABEL` and `FILM_MIXED_BADGE` (EN + AR). They drive the wall poster line, the caption-strip badge, the panel note, the cinema badge and the agenda line. The same `label` is in the film's manifest; `bloomFilm.test.js` fails if they differ.
4. Point the file checks in `bloomFilm.test.js` at the new manifest / file names, run the tests and `CI=false npm run build`.

## Performance, quality parity and limits (measured)

Measured in headless Chromium on SwiftShader (CPU rendering, so frame rates are not representative; draw calls and triangles are):

| | Floor 2 | VIP room view in the hall |
|---|---|---|
| draw calls (1440x900, high tier) | 59 to 80 | 241 |
| triangles | 41 to 42 k | 140 k |

* Bundles: the lazy `bloom-meeting` chunk is **37.2 KB (12.4 KB gzip)**; the entry bundle is essentially unchanged (measured against origin/main: `main` 2,149,901 -> 2,151,398 bytes (+1.5 KB; gzip +0.4 KB), the `showroom3d` chunk 836,073 -> 885,459 bytes (+49 KB; gzip 231.0 -> 242.4 KB: the floor selector, Floor 2 logic in the explorer, the fact sheet, the investor decks), plus two lazy chunks: `bloom-meeting` 37.2 KB (12.4 KB gzip) and `haneen-chat` 52.6 KB (13.8 KB gzip, with the QR code, fetched only when the chat opens). The mp4 files are not in the bundle.) No new texture files; no new lights in the hall scene.
* GPU memory on Floor 2 (high tier, created on the first visit only): film wall canvas 2560 x 1440, Ops wall about 3321 x 1107, Leads wall 4059 x 1070 (about 47 MB before mipmaps). The medium / low tiers use the VIP rule (1920 x 1080 and 277 px per metre).
* **Same renderer, same quality as the VIP room** (one shared engine: pixel-ratio cap `tier.pixelRatioCap` through `effectivePixelRatio`, MSAA from `tier.antialias`, `LOOK.toneMapping` and exposure, PCFSoft shadow type, the same bloom / grade post chain). Canvas panels use the same `makePanel` pipeline (anisotropy 8, mipmaps, design-size scaling) and the same drawing kit and type scale as the VIP panels, at the same texel density (369 px per metre on the high tier). The film wall uses the 1080p file where the device qualifies. The one deliberate difference: Floor 2 draws **no real-time shadows** (the sun's shadow pass is off there; the look comes from emissive light, mirrored reflections and the point lights). Side-by-side crops of the VIP wall and the Bloom walls are in `docs/screenshots/bloom/ (desktop 1440x900, iPad 1024x768@2x, phone 390x844, and the two parity montages `parity-*.jpg`)`.
* Limits: no real iPad was available (checked in Chromium at 1024 x 768 @2x and a phone viewport only). The stair was not built; the glass lift is the way up. Arabic strings await native review. The skyline is inspired by, not a model of, the Bahrain landmarks.

## What is illustrative

The **Ops wall and Leads wall** are sample data (`bloom/ops.js`), labelled "Illustrative data" on the wall: generic lead codes and product lines, no customer, no name, no phone, no real figure, nothing read from the site or the Hub. The numbers drift slowly so the walls look alive. The skyline and the landmarks are procedural illustrations.

## Tests (updated expectations, where items were added)

New: `bloomLayout.test.js`, `bloomFilm.test.js`, `investor.test.js`. Updated only where Bloom Meeting **added** items: `vipMeeting.test.js` (agenda 7 -> 9 items; the agenda card shows nine lines at 31 px instead of seven at 34 px; the permanent deck list; the films list; one extra manifest request), `vipDecksGolden.test.js` (deck list).
