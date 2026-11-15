/* Emulation of Vercel's static routing for a CRA build + vercel.json, for QA only (no Vercel needed).
 * Order (as documented for Vercel): headers are matched against the REQUEST path and merged; then the filesystem (exact file, else <dir>/index.html);
 * then rewrites in order (first match wins; the destination is again looked up on the filesystem); otherwise 404.
 * Source patterns use path-to-regexp (Vercel uses v6; /opt/node-tools has 3.x, which parses the same constructs used here: (.*), :path*, (a|b)).
 * Default Cache-Control for a file is Vercel's `public, max-age=0, must-revalidate`; a matching header rule replaces it for the same key.
 * Real-Vercel differences are checked against a preview deployment (see the PR). usage: const { route } = require('./vercel-emu'); route(vercelJson, buildDir, '/yas-bloom') */
const fs = require('fs'), path = require('path');
let p2r; for (const c of ['/opt/node-tools/node_modules/path-to-regexp', 'path-to-regexp']) { try { p2r = require(c); break; } catch (e) { /* next */ } }
const rx = (src) => { const keys = []; const re = p2r(src, keys, { strict: false, sensitive: false }); return (p) => re.exec(p); };
const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } };
const fsLookup = (dir, p) => {
  const f = path.join(dir, p); if (!f.startsWith(dir)) return null;
  if (isFile(f)) return f;
  const i = path.join(f, 'index.html'); return isFile(i) ? i : null;
};
function route(cfg, dir, reqPath) {
  const headers = { 'cache-control': 'public, max-age=0, must-revalidate' }, hrules = [];
  for (const h of cfg.headers || []) if (rx(h.source)(reqPath)) { hrules.push(h.source); for (const x of h.headers) headers[x.key.toLowerCase()] = x.value; }
  let file = fsLookup(dir, decodeURIComponent(reqPath)), via = file ? 'filesystem' : null, rule = null;
  if (!file) for (const r of cfg.rewrites || []) if (rx(r.source)(reqPath)) { file = fsLookup(dir, r.destination); via = 'rewrite'; rule = r.source; break; }
  if (!file) return { status: 404, file: null, via: 'none', headers, hrules };
  return { status: 200, file, rel: path.relative(dir, file), via, rule, headers, hrules };
}
module.exports = { route };
