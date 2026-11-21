/* Where the Kitchen Design Studio is and how the visitor gets there. PURE (no three.js, no DOM), unit-tested.
 *
 * The station hangs on the INSIDE FACE OF THE LEFT FRONT WING (x = -22..-14, z = -0.8): the mirror of the Collections wall on the right wing. That face was plain
 * walnut + plaster and is outside every bay (the first left bay starts at z = -4.5), clear of the walking lanes (|x| = 8), the planter (x = -13), the Reception desk
 * and the columns, so it blocks no aisle. It carries: the name sign, a 4.8 x 2.7 m (16:9) wall screen with a bronze bezel and an LED halo, a travertine / walnut
 * base, and a free-standing touch podium in front ("Start designing", E / tap Interact). */
import { HALL } from '../3d/dimensions';
import { SECTIONS, enabledSections, stationSections, stationName } from './sections';

export const WALL_Z = -0.81;                              // hall.js: inside face of the front wings (faces -z, into the hall)
/** wall slots a section can take. Only the left wing exists today (the hall has no other free wall): see KITCHEN-STUDIO.md "next sections" for how more slots are added. */
export const SLOTS = {
  'left-wing': { side: -1, x: -18 },                      // centre of the wing between the glass wall (x = -14) and the side wall (x = -22)
};

export const SCREEN = { w: 4.8, h: 2.7, cy: 2.0, bezel: 0.07, depth: 0.12 };   // 16:9; bottom edge 0.65 m, top edge 3.35 m (centre a little above the 1.65 m eye line)
export const SIGN = { w: 4.8, h: 0.62, cy: 3.9 };         // above the screen, below the 4.5 m walnut / plaster line
export const BASE = { h: 0.58, depth: 0.3 };               // base panel under the screen (floor to the screen's bottom edge)
export const PODIUM = { w: 1.5, d: 0.7, h: 1.02, dz: 1.15, dx: 2.35 };// free-standing touch table: `dz` = metres from the wall face to its centre, `dx` = metres toward the glass wall (the visitor's left) so it never stands in front of the middle of the screen
export const STAND_BACK = 3.6;                             // metres from the wall: the whole 4.8 m screen fits one 16:9 view (vertical fov 40-50 deg); the stand point stays inside the zone (z >= -4.5)
export const ARRIVE_PITCH = 0.12;                          // radians: the glide arrives looking a little up so the screen and its sign are both in frame

/** everything geometric about one section, derived from its slot */
export function placement(section = SECTIONS[0]) {
  const slot = SLOTS[section.slot]; if (!slot) return null;
  const x = slot.x, z = WALL_Z;
  const stand = [x, z - STAND_BACK];
  const lookY = SCREEN.cy - 0.05;
  const podiumZ = z - PODIUM.dz;
  const x0 = slot.side < 0 ? -HALL.halfWidth : HALL.glassHalf + 0.2, x1 = slot.side < 0 ? -(HALL.glassHalf + 0.2) : HALL.halfWidth;
  return {
    id: section.id, x, z, side: slot.side, stand, look: [x, lookY, z], podium: { x: x + PODIUM.dx, z: podiumZ, w: PODIUM.w, d: PODIUM.d },
    zone: { minX: x0, maxX: x1, minZ: -4.5, maxZ: z },
    /** the corridor lane the quick-nav route uses to reach the stand point (mirrors collections: just past the planter) */
    lane: [slot.side * 13.6, -2.5],
  };
}

/** one entry per station: the first section of every slot (a shared wall is one station, with one screen / podium / zone / collider) */
export const firstOfEachSlot = (sections) => { const seen = new Set(); return sections.filter((s) => (seen.has(s.slot) ? false : (seen.add(s.slot), true))); };

/** plan-view obstacles: the base + screen stand `BASE.depth` proud of the wall and span the whole wing (no pocket narrower than the walker behind them); the podium is a solid
 *  peninsula reaching back to that box (same rule as collections / productColliders: no 0.5 m gaps for a sliding circle to jitter in) */
