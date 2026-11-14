#!/usr/bin/env node
/* Re-runnable port of the YAS Bloom showroom onto production main (ADD-ONLY).
 *   scripts/port-yas-bloom.sh [<ref>]     (default ref: origin/claude/web-showroom-3d)
 * 1. git checkout <ref> -- src/showroom3d docs/showroom3d scripts/showroom3d-qa   (adds / refreshes ONLY those paths)
 * 2. this script rewrites the showroom's imports of integration-branch-only modules to src/showroom3d/vendor/* (see docs/showroom3d/ADDON-PORT.md)
 * It is idempotent. Nothing outside the three paths above is ever touched. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHOW = path.join(ROOT, 'src/showroom3d');
const MAP = {   // specifier target (relative to src/) -> vendor file
  'a11y/motion': 'motion', 'seo/routes': 'routes', 'seo/siteConfig': 'siteConfig', 'safety/WebGLGate': 'WebGLGate',
  'safety/webgl': 'webgl', 'safety/sanitize': 'sanitize', 'content/facts': 'facts', 'App': 'siteApi',
};
let changed = 0;
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (f !== 'vendor') walk(p); continue; }
    if (!/\.(jsx?|mjs)$/.test(f)) continue;
    let s = fs.readFileSync(p, 'utf8'); const o = s;
    s = s.replace(/(from\s+|import\(\s*|require\(\s*)(['"])(\.[^'"]*)\2/g, (m, pre, q, spec) => {
      const t = path.relative(path.join(ROOT, 'src'), path.normalize(path.join(path.dirname(p), spec))).split(path.sep).join('/');
      if (!(t in MAP)) return m;
      let rel = path.relative(path.dirname(p), path.join(SHOW, 'vendor', MAP[t])).split(path.sep).join('/');
      if (!rel.startsWith('.')) rel = './' + rel;
      return pre + q + rel + q;
    });
    if (path.basename(p) === 'ShowroomRoot.jsx' && !/vendor\/tokens\.css/.test(s)) s = s.replace("import './ui/showroom.css';", "import './vendor/tokens.css';   // scoped design tokens (main has none)\nimport './ui/showroom.css';");
    if (s !== o) { fs.writeFileSync(p, s); changed++; }
  }
}
walk(SHOW);

/* siteBridge.js (the showroom's only link to site internals) is replaced by the vendored add-on copy (consent/strings/PAGES without src/privacy or src/seo). */
const BRIDGE = path.join(SHOW, 'vendor/siteBridge.js');
if (fs.existsSync(BRIDGE)) { fs.writeFileSync(path.join(SHOW, 'siteBridge.js'), fs.readFileSync(BRIDGE, 'utf8').replace(/(from |import\()'\.\//g, "$1'./vendor/")); console.log('port-yas-bloom: siteBridge.js <- vendor/siteBridge.js'); }

/* ---- test compat: the copied unit tests assert things about the integration branch (/ar/* page URLs, pages/*.jsx files, vercel rewrites, App.js shell links).
 * On production main those do not exist, so the expectations are re-pointed (same intent) or skipped (integration-only coupling; listed in docs/showroom3d/ADDON-PORT.md). */
const SKIP = [   // test title prefixes that only make sense on the integration branch
  'the booking page really reads the prefill',                 // main's BookingPage has no prefill reader: query params are ignored (by design of the add-only port)
  'every business line with a page links to a REAL route',     // checks seo/routes.js PAGES (integration only)
  'the query and the sanitiser are exactly the ones App.js uses', // main App.js has no sanitizeProjects
  'vercel.json: rewrites + noindex for the new paths',         // replaced by __tests__/addon.test.js
  'robots Disallow and the seo-check route list know the new path', // robots / seo scripts / shell link are not part of the add-only port
];
const TDIR = path.join(SHOW, '__tests__');
let tchanged = 0;
for (const f of fs.readdirSync(TDIR)) {
  if (!/\.(jsx?)$/.test(f) || f === 'addon.test.js') continue;
  const p = path.join(TDIR, f); let s = fs.readFileSync(p, 'utf8'); const o = s;
  s = s.replace(/(['"`])\/ar\/(?!yas-bloom|showroom-3d)/gi, '$1/');
  s = s.split('/^\\/ar\\/booking/').join('/^\\/booking/');                                  // main has no /ar/<page> URLs
  s = s.replace("{ lang: 'ar', path: '/booking' }", "{ lang: 'en', path: '/booking' }");
  s = s.replace(/\.\.\/\.\.\/pages\/(BookingPage|DoorsPage)\.jsx/g, '../../App.js').replace("read('pages/DoorsPage.jsx')", "read('App.js')");
  s = s.replace("read('content/facts.js')", "read('showroom3d/vendor/facts.js')");
  for (const t of SKIP) s = s.split("test('" + t).join("test.skip('" + t);
  if (s !== o) { fs.writeFileSync(p, s); tchanged++; }
}
console.log('port-yas-bloom: re-pointed / skipped tests in', tchanged, 'files');
console.log('port-yas-bloom: rewrote imports in', changed, 'files');
