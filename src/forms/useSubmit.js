// useSubmit.js — one safe submit pattern: single in-flight request (ref guard, so double-click / double-Enter in the
// same tick cannot fire twice), offline pre-check, "still working" hint on slow networks, hard timeout via AbortController,
// and the form data is never cleared on failure.
import { useCallback, useRef, useState } from 'react';
import { isOnline } from '../safety/useOnline';

export function useSubmit({ slowMs = 6000, timeoutMs = 30000 } = {}) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(false);
  const run = useCallback(async (fn) => {
    if (inFlight.current) return { ok: false, skipped: true };
    if (!isOnline()) { setOffline(true); return { ok: false, offline: true }; }
    setOffline(false);
    inFlight.current = true; setBusy(true); setSlow(false);
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const slowT = setTimeout(() => setSlow(true), slowMs);
    const abortT = setTimeout(() => { if (ac) ac.abort(); }, timeoutMs);
    try {
      const value = await fn(ac ? ac.signal : undefined);
      return { ok: true, value };
    } catch (error) {
      if (!isOnline()) setOffline(true);
      return { ok: false, error };
    } finally {
      clearTimeout(slowT); clearTimeout(abortT);
      inFlight.current = false; setBusy(false); setSlow(false);
    }
  }, [slowMs, timeoutMs]);
  return { run, busy, slow, offline, setOffline };
}
