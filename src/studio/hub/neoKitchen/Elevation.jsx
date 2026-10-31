/* Neo Kitchen Designer - 2D elevation (CAD mode): millimetric two-tier dimension lines, unit tags, numbered
 * part map, centre lines, wall alignment, internal parts, X-ray drilling, layer toggles, part-type colour
 * coding + legend filter, door-swing symbols and on-canvas drag handles. Everything is drawn from the scene. */
import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { elevationItems } from './geometry';
import { hingeSets, cupCallout } from './hingeHw'; // [NEO-HINGES-UX35] real cup + mounting-plate marks on the Hardware layer
import { PART_TYPES } from './constants';
import { partNameAr } from './cutlist';
import { productInfo } from './productInfo';
import { computeElevationDims, mapBadges, MAP_TYPES } from './elevationDims';
import { useOutput } from './OutputSettingsControl';
import { fitLabelScale, clampPan, zoomAbout, zoomLabel, Z_STEP, COMPACT_STEP } from './elevationFit';
import HandleLayer from '../neoHandles/HandleLayer';
import './elevationPro.css';

const FRONTS = new Set(['door', 'drawer', 'flip', 'glass', 'cover']);

export function layerVisible(it, layers) {
  if (it.type === 'counter') return layers.counter;
  if (it.type === 'plinth') return layers.plinth;
  if (!layers[it.row]) return false;
  if (FRONTS.has(it.type) && !layers.doors) return false;
  return true;
}

/** `handles` (optional): which on-canvas drag handles the selected unit shows; the wardrobe studio has no per-section drag. Default = all three (kitchen unchanged). */
/** [NEO-HANDLES-UX36] `handleList` (optional): the shared SMART HANDLES (neoHandles/*Handles.js builders) drawn by <HandleLayer>; `onHandle(h, value, phase)` commits them. When given, the three legacy
 *  selected-unit handles above are not drawn (the layer replaces them); `ui.handles === false` hides the layer. */
