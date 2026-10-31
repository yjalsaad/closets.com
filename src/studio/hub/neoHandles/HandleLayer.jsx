/* =============================================================================
 * [NEO-HANDLES-UX36] The shared SMART HANDLES overlay: blue pill handles drawn ON a studio's drawing (<g> inside the studio's <svg>).
 * It owns NO model state. A studio gives it the handle list from handleModel.js builders and one callback; a drag is
 *   pointer down  -> onChange(h, startValue, 'start')
 *   pointer move  -> onChange(h, value, 'drag')   (live, snapped / clamped, one history step because the studio merges `hdl:` keys)
 *   pointer up    -> onChange(h, value, 'end')
 * and an arrow key is onChange(h, value, 'key'). Pointer pixels are converted to drawing space with the svg's own viewBox, so it works at any zoom / pan and
 * on any resize; a handle pointer-down stops propagation, so the drawing's own pan / select never starts under it (background drag still pans).
 * Pills are sized in SCREEN pixels (bigger on a coarse pointer), coloured with tokens only (handles.css), and the layer renders nothing when `enabled` is false.
 * ===========================================================================*/
import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { ariaOf, bubbleText, declutter, dragStep, labelOf, limitReason, nudge, parseViewBox, tipOf, viewMap, visibleHandles } from './handleModel';
import './handles.css';

const LS_KEY = 'nk_handles_v1';
const SNAP_PX = 8;
const PILL = { long: 34, short: 10, hit: 44, font: 12, count: 22 };

/** the "Handles" toggle, remembered per browser (default ON) and shared by every drawing of the studio (elevation, floor plan, mini elevation). Safe when storage is blocked. */
const subs = new Set();
let cur = null;
const readPref = () => { try { return window.localStorage.getItem(LS_KEY) !== '0'; } catch (e) { return cur === null ? true : cur; } };
export function useHandlesPref() {
  const [on, setOn] = useState(readPref);
  useEffect(() => { subs.add(setOn); setOn(readPref()); return () => { subs.delete(setOn); }; }, []);
  const set = useCallback((v) => { cur = !!v; try { window.localStorage.setItem(LS_KEY, v ? '1' : '0'); } catch (e) { /* storage blocked: the choice lasts for this visit */ } subs.forEach((f) => f(!!v)); }, []);
  return [on, set];
}

const isCoarse = () => { try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } };

