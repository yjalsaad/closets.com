/* Neo Kitchen Designer - NEO-KITCHEN-UX29 layout picker + live floor plan.
 * LayoutPicker: the six layout types as radio cards (plan icon, name, one-line description, selected state), keyboard accessible
 * (roving tabindex, arrow keys move AND select like a native radio group), EN / AR, no text wrapping into the icon. The L-shape card
 * keeps the left / right (mirror) choice as a segmented control under the list. The model change is the designer's normal
 * commit() (one undoable step); the ids stay 'straight' | 'l-left' | 'l-right' | 'u' | 'galley' | 'peninsula' | 'island'.
 * LayoutPlan: the live plan view generated from the scene (planView.js) - the same data the 3D view, elevations and cut list read. */
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Seg } from './ui';
import { IssueList } from './RowKit';
import { setLayout, layoutName, setXl, xlKind } from './model';
import { layoutIssues } from './layoutRules';
import { planView, LAYOUT_CHOICES, pickerIdOf } from './planView';
import HandleLayer, { useHandlesPref } from '../neoHandles/HandleLayer';
import { planHandles } from '../neoHandles/layoutHandles';
import { createHandleDispatch } from '../neoHandles/handleModel';
import './layouts29.css';

/** small plan-view icon of a layout (44 x 32): the wall is the top line, runs are filled bars, an open side is left clear */
export function LayoutIcon({ id }) {
  const run = { className: 'nk-ly-ic-run', rx: 1.2 };
  const wall = <line className="nk-ly-ic-wall" x1="3" y1="3" x2="41" y2="3" />;
  return (
    <svg className="nk-ly-ic" viewBox="0 0 44 32" width="44" height="32" aria-hidden="true" focusable="false">
      {id === 'straight' && (<>{wall}<rect {...run} x="5" y="5" width="34" height="7" /></>)}
      {id === 'galley' && (<>{wall}<line className="nk-ly-ic-wall" x1="3" y1="29" x2="41" y2="29" /><rect {...run} x="5" y="5" width="34" height="7" /><rect {...run} x="5" y="20" width="34" height="7" /></>)}
      {id === 'l' && (<><line className="nk-ly-ic-wall" x1="3" y1="3" x2="41" y2="3" /><line className="nk-ly-ic-wall" x1="3" y1="3" x2="3" y2="29" /><rect {...run} x="5" y="5" width="34" height="7" /><rect {...run} x="5" y="12" width="7" height="15" /></>)}
      {id === 'u' && (<><line className="nk-ly-ic-wall" x1="3" y1="3" x2="41" y2="3" /><line className="nk-ly-ic-wall" x1="3" y1="3" x2="3" y2="29" /><line className="nk-ly-ic-wall" x1="41" y1="3" x2="41" y2="29" /><rect {...run} x="5" y="5" width="34" height="7" /><rect {...run} x="5" y="12" width="7" height="15" /><rect {...run} x="32" y="12" width="7" height="15" /></>)}
      {id === 'peninsula' && (<>{wall}<rect {...run} x="5" y="5" width="34" height="7" /><rect {...run} x="32" y="12" width="7" height="16" /><line className="nk-ly-ic-open" x1="31" y1="29.5" x2="40" y2="29.5" /></>)}
      {id === 'island' && (<>{wall}<rect {...run} x="5" y="5" width="34" height="7" /><rect {...run} x="12" y="19" width="20" height="7" /><line className="nk-ly-ic-open" x1="10" y1="28.5" x2="34" y2="28.5" /></>)}
    </svg>
  );
}

