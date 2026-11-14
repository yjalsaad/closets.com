# Showroom realism pass (branch `claude/web-realism-3`, draft PR #16)

Owner feedback: the models looked cheap; characters, building, colours and lighting needed to become truly realistic; VIP text was hard to read. The owner then sent 16 reference photos as the target look (dark walnut slat ceilings with spots and LED coves, travertine / concrete walls, light-grey microcement floor with LED guide lines, walnut columns with a lit brand plate, bouclé sofas, green marble vanity, dark kitchens).

This pass is **add-only** (src/showroom3d, public/yas-bloom/realism, scripts/showroom3d-qa, docs). Honest headline: the hall moved from a bright white-marble generic look (4/10) to the reference's dark walnut / microcement / warm-LED language (6.5/10). The rooms improved less (5 -> 5.5 to 6) because their furniture was not remodelled. Characters are still stylised mannequins (4.5 -> 5). **Nothing here is photoreal.**

## Before / after (viewed, high tier, software GL)

Sheets: `screenshots/realism-1..4-*.jpg` (before left, after right) and `realism-5-face-closeup-after.jpg`. Scores are my own honest 1 to 10 against "a real premium showroom photo".

| View | Before | After | What moved it / what still holds it back |
|---|---|---|---|
| Hall from spawn | 4 | 6.5 | slat ceiling, coves, spots + pools, floor LED lines, columns, grey microcement. Central benches and the stage are still blocky. |
| Entrance (through the glass) | 5 | 6 | darker interior reads as depth; glass itself unchanged |
| Reception | 4 | 6 | same hall changes; the desk is still a plain box |
| Kitchens | 5 | 6 | real oak / limestone, dark soffit with warm spots; units are simple extrusions |
| Wardrobes | 5 | 6 | as above |
| Walk-in | 5 | 6 | as above; no green marble vanity / round mirror yet |
| Bedrooms | 5 | 5.5 | real plank floor; bed and props unchanged |
| Doors | 4.5 | 5.5 | darker, more contrast; door leaf unchanged |
| Living | 5 | 6 | grade + soffit; sofas are still boxes, no bouclé, no big rug |
| Custom Studio | 5 | 5.5 | screen text now readable from the stand point |
| Consultation Lounge | 5 | 6 | readable panel, framed YAS Wood picture beside it |
| VIP room | 5.5 | 5.5 | not edited here (VIP agent); only the shared walnut texture changed |
| Adviser, 2 m | 4.5 | 5 | rounder limbs, real face features, folds; still a mannequin |
| Adviser face, 1 m | 4 | 5 | eyes / brows / lips / hijab that no longer hides the mouth |
| Arabic signs | 6 | 7 | 2x canvases, heavier type |
| Mobile (low tier) hall | 4 | 5.5 | same look with baked ceiling bounce, no post effects |

Iterations on the weakest views: hall colour and ceiling 5 rounds (orange cast -> beige floor -> neutral grey; slats glossy -> matte; columns moved twice so they frame the aisle and never block a bay), characters 3 rounds (faces, sheen that turned black abayas brown, hijab drape hiding the mouth), low tier 2 rounds (black ceiling -> baked bounce).

## Reference photos vs render (how close, honestly)

The reference photos are not in the repo except the four owner-confirmed YAS Wood images (see below). Closeness = how much of the reference's look the 3D view reproduces.

| Reference | 3D view | Closeness | Matched | Missing |
|---|---|---|---|---|
| YAS Wood aisle with lit floor line and columns (`yw-showroom-axis`, `yw-columns-aisle`) | hall | 5.5/10 | slat ceiling + spots, LED floor lines, walnut columns with a lit plate, grey floor, greige walls | the white central ceiling strip, travertine vein direction, furniture vignettes along the aisle, soft global illumination |
| YAS Wood kitchen + dining (`yw-kitchen-dining`) | kitchens | 4/10 | walnut / stone palette, warm spots, pendants | dark marble island, fluted table, glass display niches with LED |
| YAS Wood walk-in (`yw-walkin-vanity`) | walk-in | 4/10 | walnut wardrobes, island with drawers | green marble vanity, round mirror, bronze glass fronts with vertical LED |
| Dark matt kitchens with brass and ribbed glass (unmarked) | kitchens | 3.5/10 | brass, stone | graphite fronts as default finish, ribbed-glass hood |
| Bouclé sofas, large rugs, sheer curtains (unmarked, one MANTK) | living, lounge | 3.5/10 | warm low-key light | bouclé sofas, organic rugs, curtains, trees in planters |
| Travertine wall with cove wash (unmarked) | bay feature walls | 4.5/10 | cove wash, fluted wall | real travertine slabs |

