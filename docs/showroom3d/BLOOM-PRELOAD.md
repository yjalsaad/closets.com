# YAS Bloom: "download the whole showroom first"

Owner request (2026-11-15, the night before the VIP meeting on an iPad / venue Wi-Fi): *"try to download the full yas bloom, this will help to have it more fast and clean, not slow"*.

This page has four parts: what the showroom loads and where the slowness really comes from (measured), what was built, what it does and does not fix, and the cheap wins that need an owner / `vercel.json` decision. All numbers are from headless Chromium on **software GL (SwiftShader, CPU rendering)** with the network throttled through DevTools (venue profile: 8 Mbit/s down, 100 ms RTT). The CPU is far slower than an iPad's GPU, so the numbers say **where** the time goes, not how long it takes on the iPad.

Reproduce: `node scripts/showroom3d-qa/serve-prod.js <build> 5055` (a static server with brotli, ETags and the *real* production Cache-Control headers), then `BASE=http://localhost:5055 node scripts/showroom3d-qa/waterfall.js <label> --profile venue --revisit` and `node scripts/showroom3d-qa/waterfall-report.js <labels>`. Raw request lists: `docs/showroom3d/bloom-preload/*.json`.

## 1. What the showroom loads, and where the slowness really comes from

### Inventory (production `closets-website.vercel.app`, headers via `curl -I`; sizes from the measured run)

| What | Files | Size (wire) | When | Cache-Control as served |
|---|---|---|---|---|
| `index.html` for `/yas-bloom` | 1 | 20 KB br | first | `max-age=0, must-revalidate`. It is the **home page's prerendered HTML** (byte-identical to `/`) |
| **Home-page hero PNGs** referenced from that HTML (cloudfront) | 4 | **8.2 MB** | start of every `/yas-bloom` visit, before any JS | `max-age=31536000, immutable` (free on a repeat visit) |
| `main.js` / `main.css` | 2 | 436 KB / 5 KB | eager | `s-maxage=31536000, immutable`: **no `max-age`**, so a browser revalidates (304) every time |
| `showroom3d` chunk + css + 3 small chunks (`113`, `49` RGBELoader, `486` api) | 6 | 207 + 10 + 26 + 1 KB | lazy, after main.js runs (~2 s on the venue line) | as above |
| Google Fonts css + 5 woff2 (Alexandria, IBM Plex Sans Arabic) | 6 | ~150 KB | with main shell | `max-age=31536000` |
| Staff portraits (10 webp) | 10 | 476 KB | **eager** at scene build | `max-age=0, must-revalidate` |
| Realism: 30 textures + HDRI (`studio_warm_512.hdr` 297 KB br) | 31 | 1.35 MB + 0.3 MB | after the first frame (lazy) | same |
| YAS Wood gallery, loading backdrop, Ikhtarha hero + logo | 4+1+2 | 0.18 MB + 0.34 MB | gallery 1.5 s after first frame; Ikhtarha at build | same |
| Collections swatches (36 thumbs; 36 "small" on the low tier) | 36 | 271 KB | lazy: when the wall is within 16 m | same |
| Design-studio posters (3 frames x 2 sections x 2 languages) | 12 | 646 KB (6 per language) | lazy: within 18 m of the wall; the other language only after a switch | same |
| VIP deck photos | 23 | 1.0 MB | VIP room only, per deck | same |
| Film posters, `films.json`, `film.json`, captions | | ~0.27 MB | VIP room only | same |
| VIP film videos (not part of this work) | 8 files, 58 MB per device | | VIP room only, by `filmPreload.js` | |
| Runtime reads: Supabase `website_content`, `website_projects` (+ CORS preflight each) | 4 | tiny | VIP room only | unreachable from the sandbox |

Duplicates found: the logo JPG is requested 3 times at start (loading screen, engine texture, keyed-logo canvas: 2 full downloads); the loading-screen backdrop was fetched twice (CSS + gallery texture; now once, via the store). Fonts: `Inter`, `Fraunces`, `Noto Naskh Arabic` are named by the canvas text but no CSS in the build declares an `@font-face` for them (only the two Google families exist), so those canvases use the system fallback font.

### Where the time goes (venue line 8 Mbit / 100 ms, software GL)

