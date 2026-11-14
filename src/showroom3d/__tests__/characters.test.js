/* P3: the Arabic character system: animation state machine, rig bounds / budget, outfits, visitor avatar, third-person camera. */
import * as THREE from 'three';
import { createAnim, updateAnim, pose, stateOf, playGesture, speechEnvelope, GESTURES, LIMITS } from '../characters/anim';
import { buildCharacter, OUTFITS, SKINS } from '../characters/rig';
import { VisitorAvatar, AVATARS, nextAvatar } from '../characters/visitorAvatar';
import { followCamera, FOLLOW } from '../characters/follow';
import { buildColliders, isFree } from '../navigation/colliders';

const run = (a, secs, inp, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) updateAnim(a, dt, inp); return a; };

describe('animation state machine', () => {
  test('starts idle; walking speed blends to walk and back to idle (no snap: the weight rises over frames)', () => {
    const a = createAnim(); expect(stateOf(a)).toBe('idle'); updateAnim(a, 1 / 60, { speed: 1.4 }); expect(a.w.walk).toBeGreaterThan(0); expect(a.w.walk).toBeLessThan(0.3);
    run(a, 1.2, { speed: 1.4 }); expect(stateOf(a)).toBe('walk'); run(a, 1.5, { speed: 0 }); expect(stateOf(a)).toBe('idle');
  });
  test('the stride phase follows the distance walked (same distance, different speed, same phase) and stands still at zero speed', () => {
    const a = createAnim(), b = createAnim(); run(a, 2, { speed: 1 }); run(b, 1, { speed: 2 }); expect(Math.abs(a.phase - b.phase)).toBeLessThan(0.2); const p0 = a.phase; run(a, 1, { speed: 0 }); expect(a.phase).toBe(p0);
  });
  test('gestures: unknown names are refused; each plays for its duration, raises the arm, then returns to idle', () => {
    const a = createAnim(); expect(playGesture(a, 'dance')).toBe(false);
    for (const g of Object.keys(GESTURES)) { const x = createAnim(); expect(playGesture(x, g)).toBe(true); run(x, GESTURES[g] / 2, {}); expect(stateOf(x)).toBe('gesture'); const p = pose(x); expect(Math.abs(p.shR.x) + Math.abs(p.shR.z)).toBeGreaterThan(0.3); run(x, GESTURES[g], {}); expect(x.gesture).toBeNull(); run(x, 1, {}); expect(stateOf(x)).toBe('idle'); }
  });
  test('talk: the jaw follows the speech level, silence closes it; the speech envelope is deterministic, bounded and pauses on spaces', () => {
    const a = createAnim(); run(a, 1, { talking: true, level: 1 }); expect(pose(a).jaw).toBeGreaterThan(0.5); run(a, 1, { talking: false, level: 0 }); expect(pose(a).jaw).toBeLessThan(0.05);
    for (let t = 0; t < 3; t += 0.037) { const e = speechEnvelope('Hello, welcome to the showroom', t); expect(e).toBeGreaterThanOrEqual(0); expect(e).toBeLessThanOrEqual(1); expect(speechEnvelope('Hello, welcome to the showroom', t)).toBe(e); }
    expect(speechEnvelope('', 1)).toBe(0); expect(speechEnvelope('a b', 1 / 13 * 1 + 0.001)).toBeLessThan(0.1);
  });
  test('blinking happens now and then and never under reduced motion; any dt (0, negative, huge) is safe', () => {
    const a = createAnim(), seen = new Set(); for (let t = 0; t < 12; t += 1 / 60) { updateAnim(a, 1 / 60); seen.add(a.blink > 0.5); } expect(seen.has(true)).toBe(true);
    const r = createAnim(); for (let t = 0; t < 12; t += 1 / 60) { updateAnim(r, 1 / 60, { reduced: true }); expect(r.blink).toBe(0); }
    const s = createAnim(); updateAnim(s, 0); updateAnim(s, -1); updateAnim(s, 50, { speed: 1.4, talking: true, level: 1 }); for (const v of [s.t, s.phase, s.w.walk]) expect(Number.isFinite(v)).toBe(true);
  });
  test('every pose, over many states and times, stays inside human-plausible joint limits and is finite', () => {
    for (const inp of [{}, { speed: 1.4 }, { speed: 2.5 }, { talking: true, level: 1 }, { speed: 1, talking: true, level: 0.7 }]) for (const g of [null, 'open', 'point', 'chest', 'wave']) {
      const a = createAnim({ seed: 5 }); if (g) playGesture(a, g);
      for (let t = 0; t < 4; t += 0.05) { updateAnim(a, 0.05, inp); const p = pose(a); for (const [k, [lo, hi], v] of [['shR.x', LIMITS.shoulderX, p.shR.x], ['shL.x', LIMITS.shoulderX, p.shL.x], ['shR.z', LIMITS.shoulderZ, p.shR.z], ['elR', LIMITS.elbowX, p.elR.x], ['elL', LIMITS.elbowX, p.elL.x], ['hipL', LIMITS.hipX, p.hipL.x], ['knL', LIMITS.kneeX, p.knL.x], ['knR', LIMITS.kneeX, p.knR.x], ['headX', LIMITS.headX, p.headX], ['headY', LIMITS.headY, p.headY], ['jaw', LIMITS.jaw, p.jaw]]) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(lo - 1e-9); expect(v).toBeLessThanOrEqual(hi + 1e-9); void k; } }
    }
  });
  test('reduced motion: idle sway and breathing are off', () => { const a = run(createAnim(), 3, {}); const p = pose(a, { reduced: true }); expect(p.hipsRotZ).toBe(0); expect(p.headY).toBe(0); });
});

