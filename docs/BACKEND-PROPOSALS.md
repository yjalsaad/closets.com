# Backend proposals for go-live (DESCRIBED, NOT APPLIED)

Nothing in this branch touches the database, an edge function or any live setting. The website changes in this PR are the
client half of each item below; the owner / lead applies the server half. Sources for the "today" statements: the website
audit (`security-functional.md`), the hub's `qa/QA_DEFECT_REGISTER.md`, `audit/15-WAVE-C1-CLIENT-PLAN.md`,
`audit/17-WAVE-C2-REPORT.md` and `supabase/migrations/2026-10-20_SECURITY_wave_c1.sql`. The live state of every item is
**unverified from here** and must be checked first (`supabase/SECURITY_LIVE_CHECKS.sql`).

Every item: what is wrong today, the proposal, risk, order of operations, rollback, and what the website must already do.

---------------------------------------------------------------------------------------------------------------------

## 1. Enable `checkout_enforce_total` (server recomputes and enforces the order total)

* **Today.** `store_checkout` trusts the `p_total` the browser sends (hub register NEW-15: setting OFF). `pay.html` then charges
  `pay_amount_for('store_order', id)`, i.e. whatever total is stored on the order row. A visitor can replay the call with a
  smaller total.
* **Proposal.** Turn the setting on so the server recomputes the total from the item ids and current prices and ignores or rejects
  a mismatching `p_total`. The dry-run in the register says all 17 historical orders matched.
* **Website (done in this PR).** Items are sent as `{id, qty, name, category, price}` with `id`/`qty` as the primary data and the rest
  advisory; `p_total` is documented as advisory; the customer sees "Estimated total" before ordering and the **server-returned**
  total (when the RPC returns `total`, `total_bd`, `amount`, `total_amount` or `grand_total`) after it.
* **Risk.** (a) The browser applies a **loyalty-points discount** before sending `p_total`. With enforcement on, a discounted total will
  be "wrong" unless the server also applies the redemption. Either the server applies redemption itself (preferred, item 2) or
  loyalty discount must be switched off in the UI first. (b) Items without an `id` (planner-generated lines) cannot be priced from
  a catalogue; confirm how those are priced. (c) Installment plans: confirm the server derives the monthly amount.
* **Order of operations.** 1) Deploy this PR. 2) Re-run the dry-run over the last N orders using the new payload shape.
  3) Decide loyalty handling (below). 4) Enable the setting in **log-only / report** mode if the function supports it, else enable
  during a low-traffic window. 5) Place one real test order per payment method. 6) Watch `client_errors` and the orders table for a day.
* **Rollback.** Set the setting back to OFF (no deploy needed); the website keeps working because it already treats totals as advisory.

## 2. One atomic, server-priced, idempotent order RPC (`public_order_submit` + `store_checkout` today)

* **Why two order rows.** The browser calls two RPCs in sequence for one checkout: `public_order_submit` (ERP intake: writes the sales
  order and notifies the team) and `store_checkout` (writes the *store* order whose id `pay.html` charges against). They are
  independent writes, so every checkout creates two rows, and a retry after a partial failure creates more. Loyalty redemption
  (`loyalty_redeem`) and points (`customer_points_award`) are two more separate browser-driven calls.
* **Proposal.** A single RPC, e.g. `place_store_order(p_items jsonb, p_customer jsonb, p_payment text, p_installment_months int,
  p_notes text, p_redeem_points int, p_idempotency_key text)`, that in one transaction: validates items against the live catalogue,
  computes subtotal / discount / total, applies loyalty redemption and awards points itself, writes **one** order, returns
  `{ok, order_id, total, pay_url}`. A unique constraint on `p_idempotency_key` makes a repeated call return the same order.
* **Website (done in this PR, to be simplified later).** Surfaces failures, keeps the cart, shows success only on a confirmed response,
  disables the button while submitting, remembers which step already succeeded (sessionStorage) so a retry never repeats
  `public_order_submit`, and tags every request of an attempt with the same reference (`[web-ref <uuid>]` in the notes). Once the new RPC
  exists the website sends the key as a parameter and the two-step code in `src/checkout/checkout.js` collapses to one call.
* **Risk.** Staff workflows that read the ERP row and the store row separately; notification templates. Do not remove the old RPCs until
  the new one has been live for a release.
* **Order.** Build RPC -> test with the website behind a flag -> switch the website -> keep old RPCs for one release -> revoke anon on them.
* **Rollback.** Switch the website flag back to the two-step path; the old RPCs are still there.

## 3. Require a signed customer session for account / loyalty / order RPCs (`customer_rpc_require_session`)

* **Today.** `my_orders(p_email, p_customer_id)`, `my_invoices(p_email)`, `customer_rewards_get(p_customer_id)`, `loyalty_balance(p_phone)`,
  `customer_bookings_list`, `my_saved_designs`, `customer_update_profile(p_id, ...)`, `customer_card_set_photo`, `my_referral_count` take an
  identity asserted by the browser. Anyone who knows an e-mail, phone or id can read that customer's data (audit reproduced the calls; the
  server response is unverified). The website's legacy sign-in (`account_login`) returns a profile object, **not a token**.