1. **Time to the first frame is CPU, not network.** Shell + chunk are in at about 3 s; the first frame arrives at 21 to 22 s (12 to 13 s with the home PNGs removed). Between 3 and 21 s the main thread is blocked in 5 to 10 s lumps (texture canvases 3 s, scene build + shader compile 8 to 10 s, first render 2 s); the network is idle for most of it. On the iPad the GPU is far faster, but the procedural texture generation and scene build are JavaScript on the iPad CPU, so this part will not be fixed by downloading anything.
2. **The home page's 8.2 MB of PNGs is the biggest network cost** and is outside this work (`index.html` is the prerendered home page): at 8 Mbit it alone fills the line for the first 10 s, in parallel with the showroom chunk and (now) with the preload. It is free on a repeat visit (immutable) but not on the first visit on the venue Wi-Fi.
3. **Everything else is small**: 3.4 MB of showroom assets are fetched lazily during a full walk, in about 90 requests, each one a separate round trip at the moment the visitor arrives (the swatches and posters start loading when the wall comes into view; the glide takes 5 to 6 s, which hides it here).
4. **Every re-visit is 123 requests, 108 of them conditional (304)**, because production serves everything with `max-age=0, must-revalidate` (and `/static` with `s-maxage` only). That is one round trip per file, again at the venue.
5. **Stalls that are not network**: the realism upgrade (30 canvases tinted and uploaded in one go: 2.4 to 3.3 s long tasks under software GL), the HDRI PMREM, and first-use GPU uploads of posters and portraits. Shader programs are not a problem: 80 compiled at start, 83 to 85 after a full walk.

### Before / after (same machine, same build otherwise; `waterfall-report.js`)

| run | first frame (ready) | explore | requests (all) | managed-asset requests | managed bytes | managed files all in at | realism applied at | long tasks >= 1.5 s | main-thread blocked |
|---|---|---|---|---|---|---|---|---|---|
| base-venue / 1st visit | 21.5 s | 31.0 s | 123 | 91 | 3383 KB | 46.5 s | 31.0 s | 7 | 27.1 s |
| base-venue / 2nd visit | 11.2 s | 25.5 s | 123 | 91 | 0 KB | 40.5 s | 21.3 s | 5 | 25.0 s |
| final-venue / 1st visit | 22.2 s | 30.2 s | 154 | 122 | 4854 KB | 38.0 s | 35.5 s | 7 | 32.0 s |
| final-venue / 2nd visit | 11.2 s | 23.7 s | 32 | 0 | 0 KB | - | 27.2 s | 4 | 27.7 s |
| base-nohome | 12.0 s | 28.5 s | 138 | 91 | 3383 KB | 42.0 s | 25.6 s | 5 | 27.0 s |
| final-nohome | 13.1 s | 28.0 s | 169 | 122 | 4854 KB | 35.6 s | 33.2 s | 5 | 30.4 s |
| base-slow | 13.6 s | 26.5 s | 138 | 91 | 3383 KB | 47.7 s | 31.8 s | 6 | 28.2 s |
| final-slow | 15.4 s | 30.6 s | 169 | 122 | 4854 KB | 41.8 s | 36.4 s | 5 | 29.5 s |
| final-off | 11.7 s | 27.2 s | 138 | 91 | 3383 KB | 46.4 s | 31.5 s | 6 | 30.1 s |

(venue = 8 Mbit / 100 ms with the home PNGs; nohome = without them; slow = 3.2 Mbit / 150 ms without them; final-off = new build with `?bloomprefetch=0`.)

How to read it honestly: **first-frame and explore times did not improve** (they are CPU-bound, differences of 1 to 2 s are noise; the slow-line run was 1.8 s slower on the first frame, which may be a small cost of the extra fetch handling on the main thread or noise: not resolved). What did change:

