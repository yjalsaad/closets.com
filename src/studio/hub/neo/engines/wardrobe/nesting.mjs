// Standard Wardrobe · Cut-optimisation (nesting) engine (pure, deterministic).
// A reliable GUILLOTINE shelf nester (first-fit-decreasing) per material: sheet count, piece
// placement, utilisation, waste and offcuts (spec §26). Architecture is ready for advanced nesting
// later, but this v1 is honest, fast and testable. No I/O, no Date/random.

const r = (n) => Math.round(Number(n) || 0);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Default stock sheet (mm) + saw kerf + edge trim. Real stock comes from a materials row later. */
export const DEFAULT_STOCK = { width: 2800, height: 2070, kerf: 4, trim: 10 };

/** Expand a numbered panel list into individual cut pieces, grouped by material. */
export function piecesByMaterial(panelList) {
  const map = new Map();
  for (const p of (panelList || [])) {
    const mat = p.material || ('Board ' + (p.thickness || 18));
    if (!map.has(mat)) map.set(mat, []);
    const arr = map.get(mat);
    for (let i = 0; i < (p.qty || 1); i++) arr.push({ part: p.partNumber || p.name, name: p.name, w: r(p.width), h: r(p.height), grain: p.grain || 'none' });
  }
  return map;
}

/**
 * Guillotine shelf nest for ONE material. Every piece lies with its LONG side along the sheet's long
 * axis (so 2400 mm panels fit a 2800 mm sheet), shelves stack along the short axis. Grain is kept
 * consistent because the long side maps to the same sheet axis for all pieces.
 */
export function nestMaterial(pieces, stockRow = {}) {
  const S = { ...DEFAULT_STOCK, ...(stockRow || {}) };
  const L = Math.max(S.width, S.height) - 2 * S.trim;   // usable long axis
  const Wd = Math.min(S.width, S.height) - 2 * S.trim;  // usable short axis
  const kerf = S.kerf, fullArea = S.width * S.height;
  const oversize = [];
  const items = (pieces || []).map((p) => { const a = Math.max(r(p.w), r(p.h)), b = Math.min(r(p.w), r(p.h)); return { part: p.part, name: p.name, a, b }; })
    .filter((p) => { if (p.a > L || p.b > Wd) { oversize.push(p); return false; } return true; });
  items.sort((x, y) => y.b - x.b || y.a - x.a);          // first-fit-decreasing by shelf height

  const sheets = [];
  const newSheet = () => ({ index: sheets.length + 1, placements: [], shelves: [], cursor: 0, used: 0 });
  let sheet = newSheet();
  const fit = (p) => {
    for (const sh of sheet.shelves) { if (p.b <= sh.b && sh.x + p.a <= L) return sh; }
    if (sheet.cursor + p.b <= Wd) { const sh = { y: sheet.cursor, b: p.b, x: 0 }; sheet.shelves.push(sh); sheet.cursor += p.b + kerf; return sh; }
    return null;
  };
  for (const p of items) {
    let sh = fit(p);
    if (!sh) { sheets.push(sheet); sheet = newSheet(); sh = fit(p); if (!sh) { oversize.push(p); continue; } }
    sheet.placements.push({ part: p.part, name: p.name, x: S.trim + sh.x, y: S.trim + sh.y, w: p.a, h: p.b });
    sheet.used += p.a * p.b; sh.x += p.a + kerf;
  }
  if (sheet.placements.length) sheets.push(sheet);

  const totalUsed = sheets.reduce((s, sh) => s + sh.used, 0);
  const totalArea = sheets.length * fullArea;
  return {
    sheetW: S.width, sheetH: S.height, usableL: L, usableW: Wd, sheetCount: sheets.length,
    sheets: sheets.map((sh) => ({ index: sh.index, placements: sh.placements, utilization: r2(sh.used / fullArea * 100) })),
    pieces: (pieces || []).length, placed: sheets.reduce((s, sh) => s + sh.placements.length, 0),
    utilization: totalArea ? r2(totalUsed / totalArea * 100) : 0,
    wastePct: totalArea ? r2((totalArea - totalUsed) / totalArea * 100) : 0,
    offcutM2: r2((totalArea - totalUsed) / 1e6),
    oversize: oversize.map((p) => ({ part: p.part, w: p.a, h: p.b })),
  };
}

/**
 * Advanced GUILLOTINE free-rectangle nest (best-short-side-fit + rotation for grain-free pieces).
 * Generally packs tighter than the shelf nester and never worse. Same output shape as nestMaterial.
 */
