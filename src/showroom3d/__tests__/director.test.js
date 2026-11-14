import { createDirector } from '../cinematic/director';
import { DURATION, EVENTS, KEYFRAMES } from '../cinematic/timeline';
import { isShowroomPath } from '../route';

describe('GSAP director', () => {
  test('one master timeline of exactly the configured duration', () => {
    const d = createDirector({}); expect(d.timeline.duration()).toBeCloseTo(DURATION, 6); d.kill();
  });
  test('seeking is deterministic: veil, doors and camera follow the clock', () => {
    const seen = []; const d = createDirector({ onUpdate: (s) => seen.push(s) });
    d.seek(0); let s = d.state(); expect(s.veil).toBeCloseTo(1, 3); expect(s.doorOpen).toBeCloseTo(0, 3); expect(s.cam.p).toEqual(KEYFRAMES[0].p);
    d.seek(EVENTS.doors.start - 0.5); expect(d.state().doorOpen).toBeCloseTo(0, 3);
    d.seek((EVENTS.doors.start + EVENTS.doors.end) / 2); s = d.state(); expect(s.doorOpen).toBeGreaterThan(0.3); expect(s.doorOpen).toBeLessThan(0.7);
    d.seek(EVENTS.doors.end + 0.1); expect(d.state().doorOpen).toBeCloseTo(1, 3);
    d.seek(DURATION); s = d.state(); expect(s.veil).toBeCloseTo(0, 3); expect(s.led).toBeCloseTo(EVENTS.led.to, 3); expect(s.cam.p).toEqual(KEYFRAMES[KEYFRAMES.length - 1].p);
    d.seek(1); expect(d.state().doorOpen).toBeCloseTo(0, 3);   // seeking backwards un-opens the doors
    expect(seen.length).toBeGreaterThan(5); d.kill();
  });
  test('finish() jumps straight to the finished scene (reduced motion path) and reset() returns to the start', () => {
    const d = createDirector({}); d.finish(); let s = d.state();
    expect(s.doorOpen).toBe(1); expect(s.veil).toBe(0); expect(s.logo).toBe(0); expect(s.t).toBe(DURATION);
    d.reset(); s = d.state(); expect(s.t).toBe(0); expect(s.veil).toBe(1); expect(s.doorOpen).toBe(0); d.kill();
  });
});

describe('route', () => {
  test('the shell matches /yas-bloom and /ar/yas-bloom (and the legacy /showroom-3d, which is redirected) only', () => {
    for (const p of ['/yas-bloom', '/yas-bloom/', '/ar/yas-bloom', '/Yas-Bloom', '/showroom-3d', '/ar/showroom-3d', '/Showroom-3D']) expect(isShowroomPath(p)).toBe(true);
    for (const p of ['/', '/showroom', '/showrooms', '/showroom-3dx', '/yas-bloomx', '/ar/yas-blooms', '/yas', '/ar/showrooms', '/x/showroom-3d', '']) expect(isShowroomPath(p)).toBe(false);
  });
});

describe('YAS Bloom routing (P1)', () => {
  const fs = require('fs'), path = require('path');
  const { canonicalShowroomPath, isLegacyShowroomPath, BRAND } = require('../route');
  test('legacy paths map to the canonical ones, keeping language and sub-paths; everything else is untouched', () => {
    expect(canonicalShowroomPath('/showroom-3d')).toBe('/yas-bloom'); expect(canonicalShowroomPath('/ar/showroom-3d')).toBe('/ar/yas-bloom'); expect(canonicalShowroomPath('/ar/Showroom-3D/x')).toBe('/ar/yas-bloom/x');
    expect(canonicalShowroomPath('/yas-bloom')).toBe('/yas-bloom'); expect(canonicalShowroomPath('/showroom-3dx')).toBe('/showroom-3dx'); expect(isLegacyShowroomPath('/ar/showroom-3d')).toBe(true); expect(isLegacyShowroomPath('/yas-bloom')).toBe(false);
  });
  test('brand label in EN and AR', () => { expect(BRAND).toEqual({ en: 'YAS Bloom', ar: 'ياس بلوم' }); });
  test('vercel.json: rewrites + noindex for the new paths, redirects for the old ones (EN + AR, with sub-paths)', () => {
    const v = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../vercel.json'), 'utf8'));
    for (const s of ['/yas-bloom', '/ar/yas-bloom']) expect(v.rewrites.some((r) => r.source === s && r.destination === '/app-shell.html')).toBe(true);
    expect(v.rewrites.some((r) => /showroom-3d/.test(r.source))).toBe(false);
    for (const [a, b] of [['/showroom-3d', '/yas-bloom'], ['/ar/showroom-3d', '/ar/yas-bloom'], ['/showroom-3d/:path*', '/yas-bloom/:path*'], ['/ar/showroom-3d/:path*', '/ar/yas-bloom/:path*']]) expect(v.redirects.some((r) => r.source === a && r.destination === b)).toBe(true);
    const h = v.headers.find((x) => /yas-bloom/.test(x.source)); expect(h.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex' }]); expect(new RegExp('^' + h.source.replace(/\(\/\.\*\)\?$/, '(/.*)?') + '$').test('/yas-bloom')).toBe(true);
  });
  test('robots Disallow and the seo-check route list know the new path; the site shell links to it (EN + AR label)', () => {
    expect(fs.readFileSync(path.resolve(__dirname, '../../../scripts/seo-build.js'), 'utf8')).toContain("'/yas-bloom'");
    expect(fs.readFileSync(path.resolve(__dirname, '../../../scripts/seo-check.js'), 'utf8')).toContain("'/ar/yas-bloom'");
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8'); expect(app).toContain("['🌸 YAS Bloom', 'yb:']"); expect(app).toContain("target === 'yb:'");
    const ar = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../i18n/ar-dict.txt'), 'utf8')); expect(ar.i18n.navlYB).toContain('ياس بلوم');
  });
});
