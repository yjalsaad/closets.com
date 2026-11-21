/* Flag accuracy check: draws the room's flags (src/showroom3d/vip/flags.js, the SAME drawFlag the wall and the 3D cloth use) and compares them pixel by pixel with the reference SVGs, then cross-checks
 * the Saudi inscription against an independent vectorisation. Reference files (public-domain flag drawings, npm "svg-country-flags" and "flag-icons"):
 *   REF_DIR/bh.svg, REF_DIR/sa.svg (svg-country-flags svg/), REF_DIR/package/flags/4x3/sa.svg (flag-icons)   usage: REF_DIR=<dir> node scripts/showroom3d-qa/flagcheck.js */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
const path = require('path'), D = (process.env.REF_DIR || '') + '/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] }); const page = await b.newPage();
  const src = fs.readFileSync(path.resolve(__dirname, '../../src/showroom3d/vip/flags.js'), 'utf8').replace(/^export /gm, '');
  await page.setContent('<canvas id=a></canvas>');
  const res = await page.evaluate(async ([code, svgs]) => {
    const api = new Function(code + '; return { FLAGS, drawFlag };')();
    const load = (svg) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); });
    const out = {};
    for (const id of ['bh', 'sa']) {
      const F = api.FLAGS[id], W = F.w, H = F.h; const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      const a = mk(), r = mk(); api.drawFlag(a.getContext('2d'), id, 0, 0, W, H); const im = await load(svgs[id]); r.getContext('2d').drawImage(im, 0, 0, W, H);
      const pa = a.getContext('2d').getImageData(0, 0, W, H).data, pr = r.getContext('2d').getImageData(0, 0, W, H).data; let diff = 0, big = 0;
      for (let i = 0; i < pa.length; i += 4) { const d = Math.abs(pa[i] - pr[i]) + Math.abs(pa[i + 1] - pr[i + 1]) + Math.abs(pa[i + 2] - pr[i + 2]); if (d > 0) diff++; if (d > 60) big++; }
      out[id] = { W, H, pixels: W * H, anyDiff: diff, bigDiff: big };
    }
    // independent cross-check of the Saudi inscription: flag-icons' separate vectorisation (4:3 crop) vs ours, white masks normalised to the inscription bounding box (top 55% of the flag)
    const ours = document.createElement('canvas'); ours.width = 750; ours.height = 500; api.drawFlag(ours.getContext('2d'), 'sa', 0, 0, 750, 500);
    const other = document.createElement('canvas'); other.width = 640; other.height = 480; other.getContext('2d').drawImage(await load(svgs.fi), 0, 0, 640, 480);
    const mask = (c, y1) => { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, Math.round(c.height * y1)).data, w = c.width, h = Math.round(c.height * y1); let x0 = w, x1 = 0, y0 = h, y1b = 0; const m = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) { m[y * w + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1b = Math.max(y1b, y); } } return { m, w, x0, x1, y0, y1: y1b }; };
    const A = mask(ours, 0.55), B = mask(other, 0.55); const N = 400, M = 140; let inter = 0, uni = 0;
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) { const ax = Math.round(A.x0 + (A.x1 - A.x0) * i / (N - 1)), ay = Math.round(A.y0 + (A.y1 - A.y0) * j / (M - 1)), bx = Math.round(B.x0 + (B.x1 - B.x0) * i / (N - 1)), by = Math.round(B.y0 + (B.y1 - B.y0) * j / (M - 1)); const a = A.m[ay * A.w + ax], bb = B.m[by * B.w + bx]; if (a && bb) inter++; if (a || bb) uni++; }
    out.saInscriptionIoU = inter / uni; out.bboxOurs = [A.x1 - A.x0, A.y1 - A.y0, (A.x1 - A.x0) / (A.y1 - A.y0)]; out.bboxOther = [B.x1 - B.x0, B.y1 - B.y0, (B.x1 - B.x0) / (B.y1 - B.y0)];
    return out;
  }, [src, { bh: fs.readFileSync(D + 'bh.svg', 'utf8'), sa: fs.readFileSync(D + 'sa.svg', 'utf8'), fi: fs.readFileSync(D + 'package/flags/4x3/sa.svg', 'utf8') }]);
  console.log(JSON.stringify(res, null, 1)); await b.close(); process.exit(res.bh.bigDiff === 0 && res.sa.bigDiff === 0 && res.saInscriptionIoU > 0.8 ? 0 : 1);
})();
