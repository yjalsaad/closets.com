import { buildGraph, STAND_X, deptStops, routeTo, shortestPath, polylineLength, pointAlong } from '../navigation/navgraph';
import { PLAYER, buildColliders, isFree, segmentClear, moveCircle } from '../navigation/colliders';
import { interactionZones, zoneAt } from '../navigation/interaction';
import { layoutBays } from '../scenes/main-hall/departments';
import { HANDOVER } from '../cinematic/timeline';

const R = PLAYER.radius, open = buildColliders({ doorOpen: 1 }), graph = buildGraph();

describe('navigation graph (department quick-nav)', () => {
  test('there is one stop per department, all inside the hall, facing the bay wall', () => {
    const stops = deptStops(); expect(stops).toHaveLength(8);
    for (const s of stops) { expect(Math.abs(s.stand[0])).toBeCloseTo(STAND_X, 6); expect(Math.abs(s.look[0])).toBe(22); expect(s.look[2]).toBe(s.stand[1]); }
  });
  test('every node is a free standing point and every edge is a collision-free walk', () => {
    for (const [k, p] of Object.entries(graph.nodes)) expect([k, isFree(p[0], p[1], R, open)]).toEqual([k, true]);
    for (const [a, b] of graph.edges) expect([a, b, segmentClear(graph.nodes[a], graph.nodes[b], R, open)]).toEqual([a, b, true]);
  });
  test('every bay is reachable from the street, from the spawn and from every other bay', () => {
    for (const s of graph.stops) {
      expect(shortestPath(graph, 'street', 'stand-' + s.id)).not.toBeNull();
      expect(shortestPath(graph, 'lobby', 'stand-' + s.id)).not.toBeNull();
      for (const o of graph.stops) expect(shortestPath(graph, 'stand-' + o.id, 'stand-' + s.id)).not.toBeNull();
    }
  });
  test('from a 2 m grid of every standable point (hall, forecourt, path) a clear route to every bay exists (no straight-line fallback)', () => {
    let tested = 0;
    const pts = []; for (let x = -21; x <= 21; x += 3) for (let z = -35; z <= -1; z += 2.5) pts.push([x, z]);
    for (let x = -24; x <= 24; x += 4) for (let z = 1; z <= 22; z += 3) pts.push([x, z]);
    for (let z = 23; z <= 35; z += 3) pts.push([0, z]);
    for (const p of pts) {
      if (!isFree(p[0], p[1], R, open)) continue;
      for (const s of graph.stops) {
        const r = routeTo(graph, p, s.id, open); tested++;
        if (!(r && !r.direct)) throw new Error('no route from ' + p + ' to ' + s.id);
        for (let i = 1; i < r.points.length; i++) expect(segmentClear(r.points[i - 1], r.points[i], R, open)).toBe(true);
        expect(r.points[r.points.length - 1]).toEqual(s.stand);
      }
    }
    expect(tested).toBeGreaterThan(1000);
  });
  test('a visitor can physically WALK every route with the collision model (waypoint following ends within 0.3 m of the stand)', () => {
    for (const s of graph.stops) {
      const r = routeTo(graph, [HANDOVER.p[0], HANDOVER.p[2]], s.id, open); let p = r.points[0];
      for (const w of r.points.slice(1)) { for (let i = 0; i < 400 && Math.hypot(w[0] - p[0], w[1] - p[1]) > 0.05; i++) { const d = Math.hypot(w[0] - p[0], w[1] - p[1]), st = Math.min(d, 0.1); p = moveCircle(p, ((w[0] - p[0]) / d) * st, ((w[1] - p[1]) / d) * st, R, open); } }
      expect(Math.hypot(p[0] - s.stand[0], p[1] - s.stand[1])).toBeLessThan(0.3);
    }
  });
  test('a route from outside goes through the doorway; with closed doors the glide would have no way in (graph is for the open state)', () => {
    const r = routeTo(graph, [0, 20], 'kitchens', open); const zs = r.points.map((p) => p[1]);
    expect(Math.min(...zs)).toBeLessThan(-7); expect(r.points.some((p) => Math.abs(p[0]) < 0.01 && p[1] > -0.5 && p[1] < 0.5)).toBe(true);
  });
  test('route benches: left bays use the left lane, right bays the right lane (no crossing the benches)', () => {
    for (const s of graph.stops.filter((q) => q.id !== 'vip')) { const r = routeTo(graph, [0, -3.5], s.id, open); for (const p of r.points) expect(Math.abs(p[0]) > 3.2 + R || p[1] > -3.6).toBe(true); }
  });
  test('polyline helpers', () => {
    const pts = [[0, 0], [3, 0], [3, 4]]; expect(polylineLength(pts)).toBe(7);
    expect(pointAlong(pts, 0)).toEqual([0, 0]); expect(pointAlong(pts, 3 / 7)).toEqual([3, 0]); expect(pointAlong(pts, 1)).toEqual([3, 4]);
    const m = pointAlong(pts, 5 / 7); expect(m[0]).toBeCloseTo(3, 9); expect(m[1]).toBeCloseTo(2, 9);
  });
});

describe('interaction zones', () => {
  const zones = interactionZones();
  test('every stand point is inside its own department zone and no other', () => {
    for (const s of graph.stops.filter((q) => q.id !== 'vip')) { const z = zoneAt(zones, s.stand[0], s.stand[1]); expect(z && z.id).toBe(s.id); }
  });
  test('the spawn, the lobby and the nave centre are in no zone', () => {
    for (const p of [[0, -9], [0, -3.5], [0, -20], [8, -20]]) expect(zoneAt(zones, p[0], p[1])).toBeNull();
  });
  test('zones tile the bay floor and follow the layout', () => {
    expect(zones).toHaveLength(8); const bays = layoutBays();
    zones.forEach((z, i) => { expect(z.id).toBe(bays[i].id); expect(z.maxZ - z.minZ).toBeCloseTo(bays[i].width, 6); });
  });
});
