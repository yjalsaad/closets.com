/* Neo Wardrobe Studio [NEO-CLOSETS-UX24 / UX25] - the mini elevation of the "Main unit - columns" / "Right wing - columns" cards.
 * Columns are drawn to scale; click (or Enter / Space) selects one. Two ways to size them (the cards decide what happens to the other columns - "keep the closet's total width"):
 *   mode "edge"    (Main unit) the right edge of every column carries a DRAG HANDLE: the column's width follows the pointer;
 *   mode "divider" (return wing) a round DIVIDER HANDLE sits between two neighbouring columns: dragging it moves the boundary (one column grows, the next shrinks, the pair keeps its sum).
 * Both handles are keyboard sliders: Left / Right = 10 mm (Shift = 50 mm), Home / End = the smallest / largest column. The drawing is never mirrored (like the elevation and the other card
 * diagrams), so Left / Right mean left / right on screen. `ghost` draws the OTHER run greyed alongside (the wing next to the main unit, or the main unit next to the wing).
 * Labels under each column are centimetres (one decimal at most). Hidden columns are drawn dashed; a pinned column carries a small pin mark. */
import React, { useRef, useState, useCallback } from 'react';
import HandleLayer, { useHandlesPref } from '../neoHandles/HandleLayer';
import { COL_W } from './wardrobeModel';

const SNAP = 5;
const cm = (mm) => `${Math.round(mm) / 10}`;

