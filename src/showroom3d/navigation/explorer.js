/* Phase 3 first-person explorer: the DOM / engine glue around the pure modules (walker, colliders, navgraph, interaction).
 *   desktop  W A S D + arrows (Shift = jog), mouse look through Pointer Lock (falls back to drag-look if the lock is denied or
 *            unsupported), E = interact, 1..8 = glide to a department, Esc = pause (Pointer Lock exit also pauses)
 *   touch    the React TouchControls feed `touchMove` / `touchLook`; page scroll / pinch never see these gestures (touch-action: none)
 *   glide    GSAP moves the camera along a collision-free route (navgraph.js) to a department bay entrance
 * It owns no React state: it reports changes through `onState(partial)`. */
import gsap from 'gsap';
import { HANDOVER } from '../cinematic/timeline';
import { buildColliders, DOOR_OPEN_AT, PLAYER } from './colliders';
import { buildGraph, routeTo, polylineLength, pointAlong } from './navgraph';
import { interactionZones, zoneAt } from './interaction';
import { Walker, wrapPi, clamp } from './walker';
import { yawPitchFromLookAt } from './lookAround';

export const SENS = { mouse: 0.0022, drag: 0.0036, touch: 0.0052 };   // radians per pixel
export const NEAR = { explore: 0.15, intro: 0.25 };                    // camera near plane (explore must stay below PLAYER.radius)
const MOVE_KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'l', ArrowRight: 'r' };
const editable = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

export class Explorer {
  constructor({ engine, canvas, reduced = false, bob = true, onState = () => {} }) {
    this.engine = engine; this.canvas = canvas; this.onState = onState; this.reduced = reduced;
    this.graph = buildGraph(); this.zones = interactionZones();
    this.doorOpen = true; this.colliders = buildColliders({ doorOpen: 1, oliveCount: engine.tierId === 'low' ? 2 : 4 });
    this.walker = new Walker({ pos: [HANDOVER.p[0], HANDOVER.p[2]], colliders: this.colliders, bob });
    this.keys = new Set(); this.touch = { x: 0, y: 0, jog: false };
    this.enabled = false; this.paused = false; this.uiOpen = false; this.glide = null;
    this.locked = false; this.dragMode = false; this.lockFails = 0; this.expectUnlock = false; this.drag = null;
    this.zone = null; this.interactions = 0; this.moveReported = false; this.last = {};
    this._h = {
      key: (e) => this.onKey(e, true), keyUp: (e) => this.onKey(e, false), blur: () => this.keys.clear(),
      down: (e) => this.onPointerDown(e), move: (e) => this.onPointerMove(e), up: (e) => this.onPointerUp(e),
      mouse: (e) => this.onMouseMove(e), lockChange: () => this.onLockChange(), lockError: () => this.onLockError(),
    };
  }

  emit(p) { let changed = false; for (const k of Object.keys(p)) if (this.last[k] !== p[k]) { this.last[k] = p[k]; changed = true; } if (changed) this.onState({ ...p }); }
  get canLock() { return typeof this.canvas.requestPointerLock === 'function'; }

