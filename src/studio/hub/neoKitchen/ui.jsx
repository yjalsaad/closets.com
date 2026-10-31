/* Neo Kitchen Designer - small shared UI pieces (no colours: classes + design tokens in neoKitchen.css). */
import React, { useState, useEffect } from 'react';
import ParameterField from './ParameterField';
import { getOutput, formatFraction, FRACTION_DEN } from './outputSettings';

export const IN = 25.4;
export const toUI = (mm, unit) => (unit === 'in' ? Math.round((mm / IN) * 100) / 100 : unit === 'cm' ? Math.round(mm) / 10 : Math.round(mm * 10) / 10);
export const fromUI = (v, unit) => (unit === 'in' ? v * IN : unit === 'cm' ? v * 10 : v);
/** [NEO-OUTPUT-UX34] on-screen length text: mm (as always), cm (1 dp) or inch (2 dp, or a fraction when the Output setting asks for one) */
export const fmtLen = (mm, unit) => (unit === 'in' ? (getOutput().fraction ? `${formatFraction(mm / IN, FRACTION_DEN[getOutput().precision])} in` : `${(mm / IN).toFixed(2)} in`) : unit === 'cm' ? `${(Math.round(mm) / 10).toFixed(1)} cm` : `${Math.round(mm * 10) / 10} mm`);
/** thin-space thousands grouping, e.g. 3 200 (the reference shows dimensions this way) */
export const grp = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function Seg({ value, options, onChange, label, className = '' }) {
  return (
    <div className={`nk-seg ${className}`} role="group" aria-label={label}>
      {options.map(([v, lbl, title, disabled]) => (
        <button key={v} type="button" className="nk-seg-b" aria-pressed={value === v} title={title} disabled={!!disabled} onClick={() => onChange(v)}>{lbl}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} className="nk-toggle" data-on={on ? '1' : '0'} onClick={() => onChange(!on)}>
      <span className="nk-knob" />
    </button>
  );
}

export function Badge({ children, tone = 'new' }) {
  return <span className={`nk-badge nk-badge-${tone}`}>{children}</span>;
}

/**
 * Slider + numeric input pair with the spec range always visible - since UX-23 a thin wrapper around ParameterField (the one parameter
 * input of the designer), so every existing call site keeps its props and gets the same field box, separate unit suffix, inline
 * validation and 40px height. The label is the accessible name; the visible label stays where the call site draws it.
 * onChange(mm) may return { clamped, value, min, max } so the field can say what the model did.
 */
export function NumField({ id, value, min, max, step = 1, unit = 'mm', uiUnit, onChange, label, slider = true, compact = false, lang = 'en', rangeNote, helper, error, disabled }) {
  return (
    <ParameterField id={id} hideLabel label={label} value={value} min={min} max={max} step={step} unit={unit} uiUnit={uiUnit} onChange={onChange}
      slider={slider} compact={compact} lang={lang} rangeNote={rangeNote} helper={helper} error={error} disabled={disabled} />
  );
}

export function Collapse({ title, children, defaultOpen = true, right }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="nk-card">
      <div className="nk-card-head">
        <button type="button" className="nk-card-title" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="nk-chev" data-open={open ? '1' : '0'}>▸</span>{title}
        </button>
        {right}
      </div>
      {open && <div className="nk-card-body">{children}</div>}
    </section>
  );
}

/** click-away + Esc closes a popover */
export function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, onClose, ref]);
}