- **Second visit: 123 requests become 32 and every managed asset is served from Cache Storage (0 requests, 0 bytes, 0 conditional round trips for them)**; the remaining 32 are the shell/chunks (`/static` revalidations) and the page itself.
- **Everything is downloaded by about 36 to 42 s instead of 42 to 48 s of the walk, without any walking**, and a wall the visitor walks up to later is served from memory (no request, image decoded ahead).
- The preload downloads 122 files / 4.8 MB (all of it) instead of the 91 files / 3.4 MB a walk happens to touch.
- `final-off` (`?bloomprefetch=0`) behaves like the old build (91 managed requests, 3.4 MB).
- "Realism applied at" is later with the staged upgrade because under 1 fps software GL each yield costs a whole frame; on a 60 fps device it is a few frames. Not representative, not verified on the iPad.

Raw data: `docs/showroom3d/bloom-preload/*.json`. Functional QA (`scripts/showroom3d-qa/bloomprefetch.js`): 23/23 checks (progress rises and ends at 100; one versioned cache with 122 files; film cache untouched; 2nd visit 0 managed requests; `?bloomprefetch=0`, Save-Data, 2g, quota failure, old-cache cleanup all fall back with no page errors). The existing `vipfilmpreload.js flow`: 18/18, so the film download is unchanged.


## What was built

**`src/showroom3d/preload/`** (everything lives in the lazy `showroom3d` chunk; the main bundle is unchanged).

