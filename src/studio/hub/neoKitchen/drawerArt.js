/* Neo Kitchen Designer - pure geometry behind the "04 Drawers" diagram (no React, no colours).
 *
 * The picture is SCHEMATIC and generated from model.g; every dimension tied to a control is linear in its value:
 *   GAP_K  = 3.5 world units per mm of vertical gap         (3 mm  = 10.5)
 *   SIDE_K = 1.6 world units per mm of side clearance       (13 mm = 20.8)
 *   BOT_K  = 1.0 world units per mm of bottom inset         (12 mm = 12)
 * Everything else (carcass, fronts, box size) is a fixed proportion. World units are projected isometrically
 * (X right-down, Z right-up, Y up; 30 degrees) into the 500 x 440 viewBox. The detail circle and the PLAN inset use their
 * own, larger factors (DETAIL_K, DETAIL_BOT_K, PLAN_K) so the same millimetres stay readable at that small size.
 * Inside the legal ranges (gap 0-10, side 0-30, bottom 0-40) no factor ever hits its clamp, so a bigger number always draws bigger. */
export const DRAWER_ART = { W: 500, H: 440, GAP_K: 3.5, SIDE_K: 1.6, BOT_K: 1.0, DETAIL_K: 1.1, DETAIL_BOT_K: 0.9, PLAN_K: 0.6, OX: 84, OY: 232 };

