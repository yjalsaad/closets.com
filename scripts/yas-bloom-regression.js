/* Pixel regression of existing pages: build origin/main in one dir and this branch in another, then: node scripts/yas-bloom-regression.js <outDir>. Builds are expected at /home/user/wt-lead/build (main) and /home/user/wt-css/build (branch). Animations make a few pages flaky run-to-run (main vs main also differs): see docs/showroom3d/ADDON-PORT.md. */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { PNG } = require('/opt/node-tools/node_modules/playwright-core/lib/utilsBundle');
const http = require('http'), fs = require('fs'), path = require('path');
const OUT = process.argv[2];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'text/xml' };
function serve(dir, port) {
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(dir, p);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) f = path.join(dir, 'index.html');
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(port, () => res(s));
  });
}
const PAGES = { home: '/', kitchen: '/kitchen', tv: '/tv', office: '/office', wardrobe: '/wardrobes', door: '/doors', booking: '/booking' };
(async () => {
  const sm = await serve('/home/user/wt-lead/build', 5101), sb = await serve('/home/user/wt-css/build', 5102);
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const results = [];
  for (const lang of ['en', 'ar']) for (const [vn, vp] of [['d', { width: 1440, height: 900 }], ['m', { width: 390, height: 844 }]]) {
    for (const [name, url] of Object.entries(PAGES)) {
      const shots = {};
      for (const [tag, port] of [['main', 5101], ['branch', 5102], ['main2', 5101]]) {
        const ctx = await br.newContext({ viewport: vp, reducedMotion: 'reduce', deviceScaleFactor: 1, isMobile: vn === 'm', hasTouch: vn === 'm' });
        await ctx.addInitScript((l) => { try { localStorage.setItem('closets_lang', l); localStorage.setItem('closets_consent', 'x'); } catch (e) {} }, lang);
        await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => r.abort());
        const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
        await pg.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'load' }); await pg.waitForTimeout(2500);
        const meta = await pg.evaluate(() => ({ glassy: document.documentElement.classList.contains('glassy'), back: !!document.querySelector('[data-testid="glass-back"]'), showcase: [...document.querySelectorAll('[data-testid^="showcase-"]')].map((n) => n.dataset.testid), dir: document.documentElement.dir }));
        shots[tag] = { png: await pg.screenshot({ fullPage: true, type: 'png' }), meta, errs };
        if (tag === 'branch') { await pg.screenshot({ path: path.join(OUT, `${lang}-${vn}-${name}.jpg`), type: 'jpeg', quality: 50 }); }
        await ctx.close();
      }
      const cmp = (a, b) => { if (a.equals(b)) return 0; const A = PNG.sync.read(a), B = PNG.sync.read(b); if (A.width !== B.width || A.height !== B.height) return -1; let n = 0; for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) n++; return n; };
      const r = { lang, vp: vn, page: name, mainVsBranch: cmp(shots.main.png, shots.branch.png), mainVsMain: cmp(shots.main.png, shots.main2.png), glassMain: JSON.stringify(shots.main.meta), glassBranch: JSON.stringify(shots.branch.meta), errsBranch: shots.branch.errs.length, errsMain: shots.main.errs.length };
      results.push(r); console.log(JSON.stringify(r));
    }
  }
  fs.writeFileSync(path.join(OUT, 'regression.json'), JSON.stringify(results, null, 1));
  await br.close(); sm.close(); sb.close();
})();
