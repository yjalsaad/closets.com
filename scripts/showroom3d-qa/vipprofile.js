/* VIP profile decks + big screen QA (headless Chromium on SwiftShader): the two new decks in the picker, the big-screen view (EN / AR, desktop / mobile), presenter bar, auto-play,
 * motion frame sequences (the animation clock is pinned so each frame is deterministic), the adviser's "let me present", reduced motion.
 * Needs a served build:  node scripts/showroom3d-qa/serve.js build 5066   then   BASE=http://localhost:5066 node scripts/showroom3d-qa/vipprofile.js [flows|seq|ar|mobile|reduced|advisor|legible] */
const L = require('./lib.js');
const { check, ex, shot } = L;
const FAST = 'debug=1&quality=low&aa=0&scale=0.5', MED = 'debug=1&quality=medium&aa=0&scale=0.5';
const VIP_STAND = [0, -30.2, 0, 0.05];
const settle = async (page, ms = 600) => { await page.waitForFunction(() => !window.__showroom.explore.explorer.fly, null, { timeout: 120000 }); await page.waitForTimeout(ms); };
const goto = async (page, p) => { await ex(page, (e, a) => e.teleport(...a), p); await page.waitForTimeout(500); };
const press = async (page, key) => { await page.keyboard.press(key); await page.waitForTimeout(250); };
const dismissCoach = async (page) => { await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); }); await page.waitForTimeout(300); };
const setHud = (page, on, keepPresenter = false) => page.evaluate(([on, keep]) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach, .sr-touch, .sr-greet, [data-testid="sr-greet-bubble"]').forEach((n) => { n.style.visibility = on || (keep && n.classList.contains('sr-panel')) ? '' : 'hidden'; }), [on, keepPresenter]);
const panelText = (page) => page.locator('[data-testid="sr-vip-panel"]').innerText();
const vip = (page, fn, ...a) => page.evaluate(([f, args]) => { const v = window.__showroom.engine.products.vip, x = window.__showroom.explore.explorer; return (new Function('v', 'x', 'args', 'return (' + f + ')(v, x, ...args)'))(v, x, args); }, [fn.toString(), a]);
const mockProjects = (page) => page.route('**/rest/v1/website_projects*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
async function enterVip(page, tap = false) {
  await L.enterExplore(page, { tap }); await dismissCoach(page); await goto(page, VIP_STAND);
  if (tap) await page.tap('[data-testid="sr-interact"]'); else await press(page, 'KeyE');
  await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 30000 }); await settle(page, 600);
}
const wait = (page, ms) => page.waitForTimeout(ms);
/** wait until the wall's images (same-origin photos) have loaded and the screen is redrawn */
const imagesReady = (page) => page.waitForFunction(() => { const v = window.__showroom.engine.products.vip; const m = v.state.images; return [...m.values()].length > 0 && [...m.values()].every(Boolean); }, null, { timeout: 60000 }).catch(() => {});
const frame = async (page, name, t) => { await vip(page, (v, x, tt) => v.freezeAnim(tt), t); await wait(page, 350); await setHud(page, false); await wait(page, 250); await shot(page, name, { quality: 52 }); await setHud(page, true); };
const wallBox = (page) => vip(page, (v, x) => { const m = v.screenMesh, g = m.geometry.parameters, cam = x.engine.camera, r = x.canvas.getBoundingClientRect(); cam.updateMatrixWorld(true); const pts = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => { const p = m.position.clone(); p.set(a * g.width / 2, b * g.height / 2, 0); m.localToWorld(p); p.project(cam); return [(p.x + 1) / 2 * r.width, (1 - p.y) / 2 * r.height]; }); return { pts, w: r.width, h: r.height }; });

