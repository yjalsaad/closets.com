# Arabic copy review (owner / native reviewer)

Status: 2026-11-12. Nothing below was rewritten by engineering unless stated; brand facts and copy are untouched. This file lists what needs a
native-speaker or owner decision.

## 1. New Arabic strings authored in this change (please review tone)

| Where | English | Arabic as shipped |
|---|---|---|
| Route meta (all pages, `src/seo/routes.js`) | new: Blog, Careers, Warranty, Maintenance, 404 | مجلة التصميم / وظائف / خدمة الضمان / طلب صيانة / الصفحة غير موجودة (descriptions in the file) |
| Footer button (was raw key `meetTeam`) | Meet our team | تعرّف على فريقنا |
| Mobile dock | Services | خدماتنا |
| Cart drawer | Browse Collection / Close cart | تصفّح المجموعة / إغلاق السلة |
| Kitchen layout "best for" lines | Compact kitchens & open-plan walls ... | للمطابخ الصغيرة والجدران المفتوحة / للغرف الضيقة وهواة الطبخ / الخيار المتعدد الاستخدامات — الأكثر طلباً / أقصى مساحة تخزين وسطح عمل / للضيافة والمساحات المفتوحة |
| Lead times | 5-6 weeks ... | 5-6 أسابيع (Latin digits) |
| Service price labels | From BD / Free quote | ابتداءً من ... / عرض سعر مجاني |
| 404 page | Page not found + helper copy | الصفحة غير موجودة + نص مساعد (`src/seo/NotFound.jsx`) |

## 2. Copy that reads machine-literal or inconsistent (not changed)

- Brand name: titles use the transliteration "ذا كلوزتس"; the Arabic wordmark in the design options is "الخزائن". Pick ONE Arabic brand name.
- "الدينار البحريني" (long form) vs "BD" vs "د.ب": the site now formats prices as `1,234.500 د.ب` (see src/i18n/format.js); confirm the abbreviation.
- Search-term check: "غرف ملابس" for walk-in closets and "وحدات تلفاز" for TV units are acceptable but "غرفة ملابس / دريسنج روم" and "طاولة تلفزيون / وحدة تلفزيون" may match what Bahrainis actually search. Verify with Search Console after launch.
- "مختبر الذكاء الاصطناعي + التصميم" nav pill is long; the desktop Arabic nav overflows (see screenshot evidence in the audit).
- Headlines end with an ASCII full stop (e.g. home hero "مصنوعة لتناسب حياتك."). It renders correctly at the visual left (end of an RTL line); the audit's ".لحياتك" report could not be reproduced. Decide whether Arabic headlines should carry a full stop at all (editorial style says no).
- The CMS (`website_*` tables) can still serve English-only copy to Arabic; only the Hub editor can fix those rows.

## 3. English strings still rendered inside Arabic pages (prerendered `/ar/*`, 2026-11-12)

Excluded as intentional: THE CLOSETS wordmark, EN toggle, "365Neo Digital Services", the hidden "Learn React" test marker, Instagram.
Concentrated in data tables on /kitchen, /wardrobes, /tv, /office (materials, features, warranty chips). These come from constants in
`src/App.js` that have no `{en, ar}` pair yet (they need authored Arabic, not machine translation). Per first-seen page:

### /kitchen (22)

- Laminate
- High-pressure laminate over moisture-resistant board. The most affordable surface with hundreds of décors.
- Heat Low
- Scratch Medium
- 2 years warranty
- 2–3 weeks
- Solid wood / butcher block
- Staved solid oak or beech block. Adds warmth; can be sanded and re-oiled over its lifetime.
- Heat Medium
- 5 years warranty
- 3–4 weeks
- Granite
- Quarried natural stone slab, each piece unique. Extremely hard-wearing and heat resistant.
- Heat High
- Scratch High
- 10 years warranty
- Quartz (engineered stone)
- Engineered quartz — non-porous, stain & scratch resistant, consistent colour. Our most popular worktop.
- Scratch Very high
- 15 years warranty
- Solid surface (acrylic)
- Acrylic composite cast to shape — invisible joints, integrated sinks, repairable surface.

### /wardrobes (68)

