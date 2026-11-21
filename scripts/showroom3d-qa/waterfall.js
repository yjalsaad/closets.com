/* Request waterfall + walk timeline for the showroom under a throttled network (CDP Network.emulateNetworkConditions), headless Chromium on SwiftShader.
 *
 *   node scripts/showroom3d-qa/serve-prod.js build 5055 &
 *   BASE=http://localhost:5055 node scripts/showroom3d-qa/waterfall.js <label> [--profile venue|fast|slow|none] [--query "bloomprefetch=0"] [--revisit] [--noWalk] [--lang ar]
 *
 * Output: docs/showroom3d/bloom-preload/<label>.json (every request with start / end / bytes / status / cache source, the load-screen % timeline, long tasks, the marks and per-stage timings) and a console table.
 * The CPU is software GL: the numbers say WHERE the time goes (network vs build vs upload), they are not the iPad's absolute times. The film mp4 files are refused by the server (NOFILM=1 on serve-prod.js: 84 MB of VIP films are measured by vipfilmpreload.js). No page.route() is used: Playwright routing switches the HTTP cache off, which would make a second visit meaningless.
 * --revisit opens a second page in the SAME browser context (same HTTP cache + Cache Storage) and measures it too. */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const BASE = process.env.BASE || 'http://localhost:5055';
const PROFILES = { venue: { latency: 100, downloadThroughput: 1000000, uploadThroughput: 250000 }, fast: { latency: 20, downloadThroughput: 6250000, uploadThroughput: 1250000 }, slow: { latency: 150, downloadThroughput: 400000, uploadThroughput: 100000 }, none: null };
const argv = process.argv.slice(2), label = argv[0] || 'run', arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const PROFILE = arg('profile', 'venue'), QUERY = arg('query', ''), REVISIT = !!arg('revisit', false), WALK = !arg('noWalk', false), LANG = arg('lang', 'en'), TIER = arg('tier', 'medium'), SCALE = arg('scale', '0.4');
const BLOCK = ['*.supabase.co', 'cdn.jsdelivr.net', 'images.unsplash.com'].concat(arg('noHomeImgs', false) ? ['d8j0ntlcm91z4.cloudfront.net'] : []);   // not reachable from the sandbox anyway; --noHomeImgs also drops the home page's 4 hero PNGs (8.4 MB) that index.html pulls in (blocked through CDP, which keeps the HTTP cache on)
const OUTDIR = path.resolve(__dirname, '../../docs/showroom3d/bloom-preload'); fs.mkdirSync(OUTDIR, { recursive: true });

const INIT = () => {
  window.__lt = []; window.__pct = []; window.__t0 = performance.now();
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch (e) { /* ignore */ }
  window.__at = {}; setInterval(() => { try { const e = window.__showroom && window.__showroom.engine; if (e && !window.__at.realism && (e.realism === 'ready' || e.realism === 'procedural')) window.__at.realism = Math.round(performance.now()); if (e && !window.__at.gallery && e.gallery && e.gallery.group.children.every((c) => c.material && c.material.map)) window.__at.gallery = Math.round(performance.now()); const a = window.__showroom && window.__showroom.assets; if (a && !window.__at.preload && (a.view.state === 'done' || a.view.state === 'skipped')) window.__at.preload = Math.round(performance.now()); } catch (x) { /* ignore */ } }, 50);
  setInterval(() => { const el = document.querySelector('.sr-pct'); if (el) { const v = parseInt(el.textContent, 10); const l = window.__pct[window.__pct.length - 1]; if (!l || l[1] !== v) window.__pct.push([Math.round(performance.now()), v]); } }, 100);
};
const sec = (ms) => (ms / 1000).toFixed(1) + 's';

