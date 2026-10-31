/* Neo Kitchen Designer - the ONE component family behind the Wall, Top, L-Left and L-Right screens (UX-6):
 * plan card + front-plan diagram, summary cards, height slider, keep-constraint checkbox, add-unit button, option switch,
 * segmented row tabs, issue list and the isometric unit preview. Every piece is presentational: values and handlers come
 * from the screen (RowScreens.jsx), which gets them from the live model and commits through the same commit() as manual edits.
 * Colours only via the .nk-rk-* / .nk-pl-* rules in neoKitchen.css. */
import React, { useRef, useState, useEffect, useId } from 'react';
import { Toggle } from './ui';
import ParameterField from './ParameterField';
import { cmScale } from './fieldLogic';
import { UNIT_W } from './constants';
import { secHeights } from './geometry';
import { Ic } from './icons';
import { addUnitPlan, ADD_TYPES } from './wallLogic';

/** a centimetre input (inches in an inch project): commits every valid in-range value live, clamps on blur / Enter and says so.
 * Since UX-23 it is the shared ParameterField (centimetre scale, no slider, value + separate unit inside one box). */
export function CmField({ id, mm, min, max, onChange, unit = 'mm', lang = 'en', label, disabled }) {
  return (
    <span className="nk-rk-cm">
      <ParameterField id={id} hideLabel label={label} value={mm} min={min} max={max} scale={cmScale(unit)} slider={false} compact hideRange clampOnFinish
        lang={lang} disabled={disabled} onChange={onChange} />
    </span>
  );
}

export function PlanCard({ title, count, lang = 'en', tag, children, id, testid }) {
  return (
    <section className="nk-card nk-rk-card" id={id} data-testid={testid}>
      <div className="nk-card-head">
        <span className="nk-bar" />
        <h3 className="nk-h3">{title}</h3>
        {tag && <span className="nk-unit-tag">{tag}</span>}
        {count != null && <span className="nk-rk-count nk-mono" dir="ltr" data-testid="row-count">{count} {lang === 'ar' ? 'وحدات' : 'units'} · live</span>}
      </div>
      {children}
    </section>
  );
}

