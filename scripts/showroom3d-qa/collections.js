/* Playwright QA for the Collections wall + panel (SwiftShader). usage: node scripts/showroom3d-qa/serve.js build 5077 &  BASE=http://localhost:5077 node scripts/showroom3d-qa/collections.js
 * Checks the real flow (Departments menu -> Collections -> glide -> E -> panel -> gallery -> links) in EN, AR and on a phone, and measures what the wall adds per tier. */
const fs = require('fs'), path = require('path');
const { launch, openShowroom, check, results, shot, ex, OUT } = require('./lib');

const arrived = (page) => page.waitForFunction(() => { const e = window.__showroom.explore; const p = e.pos(); return !e.state().gliding && Math.hypot(p[0] - 18, p[1] + 4) < 0.2; }, null, { timeout: 120000 });
/* software GL renders well under 1 fps on the higher tiers, so Playwright's "stable element" wait can time out: activate controls through the DOM instead (same handlers) */
const dom = (page, sel) => page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); return !!el; }, sel);
async function enter(page) {
  await page.waitForSelector('[data-testid="sr-skip"]', { timeout: 240000 });
  for (let i = 0; i < 80; i++) { await dom(page, '[data-testid="sr-skip"]'); if (await page.evaluate(() => document.querySelector('.sr-stage').dataset.phase === 'explore')) break; await page.waitForTimeout(1500); }
  await page.waitForTimeout(800); await dom(page, '[data-testid="sr-coach-done"]');
}
async function goViaMenu(page) {
  await dom(page, '[data-testid="sr-open-depts"]'); await page.waitForSelector('[data-dept="collections"]', { state: 'attached', timeout: 120000 }); await dom(page, '[data-dept="collections"]'); await arrived(page); await page.waitForTimeout(2500);
}
/* the panel pops in with a CSS animation that only advances with rendered frames: wait until it is fully opaque */
const settled = async (page) => { await page.waitForFunction(() => { const el = document.querySelector('[data-testid="sr-collections-panel"]'); return el && getComputedStyle(el).opacity === '1' && el.getAnimations().every((a) => a.playState === 'finished'); }, null, { timeout: 120000 }); await page.waitForTimeout(1200); };
async function measure(page) {
  const read = async (visible) => { await page.evaluate((v) => { window.__showroom.engine.collections.group.visible = v; }, visible); await page.waitForTimeout(1800); return page.evaluate(() => window.__showroom.info()); };
  const off = await read(false), on = await read(true);
  const tex = await page.evaluate(() => { let b = 0; window.__showroom.engine.collections.group.traverse((o) => { const m = o.material && o.material.map; if (m && m.image) b += m.image.width * m.image.height * 4 * 4 / 3; }); return Math.round(b / 1024); });
  /* static count of the wall itself: with the high tier's post-processing composer renderer.info only reports the last pass, so the on / off delta reads 0 there */
  const own = await page.evaluate(() => { let meshes = 0, tris = 0; window.__showroom.engine.collections.group.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return { meshes, tris }; });
  return { drawCalls: own.meshes, triangles: own.tris, textureKB: tex, measuredCallsDelta: on.calls - off.calls, measuredTrianglesDelta: on.triangles - off.triangles, sceneCalls: on.calls, sceneTriangles: on.triangles };
}

