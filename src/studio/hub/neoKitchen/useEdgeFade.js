/* Neo Kitchen Designer UX-23 - edge-fade hints for a horizontally scrolling strip (the category bar of the Parameters panel).
 * Sets data-fs="1" when there is more content before the visible window and data-fe="1" when there is more after it (RTL-aware: scrollLeft is
 * negative / reversed there, so the distance is measured with Math.abs), and scrolls the active chip into view when `activeKey` changes.
 * CSS (workspace.css) turns the attributes into a mask-image fade; without layout (tests) nothing is set. */
import { useEffect } from 'react';

export function edgeState(scrollLeft, clientWidth, scrollWidth) {
  const x = Math.abs(scrollLeft || 0);
  const max = Math.max(0, (scrollWidth || 0) - (clientWidth || 0));
  return { start: x > 2, end: max > 2 && x < max - 2 };
}

export function useEdgeFade(ref, activeKey) {
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const update = () => { const s = edgeState(el.scrollLeft, el.clientWidth, el.scrollWidth); el.setAttribute('data-fs', s.start ? '1' : '0'); el.setAttribute('data-fe', s.end ? '1' : '0'); };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof window !== 'undefined' && window.ResizeObserver ? new window.ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    return () => { el.removeEventListener('scroll', update); if (ro) ro.disconnect(); };
  }, [ref]);
  useEffect(() => {
    const el = ref.current; if (!el || activeKey === undefined) return;
    const a = el.querySelector('[aria-selected="true"]'); // scroll only the strip itself (scrollIntoView would also scroll the page around it)
    if (a) { const ar = a.getBoundingClientRect(); const er = el.getBoundingClientRect(); if (ar.left < er.left + 24) el.scrollLeft += ar.left - er.left - 24; else if (ar.right > er.right - 24) el.scrollLeft += ar.right - er.right + 24; }
  }, [ref, activeKey]);
}
