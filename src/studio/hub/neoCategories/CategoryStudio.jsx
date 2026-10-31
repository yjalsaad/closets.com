/* =============================================================================
 * Neo category studio [NEO-CATEGORIES-UX26] - ONE generic studio for Neo Bathroom / Laundry / TV / Office, written as a config-driven copy of the
 * pattern the Neo Wardrobe Studio uses: the category's design is expressed as a Neo Kitchen model (categoryModel.buildCategory), so the kitchen
 * components run unchanged - floating toolbar (Design | 3D View | Cut List | X-Ray | Explode | Open | Daylight | Look), Elevation (dimensions,
 * internal, map, legend), Kitchen3D (orbit / pan / zoom, Hold camera, X-Ray, Explode, animated Open, Look presets), CutListView, FileMenu,
 * ExportMenu (PDF, Excel, OBJ, STL, 3DM beta, DXF cutting plan), LookPresets, LookBlock, ProductionMaterials and the Haneen assistant window.
 *
 * It is CONTROLLED: NeoCategoryApp owns the design (and its autosave); every parameter change goes through commit() -> onApply() as one undo step
 * (coalesced per control), so the 3D view, the elevation, the cut list, the price and the exports are rebuilt from the one design.
 * Parameters rail: Global | M&S | Units | <the category's own tabs> | Hardware | Price.
 * ===========================================================================*/
import { wsShowFactory } from '../wsFlags'; // [WEB-STUDIO]
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../neoKitchen/neoKitchen.css';
import './categoryStudio.css';
import { Seg, Toggle, NumField, useDismiss } from '../neoKitchen/ui';
import { Ic, Tool } from '../neoKitchen/icons';
import LookBlock from '../neoKitchen/LookBlock';
import ProductionMaterials from '../neoKitchen/ProductionMaterials';
import OpenControl from '../neoKitchen/OpenControl';
import { loadWsPrefs, saveWsPrefs, frontIds, groupIdsOfPart, toggleIds, clampSpeed, SPEED } from '../neoKitchen/workspace3d';
import { clampFloatRect, defaultFloatRect, cleanFloatRect } from '../neoKitchen/floatRect';
import { useMedia } from '../neoKitchen/useMedia';
import QuoteLauncher from '../neoQuote/QuoteLauncher'; // [NEO-QUOTE-UX33] shared Quote builder
import { categoryCtx } from '../neoQuote/contexts';
import { useEdgeFade } from '../neoKitchen/useEdgeFade';
import VtMenu from '../neoKitchen/VtMenu';
import { VIEW_ORDER } from '../neoKitchen/cameraViews';
import Elevation from '../neoKitchen/Elevation';
import Kitchen3D from '../neoKitchen/Kitchen3D';
import LookPresets from '../neoKitchen/LookPresets';
import { loadLook, saveLook, lookTitle, lookOf, clampSun } from '../neoKitchen/lookProfiles';
import CutListView from '../neoKitchen/CutListView';
import ExportMenu from '../neoKitchen/ExportMenu';
import OutputSettings, { useOutput } from '../neoKitchen/OutputSettingsControl';
import { attachOutput, applyOutputFromText } from '../neoKitchen/outputSettings';
import FileMenu from '../neoKitchen/FileMenu';
import { PART_TYPES, FINISHES, HANDLES, HANDLE_LENS } from '../neoKitchen/constants';
import { buildDXF } from '../neoKitchen/dxf';
import { bomCSV, download, safeName } from '../neoKitchen/exporters';
import { MAX_IMPORT_BYTES } from '../neoKitchen/fileMenuLogic';
import '../neoKitchen/workspace.css';
import CategoryAssistant from './CategoryAssistant';
import { useHandlesPref } from '../neoHandles/HandleLayer';
import { categoryHandles } from '../neoHandles/categoryHandles';
import { createHandleDispatch } from '../neoHandles/handleModel';
import {
  buildCategory, normalizeDesign, selectionInfo, openIdsFor, designIdOf, designJSON, parseDesign, designKey, defaultDesign, blankDesign, presetDesign,
  typeOf, urange, setUnitWidth, setTotalWidth, addUnit, removeUnit, moveUnit, duplicateUnit, totalWidth, widthRange, normSpec,
} from './categoryModel';
import { money } from './categoryPrice';
import { usePublishDesignMeta, notifyExplicitSave } from '../neoLeads/leadContext';

const ALL_LAYERS = { base: true, wall: true, top: true, counter: true, plinth: true, doors: true, hardware: true };
const LAYERS = [['base', 'Base units', 'الوحدات السفلية'], ['wall', 'Upper units', 'الوحدات العلوية'], ['doors', 'Doors', 'الأبواب'], ['counter', 'Top', 'السطح'], ['plinth', 'Plinth / legs', 'القاعدة / الأرجل'], ['hardware', 'Hardware', 'الاكسسوار']];
const selDims = (d) => `${d.map((v) => Math.round(v * 10) / 10).join(' × ')} mm`;
const POS_LBL = { auto: ['Auto', 'تلقائي'], top: ['Top', 'أعلى'], center: ['Centre', 'وسط'], bottom: ['Bottom', 'أسفل'] };