  enable(pose = HANDOVER) {
    const cam = this.engine.camera;
    if (!this.enabled) {
      this.enabled = true;
      window.addEventListener('keydown', this._h.key); window.addEventListener('keyup', this._h.keyUp); window.addEventListener('blur', this._h.blur);
      const c = this.canvas; c.addEventListener('pointerdown', this._h.down); c.addEventListener('pointermove', this._h.move);
      c.addEventListener('pointerup', this._h.up); c.addEventListener('pointercancel', this._h.up);
      document.addEventListener('mousemove', this._h.mouse); document.addEventListener('pointerlockchange', this._h.lockChange); document.addEventListener('pointerlockerror', this._h.lockError);
      c.style.touchAction = 'none'; c.style.cursor = 'crosshair';
    }
    const yp = yawPitchFromLookAt(pose.p, pose.l);
    this.walker.setPose(pose.p[0], pose.p[2], yp.yaw, yp.pitch); this.walker.travelled = 0; this.moveReported = false;
    cam.near = NEAR.explore; cam.rotation.order = 'YXZ'; cam.updateProjectionMatrix();
    this.paused = false; this.uiOpen = false; this.apply();
    this.emit({ active: true, paused: false, gliding: false });
  }
  disable() {
    if (!this.enabled) return;
    this.enabled = false; this.paused = false; this.uiOpen = false; this.killGlide(); this.keys.clear(); this.touch = { x: 0, y: 0, jog: false };
    window.removeEventListener('keydown', this._h.key); window.removeEventListener('keyup', this._h.keyUp); window.removeEventListener('blur', this._h.blur);
    const c = this.canvas; c.removeEventListener('pointerdown', this._h.down); c.removeEventListener('pointermove', this._h.move);
    c.removeEventListener('pointerup', this._h.up); c.removeEventListener('pointercancel', this._h.up);
    document.removeEventListener('mousemove', this._h.mouse); document.removeEventListener('pointerlockchange', this._h.lockChange); document.removeEventListener('pointerlockerror', this._h.lockError);
    this.releaseLock(); c.style.cursor = '';
    const cam = this.engine.camera; cam.near = NEAR.intro; cam.rotation.order = 'XYZ'; cam.updateProjectionMatrix();
    if (this.engine.bays) { this.engine.bays.highlight.setNear(null); }
    this.zone = null; this.emit({ active: false, paused: false, zone: null, locked: false, gliding: false });
  }
  dispose() { this.disable(); }

  setReduced(v) { this.reduced = !!v; }
  setBob(v) { this.walker.bobEnabled = !!v; }
  /** true while a menu / dialog is open: movement input is ignored and the pointer is released */
  setUiOpen(v) { this.uiOpen = !!v; if (v) { this.keys.clear(); this.touch = { x: 0, y: 0, jog: false }; this.releaseLock(); } }

  // ---------------------------------------------------------------- pause / pointer lock
  pause() { if (!this.enabled || this.paused) return; this.paused = true; this.keys.clear(); this.touch = { x: 0, y: 0, jog: false }; this.releaseLock(); this.emit({ paused: true }); }
  resume() { if (!this.paused) return; this.paused = false; this.emit({ paused: false }); }
  releaseLock() { if (document.pointerLockElement === this.canvas) { this.expectUnlock = true; try { document.exitPointerLock(); } catch (e) { this.expectUnlock = false; } } }
  /** call from a user gesture (click). Never throws; on any failure drag-look takes over. */
  requestLock() {
    if (!this.enabled || this.paused || this.uiOpen || this.locked) return;
    if (!this.canLock || this.lockFails >= 2) { this.setDrag(true); return; }
    try { const r = this.canvas.requestPointerLock(); if (r && typeof r.catch === 'function') r.catch(() => this.onLockError()); } catch (e) { this.onLockError(); }
  }
  setDrag(v) { this.dragMode = v; this.emit({ dragLook: v }); }
  onLockChange() {
    const now = document.pointerLockElement === this.canvas;
    if (now) { this.locked = true; this.lockFails = 0; this.dragMode = false; this.emit({ locked: true, dragLook: false, lockFailed: false }); return; }
    const was = this.locked; this.locked = false; this.emit({ locked: false });
    if (was && !this.expectUnlock && this.enabled && !this.paused && !this.uiOpen) this.pause();    // the browser took the lock back (Esc)
    this.expectUnlock = false;
  }
  onLockError() { this.lockFails++; this.locked = false; this.dragMode = true; this.emit({ locked: false, dragLook: true, lockFailed: true }); }

