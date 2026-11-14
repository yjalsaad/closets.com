/* Combined showroom QA (realism + kiosks + VIP decks + film + collections on one branch): the views the owner reviews, and the REAL film files.
 * Needs a served build:  node scripts/showroom3d-qa/serve.js build 5071   then   BASE=http://localhost:5071 OUT=<dir> node scripts/showroom3d-qa/combined.js [hall|kiosk|vip|film|mobile|collections]
 * Film playback needs a browser with H.264 / AAC:  CHROME=/usr/bin/google-chrome  (the bundled Chromium has no MP4 decoder; without one the film checks report "not executed"). */
const L = require('./lib.js');
const { check, ex, shot } = L;
const OPEN = new Set(), _open = L.openShowroom; L.openShowroom = async (...a) => { const o = await _open(...a); OPEN.add(o.ctx); return o; };   // every context is closed even when a suite throws (an abandoned WebGL page starves the next one)
const MED = 'debug=1&quality=medium&aa=0', LOW = 'debug=1&quality=low&aa=0';
const IDS = ['reception', 'kitchens', 'wardrobes', 'walkin', 'bedroom', 'doors', 'living', 'studio', 'lounge', 'vip'];
const wait = (page, ms) => page.waitForTimeout(ms);
const settle = async (page, ms = 600) => { await page.waitForFunction(() => !window.__showroom.explore.explorer.fly, null, { timeout: 120000 }); await wait(page, ms); };
const dismiss = (page) => page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); });
const setHud = (page, on, keep = '') => page.evaluate(([on, keep]) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach, .sr-touch, .sr-greet, [data-testid="sr-greet-bubble"], [data-testid="sr-talk"]').forEach((n) => { n.style.visibility = on || (keep && n.matches(keep)) ? '' : 'hidden'; }), [on, keep]);
const vip = (page, fn, ...a) => page.evaluate(([f, args]) => { const v = window.__showroom.engine.products.vip, x = window.__showroom.explore.explorer; return (new Function('v', 'x', 'args', 'return (' + f + ')(v, x, ...args)'))(v, x, args); }, [fn.toString(), a]);
const mockProjects = (page) => page.route('**/rest/v1/website_projects*', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
async function enter(page) {
  await page.waitForSelector('[data-testid="sr-skip"]', { timeout: 240000 });
  for (let i = 0; i < 80; i++) { const ph = await page.evaluate(() => { const b = document.querySelector('[data-testid="sr-skip"]'); if (b) b.click(); const st = document.querySelector('.sr-stage'); return st && st.dataset.phase; }); if (ph === 'explore') break; await wait(page, 1500); }
  await page.waitForSelector('.sr-stage[data-phase="explore"]', { timeout: 240000 }); await dismiss(page);
  await page.waitForFunction(() => { const e = window.__showroom && window.__showroom.engine; return !e || e.realism === 'ready' || e.realism === 'procedural'; }, null, { timeout: 180000 }).catch(() => {}); await wait(page, 1500);
}
const tp = async (page, p, ms = 3500) => { await ex(page, (e, a) => e.teleport(...a), p); await wait(page, ms); };
async function enterVip(page) { await tp(page, [0, -30.2, 0, 0.05], 800); await page.evaluate(() => { const b = document.querySelector('[data-testid="sr-interact"]'); if (b) b.click(); }); if (!(await page.$('[data-testid="sr-vip-panel"]'))) await page.keyboard.press('KeyE'); await page.waitForSelector('[data-testid="sr-vip-panel"]', { timeout: 60000 }); await settle(page, 800); }
const imagesReady = (page) => page.waitForFunction(() => { const m = window.__showroom.engine.products.vip.state.images; return [...m.values()].length > 0 && [...m.values()].every(Boolean); }, null, { timeout: 60000 }).catch(() => {});
const kioskSpot = async (page, id, d = 1.7) => { const pos = await page.evaluate((i) => window.__showroom.engine.staff.item(i).def.at, id); const near = id === 'reception' ? [pos[0] + 0.9, pos[1] + 2.1] : id === 'vip' ? [pos[0] + 1.2, pos[1] + 1.4] : [pos[0] + (pos[0] < 0 ? d : -d), pos[1] + 0.5]; return [near[0], near[1], Math.atan2(-(pos[0] - near[0]), -(pos[1] - near[1])), 0.02]; };

async function hall(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }), page = o.page; await mockProjects(page); await enter(page);
  await tp(page, [0, -3.5, 0, 0.04]); await setHud(page, false); await shot(page, 'combined-01-hall-en', { quality: 80 }); await setHud(page, true);
  check('default staff mode is the kiosk (no ?staff= in the address)', (await page.evaluate(() => window.__showroom.engine.staff.mode)) === 'kiosk');
  await page.waitForFunction((ids) => ids.every((i) => window.__showroom.engine.staff.item(i).char.hasPortrait), IDS, { timeout: 60000 }).catch(() => {});
  const got = await page.evaluate((ids) => ids.map((i) => { const it = window.__showroom.engine.staff.item(i); return [i, !!(it && it.char.kiosk), !!(it && it.char.hasPortrait)]; }), IDS);
  check('all ten advisers are kiosks and each loaded its real portrait file', got.every((g) => g[1] && g[2]), got.filter((g) => !(g[1] && g[2])));
  check('hall: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}
async function kiosk(b) {
  for (const lang of ['en', 'ar']) {
    const o = await L.openShowroom(b, { url: lang === 'ar' ? '/ar/yas-bloom' : '/yas-bloom', query: MED, viewport: { width: 1280, height: 720 } }), page = o.page; await mockProjects(page); await enter(page);
    await page.waitForFunction(() => window.__showroom.engine.staff.item('kitchens').char.hasPortrait, null, { timeout: 60000 }).catch(() => {});
    await tp(page, await kioskSpot(page, 'kitchens', 1.5), 4000); await setHud(page, false); await shot(page, `combined-02-kiosk-kitchens-${lang}`, { quality: 84 }); await setHud(page, true);
    await tp(page, await kioskSpot(page, 'reception'), 3000);
    await page.waitForSelector('[data-testid="sr-talk"]', { timeout: 30000 }); await page.click('[data-testid="sr-talk"]'); await page.waitForSelector('[data-testid="sr-chat"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="sr-chat-portrait-note"]', { timeout: 30000 }).catch(() => {}); await wait(page, 1200);
    const h = await page.evaluate(() => { const q = (s) => document.querySelector(`[data-testid="${s}"]`); const img = q('sr-chat-avatar') && q('sr-chat-avatar').querySelector('img'); return { img: img ? img.getAttribute('src') : '', ok: !!(img && img.naturalWidth > 8), note: q('sr-chat-portrait-note') ? q('sr-chat-portrait-note').textContent : '', badge: q('sr-chat-badge') ? q('sr-chat-badge').textContent : '', log: q('sr-chat-log') ? q('sr-chat-log').innerText : '' }; });
    check(`${lang}: chat header shows the adviser portrait and the "AI-generated portrait" note, plus the AI badge`, h.ok && /staff\/reception\.webp$/.test(h.img) && (lang === 'ar' ? /مولّدة بالذكاء الاصطناعي/ : /AI-generated portrait/).test(h.note) && h.badge.length > 0, { img: h.img, note: h.note, badge: h.badge });
    check(`${lang}: the greeting has no "investor briefing" / "join and invest" wording`, !/invest|briefing|إحاطة|استثمار|مستثمر/i.test(h.log), h.log.slice(0, 160));
    await shot(page, `combined-03-chat-reception-${lang}`, { quality: 80 }); await page.click('[data-testid="sr-chat-close"]'); await wait(page, 400);
    // the VIP adviser kiosk: "present the company profile" and "play your story" hooks
    await tp(page, await kioskSpot(page, 'vip'), 2500); await page.waitForSelector('[data-testid="sr-talk"]', { timeout: 30000 }); await page.click('[data-testid="sr-talk"]'); await page.waitForSelector('[data-testid="sr-chat"]', { timeout: 30000 }); await wait(page, 800);
    const say = async (q) => { await page.fill('[data-testid="sr-chat-input"]', q); await page.keyboard.press('Enter'); };
    await say(lang === 'ar' ? 'اعرض ملف الشركة' : 'Please present the company profile');
    await page.waitForFunction(() => window.__showroom.explore.explorer.focus && window.__showroom.explore.explorer.focus.kind === 'vip', null, { timeout: 60000 }).catch(() => {}); await wait(page, 2500);
    const st1 = await vip(page, (v, x) => ({ deck: x.ds.deckId, mode: x.presMode, playing: x.play.playing }));
    check(`${lang}: the VIP KIOSK adviser, asked to present the company profile, puts The Closets profile on the big screen and starts auto-play`, st1.deck === 'closets-profile' && st1.mode === 'big' && st1.playing === true, st1);
    await shot(page, `combined-03b-vip-kiosk-presenting-${lang}`, { quality: 78 });
    await page.keyboard.press('Escape'); await settle(page, 600); await page.keyboard.press('Escape'); await wait(page, 900); await tp(page, await kioskSpot(page, 'vip'), 2000);
    await page.keyboard.press('KeyT'); await page.waitForSelector('[data-testid="sr-chat-input"]', { timeout: 30000 }); await wait(page, 800);
    await say(lang === 'ar' ? 'شغّل حكايتكم' : 'play your story');
    await page.waitForFunction(() => window.__showroom.explore.explorer.ds.deckId === 'film', null, { timeout: 60000 }).catch(() => {}); await wait(page, 2000);
    const st2 = await vip(page, (v, x) => ({ deck: x.ds.deckId, film: x.film && x.film.state.status, video: !!(x.film && x.film.video) }));
    check(`${lang}: the VIP KIOSK adviser, asked to play the story, opens the film entry (never auto-plays with sound without a click)`, st2.deck === 'film', st2);
    const texts = await vip(page, (v, x) => document.body.innerText); check(`${lang}: no investor / briefing wording on screen`, !/investor|join and invest|briefing|إحاطة|استثمار|مستثمر/i.test(texts));
    check(`${lang} kiosk: no page errors`, o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  }
}
async function vipViews(b) {
  for (const lang of ['en', 'ar']) {
    const o = await L.openShowroom(b, { url: lang === 'ar' ? '/ar/yas-bloom' : '/yas-bloom', query: MED, viewport: { width: 1280, height: 720 } }), page = o.page; await mockProjects(page); await enter(page); await enterVip(page);
    await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 800); await imagesReady(page); await page.keyboard.press('Digit2'); await settle(page, 600);
    await page.click('[data-testid="sr-vip-big"]'); await settle(page, 1200); await vip(page, (v) => v.freezeAnim(3)); await wait(page, 800); await shot(page, `combined-04-vip-big-who-${lang}`, { quality: 82 });
    const titles = await vip(page, (v) => v.state.decks.map((d) => d.id)); check(`${lang}: four entries on the wall (company deck, two profiles, film)`, JSON.stringify(titles) === '["default","closets-profile","yas-profile","film"]', titles);
    if (lang === 'ar') { const all = await vip(page, (v, x) => JSON.stringify(v.state.decks)); check('ar: the Arabic deck text uses the logo name, not the transliteration', !/ذا كلوزتس/.test(all) && /الخزائن/.test(all)); }
    await page.keyboard.press('Escape'); await settle(page, 600);
    await page.selectOption('[data-testid="sr-vip-deck-select"]', 'default'); await settle(page, 800); await page.click('[data-testid="sr-vip-big"]'); await settle(page, 1200); await wait(page, 800); await shot(page, `combined-05-vip-big-default-${lang}`, { quality: 82 }); await page.keyboard.press('Escape'); await settle(page, 600);
    await page.selectOption('[data-testid="sr-vip-deck-select"]', 'film'); await settle(page, 900);
    await page.waitForFunction(() => { const f = window.__showroom.explore.explorer.film; return f && f.state.status === 'ready' && f.poster; }, null, { timeout: 30000 }).catch(() => {});
    const f0 = await vip(page, (v, x) => ({ s: x.film.state.status, src: x.film.state.src, cap: x.film.state.caption, video: !!x.film.video, poster: !!x.film.poster }));
    check(`${lang}: the REAL manifest is read -> ready and paused, poster loaded, the 1080 source on a desktop, captions default to ${lang}`, f0.s === 'ready' && f0.poster && !f0.video && /journey-1080\.mp4$/.test(f0.src) && f0.cap === lang, f0);
    await page.click('[data-testid="sr-vip-big"]'); await settle(page, 1200); await wait(page, 800); await shot(page, `combined-06-film-poster-${lang}`, { quality: 82 });
    check(`${lang} vip: no page errors`, o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
  }
}
async function film(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }), page = o.page; await mockProjects(page);
  const can = await page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"'));
  if (!can) { check('in-browser MP4 playback NOT EXECUTED: this browser has no H.264 / AAC decoder (run with CHROME=/usr/bin/google-chrome)', false, can); await o.ctx.close(); return; }
  const reqs = []; page.on('response', (r) => { if (/yas-bloom\/film\/.*\.(mp4|vtt)/.test(r.url())) reqs.push(r.url().split('/').pop() + ' ' + r.status()); });
  await enter(page); await enterVip(page); await page.selectOption('[data-testid="sr-vip-deck-select"]', 'film'); await settle(page, 900);
  await page.waitForFunction(() => { const f = window.__showroom.explore.explorer.film; return f && f.state.status === 'ready' && f.poster; }, null, { timeout: 30000 });
  check('before Play: no video or caption bytes were requested (preload none)', reqs.length === 0, reqs);
  await page.click('[data-testid="sr-vip-big"]'); await settle(page, 900); await page.click('[data-testid="sr-vip-film-play"]');
  await page.waitForFunction(() => { const f = window.__showroom.explore.explorer.film; return f.state.status === 'playing' && f.video && f.video.currentTime > 3.2; }, null, { timeout: 90000 }).catch(() => {});
  const st = await vip(page, (v, x) => { const vd = x.film.video; return { s: x.film.state.status, t: vd && vd.currentTime, w: vd && vd.videoWidth, h: vd && vd.videoHeight, dur: vd && vd.duration, muted: vd && vd.muted, src: vd && vd.currentSrc.split('/').pop(), onWall: v.filmOnWall, tracks: vd ? [...vd.textTracks].map((t) => t.language + ':' + t.mode + ':' + (t.cues ? t.cues.length : -1)) : [], cue: x.film.state.cue, err: vd && vd.error && vd.error.code }; });
  check('REAL MP4 plays in the browser with sound: H.264 1920x1080 decoded, 124 s, currentTime advances, the wall shows the video', st.s === 'playing' && st.t > 3 && st.w === 1920 && st.h === 1080 && Math.abs(st.dur - 124) < 1 && st.muted === false && st.onWall && /journey-1080\.mp4/.test(st.src), st);
  check('captions: two tracks (ar, en); the EN track (the page language) is loaded with its cues and the current cue is on the strip', st.tracks.length === 2 && Number((st.tracks.find((t) => /^en:/.test(t)) || '').split(':')[2]) > 5 && st.cue.length > 3, { tracks: st.tracks, cue: st.cue });
  await page.click('[data-testid="sr-vip-film-cc"]'); await page.waitForFunction(() => { const tr = [...window.__showroom.explore.explorer.film.video.textTracks].find((t) => t.language === 'ar'); return tr && tr.cues && tr.cues.length > 5; }, null, { timeout: 30000 }).catch(() => {});
  const arc = await vip(page, (v, x) => ({ cap: x.film.state.caption, n: ([...x.film.video.textTracks].find((t) => t.language === 'ar').cues || []).length, cue: x.film.state.cue }));
  check('the Captions button switches to the Arabic track, which loads with its cues', arc.cap === 'ar' && arc.n > 5, arc); await page.click('[data-testid="sr-vip-film-cc"]'); await page.click('[data-testid="sr-vip-film-cc"]'); await wait(page, 400);
  await setHud(page, false, '.sr-panel'); await wait(page, 300); await shot(page, 'combined-07-film-playing-en', { quality: 82 }); await setHud(page, true);
  await vip(page, (v, x) => x.filmSeek(60)); await page.waitForFunction(() => { const vd = window.__showroom.explore.explorer.film.video; return vd.currentTime > 60.5 && !vd.seeking; }, null, { timeout: 60000 }).catch(() => {});
  check('seek to 1:00 works (byte ranges) and playback continues', (await vip(page, (v, x) => x.film.video.currentTime)) > 60.4, reqs.slice(0, 8));
  check('the video was fetched with 206 partial responses', reqs.some((r) => /\.mp4 206/.test(r)), reqs.slice(0, 8));
  await wait(page, 600); await setHud(page, false, '.sr-panel'); await shot(page, 'combined-08-film-playing-1m-en', { quality: 82 }); await setHud(page, true);
  check('film: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}
async function mobile(b) {
  const o = await L.openShowroom(b, { query: LOW, viewport: { width: 390, height: 844 }, mobile: true }), page = o.page; await mockProjects(page); await enter(page);
  await tp(page, [0, -3.5, 0, 0.04]); await shot(page, 'combined-09-mobile-hall', { quality: 80 });
  await enterVip(page); await page.selectOption('[data-testid="sr-vip-deck-select"]', 'closets-profile'); await settle(page, 800); await imagesReady(page);
  await page.evaluate(() => document.querySelector('[data-testid="sr-vip-next"]').click()); await settle(page, 600); await shot(page, 'combined-10-mobile-vip-panel', { quality: 80 });
  await page.evaluate(() => document.querySelector('[data-testid="sr-vip-read"]').click()); await page.waitForSelector('.sr-vip-reader', { timeout: 30000 }); await wait(page, 1200);
  const r = await page.evaluate(() => { const n = document.querySelector('.sr-vip-reader'); return { sw: n.scrollWidth, cw: n.clientWidth, fs: parseFloat(getComputedStyle(n.querySelector('.sr-vip-bullets') || n).fontSize) }; });
  check('mobile reader: no horizontal overflow and body text >= 20 px', r.sw <= r.cw + 1 && r.fs >= 20, r); await shot(page, 'combined-11-mobile-vip-reader', { quality: 82 });
  await page.evaluate(() => window.__showroom.explore.explorer.setPresentMode('panel')); await wait(page, 600);
  await page.selectOption('[data-testid="sr-vip-deck-select"]', 'film'); await settle(page, 900); await page.waitForFunction(() => window.__showroom.explore.explorer.film.state.status === 'ready', null, { timeout: 30000 }).catch(() => {});
  check('phone / low tier: the 720 source of the REAL manifest is chosen', /journey-720\.mp4$/.test(await vip(page, (v, x) => x.film.state.src)), await vip(page, (v, x) => x.film.state.src));
  check('mobile: no page errors', o.errors.filter((e) => !/ERR_TUNNEL|Failed to load resource/.test(e)).length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}
async function collections(b) {
  const o = await L.openShowroom(b, { query: MED, viewport: { width: 1280, height: 720 } }), page = o.page; await mockProjects(page); await enter(page);
  await tp(page, [18, -4.6, Math.PI, 0.02], 4000); await setHud(page, false); await shot(page, 'combined-12-collections-wall', { quality: 82 }); await setHud(page, true);
  await tp(page, [9, -5.5, Math.PI * 0.75, 0.02], 3500); await setHud(page, false); await shot(page, 'combined-13-collections-from-hall', { quality: 82 }); await setHud(page, true);
  check('collections: no page errors', o.errors.length === 0, o.errors.slice(0, 3)); await o.ctx.close();
}
(async () => {
  const b = await L.launch(), only = process.argv[2], all = { hall, kiosk, vip: vipViews, film, mobile, collections };
  try { for (const [n, fn] of Object.entries(all)) { if (only && only !== n) continue; try { await fn(b); } catch (e) { check(`suite "${n}" ran to the end`, false, String(e && e.message).slice(0, 300)); } for (const c of OPEN) await c.close().catch(() => {}); OPEN.clear(); } } finally { await b.close(); }
  const bad = L.results.filter((r) => !r.ok).length; console.log(`\n${L.results.length - bad}/${L.results.length} checks passed`); process.exit(bad ? 1 : 0);
})();
