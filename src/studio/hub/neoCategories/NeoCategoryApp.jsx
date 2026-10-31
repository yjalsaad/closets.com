/* Neo category studio [NEO-CATEGORIES-UX26] - the page-level component of a category menu entry (neo-bathroom, neo-laundry, neo-tv, neo-office).
 * Owns what the studio is controlled by: the design object (restored from the browser autosave, saved again 600 ms after the last change),
 * the language, and the "Send to Quote Max" hand-off (a custom quote line carrying the studio price, written to `neo_category_handoff`;
 * Quote Max reads it once). The Neo Wardrobe CAD does the same job for the closets studio. */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import CategoryStudio from './CategoryStudio';
import { defaultDesign, normalizeDesign, designKey } from './categoryModel';
import { handoffOf } from './categoryPrice';
import { getOutput } from '../neoKitchen/outputSettings';

const HANDOFF_KEY = 'neo_category_handoff';
const read = (cfg) => { try { const raw = localStorage.getItem(cfg.storageKey); if (!raw) return null; const s = JSON.parse(raw); return s && s.design && s.design.units ? { design: normalizeDesign(cfg, s.design), at: s.at || '' } : null; } catch (e) { return null; } };

export default function NeoCategoryApp({ cfg, toast, currentUser, onSendToQuote, startLang }) { // [WEB-STUDIO] startLang
  const init = useRef(null); if (!init.current) init.current = read(cfg);
  const [design, setDesign] = useState(() => (init.current ? init.current.design : defaultDesign(cfg)));
  const [restored, setRestored] = useState(!!init.current);
  const [savedAt, setSavedAt] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const rules = useMemo(() => ({}), []);
  const first = useRef(true);
  const key = designKey(cfg, design);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    setSaveState('saving');
    const t = setTimeout(() => {
      try { localStorage.setItem(cfg.storageKey, JSON.stringify({ design: normalizeDesign(cfg, design), at: new Date().toISOString() })); setSavedAt(new Date().toLocaleTimeString()); setSaveState('saved'); } catch (e) { setSaveState('failed'); }
    }, 600);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const onApply = useCallback((d) => { setDesign(d); setRestored(false); }, []);
  const sendToQuote = useCallback((W) => {
    const h = handoffOf(cfg, W, getOutput());
    try { localStorage.setItem(HANDOFF_KEY, JSON.stringify(h)); } catch (e) { /* quote still opens; the line is added by hand */ }
    if (typeof toast === 'function') { try { toast(`${cfg.noun[0]} sent to Quote Max — BD ${h.price.toFixed(2)} (placeholder rates)`, 'success'); } catch (e) { /* ignore */ } }
    if (typeof onSendToQuote === 'function') onSendToQuote(h);
  }, [cfg, toast, onSendToQuote]);
  return (
    <div style={{ height: 'var(--studio-h, calc(100vh - 150px))', minHeight: 640 }} data-testid={`cat-page-${cfg.id}`}>
      <CategoryStudio cfg={cfg} design={design} rules={rules} onApply={onApply} onSendToQuote={sendToQuote} toast={toast} currentUser={currentUser} startLang={startLang}
        savedAt={savedAt} saveState={saveState} restored={restored} onKeepRestored={() => setRestored(false)} />
    </div>
  );
}
export { HANDOFF_KEY };
