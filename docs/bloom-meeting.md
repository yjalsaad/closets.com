# Bloom Meeting (Floor 2 of YAS Bloom)

"Bloom Meeting" (AR: اجتماع بلوم) is a new scene on **Floor 2** of the YAS Bloom virtual showroom: the executive floor for the VPs and heads (boardroom), staff operations and leads, with a calm lounge, a night view of the Bahrain skyline and a cinematic video wall that plays the new film. Haneen AI, the investor assistant, sits at the lobby desk (see `docs/bloom-meeting-haneen.md`).
Everything is **add-only** under `src/showroom3d/**`; the main hall, the VIP room, the site and the existing tests keep their meaning (the few updated test expectations are listed at the end).

## How to reach it

* **Glass lift** in the main hall, back-left of the nave (a lit glass tower with a brass cab and a "Floor 2 · Bloom Meeting" sign). Stand on its floor ring and press **E** (or tap Interact).
* **Floor selector** (the `G | 2` pill in the top bar, every screen size) and the **Departments** sheet (a "Floors" section: Ground floor, Floor 2 · Bloom Meeting; on Floor 2 it also lists Lobby, Boardroom, Staff operations, Leads wall, Lounge, Haneen AI). The glass lift also appears as a quick-nav stop.
* **VIP meeting agenda**: two items were added after the AI film: *The Closets: The Journey of Ambition (new cut)* (the ACTIVE Journey film, alias `journey-active`: v2, v3 or the reserved animated version; see "The new film") and *Bloom Meeting (Floor 2)*. "Next agenda item" on the last film (or clicking the item in the agenda card) takes the meeting up in the lift and puts the film on the Bloom wall.
* Access policy: **identical to the VIP room, nothing loosened**. The VIP room has no login or gate (its glass door opens as you approach); Bloom Meeting has none either. Nothing on Floor 2 reads the site's database; the ops / leads walls are illustrative samples.
* Debug / QA (`?debug=1`): `window.__showroom.engine.ensureBloom()`, then `window.__showroom.explore.rideTo('l2')` (or `'ground'`), `.level()`, `.focusBloom()`, and `.teleport(x, z, yaw, pitch)` (Floor 2 world z = 150 + local z).

## What is on Floor 2 (all procedural, no photographs)

