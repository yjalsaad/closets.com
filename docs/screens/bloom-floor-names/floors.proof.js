const { chromium } = require('/opt/node-tools/node_modules/playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/user/wt-bloommeet/build', PORT = 3071, OUT = '/home/user/wt-bloommeet/docs/screens/bloom-floor-names'; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.vtt': 'text/vtt', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'index.html'); const st = fs.statSync(f), ext = path.extname(f), h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
  const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || ''); if (m) { const s = +m[1], e = m[2] ? +m[2] : st.size - 1; r.writeHead(206, { ...h, 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Content-Length': e - s + 1 }); fs.createReadStream(f, { start: s, end: e }).pipe(r); } else { r.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(f).pipe(r); } }).listen(PORT);

const CASES = [['phone-en', 390, 844, 'en', true], ['phone-ar-rtl', 390, 844, 'ar', true], ['ipad-en', 1024, 768, 'en', true], ['ipad-ar-rtl', 1024, 768, 'ar', true]].filter((c) => !process.env.ONLY || c[0] === process.env.ONLY);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, W, H, lang, touch] of CASES) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: touch, reducedMotion: 'reduce' });
    await ctx.addInitScript((l) => { try { localStorage.setItem('closets_lang', l); localStorage.setItem('closets_consent_v2', JSON.stringify({ v: 2, decided: true, analytics: false, ai: false, ts: 1 })); } catch (e) {} }, lang);
    await ctx.route((u) => !u.href.startsWith('http://localhost:' + PORT), (r) => /supabase\.co/.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.abort());
    const pg = await ctx.newPage(); await pg.goto(`http://localhost:${PORT}${lang === 'ar' ? '/ar' : ''}/yas-bloom?debug=1&touch=1`, { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('[data-testid="sr-floors"]', { timeout: 120000 }); await pg.waitForTimeout(2500);
    const gotit = await pg.$('text=/Got it|فهمت/'); if (gotit) await gotit.click().catch(() => {}); await pg.waitForTimeout(500);
    const rects = () => pg.evaluate(() => { const r = [...document.querySelectorAll('.sr-hud-top button, .sr-hud-top .sr-floors, .sr-floor')].map((e) => { const b = e.getBoundingClientRect(); return { c: e.className.split(' ')[0] + (e.dataset.floor ? ':' + e.dataset.floor : ''), x: b.left, y: b.top, w: b.width, h: b.height }; }); const btn = r.filter((x) => x.c !== 'sr-floors'); const ov = []; for (let i = 0; i < btn.length; i++) for (let j = i + 1; j < btn.length; j++) { const a = btn[i], c = btn[j]; if (a.x < c.x + c.w - 1 && c.x < a.x + a.w - 1 && a.y < c.y + c.h - 1 && c.y < a.y + a.h - 1) ov.push(a.c + '/' + c.c); } return { floors: btn.filter((x) => x.c.startsWith('sr-floor:')).map((x) => [Math.round(x.w), Math.round(x.h)]), overlaps: ov, hscroll: document.documentElement.scrollWidth > innerWidth, minH: Math.min(...btn.map((x) => x.h)) }; });
    console.log(name, JSON.stringify(await rects()));
    await pg.screenshot({ path: `${OUT}/${name}-hud.png` });
    await pg.evaluate(() => document.querySelector('[data-testid="sr-open-depts"]').click()); await pg.waitForSelector('[data-testid="sr-dept-menu"]'); await pg.waitForTimeout(600); await pg.screenshot({ path: `${OUT}/${name}-departments.png` });
    await pg.click('[data-floorpick="l2"]'); await pg.waitForTimeout(500);
    await ctx.close();
  }
  await b.close(); srv.close();
})();
