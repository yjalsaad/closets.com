/* Phase 3 collision: a pure-JS 2D (plan view, x / z) model of everything the visitor can bump into. No three.js, no DOM.
 *
 * The walker is a CIRCLE (radius PLAYER.radius, larger than the camera near plane so the lens never pokes through a wall).
 * Obstacles are axis-aligned boxes, oriented boxes (OBB) and circles. A move is cut into sub-steps shorter than half the radius and the
 * circle is pushed out of any obstacle after each sub-step, which (a) makes the circle SLIDE along walls / round corners instead of
 * sticking and (b) cannot tunnel through anything thicker than a few centimetres, however large dt is.
 *
 * The obstacle list is derived from the same dimension constants the scene modules build from (3d/dimensions.js, departments.js).
 * Where a scene file hard-codes a number (benches, planters, basins, hedges) it is repeated here and annotated with its source.
 * Solid slabs are made deliberately thick (many metres, extending AWAY from the walkable side) so a bad frame can never put the
 * circle on the far side of a wall. */
import { HALL, SITE } from '../3d/dimensions';
import { layoutBays } from '../scenes/main-hall/departments';

export const PLAYER = { radius: 0.35, eye: HALL.eye };
/** the sliding doors count as open (passable) once the leaves have cleared the opening */
export const DOOR_OPEN_AT = 0.85;

const box = (id, minX, maxX, minZ, maxZ) => ({ type: 'box', id, minX, maxX, minZ, maxZ });
const circle = (id, x, z, r) => ({ type: 'circle', id, x, z, r });
/** oriented box: centre, half extents, rotation about +Y in radians */
const obb = (id, cx, cz, hx, hz, rot) => ({ type: 'obb', id, cx, cz, hx, hz, rot });

const FAR = 40;   // how far slabs extend away from the walkable side

/** The 2D rectangles the visitor is *meant* to be able to stand in (centre of the circle may reach R inside these). Used by tests and the minimap. */
export const WALK_RECTS = {
  hall:      { minX: -HALL.halfWidth, maxX: HALL.halfWidth, minZ: -HALL.depth, maxZ: -0.2 },
  doorway:   { minX: -HALL.doorHalfOpening, maxX: HALL.doorHalfOpening, minZ: -0.2, maxZ: 0.35 },
  forecourt: { minX: -24.6, maxX: 24.6, minZ: 0.35, maxZ: 22.2 },       // paved apron: hedge rows at x = +-25.4 and z = 22.7 (landscape.js)
  path:      { minX: -4.0, maxX: 4.0, minZ: 22.2, maxZ: SITE.forecourtDepth + 2 },   // approach path inside the bollard line (x = +-4.1, landscape.js), cut off at 36 m
};

/**
 * All obstacles for a given door state.
 * @param {{doorOpen?: number, oliveCount?: number}} opts  doorOpen 0..1 (>= DOOR_OPEN_AT means passable)
 */
export function buildColliders({ doorOpen = 1, oliveCount = 4 } = {}) {
  const H = HALL, W = H.halfWidth, D = H.depth, g = H.doorHalfOpening;
  const list = [];
  // ---- building shell (interior face at x = +-22, back at z = -36, facade glass on z = 0) ----
  list.push(box('wall-left', -W - FAR, -W, -D - FAR, 0.35));
  list.push(box('wall-right', W, W + FAR, -D - FAR, 0.35));
  list.push(box('wall-back', -W - FAR, W + FAR, -D - FAR, -D));
  // facade: solid stone wings (z -0.8..0) and the glass curtain wall (mullions to z +0.17); the door opening is left clear
  list.push(box('facade-wing-left', -W - FAR, -H.glassHalf, -0.8, 0.35));
  list.push(box('facade-wing-right', H.glassHalf, W + FAR, -0.8, 0.35));
  list.push(box('glass-left', -H.glassHalf, -g, -0.2, 0.35));
  list.push(box('glass-right', g, H.glassHalf, -0.2, 0.35));
  if (doorOpen < DOOR_OPEN_AT) list.push(box('door-closed', -g, g, -0.2, 0.35));
  // ---- interior fixtures ----
  for (const z of [-15, -26]) list.push(box('bench@' + z, -3.2, 3.2, z - 0.75, z + 0.75));                 // hall.js stone benches 6.4 x 1.5
  for (const x of [-13, 13]) list.push(circle('planter@' + x, x, -5.2, 0.95));                             // hall.js planters + olive trunks
  for (const b of layoutBays()) {                                                                           // bays.js timber portal posts either side of each alcove
    const s = b.side === 'left' ? -1 : 1, cx = s * W - s * 0.32;
    for (const dz of [-1, 1]) list.push(box('post-' + b.id + (dz < 0 ? '-a' : '-b'), cx - 0.17, cx + 0.17, b.z + dz * (b.width / 2 - 0.15) - 0.15, b.z + dz * (b.width / 2 - 0.15) + 0.15));
  }
  // ---- exterior: building footprint is already solid; forecourt perimeter = hedge rows + kerbs + an end stop on the path ----
  const fx = WALK_RECTS.forecourt, px = WALK_RECTS.path;
  list.push(box('site-left', fx.minX - FAR, fx.minX, 0.35, fx.maxZ + 4));
  list.push(box('site-right', fx.maxX, fx.maxX + FAR, 0.35, fx.maxZ + 4));
  list.push(box('hedge-front-left', fx.minX - FAR, px.minX, fx.maxZ, fx.maxZ + FAR));
  list.push(box('hedge-front-right', px.maxX, fx.maxX + FAR, fx.maxZ, fx.maxZ + FAR));
  list.push(box('path-left', px.minX - FAR, px.minX, fx.maxZ, px.maxZ));
  list.push(box('path-right', px.maxX, px.maxX + FAR, fx.maxZ, px.maxZ));
  list.push(box('path-end', px.minX - FAR, px.maxX + FAR, px.maxZ, px.maxZ + FAR));
  for (const s of [-1, 1]) {
    list.push(box('basin' + s, s * 11.2 - 5.2, s * 11.2 + 5.2, 11 - 6.5, 11 + 6.5));                        // landscape.js reflecting basins 10.4 x 13
  }
  const olives = [[-20.5, 5], [20.5, 5], [-20.5, 15], [20.5, 15]].slice(0, oliveCount);                     // landscape.js olive planters 2.2 m
  olives.forEach(([x, z], i) => list.push(box('olive-planter' + i, x - 1.1, x + 1.1, z - 1.1, z + 1.1)));
  return list;
}

