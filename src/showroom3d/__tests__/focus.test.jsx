import { act } from '@testing-library/react';
import { Explorer } from '../navigation/explorer';
import { createRegistry } from '../products/registry';
import { createProductState } from '../products/animation';
import { PRODUCTS, productForDept, viewWorld, stateDef, STAGE_VIEWS } from '../products/catalog';
import { finishIds } from '../products/finishes';
import { layoutBays } from '../scenes/main-hall/departments';

const bays = layoutBays();
function fakeProducts() {
  const registry = createRegistry(), kits = {};
  for (const p of Object.values(PRODUCTS)) { p.parts.forEach((x) => registry.register({ id: x.id, product: p.id, kind: x.kind, hit: [] })); kits[p.id] = { state: createProductState(stateDef(p.id, finishIds(p.id))) }; }
  const calls = { hover: [], outline: [] };
  return {
    calls, registry, kits,
    productAt: (d) => { const p = productForDept(d); return p ? p.id : null; },
    setFocusPart: (id) => registry.setFocus(id), setHover: (id) => { calls.hover.push(id); return registry.setHover(id); },
    focusView: (pid, vid) => { const p = PRODUCTS[pid], v = p.views.find((x) => x.id === vid) || p.views[0]; return viewWorld(bays.find((b) => b.product === pid), v); },
    toggle: (id) => { const e = registry.get(id); return e ? { id, open: kits[e.product].state.toggle(id) } : null; },
    toggleLed: (pid) => kits[pid].state.toggleLed(), setFinish: (pid, f) => kits[pid].state.setFinish(f), snapshot: (pid) => kits[pid].state.snapshot(),
    pick: () => null,
  };
}
function fakeEngine() {
  return {
    tierId: 'low', state: { doorOpen: 1 }, baseFov: 50, fovs: [], shifts: [], products: fakeProducts(),
    camera: { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { x: 0, y: 0, z: 0, order: 'XYZ', set(x, y, z, o) { this.x = x; this.y = y; this.z = z; if (o) this.order = o; } }, near: 0.25, updateProjectionMatrix() {}, updateMatrixWorld() {} },
    bays: { highlight: { setNear() {}, pulse() {}, tick() {} } },
    applyFov() { this.fovs.push(this.baseFov); }, setViewShift(x, y) { this.shifts.push([x, y]); },
  };
}
const key = (code, type = 'keydown', extra = {}) => act(() => { window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...extra })); });
function make(opts = {}) {
  const canvas = document.createElement('canvas'); document.body.appendChild(canvas); const engine = fakeEngine(), events = [];
  const x = new Explorer({ engine, canvas, reduced: true, onState: (p) => events.push(p), ...opts }); x.enable(); return { x, engine, canvas, events };
}
const at = (x, id) => { const b = bays.find((q) => q.id === id); x.walker.setPose(b.facing * 12.5 * -1 * -1 === 12.5 ? 12.5 * Math.sign(b.x) : 0, b.z, 0, 0); x.update(1 / 60); };

