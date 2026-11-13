/* Navigation graph for the department quick-nav glide. Pure JS (unit-tested).
 * Nodes are collision-free standing points; edges are straight collision-free walks. A route from anywhere the visitor can stand
 * is: nearest visible node -> Dijkstra over the graph -> the bay "stand" point at the bay entrance, looking into the alcove.
 * The glide therefore never cuts through a bench, planter, wall or a closed door. */
import { HALL } from '../3d/dimensions';
import { layoutBays } from '../scenes/main-hall/departments';
import { PLAYER, buildColliders, segmentClear } from './colliders';
import { VIP } from '../scenes/vip/layout';

const SPINE_X = 8;                           // walking lanes between the benches (|x| <= 3.2) and the bays (|x| >= 16)
export const STAND_X = 12.5;                 // 3.5 m in front of the bay's floor inlay edge: far enough to see the whole alcove, sign and floor zone
const R = PLAYER.radius;

/** where the visitor stands (and what they look at) for each department */
export function deptStops(bays = layoutBays()) {
  return bays.map((b) => {
    const s = b.side === 'left' ? -1 : 1;
    return { id: b.id, index: b.index, side: b.side, stand: [s * STAND_X, b.z], look: [s * HALL.halfWidth, 2.6, b.z], bay: b };
  });
}

export function buildGraph(bays = layoutBays()) {
  const nodes = {
    street: [0, 30], gate: [0, 20], forecourt: [0, 8], doorOut: [0, 2], door: [0, 0.07], lobby: [0, -3.5],
    courtL: [-12, 20], courtR: [12, 20], frontL: [-12, 2], frontR: [12, 2],            // free lanes round the reflecting basins
    sideL1: [-23, 1.5], sideL2: [-23, 10], sideL3: [-23, 20], sideR1: [23, 1.5], sideR2: [23, 10], sideR3: [23, 20],   // lanes between the olive planters and the hedge
    spineL: [-SPINE_X, -3.5], spineR: [SPINE_X, -3.5],
  };
  const edges = [['street', 'gate'], ['gate', 'forecourt'], ['gate', 'courtL'], ['gate', 'courtR'], ['forecourt', 'doorOut'], ['doorOut', 'door'],
    ['doorOut', 'frontL'], ['doorOut', 'frontR'], ['frontL', 'sideL1'], ['sideL1', 'sideL2'], ['sideL2', 'sideL3'], ['sideL3', 'courtL'],
    ['frontR', 'sideR1'], ['sideR1', 'sideR2'], ['sideR2', 'sideR3'], ['sideR3', 'courtR'], ['door', 'lobby'], ['lobby', 'spineL'], ['lobby', 'spineR']];
  const stops = deptStops(bays); const lastOf = { left: 'spineL', right: 'spineR' };
  for (const st of stops) {
    const s = st.side === 'left' ? -1 : 1, lane = 'lane-' + st.id;
    nodes[lane] = [s * SPINE_X, st.stand[1]]; nodes['stand-' + st.id] = st.stand;
    edges.push([lastOf[st.side], lane], [lane, 'stand-' + st.id]); lastOf[st.side] = lane;
  }
  // the VIP meeting room (9th stop): a lane in front of its glass door, reached from both sides of the nave round the bench; the stand point is inside, facing the screen
  nodes.vipL = [-SPINE_X, VIP.approach[1]]; nodes.vipR = [SPINE_X, VIP.approach[1]]; nodes.vipDoor = [...VIP.approach]; nodes['stand-vip'] = [...VIP.stand];
  edges.push(['lane-walkin', 'vipL'], ['lane-studio', 'vipR'], ['vipL', 'vipDoor'], ['vipR', 'vipDoor'], ['vipDoor', 'stand-vip']);
  stops.push({ id: 'vip', index: 9, side: 'center', stand: [...VIP.stand], look: [...VIP.look], bay: null });
  return { nodes, edges, stops };
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** shortest node path (Dijkstra; the graph is tiny) */
export function shortestPath(graph, from, to) {
  const adj = {}; for (const [a, b] of graph.edges) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
  const d = { [from]: 0 }, prev = {}, todo = new Set(Object.keys(graph.nodes));
  while (todo.size) {
    let u = null; for (const k of todo) if (d[k] !== undefined && (u === null || d[k] < d[u])) u = k;
    if (u === null) return null; todo.delete(u); if (u === to) break;
    for (const v of adj[u] || []) { const nd = d[u] + dist(graph.nodes[u], graph.nodes[v]); if (d[v] === undefined || nd < d[v]) { d[v] = nd; prev[v] = u; } }
  }
  if (d[to] === undefined) return null;
  const out = [to]; while (out[0] !== from) out.unshift(prev[out[0]]);
  return out;
}

/**
 * Polyline (array of [x, z]) from `pos` to a department's stand point, plus its facing. Falls back to a straight line when the visitor
 * is somewhere no node can see (should not happen; covered by tests).
 */
export function routeTo(graph, pos, deptId, colliders = buildColliders({ doorOpen: 1 })) {
  const stop = graph.stops.find((s) => s.id === deptId); if (!stop) return null;
  const goal = 'stand-' + deptId;
  if (segmentClear(pos, stop.stand, R, colliders)) return { points: [pos, stop.stand], stop };       // already in view of the bay
  const ranked = Object.keys(graph.nodes).map((k) => ({ k, d: dist(pos, graph.nodes[k]) })).sort((a, b) => a.d - b.d);
  let best = null;
  for (const { k, d } of ranked) {
    if (!segmentClear(pos, graph.nodes[k], R, colliders)) continue;
    const p = shortestPath(graph, k, goal); if (!p) continue;
    let len = d; for (let i = 1; i < p.length; i++) len += dist(graph.nodes[p[i - 1]], graph.nodes[p[i]]);
    if (!best || len < best.len) best = { len, p, k };
  }
  if (!best) return { points: [pos, stop.stand], stop, direct: true };
  return { points: [pos, ...best.p.map((k) => graph.nodes[k])], stop };
}

export function polylineLength(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; }
/** point at arc-length fraction k (0..1) along a polyline */
export function pointAlong(pts, k) {
  const total = polylineLength(pts); if (total === 0) return [pts[0][0], pts[0][1]];
  let want = Math.min(1, Math.max(0, k)) * total;
  for (let i = 1; i < pts.length; i++) { const seg = dist(pts[i - 1], pts[i]); if (want <= seg || i === pts.length - 1) { const f = seg ? Math.min(1, want / seg) : 1; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; } want -= seg; }
  return [...pts[pts.length - 1]];
}
