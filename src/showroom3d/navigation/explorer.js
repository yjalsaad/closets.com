/* Phase 3 first-person explorer: the DOM / engine glue around the pure modules (walker, colliders, navgraph, interaction).
 *   desktop  W A S D + arrows (Shift = jog), mouse look through Pointer Lock (falls back to drag-look if the lock is denied or
 *            unsupported), E = interact, 1..8 = glide to a department, Esc = pause (Pointer Lock exit also pauses)
 *   touch    the React TouchControls feed `touchMove` / `touchLook`; page scroll / pinch never see these gestures (touch-action: none)
 *   glide    GSAP moves the camera along a collision-free route (navgraph.js) to a department bay entrance
 * It owns no React state: it reports changes through `onState(partial)`. */
import gsap from 'gsap';
import { HANDOVER } from '../cinematic/timeline';
import { buildColliders, DOOR_OPEN_AT, PLAYER, isFree, segmentClear } from './colliders';
import { buildGraph, routeTo, polylineLength, pointAlong } from './navgraph';
import * as THREE from 'three';
import { allZones, zoneAt } from './interaction';
import { PRODUCTS, STAGE_VIEWS } from '../products/catalog';
import { cycleFinish } from '../products/finishes';
import { Walker, wrapPi, clamp } from './walker';
import { yawPitchFromLookAt } from './lookAround';
import { VIP_VIEWS, bigScreenView } from '../scenes/vip/layout';
import { PERMANENT_DECKS } from '../vip/decks';
import { makeDeckStore } from '../vip/deckStore';
import { initDeckState, deckReducer } from '../vip/deckState';
import { initPlay, playReducer, playTick, slideSeconds } from '../vip/motion';
import { FilmPlayer } from '../vip/filmPlayer';
import { agendaIndex, nextAgendaItem, firstAgendaItem } from '../vip/meeting';
import { followCamera } from '../characters/follow';
import { TALK_RADIUS } from '../staff/roster';
import { nextAvatar, AVATARS } from '../characters/visitorAvatar';
const store = { get(k, d) { try { return window.localStorage.getItem(k) || d; } catch (e) { return d; } }, set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
import { stepStation, arrowDir } from '../products/vipContent';
import { loadSiteProjects } from '../products/projectsFeed';
import { withCollections, collectionsZones } from '../collections/layout';

export const SENS = { mouse: 0.0022, drag: 0.0036, touch: 0.0052 };   // radians per pixel
export const NEAR = { explore: 0.15, intro: 0.25 };                    // camera near plane (explore must stay below PLAYER.radius)
const MOVE_KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'l', ArrowRight: 'r' };
const editable = (el) => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

export class Explorer {
  constructor({ engine, canvas, reduced = false, bob = true, onState = () => {}, projectsLoader = loadSiteProjects, deckStore = makeDeckStore() }) {
    this.projectsLoader = projectsLoader; this.projectsPromise = null;
    this.deckStore = deckStore; this.userDecks = deckStore.list(); this.vipDialog = false; this.decksRev = 0; this.play = initPlay(); this.presMode = 'panel'; this.lastProg = -1; this.meetingOn = false; this.ds = initDeckState(this.deckIds(), this.initialDeck(), 0, this.deckCounts());
    // owner decision: every visit starts in first person; the toggle (and the stored avatar choice) stays
    this.camMode = 'first'; this.avatarKind = AVATARS[store.get('closets_yb_avatar', 'female')] ? store.get('closets_yb_avatar', 'female') : 'female'; this.tp = null;
    this.engine = engine; this.canvas = canvas; this.onState = onState; this.reduced = reduced;
    this.graph = withCollections(buildGraph()); this.zones = [...collectionsZones(), ...allZones()];
    this.doorOpen = true; this.vipOpen = true; this.colliders = buildColliders({ doorOpen: 1, oliveCount: engine.tierId === 'low' ? 2 : 4, vipOpen: 1 });
    this.walker = new Walker({ pos: [HANDOVER.p[0], HANDOVER.p[2]], colliders: this.colliders, bob });
    this.keys = new Set(); this.touch = { x: 0, y: 0, jog: false };
    this.enabled = false; this.paused = false; this.uiOpen = false; this.glide = null;
    this.locked = false; this.dragMode = false; this.lockFails = 0; this.expectUnlock = false; this.drag = null;
    this.zone = null; this.interactions = 0; this.moveReported = false; this.last = {};
    this.focus = null; this.fc = null; this.saved = null; this.rev = 0; this.raycaster = new THREE.Raycaster(); this.ptr = { x: 0, y: 0, has: false }; this.pdown = null; this.hoverT = 0;
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
    if (this.engine.avatar) this.engine.avatar.setKind(this.avatarKind);
    this.emit({ active: true, paused: false, gliding: false, camMode: this.camMode, avatar: this.avatarKind });
  }
  disable() {
    if (!this.enabled) return;
    this.enabled = false; this.paused = false; this.uiOpen = false; this.killGlide(); if (this.fly) { this.fly.kill(); this.fly = null; } this.fc = null; this.focus = null; this.keys.clear(); this.touch = { x: 0, y: 0, jog: false };
    window.removeEventListener('keydown', this._h.key); window.removeEventListener('keyup', this._h.keyUp); window.removeEventListener('blur', this._h.blur);
    const c = this.canvas; c.removeEventListener('pointerdown', this._h.down); c.removeEventListener('pointermove', this._h.move);
    c.removeEventListener('pointerup', this._h.up); c.removeEventListener('pointercancel', this._h.up);
    document.removeEventListener('mousemove', this._h.mouse); document.removeEventListener('pointerlockchange', this._h.lockChange); document.removeEventListener('pointerlockerror', this._h.lockError);
    this.releaseLock(); c.style.cursor = '';
    const cam = this.engine.camera; cam.near = NEAR.intro; cam.rotation.order = 'XYZ'; cam.updateProjectionMatrix();
    if (this.engine.bays) { this.engine.bays.highlight.setNear(null); }
    if (this.engine.avatar) this.engine.avatar.group.visible = false;
    this.zone = null; this.emit({ active: false, paused: false, zone: null, locked: false, gliding: false });
  }
  dispose() { this.disable(); if (this.film) this.film.dispose(); if (this._filmHost && this._filmHost.parentNode) this._filmHost.parentNode.removeChild(this._filmHost); if (this._filmVis && typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._filmVis); }

