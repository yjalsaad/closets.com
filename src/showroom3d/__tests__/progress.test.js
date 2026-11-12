import { createProgress, LOAD_STAGES } from '../3d/progress';

describe('loading progress', () => {
  test('stage weights add up to 100 so the percentage is honest', () => {
    expect(Object.values(LOAD_STAGES).reduce((a, b) => a + b, 0)).toBe(100);
  });
  test('starts at 0, ends at exactly 100 when every stage is done', () => {
    const p = createProgress(); expect(p.total()).toBe(0);
    Object.keys(LOAD_STAGES).forEach((k) => p.done(k));
    expect(p.total()).toBe(100); expect(p.isComplete()).toBe(true);
  });
  test('is weighted and monotonic: it never goes backwards, even if a stage re-reports lower', () => {
    const p = createProgress({ a: 30, b: 70 }); const seen = [];
    p.subscribe((v) => seen.push(v));
    p.report('a', 0.5); p.report('a', 0.2); p.report('b', 0.5); p.report('a', 1);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(p.total()).toBeCloseTo(65, 6);
  });
  test('ignores unknown stages and clamps out-of-range fractions', () => {
    const p = createProgress({ a: 50, b: 50 }); p.report('zzz', 1); p.report('a', 7); p.report('b', -3);
    expect(p.total()).toBe(50);
  });
  test('unsubscribe stops notifications', () => {
    const p = createProgress({ a: 100 }); let n = 0; const off = p.subscribe(() => { n++; }); p.report('a', 0.3); off(); p.report('a', 0.6);
    expect(n).toBe(1);
  });
});
