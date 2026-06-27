# Design System — The Closets (الخزائن) Website

> **Single source of truth** for every visual decision on the public marketing website.
> Read this before any UI/UX work. Flag deviations in code review and log intentional ones in the Decisions Log.
>
> **Scope:** This document governs the **marketing website** (`closets-website/src/App.js`) — the editorial, warm, premium storefront. It is a sibling to, **not** the same as, the **Bonsai Hub** admin design system (`/closets-hub/DESIGN.md`), which is the dark, data-dense operational platform. See [§1.3 Relationship to the Hub](#13-relationship-to-the-hub).

---

## 1. Brand Essence & Voice

### 1.1 What this is

- **The Closets (الخزائن)** — a Bahrain-based bespoke furniture house: walk-in closets, kitchens, wardrobes, TV / media units, and doors.
- Every piece is a **made-to-measure commission**, designed, built and fitted in the Kingdom of Bahrain.
- The website is the brand's **editorial flagship**: an *Architectural Digest*-mood experience that sells craft, permanence, and taste — not a utilitarian catalogue.

### 1.2 Brand essence & voice

| Attribute | Direction |
|---|---|
| **Essence** | *Quiet luxury, made to measure.* Warm, tactile, editorial. |
| **Mood** | Premium daylight interiors — walnut, brass, linen, soft shadow. Calm, confident, never loud. |
| **Memorable line** | "Storage as beautiful as the room it lives in." |
| **Voice** | Editorial and assured. Short declarative sentences. Craft-forward nouns (millimetre, finish, commission, bespoke). One idea per line. |
| **Tone in EN** | Refined, understated, premium. "Every piece, made to measure." |
| **Tone in AR** | Equally premium, warm, respectful; never a literal machine translation — copy is authored, not converted. |
| **What we are NOT** | Discount-y, busy, gradient-soup, generic SaaS, neon, playful-for-fun, stock-photo-generic. The Hub is the instrument; the website is the gallery. |

### 1.3 Relationship to the Hub

The website and the **Bonsai Hub** admin platform share a **brand DNA** (same orange family, same semantic palette, same Inter body font, same 4px spacing base, same accessibility bar) but are **two distinct visual languages by design**:

| | **Website** (this doc) | **Bonsai Hub** (`/closets-hub/DESIGN.md`) |
|---|---|---|
| Audience | Public / prospective customers | Internal staff, field techs, management |
| Mood | Warm, editorial, premium, light | Serious, fast, "quiet confidence", dark-first |
| Background | Cream `#f7f2ec` | Near-black `#050505` |
| Display font | **Fraunces** (serif, editorial) | **Inter** (neutral) |
| Brand orange | **`#F2731C` (`--clay`)** | `#F97316` (`--brand`) |
| Decoration | Photography, grain, glass, motion | Borders & spacing do the work |

> **Intentional divergence, one debt:** the website uses a slightly warmer orange (`#F2731C`) than the Hub (`#F97316`). This is a deliberate website variant but it is **brand debt** — see [§12](#12-what-must-be-refactored) for the unification plan.

---

## 2. Logo & Identity Usage

| Rule | Spec |
|---|---|
| **Wordmark** | "THE CLOSETS" set in **Fraunces**, 600 weight, letter-spacing `.02em`, in `--ink`. Uppercase in the nav. |
| **Arabic lockup** | "الخزائن" — paired equivalently; never smaller than the EN wordmark in RTL contexts. |
| **Primary logo color** | `--ink` (`#211c18`) on light surfaces; `#fff` on dark photographic / `--ink` surfaces. |
| **Accent** | The clay orange is for the brand *mark accent and actions* only — never tint the full wordmark clay. |
| **Clear space** | Minimum clear space = the cap-height of the "C" on all sides. |
| **Minimum size** | 16px cap height on screen; never below legibility on mobile nav. |
| **Misuse** | Do not: stretch, recolor into gradients, add drop shadows, place on busy photo without an overlay scrim, or set in any font other than Fraunces. |
| **On photography** | Always over a dark gradient scrim (see [§9](#9-imagery--art-direction)) so contrast holds ≥ 4.5:1. |

---

## 3. Color System

All colors are CSS variables declared on `:root`. **Never hardcode a hex** where a token exists — use `var(--clay)`, `var(--ink)`, etc.

### 3.1 Brand & neutrals (the warm editorial core)

```css
:root {
  --ink:#211c18; --ink-soft:#4a423b; --muted:#8a7f72;
  --cream:#f7f2ec; --sand:#efe7dc; --line:#e6ddd1;
  --clay:#F2731C; --clay-deep:#C2410C;
}
```

| Token | Hex | Role / Usage |
|---|---|---|
| `--clay` | `#F2731C` | **Primary brand** — primary buttons, active states, links, eyebrows, focus rings, price text, dock active icon. |
| `--clay-deep` | `#C2410C` | Hover / pressed / active state for clay; clay text on tinted pills (e.g. signed-in chip). |
| `--ink` | `#211c18` | Primary text, headings, secondary (`btn-ink`) buttons, logo. |
| `--ink-soft` | `#4a423b` | Body copy, sub-headings, supporting paragraphs. |
| `--muted` | `#8a7f72` | Eyebrows on light, captions, meta, category labels, counts, placeholder. |
| `--cream` | `#f7f2ec` | **Page background** (the warm default canvas). |
| `--sand` | `#efe7dc` | Alternate surface — chips, swatch tiles, secondary buttons, image placeholders. |
| `--line` | `#e6ddd1` | Hairline borders, dividers, card outlines, inactive pills. |

### 3.2 Dark-section accents

Used **only** on dark photographic sections / the cinematic CTA, where the warm neutrals would disappear.

| Token (proposed) | Hex | Usage |
|---|---|---|
| `--sand-gold` | `#E7BBA0` | Eyebrow / label text on dark backgrounds (warm, low-glare). |
| `--clay-tint` | `#F9A35C` | Lighter clay tint for accents / icons on dark sections. |

> These are currently inline literals (`'#E7BBA0'`, `'#F9A35C'`). Promote them to tokens (see [§12](#12-what-must-be-refactored)).

### 3.3 Semantic colors

Shared with the Hub for cross-product consistency. Each ships with a **~12% tint** for status pills / soft fills.

| Token | Hex | Tint (pill bg) | Meaning |
|---|---|---|---|
| `--success` | `#1D9E75` | `rgba(29,158,117,.12)` | Saved, confirmed, paid, order placed, completed step. |
| `--warning` | `#BA7517` | `rgba(186,117,23,.12)` | Pending, due soon, in progress. |
| `--danger` | `#DC4444` | `rgba(220,68,68,.12)` | Error, failed, urgent, destructive action. |
| `--info` | `#378ADD` | `rgba(55,138,221,.12)` | Neutral status, informational toast. |

> **Note:** toast currently uses ad-hoc `#1a7a40` / `#d93025`; migrate to `--success` / `--danger` (see [§12](#12-what-must-be-refactored)).

### 3.4 Contrast pairings (must pass ≥ 4.5:1)

| Foreground | On | Use |
|---|---|---|
| `--ink` | `--cream` / `--sand` / `#fff` | Body & headings — passes AAA. |
| `#fff` | `--clay` | Primary button label — passes AA. |
| `--sand-gold` | dark photo scrim | Eyebrow on dark — verify per-image scrim. |
| `--muted` | `--cream` | Meta only; never body-length text below 14px. |

---

## 4. Typography

### 4.1 Families

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap');
```

| Role | Family | Notes |
|---|---|---|
| **Display / Headings** | **Fraunces** (serif) | Editorial, optical-size axis. `.display` class. Tight tracking `-.02em`, line-height `1.04`. Weights 400–700. |
| **Body / UI** | **Inter** | All paragraphs, labels, buttons, inputs, nav. Weights 300–700. System fallback `-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`. |
| **Arabic** | Inter + system Arabic fallback | Same weights; ensure Arabic glyph coverage; never letter-space Arabic. |
| **Numerals (prices/stats)** | Inter with `font-variant-numeric: tabular-nums` | Use **tabular figures** for all prices (`BD …`), stats, and quantities so columns and totals align. Keep numerals **LTR** even in RTL. |

The canonical `.display` rule:

```css
.display { font-family:'Fraunces',Georgia,'Times New Roman',serif; font-weight:600; letter-spacing:-.02em; line-height:1.04; }
```

### 4.2 Type scale

Headings use `clamp()` for fluid editorial sizing between mobile and desktop.

| Token / class | Mobile → Desktop | Family | Weight | Use |
|---|---|---|---|---|
| Hero | `clamp(40px, 7vw, 88px)` | Fraunces | 600 | Hero headline. |
| `.display` H1 | `38px → 60px` | Fraunces | 600 | Page titles ("Every piece, made to measure."). |
| `.display` H2 | `clamp(24px, 4vw, 44px)` | Fraunces | 600 | Section titles. |
| Stat number | `clamp(40px, 5vw, 64px)` | Fraunces | 600 | Animated counters / KPIs. |
| Quote / pull | `clamp(22px, 3vw, 34px)` | Fraunces | 400 | Testimonials (lighter weight, italic feel). |
| Card title | `18px` | Fraunces | 600 | Product card names. |
| Body L | `18px` | Inter | 400 | Lead paragraphs. |
| Body | `15–16px` | Inter | 400 | Default reading text, line-height 1.6–1.7. |
| Small / meta | `13px` | Inter | 500 | Captions, counts. |
| Price | `15px` | Inter | 700 | Tabular, `--clay`. |

### 4.3 Eyebrow rule

```css
.eyebrow { font-size:12px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--clay); }
```

- On **light**: `--clay` (or `--muted` for quieter labels). Tracking **.12–.14em** for label rows; **.22em** for the hero eyebrow.
- On **dark**: `--sand-gold` (`#E7BBA0`).
- Always uppercase, always paired with a Fraunces heading directly beneath.

### 4.4 Rules

- One Fraunces heading per content block; never set body copy in Fraunces.
- Never letter-space lowercase body. Tracking only on uppercase eyebrows/labels.
- Prices, stats, phone numbers: **tabular figures, LTR**, in both languages.

---

## 5. Spacing & Layout

### 5.1 Spacing scale (4 / 8 base)

| Token (proposed) | px | Use |
|---|---|---|
| `--space-1` | 4 | Hairline gaps, icon nudges. |
| `--space-2` | 8 | Inline gaps, chip padding. |
| `--space-3` | 12 | Input/button inner padding, card gaps. |
| `--space-4` | 16 | Default block gap, mobile gutters. |
| `--space-5` | 24 | Card padding, group spacing. |
| `--space-6` | 32 | Desktop gutters. |
| `--space-7` | 48 | Sub-section spacing. |
| `--space-8` | 64 | **Section padding — mobile.** |
| `--space-9` | 96 | Section padding — desktop (low). |
| `--space-10` | 140 | Section padding — desktop (hero / cinematic). |

> Spacing is currently inline magic numbers; consolidate to this scale (see [§12](#12-what-must-be-refactored)).

### 5.2 Containers

- **Max content width:** `1280px`, centered, with responsive gutters (16px mobile → 32px desktop).
- **Section vertical padding:** ~`64px` mobile, `96–140px` desktop.
- Full-bleed photographic banners break the container; content inside them re-centers to 1280.

### 5.3 Breakpoints

| Name | Width | Behaviour |
|---|---|---|
| **Mobile** | `375px` baseline | Single column, floating bottom dock, 16px gutters, hamburger sheet. |
| **Tablet** | `768px` | 2-col grids, larger type, top bar shows inline nav. |
| **Laptop** | `1024px` | Bento / asymmetric grids, full section padding, hover states enabled. |
| **Desktop** | `1440px` | Max 1280 container with wide gutters; largest clamp() sizes. |

Layout helpers in code: `mobile` flag drives padding/columns; `.hide-mobile` hides desk-only meta.

---

## 6. Radius & Elevation

### 6.1 Current radii (ad-hoc — to consolidate)

| Use | Current value |
|---|---|
| Pills / chips / avatars / language toggle | `980` / `999` |
| Cards / product cards | `18`–`26` |
| Sheets (menu, cart) top corners | `22` |
| Inputs / small buttons | `12` |
| Buttons (`btn-clay`, `btn-line`, `btn-ink`) | `14` |
| Focus outline radius | `4` |

### 6.2 Recommended consolidated 6-token scale

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `4px` | Focus outlines, tiny badges. |
| `--radius-sm` | `8px` | Inline tags. |
| `--radius-md` | `12px` | Inputs, small buttons, sheet alt. |
| `--radius-lg` | `16px` | Buttons, swatch tiles. |
| `--radius-xl` | `20px` | Cards, sheet top corners. |
| `--radius-pill` | `999px` | Pills, chips, avatars, dock, toggles. |

> Cards' current `18–26` should round to `--radius-xl` (20). Buttons' `14` → `--radius-lg` (16). Migration is non-breaking visual debt (see [§12](#12-what-must-be-refactored)).

### 6.3 Elevation

Soft, warm, low-spread shadows — never hard or neutral-gray.

| Level | Shadow | Use |
|---|---|---|
| Flat | none, `1px solid var(--line)` | Default cards (borders do the work). |
| Raised | `0 12px 26px -14px rgba(176,97,59,.7)` | Primary clay button (warm-tinted). |
| Hover | `0 18px 32px -14px rgba(143,76,45,.7)` | Clay button hover lift. |
| Floating | glass blur + `0 6px 16px rgba(242,115,28,.45)` | Dock center action, floating chips. |

Prefer **borders + warm shadow** over heavy gray drop shadows. Shadows tint toward clay/walnut, never cool gray.

---

## 7. Motion & Interaction

- **Philosophy:** Cinematic-editorial. Motion reveals content with grace; it never decorates idly. All motion respects `prefers-reduced-motion`.
- **Reveal-on-scroll:** `.rv` (up), `.rv-l` / `.rv-r` (slide in), `.rv-sc` (scale-up), `.rv-words` (word stagger). Triggered via `IntersectionObserver` at ~6% threshold, `-8%` bottom margin. Stagger via `--d` delay variable.
- **Easing:** enter = `cubic-bezier(.22,1,.36,1)` (decelerate / ease-out). Reveal durations 0.8–1.1s; micro-interactions **150–300ms**.
- **Hero:** `kenburns` — slow 24s scale/translate drift on the hero photograph.
- **Trust strip:** marquee scroll for logos/credentials.
- **Micro-interactions:** buttons `transform: scale(.97)` on press; cards lift `translateY(-1px)`; pills/dots animate width on active.
- **Scroll progress:** 3px `--clay` bar fixed at top.
- **Reduced motion (enforced):**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .kenburns, .marquee, .blob-1, .blob-2, .blob-3, .blob-4 { animation: none !important; }
  .rv, .rv-l, .rv-r, .rv-sc, .rv-words .w { opacity: 1 !important; transform: none !important; }
}
```

> **Rule:** any new animated element must have a reduced-motion fallback that shows the final state immediately.

---

## 8. Components

> **Golden rule: one primary CTA per section.** Everything else is secondary (`btn-line`) or tertiary (text link).

### 8.1 Buttons

| Class | Style | Use |
|---|---|---|
| `.btn-clay` | `--clay` bg, `#fff`, radius 14, warm shadow, hover → `--clay-deep` + lift | **Primary CTA** (one per section): "Design yours", "Request a quote", "Book a free visit". |
| `.btn-ink` | `--ink` bg, `#fff`, radius 14 | High-contrast secondary on light (e.g. "Add to cart"). |
| `.btn-line` | transparent, `1px solid --ink`, hover → fills `--ink` | **Secondary / outline** — "Contact us", "View collection". |
| `.btn-sm` | clay, radius 12, min-height 44 | Compact actions in tight rows. |
| Icon button | `36px`, pill, `--line` border | Cart, language toggle, dock — **must** carry `aria-label`. |

- Minimum target **44px** (50px for primary). `-webkit-tap-highlight-color: transparent`.
- Pressed: `scale(.97)`. Focus: see [§10](#10-accessibility-standards).

### 8.2 Navigation

- **Slim top bar:** fixed, 56px, glass (`rgba(247,242,236,.72)`, `backdrop-filter: blur(18px) saturate(180%)`). Gains a `--line` bottom border on scroll. Holds wordmark, Book-a-visit pill, language toggle, account, cart.
- **Floating bottom dock (mobile):** glass pill, 5 items, **center action raised** (clay circle, white border, floating shadow). Active icon = `--clay`; inactive = neutral gray. Each item `aria-label`ed.
- **Menu sheet (mobile):** bottom sheet, `--cream`, top corners radius 22, item list with active = `--sand` bg + `--clay-deep` text. Primary CTA full-width at the foot.

### 8.3 Cards

- **Product card:** `#fff`, `1px solid --line`, radius 18 (→ `--radius-xl`). **4:5 image** on top, optional clay badge (top-left, pill). Body: uppercase `--muted` category, Fraunces name + tabular `--clay` price on one row, then Add-to-cart (`--ink`) + customise (`--sand`) actions. Hover: `.lift`.
- **Bento / collection grids:** asymmetric grids for collections — mix large editorial tiles with smaller ones; let one image dominate per row.
- **Stat / KPI:** Fraunces number `clamp(40–64px)` in `--ink`, uppercase `--muted` label with `.12em` tracking.

### 8.4 Banners & editorial sections

- **Photo banners:** full-bleed image + **dark gradient overlay** scrim for text contrast. Eyebrow in `--sand-gold`, Fraunces headline in `#fff`, one CTA.
- **AI banner:** editorial card promoting the AI designer (Spark icon, clay accent).
- **Cinematic CTA:** dark section, subtle SVG grain texture, large Fraunces headline, single clay CTA. The emotional close of the page.
- **Trust strip:** marquee of credentials / logos.

### 8.5 Forms

```css
.inp:focus { outline: none; background:#fff; border-color: var(--clay); box-shadow: 0 0 0 4px rgba(242,115,28,.1); }
```

- Inputs: radius 12, `--line` border, `#fff`/`--sand` fill; focus → clay border + 4px clay-tint ring.
- Label above field; placeholder in `--muted`. Min height 44px.
- Validation uses semantic colors (`--danger` text + message, `--success` confirmation toast).

### 8.6 Modals, sheets & toasts

- **Auth / cart / menu:** bottom sheet on mobile (radius-22 top, slide-up), centered modal on desktop. Dismiss control is icon-buttoned + `aria-label`ed; backdrop click closes.
- **Toasts:** top, auto-dismiss; color by type via **semantic tokens** (success/danger/info), Inter 500, with check/icon prefix.
- Respect safe-area insets (`env(safe-area-inset-bottom)`).

---

## 9. Imagery & Art Direction

- **Aesthetic:** *Architectural Digest* editorial — warm walnut wood, brushed brass hardware, soft natural daylight, linen and stone textures, lived-in but immaculate interiors.
- **Subjects:** walk-in closets, fitted kitchens, wardrobes, TV/media units, doors — always *in context* (real rooms), never isolated on white.
- **Brand AI imagery in use:** hero, kitchen, TV-unit, walk-in renders — keep the same warm, daylight grade across all.
- **Treatment:** dark gradient scrim under any text-over-photo; optional subtle SVG film grain on dark sections; glass surfaces for floating UI over imagery.
- **Crops:** product imagery is **4:5** (portrait) on cards; banners are wide cinematic crops.
- **Don't:** cool/blue grades, harsh flash, cluttered staging, generic stock, logos on busy areas without a scrim.
- **Alt text:** every image carries descriptive `alt` (e.g. "Bespoke walk-in closet interior by The Closets").

---

## 10. Accessibility Standards (enforced)

| Standard | Implementation |
|---|---|
| **Focus visible** | `:focus-visible` → `2px solid var(--clay)`, `outline-offset: 2px`, radius 4. Never remove focus without replacement. |
| **Contrast** | Body text ≥ **4.5:1**; large display ≥ 3:1. Text on photos requires the gradient scrim. |
| **Reduced motion** | Full `prefers-reduced-motion` support — all animation/transition disabled, final state shown. |
| **Touch targets** | ≥ **44px** (50px primary buttons). |
| **Icon controls** | Every icon-only button (cart, language, dock, close) has an `aria-label`. |
| **Images** | Descriptive `alt`; decorative SVGs `aria-hidden`. |
| **Keyboard** | All interactive elements reachable & operable; sheets/modals trap focus and close on `Esc`. |
| **Semantics** | Real `<button>`/`<nav>`/`<h1>`…; roles on custom widgets (`role="img"` on photo fallbacks). |

---

## 11. Bilingual / RTL Rules

- **EN-first, AR-second.** English is the primary authored language; Arabic is a first-class, authored (not auto-translated) companion via the `I18N` map and `useI18n()`.
- **Direction:** `dir="rtl"` when `lang === 'ar'`. **Mirror the entire layout** in RTL — nav order, dock order, card alignment, icon direction (arrows flip: "→" becomes "←").
- **Numerals & prices stay LTR.** Prices (`BD …`), phone numbers, measurements, dates, and IDs render **left-to-right with tabular figures** even inside an RTL container.
- **Typography in AR:** never letter-space Arabic; never force uppercase (no case in Arabic). Maintain equivalent visual weight to the EN counterpart.
- **Toggle:** language switch is a persistent pill in the top bar (`EN ⇄ ع`); choice persists.
- **Parity:** every customer-facing string must exist in both `en` and `ar`; missing keys fall back to `en` but that is a bug to fix, not a feature.

---

## 12. What Must Be Refactored

Tracked visual/technical debt. None are user-facing regressions; all improve maintainability and consistency.

1. **~449 hardcoded hex literals → tokens.** `src/App.js` contains ~449 inline `#rrggbb` occurrences (e.g. `'#1D9E75'`, `'#E7BBA0'`, `'#1a7a40'`, `'#d93025'`, `rgba(249,115,22,…)` left over from the Hub orange). Replace with `var(--*)`. Priority: any clay/ink/semantic literal that already has a token.
2. **Promote dark-section accents to tokens.** `#E7BBA0` → `--sand-gold`; `#F9A35C` → `--clay-tint`.
3. **Fix stray Hub-orange opacity literals.** Focus-ring shadows use `rgba(249,115,22,.1)` (Hub `#F97316`) on a `--clay` (`#F2731C`) border — switch the rgba to the clay value `rgba(242,115,28,.1)`.
4. **Migrate toast colors to semantic tokens.** `#1a7a40`/`#d93025` → `--success`/`--danger`.
5. **Consolidate the radius scale.** Ad-hoc `12/14/18/22/26/980/999` → the 6-token scale in [§6.2](#62-recommended-consolidated-6-token-scale). Cards → `--radius-xl`, buttons → `--radius-lg`.
6. **Tokenize spacing.** Replace inline `padding`/`gap` magic numbers that match the scale with `var(--space-N)`.
7. **Unify the brand orange (`#F2731C` vs `#F97316`).** The website's warmer clay is intentional today but diverges from the Hub. Decide a single source: either (a) adopt `--clay #F2731C` brand-wide, or (b) keep two named tokens (`--brand` Hub, `--clay` Web) documented as a deliberate sub-brand. Until resolved, **never mix the two in one surface** (see #3).

---

## 13. Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-27 | Website gets its own DESIGN.md, distinct from Bonsai Hub | Marketing site is warm/editorial/light; Hub is dark/operational. Shared DNA, different language. |
| 2026-06-27 | **Fraunces** (serif) for display, **Inter** for body/UI | Editorial *AD* mood needs a refined serif; Inter keeps UI/Arabic consistent with the Hub. |
| 2026-06-27 | Brand orange = `--clay #F2731C` (hover `--clay-deep #C2410C`) | Warmer than Hub `#F97316`; reads as premium clay/terracotta against cream. Logged as debt to unify (§12.7). |
| 2026-06-27 | Cream `#f7f2ec` page background, walnut/brass photography | Establishes the warm, daylight, lived-in editorial canvas. |
| 2026-06-27 | Semantic palette shared with the Hub (`#1D9E75`/`#BA7517`/`#DC4444`/`#378ADD`) + 12% tints | Cross-product consistency for status/feedback. |
| 2026-06-27 | Dark-section accents `#E7BBA0` / `#F9A35C` | Warm low-glare label/accent colors that survive on dark photo scrims. |
| 2026-06-27 | One primary CTA per section | Editorial focus; avoids competing actions diluting conversion. |
| 2026-06-27 | Full `prefers-reduced-motion` support added | Accessibility baseline for a motion-heavy editorial site. |
| 2026-06-27 | Accessibility baseline enforced (focus rings, 4.5:1, ≥44px, aria-labels, alt) | Premium brand must be inclusive and WCAG-aligned. |
| 2026-06-27 | EN-first / AR-second, full RTL mirror, numerals stay LTR | Bahrain bilingual market; prices/IDs must remain legible LTR. |
| 2026-06-27 | Recommend 6-token radius + 10-step spacing scale | Replace ad-hoc values; align with Hub's tokenization discipline. |

---

**Process:** Any visual decision that deviates from this document requires explicit approval and a Decisions Log entry. In code review, flag tokens-vs-hardcodes, off-scale radii/spacing, multiple primary CTAs per section, and missing `aria-label`/`alt`. New components must consume `var(--*)` from `:root` — never declare their own scale.
