/* Neo Kitchen Designer - the Base screen of the Parameters sidebar (UX-14): "Base cabinets" plan card with the live front plan (draggable
 * dividers between units, total-width handles), keep-total-width checkbox, three summary cards (total width is editable), the
 * "+ Add unit" type menu and one card per base unit (type, turn off, delete with confirmation, width, front editor).
 * Built from the UX-6 RowKit pieces and the UX-12 UnitAssistCard in `live` mode. Every number comes from the live model and every edit goes through
 * the designer's commit() (one undoable step), so the plan, the 3D view, the elevation, the cut list and the exports always agree. */
import React, { useRef, useState, useEffect } from 'react';
import { Collapse } from './ui';
import { Ic } from './icons';
import { UNIT_W, KITCHEN } from './constants';
import { setRunWidth, rowWidth, overallH, worktopH, deleteUnit, isTall, normDigits, runLenRange, RUN_NAMES } from './model';
import { widthShown, widthFromShown, widthUnit } from './unitDraft';
import { rowTitle } from './rowPlan';
import { rowIssues } from './rowLogic';
import { basePlanLayout, moveDivider, planAddUnit, addRoom, toggleUnitOff, ADD_TYPES } from './basePlan';
import { PlanCard, SummaryCards, KeepCheck, CmField, IssueList, OptionSwitch } from './RowKit';
import { Fields, CATEGORY_FIELDS } from './CategoryPanels';
import UnitAssistCard from './UnitAssistCard';
import './basePanel.css';

const cmTxt = (mm, unit, lang) => `${widthShown(mm, unit)} ${lang === 'ar' && unit !== 'in' ? 'سم' : widthUnit(unit)}`;
const RUNLABEL = RUN_NAMES;

