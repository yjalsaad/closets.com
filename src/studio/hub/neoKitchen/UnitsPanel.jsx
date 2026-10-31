/* Neo Kitchen Designer - Base / Wall / Top unit editors, live mini-schematic with draggable module boundaries,
 * (the L-Left / L-Right screens live in RowScreens.jsx). */
import React, { useRef, useState, useEffect } from 'react';
import { NumField, Seg, fmtLen, grp } from './ui';
import { NewBadge } from './Panels';
import { UnitIso, UnitEye, hiddenCardClass } from './RowKit';
import { Ic } from './icons';
import { SECTYPES, UNIT_TYPES, UNIT_W, TALL_H, LEG, SHELVES_N, KITCHEN } from './constants';
import {
  addUnit, deleteUnit, moveUnit, patchUnit, setUnitType, setUnitWidth, setSecCount, setSectionHeight, setRunWidth,
  rowWidth, isTall, clamp, worktopH, overallH, RUN_NAMES,
} from './model';
import { secHeights } from './geometry';

const ROWNAME = { base: ['Base', 'سفلي'], wall: ['Wall', 'علوي'], top: ['Top', 'ثالث'] };

/* live schematic of the whole run; module boundaries of the active row are draggable */
export function MiniMap({ scene, runKey, row, sel, onSelect, onResize, lang }) {
  const run = scene.runs.find((r) => r.key === runKey);
  const ref = useRef(null);
  const drag = useRef(null);
  if (!run) return null;
  const Hmax = Math.max(...run.units.map((x) => x.y0 + x.H), 1);
  const W = 440, pad = 14, s = (W - pad * 2) / Math.max(run.L, 1);
  const Hpx = Hmax * s + pad * 2 + 18;
  const X = (u) => pad + u * s, Y = (y) => pad + (Hmax - y) * s;
  const rowUnits = run.units.filter((x) => x.row === row);
  const toU = (e) => { const svg = ref.current; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return (p.x - pad) / s; };
  const widthFromU = (x, u) => (run.flip ? x.fu0 + x.W - u : u - x.fu0);
  const boundary = (x) => (run.flip ? x.fu0 : x.fu0 + x.W);
  return (
    <svg ref={ref} className="nk-minimap" viewBox={`0 0 ${W} ${Hpx}`} role="group" aria-label={lang === 'ar' ? 'مخطط مباشر للصف' : 'Live run schematic'}>
      {run.units.map((x) => (
        <g key={x.unit.id} className={`nk-mm-u${sel && sel.unitId === x.unit.id ? ' nk-sel' : ''}${x.row === row ? '' : ' nk-mm-dim'}`} onClick={() => onSelect({ unitId: x.unit.id, partId: null })}>
          <rect x={X(x.fu0)} y={Y(x.y0 + x.H)} width={x.W * s} height={x.H * s} />
          {x.bounds.slice(1).map((b, i) => <line key={i} x1={X(x.fu0)} x2={X(x.fu0 + x.W)} y1={Y(b.top)} y2={Y(b.top)} />)}
          {x.tall && <text x={X(x.fu0) + 3} y={Y(x.y0 + x.H) + 9} className="nk-mm-t">tall</text>}
        </g>
      ))}
      {rowUnits.map((x) => (
        <circle key={`h${x.unit.id}`} className="nk-mm-h" cx={X(boundary(x))} cy={Y(x.y0) + 2} r={6} tabIndex={0} role="slider" aria-label={`${ROWNAME[row][lang === 'ar' ? 1 : 0]} ${x.idx + 1}`} aria-valuenow={x.W} aria-valuemin={UNIT_W.min} aria-valuemax={UNIT_W.max}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = x; }}
          onPointerMove={(e) => { if (drag.current === x) onResize(x.unit.id, row, runKey, widthFromU(x, toU(e))); }}
          onPointerUp={() => { drag.current = null; }}
          onKeyDown={(e) => { const d = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10 }[e.key]; if (d) { e.preventDefault(); onResize(x.unit.id, row, runKey, x.W + d * (e.shiftKey ? 5 : 1) * (run.flip ? -1 : 1)); } }}>
          <title>{lang === 'ar' ? 'اسحب لتغيير العرض' : 'Drag to resize'}</title>
        </circle>
      ))}
      {rowUnits.map((x) => <text key={`w${x.unit.id}`} x={X(x.fu0 + x.W / 2)} y={Hpx - 6} className="nk-mm-w" textAnchor="middle">{Math.round(x.W / 10)}</text>)}
      <line className="nk-mm-floor" x1={pad} x2={W - pad} y1={Y(0)} y2={Y(0)} />
    </svg>
  );
}

