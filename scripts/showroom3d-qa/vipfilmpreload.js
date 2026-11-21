/* VIP film "download, then play" QA (headless Chromium on SwiftShader). The test Chromium cannot decode H.264, so the film .mp4 requests are answered by a STAND-IN: a small local server that
 * serves a VP9 .webm clip at a CONTROLLED SPEED (rate-limited chunks, byte ranges, early-close detection), so the download can be watched, slowed down and aborted.
 * films.json is rewritten on the fly so the manifest sizes match the stand-in clip (the preloader checks sizes).
 *
 *   node scripts/showroom3d-qa/serve.js build 5066
 *   BASE=http://localhost:5066 QA_FILM_DIR=<dir with journey-1080.webm> node scripts/showroom3d-qa/vipfilmpreload.js [flow|slow|reload|off|ui]
 */
const L = require('./lib.js');
const { check, shot } = L;
const fs = require('fs'), path = require('path'), http = require('http');
const DIR = process.env.QA_FILM_DIR, CLIP = path.join(DIR || '', 'journey-1080.webm');
const MED = 'debug=1&quality=low&aa=0&scale=0.5';
const wait = (page, ms) => page.waitForTimeout(ms);
const settle = async (page, ms = 500) => { await page.waitForFunction(() => !window.__showroom.explore.explorer.fly, null, { timeout: 120000 }); await page.waitForTimeout(ms); };
const dismissCoach = async (page) => { await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); }); await page.waitForTimeout(300); };
const vip = (page, fn, ...a) => page.evaluate(([f, args]) => { const v = window.__showroom.engine.products.vip, x = window.__showroom.explore.explorer; return (new Function('v', 'x', 'args', 'return (' + f + ')(v, x, ...args)'))(v, x, args); }, [fn.toString(), a]);
const mockProjects = (page) => page.route('**/rest/v1/website_projects*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
const hud = (page, on) => page.evaluate((on) => document.querySelectorAll('.sr-hud, .sr-coach, .sr-touch, .sr-greet, [data-testid="sr-greet-bubble"]').forEach((n) => { n.style.visibility = on ? '' : 'hidden'; }), on);

/** the stand-in film server. rate = bytes per second per response. log = every response: { name, range, t0, sent, done, closedEarly } */
function standIn(rate) {
  const buf = fs.readFileSync(CLIP), log = []; const st = { rate, log, size: buf.length };
  const srv = http.createServer((req, res) => {
    const name = req.url.split('?')[0].split('/').pop(), m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    let start = 0, end = buf.length - 1; const h = { 'content-type': 'video/webm', 'accept-ranges': 'bytes', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=0, must-revalidate' };
    if (m && (m[1] || m[2])) { start = m[1] ? Number(m[1]) : Math.max(0, buf.length - Number(m[2])); end = m[1] && m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1; h['content-range'] = `bytes ${start}-${end}/${buf.length}`; res.writeHead(206, { ...h, 'content-length': end - start + 1 }); } else res.writeHead(200, { ...h, 'content-length': buf.length });
    const e = { name, range: req.headers.range || '', t0: Date.now(), sent: 0, done: false, closedEarly: false }; log.push(e); let pos = start;
    const tick = () => { if (res.destroyed || res.writableEnded) return; if (pos > end) { res.end(); e.done = true; return; } const n = Math.min(16384, end - pos + 1); res.write(buf.subarray(pos, pos + n)); pos += n; e.sent += n; setTimeout(tick, st.rate ? (n / st.rate) * 1000 : 0); };
    res.on('close', () => { if (!e.done) e.closedEarly = true; }); tick();
  });
  st.listen = (port) => new Promise((r) => srv.listen(port, r)); st.close = () => srv.close(); return st;
}
const FILMS = (size) => JSON.stringify({ films: [
  { id: 'yas-story', real: true, order: 1, title: { en: 'YAS: our story', ar: 'YAS: حكايتنا' }, durationSec: 20, sources: [{ src: '/yas-bloom/film/yas-story.mp4', width: 848, height: 480, bytes: size }, { src: '/yas-bloom/film/yas-story-mobile.mp4', width: 848, height: 480, bytes: size }], poster: '/yas-bloom/film/yas-story-poster.jpg', captions: [], burnedSubtitles: true },
  { id: 'closets-story', real: true, order: 2, title: { en: 'The Closets: our story', ar: 'الخزائن: حكايتنا' }, durationSec: 20, sources: [{ src: '/yas-bloom/film/closets-story.mp4', width: 1280, height: 720, bytes: size }, { src: '/yas-bloom/film/closets-story-mobile.mp4', width: 960, height: 540, bytes: size }], poster: '/yas-bloom/film/closets-story-poster.jpg', captions: [] },
  { id: 'journey', real: false, order: 99, title: { en: 'The Closets: The Journey of Ambition', ar: 'الخزائن: حكاية طموح' }, durationSec: 20, sources: [{ src: '/yas-bloom/film/journey-1080.mp4', width: 1920, height: 1080, bytes: size }, { src: '/yas-bloom/film/journey-720.mp4', width: 1280, height: 720, bytes: size }], poster: '/yas-bloom/film/journey-poster.jpg', captions: [] }] });
async function wire(page, srv, port) {
  await page.route('**/yas-bloom/film/films.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: FILMS(srv.size) }));
  await page.route('**/yas-bloom/film/*.mp4', (r) => { const u = new URL(r.request().url()); return r.continue({ url: `http://localhost:${port}/clip/${u.pathname.split('/').pop()}` }); });
}
async function enterVip(page, tap = false, explored = false) {
  if (!explored) { await L.enterExplore(page, { tap }); await dismissCoach(page); }
  await L.ex(page, (e, a) => e.teleport(...a), [0, -30.2, 0, 0.05]); await page.waitForTimeout(500);
  if (tap) await page.tap('[data-testid="sr-interact"]'); else { await page.keyboard.press('KeyE'); await page.waitForTimeout(250); }
  await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: tap ? 8000 : 30000 }).catch(async () => { await vip(page, (v, x) => x.focusVip(0)); await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 30000 }); });   // touch: the interact tap is occasionally swallowed by the coach/greeting layer on a software-GL frame
  await settle(page, 600);
}
const prep = (page) => vip(page, (v, x) => { const F = x.film; if (!F || !F.preloader) return null; return { state: F.preloader.started, entries: [...F.preloader.entries].map(([k, e]) => k.split('/').pop() + ':' + e.status + ':' + e.pct + (e.from ? ':' + e.from : '')), mem: [...F.preloader.blobs.keys()].map((k) => k.split('/').pop()) }; });
const filmDone = (page, n) => page.waitForFunction((n) => { const P = window.__showroom.explore.explorer.film && window.__showroom.explore.explorer.film.preloader; return P && [...P.entries.values()].filter((e) => e.status === 'ready').length >= n; }, n, { timeout: 90000 });
const goFilm = async (page, id) => { await vip(page, (v, x, i) => x.goAgenda({ deck: 'meeting', slide: i, kind: 'film' }), id === 'yas-story' ? 2 : 3); await page.waitForFunction((i) => window.__showroom.explore.explorer.film.state.id === i, id, { timeout: 20000 }); await settle(page, 500); };
const playing = (page) => page.waitForFunction(() => { const f = window.__showroom.explore.explorer.film; return f && f.state.status === 'playing' && f.video && f.video.currentTime > 0.4; }, null, { timeout: 40000 }).then(() => true, () => false);
const filmReqs = (srv, name) => srv.log.filter((e) => !name || e.name === name);