async function visit(ctx, name) {
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page), reqs = new Map(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(INIT);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: false }); await cdp.send('Network.setBlockedURLs', { urls: BLOCK.map((h) => '*://' + h + '/*') });
  if (PROFILES[PROFILE]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[PROFILE] });
  let nav0 = 0;
  cdp.on('Network.requestWillBeSent', (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, type: e.type, t: e.wallTime * 1000 - nav0, ts: e.timestamp, initiator: e.initiator && e.initiator.type }); });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (!r) return; const h = e.response.headers || {}; Object.assign(r, { status: e.response.status, mime: e.response.mimeType, fromDisk: !!e.response.fromDiskCache, fromSW: !!e.response.fromServiceWorker, enc: h['content-encoding'] || '', cc: h['cache-control'] || '', len: Number(h['content-length'] || 0), tResp: (e.timestamp - r.ts) * 1000 }); });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) Object.assign(r, { bytes: e.encodedDataLength, dur: (e.timestamp - r.ts) * 1000 }); });
  cdp.on('Network.loadingFailed', (e) => { const r = reqs.get(e.requestId); if (r) Object.assign(r, { bytes: 0, failed: true, dur: (e.timestamp - r.ts) * 1000 }); });
  cdp.on('Network.requestServedFromCache', (e) => { const r = reqs.get(e.requestId); if (r) r.memCache = true; });
  const marks = new Proxy({}, { set(o, k, v) { o[k] = v; console.log('  mark', k, sec(v)); return true; } }), stages = new Proxy({}, { set(o, k, v) { o[k] = v; console.log('  stage', k, /Req0$|^programs/.test(k) ? v : sec(v)); return true; } }); const t = () => Date.now() - nav0;
  nav0 = Date.now();
  const url = '/yas-bloom' + (LANG === 'ar' ? '' : '') + '?debug=1&quality=' + TIER + '&aa=0&scale=' + SCALE + (QUERY ? '&' + QUERY : '');
  await page.goto((LANG === 'ar' ? BASE + '/ar' : BASE) + url, { waitUntil: 'commit' });
  marks.shell = t(); await page.waitForLoadState('domcontentloaded'); marks.dcl = t();
  await page.waitForSelector('.sr-loading, [data-testid="sr-loading"], .sr-stage', { timeout: 120000 }).catch(() => {}); marks.stageMounted = t();
  await page.waitForFunction(() => window.__showroom && window.__showroom.ready, null, { timeout: 280000, polling: 100 }); marks.ready = t();
  await page.waitForFunction(() => { const s = document.querySelector('.sr-stage'); return s && s.dataset.loaded === '1'; }, null, { timeout: 120000, polling: 100 }); marks.loaderGone = t();
  // enter explore (skip the intro) so the walk starts: a real "first interactive frame" is the moment the skip button exists
  await page.waitForSelector('[data-testid="sr-skip"]', { timeout: 120000 }); marks.skipVisible = t();
  for (let i = 0; i < 60; i++) { const ph = await page.evaluate(() => { const b = document.querySelector('[data-testid="sr-skip"]'); if (b) b.click(); const st = document.querySelector('.sr-stage'); return st && st.dataset.phase; }); if (ph === 'explore') break; await page.waitForTimeout(1200); }
  await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 }); marks.explore = t();
  await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); });
  const inflight = () => [...reqs.values()].filter((r) => r.bytes === undefined && !r.failed && !/^data:|^blob:/.test(r.url) && !/\.mp4/.test(r.url)).length;
  const idle = async (quiet = 1500, max = 90000) => { const s = Date.now(); let last = Date.now(); while (Date.now() - s < max) { if (inflight() > 0) last = Date.now(); if (Date.now() - last > quiet) return t(); await page.waitForTimeout(200); } return -1; };
  if (WALK) {
    // hall: everything the realism pass fetches after the first frame (textures, HDRI, YAS Wood frames, kiosk portraits)
    const h0 = t(); await page.waitForFunction(() => { const e = window.__showroom.engine; return e.realism === 'ready' || e.realism === 'procedural'; }, null, { timeout: 280000, polling: 200 });
    stages.hallRealismMs = t() - h0; marks.realism = t(); stages.hallIdleAt = await idle(); stages.programsHall = await page.evaluate(() => window.__showroom.engine.renderer.info.programs.length);
    const mark = (n) => { stages[n + 'Req0'] = [...reqs.values()].filter((r) => r.mime !== undefined || r.bytes !== undefined).length; };
    // collections wall: glide there, time until the swatches are on the wall
    mark('collections'); const c0 = t(); await page.evaluate(() => window.__showroom.explore.explorer.glideTo('collections'));
    await page.waitForFunction(() => !window.__showroom.explore.explorer.glide, null, { timeout: 200000, polling: 200 }); stages.collectionsArriveMs = t() - c0;
    await page.waitForFunction(() => window.__showroom.engine.collections.state.loaded, null, { timeout: 200000, polling: 100 }); stages.collectionsReadyMs = t() - c0; stages.collectionsIdleAt = await idle(800, 30000);
    mark('studio'); const s0 = t(); await page.evaluate(() => window.__showroom.explore.explorer.glideTo('kitchen-studio'));
    await page.waitForFunction(() => !window.__showroom.explore.explorer.glide, null, { timeout: 200000, polling: 200 }); stages.studioArriveMs = t() - s0;
    await page.waitForFunction(() => window.__showroom.engine.designStudio.state.loaded, null, { timeout: 200000, polling: 100 }); stages.studioReadyMs = t() - s0; stages.studioIdleAt = await idle(800, 30000);
    mark('vip'); const v0 = t(); await page.evaluate(() => window.__showroom.explore.teleport(0, -30.2, 0, 0.05)); await page.waitForTimeout(500); await page.keyboard.press('KeyE');
    await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 60000 }).catch(() => {}); stages.vipPanelMs = t() - v0; stages.programsEnd = await page.evaluate(() => window.__showroom.engine.renderer.info.programs.length);
    await page.waitForTimeout(3000); stages.vipIdleAt = await idle(1500, 60000); stages.vipEnd = t();
  } else stages.hallIdleAt = await idle();
  const gl = await page.evaluate(() => { try { const e = window.__showroom.engine, i = e.renderer.info; return { programs: i.programs ? i.programs.length : null, textures: i.memory.textures, geometries: i.memory.geometries, calls: i.render.calls }; } catch (x) { return null; } });
  const inPage = await page.evaluate(() => ({ at: window.__at, lt: window.__lt, pct: window.__pct, t0: window.__t0, nav: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null; })(), caches: null }));
  const store = await page.evaluate(async () => { try { const names = await caches.keys(), out = {}; for (const n of names) out[n] = (await (await caches.open(n)).keys()).length; return out; } catch (e) { return { error: String(e) }; } });
  const list = [...reqs.values()].filter((r) => !/^data:|^blob:/.test(r.url)).map((r) => ({ u: r.url.replace(/^https?:\/\/[^/]+/, ''), type: r.type, t: Math.round(r.t), dur: Math.round(r.dur || 0), bytes: r.bytes || 0, status: r.status, mime: r.mime, enc: r.enc, cc: r.cc, fromDisk: r.fromDisk, mem: !!r.memCache, sw: r.fromSW }));
  await page.close();
  return { name, marks, stages, gl, at: inPage.at, requests: list, lt: inPage.lt, pct: inPage.pct, nav: inPage.nav, cacheStorage: store, errors };
}
function summarize(r) {
  const net = r.requests.filter((q) => !q.mem && !q.fromDisk && q.status !== 304 && q.status), reval = r.requests.filter((q) => q.status === 304), cached = r.requests.filter((q) => q.mem || q.fromDisk);
  const sumB = (a) => a.reduce((s, q) => s + q.bytes, 0), group = (re) => r.requests.filter((q) => re.test(q.u));
  const g = { js: group(/\.js(\?|$)/), css: group(/\.css(\?|$)/), 'yas-bloom images': group(/\/yas-bloom\/.*\.(webp|jpg|png)/), hdr: group(/\.hdr/), json: group(/\.json/), other: [] };
  console.log(`\n== ${r.name}  (${PROFILE}) ==`);
  console.log('in-page (s since navigation start)', JSON.stringify(Object.fromEntries(Object.entries(r.at || {}).map(([k, v]) => [k, sec(v)]))));
  console.log('marks', Object.fromEntries(Object.entries(r.marks).map(([k, v]) => [k, sec(v)])));
  console.log('stages', Object.fromEntries(Object.entries(r.stages).map(([k, v]) => [k, /Req0$|^programs/.test(k) ? v : sec(v)])));
  console.log(`requests ${r.requests.length}: network ${net.length} (${(sumB(net) / 1024).toFixed(0)} KB), 304-revalidations ${reval.length}, from browser cache ${cached.length}`);
  for (const [k, a] of Object.entries(g)) if (a.length) console.log(`  ${k}: ${a.length} req, ${(sumB(a) / 1024).toFixed(0)} KB over the wire, ${a.filter((q) => q.status === 304).length} x 304`);
  console.log('cache storage', JSON.stringify(r.cacheStorage), 'long tasks', r.lt.length, 'blocked', r.lt.reduce((s, x) => s + x[1], 0) + ' ms', 'errors', r.errors.length);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] }), ctxctx = await browser.newContext({ viewport: { width: Number(arg('w', 800)), height: Number(arg('h', 500)) }, deviceScaleFactor: 1, locale: LANG === 'ar' ? 'ar' : 'en-US' });
  const ctx = await browser.newContext({ viewport: { width: Number(arg('w', 800)), height: Number(arg('h', 500)) }, deviceScaleFactor: 1, locale: LANG === 'ar' ? 'ar' : 'en-US' });
  const out = { label, profile: PROFILE, query: QUERY, base: BASE, visits: [] };
  const v1 = await visit(ctx, label + ' (first visit)'); out.visits.push(v1); summarize(v1);
  if (REVISIT) { const v2 = await visit(ctx, label + ' (second visit, same browser profile)'); out.visits.push(v2); summarize(v2); }
  fs.writeFileSync(path.join(OUTDIR, label + '.json'), JSON.stringify(out, null, 1)); console.log('written', path.join(OUTDIR, label + '.json'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
