/* [NEO-CUTLIST-UX32] "Production -> Cutting List", the PRO workspace: a dense CAD-style table (fixed header, resizable / reorderable / hideable
 * columns saved per user, sorting, filters, grouping with subtotals, search, multi-selection, keyboard navigation, copy), pictures per row, a part
 * detail panel with the dimensioned drawing, the sheet layout and the labels. Everything is derived from the BOM rows (clParts.proRows); no quantity
 * or dimension is computed here. Shared by every Neo studio through CutListView. Tokens only; styles in cutListPro2.css. */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BOARD } from './constants';
import { normName } from './materials';
import { useDismiss } from './ui';
import ParameterField from './ParameterField';
import {
  COLUMNS, colById, visibleColumns, widthOf, setWidth, toggleColumn, moveColumn, moveColumnTo, cycleSort, applyFilters, applySort, groupRows, totals, filterOptions, filtersActive, clearFilters,
  defaultView, loadView, saveView, tableCSV, tableTSV, PIC_SIZES, GROUP_BY, MIN_W,
} from './clColumns';
import { isoPicSvg, edgeSketchSvg, grainArrowSvg, partDrawingSvg } from './clPics';
import { fmt } from './clParts';
import { planSheets } from './clSheet';
import { loadSheet } from './dxfPlan';
import { download, safeName } from './exporters';
import { useDocStore, docFor, openSettings } from './docStore';
import { printHtml } from './printDoc';
import { cutListHtml } from './docPrint';
import SheetsView from './SheetsView';
import LabelsPanel from './LabelsPanel';
import DocSettingsDialog from './DocSettingsDialog';
import { useOutput } from './OutputSettingsControl';
import { dimText } from './outputSettings';
import './cutListPro2.css';

const GROUP_LABEL = { none: ['No grouping', 'بلا تجميع'], material: ['By material', 'حسب المادة'], thickness: ['By thickness', 'حسب السماكة'], group: ['By cabinet / group', 'حسب الخزانة / المجموعة'], room: ['By run / room', 'حسب الصف / الغرفة'] };

/** a picture that is generated when it scrolls into view (the strings are cached, so a long list costs one per distinct part) */
function LazyPic({ row, scene, size, onOpen, label, eager }) {
  const ref = useRef(null);
  const [on, setOn] = useState(() => eager); // no IntersectionObserver (very old browsers, jsdom): only the first rows draw; the lightbox draws any picture on click
  useEffect(() => {
    if (on || !ref.current || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: '240px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [on]);
  const html = on ? isoPicSvg(row, { scene, size }) : '';
  return (
    <button type="button" ref={ref} className="nk-pro-pic" style={{ width: size, height: size }} aria-label={label} onClick={(e) => { e.stopPropagation(); onOpen(row); }} data-testid="row-pic" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function Pop({ label, icon, badge, children, align = 'start', testid }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrap);
  return (
    <div className="nk-pro-pop" ref={wrap}>
      <button type="button" className="nk-btn nk-pro-btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid={testid}>{icon}<span>{label}</span>{badge ? <b className="nk-pro-badge">{badge}</b> : null}</button>
      {open && <div className={`nk-pro-panel nk-pro-panel-${align}`} role="dialog" aria-label={label}>{children}</div>}
    </div>
  );
}

function Lightbox({ rows, idx, setIdx, scene, ar, L, tol, onClose, onPick, u, mm }) {
  const r = rows[idx]; const dlg = useRef(null);
  useEffect(() => { if (dlg.current) dlg.current.focus(); }, []);
  if (!r) return null;
  const go = (d) => setIdx((idx + d + rows.length) % rows.length);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(ar ? -1 : 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(ar ? 1 : -1); }
    else if (e.key === 'Tab' && dlg.current) { const b = [...dlg.current.querySelectorAll('button')]; if (!b.length) return; const f = b[0]; const l = b[b.length - 1]; if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); } else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); } }
  };
  return (
    <div className="nk-fm-scrim" dir={ar ? 'rtl' : 'ltr'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nk-fm-dlg nk-pro-lb" role="dialog" aria-modal="true" aria-label={r.name} tabIndex={-1} ref={dlg} onKeyDown={onKey} data-testid="pic-lightbox">
        <div className="nk-pro-lb-pic" dangerouslySetInnerHTML={{ __html: isoPicSvg(r, { scene, size: 360 }) }} />
        <div className="nk-pro-lb-info">
          <div className="nk-cl-eyebrow" dir="ltr">{r.pid} · {idx + 1}/{rows.length}</div>
          <h3 className="nk-fm-dt">{ar ? (r.nameAr || r.name) : r.name}</h3>
          <p className="nk-pro-lb-dim" dir="ltr">{mm(r.cut.L)} × {mm(r.cut.W)} × {mm(r.cut.T)} {u} <small>±{tol}</small></p>
          <p>{r.matName} · {L('Qty', 'العدد')} {r.qty}</p>
          <p className="nk-sub">{r.edgeText}</p>
        </div>
        <div className="nk-fm-da">
          <button type="button" className="nk-btn" onClick={() => go(ar ? 1 : -1)} aria-label={L('Previous part', 'القطعة السابقة')}>{ar ? '›' : '‹'}</button>
          <button type="button" className="nk-btn" onClick={() => go(ar ? -1 : 1)} aria-label={L('Next part', 'القطعة التالية')}>{ar ? '‹' : '›'}</button>
          {onPick && <button type="button" className="nk-btn" onClick={() => { onPick(r); onClose(); }} data-testid="pic-highlight">{L('Highlight in 3D', 'إبراز في 3D')}</button>}
          <button type="button" className="nk-btn nk-btn-primary" onClick={onClose}>{L('Close', 'إغلاق')}</button>
        </div>
      </div>
    </div>
  );
}

