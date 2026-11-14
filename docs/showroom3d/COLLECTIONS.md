# YAS Bloom: Collections

Source: the owner's site, `https://yas-holding-website.vercel.app/collection` (YAS Holding: YAS Wood + The Closets International).

## What the site page actually contains

The page is **one collection**, not several: **"Collection 2023–2025"** (Arabic: "مجموعة 2023–2025"), eyebrow "YAS Wood · Finishes",
with **36 finishes**. Each finish has a name, a reference code (one, "Charcoal", has none) and one swatch image. The same component
is also served at `/samples/collection2023-2025`. There are no detail pages, no modal, no per-finish description and no per-finish
category: the only material information is the page description ("wood, stone and solid melamine finishes"). The site has an Arabic
version (language switch, RTL); finish names and codes stay in Latin script in Arabic, so `name.ar === name.en` for finishes and
`arNeedsReview` is `false`.

Everything in `src/showroom3d/collections/data.js` is generated from the site's JS bundle. Nothing is written by hand.

## Images

The 36 swatch photos are hosted on **`www.yas-wood.com`** (`/static/media/<name>.<hash>.jpg`), not on the Vercel site. With the owner's
approval they were downloaded and converted to WebP in `public/yas-bloom/collections/collection-2023-2025/`: **72 files, about 370 KB
in total** (budget 4 MB). The originals are small (366 x 467 px), so each finish has a small copy (<= 320 px, low tier and the list)
and a thumb at the original size; **no finish has a separate hero**, because nothing larger exists on the site. `collection.images`
lists the 36 thumbs with bilingual alt text.

To refresh data and images (needs `curl`, ImageMagick and network access to both hosts):

```
node scripts/showroom3d-qa/fetch-collections.js              # data + images
node scripts/showroom3d-qa/fetch-collections.js --no-images  # data only, keeps the images on disk
```

Limits enforced by the script and by Jest: small <= 320 px / 20 KB, thumb <= 800 px / 60 KB, hero <= 1600 px / 180 KB, folder <= 4 MB,
every referenced file exists and is WebP, no unreferenced file in the folder.

## What is in the showroom

- **Feature wall** (`collections/wall.js`, placement in `collections/layout.js`): three backlit lightboxes in brushed-brass frames on
  a dark walnut board, a warm LED line above, a travertine plinth below. It hangs on the inside face of the **right front wing**
  (x = 14..22, z = -0.8), which was empty: outside every bay, clear of the lanes, planters, columns and Reception. The middle
  lightbox carries the collection name; the two side ones list the 36 finishes (swatch + caption once images exist).
  Type is dark ink on a lit cream face (16:1; secondary text 10:1); finish names are 6 cm tall, read from the 3.2 m stand point.
- **Collider / navigation**: one box across the wing (`collectionsColliders`), an interaction zone on the floor strip in front
  (`collectionsZones`), and a 10th quick-nav stop (`withCollections`) reached from the right-hand lane. The department graph and
  zone list themselves are unchanged.
- **Panel** (`collections/CollectionsPanel.jsx`, `collections.css`): E / Interact at the wall opens it. Collection name and
  description from the site, materials, finish gallery (buttons, arrow keys, Home / End, swipe, list), "Request a quote" and
  "See on yas-holding website" (new tab, `rel="noopener noreferrer"`). EN / AR, RTL, bottom sheet on phones.
- **Quote hand-off**: the existing `/booking` page with `interest=Other`, `source=showroom-3d-collections` and notes naming the
  collection and the finish. Only ids that exist in `data.js` can reach the link.
- **Departments menu**: a "Collections" / "المجموعات" entry that glides to the wall.
- **Advisers**: `collectionsReply()` answers "show me the collections" / "اعرض المجموعات" and walks the visitor there
  (hooked in `ui/StaffChat.jsx` in front of the offline guide).
- **Lazy loading**: swatch images are requested only when the wall is in view within 16 m, or the panel is opened.
- **Tiers**: low = 512 px canvases, small images, no over-bright faces (no bloom), no LED line. Reduced motion: the jump is instant
  (existing explorer behaviour) and nothing on the wall animates.

## Hooks in existing files

| File | Change |
|---|---|
| `src/showroom3d/3d/engine.js` | import `buildCollectionsWall`; build + add after the bays; `setLanguage`; `dispose` |
| `src/showroom3d/navigation/colliders.js` | import + `list.push(...collectionsColliders())` |
| `src/showroom3d/navigation/explorer.js` | import; `this.graph = withCollections(buildGraph())`, zones prefixed with `collectionsZones()`; one line in `interact()` |
| `src/showroom3d/ShowroomExperience.jsx` | import; `colOpen` state; two effects; `setUiOpen` includes it; render `<CollectionsPanel>` |
| `src/showroom3d/ui/Menus.jsx` | import; `COLLECTIONS_DEPT` appended to the list; number key hint only for the first nine |
| `src/showroom3d/ui/Hud.jsx` | import; zone name for the prompt |
| `src/showroom3d/ui/StaffChat.jsx` | import; `collectionsReply(...) || reply(...)` |
| `src/showroom3d/__tests__/explorer.test.jsx` | expected menu ids now end with `'collections'` |

| `src/showroom3d/staff/guide.js` | import `collectionsService`; one `out.push(...)` in `services()`; a `#go:collections` chip in the "take me to" list |

## Hub

`docs/showroom3d/collections.json` is the same data in a plain schema (`yas-bloom/collections@1`: `collections[] { id, brand,
category, name{en,ar}, eyebrow, description, materials[], sourceUrl, arNeedsReview, images[], items[] { id, name, code, alt,
sourceImage, image } }`). **The Hub studio has no "collections" section today**; managing these there would need a schema
addition in the Hub and a loader here that prefers the Hub data over `data.js`.

## Cost

See `docs/showroom3d/collections-stats.json` (measured by `scripts/showroom3d-qa/collections.js`). The wall is 12 meshes / 84
triangles (8 / 66 on low: no LED line, no light washes) and three canvas textures: about 14 MB of GPU memory on high / medium, 3.5 MB on low.
The swatches are drawn into those canvases, so they add no textures of their own.

## Known limit: phones held upright

The wall is 5.7 m wide and the stand point is 3.2 m from it (the Doors bay starts just behind). A portrait phone sees about 3 m of
wall at that distance, so it shows the title lightbox whole and the two finish lightboxes cut at the screen edges; fitting all three
would need about 6 m of stand-off, which is inside the Doors bay. The visitor can turn to read them, and the panel lists all 36.