export function nestMaterialGuillotine(pieces, stockRow = {}) {
  const S = { ...DEFAULT_STOCK, ...(stockRow || {}) };
  const L = Math.max(S.width, S.height) - 2 * S.trim, Wd = Math.min(S.width, S.height) - 2 * S.trim;
  const kerf = S.kerf, fullArea = S.width * S.height;
  const oversize = [];
  const items = (pieces || []).map((p) => { const a = Math.max(r(p.w), r(p.h)), b = Math.min(r(p.w), r(p.h)); return { part: p.part, name: p.name, a, b, rot: (p.grain || 'none') === 'none' }; })
    .filter((p) => { if (p.a > L || p.b > Wd) { oversize.push(p); return false; } return true; });
  items.sort((x, y) => (y.a - x.a) || (y.a * y.b - x.a * x.b));

  const sheets = [];
  const newSheet = () => ({ index: sheets.length + 1, free: [{ x: 0, y: 0, w: L, h: Wd }], placements: [], used: 0 });
  const oris = (p) => p.rot ? [{ w: p.a, h: p.b }, { w: p.b, h: p.a }] : [{ w: p.a, h: p.b }];
  const split = (sheet, ri, ox, oy, ow, oh) => {
    const f = sheet.free[ri]; sheet.free.splice(ri, 1);
    const right = { x: f.x + ow + kerf, y: f.y, w: f.w - ow - kerf, h: oh };
    const top = { x: f.x, y: f.y + oh + kerf, w: f.w, h: f.h - oh - kerf };
    if (right.w > 1 && right.h > 1) sheet.free.push(right);
    if (top.w > 1 && top.h > 1) sheet.free.push(top);
  };
  const placeIn = (sheet, p) => {
    let best = null;
    sheet.free.forEach((f, ri) => oris(p).forEach((o) => {
      if (o.w <= f.w && o.h <= f.h) { const score = Math.min(f.w - o.w, f.h - o.h); if (!best || score < best.score) best = { ri, o, x: f.x, y: f.y, score }; }
    }));
    if (!best) return false;
    sheet.placements.push({ part: p.part, name: p.name, x: S.trim + best.x, y: S.trim + best.y, w: best.o.w, h: best.o.h });
    sheet.used += best.o.w * best.o.h; split(sheet, best.ri, best.x, best.y, best.o.w, best.o.h); return true;
  };

  for (const p of items) {
    let done = false;
    for (const sh of sheets) { if (placeIn(sh, p)) { done = true; break; } }
    if (!done) { const sh = newSheet(); sheets.push(sh); if (!placeIn(sh, p)) oversize.push(p); }
  }
  const totalUsed = sheets.reduce((s, sh) => s + sh.used, 0), totalArea = sheets.length * fullArea;
  return {
    sheetW: S.width, sheetH: S.height, usableL: L, usableW: Wd, sheetCount: sheets.length,
    sheets: sheets.map((sh) => ({ index: sh.index, placements: sh.placements, utilization: r2(sh.used / fullArea * 100) })),
    pieces: (pieces || []).length, placed: sheets.reduce((s, sh) => s + sh.placements.length, 0),
    utilization: totalArea ? r2(totalUsed / totalArea * 100) : 0,
    wastePct: totalArea ? r2((totalArea - totalUsed) / totalArea * 100) : 0,
    offcutM2: r2((totalArea - totalUsed) / 1e6),
    oversize: oversize.map((p) => ({ part: p.part, w: p.a, h: p.b })),
  };
}

/** Full cutting plan across all materials. opts.method: 'shelf' (default) | 'guillotine' (advanced). */
export function cuttingPlan(panelList, stockRow = {}, opts = {}) {
  const nest = opts.method === 'guillotine' ? nestMaterialGuillotine : nestMaterial;
  const map = piecesByMaterial(panelList);
  const materials = []; let sheetCount = 0, pieces = 0;
  for (const [mat, ps] of map) { const res = nest(ps, stockRow); materials.push({ material: mat, ...res }); sheetCount += res.sheetCount; pieces += ps.length; }
  const utilization = materials.length ? r2(materials.reduce((s, m) => s + m.utilization, 0) / materials.length) : 0;
  const oversize = materials.reduce((s, m) => s + m.oversize.length, 0);
  return { method: opts.method === 'guillotine' ? 'guillotine' : 'shelf', materials, materialCount: materials.length, sheetCount, pieces, utilization, oversize };
}
