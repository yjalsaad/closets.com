# Assets the owner needs to supply (nothing was invented)

Placeholders are tonal (`.ph`: warm sunken surface with a brass hairline) so the layout is final and a real photo is a drop-in.

| Surface | Today | Needed |
|---|---|---|
| Home hero | an AI-generated render hotlinked from `d8j0ntlcm91z4.cloudfront.net` (CMS key `home.hero.image` overrides) | 1 daylight photograph of a completed room, 2400x1500 minimum, subject on the right third in LTR (it flips with the scrim in RTL); confirm usage rights |
| Collections (5 tiles) | Pexels / Unsplash hotlinks | 5 own photographs, 4:5 and 16:10 crops; or per-room images in `website_room_cards.image_url` |
| Showroom band (5 rooms) | Unsplash hotlinks (`TOUR_IMG`) | 5 own photographs (walk-in, kitchen, TV wall, wardrobe, door), 1600x1000 |
| Category heroes (/kitchen /wardrobes /tv /doors /office) | Pexels hotlinks (`HERO_IMG`) | 1 own hero each, 2000x1100 |
| Showrooms page and booking aside | tonal placeholder | showroom exterior/interior photographs; per-showroom address, hours, map link (see FACTS-TO-CONFIRM) |
| Projects / home "Recent work" | hidden until `website_projects` has rows | 6-10 completed projects with cover photo, area (not street), room type, year |
| Testimonials | hidden until real rows exist | permissioned quotes: name, area |
| About | origin / craft photos hotlinked; no portraits | founder / team portraits, workshop photographs |
| How it works | one step uses a screenshot of a PDF brochure with illegible text | a clean render or photograph |
| Materials | six CSS gradient swatches (real finish names) | photographed swatches of each finish |
| Logo | text wordmark (Fraunces, tracked caps; Arabic "ذا كلوزتس") | vector wordmark EN + AR lockup, mono and reversed; decide the one Arabic name (site uses both "الخزائن" and "ذا كلوزتس") |
| Open Graph | `public/og-image.jpg` (old palette) | new 1200x630 |
| Image hosting | three third-party hosts (cloudfront, unsplash, pexels) | move originals to the project's own origin (Vercel) in AVIF/WebP at 600/1000/1600 wide; the `Photo` component already takes `w`, `h`, `sizes`, `pos` |
| Fonts | self-hosted OFL (Fraunces, Inter, Noto Naskh Arabic, IBM Plex Sans Arabic) | owner sign-off on the Arabic pairing |
| Other shells | `/campaign`, `/ikhtarha/games`, `/pay*.html` still load Google Fonts | out of scope here; same self-hosting applies |
