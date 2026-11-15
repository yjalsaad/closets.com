/* "Download the whole showroom first". The showroom's static files (textures + HDRI, staff portraits, collections swatches, design-studio posters, VIP deck photos, film posters: about 5 MB in all,
 * listed with sizes and content hashes in manifest.json) are fetched in priority order into Cache Storage, and the loaders ask THIS store for their files instead of the network:
 *   memory (a Blob already held) -> Cache Storage (a re-visit or reload: zero network, no revalidation round trip) -> the network (stored on the way in).
 * A loader that asks for a file the preload has not reached yet simply promotes it (the same download, never two). Anything wrong (blocked fetch, short body, quota) hands the loader its plain URL back,
 * so the showroom behaves exactly as it did before. The VIP film videos are NOT part of this: vip/filmPreload.js keeps them (its own cache, its own rules).
 *
 * Cache Storage name = 'yas-bloom-assets-' + the manifest version (a hash of every file's size + content hash): any changed file makes a new cache and every older version is deleted.
 * Skips: ?bloomprefetch=0, Save-Data, 2g / slow-2g (nothing: the store is inactive and every loader uses its plain URL); 3g and deviceMemory <= 2 GB: core only (hall + rooms).
 * PURE logic + browser APIs through injectable seams (manifest, fetcher, cacheApi, urlApi): unit-tested with mocks. Lives in the lazy showroom3d chunk: nothing outside /yas-bloom imports it. */
import MANIFEST from './manifest.json';

export const CACHE_PREFIX = 'yas-bloom-assets-';
export const cacheNameFor = (version) => CACHE_PREFIX + version;
export const GROUPS = { hall: 10, rooms: 20, vip: 30, alt: 40 };

/** ?bloomprefetch=0 (also off / false / no) switches the whole preload off, for debugging */
export function prefetchEnabled(search) {
  let v = null; try { v = new URLSearchParams(search || '').get('bloomprefetch'); } catch (e) { /* ignore */ }
  return !(v !== null && /^(0|off|false|no)$/i.test(v));
}
/** what the connection / device allows: { mode: 'off' | 'core' | 'full', reason, concurrency, memBudget (bytes of Blobs held in memory) } */
export function preloadPolicy(conn, deviceMemory) {
  const c = conn || {}, et = String(c.effectiveType || '').toLowerCase(), mem = Number(deviceMemory);
  if (c.saveData) return { mode: 'off', reason: 'save-data', concurrency: 0, memBudget: 0 };
  if (et === 'slow-2g' || et === '2g') return { mode: 'off', reason: 'slow-network', concurrency: 0, memBudget: 0 };
  if (et === '3g') return { mode: 'core', reason: 'slow-network', concurrency: 2, memBudget: 8e6 };
  if (mem > 0 && mem <= 2) return { mode: 'core', reason: 'low-memory', concurrency: 2, memBudget: 4e6 };
  return { mode: 'full', reason: '', concurrency: 6, memBudget: mem > 0 && mem <= 4 ? 8e6 : 16e6 };
}
const tierLetter = (tier) => (tier === 'high' ? 'h' : tier === 'medium' ? 'm' : 'l');
/** the download order for this tier + page language + policy. Same tier-letter and group rules as scripts/showroom3d-preload/make-manifest.js (hall -> rooms -> vip -> the other language). */
export function planFor(manifest, { tier = 'high', lang = 'en', mode = 'full' } = {}) {
  const T = tierLetter(tier), L = lang === 'ar' ? 'ar' : 'en';
  const out = [];
  (manifest.assets || []).forEach((a, i) => {
    if (!a.k.includes(T)) return;
    const alt = !!a.l && a.l !== L;
    if (mode === 'core' && (a.g === 'vip' || alt)) return;
    out.push({ ...a, order: i, pri: alt ? GROUPS.alt : a.p });
  });
  return out.sort((x, y) => x.pri - y.pri || x.order - y.order);
}
const pathOf = (u) => { try { return new URL(u, 'http://x').pathname; } catch (e) { return String(u || ''); } };
const withTimeout = (p, ms) => new Promise((res) => { let done = false; const t = setTimeout(() => { if (!done) { done = true; res(null); } }, ms); p.then((v) => { if (!done) { done = true; clearTimeout(t); res(v); } }, () => { if (!done) { done = true; clearTimeout(t); res(null); } }); });

