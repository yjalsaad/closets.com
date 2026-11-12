import { createRegistry } from '../products/registry';

const node = (name, parent = null) => ({ name, parent, userData: {} });
describe('pickable registry', () => {
  const build = () => {
    const r = createRegistry(), root = node('root'), g1 = node('g1', root), m1 = node('m1', g1), m1b = node('m1b', g1), g2 = node('g2', root), m2 = node('m2', g2), stray = node('stray', root);
    r.register({ id: 'a', product: 'kitchen', kind: 'drawer', hit: [m1, m1b] }); r.register({ id: 'b', product: 'kitchen', kind: 'door', hit: [m2] }); r.register({ id: 'c', product: 'wardrobe', kind: 'slider', hit: [node('m3', root)] });
    return { r, m1, m1b, m2, stray, g1 };
  };
  test('register tags hit meshes with their part id; duplicates and bad input throw', () => {
    const { r, m1 } = build(); expect(m1.userData.pickId).toBe('a'); expect(r.ids()).toEqual(['a', 'b', 'c']); expect(() => r.register({ id: 'a', product: 'x' })).toThrow(); expect(() => r.register({})).toThrow();
  });
  test('resolve climbs parents; unknown objects resolve to null', () => {
    const { r, m1b, stray, g1 } = build(); expect(r.resolve(m1b)).toBe('a'); expect(r.resolve(stray)).toBeNull(); expect(r.resolve(null)).toBeNull();
    const child = node('child', g1); child.userData.pickId = 'ghost'; expect(r.resolve(child)).toBeNull();
  });
  test('pick returns the nearest registered hit within reach and can filter by product', () => {
    const { r, m1, m2, stray } = build();
    const hits = [{ object: stray, distance: 1 }, { object: m1, distance: 2 }, { object: m2, distance: 3 }];
    expect(r.pick(hits)).toEqual({ id: 'a', distance: 2 }); expect(r.pick(hits, 1.5)).toBeNull(); expect(r.pick(hits, 10, 'wardrobe')).toBeNull(); expect(r.pick([], 5)).toBeNull();
    expect(r.pick([{ object: m2, distance: 3 }], 10, 'kitchen')).toEqual({ id: 'b', distance: 3 });
  });
  test('hitMeshes: per product and overall', () => { const { r } = build(); expect(r.hitMeshes('kitchen')).toHaveLength(3); expect(r.hitMeshes()).toHaveLength(4); expect(r.hitMeshes('door')).toEqual([]); });
  test('hover and focus only accept known ids and report changes', () => {
    const { r } = build(); expect(r.setHover('a')).toBe(true); expect(r.setHover('a')).toBe(false); expect(r.hover).toBe('a'); expect(r.setHover('zzz')).toBe(true); expect(r.hover).toBeNull(); expect(r.setFocus('b')).toBe(true); expect(r.focus).toBe('b');
  });
  test('keyboard traversal wraps inside one product', () => {
    const { r } = build(); expect(r.step('kitchen', null, 1)).toBe('a'); expect(r.step('kitchen', null, -1)).toBe('b'); expect(r.step('kitchen', 'a', 1)).toBe('b'); expect(r.step('kitchen', 'b', 1)).toBe('a'); expect(r.step('kitchen', 'a', -1)).toBe('b'); expect(r.step('door', null, 1)).toBeNull();
  });
});
