/* eslint-disable */
/**
 * Static prerender for the CRA SPA (SEO). Runs as `postbuild` (after scripts/seo-build.js).
 *
 * Serves the freshly built app from a tiny in-process static server, drives headless Chromium over every
 * indexable route in BOTH languages (/kitchen and /ar/kitchen, ...) plus the NotFound page, and writes the
 * rendered HTML to <build>/<route>/index.html (and <build>/404.html). The head (title, description, canonical,
 * hreflang, og:*, twitter:*, robots, JSON-LD) is whatever src/seo/head.js wrote while the app rendered, so the
 * static HTML and the client-side head can never disagree.
 *
 * BROWSER (first that works):
 *   1. PUPPETEER_EXECUTABLE_PATH / CHROME_PATH  (+ puppeteer-core)   <- local dev, GitHub Actions, any image with Chrome
 *   2. @sparticuz/chromium (+ puppeteer-core)                        <- Vercel / AWS-Lambda-like containers (no system Chrome)
 *   3. puppeteer (if installed; needs its own Chrome download)       <- legacy fallback
 *
 * STRICTNESS
 *   PRERENDER_REQUIRED=1 (or VERCEL set) => FAIL LOUDLY: non-zero exit if no browser can launch, or any route's output
 *   lacks the expected <title>, canonical, or exactly one <h1>. Locally (neither set) it stays soft and exits 0.
 *   PRERENDER_REQUIRED=0 forces soft mode even on Vercel (emergency switch).
 *
 * NETWORK: by default every non-local request is intercepted (CMS/API calls get `[]`, fonts/images are aborted) so the
 * output is deterministic and the build never depends on a third party. PRERENDER_ALLOW_NETWORK=1 lets CMS calls through
 * (bakes live CMS content into the HTML; it hydrates and refreshes on load).
 *
 * Also writes app-shell.html: the pristine SPA shell. vercel.json rewrites SPA-only routes (product pages, planners,
 * account...) to it, because the prerender overwrites index.html with the prerendered home page.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { SITE_URL, ENABLE_AR_URLS } = require('../src/seo/siteConfig');
const { INDEXABLE, buildHead, withLang } = require('../src/seo/routes');

const BUILD_DIR = path.resolve(process.cwd(), process.env.BUILD_PATH || 'build');
const REQUIRED = process.env.PRERENDER_REQUIRED === '1' || (process.env.PRERENDER_REQUIRED !== '0' && !!process.env.VERCEL);
const ALLOW_NETWORK = process.env.PRERENDER_ALLOW_NETWORK === '1';
const CONCURRENCY = Math.max(1, parseInt(process.env.PRERENDER_CONCURRENCY || '2', 10));
const ONLY = (process.env.PRERENDER_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean); // e.g. "/,/kitchen,404" (debug)

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
  '.webp': 'image/webp', '.avif': 'image/avif', '.xml': 'application/xml', '.txt': 'text/plain',
};

function fail(msg) {
  if (REQUIRED) { console.error('[prerender] FAILED (PRERENDER_REQUIRED): ' + msg); process.exit(1); }
  console.warn('[prerender] ' + msg + ' - skipping (soft mode; set PRERENDER_REQUIRED=1 to make this fatal).');
  process.exit(0);
}

// The server always answers extensionless paths with the PRISTINE shell, so a half-written prerender is never re-read.
function startServer(dir, shellFile) {
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(dir, urlPath);
      if (!path.extname(filePath) || !filePath.startsWith(dir) || /\/index\.html$/.test(urlPath)) filePath = shellFile;
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = shellFile;
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) { res.writeHead(500); res.end('err'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function launchBrowser() {
  let core = null;
  try { core = require('puppeteer-core'); } catch (e) { /* maybe only full puppeteer exists */ }
  const baseArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', '--mute-audio'];
  const errors = [];
  const attempts = [];
  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (core && explicit) attempts.push(['executable ' + explicit, () => core.launch({ executablePath: explicit, headless: true, args: baseArgs })]);
  if (core) {
    let sparticuz = null;
    try { sparticuz = require('@sparticuz/chromium'); } catch (e) { errors.push('@sparticuz/chromium not installed'); }
    if (sparticuz) {
      attempts.push(['@sparticuz/chromium', async () => {
        const chromium = sparticuz.default || sparticuz;
        try { chromium.setGraphicsMode = false; } catch (e) { /* older versions */ }
        const executablePath = await chromium.executablePath();
        return core.launch({ executablePath, headless: 'shell', args: Array.from(new Set([...(chromium.args || []), ...baseArgs])) });
      }]);
    }
  }
  attempts.push(['puppeteer', async () => { const p = require('puppeteer'); return p.launch({ headless: true, args: baseArgs }); }]);
  for (const [name, fn] of attempts) {
    try { const b = await fn(); console.log('[prerender] browser: ' + name); return b; }
    catch (e) { errors.push(name + ': ' + (e && e.message ? String(e.message).split('\n')[0] : e)); }
  }
  throw new Error('could not launch a browser. Tried: ' + (errors.join(' | ') || 'nothing available'));
}

