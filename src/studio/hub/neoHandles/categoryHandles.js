/* =============================================================================
 * [NEO-HANDLES-UX36] Bathroom / Laundry / TV / Office handles (the generic Neo category studio). PURE.
 * A category design is { p: category parameters, x: shared cabinet fields, units: [{id, type, w, ...options}] } and builds a kitchen-engine scene through `toKitchen`
 * (its `g` carries the surface height, the floor clearance, the wall gap / height ...). So the handles come from two places:
 *   - the units: every unit's width edge (setUnitWidth with the studio's keep-total flag), the total width (setTotalWidth), the selected unit's stepper options as
 *     COUNT handles (drawers, shelves, baskets, door leaves) through the unit's own spec range;
 *   - the category parameters the drawing shows: the working surface (vanity / worktop / desk / media unit top), the floor clearance (legs, plinth, wall-hung gap),
 *     the wall gap and wall unit height (mirror cabinet, wall cabinets, the TV niche gap), the tall unit height, the TV wall panel top, the splash height, the
 *     TV size (niche width / height), the washer / dryer width. Each writes `design.p[key]` clamped by the parameter's own spec (normSpec), as the panel field does.
 * ===========================================================================*/
import { setUnitWidth, setTotalWidth, widthRange, urange, typeOf, totalWidth, normSpec, RI } from '../neoCategories/categoryModel';
import { lowerH, isTall } from '../neoKitchen/model';
import { makeHandle, snapList, T, STD_WIDTHS } from './handleModel';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** which parameter of each category the drawing's edges belong to */
export const PARAM_MAP = {
  tv: { surface: 'unitH', floor: (p) => (p.mount === 'floating' ? 'floatH' : 'legH'), gap: 'nicheGap', tall: 'towerH', panel: 'panelH' },
  bathroom: { surface: 'vanityH', floor: (p) => (p.mount === 'wall' ? 'hangGap' : p.foot === 'plinth' ? 'plinthH' : 'legH'), gap: 'mirrorGap', wallH: 'mirrorH', tall: 'columnH', splash: 'splashH' },
  laundry: { surface: 'worktopH', floor: () => 'plinthH', gap: 'wallGap', wallH: 'wallH', tall: 'tallH', splash: 'splashH' },
  office: { surface: 'deskH', floor: () => 'glide', tall: 'towerH' },
};
const SNAPS = {
  unitH: [350, 400, 450, 500], vanityH: [800, 850, 900], worktopH: [900, 960, 1000], deskH: [720, 740, 750, 760], floatH: [200, 300, 400, 500], legH: [100, 120, 150], hangGap: [200, 250, 300],
  plinthH: [100, 120, 150], glide: [30, 50, 80], nicheGap: [0, 100, 150, 200, 300], mirrorGap: [200, 250, 300], wallGap: [500, 600, 700], mirrorH: [600, 700, 800], wallH: [600, 700, 900],
  tvSize: [43, 50, 55, 65, 75, 85, 98], machineW: [560, 600, 650], towerH: [1800, 2000, 2200, 2400], columnH: [1600, 1800, 2000], tallH: [2000, 2100, 2200, 2400], panelH: [2000, 2200, 2400, 2600], splashH: [0, 60, 100, 150],
};
const whenOk = (sp, ctx) => { if (!sp.when) return true; try { return !!sp.when(ctx); } catch (e) { return false; } };

/**
 * @param {{ cfg, design, built, keepW?: boolean, selected?: {unitId}, layers?: object }} o   built = buildCategory(cfg, design)
 */
