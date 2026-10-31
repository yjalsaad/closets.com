/* Neo Kitchen Designer - the selected-cabinet card inside the docked Bonsai Assistant (UX-1b, extended in UX-12).
 * Edits a DRAFT copy of the model (review before apply): Apply validates the draft and hands it to the designer's commit() - the same
 * undoable history step as a manual edit - and Cancel throws it away. Only what the model really supports is offered: unit width
 * (with the "keep total width" rule and validation), the unit type, and the front division: section count, drag / keyboard REORDER,
 * type, leaves / drawers, calculated + draggable section heights, delete. A section picked here is selected through the designer's
 * existing `sel` (a scene part), so the 3D view and the elevation highlight it; a part picked there highlights its section here. */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SECTYPES, UNIT_W, UNIT_TYPES } from './constants';
import { normDigits, isTall, rowWidth } from './model';
import { secHeights } from './geometry';
import { Ic } from './icons';
import { grp } from './ui';
import {
  findUnit, unitHeight, stepMM, widthUnit, widthShown, widthFromShown, stepWidth, canSwitchTall, setSectionType, setSectionCount,
  removeSection, setDivisions, isDirty, moveSection, unitTypeChoices, changeUnitType, sectionCalc, setSectionFixed, dragDivider,
  validateUnitDraft, partForSection, sectionOfSelection, sameStructure, isCornerType,
} from './unitDraft';
import { onKeyActivate } from '../ui'; // [UI-STD 2026-10-30] keyboard activation for clickable non-buttons
import './assistantPro.css';

const ROWNAME = { base: ['Base', 'سفلي'], wall: ['Wall', 'علوي'], top: ['Top', 'ثالث'] };
const RUNNAME = { main: ['', ''], left: ['L-Left ', 'L يسار '], right: ['L-Right ', 'L يمين '], run2: ['Run 2 ', 'الصف ٢ '], pen: ['Peninsula ', 'الجزيرة الممتدة '], isl: ['Island ', 'الجزيرة '] };
const RUNLABEL = { main: ['Main run', 'الصف الرئيسي'], left: ['Left leg run', 'صف الرجل اليسرى'], right: ['Right leg run', 'صف الرجل اليمنى'], run2: ['Run 2', 'الصف ٢'], pen: ['Peninsula run', 'صف الجزيرة الممتدة'], isl: ['Island run', 'صف الجزيرة'] };
const cm1 = (mm) => Math.round(mm / 10 * 10) / 10;

/** schematic of the unit's divisions: one band per section, the picked one outlined, blue handles on the width edges and on every
 * divider (dividers drag / arrow-key to change the section above, like the elevation), and the total-width dimension underneath */
