/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - menu entry `neo-doors`. A parametric WOOD DOORS designer in the Neo Kitchen / Neo Closets style:
 * door types (flush, panel / shaker, moulded, glazed, louvre, barn, double leaf, pocket), opening + wall -> leaf size with clearances, core and skin,
 * panels and mouldings, glazing, frame / architrave / threshold, swing and hinges, lock and handle prep, vision panel, ventilation, fire rating note,
 * cut list + hardware + machining (DXF for CNC), warnings, price lines (PLACEHOLDER rates) and a Quote Max hand-off.
 * The engine is src/neoDoors/ (pure modules); the studio reuses the Neo Kitchen components. This file only mounts the studio (it owns the autosave
 * and the toast); keeping it thin keeps the lazy chunk's entry stable.
 * ===========================================================================*/
import React from 'react';
import NeoDoorsStudio from './neoDoors/NeoDoorsStudio';

export default function NeoDoorsDesigner({ currentUser, toast, onSendToQuote, startLang }) { // [WEB-STUDIO] startLang
  /* [UI-STD6] the same page-height wrapper as the Custom / Closets / category designers (the lead host trims it for its banner): without it the
     studio fell back to its 560px minimum and left an empty band under the drawing */
  return (
    <div style={{ height: 'var(--studio-h, calc(100vh - 150px))', minHeight: 640 }}>
      <NeoDoorsStudio startLang={startLang} currentUser={currentUser} toast={toast} onSendToQuote={onSendToQuote} />
    </div>
  );
}
export { NeoDoorsDesigner };
