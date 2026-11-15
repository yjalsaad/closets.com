/* Permanent decks: every deck listed here is loaded into the VIP room (in this order). To add one, commit a file next to this one and list it in EXTRA_DECKS
 * (docs/showroom3d/VIP-DECKS.md). The disclaimer slide is appended to any deck that lacks it, so a committed deck cannot forget it. */
import { DEFAULT_DECK } from './default';
import { CLOSETS_PROFILE_DECK } from './closets-profile';
import { YAS_PROFILE_DECK } from './yas-profile';
import { FILM_DECK } from '../film';
import { MEETING_DECK } from '../meeting';
import { withDisclaimer } from '../deckSchema';
import { WELCOME_DECK_SLIDE } from '../welcome';

export const EXTRA_DECKS = [CLOSETS_PROFILE_DECK, YAS_PROFILE_DECK, FILM_DECK];   // the film is a one-slide pseudo-deck (vip/film.js)
/** the company presentation as shown in the room: the Welcome slide first (a lead-in, not a station: `preface` tells the panel not to count it), then the four stations of DEFAULT_DECK (which stays the golden source of the stations) */
export const COMPANY_DECK = { ...DEFAULT_DECK, preface: 1, slides: [WELCOME_DECK_SLIDE, ...DEFAULT_DECK.slides] };
/** picker order: the Management meeting FIRST (the primary section: the owner's two real films and the agenda), then the company presentation, the profile decks, and the AI documentary last */
export const PERMANENT_DECKS = [MEETING_DECK, COMPANY_DECK, ...EXTRA_DECKS].map(withDisclaimer);
