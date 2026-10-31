/* [NEO-CUTLIST-UX32] Sheet layout view: board nesting diagrams (reuses dxfPlan.nestBOM, nothing re-implemented) with part ids, kerf, offcuts and
 * utilisation. Pure data + SVG strings; the same SVG is shown on screen (PAL_UI) and printed (PAL_PRINT).
 * Offcuts are the free rectangles the shelf packer leaves: the strip to the right of each shelf and the strip under the last shelf. */
import { nestBOM, cleanSheet } from './dxfPlan';
import { PAL_UI } from './clPics';

const f1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MIN_OFFCUT = 100; // mm: smaller leftovers are scrap, not offcuts

/** free rectangles of one sheet: [{ x, y, w, h }] with both sides >= MIN_OFFCUT */
export function sheetOffcuts(sheet, sheetW, sheetH, kerf = 0) {
  const shelves = new Map();
  sheet.parts.forEach((q) => { const s = shelves.get(q.y) || { y: q.y, h: 0, x1: 0 }; s.h = Math.max(s.h, q.h); s.x1 = Math.max(s.x1, q.x + q.w); shelves.set(q.y, s); });
  const out = []; let bottom = 0;
  [...shelves.values()].sort((a, b) => a.y - b.y).forEach((s) => {
    bottom = Math.max(bottom, s.y + s.h);
    const w = sheetW - (s.x1 + kerf);
    if (w >= MIN_OFFCUT && s.h >= MIN_OFFCUT) out.push({ x: s.x1 + kerf, y: s.y, w, h: s.h });
  });
  const h = sheetH - (bottom + kerf);
  if (h >= MIN_OFFCUT) out.push({ x: 0, y: bottom + kerf, w: sheetW, h });
  return out;
}

/** the nesting + a flat list of sheets with their part labels. rowsByNo: Map bom row no -> pro row */
export function planSheets(bom, rowsByNo, opts) {
  const sh = cleanSheet(opts);
  const nest = nestBOM(bom, sh);
  const sheets = []; let g = 0;
  nest.materials.forEach((m) => m.sheets.forEach((s) => {
    g += 1;
    const parts = s.parts.map((q) => { const row = rowsByNo.get(q.no); const copy = Number(String(q.id).split('-')[1]) || 1; return { ...q, pid: row ? row.pid : String(q.no), copy, N: row ? row.qty : 1 }; });
    sheets.push({ g, material: m.material, thk: m.thk, index: s.index, of: m.sheetsCount, parts, used: s.used, offcuts: sheetOffcuts(s, nest.sheetW, nest.sheetH, nest.kerf), mat: m });
  }));
  return { nest, sheets, sheetW: nest.sheetW, sheetH: nest.sheetH, kerf: nest.kerf };
}
/** Map pid -> [sheet number, position] for sorting labels in cutting order */
export function nestOrderMap(plan) {
  const m = new Map();
  plan.sheets.forEach((s) => s.parts.forEach((q, i) => { if (!m.has(q.pid)) m.set(q.pid, [s.g, i]); }));
  return m;
}
/** per material: sheets, used m2, utilisation %, waste % */
export function materialStats(plan) {
  return plan.nest.materials.map((m) => ({ material: m.material, thk: m.thk, sheets: m.sheetsCount, pieces: m.pieces, usedM2: m.usedM2, sheetM2: m.sheetM2, util: m.utilisation * 100, waste: (1 - m.utilisation) * 100 }));
}

/**
 * SVG of one sheet. opts: { pal, hi: Set of pids to highlight, labels: true, offcuts: true, w: px width of the svg element (height follows) }.
 * Part text: the id (and size when the part is big enough). Grain is drawn as a short arrow along X when the part has grain.
 */
export function sheetSvg(plan, sheet, { pal = PAL_UI, hi, labels = true, offcuts = true, width } = {}) {
  const { sheetW: W, sheetH: H } = plan;
  const fs = Math.max(14, Math.min(W, H) / 60);
  let s = `<rect x="0" y="0" width="${W}" height="${H}" style="fill:${pal.paper};stroke:${pal.ink};stroke-width:${f1(fs / 7)}"/>`;
  if (offcuts) sheet.offcuts.forEach((o) => { s += `<rect x="${f1(o.x)}" y="${f1(o.y)}" width="${f1(o.w)}" height="${f1(o.h)}" style="fill:${pal.line};fill-opacity:.35;stroke:${pal.mute};stroke-width:${f1(fs / 14)};stroke-dasharray:${f1(fs / 2)} ${f1(fs / 3)}"/><text x="${f1(o.x + o.w / 2)}" y="${f1(o.y + o.h / 2)}" text-anchor="middle" style="font:600 ${f1(fs * 0.8)}px sans-serif;fill:${pal.mute}">${Math.round(o.w)} × ${Math.round(o.h)}</text>`; });
  sheet.parts.forEach((q) => {
    const on = hi && hi.has(q.pid);
    s += `<g data-pid="${esc(q.pid)}"><rect x="${f1(q.x)}" y="${f1(q.y)}" width="${f1(q.w)}" height="${f1(q.h)}" style="fill:${on ? pal.hi : pal.front};fill-opacity:${on ? 0.45 : 1};stroke:${on ? pal.hi : pal.ink};stroke-width:${f1(on ? fs / 6 : fs / 12)}"/>`;
    if (labels && q.w > fs * 3.2 && q.h > fs * 1.6) {
      const t = `${q.pid}${q.N > 1 ? `·${q.copy}` : ''}`; const fit = Math.min(fs, (q.w / Math.max(4, t.length)) * 1.7, q.h / 2.4);
      s += `<text x="${f1(q.x + q.w / 2)}" y="${f1(q.y + q.h / 2 - (q.h > fs * 3 ? fit * 0.15 : 0))}" text-anchor="middle" dominant-baseline="middle" style="font:700 ${f1(fit)}px sans-serif;fill:${pal.ink}">${esc(t)}</text>`;
      if (q.h > fs * 3 && q.w > fs * 6) s += `<text x="${f1(q.x + q.w / 2)}" y="${f1(q.y + q.h / 2 + fit * 1.1)}" text-anchor="middle" style="font:500 ${f1(fit * 0.78)}px sans-serif;fill:${pal.mute}">${f1(q.w)} × ${f1(q.h)}${q.rotated ? ' ↻' : ''}</text>`;
      if (q.grain && q.grain !== '-' && q.w > fs * 8 && q.h > fs * 3.4) { const gy = q.y + q.h - fit * 0.9; s += `<line x1="${f1(q.x + q.w * 0.3)}" y1="${f1(gy)}" x2="${f1(q.x + q.w * 0.7)}" y2="${f1(gy)}" style="stroke:${pal.mute};stroke-width:${f1(fs / 14)}"/><polygon points="${f1(q.x + q.w * 0.7)},${f1(gy)} ${f1(q.x + q.w * 0.7 - fs * 0.7)},${f1(gy - fs * 0.3)} ${f1(q.x + q.w * 0.7 - fs * 0.7)},${f1(gy + fs * 0.3)}" style="fill:${pal.mute}"/>`; }
    }
    s += '</g>';
  });
  const wAttr = width ? ` width="${width}" height="${f1((width * H) / W)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${wAttr} role="img" aria-label="${esc(sheet.material)} ${sheet.index}/${sheet.of}">${s}</svg>`;
}