export function studioColliders(sections = enabledSections()) {
  const out = [];
  for (const s of firstOfEachSlot(sections)) {                // sections that share a slot share ONE wall and ONE podium
    const p = placement(s); if (!p) continue;
    const wall = { minX: HALL.halfWidth * -1 - 1, maxX: -HALL.glassHalf, minZ: WALL_Z - BASE.depth - 0.04, maxZ: 0.35 };
    out.push({ type: 'box', id: s.id + '-wall', ...wall });
    out.push({ type: 'box', id: s.id + '-podium', minX: p.podium.x - p.podium.w / 2, maxX: p.podium.x + p.podium.w / 2, minZ: p.podium.z - p.podium.d / 2, maxZ: wall.minZ });
  }
  return out;
}

/** E / tap Interact works anywhere on the strip of floor in front of the wing (between the glass wall and the side wall, up to the first bay) */
export function studioZones(sections = enabledSections()) {
  return firstOfEachSlot(sections).map((s) => {
    const p = placement(s); if (!p) return null;
    const group = stationSections(s, sections);                  // a zone carries its first section's id (so the kitchen's zone id is unchanged) and the ids of every section on the wall
    return { id: s.id, en: stationName(group, 'en'), ar: stationName(group, 'ar'), index: 11, designStudio: true, sectionId: s.id, sectionIds: group.map((x) => x.id), ...p.zone };
  }).filter(Boolean);
}

/** add the stations to the quick-nav graph (returns a NEW graph, like collections/layout.js withCollections): a lane node past the planter, then the stand point */
export function withDesignStudio(graph, sections = enabledSections()) {
  const nodes = { ...graph.nodes }, edges = [...graph.edges], stops = [...graph.stops];
  sections.forEach((s, i) => {
    const p = placement(s); if (!p) return;
    const lane = 'lane-' + s.id, stand = 'stand-' + s.id;
    nodes[lane] = [...p.lane]; nodes[stand] = [...p.stand];
    edges.push([p.side < 0 ? 'spineL' : 'spineR', lane], [lane, stand]);
    stops.push({ id: s.id, index: 11 + i, side: 'front', stand: [...p.stand], look: [...p.look], bay: null, designStudio: true, pitch: ARRIVE_PITCH });
  });
  return { nodes, edges, stops };
}

/* ---- quality tiers: how the wall screen shows the designer ---- */
export const TIER = {
  high:   { frames: 3, loop: true,  glow: 1.1,  anisotropy: 8, bloom: true },
  medium: { frames: 3, loop: true,  glow: 1.0,  anisotropy: 8, bloom: false },
  low:    { frames: 1, loop: false, glow: 1.0,  anisotropy: 4, bloom: false },   // one still frame: the lightest texture budget
};
export const tierOf = (id) => TIER[id] || TIER.low;
/** the poster frames are only requested once the visitor is this close to the wall (never at start-up) */
export const LOAD_RADIUS = 18;
export const shouldLoad = (x, z, s = SECTIONS[0], r = LOAD_RADIUS) => { const p = placement(s); return !!p && Math.hypot(x - p.x, z - p.z) <= r; };
/** the attract loop: each frame shows for HOLD seconds, then cross-fades over FADE seconds */
export const LOOP = { hold: 6, fade: 1.1 };
/** which frame is on top and how far the next one has faded in, at time t (seconds) */
export function loopAt(t, n, { hold, fade } = LOOP) {
  if (!(n > 1) || !(t >= 0)) return { a: 0, b: 0, k: 0 };
  const per = hold + fade, q = Math.floor(t / per + 1e-9), i = q % n, u = Math.max(0, t - q * per), k = u <= hold ? 0 : (u - hold) / fade;
  return { a: i, b: (i + 1) % n, k: Math.min(1, Math.max(0, k)) };
}
