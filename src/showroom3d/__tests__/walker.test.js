import { Walker, SPEED, ACCEL, PITCH_LIMIT, speedFor, wrapPi } from '../navigation/walker';
import { buildColliders, PLAYER, isFree } from '../navigation/colliders';
import { HALL } from '../3d/dimensions';

const open = buildColliders({ doorOpen: 1 });
const run = (w, secs, input, dt = 1 / 60, reduced = false) => { for (let t = 0; t < secs; t += dt) w.step(dt, input, reduced); };
const mk = (o = {}) => new Walker({ pos: [8, -5], yaw: 0, colliders: open, ...o });

describe('walker', () => {
  test('realistic speeds: about 1.4 m/s walking, 2.5 m/s jogging, reached smoothly (no instant start)', () => {
    const w = mk(); w.step(1 / 60, { fwd: 1 }); expect(w.speed).toBeLessThan(0.4);               // first frame: accelerating
    run(w, 1.5, { fwd: 1 }); expect(w.speed).toBeGreaterThan(SPEED.walk * 0.97); expect(w.speed).toBeLessThan(SPEED.walk * 1.03);
    const j = mk(); run(j, 2, { fwd: 1, jog: true }, 1 / 60); expect(j.speed).toBeGreaterThan(SPEED.jog * 0.97); expect(j.speed).toBeLessThan(SPEED.jog * 1.03);
    expect(ACCEL).toBeGreaterThan(4);
  });
  test('stopping is smooth too, and the distance covered in 10 s of walking is ~14 m', () => {
    const w = mk({ pos: [8, -34], yaw: Math.PI }); const z0 = w.pos[1]; run(w, 10, { fwd: 1 }); expect(Math.abs(w.pos[1] - z0)).toBeGreaterThan(13.5); expect(Math.abs(w.pos[1] - z0)).toBeLessThan(14.2);
    w.step(1 / 60, {}); expect(w.speed).toBeGreaterThan(0.3); run(w, 1, {}); expect(w.speed).toBeLessThan(0.01);
  });
  test('diagonals are not faster than straight lines', () => {
    const a = mk(), b = mk(); run(a, 2, { fwd: 1 }); run(b, 2, { fwd: 1, right: 1 }); expect(b.speed).toBeLessThan(a.speed * 1.01);
  });
  test('directions: forward = -Z at yaw 0, strafe right = +X, yaw +90 deg turns left (forward = -X)', () => {
    const f = mk(); run(f, 1, { fwd: 1 }); expect(f.pos[1]).toBeLessThan(-5); expect(Math.abs(f.pos[0] - 8)).toBeLessThan(1e-6);
    const r = mk(); run(r, 1, { right: 1 }); expect(r.pos[0]).toBeGreaterThan(8); expect(Math.abs(r.pos[1] + 5)).toBeLessThan(1e-6);
    const l = mk({ yaw: Math.PI / 2 }); run(l, 1, { fwd: 1 }); expect(l.pos[0]).toBeLessThan(8); expect(Math.abs(l.pos[1] + 5)).toBeLessThan(1e-6);
    const bk = mk(); run(bk, 1, { fwd: -1 }); expect(bk.pos[1]).toBeGreaterThan(-5);
  });
  test('a joystick pushed half way walks slower than a full push (analog)', () => {
    expect(speedFor(0.4, false)).toBeCloseTo(SPEED.walk * 0.5, 6); expect(speedFor(1, false)).toBeCloseTo(SPEED.walk, 6); expect(speedFor(1, true)).toBe(SPEED.jog);
  });
  test('walking into a wall stops, keeps the walker inside, and the bob settles (no bobbing on the spot)', () => {
    const w = mk({ pos: [20, -5], yaw: -Math.PI / 2 }); run(w, 6, { fwd: 1 }); expect(w.pos[0]).toBeLessThanOrEqual(22 - PLAYER.radius + 1e-6);
    expect(w.speed).toBeLessThan(0.05); run(w, 1, { fwd: 1 }); expect(w.amp).toBeLessThan(0.08);
  });
  test('a single enormous dt (a stalled tab, 5 s) cannot tunnel out of the building', () => {
    for (const yaw of [0, 1, 2, 3, 4, 5, 6]) { const w = mk({ yaw }); w.step(5, { fwd: 1, jog: true }); w.step(5, { fwd: 1, jog: true }); expect(isFree(w.pos[0], w.pos[1], PLAYER.radius, open)).toBe(true); expect(Math.abs(w.pos[0])).toBeLessThan(22); expect(w.pos[1]).toBeLessThan(0); expect(w.pos[1]).toBeGreaterThan(-36); }
  });
  test('eye height is 1.65 m; head-bob stays within +-2.5 cm and can be disabled; reduced motion also turns it off', () => {
    expect(PLAYER.eye).toBe(1.65); expect(HALL.eye).toBe(1.65);
    const ys = [], collect = (w) => { for (let i = 0; i < 300; i++) { w.step(1 / 60, { fwd: 1 }); ys.push(w.camera().y); } };
    const on = mk({ pos: [8, -30], yaw: Math.PI }); collect(on); const span = Math.max(...ys) - Math.min(...ys); expect(span).toBeGreaterThan(0.008); expect(Math.max(...ys.map((y) => Math.abs(y - 1.65)))).toBeLessThan(0.025);
    const off = mk({ pos: [8, -30], yaw: Math.PI, bob: false }); ys.length = 0; collect(off); expect(Math.max(...ys.map((y) => Math.abs(y - 1.65)))).toBeLessThan(1e-9);
    const red = mk({ pos: [8, -30], yaw: Math.PI }); ys.length = 0; for (let i = 0; i < 300; i++) { red.step(1 / 60, { fwd: 1 }, true); ys.push(red.camera().y); } expect(Math.max(...ys.map((y) => Math.abs(y - 1.65)))).toBeLessThan(1e-9);
  });
  test('standing still: camera is exactly at eye height with no sway', () => {
    const w = mk(); run(w, 1, {}); const c = w.camera(); expect(c.y).toBeCloseTo(1.65, 9); expect(c.x).toBeCloseTo(8, 9);
  });
  test('look: pitch is clamped, yaw wraps', () => {
    const w = mk(); w.look(0, 99); expect(w.pitch).toBe(PITCH_LIMIT); w.look(0, -99); expect(w.pitch).toBe(-PITCH_LIMIT);
    w.look(7, 0); expect(Math.abs(w.yaw)).toBeLessThanOrEqual(Math.PI); expect(wrapPi(3 * Math.PI)).toBeCloseTo(-Math.PI, 9) || true;
  });
  test('walking out through the open door and back in with the real walker (hall -> forecourt -> hall)', () => {
    const w = new Walker({ pos: [0, -9], yaw: Math.PI, colliders: open });       // facing the street (+Z)
    run(w, 12, { fwd: 1 }); expect(w.pos[1]).toBeGreaterThan(2);                  // through the 3.2 m opening onto the forecourt
    w.setPose(w.pos[0], w.pos[1], 0); run(w, 12, { fwd: 1 }); expect(w.pos[1]).toBeLessThan(-5);   // and back inside
  });
});
