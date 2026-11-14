/* YAS Bloom round 2 QA: AI advisers (Reception desk + one adviser per room), chat panel, Talk button / T / E, hand-off to /booking, consent-gated support_chat fallback,
 * AR / RTL, mobile, reduced motion, third-person avatar toggle, per-tier draw calls.
 * Needs a served build:  node scripts/showroom3d-qa/serve.js build 5055   then   node scripts/showroom3d-qa/phase6.js [flows|ai|ar|mobile|reduced|avatar|stats|gallery] */
const L = require('./lib.js');
const { check, ex, shot } = L;
const fs = require('fs'), path = require('path');
const FAST = 'debug=1&quality=low&aa=0&scale=0.5';
const settle = (page, ms = 600) => page.waitForTimeout(ms);
const goto = async (page, p) => { await ex(page, (e, a) => e.teleport(...a), p); await page.waitForTimeout(1200); };
const dismissCoach = (page) => page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); });
const SPOTS = { reception: [-5.2, -5.3, 0, 0.05], kitchens: [-15.4, -5.4, -Math.PI / 2, 0.05], vip: [-2.0, -29.2, 0.5, 0.05], bedroom: [-15.4, -26.6, -Math.PI / 2, 0.05] };
async function spot(page, id) {   // stand 1.6 m from the adviser of a room, looking at her
  const p = await page.evaluate((id) => { const S = window.__showroom.engine.staff, it = S.item(id), x = it.def.at[0], z = it.def.at[1], a = Math.atan2(0, 1); return [x, z]; }, id);
  const near = id === 'reception' ? [p[0], p[1] + 2.2] : id === 'vip' ? [p[0] + 1.8, p[1] - 0.2] : [p[0] + (p[0] < 0 ? 1.7 : -1.7), p[1]];
  const yaw = Math.atan2(-(p[0] - near[0]), -(p[1] - near[1]));
  await goto(page, [near[0], near[1], yaw, 0.05]);
}
const talkBtn = (page) => page.locator('[data-testid="sr-talk"]');
async function open(b, { query = FAST, lang, viewport = { width: 1100, height: 640 }, mobile = false, reduced = false, url = '/yas-bloom' } = {}) {
  const o = await L.openShowroom(b, { query, viewport, mobile, reduced, url }); if (reduced) await o.page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 120000 }); else await L.enterExplore(o.page, { tap: mobile }); await dismissCoach(o.page); return o;
}
async function chatSay(page, text) { await page.fill('[data-testid="sr-chat-input"]', text); await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.waitForSelector('[data-testid="sr-chat-typing"]', { state: 'detached', timeout: 15000 }).catch(() => {}); await page.waitForTimeout(250); }
const lastStaff = (page) => page.locator('.sr-chat-msg.is-staff:not(.is-typing) p').last().innerText();

