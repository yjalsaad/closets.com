# Haneen AI: the investor assistant of Bloom Meeting

Haneen AI (EN "Haneen AI", AR "حنين AI") is the assistant at the desk in the Bloom Meeting lobby (Floor 2) and behind the floating "Ask Haneen AI" button. She answers investor questions about YAS Factory and The Closets
**only from a curated, versioned fact sheet** and never from memory. This page is the owner's checklist and the editing guide.

## How she answers

1. **Offline first.** `src/showroom3d/investor/haneen.js` is deterministic (no network, no storage). A question is matched to a topic (Who we are, Factories & capacity, Products & collections, Markets, Track record, Technology, Team, Investment opportunity, Visit the factory, Talk to a human) and the answer is assembled from the **confirmed** facts of that topic. Every answer carries the ids of the facts it used (`data-facts` on the message in the DOM, `factIds` in code).
2. **Anything the owner has not confirmed is never said.** A fact with status `needs-owner-confirmation` produces the standing reply: *"I don't have a confirmed figure for that; I'll connect you with the team."* (AR: "ليس لديّ رقم مؤكَّد بهذا الخصوص؛ سأوصلك بالفريق.") plus the **Request a meeting with the team** action. Questions about money (valuation, revenue, profit, funding, equity, shares, returns, ROI, price) always get that reply. No forward-looking statement, no return claim, no valuation, no number that is not confirmed.
3. **Not understood** -> the ten topic chips and the team action. Only then is the site's existing **opt-in AI chat** offered (the same consent-gated `supportChatFetch` the advisers use: the browser asks for permission first; replies go through `guardAiReply`, which drops any answer with a digit, a currency or a promise; at most 6 AI questions per 30 s via `createRateLimiter`). The instruction sent with it forbids figures and promises.
4. **Visible honesty:** the line *"AI assistant: answers are informational, not investment advice."* is always on the panel; the badge says AI assistant; read-aloud is **off by default** and session-only.

## Privacy

Nothing the visitor types is stored (not in localStorage, not on a server). The chat lives in the component's memory; the session memory holds only a turn counter and the last topic. **Reset session** clears the chat, the form, presenter mode and read-aloud for the next visitor. Nothing is sent anywhere unless the visitor opts in to the AI chat, or presses a mailto / WhatsApp link that opens **their own** email or WhatsApp app.

## Request a meeting with the team

The form (name, email, phone, company, message) builds a `mailto:` link to the company email and a WhatsApp link to the company number, both from `src/showroom3d/vendor/facts.js`. **No database write and no edge function is created**: the site's booking / inquiry path writes to the Hub, so it was deliberately not reused from the showroom. A contact card with a QR code (to the company WhatsApp number) and the phone / email is shown under the form. Company profile PDF: **no profile PDF exists in the repository**, so the card shows a clearly labelled placeholder ("Company profile PDF: coming from management") and the item is on the checklist below.

## Fact sheet status (version 2026-11-15.1): 16 confirmed, 10 pending

**Confirmed** (built from `vendor/facts.js`, the committed profile decks and their cited PDF pages, `collections/data.js`, the film manifests; the profile-based ones are worded "the profile lists..." because those PDFs are undated, latest milestone 2019):
`who.brand`, `who.since` (established 2007, per the profile), `who.mission`, `factories.where` (Askar, automated panel processing), `factories.machinery`, `factories.quality` (ISO 9001 listed), `products.range`, `products.collections` (36 finishes), `products.partners`, `products.warranty` (10 years), `markets.presence` (Bahrain, Saudi Arabia, Qatar per the profile), `track.milestones`, `tech.systems` (ERP, CAD, CAD+T), `tech.bonsai`, `visit.how`, `human.contact`.

**Pending: Haneen does NOT state these until you confirm them** (this is the owner checklist; tick, then edit the fact):

