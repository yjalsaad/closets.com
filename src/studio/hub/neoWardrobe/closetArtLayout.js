/* Neo Wardrobe Studio [NEO-CLOSETS-UX25] - pure geometry of the two NEW card diagrams (no React, no colours):
 *   heightsArtLayout(v)  the "01 Heights and depths" front + side elevation (callouts 1 plinth, 2 body, 3 top box, 4 closet depth, 5 plinth setback)
 *   railArtLayout(v)     the "05 Shelves & Rails" front view (callouts 1 shelf thickness, 2 rail diameter, 3 rail drop, 4 rail height from floor)
 * Both are SCHEMATIC and generated from the live values: every dimension tied to a control is linear in its value, so typing a number redraws the picture.
 * The Carcass / Doors / Drawers diagrams are the Neo Kitchen ones (neoKitchen/carcassArt, doorArt, drawerArt). */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (n) => Math.round(n * 10) / 10;

export const HEIGHTS_ART = { W: 500, H: 410 };

/** v = { h, plinthH, topBoxH, depth, setback, cols: [widths] } (mm) */
export function heightsArtLayout(v) {
  const h = Math.max(1000, +v.h || 2400);
  const plinth = clamp(+v.plinthH || 0, 0, h * 0.2);
  const topBox = clamp(+v.topBoxH || 0, 0, h * 0.4);
  const body = Math.max(100, h - plinth - topBox);
  const s = 290 / h;                                   // one vertical scale for the whole picture
  const floorY = 352, topY = floorY - h * s;
  const fx0 = 34, fx1 = 190;                           // front elevation (width is a fixed proportion)
  const yPlinth = floorY - plinth * s;                 // top of the plinth
  const yBody = floorY - (plinth + body) * s;          // top of the body (= underside of the fixed board when there is a top box)
  const widths = (v.cols && v.cols.length ? v.cols : [1]).map((w) => Math.max(1, +w || 1));
  const tot = widths.reduce((a, b) => a + b, 0);
  let acc = fx0; const dividers = [];
  widths.forEach((w, i) => { acc += ((fx1 - fx0) * w) / tot; if (i < widths.length - 1) dividers.push(r1(acc)); });
  const front = {
    frame: { x: fx0, y: topY, w: fx1 - fx0, h: floorY - plinth * s - topY },
    body: { x: fx0 + 3, y: yBody + 2, w: fx1 - fx0 - 6, h: Math.max(2, yPlinth - yBody - 2) },
    topBox: topBox > 0 ? { x: fx0 + 3, y: topY + 2, w: fx1 - fx0 - 6, h: Math.max(2, yBody - topY - 2) } : null,
    plinth: { x: fx0 + 8, y: yPlinth, w: fx1 - fx0 - 16, h: Math.max(2, plinth * s) },
    dividers, yBody, yPlinth, floorY, topY,
  };
  const dsc = 0.24;                                    // side view: depth is drawn at 0.24 px / mm (capped so a deep closet still fits)
  const sw = clamp((+v.depth || 600) * dsc, 90, 150);
  const sx0 = 330, sx1 = sx0 + sw;
  const setbackPx = clamp((+v.setback || 0) * dsc, 0, 44);
  const side = {
    body: { x: sx0, y: yBody, w: sw, h: Math.max(2, yPlinth - yBody) },
    topBox: topBox > 0 ? { x: sx0, y: topY, w: sw, h: Math.max(2, yBody - topY) } : null,
    plinth: { x: sx0 + setbackPx, y: yPlinth, w: sw - setbackPx, h: Math.max(2, plinth * s) },
    door: { x: sx0 - 7, y: topY, w: 7, h: floorY - plinth * s - topY },
    x0: sx0, x1: sx1, setbackPx,
  };
  /* dimension lines (blue): overall height on the right of the front view, body + top box beside it, depth under the side view, setback on the plinth */
  const dimX1 = fx1 + 24, dimX2 = fx1 + 46;
  const measures = {
    overall: `M${dimX2} ${r1(topY)}V${floorY}M${dimX2 - 6} ${r1(topY)}h12M${dimX2 - 6} ${floorY}h12`,
    bodyTop: `M${dimX1} ${r1(topY)}V${r1(yPlinth)}M${dimX1 - 6} ${r1(topY)}h12M${dimX1 - 6} ${r1(yPlinth)}h12`,
    plinth: `M${dimX1} ${r1(yPlinth)}V${floorY}M${dimX1 - 6} ${floorY}h12`,
    depth: `M${sx0} ${floorY + 22}H${r1(sx1)}M${sx0} ${floorY + 16}v12M${r1(sx1)} ${floorY + 16}v12`,
    setback: setbackPx >= 2 ? `M${sx0} ${r1(floorY - Math.max(4, plinth * s / 2))}H${r1(sx0 + setbackPx)}M${sx0} ${r1(floorY - Math.max(4, plinth * s / 2)) - 5}v10M${r1(sx0 + setbackPx)} ${r1(floorY - Math.max(4, plinth * s / 2)) - 5}v10` : '',
  };
  const mid = (a, b) => (a + b) / 2;
  const callouts = [
    { n: 1, dot: [fx0 + 24, mid(yPlinth, floorY)], badge: [fx1 + 30, floorY + 18] },
    { n: 2, dot: [fx1 - 14, mid(yBody, yPlinth)], badge: [dimX2 + 30, mid(yBody, yPlinth)] },
    { n: 3, dot: [fx1 - 14, topBox > 0 ? mid(topY, yBody) : topY + 6], badge: [dimX2 + 30, topBox > 0 ? mid(topY, yBody) : topY + 6] },
    { n: 4, dot: [mid(sx0, sx1), floorY + 22], badge: [mid(sx0, sx1), floorY + 46] },
    { n: 5, dot: [sx0 + setbackPx, floorY - plinth * s / 2], badge: [sx0 - 34, floorY - plinth * s - 26] },
  ];
  return { front, side, measures, callouts, world: { h, plinth, body, topBox, s, sw, setbackPx }, W: HEIGHTS_ART.W, H: HEIGHTS_ART.H };
}