function UnitPreview({ unit, H }) {
  const hs = secHeights(unit.secs, H);
  const total = hs.reduce((a, b) => a + b, 0) || 1;
  let y = 0;
  const w = 60, h = 96;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="nk-uprev" aria-hidden="true">
      <rect x="1" y="1" width={w - 2} height={h - 2} className="nk-up-box" />
      {unit.secs.map((s, i) => {
        const hh = (hs[i] / total) * (h - 4); const yy = 2 + y; y += hh;
        return (
          <g key={i}><rect x="3" y={yy + 1} width={w - 6} height={Math.max(2, hh - 2)} className={`nk-pt nk-pt-${SECTYPES[s.t].part}`} />
            <text x={w / 2} y={yy + hh / 2 + 3} textAnchor="middle" className="nk-up-t">{s.t === 'drawer' || s.t === 'hob' ? `${s.n}×` : s.t.slice(0, 5)}</text></g>
        );
      })}
    </svg>
  );
}

function SectionRow({ u, si, sec, H, P, rk, row }) {
  const { model, lang, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const upd = (patch) => commit(patchUnit(model, rk, row, u.id, (x) => ({ ...x, secs: x.secs.map((s, j) => (j === si ? { ...s, ...patch } : s)) })), `sec:${u.id}:${si}`);
  const hs = secHeights(u.secs, H);
  const leaves = sec.t === 'door' || sec.t === 'glass' || sec.t === 'sink';
  const counted = leaves || sec.t === 'drawer' || sec.t === 'hob' || sec.t === 'open';
  const cLabel = leaves ? L('leaves', 'ضلف') : sec.t === 'open' ? L('shelves', 'رفوف') : L('drawers', 'أدراج');
  const cMax = leaves ? 4 : 8;
  const hasShelves = sec.t === 'door' || sec.t === 'glass' || sec.t === 'flip';
  const mv = (d) => { const j = si + d; if (j < 0 || j >= u.secs.length) return; commit(patchUnit(model, rk, row, u.id, (x) => { const secs = x.secs.map((s) => ({ ...s })); [secs[si], secs[j]] = [secs[j], secs[si]]; return { ...x, secs }; }), `secmv:${u.id}`); };
  return (
    <div className="nk-sec" role="group" aria-label={`${L('Section', 'القسم')} ${si + 1}`}>
      <div className="nk-sec-top">
        <span className="nk-sec-n">{si + 1}</span>
        <select className="nk-select nk-pillsel" aria-label={L('Section type', 'نوع القسم')} value={sec.t} onChange={(e) => { const t = e.target.value; upd({ t, n: Math.max(1, Math.min(t === 'door' || t === 'glass' || t === 'sink' ? 4 : 8, sec.n)), shelves: t === 'door' || t === 'glass' || t === 'flip' ? Math.max(sec.shelves, 1) : 0 }); }}>
          {Object.entries(SECTYPES).map(([k, v]) => <option key={k} value={k}>{v[lang]}{v.src ? ' ·NEW' : ''}</option>)}
        </select>
        <div className="nk-iconbar">
          <button type="button" className="nk-ib" aria-label={L('Move section up', 'نقل القسم لأعلى')} disabled={si === 0} onClick={() => mv(-1)}>↑</button>
          <button type="button" className="nk-ib" aria-label={L('Move section down', 'نقل القسم لأسفل')} disabled={si === u.secs.length - 1} onClick={() => mv(1)}>↓</button>
          <button type="button" className="nk-ib nk-ib-danger" aria-label={L('Delete section', 'حذف القسم')} disabled={u.secs.length < 2} onClick={() => commit(patchUnit(model, rk, row, u.id, (x) => ({ ...x, secs: x.secs.filter((_, j) => j !== si) })), `secdel:${u.id}`)}>✕</button>
        </div>
      </div>
      <div className="nk-sec-ctl">
        {counted && (
          <div className="nk-step" role="group" aria-label={cLabel}>
            <button type="button" className="nk-ib" aria-label={`${cLabel} -`} onClick={() => upd({ n: clamp(sec.n - 1, 1, cMax) })}>−</button>
            <span className="nk-step-v" dir="ltr">{sec.n} <small>{cLabel}</small></span>
            <button type="button" className="nk-ib" aria-label={`${cLabel} +`} onClick={() => upd({ n: clamp(sec.n + 1, 1, cMax) })}>+</button>
          </div>
        )}
        {hasShelves && (
          <div className="nk-step" role="group" aria-label={L('Adjustable shelves', 'رفوف متحركة')}>
            <button type="button" className="nk-ib" aria-label={L('shelves -', 'رفوف -')} onClick={() => upd({ shelves: clamp(sec.shelves - 1, SHELVES_N.min, SHELVES_N.max) })}>−</button>
            <span className="nk-step-v" dir="ltr">{sec.shelves} <small>{L('shelves', 'رفوف')}</small></span>
            <button type="button" className="nk-ib" aria-label={L('shelves +', 'رفوف +')} onClick={() => upd({ shelves: clamp(sec.shelves + 1, SHELVES_N.min, SHELVES_N.max) })}>+</button>
          </div>
        )}
        {(sec.t === 'door' || sec.t === 'glass') && sec.n === 1 && (
          <Seg label={L('Hinge side', 'جهة المفصلة')} value={sec.hinge} onChange={(v) => upd({ hinge: v })} options={[['L', L('Hinge L', 'مفصلة ي')], ['R', L('Hinge R', 'مفصلة م')]]} />
        )}
        <label className="nk-sec-h">
          <span>{L('Height', 'الارتفاع')}</span>
          <input type="text" className="nk-inp" dir="ltr" inputMode="numeric" aria-label={L(`Section ${si + 1} height (mm), empty = auto`, `ارتفاع القسم ${si + 1} (مم)، فارغ = تلقائي`)} placeholder={`auto ${Math.round(hs[si] / 10 * 10) / 10 / 1} cm`}
            value={sec.h ? String(sec.h) : ''} onChange={(e) => { const v = e.target.value.trim(); commit(setSectionHeight(model, rk, row, u.id, si, v === '' ? null : parseFloat(v) || null, H), `sech:${u.id}:${si}`); }} />
        </label>
      </div>
    </div>
  );
}

/** width, tall height, sections and grain of one unit (shared by the classic card and the UX-6 row-screen card) */
function UnitBody({ P, rk, row, u, idx, H, name, rkv }) {
  const { model, lang, unit, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return (
    <>
      <div className="nk-ctl">
        <label className="nk-ctl-name" htmlFor={`nk-w-${u.id}`}>{L('Width', 'العرض')}</label>
        <NumField id={`nk-w-${u.id}`} label={`${name} ${L('width', 'عرض')}`} value={u.w} min={UNIT_W.min} max={UNIT_W.max} step={10} uiUnit={unit} lang={lang} compact
          rangeNote={model.keepWidth ? L('others share the change', 'الباقي يتشارك التغيير') : undefined}
          onChange={(v) => { const r = setUnitWidth(model, rk, row, u.id, v); commit(r.model, `w:${u.id}`); return { ...r, value: r.model.runs[rk][row].find((x) => x.id === u.id).w }; }} />
      </div>
      {u.type === 'tall' && (
        <div className="nk-ctl">
          <label className="nk-ctl-name" htmlFor={`nk-th-${u.id}`}>{L('Tall carcass height', 'ارتفاع الوحدة الطويلة')}</label>
          <NumField id={`nk-th-${u.id}`} label={L('Tall height', 'ارتفاع الطويلة')} value={u.h || TALL_H.def} min={TALL_H.min} max={TALL_H.max} step={10} uiUnit={unit} lang={lang} compact
            onChange={(v) => { const c = clamp(Math.round(v), TALL_H.min, TALL_H.max); commit(patchUnit(model, rk, row, u.id, (x) => ({ ...x, h: c })), `th:${u.id}`); return { clamped: c !== Math.round(v), value: c }; }} />
        </div>
      )}
      {(u.type === 'blind' || u.type === 'carousel' || u.type === 'diagonal') && <p className="nk-cdesc">{L('Corner units use a single special front (blind panel / bi-fold + carousel shelves / diagonal door).', 'وحدات الركن لها واجهة خاصة (لوح أعمى / ضلفتان + أرفف دوّارة / باب قطري).')}</p>}
      <div className="nk-unit-body">
        {rkv ? <UnitIso unit={u} H={H} n={idx + 1} /> : <UnitPreview unit={u} H={H} />}
        <div className="nk-unit-secs">
          <div className="nk-step" role="group" aria-label={L('Sections', 'الأقسام')}>
            <span className="nk-ctl-name">{L('Sections', 'الأقسام')}</span>
            <button type="button" className="nk-ib" aria-label={L('Fewer sections', 'أقسام أقل')} onClick={() => commit(patchUnit(model, rk, row, u.id, (x) => setSecCount(x, x.secs.length - 1)), `nsec:${u.id}`)}>−</button>
            <span className="nk-step-v" dir="ltr">{u.secs.length}</span>
            <button type="button" className="nk-ib" aria-label={L('More sections', 'أقسام أكثر')} onClick={() => commit(patchUnit(model, rk, row, u.id, (x) => setSecCount(x, x.secs.length + 1)), `nsec:${u.id}`)}>+</button>
          </div>
          {!(u.type === 'blind' || u.type === 'carousel' || u.type === 'diagonal') && u.secs.map((sec, si) => <SectionRow key={si} u={u} si={si} sec={sec} H={H} P={P} rk={rk} row={row} />)}
          <label className="nk-sel-l"><span>{L('Front grain', 'عرق الواجهة')} <NewBadge lang={lang} /></span>
            <select className="nk-select" value={u.grainFront} onChange={(e) => commit(patchUnit(model, rk, row, u.id, (x) => ({ ...x, grainFront: e.target.value })), `gf:${u.id}`)}>
              <option value="auto">{L('Auto', 'تلقائي')}</option><option value="V">{L('Vertical', 'عمودي')}</option><option value="H">{L('Horizontal', 'أفقي')}</option>
            </select></label>
        </div>
      </div>
    </>
  );
}

export function UnitEditor({ P, rk, row, u, idx, variant }) {
  const { model, lang, commit, scene, sel, setSel } = P;
  const rkv = variant === 'rk'; // UX-6 row screens: eye / red delete with confirmation / isometric preview with a numbered marker
  const [confirm, setConfirm] = useState(false);
  const cardRef = useRef(null);
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const inst = scene.runs.find((r) => r.key === rk)?.units.find((x) => x.unit.id === u.id);
  const H = inst ? inst.H : row === 'base' ? model.g.baseH : model.g.wallH;
  const name = `${ROWNAME[row][lang === 'ar' ? 1 : 0]} ${idx + 1}${isTall(u) ? L(' · tall', ' · طويل') : ''}`;
  const selected = sel && sel.unitId === u.id;
  /* a unit picked in the drawing or in the 3D view scrolls its card into view */
  useEffect(() => { if (rkv && selected && cardRef.current && cardRef.current.scrollIntoView) cardRef.current.scrollIntoView({ block: 'nearest' }); }, [rkv, selected]);
  const hideTxt = u.hidden ? L('Show unit', 'إظهار الوحدة') : L('Hide unit (left out of drawings and cut list)', 'إخفاء الوحدة (تُستبعد من الرسومات وقائمة القص)');
  if (rkv) {
    return (
      <section ref={cardRef} className={`nk-card nk-ucard nk-rk-ucard${selected ? ' nk-card-sel' : ''}${hiddenCardClass(u)}`} aria-label={name} id={`nk-unit-${u.id}`} data-unit={u.id} data-testid="unit-card">
        <div className="nk-unit-head nk-rk-uhead">
          <button type="button" className="nk-unit-name" onClick={() => setSel({ unitId: u.id, partId: null })} aria-pressed={!!selected}><b>{name}</b> <span dir="ltr" className="nk-c-3">{Math.round(u.w / 10)} cm</span></button>
          <div className="nk-iconbar">
            <button type="button" className="nk-ib" aria-label={L('Move unit earlier', 'نقل الوحدة للخلف')} onClick={() => commit(moveUnit(model, rk, row, u.id, -1), `mv:${u.id}`)}>←</button>
            <button type="button" className="nk-ib" aria-label={L('Move unit later', 'نقل الوحدة للأمام')} onClick={() => commit(moveUnit(model, rk, row, u.id, 1), `mv:${u.id}`)}>→</button>
            <UnitEye hidden={!!u.hidden} lang={lang} onToggle={() => commit(patchUnit(model, rk, row, u.id, (x) => ({ ...x, hidden: !x.hidden })), `hide:${u.id}`)} />
            <button type="button" className="nk-ib nk-rk-del" aria-label={L('Delete unit', 'حذف الوحدة')} title={L('Delete unit', 'حذف الوحدة')} data-testid="unit-delete" onClick={() => setConfirm(true)}><Ic n="close" size={16} /></button>
          </div>
        </div>
        {confirm && (
          <div className="nk-rk-confirm" role="alertdialog" aria-label={L('Confirm delete', 'تأكيد الحذف')} data-testid="unit-confirm">
            <span>{L(`Delete ${name}? You can undo it.`, `حذف ${name}؟ يمكنك التراجع.`)}</span>
            <button type="button" className="nk-btn nk-btn-danger" data-testid="unit-confirm-yes" onClick={() => { commit(deleteUnit(model, rk, row, u.id), `del:${u.id}`); setSel(null); setConfirm(false); }}>{L('Delete', 'حذف')}</button>
            <button type="button" className="nk-btn" data-testid="unit-confirm-no" onClick={() => setConfirm(false)}>{L('Cancel', 'إلغاء')}</button>
          </div>
        )}
        {u.hidden && <p className="nk-cdesc nk-rk-hidenote">{L('Hidden: left out of the 3D view, elevation and cut list. Its width still counts in the row.', 'مخفية: مستبعدة من العرض ثلاثي الأبعاد والرسم وقائمة القص. عرضها ما زال محسوبًا في الصف.')}</p>}
        <UnitBody P={P} rk={rk} row={row} u={u} idx={idx} H={H} name={name} rkv />
      </section>
    );
  }
  return (
    <section className={`nk-card nk-ucard${selected ? ' nk-card-sel' : ''}`} aria-label={name} id={`nk-unit-${u.id}`}>
      <div className="nk-unit-head">
        <button type="button" className="nk-unit-name" onClick={() => setSel({ unitId: u.id, partId: null })} aria-pressed={!!selected}><b>{name}</b> <span dir="ltr" className="nk-c-3">{Math.round(u.w / 10)} cm</span></button>
        <select className="nk-select" aria-label={L('Unit type', 'نوع الوحدة')} value={u.type} disabled={row !== 'base' && true} onChange={(e) => commit(setUnitType(model, rk, row, u.id, e.target.value), `type:${u.id}`)}>
          {Object.entries(UNIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v[lang]}{v.src ? ' ·NEW' : ''}</option>)}
        </select>
        <div className="nk-iconbar">
          <button type="button" className="nk-ib" aria-label={L('Move unit earlier', 'نقل الوحدة للخلف')} onClick={() => commit(moveUnit(model, rk, row, u.id, -1), `mv:${u.id}`)}>←</button>
          <button type="button" className="nk-ib" aria-label={L('Move unit later', 'نقل الوحدة للأمام')} onClick={() => commit(moveUnit(model, rk, row, u.id, 1), `mv:${u.id}`)}>→</button>
          <button type="button" className="nk-ib" aria-pressed={!!u.hidden} aria-label={L('Hide unit (left out of drawings and cut list)', 'إخفاء الوحدة (تُستبعد من الرسومات وقائمة القص)')} title={L('Hide unit (left out of drawings and cut list)', 'إخفاء الوحدة (تُستبعد من الرسومات وقائمة القص)')} onClick={() => commit(patchUnit(model, rk, row, u.id, (x) => ({ ...x, hidden: !x.hidden })), `hide:${u.id}`)}>{u.hidden ? '◌' : '◉'}</button>
          <button type="button" className="nk-ib nk-ib-danger" aria-label={L('Delete unit', 'حذف الوحدة')} onClick={() => { commit(deleteUnit(model, rk, row, u.id), `del:${u.id}`); setSel(null); }}>✕</button>
        </div>
      </div>
      <UnitBody P={P} rk={rk} row={row} u={u} idx={idx} H={H} name={name} />
    </section>
  );
}

export function UnitsPanel({ P, rk, row, embedded }) {
  const { model, lang, unit, commit, scene, sel, setSel, resize } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const run = model.runs[rk];
  const arr = run[row] || [];
  const isMain = rk === 'main';
  const inst = scene.runs.find((r) => r.key === rk);
  const rowTitle = `${rk === 'main' ? '' : (rk === 'left' ? L('Left leg', 'الرجل اليسرى') : rk === 'right' ? L('Right leg', 'الرجل اليمنى') : RUN_NAMES[rk][lang === 'ar' ? 1 : 0]) + ' - '}${row === 'base' ? L('base cabinets', 'الوحدات السفلية') : row === 'wall' ? L('wall cabinets', 'الوحدات العلوية') : L('top cabinets', 'وحدات الصف الثالث')}`;
  return (
    <div className={embedded ? '' : 'nk-pbody'}>
      {row === 'top' && !model.topOn && (
        <section className="nk-card nk-ctr">
          <p className="nk-cdesc">{L('The top (third-tier) row is off.', 'الصف الثالث مُطفأ.')}</p>
          <button type="button" className="nk-btn nk-btn-primary" onClick={() => commit({ ...model, topOn: true }, 'topOn')}>{L('Turn it on', 'تشغيله')}</button>
        </section>
      )}
      {(row !== 'top' || model.topOn) && (
        <>
          <section className="nk-card">
            <div className="nk-card-head"><span className="nk-bar" /><h3 className="nk-h3">{rowTitle}</h3><span className="nk-c-3 nk-mono" dir="ltr">{arr.length} {L('units', 'وحدات')} · live</span></div>
            {inst && <MiniMap scene={scene} runKey={rk} row={row} sel={sel} onSelect={setSel} onResize={resize} lang={lang} />}
            <label className="nk-keep">
              <input type="checkbox" checked={model.keepWidth} onChange={(e) => commit({ ...model, keepWidth: e.target.checked }, 'keep')} />
              <span><b>{L("Keep the kitchen's total width", 'تثبيت إجمالي عرض المطبخ')}</b><small>{model.keepWidth ? L(`Run stays ${grp(rowWidth(run.base) / 10)} cm; the other units share a change.`, `يبقى الصف ${grp(rowWidth(run.base) / 10)} سم؛ باقي الوحدات تتشارك التغيير.`) : L('Total width follows the units.', 'العرض الكلي يتبع الوحدات.')}</small></span>
            </label>
            {row === 'base' && (
              <div className="nk-triple">
                <div className="nk-stat"><label className="nk-stat-k" htmlFor={`nk-tw-${rk}`}>{L('Total width', 'العرض الكلي')} ({unit === 'in' ? 'in' : 'cm'})</label>
                  <NumField id={`nk-tw-${rk}`} label={L('Total width', 'العرض الكلي')} slider={false} compact value={rowWidth(run.base)} min={isMain ? KITCHEN.width.min : LEG.length.min} max={isMain ? KITCHEN.width.max : LEG.length.max} step={10} uiUnit={unit} lang={lang}
                    onChange={(v) => { const r = setRunWidth(model, rk, v); commit(r.model, `tw:${rk}`); return r; }} /></div>
                <div className="nk-stat"><span className="nk-stat-k">{L('Overall height', 'الارتفاع الكلي')}</span><b className="nk-mono" dir="ltr">{fmtLen(overallH(model), unit)}</b></div>
                <div className="nk-stat"><span className="nk-stat-k">{L('Worktop height', 'ارتفاع السطح')}</span><b className="nk-mono" dir="ltr">{fmtLen(worktopH(model.g), unit)}</b></div>
              </div>
            )}
            <button type="button" className="nk-add" onClick={() => commit(addUnit(model, rk, row), `add:${rk}${row}`)}>+ {L('Add unit', 'أضف وحدة')}</button>
          </section>
          {arr.map((u, i) => <UnitEditor key={u.id} P={P} rk={rk} row={row} u={u} idx={i} />)}
        </>
      )}
    </div>
  );
}