const idleView = () => ({ state: 'idle', pct: 0, files: 0, total: 0, loaded: 0, bytes: 0, fromCache: 0, mode: 'full', reason: '' });

export class AssetStore {
  constructor({ manifest = MANIFEST, fetcher, cacheApi, urlApi, onChange, cacheTimeout = 2500 } = {}) {
    this.manifest = manifest; this.cacheTimeout = cacheTimeout;
    this.fetcher = fetcher !== undefined ? fetcher : (typeof fetch === 'function' ? (u, o) => fetch(u, o) : null);
    this.cacheApi = cacheApi !== undefined ? cacheApi : (typeof caches !== 'undefined' ? caches : null);
    this.urlApi = urlApi !== undefined ? urlApi : (typeof URL !== 'undefined' && URL.createObjectURL ? URL : null);
    this.listeners = new Set(); if (onChange) this.listeners.add(onChange);
    this.reset();
  }
  reset() {
    if (this.ctrl) { try { this.ctrl.abort(); } catch (e) { /* ignore */ } }
    if (this.urls) for (const u of this.urls.values()) { try { this.urlApi && this.urlApi.revokeObjectURL(u); } catch (e) { /* ignore */ } }
    this.active = false; this.started = false; this.gen = (this.gen || 0) + 1; this.ctrl = null; this.plan = []; this.index = new Map(); this.blobs = new Map(); this.urls = new Map(); this.inflight = new Map();
    this.queue = []; this.running = 0; this.memBytes = 0; this.cachePromise = null; this.quotaFailed = false; this.policy = preloadPolicy(null, 0); this.view = idleView(); this.last = 0; this.doneSet = new Set();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(force) { const t = Date.now(); if (!force && t - this.last < 150) return; this.last = t; for (const f of [...this.listeners]) { try { f(this.view); } catch (e) { /* ignore */ } } }
  /** decide what runs for this page. Returns the view. Call start() afterwards. */
  configure({ tier = 'high', lang = 'en', search = '', connection, deviceMemory, enabled = true } = {}) {
    this.reset();
    this.policy = preloadPolicy(connection !== undefined ? connection : (typeof navigator !== 'undefined' ? navigator.connection : null), deviceMemory !== undefined ? deviceMemory : (typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined));
    const on = enabled && prefetchEnabled(search) && this.policy.mode !== 'off' && !!this.fetcher && typeof Blob !== 'undefined';
    this.tier = tier; this.lang = lang === 'ar' ? 'ar' : 'en';
    if (!on) { this.view = { ...idleView(), state: 'skipped', mode: this.policy.mode, reason: !enabled || !prefetchEnabled(search) ? 'switched-off' : this.policy.reason || 'unsupported' }; return this.view; }
    this.plan = planFor(this.manifest, { tier, lang: this.lang, mode: this.policy.mode });
    for (const a of this.plan) this.index.set(a.u, a);
    this.active = true; this.view = { ...idleView(), mode: this.policy.mode, total: this.plan.reduce((s, a) => s + a.b, 0), files: 0 };
    return this.view;
  }
  /** begin the preload. Safe to call again. */
  start() {
    if (!this.active || this.started) return; this.started = true; const gen = this.gen;
    this.view = { ...this.view, state: 'running' }; this.emit(true);
    this.prepare().then(() => { if (gen !== this.gen) return; this.queue = this.plan.filter((a) => !this.doneSet.has(a.u)); if (!this.queue.length) { this.finish(); return; } this.pump(); });
  }
  /** open the versioned cache, delete older versions, learn what is already stored (a re-visit has everything: the preload then finishes at once with zero network) */
  prepare() {
    if (!this.cacheApi) return Promise.resolve();
    return withTimeout((async () => {
      const name = cacheNameFor(this.manifest.version);
      try { for (const k of await this.cacheApi.keys()) if (k.startsWith(CACHE_PREFIX) && k !== name) await this.cacheApi.delete(k); } catch (e) { /* ignore */ }
      try {
        const c = await this.cacheApi.open(name); const have = new Set((await c.keys()).map((r) => pathOf(r.url)));
        for (const a of this.plan) if (have.has(a.u)) { this.doneSet.add(a.u); this.view.loaded += a.b; this.view.files++; this.view.fromCache++; }
        this.recalc();
      } catch (e) { this.quotaFailed = true; }
    })(), this.cacheTimeout * 2);
  }
  recalc() { const v = this.view; v.pct = v.total > 0 ? Math.min(100, Math.floor((v.loaded / v.total) * 100)) : 100; }
  finish() { if (this.view.state === 'done') return; this.view = { ...this.view, state: 'done', pct: 100 }; this.emit(true); }
  pump() {
    while (this.active && this.running < this.policy.concurrency && this.queue.length) {
      const a = this.queue.shift(); if (this.doneSet.has(a.u) || this.inflight.has(a.u)) continue;
      this.running++; this.fetchOne(a, true).then(() => { this.running--; this.pump(); });
    }
    if (this.active && this.started && !this.queue.length && this.running === 0 && this.inflight.size === 0) this.finish();
  }
  /** the Blob of a managed file: memory -> Cache Storage -> network (stored). null when it cannot be had (the caller then uses the plain URL). */
  get(url) {
    const a = this.index.get(url); if (!this.active || !a) return Promise.resolve(null);
    if (this.blobs.has(url)) return Promise.resolve(this.blobs.get(url));
    return this.fetchOne(a, false);
  }
  fetchOne(a, background) {
    if (this.inflight.has(a.u)) return this.inflight.get(a.u);
    const gen = this.gen, live = () => gen === this.gen && this.active;
    const p = (async () => {
      let blob = null, from = 'network';
      const cache = await this.openCache();
      if (cache) { try { const r = await withTimeout(cache.match(a.u), this.cacheTimeout); if (r) { const b = await r.blob(); if (b && b.size === a.b) { blob = b; from = 'cache'; } else await cache.delete(a.u); } } catch (e) { /* fall through to the network */ } }
      if (!live()) return null;
      if (!blob && this.fetcher) {
        try {
          if (!this.ctrl && typeof AbortController === 'function') this.ctrl = new AbortController();
          const res = await this.fetcher(a.u, { credentials: 'same-origin', cache: 'no-cache', priority: background ? 'low' : 'auto', signal: this.ctrl ? this.ctrl.signal : undefined });   // no-cache = revalidate: a file changed under the same name is never taken from a stale HTTP cache entry
          if (!live()) return null;
          const type = (res && res.headers && res.headers.get && res.headers.get('content-type')) || '';
          if (!res || !res.ok || res.status !== 200 || /text\/html/i.test(type)) throw new Error('status ' + (res && res.status));   // a 404 / HTML fallback is never kept
          const b = await res.blob(); if (!live()) return null;
          if (!b || !b.size || b.size !== a.b) throw new Error('size ' + (b && b.size) + ' != ' + a.b);   // short, empty or replaced body: never kept
          blob = b;
          if (cache && !this.quotaFailed) { try { await cache.put(a.u, new Response(b, { status: 200, headers: { 'content-type': b.type || type || 'application/octet-stream', 'content-length': String(b.size) } })); } catch (e) { this.quotaFailed = true; } }
        } catch (e) { blob = null; }
      }
      if (!live()) return null;
      if (blob) {
        if (this.memBytes + blob.size <= this.policy.memBudget) { this.blobs.set(a.u, blob); this.memBytes += blob.size; }
        if (!this.doneSet.has(a.u)) { this.doneSet.add(a.u); this.view.loaded += a.b; this.view.files++; if (from === 'cache') this.view.fromCache++; else this.view.bytes += a.b; this.recalc(); this.emit(); }
      } else if (!this.doneSet.has(a.u)) { this.doneSet.add(a.u); this.view.failed = (this.view.failed || 0) + 1; this.view.loaded += a.b; this.recalc(); this.emit(); }   // failed: the loader uses its plain URL; the bar still moves on
      return blob;
    })().finally(() => { this.inflight.delete(a.u); if (this.active && this.started && !this.queue.length && this.running === 0 && this.inflight.size === 0) this.finish(); });
    this.inflight.set(a.u, p); return p;
  }
  openCache() {
    if (!this.cacheApi) return Promise.resolve(null);
    if (!this.cachePromise) this.cachePromise = withTimeout(this.cacheApi.open(cacheNameFor(this.manifest.version)), this.cacheTimeout);
    return this.cachePromise;
  }
  /** the object URL of a file's Blob (made once, revoked on dispose). `blob` covers a file that came back from Cache Storage / the network but is not held in memory (over the memory budget): the loader that asked still gets it. */
  objectUrl(url, blob) {
    let u = this.urls.get(url); if (u) return u; const b = this.blobs.get(url) || blob;
    if (b && this.urlApi) { try { u = this.urlApi.createObjectURL(b); this.urls.set(url, u); } catch (e) { u = ''; } } return u || '';
  }
  /** hand `cb` the address a loader should use: an object URL of the stored Blob, or the plain URL (not managed, inactive, or the file could not be had). Synchronous whenever possible. */
  src(url, cb) {
    if (!this.active || !this.index.has(url)) { cb(url); return false; }
    const u = this.objectUrl(url); if (u) { cb(u); return true; }
    this.get(url).then((b) => { if (!b && !this.blobs.has(url)) { cb(url); return; } cb(this.objectUrl(url, b) || url); }, () => cb(url));
    return true;
  }
  /** is this a file the store manages (so loaders know to decode ahead)? */
  manages(url) { return this.active && this.index.has(url); }
  /** fetch() through the store: a Response from memory / Cache Storage / network, or the plain network fetch when the store does not manage the file or could not get it */
  async fetchThrough(url, init) {
    if (this.manages(url)) { const b = await this.get(url); if (b) return new Response(b, { status: 200, headers: { 'content-type': b.type || 'application/octet-stream' } }); }
    return fetch(url, init);
  }
  dispose() { this.reset(); this.listeners.clear(); }
}

/** the page-wide store (inactive until ShowroomExperience configures it) */
export const bloomAssets = new AssetStore();
export const assetSrc = (url, cb) => bloomAssets.src(url, cb);
export const assetFetch = (url, init) => bloomAssets.fetchThrough(url, init);
/** new Image() whose bytes come from the store (decoded ahead when the store manages the file, so a texture upload does not pay the decode). Plain behaviour when the store is off.
 *  opts: { crossOrigin, referrerPolicy, decoding } */
export function loadImg(url, onload, onerror, opts = {}) {
  const im = new Image(); if (opts.crossOrigin) im.crossOrigin = opts.crossOrigin; if (opts.referrerPolicy) im.referrerPolicy = opts.referrerPolicy; if (opts.decoding) im.decoding = opts.decoding;
  const managed = bloomAssets.manages(url);
  im.onload = () => { if (managed && typeof im.decode === 'function') { im.decode().then(() => onload && onload(im), () => onload && onload(im)); } else if (onload) onload(im); };
  im.onerror = (e) => { if (onerror) onerror(e); };
  assetSrc(url, (s) => { im.src = s; });
  return im;
}
