// node render.cjs <workdir> <startFrame> <endFrame> [fps=24]   -> <workdir>/frames/f00000.jpg ...   (film.html is copied into workdir; assets/ lives there)
// node render.cjs <workdir> t:<sec>,<sec>...                  -> preview stills <workdir>/prev/p<sec>.jpg
const fs = require('fs'), path = require('path'); const { chromium } = require('/opt/node-tools/node_modules/playwright');
const [work, a, b, fpsArg] = process.argv.slice(2); const fps = Number(fpsArg || 24);
fs.copyFileSync(path.join(__dirname, 'film.html'), path.join(work, 'film.html'));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--allow-file-access-from-files', '--font-render-hinting=none'] });
  const p = await (await br.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage(); p.on('pageerror', (e) => console.log('PAGEERR', e.message)); p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 150)));
  await p.goto('file://' + path.join(work, 'film.html')); await p.evaluate(() => window.ready);
  if (a.startsWith('t:')) { fs.mkdirSync(path.join(work, 'prev'), { recursive: true }); for (const t of a.slice(2).split(',')) { await p.evaluate((x) => window.renderAt(x), Number(t)); await p.screenshot({ path: path.join(work, 'prev', `p${t}.jpg`), type: 'jpeg', quality: 90 }); } }
  else { fs.mkdirSync(path.join(work, 'frames'), { recursive: true }); for (let i = Number(a); i < Number(b); i++) { await p.evaluate((x) => window.renderAt(x), i / fps); await p.screenshot({ path: path.join(work, 'frames', `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 }); } }
  await br.close();
})();
