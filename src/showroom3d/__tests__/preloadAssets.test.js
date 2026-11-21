import { AssetStore, prefetchEnabled, preloadPolicy, planFor, cacheNameFor, CACHE_PREFIX, bloomAssets, loadImg, assetSrc } from '../preload/assetStore';
import MANIFEST from '../preload/manifest.json';
import { upgradeTexturesStaged } from '../3d/realism/registry';

const { build, text } = require('../../../scripts/showroom3d-preload/make-manifest.js');

const flush = async (n = 40) => { for (let i = 0; i < n; i++) await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); };
const A = (u, g, p, k, b, extra = {}) => ({ u, g, p, k, b, h: 'x', ...extra });
const SMALL = { version: 'v1', assets: [
  A('/yas-bloom/staff/a.webp', 'hall', 10, 'hml', 10), A('/yas-bloom/realism/tex/b.webp', 'hall', 11, 'hml', 20), A('/yas-bloom/realism/studio.hdr', 'hall', 12, 'hml', 30),
  A('/yas-bloom/collections/c-thumb.webp', 'rooms', 20, 'hm', 5), A('/yas-bloom/collections/c-small.webp', 'rooms', 20, 'l', 3),
  A('/yas-bloom/design-studio/kitchen-1-en.webp', 'rooms', 21, 'hml', 6, { l: 'en' }), A('/yas-bloom/design-studio/kitchen-1-ar.webp', 'rooms', 21, 'hml', 6, { l: 'ar' }), A('/yas-bloom/design-studio/kitchen-2-en.webp', 'rooms', 21, 'hm', 7, { l: 'en' }),
  A('/yas-bloom/profile/p.webp', 'vip', 30, 'hml', 8),
] };
const sizeOf = (u) => SMALL.assets.find((a) => a.u === u).b;

/** a fetch mock: serves `size` bytes per url (the manifest size unless overridden); gate(url) can hold a transfer back; calls recorded with their options */
function mockFetch({ fail = {}, sizes = {}, gates = {}, html = {} } = {}) {
  const calls = []; let active = 0, peak = 0;
  const fn = async (url, opts = {}) => {
    calls.push({ url, opts }); active++; peak = Math.max(peak, active);
    try {
      if (gates[url]) await gates[url];
      if (opts.signal && opts.signal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      if (fail[url] === 'throw') throw new TypeError('blocked');
      if (fail[url]) return { ok: false, status: fail[url], headers: { get: () => null }, blob: async () => new Blob([]) };
      const n = sizes[url] !== undefined ? sizes[url] : sizeOf(url);
      return { ok: true, status: 200, headers: { get: (k) => (k.toLowerCase() === 'content-type' ? (html[url] ? 'text/html' : 'image/webp') : null) }, blob: async () => new Blob(['x'.repeat(n)], { type: 'image/webp' }) };
    } finally { active--; }
  };
  fn.calls = calls; fn.peak = () => peak; return fn;
}
function mockCaches({ putFails = false, existing = {} } = {}) {
  const stores = new Map(Object.entries(existing).map(([k, v]) => [k, new Map(Object.entries(v))])), log = { opened: [], deleted: [], put: 0 };
  const api = { stores, log,
    keys: async () => [...stores.keys()], delete: async (k) => { log.deleted.push(k); return stores.delete(k); },
    open: async (name) => { log.opened.push(name); if (!stores.has(name)) stores.set(name, new Map()); const s = stores.get(name);
      return { put: async (u, r) => { log.put++; if (putFails) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); s.set(u, r); }, match: async (u) => s.get(u), keys: async () => [...s.keys()].map((url) => ({ url })), delete: async (u) => s.delete(u) }; } };
  return api;
}
const mockUrl = () => { let n = 0; const revoked = []; return { revoked, createObjectURL: () => 'blob:mock/' + ++n, revokeObjectURL: (u) => revoked.push(u) }; };
const make = (o = {}) => new AssetStore({ manifest: SMALL, urlApi: mockUrl(), cacheApi: mockCaches(), ...o });
const cfg = (s, o = {}) => s.configure({ tier: 'high', lang: 'en', search: '', connection: {}, deviceMemory: 8, ...o });

