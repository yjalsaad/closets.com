/* Neo Kitchen Designer - elevation dimension layers + component map (PURE functions, no React, no DOM).
 * Everything here is computed from the scene (model + engine) - no dimension number is typed in.
 *   computeElevationDims(scene, runKey, opts) -> lane-placed dimension lines, row bands, captions, cabinet brackets
 *   mapBadges(items, fs)                      -> numbered badges, nudged so they never overlap
 *   partNumbering(scene)                      -> partId -> cut-list "Map" label (same numbering as buildBOM().rows[].maps)
 * Coordinates are model millimetres: u along the run (x), y up. The renderer maps them to the SVG. */
import { elevationItems, RUN_PREFIX } from './geometry';
import { PART_TYPES } from './constants';
import { getOutput, dimText } from './outputSettings';

export const FRONT_TYPES = new Set(['door', 'drawer', 'flip', 'glass', 'cover']);
export const grp = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
/** board / cut sizes are shown exactly as the cut list holds them (295.5 stays 295.5) */
export const fmtBoard = (v) => { const r = Math.round(v * 10) / 10; return Number.isInteger(r) ? grp(r) : String(r); };
/** [NEO-OUTPUT-UX34] the label of a dimension line: millimetres exactly as before; centimetres / inches from the Output setting */
const lab = (v) => { const o = getOutput(); return o.unit === 'mm' ? grp(v) : dimText(v, o); };
const labBoard = (v) => { const o = getOutput(); return o.unit === 'mm' ? fmtBoard(v) : dimText(v, o); };
export const mapLabel = (runKey, no) => `${RUN_PREFIX[runKey] !== undefined ? RUN_PREFIX[runKey] : runKey[0].toUpperCase()}${no}`; // L / R as before; UX29: G (run 2), P (peninsula), I (island)
export const elevFontSize = (L, Hmax) => Math.max(26, Math.round(Math.max(L + 700, Hmax + 700) / 42));
const textW = (s, size) => String(s).length * 0.64 * size;

/** legend / map type list: the shared part types plus the Top unit (row 3) */
export const MAP_TYPES = PART_TYPES.reduce((a, t) => { a.push(t); if (t.k === 'wallUnit') a.push({ k: 'topUnit', en: 'Top unit', ar: 'وحدة ثالثة' }); return a; }, [])
  .filter((t) => t.k !== 'counter' && t.k !== 'plinth');

/** partId -> cut-list Map labels, identical to the ones buildBOM() writes in rows[].maps */
export function partNumbering(scene) {
  const out = {};
  scene.runs.forEach((r) => elevationItems(scene, r.key).forEach((it) => { if (it.partId) (out[it.partId] = out[it.partId] || []).push(mapLabel(r.key, it.no)); }));
  return out;
}

/* ------------------------------------------------------------------ boxes */
const hit = (p, q, m = 0) => p.x0 < q.x1 + m && q.x0 < p.x1 + m && p.y0 < q.y1 + m && q.y0 < p.y1 + m;
export const boxesOverlap = hit;

const TIER = { wallMod: 0, topMod: 1, overall: 2, wallSec: 3, topSec: 4 };