* **Proposal.** Apply Wave C2: make the legacy RPCs require a customer session (`customer_rpc_require_session`) and then revoke anon
  execute on them. The token-bound twins already exist in the repo (`cp_orders_list`, `cp_invoices_list`, `cp_rewards_get`,
  `cp_loyalty_balance`, `cp_bookings_list`, `cp_saved_designs`, `cp_update_profile`, `cp_card_set_photo`, `cp_referral_get`, `cp_profile_get`, ...).
* **Website (done in this PR).** Every account RPC now goes through `src/account/api.js`. With a linked Supabase Auth session it calls the
  `cp_*` twin and sends **no** e-mail / phone / id; without one it sends the legacy parameters exactly as before. A session call that fails for an
  auth reason falls back to legacy while legacy is enabled. `REACT_APP_ACCOUNT_LEGACY=0` (or `setLegacyEnabled(false)`) turns the legacy path off so the
  post-C2 behaviour can be rehearsed. The stored `closets_user` is reduced to `id,name,email,phone,tier,points,referral_code`. Checkout loyalty lookup now uses the
  signed-in profile's own phone, never a phone typed into the form.
* **What the website must change FIRST (not done here, needs a decision).** Today only `/studio` creates a Supabase Auth session. The main-site sign-in /
  register / password reset (`account_login`, `account_register`, `customer_request_reset`, `customer_reset_with_otp`) are legacy RPCs that never produce a token.
  Before C2 the main site needs the e-mail-code / password sign-in that `src/studio/customerAuth.js` already implements (sign-up, `cp_claim_account`, token refresh), existing legacy
  customers need a migration path (reset e-mail linking them by confirmed address), and the portal must be tested end to end with a real session. Until then C2 would lock every
  existing customer out of the portal. **Do not enable C2 before this.**
* **Order.** 1) Deploy this PR. 2) Add auth sign-in to the main site and migrate users (separate piece of work). 3) Run `sec_c1_legacy_status` to see remaining legacy callers.
  4) Turn the website's legacy flag off in a preview deploy and exercise the portal. 5) Enable `customer_rpc_require_session`. 6) Revoke anon on the legacy RPCs after a quiet period.
* **Guest checkout.** `public_order_submit` / `store_checkout` stay callable without a session (guests buy). Keep them rate-limited and idempotent (item 2).
* **Rollback.** Re-grant execute / disable the session requirement; set the website legacy flag back on.

## 4. Community gallery: anonymous self-approved publishing (`viral_designs`, `approved: true`)

* **Today.** The browser inserts a row into `viral_designs` with `approved: true`, a free-form `image_url` and a `before_url` data URL; the public gallery lists
  `approved=eq.true`. Votes use a client-generated fingerprint kept in localStorage. Unmoderated content can appear on the public site and votes can be stuffed.
* **Proposal.** Remove anon INSERT on `viral_designs`; add a rate-limited RPC (e.g. `viral_design_submit`) that forces `approved=false`, validates image URLs / sizes, and a moderation queue in
  the hub. Add `viral_vote` de-duplication by IP/session server-side.
* **Website (done).** The false "published" toast on failure is fixed: a failed publish now shows an error. **Not done:** switching to `approved:false` + "submitted for review" copy needs the RPC and moderation first
  (otherwise nothing would ever appear in the gallery).
* **Risk.** Gallery looks empty until staff approve; set expectations in copy. **Order.** RPC + queue -> website switch -> revoke anon insert. **Rollback.** Re-grant insert.

## 5. Storage upload policy for profile photos (`card-media`)

* **Today.** The browser uploads with the anon key to `card-media/customer/<user.id>/...`, `x-upsert: true`, client-controlled content type and client-controlled `user.id`.
* **Proposal.** Signed upload URL (edge function or storage policy bound to the session's customer id) with MIME allow-list (jpeg/png/webp), size cap, no upsert, path derived from the token, and `cp_card_set_photo` validating the URL (already does).
* **Website.** After a session exists (item 3) the upload requests a signed URL first. Until then unchanged.
* **Risk.** Existing photos stay valid. **Order.** Policy in a staging bucket first. **Rollback.** Restore previous policy.

## 6. Smaller server-side follow-ups

* `customer_points_award(p_points)` is called by the browser with a client-computed number: compute points server side from the confirmed order (item 2); until then the website calls it only after a confirmed order and from the server-confirmed total.
* Direct anonymous inserts (`leads`, `product_configurations`, `complaints`, `it_tickets`) bypass the rate-limited RPCs. The newsletter now uses `public_lead_submit`; planners / complaints / tickets still insert directly.
* `log_client_error`: add length caps and a per-IP rate limit. The website no longer sends the customer id, e-mail, phone, tokens or query strings (masked client side).
* Security headers / CSP / SPA rewrite are in the other agent's `vercel.json` work; note `public/pay*.html` still use inline scripts (they need `'unsafe-inline'` or a move to `/pay.js`).
* Payment success page: `pay-success.html` is intentionally cosmetic. If the owner wants it to state "paid", it needs a verified status endpoint (read-only RPC keyed by the MyFatoorah `paymentId` that checks the webhook-verified ledger); until then it says "we will confirm by message".
