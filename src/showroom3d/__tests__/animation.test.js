import { Mover, createProductState, smoothstep, STATES } from '../products/animation';
import { PRODUCTS, stateDef } from '../products/catalog';
import { finishIds } from '../products/finishes';

describe('Mover (drawer / door / slider state machine)', () => {
  test('starts closed, opens over its duration with an eased value, and ends exactly open', () => {
    const m = new Mover({ duration: 1 }); expect(m.state).toBe(STATES.closed); expect(m.value).toBe(0);
    m.setTarget(1); expect(m.state).toBe(STATES.opening);
    m.update(0.5); expect(m.p).toBeCloseTo(0.5, 9); expect(m.value).toBeCloseTo(smoothstep(0.5), 9); expect(m.state).toBe(STATES.opening);
    m.update(0.6); expect(m.value).toBe(1); expect(m.state).toBe(STATES.open);
  });
  test('reversing mid-way is continuous: no jump in value, it turns round where it is', () => {
    const m = new Mover({ duration: 2 }); m.setTarget(1); m.update(0.7); const v = m.value; expect(m.state).toBe('opening');
    m.setTarget(0); expect(m.state).toBe('closing'); expect(m.value).toBe(v);
    m.update(0.4); expect(m.value).toBeLessThan(v); m.update(5); expect(m.state).toBe('closed'); expect(m.value).toBe(0);
  });
  test('safe for any dt: huge steps clamp, zero / negative / NaN do nothing', () => {
    const m = new Mover({ duration: 0.7 }); m.setTarget(1); expect(m.update(0)).toBe(false); expect(m.update(-1)).toBe(false); expect(m.update(NaN)).toBe(false);
    expect(m.update(1e6)).toBe(true); expect(m.value).toBe(1); expect(m.update(1)).toBe(false);
  });
  test('value is monotonic while opening and never leaves 0..1', () => {
    const m = new Mover({ duration: 1 }); m.setTarget(1); let last = -1; for (let i = 0; i < 200; i++) { m.update(0.01); expect(m.value).toBeGreaterThanOrEqual(last); expect(m.value).toBeLessThanOrEqual(1); last = m.value; }
  });
  test('toggle flips the target and reports it; snap jumps without animating', () => {
    const m = new Mover({}); expect(m.toggle()).toBe(true); expect(m.toggle()).toBe(false); m.snap(1); expect(m.state).toBe('open'); expect(m.moving).toBe(false);
  });
});

describe('ProductState (parts + LED + finish)', () => {
  const def = stateDef('kitchen', finishIds('kitchen'));
  test('every catalog part gets a mover of the right kind; unknown ids are rejected', () => {
    const s = createProductState(def); expect(s.order).toHaveLength(PRODUCTS.kitchen.parts.length);
    for (const p of PRODUCTS.kitchen.parts) { expect(s.has(p.id)).toBe(true); expect(s.kind(p.id)).toBe(p.kind); }
    expect(s.open('nope')).toBe(false); expect(s.toggle('nope')).toBe(false);
  });
  test('open / close / toggle go through opening and closing, and parts are independent', () => {
    const s = createProductState(def); const a = def.parts[0].id, b = def.parts[1].id;
    expect(s.toggle(a)).toBe(true); expect(s.part(a).state).toBe('opening'); expect(s.part(b).state).toBe('closed');
    s.update(5); expect(s.part(a).state).toBe('open'); expect(s.toggle(a)).toBe(false); s.update(5); expect(s.part(a).state).toBe('closed');
  });
  test('openAll / closeAll / anyOpen / allOpen', () => {
    const s = createProductState(def); expect(s.anyOpen()).toBe(false); s.openAll(); expect(s.anyOpen()).toBe(true); s.update(5); expect(s.allOpen()).toBe(true); s.closeAll(); s.update(5); expect(s.anyOpen()).toBe(false);
  });
  test('LED: on by default; a part LED only shines when the switch is on AND the part is open; accent LEDs follow the switch', () => {
    const s = createProductState(def); const id = def.parts[0].id; expect(s.ledOn).toBe(true); expect(s.ledLevel(id)).toBe(0); expect(s.accentLevel()).toBe(1);
    s.open(id); s.update(5); expect(s.ledLevel(id)).toBe(1);
    s.setLed(false); s.update(5); expect(s.ledLevel(id)).toBe(0); expect(s.accentLevel()).toBe(0); expect(s.ledOn).toBe(false);
    expect(s.toggleLed()).toBe(true); s.update(0.2); expect(s.accentLevel()).toBeGreaterThan(0); expect(s.accentLevel()).toBeLessThan(1);   // fades, does not pop
  });
  test('reduced motion snaps: no intermediate states', () => {
    const s = createProductState(def, { reduced: true }); const id = def.parts[0].id; s.open(id); expect(s.part(id).state).toBe('open'); s.close(id); expect(s.part(id).state).toBe('closed'); s.setLed(false); expect(s.accentLevel()).toBe(0);
    s.setReduced(false); s.open(id); expect(s.part(id).state).toBe('opening');
  });
  test('finish: only known ids are accepted; the snapshot is plain data', () => {
    const s = createProductState(def); expect(s.setFinish('walnut-dark-stone')).toBe(true); expect(s.finishId).toBe('walnut-dark-stone'); expect(s.setFinish('chrome-unicorn')).toBe(false); expect(s.finishId).toBe('walnut-dark-stone');
    const snap = s.snapshot(); expect(JSON.parse(JSON.stringify(snap))).toEqual(snap); expect(snap.led).toBe(true); expect(Object.keys(snap.parts)).toHaveLength(def.parts.length);
  });
  test('update() reports whether anything changed (so the scene only re-poses when needed)', () => {
    const s = createProductState(def); expect(s.update(0.1)).toBe(false); s.open(def.parts[0].id); expect(s.update(0.1)).toBe(true);
  });
  test('door kinds animate slower than drawers (hinged doors take longer than slides)', () => {
    const s = createProductState(stateDef('wardrobe', finishIds('wardrobe'))); expect(s.part('w-slide-1').duration).toBeGreaterThan(s.part('w-drawer-1').duration);
  });
});
