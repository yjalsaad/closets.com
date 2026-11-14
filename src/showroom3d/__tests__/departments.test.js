import { DEPARTMENTS, layoutBays, overlaps } from '../scenes/main-hall/departments';
import { HALL, BAY } from '../3d/dimensions';

describe('department bays', () => {
  const bays = layoutBays();
  test('eight departments, four per side, unique ids, bilingual names', () => {
    expect(DEPARTMENTS).toHaveLength(8); expect(bays).toHaveLength(8);
    expect(new Set(DEPARTMENTS.map((d) => d.id)).size).toBe(8);
    expect(bays.filter((b) => b.side === 'left')).toHaveLength(4); expect(bays.filter((b) => b.side === 'right')).toHaveLength(4);
    for (const d of DEPARTMENTS) { expect(d.en.length).toBeGreaterThan(2); expect(/[؀-ۿ]/.test(d.ar)).toBe(true); }
  });
  test('the brief departments are all present', () => {
    expect(DEPARTMENTS.map((d) => d.id)).toEqual(expect.arrayContaining(['kitchens', 'wardrobes', 'walkin', 'bedroom', 'doors', 'living', 'studio', 'lounge']));
  });
  test('no two bays overlap and every bay sits inside the hall against a side wall', () => {
    for (let i = 0; i < bays.length; i++) for (let j = i + 1; j < bays.length; j++) expect(overlaps(bays[i], bays[j])).toBe(false);
    for (const b of bays) {
      expect(Math.abs(b.x) + b.depth / 2).toBeCloseTo(HALL.halfWidth, 6);
      expect(b.z + b.width / 2).toBeLessThanOrEqual(BAY.startZ + 1e-9);
      expect(b.z - b.width / 2).toBeGreaterThan(-HALL.depth + 1);
    }
  });
  test('bays face the nave and are numbered 1..8', () => {
    for (const b of bays) expect(Math.sign(b.facing)).toBe(b.side === 'left' ? 1 : -1);
    expect(bays.map((b) => b.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  test('the nave stays wide enough to walk (>= 20 m between bay fronts)', () => {
    const front = HALL.halfWidth - BAY.depth; expect(front * 2).toBeGreaterThanOrEqual(20);
  });
});