## Not done in this pass (so nobody assumes it is there)

* Screen-space AO: a GTAO pass exists behind `?ao=1` (high tier) but it visibly over-darkens the floor near the planar reflector, so it is **off by default**. The baked AO decals and contact-shadow decals from the earlier phases still do that job.
* Shadows stay PCF-soft (no PCSS / VSM); no window gobos / light shafts beyond the existing sun stripes; glass is unchanged (transmission on high was already there).
* Bevels: the default chamfer of every `bevelBox` went from 2 mm to 5 mm; hall boxes (benches, desk) are still sharp. Door architraves, mullions, wall panelling and new props were not added.
* No anti-repetition (macro variation) shader; tiling scale was kept from the procedural sets.
* Room furniture was not remodelled to the reference (see the table above).
* KTX2 / basis: no encoder available; WebP is shipped.

## What changed

| Area | Change | Where |
|---|---|---|
| Lighting | Real HDRI (Poly Haven `brown_photostudio_05`, graded warm + darker floor half, PMREM) drives every interior reflection / ambient term. Warm key 4300 K (3600 K turned the grey floor beige), cool fill 5600 K (hemisphere), exposure 0.78 ACES. Sun fades inside the hall (existing). Spot light pools + LED coves are emissive (HDR) so the high-tier bloom picks them up. | `3d/realism/*`, `3d/engine.js`, `3d/materials.js`, `3d/pbr.js` |
| Colour | Palette moved to the reference look: dark walnut, greige plaster, light-grey microcement floor, brass, deep charcoal ceiling plenum. New tokens only in `3d/palette.js`. | `3d/palette.js` |
| Materials | CC0 PBR sets (albedo + normal + ORM) replace the procedural textures where a real set exists (oak, walnut, limestone, stucco/plaster, microcement, linen, velvet, leather, planks, herringbone). Procedural generators stay as automatic fallback. Marble and brushed metal stay procedural (no CC0 polished marble / brushed brass in the reachable catalogue). | `3d/realism/registry.js` + shims in `textures.js`, `pbr.js` |
| Building | Suspended walnut slat ceiling at 6.1 m (reads as a showroom, the double-height volume stays above as a lit plenum), LED coves on all edges, recessed spots on a grid with floor light pools, two continuous warm LED guide lines along the aisle, dark walnut bay soffits (were white), six walnut columns with a lit THE CLOSETS plate framing the aisle (with colliders), skirting + shadow gap on the back wall and wings, back-wall framed pictures. | `scenes/main-hall/hall.js`, `scenes/products/stage.js` |
| Characters | 24-segment heads, iris/sclera/pupil/specular eyes, lids + lashes, arched brows, nose, lips, blush, ear detail, hair sheen band, cloth folds on abaya / coat skirts, linen normal map + sheen (soft-light skin), eye saccades, GLB adapter (below). | `characters/*` |
| Readability | Bay signs drawn at 2x (2048x512), mipmapped, anisotropy 16, larger and heavier type (contrast sand on charcoal 12:1). Studio and lounge screens drawn at 2x with 32 to 76 px type (was 22 to 30 px), no 400-weight text, sand instead of taupe for body copy. VIP wall / screens untouched (VIP agent). | `scenes/main-hall/signs.js`, `scenes/products/screens.js` |
| YAS Wood gallery | Four owner-confirmed images (below) as the loader backdrop and as four framed pictures on the hall back wall (lazy, after the intro). | `3d/realism/gallery.js` |

## Assets (all shipped under `public/yas-bloom/realism/`, 1.96 MB total, budget 6 MB)

