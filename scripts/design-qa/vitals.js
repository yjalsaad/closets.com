/* eslint-disable */
// LCP / FCP / CLS / transfer for a prerendered build under CDP throttling. Hotlinked photos are replaced by a 170 KB stand-in (same as docs/PERF-REPORT.md).
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const BUILD = process.env.BUILD || '/tmp/webbuild-design', PORT = 4291;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(BUILD, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) f = path.join(BUILD, 'index.html'); const buf = zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }); s.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'content-encoding': 'br', 'cache-control': 'max-age=0, must-revalidate' }); s.end(buf); }).listen(PORT);
const JPG = Buffer.alloc(170 * 1024, 7);
(async () => {
  const b = await chromium.launch();
  for (const [name, vp, net, cpu] of [['desktop', { width: 1440, height: 900 }, { d: 10e6 / 8, u: 5e6 / 8, l: 40 }, 1], ['mobile', { width: 390, height: 844 }, { d: 1.6e6 / 8, u: 0.75e6 / 8, l: 562 }, 4]]) for (const route of ['/', '/kitchen', '/booking']) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: name === 'mobile' ? 2 : 1, isMobile: name === 'mobile' });
    await ctx.addInitScript(() => { try { localStorage.setItem('closets_consent_v2', JSON.stringify({ v: 2, decided: true, analytics: false, ai: false, ts: 1 })); } catch (e) {} });
    await ctx.route((u) => !u.href.startsWith('http://localhost:' + PORT), (r) => /supabase/.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.request().resourceType() === 'image' ? r.fulfill({ status: 200, contentType: 'image/jpeg', body: JPG }) : r.abort());
    const pg = await ctx.newPage(); const cdp = await ctx.newCDPSession(pg);
    await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: net.d, uploadThroughput: net.u, latency: net.l }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await pg.addInitScript(() => { window.__m = { lcp: 0, cls: 0 }; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    let bytes = 0; cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
    await pg.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load', timeout: 120000 }); await pg.waitForTimeout(2500);
    const m = await pg.evaluate(() => ({ ...window.__m, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime }));
    console.log(name, route, 'FCP', Math.round(m.fcp), 'LCP', Math.round(m.lcp), 'CLS', m.cls.toFixed(3), 'transfer KB', Math.round(bytes / 1024));
    await ctx.close();
  }
  await b.close(); srv.close();
})();
