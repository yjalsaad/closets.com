/* "Download, then play" for the VIP films. Once somebody ENTERS the VIP room the films of the meeting are fetched in the background, one at a time, in agenda order, into a Blob
 * (progress is reported), kept in Cache Storage so a re-visit or a reload does not download them again, and the player plays them from an object URL.
 * The player never waits for this: Play before the download is finished streams from the network exactly as before.
 *
 * Rules: one download at a time, low priority; at most `maxBlobs` blobs held in memory (the rest stay in Cache Storage only); skipped on data saver and 2g;
 * only ONE film on 3g; nothing at all unless start() is called (the explorer calls it from the VIP room only); abort() cancels the running download;
 * dispose() aborts, revokes every object URL and drops every blob. Any failure (fetch blocked, not 200, short body, no Blob support) leaves that film on plain streaming.
 * PURE logic + browser APIs through injectable seams (fetcher, cacheApi, urlApi, connection): unit-tested with mocks, no DOM needed. */

export const CACHE_NAME = 'yas-film-v1';
export const PREFETCH_OFF = 'off';

/** ?vipprefetch=0 (also off / false / no) switches the pre-download off, for debugging */
export function prefetchEnabled(search) {
  let v = null; try { v = new URLSearchParams(search || '').get('vipprefetch'); } catch (e) { /* ignore */ }
  return !(v !== null && /^(0|off|false|no)$/i.test(v));
}
/** what the connection allows: { allow, max, reason }. saveData and 2g: nothing; 3g: the first film only; otherwise everything. deviceMemory <= 2 GB: a single blob in memory. */
export function connectionPolicy(conn, deviceMemory) {
  const c = conn || {}, et = String(c.effectiveType || '').toLowerCase(), mem = Number(deviceMemory);
  if (c.saveData) return { allow: false, max: 0, maxBlobs: 1, reason: 'save-data' };
  if (et === 'slow-2g' || et === '2g') return { allow: false, max: 0, maxBlobs: 1, reason: 'slow-network' };
  return { allow: true, max: et === '3g' ? 1 : Infinity, maxBlobs: mem > 0 && mem <= 2 ? 1 : 2, reason: '' };
}

const idleEntry = () => ({ status: 'idle', loaded: 0, total: 0, pct: 0 });