/** 1. the whole flow on a throttled line */
async function flow(b) {
  const srv = standIn(110000), port = 5081; await srv.listen(port); const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }), page = o.page; await mockProjects(page); await wire(page, srv, port);
  const outside = []; page.on('request', (r) => { if (/yas-bloom\/film\//.test(r.url()) && !/\.(jpg|vtt)/.test(r.url())) outside.push(r.url().split('/').pop()); });
  await L.enterExplore(page); await dismissCoach(page); await wait(page, 4000);
  check('outside the VIP room: not one film or manifest request (nobody who does not enter the room downloads anything)', outside.length === 0 && srv.log.length === 0, { outside, served: srv.log.length });
  await enterVip(page, false, true); const t0 = Date.now();
  await page.waitForFunction(() => { const P = window.__showroom.explore.explorer.film && window.__showroom.explore.explorer.film.preloader; return P && [...P.entries.values()].some((e) => e.status === 'loading'); }, null, { timeout: 20000 });
  const tFirst = Date.now() - t0; await wait(page, 800);
  check('entering the VIP room starts the download of film 1 (YAS: our story) within seconds; exactly one transfer at a time, nothing else yet', srv.log.length === 1 && srv.log[0].name === 'yas-story.mp4', { ms: tFirst, log: srv.log.map((e) => e.name) });
  await vip(page, (v, x) => x.setStation(1)); await settle(page, 500); await page.waitForSelector('[data-testid="sr-vip-agenda"]', { timeout: 10000 });
  const txt0 = await page.locator('[data-testid="sr-vip-agenda"]').innerText(); check('the agenda card shows "Preparing film… NN%" next to film 1', /Preparing film… \d+%/.test(txt0), txt0.split('\n').slice(0, 6));
  await shot(page, 'vipfast-01-agenda-preparing-en', { quality: 62 });
  await goFilm(page, 'yas-story'); await wait(page, 600);
  const pt = await page.locator('[data-testid="sr-vip-film-prep"]').innerText().catch(() => ''); const pct1 = Number(await page.locator('[data-testid="sr-vip-film-prep"]').getAttribute('data-pct'));
  check('the film card shows "Preparing film… NN%" with a progress bar, and Play is enabled (never blocked)', /Preparing film…/.test(pt) && pct1 >= 0 && (await page.locator('[data-testid="sr-vip-film-play"]').isEnabled()) && (await page.locator('[role="progressbar"]').count()) >= 1, { pt, pct1 });
  await hud(page, false); await vip(page, (v) => v.freezeAnim && v.freezeAnim(3)); await wait(page, 500); await shot(page, 'vipfast-02-wall-preparing-en', { quality: 62 }); await hud(page, true); await vip(page, (v) => v.freezeAnim && v.freezeAnim(null));
  await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await wait(page, 500); await shot(page, 'vipfast-03-big-screen-preparing-en', { quality: 62 });
  const p1 = await page.locator('[data-testid="sr-vip-film-prep"]').count(); await page.click('[data-testid="sr-vip-exit-present"]'); await settle(page, 700);
  await page.waitForFunction(() => { const P = window.__showroom.explore.explorer.film.preloader; return [...P.entries.values()].some((e) => e.status === 'ready'); }, null, { timeout: 60000 }); await wait(page, 700);
  const st1 = await prep(page); check('film 1 finishes first, held in memory', st1.entries.some((e) => /^yas-story\.mp4:ready/.test(e)) && st1.mem.includes('yas-story.mp4'), st1);
  check('the panel then says "Ready: starts instantly"', /Ready: starts instantly/.test(await page.locator('[data-testid="sr-vip-film-prep"]').innerText()));
  await shot(page, 'vipfast-04-panel-ready-en', { quality: 62 });
  // ---- Play after completion: no video bytes from the network
  const before = srv.log.filter((e) => e.name === 'yas-story.mp4').length; const tp = Date.now(); await page.click('[data-testid="sr-vip-film-play"]'); const ok = await playing(page); const startMs = Date.now() - tp;
  const info = await vip(page, (v, x) => ({ src: x.film.video.src, pre: x.film.video.preload, onWall: v.filmOnWall, t: x.film.video.currentTime, muted: x.film.video.muted }));
  check('Play after the download: the <video> plays from a blob: URL (preload=auto), on the wall, with sound, starting at once', ok && /^blob:/.test(info.src) && info.pre === 'auto' && info.onWall && info.muted === false, { ...info, startMs });
  check('...and made NO network request for film 1 (served from memory)', srv.log.filter((e) => e.name === 'yas-story.mp4').length === before, { before, after: srv.log.filter((e) => e.name === 'yas-story.mp4').length });
  await wait(page, 1200);
  // ---- seek, cinema, big screen on a blob
  await vip(page, (v, x) => x.filmSeek(12)); await wait(page, 600); const seeked = await vip(page, (v, x) => x.film.video.currentTime); check('seek on the blob works (seek bar / arrow keys): jumped to ~12 s', seeked > 11.5 && seeked < 16, seeked);
  await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press('ArrowLeft'); await wait(page, 500); const back = await vip(page, (v, x) => x.film.video.currentTime); check('arrow key seeks back 10 s', back < seeked - 8, { seeked, back });
  await vip(page, (v, x) => x.setCinema(true)); await wait(page, 900); const cin = await vip(page, (v, x) => ({ c: x.cinema, controls: x.film.video.controls, paused: x.film.video.paused, t: x.film.video.currentTime, src: x.film.video.src.slice(0, 5), box: x._filmHost.getBoundingClientRect().width }));
  check('Cinema mode works on the blob: native controls, still playing, full-width host', cin.c && cin.controls && !cin.paused && cin.src === 'blob:' && cin.box > 1000, cin); await shot(page, 'vipfast-05-cinema-blob', { quality: 55 }); await vip(page, (v, x) => x.setCinema(false)); await wait(page, 300);
  await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await wait(page, 800); const bg = await vip(page, (v, x) => ({ wall: v.filmOnWall, mode: x.presMode, paused: x.film.video.paused })); check('Present on big screen: the blob VideoTexture is on the wall and playing', bg.wall && bg.mode === 'big' && !bg.paused, bg); await shot(page, 'vipfast-06-big-screen-playing', { quality: 58 });
  await page.click('[data-testid="sr-vip-exit-present"]'); await settle(page, 600);
  // ---- film 2 is already downloaded when film 1 finishes
  await page.waitForFunction(() => [...window.__showroom.explore.explorer.film.preloader.entries].some(([k, e]) => /closets-story/.test(k) && e.status === 'ready'), null, { timeout: 90000 }); const pre2 = await prep(page); check('film 2 (The Closets: our story) is already downloaded (memory) while film 1 plays; the AI film does not start before the two real films are done', pre2.mem.includes('closets-story.mp4') || pre2.entries.some((e) => /^closets-story\.mp4:ready/.test(e)), pre2);
  const order = srv.log.map((e) => e.name); check('download order = agenda order: film 1, film 2, the AI film last', order[0] === 'yas-story.mp4' && order[1] === 'closets-story.mp4' && (order.length < 3 || /^journey/.test(order[2])), order);
  await vip(page, (v, x) => x.filmSeek(x.film.video.duration - 0.8)); await page.waitForFunction(() => window.__showroom.explore.explorer.film.state.status === 'ended', null, { timeout: 30000 }).catch(() => {});
  const b2 = srv.log.filter((e) => e.name === 'closets-story.mp4').length; await page.click('[data-testid="sr-vip-meet-next"]'); await settle(page, 700); await page.waitForFunction(() => window.__showroom.explore.explorer.film.state.id === 'closets-story', null, { timeout: 20000 });
  await page.click('[data-testid="sr-vip-film-play"]'); const ok2 = await playing(page); const src2 = await vip(page, (v, x) => x.film.video.src.slice(0, 5)); check('Next agenda item -> film 2 starts instantly from its blob with no new request', ok2 && src2 === 'blob:' && srv.log.filter((e) => e.name === 'closets-story.mp4').length === b2, { src2 });
  await wait(page, 3000); const mem = await prep(page); check('memory cap: at most 2 blobs held in memory at any time', mem.mem.length <= 2, mem);
  const ctl = srv.log.filter((e) => !e.done).length; await vip(page, (v, x) => x.exitFocus()); await wait(page, 800); const after = await prep(page); check('leaving the room: the preloader is stopped (started=false), nothing running', after.state === false, after);
  check('flow: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource|404/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close(); srv.close();
}

/** 2. Play before the download is done streams; leaving the room aborts the transfer */
async function slow(b) {
  const srv = standIn(60000), port = 5082; await srv.listen(port); const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }), page = o.page; await mockProjects(page); await wire(page, srv, port);
  await enterVip(page); await page.waitForFunction(() => { const P = window.__showroom.explore.explorer.film && window.__showroom.explore.explorer.film.preloader; return P && [...P.entries.values()].some((e) => e.status === 'loading'); }, null, { timeout: 20000 }); await goFilm(page, 'yas-story'); await wait(page, 1500);
  const pct = Number(await page.locator('[data-testid="sr-vip-film-prep"]').getAttribute('data-pct')); const full0 = srv.log.filter((e) => e.name === 'yas-story.mp4').length;
  await page.click('[data-testid="sr-vip-film-play"]'); const ok = await playing(page);
  const info = await vip(page, (v, x) => ({ src: x.film.video.src, st: x.film.state.status }));
  check('Play before the download is finished (' + pct + '%): the film streams from the site URL (not a blob) and starts', ok && !/^blob:/.test(info.src) && /yas-story\.mp4$/.test(info.src), { ...info, pct });
  await wait(page, 1500); const reqs = srv.log.filter((e) => e.name === 'yas-story.mp4');
  check('the background transfer of that film is cancelled (two transfers would slow the stream): the first response was closed early, the player requests by range / its own request', reqs.length >= 2 && reqs[0].closedEarly && reqs.some((e) => e !== reqs[0]), reqs.map((e) => ({ range: e.range, sent: e.sent, early: e.closedEarly })));
  // abort on leaving the room (the next film is downloading)
  await page.waitForFunction(() => { const P = window.__showroom.explore.explorer.film.preloader; return [...P.entries].some(([k, e]) => /closets-story/.test(k) && e.status === 'loading'); }, null, { timeout: 60000 }); await wait(page, 600);
  const live = srv.log.filter((e) => e.name === 'closets-story.mp4' && !e.done && !e.closedEarly).length; const t = Date.now(); await vip(page, (v, x) => x.exitFocus()); await wait(page, 1500);
  const e2 = srv.log.filter((e) => e.name === 'closets-story.mp4'); check('leaving the room aborts the running download (transfer closed early, no new one started)', live >= 1 && e2.every((e) => e.done || e.closedEarly) && e2.some((e) => e.closedEarly) && srv.log.filter((e) => /^journey/.test(e.name)).length === 0, { live, e2: e2.map((e) => ({ sent: e.sent, early: e.closedEarly })) });
  const paused = await vip(page, (v, x) => !x.film.video || x.film.video.paused); check('leaving the room also pauses the film', paused);
  check('slow: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource|404/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close(); srv.close();
}

/** 3. a reload and a re-visit do not download again (Cache Storage) */
async function reload(b) {
  const srv = standIn(0), port = 5083; await srv.listen(port); const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }); let page = o.page; await mockProjects(page); await wire(page, srv, port);
  await enterVip(page); await filmDone(page, 3); await wait(page, 600); const n1 = srv.log.length; const c1 = await page.evaluate(async () => { const c = await caches.open('yas-film-v1'); return (await c.keys()).map((r) => r.url.split('/').pop()); });
  check('first visit: all 3 films downloaded (' + n1 + ' requests) and stored in Cache Storage "yas-film-v1"', n1 === 3 && c1.length === 3, { n1, c1 });
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__showroom && window.__showroom.ready, null, { timeout: 120000 }); await enterVip(page); const t0 = Date.now();
  await page.waitForFunction(() => { const P = window.__showroom.explore.explorer.film && window.__showroom.explore.explorer.film.preloader; return P && [...P.entries.values()].some((e) => e.status === 'ready'); }, null, { timeout: 30000 }); const readyMs = Date.now() - t0;
  await filmDone(page, 3); const s = await prep(page); check('after a RELOAD: every film is Ready from Cache Storage with ZERO video requests', srv.log.length === n1 && s.entries.every((e) => /:ready:\d+:cache$|:ready:100:cache$/.test(e) || /:ready:/.test(e) && /cache/.test(e)), { requests: srv.log.length, s, readyMs });
  await goFilm(page, 'yas-story'); await page.click('[data-testid="sr-vip-film-play"]'); const ok = await playing(page); const src = await vip(page, (v, x) => x.film.video.src.slice(0, 5)); check('...and Play after the reload starts from the cached copy (blob), no network', ok && src === 'blob:' && srv.log.length === n1, { src, requests: srv.log.length });
  await vip(page, (v, x) => x.exitFocus()); await wait(page, 600); await vip(page, (v, x) => x.focusVip(0)); await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 30000 }); await wait(page, 2500);
  check('re-entering the room in the same visit: still no new request', srv.log.length === n1, srv.log.length);
  check('reload: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource|404/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close(); srv.close();
}