async function flows(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }); const page = o.page; await mockProjects(page); await enterVip(page);
  check('the room now has three permanent decks in the picker: investor deck (default), The Closets profile, YAS profile', JSON.stringify(await page.$$eval('[data-testid="sr-vip-deck-select"] option', (o2) => o2.map((x) => x.value))) === '["default","closets-profile","yas-profile"]');
  check('default deck unchanged: station 1 of 5 "Company story and brand"', /Station\s*1\s*\/\s*5/.test(await panelText(page)) && /Company story and brand/.test(await panelText(page)));
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 800); await imagesReady(page); await wait(page, 1500);
  let txt = await panelText(page); check('pick The Closets profile: slide 1 / 23 (22 + the closing notice), title on the panel, wall shows the same deck', /Slide\s*1\s*\/\s*23/.test(txt) && (await vip(page, (v) => v.state.deck.id)) === 'closets-profile');
  await shot(page, 'vipprofile-01-panel-closets-cover', { quality: 55 });
  await frame(page, 'vipprofile-02-wall-closets-cover', 3.0);
  await press(page, 'Digit2'); await settle(page, 400); check('key 2 jumps to slide 2 "Who we are" with the count-up stats in the panel', /Who we are/.test(await panelText(page)) && (await page.locator('[data-testid="sr-count"]').count()) === 2);
  await page.waitForTimeout(2200); const counts = await page.$$eval('[data-testid="sr-count"]', (e) => e.map((x) => x.textContent + '|' + x.dataset.final)); check('count-up ends on the exact supplied figures (200+ and 3)', counts[0] === '200+|200' && counts[1] === '3|3', counts);
  await shot(page, 'vipprofile-03-panel-closets-who', { quality: 55 });
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'yas-profile'); await settle(page, 800); await imagesReady(page); check('pick YAS Profile 2023: slide 1 / 13', /Slide\s*1\s*\/\s*13/.test(await panelText(page)));
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 600);
  // ---- big screen
  await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900);
  const st = await vip(page, (v, x) => ({ mode: x.presMode, panel: !!document.querySelector('[data-testid="sr-vip-panel"]') && document.querySelector('[data-testid="sr-vip-panel"]').dataset.mode }));
  const box = await wallBox(page); const xs = box.pts.map((p) => p[0]), ys = box.pts.map((p) => p[1]); const fillW = (Math.max(...xs) - Math.min(...xs)) / box.w;
  check('"Present on big screen": camera fronts the wall, panel collapses to the slim presenter bar, the wall fills most of the view width and is fully inside the viewport', st.mode === 'big' && st.panel === 'big' && fillW > 0.75 && Math.min(...xs) >= -2 && Math.max(...xs) <= box.w + 2 && Math.min(...ys) >= -2 && Math.max(...ys) <= box.h + 2, { fillW, xs, ys });
  const pb = await page.locator('[data-testid="sr-vip-panel"]').boundingBox(); check('the presenter bar is slim (<= 170 px tall) and does not cover the screen centre', pb.height <= 170 && pb.y > box.h * 0.6, pb);
  await imagesReady(page); await wait(page, 600); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 500); await shot(page, 'vipprofile-04-big-screen-closets-en', { quality: 58 });
  await page.click('[data-testid="sr-vip-next"]'); await settle(page, 500); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 400); await shot(page, 'vipprofile-05-big-screen-who-en', { quality: 58 });
  // ---- auto-play
  await vip(page, (v) => v.freezeAnim(null)); await page.click('[data-testid="sr-vip-speed"]'); await page.click('[data-testid="sr-vip-speed"]'); check('speed button cycles 1x -> 1.5x -> 2x', (await page.locator('[data-testid="sr-vip-speed"]').innerText()).trim() === '2x');
  await page.click('[data-testid="sr-vip-play"]'); await wait(page, 600); check('play: the explorer is playing, the wall shows the auto-play badge state, the progress bar is present', (await vip(page, (v, x) => x.play.playing)) === true && (await vip(page, (v) => v.state.progress)) >= 0 && (await page.locator('[data-testid="sr-vip-prog"]').count()) === 1);
  const s0 = await vip(page, (v, x) => x.ds.slide); await page.waitForFunction((s) => window.__showroom.explore.explorer.ds.slide !== s, s0, { timeout: 90000 }); check('auto-play advances to the next slide by itself', (await vip(page, (v, x) => x.ds.slide)) !== s0);
  await page.click('[data-testid="sr-vip-play"]'); await wait(page, 300); const sP = await vip(page, (v, x) => x.ds.slide); await wait(page, 3000); check('pause: the slide no longer changes', (await vip(page, (v, x) => x.ds.slide)) === sP && (await vip(page, (v, x) => x.play.playing)) === false);
  await press(page, 'KeyL'); check('L toggles loop (off)', (await vip(page, (v, x) => x.play.loop)) === false); await press(page, 'KeyL');
  await press(page, 'Escape'); await settle(page, 900); check('Esc leaves the big-screen view back to the side panel (not out of the room)', (await vip(page, (v, x) => x.presMode)) === 'panel' && (await page.locator('[data-testid="sr-vip-panel"]').count()) === 1);
  await press(page, 'KeyB'); await settle(page, 700); check('B toggles the big screen from the keyboard', (await vip(page, (v, x) => x.presMode)) === 'big'); await press(page, 'KeyB'); await settle(page, 500);
  // full screen request: headless may refuse; the mode must still be consistent
  await page.click('[data-testid="sr-vip-full"]'); await settle(page, 900); check('"Full screen presentation" switches to the full mode (the browser may refuse the OS full screen; the big view still applies)', ['full', 'big'].includes(await vip(page, (v, x) => x.presMode)));
  await press(page, 'Escape'); await settle(page, 700);
  check('flows: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function seq(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }); const page = o.page; await mockProjects(page); await enterVip(page);
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 800); await imagesReady(page);
  await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await wait(page, 800);
  // a transition: slide 4 (values) -> 5 (milestones), frames at 0.12 / 0.3 / 0.55 / 1.4 s
  await vip(page, (v, x) => { x.setStation(3); }); await settle(page, 600); await vip(page, (v) => v.freezeAnim(9)); await wait(page, 300);
  await vip(page, (v, x) => { x.setStation(5); }); await wait(page, 150);
  let i = 0; for (const t of [0.1, 0.3, 0.55, 1.6]) await frame(page, `vipprofile-seq-a${++i}-transition-values-to-milestones-t${String(t).replace('.', '')}`, t);
  await vip(page, (v, x) => x.setStation(13)); await wait(page, 200); i = 0; for (const t of [0.15, 0.7, 1.2, 2.6]) await frame(page, `vipprofile-seq-b${++i}-capacity-stats-t${String(t).replace('.', '')}`, t);
  await vip(page, (v, x) => x.setStation(18)); await wait(page, 200); await imagesReady(page); i = 0; for (const t of [0.2, 0.6, 1.2, 8]) await frame(page, `vipprofile-seq-c${++i}-durrat-dar-duo-t${String(t).replace('.', '')}`, t);
  check('seq: captured 12 frames', true); await o.ctx.close();
}

