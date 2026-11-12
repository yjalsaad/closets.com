/* Phase 2 hand-over: a deliberately simple look-around placeholder (drag to look, scroll / pinch to creep forward and back).
 * Real first-person movement (WASD, joystick, collision, interaction) is Phase 3 and replaces this file's controller. */
import { HALL } from '../3d/dimensions';

export const LIMITS = { pitchMin: -0.9, pitchMax: 0.9, minX: -13, maxX: 13, minZ: -33, maxZ: -4 };

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** yaw/pitch (radians) that look from `p` toward `l` (yaw 0 looks down -Z, positive yaw turns left / toward -X) */
export function yawPitchFromLookAt(p, l) {
  const dx = l[0] - p[0], dy = l[1] - p[1], dz = l[2] - p[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
export function forwardFromYawPitch(yaw, pitch) {
  return [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
}
export function clampPosition(p, limits = LIMITS) {
  return [clamp(p[0], limits.minX, limits.maxX), HALL.eye, clamp(p[2], limits.minZ, limits.maxZ)];
}
/** step the viewer along the horizontal look direction by `d` metres, kept inside the hall */
export function creep(p, yaw, d, limits = LIMITS) {
  return clampPosition([p[0] - Math.sin(yaw) * d, p[1], p[2] - Math.cos(yaw) * d], limits);
}

export class LookAround {
  constructor(camera, element, pose, { onChange } = {}) {
    this.camera = camera; this.el = element; this.onChange = onChange || (() => {});
    this.setPose(pose);
    this.active = false; this.pointers = new Map(); this.pinch = 0;
    this._d = (e) => this.down(e); this._m = (e) => this.move(e); this._u = (e) => this.up(e); this._w = (e) => this.wheel(e); this._k = (e) => this.key(e);
  }
  setPose(pose) {
    const { yaw, pitch } = yawPitchFromLookAt(pose.p, pose.l);
    this.yaw = yaw; this.pitch = clamp(pitch, LIMITS.pitchMin, LIMITS.pitchMax);
    this.pos = [pose.p[0], pose.p[1], pose.p[2]]; this.vy = 0; this.vp = 0;
  }
  enable() {
    if (this.active) return; this.active = true;
    const el = this.el;
    el.addEventListener('pointerdown', this._d); el.addEventListener('pointermove', this._m);
    el.addEventListener('pointerup', this._u); el.addEventListener('pointercancel', this._u);
    el.addEventListener('wheel', this._w, { passive: false }); window.addEventListener('keydown', this._k);
    el.style.touchAction = 'none'; el.style.cursor = 'grab';
  }
  disable() {
    if (!this.active) return; this.active = false;
    const el = this.el;
    el.removeEventListener('pointerdown', this._d); el.removeEventListener('pointermove', this._m);
    el.removeEventListener('pointerup', this._u); el.removeEventListener('pointercancel', this._u);
    el.removeEventListener('wheel', this._w); window.removeEventListener('keydown', this._k);
    el.style.cursor = '';
  }
  down(e) { this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { this.el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } this.el.style.cursor = 'grabbing'; if (this.pointers.size === 2) this.pinch = this.span(); }
  span() { const [a, b] = [...this.pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }
  move(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (this.pointers.size === 2) { const s = this.span(); this.pos = creep(this.pos, this.yaw, (s - this.pinch) * 0.04); this.pinch = s; return; }
    const k = 0.0042 * (this.camera.fov / 60);
    this.yaw += dx * k; this.pitch = clamp(this.pitch + dy * k, LIMITS.pitchMin, LIMITS.pitchMax);
    this.vy = dx * k; this.vp = dy * k;
  }
  up(e) { this.pointers.delete(e.pointerId); if (!this.pointers.size) this.el.style.cursor = 'grab'; }
  wheel(e) { e.preventDefault(); this.pos = creep(this.pos, this.yaw, -e.deltaY * 0.012); }
  key(e) {
    const tag = (e.target && e.target.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.key === 'ArrowLeft') this.yaw += 0.06; else if (e.key === 'ArrowRight') this.yaw -= 0.06;
    else if (e.key === 'ArrowUp') this.pos = creep(this.pos, this.yaw, 0.6); else if (e.key === 'ArrowDown') this.pos = creep(this.pos, this.yaw, -0.6);
  }
  /** call every frame; applies damping + writes the camera */
  update() {
    if (!this.pointers.size) { this.yaw += this.vy; this.pitch = clamp(this.pitch + this.vp, LIMITS.pitchMin, LIMITS.pitchMax); this.vy *= 0.9; this.vp *= 0.9; }
    const f = forwardFromYawPitch(this.yaw, this.pitch);
    this.camera.position.set(this.pos[0], this.pos[1], this.pos[2]);
    this.camera.lookAt(this.pos[0] + f[0], this.pos[1] + f[1], this.pos[2] + f[2]);
  }
  dispose() { this.disable(); }
}
