/* Geometry facts of FLOOR 2 ("Bloom Meeting") and of the glass lift in the main hall. PURE data (collision, navigation, the lazy scene module and the tests all read it).
 *
 * Floor 2 is built in its own region of the world (z = 150 + local z) instead of physically above the hall: the hall, the forecourt and the exterior are hidden while a visitor is up
 * there (engine.setFloor), so Floor 2 costs nothing at ground level and the hall's colliders / lights are untouched. Local frame: x east, z south, y up; the floor is 36 x 24 m.
 *
 *   north  z=-12   full-height window wall: the Bahrain night skyline
 *   boardroom  x -2..18, z -12..2  glass partitions west + south, the video wall on the east wall, the long table, leadership chairs
 *   operations bay  x -18..-2, z -12..2  the ops wall on the west wall, six pods of desks
 *   lobby  z 2..12  the glass lift (arrival, west), the Leads wall (south wall), Haneen AI desk, the lounge corner (east, facing the east windows) */
import { HALL } from '../../3d/dimensions';
import { OFFICES } from '../../bloom/offices';

export const BLOOM_Z0 = 150;                         // world z of local z = 0
export const toWorld = (x, z) => [x, z + BLOOM_Z0];
export const toLocal = (x, z) => [x, z - BLOOM_Z0];
export const F2 = { x0: -18, x1: 18, z0: -12, z1: 12, height: 5.0, wallT: 0.2 };
export const FLOORS = Object.freeze([
  { id: 'ground', level: 1, en: 'Ground floor', ar: 'الطابق الأرضي', short: { en: 'G', ar: 'أ' } },
  { id: 'l2', level: 2, en: 'Floor 2 · Bloom Meeting', ar: 'الطابق الثاني · اجتماع بلوم', short: { en: '2', ar: '2' } },
]);
export const BLOOM_ID = 'bloom';
export const BLOOM_DEPT = { id: BLOOM_ID, en: 'Bloom Meeting', ar: 'اجتماع بلوم', floor: 'l2' };

/** the glass lift in the main hall: a lit glass tower on the back-left of the nave (clear of the bays, the VIP room and the walking lanes) */
export const LIFT_G = { x: -13, z: -34.5, w: 2.4, d: 2.4, height: HALL.height - 0.4, doorZ: -33.3 };
export const LIFT_STAND = [LIFT_G.x, -32.5];         // where the visitor stands to call the lift (and the quick-nav stop)
export const LIFT_LOOK = [LIFT_G.x, 1.4, LIFT_G.z];
/** the cab on Floor 2 (arrival): open to the east, onto the lobby */
export const CAB_L2 = { x0: -17.6, x1: -15.3, z0: 9.2, z1: 11.6 };
export const ARRIVE = toWorld(-16.5, 10.4);          // world x, z of the arrival point inside the cab
export const ARRIVE_YAW = -Math.PI / 2;               // looking east (+x); walker yaw 0 = -z, so +x = -PI/2

export const TABLE = { x: 8, z: -5, w: 7.4, d: 1.7, h: 0.76 };
export const SCREEN = { x: 17.88, z: -5, y: 2.45, w: 7.6, h: 4.275 };   // 16:9 video wall on the east wall, faces -x
export const OPS_WALL = { x: -17.88, z: -5.5, y: 2.1, w: 9.0, h: 3.0 };  // faces +x
export const LEADS_WALL = { x: -4, z: 11.88, y: 2.1, w: 12.0, h: 3.2 };   // the Lead Roadmap wall
export const ROADMAP_FLOOR = { x: -4, z: 9.9, w: 10, d: 1.25 };           // the roadmap path inlaid in the lobby floor in front of the wall  // faces -z (into the lobby)
export const HANEEN_DESK = { x: -9.6, z: 7.2 };                           // the Haneen AI desk + hologram in the lobby
export const LOUNGE = { x: 12.5, z: 8.6 };
/** the executive wing: a corridor (z 12.4..16.5) behind a doorway in the lobby's south wall, and five glass-fronted offices (z 16.5..24) */
export const WING = { z0: 12, z1: 24, frontZ: 16.5, door: [3.4, 5.2], officeW: 7.2, doorW: 1.1 };
export const officeRect = (i) => { const x0 = F2.x0 + i * WING.officeW, x1 = x0 + WING.officeW; return { x0, x1, cx: (x0 + x1) / 2, z0: WING.frontZ, z1: WING.z1 }; };
export const OFFICE_LIST = OFFICES.map((o, i) => ({ ...o, ...officeRect(i), index: i }));
export const PODS = [-12.5, -7.5].flatMap((x) => [-9.5, -5, -0.5].map((z) => ({ x, z, w: 3.0, d: 1.4 })));

