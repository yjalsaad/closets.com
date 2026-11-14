/* Character animation state machine (PURE: no three.js, no DOM; unit-tested). One state per character: idle (breathing, weight shift, blinking), walk (stride phase follows
 * the distance walked), gesture (open hand, point, welcome with a hand on the chest, wave) and talk (jaw / head / hand beats driven by a speech envelope). States blend with
 * smoothed weights so nothing snaps. pose(anim) returns joint angles in radians (+ small offsets in metres) for the rig. */
export const STATES = Object.freeze(['idle', 'walk', 'gesture', 'talk']);
export const GESTURES = Object.freeze({ open: 1.7, point: 1.5, chest: 2.0, wave: 2.2 });   // durations in seconds
const lerp = (a, b, k) => a + (b - a) * k, clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const bump = (t, d) => Math.pow(Math.sin(Math.PI * clamp01(t / d)), 0.6);          // 0 -> 1 -> 0 over d seconds

export function createAnim({ seed = 1 } = {}) {
  return { t: 0, seed, w: { walk: 0, talk: 0, gesture: 0 }, phase: 0, gesture: null, gt: 0, talking: false, level: 0, speed: 0, nextBlink: 1.2 + (seed % 5) * 0.4, blink: 0, blinkT: -1 };
}
/** the visible state: gesture wins, then walk, then talk, else idle */
export function stateOf(a) { return a.w.gesture > 0.5 ? 'gesture' : a.w.walk > 0.5 ? 'walk' : a.w.talk > 0.5 ? 'talk' : 'idle'; }
export function playGesture(a, name) { if (!GESTURES[name]) return false; a.gesture = name; a.gt = 0; return true; }
/** advance by dt. input: { speed (m/s, 0 = standing), talking (bool), level (0..1 speech envelope), reduced } */
export function updateAnim(a, dt, { speed = 0, talking = false, level = 0, reduced = false } = {}) {
  if (!(dt > 0)) return a;
  a.t += dt; a.speed = speed; a.talking = !!talking; a.level = clamp01(level);
  const k = 1 - Math.exp(-8 * dt);
  a.w.walk = lerp(a.w.walk, speed > 0.08 ? clamp01(speed / 1.4) : 0, k);
  a.w.talk = lerp(a.w.talk, talking ? 1 : 0, k);
  if (a.gesture) { a.gt += dt; if (a.gt >= GESTURES[a.gesture]) { a.gesture = null; a.gt = 0; } }
  a.w.gesture = lerp(a.w.gesture, a.gesture ? 1 : 0, 1 - Math.exp(-12 * dt));
  a.phase += dt * speed * Math.PI / 0.62;                                           // one half-stride per ~0.62 m: feet match the ground speed
  if (reduced) { a.blink = 0; a.blinkT = -1; }
  else if (a.blinkT >= 0) { a.blinkT += dt; a.blink = Math.sin(Math.PI * clamp01(a.blinkT / 0.16)); if (a.blinkT > 0.16) { a.blinkT = -1; a.blink = 0; a.nextBlink = a.t + 2.2 + ((a.seed * 7 + Math.floor(a.t)) % 4) * 0.9; } }
  else if (a.t >= a.nextBlink) a.blinkT = 0;
  return a;
}
/** syllable-like speech envelope 0..1 for a text at time t (deterministic: vowels open the jaw wide, consonants a little, spaces / punctuation close it) */
export function speechEnvelope(text, t) {
  if (!text) return 0; const i = Math.floor(t * 13) % text.length, c = text[i], f = (t * 13) % 1;
  if (/[\s.,;:!?،؛؟]/.test(c)) return 0.04;
  const open = /[aeiouyاوي]/i.test(c) ? 1 : 0.55; return open * (0.55 + 0.45 * Math.sin(Math.PI * f));
}
/** joint angles for this instant. Right arm = the gesturing arm. */
export function pose(a, { reduced = false } = {}) {
  const t = a.t, W = a.w, br = reduced ? 0 : Math.sin(t * 1.6), idle = 1 - W.walk;
  const sw = Math.sin(a.phase), sw2 = Math.sin(a.phase * 2), kneeL = Math.max(0, Math.sin(a.phase + 0.9)), kneeR = Math.max(0, Math.sin(a.phase + 0.9 + Math.PI));
  const P = {
    hipsY: Math.abs(sw) * 0.022 * W.walk, hipsRotZ: reduced ? 0 : Math.sin(t * 0.45) * 0.025 * idle + sw * 0.03 * W.walk, hipsRotY: sw * 0.07 * W.walk, spineY: -sw * 0.1 * W.walk, walk: W.walk,
    spineX: 0.02 * br * idle + 0.04 * W.walk, chestLift: 0.006 * br, chestScale: 1 + 0.012 * br,
    neckX: 0, headX: Math.sin(t * 0.7) * 0.015 * idle, headY: reduced ? 0 : Math.sin(t * 0.33) * 0.05 * idle, headZ: 0, jaw: 0, blink: a.blink,
    shL: { x: -sw * 0.5 * W.walk, z: 0.06 }, shR: { x: sw * 0.5 * W.walk, z: -0.06 }, elL: { x: -0.12 - Math.max(0, sw) * 0.3 * W.walk }, elR: { x: -0.12 - Math.max(0, -sw) * 0.3 * W.walk }, wrR: { x: 0, z: 0 },
    eyeX: reduced ? 0 : Math.sin(t * 0.9 + Math.sin(t * 2.3) * 2) * (0.6 + 0.4 * Math.sin(t * 0.37)) * (Math.sin(t * 0.61) > 0.55 ? 1 : 0.2), eyeY: reduced ? 0 : Math.sin(t * 1.3) * 0.3, hipL: { x: sw * 0.55 * W.walk }, hipR: { x: -sw * 0.55 * W.walk }, knL: { x: kneeL * 0.7 * W.walk }, knR: { x: kneeR * 0.7 * W.walk }, skirtSway: sw2 * 0.04 * W.walk + (reduced ? 0 : Math.sin(t * 0.45) * 0.01),
  };
  if (W.talk > 0.01) {   // talking: the jaw follows the speech level, the head nods on the beat, the left hand makes small beats
    const lv = a.level * W.talk; P.jaw = lv * 0.85; P.headX += Math.sin(t * 2.4) * 0.035 * lv + 0.02 * W.talk; P.headY += Math.sin(t * 1.3) * 0.06 * W.talk;
    P.shL.x += -0.45 * W.talk * (0.4 + 0.6 * Math.sin(t * 3.1) * lv); P.elL.x += -0.7 * W.talk * (0.5 + 0.5 * lv);
  }
  if (a.gesture && W.gesture > 0.01) {
    const g = a.gesture, e = bump(a.gt, GESTURES[g]) * W.gesture, wave = Math.sin(a.gt * 11);
    if (g === 'open') { P.shR = { x: lerp(P.shR.x, -0.55, e), z: lerp(P.shR.z, -0.55, e) }; P.elR = { x: lerp(P.elR.x, -1.05, e) }; P.wrR = { x: 0, z: -0.25 * e }; P.headY += 0.12 * e; }
    else if (g === 'point') { P.shR = { x: lerp(P.shR.x, -1.35, e), z: lerp(P.shR.z, -0.25, e) }; P.elR = { x: lerp(P.elR.x, -0.15, e) }; P.headX += 0.04 * e; }
    else if (g === 'chest') { P.shR = { x: lerp(P.shR.x, -0.35, e), z: lerp(P.shR.z, 0.25, e) }; P.elR = { x: lerp(P.elR.x, -2.1, e) }; P.headX += 0.1 * e; P.spineX += 0.05 * e; }
    else if (g === 'wave') { P.shR = { x: lerp(P.shR.x, -0.2, e), z: lerp(P.shR.z, -2.5, e) }; P.elR = { x: lerp(P.elR.x, -0.6, e) }; P.wrR = { x: 0, z: wave * 0.45 * e }; P.headY += 0.1 * e; }
  }
  return P;
}
/** every angle a pose may produce stays inside human-plausible limits (used by the rig-bounds test) */
export const LIMITS = { shoulderX: [-2.6, 1.0], shoulderZ: [-2.9, 1.0], elbowX: [-2.6, 0.1], hipX: [-0.8, 0.8], kneeX: [0, 1.2], headX: [-0.5, 0.5], headY: [-0.6, 0.6], jaw: [0, 1] };
