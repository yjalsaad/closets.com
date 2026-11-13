import { PLAYER, WALK_RECTS, buildColliders, moveCircle, resolve, pushOut, isFree, segmentClear, DOOR_OPEN_AT, MAX_SUBSTEP } from '../navigation/colliders';
import { HANDOVER } from '../cinematic/timeline';
import { layoutBays } from '../scenes/main-hall/departments';
import { mulberry32 } from '../3d/noise';

const R = PLAYER.radius;
const bx = (minX, maxX, minZ, maxZ) => ({ type: 'box', minX, maxX, minZ, maxZ });
/** independent statement of the walkable region: centre of the circle may be here (hall / forecourt / path inset by R, plus the door corridor) */
function walkableUnion(x, z, doorOpen = true) {
  const e = 1e-6, inR = (r, ix = R, iz = R) => x >= r.minX + ix - e && x <= r.maxX - ix + e && z >= r.minZ + iz - e && z <= r.maxZ - iz + e;
  const W = WALK_RECTS;
  if (inR(W.hall)) return true;
  if (inR(W.forecourt)) return true;
  const jx = z <= W.forecourt.maxZ + R ? 0 : R;                                   // rounding the hedge corner at the path mouth is allowed
  if (x >= W.path.minX + jx - e && x <= W.path.maxX - jx + e && z >= W.forecourt.maxZ - R - e && z <= W.path.maxZ - R + e) return true;   // path incl. junction
  if (doorOpen && Math.abs(x) <= W.doorway.maxX + e && z >= W.hall.maxZ - R - e && z <= W.forecourt.minZ + R + e) return true;      // door corridor
  return false;
}

describe('circle vs box / circle / OBB', () => {
  test('a circle moving diagonally into a wall slides along it (does not stick, does not enter)', () => {
    const wall = [bx(1, 6, -50, 50)];
    const p = moveCircle([0, 0], 3, 3, R, wall);
    expect(p[0]).toBeLessThanOrEqual(1 - R + 1e-6); expect(p[0]).toBeGreaterThan(1 - R - 0.01);
    expect(p[1]).toBeCloseTo(3, 1);                       // full tangential travel preserved
  });
  test('a head-on move stops flush against the wall', () => {
    const p = moveCircle([0, 0], 5, 0, R, [bx(1, 6, -9, 9)]); expect(p[0]).toBeCloseTo(1 - R, 5); expect(p[1]).toBeCloseTo(0, 6);
  });
  test('convex corner: the circle rounds the corner on a circular arc and never penetrates', () => {
    const corner = [bx(0, 4, 0, 4)];
    let p = [-1, -1];
    for (let i = 0; i < 60; i++) { p = moveCircle(p, 0.05, 0.03, R, corner); expect(isFree(p[0], p[1], R, corner, 1e-4)).toBe(true); }
    p = moveCircle([-1, -1], 2, 2, R, corner);   // aimed straight at the corner point
    expect(isFree(p[0], p[1], R, corner, 1e-4)).toBe(true); expect(Math.hypot(p[0], p[1])).toBeGreaterThanOrEqual(R - 1e-6);
  });
  test('concave corner (two walls): ends in the corner, penetrates neither', () => {
    const c = [bx(1, 9, -9, 9), bx(-9, 9, 1, 9)];
    const p = moveCircle([0, 0], 4, 4, R, c);
    expect(p[0]).toBeCloseTo(1 - R, 3); expect(p[1]).toBeCloseTo(1 - R, 3); expect(isFree(p[0], p[1], R, c, 1e-4)).toBe(true);
  });
  test('huge dt cannot tunnel through a thin (0.3 m) wall', () => {
    const wall = [bx(2, 2.3, -100, 100)];
    for (const d of [3, 30, 400]) { const p = moveCircle([0, 0], d, 0.2 * d, R, wall); expect(p[0]).toBeLessThanOrEqual(2 - R + 1e-6); }
    expect(MAX_SUBSTEP).toBeLessThan(R / 2);
  });
  test('circle obstacle and oriented box (45 degrees) push the walker out', () => {
    const post = { type: 'circle', x: 0, z: 0, r: 0.5 };
    expect(Math.hypot(...pushOut(0.3, 0, R, post))).toBeCloseTo(0.5 + R, 6);
    const o = { type: 'obb', cx: 0, cz: 0, hx: 1, hz: 0.25, rot: Math.PI / 4 };
    const q = pushOut(0.1, 0.1, R, o); expect(q).not.toBeNull();
    expect(pushOut(q[0], q[1], R - 1e-6, o)).toBeNull();                        // now just touching
    // a far point along the box's long axis (45 deg) is NOT touched, one beside the long side is
    expect(pushOut(0.7, 0.7, R, o)).not.toBeNull(); expect(pushOut(-1.4, 1.4, R, o)).toBeNull();
    // sliding along the OBB: walking head-on at its long side keeps the circle outside
    let p = [-3, 0]; for (let i = 0; i < 100; i++) p = moveCircle(p, 0.1, 0, R, [o]);
    expect(pushOut(p[0], p[1], R - 1e-4, o)).toBeNull();
  });
  test('a centre that ends up inside a box (teleport) is ejected through the nearest face', () => {
    const [x, z] = resolve(1.9, 0, R, [bx(0, 2, -5, 5)]); expect(x).toBeCloseTo(2 + R, 6); expect(z).toBe(0);
  });
});

