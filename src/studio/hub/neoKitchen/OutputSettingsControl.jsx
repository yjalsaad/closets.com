/* =============================================================================
 * [NEO-OUTPUT-UX34] OutputSettings - the ONE "OUTPUT" block of every Neo studio: UNITS (MM | CM | INCH) and PRECISION (DRAFT | STANDARD | ULTRA)
 * as two segmented controls, with a caption that shows the live precision ("Ultra - 60+ points per curve"), and (inch only) the fraction option.
 *
 *   <OutputSettings lang variant="card" />   the persistent Output card (Global tab)
 *   <OutputSettings lang variant="menu" />   the compact block inside the File and Export menus (role=menu: the segments are menuitemradio)
 *
 * The state is the shared store in outputSettings.js (remembered per user in localStorage, saved in every project file), so every control on the
 * page - and every export, printed sheet, field and label that reads useOutput() - follows the same setting. The model stays in millimetres.
 * Keyboard: each control is a radiogroup with a roving tab stop; arrow keys move AND select, Home / End jump (mirrored in Arabic); Space / Enter select.
 * Styling: outputSettings.css, tokens only.
 * ===========================================================================*/
import React, { useSyncExternalStore, useId, useRef } from 'react';
import {
  UNITS, PRECISIONS, UNIT_LABEL, PRECISION_LABEL, FRACTION_DEN, normalizeOutput, getOutput, setOutput, subscribeOutput, precisionCaption,
} from './outputSettings';
import './outputSettings.css';

/** the shared setting: [output, setOutput]. The object only changes identity when a value changes, so it is safe as an effect / memo dependency. */
export function useOutput() {
  const o = useSyncExternalStore(subscribeOutput, getOutput, getOutput);
  return [o, setOutput];
}

/** one segmented control: role=radiogroup (card) or role=group of menuitemradio (inside a menu) */
function Segmented({ label, labelId, value, options, onPick, ar, menu, testid }) {
  const ref = useRef(null);
  const onKey = (e) => {
    const keys = menu ? ['ArrowRight', 'ArrowLeft'] : ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']; // inside a menu Up / Down / Home / End belong to the menu
    if (!keys.includes(e.key)) return;
    const i = options.findIndex(([v]) => v === value);
    const fwdKey = e.key === 'ArrowDown' || e.key === (ar ? 'ArrowLeft' : 'ArrowRight');
    const backKey = e.key === 'ArrowUp' || e.key === (ar ? 'ArrowRight' : 'ArrowLeft');
    let n = i;
    if (e.key === 'Home') n = 0; else if (e.key === 'End') n = options.length - 1; else if (fwdKey) n = Math.min(options.length - 1, i + 1); else if (backKey) n = Math.max(0, i - 1);
    e.preventDefault(); e.stopPropagation(); // the menu around us must not also move its own focus
    if (n !== i) {
      onPick(options[n][0]);
      const el = ref.current && ref.current.querySelectorAll('[data-seg]')[n]; if (el) el.focus();
    }
  };
  const role = menu ? 'menuitemradio' : 'radio';
  return (
    <div className="nk-ou-seg" role={menu ? 'group' : 'radiogroup'} aria-labelledby={labelId} aria-label={labelId ? undefined : label} ref={ref} onKeyDown={onKey} data-testid={testid}>
      {options.map(([v, txt]) => (
        <button key={v} type="button" data-seg={v} role={role} aria-checked={value === v} tabIndex={value === v ? 0 : -1} className="nk-ou-b" onClick={() => onPick(v)} data-testid={`${testid}-${v}`}>{txt}</button>
      ))}
    </div>
  );
}

export default function OutputSettings({ lang = 'en', variant = 'card', className = '', testid = 'output-settings', eyebrow = true }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const [out] = useOutput();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const menu = variant === 'menu'; // inside a role=menu the segments are menuitemradio; 'panel' = the compact look outside a menu (the File menu's card)
  const compact = variant !== 'card';
  const lblU = `nk-ou-u${uid}`; const lblP = `nk-ou-p${uid}`; const capId = `nk-ou-c${uid}`;
  const set = (patch) => setOutput(normalizeOutput({ ...getOutput(), ...patch }));
  const den = FRACTION_DEN[out.precision];
  return (
    <section className={`nk-ou nk-ou--${compact ? 'menu' : 'card'}${className ? ` ${className}` : ''}`} data-testid={testid} data-unit={out.unit} data-precision={out.precision} role={menu ? 'group' : undefined} aria-label={L('Output settings', 'إعدادات المخرجات')} lang={lang}>
      {eyebrow && <div className="nk-ou-eyebrow">{L('Output', 'المخرجات')}</div>}
      <div className="nk-ou-lab" id={lblU}>{L('Units', 'الوحدات')}</div>
      <Segmented label={L('Units', 'الوحدات')} labelId={lblU} value={out.unit} ar={ar} menu={menu} testid={`${testid}-unit`} onPick={(v) => set({ unit: v })}
        options={UNITS.map((u) => [u, UNIT_LABEL[u][ar ? 1 : 0]])} />
      <div className="nk-ou-lab" id={lblP}>{L('Precision', 'الدقة')}</div>
      <Segmented label={L('Precision', 'الدقة')} labelId={lblP} value={out.precision} ar={ar} menu={menu} testid={`${testid}-precision`} onPick={(v) => set({ precision: v })}
        options={PRECISIONS.map((p) => [p, PRECISION_LABEL[p][ar ? 1 : 0]])} />
      <p className="nk-ou-cap" id={capId} role="status" aria-live="polite" data-testid={`${testid}-caption`}>{precisionCaption(out.precision, lang)}</p>
      {out.unit === 'in' && (
        <label className="nk-ou-chk" data-testid={`${testid}-fraction`}>
          <input type="checkbox" checked={out.fraction} onChange={(e) => set({ fraction: e.target.checked })} />
          <span>{L(`Fractions (1/${den})`, `كسور (1/${den})`)}</span>
        </label>
      )}
      {!compact && <p className="nk-ou-note">{L('Applies to every export, printed sheet, label and field. Stored sizes stay in millimetres.', 'ينطبق على كل تصدير وورقة مطبوعة وملصق وحقل. المقاسات المخزّنة تبقى بالمليمتر.')}</p>}
    </section>
  );
}
