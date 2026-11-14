/* Third-person follow camera maths (PURE, unit-tested): the camera sits behind the avatar along the reverse of its facing, raised a little, and is pulled in toward the avatar
 * step by step until it is clear of every collider (so it never ends up inside a wall, a bench or furniture). */
import { isFree } from '../navigation/colliders';

export const FOLLOW = { dist: 2.3, height: 1.85, minDist: 0.55, radius: 0.2, step: 0.08 };
/** @param {{pos:[number,number], yaw:number, pitch:number}} w   walker pose (yaw 0 faces -Z; the back direction is (sin yaw, cos yaw)) */
export function followCamera(w, colliders = [], o = {}) {
  const { dist, height, minDist, radius, step } = { ...FOLLOW, ...o };
  const bx = Math.sin(w.yaw), bz = Math.cos(w.yaw); let d = 0;   // the walker's own spot is free by construction; the camera backs off from there as far as the space allows (down to 0 = inside the head: first person)
  for (let s = step; ; s = Math.min(dist, s + step)) { if (!isFree(w.pos[0] + bx * s, w.pos[1] + bz * s, radius, colliders)) break; d = s; if (s >= dist) break; }
  const k = d / dist, y = Math.max(1.15, Math.min(2.6, height - (w.pitch || 0) * 1.1)) * (0.75 + 0.25 * k);
  return { x: w.pos[0] + bx * d, y, z: w.pos[1] + bz * d, dist: d, pitch: (w.pitch || 0) * 0.5 - Math.atan2(Math.max(0, y - 1.45), Math.max(0.5, d)) };
}