- Walk-in closet
- A private dressing room of your own
- Open-plan hanging, drawer banks, an island and full-height storage — the flagship. Organised to the centimetre, lit like a boutique.
- Island optional
- Boutique LED
- Open-plan
- Sliding-door wardrobe
- Space-saving, seamless fronts
- Floor-to-ceiling sliding doors in glass, mirror or panelled finish. No swing clearance — ideal where space is tight.
- Soft-close runners
- Mirror option
- Zero swing
- Hinged / fitted wardrobe
- Classic doors, fully fitted
- Made-to-measure hinged doors fitted wall-to-wall and floor-to-ceiling — every centimetre used, scribed to your walls.
- Blum hinges
- Wall-to-wall
- Made to measure
- Fitted / reach-in
- Built-in storage that disappears
- A reach-in run built into the architecture — handleless fronts that read as a wall, with a fully fitted interior behind.
- Handleless
- Flush-fit
- Bespoke interior
- Hanging rails
- Long & double-hang
- Soft-close drawers
- Blum full-extension
- Adjustable shelves
- Stackable open store
- Shoe racks
- Angled pull-out tiers
- LED lighting
- Warm 3000K, sensor
- Soft-close upgrade
- Every door & drawer
- Integrated mirror
- Full-height / pull-out
- Dressing island
- Drawers + display top
- Trouser / tie rack
- Pull-out organiser
- Valet rod & jewellery
- Felt-lined trays
- Melamine
- Durable, exceptional value
- A tough decorative laminate fused to a moisture-resistant board. Hundreds of décors, wipe-clean and our most popular everyday finish.
- 18mm MDF / HMR core
- Durability High
- High-gloss acrylic
- Reflective, premium
- A mirror-flat acrylic face with depth and shine that brightens a room. Anti-fingerprint options available.
- 18mm MDF core
- 3 weeks
- Real-wood veneer
- Natural grain, luxe
- Sliced natural timber over a stable substrate, lacquered for protection. Each panel grain-matched — the warmest, most luxurious option.
- 18mm ply / MDF core
- Matt lacquer
- Smooth painted, any RAL
- A hand-sprayed painted finish in any RAL colour, with a soft contemporary matt surface. Seamless, handleless-ready.
- Durability Medium-high
- 8 years warranty
- 4 weeks
- Glass / mirror front
- Display & dressing
- Toughened glass or mirror fronts — perfect for sliding doors and display sections. Bright, light-reflecting and easy to keep clean.
- Aluminium-framed

### /tv (43)

- Floating
- Floating base + wall panel
- floating base
- TV wall panel
- optional LED
- hidden cable mgmt
- Full Wall
- Tall cabinets + display
- TV centre
- tall cabinets
- display shelves
- closed storage
- decorative panels
- Display Shelves
- Open shelves + niches
- open shelves
- display niches
- LED
- Fireplace
- Electric fire + cladding
- TV section
- electric fireplace
- stone / wood cladding
- storage
- Minimal
- Panel + floating shelf
- wall panel
- floating shelf
- hidden wiring
- Storage Wall
- Bookcases + cabinets
- bookcases
- cabinets
- display areas
- Decorative items
- Books
- Consoles / boxes
- Router
- Receiver
- Hidden storage
- Acrylic
- Veneer
- Lacquer paint

### /doors (23)

- Single Swing
- One hinged leaf
- The everyday interior door — one leaf on side hinges.
- Double Swing
- Two hinged leaves
- Grand entrances & majlis — two meeting leaves.
- Sliding
- Slides on a track
- Space-saving — the leaf glides along a wall track.
- Pivot
- Centre / offset pivot
- Architectural statement — turns on a floor pivot.
- Hidden
- Flush concealed frame
- Invisible door — flush with the wall, no visible frame.
- Folding
- Bi-fold panels
- Folds back in panels for a wide clear opening.
- Oak
- Walnut
- Ash
- Teak
- Ebony

### /office (41)

- Wall Storage Office
- Full storage wall + desk
- storage wall
- desk run
- open + closed units
- Corner Home Office
- Two-wall corner desk
- corner desk
- overhead shelves
- base cabinets
- cable mgmt
- Built-in Office with Shelves
- Joinery + display shelving
- built-in desk
- decor panels
- Storage Wall with Desk
- Floor-to-ceiling + worktop
- tall storage
- integrated desk
- file storage
- Minimal Home Office
- Floating desk + shelf
- floating desk
- L-Shaped Home Office
- L-return desk + storage
- L-shape desk
- return worktop
- drawers
- tall unit
- Open shelves
- Closed cabinets
- Drawers
- Tall units
- File storage
- Durable HPL
- Wood veneer
- Real wood
- Solid surface
- Seamless
- Quartz
- Engineered stone

### /projects (6)

- Years of craft
- Projects delivered
- In-house
- Own workshop
- Bahrain
- Design · make · install

### /ai-lab/yas (6)

- AI YAS
- Kitchen
- Wardrobe
- TV unit
- Doors
- Office

### /how-it-works (36)

