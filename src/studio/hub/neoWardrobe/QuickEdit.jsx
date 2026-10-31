/* =============================================================================
 * Neo Wardrobe Studio [NEO-CLOSETS-UX31] - the QUICK-EDIT floating menu.
 * Click (or right-click / long-press) any item in the 3D view or the elevation and a compact menu opens NEXT TO it with the actions that apply to THAT
 * kind of item (the table lives in quickEditLogic.js). The menu follows the item while the camera moves, stays inside the drawing box (so it never covers
 * the toolbar, the Open bar, the viewport tools or the selection card), closes on Esc / a click on empty space, and every control is a real button / field
 * with a visible name. It owns NO design state: each control calls onAction(id, value), the studio applies it through the model setters (one undo step).
 * Anchor: the 3D view reports the selected item's screen box (Kitchen3D onAnchor -> sinkRef); in the elevation the item's SVG element is measured.
 * ===========================================================================*/
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import './quickEdit.css';
import { Seg } from '../neoKitchen/ui';
import { Ic } from '../neoKitchen/icons';
import '../neoKitchen/wsIcons'; // adds the up / lock icons to the shared map
import ParameterField from '../neoKitchen/ParameterField';
import { cmScale } from '../neoKitchen/fieldLogic';
import { FINISHES } from '../neoKitchen/constants';
import { Step } from './wardrobeParts';
import { placeMenu, QE_PLACE } from './quickEditLogic';

const AVOID_SEL = '.nk-zoom, .nk-maplegend, .nk-hnd'; // the drawing box's own controls the menu keeps clear of
const NARROW = 520; // a drawing box narrower than this gets the menu as a bottom sheet (phones)

/** the screen box (client px) of the selected item in the ELEVATION (an SVG): the part's rect, else the column's elements, else the highlighted one */
function elevationBox(host, sel) {
  if (!host || !sel) return null;
  const root = host.querySelector('.nk-draw'); if (!root) return null;
  const esc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"'));
  let els = [];
  if (sel.partId && !/^(rail|plinth):/.test(sel.partId)) els = [...root.querySelectorAll(`[data-part="${esc(sel.partId)}"]`)];
  if (!els.length) els = [...root.querySelectorAll(`[data-unit="${esc(sel.unitId)}"]`)];
  if (!els.length) els = [...root.querySelectorAll('.nk-cab.nk-sel')];
  if (!els.length) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  els.forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width && !r.height) return; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
  return x1 < x0 ? null : { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}

