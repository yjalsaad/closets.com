/* The moving parts of the product kit, tested with real three.js objects (canvas stubbed): the drawer slides along +X, the hinged door swings about its
 * hinge axis, the sliding leaf translates along Z, LEDs follow the state machine, and everything is registered for picking. */
import * as THREE from 'three';

beforeEach(() => {
  const stub = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : () => stub) , set: () => true });
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => stub);
});
import { createKit } from '../scenes/products/kit';
import { createRegistry } from '../products/registry';
import { PRODUCTS } from '../products/catalog';
import { createProductState } from '../products/animation';

const mats = () => {
  const M = { ledWarm: () => new THREE.MeshBasicMaterial({ color: 0xffd6a2 }), wash: () => new THREE.MeshBasicMaterial({ transparent: true }), shadowDecal: () => new THREE.MeshBasicMaterial() };
  M.front = { kitchen: new THREE.MeshStandardMaterial(), wardrobe: new THREE.MeshStandardMaterial(), door: new THREE.MeshStandardMaterial() };
  M.flute = { kitchen: new THREE.MeshStandardMaterial(), wardrobe: new THREE.MeshStandardMaterial(), door: new THREE.MeshStandardMaterial() }; M.carcass = { kitchen: new THREE.MeshStandardMaterial(), wardrobe: new THREE.MeshStandardMaterial() }; M.frame = { door: new THREE.MeshStandardMaterial() };
  M.metal = { kitchen: new THREE.MeshStandardMaterial(), wardrobe: new THREE.MeshStandardMaterial(), door: new THREE.MeshStandardMaterial() };
  M.tex = { oak: {}, walnut: {}, peel: {}, marble: { white: {}, dark: {}, sand: {} } }; M.stone = new THREE.MeshStandardMaterial(); M.white = null;
  return M;
};
const build = (product = 'kitchen') => { const registry = createRegistry(), M = mats(); const kit = createKit({ product, M, tier: { id: 'low' }, registry }); return { kit, registry, M }; };

describe('kit.drawer', () => {
  test('slides out along +X by `travel` and back, follows the state machine, registers front + pull for picking', () => {
    const { kit, registry, M } = build(); const g = kit.drawer({ id: 'k-island-a1', x: 0.2, y: 0.7, z: -0.6, w: 1.2, h: 0.2, travel: 0.5, frontMat: M.front.kitchen, metalMat: M.metal.kitchen, bodyMat: M.front.kitchen });
    expect(g.position.x).toBeCloseTo(0.2, 9); kit.state.open('k-island-a1'); kit.update(0.2); expect(g.position.x).toBeGreaterThan(0.2); expect(g.position.x).toBeLessThan(0.7);
    kit.update(5); expect(g.position.x).toBeCloseTo(0.7, 9); kit.state.close('k-island-a1'); kit.update(5); expect(g.position.x).toBeCloseTo(0.2, 9);
    const e = registry.get('k-island-a1'); expect(e.hit.length).toBe(2); expect(e.hit.every((m) => m.userData.pickId === 'k-island-a1')).toBe(true); expect(e.kind).toBe('drawer');
  });
  test('the body is a separate mesh behind the front (it is a real drawer, not a box that moves)', () => {
    const { kit, M } = build(); const g = kit.drawer({ id: 'k-island-a2', x: 0, y: 0.5, z: 0, w: 1, h: 0.25, depth: 0.5, frontMat: M.front.kitchen, metalMat: M.metal.kitchen, bodyMat: M.front.kitchen });
    const front = g.children.find((c) => c.name.endsWith(':front')), body = g.children.find((c) => c.name.endsWith(':body'));
    expect(front && body).toBeTruthy(); const b = new THREE.Box3().setFromObject(body), f = new THREE.Box3().setFromObject(front); expect(b.max.x).toBeLessThanOrEqual(f.min.x + 0.021); expect(b.min.x).toBeLessThan(-0.45);
  });
  test('the in-drawer LED is dark while closed, shines when open + switch on, and goes dark when the switch is off', () => {
    const { kit, M } = build(); const g = kit.drawer({ id: 'k-island-a3', x: 0, y: 0.3, z: 0, w: 1, h: 0.28, frontMat: M.front.kitchen, metalMat: M.metal.kitchen, bodyMat: M.front.kitchen });
    const strips = []; g.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && !o.material.transparent) strips.push(o); }); expect(strips.length).toBe(1); const s = strips[0];
    expect(s.visible).toBe(false); kit.state.open('k-island-a3'); kit.update(5); expect(s.visible).toBe(true); expect(s.material.color.r).toBeGreaterThan(0.5);
    kit.state.setLed(false); kit.update(5); expect(s.visible).toBe(false);
  });
});