describe('the showroom obstacle set', () => {
  const open = buildColliders({ doorOpen: 1 }), closed = buildColliders({ doorOpen: 0 });
  test('the spawn / hand-over point is free and inside the hall', () => {
    const [x, z] = [HANDOVER.p[0], HANDOVER.p[2]];
    expect(isFree(x, z, R, open)).toBe(true); expect(isFree(x, z, R, closed)).toBe(true); expect(walkableUnion(x, z)).toBe(true);
    expect(HANDOVER.p[1]).toBeCloseTo(1.65, 6);
  });
  test('walking straight forward from the spawn is stopped by the first bench', () => {
    const p = moveCircle([HANDOVER.p[0], HANDOVER.p[2]], 0, -100, R, open);
    expect(p[1]).toBeCloseTo(-14.25 + R, 3);
  });
  test('every wall of the hall stops the walker', () => {
    expect(moveCircle([0, -11.7], 99, 0, R, open)[0]).toBeCloseTo(22 - R, 3);          // z = -11.7: the 0.8 m gap between two bays (every bay is furnished and solid now)
    expect(moveCircle([0, -11.7], -99, 0, R, open)[0]).toBeCloseTo(-22 + R, 3);
    expect(moveCircle([10, -9], 0, -99, R, open)[1]).toBeCloseTo(-36 + R, 3);
    expect(moveCircle([10, -9], 0, 99, R, open)[1]).toBeCloseTo(-0.2 - R, 3);        // glass facade (not the door)
    expect(moveCircle([-18, -9], 0, 99, R, open)[1]).toBeCloseTo(-0.8 - R, 3);       // solid wing is thicker
  });
  test('benches, planters and bay posts are solid', () => {
    expect(moveCircle([5, -15], -99, 0, R, open)[0]).toBeCloseTo(3.2 + R, 3);
    expect(moveCircle([0, -20], 0, 9, R, open)[1]).toBeCloseTo(-15.75 - R, 3);   // approaching the first bench from behind
    const pl = moveCircle([13, -2], 0, -9, R, open); expect(pl[1]).toBeGreaterThan(-5.2 + 0.95 + R - 0.01);
    // bay portal post (left bay 1): walk into it from the nave along its z
    const z = -7.9 - (6.8 / 2 - 0.15); const p = moveCircle([-15, z], -9, 0, R, open); expect(p[0]).toBeGreaterThan(-21.5 - R - 0.01);
  });
  test('the bay alcoves themselves are open floor: a visitor can stand in every bay centre', () => {
    for (const b of layoutBays()) {                                                                                         // all eight bays: solid at the wall (the furniture), open floor in front of it
      const s = b.facing; expect(isFree(b.x + s * -2.8, b.z, R, open)).toBe(false); expect(isFree(b.x + s * 3.2, b.z, R, open)).toBe(true); expect(isFree(b.x + s * 6.5, b.z, R, open)).toBe(true);
    }
  });
  test('closed doors block both ways; open doors let you through and back', () => {
    expect(DOOR_OPEN_AT).toBeLessThan(1);
    expect(moveCircle([0, -3], 0, 9, R, closed)[1]).toBeCloseTo(-0.2 - R, 3);
    expect(moveCircle([0, 6], 0, -9, R, closed)[1]).toBeCloseTo(0.35 + R, 3);
    let p = moveCircle([0, -3], 0, 9, R, open); expect(p[1]).toBeCloseTo(6, 3);
    p = moveCircle(p, 0, -9, R, open); expect(p[1]).toBeCloseTo(-3, 3);
  });
  test('the opening is exactly the door width: off-centre walkers are stopped by the frame', () => {
    const p = moveCircle([1.9, -3], 0, 9, R, open); expect(p[1]).toBeLessThan(0);          // aimed at the glass beside the door
    const q = moveCircle([1.2, -3], 0, 9, R, open); expect(q[1]).toBeGreaterThan(5);
    const s = moveCircle([1.45, -3], 0, 9, R, open); expect(Math.abs(s[0])).toBeLessThanOrEqual(1.25 + 1e-3);   // grazing the frame slides you to the centre
  });
  test('exterior: the forecourt is bounded by hedges, basins and planters; the path ends at 36 m', () => {
    expect(moveCircle([0, 6], 0, 200, R, open)[1]).toBeLessThanOrEqual(36 - R + 1e-6);
    expect(moveCircle([20, 10], 99, 0, R, open)[0]).toBeLessThanOrEqual(24.6 + 1e-6);
    expect(moveCircle([-20, 10], -99, 0, R, open)[0]).toBeGreaterThanOrEqual(-24.6 - 1e-6);
    expect(moveCircle([11, 1], 0, 99, R, open)[1]).toBeCloseTo(11 - 6.5 - R, 3);          // basin
    expect(moveCircle([15, 1], 0, 99, R, open)[1]).toBeCloseTo(11 - 6.5 - R, 3);
    expect(moveCircle([-12, 22], 0, 99, R, open)[1]).toBeLessThanOrEqual(22.2 + 1e-6);   // front hedge row beside the path
  });
  test('olive planters only exist as colliders for the olives actually built', () => {
    expect(buildColliders({ oliveCount: 2 }).filter((c) => /^olive/.test(c.id))).toHaveLength(2);
    expect(buildColliders({}).filter((c) => /^olive/.test(c.id))).toHaveLength(4);
  });
  test('nothing walkable outside the bounds: 2 x 1 100 random long moves from free points never leave the walkable union', () => {
    const rnd = mulberry32(2024); const rects = [WALK_RECTS.hall, WALK_RECTS.forecourt, WALK_RECTS.path];
    for (const door of [true, false]) {
      const cols = buildColliders({ doorOpen: door ? 1 : 0 }); let n = 0, bad = 0;
      for (let i = 0; i < 1100; i++) {
        const r = rects[Math.floor(rnd() * 3)];
        let x = r.minX + R + rnd() * (r.maxX - r.minX - 2 * R), z = r.minZ + R + rnd() * (r.maxZ - r.minZ - 2 * R);
        if (!isFree(x, z, R, cols)) continue;
        const a = rnd() * Math.PI * 2, len = Math.pow(rnd(), 2) * 30;       // up to 30 m in one go = a dt of tens of seconds
        const p = moveCircle([x, z], Math.cos(a) * len, Math.sin(a) * len, R, cols); n++;
        if (!walkableUnion(p[0], p[1], door) || !isFree(p[0], p[1], R, cols, 1e-4)) bad++;
      }
      expect(n).toBeGreaterThan(450); expect(bad).toBe(0);
    }
  });
  test('a 360-degree ray fan from the spawn (and from the forecourt) never escapes', () => {
    for (const start of [[0, -9], [0, 6], [-20, 10], [0, 30]]) for (let k = 0; k < 360; k += 6) {
      const a = (k * Math.PI) / 180, p = moveCircle(start, Math.cos(a) * 70, Math.sin(a) * 70, R, open);
      expect(walkableUnion(p[0], p[1])).toBe(true);
    }
  });
  test('segmentClear detects a bench in the way', () => {
    expect(segmentClear([0, -9], [0, -20], R, open)).toBe(false); expect(segmentClear([8, -9], [8, -30], R, open)).toBe(true);
  });
});
