# Film v2: "THE CLOSETS: The Journey of Ambition" (الخزائن: حكاية طموح), from the owner's new script

A second version of the VIP-room documentary, built from the owner's **new Arabic script** (34 narrated lines plus one stage direction, used verbatim; two typos were fixed by the coordinator: "استراتيجية" and "ومن هنا"). It **adds** files named `journey2-*` and `film2.json` beside the first film; nothing of v1 is changed or removed, and nothing in `src/` or `films.json` is touched (the wiring is described below, to be applied after the owner approves the film).

Read `JOURNEY-V2-FACTS.md` first: the script states figures that differ from the rest of the repo (50,000+ projects against the first film's 10,000, 27+ patents, distribution to Iraq and Jordan, "Yas Factory" born after the pandemic against a profile that says 2007) and the film shows them as written.

## What the film is

* **Real photographs and AI illustration are mixed, and the film says so.** Two **real photographs of company leaders** (consent stated by the owner in chat on 15 November 2026: "Company leaders, both agreed") appear in four scenes as photographs with slow camera motion over a blurred, graded backdrop of the same photo. **No AI touched them**: no model received them (no upload, no reference image, no character element), no AI upscaler or face generator was used, and they are shown at a size where no upscaling is needed (photo 1 downscaled from 854x928, photo 2 downscaled from 945x1744 after cropping the phone's status and app bars). Everything else is AI-generated illustration: stills (Seedream 5.0 Flash, GPT Image 2.6 for the landmarks), 7 video shots (Kling 2.6; 3 re-used from v1, 4 new), the typeset maps, numbers and graphs (local).
* **Narration:** the owner's script, 34 lines read in one continuous take by the same synthetic voice as v1 (Text to Speech V2, ElevenLabs engine, preset voice "Alistair"). The stage direction ("wide shots of the factory and capacity, interspersed with finished-product details") is **not** read aloud; it is the visual beat of lines 26 to 28.
* **Music:** a new 228 s generated instrumental bed (ElevenLabs Music v2), same prompt family as v1, building toward the investment close and resolving. Mix: -16 LUFS integrated, narration clearly on top (the music is ducked 12 dB under the voice).
* **Captions:** `journey2.ar.vtt` is the script verbatim (asserted by the build), 47 cues timed from the narration's word timings; `journey2.en.vtt` is an English **translation** (marked as such inside the file and in `film2.json`).

## On-screen wording (exact)

| Where | English | Arabic |
|---|---|---|
| End card, label | Real photographs of company leaders; all other imagery is AI-generated illustration. | صور حقيقية لقيادات الشركة، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي. |
| End card, disclaimer (the repo's own `DISCLAIMER` in `src/showroom3d/vip/deckSchema.js`, verbatim) | Information only, not an offer or financial advice; details provided directly by management. | للاطلاع فقط، وليس عرضًا ولا نصيحة مالية؛ تُقدَّم التفاصيل مباشرة من الإدارة. |
| End card, credits | Narration: synthetic voice. Music: generated. | التعليق الصوتي بصوت اصطناعي، والموسيقى مولّدة. |
| Badge on the leaders' scenes | REAL PHOTOGRAPH | صورة حقيقية |
| Title (as v1) | THE CLOSETS / THE JOURNEY OF AMBITION | الخزائن — حكاية طموح |
| Figures | 50,000+ PROJECTS; 27+ PATENTS ON ALUMINIUM PROFILES | مشروع؛ براءة اختراع لبروفايلات الألمنيوم |
| Name | YAS FACTORY | مصنع ياس |
| Map | BAHRAIN, SAUDI ARABIA, QATAR, UNITED ARAB EMIRATES, KUWAIT, OMAN, IRAQ, JORDAN ("SCHEMATIC MAP, NOT TO SCALE") | البحرين، السعودية، قطر، الإمارات، الكويت، عُمان، العراق، الأردن |
| Digital system | ONE DIGITAL SYSTEM: PRODUCTION, INVENTORY, SALES, SUPPLY CHAINS | منظومة رقمية: الإنتاج، المخزون، المبيعات، سلاسل التوريد |
| End card, close | FROM AN IDEA ON PAPER… TO AN INDUSTRY BEYOND BORDERS. / WE MAKE TODAY. / WE INVEST IN TOMORROW. | نصنع اليوم، ونستثمر في الغد. |

The disclaimer line the coordinator quoted ("...؛ التفاصيل تُقدَّم مباشرة من الإدارة") differs by two words' order from the repo's constant; the repo constant is used as asked ("reuse it"). The Arabic webfont subsets in the repo have no Latin full stop, so a trailing "." is drawn with Inter at the end of each Arabic line (`ar_text` in `build_film2.py`). **No landmark and no project is named on screen.** The photographs are not named or titled; a documented empty lower-third slot exists (`LOWER_THIRD = None` in `build_film2.py`, bottom-left of the leaders' scenes; set it to `{"en": "...", "ar": "..."}` and rebuild to fill it).

## Storyboard as delivered (film time in seconds; 219.0 s in all)

Narration runs from 2.0 s to 207.2 s (one continuous take; the voice is never cut or stretched). Each shot starts on a word of the line it illustrates. "NEW" = generated for v2, "v1" = re-used from the first film (no new charge).

### Scenes and narration line ranges

| Scene | Script lines | Narration (film s) |
|---|---|---|
| 1 An idea on paper, Bahrain, the workshop | 1 to 5 | 0.0 to 22.2 |
| 2 Two factories, 50,000+ projects | 6 to 7 | 22.2 to 41.8 |
| 3 Signature projects | 8 to 8 | 41.8 to 53.1 |
| 4 Experience, then the pandemic | 9 to 12 | 53.1 to 68.9 |
| 5 The question and Yas Factory | 13 to 17 | 68.9 to 94.9 |
| 6 The region, designs, patents | 18 to 22 | 94.9 to 134.0 |
| 7 A new chapter: leaders, deals, the digital system | 23 to 25 | 134.0 to 163.0 |
| 8 Stage direction: capacity and finished detail | 26 to 28 | 163.0 to 170.4 |
| 9 The investment call | 29 to 31 | 170.4 to 199.1 |
| 10 Close | 32 to 34 | 199.1 to 207.2 |

### Shot by shot

| Shot | Film time (s) | Length (s) | Script line | Source | Picture and on-screen text |
|---|---|---|---|---|---|
| A01 | 0.0 to 6.6 | 6.6 | 1-2 | NEW still `n_sketch` | a pencil line becoming the outline of a factory; title card (EN + AR) |
| A02 | 6.6 to 11.8 | 5.3 | 3 | NEW video `v6_dawn` (from `lm_dawn`) | Manama at dawn: a dhow and the BWTC silhouette (landmark, AI) |
| A03 | 11.8 to 16.8 | 5.0 | 4 | v1 video `v1_workshop` | the craftsman draws by hand |
| A04 | 16.8 to 19.0 | 2.2 | 4 | v1 still `1e` | sawing, sawdust in the light |
| A05 | 19.0 to 22.2 | 3.2 | 5 | v1 still `2a` | the busier workshop (the dream grew) |
| B01 | 22.2 to 26.2 | 4.0 | 6 | v1 still `3a` | the two factories from the air |
| B02 | 26.2 to 30.9 | 4.7 | 6 | v1 video `v2_cnc` | CNC router cutting a panel (European machinery) |
| B03 | 30.9 to 33.2 | 2.3 | 7 | v1 still `2c` | the first project: a drawing on paper |
| B04 | 33.2 to 35.4 | 2.2 | 7 | v1 still `5a` | a finished kitchen; "50,000+" count-up starts on the words "fifty thousand" |
| B05 | 35.4 to 37.5 | 2.1 | 7 | v1 still `5c` | a bedroom wardrobe |
| B06 | 37.5 to 39.6 | 2.1 | 7 | v1 still `5b` | a walk-in closet |
| B07 | 39.6 to 41.8 | 2.2 | 7 | v1 still `5d` | interior doors |
| C01 | 41.8 to 45.6 | 3.8 | 8 | NEW still `lm_bluehour` | Manama skyline, BWTC (landmark, AI) |
| C02 | 45.6 to 47.2 | 1.6 | 8 | NEW still `n_marassi` | generic AI waterfront while "Marassi Al Bahrain" is spoken |
| C03 | 47.2 to 48.8 | 1.5 | 8 | NEW still `lm_durrat` | generic crescent-island resort while "Durrat Al Bahrain" is spoken |
| C04 | 48.8 to 50.1 | 1.3 | 8 | NEW still `n_waterbay` | generic AI waterfront while "Water Bay" is spoken |
| C05 | 50.1 to 53.1 | 3.1 | 8 | NEW still `n_housing` | generic government-housing neighbourhood |
| D01 | 53.1 to 56.6 | 3.4 | 9 | v1 still `5e` | installers: experience |
| D02 | 56.6 to 60.6 | 4.0 | 10 | v1 still `7a` | a designer: a new idea |
| D03 | 60.6 to 63.4 | 2.8 | 11 | NEW still `n_ships` | ships waiting at anchor (the pandemic); cold grade |
| D04 | 63.4 to 66.7 | 3.2 | 12 | NEW video `v7_port` | an idle port, a queue of trucks |
| D05 | 66.7 to 68.9 | 2.2 | 12 | NEW still `n_shelves` | empty racking |
| E01 | 68.9 to 71.1 | 2.2 | 13 | NEW still `lm_fort` | a fort by the sea (landmark, AI): "what if we made it here" |
| E02 | 71.1 to 74.5 | 3.4 | 14 | NEW still `lm_tree` | the lone tree in the desert (landmark, AI): "in Bahrain" |
| E03 | 74.5 to 77.8 | 3.3 | 15 | NEW still `n_site` | the factory frame goes up; "YAS FACTORY / مصنع ياس" on screen |
| E04 | 77.8 to 82.9 | 5.1 | 16 | NEW video `v4_press` | the panel pressing line (first of its kind) |
| E05 | 82.9 to 88.8 | 5.9 | 17 | NEW still `n_clad` | laminate bonded to a board (cladding) |
| E06 | 88.8 to 89.9 | 1.1 | 17 | v1 still `6b` | quality control |
| E07 | 89.9 to 91.9 | 2.0 | 17 | NEW still `n_products` | finished doors in packing |
| E08 | 91.9 to 94.9 | 3.1 | 17 | NEW still `n_export` | a container leaves the factory gate |
| F01 | 94.9 to 100.0 | 5.0 | 18 | NEW video `v5_causeway` | the King Fahd Causeway (landmark, AI): "set out to the region" |
| F02 | 100.0 to 106.4 | 6.4 | 19 | local typeset map | schematic map: Bahrain, then Saudi Arabia, Qatar, UAE, Kuwait, Oman, then Iraq, Jordan |
| F03 | 106.4 to 112.4 | 6.0 | 20 | NEW still `n_swatch` | exclusive designs and colours |
| F04 | 112.4 to 116.5 | 4.1 | 20 | v1 still `7e` | a hinge and handle detail |
| F05 | 116.5 to 120.0 | 3.5 | 21 | NEW still `n_profiles` | aluminium profiles and a section drawing |
| F06 | 120.0 to 125.8 | 5.8 | 22 | NEW still `n_profile_macro` | profile section; "27+" count-up on screen |
| F07 | 125.8 to 130.0 | 4.2 | 22 | v1 still `3d` | engineers (designed by our team) |
| F08 | 130.0 to 134.0 | 4.0 | 22 | v1 still `3c` | edge-banding line |
| G01 | 134.0 to 139.8 | 5.8 | 23 | REAL photographs (diptych) | the two leaders: "today we open a new chapter" |
| G02 | 139.8 to 143.8 | 4.0 | 24 | NEW still `n_signing` | hands signing (new deals) |
| G03 | 143.8 to 147.8 | 4.0 | 24 | NEW still `lm_bwtc` | BWTC at dusk (landmark, AI): larger markets |
| G04 | 147.8 to 151.2 | 3.4 | 25 | v1 still `3b` | the team at the CNC |
| G05 | 151.2 to 154.6 | 3.4 | 25 | v1 still `7b` | CNC console |
| G06 | 154.6 to 163.0 | 8.4 | 25 | v1 still `7d` | dashboards; "ONE DIGITAL SYSTEM": production, inventory, sales, supply chains |
| H01 | 163.0 to 165.2 | 2.2 | 26 | NEW still `n_wide` | stage direction: a very wide factory hall |
| H02 | 165.2 to 167.3 | 2.0 | 27 | NEW still `n_detail` | stage direction: finished product detail |
| H03 | 167.3 to 170.4 | 3.2 | 28 | v1 video `v3_drone` | stage direction: the factories from the air, room to grow |
| I01 | 170.4 to 174.4 | 4.0 | 29 | REAL photograph (first leader) | the investment opportunity |
| I02 | 174.4 to 177.3 | 2.9 | 30 | v1 still `8a` | the factories at golden hour (capacity) |
| I03 | 177.3 to 179.9 | 2.6 | 30 | NEW still `n_profiles` (crop) | new products |
| I04 | 179.9 to 183.5 | 3.6 | 30 | NEW still `lm_bwtc` | exports to the world (landmark, AI) |
| I05 | 183.5 to 190.7 | 7.2 | 31 | REAL photograph (second leader) | a strategic partnership |
| I06 | 190.7 to 194.8 | 4.1 | 31 | NEW still `lm_dawn` | Manama (landmark, AI) |
| I07 | 194.8 to 199.1 | 4.3 | 31 | v1 still `7d` | measurable goals (dashboards) |
| J01 | 199.1 to 201.0 | 1.9 | 32 | v1 still `1d` | the idea on paper |
| J02 | 201.0 to 204.1 | 3.1 | 33 | NEW still `lm_causeway` | an industry beyond borders (landmark, AI) |
| J03 | 204.1 to 208.2 | 4.1 | 34 | REAL photographs (diptych) | we make today, we invest in tomorrow |
| K01 | 208.2 to 219.0 | 10.8 | end | local typeset card | logo, the close, the honest label, the disclaimer, credits |

On-screen text is the typeset text listed under "On-screen wording"; the Arabic captions (journey2.ar.vtt) run over the whole film.

## Files (all additive; v1 untouched)

| File | What | Size |
|---|---|---|
| `public/yas-bloom/film/journey2-1080.mp4` | H.264 High, yuv420p, 1920x1080, 24 fps, AAC-LC 96k stereo, faststart, 219.0 s | 26,097,808 bytes (24.9 MiB) |
| `public/yas-bloom/film/journey2-720.mp4` | same at 1280x720, AAC 80k | 12,774,642 bytes (12.2 MiB) |
| `public/yas-bloom/film/journey2-poster.jpg` | title frame, 1280x720 | 121,495 bytes |
| `public/yas-bloom/film/journey2.ar.vtt` / `journey2.en.vtt` | captions, 47 cues each (English marked as a translation) | 4,976 / 4,306 bytes |
| `public/yas-bloom/film/film2.json` | manifest, same schema as `film.json` plus `mixed` and `label` | 3,005 bytes |
| `src/showroom3d/preload/manifest.json` | **regenerated** (`node scripts/showroom3d-preload/make-manifest.js`, one line): the generator picks up every `public/yas-bloom/film/*-poster.jpg`, so adding `journey2-poster.jpg` made the committed manifest stale and `preloadAssets.test.js` red; the new manifest adds that one 121 KB poster to the "vip" preload group. If the film is not wired, drop `journey2-poster.jpg`'s entry by re-running the generator without it | |
| `docs/showroom3d/JOURNEY-V2.md`, `JOURNEY-V2-FACTS.md` | this file; the claims to confirm | |
| `docs/showroom3d/film-src/journey2-ledger.json`, `journey2-ledger.md`, `journey2-narration.words.json` | credits ledger with prompts and job ids; narration word timings | |
| `docs/showroom3d/screenshots/journey2-contact-sheet.jpg` | 24 frames of the finished film | |
| `scripts/showroom3d-film/` `build_film2.py`, `mix_audio2.py`, `encode_film2.py`, `fetch_sources2.py`, `prepare_leaders.py`, `journey2_script.py`, `gen_ledger2.py` | the build, reusing `build_film.py`'s helpers | |

Total new film files: 38.9 MB (the budget was about 40 MB). The two real photographs are **not** in the repository or in `public/` as files: they exist only inside the finished video and the poster/contact-sheet frames. No raw clip, no source still, no node_modules is committed.

## How each kind of scene was made

* **Real photographs of the leaders (4 scenes, 22.8 s in all):** `prepare_leaders.py` crops the status bar and the app bar off the phone screenshot by measuring where the dark bars end (photo 2: 945x2048 to 945x1744; nothing stretched) and passes photo 1 through unchanged. `build_film2.py` then draws each photograph at its **true proportions** in a thin cream frame (700 to 740 px high on a 960 px picture) over a heavily blurred, darkened, warm-graded version of the same photograph, with a slow push and drift inside the frame (never beyond the photo's native resolution, so nothing is upscaled and nothing looks soft). The grade is the film's own "mod" grade. A small "REAL PHOTOGRAPH / صورة حقيقية" badge sits bottom-right; bottom-left is the empty lower-third slot. Nothing was sent to any model.
* **Re-used v1 stills and clips** (23 of the 58 shots: 20 stills and 3 clips; the rest are 29 new AI shots, 4 real-photograph shots and 2 typeset cards or maps): fetched again from the v1 ledger (`generations.json`), no new charge. The founder-as-older-man frames of v1 (`6a`, `8b`) were deliberately **not** re-used, so no AI-invented "leader" sits next to the two real ones.
* **New AI stills** (Seedream 5.0 Flash at 0.5 credit for scenes and details; GPT Image 2.6 medium at 1.0 for the landmarks, after a three-model test on the Bahrain World Trade Center showed Seedream draws two parallel blades and Nano Banana 2.1 tilts the turbines, while GPT Image 2.6 gets two triangular sail towers, three bridges and three turbines right).
* **New AI video** (Kling 2.6 image-to-video, 5 s, silent, 5 credits each): `v4_press` (the pressing line), `v5_causeway` (the causeway), `v6_dawn` (Manama at dawn), `v7_port` (the idle port). Re-used: `v1_workshop`, `v2_cnc`, `v3_drone`.
* **Everything with letters or numbers is typeset locally** with the site's fonts (Fraunces, Inter, Noto Naskh Arabic, IBM Plex Sans Arabic), never by a model: the title, "50,000+", "27+", "YAS FACTORY / مصنع ياس", the schematic map and its labels, the digital-system graph, the leaders' badge and the end card. The map has dots at true latitude/longitude (equirectangular, Gulf at the centre), a graticule and curved routes from Bahrain; it has **no coastlines** on purpose (nothing hand-drawn that could be wrong) and says "SCHEMATIC MAP, NOT TO SCALE".
* **Timing follows the voice:** `journey2_script.align_lines` matches the 291 script words to the recogniser's word times, every shot start in `build_film2.py` is `tl(line)` or `tw(line, word)` (film seconds = narration seconds + 2.0). To change the script or the voice, replace `narration2.mp3`, rerun the recogniser, and rebuild.
* **Camera, grade, light leaks, dust:** as v1 (`build_film.py` helpers): slow exponential zooms, a warm "historical" grade for the workshop scenes, a clean "modern" grade for today, a cold grade for the pandemic beat, dissolves of 0.3 to 0.9 s, one warm flash on "a new chapter" and one on the logo.

## Credits (Higgsfield, Plus plan, no unlimited allowance; cap 150)

Every quote was taken with `get_cost` first and equalled the charge shown by `transactions`. Full ledger with job ids and prompts: `docs/showroom3d/film-src/journey2-ledger.md` and `.json`.

| Item | Model | Each | Count | Credits |
|---|---|---|---|---|
| Landmark model test: BWTC | Seedream 5.0 Flash 2k / Nano Banana 2.1 2k (image search) | 0.5 / 2.0 | 1 + 1 | 2.50 (both rejected) |
| Landmark stills 2k | GPT Image 2.6 medium | 1.0 | 8 (7 used, `lm_fateh` rejected) | 8.00 |
| Scene and detail stills 2k | Seedream 5.0 Flash | 0.5 | 19 (18 used, `n_euro` unused) | 9.50 |
| New video shots, 5 s, silent | Kling 2.6 | 5.0 | 4 | 20.00 |
| Narration, one read, 205 s (34 lines) | Text to Speech V2 (ElevenLabs), preset voice Alistair | 5.55 | 1 | 5.55 |
| Music, 228 s instrumental | ElevenLabs Music v2 | 14.58 | 1 | 14.58 |
| **Film v2 total** | | | | **60.13** |
| Balance | 1000.00 before, **939.87 left** (confirmed with `balance`) | | | |

Wasted (generated, not used): 4.00 credits (the two BWTC tests, the Al Fateh mosque, the beam-saw still). No shot needed a retry (the first output of every shot passed the check below; the 7 submissions refused by a rate limit were not charged). Why not extend the v1 music instead: the v1 bed is 128 s and ends on a resolved chord; the new film is 219 s with a build to the investment close, so a fresh 228 s bed (14.58) was better value than two crossfaded edits of an old one; it was not auditioned by ear.

## Wiring change (NOT applied here; for the coordinator after the owner approves the film)

The player decides the label from the manifest's `real` flag: any film with `real: false` shows **"AI-generated illustration"** over the whole film (agenda card, panel note, cinema badge, the strip over the playing film). That would be **inaccurate for v2** (two real photographs) and a film with `real: true` would carry no label at all (worse). So v2 needs a third state, "mixed". `film2.json` already declares `"real": false, "mixed": true` and a `"label": { en, ar }` (the current parser ignores both extra keys, so loading it today would still show the old label: do not wire it without the change below).

Minimal change (all small, all in the VIP film code):

1. `src/showroom3d/vip/film.js`
   * add `export const FILM_MIXED_LABEL = { en: 'Real photographs of company leaders; all other imagery is AI-generated illustration', ar: 'صور حقيقية لقيادات الشركة، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي' };`
   * add a short badge for the strip over the playing film (the long text does not fit the 22 px badge): `export const FILM_MIXED_BADGE = { en: 'Leaders: real photos · other imagery: AI illustration', ar: 'صور حقيقية للقيادات · والباقي مولّد بالذكاء الاصطناعي' };`
   * `parseFilmManifest`: keep `mixed: j.mixed === true` on the returned film (next to `real`); `parseFilmsManifest` must force `real: false` for it as it does for every non-real film.
   * `filmLabel(film)`: `film && film.real === true ? null : film && film.mixed === true ? FILM_MIXED_LABEL : FILM_AI_LABEL`.
2. Use `filmLabel(film)` (or the badge) where `FILM_AI_LABEL` is used directly today: `src/showroom3d/ui/VipFilm.jsx` line 20 (panel note) and line 63 (cinema badge: `FILM_MIXED_BADGE` when mixed), `src/showroom3d/scenes/vip/panels.js` line 319 (the meta line on the wall poster: full label) and line 328 (the strip over the film: `FILM_MIXED_BADGE`), `src/showroom3d/vip/meeting.js` line 35 (the agenda entry: `label: FILM_MIXED_LABEL`).
3. `public/yas-bloom/film/films.json`: change the last entry from `{ "id": "journey", "manifest": "/yas-bloom/film/film.json", "real": false, "order": 99 }` to `"manifest": "/yas-bloom/film/film2.json"` (**replace**, keep the id `journey`, so the agenda, the keys and the "last item" logic are unchanged; adding a second AI-film entry would add a seventh agenda item and break the agenda-walk test). v1 stays on disk, unreferenced, as the fallback. Agenda title stays `FILM_TITLE` ("The Closets: The Journey of Ambition" / "الخزائن: حكاية طموح"); the agenda text for the entry can say "Real photographs of company leaders; all other imagery AI-generated" via the label above.
4. Tests to follow: `vipMeeting.test.js` asserts the `journey` list entry equals `{ id, manifest: '/yas-bloom/film/film.json', real: false, order: 99 }` (change the path), the label-rule test gets a mixed case (`filmLabel({ mixed: true, real: false })` is `FILM_MIXED_LABEL`), and `JSON.stringify(LIST)` must still not match `/journey-\d/` (the path `film2.json` is fine). The agenda labels in `src/showroom3d/__tests__/vipMeeting.test.js` that compare to `FILM_AI_LABEL` for the journey entry change accordingly.
5. **Size caps:** `vipMeeting.test.js` checks `films.json` entries that carry inline `sources` against 14 MB main / 7 MB mobile, with `SIZE_CAP_MB` overrides per id. The journey is referenced by manifest, so **no current cap is exceeded**; if the film were ever inlined into `films.json`, the caps needed are `'journey': [28, 14]` (files: 1080p 24.9 MiB (26,097,808 bytes), 720p 12.2 MiB (12,774,642 bytes), poster under 150 KB). The Vercel cache header for `/yas-bloom/film/*` and "no autoplay with sound" notes of `FILM.md` still apply.
6. `film2.json` fields not read by the current parser (`mixed`, `label`, `credits`, `audio`, `notes`) are harmless; `sources`, `poster`, `captions`, `title`, `durationSec` follow the v1 schema exactly. The English caption track is labelled "English (translation)".

## Scores (honest, out of 10) and what to improve first

Frames were extracted from the finished 1080p file at 45% of each of the 58 shots plus the title, the count-ups, the map, the graph and the end card, and looked at one by one (contact sheet: `docs/showroom3d/screenshots/journey2-contact-sheet.jpg`, 24 frames).

| Scene | Score | Why |
|---|---|---|
| 1 Idea on paper, Bahrain, the workshop (0 to 22 s) | 8 | the sketch title card and the dawn bay with the BWTC read well; the workshop frames are v1's best |
| 2 Two factories, 50,000+ projects (22 to 41.8 s) | 7.5 | the aerial and the CNC clip are strong; the project montage is v1 stills, the count-up is clean |
| 3 Signature projects (41.8 to 53 s) | 7.5 | generic AI waterfronts, tidy but they are stand-ins; the viewer hears three names over pictures of no real project |
| 4 Pandemic (53 to 68.9 s) | 8 | ships, idle port video and empty racking carry the mood in a cold grade |
| 5 The question, Yas Factory (68.9 to 94.9 s) | 7.5 | the lone tree and the pressing-line video are good; the fort is the least certain landmark (6.5); the QC and packing frames are generic |
| 6 Region, designs, patents (94.9 to 134 s) | 8 | the causeway video, the swatch fan and the profile macro are the best new frames; the map is plain (7), by design: no coastlines |
| 7 New chapter, deals, digital system (134 to 163 s) | 7.5 | the two real photographs read well, uncropped and sharp; the hands-signing crop and the graph over the dashboards are fine |
| 8 Stage direction: wide factory, finished detail (163 to 170.4 s) | 8 | wide hall, detail, aerial from the first film |
| 9 Investment call (170.4 to 199 s) | 7.5 | single photographs on a blurred backdrop; photo 2 is the smaller, lower-resolution card; BWTC and the dawn bay repeat |
| 10 Close and end card (199 to 219 s) | 8 | the label, disclaimer and credits are all legible; Arabic joined and in the right order |

Weakest, in order: (1) the map (plain, no basemap), (2) the Qal'at al-Bahrain frame (plausible, not certain), (3) the repeated BWTC (five appearances: it is the owner's landmark, but a viewer will notice), (4) the generic project stand-ins in scene 3, (5) photo 2 shown small because its source is a phone screenshot. None was regenerated: no frame was bad enough to retry, and the retry cap was not needed.

## Verification

* `ffprobe`: both files H.264 High, yuv420p, 24 fps, AAC-LC stereo 48 kHz, 219.0 s, `moov` before `mdat` (faststart). Full `ffmpeg` decode of both: no errors.
* Loudness (`ebur128`, on the decoded AAC): 1080p **-16.1 LUFS** integrated, 720p -16.0; true peak -2.2 and -1.9 dBFS (below the -1 dBFS limit); loudness range 1.7 LU. Inside the narration the voice is about 7.7 LU above the music under it (-21.2 against -28.9 LUFS, measured on the mix stems).
* Narration against the script: transcribed with faster-whisper medium (in the Higgsfield sandbox, as for v1): **291 words recognised, 291 in the script, every one of the 34 lines matched** (`journey2-narration.words.json`; the recogniser's spelling differs in tanween and hamza only). The final mixed file was **not** transcribed (the sandbox could not receive the file: the egress proxy refuses `upload.higgsfield.ai`); the pre-mix narration was, and the mix keeps it 7.7 LU above the music.
* Captions: `journey2.ar.vtt` is asserted equal to the script (the build fails otherwise); 47 cues, each timed from the matched word times (+/-0.06 s lead, 0.3 s tail); the first cue starts at 1.94 s and the voice starts at 2.0 s. The English file is a translation and says so in its `NOTE` block.
* `scripts/showroom3d-qa/vipprofile.js media` reads `films.json` only and was **not** pointed at the new files (that would need an edit to the script or to `films.json`, both out of scope); its checks were repeated by hand: codec, profile, pixel format, audio, sizes, faststart, VTT validity, poster size. HTTP byte-range serving was not tested.
* Jest: `CI=true TZ=UTC npx react-scripts test --watchAll=false src/showroom3d` first gave 809 passed, 3 skipped, 1 failed, in 41 of 47 suites. The one failed test was `preloadAssets.test.js` (stale manifest after adding the poster; fixed by regenerating `manifest.json`, see Files; that file now passes, 33 of 33). The other 5 failing suites (`director`, `explorer`, `focus`, `ui`, `explorerStudio`) cannot load: `Cannot find module 'gsap'`, because this checkout's symlinked `node_modules` (from `/home/user/closets.com`) lacks that package; they do not touch this work (nothing in `src/` was changed except the generated manifest). The film tests (`vipMeeting`, `vipFilm`) pass (44 of 44).
* Frames viewed: every one of the 58 shots (a frame at 45% of each) in the full render, then the changed frames (map, end card, count-ups, graph, YAS label) and a 24-frame sheet again in the finished file. Typesetting: Arabic joined and right-to-left on the title, the map, the graph, the number labels and the end card; the Latin full stop that the Arabic font subsets lack is drawn separately; no garbled text found. No real-brand logo, no readable text inside any picture, no flag.

## What could not be verified

* **Nobody has listened to the Arabic narration**: accent, dialect words and tone need a native speaker. Nobody has listened to the music either (its loudness and level against the voice were measured only). No real-device playback test.
* Whether the AI landmarks are recognisable to Bahrainis (checked against the real buildings from the prompt's feature list and by eye, not by a local viewer); the fort is the doubtful one.
* Whether the "27+" patents, the "50,000+" projects and the other claims are true (see the facts file).
* That the leaders' consent is documented beyond the owner's statement in chat (15 November 2026); that the bystander at the left edge of photo 2 may be shown.
* Photo 2 contains a partial second person at its left edge and a dark shoulder on its right (visible in the diptych and the single frame).

## Owner decisions needed

1. Confirm or correct the figures and claims in `JOURNEY-V2-FACTS.md` (column "Owner confirms").
2. Permission to name Marassi Al Bahrain, Durrat Al Bahrain and Water Bay in a film that shows only generic imagery (the names are heard, not shown).
3. Names and titles for the two leaders (the slot is ready) and whether the second photo's bystander is acceptable.
4. Whether the disclaimer wording is enough for an investment call (the owner chose "use the script as written, add a standard disclaimer").
5. A native-speaker listen to the narration (and a choice between this voice and a human recording; a recording drops in as `narration2.mp3`).
6. Approve the wiring change (a third "mixed" label state) before the film is shown.

## Rebuild

```
pip install pillow numpy fonttools brotli        # ffmpeg with libx264 on PATH
cd scripts/showroom3d-film
python3 fetch_sources2.py  /tmp/film2/src                      # v1 + v2 sources from the ledgers; spends nothing (plus narration2.mp3, music2.mp3)
python3 prepare_fonts.py   ../../node_modules /tmp/film2/fonts
python3 prepare_leaders.py <photo-1.jpg> <photo-2.jpg> /tmp/film2/leaders      # the real photographs; never commit them
python3 build_film2.py --src /tmp/film2/src --fonts /tmp/film2/fonts --logo <the-closets-logo-official.jpg> --leaders /tmp/film2/leaders --out /tmp/film2/work
python3 mix_audio2.py      /tmp/film2/src /tmp/film2/work
python3 encode_film2.py    /tmp/film2/work ../../public/yas-bloom/film
python3 gen_ledger2.py                                                         # rewrites the ledger files from the recorded data
```

`--frames 3.6,106` renders single frames to check; `--edl` prints the edit list. The source PNGs and clips are not in the repository (about 400 MB); the CDN URLs in the ledger are the backup.
