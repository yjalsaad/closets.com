import { FilmPreloader, connectionPolicy, prefetchEnabled, CACHE_NAME } from '../vip/filmPreload';
import { FilmPlayer } from '../vip/filmPlayer';

const A = '/yas-bloom/film/a.mp4', B = '/yas-bloom/film/b.mp4', C = '/yas-bloom/film/c.mp4';
const PLAN = [{ id: 'a', src: A, bytes: 30 }, { id: 'b', src: B, bytes: 20 }, { id: 'c', src: C, bytes: 10 }];
const flush = async (n = 30) => { for (let i = 0; i < n; i++) await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); };

/** a streaming fetch mock: every url is served in 10-byte chunks; gate(url) can hold the transfer back; calls are recorded; abort() rejects like the real thing */
function mockFetch({ fail = {}, size = { [A]: 30, [B]: 20, [C]: 10 }, gates = {}, headers = {} } = {}) {
  const calls = [];
  const fn = (url, opts = {}) => {
    calls.push({ url, opts });
    if (fail[url] === 'throw') return Promise.reject(new TypeError('blocked'));
    if (fail[url]) return Promise.resolve({ ok: false, status: fail[url], headers: { get: () => null } });
    const n = size[url]; let sent = 0;
    const abortErr = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
    return Promise.resolve({ ok: true, status: 200, headers: { get: (k) => ({ 'content-type': 'video/mp4', 'content-length': String(n), ...headers }[k.toLowerCase()] || null) },
      body: { getReader: () => ({
        read: async () => { if (gates[url]) await gates[url]; if (opts.signal && opts.signal.aborted) throw abortErr(); if (sent >= n) return { done: true }; const len = Math.min(10, n - sent); sent += len; return { done: false, value: new Uint8Array(len) }; },
        cancel: () => {},
      }) } });
  };
  fn.calls = calls; return fn;
}
function mockCaches() {
  const store = new Map(), api = { store, opened: 0, open: async () => { api.opened++; return { put: async (u, r) => { store.set(u, r); }, match: async (u) => store.get(u), keys: async () => [...store.keys()].map((url) => ({ url })), delete: async (r) => store.delete(r.url) }; } };
  return api;
}
function mockUrl() { let n = 0; const made = [], revoked = []; return { made, revoked, createObjectURL: () => { const u = 'blob:mock/' + ++n; made.push(u); return u; }, revokeObjectURL: (u) => revoked.push(u) }; }
const make = (o = {}) => new FilmPreloader({ startDelay: 0, cacheApi: null, urlApi: mockUrl(), connection: {}, deviceMemory: 8, ...o });
const gate = () => { let open; const p = new Promise((r) => { open = r; }); p.open = open; return p; };

beforeAll(() => {
  for (const m of ['pause', 'load', 'play']) HTMLMediaElement.prototype[m] = function () { return m === 'play' ? Promise.resolve() : undefined; };   /* jsdom has no media playback */ if (typeof global.Response === 'undefined') global.Response = class { constructor(b, i) { this.body = b; this.status = (i && i.status) || 200; this.headers = i && i.headers; } async blob() { return this.body; } }; });

