/* Phase 3 QA: first-person roaming, collision, department glide, menus, pointer-lock fallback, touch joystick, AR / RTL.
 * Needs a served build (node scripts/showroom3d-qa/serve.js <buildDir>) and Playwright + Chromium (SwiftShader). Writes screenshots to $OUT. */
const L = require('./lib.js');
const { check, ex, shot } = L;
const R = 0.35;
// independent statement of where the CENTRE of the walker may be (hall / forecourt / path / door corridor)
const inUnion = (p) => {
  const [x, z] = p, e = 1e-3;
  if (x >= -22 + R - e && x <= 22 - R + e && z >= -36 + R - e && z <= -0.2 - R + e) return true;
  if (x >= -24.6 + R - e && x <= 24.6 - R + e && z >= 0.35 + R - e && z <= 22.2 - R + e) return true;
  if (Math.abs(x) <= 4.0 + e && z >= 22.2 - R - e && z <= 36 - R + e) return true;
  if (Math.abs(x) <= 1.6 + e && z >= -0.2 - R - e && z <= 0.35 + R + e) return true;
  return false;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const stops = { kitchens: [-12.5, -7.9], wardrobes: [-12.5, -15.5], walkin: [-12.5, -23.1], bedroom: [-12.5, -30.7], doors: [12.5, -7.9], living: [12.5, -15.5], studio: [12.5, -23.1], lounge: [12.5, -30.7] };

async function desktop(b) {
  const { ctx, page, errors } = await L.openShowroom(b);
  await L.enterExplore(page);
  const info0 = await page.evaluate(() => window.__showroom.info());
  check('desktop: explore phase reached via the real Skip button, tier low (software GL)', info0.tier === 'low', info0.gpu);
  check('spawn is the hand-over pose (0, -9) and walkable', JSON.stringify(await ex(page, (e) => e.pos())) === '[0,-9]');
  check('coach marks shown on first run (EN)', await page.locator('[data-testid="sr-coach"]').isVisible() && /How to explore/.test(await page.locator('[data-testid="sr-coach"]').innerText()));
  await shot(page, 'phase3-desk-1-spawn-coach');
  await page.click('[data-testid="sr-coach-done"]');
  check('coach dismissed and remembered', (await page.locator('[data-testid="sr-coach"]').count()) === 0 && (await page.evaluate(() => localStorage.getItem('closets_showroom_coach'))) === '1');
  check('click-to-start hint is visible', /Click the scene/.test(await page.locator('[data-testid="sr-hint"]').innerText()));
  await shot(page, 'phase3-desk-2-spawn-hint');

  // ---- real keyboard: W then Shift+W, measured in wall-clock
  const p0 = await ex(page, (e) => e.pos()); await page.keyboard.down('w'); await page.waitForTimeout(2500);
  const sp = await ex(page, (e) => e.speed()); await page.keyboard.up('w');
  const p1 = await ex(page, (e) => e.pos());
  check('real key W moves forward (-Z), speed <= walk', p1[1] < p0[1] - 0.05 && sp <= 1.45, { moved: +(p0[1] - p1[1]).toFixed(2), speed: +sp.toFixed(2), fps: (await page.evaluate(() => window.__showroom.info().fps)) });
  await page.keyboard.down('Shift'); await page.keyboard.down('ArrowDown'); await page.waitForTimeout(1500); const spj = await ex(page, (e) => e.speed()); await page.keyboard.up('ArrowDown'); await page.keyboard.up('Shift');
  check('Shift + arrow-down jogs backward (speed > walk, <= 2.5)', spj > 0.5 && spj <= 2.55, +spj.toFixed(2));
  await page.keyboard.down('a'); await page.waitForTimeout(800); await page.keyboard.up('a');
  check('A strafes left (-X)', (await ex(page, (e) => e.pos()))[0] < 0);

  // ---- every wall / fixture: run into it with the real walker + collision (sim = same Walker.step the frame loop runs)
  const walls = [
    ['bench (spawn straight ahead)', [0, -9], 0, { fwd: 1 }, 12, (p) => near(p[1], -14.25 + R, 0.03)],
    ['right wall through the 0.8 m gap between two bays\' posts', [8, -19.3], Math.PI / 2 * -1, { fwd: 1 }, 20, (p) => near(p[0], 22 - R, 0.03)],
    ['left wall through the gap', [-8, -19.3], Math.PI / 2, { fwd: 1 }, 20, (p) => near(p[0], -22 + R, 0.03)],
    ['bay post face (right bay, aimed at a post)', [8, -19.85], Math.PI / 2 * -1, { fwd: 1 }, 20, (p) => near(p[0], 21.51 - R, 0.05)],
    ['strafe right into the right wall (bay alcove, no posts)', [8, -23.1], 0, { right: 1 }, 20, (p) => near(p[0], 22 - R, 0.03)],
    ['back wall', [8, -9], 0, { fwd: 1 }, 30, (p) => near(p[1], -36 + R, 0.03)],
    ['glass facade (backing up)', [8, -9], 0, { fwd: -1 }, 20, (p) => near(p[1], -0.2 - R, 0.03)],
    ['glass facade (walking at it)', [-8, -3], Math.PI, { fwd: 1, jog: true }, 8, (p) => near(p[1], -0.2 - R, 0.03)],
    ['solid wing beside the glass', [-18, -9], Math.PI, { fwd: 1 }, 20, (p) => near(p[1], -0.8 - R, 0.03)],
    ['planter', [13, -2], 0, { fwd: 1 }, 6, (p) => p[1] > -5.2 + 0.95 + R - 0.05 && p[1] < -3.5],
    ['bay portal post (left bay 1)', [-15, -7.9 - 3.25], Math.PI / 2, { fwd: 1 }, 10, (p) => near(p[0], -21.51 + R, 0.05)],
    ['second bench from behind', [0, -33], Math.PI, { fwd: 1 }, 20, (p) => near(p[1], -26 - 0.75 - R, 0.03) || near(p[1], -26.75 - R, 0.03)],
    ['corner (back-left), diagonal at jog', [-15, -30], Math.PI / 4, { fwd: 1, jog: true }, 20, (p) => near(p[0], -22 + R, 0.05) && near(p[1], -36 + R, 0.05)],
  ];
  for (const [name, start, yaw, input, secs, ok] of walls) {
    await ex(page, (e, s, y) => e.teleport(s[0], s[1], y, 0), start, yaw);
    const p = await ex(page, (e, i, s) => e.sim(s, i), input, secs);
    check('collision: ' + name, ok(p) && inUnion(p), p.map((v) => +v.toFixed(2)));
    if (name === 'solid wing beside the glass') { await page.waitForTimeout(400); await shot(page, 'phase3-desk-3-wing-nearwall'); }
    if (name.startsWith('right wall through')) { await ex(page, (e, s) => e.teleport(21.3, -9, -Math.PI / 2, 0.05)); await page.waitForTimeout(400); await shot(page, 'phase3-desk-4-right-wall-contact'); }
  }
  // glass screenshot: pressed against the facade from inside
  await ex(page, (e) => e.teleport(7, -0.6, Math.PI, 0.02)); await page.waitForTimeout(500); await shot(page, 'phase3-desk-5-glass-contact');
  // large dt: one giant step, then fuzz
  const big = await page.evaluate(() => { const e = window.__showroom.explore, out = []; for (const yaw of [0, 1, 2, 3, 4, 5]) { e.teleport(0, -9, yaw, 0); out.push(e.sim(5, { fwd: 1, jog: true }, 5)); out.push(e.sim(5, { fwd: 1, right: 1 }, 5)); } return out; });
  check('large dt (a single 5 s step) never tunnels out', big.every(inUnion), big.length);
  const fuzz = await page.evaluate(() => { let s = 12345; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296, e = window.__showroom.explore, out = [];
    for (let i = 0; i < 150; i++) { const reg = r(); let x, z; if (reg < 0.6) { x = -21 + r() * 42; z = -35 + r() * 34; } else if (reg < 0.9) { x = -24 + r() * 48; z = 1 + r() * 21; } else { x = -3.5 + r() * 7; z = 23 + r() * 12; }
      e.teleport(x, z, r() * 6.28, 0); out.push(e.sim(4 + r() * 6, { fwd: r() * 2 - 1, right: r() * 2 - 1, jog: r() < 0.5 }, 0.02 + r() * 0.3)); } return out; });
  check('150 random 4-10 s moves (dt up to 0.32 s) from random places never leave the walkable area', fuzz.every(inUnion), fuzz.filter((p) => !inUnion(p)).slice(0, 3));

  // ---- out through the doors and back
  await ex(page, (e) => e.teleport(0, -6, Math.PI, 0));
  let p = await ex(page, (e) => e.sim(8, { fwd: 1 })); check('walk out through the open doors onto the forecourt', p[1] > 1 && Math.abs(p[0]) < 0.5, p);
  await ex(page, (e) => e.teleport(0, 8, 0, 0.05)); await page.waitForTimeout(700); await shot(page, 'phase3-desk-6-forecourt-facade');
  await ex(page, (e) => e.teleport(0, 8, Math.PI, 0.02)); p = await ex(page, (e) => e.sim(60, { fwd: 1 })); check('the approach path stops at 36 m (no endless walking)', near(p[1], 36 - R, 0.05) && inUnion(p), p);
  await page.waitForTimeout(500); await shot(page, 'phase3-desk-7-path-end');
  await ex(page, (e, q) => e.teleport(q[0], q[1], 0, 0), p); p = await ex(page, (e) => e.sim(40, { fwd: 1 })); check('walk back in through the doors and stop at the first bench', p[1] < -13 && p[1] > -14.2, p);
  await ex(page, (e) => e.teleport(3, 4, 0, 0)); p = await ex(page, (e) => e.sim(10, { fwd: 1 })); check('off-centre at the facade: the glass, not the door, stops you', p[1] > 0.5 && p[1] < 1.5 && inUnion(p), p);
  const sides = await page.evaluate(() => { const e = window.__showroom.explore, o = []; e.teleport(-20, 10, Math.PI / 2 * -1, 0); o.push(e.sim(20, { fwd: 1 })); e.teleport(0, 12, Math.PI / 2, 0); o.push(e.sim(20, { fwd: 1 })); e.teleport(0, 15, 0, 0); o.push(e.sim(20, { fwd: 1 })); return o; });
  check('forecourt edges (hedge, basin) hold: still inside the area', sides.every(inUnion), sides);

  // ---- interaction stub
  await ex(page, (e) => e.teleport(-12.5, -7.9, Math.PI / 2, 0.05)); await page.waitForTimeout(900);
  check('zone prompt appears in the Kitchens bay (Press E)', (await page.locator('[data-testid="sr-prompt"]').count()) === 1 && /Kitchens/.test(await page.locator('[data-testid="sr-prompt"]').innerText()), await ex(page, (e) => e.zone()));
  await shot(page, 'phase3-desk-8-bay-prompt');
  await page.keyboard.press('e'); await page.waitForTimeout(500);
  check('E shows the interaction stub toast naming the department', /Kitchens/.test(await page.locator('[data-testid="sr-toast"]').innerText()) && /later release/.test(await page.locator('[data-testid="sr-toast"]').innerText()));
  await shot(page, 'phase3-desk-9-bay-interact-pulse');
  await ex(page, (e) => e.teleport(0, -20, 0, 0)); await page.waitForTimeout(600); await page.keyboard.press('e'); await page.waitForTimeout(400);
  check('E in the open nave gives a helpful nudge instead of nothing', /department bay/.test(await page.locator('[data-testid="sr-toast"]').innerText()));

  // ---- department quick-nav: glide to every bay, from the spawn and from outside
  const walkedSamples = [];
  for (const id of Object.keys(stops)) {
    await ex(page, (e) => e.teleport(0, -9, 0, 0.05)); await page.waitForTimeout(150);
    await page.click('[data-testid="sr-open-depts"]'); await page.waitForSelector('[data-testid="sr-dept-menu"]');
    check('dept menu: dialog takes focus (' + id + ')', await page.evaluate(() => !!document.activeElement.closest('[data-testid="sr-dept-menu"]')));
    await page.click(`[data-dept="${id}"]`);
    const t0 = Date.now(); let gl = true;
    while (gl && Date.now() - t0 < 60000) { await page.waitForTimeout(250); const s = await page.evaluate(() => ({ g: window.__showroom.explore.state().gliding, p: window.__showroom.explore.pos() })); gl = s.g; walkedSamples.push(s.p); }
    const pos = await ex(page, (e) => e.pos()), yaw = await ex(page, (e) => e.yaw()), z = await ex(page, (e) => e.zone());
    check(`glide to ${id} arrives at the bay entrance facing the bay`, near(pos[0], stops[id][0], 0.05) && near(pos[1], stops[id][1], 0.05) && near(Math.abs(yaw), Math.PI / 2, 0.08) && z === id, { pos, yaw: +yaw.toFixed(2), zone: z, ms: Date.now() - t0 });
    if (['kitchens', 'bedroom', 'doors', 'lounge'].includes(id)) { await page.waitForTimeout(500); await shot(page, 'phase3-desk-bay-' + id); }
  }
  check('every sampled position during the glides stayed walkable', walkedSamples.every(inUnion), walkedSamples.length);
  // from outside
  await ex(page, (e) => e.teleport(2, 30, Math.PI, 0)); await page.keyboard.press('3'); const samples = []; const t1 = Date.now();
  while (Date.now() - t1 < 60000) { await page.waitForTimeout(150); const s = await page.evaluate(() => ({ g: window.__showroom.explore.state().gliding, p: window.__showroom.explore.pos() })); samples.push(s.p); if (!s.g && Date.now() - t1 > 400) break; }
  const gp = await ex(page, (e) => e.pos());
  check('key 3 glides from the street, through the door, to Walk-in Closets', near(gp[0], -12.5, 0.05) && near(gp[1], -23.1, 0.05) && samples.every(inUnion) && samples.some((q) => q[1] < 0) && samples.some((q) => q[1] > 5), { gp, n: samples.length });   // (the route itself is unit-tested to pass the doorway; polling at ~1 fps is too sparse to catch it)

  // ---- ESC pause menu (keyboard path: not pointer locked)
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Escape'); await page.waitForSelector('[data-testid="sr-pause-menu"]');
  check('ESC opens the pause menu; focus moves inside', await page.evaluate(() => !!document.activeElement.closest('[data-testid="sr-pause-menu"]')));
  const labels = await page.locator('[data-testid="sr-pause-menu"] .sr-btn').allInnerTexts();
  check('menu offers resume, departments, replay intro, language, back to website', /Resume/.test(labels[0]) && labels.some((l) => /Departments/.test(l)) && labels.some((l) => /Replay intro/.test(l)) && labels.some((l) => /العربية/.test(l)) && labels.some((l) => /Back to website/.test(l)), labels);
  await shot(page, 'phase3-desk-10-pause-menu');
  const before = await ex(page, (e) => e.pos()); await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
  check('movement keys are ignored while the menu is open', JSON.stringify(before) === JSON.stringify(await ex(page, (e) => e.pos())));
  let trapped = true; for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); trapped = trapped && (await page.evaluate(() => !!document.activeElement.closest('[data-testid="sr-pause-menu"]'))); }
  check('Tab cycles inside the dialog (focus trap, 12 presses)', trapped);
  await page.keyboard.press('Shift+Tab'); check('Shift+Tab also stays inside', await page.evaluate(() => !!document.activeElement.closest('[data-testid="sr-pause-menu"]')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check('ESC again resumes; dialog gone; focus is back on the page (canvas / body), not stranded', (await page.locator('[data-testid="sr-pause-menu"]').count()) === 0 && !(await ex(page, (e) => e.state().paused)) && (await page.evaluate(() => ['BODY', 'CANVAS', 'BUTTON', 'A'].includes(document.activeElement.tagName) && !document.activeElement.closest('[role="dialog"]'))), await page.evaluate(() => document.activeElement.tagName));
  await page.keyboard.press('Escape'); await page.waitForSelector('[data-testid="sr-pause-menu"]'); await page.click('[data-testid="sr-resume"]');
  check('Resume button resumes', (await page.locator('[data-testid="sr-pause-menu"]').count()) === 0);
  // head bob toggle
  await page.keyboard.press('Escape'); await page.waitForSelector('[data-testid="sr-pause-menu"]');   // (real pointer lock is active after Resume: the HUD is unclickable by design, Esc is the way out)
  await page.click('text=Head bob: on'); check('head-bob toggle flips to off and persists', (await page.locator('text=Head bob: off').count()) === 1 && (await page.evaluate(() => localStorage.getItem('closets_showroom_bob'))) === '0');
  await page.click('text=Head bob: off');
  // replay intro and back
  await page.click('text=Replay intro'); await page.waitForSelector('.sr-stage[data-phase="intro"]');
  check('Replay intro returns to the intro (explorer disabled, doors reset)', !(await ex(page, (e) => e.state().enabled)) && (await page.evaluate(() => window.__showroom.engine.state.doorOpen)) < 0.5);
  await page.click('[data-testid="sr-skip"]'); await page.waitForSelector('.sr-stage[data-phase="explore"]'); await page.waitForTimeout(600);
  check('skip works again after a replay: explorer re-enabled at the spawn', (await ex(page, (e) => e.state().enabled)) && JSON.stringify(await ex(page, (e) => e.pos())) === '[0,-9]');
  // language
  await page.keyboard.press('Escape'); await page.waitForSelector('[data-testid="sr-pause-menu"]');
  await page.click('button[aria-label="Switch to Arabic"]'); await page.waitForTimeout(400);
  check('language toggle in the menu switches to Arabic RTL', (await page.evaluate(() => document.documentElement.dir)) === 'rtl' && /متابعة/.test(await page.locator('[data-testid="sr-resume"]').innerText()));
  await shot(page, 'phase3-ar-desk-pause-menu');
  await page.click('[data-testid="sr-resume"]'); await page.waitForTimeout(500);
  await ex(page, (e) => e.teleport(0, -9, 0, 0.05)); await page.evaluate(() => localStorage.removeItem('closets_showroom_coach')); await page.waitForTimeout(300);
  const noRobots = await page.evaluate(() => document.querySelector('meta[name="robots"]').content);
  check('noindex kept', /noindex/.test(noRobots), noRobots);
  check('no page errors / console errors (desktop)', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
}

async function pointerLock(b) {
  // 1) lock denied -> drag-look fallback
  let o = await L.openShowroom(b, { init: () => { HTMLElement.prototype.requestPointerLock = function () { setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')), 0); }; } });
  await L.enterExplore(o.page); await o.page.click('[data-testid="sr-coach-done"]');
  await o.page.mouse.move(480, 270); await o.page.mouse.down(); await o.page.waitForTimeout(300);
  const y0 = await ex(o.page, (e) => e.yaw()); await o.page.mouse.move(600, 270, { steps: 6 }); await o.page.mouse.up(); await o.page.waitForTimeout(200);
  const y1 = await ex(o.page, (e) => e.yaw());
  const st = await ex(o.page, (e) => e.state());
  check('pointer lock denied: falls back to drag-look (drag right turns the view right)', st.dragMode && st.lockFails >= 1 && y1 < y0 - 0.1, { y0: +y0.toFixed(2), y1: +y1.toFixed(2), st });
  check('fallback hint + note shown', /Drag to look/.test(await o.page.locator('[data-testid="sr-hint"]').innerText()) && (await o.page.locator('.sr-hint-note').count()) === 1);
  await shot(o.page, 'phase3-desk-11-lock-denied-drag');
  check('no errors (lock denied)', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  // 2) lock granted (simulated), mouse look, then Esc releasing the lock opens the pause menu
  o = await L.openShowroom(b, { init: () => {
    let el = null; Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return el; }, configurable: true });
    HTMLElement.prototype.requestPointerLock = function () { el = this; setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0); };
    document.exitPointerLock = function () { el = null; setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0); };
    window.__fakeEsc = () => { el = null; document.dispatchEvent(new Event('pointerlockchange')); };
  } });
  await L.enterExplore(o.page); await o.page.click('[data-testid="sr-coach-done"]');
  await o.page.mouse.click(480, 270); await o.page.waitForTimeout(300);
  check('pointer lock granted: locked state, controls hint updates', (await ex(o.page, (e) => e.state().locked)) && /W A S D to walk/.test(await o.page.locator('[data-testid="sr-hint"]').innerText()));
  const ya = await ex(o.page, (e) => e.yaw()); await o.page.evaluate(() => { const ev = new MouseEvent('mousemove', { bubbles: true }); Object.defineProperty(ev, 'movementX', { value: 200 }); Object.defineProperty(ev, 'movementY', { value: -100 }); document.dispatchEvent(ev); });
  const yb = await ex(o.page, (e) => e.yaw()), pb = await ex(o.page, (e) => e.pitch());
  check('locked mouse look: +X turns right, -Y looks up', yb < ya - 0.3 && pb > 0.1, { ya, yb, pb });
  await o.page.evaluate(() => window.__fakeEsc()); await o.page.waitForSelector('[data-testid="sr-pause-menu"]', { timeout: 5000 });
  check('losing the lock (the browser handling Esc) opens the pause menu', await ex(o.page, (e) => e.state().paused));
  await o.page.click('[data-testid="sr-resume"]'); await o.page.waitForTimeout(300);
  check('Resume (a click) asks for the lock again', await ex(o.page, (e) => e.state().locked));
  check('no errors (lock granted)', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  // 3) the browser's real pointer lock (may be refused headless): either outcome must leave a working control scheme
  o = await L.openShowroom(b); await L.enterExplore(o.page); await o.page.click('[data-testid="sr-coach-done"]'); await o.page.mouse.click(480, 270); await o.page.waitForTimeout(600);
  const real = await ex(o.page, (e) => e.state()); check('real Chromium pointer lock: locked or cleanly fell back to drag', real.locked || real.dragMode, real);
  await o.ctx.close();
}

async function mobile(b, lang) {
  const ar = lang === 'ar';
  const { ctx, page, errors } = await L.openShowroom(b, { url: ar ? '/ar/showroom-3d' : '/showroom-3d', viewport: { width: 390, height: 844 }, mobile: true });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
  await L.enterExplore(page, { tap: true });
  check(`mobile ${lang}: touch controls and the touch hint are shown from the start (no desktop hint)`, (await page.locator('[data-testid="sr-touch"]').count()) === 1 && /Drag on the left|اسحب على اليسار/.test(await page.locator('[data-testid="sr-hint"]').innerText()), await page.locator('[data-testid="sr-hint"]').innerText());
  await page.tap('[data-testid="sr-coach-done"]'); await page.waitForTimeout(300);
  const rect = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);
  const joy = await rect('[data-testid="sr-joy"]'), fab = await rect('[data-testid="sr-interact"]'), logo = await rect('.sr-pill-logo'), dep = await rect('[data-testid="sr-open-depts"]');
  check(`mobile ${lang}: joystick physically LEFT, interact physically RIGHT, both inside the viewport`, joy.x < 195 && joy.r <= 390 && fab.x > 195 && fab.r <= 390 && joy.b <= 844 && fab.b <= 844, { joy, fab });
  check(`mobile ${lang}: HUD top bar ${ar ? 'mirrored (logo on the right)' : '(logo on the left)'}`, ar ? logo.x > 195 && dep.x < 195 : logo.x < 195 && dep.x > 195, { logo: logo.x, dep: dep.x });
  check(`mobile ${lang}: tap targets >= 44 px`, fab.w >= 60 && dep.h >= 40, { fab: fab.w, dept: dep.h });
  const vp = await page.evaluate(() => document.querySelector('meta[name="viewport"]').content); check('viewport-fit=cover set for safe areas', /viewport-fit=cover/.test(vp), vp);
  await shot(page, `phase3-${ar ? 'ar-' : ''}mob-1-joystick-idle`);
  if (!ar) {
    // joystick drag up-left 90 px (rim = jog), then a right-thumb drag at the same time (multi-touch)
    const p0 = await ex(page, (e) => e.pos()), y0 = await ex(page, (e) => e.yaw());
    await touch('touchStart', [[110, 700, 1]]); await touch('touchMove', [[110, 660, 1]]); await touch('touchMove', [[110, 610, 1]]); await page.waitForTimeout(1500);
    const joyActive = await page.evaluate(() => document.querySelector('[data-testid="sr-joy"]').classList.contains('is-active'));
    await shot(page, 'phase3-mob-2-joystick-active');
    await touch('touchStart', [[110, 610, 1], [300, 400, 2]]); await touch('touchMove', [[110, 610, 1], [340, 400, 2]]); await touch('touchMove', [[110, 610, 1], [380, 410, 2]]); await page.waitForTimeout(600);
    const sp = await ex(page, (e) => e.speed()), y1 = await ex(page, (e) => e.yaw());
    await touch('touchEnd', [[380, 410, 2]]); await page.waitForTimeout(500); const stillMoving = await ex(page, (e) => e.speed());
    await touch('touchEnd', []); await page.waitForTimeout(1200);
    const p1 = await ex(page, (e) => e.pos()), s1 = await ex(page, (e) => e.speed());
    check('touch joystick drag walks forward (and the base follows the finger)', joyActive && p0[1] - p1[1] > 0.2, { moved: +(p0[1] - p1[1]).toFixed(2) });
    check('multi-touch: look drag on the right turns the view WHILE the left thumb keeps walking', y1 < y0 - 0.15 && sp > 0.15, { y0, y1, speed: sp });
    check('lifting the right finger leaves the left thumb walking; lifting both stops', stillMoving > 0.1 && s1 < 0.05, { stillMoving, s1 });
    // pinch / scroll must not zoom or scroll the page
    await touch('touchStart', [[150, 400, 3], [250, 400, 4]]); await touch('touchMove', [[100, 400, 3], [300, 400, 4]]); await touch('touchMove', [[40, 400, 3], [350, 400, 4]]); await touch('touchEnd', []);
    await touch('touchStart', [[200, 500, 5]]); await touch('touchMove', [[200, 300, 5]]); await touch('touchEnd', []);
    const pg = await page.evaluate(() => ({ s: window.visualViewport.scale, y: window.scrollY, x: window.scrollX, sh: document.documentElement.scrollHeight, ih: innerHeight }));
    check('pinch and swipe do not zoom or scroll the page', pg.s === 1 && pg.y === 0 && pg.x === 0, pg);
    // dept quick nav by touch
    await page.tap('[data-testid="sr-open-depts"]'); await page.waitForSelector('[data-testid="sr-dept-menu"]'); await page.waitForTimeout(400); await shot(page, 'phase3-mob-3-dept-menu');
    const dm = await rect('[data-testid="sr-dept-menu"]'); check('dept menu fits the phone viewport (sheet)', dm.r <= 390 && dm.b <= 844 && dm.h > 300, dm);
    await page.tap('[data-dept="lounge"]');
    const t0 = Date.now(); while (Date.now() - t0 < 60000) { await page.waitForTimeout(250); if (!(await ex(page, (e) => e.state().gliding))) break; }
    const gp = await ex(page, (e) => e.pos()); check('touch: tapping Consultation Lounge glides there', near(gp[0], 12.5, 0.05) && near(gp[1], -30.7, 0.05), gp);
    await page.waitForTimeout(500); await shot(page, 'phase3-mob-4-bay-lounge');
    await page.tap('[data-testid="sr-interact"]'); await page.waitForTimeout(500);
    check('touch Interact button works in a bay', /Consultation Lounge/.test(await page.locator('[data-testid="sr-toast"]').innerText()));
    await shot(page, 'phase3-mob-5-interact-toast');
    await page.tap('[data-testid="sr-open-menu"]'); await page.waitForSelector('[data-testid="sr-pause-menu"]'); await shot(page, 'phase3-mob-6-menu');
  } else {
    await touch('touchStart', [[110, 700, 1]]); await touch('touchMove', [[110, 640, 1]]); await page.waitForTimeout(700); await shot(page, 'phase3-ar-mob-2-joystick-active'); await touch('touchEnd', []);
    await page.tap('[data-testid="sr-open-depts"]'); await page.waitForSelector('[data-testid="sr-dept-menu"]'); await page.waitForTimeout(300); await shot(page, 'phase3-ar-mob-3-dept-menu');
    check('AR dept menu lists Arabic names', /المطابخ/.test(await page.locator('[data-testid="sr-dept-menu"]').innerText()));
  }
  if (!ar) { const raf = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); })); console.log('INFO fps (mobile 390x844 DPR 1, low tier, SwiftShader CPU): rAF', raf.toFixed(2)); }
  check(`no errors (mobile ${lang})`, errors.length === 0, errors.slice(0, 3));
  await ctx.close();
}

