/* Decks saved ON THIS DEVICE ONLY (localStorage). No network, no backend. Every read / write is guarded: private windows, blocked storage and full quotas
 * give a clear result code instead of an exception. Stored decks are re-sanitised on load, so edited / corrupted storage can never reach the renderer. */
import { sanitizeDeck, LIMITS } from './deckSchema';

export const STORE_KEY = 'sr3d.vipDecks.v1';
export const MAX_USER_DECKS = 6;
export const MAX_STORED_CHARS = 400000;
export const ERR = { blocked: 'blocked', full: 'full', max: 'max', corrupt: 'corrupt' };

const defaultStorage = () => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch (e) { return null; } };

export function makeDeckStore(getStorage = defaultStorage) {
  const read = () => {
    let s; try { s = getStorage(); } catch (e) { s = null; } if (!s) return { decks: [], error: ERR.blocked };
    let txt; try { txt = s.getItem(STORE_KEY); } catch (e) { return { decks: [], error: ERR.blocked }; }
    if (!txt) return { decks: [], error: null };
    try {
      const j = JSON.parse(txt); const out = [], seen = new Set();
      (Array.isArray(j && j.decks) ? j.decks : []).slice(0, MAX_USER_DECKS).forEach((d) => { const r = sanitizeDeck(d); if (r.ok && !seen.has(r.deck.id)) { seen.add(r.deck.id); out.push(r.deck); } });
      return { decks: out, error: null };
    } catch (e) { return { decks: [], error: ERR.corrupt }; }
  };
  const write = (decks) => {
    let s; try { s = getStorage(); } catch (e) { s = null; } if (!s) return ERR.blocked;
    const txt = JSON.stringify({ v: 1, decks }); if (txt.length > MAX_STORED_CHARS) return ERR.full;
    try { s.setItem(STORE_KEY, txt); return null; } catch (e) { return /quota/i.test((e && (e.name + e.message)) || '') ? ERR.full : ERR.blocked; }
  };
  return {
    list: () => read().decks,
    load: read,
    /** -> { ok, decks, error, deck } ; a deck whose id exists gets a numbered id; more than MAX_USER_DECKS is refused */
    add(deck) {
      const cur = read(); if (cur.error === ERR.blocked) return { ok: false, error: ERR.blocked, decks: [] };
      if (cur.decks.length >= MAX_USER_DECKS) return { ok: false, error: ERR.max, decks: cur.decks };
      let id = deck.id, n = 2; while (cur.decks.some((d) => d.id === id)) id = deck.id.slice(0, LIMITS.maxId) + '-' + n++;
      const d = { ...deck, id }, next = [...cur.decks, d], err = write(next); if (err) return { ok: false, error: err, decks: cur.decks };
      return { ok: true, error: null, decks: next, deck: d };
    },
    remove(id) {
      const cur = read(); if (cur.error === ERR.blocked) return { ok: false, error: ERR.blocked, decks: [] };
      const next = cur.decks.filter((d) => d.id !== id), err = write(next); if (err) return { ok: false, error: err, decks: cur.decks };
      return { ok: true, error: null, decks: next };
    },
  };
}
