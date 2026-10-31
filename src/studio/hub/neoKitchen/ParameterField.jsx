/* Neo Kitchen Designer UX-23 - ParameterField: the ONE parameter input of the designer (and of the wardrobe studio, which shares it).
 *   label  ·  numeric input with a real width  ·  a SEPARATE unit suffix (inside the same field box, never on top of the value)
 *   optional slider  ·  min / max  ·  helper text and tooltip  ·  inline validation with an error / clamp message
 * Behaviour is the NumField contract it replaces: an in-range entry commits live, an out-of-range entry commits (clamped) when the entry
 * is finished (blur / Enter), arrow keys step (Shift = x10), Esc abandons the draft, Arabic-Indic digits are read. onChange(mm) may return
 * { clamped, value } so the field can say what the model did. Pure rules live in fieldLogic.js (unit-tested).
 * Layout: .nk-pf is a size container; the slider and the input sit in a grid (slider 1fr | input), and stack when the field is narrow.
 * `scale` (optional) changes how the model value is shown - the unit-width fields show centimetres (cmScale). */
import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import {
  validateEntry, scaleOf, rangeText, clampMessage, entryHint, stepEntry, fieldState, cmScale,
} from './fieldLogic';
import { Ic } from './icons';
import { useOutput } from './OutputSettingsControl';
import './controls.css';

export default function ParameterField({
  id, label, hideLabel = false, value, min, max, step = 1, unit = 'mm', uiUnit, scale, onChange, slider = true, compact = false, lang = 'en',
  rangeNote, helper, tip, error, disabled = false, testid, className = '', clampOnFinish = false, hideRange = false, sliderStep,
}) {
  const auto = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fid = id || `nkpf${auto}`;
  const [out] = useOutput(); // [NEO-OUTPUT-UX34] the display unit follows the Output setting unless the caller pins one (uiUnit)
  const ui = uiUnit || out.unit;
  const sc = useMemo(() => (scale && scale.auto ? cmScale(ui) : scale || scaleOf(unit, ui, step)), [scale, unit, ui, step]);
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const finished = useRef(false); // Enter finishes the entry and blur follows at once: the second call must not commit the same value again
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (t) => { setMsg(t); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 3200); };

  const entry = draft !== null ? validateEntry(draft, { min, max, scale: sc }) : null;
  const hint = entry ? entryHint(lang, entry.state, min, max, sc) : '';
  const state = fieldState({ entry, error, clampedNote: msg });

  const commit = (text, final) => {
    const v = validateEntry(text, { min, max, scale: sc });
    if (v.state === 'empty' || v.state === 'invalid') { if (final) setDraft(null); return; }
    if (final && sc.id && sc.id !== 'mm' && String(text).trim() === String(sc.to(value))) { setDraft(null); return; } // focus + blur without an edit never rewrites the model through a rounded cm / inch figure
    if (!final && v.state === 'out') return; // an out-of-range entry waits until the person has finished typing
    if (final) { if (finished.current) return; finished.current = true; } else finished.current = false;
    const r = onChange(v.state === 'out' && clampOnFinish ? v.clamped : v.mm);
    if (final) setDraft(null);
    const clamped = v.state === 'out' || (r && r.clamped);
    if (clamped) flash(clampMessage(lang, r && r.value !== undefined ? r.value : v.clamped, min, max, sc));
  };

  const range = rangeText(min, max, sc);
  const describedBy = [helper ? `${fid}-help` : '', `${fid}-err`, hideRange ? '' : `${fid}-rng`].filter(Boolean).join(' ');
  return (
    <div className={`nk-pf nk-num${compact ? ' nk-num-compact' : ''}${slider ? ' nk-pf-has-slider' : ''}${className ? ` ${className}` : ''}`} data-state={state} data-disabled={disabled ? '1' : '0'}>
      {!hideLabel && label && (
        <div className="nk-pf-head">
          <label className="nk-pf-label" htmlFor={fid}>{label}</label>
          {tip && <button type="button" className="nk-pf-tip nk-ib" aria-label={tip} data-tip={tip} title={tip}><Ic n="info" size={14} /></button>}
        </div>
      )}
      <div className="nk-pf-ctl nk-num-row">
        {slider && (
          <input type="range" className="nk-range nk-pf-slider" aria-label={label} disabled={disabled} min={min} max={max} step={sliderStep || step}
            value={Math.min(max, Math.max(min, value))} onChange={(e) => { const r = onChange(+e.target.value); void r; }} />
        )}
        <span className="nk-pf-box nk-inp-wrap" data-state={state}>
          <input
            id={fid} type="text" inputMode="decimal" dir="ltr" className="nk-inp nk-pf-input" disabled={disabled} data-testid={testid}
            aria-label={hideLabel ? label : undefined} aria-invalid={state === 'error' ? 'true' : undefined} aria-describedby={describedBy}
            title={range} autoComplete="off" spellCheck={false}
            value={draft !== null ? draft : String(sc.to(value))}
            onFocus={(e) => { finished.current = false; setDraft(String(sc.to(value))); e.target.select(); }}
            onChange={(e) => { setDraft(e.target.value); commit(e.target.value, false); }}
            onBlur={(e) => commit(e.target.value, true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { commit(e.currentTarget.value, true); e.currentTarget.blur(); }
              if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const nv = stepEntry(e.currentTarget.value, sc.to(value), e.key === 'ArrowUp' ? 1 : -1, sc.step, e.shiftKey, sc.id);
                setDraft(String(nv)); commit(String(nv), false);
              }
            }}
          />
          <span className="nk-unit nk-pf-unit" aria-hidden="true">{sc.label}</span>
        </span>
      </div>
      {!hideRange && <div className="nk-range-note nk-pf-rng" id={`${fid}-rng`}><span dir="ltr">{range}</span>{rangeNote ? <span> · {rangeNote}</span> : null}</div>}
      {helper && <div className="nk-pf-help" id={`${fid}-help`}>{helper}</div>}
      <div className="nk-clamp nk-pf-msg" id={`${fid}-err`} role="status" aria-live="polite" data-kind={error || hint ? 'error' : msg ? 'clamp' : undefined}>{error || hint || msg}</div>
    </div>
  );
}