describe('kit.hinged / kit.slider', () => {
  test('a hinged door swings about the hinge axis toward +X, either hand, up to maxDeg', () => {
    const { kit, M } = build('wardrobe'); const a = kit.hinged({ id: 'w-hinge-l', x: 0, y: 1, z: 0, w: 0.6, h: 2, side: 1, maxDeg: 110, frontMat: M.front.wardrobe, metalMat: M.metal.wardrobe });
    const b = kit.hinged({ id: 'w-hinge-r', x: 0, y: 1, z: 1.2, w: 0.6, h: 2, side: -1, maxDeg: 110, frontMat: M.front.wardrobe, metalMat: M.metal.wardrobe });
    kit.state.open('w-hinge-l'); kit.state.open('w-hinge-r'); kit.update(10);
    expect(a.group.rotation.y).toBeCloseTo(110 * Math.PI / 180, 6); expect(b.group.rotation.y).toBeCloseTo(-110 * Math.PI / 180, 6);
    // the free edge of each leaf ends up on the +X side (toward the visitor)
    for (const [d, s] of [[a, 1], [b, -1]]) { d.group.updateMatrixWorld(true); const v = new THREE.Vector3(0, 0, s * 0.6).applyMatrix4(d.group.matrixWorld); expect(v.x).toBeGreaterThan(0.4); }
    kit.state.close('w-hinge-l'); kit.update(10); expect(a.group.rotation.y).toBeCloseTo(0, 9);
  });
  test('a sliding leaf translates along Z by `travel` (negative travel slides the other way)', () => {
    const { kit, registry, M } = build('wardrobe'); const s1 = kit.slider({ id: 'w-slide-1', x: 0, y: 1, z: -1.775, w: 1.25, h: 2, travel: 1.15, frontMat: M.front.wardrobe, metalMat: M.metal.wardrobe });
    const s2 = kit.slider({ id: 'w-slide-2', x: 0, y: 1, z: -0.625, w: 1.25, h: 2, travel: -1.15, frontMat: M.front.wardrobe, metalMat: M.metal.wardrobe });
    kit.state.open('w-slide-1'); kit.state.open('w-slide-2'); kit.update(10); expect(s1.group.position.z).toBeCloseTo(-0.625, 6); expect(s2.group.position.z).toBeCloseTo(-1.775, 6);
    expect(registry.get('w-slide-1').kind).toBe('slider');
  });
  test('glass leaves get a frame + a pane (separate meshes) and both are pickable', () => {
    const { kit, M } = build('wardrobe'); const d = kit.hinged({ id: 'w-glass-l', x: 0, y: 1.9, z: 1.2, w: 0.6, h: 1.4, side: 1, glass: true, frontMat: M.front.wardrobe, metalMat: M.metal.wardrobe, glassMat: new THREE.MeshStandardMaterial() });
    expect(d.hit.map((m) => m.name)).toEqual(expect.arrayContaining(['w-glass-l:frame', 'w-glass-l:glass']));
  });
});

describe('kit plumbing', () => {
  test('statics merge into one mesh per material; finishes are applied through setFinish; update returns whether anything moved', () => {
    const { kit, M } = build(); for (let i = 0; i < 5; i++) kit.addStatic(new THREE.BoxGeometry(1, 1, 1), M.stone); kit.addStatic(new THREE.BoxGeometry(1, 1, 1), M.front.kitchen);
    const before = kit.group.children.length; kit.flushStatics(); expect(kit.group.children.length - before).toBe(2);
    expect(kit.update(0.1)).toBe(false); kit.state.open(PRODUCTS.kitchen.parts[0].id); expect(kit.update(0.1)).toBe(true);
    kit.setFinish('walnut-dark-stone'); expect(kit.state.finishId).toBe('walnut-dark-stone');
  });
  test('kit.led switches its strip and wash with the level function', () => {
    const { kit } = build(); let lvl = 0; const l = kit.led({ x: 0, y: 1, z: 0, len: 1, levelOf: () => lvl, washPlane: { w: 1, h: 1, pos: [0, 0, 0] } });
    expect(l.strip.visible).toBe(false); lvl = 1; kit.refresh(); kit.update(0.01); expect(l.strip.visible).toBe(true); expect(l.wash.visible).toBe(true);
  });
  test('partBox returns the world box of a registered part (for the hover outline)', () => {
    const { kit, M } = build(); kit.drawer({ id: 'k-island-b1', x: 0, y: 0.5, z: 0, w: 1, h: 0.2, frontMat: M.front.kitchen, metalMat: M.metal.kitchen, bodyMat: M.front.kitchen });
    kit.group.updateMatrixWorld(true); const box = kit.partBox('k-island-b1'); expect(box.isEmpty()).toBe(false); const s = new THREE.Vector3(); box.getSize(s); expect(s.z).toBeCloseTo(1, 1);
    expect(kit.partBox('nope').isEmpty()).toBe(true);
  });
});
