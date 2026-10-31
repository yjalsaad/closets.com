/* Neo Kitchen Designer - pure camera maths for the 3D viewport (no THREE, no DOM): the six named views, the default
 * angle for a layout, the shortest yaw path and the "fit model to screen" distance. Unit-tested; Kitchen3D.jsx only
 * feeds these numbers to the three.js camera. Conventions match Kitchen3D: the camera sits at
 *   target + dist * (cos(pitch) sin(yaw), sin(pitch), cos(pitch) cos(yaw))
 * and the kitchen front faces +z, so yaw 0 is the Front view, yaw PI the Rear, yaw -PI/2 the Left, +PI/2 the Right. */

export const PITCH = { min: -0.2, max: 1.52 };
export const DIST = { min: 900, max: 40000 };

export const VIEW_PRESETS = {
  front: { yaw: 0, pitch: 0.04 },
  rear: { yaw: Math.PI, pitch: 0.04 },
  left: { yaw: -Math.PI / 2, pitch: 0.04 },
  right: { yaw: Math.PI / 2, pitch: 0.04 },
  top: { yaw: 0, pitch: PITCH.max },
  iso: { yaw: -Math.PI / 4, pitch: 0.5 },
};
export const VIEW_ORDER = ['front', 'rear', 'left', 'right', 'top', 'iso'];

/** the opening / "Reset camera" angle: front-facing (yaw 0) like a shop-drawing elevation with a slight lift so the floor
 * grid reads; raised a little more for deep (L / U) layouts so the legs open up instead of hiding behind the main run */
export function defaultAngles(bounds) {
  const b = bounds || { d: 800 };
  /* NEO-CLOSETS-UX24: an L-shaped wardrobe (b.leg = the side of its return wing) opens turned towards the wing's door side, so both wings show */
  /* NEO-KITCHEN-UX29: a galley opens turned to look along the aisle; an island opens turned to the work side so the island does not hide the main run */
  if (b.kind === 'galley') return { yaw: 0.95, pitch: 0.36 };
  if (b.kind === 'island') return { yaw: -0.45, pitch: 0.42 };
  if (b.kind === 'peninsula') return { yaw: b.side === 'left' ? 0.5 : -0.5, pitch: 0.34 };
  if (b.leg === 'right' || b.leg === 'left') return { yaw: b.leg === 'right' ? -0.5 : 0.5, pitch: b.d > 1500 ? 0.3 : 0.12 };
  return b.d > 1500 ? { yaw: 0, pitch: 0.34 } : { yaw: 0, pitch: 0.08 };
}

/** breathing room around the fitted kitchen (1.16 = the model fills about 86% of the limiting viewport axis) */
export const FIT_PAD = 1.16;

export const clampPitch = (p) => Math.max(PITCH.min, Math.min(PITCH.max, p));
export const clampDist = (d) => Math.max(DIST.min, Math.min(DIST.max, d));

/** yaw `to` expressed as the nearest equivalent of `from`, so the camera turns the short way round */
export function shortestYaw(from, to) {
  const TAU = Math.PI * 2;
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return from + d;
}

/**
 * Distance at which the whole kitchen box (w x d x h, centred on x/z, standing on y = 0) fits the viewport from a given
 * angle. Uses the box's real extent along the camera right / up / view axes, the vertical fov and the aspect ratio,
 * so narrow (mobile / sidebar-open) viewports fit by width and wide ones by height. `pad` is the breathing room.
 */
export function fitDistance(bounds, yaw, pitch, fovDeg, aspect, pad = FIT_PAD) {
  const b = bounds || { w: 3000, d: 800, h: 2400 };
  const hw = b.w / 2; const hh = b.h / 2; const hd = b.d / 2;
  const sy = Math.sin(yaw); const cy = Math.cos(yaw); const sp = Math.sin(pitch); const cp = Math.cos(pitch);
  const dir = [cp * sy, sp, cp * cy];
  const right = [cy, 0, -sy];
  const up = [-sp * sy, cp, -sp * cy];
  const ext = (v) => Math.abs(v[0]) * hw + Math.abs(v[1]) * hh + Math.abs(v[2]) * hd;
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * Math.max(0.2, aspect || 1);
  const need = Math.max(ext(right) / tanH, ext(up) / tanV);
  return clampDist((ext(dir) + need) * pad);
}

/** where the camera looks: the middle of the kitchen box */
export function fitTarget(bounds) {
  const b = bounds || { h: 2400 };
  return { x: 0, y: b.h / 2, z: 0 };
}

