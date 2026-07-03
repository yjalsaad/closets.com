/* eslint-disable */
/**
 * Static prerender for the CRA SPA (SEO).
 *
 * Runs as `postbuild`. Serves the freshly built app from a tiny in-process
 * static server (with SPA fallback), drives a headless Chromium over an
 * explicit list of marketing routes, and writes the fully-rendered HTML back
 * into <buildDir>/<route>/index.html. On load, src/index.js sees the prerendered
 * markup in #root and calls hydrateRoot, so crawlers get real text and users get
 * an instant first paint with no hydration flash.
 *
 * DESIGN NOTES
 *  - Chosen over react-snap: react-snap (last release 2020) bundles an ancient
 *    puppeteer that will not run on Node 22 and breaks hydration on React 18+.
 *    This script uses modern puppeteer and works cleanly with React 19 / Node 22.
 *  - FAIL SOFT: if puppeteer or Chromium isn't available (e.g. a build container
 *    without a browser), we log a warning and exit 0. The site still deploys as a
 *    normal SPA — prerendering is progressive enhancement, never a build blocker.
 *  - Honors BUILD_PATH so it targets the same dir react-scripts wrote to (this is
 *    why it doesn't interfere with the `BUILD_PATH=/tmp/webbuild` compile gate).
 *  - Skips /cart and /signin (per spec) and the WebGL Design-Studio planner routes
 *    (interactive tools, no SEO value, and WebGL can hang/crash headless).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BUILD_DIR = path.resolve(process.cwd(), process.env.BUILD_PATH || 'build');

// Explicit include list — canonical marketing routes worth indexing.
// Keep in sync with ROUTE_TABLE in src/App.js (minus planners / cart / signin).
const ROUTES = [
  '/', '/kitchen', '/wardrobes', '/tv', '/doors', '/office', '/gallery',
  '/offers', '/booking', '/projects', '/services', '/showrooms',
  '/how-it-works', '/faq', '/about', '/contact', '/blog',
  '/careers', '/warranty', '/maintenance', '/ai-lab',
];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
  '.webp': 'image/webp', '.avif': 'image/avif',
};

function startServer(dir) {
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(dir, urlPath);
      // Directory or unknown path → SPA fallback to index.html so BrowserRouter routes render.
      if (!path.extname(filePath)) filePath = path.join(dir, 'index.html');
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(dir, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500); res.end('err');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const indexHtml = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.warn('[prerender] no build at ' + BUILD_DIR + ' — skipping (nothing to prerender).');
    return; // exit 0
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.warn('[prerender] puppeteer not installed — skipping prerender (SPA still deploys).');
    return; // exit 0
  }

  const server = await startServer(BUILD_DIR);
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    console.warn('[prerender] could not launch Chromium — skipping prerender (SPA still deploys).');
    console.warn('           ' + (e && e.message ? e.message : e));
    server.close();
    return; // exit 0
  }

  let ok = 0;
  for (const route of ROUTES) {
    const page = await browser.newPage();
    try {
      await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 45000 });
      // Wait until React has actually painted content into #root.
      await page.waitForFunction(
        () => { const r = document.getElementById('root'); return r && r.children.length > 0; },
        { timeout: 15000 }
      ).catch(() => {});
      const html = '<!DOCTYPE html>' + (await page.content()).replace(/^<!DOCTYPE html>/i, '');
      const outDir = route === '/' ? BUILD_DIR : path.join(BUILD_DIR, route);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html);
      ok++;
      console.log('[prerender] ' + route + ' → ' + path.relative(process.cwd(), path.join(outDir, 'index.html')));
    } catch (e) {
      console.warn('[prerender] skipped ' + route + ': ' + (e && e.message ? e.message : e));
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close().catch(() => {});
  server.close();
  console.log('[prerender] done — ' + ok + '/' + ROUTES.length + ' routes prerendered.');
})().catch((e) => {
  // Never fail the build because of prerendering.
  console.warn('[prerender] unexpected error — skipping: ' + (e && e.message ? e.message : e));
});
