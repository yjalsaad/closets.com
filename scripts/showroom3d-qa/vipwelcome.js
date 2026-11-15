/* Welcome slide + national flags QA (headless Chromium on SwiftShader): the room opens on the Welcome slide of the Management meeting; EN / AR on the big screen; the two flagpoles in the room (wide, close, from behind);
 * the company presentation's Welcome slide; the phone view (bottom sheet + Reading mode); relative-date wording by mocking the clock and the CMS rows. Flag pixels vs the reference SVGs: scripts/showroom3d-qa/flagcheck.js.
 * Needs a served build:  node scripts/showroom3d-qa/serve.js build 5066   then   BASE=http://localhost:5066 OUT=<dir> node scripts/showroom3d-qa/vipwelcome.js [room|slide|mobile|cms] */
const L = require('./lib.js');
const { check, ex, shot } = L;
const MED = 'debug=1&quality=medium&aa=0&scale=0.5', HIGH = 'debug=1&quality=high&aa=0&scale=0.75';
const settle = async (page, ms = 600) => { await page.waitForFunction(() => !window.__showroom.explore.explorer.fly, null, { timeout: 120000 }); await page.waitForTimeout(ms); };
const wait = (page, ms) => page.waitForTimeout(ms);
const dismissCoach = async (page) => { await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); }); await page.waitForTimeout(300); };
const setHud = (page, on) => page.evaluate((on2) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach, .sr-touch, .sr-greet, [data-testid="sr-greet-bubble"]').forEach((n) => { n.style.visibility = on2 ? '' : 'hidden'; }), on);
const vip = (page, fn, ...a) => page.evaluate(([f, args]) => { const v = window.__showroom.engine.products.vip, x = window.__showroom.explore.explorer; return (new Function('v', 'x', 'args', 'return (' + f + ')(v, x, ...args)'))(v, x, args); }, [fn.toString(), a]);
const mockApi = (page, rows) => page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: /website_content/.test(r.request().url()) ? JSON.stringify(rows || []) : '[]' }));
async function enterVip(page, tap = false) {
  await L.enterExplore(page, { tap }); await dismissCoach(page); await ex(page, (e, a) => e.teleport(...a), [0, -30.2, 0, 0.05]); await wait(page, 500);
  if (tap) await page.tap('[data-testid="sr-interact"]'); else { await page.keyboard.press('KeyE'); }
  await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 30000 }); await settle(page, 900);
}
/** put the camera somewhere in the room (explorer fly), HUD hidden, then screenshot */
async function look(page, name, pos, lookAt, fov = 60, q = 70) { await vip(page, (v, x, p, l, f) => x.flyTo({ pos: p, look: l, fov: f }), pos, lookAt, fov); await settle(page, 700); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 400); await setHud(page, false); await wait(page, 300); const p = await shot(page, name, { quality: q }); await setHud(page, true); return p; }

