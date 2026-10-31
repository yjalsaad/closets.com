/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - the technical drawing: FRONT, SIDE and TOP views of the solved assembly on one sheet (or one view alone),
 * overall + selected-part + equal-spacing dimensions, numbered callouts (the same numbers as the cut-list Map column), banded edges, notched / rounded
 * outlines, door swing symbols and handles. Everything is drawn from the same solved parts as the 3D view; clicking a part selects it everywhere, dragging
 * moves it (snapping to other parts' edges and centres, the parent, the envelope and a 5 mm grid) and arrow keys nudge it 1 mm (Shift 10 mm).
 * The pure rules live in drawingMath.js (unit-tested); this file only paints them.
 * ===========================================================================*/
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { planeAxes } from '../neoKitchen/cutlist';
import HandleLayer from '../neoHandles/HandleLayer';
import { customHandles } from '../neoHandles/customHandles';
import { partName } from './customModel';
import { useOutput } from '../neoKitchen/OutputSettingsControl';
import { getOutput, dimText, unitLabel } from '../neoKitchen/outputSettings';
import {
  fitSheet, SHEET_VIEWS, viewRect, viewSize, VIEW_AXES, VIEW_NAME, visibleItems, outlineOf, pathOf, dragAxes, snapMove, applyMove, edgeSegments, repGaps,
} from './drawingMath';

const r1 = (v) => Math.round(v * 10) / 10;
/** [NEO-OUTPUT-UX34] a dimension label: millimetres exactly as before, centimetres / inches from the Output setting (the model stays in mm) */
const dl = (v) => { const o = getOutput(); return o.unit === 'mm' ? r1(v) : dimText(v, o); };
const AXN = { u: 'x', d: 'z', y: 'y' };

function Dim({ x1, y1, x2, y2, label, fs, cls = 'p', off = 0, vertical = false, below = false }) {
  const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
  const t = fs * 0.34;
  return (
    <g className={`nkc-dim nkc-d-${cls}`} data-dim={label}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
      {vertical
        ? (<><line x1={x1 - t} y1={y1} x2={x1 + t} y2={y1} vectorEffect="non-scaling-stroke" /><line x1={x2 - t} y1={y2} x2={x2 + t} y2={y2} vectorEffect="non-scaling-stroke" /></>)
        : (<><line x1={x1} y1={y1 - t} x2={x1} y2={y1 + t} vectorEffect="non-scaling-stroke" /><line x1={x2} y1={y2 - t} x2={x2} y2={y2 + t} vectorEffect="non-scaling-stroke" /></>)}
      <text x={vertical ? mx - fs * 0.45 : mx} y={vertical ? my : below ? my + fs * 1.15 : my - fs * 0.4 + off} textAnchor={vertical ? 'end' : 'middle'} dominantBaseline={vertical ? 'central' : 'auto'} style={{ fontSize: fs }} className="nkc-dt" transform={vertical ? `rotate(-90 ${mx - fs * 0.45} ${my})` : undefined}>{label}</text>
    </g>
  );
}

export default function CustomDrawing({
  built, mode = 'all', ui, sel, onSelect, onDesign, onHandle = null, lang = 'en', interactive = true, fixedSize = null, snapOn = true,
}) {
  const ar = lang === 'ar';
  useOutput(); // re-draw the labels when the Output unit changes
  const { design, solved, scene } = built;
  const dims = useMemo(() => ({ w: scene.bounds.x1, h: scene.bounds.h, d: scene.bounds.z1 }), [scene]);
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [cs, setCs] = useState(fixedSize || { w: 900, h: 520 });
  const [zoom, setZoom] = useState({ z: 1, cx: null, cy: null });
  const [guides, setGuides] = useState([]);
  const [hov, setHov] = useState(null);
  const drag = useRef(null);
  const panRef = useRef(null);
  const moved = useRef(false);

  useEffect(() => {
    if (fixedSize || !interactive) return undefined;
    const el = wrapRef.current; if (!el) return undefined;
    const read = () => { const r = el.getBoundingClientRect(); const w = Math.max(160, Math.round(r.width / 8) * 8); const h = Math.max(160, Math.round(r.height / 8) * 8); setCs((c) => (c.w === w && c.h === h ? c : { w, h })); };
    read();
    if (typeof window === 'undefined' || !window.ResizeObserver) return undefined;
    const ro = new window.ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, [fixedSize, interactive]);
  useEffect(() => { setZoom({ z: 1, cx: null, cy: null }); }, [mode]);

  const layLive = useMemo(() => fitSheet(dims, mode, cs.w, cs.h), [dims, mode, cs]);
  /* [NEO-HANDLES-UX36] the sheet layout is FROZEN while a handle is dragged (the drawing does not re-fit under the pointer); it re-fits on release */
  const frozenLay = useRef(null); const [hdlDrag, setHdlDrag] = useState(false);
  const lay = hdlDrag && frozenLay.current ? frozenLay.current : layLive;
  const layRef = useRef(layLive); layRef.current = layLive;
  const onHdlActive = useCallback((on) => { frozenLay.current = on ? layRef.current : null; setHdlDrag(!!on); }, []);
  const fs = lay.fs; const mp = lay.mmpp;
  const keys = SHEET_VIEWS[mode] || SHEET_VIEWS.all;
  const lists = useMemo(() => Object.fromEntries(keys.map((k) => [k, visibleItems(solved.items, k, dims, { internal: ui.internal })])), [solved, dims, ui.internal, keys]);
  const spBy = useMemo(() => { const m = new Map(); scene.parts.forEach((p) => { if (!m.has(p.baseId)) m.set(p.baseId, p); }); return m; }, [scene]);
  const numbers = scene.numbering;
  const handlesBy = useMemo(() => scene.handles.map((h) => ({ ...h })), [scene]);

  /* viewBox with zoom / pan */
  const zc = { cx: zoom.cx == null ? lay.vbW / 2 : zoom.cx, cy: zoom.cy == null ? lay.vbH / 2 : zoom.cy };
  const vw = lay.vbW / zoom.z; const vh = lay.vbH / zoom.z;
  const vb = [zc.cx - vw / 2, zc.cy - vh / 2, vw, vh];
  const toSvg = (e) => {
    const svg = svgRef.current; if (!svg || !svg.getScreenCTM) return { x: e.clientX, y: e.clientY };
    const m = svg.getScreenCTM(); if (!m) return { x: e.clientX, y: e.clientY };
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };
  const setZ = (z, at) => {
    const nz = Math.min(8, Math.max(1, z));
    if (nz === 1) { setZoom({ z: 1, cx: null, cy: null }); return; }
    const a = at || { x: zc.cx, y: zc.cy };
    const ow = lay.vbW / zoom.z; const nw = lay.vbW / nz;
    const fx = (a.x - (zc.cx - ow / 2)) / ow; const fy = (a.y - (zc.cy - (lay.vbH / zoom.z) / 2)) / (lay.vbH / zoom.z);
    setZoom({ z: nz, cx: a.x - fx * nw + nw / 2, cy: a.y - fy * (lay.vbH / nz) + (lay.vbH / nz) / 2 });
  };
  useEffect(() => {
    const el = svgRef.current; if (!el || !interactive) return undefined;
    const h = (e) => { e.preventDefault(); setZ(zoom.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), toSvg(e)); };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- pointer: select, drag a part (with snapping), pan the sheet ---------- */
  const startPart = (e, it, view) => {
    if (!interactive) return;
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    const m = svgRef.current && svgRef.current.getScreenCTM ? svgRef.current.getScreenCTM() : null;
    const k = m && m.a ? 1 / m.a : mp; // drawing units (mm) per CSS pixel at the moment the drag starts
    onSelect({ unitId: it.base });
    moved.current = false;
    drag.current = { id: it.base, view, cx: e.clientX, cy: e.clientY, k, design, solved, last: null };
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };
  const startPan = (e) => {
    if (!interactive) return;
    if (e.button !== undefined && e.button !== 0 && e.button !== 1) return;
    moved.current = false;
    const p = toSvg(e);
    panRef.current = { x0: e.clientX, y0: e.clientY, cx: zc.cx, cy: zc.cy, sx: p.x, sy: p.y };
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };
  const onMove = (e) => {
    const d = drag.current;
    if (d) {
      /* client pixels x the scale at pointer-down: selecting a part changes the layout (the part card appears), so the sheet may re-fit mid-drag; the part still follows the pointer 1:1 */
      const dxS = (e.clientX - d.cx) * d.k; const dyS = (e.clientY - d.cy) * d.k;
      if (!moved.current && Math.hypot(dxS, dyS) < 4 * mp) return;
      moved.current = true;
      const ax = dragAxes(d.view);
      const raw = { [ax.h.axis]: ax.h.sign * dxS, [ax.v.axis]: ax.v.sign * dyS };
      const sn = snapMove(d.solved, d.design, d.id, raw, 6 * mp, { on: snapOn });
      setGuides(sn.guides);
      const key = `drag:${d.id}`;
      d.last = sn.delta;
      onDesign(applyMove(d.design, d.id, sn.delta), key);
      return;
    }
    const pn = panRef.current;
    if (pn && zoom.z > 1) {
      const dx = e.clientX - pn.x0; const dy = e.clientY - pn.y0;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      const svg = svgRef.current; const rect = svg.getBoundingClientRect();
      const k = vw / rect.width; // viewBox units per CSS pixel (meet scaling uses the smaller ratio)
      const kk = Math.max(vw / rect.width, vh / rect.height);
      void k;
      setZoom((zz) => ({ ...zz, cx: pn.cx - dx * kk, cy: pn.cy - dy * kk }));
    }
  };
  const onUp = () => {
    if (drag.current) { drag.current = null; setGuides([]); }
    if (panRef.current) {
      const was = moved.current; panRef.current = null;
      if (!was) onSelect(null);
    }
  };
  const onPartKey = (e, it, view) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ unitId: it.base }); return; }
    const step = e.shiftKey ? 10 : 1;
    const ax = dragAxes(view);
    let dh = 0; let dv = 0;
    if (e.key === 'ArrowLeft') dh = -step; else if (e.key === 'ArrowRight') dh = step; else if (e.key === 'ArrowUp') dv = -step; else if (e.key === 'ArrowDown') dv = step; else return;
    e.preventDefault();
    onSelect({ unitId: it.base });
    onDesign(applyMove(design, it.base, { [ax.h.axis]: ax.h.sign * dh, [ax.v.axis]: ax.v.sign * dv }), `nudge:${it.base}`);
  };

  const handlesBy2 = (k) => customHandles({ design, solved, view: k, sel: selId });
  const iso = ui.isolate;
  const selId = sel && sel.unitId;
  const off = 30 * mp; // dimension line distance from a view

  const renderView = (key) => {
    const v = lay.views[key]; if (!v) return null;
    const list = lists[key]; const va = VIEW_AXES[key];
    const sz = hdlDrag ? viewSize(key, dims) : { w: v.w, h: v.h };
    const placed = [];
    const bubbleAt = (cx, cy, rr) => {
      let y = cy; let n = 0;
      while (n < 8 && placed.some((q) => Math.hypot(q.x - cx, q.y - y) < rr * 2.1)) { y += rr * 2.2; n += 1; }
      placed.push({ x: cx, y });
      return y;
    };
    const selIts = selId ? list.filter((q) => q.it.base === selId) : [];
    const selBox = selIts.length ? { x0: Math.min(...selIts.map((q) => q.r.x0)), x1: Math.max(...selIts.map((q) => q.r.x1)), y0: Math.min(...selIts.map((q) => q.r.y0)), y1: Math.max(...selIts.map((q) => q.r.y1)) } : null;
    const gaps = ui.dims && selId ? repGaps(list.map((q) => q.it).filter((it) => it.base === selId), key, dims) : []; // equal-spacing gaps of the SELECTED repeated part (every part's gaps would bury the drawing)
    const firstOf = new Set();
    return (
      <g key={key} transform={`translate(${v.ox} ${v.oy})`} data-view={key} className="nkc-view">
        <rect className="nkc-env" x={0} y={0} width={sz.w} height={sz.h} vectorEffect="non-scaling-stroke" />
        <text className="nkc-vt" x={0} y={-fs * 0.7} style={{ fontSize: fs }}>{VIEW_NAME[key][ar ? 1 : 0]}</text>
        {ui.center && (
          <g className="nkc-center" pointerEvents="none">
            <line x1={sz.w / 2} y1={-fs} x2={sz.w / 2} y2={sz.h + fs} vectorEffect="non-scaling-stroke" /><line x1={-fs} y1={sz.h / 2} x2={sz.w + fs} y2={sz.h / 2} vectorEffect="non-scaling-stroke" />
          </g>
        )}
        {list.map(({ it, r }) => {
          const sp = spBy.get(it.base);
          const flat = sp && !sp.hw && it.part.type !== 'frame' && it.part.type !== 'drawer';
          const w = r.x1 - r.x0; const h = r.y1 - r.y0;
          const cuts = flat ? it.part.cuts : null;
          let outline = null;
          if (cuts && cuts.length && sp) {
            const [aL, aW, aT] = sp ? planeAxes(sp.ext) : [];
            const depthAxis = AXN[aT];
            if (depthAxis === va.depth) outline = pathOf(outlineOf(r, cuts, { transposed: h > w }));
          }
          const pt = sp ? sp.ptype : 'baseUnit';
          const cls = `nkc-part nk-pt-${pt}${selId === it.base ? ' is-sel' : ''}${hov === it.base ? ' is-hov' : ''}${iso && iso !== pt ? ' is-dim' : ''}${it.part.type === 'hardware' ? ' is-hw' : ''}`;
          const pad = Math.max(0, (6 * mp - Math.min(w, h)) / 2);
          const nm = partName(design, it.part, lang);
          const segs = flat && sp && sp.eb && sp.eb.length ? (() => { const [aL, aW, aT] = planeAxes(sp.ext); return AXN[aT] === va.depth ? edgeSegments(r, sp.eb, aL, aW, key) : []; })() : [];
          return (
            <g
              key={it.id} className={cls} data-id={it.id} data-base={it.base} data-testid={`dpart-${it.base}`}
              role="button" tabIndex={interactive ? 0 : -1} aria-label={`${nm} ${dl(it.box.x1 - it.box.x0)} × ${dl(it.box.y1 - it.box.y0)} × ${dl(it.box.z1 - it.box.z0)} ${unitLabel(getOutput().unit)}`} aria-pressed={selId === it.base}
              onPointerDown={(e) => startPart(e, it, key)} onPointerEnter={() => setHov(it.base)} onPointerLeave={() => setHov(null)} onKeyDown={(e) => onPartKey(e, it, key)}
              onFocus={() => setHov(it.base)} onBlur={() => setHov(null)}
            >
              {outline ? <path d={outline} className="nkc-shape" vectorEffect="non-scaling-stroke" /> : <rect className="nkc-shape" x={r.x0} y={r.y0} width={Math.max(w, 0.5)} height={Math.max(h, 0.5)} vectorEffect="non-scaling-stroke" rx={sp && sp.round ? Math.min(w, h) / 2 : 0} />}
              {segs.map((s, i) => <line key={i} className="nkc-ebl" x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} vectorEffect="non-scaling-stroke" />)}
              {pad > 0 && <rect x={r.x0 - pad} y={r.y0 - pad} width={w + 2 * pad} height={h + 2 * pad} className="nkc-hit" />}
            </g>
          );
        })}
        {/* door swing symbols + handles (front view) */}
        {key === 'front' && lists.front.filter(({ it }) => it.part.type === 'door' && it.part.mode === 'door').map(({ it, r }) => {
          const hingeL = it.part.hinge === 'L'; const mx = hingeL ? r.x0 : r.x1; const fx = hingeL ? r.x1 : r.x0; const my = (r.y0 + r.y1) / 2;
          return <path key={`sw${it.id}`} className="nkc-swing" d={`M${fx} ${r.y0}L${mx} ${my}L${fx} ${r.y1}`} fill="none" vectorEffect="non-scaling-stroke" pointerEvents="none" />;
        })}
        {key === 'front' && handlesBy.map((h, i) => {
          const p = scene.parts.find((q) => q.id === h.partId); if (!p) return null;
          const hv = viewRect({ x0: h.u, x1: h.u, y0: h.y, y1: h.y, z0: 0, z1: 0 }, 'front', dims);
          const len = h.style === 'knob' ? 0 : (h.style === 'profile' ? 300 : h.len);
          return h.style === 'knob'
            ? <circle key={`h${i}`} className="nkc-handle" cx={hv.x0} cy={hv.y0} r={Math.max(5, 6 * mp)} vectorEffect="non-scaling-stroke" pointerEvents="none" />
            : <line key={`h${i}`} className="nkc-handle" x1={h.orient === 'v' ? hv.x0 : hv.x0 - len / 2} y1={h.orient === 'v' ? hv.y0 - len / 2 : hv.y0} x2={h.orient === 'v' ? hv.x0 : hv.x0 + len / 2} y2={h.orient === 'v' ? hv.y0 + len / 2 : hv.y0} vectorEffect="non-scaling-stroke" pointerEvents="none" />;
        })}
        {/* callouts */}
        {ui.callouts && (
          <g className="nkc-callouts" pointerEvents="none">
            {list.map(({ it, r }) => {
              if (firstOf.has(it.base) || it.part.type === 'hardware') return null;
              firstOf.add(it.base);
              const no = numbers.get(it.base); if (!no) return null;
              const rr = 8.5 * mp; const cx = (r.x0 + r.x1) / 2; const cy0 = (r.y0 + r.y1) / 2;
              const small = Math.min(r.x1 - r.x0, r.y1 - r.y0) < rr * 1.6;
              const bx = small ? Math.min(Math.max(cx, rr), sz.w - rr) : cx; const by = bubbleAt(bx, cy0, rr);
              return (
                <g key={`c${it.base}`} className={`nkc-bub${selId === it.base ? ' is-sel' : ''}`} data-no={no}>
                  {(small || by !== cy0) && <line x1={cx} y1={cy0} x2={bx} y2={by} vectorEffect="non-scaling-stroke" />}
                  <circle cx={bx} cy={by} r={rr} vectorEffect="non-scaling-stroke" />
                  <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" style={{ fontSize: Math.min(fs, rr * 1.3) }}>{no}</text>
                </g>
              );
            })}
          </g>
        )}
        {/* dimensions */}
        {ui.dims && (
          <g className="nkc-dims" pointerEvents="none">
            {key === 'front' && <Dim x1={0} y1={sz.h + off} x2={sz.w} y2={sz.h + off} label={dl(dims.w)} fs={fs} below />}
            {key === 'front' && <Dim x1={-off} y1={0} x2={-off} y2={sz.h} label={dl(dims.h)} fs={fs} vertical />}
            {key === 'side' && <Dim x1={0} y1={sz.h + off} x2={sz.w} y2={sz.h + off} label={dl(dims.d)} fs={fs} below />}
            {key === 'top' && <Dim x1={sz.w + off} y1={0} x2={sz.w + off} y2={sz.h} label={dl(dims.d)} fs={fs} vertical />}
            {key === 'top' && mode !== 'all' && <Dim x1={0} y1={sz.h + off} x2={sz.w} y2={sz.h + off} label={dl(dims.w)} fs={fs} below />}
            {key === 'side' && mode !== 'all' && <Dim x1={-off} y1={0} x2={-off} y2={sz.h} label={dl(dims.h)} fs={fs} vertical />}
            {gaps.map((g, i) => (g.axis === 'h'
              ? <Dim key={`g${i}`} x1={g.from} y1={(g.r.y0 + g.r.y1) / 2} x2={g.to} y2={(g.r.y0 + g.r.y1) / 2} label={dl(g.len)} fs={fs * 0.9} cls="s" />
              : <Dim key={`g${i}`} x1={(g.r.x0 + g.r.x1) / 2} y1={g.from} x2={(g.r.x0 + g.r.x1) / 2} y2={g.to} label={dl(g.len)} fs={fs * 0.9} cls="s" vertical />))}
            {selBox && (
              <>
                <Dim x1={selBox.x0} y1={selBox.y0 - 12 * mp} x2={selBox.x1} y2={selBox.y0 - 12 * mp} label={dl(selBox.x1 - selBox.x0)} fs={fs * 0.9} cls="s" />
                <Dim x1={selBox.x1 + 12 * mp} y1={selBox.y0} x2={selBox.x1 + 12 * mp} y2={selBox.y1} label={dl(selBox.y1 - selBox.y0)} fs={fs * 0.9} cls="s" vertical />
              </>
            )}
          </g>
        )}
        {/* [NEO-HANDLES-UX36] the SMART HANDLES of this view (envelope, the selected part's edges, copies) */}
        {interactive && onHandle && ui.handles !== false && (
          <HandleLayer handles={handlesBy2(key)} onChange={onHandle} onActive={onHdlActive} svgRef={svgRef} enabled lang={lang} unitId={selId || null} testid={`handle-layer-${key}`} />
        )}
        {/* snap guides */}
        {guides.map((g, i) => {
          const hAxis = va.h === g.axis; const vAxis = va.v === g.axis; if (!hAxis && !vAxis) return null;
          const dp = viewRect({ x0: g.at, x1: g.at, y0: g.at, y1: g.at, z0: g.at, z1: g.at }, key, dims);
          // the guide position in view coordinates (the rect collapses to a point on the axis)
          const pos = hAxis ? dp.x0 : dp.y0;
          return hAxis ? <line key={i} className="nkc-guide" x1={pos} y1={-fs} x2={pos} y2={sz.h + fs} vectorEffect="non-scaling-stroke" /> : <line key={i} className="nkc-guide" x1={-fs} y1={pos} x2={sz.w + fs} y2={pos} vectorEffect="non-scaling-stroke" />;
        })}
      </g>
    );
  };

  return (
    <div className="nkc-draw" ref={wrapRef} data-testid="custom-drawing" data-mode={mode} data-zoom={zoom.z.toFixed(2)}>
      <svg
        ref={svgRef} className="nkc-svg" viewBox={vb.map((n) => Math.round(n * 100) / 100).join(' ')} preserveAspectRatio="xMidYMid meet" role="group" aria-label={ar ? 'الرسم الفني: أمامي وجانبي وعلوي' : 'Technical drawing: front, side and top views'}
        onPointerDown={startPan} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} direction="ltr" style={{ direction: 'ltr' }}
      >
        {keys.map(renderView)}
      </svg>
      {interactive && (
        <div className="nkc-zoom" role="group" aria-label={ar ? 'تكبير الرسم' : 'Drawing zoom'}>
          <button type="button" className="nk-ib" aria-label={ar ? 'تصغير' : 'Zoom out'} onClick={() => setZ(zoom.z / 1.3)} disabled={zoom.z <= 1}>−</button>
          <output dir="ltr" data-testid="draw-zoom">{Math.round(zoom.z * 100)}%</output>
          <button type="button" className="nk-ib" aria-label={ar ? 'تكبير' : 'Zoom in'} onClick={() => setZ(zoom.z * 1.3)} disabled={zoom.z >= 8}>+</button>
          <button type="button" className="nk-ib" aria-label={ar ? 'ملاءمة' : 'Fit'} onClick={() => setZoom({ z: 1, cx: null, cy: null })} disabled={zoom.z === 1}>⤢</button>
        </div>
      )}
    </div>
  );
}
