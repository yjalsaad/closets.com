# Film v3: v2 with the leaders set in an office, honest labels, and re-cut English captions

**Status in one paragraph.** The owner asked for the two leaders to be part of the scenes (one at an office desk, the other signing) and to *move*, by animating the same real photographs with AI. **That AI animation was not done.** Sending the two real photographs to Higgsfield (the upload) was **denied by the permission system** when I tried it (the auto-mode classifier refused the PUT as unauthorised access to a real person's likeness). Two messages relayed by the coordinator say the owner approved it, but a relayed message is not an approval the permission system accepts, so I stopped there: **no workaround was tried** (no widget, no base64 relay, no other host), **no photograph was uploaded or sent to any model**, and **no credit was spent on animation**. Everything that does not need the photographs to leave this machine was done: the English captions, the honest labels, and a local layered version of the leaders' scenes (below). If the owner (or whoever holds the permission settings) allows the upload, the AI-animated version is a short, prepared job (see "To get the AI-animated version").

v2 stays untouched as the fallback (`journey2-*`, `film2.json`). v3 adds `journey3-*` and `film3.json`; the narration and the music are v2's, unchanged (same mix, same 219.0 s).

## Consent record (no names)

* Owner statement in chat, 15 November 2026: the two company leaders both agreed to appear in the film (recorded in `JOURNEY-V2.md`).
* Owner statement in chat, 15 November 2026, relayed by the coordinator: both leaders also agreed to **AI animation of their photographs**. Written consent has **not** been seen. Names and titles have not been supplied and are not shown.
* This statement is recorded here as a fact about what the owner said. It did not unlock the upload: no animation exists in this version.

## What changed from v2

1. **The leaders' scenes (4 shots, 22.8 s)** now sit in a room: an AI-generated, empty executive office with a desk, blank papers and a pen (and an empty boardroom with blank documents), softly out of focus and drifting slowly one way, while the real photograph, framed and never distorted, drifts the other way (a layered parallax). They are **not** seated or signing: the photographs are head and shoulders, and I did not invent bodies for them. The signing beat is the v2 insert of two anonymous hands and a pen on blank paper (an AI illustration, no face), which follows the first leaders' scene. The photographs remain real pixels, shown at a size where nothing is upscaled.
2. **Honest labelling.** The badge on those scenes now reads "REAL PHOTOGRAPH · AI-GENERATED OFFICE / صورة حقيقية، ومكتب مولّد بالذكاء الاصطناعي". The end card and `film3.json` say: EN "Leaders appear from real photographs (camera motion only) in an AI-generated office; all other imagery is AI-generated illustration." AR "يظهر القياديون من صور حقيقية بحركة كاميرا فقط داخل مكتب مولّد بالذكاء الاصطناعي، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي." The disclaimer and the synthetic-voice credit are unchanged. The office scenes do not show real meetings or signed agreements and are not presented as such (`film3.json` notes say so).
3. **English captions re-cut for reading** (`journey3.en.vtt`): 51 cues, at most **two lines of 42 characters**, balanced line breaks, long sentences split at phrase boundaries with the time shared by length, timed from the narration word timings of the final audio (first cue 1.94 s, last cue ends 207.5 s; the audio is v2's, so the timing is the v2 timing). Worst reading speed 22.2 characters per second (one 39-character cue over 1.76 s); everything else is slower. The file says it is a translation. `journey3.ar.vtt` is v2's Arabic track unchanged (the script verbatim).
4. **English by default.** The player already chooses the caption track from the page language (`defaultCaption(captions, lang)` in `src/showroom3d/vip/film.js`: the page language first, then the other, then off), so English on an English page and Arabic on an Arabic page, whatever order the manifest lists them. `film3.json` lists English first and marks it `default`. A new test (`src/showroom3d/__tests__/journey3.test.js`) checks this with the real `film3.json`, the 42-character / two-line limit, cue order, the label and the file sizes.

## Credits

| Item | Model | Each | Count | Credits |
|---|---|---|---|---|
| Empty office backdrops (desk office, boardroom), 2k | Seedream 5.0 Flash | 0.50 | 2 | 1.00 |
| AI animation of the leaders | not run (upload denied) | | 0 | 0.00 |
| **Film v3 total** | | | | **1.00** (cap 120) |

Both quotes were taken with `get_cost` first. Running total for v2 + v3: 61.13 credits; balance 938.87. The two prompts are in `docs/showroom3d/film-src/journey3-ledger.md` (job ids `74411444-5636-4959-8119-8219f087eedb` office, `a467192b-472a-463e-9c6c-ecad1b01a073` boardroom). The office stills contain no people, no text and no logo.

## Network note

To attempt the upload I asked for (and was given) one allowed host, `upload.higgsfield.ai`, on the Default cloud environment (it is still allowed; remove it in the environment settings if it is not wanted). That host was also what the v2 final-mix transcription needed.

## To get the AI-animated version (prepared, not run)

* Start frames are ready in a scratch folder (not in git): photo 1 cropped to 854x854, photo 2 cropped to 945x1680 (9:16), no retouching.
* Candidate models (from `models_explore`): Kling 3.0 (start image, 5 s, 16:9 / 9:16 / 1:1), Kling 2.6 (5 credits per 5 s silent, as used for v2), Seedance 2.5 (omni reference with a start image), MiniMax Hailuo (facial emotion). Plan: one 5 s test per leader on the cheapest model, extract frames, accept only if the face stays recognisably the same with no morphing; otherwise stop and keep this version. Budget: a few tests and two finals fit well under the 120-credit cap.
* The prompts would be subtle (blink, small nod, a smile, a slow camera push) with no readable documents, no logos, no named third parties.
* The label then becomes the coordinator's wording: EN "Leaders appear from real photographs, animated with AI; all other imagery is AI-generated illustration." and the badge "AI-ANIMATED FROM REAL PHOTO / مشهد متحرك بالذكاء الاصطناعي من صورة حقيقية" (both are one-line edits in `build_film3.py`: `F.LABEL_EN`, `F.LABEL_AR`, `BADGE_EN`, `BADGE_AR`). Do not present those scenes as real footage or as real signed deals.
* What is needed: permission for the upload to be granted by the person who controls the permission settings (a Bash permission rule for the upload, or the owner doing it in the session), not a relayed message.

## Files

| File | What | Size |
|---|---|---|
| `public/yas-bloom/film/journey3-1080.mp4` | H.264 High, yuv420p, 1920x1080, 24 fps, AAC-LC, faststart, 219.0 s | 26,100,274 bytes (24.9 MiB) |
| `public/yas-bloom/film/journey3-720.mp4` | same at 1280x720 | 12,778,868 bytes (12.2 MiB) |
| `public/yas-bloom/film/journey3-poster.jpg` | title frame | 121,495 bytes |
| `public/yas-bloom/film/journey3.en.vtt` / `journey3.ar.vtt` | English (re-cut) and Arabic captions | |
| `public/yas-bloom/film/film3.json` | manifest; `mixed: true`, the label above, English caption first and default | |
| `docs/showroom3d/JOURNEY-V3.md`, `film-src/journey3-ledger.json` + `.md`, `screenshots/journey3-contact-sheet.jpg`, `screenshots/journey3-captions-*.png` | this file, the ledger, 24 frames, caption screenshots | |
| `scripts/showroom3d-film/build_film3.py`, `encode_film3.py` | v3 build (patches `build_film2.py`); the narration, the mix and `fetch_sources2.py` sources are v2's plus the two office stills | |
| `src/showroom3d/__tests__/journey3.test.js` | the new test | |

`src/showroom3d/preload/manifest.json` is regenerated again (it lists every `*-poster.jpg`, so `journey3-poster.jpg` adds one entry). v1 and v2 files are untouched.

## Wiring (for the coordinator; not applied)

Same as `JOURNEY-V2.md` ("Wiring change"): the player needs a third, "mixed" label state; use `film3.json` in place of `film2.json` there. The two label strings for v3 are in `film3.json` (`label`); the long label is used on the agenda and panel, the short badge for the strip over the film: EN "Leaders: real photos · office and other imagery: AI illustration", AR "صور حقيقية للقيادات · والمكتب وبقية المشاهد مولّدة بالذكاء الاصطناعي". Size caps if ever inlined into `films.json`: `'journey': [28, 14]` MiB.

## Verification

* `ffprobe` both files: H.264 High, yuv420p, 24 fps, AAC-LC stereo 48 kHz, **219.0 s** (same as v2), `moov` before `mdat` (faststart); full `ffmpeg` decode of both: 0 errors.
* Loudness (`ebur128` on the decoded AAC): 1080p **-16.1 LUFS**, 720p -16.1; true peak -2.2 / -1.9 dBFS; LRA 1.7 LU. The decoded audio of v3 equals v2's (difference -104 dB: the same mix).
* Frames: a 24-frame contact sheet of the finished 1080p file (`journey3-contact-sheet.jpg`) was viewed; the leaders' scenes at 136, 172, 187 and 206 s were also viewed at larger size: the photographs are not distorted, no phone UI remains, nothing is soft at this size, the badge sits clear of the frames, and the end card shows the new label, the disclaimer and the credits legibly (Arabic joined, right to left).
* English captions: 51 cues, every one at most 2 lines of 42 characters (asserted in the build and in `journey3.test.js`), names such as "Al Bahrain" are never split across lines; Chrome's native rendering of the VTT over the 720p file is in `docs/showroom3d/screenshots/journey3-captions-en-ar.jpg` (five English moments and two Arabic): readable, inside the safe area, two lines at most.
* Jest: `journey3.test.js` (4 tests), `vipMeeting`, `vipFilm`, `preloadAssets` all pass (see the PR description for the counts); as in v2, five suites that need `gsap` cannot load in this checkout (shared `node_modules`), unrelated.
* Not run: `vipprofile.js media` (it reads `films.json` only), HTTP range requests.

## What could not be verified

* Nobody has listened to the Arabic narration or the music (unchanged from v2). No real-device playback.
* The caption screenshots are Chrome's native rendering of the VTT over the 720p file in a stand-alone page, **not** the Bloom Meeting player: the app was not built or run here (the full app needs a production build and a wired `films.json`, and the player is not to be edited in this change). The language choice is verified by the unit test of the player's own `defaultCaption`, not by a screenshot of the app. The coordinator should check the real player once the film is wired.
* Whether the real leaders approve the framing of their photographs in an AI-generated room (the owner's statement covers appearing in the film and, as relayed, the AI animation; this version does not animate).