export function categoryHandles({ cfg, design, built, keepW = true, selected = null, layers = null }) {
  const scene = built.scene; const run = scene.runs.find((r) => r.key === 'main'); if (!run) return [];
  const d = design; const p = d.p; const x = d.x; const g = built.model.g; const L = run.L;
  const map = PARAM_MAP[cfg.id] || {};
  const out = [];
  const specOf = (k) => cfg.params.find((s) => s.k === k);
  const showBase = !layers || layers.base !== false; const showWall = !layers || layers.wall !== false;
  const baseInsts = run.units.filter((q) => q.row === 'base'); const wallInsts = run.units.filter((q) => q.row === 'wall');
  const top = Math.max(...run.units.map((q) => q.y0 + q.H), g.plinthH + g.baseH + g.counterThk);
  const surfaceY = g.plinthH + g.baseH + g.counterThk;

  /* ---- the units: width edges + the total ---- */
  const widths = d.units.map((u) => u.w);
  built.placed.forEach((pl, i) => {
    const bi = pl.ids.base ? run.units.find((q) => q.unit.id === pl.ids.base) : null;
    const wi = pl.ids.wall ? run.units.find((q) => q.unit.id === pl.ids.wall) : null;
    /* a unit with no carcass of its own (an office desk is a top on legs) has no scene unit: place its edge from the widths */
    const before = widths.slice(0, i).reduce((a, b) => a + b, 0);
    const inst = bi || wi || { unit: { id: `cf-${pl.unit.id}` }, fu0: before, W: pl.unit.w, y0: g.plinthH, H: surfaceY - g.plinthH };
    if ((bi || wi) && !((bi && showBase) || (wi && showWall))) return;
    const u = pl.unit; const t = typeOf(cfg, u); const rg0 = urange(cfg, u, p); const last = i === d.units.length - 1;
    /* what this unit can really take: setUnitWidth refuses (null) a width the other units cannot make up for (keep-total), so walk in from the type's range */
    const okW = (w) => !!setUnitWidth(cfg, d.units, i, w, keepW, p);
    let lo2 = rg0.min; let hi2 = rg0.max;
    for (let n = 0; n < 160 && hi2 > u.w && !okW(hi2); n += 1) hi2 -= 10;
    for (let n = 0; n < 160 && lo2 < u.w && !okW(lo2); n += 1) lo2 += 10;
    const rg = { min: Math.min(lo2, u.w), max: Math.max(hi2, u.w) };
    const nicheLocked = rg0.min === rg0.max;
    const lbl = `${t.en} ${i + 1}`; const lblAr = `${t.ar} ${i + 1}`;
    if (!nicheLocked) out.push(makeHandle({ // a niche whose width is derived from a parameter (washer, TV) has no width of its own: its parameter handle below does the job
      id: `cu:${u.id}:w`, unitId: inst.unit.id, unitIds: [pl.ids.base, pl.ids.wall].filter(Boolean), kind: last ? 'width' : 'split', dir: 'right', at: { u: inst.fu0 + inst.W, y: inst.y0 + inst.H * 0.45 }, value: u.w, min: rg.min, max: rg.max, step: 10,
      snap: snapList(rg.min, rg.max, widths.filter((_, j) => j !== i), STD_WIDTHS), group: 'unit', level: 1,
      label: T(`${lbl} width`, `عرض ${lblAr}`), tip: T('Drag left / right: unit width', 'اسحب يمينًا/يسارًا: عرض الوحدة'),
      reasons: { min: T(`This unit is at least ${rg.min} mm wide`, `أقل عرض لهذه الوحدة ${rg.min} مم`), max: T(`This unit is at most ${rg.max} mm wide`, `أعلى عرض لهذه الوحدة ${rg.max} مم`) },
      apply: (v) => { const r = setUnitWidth(cfg, d.units, i, v, keepW, p); return { next: r ? { ...d, units: r.units } : null, value: r ? r.units[i].w : u.w, clamped: !r || r.clamped }; },
    }));
    /* the selected unit's own options: counts */
    if (selected && (selected.unitId === pl.ids.base || selected.unitId === pl.ids.wall)) {
      (t.opts || []).filter((o) => o.t === 'step' && whenOk(o, { p, x, u, d })).forEach((o) => {
        const lower = /drawer|basket/.test(o.k); const ref = (lower ? bi : (wi && o.k === 'shelves' ? wi : bi)) || inst;
        out.push(makeHandle({
          id: `cu:${u.id}:${o.k}`, unitId: ref.unit.id, unitIds: [pl.ids.base, pl.ids.wall].filter(Boolean), kind: 'count', dir: 'up', pitch: 70, at: { u: ref.fu0 + Math.min(70, ref.W * 0.2), y: ref.y0 + ref.H * (lower ? 0.25 : 0.7) }, value: u[o.k], min: o.min, max: o.max, step: 1, group: 'count', level: 2, unit: '',
          label: T(`${lbl}: ${o.en}`, `${lblAr}: ${o.ar}`), tip: T(`Drag up / down: ${o.en}`, `اسحب لأعلى/لأسفل: ${o.ar}`), reasons: { min: T(`At least ${o.min}`, `على الأقل ${o.min}`), max: T(`At most ${o.max}`, `على الأكثر ${o.max}`) },
          apply: (v) => { const n = clamp(RI(v), o.min, o.max); return { next: { ...d, units: d.units.map((q, j) => (j === i ? { ...q, [o.k]: n } : q)) }, value: n, clamped: n !== RI(v) }; },
        }));
      });
    }
  });
  const [wLo, wHi] = widthRange(cfg, d.units, p);
  out.push(makeHandle({
    id: 'run:total', kind: 'width', dir: 'right', at: { u: L, y: Math.min(top * 0.5, surfaceY + 160) }, value: totalWidth(d.units), min: wLo, max: wHi, step: 10, snap: snapList(wLo, wHi, [], [900, 1200, 1500, 1800, 2400, 3000, 3600]), group: 'overall', level: 1,
    label: T('Total width', 'العرض الكلي'), tip: T('Drag left / right: total width (the units share it)', 'اسحب يمينًا/يسارًا: العرض الكلي (تتقاسمه الوحدات)'),
    reasons: { min: T(`The units need at least ${wLo} mm`, `تحتاج الوحدات ${wLo} مم على الأقل`), max: T(`The units fit at most ${wHi} mm`, `أقصى عرض للوحدات ${wHi} مم`) },
    apply: (v) => { const u2 = setTotalWidth(cfg, d.units, v, p); return { next: u2 ? { ...d, units: u2 } : null, value: u2 ? totalWidth(u2) : totalWidth(d.units), clamped: !u2 }; },
  }));

  /* ---- the parameters the drawing shows ---- */
  const prm = (key, id, at, dir, extra = {}) => {
    const sp = key && specOf(key); if (!sp || sp.t !== 'num' || !whenOk(sp, { p, x, d })) return;
    out.push(makeHandle({
      id, kind: extra.kind || 'height', dir, at, value: p[key], min: sp.min, max: sp.max, step: sp.step || 10, snap: SNAPS[key] ? SNAPS[key].filter((s) => s >= sp.min && s <= sp.max) : [], group: extra.group || 'overall', level: extra.level || 1,
      ratio: extra.ratio, unit: sp.unit || 'mm', label: T(sp.en, sp.ar), tip: T(`Drag to change: ${sp.en}`, `اسحب للتغيير: ${sp.ar}`),
      reasons: { min: T(`Minimum ${sp.min} ${sp.unit || 'mm'}`, `الحد الأدنى ${sp.min} ${sp.unit || 'مم'}`), max: T(`Maximum ${sp.max} ${sp.unit || 'mm'}`, `الحد الأقصى ${sp.max} ${sp.unit || 'مم'}`) },
      apply: (v) => { const n = normSpec(sp, v); return { next: { ...d, p: { ...d.p, [key]: n } }, value: n, clamped: n !== Math.round(v) && (v < sp.min || v > sp.max) }; },
    }));
  };
  if (showBase) {
    prm(map.surface, `p:${map.surface}`, { u: 0, y: surfaceY }, 'up');
    const fk = map.floor ? map.floor(p) : null;
    if (fk && g.plinthH > 0) prm(fk, `p:${fk}`, { u: 0, y: g.plinthH }, 'up');
    const tallI = baseInsts.find((q) => isTall(q.unit));
    if (tallI) prm(map.tall, `p:${map.tall}`, { u: tallI.fu0 + tallI.W / 2, y: tallI.y0 + tallI.H }, 'up', { group: 'unit' });
    if (map.splash && run.splashes && run.splashes[0]) { const bf = baseInsts.find((q) => !isTall(q.unit)); prm(map.splash, `p:${map.splash}`, { u: bf ? bf.fu0 + bf.W * 0.8 : L * 0.5, y: run.splashes[0].y1 }, 'up'); }
  }
  if (showWall && wallInsts.length) {
    if (map.gap) prm(map.gap, `p:${map.gap}`, { u: 0, y: lowerH(g) }, 'up');
    if (map.wallH) prm(map.wallH, `p:${map.wallH}`, { u: 0, y: lowerH(g) + g.wallH }, 'up');
  }
  if (map.panel && p.panel) prm(map.panel, `p:${map.panel}`, { u: L * 0.5, y: p.panelH }, 'up');
  /* the TV size: the niche's right edge. The niche width follows the TV, so a drag of w mm is w / (25.4 * 0.8716) inches */
  if (cfg.id === 'tv' && p.tvMount === 'wall') {
    const ni = wallInsts.find((q) => (q.elev || []).some((e) => e.kind === 'niche'));
    if (ni) prm('tvSize', 'p:tvSize', { u: ni.fu0 + ni.W, y: ni.y0 + ni.H / 2 }, 'right', { kind: 'width', group: 'niche', ratio: 1 / (25.4 * 0.8716) });
  }
  /* a laundry machine: the washer / dryer niche width */
  if (cfg.id === 'laundry') {
    const mi = d.units.findIndex((u) => /^(washer|dryer|stack)$/.test(u.type));
    const pl = mi >= 0 ? built.placed[mi] : null; const inst = pl && pl.ids.base ? run.units.find((q) => q.unit.id === pl.ids.base) : null;
    if (inst) prm('machineW', 'p:machineW', { u: inst.fu0 + inst.W, y: inst.y0 + inst.H * 0.7 }, 'right', { kind: 'width', group: 'niche' });
  }
  return out;
}
