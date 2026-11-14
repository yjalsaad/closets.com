/* Permanent decks: every deck listed here is loaded into the VIP room (in this order). To add one, commit a file next to this one and list it in EXTRA_DECKS
 * (docs/showroom3d/VIP-DECKS.md). The disclaimer slide is appended to any deck that lacks it, so a committed deck cannot forget it. */
import { DEFAULT_DECK } from './default';
import { CLOSETS_PROFILE_DECK } from './closets-profile';
import { YAS_PROFILE_DECK } from './yas-profile';
import { FILM_DECK } from '../film';
import { withDisclaimer } from '../deckSchema';

export const EXTRA_DECKS = [CLOSETS_PROFILE_DECK, YAS_PROFILE_DECK, FILM_DECK];   // the film is a one-slide pseudo-deck (vip/film.js)
export const PERMANENT_DECKS = [DEFAULT_DECK, ...EXTRA_DECKS].map(withDisclaimer);