describe('queue order and progress', () => {
  test('downloads in agenda order, one at a time, at low priority, same-origin', async () => {
    const f = mockFetch(), P = make({ fetcher: f, cacheApi: mockCaches() }); P.setPlan(PLAN); P.start(); await flush(40);
    expect(f.calls.map((c) => c.url)).toEqual([A, B, C]);
    expect(f.calls.every((c) => c.opts.priority === 'low' && c.opts.credentials === 'same-origin')).toBe(true);
    expect(P.get(A).status).toBe('ready'); expect(P.get(B).status).toBe('ready'); expect(P.get(C).status).toBe('ready');
  });
  test('only one transfer is in flight: the next starts after the previous finished', async () => {
    const g = gate(), f = mockFetch({ gates: { [A]: g } }), P = make({ fetcher: f, cacheApi: mockCaches() }); P.setPlan(PLAN); P.start(); await flush();
    expect(f.calls.map((c) => c.url)).toEqual([A]); g.open(); await flush(40); expect(f.calls.map((c) => c.url)).toEqual([A, B, C]);
  });
  test('progress events carry loaded / total / pct and end at ready 100', async () => {
    const seen = [], P = make({ fetcher: mockFetch(), onChange: (p) => seen.push(p.get(A).pct + ':' + p.get(A).status) }); const realNow = Date.now; let t = 0; Date.now = () => (t += 500);
    try { P.setPlan(PLAN); P.start(); await flush(); } finally { Date.now = realNow; }
    expect(seen).toEqual(expect.arrayContaining(['0:loading', '33:loading', '66:loading', '100:ready'])); expect(P.get(A)).toMatchObject({ status: 'ready', loaded: 30, total: 30, pct: 100 });
  });
  test('prioritise() moves a film to the front of the waiting queue', async () => {
    const g = gate(), f = mockFetch({ gates: { [A]: g } }), P = make({ fetcher: f, cacheApi: mockCaches() }); P.setPlan(PLAN); P.start(); await flush(); P.prioritise(C); g.open(); await flush();
    expect(f.calls.map((c) => c.url)).toEqual([A, C, B]);
  });
  test('nothing happens before start(): a plan alone downloads nothing and view() is off', async () => {
    const f = mockFetch(), P = make({ fetcher: f }); P.setPlan(PLAN); await flush(); expect(f.calls).toHaveLength(0); expect(P.view(A).state).toBe('off');
  });
  test('start delay: the first request waits so the room can settle', async () => {
    jest.useFakeTimers(); try { const f = mockFetch(), P = make({ fetcher: f, startDelay: 1500 }); P.setPlan(PLAN); P.start(); jest.advanceTimersByTime(1000); expect(f.calls).toHaveLength(0); jest.advanceTimersByTime(600); expect(f.calls.length).toBe(1); P.dispose(); } finally { jest.useRealTimers(); }
  });
  test('view(): preparing with a percentage, then ready', async () => {
    const g = gate(), P = make({ fetcher: mockFetch({ gates: { [A]: g } }) }); P.setPlan(PLAN); P.start(); await flush(); expect(P.view(A)).toEqual({ state: 'preparing', pct: 0 }); expect(P.view(B).state).toBe('preparing'); g.open(); await flush(); expect(P.view(A)).toEqual({ state: 'ready', pct: 100 });
  });
});

describe('abort and dispose', () => {
  test('abort() cancels the running transfer, passes an AbortSignal and starts nothing new; entries go back to idle', async () => {
    const g = gate(), f = mockFetch({ gates: { [A]: g } }), P = make({ fetcher: f }); P.setPlan(PLAN); P.start(); await flush(); const sig = f.calls[0].opts.signal; expect(sig.aborted).toBe(false);
    P.abort(); expect(sig.aborted).toBe(true); g.open(); await flush(); expect(f.calls).toHaveLength(1); expect(P.get(A).status).toBe('idle'); expect(P.view(A).state).toBe('off');
  });
  test('after an abort start() resumes and fetches what is missing', async () => {
    const g = gate(), f = mockFetch({ gates: { [A]: g } }), P = make({ fetcher: f, cacheApi: mockCaches() }); P.setPlan(PLAN); P.start(); await flush(); P.abort(); g.open(); await flush(); P.start(); await flush(40); expect(P.get(A).status).toBe('ready'); expect(P.get(C).status).toBe('ready');
  });
  test('abort before the start delay is over: no request is ever sent', async () => {
    jest.useFakeTimers(); try { const f = mockFetch(), P = make({ fetcher: f, startDelay: 1500 }); P.setPlan(PLAN); P.start(); P.abort(); jest.advanceTimersByTime(5000); expect(f.calls).toHaveLength(0); } finally { jest.useRealTimers(); }
  });
  test('dispose() revokes every object URL and drops every blob', async () => {
    const u = mockUrl(), P = make({ fetcher: mockFetch(), urlApi: u }); P.setPlan(PLAN.slice(0, 2)); P.start(); await flush(); const a = P.urlFor(A), b = P.urlFor(B); expect(a).toMatch(/^blob:/); expect(b).toMatch(/^blob:/);
    P.dispose(); expect(u.revoked.sort()).toEqual([a, b].sort()); expect(P.urlFor(A)).toBe(''); expect(P.blobs.size).toBe(0);
  });
  test('urlFor() gives the same URL every time and creates it once', async () => {
    const u = mockUrl(), P = make({ fetcher: mockFetch(), urlApi: u }); P.setPlan(PLAN.slice(0, 1)); P.start(); await flush(); expect(P.urlFor(A)).toBe(P.urlFor(A)); expect(u.made).toHaveLength(1);
  });
});

