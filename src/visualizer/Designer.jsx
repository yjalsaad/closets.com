/* =============================================================================
 * Room Visualizer — the room designer [ROOM-VIZ 2026-11-07]
 * One sample room in 3D: tap a surface, pick a product, set the layout / grout / rotation, see quantities.
 * Room view (fixed camera, two angles) ⇄ 360° (stand in the room, drag / gyro / pinch). Compare (pin + slider),
 * branded image download, share link + QR (2D / 360), quote request → Bonsai lead. Used by the website, the kiosk and embeds.
 * ===========================================================================*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createViewer } from './scene3d';
import { ROOMS, SURFACES, roomById } from './rooms';
import { defaultGrout, displayName } from './materials';
import { layoutName } from './layout';
import { T } from './strings';
import { Swatch, ProductPanel, Modal, qrDataUrl, download, brandedImage, shrinkImage } from './ui';
import { createShare, requestQuote, track } from './api';

export function defaultSel(room, byId, products) {
  const out = {};
  room.surfaces.forEach((k) => {
    let p = byId[room.defaults[k]];
    if (!p) p = products.find((x) => (x.applications || []).some((a) => SURFACES[k].apps.includes(a)));
    if (p) { const g = defaultGrout(p); out[k] = { pid: p.id, layout: p.default_layout || 'straight', groutMm: g.mm, groutColor: g.color, rotation: 0, pid2: null }; }
  });
  return out;
}
export const selItems = (room, sel, byId, areas, ar) => room.surfaces.filter((k) => sel[k] && byId[sel[k].pid]).map((k) => {
  const p = byId[sel[k].pid]; const a = areas[k] || 0;
  return { surface: SURFACES[k][ar ? 'ar' : 'en'], surface_key: k, product_id: p.id, name: displayName(p, ar), sku: p.sku || null, layout: sel[k].layout ? layoutName(sel[k].layout, false) : null, m2: a ? Math.round(a * 10) / 10 : null };
});

export default function Designer({ roomId, products, settings, lang, initial, channel = 'web', kiosk = false, embed = false, onBack, onState, onShareCode }) {
  const ar = lang === 'ar';
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const room = roomById(roomId);
  const [sel, setSel] = useState(() => ({ ...defaultSel(room, byId, products), ...((initial && initial.room === room.id && initial.sel) || {}) }));
  const [active, setActive] = useState((initial && initial.surface && room.surfaces.includes(initial.surface)) ? initial.surface : 'floor');
  const [mode, setMode] = useState((initial && initial.mode === '360' && settings.pano !== false) ? '360' : '2d');
  const [view, setView] = useState((initial && initial.view) || 0);
  const [areas, setAreas] = useState({});
  const [busy, setBusy] = useState(true);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null); const [split, setSplit] = useState(50);
  const [modal, setModal] = useState(null);   // 'share' | 'quote'
  const [sheet, setSheet] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  const host = useRef(null); const viewer = useRef(null); const applied = useRef({});

  /* viewer lifecycle */
  useEffect(() => {
    const v = createViewer(host.current, {
      onPick: (k) => { if (k) { setActive(k); setSheet(true); v.flash(k); track('surface', { room: room.id, surface: k }); } },
      onHover: (k, x, y) => setHover(k ? { k, x, y } : null),
    });
    viewer.current = v;
    return () => { v.dispose(); viewer.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = viewer.current; if (!v) return;
    setBusy(true); applied.current = {};
    v.setRoom(room); v.setMode(mode); v.setView(view);
    setAreas(v.areas());
    track('room', { room: room.id, mode });
  }, [room.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* apply changed surfaces */
  useEffect(() => {
    const v = viewer.current; if (!v) return;
    let alive = true;
    (async () => {
      const keys = room.surfaces.filter((k) => sel[k] && JSON.stringify(sel[k]) !== applied.current[k]);
      for (const k of keys) {
        const s = sel[k]; const p = byId[s.pid]; if (!p) continue;
        applied.current[k] = JSON.stringify(s);
        await v.apply(k, { product: p, layout: s.layout, grout: { mm: s.groutMm ?? defaultGrout(p).mm, color: s.groutColor || defaultGrout(p).color }, rotation: s.rotation || 0, product2: s.pid2 ? byId[s.pid2] : null });
        if (!alive) return;
      }
      if (alive) setBusy(false);
    })();
    if (onState) onState({ room: room.id, sel, mode, view });
    return () => { alive = false; };
  }, [sel, room.id, byId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const v = viewer.current; if (v) { v.setMode(mode); track('mode', { room: room.id, mode }); } if (mode !== '360' && gyroOn) { viewer.current && viewer.current.gyro(false); setGyroOn(false); } }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const v = viewer.current; if (v) v.setView(view); }, [view]);

  const pick = useCallback((p) => {
    setSel((s) => { const g = defaultGrout(p); const prev = s[active] || {}; const same = prev.pid === p.id;
      return { ...s, [active]: same ? prev : { pid: p.id, layout: p.default_layout || 'straight', groutMm: g.mm, groutColor: g.color, rotation: 0, pid2: null } }; });
    track('apply', { room: room.id, surface: active, product_id: p.id, mode });
  }, [active, room.id, mode]);
  const change = useCallback((patch) => setSel((s) => ({ ...s, [active]: { ...s[active], ...patch } })), [active]);

  const state = () => ({ v: 1, room: room.id, mode, view, sel });
  const items = () => selItems(room, sel, byId, areas, ar);

  const saveImage = async () => {
    const src = viewer.current.snapshot();
    const lines = items().map((i) => `${i.surface}: ${i.name}${i.layout && i.layout !== 'Straight' ? ' · ' + i.layout : ''}`);
    const out = await brandedImage(src, { title: room[ar ? 'ar' : 'en'], lines, ar });
    download(out, `the-closets-${room.id}.jpg`); track('snapshot', { room: room.id, mode });
  };
  const togglePin = () => { if (pinned) { setPinned(null); return; } setPinned(viewer.current.snapshot()); setSplit(50); track('compare', { room: room.id }); };

  const enabledRooms = ROOMS.filter((r) => !settings.rooms || settings.rooms[r.id] !== false);
  const cur = sel[active] && byId[sel[active].pid];

  return (
    <div className={'vz-designer' + (kiosk ? ' vz-kiosk' : '') + (embed ? ' vz-embed' : '')} dir={ar ? 'rtl' : 'ltr'}>
      <div className="vz-stage">
        <div className="vz-host" ref={host} />
        {pinned && (
          <div className="vz-cmp" style={{ clipPath: ar ? `inset(0 0 0 ${split}%)` : `inset(0 ${100 - split}% 0 0)` }} aria-hidden="true">
            <img src={pinned} alt="" />
          </div>
        )}
        {pinned && (
          <div className="vz-cmp-bar" style={{ [ar ? 'right' : 'left']: split + '%' }}>
            <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={T('compareOn', ar)} className="vz-cmp-range" />
          </div>
        )}
        {busy && <div className="vz-busy"><span className="vz-spin" />{T('building', ar)}</div>}
        {hover && SURFACES[hover.k] && <div className="vz-tip" style={{ left: hover.x, top: hover.y }}>{SURFACES[hover.k][ar ? 'ar' : 'en']}</div>}
        <div className="vz-topbar">
          {onBack && !embed && <button type="button" className="vz-pill" onClick={onBack}>{ar ? '→' : '←'} {T('rooms', ar)}</button>}
          <select className="vz-pill vz-roomsel" value={room.id} onChange={(e) => onBack && onBack(e.target.value)} aria-label={T('pickRoom', ar)}>
            {enabledRooms.map((r) => <option key={r.id} value={r.id}>{r.icon} {r[ar ? 'ar' : 'en']}</option>)}
          </select>
          <span className="vz-grow" />
          {settings.pano !== false && (
            <div className="vz-seg" role="tablist">
              <button type="button" role="tab" aria-selected={mode === '2d'} className={mode === '2d' ? 'on' : ''} onClick={() => setMode('2d')}>{T('modeRoom', ar)}</button>
              <button type="button" role="tab" aria-selected={mode === '360'} className={mode === '360' ? 'on' : ''} onClick={() => setMode('360')} data-testid="vz-360">{T('mode360', ar)}</button>
            </div>
          )}
        </div>
        <div className="vz-bottombar">
          {mode === '2d' && room.views.length > 1 && room.views.map((_, i) => <button key={i} type="button" className={'vz-pill' + (view === i ? ' on' : '')} onClick={() => setView(i)}>{T('view', ar)} {i + 1}</button>)}
          {mode === '360' && <span className="vz-hint">{T('dragLook', ar)}</span>}
          {mode === '360' && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && ('ontouchstart' in window) && (
            <button type="button" className={'vz-pill' + (gyroOn ? ' on' : '')} onClick={async () => { const r = await viewer.current.gyro(!gyroOn); setGyroOn(!!r && !gyroOn); }}>📱 {T('gyro', ar)}</button>
          )}
          <span className="vz-grow" />
          <button type="button" className={'vz-pill' + (pinned ? ' on' : '')} onClick={togglePin}>{pinned ? T('unpin', ar) : T('compare', ar)}</button>
          {!kiosk && <button type="button" className="vz-pill" onClick={saveImage}>⤓ {T('save', ar)}</button>}
          <button type="button" className="vz-pill" onClick={() => setModal('share')} data-testid="vz-share">{kiosk ? '📱 ' + T('continuePhone', ar) : T('share', ar)}</button>
          {settings.quote_cta !== false && <button type="button" className="vz-pill vz-pill-cta" onClick={() => setModal('quote')} data-testid="vz-quote">{T('quote', ar)}</button>}
        </div>
      </div>

      <aside className={'vz-panel' + (sheet ? ' open' : '')}>
        <button type="button" className="vz-sheet-grip" onClick={() => setSheet((s) => !s)} aria-label={T('products', ar)}>
          <span />{cur ? `${SURFACES[active][ar ? 'ar' : 'en']} · ${displayName(cur, ar)}` : T('tapSurface', ar)}
        </button>
        <div className="vz-surfs" role="tablist" aria-label={T('surfaces', ar)}>
          {room.surfaces.map((k) => {
            const p = sel[k] && byId[sel[k].pid];
            return (
              <button key={k} type="button" role="tab" aria-selected={active === k} className={'vz-surf' + (active === k ? ' on' : '')} onClick={() => { setActive(k); viewer.current && viewer.current.flash(k); }} data-testid={'vz-surf-' + k}>
                {p ? <Swatch product={p} size={64} className="vz-surf-sw" /> : <span className="vz-surf-sw" />}
                <span>{SURFACES[k][ar ? 'ar' : 'en']}</span>
              </button>
            );
          })}
        </div>
        <ProductPanel surfaceKey={active} products={products} sel={sel[active]} onPick={pick} onChange={change} ar={ar} area={areas[active] || 0} settings={settings} />
        <p className="vz-foot">{T('tapSurface', ar)}</p>
      </aside>

      {modal === 'share' && <ShareModal ar={ar} kiosk={kiosk} state={state()} label={room[ar ? 'ar' : 'en']} source={kiosk ? 'kiosk' : embed ? 'embed' : 'share'} onClose={() => setModal(null)} onCode={onShareCode} />}
      {modal === 'quote' && <QuoteModal ar={ar} channel={channel} room={room.id} items={items()} getState={state} getThumb={() => shrinkImage(viewer.current.snapshot(), 640)} onClose={() => setModal(null)} kiosk={kiosk} />}
    </div>
  );
}

/* ── share: short link + QR (room view / 360) ───────────────────────────────────────────────────────────────── */
export function ShareModal({ ar, state, label, source = 'share', onClose, kiosk, onCode }) {
  const [code, setCode] = useState(null); const [err, setErr] = useState(''); const [copied, setCopied] = useState(false);
  const [which, setWhich] = useState(state.mode === '360' ? '360' : '2d');
  useEffect(() => { let on = true; createShare(state, source, label).then((c) => { if (!on) return; if (c) { setCode(c); if (onCode) onCode(c); track('share', { room: state.room, meta: { code: c } }); } else setErr('long'); }); return () => { on = false; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const longLink = origin + '/visualizer/room/' + state.room + '?s=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(state)))));
  const link = code ? `${origin}/visualizer/r/${code}${which === '360' ? '?mode=360' : ''}` : (err ? longLink : '');
  const qr = useMemo(() => (link ? qrDataUrl(link, 560) : null), [link]);
  return (
    <Modal ar={ar} title={kiosk ? T('continuePhone', ar) : T('shareTitle', ar)} sub={kiosk ? T('scanMe', ar) : T('shareSub', ar)} onClose={onClose}>
      <div className="vz-share">
        <div className="vz-seg">
          <button type="button" className={which === '2d' ? 'on' : ''} onClick={() => setWhich('2d')}>{T('open2d', ar)}</button>
          <button type="button" className={which === '360' ? 'on' : ''} onClick={() => setWhich('360')}>{T('open360q', ar)}</button>
        </div>
        {qr ? <img className="vz-qr" src={qr} alt="QR" /> : <div className="vz-qr vz-qr-ph"><span className="vz-spin" /></div>}
        {!kiosk && link && (
          <>
            <input className="vz-link" readOnly value={link} onFocus={(e) => e.target.select()} />
            <div className="vz-actions">
              <button type="button" className="vz-btn" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? T('copied', ar) : T('copy', ar)}</button>
              <button type="button" className="vz-btn" onClick={() => download(qr, 'the-closets-room-qr.png')}>{T('downloadQr', ar)}</button>
              <a className="vz-btn vz-btn-dark" href={'https://wa.me/?text=' + encodeURIComponent((label ? label + ' — ' : '') + link)} target="_blank" rel="noopener noreferrer">{T('whatsapp', ar)}</a>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── quote request ─────────────────────────────────────────────────────────────────────────────────────────── */
export function QuoteModal({ ar, channel, room, items, getState, getThumb, onClose, kiosk }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', note: '', website: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(null);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const send = async (e) => {
    e.preventDefault(); setErr('');
    if (!f.name.trim() || (!f.phone.trim() && !f.email.trim())) { setErr(T('needContact', ar)); return; }
    setBusy(true);
    try {
      const st = getState ? getState() : null;
      const [code, thumb] = await Promise.all([st ? createShare(st, kiosk ? 'kiosk' : 'share', 'quote') : null, getThumb ? getThumb() : null]);
      const r = await requestQuote({ ...f, room, items, share_code: code, thumb, channel });
      if (r && r.ok) { setDone(r.ref || '—'); track('quote', { room }); }
      else setErr(r && r.error === 'rate_limited' ? T('rateLimited', ar) : T('failed', ar));
    } catch (er) { setErr(T('failed', ar)); } finally { setBusy(false); }
  };
  return (
    <Modal ar={ar} title={done ? T('sent', ar) : T('quoteTitle', ar)} sub={done ? T('sentSub', ar) : T('quoteSub', ar)} onClose={onClose}>
      {done ? (
        <div className="vz-done"><p>{T('ref', ar)}: <b>{done}</b></p><button type="button" className="vz-btn vz-btn-dark" onClick={onClose}>{T('close', ar)}</button></div>
      ) : (
        <form className="vz-form" onSubmit={send} noValidate>
          {items && items.length > 0 && (
            <div className="vz-sel-list"><b>{T('yourSelection', ar)}</b>{items.map((i) => <div key={i.surface}>{i.surface}: {i.name}{i.m2 ? ` · ${i.m2} m²` : ''}</div>)}</div>
          )}
          <label>{T('name', ar)}<input value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} /></label>
          <label>{T('phone', ar)}<input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" dir="ltr" placeholder="+973" maxLength={30} /></label>
          <label>{T('email', ar)}<input type="email" value={f.email} onChange={set('email')} autoComplete="email" dir="ltr" maxLength={160} /></label>
          <label>{T('note', ar)}<textarea rows={3} value={f.note} onChange={set('note')} maxLength={1500} /></label>
          <input className="vz-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" />
          {err && <div className="vz-err" role="alert">{err}</div>}
          <button type="submit" className="vz-btn vz-btn-dark vz-wide" disabled={busy} data-testid="vz-send">{busy ? T('sending', ar) : T('send', ar)}</button>
        </form>
      )}
    </Modal>
  );
}