/** the vector front plan. `layout` comes from planLayout(); the SVG is never mirrored (it is a drawing of the real front). */
export function RowPlan({ layout, lang = 'en', label, lineLabel, onSelect, onResize, resizeLabel }) {
  const ref = useRef(null); const drag = useRef(false);
  const { W, H, items, marker, line, handle, legBars, mainClip, floorY, s } = layout;
  const clipId = `nkplc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const toX = (e) => { const svg = ref.current; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()).x; };
  const widthAt = (e) => (handle.flip ? (handle.px1 - toX(e)) / s : (toX(e) - handle.px0) / s);
  return (
    <figure className="nk-rk-plan">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="nk-pl" role="group" aria-label={label} data-scale={s} data-testid="row-plan">
        <line className="nk-pl-floor" x1={4} x2={W - 4} y1={floorY} y2={floorY} />
        {mainClip && <clipPath id={clipId}><rect x={mainClip.x} y={mainClip.y} width={mainClip.w} height={mainClip.h} /></clipPath>}
        {items.map((i) => (
          <g key={i.key} clipPath={mainClip && i.rk === 'main' ? `url(#${clipId})` : undefined} className={`nk-pl-u${i.ghost ? ' nk-pl-ghost' : ' nk-pl-focus'}${i.sel ? ' nk-pl-sel' : ''}${i.hidden ? ' nk-pl-hidden' : ''}${i.off ? ' nk-pl-off' : ''}${i.tall ? ' nk-pl-tall' : ''}`}
            data-unit={i.id} data-row={i.row} data-run={i.rk} data-x={i.x.toFixed(1)} data-w={i.width.toFixed(1)} data-h={i.height.toFixed(1)}
            role="button" tabIndex={0} aria-label={`${i.row} ${i.idx + 1}, ${i.label} cm${i.hidden ? (lang === 'ar' ? ' (مخفية)' : ' (hidden)') : ''}`} aria-pressed={i.sel}
            onClick={() => onSelect && onSelect({ unitId: i.id, partId: null })}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect && onSelect({ unitId: i.id, partId: null }); } }}>
            <rect x={i.x} y={i.y} width={i.width} height={i.height} rx="2" />
            {i.focus && !i.hidden && i.width >= 14 && <text className="nk-pl-t" x={i.x + i.width / 2} y={i.y + i.height / 2 + 3.5} textAnchor="middle">{i.label}</text>}
          </g>
        ))}
        {legBars && (
          <g className="nk-pl-legbars" aria-hidden="true">
            <rect x={legBars.x0} y={legBars.y0} width="3" height={Math.max(2, legBars.y1 - legBars.y0)} rx="1.5" />
            <rect x={legBars.x1} y={legBars.y0} width="3" height={Math.max(2, legBars.y1 - legBars.y0)} rx="1.5" />
          </g>
        )}
        {marker && (
          <g className="nk-pl-mark" data-testid="row-marker">
            <path d={`M${marker.x} ${marker.y0}V${marker.y1}M${marker.x - 4} ${marker.y0}H${marker.x + 4}M${marker.x - 4} ${marker.y1}H${marker.x + 4}`} />
            <text x={marker.x + 6} y={(marker.y0 + marker.y1) / 2 + 3.5} textAnchor="start">{marker.label}</text>
          </g>
        )}
        {handle && (
          <g className="nk-pl-handles">
            <rect className="nk-pl-pill" x={handle.pillX - 10} y={handle.pillY - 2.5} width="20" height="5" rx="2.5" />
            <circle className="nk-pl-h" cx={handle.x} cy={handle.y} r="6" tabIndex={0} role="slider" aria-label={resizeLabel}
              aria-valuemin={UNIT_W.min} aria-valuemax={UNIT_W.max} aria-valuenow={Math.round(Math.abs(handle.px1 - handle.px0) / s)}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; }}
              onPointerMove={(e) => { if (drag.current && onResize) onResize(handle.id, handle.row, handle.rk, widthAt(e)); }}
              onPointerUp={() => { drag.current = false; }}
              onKeyDown={(e) => {
                const d = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10 }[e.key];
                if (d && onResize) { e.preventDefault(); const cur = Math.abs(handle.px1 - handle.px0) / s; onResize(handle.id, handle.row, handle.rk, cur + d * (e.shiftKey ? 5 : 1) * (handle.flip ? -1 : 1)); }
              }}>
              <title>{lang === 'ar' ? 'اسحب لتغيير العرض' : 'Drag to resize'}</title>
            </circle>
          </g>
        )}
        {line && line.x1 > line.x0 && (
          <g className="nk-pl-line" data-testid="row-line">
            <path d={`M${line.x0} ${line.y}H${line.x1}M${line.x0} ${line.y - 3}V${line.y + 3}M${line.x1} ${line.y - 3}V${line.y + 3}`} />
            <text x={line.cx} y={line.ty} textAnchor="middle">{lineLabel}</text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/** the three summary cards. cells: [{ k, label, value, node? }] - `node` replaces the value (an input) */
export function SummaryCards({ cells }) {
  return (
    <div className="nk-rk-sum" data-testid="row-summary">
      {cells.map((c) => (
        <div key={c.k} className="nk-rk-sumc" data-k={c.k}>
          <span className="nk-rk-sumk">{c.label}</span>
          {c.node || <b className="nk-rk-sumv" dir="ltr">{c.value}</b>}
        </div>
      ))}
    </div>
  );
}

/** "Wall height  ----o----  72 cm": label, slider and the live value at the right. Values in mm, shown in cm (or inches). */
export function HeightSlider({ id, label, mm, min, max, step = 10, onChange, shown, disabled }) {
  return (
    <div className="nk-rk-slider">
      <label htmlFor={id} className="nk-rk-slider-l">{label}</label>
      <input id={id} type="range" className="nk-range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, mm))} disabled={disabled} aria-label={label}
        onChange={(e) => onChange(+e.target.value)} />
      <output htmlFor={id} className="nk-rk-slider-v nk-mono" dir="ltr" data-testid={`${id}-value`}>{shown}</output>
    </div>
  );
}

/** bordered "Unit height  ---o---  [ 72 ] cm" row: slider + numeric input; `hint` says which unit(s) it edits */
export function UnitHeightRow({ id, label, mm, min, max, step = 10, onChange, unit = 'mm', lang = 'en', hint, disabled }) {
  return (
    <div className="nk-rk-uh" data-testid="unit-height-row">
      <div className="nk-rk-uh-row">
        <label htmlFor={`${id}-n`} className="nk-rk-slider-l">{label}</label>
        <input id={id} type="range" className="nk-range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, mm))} disabled={disabled} aria-label={label} onChange={(e) => onChange(+e.target.value)} />
        <CmField id={`${id}-n`} label={label} mm={mm} min={min} max={max} unit={unit} lang={lang} onChange={onChange} disabled={disabled} />
      </div>
      {hint && <p className="nk-rk-hint" data-testid="unit-height-hint">{hint}</p>}
    </div>
  );
}

/** the keep-constraint checkbox with its calculated helper line */
export function KeepCheck({ id, checked, onChange, title, helper }) {
  return (
    <label className="nk-rk-keep" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><b>{title}</b><small data-testid={`${id}-helper`}>{helper}</small></span>
    </label>
  );
}

export function AddUnitButton({ onClick, lang = 'en', disabled }) {
  return <button type="button" className="nk-add nk-rk-add" onClick={onClick} disabled={disabled} data-testid="row-add">+ {lang === 'ar' ? 'أضف وحدة' : 'Add unit'}</button>;
}

/** label + helper on the left, a switch on the right (Bottom Cover / Top Cornice style rows) */
export function OptionSwitch({ label, hint, on, onChange }) {
  return (
    <div className="nk-rk-opt">
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <Toggle on={on} label={label} onChange={onChange} />
    </div>
  );
}

/** Base | Wall | Top segmented buttons: active = blue fill, white text */
export function SegTabs({ value, options, onChange, label }) {
  return (
    <div className="nk-pilltabs nk-rk-tabs" role="tablist" aria-label={label}>
      {options.map(([v, text, disabled]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} disabled={!!disabled} className="nk-pilltab" data-seg={v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

/** "stays valid" / warning list under a row (same look as the Shelves / Drawers card warnings) */
export function IssueList({ issues, lang = 'en', testid = 'row-issues' }) {
  if (!issues.length) return null;
  return (
    <ul className="nk-shelf-warn nk-rk-issues" role="status" aria-live="polite" data-testid={testid}>
      {issues.map((it, i) => <li key={i} data-level={it.level}>{lang === 'ar' ? it.ar : it.en}</li>)}
    </ul>
  );
}

/** small isometric preview of one unit: front face split by its sections, top and right faces, numbered blue marker */
export function UnitIso({ unit, H, n }) {
  const hs = secHeights(unit.secs, H); const tot = hs.reduce((a, b) => a + b, 0) || 1;
  const fw = 56; const fh = 64; const dx = 16; const dy = 9; const ox = 6; const oy = dy + 4;
  let y = 0;
  return (
    <svg viewBox={`0 0 ${fw + dx + ox * 2} ${fh + dy + 10}`} className="nk-iso" aria-hidden="true" data-testid="unit-iso">
      <path className="nk-iso-top" d={`M${ox} ${oy}L${ox + dx} ${oy - dy}H${ox + fw + dx}L${ox + fw} ${oy}Z`} />
      <path className="nk-iso-right" d={`M${ox + fw} ${oy}L${ox + fw + dx} ${oy - dy}V${oy - dy + fh}L${ox + fw} ${oy + fh}Z`} />
      <rect className="nk-iso-front" x={ox} y={oy} width={fw} height={fh} />
      {unit.secs.map((s, i) => {
        const h = (hs[i] / tot) * fh; const yy = oy + y; y += h;
        return i === 0 ? null : <line key={i} className="nk-iso-sec" x1={ox} x2={ox + fw} y1={yy} y2={yy} />;
      })}
      <circle className="nk-iso-n" cx={ox + 6} cy={oy + 8} r="7" /><text className="nk-iso-nt" x={ox + 6} y={oy + 11.2} textAnchor="middle">{n}</text>
    </svg>
  );
}

/* ---------------------------------------------------------------------------------------------------------------------------
 * UX-17 shared pieces (additive): the hide / show control + hidden-card class, and the one-click Add unit flow with its type menu.
 * Used by the Wall cards and available to every other row (Base / Top / legs) so all rows behave the same.
 * ------------------------------------------------------------------------------------------------------------------------ */
/** class for a unit card whose unit is hidden (model flag `unit.hidden`, set through patchUnit): the whole card greys out */
export const hiddenCardClass = (u) => (u && u.hidden ? ' nk-hid' : '');
export const eyeTip = (hidden, lang = 'en') => (hidden
  ? (lang === 'ar' ? 'تشغيل هذه الوحدة' : 'Turn this unit on')
  : (lang === 'ar' ? 'إيقاف هذه الوحدة (لا تُصنَّع ولا تظهر في قائمة القص)' : 'Turn this unit off (not built, not in the cut list)'));
/** the eye button: visible = plain eye; hidden = eye-slash with an orange outline + tint. `onToggle` flips unit.hidden through the screen's commit(). */
export function UnitEye({ hidden, onToggle, lang = 'en' }) {
  const tip = eyeTip(hidden, lang);
  return (
    <button type="button" className={`nk-ib nk-rk-eye nk-eye${hidden ? ' nk-eye-off' : ''}`} aria-pressed={!!hidden} aria-label={tip} title={tip} data-tip={tip} data-testid="unit-hide" onClick={onToggle}>
      <Ic n={hidden ? 'eyeOff' : 'eye'} size={16} />
    </button>
  );
}
const KIND_LABEL = {
  standard: ['Standard (door)', 'عادية (باب)'], glass: ['Glass door', 'باب زجاج'], drawers: ['Drawers', 'أدراج'], open: ['Open shelf', 'رف مفتوح'], flip: ['Flip-up', 'باب قلاب'],
};
/** add one unit to a row, select it and report why not when there is no room. Returns the plan ({ ok, id, en, ar }). */
export function addUnitFlow(P, rk, row, kind = 'standard') {
  const plan = addUnitPlan(P.model, rk, row, kind);
  if (plan.ok) { P.commit(plan.model, `add:${rk}${row}`); if (P.setSel) P.setSel({ unitId: plan.id, partId: null }); }
  return plan;
}
/** "+ Add unit": one click adds a standard unit (works like the reference); the caret opens the type menu (standard / glass / drawers / open shelf / flip-up). */
export function AddUnitMenu({ P, rk, row, lang = 'en', kinds }) {
  const [open, setOpen] = useState(false); const [msg, setMsg] = useState(''); const box = useRef(null);
  const list = kinds || ADD_TYPES[row] || ['standard'];
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  const run = (k) => { setOpen(false); const r = addUnitFlow(P, rk, row, k); setMsg(r.ok ? '' : (lang === 'ar' ? r.ar : r.en)); };
  return (
    <div className="nk-rk-addwrap" ref={box} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <div className="nk-rk-addrow">
        <button type="button" className="nk-add nk-rk-add" data-testid="row-add" onClick={() => run('standard')}>+ {lang === 'ar' ? 'أضف وحدة' : 'Add unit'}</button>
        {list.length > 1 && <button type="button" className="nk-add nk-rk-addcaret" aria-haspopup="menu" aria-expanded={open} aria-label={lang === 'ar' ? 'اختر نوع الوحدة' : 'Choose the unit type'} title={lang === 'ar' ? 'نوع الوحدة' : 'Unit type'} data-testid="row-add-menu" onClick={() => setOpen(!open)}><Ic n="down" size={16} /></button>}
      </div>
      {open && (
        <ul className="nk-rk-addmenu" role="menu" data-testid="row-add-list">
          {list.map((k) => <li key={k} role="none"><button type="button" role="menuitem" data-kind={k} onClick={() => run(k)}>{KIND_LABEL[k][lang === 'ar' ? 1 : 0]}</button></li>)}
        </ul>
      )}
      <p className="nk-clamp nk-rk-note" role="status" aria-live="polite" data-testid="row-add-note">{msg}</p>
    </div>
  );
}
