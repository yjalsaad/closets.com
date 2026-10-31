/* Neo Kitchen Designer - pure logic behind the "05 Shelves" card (no React, no colours).
 * shelfArtLayout(g): the front-view diagram geometry, generated from the real model.g values.
 * shelfIssues(model): plain-language warnings for values that are legal but risky, or that leave no usable shelf. */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* drawing scale (viewBox units per mm). Thickness is drawn at THK_K, play per side at PLAY_K (play is a few mm, so it is
   magnified more so that 1 mm is still visible); both are linear in the value, so a bigger number always draws bigger. */
export const SHELF_ART = { THK_K: 0.8, PLAY_K: 3, MIN_BOARD_W: 24, W: 320, H: 240 };

export function shelfArtLayout(g) {
  const { THK_K, PLAY_K, MIN_BOARD_W } = SHELF_ART;
  const FX0 = 58, FX1 = 258, FY0 = 14, FY1 = 218;
  const side = clamp((g.board || 18) * 0.5, 6, 12);
  const ix0 = FX0 + side, ix1 = FX1 - side, iy0 = FY0 + side, iy1 = FY1 - side;
  const ih = iy1 - iy0;
  const thk = clamp((+g.shelfThk || 0) * THK_K, 2, 44);
  const play = clamp((+g.shelfPlay || 0) * PLAY_K, 0, Math.max(0, (ix1 - ix0 - MIN_BOARD_W) / 2));
  const centres = [0.4, 0.78].map((f) => iy0 + ih * f);
  const shelves = centres.map((cy) => ({ y: cy - thk / 2, h: thk, x: ix0 + play, w: ix1 - ix0 - 2 * play, cy, dotY: cy + thk / 2 + 9 }));
  return { FX0, FX1, FY0, FY1, side, ix0, ix1, iy0, iy1, thk, play, shelves, dotX: [ix0 + 9, ix1 - 9] };
}

/** usable shelf width (mm) of the narrowest unit that carries a shelf; null when no unit has one */
export function narrowestShelfWidth(model) {
  const g = model.g; let best = null;
  Object.values(model.runs || {}).forEach((run) => ['base', 'wall', 'top'].forEach((row) => (run[row] || []).forEach((u) => {
    const hasShelf = (u.secs || []).some((s) => s.shelves > 0 || s.t === 'open');
    if (!hasShelf) return;
    const w = u.w - 2 * g.board - 2 * g.shelfPlay;
    if (best === null || w < best) best = w;
  })));
  return best;
}

/** [{ level: 'warn' | 'error', k, en, ar }] - empty when the shelf values are fine */
export function shelfIssues(model) {
  const g = model.g; const out = [];
  const w = narrowestShelfWidth(model);
  if (w !== null && w <= 0) out.push({ level: 'error', k: 'shelfPlay', en: `Clearance ${g.shelfPlay} mm per side leaves no shelf width in the narrowest cabinet. Reduce it.`, ar: `الخلوص ${g.shelfPlay} مم لكل جانب لا يترك عرضًا للرف في أضيق وحدة. قلّله.` });
  else if (w !== null && w < 150) out.push({ level: 'warn', k: 'shelfPlay', en: `Only ${Math.round(w)} mm of shelf width is left in the narrowest cabinet.`, ar: `يتبقى ${Math.round(w)} مم فقط من عرض الرف في أضيق وحدة.` });
  if (g.shelfPlay > 5 && !(w !== null && w <= 0)) out.push({ level: 'warn', k: 'shelfPlay', en: `A play of ${g.shelfPlay} mm per side is loose - the shelf may rock or slide.`, ar: `خلوص ${g.shelfPlay} مم لكل جانب واسع - قد يهتز الرف أو ينزلق.` });
  if (g.shelfThk < 12) out.push({ level: 'warn', k: 'shelfThk', en: `${g.shelfThk} mm board is thin - shelves may sag under load.`, ar: `اللوح ${g.shelfThk} مم رفيع - قد تنحني الرفوف تحت الحمل.` });
  if (g.shelfThk > 30) out.push({ level: 'warn', k: 'shelfThk', en: `${g.shelfThk} mm board is unusually thick for a shelf.`, ar: `اللوح ${g.shelfThk} مم سميك جدًا بالنسبة للرف.` });
  return out;
}
