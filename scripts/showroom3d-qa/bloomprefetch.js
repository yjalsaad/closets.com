/* "Download the whole showroom first" QA (headless Chromium on SwiftShader, network throttled through CDP).
 *
 *   NOFILM=1 node scripts/showroom3d-qa/serve-prod.js build 5056 &
 *   BASE=http://localhost:5056 node scripts/showroom3d-qa/bloomprefetch.js [flow|reload|off|saver|quota|cleanup|ui|all|a,b,c]
 *
 * flow     first visit on a slow line: the progress pill shows real, rising numbers; every managed file lands in Cache Storage (versioned name); the film cache is untouched
 * reload   second visit in the same profile: ZERO network requests for the managed files (served from Cache Storage), no pill, the walls still get their images
 * off      ?bloomprefetch=0: no cache is created, nothing is stored, the showroom works as before
 * saver    Save-Data / 2g: nothing is downloaded or stored, the showroom works
 * quota    Cache Storage refuses writes: silent fall-back, the showroom works, no page error
 * cleanup  an older yas-bloom-assets-* cache is deleted, other caches are left alone
 * ui       the progress pill in EN / AR on desktop and phone (screenshots in docs/showroom3d/screenshots) */
const L = require('./lib.js');
const { check, shot } = L;
const http = require('http');
const MODE = process.argv[2] || 'all', BASE = L.BASE;
const Q = 'debug=1&quality=medium&aa=0&scale=0.4';
const THROTTLE = { slow: { latency: 80, downloadThroughput: 120000, uploadThroughput: 100000 }, venue: { latency: 100, downloadThroughput: 1000000, uploadThroughput: 250000 } };
const get = (path) => new Promise((res, rej) => http.get(BASE + path, (r) => { let b = ''; r.on('data', (d) => { b += d; }); r.on('end', () => res(b)); }).on('error', rej));
const serverLog = async () => JSON.parse(await get('/__log'));
const MANAGED = /^\/(yas-bloom\/(staff|realism|collections|design-studio|profile)\/|yas-bloom\/film\/[a-z0-9-]+-poster\.jpg|brand\/ikhtarha\/(hero-wide\.jpg|logo-light-1040\.webp))/;
const managedHits = (log) => log.filter((e) => MANAGED.test(e.url.split('?')[0]) && e.status !== 503);

async function open(browser, { rate = 'venue', init, viewport = { width: 1100, height: 650 }, mobile = false, lang = 'en', query = Q, ctx: reuse } = {}) {
  const ctx = reuse || await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, userAgent: mobile ? 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errors = [], cdp = await ctx.newCDPSession(page);
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|ReadPixels|WebGL: INVALID|Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  // hosts that are unreachable from the sandbox (or, for the home page's 4 hero PNGs, irrelevant here and 8 MB of noise on a throttled line) are blocked at once (CDP, which keeps the HTTP cache on)
  await cdp.send('Network.enable'); await cdp.send('Network.setBlockedURLs', { urls: ['*.supabase.co', 'cdn.jsdelivr.net', 'images.unsplash.com', 'd8j0ntlcm91z4.cloudfront.net'].map((h) => '*://' + h + '/*') }); if (THROTTLE[rate]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...THROTTLE[rate] });
  await page.goto(BASE + (lang === 'ar' ? '/ar' : '') + '/yas-bloom?' + query, { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors, cdp };
}
const ready = (page) => page.waitForFunction(() => window.__showroom && window.__showroom.ready, null, { timeout: 280000 });
const viewOf = (page) => page.evaluate(() => { const a = window.__showroom && window.__showroom.assets; return a ? { state: a.view.state, pct: a.view.pct, files: a.view.files, total: a.view.total, fromCache: a.view.fromCache, reason: a.view.reason, active: a.active } : null; });
const caches = (page) => page.evaluate(async () => { const o = {}; for (const n of await caches.keys()) o[n] = (await (await caches.open(n)).keys()).length; return o; });
const done = (page, ms = 280000) => page.waitForFunction(() => { const a = window.__showroom && window.__showroom.assets; return a && (a.view.state === 'done' || a.view.state === 'skipped'); }, null, { timeout: ms });
const walk = async (page) => {   // the wall images really arrive (and look at what the loaders were handed)
  if ((await page.evaluate(() => document.querySelector('.sr-stage').dataset.phase)) !== 'explore') await L.enterExplore(page);   // (the intro may already have ended on its own)
  await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); });
  await page.evaluate(() => window.__showroom.explore.explorer.glideTo('collections')); await page.waitForFunction(() => !window.__showroom.explore.explorer.glide, null, { timeout: 200000 });
  await page.waitForFunction(() => window.__showroom.engine.collections.state.loaded, null, { timeout: 200000 });
  const swatches = await page.evaluate(() => { const im = window.__showroom.engine.collections.state.images, k = Object.values(im).filter(Boolean); return { n: k.length, blob: k.filter((i) => /^blob:/.test(i.src)).length }; });
  await page.evaluate(() => window.__showroom.explore.explorer.glideTo('kitchen-studio')); await page.waitForFunction(() => !window.__showroom.explore.explorer.glide, null, { timeout: 200000 });
  await page.waitForFunction(() => window.__showroom.engine.designStudio.state.loaded, null, { timeout: 200000 });
  return swatches;
};
const PILL = '[data-testid="sr-preload"]';
const KEEP = (browser) => browser.newContext({ viewport: { width: 1100, height: 650 }, deviceScaleFactor: 1 });

