/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - pure helpers of the 3D view (no THREE, no DOM; unit-tested):
 * how far / which way a leaf opens, where every part goes in Explode, and which material role a part gets.
 * ===========================================================================*/

export const OPEN_MAX = (95 * Math.PI) / 180; // a hinged leaf opens to 95 degrees

/** the transform of a leaf at open fraction t (0 closed .. 1 open): rotation about its hinge axis, or a slide along x */
export function leafOpen(lf, d, W, t) {
  const S = W.S;
  if (d.type === 'barn') return { rotY: 0, dx: (W.track ? W.track.slide : 1) * (S.OW + d.barn.overlap) * t };
  if (d.type === 'pocket') return { rotY: 0, dx: (W.track ? W.track.slide : 1) * (S.leafW - 40) * t };
  const sign = (lf.hingeSide === 'right' ? 1 : -1) * (d.swing.dir === 'out' ? 1 : -1);
  return { rotY: (sign * OPEN_MAX * t) || 0, dx: 0 };
}

/** Explode: millimetres [dx, dy, dz] a part moves at amount 0..1. Front is +z. Pieces of the same kind move the same way, so the door "unfolds":
 * skins and glass leave the faces, stiles and rails open out, the frame separates from the leaf, the architraves lift off the wall. */
export function explodeOffset(p, amt, S) {
  if (!amt) return [0, 0, 0];
  const b = 240 * amt;
  const c = p.boxes[0]; const cx = (c.x0 + c.x1) / 2; const cy = (c.y0 + c.y1) / 2;
  const left = p.leaf == null ? cx < 0 : cx < S.leafW / 2;
  const front = p.face === 'front' ? 1 : p.face === 'back' ? -1 : 0;
  switch (p.kind) {
    case 'skin': return [0, 0, front * 1.6 * b];
    case 'deco': return [0, 0, (c.z0 >= 0 ? 1 : -1) * 1.6 * b];
    case 'lip': return [left ? -0.25 * b : 0.25 * b, 0, 0];
    case 'core': case 'block': return [0, 0, 0];
    case 'stile': return [(left ? -1 : 1) * 0.6 * b, 0, 0];
    case 'rail': return [0, cy > S.leafH - 250 ? 0.5 * b : cy < 250 ? -0.5 * b : 0, 0];
    case 'muntin': return [0, 0, 0];
    case 'panel': return [0, 0, 0.7 * b];
    case 'mould': return [0, 0, front * 1.1 * b];
    case 'glass': return [0, 0, 0.9 * b];
    case 'bead': case 'lining': return [0, 0, -0.9 * b];
    case 'bar': return [0, 0, 0.45 * b];
    case 'slat': return [0, 0, 0.6 * b];
    case 'jamb': return [(left ? -1 : 1) * 0.9 * b, 0, 0];
    case 'head': return [0, 0.8 * b, 0];
    case 'threshold': return [0, -0.4 * b, 0];
    case 'architrave': return [0, 0, front * 1.8 * b];
    case 'hinge': return [(left ? -1 : 1) * 0.5 * b, 0, 0];
    case 'handle': case 'cylinder': case 'grille': return [0, 0, (p.face === 'back' ? -1 : 1) * 2.2 * b];
    case 'closer': return [0, 0, -2 * b];
    case 'plaque': return [0, 0, 2.2 * b];
    default: return [0, 0, 0];
  }
}

/** which material a part is drawn with: 'face' (the leaf finish), 'timber' (edges, lippings, blocks), 'core', 'glass', 'frame', 'metal' */
export function materialRole(p) {
  if (p.hardware) return 'metal';
  switch (p.kind) {
    case 'skin': case 'stile': case 'rail': case 'muntin': case 'panel': case 'mould': case 'deco': case 'slat': return 'face';
    case 'jamb': case 'head': case 'threshold': case 'architrave': return 'frame';
    case 'glass': return 'glass';
    case 'bead': case 'bar': return 'face';
    case 'lip': case 'lining': case 'block': return 'timber';
    case 'core': return 'core';
    default: return 'face';
  }
}

/** the camera the 3D view opens with: three-quarter from the outside, a little above the handle, so the thickness of the leaf and the frame read */
export const DOOR_ANGLES = { yaw: -0.5, pitch: 0.14 };
