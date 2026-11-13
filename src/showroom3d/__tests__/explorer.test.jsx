import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Explorer } from '../navigation/explorer';
import { DeptMenu, PauseMenu, CoachMarks } from '../ui/Menus';
import TouchControls from '../ui/TouchControls';
import { DEPARTMENTS } from '../scenes/main-hall/departments';
import { STRINGS } from '../strings';

function fakeEngine() {
  const calls = { near: [], pulse: [], setNear: [] };
  return {
    calls, tierId: 'low', state: { doorOpen: 1 },
    camera: { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { x: 0, y: 0, z: 0, order: 'XYZ', set(x, y, z, o) { this.x = x; this.y = y; this.z = z; if (o) this.order = o; } }, near: 0.25, updateProjectionMatrix() {} },
    bays: { highlight: { setNear: (id) => calls.setNear.push(id), pulse: (id) => calls.pulse.push(id), tick() {} } },
  };
}
const key = (code, type = 'keydown', extra = {}) => act(() => { window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...extra })); });
function make(opts = {}) {
  const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  const engine = fakeEngine(), events = []; const x = new Explorer({ engine, canvas, onState: (p) => events.push(p), ...opts });
  x.enable(); return { x, engine, canvas, events };
}

describe('Explorer (keyboard, pause, pointer lock, interaction, glide)', () => {
  afterEach(() => { document.body.innerHTML = ''; });
  test('enable puts the camera at the hand-over (1.65 m eye, near plane below the collision radius, YXZ euler) and disable restores it', () => {
    const { x, engine } = make();
    expect(engine.camera.position.y).toBeCloseTo(1.65, 9); expect(engine.camera.position.z).toBeCloseTo(-9, 9); expect(engine.camera.near).toBeLessThan(0.35); expect(engine.camera.rotation.order).toBe('YXZ');
    x.disable(); expect(engine.camera.near).toBe(0.25); expect(engine.camera.rotation.order).toBe('XYZ');
  });
  test('held W walks forward at ~1.4 m/s; Shift jogs; releasing the key stops; keys are ignored while paused', () => {
    const { x } = make(); x.walker.setPose(8, -5, 0, 0); key('KeyW'); for (let i = 0; i < 90; i++) x.update(1 / 60); expect(x.walker.speed).toBeGreaterThan(1.35); expect(x.walker.speed).toBeLessThan(1.45);
    key('ShiftLeft'); for (let i = 0; i < 90; i++) x.update(1 / 60); expect(x.walker.speed).toBeGreaterThan(2.4);
    key('KeyW', 'keyup'); key('ShiftLeft', 'keyup'); for (let i = 0; i < 90; i++) x.update(1 / 60); expect(x.walker.speed).toBeLessThan(0.01);
    x.pause(); const z = x.walker.pos[1]; key('KeyW'); for (let i = 0; i < 30; i++) x.update(1 / 60); expect(x.walker.pos[1]).toBeCloseTo(z, 3);
  });
  test('arrow keys move like WASD; comma / period turn for keyboard-only use', () => {
    const { x } = make(); key('ArrowUp'); for (let i = 0; i < 30; i++) x.update(1 / 60); expect(x.walker.pos[1]).toBeLessThan(-9); key('ArrowUp', 'keyup');
    const y0 = x.walker.yaw; key('Comma'); expect(x.walker.yaw).toBeGreaterThan(y0); key('Period'); key('Period'); expect(x.walker.yaw).toBeLessThan(y0);
  });
  test('Escape pauses (and is reported), keys typed into form fields are ignored', () => {
    const { x, events } = make(); const input = document.createElement('input'); document.body.appendChild(input);
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true })); }); expect(x.keys.size).toBe(0);
    key('Escape'); expect(x.paused).toBe(true); expect(events.some((e) => e.paused === true)).toBe(true); x.resume(); expect(x.paused).toBe(false);
  });
  test('E outside a bay nudges (interactZone null); inside a bay it pulses that bay\'s highlight', () => {
    const { x, engine, events } = make(); key('KeyE'); expect(events.filter((e) => e.interact).pop()).toMatchObject({ interactZone: null });
    x.walker.setPose(-12.5, -7.9, Math.PI / 2, 0); x.update(1 / 60); expect(x.zone && x.zone.id).toBe('kitchens'); expect(engine.calls.setNear).toContain('kitchens');
    key('KeyE'); expect(engine.calls.pulse).toEqual(['kitchens']); expect(events.filter((e) => e.interact).pop()).toMatchObject({ interactZone: 'kitchens' });
  });
  test('pointer lock denied (error event) or unsupported falls back to drag-look; two failures stop retrying', () => {
    const { x, canvas, events } = make(); canvas.requestPointerLock = jest.fn(() => { document.dispatchEvent(new Event('pointerlockerror')); });
    x.requestLock(); expect(x.dragMode).toBe(true); expect(events.some((e) => e.lockFailed)).toBe(true);
    x.requestLock(); expect(canvas.requestPointerLock).toHaveBeenCalledTimes(2); x.requestLock(); expect(canvas.requestPointerLock).toHaveBeenCalledTimes(2);   // no more tries
    const { x: y } = make(); y.requestLock(); expect(y.dragMode).toBe(true);                                                                              // jsdom: no requestPointerLock at all
    const yaw = x.walker.yaw; x.drag = { id: 1, x: 100, y: 100 }; x.onPointerMove({ pointerId: 1, clientX: 160, clientY: 100 }); expect(x.walker.yaw).toBeLessThan(yaw);
  });
  test('a rejected requestPointerLock() promise is handled too', async () => {
    const { x, canvas } = make(); canvas.requestPointerLock = () => Promise.reject(new Error('denied')); x.requestLock(); await Promise.resolve(); await Promise.resolve(); expect(x.dragMode).toBe(true);
  });
  test('glide: reduced motion jumps instantly to the bay entrance, facing the bay, inside its zone; the final pose equals the stand point', () => {
    const { x, events } = make({ reduced: true }); expect(x.glideTo('lounge')).toBe(true);
    expect(x.walker.pos[0]).toBeCloseTo(12.5, 6); expect(x.walker.pos[1]).toBeCloseTo(-30.7, 6); expect(Math.abs(Math.abs(x.walker.yaw) - Math.PI / 2)).toBeLessThan(1e-6);
    expect(x.zone && x.zone.id).toBe('lounge'); expect(events.some((e) => e.arrived === 'lounge')).toBe(true); expect(x.glideTo('nope')).toBe(false);
  });
  test('glide (GSAP): starts, can be cancelled by movement input, and is killed on disable', () => {
    const { x } = make(); x.glideTo('kitchens'); expect(x.glide).not.toBeNull(); key('KeyW'); expect(x.glide).toBeNull(); key('KeyW', 'keyup');
    x.glideTo('doors'); expect(x.glide).not.toBeNull(); x.disable(); expect(x.glide).toBeNull();
  });
  test('digit keys 1-8 start a glide to the numbered department', () => {
    const { x } = make({ reduced: true }); key('Digit5'); expect(x.zone && x.zone.id).toBe('doors');
  });
  test('closed doors rebuild the colliders (walker cannot leave); QA debug hooks expose position and a collision-resolved teleport', () => {
    const { x, engine } = make(); engine.state.doorOpen = 0; x.update(1 / 60); expect(x.doorOpen).toBe(false);
    const d = x.debug(); d.teleport(0, -3, Math.PI, 0); const p = d.sim(8, { fwd: 1 }); expect(p[1]).toBeLessThan(-0.5);
  });
});