/** the vector front plan. SVG is never mirrored (it draws the real front); pointer drags are absolute (width = pointer - unit edge), so they never drift */
export function BasePlan({ layout, lang = 'en', unit = 'mm', label, onSelect, onDivider, onTotal }) {
  const ref = useRef(null); const drag = useRef(null);
  const { W, H, items, dividers, bars, line, widthY, floorY, s } = layout;
  const toX = (e) => { const svg = ref.current; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()).x; };
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const grab = (e, d) => { e.stopPropagation(); e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); drag.current = { ...d, x0: toX(e), s0: s }; };
  const move = (e) => {
    const d = drag.current; if (!d) return; const x = toX(e);
    if (d.kind === 'div') onDivider(d.dv.aId, d.dv.bId, (d.dv.dir * (x - d.dv.aEdge)) / d.s0);
    else onTotal(d.total + (d.dir * (x - d.x0)) / d.s0);
  };
  const up = () => { drag.current = null; };
  return (
    <figure className="nk-rk-plan nk-bp-plan">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="nk-pl nk-bp-svg" role="group" aria-label={label} data-scale={s} data-testid="row-plan">
        <line className="nk-pl-floor" x1={4} x2={W - 4} y1={floorY} y2={floorY} />
        {items.map((i) => (
          <g key={i.key} className={`nk-pl-u${i.ghost ? ' nk-pl-ghost' : ' nk-pl-focus'}${i.sel ? ' nk-pl-sel' : ''}${i.hidden ? ' nk-pl-hidden' : ''}${i.off ? ' nk-pl-off' : ''}${i.tall ? ' nk-pl-tall' : ''}`}
            data-unit={i.id} data-row={i.row} data-run={i.rk} data-x={i.x.toFixed(1)} data-w={i.width.toFixed(1)} data-h={i.height.toFixed(1)}
            role="button" tabIndex={0} aria-label={`${i.row} ${i.idx + 1}, ${i.label} cm${i.hidden ? L(' (turned off)', ' (مطفأة)') : ''}`} aria-pressed={i.sel}
            onClick={() => onSelect && onSelect({ unitId: i.id, partId: null })}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect && onSelect({ unitId: i.id, partId: null }); } }}>
            <rect x={i.x} y={i.y} width={i.width} height={i.height} rx="2" />
            {i.focus && (i.fronts || []).map((f) => (
              <g key={f.i} className={`nk-bp-front nk-bp-f-${f.t}`} data-sec={f.i} data-type={f.t}>
                <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="1" />
                {f.lines.map((l, k) => <line key={k} x1={l.x1} x2={l.x2} y1={l.y1} y2={l.y2} />)}
              </g>
            ))}
            {i.focus && i.sinkAt && <text className="nk-bp-sink" data-testid="plan-sink" x={i.sinkAt.x} y={i.sinkAt.y} textAnchor="middle">sink</text>}
            {i.focus && i.tall && !i.hidden && i.width >= 14 && <text className="nk-bp-tall" x={i.x + 2} y={i.y + 8}>{L('tall', 'طويلة')}</text>}
            {i.focus && i.hidden && i.width >= 14 && <text className="nk-bp-offt" x={i.x + i.width / 2} y={i.y + i.height / 2 + 3} textAnchor="middle">{L('off', 'مطفأة')}</text>}
          </g>
        ))}
        {items.filter((i) => i.focus && i.width >= 11).map((i) => (
          <text key={`w${i.key}`} className="nk-bp-w" data-testid="plan-width" data-unit={i.id} x={i.x + i.width / 2} y={widthY} textAnchor="middle">{widthShown(i.w, unit)}</text>
        ))}
        {dividers.map((d) => (
          <circle key={d.key} className={`nk-bp-div${drag.current && drag.current.dv && drag.current.dv.key === d.key ? ' nk-bp-div-on' : ''}`} data-testid="plan-divider" data-a={d.aId} data-b={d.bId} cx={d.x} cy={d.y} r="5.5" tabIndex={0} role="slider"
            aria-label={L('Move the boundary between two units', 'تحريك الحد بين وحدتين')} aria-valuemin={UNIT_W.min} aria-valuemax={UNIT_W.max} aria-valuenow={Math.round(d.aMM)}
            onPointerDown={(e) => grab(e, { kind: 'div', dv: d })} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            onKeyDown={(e) => {
              const k = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10 }[e.key];
              if (k) { e.preventDefault(); onDivider(d.aId, d.bId, d.aMM + k * (e.shiftKey ? 5 : 1) * d.dir); }
            }}>
            <title>{L('Drag to move the boundary (the neighbour takes the difference)', 'اسحب لتحريك الحد (يتغير عرض الجار)')}</title>
          </circle>
        ))}
        {bars && [['l', bars.left, -1], ['r', bars.right, 1]].map(([k, x, dir]) => (
          <rect key={k} className="nk-bp-bar" data-testid={`plan-total-${k}`} x={x} y={bars.y} width="4" height={bars.h} rx="2" tabIndex={0} role="slider"
            aria-label={L('Change the total width', 'تغيير العرض الكلي')} aria-valuemin={KITCHEN.width.min} aria-valuemax={KITCHEN.width.max} aria-valuenow={Math.round(bars.total)}
            onPointerDown={(e) => grab(e, { kind: 'tot', dir, total: bars.total })} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            onKeyDown={(e) => { const d = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10 }[e.key]; if (d) { e.preventDefault(); onTotal(bars.total + d * (e.shiftKey ? 5 : 1) * (dir === -1 ? -1 : 1)); } }}>
            <title>{L('Drag to change the total width (the free units share it)', 'اسحب لتغيير العرض الكلي (تتقاسمه الوحدات الحرة)')}</title>
          </rect>
        ))}
        {line && line.x1 > line.x0 && (
          <g className="nk-pl-line" data-testid="row-line">
            <path d={`M${line.x0} ${line.y}H${line.x1}M${line.x0} ${line.y - 3}V${line.y + 3}M${line.x1} ${line.y - 3}V${line.y + 3}`} />
            <text x={line.cx} y={line.ty} textAnchor="middle">{cmTxt(line.mm, unit, lang)}</text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/** "+ Add unit" -> a menu of the unit types the model supports, with an optional custom width; refused (with the reason) when it does not fit */
export function AddUnitMenu({ P, rk }) {
  const { model, lang, unit, commit, setSel } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const [open, setOpen] = useState(false); const [txt, setTxt] = useState(''); const [msg, setMsg] = useState('');
  const box = useRef(null);
  const room = addRoom(model, rk);
  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [open]);
  const n = parseFloat(normDigits(txt).replace(',', '.'));
  const custom = txt.trim() !== '' && Number.isFinite(n) ? Math.round(widthFromShown(n, unit)) : null;
  const pick = (key) => {
    if (txt.trim() !== '' && custom === null) { setMsg(L('Type a width in numbers, or leave it empty for the default.', 'اكتب العرض بالأرقام أو اتركه فارغًا للافتراضي.')); return; }
    const r = planAddUnit(model, rk, key, custom);
    if (!r.ok) { setMsg(lang === 'ar' ? r.ar : r.en); return; }
    commit(r.model, `add:${rk}base`); setSel({ unitId: r.id, partId: null }); setMsg(''); setTxt(''); setOpen(false);
  };
  /* one click = a standard unit at the end of the run (60 cm, or what is free), selected and scrolled into view */
  const quick = () => {
    const w = Math.min(600, Math.floor(room / 10) * 10);
    const r = planAddUnit(model, rk, 'standard', w >= UNIT_W.min ? w : null);
    if (!r.ok) { setMsg(lang === 'ar' ? r.ar : r.en); setOpen(false); return; }
    commit(r.model, `add:${rk}base`); setSel({ unitId: r.id, partId: null }); setMsg('');
  };
  return (
    <div className="nk-bp-addwrap" ref={box} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <div className="nk-bp-addrow">
        <button type="button" className="nk-add nk-rk-add" data-testid="row-add" onClick={quick}>+ {L('Add unit', 'أضف وحدة')}</button>
        <button type="button" className="nk-btn nk-bp-types" data-testid="row-add-menu" aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setMsg(''); }}>{L('Types', 'الأنواع')} <Ic n="down" size={14} /></button>
      </div>
      {!open && msg && <div className="nk-clamp nk-bp-menu-msg" role="alert" data-testid="add-msg-quick">{msg}</div>}
      {open && (
        <div className="nk-bp-menu" role="menu" aria-label={L('Unit type', 'نوع الوحدة')} data-testid="add-menu">
          <p className="nk-bp-menu-free" data-testid="add-room">{room >= UNIT_W.min ? L(`Up to ${widthShown(room, unit)} ${widthUnit(unit)} is free${model.keepWidth ? ' (the other units can share it)' : ''}.`, `المتاح حتى ${widthShown(room, unit)} ${widthUnit(unit)}${model.keepWidth ? ' (تتقاسمه الوحدات الأخرى)' : ''}.`) : L('No free space for another unit.', 'لا توجد مساحة لوحدة أخرى.')}</p>
          <label className="nk-bp-menu-w"><span>{L('Custom width', 'عرض مخصص')}</span>
            <span className="nk-inp-wrap"><input type="text" inputMode="decimal" dir="ltr" className="nk-inp" data-testid="add-width" aria-label={L('Custom width of the new unit', 'عرض الوحدة الجديدة')} placeholder={L('default', 'افتراضي')} value={txt} onChange={(e) => { setTxt(e.target.value); setMsg(''); }} /><span className="nk-unit">{widthUnit(unit)}</span></span></label>
          <div className="nk-bp-menu-list">
            {ADD_TYPES.map((t) => {
              const ok = planAddUnit(model, rk, t.key, custom).ok;
              return (
                <button key={t.key} type="button" role="menuitem" className="nk-bp-mi" data-type={t.key} data-ok={ok ? '1' : '0'} data-testid={`add-${t.key}`} onClick={() => pick(t.key)}>
                  <b>{lang === 'ar' ? t.ar : t.en}</b>
                  <small dir="auto">{(custom == null ? widthShown(t.w, unit) : widthShown(custom, unit))} {widthUnit(unit)} · {t.hint[lang === 'ar' ? 1 : 0]}</small>
                </button>
              );
            })}
          </div>
          <div className="nk-clamp nk-bp-menu-msg" role="alert" data-testid="add-msg">{msg}</div>
        </div>
      )}
    </div>
  );
}

