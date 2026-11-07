/* Room Visualizer — shared UI bits [ROOM-VIZ 2026-11-07] */
import React, { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { swatch, displayName, isContinuous } from './materials';
import { layoutsFor, layoutName } from './layout';
import { T, KIND_LABEL, FINISH_LABEL } from './strings';
import { SURFACES } from './rooms';

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
  const [q, setQ] = useState(''); const [kind, setKind] = useState('all');
  const apps = (SURFACES[surfaceKey] || {}).apps || [];
  const list = useMemo(() => products.filter((p) => (p.applications || []).some((a) => apps.includes(a))), [products, apps]);
  const kinds = useMemo(() => [...new Set(list.map((p) => p.kind))], [list]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list.filter((p) => (kind === 'all' || p.kind === kind) && (!t || [p.name, p.name_ar, p.sku, p.collection].some((v) => String(v || '').toLowerCase().includes(t))))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.sort || 0) - (b.sort || 0));
  }, [list, kind, q]);
  useEffect(() => { setKind('all'); setQ(''); }, [surfaceKey]);
  const cur = sel && products.find((p) => p.id === sel.pid);
  const lays = layoutsFor(cur);
  const waste = Number(settings.wastage_pct ?? 10);
  const order = area ? area * (1 + waste / 100) : 0;
  const price = settings.show_prices && cur && cur.price_per_m2 ? Number(cur.price_per_m2) : null;
  return (
    <div className="vz-pp">
      {cur && (
        <div className="vz-cur">
          <Swatch product={cur} size={120} className="vz-cur-sw" />
          <div className="vz-cur-b">
            <div className="vz-cur-k">{(KIND_LABEL[cur.kind] || KIND_LABEL.other)[ar ? 1 : 0]}{cur.collection && !ar ? ' · ' + cur.collection : ''}</div>
            <div className="vz-cur-n">{displayName(cur, ar)}</div>
            <div className="vz-cur-m">
              {!isContinuous(cur) && <span>{T('size', ar)} {cur.tile_w_mm}×{cur.tile_h_mm} mm</span>}
              <span>{(FINISH_LABEL[cur.finish] || [cur.finish, cur.finish])[ar ? 1 : 0]}</span>
              {cur.sku && <span>{T('code', ar)} {cur.sku}</span>}
            </div>
            {area > 0 && (
              <div className="vz-qty">
                <span>{T('area', ar)} <b>{area.toFixed(1)} m²</b></span>
                <span>{T('qty', ar)} <b>{order.toFixed(1)} m²</b> <small>{T('inclWaste', ar, { n: waste })}</small></span>
                {price != null && <span>{T('est', ar)} <b>BD {(order * price).toFixed(0)}</b> <small>(BD {price.toFixed(3)} {T('perM2', ar)})</small></span>}
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
          <div className="vz-opt vz-opt-row">
            <label>{T('groutWidth', ar)} <b>{(sel.groutMm ?? 2).toFixed(1)} mm</b></label>
            <input type="range" min="0.5" max="10" step="0.5" value={sel.groutMm ?? 2} onChange={(e) => onChange({ groutMm: Number(e.target.value) })} />
          </div>
          <div className="vz-opt">
            <label>{T('groutColour', ar)}</label>
            <div className="vz-dots">{['#f4f2ec', '#d8d4cc', '#b5aea3', '#8a847b', '#4a4a4a', '#1f1f1f', '#c9b08a'].map((c) => <button key={c} type="button" aria-label={c} className={sel.groutColor === c ? 'on' : ''} style={{ background: c }} onClick={() => onChange({ groutColor: c })} />)}</div>
          </div>
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
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('search', ar)} aria-label={T('search', ar)} />
        {kinds.length > 1 && (
          <div className="vz-chips vz-chips-scroll">
            <button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>{T('all', ar)}</button>
            {kinds.map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{(KIND_LABEL[k] || KIND_LABEL.other)[ar ? 1 : 0]}</button>)}
          </div>
        )}
      </div>
      <div className="vz-grid">
        {shown.map((p) => (
          <button key={p.id} type="button" className={'vz-prod' + (sel && sel.pid === p.id ? ' on' : '')} onClick={() => onPick(p)} title={displayName(p, ar)} data-testid="vz-prod">
            <Swatch product={p} size={140} className="vz-prod-sw" alt="" />
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

/** wrap a render in a branded frame: header (brand + room), image, footer listing the selected finishes */
export function brandedImage(src, { title, lines = [], ar }) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      const W = Math.min(1600, im.width), H = Math.round(im.height * (W / im.width));
      const head = Math.round(W * 0.07), lineH = Math.round(W * 0.022), foot = Math.round(W * 0.04) + Math.ceil(lines.length / 2) * lineH;
      const c = document.createElement('canvas'); c.width = W; c.height = head + H + foot; const g = c.getContext('2d');
      g.fillStyle = '#f6f3ee'; g.fillRect(0, 0, W, c.height);
      g.direction = ar ? 'rtl' : 'ltr';
      const pad = Math.round(W * 0.03); const fs = Math.round(head * 0.34);
      g.fillStyle = '#1b2a27'; g.font = `700 ${fs}px -apple-system, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif`; g.textBaseline = 'middle';
      g.textAlign = ar ? 'right' : 'left'; g.fillText(ar ? 'الخزائن' : 'THE CLOSETS', ar ? W - pad : pad, head / 2);
      g.font = `500 ${Math.round(fs * 0.7)}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; g.fillStyle = '#5f6d68';
      g.textAlign = ar ? 'left' : 'right'; g.fillText(title || '', ar ? pad : W - pad, head / 2);
      g.drawImage(im, 0, head, W, H);
      g.font = `500 ${Math.round(lineH * 0.62)}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; g.fillStyle = '#1b2a27';
      lines.forEach((l, i) => {
        const col = i % 2, row = Math.floor(i / 2); const x = ar ? W - pad - col * W / 2 : pad + col * W / 2;
        g.textAlign = ar ? 'right' : 'left'; g.fillText(l, x, head + H + Math.round(W * 0.02) + row * lineH + lineH / 2);
      });
      resolve(c.toDataURL('image/jpeg', 0.9));
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
