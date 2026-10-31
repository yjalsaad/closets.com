/* Neo Kitchen Designer - the Wall / Top unit card (UX-17): name + width, eye (hide / show) and delete, a large isometric preview drawn from the
 * LIVE unit (real section types incl. pale-blue glass doors, numbered markers, blue edge handles that resize the unit, an editable width
 * under it), the Sections stepper and ONE row per section: number, grip (drag / Up / Down to reorder), type dropdown, leaf buttons,
 * calculated "auto · N cm" height and a delete. Every control goes through the designer's commit() with the SAME model setters the sidebar
 * and the assistant use (setUnitWidth / setUnitHeight / setSectionType / setSectionCount / moveSection / removeSection ...), so each edit is one
 * undo step and shows at once in the plan, the 3D view, the elevation and the cut list. Colours only via wallPanel.css. */
import React, { useRef, useState, useEffect, useId } from 'react';
import './wallPanel.css';
import { Ic } from './icons';
import { UnitEye, hiddenCardClass } from './RowKit';
import { SECTYPES } from './constants';
import { deleteUnit, patchUnit, setUnitWidth, setUnitHeight, moveUnit, normDigits } from './model';
import {
  widthShown, widthFromShown, widthUnit, sectionCalc, setSectionType, setSectionCount, removeSection, moveSection, setDivisions, setSectionFixed, unitHeight, isCornerType,
} from './unitDraft';
import { isoLayout, dragWidth, dragHeight, sectionTypeChoices, countChoices, countKind, countMax } from './wallLogic';
import { onKeyActivate } from '../ui'; // [UI-STD 2026-10-30] keyboard activation for clickable non-buttons

const NAME = { wall: ['Wall', 'علوي'], top: ['Top', 'ثالث'], base: ['Base', 'سفلي'] };
const cm1 = (mm) => Math.round(mm) / 10;

/** the two-sided pane of one leaf / front, drawn inside its section box */
function SectionArt({ s, on }) {
  const pad = 2.5; const x = s.x + pad; const y = s.y + pad; const w = s.w - pad * 2; const h = Math.max(2, s.h - pad * 2);
  const cls = `wp-sec${on ? ' wp-sec-on' : ''}`;
  if (s.t === 'glass' || s.t === 'door' || s.t === 'sink') {
    const n = Math.max(1, s.n); const gap = 2; const lw = (w - gap * (n - 1)) / n; const glass = s.t === 'glass';
    return (
      <g className={cls} data-sec={s.i} data-type={s.t}>
        {Array.from({ length: n }, (_, l) => {
          const lx = x + l * (lw + gap);
          const right = n === 1 ? s.hinge !== 'R' : l >= n / 2 ? false : true; // handle on the free edge
          const hx = right ? lx + lw - 6 : lx + 4; const hh = Math.min(26, h * 0.3);
          return (
            <g key={l}>
              <rect className={glass ? 'wp-frame' : 'wp-door'} x={lx} y={y} width={lw} height={h} rx="1" />
              {glass && <rect className="wp-glass" x={lx + 5} y={y + 5} width={Math.max(2, lw - 10)} height={Math.max(2, h - 10)} data-glass="1" />}
              <rect className="wp-handle" x={hx} y={y + h / 2 - hh / 2} width="2.6" height={hh} rx="1.2" />
            </g>
          );
        })}
      </g>
    );
  }
  if (s.t === 'drawer' || s.t === 'hob') {
    const n = Math.max(1, s.n); const gap = 2; const dh = (h - gap * (n - 1)) / n;
    return (
      <g className={cls} data-sec={s.i} data-type={s.t}>
        {Array.from({ length: n }, (_, k) => (
          <g key={k}><rect className="wp-door" x={x} y={y + k * (dh + gap)} width={w} height={dh} rx="1" />
            <rect className="wp-handle" x={x + w / 2 - 13} y={y + k * (dh + gap) + 4} width="26" height="2.6" rx="1.2" /></g>
        ))}
      </g>
    );
  }
  if (s.t === 'flip' || s.t === 'cover') {
    return (
      <g className={cls} data-sec={s.i} data-type={s.t}>
        <rect className="wp-door" x={x} y={y} width={w} height={h} rx="1" />
        {s.t === 'flip' && <rect className="wp-handle" x={x + w / 2 - 14} y={y + h - 8} width="28" height="2.6" rx="1.2" />}
      </g>
    );
  }
  /* open shelf / niche: a recess with shelf lines */
  const lines = Math.max(0, Math.min(6, s.t === 'open' ? s.n : 1));
  return (
    <g className={cls} data-sec={s.i} data-type={s.t}>
      <rect className="wp-open" x={x} y={y} width={w} height={h} rx="1" />
      {Array.from({ length: lines }, (_, k) => <line key={k} className="wp-shelf" x1={x + 2} x2={x + w - 2} y1={y + ((k + 1) * h) / (lines + 1)} y2={y + ((k + 1) * h) / (lines + 1)} />)}
    </g>
  );
}

