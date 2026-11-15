import { bloomBoxes, bloomGraph, bloomZones, BLOOM_STOPS, ARRIVE, F2, BLOOM_Z0, LIFT_G, LIFT_STAND, liftBoxes, REVEAL, WALL_VIEW, TABLE, SCREEN, PODS, toWorld, toLocal, FLOORS } from '../scenes/bloom/layout';
import { withBloomLift } from '../scenes/bloom/layout';
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
  test('the table and the pods keep a walkable aisle between them and the walls', () => {
    expect(free(toWorld(TABLE.x, -9.5), R, C)).toBe(true); expect(free(toWorld(TABLE.x, 0.9), R, C)).toBe(true);
    expect(PODS).toHaveLength(6);
  });
  test('floors: ground then level 2; coordinate helpers round-trip', () => {
    expect(FLOORS.map((f) => f.id)).toEqual(['ground', 'l2']); expect(toLocal(...toWorld(3, 4))).toEqual([3, 4]); expect(SCREEN.w / SCREEN.h).toBeCloseTo(16 / 9, 2);
  });
});