beforeAll(() => {
  if (typeof global.Response === 'undefined') global.Response = class { constructor(b, init = {}) { this._b = b; this.status = init.status || 200; this.headers = init.headers || {}; this.ok = this.status === 200; } blob() { return Promise.resolve(this._b); } };
});

describe('manifest and versioning', () => {
  test('the committed manifest matches public/ (regenerate with node scripts/showroom3d-preload/make-manifest.js)', () => {
    expect(text(build())).toBe(JSON.stringify(MANIFEST) + '\n');
  });
  test('every entry is a managed static file with a size, a hash, a group and tiers; the VIP film videos are never in it', () => {
    expect(MANIFEST.count).toBe(MANIFEST.assets.length); expect(MANIFEST.assets.length).toBeGreaterThan(100);
    for (const a of MANIFEST.assets) { expect(a.u).toMatch(/^\/(yas-bloom|brand\/ikhtarha)\//); expect(a.b).toBeGreaterThan(0); expect(a.h).toMatch(/^[0-9a-f]{8}$/); expect(['hall', 'rooms', 'vip']).toContain(a.g); expect(a.k).toMatch(/^[hml]+$/); }
    expect(MANIFEST.assets.some((a) => /\.(mp4|webm|vtt|json)$/.test(a.u))).toBe(false);
    expect(new Set(MANIFEST.assets.map((a) => a.u)).size).toBe(MANIFEST.assets.length);
  });
  test('the version is a content hash: it changes when any size / hash changes', () => {
    expect(MANIFEST.version).toMatch(/^[0-9a-f]{10}$/); expect(cacheNameFor(MANIFEST.version)).toBe(CACHE_PREFIX + MANIFEST.version);
  });
  test('?bloomprefetch=0 / off / false / no switch the preload off, anything else leaves it on', () => {
    for (const v of ['0', 'off', 'false', 'no', 'OFF']) expect(prefetchEnabled('?bloomprefetch=' + v)).toBe(false);
    for (const q of ['', '?bloomprefetch=1', '?vipprefetch=0', '?x=1']) expect(prefetchEnabled(q)).toBe(true);
  });
});

describe('connection and device policy', () => {
  test('data saver and 2g / slow-2g: nothing at all', () => {
    expect(preloadPolicy({ saveData: true }, 8).mode).toBe('off'); expect(preloadPolicy({ effectiveType: '2g' }, 8).mode).toBe('off'); expect(preloadPolicy({ effectiveType: 'slow-2g' }, 8).mode).toBe('off');
  });
  test('3g and deviceMemory <= 2: core only; otherwise full', () => {
    expect(preloadPolicy({ effectiveType: '3g' }, 8).mode).toBe('core'); expect(preloadPolicy({ effectiveType: '4g' }, 2).mode).toBe('core'); expect(preloadPolicy({ effectiveType: '4g' }, 1).mode).toBe('core');
    expect(preloadPolicy({ effectiveType: '4g' }, 8).mode).toBe('full'); expect(preloadPolicy(null, undefined).mode).toBe('full');   // Safari: no connection API, no deviceMemory
  });
  test('a smaller memory budget on small devices', () => { expect(preloadPolicy({}, 2).memBudget).toBeLessThan(preloadPolicy({}, 8).memBudget); });
  test('the real manifest: low tier gets the small swatches and one poster frame per language, high gets the thumbs and three', () => {
    const lo = planFor(MANIFEST, { tier: 'low', lang: 'en' }), hi = planFor(MANIFEST, { tier: 'high', lang: 'en' });
    expect(lo.some((a) => /-small\.webp$/.test(a.u))).toBe(true); expect(lo.some((a) => /-thumb\.webp$/.test(a.u))).toBe(false);
    expect(hi.some((a) => /-thumb\.webp$/.test(a.u))).toBe(true); expect(hi.some((a) => /-small\.webp$/.test(a.u))).toBe(false);
    expect(lo.filter((a) => /design-studio\/kitchen-\d-en/.test(a.u)).length).toBe(1); expect(hi.filter((a) => /design-studio\/kitchen-\d-en/.test(a.u)).length).toBe(3);
  });
});

describe('priority order', () => {
  test('hall first, then the rooms, then VIP, then the other language; the page language before the other one', () => {
    const p = planFor(SMALL, { tier: 'high', lang: 'en', mode: 'full' }).map((a) => a.u.split('/').pop());
    expect(p).toEqual(['a.webp', 'b.webp', 'studio.hdr', 'c-thumb.webp', 'kitchen-1-en.webp', 'kitchen-2-en.webp', 'p.webp', 'kitchen-1-ar.webp']);
    const ar = planFor(SMALL, { tier: 'high', lang: 'ar', mode: 'full' }).map((a) => a.u.split('/').pop());
    expect(ar.indexOf('kitchen-1-ar.webp')).toBeLessThan(ar.indexOf('p.webp')); expect(ar.indexOf('kitchen-1-en.webp')).toBeGreaterThan(ar.indexOf('p.webp'));
  });
  test('core mode drops the VIP group and the other language', () => {
    const p = planFor(SMALL, { tier: 'high', lang: 'en', mode: 'core' }).map((a) => a.u.split('/').pop());
    expect(p).not.toContain('p.webp'); expect(p).not.toContain('kitchen-1-ar.webp'); expect(p).toContain('kitchen-2-en.webp');
  });
  test('the store downloads in that order, at most `concurrency` at a time, low priority, same-origin, and reports real progress up to done', async () => {
    const f = mockFetch(), s = make({ fetcher: f }), seen = []; cfg(s); s.subscribe((v) => seen.push(v.pct)); s.start(); await flush();
    expect(f.calls.map((c) => c.url.split('/').pop())).toEqual(['a.webp', 'b.webp', 'studio.hdr', 'c-thumb.webp', 'kitchen-1-en.webp', 'kitchen-2-en.webp', 'p.webp', 'kitchen-1-ar.webp']);
    expect(f.peak()).toBeLessThanOrEqual(6); expect(f.calls.every((c) => c.opts.priority === 'low' && c.opts.credentials === 'same-origin')).toBe(true);
    expect(s.view.state).toBe('done'); expect(s.view.pct).toBe(100); expect(s.view.files).toBe(8);
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1])).toBe(true);   // monotonic
  });
  test('progress counts bytes: part-way it is neither 0 nor 100', async () => {
    const g = {}; for (const a of SMALL.assets) { let open; g[a.u] = new Promise((r) => { open = r; }); g[a.u].open = open; }
    const f = mockFetch({ gates: g }), s = make({ fetcher: f }); cfg(s, { connection: { effectiveType: '3g' } }); s.start(); await flush();   // 3g: core, 2 at a time
    g['/yas-bloom/staff/a.webp'].open(); g['/yas-bloom/realism/tex/b.webp'].open(); await flush();
    expect(s.view.state).toBe('running'); expect(s.view.pct).toBeGreaterThan(0); expect(s.view.pct).toBeLessThan(100);
    expect(f.peak()).toBeLessThanOrEqual(2);
  });
});