export default function Elevation({ scene, runKey, ui, selected, onSelect, onDrag, lang, interactive = true, handles = ['width', 'height', 'section'], barSlot = null, handleList = null, onHandle = null }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const pan = useRef(null);
  const panned = useRef(false);
  const [hov, setHov] = useState(null);
  const [out] = useOutput(); // [NEO-OUTPUT-UX34] dimension labels follow the Output unit (relabelled, never recomputed)
  const [lgIso, setLgIso] = useState(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const run = scene.runs.find((r) => r.key === runKey) || scene.runs[0];
  const g = scene.model.g;
  const L = run.L;
  const layers = ui.layers;
  const items = useMemo(() => elevationItems(scene, run.key).filter((it) => layerVisible(it, layers)), [scene, run.key, layers]);
  const Hmax0 = Math.max(...run.units.map((x) => x.y0 + x.H), g.plinthH + g.baseH);
  const dims = ui.dims;
  /* UX-23 fit: the canvas box is measured; when the labels would print under MIN_LABEL_PX at the fitted zoom, the label font (and the lane
   * gaps that follow it) grow by one factor. Dimension values, extents and the model are never touched. */
  const canvasRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = canvasRef.current; if (!el || !interactive) return undefined;
    const read = () => { const r = el.getBoundingClientRect(); const w = Math.round(r.width / 8) * 8; const h = Math.round(r.height / 8) * 8; setBox((b) => (b.w === w && b.h === h ? b : { w, h })); };
    read();
    if (typeof window === 'undefined' || !window.ResizeObserver) return undefined;
    const ro = new window.ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, [interactive]);
  const lay0 = useMemo(() => computeElevationDims(scene, run.key, { layers, items: elevationItems(scene, run.key) }), [scene, run.key, layers, out]); // eslint-disable-line react-hooks/exhaustive-deps
  const frameOf = (l) => {
    const b = dims ? l.bbox : { x0: -90, x1: L + 90, y0: -120, y1: Hmax0 + 90 }; const m = dims ? l.fs * 0.8 : 0;
    const pl = m - b.x0; const pt = m + b.y1 - Hmax0; const pr = m + b.x1 - L; const pb = m - b.y0;
    return { padL: pl, padT: pt, vbW: pl + L + pr, vbH: pt + Hmax0 + pb };
  };
  const f0 = frameOf(lay0);
  const growth = interactive && dims ? fitLabelScale({ fs0: lay0.fs, vbW0: f0.vbW, vbH0: f0.vbH, coreW: L, coreH: Hmax0, cw: box.w, ch: box.h }) : 1;
  const lay = useMemo(() => (growth > 1.02 ? computeElevationDims(scene, run.key, { layers, items: elevationItems(scene, run.key), fs: Math.round(lay0.fs * growth), stepK: COMPACT_STEP }) : lay0), [growth, lay0, scene, run.key, layers]);
  const fs = lay.fs;
  /* [NEO-HANDLES-UX36] while a handle is being dragged the frame (viewBox origin, size, floor line) is FROZEN, so the drawing does not re-fit under the pointer; it re-fits on release */
  const frozen = useRef(null); const liveFrame = useRef(null); const [hdlDrag, setHdlDrag] = useState(false);
  liveFrame.current = { ...frameOf(lay), Hm: Hmax0 };
  const fz = hdlDrag && frozen.current ? frozen.current : liveFrame.current;
  const { padL, padT, vbW, vbH } = fz; const Hmax = fz.Hm;
  const onHdlActive = useCallback((on) => { frozen.current = on ? liveFrame.current : null; setHdlDrag(!!on); }, []);
  const X = (u) => padL + u, Y = (y) => padT + Hmax - y;
  const xray = ui.xray;
  const unitsOf = new Set(run.units.map((x) => x.unit.id));
  const handlesOf = scene.handles.filter((h) => unitsOf.has(h.unitId));
  const hingesOf = scene.hinges.filter((h) => unitsOf.has(h.unitId));
  const pinsOf = scene.pins.filter((p) => unitsOf.has(p.unitId));
  const selUnit = selected && run.units.find((x) => x.unit.id === selected.unitId);
  const iso = lgIso || ui.isolate;
  const typeOf = (it) => (it.carcass && it.row === 'top' ? 'topUnit' : it.type);
  const dimmed = (type) => (iso && iso !== type ? ' nk-out' : '');
  const L10n = (en, ar) => (lang === 'ar' ? ar : en);
  const mapOn = !!ui.map;
  const itemSel = (it) => !!(selected && ((it.partId && selected.partId === it.partId) || (!it.partId && it.carcass && selected.unitId === it.unitId && !selected.partId)));
  const pick = (it) => (e) => { e.stopPropagation(); if (panned.current) { panned.current = false; return; } onSelect({ unitId: it.unitId, partId: it.partId || null, label: it.label }); };
  const hoverOf = (it) => (interactive ? { onPointerEnter: () => setHov(it.no), onPointerLeave: () => setHov((h) => (h === it.no ? null : h)) } : {});

  /* ----- zoom / pan: only the viewBox changes, so text is never stretched (labels are laid out in model mm) ----- */
  const vb = useRef({ w: vbW, h: vbH });
  vb.current = { w: vbW, h: vbH };
  const clampView = (v) => clampPan(v, vb.current.w, vb.current.h);
  const zoomAt = useCallback((factor, px, py) => setView((v) => zoomAbout(v, factor, vb.current.w, vb.current.h, px, py)), []);
  useEffect(() => { setView({ k: 1, tx: 0, ty: 0 }); }, [run.key]);
  useEffect(() => {
    const svg = svgRef.current; if (!svg || !interactive) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const m = svg.getScreenCTM(); if (!m) return;
      const p = pt.matrixTransform(m.inverse());
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [interactive, zoomAt]);
  const cv = clampView(view);
  const viewBox = `${cv.tx} ${cv.ty} ${vbW / cv.k} ${vbH / cv.k}`;
  const bgDown = (e) => {
    if (!interactive || cv.k <= 1) return;
    pan.current = { x: e.clientX, y: e.clientY, tx: cv.tx, ty: cv.ty, moved: false };
  };
  const bgMove = (e) => {
    const p = pan.current; if (!p) return;
    const m = svgRef.current && svgRef.current.getScreenCTM(); if (!m) return;
    const dx = e.clientX - p.x; const dy = e.clientY - p.y;
    if (!p.moved && Math.abs(dx) + Math.abs(dy) > 4) { p.moved = true; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); }
    if (p.moved) setView(clampView({ k: cv.k, tx: p.tx - dx / m.a, ty: p.ty - dy / m.d }));
  };
  const bgUp = (e) => { const p = pan.current; if (p) { panned.current = p.moved; e.currentTarget.releasePointerCapture && e.currentTarget.releasePointerCapture(e.pointerId); } pan.current = null; };

  /* ----- drag handles ----- */
  const toMM = useCallback((e) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { u: p.x - padL, y: Hmax - (p.y - padT) };
  }, [padL, padT, Hmax]);
  const startDrag = (kind, extra) => (e) => {
    if (!interactive) return;
    e.stopPropagation(); e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind, ...extra };
  };
  const moveDrag = (e) => {
    const d = drag.current; if (!d) return;
    const p = toMM(e); if (!p) return;
    onDrag({ ...d, value: d.kind === 'width' ? (d.flip ? d.right - p.u : p.u - d.left) : p.y, final: false });
  };
  const endDrag = (e) => { if (drag.current) { e.currentTarget.releasePointerCapture && e.currentTarget.releasePointerCapture(e.pointerId); drag.current = null; } };
  const keyDrag = (kind, extra, cur) => (e) => {
    const step = (e.shiftKey ? 50 : 10);
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    onDrag({ ...extra, kind, value: cur + dir * step * (kind === 'width' && extra.flip ? -1 : 1), final: true });
  };

  /* ----- pieces ----- */
  const els = [];
  let k = 0;
  const key = () => `e${k++}`;
  const T = (x, y, s, cls = '', anchor = 'middle', size = fs) => els.push(<text key={key()} x={x} y={y} className={`nk-t ${cls}`} textAnchor={anchor} style={{ fontSize: size }} dominantBaseline="middle">{s}</text>);
  const Ln = (x1, y1, x2, y2, cls) => els.push(<line key={key()} x1={x1} y1={y1} x2={x2} y2={y2} className={cls} />);
  /* row bands (right-hand TOP / WALL / BASE reference regions) + dashed row guides aligned to the real row heights */
  if (dims) {
    lay.bands.forEach((bd) => {
      els.push(<rect key={key()} x={X(bd.x0)} y={Y(bd.y1)} width={bd.x1 - bd.x0} height={bd.y1 - bd.y0} className={`nk-rb nk-rb-${bd.row}`} data-band={bd.row} />);
      [bd.y0, bd.y1].forEach((yy) => Ln(X(-120), Y(yy), X(bd.x1), Y(yy), `nk-rg nk-rg-${bd.row}`));
      T(X(bd.x1) + fs * 0.3, Y((bd.y0 + bd.y1) / 2), bd.cap, `nk-rcap nk-rcap-${bd.row}`, 'start', fs * 0.9);
    });
    lay.caps.forEach((c) => T(X(c.x), Y(c.y), c.cap || c.text, `nk-cap nk-cap-${c.row}`, 'end', fs * 0.55));
  }
  /* wall alignment */
  if (ui.wall || dims) {
    Ln(X(0), Y(Hmax) - 40, X(0), Y(0) + 30, 'nk-wall'); Ln(X(L), Y(Hmax) - 40, X(L), Y(0) + 30, 'nk-wall');
    /* the part hidden behind another run: a leg's first `hiddenBase` mm (kitchen, base-row height); a WARDROBE scene names the span itself (run.hiddenSpan,
     * either run) and it is hatched over the whole column height */
    const wdScene = scene.product === 'wardrobe';
    const hid = wdScene ? run.hiddenSpan : (run.hiddenBase > 0 ? { u0: run.flip ? L - run.hiddenBase : 0, u1: (run.flip ? L - run.hiddenBase : 0) + run.hiddenBase } : null);
    if (hid && hid.u1 > hid.u0) {
      els.push(<rect key={key()} x={X(hid.u0)} y={wdScene ? Y(Hmax) : Y(g.plinthH + g.baseH)} width={hid.u1 - hid.u0} height={wdScene ? Hmax - g.plinthH : g.baseH} className="nk-hidden"><title>{wdScene ? L10n('Hidden behind the neighbouring wardrobe (corner)', 'مخفي خلف الخزانة المجاورة (الزاوية)') : L10n('Hidden behind the main run', 'مخفي خلف الصف الرئيسي')}</title></rect>);
    }
  }
  Ln(X(-60), Y(0), X(L + 60), Y(0), 'nk-floor');

  /* items */
  items.forEach((it) => {
    const x = X(it.u0), y = Y(it.y1), w = it.u1 - it.u0, h = it.y1 - it.y0;
    const ty = typeOf(it);
    const isSel = itemSel(it);
    const cls = `nk-it nk-pt nk-pt-${ty}${xray ? ' nk-xr' : ''}${isSel ? ' nk-sel' : ''}${hov === it.no && !isSel ? ' nk-hov' : ''}${dimmed(ty)}`;
    els.push(
      <rect key={key()} x={x} y={y} width={w} height={h} className={cls} data-no={it.no} data-type={ty} data-part={it.partId || undefined} data-unit={it.unitId || undefined} onClick={interactive ? pick(it) : undefined} {...hoverOf(it)}>
        <title>{`${it.no}. ${it.label}${it.size ? ' - ' + it.size + ' mm' : ''}`}</title>
      </rect>,
    );
    if (it.type === 'glass' && !xray) Ln(x + w * 0.1, y + h * 0.08, x + w * 0.9, y + h * 0.7, 'nk-glare');
    if (it.niche && !xray) {
      els.push(<rect key={key()} x={x + w * 0.05} y={y + h * 0.04} width={w * 0.9} height={h * 0.92} className="nk-appl"><title>{it.niche}</title></rect>);
      T(x + w / 2, y + h / 2, it.nicheLabel ? it.nicheLabel[lang === 'ar' ? 1 : 0] : it.niche === 'oven' ? 'OVEN' : 'FRIDGE', 'nk-appl-t', 'middle', fs * 0.8); /* nicheLabel: a category studio names its niche (washer, dryer, TV) - [en, ar] */
    }
    const isOpen = ui.openDoors || xray || (it.partId && ui.openIds && ui.openIds.has(it.partId));
    if (isOpen && it.anim && it.anim.k === 'door') {
      const hx = it.anim.side === 'L' ? x : x + w, fx = it.anim.side === 'L' ? x + w : x;
      els.push(<path key={key()} d={`M${fx} ${y}L${hx} ${y + h / 2}L${fx} ${y + h}`} className="nk-swing" />);
    }
    /* [NEO-HINGES-UX35] the selected door always shows its swing symbol (apex on the hinge side), open or not */
    if (!isOpen && itemSel(it) && it.anim && it.anim.k === 'door') {
      const hx = it.anim.side === 'L' ? x : x + w, fx = it.anim.side === 'L' ? x + w : x;
      els.push(<path key={key()} d={`M${fx} ${y}L${hx} ${y + h / 2}L${fx} ${y + h}`} className="nk-swing-sel" />);
    }
    if (!isOpen && itemSel(it) && it.anim && it.anim.k === 'flip') els.push(<path key={key()} d={`M${x} ${y + h}L${x + w / 2} ${y}L${x + w} ${y + h}`} className="nk-swing-sel" />);
    if (isOpen && it.anim && it.anim.k === 'flip') els.push(<path key={key()} d={`M${x} ${y + h}L${x + w / 2} ${y}L${x + w} ${y + h}`} className="nk-swing" />);
    if ((ui.openDoors || (it.partId && ui.openIds && ui.openIds.has(it.partId))) && it.anim && it.anim.k === 'drawer') { els.push(<path key={key()} d={`M${x + w * 0.3} ${y + h / 2}h${w * 0.4}m-14 -10l14 10l-14 10`} className="nk-swing" />); }
  });

  /* NEO-CLOSETS-UX24 (wardrobe scenes only): the black frames and glazing bars of glass / smoked doors, drawn over the pane so a division reads in the drawing too */
  if (scene.product === 'wardrobe' && layers.doors) {
    scene.parts.filter((p) => p.frame && unitsOf.has(p.unitId) && layers[p.row]).forEach((p) => {
      els.push(<rect key={key()} x={X(p.box.u0)} y={Y(p.box.y1)} width={p.box.u1 - p.box.u0} height={p.box.y1 - p.box.y0} className={`nk-frame${xray ? ' nk-xr' : ''}`} data-bar={/bar/.test(p.name) ? '1' : undefined} />);
    });
  }

  /* the selected cabinet: one clear outline around the whole unit (the same unit is highlighted in 3D and in the parameter editor) */
  if (selUnit && layers[selUnit.row]) els.push(<rect key={key()} x={X(selUnit.fu0)} y={Y(selUnit.y0 + selUnit.H)} width={selUnit.W} height={selUnit.H} className="nk-selbox" data-selbox={selUnit.unit.id} />);

  /* internal parts (hidden lines) */
  /* [NEO-CLOSETS-UX30] drawers INSIDE a wardrobe column (p.behind) are hidden lines under their door; the moment that column's door is open they show, dashed, without the Internal toggle */
  const doorOpenUnits = new Set();
  if (ui.openDoors || (ui.openIds && ui.openIds.size)) scene.parts.forEach((p) => { if (p.anim && (p.anim.k === 'door' || p.anim.k === 'slide') && (ui.openDoors || ui.openIds.has(p.id))) doorOpenUnits.add(p.unitId); });
  if (ui.internal || xray || doorOpenUnits.size) {
    scene.parts.filter((p) => unitsOf.has(p.unitId) && (ui.internal || xray || (p.behind && doorOpenUnits.has(p.unitId)))).forEach((p) => {
      const row = p.row;
      if (!layers[row]) return;
      const b = p.box;
      if (p.kind === 'shelf' || p.kind === 'divider' || p.kind === 'carousel') els.push(<rect key={key()} x={X(b.u0)} y={Y(b.y1)} width={b.u1 - b.u0} height={Math.max(3, b.y1 - b.y0)} className="nk-int nk-int-shelf" />);
      else if (p.kind === 'drawerBox' && /box front|inner front/.test(p.name)) els.push(<rect key={key()} x={X(b.u0)} y={Y(b.y1)} width={b.u1 - b.u0} height={b.y1 - b.y0} className="nk-int" />);
      else if (p.kind === 'drawerBox' && /side/.test(p.name)) els.push(<rect key={key()} x={X(b.u0)} y={Y(b.y1)} width={b.u1 - b.u0} height={b.y1 - b.y0} className="nk-int" />);
      else if (p.kind === 'back') els.push(<rect key={key()} x={X(b.u0)} y={Y(b.y1)} width={b.u1 - b.u0} height={b.y1 - b.y0} className="nk-int nk-groove"><title>{L10n('Back panel / groove', 'لوح الظهر / المجرى')}</title></rect>);
    });
  }

  /* hardware layer */
  if (layers.hardware) {
    if (!xray) {
      handlesOf.forEach((h) => {
        if (!layers[scene.parts.find((p) => p.id === h.partId)?.row || 'base']) return;
        if (h.style === 'knob') els.push(<circle key={key()} cx={X(h.u)} cy={Y(h.y)} r={11} className="nk-handle-m" />);
        else if (h.style === 'profile') { if (h.orient === 'v') els.push(<rect key={key()} x={X(h.u) - 4} y={Y(h.y + 160)} width={8} height={320} className="nk-handle-m" />); else els.push(<rect key={key()} x={X(h.u) - 160} y={Y(h.y) - 4} width={320} height={8} className="nk-handle-m" />); }
        else if (h.orient === 'v') els.push(<rect key={key()} x={X(h.u) - 6} y={Y(h.y + h.len / 2)} width={12} height={h.len} className="nk-handle-m" />);
        else els.push(<rect key={key()} x={X(h.u) - h.len / 2} y={Y(h.y) - 6} width={h.len} height={12} className="nk-handle-m" />);
      });
    } else {
      hingesOf.forEach((h) => { els.push(<circle key={key()} cx={X(h.u)} cy={Y(h.y)} r={h.r} className="nk-drill nk-cup"><title>{`Ø${h.r * 2} hinge cup`}</title></circle>); });
      handlesOf.forEach((h) => h.holes.forEach((p) => els.push(<circle key={key()} cx={X(p[0])} cy={Y(p[1])} r={3.5} className="nk-drill" />)));
      pinsOf.filter((p) => p.d > 200).forEach((p) => els.push(<circle key={key()} cx={X(p.u + (p.side === 'L' ? 10 : -10))} cy={Y(p.y)} r={3} className="nk-drill nk-pin" />));
    }
  }

  /* [NEO-HINGES-UX35] hinge cups (real Ø, dashed) + the mounting-plate screw holes on the carcass side, with the drilling numbers as tooltips; X-Ray keeps its solid cups */
  if (layers.hardware && layers.doors) {
    hingeSets(scene).filter((st) => unitsOf.has(st.unitId) && layers[st.row]).forEach((st) => {
      const cx = X(st.cup.u), cy = Y(st.cup.y);
      if (!xray) els.push(<g key={key()} className="nk-cup-g"><circle cx={cx} cy={cy} r={st.cup.r} className="nk-cup-m" /><circle cx={cx} cy={cy} r={2.2} className="nk-cup-m-c" /><title>{cupCallout(st, lang)}</title></g>);
      if (st.plate) st.plate.screws.forEach((sy) => els.push(<circle key={key()} cx={X(st.plate.u)} cy={Y(sy)} r={st.plate.r} className="nk-plate-m"><title>{L10n('Hinge plate screw Ø5 × 10', 'برغي قاعدة المفصلة Ø5 × 10')}</title></circle>));
    });
  }

  /* appliances on the worktop */
  if (layers.counter) {
    run.counters.forEach((c) => c.cutouts.filter((q) => q.type === 'sink').forEach((q) => {
      const cx = X(q.cu);
      els.push(<path key={key()} d={`M${cx - 6} ${Y(c.y1)}v-170q0 -40 40 -40h14v14h-12q-22 0 -22 26v170z`} className="nk-faucet"><title>{L10n('Sink + tap', 'حوض + حنفية')}</title></path>);
      T(cx, Y(c.y1) + fs * 0.9, 'SINK', 'nk-appl-t', 'middle', fs * 0.7);
    }));
    run.counters.forEach((c) => c.cutouts.filter((q) => q.type === 'hob').forEach((q) => T(X(q.cu), Y(c.y1) + fs * 0.9, 'HOB', 'nk-appl-t', 'middle', fs * 0.7)));
  }

  /* centre lines */
  if (ui.center) run.units.filter((x) => layers[x.row]).forEach((x) => { const cx = X(x.fu0 + x.W / 2); Ln(cx, Y(x.y0 + x.H) - 24, cx, Y(x.y0) + 24, 'nk-center'); });

  /* map badges: one numbered badge per part, same numbers as the cut-list Map column */
  const badges = mapOn ? mapBadges(items, fs, run.key) : [];
  const itemByNo = new Map(items.map((it) => [it.no, it]));
  badges.forEach((bd) => {
    const it = itemByNo.get(bd.no); if (!it) return;
    const cx = X(bd.cx), cy = Y(bd.cy);
    const ty = typeOf(it); const isSel = itemSel(it);
    els.push(
      <g key={key()} className={`nk-bubble nk-bt-${ty}${isSel ? ' nk-sel' : ''}${hov === it.no && !isSel ? ' nk-hov' : ''}${dimmed(ty)}`} data-badge={bd.label} onClick={interactive ? pick(it) : undefined} {...hoverOf(it)}>
        <circle cx={cx} cy={cy} r={bd.r} />
        <text x={cx} y={cy} style={{ fontSize: bd.r * (String(bd.label).length > 2 ? 0.82 : 1) }} textAnchor="middle" dominantBaseline="central">{bd.label}</text>
        {bd.name && <text x={cx + bd.r * 1.3} y={cy} style={{ fontSize: bd.r * 1.05 }} textAnchor="start" dominantBaseline="central" className="nk-bname">{L10n(bd.name, partNameAr(bd.name))}</text>}
      </g>,
    );
  });

  /* dimension layers: primary (module / overall / vertical) and secondary (calculated board sizes), all from computeElevationDims */
  if (dims) {
    lay.dims.forEach((d) => {
      const tone = d.tone === 'primary' ? 'nk-dp' : 'nk-ds';
      const h = d.axis === 'h';
      const tk = fs * 0.22;
      d.ext.forEach(([x1, y1, x2, y2]) => Ln(X(x1), Y(y1), X(x2), Y(y2), `nk-ext ${tone}`));
      Ln(X(d.line.x1), Y(d.line.y1), X(d.line.x2), Y(d.line.y2), `nk-dl ${tone}`);
      [[d.line.x1, d.line.y1], [d.line.x2, d.line.y2]].forEach(([qx, qy]) => {
        if (h) Ln(X(qx), Y(qy) - tk, X(qx), Y(qy) + tk, `nk-dl nk-tick ${tone}`); else Ln(X(qx) - tk, Y(qy), X(qx) + tk, Y(qy), `nk-dl nk-tick ${tone}`);
      });
      const lx = X(d.lbox.cx), ly = Y(d.lbox.cy);
      els.push(<text key={key()} className={`nk-t nk-dt ${tone}`} data-dim={d.kind} data-tone={d.tone} data-lane={d.lane} style={{ fontSize: fs }} textAnchor="middle" dominantBaseline="central" {...(h ? { x: lx, y: ly } : { transform: `translate(${lx} ${ly}) rotate(-90)` })}>{d.label}{d.kind === 'board-w' || d.kind === 'board-h' ? <title>{L10n('Calculated board size (as in the cutting list)', 'مقاس لوح محسوب (كما في قائمة القطع)')}</title> : null}</text>);
      if (d.tag) els.push(<text key={key()} className="nk-t nk-dtag" x={X(d.tbox.cx)} y={Y(d.tbox.cy)} style={{ fontSize: fs * 0.8 }} textAnchor="middle" dominantBaseline="central">{d.tag}</text>);
    });
    /* "18 board" note: the carcass board thickness, beside the secondary base lane */
    if (lay.note) T(X(lay.note.x), Y(lay.note.y), lay.note.text, 'nk-dt nk-ds nk-boardnote', 'start', fs * 0.8);
    /* cabinet row labels under the base row, joined to their width segments by a thin bracket */
    lay.cabinets.forEach((c) => {
      const hook = fs * 0.45;
      const sel = selected && selected.unitId === c.id && !selected.partId;
      const pickCab = interactive ? (e) => { e.stopPropagation(); onSelect({ unitId: c.id, partId: null, label: c.text }); } : undefined;
      els.push(
        <g key={key()} className={`nk-cab${sel ? ' nk-sel' : ''}`} data-cab={c.text} onClick={pickCab}>
          <path d={`M${X(c.a + 3)} ${Y(c.y) - hook}V${Y(c.y)}H${X(c.b - 3)}V${Y(c.y) - hook}`} className="nk-brk" />
          <line x1={X(c.cx)} y1={Y(c.y)} x2={X(c.cx)} y2={Y(c.box.y1)} className="nk-brk" />
          <circle cx={X(c.box.x0) + fs * 0.75} cy={Y(c.cy)} r={fs * 0.75} className="nk-cabc" />
          <text x={X(c.box.x0) + fs * 0.75} y={Y(c.cy)} style={{ fontSize: fs * 0.85 }} textAnchor="middle" dominantBaseline="central" className="nk-cabn">{c.num}</text>
          <text x={X(c.box.x0) + fs * 1.85} y={Y(c.cy)} style={{ fontSize: fs * 0.85 }} textAnchor="start" dominantBaseline="central" className="nk-cabt">{L10n(c.text, partNameAr(c.text))}</text>
                  </g>,
      );
    });
  }

  /* drag handles for the selected unit */
  const handleEls = [];
  if (interactive && !handleList && selUnit && layers[selUnit.row]) {
    const x = selUnit;
    const flip = run.flip;
    const edgeU = flip ? x.fu0 : x.fu0 + x.W;
    const midY = x.y0 + x.H / 2;
    const unitStartU = flip ? null : x.fu0;
    handleEls.push(
      <g key="hw" className="nk-hnd" onClick={(ev) => ev.stopPropagation()} tabIndex={0} role="slider" aria-label={L10n('Drag: unit width', 'اسحب: عرض الوحدة')} aria-valuenow={x.W}
        onPointerDown={startDrag('width', { unitId: x.unit.id, row: x.row, run: run.key, flip, left: unitStartU, right: x.fu0 + x.W })} onPointerMove={moveDrag} onPointerUp={endDrag}
        onKeyDown={keyDrag('width', { unitId: x.unit.id, row: x.row, run: run.key, flip }, x.W)}>
        <title>{L10n('Drag left / right: width', 'اسحب يمينًا/يسارًا: العرض')}</title>
        <rect x={X(edgeU) - 11} y={Y(midY) - 40} width={22} height={80} className="nk-hnd-r" />
      </g>,
      <g key="hh" className="nk-hnd nk-hnd-v" onClick={(ev) => ev.stopPropagation()} tabIndex={0} role="slider" aria-label={L10n('Drag: height', 'اسحب: الارتفاع')} aria-valuenow={x.H}
        onPointerDown={startDrag('height', { unitId: x.unit.id, row: x.row, run: run.key, y0: x.y0 })} onPointerMove={moveDrag} onPointerUp={endDrag}
        onKeyDown={keyDrag('height', { unitId: x.unit.id, row: x.row, run: run.key, y0: x.y0 }, x.y0 + x.H)}>
        <title>{L10n('Drag up / down: height', 'اسحب لأعلى/لأسفل: الارتفاع')}</title>
        <rect x={X(x.fu0 + x.W / 2) - 40} y={Y(x.y0 + x.H) - 11} width={80} height={22} className="nk-hnd-r" />
      </g>,
    );
    x.bounds.slice(1).forEach((b, i) => handleEls.push(
      <g key={`hs${i}`} className="nk-hnd nk-hnd-v" onClick={(ev) => ev.stopPropagation()} tabIndex={0} role="slider" aria-label={L10n(`Drag: section ${i + 1} height`, `اسحب: ارتفاع القسم ${i + 1}`)} aria-valuenow={Math.round(x.bounds[i].top - x.bounds[i].bot)}
        onPointerDown={startDrag('section', { unitId: x.unit.id, row: x.row, run: run.key, si: i, top: x.bounds[i].top })} onPointerMove={moveDrag} onPointerUp={endDrag}
        onKeyDown={keyDrag('section', { unitId: x.unit.id, row: x.row, run: run.key, si: i, top: x.bounds[i].top, keyMode: true }, x.bounds[i].bot)}>
        <title>{L10n('Drag up / down: section height', 'اسحب: ارتفاع القسم')}</title>
        <rect x={X(x.fu0 + x.W / 2) - 30} y={Y(b.top) - 9} width={60} height={18} className="nk-hnd-r" />
      </g>,
    ));
  }

  const present = new Set(items.map(typeOf));
  const WD_MAP = { baseUnit: { en: 'Column', ar: 'عمود' }, cover: { en: 'Cover panel', ar: 'لوح تغطية' } }; // wardrobe scenes (NEO-CLOSETS-UX22): no wall / flip-up / sink terms
  const regLegend = productInfo(scene.product) && productInfo(scene.product).legend; // another registered product (NEO-CATEGORIES-UX26): its own keys and wording
  const legend = regLegend
    ? MAP_TYPES.filter((t) => regLegend.keys.includes(t.k) && (t.k !== 'topUnit' || present.has('topUnit'))).map((t) => (regLegend.names && regLegend.names[t.k] ? { ...t, en: regLegend.names[t.k][0], ar: regLegend.names[t.k][1] } : t))
    : scene.product === 'wardrobe'
    ? MAP_TYPES.filter((t) => ['baseUnit', 'door', 'drawer', 'glass', 'open', 'shelf', 'cover'].includes(t.k)).map((t) => (WD_MAP[t.k] ? { ...t, ...WD_MAP[t.k] } : t))
    : MAP_TYPES.filter((t) => t.k !== 'topUnit' || present.has('topUnit'));
  const svg = (
    <svg ref={svgRef} className={`nk-elev${mapOn ? ' nk-map-on' : ''}${cv.k > 1 ? ' nk-zoomed' : ''}`} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label={L10n(`Elevation ${run.label}: ${Math.round(L)} mm wide`, `واجهة ${run.label}: العرض ${Math.round(L)} مم`)}
      onPointerDown={bgDown} onPointerMove={bgMove} onPointerUp={bgUp} onPointerCancel={bgUp}
      onClick={interactive ? () => { if (panned.current) { panned.current = false; return; } onSelect(null); } : undefined} data-run={run.key} data-items={items.length} data-zoom={cv.k.toFixed(2)} data-dims={dims ? lay.dims.length : 0}>
      <defs>
        <pattern id="nk-hatch" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="24" className="nk-hatch-l" /></pattern>
      </defs>
      <rect x={0} y={0} width={vbW} height={vbH} className="nk-bgrect" onDoubleClick={interactive ? () => setView({ k: 1, tx: 0, ty: 0 }) : undefined} />
      {els}
      {handleEls.filter((e) => handles.includes(e.key === 'hw' ? 'width' : e.key === 'hh' ? 'height' : 'section'))}
      {interactive && handleList && onHandle ? <HandleLayer handles={handleList} onChange={onHandle} onActive={onHdlActive} svgRef={svgRef} enabled={ui.handles !== false} unitId={selected ? selected.unitId : null} lang={lang} place={(h) => ({ x: X(h.at.u), y: Y(h.at.y) })} /> : null}
    </svg>
  );
  if (!interactive) return svg;
  const zoomEl = (
    <div className="nk-zoom" role="group" aria-label={L10n('Zoom', 'تكبير')}>
      <button type="button" aria-label={L10n('Zoom out', 'تصغير')} data-testid="zoom-out" disabled={cv.k <= 1} onClick={() => zoomAt(1 / Z_STEP)}>−</button>
      <button type="button" aria-label={L10n('Zoom in', 'تكبير')} data-testid="zoom-in" onClick={() => zoomAt(Z_STEP)}>+</button>
      <output className="nk-zoom-v nk-mono" dir="ltr" aria-live="polite" data-testid="zoom-value">{zoomLabel(cv.k)}</output>
      <button type="button" className="nk-zoom-fit" aria-label={L10n('Fit to view', 'ملاءمة')} data-testid="zoom-fit" onClick={() => setView({ k: 1, tx: 0, ty: 0 })}>{L10n('Fit', 'ملاءمة')}</button>
    </div>
  );
  const legendEl = mapOn && legend.length > 0 ? (
    <div className="nk-maplegend" role="group" aria-label={L10n('Component types (click to isolate)', 'أنواع المكونات (انقر للعزل)')} data-testid="map-legend">
      {legend.map((t) => (
        <button key={t.k} type="button" className="nk-mlg" aria-pressed={lgIso === t.k} data-type={t.k} data-absent={present.has(t.k) ? undefined : '1'} onClick={() => setLgIso(lgIso === t.k ? null : t.k)}>
          <i className={`nk-mlg-sw nk-bt-${t.k}`} aria-hidden="true" />{t[lang === 'ar' ? 'ar' : 'en']}
        </button>
      ))}
    </div>
  ) : null;
  return (
    <div className="nk-elevwrap">
      {barSlot ? createPortal(zoomEl, barSlot) : null}
      {(!barSlot || legendEl) && <div className="nk-elevbar" role="toolbar" aria-label={L10n('Drawing view', 'عرض الرسم')}>{!barSlot && zoomEl}{legendEl}</div>}
      <div className="nk-elevcanvas" ref={canvasRef}>{svg}</div>
    </div>
  );
}

export const LEGEND = PART_TYPES;