describe('overlays', () => {
  test('department menu lists the eight departments and the VIP meeting room (9th) in order, in both languages, and picking calls back', () => {
    const onPick = jest.fn(), onClose = jest.fn(); const { rerender } = render(<DeptMenu lang="en" touch={false} onPick={onPick} onClose={onClose} />);
    const items = screen.getAllByRole('button').filter((b) => b.dataset.dept); expect(items.map((b) => b.dataset.dept)).toEqual([...DEPARTMENTS.map((d) => d.id), 'vip']);
    fireEvent.click(items[2]); expect(onPick).toHaveBeenCalledWith('walkin');
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    rerender(<DeptMenu lang="ar" touch onPick={onPick} onClose={onClose} />); expect(screen.getByText('المطابخ')).toBeTruthy();
  });
  test('dialogs take focus, trap Tab, and Escape closes without reaching the window', () => {
    const onClose = jest.fn(), seen = jest.fn(); window.addEventListener('keydown', seen);
    render(<DeptMenu lang="en" onPick={() => {}} onClose={onClose} />);
    const dlg = screen.getByRole('dialog'); expect(dlg.contains(document.activeElement)).toBe(true);
    const btns = [...dlg.querySelectorAll('button')], last = btns[btns.length - 1]; last.focus(); fireEvent.keyDown(last, { key: 'Tab' }); expect(document.activeElement).toBe(btns[0]);
    fireEvent.keyDown(btns[0], { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(last);
    seen.mockClear(); fireEvent.keyDown(btns[0], { key: 'Escape' }); expect(onClose).toHaveBeenCalledTimes(1); expect(seen).not.toHaveBeenCalled(); window.removeEventListener('keydown', seen);
  });
  test('pause menu: Resume first and focused; replay / language / bob / tips / back-to-website; bob is disabled with reduced motion', () => {
    const h = { onResume: jest.fn(), onDepts: jest.fn(), onReplay: jest.fn(), onLang: jest.fn(), onBob: jest.fn(), onTips: jest.fn() };
    const { rerender } = render(<PauseMenu lang="en" reduced={false} bob homeHref="/" {...h} />);
    expect(document.activeElement.textContent).toBe('Resume'); fireEvent.click(screen.getByText('Replay intro')); expect(h.onReplay).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Switch to Arabic')); expect(h.onLang).toHaveBeenCalled(); fireEvent.click(screen.getByText('Head bob: on')); expect(h.onBob).toHaveBeenCalled();
    expect(screen.getByText('Back to website').getAttribute('href')).toBe('/'); fireEvent.click(screen.getByText('Resume')); expect(h.onResume).toHaveBeenCalledWith(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(h.onResume).toHaveBeenLastCalledWith(false);
    rerender(<PauseMenu lang="ar" reduced bob homeHref="/ar" {...h} />); expect(screen.getByText(STRINGS.headBobOff.ar).closest('button').disabled).toBe(true); expect(screen.getByText(STRINGS.headBobReduced.ar)).toBeTruthy();
  });
  test('coach marks: three tips per input type, EN and AR, with a dismiss button', () => {
    const done = jest.fn(); const { rerender, container } = render(<CoachMarks lang="en" touch={false} onDone={done} />);
    expect(container.querySelectorAll('li')).toHaveLength(3); expect(screen.getByText(/W A S D/)).toBeTruthy(); fireEvent.click(screen.getByText('Got it')); expect(done).toHaveBeenCalled();
    rerender(<CoachMarks lang="ar" touch onDone={done} />); expect(screen.getByText(STRINGS.coachWalkTouch.ar)).toBeTruthy();
  });
  test('touch controls: joystick drag drives touchMove (up = forward), rim = jog, release stops; look area drives touchLook; two zones are independent', () => {
    const ex = { touchMove: jest.fn(), touchLook: jest.fn() }; render(<TouchControls lang="en" explorerRef={{ current: ex }} onInteract={() => {}} />);
    const joy = screen.getByTestId('sr-joyzone'), look = screen.getByTestId('sr-lookzone');
    joy.getBoundingClientRect = () => ({ left: 0, top: 0, right: 195, bottom: 844, width: 195, height: 844, x: 0, y: 0 });   // jsdom has no layout
    const ev = (el, type, id, x, y) => { const e = new Event(type, { bubbles: true }); Object.assign(e, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch' }); fireEvent(el, e); };
    ev(joy, 'pointerdown', 1, 100, 400); ev(joy, 'pointermove', 1, 100, 360);
    const [x1, y1, j1] = ex.touchMove.mock.calls.pop(); expect(y1).toBeGreaterThan(0.2); expect(Math.abs(x1)).toBeLessThan(0.01); expect(j1).toBe(false);
    ev(look, 'pointerdown', 2, 300, 300); ev(look, 'pointermove', 2, 330, 290); expect(ex.touchLook).toHaveBeenCalledWith(30, -10);
    ev(joy, 'pointermove', 1, 100, 300); expect(ex.touchMove.mock.calls.pop()[2]).toBe(true);                      // pushed past the rim: jog
    ev(joy, 'pointerdown', 9, 50, 50); ev(joy, 'pointermove', 9, 200, 50); expect(ex.touchMove.mock.calls.pop()[0]).toBeLessThan(0.01);   // a second finger in the same zone is ignored
    ev(joy, 'pointerup', 1, 100, 300); expect(ex.touchMove).toHaveBeenLastCalledWith(0, 0, false);
    ev(look, 'pointerup', 2, 330, 290); ex.touchLook.mockClear(); ev(look, 'pointermove', 2, 360, 290); expect(ex.touchLook).not.toHaveBeenCalled();
  });
});