function Step({ value, min, max, onChange, label, disabled = false }) {
  return (
    <span className="nkc-step" role="group" aria-label={label}>
      <button type="button" className="nk-ib" aria-label={`${label} −`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>−</button>
      <output dir="ltr" aria-live="polite">{value}</output>
      <button type="button" className="nk-ib" aria-label={`${label} +`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}
const Card = ({ title, children, note, testid }) => (
  <section className="nk-card nkc-card" data-testid={testid}>
    <div className="nk-card-head"><b className="nk-card-title">{title}</b></div>
    <div className="nkc-card-body">{children}</div>
    {note ? <p className="nk-sub nkc-note">{note}</p> : null}
  </section>
);
const Row = ({ label, children, off, why }) => (<div className="nkc-row" data-off={off ? '1' : '0'} aria-disabled={off ? 'true' : undefined}><span className="nkc-row-l">{label}</span><div className="nkc-row-c">{children}</div>{off && why ? <p className="nkc-why">{why}</p> : null}</div>);

/** one control drawn from a spec (num -> the shared ParameterField through NumField, step, seg, tog); a disabled control says why on screen */
function SpecRow({ sp, value, ctx, lang, onChange }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const off = sp.when ? !sp.when(ctx) : false;
  const label = ar ? sp.ar : sp.en;
  const why = off && sp.why ? sp.why[ar ? 1 : 0] : '';
  let ctl = null;
  if (sp.t === 'num') ctl = <NumField value={value} min={sp.min} max={sp.max} step={sp.step || 1} unit={sp.unit || 'mm'} onChange={(v) => { onChange(v); }} label={label} lang={lang} disabled={off} />;
  else if (sp.t === 'step') ctl = <Step value={value} min={sp.min} max={sp.max} disabled={off} label={label} onChange={onChange} />;
  else if (sp.t === 'seg') ctl = <Seg label={label} value={value} onChange={onChange} options={sp.opts.map((o) => [o[0], o[ar ? 2 : 1], off ? why : undefined, off])} />;
  else ctl = <Toggle on={value} onChange={(v) => { if (!off) onChange(v); }} label={label} />;
  return (
    <Row label={label} off={off} why={why}>
      {ctl}
      {sp.quick ? <div className="nk-chips" role="group" aria-label={`${label} presets`}>{sp.quick.map(([v, en, a]) => <button key={v} type="button" className="nk-chip nk-chip-sm" aria-pressed={value === v} disabled={off} onClick={() => onChange(v)} data-testid={`quick-${sp.k}-${v}`}>{ar ? a : en} <span dir="ltr">{v}</span></button>)}</div> : null}
      {sp.help ? <p className="nkc-help">{sp.help[ar ? 1 : 0]}</p> : null}
    </Row>
  );
  void L;
}

/** units drawn to scale: base units low, tall units full height, wall-only units high; click (or Enter / Space) selects */
function UnitStrip({ units, placed, sel, onSelect, total, lang, label }) {
  const H = 1000; const W = Math.max(1, total);
  let x = 0;
  return (
    <div className="nkc-strip" data-testid="unit-strip">
      <svg className="nkc-strip-svg" viewBox={`${-20} ${-20} ${W + 40} ${H + 60}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={label}>
        {units.map((u, i) => {
          const pl = placed[i]; const x0 = x; x += u.w;
          const tall = pl && pl.base && pl.base.type === 'tall'; const hasBase = pl && pl.base; const hasWall = pl && pl.wall;
          const yb = tall ? 0 : hasBase ? 400 : 0; const hb = tall ? H : 600;
          const on = sel === i;
          return (
            <g key={u.id} className="nkc-strip-u" data-on={on ? '1' : '0'} role="button" tabIndex={0} aria-pressed={on} aria-label={`${i + 1}: ${lang === 'ar' ? '' : ''}${u.w} mm`}
              onClick={() => onSelect(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }}>
 {!hasBase && !hasWall && (<><rect className="nkc-su-box" x={x0 + 8} y={380} width={u.w - 16} height={90} rx={10} /><line className="nkc-su-leg" x1={x0 + 40} y1={470} x2={x0 + 40} y2={H} /><line className="nkc-su-leg" x1={x0 + u.w - 40} y1={470} x2={x0 + u.w - 40} y2={H} /></>)}
              {hasBase && <rect className="nkc-su-box" x={x0 + 8} y={yb} width={u.w - 16} height={hb} rx={10} />}
              {hasWall && <rect className="nkc-su-wall" x={x0 + 8} y={tall ? 0 : 0} width={u.w - 16} height={hasBase ? 330 : 520} rx={10} />}
              <text x={x0 + u.w / 2} y={H + 50} textAnchor="middle" style={{ fontSize: Math.round(W / 34) }}>{`${i + 1}`}</text>
              <text x={x0 + u.w / 2} y={(tall ? H / 2 : hasBase ? 720 : 280)} textAnchor="middle" style={{ fontSize: Math.round(W / 26) }}>{u.w}</text>
            </g>
          );
        })}
      </svg>
      <div className="nkc-strip-total" dir="ltr">{total} mm</div>
    </div>
  );
}

export default function CategoryStudio({ cfg, design, rules, onApply, onSendToQuote, toast, startLang = 'en', currentUser = null, savedAt = '', saveState = 'saved', restored = false, onKeepRestored }) {
  const [lang, setLang] = useState(startLang === 'ar' ? 'ar' : 'en');
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] units + precision (shared setting)
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const narrow = useMedia('(max-width: 640px)');
  const dock = useMedia('(min-width: 1280px)');
  const drawer = useMedia('(max-width: 1023px)');
  const railRef = useRef(null);
  const [view, setView] = useState('design');
  const [tab, setTab] = useState('units');
  const [panelOpen, setPanelOpen] = useState(() => !(typeof window !== 'undefined' && window.innerWidth < 1024));
  const [layers, setLayers] = useState(ALL_LAYERS);
  const [xray, setXray] = useState(false);
  const [explode, setExplode] = useState({ on: false, mode: 'assembly', amt: 1, diagram: true });
  const [openBar, setOpenBar] = useState(false);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [dimsOn, setDims] = useState(true);
  const [internal, setInternal] = useState(false);
  const [mapOn, setMap] = useState(false);
  const [center, setCenter] = useState(false);
  const [isolate, setIsolate] = useState(null);
  const [grid, setGrid] = useState(true);
  const [guides, setGuides] = useState(true);
  const [camCmd, setCamCmd] = useState(null);
  const [lk, setLk] = useState(() => loadLook());
  const [menu, setMenu] = useState(null);
  const [sel, setSel] = useState(null);
  const [uSel, setUSel] = useState(0);        // the selected unit index in the Units tab (null = none)
  const [keepW, setKeepW] = useState(true);   // "Keep the total width"
  const [handlesOn, setHandlesOn] = useHandlesPref(); // [NEO-HANDLES-UX36] the SMART HANDLES on the drawing (remembered)
  const [runView, setRunView] = useState('main'); // elevation tab (a desk with returns has MAIN / LEFT / RIGHT)
  const [warnOpen, setWarnOpen] = useState(false);
  const wsPrefs = useRef(null); if (!wsPrefs.current) wsPrefs.current = loadWsPrefs();
  const [asstOpen, setAsstOpen] = useState(() => wsPrefs.current.asst === true && !(typeof window !== 'undefined' && window.innerWidth <= 640));
  const [hold, setHold] = useState(!!wsPrefs.current.hold);
  const [openSpeed, setOpenSpeed] = useState(() => clampSpeed(wsPrefs.current.speed === undefined ? SPEED.def : wsPrefs.current.speed));
  const [openScope, setOpenScope] = useState(wsPrefs.current.scope || 'all');
  const poseRef = useRef(null);
  const [asstMode, setAsstMode] = useState(wsPrefs.current.asstMode || 'float');
  const [asstRect, setAsstRect] = useState(() => cleanFloatRect(wsPrefs.current.asstRect));
  const [body, setBody] = useState({ w: 0, h: 0 });
  const bodyRef = useRef(null);
  const [asstSeed, setAsstSeed] = useState(null);
  const [exportsLog, setExportsLog] = useState([]);
  const [status, setStatus] = useState('');
  const [printing, setPrinting] = useState(false);
  const [tight, setTight] = useState(false);
  const stageRef = useRef(null);
  const [, tick] = useState(0);
  const menuRef = useRef(null);
  const statusT = useRef(null);
  const designRef = useRef(design); designRef.current = design;
  const hist = useRef({ past: [], future: [], key: null, at: 0 });
  const savedKey = useRef(designKey(cfg, design));
  useDismiss(!!menu, () => setMenu(null), menuRef);
  useEffect(() => () => clearTimeout(statusT.current), []);
  useEffect(() => { saveWsPrefs({ asst: asstOpen }); }, [asstOpen]);
  useEffect(() => { saveWsPrefs({ hold, speed: openSpeed, scope: openScope }); }, [hold, openSpeed, openScope]);
  useEffect(() => {
    const el = bodyRef.current; if (!el) return undefined;
    const read = () => setBody((b) => (b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth, h: el.clientHeight }));
    read(); if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read); ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = stageRef.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setTight(el.clientWidth < 880));
    ro.observe(el); setTight(el.clientWidth < 880);
    return () => ro.disconnect();
  }, []);

  const notify = useCallback((m) => {
    setStatus(m); clearTimeout(statusT.current); statusT.current = setTimeout(() => setStatus(''), 4500);
    if (typeof toast === 'function') { try { toast(m); } catch (e) { /* ignore */ } }
  }, [toast]);

  /* ---------- the one build ---------- */
  const dkey = designKey(cfg, design);
  const W = useMemo(() => buildCategory(cfg, design, { rules }), [dkey, rules, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const { scene, model, bom, hardware, warnings, price, d } = W;
  usePublishDesignMeta(cfg.menuId, { price: price.total, currency: price.currency }); // [NEO-LEADS-UX37]
  const x = d.x; const p = d.p; const units = d.units;
  const asstDocked = dock && asstMode === 'dock';
  const floatRect = useMemo(() => clampFloatRect(asstRect || defaultFloatRect(body.w, body.h, ar), body.w, body.h), [asstRect, body.w, body.h, ar]);
  const info = useMemo(() => selectionInfo(scene, bom, sel), [scene, bom, sel]);
  const placedIdx = (unitId) => units.findIndex((u) => u.id === designIdOf(unitId));
  useEffect(() => { if (sel && !(scene.runs.some((r) => r.units.some((u) => u.unit.id === sel.unitId)))) setSel(null); }, [scene, sel]);
  useEffect(() => { if (!sel) return; const i = placedIdx(sel.unitId); if (i >= 0) setUSel(i); }, [sel, scene]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (uSel != null && uSel >= units.length) setUSel(units.length ? units.length - 1 : null); }, [units.length, uSel]);

  /* ---------- history ---------- */
  const commit = useCallback((next, key) => {
    const h = hist.current; const now = Date.now();
    if (!(key && h.key === key && (now - h.at < 900 || String(key).startsWith('hdl:')))) h.past = [...h.past, designRef.current].slice(-100);
    h.future = []; h.key = key || null; h.at = now; tick((n) => n + 1);
    designRef.current = next; onApply(next);
  }, [onApply]);
  const undo = useCallback(() => { const h = hist.current; if (!h.past.length) return; const prev = h.past[h.past.length - 1]; h.past = h.past.slice(0, -1); h.future = [designRef.current, ...h.future]; h.key = null; tick((n) => n + 1); designRef.current = prev; onApply(prev); }, [onApply]);
  const redo = useCallback(() => { const h = hist.current; if (!h.future.length) return; const nx = h.future[0]; h.future = h.future.slice(1); h.past = [...h.past, designRef.current]; h.key = null; tick((n) => n + 1); designRef.current = nx; onApply(nx); }, [onApply]);
  const canUndo = hist.current.past.length > 0; const canRedo = hist.current.future.length > 0;
  const onKeyDown = (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (e.key === 'Escape' && !menu && openBar) { setOpenBar(false); return; }
    if ((e.key === 'l' || e.key === 'L') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && view === '3d') { e.preventDefault(); setHold((h) => !h); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) { const k = e.key.toLowerCase(); if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); } }
  };

  /* ---------- edits ---------- */
  const d0 = () => normalizeDesign(cfg, designRef.current);
  const setP = (patch, key) => commit({ ...d0(), p: { ...d0().p, ...patch } }, key || `p:${Object.keys(patch).join()}`);
  const setX = (patch, key) => commit({ ...d0(), x: { ...d0().x, ...patch } }, key || `x:${Object.keys(patch).join()}`);
  const setUnits = (u, key) => commit({ ...d0(), units: u }, key);
  const setUnitOpt = (i, patch, key) => setUnits(d0().units.map((u, j) => (j === i ? { ...u, ...patch } : u)), key || `uo:${i}:${Object.keys(patch).join()}`);
  const pickUnit = (i) => { setUSel(i); const pl = W.placed[i]; const id = pl && (pl.ids.base || pl.ids.wall); if (id) setSel({ unitId: id, partId: null, label: id }); };
  const setUnitW = (i, v) => { const r = setUnitWidth(cfg, d0().units, i, v, keepW, d0().p); if (!r) { notify(L('That does not fit the other units.', 'لا يتسع ذلك مع باقي الوحدات.')); return; } setUnits(r.units, `uw:${i}`); };
  const setTotalW = (v) => { const u = setTotalWidth(cfg, d0().units, v, d0().p); if (!u) { notify(L('That total does not fit these units.', 'هذا الإجمالي لا يناسب هذه الوحدات.')); return; } setUnits(u, 'tw'); };
  const doAdd = (type) => { const before = d0().units; const u = addUnit(cfg, before, type, keepW, d0().p); setUnits(u, `add:${Date.now()}`); setUSel(Math.max(0, u.findIndex((q) => !before.some((o) => o.id === q.id)))); };
  const doRemove = (i) => { const r = removeUnit(cfg, d0().units, i, keepW, d0().p); if (!r) { notify(L('A design needs at least one unit.', 'يحتاج التصميم وحدة واحدة على الأقل.')); return; } setUnits(r, `rm:${Date.now()}`); setUSel(null); setSel(null); };
  const onDrag = useCallback((ev) => {
    if (ev.kind !== 'width') return;
    const dd = d0(); const i = dd.units.findIndex((u) => u.id === designIdOf(ev.unitId)); if (i < 0) return;
    const r = setUnitWidth(cfg, dd.units, i, Math.round(ev.value), false, dd.p); if (r) commit({ ...dd, units: r.units }, `drag:w:${i}`);
  }, [commit, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- ui commands (toolbar + assistant) ---------- */
  const toggleExplode = () => { setExplode((e) => ({ ...e, on: !e.on })); if (!explode.on) setView('3d'); };
  const openEverything = (on) => { setOpenBar(on); setOpenIds(on ? new Set(frontIds(scene)) : new Set()); };
  const toggleOpen = () => { openEverything(!openBar); if (view === 'cut') setView('3d'); };
  const onToggleFront = useCallback((partId) => setOpenIds((s0) => toggleIds(s0, groupIdsOfPart(scene, partId))), [scene]);
  const daylight = lk.look === 'daylight';
  const setLook = (look) => { const n = { ...lk, look: lookOf(look) }; setLk(n); saveLook(n.look, n.sun); };
  const setSun = (sun) => { const n = { ...lk, sun: clampSun(sun) }; setLk(n); saveLook(n.look, n.sun); };
  const toggleDaylight = () => { setLook(daylight ? 'standard' : 'daylight'); if (!daylight) setView('3d'); };
  const uiCmd = useCallback((c) => {
    if (c.action === 'view') setView(c.value);
    else if (c.action === 'xray') setXray(!!c.value);
    else if (c.action === 'explode') { setExplode((e) => ({ ...e, on: !!c.value })); if (c.value) setView('3d'); }
    else if (c.action === 'open') { openEverything(!!c.value); if (c.value) setView((v) => (v === 'cut' ? '3d' : v)); }
    else if (c.action === 'daylight') { const n = { ...lk, look: c.value ? 'daylight' : 'standard' }; setLk(n); saveLook(n.look, n.sun); if (c.value) setView('3d'); }
  }, [lk, scene]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleOpenSel = () => {
    const ids = openIdsFor(scene, info); if (!ids.length) return;
    setOpenIds((s) => { const n = new Set(s); const on = ids.some((i) => n.has(i)); ids.forEach((i) => (on ? n.delete(i) : n.add(i))); return n; });
  };
  const setCam = (name) => { setCamCmd({ n: Date.now(), name }); setMenu(null); };

  /* ---------- file + export ---------- */
  const logExport = (name) => setExportsLog((l) => [...l, `${name} ${new Date().toLocaleTimeString()}`]);
  const dirty = designKey(cfg, design) !== savedKey.current;
  const doExport = useCallback((kind) => {
    setMenu(null);
    const base = safeName(d.title || cfg.file);
    if (kind === 'json') { download(`${base}.json`, attachOutput(designJSON(cfg, designRef.current)), 'application/json'); logExport('JSON'); savedKey.current = designKey(cfg, designRef.current); tick((n) => n + 1); notify(L(`${cfg.noun[0]} saved as JSON.`, `تم حفظ ${cfg.noun[1]} JSON.`)); }
    else if (kind === 'dxf') { download(`${base}.dxf`, buildDXF(scene, bom, output), 'application/dxf'); logExport('DXF'); notify(L('DXF (R12) exported.', 'تم تصدير DXF (R12).')); }
    else if (kind === 'csv') { download(`${base}-cutlist.csv`, bomCSV(bom, model.matMap, output), 'text/csv'); logExport('CSV'); notify(L('Cut list CSV exported.', 'تم تصدير قائمة القص CSV.')); }
    else if (kind === 'print') setPrinting(true);
  }, [scene, bom, model, d.title, ar, output]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => { try { window.print(); } catch (e) { /* ignore */ } if (!window.matchMedia || !('onafterprint' in window)) setTimeout(done, 400); }, 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printing]);
  const loadDesign = useCallback((dd, msg) => { commit(dd, `load:${Date.now()}`); savedKey.current = designKey(cfg, dd); setSel(null); setUSel(0); notify(msg); }, [commit, notify, cfg]);
  const importFile = useCallback((file) => {
    if (file && file.size > MAX_IMPORT_BYTES) { notify(L('Import failed: the file is too large. Your design was not changed.', 'فشل الاستيراد: الملف كبير جدًا. لم يتغير تصميمك.')); return; }
    const rd = new FileReader();
    rd.onload = () => { try { loadDesign(parseDesign(cfg, String(rd.result)), L('Design loaded.', 'تم تحميل التصميم.')); applyOutputFromText(String(rd.result)); } catch (e) { notify(L(`Import failed: ${e.message}. Your design was not changed.`, `فشل الاستيراد: ${e.message}. لم يتغير تصميمك.`)); } };
    rd.onerror = () => notify(L('Could not read the file. Your design was not changed.', 'تعذرت قراءة الملف. لم يتغير تصميمك.'));
    rd.readAsText(file);
  }, [loadDesign, ar, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- derived view bits ---------- */
  /* [NEO-HANDLES-UX36] the shared handle layer: units + the category parameters the drawing shows, committed through the studio's own commit (one undo step per drag) */
  const hdlSeq = useRef({ n: 0 });
  const onHandle = useMemo(() => createHandleDispatch((next, key) => commit(next, key), hdlSeq.current), [commit]);
  const handleList = useMemo(() => categoryHandles({ cfg, design: d, built: W, keepW, selected: sel, layers }), [cfg, d, W, keepW, sel, layers]);
  const ui = { handles: handlesOn, layers, xray, explode, openDoors: false, openIds, openSpeed, hold, dims: dimsOn, internal, map: mapOn, center, wall: true, isolate, lighting: 'neutral', grid, guides, look: lk.look, sun: lk.sun, props: true };
  const legend = cfg.legend.keys.map((k) => PART_TYPES.find((t) => t.k === k)).filter(Boolean).map((t) => ({ ...t, en: cfg.legend.names && cfg.legend.names[t.k] ? cfg.legend.names[t.k][0] : t.en, ar: cfg.legend.names && cfg.legend.names[t.k] ? cfg.legend.names[t.k][1] : t.ar }));
  const TIP = {
    design: L('2D elevation with live dimensions', 'واجهة ثنائية الأبعاد بأبعاد حية'), '3d': L('Interactive 3D model - orbit, pan and zoom', 'نموذج ثلاثي الأبعاد تفاعلي - دوران وتحريك وتكبير'), cut: L('Cut list, hardware', 'قائمة القص والاكسسوار'),
    xray: L('See through the panels: hinge cups, shelf pins', 'رؤية عبر الألواح: كوبات المفصلات ومسامير الرفوف'), explode: L('Pull the units apart to see every part', 'فصل الوحدات لرؤية كل قطعة'),
    open: L('Open or close all doors and drawers', 'فتح أو إغلاق كل الأبواب والأدراج'), daylight: L('Sunny room with a wood floor', 'غرفة مشمسة بأرضية خشبية'), look: L('Look presets, finish and floor grid', 'أنماط المظهر والتشطيب وشبكة الأرضية'),
  };
  const lookMenu = menu === 'look' && (
    <div className="nk-menu nk-menu-look" role="dialog" aria-label={L('Look', 'المظهر')}>
      <LookPresets lang={lang} look={lk.look} sun={lk.sun} onLook={setLook} onSun={setSun} />
      <div className="nk-menu-h">{L('Board finish', 'تشطيب الألواح')}</div>
      <div className="nk-chips">{Object.entries(FINISHES).map(([k, f]) => <button key={k} type="button" className="nk-chip" aria-pressed={x.finishKey === k} onClick={() => setX({ finishKey: k }, 'finishKey')}><span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}</button>)}</div>
      <label className="nk-menu-chk"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> {L('Floor grid', 'شبكة الأرضية')}</label>
    </div>
  );
  const MODES = [['design', 'design', L('Design', 'تصميم')], ['3d', 'view3d', L('3D View', 'ثلاثي')], ['cut', 'cut', L('Cut List', 'قائمة القص')]].filter((m) => m[0] !== 'cut' || wsShowFactory()); // [WEB-STUDIO]

  /* the Parameters rail: Global | M&S | Units | the category's tabs | Hardware | Price */
  const TABS = [['global', 'global', 'Global', 'عام'], ['ms', 'ms', 'M&S', 'المواد'], ['units', 'base', 'Units', 'الوحدات'], ...cfg.tabs.map((t) => [t.id, t.icon, t.en, t.ar]), ['hardware', 'hardware', 'Hardware', 'الاكسسوار'], ['price', 'counter', 'Price', 'السعر']];
  const onRailKey = (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t[0] === tab);
    const fwd = e.key === 'ArrowDown' || e.key === (ar ? 'ArrowLeft' : 'ArrowRight');
    const nx = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (fwd ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[nx][0]); const el = e.currentTarget.querySelector(`[data-tab="${TABS[nx][0]}"]`); if (el) el.focus();
  };
  useEdgeFade(railRef, tab);
  const toolbar = (
    <div className="nk-ftb" role="toolbar" aria-label={L('Tools', 'الأدوات')} data-narrow={narrow ? '1' : '0'}>
      <div className="nk-tg" role="group" aria-label={L('View mode', 'نمط العرض')}>
        {MODES.map(([v, ic, lbl]) => <Tool key={v} icon={ic} label={lbl} tip={TIP[v]} pressed={view === v} className={view === v ? 'nk-tool-active' : ''} iconOnly={narrow && view !== v} onClick={() => setView(v)} />)}
      </div>
      {!narrow && (
        <>
          <span className="nk-tsep" aria-hidden="true" />
          <div className="nk-tg" role="group" aria-label={L('Visualisation', 'العرض المرئي')}>
            <Tool icon="xray" label={L('X-Ray', 'أشعة')} tip={TIP.xray} pressed={xray} iconOnly={tight} onClick={() => setXray(!xray)} />
            <Tool icon="explode" label={L('Explode', 'تفكيك')} tip={TIP.explode} pressed={explode.on} iconOnly={tight} onClick={toggleExplode} />
          </div>
          <span className="nk-tsep" aria-hidden="true" />
          <div className="nk-tg" role="group" aria-label={cfg.noun[ar ? 1 : 0]}>
            <Tool icon="open" label={L('Open', 'فتح')} tip={TIP.open} pressed={openBar} iconOnly={tight} onClick={toggleOpen} data-testid="tool-open" />
            <Tool icon="sun" label={L('Daylight', 'ضوء النهار')} tip={TIP.daylight} pressed={daylight} iconOnly={tight} onClick={toggleDaylight} data-testid="daylight" />
            <div className="nk-menuwrap" ref={menu === 'look' ? menuRef : null}>
              <Tool icon="look" label={lk.look === 'standard' || daylight ? L('Look', 'المظهر') : lookTitle(lk.look, lang)} tip={TIP.look} iconOnly={tight} expanded={menu === 'look'} onClick={() => setMenu(menu === 'look' ? null : 'look')} />
              {lookMenu}
            </div>
          </div>
        </>
      )}
      {narrow && (
        <>
          <span className="nk-tsep" aria-hidden="true" />
          <div className="nk-menuwrap" ref={menu === 'tools' || menu === 'look' ? menuRef : null}>
            <Tool icon="more" iconOnly label={L('More tools', 'أدوات أخرى')} tip={L('X-Ray, Explode, Open, Daylight, Look', 'أشعة، تفكيك، فتح، ضوء النهار، مظهر')} expanded={menu === 'tools' || menu === 'look'} onClick={() => setMenu(menu === 'tools' ? null : 'tools')} />
            {menu === 'tools' && (
              <div className="nk-menu nk-menu-r nk-menu-tools" role="menu">
                <button type="button" role="menuitemcheckbox" aria-checked={xray} className="nk-mi nk-mi-ic" onClick={() => setXray(!xray)}><Ic n="xray" />{L('X-Ray', 'أشعة')}</button>
                <button type="button" role="menuitemcheckbox" aria-checked={explode.on} className="nk-mi nk-mi-ic" onClick={toggleExplode}><Ic n="explode" />{L('Explode', 'تفكيك')}</button>
                <button type="button" role="menuitemcheckbox" aria-checked={openBar} className="nk-mi nk-mi-ic" onClick={toggleOpen}><Ic n="open" />{L('Open', 'فتح')}</button>
                <button type="button" role="menuitemcheckbox" aria-checked={daylight} className="nk-mi nk-mi-ic" onClick={toggleDaylight}><Ic n="sun" />{L('Daylight', 'ضوء النهار')}</button>
                <button type="button" role="menuitem" className="nk-mi nk-mi-ic" onClick={() => setMenu('look')}><Ic n="look" />{L('Look', 'المظهر')}</button>
              </div>
            )}
            {lookMenu}
          </div>
        </>
      )}
    </div>
  );
  const VIEW_LABEL = { front: L('Front', 'أمامي'), rear: L('Rear', 'خلفي'), left: L('Left', 'يسار'), right: L('Right', 'يمين'), top: L('Top', 'علوي'), iso: L('Isometric', 'أيزومتري') };
  const vtools = view !== 'cut' && (
    <div className="nk-vtools" role="toolbar" aria-label={L('Viewport tools', 'أدوات العرض')}>
      {view === '3d' && (
        <>
          <div className="nk-menuwrap" ref={menu === 'views' ? menuRef : null}>
            <Tool nativeTip icon="views" text={L('Views', 'الزوايا')} label={L('Camera views', 'زوايا الكاميرا')} tip={L('Front, rear, left, right, top and isometric', 'أمامي وخلفي ويسار ويمين وعلوي وأيزومتري')} expanded={menu === 'views'} onClick={() => setMenu(menu === 'views' ? null : 'views')} />
            {menu === 'views' && (
              <VtMenu anchorRef={menuRef} rtl={ar} className="nk-menu nk-menu-side" role="menu" aria-label={L('Camera views', 'زوايا الكاميرا')}>
                {VIEW_ORDER.map((k) => <button key={k} type="button" role="menuitem" className="nk-mi" data-view={k} onClick={() => setCam(k)}>{VIEW_LABEL[k]}</button>)}
              </VtMenu>
            )}
          </div>
          <Tool nativeTip icon="fit" text={L('Fit', 'ملاءمة')} label={L('Fit to screen', 'ملاءمة الشاشة')} tip={L('Fit everything in view (F, or double-click)', 'إظهار كل شيء (F أو نقرتان)')} onClick={() => setCam('fit')} />
          <Tool nativeTip icon="reset" text={L('Reset', 'إعادة')} label={L('Reset camera', 'إعادة الكاميرا')} tip={L('Back to the opening angle (0)', 'العودة للزاوية الأولى (0)')} onClick={() => setCam('reset')} />
          <Tool nativeTip icon={hold ? 'lock' : 'unlock'} text={hold ? L('Held', 'مثبتة') : L('Hold', 'تثبيت')} label={L('Hold camera', 'تثبيت الكاميرا')} pressed={hold} data-testid="tool-hold"
            tip={hold ? L('Camera held: no auto re-fit and no accidental orbit - you can still pick parts (L to release)', 'الكاميرا مثبتة: لا ملاءمة تلقائية ولا دوران عرضي - يمكنك اختيار القطع (L للإلغاء)') : L('Hold the camera exactly where it is (L)', 'تثبيت الكاميرا في مكانها بالضبط (L)')} onClick={() => setHold(!hold)} />
          <Tool nativeTip icon="grid" text={L('Grid', 'الشبكة')} label={L('Floor grid', 'شبكة الأرضية')} tip={L('Show or hide the floor grid', 'إظهار أو إخفاء شبكة الأرضية')} pressed={grid} onClick={() => setGrid(!grid)} />
          <Tool nativeTip icon="guides" text={L('Guides', 'القياس')} label={L('Measurement guides', 'خطوط القياس')} tip={L('Overall width, height and depth lines', 'خطوط العرض والارتفاع والعمق الكلية')} pressed={guides} onClick={() => setGuides(!guides)} />
        </>
      )}
      <div className="nk-menuwrap" ref={menu === 'layers' ? menuRef : null}>
        <Tool nativeTip icon="layers" text={L('Layers', 'الطبقات')} label={L('Layers', 'الطبقات')} tip={L('Show or hide base units, upper units, doors, top, plinth, hardware', 'إظهار أو إخفاء الوحدات السفلية والعلوية والأبواب والسطح والقاعدة والاكسسوار')} expanded={menu === 'layers'} onClick={() => setMenu(menu === 'layers' ? null : 'layers')}>
          {Object.values(layers).some((v) => !v) && <i className="nk-tool-dot" aria-hidden="true" />}
        </Tool>
        {menu === 'layers' && (
          <VtMenu anchorRef={menuRef} rtl={ar} className="nk-menu nk-menu-side nk-menu-layers" role="dialog" aria-label={L('Layers', 'الطبقات')}>
            <div className="nk-layers" role="group" aria-label={L('Layers', 'الطبقات')}>
              {LAYERS.map(([k, en, a]) => (
                <button key={k} type="button" className="nk-layer" aria-pressed={layers[k]} data-hidden={layers[k] ? '0' : '1'} onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}>
                  <span className="nk-layer-i"><Ic n={layers[k] ? 'eye' : 'eyeOff'} size={16} /></span><span className="nk-layer-t">{ar ? a : en}</span>
                </button>
              ))}
            </div>
          </VtMenu>
        )}
      </div>
    </div>
  );

  /* ---------- Parameters ---------- */
  const ctxFor = (u) => ({ p, x, d, u });
  const specCard = (card, i) => (
    <Card key={`${card.en}${i}`} title={ar ? card.ar : card.en} note={card.note ? card.note[ar ? 1 : 0] : null} testid={`card-${i}`}>
      {card.keys.map((k) => { const sp = cfg.params.find((s) => s.k === k); return sp ? <SpecRow key={k} sp={sp} value={p[k]} ctx={ctxFor(null)} lang={lang} onChange={(v) => setP({ [k]: normSpec(sp, v) }, `p:${k}`)} /> : null; })}
    </Card>
  );
  const [wLo, wHi] = widthRange(cfg, units, p);
  const total = totalWidth(units);
  const footprint = { w: Math.round(scene.bounds.x1 - scene.bounds.x0), d: Math.round(scene.bounds.z1 - scene.bounds.z0), h: Math.round(scene.bounds.h) };
  const finishPicker = (
    <div className="nk-chips">{Object.entries(FINISHES).map(([k, f]) => <button key={k} type="button" className="nk-chip" aria-pressed={x.finishKey === k} onClick={() => setX({ finishKey: k }, 'finishKey')}><span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}</button>)}</div>
  );
  const msP = {
    model: { ...model, paint: x.paint, mats: x.mats, matMap: x.matMap }, lang, scene, bom, notify, currentUser, saveState: 'saved', unit: output.unit, downloadFile: download,
    commit: (m, key) => setX({ paint: m.paint || {}, mats: m.mats || {}, matMap: m.matMap || {} }, key),
    partMapLabel: [`${cfg.noun[0]} part map`, `خريطة أجزاء ${cfg.noun[1]}`], hideGroups: cfg.hideGroups || [], slotRows: cfg.slotRows,
  };
  const selU = uSel != null ? units[uSel] : null;
  const selT = selU ? typeOf(cfg, selU) : null;
  const unitsCard = (
    <Card title={L('Units on the wall', 'الوحدات على الحائط')} note={L('Tap a unit in the drawing — or a part in the 3D view — to edit it here. Drag the handle on a unit\'s right edge to change its width.', 'اضغط وحدة في الرسم — أو جزءًا في العرض ثلاثي الأبعاد — لتعديلها هنا. اسحب المقبض على حافة الوحدة اليمنى لتغيير عرضها.')} testid="units-card">
      <UnitStrip units={units} placed={W.placed} sel={uSel} onSelect={pickUnit} total={total} lang={lang} label={L('Units', 'الوحدات')} />
      <label className="nk-chk nkc-keep"><input type="checkbox" checked={keepW} onChange={(e) => setKeepW(e.target.checked)} data-testid="keep-width" /> <b>{L('Keep the total width', 'الحفاظ على العرض الكلي')}</b></label>
      <p className="nk-sub nkc-note">{keepW ? L(`The run stays ${total} mm; the other units share a change.`, `يبقى الصف ${total} مم؛ تتقاسم الوحدات الأخرى التغيير.`) : L('The total follows the units.', 'الإجمالي يتبع الوحدات.')}</p>
      <div className="nkc-cols" role="group" aria-label={L('Units', 'الوحدات')}>
        {units.map((u, i) => (<button key={u.id} type="button" className="nk-chip nk-chip-sm" aria-pressed={uSel === i} onClick={() => pickUnit(i)} data-testid={`unit-chip-${i}`}><b>{cfg.unitTypes[u.type].tag}{i + 1}</b> <span dir="ltr">{u.w}</span></button>))}
      </div>
      {selU && (
        <div className="nkc-detail" data-testid="unit-detail">
          <b className="nkc-detail-t">{`${i1(uSel)} · ${ar ? selT.ar : selT.en}`}</b>
          <Row label={`${L('Width', 'العرض')} (${urange(cfg, selU, p).min}-${urange(cfg, selU, p).max})`} off={urange(cfg, selU, p).min === urange(cfg, selU, p).max} why={L('This unit is sized by the machine / TV settings (Global tab and category tabs).', 'مقاس هذه الوحدة يحدده إعداد الجهاز / التلفاز (من تبويبات المعاملات).')}>
            <NumField value={selU.w} min={urange(cfg, selU, p).min} max={urange(cfg, selU, p).max} step={10} disabled={urange(cfg, selU, p).min === urange(cfg, selU, p).max} onChange={(v) => setUnitW(uSel, v)} label={L('Unit width (mm)', 'عرض الوحدة (مم)')} lang={lang} />
          </Row>
          {(selT.opts || []).map((o) => <SpecRow key={o.k} sp={o} value={selU[o.k]} ctx={ctxFor(selU)} lang={lang} onChange={(v) => setUnitOpt(uSel, { [o.k]: normSpec(o, v) })} />)}
          <div className="nkc-detail-act">
            <button type="button" className="nk-btn" disabled={uSel === 0} onClick={() => { setUnits(moveUnit(units, uSel, -1), `mv:${Date.now()}`); setUSel(uSel - 1); }} data-testid="unit-left">{ar ? '→' : '←'} {L('Move', 'نقل')}</button>
            <button type="button" className="nk-btn" disabled={uSel === units.length - 1} onClick={() => { setUnits(moveUnit(units, uSel, 1), `mv:${Date.now()}`); setUSel(uSel + 1); }} data-testid="unit-right">{L('Move', 'نقل')} {ar ? '←' : '→'}</button>
            <button type="button" className="nk-btn" onClick={() => { setUnits(duplicateUnit(cfg, units, uSel), `dup:${Date.now()}`); setUSel(uSel + 1); }} data-testid="unit-dup">{L('Duplicate', 'نسخ')}</button>
            <button type="button" className="nk-btn" disabled={units.length < 2} onClick={() => doRemove(uSel)} data-testid="unit-del">{L('Remove', 'حذف')}</button>
          </div>
        </div>
      )}
      <div className="nkc-stats">
        <div className="nkc-stat"><span>{L('Total width (mm)', 'العرض الكلي (مم)')}</span>
          <NumField value={total} min={wLo} max={wHi} step={10} slider={false} compact onChange={(v) => setTotalW(Math.round(v))} label={L('Total width (mm)', 'العرض الكلي (مم)')} lang={lang} /></div>
        <div className="nkc-stat"><span>{L('Overall height', 'الارتفاع الكلي')}</span><b dir="ltr">{footprint.h} mm</b></div>
        <div className="nkc-stat"><span>{L('Pieces', 'القطع')}</span><b data-testid="pieces-tile">{bom.pieces}</b></div>
      </div>
      <div className="nkc-cols" role="group" aria-label={L('Add a unit', 'إضافة وحدة')}>
        {Object.entries(cfg.unitTypes).map(([k, t]) => (<button key={k} type="button" className="nk-btn nkc-add" onClick={() => doAdd(k)} data-testid={`add-${k}`}>+ {ar ? t.ar : t.en}</button>))}
      </div>
    </Card>
  );
  const presetsCard = (
    <Card title={L('Start from a preset', 'ابدأ من نموذج جاهز')} note={L('A preset replaces the units and the category settings. Undo brings the previous design back.', 'النموذج يستبدل الوحدات وإعدادات الفئة. التراجع يعيد التصميم السابق.')} testid="presets-card">
      <div className="nkc-presets" role="group" aria-label={L('Presets', 'النماذج الجاهزة')}>
        {cfg.presets.map((pr, i) => (<button key={pr.id} type="button" className="nk-chip" onClick={() => { commit({ ...presetDesign(cfg, i), title: d.title, x: { ...presetDesign(cfg, i).x, ...d.x } }, `preset:${Date.now()}`); setUSel(0); setSel(null); }} data-testid={`preset-${pr.id}`}>{ar ? pr.ar : pr.en}</button>))}
      </div>
    </Card>
  );
  const panelBody = () => {
    switch (tab) {
      case 'global': return (
        <>
          <Card title={L('Overall size', 'الأبعاد الكلية')} note={L('Width re-splits the units (their options are kept unit by unit).', 'تغيير العرض يعيد تقسيم الوحدات (تبقى خيارات كل وحدة).')}>
            <Row label={L('Total width', 'العرض الكلي')}><NumField value={total} min={wLo} max={wHi} step={10} onChange={(v) => setTotalW(Math.round(v))} label={L('Total width (mm)', 'العرض الكلي (مم)')} lang={lang} /></Row>
            <div className="nkc-stat" data-testid="footprint"><span>{L('Footprint (W × D) and height', 'المساحة (ع × ع) والارتفاع')}</span><b dir="ltr">{footprint.w} × {footprint.d} × {footprint.h} mm</b></div>
          </Card>
          {(cfg.globalCards || []).map(specCard)}
          <Card title={L('Look · daylight', 'المظهر · ضوء النهار')} note={L('The 3D view only: it never changes sizes, the cut list or the price.', 'العرض ثلاثي الأبعاد فقط: لا يغيّر المقاسات أو قائمة القص أو السعر.')}>
            <LookPresets lang={lang} look={lk.look} sun={lk.sun} onLook={setLook} onSun={setSun} />
            <Row label={L('Daylight', 'ضوء النهار')}><Toggle on={daylight} onChange={toggleDaylight} label={L('Daylight', 'ضوء النهار')} /></Row>
            <label className="nk-chk"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> {L('Floor grid', 'شبكة الأرضية')}</label>
          </Card>
          <OutputSettings lang={lang} variant="card" testid="global-output" />
        </>
      );
      case 'ms': return (
        <>
          <Card title={L('Finish', 'التشطيب')} note={L('The board finish is the 3D grain and colour of the doors and boards.', 'تشطيب الألواح هو عرق ولون الأبواب والألواح في العرض ثلاثي الأبعاد.')}>{finishPicker}</Card>
          {(cfg.msCards || []).map(specCard)}
          <Card title={L('Boards', 'الألواح')}>
            <Row label={L('Carcass board', 'لوح الهيكل')}><NumField value={x.board} min={10} max={30} step={0.5} onChange={(v) => setX({ board: v }, 'board')} label={L('Carcass board (mm)', 'لوح الهيكل (مم)')} lang={lang} /></Row>
            <Row label={L('Back board', 'لوح الظهر')}><NumField value={x.back} min={3} max={20} step={0.5} onChange={(v) => setX({ back: v }, 'back')} label={L('Back board (mm)', 'لوح الظهر (مم)')} lang={lang} /></Row>
            <Row label={L('Shelf board', 'لوح الرف')}><NumField value={x.shelfThk} min={6} max={50} step={0.5} onChange={(v) => setX({ shelfThk: v }, 'shelfThk')} label={L('Shelf board (mm)', 'لوح الرف (مم)')} lang={lang} /></Row>
          </Card>
          <Card title={L('Doors and drawers', 'الأبواب والأدراج')}>
            <Row label={L('Door board', 'لوح الباب')}><NumField value={x.doorThk} min={12} max={40} step={0.5} onChange={(v) => setX({ doorThk: v }, 'doorThk')} label={L('Door board (mm)', 'لوح الباب (مم)')} lang={lang} /></Row>
            <Row label={L('Door gap', 'فراغ الباب')}><NumField value={x.doorGap} min={0} max={10} step={0.5} onChange={(v) => setX({ doorGap: v }, 'doorGap')} label={L('Door gap (mm)', 'فراغ الباب (مم)')} lang={lang} /></Row>
            <Row label={L('Gap between drawer fronts', 'الفراغ بين واجهات الأدراج')}><NumField value={x.drawerGap} min={0} max={10} step={0.5} onChange={(v) => setX({ drawerGap: v }, 'drawerGap')} label={L('Drawer gap (mm)', 'فراغ الدرج (مم)')} lang={lang} /></Row>
            <Row label={L('Runner clearance', 'خلوص السكة')}><NumField value={x.drawerSide} min={0} max={30} step={0.5} onChange={(v) => setX({ drawerSide: v }, 'drawerSide')} label={L('Runner clearance (mm)', 'خلوص السكة (مم)')} lang={lang} /></Row>
          </Card>
          <div className="nkc-shared" data-testid="ms-shared"><LookBlock P={msP} /><ProductionMaterials P={msP} /></div>
        </>
      );
      case 'units': return (<>{presetsCard}{unitsCard}</>);
      case 'hardware': return (
        <>
          <Card title={L('Handles', 'المقابض')}>
            <div className="nk-chips" role="group" aria-label={L('Handle style', 'نوع المقبض')}>{Object.entries(HANDLES).map(([k, h]) => <button key={k} type="button" className="nk-chip" aria-pressed={x.handle.style === k} onClick={() => setX({ handle: { ...x.handle, style: k } }, 'handle')}>{h[lang]}</button>)}</div>
            {x.handle.style === 'bar' && <Row label={L('Length', 'الطول')}><div className="nk-chips">{HANDLE_LENS.map((n) => <button key={n} type="button" className="nk-chip nk-chip-sm" aria-pressed={x.handle.len === n} onClick={() => setX({ handle: { ...x.handle, len: n } }, 'handle')}><span dir="ltr">{n}</span></button>)}</div></Row>}
            <Row label={L('Position', 'الموضع')}><Seg label={L('Handle position', 'موضع المقبض')} value={x.handle.pos} onChange={(v) => setX({ handle: { ...x.handle, pos: v } }, 'handle')} options={Object.keys(POS_LBL).map((k) => [k, POS_LBL[k][ar ? 1 : 0]])} /></Row>
          </Card>
          <Card title={L('Hardware list', 'قائمة الاكسسوارات')} testid="hardware-list">
            <table className="nk-table nk-table-sm"><tbody>{hardware.map((h) => <tr key={h.k}><td className="nk-td-name">{h[lang]}</td><td className="nk-mono nk-qty">{h.qty}</td></tr>)}</tbody></table>
          </Card>
        </>
      );
      case 'price': return (
        <Card title={L('Price', 'السعر')} testid="price-card" note={L('Placeholder rates: the owner has not supplied a price list for this category yet. Quantities are exact (the cut list and the hardware list); every rate is in the category config and is replaced in one place.', 'أسعار مؤقتة: لم يزوّد المالك قائمة أسعار لهذه الفئة بعد. الكميات دقيقة (من قائمة القص والاكسسوار)، وكل سعر في إعدادات الفئة ويُستبدل في مكان واحد.')}>
          <table className="nkc-ptable" data-testid="price-table">
            <thead><tr><th>{L('Item', 'البند')}</th><th className="num">{L('Qty', 'الكمية')}</th><th className="num">{L('Rate', 'السعر')}</th><th className="num">BD</th></tr></thead>
            <tbody>
              {price.lines.map((l) => (<tr key={l.k}><td>{ar ? l.ar : l.en}</td><td className="num" dir="ltr">{l.qty} {l.unit}</td><td className="num" dir="ltr">{l.rate.toFixed(2)}</td><td className="num" dir="ltr">{l.amount.toFixed(2)}</td></tr>))}
              <tr><td colSpan={3}>{L('Materials', 'المواد')}</td><td className="num" dir="ltr">{price.materials.toFixed(2)}</td></tr>
              <tr><td colSpan={3}>{L(`Labour ${Math.round(price.labourPct * 100)}%`, `العمالة ${Math.round(price.labourPct * 100)}٪`)}</td><td className="num" dir="ltr">{price.labour.toFixed(2)}</td></tr>
              <tr><td colSpan={3}>{L(`Margin ${Math.round(price.marginPct * 100)}%`, `الهامش ${Math.round(price.marginPct * 100)}٪`)}</td><td className="num" dir="ltr">{price.margin.toFixed(2)}</td></tr>
              <tr className="nkc-ptot"><td colSpan={3}>{L('Total', 'الإجمالي')} <span className="nkc-ph">{L('placeholder rates', 'أسعار مؤقتة')}</span></td><td className="num" dir="ltr" data-testid="price-total">{price.total.toFixed(2)}</td></tr>
            </tbody>
          </table>
          {onSendToQuote && <button type="button" className="nk-btn nk-btn-primary" onClick={() => onSendToQuote(W)} data-testid="cat-quote-p">{L('Send to Quote Max', 'إرسال إلى Quote Max')}</button>}
        </Card>
      );
      default: {
        const t = cfg.tabs.find((q) => q.id === tab);
        return t ? <>{t.cards.map(specCard)}</> : null;
      }
    }
  };

  /* ---------- render ---------- */
  const emptyLabel = cfg.noun[ar ? 1 : 0];
  const priceTitle = L('Placeholder rates - priced from the cut list and hardware list', 'أسعار مؤقتة - من قائمة القص وقائمة الاكسسوار');
  return (
    <div className={`nk nk-cat nk-cat-${cfg.id}${ar ? ' nk-rtl' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={lang} onKeyDown={onKeyDown} data-testid={`neo-${cfg.id}`} data-cat={cfg.id} data-view={view} data-panel-open={panelOpen ? '1' : '0'} data-panel-mode={drawer ? 'drawer' : 'dock'} data-asst={asstOpen ? (asstDocked ? 'dock' : 'float') : 'off'}>
      <header className="nk-head">
        <div className="nk-brand">
          <span className="nk-logo" aria-hidden="true">N</span>
          <div className="nk-title-wrap">
            <div className="nk-appname" data-testid="appname">{cfg.app[ar ? 1 : 0]}</div>
            <div className="nk-subtitle">{L('THE CLOSETS · NEO STUDIO', 'الخزائن · استوديو نيو')}</div>
          </div>
          <input className="nk-title" aria-label={L('Project title', 'عنوان المشروع')} value={d.title} maxLength={80} onChange={(e) => commit({ ...d0(), title: e.target.value }, 'title')} />
        </div>
        <div className="nk-right">
          <span className="nk-saved-chip nkc-hd" role="status" data-testid="autosave" data-saved={savedAt ? '1' : '0'} data-state={saveState}><i className="nk-saved-dot" aria-hidden="true" /><span className="nk-saved-t">{saveState === 'failed' ? L('Autosave blocked', 'تعذّر الحفظ التلقائي') : savedAt ? L(`Saved ${savedAt}`, `حُفظ ${savedAt}`) : L('Autosave on', 'الحفظ التلقائي مفعّل')}</span></span>
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Undo (Ctrl+Z)', 'تراجع (Ctrl+Z)')} aria-label={L('Undo', 'تراجع')} disabled={!canUndo} onClick={undo}><Ic n="undo" /></button>
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Redo (Ctrl+Y)', 'إعادة (Ctrl+Y)')} aria-label={L('Redo', 'إعادة')} disabled={!canRedo} onClick={redo}><Ic n="redo" /></button>
          <span className="nk-saved-chip nkc-price nkc-hd" role="status" data-testid="cat-price" title={priceTitle}>{price.text}</span>
          <QuoteLauncher className="nkc-quote nkc-hd" lang={lang} user={currentUser} toast={toast} getContext={() => categoryCtx({ cfg, out: W, onAdvanced: onSendToQuote ? () => onSendToQuote(W) : null, apply: (d) => commit(d, 'quote:describe') })} />
          <FileMenu lang={lang} layout="straight" dirty={dirty} open={menu === 'file'} wrapRef={menuRef}
            onToggle={() => setMenu(menu === 'file' ? null : 'file')} onClose={() => setMenu(null)} onResetCamera={() => setCam('reset')}
            onSave={() => { doExport('json'); notifyExplicitSave(cfg.menuId); }} onLoadFile={importFile}
            onNewEmpty={() => loadDesign(blankDesign(cfg), L(`New blank ${cfg.single[0]}. Undo brings the previous one back.`, `${cfg.single[1]} جديد فارغ. التراجع يعيد السابق.`))}
            onDefault={() => loadDesign(defaultDesign(cfg), L(`Default ${cfg.single[0]} loaded. Undo brings the previous one back.`, `تم تحميل ${cfg.single[1]} الافتراضي. التراجع يعيد السابق.`))}
            nouns={{ layout: [`${cfg.layoutLabel[0]} · ${units.length} ${units.length === 1 ? 'unit' : 'units'} · ${total} mm`, `${cfg.layoutLabel[1]} · ${units.length} وحدات · ${total} مم`], empty: [`New — blank ${cfg.single[0]}`, `جديد — ${cfg.single[1]} فارغ`], def: [`Default ${cfg.single[0]}`, `${cfg.single[1]} الافتراضي`], discard: [`Discard the current ${cfg.single[0]}?`, `تجاهل ${cfg.single[1]} الحالي؟`] }} />
          <ExportMenu user={currentUser && (currentUser.id || currentUser.email) ? String(currentUser.id || currentUser.email) : ''} lang={lang} unit={output.unit} model={model} scene={scene} bom={bom} hardware={hardware} warnings={warnings} ui={ui} onLegacy={doExport} log={exportsLog} onLog={logExport} notify={notify} product={cfg.id} />
          {onSendToQuote && <button type="button" className="nk-btn nkc-quote nkc-hd" onClick={() => onSendToQuote(W)} data-testid="cat-quote" title={L('Open in Quote Max (advanced)', 'فتح في Quote Max (متقدم)')}>{L('Quote Max', 'Quote Max')}</button>}
          <Seg className="nk-lang" label={L('Language', 'اللغة')} value={lang} onChange={setLang} options={[['en', 'EN'], ['ar', 'ع']]} />
        </div>
      </header>

      <div className={`nk-body${panelOpen ? '' : ' nk-body-full'}`} ref={bodyRef}>
        {panelOpen && drawer && <button type="button" className="nk-scrim" aria-label={L('Close parameters', 'إغلاق المعاملات')} onClick={() => setPanelOpen(false)} tabIndex={-1} />}
        <aside className={`nk-panel${panelOpen ? '' : ' nk-panel-closed'}`} aria-label={L('Parameters', 'المعاملات')} aria-hidden={!panelOpen} data-open={panelOpen ? '1' : '0'} inert={panelOpen ? undefined : ''}>
          <div className="nk-panel-head">
            <b>{L('Parameters', 'المعاملات')}</b>
            <button type="button" className="nk-hb nk-hb-ic" aria-expanded={panelOpen} aria-label={L('Collapse panel', 'طي اللوحة')} data-tip={L('Collapse the panel to give the drawing more room', 'اطوِ اللوحة لتوسيع مساحة الرسم')} onClick={() => setPanelOpen(false)}><Ic n={ar ? 'next' : 'prev'} /></button>
          </div>
          <div className="nk-panel-main">
            <nav className="nk-rail" role="tablist" aria-orientation="horizontal" aria-label={L('Control groups', 'مجموعات التحكم')} ref={railRef} onKeyDown={onRailKey}>
              {TABS.map(([k, ic, en, a]) => (
                <button key={k} type="button" role="tab" id={`nkc-tab-${k}`} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} className="nk-rt" data-tab={k} onClick={() => setTab(k)}>
                  <Ic n={ic} size={20} /><span className="nk-rt-t">{ar ? a : en}</span>
                </button>
              ))}
            </nav>
            <div className="nk-pcol">
              <div role="tabpanel" aria-labelledby={`nkc-tab-${tab}`} className="nk-panel-scroll nkc-panel" data-panel={tab}>
                {restored && (
                  <div className="nk-sub" role="status" data-testid="restored">{L('Restored your autosaved design.', 'تمت استعادة تصميمك المحفوظ تلقائيًا.')} {onKeepRestored && <button type="button" className="nk-btn" onClick={onKeepRestored}>{L('Keep', 'متابعة')}</button>}</div>
                )}
                <div className="nkc-actions" role="group" aria-label={L('Actions', 'إجراءات')}>
                  <span className="nk-saved-chip nkc-price">{price.text}</span>
                  <QuoteLauncher testid="nq-open-m" lang={lang} user={currentUser} toast={toast} getContext={() => categoryCtx({ cfg, out: W, onAdvanced: onSendToQuote ? () => onSendToQuote(W) : null, apply: (d) => commit(d, 'quote:describe') })} />
                  {onSendToQuote && <button type="button" className="nk-btn" onClick={() => onSendToQuote(W)} data-testid="cat-quote-m">{L('Open in Quote Max (advanced)', 'فتح في Quote Max (متقدم)')}</button>}
                </div>
                {panelBody()}
              </div>
            </div>
          </div>
        </aside>
        {!panelOpen && (
          <button type="button" className="nk-ptab" aria-expanded={false} aria-label={L('Parameters', 'المعاملات')} data-tip={L('Open the parameters panel', 'فتح لوحة المعاملات')} onClick={() => setPanelOpen(true)}>
            <Ic n="params" /><span>{L('Parameters', 'المعاملات')}</span>
          </button>
        )}

        <main className="nk-stage" aria-label={L('Drawing', 'الرسم')} ref={stageRef}>
          <div className="nk-stagebar">{toolbar}</div>
          <div className="nk-stagebody">
          <div className="nk-stagemain">
          {openBar && view !== 'cut' && (
            <OpenControl lang={lang} scene={scene} openIds={openIds} onOpenIds={setOpenIds} speed={openSpeed} onSpeed={setOpenSpeed} scope={openScope} onScope={setOpenScope}
              selUnitId={sel ? sel.unitId : null} selLabel={info ? info.inst.label : ''} onClose={() => setOpenBar(false)} />
          )}
          {view === 'design' && (
            <>
              <div className="nk-modebar" role="group" aria-label={L('Elevation controls', 'عناصر تحكم الواجهة')} data-testid="elev-bar">
                {scene.runs.length > 1 && (
                  <Seg className="nk-seg-run" label={L('Elevation view', 'عرض الواجهة')} value={runView} options={scene.runs.map((r) => [r.key, r.key === 'main' ? L('MAIN', 'رئيسي') : r.key === 'left' ? L('LEFT', 'يسار') : L('RIGHT', 'يمين')])} onChange={setRunView} />
                )}
                {scene.runs.length > 1 && <span className="nk-mb-sep" aria-hidden="true" />}
                <label className="nk-chk"><input type="checkbox" checked={dimsOn} onChange={(e) => setDims(e.target.checked)} /> {L('Dimensions', 'الأبعاد')}</label>
                <label className="nk-chk"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> {L('Internal', 'داخلي')}</label>
                <label className="nk-chk"><input type="checkbox" checked={mapOn} onChange={(e) => setMap(e.target.checked)} /> {L('Map', 'خريطة')}</label>
                <label className="nk-chk nk-chk-hdl" title={L('Drag the blue handles on the drawing to change sizes; arrow keys nudge a focused handle', 'اسحب المقابض الزرقاء على الرسم لتغيير المقاسات؛ مفاتيح الأسهم تحرّك المقبض المحدد')}><input type="checkbox" data-testid="handles-toggle" checked={handlesOn} onChange={(e) => setHandlesOn(e.target.checked)} /> {L('Handles', 'المقابض')}</label>
                <label className="nk-chk"><input type="checkbox" checked={center} onChange={(e) => setCenter(e.target.checked)} /> {L('Centre lines', 'خطوط المنتصف')}</label>
              </div>
              <div className="nkc-legend nk-legend" role="group" aria-label={L('Part types (click to isolate)', 'أنواع القطع (انقر للعزل)')}>
                {legend.map((t) => (
                  <button key={t.k} type="button" className="nk-lg" aria-pressed={isolate === t.k} onClick={() => setIsolate(isolate === t.k ? null : t.k)}>
                    <span className={`nk-sw nk-pt nk-pt-${t.k}`} />{t[lang]}
                  </button>
                ))}
              </div>
              {warnings.length > 0 && (
                <div className="nkc-warn" data-testid="warnings" data-open={warnOpen ? '1' : '0'}>
                  <button type="button" className="nk-btn" aria-expanded={warnOpen} onClick={() => setWarnOpen(!warnOpen)} data-testid="warnings-toggle"><Ic n="warn" size={16} /> {L(`${warnings.length} check${warnings.length === 1 ? '' : 's'}`, `${warnings.length} تنبيه`)}</button>
                  {warnOpen && <ul data-testid="warnings-list">{warnings.map((w) => <li key={w.id}>{w[lang]}</li>)}</ul>}
                </div>
              )}
              <div className="nk-draw" data-testid="elevation-wrap">
                <Elevation scene={scene} runKey={scene.runs.some((r) => r.key === runView) ? runView : 'main'} ui={ui} selected={sel} onSelect={setSel} onDrag={onDrag} lang={lang} handles={['width']} handleList={handleList} onHandle={onHandle} />
              </div>
            </>
          )}
          {view === '3d' && (
            <>
              {explode.on && (
                <div className="nk-exbar" role="group" aria-label={L('Explode', 'تفكيك')}>
                  <b>{L('Explode', 'تفكيك')}</b>
                  <Seg label={L('Explode mode', 'نمط التفكيك')} value={explode.mode} onChange={(v) => setExplode({ ...explode, mode: v })} options={[['assembly', L('Assembly', 'تجميع')], ['fronts', L('Fronts', 'واجهات')]]} />
                  <input type="range" className="nk-range" min={0} max={100} value={Math.round(explode.amt * 100)} aria-label={L('Explode amount', 'مقدار التفكيك')} onChange={(e) => setExplode({ ...explode, amt: +e.target.value / 100 })} data-testid="explode-slider" />
                  <span className="nk-mono" dir="ltr">{Math.round(explode.amt * 100)}%</span>
                  <button type="button" className="nk-btn" onClick={() => setCam('fit')}><Ic n="fit" size={16} /> {L('Fit', 'ملاءمة')}</button>
                </div>
              )}
              <div className="nk-3dwrap">
              <Kitchen3D scene={scene} ui={ui} model={model} lang={lang} onSelect={setSel} camCmd={camCmd} sel={sel} unit={output.unit} onToggleFront={onToggleFront} poseRef={poseRef} label={[`3D ${cfg.single[0]} view. Arrow keys orbit, + and - zoom, 0 refits.`, `عرض ثلاثي الأبعاد لـ${cfg.single[1]}. الأسهم للدوران، + و - للتكبير، 0 للإعادة.`]} />
              </div>
              <div className="nk-hint" data-hint3d="1">{hold
                ? L('Camera held (L to release) · click to select · double-click a door or drawer to open it', 'الكاميرا مثبتة (L للإلغاء) · انقر للتحديد · نقرتان على باب أو درج لفتحه')
                : L('Drag to orbit · right/Shift-drag or two fingers to pan · scroll to zoom to the cursor · arrows/WASD nudge · double-click a part to focus, a door to open · L holds', 'اسحب للدوران · زر أيمن/Shift أو إصبعان للتحريك · العجلة للتكبير نحو المؤشر · الأسهم/WASD للإزاحة · نقرتان على قطعة للتركيز وعلى باب لفتحه · L للتثبيت')}</div>
            </>
          )}
          {view === 'cut' && (
            <div className="nk-cutwrap" data-testid="cutlist">
              <CutListView bom={bom} hardware={hardware} warnings={warnings} est={null} prices={null} lang={lang} unit={output.unit} onExport={doExport} model={model} product={cfg.id} scene={scene} notify={notify} user={currentUser && (currentUser.id || currentUser.email) ? String(currentUser.id || currentUser.email) : ''} />
            </div>
          )}

          {info && view !== 'cut' && (
            <div className="nk-foot"><div className="nk-selcard" role="region" aria-label={L('Selected part', 'القطعة المحددة')} data-testid="sel-card">
              <span className={`nk-sw nk-pt nk-pt-${info.ptype}`} />
              <div className="nk-sel-t">
                <b dir="auto">{info.name}</b>
                <small dir="ltr" data-testid="sel-meta">{selDims(info.dims)} · {info.mat || L('Carcass', 'هيكل')}{info.area != null ? ` · ${info.area.toFixed(2)} m²` : ''}</small>
              </div>
              <button type="button" className="nk-btn nk-btn-primary" disabled={!info.openable} title={info.openable ? undefined : L('Nothing to open on this selection', 'لا يوجد ما يُفتح في هذا التحديد')} onClick={toggleOpenSel} data-testid="sel-open">{L('Open', 'فتح')}</button>
              <button type="button" className="nk-btn nk-btn-ghost" onClick={() => { setAsstSeed({ text: `unit ${placedIdx(info.inst.unit.id) + 1} `, n: Date.now() }); setAsstOpen(true); }} data-testid="sel-ai">{L('Ask Haneen', 'اسأل حنين')}</button>
              <button type="button" className="nk-ib" aria-label={L('Close', 'إغلاق')} onClick={() => setSel(null)} data-testid="sel-close"><Ic n="close" size={16} /></button>
            </div></div>
          )}
          </div>
          {vtools}
          </div>
          <div className="nk-status" role="status" aria-live="polite" data-testid="status">{status}</div>
        </main>

        {asstOpen && (
          <CategoryAssistant cfg={cfg} design={d} lang={lang} seed={asstSeed} docked={asstDocked} onLang={setLang} selectedLabel={info ? info.name : ''}
            rect={floatRect} bounds={{ w: body.w, h: body.h }} rtl={ar} onRect={setAsstRect} onRectCommit={(r) => { setAsstRect(r); saveWsPrefs({ asstRect: r }); }}
            canDock={dock} onToggleMode={() => { const m = asstDocked ? 'float' : 'dock'; setAsstMode(m); saveWsPrefs({ asstMode: m }); }} onCollapse={() => setAsstOpen(false)}
            onApply={(dd) => commit(dd, `ai:${Date.now()}`)} onUi={uiCmd} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} onClose={() => setAsstOpen(false)} />
        )}
      </div>

      {!asstOpen && (
        <button type="button" className="nk-fab" onClick={() => setAsstOpen(true)} data-testid="assistant-fab" aria-label={ar ? 'مساعد بونساي' : 'Bonsai Assistant'}>
          <Ic n="assistant" size={20} /><span className="nk-fab-t">{ar ? 'مساعد بونساي' : 'Bonsai Assistant'}</span>
        </button>
      )}

      {printing && typeof document !== 'undefined' && createPortal(
        <div className="nk-print-root" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
          <div className="nk-print-sheet">
            <h1>{d.title || emptyLabel}</h1>
            <p>{cfg.app[ar ? 1 : 0]} · {new Date().toLocaleDateString()} · {footprint.w} × {footprint.d} × {footprint.h} mm</p>
            {scene.runs.map((r) => (
              <figure key={r.key} className="nk-print-fig"><figcaption>{r.key === 'main' ? emptyLabel : r.label}</figcaption>
                <Elevation scene={scene} runKey={r.key} ui={{ ...ui, dims: true, xray: false, openDoors: false, openIds: new Set(), internal: false, map: false, center: false, isolate: null, layers: ALL_LAYERS }} selected={null} onSelect={() => {}} onDrag={() => {}} lang={lang} interactive={false} />
              </figure>
            ))}
          </div>
          <div className="nk-print-sheet nk-print-bom">
            <CutListView bom={bom} hardware={hardware} warnings={warnings} est={null} prices={null} lang={lang} unit={output.unit} onExport={() => {}} model={model} compact product={cfg.id} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
const i1 = (i) => `U${i + 1}`;
export { money };
