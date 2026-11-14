/* Pixel regression of EXISTING pages, origin/main build vs this branch's build, N samples each with identical settling.
 *   MAIN_BUILD=/path/to/main/build BRANCH_BUILD=build node scripts/yas-bloom-regression.js <outDir> <en|ar> <d|m> [samples=5]
 * Setup: reduced motion + all CSS animations/transitions frozen (same injected CSS in both), network idle, fonts ready, page scrolled top to bottom
 * (triggers every reveal) and back, supabase REST mocked with identical fixture rows (so the home projects strip renders), other external requests aborted.
 * Per page: min/max pixel diff main-vs-main (the build's own noise) and main-vs-branch. PASS = every main-vs-branch diff <= max(main-vs-main). */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { PNG } = require('/opt/node-tools/node_modules/playwright-core/lib/utilsBundle');
const http = require('http'), fs = require('fs'), path = require('path');
const [OUT, LANG, VPN, NS] = [process.argv[2], process.argv[3], process.argv[4], Number(process.argv[5] || 5)];
const MAIN = process.env.MAIN_BUILD || '/home/user/wt-lead/build', BRANCH = process.env.BRANCH_BUILD || '/home/user/wt-css/build';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'text/xml' };
const serve = (dir, port) => new Promise((res) => { const s = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) f = path.join(dir, 'index.html'); r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(port, () => res(s)); });
const PAGES = { home: '/', kitchen: '/kitchen', tv: '/tv', office: '/office', wardrobe: '/wardrobes', door: '/doors', booking: '/booking' };
const VP = VPN === 'm' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}';
const ROWS = [1, 2, 3, 4].map((i) => ({ id: i, name: 'Fixture project ' + i, category: ['Kitchens', 'Wardrobes', 'Doors', 'TV Units'][i - 1], location: 'Manama', cover_url: ['/layouts/kitchen/galley.jpg', '/layouts/wardrobe/wardrobe-walkin.jpg', '/layouts/door/sliding.jpg', '/layouts/TV/floating.jpg'][i - 1], active: true, sort_order: i }));
const diff = (a, b) => { if (a.equals(b)) return 0; const A = PNG.sync.read(a), B = PNG.sync.read(b); if (A.width !== B.width || A.height !== B.height) return 1e9; let n = 0; for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) n++; return n; };
(async () => {
  const servers = [await serve(MAIN, 5201 + (LANG === 'ar' ? 10 : 0) + (VPN === 'm' ? 20 : 0)), await serve(BRANCH, 5202 + (LANG === 'ar' ? 10 : 0) + (VPN === 'm' ? 20 : 0))];
  const ports = { main: 5201 + (LANG === 'ar' ? 10 : 0) + (VPN === 'm' ? 20 : 0), branch: 5202 + (LANG === 'ar' ? 10 : 0) + (VPN === 'm' ? 20 : 0) };
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const shot = async (port, url) => {
    const ctx = await br.newContext({ viewport: VP, reducedMotion: 'reduce', isMobile: VPN === 'm', hasTouch: VPN === 'm', deviceScaleFactor: 1 });
    await ctx.addInitScript((l) => { try { localStorage.setItem('closets_lang', l); } catch (e) {} }, LANG);
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { const u = r.request().url(); if (/\/rest\/v1\/website_projects/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(ROWS) }); if (/\/rest\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }); return r.abort(); });
    const pg = await ctx.newPage(); await pg.addInitScript((css) => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, FREEZE);
    await pg.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'load' }); await pg.waitForLoadState('networkidle').catch(() => {}); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(1500);
    await pg.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y <= h; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await pg.waitForLoadState('networkidle').catch(() => {}); await pg.waitForTimeout(1500);
    const meta = await pg.evaluate(() => ({ glassy: document.documentElement.classList.contains('glassy'), back: !!document.querySelector('[data-testid="glass-back"]'), stat: document.querySelectorAll('[data-testid="glass-stat"]').length, strip: document.querySelectorAll('[data-testid="project-strip"]').length, stripPics: document.querySelectorAll('[data-testid^="project-strip-pic"]').length, showcase: document.querySelectorAll('[data-testid^="showcase-"][data-testid$="kitchen"],[data-testid="showcase-tv"],[data-testid="showcase-office"],[data-testid="showcase-wardrobe"],[data-testid="showcase-door"]').length, h: document.documentElement.scrollHeight }));
    const png = await pg.screenshot({ fullPage: true, type: 'png' }); await ctx.close(); return { png, meta };
  };
  const out = [];
  for (const [name, url] of Object.entries(PAGES)) {
    const M = [], B = [];
    for (let i = 0; i < NS; i++) { M.push(await shot(ports.main, url)); B.push(await shot(ports.branch, url)); }
    const mm = [], mb = [];
    for (let i = 0; i < NS; i++) for (let j = i + 1; j < NS; j++) mm.push(diff(M[i].png, M[j].png));
    for (let i = 0; i < NS; i++) for (let j = 0; j < NS; j++) mb.push(diff(M[i].png, B[j].png));
    const bb = []; for (let i = 0; i < NS; i++) for (let j = i + 1; j < NS; j++) bb.push(diff(B[i].png, B[j].png));
    const r = { lang: LANG, vp: VPN, page: name, samples: NS, mainMain: [Math.min(...mm), Math.max(...mm)], branchBranch: [Math.min(...bb), Math.max(...bb)], mainBranch: [Math.min(...mb), Math.max(...mb)], pass: Math.max(...mb) <= Math.max(...mm), metaMain: M[0].meta, metaBranch: B[0].meta };
    out.push(r); console.log(JSON.stringify(r));
    if (!r.pass) { fs.writeFileSync(path.join(OUT, `fail-${LANG}-${VPN}-${name}-main.png`), M[0].png); fs.writeFileSync(path.join(OUT, `fail-${LANG}-${VPN}-${name}-branch.png`), B[0].png); }
  }
  fs.writeFileSync(path.join(OUT, `regression-${LANG}-${VPN}.json`), JSON.stringify(out, null, 1));
  await br.close(); servers.forEach((s) => s.close());
})();