async function ar(b) {
  const o = await L.openShowroom(b, { url: '/ar/yas-bloom', query: MED, viewport: { width: 1280, height: 720 } }); const page = o.page; await mockProjects(page); await enterVip(page);
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 800); await imagesReady(page); await wait(page, 1500);
  check('AR: the picker lists the Arabic deck titles', /ملف/.test(await page.locator('[data-testid="sr-vip-deck-select"]').innerText()));
  await shot(page, 'vipprofile-10-ar-panel-closets-cover', { quality: 55 });
  await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await imagesReady(page); await wait(page, 600); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 500); await shot(page, 'vipprofile-11-ar-big-screen-cover', { quality: 58 });
  await page.click('[data-testid="sr-vip-next"]'); await settle(page, 500); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 400); await shot(page, 'vipprofile-12-ar-big-screen-who', { quality: 58 });
  check('AR: the presenter bar is rtl and the Arabic labels show', (await page.locator('[data-testid="sr-vip-panel"]').getAttribute('dir')) === 'rtl' && /عرض|تشغيل/.test(await page.locator('[data-testid="sr-vip-presenter"]').innerText()));
  await vip(page, (v, x) => { x.setStation(5); }); await settle(page, 400); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 400); await shot(page, 'vipprofile-13-ar-big-screen-milestones', { quality: 58 });
  check('AR: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function mobile(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 390, height: 844 }, mobile: true }); const page = o.page; await mockProjects(page); await enterVip(page, true);
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 900); await imagesReady(page); await wait(page, 1500);
  const r = await page.locator('[data-testid="sr-vip-panel"]').boundingBox(); check('mobile: the panel with the new presenter controls is still a bottom sheet (<= 62% height)', r.height <= 844 * 0.62 && r.y + r.height > 800, r);
  await shot(page, 'vipprofile-20-mobile-panel', { quality: 55 });
  await page.tap('[data-testid="sr-vip-big"]'); await settle(page, 900); await imagesReady(page); await wait(page, 500);
  { const box = await wallBox(page), xs = box.pts.map((p) => p[0]); check('mobile: on a portrait phone the big view cannot show the whole wall in the room (it shows the centre); Reading mode is the legible way', xs[0] < 0 && xs[1] > box.w); }
  const pb = await page.locator('[data-testid="sr-vip-panel"]').boundingBox(); check('mobile: the presenter bar is a slim strip at the bottom (<= 240 px) with 44 px controls', pb.height <= 240 && (await page.locator('[data-testid="sr-vip-play"]').boundingBox()).height >= 43, pb);
  await vip(page, (v) => v.freezeAnim(3)); await wait(page, 500); await shot(page, 'vipprofile-21-mobile-big-screen', { quality: 55 });
  await page.tap('[data-testid="sr-vip-play"]'); await wait(page, 800); check('mobile: play by tap', (await vip(page, (v, x) => x.play.playing)) === true); await page.tap('[data-testid="sr-vip-play"]');
  await page.tap('[data-testid="sr-vip-next"]'); await settle(page, 500); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 400); await shot(page, 'vipprofile-22-mobile-big-screen-who', { quality: 55 });
  await page.tap('[data-testid="sr-vip-read"]'); await wait(page, 900); const rd = await page.locator('[data-testid="sr-vip-reader"]').boundingBox(), fs = await page.$eval('[data-testid="sr-vip-reader"] .sr-vip-bullets li', (e) => parseFloat(getComputedStyle(e).fontSize)); check('mobile Reading mode: a full-screen reader opens (covers the viewport) with bullets >= 20 px and 52 px Previous / Next', rd.width >= 389 && rd.height >= 843 && fs >= 20 && (await page.locator('[data-testid="sr-vip-reader-next"]').boundingBox()).height >= 51, { rd, fs }); await shot(page, 'vipprofile-23-mobile-reading-mode', { quality: 58 }); await page.tap('[data-testid="sr-vip-reader-next"]'); await wait(page, 500); await shot(page, 'vipprofile-24-mobile-reading-next', { quality: 58 }); await page.tap('[data-testid="sr-vip-reader-exit"]'); await wait(page, 700);
  check('mobile: no horizontal overflow, no page errors', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) && o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function reduced(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 1100, height: 640 }, reduced: true }); const page = o.page; await mockProjects(page);
  await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 }); await dismissCoach(page); await goto(page, VIP_STAND); await press(page, 'KeyE'); await page.waitForSelector('[data-testid="sr-vip-panel"]'); await settle(page, 400);
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 400); await press(page, 'Digit2'); await settle(page, 300);
  check('reduced motion: the slide is marked motion off, the count-up shows the final figures at once (no animation)', (await page.locator('[data-testid="sr-vip-slide"]').getAttribute('data-motion')) === 'off' && (await page.$$eval('[data-testid="sr-count"]', (e) => e.map((x) => x.textContent).join(','))) === '200+,3');
  check('reduced motion: the wall uses the "off" level (no transition, no stagger, no Ken Burns)', JSON.stringify(await vip(page, (v) => v.state.motion)) === JSON.stringify({ on: false, transition: 0, stagger: false, countUp: false, kenBurns: false, hz: 0 }));
  await press(page, 'Digit3'); await wait(page, 200); check('reduced motion: a slide swap is instant (no previous-frame cross-fade kept)', (await vip(page, (v) => v.state.prev)) === null);
  check('reduced: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function advisor(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page); await L.enterExplore(page); await dismissCoach(page);
  const p = await page.evaluate(() => { const it = window.__showroom.engine.staff.item('vip'); return it.def.at; }); await goto(page, [p[0] + 1.8, p[1] - 0.2, Math.atan2(-(p[0] - (p[0] + 1.8)), -(p[1] - (p[1] - 0.2))), 0.05]); await wait(page, 1500);
  await page.keyboard.press('KeyT'); await page.waitForSelector('[data-testid="sr-chat-input"]', { timeout: 30000 }); await wait(page, 1200);
  await page.fill('[data-testid="sr-chat-input"]', 'Please present the company profile'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__showroom.explore.explorer.focus && window.__showroom.explore.explorer.focus.kind === 'vip', null, { timeout: 60000 });
  await wait(page, 2500); const s = await vip(page, (v, x) => ({ deck: x.ds.deckId, mode: x.presMode, playing: x.play.playing }));
  check('the VIP adviser, asked "present the company profile", puts The Closets profile on the big screen and starts auto-play', s.deck === 'closets-profile' && s.mode === 'big' && s.playing === true, s);
  await shot(page, 'vipprofile-30-adviser-presenting', { quality: 55 });
  check('advisor: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

const POSES = { standing: { pos: [0, 1.7, -30.2], look: [0, 2.0, -35.34], fov: 54 }, doorway: { pos: [0, 1.7, -28.9], look: [0, 2.0, -35.34], fov: 54 }, seated: { pos: [0.7, 1.15, -31.7], look: [0, 2.0, -35.34], fov: 54 } };
/** LEGIBILITY: every generic slide measured with the real font metrics, then the screen cropped from the standing, seated and doorway positions and in Reading mode: text height in screen pixels */
async function legible(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }); const page = o.page; await mockProjects(page); await enterVip(page);
  for (const id of ['closets-profile', 'yas-profile']) {
    await page.selectOption('[data-testid="sr-vip-deck-select"]', id); await settle(page, 700); const n = await vip(page, (v) => v.state.deck.slides.length); let worst = { under: 0, overflow: 0, minBody: 99, minTitle: 999, narrow: 0 }, drawn = 0;
    for (let i = 0; i < n; i++) {
      const r = await vip(page, (v, x, k) => v.legibility(k), i); if (!r) continue; drawn++; const ms = r.metrics.filter((m) => m.s && m.s.trim());
      for (const m of ms) { if (m.weight < 500) worst.under++; if (m.size < 22) worst.under++; if (m.k === 'para' && m.size > 22 && m.y1 > r.h - 52 - 70 + 10) worst.overflow++; if (m.k === 'para' && m.maxW && (m.align === 'left' ? m.x < 66 || m.x + m.maxW > r.w - 66 : m.align === 'right' ? m.x - m.maxW < 66 || m.x > r.w - 66 : false)) worst.narrow++; }
      const t = ms.find((m) => m.weight >= 800 && m.size >= 60); if (t) worst.minTitle = Math.min(worst.minTitle, t.size / r.h); const bodies = ms.filter((m) => m.k === 'para' && m.size >= 28 && m.size < 60); if (bodies.length) worst.minBody = Math.min(worst.minBody, Math.min(...bodies.map((m) => m.size)) / r.h);
    }
    check(`${id}: all ${drawn} generic slides measured with the real fonts: no text under 22 px or weight < 500, no body overflow into the footer, margins >= 66 px, title >= 7% and body >= 3.4% of the screen height`, worst.under === 0 && worst.overflow === 0 && worst.narrow === 0 && worst.minTitle >= 0.07 && worst.minBody >= 0.0345, worst);
  }
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 700); await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900);
  await vip(page, (v, x) => x.setStation(5)); await settle(page, 600); await imagesReady(page);
  for (const [name, pose] of Object.entries(POSES)) {
    await vip(page, (v, x, p) => { x.flyTo(p, true); }, pose); await wait(page, 600); await vip(page, (v) => v.freezeAnim(9)); await wait(page, 700); await setHud(page, false); await wait(page, 300);
    const box = await wallBox(page), xs = box.pts.map((p) => p[0]), ys = box.pts.map((p) => p[1]), wpx = Math.max(...xs) - Math.min(...xs), scale = wpx / 1536, clip = { x: Math.max(0, Math.min(...xs)), y: Math.max(0, Math.min(...ys)), width: Math.min(box.w, Math.max(...xs)) - Math.max(0, Math.min(...xs)), height: Math.min(box.h, Math.max(...ys)) - Math.max(0, Math.min(...ys)) };
    await shot(page, `vipprofile-40-crop-${name}`, { quality: 78, clip }); await setHud(page, true);
    const bodyPx = 32 * scale, titlePx = 66 * scale; check(`${name}: the wall is ${Math.round(wpx)} px wide on a 1280 px viewport; body text ${bodyPx.toFixed(1)} px, title ${titlePx.toFixed(1)} px (must be >= 14 px body, >= 28 px title)`, bodyPx >= 14 && titlePx >= 28, { wpx, bodyPx, titlePx });
  }
  await vip(page, (v, x) => x.setPresentMode('panel')); await settle(page, 800); await press(page, 'KeyZ'); await settle(page, 1000); await vip(page, (v) => v.freezeAnim(9)); await wait(page, 700);
  { await setHud(page, false); await wait(page, 300); const box = await wallBox(page), xs = box.pts.map((p) => p[0]), ys = box.pts.map((p) => p[1]), wpx = Math.max(...xs) - Math.min(...xs), hpx = Math.max(...ys) - Math.min(...ys);
    check('Reading mode (key Z): the wall fills at least 94% of the viewport width and is fully visible; body text >= 24 px on the 1280 px viewport', (await vip(page, (v, x) => x.presMode)) === 'read' && wpx / box.w >= 0.97 && Math.min(...xs) >= -4 && Math.max(...xs) <= box.w + 4 && hpx <= box.h + 4 && 32 * wpx / 1536 >= 24, { wpx, hpx, fill: wpx / box.w });
    await shot(page, 'vipprofile-41-reading-mode', { quality: 78 }); await setHud(page, true); }
  check('Reading mode: only essential controls remain (exit, previous, next); the panel is slim', (await page.locator('[data-testid="sr-vip-exit-present"]').count()) === 1 && (await page.locator('[data-testid="sr-vip-play"]').isVisible()) === false && (await page.locator('[data-testid="sr-vip-panel"]').boundingBox()).height <= 150);
  await press(page, 'KeyZ'); await settle(page, 700); check('Z again returns to the side panel', (await vip(page, (v, x) => x.presMode)) === 'panel');
  check('legible: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

(async () => {
  const b = await L.launch(); const only = process.argv[2];
  const run = async (name, fn) => { if (only && only !== name) return; try { await fn(b); } catch (e) { check(`suite "${name}" ran to the end`, false, String(e && e.message).slice(0, 400)); } };
  try { await run('flows', flows); await run('seq', seq); await run('ar', ar); await run('mobile', mobile); await run('reduced', reduced); await run('advisor', advisor); await run('legible', legible); } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); bad.forEach((r) => console.log('FAILED:', r.name, JSON.stringify(r.detail)));
  process.exit(bad.length ? 1 : 0);
})();