export default function QuickEdit({ lang, view, hostRef, sinkRef, sel, kindName, kindKey, ptype, dimsText, items, onAction, onClose, onReason, onUndo, onRedo, rtl }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const rootRef = useRef(null);
  const [anchor, setAnchor] = useState(null);       // client px box of the item (3D: pushed by Kitchen3D, elevation: measured)
  const [box, setBox] = useState({ x: 0, y: 0, W: 0, H: 0 }); // the drawing box inside the host (the menu never leaves it)
  const [size, setSize] = useState({ w: 300, h: 180 });
  const [more, setMore] = useState(false);
  const [, setAvoidSig] = useState('');          // the box's own controls (zoom, handles) can appear / move without the item moving: re-place when they do

  /* the drawing box: the 3D wrap or the elevation wrap, in the host's own coordinates */
  const measureBox = useCallback(() => {
    const host = hostRef.current; if (!host) return;
    const wrap = host.querySelector('.nk-3dwrap, .nk-draw'); if (!wrap) return;
    const h = host.getBoundingClientRect(); const w = wrap.getBoundingClientRect();
    setBox((b) => { const n = { x: Math.round(w.left - h.left), y: Math.round(w.top - h.top), W: Math.round(w.width), H: Math.round(w.height) }; return b.x === n.x && b.y === n.y && b.W === n.W && b.H === n.H ? b : n; });
  }, [hostRef]);

  /* 3D: Kitchen3D pushes the box after every rendered frame in which it moved */
  useEffect(() => {
    if (view !== '3d' || !sinkRef) return undefined;
    sinkRef.current = (r) => { setAnchor(r); measureBox(); };
    return () => { sinkRef.current = null; };
  }, [view, sinkRef, measureBox]);
  /* elevation: poll the selected SVG element every frame while the menu is open (cheap: one query + a rect compare), so zoom / pan / resize all follow */
  useEffect(() => {
    if (view !== 'design') return undefined;
    let raf = 0; let last = null;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const sig = [...(hostRef.current ? hostRef.current.querySelectorAll(AVOID_SEL) : [])].map((e) => { const q = e.getBoundingClientRect(); return `${Math.round(q.left)},${Math.round(q.top)}`; }).join('|');
      setAvoidSig(sig);
      const r = elevationBox(hostRef.current, sel);
      if ((r && last && r.x === last.x && r.y === last.y && r.w === last.w && r.h === last.h) || (!r && !last)) return;
      last = r; setAnchor(r); measureBox();
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [view, sel, hostRef, measureBox]);
  useEffect(() => {
    measureBox();
    const host = hostRef.current; if (!host || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measureBox); ro.observe(host); const wrap = host.querySelector('.nk-3dwrap, .nk-draw'); if (wrap) ro.observe(wrap);
    return () => ro.disconnect();
  }, [hostRef, measureBox, view]);
  const squeezed = useRef(false);                 // true while the menu is narrower than its natural width (beside the item, clear of a drag handle)
  const natW = useRef(0);                         // the natural (max-content) width, remembered while it is squeezed
  useLayoutEffect(() => {
    const el = rootRef.current; if (!el) return;
    const w = el.offsetWidth; const h = el.offsetHeight;
    if (!squeezed.current && w) natW.current = w;
    const nw = squeezed.current ? Math.max(w, natW.current) : w; // placement works with the natural width while the menu is squeezed
    if (w && h && (Math.abs(nw - size.w) > 1 || Math.abs(h - size.h) > 1)) setSize({ w: nw, h });
  });
  useEffect(() => { setMore(false); }, [kindKey]);
  /* Esc closes the menu from anywhere (the elevation's SVG is not focusable, so a click there leaves the focus on the page body), and Ctrl+Z / Ctrl+Y keep working after a
   * menu action re-rendered the focused button away (the studio's own handler only hears keys that start inside it; it calls preventDefault, so nothing runs twice) */
  useEffect(() => {
    const f = (e) => {
      if (e.defaultPrevented || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || ''))) return;
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey && onUndo) { e.preventDefault(); onUndo(); } else if ((k === 'y' || (k === 'z' && e.shiftKey)) && onRedo) { e.preventDefault(); onRedo(); }
      }
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [onClose, onUndo, onRedo]);

  /* place: the anchor into the drawing box's coordinates, then next to it (inline-end first), clamped */
  const host = hostRef.current; const hr = host ? host.getBoundingClientRect() : { left: 0, top: 0 };
  const a = anchor ? { x: anchor.x - hr.left - box.x, y: anchor.y - hr.top - box.y, w: anchor.w, h: anchor.h } : null;
  /* the drawing box's own controls (the elevation's zoom group, the map legend, the drag handles of the selected column) are kept clear when there is room */
  const avoid = host ? [...host.querySelectorAll(AVOID_SEL)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - hr.left - box.x - 6, y: r.top - hr.top - box.y - 6, w: r.width + 12, h: r.height + 12 }; }) : []; // +6 px all round: a handle is grabbed a little outside its drawn size
  const narrow = box.W > 0 && box.W < NARROW;
  const place = (sz) => placeMenu(a, sz, { W: box.W, H: box.H }, { rtl, avoid });
  const pos = box.W > 0
    ? (narrow ? { x: Math.max(QE_PLACE.pad, Math.round((box.W - size.w) / 2)), y: Math.max(QE_PLACE.pad, box.H - Math.min(size.h, Math.round(box.H * 0.55)) - QE_PLACE.pad), side: 'sheet' } : place({ w: Math.max(size.w, natW.current || 0) , h: size.h }))
    : { x: QE_PLACE.pad, y: QE_PLACE.pad, side: 'edge' };
  squeezed.current = !!pos.w && natW.current > 0 && pos.w < natW.current - 1;
  /* never taller than its drawing box (a small box scrolls the menu); a phone-width box keeps the top ~45% free so the item stays in view */
  const maxH = box.H > 0 ? Math.max(110, narrow ? Math.round(box.H * 0.55) : box.H - 2 * QE_PLACE.pad) : undefined;
  const style = { left: box.x + pos.x, top: box.y + pos.y, maxWidth: Math.max(220, Math.min(372, (box.W || 340) - 2 * QE_PLACE.pad)), maxHeight: maxH, ...(squeezed.current ? { width: pos.w } : null) };

  const close = () => { onClose(); const c = hostRef.current && hostRef.current.querySelector('canvas'); if (c) c.focus(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const act = (it, arg) => {
    if (it.disabled) { if (onReason && it.reason) onReason(ar ? it.reason.ar : it.reason.en); return undefined; }
    return onAction(it.id, arg);
  };
  const txt = (o) => (ar ? o.ar : o.en);

  const ctl = (it) => {
    const label = txt(it.label); const tip = it.disabled && it.reason ? `${label}: ${txt(it.reason)}` : txt(it.tip);
    if (it.ctl === 'btn' || it.ctl === 'tog') {
      return (
        <button key={it.id} type="button" className={`nkq-b${/^(delete|delRail|delTopBox|delShelf)$/.test(it.id) ? ' nkq-danger' : ''}`} data-act={it.id} data-testid={`qe-${it.id}`}
          aria-pressed={it.ctl === 'tog' ? !!it.pressed : undefined} aria-disabled={it.disabled ? 'true' : undefined} title={tip} aria-label={tip === txt(it.tip) ? label : `${label} - ${txt(it.reason)}`}
          onClick={() => act(it)}>
          <Ic n={it.icon} size={16} /><span className="nkq-bt">{label}</span>
        </button>
      );
    }
    if (it.ctl === 'seg') {
      return (
        <div key={it.id} className="nkq-row" data-act={it.id} data-testid={`qe-${it.id}`}>
          <span className="nkq-l">{label}</span>
          <Seg label={label} value={it.value == null ? '' : String(it.value)} onChange={(v) => act(it, v)} options={it.options.map(([v, o]) => [v, txt(o), it.disabled && it.reason ? txt(it.reason) : undefined, it.disabled])} />
        </div>
      );
    }
    if (it.ctl === 'step') {
      return (
        <div key={it.id} className="nkq-row" data-act={it.id} data-testid={`qe-${it.id}`} title={it.disabled && it.reason ? txt(it.reason) : undefined}>
          <span className="nkq-l">{label}</span>
          <Step value={it.value || 0} min={it.min} max={it.max} disabled={it.disabled} label={label} onChange={(v) => act(it, v)} />
          {it.disabled && it.reason && <span className="nkq-why">{txt(it.reason)}</span>}
        </div>
      );
    }
    if (it.ctl === 'num') {
      const isW = it.id === 'width'; const st = it.step || 10; const v = it.value;
      const nudge = (dir) => act(it, (v == null ? it.min : v) + dir * st);
      return (
        <div key={it.id} className="nkq-row nkq-num" data-act={it.id} data-testid={`qe-${it.id}`} title={it.disabled && it.reason ? txt(it.reason) : undefined}>
          <span className="nkq-l">{label}</span>
          <div className="nkq-numc">
            <button type="button" className="nkq-nb" aria-label={`${label} −`} title={`${label} − ${isW ? st / 10 : st}`} aria-disabled={it.disabled || v == null || v - st < it.min ? 'true' : undefined} onClick={() => { if (!(v == null || v - st < it.min)) nudge(-1); else act(it, it.min); }}>−</button>
            <ParameterField id={`nkq-${it.id}`} label={label} hideLabel value={v == null ? it.min : v} min={it.min} max={it.max} step={st} scale={isW ? cmScale('mm') : undefined} unit="mm" slider={false} compact hideRange lang={lang}
              disabled={it.disabled} onChange={(n) => act(it, Math.round(n))} testid={`qe-${it.id}-in`} />
            <button type="button" className="nkq-nb" aria-label={`${label} +`} title={`${label} + ${isW ? st / 10 : st}`} aria-disabled={it.disabled || (v != null && v + st > it.max) ? 'true' : undefined} onClick={() => { if (!(v != null && v + st > it.max)) nudge(1); }}>+</button>
          </div>
          {it.disabled && it.reason && <span className="nkq-why">{txt(it.reason)}</span>}
        </div>
      );
    }
    if (it.ctl === 'sw') {
      return (
        <div key={it.id} className="nkq-row nkq-sw" data-act={it.id} data-testid={`qe-${it.id}`}>
          <span className="nkq-l">{label}</span>
          <div className="nk-chips" role="group" aria-label={label}>
            {Object.entries(FINISHES).map(([k, f]) => (
              <button key={k} type="button" className="nk-chip nk-chip-sm" aria-pressed={it.value === k} data-finish={k} onClick={() => act(it, k)} title={f[lang]}>
                <span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  /* consecutive one-click buttons share a wrapping row; fields and segmented controls take a row each */
  const layout = (list) => {
    const out = []; let run = [];
    const flush = () => { if (run.length) { out.push(<div className="nkq-btns" key={`b${out.length}`} role="group" aria-label={L('Quick actions', 'إجراءات سريعة')}>{run}</div>); run = []; } };
    list.forEach((it) => { if (it.ctl === 'btn' || it.ctl === 'tog') run.push(ctl(it)); else { flush(); out.push(ctl(it)); } });
    flush(); return out;
  };
  const primary = items.filter((i) => i.group === 'primary'); const rest = items.filter((i) => i.group === 'more');
  const title = `${L('Quick edit', 'تعديل سريع')}: ${kindName}`;
  return (
    <div ref={rootRef} className="nkq" role="dialog" aria-label={title} data-testid="quick-edit" data-kind={kindKey} data-side={pos.side} style={style} onKeyDown={onKey} data-more={more ? '1' : '0'}>
      <div className="nkq-head">
        <span className={`nk-sw nk-pt nk-pt-${ptype}`} aria-hidden="true" />
        <div className="nkq-t"><b dir="auto" data-testid="qe-title">{kindName}</b><small dir="ltr" data-testid="qe-dims">{dimsText}</small></div>
        {rest.length > 0 && (
          <button type="button" className="nkq-ib" aria-expanded={more} aria-label={more ? L('Fewer actions', 'إجراءات أقل') : L('More actions', 'المزيد من الإجراءات')} title={more ? L('Fewer actions', 'إجراءات أقل') : L('More actions', 'المزيد من الإجراءات')} data-testid="qe-more" onClick={() => setMore(!more)}>
            <Ic n="more" size={18} />
          </button>
        )}
        <button type="button" className="nkq-ib" aria-label={L('Close quick edit (Esc)', 'إغلاق التعديل السريع (Esc)')} title={L('Close (Esc)', 'إغلاق (Esc)')} data-testid="qe-close" onClick={close}><Ic n="close" size={16} /></button>
      </div>
      <div className="nkq-body">{layout(primary)}</div>
      {more && rest.length > 0 && <div className="nkq-body nkq-moreb" data-testid="qe-more-body"><div className="nkq-sep" role="separator"><span>{L('More', 'المزيد')}</span></div>{layout(rest)}</div>}
    </div>
  );
}
