import * as THREE from 'three';
import { bevelBox, flutedPanel, projectUV, mergeColored, placed, roundRect, slabFromShape } from '../3d/builders';

const bbox = (g) => { g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s); return s; };
const uvRange = (g, sel) => { const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; let a = 1e9, b = -1e9, c = 1e9, d = -1e9, used = 0; for (let i = 0; i < p.count; i++) { if (!sel(n.getX(i), n.getY(i), n.getZ(i))) continue; used++; a = Math.min(a, uv.getX(i)); b = Math.max(b, uv.getX(i)); c = Math.min(c, uv.getY(i)); d = Math.max(d, uv.getY(i)); } return { du: b - a, dv: d - c, used }; };

describe('bevelBox', () => {
  test('has the requested size, a real chamfer (more than the 12 triangles of a plain box) and normals + uv', () => {
    const g = bevelBox(0.019, 0.7, 0.9, { b: 0.002 }); const s = bbox(g);
    expect(s.x).toBeCloseTo(0.019, 4); expect(s.y).toBeCloseTo(0.7, 4); expect(s.z).toBeCloseTo(0.9, 4);
    expect(g.attributes.position.count / 3).toBeGreaterThan(12); expect(g.attributes.normal).toBeTruthy(); expect(g.attributes.uv.count).toBe(g.attributes.position.count);
  });
  test('the bevel is small and edges are cut (no vertex at the sharp corner)', () => {
    const g = bevelBox(1, 1, 1, { b: 0.01 }); const p = g.attributes.position; let corner = 0; for (let i = 0; i < p.count; i++) if (Math.abs(Math.abs(p.getX(i)) - 0.5) < 1e-6 && Math.abs(Math.abs(p.getY(i)) - 0.5) < 1e-6 && Math.abs(Math.abs(p.getZ(i)) - 0.5) < 1e-6) corner++;
    expect(corner).toBe(0);
  });
  test('a bevel larger than the part is clamped, never inverting the geometry', () => { const s = bbox(bevelBox(0.01, 0.5, 0.5, { b: 0.5 })); expect(s.x).toBeCloseTo(0.01, 4); });
});

describe('grain-aware UVs (the timber textures have their grain along U)', () => {
  test('grain "z": on the +X front face of a drawer front, U follows the width (z) and V the height', () => {
    const g = bevelBox(0.02, 0.3, 0.9, { grain: 'z', tile: 1 }); const r = uvRange(g, (nx) => nx > 0.99);
    expect(r.du).toBeCloseTo(0.9 - 0.004, 2); expect(r.dv).toBeCloseTo(0.3 - 0.004, 2);
  });
  test('grain "y": on the same face U follows the HEIGHT (vertical grain for a tall door), V the width', () => {
    const g = bevelBox(0.02, 2.4, 0.6, { grain: 'y', tile: 1 }); const r = uvRange(g, (nx) => nx > 0.99);
    expect(r.du).toBeCloseTo(2.4 - 0.004, 2); expect(r.dv).toBeCloseTo(0.6 - 0.004, 2);
  });
  test('tile scales the repeat (metres per texture) and the offset shifts it', () => {
    const a = bevelBox(0.02, 0.5, 1, { grain: 'z', tile: 1 }), b = bevelBox(0.02, 0.5, 1, { grain: 'z', tile: 0.5 });
    expect(uvRange(b, (nx) => nx > 0.99).du).toBeCloseTo(2 * uvRange(a, (nx) => nx > 0.99).du, 5);
    const c = bevelBox(0.02, 0.5, 1, { grain: 'z', tile: 1, off: [0.25, 0] }); expect(c.attributes.uv.getX(0) - a.attributes.uv.getX(0)).toBeCloseTo(0.25, 6);
  });
  test('projectUV can re-map any geometry (end grain falls back to the two tangent axes)', () => {
    const g = projectUV(new THREE.BoxGeometry(1, 1, 1), { grain: 'x', tile: 1 }); const top = uvRange(g, (nx, ny) => ny > 0.99); expect(top.du).toBeCloseTo(1, 6);
  });
});

describe('fluted panel (real geometry)', () => {
  test('is w x h x t, single geometry, ridges rise above the core and the count tracks the pitch', () => {
    const g = flutedPanel(0.6, 2.4, 0.02, { pitch: 0.04, relief: 0.01 }), s = bbox(g);
    expect(s.x).toBeCloseTo(0.6, 3); expect(s.y).toBeCloseTo(2.4, 2); expect(s.z).toBeCloseTo(0.02, 3);
    const g2 = flutedPanel(0.6, 2.4, 0.02, { pitch: 0.02, relief: 0.01 }); expect(g2.attributes.position.count).toBeGreaterThan(g.attributes.position.count);
    expect(g.attributes.position.count / 3).toBeLessThan(2500);   // light: ~15 flutes
  });
  test('the reeds have varying normals (not a flat plate) and uv follows the vertical grain', () => {
    const g = flutedPanel(0.4, 1, 0.02, { pitch: 0.04 }); const n = g.attributes.normal; const xs = new Set(); for (let i = 0; i < n.count; i++) if (n.getZ(i) > 0.2) xs.add(Math.round(n.getX(i) * 20)); expect(xs.size).toBeGreaterThan(4);
    expect(g.attributes.uv.count).toBe(g.attributes.position.count);
  });
});

describe('merging', () => {
  test('mergeColored keeps one colour per source geometry (a shelf of props = one draw call)', () => {
    const m = mergeColored([{ geo: new THREE.BoxGeometry(1, 1, 1), color: 0xff0000 }, { geo: placed(new THREE.SphereGeometry(0.5, 8, 6), { x: 2 }), color: 0x0000ff }]);
    const c = m.attributes.color, n = m.attributes.position.count; expect(c.count).toBe(n); expect(c.getX(0)).toBeCloseTo(1, 6); expect(c.getZ(0)).toBeCloseTo(0, 6); expect(c.getZ(n - 1)).toBeCloseTo(1, 6); expect(c.getX(n - 1)).toBeCloseTo(0, 6);
  });
  test('slabFromShape cuts a hole (sink) and roundRect builds a closed outline', () => {
    const sh = new THREE.Shape(); sh.moveTo(-1, -1); sh.lineTo(1, -1); sh.lineTo(1, 1); sh.lineTo(-1, 1); sh.closePath(); const solid = slabFromShape(sh, 0.04).attributes.position.count;
    sh.holes.push(roundRect(0.5, 0.4, 0.05)); expect(slabFromShape(sh, 0.04).attributes.position.count).toBeGreaterThan(solid);
    const pts = roundRect(1, 0.5, 0.1).getPoints(); expect(pts.length).toBeGreaterThan(8);
  });
});
