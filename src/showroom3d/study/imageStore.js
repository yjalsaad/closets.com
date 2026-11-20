/* Study images, kept ON THIS DEVICE ONLY. IndexedDB holds the (already downscaled) Blobs: localStorage's ~5 MB cannot hold photos, and the VIP deck
 * store (localStorage, vip/deckStore.js) is kept for the small text documents. Nothing is uploaded: the website has no backend for this.
 * Every call is guarded: where IndexedDB is blocked (private window, site data blocked) a session-only in-memory map is used and `persistent` is false,
 * so the page says so instead of pretending the image is saved. The factory takes an adapter so tests run without a browser. */
export const DB_NAME = 'sr3d.yasWoodStudy', DB_VERSION = 1, STORE = 'images';
export const MAX_IMAGES = 40;

function idbAdapter(idb) {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, no) => {
    let rq; try { rq = idb.open(DB_NAME, DB_VERSION); } catch (e) { no(e); return; }
    rq.onupgradeneeded = () => { try { rq.result.createObjectStore(STORE); } catch (e) { /* exists */ } };
    rq.onsuccess = () => ok(rq.result); rq.onerror = () => no(rq.error || new Error('idb')); rq.onblocked = () => no(new Error('blocked'));
  }));
  const run = (mode, fn) => open().then((db) => new Promise((ok, no) => { const tx = db.transaction(STORE, mode); const st = tx.objectStore(STORE); const rq = fn(st); tx.oncomplete = () => ok(rq && rq.result); tx.onerror = () => no(tx.error); tx.onabort = () => no(tx.error || new Error('abort')); }));
  return {
    get: (id) => run('readonly', (s) => s.get(id)), put: (id, v) => run('readwrite', (s) => s.put(v, id)), del: (id) => run('readwrite', (s) => s.delete(id)),
    keys: () => run('readonly', (s) => s.getAllKeys()), clear: () => run('readwrite', (s) => s.clear()),
  };
}
function memAdapter() {
  const m = new Map();
  return { get: async (id) => m.get(id), put: async (id, v) => { m.set(id, v); }, del: async (id) => { m.delete(id); }, keys: async () => [...m.keys()], clear: async () => { m.clear(); } };
}
export function makeImageStore({ idb } = {}) {
  let real = null; try { const f = idb !== undefined ? idb : (typeof indexedDB !== 'undefined' ? indexedDB : null); if (f) real = idbAdapter(f); } catch (e) { real = null; }
  const mem = memAdapter(); let a = real || mem, persistent = !!real;
  const guard = async (fn, fb) => { try { return await fn(a); } catch (e) { if (a !== mem) { a = mem; persistent = false; try { return await fn(a); } catch (e2) { return fb; } } return fb; } };
  return {
    get persistent() { return persistent; },
    /** -> { ok, error?: 'max' } ; blob = { blob: Blob, w, h } */
    async put(id, rec) { const ids = await guard((x) => x.keys(), []); if (!ids.includes(id) && ids.length >= MAX_IMAGES) return { ok: false, error: 'max' }; const r = await guard(async (x) => { await x.put(id, rec); return true; }, false); return r ? { ok: true } : { ok: false, error: 'blocked' }; },
    get: (id) => guard((x) => x.get(id), undefined),
    remove: (id) => guard(async (x) => { await x.del(id); return true; }, false),
    ids: () => guard((x) => x.keys(), []),
    clear: () => guard(async (x) => { await x.clear(); return true; }, false),
  };
}
export const imageStore = makeImageStore();
