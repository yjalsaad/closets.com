/* Neo Kitchen Designer - pure geometry behind the "02 Carcass Boards" diagram (no React, no colours).
 *
 * The picture is SCHEMATIC and generated from model.g; every dimension tied to a control is linear in its value:
 *   BT_K = 0.8 world units per mm of carcass board    (18 mm = 14.4)   sides, bottom, both stretchers
 *   BK_K = 1.2 world units per mm of back board       (8 mm  = 9.6)
 *   IN_K = 1.2 world units per mm of back inset       (15 mm = 18)     rear edge -> groove / back panel
 *   ST_K = 0.33 world units per mm of stretcher width (100 mm = 33)    D = 170 units, so 250 mm still fits under half
 *   GD_K = 0.8 world units per mm of groove depth     (8 mm  = 6.4)
 * Everything else (width, height, depth) is a fixed proportion. World units are projected isometrically (X right-down,
 * Z right-up, Y up; 30 degrees) into the 480 x 420 viewBox. The camera stands BEHIND the cabinet (z = 0 is the rear edge,
 * z = D the front): it sees the rear faces, the right side's outer face, the left side's inner face and the open top.
 * Inside the legal ranges only the board (above 35 mm) and the inset (above 46 mm) could clamp, neither is reachable. */
export const CARCASS_ART = { W: 480, H: 420, BT_K: 0.8, BK_K: 1.2, IN_K: 1.2, ST_K: 0.33, GD_K: 0.8, OX: 80, OY: 273 };

/** which board a numbered row highlights (index = row index in the card) */
export const CARCASS_SEL = ['right', 'back', 'inset', 'stretchers', 'groove'];

const COS = Math.cos(Math.PI / 6);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (n) => Math.round(n * 10) / 10;
const proj = (X, Y, Z) => [CARCASS_ART.OX + COS * (X + Z), CARCASS_ART.OY + 0.5 * (X - Z) - Y];
const poly = (pts) => `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`;
const P = (arr) => arr.map((q) => proj(q[0], q[1], q[2]));

/** one axis-aligned box in world units -> the three faces this camera sees (top, rear = -Z face, side = +X face) */
function isoBox(id, x0, y0, z0, x1, y1, z1) {
  return {
    id, x0, y0, z0, x1, y1, z1,
    top: poly(P([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])),
    rear: poly(P([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]])),
    side: poly(P([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]])),
  };
}

/** opts.closet [NEO-CLOSETS-UX25]: a wardrobe column has ONE full top board (no stretchers) and only three numbered controls */
export function carcassArtLayout(g, opts = {}) {
  const { BT_K, BK_K, IN_K, ST_K, GD_K } = CARCASS_ART;
  const Wi = 200, Hc = 130, D = 170;
  const t = clamp((+g.board || 0) * BT_K, 2, 30);
  const bk = clamp((+g.back || 0) * BK_K, 1, 26);
  const inset = clamp((+g.inset || 0) * IN_K, 0, 64);
  const s = clamp((+g.stretcher || 0) * ST_K, 4, D / 2 - 2);
  const G = clamp((+g.grooveD || 0) * GD_K, 1, t - 1);

  // painter's order for a camera at (+X, -Z, +Y): farthest first
  const flush = !!opts.closet && !(+g.inset > 0); // back inset 0 = flush with the rear edge, no groove
  const Gd = flush ? 0 : G;
  const parts = opts.closet ? [
    isoBox('left', 0, 0, 0, t, Hc, D),
    isoBox('bottom', t, 0, 0, Wi - t, t, D),
    isoBox('back', t - Gd, t - Gd, inset, Wi - t + Gd, Hc - t + Gd, inset + bk),
    isoBox('top', t, Hc - t, 0, Wi - t, Hc, D),
    isoBox('right', Wi - t, 0, 0, Wi, Hc, D),
  ] : [
    isoBox('left', 0, 0, 0, t, Hc, D),
    isoBox('bottom', t, 0, 0, Wi - t, t, D),
    isoBox('stretchF', t, Hc - t, D - s, Wi - t, Hc, D),
    isoBox('back', t - G, t - G, inset, Wi - t + G, Hc - t + G, inset + bk),
    isoBox('stretchR', t, Hc - t, 0, Wi - t, Hc, s),
    isoBox('right', Wi - t, 0, 0, Wi, Hc, D),
  ];
  const by = Object.fromEntries(parts.map((p) => [p.id, p]));

  // the groove slots, cut into the inner face of the left side and the top face of the bottom (drawn under the back panel)
  const slotL = poly(P([[t, t, inset], [t, Hc - t, inset], [t, Hc - t, inset + bk], [t, t, inset + bk]]));
  const slotB = poly(P([[t, t, inset], [Wi - t, t, inset], [Wi - t, t, inset + bk], [t, t, inset + bk]]));
  // the recess between the rear edge and the back panel, on the same two faces (what "back inset" measures)
  const recessL = poly(P([[t, t, 0], [t, Hc - t, 0], [t, Hc - t, inset], [t, t, inset]]));
  const recessB = poly(P([[t, t, 0], [Wi - t, t, 0], [Wi - t, t, inset], [t, t, inset]]));

  // numbered callouts: the dot sits on the thing it names, the badge floats clear of the drawing
  const dot1 = proj(Wi, Hc * 0.42, D * 0.5);
  const dot2 = proj(Wi - t - 10, Hc - t - 16, inset);
  const dot3 = proj(t, Hc * 0.62, inset * 0.5);
  const dot4 = proj(Wi * 0.52, Hc, s * 0.5);
  const callouts = [
    { n: 1, dot: dot1, badge: [dot1[0] + 52, dot1[1] + 10] },
    { n: 2, dot: dot2, badge: [dot2[0] + 52, dot2[1] + 6] },
    { n: 3, dot: dot3, badge: [dot3[0] + 34, dot3[1] - 74] },
    ...(opts.closet ? [] : [{ n: 4, dot: dot4, badge: [dot4[0] - 52, dot4[1] + 54] }]),
  ];
  const labelDot = proj(Wi * 0.62, Hc, D - s * 0.5);
  return { parts, by, slotL: flush ? '' : slotL, slotB: flush ? '' : slotB, recessL: flush ? '' : recessL, recessB: flush ? '' : recessB, callouts, flush, labelDot, world: { Wi, Hc, D, t, bk, inset, s, G }, W: CARCASS_ART.W, H: CARCASS_ART.H };
}
