import React from 'react';
import * as THREE from 'three';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Explorer } from '../../navigation/explorer';
import { DeptMenu } from '../../ui/Menus';
import { DEPARTMENTS } from '../../scenes/main-hall/departments';
import { placement } from '../layout';
import { SECTIONS } from '../sections';

const P = placement(SECTIONS[0]);
function fakeEngine() {
  const calls = { pulse: 0, near: [], tap: 0 };
  return { calls, tierId: 'low', state: { doorOpen: 1 },
    camera: { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { x: 0, y: 0, z: 0, order: 'XYZ', set(x, y, z, o) { this.x = x; this.y = y; this.z = z; if (o) this.order = o; } }, near: 0.25, isPerspectiveCamera: true, matrixWorld: new THREE.Matrix4(), projectionMatrixInverse: new THREE.Matrix4(), updateProjectionMatrix() {}, updateMatrixWorld() {} },
    bays: { highlight: { setNear() {}, pulse() {}, tick() {} } },
    designStudio: { section: SECTIONS[0], setNear: (v) => calls.near.push(v), pulseHalo: () => { calls.pulse++; }, pick: () => (engineHit.d) } };
}
const engineHit = { d: null };
const key = (code) => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })); });
function make() { const canvas = document.createElement('canvas'); document.body.appendChild(canvas); const engine = fakeEngine(), events = []; const x = new Explorer({ engine, canvas, onState: (p) => events.push(p) }); x.enable(); return { x, engine, events, canvas }; }

describe('the explorer and the Kitchen Design Studio', () => {
  afterEach(() => { document.body.innerHTML = ''; engineHit.d = null; });
  test('standing at the station: the zone is the studio, the halo is told, and E asks the React layer to open the designer', () => {
    const { x, engine, events } = make();
    x.debug().teleport(P.stand[0], P.stand[1], 0, 0.1);
    expect(x.zone && x.zone.id).toBe('kitchen-studio'); expect(engine.calls.near).toContain(true);
    key('KeyE'); expect(engine.calls.pulse).toBe(1);
    expect(events.filter((e) => e.designStudio).pop()).toMatchObject({ designStudioId: 'kitchen-studio' });
  });
  test('E elsewhere does not open the designer; leaving the zone clears the halo', () => {
    const { x, engine, events } = make();
    x.debug().teleport(0, -3.5, 0, 0); key('KeyE'); expect(events.some((e) => e.designStudio)).toBe(false);
    x.debug().teleport(P.stand[0], P.stand[1], 0, 0); x.debug().teleport(0, -3.5, 0, 0); expect(engine.calls.near.slice(-1)).toEqual([false]);
  });
  test('the quick-nav graph has the studio as the 11th stop (the digit keys 1..9 are unchanged)', () => {
    const { x } = make(); expect(x.graph.stops).toHaveLength(11); expect(x.graph.stops[10].id).toBe('kitchen-studio'); expect(x.graph.stops[8].id).toBe('vip'); expect(x.graph.stops[9].id).toBe('collections');
    expect(x.zones[0].id).toBe('kitchen-studio');
  });
  test('the glide to the studio arrives looking a little up at the screen (stop.pitch)', () => {
    const { x, events } = make(); x.reduced = true; x.debug().teleport(0, -3.5, 0, 0); expect(x.glideTo('kitchen-studio')).toBe(true);
    expect(events.filter((e) => e.arrived).pop().arrived).toBe('kitchen-studio'); expect(x.walker.pitch).toBeCloseTo(0.17, 2);
    expect(Math.hypot(x.walker.pos[0] - P.stand[0], x.walker.pos[1] - P.stand[1])).toBeLessThan(0.05);
  });
  test('a click on the screen while standing at the station opens the designer; from afar it walks there', () => {
    const { x, events, canvas } = make(); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
    engineHit.d = 3; x.debug().teleport(P.stand[0], P.stand[1], 0, 0.1); expect(x.tapPick(50, 50)).toBe(true); expect(events.filter((e) => e.designStudio)).toHaveLength(1);
    x.reduced = true; x.debug().teleport(0, -3.5, 0, 0); expect(x.tapPick(50, 50)).toBe(true); expect(events.filter((e) => e.arrived).pop().arrived).toBe('kitchen-studio');
    engineHit.d = 40; x.debug().teleport(0, -3.5, 0, 0); events.length = 0; x.tapPick(50, 50); expect(events.some((e) => e.designStudio)).toBe(false);   // too far to count as a hit on the screen
  });
});

describe('the department quick-nav menu', () => {
  test('lists the Kitchen Design Studio last, in both languages, without a digit key (only 1..9 have keys), and picking it asks for the glide', () => {
    const onPick = jest.fn(); const { unmount } = render(<DeptMenu lang="en" touch={false} onPick={onPick} onClose={() => {}} />);
    const items = screen.getByTestId('sr-dept-menu').querySelectorAll('.sr-dept'); expect(items).toHaveLength(DEPARTMENTS.length + 3);
    const last = items[items.length - 1]; expect(last).toHaveAttribute('data-dept', 'kitchen-studio'); expect(last).toHaveTextContent('Kitchen Design Studio'); expect(last.querySelector('kbd')).toBeNull();
    fireEvent.click(last); expect(onPick).toHaveBeenCalledWith('kitchen-studio'); unmount();
    render(<DeptMenu lang="ar" touch onPick={onPick} onClose={() => {}} />); expect(screen.getByTestId('sr-dept-menu').querySelector('[data-dept="kitchen-studio"]')).toHaveTextContent('استوديو تصميم المطابخ');
  });
});
