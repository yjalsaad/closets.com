import { bloomBoxes, bloomGraph, bloomZones, BLOOM_STOPS, ARRIVE, F2, BLOOM_Z0, LIFT_G, LIFT_STAND, liftBoxes, REVEAL, WALL_VIEW, TABLE, SCREEN, PODS, toWorld, toLocal, FLOORS } from '../scenes/bloom/layout';
import { withBloomLift, seatList, sofaList, facing, OFFICE_LIST, WING } from '../scenes/bloom/layout';
import { OFFICES, officeOptions, MAX_OPTIONS, OPTIONS_SOON } from '../bloom/offices';
import { isFree, segmentClear, PLAYER, buildColliders } from '../navigation/colliders';
import { buildGraph, shortestPath } from '../navigation/navgraph';

const R = PLAYER.radius, C = bloomBoxes();
const free = (p, r, c) => isFree(p[0], p[1], r, c);
describe('Floor 2 (Bloom Meeting) layout', () => {
  test('the arrival point and every stop are walkable', () => {
    expect(free(ARRIVE, R, C)).toBe(true);
    for (const s of BLOOM_STOPS) expect({ id: s.id, free: free(s.stand, R, C) }).toEqual({ id: s.id, free: true });
  });
  test('every graph node is free and every edge is a clear straight walk', () => {
    const g = bloomGraph();
    for (const [k, p] of Object.entries(g.nodes)) expect({ k, free: free(p, R, C) }).toEqual({ k, free: true });
    for (const [a, b] of g.edges) expect({ a, b, clear: segmentClear(g.nodes[a], g.nodes[b], R, C) }).toEqual({ a, b, clear: true });
  });
  test('every stop is reachable from the lift cab through the graph', () => {
    const g = bloomGraph();
    for (const s of g.stops) expect(shortestPath(g, 'cab', 'stand-' + s.id)).not.toBeNull();
  });
  test('zones lie on Floor 2 (or at the hall lift) and the stops sit inside their zone', () => {
    const Z = bloomZones().filter((z) => z.id !== 'lift-g');
    for (const s of BLOOM_STOPS.filter((q) => q.id !== 'bloom-lobby')) { const z = Z.find((q) => q.id === s.id); expect(z).toBeTruthy(); expect(s.stand[0] >= z.minX && s.stand[0] <= z.maxX && s.stand[1] >= z.minZ && s.stand[1] <= z.maxZ).toBe(true); }
    for (const z of Z) expect(z.minZ).toBeGreaterThan(BLOOM_Z0 - 13);
  });
  test('the reveal poses are free; the reveal and wall poses are inside the floor (the wall pose hovers over the table end, a flying focus pose)', () => {
    for (const p of [REVEAL.from.p, REVEAL.to.p]) expect(free([p[0], p[2]], 0.2, C)).toBe(true);
    for (const p of [REVEAL.from.p, REVEAL.to.p, WALL_VIEW.pos]) { expect(p[0]).toBeGreaterThan(F2.x0); expect(p[0]).toBeLessThan(F2.x1); }
  });
  test('the hall lift: its tower is solid, its stand point is free in the real hall colliders', () => {
    const H = buildColliders({ doorOpen: 1, vipOpen: 1 }).concat(liftBoxes());
    expect(free(LIFT_STAND, R, H)).toBe(true);
    expect(free([LIFT_G.x, LIFT_G.z], R, H)).toBe(false);
  });
  test('the hall graph gets a lift stop whose edge is a clear walk in the real hall colliders', () => {
    const g = withBloomLift(buildGraph()), H = buildColliders({ doorOpen: 1, vipOpen: 1 });
    expect(g.stops.find((q) => q.id === 'lift').stand).toEqual(LIFT_STAND);
    for (const [a, b] of g.edges.filter((e) => e.includes('stand-lift'))) expect(segmentClear(g.nodes[a], g.nodes[b], R, H)).toBe(true);
    expect(shortestPath(g, 'street', 'stand-lift')).not.toBeNull();
  });
  test('the lift tower is a collider only once its chunk is loaded (no solid-but-invisible block)', () => {
    const on = buildColliders({ lift: true }), off = buildColliders({ lift: false }), def = buildColliders();
    expect(on.some((c) => c.id === 'lift-tower')).toBe(true); expect(off.some((c) => c.id === 'lift-tower')).toBe(false); expect(def.some((c) => c.id === 'lift-tower')).toBe(true);
  });
  test('the table and the pods keep a walkable aisle between them and the walls', () => {
    expect(free(toWorld(TABLE.x, -9.5), R, C)).toBe(true); expect(free(toWorld(TABLE.x, 0.9), R, C)).toBe(true);
    expect(PODS).toHaveLength(6);
  });
  test('floors: ground then level 2; coordinate helpers round-trip', () => {
    expect(FLOORS.map((f) => f.id)).toEqual(['ground', 'l2']); expect(toLocal(...toWorld(3, 4))).toEqual([3, 4]); expect(SCREEN.w / SCREEN.h).toBeCloseTo(16 / 9, 2);
  });
});

