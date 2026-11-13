import * as THREE from 'three';
import { sunScale, SUN_FADE, smooth01, gradeFor, GRADES, mixGrade } from '../3d/lighting';
import { aoQuad, mergeAo } from '../3d/builders';

describe('sun fade inside the hall (removes the hard facade stripes in the departments)', () => {
  test('full sun outside and at the entrance, the minimum deep inside, smooth and monotonic in between', () => {
    expect(sunScale(10)).toBe(1); expect(sunScale(-1)).toBe(1); expect(sunScale(SUN_FADE.fromZ)).toBe(1); expect(sunScale(SUN_FADE.toZ)).toBeCloseTo(SUN_FADE.min, 9); expect(sunScale(-30)).toBeCloseTo(SUN_FADE.min, 9);
    let last = 2; for (let z = 0; z >= -12; z -= 0.25) { const v = sunScale(z); expect(v).toBeLessThanOrEqual(last + 1e-12); expect(v).toBeGreaterThanOrEqual(SUN_FADE.min - 1e-12); last = v; }
  });
  test('every furnished bay stand point (|x| = 12.5, z <= -7.9) gets the minimum sun, the spawn (z = -9) too', () => { for (const z of [-7.9, -9, -15.5]) expect(sunScale(z)).toBeLessThan(0.3); });
  test('smooth01 clamps', () => { expect(smooth01(-1)).toBe(0); expect(smooth01(2)).toBe(1); expect(smooth01(0.5)).toBe(0.5); });
});

describe('colour grades', () => {
  test('one subtle grade per room; unknown falls back to neutral; tints stay close to white, contrast close to 1', () => {
    for (const k of ['kitchen', 'wardrobe', 'door', 'stage']) { const g = gradeFor(k); expect(g).toBe(GRADES[k]); for (const t of g.tint) expect(Math.abs(t - 1)).toBeLessThan(0.04); expect(Math.abs(g.contrast - 1)).toBeLessThan(0.08); expect(g.vignette).toBeLessThan(0.3); }
    expect(gradeFor('zzz')).toBe(GRADES.neutral);
  });
  test('mixGrade interpolates linearly', () => { const m = mixGrade(GRADES.neutral, GRADES.wardrobe, 0.5); expect(m.contrast).toBeCloseTo((GRADES.neutral.contrast + GRADES.wardrobe.contrast) / 2, 9); expect(mixGrade(GRADES.kitchen, GRADES.door, 0)).toEqual(GRADES.kitchen); });
});

describe('baked AO decals', () => {
  test('a quad has 6 vertices, the requested size, per-vertex alpha = strength and a gradient that is darkest (v = 0) along the chosen edge', () => {
    const g = aoQuad([0, 1, 0], [0, 0, 1], [0, 1, 0], 2, 0.5, '+v', 0.4), p = g.attributes.position, uv = g.attributes.uv, c = g.attributes.color;
    expect(p.count).toBe(6); expect(c.itemSize).toBe(4); for (let i = 0; i < 6; i++) expect(c.getW(i)).toBeCloseTo(0.4, 6);
    const box = new THREE.Box3().setFromBufferAttribute(p), s = new THREE.Vector3(); box.getSize(s); expect(s.z).toBeCloseTo(2, 6); expect(s.y).toBeCloseTo(0.5, 6);
    for (let i = 0; i < 6; i++) expect(uv.getY(i)).toBeCloseTo(p.getY(i) > 1 ? 0 : 1, 6);   // '+v' = dark at the top
  });
  test('each dark edge variant puts uv.y = 0 on that side', () => {
    for (const [d, axis, sgn] of [['-v', 'y', -1], ['+v', 'y', 1], ['-u', 'z', -1], ['+u', 'z', 1]]) {
      const g = aoQuad([0, 0, 0], [0, 0, 1], [0, 1, 0], 2, 2, d, 1), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < 6; i++) { const val = axis === 'y' ? p.getY(i) : p.getZ(i); expect(uv.getY(i)).toBeCloseTo(val * sgn > 0 ? 0 : 1, 6); }
    }
  });
  test('mergeAo concatenates quads into one geometry (one draw call)', () => { const a = aoQuad([0, 0, 0], [1, 0, 0], [0, 0, 1], 1, 1, '-v', 0.3), b = aoQuad([1, 0, 0], [1, 0, 0], [0, 0, 1], 1, 1, '+v', 0.6), m = mergeAo([a, b]); expect(m.attributes.position.count).toBe(12); expect(m.attributes.color.getW(11)).toBeCloseTo(0.6, 6); expect(m.attributes.color.getW(0)).toBeCloseTo(0.3, 6); });
});
