/* Room Visualizer — shared UI bits [ROOM-VIZ 2026-11-07] */
import React, { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { swatch, displayName, isContinuous, defaultGrout } from './materials';
import { layoutsFor, layoutName } from './layout';
import { T, KIND_LABEL, FINISH_LABEL, perUnit } from './strings';
import { SURFACES } from './rooms';
import { feature, favorites, toggleFavorite } from './api';

/** grout for a newly placed product: the admin default width (if set) + the product's own colour */
export function groutFor(p, settings) { const g = defaultGrout(p); const mm = settings && settings.grout && settings.grout.mm; return mm != null && mm !== '' && !isContinuous(p) ? { ...g, mm: Number(mm) } : g; }
/** quantity, boxes and price for one surface */
export function quantity(p, area, settings) {
  if (!p || !area) return null;
  const waste = Number(settings.wastage_pct ?? 10); const order = area * (1 + waste / 100);
  const boxes = p.sell_by_box && Number(p.m2_per_box) > 0 ? Math.ceil(order / Number(p.m2_per_box)) : null;
  const unit = p.price_unit || 'm2'; const price = settings.show_prices && p.price_per_m2 ? Number(p.price_per_m2) : null;
  const total = price == null ? null : unit === 'box' && boxes ? price * boxes : unit === 'm2' ? price * order : null;
  return { area, order, waste, boxes, price, unit, total };
}
const labelMeta = (settings, name) => ((settings && settings.tax && settings.tax.labels) || []).find((l) => l.name === name) || {};
export function Badges({ p, settings, ar, small }) {
  if (!p) return null;
  const st = feature(settings, 'stock_badge') ? p.stock : null;
  const lbs = (p.labels || []).slice(0, small ? 2 : 4);
  if (!lbs.length && st !== 'low' && st !== 'out') return null;
  return (
    <span className={'vz-badges' + (small ? ' vz-badges-sm' : '')}>
      {lbs.map((l) => { const m = labelMeta(settings, l); return <span key={l} className="vz-badge" style={{ background: m.color || undefined, color: m.text_color || undefined }}>{(ar && m.name_ar) || l}</span>; })}
      {st === 'low' && <span className="vz-badge vz-badge-warn">{T('lowStock', ar)}</span>}
      {st === 'out' && <span className="vz-badge vz-badge-out">{T('outStock', ar)}</span>}
    </span>
  );
}

export function Swatch({ product, size = 160, className = '', alt = '' }) {
  const [src, setSrc] = useState(null);
  useEffect(() => { let on = true; setSrc(null); swatch(product, size).then((s) => { if (on) setSrc(s); }).catch(() => {}); return () => { on = false; }; }, [product, size]);
  return src ? <img className={className} src={src} alt={alt} draggable={false} /> : <span className={className + ' vz-sw-ph'} style={{ background: (product && product.hex) || '#ddd' }} />;
}

export function qrDataUrl(text, px = 512, margin = 2) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(); const cell = Math.max(1, Math.floor(px / (n + margin * 2)));
  const c = document.createElement('canvas'); c.width = c.height = cell * (n + margin * 2);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#111';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + margin) * cell, (r + margin) * cell, cell, cell);
  return c.toDataURL('image/png');
}

