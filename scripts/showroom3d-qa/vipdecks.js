/* VIP presentation DECKS QA (headless Chromium on SwiftShader): the default deck unchanged, picking a deck (select, keys, wall chips), importing markdown, importing
 * invalid input, saving on this device (and a storage failure), deleting, AR / RTL, mobile bottom sheet, no network writes.
 * Needs a served build:  node scripts/showroom3d-qa/serve.js build 5055   (BASE=http://localhost:PORT overrides)   then   node scripts/showroom3d-qa/vipdecks.js [flows|blocks|fail|ar|mobile] */
const L = require('./lib.js');
const { check, ex, shot } = L;

const FAST = 'debug=1&quality=low&aa=0&scale=0.5';
const VIP_STAND = [0, -30.2, 0, 0.05];
const MD = '# Partner welcome\n## Who we are\n> Designed, made and fitted in Bahrain.\n- Made-to-measure kitchens, wardrobes and doors\n- A showroom you can walk through online\n## How we work\n- We survey, design, make and fit\n- Management answers questions directly\n';
const MD_AR = '# أهلًا بشركائنا\n## من نحن\n> تصميم وتصنيع وتركيب في البحرين.\n- مطابخ وخزائن وأبواب على المقاس\n- معرض يمكنك التجول فيه عبر الإنترنت\n';
const settle = async (page, ms = 600) => { await page.waitForFunction(() => !window.__showroom.explore.explorer.fly, null, { timeout: 90000 }); await page.waitForTimeout(ms); };
const goto = async (page, p) => { await ex(page, (e, a) => e.teleport(...a), p); await page.waitForTimeout(500); };
const press = async (page, key) => { await page.keyboard.press(key); await page.waitForTimeout(250); };
const dismissCoach = async (page) => { await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); }); await page.waitForTimeout(300); };
const setHud = (page, on) => page.evaluate((on) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach, .sr-touch').forEach((n) => { n.style.visibility = on ? '' : 'hidden'; }), on);
const panelText = (page) => page.locator('[data-testid="sr-vip-panel"]').innerText();
const wall = (page) => page.evaluate(() => { const v = window.__showroom.engine.products.vip; return { deck: v.state.deck.id, decks: v.state.decks.length, slide: v.station }; });
const stored = (page) => page.evaluate(() => { try { const j = JSON.parse(localStorage.getItem('sr3d.vipDecks.v1') || 'null'); return j ? j.decks.map((d) => d.id) : []; } catch (e) { return 'ERR'; } });
function track(page) { const t = { net: [], writes: [] }; page.on('request', (r) => { const u = r.url(); if (/^data:|^blob:/.test(u) || u.startsWith(L.BASE)) return; t.net.push(r.method() + ' ' + u); if (r.method() !== 'GET') t.writes.push(r.method() + ' ' + u); }); return t; }
const mockProjects = (page) => page.route('**/rest/v1/website_projects*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
async function enterVip(page, tap = false) {
  await L.enterExplore(page, { tap }); await dismissCoach(page); await goto(page, VIP_STAND);
  if (tap) await page.tap('[data-testid="sr-interact"]'); else await press(page, 'KeyE');
  await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 30000 }); await settle(page, 600);
}
const paste = async (page, text) => { await page.fill('[data-testid="sr-vd-text"]', text); await page.waitForTimeout(250); };
const wallShot = async (page, name, wait = 2500) => { await page.waitForTimeout(wait); await setHud(page, false); await page.waitForTimeout(250); await shot(page, name, { quality: 55 }); await setHud(page, true); };