| Fact id | What the repo shows (never said by Haneen) | Where it comes from | Owner decides |
|---|---|---|---|
| `track.projects` | "more than 50,000 projects"; named developments (Marassi, Durrat, Water Bay, The Grand Tower, Hidd Heights, Dar Al Salam, Alsidra...) | film v2 script; closets-profile deck | the figure and its basis; which projects may be named to investors |
| `tech.patents` | "more than 27 patents" (aluminium profiles) | film v2 script | count, holder entity, jurisdictions |
| `factories.count` | "two factories" (film, campaign band) vs one workshop (home, about, profile) | `vendor/facts.js productionModel = null` | how many factories, where |
| `factories.capacity` | "over 70,000 kitchen units per year, single shift; 5000 sqm (2014)" | closets-profile deck (undated PDF) | today's capacity, area and date |
| `markets.distribution` | agreements across the Gulf, Iraq and Jordan | film v2 script | which markets, which may be named |
| `markets.showrooms` | "4 showrooms" (site) but none listed | `vendor/facts.js showroomCount = null` | how many, where |
| `who.origin` | "YAS Factory was born after the pandemic"; "first of its kind in Bahrain" | film v2 script | origin story; basis for "first of its kind" |
| `products.exclusive` | "exclusive designs and colours worldwide" | film v2 script | which designs, if any |
| `team.management` | two named managers with degrees (profile p. 5) | closets-profile deck | which names / titles Haneen may say |
| `invest.terms` | nothing exists (the investor stations were removed from the room at the owner's request) | VIP-ROOM-OWNER-INPUTS.md | whether and how investment information is shared, and who presents it |

Other owner items for this feature: **(a)** reconcile "established in 2007" with the site's "20 years of craft" (`vendor/facts.js yearsOfCraft = 20`); **(b)** supply the company profile PDF (then add its link to the contact card); **(c)** native review of every Arabic string (Haneen, the fact sheet, the investor decks, the Bloom strings); **(d)** the team names/photos for the "Team" slide (placeholder today); **(e)** the legal wording of the disclaimer (the existing VIP disclaimer is used on every deck).
The film's own claims are listed in `docs/showroom3d/JOURNEY-V2-FACTS.md` (branch `claude/web-journey-v2`); all of them are `needs-owner-confirmation` here.

## How to edit the fact sheet

* File: `src/showroom3d/investor/factsheet.js`, array `FACT_SHEET`. Fields: `id`, `topic`, `status`, `source` (where in the repo / which PDF page), and
  * confirmed: `text: { en, ar }` (both required), no `draft`;
  * pending: `draft: { en, ar }` (what the repo shows: for this checklist only, **never output**), `ask: { en, ar }` (the question for the owner), optional `kw` (words that identify a question about it, EN + AR).
* To confirm a pending fact: change `status` to `CONFIRMED`, replace `draft`/`ask`/`kw` with `text: { en, ar }` (wording like "The company states ..."; a figure needs its date or basis), bump `FACTSHEET_VERSION`, run the tests. Remove its words from the `PENDING_DIGITS` guard in `__tests__/investor.test.js` only when the figure is really confirmed.
* The tests (`__tests__/investor.test.js`) enforce: every fact has a source and both languages; pending facts have no `text`; every answer maps to fact ids that exist; no answer contains a pending figure, a financial word or a promise; unknown questions fall back to the chips + opt-in; reset clears the session; the AI opt-in is rate limited.

## How to review her answers

Open Bloom Meeting (`/yas-bloom?...`, Floor 2, the Haneen desk, or the floating button) and press each of the ten topic chips in English and Arabic. Each reply is only the sentences of the confirmed facts of that topic, plus the standing "no confirmed figure" line where a pending fact exists. Ask the hard questions (revenue, valuation, number of projects, patents, factories, "do you export to Iraq", "who is the CEO"): the answer must be the standing line. In the page, `data-facts` on each message lists the fact ids used.