/** push circle (px, pz, r) out of one obstacle. Returns [x, z] of the corrected centre, or null when not touching. */
export function pushOut(px, pz, r, c) {
  if (c.type === 'circle') {
    const dx = px - c.x, dz = pz - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) return null;
    const d = Math.sqrt(d2); if (d < 1e-9) return [c.x + rr, c.z];
    return [c.x + (dx / d) * rr, c.z + (dz / d) * rr];
  }
  if (c.type === 'obb') {
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot), dx = px - c.cx, dz = pz - c.cz;
    const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;                // into the box's own frame (rotate by -rot)
    const out = pushOutAabb(lx, lz, r, -c.hx, c.hx, -c.hz, c.hz); if (!out) return null;
    return [c.cx + out[0] * cs - out[1] * sn, c.cz + out[0] * sn + out[1] * cs];
  }
  return pushOutAabb(px, pz, r, c.minX, c.maxX, c.minZ, c.maxZ);
}
function pushOutAabb(px, pz, r, minX, maxX, minZ, maxZ) {
  const qx = Math.min(maxX, Math.max(minX, px)), qz = Math.min(maxZ, Math.max(minZ, pz));
  const dx = px - qx, dz = pz - qz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r && d2 > 0) return null;
  if (d2 > 0) { const d = Math.sqrt(d2); return [qx + (dx / d) * r, qz + (dz / d) * r]; }
  // centre is inside the box (only possible after a huge teleport): leave through the nearest face
  const l = px - minX, rt = maxX - px, t = pz - minZ, b = maxZ - pz, m = Math.min(l, rt, t, b);
  if (m === l) return [minX - r, pz]; if (m === rt) return [maxX + r, pz]; if (m === t) return [px, minZ - r]; return [px, maxZ + r];
}

/** resolve overlaps (a few passes so two walls meeting in a corner both get satisfied). Returns [x, z]. */
export function resolve(px, pz, r, colliders, passes = 6) {
  for (let i = 0; i < passes; i++) {
    let moved = false;
    for (const c of colliders) { const o = pushOut(px, pz, r, c); if (o) { px = o[0]; pz = o[1]; moved = true; } }
    if (!moved) break;
  }
  return [px, pz];
}

/** the longest sub-step is a quarter of the radius, so nothing thicker than that can be skipped over */
export const MAX_SUBSTEP = PLAYER.radius * 0.25;
const MAX_SUBSTEPS = 4000;

/** move the circle by (dx, dz) with sub-stepping + sliding. Returns the new [x, z]. */
export function moveCircle(pos, dx, dz, r, colliders) {
  let x = pos[0], z = pos[1];
  const len = Math.hypot(dx, dz);
  if (!(len > 0) || !isFinite(len)) return resolve(x, z, r, colliders);
  const n = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(len / MAX_SUBSTEP))), sx = dx / n, sz = dz / n;
  for (let i = 0; i < n; i++) { const o = resolve(x + sx, z + sz, r, colliders); x = o[0]; z = o[1]; }
  return [x, z];
}

/** is the circle free of every obstacle at (x, z)? */
export function isFree(x, z, r, colliders, eps = 1e-6) {
  for (const c of colliders) if (pushOut(x, z, r - eps, c)) return false;
  return true;
}
/** can the circle travel the straight segment a -> b without touching anything? (sampled finer than MAX_SUBSTEP) */
export function segmentClear(a, b, r, colliders) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / (MAX_SUBSTEP * 2)));
  for (let i = 0; i <= n; i++) { const k = i / n; if (!isFree(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, r, colliders)) return false; }
  return true;
}