const COS = Math.cos(Math.PI / 6);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (n) => Math.round(n * 10) / 10;
const proj = (X, Y, Z) => [DRAWER_ART.OX + COS * (X + Z), DRAWER_ART.OY + 0.5 * (X - Z) - Y];
const poly = (pts) => `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`;
const line = (a, b) => `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;

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

export function drawerArtLayout(g) {
  const { GAP_K, SIDE_K, BOT_K, DETAIL_K, DETAIL_BOT_K, PLAN_K } = DRAWER_ART;
  const gap = Math.max(0, +g.drawerGap || 0), side = Math.max(0, +g.drawerSide || 0), bot = Math.max(0, +g.drawerBottom || 0);
  // ---- world units
  const t = 8, Wi = 170, D = 120, bk = 4, dt = 7, Hl = 62, Hu = 58, P = 40, Bd = 96, bt = 4, Hb = 50, bth = 3, grv = 2.5;
  const gapU = clamp(gap * GAP_K, 0, 40);
  const sideU = clamp(side * SIDE_K, 0, (Wi - 60) / 2);
  const botU = clamp(bot * BOT_K, 0, Hb - bth - 6);
  const yu0 = Hl + gapU, yu1 = yu0 + Hu, Htot = yu1 + 8;
  const yb0 = yu0 + 4, yb1 = yb0 + Hb;
  const zf = -P, bx0 = sideU, bx1 = Wi - sideU;
  // painter's order (back to front for a camera at +X, -Z, +Y)
  const parts = [
    isoBox('back', 0, 0, D - bk, Wi, Htot, D),
    isoBox('left', -t, -t, 0, 0, Htot, D),
    isoBox('floor', 0, -t, 0, Wi, 0, D - bk),
    isoBox('lowerFront', -t, 0, -dt, Wi + t, Hl, 0),
    isoBox('boxBack', bx0 + bt, yb0, zf + Bd - bt, bx1 - bt, yb1 - 8, zf + Bd),
    isoBox('boxLeft', bx0, yb0, zf, bx0 + bt, yb1, zf + Bd),
    isoBox('bottom', bx0 + bt - grv, yb0 + botU, zf + bt - 1, bx1 - bt + grv, yb0 + botU + bth, zf + Bd - bt + 1),
    isoBox('boxRight', bx1 - bt, yb0, zf, bx1, yb1, zf + Bd),
    isoBox('boxFront', bx0 + bt, yb0, zf, bx1 - bt, yb1, zf + bt),
    isoBox('front', -t, yu0, zf - dt, Wi + t, yu1, zf),
  ];
  const by = Object.fromEntries(parts.map((p) => [p.id, p]));
  const ghost = isoBox('ghost', Wi, -t, 0, Wi + t, Htot, D);

  // ---- measures drawn on the isometric view (world space, then projected)
  const zm = zf + Bd * 0.75, zb = zf + Bd * 0.42, zg = -dt, xg = Wi + t + 10;
  const gapA = proj(xg, Hl, zg), gapB = proj(xg, yu0, zg);
  const sideA = proj(bx1, yb1 + 6, zm), sideB = proj(Wi, yb1 + 6, zm);
  const botA = proj(bx1, yb0, zb), botB = proj(bx1, yb0 + botU, zb);
  const tick = (p, dx, dy) => line([p[0] - dx, p[1] - dy], [p[0] + dx, p[1] + dy]);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const marks = {
    gap: { a: gapA, b: gapB, mid: mid(gapA, gapB), len: gapU, d: `${line(gapA, gapB)}${tick(gapA, 4, 0)}${tick(gapB, 4, 0)}`,
      ext: `${line(proj(Wi + t, Hl, zg), proj(xg + 4, Hl, zg))}${line(proj(Wi + t, yu0, zg), proj(xg + 4, yu0, zg))}`,
      closed: line(proj(Wi + t - 40, yu0, zg), proj(Wi + t, yu0, zg)) },
    side: { a: sideA, b: sideB, mid: mid(sideA, sideB), len: sideU, d: `${line(sideA, sideB)}${tick(sideA, 0, 4)}${tick(sideB, 0, 4)}` },
    bottom: { a: botA, b: botB, mid: mid(botA, botB), len: botU, d: `${line(botA, botB)}${tick(botA, 3.5, -2)}${tick(botB, 3.5, -2)}` },
  };

  // ---- detail circle (top right): vertical section through the drawer side, bottom panel, groove and carcass
  const dc = { cx: 408, cy: 96, r: 68 };
  const dSide = clamp(side * DETAIL_K, 0, 30), dBot = clamp(bot * DETAIL_BOT_K, 0, 30);
  const sw = 8, cw = 14, total = sw + dSide + cw, sx0 = dc.cx - total / 2 + 8;
  const edgeY = dc.cy + 26, pt = 5;
  const detail = {
    ...dc, dSide, dBot, edgeY,
    side: { x: sx0, y: dc.cy - dc.r, w: sw, h: dc.r + 26 },
    carcass: { x: sx0 + sw + dSide, y: dc.cy - dc.r, w: cw, h: dc.r * 2 },
    panel: { x: sx0 - 38, y: edgeY - dBot - pt, w: 38 + sw - 2.5, h: pt },
    groove: { x: sx0 - 0.5, y: edgeY - dBot - pt - 1.5, w: sw - 2, h: pt + 3 },
    gapMeasure: dSide >= 1.5 ? `M${r1(sx0 + sw)} ${r1(dc.cy - 40)}H${r1(sx0 + sw + dSide)}M${r1(sx0 + sw)} ${r1(dc.cy - 45)}v10M${r1(sx0 + sw + dSide)} ${r1(dc.cy - 45)}v10` : '',
    botMeasure: dBot >= 1.5 ? `M${r1(sx0 - 14)} ${r1(edgeY)}V${r1(edgeY - dBot)}M${r1(sx0 - 19)} ${r1(edgeY)}h10M${r1(sx0 - 19)} ${r1(edgeY - dBot)}h10` : '',
    edgeMark: `M${r1(sx0 - 38)} ${r1(edgeY)}H${r1(sx0 + sw)}`,
    labelAt: [dc.cx - 6, dc.cy + dc.r + 16],
    source: proj(bx1, yb1, zf + Bd * 0.8),
  };

  // ---- PLAN inset (bottom left): the same drawer seen from above, front at the bottom
  const pl = { x: 14, y: 326, w: 126, h: 100 };
  const ix0 = pl.x + 12, ix1 = pl.x + pl.w - 12, py0 = pl.y + 26, py1 = pl.y + pl.h - 14, pt2 = 8;
  const pSide = clamp(side * PLAN_K, 0, ((ix1 - ix0 - 2 * pt2) - 36) / 2);
  const pbx0 = ix0 + pt2 + pSide, pbx1 = ix1 - pt2 - pSide;
  const fsd = g.drawerFrontSide != null; // [NEO-CLOSETS-UX25] the wardrobe's 4th control: the gap each side between a drawer front and the column sides (plan inset only)
  const fsP = fsd ? clamp((+g.drawerFrontSide || 0) * 2, 0, 16) : 0;
  const plan = {
    ...pl, pSide,
    carcL: { x: ix0, y: py0 - 4, w: pt2, h: py1 - py0 + 4 }, carcR: { x: ix1 - pt2, y: py0 - 4, w: pt2, h: py1 - py0 + 4 },
    boxL: { x: pbx0, y: py0 + 4, w: 3.5, h: py1 - py0 - 10 }, boxR: { x: pbx1 - 3.5, y: py0 + 4, w: 3.5, h: py1 - py0 - 10 },
    boxBack: { x: pbx0, y: py0 + 4, w: pbx1 - pbx0, h: 3.5 },
    boxBottom: { x: pbx0 + 3.5, y: py0 + 8, w: pbx1 - pbx0 - 7, h: py1 - py0 - 18 },
    front: fsd ? { x: ix0 + pt2 - 3 + fsP, y: py1 - 6, w: ix1 - ix0 - 2 * pt2 + 6 - 2 * fsP, h: 6 } : { x: pl.x + 6, y: py1 - 6, w: pl.w - 12, h: 6 },
    fsP, fsL: fsd && fsP >= 1.5 ? `M${r1(ix0 + pt2 - 3)} ${r1(py1 + 10)}H${r1(ix0 + pt2 - 3 + fsP)}M${r1(ix0 + pt2 - 3)} ${r1(py1 + 6)}v8M${r1(ix0 + pt2 - 3 + fsP)} ${r1(py1 + 6)}v8` : '',
    mL: pSide >= 1.5 ? `M${r1(ix0 + pt2)} ${r1(py0 - 10)}H${r1(pbx0)}M${r1(ix0 + pt2)} ${r1(py0 - 14)}v8M${r1(pbx0)} ${r1(py0 - 14)}v8` : '',
    mR: pSide >= 1.5 ? `M${r1(pbx1)} ${r1(py0 - 10)}H${r1(ix1 - pt2)}M${r1(pbx1)} ${r1(py0 - 14)}v8M${r1(ix1 - pt2)} ${r1(py0 - 14)}v8` : '',
    labelAt: [pl.x + pl.w / 2, pl.y + 14],
  };

  // ---- numbered callouts: badge centre + the dot on the measure it names
  const callouts = [
    { n: 1, dot: marks.gap.mid, badge: [marks.gap.mid[0] + 26, marks.gap.mid[1] + 40] },
    { n: 2, dot: marks.side.mid, badge: [marks.side.mid[0] + 8, marks.side.mid[1] - 52] },
    { n: 3, dot: marks.bottom.mid, badge: [marks.bottom.mid[0] - 44, marks.bottom.mid[1] + 34] },
  ];
  if (fsd) callouts.push({ n: 4, dot: [plan.x + 14 + plan.fsP / 2 + 6, plan.y + plan.h - 4], badge: [plan.x + plan.w + 30, plan.y + plan.h - 20] });
  return { parts, by, ghost, marks, detail, plan, callouts, world: { gapU, sideU, botU, Wi, Hb, t, boxW: bx1 - bx0, yb0, yu0, Hl }, W: DRAWER_ART.W, H: DRAWER_ART.H };
}
