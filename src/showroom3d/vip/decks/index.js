/* Permanent decks: every deck exported here is loaded into the VIP room (in this order). To add one, commit a file next to this one and list it here
 * (docs/showroom3d/VIP-DECKS.md). A deck here is trusted: it is passed through sanitizeDeck() in the unit tests and must pass. */
import { DEFAULT_DECK } from './default';

export const PERMANENT_DECKS = [DEFAULT_DECK];
