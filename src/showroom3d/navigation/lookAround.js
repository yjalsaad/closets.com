/* Yaw / pitch helpers shared by the intro hand-over and the Phase 3 first-person explorer (navigation/explorer.js).
 * The Phase 2 drag-to-look placeholder controller that lived here was replaced by the explorer; `creep` / `clampPosition` / LIMITS are kept
 * (and still unit-tested) as the simple hall-only clamp used by older tests. */
import { HALL } from '../3d/dimensions';

export const LIMITS = { pitchMin: -0.9, pitchMax: 0.9, minX: -13, maxX: 13, minZ: -33, maxZ: -4 };

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** yaw/pitch (radians) that look from `p` toward `l` (yaw 0 looks down -Z, positive yaw turns left / toward -X) */
export function yawPitchFromLookAt(p, l) {
  const dx = l[0] - p[0], dy = l[1] - p[1], dz = l[2] - p[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
export function forwardFromYawPitch(yaw, pitch) {
  return [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
}
export function clampPosition(p, limits = LIMITS) {
  return [clamp(p[0], limits.minX, limits.maxX), HALL.eye, clamp(p[2], limits.minZ, limits.maxZ)];
}
/** step the viewer along the horizontal look direction by `d` metres, kept inside the hall */
export function creep(p, yaw, d, limits = LIMITS) {
  return clampPosition([p[0] - Math.sin(yaw) * d, p[1], p[2] - Math.cos(yaw) * d], limits);
}