  // ---------------------------------------------------------------- keyboard
  onKey(e, down) {
    if (!this.enabled || editable(e.target) || e.ctrlKey || e.metaKey) return;
    const code = e.code;
    if (down && code === 'Escape') { if (!this.paused && !this.uiOpen) { e.preventDefault(); this.pause(); } return; }
    if (this.paused || this.uiOpen) { if (!down) this.keys.delete(code); return; }
    if (code in MOVE_KEYS && !e.altKey) {
      if (down) { this.cancelGlide(); this.keys.add(code); } else this.keys.delete(code);
      e.preventDefault(); return;
    }
    if (code === 'ShiftLeft' || code === 'ShiftRight') { if (down) this.keys.add('Shift'); else this.keys.delete('Shift'); return; }
    if (!down) { this.keys.delete(code); return; }
    if (e.repeat) return;
    if (code === 'KeyE') { e.preventDefault(); this.interact(); return; }
    // keyboard-only turning: , and . (or Alt + Left / Right)
    if (code === 'Comma' || (e.altKey && code === 'ArrowLeft')) { e.preventDefault(); this.walker.look(0.2, 0); return; }
    if (code === 'Period' || (e.altKey && code === 'ArrowRight')) { e.preventDefault(); this.walker.look(-0.2, 0); return; }
    const m = /^(?:Digit|Numpad)([1-8])$/.exec(code);
    if (m) { e.preventDefault(); this.glideTo(this.graph.stops[Number(m[1]) - 1].id); }
  }

