# YAS Bloom AI staff: findings, architecture, guardrails

## What the site already does for AI (inspected before coding)
- **Edge function**: `support_chat` (Supabase), called from `src/App.js` (`SupportChat`, around line 3420) and `src/pages/AiYasPage.jsx` (`YasChat`). Its source is **not in this repository** (`supabase/` has no `support_chat`), so only what the two callers send and read is known:
  - request: `POST {SUPA_URL}/functions/v1/support_chat` with the public anon `apikey` / `Authorization: Bearer <anon key>` headers (already in the client) and body `{ messages: [{ role: 'user' | 'assistant', content: string }, ...] }`;
  - response: JSON `{ ok: true, reply: string }`; the callers treat anything else (`!d.ok`, no `reply`, a thrown error) as a failure and show a canned error / offline message.
  - **No context parameter is documented or used** (no room, department or system prompt field). Nothing in the repo shows that extra fields are accepted, so the showroom sends **only the visitor's own conversation** and no hidden context.
- **Consent**: `src/privacy/ai.js` `aiFetch(url, init)` is a drop-in `fetch` that first calls `ensureAiConsent()` (a modal with the existing wording `aiTitle` / `aiBody` in `src/privacy/strings.js`, remembered through `src/privacy/consent.js`, `hasConsent('ai')`). On "Not now" nothing is sent and the caller receives `{ ok:false, status:451, json() -> { ok:false, error:'ai_consent_declined' } }`. `src/__tests__/consent.test.jsx` covers it.
- `src/account/api.js` is the customer-account client (not an AI path); the showroom does not use it.

## Decision
1. **Offline guide first, always** (`src/showroom3d/staff/guide.js`, pure, deterministic): intent matching (EN + AR) over a knowledge base built **only** from existing data: the site's page list and meta descriptions (`src/seo/routes.js`), the showroom department catalog and finish lists (`products/catalog.js`, `finishes.js`), the contact facts (`src/content/facts.js`: phone, hours, 10-year cabinetry and soft-close warranty) and the booking / quote link builders. It answers service questions, takes the visitor to a department (nav-graph glide), discovers needs (room, style; a budget **band question may be asked but is never answered with a number**), recommends a department and a finish, and hands off to the existing `/booking` link with a summary in `notes` (query string only).
2. **AI fallback, opt-in per question**: when the guide has no confident answer, the chat offers "Ask the AI assistant". That button sends the visitor's messages through the **existing `aiFetch` to `support_chat`** (so the existing consent modal and decline behaviour apply unchanged). The reply is passed through a client-side guardrail filter (no prices, currency, percentages, discounts, delivery dates, stock or warranty claims; if it trips, a safe "our team will quote you" message is shown instead). A client-side rate limit applies (6 questions / 30 s). If the visitor declines consent, is offline or the function fails, the guide answers instead and the consent prompt stays available.
3. Everything is labelled **AI assistant** with the existing disclosure wording. Staff names are placeholders (see owner decisions).

## Guardrails (all unit-tested in `src/showroom3d/__tests__/staff.test.js`)
- Every canned answer (EN + AR) is scanned: **no digits or currency** except facts that come from `facts.js` (phone, warranty years) and the whitelisted token "3D".
- Price, discount, delivery time, stock and warranty-extension questions never get a figure: the answer says the team quotes after a measure / design visit and offers the quote link.
- Off-topic and abusive input gets a polite redirect; "talk to a person" gives the phone / WhatsApp / booking link from `facts.js`.
- The showroom never writes to the backend: the only network call is the consent-gated `support_chat` POST the site already makes, and a unit test asserts that the guide and the hand-off builders never touch `fetch`.
- AI replies are length-capped and filtered (above); the conversation summary in hand-off URLs is sanitised and capped like the quote notes.

## Hand-off
`/booking?interest=<existing option>&source=showroom-3d-staff&finish=<id>&notes=<summary>` (and `/ar/booking`), built by `staff/guide.js` with the same sanitising as `products/quote.js`; `parseBookingPrefill` already honours `interest` and `notes`.

## PROPOSAL (not applied): a showroom-specific edge function
`yas_bloom_chat` with a per-room system prompt (department, finishes, services list, the guardrails above server-side), a `room` and `lang` field next to `messages`, server-side rate limiting, no storage of conversations unless the owner decides otherwise, and an allow-list of links it may return. It would replace the AI fallback only; the offline guide would stay as the fallback.

## Owner decisions needed
- Staff names (the shipped names are placeholders and are always shown with "AI assistant"), outfits and whether a headscarf is the default.
- Whether voice output (browser speech synthesis, off by default) should ship, and which wording to disclose about the AI vendor.
- Whether `support_chat` may be given room context (needs its owner to confirm the function accepts it) or the proposed new function should be built.
- Confirm the service list the reception names (it is derived from the site pages and Neo designers; walk-in closets and bedrooms have no page of their own).


## Status after round 2 (implemented, tested)

What exists and works (Jest 491 tests, CI build 0 warnings, Playwright `scripts/showroom3d-qa/phase6.js`, all flows pass on SwiftShader):

- Reception: desk, backdrop sign (EN/AR), adviser behind the desk, greeting bubble when the visitor enters the hall after the intro, lists ALL services from existing site data, "take me to <room>" glides along the nav graph, hand-off to /booking.
- One female AI adviser per room (different outfit / headscarf / hair): reception, kitchens, wardrobes, walk-in, bedrooms, doors, living, studio, lounge, VIP. Each turns to the visitor, waves once, may step up to 0.9 m towards them (never closer than 2.1 m, not at all with reduced motion) and talks (jaw / head / hand beats) while the chat answers.
- Chat panel: "Talk to <name> (AI)" HUD button, T key, E next to an adviser (E in front of the Reception desk); EN/AR with RTL, typing indicator, quick-reply chips, "AI assistant" badge and disclosure line, optional read-aloud (off by default).
- Offline guide first (`staff/guide.js`, deterministic): intents EN + AR, needs discovery (room, look, rough budget BAND asked but never quoted), recommended real finish, hand-off `/booking?interest=<existing option>&source=showroom-3d-staff&finish=<id>&notes=<summary>` (controlled vocabulary only; the VIP adviser sets no interest: the investor path was removed at the owner request; it can put the profile decks on the big screen with `#present:<deck>`).
- Opt-in AI fallback: only when the guide does not understand, per question, through the site's existing consent-gated `aiFetch` to `support_chat` (all site imports live in `siteBridge.js`). Decline / offline / blocked replies fall back to the guide. Replies are stripped of markup and dropped when they contain digits, currency or promise phrases. Client-side limit 6 per 30 s. No new backend, no new keys.
- Guardrail test scans every canned answer, chip label and planning-flow ending (EN + AR) for digits, currency and promise phrases (apart from the existing contact facts and the warranty years).

Not built: server-side AI context (no `yas_bloom_chat` function, kept as the proposal above), real voice input, native Arabic review of every string, per-room product-aware answers beyond catalog names / finishes / spec lines.

### Cost (SwiftShader, `debug=1`, scale 0.4; draw calls / triangles; fps is meaningless on software GL)

| tier | hall (spawn) | reception | kitchens | adviser draw calls (all ten) |
|---|---|---|---|---|
| low | 314 / 122k | 354 / 130k | 452 / 151k | 49 |
| medium | 343 / 162k | 383 / 173k | 509 / 213k | 49 |
| high | 404 / 185k | 450 / 199k | 597 / 242k | 49 |

Per character: about 2645 triangles near (medium / high), about 2.7k far (baked single mesh, 1 call), 14 draw calls near. Advisers further than 11 m are one draw call and are not animated.
