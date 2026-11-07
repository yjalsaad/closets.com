/* =============================================================================
 * Room Visualizer — website app shell [ROOM-VIZ 2026-11-07]   (Tilesview-style, built into closets-website)
 *   /visualizer                     rooms gallery + Your photo + Catalogue        ?product=<id> opens it in the best room
 *   /visualizer/room/<id>           the room designer (Room view / 360°)          ?mode=360  ?s=<state>
 *   /visualizer/photo               Room photo to visualizer
 *   /visualizer/catalog             Catalogue PDF builder
 *   /visualizer/r/<code>            a saved design / QR link (2D, 360, custom room, product)
 *   /visualizer/kiosk               Showroom kiosk (attract loop, idle reset, take-home QR)
 *   /visualizer/embed               iframe for other websites (public/visualizer-embed.js)
 * ===========================================================================*/
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './viz.css';
import Designer, { defaultSel } from './Designer';
import PhotoVisualizer from './PhotoVisualizer';
import { ROOMS, SURFACES, roomById } from './rooms';
import { createViewer } from './scene3d';
import { defaultGrout, displayName } from './materials';
import { T, KIND_LABEL } from './strings';
import { Swatch, download } from './ui';
import { loadCatalog, loadSettings, getShare, track, setChannel, DEFAULT_SETTINGS } from './api';

const LANG_KEY = 'closets_lang';
const readLang = () => { try { return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } };
const parse = () => { const seg = (window.location.pathname || '').replace(/\/+$/, '').split('/').filter(Boolean); return { a: seg[1] || '', b: seg[2] || '', q: new URLSearchParams(window.location.search) }; };
export const go = (path, replace) => { window.history[replace ? 'replaceState' : 'pushState'](null, '', path); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo(0, 0); };

/** the best room + surface for one product */
function stateForProduct(p, rooms) {
  const order = ['floor', 'feature', 'walls', 'backsplash', 'shower', 'countertop', 'cabinets', 'wardrobe', 'panel'];
  for (const k of order) {
    if (!(p.applications || []).some((a) => SURFACES[k].apps.includes(a))) continue;
    const room = rooms.find((r) => r.surfaces.includes(k)); if (!room) continue;
    const g = defaultGrout(p);
    return { room: room.id, surface: k, sel: { [k]: { pid: p.id, layout: p.default_layout || 'straight', groutMm: g.mm, groutColor: g.color, rotation: 0, pid2: null } } };
  }
  return null;
}
const decodeState = (s) => { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } };

export default function VizRoot() {
  const [route, setRoute] = useState(parse);
  const [lang, setLangS] = useState(readLang);
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const ar = lang === 'ar';
  useEffect(() => { const f = () => setRoute(parse()); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  useEffect(() => { loadCatalog().then(setData); loadSettings().then(setSettings); }, []);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = ar ? 'rtl' : 'ltr'; }, [lang, ar]);
  useEffect(() => { document.title = T('brand', ar) + ' — The Closets'; }, [ar]);
  const setLang = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } setLangS(l); };
  const rooms = useMemo(() => ROOMS.filter((r) => !settings.rooms || settings.rooms[r.id] !== false), [settings]);

  const { a, b, q } = route;
  const chrome = a !== 'kiosk' && a !== 'embed';
  useEffect(() => { setChannel(a === 'kiosk' ? 'kiosk' : a === 'embed' ? 'embed' : a === 'r' ? 'qr' : 'web'); }, [a]);

  let body;
  if (!data) body = <div className="vz-loading"><span className="vz-spin" />{T('loading', ar)}</div>;
  else if (a === 'room') body = <RoomPage key={b + (q.get('s') || '')} roomId={b} q={q} data={data} settings={settings} lang={lang} rooms={rooms} />;
  else if (a === 'photo') body = <PhotoVisualizer products={data.products} settings={settings} lang={lang} onBack={() => go('/visualizer')} />;
  else if (a === 'catalog') body = <CatalogPage products={data.products} settings={settings} lang={lang} />;
  else if (a === 'r') body = <SharePage code={b} q={q} data={data} settings={settings} lang={lang} />;
  else if (a === 'kiosk') body = <Kiosk data={data} settings={settings} lang={lang} setLang={setLang} rooms={rooms} />;
  else if (a === 'embed') body = <EmbedPage q={q} data={data} settings={settings} lang={lang} rooms={rooms} />;
  else body = <Home data={data} settings={settings} lang={lang} rooms={rooms} q={q} />;

  return (
    <div className={'vz-root' + (chrome ? '' : ' vz-bare')} dir={ar ? 'rtl' : 'ltr'} lang={lang}>
      {chrome && (
        <header className="vz-head">
          <a className="vz-brand" href="/">THE CLOSETS</a>
          <button type="button" className="vz-crumb" onClick={() => go('/visualizer')}>{T('brand', ar)}</button>
          <nav className="vz-nav">
            <button type="button" className={a === '' || a === 'room' ? 'on' : ''} onClick={() => go('/visualizer')}>{T('rooms', ar)}</button>
            {settings.photo_mode !== false && <button type="button" className={a === 'photo' ? 'on' : ''} onClick={() => go('/visualizer/photo')}>{T('modePhoto', ar)}</button>}
            {settings.catalog !== false && <button type="button" className={a === 'catalog' ? 'on' : ''} onClick={() => go('/visualizer/catalog')}>PDF</button>}
          </nav>
          <span className="vz-grow" />
          <button type="button" className="vz-lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'EN' : 'ع'}</button>
        </header>
      )}
      <main className="vz-main">{body}</main>
    </div>
  );
}