function PartDetail({ row, scene, ar, L, tol, mm, u, onPick, onClose, prev, next, text }) {
  const [zoom, setZoom] = useState(1);
  const dr = useMemo(() => partDrawingSvg(row, { scene, lang: ar ? 'ar' : 'en', tol }), [row, scene, ar, tol]);
  const box = useRef(null);
  useEffect(() => setZoom(1), [row.pid]);
  const onWheel = (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setZoom((z) => Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.2 : 1 / 1.2)))); };
  const kv = (k, v, mono) => (v === '' || v == null ? null : <div className="nk-pro-kv"><dt>{k}</dt><dd className={mono ? 'nk-mono' : ''} dir={mono ? 'ltr' : 'auto'}>{v}</dd></div>);
  return (
    <aside className="nk-pro-detail" aria-label={L('Part detail', 'تفاصيل القطعة')} data-testid="part-detail">
      <div className="nk-pro-dh">
        <div><div className="nk-cl-eyebrow" dir="ltr">{row.pid}</div><h3 className="nk-pro-dt">{ar ? (row.nameAr || row.name) : row.name}</h3></div>
        <div className="nk-pro-dnav">
          <button type="button" className="nk-btn" onClick={prev} aria-label={L('Previous part', 'القطعة السابقة')}>↑</button>
          <button type="button" className="nk-btn" onClick={next} aria-label={L('Next part', 'القطعة التالية')}>↓</button>
          <button type="button" className="nk-btn" onClick={onClose} aria-label={L('Close detail', 'إغلاق التفاصيل')}>×</button>
        </div>
      </div>
      <div className="nk-pro-draw" ref={box} onWheel={onWheel} data-zoom={zoom} data-testid="part-drawing">
        <div className="nk-pro-drawin" style={{ width: `${zoom * 100}%` }} dangerouslySetInnerHTML={{ __html: dr.svg.replace(/width="\d+" height="\d+"/, 'width="100%"') }} />
      </div>
      <div className="nk-pro-zoom" role="group" aria-label={L('Zoom', 'تكبير')}>
        <button type="button" className="nk-btn" onClick={() => setZoom((z) => Math.max(1, z / 1.4))} aria-label={L('Zoom out', 'تصغير')}>−</button>
        <button type="button" className="nk-btn" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button type="button" className="nk-btn" onClick={() => setZoom((z) => Math.min(6, z * 1.4))} aria-label={L('Zoom in', 'تكبير')}>+</button>
        {onPick && <button type="button" className="nk-btn" onClick={() => onPick(row)} data-testid="show-in-3d">{L('Show in drawing / 3D', 'عرض في الرسم / 3D')}</button>}
      </div>
      <dl className="nk-pro-kvs">
        {kv(L('Cabinet / group', 'الخزانة / المجموعة'), row.group)}
        {kv(L('Cut size L × W × T', 'مقاس القص ط × ع × س'), `${mm(row.cut.L)} × ${mm(row.cut.W)} × ${mm(row.cut.T)} ${u}  ±${tol}`, true)}
        {kv(L('Design size W / D / H', 'المقاس التصميمي'), `${mm(row.w)} / ${mm(row.d)} / ${mm(row.h)} ${u}`, true)}
        {kv(L('Material', 'المادة'), row.matName)}
        {kv(L('Grain', 'العرق'), row.grain && row.grain !== '-' ? `${row.grain} ${L('(do not rotate)', '(لا تُدوَّر)')}` : L('none - may rotate', 'بلا - يمكن تدويرها'))}
        {kv(L('Edge banding', 'شريط الحواف'), row.edgeText)}
        {kv(L('Drilling / machining', 'الثقب / التشغيل'), row.ops.map((o) => (ar ? o.ar : o.en)).join('; '))}
        {kv(L('Hardware', 'الاكسسوارات'), row.hw.map((o) => (ar ? o.ar : o.en)).join('; '))}
        {kv(L('Notes', 'ملاحظات'), row.note ? (ar ? (row.noteAr || text.noteAr(row.note)) : text.noteEn(row.note)) : '')}
        {kv(L('Qty · area', 'العدد · المساحة'), `${row.qty} · ${row.area.toFixed(3)} m²`, true)}
      </dl>
    </aside>
  );
}

