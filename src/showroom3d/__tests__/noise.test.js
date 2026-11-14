import { mulberry32, makeNoise2D, fbm } from '../3d/noise';
import { heightToNormal } from '../3d/textures';

describe('procedural noise (deterministic, tileable)', () => {
  test('seeded RNG repeats and differs by seed', () => {
    const a = mulberry32(5), b = mulberry32(5), c = mulberry32(6);
    const A = [a(), a(), a()], B = [b(), b(), b()], C = [c(), c(), c()];
    expect(A).toEqual(B); expect(A).not.toEqual(C); for (const v of A) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  test('noise and fbm stay in [0,1] and tile at the wrap period', () => {
    const n = makeNoise2D(3);
    for (let i = 0; i < 200; i++) { const v = fbm(n, i * 0.37, i * 0.91, 4, 8); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    for (const [x, y] of [[0.3, 0.7], [2.2, 5.1], [7.5, 0.1]]) expect(fbm(n, x, y, 4, 8)).toBeCloseTo(fbm(n, x + 8, y + 8, 4, 8), 9);
  });
  test('heightToNormal exports a function (canvas needed to run it)', () => { expect(typeof heightToNormal).toBe('function'); });
});
