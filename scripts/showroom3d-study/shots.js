/* Playwright-style screenshots of the study page (puppeteer + system Chrome): node scripts/showroom3d-study/shots.js <outDir> [baseUrl]
 * Uses ONLY the synthetic fixture next to this file and a generated PNG; never a real study. */
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const path = require('path');
const zlib = require('zlib');
const out = process.argv[2] || 'docs/showroom3d/study', base = process.argv[3] || 'http://localhost:3111';
function png(w, h) { const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 200 - (y * 80) / h; raw[o + 1] = 60 + (x * 90) / w; raw[o + 2] = 70; } }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
(async () => {
  fs.mkdirSync(out, { recursive: true }); const tmp = fs.mkdtempSync('/tmp/yws-'); fs.writeFileSync(path.join(tmp, 'p.png'), png(640, 400));
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader'], headless: 'new' });
  const results = [];
  for (const [name, vw, vh] of [['desktop', 1280, 860], ['m390', 390, 844]]) {
    const ctx = await b.createBrowserContext(); const pg = await ctx.newPage(); await pg.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 }); pg.on('pageerror', (e) => results.push(name + ' pageerror ' + e.message));
    const shot = (n) => pg.screenshot({ path: path.join(out, `${n}-${name}.jpg`), type: 'jpeg', quality: 72 });
    await pg.goto(base + '/yas-bloom/study', { waitUntil: 'networkidle2' }); await pg.waitForSelector('[data-testid=yws-root]');
    results.push(name + ' sample-tag ' + (await pg.$eval('[data-testid=yws-sample-tag]', (e) => e.textContent))); results.push(name + ' robots ' + (await pg.$eval('meta[name=robots]', (e) => e.content)));
    await shot('1-empty-sample');
    await pg.click('[data-testid=yws-import-btn]'); await (await pg.$('[data-testid=yws-import-file]')).uploadFile(path.resolve(__dirname, 'fixture.html')); await pg.waitForSelector('[data-testid=yws-preview]'); await shot('2-import-preview');
    await pg.click('[data-testid=yws-import-use]'); await new Promise((r) => setTimeout(r, 400)); await shot('3-view');
    await pg.click('[data-testid=yws-edit]'); await new Promise((r) => setTimeout(r, 300)); await shot('4-edit');
    await pg.select('.yws-add select', 'cards'); await pg.click('.yws-add button'); await new Promise((r) => setTimeout(r, 200));
    const up = await pg.$('[data-testid=yws-upload]'); await up.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    const fi = await pg.$('.yws-up input[type=file]'); await fi.uploadFile(path.join(tmp, 'p.png')); await pg.waitForSelector('.yws-card img.yws-img', { timeout: 8000 }); await new Promise((r) => setTimeout(r, 300)); await shot('5-upload');
    results.push(name + ' overflowX ' + (await pg.evaluate(() => { const r = document.querySelector('.yws'); return r.scrollWidth - r.clientWidth; })));
    await pg.click('[data-testid=yws-lang]'); await new Promise((r) => setTimeout(r, 300)); await shot('6-arabic-edit'); results.push(name + ' dir ' + (await pg.$eval('.yws', (e) => e.dir)));
    await ctx.close();
  }
  await b.close(); console.log(results.join('\n'));
})();