/** the raw (un-placed) dimension list for one run */
function rawDims(scene, run, items, layers) {
  const g = scene.model.g;
  const out = [];
  const add = (d) => { if (Math.abs(d.b - d.a) > 0.5) out.push({ tag: '', tier: 0, prio: 2, ...d }); };
  const partById = new Map(scene.parts.map((p) => [p.id, p]));
  const L = run.L;
  const Hmax = Math.max(...run.units.map((x) => x.y0 + x.H), g.plinthH + g.baseH);
  const lo = g.plinthH + g.baseH + g.counterThk;
  const rows = ['base', 'wall', 'top'].filter((r) => layers[r] && run.units.some((x) => x.row === r));
  const unitsOf = (r) => run.units.filter((x) => x.row === r).sort((p, q) => p.fu0 - q.fu0);

  /* front sizes: from the engine part (identical to the cut list), geometry only for glass panes */
  const frontsOf = (unitId) => items.filter((it) => it.unitId === unitId && FRONT_TYPES.has(it.type) && it.partId);
  const sizeOf = (it, axis) => {
    const p = partById.get(it.partId);
    if (p && it.type !== 'glass' && !it.rotY) return p.ext[axis === 'w' ? 'w' : 'h'];
    return axis === 'w' ? it.u1 - it.u0 : it.y1 - it.y0;
  };

  rows.forEach((row) => {
    const us = unitsOf(row);
    const side = row === 'base' ? 'bottom' : 'top';
    const modTier = row === 'base' ? 0 : row === 'wall' ? TIER.wallMod : TIER.topMod;
    const secTier = row === 'base' ? 1 : row === 'wall' ? TIER.wallSec : TIER.topSec;
    us.forEach((x) => {
      add({ id: `m:${x.unit.id}`, axis: 'h', side, tone: 'primary', kind: 'module', row, a: x.fu0, b: x.fu0 + x.W, from: row === 'base' ? 0 : x.y0 + x.H, label: lab(x.W), tag: x.tag || '', tier: modTier, prio: 1 });
      /* door / inner widths: columns of the fronts, grouped when equal ("296 x2") */
      const fr = frontsOf(x.unit.id);
      const cols = [];
      fr.slice().sort((p, q) => p.u0 - q.u0 || p.y0 - q.y0).forEach((it) => {
        const k = `${Math.round(it.u0)}-${Math.round(it.u1)}`;
        if (!cols.some((c) => c.k === k)) cols.push({ k, u0: it.u0, u1: it.u1, label: labBoard(sizeOf(it, 'w')) });
      });
      const byLabel = new Map();
      cols.forEach((c) => { if (!byLabel.has(c.label)) byLabel.set(c.label, []); byLabel.get(c.label).push(c); });
      [...byLabel.values()].forEach((grpCols, i) => {
        const n = grpCols.length;
        add({ id: `s:${x.unit.id}:${i}`, axis: 'h', side, tone: 'secondary', kind: 'board-w', row, a: Math.min(...grpCols.map((c) => c.u0)), b: Math.max(...grpCols.map((c) => c.u1)), from: row === 'base' ? 0 : x.y0 + x.H, label: grpCols[0].label + (n > 1 ? ` ×${n}` : ''), tier: secTier, prio: 3 });
      });
    });
    /* row total when it differs from the run (equal totals are dropped as duplicates of the overall width) */
    if (us.length > 1 && row !== 'base') add({ id: `t:${row}`, axis: 'h', side, tone: 'primary', kind: 'row-total', row: 'all', a: us[0].fu0, b: us[us.length - 1].fu0 + us[us.length - 1].W, from: Math.max(...us.map((x) => x.y0 + x.H)), label: lab(us[us.length - 1].fu0 + us[us.length - 1].W - us[0].fu0), tier: TIER.overall, prio: 2 });
    /* front heights of the end units */
    const ends = us.length > 1 ? [['left', us[0]], ['right', us[us.length - 1]]] : us.length ? [['left', us[0]]] : [];
    ends.forEach(([sd, x]) => {
      const fr = frontsOf(x.unit.id);
      if (!fr.length) return;
      const u0 = Math.min(...fr.map((q) => q.u0));
      const stack = [];
      fr.filter((q) => Math.abs(q.u0 - u0) < 1).sort((p, q) => p.y0 - q.y0).forEach((it) => {
        const k = `${Math.round(it.y0)}-${Math.round(it.y1)}`;
        if (!stack.some((c) => c.k === k)) stack.push({ k, y0: it.y0, y1: it.y1, label: labBoard(sizeOf(it, 'h')) });
      });
      for (let i = 0; i < stack.length;) {
        let j = i; while (j + 1 < stack.length && stack[j + 1].label === stack[i].label) j += 1;
        const n = j - i + 1;
        add({ id: `h:${sd}:${x.unit.id}:${i}`, axis: 'v', side: sd, tone: 'secondary', kind: 'board-h', row, a: stack[i].y0, b: stack[i].y1, from: sd === 'left' ? x.fu0 : x.fu0 + x.W, label: stack[i].label + (n > 1 ? ` ×${n}` : ''), tier: sd === 'left' ? 0 : 3, prio: 3 });
        i = j + 1;
      }
    });
    /* tall units: module height (blue) */
    us.filter((x) => x.tall).slice(0, 1).forEach((x) => add({ id: `tall:${x.unit.id}`, axis: 'v', side: 'left', tone: 'primary', kind: 'tall', row, a: 0, b: x.y0 + x.H, from: x.fu0, label: lab(x.H), tier: 1, prio: 1 }));
  });

  /* overall width (top) and overall height (right) */
  add({ id: 'overall-w', axis: 'h', side: 'top', tone: 'primary', kind: 'overall', row: 'all', a: 0, b: L, from: Hmax, label: lab(L), tier: TIER.overall, prio: 0 });
  add({ id: 'overall-h', axis: 'v', side: 'right', tone: 'primary', kind: 'overall', row: 'all', a: 0, b: Hmax, from: L, label: lab(Hmax), tier: 2, prio: 0 });

  /* vertical row heights on the right */
  const V = (id, a, b, kind, tier, label) => add({ id, axis: 'v', side: 'right', tone: 'primary', kind, row: 'all', a, b, from: L, label: label === undefined ? lab(b - a) : label, tier, prio: 1 });
  if (layers.plinth) V('v:plinth', 0, g.plinthH, 'plinth', 0);
  if (scene.product !== 'wardrobe') { // a wardrobe scene (NEO-CLOSETS-UX22) has no base / counter / wall rows to dimension: only the plinth and the overall height
    if (layers.base) V('v:base', g.plinthH, g.plinthH + g.baseH, 'base', 0);
    if (layers.counter) V('v:counter', g.plinthH + g.baseH, lo, 'counter', 0);
    if (layers.base && layers.counter) V('v:worktop', g.plinthH, lo, 'worktop', 1);
    if (layers.wall && rows.includes('wall')) { V('v:gap', lo, lo + g.gap, 'gap', 0); V('v:wall', lo + g.gap, lo + g.gap + run.wallH, 'wall', 0); }
    if (run.hasTop && layers.top && rows.includes('top')) V('v:top', lo + g.gap + run.wallH, lo + g.gap + run.wallH + g.topH, 'top', 0);
  }
  return { raw: out, L, Hmax, lo };
}