describe('use by the loaders', () => {
  test('src() of a file the preload has not reached yet promotes it: one download, the loader gets an object URL', async () => {
    const f = mockFetch(), s = make({ fetcher: f }); cfg(s); s.start();
    const got = []; s.src('/yas-bloom/profile/p.webp', (u) => got.push(u)); await flush();
    expect(got.length).toBe(1); expect(got[0]).toMatch(/^blob:/); expect(f.calls.filter((c) => c.url === '/yas-bloom/profile/p.webp').length).toBe(1);
    expect(f.calls.find((c) => c.url === '/yas-bloom/profile/p.webp').opts.priority).toBe('auto');   // asked for by a loader: not low priority
  });
  test('a second ask is answered synchronously from memory with the same object URL', async () => {
    const s = make({ fetcher: mockFetch() }); cfg(s); s.start(); await flush();
    let a = null, b = null, syncB = false; s.src('/yas-bloom/staff/a.webp', (u) => { a = u; }); await flush(); syncB = s.src('/yas-bloom/staff/a.webp', (u) => { b = u; });
    expect(a).toBe(b); expect(syncB).toBe(true);
  });
  test('files the store does not manage (and an inactive store) hand the plain URL back synchronously', () => {
    const s = make({ fetcher: mockFetch() }); cfg(s); let u = null; expect(s.src('/somewhere/else.png', (x) => { u = x; })).toBe(false); expect(u).toBe('/somewhere/else.png');
    const off = make({ fetcher: mockFetch() }); cfg(off, { connection: { saveData: true } }); off.src('/yas-bloom/profile/p.webp', (x) => { u = x; }); expect(u).toBe('/yas-bloom/profile/p.webp');
  });
  test('over the memory budget a file is not held, but the loader that asked for it still gets its bytes (never the network)', async () => {
    const f = mockFetch(), s = make({ fetcher: f }); cfg(s, { deviceMemory: 1 }); s.policy.memBudget = 12; s.start(); await flush();   // 12 bytes: only the first small file fits
    expect(s.blobs.size).toBeLessThan(8); const calls = f.calls.length; const lost = SMALL.assets.map((a) => a.u).find((u) => !s.blobs.has(u)); let u = null;
    s.src(lost, (x) => { u = x; }); await flush(); expect(u).toMatch(/^blob:/);
  });
  test('a wrong-sized body, a 404 and an HTML fallback are never kept: the loader falls back to the plain URL', async () => {
    const f = mockFetch({ sizes: { '/yas-bloom/staff/a.webp': 3 }, fail: { '/yas-bloom/realism/tex/b.webp': 404 }, html: { '/yas-bloom/realism/studio.hdr': true } }), c = mockCaches(), s = make({ fetcher: f, cacheApi: c }); cfg(s); s.start(); await flush();
    const got = {}; for (const u of ['/yas-bloom/staff/a.webp', '/yas-bloom/realism/tex/b.webp', '/yas-bloom/realism/studio.hdr']) s.src(u, (x) => { got[u] = x; }); await flush();
    for (const [u, x] of Object.entries(got)) expect(x).toBe(u); expect(Object.keys(got).length).toBe(3);
    const stored = [...c.stores.get(cacheNameFor('v1')).keys()]; expect(stored).not.toContain('/yas-bloom/staff/a.webp'); expect(stored).not.toContain('/yas-bloom/realism/tex/b.webp'); expect(stored).not.toContain('/yas-bloom/realism/studio.hdr');
    expect(s.view.state).toBe('done');   // failures do not stall the preload
  });
  test('fetchThrough returns a Response from the store for managed files', async () => {
    const s = make({ fetcher: mockFetch() }); cfg(s); s.start(); const r = await s.fetchThrough('/yas-bloom/staff/a.webp'); const b = await r.blob(); expect(b.size).toBe(10);
  });
  test('loadImg with the (inactive) page-wide store behaves like a plain Image: src set synchronously, callbacks run', () => {
    let loaded = null; const im = loadImg('/yas-bloom/staff/a.webp', (x) => { loaded = x; }, () => {}, { crossOrigin: 'anonymous' });
    expect(im.getAttribute('src')).toBe('/yas-bloom/staff/a.webp'); expect(im.crossOrigin).toBe('anonymous'); im.onload(); expect(loaded).toBe(im);
    let u = null; assetSrc('/x.png', (v) => { u = v; }); expect(u).toBe('/x.png'); expect(bloomAssets.active).toBe(false);
  });
});