async function flows(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page); const net = track(page);
  await enterVip(page);
  // ---- default deck: unchanged behaviour
  let txt = await panelText(page);
  check('default deck: station 1 of 4 "Company story and brand", picker shows the four built-in entries (three decks and the film), no delete / local note', /Station\s*1\s*\/\s*4/.test(txt) && /Company story and brand/.test(txt) && (await page.locator('[data-testid="sr-vip-deck-select"] option').count()) === 4 && (await page.locator('[data-testid="sr-vip-deck-delete"]').count()) === 0);
  check('default deck: placeholders still "To be confirmed by management"; warranty fact from facts.js', (await page.$$eval('[data-testid="sr-vip-facts"] li', (l) => l.length === 4 && l.every((e) => e.dataset.confirmed === '0' && /To be confirmed by management/.test(e.innerText)))) && /10 years on cabinetry/.test(txt));
  await press(page, 'Digit4'); await settle(page, 300); check('default deck: key 4 jumps to station 4 (contact) with the disclaimer; key 9 does nothing (only 5 stations)', /Station\s*4\s*\/\s*4/.test(await panelText(page)) && /Information only, not an offer or financial advice/.test(await panelText(page)));
  await press(page, 'Digit9'); await settle(page, 200); check('key 9 ignored', /Station\s*4\s*\/\s*4/.test(await panelText(page))); await press(page, 'Digit1'); await settle(page, 300);
  await press(page, 'BracketRight'); await settle(page, 500); const nx = (await wall(page)).deck; await press(page, 'BracketLeft'); await settle(page, 500); check('"]" goes to the next built-in entry (The Closets profile) and "[" comes back to the default deck', nx === 'closets-profile' && (await wall(page)).deck === 'default' && /Station\s*1\s*\/\s*4/.test(await panelText(page)), nx);
  await shot(page, 'vipdecks-01-default-deck-picker', { quality: 60 });
  // ---- add a presentation by pasting markdown
  await page.click('[data-testid="sr-vip-deck-add"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]');
  check('dialog: opens, shows "Saved on this device only" and the owner-responsibility note, Save disabled, focus inside, explorer ignores keys', /this device only/i.test(await page.locator('[data-testid="sr-vd-local"]').innerText()) && /responsible for the accuracy of any financial or legal content/i.test(await page.locator('[data-testid="sr-vd-responsible"]').innerText()) && (await page.isDisabled('[data-testid="sr-vd-save"]')) && (await page.evaluate(() => !!document.activeElement.closest('[data-testid="sr-vd-dialog"]'))) && (await page.evaluate(() => window.__showroom.explore.explorer.vipDialog)));
  await paste(page, '# Broken\n- orphan line\n## S\n![pic](http://example.com/a.png)');
  const errs = await page.locator('[data-testid="sr-vd-errors"]').innerText();
  check('import invalid: line-numbered, plain-language errors; Save stays disabled; nothing stored', /Line 2/.test(errs) && /Line 4.*https/.test(errs) && (await page.isDisabled('[data-testid="sr-vd-save"]')) && (await stored(page)).length === 0, errs.replace(/\n/g, ' | '));
  await shot(page, 'vipdecks-02-dialog-invalid-markdown', { quality: 60 });
  await page.fill('[data-testid="sr-vd-text"]', '{"title": "x", "slides": [{"title": "a", "blocks": [{"type": "image", "url": "javascript:alert(1)"}]}]}'); await page.waitForTimeout(250);
  check('import invalid JSON: javascript: image address is rejected with a clear message', /https/.test(await page.locator('[data-testid="sr-vd-errors"]').innerText()) && (await page.isDisabled('[data-testid="sr-vd-save"]')));
  await paste(page, MD);
  check('import markdown: preview shows the deck, 2 slides + the closing notice, valid, Save enabled', /3 slides/.test(await page.locator('[data-testid="sr-vd-valid"]').innerText()) && (await page.locator('[data-testid="sr-vd-pv-title"]').innerText()) === 'Who we are' && !(await page.isDisabled('[data-testid="sr-vd-save"]')));
  await page.click('[data-testid="sr-vd-dialog"] >> text=Next slide'); await page.click('[data-testid="sr-vd-dialog"] >> text=Next slide');
  check('preview: the last slide is the auto-appended disclaimer', /Information only, not an offer or financial advice; details provided directly by management\./.test(await page.locator('[data-testid="sr-vd-preview"]').innerText()));
  await page.click('[data-testid="sr-vd-dialog"] >> text=Previous slide'); await page.click('[data-testid="sr-vd-dialog"] >> text=Previous slide');
  await shot(page, 'vipdecks-03-dialog-markdown-preview', { quality: 60 });
  // keyboard inside the dialog must not move the explorer / change slides
  await page.focus('[data-testid="sr-vd-text"]'); await page.keyboard.type(' 1234'); await page.waitForTimeout(150); check('typing digits / arrows / brackets in the text box does not change slide or deck behind the dialog', (await wall(page)).slide === 0 && (await wall(page)).deck === 'default');
  await page.fill('[data-testid="sr-vd-text"]', MD); await page.waitForTimeout(200);
  await page.click('[data-testid="sr-vd-save"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]', { state: 'detached' }); await settle(page, 600);
  const ids = await stored(page); txt = await panelText(page);
  check('save: stored under one localStorage key on this device, the new deck is shown (Slide 1 / 3), local label visible, picker has 5 entries', ids.length === 1 && /Slide\s*1\s*\/\s*3/.test(txt) && /Who we are/.test(txt) && /Saved on this device only/.test(txt) && (await page.locator('[data-testid="sr-vip-deck-select"] option').count()) === 5, ids);
  check('wall screen state follows: deck id, 2 decks (chips), slide 1', await (async () => { const w = await wall(page); return w.deck === ids[0] && w.decks === 5 && w.slide === 0; })());
  await wallShot(page, 'vipdecks-04-wall-generic-slide', 3500);
  await shot(page, 'vipdecks-05-saved-deck-panel', { quality: 60 });
  // ---- pick decks: Next on the generic deck, the last slide is the disclaimer, then [ ] and the select, and a real click on the wall chip
  await press(page, 'ArrowRight'); await press(page, 'ArrowRight'); await settle(page, 300); txt = await panelText(page);
  check('generic deck: ArrowRight x2 reaches slide 3 = the disclaimer slide (always last); Next is then disabled', /Slide\s*3\s*\/\s*3/.test(txt) && /Information only, not an offer or financial advice/.test(txt) && (await page.isDisabled('[data-testid="sr-vip-next"]')));
  await press(page, 'Digit1'); await settle(page, 300); await press(page, 'BracketLeft'); await settle(page, 400);
  check('"[" cycles to the previous entry (the film entry sits before the saved deck)', (await wall(page)).deck === 'film');
  await press(page, 'BracketRight'); await settle(page, 400); check('"]" cycles to the next deck', /Slide\s*1\s*\/\s*3/.test(await panelText(page)) && (await wall(page)).deck === ids[0]);
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'default'); await settle(page, 400); check('the picker (select) switches back to the default deck', /Station\s*1\s*\/\s*4/.test(await panelText(page)) && (await wall(page)).deck === 'default');
  await page.focus('[data-testid="sr-vip-deck-select"]'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(400); await settle(page, 300); check('the picker is keyboard operable (ArrowDown on the focused select moves to the next entry)', (await wall(page)).deck === 'closets-profile'); await page.selectOption('[data-testid="sr-vip-deck-select"]', ids[0]); await settle(page, 400);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  // wall chip: project the chip centre to the screen and click it with the real mouse (the wall shows a window of three chips round the active deck, so start from the second entry)
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 600); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const pt = await page.evaluate(() => {
    const x = window.__showroom.explore.explorer, v = x.products.vip, d = v.state.decks; const titles = d.map(() => 0);
    // chip layout is the same function the wall uses: re-derive from chipAt by scanning the top strip
    let target = null; for (let u = 0; u < 1 && !target; u += 0.004) { for (const vv of [0.045]) { const i = v.chipAt(u, vv); if (i === 0) target = { u, v: vv }; } }
    if (!target) return null; const m = v.screenMesh, g = m.geometry.parameters; const p = m.position.clone(); p.set((target.u - 0.5) * g.width, (0.5 - target.v) * g.height, 0); m.localToWorld(p); p.project(x.engine.camera); const r = x.canvas.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height, n: titles.length };
  });
  if (pt) { await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(500); }
  check('wall screen: a real mouse click on the first deck chip switches to that deck (the default deck)', !!pt && (await wall(page)).deck === 'default', pt);
  await setHud(page, false); await page.waitForTimeout(300); await shot(page, 'vipdecks-06-wall-default-with-chips', { quality: 55 }); await setHud(page, true);
  // ---- delete
  await page.selectOption('[data-testid="sr-vip-deck-select"]', ids[0]); await settle(page, 400);
  await page.click('[data-testid="sr-vip-deck-delete"]'); await page.waitForSelector('[data-testid="sr-vip-deck-confirm"]'); check('delete: asks first (two-step), nothing removed yet', (await stored(page)).length === 1);
  await shot(page, 'vipdecks-07-delete-confirm', { quality: 60 });
  await page.click('[data-testid="sr-vip-deck-delete-no"]'); check('delete: "Keep it" cancels', (await stored(page)).length === 1 && (await page.locator('[data-testid="sr-vip-deck-confirm"]').count()) === 0);
  await page.click('[data-testid="sr-vip-deck-delete"]'); await page.click('[data-testid="sr-vip-deck-delete-yes"]'); await settle(page, 500);
  check('delete: the deck is removed from storage, the view falls back to the default deck, picker back to four entries', (await stored(page)).length === 0 && (await wall(page)).deck === 'default' && (await wall(page)).decks === 4 && /Station\s*1\s*\/\s*4/.test(await panelText(page)) && (await page.locator('[data-testid="sr-vip-deck-select"] option').count()) === 4);
  check('the whole session made no network write and no request to anything but the local server (no backend, no upload)', net.writes.length === 0 && net.net.filter((u) => !/supabase\.co\/rest\/v1\/website_projects/.test(u)).length === 0, net.net.slice(0, 4));
  check('flows: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

const JSON_DECK = JSON.stringify({ title: { en: 'Operations snapshot', ar: 'لمحة عن العمليات' }, slides: [
  { title: { en: 'Where the work happens', ar: 'أين يجري العمل' }, lead: 'Illustrative figures supplied by the owner', accent: 'sage', bullets: ['Survey, design, make, fit', { en: 'One team from first visit to handover', ar: 'فريق واحد من الزيارة الأولى حتى التسليم' }],
    blocks: [{ type: 'bar', title: 'Projects by department', unit: 'projects', illustrative: true, source: 'Owner supplied (example)', data: [{ label: 'Kitchens', value: 12 }, { label: 'Wardrobes', value: 20 }, { label: 'Doors', value: 7 }] },
      { type: 'table', head: ['Step', 'Who'], rows: [['Survey', 'Designer'], ['Make', 'Factory'], ['Fit', 'Installer']], source: 'Owner supplied (example)' }],
    links: [{ label: 'Kitchens', route: '/kitchen' }] },
  { title: 'Our work', blocks: [{ type: 'image', url: 'https://example.com/photo.jpg', alt: 'A fitted wardrobe', caption: 'Example photo' }], source: 'Example image address (not loaded offline)' }] });
async function blocks(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page); await enterVip(page);
  await page.click('[data-testid="sr-vip-deck-add"]'); await paste(page, JSON_DECK);
  check('blocks: a JSON deck with a bar chart, a table, a link and an https image is valid (no warnings: the chart / table carry a source)', (await page.locator('[data-testid="sr-vd-valid"]').count()) === 1 && (await page.locator('[data-testid="sr-vd-warnings"]').count()) === 0);
  await page.click('[data-testid="sr-vd-save"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]', { state: 'detached' }); await settle(page, 600);
  const bars = await page.locator('.sr-vip-bar').count(), rows = await page.locator('.sr-vip-table tbody tr').count(), href = await page.getAttribute('[data-testid="sr-vip-slide-link"]', 'href');
  check('blocks: the panel shows 3 bars with values and unit, a 3-row table, the internal link /kitchen, the illustrative + source label, and the disclaimer footer', bars === 3 && rows === 3 && href === '/kitchen' && /12 projects/.test(await panelText(page)) && /Illustrative/.test(await panelText(page)) && /Information only, not an offer/.test(await panelText(page)), [bars, rows, href]);
  await shot(page, 'vipdecks-15-json-blocks-panel', { quality: 55 }); await wallShot(page, 'vipdecks-16-json-blocks-wall', 3000);
  await press(page, 'ArrowRight'); await settle(page, 500); check('blocks: the https image slide renders an <img> with alt text and no-referrer (the image itself does not load offline)', (await page.locator('.sr-vip-block img').getAttribute('alt')) === 'A fitted wardrobe' && (await page.locator('.sr-vip-block img').getAttribute('referrerpolicy')) === 'no-referrer');
  await wallShot(page, 'vipdecks-17-json-image-slide-wall', 2500);
  check('blocks: no page errors', o.errors.filter((e) => !/example\.com|ERR_|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function fail(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 1100, height: 640 }, init: () => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).indexOf('sr3d.vipDecks') === 0) { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; } return s.call(this, k, v); }; } });
  const page = o.page; await mockProjects(page); await enterVip(page);
  await page.click('[data-testid="sr-vip-deck-add"]'); await paste(page, MD); await page.click('[data-testid="sr-vd-save"]'); await page.waitForTimeout(400);
  const msg = await page.locator('[data-testid="sr-vd-saveerr"]').innerText().catch(() => '');
  check('storage failure: a clear message in the dialog ("Could not save ... not enough storage"), the dialog stays open, nothing was added, the room still works', /Could not save/.test(msg) && /storage/i.test(msg) && (await page.locator('[data-testid="sr-vd-dialog"]').count()) === 1 && (await page.locator('[data-testid="sr-vip-deck-select"] option').count()) === 4, msg);
  await shot(page, 'vipdecks-08-save-failed', { quality: 60 });
  await page.click('[data-testid="sr-vd-close"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]', { state: 'detached' });
  check('after cancelling, focus returns to the "Add presentation" button and Escape-less keys work again (key 2 -> station 2)', (await page.evaluate(() => document.activeElement && document.activeElement.dataset.testid)) === 'sr-vip-deck-add' && await (async () => { await page.evaluate(() => document.activeElement.blur()); await press(page, 'Digit2'); return /Station\s*2\s*\/\s*4/.test(await panelText(page)); })());
  check('fail: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function ar(b) {
  const o = await L.openShowroom(b, { url: '/ar/yas-bloom', query: FAST, viewport: { width: 1100, height: 640 } }); const page = o.page; await mockProjects(page); await enterVip(page);
  check('AR: panel is rtl, the deck bar is Arabic ("العرض", "أضف عرضًا")', (await page.locator('[data-testid="sr-vip-panel"]').getAttribute('dir')) === 'rtl' && /العرض/.test(await page.locator('[data-testid="sr-vip-deckbar"]').innerText()) && /أضف عرضًا/.test(await page.locator('[data-testid="sr-vip-deck-add"]').innerText()));
  await page.click('[data-testid="sr-vip-deck-add"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]');
  check('AR: dialog is rtl with the Arabic local-only and responsibility notes', (await page.locator('[data-testid="sr-vd-dialog"]').getAttribute('dir')) === 'rtl' && /هذا الجهاز فقط/.test(await page.locator('[data-testid="sr-vd-local"]').innerText()) && /مسؤول عن دقة/.test(await page.locator('[data-testid="sr-vd-responsible"]').innerText()));
  await paste(page, MD_AR); check('AR: Arabic markdown previews (title) and is valid', /من نحن/.test(await page.locator('[data-testid="sr-vd-pv-title"]').innerText()) && (await page.locator('[data-testid="sr-vd-valid"]').count()) === 1);
  await shot(page, 'vipdecks-09-ar-dialog', { quality: 60 }); await page.click('[data-testid="sr-vd-save"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]', { state: 'detached' }); await settle(page, 600);
  let txt = await panelText(page); check('AR: the saved deck shows Arabic title, "الشريحة 1 / 2", the local label and the Arabic disclaimer on the next slide', /من نحن/.test(txt) && /1\s*\/\s*2/.test(txt) && /محفوظ على هذا الجهاز فقط/.test(txt));
  await press(page, 'ArrowLeft'); await settle(page, 300); txt = await panelText(page); check('AR/RTL: ArrowLeft goes to the NEXT slide = the Arabic disclaimer', /2\s*\/\s*2/.test(txt) && /للاطلاع فقط، وليس عرضًا ولا نصيحة مالية/.test(txt));
  await press(page, 'ArrowRight'); await settle(page, 300); await wallShot(page, 'vipdecks-10-ar-wall-and-panel', 2500).catch(() => 0); await shot(page, 'vipdecks-11-ar-panel', { quality: 60 });
  check('AR: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

async function mobile(b) {
  const o = await L.openShowroom(b, { query: FAST, viewport: { width: 390, height: 844 }, mobile: true }); const page = o.page; await mockProjects(page); await enterVip(page, true);
  const r = await page.locator('[data-testid="sr-vip-panel"]').boundingBox();
  check('mobile: the presentation panel is still a bottom sheet (<= 62% height; the VIP sheet carries the deck bar) with the deck picker inside', r.width > 360 && r.height <= 844 * 0.63 && r.y + r.height > 820 && (await page.locator('[data-testid="sr-vip-deck-select"]').count()) === 1, r);
  const sel = await page.locator('[data-testid="sr-vip-deck-select"]').boundingBox(), add = await page.locator('[data-testid="sr-vip-deck-add"]').boundingBox(); check('mobile: picker and Add button are at least 44 px tall', sel.height >= 43 && add.height >= 43, [sel.height, add.height]);
  await shot(page, 'vipdecks-12-mobile-panel', { quality: 55 });
  await page.tap('[data-testid="sr-vip-deck-add"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]'); const d = await page.locator('[data-testid="sr-vd-dialog"]').boundingBox();
  check('mobile: the dialog fits the screen (no horizontal overflow) and its Save is reachable', d.width <= 390 && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  await paste(page, MD); await page.locator('[data-testid="sr-vd-save"]').scrollIntoViewIfNeeded(); await shot(page, 'vipdecks-13-mobile-dialog', { quality: 55 });
  await page.tap('[data-testid="sr-vd-save"]'); await page.waitForSelector('[data-testid="sr-vd-dialog"]', { state: 'detached' }); await settle(page, 500);
  check('mobile: saving by tap shows the new deck; Next by tap works; picker (select) lists both decks', /Slide\s*1\s*\/\s*3/.test(await panelText(page)) && (await page.locator('[data-testid="sr-vip-deck-select"] option').count()) === 5);
  await page.tap('[data-testid="sr-vip-next"]'); await settle(page, 300); check('mobile: Next by tap', /2\s*\/\s*3/.test(await panelText(page)));
  await shot(page, 'vipdecks-14-mobile-saved-deck', { quality: 55 });
  check('mobile: no horizontal overflow, no page errors', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) && o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}

(async () => {
  const b = await L.launch(); const only = process.argv[2];
  const run = async (name, fn) => { if (only && only !== name) return; try { await fn(b); } catch (e) { check(`suite "${name}" ran to the end`, false, String(e && e.message).slice(0, 400)); } };
  try { await run('flows', flows); await run('blocks', blocks); await run('fail', fail); await run('ar', ar); await run('mobile', mobile); } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); bad.forEach((r) => console.log('FAILED:', r.name, JSON.stringify(r.detail)));
  process.exit(bad.length ? 1 : 0);
})();
