const { chromium } = require('/opt/node-tools/node_modules/playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/user/wt-bloommeet/build', PORT = 3071, OUT = '/home/user/wt-bloommeet/docs/screens/bloom-film-missing'; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.vtt': 'text/vtt', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'index.html'); const st = fs.statSync(f), ext = path.extname(f), h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
  const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || ''); if (m) { const s = +m[1], e = m[2] ? +m[2] : st.size - 1; r.writeHead(206, { ...h, 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Content-Length': e - s + 1 }); fs.createReadStream(f, { start: s, end: e }).pipe(r); } else { r.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(f).pipe(r); } }).listen(PORT);
const SCEN = { 'A-blocked-autoplay+blob-error': { init: true }, 'B-v4-files-fail': { block: /journey4-/ }, 'C-every-film-fails': { block: /journey\d?-(720|1080)\.mp4/ } };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=document-user-activation-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, sc] of Object.entries(SCEN)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
    await ctx.addInitScript((sc) => { try { localStorage.setItem('closets_consent_v2', JSON.stringify({ v: 2, decided: true, analytics: false, ai: false, ts: 1 })); } catch (e) {}
      if (sc.init) { const P = HTMLMediaElement.prototype.play; let first = true; HTMLMediaElement.prototype.play = function () { if (first) { first = false; return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })); } return P.call(this); };
        const d = Object.getOwnPropertyDescriptor(Element.prototype, 'setAttribute'); const sa = Element.prototype.setAttribute; Element.prototype.setAttribute = function (k, v) { sa.call(this, k, v); if (this instanceof HTMLVideoElement && k === 'src' && String(v).startsWith('blob:')) setTimeout(() => this.dispatchEvent(new Event('error')), 50); };
        const des = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src'); Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, get: des.get, set(v) { des.set.call(this, v); if (this instanceof HTMLVideoElement && String(v).startsWith('blob:')) setTimeout(() => this.dispatchEvent(new Event('error')), 50); } }); } }, sc);
    await ctx.route((u) => !u.href.startsWith('http://localhost:' + PORT), (r) => /supabase\.co/.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.abort());
    if (sc.block) await ctx.route(sc.block, (r) => r.abort());
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    await pg.goto(`http://localhost:${PORT}/yas-bloom?meeting=1&debug=1&film=v3-animated`, { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.__showroom && window.__showroom.explore, null, { timeout: 90000 }); await pg.waitForFunction(() => window.__showroom.explore.explorer.film, null, { timeout: 120000 }); await pg.evaluate(async () => { const F = window.__showroom.explore.explorer.film; F.select('journey-active'); await F.load(); }); await pg.waitForFunction(() => window.__showroom.explore.explorer.film.state.status !== 'loading', null, { timeout: 60000 }); await pg.evaluate(() => window.__showroom.explore.explorer.focusBloom && 0); await pg.waitForTimeout(500);
    const get = () => pg.evaluate(() => { const F = window.__showroom.explore.explorer.film; const s = F.state; return { status: s.status, id: s.id, src: s.src }; });
    const log = [await get()];
    await pg.evaluate(() => { const e = window.__showroom.explore.explorer; if (e.film) e.film.play(); }); await pg.waitForTimeout(4000); log.push(await get());
    await pg.evaluate(() => { const e = window.__showroom.explore.explorer; if (e.film) e.film.play(); }); await pg.waitForTimeout(8000); const last = await get(); log.push(last);
    const seen = await pg.evaluate(() => window.__showroom.explore.explorer.film.state.status);
    console.log(name, JSON.stringify(log), 'NEVER-MISSING:', log.every((x) => x.status !== 'missing'), errs.slice(0, 2).join('|'));
    await pg.screenshot({ path: `${OUT}/${name}.png` }); await ctx.close();
  }
  await b.close(); srv.close();
})();
