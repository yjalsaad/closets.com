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
  test('vercel.json: noindex on every showroom path, four showroom-only rewrites to the lean shell, SPA catch-all last and unchanged', () => {
    const v = JSON.parse(read('vercel.json'));
    expect(v.buildCommand).toBe('CI=false npm run build');
    // the SPA catch-all is still the LAST rewrite and unchanged; before it, exactly the four showroom URLs go to the lean shell (never a wildcard)
    expect(v.rewrites[v.rewrites.length - 1]).toEqual({ source: '/(.*)', destination: '/index.html' });
    const lean = v.rewrites.slice(0, -1);
    expect(lean.map((r) => r.source)).toEqual(['/yas-bloom/study', '/ar/yas-bloom/study', '/yas-bloom', '/yas-bloom/', '/ar/yas-bloom', '/ar/yas-bloom/']);
    for (const r of lean) expect(r.destination).toBe('/yas-bloom/shell.html');
    // PR #11/#12 replaced the single regex rule by six explicit rules (path-to-regexp does not take `(ar/)?`): the noindex rules stay, for the showroom only
    const noindex = v.headers.filter((h) => h.headers.some((x) => x.key === 'X-Robots-Tag'));
    expect(noindex.map((h) => h.source).sort()).toEqual(['/ar/yas-bloom', '/ar/yas-bloom/', '/ar/yas-bloom/:path*', '/yas-bloom', '/yas-bloom/', '/yas-bloom/:path*']);
    for (const h of noindex) expect(h.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex' }]);
    // the only other header rules: immutable caching of CRA's content-hashed /static files, and a 1 h + stale-while-revalidate lifetime for the showroom's static images
    const rest = v.headers.filter((h) => !noindex.includes(h));
    expect(rest.map((h) => h.source)).toEqual(['/static/(.*)', '/yas-bloom/(realism|staff|collections|design-studio|profile)/(.*)']);
    expect(rest[0].headers).toEqual([{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]);
    expect(rest[1].headers).toEqual([{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }]);
  });
  test('lean shell: no home-page assets, noindex, entry block the postbuild step rewrites, and a run-time fallback for any build', () => {
    const h = read('public/yas-bloom/shell.html');
    expect(h).toMatch(/name="robots" content="noindex/);
    expect(h).toContain('viewport-fit=cover');
    expect(h).toContain('<div id="root"></div>');
    expect(h).not.toMatch(/cloudfront|model-viewer|ld\+json|<img/i);
    expect(h).toMatch(/<!--BLOOM-ENTRY:BEGIN[\s\S]*asset-manifest\.json[\s\S]*<!--BLOOM-ENTRY:END-->/);
    expect(read('package.json')).toContain('"postbuild": "node scripts/prerender.js && node scripts/bloom-shell.js"');
  });
  test('vendored routes: /ar exists only for the showroom; links out to the main site are never prefixed', () => {
    expect(withLang('/booking', 'ar')).toBe('/booking');
    expect(withLang('/yas-bloom', 'ar')).toBe('/ar/yas-bloom');
    expect(withLang('/yas-bloom', 'en')).toBe('/yas-bloom');
    expect(splitLangPath('/ar/yas-bloom')).toEqual({ lang: 'ar', path: '/yas-bloom' });
    expect(splitLangPath('/yas-bloom')).toEqual({ lang: 'en', path: '/yas-bloom' });
  });
  test('the showroom imports nothing from the integration-only modules (everything is vendored)', () => {
    const walk = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
    const root = path.resolve(__dirname, '..');
    for (const f of walk(root).filter((x) => /\.(jsx?)$/.test(x) && !/__tests__/.test(x))) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?:from\s+|import\(\s*)['"](\.[^'"]*)['"]/g)) {
        const target = path.normalize(path.join(path.dirname(f), m[1]));
        if (!target.startsWith(root)) expect(['studio/hub/supaConfig']).toContain(path.relative(path.resolve(root, '..'), target).split(path.sep).join('/'));
      }
    }
  });
});