- `manifest.json`: every static file the showroom shows (158 files, 5.1 MB: staff portraits, realism textures + HDRI, YAS Wood gallery, Ikhtarha stage images, collections swatches, design-studio posters in both languages, VIP deck photos, film posters) with size, content hash, priority group and the quality tiers that use it. Generated from `public/` by `scripts/showroom3d-preload/make-manifest.js`; a Jest test fails if it is stale. The VIP film videos are **not** in it (`vip/filmPreload.js` keeps them, with its own cache `yas-film-v1`).
- `assetStore.js`: the store. Priority order: **hall** (kiosk portraits, 30 realism textures, HDRI, gallery, Ikhtarha stage) → **rooms** (collections swatches of the tier, design-studio posters of the page language) → **VIP** (deck photos, film posters) → the other language's posters. Six downloads at a time at low priority, same-origin, `cache: 'no-cache'`. A file is kept only if the status is 200, it is not an HTML fallback and its size equals the manifest size.
- Cache Storage name `yas-bloom-assets-<manifest version>` (version = hash of every file's size + content hash). A changed, added or removed file makes a new cache; **older `yas-bloom-assets-*` caches are deleted**; other caches (the film cache) are never touched.
- **Loaders use the store.** Every place that used to fetch one of these files now asks the store first: memory (a Blob already held) → Cache Storage → network (stored on the way in). `loadImg()` replaces `new Image()` (and decodes ahead with `img.decode()` for managed files, so a texture upload does not pay the WebP decode); `assetSrc()` hands a TextureLoader / RGBELoader an object URL; `assetFetch()` is `fetch()` through the store. Sites changed: collections wall swatches, design-studio posters, kiosk portraits, YAS Wood gallery, realism textures (`createImageBitmap`) and HDRI, VIP deck photos and project cards, film posters, Ikhtarha stage images, the chat portrait probe. A loader that asks for a file the preload has not reached yet **promotes** it (same download, never two). When the store is off, every loader gets its plain URL synchronously: behaviour is exactly the old behaviour.
- **Mechanism choice.** The loaders all create `Image()` / `TextureLoader` / `fetch` themselves, so redirecting them is a one-line change each; HTTP-cache warming would not help because production serves these files with `Cache-Control: public, max-age=0, must-revalidate` (every use is a conditional request, one round trip each). A service worker was not used: a worker under `public/yas-bloom/` cannot control `/yas-bloom` without a `Service-Worker-Allowed` header, which needs `vercel.json` (not editable here).
- **When it starts.** At mount, in parallel with the CPU-bound scene build (the network is idle during that time: see the timeline above), not after the first frame. First-frame assets are only the bundled logo; everything else was already lazy, so the preload cannot delay entry.
- **Progress UI.** `ui/PreloadPill.jsx`: a small pill at the top centre ("Downloading the showroom… 42%" / "جارٍ تنزيل المعرض… 42%"), real bytes, never blocks entry, no pointer events, hidden when nothing was downloaded (a re-visit) and replaced by "Showroom downloaded" for 3.5 s when it finishes.
- **Smoother realism upgrade.** `upgradeTexturesStaged()` (registry.js) swaps the downloaded PBR sets into the scene a few per frame (8 ms budget) instead of one multi-second main-thread block right at the start of the intro (each tracked texture is a 1024 px canvas + tint loop + GPU upload). `renderer.compile` already warms the shaders of every room at start-up: 80 programs at the first frame, 83 to 85 after a walk through all rooms (the extra 3 to 5 are the VIP film / panel materials), so no shader warm-up was added.

### Policy (all unit-tested)

| Condition | Behaviour |
|---|---|
| `?bloomprefetch=0` (also `off`, `false`, `no`) | nothing: no fetch, no Cache Storage access, all loaders use plain URLs |
| Save-Data, 2g, slow-2g | same as off |
| 3g, or `deviceMemory <= 2` | core only (hall + rooms, current language), 2 downloads at a time, smaller memory budget |
| Cache Storage missing / refuses writes (private window, quota) | silent fall-back: files are held in memory for this visit, the showroom works |
| Leaving `/yas-bloom` | the running download is aborted (what finished stays cached); object URLs are revoked |
| Low tier | gets the "small" swatches and one poster frame per language, not the thumbs / three frames |

Memory: the store holds at most 16 MB of Blobs (8 MB on a 4 GB device, 4 MB on a 2 GB one); the whole set is 5 MB. It creates **no** extra textures: GPU memory is unchanged.

## Not verified (needs the real iPad)

Real Safari behaviour of Cache Storage and `img.decode()`, iOS memory pressure (the store adds about 5 MB of Blobs, no GPU memory), real venue network and its 8 Mbit/100 ms guess, real GPU upload / PMREM costs, and whether the staged realism upgrade is visible. Safari can evict Cache Storage after about 7 days without use of the site, under storage pressure, and on "Clear History and Website Data"; a Private tab keeps it only until the tab closes. The first visit is never faster than before; only later visits and the walk are.

## Cheap wins found (not applied)

1. **`vercel.json` cache headers** (not applied; add-only rule). Static files now revalidate on every visit:
```json
{ "headers": [
  { "source": "/static/(.*)", "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] },
  { "source": "/yas-bloom/(realism|staff|collections|design-studio|profile)/(.*)", "headers": [ { "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" } ] }
] }
```
(`serve-prod.js` with `HEADERS=proposed` serves exactly this. The store fetches with `cache: 'no-cache'`, so a replaced file is never taken from a stale HTTP entry.)
2. **A lean shell for `/yas-bloom` and `/ar/yas-bloom`**: the HTML is the home page's, which makes the browser fetch 8.2 MB of home PNGs. A rewrite of those two paths to a build-generated shell with an empty `#root` removes it (needs `vercel.json` + `scripts/prerender.js`). Measured effect of removing them (one run each, so indicative): first frame 21.5 s to 12.0 s on the venue line.
3. **Re-encode (additive files, one-line reference change)**: Ikhtarha `logo-light.png` 282 KB to about 37 KB WebP; `journey-poster.jpg` 140 KB to 86 KB; `parquet_a` 146 to 108 KB, `planks_a` 128 to 103 KB; the 221 KB `bonsai-hub-contact-sheet.jpg` is never loaded.
4. **GPU memory (computed from the sizes, not measured)**: the 10 kiosk portraits (768x1024, mipmapped) are about 42 MB and are loaded eagerly; one language of design-studio posters (6 x 1600x900) is about 46 MB. 1280x720 posters and 512 px portraits on the medium / low tier would cut roughly a third to a half.
5. The `RGBELoader` chunk is requested only after the first frame (one serial round trip before the HDRI); the logo is fetched 3 times.
6. **Films**: 8 files, about 58 MB per device, download only once someone enters the VIP room. Not touched; for tomorrow, open the VIP room once on the venue Wi-Fi and wait for the three "Ready" labels.

## Practical advice for the meeting

Open `/yas-bloom` on the venue Wi-Fi at least 15 minutes before, in a normal (not Private) Safari tab, let the pill reach "Showroom downloaded", then walk into the VIP room and wait until the film cards say Ready. Reload once to confirm the pill does not come back. Do not clear Safari website data afterwards. `?bloomprefetch=0` and `?vipprefetch=0` switch the two preloads off.