/** the isometric unit with its edge handles. Handles resize the unit: left / right = width (the same setter as the width field, so
 *  "keep the kitchen's width" is honoured), bottom = unit height. Arrow keys do the same (10 mm, Shift = 50 mm). */
export function WallIso({ unit, W, H, rowH, lang, hidden, active, onWidth, onHeight, minH }) {
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const lay = isoLayout(unit, W, H, rowH);
  const ref = useRef(null); const drag = useRef(null);
  const [live, setLive] = useState(false);
  const pid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ctm = () => { const svg = ref.current; const m = svg && svg.getScreenCTM && svg.getScreenCTM(); return m && m.a ? m.a : 1; };
  const start = (kind, side) => (e) => { if (hidden) return; if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); drag.current = { kind, side, x: e.clientX, y: e.clientY, W, H }; setLive(true); };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const k = ctm();
    if (d.kind === 'w') onWidth(dragWidth(d.W, (e.clientX - d.x) / k, d.side));
    else onHeight(dragHeight(d.H, (e.clientY - d.y) / k));
  };
  const end = () => { drag.current = null; setLive(false); };
  const key = (kind, side) => (e) => {
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (!d) return;
    e.preventDefault(); const step = 10 * (e.shiftKey ? 5 : 1);
    if (kind === 'w') onWidth(W + d * step * (side === 1 ? 1 : -1)); else onHeight(H + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) * step);
  };
  const midY = lay.y0 + lay.fh / 2;
  const hp = { tabIndex: hidden ? -1 : 0, 'aria-disabled': hidden || undefined };
  return (
    <svg ref={ref} viewBox={`0 0 ${lay.vw} ${lay.vh}`} className={`wp-iso${live ? ' wp-live' : ''}`} role="group" aria-label={L('Isometric preview of the unit (live)', 'معاينة مجسمة للوحدة (مباشرة)')} data-testid="unit-iso" data-w={W} data-h={H}>
      <defs><clipPath id={`wpc${pid}`}><rect x={lay.x0} y={lay.y0} width={lay.fw} height={lay.fh} /></clipPath></defs>
      <ellipse className="wp-floor" cx={lay.x0 + lay.fw / 2 + lay.dx / 2} cy={lay.bottom + 8} rx={lay.fw / 2 + lay.dx} ry="7" />
      <path className="wp-top" d={`M${lay.x0} ${lay.y0}L${lay.x0 + lay.dx} ${lay.y0 - lay.dy}H${lay.right + lay.dx}L${lay.right} ${lay.y0}Z`} />
      <path className="wp-side" d={`M${lay.right} ${lay.y0}L${lay.right + lay.dx} ${lay.y0 - lay.dy}V${lay.bottom - lay.dy}L${lay.right} ${lay.bottom}Z`} />
      <rect className="wp-body" x={lay.x0} y={lay.y0} width={lay.fw} height={lay.fh} />
      {lay.sections.map((s) => <SectionArt key={s.i} s={s} on={active === s.i} />)}
      {lay.sections.map((s) => (
        <g key={`n${s.i}`} className="wp-mark" data-testid="wp-mark"><circle cx={s.x + 10} cy={s.y + 10} r="8" /><text x={s.x + 10} y={s.y + 13.4} textAnchor="middle">{s.i + 1}</text></g>
      ))}
      <rect className="wp-outline" x={lay.x0} y={lay.y0} width={lay.fw} height={lay.fh} />
      <g className="wp-hdl" data-edge="left" {...hp} role="slider" aria-label={L('Drag the left edge to change the width', 'اسحب الحافة اليسرى لتغيير العرض')} aria-valuemin={0} aria-valuenow={W}
        onPointerDown={start('w', -1)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={key('w', -1)}>
        <rect x={lay.x0 - 7} y={midY - 17} width="9" height="34" rx="4.5" /><title>{L('Drag to resize', 'اسحب لتغيير العرض')}</title>
      </g>
      <g className="wp-hdl" data-edge="right" {...hp} role="slider" aria-label={L('Drag the right edge to change the width', 'اسحب الحافة اليمنى لتغيير العرض')} aria-valuenow={W}
        onPointerDown={start('w', 1)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={key('w', 1)}>
        <rect x={lay.right - 2} y={midY - 17} width="9" height="34" rx="4.5" /><title>{L('Drag to resize', 'اسحب لتغيير العرض')}</title>
      </g>
      <g className="wp-hdl" data-edge="bottom" {...hp} role="slider" aria-label={L('Drag the bottom edge to change the unit height', 'اسحب الحافة السفلية لتغيير ارتفاع الوحدة')} aria-valuenow={H} aria-valuemin={minH}
        onPointerDown={start('h', 1)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={key('h', 1)}>
        <rect x={lay.x0 + lay.fw / 2 - 17} y={lay.bottom - 2} width="34" height="9" rx="4.5" /><title>{L('Drag to change the height', 'اسحب لتغيير الارتفاع')}</title>
      </g>
      <g className="wp-dimline" aria-hidden="true"><path d={`M${lay.x0} ${lay.bottom + 24}H${lay.right}M${lay.x0} ${lay.bottom + 20}V${lay.bottom + 28}M${lay.right} ${lay.bottom + 20}V${lay.bottom + 28}`} /></g>
    </svg>
  );
}

/** the editable width under the preview: a blue underlined value, click to type (cm, or inches in an inch project) */
function WidthEdit({ mm, unit, lang, onCommit, disabled }) {
  const [edit, setEdit] = useState(false); const [txt, setTxt] = useState('');
  const ref = useRef(null);
  const wl = unit === 'in' ? 'in' : lang === 'ar' ? 'سم' : 'cm';
  useEffect(() => { if (edit && ref.current) { ref.current.focus(); ref.current.select(); } }, [edit]);
  const fin = (ok) => {
    setEdit(false);
    if (!ok) return;
    const n = parseFloat(normDigits(txt).replace(',', '.'));
    if (Number.isFinite(n)) onCommit(widthFromShown(n, unit));
  };
  if (edit) {
    return <input ref={ref} className="wp-dim-in nk-mono" dir="ltr" inputMode="decimal" aria-label={lang === 'ar' ? 'العرض' : 'Width'} value={txt} data-testid="wp-width-input"
      onChange={(e) => setTxt(e.target.value)} onBlur={() => fin(true)} onKeyDown={(e) => { if (e.key === 'Enter') fin(true); else if (e.key === 'Escape') fin(false); }} />;
  }
  return (
    <button type="button" className="wp-dim nk-mono" dir="ltr" disabled={disabled} data-testid="wp-width" title={lang === 'ar' ? 'انقر لتحرير العرض' : 'Click to edit the width'}
      onClick={() => { setTxt(String(widthShown(mm, unit))); setEdit(true); }}>{widthShown(mm, unit)} {wl}</button>
  );
}

/** the section type dropdown: a button (tooltip "Change type") that opens a listbox of the types this row supports. Arrow keys / Enter / Esc work. */
function TypeMenu({ value, choices, lang, onPick, disabled, id }) {
  const [open, setOpen] = useState(false); const [hi, setHi] = useState(0); const box = useRef(null); const btn = useRef(null);
  const lab = (k) => (SECTYPES[k] ? SECTYPES[k][lang === 'ar' ? 'ar' : 'en'].split(' (')[0].replace(/^Glass door$/, 'Glass') : k);
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  const openIt = () => { setHi(Math.max(0, choices.indexOf(value))); setOpen(true); };
  const pick = (k) => { setOpen(false); if (btn.current) btn.current.focus(); if (k !== value) onPick(k); };
  const onKey = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openIt(); } return; }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); if (btn.current) btn.current.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((hi + 1) % choices.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((hi + choices.length - 1) % choices.length); }
    else if (e.key === 'Home') { e.preventDefault(); setHi(0); } else if (e.key === 'End') { e.preventDefault(); setHi(choices.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(choices[hi]); }
    else if (e.key === 'Tab') setOpen(false);
  };
  return (
    <span className="wp-type" ref={box} onKeyDown={onKey}>
      <button type="button" ref={btn} className="wp-typebtn" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-lb` : undefined}
        aria-label={`${L('Change type', 'تغيير النوع')}: ${lab(value)}`} title={L('Change type', 'تغيير النوع')} data-tip={L('Change type', 'تغيير النوع')} data-testid="wp-type" data-value={value}
        onClick={() => (open ? setOpen(false) : openIt())}>
        <span>{lab(value)}</span><Ic n="retry" size={13} />
      </button>
      {open && (
        <ul className="wp-menu" role="listbox" id={`${id}-lb`} aria-label={L('Section type', 'نوع القسم')} aria-activedescendant={`${id}-o-${choices[hi]}`} data-testid="wp-type-list">
          {choices.map((k, i) => (
            <li key={k} id={`${id}-o-${k}`} role="option" aria-selected={k === value} data-value={k} className={`wp-opt${i === hi ? ' wp-opt-hi' : ''}${k === value ? ' wp-opt-on' : ''}`}
              onPointerEnter={() => setHi(i)} tabIndex={0} onKeyDown={onKeyActivate} onClick={() => pick(k)}>{lab(k)}</li>
          ))}
        </ul>
      )}
    </span>
  );
}

const Grip = () => (<svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" focusable="false"><g>{[3, 8, 13].map((y) => (<React.Fragment key={y}><circle cx="2.5" cy={y} r="1.3" /><circle cx="7.5" cy={y} r="1.3" /></React.Fragment>))}</g></svg>);

export function RowUnitCard({ P, rk, row, u, idx }) {
  const { model, lang, unit, commit, sel, setSel } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cardRef = useRef(null); const listRef = useRef(null); const focusGrip = useRef(null);
  const [confirm, setConfirm] = useState(false); const [drag, setDrag] = useState(null); const [note, setNote] = useState(''); const [actSec, setActSec] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (t) => { setNote(t); clearTimeout(timer.current); timer.current = setTimeout(() => setNote(''), 3600); };
  const selected = !!(sel && sel.unitId === u.id);
  useEffect(() => { if (selected && cardRef.current && cardRef.current.scrollIntoView) cardRef.current.scrollIntoView({ block: 'nearest' }); }, [selected]);
  useEffect(() => { if (focusGrip.current != null && listRef.current) { const b = listRef.current.querySelector(`[data-grip="${focusGrip.current}"]`); if (b) b.focus(); focusGrip.current = null; } });
  const rowName = NAME[row][lang === 'ar' ? 1 : 0];
  const legWord = rk === 'left' ? L(' left', ' يسار') : rk === 'right' ? L(' right', ' يمين') : rk === 'run2' ? L(' run 2', ' صف ٢') : '';
  const name = `${rowName}${legWord} ${idx + 1}`;
  const H = unitHeight(model, rk, row, u);
  const rowH = row === 'wall' ? model.g.wallH : model.g.topH;
  const hidden = !!u.hidden; const corner = isCornerType(u.type);
  const calc = sectionCalc(model, rk, row, u);
  const types = sectionTypeChoices(row);
  const wl = unit === 'in' ? 'in' : lang === 'ar' ? 'سم' : 'cm';
  const edit = (fn, key) => commit(fn(model), key);
  const setW = (mm) => {
    const r = setUnitWidth(model, rk, row, u.id, mm); commit(r.model, `w:${u.id}`);
    const nu = r.model.runs[rk][row].find((x) => x.id === u.id);
    if (nu && Math.abs(nu.w - mm) > 0.5) flash(L(`Limited to ${widthShown(nu.w, unit)} ${wl}`, `محدود بـ ${widthShown(nu.w, unit)} ${wl}`));
  };
  const setH = (mm) => commit(setUnitHeight(model, rk, row, u.id, Math.min(rowH, Math.max(200, mm))), `uh:${u.id}`);
  const n = u.secs.length;
  const move = (from, to) => { if (from === to || to < 0 || to >= n) return; edit((m) => moveSection(m, rk, row, u.id, from, to), `secmv:${u.id}`); };
  const gripDown = (e, si) => { if (hidden || (e.button !== undefined && e.button !== 0)) return; e.preventDefault(); if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); setDrag({ from: si, over: si }); };
  const gripMove = (e) => {
    if (!drag || !listRef.current) return;
    const rows = [...listRef.current.querySelectorAll('[data-secrow]')]; let over = rows.length - 1;
    for (let i = 0; i < rows.length; i++) { if (e.clientY < rows[i].getBoundingClientRect().bottom) { over = i; break; } }
    if (over !== drag.over) setDrag({ from: drag.from, over });
  };
  const gripUp = () => { if (drag) { const { from, over } = drag; setDrag(null); if (over !== from) { focusGrip.current = over; move(from, over); } } };
  const gripKey = (e, si) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const to = si + (e.key === 'ArrowUp' ? -1 : 1); if (to >= 0 && to < n) { focusGrip.current = to; move(si, to); } } };
  const toggleHidden = () => commit(patchUnit(model, rk, row, u.id, (x) => ({ ...x, hidden: !x.hidden })), `hide:${u.id}`);
  return (
    <section ref={cardRef} className={`nk-card nk-ucard nk-rk-ucard wp-card${selected ? ' nk-card-sel' : ''}${hiddenCardClass(u)}`} aria-label={name} id={`nk-unit-${u.id}`} data-unit={u.id} data-testid="unit-card" data-hidden={hidden ? '1' : '0'}>
      <div className="nk-unit-head nk-rk-uhead">
        <button type="button" className="nk-unit-name" onClick={() => setSel({ unitId: u.id, partId: null })} aria-pressed={selected}><b>{name}</b> <span dir="ltr" className="nk-c-3" data-testid="wp-head-w">{widthShown(u.w, unit)} {wl}</span></button>
        <div className="nk-iconbar">
          <button type="button" className="nk-ib wp-mv" aria-label={L('Move unit earlier', 'نقل الوحدة للخلف')} onClick={() => commit(moveUnit(model, rk, row, u.id, -1), `mv:${u.id}`)}>←</button>
          <button type="button" className="nk-ib wp-mv" aria-label={L('Move unit later', 'نقل الوحدة للأمام')} onClick={() => commit(moveUnit(model, rk, row, u.id, 1), `mv:${u.id}`)}>→</button>
          <UnitEye hidden={hidden} lang={lang} onToggle={toggleHidden} />
          <button type="button" className="nk-ib nk-rk-del" aria-label={L('Delete unit', 'حذف الوحدة')} title={L('Delete unit', 'حذف الوحدة')} disabled={hidden} data-testid="unit-delete" onClick={() => setConfirm(true)}><Ic n="close" size={16} /></button>
        </div>
      </div>
      {confirm && (
        <div className="nk-rk-confirm" role="alertdialog" aria-label={L('Confirm delete', 'تأكيد الحذف')} data-testid="unit-confirm">
          <span>{L(`Delete ${name}? You can undo it.`, `حذف ${name}؟ يمكنك التراجع.`)}</span>
          <button type="button" className="nk-btn nk-btn-danger" data-testid="unit-confirm-yes" onClick={() => { commit(deleteUnit(model, rk, row, u.id), `del:${u.id}`); setSel(null); setConfirm(false); }}>{L('Delete', 'حذف')}</button>
          <button type="button" className="nk-btn" data-testid="unit-confirm-no" onClick={() => setConfirm(false)}>{L('Cancel', 'إلغاء')}</button>
        </div>
      )}
      {hidden && <p className="nk-cdesc nk-rk-hidenote" data-testid="wp-hidenote">{L('Turned off: not built, left out of the 3D view, elevation and cut list. All its settings are kept and its width still counts in the row.', 'مُعطّلة: لا تُصنَّع ومستبعدة من العرض ثلاثي الأبعاد والرسم وقائمة القص. إعداداتها محفوظة وعرضها ما زال محسوبًا في الصف.')}</p>}
      <div className="wp-body-wrap" aria-disabled={hidden || undefined}>
        <WallIso unit={u} W={u.w} H={H} rowH={rowH} lang={lang} hidden={hidden} active={actSec} onWidth={setW} onHeight={setH} minH={200} />
        <div className="wp-dimrow"><WidthEdit mm={u.w} unit={unit} lang={lang} disabled={hidden} onCommit={setW} /></div>
        <div className="wp-note nk-clamp" role="status" aria-live="polite">{note}</div>
        {!corner && (
          <div className="wp-secs-h" role="group" aria-label={L('Sections', 'الأقسام')}>
            <span className="wp-secs-l">{L('Sections', 'الأقسام')}</span>
            <button type="button" className="nk-ib wp-step" disabled={hidden || n <= 1} aria-label={L('Fewer sections', 'أقسام أقل')} data-testid="wp-sec-minus" onClick={() => edit((m) => setDivisions(m, rk, row, u.id, n - 1), `nsec:${u.id}`)}>−</button>
            <span className="wp-secs-v nk-mono" dir="ltr" data-testid="wp-sec-count">{n}</span>
            <button type="button" className="nk-ib wp-step" disabled={hidden || n >= 8} aria-label={L('More sections', 'أقسام أكثر')} data-testid="wp-sec-plus" onClick={() => edit((m) => setDivisions(m, rk, row, u.id, n + 1), `nsec:${u.id}`)}>+</button>
          </div>
        )}
        {!corner && (
          <div className="wp-secrows" ref={listRef}>
            {u.secs.map((sec, si) => {
              const dragCls = `${drag && drag.from === si ? ' wp-drag' : ''}${drag && drag.over === si && drag.from !== si ? (drag.over < drag.from ? ' wp-drop-before' : ' wp-drop-after') : ''}`;
              return (
                <div key={si} className={`wp-secrow${dragCls}${actSec === si ? ' wp-secrow-on' : ''}`} data-secrow={si} data-testid="wp-secrow" role="group" aria-label={`${L('Section', 'القسم')} ${si + 1}`}
                  onPointerEnter={() => setActSec(si)} onPointerLeave={() => setActSec(null)} onFocus={() => setActSec(si)} onBlur={() => setActSec(null)}>
                  <span className="wp-secn" aria-hidden="true">{si + 1}</span>
                  <button type="button" className="wp-grip" data-grip={si} data-testid={`wp-grip-${si}`} disabled={hidden || n < 2} aria-label={`${L('Reorder section', 'إعادة ترتيب القسم')} ${si + 1}`} title={L('Drag to reorder (or press Up / Down)', 'اسحب لإعادة الترتيب (أو اضغط السهم لأعلى / لأسفل)')}
                    onPointerDown={(e) => gripDown(e, si)} onPointerMove={gripMove} onPointerUp={gripUp} onPointerCancel={() => setDrag(null)} onKeyDown={(e) => gripKey(e, si)}><Grip /></button>
                  <TypeMenu id={`${uid}s${si}`} value={sec.t} choices={types.includes(sec.t) ? types : [sec.t, ...types]} lang={lang} disabled={hidden}
                    onPick={(t) => edit((m) => setSectionType(m, rk, row, u.id, si, t), `sect:${u.id}:${si}`)} />
                  {countKind(sec.t) && countKind(sec.t) !== 'leaf' && (
                    <span className="wp-stepper" role="group" aria-label={countKind(sec.t) === 'drawer' ? L('Drawers', 'أدراج') : L('Shelves', 'رفوف')}>
                      <button type="button" className="nk-ib wp-step wp-step-s" disabled={hidden || sec.n <= 1} aria-label={L('fewer', 'أقل')} data-testid="wp-count-minus" onClick={() => edit((m) => setSectionCount(m, rk, row, u.id, si, sec.n - 1), `secn:${u.id}:${si}`)}>−</button>
                      <span className="nk-mono wp-stepv" dir="ltr" data-testid="wp-count-v">{sec.n}</span>
                      <button type="button" className="nk-ib wp-step wp-step-s" disabled={hidden || sec.n >= countMax(sec.t)} aria-label={L('more', 'أكثر')} data-testid="wp-count-plus" onClick={() => edit((m) => setSectionCount(m, rk, row, u.id, si, sec.n + 1), `secn:${u.id}:${si}`)}>+</button>
                    </span>
                  )}
                  {countKind(sec.t) === 'leaf' && (
                    <span className="wp-counts" role="group" aria-label={countKind(sec.t) === 'leaf' ? L('Leaves', 'ضلف') : countKind(sec.t) === 'drawer' ? L('Drawers', 'أدراج') : L('Shelves', 'رفوف')}>
                      {countChoices(sec).map((c) => (
                        <button key={c} type="button" className="wp-cnt" aria-pressed={sec.n === c} disabled={hidden} data-n={c} data-testid="wp-count"
                          onClick={() => edit((m) => setSectionCount(m, rk, row, u.id, si, c), `secn:${u.id}:${si}`)}>{c}</button>
                      ))}
                    </span>
                  )}
                  <span className="wp-auto nk-mono" dir="ltr" data-testid="wp-auto">{calc[si].auto ? 'auto · ' : ''}{cm1(calc[si].h)} cm</span>
                  {!calc[si].auto && <button type="button" className="wp-autob" disabled={hidden} aria-label={L(`Section ${si + 1} height: back to auto`, `ارتفاع القسم ${si + 1}: تلقائي`)} onClick={() => edit((m) => setSectionFixed(m, rk, row, u.id, si, null), `sech:${u.id}:${si}`)}>{L('Auto', 'تلقائي')}</button>}
                  <button type="button" className="wp-secdel" disabled={hidden || n < 2} aria-label={`${L('Delete section', 'حذف القسم')} ${si + 1}`} title={L('Delete section', 'حذف القسم')} data-testid="wp-secdel"
                    onClick={() => edit((m) => removeSection(m, rk, row, u.id, si), `secdel:${u.id}`)}><Ic n="close" size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