async function room(b) {
  const o = await L.openShowroom(b, { query: HIGH, viewport: { width: 1280, height: 720 } }); const page = o.page; await mockApi(page); await enterVip(page);
  check('the room opens on the Welcome slide of the Management meeting', (await vip(page, (v, x) => x.deck.id + ':' + x.deck.slides[x.ds.slide].id)) === 'meeting:welcome');
  await look(page, 'vipwelcome-00-room-both-flags', [0, 1.7, -29.4], [0, 2.0, -35.4], 82);
  await look(page, 'vipwelcome-01-room-wide', [0, 1.7, -28.6], [0, 2.1, -35.4], 66);
  await look(page, 'vipwelcome-02-room-flags-left', [-1.2, 1.7, -31.5], [-4.85, 2.0, -35.2], 48);
  await look(page, 'vipwelcome-03-room-flags-right', [1.2, 1.7, -31.5], [4.85, 2.0, -35.2], 48);
  await look(page, 'vipwelcome-04-flag-bh-close', [-4.85, 1.9, -33.6], [-4.85, 2.25, -35.2], 36, 82);
  await look(page, 'vipwelcome-05-flag-sa-close', [4.85, 1.9, -33.6], [4.85, 2.25, -35.2], 36, 82);
  await look(page, 'vipwelcome-06-flags-from-behind-sa', [4.9, 2.0, -35.95], [4.85, 2.1, -35.0], 40, 80);   // behind the back wall panel is not reachable: expect the wall; kept as a negative check
  const info = await vip(page, (v) => ({ names: v.flags.group.children.map((c) => c.name), calls: v.group.children.length, draw: window.__showroom.engine.renderer && window.__showroom.engine.renderer.info.render.calls }));
  check('the room contains the two flag cloths (each with a back face) and the merged brass poles', ['vip-flag-bh', 'vip-flag-sa', 'vip-flag-bh-back', 'vip-flag-sa-back', 'vip-flag-poles'].every((n) => info.names.includes(n)), info);
  check('no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}
async function slide(b) {
  for (const [lang, url] of [['en', '/yas-bloom'], ['ar', '/ar/yas-bloom']]) {
    const o = await L.openShowroom(b, { url, query: MED, viewport: { width: 1280, height: 720 } }); const page = o.page; await mockApi(page); await enterVip(page);
    await page.screenshot({ path: L.OUT + '/vipwelcome-10-panel-' + lang + '.jpg', type: 'jpeg', quality: 60 });
    await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 500); await setHud(page, false); await wait(page, 300); await shot(page, 'vipwelcome-11-big-screen-' + lang, { quality: 78 }); await setHud(page, true);
    check(lang + ': the Welcome slide is on the big screen (meeting deck, slide 1)', (await vip(page, (v, x) => x.deck.slides[x.ds.slide].id)) === 'welcome');
    await page.click('[data-testid="sr-vip-exit-present"]'); await settle(page, 700);
    await page.selectOption('[data-testid="sr-vip-deck-select"]', 'default'); await settle(page, 900); await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 500); await setHud(page, false); await wait(page, 300); await shot(page, 'vipwelcome-12-company-' + lang, { quality: 70 }); await setHud(page, true);
    await page.click('[data-testid="sr-vip-exit-present"]'); await settle(page, 600); const cnt = await page.locator('[data-testid="sr-vip-count"]').innerText(); check(lang + ': the company presentation starts on the Welcome slide (not counted as a station)', /Welcome|ترحيب/.test(cnt), cnt);
    await page.click('[data-testid="sr-vip-next"]'); await settle(page, 600); const c2 = await page.locator('[data-testid="sr-vip-count"]').innerText(); check(lang + ': next slide is "Station 1 / 4"', /Station\s*1\s*\/\s*4|المحطة\s*1\s*\/\s*4|1\s*\/\s*4/.test(c2), c2);
    await page.click('[data-testid="sr-vip-big"]'); await settle(page, 700); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 400); await setHud(page, false); await wait(page, 300); await shot(page, 'vipwelcome-13-company-story-' + lang, { quality: 60 }); await setHud(page, true);
    check(lang + ': no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  }
}
async function mobile(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 390, height: 844 }, mobile: true }); const page = o.page; await mockApi(page); await enterVip(page, true);
  await shot(page, 'vipwelcome-20-mobile-panel', { quality: 62 });
  await page.tap('[data-testid="sr-vip-read"]'); await wait(page, 2200); await shot(page, 'vipwelcome-21-mobile-reader', { quality: 62 });
  const fl = await page.$$eval('.sr-vip-reader [data-testid^="sr-flag-"]', (n) => n.map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.testid, Math.round(r.width), Math.round(r.height)]; })); check('mobile Reading mode shows both flags, upright, at their official proportions', fl.length === 2 && Math.abs(fl[0][1] / fl[0][2] - 5 / 3) < 0.05 && Math.abs(fl[1][1] / fl[1][2] - 3 / 2) < 0.05, fl);
  check('mobile: no horizontal overflow, no page errors', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) && o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  const o2 = await L.openShowroom(b, { url: '/ar/yas-bloom', query: MED, viewport: { width: 390, height: 844 }, mobile: true }); const p2 = o2.page; await mockApi(p2); await enterVip(p2, true); await p2.tap('[data-testid="sr-vip-read"]'); await wait(p2, 2200); await shot(p2, 'vipwelcome-22-mobile-reader-ar', { quality: 62 }); await o2.ctx.close();
}
async function cms(b) {
  // the clock is pinned to 14 Nov 2026 and to 17 Nov 2026; the CMS row changes the date with no deploy
  for (const [label, now, rows, want] of [['tomorrow', '2026-11-15T09:00:00Z', [], /tomorrow/i], ['upcoming', '2026-11-12T09:00:00Z', [], /Meeting/], ['passed', '2026-11-17T09:00:00Z', [], null], ['CMS date', '2026-11-15T09:00:00Z', [{ key: 'vip.meeting.date', value: '2026-12-02' }], /Wednesday 2 December 2026/]]) {
    const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 }, init: `(() => { const T = new Date('${now}').getTime(), R = Date; const D = function (...a) { return a.length ? new R(...a) : new R(T + (R.now() - D.t0)); }; D.t0 = R.now(); D.now = () => T + (R.now() - D.t0); D.UTC = R.UTC; D.parse = R.parse; D.prototype = R.prototype; window.Date = D; })();` }); const page = o.page; await mockApi(page, rows); await enterVip(page);
    await page.waitForTimeout(1200); const txt = await page.locator('[data-testid="sr-vip-welcome"]').innerText(); check('welcome slide (' + label + ')', want ? want.test(txt) : !/Meeting|tomorrow|today|Monday 16/i.test(txt), txt.replace(/\n/g, ' | '));
    if (label === 'tomorrow') { await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); } await o.ctx.close();
  }
}
(async () => {
  const b = await L.launch(); const only = process.argv[2];
  const run = async (name, fn) => { if (only && only !== name) return; try { await fn(b); } catch (e) { check(`suite "${name}" ran to the end`, false, String(e && e.message).slice(0, 400)); } };
  try { await run('room', room); await run('slide', slide); await run('mobile', mobile); await run('cms', cms); } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); bad.forEach((r) => console.log('FAILED:', r.name, JSON.stringify(r.detail)));
  process.exit(bad.length ? 1 : 0);
})();
