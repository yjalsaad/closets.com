/* Routing matrix before / after (local emulation of vercel.json, see vercel-emu.js): for each URL, the status, which file is served (and its sha256) and the response headers.
 * usage: node scripts/showroom3d-qa/routing-matrix.js <beforeBuildDir> <beforeVercelJson> <afterBuildDir> <afterVercelJson> [controlBuildDir]
 * Exit code 1 if any URL outside the four showroom URLs differs in status, served file content or headers (apart from the intended immutable /static caching). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { route } = require('./vercel-emu');
const [bd, bj, ad, aj, cd] = process.argv.slice(2).map((p) => path.resolve(p));   // cd (optional): a second build of the BEFORE source, to show which files are not reproducible between two identical builds
const B = JSON.parse(fs.readFileSync(bj, 'utf8')), A = JSON.parse(fs.readFileSync(aj, 'utf8'));
const URLS = ['/', '/booking', '/kitchen', '/services', '/contact', '/studio/tv', '/design-studio/kitchen-planner', '/account', '/ar', '/ar/booking', '/nonexistent', '/wardrobes', '/about', '/blog',
  '/campaign/ikhtarha', '/ikhtarha/games', '/visualizer', '/showroom-3d', '/ar/showroom-3d', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/manifest.json', '/pay.html',
'/yas-bloom', '/yas-bloom/', '/ar/yas-bloom', '/ar/yas-bloom/', '/yas-bloom/foo', '/ar/yas-bloom/foo', '/yas-bloom/shell.html',
  '/static/css/main.6582cfed.css', '/yas-bloom/film/films.json', '/yas-bloom/realism/studio_warm_512.hdr', '/yas-bloom/staff/vip.webp', '/yas-bloom/realism/missing.webp', '/brand/ikhtarha/logo-light.png'];
URLS.push(...['/yas-bloom?vipdeck=meeting'].map((u) => u));
const SHOWROOM_NS = (u) => /^\/(ar\/)?yas-bloom(\/|\?|$)/.test(u);
// every deploy that touches the showroom chunk renames main.<hash>.js (its chunk map changes), and every prerendered HTML names that file: compare HTML with those two hashes masked
const mask = (f, b) => (/\.html$/.test(f) ? Buffer.from(b.toString('utf8').replace(/\/static\/js\/main\.[0-9a-f]{8}\.js/g, '/static/js/main.<H>.js')) : b);
const sha = (f) => (f ? crypto.createHash('sha256').update(mask(f, fs.readFileSync(f))).digest('hex').slice(0, 10) : '-');
const hdr = (h) => Object.entries(h).filter(([k]) => /cache-control|x-robots/.test(k)).map(([k, v]) => (k === 'cache-control' ? 'cc=' : 'xrt=') + v).join(' | ');
let bad = 0; const rows = [];
for (const u of [...new Set(URLS)]) {
  const pu = u.split('?')[0], b = route(B, bd, pu), a = route(A, ad, pu), bh = b.file ? sha(b.file) : '-', ah = a.file ? sha(a.file) : '-';
  const same = b.status === a.status && bh === ah && hdr(b.headers) === hdr(a.headers);
  const staticOnly = !same && b.status === a.status && /^\/static\//.test(u);
  const c = cd ? route(B, cd, pu) : null, flaky = !same && c && b.file && c.file && sha(c.file) !== bh;   // before != a second build of the same source: the prerender snapshot of / and /how-it-works is not reproducible
  const note = flaky && b.status === a.status && hdr(b.headers) === hdr(a.headers) && !SHOWROOM_NS(u) ? 'same (prerender not reproducible: control build differs too)' : same ? 'same' : (SHOWROOM_NS(u) ? 'CHANGED (showroom namespace, intended)' : (staticOnly ? 'cache header only (intended)' : 'DIFFERENT'));
  if (note === 'DIFFERENT') bad++;
  rows.push({ url: u, before: `${b.status} ${b.rel || '-'} [${bh}] ${hdr(b.headers)}`, after: `${a.status} ${a.rel || '-'} [${ah}] ${hdr(a.headers)}`, note });
}
for (const r of rows) console.log(`${r.note.padEnd(32)} ${r.url}\n    before: ${r.before}\n    after : ${r.after}`);
console.log(bad ? `\n${bad} unintended difference(s)` : '\nno unintended differences'); process.exit(bad ? 1 : 0);
