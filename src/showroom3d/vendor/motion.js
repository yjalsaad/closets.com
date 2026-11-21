/* VENDORED for the add-only YAS Bloom port (docs/showroom3d/ADDON-PORT.md). Copy of the website-integration branch file; kept here so the main site needs no changes. Do not import from the rest of the app. */
// motion.js — one place to ask "should anything move?" (prefers-reduced-motion). Used by carousels,
// auto-rotating 3D scenes and scripted scroll effects. CSS animations are covered by a11y.css.
import { useEffect, useRef, useState } from 'react';

const Q = '(prefers-reduced-motion: reduce)';
export function prefersReducedMotion() {
  try { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia(Q).matches; } catch (e) { return false; }
}
export function useReducedMotion() {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    let mq; try { mq = window.matchMedia(Q); } catch (e) { return undefined; }
    const h = () => setReduce(!!mq.matches);
    h();
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', h); else if (mq.removeListener) mq.removeListener(h); };
  }, []);
  return reduce;
}
// setInterval that never ticks while the visitor asks for reduced motion (auto-advancing carousels).
export function useAutoAdvance(fn, ms, enabled = true) {
  const reduce = useReducedMotion();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled || reduce) return undefined;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [enabled, reduce, ms]);
}
