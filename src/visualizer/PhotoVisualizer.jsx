/* =============================================================================
 * Room Visualizer — "Room photo to visualizer" [ROOM-VIZ 2026-11-07]
 * 1 upload / take a photo   2 add a floor, wall, worktop or splashback   3 drag its 4 corners onto the real corners
 * (perspective)   4 brush over furniture to keep it in front   5 pick products; layouts, grout, rotation as in the rooms.
 * The photo never leaves the device (only a small preview goes with a quote request).
 * ===========================================================================*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCompositor, homography, inv3 } from './photoGl';
import { drawLayout } from './layout';
import { defaultGrout, hexRgb, roughnessOf, displayName } from './materials';
import { SURFACES } from './rooms';
import { T } from './strings';
import { ProductPanel, download, brandedImage, shrinkImage, quantity, groutFor } from './ui';
import { QuoteModal } from './Designer';
import { track, noteApplied } from './api';

const TYPES = {
  floor: { key: 'floor', size: [4, 4], corners: [[0.22, 0.6], [0.78, 0.6], [1.05, 1.02], [-0.05, 1.02]] },
  wall: { key: 'feature', size: [3.6, 2.6], corners: [[0.15, 0.08], [0.85, 0.08], [0.85, 0.6], [0.15, 0.6]] },
  backsplash: { key: 'backsplash', size: [2.4, 0.6], corners: [[0.25, 0.42], [0.75, 0.42], [0.75, 0.56], [0.25, 0.56]] },
  countertop: { key: 'countertop', size: [2.4, 0.62], corners: [[0.24, 0.55], [0.76, 0.55], [0.8, 0.64], [0.2, 0.64]] },
};
let nextId = 1;

export default function PhotoVisualizer({ products, settings, lang, channel = 'web', onBack }) {
  const ar = lang === 'ar';
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const [img, setImg] = useState(null);           // HTMLCanvasElement (scaled photo)
  const [regions, setRegions] = useState([]);     // { id, type, corners, size, sel, mask }
  const [activeId, setActiveId] = useState(null);
  const [tool, setTool] = useState('corners');
  const [brush, setBrush] = useState(40);
  const [shadeK, setShadeK] = useState(0.75);
  const [modal, setModal] = useState(null);
  const [cursor, setCursor] = useState(null);
  const glCanvas = useRef(null); const comp = useRef(null); const wrap = useRef(null);
  const blur = useRef(null); const lumSmall = useRef(null);
  const drag = useRef(null); const raf = useRef(0);
  const active = regions.find((r) => r.id === activeId) || null;

  /* photo → scaled canvas + blurred light map */
  const loadFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1600 / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      const b = document.createElement('canvas'); b.width = c.width; b.height = c.height; const bg = b.getContext('2d');
      bg.filter = `blur(${Math.round(Math.max(c.width, c.height) / 140)}px)`; bg.drawImage(c, 0, 0);
      const s = document.createElement('canvas'); s.width = 96; s.height = Math.round(96 * c.height / c.width); s.getContext('2d').drawImage(b, 0, 0, s.width, s.height);
      blur.current = b; lumSmall.current = s;
      setRegions([]); setActiveId(null); setImg(c); track('photo', { meta: { w: c.width, h: c.height } });
    };
    im.onerror = () => { URL.revokeObjectURL(url); track('photo_fail', { meta: { type: file.type || 'unknown', kb: Math.round((file.size || 0) / 1024) } }); };
    im.src = url;
  };

  useEffect(() => {
    if (!img || !glCanvas.current) return undefined;
    try { comp.current = createCompositor(glCanvas.current); comp.current.setPhoto(img, blur.current); comp.current.draw(); } catch (e) { comp.current = null; }
    return () => { if (comp.current) comp.current.dispose(); comp.current = null; };
  }, [img]);

  const requestDraw = () => { if (raf.current) return; raf.current = requestAnimationFrame(() => { raf.current = 0; if (comp.current) comp.current.draw(); }); };

  /* mask helpers */
  const meanLum = (mask) => {
    const s = lumSmall.current; if (!s) return 0.5;
    const sd = s.getContext('2d').getImageData(0, 0, s.width, s.height).data;
    const m = document.createElement('canvas'); m.width = s.width; m.height = s.height; m.getContext('2d').drawImage(mask, 0, 0, m.width, m.height);
    const md = m.getContext('2d').getImageData(0, 0, m.width, m.height).data;
    let t = 0, n = 0; for (let i = 0; i < sd.length; i += 4) { const a = md[i] / 255; if (a > 0.5) { t += (0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2]) / 255; n++; } }
    return n ? t / n : 0.5;
  };
  const freshMask = (corners) => {
    const m = document.createElement('canvas'); m.width = img.width; m.height = img.height; const g = m.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, m.width, m.height); g.fillStyle = '#fff';
    g.beginPath(); corners.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.closePath(); g.fill();
    return m;
  };

  /* push a region to the GPU */
  const sync = useCallback(async (r, { pattern = true, mask = true } = {}) => {
    const c = comp.current; if (!c || !r) return;
    const p = byId[r.sel.pid]; if (!p) return;
    const [w, h] = r.size;
    const Hm = homography([[0, 0], [w, 0], [w, h], [0, h]], r.corners);   // plane metres -> image px
    const Hi = Hm && inv3(Hm); if (!Hi) return;
    const origin = [-w * 0.5, -h * 0.5], span = [w * 2, h * 2];
    const flat = p.procedural && p.procedural.type === 'paint' && !p.texture_url;
    const o = { H: Hi, origin, span, shade: shadeK, flat, color: hexRgb((p.procedural && p.procedural.base) || p.hex).map((v) => v / 255), gloss: roughnessOf(p) < 0.2 ? 0.35 : 0, order: r.type === 'floor' ? 0 : r.type === 'wall' ? 1 : 2 };
    if (mask) { o.mask = r.mask; o.mean = meanLum(r.mask); }
    if (pattern && !flat) {
      const lay = await drawLayout(p, { w: span[0], h: span[1], maxPx: 2048, layout: r.sel.layout, grout: { mm: r.sel.groutMm, color: r.sel.groutColor }, rotation: r.sel.rotation || 0, product2: r.sel.pid2 ? byId[r.sel.pid2] : null });
      o.pattern = lay.canvas;
    }
    c.setSurface(r.id, o); requestDraw();
  }, [byId, shadeK]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { regions.forEach((r) => { if (comp.current) comp.current.setSurface(r.id, { shade: shadeK }); }); requestDraw(); }, [shadeK]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRegion = (type) => {
    if (!img) return;
    const def = TYPES[type]; const W = img.width, H = img.height;
    const corners = def.corners.map(([x, y]) => [x * W, y * H]);
    const apps = SURFACES[def.key].apps;
    const p = products.find((x) => x.featured && (x.applications || []).some((a) => apps.includes(a))) || products.find((x) => (x.applications || []).some((a) => apps.includes(a)));
    if (!p) return;
    const g = defaultGrout(p);
    const r = { id: 'r' + nextId++, type, corners, size: [...def.size], mask: freshMask(corners), sel: { pid: p.id, layout: p.default_layout || 'straight', groutMm: g.mm, groutColor: g.color, rotation: 0, pid2: null } };
    setRegions((rs) => [...rs, r]); setActiveId(r.id); setTool('corners');
    setTimeout(() => sync(r), 0);
  };
  const updateRegion = (id, patch, how) => {
    setRegions((rs) => rs.map((r) => { if (r.id !== id) return r; const n = { ...r, ...patch }; setTimeout(() => sync(n, how), 0); return n; }));
  };
  const removeRegion = (id) => { if (comp.current) comp.current.removeSurface(id); setRegions((rs) => rs.filter((r) => r.id !== id)); setActiveId(null); requestDraw(); };

  /* pointer: corners + brush, in image px */
  const toImg = (e) => { const r = glCanvas.current.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * img.width, ((e.clientY - r.top) / r.height) * img.height]; };
  const scale = () => { const r = glCanvas.current.getBoundingClientRect(); return r.width / img.width; };
  const paint = (pt) => {
    const r = active; if (!r) return; const g = r.mask.getContext('2d');
    g.fillStyle = tool === 'keep' ? '#000' : '#fff'; g.beginPath(); g.arc(pt[0], pt[1], brush / scale(), 0, Math.PI * 2); g.fill();
    if (comp.current) { comp.current.setSurface(r.id, { mask: r.mask }); requestDraw(); }
  };
  const onDown = (e) => {
    if (!img || !active) return; const pt = toImg(e);
    if (tool === 'corners') {
      const s = scale(); let best = -1, bd = 1e9; active.corners.forEach(([x, y], i) => { const d = Math.hypot((x - pt[0]) * s, (y - pt[1]) * s); if (d < bd) { bd = d; best = i; } });
      if (bd < 44) { drag.current = { kind: 'corner', i: best }; e.currentTarget.setPointerCapture(e.pointerId); }
    } else { drag.current = { kind: 'brush' }; e.currentTarget.setPointerCapture(e.pointerId); paint(pt); }
  };
  const onMove = (e) => {
    if (!img) return; const pt = toImg(e);
    if (tool !== 'corners') setCursor({ x: e.clientX, y: e.clientY });
    const d = drag.current; if (!d || !active) return;
    if (d.kind === 'corner') {
      const corners = active.corners.map((c, i) => (i === d.i ? pt : c));
      setRegions((rs) => rs.map((r) => (r.id === active.id ? { ...r, corners } : r)));
      const Hm = homography([[0, 0], [active.size[0], 0], [active.size[0], active.size[1]], [0, active.size[1]]], corners); const Hi = Hm && inv3(Hm);
      if (Hi && comp.current) { comp.current.setSurface(active.id, { H: Hi }); requestDraw(); }
    } else paint(pt);
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (d && d.kind === 'corner' && active) { const mask = freshMask(active.corners); updateRegion(active.id, { mask }, { pattern: false, mask: true }); }
    if (d && d.kind === 'brush' && active && comp.current) comp.current.setSurface(active.id, { mean: meanLum(active.mask) });
  };

  const save = async () => {
    const src = comp.current.snapshot();
    const lines = regions.map((r) => `${SURFACES[TYPES[r.type].key][ar ? 'ar' : 'en']}: ${displayName(byId[r.sel.pid], ar)}`);
    download(await brandedImage(src, { title: T('photoTitle', ar), lines, ar, wm: settings.watermark }), 'the-closets-my-room.jpg');
    track('download_jpg', { mode: 'photo' });
  };
  const items = () => regions.map((r) => { const p = byId[r.sel.pid]; const q = quantity(p, r.size[0] * r.size[1], settings); return { surface: SURFACES[TYPES[r.type].key][ar ? 'ar' : 'en'], id: p.id, product_id: p.id, name: displayName(p, ar), sku: p.sku || null, layout: r.sel.layout, m2: Math.round(r.size[0] * r.size[1] * 10) / 10, boxes: q && q.boxes ? q.boxes : null }; });

  if (!img) {
    return (
      <div className="vz-photo-start" dir={ar ? 'rtl' : 'ltr'}>
        {onBack && <button type="button" className="vz-pill" onClick={onBack}>{ar ? '→' : '←'} {T('back', ar)}</button>}
        <h1>{T('photoTitle', ar)}</h1>
        <p>{T('tryPhotoSub', ar)}</p>
        <div className="vz-actions">
          <label className="vz-btn vz-btn-dark">{T('upload', ar)}<input type="file" accept="image/*" hidden onChange={(e) => loadFile(e.target.files && e.target.files[0])} data-testid="vz-photo-input" /></label>
          <label className="vz-btn">{T('takePhoto', ar)}<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => loadFile(e.target.files && e.target.files[0])} /></label>
        </div>
        <p className="vz-muted">{T('photoHint', ar)}</p>
      </div>
    );
  }

  const disp = (pt) => { const s = glCanvas.current ? glCanvas.current.getBoundingClientRect().width / img.width : 1; return [pt[0] * s, pt[1] * s]; };
  return (
    <div className="vz-designer vz-photo" dir={ar ? 'rtl' : 'ltr'}>
      <div className="vz-stage vz-photo-stage">
        <div className="vz-photo-wrap" ref={wrap}>
          <canvas ref={glCanvas} className="vz-photo-canvas" style={{ aspectRatio: `${img.width} / ${img.height}` }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => setCursor(null)} />
          {active && tool === 'corners' && glCanvas.current && (
            <svg className="vz-photo-svg" aria-hidden="true">
              <polygon points={active.corners.map((c) => disp(c).join(',')).join(' ')} />
              {active.corners.map((c, i) => { const [x, y] = disp(c); return <circle key={i} cx={x} cy={y} r="11" />; })}
            </svg>
          )}
        </div>
        {cursor && tool !== 'corners' && <div className="vz-brush" style={{ left: cursor.x, top: cursor.y, width: brush * 2, height: brush * 2 }} />}
        <div className="vz-topbar">
          {onBack && <button type="button" className="vz-pill" onClick={onBack}>{ar ? '→' : '←'} {T('back', ar)}</button>}
          <label className="vz-pill">{T('newPhoto', ar)}<input type="file" accept="image/*" hidden onChange={(e) => loadFile(e.target.files && e.target.files[0])} /></label>
          <span className="vz-grow" />
          <button type="button" className="vz-pill" onClick={() => addRegion('floor')} data-testid="vz-add-floor">{T('addFloor', ar)}</button>
          <button type="button" className="vz-pill" onClick={() => addRegion('wall')}>{T('addWall', ar)}</button>
          <button type="button" className="vz-pill" onClick={() => addRegion('backsplash')}>{T('addCounter', ar)}</button>
        </div>
        <div className="vz-bottombar">
          {active && (
            <div className="vz-seg">
              <button type="button" className={tool === 'corners' ? 'on' : ''} onClick={() => setTool('corners')}>{T('edit', ar)}</button>
              <button type="button" className={tool === 'keep' ? 'on' : ''} onClick={() => setTool('keep')}>{T('keep', ar)}</button>
              <button type="button" className={tool === 'restore' ? 'on' : ''} onClick={() => setTool('restore')}>{T('restore', ar)}</button>
            </div>
          )}
          {active && tool !== 'corners' && <label className="vz-pill">{T('brush', ar)} <input type="range" min="8" max="120" value={brush} onChange={(e) => setBrush(Number(e.target.value))} /></label>}
          <span className="vz-hint">{!active ? T('photoEmpty', ar) : tool === 'corners' ? T('cornersHint', ar) : T('brushHint', ar)}</span>
          <span className="vz-grow" />
          <label className="vz-pill">{T('shadows', ar)} <input type="range" min="0" max="1" step="0.05" value={shadeK} onChange={(e) => setShadeK(Number(e.target.value))} /></label>
          <button type="button" className="vz-pill" onClick={save} disabled={!regions.length}>⤓ {T('save', ar)}</button>
          {settings.quote_cta !== false && <button type="button" className="vz-pill vz-pill-cta" onClick={() => setModal('quote')} disabled={!regions.length}>{T('quote', ar)}</button>}
        </div>
      </div>
      <aside className="vz-panel open">
        <div className="vz-surfs">
          {regions.map((r) => (
            <button key={r.id} type="button" className={'vz-surf' + (r.id === activeId ? ' on' : '')} onClick={() => { setActiveId(r.id); setTool('corners'); }}>
              <span className="vz-surf-sw" style={{ background: (byId[r.sel.pid] || {}).hex }} />
              <span>{SURFACES[TYPES[r.type].key][ar ? 'ar' : 'en']}</span>
            </button>
          ))}
        </div>
        {active ? (
          <>
            <div className="vz-opt vz-size">
              <label>{T('realSize', ar)}</label>
              <div className="vz-size-row">
                <label>{T('widthM', ar)}<input type="number" min="0.3" max="30" step="0.1" value={active.size[0]} onChange={(e) => updateRegion(active.id, { size: [Math.max(0.3, Number(e.target.value) || 1), active.size[1]] })} /></label>
                <label>{T('depthM', ar)}<input type="number" min="0.2" max="30" step="0.1" value={active.size[1]} onChange={(e) => updateRegion(active.id, { size: [active.size[0], Math.max(0.2, Number(e.target.value) || 1)] })} /></label>
                <button type="button" className="vz-btn" onClick={() => removeRegion(active.id)}>{T('remove', ar)}</button>
              </div>
            </div>
            <ProductPanel surfaceKey={TYPES[active.type].key} products={products} sel={active.sel} ar={ar} settings={settings} area={active.size[0] * active.size[1]}
              onPick={(p) => { const g = groutFor(p, settings); updateRegion(active.id, { sel: { pid: p.id, layout: p.default_layout || 'straight', groutMm: g.mm, groutColor: g.color, rotation: 0, pid2: null } }); track('apply', { mode: 'photo', surface: active.type, product_id: p.id }); noteApplied(p.id); }}
              onChange={(patch) => updateRegion(active.id, { sel: { ...active.sel, ...patch } })} />
          </>
        ) : <p className="vz-foot">{T('photoEmpty', ar)}</p>}
      </aside>
      {modal === 'quote' && <QuoteModal ar={ar} channel={channel} room="photo" items={items()} getThumb={() => shrinkImage(comp.current.snapshot(), 640)} onClose={() => setModal(null)} settings={settings} />}
    </div>
  );
}