describe('Explorer: product focus, picking and the Ikhtarha stage', () => {
  afterEach(() => { document.body.innerHTML = ''; });
  test('E inside a furnished bay focuses its product (camera at the overview pose, fov set, walker stands still)', () => {
    const { x, engine, events } = make(); at(x, 'kitchens'); expect(x.zone.id).toBe('kitchens');
    key('KeyE'); expect(x.focus).toMatchObject({ kind: 'product', key: 'kitchen' }); expect(events.filter((e) => e.focus).pop()).toMatchObject({ focus: 'kitchen', focusKind: 'product', focusView: 'overview' });
    const v = engine.products.focusView('kitchen', 'overview'); x.update(1 / 60);
    expect(engine.camera.position.x).toBeCloseTo(v.pos[0], 6); expect(engine.camera.position.y).toBeCloseTo(v.pos[1], 6); expect(engine.camera.position.z).toBeCloseTo(v.pos[2], 6); expect(engine.baseFov).toBe(v.fov);
    const p0 = [...x.walker.pos]; key('KeyW'); for (let i = 0; i < 30; i++) x.update(1 / 60); expect(x.walker.pos).toEqual(p0);   // WASD does nothing while focused
  });
  test('Esc exits the focus and returns the camera, fov and view shift exactly to where the visitor stood', () => {
    const { x, engine, events } = make(); at(x, 'wardrobes'); const before = { ...engine.camera.position }; const pose = [x.walker.pos[0], x.walker.pos[1]];
    key('KeyE'); key('Escape'); expect(x.focus).toBeNull(); expect(events.filter((e) => 'focus' in e).pop().focus).toBeNull(); x.update(1 / 60);
    expect(engine.camera.position.x).toBeCloseTo(before.x, 6); expect(engine.camera.position.z).toBeCloseTo(before.z, 6); expect(x.walker.pos).toEqual(pose); expect(engine.baseFov).toBe(50); expect(engine.shifts.pop()).toEqual([0, 0]);
    expect(x.paused).toBe(false);   // Esc closed the focus, it did not also open the pause menu
  });
  test('E at an empty bay does not focus anything (still the "later release" stub); E at the stage opens the Ikhtarha stage', () => {
    const { x, events } = make(); at(x, 'walkin'); key('KeyE'); expect(x.focus).toBeNull(); expect(events.filter((e) => e.interact).pop()).toMatchObject({ interactZone: 'walkin' });
    x.walker.setPose(0, -20.5, 0, 0); x.update(1 / 60); expect(x.zone.id).toBe('ikhtarha'); key('KeyE'); expect(x.focus).toMatchObject({ kind: 'stage', key: 'ikhtarha' }); expect(events.filter((e) => e.focusKind).pop().focusKind).toBe('stage');
    const v = STAGE_VIEWS[0]; x.update(1 / 60); expect(x.engine.camera.position.z).toBeCloseTo(v.pos[2], 6);
  });
  test('keyboard: arrows pick a part, Enter works it, L toggles the LED, F cycles the finish, V cycles the view', () => {
    const { x, engine, events } = make(); at(x, 'kitchens'); key('KeyE'); const P = engine.products, st = P.kits.kitchen.state;
    key('ArrowRight'); expect(P.registry.focus).toBe(PRODUCTS.kitchen.parts[0].id); key('ArrowRight'); expect(P.registry.focus).toBe(PRODUCTS.kitchen.parts[1].id); key('ArrowLeft'); key('ArrowLeft'); expect(P.registry.focus).toBe(PRODUCTS.kitchen.parts[PRODUCTS.kitchen.parts.length - 1].id);
    key('ArrowRight'); const id = P.registry.focus; key('Enter'); expect(st.part(id).isOpen).toBe(true); key('Space'); expect(st.part(id).isOpen).toBe(false);
    expect(events.some((e) => String(e.lastToggle || '').startsWith(id + ':1'))).toBe(true);
    key('KeyL'); expect(st.ledOn).toBe(false); key('KeyL'); expect(st.ledOn).toBe(true);
    const f0 = st.finishId; key('KeyF'); expect(st.finishId).not.toBe(f0); key('KeyF', 'keydown', { shiftKey: true }); expect(st.finishId).toBe(f0);
    expect(x.focus.view).toBe('overview'); key('KeyV'); expect(x.focus.view).toBe(PRODUCTS.kitchen.views[1].id); key('KeyV', 'keydown', { shiftKey: true }); expect(x.focus.view).toBe('overview');
  });
  test('keys on a focused button are left to the button (Enter / Space activate it, not the part toggle)', () => {
    const { x, engine } = make(); at(x, 'kitchens'); key('KeyE'); engine.products.setFocusPart(PRODUCTS.kitchen.parts[0].id); const btn = document.createElement('button'); document.body.appendChild(btn);
    act(() => { btn.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true, cancelable: true })); }); expect(engine.products.kits.kitchen.state.part(PRODUCTS.kitchen.parts[0].id).isOpen).toBe(false);
  });
  test('panel actions: open all / close all, LED, finish, view, with state changes reported through onState', () => {
    const { x, engine, events } = make(); at(x, 'wardrobes'); key('KeyE'); const st = engine.products.kits.wardrobe.state;
    x.openAll(true); expect(st.anyOpen()).toBe(true); x.openAll(false); st.update(5); expect(st.anyOpen()).toBe(false);
    expect(x.toggleLed()).toBe(false); x.setFinish('stone-grey'); expect(st.finishId).toBe('stone-grey'); x.setView('detail'); expect(x.focus.view).toBe('detail');
    const s = x.productState(); expect(s).toMatchObject({ product: 'wardrobe', view: 'detail', finishId: 'stone-grey', led: false }); expect(events.filter((e) => e.prod).length).toBeGreaterThan(3);
  });
  test('pointer: a tap (no drag) in focus mode toggles the part under the pointer; a drag only nudges the view; hover is reported', () => {
    const { x, engine, canvas } = make(); at(x, 'kitchens'); key('KeyE'); const id = PRODUCTS.kitchen.parts[2].id; jest.spyOn(x, 'pickNdc').mockReturnValue({ id, distance: 3, part: {} });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 400 });
    x.onPointerMove({ pointerId: 1, clientX: 400, clientY: 200, pointerType: 'mouse' }); expect(engine.products.registry.hover).toBe(id);
    x.onPointerDown({ pointerId: 1, clientX: 400, clientY: 200, button: 0, pointerType: 'mouse' }); x.onPointerUp({ pointerId: 1, clientX: 402, clientY: 201, pointerType: 'mouse' });
    expect(engine.products.kits.kitchen.state.part(id).isOpen).toBe(true);
    const yaw = x.fc.dy; x.onPointerDown({ pointerId: 2, clientX: 400, clientY: 200, button: 0, pointerType: 'touch' }); x.onPointerMove({ pointerId: 2, clientX: 460, clientY: 200, pointerType: 'touch' }); x.onPointerUp({ pointerId: 2, clientX: 460, clientY: 200, pointerType: 'touch' });
    expect(x.fc.dy).not.toBe(yaw); expect(engine.products.kits.kitchen.state.part(id).isOpen).toBe(true);   // unchanged: a drag is not a tap
  });
  test('touch tap while exploring works a part only inside a furnished bay and only on a hit', () => {
    const { x, engine, canvas } = make(); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 400 });
    x.walker.setPose(0, -9, 0, 0); x.update(1 / 60); const spy = jest.spyOn(x, 'pickNdc').mockReturnValue({ id: PRODUCTS.kitchen.parts[0].id, distance: 2 }); expect(x.tap(100, 100)).toBe(false); expect(spy).not.toHaveBeenCalled();
    at(x, 'kitchens'); spy.mockReturnValue(null); expect(x.tap(100, 100)).toBe(false); spy.mockReturnValue({ id: PRODUCTS.kitchen.parts[0].id, distance: 2 }); expect(x.tap(100, 100)).toBe(true); expect(engine.products.kits.kitchen.state.part(PRODUCTS.kitchen.parts[0].id).isOpen).toBe(true);
  });
  test('a department glide while focused exits the focus first', () => {
    const { x } = make(); at(x, 'kitchens'); key('KeyE'); expect(x.focus).toBeTruthy(); x.glideTo('doors'); expect(x.focus).toBeNull(); expect(x.fc).toBeNull();
  });
  test('without products (e.g. an engine that has none) interaction falls back to the old stub safely', () => {
    const { x, engine, events } = make(); engine.products = undefined; at(x, 'kitchens'); key('KeyE'); expect(x.focus).toBeNull(); expect(events.filter((e) => e.interact).pop()).toMatchObject({ interactZone: 'kitchens' });
  });
  test('reduced motion makes the focus move instant; otherwise the camera glides with GSAP (not there on the first frame)', () => {
    const { x, engine } = make({ reduced: false }); at(x, 'kitchens'); const v = engine.products.focusView('kitchen', 'overview'); key('KeyE'); x.update(1 / 60);
    expect(Math.abs(engine.camera.position.x - v.pos[0])).toBeGreaterThan(0.5); expect(x.fly).toBeTruthy(); x.disable();
  });
});