export const RAIL_ART = { W: 340, H: 250, THK_K: 0.8, DIA_K: 1.0, DROP_K: 0.7 };

/** v = { board, shelfThk, railDia, railDrop, railH } (mm). Rail height from floor 0 = the standard place: `railDrop` under the top of its zone. */
export function railArtLayout(v) {
  const { THK_K, DIA_K, DROP_K } = RAIL_ART;
  const FX0 = 70, FX1 = 270, FY0 = 16, FY1 = 226;
  const side = clamp((+v.board || 18) * 0.5, 6, 12);
  const ix0 = FX0 + side, ix1 = FX1 - side, iy0 = FY0 + side, iy1 = FY1 - side;
  const thk = clamp((+v.shelfThk || 0) * THK_K, 2, 30);
  const dia = clamp((+v.railDia || 0) * DIA_K, 6, 30);
  const drop = clamp((+v.railDrop || 0) * DROP_K, 0, (iy1 - iy0) * 0.45);
  const h = iy1 - iy0;
  let cy = iy0 + drop;                                         // standard: the rail centre sits `drop` below the top of its zone
  const own = +v.railH || 0;
  if (own > 0) cy = clamp(iy1 - (own / 2400) * h, iy0 + drop, iy1 - dia);   // from floor, never above the drop
  const rail = { x: ix0 + 4, y: cy - dia / 2, w: ix1 - ix0 - 8, h: dia, cy };
  const shelves = [0.52, 0.8].map((f) => { const sy = iy0 + h * f; return { x: ix0, y: sy - thk / 2, w: ix1 - ix0, h: thk, cy: sy }; });
  const callouts = [
    { n: 1, dot: [ix1 - 6, shelves[0].cy], badge: [FX1 + 26, shelves[0].cy] },
    { n: 2, dot: [ix0 + 22, cy], badge: [FX0 - 34, cy - 24] },
    { n: 3, dot: [ix1 - 24, iy0 + drop / 2], badge: [FX1 + 26, iy0 + drop / 2 - 6] },
    { n: 4, dot: [ix0 + 10, (cy + iy1) / 2], badge: [FX0 - 34, (cy + iy1) / 2 + 12] },
  ];
  const measures = {
    thk: `M${FX1 + 8} ${r1(shelves[0].y)}v${r1(shelves[0].h)}M${FX1 + 3} ${r1(shelves[0].y)}h10M${FX1 + 3} ${r1(shelves[0].y + shelves[0].h)}h10`,
    dia: `M${r1(ix0 + 4 + 8)} ${r1(cy - dia / 2)}v${r1(dia)}M${r1(ix0 + 4 + 3)} ${r1(cy - dia / 2)}h10M${r1(ix0 + 4 + 3)} ${r1(cy + dia / 2)}h10`,
    drop: drop >= 3 ? `M${FX1 - 14} ${r1(iy0)}V${r1(cy)}M${FX1 - 19} ${r1(iy0)}h10M${FX1 - 19} ${r1(cy)}h10` : '',
    floor: `M${FX0 - 12} ${r1(cy)}V${r1(iy1)}M${FX0 - 17} ${r1(cy)}h10M${FX0 - 17} ${r1(iy1)}h10`,
  };
  return { FX0, FX1, FY0, FY1, ix0, ix1, iy0, iy1, rail, shelves, callouts, measures, thk, dia, drop, W: RAIL_ART.W, H: RAIL_ART.H };
}