describe('Cache Storage', () => {
  test('files land in the versioned cache, and a second visit makes ZERO network requests (served from the cache)', async () => {
    const c = mockCaches(), f1 = mockFetch(), s1 = make({ fetcher: f1, cacheApi: c }); cfg(s1); s1.start(); await flush();
    expect(c.log.opened).toContain(cacheNameFor('v1')); expect(c.stores.get(cacheNameFor('v1')).size).toBe(8);
    s1.dispose();
    const f2 = mockFetch(), s2 = make({ fetcher: f2, cacheApi: c }); cfg(s2); s2.start(); await flush();
    expect(f2.calls.length).toBe(0); expect(s2.view.state).toBe('done'); expect(s2.view.fromCache).toBe(8); expect(s2.view.pct).toBe(100);
    let u = null; s2.src('/yas-bloom/staff/a.webp', (x) => { u = x; }); await flush(); expect(u).toMatch(/^blob:/); expect(f2.calls.length).toBe(0);   // a loader is served from Cache Storage too
  });
  test('old versions are deleted; other caches (the film cache) are left alone', async () => {
    const c = mockCaches({ existing: { [CACHE_PREFIX + 'old1']: { '/x': 1 }, [CACHE_PREFIX + 'old2']: {}, 'yas-film-v1': { '/yas-bloom/film/a.mp4': 1 }, 'other': {} } });
    const s = make({ fetcher: mockFetch(), cacheApi: c }); cfg(s); s.start(); await flush();
    expect(c.log.deleted.sort()).toEqual([CACHE_PREFIX + 'old1', CACHE_PREFIX + 'old2']); expect([...c.stores.keys()]).toEqual(expect.arrayContaining(['yas-film-v1', 'other', cacheNameFor('v1')]));
  });
  test('a cache entry of the wrong size is dropped and fetched again', async () => {
    const c = mockCaches({ existing: { [cacheNameFor('v1')]: { '/yas-bloom/staff/a.webp': new Response(new Blob(['xx'])) } } });
    const f = mockFetch(), s = make({ fetcher: f, cacheApi: c }); cfg(s); let u = null; s.src('/yas-bloom/staff/a.webp', (x) => { u = x; }); await flush();
    expect(f.calls.map((x) => x.url)).toContain('/yas-bloom/staff/a.webp'); expect(u).toMatch(/^blob:/);
  });
  test('quota / storage failure: the download carries on, files are held in memory, the loaders still get them, nothing throws', async () => {
    const c = mockCaches({ putFails: true }), f = mockFetch(), s = make({ fetcher: f, cacheApi: c }); cfg(s); s.start(); await flush();
    expect(s.view.state).toBe('done'); expect(s.view.files).toBe(8); expect(c.log.put).toBeLessThanOrEqual(6);   // only the downloads already in flight when the first put failed tried; no more attempts after
    let u = null; s.src('/yas-bloom/staff/a.webp', (x) => { u = x; }); expect(u).toMatch(/^blob:/);
  });
  test('no Cache Storage at all (private window): memory only, still works', async () => {
    const f = mockFetch(), s = make({ fetcher: f, cacheApi: null }); cfg(s); s.start(); await flush(); expect(s.view.state).toBe('done');
    let u = null; s.src('/yas-bloom/staff/a.webp', (x) => { u = x; }); expect(u).toMatch(/^blob:/);
  });
  test('a hanging Cache Storage does not block the preload for long (timeouts), and the files still arrive', async () => {
    const c = { keys: () => new Promise(() => {}), open: () => new Promise(() => {}), delete: async () => true };
    const f = mockFetch(), s = make({ fetcher: f, cacheApi: c, cacheTimeout: 20 }); cfg(s); s.start(); await new Promise((r) => setTimeout(r, 200)); await flush();
    expect(f.calls.length).toBe(8); expect(s.view.state).toBe('done');
  });
});

