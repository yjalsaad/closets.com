/* eslint-disable */
/**
 * Automated SEO check over the PRERENDERED build output (run after `npm run build`):
 *   BUILD_PATH=/tmp/webbuild node scripts/seo-check.js
 * Exits non-zero on any failure. No network: it only reads files in the build dir + vercel.json.
 * Checks: per-route title/description/canonical/hreflang/og/twitter/robots/JSON-LD, exactly one <h1>, real <a href> links,
 * <html lang dir>, unique titles, sitemap <-> files, robots.txt, 404.html, vercel.json routing table, no foreign origins, no raw i18n keys.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { SITE_URL, ENABLE_AR_URLS } = require('../src/seo/siteConfig');
const { PAGES, INDEXABLE, LEGACY_REDIRECTS, buildHead, withLang, absUrl } = require('../src/seo/routes');

const BUILD_DIR = path.resolve(process.cwd(), process.env.BUILD_PATH || 'build');
const errors = []; const notes = [];
const bad = (m) => errors.push(m);
const langs = ENABLE_AR_URLS ? ['en', 'ar'] : ['en'];
const fileFor = (url) => path.join(BUILD_DIR, url === '/' ? 'index.html' : url.slice(1) + '/index.html');
const dom = (file) => new JSDOM(fs.readFileSync(file, 'utf8'));
const meta = (d, sel) => { const e = d.window.document.head.querySelector(sel); return e ? e.getAttribute('content') : null; };

// ---- routing table (vercel.json) --------------------------------------------------------------
const vercel = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8'));
const toRe = (src) => new RegExp('^' + src.replace(/:[A-Za-z]+\*/g, '.*').replace(/:[A-Za-z]+/g, '[^/]+') + '$');
function resolveRoute(p) {
  if (fs.existsSync(fileFor(p))) return 'static';
  for (const r of vercel.redirects || []) if (toRe(r.source).test(p)) return 'redirect:' + r.destination;
  for (const r of vercel.rewrites || []) if (toRe(r.source).test(p)) return 'rewrite:' + r.destination;
  return '404';
}