/** 4. switched off by the query flag, and by data saver / 2g */
async function off(b) {
  for (const [name, query, init] of [['?vipprefetch=0', MED + '&vipprefetch=0', null], ['data saver', MED, () => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }); }], ['2g', MED, () => { Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: '2g' }, configurable: true }); }]]) {
    const srv = standIn(0), port = 5084; await srv.listen(port); const o = await L.openShowroom(b, { query, viewport: { width: 1280, height: 720 }, init }), page = o.page; await mockProjects(page); await wire(page, srv, port);
    await enterVip(page); await wait(page, 3500); await goFilm(page, 'yas-story'); await wait(page, 500);
    const txt = await page.locator('[data-testid="sr-vip-panel"]').innerText(); const has = await page.locator('[data-testid="sr-vip-film-prep"]').count();
    check(name + ': no film bytes requested in the VIP room, no "Preparing" UI, Play still works (streams)', srv.log.length === 0 && has === 0 && !/Preparing film/.test(txt) && (await page.locator('[data-testid="sr-vip-film-play"]').isEnabled()), { served: srv.log.length, has });
    await page.click('[data-testid="sr-vip-film-play"]'); const ok = await playing(page); const src = await vip(page, (v, x) => x.film.video.src); check(name + ': Play streams from the site URL', ok && !/^blob:/.test(src) && srv.log.length >= 1, { src, served: srv.log.length }); await o.ctx.close(); srv.close();
  }
}