/** named quick-nav / camera stops on Floor 2 (world frame; stand = where the visitor stands, look = [x, y, z] the camera aims at) */
const S = (id, en, ar, sx, sz, lx, ly, lz) => ({ id, en, ar, stand: toWorld(sx, sz), look: [lx, ly, lz + BLOOM_Z0] });
export const BLOOM_STOPS = [
  S('bloom-board', 'Boardroom', 'قاعة مجلس الإدارة', 4.4, -0.6, 14, 2.3, -5),
  S('bloom-ops', 'Staff operations', 'عمليات الموظفين', -10, -7.25, -17.9, 2.1, -5.5),
  S('bloom-leads', 'Leads wall', 'جدار العملاء المحتملين', -4, 5.8, -4, 2.0, 11.9),
  S('bloom-lounge', 'Lounge', 'ركن الاستراحة', 8.6, 6.6, 17.9, 1.8, 8.6),
  S('bloom-lobby', 'Lobby', 'الاستقبال', -3.0, 6.0, 11, 2.3, -4.6),
  ...OFFICE_LIST.map((o) => S('bloom-office-' + o.id, o.title.en, o.title.ar, o.cx, WING.frontZ + 1.8, o.cx, 1.8, o.z1)),
  S('bloom-haneen', 'Haneen AI', 'حنين AI', -7.2, 4.6, HANEEN_DESK.x, 1.4, HANEEN_DESK.z),
];
/** the camera's starting pose of the entrance reveal and its end pose (world) */
export const REVEAL = { from: { p: [-15.9, 1.62, 10.4 + BLOOM_Z0], l: [-6, 1.9, 8 + BLOOM_Z0] }, to: { p: [-3.0, 1.65, 6.0 + BLOOM_Z0], l: [11, 2.3, -4.6 + BLOOM_Z0] } };
/** the camera pose of the film wall (panel mode) and its fov */
export const WALL_VIEW = { pos: [6.4, 2.15, -5 + BLOOM_Z0], look: [SCREEN.x, SCREEN.y - 0.4, SCREEN.z + BLOOM_Z0], fov: 56 };

