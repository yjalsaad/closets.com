import { yawPitchFromLookAt, forwardFromYawPitch, clampPosition, creep, LIMITS } from '../navigation/lookAround';
import { HANDOVER } from '../cinematic/timeline';
import { HALL } from '../3d/dimensions';

describe('look-around placeholder maths', () => {
  test('yaw/pitch round-trips through the forward vector', () => {
    const p = [1, 1.65, -10], l = [4, 3, -30];
    const { yaw, pitch } = yawPitchFromLookAt(p, l); const f = forwardFromYawPitch(yaw, pitch);
    const d = [l[0] - p[0], l[1] - p[1], l[2] - p[2]], n = Math.hypot(...d);
    for (let i = 0; i < 3; i++) expect(f[i]).toBeCloseTo(d[i] / n, 6);
  });
  test('the hand-over looks down the hall (-Z) and slightly up', () => {
    const { yaw, pitch } = yawPitchFromLookAt(HANDOVER.p, HANDOVER.l);
    expect(Math.abs(yaw)).toBeLessThan(0.01); expect(pitch).toBeGreaterThan(0); expect(pitch).toBeLessThan(0.2);
  });
  test('position is clamped inside the hall at eye height', () => {
    expect(clampPosition([99, 5, 99])).toEqual([LIMITS.maxX, HALL.eye, LIMITS.maxZ]);
    expect(clampPosition([-99, 0, -99])).toEqual([LIMITS.minX, HALL.eye, LIMITS.minZ]);
  });
  test('creeping forward moves toward -Z at yaw 0 and never leaves the bounds', () => {
    const p = creep([0, HALL.eye, -12], 0, 2); expect(p[2]).toBeCloseTo(-14, 6);
    let q = [0, HALL.eye, -12]; for (let i = 0; i < 200; i++) q = creep(q, 0, 1); expect(q[2]).toBe(LIMITS.minZ);
    for (let i = 0; i < 200; i++) q = creep(q, 0, -1); expect(q[2]).toBe(LIMITS.maxZ);
  });
});
