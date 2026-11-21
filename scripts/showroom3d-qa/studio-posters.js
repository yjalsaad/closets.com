/* Generates the poster frames of the YAS Bloom design wall screen from the REAL website designers (never mock-ups):
 *   node scripts/showroom3d-qa/studio-posters.js [kitchen|tv]   (default kitchen; BASE=http://localhost:5055 serves a CRA build of the site; OUT defaults to public/yas-bloom/design-studio)
 * TV: /studio/tv as a GUEST (no account at all), header hidden exactly as in the showroom frame, the price chip hidden (the TV category still runs on placeholder rates: the wall shows no price), 1600 x 900:
 *   1 = Units (2D elevation, the default floating 65" wall with towers), 2 = TV & niche in 3D (Evening look), 3 = the 85" cinema-wall preset, Panel & LED, 3D (Daylight look). tv-<n>-<lang>.webp.
 * KITCHEN:
 * Per language it drives /design-studio/kitchen-planner (signed-in test customer in localStorage, as a visitor would be) to three states and screenshots the designer below
 * the site header at 1600 x 900: 1 = Layout (U-shape, photo cards + plan), 2 = Materials in 3D (veneer doors, marble top), 3 = Summary & quote (bill of materials, total).
 * Files: kitchen-<n>-<lang>.webp (WebP, 1600 x 900, <= 190 KB each). It also writes posters.json: the BHD total the designer showed in each frame (the wall shows real numbers).
 * The site loads three.js r128 from cdnjs at runtime for its 3D view; in an offline sandbox pass THREE_R128=/path/to/three.min.js to serve that exact file. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { launch } = require('./lib');
const BASE = process.env.BASE || 'http://localhost:5055';
const OUT = process.env.POSTER_OUT || path.resolve(__dirname, '../../public/yas-bloom/design-studio');
const RAW = process.env.RAW || path.join(require('os').tmpdir(), 'ds-poster-raw');
const THREE = process.env.THREE_R128 || '';
const W = 1600, H = 900, HEADER = 104, MAX = 190 * 1024;
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(RAW, { recursive: true });

function toWebp(png, out) {
  const code = 'import sys\nfrom PIL import Image\nsrc,dst,maxb=sys.argv[1],sys.argv[2],int(sys.argv[3])\nim=Image.open(src).convert("RGB")\nfor q in (86,82,78,74,70,66,60,54,48):\n    im.save(dst,"WEBP",quality=q,method=6)\n    import os\n    if os.path.getsize(dst)<=maxb: break\nprint(os.path.getsize(dst),q)';
  return execFileSync('python3', ['-I', '-c', code, png, out, String(MAX)]).toString().trim();
}

const WHICH = process.argv[2] === 'tv' ? 'tv' : 'kitchen';
async function tv(browser, report) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: lang === 'ar' ? 'ar' : 'en' });
    await ctx.addInitScript((l) => { try { localStorage.setItem('closets_consent', 'declined'); localStorage.setItem('closets_lang', l); } catch (e) { /* ignore */ } }, lang);   // a guest: no account, no saved design
    if (THREE) await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', (r) => r.fulfill({ path: THREE, contentType: 'text/javascript' }));
    const p = await ctx.newPage();
    await p.goto(BASE + '/studio/tv', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('[data-testid="cat-page-tv"]', { timeout: 60000 }); await sleep(3000);
    await p.addStyleTag({ content: '.ws-bar{display:none!important}.ws-root{--ws-bar-h:0px!important}html{overflow:hidden!important}[data-testid="cat-price"]{display:none!important}' });
    await sleep(800);
    const shot = async (n) => { const png = path.join(RAW, `tv-${n}-${lang}.png`); await p.screenshot({ path: png, clip: { x: 0, y: 0, width: W, height: H } }); const r = toWebp(png, path.join(OUT, `tv-${n}-${lang}.webp`)); report[`tv-${n}-${lang}`] = { bytes: r }; console.log(lang, n, r); };
    const mode3d = () => p.locator('button', { hasText: /^\s*(3D View|ثلاثي)\s*$/ }).first().click();
    await shot(1);                                                                                   // Units tab, 2D elevation
    await p.click('.nk-rt[data-tab="global"]'); await sleep(300); await p.click('.nk-look-card[data-look="evening"]'); await sleep(300);
    await p.click('.nk-rt[data-tab="tv"]'); await sleep(300); await mode3d(); await sleep(THREE ? 7000 : 2500); await shot(2);   // TV & niche, 3D, Evening
    await p.click('.nk-rt[data-tab="global"]'); await sleep(300); await p.click('.nk-look-card[data-look="daylight"]'); await sleep(300);
    await p.click('.nk-rt[data-tab="units"]'); await sleep(300); await p.click('[data-testid="preset-wall85"]'); await sleep(500);
    await p.click('.nk-rt[data-tab="panel"]'); await sleep(THREE ? 5000 : 1500); await shot(3);      // the 85" cinema-wall preset, Panel & LED, 3D (Daylight look)
    await ctx.close();
  }
}