/** eased tween value (ease-out cubic), k in 0..1 */
export const easeOut = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

/** how much of the viewport (0..1 per axis) the kitchen box spans at camera distance `dist`; the limiting axis is ~1 / pad at the fit distance */
export function fitFill(bounds, yaw, pitch, fovDeg, aspect, dist) {
  const b = bounds || { w: 3000, d: 800, h: 2400 };
  const hw = b.w / 2; const hh = b.h / 2; const hd = b.d / 2;
  const sy = Math.sin(yaw); const cy = Math.cos(yaw); const sp = Math.sin(pitch); const cp = Math.cos(pitch);
  const ext = (v) => Math.abs(v[0]) * hw + Math.abs(v[1]) * hh + Math.abs(v[2]) * hd;
  const near = dist - ext([cp * sy, sp, cp * cy]);
  const tanV = Math.tan((fovDeg * Math.PI) / 360); const tanH = tanV * Math.max(0.2, aspect || 1);
  return { x: ext([cy, 0, -sy]) / (near * tanH), y: ext([-sp * sy, cp, -sp * cy]) / (near * tanV) };
}

/** the seven owner categories (same keys as the layer toggles / sidebar tabs) and whether the CURRENT project has any of
 * them. Absent ones are shown muted + struck through in the 3D category list, never removed or disabled. */
export const CATEGORY_ORDER = ['base', 'wall', 'top', 'counter', 'plinth', 'doors', 'hardware'];
export function categoryPresence(scene) {
  const has = (row) => !!(scene && scene.runs && scene.runs.some((r) => r.units.some((x) => x.row === row)));
  const parts = (scene && scene.parts) || [];
  return {
    base: has('base'),
    wall: has('wall'),
    top: has('top'),
    counter: !!(scene && scene.runs && scene.runs.some((r) => (r.counters && r.counters.length) || (r.splashes && r.splashes.length))),
    plinth: !!(scene && scene.runs && scene.runs.some((r) => r.plinth && r.plinth.u1 > r.plinth.u0)),
    doors: parts.some((p) => p.view === 'front' && (p.kind === 'door' || p.kind === 'drawerFront' || p.kind === 'glass')),
    hardware: !!(scene && ((scene.handles && scene.handles.length) || (scene.hinges && scene.hinges.length) || (scene.pins && scene.pins.length))),
  };
}

/** X-Ray treatment per part kind. `ghost` = fronts (doors, drawer fronts, glass): nearly invisible so the carcass shows;
 * the others are opaque tone roles (read from the scoped --nk-x-* custom properties) so panels keep their thickness and shading. */
export const FRONT_KINDS = ['door', 'drawerFront', 'glass'];
export function xrayStyle(kind) {
  if (FRONT_KINDS.includes(kind)) return { role: 'ghost', opacity: kind === 'glass' ? 0.1 : 0.05 };
  if (kind === 'back') return { role: 'back', opacity: 1 };
  if (kind === 'shelf' || kind === 'carousel') return { role: 'shelf', opacity: 1 };
  if (kind === 'drawerBox') return { role: 'box', opacity: 1 };
  return { role: 'carcass', opacity: 1 };
}

/** which ray hit becomes the selection. Normal view: the nearest part. X-Ray: the nearest NON-front part (you are looking
 * through the doors), falling back to a front only when nothing else is under the pointer. `hits` are nearest-first and
 * carry userData { partId, kind }. */
export function pickSelectable(hits, xray) {
  const sel = (hits || []).filter((h) => h && h.userData && h.userData.partId);
  if (!sel.length) return null;
  if (!xray) return sel[0];
  return sel.find((h) => !FRONT_KINDS.includes(h.userData.kind)) || sel[0];
}

/** restrained finish: wood and lacquer colours are desaturated / darkened a touch so the render is a calm medium brown,
 * not a glossy product shot. Applied in HSL (h kept, so the swatch still matches its finish). */
export const MATERIAL_TONE = { sat: 0.68, lum: 0.86, minRough: 0.72 };
export function toneHSL(h, s, l) { return [h, Math.max(0, Math.min(1, s * MATERIAL_TONE.sat)), Math.max(0, Math.min(1, l * MATERIAL_TONE.lum))]; }
export const matteRough = (r) => Math.max(MATERIAL_TONE.minRough, r);

