// dialog.jsx — one implementation of "a real modal" for every overlay on the site.
//   useDialog(ref, opts)  focus trap, Esc closes, focus returns to the trigger, body scroll lock, topmost-only
//   <ModalPanel>          a div with role=dialog + aria-modal + the hook applied
// Nothing here changes how an overlay looks: it only adds behaviour and ARIA.
import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  'textarea:not([disabled])', 'summary', '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => {
    if (el.hidden || el.closest('[inert]') || el.closest('[aria-hidden="true"]')) return false;
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    return !cs || (cs.visibility !== 'hidden' && cs.display !== 'none');
  });
}

// ── scroll lock shared by every open dialog (counter, so nested dialogs do not unlock early) ──
let lockCount = 0;
let prevOverflow = '';
function lockScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount++ === 0) { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
}
function unlockScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = prevOverflow;
}

// ── remember what the visitor last activated: Safari/Firefox do not focus a button on click, so
//    document.activeElement would be <body> and "focus returns to the trigger" would have nothing to return to ──
let lastTrigger = null;
let tracking = false;
function trackTrigger() {
  if (tracking || typeof document === 'undefined') return;
  tracking = true;
  const grab = (e) => { const t = e.target && e.target.closest && e.target.closest('button, a[href], [role="button"], summary'); if (t) lastTrigger = t; };
  document.addEventListener('pointerdown', grab, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') grab(e); }, true);
}

const stack = [];

export function useDialog(ref, { open = true, onClose, initialFocus, restoreFocus = true, lock = true } = {}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    trackTrigger();
    const node = ref.current;
    if (!node) return undefined;
    const active = document.activeElement;
    const trigger = active && active !== document.body ? active : lastTrigger;
    const token = {};
    stack.push(token);
    if (lock) lockScroll();
    const focusFirst = () => {
      const n = ref.current; if (!n) return;
      const el = (typeof initialFocus === 'function' ? initialFocus(n) : null) || n.querySelector('[data-autofocus]') || getFocusable(n)[0] || n;
      try { el.focus({ preventScroll: true }); } catch (e) { /* detached */ }
    };
    const t = setTimeout(focusFirst, 0);
    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      const n = ref.current; if (!n) return;
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        e.preventDefault(); e.stopPropagation();
        if (closeRef.current) closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable(n);
      if (!items.length) { e.preventDefault(); n.focus(); return; }
      const first = items[0]; const last = items[items.length - 1]; const cur = document.activeElement;
      if (!n.contains(cur)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (cur === first || cur === n)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    };
    const onFocusIn = (e) => {
      if (stack[stack.length - 1] !== token) return;
      const n = ref.current;
      if (n && !n.contains(e.target) && !(e.target.closest && e.target.closest('[data-dialog-ignore]'))) focusFirst();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocusIn);
      const i = stack.indexOf(token); if (i >= 0) stack.splice(i, 1);
      if (lock) unlockScroll();
      if (restoreFocus && trigger && trigger.isConnected && typeof trigger.focus === 'function') {
        try { trigger.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export function ModalPanel({ label, labelledBy, onClose, open = true, role = 'dialog', children, style, ...rest }) {
  const ref = useRef(null);
  useDialog(ref, { open, onClose });
  // no explicit name given: name the dialog after its first heading (fallback: the page title)
  useEffect(() => {
    const n = ref.current; if (!n || label || labelledBy) return;
    const h = n.querySelector('h1,h2,h3,h4,[role="heading"]');
    if (h) { if (!h.id) h.id = 'dlg-' + Math.random().toString(36).slice(2, 8); n.setAttribute('aria-labelledby', h.id); }
    else n.setAttribute('aria-label', document.title || 'Dialog');
  });
  return (
    <div ref={ref} role={role} aria-modal="true" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}
      tabIndex={-1} style={{ outline: 'none', ...style }} {...rest}>{children}</div>
  );
}

export default ModalPanel;