  setReduced(v) { this.reduced = !!v; }
  /** camera mode: 'first' (default) or 'third' (follows the visitor's avatar with a collision-safe camera) */
  setCameraMode(m) { const v = m === 'third' ? 'third' : 'first'; if (v === this.camMode) return; this.camMode = v; this.tp = null; store.set('closets_yb_cam', v); this.emit({ camMode: v }); this.apply(); }
  toggleCameraMode() { this.setCameraMode(this.camMode === 'first' ? 'third' : 'first'); }
  setAvatar(k) { if (!AVATARS[k]) return; this.avatarKind = k; store.set('closets_yb_avatar', k); if (this.engine.avatar) this.engine.avatar.setKind(k); this.emit({ avatar: k }); }
  cycleAvatar() { this.setAvatar(nextAvatar(this.avatarKind)); }
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
    if (!this.enabled || this.vipDialog || editable(e.target) || e.ctrlKey || e.metaKey) return;
    const code = e.code;
    if (this.focus) { if (this.focusKey(e, down)) return; }
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
    if (code === 'KeyT') { e.preventDefault(); this.talkToStaff(); return; }
    // keyboard-only turning: , and . (or Alt + Left / Right)
    if (code === 'Comma' || (e.altKey && code === 'ArrowLeft')) { e.preventDefault(); this.walker.lookSmooth(0.2, 0); return; }
    if (code === 'Period' || (e.altKey && code === 'ArrowRight')) { e.preventDefault(); this.walker.lookSmooth(-0.2, 0); return; }
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (m) { e.preventDefault(); this.glideTo(this.graph.stops[Number(m[1]) - 1].id); }
  }

  // ---------------------------------------------------------------- mouse / pen
  onPointerDown(e) {
    if (this.focus) { this.focusPointer(e, 'down'); return; }                  // product focus: every pointer type (touch included) picks parts / looks around
    if (e.pointerType === 'touch') return;                                      // touch is owned by the TouchControls overlay
    if (!this.enabled || this.paused || this.uiOpen || e.button !== 0) return;
    if (this.locked && this.pickCentre(true)) return;                          // a click on a drawer / door under the crosshair works it instead of re-locking
    this.requestLock();
    if (!this.locked) { this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; try { this.canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
  }
  onPointerMove(e) {
    if (this.focus) { this.focusPointer(e, 'move'); return; }
    this.setPtr(e);
    const d = this.drag; if (!d || d.id !== e.pointerId || this.locked) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
    this.walker.look(-dx * SENS.drag, -dy * SENS.drag);
  }
  onPointerUp(e) {
    if (this.focus || this.pdown) { this.focusPointer(e, 'up'); return; }
    if (this.drag && this.drag.id === e.pointerId) { const d = this.drag; this.drag = null; if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6 && !this.locked) this.tapPick(e.clientX, e.clientY); }
  }
  onMouseMove(e) { if (this.locked && !this.paused && !this.uiOpen) this.walker.look(-(e.movementX || 0) * SENS.mouse, -(e.movementY || 0) * SENS.mouse); }

  // ---------------------------------------------------------------- touch (called by the React overlay)
  touchMove(x, y, jog = false) { if (!this.enabled || this.paused || this.uiOpen) return; if (x || y) this.cancelGlide(); this.touch = { x, y, jog }; }
  touchLook(dx, dy) { if (this.enabled && !this.paused && !this.uiOpen) this.walker.lookSmooth(-dx * SENS.touch, -dy * SENS.touch); }

  // ---------------------------------------------------------------- interaction (Phase 4/5: products, picking, Ikhtarha stage)
  get products() { return this.engine.products || null; }
  /** E / tap Interact: a furnished bay focuses its product, the nave stage opens the Ikhtarha panel, an empty bay still says "later release" */
  interact() {
    if (!this.enabled || this.paused || this.uiOpen) return;
    if (this.focus) return;
    { const S = this.engine.staff, np = S && S.nearest(this.walker.pos[0], this.walker.pos[1], 1.9), rec = S && S.nearest(this.walker.pos[0], this.walker.pos[1], TALK_RADIUS); if ((np || (rec && rec.id === 'reception')) && this.talkToStaff((np || rec).id)) return; }   // E next to an adviser (or in front of the Reception desk) talks to her
    this.interactions++;
    const z = this.zone, P = this.products;
    if (z && z.collections) { this.emit({ collections: this.interactions }); return; }          // the Collections wall: the React layer opens its panel
    if (z && z.vip && P && P.vip) { this.focusVip(0); return; }
    if (z && z.stage && P) { this.focusStage('overview'); return; }          // (no "later release" toast: the panel is the response)
    const pid = z && P ? P.productAt(z.id) : null;
    if (pid) { this.focusProduct(pid, 'overview'); return; }
    if (z) { if (this.engine.bays) this.engine.bays.highlight.pulse(z.id); this.emit({ interact: this.interactions, interactZone: z.id }); }
    else this.emit({ interact: this.interactions, interactZone: null });
  }

  ndc(x, y) { const r = this.canvas.getBoundingClientRect(); return { x: ((x - r.left) / (r.width || 1)) * 2 - 1, y: -(((y - r.top) / (r.height || 1)) * 2 - 1) }; }
  setPtr(e) { const n = this.ndc(e.clientX, e.clientY); this.ptr.x = n.x; this.ptr.y = n.y; this.ptr.has = true; }
  /** raycast the interactive parts from a screen point; returns {id, distance, part} or null */
  pickNdc(nx, ny, reach, product = null) {
    const P = this.products; if (!P) return null;
    const cam = this.engine.camera; cam.updateMatrixWorld(true); this.raycaster.setFromCamera({ x: nx, y: ny }, cam);
    return P.pick(this.raycaster, { reach, product });
  }
  /** what is under the crosshair (pointer lock) within arm's reach; `act` toggles it */
  pickCentre(act) {
    if (!this.zone || !this.products || !this.products.productAt(this.zone.id)) return false;
    const hit = this.pickNdc(0, 0, 4.2, this.products.productAt(this.zone.id)); if (!hit) return false;
    if (act) this.togglePart(hit.id);
    return true;
  }
  /** a tap / click at a screen point while exploring (touch overlay, drag-look mode) */
  tapPick(cx, cy) {
    if (!this.enabled || this.paused || this.uiOpen || this.focus) return false;
    const pid = this.zone && this.products ? this.products.productAt(this.zone.id) : null;
    const n = this.ndc(cx, cy), hit = pid ? this.pickNdc(n.x, n.y, 4.6, pid) : null;
    if (hit) { this.togglePart(hit.id); return true; }
    return this.walkToScreen(cx, cy);                                  // nothing to work here: a tap / click on the floor walks there
  }
  /** click / tap-to-walk: the ray through the screen point hits the floor; if the straight way is clear the walker glides there (eased, turning to face it) */
  walkToScreen(cx, cy) {
    if (!this.enabled || this.paused || this.uiOpen || this.focus || this.glide) return false;
    const n = this.ndc(cx, cy), cam = this.engine.camera; cam.updateMatrixWorld(true); this.raycaster.setFromCamera({ x: n.x, y: n.y }, cam);
    const o = this.raycaster.ray.origin, d = this.raycaster.ray.direction; if (d.y > -0.02) return false;
    const t = -o.y / d.y, x = o.x + d.x * t, z = o.z + d.z * t; return this.walkTo(x, z);
  }
  walkTo(x, z) {
    const w = this.walker, from = [w.pos[0], w.pos[1]], len = Math.hypot(x - from[0], z - from[1]);
    if (len < 0.4 || len > 14 || !isFree(x, z, PLAYER.radius, this.colliders) || !segmentClear(from, [x, z], PLAYER.radius, this.colliders)) return false;
    this.killGlide(); this.keys.clear();
    const y0 = w.yaw, end = yawPitchFromLookAt([x, PLAYER.eye, z], [x + (x - from[0]), PLAYER.eye, z + (z - from[1])]), dy = wrapPi(end.yaw - y0);
    const set = (k) => { const p = [from[0] + (x - from[0]) * k, from[1] + (z - from[1]) * k]; w.pos = p; w.vel = [0, 0]; w.speed = 0; w.yaw = y0 + dy * Math.min(1, k * 2.2); w.phase += 0.0; };
    const done = () => { this.glide = null; this.apply(); this.emit({ gliding: false }); };
    this.emit({ gliding: true, glideTo: null });
    if (this.reduced) { set(1); done(); return true; }
    const v = { k: 0 }; let last = 0;
    this.glide = gsap.to(v, { k: 1, duration: clamp(len / 1.7 + 0.35, 0.6, 8), ease: 'power1.inOut', onUpdate: () => { const dk = v.k - last; last = v.k; set(v.k); w.travelled += Math.abs(dk) * len; w.phase += Math.abs(dk) * len / 0.78 * Math.PI * 2; w.amp = 1; }, onComplete: done });
    return true;
  }
  tap(cx, cy) { return this.tapPick(cx, cy); }

  togglePart(id) {
    const P = this.products; if (!P) return null; const r = P.toggle(id); if (!r) return null;
    P.setFocusPart(id); this.emit({ partFocus: id, prod: ++this.rev, lastToggle: id + ':' + (r.open ? 1 : 0) + ':' + this.rev }); return r;
  }
  openAll(open = true) { const P = this.products, f = this.focus; if (!P || !f || f.kind !== 'product') return; const st = P.kits[f.product].state; if (open) st.openAll(); else st.closeAll(); this.emit({ prod: ++this.rev }); }
  toggleLed() { const P = this.products, f = this.focus; if (!P || !f || f.kind !== 'product') return null; const on = P.toggleLed(f.product); this.emit({ prod: ++this.rev, led: on }); return on; }
  setFinish(fid) { const P = this.products, f = this.focus; if (!P || !f || f.kind !== 'product') return; P.setFinish(f.product, fid); this.emit({ prod: ++this.rev, finish: fid }); }
  nextFinish(dir = 1) { const f = this.focus; if (!f || f.kind !== 'product') return; const cur = this.products.kits[f.product].state.finishId; this.setFinish(cycleFinish(f.product, cur, dir)); }
  /** read-only view of the focused product for the panel */
  productState() { const f = this.focus, P = this.products; if (!f || !P || f.kind !== 'product') return null; const s = P.snapshot(f.product); return { ...s, product: f.product, view: f.view, partFocus: P.registry.focus, rev: this.rev }; }

  // ---- focus: smooth camera glide to a product view; walking is suspended; Esc / Back glides home
  startFocus(kind, key) {
    if (!this.focus) {
      const w = this.walker, c = w.camera(); this.saved = { x: c.x, y: c.y, z: c.z, yaw: w.yaw, pitch: w.pitch, fov: this.engine.baseFov || 50 };
      this.fc = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, fov: this.saved.fov, dy: 0, dp: 0, sx: 0, sy: 0 };
      this.killGlide(); this.keys.clear(); this.touch = { x: 0, y: 0, jog: false }; this.releaseLock(); this.drag = null;
    }
    this.focus = { kind, key, product: key, view: 'overview' };
  }
  flyTo(v, instant = false) {
    const fc = this.fc; if (!fc) return;
    const yp = yawPitchFromLookAt(v.pos, v.look), dyaw = wrapPi(yp.yaw - fc.yaw);
    const sh = this.panelShift(), to = { x: v.pos[0], y: v.pos[1], z: v.pos[2], yaw: fc.yaw + dyaw, pitch: yp.pitch, fov: v.fov || fc.fov, dy: 0, dp: 0, sx: sh[0], sy: sh[1] };
    if (this.fly) { this.fly.kill(); this.fly = null; }
    const done = () => { this.fly = null; this.apply(); };
    if (this.reduced || instant) { Object.assign(fc, to); done(); return; }
    const dist = Math.hypot(to.x - fc.x, to.y - fc.y, to.z - fc.z);
    this.fly = gsap.to(fc, { ...to, duration: clamp(dist / 5 + 0.9, 1.0, 2.4), ease: 'power2.inOut', onUpdate: () => this.apply(), onComplete: done });
  }
  /** pixels to slide the view so the subject sits in the part of the screen the panel leaves free (side panel on desktop, bottom sheet on phones) */
  panelShift() {
    const w = this.canvas.clientWidth || 0, h = this.canvas.clientHeight || 0, rtl = (typeof document !== 'undefined' && document.documentElement.dir === 'rtl');
    if (!w || !h) return [0, 0];
    if (this.presMode !== 'panel') return [0, Math.round(this.presBar() / 2)];   // presenting: the wall moves up by half the presenter bar
    if (w <= 700 || h > w) return [0, Math.round(h * 0.2)];                 // bottom sheet: the subject moves up
    return [Math.round((rtl ? -1 : 1) * Math.min(190, w * 0.16)), 0];       // side panel: LTR panel is on the right, the subject moves left
  }
  focusProduct(productId, viewId = 'overview') {
    const P = this.products, p = PRODUCTS[productId]; if (!this.enabled || !P || !p) return false;
    this.startFocus('product', productId); const view = p.views.find((x) => x.id === viewId) || p.views[0]; this.focus.view = view.id;
    P.setFocusPart(null); P.setHover(null); this.flyTo(P.focusView(productId, view.id));
    this.emit({ focus: productId, focusKind: 'product', focusView: view.id, partFocus: null, prod: ++this.rev }); return true;
  }
  // ---- VIP decks: the permanent decks (src/showroom3d/vip/decks) + the ones saved on this device. `ds` is the picker state machine (vip/deckState.js).
  allDecks() { return [...PERMANENT_DECKS, ...this.userDecks]; }
  deckIds() { return this.allDecks().map((d) => d.id); }
  deckCounts() { const o = {}; for (const d of this.allDecks()) o[d.id] = d.slides.length; return o; }
  get deck() { return this.allDecks().find((d) => d.id === this.ds.deckId) || PERMANENT_DECKS[0]; }
  /** camera pose for a slide: the built-in stations keep their own poses, every other slide faces the wall screen */
  vipView(i) {
    if (this.presMode !== 'panel') { const r = this.canvas.getBoundingClientRect(), w = r.width || 1280, h = r.height || 720, bar = this.presBar(), read = this.presMode === 'read', fill = Math.max(0.5, Math.min(read ? 1 : 0.94, ((h - bar - 10) * 16 / 9) / w)); return bigScreenView(w / h, read ? 40 : 46, fill, true); }   // presenting: the whole wall fits the view ABOVE the slim presenter bar (nothing on the wall is covered)
    const sl = this.deck.slides[i]; return sl && sl.builtin && VIP_VIEWS[i] ? VIP_VIEWS[i] : VIP_VIEWS[0];
  }
  /** height (px) the presenter bar takes at the bottom of the view in the big / reading modes */
  presBar() { const w = (this.canvas && this.canvas.clientWidth) || 1280; return this.presMode === 'read' ? 68 : w > 760 ? (this.filmOn ? 132 : 96) : 190; }
  vipSlideId(i) { const sl = this.deck.slides[i]; return sl ? sl.id : ''; }
  /** push the picker state to the scene, the camera and the UI */
  syncVip(fly = true, extra = {}) {
    const P = this.products, f = this.focus, idx = this.ds.slide, d = this.deck; this.decksRev++;
    if (P && P.vip) P.vip.setDeck(d, this.allDecks(), idx);
    this.syncFilm();
    if (f && f.kind === 'vip') { f.station = idx; f.view = this.vipSlideId(idx); if (fly) { const v = this.vipView(idx); this.flyTo({ pos: v.pos, look: v.look, fov: v.fov }); } }
    this.emit({ vipStation: idx, vipDeck: d.id, vipDecksRev: this.decksRev, focusView: this.vipSlideId(idx), prod: ++this.rev, ...extra });
  }
  /** VIP meeting room: a guided presentation. The camera glides to the slide's pose inside the room; the screen, gallery and hologram panels show it. */
  focusVip(i = 0) {
    const P = this.products; if (!this.enabled || !P || !P.vip) return false;
    this.ds = deckReducer(this.ds, { type: 'slide', index: i }); const idx = this.ds.slide; this.startFocus('vip', 'vip'); this.focus.view = this.vipSlideId(idx); this.focus.station = idx;
    P.setFocusPart(null); P.setHover(null); P.vip.setFocus(true); P.vip.enter(); P.vip.setDeck(this.deck, this.allDecks(), idx); this.syncFilm(); this.ensureProjects();
    const v = this.vipView(idx); this.flyTo({ pos: v.pos, look: v.look, fov: v.fov });
    this.decksRev++; this.emit({ focus: 'vip', focusKind: 'vip', focusView: this.vipSlideId(idx), vipStation: idx, vipDeck: this.deck.id, vipDecksRev: this.decksRev, partFocus: null, prod: ++this.rev }); return true;
  }
  setStation(i) {
    const f = this.focus; if (!f || f.kind !== 'vip') return;
    const next = deckReducer(this.ds, { type: 'slide', index: i }); if (next === this.ds) return; this.ds = next; this.syncVip();
  }
  stepStation(dir) { const f = this.focus; if (f && f.kind === 'vip') this.setStation(stepStation(this.ds.slide, dir, this.deck.slides.length)); }
  /** switch deck (by id); the first slide shows */
  setDeck(id) { const f = this.focus; if (!f || f.kind !== 'vip') return; const next = deckReducer(this.ds, { type: 'deck', id }); if (next === this.ds) return; this.ds = next; this.meetingOn = id === 'meeting'; this.syncVip(true, { vipMeeting: this.meetingOn }); }
  cycleDeck(dir = 1) { const f = this.focus; if (!f || f.kind !== 'vip') return; const next = deckReducer(this.ds, { type: 'deckStep', dir }); if (next === this.ds) return; this.ds = next; this.syncVip(); }
  /** save a (sanitised) deck on THIS device and show it. Returns the store result { ok, error, deck } */
  addDeck(deck, show = true) {
    const r = this.deckStore.add(deck); if (!r.ok) return r;
    this.userDecks = r.decks; this.ds = deckReducer(this.ds, { type: 'decks', ids: this.deckIds(), counts: this.deckCounts() });
    if (show) this.ds = deckReducer(this.ds, { type: 'deck', id: r.deck.id }); this.syncVip(!!show); return r;
  }
  removeDeck(id) {
    if (PERMANENT_DECKS.some((d) => d.id === id)) return { ok: false, error: 'permanent' };
    const r = this.deckStore.remove(id); if (!r.ok) return r;
    this.userDecks = r.decks; this.ds = deckReducer(this.ds, { type: 'decks', ids: this.deckIds(), counts: this.deckCounts() }); this.syncVip(); return r;
  }
  /** the "Add presentation" dialog is open: the explorer ignores keys (typing, Tab, Esc belong to the dialog) */
  setVipDialog(v) { this.vipDialog = !!v; if (v && this.play.playing) this.setPlaying(false); if (v && this.film) this.film.pause(); }
  /** the room opens on the Management meeting (the primary section); ?vipdeck=<id> opens another entry (deep link, QA) */
  initialDeck() { let want = ''; try { want = new URLSearchParams(window.location.search).get('vipdeck') || ''; } catch (e) { /* ignore */ } return this.deckIds().includes(want) ? want : PERMANENT_DECKS[0].id; }
  // ---- Management meeting: the agenda (vip/meeting.js). Nothing advances by itself; a film with sound only starts on the visitor's action.
  agendaNow() { return agendaIndex(this.ds.deckId, this.ds.slide); }
  goAgenda(item, { play = false } = {}) {
    if (!item || !this.focus || this.focus.kind !== 'vip') return false; this.meetingOn = true;
    this.ds = deckReducer(deckReducer(this.ds, { type: 'deck', id: item.deck }), { type: 'slide', index: item.slide }); this.syncVip(true, { vipMeeting: true });
    if (play && item.kind === 'film') { const F = this.film; if (F) F.load().then(() => { /* the click that asked for it is the user gesture; if the browser no longer honours it the film simply stays on its poster */ this.filmToggle(); }); }
    return true;
  }
  /** "Start meeting": the first agenda item (film 1) goes on the screen and plays (this is called from a click / key press) */
  startMeeting() { return this.goAgenda(firstAgendaItem(), { play: true }); }
  /** "Next agenda item": the next film is put up paused (the visitor presses Play), the next deck opens on its first slide */
  nextAgenda() { const nx = nextAgendaItem(this.agendaNow()); if (!nx) return false; if (this.film) this.film.pause(); return this.goAgenda(nx); }
  // ---- FILM mode ("Watch our story"): a one-slide pseudo-deck. The player (vip/filmPlayer.js) is created the first time the entry is chosen; nothing plays without a user gesture.
  get filmOn() { const sl = this.deck.slides[this.ds.slide]; return !!sl && sl.builtin === 'film'; }
  get filmId() { const sl = this.deck.slides[this.ds.slide]; return (sl && sl.filmId) || 'journey'; }
  ensureFilm() {
    if (this.film) return this.film; const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl', w = (this.canvas && this.canvas.clientWidth) || 1280;
    const mobile = w <= 700 || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches), saveData = typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData;
    this.film = new FilmPlayer({ lang: rtl ? 'ar' : 'en', device: { tier: this.engine.tierId, mobile, saveData: !!saveData }, onChange: () => this.onFilm() });
    if (typeof document !== 'undefined') { this._filmVis = () => { if (document.hidden && this.film) this.film.pause(); }; document.addEventListener('visibilitychange', this._filmVis); }
    return this.film;
  }
  /** the video element lives (hidden, 1 px) in the stage so the wall texture and the cinema overlay share it and it never has to be re-parented (re-parenting pauses a video) */
  filmHost() {
    const v = this.film && this.film.ensureVideo(); if (!v || typeof document === 'undefined') return null;
    if (!this._filmHost) { const h = document.createElement('div'); h.className = 'sr-vip-filmhost'; h.setAttribute('data-testid', 'sr-vip-filmhost'); const st = this.canvas && this.canvas.parentNode; (st || document.body).appendChild(h); this._filmHost = h; }
    if (v.parentNode !== this._filmHost) { while (this._filmHost.firstChild) this._filmHost.removeChild(this._filmHost.firstChild); this._filmHost.appendChild(v); } return this._filmHost;
  }
  filmView() {
    const F = this.film; if (!this.filmOn || !F) return null; const st = F.state, live = st.status === 'playing' || st.status === 'paused';
    const sl = this.deck.slides[this.ds.slide];
    return { status: st.status, id: st.id, real: !!(st.film && st.film.real), burned: !!(st.film && st.film.burnedSubtitles), title: st.film ? st.film.title : (sl ? sl.title : null), poster: F.poster, video: live ? F.video : null, cue: st.caption === 'off' ? '' : st.cue, caption: st.caption, time: st.time, duration: st.duration };
  }
  onFilm() { const P = this.products; if (P && P.vip && P.vip.setFilm) P.vip.setFilm(this.filmView()); this.emit({ vipFilmRev: (this.filmRev = (this.filmRev || 0) + 1) }); }
  /** called whenever the deck / slide changes: the film entry loads its manifest; any other deck pauses the film and gives the wall back to the slides */
  syncFilm() {
    const P = this.products;
    if (this.filmOn) { const F = this.ensureFilm(); F.select(this.filmId); if (this.play.playing) this.play = playReducer(this.play, { type: 'pause' }); if (P && P.vip) { P.vip.setPlayback({ progress: -1 }); if (P.vip.setFilm) P.vip.setFilm(this.filmView()); } }
    else { if (this.film) this.film.pause(); if (this.cinema) this.setCinema(false); if (P && P.vip && P.vip.setFilm) P.vip.setFilm(null); }
  }
  /** play / pause from a user gesture (button, key, click on the wall) */
  filmToggle() { if (!this.filmOn || !this.film) return false; const st = this.film.state.status; if (st === 'missing' || st === 'loading' || st === 'idle') return false; if (st !== 'playing') this.filmHost(); return this.film.toggle(); }
  filmSeek(t) { if (this.film) this.film.seek(t); } filmSeekBy(dt) { if (this.film) this.film.seekBy(dt); }
  filmVolume(v) { if (this.film) this.film.setVolume(v); } filmMute() { if (this.film) this.film.toggleMute(); } filmCaptions() { if (this.film) this.film.cycleCaptions(); }
  /** cinema mode: the same <video> as a normal HTML5 overlay with native controls and native captions */
  setCinema(on) {
    const F = this.film, want = !!on && this.filmOn && !!F && !!F.state.film && F.state.status !== 'missing'; if (want === !!this.cinema) return;
    this.cinema = want; if (F) { if (want) this.filmHost(); F.setCinema(want); } if (this._filmHost) this._filmHost.classList.toggle('is-cinema', want); this.emit({ vipCinema: want, vipFilmRev: (this.filmRev = (this.filmRev || 0) + 1) });
  }
  // ---- presenting: auto-play (play / pause, speed, loop), the big-screen view and full screen. State machine: vip/motion.js; the wall shows the badge + progress bar.
  emitPlay(extra = {}) { this.emit({ vipPlaying: this.play.playing, vipSpeed: this.play.speed, vipLoop: this.play.loop, vipMode: this.presMode, ...extra }); }
  setPlaying(on) {
    const f = this.focus; if (!f || f.kind !== 'vip' || (on && this.filmOn)) return; this.play = playReducer(this.play, { type: on ? 'play' : 'pause' });
    const v = this.products && this.products.vip; if (v) v.setPlayback({ progress: this.play.playing ? 0 : -1, speed: this.play.speed }); this.lastProg = -1; this.emitPlay({ vipProgress: this.play.playing ? 0 : -1 });
  }
  togglePlay() { if (this.filmOn) { this.filmToggle(); return; } this.setPlaying(!this.play.playing); }
  cycleSpeed() { this.play = playReducer(this.play, { type: 'cycleSpeed' }); const v = this.products && this.products.vip; if (v) v.setPlayback({ progress: this.play.playing ? this.lastProg : -1, speed: this.play.speed }); this.emitPlay(); }
  toggleLoop() { this.play = playReducer(this.play, { type: 'loop' }); this.emitPlay(); }
  /** 'panel' (side panel / bottom sheet), 'big' (camera fronts the wall, slim presenter bar), 'read' (READING MODE: the wall fills the whole view edge to edge, minimal controls) or 'full' (as big, plus the browser's full screen) */
  setPresentMode(mode) {
    const f = this.focus; if (!f || f.kind !== 'vip') return; const m = mode === 'big' || mode === 'full' || mode === 'read' ? mode : 'panel', was = this.presMode; if (m === was) return;
    this.presMode = m; if (m === 'full') this.requestFullscreen(); else if (was === 'full') this.leaveFullscreen();
    const v = this.vipView(this.ds.slide); this.flyTo({ pos: v.pos, look: v.look, fov: v.fov }); this.emitPlay({ prod: ++this.rev });
  }
  requestFullscreen() { try { const el = this.canvas && this.canvas.closest && this.canvas.closest('.sr-stage'); if (el && el.requestFullscreen && !document.fullscreenElement) { const p = el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); const h = () => { if (!document.fullscreenElement) { document.removeEventListener('fullscreenchange', h); if (this.presMode === 'full') this.setPresentMode('big'); } }; document.addEventListener('fullscreenchange', h); } } catch (e) { /* full screen is optional */ } }
  leaveFullscreen() { try { if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* ignore */ } }
  /** show a deck on the big screen: used by the visitor's panel and by the adviser ("let me present the company profile"). Returns false when the room is not ready. */
  presentDeck(id, { autoplay = true, mode = 'big' } = {}) {
    if (!this.enabled || !this.allDecks().some((d) => d.id === id)) return false;
    this.ds = deckReducer(deckReducer(this.ds, { type: 'deck', id }), { type: 'slide', index: 0 });
    if (!this.focus || this.focus.kind !== 'vip') { if (!this.focusVip(0)) return false; } else this.syncVip();
    this.setPresentMode(mode); if (autoplay && !this.filmOn) this.setPlaying(true); return true;   // the film never starts by itself: it waits for the visitor's Play
  }
  /** advance auto-play (called every frame while a VIP deck is in focus) */
  tickPlay(dt) {
    const f = this.focus; if (!f || f.kind !== 'vip' || !this.play.playing || this.vipDialog) return;
    const sl = this.deck.slides[this.ds.slide], r = playTick(this.play, dt, this.ds.slide, this.deck.slides.length, slideSeconds(sl, this.play.speed)); this.play = r.st;
    if (r.idx !== this.ds.slide) this.setStation(r.idx);
    const v = this.products && this.products.vip; if (v) v.setPlayback({ progress: r.progress, speed: this.play.speed });
    const q = Math.round(r.progress * 20) / 20; if (r.ended) this.emitPlay({ vipProgress: -1 }); else if (q !== this.lastProg) { this.lastProg = q; this.emit({ vipProgress: q }); }
  }
  /** the site's project list, read once (the SAME read-only client path the Projects page uses) the first time somebody enters the VIP room */
  ensureProjects() {
    if (this.projectsPromise || !this.products || !this.products.vip) return this.projectsPromise;
    this.projectsPromise = Promise.resolve().then(() => this.projectsLoader()).then((res) => { const r = res || { status: 'error', rows: [] }; if (this.products && this.products.vip) this.products.vip.setProjects(r); this.vipRows = r.rows; this.emit({ vipProjects: r.status, vipProjectsRev: (this.vipProjectsRev = (this.vipProjectsRev || 0) + 1) }); return r; }).catch(() => null);
    return this.projectsPromise;
  }
  focusStage(viewId = 'overview') {
    if (!this.enabled || !this.products) return false;
    this.startFocus('stage', 'ikhtarha'); const v = STAGE_VIEWS.find((x) => x.id === viewId) || STAGE_VIEWS[0]; this.focus.view = v.id;
    this.flyTo({ pos: v.pos, look: v.look, fov: v.fov });
    this.emit({ focus: 'ikhtarha', focusKind: 'stage', focusView: v.id, partFocus: null, prod: ++this.rev }); return true;
  }
  setView(viewId) {
    const f = this.focus; if (!f) return;
    if (f.kind === 'vip') { const i = this.deck.slides.findIndex((s) => s.id === viewId); if (i >= 0) this.setStation(i); return; }
    if (f.kind === 'stage') { const v = STAGE_VIEWS.find((x) => x.id === viewId); if (!v) return; f.view = v.id; this.flyTo({ pos: v.pos, look: v.look, fov: v.fov }); }
    else { const p = PRODUCTS[f.key]; if (!p.views.some((x) => x.id === viewId)) return; f.view = viewId; this.flyTo(this.products.focusView(f.key, viewId)); }
    this.emit({ focusView: viewId, prod: ++this.rev });
  }
  cycleView(dir = 1) {
    const f = this.focus; if (!f) return; if (f.kind === 'vip') { this.stepStation(dir); return; } const list = f.kind === 'stage' ? STAGE_VIEWS : PRODUCTS[f.key].views, i = list.findIndex((v) => v.id === f.view);
    this.setView(list[(i + dir + list.length) % list.length].id);
  }
  exitFocus() {
    if (!this.focus) return false; const P = this.products;
    if (P) { P.setFocusPart(null); P.setHover(null); if (P.vip) { P.vip.setFocus(false); P.vip.setPlayback({ progress: -1 }); } }
    if (this.film) this.film.pause(); if (this.cinema) this.setCinema(false);
    if (this.presMode === 'full') this.leaveFullscreen(); const wasVip = this.focus && this.focus.kind === 'vip'; this.presMode = 'panel'; this.play = playReducer(this.play, { type: 'pause' });
    const s = this.saved, fc = this.fc; this.focus = null; this.pdown = null; if (wasVip) this.emitPlay({ vipProgress: -1 });
    this.emit({ focus: null, focusKind: null, partFocus: null, partHover: null, prod: ++this.rev });
    if (!fc || !s) { this.fc = null; return true; }
    const back = () => { this.fly = null; this.fc = null; this.engine.baseFov = s.fov; this.engine.applyFov(); if (this.engine.setViewShift) this.engine.setViewShift(0, 0); this.apply(); };
    if (this.fly) { this.fly.kill(); this.fly = null; }
    if (this.reduced) { back(); return true; }
    const dyaw = wrapPi(s.yaw - fc.yaw);
    this.fly = gsap.to(fc, { x: s.x, y: s.y, z: s.z, yaw: fc.yaw + dyaw, pitch: s.pitch, fov: s.fov, dy: 0, dp: 0, sx: 0, sy: 0, duration: 1.2, ease: 'power2.inOut', onUpdate: () => this.apply(), onComplete: back });
    return true;
  }
  /** keys while a product / stage is focused. Returns true when the key was consumed. */
  focusKey(e, down) {
    const code = e.code, tag = e.target && e.target.tagName, onControl = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT';
    if (code === 'Escape') { if (down) { e.preventDefault(); if (this.cinema) this.setCinema(false); else if (this.focus && this.focus.kind === 'vip' && this.presMode !== 'panel') this.setPresentMode('panel'); else this.exitFocus(); } return true; }
    if (!down || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return !!(code in MOVE_KEYS);
    if (onControl && (code === 'Enter' || code === 'Space')) return false;             // let the focused button do its own thing
    const f = this.focus, P = this.products; if (!f || !P) return false;
    if (f.kind === 'vip') {
      const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl', d = arrowDir(code, rtl), dig = /^(?:Digit|Numpad)([1-9])$/.exec(code), n = this.deck.slides.length;
      if (onControl && (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown')) return false;
      if (code === 'KeyN') { e.preventDefault(); this.nextAgenda(); return true; }
      if (this.filmOn) {   // film keys: P / Space play or pause, arrows seek 10 s, M mute, C captions, F or Z cinema
        if (code === 'KeyP' || (code === 'Space' && !onControl)) { e.preventDefault(); this.filmToggle(); return true; }
        if (code === 'ArrowRight' || code === 'ArrowLeft') { e.preventDefault(); this.filmSeekBy(code === 'ArrowRight' ? 10 : -10); return true; }
        if (code === 'KeyM') { e.preventDefault(); this.filmMute(); return true; } if (code === 'KeyC') { e.preventDefault(); this.filmCaptions(); return true; }
        if (code === 'KeyF' || code === 'KeyZ') { e.preventDefault(); this.setCinema(!this.cinema); return true; }
      }
      if (d) { e.preventDefault(); this.stepStation(d); return true; }
      if (code === 'ArrowDown' || code === 'ArrowUp') { e.preventDefault(); this.stepStation(code === 'ArrowDown' ? 1 : -1); return true; }
      if (dig) { e.preventDefault(); if (Number(dig[1]) <= n) this.setStation(Number(dig[1]) - 1); return true; }
      if (code === 'BracketRight' || code === 'BracketLeft') { e.preventDefault(); this.cycleDeck(code === 'BracketRight' ? 1 : -1); return true; }
      if (code === 'Home') { e.preventDefault(); this.setStation(0); return true; } if (code === 'End') { e.preventDefault(); this.setStation(n - 1); return true; }
      if (code === 'KeyV') { e.preventDefault(); this.stepStation(e.shiftKey ? -1 : 1); return true; }
      if (code === 'KeyP' || (code === 'Space' && !onControl)) { e.preventDefault(); this.togglePlay(); return true; }
      if (code === 'KeyZ') { e.preventDefault(); this.setPresentMode(this.presMode === 'read' ? 'panel' : 'read'); return true; }
      if (code === 'KeyB') { e.preventDefault(); this.setPresentMode(this.presMode === 'panel' ? 'big' : 'panel'); return true; }
      if (code === 'KeyF') { e.preventDefault(); this.setPresentMode(this.presMode === 'full' ? 'panel' : 'full'); return true; }
      if (code === 'KeyL') { e.preventDefault(); this.toggleLoop(); return true; }
      if (code === 'KeyR') { e.preventDefault(); this.cycleSpeed(); return true; }
      if (code === 'KeyE') { e.preventDefault(); return true; }
      return code in MOVE_KEYS;
    }
    if (f.kind === 'product') {
      const dir = code === 'ArrowRight' || code === 'ArrowDown' ? 1 : code === 'ArrowLeft' || code === 'ArrowUp' ? -1 : 0;
      if (dir && !onControl) { e.preventDefault(); const id = P.registry.step(f.key, P.registry.focus, dir); P.setFocusPart(id); this.emit({ partFocus: id, prod: ++this.rev }); return true; }
      if ((code === 'Enter' || code === 'Space') && P.registry.focus) { e.preventDefault(); this.togglePart(P.registry.focus); return true; }
      if (code === 'KeyL') { e.preventDefault(); this.toggleLed(); return true; }
      if (code === 'KeyF') { e.preventDefault(); this.nextFinish(e.shiftKey ? -1 : 1); return true; }
    }
    if (code === 'KeyV') { e.preventDefault(); this.cycleView(e.shiftKey ? -1 : 1); return true; }
    if (code === 'KeyE') { e.preventDefault(); return true; }
    return code in MOVE_KEYS;
  }
  /** pointer in focus mode: hover highlight on move, a tap / click works the part, a drag nudges the view a little */
  /** a click on the wall screen: a deck chip switches deck */
  vipClick(e) {
    const P = this.products, v = P && P.vip; if (!v || !v.screenMesh || this.allDecks().length < 2) return;
    const n = this.ndc(e.clientX, e.clientY), cam = this.engine.camera; cam.updateMatrixWorld(true); this.raycaster.setFromCamera({ x: n.x, y: n.y }, cam);
    const hit = this.raycaster.intersectObject(v.screenMesh, false)[0]; if (!hit || !hit.uv) return;
    const i = v.chipAt(hit.uv.x, 1 - hit.uv.y); if (i >= 0) this.setDeck(this.allDecks()[i].id); else if (this.filmOn) this.filmToggle(); else { const sl = this.deck.slides[this.ds.slide]; if (sl && sl.builtin === 'meeting') this.startMeeting(); }   // a click on the film plays / pauses it; a click on the agenda card starts the meeting
  }
  focusPointer(e, kind) {
    if (!this.focus) { if (kind === 'up') this.pdown = null; return; }
    if (e.button !== undefined && e.button > 0) return;
    const f = this.focus;
    if (kind === 'down') { this.pdown = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; try { this.canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } return; }
    this.setPtr(e);
    if (kind === 'move') {
      const d = this.pdown;
      if (d && d.id === e.pointerId) {
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 7) d.moved = true;
        if (d.moved && this.fc) { const dx = e.clientX - d.x, dy = e.clientY - d.y; this.fc.dy = clamp(this.fc.dy - dx * 0.0026, -0.45, 0.45); this.fc.dp = clamp(this.fc.dp - dy * 0.0026, -0.3, 0.3); this.apply(); }
        d.x = e.clientX; d.y = e.clientY; return;
      }
      if (f.kind === 'product' && e.pointerType !== 'touch') this.hoverAt(e.clientX, e.clientY);
      return;
    }
    if (kind === 'up') {
      const d = this.pdown; this.pdown = null; if (!d || d.id !== e.pointerId) return;
      if (!d.moved && f.kind === 'vip') { this.vipClick(e); return; }
      if (!d.moved && f.kind === 'product') { const n = this.ndc(e.clientX, e.clientY), hit = this.pickNdc(n.x, n.y, 30, f.key); if (hit) this.togglePart(hit.id); else { this.products.setFocusPart(null); this.emit({ partFocus: null, prod: ++this.rev }); } }
    }
  }
  hoverAt(cx, cy) {
    const f = this.focus, P = this.products; if (!f || !P || f.kind !== 'product') return;
    const n = this.ndc(cx, cy), hit = this.pickNdc(n.x, n.y, 30, f.key), id = hit ? hit.id : null;
    if (P.registry.hover !== id) { P.setHover(id); this.canvas.style.cursor = id ? 'pointer' : 'default'; this.emit({ partHover: id }); }
  }

  // ---------------------------------------------------------------- department glide (GSAP)
  killGlide() { if (this.glide) { this.glide.kill(); this.glide = null; } }
  cancelGlide() { if (this.glide) { this.killGlide(); this.emit({ gliding: false }); } }
  glideTo(id) {
    if (!this.enabled) return false;
    if (this.focus) this.exitFocus(); if (this.fly) { this.fly.kill(); this.fly = null; } this.fc = null;
    const route = routeTo(this.graph, this.walker.pos, id, buildColliders({ doorOpen: this.doorOpen ? 1 : 0, oliveCount: this.engine.tierId === 'low' ? 2 : 4, vipOpen: 1 })); if (!route) return false;
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
    const vOpen = !this.products || !this.products.vip || this.products.vip.doorOpen >= DOOR_OPEN_AT;
    if (vOpen !== this.vipOpen) { this.vipOpen = vOpen; this.colliders = buildColliders({ doorOpen: this.doorOpen ? 1 : 0, oliveCount: this.engine.tierId === 'low' ? 2 : 4, vipOpen: vOpen ? 1 : 0 }); this.walker.setColliders(this.colliders); }
    const open = (this.engine.state.doorOpen || 0) >= DOOR_OPEN_AT;
    if (open !== this.doorOpen) { this.doorOpen = open; this.colliders = buildColliders({ doorOpen: open ? 1 : 0, oliveCount: this.engine.tierId === 'low' ? 2 : 4, vipOpen: this.vipOpen ? 1 : 0 }); this.walker.setColliders(this.colliders); }
    if (this.fc) this.walker.step(dt, {}, this.reduced);                                     // focused on a product: the walker stands still
    else if (!this.glide && !this.paused && !this.uiOpen) this.walker.step(dt, this.inputVector(), this.reduced);
    else if (this.paused || this.uiOpen) this.walker.step(dt, {}, this.reduced);
    this.apply(dt);
    this.tickPlay(dt);
    if (this.engine.avatar) this.engine.avatar.update(dt, this.walker, { visible: this.camMode === 'third' && !this.fc && !this.focus && (this.tpDist == null || this.tpDist > 0.7), reduced: this.reduced });
    this.updateStaff(dt);
    this.crosshairHover(dt);
  }
  /** the advisers: animate, notice the nearest one within talking range (HUD button / T), greet once */
  updateStaff(dt) {
    const S = this.engine.staff; if (!S) return;
    if (!S.onGreet) S.onGreet = (def) => { this.greetN = (this.greetN || 0) + 1; this.emit({ greet: def.id, greetN: this.greetN }); };
    S.update(dt, this.walker, { reduced: this.reduced, visible: true });
    const near = !this.focus && !this.fc ? S.nearest(this.walker.pos[0], this.walker.pos[1], TALK_RADIUS) : null; this.emit({ staff: near ? near.id : null });
  }
  /** open the chat with an adviser (the React layer listens for `talk`); id defaults to the nearest one in range */
  talkToStaff(id) {
    const S = this.engine.staff; if (!this.enabled || this.paused || this.uiOpen || !S) return false;
    const def = id ? S.item(id) && S.item(id).def : S.nearest(this.walker.pos[0], this.walker.pos[1], TALK_RADIUS); if (!def) return false;
    this.talkN = (this.talkN || 0) + 1; this.emit({ talk: def.id, talkN: this.talkN }); return true;
  }
  /** hover outline for whatever is under the crosshair / pointer within reach (explore mode only; focus mode hovers from pointer events) */
  crosshairHover(dt) {
    const P = this.products; if (!P || this.focus) return;
    this.hoverT += dt; if (this.hoverT < 0.1) return; this.hoverT = 0;
    const pid = this.zone ? P.productAt(this.zone.id) : null; let id = null;
    if (pid && !this.paused && !this.uiOpen && !this.glide && !this.fc) {
      const n = this.locked ? { x: 0, y: 0 } : this.dragMode && this.ptr.has ? this.ptr : null;      // crosshair when the pointer is locked, the real pointer in drag-look mode
      const hit = n ? this.pickNdc(n.x, n.y, 4.2, pid) : null; id = hit ? hit.id : null;
    }
    if (P.registry.hover !== id) { P.setHover(id); this.emit({ partHover: id }); }
  }
  apply(dt = 0) {
    const w = this.walker, c = w.camera(), cam = this.engine.camera;
    if (this.fc) {
      const f = this.fc; cam.position.set(f.x, f.y, f.z); cam.rotation.set(f.pitch + f.dp, f.yaw + f.dy, 0, 'YXZ');
      if (Math.abs((this.engine.baseFov || 0) - f.fov) > 1e-3) { this.engine.baseFov = f.fov; this.engine.applyFov(); }
      if (this.engine.setViewShift) this.engine.setViewShift(f.sx || 0, f.sy || 0);
    } else if (this.camMode === 'third' && this.engine.avatar) {
      const f = followCamera({ pos: w.pos, yaw: w.yaw, pitch: w.pitch }, this.colliders, this.tpOpt || {}), k = this.tp && dt && !this.reduced ? 1 - Math.exp(-12 * dt) : 1;
      this.tp = this.tp ? { x: this.tp.x + (f.x - this.tp.x) * k, y: this.tp.y + (f.y - this.tp.y) * k, z: this.tp.z + (f.z - this.tp.z) * k, pitch: this.tp.pitch + (f.pitch - this.tp.pitch) * k } : f;
      this.tpDist = f.dist; cam.position.set(this.tp.x, this.tp.y, this.tp.z); cam.rotation.set(this.tp.pitch, c.yaw, 0, 'YXZ');
    } else { cam.position.set(c.x, c.y, c.z); cam.rotation.set(c.pitch, c.yaw, c.roll, 'YXZ'); }
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
      state: () => ({ camMode: this.camMode, avatar: this.avatarKind, enabled: this.enabled, paused: this.paused, uiOpen: this.uiOpen, gliding: !!this.glide, locked: this.locked, dragMode: this.dragMode, lockFails: this.lockFails, door: this.doorOpen }),
      /** place the walker (collision-resolved) and optionally turn it */
      teleport: (x, z, yaw, pitch) => { w.setPose(x, z, yaw, pitch); w.step(1e-4, {}); this.apply(); if (this.products && this.products.snap) this.products.snap(this.engine.camera); return [w.pos[0], w.pos[1]]; },
      /** run the real Walker + collision for `secs` seconds of simulated time at a fixed step (no rendering needed) */
      sim: (secs, input, step = 1 / 60) => { for (let t = 0; t < secs - 1e-9; t += step) w.step(Math.min(step, secs - t), input, this.reduced); this.apply(); return [w.pos[0], w.pos[1]]; },
      colliders: () => this.colliders, graph: () => this.graph, explorer: this,
    };
  }
}