async function flow(b) {
  console.log('\n# flow + reload (one browser profile)');
  const ctx = await KEEP(b); await get('/__reset');
  const o = await open(b, { rate: 'slow', ctx }), page = o.page; await ready(page);
  const v0 = await viewOf(page); check('first visit: the preload runs (active, running)', v0 && v0.active && (v0.state === 'running' || v0.state === 'done'), v0);
  const seen = []; for (let i = 0; i < 600; i++) { const v = await viewOf(page); seen.push(v.pct); if (v.state === 'done') break; await page.waitForTimeout(500); }
  check('progress rises monotonically and ends at 100 (real bytes, not a timer)', seen.every((p, i) => i === 0 || p >= seen[i - 1]) && seen[seen.length - 1] === 100 && new Set(seen).size > 3, seen.filter((_, i) => i % Math.ceil(seen.length / 12) === 0));
  await done(page); const c = await caches(page), keys = Object.keys(c).filter((k) => /^yas-bloom-assets-/.test(k)), v1 = await viewOf(page);
  check('one versioned cache holds every managed file of the tier', keys.length === 1 && c[keys[0]] === v1.files && v1.files >= 100, c);
  const pillSeen = await page.evaluate(() => !!document.querySelector('[data-testid="sr-preload"]'));
  const sw = await walk(page); check('the collections wall got all 36 swatches, from the store (blob: sources)', sw.n === 36 && sw.blob === 36, sw);
  const ver = (await page.evaluate(() => window.__showroom.assets.manifest.version));
  check('cache name = yas-bloom-assets-<manifest version>', keys[0] === 'yas-bloom-assets-' + ver, [keys[0], ver]);
  check('no page errors (first visit)', o.errors.length === 0, o.errors.slice(0, 3)); await page.close();
  // ---- reload in the same profile: the managed files must not touch the network
  await get('/__reset'); const o2 = await open(b, { rate: 'venue', ctx }), p2 = o2.page; await ready(p2); await done(p2, 60000);
  const w2 = await walk(p2), hits = managedHits(await serverLog()), v2 = await viewOf(p2);
  check('second visit: ZERO network requests for the managed files', hits.length === 0, hits.slice(0, 5).map((h) => h.url));
  check('second visit: the preload finishes at once, everything from Cache Storage', v2.state === 'done' && v2.fromCache === v2.files, v2);
  check('second visit: the walls still get every image (from Cache Storage)', w2.n === 36 && w2.blob === 36, w2);
  check('second visit: no pill (nothing was downloaded)', !(await p2.evaluate(() => !!document.querySelector('[data-testid="sr-preload"]'))));
  check('no page errors (second visit)', o2.errors.length === 0, o2.errors.slice(0, 3)); await p2.close(); await ctx.close();
}
async function off(b) {
  console.log('\n# ?bloomprefetch=0');
  const o = await open(b, { rate: 'venue', query: Q + '&bloomprefetch=0' }); await ready(o.page); const v = await viewOf(o.page); await get('/__reset');
  check('switched off: state skipped, store inactive', v && v.state === 'skipped' && v.active === false, v);
  const sw = await walk(o.page); const c = await caches(o.page);
  check('switched off: the showroom still works (36 swatches, plain URLs)', sw.n === 36 && sw.blob === 0, sw);
  check('switched off: no asset cache was created', !Object.keys(c).some((k) => /^yas-bloom-assets-/.test(k)), c);
  check('no page errors (off)', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}
async function saver(b) {
  console.log('\n# Save-Data and 2g');
  for (const [name, init] of [['saveData', () => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g', addEventListener() {} }, configurable: true }); }], ['2g', () => { Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: '2g', addEventListener() {} }, configurable: true }); }]]) {
    const o = await open(b, { rate: 'venue', init }); await ready(o.page); const v = await viewOf(o.page); const c = await caches(o.page);
    check(name + ': skipped, nothing stored', v && v.state === 'skipped' && !Object.keys(c).some((k) => /^yas-bloom-assets-/.test(k)), { v, c });
    const sw = await walk(o.page); check(name + ': the showroom still works', sw.n === 36, sw); check('no page errors (' + name + ')', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  }
}
async function quota(b) {
  console.log('\n# Cache Storage refuses writes (quota)');
  const o = await open(b, { rate: 'venue', init: () => { try { Cache.prototype.put = function () { return Promise.reject(new DOMException('quota', 'QuotaExceededError')); }; } catch (e) { /* ignore */ } } });
  await ready(o.page); await done(o.page); const v = await viewOf(o.page), c = await caches(o.page);
  check('quota: the preload still completes, held in memory', v.state === 'done' && v.files >= 100 && Object.values(c).every((n) => n === 0), { v, c });
  const sw = await walk(o.page); check('quota: the walls get their images (from memory)', sw.n === 36 && sw.blob === 36, sw); check('no page errors (quota)', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}
async function cleanup(b) {
  console.log('\n# old versions are deleted');
  const o = await open(b, { rate: 'venue', init: () => { caches.open('yas-bloom-assets-0000000000').then((c) => c.put('/x', new Response('old'))); caches.open('some-other-cache').then((c) => c.put('/y', new Response('keep'))); } });
  await ready(o.page); await done(o.page); const c = await caches(o.page);
  check('older yas-bloom-assets-* cache deleted, the other cache left alone', !('yas-bloom-assets-0000000000' in c) && 'some-other-cache' in c && Object.keys(c).filter((k) => /^yas-bloom-assets-/.test(k)).length === 1, c); await o.ctx.close();
}
async function ui(b) {
  console.log('\n# progress UI (screenshots)');
  for (const [name, opts] of [['en-desktop', {}], ['ar-desktop', { lang: 'ar' }], ['en-phone', { mobile: true, viewport: { width: 390, height: 844 } }], ['ar-phone', { mobile: true, lang: 'ar', viewport: { width: 390, height: 844 } }]]) {
    // a very slow line so the pill is still "Downloading" when the loading screen is gone
    const o = await open(b, { rate: 'slow', ...opts, query: Q }); await ready(o.page);
    await o.page.waitForFunction(() => document.querySelector('.sr-stage') && document.querySelector('.sr-stage').dataset.loaded === '1', null, { timeout: 120000 });
    const ok = await o.page.waitForSelector(PILL, { timeout: 60000 }).then(() => true, () => false);
    await o.page.waitForTimeout(800);
    const txt = ok ? await o.page.textContent(PILL) : '';
    check(name + ': the pill is visible while downloading', ok && /\d+%/.test(txt), txt);
    if (ok) { check(name + ': wording', opts.lang === 'ar' ? /جارٍ تنزيل المعرض/.test(txt) : /Downloading the showroom/.test(txt), txt); await shot(o.page, 'bloom-preload-pill-' + name, { quality: 88 }); }
    const box = ok ? await o.page.$eval(PILL, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, pe: getComputedStyle(e).pointerEvents, vw: innerWidth }; }) : null;
    check(name + ': small, inside the screen, takes no pointer events', box && box.w < box.vw * 0.8 && box.h < 60 && box.x >= 0 && box.x + box.w <= box.vw && box.pe === 'none', box);
    await o.ctx.close();
  }
}
(async () => {
  const { chromium } = require('/opt/node-tools/node_modules/playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] }); const run = { flow, off, saver, quota, cleanup, ui };
  try { for (const k of Object.keys(run)) if (MODE === 'all' || MODE.split(',').includes(k) || (MODE === 'reload' && k === 'flow')) await run[k](b); }
  finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log('\n' + (L.results.length - bad.length) + '/' + L.results.length + ' checks passed'); if (bad.length) { console.log('FAILED:', bad.map((r) => r.name)); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
