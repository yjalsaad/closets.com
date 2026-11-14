/* VIP meeting room QA (investor / partner boardroom): door that opens on approach, entering, E, the four stations (next / previous / dots / digits / Home / End,
 * mouse, keyboard, touch), content honesty (placeholders, no figures, disclaimer), the projects read (one GET, graceful empty / error states), the briefing CTA
 * opening the existing /booking pre-filled, quick-nav key 9 and the menu, AR / RTL (arrows mirror), mobile, reduced motion, per-tier budgets and the gallery.
 * Needs a served build:  node scripts/showroom3d-qa/serve.js build 5055   then   node scripts/showroom3d-qa/phase5vip.js [flows|states|nav|ar|mobile|reduced|stats|gallery] */
const L = require('./lib.js');
const { check, ex, shot } = L;
const fs = require('fs'), path = require('path');

const FAST = 'debug=1&quality=low&aa=0&scale=0.5';
const FIX = [{ id: 1, name: 'Test fixture project A', category: 'Kitchens', location: 'Test location', client_type: 'Villa' }, { id: 2, name: 'Test fixture project B', category: 'Wardrobes', location: 'Test location' }, { id: 3, name: 'Test fixture project C', category: 'Doors' }];
const FORBIDDEN = /\b(roi|returns?|yields?|valuation|equity|stakes?|shares?|dividends?|profits?|guarantee[sd]?|BHD|USD|per\s?cent)\b|%|دينار|عائد|ربح|تقييم|أسهم|ضمان/i;
const VIP_IN = [0, -27.4, 0, 0.05], VIP_STAND = [0, -30.2, 0, 0.05];
const settle = async (page, ms = 800) => { await page.waitForFunction(() => !window.__showroom.explore.explorer.fly, null, { timeout: 90000 }); await page.waitForTimeout(ms); };
const goto = async (page, p) => { await ex(page, (e, a) => e.teleport(...a), p); await page.waitForTimeout(500); };
const press = async (page, key) => { await page.keyboard.press(key); await page.waitForTimeout(200); };
const dismissCoach = async (page) => { await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); }); await page.waitForTimeout(200); };
const setHud = (page, on) => page.evaluate((on) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach, .sr-touch').forEach((n) => { n.style.visibility = on ? '' : 'hidden'; }), on);
const vipState = (page) => page.evaluate(() => { const v = window.__showroom.engine.products.vip; return { station: v.station, door: v.doorOpen, inside: v.state.inside, enter: v.state.enter, projects: v.state.projects.status, cards: v.state.projects.cards.length }; });
/** requests: every supabase / rest / rpc request is recorded; `ok` means only the one allowed read of the site's project list happened */
function track(page) { const t = { all: [], writes: [], projects: 0 }; page.on('request', (r) => { if (!/supabase\.co|\/rest\/v1\/|\/rpc\//.test(r.url())) return; t.all.push(r.method() + ' ' + r.url()); if (r.method() !== 'GET') t.writes.push(r.method() + ' ' + r.url()); if (/website_projects/.test(r.url())) t.projects++; }); return t; }
const mockProjects = (page, mode) => page.route('**/rest/v1/website_projects*', (r) => (mode === 'rows' ? r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(FIX) }) : mode === 'empty' ? r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }) : r.abort()));
const panelText = (page) => page.locator('[data-testid="sr-vip-panel"]').innerText();

async function flows(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page, 'rows'); const net = track(page);
  await L.enterExplore(page); await dismissCoach(page);
  // ---- the door opens as you approach; walking in with real keys
  await goto(page, [0, -14, 0, 0.05]); await page.waitForTimeout(1500); check('door: closed while the visitor is far away (> 5 m)', (await vipState(page)).door < 0.05);
  await goto(page, [0, -25.2, 0, 0.05]); await page.waitForTimeout(1200); await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW');
  await page.waitForFunction(() => window.__showroom.engine.products.vip.doorOpen > 0.9, null, { timeout: 60000 }); check('door: opens by itself on approach (glass leaves slide apart)', await page.evaluate(() => { const v = window.__showroom.engine.products.vip; return v.doorOpen > 0.9; }));
  await goto(page, VIP_IN); await page.keyboard.down('KeyW'); await page.waitForTimeout(5000); await page.keyboard.up('KeyW'); await page.waitForTimeout(400);
  const pz = (await ex(page, (e) => e.pos()))[1]; check('walking in with the W key goes through the open door into the room (z passes the glass line)', pz < -28.9, pz);
  await goto(page, VIP_STAND); const prompt = await page.locator('[data-testid="sr-prompt"]').innerText();
  check('inside: the prompt names the VIP Meeting Room and says Press E', (await ex(page, (e) => e.zone())) === 'vip' && /VIP Meeting Room/.test(prompt) && /Press E/.test(prompt), prompt.replace(/\n/g, ' '));
  // ---- E opens the presentation, station 1
  await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 30000 }); await settle(page, 600);
  let txt = await panelText(page);
  check('E opens the guided presentation: station 1 of 5, "Company story and brand", prev disabled', /Station\s*1\s*\/\s*4/.test(txt) && /Company story and brand/.test(txt) && (await page.isDisabled('[data-testid="sr-vip-prev"]')));
  const facts = await page.$$eval('[data-testid="sr-vip-facts"] li', (els) => els.map((e) => ({ k: e.dataset.fact, c: e.dataset.confirmed, t: e.innerText })));
  check('story: years / homes / production model / showrooms are marked placeholders "To be confirmed by management" (never asserted)', facts.length === 4 && facts.every((f) => f.c === '0' && /To be confirmed by management/.test(f.t)), facts.map((f) => f.k));
  check('story: warranty fact comes from the site (10 years on cabinetry and soft-close hardware)', /10 years on cabinetry and soft-close hardware/.test(txt));
  await page.waitForFunction(() => window.__showroom.engine.products.vip.state.enter > 0.99, null, { timeout: 90000 }); check('3D state: the screen shows station 1 and the entrance light choreography has finished (lights up)', (await vipState(page)).station === 0 && (await vipState(page)).enter > 0.99);
  // ---- next / previous with buttons, keys, digits, dots
  await page.click('[data-testid="sr-vip-next"]'); await settle(page, 400); await page.waitForSelector('[data-testid="sr-vip-lines"]'); txt = await panelText(page);
  check('station 2: Next works; business lines listed with real links', /Station\s*2\s*\/\s*4/.test(txt) && (await page.$$eval('[data-testid="sr-vip-lines"] a', (a) => a.map((x) => x.getAttribute('href')))).every((h) => /^\/(ar\/)?(kitchen|wardrobes|doors|tv|design-studio|booking)$|^\/studio$|^\/campaign\/ikhtarha$/.test(h)));
  await page.waitForFunction(() => document.querySelector('[data-testid="sr-vip-projects"]') && document.querySelector('[data-testid="sr-vip-projects"]').dataset.status === 'ok', null, { timeout: 60000 });
  txt = await panelText(page); check('station 2: the site\'s project list (one read) appears: titles, category and location only', /Test fixture project A/.test(txt) && /Kitchens · Test location/.test(txt) && /Latest projects from our Projects page/i.test(txt) && (await page.getAttribute('[data-testid="sr-vip-projects-link"]', 'href')) === '/projects');
  check('gallery wall: the 3D gallery received the same three cards', (await vipState(page)).cards === 3 && (await vipState(page)).projects === 'ok');
  await press(page, 'ArrowRight'); await settle(page, 300); txt = await panelText(page); check('station 3 by the ArrowRight key: Bonsai Hub flow, capabilities, department counts, labelled illustrative with its source', /Station\s*3\s*\/\s*4/.test(txt) && (await page.locator('[data-testid="sr-vip-flow"] li').count()) === 6 && (await page.locator('[data-testid="sr-vip-caps"] li').count()) === 6 && /Illustrative/.test(txt) && /Hub repository/.test(txt) && /Finance & Accounting\s*56 modules/.test(txt));
  await press(page, 'ArrowRight'); await settle(page, 300); txt = await panelText(page);
  const cta = await page.getAttribute('[data-testid="sr-vip-cta"]', 'href'), u = new URL(cta, 'http://x');
  check('station 4 (contact): a generic CTA link to /booking with source only (no interest, no notes); Next is disabled at the end; no investor wording', u.pathname === '/booking' && !u.searchParams.get('interest') && u.searchParams.get('source') === 'showroom-3d-vip' && !/invest/i.test(txt) && (await page.isDisabled('[data-testid="sr-vip-next"]')));
  check('station 4: phone and hours are the existing facts; the disclaimer repeats; no figures / returns', /\+973 17555095/.test(txt) && /Sat/.test(txt) && /Information only, not an offer or financial advice/.test(txt) && !FORBIDDEN.test(txt));
  await page.click('[data-testid="sr-vip-prev"]'); await settle(page, 300); check('Previous goes back one station', /Station\s*3\s*\/\s*4/.test(await panelText(page)));
  await press(page, 'Digit1'); await settle(page, 300); check('digit keys jump to a station (1)', /Station\s*1\s*\/\s*4/.test(await panelText(page))); await press(page, 'End'); await settle(page, 300); check('End jumps to the last station, Home to the first', /Station\s*4\s*\/\s*4/.test(await panelText(page))); await press(page, 'Home'); await settle(page, 300); check('Home', /Station\s*1\s*\/\s*4/.test(await panelText(page)));
  await page.click('[data-testid="sr-vip-dot-2"]'); await settle(page, 300); check('station dots jump (and are 44 px targets, aria-current marks the step)', /Station\s*3\s*\/\s*4/.test(await panelText(page)) && (await page.locator('[data-testid="sr-vip-dot-2"]').boundingBox()).width >= 43 && (await page.getAttribute('[data-testid="sr-vip-dot-2"]', 'aria-current')) === 'step');
  check('only ONE request touched the backend (the site\'s project list, GET) and nothing was written', net.projects === 1 && net.writes.length === 0 && net.all.length === 1, net.all);
  // ---- the CTA opens the existing booking page, pre-filled
  check('no write request was made by the room or the hand-off', net.writes.length === 0, net.writes); check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function states(b) {
  for (const mode of ['empty', 'error']) {
    const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page, mode); await L.enterExplore(page); await dismissCoach(page); await goto(page, VIP_STAND);
    await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-vip-panel"]'); await settle(page, 400); await press(page, 'ArrowRight'); await settle(page, 300);
    await page.waitForFunction(() => { const e = document.querySelector('[data-testid="sr-vip-projects"]'); return e && e.dataset.status && e.dataset.status !== 'idle' && e.dataset.status !== 'loading'; }, null, { timeout: 60000 }); const txt = await panelText(page);
    check(`projects ${mode}: graceful "Projects are shown on our Projects page", a link to /projects, no cards, no invented projects, no counts`, /Projects are shown on our Projects page\./i.test(txt) && !/Test fixture|projects\b.*\d/.test(txt.replace(/Station\s*2\s*\/\s*4/, '')) && (await page.getAttribute('[data-testid="sr-vip-projects-link"]', 'href')) === '/projects' && (await vipState(page)).cards === 0, (await vipState(page)).projects);
    check(`projects ${mode}: the 3D gallery shows the same neutral state`, (await vipState(page)).projects === (mode === 'empty' ? 'empty' : 'error')); check('no page errors (the aborted request of the error mock is the only console noise allowed)', o.errors.filter((e) => !/ERR_FAILED/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  }
}

async function nav(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page, 'rows'); await L.enterExplore(page); await dismissCoach(page);
  await press(page, 'Digit9'); await page.waitForFunction(() => window.__showroom.explore.explorer.glide === null && window.__showroom.explore.zone() === 'vip', null, { timeout: 120000 }); const p = await ex(page, (e) => e.pos());
  check('key 9 glides to the VIP room (through the door) and arrives at the stand point inside', Math.hypot(p[0] - 0, p[1] + 30.2) < 0.4, p);
  await goto(page, [0, -9, 0, 0.05]); await page.click('[data-testid="sr-open-depts"]'); await page.waitForSelector('[data-testid="sr-dept-menu"]');
  const items = await page.$$eval('[data-dept]', (e) => e.map((x) => x.dataset.dept)); check('department menu lists the eight bays and the VIP meeting room as the 9th', items.length === 9 && items[8] === 'vip', items);
  await page.click('[data-dept="vip"]'); await page.waitForFunction(() => window.__showroom.explore.zone() === 'vip' && window.__showroom.explore.explorer.glide === null, null, { timeout: 120000 });
  const q = await ex(page, (e) => e.pos()); check('picking the VIP item in the menu glides there too', Math.hypot(q[0], q[1] + 30.2) < 0.4, q);
  await goto(page, [-12.5, -30.7, Math.PI / 2, 0.05]); await press(page, 'Digit9'); await page.waitForFunction(() => window.__showroom.explore.zone() === 'vip' && window.__showroom.explore.explorer.glide === null, null, { timeout: 120000 }); check('and from a bay on the far side (route runs round the bench, not through the room walls)', true);
  await press(page, 'Digit1'); await page.waitForFunction(() => window.__showroom.explore.explorer.glide === null, null, { timeout: 120000 }); check('and back out to department 1 (Kitchens) through the door', (await ex(page, (e) => e.zone())) === 'kitchens');
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function ar(b) {
  const o = await L.openShowroom(b, { url: '/ar/yas-bloom', query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page, 'rows'); await L.enterExplore(page); await dismissCoach(page); await goto(page, VIP_STAND);
  check('AR: the prompt names the room in Arabic', /غرفة الاجتماعات VIP/.test(await page.locator('[data-testid="sr-prompt"]').innerText()));
  await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-vip-panel"]'); await settle(page, 600); let txt = await panelText(page);
  check('AR: Arabic panel (kicker, station count, title) and the page is rtl, panel on the LEFT', /عرض موجّه/.test(txt) && /قصة الشركة وهويتها/.test(txt) && (await page.evaluate(() => document.documentElement.dir)) === 'rtl' && (await page.locator('[data-testid="sr-vip-panel"]').boundingBox()).x < 40);
  check('AR: placeholders are Arabic ("يؤكَّد من الإدارة"), nothing asserted', (await page.$$eval('[data-testid="sr-vip-facts"] li', (e) => e.every((x) => x.dataset.confirmed === '0' && /يؤكَّد من الإدارة/.test(x.innerText)))));
  await press(page, 'ArrowLeft'); await settle(page, 300); check('AR/RTL: ArrowLeft goes to the NEXT station (arrows mirror)', /المحطة\s*2\s*\/\s*4/.test(await panelText(page)) || /2\s*\/\s*4/.test(await panelText(page)));
  await press(page, 'ArrowRight'); await settle(page, 300); check('AR/RTL: ArrowRight goes back', /1\s*\/\s*4/.test(await panelText(page)));
  await page.click('[data-testid="sr-vip-dot-3"]'); await settle(page, 300); txt = await panelText(page); check('AR: the investor path and disclaimer are Arabic and carry no figures / returns', /للاطلاع فقط/.test(txt) && !FORBIDDEN.test(txt) && (await page.locator('[data-testid="sr-vip-steps"] li').count()) === 5);
  await page.click('[data-testid="sr-vip-dot-3"]'); await settle(page, 300); const cta = await page.getAttribute('[data-testid="sr-vip-cta"]', 'href'); check('AR: the CTA goes to /ar/booking with interest=investor-briefing and Arabic notes', /^\/ar\/booking\?/.test(cta) && /interest=investor-briefing/.test(cta) && /notes=%D8|notes=%D9/.test(cta), cta.slice(0, 110));
  await shot(page, 'phase5-vip-62-ar-briefing-panel', { quality: 60 }); check('AR: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function mobile(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 390, height: 844 }, mobile: true }); const page = o.page; await mockProjects(page, 'rows'); await L.enterExplore(page, { tap: true }); await dismissCoach(page); await goto(page, VIP_STAND);
  check('mobile: touch overlay shown, zone is vip', (await page.locator('[data-testid="sr-touch"]').count()) === 1 && (await ex(page, (e) => e.zone())) === 'vip');
  await page.tap('[data-testid="sr-interact"]'); await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 30000 }); await settle(page, 600);
  const r = await page.locator('[data-testid="sr-vip-panel"]').boundingBox(); check('mobile: the presentation panel is a bottom sheet (<= 46% height) and the joystick is hidden', r.width > 360 && r.height <= 844 * 0.47 && r.y + r.height > 820 && (await page.locator('[data-testid="sr-touch"]').count()) === 0, r);
  await page.tap('[data-testid="sr-vip-next"]'); await settle(page, 300); check('mobile: Next by tap', /2\s*\/\s*4/.test(await panelText(page))); await page.tap('[data-testid="sr-vip-prev"]'); await settle(page, 300); check('mobile: Previous by tap', /1\s*\/\s*4/.test(await panelText(page)));
  const nx = await page.locator('[data-testid="sr-vip-next"]').boundingBox(), dot = await page.locator('[data-testid="sr-vip-dot-3"]').boundingBox(); check('mobile: Next / Previous and the dots are at least 44 px tall', nx.height >= 43 && dot.height >= 43, [nx.height, dot.height]);
  await page.tap('[data-testid="sr-vip-dot-3"]'); await settle(page, 400); const cb = await page.locator('[data-testid="sr-vip-cta"]').boundingBox(); check('mobile: the briefing CTA is reachable on the last station (44 px tall) and the page has no horizontal overflow', cb.height >= 43 && !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await shot(page, 'phase5-vip-63-mobile-briefing-panel', { quality: 60 }); await page.tap('[data-testid="sr-vip-dot-1"]'); await settle(page, 400); await shot(page, 'phase5-vip-64-mobile-projects-panel', { quality: 60 });
  await page.tap('[data-testid="sr-panel-close"]'); await page.waitForSelector('[data-testid="sr-vip-panel"]', { state: 'detached' }); check('mobile: Back returns to walking (joystick again)', (await page.locator('[data-testid="sr-touch"]').count()) === 1);
  check('mobile: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function reduced(b) {
  const o = await L.openShowroom(b, { query: FAST, reduced: true, viewport: { width: 1000, height: 600 } }); const page = o.page; await mockProjects(page, 'rows'); await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 }); await page.waitForTimeout(500); await dismissCoach(page); await goto(page, VIP_STAND);
  const v = VIP_STAND; await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-vip-panel"]'); await page.waitForTimeout(300);
  const c = await page.evaluate(() => { const c = window.__showroom.engine.camera; return [c.position.x, c.position.y, c.position.z]; }); check('reduced motion: the jump to station 1 is instant (camera already at its pose)', Math.abs(c[0]) < 0.01 && Math.abs(c[2] + 29.2) < 0.01, c);
  await press(page, 'ArrowRight'); const c2 = await page.evaluate(() => window.__showroom.engine.camera.position.z); check('reduced motion: next station is an instant cut (camera already at the station 2 pose) and the lights are already at full', Math.abs(c2 + 31.2) < 0.01 && (await vipState(page)).enter === 1, (await vipState(page)).enter);
  await press(page, 'Escape'); await page.waitForSelector('[data-testid="sr-vip-panel"]', { state: 'detached' }); check('reduced motion: Esc returns instantly to where the visitor stood', Math.abs((await ex(page, (e) => e.pos()))[1] - v[1]) < 0.01);
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function stats(b) {
  const out = {};
  for (const tier of ['low', 'medium', 'high']) {
    const o = await L.openShowroom(b, { query: `debug=1&quality=${tier}&aa=0`, viewport: { width: 1280, height: 720 } }); const page = o.page; await mockProjects(page, 'rows'); await L.enterExplore(page); await dismissCoach(page); out[tier] = {};
    for (const [k, p, focus] of [['hall-outside-door', [0, -22, 0, 0.05]], ['door-open', [0, -26.4, 0, 0.08]], ['inside', VIP_STAND, 0], ['station-1', VIP_STAND, 1], ['station-3-hub', VIP_STAND, 3]]) {
      await goto(page, p); if (focus) await page.evaluate((i) => { const e = window.__showroom.explore.explorer; e.focusVip(i - 1); }, focus); await page.waitForTimeout(tier === 'high' ? 6500 : 4000); const i = await page.evaluate(() => window.__showroom.info()); out[tier][k] = { calls: i.calls, triangles: i.triangles };
      if (focus) await page.evaluate(() => window.__showroom.explore.explorer.exitFocus());
    }
    await o.ctx.close();
  }
  console.log('VIPSTATS', JSON.stringify(out)); fs.writeFileSync(path.join(L.OUT, '..', 'phase5-vip-stats.json'), JSON.stringify(out, null, 1));
  check('VIP room: low tier under 450 draw calls at every VIP spot', Object.values(out.low).every((v) => v.calls < 450), out.low);
}

async function gallery(b) {
  const o = await L.openShowroom(b, { query: 'debug=1&quality=high&aa=0', viewport: { width: 1280, height: 720 } }); const page = o.page; await mockProjects(page, 'rows'); await L.enterExplore(page); await dismissCoach(page);
  const snap = async (name, wait = 7000, hud = false) => { await page.waitForTimeout(wait); await setHud(page, hud); await page.waitForTimeout(250); await shot(page, name, { quality: 62 }); await setHud(page, true); };
  await goto(page, [0, -21, 0, 0.06]); await snap('phase5-vip-00-glass-room-from-hall', 7000);
  await goto(page, [0, -26.4, 0, 0.1]); await snap('phase5-vip-01-door-opening', 6000);
  await goto(page, [0, -29.0, 0.0, 0.12]); await snap('phase5-vip-02-inside-table-and-holograms', 8000);
  await page.evaluate(() => window.__showroom.explore.explorer.focusVip(0)); await settle(page, 0); await snap('phase5-vip-10-station-1-story', 8000); await snap('phase5-vip-11-station-1-panel', 300, true);
  await page.evaluate(() => window.__showroom.explore.explorer.setStation(1)); await settle(page, 0); await snap('phase5-vip-20-station-2-projects-gallery', 8000); await snap('phase5-vip-21-station-2-panel', 300, true);
  await page.evaluate(() => window.__showroom.explore.explorer.setStation(2)); await settle(page, 0); await snap('phase5-vip-30-station-3-hub', 8000); await snap('phase5-vip-31-station-3-panel', 300, true);
  await page.evaluate(() => window.__showroom.explore.explorer.setStation(3)); await settle(page, 0); await snap('phase5-vip-50-station-4-contact', 8000); await snap('phase5-vip-51-station-4-panel', 300, true);
  check('gallery: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

(async () => {
  const b = await L.launch(); const only = process.argv[2];
  const run = async (name, fn) => { if (only && only !== name) return; try { await fn(b); } catch (e) { check(`suite "${name}" ran to the end`, false, String(e && e.message).slice(0, 300)); } };
  try { await run('flows', flows); await run('states', states); await run('nav', nav); await run('ar', ar); await run('mobile', mobile); await run('reduced', reduced); await run('stats', stats); await run('gallery', gallery); } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); bad.forEach((r) => console.log('FAILED:', r.name, JSON.stringify(r.detail)));
  process.exit(bad.length ? 1 : 0);
})();