(async () => {
  const browser = await launch(), stats = {};
  // ---- desktop EN, medium tier: wall, prompt, panel, gallery, links
  {
    const { ctx, page, errors } = await openShowroom(browser, { viewport: { width: 1100, height: 620 }, query: 'debug=1&quality=medium&aa=0' });
    await enter(page); await goViaMenu(page);
    check('menu glide ends at the Collections stand point, in the collections zone', (await ex(page, (e) => e.zone())) === 'collections', await ex(page, (e) => e.pos()));
    check('prompt names the wall', /Collections/.test(await page.textContent('[data-testid="sr-prompt"]')));
    await shot(page, 'collections-01-wall-en', { quality: 84 });
    stats.medium = await measure(page);
    await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-collections-panel"]', { state: 'attached', timeout: 120000 });
    check('E opens the panel with the site collection', (await page.textContent('[data-testid="sr-collections-panel"] h2')) === 'Collection 2023–2025');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    check('arrow keys browse the finishes', (await page.textContent('[data-testid="sr-col-name"]')) !== 'Abisko Ash', await page.textContent('[data-testid="sr-col-name"]'));
    const site = await page.$eval('[data-testid="sr-col-site"]', (a) => [a.href, a.target, a.rel]); check('site link: source URL, new tab, noopener', site[0] === 'https://yas-holding-website.vercel.app/collection' && site[1] === '_blank' && /noopener/.test(site[2]), site);
    check('quote link is the booking hand-off', /^\/booking\?interest=Other&source=showroom-3d-collections/.test(await page.getAttribute('[data-testid="sr-col-quote"]', 'href')));
    await settled(page); await shot(page, 'collections-02-panel-en', { quality: 84 });
    await page.keyboard.press('Escape'); await page.waitForSelector('[data-testid="sr-collections-panel"]', { state: 'detached', timeout: 120000 });
    check('Escape closes the panel and does not open the pause menu', !(await page.$('[data-testid="sr-pause-menu"]')));
    check('no page errors (EN desktop)', errors.length === 0, errors.slice(0, 3)); await ctx.close();
  }
  // ---- desktop AR
  {
    const { ctx, page, errors } = await openShowroom(browser, { url: '/ar/yas-bloom', viewport: { width: 1100, height: 620 }, query: 'debug=1&quality=medium&aa=0' });
    await enter(page); await goViaMenu(page); await shot(page, 'collections-03-wall-ar', { quality: 84 });
    await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-collections-panel"]', { state: 'attached', timeout: 120000 });
    check('AR panel: Arabic collection name, rtl', (await page.textContent('[data-testid="sr-collections-panel"] h2')) === 'مجموعة 2023–2025' && (await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="sr-collections-panel"]')).direction)) === 'rtl');
    await settled(page); await shot(page, 'collections-04-panel-ar', { quality: 84 });
    check('no page errors (AR desktop)', errors.length === 0, errors.slice(0, 3)); await ctx.close();
  }
  // ---- phone (low tier), touch
  {
    const { ctx, page, errors } = await openShowroom(browser, { viewport: { width: 390, height: 844 }, mobile: true, query: 'debug=1&quality=low&aa=0' });
    await enter(page);
    await goViaMenu(page); stats.low = await measure(page); await shot(page, 'collections-05-wall-mobile', { quality: 84 });
    await page.tap('.sr-interact'); await page.waitForSelector('[data-testid="sr-collections-panel"]', { state: 'attached' });
    await settled(page);
    const box = await page.$eval('[data-testid="sr-collections-panel"]', (el) => { const r = el.getBoundingClientRect(); return { w: r.width, bottom: Math.round(window.innerHeight - r.bottom), sw: document.documentElement.scrollWidth, iw: window.innerWidth }; });
    check('mobile: the panel is a bottom sheet, full width, no horizontal overflow', box.w >= 388 && box.bottom === 0 && box.sw <= box.iw, box);
    const tap = await page.$$eval('[data-testid="sr-collections-panel"] button, [data-testid="sr-collections-panel"] a', (els) => els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0).every((r) => r.height >= 40));
    check('mobile: every control is at least 40 px tall', tap);
    await settled(page); await shot(page, 'collections-06-panel-mobile', { quality: 84 });
    check('no page errors (mobile)', errors.length === 0, errors.slice(0, 3)); await ctx.close();
  }
  // ---- high tier numbers + reduced motion
  {
    const { ctx, page, errors } = await openShowroom(browser, { viewport: { width: 960, height: 540 }, query: 'debug=1&quality=high&aa=0&scale=0.6', reduced: true });
    await page.waitForSelector('.sr-stage[data-phase="explore"]', { state: 'attached', timeout: 240000 }); await page.waitForTimeout(800); await dom(page, '[data-testid="sr-coach-done"]');
    await dom(page, '[data-testid="sr-open-depts"]'); await page.waitForSelector('[data-dept="collections"]', { state: 'attached' }); await dom(page, '[data-dept="collections"]'); await page.waitForTimeout(400);
    check('reduced motion: the jump to the wall is instant', (await ex(page, (e) => Math.hypot(e.pos()[0] - 18, e.pos()[1] + 4))) < 0.2);
    await page.waitForTimeout(1500); stats.high = await measure(page); await shot(page, 'collections-07-wall-high', { quality: 84 });
    check('no page errors (high, reduced motion)', errors.length === 0, errors.slice(0, 3)); await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.resolve(__dirname, '../../docs/showroom3d/collections-stats.json'), JSON.stringify({ note: 'What the Collections wall adds while it is in view (SwiftShader, measured by toggling its group). textureKB = canvas textures incl. mipmaps; swatch images add nothing here because none are downloaded yet.', added: stats, checks: results }, null, 2) + '\n');
  const bad = results.filter((r) => !r.ok); console.log(`\n${results.length - bad.length}/${results.length} checks passed; screenshots in ${OUT}`); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