- Free to use
- No obligation
- 10-year warranty
- Choose what you are building — a kitchen, wardrobe, TV unit, door or home office — then select the layout that matches your room, from galley and L-shape to wal
- Enter your wall dimensions and mark openings like windows, doors and sockets. Approximate measurements are fine to start — our team confirms everything on a fre
- Pick your finish family, worktops, door fronts, handles and interior accessories. Every choice updates your design live, so you always see what you are getting.
- Your indicative price in BHD updates as you design. Happy with it? Save your design and request a formal quote — manufactured and installed in Bahrain.
- Clickable hotspots
- Tap any surface in a real room — cabinets, worktop, doors, handles — and swap its material in a click.
- Finish per surface
- Mix and match finish families across every surface until the whole space feels right.
- Live photo ⇄ 3D
- Switch between a real photo and an interactive 3D view to judge proportions and depth.
- Render photoreal
- Generate a photoreal AI image of your exact choices to share or save before you commit.
- Handleless, shaker or traditional — built around how you cook.
- Walk-in, sliding or hinged storage tailored to your room.
- TV & media
- Floating, full-wall or fireplace media walls with hidden storage.
- Swing, sliding, pivot or hidden doors in bespoke finishes.
- Home Office
- Built-in desks and storage that fit the room and the way you work.
- Measure twice
- Note wall lengths, ceiling height and any sockets or windows before you start — it makes every step faster.
- Start with the layout
- Get the shape right first. The right layout solves most design problems before you pick a single finish.
- Pick a finish family
- Choose one finish direction — warm wood, matt lacquer or two-tone — and let everything else follow it.
- Use the work triangle
- For kitchens, keep sink, hob and fridge in an easy triangle so cooking always feels effortless.
- Save & share
- Save your design to revisit later or share it with family — and bring it to your free visit.
- Book a visit to confirm
- A designer confirms measurements and details on site, so your final piece fits perfectly.
- Yes — designing and pricing your space is completely free, with no obligation. You only commit once you accept a formal quote.
- Design your space in minutes, or book a free visit and a designer will plan it with you.

### /about (42)

- For two decades The Closets has designed, made and fitted bespoke joinery across Bahrain — one measured wall, one honest handshake at a time.
- See our work
- Homes fitted
- Showrooms in Bahrain
- Warranty on every piece
- How it began
- It started with a single wardrobe.
- The Closets grew out of a small Manama workshop and a simple frustration: mass-made furniture never quite fit the room, and never quite lasted. So we did it the
- Word travelled the way it does in Bahrain — one satisfied home to the next. Two decades on, that workshop has become four showrooms and a team of designers, mak
- We don’t sell cabinets. We give people back the space they live in — calmer, quieter, and made exactly for them.
- What we stand for
- Four things we refuse to compromise on.
- Precision
- Every panel is cut to the millimetre and dry-fitted in our workshop before it ever reaches your home. Fit is not a finishing touch — it is the whole point.
- Permanence
- We build furniture meant to outlast trends: solid carcasses, soft-close hardware and finishes chosen to age gracefully in Bahrain’s climate.
- Made in Bahrain
- Designed, manufactured and installed by our own team in the Kingdom. No middlemen, no outsourced quality — one team, accountable end to end.
- Service for life
- A ten-year warranty and a maintenance team that answers. When you buy a closet from us, you gain a relationship, not just a receipt.
- Our workshop · Bahrain
- From raw board to fitted room
- One team, accountable end to end.
- A designer measures your space and draws it to scale. Our makers cut, edge and assemble it under one roof. Then our own installers fit it — and stand behind it 
- Free home measure
- In-house manufacturing
- Own install team
- See how it works →
- The journey
- A workshop that grew up.
- Founded in Manama — one workshop, one fitted wardrobe at a time.
- Opened our first flagship showroom.
- Launched the bespoke design configurator.
- Grew to four showrooms across Bahrain.
- Passed 500 homes fitted — kitchens, wardrobes and beyond.
- Opened the digital hub: design, quote and track online.
- Every home we finish carries our name. That is why we still walk each site before it’s signed off — and why we’ll still answer the phone years later.
- The Closets Co.
- Manama, Kingdom of Bahrain
- Let’s design your space.
- Book a free home visit and meet the team who’ll design, build and fit it — all in Bahrain.
- Meet our team

### /contact (11)

- Showrooms
- Manama · Riffa · Saar · Isa Town
- Phone
- Email
- info@the-closets.com
- Hours
- Sat–Thu · 9am–8pm
- Walk-In Wardrobe
- Sliding Door
- Hinged Door
- Kids Room
