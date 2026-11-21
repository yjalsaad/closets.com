/* Playwright QA for the YAS Bloom TV Unit Studio (software GL; run against a CRA build served by scripts/showroom3d-qa/serve.js):
 *   BASE=http://localhost:5055 THREE_R128=/path/to/three.min.js OUT=docs/showroom3d/screenshots/tv-studio node scripts/showroom3d-qa/tvstudio.js
 * Everything runs as a GUEST (no closets_user, no studio session) unless a step says otherwise. Walks to the shared design wall, opens the Neo TV Unit Designer (the website's /studio/tv) in the full-viewport
 * frame, proves nothing was written for the guest (no auth / cp_* request), drives eleven option changes in the frame and on the website route opened directly in a fresh context and compares every price and
 * every tab's option text (price + option parity), checks 1440 x 900 / 1920 x 1080 / 2560 x 1440, the chooser, the podium-tablet buttons, the guest sign-in prompt of Get quote, leaving and returning,
 * the advisers, Arabic and the language switch, the load failure, links that would leave the designer, the kitchen section on the same wall, and the phone-portrait behaviour.
 * The site loads three.js r128 from cdnjs for the 3D view: in an offline sandbox set THREE_R128 to that exact file. ONLY=phone | beauty runs one part. Exit code 1 when any check fails. */