export default function HandleLayer({
  handles, onChange, onActive = null, svgRef, enabled = true, unitId = null, lang = 'en', place = null, unitsPerMm = 1, toSvg = null, readOnly = false, snapPx = SNAP_PX, testid = 'handle-layer',
}) {
  const [px, setPx] = useState(1);            // screen pixels per svg unit (measured)
  const [vb, setVb] = useState(null);
  const [active, setActive] = useState(null); // { id, value, limit, snapped }
  const [hover, setHover] = useState(null);
  const [flash, setFlash] = useState(null);   // keyboard nudge bubble
  const drag = useRef(null);
  const latest = useRef({ handles, onChange, onActive }); latest.current = { handles, onChange, onActive };
  const flashT = useRef(null);
  const coarse = useMemo(isCoarse, []);

  /* measure: px per svg unit + the viewBox, after every render (cheap; state only changes when the numbers do) */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = svgRef && svgRef.current; if (!el) return;
    const box = parseViewBox(el.getAttribute('viewBox')); if (!box) return;
    const r = el.getBoundingClientRect();
    const s = viewMap({ left: r.left, top: r.top, width: r.width, height: r.height }, box).s;
    setPx((p) => (Math.abs(p - s) / (p || 1) < 0.005 ? p : s));
    setVb((v) => (v && v.x === box.x && v.y === box.y && v.w === box.w && v.h === box.h ? v : box));
  });
  useEffect(() => () => { if (flashT.current) clearTimeout(flashT.current); }, []);

  const shown = useMemo(() => (enabled ? visibleHandles(handles || [], { unitId, activeId: active && active.id, hoverId: hover }) : []), [enabled, handles, unitId, active, hover]);
  const k = 1 / (px || 1); // svg units per screen pixel
  const pos = (h) => (place ? place(h) : { x: h.at.u, y: h.at.y });
  const sz = (h) => {
    if (h.kind === 'count') return { w: PILL.count * (coarse ? 1.25 : 1), h: PILL.count * (coarse ? 1.25 : 1) };
    const L = PILL.long * (coarse ? 1.25 : 1);
    return h.axis === 'x' ? { w: PILL.short, h: L } : { w: L, h: PILL.short };
  };
  /* keep pills from sitting on top of each other (screen pixels, greedy) */
  const offs = useMemo(() => declutter(shown.map((h) => { const p = pos(h); const s = sz(h); return { id: h.id, x: p.x * px, y: p.y * px, w: Math.max(s.w, coarse ? 36 : 18), h: Math.max(s.h, coarse ? 36 : 18), axis: h.axis }; }), { gap: 2 }),
    [shown, px, place]); // eslint-disable-line react-hooks/exhaustive-deps

  const point = (e) => {
    if (toSvg) return toSvg(e.clientX, e.clientY);
    const el = svgRef && svgRef.current; if (!el) return null;
    const box = parseViewBox(el.getAttribute('viewBox')); if (!box) return null;
    const r = el.getBoundingClientRect();
    return viewMap({ left: r.left, top: r.top, width: r.width, height: r.height }, box).toSvg(e.clientX, e.clientY);
  };
  const byId = (id) => (latest.current.handles || []).find((x) => x.id === id);
  const tolMm = snapPx / ((px || 1) * (unitsPerMm || 1));

  const down = (h) => (e) => {
    if (readOnly || (e.button !== undefined && e.button !== 0)) return;
    e.stopPropagation(); e.preventDefault();
    const p = point(e); if (!p) return;
    try { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); } catch (er) { /* synthetic pointer */ }
    drag.current = { id: h.id, x0: p.x, y0: p.y, v0: h.value, last: h.value, pid: e.pointerId };
    setActive({ id: h.id, value: h.value, limit: null, snapped: null });
    if (latest.current.onActive) latest.current.onActive(true);
    latest.current.onChange(h, h.value, 'start');
  };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const h = byId(d.id); if (!h) return;
    const p = point(e); if (!p) return;
    const u = unitsPerMm || 1;
    const r = dragStep(h, d.v0, (p.x - d.x0) / u, (p.y - d.y0) / u, { fine: !!e.shiftKey, free: !!e.altKey, tol: tolMm });
    setActive({ id: h.id, value: r.value, limit: r.limit, snapped: r.snapped });
    if (r.value !== d.last) { d.last = r.value; latest.current.onChange(h, r.value, 'drag'); }
  };
  const up = (e) => {
    const d = drag.current; if (!d) return;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture && e.currentTarget.releasePointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const h = byId(d.id);
    setActive(null);
    if (latest.current.onActive) latest.current.onActive(false);
    if (h) latest.current.onChange(h, d.last, 'end');
  };
  const key = (h) => (e) => {
    if (readOnly) return;
    const r = nudge(h, e.key, { shift: e.shiftKey });
    if (!r) return;
    e.preventDefault(); e.stopPropagation();
    setFlash({ id: h.id, value: r.value, limit: r.limit });
    if (flashT.current) clearTimeout(flashT.current);
    flashT.current = setTimeout(() => setFlash(null), 1100);
    if (r.value !== h.value) latest.current.onChange(h, r.value, 'key');
  };

  if (!enabled || !shown.length) return null;
  const bubbleOf = active || flash;
  return (
    <g className="nk-hdl-layer" data-testid={testid} data-count={shown.length} style={{ pointerEvents: 'none' }}>
      {shown.map((h) => {
        const p = pos(h); const o = offs[h.id] || { dx: 0, dy: 0 };
        const cx = p.x + o.dx * k; const cy = p.y + o.dy * k;
        const s = sz(h); const w = s.w * k; const hh = s.h * k;
        const live = active && active.id === h.id ? active : null;
        const lim = live ? live.limit : (flash && flash.id === h.id ? flash.limit : null);
        const cls = `nk-hdl nk-hdl-${h.axis}${h.kind === 'count' ? ' nk-hdl-count' : ''}${live ? ' is-active' : ''}${lim ? ' is-limit' : ''}${hover === h.id && !live ? ' is-hover' : ''} nk-hdl-g-${h.group}`;
        const hitW = Math.max(s.w + 8, coarse ? PILL.hit : 24) * k; const hitH = Math.max(s.h + 8, coarse ? PILL.hit : 24) * k; // a fine pointer's hit area stays inside the de-clutter gap, so a neighbour's invisible hit box never covers this pill
        const aria = ariaOf(h, lang);
        const tip = `${tipOf(h, lang)} (${bubbleText(h, h.value)})${lim ? ` - ${limitReason(h, lim, lang)}` : ''}`;
        return (
          <g key={h.id} className={cls} data-handle={h.id} data-kind={h.kind} data-axis={h.axis} data-group={h.group} data-value={Math.round(h.value)}
            style={{ pointerEvents: readOnly ? 'none' : 'all' }} transform={`translate(${cx} ${cy})`}
            onPointerDown={down(h)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onClick={(ev) => ev.stopPropagation()} onKeyDown={key(h)}
            onPointerEnter={() => setHover(h.id)} onPointerLeave={() => setHover((x) => (x === h.id ? null : x))} onFocus={() => setHover(h.id)} onBlur={() => setHover((x) => (x === h.id ? null : x))} {...aria}>
            <title>{tip}</title>
            <rect className="nk-hdl-hit" x={-hitW / 2} y={-hitH / 2} width={hitW} height={hitH} />
            <rect className="nk-hdl-halo" x={-w / 2 - 2 * k} y={-hh / 2 - 2 * k} width={w + 4 * k} height={hh + 4 * k} rx={Math.min(w, hh) / 2 + 2 * k} />
            <rect className="nk-hdl-pill" x={-w / 2} y={-hh / 2} width={w} height={hh} rx={Math.min(w, hh) / 2} />
            {h.kind === 'count' && <path className="nk-hdl-glyph" d={`M${-4 * k} ${-1.5 * k}L0 ${-5 * k}L${4 * k} ${-1.5 * k}M${-4 * k} ${1.5 * k}L0 ${5 * k}L${4 * k} ${1.5 * k}`} />}
          </g>
        );
      })}
      {bubbleOf && (() => {
        const h = shown.find((x) => x.id === bubbleOf.id); if (!h) return null;
        const p = pos(h); const o = offs[h.id] || { dx: 0, dy: 0 };
        const cx = p.x + o.dx * k; const cy = p.y + o.dy * k;
        const s = sz(h);
        const txt = bubbleText(h, bubbleOf.value);
        const reason = bubbleOf.limit ? limitReason(h, bubbleOf.limit, lang) : '';
        const fs = PILL.font * k; const pad = 6 * k;
        const bw = Math.max(txt.length * fs * 0.62, reason.length * fs * 0.55) + pad * 2; const bh = fs + pad * 1.2 + (reason ? fs * 1.15 : 0);
        let bx = h.axis === 'x' ? cx - bw / 2 : cx + (s.w / 2 + 10) * k;
        let by = h.axis === 'x' ? cy - (s.h / 2 + 10) * k - bh : cy - bh / 2;
        if (vb) { bx = Math.max(vb.x + 2 * k, Math.min(vb.x + vb.w - bw - 2 * k, bx)); by = Math.max(vb.y + 2 * k, Math.min(vb.y + vb.h - bh - 2 * k, by)); }
        return (
          <g className={`nk-hdl-bubble${bubbleOf.limit ? ' is-limit' : ''}`} data-testid="handle-bubble" style={{ pointerEvents: 'none' }}>
            <rect x={bx} y={by} width={bw} height={bh} rx={4 * k} />
            <text x={bx + bw / 2} y={by + pad * 0.6 + fs * 0.5} textAnchor="middle" dominantBaseline="central" style={{ fontSize: fs, direction: 'ltr', unicodeBidi: 'isolate' }}>{txt}</text>
            {reason && <text className="nk-hdl-why" x={bx + bw / 2} y={by + pad * 0.6 + fs * 1.6} textAnchor="middle" dominantBaseline="central" style={{ fontSize: fs * 0.92 }}>{reason}</text>}
          </g>
        );
      })()}
      <text className="nk-hdl-live" x={0} y={0} style={{ fontSize: 1, opacity: 0 }} aria-live="polite">{bubbleOf ? `${labelOf(shown.find((x) => x.id === bubbleOf.id) || {}, lang)} ${Math.round(bubbleOf.value)}` : ''}</text>
    </g>
  );
}