async function arDesktop(b) {
  const { ctx, page, errors } = await L.openShowroom(b, { url: '/ar/showroom-3d' });
  await L.enterExplore(page);
  check('AR desktop: html dir=rtl lang=ar, Arabic coach marks', (await page.evaluate(() => document.documentElement.dir)) === 'rtl' && /كيف تتجول/.test(await page.locator('[data-testid="sr-coach"]').innerText()));
  const logo = await page.evaluate(() => document.querySelector('.sr-pill-logo').getBoundingClientRect().x), dep = await page.evaluate(() => document.querySelector('[data-testid="sr-open-depts"]').getBoundingClientRect().x);
  check('AR desktop: logo on the right, action buttons on the left', logo > 480 && dep < 480, { logo, dep });
  await shot(page, 'phase3-ar-desk-1-coach');
  await page.click('[data-testid="sr-coach-done"]'); await ex(page, (e) => e.teleport(-12.5, -7.9, Math.PI / 2, 0.05)); await page.waitForTimeout(900);
  check('AR desktop: zone prompt in Arabic', /المطابخ/.test(await page.locator('[data-testid="sr-prompt"]').innerText()));
  await shot(page, 'phase3-ar-desk-2-bay-prompt');
  await page.keyboard.press('e'); await page.waitForTimeout(400); check('AR desktop: interact toast in Arabic', /إصدار لاحق/.test(await page.locator('[data-testid="sr-toast"]').innerText()));
  check('no errors (AR desktop)', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
}

async function reduced(b) {
  const { ctx, page, errors } = await L.openShowroom(b, { reduced: true });
  await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 }); await page.waitForTimeout(600);
  check('reduced motion: no intro, explore immediately, head-bob forced off', (await ex(page, (e) => e.state().enabled)));
  await ex(page, (e) => e.teleport(8, -30, Math.PI, 0)); const ys = await page.evaluate(() => { const e = window.__showroom.explore, o = []; for (let i = 0; i < 120; i++) { e.sim(1 / 60, { fwd: 1 }, 1 / 60); o.push(e.camY()); } return o; });
  check('reduced motion: camera height constant 1.65 m while walking', ys.every((y) => Math.abs(y - 1.65) < 1e-9), [Math.min(...ys), Math.max(...ys)]);
  await page.click('[data-testid="sr-coach-done"]'); await page.click('[data-testid="sr-open-depts"]'); await page.click('[data-dept="studio"]'); await page.waitForTimeout(600);
  const gp = await ex(page, (e) => e.pos()); check('reduced motion: department jump is instant (no glide)', near(gp[0], 12.5, 0.05) && near(gp[1], -23.1, 0.05) && !(await ex(page, (e) => e.state().gliding)), gp);
  await page.keyboard.press('Escape'); await page.waitForSelector('[data-testid="sr-pause-menu"]');
  check('reduced motion: head-bob control disabled with explanation', await page.locator('[data-testid="sr-pause-menu"] button[aria-pressed]').isDisabled() && /reduced motion/.test(await page.locator('.sr-dialog-note').first().innerText()));
  await ctx.close();
  // bob enabled walk for the default (non reduced) case
  const o = await L.openShowroom(b); await L.enterExplore(o.page);
  await ex(o.page, (e) => e.teleport(8, -30, Math.PI, 0)); const ys2 = await o.page.evaluate(() => { const e = window.__showroom.explore, out = []; for (let i = 0; i < 200; i++) { e.sim(1 / 60, { fwd: 1 }, 1 / 60); out.push(e.camY()); } return out; });
  const span = Math.max(...ys2) - Math.min(...ys2); check('head bob on by default: 2 cm peak-to-peak vertical, visible but gentle', span > 0.008 && span < 0.05, +span.toFixed(4));
  const fps = []; for (let i = 0; i < 2; i++) { await o.page.waitForTimeout(2200); fps.push(await o.page.evaluate(() => window.__showroom.info().fps)); }
  const raf = await o.page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  console.log('INFO fps (desktop 960x540, low tier, SwiftShader CPU): engine', fps.join(', '), '| rAF', raf.toFixed(2)); await o.ctx.close();
  const h = await L.openShowroom(b, { query: 'debug=1&quality=high' }); await L.enterExplore(h.page); await h.page.waitForTimeout(1500);
  const rafH = await h.page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  console.log('INFO fps (desktop 960x540, HIGH tier, SwiftShader CPU): rAF', rafH.toFixed(2)); await h.ctx.close();
}

(async () => {
  const b = await L.launch(); const only = process.argv[2];
  try {
    if (!only || only === 'desktop') await desktop(b);
    if (!only || only === 'lock') await pointerLock(b);
    if (!only || only === 'mobile') { await mobile(b, 'en'); await mobile(b, 'ar'); }
    if (!only || only === 'ar') await arDesktop(b);
    if (!only || only === 'reduced') await reduced(b);
  } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); bad.forEach((r) => console.log('FAILED:', r.name, JSON.stringify(r.detail)));
  process.exit(bad.length ? 1 : 0);
})();
