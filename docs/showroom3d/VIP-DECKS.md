# VIP room presentation decks

The VIP Meeting Room (`src/showroom3d/`) shows **decks**: ordered slides drawn on the wall screen and mirrored in the DOM panel. The original stations are the **default deck** (now four: the "How to join and invest" and investor-briefing stations were removed at the owner's request). More decks can be

1. **added in the room** by anyone with the page open ("Add presentation"): saved **on that device only** (this file, sections 3 to 5), or
2. **committed as a file** to become permanent for everybody (section 6).

Nothing here touches the website, the backend or the database. There is no network call and no upload: a deck lives in the browser (`localStorage`) or in the repository.

## 1. Using it

| What | How |
|---|---|
| Open the presentation | Walk into the VIP room, press **E** (or tap Interact). |
| Switch deck | The **Presentation** drop-down in the panel (keyboard: focus it, arrow keys; touch: tap). Keys **[** and **]** cycle decks. With more than one deck, **deck chips** also appear along the top of the wall screen and a click on a chip switches deck. |
| Slides | Previous / Next, the dots, **arrow keys** (mirrored in Arabic), **1 to 9** jump to slide 1 to 9 (ignored beyond the deck's length), **Home / End**. |
| Add a presentation | **Add presentation** in the panel. Import a `.json` or `.md` file, or paste markdown / JSON. A live preview and clear errors appear before anything is saved. |
| Delete | Select your deck, **Delete**, confirm. Built-in decks cannot be deleted. |

Always visible in the dialog: **"Saved on this device only"** and the note that **you are responsible for the accuracy of any financial or legal content** you add. Limits: at most **6 saved decks per device**, about 400 KB in total (browsers allow roughly 5 MB). Private windows or blocked site data cannot save: the dialog says so and nothing is lost or half-saved.

## 2. Honesty rules (enforced in code, not by convention)

* **The disclaimer is always the last slide** of every deck, imported ones included: *"Information only, not an offer or financial advice; details provided directly by management."* (Arabic: *للاطلاع فقط، وليس عرضًا ولا نصيحة مالية؛ تُقدَّم التفاصيل مباشرة من الإدارة.*) It is appended by `sanitizeDeck()` and cannot be removed or faked by an import (a `disclaimer` flag in imported JSON is dropped). Generic slides also repeat it as a footer.
* **"To be confirmed by management" placeholders** still resolve from `src/content/facts.js`. Anywhere in a deck's text, write `{{fact:yearsOfCraft}}` (also `homesDelivered`, `productionModel`, `showroomCount`, `warrantyYears`, `phone`). While the fact is `null` it prints *To be confirmed by management* (Arabic *يؤكَّد من الإدارة*); once management fills `facts.js` the value appears with no change to the deck. Unknown keys also print the placeholder; nothing else is ever substituted.
* **Financial promises**: the built-in content may never contain figures, returns, valuation, equity, ROI or guarantees (and, since the owner's request, no invitation to invest or join: `vipProfileDecks.test.js` and `vip.test.js` check it) (the existing unit test in `vip.test.js` still scans it). Imported decks are the owner's content, so they are *not* blocked, but the dialog shows a **warning** when it sees financial wording or figures, and when a chart or table has neither a `source` nor `illustrative: true`.
* **Illustrative**: mark any slide or block `"illustrative": true` and the room prints "Illustrative: simplified mock-up, not real data".

## 3. Deck schema (JSON)

```jsonc
{
  "id": "partner-welcome",              // optional; becomes "user-partner-welcome" (a-z, 0-9, dashes, max 40)
  "title": { "en": "Partner welcome", "ar": "أهلًا بشركائنا" },   // Text, max 80
  "slides": [                             // 1 to 24 slides (the notice slide is added on top)
    {
      "id": "who",                        // optional
      "title": "Who we are",              // Text, max 90
      "lead": "One-line introduction",    // optional Text, max 200
      "bullets": ["Point one", { "en": "Point two", "ar": "النقطة الثانية" }],   // max 8, each max 220
      "accent": "orange",                 // optional: orange | brass | sand | sage (a name, never a colour code)
      "blocks": [ /* up to 3, see below */ ],
      "links": [ { "label": "Kitchens", "route": "/kitchen" } ],   // up to 3, internal routes only
      "source": "Where the numbers come from",   // optional Text, max 140
      "illustrative": true                // optional
    }
  ]
}
```

**Text** is a plain string (used for both languages) or `{ "en": "...", "ar": "..." }` (a missing language falls back to the other). The room shows the language of the page (`/yas-bloom` or `/ar/yas-bloom`), Arabic right-to-left.

**Blocks** (`type` decides the shape; each may also carry `source` and `illustrative`):

```jsonc
{ "type": "image", "url": "https://example.com/photo.jpg", "alt": "Describe the picture", "caption": "optional" }
{ "type": "table", "head": ["Step", "Who"], "rows": [["Survey", "Designer"], ["Fit", "Installer"]] }          // up to 6 columns x 12 rows, cell max 60
{ "type": "bar", "title": "Projects by department", "unit": "projects", "data": [ { "label": "Kitchens", "value": 12 }, { "label": "Doors", "value": 7 } ] }   // up to 8 bars, value a number >= 0, label max 30
```

The bar chart is drawn from exactly the numbers supplied: nothing is calculated, summed or projected.

**Links** may only name a site page: `/kitchen /wardrobes /doors /tv /studio /design-studio /campaign/ikhtarha /booking /projects` (the language prefix is added automatically). Any other address is an error.

### What the sanitiser does (`src/showroom3d/vip/deckSchema.js`)

* strips HTML tags, `<script>`/`<style>` blocks, comments, entity-encoded tags, `javascript:` text, control characters and bidi-override characters; collapses whitespace; truncates to the caps above. Text is only ever rendered as text (React escapes it; the wall is canvas text), never as HTML.
* images: **https only**, no credentials in the address, must parse as a URL with a dotted host, at most 500 characters, no spaces. `http:`, `data:`, `javascript:`, `file:`, relative and protocol-relative addresses are rejected with a message naming the slide.
* drops unknown fields, `builtin`, `data` and `disclaimer` (those keys are reserved for committed decks); ids are slugged and made unique; a user slide cannot take the reserved `disclaimer` id.
* refuses input longer than 100,000 characters before parsing and more than 24 slides; truncates bullets, blocks, rows, columns and bars with a warning.
* uses the site's `src/safety/sanitize.js` helpers (`str`, `arr`, `isObj`) through the single adapter `src/showroom3d/siteBridge.js`.
* stored decks are **re-sanitised on every load**, so edited or corrupted storage cannot reach the renderer.

## 4. Markdown syntax

| Line | Meaning |
|---|---|
| `# Deck title` | the deck title (once) |
| `## Slide title` | starts a slide |
| `> Intro line` | the slide's lead (optional) |
| `- A bullet` (or `* `) | a bullet |
| `![alt text](https://example.com/photo.jpg)` | an image (https only) |
| `English text \|\| النص العربي` | add Arabic to any of the above (write the two parts around ` \|\| `) |

Blank lines are ignored. A line that is none of these is skipped with a warning naming the line. Errors name the line: *"Line 2: this line comes before the first slide. Start a slide with "## Slide title"."*

### Copyable example (markdown)

```markdown
# Partner welcome || أهلًا بشركائنا
## Who we are || من نحن
> Designed, made and fitted in Bahrain. || تصميم وتصنيع وتركيب في البحرين.
- Made-to-measure kitchens, wardrobes and doors || مطابخ وخزائن وأبواب على المقاس
- A showroom you can walk through online || معرض يمكنك التجول فيه عبر الإنترنت
## How we work || كيف نعمل
- We survey, design, make and fit || نقيس ونصمّم ونصنّع ونركّب
- Management answers questions directly || تجيب الإدارة عن الأسئلة مباشرة
```

(The dialog's **Insert an example** button pastes exactly this.)

### Copyable example (JSON with a chart, table and link)

```json
{
  "title": { "en": "Operations snapshot", "ar": "لمحة عن العمليات" },
  "slides": [
    {
      "title": { "en": "Where the work happens", "ar": "أين يجري العمل" },
      "lead": "Illustrative figures supplied by the owner",
      "accent": "sage",
      "bullets": ["Survey, design, make, fit"],
      "blocks": [
        { "type": "bar", "title": "Projects by department", "unit": "projects", "illustrative": true,
          "source": "Owner supplied (example)",
          "data": [ { "label": "Kitchens", "value": 12 }, { "label": "Wardrobes", "value": 20 }, { "label": "Doors", "value": 7 } ] },
        { "type": "table", "head": ["Step", "Who"], "rows": [["Survey", "Designer"], ["Make", "Factory"], ["Fit", "Installer"]],
          "source": "Owner supplied (example)" }
      ],
      "links": [ { "label": "Kitchens", "route": "/kitchen" } ]
    }
  ]
}
```

## 5. Saved on this device only

`src/showroom3d/vip/deckStore.js`: one `localStorage` key (`sr3d.vipDecks.v1`), every read and write inside `try/catch`. Failure codes the dialog turns into sentences: `blocked` (private window / site data blocked), `full` (quota or the 400 KB cap), `max` (6 decks). Other visitors and other devices never see these decks; clearing site data removes them. Imported decks are not uploaded anywhere.

## 6. Adding a PERMANENT deck (by committing a file)

1. Create `src/showroom3d/vip/decks/my-deck.js` exporting a deck object (the schema of section 3; text may use `{{fact:key}}`; a plain object, no `builtin` / `data`). Give it a unique `id` that does not start with `user-`.
   ```js
   export const MY_DECK = {
     id: 'partner-welcome',
     title: { en: 'Partner welcome', ar: 'أهلًا بشركائنا' },
     slides: [
       { id: 'who', title: { en: 'Who we are', ar: 'من نحن' }, bullets: [{ en: 'Made to measure', ar: 'على المقاس' }] },
     ],
   };
   ```
2. List it in `src/showroom3d/vip/decks/index.js`: `export const EXTRA_DECKS = [MY_DECK];`. The disclaimer slide is appended automatically, so a committed deck cannot forget it.
3. `vipDecksGolden.test.js` checks every permanent deck passes the same sanitiser as imports and ends with the disclaimer: run Jest.
4. Review like any content change (it is public copy). Permanent decks cannot be deleted in the room.

## 7. PROPOSAL (not implemented): server-side storage so decks follow the owner across devices

Status: **proposal only. Nothing below is applied** (no table, no function, no migration). It needs the owner's decision and a security review.

* **Table** `vip_decks(id uuid pk, owner uuid references auth.users, title_en text, title_ar text, deck jsonb not null check (jsonb_typeof(deck) = 'object' and octet_length(deck::text) <= 100000), published boolean default false, created_at, updated_at)`.
* **RLS**: enable RLS; `select` where `owner = auth.uid()` or (`published` and the viewer holds the VIP role); `insert/update/delete` only `owner = auth.uid()` **and** the caller has the manager role from the existing RBAC matrix. No anonymous access.
* **Edge function** `vip-deck-save` (the only writer): re-runs the SAME `sanitizeDeck()` server-side (never trust the browser), enforces size and per-owner count, appends the disclaimer slide, rate-limits, writes an audit row. The client never writes the table directly.
* **Client**: a read of the owner's / published decks merged after the permanent ones, the same picker, the same renderer; local-only decks stay as they are.
* **Risks**: (1) stored content shown to visitors is a liability channel: needs publish review and an audit log; (2) any image address is fetched by the *viewer's* browser (tracking pixel risk): consider an image allow-list or proxy; (3) stored XSS if the server sanitiser and the renderer drift (mitigation: text-only rendering, one shared sanitiser, tests); (4) abuse / storage growth: quotas and rate limits; (5) PII or confidential data pasted into decks: retention and deletion policy; (6) an auth dependency and a backend write path that the showroom deliberately does not have today (it is additive and read-only); (7) legal review of who may publish financial wording.

## 8. Profile decks, motion, the big screen and reading mode

Three permanent decks now load in the VIP room (picker order): the **company presentation** (default; four stations: story, projects and business lines, Bonsai Hub, talk to our team), **The Closets: Company Profile** (22 slides) and **YAS Profile (2023)** (12 slides), all with EN + AR text and a source page on every slide. Facts and figures are listed in `VIP-ROOM-OWNER-INPUTS.md`; JSON exports for the Hub are in `docs/showroom3d/decks/`; photos in `public/yas-bloom/profile/` (22 WebP files, about 1 MB, each <= 150 KB; `scripts/showroom3d-profile/make-images.py` rebuilds them from the PDFs).

**Schema additions (backwards compatible):** a block `{ "type": "stat", "items": [ { "value": 70000, "suffix": " sqm", "label": Text } ] }` (1 to 4 figures, counted up on screen); a slide field `"layout": "split" | "hero" | "duo"` (hero: first image full-bleed with the title over it; duo: two photos side by side); a bullet written `"2013: text"` shows its year in the accent colour; `LIMITS.maxSlides` is now 24. Committed decks may use image paths `/yas-bloom/profile/<name>.webp`; imports and saved decks may not (https only).

**Motion** (`vip/motion.js`, pure and tested): slide cross-fade with a drifting previous frame, staggered bullet reveal, count-up for stats and bar growth, a slow Ken Burns on photos (high tier only), the same ideas in the panel with CSS. **Auto-play**: Play / Pause, speed 0.5x, 1x, 1.5x, 2x, Loop, a progress bar on the wall and in the panel; keys **P** or **Space**, **R** speed, **L** loop. **Tiers**: low = short fade, no stagger, no drift, 6 Hz redraws; medium = stagger and count-up, 8 Hz; high = adds Ken Burns, 12 Hz. **Reduced motion** (`prefers-reduced-motion`): no transitions, no stagger, no count-up, no drift, final values at once, no redraw loop.

**The big screen** is now a 16:9 LED wall of 6.9 x 3.9 m (it was 5.7 x 3.2) in a stone surround with a brass edge, a warm LED line and a soft glow, a presenter lectern, the presenter's remote on the table, and the whole chair row facing it (no chair stands between the table and the wall). The texture is 1920 x 1080 (2560 x 1440 on high), mipmapped, anisotropic, smoothed at high quality. Panel buttons: **Present on big screen** (key **B**: the camera fronts the wall and the panel shrinks to a slim presenter bar), **Reading mode** (key **Z**: the wall fills the view edge to edge, only Previous / Next / Exit stay), **Full screen presentation** (key **F**: the browser's full screen plus the big view; a browser may refuse it). **Esc** steps back one level.

**The adviser** can drive the screen: asked to "present the company profile" (or "present the YAS profile"; Arabic works too) the VIP adviser answers and the screen plays the deck (`staff/guide.js` intent `present`, chips `#present:<deck id>`).

**Legibility rules** (hard requirement, tested in `__tests__/vipLegibility.test.js` for every slide, both languages, and in `scripts/showroom3d-qa/vipprofile.js legible` with the real fonts): wall title 66 px of an 864 px screen (7.6%), lead 38 px, bullets 30 to 40 px (3.5 to 4.6%), table cells 30, stat labels 30, captions 24, source and disclaimer lines 22; weights 500 or heavier; contrast at least 4.5:1; no squeezed text; 70 px side margins; at most 2 bullets on photo layouts, 4 beside a photo, 6 on a text slide, each about 12 words or fewer; dense lists are split over several slides. **Not covered:** the built-in stations of the default deck keep their original dense drawings (Hub diagram, business-line map) with smaller type; use Reading mode or the panel for those. In the panel, generic slides use 18 px bullets and 22 px leads.

## 9. Files

`src/showroom3d/vip/deckSchema.js` (schema, sanitiser, disclaimer, fact tokens) · `motion.js` (easing, tiers, auto-play) · `decks/closets-profile.js`, `decks/yas-profile.js` · `deckMarkdown.js` · `deckStore.js` · `deckState.js` (picker state machine) · `example.js` · `decks/default.js` (the five stations) · `decks/index.js` · `ui/VipPanel.jsx`, `ui/VipSlide.jsx`, `ui/VipDeckDialog.jsx` · `scenes/vip/panels.js` (`drawSlide`, `drawDeckChips`) · tests `__tests__/vipDecks*.test.js*`, golden fixture `__tests__/fixtures/vip-golden.json` (dumped from the pre-deck `vipContent.js`) · QA `scripts/showroom3d-qa/vipdecks.js` · screenshots `docs/showroom3d/screenshots/vipdecks-*`.
