/* Permanent decks: every deck listed here is loaded into the VIP room (in this order). To add one, commit a file next to this one and list it in EXTRA_DECKS
 * (docs/showroom3d/VIP-DECKS.md). The disclaimer slide is appended to any deck that lacks it, so a committed deck cannot forget it. */
import { DEFAULT_DECK } from './default';
import { withDisclaimer } from '../deckSchema';

export const EXTRA_DECKS = [];
export const PERMANENT_DECKS = [DEFAULT_DECK, ...EXTRA_DECKS].map(withDisclaimer);
