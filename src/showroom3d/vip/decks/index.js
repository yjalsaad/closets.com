/* Permanent decks: every deck listed here is loaded into the VIP room (in this order). To add one, commit a file next to this one and list it in EXTRA_DECKS
 * (docs/showroom3d/VIP-DECKS.md). The disclaimer slide is appended to any deck that lacks it, so a committed deck cannot forget it. */
import { DEFAULT_DECK } from './default';
import { CLOSETS_PROFILE_DECK } from './closets-profile';
import { YAS_PROFILE_DECK } from './yas-profile';
import { FILM_DECK } from '../film';
import { MEETING_DECK } from '../meeting';
import { withDisclaimer } from '../deckSchema';

export const EXTRA_DECKS = [CLOSETS_PROFILE_DECK, YAS_PROFILE_DECK, FILM_DECK];   // the film is a one-slide pseudo-deck (vip/film.js)
/** picker order: the Management meeting FIRST (the primary section: the owner's two real films and the agenda), then the company presentation, the profile decks, and the AI documentary last */
export const PERMANENT_DECKS = [MEETING_DECK, DEFAULT_DECK, ...EXTRA_DECKS].map(withDisclaimer);