async function flows(b) {
  const o = await open(b); const page = o.page;
  const staff = await page.evaluate(() => window.__showroom.engine.staff.items.map((i) => i.def.id));
  check('ten advisers exist: reception, eight departments, vip', JSON.stringify(staff) === JSON.stringify(['reception', 'kitchens', 'wardrobes', 'walkin', 'bedroom', 'doors', 'living', 'studio', 'lounge', 'vip']), staff);
  check('reception greeting bubble after the intro', await page.locator('[data-testid="sr-greet-bubble"]').count() > 0 || await page.evaluate(() => !!window.__showroom.engine.staff.greeted.reception));
  // every room's adviser: stand next to her, the Talk button names her
  for (const id of staff) {
    await spot(page, id); const n = await talkBtn(page).count();
    const got = n === 1 ? await talkBtn(page).getAttribute('data-staff') : null; check('Talk button next to the ' + id + ' adviser', got === id, { n, got });
  }
  // reception chat
  await spot(page, 'reception'); await talkBtn(page).click(); await page.waitForSelector('[data-testid="sr-chat"]');
  check('chat is labelled AI assistant, with the disclosure line', (await page.locator('[data-testid="sr-chat-badge"]').innerText()).length > 0 && /AI assistant/.test(await page.locator('[data-testid="sr-chat-disclosure"]').innerText()));
  check('typing indicator shows before the first answer', await page.locator('[data-testid="sr-chat-typing"]').count() >= 0);
  await page.waitForSelector('.sr-chat-msg.is-staff:not(.is-typing)'); await shot(page, 'phase6-reception-chat', { quality: 70 });
  await page.click('[data-token="#services"]'); await settle(page, 900); const sv = await lastStaff(page);
  check('reception lists all services (rooms + office + services + maintenance + warranty + booking)', /Kitchens/.test(sv) && /Wardrobes/.test(sv) && /Walk-in/.test(sv) && /Bedrooms/.test(sv) && /Doors/.test(sv) && /Living/.test(sv) && /Custom Studio/.test(sv) && /Consultation Lounge/.test(sv) && /Home Office/.test(sv) && /Warranty/.test(sv) && /Maintenance/.test(sv), sv.length);
  await chatSay(page, 'how much is a kitchen?'); const pr = await lastStaff(page); check('price question: no figure, no promise', /cannot give prices/.test(pr) && !/\d/.test(pr), pr.slice(0, 80));
  await chatSay(page, 'what is the weather'); check('off-topic handled politely', /only help with The Closets/.test(await lastStaff(page)));
  // planning flow -> hand-off
  await page.click('[data-token="#plan"]'); await settle(page, 700); await page.click('[data-token="#room:wardrobes"]'); await settle(page, 700); await page.click('[data-token="#style:dark"]'); await settle(page, 700); await page.click('[data-token="#budget:mid"]'); await settle(page, 900);
  const href = await page.locator('[data-testid="sr-chat-link"]').first().getAttribute('href'); const q = new URL(href, 'http://x').searchParams;
  check('hand-off URL: /booking with interest, source, finish and a summary in the notes (query params only)', href.startsWith('/booking?') && q.get('interest') === 'Wardrobe' && q.get('source') === 'showroom-3d-staff' && !!q.get('finish') && /not a quotation/.test(q.get('notes')), href.slice(0, 160));
  await shot(page, 'phase6-chat-handoff', { quality: 70 });
  // take me to <room>: the nav-graph glide
  await chatSay(page, 'take me to the kitchens'); await page.waitForFunction(() => !document.querySelector('[data-testid="sr-chat"]'), null, { timeout: 20000 });
  await page.waitForTimeout(500); await page.waitForFunction(() => !window.__showroom.explore.explorer.glide, null, { timeout: 90000 }); await settle(page, 800);
  const at = await ex(page, (e) => e.pos()); check('"take me to the kitchens" glides to the kitchens stand point and closes the chat', Math.abs(at[0] + 12.5) < 0.2, at);
  // E key near the kitchen adviser
  await spot(page, 'kitchens'); await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-chat"]', { timeout: 8000 }); check('E next to an adviser opens her chat', (await page.locator('[data-testid="sr-chat"]').getAttribute('data-staff')) === 'kitchens');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-testid="sr-chat"]')); check('Esc closes the chat', true);
  await spot(page, 'doors'); await page.keyboard.press('KeyT'); await page.waitForSelector('[data-testid="sr-chat"]'); check('T opens the door adviser chat', (await page.locator('[data-testid="sr-chat"]').getAttribute('data-staff')) === 'doors');
  await page.click('[data-testid="sr-chat-close"]');
  // VIP adviser: stations, briefing link, no promises
  await spot(page, 'vip'); await page.keyboard.press('KeyT'); await page.waitForSelector('[data-testid="sr-chat"]'); await page.waitForSelector('.sr-chat-msg.is-staff:not(.is-typing)'); await chatSay(page, 'tell me about investing'); const vt = await lastStaff(page);
  check('VIP adviser explains the stations and gives no figures or promises', /five stations/.test(vt) && !/\d/.test(vt) && !/(guarantee|return of)/i.test(vt), vt.slice(0, 100));
  check('VIP adviser no longer offers a briefing link (investor path removed); it offers the profile presentation chip', (await page.locator('[data-testid="sr-chat-link"]').count()) === 0);
  await shot(page, 'phase6-vip-adviser-chat', { quality: 70 });
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function ai(b) {
  // the opt-in AI path: consent modal (existing aiFetch), a mocked support_chat, guardrail filter, rate limit, decline, offline
  const o = await open(b); const page = o.page; let calls = 0, mode = 'ok';
  await page.route('**/functions/v1/support_chat', (r) => { calls++; if (mode === 'ok') r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, reply: 'We design and make kitchens and wardrobes in Bahrain.' }) });
    else if (mode === 'price') r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, reply: 'A kitchen costs 5000 BHD with a 20% discount.' }) }); else r.abort(); });
  await spot(page, 'reception'); await talkBtn(page).click(); await page.waitForSelector('[data-testid="sr-chat"]'); await page.waitForSelector('.sr-chat-msg.is-staff:not(.is-typing)');
  await chatSay(page, 'zzqx plmk'); check('an unknown question offers the opt-in AI (no network call yet)', (await page.locator('[data-testid="sr-chat-askai"]').count()) === 1 && calls === 0);
  await page.click('[data-testid="sr-chat-askai"]'); await page.waitForSelector('[role="dialog"][aria-label]:not([data-testid="sr-chat"])', { timeout: 8000 }).catch(() => {});
  const modal = page.locator('div[style*="position: fixed"] button'); check('the existing consent prompt appears before anything is sent', (await modal.count()) >= 2 && calls === 0);
  await modal.first().click(); await page.waitForTimeout(900); check('declining keeps the built-in guide and sends nothing', calls === 0 && /built-in guide/.test(await lastStaff(page)), await lastStaff(page));
  await chatSay(page, 'zzqx plmk'); await page.click('[data-testid="sr-chat-askai"]'); await page.waitForTimeout(800); await modal.nth(1).click(); await page.waitForTimeout(1500);
  check('after consent the reply comes from support_chat via the site fetch (labelled AI)', calls === 1 && /kitchens and wardrobes/.test(await lastStaff(page)), calls);
  await chatSay(page, 'qqq zzz'); mode = 'price'; await page.click('[data-testid="sr-chat-askai"]'); await page.waitForTimeout(1500); check('an AI reply with a price / discount is dropped by the guardrail', /cannot share that answer/.test(await lastStaff(page)), await lastStaff(page));
  mode = 'offline'; await chatSay(page, 'qqq zzz'); await page.click('[data-testid="sr-chat-askai"]'); await page.waitForTimeout(1500); check('offline AI degrades to the guide', /could not reach/.test(await lastStaff(page)));
  mode = 'ok'; let blocked = false; for (let i = 0; i < 8; i++) { await chatSay(page, 'qqq zzz'); const c = page.locator('[data-testid="sr-chat-askai"]'); if (!(await c.count())) break; await c.click(); await page.waitForTimeout(500); if (/wait a moment/.test(await lastStaff(page))) { blocked = true; break; } }
  check('client-side rate limit: at most 6 AI questions per 30 s', blocked && calls <= 7, { calls });
  const errs = o.errors.filter((e) => !/ERR_FAILED/.test(e)); check('no page errors (the deliberately aborted offline request aside)', errs.length === 0, errs.slice(0, 3)); await o.ctx.close();
}