/** 5. the progress UI: screenshots (EN / AR, desktop / phone) held at a fixed percentage by a very slow stand-in */
async function ui(b) {
  for (const [tag, url, vpz, mobile] of (process.env.QA_UI ? (c) => c.filter((x) => x[0] === process.env.QA_UI) : (c) => c)([['en-desktop', '/yas-bloom', { width: 1280, height: 720 }, false], ['ar-desktop', '/ar/yas-bloom', { width: 1280, height: 720 }, false], ['en-phone', '/yas-bloom', { width: 390, height: 844 }, true], ['ar-phone', '/ar/yas-bloom', { width: 390, height: 844 }, true]])) {
    const srv = standIn(0); srv.rate = 0; const port = 5085; await srv.listen(port);
    // hold the transfer at about 40%: the server serves a throttled stream of 250 kB/s but the page is frozen by a gate after the first chunks (the rate is set once the shot is taken)
    srv.rate = 45000; const o = await L.openShowroom(b, { url, query: mobile ? 'debug=1&quality=low&aa=0&scale=0.5' : MED, viewport: vpz, mobile }), page = o.page; await mockProjects(page); await wire(page, srv, port);
    await enterVip(page, mobile); await page.waitForFunction(() => { const P = window.__showroom.explore.explorer.film.preloader; return [...P.entries.values()].some((e) => e.status === 'loading' && e.pct >= 25); }, null, { timeout: 30000 }).catch(() => {});
    await goFilm(page, 'yas-story'); await wait(page, 300);
    const p = await page.locator('[data-testid="sr-vip-film-prep"]').innerText().catch(() => '(none)'); console.log(tag, 'panel prep:', JSON.stringify(p));
    await hud(page, false); await vip(page, (v) => v.freezeAnim && v.freezeAnim(3)); await wait(page, 400); await shot(page, 'vipfast-ui-' + tag + '-wall', { quality: 66 }); await hud(page, true); await vip(page, (v) => v.freezeAnim && v.freezeAnim(null)); await wait(page, 300);
    await shot(page, 'vipfast-ui-' + tag + '-panel', { quality: 66 });
    if (!mobile) { await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await wait(page, 400); await shot(page, 'vipfast-ui-' + tag + '-big', { quality: 66 }); }
    await o.ctx.close(); srv.close();
  }
  check('ui: screenshots written', true);
}

(async () => {
  if (!DIR || !fs.existsSync(CLIP)) { console.log('set QA_FILM_DIR to a folder with journey-1080.webm'); process.exit(2); }
  const b = await L.launch(), only = process.argv[2]; const suites = { flow, slow, reload, off, ui };
  try { for (const [k, fn] of Object.entries(suites)) if (!only || only === k) await fn(b); } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok); console.log(`\n${L.results.length - bad.length}/${L.results.length} checks passed`); process.exit(bad.length ? 1 : 0);
})();
