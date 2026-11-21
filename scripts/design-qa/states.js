/* eslint-disable */
// axe on interactive states: mega menu, mobile drawer, cart drawer, sign-in dialog, consent strip, keyboard focus ring. Faked backend.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const BUILD = process.env.BUILD || '/tmp/webbuild-design', OUT = process.env.OUT || '/tmp/states', PORT = 4290;
fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(BUILD, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) f = path.join(BUILD, 'index.html'); s.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); }).listen(PORT);
const SV = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#9c8468"/></svg>';
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const theme of ['warm', 'sea']) for (const [lang, vp] of [['en', 'd'], ['ar', 'd'], ['en', 'm'], ['ar', 'm']]) {
    const ctx = await b.newContext({ viewport: vp === 'd' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, isMobile: vp === 'm', reducedMotion: 'reduce' });
    await ctx.addInitScript((l) => { try { localStorage.setItem('closets_lang', l); } catch (e) {} }, lang);
    await ctx.route((u) => !u.href.startsWith('http://localhost:' + PORT), (r) => /supabase/.test(r.request().url()) ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.request().resourceType() === 'image' ? r.fulfill({ status: 200, contentType: 'image/svg+xml', body: SV }) : r.abort());
    const pg = await ctx.newPage();
    const axe = async (name) => { await pg.addScriptTag({ path: '/home/user/closets.com/node_modules/axe-core/axe.min.js' }); const v = await pg.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => x.id + 'x' + x.nodes.length + ' ' + x.nodes[0].target.join(' ').slice(0, 80))); res.push({ theme, lang, vp, name, v }); console.log(theme, lang, vp, name, v.join(' | ') || 'clean'); };
    const go = async (u) => { await pg.goto(`http://localhost:${PORT}${u}${u.includes('?') ? '&' : '?'}theme=${theme}`, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(1200); };
    await go('/'); await axe('home+consent-strip');                       // first visit: consent strip visible
    await pg.screenshot({ path: `${OUT}/${theme}-${lang}-${vp}-consent.png` });
    await pg.evaluate(() => localStorage.setItem('closets_consent_v2', JSON.stringify({ v: 2, decided: true, analytics: false, ai: false, ts: 1 }))); await go('/');
    if (vp === 'd') { await pg.locator('[data-mega-trigger="kitchens"]').first().hover(); await pg.waitForTimeout(500); await axe('mega-menu'); await pg.screenshot({ path: `${OUT}/${theme}-${lang}-${vp}-mega.png` }); await pg.keyboard.press('Escape'); }
    else { await pg.locator('.nav-burger').click(); await pg.waitForTimeout(500); await pg.locator('.drawer__row').first().click(); await pg.waitForTimeout(300); await axe('mobile-drawer'); await pg.screenshot({ path: `${OUT}/${theme}-${lang}-${vp}-drawer.png` }); await pg.keyboard.press('Escape'); }
    await go('/?cart=1'); await pg.waitForTimeout(600); await axe('cart-drawer'); await pg.screenshot({ path: `${OUT}/${theme}-${lang}-${vp}-cart.png` });
    await go('/'); await pg.locator('button[aria-label="Sign In"], button[aria-label="تسجيل الدخول"]').first().click().catch(() => {}); await pg.waitForTimeout(500); await axe('auth-dialog'); await pg.screenshot({ path: `${OUT}/${theme}-${lang}-${vp}-auth.png` });
    await ctx.close();
  }
  fs.writeFileSync(OUT + '/states.json', JSON.stringify(res, null, 1)); await b.close(); srv.close();
})();