export class FilmPreloader {
  /** items are set with setPlan([{ id, src, bytes }]) in agenda order */
  constructor({ fetcher, cacheApi, urlApi, connection, deviceMemory, onChange = () => {}, startDelay = 1200, maxBlobs, enabled = true } = {}) {
    this.fetcher = fetcher !== undefined ? fetcher : (typeof fetch === 'function' ? (u, o) => fetch(u, o) : null);
    this.cacheApi = cacheApi !== undefined ? cacheApi : (typeof caches !== 'undefined' ? caches : null);
    this.urlApi = urlApi !== undefined ? urlApi : (typeof URL !== 'undefined' && URL.createObjectURL ? URL : null);
    this.policy = connectionPolicy(connection !== undefined ? connection : (typeof navigator !== 'undefined' ? navigator.connection : null), deviceMemory !== undefined ? deviceMemory : (typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined));
    this.maxBlobs = Math.max(1, maxBlobs || this.policy.maxBlobs); this.onChange = onChange; this.startDelay = startDelay; this.enabled = !!enabled;
    this.plan = []; this.entries = new Map(); this.blobs = new Map(); this.urls = new Map(); this.pinned = new Set(); this.played = new Set();   // blobs: src -> Blob (memory), urls: src -> object URL
    this.ctrl = null; this.running = false; this.started = false; this.disposed = false; this.timer = null; this.gen = 0; this.last = 0;
  }
  setPlan(items) {
    this.plan = (Array.isArray(items) ? items : []).filter((i) => i && i.src).map((i) => ({ id: i.id || i.src, src: i.src, bytes: Number(i.bytes) || 0 }));
    for (const p of this.plan) if (!this.entries.has(p.src)) this.entries.set(p.src, idleEntry());
    this.decide(); if (this.started) this.pump();
  }
  /** the state when the plan cannot run at all (data saver, 2g, switched off): every entry reads 'skipped' so the UI shows nothing */
  decide() { if (!this.enabled || !this.policy.allow) for (const [k, e] of this.entries) if (e.status === 'idle') this.entries.set(k, { ...e, status: 'skipped' }); }
  get skipped() { return !this.enabled || !this.policy.allow; }
  get(src) { return this.entries.get(src) || idleEntry(); }
  /** what the UI shows for a film: { state: 'off' | 'preparing' | 'ready', pct }. 'off' = not started, skipped (data saver, 2g, switched off, beyond the 3g limit) or failed (it simply streams). */
  view(src) {
    if (!this.started && !this.blobs.has(src) && this.get(src).status !== 'ready') return { state: 'off', pct: 0 }; if (this.skipped) return { state: 'off', pct: 0 };
    const e = this.get(src), i = this.plan.findIndex((p) => p.src === src);
    if (e.status === 'ready') return { state: 'ready', pct: 100 }; if (e.status === 'loading') return { state: 'preparing', pct: e.pct };
    if (e.status === 'idle' && i >= 0 && i < this.policy.max) return { state: 'preparing', pct: 0 }; return { state: 'off', pct: 0 };
  }
  /** the owner pressed Play while this film is still downloading: it streams now, so stop downloading it (two transfers would only slow the stream down); the queue goes on with the next film */
  skip(src) {
    const e = this.get(src); if (e.status === 'loading') { if (this.ctrl) { try { this.ctrl.abort(); } catch (x) { /* ignore */ } } } else if (e.status === 'idle') this.set(src, { status: 'failed' }, true);
  }
  /** the object URL of a film that is complete and in memory, else '' (the player then streams) */
  urlFor(src) {
    if (this.disposed || !this.blobs.has(src)) return ''; let u = this.urls.get(src);
    if (!u && this.urlApi) { try { u = this.urlApi.createObjectURL(this.blobs.get(src)); this.urls.set(src, u); } catch (e) { u = ''; } } return u || '';
  }
  /** the player is using this film (an element has its object URL): never evict it from memory */
  pin(src) { this.pinned.add(src); } unpin(src) { this.pinned.delete(src); }
  /** begin (after startDelay, so the room can settle first). Safe to call again. */
  start() {
    if (this.started || this.disposed) return; this.started = true; if (this.skipped) { this.decide(); this.emit(true); return; }
    if (this.startDelay > 0 && typeof setTimeout === 'function') this.timer = setTimeout(() => { this.timer = null; this.pump(); }, this.startDelay); else this.pump();
  }
  /** this film is wanted next (the owner picked it): move it to the front of the waiting queue */
  prioritise(src) { const i = this.plan.findIndex((p) => p.src === src); if (i > 0) { const [p] = this.plan.splice(i, 1); this.plan.unshift(p); } if (this.started && !this.timer) this.pump(); if (this.cachedOnly(src)) this.warm(src); }
  cachedOnly(src) { const e = this.entries.get(src); return !!e && e.status === 'ready' && !this.blobs.has(src); }
  /** a film that is only in Cache Storage (evicted from memory) is read back into a Blob so Play is instant */
  async warm(src) {
    if (this.blobs.has(src) || !this.cacheApi || this.disposed) return false; const b = await this.fromCache(src); if (!b || this.disposed) return false; this.played.delete(src); this.blobs.set(src, b); this.trimFor(src); this.emit(true); return true;
  }
  /** the player moved on from this film (it is no longer the active one): its blob may be dropped to make room */
  release(src) {
    this.pinned.delete(src); this.played.add(src);   // this film has been on the screen: its memory is the first to go
    if (!this.cacheApi && this.blobs.size >= this.maxBlobs && this.blobs.has(src) && this.next()) this.evict(src);   // no Cache Storage: this film's memory is what the next film needs
    this.trim(); if (this.started && !this.timer) this.pump();
  }
  evict(src) { this.blobs.delete(src); const u = this.urls.get(src); if (u) { try { this.urlApi && this.urlApi.revokeObjectURL(u); } catch (e) { /* ignore */ } this.urls.delete(src); } if (!this.cacheApi) this.entries.set(src, { ...idleEntry(), status: 'done' }); }
  /** cancel the running download (leaving the room). Finished films stay (memory + Cache Storage); a later start() resumes with what is missing. */
  abort() {
    this.gen++; if (this.timer) { clearTimeout(this.timer); this.timer = null; } if (this.ctrl) { try { this.ctrl.abort(); } catch (e) { /* ignore */ } this.ctrl = null; }
    for (const [k, e] of this.entries) if (e.status === 'loading' || e.status === 'queued') this.entries.set(k, idleEntry()); this.running = false; this.started = false; this.emit(true);
  }
  dispose() {
    this.abort(); this.disposed = true; for (const u of this.urls.values()) { try { this.urlApi && this.urlApi.revokeObjectURL(u); } catch (e) { /* ignore */ } }
    this.urls.clear(); this.blobs.clear(); this.pinned.clear(); this.onChange = () => {};
  }
  emit(force) { const t = Date.now(); if (!force && t - this.last < 200) return; this.last = t; try { this.onChange(this); } catch (e) { /* ignore */ } }
  set(src, patch, force) { const e = { ...(this.entries.get(src) || idleEntry()), ...patch }; e.pct = e.status === 'ready' ? 100 : e.total > 0 ? Math.min(99, Math.floor((e.loaded / e.total) * 100)) : 0; this.entries.set(src, e); this.emit(force); }
  /** keep at most maxBlobs in memory: the oldest ones that are not pinned go (their object URL is revoked); they stay in Cache Storage when there is one */
  hold(src, blob) { this.blobs.set(src, blob); this.trim(src); }
  trim(keep) {
    // over the cap: films that were already played go first; otherwise the NEWCOMER stays out of memory (it is in Cache Storage, and is read back when it is picked), so a later film
    // (the AI film downloads last) never pushes out a film that is about to be played.
    while (this.blobs.size > this.maxBlobs) {
      const keys = [...this.blobs.keys()], victim = keys.find((k) => k !== keep && this.played.has(k) && !this.pinned.has(k)) || (keep !== undefined && this.blobs.has(keep) && !this.pinned.has(keep) && this.cacheApi ? keep : keys.find((k) => this.played.has(k) && !this.pinned.has(k)));
      if (!victim) break; this.evict(victim);
    }
  }
  /** a film that was asked for (picked) comes into memory: make room by dropping a played film, or an unpinned one that is not the asked-for one */
  trimFor(want) {
    while (this.blobs.size > this.maxBlobs) { const keys = [...this.blobs.keys()], v = keys.find((k) => k !== want && this.played.has(k) && !this.pinned.has(k)) || keys.find((k) => k !== want && !this.pinned.has(k)); if (!v) break; this.evict(v); }
  }
  /** is there room for another download? (no Cache Storage: only while the memory cap is not reached; with it, finished films can leave memory) */
  hasRoom() { return !!this.cacheApi || this.blobs.size < this.maxBlobs; }
  next() {
    let n = 0; for (const p of this.plan) { if (n >= this.policy.max) return null; n++; const e = this.entries.get(p.src) || idleEntry(); if (e.status === 'idle') return p; if (e.status === 'loading') return null; }
    return null;
  }
  async fromCache(src) {
    try { const c = await this.cacheApi.open(CACHE_NAME), r = await c.match(src); if (!r) return null; const b = await r.blob(); const want = (this.plan.find((p) => p.src === src) || {}).bytes; return b && b.size > 0 && (!want || b.size === want) ? b : null; } catch (e) { return null; }
  }
  async pump() {
    if (this.running || this.disposed || !this.started || this.skipped) return; const p = this.next(); if (!p) return; if (!this.hasRoom()) return;
    this.running = true; const gen = this.gen;
    try { await this.load(p, gen); } catch (e) { /* load() never throws */ }
    if (gen !== this.gen || this.disposed) return; this.running = false; this.pump();
  }
  async load(p, gen) {
    const src = p.src, live = () => gen === this.gen && !this.disposed;
    this.set(src, { status: 'loading', loaded: 0, total: p.bytes }, true);
    const cached = this.cacheApi ? await this.fromCache(src) : null; if (!live()) return;
    if (cached) { this.hold(src, cached); this.set(src, { status: 'ready', loaded: cached.size, total: cached.size, from: 'cache' }, true); return; }
    if (!this.fetcher) { this.set(src, { status: 'failed' }, true); return; }
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null; this.ctrl = ctrl;
    try {
      const res = await this.fetcher(src, { credentials: 'same-origin', priority: 'low', signal: ctrl ? ctrl.signal : undefined }); if (!live()) return;
      if (!res || !res.ok || res.status !== 200) throw new Error('status ' + (res && res.status));   // a 206 / 404 / HTML fallback is never kept
      const type = (res.headers && res.headers.get && res.headers.get('content-type')) || 'video/mp4', total = Number((res.headers && res.headers.get && res.headers.get('content-length')) || p.bytes) || p.bytes;
      if (/text\/html/i.test(type)) throw new Error('not a video');
      let blob;
      if (res.body && res.body.getReader) {
        const rd = res.body.getReader(), parts = []; let got = 0;
        for (;;) { const { done, value } = await rd.read(); if (!live()) { try { rd.cancel(); } catch (e) { /* ignore */ } return; } if (done) break; parts.push(value); got += value.length; this.set(src, { status: 'loading', loaded: got, total }); }
        blob = new Blob(parts, { type: /^video\//i.test(type) ? type : 'video/mp4' });
      } else { blob = await res.blob(); if (!live()) return; }
      if (!blob || !blob.size || (total && blob.size !== total)) throw new Error('short or empty body');   // total = Content-Length, else the manifest size
      this.hold(src, blob); this.set(src, { status: 'ready', loaded: blob.size, total: blob.size, from: 'network' }, true);
      if (this.cacheApi) { try { const c = await this.cacheApi.open(CACHE_NAME); await c.put(src, new Response(blob, { status: 200, headers: { 'content-type': blob.type, 'content-length': String(blob.size) } })); await this.tidy(c); } catch (e) { /* quota / private mode: the blob in memory still works */ } }
    } catch (e) {
      if (!live()) return; this.set(src, { status: 'failed', loaded: 0 }, true);   // the player streams this one
    } finally { if (this.ctrl === ctrl) this.ctrl = null; }
  }
  /** drop cached films that are no longer part of the plan (a replaced or renamed file) */
  async tidy(cache) { try { const keep = new Set(this.plan.map((p) => p.src)), reqs = await cache.keys(); for (const r of reqs) { const path = (() => { try { return new URL(r.url, 'http://x').pathname; } catch (e) { return r.url; } })(); if (!keep.has(path) && !keep.has(r.url)) await cache.delete(r); } } catch (e) { /* ignore */ } }
}