const box = (id, minX, maxX, minZ, maxZ) => ({ type: 'box', id, minX, maxX, minZ, maxZ });
const circle = (id, x, z, r) => ({ type: 'circle', id, x, z, r });
/** the plan-view obstacles of Floor 2 (WORLD frame). Walls are thick so a bad frame cannot tunnel. */
export function bloomBoxes() {
  const t = F2.wallT, Z = BLOOM_Z0, o = [], o2c = o;
  const b = (id, a, c, d, e) => o.push(box(id, a, c, d + Z, e + Z));
  b('f2-north', F2.x0 - 3, F2.x1 + 3, F2.z0 - 3, F2.z0);            // window wall (the glass is at z = -12)
  b('f2-south-a', F2.x0 - 3, WING.door[0], F2.z1, F2.z1 + 0.4); b('f2-south-b', WING.door[1], F2.x1 + 3, F2.z1, F2.z1 + 0.4);   // the lobby's south wall, with the doorway into the executive wing
  b('f2-wing-w', F2.x0 - 3, F2.x0, F2.z1, WING.z1 + 3); b('f2-wing-e', F2.x1, F2.x1 + 3, F2.z1, WING.z1 + 3); b('f2-wing-s', F2.x0 - 3, F2.x1 + 3, WING.z1, WING.z1 + 3);
  OFFICE_LIST.forEach((o, i) => {
    const h = WING.doorW / 2, dz = o.z1 - 2.9;
    b('f2-front-' + o.id + '-a', o.x0, o.cx - h, o.z0 - 0.06, o.z0 + 0.06); b('f2-front-' + o.id + '-b', o.cx + h, o.x1, o.z0 - 0.06, o.z0 + 0.06);
    if (i > 0) b('f2-part-' + i, o.x0 - 0.06, o.x0 + 0.06, o.z0, o.z1);
    b('f2-desk-' + o.id, o.cx - 1.15, o.cx + 1.15, dz - 0.5, dz + 0.5); b('f2-cred-' + o.id, o.cx - 1.4, o.cx + 1.4, o.z1 - 0.55, o.z1); b('f2-shelf-' + o.id, o.x0, o.x0 + 0.4, o.z0 + 2.2, o.z0 + 4.4);
    o2c.push(circle('f2-exec-' + o.id, o.cx, dz + 1.2 + Z, 0.38), circle('f2-guestw-' + o.id, o.cx - 0.85, dz - 1.35 + Z, 0.34), circle('f2-gueste-' + o.id, o.cx + 0.85, dz - 1.35 + Z, 0.34));
  });
  b('f2-west', F2.x0 - 3, F2.x0, F2.z0 - 3, F2.z1 + 3);
  b('f2-east', F2.x1, F2.x1 + 3, F2.z0 - 3, F2.z1 + 3);
  // the lift cab on Floor 2: three walls, open to the east
  b('f2-cab-back', CAB_L2.x0 - 0.2, CAB_L2.x0, CAB_L2.z0 - 0.1, CAB_L2.z1 + 0.1); b('f2-cab-n', CAB_L2.x0, CAB_L2.x1, CAB_L2.z0 - 0.1, CAB_L2.z0); b('f2-cab-s', CAB_L2.x0, CAB_L2.x1, CAB_L2.z1, CAB_L2.z1 + 0.1);
  // boardroom glass: west wall x = -2 with a doorway z -3.6..-1.8; south wall z = 2 with a door x 1.0..2.8
  b('f2-glass-w1', -2.06, -1.94, F2.z0, -3.6); b('f2-glass-w2', -2.06, -1.94, -1.8, 2.06);
  b('f2-glass-s1', -2.06, 1.0, 1.94, 2.06); b('f2-glass-s2', 2.8, F2.x1, 1.94, 2.06);
  // the long table with its chairs (one solid block with margin), the video wall plinth, the credenza under the window
  b('f2-table', TABLE.x - TABLE.w / 2 - 1.3, TABLE.x + TABLE.w / 2 + 0.6, TABLE.z - TABLE.d / 2 - 1.15, TABLE.z + TABLE.d / 2 + 1.15);
  b('f2-screen', SCREEN.x - 0.3, F2.x1, SCREEN.z - SCREEN.w / 2 - 0.3, SCREEN.z + SCREEN.w / 2 + 0.3);
  // staff operations: the ops wall plinth and the six pods (desk + chairs)
  b('f2-ops-wall', F2.x0, F2.x0 + 0.4, OPS_WALL.z - OPS_WALL.w / 2, OPS_WALL.z + OPS_WALL.w / 2);
  PODS.forEach((p, i) => b('f2-pod' + i, p.x - p.w / 2 - 0.2, p.x + p.w / 2 + 0.2, p.z - p.d / 2 - 0.9, p.z + p.d / 2 + 0.9));
  // lobby: the Leads wall (against the south wall), the Haneen desk, the lounge (two sofas + table), plants
  b('f2-leads', LEADS_WALL.x - LEADS_WALL.w / 2, LEADS_WALL.x + LEADS_WALL.w / 2, LEADS_WALL.z - 0.15, F2.z1);
  b('f2-haneen', HANEEN_DESK.x - 0.9, HANEEN_DESK.x + 0.9, HANEEN_DESK.z - 0.45, HANEEN_DESK.z + 0.45);
  b('f2-lounge', LOUNGE.x - 3.2, F2.x1, LOUNGE.z - 1.9, LOUNGE.z + 1.9);
  o.push(circle('f2-plant-a', 17.2 , 3.2 + Z, 0.45), circle('f2-plant-b', -13.8, 3.2 + Z, 0.45), circle('f2-plant-c', -1.3, 10.9 + Z, 0.45));
  return o;
}
/** E (Interact) zones on Floor 2 (world frame). `bloom` marks them; `film` = E opens the film wall; `haneen` = E opens Haneen AI; `lift` = E calls the lift (ground floor zone) */
export function bloomZones() {
  const z = (id, en, ar, minX, maxX, minZ, maxZ, extra) => ({ id, en, ar, index: 12, bloom: true, minX, maxX, minZ: minZ + BLOOM_Z0, maxZ: maxZ + BLOOM_Z0, ...extra });
  return [
    z('bloom-haneen', 'Haneen AI', 'حنين AI', -11.8, -6.4, 3.8, 9.4, { haneen: true }),
    ...OFFICE_LIST.map((o) => z('bloom-office-' + o.id, o.title.en + ' office', 'مكتب ' + o.title.ar, o.x0 + 0.3, o.x1 - 0.3, WING.frontZ - 0.4, o.z1 - 0.3)),
    z('bloom-board', 'Boardroom: the video wall', 'قاعة مجلس الإدارة: شاشة الفيديو', 2.9, 17.6, -11.6, 1.6, { film: true }),
    z('bloom-ops', 'Staff operations', 'عمليات الموظفين', -17.6, -2.2, -11.6, 1.6),
    z('bloom-leads', 'Leads wall', 'جدار العملاء المحتملين', -17, 5, 2.2, 11.4),
    z('bloom-lounge', 'Lounge', 'ركن الاستراحة', 5, 17.6, 4.8, 11.4),
    z('bloom-lift', 'Glass lift: Ground floor', 'المصعد الزجاجي: الطابق الأرضي', -17.6, -15.5, 9.3, 11.5, { lift: 'ground' }),
    { id: 'lift-g', en: 'Glass lift: Floor 2 · Bloom Meeting', ar: 'المصعد الزجاجي: الطابق الثاني · اجتماع بلوم', index: 12, bloom: true, lift: 'l2', minX: LIFT_G.x - 1.9, maxX: LIFT_G.x + 1.9, minZ: LIFT_G.doorZ, maxZ: -31.7 },
  ];
}
/** the ground-floor collider of the lift tower (hall frame) */
export const liftBoxes = () => [{ type: 'box', id: 'lift-tower', minX: LIFT_G.x - LIFT_G.w / 2, maxX: LIFT_G.x + LIFT_G.w / 2, minZ: LIFT_G.z - LIFT_G.d / 2, maxZ: LIFT_G.z + LIFT_G.d / 2 }];
/** the Floor 2 navigation graph (world frame): nodes are collision-free standing points, edges straight collision-free walks */
export function bloomGraph() {
  const n = (x, z) => toWorld(x, z);
  const nodes = {
    cab: n(-16.5, 10.4), cabOut: n(-14.2, 10.4), lobbyW: n(-13, 4.4), lobbyC: n(-4.5, 4.4), lobbyE: n(0.2, 4.4), doorS: n(1.9, 3.5), inS: n(1.9, 0.8), lounge: n(8.6, 6.6),
    boardW: n(0.4, -7.8), boardSW: n(0.9, -1.0), boardWd: n(-0.9, -2.75), boardN: n(5, -9.6), boardS: n(4.4, -0.6), boardE: n(15, -0.2), boardNE: n(15.2, -9.8),
    wingOut: n(4.3, 10.2), wingIn: n(4.3, 13.6), corr: n(4.3, 14.6), ...Object.fromEntries(OFFICE_LIST.flatMap((o) => [['cd-' + o.id, n(o.cx, 14.6)], ['oin-' + o.id, n(o.cx, 17.0)]])),
    opsDoor: n(-3.4, -2.75), opsE: n(-5.2, -2.75), opsMid: n(-10, -7.25), opsS: n(-10, -2.75), opsNW: n(-10, -11), hn: n(-7.2, 4.6),
  };
  const edges = [['cab', 'cabOut'], ['cabOut', 'lobbyW'], ['lobbyW', 'lobbyC'], ['lobbyC', 'lobbyE'], ['lobbyE', 'doorS'], ['doorS', 'inS'], ['inS', 'boardS'], ['boardS', 'boardSW'], ['boardSW', 'boardW'], ['boardW', 'boardN'], ['boardS', 'boardE'], ['boardE', 'boardNE'], ['boardNE', 'boardN'],
    ['lobbyE', 'lounge'], ['boardSW', 'boardWd'], ['boardWd', 'opsDoor'], ['opsDoor', 'opsE'], ['opsE', 'opsS'], ['opsS', 'opsMid'], ['opsMid', 'opsNW'], ['lobbyC', 'hn'], ['lobbyE', 'wingOut'], ['wingOut', 'wingIn'], ['wingIn', 'corr'], ...OFFICE_LIST.flatMap((o) => [['corr', 'cd-' + o.id], ['cd-' + o.id, 'oin-' + o.id]])];
  const stops = BLOOM_STOPS.map((s, i) => ({ id: s.id, index: 12 + i, side: 'center', stand: s.stand, look: s.look, bay: null }));
  const link = { ...Object.fromEntries(OFFICE_LIST.map((o) => ['bloom-office-' + o.id, 'oin-' + o.id])), 'bloom-lobby': 'lobbyC', 'bloom-board': 'boardS', 'bloom-ops': 'opsMid', 'bloom-leads': 'lobbyC', 'bloom-lounge': 'lounge', 'bloom-haneen': 'hn' };
  for (const s of stops) { nodes['stand-' + s.id] = s.stand; edges.push([link[s.id], 'stand-' + s.id]); }
  return { nodes, edges, stops };
}

