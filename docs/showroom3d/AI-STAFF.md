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
