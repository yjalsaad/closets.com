// Field.jsx — accessible form field wrapper: a REAL <label htmlFor>, aria-invalid / aria-describedby / aria-required,
// and a visible error text. [DESIGN] Labels are visible by default (no placeholder-only inputs); pass hideLabel for the rare icon-only search.
import { useId } from 'react';
import { HONEYPOT_NAME } from './validate';

export default function Field({ label, error, hint, required, hideLabel = false, as = 'input', children, style, labelStyle, id: idProp, wrapStyle, ...rest }) {
  const auto = useId();
  const id = idProp || auto;
  const errId = id + '-err'; const hintId = id + '-hint';
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const ph = (!hideLabel && rest.placeholder === label) ? undefined : rest.placeholder;
  const common = { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy, 'aria-required': required ? 'true' : undefined, ...rest, placeholder: ph, className: ('inp' + (rest.className ? ' ' + rest.className : '')) };
  let control;
  if (as === 'select') control = <select {...common} style={style}>{children}</select>;
  else if (as === 'textarea') control = <textarea {...common} style={style} />;
  else control = <input {...common} style={style} />;
  return (
    <div className="field" style={wrapStyle}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'field-label'} style={hideLabel ? undefined : labelStyle}>{String(label).replace(/\s*\*\s*$/, '')}{required ? <span aria-hidden="true" className="req"> *</span> : null}</label>
      {control}
      {hint ? <div id={hintId} className="field-hint">{hint}</div> : null}
      {error ? <div id={errId} className="field-error" role="alert">{error}</div> : null}
    </div>
  );
}

// invisible honeypot (bots fill it, people never see or tab to it)
export function Honeypot({ value, onChange }) {
  return (
    <div className="hp-field" aria-hidden="true">
      <label>Leave this field empty<input type="text" name={HONEYPOT_NAME} tabIndex={-1} autoComplete="off" value={value || ''} onChange={(e) => onChange(e.target.value)} /></label>
    </div>
  );
}

export function FormStatus({ offline, slow, error, lang, t }) {
  if (!offline && !slow && !error) return <div aria-live="polite" role="status" className="sr-only" />;
  return (
    <div aria-live="polite" role="status">
      {offline ? <div className="form-banner form-banner--warn">{t('offline')}</div> : null}
      {!offline && slow ? <div className="form-banner form-banner--warn">{t('slow')}</div> : null}
      {error ? <div className="form-banner form-banner--err" role="alert">{error}</div> : null}
    </div>
  );
}