| File(s) | Source | Licence |
|---|---|---|
| `studio_warm_512.hdr` (398 KB, 512x256 RLE, graded) | Poly Haven `brown_photostudio_05`, Sergej Majboroda, https://polyhaven.com/a/brown_photostudio_05 | CC0 |
| `tex/oak_*` | Poly Haven `oak_veneer_01`, Jenelle van Heerden (rotated 90 degrees so the grain runs along U) | CC0 |
| `tex/walnut_*` | Poly Haven `european_walnut_veneer_04`, Jenelle van Heerden | CC0 |
| `tex/limestone_*` | Poly Haven `marble_01`, Rob Tuytel | CC0 |
| `tex/stucco_*` | Poly Haven `white_stucco_02`, Dimitrios Savva | CC0 |
| `tex/greyplaster_*` (microcement floor, concrete wall) | Poly Haven `grey_plaster`, Rob Tuytel | CC0 |
| `tex/linen_*`, `tex/velvet_*` | Poly Haven `rough_linen`, `velour_velvet`, colormass and Rico Cilliers (desaturated, tinted at runtime) | CC0 |
| `tex/leather_*` | Poly Haven `fabric_leather_01`, Rob Tuytel (desaturated) | CC0 |
| `tex/planks_*`, `tex/parquet_*` | Poly Haven `laminate_floor_02` (Dario Barresi, Charlotte Baglioni), `herringbone_parquet` (Jenelle van Heerden, Sergej Majboroda) | CC0 |
| `gallery/yw-*.webp` (4 files, 35 to 61 KB) | **Owner images** (YAS Wood concept renders, owner-confirmed) | Owner's own |

Each texture set is 3 WebP files: albedo (1024, or 512 for fabrics), normal (1024 or 512), ORM (512; R = AO, G = roughness). Total textures 1.34 MB. KTX2/basis was not used (no encoder in the toolchain); WebP decodes in every supported browser and the GPU copy is what the tier table below controls.
ambientCG: the API answered but its download host (`acg-download.struffelproductions.com`) is blocked by the sandbox proxy (HTTP 403), so **no ambientCG asset is shipped**. `dl.polyhaven.org` was reachable for textures and HDRIs (the root URL answers 521 but file URLs work).

### Owner-confirmed YAS Wood images

Only images that clearly show the YAS WOOD sign were shipped. The other 12 references (one with a MANTK watermark, the rest unmarked) are art direction only and are **not** in the repo.

| Shipped file | Source upload | Shows |
|---|---|---|
| `yw-walkin-vanity.webp` | `00f84752-image.jpg` | walk-in dressing room, small YAS WOOD plate by the door |
| `yw-kitchen-dining.webp` | `9b55c6d2-image.jpg` | kitchen island + dining table, YAS WOOD plate on the stone wall |
| `yw-showroom-axis.webp` | `e4e5154d-image.jpg` | aisle with lit floor line, large lit YAS WOOD sign and column plates |
| `yw-columns-aisle.webp` | `8384074a-image.jpg` | aisle with walnut columns carrying YAS WOOD plates |

EN / AR alt text lives in `src/showroom3d/3d/realism/gallery.js` (`GALLERY`). The VIP decks agent was sent this file list.

## Tier behaviour

| | low (phones, software GL) | medium | high |
|---|---|---|---|
| Texture edge | 256 | 512 | 1024 (normals / ORM max 512) |
| Anisotropy | 1 | 4 | 8 (signs 16) |
| Interior HDRI | yes (PMREM, 400 KB, loaded during the intro) | yes | yes |
| Shadows | PCF | PCF soft | PCF soft |
| Ceiling | slats with a baked warm bounce (no hall point lights) | lit by 3 point lights | lit by 6 point lights |
| AO | baked decals | baked decals | baked decals (GTAO only with `?ao=1`, not production ready) |
| Bloom / grade | none | none | yes (existing lazy chunk) |
| Slat density | 0.5 (twice the spacing, fewer instances) | 1 | 1 |
| Floor planar reflection | no | no | yes (existing) |
| Screens | 2x canvas unless anisotropy = 1 | 2x | 2x |

The realism assets download while the existing loader / intro is on screen (HDRI + 30 small WebP files, 1.8 MB); the four gallery pictures load 1.5 s after the first frame. Non-showroom pages are unaffected: everything is inside the lazy `showroom3d` chunk and `public/`.

## Performance (measured, `docs/showroom3d/realism-stats.json`)

Playwright + SwiftShader (CPU rendering, so fps is meaningless here), 1100 x 620, counts summed over all passes of one frame.