/** the hall's navigation graph + the lift stop (quick-nav "Glass lift"): the stand point hangs off the lane in front of the VIP room's left corner */
export function withBloomLift(graph) {
  const nodes = { ...graph.nodes, 'stand-lift': [...LIFT_STAND] }, edges = [...graph.edges, ['vipL', 'stand-lift']];
  return { ...graph, nodes, edges, stops: [...graph.stops, { id: 'lift', index: 11, side: 'center', stand: [...LIFT_STAND], look: [...LIFT_LOOK], bay: null }] };
}

/** HUD / menu name of a Floor 2 zone or stop (null when it is not one of ours) */
export function bloomName(id, lang) {
  const d = bloomZones().find((z) => z.id === id) || BLOOM_STOPS.find((z) => z.id === id) || (id === 'lift' ? { en: 'Glass lift', ar: 'المصعد الزجاجي' } : null);
  return d ? (lang === 'ar' ? d.ar : d.en) : null;
}
/** presenter ("big screen") pose of the video wall: the whole wall fits the view width (the wall faces -x, so the camera backs away along x) */
export function bloomBigView(aspect = 16 / 9, fov = 46, fill = 0.94, centred = false) {
  const a = Math.max(0.4, aspect), vf = (fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * a), half = (SCREEN.w / 2) / fill, dist = Math.min(10.5, Math.max(3.4, half / Math.tan(hf / 2)));
  const y = centred ? SCREEN.y : 1.55;
  return { pos: [SCREEN.x - 0.012 - dist, y, SCREEN.z + BLOOM_Z0], look: [SCREEN.x, centred ? SCREEN.y : SCREEN.y - 0.05, SCREEN.z + BLOOM_Z0], fov };
}