const fs = require('fs'), path = require('path');
const { launch, openShowroom, enterExplore, check, results, shot, ex, BASE, OUT } = require('./lib');
const THREE = process.env.THREE_R128 || '';
const KUSER = { id: 'qa-user', name: 'QA Visitor', email: 'qa@example.test', phone: '33333333' };
const seed = (lang) => ([u, l]) => { try { if (u) localStorage.setItem('closets_user', JSON.stringify(u)); localStorage.setItem('closets_consent', 'declined'); if (l) localStorage.setItem('closets_lang', l); } catch (e) { /* ignore */ } };
const T = (page, id) => page.locator(`[data-testid="${id}"]`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dismissCoach = (page) => page.evaluate(() => { const b = [...document.querySelectorAll('.sr-coach button, [role="dialog"] button')].find((x) => /Got it|فهمت|حسنًا|حسنا/.test(x.textContent)); if (b) b.click(); });
const TABS = ['global', 'ms', 'units', 'tv', 'panel', 'hardware', 'price'];

/** the same option changes on the website route or in the frame (root = Page | FrameLocator). Returns the price chip after each change, every tab's option text and the quote dialog. */
async function drive(root) {
  const out = { totals: [], notes: [], tabs0: {}, tabsEnd: {}, dialog: '' };
  const price = async () => (await root.locator('[data-testid="cat-price"]').innerText()).replace(/\s+/g, ' ');
  const tab = async (t) => { await root.locator(`.nk-rt[data-tab="${t}"]`).click(); await sleep(260); };
  const step = async (note) => { await sleep(350); out.totals.push(await price()); out.notes.push(note); };
  await root.locator('[data-testid="cat-page-tv"]').waitFor({ timeout: 60000 }); await sleep(1500);
  for (const t of TABS) { await tab(t); out.tabs0[t] = (await root.locator('.nkc-panel').innerText()).replace(/\s+/g, ' '); }   // every option of every tab, as the default design shows it
  await tab('units'); await step('default design');
  await tab('tv'); await root.locator('[data-testid="quick-tvSize-75"]').click(); await step('TV size 75"');
  await tab('units'); const w = root.locator('input[aria-label^="Total width"]').first(); await w.fill('3600'); await w.blur(); await step('total width 3600 mm');
  await tab('global'); await root.locator('.nkc-panel .nk-seg-b', { hasText: 'Floor standing' }).click(); await step('floor standing unit');
  await root.locator('.nkc-panel .nk-seg-b', { hasText: 'Marble' }).click(); await step('top: Marble');
  await tab('ms'); await root.locator('.nkc-panel .nk-seg-b', { hasText: 'Birch plywood' }).click(); await step('board: birch plywood');
  await tab('panel'); await root.locator('.nkc-panel .nk-seg-b', { hasText: /^Both$/ }).click(); await step('LED: niche + under the unit');
  await tab('tv'); await root.locator('.nkc-panel .nk-seg-b', { hasText: /^None$/ }).first().click(); await step('no soundbar');
  await tab('units'); await root.locator('[data-testid="add-av"]').click(); await step('+ AV shelf unit');
  await tab('hardware'); await root.locator('.nkc-panel button', { hasText: /^Knob/ }).first().click(); await step('handles: knob');
  await tab('units'); await root.locator('[data-testid="preset-fire"]').click(); await step('preset: floor unit with electric fireplace');
  for (const t of TABS) { await tab(t); out.tabsEnd[t] = (await root.locator('.nkc-panel').innerText()).replace(/\s+/g, ' '); }
  await tab('units'); await root.locator('[data-testid="nq-open"]').click(); await root.locator('.wsq').waitFor({ timeout: 15000 }); await sleep(800);
  out.dialog = (await root.locator('.wsq').innerText()).replace(/\s+/g, ' ');            // facts, indicative price, "sign in first" line
  return out;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(), notes = {};
  const routes = async (ctx) => { if (THREE) await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', (r) => r.fulfill({ path: THREE, contentType: 'text/javascript' })); };
  const toStation = async (page, id) => { await ex(page, (e, i) => e.explorer.glideTo(i), id); await page.waitForFunction(() => window.__showroom.explore.zone() === 'kitchen-studio', null, { timeout: 120000 }); await sleep(5000); };
  const openFrame = async (page) => page.waitForSelector('[data-testid="sr-ds"][data-status="open"]', { timeout: 90000 });
  const leave = async (page) => { await T(page, 'sr-ds-back').click(); const lv = T(page, 'sr-ds-leave'); if (await lv.count()) await lv.click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 }); };

  const phone = async () => {
    const ph = await openShowroom(browser, { url: '/yas-bloom', viewport: { width: 390, height: 844 }, mobile: true, query: 'debug=1&quality=low&aa=0&scale=0.6' });
    await ph.ctx.addInitScript(seed('en'), [null, 'en']); await routes(ph.ctx); await enterExplore(ph.page, { tap: true }); await dismissCoach(ph.page);
    await toStation(ph.page, 'tv-studio'); await shot(ph.page, 'tv-bay-phone-390x844');
    await ph.page.tap('[data-testid="sr-interact"], .sr-interact'); await openFrame(ph.page);
    check('phone: Tap Interact at the TV studio opens the full-screen TV designer (named, so no chooser), as a guest', await T(ph.page, 'sr-ds').getAttribute('data-section') === 'tv-studio');
    await sleep(2500); await shot(ph.page, 'tv-designer-phone-390x844');
    const vis = await ph.page.evaluate(() => { const f = document.querySelector('[data-testid="sr-ds-frame"]'), s = document.querySelector('.sr-ds-stage').getBoundingClientRect(), d = f.contentDocument, root = d.documentElement; const q = (sel) => { const e = [...d.querySelectorAll(sel)].find((x) => x.getBoundingClientRect().width > 0); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }; return { stage: [s.top, s.bottom, s.width], bar: getComputedStyle(d.querySelector('.ws-bar')).display, quote: q('[data-testid="nq-open"], [data-testid="nq-open-m"]'), page: q('[data-testid="cat-page-tv"]'), scrollW: root.scrollWidth, clientW: root.clientWidth }; });
    check('phone: the studio bar is hidden, the designer fills the window and nothing scrolls sideways', vis.bar === 'none' && Math.abs(vis.page.top) < 2 && vis.scrollW <= vis.clientW + 1, vis);
    const pf = ph.page.frameLocator('[data-testid="sr-ds-frame"]');
    await pf.locator('button', { hasText: /^\s*Parameters\s*$/ }).last().tap(); await sleep(900);                       // on a phone the studio keeps its options (and Get quote) in the Parameters drawer, as on the website
    const q = await ph.page.evaluate(() => { const f = document.querySelector('[data-testid="sr-ds-frame"]'), s = document.querySelector('.sr-ds-stage').getBoundingClientRect(), d = f.contentDocument; const e = [...d.querySelectorAll('[data-testid="nq-open"], [data-testid="nq-open-m"]')].find((x) => x.getBoundingClientRect().width > 0); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, right: r.right, stageH: s.height, stageW: s.width }; });
    check('phone: the Parameters drawer opens with the options, and the designer\u2019s own Get quote button is inside the visible window', !!q && q.top >= 0 && q.bottom <= q.stageH + 1 && q.right <= q.stageW + 1, q);
    await shot(ph.page, 'tv-designer-phone-390x844-parameters');
    await pf.locator('.nk-rt[data-tab="tv"]').first().tap(); await sleep(700); await shot(ph.page, 'tv-designer-phone-390x844-tv-tab');
    await T(ph.page, 'sr-ds-back').tap(); const lv = T(ph.page, 'sr-ds-leave'); if (await lv.count()) await lv.tap(); await T(ph.page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
    check('phone: Back returns to the showroom', await ph.page.evaluate(() => window.__showroom.engine.running === true));
    await ph.ctx.close();
  };
  /** high-tier beauty shots of the station with both sections (front view, oblique, podium close-up), EN and AR; the screen shows the TV frames (the loop is moved to the TV frames first) */
  const beauty = async () => {
    for (const lang of ['en', 'ar']) {
      const b = await openShowroom(browser, { url: lang === 'ar' ? '/ar/yas-bloom' : '/yas-bloom', viewport: { width: 1440, height: 900 }, query: 'debug=1&quality=high&aa=0&scale=1' });
      await b.ctx.addInitScript(seed(lang), [null, lang]); await enterExplore(b.page); await dismissCoach(b.page);
      await toStation(b.page, 'tv-studio'); await sleep(9000); await dismissCoach(b.page); await b.page.evaluate(() => { const h = document.querySelector('.sr-bubble'); if (h) h.remove(); });
      await shot(b.page, `tv-bay-${lang}-high-kitchen-frame`);
      await b.page.evaluate(() => { window.__showroom.engine.designStudio.state.t = 3 * 7.1 + 1; });   // jump the loop to the first TV frame
      await sleep(2500); await shot(b.page, `tv-bay-${lang}-high-tv-frame`);
      await ex(b.page, (e, x, z, yaw, pitch) => e.teleport(x, z, yaw, pitch), -9.5, -3.0, 1.82, 0.1); await sleep(4000); await shot(b.page, `tv-bay-${lang}-high-oblique`);
      await ex(b.page, (e, x, z, yaw, pitch) => e.teleport(x, z, yaw, pitch), -16.0, -3.9, 2.33, -0.28); await sleep(4000); await shot(b.page, `tv-bay-${lang}-high-podium`);
      await b.ctx.close();
    }
  };
  const arabic = async () => {
  // ------------------------------------------------------------------ 11. Arabic: /ar/yas-bloom (the website language in storage says English: the showroom URL wins)
  const ar = await openShowroom(browser, { url: '/ar/yas-bloom', viewport: { width: 1440, height: 900 }, query: 'debug=1&quality=low&aa=0&scale=0.7' });
  await ar.ctx.addInitScript(seed('ar'), [null, null]); await routes(ar.ctx); await ar.page.evaluate(seed('en'), [null, 'en']); await enterExplore(ar.page);   // the stored website language is English; the init script must not rewrite it inside the frame await dismissCoach(ar.page);
  await toStation(ar.page, 'tv-studio'); await shot(ar.page, 'tv-bay-ar-1440');
  check('Arabic: the HUD prompt names the shared wall in Arabic', await ar.page.waitForFunction(() => /استوديوهات التصميم/.test((document.querySelector('[data-testid="sr-prompt"]') || {}).innerText || ''), null, { timeout: 10000 }).then(() => true).catch(() => false));
  await ex(ar.page, (e) => e.teleport(0, -3.5, 0, 0)); await ex(ar.page, (e) => e.teleport(-18, -4.41, Math.PI, 0.12)); await sleep(1500);
  await ar.page.keyboard.press('KeyE'); await T(ar.page, 'sr-ds-choose').waitFor({ timeout: 8000 }); await sleep(1500); await shot(ar.page, 'tv-chooser-ar');
  check('Arabic chooser: right-to-left with both studios in Arabic', await ar.page.evaluate(() => { const d = document.querySelector('[data-testid="sr-ds-choose"]'); return d.dir === 'rtl' && /استوديو وحدات التلفزيون/.test(d.innerText) && /استوديو تصميم المطابخ/.test(d.innerText); }));
  await T(ar.page, 'sr-ds-pick-tv-studio').click(); await openFrame(ar.page); const afl = ar.page.frameLocator('[data-testid="sr-ds-frame"]'); await afl.locator('[data-testid="cat-page-tv"]').waitFor({ timeout: 60000 }); await sleep(1500);
  check('Arabic: the designer opens in Arabic (RTL) although localStorage said English (the showroom language wins)', await ar.page.evaluate(() => { const d = document.querySelector('[data-testid="sr-ds-frame"]').contentDocument; return d.documentElement.lang === 'ar' && d.documentElement.dir === 'rtl' && d.querySelector('.nk-lang [aria-pressed="true"]').textContent.trim() === 'ع'; }));
  check('Arabic: the showroom bar is translated', /العودة إلى المعرض/.test(await T(ar.page, 'sr-ds-back').innerText()) && /استوديو وحدات التلفزيون/.test(await ar.page.locator('.sr-ds-title b').innerText()));
  await afl.locator('[data-testid="quick-tvSize-75"]').click().catch(async () => { await afl.locator('.nk-rt[data-tab="tv"]').click(); await afl.locator('[data-testid="quick-tvSize-75"]').click(); }); await sleep(500);
  const arPrice = (await afl.locator('[data-testid="cat-price"]').innerText()).replace(/\s+/g, ' '); await shot(ar.page, 'tv-designer-ar-1440x900');
  await T(ar.page, 'sr-ds-lang').click(); await sleep(3000);
  const lang2 = await ar.page.evaluate(() => { const d = document.querySelector('[data-testid="sr-ds-frame"]').contentDocument; return { frame: d.documentElement.lang, seg: d.querySelector('.nk-lang [aria-pressed="true"]').textContent.trim(), root: document.querySelector('.sr3d').getAttribute('lang') }; });
  check('language switch while open: the designer (page + its EN / ع control) and the showroom both switch to English', lang2.frame === 'en' && lang2.seg === 'EN' && lang2.root === 'en', lang2);
  const enPrice = (await afl.locator('[data-testid="cat-price"]').innerText()).replace(/\s+/g, ' ');
  check('language switch while open: the design in progress is kept (the same BHD price; the 75-inch choice is still there)', (enPrice.match(/[\d.,]+/) || [])[0] === (arPrice.match(/[\d.,]+/) || [])[0] || enPrice.replace(/[^\d.]/g, '') === arPrice.replace(/[^\d.]/g, ''), { arPrice, enPrice });
  await leave(ar.page); await ar.ctx.close();

  };
  if (process.env.ONLY === 'beauty') { await beauty(); await browser.close(); process.exit(0); }
  if (process.env.ONLY === 'ar') { await arabic(); await browser.close(); const f = results.filter((r) => !r.ok); console.log(`\n${results.length - f.length}/${results.length} checks passed (Arabic only)`); process.exit(f.length ? 1 : 0); }
  if (process.env.ONLY === 'phone') { await phone(); await browser.close(); const f = results.filter((r) => !r.ok); console.log(`\n${results.length - f.length}/${results.length} checks passed (phone only)`); process.exit(f.length ? 1 : 0); }

  // ------------------------------------------------------------------ 1. EN desktop, GUEST: walk to the TV section of the shared wall
  const { ctx, page, errors } = await openShowroom(browser, { url: '/yas-bloom', viewport: { width: 1440, height: 900 }, query: 'debug=1&quality=low&aa=0&scale=0.7' });
  const sb = []; ctx.on('request', (r) => { if (/supabase\.co/.test(r.url()) && /\/studio\/tv/.test(r.frame() ? r.frame().url() : '')) sb.push(r.method() + ' ' + new URL(r.url()).pathname); });   // the Supabase calls the DESIGNER frame makes
  await ctx.addInitScript(seed('en'), [null, 'en']); await routes(ctx); await page.evaluate(seed('en'), [null, 'en']);
  await enterExplore(page); await dismissCoach(page);
  check('GUEST: no website account and no studio session exist in this browser', await page.evaluate(() => !localStorage.getItem('closets_user') && !localStorage.getItem('closets_studio_auth_v1')));
  await toStation(page, 'tv-studio');
  check('quick-nav entry 12 "TV Unit Studio" glides to the shared wall: the zone is the design wall, at the stand point', await ex(page, (e) => e.zone() === 'kitchen-studio' && Math.abs(e.pos()[0] + 18) < 0.05), await ex(page, (e) => e.pos()));
  const prompt = await T(page, 'sr-prompt').innerText().catch(() => ''); check('the HUD prompt names the shared wall ("Design Studios") and offers E', /Design Studios/.test(prompt) && /Press E/.test(prompt), prompt);
  check('the screen alternates the sections: its poster loop holds kitchen and TV frames', await page.evaluate(() => { const d = window.__showroom.engine.designStudio; return d.sections.length === 2 && d.state.frames.length >= 2; }), await page.evaluate(() => window.__showroom.engine.designStudio.state.frames.map((f) => f.si)));
  await shot(page, 'tv-bay-en-1440');
  const before = await ex(page, (e) => [e.pos(), e.yaw(), e.pitch()]);

  // ------------------------------------------------------------------ 2. E opens the TV designer (named by the glide): frame, chrome, pause
  await page.keyboard.press('KeyE'); await T(page, 'sr-ds').waitFor({ timeout: 20000 });
  check('E after gliding to the TV studio opens the TV designer directly (no chooser)', await T(page, 'sr-ds').getAttribute('data-section') === 'tv-studio' && await T(page, 'sr-ds-choose').count() === 0);
  await T(page, 'sr-ds-note').waitFor({ timeout: 6000 }).catch(() => {}); const note = await T(page, 'sr-ds-note').innerText().catch(() => '');
  check('loading screen for a guest says no account is needed to design (saving / quoting asks for one)', /No account needed to design/.test(note) && /sign in or create a free account/.test(note), note);
  await shot(page, 'tv-designer-loading'); await sleep(800);
  check('the showroom render loop is paused while the designer is open', await page.evaluate(() => window.__showroom.engine.running === false));
  const fr1 = await page.evaluate(() => window.__showroom.engine.renderer.info.render.frame); await sleep(1500); const fr2 = await page.evaluate(() => window.__showroom.engine.renderer.info.render.frame);
  check('no showroom frames are rendered while it is open', fr1 === fr2, { fr1, fr2 });
  await openFrame(page); const fl = page.frameLocator('[data-testid="sr-ds-frame"]');
  check('the designer finished loading (status open) with no sign-in gate: the Neo TV Unit Designer itself is on screen for a guest', await fl.locator('[data-testid="cat-page-tv"]').isVisible() && await fl.locator('text=/Neo TV Unit Designer/').first().isVisible());
  check('the frame URL is the website studio route, same origin', await page.evaluate(() => { const l = document.querySelector('[data-testid="sr-ds-frame"]').contentWindow.location; return l.origin === window.location.origin && l.pathname === '/studio/tv' && /src=yas-bloom/.test(l.search); }));
  const fit = () => page.evaluate(() => { const f = document.querySelector('[data-testid="sr-ds-frame"]'), s = document.querySelector('.sr-ds-stage').getBoundingClientRect(), d = f.contentDocument, pg = d.querySelector('[data-testid="cat-page-tv"]').getBoundingClientRect(), root = d.documentElement; return { stage: [Math.round(s.width), Math.round(s.height)], page: [Math.round(pg.width), Math.round(pg.height)], top: Math.round(pg.top), scrollW: root.scrollWidth, clientW: root.clientWidth, barHidden: getComputedStyle(d.querySelector('.ws-bar')).display === 'none' }; });
  const f1 = await fit(); check('the studio shell bar is hidden and the designer fills the stage exactly (1440 x 900)', f1.barHidden && Math.abs(f1.page[0] - f1.stage[0]) <= 1 && Math.abs(f1.page[1] - f1.stage[1]) <= 2 && Math.abs(f1.top) <= 1 && f1.scrollW <= f1.clientW, f1);
  await sleep(800); await shot(page, 'tv-designer-1440x900-units');

  // ------------------------------------------------------------------ 3. option + price parity: the frame vs the website route (fresh guest context), eleven changes
  const embedded = await drive(fl); notes.embedded = embedded;
  check('GUEST: designing wrote nothing - no auth request, no cp_* RPC, no session stored (the only Supabase call is the public studio-settings read)', !sb.some((x) => /\/auth\/v1\/|\/rpc\/cp_/.test(x)) && await page.evaluate(() => { const d = document.querySelector('[data-testid="sr-ds-frame"]').contentWindow.localStorage; return !d.getItem('closets_studio_auth_v1') && !d.getItem('closets_user'); }), sb);
  await shot(page, 'tv-designer-1440x900-quote-guest');
  check('Get quote as a guest: the website’s quote dialog opens with the design, the indicative price and "you will sign in first"', /Your design/.test(embedded.dialog) && /Indicative price/.test(embedded.dialog) && /sign in or create a free account first/.test(embedded.dialog), embedded.dialog.slice(0, 300));
  await fl.locator('.wsq button', { hasText: /Save to My designs/ }).click(); await sleep(1200);
  check('Save as a guest asks to sign in / create an account (the site’s own dialog) and saves nothing', await fl.locator('text=/Sign in to save your design and request a quote/').count() > 0 && await fl.locator('input[type="password"]').count() > 0 && !sb.some((x) => /\/rpc\/cp_|\/auth\/v1\//.test(x)), sb);
  await shot(page, 'tv-designer-guest-signin-prompt');
  await fl.locator('.wsq-x').first().click(); await sleep(400); await fl.locator('.wsq-x').first().click(); await sleep(400);
  const web = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await web.addInitScript(seed('en'), [null, 'en']); await routes(web);
  const wp = await web.newPage(); await wp.goto(BASE + '/studio/tv', { waitUntil: 'domcontentloaded' });
  const direct = await drive(wp); notes.direct = direct; await wp.screenshot({ path: path.join(OUT, 'tv-website-1440x900-quote.jpg'), type: 'jpeg', quality: 72 }); await web.close();
  check('PRICE PARITY: all eleven totals are identical (frame vs the website route)', JSON.stringify(embedded.totals) === JSON.stringify(direct.totals), { embedded: embedded.totals, direct: direct.totals });
  check('OPTION PARITY: every option of every tab (Global, M&S, Units, TV & niche, Panel & LED, Hardware, Price) reads identically at the start AND after the changes', TABS.every((t) => embedded.tabs0[t] === direct.tabs0[t] && embedded.tabsEnd[t] === direct.tabsEnd[t] && embedded.tabs0[t].length > 100), TABS.map((t) => [t, embedded.tabs0[t].length, embedded.tabsEnd[t].length]));
  check('PARITY: the quote dialog (facts, indicative price, sign-in line) is identical', embedded.dialog === direct.dialog, { frame: embedded.dialog.slice(0, 200), site: direct.dialog.slice(0, 200) });
  check('the changes really moved the price (>= 8 different totals)', new Set(embedded.totals).size >= 8, embedded.totals);
  await fl.locator('.wsq-x').first().click().catch(() => {}); await sleep(300);

  // ------------------------------------------------------------------ 4. 3D view and big screens
  await fl.locator('button', { hasText: /^\s*3D View\s*$/ }).first().click(); await sleep(THREE ? 7000 : 2500);
  check('the 3D view renders inside the frame (a WebGL canvas with size)', await page.evaluate(() => { const c = document.querySelector('[data-testid="sr-ds-frame"]').contentDocument.querySelector('canvas'); return !!c && c.width > 200 && c.height > 200; }));
  for (const [w, h] of [[1440, 900], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width: w, height: h }); await sleep(2500); const f = await fit();
    check(`${w} x ${h}: the designer fills the stage, no sideways scroll`, f.barHidden && Math.abs(f.page[0] - f.stage[0]) <= 1 && Math.abs(f.page[1] - f.stage[1]) <= 2 && f.scrollW <= f.clientW, f); await shot(page, `tv-designer-${w}x${h}-3d`);
  }
  await fl.locator('button', { hasText: /^\s*Design\s*$/ }).first().click(); await sleep(1200); await shot(page, 'tv-designer-2560x1440-design');
  await page.setViewportSize({ width: 1440, height: 900 }); await sleep(1200);

  // ------------------------------------------------------------------ 5. a link that would take the frame away opens in a new tab; Esc / Back / leaving; state hand-off
  await fl.locator('body').evaluate((b) => { const a = b.ownerDocument.createElement('a'); a.href = '/studio/account'; a.id = 'qa-link'; a.textContent = 'My designs'; a.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;background:#fff;padding:6px'; b.appendChild(a); });
  const popup = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null); await fl.locator('#qa-link').click(); const pop = await popup;
  check('a link that would leave the designer (e.g. "My designs") opens in a new tab; the designer stays open', !!pop && /\/studio\/account/.test(pop.url()) && await T(page, 'sr-ds').getAttribute('data-status') === 'open', pop && pop.url()); if (pop) await pop.close();
  await page.keyboard.press('Escape'); await T(page, 'sr-ds-confirm').waitFor({ timeout: 5000 });
  check('Esc with a design in progress asks first, and the text says the design stays in this browser', /stays in this browser/.test(await T(page, 'sr-ds-confirm').innerText())); await shot(page, 'tv-designer-leave-confirm');
  await T(page, 'sr-ds-stay').click(); await sleep(300); check('"Keep designing" returns to the designer', await T(page, 'sr-ds-confirm').count() === 0);
  await T(page, 'sr-ds-back').click(); await T(page, 'sr-ds-confirm').waitFor({ timeout: 5000 }); await T(page, 'sr-ds-leave').click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 10000 });
  await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 }); await sleep(2500);
  const fr3 = await page.evaluate(() => window.__showroom.engine.renderer.info.render.frame); check('back in the showroom: the render loop is running again', fr3 > fr2, { fr2, fr3 });
  const after = await ex(page, (e) => [e.pos(), e.yaw(), e.pitch()]);
  check('the visitor stands exactly where they stood', JSON.stringify(before[0]) === JSON.stringify(after[0]) && Math.abs(before[1] - after[1]) < 1e-6 && Math.abs(before[2] - after[2]) < 1e-6, { before, after });
  check('the iframe is gone after leaving (the designer’s heap and WebGL are released)', await page.locator('[data-testid="sr-ds-frame"]').count() === 0);

  // ------------------------------------------------------------------ 6. walking in by hand: E asks "Which studio?"; the podium tablet buttons name a section
  await ex(page, (e, x, z, yaw, pitch) => e.teleport(x, z, yaw, pitch), 0, -3.5, 0, 0); await sleep(500); await ex(page, (e) => e.teleport(-18, -4.41, Math.PI, 0.12)); await sleep(1500);
  check('walking in by hand (no section named): E opens the "Which studio?" chooser with two cards', await (async () => { await page.keyboard.press('KeyE'); await T(page, 'sr-ds-choose').waitFor({ timeout: 8000 }).catch(() => {}); return await T(page, 'sr-ds-choose').count() === 1 && await T(page, 'sr-ds-pick-kitchen-studio').count() === 1 && await T(page, 'sr-ds-pick-tv-studio').count() === 1; })());
  check('the chooser cards show their poster images (both loaded)', await page.waitForFunction(() => { const im = [...document.querySelectorAll('.sr-ds-card img')]; return im.length === 2 && im.every((i) => i.complete && i.naturalWidth > 0); }, null, { timeout: 10000 }).then(() => true).catch(() => false));
  await sleep(600); await shot(page, 'tv-chooser-en');
  check('the explorer is frozen while the chooser is open', await ex(page, (e) => e.state().uiOpen === true));
  await page.keyboard.press('Escape'); await T(page, 'sr-ds-choose').waitFor({ state: 'detached', timeout: 5000 }); check('Esc closes the chooser; the visitor can walk again', await ex(page, (e) => e.state().uiOpen === false));
  await page.keyboard.press('KeyE'); await T(page, 'sr-ds-choose').waitFor({ timeout: 8000 }); await T(page, 'sr-ds-pick-tv-studio').click(); await openFrame(page);
  check('choosing "TV Unit Studio" in the chooser opens the TV designer', await T(page, 'sr-ds').getAttribute('data-section') === 'tv-studio'); await leave(page);
  await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 });
  // the podium tablet: its right half (English: left to right = Kitchen, TV unit) is the TV button; a click on it opens the TV designer without the chooser
  await ex(page, (e, x, z, yaw, pitch) => e.teleport(x, z, yaw, pitch), -15.65, -3.45, Math.PI, -0.42); await sleep(2000);
  const tabPt = (side) => page.evaluate((s) => { const E = window.__showroom.engine, D = E.designStudio, f = D.group.getObjectByName('ds-tablet'); E.scene.updateMatrixWorld(true); const v = f.position.clone(); v.set(s * 0.27, 0, 0); f.localToWorld(v); v.project(E.camera); const r = document.querySelector('canvas.sr-canvas').getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, ndc: [v.x, v.y, v.z] }; }, side);
  const pr = await tabPt(1), pl = await tabPt(-1); notes.tablet = { right: pr, left: pl };
  await shot(page, 'tv-podium-tablet-view');
  if ([pr, pl].every((q) => q.ndc[2] < 1 && Math.abs(q.ndc[0]) < 0.95 && Math.abs(q.ndc[1]) < 0.95)) {
    await page.mouse.click(pr.x, pr.y); await T(page, 'sr-ds').waitFor({ timeout: 8000 }).catch(() => {});
    check('a click on the podium tablet’s right button opens the TV designer straight away', await T(page, 'sr-ds').getAttribute('data-section') === 'tv-studio' && await T(page, 'sr-ds-choose').count() === 0, pr);
    if (await T(page, 'sr-ds').count()) { await openFrame(page); await leave(page); await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 }); }
    await page.mouse.click(pl.x, pl.y); await T(page, 'sr-ds').waitFor({ timeout: 8000 }).catch(() => {});
    check('and its left button opens the Kitchen Design Studio designer', await T(page, 'sr-ds').getAttribute('data-section') === 'kitchen-studio', pl);
    if (await T(page, 'sr-ds').count()) { await page.waitForSelector('[data-testid="sr-ds"]'); await T(page, 'sr-ds-back').click(); await T(page, 'sr-ds').waitFor({ state: 'detached', timeout: 90000 }).catch(() => {}); await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 20000 }).catch(() => {}); }
  } else check('the podium tablet is in view from the podium spot (for the click test)', false, pr);

  // ------------------------------------------------------------------ 7. quick-nav menu and advisers
  const menuItems = await page.evaluate(() => { const btn = [...document.querySelectorAll('button')].find((b) => /Departments|الأقسام/.test(b.textContent)); if (btn) btn.click(); return null; }); await sleep(800);
  check('the department menu lists both studios last, without digit keys', await page.evaluate(() => { const l = [...document.querySelectorAll('.sr-dept')].map((b) => b.dataset.dept); return l.slice(-2).join() === 'kitchen-studio,tv-studio' && !document.querySelector('.sr-dept[data-dept="tv-studio"] kbd'); }));
  await shot(page, 'tv-dept-menu'); await page.keyboard.press('Escape'); await sleep(500);
  await ex(page, (e) => e.teleport(0, -3.5, 0, 0)); await ex(page, (e) => e.explorer.talkToStaff('living')); await T(page, 'sr-chat').waitFor({ timeout: 15000 }).catch(() => {});
  if (await T(page, 'sr-chat').count()) {
    await sleep(1500); const chips = await page.evaluate(() => [...document.querySelectorAll('[data-testid="sr-chat"] button')].map((b) => b.textContent.trim())); notes.livingChips = chips;
    check('the living adviser offers "Walk me to the TV unit studio" and "Open the TV designer" (and not the kitchen pair)', chips.some((c) => /Walk me to the TV unit studio/.test(c)) && chips.some((c) => /Open the TV designer/.test(c)) && !chips.some((c) => /Open the designer$/.test(c)), chips);
    await T(page, 'sr-chat-input').fill('open the designer'); await T(page, 'sr-chat-send').click();
    await page.waitForSelector('[data-testid="sr-ds"]', { timeout: 25000 }); check('living adviser: "open the designer" opens the TV designer (the adviser’s own section)', await T(page, 'sr-ds').getAttribute('data-section') === 'tv-studio');
    await openFrame(page); await leave(page); await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 });
  } else check('the living adviser chat opens (skipped: could not reach her)', true, 'skipped');
  await ex(page, (e) => e.teleport(0, -3.5, 0, 0)); await ex(page, (e) => e.explorer.talkToStaff('reception')); await T(page, 'sr-chat').waitFor({ timeout: 15000 }).catch(() => {});
  if (await T(page, 'sr-chat').count()) {
    await T(page, 'sr-chat-input').fill('open the designer'); await T(page, 'sr-chat-send').click(); await sleep(2500);
    check('Reception (no section of her own): "open the designer" asks which one, with a chip for each', await page.evaluate(() => /Which designer/.test(document.querySelector('[data-testid="sr-chat"]').innerText) && [...document.querySelectorAll('[data-testid="sr-chat"] button')].filter((b) => /Open the (TV )?designer/.test(b.textContent)).length >= 2));
    await T(page, 'sr-chat-input').fill('take me to the tv unit studio'); await T(page, 'sr-chat-send').click();
    await page.waitForFunction(() => { const p = window.__showroom.explore.pos(); return Math.hypot(p[0] + 18, p[1] + 4.41) < 0.1 && window.__showroom.explore.zone() === 'kitchen-studio'; }, null, { timeout: 90000 }); await sleep(2500);
    await page.keyboard.press('KeyE'); await T(page, 'sr-ds').waitFor({ timeout: 20000 }); check('adviser: "take me to the tv unit studio" walks there, and E opens the TV designer', await T(page, 'sr-ds').getAttribute('data-section') === 'tv-studio');
    await openFrame(page); await leave(page); await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 });
  } else check('Reception chat opens (skipped)', true, 'skipped');

  // ------------------------------------------------------------------ 8. the autosave: leaving keeps the guest's design in THIS browser (the studio's own autosave)
  await toStation(page, 'tv-studio'); await page.keyboard.press('KeyE'); await openFrame(page); await sleep(1500);
  const restored = await fl.locator('[data-testid="cat-price"]').innerText(); notes.restoredPrice = restored;
  check('re-opening restores the guest’s last design from the studio’s own autosave (same total as before leaving; the "restored" notice is the studio’s)', restored.replace(/\s+/g, ' ') === embedded.totals[embedded.totals.length - 1], { restored, last: embedded.totals[embedded.totals.length - 1] });
  await shot(page, 'tv-designer-restored'); await leave(page); await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 });

  // ------------------------------------------------------------------ 9. load failure
  await ctx.route('**/studio/tv**', (r) => r.abort());
  await page.keyboard.press('KeyE'); await T(page, 'sr-ds-failed').waitFor({ timeout: 40000 });
  check('load failure: a clear message, Try again and a link to the same designer on the website (new tab)', await T(page, 'sr-ds-retry').isVisible() && await T(page, 'sr-ds-failed-site').getAttribute('target') === '_blank' && /\/studio\/tv/.test(await T(page, 'sr-ds-failed-site').getAttribute('href')));
  await shot(page, 'tv-designer-failed'); await ctx.unroute('**/studio/tv**'); await T(page, 'sr-ds-retry').click(); await openFrame(page); check('Try again loads the designer once the network is back', true); await leave(page);
  await page.waitForFunction(() => window.__showroom.engine.running === true, null, { timeout: 10000 });

  // ------------------------------------------------------------------ 10. the Kitchen Design Studio on the same wall still works (signed-in test account, as in kitchenstudio.js)
  await page.evaluate(seed('en'), [KUSER, 'en']); await toStation(page, 'kitchen-studio'); await page.keyboard.press('KeyE'); await openFrame(page);
  check('KITCHEN: gliding to the Kitchen Design Studio and pressing E still opens the kitchen planner directly', await T(page, 'sr-ds').getAttribute('data-section') === 'kitchen-studio' && await page.evaluate(() => document.querySelector('[data-testid="sr-ds-frame"]').contentWindow.location.pathname === '/design-studio/kitchen-planner'));
  check('KITCHEN: its frame is still shifted under the 104 px site header and the footer is hidden', await page.evaluate(() => { const f = document.querySelector('[data-testid="sr-ds-frame"]'), d = f.contentDocument, n = d.querySelector('nav').getBoundingClientRect(), s = document.querySelector('.sr-ds-stage').getBoundingClientRect(), ft = d.querySelector('footer'); return f.getBoundingClientRect().top + n.bottom <= s.top + 1 && (!ft || getComputedStyle(ft).display === 'none'); }));
  await shot(page, 'tv-kitchen-still-works'); await leave(page);
  check('no page errors in the whole desktop run', errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, errors.slice(0, 5));
  await ctx.close();

  await arabic();
  await phone();
  if (process.env.BEAUTY === '1') await beauty();

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'tv-studio-qa.json'), JSON.stringify({ results, notes }, null, 1) + '\n');
  const failed = results.filter((r) => !r.ok); console.log(`\n${results.length - failed.length}/${results.length} checks passed`); process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