| Tier | Spot | Draw calls before -> after | Triangles before -> after | Textures in GPU memory |
|---|---|---|---|---|
| high | hall | 410 -> 445 | 187k -> 206k | 115 -> 124 |
| high | kitchen | 516 -> 523 | 257k -> 333k | 123 -> 132 |
| high | wardrobe (worst case) | 866 -> 872 | 477k -> 598k | 124 -> 133 |
| high | living | 609 -> 609 | 229k -> 292k | 132 -> 141 |
| medium | hall / kitchen / walk-in / living | 368 / 390 / 432 / 419 | 180k / 269k / 284k / 238k | 110 to 126 |
| low | hall / kitchen / walk-in / living / VIP | 339 / 337 / 375 / 368 / 212 | 128k / 145k / 159k / 130k / 92k | 89 to 104 |

Low tier stays inside the existing guardrail (under 450 draw calls and 200k triangles at every measured spot). The triangle growth on high / medium is the smoother characters (24-segment spheres) plus slats, columns and frames. Draw calls grew by about 35 in the hall (slats, coves, spots, pools, columns, frames: all instanced or merged). JS: `showroom3d` chunk 139.4 -> 145.0 kB gzip, `main` +70 bytes (the CSS variable and nothing else). Shipped assets: 1.96 MB (HDRI 0.40, textures 1.38, gallery 0.18).

## Adviser names (owner decision)

Each adviser now has a common Arabic first name with her role as subtitle: Noor (Reception), Maryam (Kitchens), Layla (Wardrobes), Dana (Walk-in), Reem (Bedrooms), Hessa (Doors), Sara (Living), Aisha (Studio), Fatima (Lounge), Zainab (VIP). Display form "Noor, Reception advisor" / "نور، مستشارة الاستقبال". The Talk button still reads "Talk to Noor, Reception advisor (AI)", the chat keeps its "AI assistant" badge and disclosure line, the opening line says "I am Noor, the Reception advisor, an AI assistant", and the greeting bubble says "(AI assistant)". Names live in `staff/roster.js` (`FIRST_NAMES`).

## Characters: what is possible and what is not

* Procedural rig upgraded as listed above. Honest score 5/10 (was 4.5). They are still stylised mannequins: no real hair strands, no subsurface skin, no cloth simulation.
* **No legally usable rigged humanoid GLB was available** on the permitted hosts: Poly Haven has no characters, ambientCG is blocked, the only reachable sample (Khronos `CesiumMan`) is CC-BY and a different style. So none is shipped.
* A drop-in layer exists: `characters/glbCharacter.js` (GLTFLoader + SkeletonUtils.clone, optional Draco and meshopt, bone-name retargeting for Mixamo / Ready Player Me / Reallusion / MetaHuman naming, same interface as the procedural rig) and `characters/glbConfig.js` (empty). Add one line per adviser, the staff logic (roster, anim state machine, chat) is untouched, and any failure falls back to the procedural character. It is unit-tested with a synthetic skeleton only; it has **not** been tried on a real licensed asset, so expect a calibration pass (joint sign conventions, rest pose).
* Headscarf option: the roster (`staff/roster.js`) is unchanged: it already gives six advisers a light headscarf and four none, role-based and modest. It stays an owner-reviewable preset in that one file.

## What the owner must supply or buy for the next level

