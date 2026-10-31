/* Neo Kitchen Designer UX-15 - the ONE "active row" mechanism shared by the Carcass, Doors, Drawers and Shelves cards.
 * The active row (last focused / pressed input, or the row whose diagram callout was clicked) gets a light-blue band and a blue number badge,
 * and the diagram element it controls (ACTIVE_PARTS below -> data-part ids in the SVGs) is drawn pale yellow with an orange outline.
 * Rows edit through the same NumField -> setGlobal -> commit path as everywhere else, so the card behaves identically in the Global and M&S tabs. */
import React, { useState } from 'react';
import { NumField } from './ui';
import { FIELD } from './constants';
import { setGlobal } from './model';
import './globalCards.css';

/** row shown active on first render (0-based): Shelves 1, Drawers 2, Doors 2, Carcass 1 */
export const DEFAULT_ACTIVE = { shelves: 0, drawers: 1, doors: 1, carcass: 0 };

/** card id -> per-row list of diagram parts (data-part ids) drawn highlighted while that row is active.
 * The carcass diagram keeps its own board / recess / slot mapping (carcassArt.CARCASS_SEL), driven by the same `sel`. */
export const ACTIVE_PARTS = {
  shelves: [['shelf-1'], ['shelf-1', 'play']],
  drawers: [['front', 'lowerFront'], ['boxRight'], ['bottom']],
  doors: [['doorOpen'], ['doorClosed'], ['cup-top', 'cup-bot'], ['cup-top', 'cup-bot']],
};

/** parts highlighted for row `sel` of `cardId` (empty array for an unknown card / row) */
export const activeParts = (cardId, sel) => (ACTIVE_PARTS[cardId] && ACTIVE_PARTS[cardId][sel]) || [];

/** '1' when part `id` is in the active list - the diagrams put this on data-hl */
export const isHl = (parts, id) => (parts && parts.indexOf(id) >= 0 ? '1' : '0');

/** { sel, setSel, pick, parts } - pick(i) selects row i and moves focus into its input (a diagram callout click / Enter / Space) */
export function useActiveRow(card) {
  const [sel, setSel] = useState(DEFAULT_ACTIVE[card.id] || 0);
  const pick = (i) => {
    setSel(i);
    const el = document.getElementById(`nk-in-${card.f[i].k}`);
    if (el) { el.focus(); el.select && el.select(); }
  };
  return { sel, setSel, pick, parts: activeParts(card.id, sel) };
}

/** the numbered numeric rows of a card; `active` = the useActiveRow() result */
export function CardRows({ card, P, active, rowClass = '' }) {
  const { model, lang, unit, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return card.f.map((f, i) => (
    <div className={`nk-shelf-row nk-ar-row ${rowClass}`.trim()} key={f.k} data-field={f.k} data-on={active.sel === i ? '1' : '0'}
      aria-current={active.sel === i ? 'true' : undefined}
      onFocus={() => active.setSel(i)} onPointerDown={() => active.setSel(i)}>
      <span className="nk-cn" aria-hidden="true">{i + 1}</span>
      <div className="nk-ctl-t">
        <label htmlFor={`nk-in-${f.k}`} className="nk-ctl-name">{L(f.en, f.ar)}</label>
        <p className="nk-ctl-d">{f.d[lang]}</p>
      </div>
      <div className="nk-shelf-in">
        <NumField id={`nk-in-${f.k}`} label={L(f.en, f.ar)} value={model.g[f.k]} min={f.min !== undefined ? f.min : FIELD[f.k].min} max={f.max !== undefined ? f.max : FIELD[f.k].max} step={f.step || 1} uiUnit={unit} lang={lang} slider={false} compact
          onChange={(v) => { if (P.setField) return P.setField(f.k, v); const r = setGlobal(model, f.k, v); commit(r.model, `g:${f.k}`); return r; }} />
      </div>
    </div>
  ));
}