describe('memory cap', () => {
  test('at most 2 blobs are held; without Cache Storage the third film waits until a slot is released', async () => {
    const u = mockUrl(), f = mockFetch(), P = make({ fetcher: f, urlApi: u }); P.setPlan(PLAN); P.start(); await flush();
    expect(P.blobs.size).toBe(2); expect(f.calls.map((c) => c.url)).toEqual([A, B]); expect(P.get(C).status).toBe('idle');
    const a = P.urlFor(A); P.release(A); P.trim(); await flush();   // the owner moved on from film 1 -> its memory is freed, the AI film downloads
    expect(P.blobs.has(A)).toBe(false); expect(P.get(C).status).toBe('ready'); expect(P.blobs.size).toBe(2); expect(u.revoked).toContain(a);
  });
  test('a pinned blob (the one being played) is never evicted; a released (played) one goes first', async () => {
    const P = make({ fetcher: mockFetch(), maxBlobs: 1 }); P.setPlan(PLAN); P.start(); await flush(); P.pin(A); expect(P.blobs.has(A)).toBe(true);
    P.hold(B, new Blob(['x'])); expect(P.blobs.has(A)).toBe(true); P.release(A); P.hold(C, new Blob(['y'])); expect(P.blobs.has(A)).toBe(false); expect(P.blobs.has(C)).toBe(true);
  });
  test('with Cache Storage all three download; the LAST film (the AI one) never pushes an upcoming film out of memory: it stays in Cache Storage and is read back when picked', async () => {
    const caches = mockCaches(), f = mockFetch(), P = make({ fetcher: f, cacheApi: caches }); P.setPlan(PLAN); P.start(); await flush(40);
    expect(f.calls).toHaveLength(3); expect([...P.blobs.keys()].sort()).toEqual([A, B]); expect([...caches.store.keys()].sort()).toEqual([A, B, C]); expect(P.get(C).status).toBe('ready'); expect(P.urlFor(C)).toBe('');
    P.release(A); expect(await P.warm(C)).toBe(true); expect(P.urlFor(C)).toMatch(/^blob:/); expect(P.blobs.has(A)).toBe(false); expect(P.blobs.size).toBe(2); expect(f.calls).toHaveLength(3);
  });
  test('a low-memory device (deviceMemory 2) holds one blob', () => { expect(make({ deviceMemory: 2 }).maxBlobs).toBe(1); expect(make({ deviceMemory: 8 }).maxBlobs).toBe(2); });
});

describe('Cache Storage: a re-visit and a reload do not download again', () => {
  test('a finished film is stored under CACHE_NAME and a second preloader serves it with NO network request', async () => {
    const caches = mockCaches(), f1 = mockFetch(), P1 = make({ fetcher: f1, cacheApi: caches }); P1.setPlan(PLAN.slice(0, 2)); P1.start(); await flush(40); expect(f1.calls).toHaveLength(2); expect(caches.opened).toBeGreaterThan(0);
    const f2 = mockFetch(), P2 = make({ fetcher: f2, cacheApi: caches }); P2.setPlan(PLAN.slice(0, 2)); P2.start(); await flush(40);
    expect(f2.calls).toHaveLength(0); expect(P2.get(A)).toMatchObject({ status: 'ready', from: 'cache' }); expect(P2.urlFor(A)).toMatch(/^blob:/); expect(CACHE_NAME).toMatch(/^yas-film-v/);
  });
  test('a cached copy whose size no longer matches the manifest (a replaced file) is downloaded again', async () => {
    const caches = mockCaches(); caches.store.set(A, { blob: async () => new Blob([new Uint8Array(7)]) }); const f = mockFetch(), P = make({ fetcher: f, cacheApi: caches }); P.setPlan(PLAN.slice(0, 1)); P.start(); await flush(40);
    expect(f.calls).toHaveLength(1); expect(P.get(A)).toMatchObject({ status: 'ready', from: 'network', loaded: 30 });
  });
  test('films that are no longer in the plan are removed from the cache', async () => {
    const caches = mockCaches(); caches.store.set('/yas-bloom/film/old.mp4', {}); const P = make({ fetcher: mockFetch(), cacheApi: caches }); P.setPlan(PLAN.slice(0, 1)); P.start(); await flush(40); expect(caches.store.has('/yas-bloom/film/old.mp4')).toBe(false); expect(caches.store.has(A)).toBe(true);
  });
  test('Cache Storage that throws (private window, quota) does not break the download: the blob in memory is used', async () => {
    const bad = { open: async () => { throw new Error('denied'); } }, P = make({ fetcher: mockFetch(), cacheApi: bad }); P.setPlan(PLAN.slice(0, 1)); P.start(); await flush(40); expect(P.get(A).status).toBe('ready'); expect(P.urlFor(A)).toMatch(/^blob:/);
  });
});

