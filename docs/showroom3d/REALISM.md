# Showroom realism pass (branch `claude/web-realism-3`)

Owner feedback: the models looked cheap; characters, building, colours and lighting needed to become truly realistic; VIP text was hard to read.
This pass is **add-only** (src/showroom3d, public/yas-bloom/realism, scripts/showroom3d-qa, docs). Honest headline: the showroom moved from a bright, white-marble, generic 3D look (about 4/10) to a dark walnut / microcement / warm-LED look that follows the owner's reference photos (about 6.5/10 in the hall, 5 to 6 in the rooms, characters 5.5/10). It is **not photoreal**, and fully photoreal people and products need licensed or custom assets (see the last section).

## What changed

| Area | Change | Where |
|---|---|---|
| Lighting | Real HDRI (Poly Haven `brown_photostudio_05`, graded warm + darker floor half, PMREM) drives every interior reflection / ambient term. Warm key 3600 K, cool fill 5600 K (hemisphere), exposure 0.78 ACES. Sun fades inside the hall (existing). Spot light pools + LED coves are emissive (HDR) so the high-tier bloom picks them up. | `3d/realism/*`, `3d/engine.js`, `3d/materials.js`, `3d/pbr.js` |
| Colour | Palette moved to the reference look: dark walnut, greige plaster, light-grey microcement floor, brass, deep charcoal ceiling plenum. New tokens only in `3d/palette.js`. | `3d/palette.js` |
| Materials | CC0 PBR sets (albedo + normal + ORM) replace the procedural textures where a real set exists (oak, walnut, limestone, stucco/plaster, microcement, linen, velvet, leather, planks, herringbone). Procedural generators stay as automatic fallback. Marble and brushed metal stay procedural (no CC0 polished marble / brushed brass in the reachable catalogue). | `3d/realism/registry.js` + shims in `textures.js`, `pbr.js` |
| Building | Suspended walnut slat ceiling (4.8 m reads as a showroom, the double-height volume stays above as a lit plenum), LED coves on all edges, recessed spots on a grid with floor light pools, two continuous warm LED guide lines along the aisle, dark walnut bay soffits (were white), back-wall framed pictures. | `scenes/main-hall/hall.js`, `scenes/products/stage.js` |
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
| Bloom / grade | none | none | yes (existing lazy chunk) |
| Slat density | 0.5 (twice the spacing, fewer instances) | 1 | 1 |
| Floor planar reflection | no | no | yes (existing) |
| Screens | 2x canvas unless anisotropy = 1 | 2x | 2x |

The realism assets download while the existing loader / intro is on screen (HDRI + 30 small WebP files, 1.8 MB); the four gallery pictures load 1.5 s after the first frame. Non-showroom pages are unaffected: everything is inside the lazy `showroom3d` chunk and `public/`.

## Characters: what is possible and what is not

* Procedural rig upgraded as listed above. Honest score about 5.5/10 (was about 4.5 to 6 depending on view). They are still stylised mannequins: no real hair strands, no subsurface skin, no cloth simulation.
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