describe('skips and abort', () => {
  test('?bloomprefetch=0: no fetch, no Cache Storage access, state skipped', async () => {
    const f = mockFetch(), c = mockCaches(), s = make({ fetcher: f, cacheApi: c }); cfg(s, { search: '?bloomprefetch=0' }); s.start(); await flush();
    expect(f.calls.length).toBe(0); expect(c.log.opened.length).toBe(0); expect(s.view.state).toBe('skipped'); expect(s.view.reason).toBe('switched-off'); expect(s.active).toBe(false);
  });
  test('data saver / 2g: skipped with the reason, nothing fetched', async () => {
    for (const [conn, reason] of [[{ saveData: true }, 'save-data'], [{ effectiveType: '2g' }, 'slow-network'], [{ effectiveType: 'slow-2g' }, 'slow-network']]) {
      const f = mockFetch(), s = make({ fetcher: f }); cfg(s, { connection: conn }); s.start(); await flush(); expect(f.calls.length).toBe(0); expect(s.view.state).toBe('skipped'); expect(s.view.reason).toBe(reason);
    }
  });
  test('3g and low memory: core only (no VIP photos, no other-language posters)', async () => {
    for (const o of [{ connection: { effectiveType: '3g' } }, { deviceMemory: 2 }]) { const f = mockFetch(), s = make({ fetcher: f }); cfg(s, o); s.start(); await flush(); expect(f.calls.map((c) => c.url)).not.toContain('/yas-bloom/profile/p.webp'); expect(f.calls.length).toBe(6); expect(s.view.state).toBe('done'); }
  });
  test('no fetch support: skipped', async () => { const s = make({ fetcher: null }); cfg(s); s.start(); expect(s.view.state).toBe('skipped'); });
  test('leaving the showroom aborts the running download and stops the queue; finished files stay in Cache Storage', async () => {
    const gate = {}; let open; gate['/yas-bloom/realism/tex/b.webp'] = new Promise((r) => { open = r; });
    const c = mockCaches(), f = mockFetch({ gates: gate }), s = make({ fetcher: f, cacheApi: c }); cfg(s, { connection: { effectiveType: '3g' } }); s.start(); await flush();
    const signal = f.calls[0].opts.signal; expect(signal.aborted).toBe(false); const before = f.calls.length; s.dispose(); open(); await flush();
    expect(signal.aborted).toBe(true); expect(f.calls.length).toBe(before);   // nothing new after leaving
    expect(c.stores.get(cacheNameFor('v1')).has('/yas-bloom/staff/a.webp')).toBe(true);
  });
  test('dispose revokes every object URL it made', async () => {
    const u = mockUrl(), s = make({ fetcher: mockFetch(), urlApi: u }); cfg(s); s.start(); await flush(); s.src('/yas-bloom/staff/a.webp', () => {}); await flush(); s.dispose(); expect(u.revoked.length).toBeGreaterThan(0);
  });
  test('configure() again (a retry / a re-mount) starts clean: the old run cannot touch the new one', async () => {
    const g = {}; let open; g['/yas-bloom/staff/a.webp'] = new Promise((r) => { open = r; });
    const f = mockFetch({ gates: g }), s = make({ fetcher: f }); cfg(s); s.start(); await flush(); cfg(s, { search: '?bloomprefetch=0' }); open(); await flush();
    expect(s.view.state).toBe('skipped'); expect(s.blobs.size).toBe(0);
  });
});

describe('staged realism upgrade', () => {
  test('with nothing tracked it resolves to 0 without yielding, and it honours cancel', async () => {
    let yields = 0; const next = async () => { yields++; };
    expect(await upgradeTexturesStaged({ next })).toBe(0); expect(yields).toBe(0);
    expect(await upgradeTexturesStaged({ next, cancelled: () => true })).toBe(0);
  });
});
