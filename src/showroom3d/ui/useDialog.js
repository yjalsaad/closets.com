import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for an overlay: moves focus in when it opens ([data-autofocus] first, else the first control), keeps Tab inside,
 * closes on Escape (the event is stopped so the 3D explorer never also sees it) and gives focus back to what had it (or `fallback`).
 */
export function useDialog(open, onClose, fallback) {
  const ref = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const el = ref.current; if (!open || !el) return undefined;
    const prev = document.activeElement;
    const items = () => [...el.querySelectorAll(FOCUSABLE)].filter((n) => !n.hidden && n.getAttribute('aria-hidden') !== 'true');
    const first = el.querySelector('[data-autofocus]') || items()[0]; if (first) first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const list = items(); if (!list.length) return;
      const a = list[0], z = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === a || !el.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !el.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    };
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      const back = prev && prev !== document.body && document.contains(prev) ? prev : (fallback && fallback());
      if (back && back.focus) { try { back.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return ref;
}