export function LayoutPicker({ P, goTab }) {
  const { model, lang, commit } = P;
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const name = layoutName(model);
  const cur = pickerIdOf(name);
  const refs = useRef({});
  const pick = (id) => {
    if (id === cur) return;
    const target = id === 'l' ? 'l-left' : id;
    commit(setLayout(model, target), 'layout');
  };
  const ids = LAYOUT_CHOICES.map((c) => c.id);
  const onKey = (e, id) => {
    const k = e.key;
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(k)) return;
    e.preventDefault();
    const i = ids.indexOf(id);
    // vertical list: Up / Down. Left / Right follow the reading direction (RTL swaps them), like a native radio group
    const fwd = k === 'ArrowDown' || k === (ar ? 'ArrowLeft' : 'ArrowRight');
    const bwd = k === 'ArrowUp' || k === (ar ? 'ArrowRight' : 'ArrowLeft');
    const next = k === 'Home' ? ids[0] : k === 'End' ? ids[ids.length - 1] : ids[(i + (fwd ? 1 : bwd ? -1 : 0) + ids.length) % ids.length];
    pick(next);
    if (refs.current[next]) refs.current[next].focus();
  };
  const issues = useMemo(() => layoutIssues(model), [model]);
  const kind = xlKind(model);
  const runTab = kind === 'galley' ? 'run2' : kind === 'peninsula' ? 'pen' : kind === 'island' ? 'isl' : null;
  const runTabName = kind === 'galley' ? L('Run 2', 'الصف ٢') : kind === 'peninsula' ? L('Peninsula', 'الجزيرة الممتدة') : L('Island', 'الجزيرة');
  return (
    <div className="nk-ly" data-testid="layout-picker" data-layout={name}>
      <div className="nk-ctl-name" id="nk-ly-label">{L('Layout', 'التخطيط')}</div>
      <div className="nk-ly-list" role="radiogroup" aria-labelledby="nk-ly-label">
        {LAYOUT_CHOICES.map((c) => {
          const on = c.id === cur;
          return (
            <button key={c.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} className="nk-ly-card" data-layout={c.id} data-on={on ? '1' : '0'}
              aria-describedby={`nk-ly-d-${c.id}`} ref={(el) => { refs.current[c.id] = el; }} onClick={() => pick(c.id)} onKeyDown={(e) => onKey(e, c.id)}>
              <LayoutIcon id={c.id} />
              <span className="nk-ly-t"><b className="nk-ly-n">{ar ? c.ar : c.en}</b><small className="nk-ly-d" id={`nk-ly-d-${c.id}`}>{c.d[ar ? 'ar' : 'en']}</small></span>
              <i className="nk-ly-tick" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {cur === 'l' && (
        <div className="nk-ly-opt" data-testid="layout-l-side">
          <span className="nk-ly-opt-l">{L('Return side', 'جهة الامتداد')}</span>
          <Seg label={L('L-shape: return side', 'شكل L: جهة الامتداد')} value={name} onChange={(v) => commit(setLayout(model, v), 'layout')}
            options={[['l-left', L('Left', 'يسار')], ['l-right', L('Right', 'يمين')]]} />
        </div>
      )}
      {kind === 'peninsula' && (
        <div className="nk-ly-opt" data-testid="layout-pen-side">
          <span className="nk-ly-opt-l">{L('Projects from the', 'يمتد من')}</span>
          <Seg label={L('Peninsula: which end of the main run', 'الجزيرة الممتدة: أي طرف من الصف الرئيسي')} value={model.xl.side} onChange={(v) => commit(setXl(model, { side: v }), 'xl:side')}
            options={[['left', L('Left end', 'الطرف الأيسر')], ['right', L('Right end', 'الطرف الأيمن')]]} />
        </div>
      )}
      {runTab && goTab && (
        <button type="button" className="nk-btn nk-btn-ghost nk-ly-go" data-testid="layout-edit-run" onClick={() => goTab(runTab)}>{L(`Edit ${runTabName}`, `تعديل ${runTabName}`)}</button>
      )}
      <IssueList issues={issues} lang={lang} testid="layout-issues" />
    </div>
  );
}

/** the live floor plan (top view). SVG is never mirrored (direction: ltr) - the plan shows the real room. */
/** [NEO-HANDLES-UX36] `model` + `commit` (optional): the run-length / aisle / island-position handles of the shared layer (neoHandles/layoutHandles.js) */
export function LayoutPlan({ scene, lang = 'en', compact = false, model = null, commit = null }) {
  const pv = useMemo(() => planView(scene), [scene]);
  const ar = lang === 'ar';
  const [handlesOn] = useHandlesPref();
  const svgRef = useRef(null); const frozen = useRef(null); const [drag, setDrag] = useState(false); const seq = useRef({ n: 0 });
  const onHandle = useMemo(() => (commit ? createHandleDispatch((next, key) => commit(next, key), seq.current) : null), [commit]);
  const list = useMemo(() => (model && commit ? planHandles({ model, scene }) : null), [model, scene, commit]);
  const liveBox = useRef(null); liveBox.current = { box: pv.box, w: pv.w, h: pv.h };
  const onActive = useCallback((on) => { frozen.current = on ? liveBox.current : null; setDrag(!!on); }, []);
  const F = drag && frozen.current ? frozen.current : liveBox.current; // the plan does not re-fit while a handle is dragged
  const { rects, aisles } = pv; const box = F.box;
  const fs = Math.max(90, F.w / 24);
  const order = { wall: 0, base: 1, tall: 2, counter: 3, panel: 4 };
  const label = ar ? 'مخطط أرضي حي للتخطيط' : 'Live floor plan of the layout';
  return (
    <figure className={`nk-lp${compact ? ' nk-lp-compact' : ''}`} data-testid="layout-plan">
      <svg ref={svgRef} viewBox={`${box.x0} ${box.z0} ${F.w} ${F.h}`} role="group" aria-label={label} preserveAspectRatio="xMidYMid meet" className="nk-lp-svg">
        <title>{label}</title>
        <line className="nk-lp-room" x1={box.x0 + 120} y1={-8} x2={box.x1 - 120} y2={-8} />
        {[...rects].sort((a, b) => order[a.kind] - order[b.kind]).map((q, i) => (
          <rect key={i} className={`nk-lp-r nk-lp-${q.kind}`} data-run={q.run} x={q.x0} y={q.z0} width={Math.max(1, q.x1 - q.x0)} height={Math.max(1, q.z1 - q.z0)} />
        ))}
        {aisles.map((a, i) => (a.horizontal ? (
          <g key={`a${i}`} className="nk-lp-dim" data-testid="plan-aisle">
            <line x1={a.x0} y1={a.z} x2={a.x1} y2={a.z} /><line x1={a.x0} y1={a.z - 50} x2={a.x0} y2={a.z + 50} /><line x1={a.x1} y1={a.z - 50} x2={a.x1} y2={a.z + 50} />
            <text x={(a.x0 + a.x1) / 2} y={a.z + fs * 1.25} textAnchor="middle" style={{ fontSize: fs }}>{a.mm}</text>
          </g>
        ) : (
          <g key={`a${i}`} className="nk-lp-dim" data-testid="plan-aisle">
            <line x1={a.x} y1={a.z0} x2={a.x} y2={a.z1} /><line x1={a.x - 60} y1={a.z0} x2={a.x + 60} y2={a.z0} /><line x1={a.x - 60} y1={a.z1} x2={a.x + 60} y2={a.z1} />
            <text x={a.x + 90} y={(a.z0 + a.z1) / 2} dominantBaseline="middle" style={{ fontSize: fs }}>{a.mm}</text>
          </g>
        )))}
        {list && onHandle ? <HandleLayer handles={list} onChange={onHandle} onActive={onActive} svgRef={svgRef} enabled={handlesOn} lang={lang} testid="handle-layer-plan" /> : null}
      </svg>
      <figcaption className="nk-lp-cap">{ar ? 'المخطط الأرضي (حي من النموذج)' : 'Floor plan (live from the model)'}</figcaption>
    </figure>
  );
}
