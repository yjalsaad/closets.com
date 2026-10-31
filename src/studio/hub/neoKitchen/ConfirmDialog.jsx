/* Neo Kitchen Designer UX-23 - the designer's own confirmation dialog (replaces the browser's native window.confirm).
 * role="alertdialog" + aria-modal, focus moves to Cancel on open and returns to the opener on close, Tab / Shift+Tab are trapped, Esc and a
 * click on the scrim cancel. EN / AR (the caller passes the strings; dir follows `lang`). Visuals: the .nk-fm-* dialog classes of fileMenu.css. */
import React, { useEffect, useRef } from 'react';
import './fileMenu.css';

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, danger = true, lang = 'en', onConfirm, onCancel, testid = 'confirm' }) {
  const dlgRef = useRef(null);
  const cancelRef = useRef(null);
  const openerRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    const t = setTimeout(() => { if (cancelRef.current) cancelRef.current.focus(); }, 0);
    return () => {
      clearTimeout(t);
      const o = openerRef.current;
      if (o && typeof o.focus === 'function' && document.contains(o)) { try { o.focus(); } catch (e) { /* ignore */ } }
    };
  }, [open]);
  if (!open) return null;
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); onCancel(); return; }
    if (e.key !== 'Tab' || !dlgRef.current) return;
    const b = [...dlgRef.current.querySelectorAll('button')]; if (!b.length) return;
    const first = b[0]; const last = b[b.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="nk-fm-scrim" dir={lang === 'ar' ? 'rtl' : 'ltr'} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="nk-fm-dlg" role="alertdialog" aria-modal="true" aria-labelledby={`${testid}-t`} aria-describedby={`${testid}-d`} ref={dlgRef} onKeyDown={onKey} data-testid={testid}>
        <h3 className="nk-fm-dt" id={`${testid}-t`}>{title}</h3>
        <p className="nk-fm-dd" id={`${testid}-d`}>{message}</p>
        <div className="nk-fm-da">
          <button type="button" className="nk-btn" ref={cancelRef} data-testid={`${testid}-no`} onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`nk-btn ${danger ? 'nk-btn-danger' : 'nk-btn-primary'}`} data-testid={`${testid}-yes`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
