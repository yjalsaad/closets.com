/* Playwright QA for the YAS Bloom Kitchen Design Studio (software GL; run against a CRA build served by scripts/showroom3d-qa/serve.js):
 *   BASE=http://localhost:5055 THREE_R128=/path/to/three.min.js OUT=docs/showroom3d/screenshots/kitchen-studio node scripts/showroom3d-qa/kitchenstudio.js
 * Walks to the station, opens the REAL website designer in the full-viewport frame, changes a layout, a door finish and a worktop, and compares every BHD total and the bill of
 * materials with the website route opened directly with the same choices (price parity), then returns to the showroom and checks position, pause / resume, Esc, Back, the
 * designer's own Exit, language sync (EN / AR), the load-failure screen and the phone-portrait behaviour. The site loads three.js r128 from cdnjs for its own 3D view:
 * in an offline sandbox set THREE_R128 to that exact file. Screenshots go to OUT. Exit code 1 when any check fails. */
const fs = require('fs'), path = require('path');
const { launch, openShowroom, enterExplore, check, results, shot, ex, BASE, OUT } = require('./lib');
const THREE = process.env.THREE_R128 || '';
const USER = { id: 'qa-user', name: 'QA Visitor', email: 'qa@example.test', phone: '33333333' };
const seed = (lang) => ([u, l]) => { try { localStorage.setItem('closets_user', JSON.stringify(u)); localStorage.setItem('closets_consent', 'declined'); if (l) localStorage.setItem('closets_lang', l); } catch (e) { /* ignore */ } };
const T = (page, id) => page.locator(`[data-testid="${id}"]`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dismissCoach = (page) => page.evaluate(() => { const b = [...document.querySelectorAll('.sr-coach button, [role="dialog"] button')].find((x) => /Got it|فهمت|حسنًا|حسنا/.test(x.textContent)); if (b) b.click(); });

/** the same choices on the website route or in the frame: root = Page | FrameLocator. Returns the BHD totals after each step and the bill of materials text. */
async function drive(root, { lang = 'en' } = {}) {
  const out = { totals: [], notes: {}, bom: '' };
  const total = async () => { const t = await root.locator('body').innerText(); const m = t.match(/(?:BD|د\.ب\.?)\s*[\d,]+/g); return m ? m[m.length - 1].replace(/\s+/g, ' ') : null; };
  const next = async (n) => { for (let i = 0; i < n; i++) { await root.locator('button', { hasText: /Next|التالي|التالى/ }).last().click(); await sleep(450); } };
  await root.locator('button', { hasText: /Next|التالي|التالى/ }).last().waitFor({ timeout: 60000 }); await sleep(1500);
  out.totals.push(await total());                                                       // 0: default kitchen
  await next(1);                                                                          // Dimensions
  const num = root.locator('input[type="number"]').first();
  if (await num.count()) { await num.fill('4600'); await sleep(300); out.notes.dimensions = 'length 4600'; }
  out.totals.push(await total());
  await next(2);                                                                          // Layout
  await root.locator('button:has(img)').nth(3).click(); await sleep(900); out.notes.layout = 'U-shape card'; out.totals.push(await total());
  await next(2);                                                                          // Cabinets
  const plus = root.getByRole('button', { name: '+', exact: true }); if (await plus.count()) { await plus.first().click(); await sleep(300); out.notes.cabinets = 'one more module'; }
  out.totals.push(await total());
  await next(1);                                                                          // Materials
  await root.locator('button', { hasText: /1\.30/ }).first().click(); await sleep(400); out.notes.door = 'Veneer x1.30'; out.totals.push(await total());
  await root.locator('button', { hasText: /360/ }).first().click(); await sleep(400); out.notes.worktop = 'Marble 360/m'; out.totals.push(await total());
  await next(1);                                                                          // Accessories
  const accPlus = root.getByRole('button', { name: '+', exact: true }); if (await accPlus.count()) { await accPlus.first().click(); await sleep(300); out.notes.accessories = 'one more'; }
  out.totals.push(await total());
  await next(1);                                                                          // Summary & quote
  await sleep(800); out.totals.push(await total());
  out.bom = (await root.locator('#root').evaluate((r) => [...r.children].filter((el) => !/^(NAV|FOOTER|STYLE|A)$/.test(el.tagName) && !el.classList.contains('glass-back')).map((el) => el.innerText || '').join('\n'))).split('\n').map((x) => x.trim()).filter((x) => /\d/.test(x)).join('|');   // the designer only: never the site header / footer
  return out;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(), notes = {};
  const routes = async (ctx) => { if (THREE) await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', (r) => r.fulfill({ path: THREE, contentType: 'text/javascript' })); };
  const phone = async () => {
  // ------------------------------------------------------------------ 10. phone portrait (touch)
  const ph = await openShowroom(browser, { url: '/yas-bloom', viewport: { width: 390, height: 844 }, mobile: true, query: 'debug=1&quality=low&aa=0&scale=0.6' });
  await ph.ctx.addInitScript(seed('en'), [USER, 'en']); await routes(ph.ctx); await ph.page.evaluate(seed('en'), [USER, 'en']);
  await enterExplore(ph.page, { tap: true }); await dismissCoach(ph.page);
  await ex(ph.page, (e) => e.explorer.glideTo('kitchen-studio')); await ph.page.waitForFunction(() => window.__showroom.explore.zone() === 'kitchen-studio', null, { timeout: 120000 }); await sleep(6000);
  await shot(ph.page, 'ks-bay-phone-390x844');
  await ph.page.tap('[data-testid="sr-interact"], .sr-interact'); await ph.page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  check('phone: Tap Interact at the station opens the full-screen designer', true);
  await sleep(1500); await shot(ph.page, 'ks-designer-phone-390x844-step1');
  const pf = ph.page.frameLocator('[data-testid="sr-ds-frame"]');
  check('phone: the step bar and the Next button are inside the visible window', await ph.page.evaluate(() => { const f = document.querySelector('[data-testid="sr-ds-frame"]'), s = document.querySelector('.sr-ds-stage').getBoundingClientRect(), d = f.contentDocument; const nb = [...d.querySelectorAll('button')].find((b) => /Next/.test(b.textContent)), sb = [...d.querySelectorAll('button')].find((b) => /Room shape/.test(b.textContent)); if (!nb || !sb) return false; const fr = f.getBoundingClientRect(), a = nb.getBoundingClientRect(), c = sb.getBoundingClientRect(); return fr.top + a.bottom <= s.bottom + 1 && fr.top + c.top >= s.top - 1; }), await ph.page.evaluate(() => { const f = document.querySelector('[data-testid="sr-ds-frame"]'), d = f.contentDocument, nb = [...d.querySelectorAll('button')].find((b) => /Next/.test(b.textContent)); return nb && [f.getBoundingClientRect().top, nb.getBoundingClientRect().bottom, document.querySelector('.sr-ds-stage').getBoundingClientRect().bottom]; }));
  await pf.locator('button', { hasText: /Next/ }).last().tap(); await sleep(700); await shot(ph.page, 'ks-designer-phone-390x844-step2');
  await T(ph.page, 'sr-ds-back').tap(); const lv = T(ph.page, 'sr-ds-leave'); if (await lv.count()) await lv.tap(); await T(ph.page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  await ph.ctx.close();

  };
  /** the screenshots that show the station itself, at the HIGH tier and full resolution (slow under software GL): front view, oblique from the aisle, podium close-up, EN and AR */
  const beauty = async () => {
    for (const lang of ['en', 'ar']) {
      const b = await openShowroom(browser, { url: lang === 'ar' ? '/ar/yas-bloom' : '/yas-bloom', viewport: { width: 1440, height: 900 }, query: 'debug=1&quality=high&aa=0&scale=1' });
      await b.ctx.addInitScript(seed(lang), [USER, lang]); await enterExplore(b.page); await dismissCoach(b.page);
      await ex(b.page, (e) => e.explorer.glideTo('kitchen-studio')); await b.page.waitForFunction(() => window.__showroom.explore.zone() === 'kitchen-studio', null, { timeout: 180000 }); await sleep(12000);
      await dismissCoach(b.page); await b.page.evaluate(() => { const h = document.querySelector('.sr-bubble'); if (h) h.remove(); });
      await shot(b.page, `ks-bay-${lang}-high-front`);
      await ex(b.page, (e, x, z, yaw, pitch) => e.teleport(x, z, yaw, pitch), -9.5, -3.0, 1.82, 0.1); await sleep(5000); await shot(b.page, `ks-bay-${lang}-high-oblique`);
      await ex(b.page, (e, x, z, yaw, pitch) => e.teleport(x, z, yaw, pitch), -16.0, -3.9, 2.33, -0.28); await sleep(5000); await shot(b.page, `ks-bay-${lang}-high-podium`);
      await b.ctx.close();
    }
  };
  if (process.env.ONLY === 'beauty') { await beauty(); await browser.close(); process.exit(0); }
  if (process.env.ONLY === 'phone') { await phone(); await browser.close(); const f = results.filter((r) => !r.ok); console.log(`\n${results.length - f.length}/${results.length} checks passed (phone only)`); process.exit(f.length ? 1 : 0); }

  // ------------------------------------------------------------------ 1. EN, desktop: the station
  const { ctx, page, errors } = await openShowroom(browser, { url: '/yas-bloom', viewport: { width: 1440, height: 900 }, query: 'debug=1&quality=low&aa=0&scale=0.7', init: undefined });
  const countGl = () => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/.test(t)) window.__gl = (window.__gl || 0) + 1; return o.apply(this, arguments); }; };
  await ctx.addInitScript(countGl);
  await ctx.addInitScript(seed('en'), [USER, 'en']); await routes(ctx); await page.evaluate(seed('en'), [USER, 'en']);
  await enterExplore(page); await dismissCoach(page);
  await ex(page, (e) => e.explorer.glideTo('kitchen-studio'));
  await page.waitForFunction(() => window.__showroom.explore.zone() === 'kitchen-studio', null, { timeout: 120000 }); await page.waitForTimeout(6000);
  check('glide to the Kitchen Design Studio ends in its zone, at the stand point', await ex(page, (e) => e.zone() === 'kitchen-studio' && Math.abs(e.pos()[0] + 18) < 0.05), await ex(page, (e) => e.pos()));
  check('the HUD prompt names the station and offers E', /Kitchen Design Studio/.test(await T(page, 'sr-prompt').innerText().catch(() => '')) , await T(page, 'sr-prompt').innerText().catch(() => ''));
  await shot(page, 'ks-bay-en-1440');
  const before = await ex(page, (e) => [e.pos(), e.yaw(), e.pitch()]);
  const fr0 = await page.evaluate(() => window.__showroom.engine.renderer.info.render.frame);

  // ------------------------------------------------------------------ 2. open the designer: pause, frame, chrome
  await page.keyboard.press('KeyE'); await T(page, 'sr-ds').waitFor({ timeout: 20000 });
  check('E opens the designer overlay (loading)', await T(page, 'sr-ds').count() === 1);
  await sleep(1200);
  check('the showroom render loop is paused while the designer is open', await page.evaluate(() => window.__showroom.engine.running === false));
  const fr1 = await page.evaluate(() => window.__showroom.engine.renderer.info.render.frame); await sleep(1500);
  const fr2 = await page.evaluate(() => window.__showroom.engine.renderer.info.render.frame); check('no showroom frames are rendered while it is open', fr2 === fr1, { fr1, fr2 });
  check('the explorer is frozen (uiOpen)', await ex(page, (e) => e.state().uiOpen === true));
  await T(page, 'sr-ds').locator('[data-status="open"]').count();
  await page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  check('the designer finished loading (status open)', true);
  const fl = page.frameLocator('[data-testid="sr-ds-frame"]');
  check('the site header is outside the visible window (frame shifted up)', await page.evaluate(() => { const f = document.querySelector('[data-testid="sr-ds-frame"]'), s = document.querySelector('.sr-ds-stage'); const d = f.contentDocument, nav = d.querySelector('nav'); const r = nav.getBoundingClientRect(), fr = f.getBoundingClientRect(), sr = s.getBoundingClientRect(); return fr.top + r.bottom <= sr.top + 1; }));
  check('the site footer is hidden', await page.evaluate(() => { const d = document.querySelector('[data-testid="sr-ds-frame"]').contentDocument, f = d.querySelector('footer'); return !f || getComputedStyle(f).display === 'none'; }));
  check('the designer step bar is visible inside the frame', await fl.locator('button', { hasText: /Room shape/ }).first().isVisible());
  check('the frame URL is the website designer route, same origin', await page.evaluate(() => { const l = document.querySelector('[data-testid="sr-ds-frame"]').contentWindow.location; return l.origin === window.location.origin && l.pathname === '/design-studio/kitchen-planner' && /src=yas-bloom/.test(l.search); }));
  await sleep(800); await shot(page, 'ks-designer-1440x900-step1');

  // ------------------------------------------------------------------ 3. drive the designer (layout + finish + worktop ...) and compare with the website route
  const embedded = await drive(fl);
  notes.embedded = embedded;
  await shot(page, 'ks-designer-1440x900-quote');
  await page.setViewportSize({ width: 1920, height: 1080 }); await sleep(1500); await shot(page, 'ks-designer-1920x1080-quote');
  // the website route opened directly (a fresh page of the same context: same account / storage, same build)
  const web = await ctx.newPage(); await web.setViewportSize({ width: 1440, height: 900 });
  await web.goto(BASE + '/design-studio/kitchen-planner', { waitUntil: 'domcontentloaded' });
  const direct = await drive(web); notes.direct = direct; await web.screenshot({ path: path.join(OUT, 'ks-website-1440x900-quote.jpg'), type: 'jpeg', quality: 72 }); await web.close();
  check('PRICE PARITY: every BHD total after each choice is identical (embedded frame vs the website route)', JSON.stringify(embedded.totals) === JSON.stringify(direct.totals), { embedded: embedded.totals, direct: direct.totals });
  check('PRICE PARITY: the bill of materials / summary text is identical', embedded.bom === direct.bom, { len: [embedded.bom.length, direct.bom.length] });
  check('the choices really changed the price (layout, cabinet, door finish, worktop)', new Set(embedded.totals).size >= 4, embedded.totals);
  await page.setViewportSize({ width: 1440, height: 900 });

  // ------------------------------------------------------------------ 4. the designer's own quote button still works inside the frame
  await fl.locator('button', { hasText: /Get quote|احصل/ }).last().click(); await sleep(1200);
  check('the designer’s own quote form opens inside the frame, pre-filled from the signed-in account (same hand-off as the website)', await fl.locator('text=/Get your kitchen quote/').count() > 0 && await fl.locator('input[value="QA Visitor"]').count() > 0);
  await shot(page, 'ks-designer-quote-dialog');

  // ------------------------------------------------------------------ 5. leave: Esc inside the designer closes its dialog first, then asks before throwing the design away
  await page.keyboard.press('Escape'); await T(page, 'sr-ds-confirm').waitFor({ timeout: 5000 });
  check('Esc inside the designer with a design in progress asks first (never leaves silently; the site\u2019s quote form ignores Esc itself)', await T(page, 'sr-ds').count() === 1 && await T(page, 'sr-ds-confirm').isVisible()); await shot(page, 'ks-designer-leave-confirm');
  await T(page, 'sr-ds-stay').click(); await sleep(400); check('"Keep designing" returns to the designer, the quote form still open', await T(page, 'sr-ds-confirm').count() === 0 && await fl.locator('text=/Get your kitchen quote|عرض سعر/').count() > 0);
  await T(page, 'sr-ds-back').click(); await T(page, 'sr-ds-confirm').waitFor({ timeout: 5000 }); check('the Back button asks for the same confirmation', true); await T(page, 'sr-ds-leave').click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 }); await sleep(2500);
  const fr3 = await page.evaluate(() => window.__showroom.engine.renderer.info.render.frame);
  check('back in the showroom: the render loop is running again', fr3 > fr2, { fr2, fr3 });
  const after = await ex(page, (e) => [e.pos(), e.yaw(), e.pitch()]);
  check('the visitor stands exactly where they stood (position, yaw, pitch)', JSON.stringify(before[0]) === JSON.stringify(after[0]) && Math.abs(before[1] - after[1]) < 1e-6 && Math.abs(before[2] - after[2]) < 1e-6, { before, after });
  check('the explorer is live again (uiOpen false) and the zone is still the studio', await ex(page, (e) => e.state().uiOpen === false && e.zone() === 'kitchen-studio'));
  check('the iframe is gone after leaving (the designer’s WebGL / memory is released)', await page.locator('[data-testid="sr-ds-frame"]').count() === 0);

  // ------------------------------------------------------------------ 6. Esc / browser Back / the designer's own Exit
  await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  await T(page, 'sr-ds-back').focus(); await page.keyboard.press('Escape'); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  check('Esc in the showroom bar leaves (no design in progress: no confirmation)', true);
  await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  const hl = await page.evaluate(() => history.length); await page.goBack(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  check('the browser Back button closes the designer and keeps the visitor in the showroom', /\/yas-bloom/.test(page.url()), page.url());
  await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  await fl.locator('button', { hasText: /Exit|خروج/ }).first().click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 15000 });
  check('the designer’s own "Exit" returns to the showroom', /\/yas-bloom/.test(page.url()) && await page.evaluate(() => window.__showroom.engine.running === true));
  await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  check('a new designer opens fresh (step 1)', await fl.locator('button', { hasText: /Room shape/ }).first().isVisible());
  // perf / memory (software GL, indicative only): JS heap and WebGL contexts with the showroom alone, with the designer's 3D view open, and after leaving
  { const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); const m = await cdp.send('Performance.getMetrics'); return Math.round(m.metrics.find((x) => x.name === 'JSHeapUsedSize').value / 1048576); };
    const gl = async () => ({ showroom: await page.evaluate(() => window.__gl || 0), frame: await page.evaluate(() => { try { return document.querySelector('[data-testid="sr-ds-frame"]').contentWindow.__gl || 0; } catch (e) { return -1; } }) });
    await fl.locator('button:has-text("\ud83c\udfa8")').first().locator('xpath=preceding-sibling::button[1]').click(); await sleep(THREE ? 7000 : 1500);
    notes.perf = { heapMBDesignerOpen3D: await heap(), glContextsDesignerOpen: await gl(), showroomEngineRunning: await page.evaluate(() => window.__showroom.engine.running) };
    await T(page, 'sr-ds-back').click(); const lv0 = T(page, 'sr-ds-leave'); if (await lv0.count()) await lv0.click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 }); await sleep(3000);
    notes.perf.heapMBAfterClose = await heap(); notes.perf.glContextsAfterClose = await gl(); notes.perf.showroomEngineRunningAfter = await page.evaluate(() => window.__showroom.engine.running);
    check('perf: the designer\u2019s own WebGL context is gone after leaving (frame detached); the showroom keeps its one', notes.perf.glContextsAfterClose.frame === -1 || notes.perf.glContextsAfterClose.frame === 0, notes.perf); }

  // ------------------------------------------------------------------ 7. the adviser hook
  await page.keyboard.press('KeyT'); await T(page, 'sr-chat').waitFor({ timeout: 15000 }).catch(() => {});
  if (await T(page, 'sr-chat').count()) {
    await T(page, 'sr-chat-input').fill('open the designer'); await T(page, 'sr-chat-send').click();
    await page.waitForSelector('[data-testid="sr-ds"]', { timeout: 20000 }); check('adviser: "open the designer" opens the designer', true);
    await page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 }); await T(page, 'sr-ds-back').click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  } else check('adviser chat opens near the kitchens adviser (skipped: no adviser in range)', true, 'skipped');

  // ------------------------------------------------------------------ 8. load failure: the designer route cannot be fetched
  await ctx.route('**/design-studio/kitchen-planner**', (r) => r.abort());
  await page.keyboard.press('KeyE'); await T(page, 'sr-ds-failed').waitFor({ timeout: 40000 });
  check('load failure: a clear message, Try again and a website link are shown', await T(page, 'sr-ds-retry').isVisible() && /new tab|website|الموقع/i.test(await T(page, 'sr-ds-failed-site').innerText()));
  check('load failure: the website link opens the same designer in a new tab', await T(page, 'sr-ds-failed-site').getAttribute('target') === '_blank');
  await shot(page, 'ks-designer-failed');
  await ctx.unroute('**/design-studio/kitchen-planner**'); await T(page, 'sr-ds-retry').click(); await page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  check('Try again loads the designer once the network is back', true);
  await T(page, 'sr-ds-back').click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  check('no page errors in the whole desktop run', errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, errors.slice(0, 5));
  await ctx.close();

  // ------------------------------------------------------------------ 9. Arabic: /ar/yas-bloom
  const ar = await openShowroom(browser, { url: '/ar/yas-bloom', viewport: { width: 1440, height: 900 }, query: 'debug=1&quality=low&aa=0&scale=0.7' });
  await ar.ctx.addInitScript(seed('ar'), [USER, null]); await routes(ar.ctx); await ar.page.evaluate(seed('en'), [USER, 'en']);   // the website language is "en" in storage: the showroom URL (ar) must win
  await enterExplore(ar.page); await dismissCoach(ar.page);
  await ex(ar.page, (e) => e.explorer.glideTo('kitchen-studio')); await ar.page.waitForFunction(() => window.__showroom.explore.zone() === 'kitchen-studio', null, { timeout: 120000 }); await sleep(6000);
  await shot(ar.page, 'ks-bay-ar-1440');
  await ar.page.keyboard.press('KeyE'); await ar.page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  const afl = ar.page.frameLocator('[data-testid="sr-ds-frame"]');
  check('Arabic: the designer opens in Arabic although localStorage said English (the showroom language wins)', await ar.page.evaluate(() => { const d = document.querySelector('[data-testid="sr-ds-frame"]').contentDocument; return d.documentElement.lang === 'ar' && d.documentElement.dir === 'rtl'; }));
  check('Arabic: the showroom bar is RTL and translated', /العودة إلى المعرض/.test(await T(ar.page, 'sr-ds-back').innerText()));
  await sleep(1000); await shot(ar.page, 'ks-designer-ar-1440x900');
  // language switch while open: the designer's own language button is clicked, no design lost
  await afl.locator('button', { hasText: /Next|التالي/ }).last().click(); await sleep(500); const arTotal = await afl.locator('body').innerText().then((t) => (t.match(/(?:BD|د\.ب\.?)\s*[\d,]+/g) || []).pop());
  await T(ar.page, 'sr-ds-lang').click(); await sleep(2500);
  const lang2 = await ar.page.evaluate(() => { const d = document.querySelector('[data-testid="sr-ds-frame"]').contentDocument; return { frame: d.documentElement.lang, root: document.querySelector('.sr3d').getAttribute('lang') }; });
  check('language switch while open: the designer and the showroom both switch to English', lang2.frame === 'en' && lang2.root === 'en', lang2);
  check('language switch while open: the design in progress is kept (same total, same step)', ((await afl.locator('body').innerText().then((t) => (t.match(/(?:BD|د\.ب\.?)\s*[\d,]+/g) || []).pop())) === arTotal) && await afl.locator('button', { hasText: /Dimensions/ }).count() > 0, arTotal);
  await T(ar.page, 'sr-ds-back').click(); const leave = T(ar.page, 'sr-ds-leave'); if (await leave.count()) await leave.click().catch(() => {}); await T(ar.page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  await ar.ctx.close();

  await phone();
  if (process.env.BEAUTY === '1') await beauty();

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'kitchen-studio-qa.json'), JSON.stringify({ results, notes }, null, 1) + '\n');
  const failed = results.filter((r) => !r.ok); console.log(`\n${results.length - failed.length}/${results.length} checks passed`); process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
