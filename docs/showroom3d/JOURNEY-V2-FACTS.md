# Film v2: facts to confirm before the film is shown

Film v2 ("THE CLOSETS: The Journey of Ambition", from the owner's new Arabic script) states figures and claims that **differ from what the rest of the repo says** (the VIP decks, the site, the first film). The script was used as written and nothing was changed to match the repo. This list is for the owner: every claim, where it is said or shown, what else in the repo says something different, and a column to tick.

"Script line" is the line number in `scripts/showroom3d-film/journey2_script.py` (`LINES`, 1 to 34, the same order as the owner's text). "On screen" is text typeset by the film itself (the narration is only heard; the Arabic captions repeat it).

## Figures typeset on screen: one constant each

In `scripts/showroom3d-film/build_film2.py`:

```
PROJECTS_COUNT = 50000     # the "50,000+" reveal (script line 7: "more than fifty thousand projects")
PATENTS_COUNT = 27         # the "27+" reveal (script line 22: "more than twenty-seven patents")
```

If the owner changes a figure, change the constant **and** the narration (a new voice read) and the caption line; the constants only drive the numbers on screen. (The count-up and the "+" are built from the constant.)

## The claims

| # | Claim in the film | Script line | On screen | What else in the repo says (conflict) | Owner confirms Y/N |
|---|---|---|---|---|---|
| 1 | Started "from a small woodworking workshop in Bahrain" | 3 | none | `src/showroom3d/vendor/facts.js` `productionModel`: the site says both "two factories in Bahrain" (campaign band) and "our own workshop / one workshop" (home, about). The Closets profile (VIP deck): first showroom 2007 (Hamala), first factory 2008, 500 sqm | |
| 2 | "Two integrated factories, equipped with the latest European machinery and technologies" | 6 | none | Consistent with the campaign band ("Two factories in Bahrain") and the first film. The Closets profile lists one factory in Askar (500 sqm in 2008, 5,000 sqm in 2014) and machinery SCHELLING, HOMAG-BRANDT, SCM (European). The number of factories is open in `VIP-ROOM-OWNER-INPUTS.md` | |
| 3 | "More than fifty thousand projects" | 7 | **"MORE THAN 50,000+ PROJECTS COMPLETED"** (the "+" lands on the number; "مشروع") | First film: "more than 10,000 projects" (on screen). Site: "10K+" (home stat), "500+ Homes fitted" (about), "0+" (computed); `facts.js` `homesDelivered: null`. Five times the first film's figure | |
| 4 | Work "extended to the Gulf countries, Iraq and Jordan" | 7 | the map (see 8) | First film and the Closets profile: Bahrain, Saudi Arabia, Qatar (3 countries; Dubai Design District 2019). Iraq and Jordan appear nowhere else in the repo | |
| 5 | Prominent projects: "Marassi Al Bahrain, Durrat Al Bahrain, Water Bay and many government housing projects" | 8 | none (names are only heard and captioned; the pictures are generic AI illustration, see below) | The Closets profile deck names Water Bay (Bin Faqeeh), "360 Durrat Marina" (Durrat Al Bahrain), "Marrasi Residences" (Eagle Hills; spelled differently from "Marassi Al Bahrain") and Ministry of Housing (East Hidd village). **Permission to name them is not recorded.** The deck itself says "Client names are the profile's; confirm" | |
| 6 | The pandemic disrupted supply chains, which led to building the factory in Bahrain ("Yas Factory was born") | 11 to 15 | **"YAS FACTORY / مصنع ياس"** (name only) | The YAS Wood profile (VIP deck): "since 2007", "subsidiary of YAS Holding, sister company of The Closets". The script dates the birth of the factory after the pandemic; the profile dates YAS to 2007. Confirm what was founded when (company, factory, panel line) | |
| 7 | "The first of its kind in Bahrain for producing and cladding wood panels" | 16 | none | A "first of its kind" claim was deliberately **not used** for Alsidra in the VIP deck (`VIP-ROOM-OWNER-INPUTS.md`). A superlative needs a basis | |
| 8 | "Distribution agreements covering all the Gulf countries, plus Iraq and Jordan" | 19 | **a schematic map** labelling Bahrain, Saudi Arabia, Qatar, United Arab Emirates, Kuwait, Oman, Iraq, Jordan (the six Gulf states are the six GCC members) | Nothing in the repo mentions distribution agreements or Kuwait, Oman, Iraq, Jordan. The map is schematic (dots at true positions, no coastlines) and says so | |
| 9 | "Exclusive designs and colours worldwide" | 20 | none (a generic swatch fan) | The YAS Wood profile's decors come from partners (Interprint, Schattdecor); the deck asks to confirm which partner marks apply. "Exclusive worldwide" is not supported there | |
| 10 | "More than twenty-seven patents for aluminium profiles, designed and developed by our team" | 22 | **"MORE THAN 27+ ALUMINIUM PROFILE PATENTS"** (and "براءة اختراع لبروفايلات الألمنيوم") | Patents are mentioned nowhere in the repo. The Closets profile lists SCHUCO and REHAU as suppliers (2009), which are aluminium system names. The pictures are generic profiles, **not** the patented designs | |
| 11 | New deals, agreements and partnerships | 24 | none | Unspecified; nothing in the repo | |
| 12 | A digital system "connected to production, inventory, sales and supply chains" | 25 | **"ONE DIGITAL SYSTEM"** with four nodes: production, inventory, sales, supply chains | Consistent with "ERP, CAD+T, CAD" (Closets profile p. 19) and the first film's digital chapter. Words in the first film differed ("integrated") | |
| 13 | "High production capacity", "exports to the world's markets" | 30 | none | The Closets profile: "over 70,000 kitchen units per year on a single shift" (a Closets figure; the script gives no number, none is shown) | |
| 14 | An invitation to invest in the factory and a "strategic partnership ... with a clear plan and measurable goals" | 29 to 31 | none, plus the disclaimer on the end card | Investment solicitation: the end card carries the same disclaimer the VIP decks use ("Information only, not an offer or financial advice; details provided directly by management"). Whether the wording is enough is a legal question for the owner | |

## The two leaders

Two real photographs of company leaders appear (4 scenes: the diptych twice, then each alone, with slow camera motion). The owner stated in chat on 15 November 2026 that the two people agreed ("Company leaders, both agreed"). Names and titles were **not** supplied and are not shown; the film has a documented empty lower-third slot (`LOWER_THIRD` in `build_film2.py`). No AI touched the photographs. Open: the owner should confirm (a) written consent is on file, (b) that the film may be shown to the VIP-room audience, (c) the bystander partly visible at the left edge of photo 2 (a bald head and a dark shoulder on the right): the photo is shown uncropped there, crop the frame if the person has not agreed.

## Landmarks used (AI-generated illustration, not photographs)

Added at the owner's request ("use also land mark from Bahrain"). Every frame was compared with the real landmark; frames that were not recognisable were rejected. **No landmark is named on screen** (the narration only names the three projects); the only text near them is none. The Pearl Monument is not shown. The Bahrain flag is not shown.

| Frame | Landmark | What the real landmark looks like (the prompt's key features) | Result | Used where |
|---|---|---|---|---|
| `lm_bwtc` | Bahrain World Trade Center | two identical sail-shaped triangular towers, three bridges, a wind turbine on each | accepted, 8/10 (turbine blades small and slightly tilted) | 143.8 s, 179.9 s |
| `lm_bluehour` | Bahrain World Trade Center and the Manama skyline | same, plus generic towers | accepted, 7.5/10 (the towers look glassier than the real cream cladding; the twisted tower on the left is not a real one) | 41.8 s |
| `lm_dawn` + `v6_dawn` (video) | BWTC and a dhow | same, in a dawn bay | accepted, 8/10; in the moving shot the sails read slightly more curved | 6.6 s, 191.4 s |
| `lm_causeway` + `v5_causeway` (video) | King Fahd Causeway | straight multi-lane bridge over shallow sea, the middle island with border buildings and the tower with the round observation platform | accepted, 8/10 | 94.9 s, 201.0 s |
| `lm_fort` | Qal'at al-Bahrain | square sand-coloured fort on a tell by the sea, corner towers, palm grove | plausible, 6.5/10; less certain; unnamed | 68.9 s |
| `lm_tree` | Tree of Life | a single old mesquite alone on a small sandy rise in flat desert | accepted, 8/10; unnamed | 71.1 s |
| `lm_durrat` | "in the style of" Durrat Al Bahrain | crescent islands and a fish-shaped island | generic illustration; **not claimed to be the project**; unnamed | 47.2 s |
| `lm_fateh` | Al Fateh Grand Mosque | one very large low dome and two slender minarets | **rejected and not used**: reads as a generic mosque, not clearly this one; dropped rather than risk misrepresenting a place of worship | none |
| (not generated) | Bab Al Bahrain, Bahrain Financial Harbour as the subject, the Bahrain International Circuit tower, Arad Fort, pearl-diving | | skipped: cost against the risk of a wrong building; a model that cannot draw the Al Fateh mosque convincingly will not draw these either | none |

The three named projects (Marassi, Durrat, Water Bay) and the government housing are shown with **generic** AI waterfront and housing imagery (`n_marassi`, `lm_durrat`, `n_waterbay`, `n_housing`). They are not those projects. No project logo or real photograph is used.

## Honest-labelling facts

* On screen, on the end card: "Real photographs of company leaders; all other imagery is AI-generated illustration." and the Arabic equivalent; the disclaimer (the repo's own `DISCLAIMER` wording); "Narration: synthetic voice. Music: generated."
* On the leaders' scenes: a small badge "REAL PHOTOGRAPH / صورة حقيقية".
* Not verified by anyone: the Arabic narration has been checked only by speech recognition (it matches the script); a native speaker must listen.
