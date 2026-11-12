# Privacy: what was built, what the owner must decide

Scope: Bahrain PDPL (Law No. 30 of 2018) oriented, **UI side only**. Nothing here is legal advice and no legal text was invented:
every legal sentence is a clearly marked `[PLACEHOLDER]` for the owner / lawyer. Statements of fact below come from the code
and the audit; where something is not known it is listed under "Decisions needed".

## What the website now does

| Area | Behaviour |
|---|---|
| Consent banner | One component (`src/privacy/ConsentBanner.jsx`) mounted in **every** shell (main site, `/visualizer`, `/studio`, `/campaign/ikhtarha`, `/ikhtarha/games`). Two equal-weight buttons ("Allow measurement" / "Essential only"). Stored in `closets_consent_v2` (legacy `closets_consent` is migrated: `accepted` = analytics only, never AI). "Privacy settings" in the footer reopens it. |
| What it gates | `analytics`: visualizer `viz_session_ping` (device, OS, browser, time zone, language, referrer host, UTM, landing path, active seconds) and `viz_log` usage events (**dropped, not queued**, until allowed); GA4 if an id is ever configured. `ai`: every call that sends a photo or chat text to the AI edge functions (`ai_room_redesign`, `ai_design_concept`, `support_chat`, `planner_ai_design`, `render_photoreal`, YAS) asks once in a modal dialog; "Not now" sends nothing. `recommend_products` (runs on page view) only runs after AI consent. |
| Always on (strictly necessary) | language choice, cart, sign-in, the consent record itself, the in-memory checkout progress (sessionStorage), `log_client_error` (now with all identifiers masked, see below). |
| Disclosure of AI processors | Inline note next to the photo uploads and the chat ("Photos and chat messages you send to AI features are processed by a third-party AI service provider") plus the consent dialog. **No vendor name is shown** because the owner has not approved one (see decisions). |
| Notice at every personal-data form | `FormNotice` (short plain-language line + link to `/privacy`) under: booking, contact, maintenance / warranty, every planner "request a quote" dialog, checkout (order wording), newsletter (e-mail wording), sign-up, campaign and games entry forms. |
| Policy pages | `/privacy` and `/terms` on this site (`src/privacy/LegalPages.jsx`), bilingual headings, every paragraph a `[PLACEHOLDER]`, a visible "this page is a placeholder" note, `noindex, nofollow`, not in the sitemap. Footer and banner link to them (the ERP-host links `closets-hub.vercel.app/privacy.html` / `terms.html` are gone from the site). |
| Error reports | `log_client_error` no longer receives the customer id, e-mail, phone, tokens, Arabic-digit numbers or the query string / hash; only the pathname and the role. |
| Stored profile | `closets_user` reduced to `id,name,email,phone,tier,points,referral_code` (was the whole RPC response). |
| Form validation | Real e-mail (rejects `xyz`, `bad@@email`), phone (Bahrain 8 digits, `+973` / `973` / `00973`, other countries with `+`, **Arabic-Indic and Persian digits accepted and converted to ASCII before sending**), name (no `<` `>`), date (today to +12 months), length limits (`maxLength` + checked), honeypot field, errors linked with `aria-describedby`, announced, focus moved to the first invalid field. |

## Decisions needed from the owner

1. **Controller identity.** The footer says "The Closets Co. W.L.L."; the payment pages used "The Closets International W.L.L." with phone +973 3611 1004; the campaign says "الخزائن العالمية"; invoices cite a CR number. I unified `pay*.html` to **the footer's** name and phone (+973 17555095, wa.me/97317555095). **Confirm the legal entity name, CR number and the public phone / WhatsApp number**, then put them in `/privacy`.
2. **Approve or write the legal text** for `/privacy` and `/terms` (every `[PLACEHOLDER]`). Remove the `noindex` (`useNoIndex` in `LegalPages.jsx`) and add the routes to the sitemap only after approval. Arabic and English must both be approved.
3. **AI vendors and regions.** From the edge-function review the image AI is fal.ai and chat is Anthropic; the Supabase region is unknown to me. Decide whether to name them in the consent dialog / policy, and whether the cross-border transfer needs a legal basis beyond consent. Strings: `src/privacy/strings.js` (`aiBody`, `aiInline`).
4. **Is `log_client_error` strictly necessary?** I treated it as essential (security / reliability, no identifiers). If the owner / lawyer disagrees, gate it with `hasConsent('analytics')` in `src/errors.js` (one line).
5. **Measurement wording.** The banner says what is measured in plain words. Confirm it matches what the owner intends to collect, and whether GA4 will be enabled (needs CSP + Consent Mode work).
6. **Newsletter consent.** Currently a notice with link, no tick box (the e-mail is typed into a field whose only purpose is subscribing). If the lawyer wants an explicit unticked box, add it in `HomePage`.
7. **Retention periods and the data-subject request channel** (access / correction / erasure). The hub has `customer_request_data_export/_erasure/_correction` RPCs; decide whether to expose a "my data" request link in the footer.
8. **Third-party requests before any choice** that expose the visitor's IP: Google Fonts, jsDelivr / cdnjs (three.js, model-viewer), image hosts (Unsplash, Pexels, CloudFront), `api.qrserver.com` (**receives the shared design URL**). Not changed here (performance / head agents own fonts and scripts); recommended: self-host fonts and three.js, generate QR codes locally (the repo already has `qrcode-generator`).
9. **Visualizer `vz_contact`** (name / phone / e-mail kept in localStorage after the visitor submits a quote or capture form so the form can be prefilled). Convenience storage the visitor triggers; decide whether to keep it, shorten it, or ask first.
10. **Children / age.** Nothing on the site asks for an age; decide if a statement is needed.

## Verified / not verified

| Item | Status | How |
|---|---|---|
| Banner appears on `/`, `/visualizer`; "Essential only" and "Allow measurement" store the right state; legacy values migrate | Verified | Jest (`consent.test.jsx`, `app.test.jsx`) + Playwright on the built site |
| No `viz_session_ping` / `viz_log` before consent or after "Essential only"; ping starts only after "Allow measurement" | Verified | Jest + Playwright network log (faked backend) |
| AI call asks first, "Not now" sends nothing, "Allow" is remembered | Verified | Jest (`consent.test.jsx`); UI path in a real browser **not** exercised for every AI feature |
| Privacy / terms routes exist, noindex, placeholder visible, links point to this site | Verified | Jest + Playwright |
| Crash report contains no e-mail / phone / token / query string | Verified | Jest (`resilience.test.jsx`) |
| Form notice present at every listed form | Verified by code search; booking and newsletter also by Jest | planner quote dialogs not exercised in a browser |
| Validation (e-mail, phone with Arabic digits, name, date, lengths, honeypot) | Verified | Jest (unit + booking / newsletter integration) + Playwright booking |
| Legal wording, vendor list, retention, controller identity | **Not done: owner decision** | see above |
| Consent in `/studio` after sign-in, games / campaign flows with real data | Not verified | shells load with the banner; end-to-end flows need real backend |
| GA4 behaviour | Not verified | placeholder id, GA never loads |
