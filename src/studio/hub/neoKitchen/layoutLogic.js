/* Neo Kitchen Designer UX-23 - pure workspace layout rules (no React, no DOM): where the three columns of the workspace
 * (Parameters panel | drawing stage | assistant) go for a given body width, how wide each may be, and how the stage tiers its toolbar.
 * The decision is made from the width the designer REALLY has (the .nk-body box, measured), not from the browser window: the Hub's own
 * sidebar and page margins take 90-290px, which is why a window-based breakpoint left the stage 300px wide on a 1366px screen.
 *
 *   planLayout({ bodyW, panelOn, asstOn, panelPref, asstPref, asstPrefMode })
 *     -> { panelMode: 'dock' | 'drawer', asstMode: 'dock' | 'float', panelW, asstW, stageW }
 * Rules: the stage never gets less than MIN_STAGE while a column is docked; when the preferred widths do not fit the assistant shrinks
 * first (to its minimum), then the Parameters panel; if even the minimums do not fit, the assistant floats instead of docking. Below DRAWER_BELOW the
 * Parameters panel is a slide-in drawer. */

export const LAYOUT = {
  PANEL: { min: 340, max: 600, def: 400 },
  ASST: { min: 300, max: 520, def: 340 },
  MIN_STAGE: 480,
  DRAWER_BELOW: 860, // body width under which the Parameters panel is a drawer
  DOCK_ASST_AT: 1180, // body width from which the assistant may dock beside the drawing
  HANDLE: 8, // width of one resize handle
  STEP: 16, // keyboard resize step (Shift = BIG_STEP)
  BIG_STEP: 64,
};

export const clampWidth = (kind, w) => {
  const r = kind === 'asst' ? LAYOUT.ASST : LAYOUT.PANEL;
  const n = Number.isFinite(+w) ? Math.round(+w) : r.def;
  return Math.min(r.max, Math.max(r.min, n));
};

export function planLayout({ bodyW, panelOn = true, asstOn = true, panelPref, asstPref, asstPrefMode = 'float' }) {
  const W = Number.isFinite(+bodyW) && +bodyW > 0 ? +bodyW : 1280;
  const H = LAYOUT.HANDLE;
  const panelMode = W >= LAYOUT.DRAWER_BELOW ? 'dock' : 'drawer';
  const dockPanel = panelMode === 'dock' && panelOn;
  let panelW = clampWidth('panel', panelPref === undefined ? LAYOUT.PANEL.def : panelPref);
  let asstW = clampWidth('asst', asstPref === undefined ? LAYOUT.ASST.def : asstPref);
  /* the assistant may dock only when the window is wide enough AND the stage still gets MIN_STAGE with both columns at their minimum */
  const minUsed = (dockPanel ? LAYOUT.PANEL.min + H : 0) + LAYOUT.ASST.min + H;
  const canDock = W >= LAYOUT.DOCK_ASST_AT && asstPrefMode !== 'float' && W - minUsed >= LAYOUT.MIN_STAGE;
  const dockAsst = canDock && asstOn;
  const avail = W - LAYOUT.MIN_STAGE;
  const used = () => (dockPanel ? panelW + H : 0) + (dockAsst ? asstW + H : 0);
  if (used() > avail && dockAsst) asstW = Math.max(LAYOUT.ASST.min, asstW - (used() - avail));
  if (used() > avail && dockPanel) panelW = Math.max(LAYOUT.PANEL.min, panelW - (used() - avail));
  const dockable = W >= LAYOUT.DOCK_ASST_AT && W - minUsed >= LAYOUT.MIN_STAGE; // the assistant COULD dock if the person asks (float is the default)
  return { panelMode, asstMode: canDock ? 'dock' : 'float', panelW, asstW, stageW: W - used(), dockPanel, dockAsst, dockable };
}

/** a resize handle: new width from a pointer move. `grow` is +1 when moving the pointer toward the stage enlarges the column. */
export const widthFromDrag = (kind, startW, dx, dir) => clampWidth(kind, startW + dx * dir);

/** keyboard on a handle: arrows move by STEP (Shift = BIG_STEP), Home / End jump to the limits, Enter resets. `dir` as above. */
export function widthFromKey(kind, w, key, shift, dir) {
  const r = kind === 'asst' ? LAYOUT.ASST : LAYOUT.PANEL;
  if (key === 'Home') return r.min;
  if (key === 'End') return r.max;
  if (key === 'Enter' || key === 'Delete') return r.def;
  const d = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : key === 'ArrowUp' ? 1 : key === 'ArrowDown' ? -1 : 0;
  if (!d) return w;
  return clampWidth(kind, w + d * dir * (shift ? LAYOUT.BIG_STEP : LAYOUT.STEP));
}

/** how much of the toolbar fits: 'roomy' (all labels), 'cozy' (labels on the view modes only), 'tight' (icons; extras in the More menu) */
export function stageTier(stageW) {
  const w = Number.isFinite(+stageW) ? +stageW : 1000;
  return w >= 900 ? 'roomy' : w >= 700 ? 'cozy' : 'tight';
}

/** header tier from the designer's own width: the brand line and the File / Export labels shrink before anything is clipped */
export function headTier(rootW) {
  const w = Number.isFinite(+rootW) ? +rootW : 1280;
  return w >= 1180 ? 'wide' : w >= 900 ? 'mid' : 'slim';
}

/** a definite height for the designer inside the Hub page: the room the page scroller really has below the designer's top edge,
 * minus the page's bottom padding; never below `min`. `scrollerH` = visible height of the page scroller, `offsetTop` = designer's top
 * inside the scroller's content, `padBottom` = bottom padding / margin that must stay clear. */
export function fitHeight({ scrollerH, offsetTop, padBottom = 0, min = 560 }) {
  const room = Math.floor((+scrollerH || 0) - (+offsetTop || 0) - (+padBottom || 0));
  return Math.max(min, room);
}
