/* Cinematic intro: the whole sequence as DATA + pure functions (unit-tested). GSAP (director.js) only sequences it.
 * Seconds on one master clock. World units are metres, +Z toward the street, the glass facade is on z = 0. */
import { HALL } from '../3d/dimensions';

export const DURATION = 27;

/** key poses; position / look-at target / field of view are interpolated with a non-uniform cubic Hermite (continuous velocity). */
export const KEYFRAMES = [
  { t: 0,    p: [30, 15, 64],     l: [0, 5.5, 0],    fov: 36 },
  { t: 4.2,  p: [21, 10, 55],     l: [0, 5.2, 0],    fov: 37 },
  { t: 9,    p: [7, 5.8, 41],     l: [-0.5, 4.6, 0], fov: 40 },
  { t: 12.4, p: [1.8, 2.7, 23],   l: [0, 2.9, 0],    fov: 42 },
  { t: 15.2, p: [0.3, 1.75, 9.5], l: [0, 2.4, -2],   fov: 46 },
  { t: 17.8, p: [0, 1.7, 2.2],    l: [0, 2.6, -10],  fov: 50 },
  { t: 20.6, p: [0, 1.8, -5],     l: [0, 3.4, -22],  fov: 56 },
  { t: 23.6, p: [0, 2.0, -8],     l: [-3, 5.0, -26], fov: 62 },
  { t: 27,   p: [0, HALL.eye, -9], l: [0, 2.6, -30], fov: 68 },
];

/** the pose the free look-around starts from (identical to the last key, so the hand-over is seamless) */
export const HANDOVER = KEYFRAMES[KEYFRAMES.length - 1];

/** named shots (used for labels, tests, QA screenshots and the skip logic) */
export const SHOTS = [
  { id: 'logo',     start: 0 },
  { id: 'exterior', start: 3.4 },
  { id: 'approach', start: 9 },
  { id: 'doors',    start: 13 },
  { id: 'hall',     start: 17.2 },
];

/** one-value animations, time windows on the master clock */
export const EVENTS = {
  logoCard: { in: [0.3, 1.1], out: [2.5, 3.5] },   // logo card on the cream veil
  veil:     { start: 2.4, end: 4.0 },              // cream veil -> 0 (reveals the exterior)
  doors:    { start: 13.2, end: 16.4 },            // auto-open
  led:      { start: 14.5, end: 19.5, from: 0.55, to: 1 },
};

/** captions are windows on the clock; strings live in strings.js */
export const CAPTIONS = [
  { id: 'capBrand',   from: 4.6,  to: 8.6 },
  { id: 'capCraft',   from: 9.6,  to: 13.4 },
  { id: 'capWelcome', from: 17.6, to: 22.2 },
  { id: 'capLook',    from: 24.2, to: 27.01 },
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** cubic Hermite through keys with finite-difference tangents scaled by the (non-uniform) time gaps; zero velocity at both ends */
function tangent(keys, i, get) {
  if (i === 0 || i === keys.length - 1) return get(keys[i]).map(() => 0);
  const a = get(keys[i - 1]), b = get(keys[i + 1]);
  const dt = keys[i + 1].t - keys[i - 1].t;
  return a.map((_, k) => (b[k] - a[k]) / dt);
}
function hermite(keys, t, get) {
  const tt = clamp(t, keys[0].t, keys[keys.length - 1].t);
  let i = 0;
  while (i < keys.length - 2 && tt > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const h = k1.t - k0.t;
  const s = h > 0 ? (tt - k0.t) / h : 0;
  const p0 = get(k0), p1 = get(k1), m0 = tangent(keys, i, get), m1 = tangent(keys, i + 1, get);
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return p0.map((_, k) => h00 * p0[k] + h10 * h * m0[k] + h01 * p1[k] + h11 * h * m1[k]);
}

/** camera pose at master-clock time t: { p:[x,y,z], l:[x,y,z], fov } */
export function sampleCamera(t, keys = KEYFRAMES) {
  const p = hermite(keys, t, (k) => k.p);
  const l = hermite(keys, t, (k) => k.l);
  const fov = hermite(keys, t, (k) => [k.fov])[0];
  return { p, l, fov };
}

export function shotAt(t) {
  let id = SHOTS[0].id;
  for (const s of SHOTS) if (t >= s.start) id = s.id;
  return id;
}
export function captionAt(t) {
  const c = CAPTIONS.find((x) => t >= x.from && t < x.to);
  return c ? c.id : null;
}
const smooth = (x) => { const k = clamp(x, 0, 1); return k * k * (3 - 2 * k); };
const win = (t, a, b) => (b > a ? smooth((t - a) / (b - a)) : t >= b ? 1 : 0);

/** every animated scalar as a pure function of t (the GSAP tweens animate the same numbers; this is the reference for tests + seek) */
export function stateAt(t) {
  const E = EVENTS;
  return {
    t,
    shot: shotAt(t),
    caption: captionAt(t),
    veil: 1 - win(t, E.veil.start, E.veil.end),
    logo: win(t, E.logoCard.in[0], E.logoCard.in[1]) * (1 - win(t, E.logoCard.out[0], E.logoCard.out[1])),
    doorOpen: win(t, E.doors.start, E.doors.end),
    led: E.led.from + (E.led.to - E.led.from) * win(t, E.led.start, E.led.end),
  };
}

/** the "no motion" end state (prefers-reduced-motion / skip): doors open, lights on, standing at the hand-over pose */
export const FINAL_STATE = { ...stateAt(DURATION), veil: 0, logo: 0, caption: null };
export { lerp3 };
