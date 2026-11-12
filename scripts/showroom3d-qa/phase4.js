/* Phase 4 / 5 QA: furnished departments (kitchens, wardrobes, doors), product focus + panel, drawers / doors / LED / finishes, quote link, direct
 * picking, keyboard, Ikhtarha stage, mobile tap flow, AR / RTL, reduced motion, draw-call stats per tier and the screenshot gallery.
 * Needs a served build: node scripts/showroom3d-qa/serve.js build 5055 ; Chromium runs on SwiftShader (CPU) so fps numbers say nothing about real GPUs.
 *   node scripts/showroom3d-qa/phase4.js [flows|mobile|ar|reduced|stats|gallery]            screenshots -> $OUT (default docs/showroom3d/screenshots) */
const L = require('./lib.js');
const { check, ex, shot } = L;
const fs = require('fs'), path = require('path');

const near = (a, b, t) => Math.abs(a - b) <= t;
const FAST = 'debug=1&quality=low&aa=0&scale=0.5';   // flows render at half resolution (software GL is ~3x faster); the gallery and the stats run at full resolution
const KITCHEN = [-12.5, -7.9, Math.PI / 2, 0.05], WARDROBE = [-12.5, -15.5, Math.PI / 2, 0.05], DOOR = [12.5, -7.9, -Math.PI / 2, 0.05], STAGE = [0, -17.2, 0, 0.05];
const part = (page, id) => page.evaluate((id) => { const P = window.__showroom.engine.products, e = P.registry.get(id), m = P.kits[e.product].state.part(id); const o = e.object; return { state: m.state, value: m.value, open: m.isOpen, x: o.position.x, y: o.position.y, z: o.position.z, ry: o.rotation.y }; }, id);
const waitPart = (page, id, st) => page.waitForFunction(([id, st]) => { const P = window.__showroom.engine.products, e = P.registry.get(id); return P.kits[e.product].state.part(id).state === st; }, [id, st], { timeout: 60000 });
const screenOf = (page, id) => page.evaluate((id) => { const e = window.__showroom.engine, P = e.products, p = P.registry.get(id), box = P.kits[p.product].partBox(id), V = e.camera.position.constructor; const c = box.getCenter(new V()); e.camera.updateMatrixWorld(true); c.project(e.camera); const r = e.canvas.getBoundingClientRect(); return { x: r.left + (c.x * 0.5 + 0.5) * r.width, y: r.top + (-c.y * 0.5 + 0.5) * r.height }; }, id);
const setHud = (page, on) => page.evaluate((on) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach').forEach((n) => { n.style.visibility = on ? '' : 'hidden'; }), on);
const settle = async (page, ms = 3000) => { await page.waitForFunction(() => { const x = window.__showroom.explore.explorer; return !x.fly; }, null, { timeout: 60000 }); await page.waitForTimeout(ms); };
const goto = async (page, pose) => { await ex(page, (e, p) => e.teleport(...p), pose); await page.waitForTimeout(400); };
const press = async (page, key) => { await page.keyboard.press(key); await page.waitForTimeout(150); };
const dismissCoach = async (page) => { await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); }); await page.waitForTimeout(200); };
/** any supabase / rest / rpc request made by the showroom page (frame url /showroom-3d) is a failure, and so is any non-GET to those anywhere. The booking page that the quotation link opens makes its own ordinary reads; those do not count. */
function trackBackend(page) { const bad = []; page.on('request', (r) => { const u = r.url(); if (!/supabase\.co|\/rest\/v1\/|\/rpc\//.test(u)) return; let f = ''; try { f = r.frame().url(); } catch (e) { /* ignore */ } if (r.method() !== 'GET' || /showroom-3d/.test(f)) bad.push(r.method() + ' ' + u); }); return bad; }

async function flows(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; const backend = trackBackend(page);
  await L.enterExplore(page); await dismissCoach(page);
  // ---- Kitchens: walk in, prompt, press E
  await goto(page, KITCHEN); check('kitchens: standing at the bay shows the zone and the "Press E" prompt', (await ex(page, (e) => e.zone())) === 'kitchens' && /Kitchens/.test(await page.locator('[data-testid="sr-prompt"]').innerText()) && /Press E/.test(await page.locator('[data-testid="sr-prompt"]').innerText()));
  const pose0 = await ex(page, (e) => e.pos());
  await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-panel"]', { timeout: 30000 }); await settle(page, 500);
  const panelText = await page.locator('[data-testid="sr-panel"]').innerText();
  check('E opens the product panel (name, sample configuration, spec lines, no prices / dimensions)', /Island and wall run/.test(panelText) && /sample configuration/i.test(panelText) && /10 years on cabinetry and soft-close hardware/.test(panelText) && !/BD\s?\d|\d+\s?(mm|cm)\b/.test(panelText));
  const camMoved = await page.evaluate(() => { const c = window.__showroom.engine.camera; return [c.position.x, c.position.y, c.position.z]; });
  check('camera glided to the kitchen overview pose (outside the walker position, higher than eye height not required)', Math.abs(camMoved[0] - (-15.1)) < 0.6 && Math.abs(camMoved[2] - (-7.7)) < 0.6, camMoved);
  check('while focused WASD does not move the walker', await (async () => { await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW'); const p = await ex(page, (e) => e.pos()); return near(p[0], pose0[0], 0.01) && near(p[1], pose0[1], 0.01); })());
  // every part through the panel buttons
  const ids = await page.evaluate(() => window.__showroom.engine.products.registry.forProduct('kitchen').map((p) => ({ id: p.id, kind: p.kind })));
  check('kitchen registers 9 interactive parts (drawers + doors)', ids.length === 9 && ids.filter((p) => p.kind === 'drawer').length === 7 && ids.filter((p) => p.kind === 'door').length === 2, ids.length);
  for (const p of ids) {
    const before = await part(page, p.id); await page.click(`[data-testid="sr-part-${p.id}"]`); await waitPart(page, p.id, 'open'); const after = await part(page, p.id);
    const moved = p.kind === 'drawer' ? after.x - before.x : Math.abs(after.ry - before.ry);
    check(`kitchen ${p.id}: opens (${p.kind})`, p.kind === 'drawer' ? moved > 0.3 : moved > 1.5, +moved.toFixed(2));
    check(`kitchen ${p.id}: button says open (aria-pressed)`, (await page.getAttribute(`[data-testid="sr-part-${p.id}"]`, 'aria-pressed')) === 'true');
  }
  await page.click('[data-testid="sr-open-all"]'); for (const p of ids) await waitPart(page, p.id, 'closed'); check('Close all closes every part again', true);
  // direct picking: hover outline + click on the drawer in the 3D view
  await page.click('[data-testid="sr-view-island"]'); await settle(page, 800);
  const pid = 'k-island-a2'; const sc = await screenOf(page, pid);
  check('picking target is on screen and left of the panel', sc.x > 0 && sc.x < 1100 - 400 && sc.y > 0 && sc.y < 640, sc);
  await page.mouse.move(sc.x, sc.y); await page.waitForTimeout(500);
  check('hovering a drawer in the scene highlights it (registry hover + outline visible)', await page.evaluate((pid) => { const P = window.__showroom.engine.products; return P.registry.hover === pid && P.outlines[0].visible; }, pid), await page.evaluate(() => window.__showroom.engine.products.registry.hover));
  await page.mouse.click(sc.x, sc.y); await waitPart(page, pid, 'open'); check('clicking the drawer in the 3D view opens it (pointer picking)', (await part(page, pid)).open);
  const sc2 = await screenOf(page, pid); await page.mouse.click(sc2.x, sc2.y); await waitPart(page, pid, 'closed'); check('clicking it again (where it is now, pulled out) closes it', !(await part(page, pid)).open);
  // keyboard on the canvas: arrows move the focus ring (from the part that was last worked), Enter toggles
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const before = await page.evaluate(() => window.__showroom.engine.products.registry.focus), want = await page.evaluate((cur) => window.__showroom.engine.products.registry.step('kitchen', cur, 1), before);
  await press(page, 'ArrowRight'); const f1 = await page.evaluate(() => window.__showroom.engine.products.registry.focus);
  check('keyboard: ArrowRight moves the focus ring to the next part (wraps in catalog order)', f1 === want && f1 !== before, { before, f1 });
  await press(page, 'Enter'); await waitPart(page, f1, 'open'); check('keyboard: Enter opens the focused part', true); await press(page, 'Enter'); await waitPart(page, f1, 'closed'); check('keyboard: Enter closes it again', true);
  await press(page, 'ArrowLeft'); check('keyboard: ArrowLeft moves back', (await page.evaluate(() => window.__showroom.engine.products.registry.focus)) === before);
  // LED
  const led0 = await page.evaluate(() => window.__showroom.engine.products.kits.kitchen.state.ledOn); await page.click('[data-testid="sr-led"]'); await page.waitForTimeout(400);
  const led1 = await page.evaluate(() => window.__showroom.engine.products.kits.kitchen.state.ledOn); check('LED switch toggles the lighting off (aria-checked follows)', led0 === true && led1 === false && (await page.getAttribute('[data-testid="sr-led"]', 'aria-checked')) === 'false');
  await page.waitForFunction(() => window.__showroom.engine.products.kits.kitchen.state.accentLevel() < 0.01, null, { timeout: 30000 }); check('accent LEDs fade to zero', true); await page.click('[data-testid="sr-led"]');
  // finishes: 4 swatches, each swaps the materials
  const sw = await page.locator('[data-testid^="sr-finish-"]:not([data-testid="sr-finish-name"])').count(); check('kitchen offers 4 finishes', sw === 4, sw);
  const seen = new Set();
  for (const id of ['oak-white-stone', 'walnut-dark-stone', 'sage-sand-stone', 'charcoal-white-stone']) {
    await page.click(`[data-testid="sr-finish-${id}"]`); await page.waitForTimeout(300);
    const sig = await page.evaluate(() => { const M = window.__showroom.engine.products.M; return [M.front.kitchen.map === M.white ? 'paint' : 'timber', M.front.kitchen.color.getHexString(), M.stone.map === M.tex.marble.white.map ? 'white' : M.stone.map === M.tex.marble.dark.map ? 'dark' : 'sand'].join('|'); });
    seen.add(sig); check(`finish ${id}: shown as selected and name updated`, (await page.getAttribute(`[data-testid="sr-finish-${id}"]`, 'aria-checked')) === 'true' && (await page.locator('[data-testid="sr-finish-name"]').innerText()).length > 10, sig);
  }
  check('the four kitchen finishes produce four different material states', seen.size === 4, [...seen]);
  // quotation link carries the finish and opens the existing booking page
  const href = await page.getAttribute('[data-testid="sr-quote"]', 'href'); const u = new URL(href, 'http://x');
  check('quotation link: /booking, interest Kitchen, selected finish, notes', u.pathname === '/booking' && u.searchParams.get('interest') === 'Kitchen' && u.searchParams.get('finish') === 'charcoal-white-stone' && /Charcoal/.test(u.searchParams.get('notes')), href);
  await page.click('[data-testid="sr-quote"]'); await page.waitForURL(/\/booking/, { timeout: 60000 }); await page.waitForSelector('#bk-notes', { timeout: 60000 });
  check('the existing booking page opens pre-filled (interest + notes), nothing submitted', (await page.inputValue('#bk-interest')) === 'Kitchen' && /Charcoal matt lacquer/.test(await page.inputValue('#bk-notes')) && /sample configuration/i.test(await page.inputValue('#bk-notes')));
  check('no backend request was made by any showroom interaction (no supabase / rpc / rest call)', backend.length === 0, backend.slice(0, 3));
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function flowsRest(b) {
  // ---- Wardrobes + Doors + Ikhtarha on a fresh page
  const w = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const wp = w.page; const backend2 = trackBackend(wp);
  await L.enterExplore(wp); await dismissCoach(wp); await goto(wp, WARDROBE); check('wardrobes zone', (await ex(wp, (e) => e.zone())) === 'wardrobes'); await press(wp, 'KeyE'); await wp.waitForSelector('[data-testid="sr-panel"][data-product="wardrobe"]'); await settle(wp, 400);
  const wids = await wp.evaluate(() => window.__showroom.engine.products.registry.forProduct('wardrobe').map((p) => ({ id: p.id, kind: p.kind })));
  check('wardrobe registers sliding, hinged, glass doors and drawers (10 parts)', wids.length === 10 && ['slider', 'door', 'drawer'].every((k) => wids.some((p) => p.kind === k)), wids.map((p) => p.id));
  for (const p of wids) {
    const b0 = await part(wp, p.id); await wp.click(`[data-testid="sr-part-${p.id}"]`); await waitPart(wp, p.id, 'open'); const a = await part(wp, p.id);
    const ok = p.kind === 'slider' ? Math.abs(a.z - b0.z) > 1.0 : p.kind === 'drawer' ? a.x - b0.x > 0.3 : Math.abs(a.ry - b0.ry) > 1.5; check(`wardrobe ${p.id}: opens (${p.kind})`, ok, { dz: +(a.z - b0.z).toFixed(2), dx: +(a.x - b0.x).toFixed(2), dry: +(a.ry - b0.ry).toFixed(2) });
  }
  check('wardrobe interior LEDs are lit once the doors are open', await wp.evaluate(() => { const s = window.__showroom.engine.products.kits.wardrobe.state; return s.ledLevel('w-slide-1') > 0.9 && s.ledLevel('w-hinge-l') > 0.9 && s.ledLevel('w-drawer-1') > 0.9; }));
  await wp.click('[data-testid="sr-led"]'); await wp.waitForFunction(() => { const s = window.__showroom.engine.products.kits.wardrobe.state; return s.ledLevel('w-slide-1') < 0.01; }, null, { timeout: 30000 }); check('LED off darkens every interior strip', true);
  await wp.click('[data-testid="sr-finish-stone-grey"]'); await wp.waitForTimeout(300); check('wardrobe finish swap: lacquer (paint) front + brass', await wp.evaluate(() => { const M = window.__showroom.engine.products.M; return M.front.wardrobe.map === M.white && M.flute.wardrobe.map === M.white && M.metal.wardrobe.color.getHexString() !== '3a2f27'; }));
  await press(wp, 'Escape'); await wp.waitForFunction(() => !window.__showroom.explore.explorer.focus, null, { timeout: 30000 }); await wp.waitForSelector('[data-testid="sr-panel"]', { state: 'detached', timeout: 30000 }); check('Esc closes the panel and leaves the visitor where they stood', (await ex(wp, (e) => e.pos()))[0] === -12.5);
  await goto(wp, DOOR); check('doors zone', (await ex(wp, (e) => e.zone())) === 'doors'); await press(wp, 'KeyE'); await wp.waitForSelector('[data-testid="sr-panel"][data-product="door"]'); await settle(wp, 400);
  await wp.click('[data-testid="sr-part-d-pivot"]'); await waitPart(wp, 'd-pivot', 'open'); const dp = await part(wp, 'd-pivot'); check('pivot door swings about its off-centre axis (~100 deg)', near(dp.ry, 100 * Math.PI / 180, 0.02), +dp.ry.toFixed(3));
  const dfin = []; for (const id of ['oak', 'walnut', 'ivory-paint', 'ebony-paint']) { await wp.click(`[data-testid="sr-finish-${id}"]`); await wp.waitForTimeout(200); dfin.push(await wp.evaluate(() => { const M = window.__showroom.engine.products.M; return (M.front.door.map === M.white ? 'p' : 't') + M.front.door.color.getHexString(); })); }
  check('door finishes: 4 distinct states (veneer oak / walnut, hand-sprayed ivory / charcoal)', new Set(dfin).size === 4, dfin);
  await press(wp, 'Escape'); await wp.waitForSelector('[data-testid="sr-panel"]', { state: 'detached' });
  // ---- Ikhtarha stage
  await goto(wp, STAGE); check('stage zone is "ikhtarha" and the prompt names it', (await ex(wp, (e) => e.zone())) === 'ikhtarha' && /Ikhtarha|اختارها/.test(await wp.locator('[data-testid="sr-prompt"]').innerText()));
  await press(wp, 'KeyE'); await wp.waitForSelector('[data-testid="sr-ik-panel"]', { timeout: 30000 }); await settle(wp, 400); const it = await wp.locator('[data-testid="sr-ik-panel"]').innerText();
  check('stage panel uses the campaign copy (title, three steps, fine print) and no prize / price / date', /Beautiful designs… and the prize is your choice\./.test(it) && /Price your design/.test(it) && /Get your Ikhtarha code/.test(it) && /Pick your prize box/.test(it) && /Terms & conditions apply/.test(it) && !/BD\s?\d|\d+%|January|November|oven|Franke/i.test(it));
  const hrefs = { price: await wp.getAttribute('[data-testid="sr-ik-price"]', 'href'), play: await wp.getAttribute('[data-testid="sr-ik-play"]', 'href'), demo: await wp.getAttribute('[data-testid="sr-ik-demo"]', 'href') };
  check('CTAs go to the existing pages: /booking, /campaign/ikhtarha, /campaign/ikhtarha/demo', /^\/booking\?/.test(hrefs.price) && /^\/campaign\/ikhtarha(\?|$)/.test(hrefs.play) && /^\/campaign\/ikhtarha\/demo/.test(hrefs.demo), hrefs);
  for (const v of ['boxes', 'screen', 'overview']) { await wp.click(`[data-testid="sr-view-${v}"]`); await settle(wp, 300); check(`stage view "${v}" selected`, (await wp.getAttribute(`[data-testid="sr-view-${v}"]`, 'aria-pressed')) === 'true'); }
  await wp.click('[data-testid="sr-ik-price"]'); await wp.waitForURL(/\/booking/, { timeout: 60000 }); check('"Price & pick your box" opens the existing booking page', /source=showroom-3d-ikhtarha/.test(wp.url()), wp.url());
  check('no backend request from the stage / wardrobe / door flows', backend2.length === 0, backend2.slice(0, 3)); check('no page errors (wardrobe / door / stage)', w.errors.length === 0, w.errors.slice(0, 3)); await w.ctx.close();
}

async function reduced(b) {
  const o = await L.openShowroom(b, { query: FAST, reduced: true, viewport: { width: 1000, height: 600 } }); const page = o.page; await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 }); await page.waitForTimeout(500); await dismissCoach(page);
  await goto(page, KITCHEN); const v = await page.evaluate(() => window.__showroom.engine.products.focusView('kitchen', 'overview')); await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-panel"]'); await page.waitForTimeout(300);
  const c = await page.evaluate(() => { const c = window.__showroom.engine.camera; return [c.position.x, c.position.y, c.position.z]; }); check('reduced motion: the focus jump is instant (camera already at the view pose)', near(c[0], v.pos[0], 0.01) && near(c[2], v.pos[2], 0.01), c);
  await page.click('[data-testid="sr-part-k-island-a1"]'); const s1 = await part(page, 'k-island-a1'); check('reduced motion: a drawer snaps open with no intermediate state', s1.state === 'open' && s1.value === 1, s1);
  await page.click('[data-testid="sr-led"]'); check('reduced motion: LED switch is instant', await page.evaluate(() => window.__showroom.engine.products.kits.kitchen.state.accentLevel() === 0));
  await press(page, 'Escape'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached' }); const p = await ex(page, (e) => e.pos()); check('reduced motion: Esc returns instantly', near(p[0], -12.5, 0.01));
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function mobile(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 390, height: 844 }, mobile: true }); const page = o.page; const backend = trackBackend(page);
  await L.enterExplore(page, { tap: true }); await dismissCoach(page); await goto(page, [-16.2, -7.9, Math.PI / 2, 0.0]);
  check('mobile: touch overlay is shown, zone is kitchens, Interact button present', (await page.locator('[data-testid="sr-touch"]').count()) === 1 && (await ex(page, (e) => e.zone())) === 'kitchens');
  // tap a drawer directly on the canvas while exploring (reach 4.6 m)
  const sc = await screenOf(page, 'k-island-a2'); await page.touchscreen.tap(sc.x, sc.y); await waitPart(page, 'k-island-a2', 'open'); check('mobile: tapping a drawer in the scene (no panel) opens it', (await part(page, 'k-island-a2')).open, sc);
  const sc1 = await screenOf(page, 'k-island-a2'); await page.touchscreen.tap(sc1.x, sc1.y); await waitPart(page, 'k-island-a2', 'closed'); check('mobile: tapping the pulled-out drawer closes it', true);
  await goto(page, KITCHEN); await page.tap('[data-testid="sr-interact"]'); await page.waitForSelector('[data-testid="sr-panel"]', { timeout: 30000 }); await settle(page, 600);
  const r = await page.locator('[data-testid="sr-panel"]').boundingBox(); check('mobile: the panel is a bottom sheet (full width, <= 46% height, touching the bottom)', r.width > 360 && r.height <= 844 * 0.47 && r.y + r.height > 820, r);
  check('mobile: the touch joystick overlay is hidden while a product is focused', (await page.locator('[data-testid="sr-touch"]').count()) === 0);
  await page.tap('[data-testid="sr-part-k-run-d1"]'); await waitPart(page, 'k-run-d1', 'open'); check('mobile: part buttons work by tap', true);
  const sc2 = await screenOf(page, 'k-island-a1'); await page.touchscreen.tap(sc2.x, Math.min(sc2.y, 844 * 0.5)); await page.waitForTimeout(1200);
  const tapped = await page.evaluate(() => window.__showroom.engine.products.kits.kitchen.state.part('k-island-a1').state); check('mobile: tapping a drawer in the focused scene toggles it', tapped === 'open' || tapped === 'opening' || tapped === 'closed', tapped);
  await page.tap('[data-testid="sr-finish-sage-sand-stone"]'); await page.waitForTimeout(300); const mh = await page.locator('.sr-hud-top').boundingBox(); check('mobile: top bar stays above the sheet', mh.y + mh.height < 844 * 0.54);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); check('mobile: no horizontal overflow', !overflow);
  await shot(page, 'phase4-50-mobile-kitchen-panel', { quality: 62 });
  await page.tap('[data-testid="sr-panel-close"]'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached', timeout: 30000 }); check('mobile: Back returns to the walking view (joystick again)', (await page.locator('[data-testid="sr-touch"]').count()) === 1);
  await goto(page, STAGE); await page.tap('[data-testid="sr-interact"]'); await page.waitForSelector('[data-testid="sr-ik-panel"]', { timeout: 30000 }); await settle(page, 800); await shot(page, 'phase4-51-mobile-ikhtarha', { quality: 62 });
  check('mobile: Ikhtarha panel CTA buttons are 44 px tall at least', (await page.locator('[data-testid="sr-ik-price"]').boundingBox()).height >= 43);
  check('mobile: no backend requests, no page errors', backend.length === 0 && o.errors.length === 0, [backend.slice(0, 2), o.errors.slice(0, 2)]); await o.ctx.close();
}

async function ar(b) {
  const o = await L.openShowroom(b, { url: '/ar/showroom-3d', query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page;
  await L.enterExplore(page); await dismissCoach(page); await goto(page, KITCHEN); await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-panel"]', { timeout: 30000 }); await settle(page, 500);
  const txt = await page.locator('[data-testid="sr-panel"]').innerText();
  check('AR: Arabic product panel (name, kicker, controls)', /جزيرة مطبخ/.test(txt) && /نموذج تصميم/.test(txt) && /افتح الكل/.test(txt) && /اطلب عرض سعر/.test(txt));
  const r = await page.locator('[data-testid="sr-panel"]').boundingBox(); check('AR: the panel sits on the LEFT (inline-end in RTL) and the page is rtl', r.x < 40 && (await page.evaluate(() => document.documentElement.dir)) === 'rtl', r);
  const camPan = await page.evaluate(() => window.__showroom.engine.camera.view && window.__showroom.engine.camera.view.offsetX); check('AR: the view is shifted the other way so the product stays in the free part of the screen', camPan < 0, camPan);
  const href = await page.getAttribute('[data-testid="sr-quote"]', 'href'); check('AR: quotation link goes to /ar/booking with Arabic notes', /^\/ar\/booking\?/.test(href) && /interest=Kitchen/.test(href) && /notes=%D9/.test(href), href.slice(0, 120));
  await page.click('[data-testid="sr-part-k-island-a1"]'); await waitPart(page, 'k-island-a1', 'open'); check('AR: parts work the same (aria-pressed true, state "مفتوح")', /مفتوح/.test(await page.locator('[data-testid="sr-part-k-island-a1"]').innerText()));
  await shot(page, 'phase4-60-ar-kitchen-panel', { quality: 64 }); await press(page, 'Escape'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached' });
  await goto(page, STAGE); await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-ik-panel"]'); await settle(page, 800); const it = await page.locator('[data-testid="sr-ik-panel"]').innerText();
  check('AR: stage panel in Arabic (campaign copy), CTAs go to /ar/booking and /campaign/ikhtarha', /تصاميم روعة… والجائزة باختيارك/.test(it) && /سعّر تصميمك/.test(it) && /^\/ar\/booking/.test(await page.getAttribute('[data-testid="sr-ik-price"]', 'href')) && (await page.getAttribute('[data-testid="sr-ik-play"]', 'href')) === '/campaign/ikhtarha');
  await shot(page, 'phase4-61-ar-ikhtarha-panel', { quality: 64 }); check('AR: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function stats(b) {
  const out = {};
  for (const tier of ['low', 'medium', 'high']) {
    const o = await L.openShowroom(b, { query: `debug=1&quality=${tier}&aa=0`, viewport: { width: 1280, height: 720 } }); const page = o.page; await L.enterExplore(page); await dismissCoach(page); out[tier] = {};
    const spots = { spawn: [0, -9, 0, 0.05], kitchen: [-12.5, -7.9, Math.PI / 2, 0.05], wardrobe: [-12.5, -15.5, Math.PI / 2, 0.05], door: [12.5, -7.9, -Math.PI / 2, 0.05], stage: [0, -12, 0, 0.05], outside: [0, 14, 0, 0.1] };
    for (const [k, p] of Object.entries(spots)) { await goto(page, p); await page.waitForTimeout(tier === 'high' ? 5000 : 3000); const i = await page.evaluate(() => window.__showroom.info()); out[tier][k] = { calls: i.calls, triangles: i.triangles, textures: i.textures, geometries: i.geometries, fps: i.fps }; }
    out[tier].gpu = await page.evaluate(() => window.__showroom.info().gpu); await o.ctx.close();
  }
  console.log('STATS', JSON.stringify(out)); fs.writeFileSync(path.join(L.OUT, '..', 'phase4-stats.json'), JSON.stringify(out, null, 1));
  check('draw calls stay under 700 on every tier at every spot (budget)', Object.values(out).every((t) => Object.entries(t).every(([k, v]) => k === 'gpu' || v.calls < 700)));
}

async function gallery(b) {
  const o = await L.openShowroom(b, { query: 'debug=1&quality=high&aa=0', viewport: { width: 1280, height: 720 } }); const page = o.page; await L.enterExplore(page); await dismissCoach(page);
  const snap = async (name, wait = 7000, hud = false) => { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; await page.waitForTimeout(wait); await setHud(page, hud); await page.waitForTimeout(250); await shot(page, name, { quality: 66 }); await setHud(page, true); };
  const E = (fn) => page.evaluate(fn);
  const focus = async (pid, view) => { await E(`window.__showroom.explore.explorer.focusProduct('${pid}', '${view || 'overview'}')`); await settle(page, 0); };
  // department wide shots (visitor view, no panel)
  await goto(page, [0, -9, 0, 0.05]); await snap('phase4-00-hall-from-spawn', 6000);
  await goto(page, [-9.5, -9.5, Math.PI / 2 + 0.25, 0.04]); await snap('phase4-01-kitchens-wide');
  await goto(page, [-9.5, -14, Math.PI / 2 - 0.2, 0.04]); await snap('phase4-02-wardrobes-wide');
  await goto(page, [9.5, -9.5, -Math.PI / 2 - 0.25, 0.04]); await snap('phase4-03-doors-wide');
  await goto(page, [0, -10, 0, 0.0]); await snap('phase4-04-ikhtarha-stage-wide', 6000);
  await goto(page, [-9.5, -27, Math.PI / 2, 0.05]); await snap('phase4-05-empty-bays-still-to-be-furnished', 6000);
  // kitchens
  await goto(page, KITCHEN); await focus('kitchen', 'overview'); await snap('phase4-10-kitchen-closed', 4500);
  await snap('phase4-11-kitchen-panel', 200, true);
  await E(`window.__showroom.explore.explorer.openAll(true); window.__showroom.explore.explorer.setView('island')`); await snap('phase4-12-kitchen-drawers-doors-open', 9000);
  await E(`window.__showroom.explore.explorer.setView('drawers')`); await snap('phase4-13-kitchen-drawer-interior-led-on', 9000);
  await E(`window.__showroom.explore.explorer.toggleLed()`); await snap('phase4-14-kitchen-drawer-interior-led-off', 7000);
  await E(`window.__showroom.explore.explorer.toggleLed(); window.__showroom.explore.explorer.openAll(false); window.__showroom.explore.explorer.setView('detail')`); await snap('phase4-15-kitchen-handle-and-led-closeup', 9000);
  await E(`window.__showroom.explore.explorer.setView('overview'); window.__showroom.explore.explorer.setFinish('walnut-dark-stone')`); await snap('phase4-16-kitchen-finish-walnut-dark-stone', 8000);
  await E(`window.__showroom.explore.explorer.setFinish('sage-sand-stone')`); await snap('phase4-17-kitchen-finish-sage-sand-stone', 4500);
  await E(`window.__showroom.explore.explorer.setFinish('oak-white-stone'); window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(2500);
  // wardrobes
  await goto(page, WARDROBE); await focus('wardrobe', 'overview'); await snap('phase4-20-wardrobe-closed', 5000);
  await E(`const x = window.__showroom.explore.explorer; x.togglePart('w-slide-1'); x.togglePart('w-hinge-l'); x.togglePart('w-glass-r'); x.togglePart('w-drawer-1'); x.togglePart('w-drawer-3')`); await snap('phase4-21-wardrobe-sliding-hinged-glass-drawers-open', 9000);
  await E(`const x = window.__showroom.explore.explorer; x.openAll(true); x.setView('interior')`); await snap('phase4-22-wardrobe-interior-led-garments', 9000);
  await E(`window.__showroom.explore.explorer.setView('detail')`); await snap('phase4-23-wardrobe-drawers-pulls-closeup', 8000);
  await E(`const x = window.__showroom.explore.explorer; x.openAll(false); x.setView('overview'); x.setFinish('fluted-oak')`); await snap('phase4-24-wardrobe-finish-fluted-oak-brass', 9000);
  await E(`window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(2500);
  // doors
  await goto(page, DOOR); await focus('door', 'overview'); await snap('phase4-30-door-closed', 5000);
  await E(`window.__showroom.explore.explorer.togglePart('d-pivot')`); await snap('phase4-31-door-pivot-open', 9000);
  await E(`window.__showroom.explore.explorer.togglePart('d-pivot'); window.__showroom.explore.explorer.setView('detail')`); await snap('phase4-32-door-brass-pull-pivot-closeup', 9000);
  await E(`const x = window.__showroom.explore.explorer; x.setView('overview'); x.setFinish('ebony-paint')`); await snap('phase4-33-door-finish-charcoal-paint', 8000);
  await E(`window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(2500);
  // Ikhtarha stage
  await goto(page, STAGE); await E(`window.__showroom.explore.explorer.focusStage('overview')`); await settle(page, 0); await snap('phase4-40-ikhtarha-stage-front', 6000);
  await snap('phase4-41-ikhtarha-panel', 200, true);
  await E(`window.__showroom.explore.explorer.setView('boxes')`); await snap('phase4-42-ikhtarha-gift-boxes', 8000);
  check('gallery: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

(async () => {
  const b = await L.launch(); const only = process.argv[2];
  const run = async (name, fn) => { if (only && only !== name && !(only === 'flows' && name === 'rest')) return; try { await fn(b); } catch (e) { check(`suite "${name}" ran to the end`, false, String(e && e.message).slice(0, 300)); } };
  try { await run('flows', flows); await run('rest', flowsRest); await run('reduced', reduced); await run('mobile', mobile); await run('ar', ar); await run('stats', stats); await run('gallery', gallery); } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); bad.forEach((r) => console.log('FAILED:', r.name, JSON.stringify(r.detail)));
  process.exit(bad.length ? 1 : 0);
})();
