/* Neo Kitchen Designer - NEO-KITCHEN-UX29 end elevation of a peninsula / island (the run seen from its open end). Paints endView.js. */
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { endViewModel } from './endView';
import HandleLayer, { useHandlesPref } from '../neoHandles/HandleLayer';
import { endViewHandles } from '../neoHandles/layoutHandles';
import { createHandleDispatch } from '../neoHandles/handleModel';
import './layouts29.css';

/** [NEO-HANDLES-UX36] `model` + `commit` (optional): the depth / overhang / thickness / plinth handles of the shared layer (neoHandles/layoutHandles.js) */
export default function EndElevation({ scene, runKey, lang = 'en', model = null, commit = null }) {
  const ar = lang === 'ar';
  const m = useMemo(() => endViewModel(scene, runKey), [scene, runKey]);
  const [handlesOn] = useHandlesPref();
  const svgRef = useRef(null); const frozen = useRef(null); const live = useRef(null); const [drag, setDrag] = useState(false);
  const seq = useRef({ n: 0 });
  const onHandle = useMemo(() => (commit ? createHandleDispatch((next, key) => commit(next, key), seq.current) : null), [commit]);
  const list = useMemo(() => (model && commit ? endViewHandles({ model, scene, runKey }) : null), [model, scene, runKey, commit]);
  const onActive = useCallback((on) => { frozen.current = on ? live.current : null; setDrag(!!on); }, []);
  if (!m) return null;
  const fs0 = Math.max(34, Math.round((m.d1 - m.d0 + 400) / 26));
  const pad0 = fs0 * 3.6;
  live.current = { fs: fs0, pad: pad0, x0: m.d0 - pad0, x1: m.d1 + pad0 * 1.2, h: m.h };
  const F = drag && frozen.current ? frozen.current : live.current; // the frame is frozen while a handle is dragged
  const fs = F.fs; const pad = F.pad; const x0 = F.x0; const x1 = F.x1; const HH = F.h;
  const X = (d) => d; const Y = (y) => HH - y; // SVG y runs down; the drawing is in height-up millimetres
  const rname = runKey === 'isl' ? (ar ? 'الجزيرة' : 'Island') : (ar ? 'الجزيرة الممتدة' : 'Peninsula');
  const aria = ar ? `منظر النهاية: ${rname}` : `End view: ${rname}`;
  const back = ar ? 'الخلف' : 'BACK'; const front = ar ? 'الأمام' : 'FRONT';
  return (
    <div className="nk-ev" data-testid="end-view" data-run={runKey}>
      <svg ref={svgRef} className="nk-ev-svg" viewBox={`${x0} ${-fs * 4.2} ${x1 - x0} ${HH + fs * 10.8}`} role="group" aria-label={aria} preserveAspectRatio="xMidYMid meet">
        <title>{aria}</title>
        <line className="nk-ev-fl" x1={x0 + pad * 0.3} y1={Y(0)} x2={x1 - pad * 0.3} y2={Y(0)} />
        {m.rects.map((r, i) => (
          <rect key={i} className={`nk-ev-${r.k}`} data-off={r.off ? '1' : undefined} data-name={r.name} x={X(r.d0)} y={Y(r.y1)} width={Math.max(1, r.d1 - r.d0)} height={Math.max(1, r.y1 - r.y0)}>
            {r.name && <title>{r.name === 'end' ? (ar ? 'لوح النهاية المشطّب' : 'Finished end panel') : (ar ? 'لوح الظهر المشطّب' : 'Finished back panel')}{r.off ? (ar ? ' (مُطفأ)' : ' (off)') : ''}</title>}
          </rect>
        ))}
        {m.support && (
          <g className="nk-ev-support" data-testid="end-support">
            <path d={`M ${X(m.support.d0 + 40)} ${Y(m.support.y)} L ${X(m.support.d1)} ${Y(m.support.y - m.support.drop)}`} />
            {m.support.legs && <line x1={X(m.support.d0 + 30)} y1={Y(m.support.y)} x2={X(m.support.d0 + 30)} y2={Y(0)} />}
          </g>
        )}
        {m.dims.map((d) => (
          <g key={d.id} className="nk-ev-dim" data-dim={d.id}>
            {d.k === 'h' && (<><line x1={X(d.a)} y1={Y(-fs * 1.6)} x2={X(d.b)} y2={Y(-fs * 1.6)} /><line x1={X(d.a)} y1={Y(-fs * 1.0)} x2={X(d.a)} y2={Y(-fs * 2.2)} /><line x1={X(d.b)} y1={Y(-fs * 1.0)} x2={X(d.b)} y2={Y(-fs * 2.2)} /><text x={(X(d.a) + X(d.b)) / 2} y={Y(-fs * 3.2)} textAnchor="middle" style={{ fontSize: fs }}>{d.label}</text></>)}
            {d.k === 'h2' && (<><line x1={X(d.a)} y1={Y(m.h + fs * 1.3)} x2={X(d.b)} y2={Y(m.h + fs * 1.3)} /><line x1={X(d.a)} y1={Y(m.h + fs * 0.7)} x2={X(d.a)} y2={Y(m.h + fs * 1.9)} /><line x1={X(d.b)} y1={Y(m.h + fs * 0.7)} x2={X(d.b)} y2={Y(m.h + fs * 1.9)} /><text x={(X(d.a) + X(d.b)) / 2} y={Y(m.h + fs * 2.9)} textAnchor="middle" style={{ fontSize: fs }}>{d.label}</text></>)}
            {d.k === 'v' && (<><line x1={X(m.d1) + fs * 1.4} y1={Y(d.a)} x2={X(m.d1) + fs * 1.4} y2={Y(d.b)} /><line x1={X(m.d1) + fs * 0.8} y1={Y(d.a)} x2={X(m.d1) + fs * 2.0} y2={Y(d.a)} /><line x1={X(m.d1) + fs * 0.8} y1={Y(d.b)} x2={X(m.d1) + fs * 2.0} y2={Y(d.b)} /><text x={X(m.d1) + fs * 2.4} y={Y((d.a + d.b) / 2)} dominantBaseline="middle" style={{ fontSize: fs }}>{d.label}</text></>)}
          </g>
        ))}
        <text className="nk-ev-cap" x={X(0)} y={Y(-fs * 5.2)} textAnchor="start" style={{ fontSize: fs * 0.8 }}>{back}</text>
        <text className="nk-ev-cap" x={X(m.D + m.dt)} y={Y(-fs * 5.2)} textAnchor="end" style={{ fontSize: fs * 0.8 }}>{front}</text>
        {list && onHandle ? <HandleLayer handles={list} onChange={onHandle} onActive={onActive} svgRef={svgRef} enabled={handlesOn} lang={lang} place={(h) => ({ x: X(h.at.u), y: Y(h.at.y) })} testid="handle-layer-end" /> : null}
      </svg>
    </div>
  );
}
