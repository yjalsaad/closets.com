import { DURATION, KEYFRAMES, SHOTS, EVENTS, CAPTIONS, HANDOVER, FINAL_STATE, sampleCamera, shotAt, captionAt, stateAt } from '../cinematic/timeline';
import { HALL } from '../3d/dimensions';
import { STRINGS } from '../strings';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('cinematic timeline config', () => {
  test('keyframes are strictly increasing and span exactly the duration', () => {
    expect(KEYFRAMES[0].t).toBe(0);
    expect(KEYFRAMES[KEYFRAMES.length - 1].t).toBe(DURATION);
    for (let i = 1; i < KEYFRAMES.length; i++) expect(KEYFRAMES[i].t).toBeGreaterThan(KEYFRAMES[i - 1].t);
  });

  test('sampling hits every key pose exactly', () => {
    for (const k of KEYFRAMES) {
      const s = sampleCamera(k.t);
      expect(dist(s.p, k.p)).toBeLessThan(1e-9);
      expect(dist(s.l, k.l)).toBeLessThan(1e-9);
      expect(s.fov).toBeCloseTo(k.fov, 9);
    }
  });

  test('clamps outside the clock range', () => {
    expect(sampleCamera(-5).p).toEqual(sampleCamera(0).p);
    expect(sampleCamera(999).p).toEqual(sampleCamera(DURATION).p);
  });

  test('the path is smooth: bounded speed everywhere, no jump across any key, rests at both ends', () => {
    const dt = 1 / 60;
    let prev = sampleCamera(0), maxSpeed = 0;
    for (let t = dt; t <= DURATION + 1e-9; t += dt) {
      const s = sampleCamera(t); maxSpeed = Math.max(maxSpeed, dist(s.p, prev.p) / dt); prev = s;
    }
    expect(maxSpeed).toBeLessThan(9);   // m/s, a brisk cinematic dolly, never a cut
    for (const k of KEYFRAMES.slice(1, -1)) {
      const a = sampleCamera(k.t - 1e-3), b = sampleCamera(k.t + 1e-3);
      expect(dist(a.p, b.p) / 2e-3).toBeLessThan(9);
    }
    expect(dist(sampleCamera(0).p, sampleCamera(0.01).p) / 0.01).toBeLessThan(0.2);                       // eases in
    expect(dist(sampleCamera(DURATION).p, sampleCamera(DURATION - 0.01).p) / 0.01).toBeLessThan(0.2);     // eases out into the hand-over
  });

  test('hand-over pose is the last key (seamless hand-off to look-around), standing at eye height inside the hall', () => {
    expect(HANDOVER).toBe(KEYFRAMES[KEYFRAMES.length - 1]);
    expect(HANDOVER.p[1]).toBe(HALL.eye);
    expect(HANDOVER.p[2]).toBeLessThan(0);
  });

  test('shots resolve in order: logo, exterior, approach, doors, hall', () => {
    expect(SHOTS.map((s) => s.id)).toEqual(['logo', 'exterior', 'approach', 'doors', 'hall']);
    expect(shotAt(0)).toBe('logo'); expect(shotAt(3.5)).toBe('exterior'); expect(shotAt(10)).toBe('approach');
    expect(shotAt(14)).toBe('doors'); expect(shotAt(20)).toBe('hall'); expect(shotAt(DURATION)).toBe('hall');
  });

  test('the camera never passes through the glass: the doors are fully open when it crosses the facade plane', () => {
    let crossed = null;
    for (let t = 0; t <= DURATION; t += 0.01) { if (sampleCamera(t).p[2] < 0.3) { crossed = t; break; } }
    expect(crossed).not.toBeNull();
    expect(stateAt(crossed).doorOpen).toBeGreaterThanOrEqual(0.99);
    expect(Math.abs(sampleCamera(crossed).p[0])).toBeLessThan(HALL.doorHalfOpening);
    for (let t = 0; t < crossed; t += 0.05) expect(sampleCamera(t).p[2]).toBeGreaterThan(0.2);
  });

  test('inside the hall the camera stays inside the walls and below the ceiling', () => {
    for (let t = EVENTS.doors.end; t <= DURATION; t += 0.1) {
      const p = sampleCamera(t).p;
      expect(Math.abs(p[0])).toBeLessThan(HALL.halfWidth - 1);
      expect(p[1]).toBeGreaterThan(0.5); expect(p[1]).toBeLessThan(HALL.height - 1);
      expect(p[2]).toBeGreaterThan(-HALL.depth + 1);
    }
  });

  test('event windows are ordered and inside the clock', () => {
    expect(EVENTS.veil.end).toBeLessThanOrEqual(KEYFRAMES[1].t);
    expect(EVENTS.doors.start).toBeLessThan(EVENTS.doors.end);
    expect(EVENTS.doors.end).toBeLessThan(DURATION);
    expect(EVENTS.logoCard.out[1]).toBeLessThanOrEqual(EVENTS.veil.end);
  });

  test('state is a pure function of t: veil lifts, doors open once, lights rise', () => {
    expect(stateAt(0).veil).toBe(1); expect(stateAt(DURATION).veil).toBe(0);
    expect(stateAt(0).doorOpen).toBe(0); expect(stateAt(DURATION).doorOpen).toBe(1);
    let last = 0; for (let t = 0; t <= DURATION; t += 0.1) { const d = stateAt(t).doorOpen; expect(d).toBeGreaterThanOrEqual(last - 1e-9); last = d; }
    expect(stateAt(0).led).toBeCloseTo(EVENTS.led.from, 6); expect(stateAt(DURATION).led).toBeCloseTo(EVENTS.led.to, 6);
    expect(stateAt(1.5).logo).toBeGreaterThan(0.99);
  });

  test('every caption id exists in the EN and AR strings and windows do not overlap', () => {
    for (const c of CAPTIONS) { expect(STRINGS[c.id]).toBeDefined(); expect(STRINGS[c.id].ar.length).toBeGreaterThan(0); }
    for (let i = 1; i < CAPTIONS.length; i++) expect(CAPTIONS[i].from).toBeGreaterThanOrEqual(CAPTIONS[i - 1].to);
    expect(captionAt(5)).toBe('capBrand'); expect(captionAt(0)).toBeNull();
  });

  test('FINAL_STATE (reduced motion / skip) is the finished scene: doors open, lights on, no veil', () => {
    expect(FINAL_STATE.doorOpen).toBe(1); expect(FINAL_STATE.veil).toBe(0); expect(FINAL_STATE.led).toBeCloseTo(EVENTS.led.to, 6);
  });
});
