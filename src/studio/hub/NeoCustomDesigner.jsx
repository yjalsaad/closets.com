/* =============================================================================
 * Neo Custom Designer (nav id 'neo-custom') - parametric builder for ONE-OFF furniture that fits no category: tables, beds, shelving, benches, consoles,
 * reception counters, display units, headboards ... Entry point next to Neo Kitchen Designer and Neo Closets Designer [NEO-CUSTOM-UX28].
 *
 * This file only owns what lives outside the studio: the design object (restored from the browser's autosave, written back after each edit), the price
 * and the "Send to Quote Max" hand-off. The engine is src/neoCustom/* (pure, unit-tested); the studio is src/neoCustom/NeoCustomStudio.jsx and reuses the
 * Neo Kitchen components (3D, cut list, exports, menus, assistant persona). No Supabase, no database write, no migration.
 * ===========================================================================*/
import './neoKitchen/cssOrder'; // [CI-CSS-ORDER] must stay the first import: fixes the shared stylesheet order
import './neoKitchen/materialsPro.css'; // [CI-CSS-ORDER] materialsPro before elevationPro, as in every other designer (Custom loads both)
import './neoKitchen/elevationPro.css';
import { getOutput } from './neoKitchen/outputSettings';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import NeoCustomStudio from './neoCustom/NeoCustomStudio';
import { normalizeDesign, designKey } from './neoCustom/customModel';
import { defaultDesign } from './neoCustom/customTemplates';
import { quoteHandoff } from './neoCustom/customPrice';

export const AUTOSAVE_KEY = 'neoCustom.autosave.v1';
export const HANDOFF_KEY = 'neo_custom_handoff';

/** the autosaved design of this browser, or null (private window / blocked storage / a damaged entry all read as "nothing saved") */
export function loadAutosave() {
  try {
    const t = window.localStorage.getItem(AUTOSAVE_KEY); if (!t) return null;
    const j = JSON.parse(t);
    if (!j || !j.design || !Array.isArray(j.design.parts)) return null;
    return normalizeDesign(j.design);
  } catch (e) { return null; }
}
export function saveAutosave(design) {
  try { window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ v: 1, at: new Date().toISOString(), design })); return true; } catch (e) { return false; }
}

export default function NeoCustomDesigner({ toast, currentUser, onSendToQuote, startLang }) {
  const restoredRef = useRef(false);
  const [design, setDesign] = useState(() => { const s = loadAutosave(); restoredRef.current = !!s; return s || defaultDesign(); });
  const [autosaveAt, setAutosaveAt] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const timer = useRef(null);
  const last = useRef(designKey(design));

  /* autosave: a moment after the last edit (local, this browser only) */
  useEffect(() => {
    const k = designKey(design);
    if (k === last.current && autosaveAt) return undefined;
    setSaveState('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (saveAutosave(design)) { setAutosaveAt(new Date().toLocaleTimeString()); setSaveState('saved'); } else setSaveState('failed');
      last.current = k;
    }, 600);
    return () => clearTimeout(timer.current);
  }, [design]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendToQuote = useCallback((built) => {
    const h = quoteHandoff(built.design, built.bom, built.est, getOutput());
    try { window.localStorage.setItem(HANDOFF_KEY, JSON.stringify(h)); } catch (e) { /* ignore */ }
    if (typeof toast === 'function') { try { toast('Custom piece sent to Quote Max as one line — PLACEHOLDER rates until the owner supplies the price list'); } catch (e) { /* ignore */ } }
    if (typeof onSendToQuote === 'function') onSendToQuote(h);
  }, [toast, onSendToQuote]);

  return (
    <div style={{ height: 'var(--studio-h, calc(100vh - 150px))', minHeight: 640 }}>
      <NeoCustomStudio design={design} onApply={setDesign} onSendToQuote={sendToQuote} toast={toast} currentUser={currentUser} startLang={startLang}
        autosaveAt={autosaveAt} saveState={saveState} restored={restoredRef.current} />
    </div>
  );
}