describe('chairs: every seat faces its table / desk (backs outward), nothing is mirrored', () => {
  const dir = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  test('each chair\'s forward vector (+x rotated by ry: [cos ry, -sin ry]) points at its table or desk centre', () => {
    for (const c of seatList()) { const f = facing(c.ry), d = dir([c.x, c.z], c.target); expect({ id: c.id, dot: Math.round((f[0] * d[0] + f[1] * d[1]) * 1000) / 1000 }).toEqual({ id: c.id, dot: 1 }); }
  });
  test('and every sofa faces the lounge table', () => { for (const c of sofaList()) { const f = facing(c.ry), d = dir([c.x, c.z], c.target); expect(f[0] * d[0] + f[1] * d[1]).toBeGreaterThan(0.999); } });
  test('the boardroom has 13 leadership chairs (6 a side + the head), the pods 24 task chairs, the offices 5 executive + 10 guest chairs; the two boardroom rows face each other', () => {
    const L = seatList(); const by = (k) => L.filter((c) => c.kind === k);
    expect([by('leader').length, by('task').length, by('exec').length, by('guest').length]).toEqual([13, 24, 5, 10]);
    const n = L.filter((c) => c.id.startsWith('board-n')), so = L.filter((c) => c.id.startsWith('board-s')); expect(n.every((c) => facing(c.ry)[1] > 0.99)).toBe(true); expect(so.every((c) => facing(c.ry)[1] < -0.99)).toBe(true);
  });
  test('an executive sits behind the desk facing the door (north, -z); the guests sit in front of it facing the desk', () => {
    for (const o of OFFICE_LIST) { const L = seatList().filter((c) => c.id.startsWith(o.id + '-')); const ex = L.find((c) => c.kind === 'exec'); expect(facing(ex.ry)[1]).toBeLessThan(-0.99); for (const g of L.filter((c) => c.kind === 'guest')) { expect(g.z).toBeLessThan(ex.z); expect(facing(g.ry)[1]).toBeGreaterThan(0.99); } }
  });
});

describe('executive offices', () => {
  test('five offices with the owner\'s titles in both languages; no person names; the options array exists and is empty by default', () => {
    expect(OFFICES.map((o) => o.title.en)).toEqual(['IT Head', 'Operations Head', 'Managing Partner', 'Managing Director', 'Partner Strategy']);
    expect(OFFICES.map((o) => o.title.ar)).toEqual(['رئيس تقنية المعلومات', 'رئيس العمليات', 'الشريك المدير', 'المدير العام', 'شريك الاستراتيجية']);
    for (const o of OFFICES) { expect(o.options).toEqual([]); expect(officeOptions(o)).toEqual([]); } expect(OPTIONS_SOON.en).toBe('Options coming soon'); expect(/[؀-ۿ]/.test(OPTIONS_SOON.ar)).toBe(true);
  });
  test('officeOptions keeps well-formed bilingual entries (max 6) and drops the rest', () => {
    const o = { options: [{ id: 'a', title: { en: 'A', ar: 'أ' } }, { title: { en: 'only en' } }, null, { id: 'b', title: { en: 'B', ar: 'ب' }, note: { en: 'n', ar: 'م' } }, ...Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, title: { en: 'X', ar: 'س' } }))] };
    const r = officeOptions(o); expect(r).toHaveLength(MAX_OPTIONS); expect(r[0]).toMatchObject({ id: 'a', note: null }); expect(r[1].note).toEqual({ en: 'n', ar: 'م' });
  });
  test('each office: the door is passable, the glass front and the partitions are solid, the desk is solid, the stand point is free and reachable from the lift', () => {
    const g = bloomGraph(), Z = BLOOM_Z0;
    for (const o of OFFICE_LIST) {
      expect(free([o.cx, o.z0 + Z], R, C)).toBe(true);                        // through the door
      expect(free([o.x0 + 0.9, o.z0 + Z], 0.2, C)).toBe(false);                // the glass front
      expect(free([o.cx, o.z1 - 2.9 + Z], 0.2, C)).toBe(false);                // the desk
      const stop = g.stops.find((s) => s.id === 'bloom-office-' + o.id); expect(stop).toBeTruthy(); expect(free(stop.stand, R, C)).toBe(true); expect(shortestPath(g, 'cab', 'stand-' + stop.id)).not.toBeNull();
    }
    for (let i = 1; i < 5; i++) expect(free([OFFICE_LIST[i].x0, OFFICE_LIST[i].z0 + 3 + Z], 0.2, C)).toBe(false);   // the partitions
    expect(WING.door[1] - WING.door[0]).toBeGreaterThanOrEqual(1.5); expect(free([(WING.door[0] + WING.door[1]) / 2, 12.2 + Z], R, C)).toBe(true); expect(free([0, 12.2 + Z], 0.2, C)).toBe(false);   // the wing doorway vs the wall
  });
});

