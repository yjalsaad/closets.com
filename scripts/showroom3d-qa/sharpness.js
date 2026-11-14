/* Sharpness QA: the drawing-buffer size and 100% crops of signage / kiosk text on an emulated iPhone 14 Pro (393 x 852 CSS px, dpr 3) and on desktops (dpr 1 and 2).
 *   BASE=http://localhost:5071 OUT=<dir> LABEL=after node scripts/showroom3d-qa/sharpness.js [phone-medium|phone-low|desk2x-medium|desk1x-high ...]
 * The QA browser renders with software GL, which the showroom would put on the Performance tier; each case therefore names the tier a REAL device of that kind gets
 * (?quality=), so the numbers are the real policy, only slower. Compare two builds by running it twice with LABEL=before / LABEL=after. */
const L = require('./lib.js');
const fs = require('fs'), path = require('path');
const LABEL = process.env.LABEL || 'after';
const CASES = {
  'phone-medium': { viewport: { width: 393, height: 852 }, dpr: 3, mobile: true, tier: 'medium' },
  'phone-low': { viewport: { width: 393, height: 852 }, dpr: 3, mobile: true, tier: 'low' },
  'desk2x-medium': { viewport: { width: 1280, height: 720 }, dpr: 2, tier: 'medium' },
  'desk2x-high': { viewport: { width: 1280, height: 720 }, dpr: 2, tier: 'high' },
  'desk1x-high': { viewport: { width: 2560, height: 1440 }, dpr: 1, tier: 'high' },
  'desk1x-medium': { viewport: { width: 2560, height: 1440 }, dpr: 1, tier: 'medium' },
};
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async () => {
  const { chromium } = require('/opt/node-tools/node_modules/playwright');
  const b = await L.launch(), out = {}, want = process.argv.slice(2);
  for (const [name, c] of Object.entries(CASES)) {
    if (want.length && !want.includes(name)) continue;
    const ctx = await b.newContext({ viewport: c.viewport, deviceScaleFactor: c.dpr, isMobile: !!c.mobile, hasTouch: !!c.mobile, userAgent: c.mobile ? UA : undefined });
    const page = await ctx.newPage(); page.setDefaultTimeout(600000);
    try {
      await page.goto(`${L.BASE}/yas-bloom?debug=1&quality=${c.tier}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__showroom && window.__showroom.ready, null, { timeout: 600000 });
      for (let i = 0; i < 200; i++) { const ph = await page.evaluate(() => { const s = document.querySelector('[data-testid="sr-skip"]'); if (s) s.click(); const st = document.querySelector('.sr-stage'); return st && st.dataset.phase; }); if (ph === 'explore') break; await page.waitForTimeout(2000); }
      await page.evaluate(() => { try { localStorage.setItem('closets_showroom_coach', '1'); } catch (e) { /* ignore */ } const d = document.querySelector('[data-testid="sr-coach-done"]'); if (d) d.click(); });
      await page.waitForFunction(() => { const e = window.__showroom.engine; return e.realism === 'ready' || e.realism === 'procedural'; }, null, { timeout: 600000 }).catch(() => {});
      const pos = await page.evaluate(() => window.__showroom.engine.staff.item('kitchens').def.at), near = [pos[0] + 1.5, pos[1] + 0.5];
      await page.evaluate((a) => window.__showroom.explore.teleport(...a), [near[0], near[1], Math.atan2(-(pos[0] - near[0]), -(pos[1] - near[1])), 0.02]);
      await page.waitForTimeout(c.mobile ? 9000 : 14000);
      await page.evaluate(() => document.querySelectorAll('.sr-hud, .sr-coach, .sr-touch, [data-testid="sr-talk"], [data-testid="sr-greet-bubble"]').forEach((n) => { n.style.visibility = 'hidden'; }));
      await page.waitForTimeout(1500);
      const info = await page.evaluate(() => { const i = window.__showroom.info(), cv = document.querySelector('.sr3d canvas'), r = cv.getBoundingClientRect(), gl = window.__showroom.engine.renderer.getContext(); return { tier: i.tier, buffer: [cv.width, cv.height], css: [Math.round(r.width), Math.round(r.height)], dpr: window.devicePixelRatio, ratio: Math.round((cv.width / r.width) * 100) / 100, antialias: gl.getContextAttributes().antialias, samples: gl.getParameter(gl.SAMPLES), fps: i.fps, calls: i.calls, triangles: i.triangles, textures: i.textures }; });
      out[name] = info; console.log(LABEL, name, JSON.stringify(info));
      await page.screenshot({ path: path.join(L.OUT, `sharp-${LABEL}-${name}.png`), type: 'png', timeout: 600000 });
      // a second view: the bay sign across the aisle
      await page.evaluate(() => window.__showroom.explore.teleport(-6.5, -7.9, Math.PI / 2, 0.12)); await page.waitForTimeout(c.mobile ? 7000 : 12000);
      await page.screenshot({ path: path.join(L.OUT, `sharp-${LABEL}-${name}-sign.png`), type: 'png', timeout: 600000 });
    } catch (e) { out[name] = { error: String(e && e.message).slice(0, 200) }; console.log(LABEL, name, 'ERROR', out[name].error); }
    await ctx.close();
  }
  await b.close(); fs.writeFileSync(path.join(L.OUT, `sharp-${LABEL}.json`), JSON.stringify(out, null, 1));
})();