/** one base unit: the reference card. Header (name, type, turn off, delete), width, front editor with blue handles, section cards */
function BaseUnitCard({ P, rk, u, idx }) {
  const { model, lang, unit, commit, scene, sel, setSel } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const [confirm, setConfirm] = useState(false); const ref = useRef(null);
  const selected = !!(sel && sel.unitId === u.id);
  /* a unit picked in the plan or in the 3D view scrolls its card into view */
  useEffect(() => { if (selected && ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: 'nearest' }); }, [selected]);
  const name = `${L('Base', 'سفلي')} ${idx + 1}${isTall(u) ? L(' · tall', ' · طويل') : ''}`;
  const offTxt = u.hidden ? L('Turn this unit on', 'تشغيل هذه الوحدة') : L('Turn this unit off (not built, not in the cut list)', 'إطفاء هذه الوحدة (لا تُبنى ولا تظهر في قائمة القص)');
  const extra = (
    <>
      <button type="button" className="nk-ib nk-rk-eye nk-bp-tip" data-tip={offTxt} aria-pressed={!!u.hidden} aria-label={offTxt} data-testid="unit-hide" onClick={() => commit(toggleUnitOff(model, rk, u.id), `hide:${u.id}`)}><Ic n={u.hidden ? 'eyeOff' : 'eye'} size={16} /></button>
      <button type="button" className="nk-ib nk-rk-del" aria-label={L('Delete unit', 'حذف الوحدة')} title={L('Delete unit', 'حذف الوحدة')} data-testid="unit-delete" onClick={() => setConfirm(true)}><Ic n="close" size={16} /></button>
    </>
  );
  return (
    <section ref={ref} className={`nk-card nk-ucard nk-rk-ucard nk-bp-ucard${selected ? ' nk-card-sel' : ''}${u.hidden ? ' nk-bp-offcard' : ''}`} aria-label={name} id={`nk-unit-${u.id}`} data-unit={u.id} data-hidden={u.hidden ? '1' : '0'} data-testid="unit-card">
      {u.hidden && <p className="nk-bp-offnote" data-testid="unit-off-note"><Ic n="eyeOff" size={14} /> {L('Turned off: not built, not in the 3D view, elevation or cut list. Its settings are kept and its width still counts in the run.', 'مطفأة: لا تُبنى ولا تظهر في العرض ثلاثي الأبعاد أو الواجهة أو قائمة القص. تبقى إعداداتها محفوظة وعرضها ما زال محسوبًا في الصف.')}</p>}
      {confirm && (
        <div className="nk-rk-confirm" role="alertdialog" aria-label={L('Confirm delete', 'تأكيد الحذف')} data-testid="unit-confirm">
          <span>{L(`Delete ${name}? You can undo it.`, `حذف ${name}؟ يمكنك التراجع.`)}</span>
          <button type="button" className="nk-btn nk-btn-danger" data-testid="unit-confirm-yes" onClick={() => { commit(deleteUnit(model, rk, 'base', u.id), `del:${u.id}`); setSel(null); setConfirm(false); }}>{L('Delete', 'حذف')}</button>
          <button type="button" className="nk-btn" data-testid="unit-confirm-no" onClick={() => setConfirm(false)}>{L('Cancel', 'إلغاء')}</button>
        </div>
      )}
      <UnitAssistCard live embedded model={model} lang={lang} unit={unit} target={{ rk, row: 'base', id: u.id }} scene={scene} sel={sel} onSelect={setSel} headerExtra={extra}
        onApply={(m, key) => commit(m, `bp:${key}`)} />
    </section>
  );
}