export function DivisionPreview({ unit, H, lang, widthLabel, selSec = null, onPick, onDivider, onDividerKey, tid = 'asst' }) {
  const svgRef = useRef(null);
  const [live, setLive] = useState(null); // divider index being dragged
  const hs = secHeights(unit.secs, H);
  const total = hs.reduce((a, b) => a + b, 0) || 1;
  const w = 150; const h = 190; const top = 4; const avail = h - top * 2; const x0 = 24; const x1 = w - 24;
  const ys = []; let y = top;
  hs.forEach((s) => { ys.push([y, (s / total) * avail]); y += (s / total) * avail; });
  const mid = selSec !== null && ys[selSec] ? ys[selSec][0] + ys[selSec][1] / 2 : top + avail / 2;
  const frac = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const ySvg = ((e.clientY - r.top) / r.height) * (h + 30);
    return Math.min(1, Math.max(0, (ySvg - top) / avail));
  };
  const down = (e, i) => { e.preventDefault(); e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); setLive(i); };
  const move = (e, i) => { if (live === i && onDivider) onDivider(i, frac(e)); };
  const up = () => setLive(null);
  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h + 30}`} className="nk-ac-prev" role="group" aria-label={lang === 'ar' ? 'تقسيم الوحدة' : 'Unit divisions'} data-testid={`${tid}-prev`}>
      <rect x={x0} y="2" width={x1 - x0} height={h - 2} className="nk-up-box" />
      {unit.secs.map((s, i) => {
        const [yy, hh] = ys[i];
        const label = SECTYPES[s.t] ? SECTYPES[s.t][lang === 'ar' ? 'ar' : 'en'].split(' (')[0] : s.t;
        const on = selSec === i;
        return (
          <g key={i} className={`nk-prev-sec${on ? ' nk-prev-sel' : ''}`} data-testid={`${tid}-prev-sec-${i}`} data-sel={on ? '1' : '0'}
            role="button" tabIndex={0} aria-pressed={on} aria-label={`${lang === 'ar' ? 'القسم' : 'Section'} ${i + 1}: ${label}`}
            onClick={() => onPick && onPick(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick && onPick(i); } }}>
            <rect x={x0 + 4} y={yy + 1.5} width={x1 - x0 - 8} height={Math.max(3, hh - 3)} className={`nk-pt nk-pt-${SECTYPES[s.t] ? SECTYPES[s.t].part : 'door'}`} />
            <text x={(x0 + x1) / 2} y={yy + hh / 2 + 3} textAnchor="middle" className="nk-ac-prev-t">{label}{s.t === 'drawer' || s.t === 'hob' ? ` ×${s.n}` : ''}</text>
          </g>
        );
      })}
      {unit.secs.slice(0, -1).map((s, i) => {
        const dy = ys[i][0] + ys[i][1];
        return (
          <g key={`d${i}`} className="nk-prev-div" data-testid={`${tid}-prev-div-${i}`} role="slider" tabIndex={0} aria-orientation="vertical"
            aria-label={`${lang === 'ar' ? 'حد ارتفاع القسم' : 'Height of section'} ${i + 1}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((hs[i] / total) * 100)}
            onPointerDown={(e) => down(e, i)} onPointerMove={(e) => move(e, i)} onPointerUp={up} onPointerCancel={up}
            onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); onDividerKey && onDividerKey(i, e.key === 'ArrowUp' ? -1 : 1); } }}>
            <rect x={x0} y={dy - 7} width={x1 - x0} height="14" className="nk-prev-hit" />
            <rect x={(x0 + x1) / 2 - 15} y={dy - 2.5} width="30" height="5" rx="2.5" className="nk-handle" />
          </g>
        );
      })}
      <rect x={x0 - 7} y={mid - 17} width="6" height="34" rx="3" className="nk-handle" aria-hidden="true" />
      <rect x={x1 + 1} y={mid - 17} width="6" height="34" rx="3" className="nk-handle" aria-hidden="true" />
      <line x1={x0} x2={x1} y1={h + 12} y2={h + 12} className="nk-ac-prev-dim" />
      <line x1={x0} x2={x0} y1={h + 7} y2={h + 17} className="nk-ac-prev-dim" />
      <line x1={x1} x2={x1} y1={h + 7} y2={h + 17} className="nk-ac-prev-dim" />
      <text x={w / 2} y={h + 27} textAnchor="middle" className="nk-ac-prev-w" data-testid={`${tid}-prev-w`}>{widthLabel}</text>
    </svg>
  );
}

function WidthInput({ valueMM, unit, onCommit, label }) {
  const [draft, setDraft] = useState(null);
  const shown = String(widthShown(valueMM, unit));
  const done = () => {
    if (draft === null) return;
    const n = parseFloat(normDigits(draft).replace(',', '.'));
    setDraft(null);
    if (Number.isFinite(n)) onCommit(widthFromShown(n, unit));
  };
  return (
    <span className="nk-ac-wv">
      <input type="text" inputMode="decimal" dir="ltr" className="nk-inp nk-ac-winp" aria-label={label} value={draft !== null ? draft : shown}
        onFocus={(e) => { setDraft(shown); e.target.select(); }} onChange={(e) => setDraft(e.target.value)} onBlur={done}
        onKeyDown={(e) => { if (e.key === 'Enter') { done(); e.currentTarget.blur(); } else if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); } }} />
      <span className="nk-ac-wu" dir="ltr">{widthUnit(unit)}</span>
    </span>
  );
}