| Zone | What it has |
|---|---|
| Lift lobby | the Floor 2 lift cab (arrival), a backlit "Bloom Meeting" sign, the **Haneen AI** desk with a hologram card and light column, the Leads wall |
| Boardroom (VPs and heads) | glass partitions with bronze frames, a 7.4 m veneer table with a stone inlay, a suspended light blade, 13 leadership chairs (tobacco leather, brass pedestals) seated at the table, a fluted-veneer feature wall and the **7.6 x 4.3 m video wall** (poster, then the film, captions, mixed label) |
| Staff operations | the Ops wall (lead pipeline funnel, today's tasks, targets) and six stone-topped pods with monitors and task chairs |
| Lead Roadmap (leads zone) | a 12 x 3.2 m wall that reproduces the structure of the Bonsai Hub **Lead Roadmap**: the path of five stages with counts, five columns with sample cards, the filters and the move rules, plus the roadmap path inlaid in the floor in front of it; EN + AR; labelled "Illustrative data" (see "Lead Roadmap mapping" below) |
| Executive wing (5 offices) | behind a doorway in the lobby's south wall: a corridor and five glass-fronted offices with a door, a name plate (EN + AR), a stone-topped desk, an executive chair and two guest chairs, a shelf with books, wall art, an accent light of their own colour and an "Options" wall panel (empty: "Options coming soon"): IT Head, Operations Head, Managing Partner, Managing Director, Partner Strategy |
| Lounge | two sofas, a leather lounge chair, a stone table, a pouf and a rug facing the east windows |
| Wow | night skyline (Bahrain WTC and Financial Harbour **inspired** silhouettes, turbines turning, moon, causeway lights, a mirrored sea), a glossy graphite floor with a mirrored reflection of the screen, coves and ribbons, three animated **light ribbons** in the Bloom colours (orange, brass, cream), light beams with drifting dust over the table, a slow breathing glow in the coves, and the **entrance reveal** (the lift fades, the cab opens and the camera glides through the lobby to a view of the boardroom and the skyline) |

**Collection colours and materials.** The finishes are the average colours of the real YAS Wood Collection swatches (`src/showroom3d/bloom/palette.js`, sampled once from `public/yas-bloom/collections/...`, no swatch image loads at runtime): Kaiser Walnut 102019 TX04 (veneer: table, feature wall), Graphite Grey 12146 TX04 and Charcoal (lacquer: floor, walls, ceiling), Volukus Marble 44201 TX03 (stone inlay, desk tops), Tobacco SS6007 TX01 (leather chairs), Cream SS6017 TX01 (sofas), Black SS6565 (bezels), with the brand orange and brass of `3d/palette.js` for the light and the metal.

## How it is built (files)

* `scenes/bloom/layout.js` pure geometry: floor rectangle, zones, collision boxes, the navigation graph, the lift in the hall, camera poses. Floor 2 lives at world z = 150 (the hall, forecourt and sun are hidden while you are up there; nothing of Floor 2 is drawn at ground level).
* `scenes/bloom/bloomMeeting.js` + `skyline.js` + `panelsBloom.js` + `hallLift.js` the **lazy chunk** (`bloom-meeting`, fetched about 2.5 s after the visitor can explore; skipped on data saver / 2g and with `?bloomprefetch=0`, then fetched on the first lift use). The canvas panels are created on the first visit to Floor 2.
* `3d/engine.js` `ensureBloom()` / `setFloor()`: hide the hall groups, switch the fog and clear colour to night, move the hall's existing point lights into the boardroom and lobby (no new lights, so no shader recompile for the hall), use the sun as a cool moon fill with shadows off.
* `navigation/explorer.js` `level`, `rideTo()`, `focusBloom()`, `goPlace()`; the Floor 2 colliders / graph / zones; the lift stop in the hall graph. `navigation/colliders.js` adds the lift tower to the hall colliders.
* `bloom/ops.js` the illustrative data; `bloom/strings.js` the strings; `ui/bloom.css`, `ui/HaneenChat.jsx`, `ui/Hud.jsx` (floor pill), `ui/Menus.jsx` (floors section).
* `vip/film.js` (film versions, `chooseJourney`, `mixedLabel`), `vip/filmChoice.js` (the `bloom.film.active` row), `vip/meeting.js` (agenda), `vip/decks/investor.js` (Investor welcome, Factory tour).

## How to edit

* Colours / finishes: `bloom/palette.js`. Layout: `scenes/bloom/layout.js` (the zones, stops and colliders come from the same numbers; `__tests__/bloomLayout.test.js` fails if a stop, node or edge lands inside an obstacle).
* Ops / leads sample numbers and cards: `bloom/ops.js` (keep them generic: no customer names, phones or addresses).
* The video wall plays whichever film the VIP film player has selected; Bloom uses the active Journey film (`journey-active`).

## The new film ("Journey of Ambition", new cut) and how to swap it

**Three versions are registered side by side in `public/yas-bloom/film/films.json`, exactly one is ACTIVE, the others stay on disk but are not listed anywhere** (not in the agenda, not on the wall, not downloaded):

| id | manifest | what it is | label (from its own manifest) |
|---|---|---|---|
| `journey-v2` | `film2.json` (`journey2-*`) | the leaders as static real photographs | "Real photographs of company leaders; all other imagery is AI-generated illustration" |
| `journey-v3` | `film3.json` (`journey3-*`) | the leaders as real photographs with camera motion only, in an AI-generated office | "Leaders appear from real photographs (camera motion only) in an AI-generated office; all other imagery is AI-generated illustration" |
| `journey-v3-animated` | `film4.json` (`journey4-*`) | **film v4**: the leaders' real photographs animated with AI (Kling image-to-video, silent clips) in the same AI-generated office; everything else as v3 | "Leaders appear from real photographs, animated with AI, in an AI-generated office; all other imagery is AI-generated illustration" (the only version that says "animated with AI"); badge "Leaders: real photos animated with AI · office and other imagery: AI illustration" |

The existing `journey` film (the first AI documentary) and the three real films are untouched. The slides / agenda item / film deck play the **alias `journey-active`**; `FilmPlayer` resolves it to the active version. Each version shows its own label and caption badge (`mixedLabel(id)` / `mixedBadge(id)` in `vip/film.js`, equal to the `label` in its manifest; a test enforces it). Files, sources and posters are as before (1080p on desktop / tablet-class tiers, 720p on phones / iPad / data saver / low tier, captions on by default in the page language).

Proof (real playback in Google Chrome, English captions on, mid-film seek to about 1:47, wall badge shows each version's own wording): `docs/screenshots/bloom/film-choice-v2-desktop-1440x900.jpg`, `film-choice-v3-desktop-1440x900.jpg`, `film-choice-v2-ipad-1024x768@2x.jpg`, `film-choice-v3-ipad-1024x768@2x.jpg` (v2 selected with `?film=v2`, v3 is the default); the animated version: `film-choice-v3-animated-desktop-1440x900.jpg`, `film-choice-v3-animated-ipad-1024x768@2x.jpg` (`?film=v3-animated`, seek into a leaders' scene, badge reads "Leaders: real photos animated with AI · office and other imagery: AI illustration").

### How the owner switches the film (no deploy)

The choice is one row of the site's existing CMS table `website_content`, read once (read-only GET, the same mechanism as `vip.meeting.date`):

```sql
insert into website_content (key, value, active) values ('bloom.film.active', 'v3', true);   -- 'v2' | 'v3' | 'v3-animated'
-- change it later:  update website_content set value = 'v2' where key = 'bloom.film.active';
```
(or add / edit the row `bloom.film.active` in the Hub's Website Content manager; the row must be active and not deleted). Rules: no row or an invalid value = **v3**; if the chosen version's files do not exist it falls back to **v3, then v2**, so the wall is never empty; `v3-animated` does nothing until its slot is enabled (see below). Anyone opening the showroom after the change gets it on their next visit (the row is read when the film library loads; a failed or slow read, 2.5 s, keeps the default). `?film=v2` or `?film=v3` in the URL overrides the row for testing only.
* **Preload / manifest implications:** only the ACTIVE film is prefetched (Meeting mode and the lift ride fetch `journey-active` only, one background download, then "Film ready"). The other versions' mp4 files are never requested unless chosen. `preload/manifest.json` lists the posters of v2 and v3 (about 120 KB each); the videos are not part of the showroom download.
* **The AI-animated version (film v4) is registered and enabled** (`journey-v3-animated` -> `film4.json`, files `journey4-1080.mp4` 24.9 MiB, `journey4-720.mp4` 12.2 MiB, poster, EN / AR captions). It plays only when chosen: set the row to `v3-animated`. **To go back set the row to `v3` (or `v2`)**; the default without a row stays **v3**, and a missing animated manifest falls back to v3 then v2. Test link without touching the row: `/yas-bloom?film=v3-animated` (add `&meeting=1` for Meeting mode). Its label equals `film4.json`'s `label` (a test enforces it); the film's own notes say the animated scenes are not real footage, real meetings or real signed agreements.
* **Add another version:** a new entry in `films.json`, a mapping in `FILM_CHOICES` / `JOURNEY_LABELS` (`vip/film.js`) and in the `chooseJourney` order if it should be a fallback; tests in `__tests__/filmChoice.test.js`.

## Chairs: what was wrong and the fix

On the first iPad test the boardroom leadership chairs and the ops-bay chairs looked reversed. **Cause:** every chair is built facing local +x (back at -x) and rotated about Y by `ry`; three.js maps +x to `(cos ry, 0, -sin ry)`, so a seat north of its table needs `ry = -PI/2` (faces +z) and a seat south of it `+PI/2` (faces -z). The boardroom rows, the pod chairs and one lounge sofa had the two signs swapped, so backs faced the tables. Also the leadership chair's back leaned forward (the recline sign was wrong) and its headrest floated. **Fix:** one list, `seatList()` / `sofaList()` in `scenes/bloom/layout.js`, drives the scene and the tests; the lounge sofas and the office chairs use `faceTo()` so they point at their table / desk exactly. `__tests__/bloomLayout.test.js` checks that every chair's forward vector `[cos ry, -sin ry]` points at its table or desk centre (dot product 1), that the two boardroom rows face each other, that executives face the door and guests face the desk, and counts the seats (13 + 24 + 5 + 10 + 3 sofas). (The shared `fu.chair` used for pods / guests also leans its back slightly forward; it is shared with the VIP room and was left untouched.)

## Lead Roadmap mapping (from Bonsai Hub)

Source: `yjalsaad/closets-hub`, branch `claude/lead-roadmap`, `docs/lead-roadmap/DESIGN.md` (the page `src/leadroadmap/**`; the checkout on `main` does not contain it).
* **Mapped (structure only):** the five stages and their order, with the labels as on the Hub's Leads page (New / جديد, Contacted / تم التواصل, Proposal Sent / تم إرسال العرض, Won / مكسوبة, Lost / خاسرة), the "roadmap path" header with a count per stage, the five columns, the card anatomy (code, product line, **Follow-up due** badge, **Stale 14 days** badge, a reason marker on lost), the quick filters (Owner, Source, Search, Stale only), the move rules (forward to any later stage; Won needs a deal value, Lost needs a reason; back / reopen is managers-only with a reason; Won and Lost reopen first; 5 s undo). Colours come from the room palette (orange, brass, cream, warm, taupe). The ops funnel on the Ops wall now also says "Proposal Sent".
* **Left out on purpose:** every live read (no Hub, no Supabase, no network), customer / company names, phones, emails, deal values (BD amounts), owners, real counts and dates, the Hub's RBAC and drag-and-drop behaviour (it is a wall, not an app). The counts are made-up sample numbers (`bloom/ops.js`, `roadmapFrame`) that drift slowly; the wall says "Illustrative data" in both languages. Investors and guests can enter this room, so nothing real is shown.
* Same crispness as the other panels: `makePanel` at 341 to 369 px per metre (the 12 m wall is capped at the 4096 px texture width), anisotropy 8.

## Executive offices: how to edit

* `src/showroom3d/bloom/offices.js`: the five offices (`id`, `title` EN + AR, `accent` colour). **Titles only, no person names or photos.** Each office has an `options` array, **empty by default**, drawn on the wall panel inside the office ("Options coming soon / الخيارات قريبًا" while empty). To add options, put entries in the array, for example `options: [{ id: 'dashboard', title: { en: 'Operations dashboard', ar: 'لوحة العمليات' }, note: { en: 'Live KPIs', ar: 'مؤشرات مباشرة' } }]` (EN + AR both required, `note` optional, at most 6 are drawn; malformed entries are dropped by `officeOptions()`).
* Layout: `scenes/bloom/layout.js` (`WING`, `officeRect`, `OFFICE_LIST`): the wing is z 12..24, the doorway in the lobby's south wall is at x 3.4..5.2, the offices are 7.2 m wide and 7.5 m deep; the glass fronts and partitions are solid, the doors (1.1 m) are passable; each office has a quick-nav stop ("Departments" > Floors on Floor 2) and an E zone that walks you to it. Draw calls: the offices share merged geometry (one mesh per material, one merged glass mesh, one merged accent mesh), so they add about a dozen draws, mostly their ten small panels (name plates and option panels).

## Captions, Meeting mode and the film swap (meeting-day work)

* **Captions are ON by default**, in the page language: an English page shows `journey3.en.vtt`, an Arabic page `journey3.ar.vtt` (the film's narration is Arabic; English captions are a translation). Switching the page language moves the captions with it until the visitor picks one. On the wall the caption is drawn large (46 px on the 864 px layout, on an 88 % dark bar, centred with safe margins, two lines max); the panel has a **CC** on/off toggle and an **EN / العربية** switch (`aria-pressed`), and the `C` key still cycles. Proof screenshots: `docs/screenshots/bloom/captions-1440x900.jpg`, `captions-1024x768@2x.jpg` (a mid-film seek at about 1:41, real playback in Google Chrome).
* **Meeting mode**: `/yas-bloom?meeting=1` (skips the intro, rides the lift, glides to the lobby view) or Departments > "Meeting mode: open Bloom Meeting". The new film downloads during the ride; the lobby shows a **"Film ready"** pill (or "Preparing film... N%"), and the wall panel says "Ready: starts instantly". Only the new film is fetched (not the other VIP films); phones and iPads (coarse pointer) get the 720p file. Checklist: `docs/bloom-meeting-checklist.md`.
* **The lift is no longer solid-but-invisible**: its collider exists only once the lift is drawn (`buildColliders({ lift })`), and the Bloom chunk is now fetched during the intro (1.2 s after the engine is ready), not after it.
* **Subtle light sweep** along the top LED line of the video wall (one additive quad, a slow sine travel; off under reduced motion). The wall itself is already at the largest 16:9 the 5 m ceiling allows (7.6 x 4.3 m), so it was not enlarged.

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

## Chairs, Lead Roadmap and offices: measured (this round)

* Floor 2 renderer.info (high tier, Chromium on SwiftShader, 640x400): **39 to 107 draw calls** depending on the view (lobby 90, boardroom 74, corridor 60, inside an office 39, looking north through the skyline 107), 36 to 51 k triangles. Budget was under 150; the iPad was not measured.
* Bundles (build of this branch): `main` 2,151,354 B (gzip 506.9 KB); `showroom3d` chunk 894,852 B (gzip 245.3 KB); lazy `bloom-meeting` chunk **48.3 KB (15.2 KB gzip)** (it was 37.2 KB before the offices and the Lead Roadmap); lazy `haneen-chat` 52.6 KB (13.8 KB gzip). No new texture files.
* Screenshots (`docs/screenshots/bloom/`): `chairs-boardroom-*`, `chairs-ops-pods-*` (iPad 1024x768@2x and the wide 2000x924 crop), `roadmap-wall-*` (iPad, desktop, Arabic), `offices-corridor-*`, `office-<title>-ipad-*` / `-desktop-*` for all five offices (+ Arabic for the IT Head).
