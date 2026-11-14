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
  test('vercel.json: only an additive noindex header for the new path; the existing SPA rewrite is untouched', () => {
    const v = JSON.parse(read('vercel.json'));
    expect(v.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
    expect(v.buildCommand).toBe('CI=false npm run build');
    // PR #11/#12 replaced the single regex rule by six explicit rules (path-to-regexp does not take `(ar/)?`): every header rule is noindex and only for the showroom
    expect(v.headers.map((h) => h.source).sort()).toEqual(['/ar/yas-bloom', '/ar/yas-bloom/', '/ar/yas-bloom/:path*', '/yas-bloom', '/yas-bloom/', '/yas-bloom/:path*']);
    for (const h of v.headers) expect(h.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex' }]);
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
