const path = require('path'); const fs = require('fs'); const { chromium } = require('/opt/node-tools/node_modules/playwright'); const S = require('./shell.cjs');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const bd = path.join(__dirname, 'out-roadmap'); S.write(bd, 'Lead Roadmap');
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; const lerp = (a, b, t) => a + (b - a) * t;
(async () => {
  const b = await chromium.launch({ executablePath: S.EXE, args: ['--no-sandbox'] });
  const open = async (w, h, q, dpr = 2) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: w < 500 }); const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
    await p.goto('file://' + path.join(bd, 'index.html') + '?' + q); await p.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }); await p.waitForTimeout(600); return { ctx, p }; };
  // 1. EN dark desktop: still + the drag sequence
  { const { ctx, p } = await open(1440, 900, 'lang=en&theme=dark&undo=4000'); let n = 0; let cx = 0, cy = 0, dn = false; const track = []; const shot = async (tag) => { track.push({ x: +cx.toFixed(1), y: +cy.toFixed(1), down: dn }); await p.screenshot({ path: path.join(OUT, `rm-drag-${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 }); };
    const mv = p.mouse.move.bind(p.mouse); p.mouse.move = async (x, y, o) => { cx = x; cy = y; return mv(x, y, o); }; const md = p.mouse.down.bind(p.mouse), mu = p.mouse.up.bind(p.mouse); p.mouse.down = async () => { dn = true; return md(); }; p.mouse.up = async () => { dn = false; return mu(); };
    const name = 'Tulip Duplex'; const sel = `[data-testid=lr-card]:has(.lr-name:text("${name}"))`;
    const c = async (s, dy = 0) => { const bb = await p.locator(s).first().boundingBox(); return { x: bb.x + bb.width / 2 - 20, y: bb.y + Math.min(bb.height / 2, 40) + dy }; };
    const from = await c(sel); const to = await c('[data-testid=lr-col-Quoted] .lr-col-head', 175);
    for (let i = 0; i < 12; i++) await shot();                                           // idle board
    await p.mouse.move(from.x + 360, from.y - 240); for (let i = 1; i <= 24; i++) { const k = ease(i / 24); await p.mouse.move(lerp(from.x + 360, from.x, k), lerp(from.y - 240, from.y, k)); await shot(); }
    for (let i = 0; i < 6; i++) await shot();
    await p.mouse.down(); await p.mouse.move(from.x + 14, from.y + 6, { steps: 3 }); await shot(); await shot();
    const N = 52; for (let i = 1; i <= N; i++) { const k = ease(i / N); await p.mouse.move(lerp(from.x + 14, to.x, k), lerp(from.y + 6, to.y, k) - Math.sin(k * Math.PI) * 26); await shot(); }
    for (let i = 0; i < 8; i++) await shot();
    await p.mouse.up(); for (let i = 0; i < 40; i++) await shot();
    fs.writeFileSync(path.join(OUT, 'track.json'), JSON.stringify(track)); console.log('drag frames', n); await ctx.close(); }
  // 2. EN dark desktop slow scroll of the board (columns) not needed; AR dark desktop still + phone EN/AR stills
  for (const [name, w, h, q] of [['rm-ar', 1440, 900, 'lang=ar&theme=dark'], ['rm-en', 1440, 900, 'lang=en&theme=dark'], ['rm-phone-en', 390, 844, 'lang=en&theme=dark'], ['rm-phone-ar', 390, 844, 'lang=ar&theme=dark']]) {
    const { ctx, p } = await open(w, h, q, w < 500 ? 3 : 2); await p.screenshot({ path: path.join(OUT, name + '.png') }); await ctx.close(); }
  await b.close();
})();
