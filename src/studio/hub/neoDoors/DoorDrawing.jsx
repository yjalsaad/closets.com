/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - the technical drawing: ELEVATION (seen from outside) and PLAN (section at the handle, with the swing).
 * Drawn from the same parts as the 3D view and the cut list (doorGeometry.js), in millimetres, so every parameter changes it live.
 * Dimensions: blue = opening (totals), red = leaf and clear sizes, grey = hinges, gaps and the handle. Numbered badges ("Map") are the row numbers of the cut list.
 * Strokes are screen-pixel widths (non-scaling) and label sizes follow the measured zoom so they stay readable.
 * ===========================================================================*/
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { cellKind } from './doorGeometry';
import { FINISHES, TYPE_LABEL, construction } from './doorModel';
import HandleLayer from '../neoHandles/HandleLayer';
import { useOutput } from '../neoKitchen/OutputSettingsControl';
import { getOutput, dimText, unitLabel } from '../neoKitchen/outputSettings';

/* [NEO-OUTPUT-UX34] dimension text follows the Output unit: millimetres are exactly the numbers the drawing always printed; cm / inch relabel them (the model stays in mm) */
const f1 = (v) => { const o = getOutput(); return o.unit === 'mm' ? String(Math.round(v * 10) / 10) : dimText(v, o); };
const fu = (v) => { const o = getOutput(); return o.unit === 'mm' ? v : dimText(v, o); };
const SKIN_L = { paint: ['paint', 'دهان'], veneer: ['veneer', 'قشرة'], lacquer: ['lacquer', 'لكر'], laminate: ['laminate', 'لامينيت'] };
const CORE_L = { solid: ['solid core', 'قلب صلب'], hollow: ['hollow core', 'قلب مجوف'], engineered: ['engineered core', 'قلب هندسي'] };
const TIMBER_L = { softwood: ['softwood', 'خشب لين'], hardwood: ['hardwood', 'خشب صلب'] };
/** the title block of the drawing: what the leaf is made of, so a change of finish, skin, timber or core is visible in the drawing too */
export function specLines(d, S, ar) {
  const i = ar ? 1 : 0; const k = construction(d); const flushy = k === 'flush' || k === 'moulded';
  const l1 = `${TYPE_LABEL[d.type][i]} · ${S.n > 1 ? '2 × ' : ''}${fu(S.leafW)} × ${fu(S.leafH)} × ${fu(S.T)} ${unitLabel(getOutput().unit, ar ? 'ar' : 'en')}`;
  const l2 = `${FINISHES[d.leaf.finish][ar ? 'ar' : 'en']} · ${SKIN_L[d.leaf.skin][i]} · ${TIMBER_L[d.leaf.timber][i]}${flushy ? ` · ${CORE_L[d.leaf.core][i]} · ${d.leaf.skinT} ${ar ? 'مم جلد' : 'mm skin'}` : ''}`;
  const l3 = `${d.swing.hand} ${d.swing.dir === 'in' ? (ar ? 'يفتح للداخل' : 'opens in') : (ar ? 'يفتح للخارج' : 'opens out')}${d.fire.rating !== 'none' ? ` · ${d.fire.rating}` : ''}`;
  return [l1, l2, l3];
}
const ORDER = { skin: 0, core: 0, lip: 0, block: 0, stile: 1, rail: 1, muntin: 1, panel: 2, deco: 2, mould: 3, glass: 4, bead: 4, bar: 4, lining: 4, slat: 4, hinge: 6, handle: 6, cylinder: 6, grille: 5, bolt: 6, closer: 6, hanger: 6 };
const useSize = () => {
  const ref = useRef(null); const [s, setS] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const read = () => setS((o) => (o.w === el.clientWidth && o.h === el.clientHeight ? o : { w: Math.max(200, el.clientWidth), h: Math.max(200, el.clientHeight) }));
    read(); if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, s];
};