describe('rig: bounds, budget, outfits, accessibility', () => {
  test.each([['f', 'abaya', true], ['f', 'coat', false], ['m', 'thobe', false], ['m', 'suit', false], ['guest', 'suit', false]])('%s / %s: plausible height, front is +Z, few draw calls, one shared material', (gender, outfit, scarf) => {
    const c = buildCharacter({ gender, outfit, scarf }), h = c.bounds.max.y - c.bounds.min.y;
    expect(h).toBeGreaterThan(gender === 'm' ? 1.65 : 1.5); expect(h).toBeLessThan(1.9); expect(c.bounds.min.y).toBeGreaterThan(-0.02); expect(c.bounds.min.y).toBeLessThan(0.05);
    expect(c.bounds.max.x - c.bounds.min.x).toBeLessThan(0.85); expect(c.bounds.max.z - c.bounds.min.z).toBeLessThan(0.7); expect(c.bounds.max.z).toBeGreaterThan(-c.bounds.min.z - 0.05);   // shoes / face toward +Z
    expect(c.meshes.length).toBeLessThanOrEqual(14); expect(c.drawCalls()).toBe(c.meshes.length); c.setFar(true); expect(c.drawCalls()).toBe(1); expect(c.far.visible).toBe(true); expect(c.meshes.every((m) => !m.visible)).toBe(true); c.setFar(false);
    expect(new Set(c.meshes.map((m) => m.material)).size).toBe(1); expect(c.label).toMatch(/character/);
    for (const j of ['hips', 'spine', 'chest', 'neck', 'head']) expect(c.joints[j]).toBeTruthy(); expect(Object.keys(c.joints.legs)).toEqual(['R', 'L']); expect(Object.keys(c.joints.arms)).toEqual(['R', 'L']);
  });
  test('low-detail build has fewer vertices than the full one; skin tones and outfits are real choices', () => {
    const hi = buildCharacter({ q: 1 }), lo = buildCharacter({ q: 0 }), v = (c) => c.meshes.reduce((a, m) => a + m.geometry.attributes.position.count, 0); expect(v(lo)).toBeLessThan(v(hi) * 0.6);
    expect(SKINS).toHaveLength(4); expect(OUTFITS.f).toEqual(['abaya', 'coat']); expect(OUTFITS.m).toEqual(['thobe', 'suit']);
    const col = (c) => Array.from(c.meshes.find((m) => m.name === 'headMesh').geometry.attributes.color.array.slice(0, 3)).join(); expect(col(buildCharacter({ skin: 'skinA' }))).not.toBe(col(buildCharacter({ skin: 'skinD' })));
  });
  test('setPose moves the joints (raised right arm, bent knee, closed eyes, open mouth) and leaves the bounds finite', () => {
    const c = buildCharacter({}), a = createAnim(); playGesture(a, 'wave'); run(a, 1, { talking: true, level: 1, speed: 1.4 }); c.setPose(pose(a));
    expect(c.joints.arms.R.shoulder.rotation.z).toBeLessThan(-0.5); expect(c.joints.mouth.scale.y).toBeGreaterThan(1.2); expect(c.joints.legs.L.hip.rotation.x).not.toBe(0);
    const box = new THREE.Box3().setFromObject(c.group); for (const v of [box.min.x, box.max.y, box.max.z]) expect(Number.isFinite(v)).toBe(true);
  });
  test('headscarf and ghutra change the head mesh; hair none / bun / long all build', () => {
    const n = (o) => buildCharacter(o).meshes.find((m) => m.name === 'headMesh').geometry.attributes.position.count;
    expect(n({ scarf: true })).toBeGreaterThan(n({ scarf: false, hair: 'none' })); expect(n({ gender: 'm', outfit: 'thobe' })).toBeGreaterThan(n({ gender: 'm', outfit: 'suit' }));
    for (const hair of ['bun', 'long', 'short', 'none']) expect(() => buildCharacter({ hair })).not.toThrow();
  });
});