(async () => {
  const browser = await launch(), report = fs.existsSync(path.join(OUT, 'posters.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'posters.json'), 'utf8')) : {};
  if (WHICH === 'tv') { await tv(browser, report); fs.writeFileSync(path.join(OUT, 'posters.json'), JSON.stringify(report, null, 1) + '\n'); await browser.close(); return; }
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H + HEADER }, deviceScaleFactor: 1, locale: lang === 'ar' ? 'ar' : 'en' });
    await ctx.addInitScript((l) => { try { localStorage.setItem('closets_user', JSON.stringify({ id: 'poster', name: 'Poster', email: 'poster@example.test', phone: '33333333' })); localStorage.setItem('closets_consent', 'declined'); localStorage.setItem('closets_lang', l); } catch (e) { /* ignore */ } }, lang);
    if (THREE) await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', (r) => r.fulfill({ path: THREE, contentType: 'text/javascript' }));
    const p = await ctx.newPage();
    await p.goto(BASE + '/design-studio/kitchen-planner', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#root button', { timeout: 60000 }); await p.waitForTimeout(3500);
    await p.addStyleTag({ content: 'footer{display:none!important}html,body{overflow:hidden!important}nav{display:none!important}' });
    const next = async (n) => { for (let i = 0; i < n; i++) { await p.locator('button', { hasText: /Next|التالي|التالى/ }).last().click(); await p.waitForTimeout(700); } };
    const total = () => p.evaluate(() => { const m = document.body.innerText.match(/(?:BD|د\.ب\.?)\s*[\d,]+/g); return m ? m[m.length - 1] : null; });
    const shot = async (n) => { const png = path.join(RAW, `kitchen-${n}-${lang}.png`); await p.screenshot({ path: png, clip: { x: 0, y: HEADER, width: W, height: H } }); const r = toWebp(png, path.join(OUT, `kitchen-${n}-${lang}.webp`)); report[`kitchen-${n}-${lang}`] = { bytes: r, total: await total() }; console.log(lang, n, r, report[`kitchen-${n}-${lang}`].total); };
    await next(3);                                                                                  // Room shape -> Dimensions -> Openings -> Layout
    await p.locator('button:has(img)').nth(3).click(); await p.waitForTimeout(1800); await shot(1);   // U-shape card
    await next(3);                                                                                  // Work triangle -> Cabinets -> Materials
    await p.locator('button', { hasText: /1\.30/ }).first().click(); await p.locator('button', { hasText: /360/ }).first().click(); await p.waitForTimeout(600);
    await p.locator('button:has-text("🎨")').first().locator('xpath=preceding-sibling::button[1]').click();   // the "3D view" tab sits just before "Open Room Designer" (its label is translated)
     await p.waitForTimeout(THREE ? 7000 : 2000); await shot(2);
    await next(2);                                                                                  // Accessories -> Quote
    await p.waitForTimeout(1200); await shot(3);
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'posters.json'), JSON.stringify(report, null, 1) + '\n');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