// ---- pages ----------------------------------------------------------------------------------------
const titles = new Map(); const descs = new Map();
const sampleLinks = new Set();
for (const e of INDEXABLE) for (const L of langs) {
  const url = withLang(e.path, L); const file = fileFor(url); const tag = '[' + url + '] ';
  if (!fs.existsSync(file)) { bad(tag + 'prerendered file missing: ' + file); continue; }
  const exp = buildHead(e.page, L); const d = dom(file); const doc = d.window.document;
  const h = doc.documentElement;
  if (h.getAttribute('lang') !== L) bad(tag + '<html lang> = ' + h.getAttribute('lang'));
  if (h.getAttribute('dir') !== (L === 'ar' ? 'rtl' : 'ltr')) bad(tag + '<html dir> = ' + h.getAttribute('dir'));
  if (doc.title !== exp.title) bad(tag + 'title mismatch: ' + doc.title);
  if (titles.has(doc.title)) bad(tag + 'duplicate title with ' + titles.get(doc.title)); titles.set(doc.title, url);
  const desc = meta(d, 'meta[name="description"]');
  if (!desc || desc.length < 50 || desc.length > 200) bad(tag + 'description length ' + (desc ? desc.length : 0) + ' (want 50-200)');
  if (descs.has(desc)) bad(tag + 'duplicate description with ' + descs.get(desc)); descs.set(desc, url);
  if (doc.title.length > 75) bad(tag + 'title too long (' + doc.title.length + ')');
  const can = doc.head.querySelector('link[rel="canonical"]');
  if (!can || can.getAttribute('href') !== absUrl(e.path, L)) bad(tag + 'canonical ' + (can && can.getAttribute('href')) + ' != ' + absUrl(e.path, L));
  if (doc.head.querySelectorAll('link[rel="canonical"]').length !== 1) bad(tag + 'need exactly one canonical');
  const alts = [...doc.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((a) => a.getAttribute('hreflang') + '=' + a.getAttribute('href'));
  const wantAlts = ENABLE_AR_URLS ? ['en=' + absUrl(e.path, 'en'), 'ar=' + absUrl(e.path, 'ar'), 'x-default=' + absUrl(e.path, 'en')] : [];
  if (alts.slice().sort().join('|') !== wantAlts.slice().sort().join('|')) bad(tag + 'hreflang set wrong: ' + alts.join(','));
  for (const [k, v] of [['og:title', doc.title], ['og:description', desc], ['og:url', absUrl(e.path, L)], ['og:image', SITE_URL + '/og-image.jpg']]) {
    if (meta(d, 'meta[property="' + k + '"]') !== v) bad(tag + k + ' wrong: ' + meta(d, 'meta[property="' + k + '"]'));
  }
  if (meta(d, 'meta[property="og:locale"]') !== (L === 'ar' ? 'ar_AR' : 'en_US')) bad(tag + 'og:locale wrong');
  for (const k of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) if (!meta(d, 'meta[name="' + k + '"]')) bad(tag + k + ' missing');
  if (!/index/.test(meta(d, 'meta[name="robots"]') || '') || /noindex/.test(meta(d, 'meta[name="robots"]') || '')) bad(tag + 'robots meta not indexable');
  // JSON-LD
  const lds = [...doc.head.querySelectorAll('script[type="application/ld+json"]')];
  if (lds.length !== 1) bad(tag + 'expected 1 JSON-LD block, found ' + lds.length);
  else {
    try {
      const j = JSON.parse(lds[0].textContent); const types = j['@graph'].map((n) => n['@type']);
      for (const t of ['HomeGoodsStore', 'WebSite']) if (!types.includes(t)) bad(tag + 'JSON-LD missing ' + t);
      if (e.page !== 'home' && !types.includes('BreadcrumbList')) bad(tag + 'JSON-LD missing BreadcrumbList');
      if (JSON.stringify(j).match(/aggregateRating|"review"/)) bad(tag + 'JSON-LD must not contain aggregateRating/review');
      const ids = new Set(j['@graph'].map((n) => n['@id']));
      for (const n of j['@graph']) for (const k of ['isPartOf', 'about', 'publisher', 'provider']) if (n[k] && n[k]['@id'] && !ids.has(n[k]['@id'])) bad(tag + 'JSON-LD dangling @id ' + n[k]['@id']);
      const biz = j['@graph'].find((n) => n['@type'] === 'HomeGoodsStore');
      for (const k of ['telephone', 'address', 'openingHoursSpecification', 'logo', 'sameAs']) if (!biz[k]) bad(tag + 'business node missing ' + k);
    } catch (err) { bad(tag + 'JSON-LD invalid: ' + err.message); }
  }
  // body
  const body = doc.body.cloneNode(true); body.querySelectorAll('noscript').forEach((n) => n.remove());
  const h1 = body.querySelectorAll('h1'); if (h1.length !== 1) bad(tag + 'h1 count ' + h1.length);
  const root = doc.getElementById('root');
  if (!root || !root.getAttribute('data-prerender-path') || root.getAttribute('data-prerender-path') !== url) bad(tag + 'data-prerender-path missing/wrong');
  const links = [...body.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((x) => x && x.startsWith('/') && !x.startsWith('//'));
  if (links.length < 15) bad(tag + 'only ' + links.length + ' internal <a href> links');
  links.forEach((l) => sampleLinks.add(l.split('#')[0].split('?')[0]));
  // required link targets on the home pages: every category + nav link as a real anchor
  if (e.page === 'home') for (const need of ['/kitchen', '/wardrobes', '/tv', '/doors', '/office', '/gallery', '/booking']) {
    const want = withLang(need, L); if (!links.includes(want)) bad(tag + 'home is missing real link to ' + want);
  }
  // language hygiene: links stay inside the language; no raw i18n key; no Latin-only UI in Arabic footer
  if (L === 'ar') {
    const wrong = links.filter((l) => !l.startsWith('/ar') && !/^\/(studio|visualizer|campaign|ikhtarha)/.test(l));
    if (wrong.length) bad(tag + 'Arabic page links leave /ar: ' + [...new Set(wrong)].slice(0, 5).join(', '));
  } else {
    const wrong = links.filter((l) => /^\/ar(\/|$)/.test(l));
    if (wrong.length > 1) notes.push(tag + 'english page has ' + wrong.length + ' /ar links (language switcher expected: 1)');
  }
  if (/\bmeetTeam\b/.test(body.textContent)) bad(tag + 'raw i18n key "meetTeam" rendered');
  const html = fs.readFileSync(file, 'utf8');
  const foreign = (html.match(/https?:\/\/closets-website\.[a-z.]+/g) || []).filter((u) => !u.startsWith(SITE_URL));
  if (foreign.length) bad(tag + 'foreign origin(s): ' + [...new Set(foreign)].join(', '));
}

// ---- 404 page ---------------------------------------------------------------------------------------
{
  const f = path.join(BUILD_DIR, '404.html');
  if (!fs.existsSync(f)) bad('404.html missing');
  else { const d = dom(f); const doc = d.window.document;
    if (!/noindex/.test(meta(d, 'meta[name="robots"]') || '')) bad('404.html not noindex');
    if (doc.head.querySelector('link[rel="canonical"]')) bad('404.html must not have a canonical');
    if (doc.body.querySelectorAll('h1').length !== 1) bad('404.html needs one h1');
    if (doc.querySelectorAll('[data-not-found] a[href]').length < 8) bad('404.html needs helpful links');
  }
}
// ---- noindex pages must not be in sitemap; sitemap <-> files -----------------------------------------------
{
  const sm = fs.readFileSync(path.join(BUILD_DIR, 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const want = []; for (const e of INDEXABLE) for (const L of langs) want.push(absUrl(e.path, L));
  if (locs.slice().sort().join('\n') !== want.slice().sort().join('\n')) bad('sitemap.xml locs differ from route table (' + locs.length + ' vs ' + want.length + ')');
  for (const p of PAGES.filter((x) => !x.index)) if (sm.includes(absUrl(p.path, 'en') + '<')) bad('noindex page in sitemap: ' + p.path);
  if (ENABLE_AR_URLS && (sm.match(/xhtml:link/g) || []).length !== want.length * 3) bad('sitemap xhtml:link count wrong');
  const robots = fs.readFileSync(path.join(BUILD_DIR, 'robots.txt'), 'utf8');
  if (!robots.includes('Sitemap: ' + SITE_URL + '/sitemap.xml')) bad('robots.txt Sitemap line wrong');
  for (const d of ['/cart', '/signin', '/checkout', '/design-studio']) if (!robots.includes('Disallow: ' + d)) bad('robots.txt missing Disallow ' + d);
  if (/^Disallow:\s*\/\s*$/m.test(robots)) bad('robots.txt blocks the whole site');
}
// ---- routing table -------------------------------------------------------------------------------------------
{
  for (const e of INDEXABLE) for (const L of langs) { const r = resolveRoute(withLang(e.path, L)); if (r !== 'static') bad('route ' + withLang(e.path, L) + ' resolves to ' + r); }
  for (const [from, to] of Object.entries(LEGACY_REDIRECTS)) for (const L of langs) {
    const r = resolveRoute(withLang(from, L)); const want = 'redirect:' + withLang(to, L);
    if (r !== want) bad('legacy ' + withLang(from, L) + ' -> ' + r + ' (want ' + want + ')');
  }
  const spa = ['/cart', '/signin', '/checkout', '/directory', '/ai-designer', '/design-studio', '/design-studio/kitchen-planner', '/category/Doors', '/product-abc123'];
  for (const s of spa) for (const L of langs) { const r = resolveRoute(withLang(s, L)); if (r !== 'rewrite:/app-shell.html') bad('SPA route ' + withLang(s, L) + ' -> ' + r); }
  for (const s of ['/studio', '/studio/kitchen', '/visualizer', '/visualizer/room/living', '/campaign/ikhtarha', '/ikhtarha/games']) { const r = resolveRoute(s); if (r !== 'rewrite:/app-shell.html') bad('shell route ' + s + ' -> ' + r); }
  for (const s of ['/does-not-exist', '/ar/does-not-exist', '/kitchen/extra']) if (resolveRoute(s) !== '404') bad('unknown route ' + s + ' must be a real 404, got ' + resolveRoute(s));
  if (!fs.existsSync(path.join(BUILD_DIR, 'app-shell.html'))) bad('app-shell.html missing');
  else if (/data-prerender-path/.test(fs.readFileSync(path.join(BUILD_DIR, 'app-shell.html'), 'utf8'))) bad('app-shell.html is not the pristine shell');
  // every internal link found on prerendered pages must resolve (static / redirect / rewrite), never 404
  for (const l of sampleLinks) { if (resolveRoute(l) === '404' && !/\.[a-z0-9]+$/i.test(l)) bad('internal link ' + l + ' would 404'); }
}

console.log('[seo-check] pages checked: ' + INDEXABLE.length * langs.length + ' (+404), internal link targets: ' + sampleLinks.size);
notes.forEach((n) => console.log('  note: ' + n));
if (errors.length) { console.error('[seo-check] FAILED (' + errors.length + '):\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('[seo-check] OK');