describe('visitor avatar and the third-person camera', () => {
  test('three avatars (female, male, guest) with accessible bilingual labels; cycling visits all of them', () => {
    expect(Object.keys(AVATARS)).toEqual(['female', 'male', 'guest']); for (const a of Object.values(AVATARS)) { expect(a.label.en.length).toBeGreaterThan(5); expect(/[؀-ۿ]/.test(a.label.ar)).toBe(true); }
    expect(['female', 'male', 'guest'].map(nextAvatar)).toEqual(['male', 'guest', 'female']);
  });
  test('the avatar follows the walker (position, facing away from the camera) and is hidden unless asked to show', () => {
    const v = new VisitorAvatar({ tier: 'low' }); v.update(1 / 60, { pos: [3, -9], yaw: 0.5, speed: 0 }, { visible: false }); expect(v.group.visible).toBe(false);
    v.update(1 / 60, { pos: [3, -9], yaw: 0.5, speed: 1.4 }, { visible: true }); expect(v.group.visible).toBe(true); expect(v.group.position.x).toBe(3); expect(v.group.position.z).toBe(-9); expect(v.group.rotation.y).toBeCloseTo(0.5 + Math.PI, 9);
    expect(v.setKind('male')).toBe(true); expect(v.setKind('male')).toBe(false); expect(v.setKind('robot')).toBe(false); expect(v.group.userData.label).toMatch(/male/);
  });
  test('follow camera: behind the avatar, at its eye line + a little, and never inside a wall / bench / furniture', () => {
    const cols = buildColliders({ doorOpen: 1, vipOpen: 1 }), open = followCamera({ pos: [0, -9], yaw: 0, pitch: 0 }, cols);
    expect(open.z).toBeCloseTo(-9 + FOLLOW.dist, 6); expect(open.x).toBeCloseTo(0, 6); expect(open.y).toBeGreaterThan(1.5); expect(open.y).toBeLessThan(2.3);
    const wall = followCamera({ pos: [0, -34.5], yaw: Math.PI, pitch: 0 }, cols); expect(wall.dist).toBeLessThan(FOLLOW.dist); expect(isFree(wall.x, wall.z, 0.2, cols)).toBe(true);
    for (let i = 0; i < 400; i++) { const x = -20 + (i * 7.31) % 40, z = -35 + (i * 3.77) % 34; if (!isFree(x, z, 0.35, cols)) continue; const f = followCamera({ pos: [x, z], yaw: (i * 0.7) % 6.28, pitch: ((i % 9) - 4) * 0.1 }, cols); expect(isFree(f.x, f.z, 0.19, cols)).toBe(true); expect(Number.isFinite(f.y)).toBe(true); expect(f.dist).toBeGreaterThanOrEqual(0); expect(f.dist).toBeLessThanOrEqual(FOLLOW.dist + 1e-9); }
  });
});