describe('fallback to streaming', () => {
  test.each([['a network error / blocked fetch', 'throw'], ['a 404', 404], ['a 500', 500]])('%s -> that film is "failed" (it streams), the queue goes on with the next film', async (_n, how) => {
    const f = mockFetch({ fail: { [A]: how } }), P = make({ fetcher: f }); P.setPlan(PLAN); P.start(); await flush();
    expect(P.get(A).status).toBe('failed'); expect(P.urlFor(A)).toBe(''); expect(P.view(A).state).toBe('off'); expect(P.get(B).status).toBe('ready');
  });
  test('a 206 partial answer, an HTML fallback page and a short body are never kept', async () => {
    const f1 = mockFetch(), g = (url, o) => f1(url, o).then((r) => (url === A ? { ...r, status: 206 } : r)); const P1 = make({ fetcher: g }); P1.setPlan(PLAN.slice(0, 1)); P1.start(); await flush(); expect(P1.get(A).status).toBe('failed');
    const P2 = make({ fetcher: mockFetch({ headers: { 'content-type': 'text/html; charset=utf-8' } }) }); P2.setPlan(PLAN.slice(0, 1)); P2.start(); await flush(); expect(P2.get(A).status).toBe('failed');
    const P3 = make({ fetcher: mockFetch({ headers: { 'content-length': '999' } }) }); P3.setPlan(PLAN.slice(0, 1)); P3.start(); await flush(); expect(P3.get(A).status).toBe('failed');
  });
  test('no fetch at all (very old browser): everything is failed, nothing throws', async () => {
    const P = make({ fetcher: null }); P.setPlan(PLAN); P.start(); await flush(); expect(P.get(A).status).toBe('failed'); expect(P.urlFor(A)).toBe('');
  });
  test('a response without a stream reader falls back to blob()', async () => {
    const f = () => Promise.resolve({ ok: true, status: 200, headers: { get: (k) => (k === 'content-type' ? 'video/mp4' : '30') }, blob: async () => new Blob([new Uint8Array(30)]) }); const P = make({ fetcher: f }); P.setPlan(PLAN.slice(0, 1)); P.start(); await flush(); expect(P.get(A).status).toBe('ready');
  });
  test('skip(): Play pressed during the download cancels that transfer (the film streams) and the queue goes on', async () => {
    const g = gate(), f = mockFetch({ gates: { [A]: g } }), P = make({ fetcher: f }); P.setPlan(PLAN); P.start(); await flush(); P.skip(A); g.open(); await flush();
    expect(P.get(A).status).toBe('failed'); expect(P.get(B).status).toBe('ready');
  });
});

describe('data saver, slow networks, switch', () => {
  test.each([[{ saveData: true }, 'save-data'], [{ effectiveType: '2g' }, 'slow-network'], [{ effectiveType: 'slow-2g' }, 'slow-network']])('%j: not a single request, the UI shows nothing', async (conn) => {
    const f = mockFetch(), P = make({ fetcher: f, connection: conn }); P.setPlan(PLAN); P.start(); await flush(); expect(f.calls).toHaveLength(0); expect(P.skipped).toBe(true); expect(P.view(A).state).toBe('off'); expect(P.get(A).status).toBe('skipped');
  });
  test('3g: only the first film (the one about to play) is fetched', async () => {
    const f = mockFetch(), P = make({ fetcher: f, connection: { effectiveType: '3g' } }); P.setPlan(PLAN); P.start(); await flush(); expect(f.calls.map((c) => c.url)).toEqual([A]); expect(P.view(B).state).toBe('off');
  });
  test('4g and wifi: everything', async () => { const f = mockFetch(), P = make({ fetcher: f, cacheApi: mockCaches(), connection: { effectiveType: '4g' } }); P.setPlan(PLAN); P.start(); await flush(40); expect(f.calls).toHaveLength(3); });
  test('connectionPolicy', () => { expect(connectionPolicy({ saveData: true }).allow).toBe(false); expect(connectionPolicy({ effectiveType: '3g' }).max).toBe(1); expect(connectionPolicy(null).allow).toBe(true); expect(connectionPolicy(undefined, 1).maxBlobs).toBe(1); });
  test('?vipprefetch=0 / off / false switches it off; absent or 1 leaves it on', () => {
    for (const q of ['?vipprefetch=0', '?x=1&vipprefetch=off', '?vipprefetch=false']) expect(prefetchEnabled(q)).toBe(false); for (const q of ['', '?vipprefetch=1', '?vipdeck=default']) expect(prefetchEnabled(q)).toBe(true);
  });
  test('enabled:false (the query flag): no requests', async () => { const f = mockFetch(), P = make({ fetcher: f, enabled: false }); P.setPlan(PLAN); P.start(); await flush(); expect(f.calls).toHaveLength(0); expect(P.view(A).state).toBe('off'); });
});

