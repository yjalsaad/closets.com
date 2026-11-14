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

*(This describes the built-in investor deck, the default. The two profile decks added later, "The Closets - Company Profile" and "YAS Profile (2023)", are different: they carry statements and figures taken from the owner's own PDFs, each slide citing its page; they are listed in full in the next section for verification.)*

No figures, returns, valuation, equity amounts, ROI, projections or guarantees; no claim about years, homes delivered, production model or showroom count; no prices; no invented
contact details; no stock photos; no invented projects or project counts. The Hub screens are simplified procedural mock-ups, labelled "Illustrative", and show module names and counts only.

## Facts taken from the owner's PDFs (profile decks) - please verify

Source files (supplied by the owner, not in the repository): `THE_CLOSET_-_Company_Profile.pdf` (53 pages, undated; the latest milestone is 2019) and `YAS_PROFILE_PLUS_2023.pdf` (18 pages). "p." = PDF page index. Every slide in the room cites its page in its `source` line; the Arabic is a translation awaiting native review. Nothing was added from outside the PDFs.

### The Closets - Company Profile (22 slides + the closing notice)

| Slide | Statement or figure used | PDF page |
|---|---|---|
| Who we are | established in 2007; "one of the leading closets and kitchen furniture manufacturers in the Kingdom of Bahrain" (shown as "as the profile describes it"); **more than 200 employees**; headquarters and showrooms in Bahrain, Saudi Arabia and Qatar (**3 countries**); supplier and installer of modular closets and kitchen fittings | 2 |
| Vision and mission | vision and mission statements (wording condensed) | 3 |
| Our values (2 slides) | fresh creative designs; flexibility (models mixed and matched); eco-credentials ("eco-friendly materials and recycled wood"); leading the regional market; advanced machinery and automated panel processing; long-term client relationships; warranty (resolved from `facts.js`, currently **10 years**, which matches the profile's "Ten Years Warranty"); rigid carcass elements | 4 |
| Milestones (3 slides) | 2007 first showroom (Hamala); 2008 first factory 500 sqm; 2009 EGGER, SCHUCO, REHAU suppliers + Salmaniya showroom; 2010 Arad showroom; 2011 Sanad showroom; 2012 first Khobar (KSA) showroom; 2013 ISO 9001:2008 earned + Franke supplier; 2014 Kesseboehmer supplier (printed "kessbhomer") + factory opening **5000 sqm**; 2016 first Qatar showroom (Doha); 2017 second KSA showroom (Riyadh); 2018 more than 200 staff; 2019 Dubai Design District. There is no 2015 entry. | 20 |
| Management | Ali Alhaddad, Managing Director, and Yasser Fardan, Managing Partner, with the qualifications printed (BSc Mechanical Engineering and H.N.D.; BSc Banking and Finance, AGII). **Names and degrees of two individuals: confirm you want them shown.** Their portrait photos are NOT used. | 5 |
| Quality | ISO 9001:2015; ISO 9001:2008; BID Quality Award "Century International Gold Quality Era Control Certificate" (the award photo with people is NOT used) | 6 |
| Products at a glance, Closets and kitchens, Bedrooms and living | closets (custom, home and office storage), eight kitchen model names (Arkaan, Aseel, Dana, Maya, Rewaq, Jory, Sundos, Sahara, shown under the "Dilmonia Kitchens" brand on the pages), wooden floorings, bedrooms, pantries / TV units / living rooms | 7-15 |
| Factory and production, Capacity | factory in Askar; automated panel processing; in-house cut, edge, bore, assemble; doors made in-house or bought for specialist finishes; **capacity of over 70,000 kitchen units per year on a single shift**; factory **500 sqm** (2008) and **5000 sqm** (2014) | 16, 18, 20 |
| Machinery, Technology | SCHELLING FH4, HOMAG-BRANDT, SCM CNC, CPC packaging line, SCM automatic cabinet assembly clamps, SCM drilling machine CYFLEX HP; quality tests to international standards; ERP, CAD+T and CAD | 18-19 |
| Clients and developments (2 slides) | Bin Faqeeh (Water Bay, The Grand Tower, Hidd Heights, Dar Al Salam); Eagle Hills (Marrasi Residences, Shoreline, Boulevard); Ministry of Housing (East Hidd village); Marina Reef Project, ACS (**73 kitchen cabinets, 145 granite worktops**); AlGosaibi Real Estate (**300 villas**); Yateem Real Estate (**18 villas**); Capital Plus Tower (**25 stories**); Classic Hotel (**19 stories**); Ministry of Information, GPIC, KFH head office; Impact Interiors and United Arab Construction (closets for all their projects). **Client names are the profile's; confirm they may be shown publicly.** The page also lists others not on the slides (F and C Designs, Ceberco, Breeze Building, S Plaza, Al Kubrah, Alkhupra, Danial Garden, Alhilal, BNH, Mazda showroom, Al Sidra Development, The Storm, The Home). | 21 |
| Durrat Marina, Dar Al Salam | 360 Durrat Marina: 14 stories of one and two bedroom sea-view apartments; Dar Al Salam, Reef Island: 8 stories, **56 units**, fully provided with custom closets | 22, 27 |
| The Grand Tower, Hidd Heights | The Grand Tower, Seef: all closets provided and assembled; Hidd Heights: **13-storey** building, studios, 1 and 2 bedrooms | 29, 37 |
| The Homes, Alsidra | The Homes, Hamala: **20** villas (4 and 5 bedrooms); Alsidra, Diyar Al Muharraq: **over 450 villas**, 2 to 5 bedrooms | 33, 47 |

### YAS Profile (2023) (12 slides + the closing notice)

| Slide | Statement used | PDF page |
|---|---|---|
| Introduction | innovative leader in surfaces and solutions (the profile's own words); faced panels, laminates, edges; **since 2007**; subsidiary of YAS Holding; sister company of The Closets | 2 |
| Mission and vision | mission and vision (condensed) | 3 |
| The product | wood-based faced panels covered with decorative papers, foil, PP or PET; versatile, easy to install, customizable; kitchens, commercial and residential | 4 |
| Partners | Interprint Impress and Schattdecor; the page shows partner certificates and a formaldehyde-free mark. **The certificates are the partners', not YAS Wood's: confirm which, if any, apply to YAS Wood products before relying on that line.** | 5 |
| Gallery (3 slides) | decor names Fribourg Oak, Agostino Oak, Abisko Ash, Montello, Lucenta, Celestine Oak with their photos | 7-12 |
| A glance at the variety (4 slides) | 16 decor codes and names (e.g. 32376 Mauvella Oak, 71139 Soho ... 60155 Infinity Brown) | 14-17 |

### Figures shown on the big screen as counted-up numbers
200+ employees (p. 2); 3 countries (p. 2); 70,000 kitchen units per year on a single shift (pp. 16, 18); 5000 sqm factory (p. 20). All are the profile's statements, not audited figures.

### Needs the owner's confirmation or looks dated
* The Closets profile is **undated**; its last milestone is 2019 and its showroom list is as of then (page 52 also lists Dubai, while page 2 names only Bahrain, Saudi Arabia and Qatar). Confirm what is still true: employee count, showrooms, capacity, certificates (ISO 9001:2008 is a superseded edition; ISO 9001:2015 is also listed).
* "Established 2007" and "since 2007" agree with each other; the existing site facts for years of craft, homes delivered, production model and showroom count stay **placeholders** (`facts.js` is not changed by this work).
* The profile says the company uses "100% recycled wood and eco-friendly materials". The room deliberately says only "eco-friendly materials and recycled wood": add the percentage only if management can substantiate it.
* Product-quality and leadership wording ("one of the leading...") is the profile's self-description and is shown as such.
* The YAS photos are the lifestyle / decor photos of the YAS profile (they may be licensed stock or supplier imagery). Confirm you may show them. A photo of people (a family) in the YAS PDF and the staff / award photos in the Closets PDF are NOT used.

### Deliberately NOT used (listed so nothing is lost silently)
* Phone and fax numbers of the offices (p. 52): not repeated (the showroom already shows the company phone from `facts.js`).
* The development value quoted for Bahrain Bay ("$2.5 billion", p. 42) and the Water Bay site text: a third party's figure, not repeated (it would read as a financial figure).
* The "100% recycled wood" percentage (p. 4), the "most competitive rates" and "economies of scale" pricing claims (p. 17) and the "first of its kind" claim for Alsidra (p. 47).
* QR codes, the YAS gallery of partner certificate images, all portraits.

### Exports for the Bonsai Hub
`docs/showroom3d/decks/closets-profile.json` and `yas-profile.json` are the two decks in the exact deck schema (images as absolute `https://www.the-closets.com/yas-bloom/profile/...` addresses: the files must be deployed there first). They use the `stat` block and the `layout` field added to the schema (see `VIP-DECKS.md`); a Hub importer that predates them should be updated to the same `deckSchema.js`.