1. **Characters**: 10 rigged, game-ready humanoid GLB files (Ready Player Me, Reallusion Character Creator, MetaHuman exported to glTF, or a freelance artist), Mixamo-style humanoid skeleton, modest professional outfits, PBR textures 1K to 2K, <= 4 MB each (<= 40 MB total, meshopt or Draco compressed), with a commercial web licence that allows redistribution. Facial blendshapes (blink, visemes) are a bonus.
2. **Products**: SketchUp / CAD / glTF of the real catalogue pieces (kitchens, wardrobes, doors) or at least 6 to 10 photos per product from straight on and 45 degrees, with finish samples photographed flat in daylight (for true albedo).
3. **Real HDRIs of the showroom** (360 capture at eye height, 4K, exposure bracketed) so reflections and ambient light match the real building.
4. **Fixtures**: model files or photos of the real sofas, pendants, rugs and planters if they should match the reference photos exactly.
5. A decision on brand wording for the hall back wall (the YAS WOOD signage appears only in the owner's own pictures, the 3D signage keeps THE CLOSETS).

## Still not photoreal, and why

* Everything is real-time geometry lit by a handful of lights; there is no global illumination or baked light (a lightmap bake would be the next big step and needs the final layout).
* Marble, brushed metal, glass and most upholstery are procedural or tinted; product silhouettes are simple extrusions with small bevels.
* Plants and props are procedural.
* Characters, see above.

---

# Round 2 (same branch / PR #16)

Owner decisions folded in: advisers become kiosks, signage reads "THE CLOSETS by YAS WOOD", every visit starts in first person. Sheets `screenshots/realism-1..4-*.jpg` were re-shot (the BEFORE column is still the state before round 1) and `realism-6-tiers-desktop.jpg` shows medium (top) and low (bottom) on desktop.

## What changed in round 2

| Area | Change |
|---|---|
| Adviser kiosks | `staff/kiosk.js`: a 1.75 m bronze / walnut totem per adviser with a 3:4 portrait screen at eye level, LED frame, name plate (first name, role, orange "AI assistant" label, EN / AR), slow breathing zoom + light sweep when idle, a waveform while she answers, and a greeting line that fades in when the visitor comes near. Nobody walks any more. All staff logic is unchanged (Talk button, T / E, greeting once, chat, take-me-to, VIP hook, colliders, far LOD = 3 draw calls). `staff/config.js`: `STAFF_MODE = 'kiosk'` (default) or `'character'`; `?staff=character` previews the 3D characters, which stay in the repo with the GLB adapter. |
| Portraits | Loaded from `/yas-bloom/staff/<adviserId>.webp` (3:4, about 768 x 1024, <= 120 KB). **No portrait file exists yet**, so every kiosk currently shows the non-human fallback (monogram on a soft gradient with a waveform); a missing or broken file can never show a broken image. The chat header shows the portrait thumbnail and the note "AI-generated portrait" only once a portrait has really loaded; otherwise the monogram and no note. |
| Signage | Column plates: "THE CLOSETS / by YAS WOOD" (Arabic "الخزائن / من ياس وود"). Hall back wall and facade: the real logo image is untouched, with "by YAS WOOD" as a separate clean line under it. Loader and intro card: the same byline under the logo. **The Arabic wording "الخزائن من ياس وود" is a draft: owner to confirm.** |
| Rooms | Kitchens: graphite matt default (finish order changed, ids unchanged), opal globe pendants on brass caps, a lit open shelf with props on the splashback. Walk-in: floating deep-green marble vanity with upstand under a round mirror in a brass ring, vertical LED edge strips on the glass cabinets. Living / lounge: soft rounded sofas and armchairs (no chamfered boxes), bouclé relief, organic looped-wool rugs (oat / rust), sheer floor-to-ceiling curtains, specimen trees in dark planters, mirror-steel and brass drum side tables. Bedroom / studio / lounge / walk-in back walls are travertine slabs. Defaults moved to walnut for door, bedroom, studio and lounge. |
| Geometry polish | Reception desk and hall benches are soft-edged; hall upper walls are travertine courses with shadow-gap reveals. |
| Materials | Velvet (walk-in upholstery), leather (studio chairs) and stucco (product plaster) sets are now wired. Procedural additions (ambientCG is still blocked): green marble, terrazzo (available as `M.terrazzo`, not yet assigned to a finish), bouclé. Brass / bronze take twice the environment reflection so they read as metal. Anti-repetition: a two-octave world-space noise modulates the albedo of floors, travertine and plaster on medium / high. |
| AO and shadows | GTAO bug fixed: its normal pass was drawing additive glows, decals, glass and the planar floor reflector, which blackened the floor. With the fix it is correct but subtle and still about doubles the draw calls, so it **stays opt-in (`?ao=1`)**; the baked AO / contact-shadow decals remain the default. Sun shadow map on high is now 4096 (about 2.5 cm texels in the hall). |
| Lazy loading | The scene is built on the procedural sets exactly as before the realism pass (same loader time); the CC0 textures and the HDRI download after the first frame and replace the procedural ones in place (same texture objects, so finish swaps keep working). Failure of any file keeps the procedural look. |
| First person | Every visit starts in first person (a stored third-person choice is no longer restored); the toggle and the visitor avatar are unchanged. |

## GLB character test recipe (characters are parked, the loader path is kept)

1. Put a rigged humanoid at `public/yas-bloom/realism/characters/reception.glb` (Mixamo / Ready Player Me style bone names; a quick free check file is any Mixamo "Y Bot" exported to GLB, for local testing only, not for shipping).
2. In `src/showroom3d/characters/glbConfig.js` add `reception: { url: '/yas-bloom/realism/characters/reception.glb', height: 1.68 }`.
3. `npm start`, open `/yas-bloom?debug=1&staff=character`, skip the intro, walk to Reception.
4. In the console: `__showroom.engine.staff.item('reception').char.glb` must be `true` and `.missingBones` should be `[]`. Check: she stands on the floor at about 1.68 m, faces the entrance, arms hang (not T-pose), the right arm rises on `__showroom.engine.staff.wave('reception')`, the head nods while the chat answers. If a limb bends the wrong way, flip the sign for that role in `wrapRigged().setPose` (the only place that maps pose angles to bones).
5. A missing file, a non-humanoid file or a decode error must leave the procedural character in place with no console error. Unit tests: `src/showroom3d/__tests__/realism.test.js` (bone mapping, interface, null on missing bones).

## Round 2 scores (viewed; before = before round 1, r1 = after round 1)

| View | Before | r1 | r2 | Notes |
|---|---|---|---|---|
| Hall | 4 | 6.5 | 7 | travertine courses, soft benches, kiosks instead of mannequins |
| Reception | 4 | 6 | 6.5 | rounded desk, kiosk behind it |
| Kitchens | 5 | 6 | 6.5 | graphite fronts, globe pendants, lit shelf; fronts are still flat slabs |
| Wardrobes | 5 | 6 | 6 | unchanged apart from materials |
| Walk-in | 5 | 6 | 6.5 | green marble vanity + round mirror, LED edges |
| Bedrooms | 5 | 5.5 | 6 | walnut default, travertine wall, curtain, organic rug |
| Doors | 4.5 | 5.5 | 5.5 | walnut default only |
| Living | 5 | 6 | 6.5 | rounded sofas, curtains, tree, side tables |
| Studio | 5 | 5.5 | 5.5 | travertine wall, leather chairs |
| Lounge | 5 | 6 | 6.5 | rounded sofa, rust rug, curtain, tree |
| VIP | 5.5 | 5.5 | 5.5 | not edited here |
| Advisers | 4.5 | 5 | 6 (as kiosks, monogram fallback) | a designed object reads better than a mannequin; real portraits will lift it further |
| Mobile / low tier | 4 | 5.5 | 5.5 | same look, no post effects |

Reference closeness after round 2: hall aisle 6/10, kitchens 5, walk-in 5, living / lounge 5, travertine walls 5.5. Still missing against the references: fluted island fronts and a dark marble island block, bronze-framed glass doors on every wardrobe run, fabric that really reads as boucle up close, global illumination.

## Round 2 performance (1100 x 620, software GL, all passes of one frame)

| Tier | hall | kitchen | walk-in | living | VIP | worst measured |
|---|---|---|---|---|---|---|
| high: draw calls / triangles | 465 / 186k | 474 / 243k | 572 / 268k | 588 / 263k | 273 / 138k | wardrobe 808 / 460k |
| medium | 379 / 173k | 350 / 194k | 397 / 207k | 401 / 211k | 243 / 133k | |
| low | 350 / 116k | 297 / 138k | 339 / 150k | 348 / 125k | 214 / 91k | |

Low stays inside the guardrail (under 450 draw calls and 200k triangles). Triangles are LOWER than after round 1 on every tier because ten kiosks replaced ten characters. Textures in GPU memory on high rose to 141 to 183 (kiosk canvases, new material sets). `showroom3d` chunk: 145.0 -> 152.1 kB gzip; `main` +5 bytes. No new shipped assets in round 2 (still 1.96 MB).

## Round 2: not done / open

* Portrait files do not exist yet: kiosks show the monogram fallback.
* The Arabic brand line needs the owner's confirmation.
* Door architraves, extra glazing mullions and wall panelling beyond the travertine reveals were not added; skirting exists on the hall back wall, wings and columns only.
* Terrazzo is built but not assigned to a kitchen finish (the finish list is capped at four per product by an existing test and the names describe white / dark / sand stone).
* GTAO stays opt-in; soft-shadow change is the 4k sun map only (no PCSS).
* Curtains have no collider (a visitor can walk through the sheer fabric at the bay edge).
* The older phase QA scripts (`phase6.js` and friends) assume walking characters for a few checks and were not re-run; the Jest suite and `realism.js` were.
