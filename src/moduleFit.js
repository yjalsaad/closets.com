// moduleFit.js — pure, dependency-free cabinet-run module fitting.
//
// ONE shared source of truth for dividing a continuous cabinet run (in mm)
// into discrete standard-width base-cabinet modules. Both the 3D scene
// (KitchenScene3D) and the Bill of Materials (buildProductionDocs in App.js)
// call fitModules() so the visible cabinet count and the BOM cabinet count
// can never drift apart.
//
// Everything here is deterministic and guarded against NaN / 0 / negatives.

// Standard base-cabinet widths (mm), largest first. Greedy fit walks this list.
export const STD_WIDTHS = [1000, 900, 800, 600, 500, 450, 400, 300];

// Standard wardrobe BAY widths (mm), largest first. Wardrobe bays run wider
// than kitchen base cabinets, so the greedy fit walks this set instead when a
// caller passes { widths: WARDROBE_WIDTHS }. Default behaviour is unchanged.
export const WARDROBE_WIDTHS = [1000, 900, 800, 600, 500, 450];

// Smallest run we bother drawing a cabinet for (mm). Below this -> [].
const MIN_RUN = 250;
// Smallest standalone module width (mm). Remainders >= this become a filler
// panel; smaller remainders are absorbed into the previous module.
const MIN_MODULE = 250;

// Coerce to a finite, positive number; otherwise 0.
function safePos(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * fitModules(runMm, opts?) -> Array<{ width, filler }>
 * Divide a run (mm) into standard-width modules, largest-first (greedy),
 * distributing the remainder by adding a filler panel (50–299mm) or, when the
 * remainder is < 50mm, absorbing it by widening the last module slightly.
 * Returns [] for runs shorter than ~250mm. Pure & deterministic.
 */
export function fitModules(runMm, opts = {}) {
  const run = safePos(runMm);
  if (run < MIN_RUN) return [];

  const widths = Array.isArray(opts.widths) && opts.widths.length
    ? opts.widths.slice().filter(w => safePos(w) > 0).sort((a, b) => b - a)
    : STD_WIDTHS;
  const smallest = widths[widths.length - 1] || 300;

  const out = [];
  let remaining = run;

  // Greedily place the largest standard width that still fits.
  while (remaining >= smallest) {
    const w = widths.find(x => x <= remaining + 0.5);
    if (!w) break;
    out.push({ width: w, filler: false });
    remaining -= w;
  }

  // Distribute whatever is left over.
  if (remaining >= MIN_MODULE) {
    // Big enough to stand on its own: a filler/made-to-measure panel.
    out.push({ width: Math.round(remaining), filler: true });
    remaining = 0;
  } else if (remaining >= 50 && out.length) {
    // 50–249mm with no module yet large enough: still a filler panel so the
    // run is fully covered (e.g. a 300mm run that left ~0, or odd leftovers).
    out.push({ width: Math.round(remaining), filler: true });
    remaining = 0;
  } else if (remaining > 0 && out.length) {
    // <50mm: absorb into the last module so widths sum ~= run (no slivers).
    out[out.length - 1].width = Math.round(out[out.length - 1].width + remaining);
    remaining = 0;
  } else if (out.length === 0) {
    // Run between MIN_RUN and the smallest std width: one made-to-measure panel.
    out.push({ width: Math.round(run), filler: true });
  }

  return out;
}

// Convenience: number of discrete modules a run divides into.
export function moduleCount(runMm) {
  return fitModules(runMm).length;
}
