/* Shared helpers for the Showroom 3D Playwright QA (headless Chromium on SwiftShader, i.e. CPU rendering). */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://localhost:5055';
const OUT = process.env.OUT || path.resolve(__dirname, '../../docs/showroom3d/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
async function launch() { return chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] }); }

async function openShowroom(browser, { url = '/showroom-3d', viewport = { width: 960, height: 540 }, mobile = false, query = 'debug=1&quality=low&aa=0', init, reduced = false, locale } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference', locale, userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' : undefined });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|ReadPixels|WebGL: INVALID/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE + url + (url.includes('?') ? '&' : '?') + query, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__showroom && window.__showroom.ready, null, { timeout: 120000 });
  return { ctx, page, errors };
}
/** finish the loader and the intro with the real "Skip intro" button, wait for the explore phase */
async function enterExplore(page, { tap = false } = {}) {
  await page.waitForSelector('[data-testid="sr-skip"]', { timeout: 120000 });
  if (tap) await page.tap('[data-testid="sr-skip"]'); else await page.click('[data-testid="sr-skip"]');
  await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 });
  await page.waitForTimeout(800);
}
const ex = (page, fn, ...a) => page.evaluate(([f, args]) => { const e = window.__showroom.explore; return (new Function('e', 'args', 'return (' + f + ')(e, ...args)'))(e, args); }, [fn.toString(), a]);
async function shot(page, name, opts = {}) { const p = path.join(OUT, name + '.jpg'); await page.screenshot({ path: p, type: 'jpeg', timeout: 180000, quality: opts.quality || 72, ...opts.clip && { clip: opts.clip } }); return p; }
module.exports = { launch, openShowroom, enterExplore, check, results, shot, ex, BASE, OUT };
