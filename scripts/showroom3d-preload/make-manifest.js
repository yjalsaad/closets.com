/* Builds src/showroom3d/preload/manifest.json: every static file the showroom shows (except the VIP film videos, which filmPreload.js owns), with its size, a short content hash,
 * a priority group and the quality tiers that use it. The whole-manifest hash is the Cache Storage version, so a changed / added / removed file makes a new cache and the old one is deleted.
 *
 *   node scripts/showroom3d-preload/make-manifest.js          write the manifest
 *   node scripts/showroom3d-preload/make-manifest.js --check  exit 1 when the committed manifest does not match public/ (the Jest test runs the same check)
 *
 * Groups (p = download order): 10 hall (kiosk portraits, realism textures + HDRI, YAS Wood gallery, Ikhtarha stage) -> 20 rooms (collections swatches, design-studio posters of the page language)
 *                              -> 30 vip (profile deck photos, film posters) -> 40 alt (the other language's design-studio posters).
 * `k` = the tiers that use the file (h = high, m = medium, l = low); `l` marks the language of a language-specific file. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../..'), PUB = path.join(ROOT, 'public'), OUT = path.join(ROOT, 'src/showroom3d/preload/manifest.json');
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
const rel = (f) => '/' + path.relative(PUB, f).split(path.sep).join('/');
const sha = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
const PRE = [
  // [regex on the public path, group, priority, tiers, language(opt)]
  [/^\/yas-bloom\/staff\/[a-z0-9-]+\.webp$/, 'hall', 10, 'hml'],
  [/^\/yas-bloom\/realism\/tex\/[a-z]+_(a|n|orm)\.webp$/, 'hall', 11, 'hml'],
  [/^\/yas-bloom\/realism\/studio_warm_512\.hdr$/, 'hall', 12, 'hml'],
  [/^\/yas-bloom\/realism\/gallery\/[a-z0-9-]+\.webp$/, 'hall', 13, 'hml'],
  [/^\/brand\/ikhtarha\/(hero-wide\.jpg|logo-light-1040\.webp)$/, 'hall', 14, 'hml'],
  [/^\/yas-bloom\/collections\/[^/]+\/[a-z0-9-]+-thumb\.webp$/, 'rooms', 20, 'hm'],
  [/^\/yas-bloom\/collections\/[^/]+\/[a-z0-9-]+-small\.webp$/, 'rooms', 20, 'l'],
  [/^\/yas-bloom\/profile\/[a-z0-9-]+\.webp$/, 'vip', 30, 'hml'],
  [/^\/yas-bloom\/film\/[a-z0-9-]+-poster\.jpg$/, 'vip', 31, 'hml'],
];
function build() {
  const files = walk(path.join(PUB, 'yas-bloom')).concat(walk(path.join(PUB, 'brand/ikhtarha'))).map(rel).sort(), assets = [];
  for (const u of files) {
    let hit = PRE.find((r) => r[0].test(u)), a;
    const ds = /^\/yas-bloom\/design-studio\/([a-z]+)-(\d+)-(en|ar)\.webp$/.exec(u);
    if (ds) { const frame = Number(ds[2]), lang = ds[3]; a = { u, g: 'rooms', p: 21, k: frame === 1 ? 'hml' : 'hm', l: lang }; }
    else if (hit) a = { u, g: hit[1], p: hit[2], k: hit[3] };
    else continue;
    const f = path.join(PUB, u); a.b = fs.statSync(f).size; a.h = sha(f); assets.push(a);
  }
  const version = crypto.createHash('sha1').update(assets.map((a) => [a.u, a.b, a.h, a.k, a.l || ''].join('|')).join('\n')).digest('hex').slice(0, 10);
  return { version, count: assets.length, bytes: assets.reduce((s, a) => s + a.b, 0), assets };
}
const text = (m) => JSON.stringify(m) + '\n';
if (require.main === module) {
  const m = build();
  if (process.argv.includes('--check')) { const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''; if (cur !== text(m)) { console.error('src/showroom3d/preload/manifest.json is stale: run node scripts/showroom3d-preload/make-manifest.js'); process.exit(1); } console.log('manifest up to date', m.version, m.count, 'files'); }
  else { fs.writeFileSync(OUT, text(m)); console.log('wrote', OUT, m.version, m.count, 'files', (m.bytes / 1024).toFixed(0) + ' KB'); }
}
module.exports = { build, text };