function stripNoscript(html) { return html.replace(/<noscript[\s\S]*?<\/noscript>/gi, ''); }
function attr(html, re) { const m = html.match(re); return m ? m[1] : null; }
const decode = (s) => (s == null ? s : s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));

// What a correct output must contain; returns a list of problems (empty = ok).
function verifyOutput(html, job) {
  const problems = [];
  const head = stripNoscript(html);
  const title = decode(attr(head, /<title[^>]*>([\s\S]*?)<\/title>/i));
  if (title !== job.expect.title) problems.push('title "' + title + '" != expected "' + job.expect.title + '"');
  const h1s = (head.match(/<h1[\s>]/gi) || []).length;
  if (h1s !== 1) problems.push('expected exactly 1 <h1>, found ' + h1s);
  const canon = decode(attr(head, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i));
  if (job.expect.canonical && canon !== job.expect.canonical) problems.push('canonical "' + canon + '" != "' + job.expect.canonical + '"');
  if (!job.expect.canonical && canon) problems.push('noindex page must not carry a canonical (found ' + canon + ')');
  if (job.expect.canonical && !/<script type="application\/ld\+json"/i.test(head)) problems.push('missing JSON-LD');
  if (!new RegExp('<html[^>]*lang="' + job.lang + '"', 'i').test(head)) problems.push('<html lang="' + job.lang + '"> missing');
  const robots = decode(attr(head, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i)) || '';
  if (!job.expect.indexable && !/noindex/.test(robots)) problems.push('expected noindex robots meta, got "' + robots + '"');
  if (job.expect.indexable && /noindex/.test(robots)) problems.push('indexable page has noindex robots meta');
  return problems;
}

async function renderJob(browser, base, job) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    const local = new URL(base).origin;
    page.on('request', (req) => {
      let origin = ''; try { origin = new URL(req.url()).origin; } catch (e) { /* data: etc. */ }
      if (!origin || origin === local || req.url().startsWith('data:') || req.url().startsWith('blob:')) return req.continue();
      if (ALLOW_NETWORK && ['fetch', 'xhr'].includes(req.resourceType())) return req.continue();
      if (['fetch', 'xhr'].includes(req.resourceType())) {
        return req.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' });
      }
      // Third-party images: answer with a 1x1 GIF instead of aborting. An aborted <img> fires onError, <Photo> then swaps it for a
      // fallback <div>, and that markup would not match the client's first render (hydration mismatch, React #418).
      if (req.resourceType() === 'image') {
        return req.respond({ status: 200, contentType: 'image/gif', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') });
      }
      return req.abort();
    });
    const chunkScripts = new Set();   // route chunks fetched while rendering -> <link rel=preload>, so they load in parallel with main.js
    page.on('request', (req) => {
      try { const u = new URL(req.url()); if (u.origin === local && req.resourceType() === 'script' && /^\/static\/js\/(?!main\.)/.test(u.pathname)) chunkScripts.add(u.pathname); } catch (e) { /* ignore */ }
    });
    await page.goto(base + job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => { const r = document.getElementById('root'); return r && r.querySelector('h1'); }, { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 600)); // let effects (head manager, language redirect) settle
    // React hydration needs "<!-- -->" between ADJACENT text nodes (what ReactDOMServer emits); a browser serialisation merges them
    // into one text node and hydrateRoot then fails with error #418 and throws the markup away. Re-insert the separators.
    await page.evaluate(() => {
      // Client-only / post-effect nodes must not be in the snapshot: the cookie banner and hero slides 2-4 (data-noprerender: not part of the
      // first client render), the brand-font <link> and 3rd-party loaders injected by effects.
      document.querySelectorAll('[data-noprerender], #brand-fonts, #model-viewer-script, #three-cdn').forEach((n) => n.remove());
      const w = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT); const list = [];
      while (w.nextNode()) list.push(w.currentNode);
      list.forEach((n) => { if (n.nextSibling && n.nextSibling.nodeType === 3) n.parentNode.insertBefore(document.createComment(' '), n.nextSibling); });
    });
    let html = await page.content();
    html = '<!DOCTYPE html>' + html.replace(/^<!DOCTYPE html>/i, '');
    if (chunkScripts.size) html = html.replace('</head>', Array.from(chunkScripts).sort().map((u) => '<link rel="preload" as="script" href="' + u + '">').join('') + '</head>');
    // Preload ONLY the above-the-fold faces for this language (self-hosted fonts, src/design/tokens.css).
    {
      const media = path.join(BUILD_DIR, 'static', 'media');
      const want = job.lang === 'ar' ? ['noto-naskh-arabic-arabic-wght-normal'] : ['fraunces-latin-wght-normal'];   // the display face (headline = LCP text); body faces load normally, swap + metric-matched fallback = no shift
      let files = []; try { files = fs.readdirSync(media); } catch (e) { /* no media dir */ }
      const tags = want.map((w) => files.find((f) => f.startsWith(w + '.') && f.endsWith('.woff2'))).filter(Boolean).map((f) => '<link rel="preload" as="font" type="font/woff2" crossorigin href="/static/media/' + f + '">').join('');
      if (tags) html = html.replace('</head>', tags + '</head>');
    }
    html = html.replace('<div id="root">', '<div id="root" data-prerender-path="' + job.marker + '" data-prerender-lang="' + job.lang + '">');
    return html;
  } finally { await page.close().catch(() => {}); }
}

