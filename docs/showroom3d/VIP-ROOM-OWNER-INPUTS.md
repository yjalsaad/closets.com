# VIP meeting room: what management must supply

The VIP meeting room (investor / partner boardroom) is built and works, but it contains **no company claims that the site itself contradicts and no financial
information**. Everything below is shown in the room as a clearly marked placeholder ("To be confirmed by management" / "يؤكَّد من الإدارة") until it is supplied.
The room reads confirmed values from `src/content/facts.js` automatically: set the value there (it is currently `null`) and the placeholder is replaced on the
Story station; no showroom code change is needed for those four facts.

| Key | What is needed | Where it appears | How to supply |
|---|---|---|---|
| `yearsOfCraft` | one agreed number of years (the site says 15, 19, 20 and "two decades") | Story station tile | `FACTS.yearsOfCraft` in `src/content/facts.js` as `{ en, ar }` |
| `homesDelivered` | one agreed figure with its basis (the site says "10K+", "500+" and "0+") | Story station tile | `FACTS.homesDelivered` |
| `productionModel` | "two factories" or "our own workshop" (the site says both) | Story station tile | `FACTS.productionModel` |
| `showroomCount` | how many showrooms are open, with the list (the site says 4 and lists none) | Story station tile | `FACTS.showroomCount` |
| `investorInfoPack` | the information pack management is willing to share with an investor after a briefing (document, format, who sends it) | Station 5 list, process step 2 | decision + the file; the room only names it, it does not host it |
| `fundingSought` | whether and how management wants to describe what it is seeking, **or** that it will only be discussed in person | Station 5 list | wording approved by management and legal |
| `financials` | which financial statements may be shown, to whom and when (nothing is shown today) | Station 5 list | decision; nothing financial is ever drawn in the room unless approved |
| `briefingContact` | the named management contact (or mailbox / number) for investor briefings. Today the CTA goes to the existing booking page and the existing company phone number and hours from `facts.js`; no new contact detail was invented | Station 5 | a contact record in `facts.js` |
| `confirmHubFigures` | confirm the Hub numbers shown: 13 department groups and their module counts, "469 modules" in the generated module map (it includes 45 archived modules). They come from `DASHBOARD-MODULE-MAP.generated.md` in the Hub repository (generated 5 Nov 2026) and will drift as the Hub changes | Hub station | confirm, or regenerate the map and update `HUB_DEPARTMENTS` in `src/showroom3d/products/vipContent.js` |
| `projectsData` | real project records with a cover image in `website_projects` (the gallery wall shows exactly what the Projects page shows; with no rows it says "Projects are shown on our Projects page") | Projects station + gallery wall | add rows in the Hub / CMS (active, with `cover_url`); nothing to do in code |
| `arabicReview` | native review of every Arabic string of this room | all stations | review `src/showroom3d/products/vipContent.js` and `src/showroom3d/strings.js` |
| `legalDisclaimer` | the final legal wording of the disclaimer. Current neutral text: "Information only, not an offer or financial advice; details provided directly by management." | Stations 4 and 5, the screen and the panel | approved text for `DISCLAIMER` in `vipContent.js` |

## The booking hand-off (please read)

"Request a private investor briefing" opens the **existing** `/booking` page (`/ar/booking` in Arabic) with `?interest=investor-briefing&source=showroom-3d-vip&notes=...`.
The booking form has no "investor" option, so the page maps that interest to its existing **Other** option and pre-fills the notes box with
"Request for a private investor briefing (from the virtual showroom). Information only: nothing has been shared or agreed." The visitor reviews and submits the form themselves;
the showroom writes nothing to the backend and collects no data. Decide whether investor enquiries should reach a different person from customer bookings; that routing is
outside the showroom (it is the booking form's recipient). The form also asks for an appointment type that defaults to "Design Consultation"; a dedicated investor option on the form is a small follow-up.

## What the room deliberately does not contain

No figures, returns, valuation, equity amounts, ROI, projections or guarantees; no claim about years, homes delivered, production model or showroom count; no prices; no invented
contact details; no stock photos; no invented projects or project counts. The Hub screens are simplified procedural mock-ups, labelled "Illustrative", and show module names and counts only.