// ---------------------------------------------------------------- chairs: ONE list for the scene and the tests
/** forward vector of a chair / sofa built facing local +x and rotated about Y by ry (three.js: +x -> (cos ry, 0, -sin ry)) */
export const facing = (ry) => [Math.cos(ry), -Math.sin(ry)];
/** the ry that makes a seat at (x, z) face the point (tx, tz) */
export const faceTo = (x, z, tx, tz) => Math.atan2(-(tz - z), tx - x);
export function seatList() {
  const out = [], T = TABLE;
  for (let i = 0; i < 6; i++) { const x = T.x - 2.5 + i; out.push({ id: 'board-n' + i, kind: 'leader', x, z: T.z - 1.18, ry: -Math.PI / 2, target: [x, T.z] }, { id: 'board-s' + i, kind: 'leader', x, z: T.z + 1.18, ry: Math.PI / 2, target: [x, T.z] }); }   // north row faces +z, south row faces -z
  out.push({ id: 'board-head', kind: 'leader', x: T.x - T.w / 2 - 0.55, z: T.z, ry: 0, target: [T.x, T.z], big: 1.12 });
  PODS.forEach((p, i) => { for (const s of [-1, 1]) for (const dx of [-0.8, 0.8]) out.push({ id: `pod${i}-${s < 0 ? 'n' : 's'}${dx < 0 ? 'w' : 'e'}`, kind: 'task', x: p.x + dx, z: p.z + s, ry: s > 0 ? Math.PI / 2 : -Math.PI / 2, target: [p.x + dx, p.z] }); });
  OFFICE_LIST.forEach((o) => {
    const dz = o.z1 - 2.9, ez = dz - 1.2;   // desk centre z, executive chair z
    out.push({ id: o.id + '-exec', kind: 'exec', x: o.cx, z: dz + 1.2, ry: faceTo(o.cx, dz + 1.2, o.cx, dz), target: [o.cx, dz], big: 1.1 });
    for (const sx of [-1, 1]) out.push({ id: o.id + '-guest' + (sx < 0 ? 'w' : 'e'), kind: 'guest', x: o.cx + sx * 0.85, z: dz - 1.35, ry: faceTo(o.cx + sx * 0.85, dz - 1.35, o.cx + sx * 0.85, dz), target: [o.cx + sx * 0.85, dz] });   // straight at the desk, square to it
  });
  return out;
}
export const LOUNGE_TABLE = [LOUNGE.x + 0.9, LOUNGE.z];
export function sofaList() {
  const a = [LOUNGE.x + 2.3, LOUNGE.z], b = [LOUNGE.x - 0.6, LOUNGE.z + 1.5], c = [LOUNGE.x - 0.6, LOUNGE.z - 1.5];
  return [{ id: 'sofa-a', x: a[0], z: a[1], ry: faceTo(a[0], a[1], ...LOUNGE_TABLE), target: LOUNGE_TABLE, w: 2.4, seats: 3 }, { id: 'sofa-b', x: b[0], z: b[1], ry: faceTo(b[0], b[1], ...LOUNGE_TABLE), target: LOUNGE_TABLE, w: 2.1, seats: 2 }, { id: 'sofa-c', x: c[0], z: c[1], ry: faceTo(c[0], c[1], ...LOUNGE_TABLE), target: LOUNGE_TABLE, w: 1.6, seats: 1, leather: true }];
}
