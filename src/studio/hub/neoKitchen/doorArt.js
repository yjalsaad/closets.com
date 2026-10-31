/* Neo Kitchen Designer - pure geometry behind the "03 Doors & Hinges" diagram (no React, no colours).
 *
 * The picture is SCHEMATIC and generated from model.g; every dimension tied to a control is linear in its value:
 *   DT_K   = 0.8 world units per mm of door board thickness   (18 mm = 14.4)
 *   GAP_K  = 2.2 world units per mm of door gap               (3 mm  = 6.6)
 *   CUP_K  = 0.5 world units per mm of cup diameter           (35 mm = 17.5 across)
 *   EDGE_K = 1.5 world units per mm of cup edge distance      (5 mm  = 7.5)
 * Everything else (carcass, door size, hinge height) is a fixed proportion. World units are projected isometrically
 * (X right-down, Z right-up, Y up; 30 degrees) into the 500 x 390 viewBox. Inside the legal ranges (thickness 12-40,
 * gap 0-10, cup 15-60, edge 0-15) only the thickness (above 37.5 mm) is ever clamped; the others always draw bigger when the number grows.
 * The left door is swung 90 degrees outward on its left hinge edge, so its free edge (the real board thickness) and its
 * inner face (the hinge-cup bores) both face the camera; the right door stays closed. */
export const DOOR_ART = { W: 500, H: 390, DT_K: 0.8, GAP_K: 2.2, CUP_K: 0.5, EDGE_K: 1.5, OX: 172, OY: 226 };

const COS = Math.cos(Math.PI / 6);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (n) => Math.round(n * 10) / 10;
const proj = (X, Y, Z) => [DOOR_ART.OX + COS * (X + Z), DOOR_ART.OY + 0.5 * (X - Z) - Y];
const poly = (pts) => `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`;
const line = (a, b) => `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;
const tick = (p, dx, dy) => line([p[0] - dx, p[1] - dy], [p[0] + dx, p[1] + dy]);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** one axis-aligned box in world units -> the three faces the camera sees (top, front = -Z face, right = +X face) */
function isoBox(id, x0, y0, z0, x1, y1, z1) {
  const P = (arr) => arr.map((q) => proj(q[0], q[1], q[2]));
  return {
    id, x0, y0, z0, x1, y1, z1,
    top: poly(P([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])),
    front: poly(P([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]])),
    right: poly(P([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]])),
  };
}

export function doorArtLayout(g) {
  const { DT_K, GAP_K, CUP_K, EDGE_K } = DOOR_ART;
  const thk = Math.max(0, +g.doorThk || 0), gap = Math.max(0, +g.doorGap || 0), cup = Math.max(0, +g.hingeCup || 0), edge = Math.max(0, +g.cupEdge || 0);
  // ---- world units
  const Wi = 190, Hc = 150, D = 100, ts = 8, tb = 8, bk = 4, HE = 26;
  const dtU = clamp(thk * DT_K, 3, 30);
  const gapU = clamp(gap * GAP_K, 0, 24);
  const wl = (Wi - 3 * gapU) / 2;                       // one door leaf
  const rU = clamp((cup * CUP_K) / 2, 1, 16);
  const edgeU = clamp(edge * EDGE_K, 0, 24);
  const y0 = gapU, y1 = Hc - gapU;
  const xh = gapU;                                      // hinge edge of the open (left) door
  const xr0 = 2 * gapU + wl;                            // closed (right) door
  // painter's order (back to front for a camera at +X, -Z, +Y)
  const parts = [
    isoBox('back', ts, tb, D - bk, Wi - ts, Hc - tb, D),
    isoBox('left', 0, 0, 0, ts, Hc, D),
    isoBox('bottom', ts, 0, 0, Wi - ts, tb, D - bk),
    isoBox('top', ts, Hc - tb, 0, Wi - ts, Hc, D),
    isoBox('right', Wi - ts, 0, 0, Wi, Hc, D),
    isoBox('doorOpen', xh - dtU, y0, -wl, xh, y1, 0),
    isoBox('doorClosed', xr0, y0, -dtU, xr0 + wl, y1, 0),
  ];
  const by = Object.fromEntries(parts.map((p) => [p.id, p]));

  // ---- hinge-cup bores on the inner (+X) face of the open door, near the hinge edge (z = 0), top and bottom
  const zc = -(edgeU + rU);
  const cupAt = (yc) => {
    const pts = Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2; return proj(xh, yc + rU * Math.sin(a), zc + rU * Math.cos(a)); });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { yc, d: poly(pts), c: proj(xh, yc, zc), box: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
  };
  const cups = [{ id: 'top', ...cupAt(y1 - HE) }, { id: 'bot', ...cupAt(y0 + HE) }];

  // ---- measures (world space, then projected). Ticks are short screen lines at each end.
  const zT = -wl, yM = y0 - 9;
  const thkA = proj(xh - dtU, yM, zT), thkB = proj(xh, yM, zT);
  const gx = Wi - gapU, gyM = Hc * 0.74;
  const gapA = proj(gx, gyM, 0), gapB = proj(Wi, gyM, 0);
  const yb = cups[1].yc, yt = cups[0].yc;
  const cupA = proj(xh, yb, zc - rU), cupB = proj(xh, yb, zc + rU);
  const edA = proj(xh, yt, 0), edB = proj(xh, yt, -edgeU);
  const marks = {
    thk: { a: thkA, b: thkB, mid: mid(thkA, thkB), len: dtU, d: `${line(thkA, thkB)}${tick(thkA, 0, 4)}${tick(thkB, 0, 4)}`,
      ext: `${line(proj(xh - dtU, y0, zT), proj(xh - dtU, yM - 3, zT))}${line(proj(xh, y0, zT), proj(xh, yM - 3, zT))}` },
    gap: { a: gapA, b: gapB, mid: mid(gapA, gapB), len: gapU, d: `${line(gapA, gapB)}${tick(gapA, 0, 4)}${tick(gapB, 0, 4)}` },
    cup: { a: cupA, b: cupB, mid: mid(cupA, cupB), len: 2 * rU, d: `${line(cupA, cupB)}${tick(cupA, 0, 4)}${tick(cupB, 0, 4)}` },
    edge: { a: edA, b: edB, mid: mid(edA, edB), len: edgeU, d: `${line(edA, edB)}${tick(edA, 0, 4)}${tick(edB, 0, 4)}` },
  };
  const handle = line(proj(xr0 + 9, Hc / 2 - 16, -dtU), proj(xr0 + 9, Hc / 2 + 16, -dtU));

  // ---- numbered callouts: badge centre + the dot on the measure it names
  const callouts = [
    { n: 1, dot: marks.thk.mid, badge: [marks.thk.mid[0] - 46, marks.thk.mid[1] + 36] },
    { n: 2, dot: marks.gap.mid, badge: [marks.gap.mid[0] + 30, marks.gap.mid[1] - 46] },
    { n: 3, dot: marks.cup.a, badge: [marks.cup.a[0] - 50, marks.cup.a[1] + 6] },
    { n: 4, dot: marks.edge.mid, badge: [marks.edge.mid[0] + 40, marks.edge.mid[1] - 40] },
  ];
  return { parts, by, cups, marks, handle, callouts, world: { Wi, Hc, dtU, gapU, wl, rU, edgeU, zc, xh, y0, y1 }, W: DOOR_ART.W, H: DOOR_ART.H };
}
