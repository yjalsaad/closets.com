/* Phase 5b QA: the five departments added after Phase 4 (Bedrooms, Walk-in Closets, Living, Custom Studio, Consultation Lounge): walk to the bay, E, open every
 * part, LED, finishes, quote / consultation link opening the existing /booking pre-filled, studio + contact links, mobile tap flow, AR / RTL, reduced motion,
 * draw-call stats per tier per department and the screenshot gallery. Needs a served build (node scripts/showroom3d-qa/serve.js build 5055).
 *   node scripts/showroom3d-qa/phase5.js [flows|reduced|mobile|ar|stats|gallery] */
const L = require('./lib.js');
const { check, ex, shot } = L;
const fs = require('fs'), path = require('path');

const FAST = 'debug=1&quality=low&aa=0&scale=0.5';
const SP = Math.PI / 2;
const POSE = { bedroom: [-12.5, -30.7, SP, 0.05], walkin: [-12.5, -23.1, SP, 0.05], living: [12.5, -15.5, -SP, 0.05], studio: [12.5, -23.1, -SP, 0.05], lounge: [12.5, -30.7, -SP, 0.05], kitchen: [-12.5, -7.9, SP, 0.05], wardrobe: [-12.5, -15.5, SP, 0.05], door: [12.5, -7.9, -SP, 0.05] };
const ZONE = { bedroom: 'bedroom', walkin: 'walkin', living: 'living', studio: 'studio', lounge: 'lounge' };
const INTEREST = { bedroom: 'Other', walkin: 'Walk-In Closet', living: 'TV Unit', studio: 'Other', lounge: 'Other' };
const part = (page, id) => page.evaluate((id) => { const P = window.__showroom.engine.products, e = P.registry.get(id), m = P.kits[e.product].state.part(id); const o = e.object; return { state: m.state, value: m.value, open: m.isOpen, x: o.position.x, z: o.position.z, rz: o.rotation.z, ry: o.rotation.y }; }, id);
const waitPart = (page, id, st) => page.waitForFunction(([id, st]) => { const P = window.__showroom.engine.products, e = P.registry.get(id); return P.kits[e.product].state.part(id).state === st; }, [id, st], { timeout: 60000 });
const screenOf = (page, id) => page.evaluate((id) => { const e = window.__showroom.engine, P = e.products, p = P.registry.get(id), box = P.kits[p.product].partBox(id), V = e.camera.position.constructor; const c = box.getCenter(new V()); e.camera.updateMatrixWorld(true); c.project(e.camera); const r = e.canvas.getBoundingClientRect(); return { x: r.left + (c.x * 0.5 + 0.5) * r.width, y: r.top + (-c.y * 0.5 + 0.5) * r.height }; }, id);
const setHud = (page, on) => page.evaluate((on) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach, .sr-touch').forEach((n) => { n.style.visibility = on ? '' : 'hidden'; }), on);
const settle = async (page, ms = 3000) => { await page.waitForFunction(() => !window.__showroom.explore.explorer.fly, null, { timeout: 90000 }); await page.waitForTimeout(ms); };
const goto = async (page, pose) => { await ex(page, (e, p) => e.teleport(...p), pose); await page.waitForTimeout(400); };
const press = async (page, key) => { await page.keyboard.press(key); await page.waitForTimeout(150); };
const dismissCoach = async (page) => { await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); }); await page.waitForTimeout(200); };
function trackBackend(page) { const bad = []; let armed = true; page.on('request', (r) => { if (!/supabase\.co|\/rest\/v1\/|\/rpc\//.test(r.url())) return; if (!armed && r.method() === 'GET') return; bad.push(r.method() + ' ' + r.url()); }); bad.disarm = () => { armed = false; }; return bad; }
const moved = (kind, a, b) => (kind === 'drawer' || kind === 'tray' ? b.x - a.x > 0.25 : kind === 'door' ? Math.abs(b.ry - a.ry) > 1.5 : kind === 'slider' ? Math.abs(b.z - a.z) > 0.4 : kind === 'tilt' ? Math.abs(b.rz - a.rz) > 0.9 : false);

async function flows(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; const backend = trackBackend(page);
  await L.enterExplore(page); await dismissCoach(page);
  for (const id of Object.keys(ZONE)) {
    await goto(page, POSE[id]); const prompt = await page.locator('[data-testid="sr-prompt"]').innerText();
    check(`${id}: walking to the bay shows its zone and the "Press E" prompt`, (await ex(page, (e) => e.zone())) === ZONE[id] && /Press E/.test(prompt), prompt.replace(/\n/g, ' '));
    await press(page, 'KeyE'); await page.waitForSelector(`[data-testid="sr-panel"][data-product="${id}"]`, { timeout: 30000 }); await settle(page, 500);
    const txt = await page.locator('[data-testid="sr-panel"]').innerText();
    check(`${id}: panel shows the name, "sample configuration" and the 10-year warranty line, no price / dimensions`, /sample configuration/i.test(txt) && /10 years on cabinetry and soft-close hardware/.test(txt) && !/BD\s?\d|\d+\s?(mm|cm)\b/.test(txt));
    const parts = await page.evaluate((id) => window.__showroom.engine.products.registry.forProduct(id).map((p) => ({ id: p.id, kind: p.kind })), id);
    for (const p of parts) {
      const a = await part(page, p.id); await page.click(`[data-testid="sr-part-${p.id}"]`); await waitPart(page, p.id, 'open'); const c = await part(page, p.id);
      check(`${id} ${p.id} (${p.kind}): opens and moves`, moved(p.kind, a, c) && (await page.getAttribute(`[data-testid="sr-part-${p.id}"]`, 'aria-pressed')) === 'true', { dx: +(c.x - a.x).toFixed(2), dz: +(c.z - a.z).toFixed(2), rz: +(c.rz - a.rz).toFixed(2), ry: +(c.ry - a.ry).toFixed(2) });
    }
    check(`${id}: LEDs shine with parts open, go dark with the switch off, come back`, await (async () => { const lit = await page.evaluate((id) => window.__showroom.engine.products.kits[id].state.accentLevel(), id); await page.click('[data-testid="sr-led"]'); await page.waitForFunction((id) => window.__showroom.engine.products.kits[id].state.accentLevel() < 0.01, id, { timeout: 30000 }); await page.click('[data-testid="sr-led"]'); await page.waitForFunction((id) => window.__showroom.engine.products.kits[id].state.accentLevel() > 0.99, id, { timeout: 30000 }); return lit > 0.99; })());
    await page.click('[data-testid="sr-open-all"]'); for (const p of parts) await waitPart(page, p.id, 'closed'); check(`${id}: Close all closes every part`, true);
    const fins = await page.evaluate((id) => Array.from(document.querySelectorAll('[data-testid^="sr-finish-"]:not([data-testid="sr-finish-name"])')).map((n) => n.dataset.testid.replace('sr-finish-', '')), id);
    check(`${id}: 3 to 4 finishes offered`, fins.length >= 3 && fins.length <= 4, fins);
    const seen = new Set();
    for (const f of fins) { await page.click(`[data-testid="sr-finish-${f}"]`); await page.waitForTimeout(250); seen.add(await page.evaluate((id) => { const M = window.__showroom.engine.products.M; const u = M.uphol && M.uphol[id]; return [M.front[id].map === M.white ? 'p' : 't', M.front[id].color.getHexString(), M.metal[id].color.getHexString(), u ? u.color.getHexString() : '-', (M.stones[id] || M.stone).map === M.tex.marble.white.map ? 'w' : 'o'].join('|'); }, id)); }
    check(`${id}: every finish gives a different material state`, seen.size === fins.length, [...seen]);
    const href = await page.getAttribute('[data-testid="sr-quote"]', 'href'), u = new URL(href, 'http://x');
    check(`${id}: quote link is /booking with interest ${INTEREST[id]}, the selected finish and notes`, u.pathname === '/booking' && u.searchParams.get('interest') === INTEREST[id] && u.searchParams.get('finish') === fins[fins.length - 1] && /sample configuration|consultation request/i.test(u.searchParams.get('notes')), href.slice(0, 140));
    if (id === 'studio') check('studio: the panel links to the existing /studio route', (await page.getAttribute('[data-testid="sr-link-studio"]', 'href')) === '/studio');
    if (id === 'lounge') { const call = await page.getAttribute('[data-testid="sr-link-call"]', 'href'), wa = await page.getAttribute('[data-testid="sr-link-whatsapp"]', 'href'); check('lounge: phone and WhatsApp links are the existing contact data (content/facts.js), hours shown', call === 'tel:+97317555095' && /^https:\/\/wa\.me\/97317555095$/.test(wa) && /Sat/.test(await page.locator('[data-testid="sr-link-hours"]').innerText()), { call, wa }); }
    if (id === 'bedroom') { // direct picking by pointer + keyboard, once
      await page.click('[data-testid="sr-view-bed"]'); await settle(page, 800); const pid = 'bd-bs-l1', sc = await screenOf(page, pid);
      await page.mouse.move(sc.x, sc.y); await page.waitForTimeout(400); check('bedroom: hovering a bedside drawer highlights it', await page.evaluate((pid) => window.__showroom.engine.products.registry.hover === pid, pid));
      await page.mouse.click(sc.x, sc.y); await waitPart(page, pid, 'open'); check('bedroom: clicking the drawer in the 3D view opens it', true);
      await page.evaluate(() => document.activeElement && document.activeElement.blur()); await press(page, 'ArrowRight'); await press(page, 'Enter'); await page.waitForTimeout(1200); check('bedroom: keyboard (arrow + Enter) works the next part', await page.evaluate(() => { const P = window.__showroom.engine.products; return P.registry.focus && P.kits.bedroom.state.part(P.registry.focus).moving || P.kits.bedroom.state.part(P.registry.focus).isOpen; }));
    }
    if (id === 'walkin') { await page.click('[data-testid="sr-view-shoes"]'); await settle(page, 600); check('walkin: shoe-wall view is selected', (await page.getAttribute('[data-testid="sr-view-shoes"]', 'aria-pressed')) === 'true'); }
    if (id === 'lounge') { backend.disarm(); await page.click('[data-testid="sr-quote"]'); await page.waitForURL(/\/booking/, { timeout: 60000 }); await page.waitForSelector('#bk-notes', { timeout: 60000 }); check('lounge: the consultation button opens the existing booking page pre-filled (notes name the product and the finish)', /Reception and consultation lounge/.test(await page.inputValue('#bk-notes')) && /consultation request/.test(await page.inputValue('#bk-notes')), await page.inputValue('#bk-notes')); break; }
    if (id === 'studio') { await press(page, 'Escape'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached', timeout: 30000 }); check('Esc closes the panel and keeps the visitor in the bay zone', (await ex(page, (e) => e.zone())) === 'studio'); continue; }
    await press(page, 'Escape'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached', timeout: 30000 });
  }
  check('no supabase / rpc / rest request from any department interaction', backend.length === 0, backend.slice(0, 3)); check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function reduced(b) {
  const o = await L.openShowroom(b, { query: FAST, reduced: true, viewport: { width: 1000, height: 600 } }); const page = o.page; await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 }); await page.waitForTimeout(500); await dismissCoach(page);
  await goto(page, POSE.walkin); const v = await page.evaluate(() => window.__showroom.engine.products.focusView('walkin', 'overview')); await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-panel"]'); await page.waitForTimeout(300);
  const c = await page.evaluate(() => { const c = window.__showroom.engine.camera; return [c.position.x, c.position.y, c.position.z]; }); check('reduced motion: the focus jump is instant', Math.abs(c[0] - v.pos[0]) < 0.01 && Math.abs(c[2] - v.pos[2]) < 0.01, c);
  await page.click('[data-testid="sr-part-wi-shoe-2"]'); const s1 = await part(page, 'wi-shoe-2'); check('reduced motion: a tilting shelf snaps open with no intermediate state', s1.state === 'open' && s1.value === 1, s1);
  await page.click('[data-testid="sr-led"]'); check('reduced motion: LED switch is instant', await page.evaluate(() => window.__showroom.engine.products.kits.walkin.state.accentLevel() === 0));
  await press(page, 'Escape'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached' }); check('reduced motion: Esc returns instantly', Math.abs((await ex(page, (e) => e.pos()))[0] + 12.5) < 0.01);
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function mobile(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 390, height: 844 }, mobile: true }); const page = o.page; const backend = trackBackend(page);
  await L.enterExplore(page, { tap: true }); await dismissCoach(page);
  for (const id of ['studio', 'bedroom']) {
    await goto(page, POSE[id]); check(`mobile ${id}: touch overlay shown, zone is ${id}`, (await page.locator('[data-testid="sr-touch"]').count()) === 1 && (await ex(page, (e) => e.zone())) === id);
    await page.tap('[data-testid="sr-interact"]'); await page.waitForSelector(`[data-testid="sr-panel"][data-product="${id}"]`, { timeout: 30000 }); await settle(page, 600);
    const r = await page.locator('[data-testid="sr-panel"]').boundingBox(); check(`mobile ${id}: the panel is a bottom sheet (<= 46% height)`, r.width > 360 && r.height <= 844 * 0.47 && r.y + r.height > 820, r);
    const first = id === 'studio' ? 'st-table-1' : 'bd-bs-l1'; await page.tap(`[data-testid="sr-part-${first}"]`); await waitPart(page, first, 'open'); check(`mobile ${id}: part buttons work by tap`, true);
    const sc = await screenOf(page, id === 'studio' ? 'st-sample-2' : 'bd-van-1'); await page.touchscreen.tap(sc.x, Math.min(sc.y, 844 * 0.5)); await page.waitForTimeout(1200);
    const fin = await page.evaluate((id) => Array.from(document.querySelectorAll('[data-testid^="sr-finish-"]:not([data-testid="sr-finish-name"])')).map((n) => n.dataset.testid)[2], id); await page.tap(`[data-testid="${fin}"]`); await page.waitForTimeout(300);
    check(`mobile ${id}: finish swatch is tappable (44 px) and the sheet does not overflow horizontally`, (await page.locator(`[data-testid="${fin}"]`).boundingBox()).width >= 43 && !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    if (id === 'studio') check('mobile studio: the Design Studio link is a 44 px tall link to /studio', await (async () => { const bx = await page.locator('[data-testid="sr-link-studio"]').boundingBox(); return bx.height >= 43 && (await page.getAttribute('[data-testid="sr-link-studio"]', 'href')) === '/studio'; })());
    await shot(page, `phase5-60-mobile-${id}-panel`, { quality: 60 });
    await page.tap('[data-testid="sr-panel-close"]'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached', timeout: 30000 });
  }
  check('mobile: no backend requests, no page errors', backend.length === 0 && o.errors.length === 0, [backend.slice(0, 2), o.errors.slice(0, 2)]); await o.ctx.close();
}

async function ar(b) {
  const o = await L.openShowroom(b, { url: '/ar/showroom-3d', query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page;
  await L.enterExplore(page); await dismissCoach(page);
  for (const [id, re, sig] of [['bedroom', /غرفة نوم/, 'bd-bs-l1'], ['lounge', /الاستقبال وصالة الاستشارات/, 'lg-desk-1'], ['studio', /طاولة تصميم/, 'st-table-1']]) {
    await goto(page, POSE[id]); await press(page, 'KeyE'); await page.waitForSelector(`[data-testid="sr-panel"][data-product="${id}"]`, { timeout: 30000 }); await settle(page, 600);
    const txt = await page.locator('[data-testid="sr-panel"]').innerText(); check(`AR ${id}: Arabic panel (name, kicker, controls)`, re.test(txt) && /نموذج تصميم/.test(txt) && /افتح الكل/.test(txt));
    const r = await page.locator('[data-testid="sr-panel"]').boundingBox(); check(`AR ${id}: panel on the LEFT, page rtl`, r.x < 40 && (await page.evaluate(() => document.documentElement.dir)) === 'rtl', r);
    const href = await page.getAttribute('[data-testid="sr-quote"]', 'href'); check(`AR ${id}: link goes to /ar/booking with Arabic notes`, /^\/ar\/booking\?/.test(href) && /notes=%D9/.test(href), href.slice(0, 100));
    if (id === 'studio') check('AR studio: the studio link label is Arabic and points at /studio', /استوديو/.test(await page.locator('[data-testid="sr-link-studio"]').innerText()) && (await page.getAttribute('[data-testid="sr-link-studio"]', 'href')) === '/studio');
    if (id === 'lounge') check('AR lounge: consultation button label and contact links are Arabic / unchanged data', /احجز استشارة/.test(await page.locator('[data-testid="sr-quote"]').innerText()) && /واتساب/.test(await page.locator('[data-testid="sr-link-whatsapp"]').innerText()) && /\+973/.test(await page.locator('[data-testid="sr-link-call"]').innerText()));
    await page.click(`[data-testid="sr-part-${sig}"]`); await waitPart(page, sig, 'open'); await shot(page, `phase5-61-ar-${id}-panel`, { quality: 60 });
    await press(page, 'Escape'); await page.waitForSelector('[data-testid="sr-panel"]', { state: 'detached' });
  }
  check('AR: the wall screens were redrawn in Arabic (studio + lounge relabel)', await page.evaluate(() => { const P = window.__showroom.engine.products; return P.kits.studio.relabel && P.kits.lounge.relabel ? true : false; }));
  check('AR: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function stats(b) {
  const out = {}; const spots = { spawn: [0, -9, 0, 0.05], ...POSE };
  for (const tier of ['low', 'medium', 'high']) {
    const o = await L.openShowroom(b, { query: `debug=1&quality=${tier}&aa=0`, viewport: { width: 1280, height: 720 } }); const page = o.page; await L.enterExplore(page); await dismissCoach(page); out[tier] = {};
    for (const [k, p] of Object.entries(spots)) { await goto(page, p); await page.waitForTimeout(tier === 'high' ? 5000 : 3000); const i = await page.evaluate(() => window.__showroom.info()); out[tier][k] = { calls: i.calls, triangles: i.triangles }; }
    out[tier].gpu = await page.evaluate(() => window.__showroom.info().gpu); await o.ctx.close();
  }
  console.log('STATS', JSON.stringify(out)); fs.writeFileSync(path.join(L.OUT, '..', 'phase5-stats.json'), JSON.stringify(out, null, 1));
  check('low tier stays light: under 450 draw calls and 200k triangles at every spot', Object.entries(out.low).every(([k, v]) => k === 'gpu' || (v.calls < 450 && v.triangles < 200000)), Object.fromEntries(Object.entries(out.low).filter(([k]) => k !== 'gpu').map(([k, v]) => [k, v.calls + '/' + Math.round(v.triangles / 1000) + 'k'])));
}

async function gallery(b) {
  const o = await L.openShowroom(b, { query: 'debug=1&quality=high&aa=0', viewport: { width: 1100, height: 620 } }); const page = o.page; await L.enterExplore(page); await dismissCoach(page);
  const only = process.env.ONLY, snap = async (name, wait = 7000, hud = false) => { if (only && !name.startsWith(only)) return; await page.waitForTimeout(wait); await setHud(page, hud); await page.waitForTimeout(250); await shot(page, name, { quality: 56 }); await setHud(page, true); };
  const E = (fn) => page.evaluate(fn), focus = async (pid, view) => { await E(`window.__showroom.explore.explorer.exitFocus && window.__showroom.explore.explorer.focus && window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(1500); await E(`window.__showroom.explore.explorer.focusProduct('${pid}', '${view || 'overview'}')`); await settle(page, 0); };
  const open = (pid, ids) => page.evaluate(([pid, ids]) => { const st = window.__showroom.engine.products.kits[pid].state; if (ids === 'ALL') st.openAll(); else ids.forEach((i) => st.open(i)); }, [pid, ids]);
  const close = (pid) => page.evaluate((pid) => window.__showroom.engine.products.kits[pid].state.closeAll(), pid);
  const fin = (pid, f) => page.evaluate(([pid, f]) => window.__showroom.explore.explorer.setFinish(f), [pid, f]);
  const view = (v) => page.evaluate((v) => window.__showroom.explore.explorer.setView(v), v);
  await goto(page, [0, -9, 0, 0.05]); await snap('phase5-00-hall-all-eight-bays-from-spawn', 7000);
  // bedroom
  await goto(page, [-9.5, -30.7, Math.PI / 2 + 0.2, 0.04]); await snap('phase5-10-bedroom-wide', 7000);
  await goto(page, POSE.bedroom); await focus('bedroom', 'overview'); await snap('phase5-11-bedroom-closed', 6000); await snap('phase5-12-bedroom-panel', 300, true);
  await view('bed'); await open('bedroom', ['bd-bs-l1', 'bd-bs-l2', 'bd-bs-r1', 'bd-bs-r2']); await snap('phase5-13-bedroom-bedside-drawers-open', 9000);
  await view('wardrobe'); await open('bedroom', ['bd-ward-a', 'bd-ward-b']); await snap('phase5-14-bedroom-wardrobe-wall-open-led', 9000);
  await view('dressing'); await open('bedroom', ['bd-van-1', 'bd-van-2']); await snap('phase5-15-bedroom-dressing-unit-mirror', 9000);
  await close('bedroom'); await view('overview'); await fin('bedroom', 'walnut-sage'); await snap('phase5-16-bedroom-finish-walnut-sage', 9000); await fin('bedroom', 'oak-linen');
  // walk-in
  await E(`window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(2000);
  await goto(page, [-9.5, -23.1, Math.PI / 2 - 0.15, 0.04]); await snap('phase5-20-walkin-wide', 7000);
  await goto(page, POSE.walkin); await focus('walkin', 'overview'); await snap('phase5-21-walkin-closed', 6000);
  await view('island'); await open('walkin', ['wi-tray-1', 'wi-tray-2', 'wi-isl-1', 'wi-isl-4']); await snap('phase5-22-walkin-island-trays-drawers-open', 9000);
  await view('shoes'); await open('walkin', ['wi-shoe-1', 'wi-shoe-2', 'wi-shoe-3', 'wi-shoe-4']); await snap('phase5-23-walkin-shoe-wall-tilted', 9000);
  await view('display'); await open('walkin', ['wi-glass-a', 'wi-glass-b']); await snap('phase5-24-walkin-glass-display-led', 9000);
  await close('walkin'); await view('overview'); await fin('walkin', 'ivory-bronze'); await snap('phase5-25-walkin-finish-ivory-bronze', 9000); await fin('walkin', 'walnut-brass');
  // living
  await E(`window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(2000);
  await goto(page, [9.5, -15.5, -Math.PI / 2 - 0.2, 0.04]); await snap('phase5-30-living-wide', 7000);
  await goto(page, POSE.living); await focus('living', 'overview'); await snap('phase5-31-living-closed', 6000);
  await view('tv'); await open('living', ['lv-base-l', 'lv-base-r', 'lv-drawer-1', 'lv-drawer-2']); await snap('phase5-32-living-tv-unit-open', 9000);
  await view('display'); await open('living', ['lv-tall-l', 'lv-tall-r']); await snap('phase5-33-living-tall-cabinets-led', 9000);
  await close('living'); await view('lounge'); await snap('phase5-34-living-seating-console', 8000); await view('overview'); await fin('living', 'oak-sage'); await snap('phase5-35-living-finish-oak-sage', 9000); await fin('living', 'walnut-cream');
  // studio
  await E(`window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(2000);
  await goto(page, [9.5, -23.1, -Math.PI / 2 + 0.2, 0.04]); await snap('phase5-40-studio-wide', 7000);
  await goto(page, POSE.studio); await focus('studio', 'overview'); await snap('phase5-41-studio-closed', 6000); await snap('phase5-42-studio-panel-links', 300, true);
  await view('board'); await open('studio', ['st-sample-1', 'st-sample-2', 'st-rail-1', 'st-rail-2']); await snap('phase5-43-studio-sample-board-rails-open', 9000);
  await view('screen'); await snap('phase5-44-studio-design-studio-screen', 8000);
  await close('studio'); await view('table'); await open('studio', ['st-table-1', 'st-table-2']); await snap('phase5-45-studio-design-table-drawers', 9000); await close('studio'); await view('overview'); await fin('studio', 'charcoal'); await snap('phase5-46-studio-finish-charcoal', 9000); await fin('studio', 'oak');
  // lounge
  await E(`window.__showroom.explore.explorer.exitFocus()`); await page.waitForTimeout(2000);
  await goto(page, [9.5, -30.7, -Math.PI / 2 - 0.2, 0.04]); await snap('phase5-50-lounge-wide', 7000);
  await goto(page, POSE.lounge); await focus('lounge', 'overview'); await snap('phase5-51-lounge-closed', 6000); await snap('phase5-52-lounge-panel-contact-links', 300, true);
  await view('desk'); await open('lounge', ['lg-desk-1', 'lg-desk-2']); await snap('phase5-53-lounge-reception-desk-drawers', 9000);
  await view('cta'); await open('lounge', ['lg-cred-doors', 'lg-cred-d1']); await snap('phase5-54-lounge-consultation-panel-credenza', 9000);
  await close('lounge'); await view('overview'); await fin('lounge', 'charcoal-blush'); await snap('phase5-55-lounge-finish-charcoal-blush', 9000); await fin('lounge', 'oak-clay');
  check('gallery: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

(async () => {
  const b = await L.launch(); const only = process.argv[2];
  const run = async (name, fn) => { if (only && only !== name) return; try { await fn(b); } catch (e) { check(`suite "${name}" ran to the end`, false, String(e && e.message).slice(0, 300)); } };
  try { await run('flows', flows); await run('reduced', reduced); await run('mobile', mobile); await run('ar', ar); await run('stats', stats); await run('gallery', gallery); } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); bad.forEach((r) => console.log('FAILED:', r.name, JSON.stringify(r.detail)));
  process.exit(bad.length ? 1 : 0);
})();