export function Modal({ title, sub, onClose, children, ar, wide }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="vz-scrim" dir={ar ? 'rtl' : 'ltr'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'vz-modal' + (wide ? ' vz-modal-wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="vz-modal-h"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div><button type="button" className="vz-x" onClick={onClose} aria-label={T('close', ar)}>×</button></div>
        <div className="vz-modal-b">{children}</div>
      </div>
    </div>
  );
}

/** product grid + details + layout controls for one surface */
export function ProductPanel({ surfaceKey, products, sel, onPick, onChange, ar, area, settings, compact }) {
  const [q, setQ] = useState(''); const [kind, setKind] = useState('all'); const [shade, setShade] = useState('all'); const [flt, setFlt] = useState({}); const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = useState(favorites);
  const apps = (SURFACES[surfaceKey] || {}).apps || [];
  const list = useMemo(() => products.filter((p) => (p.applications || []).some((a) => apps.includes(a))), [products, apps]);
  const kinds = useMemo(() => [...new Set(list.map((p) => p.kind))], [list]);
  const shades = useMemo(() => ['light', 'medium', 'dark'].filter((x) => list.some((p) => p.shade === x)), [list]);
  const groups = useMemo(() => ((settings.tax && settings.tax.filters) || []).map((g) => ({ ...g, options: (g.options || []).filter((o) => g.dynamic === false || list.some((p) => ((p.filters || {})[g.id] || []).includes(o.id))) })).filter((g) => g.options.length), [settings.tax, list]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list.filter((p) => (kind === 'all' || p.kind === kind) && (shade === 'all' || p.shade === shade) && (!favOnly || favs.includes(p.id))
        && Object.entries(flt).every(([g, o]) => !o || ((p.filters || {})[g] || []).includes(o))
        && (!t || [p.name, p.name_ar, p.sku, p.collection].some((v) => String(v || '').toLowerCase().includes(t))))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.sort || 0) - (b.sort || 0));
  }, [list, kind, q, shade, flt, favOnly, favs]);
  useEffect(() => { setKind('all'); setQ(''); setShade('all'); setFlt({}); }, [surfaceKey]);
  const cur = sel && products.find((p) => p.id === sel.pid);
  const lays = feature(settings, 'layout_controls') ? layoutsFor(cur) : [];
  const qty = quantity(cur, area, settings);
  const g = settings.grout || {}; const colors = (Array.isArray(g.colors) && g.colors.length ? g.colors : ['#f4f2ec', '#d8d4cc', '#b5aea3', '#8a847b', '#4a4a4a', '#1f1f1f', '#c9b08a']);
  const isFav = cur && favs.includes(cur.id);
  return (
    <div className="vz-pp">
      {cur && (
        <div className="vz-cur">
          <Swatch product={cur} size={120} className="vz-cur-sw" />
          <div className="vz-cur-b">
            <div className="vz-cur-k">{(KIND_LABEL[cur.kind] || KIND_LABEL.other)[ar ? 1 : 0]}{cur.collection && !ar ? ' · ' + cur.collection : ''}</div>
            <div className="vz-cur-n">{displayName(cur, ar)}
              {feature(settings, 'favorites') && <button type="button" className={'vz-fav' + (isFav ? ' on' : '')} aria-pressed={!!isFav} aria-label={isFav ? T('unfav', ar) : T('fav', ar)} title={isFav ? T('unfav', ar) : T('fav', ar)} onClick={() => { toggleFavorite(cur.id); setFavs(favorites()); }}>{isFav ? '♥' : '♡'}</button>}
            </div>
            <Badges p={cur} settings={settings} ar={ar} />
            <div className="vz-cur-m">
              {!isContinuous(cur) && <span>{T('size', ar)} {cur.tile_w_mm}×{cur.tile_h_mm} mm</span>}
              <span>{(FINISH_LABEL[cur.finish] || [cur.finish, cur.finish])[ar ? 1 : 0]}</span>
              {cur.sku && <span>{T('code', ar)} {cur.sku}</span>}
              {cur.sell_by_box && cur.m2_per_box && <span>{T('perBox', ar, { m: Number(cur.m2_per_box) })}</span>}
              {settings.show_prices && cur.price_per_m2 && !area && <span><b>BD {Number(cur.price_per_m2).toFixed(3)}</b> {perUnit(cur.price_unit, ar)}</span>}
            </div>
            {qty && (
              <div className="vz-qty">
                <span>{T('area', ar)} <b>{qty.area.toFixed(1)} m²</b></span>
                <span>{T('qty', ar)} <b>{qty.order.toFixed(1)} m²</b> <small>{T('inclWaste', ar, { n: qty.waste })}</small></span>
                {qty.boxes != null && feature(settings, 'boxes') && <span><b>{T('boxes', ar, { n: qty.boxes })}</b></span>}
                {qty.total != null && <span>{T('est', ar)} <b>BD {qty.total.toFixed(0)}</b> <small>(BD {qty.price.toFixed(3)} {perUnit(qty.unit, ar)})</small></span>}
              </div>
            )}
          </div>
        </div>
      )}
      {cur && lays.length > 0 && !compact && (
        <div className="vz-opts">
          <div className="vz-opt">
            <label>{T('layout', ar)}</label>
            <div className="vz-chips">{lays.map((l) => <button key={l.id} type="button" className={sel.layout === l.id ? 'on' : ''} onClick={() => onChange({ layout: l.id })}>{layoutName(l.id, ar)}</button>)}</div>
          </div>
          {feature(settings, 'grout_controls') && <>
          <div className="vz-opt vz-opt-row">
            <label>{T('groutWidth', ar)} <b>{(sel.groutMm ?? 2).toFixed(1)} mm</b></label>
            <input type="range" min={g.min_mm ?? 0.5} max={g.max_mm ?? 10} step="0.5" value={sel.groutMm ?? 2} onChange={(e) => onChange({ groutMm: Number(e.target.value) })} />
          </div>
          <div className="vz-opt">
            <label>{T('groutColour', ar)}</label>
            <div className="vz-dots">{colors.map((c) => <button key={c} type="button" aria-label={c} className={sel.groutColor === c ? 'on' : ''} style={{ background: c }} onClick={() => onChange({ groutColor: c })} />)}</div>
          </div>
          </>}
          <div className="vz-opt vz-opt-row">
            <label>{T('rotation', ar)} <b>{sel.rotation || 0}°</b></label>
            <div className="vz-chips">{[0, 45, 90].map((d) => <button key={d} type="button" className={(sel.rotation || 0) === d ? 'on' : ''} onClick={() => onChange({ rotation: d })}>{d}°</button>)}</div>
          </div>
          {sel.layout === 'checker' && (
            <div className="vz-opt">
              <label>{T('mixWith', ar)}</label>
              <select value={sel.pid2 || ''} onChange={(e) => onChange({ pid2: e.target.value || null })}>
                <option value="">{T('none', ar)}</option>
                {list.filter((p) => p.id !== cur.id && !isContinuous(p) && Math.abs(p.tile_w_mm - cur.tile_w_mm) < 2 && Math.abs(p.tile_h_mm - cur.tile_h_mm) < 2).map((p) => <option key={p.id} value={p.id}>{displayName(p, ar)}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      <div className="vz-filter">
        {feature(settings, 'search') && <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('search', ar)} aria-label={T('search', ar)} />}
        {kinds.length > 1 && (
          <div className="vz-chips vz-chips-scroll">
            <button type="button" className={kind === 'all' && !favOnly ? 'on' : ''} onClick={() => { setKind('all'); setFavOnly(false); }}>{T('all', ar)}</button>
            {feature(settings, 'favorites') && favs.some((id) => list.some((p) => p.id === id)) && <button type="button" className={favOnly ? 'on' : ''} onClick={() => setFavOnly((v) => !v)}>♥ {T('favs', ar)}</button>}
            {kinds.map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{(KIND_LABEL[k] || KIND_LABEL.other)[ar ? 1 : 0]}</button>)}
          </div>
        )}
        {feature(settings, 'filters') && (shades.length > 1 || groups.length > 0) && (
          <div className="vz-chips vz-chips-scroll vz-chips-sub">
            {shades.length > 1 && shades.map((x) => <button key={x} type="button" className={shade === x ? 'on' : ''} onClick={() => setShade(shade === x ? 'all' : x)}><span className={'vz-shade vz-shade-' + x} />{T(x, ar)}</button>)}
            {groups.map((gr) => gr.options.map((o) => <button key={gr.id + o.id} type="button" className={flt[gr.id] === o.id ? 'on' : ''} onClick={() => setFlt((f) => ({ ...f, [gr.id]: f[gr.id] === o.id ? null : o.id }))}>{ar ? (o.ar || o.en) : o.en}</button>))}
          </div>
        )}
      </div>
      <div className="vz-grid">
        {shown.map((p) => (
          <button key={p.id} type="button" className={'vz-prod' + (sel && sel.pid === p.id ? ' on' : '')} onClick={() => onPick(p)} title={displayName(p, ar)} data-testid="vz-prod">
            <span className="vz-prod-img"><Swatch product={p} size={140} className="vz-prod-sw" alt="" /><Badges p={p} settings={settings} ar={ar} small /></span>
            <span className="vz-prod-n">{displayName(p, ar)}</span>
            {!isContinuous(p) && <span className="vz-prod-s">{p.tile_w_mm}×{p.tile_h_mm}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function download(dataUrl, name) {
  const a = document.createElement('a'); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

/** wrap a render in a branded frame (watermark settings from Bonsai → Digital Showroom → Visualizer settings) */
export function brandedImage(src, { title, lines = [], ar, wm }) {
  const w = { enabled: true, text: 'THE CLOSETS', text_ar: 'الخزائن', position: 'top', size: 100, footer: true, ...(wm || {}) };
  const loadImg = (u) => new Promise((res) => { if (!u) { res(null); return; } const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = u; });
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = async () => {
      const logo = w.enabled !== false && w.position !== 'none' ? await loadImg(w.logo_url) : null;
      const W = Math.min(1600, im.width), H = Math.round(im.height * (W / im.width));
      const k = (Number(w.size) || 100) / 100;
      const band = w.enabled !== false && (w.position === 'top' || w.position === 'bottom') ? Math.round(W * 0.07 * k) : 0;
      const lineH = Math.round(W * 0.022); const showLines = w.footer !== false && lines.length > 0;
      const foot = showLines ? Math.round(W * 0.04) + Math.ceil(lines.length / 2) * lineH : 0;
      const c = document.createElement('canvas'); c.width = W; c.height = band + H + foot; const g = c.getContext('2d');
      g.fillStyle = '#f6f3ee'; g.fillRect(0, 0, W, c.height);
      g.direction = ar ? 'rtl' : 'ltr';
      const pad = Math.round(W * 0.03); const imgY = w.position === 'top' ? band : 0;
      g.drawImage(im, 0, imgY, W, H);
      const brand = (ar ? w.text_ar : w.text) || '';
      if (band) {
        const by = w.position === 'top' ? 0 : H; const fs = Math.round(band * 0.34);
        if (logo) { const lh = band * 0.62; const lw = lh * (logo.width / logo.height); g.drawImage(logo, ar ? W - pad - lw : pad, by + (band - lh) / 2, lw, lh); }
        else { g.fillStyle = '#1b2a27'; g.font = `700 ${fs}px -apple-system, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif`; g.textBaseline = 'middle'; g.textAlign = ar ? 'right' : 'left'; g.fillText(brand, ar ? W - pad : pad, by + band / 2); }
        g.font = `500 ${Math.round(fs * 0.7)}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; g.fillStyle = '#5f6d68'; g.textBaseline = 'middle';
        g.textAlign = ar ? 'left' : 'right'; g.fillText(title || '', ar ? pad : W - pad, by + band / 2);
      } else if (w.enabled !== false && w.position === 'corner') {
        g.globalAlpha = 0.85;
        if (logo) { const lw = W * 0.14 * k; const lh = lw * (logo.height / logo.width); g.drawImage(logo, ar ? pad : W - pad - lw, pad, lw, lh); }
        else { g.font = `700 ${Math.round(W * 0.022 * k)}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 6; g.textBaseline = 'top'; g.textAlign = ar ? 'left' : 'right'; g.fillText(brand, ar ? pad : W - pad, pad); g.shadowBlur = 0; }
        g.globalAlpha = 1;
      }
      if (showLines) {
        const fy = (w.position === 'top' ? band + H : H + band);
        g.font = `500 ${Math.round(lineH * 0.62)}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; g.fillStyle = '#1b2a27'; g.textBaseline = 'middle';
        lines.forEach((l, i) => {
          const col = i % 2, row = Math.floor(i / 2); const x = ar ? W - pad - col * W / 2 : pad + col * W / 2;
          g.textAlign = ar ? 'right' : 'left'; g.fillText(l, x, fy + Math.round(W * 0.02) + row * lineH + lineH / 2);
        });
      }
      try { resolve(c.toDataURL('image/jpeg', 0.9)); } catch (e) { resolve(src); }
    };
    im.onerror = () => resolve(src);
    im.src = src;
  });
}

export function shrinkImage(src, maxW = 640, q = 0.72) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => { const k = Math.min(1, maxW / im.width); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); resolve(c.toDataURL('image/jpeg', q)); };
    im.onerror = () => resolve(null); im.src = src;
  });
}
