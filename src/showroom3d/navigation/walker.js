/* First-person walker: yaw / pitch, smoothed velocity, collision (colliders.js) and a gentle head-bob. Pure JS, no DOM / three.js.
 * Conventions match lookAround.js: yaw 0 looks down -Z, positive yaw turns LEFT; pitch positive looks up. Metres, seconds. */
import { PLAYER, moveCircle } from './colliders';

export const SPEED = { walk: 1.4, jog: 2.5 };       // a relaxed adult walk is ~1.4 m/s, a light jog ~2.5 m/s
export const ACCEL = 9;                              // 1/s: velocity closes ~63% of the gap to its target every 0.11 s (no instant starts / stops)
export const PITCH_LIMIT = 1.25;                     // ~72 degrees
export const BOB = { stride: 0.78, vertical: 0.02, sway: 0.011 };   // metres per footfall, amplitudes in metres

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const wrapPi = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };

/** target speed for an input magnitude m (0..1): the first 80% of a stick travel eases up to a walk, `jog` (Shift, or a fully pushed stick) is the jog */
export function speedFor(m, jog) {
  return jog ? SPEED.jog * Math.min(1, m) : SPEED.walk * Math.min(1, m / 0.8);
}

export class Walker {
  constructor({ pos = [0, -9], yaw = 0, pitch = 0.05, colliders = [], bob = true } = {}) {
    this.pos = [pos[0], pos[1]]; this.yaw = yaw; this.pitch = pitch; this.vel = [0, 0];
    this.colliders = colliders; this.bobEnabled = bob; this.phase = 0; this.amp = 0; this.travelled = 0; this.speed = 0;
  }
  setPose(x, z, yaw, pitch) { this.pos = [x, z]; if (yaw !== undefined) this.yaw = yaw; if (pitch !== undefined) this.pitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT); this.vel = [0, 0]; this.speed = 0; }
  setColliders(c) { this.colliders = c; }
  /** eased look: the turn is added to a target that the yaw / pitch chase (used for touch drags and keyboard turning, so they never snap) */
  lookSmooth(dYaw, dPitch) { this.tYaw = (this.tYaw || 0) + dYaw; this.tPitch = (this.tPitch || 0) + dPitch; }
  look(dYaw, dPitch) { this.yaw = wrapPi(this.yaw + dYaw); this.pitch = clamp(this.pitch + dPitch, -PITCH_LIMIT, PITCH_LIMIT); }

  /**
   * advance by dt seconds. input: { fwd, right } each -1..1 (screen-relative), jog: boolean.
   * Safe for any dt (even seconds): the collision move is sub-stepped, the velocity filter is exact for any dt.
   */
  step(dt, input = {}, reducedMotion = false) {
    if (!(dt > 0)) return;
    if (this.tYaw || this.tPitch) { const k0 = reducedMotion ? 1 : 1 - Math.exp(-16 * dt), dy = this.tYaw * k0, dp = this.tPitch * k0; this.tYaw -= dy; this.tPitch -= dp; if (Math.abs(this.tYaw) < 1e-5) this.tYaw = 0; if (Math.abs(this.tPitch) < 1e-5) this.tPitch = 0; this.look(dy, dp); }
    let fx = input.fwd || 0, rx = input.right || 0; const m = Math.hypot(fx, rx);
    if (m > 1) { fx /= m; rx /= m; }
    const mag = Math.min(1, m), target = speedFor(mag, !!input.jog), dirLen = m || 1;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward = (-sin, -cos); right = (cos, -sin)
    const tx = ((-sin * fx + cos * rx) / dirLen) * target, tz = ((-cos * fx - sin * rx) / dirLen) * target;
    const k = 1 - Math.exp(-ACCEL * dt);
    this.vel[0] += (tx - this.vel[0]) * k; this.vel[1] += (tz - this.vel[1]) * k;
    const before = this.pos;
    this.pos = moveCircle(this.pos, this.vel[0] * dt, this.vel[1] * dt, PLAYER.radius, this.colliders);
    const dx = this.pos[0] - before[0], dz = this.pos[1] - before[1], moved = Math.hypot(dx, dz);
    // blocked by a wall: drop the velocity that did not translate into motion (so we do not "bob on the spot" or surge after sliding free)
    const want = Math.hypot(this.vel[0], this.vel[1]) * dt;
    if (moved < want * 0.999) { const f = want > 0 ? moved / want : 0; this.vel[0] *= f; this.vel[1] *= f; }
    this.speed = moved / dt; this.travelled += moved;
    // head bob: phase follows distance walked, amplitude follows speed; zero when disabled / reduced motion
    this.phase += (moved / BOB.stride) * Math.PI * 2;
    const goal = this.bobEnabled && !reducedMotion ? clamp(this.speed / SPEED.walk, 0, 1.4) : 0;
    this.amp += (goal - this.amp) * (1 - Math.exp(-8 * dt));
  }

  /** camera transform for this frame */
  camera() {
    const a = this.amp, ph = this.phase;
    const bobY = Math.abs(Math.sin(ph / 2)) * BOB.vertical * a - BOB.vertical * a * 0.5;     // two dips per full gait cycle
    const sway = Math.sin(ph / 2) * BOB.sway * a;
    const cos = Math.cos(this.yaw), sin = Math.sin(this.yaw);
    return { x: this.pos[0] + cos * sway, y: PLAYER.eye + bobY, z: this.pos[1] - sin * sway, yaw: this.yaw, pitch: this.pitch, roll: -sway * 0.15 };
  }
}