/* -------------------------------------------------------------- placement */
export function layoutDims(raw, ctx) {
  const { fs, L, Hmax } = ctx;
  const STEP = fs * (ctx.stepK || 3.3); // lane pitch; a small canvas asks for a tighter pitch (label boxes still never overlap - boxClash below)
  const G0 = { bottom: fs * 1.9, top: fs * 1.5, left: fs * 2.6, right: fs * 1.7 };
  /* drop duplicates (same axis, extent and text); the more important layer wins */
  const seen = new Set();
  const list = raw.slice().sort((p, q) => p.prio - q.prio || p.tier - q.tier || p.a - q.a).filter((d) => {
    const k = `${d.row}|${d.side}|${d.axis}|${d.a.toFixed(1)}|${d.b.toFixed(1)}|${d.label}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  /* tier -> lane (empty tiers collapse) per side */
  const tiersOf = {};
  list.forEach((d) => { (tiersOf[d.side] = tiersOf[d.side] || new Set()).add(d.tier); });
  const rank = (side, tier) => [...tiersOf[side]].sort((p, q) => p - q).indexOf(tier);
  const placeAt = (d, lane) => {
    const w = textW(d.label, fs); const tw = d.tag ? textW(d.tag, fs * 0.8) : 0;
    let line; let label; let tag = null; let ext;
    if (d.axis === 'h') {
      const sg = d.side === 'bottom' ? -1 : 1;
      const ly = d.side === 'bottom' ? -(G0.bottom + lane * STEP) : Hmax + G0.top + lane * STEP;
      const cx = (d.a + d.b) / 2; const lc = ly + sg * 0.85 * fs; const tc = ly + sg * 2.15 * fs;
      line = { x1: d.a, y1: ly, x2: d.b, y2: ly };
      label = { x0: cx - w / 2, x1: cx + w / 2, y0: lc - fs * 0.6, y1: lc + fs * 0.6, cx, cy: lc };
      if (d.tag) tag = { x0: cx - tw / 2, x1: cx + tw / 2, y0: tc - fs * 0.5, y1: tc + fs * 0.5, cx, cy: tc };
      const s0 = d.from + sg * fs * 0.15;
      ext = [[d.a, s0, d.a, ly + sg * fs * 0.3], [d.b, s0, d.b, ly + sg * fs * 0.3]];
    } else {
      const sg = d.side === 'left' ? -1 : 1;
      const lx = d.side === 'left' ? -(G0.left + lane * STEP) : L + G0.right + lane * STEP;
      const cy = (d.a + d.b) / 2; const lc = lx + sg * 0.9 * fs;
      line = { x1: lx, y1: d.a, x2: lx, y2: d.b };
      label = { x0: lc - fs * 0.6, x1: lc + fs * 0.6, y0: cy - w / 2, y1: cy + w / 2, cx: lc, cy };
      const s0 = d.from + sg * fs * 0.15;
      ext = [[s0, d.a, lx + sg * fs * 0.3, d.a], [s0, d.b, lx + sg * fs * 0.3, d.b]];
    }
    return { line, lbox: label, tbox: tag, ext, lane };
  };
  const placed = [];
  const occ = {};
  list.forEach((d) => {
    let lane = rank(d.side, d.tier);
    for (let guard = 0; guard < 60; guard += 1, lane += 1) {
      const p = placeAt(d, lane);
      const boxes = [p.lbox, p.tbox].filter(Boolean);
      const key = `${d.side}:${lane}`;
      const lo = Math.min(d.a, d.b); const hi = Math.max(d.a, d.b);
      const lineClash = (occ[key] || []).some(([x, y]) => lo < y - 0.5 && x < hi - 0.5);
      const boxClash = placed.some((q) => [q.p.lbox, q.p.tbox].filter(Boolean).some((qb) => boxes.some((b) => hit(b, qb, fs * 0.12))));
      if (!lineClash && !boxClash) { (occ[key] = occ[key] || []).push([lo, hi]); placed.push({ d, p }); break; }
    }
  });
  const dims = placed.map(({ d, p }) => ({ ...d, ...p }));
  const bb = { x0: 0, x1: L, y0: 0, y1: Hmax };
  const grow = (x, y) => { bb.x0 = Math.min(bb.x0, x); bb.x1 = Math.max(bb.x1, x); bb.y0 = Math.min(bb.y0, y); bb.y1 = Math.max(bb.y1, y); };
  dims.forEach((d) => { grow(d.line.x1, d.line.y1); grow(d.line.x2, d.line.y2); [d.lbox, d.tbox].filter(Boolean).forEach((b) => { grow(b.x0, b.y0); grow(b.x1, b.y1); }); });
  return { dims, bbox: bb, STEP, G0 };
}

/** full dimension layer for one run */
export function computeElevationDims(scene, runKey, opts = {}) {
  const run = scene.runs.find((r) => r.key === runKey) || scene.runs[0];
  const layers = opts.layers || { base: true, wall: true, top: true, counter: true, plinth: true, doors: true, hardware: true };
  const items = opts.items || elevationItems(scene, run.key);
  const g = scene.model.g;
  const { raw, L, Hmax, lo } = rawDims(scene, run, items, layers);
  const fs = opts.fs || elevFontSize(L, Hmax);
  const { dims, bbox } = layoutDims(raw, { fs, L, Hmax, stepK: opts.stepK });

  /* row bands (right-hand reference regions) aligned to the real row heights */
  const bands = [];
  if (scene.product !== 'wardrobe' && layers.base && run.units.some((x) => x.row === 'base')) bands.push({ row: 'base', y0: g.plinthH, y1: lo, cap: 'BASE' });
  if (layers.wall && run.units.some((x) => x.row === 'wall')) bands.push({ row: 'wall', y0: lo + g.gap, y1: lo + g.gap + run.wallH, cap: 'WALL' });
  if (run.hasTop && layers.top && run.units.some((x) => x.row === 'top')) bands.push({ row: 'top', y0: lo + g.gap + run.wallH, y1: lo + g.gap + run.wallH + g.topH, cap: 'TOP' });
  /* [NEO-HANDLES-UX36] a wardrobe: PLINTH / BODY (/ TOP BOX) side labels on the right edge, like the reference closets drawing (the band caps are the handle drag targets' names) */
  if (scene.product === 'wardrobe' && layers.base && run.units.some((x) => x.row === 'base')) {
    const wd = scene.wd || { plinthH: g.plinthH, topBoxH: 0 };
    const top = Math.max(...run.units.map((x) => x.y0 + x.H));
    if (wd.plinthH > 0) bands.push({ row: 'plinth', y0: 0, y1: wd.plinthH, cap: 'PLINTH' });
    bands.push({ row: 'body', y0: wd.plinthH, y1: top - (wd.topBoxH || 0), cap: 'BODY' });
    if (wd.topBoxH > 0) bands.push({ row: 'topbox', y0: top - wd.topBoxH, y1: top, cap: 'TOP BOX' });
  }

  /* row captions at the start of the module lanes (TOP / WALL / BASE) */
  const caps = [];
  dims.filter((d) => d.axis === 'h' && d.kind === 'module').forEach((d) => {
    if (scene.product !== 'wardrobe' && !caps.some((c) => c.row === d.row)) caps.push({ row: d.row, text: d.row.toUpperCase(), x: -fs * 0.7, y: d.line.y1 });
  });

  /* cabinet row labels under the base row: circled number + "Base n", joined to their width segments by a bracket */
  const cabinets = [];
  const base = run.units.filter((x) => x.row === 'base').sort((p, q) => p.fu0 - q.fu0);
  if (layers.base && base.length) {
    const yb = bbox.y0 - fs * 0.9;
    const rowsEnd = [];
    base.forEach((x, i) => {
      const num = parseInt(String(x.tag || '').replace(/\D/g, ''), 10) || i + 1;
      const text = x.label || `Base ${num}`;
      const w = fs * 1.5 + fs * 0.35 + textW(text, fs * 0.85);
      const cx = x.fu0 + x.W / 2;
      let r = 0;
      const mk = (rr) => ({ x0: cx - w / 2, x1: cx + w / 2, y0: yb - fs * (1.1 + rr * 1.9) - fs * 0.8, y1: yb - fs * (1.1 + rr * 1.9) + fs * 0.8 });
      while (rowsEnd.some((b) => hit(b, mk(r), fs * 0.15)) && r < 6) r += 1;
      const box = mk(r); rowsEnd.push(box);
      cabinets.push({ id: x.unit.id, num, text, a: x.fu0, b: x.fu0 + x.W, y: yb, cx, cy: (box.y0 + box.y1) / 2, w, box, row: r });
    });
    cabinets.forEach((c) => { bbox.y0 = Math.min(bbox.y0, c.box.y0); bbox.x0 = Math.min(bbox.x0, c.box.x0); bbox.x1 = Math.max(bbox.x1, c.box.x1); });
  }
  let note = null;
  const sec0 = dims.find((d) => d.axis === 'h' && d.side === 'bottom' && d.tone === 'secondary');
  if (sec0) { note = { text: `${g.board} board`, x: L + fs * 0.7, y: sec0.line.y1 }; bbox.x1 = Math.max(bbox.x1, note.x + textW(note.text, fs * 0.8)); }
  bands.forEach((b) => { b.x0 = L; b.x1 = bbox.x1 + fs * 0.4; });
  if (bands.length) bbox.x1 += fs * 0.4 + Math.max(...bands.map((b) => textW(b.cap, fs * 0.9))) + fs * 0.8;
  return { fs, L, Hmax, lo, dims, bands, caps, cabinets, note, bbox };
}

/* ------------------------------------------------------------ map badges */
/** numbered badges; one per item, in the item's top-start corner, nudged sideways / to the centre when they would overlap */
export function mapBadges(items, fs, runKey = 'main') {
  const r = fs * 0.62;
  const out = [];
  const clash = (cx, cy) => out.some((b) => (b.cx - cx) ** 2 + (b.cy - cy) ** 2 < (2 * r * 1.04) ** 2);
  items.forEach((it) => {
    const w = it.u1 - it.u0; const h = it.y1 - it.y0;
    if ((it.type === 'plinth' || it.type === 'counter') && w < 60) return;
    const cands = [];
    const left = it.u0 + r * 1.35; const top = it.y1 - r * 1.35;
    if (w >= r * 2.8 && h >= r * 2.8) { cands.push([left, top]); cands.push([left + r * 2.3, top]); cands.push([left, top - r * 2.3]); }
    cands.push([(it.u0 + it.u1) / 2, (it.y0 + it.y1) / 2]);
    cands.push([(it.u0 + it.u1) / 2, (it.y0 + it.y1) / 2 - r * 2.2]);
    let pick = cands.find(([x, y]) => !clash(x, y)) || cands[cands.length - 1];
    if (it.type === 'plinth' || it.type === 'counter') pick = [it.u0 + r * 1.35, (it.y0 + it.y1) / 2];
    const name = it.type === 'plinth' ? 'Plinth' : it.type === 'counter' ? String(it.label).replace(/\s*\d+$/, '') : '';
    out.push({ no: it.no, label: mapLabel(runKey, it.no), cx: pick[0], cy: pick[1], r, name, type: it.type });
  });
  return out;
}