/** `heightHandle` + `onHandle` (optional, [NEO-HANDLES-UX36]): the elevation's overall-height pill (neoHandles/wardrobeHandles 'h:total') mirrored on the top edge of this small drawing */
export default function MiniElevation({ mods, height, sel, onSelect, onWidth, onSplit, mode = 'edge', ghost = null, lang, testid = 'col-mini', prefix = 'C', label, drawerH = 220, drawerMode = 'front', totalLabel, live = true, heightHandle = null, onHandle = null }) {
  const svgRef = useRef(null);
  const [handlesOn] = useHandlesPref(); const frozenVb = useRef(null); const liveVb = useRef(''); const [hdlDrag, setHdlDrag] = useState(false);
  const onHdlActive = useCallback((on) => { frozenVb.current = on ? liveVb.current : null; setHdlDrag(!!on); }, []);
  const drag = useRef(null);
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const total = mods.reduce((t, m) => t + m.width, 0);
  const gTotal = ghost ? ghost.mods.reduce((t, m) => t + m.width, 0) : 0;
  const gap = ghost ? Math.max(120, (total + gTotal) * 0.04) : 0;
  const ghostLeft = !!ghost && ghost.side === 'left';
  const base = ghostLeft ? gTotal + gap : 0;           // x where the editable columns start
  const span = total + (ghost ? gTotal + gap : 0);
  const toU = (e) => {
    const svg = svgRef.current; if (!svg || !svg.createSVGPoint || !svg.getScreenCTM) return null;
    const m = svg.getScreenCTM(); if (!m) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(m.inverse()).x - base;
  };
  const down = (i, start, w) => (e) => {
    e.stopPropagation(); e.preventDefault();
    const u = toU(e); if (u == null) return;
    if (e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
    drag.current = { i, start, off: u - (start + w) };
    onSelect(i);
  };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const u = toU(e); if (u == null) return;
    const w = Math.round((u - d.off - d.start) / SNAP) * SNAP;
    if (mode === 'divider' && onSplit) onSplit(d.i, w); else onWidth(d.i, w);
  };
  const up = (e) => { if (drag.current && e.currentTarget.releasePointerCapture) { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ } } drag.current = null; };
  const key = (i, w) => (e) => {
    const step = e.shiftKey ? 50 : 10;
    const to = e.key === 'ArrowRight' ? w + step : e.key === 'ArrowLeft' ? w - step : e.key === 'Home' ? COL_W.min : e.key === 'End' ? COL_W.max : null;
    if (to == null) return;
    e.preventDefault(); e.stopPropagation(); onSelect(i); if (mode === 'divider' && onSplit) onSplit(i, to); else onWidth(i, to);
  };
  const pad = Math.max(60, span * 0.03);
  const H = height;
  const fs = Math.max(110, H * 0.06);
  let x0 = base;
  const handleCount = mode === 'divider' ? mods.length - 1 : mods.length;
  return (
    <div className="nkw-mini" role="group" aria-label={label || L('Columns', 'الأعمدة')} data-testid={testid} data-mode={mode}>
      <div className="nkw-mini-live" aria-hidden="true" dir="ltr"><span className="nkw-live-dot" />{mods.length} {L(mods.length === 1 ? 'column' : 'columns', 'أعمدة')} · {L('live', 'مباشر')}</div>
      <svg ref={svgRef} viewBox={(liveVb.current = `${-pad} ${-pad / 2 - (heightHandle ? 130 : 0)} ${span + 2 * pad} ${H + 320 + (heightHandle ? 130 : 0)}`, hdlDrag && frozenVb.current ? frozenVb.current : liveVb.current)} preserveAspectRatio="xMidYMid meet" className="nkw-mini-svg" style={{ direction: 'ltr' }}>
        {ghost && (() => { let g0 = ghostLeft ? 0 : total + gap; return ghost.mods.map((m, i) => {
          const x = g0; g0 += m.width;
          return (
            <g key={`g${i}`} className="nkw-mini-col nkw-mini-ghost" data-ghost="1" aria-hidden="true">
              <rect x={x + 6} y={6} width={Math.max(1, m.width - 12)} height={H - 12} />
              <text x={x + m.width / 2} y={H + 150} textAnchor="middle" style={{ fontSize: fs }}>{cm(m.width)}</text>
            </g>
          );
        }); })()}
        {mods.map((m, i) => {
          const x = x0; x0 += m.width; const on = sel === i;
          return (
            <g key={m.id} className="nkw-mini-col" data-on={on ? '1' : '0'} data-hidden={m.hidden ? '1' : '0'} data-pin={m.pin ? '1' : '0'} onClick={() => onSelect(i)} role="button" aria-label={`${L('Column', 'عمود')} ${prefix}${i + 1}`} aria-pressed={on} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }}>
              <rect x={x + 6} y={6} width={Math.max(1, m.width - 12)} height={H - 12} />
              {Array.from({ length: m.drawers }).map((_, k) => <line key={`d${k}`} className={(m.dMode || drawerMode) === 'inside' ? 'nkw-mini-dr-in' : undefined} x1={x + 6} x2={x + m.width - 6} y1={H - 12 - (k + 1) * (m.drawerH || drawerH)} y2={H - 12 - (k + 1) * (m.drawerH || drawerH)} />)}
              {m.hanging !== 'none' && <line className="nkw-mini-rail" x1={x + 40} x2={x + m.width - 40} y1={H * 0.3} y2={H * 0.3} />}
              {m.pin && <circle className="nkw-mini-pin" cx={x + m.width / 2} cy={H * 0.08} r={Math.max(22, H * 0.02)} />}
              <text x={x + m.width / 2} y={H + 150} textAnchor="middle" style={{ fontSize: fs }}>{cm(m.width)}</text>
            </g>
          );
        })}
        {(() => { let e0 = base; return mods.slice(0, handleCount).map((m, i) => {
          const start = e0 - base; e0 += m.width; const edge = e0; const on = sel === i;
          const lbl = mode === 'divider'
            ? `${L('Drag to move the boundary between columns', 'اسحب لتحريك الحد بين العمودين')} ${prefix}${i + 1} / ${prefix}${i + 2}`
            : `${L('Drag to change the width of column', 'اسحب لتغيير عرض العمود')} ${prefix}${i + 1}`;
          return (
            <g key={`h${m.id}`} className={`nkw-mini-h${mode === 'divider' ? ' nkw-mini-div' : ''}`} data-on={on ? '1' : '0'} role="slider" tabIndex={0} aria-orientation="horizontal"
              aria-label={lbl} aria-valuemin={COL_W.min} aria-valuemax={COL_W.max} aria-valuenow={m.width} aria-valuetext={`${cm(m.width)} cm`}
              data-testid={`${testid}-handle-${i}`}
              onPointerDown={down(i, start, m.width)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key(i, m.width)} onFocus={() => onSelect(i)} onClick={(e) => e.stopPropagation()}>
              <title>{L('Drag left / right (arrow keys: 1 cm, Shift 5 cm)', 'اسحب يمينًا / يسارًا (الأسهم: 1 سم، Shift 5 سم)')}</title>
              <rect className="nkw-mini-hit" x={edge - H * 0.09} y={0} width={H * 0.18} height={H} />
              {mode === 'divider'
                ? <circle className="nkw-mini-grip" cx={edge} cy={H * 0.5} r={H * 0.055} />
                : <rect className="nkw-mini-grip" x={edge - H * 0.035} y={H * 0.36} width={H * 0.07} height={H * 0.28} rx={H * 0.03} />}
            </g>
          );
        }); })()}
        {heightHandle && onHandle ? <HandleLayer handles={[{ ...heightHandle, at: { u: base + total / 2, y: 0 }, level: 1 }]} onChange={onHandle} onActive={onHdlActive} svgRef={svgRef} enabled={handlesOn} lang={lang} testid={`${testid}-handles`} /> : null}
      </svg>
      <div className="nkw-mini-total" dir="ltr" data-testid={`${testid}-total`}>{totalLabel || `${cm(total)} cm`}</div>
    </div>
  );
}
