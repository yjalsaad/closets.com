# Facts the site contradicts itself on (owner decides once)

Nothing below was picked by the redesign. All business facts now live in **`src/content/facts.js`**. A contested fact is `null` there, and the
redesigned UI shows nothing for it until you set a value. Confirmed facts (single value everywhere in the old source) are filled in.

## A. Contested (null = hidden until you decide)

| Fact (`FACTS.*`) | Values found in the old source | Where | What the redesign does now |
|---|---|---|---|
| `yearsOfCraft` | **15**, **19**, **20**, "two decades" | "15 years of craft" badge / marquee / footer chip (I18N `swBadge15`, `swMarq15`, `swFootBadge15`); home stat tile "19 yrs" (`<Stat to={19}>`); About stat default "20+" (`about.stat1.n`); Projects stat "20 Years of craft"; About hero copy "For two decades…" and origin copy "Two decades on…" | Home stat band removed; About stat/timeline shown only if the CMS supplies them; "two decades" copy neutralised; the three "15 years" strings are no longer rendered anywhere (dead keys remain in `App.js` I18N) |
| `homesDelivered` | **10K+** (home stat), **500+ Homes fitted** (About + About timeline "Passed 500 homes fitted"), **0+** (Projects stat, computed from the empty `website_projects` table) | `App.js` home stats (`swStatProjects`), `AboutPage.jsx`, `PortfolioPage.jsx` | Removed from home and Projects; About shows it only if the CMS supplies it |
| `productionModel` | "**Two factories in Bahrain**" (campaign business band `home.biz.w1`) vs "**our own workshop**" / "one workshop" / "Built in our own Bahrain workshop" | `campaign/HomeCampaign.jsx` (BusinessBand, no longer on the home page), `swStep3Desc`, `swBadgeWorkshop`, hero default subtitle, `sw2KpF1Desc` ("Manufactured in our own workshop", still on `/kitchen`), About origin copy ("a small Manama workshop"), Projects "Own workshop" stat | Home copy rewritten to say "made in Bahrain"; `/kitchen` string and About origin paragraph still mention a workshop (not changed: they are CMS-overridable prose). **Please decide the wording, then I will replace all of them from one key.** |
| `showroomCount` / `showroomAreas` | "**4 showrooms**" (home stat, About copy "four showrooms", timeline, appointment card), area names "**Manama · Riffa · Saar · Isa Town**" (Contact page) | `swStatShowrooms`, `swApptShowroomSub` ("one of our 4 showrooms"), `AboutPage.jsx`, `ContactPage.jsx` | While the Showrooms page's CMS table is empty it shows a designed "Come and see the work" panel (hours, phone, WhatsApp, Book) with **no** count and **no** names. Names are kept in `FACTS.showroomAreas` with `showroomAreasConfirmed:false`. |

## B. Needs details you have not given us

- Street address, hours and map for each showroom (none exists anywhere in the source). The only address is the registered address on the invoice (Hamala, P.O. Box 31613); it is **not** shown as a place to visit.
- Founding year / company timeline (About timeline years 2010-2024 were in the source but cannot be reconciled with the "years of craft" values above; hidden unless the CMS provides them).
- Warranty scope: "10 years on cabinetry and soft-close hardware" is consistent everywhere (`FACTS.warrantyYears = 10`), but worktop (2-15 yr) and finish (5-10 yr) terms vary by page; please supply the official terms for the Warranty page.
- WhatsApp number: only `wa.me/97317555095` exists (same as the phone). Confirm it is a WhatsApp line.
- Opening hours `Sat-Thu 9am-8pm` appears once (Contact); used everywhere now. Confirm.

## C. Confirmed (one value in the source, used via `facts.js`)

Phone `+973 17555095`, e-mail `info@the-closets.com`, Instagram `@theclosets`, hours `Sat-Thu 9am-8pm`, warranty `10 years`.