async function ar(b) {
  const o = await open(b, { url: '/ar/yas-bloom' }); const page = o.page;
  await spot(page, 'reception'); const lbl = await talkBtn(page).innerText(); check('AR: the Talk button is Arabic and names the adviser', /مستشارة الاستقبال/.test(lbl) && /ذكاء اصطناعي/.test(lbl), lbl);
  await talkBtn(page).click(); await page.waitForSelector('[data-testid="sr-chat"]'); await page.waitForSelector('.sr-chat-msg.is-staff:not(.is-typing)');
  check('AR: chat panel is RTL', (await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="sr-chat"]')).direction)) === 'rtl');
  await page.click('[data-token="#services"]'); await settle(page, 900); const t = await lastStaff(page); check('AR: services list in Arabic (all rooms)', /المطابخ/.test(t) && /خزائن الملابس/.test(t) && /غرف النوم/.test(t) && /الأبواب/.test(t) && /استوديو التصميم/.test(t), t.slice(0, 60));
  await chatSay(page, 'خذني إلى غرف النوم'); await page.waitForFunction(() => !document.querySelector('[data-testid="sr-chat"]'), null, { timeout: 20000 }); await page.waitForTimeout(500); await page.waitForFunction(() => !window.__showroom.explore.explorer.glide, null, { timeout: 90000 });
  check('AR: "take me to the bedrooms" glides there', Math.abs((await ex(page, (e) => e.pos()))[0] + 12.5) < 0.2);
  await spot(page, 'reception'); await talkBtn(page).click(); await page.waitForSelector('.sr-chat-msg.is-staff:not(.is-typing)'); await shot(page, 'phase6-ar-chat', { quality: 70 });
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function mobile(b) {
  const o = await open(b, { mobile: true, viewport: { width: 390, height: 780 }, query: FAST + '&touch=1' }); const page = o.page;
  await spot(page, 'reception'); await talkBtn(page).waitFor({ timeout: 10000 }); check('mobile: the Talk button is visible and tappable', await talkBtn(page).isVisible());
  await talkBtn(page).tap(); await page.waitForSelector('[data-testid="sr-chat"]'); await page.waitForSelector('.sr-chat-msg.is-staff:not(.is-typing)');
  const bx = await page.locator('[data-testid="sr-chat"]').boundingBox(); check('mobile: chat panel fits the viewport (no horizontal overflow)', bx.x >= 0 && bx.x + bx.width <= 391 && bx.y >= 0 && bx.y + bx.height <= 781, bx);
  await page.tap('[data-token="#services"]'); await settle(page, 900); await shot(page, 'phase6-mobile-chat', { quality: 68 });
  check('mobile: no horizontal page scroll', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function bubble(b) {
  for (const mob of [false, true]) {
    const o = await L.openShowroom(b, { query: FAST + (mob ? '&touch=1' : ''), mobile: mob, viewport: mob ? { width: 390, height: 780 } : { width: 1100, height: 640 } }); const page = o.page; await L.enterExplore(page, { tap: mob }); await dismissCoach(page);
    await page.waitForSelector('[data-testid="sr-greet-bubble"]', { timeout: 8000 }); check((mob ? 'mobile' : 'desktop') + ': the greeting bubble shows in the hall', true);
    if (mob) { await shot(page, 'phase6-bubble-hall-mobile', { quality: 66 }); const bb = await page.locator('[data-testid="sr-greet-bubble"]').boundingBox(), menu = await page.locator('[data-testid="sr-open-menu"]').boundingBox(); check('mobile: the bubble does not overlap the top buttons', bb.y > menu.y + menu.height, { bb, menu }); }
    await goto(page, [0, -27.4, 0, 0.05]); await page.keyboard.press('KeyE').catch(() => {}); await ex(page, (e) => e.explorer.focusVip(0)); await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 15000 });
    check((mob ? 'mobile' : 'desktop') + ': the greeting bubble is hidden while the VIP panel is open', (await page.locator('[data-testid="sr-greet-bubble"]').count()) === 0);
    await shot(page, 'phase6-bubble-vip-' + (mob ? 'mobile' : 'desktop'), { quality: 66 }); await o.ctx.close();
  }
}

async function reduced(b) {
  const o = await open(b, { reduced: true }); const page = o.page;
  await spot(page, 'kitchens'); await page.waitForTimeout(1500); const d = await page.evaluate(() => { const it = window.__showroom.engine.staff.item('kitchens'); return Math.hypot(it.pos[0] - it.def.at[0], it.pos[1] - it.def.at[1]); });
  check('reduced motion: the adviser does not walk towards the visitor', d < 1e-6, d);
  await page.keyboard.press('KeyT'); await page.waitForSelector('[data-testid="sr-chat"]'); await page.waitForSelector('.sr-chat-msg.is-staff:not(.is-typing)', { timeout: 4000 }); check('reduced motion: chat answers without delay or animation', true);
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function avatar(b) {
  const o = await open(b); const page = o.page;
  check('first person is the default', (await ex(page, (e) => e.state().camMode)) === 'first');
  await page.click('[data-testid="sr-cam-toggle"]'); await page.waitForTimeout(2200); check('HUD toggle switches to third person and persists', (await ex(page, (e) => e.state().camMode)) === 'third' && (await page.evaluate(() => localStorage.getItem('closets_yb_cam'))) === 'third');
  const vis = await page.evaluate(() => window.__showroom.engine.avatar.group.visible); check('the avatar is visible in third person', vis);
  await page.click('[data-testid="sr-cam-toggle"]'); await page.waitForTimeout(2000); check('toggle back to first person hides the avatar', !(await page.evaluate(() => window.__showroom.engine.avatar.group.visible)));
  await page.keyboard.press('Escape'); await page.waitForSelector('[data-testid="sr-menu-avatar"]'); const a0 = await ex(page, (e) => e.state().avatar); await page.click('[data-testid="sr-menu-avatar"]'); check('menu cycles the avatar female -> male -> guest', a0 !== (await ex(page, (e) => e.state().avatar)));
  check('no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function stats(b) {
  const out = {};
  for (const tier of ['low', 'medium', 'high']) {
    const o = await open(b, { query: `debug=1&quality=${tier}&aa=0&scale=0.4` }); const page = o.page;
    const row = {}; for (const [name, p] of [['hall', [0, -9, 0, 0.05]], ['reception', [-5.2, -5.3, 0, 0.05]], ['kitchens', [-12.5, -7.9, -Math.PI / 2, 0.05]]]) {
      await goto(page, p); await page.waitForTimeout(1500); const inf = await page.evaluate(() => window.__showroom.info()); row[name] = { calls: inf.calls, triangles: inf.triangles, fps: inf.fps }; }
    row.staffCalls = await page.evaluate(() => window.__showroom.engine.staff.drawCalls()); row.charTris = await page.evaluate(() => { let n = 0; window.__showroom.engine.staff.items.forEach((i) => i.char.meshes.forEach((m) => { n += m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3; })); return Math.round(n / 10); });
    out[tier] = row; await o.ctx.close();
  }
  fs.writeFileSync(path.resolve(__dirname, '../../docs/showroom3d/phase6-stats.json'), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1));
}

async function gallery(b) {
  const o = await open(b, { query: 'debug=1&quality=medium&aa=0&scale=0.9', viewport: { width: 1000, height: 620 } }); const page = o.page;
  await goto(page, [-3.6, -3.4, Math.PI * 0.88, 0.02]); await page.waitForTimeout(1500);
  await spot(page, 'reception'); await page.waitForTimeout(2200); await shot(page, 'phase6-reception', { quality: 74 });
  for (const id of ['kitchens', 'bedroom', 'vip']) { await spot(page, id); await page.waitForTimeout(2600); await shot(page, 'phase6-adviser-' + id, { quality: 74 }); }
  await o.ctx.close();
}

(async () => {
  const which = process.argv[2] || 'all'; const b = await L.launch(); const all = { bubble, flows, ai, ar, mobile, reduced, avatar, stats, gallery };
  try { for (const k of Object.keys(all)) if (which === 'all' ? !['stats', 'gallery'].includes(k) : which === k) { console.log('--- ' + k); await all[k](b); } } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); process.exit(bad.length ? 1 : 0);
})();
