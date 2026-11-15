# Bloom Meeting: pre-meeting checklist (iPad, venue wifi)

Written for the Monday 16 November morning meeting. Everything below was checked in headless Chromium; **no real iPad was available**, so the iPad steps are the expected behaviour, not a measurement. Do the full rehearsal on the actual iPad.

## 15 minutes before

1. **Arrive 15 minutes early** and join the venue wifi. Open `https://<site>/yas-bloom` in a **normal Safari tab** (not Private Browsing: the showroom keeps its downloads in Cache Storage, which Private mode empties; not a Home Screen app either). Keep the iPad plugged in; set Auto-Lock to Never (Settings > Display) for the meeting.
2. Wait for the pill **"Showroom downloaded"** (bottom of the screen). It downloads the whole showroom once; after that a reload does not download it again.
3. **Meeting mode** (the quick start): open `https://<site>/yas-bloom?meeting=1`, or in the Departments sheet choose **"Meeting mode: open Bloom Meeting"**. It skips the intro, takes the glass lift to Floor 2 and glides to the lobby view. The new film starts downloading **during the lift ride** (the iPad gets the 720p file, 12.2 MiB).
4. In the lobby, wait for the top-left pill to say **"Film ready"** (it shows "Preparing film... N%" until then). In the boardroom, press **E / Interact** at the video wall: the panel then says **"Ready: starts instantly"**. Press **Play film** once to confirm sound, then pause and seek back to 0:00.
5. **Language**: the EN / AR switch in the Haneen panel (and the page language) sets the captions: English page = English captions, Arabic page = Arabic captions. **CC** turns captions on / off; **EN** / **العربية** switch the caption language. Captions are ON by default.
6. Set the iPad volume, and the **ringer / silent switch**: the film has sound.
7. **Haneen AI**: open the desk (E at the lobby desk or the "Ask Haneen AI" button), tap one chip, then **Reset session**. Do this **between visitors** too: it clears the chat, the meeting form, presenter mode and read-aloud. Nothing a visitor types is stored; reset is only a courtesy for the next person on screen.
8. Leave the iPad on the lobby view with the screen at full brightness.

## Which film is on (v2 or v3)

The film on the wall is the **active** Journey film: the row `bloom.film.active` in `website_content` (`v2` | `v3` | `v3-animated`; no row = v3). Check it before the meeting: open `/yas-bloom?meeting=1` and read the label on the wall poster ("Real photographs ..." = v2, "... camera motion only ... AI-generated office" = v3). To test the other one without touching the row, add `&film=v2` or `&film=v3` to the URL. How to switch: `docs/bloom-meeting.md`, "How the owner switches the film".

## What Haneen will and will not say

She answers only from the confirmed fact sheet (`docs/bloom-meeting-haneen.md`). For any figure the owner has not confirmed (projects, patents, number of factories, capacity, Iraq / Jordan, origin story, team names, financials, valuation, funding, returns) she says *"I don't have a confirmed figure for that; I'll connect you with the team."* and offers **Request a meeting with the team**. If you want any of those facts spoken, confirm them in the fact sheet first (a code change + the tests).

## If the wifi fails

| Situation | What still works | What does not |
|---|---|---|
| Showroom was fully downloaded (pill said "Showroom downloaded"), wifi drops | the showroom, Floor 2, the lift, Haneen (offline answers), the VIP decks, the **film if the pill said "Film ready"** (it plays from memory / Cache Storage) | the opt-in AI question to Haneen, the meeting-request links (they open Mail / WhatsApp, which need a connection to send) |
| Wifi drops before "Film ready" | the room and everything above; the film **streams** and may stall | the film from a cold cache |
| Reload while offline | Safari reloads the page only if it is in its page cache; the cached showroom files are used if the page itself loads | a cold start without any connection |
| Plan B | Phone hotspot as a second network (iPad > Settings > Wifi); or play the film from the phone (`/yas-bloom/film/journey3-720.mp4` or `journey2-720.mp4` are plain files, whichever version is active) | |

Always have the company contact card ready (phone and email are in the Haneen panel under "Request a meeting with the team").

## Known limits (be honest with the room)

* The two **real leader photographs** are inside the film only; the film's label says so. All other imagery is AI illustration, and the film's figures (50,000+ projects, 27+ patents, two factories, Iraq and Jordan) are the owner's script and are **not** confirmed in the system: Haneen will not repeat them.
* The Ops and Leads walls are **illustrative sample data**, labelled on the wall.
* First Floor 2 visit builds large canvas panels: allow a second or two on an iPad.