describe('FilmPlayer uses the downloaded film', () => {
  const MAN = (id, n, bytes) => JSON.stringify({ films: [{ id, real: true, order: n, title: { en: id, ar: id }, durationSec: 5, sources: [{ src: '/yas-bloom/film/' + id + '.mp4', width: 1280, height: 720, bytes }], captions: [] }] });
  const setup = async (conn = {}) => {
    const f = mockFetch({ size: { '/yas-bloom/film/a.mp4': 30 } }), u = mockUrl(), pre = new FilmPreloader({ fetcher: f, cacheApi: null, urlApi: u, connection: conn, deviceMemory: 8, startDelay: 0 });
    const fetcher = (url) => Promise.resolve({ ok: true, text: async () => (url.endsWith('films.json') ? MAN('a', 1, 30) : '') });
    const p = new FilmPlayer({ fetcher, preloader: pre, device: { tier: 'high' } }); await p.load(); return { p, pre, f, u };
  };
  test('Play after the download: the <video> gets the blob URL, preload=auto, and no video request is made by the player', async () => {
    const { p, pre, f } = await setup(); p.select('a'); p.prefetch(['a']); await flush(); expect(pre.get('/yas-bloom/film/a.mp4').status).toBe('ready'); const before = f.calls.length;
    const v = p.ensureVideo(); expect(v.src).toMatch(/^blob:mock/); expect(v.preload).toBe('auto'); expect(f.calls.length).toBe(before); expect(pre.pinned.has('/yas-bloom/film/a.mp4')).toBe(true); expect(p.prepOf().state).toBe('ready');
    p.dispose(); expect(pre.blobs.size).toBe(0);
  });
  test('Play before the download is finished: streams from the site URL and stops downloading that film', async () => {
    const { p, pre } = await setup(); const g = gate(); pre.fetcher = mockFetch({ size: { '/yas-bloom/film/a.mp4': 30 }, gates: { '/yas-bloom/film/a.mp4': g } });
    p.select('a'); p.prefetch(['a']); await flush(); expect(p.prepOf().state).toBe('preparing'); const v = p.ensureVideo(); expect(v.src).toMatch(/yas-bloom\/film\/a\.mp4$/); expect(v.src).not.toMatch(/^blob:/);
    g.open(); await flush(); expect(pre.get('/yas-bloom/film/a.mp4').status).toBe('failed'); p.dispose();
  });
  test('save-data: the player still plays (streaming) and shows no preparing state', async () => {
    const { p, pre, f } = await setup({ saveData: true }); p.select('a'); p.prefetch(['a']); await flush(); expect(f.calls).toHaveLength(0); expect(p.prepOf().state).toBe('off'); expect(p.ensureVideo().src).toMatch(/a\.mp4$/); p.dispose(); expect(pre.disposed).toBe(true);
  });
  test('switching film releases the previous one (its blob can leave memory)', async () => {
    const { p, pre } = await setup(); p.select('a'); p.prefetch(['a']); await flush(); p.ensureVideo(); const rel = jest.spyOn(pre, 'release'); p.dropVideo(); expect(rel).toHaveBeenCalledWith('/yas-bloom/film/a.mp4'); expect(pre.pinned.size).toBe(0); p.dispose();
  });
});
