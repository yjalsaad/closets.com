/* Orchestration of the full-viewport designer for the showroom (a hook so it can be unit-tested with a fake engine, no WebGL):
 *  - the open / close state machine (logic.js reduce)
 *  - pauses the showroom render loop while the designer is open and resumes it on close (`setPaused`); the scene is NOT disposed (rebuilding the hall would take seconds)
 *  - the browser Back button closes the designer instead of leaving the showroom (one history entry is pushed on open; with a design in progress Back asks first)
 *  - writes the showroom's language where the website reads it before the designer starts
 * The visitor's position never changes (the explorer is only frozen with setUiOpen), so closing returns them exactly where they stood. */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { reduce, initialState, isActive, isDirty, syncLang } from './logic';
import { sectionById } from './sections';

export const HIST_KEY = 'srDesigner';

export function useDesigner({ lang, setPaused, onClosed, storage, history: hist = typeof window !== 'undefined' ? window.history : null }) {
  const [ds, dispatch] = useReducer(reduce, initialState);
  const dsRef = useRef(ds); dsRef.current = ds;
  const langRef = useRef(lang); langRef.current = lang;
  const cb = useRef({ setPaused, onClosed }); cb.current = { setPaused, onClosed };
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : null);
  const pushed = useRef(false);

  const open = useCallback((sectionId) => {
    const sec = sectionById(sectionId); if (!sec || !sec.enabled || dsRef.current.status !== 'closed') return false;
    if (store) syncLang(langRef.current, store);
    try { if (hist) { hist.pushState({ ...(hist.state || {}), [HIST_KEY]: sectionId }, ''); pushed.current = true; } } catch (e) { pushed.current = false; }
    dispatch({ type: 'open', sectionId });
    return true;
  }, [hist, store]);

  const requestClose = useCallback(() => dispatch({ type: 'request-close' }), []);

  // a retry / reload starts the designer again: write the (possibly changed) language first
  useEffect(() => { if (ds.status === 'loading' && store) syncLang(langRef.current, store); }, [ds.attempt, ds.status]);   // eslint-disable-line react-hooks/exhaustive-deps

  // pause / resume the render loop
  const active = isActive(ds), was = useRef(false);
  useEffect(() => {
    if (active === was.current) return; was.current = active;
    cb.current.setPaused(active);
    if (!active) {
      // leave our history entry (only when it is still the current one: the designer's own navigation does not own it)
      try { if (pushed.current && hist && hist.state && hist.state[HIST_KEY]) hist.back(); } catch (e) { /* ignore */ }
      pushed.current = false; cb.current.onClosed && cb.current.onClosed(dsRef.current.reason);
    }
  }, [active, hist]);

  // the browser Back button
  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    const f = () => {
      const cur = dsRef.current; if (cur.status === 'closed') return;
      if (hist && hist.state && hist.state[HIST_KEY]) return;                      // still on our entry (a forward navigation): nothing to do
      pushed.current = false;
      if (isDirty(cur)) { try { hist.pushState({ ...(hist.state || {}), [HIST_KEY]: cur.sectionId }, ''); pushed.current = true; } catch (e) { /* ignore */ } dispatch({ type: 'request-close' }); }   // protect a design in progress: ask first
      else dispatch({ type: 'close', reason: 'back' });
    };
    window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f);
  }, [active, hist]);

  return { ds, dispatch, open, requestClose };
}