(async () => {
  const indexHtml = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(indexHtml)) return fail('no build at ' + BUILD_DIR);
  // keep the pristine shell BEFORE index.html is overwritten with the prerendered home page
  const shellFile = path.join(BUILD_DIR, 'app-shell.html');
  if (!fs.existsSync(shellFile)) fs.copyFileSync(indexHtml, shellFile);

  // jobs: every indexable route x language, plus the 404 page
  const jobs = [];
  const langs = ENABLE_AR_URLS ? ['en', 'ar'] : ['en'];
  for (const e of INDEXABLE) for (const L of langs) {
    const url = withLang(e.path, L);
    jobs.push({ url, marker: url, lang: L, out: url === '/' ? 'index.html' : path.join(url.slice(1), 'index.html'), expect: buildHead(e.page, L) });
  }
  jobs.push({ url: '/this-page-does-not-exist', marker: '*404*', lang: 'en', out: '404.html', expect: buildHead(null, 'en') });
  const todo = ONLY.length ? jobs.filter((j) => ONLY.includes(j.url) || (j.out === '404.html' && ONLY.includes('404'))) : jobs;

  let browser;
  try { browser = await launchBrowser(); } catch (e) { return fail(e.message); }

  const server = await startServer(BUILD_DIR, shellFile);
  const base = 'http://127.0.0.1:' + server.address().port;
  const failures = []; let ok = 0;
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      try {
        const html = await renderJob(browser, base, job);
        const problems = verifyOutput(html, job);
        if (problems.length) { failures.push(job.url + ': ' + problems.join('; ')); console.warn('[prerender] BAD ' + job.url + ': ' + problems.join('; ')); }
        const outFile = path.join(BUILD_DIR, job.out);
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, html);
        ok++;
        console.log('[prerender] ' + job.url + ' -> ' + job.out + (problems.length ? '  (WITH PROBLEMS)' : ''));
      } catch (e) {
        failures.push(job.url + ': ' + (e && e.message ? e.message : e));
        console.warn('[prerender] FAILED ' + job.url + ': ' + (e && e.message ? e.message : e));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close().catch(() => {});
  server.close();
  console.log('[prerender] done: ' + ok + '/' + todo.length + ' pages written, ' + failures.length + ' problem(s). SITE_URL=' + SITE_URL);
  if (failures.length) {
    if (REQUIRED) { console.error('[prerender] FAILED (PRERENDER_REQUIRED):\n  ' + failures.join('\n  ')); process.exit(1); }
    console.warn('[prerender] problems (soft mode, exit 0):\n  ' + failures.join('\n  '));
  }
})().catch((e) => fail('unexpected error: ' + (e && e.stack ? e.stack : e)));
