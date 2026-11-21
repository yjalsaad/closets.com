/* Add-only port guards (YAS Bloom on production main): the hooks into existing files stay tiny, and the vendored helpers behave for main (no /ar/<page> URLs). */
import fs from 'fs';
import path from 'path';
import { withLang, splitLangPath } from '../vendor/routes';
import { SHOWROOM_PATH_RE } from '../route';

const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

describe('YAS Bloom add-on hooks', () => {
  test('src/index.js mounts the showroom for /yas-bloom and /ar/yas-bloom as a lazy chunk, before the other standalone shells', () => {
    const idx = read('src/index.js');
    expect(idx).toContain("import(/* webpackChunkName: \"showroom3d\" */ './showroom3d/ShowroomRoot')");
    expect(idx.indexOf('if (isShowroom)')).toBeGreaterThan(0);
    expect(idx.indexOf('if (isShowroom)')).toBeLessThan(idx.indexOf('else if (isGames)'));
    for (const p of ['/yas-bloom', '/yas-bloom/', '/ar/yas-bloom']) expect(SHOWROOM_PATH_RE.test(p)).toBe(true);
    for (const p of ['/', '/booking', '/ar/booking', '/yas-bloomx', '/showroom-3d']) expect(SHOWROOM_PATH_RE.test(p)).toBe(false);
  });
  test('vercel.json: noindex on every showroom path, the showroom-only rewrites to the lean shell, and no SPA catch-all (real 404s since PR #3)', () => {
    const v = JSON.parse(read('vercel.json'));
    expect(v.buildCommand).toBe('CI=false npm run build');
    // the go-live integration (PR #3) serves real 404s: unknown URLs fall through to 404.html, so there is no '/(.*)' -> /index.html catch-all any more
    expect(v.rewrites.some((r) => r.source === '/(.*)')).toBe(false);
    // the showroom URLs (and nothing else) go to the lean shell, and they come first (never a wildcard)
    const lean = v.rewrites.filter((r) => r.destination === '/yas-bloom/shell.html');
    expect(lean.map((r) => r.source)).toEqual(['/yas-bloom/study', '/ar/yas-bloom/study', '/yas-bloom', '/yas-bloom/', '/ar/yas-bloom', '/ar/yas-bloom/']);
    expect(v.rewrites.slice(0, lean.length)).toEqual(lean);
    // PR #11/#12: six explicit noindex rules for the showroom (path-to-regexp does not take `(ar/)?`), each exactly X-Robots-Tag: noindex
    const noindex = v.headers.filter((h) => h.headers.some((x) => x.key === 'X-Robots-Tag'));
    const yb = noindex.filter((h) => /yas-bloom/.test(h.source));
    expect(yb.map((h) => h.source).sort()).toEqual(['/ar/yas-bloom', '/ar/yas-bloom/', '/ar/yas-bloom/:path*', '/yas-bloom', '/yas-bloom/', '/yas-bloom/:path*']);
    for (const h of noindex) expect(h.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex' }]);
    // caching: immutable content-hashed /static files, and a 1 h + stale-while-revalidate lifetime for the showroom's static images
    const cache = (src) => (v.headers.find((h) => h.source === src) || { headers: [] }).headers;
    expect(cache('/static/(.*)')).toEqual([{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]);
    expect(cache('/yas-bloom/(realism|staff|collections|design-studio|profile)/(.*)')).toEqual([{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }]);
  });
  test('lean shell: no home-page assets, noindex, entry block the postbuild step rewrites, and a run-time fallback for any build', () => {
    const h = read('public/yas-bloom/shell.html');
    expect(h).toMatch(/name="robots" content="noindex/);
    expect(h).toContain('viewport-fit=cover');
    expect(h).toContain('<div id="root"></div>');
    expect(h).not.toMatch(/cloudfront|model-viewer|ld\+json|<img/i);
    expect(h).toMatch(/<!--BLOOM-ENTRY:BEGIN[\s\S]*asset-manifest\.json[\s\S]*<!--BLOOM-ENTRY:END-->/);
    expect(read('package.json')).toContain('"postbuild": "node scripts/seo-build.js && node scripts/prerender.js && node scripts/bloom-shell.js"');
  });
  test('routes: since PR #3 the showroom uses the site registry, so Arabic links out to the main site get /ar (separate app shells do not)', () => {
    expect(withLang('/booking', 'ar')).toBe('/ar/booking');
    expect(withLang('/booking', 'en')).toBe('/booking');
    expect(withLang('/yas-bloom', 'ar')).toBe('/ar/yas-bloom');
    expect(withLang('/yas-bloom', 'en')).toBe('/yas-bloom');
    expect(withLang('/studio', 'ar')).toBe('/studio');
    expect(withLang('/campaign/ikhtarha', 'ar')).toBe('/campaign/ikhtarha');
    expect(splitLangPath('/ar/yas-bloom')).toEqual({ lang: 'ar', path: '/yas-bloom' });
    expect(splitLangPath('/yas-bloom')).toEqual({ lang: 'en', path: '/yas-bloom' });
  });
  test('the showroom imports nothing from the rest of the site except the SEO route registry (everything else is vendored)', () => {
    const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
    const root = path.resolve(__dirname, '..');
    for (const f of walk(root).filter((x) => /\.(jsx?)$/.test(x) && !/__tests__/.test(x))) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?:from\s+|import\(\s*)['"](\.[^'"]*)['"]/g)) {
        const target = path.normalize(path.join(path.dirname(f), m[1]));
        if (!target.startsWith(root)) expect(['studio/hub/supaConfig', 'seo/routes']).toContain(path.relative(path.resolve(root, '..'), target).split(path.sep).join('/'));
      }
    }
  });
});