/** `handleList` / `onHandle` (optional): the shared SMART HANDLES (neoHandles/doorHandles.js) drawn by <HandleLayer>; `ui.handles === false` hides them */
export default function DoorDrawing({ W, d, view = 'elev', ui, selected, onSelect, lang, zoom = 1, testid, handleList = null, onHandle = null }) {
  useOutput(); // re-draw the labels when the Output unit changes
  const [ref, size] = useSize();
  const ar = lang === 'ar';
  return (
    <div className="nkd-draw" ref={ref} data-testid={testid || 'door-drawing'} data-view={view}>
      {view === 'plan' ? <Plan W={W} d={d} ui={ui} size={size} ar={ar} zoom={zoom} selected={selected} onSelect={onSelect} handleList={handleList} onHandle={onHandle} /> : <Elevation W={W} d={d} ui={ui} size={size} ar={ar} zoom={zoom} selected={selected} onSelect={onSelect} handleList={handleList} onHandle={onHandle} />}
    </div>
  );
}

/* ----------------------------- elevation ----------------------------- */
function Elevation({ W, d, ui, size, ar, zoom, selected, onSelect, handleList, onHandle }) {
  const S = W.S; const parts = W.scene.parts;
  const svgRef = useRef(null); const frozenE = useRef(null); const liveE = useRef(null); const [hdlDrag, setHdlDrag] = useState(false); // [NEO-HANDLES-UX36] the frame is FROZEN while a handle is dragged
  const arch = d.frame.arch.on ? d.frame.arch.w + d.frame.arch.reveal : 0;
  const ext = W.scene.wall.ext;
  const barn = d.type === 'barn';
  const left = 330; const right = 330; const bottom = 330; const top = 250;
  const x0 = -(S.OW / 2 + ext * 0.45 + (barn ? 0 : 0)) - left * 0.2; const wTot = S.OW + 2 * ext * 0.45 + left * 0.2 + right * 0.2;
  const vw = wTot + left + right - 0.4 * (left + right) + 0; // wall clipped near the opening, margins for dims
  let vx0 = x0 - left * 0.8; let vwid = wTot + left * 0.8 + right * 0.8;
  const yTop0 = Math.max(S.OH + arch + 70 + 130, S.y0 + S.leafH + 330 + (barn ? 130 : 0)); void top;
  /* a band above the drawing for the three-line title block, sized from the zoom of the first pass so it is always about 4 lines of text tall */
  const band = (4.9 * 13) / (Math.min(size.w / vwid, size.h / (yTop0 + bottom)) * zoom);
  let yTop = yTop0 + band;
  let vh = yTop + bottom;
  const k = Math.min(size.w / vwid, size.h / vh) * zoom; let px = 1 / k;
  let fs = Math.max(11.5, 12) * px;
  liveE.current = { vx0, vwid, yTop, vh, px, fs };
  if (hdlDrag && frozenE.current) ({ vx0, vwid, yTop, vh, px, fs } = frozenE.current);
  const sw = (n) => n * px;
  const Y = (y) => yTop - y;
  const onHdlActive = useCallback((on) => { frozenE.current = on ? liveE.current : null; setHdlDrag(!!on); }, []);
  void vw;
  const dimOn = ui.dims; const faded = (pt) => (ui.isolate && ui.isolate !== pt ? 0.16 : 1);
  const showL = (g) => ui.layers[g] !== false;
  const selId = selected && selected.partId; const selUnit = selected && !selected.partId ? selected.unitId : null;

  const drawPart = (p, lf) => {
    const lay = p.leaf == null ? (p.group === 'Architrave' ? 'arch' : 'frame') : p.hardware ? 'hardware' : 'leaf';
    if (!showL(lay)) return null;
    const vis = p.view === 'front' || p.view === undefined || (p.view === 'internal' && ui.internal) || (p.view === 'back' && ui.internal);
    if (!vis) return null;
    const ox = lf ? lf.x0 : 0; const oy = lf ? lf.y0 : 0;
    const sel = selId === p.id || (selUnit && p.unitId === selUnit);
    const dash = p.view === 'internal' || p.view === 'back' || p.hid;
    const cls = `nkd-p nkd-t-${p.ptype}${p.glassKind ? ` nkd-gk-${p.glassKind}` : ''}${dash ? ' nkd-int' : ''}${sel ? ' nkd-sel' : ''}`;
    const o = faded(p.ptype === 'core' ? 'leaf' : p.ptype);
    return (
      <g key={p.id} className={cls} data-part={p.id} style={{ opacity: o }} onClick={(e) => { e.stopPropagation(); onSelect({ unitId: p.unitId, partId: p.id }); }}>
        {p.boxes.map((b, i) => {
          const x = ox + b.x0; const w = b.x1 - b.x0; const y = Y(oy + b.y1); const h = b.y1 - b.y0;
          if (p.round || b.round) return <ellipse key={i} cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} vectorEffect="non-scaling-stroke" />;
          if (p.kind === 'slat') return <g key={i}><rect x={x} y={y} width={w} height={h} vectorEffect="non-scaling-stroke" /><line x1={x} x2={x + w} y1={y + h / 2} y2={y + h / 2} className="nkd-ln" vectorEffect="non-scaling-stroke" /></g>;
          return <rect key={i} x={x} y={y} width={w} height={h} vectorEffect="non-scaling-stroke" className={p.kind === 'skin' ? 'nkd-skin' : undefined} />;
        })}
        {p.kind === 'panel' && (p.profile === 'raised' || p.profile === 'shaker' || p.profile === 'bolection') && p.boxes.map((b, i) => { const m = p.profile === 'shaker' ? 14 : 24; return <rect key={`in${i}`} className="nkd-in" x={ox + b.x0 + m} y={Y(oy + b.y1) + m} width={Math.max(1, b.x1 - b.x0 - 2 * m)} height={Math.max(1, b.y1 - b.y0 - 2 * m)} vectorEffect="non-scaling-stroke" />; })}
        {p.kind === 'glass' && p.boxes.map((b, i) => <line key={`g${i}`} className="nkd-gl" x1={ox + b.x0} y1={Y(oy + b.y0)} x2={ox + b.x0 + Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.5} y2={Y(oy + b.y0) - Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.5} vectorEffect="non-scaling-stroke" />)}
      </g>
    );
  };
  const sorted = [...parts].sort((a, b) => (ORDER[a.kind] ?? 3) - (ORDER[b.kind] ?? 3));
  const wallPath = `M ${-(S.OW / 2 + ext)} ${Y(S.OH + 300)} H ${S.OW / 2 + ext} V ${Y(0)} H ${-(S.OW / 2 + ext)} Z M ${-S.OW / 2} ${Y(S.OH)} V ${Y(0)} H ${S.OW / 2} V ${Y(S.OH)} Z`;

  /* badges: one per cut-list row (the first part of the row) */
  const badges = useMemo(() => {
    if (!ui.map) return [];
    const seen = new Set(); const out = [];
    sorted.forEach((p) => {
      if (!p.bom || !p.no || seen.has(p.no) || p.hardware) return;
      const vis = p.view === 'front' || p.view === undefined || p.view === 'mid';
      if (!vis && !ui.internal) return; seen.add(p.no);
      const lf = p.leaf == null ? null : W.leaves[p.leaf]; const b = p.boxes[0];
      const tall = (b.y1 - b.y0) > 4 * (b.x1 - b.x0); const frac = p.kind === 'jamb' ? 0.56 : p.kind === 'architrave' ? 0.9 : 0.74;
      out.push({ no: p.no, x: (lf ? lf.x0 : 0) + (b.x0 + b.x1) / 2, y: (lf ? lf.y0 : 0) + (tall ? b.y0 + frac * (b.y1 - b.y0) : (b.y0 + b.y1) / 2), id: p.id, unitId: p.unitId });
    });
    return out;
  }, [ui.map, ui.internal, W]); // eslint-disable-line react-hooks/exhaustive-deps

  /* dimensions */
  const dimH = (xa, xb, y, label, cls, above = false) => (
    <g className={`nkd-dim ${cls}`} key={`dh-${label}-${xa}-${y}`}>
      <line x1={xa} x2={xb} y1={Y(y)} y2={Y(y)} vectorEffect="non-scaling-stroke" /><line x1={xa} x2={xa} y1={Y(y) - sw(6)} y2={Y(y) + sw(6)} vectorEffect="non-scaling-stroke" /><line x1={xb} x2={xb} y1={Y(y) - sw(6)} y2={Y(y) + sw(6)} vectorEffect="non-scaling-stroke" />
      <text x={(xa + xb) / 2} y={Y(y) + (above ? -fs * 0.4 : fs * 1.15)} textAnchor="middle" style={{ fontSize: fs }}>{label}</text>
    </g>
  );
  const dimV = (x, ya, yb, label, cls, side = -1) => (
    <g className={`nkd-dim ${cls}`} key={`dv-${label}-${x}-${ya}`}>
      <line x1={x} x2={x} y1={Y(ya)} y2={Y(yb)} vectorEffect="non-scaling-stroke" /><line x1={x - sw(6)} x2={x + sw(6)} y1={Y(ya)} y2={Y(ya)} vectorEffect="non-scaling-stroke" /><line x1={x - sw(6)} x2={x + sw(6)} y1={Y(yb)} y2={Y(yb)} vectorEffect="non-scaling-stroke" />
      <text transform={`rotate(-90 ${x + (side < 0 ? -fs * 0.3 : fs * 1.1)} ${Y((ya + yb) / 2)})`} x={x + (side < 0 ? -fs * 0.3 : fs * 1.1)} y={Y((ya + yb) / 2)} textAnchor="middle" style={{ fontSize: fs }}>{label}</text>
    </g>
  );
  const lfs = W.leaves;
  const swingSym = lfs.map((lf) => {
    if (d.type === 'barn' || d.type === 'pocket') {
      const dir = (W.track ? W.track.slide : 1); const y = lf.y0 + lf.h / 2; const xa = lf.x0 + lf.w / 2 - dir * lf.w * 0.25; const xb = xa + dir * lf.w * 0.5;
      return <g key={`sw${lf.index}`} className="nkd-swing"><line x1={xa} x2={xb} y1={Y(y)} y2={Y(y)} vectorEffect="non-scaling-stroke" /><polyline points={`${xb - dir * sw(12)},${Y(y) - sw(7)} ${xb},${Y(y)} ${xb - dir * sw(12)},${Y(y) + sw(7)}`} fill="none" vectorEffect="non-scaling-stroke" /></g>;
    }
    const hx = lf.hingeSide === 'left' ? lf.x0 : lf.x0 + lf.w; const fx = lf.hingeSide === 'left' ? lf.x0 + lf.w : lf.x0;
    return <g key={`sw${lf.index}`} className={`nkd-swing${d.swing.dir === 'in' ? ' nkd-away' : ''}`}><polyline points={`${fx},${Y(lf.y0 + lf.h)} ${hx},${Y(lf.y0 + lf.h / 2)} ${fx},${Y(lf.y0)}`} fill="none" vectorEffect="non-scaling-stroke" /></g>;
  });
  const first = lfs[0]; const lastX = lfs[lfs.length - 1];
  /* the height lanes sit on the side that has no hinge labels: opposite the hinges (a double door labels the left leaf's hinges and puts the lanes on the right) */
  const hingeLeaves = S.double ? [lfs[0]] : lfs;
  const lanesRight = !S.slides && hingeLeaves[0].hingeSide === 'left';
  const laneSide = lanesRight ? 1 : -1;
  const laneX = (o) => (lanesRight ? S.OW / 2 + arch + o : -(S.OW / 2 + arch + o));
  const frameInnerL = -S.clearW / 2; const frameInnerR = S.clearW / 2;
  return (
    <svg ref={svgRef} className="nkd-svg" style={{ direction: 'ltr' }} viewBox={`${vx0} 0 ${vwid} ${vh}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="group" aria-label={ar ? 'واجهة الباب من الخارج' : 'Door elevation seen from outside'} onClick={() => onSelect(null)}>
      <path className="nkd-wall" d={wallPath} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
      <line className="nkd-floor" x1={-(S.OW / 2 + ext)} x2={S.OW / 2 + ext} y1={Y(0)} y2={Y(0)} vectorEffect="non-scaling-stroke" />
      <g className="nkd-spec" data-testid="drawing-spec">{specLines(d, S, ar).map((t, i) => <text key={i} x={ar ? vx0 + vwid - fs * 0.8 : vx0 + fs * 0.8} y={fs * (1.6 + i * 1.35)} textAnchor={ar ? 'end' : 'start'} style={{ fontSize: fs * (i ? 0.95 : 1.05) }} fontWeight={i ? 500 : 800}>{t}</text>)}</g>
      {sorted.filter((p) => p.leaf == null).map((p) => drawPart(p, null))}
      {d.type === 'barn' && W.track && showL('hardware') && <g className="nkd-p nkd-t-hardware"><rect x={W.track.x0} y={Y(W.track.y + 14)} width={W.track.len} height={28} vectorEffect="non-scaling-stroke" /></g>}
      {sorted.filter((p) => p.leaf != null).map((p) => drawPart(p, W.leaves[p.leaf]))}
      {swingSym}
      {ui.center && <g className="nkd-cl"><line x1={0} x2={0} y1={Y(-60)} y2={Y(S.OH + 100)} vectorEffect="non-scaling-stroke" /><line x1={-(S.OW / 2 + 120)} x2={S.OW / 2 + 120} y1={Y(S.y0 + S.leafH / 2)} y2={Y(S.y0 + S.leafH / 2)} vectorEffect="non-scaling-stroke" /></g>}
      {dimOn && (
        <g className="nkd-dims">
          {dimH(-S.OW / 2, S.OW / 2, -150, `${fu(S.OW)} ${ar ? 'فتحة' : 'opening'}`, 'nkd-d-info')}
          {S.frameOn && dimH(frameInnerL, frameInnerR, -62, `${f1(S.clearW)} ${ar ? 'صافي' : 'clear'}`, 'nkd-d-danger')}
          {dimH(first.x0, lastX.x0 + lastX.w, S.OH + arch + 70, `${S.double ? '2 × ' : ''}${f1(S.leafW)} ${ar ? 'ضلفة' : 'leaf'}`, 'nkd-d-danger', true)}
          {dimV(laneX(40), S.y0, S.y0 + S.leafH, `${f1(S.leafH)}`, 'nkd-d-danger', laneSide)}
          {dimV(laneX(120), 0, S.OH, `${fu(S.OH)}`, 'nkd-d-info', laneSide)}
          {d.lock.on && dimV(laneX(200), 0, d.lock.handleH, `${ar ? 'مقبض' : 'handle'} ${fu(d.lock.handleH)}`, 'nkd-d-grey', laneSide)}
          {!S.slides && (
            <g className="nkd-dim nkd-d-grey"><text x={0} y={Y(-290)} textAnchor="middle" style={{ fontSize: fs * 0.95 }}>{ar ? 'الفجوات' : 'gaps'}: {ar ? 'رأس' : 'head'} {d.clear.head} · {S.double ? (ar ? 'التقاء' : 'meeting') : (ar ? 'جانب' : 'side')} {S.double ? d.clear.meet : d.clear.side} · {ar ? 'تحت الباب' : 'under-cut'} {S.floorGap}</text></g>
          )}
          {!S.slides && hingeLeaves.map((lf) => W.scene.hingeYs.map((y, i) => {
            const left = lf.hingeSide === 'left'; const xo = left ? -(S.OW / 2 + arch + sw(30)) : S.OW / 2 + arch + sw(30);
            return (
              <g className="nkd-dim nkd-d-grey" key={`hd${lf.index}-${i}`}>
                <line x1={left ? lf.x0 : lf.x0 + lf.w} x2={xo} y1={Y(lf.y0 + y)} y2={Y(lf.y0 + y)} vectorEffect="non-scaling-stroke" />
                <text x={xo + (left ? -1 : 1) * sw(4)} y={Y(lf.y0 + y)} textAnchor={left ? 'end' : 'start'} dominantBaseline="middle" style={{ fontSize: fs * 0.9 }}>H{i + 1} {f1(lf.y0 + y)}</text>
              </g>
            );
          }))}
          {W.grid && (() => {
            const g = W.grid; const p0 = parts.find((p) => p.kind === 'panel' && p.leaf === 0); if (!p0) return null; const lf = lfs[0]; const b = p0.boxes[0];
            return <g className="nkd-dim nkd-d-danger"><text x={lf.x0 + (b.x0 + b.x1) / 2} y={Y(lf.y0 + b.y0) - fs * 1.4} textAnchor="middle" style={{ fontSize: fs * 0.85 }}>{f1(g.colW)} × {f1(g.rowH)}</text></g>;
          })()}
        </g>
      )}
      {ui.map && badges.map((b) => (
        <g key={`bd${b.no}`} className="nkd-badge" onClick={(e) => { e.stopPropagation(); onSelect({ unitId: b.unitId, partId: b.id }); }} data-no={b.no}>
          <circle cx={b.x} cy={Y(b.y)} r={fs * 0.95} vectorEffect="non-scaling-stroke" /><text x={b.x} y={Y(b.y)} textAnchor="middle" dominantBaseline="central" style={{ fontSize: fs * 0.95 }}>{b.no}</text>
        </g>
      ))}
      {handleList && onHandle ? <HandleLayer handles={handleList} onChange={onHandle} onActive={onHdlActive} svgRef={svgRef} enabled={ui.handles !== false} lang={ar ? 'ar' : 'en'} place={(h) => ({ x: h.at.u, y: Y(h.at.y) })} /> : null}
    </svg>
  );
}

/* ----------------------------- plan ----------------------------- */
function Plan({ W, d, ui, size, ar, zoom, selected, onSelect, handleList, onHandle }) {
  const S = W.S; const parts = W.scene.parts; const ext = W.scene.wall.ext;
  const svgRef = useRef(null); const frozenP = useRef(null); const liveP = useRef(null); const [hdlDrag, setHdlDrag] = useState(false); // [NEO-HANDLES-UX36] frozen while a handle is dragged
  const extra = d.type === 'barn' ? S.leafW : 0;
  const archT = d.frame.arch.on ? d.frame.arch.t : 0;
  const inside = d.swing.dir === 'in';
  /* the vertical range: the swing arc goes to the inside (up) or the outside (down); the other side only needs room for the dimensions */
  const swingR = S.slides ? (d.type === 'barn' ? S.T + 120 : 0) : S.leafW + 60;
  const zLo = inside ? -S.wall / 2 - swingR - 40 : -S.wall / 2 - 220;
  const zHi = inside ? S.wall / 2 + archT + 330 : S.wall / 2 + archT + swingR + 60 + 220;
  let xMin = -(S.OW / 2 + ext) - 200; let xMax = S.OW / 2 + ext + 140 + extra;
  let vwid = xMax - xMin; let vh = zHi - zLo; let zLo2 = zLo;
  const k = Math.min(size.w / vwid, size.h / vh) * zoom; let px = 1 / k; let fs = 12 * px;
  liveP.current = { xMin, xMax, vwid, vh, zLo2, px, fs };
  if (hdlDrag && frozenP.current) ({ xMin, xMax, vwid, vh, zLo2, px, fs } = frozenP.current);
  const onHdlActive = useCallback((on) => { frozenP.current = on ? liveP.current : null; setHdlDrag(!!on); }, []);
  const Z = (z) => z - zLo2; // outside (+z) is at the bottom
  const lay = (g) => ui.layers[g] !== false;
  const dimH = (xa, xb, z, label, cls, above = false) => (<g className={`nkd-dim ${cls}`} key={`ph-${label}-${z}`}><line x1={xa} x2={xb} y1={Z(z)} y2={Z(z)} vectorEffect="non-scaling-stroke" /><line x1={xa} x2={xa} y1={Z(z) - 6 * px} y2={Z(z) + 6 * px} vectorEffect="non-scaling-stroke" /><line x1={xb} x2={xb} y1={Z(z) - 6 * px} y2={Z(z) + 6 * px} vectorEffect="non-scaling-stroke" /><text x={(xa + xb) / 2} y={Z(z) + (above ? -fs * 0.4 : fs * 1.2)} textAnchor="middle" style={{ fontSize: fs }}>{label}</text></g>);
  const dimZ = (x, za, zb, label, cls) => (<g className={`nkd-dim ${cls}`} key={`pz-${label}-${x}`}><line x1={x} x2={x} y1={Z(za)} y2={Z(zb)} vectorEffect="non-scaling-stroke" /><line x1={x - 6 * px} x2={x + 6 * px} y1={Z(za)} y2={Z(za)} vectorEffect="non-scaling-stroke" /><line x1={x - 6 * px} x2={x + 6 * px} y1={Z(zb)} y2={Z(zb)} vectorEffect="non-scaling-stroke" /><text transform={`rotate(-90 ${x - fs * 0.35} ${Z((za + zb) / 2)})`} x={x - fs * 0.35} y={Z((za + zb) / 2)} textAnchor="middle" style={{ fontSize: fs }}>{label}</text></g>);
  const selId = selected && selected.partId;
  const box = (b, cls, key) => <rect key={key} className={cls} x={b.x0} y={Z(b.z0)} width={b.x1 - b.x0} height={b.z1 - b.z0} vectorEffect="non-scaling-stroke" />;
  const arcPts = (px0, pz0, r, a0, a1) => { const pts = []; for (let i = 0; i <= 28; i++) { const a = a0 + ((a1 - a0) * i) / 28; pts.push(`${px0 + r * Math.cos(a)},${Z(pz0 + r * Math.sin(a))}`); } return pts.join(' '); };
  const out = d.swing.dir === 'out' ? 1 : -1;
  return (
    <svg ref={svgRef} className="nkd-svg" style={{ direction: 'ltr' }} viewBox={`${xMin} 0 ${vwid} ${vh}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="group" aria-label={ar ? 'مسقط الباب مع اتجاه الفتح' : 'Door plan with the swing'} onClick={() => onSelect(null)}>
      {lay('wall') && <>
        <rect className="nkd-wall" x={-(S.OW / 2 + ext)} y={Z(-S.wall / 2)} width={ext} height={S.wall} vectorEffect="non-scaling-stroke" />
        <rect className="nkd-wall" x={S.OW / 2} y={Z(-S.wall / 2)} width={ext} height={S.wall} vectorEffect="non-scaling-stroke" />
      </>}
      {parts.filter((p) => p.leaf == null && p.kind !== 'threshold' && p.kind !== 'head').map((p) => {
        const l2 = p.group === 'Architrave' ? 'arch' : 'frame'; if (!lay(l2)) return null;
        return <g key={p.id} className={selId === p.id ? 'nkd-sel' : undefined} onClick={(e) => { e.stopPropagation(); onSelect({ unitId: p.unitId, partId: p.id }); }}>{p.boxes.map((b, i) => box(b, `nkd-p nkd-t-${p.ptype}`, `${p.id}-${i}`))}</g>;
      })}
      {lay('leaf') && W.leaves.map((lf) => {
        const sel = selected && selected.unitId === lf.id;
        const hx = lf.x0 + lf.pivot.x; const hz = lf.z0 + lf.pivot.z; const s = lf.hingeSide === 'left' ? 1 : -1;
        const closed = { x0: lf.x0, x1: lf.x0 + lf.w, z0: lf.z0, z1: lf.z0 + lf.t };
        const tz = lf.pivot.z === 0 ? 1 : -1; const txd = -tz * s * out; // the thickness of the opened leaf runs along x in this direction
        const ox0 = Math.min(hx, hx + txd * lf.t); const oz0 = Math.min(hz, hz + out * lf.w);
        const a1 = s > 0 ? (out * Math.PI) / 2 : Math.PI - (out * Math.PI) / 2;
        return (
          <g key={lf.id} className={sel ? 'nkd-sel' : undefined} onClick={(e) => { e.stopPropagation(); onSelect({ unitId: lf.id, partId: null }); }}>
            {box(closed, 'nkd-p nkd-t-leaf', `c${lf.id}`)}
            {!S.slides && (
              <>
                <rect className="nkd-ghost" x={ox0} y={Z(oz0)} width={lf.t} height={lf.w} vectorEffect="non-scaling-stroke" />
                <polyline className="nkd-arc" fill="none" vectorEffect="non-scaling-stroke" points={arcPts(hx, hz, lf.w, s > 0 ? 0 : Math.PI, a1)} />
              </>
            )}
            {S.slides && <line className="nkd-arc" x1={lf.x0 + lf.w / 2} x2={lf.x0 + lf.w / 2 + (W.track ? W.track.slide : 1) * lf.w * 0.8} y1={Z(lf.z0 + lf.t / 2)} y2={Z(lf.z0 + lf.t / 2)} vectorEffect="non-scaling-stroke" />}
          </g>
        );
      })}
      {d.type === 'barn' && W.track && lay('hardware') && <rect className="nkd-p nkd-t-hardware" x={W.track.x0} y={Z(W.track.z0)} width={W.track.len} height={W.track.z1 - W.track.z0} vectorEffect="non-scaling-stroke" />}
      <text className="nkd-lbl" x={xMax - 20} y={Z(-S.wall / 2) - fs * 0.7} textAnchor="end" style={{ fontSize: fs }}>{ar ? 'داخل' : 'INSIDE'}</text>
      <text className="nkd-lbl" x={xMax - 20} y={Z(S.wall / 2) + fs * 1.7} textAnchor="end" style={{ fontSize: fs }}>{ar ? 'خارج' : 'OUTSIDE'}</text>
      {ui.dims && (
        <g className="nkd-dims">
          {dimZ(-(S.OW / 2 + ext * 0.55), -S.wall / 2, S.wall / 2, `${S.wall} ${ar ? 'جدار' : 'wall'}`, 'nkd-d-info')}
          {dimH(-S.OW / 2, S.OW / 2, S.wall / 2 + archT + 110, `${fu(S.OW)} ${ar ? 'فتحة' : 'opening'}`, 'nkd-d-info')}
          {S.frameOn && dimH(-S.clearW / 2, S.clearW / 2, S.wall / 2 + archT + 230, `${f1(S.clearW)} ${ar ? 'صافي' : 'clear'}`, 'nkd-d-danger')}
          <g className="nkd-dim nkd-d-grey"><text x={(xMin + xMax) / 2} y={Z(S.wall / 2 + archT + 330)} textAnchor="middle" style={{ fontSize: fs * 0.95 }}>{ar ? 'الضلفة' : 'leaf'} {S.T} · {S.frameOn ? `${ar ? 'الحلق' : 'jamb'} ${S.jd} · ` : ''}{ar ? 'الجدار' : 'wall'} {S.wall}{d.frame.arch.on ? ` · ${ar ? 'كورنيش' : 'architrave'} ${d.frame.arch.t}` : ''} · {d.swing.dir === 'in' ? (ar ? 'يفتح للداخل' : 'opens in') : (ar ? 'يفتح للخارج' : 'opens out')}</text></g>
        </g>
      )}
      {handleList && onHandle ? <HandleLayer handles={handleList} onChange={onHandle} onActive={onHdlActive} svgRef={svgRef} enabled={ui.handles !== false} lang={ar ? 'ar' : 'en'} place={(h) => ({ x: h.at.u, y: Z(h.at.y) })} testid="handle-layer-plan" /> : null}
    </svg>
  );
}

export { cellKind };