const Grip = () => (
  <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" focusable="false">
    {[3, 8, 13].map((y) => [2.5, 7.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" />))}
  </svg>
);

/** live = no draft / Apply: every edit goes straight to onApply(model, key) (the Base screen: one undoable commit per edit);
 *  embedded = the card sits inside a screen's own unit card: no keep-width checkbox, a plain width field; headerExtra = buttons placed in the header row */
export default function UnitAssistCard({ model, lang, unit, target, onApply, scene, sel, onSelect, live = false, embedded = false, headerExtra = null }) {
  const T = live ? 'bp' : 'asst';
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const { rk, row, id } = target;
  const [d, setD] = useState(null); // { base, id, m }
  const [note, setNote] = useState('');
  const [localSec, setLocalSec] = useState(null); // picked section while the draft's structure differs from what the 3D shows
  const [drag, setDrag] = useState(null); // { from, over } while a section card is being dragged
  const listRef = useRef(null);
  const focusGrip = useRef(null);
  const draft = !live && d && d.base === model && d.id === id ? d.m : model;
  const dirty = useMemo(() => isDirty(model, draft), [model, draft]);
  const u = findUnit(draft, rk, row, id);
  const committedU = findUnit(model, rk, row, id);
  const check = useMemo(() => (u ? validateUnitDraft(model, draft, rk, row, id) : { errors: [], warnings: [] }), [model, draft, rk, row, id, u]);
  useEffect(() => { if (focusGrip.current !== null && listRef.current) { const b = listRef.current.querySelector(`[data-sec-handle="${focusGrip.current}"]`); if (b) b.focus(); focusGrip.current = null; } });
  if (!u) return null;
  const edit = (fn, key = 'e') => { const m = fn(draft); if (!m || m === draft) return; if (live) onApply(m, `${id}:${key}`); else setD({ base: model, id, m }); };
  const H = unitHeight(draft, rk, row, u);
  const calc = sectionCalc(draft, rk, row, u);
  const corner = isCornerType(u.type);
  const idx = draft.runs[rk][row].findIndex((x) => x.id === id);
  const name = `${RUNNAME[rk][lang === 'ar' ? 1 : 0]}${ROWNAME[row][lang === 'ar' ? 1 : 0]} ${idx + 1}${isTall(u) ? L(' · tall', ' · طويل') : ''}`;
  const wl = widthUnit(unit);
  const synced = sameStructure(u, committedU);
  const selSec = synced ? sectionOfSelection(scene, sel, id) : localSec;
  const pick = (si) => {
    setLocalSec(si);
    if (!synced || !onSelect) return;
    const p = partForSection(scene, id, si);
    if (p) onSelect({ unitId: id, partId: p.id, label: p.label });
  };
  const setW = (mm) => {
    const r = stepWidth(draft, rk, row, id, mm - u.w);
    const nu = findUnit(r.model, rk, row, id);
    setNote(r.clamped || (nu && Math.abs(nu.w - mm) > 0.5) ? L(`Limited to ${widthShown(nu ? nu.w : u.w, unit)} ${wl} (range ${widthShown(UNIT_W.min, unit)}-${widthShown(UNIT_W.max, unit)} ${wl}${draft.keepWidth ? ', other units must still fit' : ''})`, `تم الضبط على ${widthShown(nu ? nu.w : u.w, unit)} ${wl} (المدى ${widthShown(UNIT_W.min, unit)}-${widthShown(UNIT_W.max, unit)} ${wl}${draft.keepWidth ? '، وباقي الوحدات يجب أن تتسع' : ''})`) : '');
    if (r.model !== draft) { if (live) onApply(r.model, `${id}:w`); else setD({ base: model, id, m: r.model }); }
  };
  const step = (k) => setW(u.w + stepMM(k, unit));
  const cancel = () => { setD(null); setNote(''); setLocalSec(null); };
  const canApply = dirty && check.errors.length === 0;
  const apply = () => { if (!canApply) return; onApply(draft); setD(null); setNote(''); setLocalSec(null); };
  const move = (from, to) => { if (from === to || to < 0 || to >= u.secs.length) return; edit((m) => moveSection(m, rk, row, id, from, to)); setLocalSec(to); };
  const stepBtn = (k) => <button key={k} type="button" className="nk-ac-sb" aria-label={`${k > 0 ? '+' : '-'}${Math.abs(k)} ${wl}`} onClick={() => step(k)}>{k > 0 ? `+${k}` : `−${-k}`}</button>;
  const rowTotal = rowWidth(model.runs[rk][row]);
  const rowLabel = row === 'base' ? RUNLABEL[rk][lang === 'ar' ? 1 : 0] : `${ROWNAME[row][lang === 'ar' ? 1 : 0]} ${L('row', 'صف')}`;
  const types = unitTypeChoices(row);

  /* section card reorder: pointer drag on the grip (works for mouse, pen and touch) */
  const gripDown = (e, si) => { if (e.button !== undefined && e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); setDrag({ from: si, over: si }); };
  const gripMove = (e) => {
    if (!drag || !listRef.current) return;
    const cards = [...listRef.current.querySelectorAll('[data-secrow]')];
    let over = cards.length - 1;
    for (let i = 0; i < cards.length; i++) { if (e.clientY < cards[i].getBoundingClientRect().bottom) { over = i; break; } }
    if (over !== drag.over) setDrag({ from: drag.from, over });
  };
  const gripUp = () => { if (drag) { const { from, over } = drag; setDrag(null); if (over !== from) { focusGrip.current = over; move(from, over); } } };
  const gripKey = (e, si) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const to = si + (e.key === 'ArrowUp' ? -1 : 1); if (to >= 0 && to < u.secs.length) { focusGrip.current = to; move(si, to); } }
  };

  return (
    <section className="nk-ac" aria-label={L('Selected cabinet', 'الخزانة المحددة')} data-testid={`${T}-unit-card`} data-dirty={dirty ? '1' : '0'} data-valid={check.errors.length ? '0' : '1'}>
      <div className="nk-ac-top">
        <span className={`nk-ac-name${live && onSelect ? ' nk-ac-name-btn' : ''}`} {...(live && onSelect ? { role: 'button', tabIndex: 0, 'aria-pressed': !!(sel && sel.unitId === id), onClick: () => onSelect({ unitId: id, partId: null }), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ unitId: id, partId: null }); } } } : {})}><b>{name}</b> <span className="nk-c-3" dir="ltr" data-testid={`${T}-unit-w`}>{widthShown(u.w, unit)} {wl}</span></span>
        {types.length > 0 && (
          <label className="nk-ac-type">
            <span className="nk-sr">{L('Unit type', 'نوع الوحدة')}</span>
            <Ic n="down" size={14} />
            <select className="nk-select nk-pillsel" data-testid={`${T}-type`} value={u.type} aria-label={L('Unit type', 'نوع الوحدة')} onChange={(e) => edit((m) => changeUnitType(m, rk, row, id, e.target.value))}>
              {types.map((k) => <option key={k} value={k}>{UNIT_TYPES[k][lang === 'ar' ? 'ar' : 'en']}</option>)}
            </select>
          </label>
        )}
        {headerExtra && <span className="nk-ac-extra">{headerExtra}</span>}
      </div>
      <div className="nk-ac-w" role="group" aria-label={L('Width', 'العرض')}>
        <span className="nk-ac-wl">{L('Width', 'العرض')}</span>
        <span className="nk-ac-wg" dir="ltr">
          {!embedded && [-5, -1].map(stepBtn)}
          <WidthInput valueMM={u.w} unit={unit} onCommit={setW} label={`${name} ${L('width', 'عرض')} (${wl})`} />
          {!embedded && [1, 5].map(stepBtn)}
        </span>
      </div>
      {note && <div className="nk-clamp nk-ac-note" role="status" data-testid={`${T}-note`}>{note}</div>}
      {!embedded && <label className="nk-keep nk-ac-keep">
        <input type="checkbox" checked={draft.keepWidth} onChange={(e) => edit((m) => ({ ...m, keepWidth: e.target.checked }))} />
        <span><b>{L("Keep the kitchen's total width", 'تثبيت إجمالي عرض المطبخ')}</b>
          <small data-testid={`${T}-keep-help`}>{draft.keepWidth ? L(`${rowLabel} stays ${grp(rowTotal / 10)} cm; the other units share the change.`, `${rowLabel} يبقى ${grp(rowTotal / 10)} سم؛ والوحدات الأخرى تتشارك التغيير.`) : L('The run gets longer or shorter with this unit.', 'يطول الصف أو يقصر مع هذه الوحدة.')}</small></span>
      </label>}
      {corner ? (
        <p className="nk-cdesc">{L('Corner units use one special front, so there is no section division to edit.', 'وحدات الركن لها واجهة خاصة واحدة، فلا يوجد تقسيم للتعديل.')}</p>
      ) : (
        <div className="nk-ac-div">
          <DivisionPreview unit={u} H={H} lang={lang} widthLabel={`${widthShown(u.w, unit)} ${wl}`} selSec={selSec} onPick={pick}
            onDivider={(si, f) => edit((m) => dragDivider(m, rk, row, id, si, f), `dv${si}`)}
            onDividerKey={(si, dir) => edit((m) => setSectionFixed(m, rk, row, id, si, Math.round(calc[si].h + dir * 10)), `dv${si}`)} tid={T} />
          <div className="nk-ac-secs" ref={listRef}>
            <div className="nk-step nk-ac-nsec" role="group" aria-label={L('Number of sections', 'عدد الأقسام')}>
              <span className="nk-ac-wl">{L('Sections', 'عدد الأقسام')}</span>
              <span className="nk-ac-wg" dir="ltr">
                <button type="button" className="nk-ac-sb" aria-label={L('Fewer sections', 'أقسام أقل')} disabled={u.secs.length <= 1} onClick={() => edit((m) => setDivisions(m, rk, row, id, u.secs.length - 1))}>−</button>
                <span className="nk-step-v" data-testid={`${T}-nsec`}>{u.secs.length}</span>
                <button type="button" className="nk-ac-sb" aria-label={L('More sections', 'أقسام أكثر')} disabled={u.secs.length >= 8} onClick={() => edit((m) => setDivisions(m, rk, row, id, u.secs.length + 1))}>+</button>
              </span>
            </div>
            {u.secs.map((s, si) => {
              const leaves = s.t === 'door' || s.t === 'glass' || s.t === 'sink';
              const counted = leaves || s.t === 'drawer' || s.t === 'hob' || s.t === 'open';
              const on = selSec === si;
              const cls = `nk-ac-sec${on ? ' nk-ac-sec-on' : ''}${drag && drag.from === si ? ' nk-ac-sec-drag' : ''}${drag && drag.over === si && drag.from !== si ? (drag.over < drag.from ? ' nk-drop-before' : ' nk-drop-after') : ''}`;
              return (
                <div className={cls} key={si} role="group" aria-label={`${L('Section', 'القسم')} ${si + 1}`} data-secrow={si} data-testid={`${T}-sec-${si}`} data-sel={on ? '1' : '0'} data-type={s.t}
                  tabIndex={0} onKeyDown={onKeyActivate} onClick={(e) => { if (!e.target.closest('select, button, input')) pick(si); }}>
                  <div className="nk-ac-sec-r">
                    <button type="button" className="nk-ac-grip" data-sec-handle={si} data-testid={`${T}-grip-${si}`} aria-label={`${L('Reorder section', 'إعادة ترتيب القسم')} ${si + 1}`} title={L('Drag to reorder (or press Up / Down)', 'اسحب لإعادة الترتيب (أو اضغط السهم لأعلى / لأسفل)')}
                      disabled={u.secs.length < 2} onPointerDown={(e) => gripDown(e, si)} onPointerMove={gripMove} onPointerUp={gripUp} onPointerCancel={() => setDrag(null)} onKeyDown={(e) => gripKey(e, si)}><Grip /></button>
                    <span className="nk-sec-n">{si + 1}</span>
                    <select className="nk-select nk-pillsel" aria-label={`${L('Section type', 'نوع القسم')} ${si + 1}`} value={s.t} onFocus={() => pick(si)} onChange={(e) => edit((m) => setSectionType(m, rk, row, id, si, e.target.value))}>
                      {Object.entries(SECTYPES).map(([k, v]) => <option key={k} value={k}>{v[lang === 'ar' ? 'ar' : 'en']}</option>)}
                    </select>
                    <button type="button" className="nk-ib nk-ib-danger nk-ac-del" aria-label={`${L('Delete section', 'حذف القسم')} ${si + 1}`} disabled={u.secs.length < 2} onClick={() => edit((m) => removeSection(m, rk, row, id, si))}><Ic n="close" size={14} /></button>
                  </div>
                  <div className="nk-ac-sec-r nk-ac-sec-sub">
                    {leaves && (
                      <span className="nk-ac-leaves" dir="ltr" role="group" aria-label={L('Leaves', 'ضلف')} title={L('Door leaves', 'ضلف الباب')}>
                        {[1, 2].map((n) => <button key={n} type="button" className="nk-ac-sb" aria-pressed={s.n === n} aria-label={`${n} ${L('leaves', 'ضلف')}`} onClick={() => edit((m) => setSectionCount(m, rk, row, id, si, n))}>{n}</button>)}
                      </span>
                    )}
                    {counted && !leaves && (
                      <span className="nk-step" dir="ltr" role="group" aria-label={s.t === 'open' ? L('Shelves', 'رفوف') : L('Drawers', 'أدراج')}>
                        <button type="button" className="nk-ac-sb" aria-label={L('Fewer', 'أقل')} disabled={s.n <= 1} onClick={() => edit((m) => setSectionCount(m, rk, row, id, si, s.n - 1))}>−</button>
                        <span className="nk-step-v">{s.n}</span>
                        <button type="button" className="nk-ac-sb" aria-label={L('More', 'أكثر')} disabled={s.n >= 8} onClick={() => edit((m) => setSectionCount(m, rk, row, id, si, s.n + 1))}>+</button>
                      </span>
                    )}
                    <span className="nk-c-3 nk-ac-h" dir="ltr" data-testid={`${T}-h-${si}`}>{calc[si].auto ? 'auto · ' : ''}{cm1(calc[si].h)} cm</span>
                    {!calc[si].auto && <button type="button" className="nk-ac-auto" aria-label={L(`Section ${si + 1} height: back to auto`, `ارتفاع القسم ${si + 1}: تلقائي`)} onClick={() => edit((m) => setSectionFixed(m, rk, row, id, si, null))}>{L('Auto', 'تلقائي')}</button>}
                  </div>
                </div>
              );
            })}
            {!synced && <p className="nk-sub nk-ac-hint" data-testid={`${T}-unsynced`}>{L('The 3D view and elevation show the saved layout until you Apply.', 'العرض ثلاثي الأبعاد والواجهة يعرضان التصميم المحفوظ حتى تضغط تطبيق.')}</p>}
          </div>
        </div>
      )}
      {check.errors.length > 0 && (
        <ul className="nk-ac-msg nk-ac-err" role="alert" data-testid={`${T}-errors`}>{check.errors.map((x) => <li key={x.code}>{lang === 'ar' ? x.ar : x.en}</li>)}</ul>
      )}
      {check.warnings.length > 0 && dirty && (
        <ul className="nk-ac-msg nk-ac-warn" role="status" data-testid={`${T}-warnings`}>{check.warnings.map((x) => <li key={x.code}>{lang === 'ar' ? x.ar : x.en}</li>)}</ul>
      )}
      {!live && <div className="nk-rv-act">
        <button type="button" className="nk-btn" onClick={cancel} disabled={!dirty} data-testid={`${T}-unit-cancel`}>{L('Cancel', 'إلغاء')}</button>
        <button type="button" className="nk-btn nk-btn-primary" onClick={apply} disabled={!canApply} data-testid={`${T}-unit-apply`}>{L('Apply', 'تطبيق')}</button>
      </div>}
    </section>
  );
}
