/* eslint-disable */
// Design QA harness: serves a production build (BUILD env) with SPA fallback, fakes every backend call, screenshots routes,
// optionally runs axe (AXE=1) and records overflow. Nothing real is contacted.
//   BUILD=/tmp/webbuild-design OUT=/tmp/shots THEMES=warm,sea LANGS=en,ar VPS=d,m ROUTES=/,/kitchen FULL=1 AXE=1 node shoot.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const BUILD = process.env.BUILD || '/tmp/webbuild-design';
const OUT = process.env.OUT || '/tmp/design-shots';
const THEMES = (process.env.THEMES || 'warm').split(','), LANGS = (process.env.LANGS || 'en').split(','), VPS = (process.env.VPS || 'd').split(',');
const ROUTES = (process.env.ROUTES || '/').split(',');
const FULL = process.env.FULL === '1', AXE = process.env.AXE === '1';
const PORT = +(process.env.PORT || 4181);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.mp4': 'video/mp4' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(BUILD, p);
  if (!f.startsWith(BUILD)) f = path.join(BUILD, 'index.html');
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) f = path.join(BUILD, 'index.html');
  s.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
}).listen(PORT);
// stand-in for hotlinked stock photos so layout/crop can be judged (NOT a real photo; real assets are listed in docs/design/ASSETS-NEEDED.md)
const STANDIN = (n) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cdb99d"/><stop offset="1" stop-color="#7d5f45"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><rect x="${200 + (n % 5) * 40}" y="140" width="520" height="720" fill="#3b2a1e" opacity=".55"/><rect x="760" y="300" width="640" height="560" fill="#e9dfd0" opacity=".5"/><rect x="0" y="860" width="1600" height="140" fill="#2a1d14" opacity=".45"/></svg>`;
let n = 0;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const report = [];
  for (const theme of THEMES) for (const lang of LANGS) for (const vp of VPS) {
    const W = vp === 'd' ? 1440 : 390, H = vp === 'd' ? 900 : 844;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: vp === 'm', hasTouch: vp === 'm' });
    if (process.env.CONSENT === 'none') await ctx.addInitScript(() => { window.__NOCONSENT = true; });
    await ctx.addInitScript((l) => { try { localStorage.setItem('closets_lang', l); if (!window.__NOCONSENT) localStorage.setItem('closets_consent_v2', JSON.stringify({ v: 2, decided: true, analytics: false, ai: false, ts: 1 })); } catch (e) {} }, lang);
    await ctx.route((u) => !u.href.startsWith('http://localhost:' + PORT), (r) => {
      const u = r.request().url();
      if (/supabase\.co/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      if (/images\.unsplash|pexels|cloudfront|\.(jpg|jpeg|png|webp)(\?|$)/i.test(u) || r.request().resourceType() === 'image') return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: STANDIN(n++) });
      return r.abort();
    });
    const pg = await ctx.newPage();
    for (const r of ROUTES) {
      const rec = { theme, lang, vp, route: r, errs: [] };
      pg.removeAllListeners('console'); pg.removeAllListeners('pageerror');
      pg.on('pageerror', (e) => rec.errs.push('PAGEERR ' + e.message.slice(0, 140)));
      try {
        const url = `http://localhost:${PORT}${lang === 'ar' && process.env.ARURL ? '/ar' + (r === '/' ? '' : r) : r}${r.includes('?') ? '&' : '?'}theme=${theme}`;
        await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); await pg.waitForTimeout(1800);
        const h = await pg.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < Math.min(h, 14000); y += 600) { await pg.evaluate((y) => window.scrollTo(0, y), y); await pg.waitForTimeout(90); }
        await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(400);
        Object.assign(rec, await pg.evaluate(() => ({ h: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, iw: innerWidth, theme: document.documentElement.dataset.theme, dir: document.documentElement.dir, h1: (document.querySelector('h1') || {}).innerText, font: getComputedStyle(document.querySelector('h1') || document.body).fontFamily.slice(0, 40) })));
        const fn = `${theme}-${lang}-${vp}-${r === '/' ? 'home' : r.slice(1).replace(/[\/?=&]/g, '_')}.png`; rec.shot = fn;
        await pg.screenshot({ path: path.join(OUT, fn), fullPage: FULL, timeout: 40000 }).catch(async (e) => { rec.shotErr = e.message.slice(0, 80); await pg.screenshot({ path: path.join(OUT, fn) }); });
        if (AXE) {
          await pg.addScriptTag({ path: '/home/user/closets.com/node_modules/axe-core/axe.min.js' });
          const res = await pg.evaluate(async () => { const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }); return r.violations.map((v) => ({ id: v.id, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((x) => x.target.join(' ') + ' :: ' + ((x.any[0] || {}).message || '').slice(0, 90)) })); });
          rec.axe = res;
        }
      } catch (e) { rec.fail = e.message.slice(0, 120); }
      report.push(rec);
      console.log(theme, lang, vp, r, 'h=' + rec.h, rec.sw > rec.iw ? 'HSCROLL' + (rec.sw - rec.iw) : '', rec.fail || '', rec.axe ? 'axe:' + rec.axe.map((v) => v.id + 'x' + v.n).join(',') : '', rec.errs.length ? 'ERR' + rec.errs.length : '');
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await b.close(); srv.close();
})();
