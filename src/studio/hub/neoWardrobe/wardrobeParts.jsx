/* Neo Wardrobe Studio - the small shared pieces of the Parameters panel (a stepper, a card shell, a label / control row). */
import React from 'react';

export function Step({ value, min, max, onChange, label, disabled = false }) {
  return (
    <span className="nkw-step" role="group" aria-label={label}>
      <button type="button" className="nk-ib" aria-label={`${label} −`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>−</button>
      <output dir="ltr" aria-live="polite">{value}</output>
      <button type="button" className="nk-ib" aria-label={`${label} +`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}
export const Card = ({ title, children, note, className = '' }) => (
  <section className={`nk-card nkw-card ${className}`.trim()}>
    <div className="nk-card-head"><b className="nk-card-title">{title}</b></div>
    <div className="nkw-card-body">{children}</div>
    {note ? <p className="nk-sub nkw-note">{note}</p> : null}
  </section>
);
export const Row = ({ label, children }) => (<div className="nkw-row"><span className="nkw-row-l">{label}</span><div className="nkw-row-c">{children}</div></div>);