/* ── room thumbnails: rendered once in the background, cached for the session ──────────────────────────────── */
const thumbCache = {};
function useRoomThumbs(rooms, products) {
  const [thumbs, setThumbs] = useState(() => { const o = {}; rooms.forEach((r) => { try { const t = sessionStorage.getItem('vz_thumb_' + r.id); if (t) o[r.id] = t; } catch (e) { /* ignore */ } }); return { ...o, ...thumbCache }; });
  useEffect(() => {
    let alive = true; const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const todo = rooms.filter((r) => !thumbs[r.id]); if (!todo.length) return undefined;
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;height:420px;'; document.body.appendChild(host);
    let v = null;
    (async () => {
      await new Promise((r) => setTimeout(r, 300));
      try { v = createViewer(host, {}, { lowRes: true }); } catch (e) { return; }
      for (const room of todo) {
        if (!alive) break;
        v.setRoom(room); v.setMode('2d'); v.setView(0);
        const sel = defaultSel(room, byId, products);
        for (const k of room.surfaces) { const s = sel[k]; if (s) await v.apply(k, { product: byId[s.pid], layout: s.layout, grout: { mm: s.groutMm, color: s.groutColor } }); }
        const url = v.snapshot('image/jpeg', 0.8); thumbCache[room.id] = url; try { sessionStorage.setItem('vz_thumb_' + room.id, url); } catch (e) { /* full */ }
        if (alive) setThumbs((t) => ({ ...t, [room.id]: url }));
      }
      if (v) v.dispose(); host.remove();
    })();
    return () => { alive = false; };
  }, [rooms.length, products.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return thumbs;
}

function Home({ data, settings, lang, rooms, q }) {
  const ar = lang === 'ar';
  const thumbs = useRoomThumbs(rooms, data.products);
  useEffect(() => {
    const pid = q.get('product'); if (!pid) return;
    const p = data.products.find((x) => x.id === pid); const st = p && stateForProduct(p, rooms);
    if (st) { try { sessionStorage.setItem('vz_state_' + st.room, JSON.stringify(st)); } catch (e) { /* ignore */ } go('/visualizer/room/' + st.room, true); track('product_link', { product_id: pid }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const featured = data.products.filter((p) => p.featured).slice(0, 12);
  return (
    <div className="vz-page">
      <section className="vz-hero">
        <p className="vz-eyebrow">{T('heroEyebrow', ar)}</p>
        <h1>{T('heroTitle', ar)}</h1>
        <p className="vz-lede">{T('heroLede', ar)}</p>
      </section>
      <h2 className="vz-h2">{T('pickRoom', ar)}</h2>
      <div className="vz-rooms">
        {rooms.map((r) => (
          <div key={r.id} className="vz-room" data-testid={'vz-room-' + r.id}>
            <button type="button" className="vz-room-img" onClick={() => go('/visualizer/room/' + r.id)} aria-label={r[ar ? 'ar' : 'en']}>
              {thumbs[r.id] ? <img src={thumbs[r.id]} alt="" /> : <span className="vz-room-ph"><span className="vz-spin" /></span>}
            </button>
            <div className="vz-room-b">
              <span className="vz-room-t">{r.icon} {r[ar ? 'ar' : 'en']}</span>
              <span className="vz-room-a">
                <button type="button" className="vz-link-btn" onClick={() => go('/visualizer/room/' + r.id)}>{T('modeRoom', ar)}</button>
                {settings.pano !== false && <button type="button" className="vz-link-btn" onClick={() => go('/visualizer/room/' + r.id + '?mode=360')}>{T('mode360', ar)}</button>}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="vz-cards">
        {settings.photo_mode !== false && (
          <button type="button" className="vz-card" onClick={() => go('/visualizer/photo')}>
            <span className="vz-card-i">📷</span><b>{T('tryPhoto', ar)}</b><span>{T('tryPhotoSub', ar)}</span>
          </button>
        )}
        {settings.catalog !== false && (
          <button type="button" className="vz-card" onClick={() => go('/visualizer/catalog')}>
            <span className="vz-card-i">📘</span><b>{T('catalog', ar)}</b><span>{T('catalogSub', ar)}</span>
          </button>
        )}
      </div>
      {featured.length > 0 && (
        <>
          <h2 className="vz-h2">{T('products', ar)}</h2>
          <div className="vz-feat">
            {featured.map((p) => (
              <button key={p.id} type="button" className="vz-feat-i" onClick={() => go('/visualizer?product=' + encodeURIComponent(p.id))}>
                <Swatch product={p} size={220} className="vz-feat-sw" />
                <b>{displayName(p, ar)}</b><span>{(KIND_LABEL[p.kind] || KIND_LABEL.other)[ar ? 1 : 0]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RoomPage({ roomId, q, data, settings, lang, rooms }) {
  const room = roomById(roomId);
  const initial = useMemo(() => {
    const s = q.get('s'); if (s) { const st = decodeState(s); if (st) return st; }
    try { const st = JSON.parse(sessionStorage.getItem('vz_state_' + room.id) || 'null'); if (st) return { ...st, mode: q.get('mode') || st.mode }; } catch (e) { /* ignore */ }
    return { room: room.id, mode: q.get('mode') || '2d' };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rooms.find((r) => r.id === room.id)) return <div className="vz-page"><p>{T('notFound', lang === 'ar')}</p></div>;
  return (
    <Designer roomId={room.id} products={data.products} settings={settings} lang={lang} initial={initial}
      onBack={(id) => go(id ? '/visualizer/room/' + id : '/visualizer')}
      onState={(st) => { try { sessionStorage.setItem('vz_state_' + st.room, JSON.stringify(st)); } catch (e) { /* ignore */ } }} />
  );
}

function SharePage({ code, q, data, settings, lang }) {
  const [st, setSt] = useState(undefined);
  useEffect(() => { getShare(code).then((r) => { setSt(r && r.state ? r.state : null); track('qr_open', { meta: { code } }); }); }, [code]);
  const ar = lang === 'ar';
  if (st === undefined) return <div className="vz-loading"><span className="vz-spin" />{T('loading', ar)}</div>;
  if (!st) return <div className="vz-page"><p>{T('notFound', ar)}</p><button type="button" className="vz-btn" onClick={() => go('/visualizer')}>{T('rooms', ar)}</button></div>;
  if (st.product && !st.sel) { go('/visualizer?product=' + encodeURIComponent(st.product), true); return null; }
  const initial = { ...st, mode: q.get('mode') || st.mode || '2d' };
  return <Designer roomId={st.room} products={data.products} settings={settings} lang={lang} initial={initial} onBack={(id) => go(id ? '/visualizer/room/' + id : '/visualizer')} />;
}

function EmbedPage({ q, data, settings, lang, rooms }) {
  const ar = (q.get('lang') || lang) === 'ar';
  const pid = q.get('product'); const p = pid && data.products.find((x) => x.id === pid);
  const st = (p && stateForProduct(p, rooms)) || null;
  const [roomId, setRoomId] = useState((st && st.room) || q.get('room') || (rooms[0] && rooms[0].id));
  const initial = st && st.room === roomId ? { ...st, mode: q.get('mode') || '2d' } : { room: roomId, mode: q.get('mode') || '2d' };
  return (
    <div className="vz-embed-wrap">
      <Designer key={roomId} roomId={roomId} products={data.products} settings={settings} lang={ar ? 'ar' : 'en'} initial={initial} channel="embed" embed onBack={(id) => id && setRoomId(id)} />
      <a className="vz-embed-badge" href={'/visualizer/room/' + roomId} target="_blank" rel="noopener noreferrer">{T('poweredBy', ar)} · {T('openFull', ar)}</a>
    </div>
  );
}

/* ── catalogue PDF ─────────────────────────────────────────────────────────────────────────────────────────── */
function CatalogPage({ products, settings, lang }) {
  const ar = lang === 'ar';
  const [picked, setPicked] = useState(() => new Set(products.filter((p) => p.featured).map((p) => p.id)));
  const [kind, setKind] = useState('all'); const [title, setTitle] = useState(ar ? 'تشطيبات مختارة' : 'Selected finishes');
  const [prices, setPrices] = useState(!!settings.show_prices); const [busy, setBusy] = useState(0);
  const [withRoom, setWithRoom] = useState(false);
  const lastRoom = useMemo(() => { try { const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('vz_thumb_')); return keys.length ? sessionStorage.getItem(keys[0]) : null; } catch (e) { return null; } }, []);
  const kinds = useMemo(() => [...new Set(products.map((p) => p.kind))], [products]);
  const shown = products.filter((p) => kind === 'all' || p.kind === kind);
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const make = async () => {
    const list = products.filter((p) => picked.has(p.id)); if (!list.length) return;
    setBusy(0.01);
    try {
      const { buildCatalogPdf } = await import('./catalogPdf');
      const blob = await buildCatalogPdf({ products: list, title, ar, prices: prices && settings.show_prices, roomImage: withRoom ? lastRoom : null, origin: window.location.origin, onProgress: (x) => setBusy(Math.max(0.02, Math.min(0.99, x))) });
      download(URL.createObjectURL(blob), (title || 'catalogue').replace(/[^\w؀-ۿ-]+/g, '-') + '.pdf');
      track('catalog_pdf', { meta: { n: list.length } });
    } finally { setBusy(0); }
  };
  return (
    <div className="vz-page">
      <section className="vz-hero vz-hero-sm"><p className="vz-eyebrow">PDF</p><h1>{T('catTitle', ar)}</h1><p className="vz-lede">{T('catSub', ar)}</p></section>
      <div className="vz-cat-bar">
        <label className="vz-field">{T('catName', ar)}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} /></label>
        {settings.show_prices && <label className="vz-check"><input type="checkbox" checked={prices} onChange={(e) => setPrices(e.target.checked)} /> {T('withPrices', ar)}</label>}
        {lastRoom && <label className="vz-check"><input type="checkbox" checked={withRoom} onChange={(e) => setWithRoom(e.target.checked)} /> {T('includeRoom', ar)}</label>}
        <span className="vz-grow" />
        <span className="vz-muted">{T('selected', ar, { n: picked.size })}</span>
        <button type="button" className="vz-btn" onClick={() => setPicked(new Set(shown.map((p) => p.id)))}>{T('selectAll', ar)}</button>
        <button type="button" className="vz-btn" onClick={() => setPicked(new Set())}>{T('clear', ar)}</button>
        <button type="button" className="vz-btn vz-btn-dark" disabled={!picked.size || !!busy} onClick={make} data-testid="vz-pdf">{busy ? `${T('making', ar)} ${Math.round(busy * 100)}%` : T('makePdf', ar)}</button>
      </div>
      <div className="vz-chips vz-chips-scroll">
        <button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>{T('all', ar)}</button>
        {kinds.map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{(KIND_LABEL[k] || KIND_LABEL.other)[ar ? 1 : 0]}</button>)}
      </div>
      <div className="vz-cat-grid">
        {shown.map((p) => (
          <button key={p.id} type="button" className={'vz-cat-i' + (picked.has(p.id) ? ' on' : '')} onClick={() => toggle(p.id)} aria-pressed={picked.has(p.id)}>
            <Swatch product={p} size={200} className="vz-cat-sw" /><span className="vz-cat-n">{displayName(p, ar)}</span><span className="vz-cat-tick">✓</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── showroom kiosk ────────────────────────────────────────────────────────────────────────────────────────── */
function Kiosk({ data, settings, lang, setLang, rooms }) {
  const ar = lang === 'ar';
  const [phase, setPhase] = useState('attract'); const [roomId, setRoomId] = useState(null); const [nonce, setNonce] = useState(0);
  const thumbs = useRoomThumbs(rooms, data.products);
  const idle = Math.max(20, Number((settings.kiosk || {}).idle_seconds) || 90) * 1000;
  const timer = useRef(null);
  useEffect(() => {
    const reset = () => { clearTimeout(timer.current); timer.current = setTimeout(() => { setPhase('attract'); setRoomId(null); setNonce((n) => n + 1); try { Object.keys(sessionStorage).filter((k) => k.startsWith('vz_state_')).forEach((k) => sessionStorage.removeItem(k)); } catch (e) { /* ignore */ } }, idle); };
    const evs = ['pointerdown', 'pointermove', 'keydown', 'wheel'];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true })); reset();
    return () => { clearTimeout(timer.current); evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, [idle]);
  const [slide, setSlide] = useState(0);
  useEffect(() => { if (phase !== 'attract') return undefined; const t = setInterval(() => setSlide((s) => s + 1), 5000); return () => clearInterval(t); }, [phase]);
  const start = () => { try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* ignore */ } setPhase('rooms'); track('kiosk_start', {}); };
  const k = settings.kiosk || {};
  if (phase === 'attract') {
    const ids = rooms.map((r) => r.id).filter((id) => thumbs[id]); const cur = ids.length ? thumbs[ids[slide % ids.length]] : null;
    return (
      <button type="button" className="vz-attract" onClick={start} dir={ar ? 'rtl' : 'ltr'}>
        {cur && <img key={slide} src={cur} alt="" className="vz-attract-img" />}
        <span className="vz-attract-in">
          <span className="vz-attract-brand">THE CLOSETS</span>
          <span className="vz-attract-t">{(ar ? k.attract_ar : k.attract_en) || T('kioskStart', ar)}</span>
          <span className="vz-attract-go">{T('kioskStart', ar)}</span>
        </span>
      </button>
    );
  }
  return (
    <div className="vz-kiosk-shell" dir={ar ? 'rtl' : 'ltr'}>
      <header className="vz-head vz-head-kiosk">
        <span className="vz-brand">THE CLOSETS</span><span className="vz-crumb">{T('brand', ar)}</span>
        <span className="vz-grow" />
        <button type="button" className="vz-lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'EN' : 'ع'}</button>
        <button type="button" className="vz-btn" onClick={() => { setPhase('attract'); setRoomId(null); setNonce((n) => n + 1); }}>{T('startOver', ar)}</button>
      </header>
      {phase === 'rooms' || !roomId ? (
        <div className="vz-page vz-kiosk-rooms">
          <h1>{T('pickRoom', ar)}</h1>
          <div className="vz-rooms vz-rooms-big">
            {rooms.map((r) => (
              <button key={r.id} type="button" className="vz-room vz-room-btn" onClick={() => { setRoomId(r.id); setPhase('design'); }}>
                <span className="vz-room-img">{thumbs[r.id] ? <img src={thumbs[r.id]} alt="" /> : <span className="vz-room-ph" />}</span>
                <span className="vz-room-b"><span className="vz-room-t">{r.icon} {r[ar ? 'ar' : 'en']}</span></span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Designer key={roomId + nonce} roomId={roomId} products={data.products} settings={settings} lang={lang} initial={{ room: roomId }} channel="kiosk" kiosk onBack={(id) => { if (id) setRoomId(id); else setPhase('rooms'); }} />
      )}
    </div>
  );
}

export { download };
