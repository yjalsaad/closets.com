/* Realism pass QA: a fixed set of key views, screenshotted with a label (before / after) + per-view render stats.
 *   LABEL=before OUT=/tmp/shots node scripts/showroom3d-qa/realism.js [tier=high] ; ONLY=hall,kitchen to restrict; TIER=medium|low
 * Needs a served build:  node scripts/showroom3d-qa/serve.js build 5055 */
const L = require('./lib.js');
const fs = require('fs'), path = require('path');
const LABEL = process.env.LABEL || 'after', TIER = process.env.TIER || 'high', ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const SP = Math.PI / 2;
const VIEWS = [
  ['hall', [0, -9, 0, 0.05]], ['entrance', [0, 3, 0, 0.08]], ['reception', [-5.2, -3.6, 0, 0.0]],
  ['kitchen', [-12.5, -7.9, SP, 0.05]], ['wardrobe', [-12.5, -15.5, SP, 0.05]], ['walkin', [-12.5, -23.1, SP, 0.05]], ['bedroom', [-12.5, -30.7, SP, 0.05]],
  ['doors', [12.5, -7.9, -SP, 0.05]], ['living', [12.5, -15.5, -SP, 0.05]], ['studio', [12.5, -23.1, -SP, 0.05]], ['lounge', [12.5, -30.7, -SP, 0.05]],
  ['vip', [-2.0, -29.2, 0.5, 0.05]], ['hall-far', [0, -31, Math.PI, 0.05]],
];
const setHud = (page, on) => page.evaluate((on) => document.querySelectorAll('.sr-hud, .sr-panel, .sr-coach, .sr-touch, .sr-greet, [data-testid="sr-greet-bubble"], [data-testid="sr-talk"]').forEach((n) => { n.style.visibility = on ? '' : 'hidden'; }), on);
const dismiss = (page) => page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const b = document.querySelector('[data-testid="sr-coach-done"]'); if (b) b.click(); });
async function run() {
  const b = await L.launch(); const stats = {};
  const want = (n) => !ONLY.length || ONLY.includes(n);
  const o = await L.openShowroom(b, { query: `debug=1&quality=${TIER}&aa=0`, viewport: { width: 1100, height: 620 } }); const page = o.page;
  await L.enterExplore(page); await dismiss(page); await page.waitForTimeout(3000);
  const wait = TIER === 'high' ? 6500 : 3500;
  let i = 0;
  for (const [name, p] of VIEWS) {
    i++; if (!want(name)) continue;
    await L.ex(page, (e, a) => e.teleport(...a), p); await page.waitForTimeout(wait); await setHud(page, false); await page.waitForTimeout(250);
    await L.shot(page, `${LABEL}-${String(i).padStart(2, '0')}-${name}`, { quality: 80 }); stats[name] = await page.evaluate(() => { const x = window.__showroom.info(); return { calls: x.calls, tris: x.triangles, tex: x.textures, geo: x.geometries }; }); await setHud(page, true);
  }
  // characters: stand 1.7 m in front of the advisers (EN)
  for (const id of ['reception', 'kitchens', 'wardrobes']) {
    if (!want('char-' + id)) continue; i++;
    const pos = await page.evaluate((id) => { const S = window.__showroom.engine.staff, it = S.item(id); return it.def.at; }, id);
    const near = id === 'reception' ? [pos[0], pos[1] + 1.55] : [pos[0] + (pos[0] < 0 ? 1.15 : -1.15), pos[1]];
    const yaw = Math.atan2(-(pos[0] - near[0]), -(pos[1] - near[1]));
    await L.ex(page, (e, a) => e.teleport(...a), [near[0], near[1], yaw, 0.12]); await page.waitForTimeout(wait + 1500); await setHud(page, false); await page.waitForTimeout(250);
    await L.shot(page, `${LABEL}-${String(i).padStart(2, '0')}-char-${id}`, { quality: 82 }); await setHud(page, true);
  }
  await o.ctx.close();
  // Arabic + mobile
  if (want('ar')) {
    const a = await L.openShowroom(b, { url: '/ar/yas-bloom', query: `debug=1&quality=${TIER}&aa=0`, viewport: { width: 1100, height: 620 } }); await L.enterExplore(a.page); await dismiss(a.page); await a.page.waitForTimeout(2500);
    await L.ex(a.page, (e, x) => e.teleport(...x), [-5.2, -3.6, 0, 0]); await a.page.waitForTimeout(wait); await setHud(a.page, false); await a.page.waitForTimeout(200);
    await L.shot(a.page, `${LABEL}-90-ar-reception`, { quality: 80 });
    await L.ex(a.page, (e, x) => e.teleport(...x), [-12.5, -7.9, SP, 0.05]); await a.page.waitForTimeout(wait); await L.shot(a.page, `${LABEL}-91-ar-kitchen-sign`, { quality: 80 }); await a.ctx.close();
  }
  if (want('mobile')) {
    const m = await L.openShowroom(b, { query: `debug=1&quality=low&aa=0`, viewport: { width: 390, height: 844 }, mobile: true }); await L.enterExplore(m.page, { tap: true }); await dismiss(m.page); await m.page.waitForTimeout(2000);
    await L.ex(m.page, (e, x) => e.teleport(...x), [0, -9, 0, 0.05]); await m.page.waitForTimeout(3500); await setHud(m.page, false); await L.shot(m.page, `${LABEL}-95-mobile-hall`, { quality: 80 });
    await L.ex(m.page, (e, x) => e.teleport(...x), [-12.5, -7.9, SP, 0.05]); await m.page.waitForTimeout(3500); await L.shot(m.page, `${LABEL}-96-mobile-kitchen`, { quality: 80 }); await m.ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(L.OUT, `${LABEL}-stats-${TIER}.json`), JSON.stringify(stats, null, 1)); console.log('STATS', JSON.stringify(stats));
}
run().catch((e) => { console.error(e); process.exit(1); });
