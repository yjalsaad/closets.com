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
  test('the shell matches /showroom-3d and /ar/showroom-3d only', () => {
    for (const p of ['/showroom-3d', '/showroom-3d/', '/ar/showroom-3d', '/Showroom-3D']) expect(isShowroomPath(p)).toBe(true);
    for (const p of ['/', '/showroom', '/showrooms', '/showroom-3dx', '/ar/showrooms', '/x/showroom-3d', '']) expect(isShowroomPath(p)).toBe(false);
  });
});
