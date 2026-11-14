/* The deck picker's state machine (pure): which deck, which slide. Decks are referred to by id; slides by index. Slides clamp (no wrap), decks cycle. */
export const DEFAULT_DECK_ID = 'default';
export const initDeckState = (ids = [DEFAULT_DECK_ID], deckId = DEFAULT_DECK_ID, slide = 0, counts = {}) => ({ ids: ids.slice(), deckId: ids.includes(deckId) ? deckId : ids[0], slide, counts: { ...counts } });
const count = (st, id = st.deckId) => Math.max(1, st.counts[id] || 1);
const clamp = (st, i) => Math.max(0, Math.min(count(st) - 1, Number.isInteger(i) ? i : 0));
/** actions: {type:'deck', id} | {type:'deckStep', dir} | {type:'slide', index} | {type:'step', dir} | {type:'decks', ids, counts} (the list changed: added / deleted) */
export function deckReducer(st, a) {
  switch (a.type) {
    case 'deck': return st.ids.includes(a.id) && a.id !== st.deckId ? { ...st, deckId: a.id, slide: 0 } : st;
    case 'deckStep': { if (st.ids.length < 2) return st; const i = st.ids.indexOf(st.deckId), n = st.ids.length; return { ...st, deckId: st.ids[(i + (a.dir > 0 ? 1 : -1) + n) % n], slide: 0 }; }
    case 'slide': { const s = clamp(st, a.index); return s === st.slide ? st : { ...st, slide: s }; }
    case 'step': { const s = clamp(st, st.slide + (a.dir > 0 ? 1 : a.dir < 0 ? -1 : 0)); return s === st.slide ? st : { ...st, slide: s }; }
    case 'decks': {
      const ids = a.ids.length ? a.ids.slice() : [DEFAULT_DECK_ID], next = { ...st, ids, counts: { ...a.counts } };
      if (!ids.includes(st.deckId)) { next.deckId = ids[0]; next.slide = 0; }   // the deck in view was deleted: back to the first (default) deck
      next.slide = clamp(next, next.slide); return next;
    }
    default: return st;
  }
}