export default function BaseScreen({ P, rk = 'main', layers, toggleLayer, embedded = false }) {
  const { model, lang, unit, commit, sel, setSel } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const arr = model.runs[rk].base || [];
  const total = rowWidth(arr);
  const R = runLenRange(rk);
  const layout = basePlanLayout(model, { rk, selId: sel ? sel.unitId : null });
  const [note, setNote] = useState(''); const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (t) => { setNote(t); clearTimeout(timer.current); timer.current = setTimeout(() => setNote(''), 4200); };

  const onDivider = (aId, bId, want) => {
    const r = moveDivider(model, rk, aId, bId, Math.round(want / 5) * 5);
    if (r.model !== model) commit(r.model, `div:${aId}`);
    if (r.clamped) flash(L(`Limited: units stay ${UNIT_W.min / 10}-${UNIT_W.max / 10} cm${model.keepWidth ? ' and the total width is kept' : ''}.`, `محدود: تبقى الوحدات بين ${UNIT_W.min / 10} و${UNIT_W.max / 10} سم${model.keepWidth ? ' ويبقى العرض الكلي ثابتًا' : ''}.`));
  };
  const onTotal = (mm) => {
    const r = setRunWidth(model, rk, Math.round(mm / 10) * 10);
    if (r.model !== model) commit(r.model, `tw:${rk}`);
    if (Math.abs(r.value - Math.round(mm / 10) * 10) > 0.5) flash(L(`Limited to ${cmTxt(r.value, unit, lang)}: the units can only grow or shrink so far (tall units keep their width).`, `محدود عند ${cmTxt(r.value, unit, lang)}: الوحدات تتغير ضمن حدود (الوحدات الطويلة تبقى بعرضها).`));
  };
  const runName = RUNLABEL[rk][lang === 'ar' ? 1 : 0];
  const helper = model.keepWidth ? L(`${runName} stays ${cmTxt(total, unit, lang)}; the other units share a change.`, `${runName} يبقى ${cmTxt(total, unit, lang)}؛ باقي الوحدات تتشارك التغيير.`) : L('Total width follows the units.', 'العرض الكلي يتبع الوحدات.');
  const cells = [
    { k: 'width', label: `${rk === 'main' ? L('Total width', 'العرض الكلي') : (rk === 'left' || rk === 'right') ? L('Leg length', 'طول الرجل') : L('Run length', 'طول الصف')} (${unit === 'in' ? 'in' : lang === 'ar' ? 'سم' : 'cm'})`,
      node: <CmField id={`nk-bw-${rk}`} label={rk === 'main' ? L('Total width', 'العرض الكلي') : (rk === 'left' || rk === 'right') ? L('Leg length', 'طول الرجل') : L('Run length', 'طول الصف')} mm={total} min={R.min} max={R.max} unit={unit} lang={lang}
        onChange={(v) => { const r = setRunWidth(model, rk, v); commit(r.model, `tw:${rk}`); if (Math.abs(r.value - v) > 0.5) flash(L(`Limited to ${cmTxt(r.value, unit, lang)}.`, `محدود عند ${cmTxt(r.value, unit, lang)}.`)); }} /> },
    { k: 'overall', label: L('Overall height', 'الارتفاع الكلي'), value: cmTxt(overallH(model), unit, lang) },
    { k: 'worktop', label: L('Worktop height', 'ارتفاع السطح'), value: cmTxt(worktopH(model.g), unit, lang) },
  ];
  return (
    <div className={embedded ? 'nk-bp' : 'nk-pbody nk-rk-screen nk-bp'} data-testid="base-screen">
      <PlanCard title={rowTitle(rk, 'base', lang)} count={arr.length} lang={lang} testid={`plan-card-${rk}-base`}>
        <BasePlan layout={layout} lang={lang} unit={unit} label={L('Front plan of the base run (live from the model)', 'المخطط الأمامي للصف السفلي (مباشر من النموذج)')} onSelect={setSel} onDivider={onDivider} onTotal={onTotal} />
        <KeepCheck id={`nk-keep-${rk}-base`} checked={!!model.keepWidth} onChange={(v) => commit({ ...model, keepWidth: v }, 'keep')} title={L("Keep the kitchen's total width", 'تثبيت إجمالي عرض المطبخ')} helper={helper} />
        <SummaryCards cells={cells} />
        <div className="nk-clamp nk-rk-note" role="status" aria-live="polite" data-testid="row-note">{note}</div>
        <AddUnitMenu P={P} rk={rk} />
        <p className="nk-rk-hint" data-testid="row-hint">{L('Tap a unit in the drawing — or click a cabinet in the 3D view — to edit it here. Drag a circle to move the boundary between two units.', 'اضغط على وحدة في الرسم — أو انقر خزانة في العرض ثلاثي الأبعاد — لتعديلها هنا. اسحب الدائرة لتحريك الحد بين وحدتين.')}</p>
        <hr className="nk-rk-sep" />
        <p className="nk-rk-eyebrow">{L('OPTIONS', 'خيارات')}</p>
        <OptionSwitch label={L('Show in 3D / drawing', 'إظهار في الرسم')} on={!!layers.base} onChange={() => toggleLayer('base')} />
        <Collapse title={L('Row dimensions', 'أبعاد الصف')} defaultOpen={false}><Fields keys={CATEGORY_FIELDS.base} P={P} /></Collapse>
      </PlanCard>
      <IssueList issues={rowIssues(model, rk, 'base')} lang={lang} />
      {arr.map((u, i) => <BaseUnitCard key={u.id} P={P} rk={rk} u={u} idx={i} />)}
    </div>
  );
}

