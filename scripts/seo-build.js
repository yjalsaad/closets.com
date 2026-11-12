/* eslint-disable */
/**
 * Build-time SEO artefacts (runs as part of `postbuild`, BEFORE the prerender):
 *   - sitemap.xml  (every indexable route, EN + AR, with xhtml:link hreflang alternates, lastmod = build date)
 *   - robots.txt   (Sitemap: line from SITE_URL; noindex-by-design areas disallowed)
 *   - index.html   (__SITE_URL__ placeholder -> SITE_URL)
 *   - 404.html     (copy of the shell; the prerender later replaces it with the rendered NotFound page)
 * Everything is derived from src/seo/routes.js + src/seo/siteConfig.js (single source of truth).
 */
const fs = require('fs');
const path = require('path');
const { SITE_URL, ENABLE_AR_URLS } = require('../src/seo/siteConfig');
const { INDEXABLE, absUrl } = require('../src/seo/routes');

const BUILD_DIR = path.resolve(process.cwd(), process.env.BUILD_PATH || 'build');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sitemapXml(lastmod) {
  const urls = [];
  for (const e of INDEXABLE) {
    const langs = ENABLE_AR_URLS ? ['en', 'ar'] : ['en'];
    for (const L of langs) {
      let x = '  <url>\n    <loc>' + esc(absUrl(e.path, L)) + '</loc>\n    <lastmod>' + lastmod + '</lastmod>\n';
      if (ENABLE_AR_URLS) {
        x += '    <xhtml:link rel="alternate" hreflang="en" href="' + esc(absUrl(e.path, 'en')) + '"/>\n';
        x += '    <xhtml:link rel="alternate" hreflang="ar" href="' + esc(absUrl(e.path, 'ar')) + '"/>\n';
        x += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + esc(absUrl(e.path, 'en')) + '"/>\n';
      }
      urls.push(x + '  </url>');
    }
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls.join('\n') + '\n</urlset>\n';
}

function robotsTxt() {
  // Non-content / transactional / interactive areas: noindex via meta, and not worth crawling.
  const dis = ['/cart', '/signin', '/portal', '/checkout', '/directory', '/design-studio', '/studio', '/visualizer', '/showroom-3d', '/pay.html', '/pay-success.html', '/pay-failed.html'];
  const lines = ['# The Closets Co.', 'User-agent: *', 'Allow: /', ''];
  for (const d of dis) { lines.push('Disallow: ' + d); if (ENABLE_AR_URLS && !/\./.test(d) && !/^\/(studio|visualizer)/.test(d)) lines.push('Disallow: /ar' + d); }
  lines.push('', 'Sitemap: ' + SITE_URL + '/sitemap.xml', '');
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(path.join(BUILD_DIR, 'index.html'))) { console.warn('[seo-build] no build at ' + BUILD_DIR + ' - skipping'); return; }
  const lastmod = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(BUILD_DIR, 'sitemap.xml'), sitemapXml(lastmod));
  fs.writeFileSync(path.join(BUILD_DIR, 'robots.txt'), robotsTxt());
  const idxPath = path.join(BUILD_DIR, 'index.html');
  const html = fs.readFileSync(idxPath, 'utf8').split('__SITE_URL__').join(SITE_URL);
  fs.writeFileSync(idxPath, html);
  fs.writeFileSync(path.join(BUILD_DIR, '404.html'), html);
  console.log('[seo-build] SITE_URL=' + SITE_URL + ' AR_URLS=' + ENABLE_AR_URLS + ' -> sitemap.xml (' + INDEXABLE.length * (ENABLE_AR_URLS ? 2 : 1) + ' urls), robots.txt, 404.html');
}
main();