/** the part of a w x h viewport left once floating panels (the category list on one side, the viewport tools on the other)
 * take `left` / `right` px: the kitchen is fitted to THAT aspect and shifted by `shift` px so it sits centred in the free area. */
export function usableFrame(w, h, left = 0, right = 0) {
  const W = Math.max(1, w); const H = Math.max(1, h);
  const l = Math.max(0, left || 0); const r = Math.max(0, right || 0);
  const free = Math.max(W * 0.4, W - l - r);
  const shift = Math.abs(l - r) < 1 ? 0 : (l - r) / 2;
  return { aspect: free / H, shift: free === W * 0.4 ? 0 : shift };
}

/** the overall-size guides (width / height / depth lines + labels) sit outside the cabinets; leave room for them when fitting */
export const GUIDE_MARGIN = 120;
export function fitBounds(bounds, guides) {
  const b = bounds || { w: 3000, d: 800, h: 2400 };
  return guides ? { ...b, w: b.w + GUIDE_MARGIN * 2 } : b;
}

/* ---------------- UX-21 free move (pure maths; Kitchen3D only feeds the numbers to the camera) ----------------
 * The camera basis for yaw / pitch (same convention as the header): right = (cos yaw, 0, -sin yaw), up = (-sin p sin y, cos p, -sin p cos y). */
const basis = (yaw, pitch) => {
  const sy = Math.sin(yaw); const cy = Math.cos(yaw); const sp = Math.sin(pitch); const cp = Math.cos(pitch);
  return { right: [cy, 0, -sy], up: [-sp * sy, cp, -sp * cy] };
};
/** world mm covered by one screen pixel at the camera target */
export const mmPerPixel = (dist, fovDeg, viewH) => (2 * dist * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, viewH);

/** drag-pan: the scene follows the pointer (dx / dy in CSS px, dy positive = pointer moved down) */
export function panTarget(target, yaw, pitch, dist, dx, dy, viewH, fovDeg) {
  const k = mmPerPixel(dist, fovDeg, viewH); const { right, up } = basis(yaw, pitch);
  return { x: target.x - dx * k * right[0] + dy * k * up[0], y: target.y - dx * k * right[1] + dy * k * up[1], z: target.z - dx * k * right[2] + dy * k * up[2] };
}
/** keyboard nudge: vx +1 = the view moves right, vy +1 = up; `px` is the step in screen pixels */
export function nudgeTarget(target, yaw, pitch, dist, vx, vy, viewH, fovDeg, px = 48) {
  return panTarget(target, yaw, pitch, dist, -vx * px, vy * px, viewH, fovDeg);
}
/** multiplicative zoom for a wheel event (deltaMode 1 = lines); bounded so one notch never jumps */
export function wheelFactor(deltaY, deltaMode = 0) {
  const d = (deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY) || 0;
  return Math.max(0.6, Math.min(1.6, 1 + d * 0.0012));
}
/** zoom towards the pointer: nx / ny are the pointer's NDC offsets from the optical axis (x right, y up). The returned target keeps
 * the world point under the pointer where it was while the distance goes dist -> newDist. */
export function zoomAtCursor(target, yaw, pitch, dist, newDist, nx, ny, fovDeg, aspect) {
  const { right, up } = basis(yaw, pitch); const tanV = Math.tan((fovDeg * Math.PI) / 360); const k = (dist - newDist) * tanV;
  const ax = nx * Math.max(0.2, aspect || 1); const ay = ny;
  return { x: target.x + (right[0] * ax + up[0] * ay) * k, y: target.y + (right[1] * ax + up[1] * ay) * k, z: target.z + (right[2] * ax + up[2] * ay) * k };
}
/** keep the look-at point inside a generous box around the kitchen so the model can never be lost off screen */
export function clampTarget(t, bounds) {
  const b = bounds || { w: 3000, d: 800, h: 2400 }; const m = 1.5 * Math.max(b.w, b.d, b.h);
  const c = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return { x: c(t.x, -m, m), y: c(t.y, b.h / 2 - m, b.h / 2 + m), z: c(t.z, -m, m) };
}
/** distance at which a sphere of `radius` mm fills the viewport (limited by the smaller field of view) */
export function focusDistance(radius, fovDeg, aspect, pad = 1.5) {
  const half = Math.atan(Math.tan((fovDeg * Math.PI) / 360) * Math.min(1, Math.max(0.2, aspect || 1)));
  return clampDist((Math.max(1, radius) / Math.sin(half)) * pad);
}