  // ---------------------------------------------------------------- mouse / pen
  onPointerDown(e) {
    if (e.pointerType === 'touch') return;                                      // touch is owned by the TouchControls overlay
    if (!this.enabled || this.paused || this.uiOpen || e.button !== 0) return;
    this.requestLock();
    if (!this.locked) { this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { this.canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
  }
  onPointerMove(e) {
    const d = this.drag; if (!d || d.id !== e.pointerId || this.locked) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
    this.walker.look(-dx * SENS.drag, -dy * SENS.drag);
  }
  onPointerUp(e) { if (this.drag && this.drag.id === e.pointerId) this.drag = null; }
  onMouseMove(e) { if (this.locked && !this.paused && !this.uiOpen) this.walker.look(-(e.movementX || 0) * SENS.mouse, -(e.movementY || 0) * SENS.mouse); }

  // ---------------------------------------------------------------- touch (called by the React overlay)
  touchMove(x, y, jog = false) { if (!this.enabled || this.paused || this.uiOpen) return; if (x || y) this.cancelGlide(); this.touch = { x, y, jog }; }
  touchLook(dx, dy) { if (this.enabled && !this.paused && !this.uiOpen) this.walker.look(-dx * SENS.touch, -dy * SENS.touch); }

  // ---------------------------------------------------------------- interaction stub (Phase 5 makes it real)
  interact() {
    if (!this.enabled || this.paused || this.uiOpen) return;
    this.interactions++;
    if (this.zone) { if (this.engine.bays) this.engine.bays.highlight.pulse(this.zone.id); this.emit({ interact: this.interactions, interactZone: this.zone.id }); }
    else this.emit({ interact: this.interactions, interactZone: null });
  }

  // ---------------------------------------------------------------- department glide (GSAP)
  killGlide() { if (this.glide) { this.glide.kill(); this.glide = null; } }
  cancelGlide() { if (this.glide) { this.killGlide(); this.emit({ gliding: false }); } }
  glideTo(id) {
    if (!this.enabled) return false;
    const route = routeTo(this.graph, this.walker.pos, id, this.colliders); if (!route) return false;
    this.killGlide(); this.keys.clear();
    const w = this.walker, pts = route.points, len = polylineLength(pts), stop = route.stop;
    const y0 = w.yaw, p0 = w.pitch;
    const end = yawPitchFromLookAt([stop.stand[0], PLAYER.eye, stop.stand[1]], stop.look);
    const dy = wrapPi(end.yaw - y0), dp = 0.05 - p0;                                           // arrive looking level-ish so the sign, the alcove and the floor zone are all in frame
    const set = (k) => {
      const e = k * k * (3 - 2 * k);                                                         // yaw / pitch settle with a smoothstep, position uses the GSAP ease
      const p = pointAlong(pts, k); w.pos = [p[0], p[1]]; w.vel = [0, 0]; w.yaw = y0 + dy * e; w.pitch = p0 + dp * e; w.speed = 0;
    };
    const finish = () => { set(1); this.glide = null; this.apply(); this.emit({ gliding: false, arrived: id }); };
    this.emit({ gliding: true, glideTo: id, arrived: null });
    if (this.reduced || len < 0.05) { finish(); return true; }
    const v = { k: 0 };
    this.glide = gsap.to(v, { k: 1, duration: clamp(len / 4.4 + 1.0, 1.6, 5.5), ease: 'power2.inOut', onUpdate: () => set(v.k), onComplete: finish });
    return true;
  }

  // ---------------------------------------------------------------- per frame
  inputVector() {
    const k = this.keys; let f = 0, r = 0;
    for (const code of k) { const m = MOVE_KEYS[code]; if (m === 'f') f += 1; else if (m === 'b') f -= 1; else if (m === 'r') r += 1; else if (m === 'l') r -= 1; }
    if (f || r) return { fwd: f, right: r, jog: k.has('Shift') };
    const t = this.touch; return { fwd: t.y, right: t.x, jog: t.jog };
  }
  update(dt) {
    if (!this.enabled) return;
    const open = (this.engine.state.doorOpen || 0) >= DOOR_OPEN_AT;
    if (open !== this.doorOpen) { this.doorOpen = open; this.colliders = buildColliders({ doorOpen: open ? 1 : 0, oliveCount: this.engine.tierId === 'low' ? 2 : 4 }); this.walker.setColliders(this.colliders); }
    if (!this.glide && !this.paused && !this.uiOpen) this.walker.step(dt, this.inputVector(), this.reduced);
    else if (this.paused || this.uiOpen) this.walker.step(dt, {}, this.reduced);
    this.apply(dt);
  }
  apply(dt = 0) {
    const w = this.walker, c = w.camera(), cam = this.engine.camera;
    cam.position.set(c.x, c.y, c.z); cam.rotation.set(c.pitch, c.yaw, c.roll, 'YXZ');
    const z = zoneAt(this.zones, w.pos[0], w.pos[1]);
    if ((z && z.id) !== (this.zone && this.zone.id)) { this.zone = z; if (this.engine.bays) this.engine.bays.highlight.setNear(z ? z.id : null); this.emit({ zone: z ? z.id : null }); }
    if (this.engine.bays && dt) this.engine.bays.highlight.tick(dt);
    if (!this.moveReported && w.travelled > 1.5) { this.moveReported = true; this.emit({ moved: true }); }
  }

  // ---------------------------------------------------------------- QA helpers (exposed on window.__showroom only with ?debug=1)
  debug() {
    const w = this.walker;
    return {
      pos: () => [w.pos[0], w.pos[1]], yaw: () => w.yaw, pitch: () => w.pitch, speed: () => w.speed, camY: () => w.camera().y, zone: () => this.zone && this.zone.id,
      state: () => ({ enabled: this.enabled, paused: this.paused, uiOpen: this.uiOpen, gliding: !!this.glide, locked: this.locked, dragMode: this.dragMode, lockFails: this.lockFails, door: this.doorOpen }),
      /** place the walker (collision-resolved) and optionally turn it */
      teleport: (x, z, yaw, pitch) => { w.setPose(x, z, yaw, pitch); w.step(1e-4, {}); this.apply(); return [w.pos[0], w.pos[1]]; },
      /** run the real Walker + collision for `secs` seconds of simulated time at a fixed step (no rendering needed) */
      sim: (secs, input, step = 1 / 60) => { for (let t = 0; t < secs - 1e-9; t += step) w.step(Math.min(step, secs - t), input, this.reduced); this.apply(); return [w.pos[0], w.pos[1]]; },
      colliders: () => this.colliders, graph: () => this.graph,
    };
  }
}