export default function ProCutList({ bom, rows, hardware, model, scene, lang, unit, product, user, onPick, notify, text, title, onExportXlsx }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const [stored] = useOutput(); // [NEO-OUTPUT-UX34] sizes follow the Output setting (millimetres at standard are exactly what this table printed)
  const O = { ...stored, unit: unit === 'in' || unit === 'cm' || unit === 'mm' ? unit : stored.unit };
  const u = O.unit;
  const mm = (v) => (O.unit === 'mm' && O.precision === 'standard' ? fmt(v) : dimText(v, O));
  const store = useDocStore();
  const tol = store.opts.tolerance;
  const [view, setViewRaw] = useState(() => loadView(user));
  const setView = useCallback((fn) => setViewRaw((v) => { const n = typeof fn === 'function' ? fn(v) : fn; saveView(user, n); return n; }), [user]);
  const [tab, setTab] = useState('table');
  const [sel, setSel] = useState(() => new Set());
  const [focus, setFocus] = useState('');
  const [anchor, setAnchor] = useState('');
  const [lb, setLb] = useState(-1);
  const [detail, setDetail] = useState(true);
  const scroller = useRef(null);
  const ctx = useMemo(() => ({ ar, ...text }), [ar, text]);
  const cols = useMemo(() => visibleColumns(view), [view]);
  const opts = useMemo(() => filterOptions(rows), [rows]);
  const filtered = useMemo(() => applyFilters(rows, view, ctx), [rows, view, ctx]);
  const sorted = useMemo(() => applySort(filtered, view, ctx), [filtered, view, ctx]);
  const groups = useMemo(() => groupRows(sorted, view.group), [sorted, view.group]);
  const rowsByNo = useMemo(() => new Map(rows.map((r) => [r.no, r])), [rows]);
  const sheetCfg = useMemo(() => loadSheet(), [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => planSheets(bom, rowsByNo, sheetCfg), [bom, rowsByNo, sheetCfg]);
  const tot = useMemo(() => totals(sorted, plan.nest), [sorted, plan]);
  const picPx = PIC_SIZES[view.picSize];
  const byPid = useMemo(() => new Map(rows.map((r) => [r.pid, r])), [rows]);
  const cur = byPid.get(focus) || null;
  const flat = sorted;
  const flatIdx = useMemo(() => new Map(flat.map((r, i) => [r.pid, i])), [flat]);

  const select = (r, e) => {
    const pid = r.pid;
    if (e && e.shiftKey && anchor) {
      const a = flat.findIndex((x) => x.pid === anchor); const b = flat.findIndex((x) => x.pid === pid);
      if (a >= 0 && b >= 0) { const [lo, hi] = a < b ? [a, b] : [b, a]; setSel(new Set(flat.slice(lo, hi + 1).map((x) => x.pid))); setFocus(pid); return; }
    }
    if (e && (e.ctrlKey || e.metaKey)) { setSel((s) => { const n = new Set(s); if (n.has(pid)) n.delete(pid); else n.add(pid); return n; }); setAnchor(pid); setFocus(pid); return; }
    setSel(new Set([pid])); setAnchor(pid); setFocus(pid);
  };
  const moveFocus = (d, e) => {
    if (!flat.length) return;
    const i = Math.max(0, flat.findIndex((x) => x.pid === focus));
    const n = flat[Math.min(flat.length - 1, Math.max(0, i + d))];
    if (e && e.shiftKey) { if (!anchor) setAnchor(focus || n.pid); const a = flat.findIndex((x) => x.pid === (anchor || focus || n.pid)); const b = flat.indexOf(n); const [lo, hi] = a < b ? [a, b] : [b, a]; setSel(new Set(flat.slice(lo, hi + 1).map((x) => x.pid))); setFocus(n.pid); } else select(n);
    requestAnimationFrame(() => { const el = scroller.current && scroller.current.querySelector(`tr[data-pid="${n.pid}"]`); if (el) { if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); el.focus({ preventScroll: true }); } });
  };
  const copyRows = useCallback(async () => {
    const rs = sel.size ? flat.filter((r) => sel.has(r.pid)) : (cur ? [cur] : []);
    if (!rs.length) return;
    const t = tableTSV(rs, cols, ctx);
    try { await navigator.clipboard.writeText(t); notify && notify(L(`Copied ${rs.length} row(s).`, `تم نسخ ${rs.length} صف.`)); } catch (e) { notify && notify(L('Copy was blocked by the browser.', 'منع المتصفح النسخ.')); }
  }, [sel, flat, cur, cols, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const onKey = (e) => {
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1, e); } else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1, e); }
    else if (e.key === 'Home') { e.preventDefault(); moveFocus(-1e6, e); } else if (e.key === 'End') { e.preventDefault(); moveFocus(1e6, e); }
    else if (e.key === ' ' && cur) { e.preventDefault(); setSel((s) => { const n = new Set(s); if (n.has(cur.pid)) n.delete(cur.pid); else n.add(cur.pid); return n; }); }
    else if (e.key === 'Enter' && cur) { e.preventDefault(); setDetail(true); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); setSel(new Set(flat.map((r) => r.pid))); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); copyRows(); }
    else if (e.key === 'Escape') { setSel(new Set()); }
  };

  /* ---- column resize + reorder ---- */
  const drag = useRef(null);
  const startResize = (e, c) => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX; const w0 = widthOf(view, c); const dirSign = ar ? -1 : 1;
    const mv = (ev) => setView((v) => setWidth(v, c.id, w0 + (ev.clientX - x0) * dirSign));
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const resizeKey = (e, c) => {
    const step = e.shiftKey ? 32 : 8; const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); const grow = (k === 'ArrowRight') !== ar; setView((v) => setWidth(v, c.id, widthOf(v, c) + (grow ? step : -step))); }
  };
  const csv = () => { download(`${safeName(title)}-cutlist-view.csv`, tableCSV(flat, cols, ctx), 'text/csv'); notify && notify(L(`CSV exported (${flat.length} rows, ${cols.filter((c) => c.id !== 'pic').length} columns).`, `تم تصدير CSV (${flat.length} صف، ${cols.filter((c) => c.id !== 'pic').length} عمود).`)); };
  const printList = async () => {
    const doc = docFor(store, title);
    const html = cutListHtml({ rows: flat, cols, widths: view.widths, doc, lang, ar, scene, title, totals: tot, hardware, pic: view.pic, ...text });
    const r = await printHtml(html, { title: `${safeName(title)}-cutting-list` });
    if (r && !r.ok && notify) notify(L('The browser blocked printing. Allow pop-ups for this site and try again.', 'منع المتصفح الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع وأعد المحاولة.'));
  };

  const dirAttr = ar ? 'rtl' : 'ltr';
  const colSpan = cols.length;
  const totalW = cols.reduce((s, c) => s + widthOf(view, c), 0);
  const cell = (c, r) => {
    switch (c.id) {
      case 'pic': return <td key={c.id} className="nk-pro-c nk-pro-picc"><LazyPic row={r} eager={typeof IntersectionObserver === 'undefined' ? (flatIdx.get(r.pid) || 0) < 12 : false} scene={scene} size={picPx} onOpen={() => setLb(flat.findIndex((x) => x.pid === r.pid))} label={`${L('Picture of', 'صورة')} ${r.pid}`} /></td>;
      case 'pid': return <td key={c.id} className="nk-cl-start nk-pro-pid" dir="ltr">{r.pid}</td>;
      case 'no': return <td key={c.id} className="nk-cl-c nk-cl-mute">{String(r.no).padStart(2, '0')}</td>;
      case 'name': return <td key={c.id} className="nk-cl-start nk-pro-name"><div className="nk-cl-pname">{ar ? (r.nameAr || text.nameAr(r.name)) : r.name}</div>{view.group === 'none' && <div className="nk-cl-pcut" dir="auto">{ar ? text.nameAr(r.group) : r.group}</div>}</td>;
      case 'dims': return <td key={c.id} className="nk-cl-start nk-pro-dims" dir="ltr"><span>{mm(r.cut.L)} × {mm(r.cut.W)} × {mm(r.cut.T)}</span><small>±{tol}</small></td>;
      case 'w': return <td key={c.id}>{mm(r.w)}</td>;
      case 'd': return <td key={c.id}>{mm(r.d)}</td>;
      case 'h': return <td key={c.id}>{mm(r.h)}</td>;
      case 'thk': return <td key={c.id}>{mm(r.thk)}</td>;
      case 'qty': return <td key={c.id} className="nk-cl-qty">{r.qty}</td>;
      case 'material': { const e = model && model.matMap && model.matMap[normName(r.matName)]; return <td key={c.id} className="nk-cl-start"><span className="nk-cl-mat" dir="auto">{ar && r.matNameAr ? r.matNameAr : (BOARD[r.mat] && r.matName === BOARD[r.mat].en ? BOARD[r.mat][lang] : r.matName)}</span>{e ? <small className="nk-cl-inv" dir="ltr" title={e.name}>{e.sku || e.id}</small> : null}</td>; }
      case 'grain': return <td key={c.id} className="nk-cl-c">{r.grain && r.grain !== '-' ? <span className="nk-pro-grain" dangerouslySetInnerHTML={{ __html: `${grainArrowSvg(r.grain, { size: 14 })}<b>${r.grain}</b>` }} /> : <span className="nk-cl-mute">-</span>}</td>;
      case 'edges': return <td key={c.id} className="nk-cl-start"><div className="nk-pro-edges"><span className="nk-pro-sk" aria-hidden="true" dangerouslySetInnerHTML={{ __html: edgeSketchSvg(r, { w: 52, h: 32 }) }} /><span dir="ltr">{r.edgeText}</span></div></td>;
      case 'ops': return <td key={c.id} className="nk-cl-start">{r.ops.length ? <ul className="nk-pro-ul">{r.ops.map((o, i) => <li key={i}>{ar ? o.ar : o.en}</li>)}</ul> : <span className="nk-cl-mute">-</span>}</td>;
      case 'hw': return <td key={c.id} className="nk-cl-start">{r.hw.length ? <ul className="nk-pro-ul">{r.hw.map((o, i) => <li key={i}>{ar ? o.ar : o.en}</li>)}</ul> : <span className="nk-cl-mute">-</span>}</td>;
      case 'notes': return <td key={c.id} className="nk-cl-start nk-pro-notes">{r.note ? <div className="nk-cl-pnote" dir={dirAttr}>{ar ? (r.noteAr || text.noteAr(r.note)) : text.noteEn(r.note)}</div> : <span className="nk-cl-mute">-</span>}</td>;
      case 'rot': return <td key={c.id} className="nk-cl-c">{r.rot ? L('Yes', 'نعم') : L('No', 'لا')}</td>;
      case 'area': return <td key={c.id}>{r.area.toFixed(3)}</td>;
      case 'room': case 'group': return <td key={c.id} className="nk-cl-start">{c.text(r, ctx)}</td>;
      default: return <td key={c.id} className="nk-cl-start">{c.text(r, ctx)}</td>;
    }
  };
  const sumCell = (c, g, key) => (c.id === 'qty' ? <td key={key} className="nk-cl-qty">{g.pieces}</td> : c.id === 'area' ? <td key={key}>{g.area.toFixed(3)}</td> : <td key={key} />);
  const sortOf = (id) => view.sort.findIndex((s) => s.id === id);

  const body = [];
  groups.forEach((g, gi) => {
    if (view.group !== 'none') body.push(<tr key={`g${gi}`} className="nk-pro-grp"><th colSpan={colSpan} scope="colgroup"><span>{g.key}</span><small dir="ltr">{g.pieces} pcs · {g.area.toFixed(2)} m² · {g.edgeM.toFixed(1)} m</small></th></tr>);
    g.rows.forEach((r) => {
      const on = sel.has(r.pid);
      body.push(
        <tr key={r.key} data-pid={r.pid} aria-selected={on} data-focus={focus === r.pid ? '1' : '0'} tabIndex={focus === r.pid || (!focus && r === flat[0]) ? 0 : -1} className={on ? 'nk-pro-sel' : ''}
          // keyboard: Space/Enter/arrows are handled once by the scroll container's onKey (roving tabIndex) — do not add a row-level key handler
          onClick={(e) => select(r, e)} onDoubleClick={() => onPick && onPick(r)} onFocus={() => { if (focus !== r.pid && !sel.size) setFocus(r.pid); }}>
          {cols.map((c) => cell(c, r))}
        </tr>,
      );
    });
    if (view.group !== 'none') body.push(<tr key={`s${gi}`} className="nk-pro-sub">{cols.map((c, i) => (i === 0 ? <th key={c.id} scope="row" colSpan={1}>{L('Subtotal', 'المجموع الفرعي')}</th> : sumCell(c, g, c.id)))}</tr>);
  });

  const seg = (arr, val, on, label) => (
    <div className="nk-seg" role="group" aria-label={label}>{arr.map(([v, l]) => <button key={v} type="button" className="nk-seg-b" aria-pressed={val === v} onClick={() => on(v)}>{l}</button>)}</div>
  );
  const fcount = (view.filters.material.length ? 1 : 0) + (view.filters.group.length ? 1 : 0) + (view.filters.thk.length ? 1 : 0) + (view.filters.grain.length ? 1 : 0) + (view.filters.edge !== 'any' ? 1 : 0) + (view.filters.qtyMin !== '' ? 1 : 0);
  const chk = (key, items, labelOf) => (
    <fieldset className="nk-pro-fs"><legend>{{ material: L('Material', 'المادة'), group: L('Cabinet / group', 'الخزانة / المجموعة'), thk: L('Thickness', 'السماكة'), grain: L('Grain', 'العرق') }[key]}</legend>
      {items.map((it) => (
        <label key={it} className="nk-pro-chk"><input type="checkbox" checked={view.filters[key].includes(it)} onChange={(e) => setView((v) => ({ ...v, filters: { ...v.filters, [key]: e.target.checked ? [...v.filters[key], it] : v.filters[key].filter((x) => x !== it) } }))} /><span dir="auto">{labelOf ? labelOf(it) : it}</span></label>
      ))}
    </fieldset>
  );

  return (
    <div className="nk-pro" dir={dirAttr} data-testid="pro-cutlist">
      <div className="nk-pro-tabs">
        {/* [UI-STD6] the tablist holds only the tabs (axe aria-required-children); display: contents keeps the strip's layout */}
        <div className="nk-pro-tablist" role="tablist" aria-label={L('Cut list views', 'عروض قائمة القص')}>
          {[['table', L('Cut list', 'قائمة القص')], ['sheets', L('Sheet layout', 'توزيع الألواح')], ['labels', L('Labels', 'الملصقات')]].map(([k, lab]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className="nk-pro-tab" onClick={() => setTab(k)} data-tab={k}>{lab}</button>
          ))}
        </div>
        <span className="nk-pro-grow" />
        <button type="button" className="nk-btn nk-pro-btn" onClick={openSettings} data-testid="open-doc-settings">⚙ <span>{L('Document settings', 'إعدادات المستند')}</span></button>
      </div>

      {tab === 'table' && (
        <>
          <div className="nk-pro-bar" role="toolbar" aria-label={L('Table tools', 'أدوات الجدول')}>
            <input type="search" className="nk-inp nk-inp-wide nk-pro-search" value={view.search} dir="auto" placeholder={L('Search id, part, material, note…', 'بحث: رمز، قطعة، مادة، ملاحظة…')} aria-label={L('Search the cut list', 'بحث في قائمة القص')} onChange={(e) => setView((v) => ({ ...v, search: e.target.value }))} data-testid="cl-search" />
            <Pop label={L('Filters', 'تصفية')} badge={fcount || ''} testid="cl-filters">
              <div className="nk-pro-pbody">
                {chk('material', opts.material)}{chk('group', opts.group)}{chk('thk', opts.thk, (t) => `${t} mm`)}{chk('grain', opts.grain, (g) => (g === '-' ? L('none', 'بلا') : g))}
                <fieldset className="nk-pro-fs"><legend>{L('Edge banding', 'شريط الحواف')}</legend>{seg([['any', L('Any', 'أي')], ['with', L('Banded', 'مشطوب')], ['none', L('None', 'بلا')]], view.filters.edge, (v) => setView((x) => ({ ...x, filters: { ...x.filters, edge: v } })), L('Edge banding filter', 'تصفية الحواف'))}</fieldset>
                <ParameterField label={L('Minimum quantity', 'أقل عدد')} value={view.filters.qtyMin === '' ? 0 : +view.filters.qtyMin} min={0} max={999} step={1} unit="pcs" slider={false} compact lang={lang} onChange={(v) => setView((x) => ({ ...x, filters: { ...x.filters, qtyMin: v > 0 ? String(Math.round(v)) : '' } }))} />
                <button type="button" className="nk-btn" disabled={!filtersActive(view)} onClick={() => setView(clearFilters)}>{L('Clear filters', 'مسح التصفية')}</button>
              </div>
            </Pop>
            <label className="nk-pro-sel-l"><span className="nk-sr">{L('Group by', 'تجميع حسب')}</span>
              <select className="nk-select" value={view.group} onChange={(e) => setView((v) => ({ ...v, group: e.target.value }))} data-testid="cl-group">{GROUP_BY.map((g) => <option key={g} value={g}>{GROUP_LABEL[g][ar ? 1 : 0]}</option>)}</select>
            </label>
            <Pop label={L('Columns', 'الأعمدة')} testid="cl-columns" align="end">
              <div className="nk-pro-pbody">
                <label className="nk-pro-chk"><input type="checkbox" checked={view.pic} onChange={(e) => setView((v) => ({ ...v, pic: e.target.checked }))} data-testid="cl-pic-toggle" /><span>{L('Pictures', 'الصور')}</span></label>
                {view.pic && seg([['S', 'S'], ['M', 'M'], ['L', 'L']], view.picSize, (s) => setView((v) => ({ ...v, picSize: s })), L('Picture size', 'حجم الصورة'))}
                <ul className="nk-pro-cols">
                  {view.order.map((id) => { const c = colById(id); if (!c || c.id === 'pic') return null; return (
                    <li key={id}><label className="nk-pro-chk"><input type="checkbox" checked={!view.hidden.includes(id)} onChange={() => setView((v) => toggleColumn(v, id))} /><span>{ar ? c.ar : c.en}</span></label>
                      <span className="nk-pro-mv"><button type="button" className="nk-btn" aria-label={`${L('Move earlier', 'تقديم')} ${ar ? c.ar : c.en}`} onClick={() => setView((v) => moveColumn(v, id, -1))}>↑</button><button type="button" className="nk-btn" aria-label={`${L('Move later', 'تأخير')} ${ar ? c.ar : c.en}`} onClick={() => setView((v) => moveColumn(v, id, 1))}>↓</button></span></li>
                  ); })}
                </ul>
                <button type="button" className="nk-btn" onClick={() => setView(defaultView())} data-testid="cl-reset">{L('Reset columns and filters', 'إعادة الأعمدة والتصفية')}</button>
              </div>
            </Pop>
            <span className="nk-pro-grow" />
            <button type="button" className="nk-btn nk-pro-btn" onClick={copyRows} disabled={!flat.length} title={L('Copy selected rows (Ctrl+C)', 'نسخ الصفوف المحددة (Ctrl+C)')}>{L('Copy', 'نسخ')}</button>
            <button type="button" className="nk-btn nk-pro-btn" onClick={csv} disabled={!flat.length} data-testid="cl-csv-view">{L('CSV (view)', 'CSV (العرض)')}</button>
            <button type="button" className="nk-btn nk-pro-btn" onClick={() => onExportXlsx && onExportXlsx({ rows: flat, cols, view })} disabled={!flat.length || !onExportXlsx} title={!onExportXlsx ? L("Not available in this studio yet", "غير متاح في هذا الاستوديو بعد") : undefined} data-testid="cl-xlsx-view">{L('Excel (view)', 'Excel (العرض)')}</button>
            <button type="button" className="nk-btn nk-pro-btn" onClick={printList} disabled={!flat.length} data-testid="cl-print-doc">🖨 {L('Print cut list', 'طباعة قائمة القص')}</button>
          </div>

          <div className="nk-pro-main" data-detail={detail && cur ? '1' : '0'}>
            <div className="nk-cl-scroll nk-pro-scroll" ref={scroller} tabIndex={0} role="region" aria-label={L('Cutting list table', 'جدول قائمة القص')} onKeyDown={onKey}>
              <table className="nk-cl-table nk-pro-table" data-testid="cut-table" style={{ width: Math.max(totalW, 0) }}>
                <caption className="nk-sr">{L('Cut list', 'قائمة القص')}</caption>
                <colgroup>{cols.map((c) => <col key={c.id} style={{ width: widthOf(view, c) }} />)}</colgroup>
                <thead>
                  <tr>
                    {cols.map((c) => {
                      const si = sortOf(c.id); const s = si >= 0 ? view.sort[si] : null;
                      return (
                        <th key={c.id} scope="col" className={c.align === 's' ? 'nk-cl-start' : c.align === 'c' ? 'nk-cl-c' : ''} aria-sort={s ? (s.dir === 'asc' ? 'ascending' : 'descending') : c.sort ? 'none' : undefined}
                          draggable={c.id !== 'pic'} onDragStart={(e) => { drag.current = c.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', c.id); } catch (er) { /* ignore */ } }}
                          onDragOver={(e) => { if (drag.current && drag.current !== c.id) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); if (drag.current && drag.current !== c.id) setView((v) => moveColumnTo(v, drag.current, c.id)); drag.current = null; }}>
                          {c.sort ? <button type="button" className="nk-pro-th" onClick={(e) => setView((v) => cycleSort(v, c.id, e.shiftKey))} title={L('Sort (Shift = second key)', 'ترتيب (Shift = مفتاح ثانٍ)')}>{ar ? c.ar : c.en}{c.id === 'w' || c.id === 'd' || c.id === 'h' || c.id === 'thk' ? <i> {u}</i> : null}{s ? <span className="nk-pro-sort" aria-hidden="true">{s.dir === 'asc' ? '▲' : '▼'}{view.sort.length > 1 ? si + 1 : ''}</span> : null}</button> : <span className="nk-pro-th">{ar ? c.ar : c.en}</span>}
                          {c.id !== 'pic' && <span className="nk-pro-rs" role="separator" aria-orientation="vertical" aria-label={`${L('Resize', 'تغيير عرض')} ${ar ? c.ar : c.en}`} aria-valuenow={widthOf(view, c)} aria-valuemin={MIN_W} tabIndex={0} onPointerDown={(e) => startResize(e, c)} onKeyDown={(e) => resizeKey(e, c)} onDoubleClick={() => setView((v) => { const w = { ...v.widths }; delete w[c.id]; return { ...v, widths: w }; })} />}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>{body.length ? body : <tr><td colSpan={colSpan} className="nk-cl-start nk-pro-none" data-testid="cl-no-match">{L('No part matches the search and filters.', 'لا توجد قطعة تطابق البحث والتصفية.')}</td></tr>}</tbody>
                <tfoot>
                  <tr>{cols.map((c, i) => (i === 0 ? <th key={c.id} scope="row" className="nk-cl-start">{L('Total', 'الإجمالي')}{filtersActive(view) ? ` (${L('shown', 'المعروض')})` : ''}</th> : c.id === 'qty' ? <td key={c.id} className="nk-cl-qty">{tot.pieces}</td> : c.id === 'area' ? <td key={c.id}>{tot.area.toFixed(2)}</td> : <td key={c.id} />))}</tr>
                </tfoot>
              </table>
            </div>
            {detail && cur && (
              <PartDetail row={cur} text={text} scene={scene} ar={ar} L={L} tol={tol} mm={mm} u={u} onPick={onPick} onClose={() => setDetail(false)}
                prev={() => moveFocus(-1)} next={() => moveFocus(1)} />
            )}
          </div>

          <div className="nk-pro-totals" role="group" aria-label={L('Totals', 'الإجماليات')} data-testid="pro-totals">
            {[[L('Pieces', 'قطع'), tot.pieces], ['m²', tot.area.toFixed(2)], [L('Edge m', 'حواف م'), tot.edgeM.toFixed(1)], [L('Boards', 'ألواح'), tot.boards || '-'], [L('Waste', 'هدر'), tot.waste == null ? '-' : `${tot.waste.toFixed(1)}%`], [L('Selected', 'المحدد'), sel.size]].map(([k, v]) => (
              <div key={k} className="nk-pro-tot"><span>{k}</span><b dir="ltr">{v}</b></div>
            ))}
            <span className="nk-pro-hint">{L('Arrows move · Space selects · Ctrl+C copies · Ctrl+wheel zooms the drawing', 'الأسهم للتنقل · المسافة للتحديد · Ctrl+C للنسخ · Ctrl+عجلة لتكبير الرسم')}</span>
          </div>
        </>
      )}

      {tab === 'sheets' && <SheetsView bom={bom} rows={rows} rowsByNo={rowsByNo} scene={scene} lang={lang} title={title} sel={sel} onSelect={(pid) => { const r = byPid.get(pid); if (r) select(r); }} notify={notify} />}
      {tab === 'labels' && <LabelsPanel user={user} rows={sorted.length ? sorted : rows} allRows={rows} sel={sel} bom={bom} rowsByNo={rowsByNo} scene={scene} lang={lang} title={title} text={text} notify={notify} />}

      <DocSettingsDialog lang={lang} />
      {lb >= 0 && <Lightbox rows={flat} idx={lb} setIdx={setLb} scene={scene} ar={ar} L={L} tol={tol} u={u} mm={mm} onClose={() => setLb(-1)} onPick={onPick} />}
    </div>
  );
}
