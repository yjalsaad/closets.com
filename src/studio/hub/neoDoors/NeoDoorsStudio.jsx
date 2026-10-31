/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - the Wood Doors studio, in the same Neo style as the Neo Kitchen Designer and the Neo Closets studio.
 * Floating toolbar (Design | 3D View | Cut List | X-Ray | Explode | Open | Daylight | Look), a Parameters rail (Size, Leaf, Panels, Glazing, Frame,
 * Hardware, Vent & Fire), the technical drawing (elevation + plan with dimensions and numbered callouts), a dedicated 3D scene, the cut list,
 * the File and Export menus, undo / redo, autosave, EN / AR with RTL, price + Send to Quote Max, and Haneen (Bonsai assistant).
 * Reused Neo components: ParameterField (through NumField), Seg / Toggle, Tool / Ic, FileMenu, LookPresets, OpenControl, VtMenu, the camera / look /
 * open maths, the assistant persona + float gestures, and the whole workspace + cut-list + export-menu stylesheets.
 * The studio OWNS the design object (the engine in doorEngine.js is pure): every control commits a new design, the engine rebuilds, and the drawing,
 * the 3D scene, the cut list and the price all read that one result.
 * ===========================================================================*/
import { wsShowFactory } from '../wsFlags'; // [WEB-STUDIO]
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../neoKitchen/neoKitchen.css';
import '../neoKitchen/workspace.css';
import './neoDoors.css';
import { Seg, Toggle, NumField, useDismiss } from '../neoKitchen/ui';
import { Ic, Tool } from '../neoKitchen/icons';
import OpenControl from '../neoKitchen/OpenControl';
import { loadWsPrefs, saveWsPrefs, frontIds, groupIdsOfPart, toggleIds, clampSpeed, SPEED } from '../neoKitchen/workspace3d';
import { clampFloatRect, defaultFloatRect, cleanFloatRect } from '../neoKitchen/floatRect';
import { useMedia } from '../neoKitchen/useMedia';
import QuoteLauncher from '../neoQuote/QuoteLauncher'; // [NEO-QUOTE-UX33] shared Quote builder
import { doorsCtx } from '../neoQuote/contexts';
import { useEdgeFade } from '../neoKitchen/useEdgeFade';
import VtMenu from '../neoKitchen/VtMenu';
import { VIEW_ORDER } from '../neoKitchen/cameraViews';
import LookPresets from '../neoKitchen/LookPresets';
import { loadLook, saveLook, lookTitle, lookOf, clampSun } from '../neoKitchen/lookProfiles';
import FileMenu from '../neoKitchen/FileMenu';
import OutputSettings, { useOutput } from '../neoKitchen/OutputSettingsControl';
import { attachOutput, applyOutputFromText, UNIT_INFO } from '../neoKitchen/outputSettings';
import { download, safeName } from '../neoKitchen/exporters';
import { MAX_IMPORT_BYTES } from '../neoKitchen/fileMenuLogic';
import '../neoKitchen/wsIcons';
import DoorDrawing from './DoorDrawing';
import { useHandlesPref } from '../neoHandles/HandleLayer';
import { doorHandles } from '../neoHandles/doorHandles';
import { createHandleDispatch } from '../neoHandles/handleModel';
import Door3D from './Door3D';
import DoorCutList from './DoorCutList';
import DoorAssistant from './DoorAssistant';
import DoorExportMenu from './DoorExportMenu';
import {
  defaultDesign, blankDesign, normalizeDesign, designJSON, parseDesign, designKey, construction, TYPES, TYPE_LABEL, CORES, SKINS, TIMBERS, PROFILES, MOULDS, GLASS_KINDS, GLASS_SAFETY,
  FRAME_PROFILES, ARCH_PROFILES, THRESHOLDS, HINGE_TYPES, HANDLES, FIRE, VENTS, LOUVRE_ZONES, FINISH_KEYS, FINISHES, RANGES, CONSTRUCTS,
} from './doorModel';
import { buildDoor, selectionInfo, openIdsFor } from './doorEngine';
import { buildDoorDXF, doorCSV, doorOBJ, priceCSV, doorSummary } from './doorExports';
import { usePublishDesignMeta, notifyExplicitSave } from '../neoLeads/leadContext';

export const AUTOSAVE_KEY = 'neo_doors_autosave_v1';
export const HANDOFF_KEY = 'neo_doors_handoff';
const store = () => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch (e) { return null; } };
export function loadAutosave() { try { const s = store(); const t = s && s.getItem(AUTOSAVE_KEY); return t ? parseDesign(t) : null; } catch (e) { return null; } }
export function saveAutosave(d) { try { const s = store(); if (s) s.setItem(AUTOSAVE_KEY, designJSON(d)); return true; } catch (e) { return false; } }

const TABS = [['size', 'global', 'Size', 'المقاس'], ['leaf', 'ms', 'Leaf', 'الضلفة'], ['panels', 'base', 'Panels', 'البانوهات'], ['glass', 'look', 'Glazing', 'الزجاج'],
  ['frame', 'wall', 'Frame', 'الحلق'], ['hardware', 'hardware', 'Hardware', 'الاكسسوار'], ['vent', 'shelves', 'Vent & Fire', 'تهوية وحريق']];
const LAYERS = [['leaf', 'Leaf', 'الضلفة'], ['frame', 'Frame', 'الحلق'], ['arch', 'Architrave', 'الكورنيش'], ['hardware', 'Hardware', 'الاكسسوار'], ['wall', 'Wall', 'الجدار']];
const ALL_LAYERS = { leaf: true, frame: true, arch: true, hardware: true, wall: true };
const LEGEND = [['leaf', 'Leaf', 'الضلفة'], ['panel', 'Panel', 'بانوه'], ['glass', 'Glass', 'زجاج'], ['louvre', 'Louvre', 'شيش'], ['frame', 'Frame', 'الحلق'], ['arch', 'Architrave', 'كورنيش'], ['hardware', 'Hardware', 'اكسسوار']];
const L2 = { solid: ['Solid', 'صلب'], hollow: ['Hollow', 'مجوف'], engineered: ['Engineered', 'هندسي'], paint: ['Paint', 'دهان'], veneer: ['Veneer', 'قشرة'], lacquer: ['Lacquer', 'لكر'], laminate: ['Laminate', 'لامينيت'],
  softwood: ['Softwood', 'خشب لين'], hardwood: ['Hardwood', 'خشب صلب'], flat: ['Flat', 'مسطح'], raised: ['Raised', 'بارز'], shaker: ['Shaker', 'شيكر'], bolection: ['Bolection', 'بولكشن'],
  none: ['None', 'بدون'], bead: ['Bead', 'خرزة'], ogee: ['Ogee', 'أوجي'], bevel: ['Bevel', 'مشطوف'], square: ['Square', 'مربع'], clear: ['Clear', 'شفاف'], frosted: ['Frosted', 'مصنفر'], smoked: ['Smoked', 'مدخن'],
  toughened: ['Toughened', 'مقسّى'], laminated: ['Laminated', 'مُلصّق'], chamfer: ['Chamfer', 'شطف'], rebated: ['Rebated', 'بشق'], bullnose: ['Bullnose', 'مدور'], flatT: ['Flat', 'مسطحة'], ramp: ['Ramp', 'منحدرة'],
  butt: ['Butt', 'عادية'], ball: ['Ball bearing', 'بلي'], concealed: ['Concealed', 'مخفية'], pivot: ['Pivot', 'محور'], lever: ['Lever', 'ذراع'], knob: ['Knob', 'كرة'], pull: ['Pull', 'سحب'],
  undercut: ['Undercut', 'فتحة سفلية'], grille: ['Grille', 'شبكة'], full: ['Full', 'كامل'], upper: ['Upper', 'علوي'], lower: ['Lower', 'سفلي'], FD30: ['FD30', 'FD30'], FD60: ['FD60', 'FD60'] };
const t2 = (k, ar) => (L2[k] ? L2[k][ar ? 1 : 0] : k);

/* little door pictograms for the type chips: drawn from the type, so they never lie */
function Glyph({ t }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke' };
  return (
    <svg viewBox="0 0 28 40" width="26" height="36" aria-hidden="true" focusable="false">
      <rect x="4" y="2" width="20" height="36" rx="1" {...p} />
      {t === 'panel' && <><rect x="8" y="6" width="5" height="11" {...p} /><rect x="15" y="6" width="5" height="11" {...p} /><rect x="8" y="21" width="5" height="13" {...p} /><rect x="15" y="21" width="5" height="13" {...p} /></>}
      {t === 'moulded' && <><rect x="8" y="6" width="12" height="10" rx="1" {...p} /><rect x="8" y="20" width="12" height="14" rx="1" {...p} /></>}
      {t === 'glazed' && <><rect x="8" y="6" width="12" height="15" {...p} /><line x1="14" y1="6" x2="14" y2="21" {...p} /><line x1="8" y1="13.5" x2="20" y2="13.5" {...p} /><rect x="8" y="25" width="12" height="9" {...p} /></>}
      {t === 'louvre' && [8, 12, 16, 20, 24, 28, 32].map((y) => <line key={y} x1="8" y1={y} x2="20" y2={y + 2} {...p} />)}
      {t === 'barn' && <><line x1="1" y1="2" x2="27" y2="2" {...p} /><line x1="4" y1="2" x2="24" y2="38" {...p} /><line x1="24" y1="2" x2="4" y2="38" {...p} strokeDasharray="2 2" /></>}
      {t === 'double' && <><line x1="14" y1="2" x2="14" y2="38" {...p} /><circle cx="12" cy="22" r="0.9" {...p} /><circle cx="16" cy="22" r="0.9" {...p} /></>}
      {t === 'pocket' && <><rect x="1" y="2" width="10" height="36" {...p} strokeDasharray="2 2" /><line x1="9" y1="20" x2="22" y2="20" {...p} /></>}
      {t === 'flush' && <circle cx="20" cy="21" r="1" {...p} />}
    </svg>
  );
}
function Step({ value, min, max, onChange, label, disabled = false }) {
  return (
    <span className="nkd-step" role="group" aria-label={label}>
      <button type="button" className="nk-ib" aria-label={`${label} −`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>−</button>
      <output className="nk-mono" dir="ltr" aria-live="polite">{value}</output>
      <button type="button" className="nk-ib" aria-label={`${label} +`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}
const Card = ({ title, children, note, testid }) => (
  <section className="nk-card nkd-card" data-testid={testid}>
    <div className="nk-card-head"><b className="nk-card-title">{title}</b></div>
    <div className="nkd-card-body">{children}</div>
    {note ? <p className="nk-sub nkd-note">{note}</p> : null}
  </section>
);
const Row = ({ label, children, off }) => (<div className="nkd-row" data-off={off ? '1' : '0'} aria-disabled={off ? 'true' : undefined}><span className="nkd-row-l">{label}</span><div className="nkd-row-c">{children}</div></div>);
const selDims = (d) => `${d.map((v) => Math.round(v * 10) / 10).join(' × ')} mm`;
const setIn = (o, path, v) => { const ks = path.split('.'); const out = { ...o }; let c = out; for (let i = 0; i < ks.length - 1; i++) { c[ks[i]] = { ...c[ks[i]] }; c = c[ks[i]]; } c[ks[ks.length - 1]] = v; return out; };

export default function NeoDoorsStudio({ toast, onSendToQuote, startLang = 'en', currentUser = null, initialDesign = null, autosave = true }) {
  const [lang, setLang] = useState(startLang === 'ar' ? 'ar' : 'en');
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] units + precision (shared setting)
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const narrow = useMedia('(max-width: 640px)');
  const dock = useMedia('(min-width: 1280px)');
  const drawerMedia = useMedia('(max-width: 1023px)');
  const railRef = useRef(null);
  const [design, setDesign] = useState(() => initialDesign || (autosave ? loadAutosave() : null) || defaultDesign());
  const restored = useRef(!initialDesign && autosave && !!loadAutosave());
  const [view, setView] = useState('design');
  const [tab, setTab] = useState('size');
  const [drawView, setDrawView] = useState('elev');
  const [panelOpen, setPanelOpen] = useState(() => !(typeof window !== 'undefined' && window.innerWidth < 1024));
  const [layers, setLayers] = useState(ALL_LAYERS);
  const [xray, setXray] = useState(false);
  const [explode, setExplode] = useState({ on: false, amt: 1 });
  const [openBar, setOpenBar] = useState(false);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [dimsOn, setDims] = useState(true);
  const [handlesOn, setHandlesOn] = useHandlesPref(); // [NEO-HANDLES-UX36] the SMART HANDLES on the drawing (remembered)
  const [internal, setInternal] = useState(false);
  const [mapOn, setMap] = useState(true);
  const [center, setCenter] = useState(false);
  const [isolate, setIsolate] = useState(null);
  const [grid, setGrid] = useState(true);
  const [guides, setGuides] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [camCmd, setCamCmd] = useState(null);
  const [lk, setLk] = useState(() => loadLook());
  const [menu, setMenu] = useState(null);
  const [sel, setSel] = useState(null);
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
  /* the layout follows the MEASURED width of the workspace (the Hub chrome takes 90-290 px, so a 1024 px window is a narrow workspace): below 900 px the panel is a drawer, below 1000 px the header drops its labels */
  const drawer = body.w ? body.w < 900 : drawerMedia;
  const compact = body.w > 0 && body.w < 1000;
  const sized = useRef(false);
  useEffect(() => { if (body.w && !sized.current) { sized.current = true; if (body.w < 900) setPanelOpen(false); } }, [body.w]);
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
  const savedKey = useRef(designKey(design));
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
    const ro = new ResizeObserver(() => setTight(el.clientWidth < 880)); ro.observe(el); setTight(el.clientWidth < 880); return () => ro.disconnect();
  }, []);
  const notify = useCallback((m) => {
    setStatus(m); clearTimeout(statusT.current); statusT.current = setTimeout(() => setStatus(''), 4500);
    if (typeof toast === 'function') { try { toast(m); } catch (e) { /* ignore */ } }
  }, [toast]);
  useEffect(() => { if (restored.current) { restored.current = false; notify(L('Restored your last door from autosave.', 'تمت استعادة آخر باب من الحفظ التلقائي.')); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- the one build ---------- */
  const dkey = designKey(design);
  const W = useMemo(() => buildDoor(design), [dkey]); // eslint-disable-line react-hooks/exhaustive-deps
  const { scene, bom, hardware, warnings, S, price } = W;
  usePublishDesignMeta('neo-doors', { price: price.total, currency: price.currency }); // [NEO-LEADS-UX37]
  const k = construction(design);
  const asstDocked = dock && asstMode === 'dock';
  const floatRect = useMemo(() => clampFloatRect(asstRect || defaultFloatRect(body.w, body.h, ar), body.w, body.h), [asstRect, body.w, body.h, ar]);
  const info = useMemo(() => selectionInfo(W, sel), [W, sel]);
  useEffect(() => { if (sel && !(sel.partId ? scene.parts.some((p) => p.id === sel.partId) : W.leaves.some((l) => l.id === sel.unitId))) setSel(null); }, [scene, sel, W.leaves]);
  /* autosave: debounced, guarded (private windows and blocked storage must never break the studio) */
  useEffect(() => { if (!autosave) return undefined; const t = setTimeout(() => saveAutosave(design), 500); return () => clearTimeout(t); }, [design, autosave]);

  /* ---------- history ---------- */
  const onApply = setDesign;
  const commit = useCallback((next, key) => {
    const h = hist.current; const now = Date.now();
    if (!(key && h.key === key && (now - h.at < 900 || String(key).startsWith('hdl:')))) h.past = [...h.past, designRef.current].slice(-100);
    h.future = []; h.key = key || null; h.at = now; tick((n) => n + 1);
    const nd = normalizeDesign(next); designRef.current = nd; onApply(nd);
  }, [onApply]);
  const undo = useCallback(() => { const h = hist.current; if (!h.past.length) return; const prev = h.past[h.past.length - 1]; h.past = h.past.slice(0, -1); h.future = [designRef.current, ...h.future]; h.key = null; tick((n) => n + 1); designRef.current = prev; onApply(prev); }, [onApply]);
  const redo = useCallback(() => { const h = hist.current; if (!h.future.length) return; const nx = h.future[0]; h.future = h.future.slice(1); h.past = [...h.past, designRef.current]; h.key = null; tick((n) => n + 1); designRef.current = nx; onApply(nx); }, [onApply]);
  const canUndo = hist.current.past.length > 0; const canRedo = hist.current.future.length > 0;
  const d0 = () => designRef.current;
  const set = (path, v, key) => commit(setIn(d0(), path, v), key || `p:${path}`);
  const setMany = (pairs, key) => commit(pairs.reduce((o, [p, v]) => setIn(o, p, v), d0()), key);
  const onKeyDown = (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (e.key === 'Escape' && !menu && openBar) { setOpenBar(false); return; }
    if ((e.key === 'l' || e.key === 'L') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && view === '3d') { e.preventDefault(); setHold((h) => !h); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) { const kk = e.key.toLowerCase(); if (kk === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (kk === 'y' || (kk === 'z' && e.shiftKey)) { e.preventDefault(); redo(); } }
  };

  /* ---------- view commands ---------- */
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
    const ids = openIdsFor(W, info); if (!ids.length) return;
    setOpenIds((s) => { const n = new Set(s); const on = ids.some((i) => n.has(i)); ids.forEach((i) => (on ? n.delete(i) : n.add(i))); return n; });
  };
  const setCam = (name) => { setCamCmd({ n: Date.now(), name }); setMenu(null); };

  /* ---------- file + export ---------- */
  const logExport = (name) => setExportsLog((l) => [...l, `${name} ${new Date().toLocaleTimeString()}`]);
  const dirty = designKey(design) !== savedKey.current;
  const doExport = useCallback((kind) => {
    setMenu(null);
    const base = safeName(design.title || 'door'); const dd = designRef.current;
    if (kind === 'json') { download(`${base}.json`, attachOutput(designJSON(dd)), 'application/json'); logExport('JSON'); savedKey.current = designKey(dd); tick((n) => n + 1); notify(L('Door saved as JSON.', 'تم حفظ الباب JSON.')); }
    else if (kind === 'dxf') { download(`${base}-leaf.dxf`, buildDoorDXF(dd, W, output), 'application/dxf'); logExport('DXF'); notify(L(`Leaf DXF (R12, ${output.unit}) exported: bores, hinge recesses and lock prep.`, `تم تصدير ضلفة DXF (R12، ${UNIT_INFO[output.unit].ar}): الثقوب وتجاويف المفصلات وتجهيز القفل.`)); }
    else if (kind === 'csv') { download(`${base}-cutlist.csv`, doorCSV(dd, W, output), 'text/csv'); logExport('CSV'); notify(L('Cut list CSV exported.', 'تم تصدير قائمة القص CSV.')); }
    else if (kind === 'price') { download(`${base}-price-PLACEHOLDER.csv`, priceCSV(W), 'text/csv'); logExport('Price'); notify(L('Price lines exported. Every rate is a placeholder.', 'تم تصدير بنود السعر. كل الأسعار تقريبية.')); }
    else if (kind === 'obj') { download(`${base}.obj`, doorOBJ(dd, W, output), 'model/obj'); logExport('OBJ'); notify(L(`OBJ exported (closed door, ${output.unit}, Y up).`, `تم تصدير OBJ (الباب مغلقًا، ${UNIT_INFO[output.unit].ar}، Y لأعلى).`)); }
    else if (kind === 'pdf' || kind === 'print') setPrinting(true);
  }, [W, design.title, ar, output]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => { try { window.print(); } catch (e) { /* ignore */ } if (!window.matchMedia || !('onafterprint' in window)) setTimeout(done, 400); }, 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printing]);
  const loadDesign = useCallback((dd, msg) => { commit(dd, `load:${Date.now()}`); savedKey.current = designKey(dd); setSel(null); setOpenIds(new Set()); notify(msg); }, [commit, notify]);
  const importFile = useCallback((file) => {
    if (file && file.size > MAX_IMPORT_BYTES) { notify(L('Import failed: the file is too large. Your door was not changed.', 'فشل الاستيراد: الملف كبير جدًا. لم يتغير بابك.')); return; }
    const rd = new FileReader();
    rd.onload = () => { try { loadDesign(parseDesign(String(rd.result)), L('Door loaded.', 'تم تحميل الباب.')); applyOutputFromText(String(rd.result)); } catch (e) { notify(L(`Import failed: ${e.message}. Your door was not changed.`, `فشل الاستيراد: ${e.message}. لم يتغير بابك.`)); } };
    rd.onerror = () => notify(L('Could not read the file. Your door was not changed.', 'تعذرت قراءة الملف. لم يتغير بابك.'));
    rd.readAsText(file);
  }, [loadDesign, ar]); // eslint-disable-line react-hooks/exhaustive-deps
  const sendToQuote = () => {
    const payload = { v: 1, product: 'door', placeholder: true, design: designRef.current, summary: doorSummary(designRef.current, W, 'en', output), output, net: price.net, total: price.total, currency: price.currency, lines: price.lines.map((l) => ({ name: l.en, qty: l.qty, unit: l.unit, rate: l.rate, amount: l.amount })), ts: Date.now() };
    try { const s = store(); if (s) s.setItem(HANDOFF_KEY, JSON.stringify(payload)); } catch (e) { /* ignore */ }
    notify(L('Door sent to Quote Max with PLACEHOLDER rates - set the real prices before quoting.', 'تم إرسال الباب إلى Quote Max بأسعار تقريبية - حدّد الأسعار الحقيقية قبل التسعير.'));
    if (typeof onSendToQuote === 'function') onSendToQuote(payload);
  };
  const errs = warnings.filter((w) => w.level === 'error').length; const warns = warnings.filter((w) => w.level === 'warn').length;

  /* ---------- derived view bits ---------- */
  /* [NEO-HANDLES-UX36] the shared handle layer: one design path per handle (set(path, v) = setIn + normalizeDesign), one undo step per drag */
  const hdlSeq = useRef({ n: 0 });
  const onHandle = useMemo(() => createHandleDispatch((next, key) => commit(next, key), hdlSeq.current), [commit]);
  const handleList = useMemo(() => doorHandles({ W, d: design, view: drawView === 'plan' ? 'plan' : 'elev', selected: sel }), [W, design, drawView, sel]);
  const ui = { handles: handlesOn, layers, xray, explode, openIds, openSpeed, hold, dims: dimsOn, internal, map: mapOn, center, isolate, grid, guides, look: lk.look, sun: lk.sun };
  const TIP = {
    design: L('Elevation and plan with live dimensions and numbered callouts', 'واجهة ومسقط بأبعاد حية وأرقام مرجعية'), '3d': L('Interactive 3D door set - orbit, pan and zoom', 'باب ثلاثي الأبعاد تفاعلي - دوران وتحريك وتكبير'), cut: L('Cut list, machining, hardware and price', 'قائمة القص والتشغيل والاكسسوار والسعر'),
    xray: L('See through the faces: core, lock block, hinge blocks, bores', 'رؤية عبر الأوجه: القلب وقطعة القفل والمفصلات والثقوب'), explode: L('Pull the door apart: skins, stiles, panels, glass, frame', 'فصل الباب: الجلود والأضلاع والبانوهات والزجاج والحلق'),
    open: L('Swing the leaf open (or slide it)', 'فتح الضلفة (أو سحبها)'), daylight: L('Sunny room with a wood floor', 'غرفة مشمسة بأرضية خشبية'), look: L('Look presets and floor grid', 'أنماط المظهر وشبكة الأرضية'),
  };
  const lookMenu = menu === 'look' && (
    <div className="nk-menu nk-menu-look" role="dialog" aria-label={L('Look', 'المظهر')}>
      <LookPresets lang={lang} look={lk.look} sun={lk.sun} onLook={setLook} onSun={setSun} />
      <div className="nk-menu-h">{L('Door finish', 'تشطيب الباب')}</div>
      <div className="nk-chips">{FINISH_KEYS.map((fk) => <button key={fk} type="button" className="nk-chip" aria-pressed={design.leaf.finish === fk} onClick={() => set('leaf.finish', fk)}><span className="nk-swatch" style={{ background: `var(${FINISHES[fk].cssVar})` }} />{FINISHES[fk][lang]}</button>)}</div>
      <label className="nk-menu-chk"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> {L('Floor grid', 'شبكة الأرضية')}</label>
    </div>
  );
  const MODES = [['design', 'design', L('Design', 'تصميم')], ['3d', 'view3d', L('3D View', 'ثلاثي')], ['cut', 'cut', L('Cut List', 'قائمة القص')]].filter((m) => m[0] !== 'cut' || wsShowFactory()); // [WEB-STUDIO]
  const onRailKey = (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t[0] === tab); const fwd = e.key === 'ArrowDown' || e.key === (ar ? 'ArrowLeft' : 'ArrowRight');
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
          <div className="nk-tg" role="group" aria-label={L('Door', 'الباب')}>
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
  const VIEW_LABEL = { front: L('Front (outside)', 'أمامي (خارج)'), rear: L('Rear (inside)', 'خلفي (داخل)'), left: L('Left', 'يسار'), right: L('Right', 'يمين'), top: L('Top', 'علوي'), iso: L('Isometric', 'أيزومتري') };
  const vtools = view !== 'cut' && (
    <div className="nk-vtools" role="toolbar" aria-label={L('Viewport tools', 'أدوات العرض')}>
      {view === '3d' && (
        <>
          <div className="nk-menuwrap" ref={menu === 'views' ? menuRef : null}>
            <Tool nativeTip icon="views" text={L('Views', 'الزوايا')} label={L('Camera views', 'زوايا الكاميرا')} tip={L('Front, rear, left, right, top and isometric', 'أمامي وخلفي ويسار ويمين وعلوي وأيزومتري')} expanded={menu === 'views'} onClick={() => setMenu(menu === 'views' ? null : 'views')} />
            {menu === 'views' && (
              <VtMenu anchorRef={menuRef} rtl={ar} className="nk-menu nk-menu-side" role="menu" aria-label={L('Camera views', 'زوايا الكاميرا')}>
                {VIEW_ORDER.map((vk) => <button key={vk} type="button" role="menuitem" className="nk-mi" data-view={vk} onClick={() => setCam(vk)}>{VIEW_LABEL[vk]}</button>)}
              </VtMenu>
            )}
          </div>
          <Tool nativeTip icon="fit" text={L('Fit', 'ملاءمة')} label={L('Fit to screen', 'ملاءمة الشاشة')} tip={L('Fit the whole door set in view (F, or double-click)', 'إظهار الباب كاملًا (F أو نقرتان)')} onClick={() => setCam('fit')} />
          <Tool nativeTip icon="reset" text={L('Reset', 'إعادة')} label={L('Reset camera', 'إعادة الكاميرا')} tip={L('Back to the opening angle (0)', 'العودة للزاوية الأولى (0)')} onClick={() => setCam('reset')} />
          <Tool nativeTip icon={hold ? 'lock' : 'unlock'} text={hold ? L('Held', 'مثبتة') : L('Hold', 'تثبيت')} label={L('Hold camera', 'تثبيت الكاميرا')} pressed={hold} data-testid="tool-hold"
            tip={hold ? L('Camera held: no auto re-fit and no accidental orbit - you can still pick parts (L to release)', 'الكاميرا مثبتة: لا ملاءمة تلقائية ولا دوران عرضي - يمكنك اختيار القطع (L للإلغاء)') : L('Hold the camera exactly where it is (L)', 'تثبيت الكاميرا في مكانها بالضبط (L)')} onClick={() => setHold(!hold)} />
          <Tool nativeTip icon="grid" text={L('Grid', 'الشبكة')} label={L('Floor grid', 'شبكة الأرضية')} tip={L('Show or hide the floor grid', 'إظهار أو إخفاء شبكة الأرضية')} pressed={grid} onClick={() => setGrid(!grid)} />
          <Tool nativeTip icon="guides" text={L('Guides', 'القياس')} label={L('Measurement guides', 'خطوط القياس')} tip={L('Opening width, height and wall thickness lines', 'خطوط عرض الفتحة وارتفاعها وسمك الجدار')} pressed={guides} onClick={() => setGuides(!guides)} />
        </>
      )}
      {view === 'design' && (
        <>
          <Tool nativeTip icon="plus" text={L('Zoom in', 'تكبير')} label={L('Zoom in', 'تكبير')} tip={L('Zoom the drawing in', 'تكبير الرسم')} onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))} data-testid="zoom-in" />
          <Tool nativeTip icon="minimize" text={L('Zoom out', 'تصغير')} label={L('Zoom out', 'تصغير')} tip={L('Zoom the drawing out', 'تصغير الرسم')} onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))} data-testid="zoom-out" />
          <Tool nativeTip icon="fit" text={`${Math.round(zoom * 100)}%`} label={L('Fit the drawing', 'ملاءمة الرسم')} tip={L('Back to 100% (fit)', 'العودة إلى 100% (ملاءمة)')} onClick={() => setZoom(1)} data-testid="zoom-fit" />
        </>
      )}
      <div className="nk-menuwrap" ref={menu === 'layers' ? menuRef : null}>
        <Tool nativeTip icon="layers" text={L('Layers', 'الطبقات')} label={L('Layers', 'الطبقات')} tip={L('Show or hide leaf, frame, architrave, hardware, wall', 'إظهار أو إخفاء الضلفة والحلق والكورنيش والاكسسوار والجدار')} expanded={menu === 'layers'} onClick={() => setMenu(menu === 'layers' ? null : 'layers')}>
          {Object.values(layers).some((v) => !v) && <i className="nk-tool-dot" aria-hidden="true" />}
        </Tool>
        {menu === 'layers' && (
          <VtMenu anchorRef={menuRef} rtl={ar} className="nk-menu nk-menu-side nk-menu-layers" role="dialog" aria-label={L('Layers', 'الطبقات')}>
            <div className="nk-layers" role="group" aria-label={L('Layers', 'الطبقات')}>
              {LAYERS.map(([lk2, en, a]) => (
                <button key={lk2} type="button" className="nk-layer" aria-pressed={layers[lk2]} data-hidden={layers[lk2] ? '0' : '1'} onClick={() => setLayers((l) => ({ ...l, [lk2]: !l[lk2] }))}>
                  <span className="nk-layer-i"><Ic n={layers[lk2] ? 'eye' : 'eyeOff'} size={16} /></span><span className="nk-layer-t">{ar ? a : en}</span>
                </button>
              ))}
            </div>
          </VtMenu>
        )}
      </div>
    </div>
  );

  /* ---------- Parameters ---------- */
  const R = RANGES;
  const chips = (list, value, onPick, label, tr = t2) => (
    <div className="nk-chips" role="group" aria-label={label}>{list.map((v) => <button key={v} type="button" className="nk-chip" aria-pressed={value === v} onClick={() => onPick(v)} data-v={v}>{tr(v, ar)}</button>)}</div>
  );
  const nf = (path, value, rg, label, extra = {}) => <NumField value={value} min={rg[0]} max={rg[1]} step={extra.step || 1} onChange={(v) => { set(path, extra.round === false ? v : Math.round(v * 10) / 10); }} label={label} lang={lang} {...(extra.slider === false ? { slider: false } : {})} />;
  const stackSR = k === 'panel' || k === 'glazed' || k === 'louvre';
  const flushy = k === 'flush' || k === 'moulded';
  const checks = (
    <Card title={L('Checks', 'الفحوصات')} testid="checks-card" note={warnings.length ? undefined : L('No warnings - the door passes every check.', 'لا تنبيهات - الباب يجتاز كل الفحوصات.')}>
      {warnings.length > 0 && <ul className="nkd-checks">{warnings.slice(0, 5).map((w) => <li key={w.id} data-level={w.level}><Ic n={w.level === 'info' ? 'info' : 'warn'} size={15} /><span>{ar ? w.ar : w.en}</span></li>)}</ul>}
      {warnings.length > 5 && <button type="button" className="nk-btn" onClick={() => setView('cut')}>{L(`All ${warnings.length} checks in the Cut List`, `كل الفحوصات (${warnings.length}) في قائمة القص`)}</button>}
    </Card>
  );
  const stats = (
    <div className="nkd-stats" data-testid="door-stats">
      <div className="nkd-stat"><span>{L('Leaf size (mm)', 'مقاس الضلفة (مم)')}</span><b className="nk-mono" dir="ltr" data-testid="leaf-size">{S.n > 1 ? `2 × ` : ''}{S.leafW} × {S.leafH} × {S.T}</b></div>
      <div className="nkd-stat"><span>{L('Clear opening (mm)', 'الفتحة الصافية (مم)')}</span><b className="nk-mono" dir="ltr">{S.clearW} × {S.clearH}</b></div>
      <div className="nkd-stat"><span>{L('Weight (kg)', 'الوزن (كغ)')}</span><b className="nk-mono" dir="ltr" data-testid="leaf-weight">{W.weight.join(' + ')}</b></div>
      <div className="nkd-stat"><span>{L('Hinges per leaf', 'مفصلات لكل ضلفة')}</span><b className="nk-mono" dir="ltr">{S.slides ? '-' : W.hingeCount}</b></div>
    </div>
  );
  const panelBody = () => {
    switch (tab) {
      case 'size': return (
        <>
          <Card title={L('Door type', 'نوع الباب')} testid="type-card">
            <div className="nkd-types" role="group" aria-label={L('Door type', 'نوع الباب')}>
              {TYPES.map((t) => (
                <button key={t} type="button" className="nkd-type" aria-pressed={design.type === t} onClick={() => setMany(t === 'barn' ? [['type', t], ['swing.dir', 'out']] : [['type', t]], 'type')} data-type={t} title={TYPE_LABEL[t][ar ? 1 : 0]}>
                  <Glyph t={t} /><span>{TYPE_LABEL[t][ar ? 1 : 0]}</span>
                </button>
              ))}
            </div>
            {!CONSTRUCTS.includes(design.type) && (
              <Row label={L('Leaf construction', 'تركيب الضلفة')}>{chips(CONSTRUCTS, design.style, (v) => set('style', v), L('Leaf construction', 'تركيب الضلفة'), (v) => TYPE_LABEL[v][ar ? 1 : 0])}</Row>
            )}
          </Card>
          <Card title={L('Opening', 'الفتحة')} note={L('The structural opening the door set fills: width, height and wall thickness. The leaf size is worked out from it.', 'الفتحة الإنشائية التي يملؤها الباب. مقاس الضلفة يُحسب منها.')}>
            <Row label={L('Opening width', 'عرض الفتحة')}>{nf('opening.w', design.opening.w, R.ow, L('Opening width (mm)', 'عرض الفتحة (مم)'), { step: 10 })}</Row>
            <Row label={L('Opening height', 'ارتفاع الفتحة')}>{nf('opening.h', design.opening.h, R.oh, L('Opening height (mm)', 'ارتفاع الفتحة (مم)'), { step: 10 })}</Row>
            <Row label={L('Wall thickness', 'سمك الجدار')}>{nf('opening.wall', design.opening.wall, R.wall, L('Wall thickness (mm)', 'سمك الجدار (مم)'), { step: 5 })}</Row>
            {stats}
          </Card>
          <Card title={L('Clearances', 'الفجوات')} note={L('Gaps between the leaf and the frame. Head and side 2-4 mm for a fire door; the floor gap is the under-cut.', 'الفجوات بين الضلفة والحلق. الرأس والجانب 2-4 مم لباب الحريق؛ فجوة الأرضية هي الفتحة السفلية.')}>
            <Row label={L('Head gap', 'فجوة الرأس')} off={S.sliding}>{nf('clear.head', design.clear.head, R.head, L('Head gap (mm)', 'فجوة الرأس (مم)'), { step: 0.5, round: false })}</Row>
            <Row label={L('Side gap', 'الفجوة الجانبية')} off={S.sliding}>{nf('clear.side', design.clear.side, R.side, L('Side gap (mm)', 'الفجوة الجانبية (مم)'), { step: 0.5, round: false })}</Row>
            <Row label={L('Floor gap', 'فجوة الأرضية')}>{nf('clear.floor', design.clear.floor, R.floor, L('Floor gap (mm)', 'فجوة الأرضية (مم)'), { step: 1 })}</Row>
            {design.type === 'double' && <Row label={L('Meeting gap', 'فجوة الالتقاء')}>{nf('clear.meet', design.clear.meet, R.meet, L('Meeting gap (mm)', 'فجوة الالتقاء (مم)'), { step: 0.5, round: false })}</Row>}
          </Card>
          {checks}
          <OutputSettings lang={lang} variant="card" testid="global-output" />
        </>
      );
      case 'leaf': return (
        <>
          <Card title={L('Leaf', 'الضلفة')}>
            <Row label={L('Leaf thickness', 'سماكة الضلفة')}>{nf('leaf.thk', design.leaf.thk, R.thk, L('Leaf thickness (mm)', 'سماكة الضلفة (مم)'), { step: 1 })}</Row>
            <Row label={L('Core', 'القلب')} off={!flushy}>{chips(CORES, design.leaf.core, (v) => set('leaf.core', v), L('Core', 'القلب'))}</Row>
            {!flushy && <p className="nk-sub nkd-note" data-testid="core-note">{L('A stile-and-rail leaf is solid timber frames and panels - the core choice applies to flush and moulded leaves.', 'الضلفة ذات الإطار من خشب صلب وبانوهات - اختيار القلب ينطبق على المسطحة والمقولبة.')}</p>}
            <Row label={L('Timber', 'الخشب')}>{chips(TIMBERS, design.leaf.timber, (v) => set('leaf.timber', v), L('Timber', 'الخشب'))}</Row>
          </Card>
          <Card title={L('Skin and finish', 'الجلد والتشطيب')}>
            <Row label={L('Skin', 'الجلد')}>{chips(SKINS, design.leaf.skin, (v) => set('leaf.skin', v), L('Skin', 'الجلد'))}</Row>
            <Row label={L('Skin thickness', 'سماكة الجلد')} off={!flushy}>{nf('leaf.skinT', design.leaf.skinT, R.skinT, L('Skin thickness (mm)', 'سماكة الجلد (مم)'), { step: 0.5, round: false })}</Row>
            <Row label={L('Colour / finish', 'اللون / التشطيب')}>
              <div className="nk-chips" role="group" aria-label={L('Finish', 'التشطيب')}>{FINISH_KEYS.map((fk) => <button key={fk} type="button" className="nk-chip" aria-pressed={design.leaf.finish === fk} onClick={() => set('leaf.finish', fk)} data-v={fk}><span className="nk-swatch" style={{ background: `var(${FINISHES[fk].cssVar})` }} />{FINISHES[fk][lang]}</button>)}</div>
            </Row>
          </Card>
        </>
      );
      case 'panels': return (
        <>
          <Card title={L('Panel layout', 'تقسيم البانوهات')} note={!stackSR && k !== 'moulded' ? L('A flush leaf has no panels. Pick Panel, Glazed, Louvre or Moulded in the Size tab.', 'الضلفة المسطحة بلا بانوهات. اختر بانوه أو زجاج أو شيش أو مقولب من تبويب المقاس.') : k === 'moulded' ? L('A moulded leaf is a flush leaf with a pressed panel pattern: the pattern follows these sizes.', 'الضلفة المقولبة مسطحة بنقش بانوه مضغوط: النقش يتبع هذه المقاسات.') : undefined}>
            <Row label={L('Panel columns', 'أعمدة البانوهات')} off={flushy && k !== 'moulded'}><Step value={design.panels.cols} min={R.cols[0]} max={R.cols[1]} label={L('Panel columns', 'أعمدة البانوهات')} disabled={k === 'flush'} onChange={(v) => set('panels.cols', v)} /></Row>
            <Row label={L('Panel rows', 'صفوف البانوهات')} off={k === 'flush'}><Step value={design.panels.rows} min={R.rows[0]} max={R.rows[1]} label={L('Panel rows', 'صفوف البانوهات')} disabled={k === 'flush'} onChange={(v) => set('panels.rows', v)} /></Row>
            <Row label={L('Stile width', 'عرض الضلع')} off={k === 'flush'}>{nf('panels.stile', design.panels.stile, R.stile, L('Stile width (mm)', 'عرض الضلع (مم)'), { step: 5 })}</Row>
            <Row label={L('Top rail', 'العارضة العلوية')} off={k === 'flush'}>{nf('panels.topRail', design.panels.topRail, R.topRail, L('Top rail (mm)', 'العارضة العلوية (مم)'), { step: 5 })}</Row>
            <Row label={L('Bottom rail', 'العارضة السفلية')} off={k === 'flush'}>{nf('panels.bottomRail', design.panels.bottomRail, R.bottomRail, L('Bottom rail (mm)', 'العارضة السفلية (مم)'), { step: 5 })}</Row>
            <Row label={L('Mid rail', 'العارضة الوسطى')} off={k === 'flush' || design.panels.rows < 2}>{nf('panels.midRail', design.panels.midRail, R.midRail, L('Mid rail (mm)', 'العارضة الوسطى (مم)'), { step: 5 })}</Row>
            <Row label={L('Muntin width', 'عرض القاطع')} off={k === 'flush' || design.panels.cols < 2}>{nf('panels.muntin', design.panels.muntin, R.muntin, L('Muntin width (mm)', 'عرض القاطع (مم)'), { step: 5 })}</Row>
          </Card>
          <Card title={L('Panel profile and moulding', 'شكل البانوه والقولبة')}>
            <Row label={L('Profile', 'الشكل')} off={k === 'flush'}>{chips(PROFILES, design.panels.profile, (v) => set('panels.profile', v), L('Panel profile', 'شكل البانوه'))}</Row>
            <Row label={L('Panel thickness', 'سماكة البانوه')} off={!(k === 'panel' || k === 'glazed' || k === 'louvre')}>{nf('panels.panelThk', design.panels.panelThk, R.panelThk, L('Panel thickness (mm)', 'سماكة البانوه (مم)'), { step: 1 })}</Row>
            <Row label={L('Moulding', 'القولبة')} off={k !== 'panel'}>{chips(MOULDS, design.panels.mould, (v) => set('panels.mould', v), L('Moulding profile', 'شكل القولبة'))}</Row>
            <Row label={L('Moulding width', 'عرض القولبة')} off={k !== 'panel' || design.panels.mould === 'none'}>{nf('panels.mouldW', design.panels.mouldW, R.mouldW, L('Moulding width (mm)', 'عرض القولبة (مم)'), { step: 1 })}</Row>
            <Row label={L('Moulded faces', 'أوجه القولبة')} off={k !== 'panel' || design.panels.mould === 'none'}><Seg label={L('Moulded faces', 'أوجه القولبة')} value={design.panels.mouldSides} onChange={(v) => set('panels.mouldSides', v)} options={[[1, L('One face', 'وجه واحد')], [2, L('Both faces', 'الوجهان')]]} /></Row>
          </Card>
          {k === 'louvre' && (
            <Card title={L('Louvre', 'الشيش')}>
              <Row label={L('Louvred zone', 'منطقة الشيش')}>{chips(LOUVRE_ZONES, design.louvre.zone, (v) => set('louvre.zone', v), L('Louvred zone', 'منطقة الشيش'))}</Row>
              <Row label={L('Slat pitch', 'تباعد الشرائح')}>{nf('louvre.pitch', design.louvre.pitch, R.slatPitch, L('Slat pitch (mm)', 'تباعد الشرائح (مم)'), { step: 1 })}</Row>
              <Row label={L('Slat width', 'عرض الشريحة')}>{nf('louvre.slatW', design.louvre.slatW, R.slatW, L('Slat width (mm)', 'عرض الشريحة (مم)'), { step: 1 })}</Row>
              <Row label={L('Slat thickness', 'سماكة الشريحة')}>{nf('louvre.slatT', design.louvre.slatT, R.slatT, L('Slat thickness (mm)', 'سماكة الشريحة (مم)'), { step: 1 })}</Row>
            </Card>
          )}
        </>
      );
      case 'glass': return (
        <>
          <Card title={L('Glazing', 'الزجاج')} note={L('Glass in a door is safety glass. Divisions are glazing bars: each glazed opening is split into (bars + 1) lights each way.', 'الزجاج في الباب زجاج أمان. التقسيمات قواطع زجاج: كل فتحة تُقسّم إلى (القواطع + 1) ألواح في كل اتجاه.')}>
            <Row label={L('Glazed rows (from the top)', 'صفوف الزجاج (من الأعلى)')} off={k !== 'glazed'}><Step value={design.glass.rows} min={1} max={design.panels.rows} label={L('Glazed rows', 'صفوف الزجاج')} disabled={k !== 'glazed'} onChange={(v) => set('glass.rows', v)} /></Row>
            <Row label={L('Glass', 'الزجاج')}>{chips(GLASS_KINDS, design.glass.kind, (v) => set('glass.kind', v), L('Glass', 'الزجاج'))}</Row>
            <Row label={L('Safety type', 'نوع الأمان')}>{chips(GLASS_SAFETY, design.glass.safety, (v) => set('glass.safety', v), L('Safety type', 'نوع الأمان'))}</Row>
            <Row label={L('Glass thickness', 'سماكة الزجاج')}><Seg label={L('Glass thickness', 'سماكة الزجاج')} value={design.glass.thk} onChange={(v) => set('glass.thk', v)} options={[[6, '6 mm'], [8, '8 mm'], [10, '10 mm']]} /></Row>
            <Row label={L('Vertical bars', 'قواطع عمودية')} off={k !== 'glazed'}><Step value={design.glass.barsV} min={R.barsV[0]} max={R.barsV[1]} label={L('Vertical bars', 'قواطع عمودية')} disabled={k !== 'glazed'} onChange={(v) => set('glass.barsV', v)} /></Row>
            <Row label={L('Horizontal bars', 'قواطع أفقية')} off={k !== 'glazed'}><Step value={design.glass.barsH} min={R.barsH[0]} max={R.barsH[1]} label={L('Horizontal bars', 'قواطع أفقية')} disabled={k !== 'glazed'} onChange={(v) => set('glass.barsH', v)} /></Row>
            <Row label={L('Bar width', 'عرض القاطع')} off={k !== 'glazed'}>{nf('glass.barW', design.glass.barW, R.barW, L('Bar width (mm)', 'عرض القاطع (مم)'), { step: 1 })}</Row>
          </Card>
          <Card title={L('Vision panel', 'فتحة الرؤية')} note={flushy ? L('A rectangular glazed opening cut through a flush or moulded leaf, lined with timber.', 'فتحة زجاج مستطيلة تُقطع في الضلفة المسطحة أو المقولبة وتُبطّن بالخشب.') : L('A vision panel is cut into flush and moulded leaves. This leaf has panels - use the glazed rows instead.', 'فتحة الرؤية تُقطع في الضلفات المسطحة والمقولبة. هذه الضلفة فيها بانوهات - استخدم صفوف الزجاج.')}>
            <Row label={L('Vision panel', 'فتحة الرؤية')} off={!flushy}><Toggle on={design.glass.vision && flushy} onChange={(v) => set('glass.vision', v)} label={L('Vision panel', 'فتحة الرؤية')} /></Row>
            <Row label={L('Width', 'العرض')} off={!flushy || !design.glass.vision}>{nf('glass.vw', design.glass.vw, R.vw, L('Vision width (mm)', 'عرض الفتحة (مم)'), { step: 10 })}</Row>
            <Row label={L('Height', 'الارتفاع')} off={!flushy || !design.glass.vision}>{nf('glass.vh', design.glass.vh, R.vh, L('Vision height (mm)', 'ارتفاع الفتحة (مم)'), { step: 10 })}</Row>
            <Row label={L('Centre height from the floor', 'ارتفاع المركز عن الأرض')} off={!flushy || !design.glass.vision}>{nf('glass.vcy', design.glass.vcy, R.vcy, L('Vision centre height (mm)', 'ارتفاع مركز الفتحة (مم)'), { step: 10 })}</Row>
          </Card>
        </>
      );
      case 'frame': return (
        <>
          <Card title={L('Frame (lining)', 'الحلق')} note={design.type === 'barn' ? L('A barn door hangs on a track on the wall: no frame.', 'باب الجرار معلق على سكة بالجدار: بلا حلق.') : L('Rebated jambs and head with an integral stop. Jamb depth follows the wall unless you set it.', 'جوانب ورأس بشق ومصد مدمج. عمق الحلق يتبع الجدار ما لم تحدده.')}>
            <Row label={L('Frame', 'الحلق')} off={design.type === 'barn'}><Toggle on={design.frame.on && design.type !== 'barn'} onChange={(v) => set('frame.on', v)} label={L('Frame', 'الحلق')} /></Row>
            <Row label={L('Jamb thickness', 'سماكة الحلق')} off={!S.frameOn}>{nf('frame.jambThk', design.frame.jambThk, R.jambThk, L('Jamb thickness (mm)', 'سماكة الحلق (مم)'), { step: 1 })}</Row>
            <Row label={L('Rebate depth (stop)', 'عمق الشق (المصد)')} off={!S.frameOn}>{nf('frame.rebate', design.frame.rebate, R.rebate, L('Rebate depth (mm)', 'عمق الشق (مم)'), { step: 1 })}</Row>
            <Row label={L('Packing gap to the wall', 'فراغ الحشو عن الجدار')} off={!S.frameOn}>{nf('frame.pack', design.frame.pack, R.pack, L('Packing gap (mm)', 'فراغ الحشو (مم)'), { step: 1 })}</Row>
            <Row label={L('Jamb depth', 'عمق الحلق')} off={!S.frameOn}>
              <Seg label={L('Jamb depth', 'عمق الحلق')} value={design.frame.jambDepth ? 'set' : 'auto'} onChange={(v) => set('frame.jambDepth', v === 'auto' ? 0 : design.opening.wall)} options={[['auto', L('= wall', '= الجدار')], ['set', L('Set', 'محدد')]]} />
              {design.frame.jambDepth > 0 && nf('frame.jambDepth', design.frame.jambDepth, [60, 400], L('Jamb depth (mm)', 'عمق الحلق (مم)'), { step: 5 })}
            </Row>
            <Row label={L('Profile', 'الشكل')} off={!S.frameOn}>{chips(FRAME_PROFILES, design.frame.profile, (v) => set('frame.profile', v), L('Frame profile', 'شكل الحلق'))}</Row>
            <Row label={L('Threshold', 'العتبة')} off={!S.frameOn}>{chips(THRESHOLDS, design.frame.threshold, (v) => set('frame.threshold', v), L('Threshold', 'العتبة'), (v) => (v === 'flat' ? t2('flatT', ar) : t2(v, ar)))}</Row>
            <Row label={L('Threshold height', 'ارتفاع العتبة')} off={!S.frameOn || design.frame.threshold === 'none'}>{nf('frame.thrH', design.frame.thrH, R.thrH, L('Threshold height (mm)', 'ارتفاع العتبة (مم)'), { step: 1 })}</Row>
          </Card>
          <Card title={L('Architrave', 'الكورنيش')}>
            <Row label={L('Architrave', 'الكورنيش')} off={!S.frameOn}><Toggle on={design.frame.arch.on && S.frameOn} onChange={(v) => set('frame.arch.on', v)} label={L('Architrave', 'الكورنيش')} /></Row>
            <Row label={L('Width', 'العرض')} off={!design.frame.arch.on}>{nf('frame.arch.w', design.frame.arch.w, R.archW, L('Architrave width (mm)', 'عرض الكورنيش (مم)'), { step: 5 })}</Row>
            <Row label={L('Thickness', 'السماكة')} off={!design.frame.arch.on}>{nf('frame.arch.t', design.frame.arch.t, R.archT, L('Architrave thickness (mm)', 'سماكة الكورنيش (مم)'), { step: 1 })}</Row>
            <Row label={L('Reveal', 'التراجع')} off={!design.frame.arch.on}>{nf('frame.arch.reveal', design.frame.arch.reveal, R.reveal, L('Reveal (mm)', 'التراجع (مم)'), { step: 1 })}</Row>
            <Row label={L('Profile', 'الشكل')} off={!design.frame.arch.on}>{chips(ARCH_PROFILES, design.frame.arch.profile, (v) => set('frame.arch.profile', v), L('Architrave profile', 'شكل الكورنيش'))}</Row>
            <Row label={L('Sides', 'الجوانب')} off={!design.frame.arch.on}><Seg label={L('Architrave sides', 'جوانب الكورنيش')} value={design.frame.arch.sides} onChange={(v) => set('frame.arch.sides', v)} options={[['both', L('Both sides', 'الجانبان')], ['one', L('Outside only', 'الخارج فقط')]]} /></Row>
          </Card>
        </>
      );
      case 'hardware': return (
        <>
          <Card title={L('Swing', 'اتجاه الفتح')} note={L('Handing is read from OUTSIDE: RH = hinges on the right. "In" opens into the room, away from you.', 'اليد تُقرأ من الخارج: RH = المفصلات يمين. "للداخل" يفتح إلى الغرفة بعيدًا عنك.')}>
            <Row label={L('Hand', 'اليد')} off={design.type === 'double'}><Seg label={L('Hand', 'اليد')} value={design.swing.hand} onChange={(v) => set('swing.hand', v)} options={[['LH', L('Left hand', 'يسار')], ['RH', L('Right hand', 'يمين')]]} /></Row>
            <Row label={L('Active leaf (lock)', 'الضلفة الفعالة (القفل)')} off={design.type !== 'double'}><Seg label={L('Active leaf', 'الضلفة الفعالة')} value={design.swing.active} onChange={(v) => set('swing.active', v)} options={[['left', L('Left leaf', 'اليسرى')], ['right', L('Right leaf', 'اليمنى')]]} /></Row>
            <Row label={L('Opens', 'يفتح')} off={S.slides}><Seg label={L('Swing direction', 'اتجاه الفتح')} value={design.swing.dir} onChange={(v) => set('swing.dir', v)} options={[['in', L('In', 'للداخل')], ['out', L('Out', 'للخارج')]]} /></Row>
            {S.slides && <p className="nk-sub nkd-note">{L('Hand sets the side it slides to; In / Out puts the barn track on the inside or outside wall.', 'اليد تحدد جهة السحب؛ للداخل / للخارج يضع سكة الجرار على الجدار الداخلي أو الخارجي.')}</p>}
          </Card>
          <Card title={L('Hinges', 'المفصلات')} note={S.slides ? L('A sliding door has no hinges.', 'الباب المنزلق بلا مفصلات.') : L(`Top hinge 150 mm from the head, bottom 225 mm from the foot. Auto picks ${W.hingeCount} for ${W.weight.join(' + ')} kg.`, `المفصلة العلوية 150 مم من الرأس والسفلية 225 مم من القدم. التلقائي يختار ${W.hingeCount} لوزن ${W.weight.join(' + ')} كغ.`)}>
            <Row label={L('Hinge type', 'نوع المفصلة')} off={S.slides}>{chips(HINGE_TYPES, design.hinges.type, (v) => set('hinges.type', v), L('Hinge type', 'نوع المفصلة'))}</Row>
            <Row label={L('Count per leaf', 'العدد لكل ضلفة')} off={S.slides}>
              <Seg label={L('Hinge count mode', 'نمط العدد')} value={design.hinges.count ? 'set' : 'auto'} onChange={(v) => set('hinges.count', v === 'auto' ? 0 : W.hingeCount)} options={[['auto', L('Auto', 'تلقائي')], ['set', L('Set', 'محدد')]]} />
              {design.hinges.count > 0 && <Step value={design.hinges.count} min={R.hingeCount[0]} max={R.hingeCount[1]} label={L('Hinges', 'المفصلات')} onChange={(v) => set('hinges.count', v)} />}
            </Row>
            <Row label={L('Top hinge, from the head', 'المفصلة العلوية، من الرأس')} off={S.slides || design.hinges.type === 'pivot'}>{nf('hinges.top', design.hinges.top, R.hingeTop, L('Top hinge from the head (mm)', 'المفصلة العلوية من الرأس (مم)'), { step: 5 })}</Row>
            <Row label={L('Bottom hinge, from the foot', 'المفصلة السفلية، من القدم')} off={S.slides || design.hinges.type === 'pivot'}>{nf('hinges.bottom', design.hinges.bottom, R.hingeBot, L('Bottom hinge from the foot (mm)', 'المفصلة السفلية من القدم (مم)'), { step: 5 })}</Row>
            {!S.slides && <p className="nk-sub nkd-note" data-testid="hinge-ys">{L('Hinge centres from the floor (mm): ', 'مراكز المفصلات من الأرض (مم): ')}<span dir="ltr">{W.scene.hingeYs.map((y) => Math.round((y + S.y0) * 10) / 10).join(' · ')}</span></p>}
            <Row label={L('Hinge length', 'طول المفصلة')} off={S.slides || design.hinges.type === 'pivot'}>{nf('hinges.len', design.hinges.len, R.hingeLen, L('Hinge length (mm)', 'طول المفصلة (مم)'), { step: 1 })}</Row>
          </Card>
          <Card title={L('Lock and handle prep', 'تجهيز القفل والمقبض')}>
            <Row label={L('Lock', 'القفل')}><Toggle on={design.lock.on} onChange={(v) => set('lock.on', v)} label={L('Lock', 'القفل')} /></Row>
            <Row label={L('Handle', 'المقبض')} off={!design.lock.on}>{chips(HANDLES, design.lock.handle, (v) => set('lock.handle', v), L('Handle', 'المقبض'))}</Row>
            <Row label={L('Backset', 'الباكست')} off={!design.lock.on}>{nf('lock.backset', design.lock.backset, R.backset, L('Backset (mm)', 'الباكست (مم)'), { step: 1 })}</Row>
            <Row label={L('Handle height from the floor', 'ارتفاع المقبض عن الأرض')} off={!design.lock.on}>{nf('lock.handleH', design.lock.handleH, R.handleH, L('Handle height (mm)', 'ارتفاع المقبض (مم)'), { step: 5 })}</Row>
            <Row label={L('Euro cylinder bore', 'ثقب السلندر')} off={!design.lock.on}><Toggle on={design.lock.cyl} onChange={(v) => set('lock.cyl', v)} label={L('Euro cylinder', 'سلندر يورو')} /></Row>
          </Card>
          <Card title={L('Hardware list', 'قائمة الاكسسوارات')}>
            <table className="nk-table nk-table-sm"><tbody>{hardware.map((h) => <tr key={h.k}><td className="nk-td-name">{ar ? h.ar : h.en}</td><td className="nk-mono nk-qty" dir="ltr">{h.qty} {h.unit}</td></tr>)}</tbody></table>
          </Card>
        </>
      );
      default: return (
        <>
          <Card title={L('Ventilation', 'التهوية')}>
            <Row label={L('Ventilation', 'التهوية')}>{chips(VENTS, design.vent.mode, (v) => set('vent.mode', v), L('Ventilation', 'التهوية'))}</Row>
            <Row label={L('Under-cut gap', 'فجوة التهوية السفلية')} off={design.vent.mode !== 'undercut'}>{nf('vent.gap', design.vent.gap, R.ventGap, L('Under-cut gap (mm)', 'فجوة التهوية السفلية (مم)'), { step: 1 })}</Row>
            <Row label={L('Grille width', 'عرض الشبكة')} off={design.vent.mode !== 'grille'}>{nf('vent.grW', design.vent.grW, R.grW, L('Grille width (mm)', 'عرض الشبكة (مم)'), { step: 10 })}</Row>
            <Row label={L('Grille height', 'ارتفاع الشبكة')} off={design.vent.mode !== 'grille'}>{nf('vent.grH', design.vent.grH, R.grH, L('Grille height (mm)', 'ارتفاع الشبكة (مم)'), { step: 10 })}</Row>
          </Card>
          <Card title={L('Fire rating', 'مقاومة الحريق')} note={L('A note for the workshop and the quote: FD30 / FD60 need a solid or engineered core, a 44 / 54 mm leaf, 3+ hinges, intumescent seals and a closer. The checks flag what does not comply.', 'ملاحظة للورشة وعرض السعر: FD30 / FD60 تحتاج قلبًا صلبًا أو هندسيًا وضلفة 44 / 54 مم و3 مفصلات أو أكثر وشرائط منتفخة وذراع إغلاق. الفحوصات تنبّه لما لا يتوافق.')}>
            <Row label={L('Rating', 'التصنيف')}>{chips(FIRE, design.fire.rating, (v) => set('fire.rating', v), L('Fire rating', 'مقاومة الحريق'), (v) => (v === 'none' ? t2('none', ar) : v))}</Row>
            <Row label={L('Note', 'ملاحظة')}><input type="text" className="nk-inp nk-inp-wide" dir="auto" maxLength={200} value={design.fire.note} onChange={(e) => set('fire.note', e.target.value, 'fire.note')} aria-label={L('Fire note', 'ملاحظة الحريق')} placeholder={L('e.g. certificate no., test report', 'مثال: رقم الشهادة')} /></Row>
          </Card>
          {design.type === 'barn' && (
            <Card title={L('Barn door', 'باب الجرار')}>
              <Row label={L('Overlap each side', 'التراكب من كل جانب')}>{nf('barn.overlap', design.barn.overlap, R.overlap, L('Overlap (mm)', 'التراكب (مم)'), { step: 5 })}</Row>
              <Row label={L('Cover above the opening', 'التغطية فوق الفتحة')}>{nf('barn.cover', design.barn.cover, R.cover, L('Cover (mm)', 'التغطية (مم)'), { step: 5 })}</Row>
            </Card>
          )}
          {checks}
        </>
      );
    }
  };

  /* ---------- render ---------- */
  const legend = LEGEND.filter(([kk]) => !(kk === 'louvre' && k !== 'louvre') && !(kk === 'glass' && !bom.rows.some((r) => r.mat === 'glass')));
  const layoutName = `${TYPE_LABEL[design.type][0]} · ${S.leafW}×${S.leafH}`; const layoutNameAr = `${TYPE_LABEL[design.type][1]} · ${S.leafW}×${S.leafH}`;
  const priceTxt = `${price.currency} ${price.total.toFixed(3)}`;
  return (
    <div className={`nk nk-dr${ar ? ' nk-rtl' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={lang} onKeyDown={onKeyDown} data-testid="neo-doors" data-compact={compact ? '1' : '0'} data-view={view} data-panel-open={panelOpen ? '1' : '0'} data-panel-mode={drawer ? 'drawer' : 'dock'} data-asst={asstOpen ? (asstDocked ? 'dock' : 'float') : 'off'}>
      <header className="nk-head">
        <div className="nk-brand">
          <span className="nk-logo" aria-hidden="true">N</span>
          <div className="nk-title-wrap">
            <div className="nk-appname">{L('Neo Doors Designer', 'مصمم أبواب نيو')}</div>
            <div className="nk-subtitle">{L('THE CLOSETS · NEO STUDIO', 'الخزائن · استوديو نيو')}</div>
          </div>
          <input className="nk-title" aria-label={L('Project title', 'عنوان المشروع')} value={design.title} maxLength={80} onChange={(e) => set('title', e.target.value, 'title')} />
        </div>
        <div className="nk-right">
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Undo (Ctrl+Z)', 'تراجع (Ctrl+Z)')} aria-label={L('Undo', 'تراجع')} disabled={!canUndo} onClick={undo} data-testid="undo"><Ic n="undo" /></button>
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Redo (Ctrl+Y)', 'إعادة (Ctrl+Y)')} aria-label={L('Redo', 'إعادة')} disabled={!canRedo} onClick={redo} data-testid="redo"><Ic n="redo" /></button>
          <span className="nk-saved-chip nkd-price nk-mono nkd-hd" role="status" data-testid="door-price" title={L('PLACEHOLDER rates: the owner has not supplied a door price list. Not for quoting.', 'أسعار تقريبية: لم يزوّد المالك قائمة أسعار الأبواب. لا تُستخدم للتسعير.')}>{priceTxt} <small>{L('placeholder', 'تقريبي')}</small></span>
          <QuoteLauncher className="nkd-quote nkd-hd" lang={lang} user={currentUser} toast={toast} disabled={errs > 0} disabledReason={L('Fix the errors in the checks first', 'أصلح الأخطاء في الفحوصات أولًا')} getContext={() => doorsCtx({ d: designRef.current, W, price, onAdvanced: sendToQuote, apply: (d) => commit(d, 'quote:describe') })} />
          <FileMenu lang={lang} layout="straight" dirty={dirty} open={menu === 'file'} wrapRef={menuRef}
            onToggle={() => setMenu(menu === 'file' ? null : 'file')} onClose={() => setMenu(null)} onResetCamera={() => setCam('reset')}
            onSave={() => { doExport('json'); notifyExplicitSave('neo-doors'); }} onLoadFile={importFile}
            onNewEmpty={() => loadDesign(blankDesign(), L('New blank door. Undo brings the previous one back.', 'باب فارغ جديد. التراجع يعيد السابق.'))}
            onDefault={() => loadDesign(defaultDesign(), L('Default door loaded. Undo brings the previous one back.', 'تم تحميل الباب الافتراضي. التراجع يعيد السابق.'))}
            nouns={{ layout: [layoutName, layoutNameAr], empty: ['New — blank door', 'جديد — باب فارغ'], def: ['Default door', 'الباب الافتراضي'], discard: ['Discard the current door?', 'تجاهل الباب الحالي؟'] }} />
          <DoorExportMenu lang={lang} onExport={doExport} log={exportsLog} />
          <button type="button" className="nk-btn nkd-quote nkd-hd" disabled={errs > 0} onClick={sendToQuote} data-testid="door-quote" title={errs > 0 ? L('Fix the errors in the checks first', 'أصلح الأخطاء في الفحوصات أولًا') : L('Open in Quote Max (advanced, placeholder rates)', 'فتح في Quote Max (متقدم، أسعار تقريبية)')}>{L('Quote Max', 'Quote Max')}</button>
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
              {TABS.map(([tk, ic, en, a]) => (
                <button key={tk} type="button" role="tab" id={`nkd-tab-${tk}`} aria-selected={tab === tk} tabIndex={tab === tk ? 0 : -1} className="nk-rt" data-tab={tk} onClick={() => setTab(tk)}>
                  <Ic n={ic} size={20} /><span className="nk-rt-t">{ar ? a : en}</span>
                </button>
              ))}
            </nav>
            <div className="nk-pcol">
              <div role="tabpanel" aria-labelledby={`nkd-tab-${tab}`} className="nk-panel-scroll nkd-panel" data-panel={tab}>
                <div className="nkd-actions" role="group" aria-label={L('Door actions', 'إجراءات الباب')}>
                  <span className="nk-saved-chip nkd-price nk-mono">{priceTxt} <small>{L('placeholder', 'تقريبي')}</small></span>
                  <QuoteLauncher testid="nq-open-m" lang={lang} user={currentUser} toast={toast} disabled={errs > 0} getContext={() => doorsCtx({ d: designRef.current, W, price, onAdvanced: sendToQuote, apply: (d) => commit(d, 'quote:describe') })} />
                  <button type="button" className="nk-btn" disabled={errs > 0} onClick={sendToQuote} data-testid="door-quote-m">{L('Open in Quote Max (advanced)', 'فتح في Quote Max (متقدم)')}</button>
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
                  selUnitId={info && info.leaf != null ? `leaf${info.leaf}` : null} selLabel={info ? (ar ? info.ar : info.name) : ''} onClose={() => setOpenBar(false)} />
              )}
              {view === 'design' && (
                <>
                  <div className="nk-modebar" role="group" aria-label={L('Drawing controls', 'عناصر تحكم الرسم')} data-testid="elev-bar">
                    <Seg className="nk-seg-run" label={L('Drawing view', 'عرض الرسم')} value={drawView} onChange={setDrawView} options={[['elev', L('ELEVATION', 'واجهة')], ['plan', L('PLAN', 'مسقط')]]} />
                    <span className="nk-mb-sep" aria-hidden="true" />
                    <label className="nk-chk"><input type="checkbox" checked={dimsOn} onChange={(e) => setDims(e.target.checked)} /> {L('Dimensions', 'الأبعاد')}</label>
                    <label className="nk-chk"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> {L('Internal', 'داخلي')}</label>
                    <label className="nk-chk"><input type="checkbox" checked={mapOn} onChange={(e) => setMap(e.target.checked)} /> {L('Callouts', 'أرقام مرجعية')}</label>
                    <label className="nk-chk nk-chk-hdl" title={L('Drag the blue handles on the drawing to change sizes; arrow keys nudge a focused handle', 'اسحب المقابض الزرقاء على الرسم لتغيير المقاسات؛ مفاتيح الأسهم تحرّك المقبض المحدد')}><input type="checkbox" data-testid="handles-toggle" checked={handlesOn} onChange={(e) => setHandlesOn(e.target.checked)} /> {L('Handles', 'المقابض')}</label>
                    <label className="nk-chk"><input type="checkbox" checked={center} onChange={(e) => setCenter(e.target.checked)} /> {L('Centre lines', 'خطوط المنتصف')}</label>
                    {(errs > 0 || warns > 0) && <button type="button" className="nkd-warnchip" data-level={errs ? 'error' : 'warn'} onClick={() => setView('cut')} data-testid="warn-chip"><Ic n="warn" size={14} />{errs ? L(`${errs} error${errs > 1 ? 's' : ''}`, `${errs} خطأ`) : ''}{errs && warns ? ' · ' : ''}{warns ? L(`${warns} warning${warns > 1 ? 's' : ''}`, `${warns} تنبيه`) : ''}</button>}
                  </div>
                  <div className="nkd-legend nk-legend" role="group" aria-label={L('Part types (click to isolate)', 'أنواع القطع (انقر للعزل)')}>
                    {legend.map(([kk, en, a]) => (
                      <button key={kk} type="button" className="nk-lg" aria-pressed={isolate === kk} onClick={() => setIsolate(isolate === kk ? null : kk)}><span className={`nkd-sw nkd-t-${kk}`} />{ar ? a : en}</button>
                    ))}
                  </div>
                  <div className="nk-draw nkd-drawwrap" data-testid="elevation-wrap">
                    <DoorDrawing W={W} d={design} view={drawView} ui={ui} selected={sel} onSelect={setSel} lang={lang} zoom={zoom} handleList={handleList} onHandle={onHandle} />
                  </div>
                </>
              )}
              {view === '3d' && (
                <>
                  {explode.on && (
                    <div className="nk-exbar" role="group" aria-label={L('Explode', 'تفكيك')}>
                      <b>{L('Explode', 'تفكيك')}</b>
                      <input type="range" className="nk-range" min={0} max={100} value={Math.round(explode.amt * 100)} aria-label={L('Explode amount', 'مقدار التفكيك')} onChange={(e) => setExplode({ ...explode, amt: +e.target.value / 100 })} data-testid="explode-slider" />
                      <span className="nk-mono" dir="ltr">{Math.round(explode.amt * 100)}%</span>
                      <button type="button" className="nk-btn" onClick={() => setCam('fit')}><Ic n="fit" size={16} /> {L('Fit', 'ملاءمة')}</button>
                    </div>
                  )}
                  <div className="nk-3dwrap">
                    <Door3D W={W} d={design} ui={ui} lang={lang} onSelect={setSel} camCmd={camCmd} sel={sel} onToggleFront={onToggleFront} poseRef={poseRef} label={['3D door view. Arrow keys move the view, + and - zoom, 0 refits.', 'عرض ثلاثي الأبعاد للباب. الأسهم لتحريك العرض، + و - للتكبير، 0 للإعادة.']} />
                  </div>
                  <div className="nk-hint" data-hint3d="1">{hold
                    ? L('Camera held (L to release) · click to select · double-click the leaf to open it', 'الكاميرا مثبتة (L للإلغاء) · انقر للتحديد · نقرتان على الضلفة لفتحها')
                    : L('Drag to orbit · right/Shift-drag or two fingers to pan · scroll to zoom to the cursor · double-click the leaf to open it, another part to focus · L holds', 'اسحب للدوران · زر أيمن/Shift أو إصبعان للتحريك · العجلة للتكبير نحو المؤشر · نقرتان على الضلفة لفتحها وعلى قطعة للتركيز · L للتثبيت')}</div>
                </>
              )}
              {view === 'cut' && (
                <div className="nk-cutwrap" data-testid="cutlist">
                  <DoorCutList W={W} d={design} lang={lang} onExport={doExport} notify={notify} user={currentUser && (currentUser.id || currentUser.email) ? String(currentUser.id || currentUser.email) : ''} />
                </div>
              )}
              {info && view !== 'cut' && (
                <div className="nk-foot"><div className="nk-selcard" role="region" aria-label={L('Selected part', 'القطعة المحددة')} data-testid="sel-card">
                  <span className={`nkd-sw nkd-t-${info.ptype === 'core' ? 'leaf' : info.ptype}`} />
                  <div className="nk-sel-t">
                    <b dir="auto">{info.no ? `#${info.no} · ` : ''}{ar ? info.ar : info.name}</b>
                    <small dir="ltr" data-testid="sel-meta">{selDims(info.dims)}{info.mat ? ` · ${ar ? info.matAr : info.mat}` : ''}{info.area != null ? ` · ${info.area.toFixed(3)} m²` : ''}</small>
                  </div>
                  <button type="button" className="nk-btn nk-btn-primary" disabled={!info.openable} title={info.openable ? undefined : L('Nothing to open on this selection', 'لا يوجد ما يُفتح في هذا التحديد')} onClick={toggleOpenSel} data-testid="sel-open">{L('Open', 'فتح')}</button>
                  <button type="button" className="nk-btn nk-btn-ghost" onClick={() => { setAsstSeed({ text: '', n: Date.now() }); setAsstOpen(true); }} data-testid="sel-ai">{L('Ask Haneen', 'اسأل حنين')}</button>
                  <button type="button" className="nk-ib" aria-label={L('Close', 'إغلاق')} onClick={() => setSel(null)} data-testid="sel-close"><Ic n="close" size={16} /></button>
                </div></div>
              )}
            </div>
            {vtools}
          </div>
          <div className="nk-status" role="status" aria-live="polite" data-testid="status">{status}</div>
        </main>

        {asstOpen && (
          <DoorAssistant design={design} W={W} lang={lang} seed={asstSeed} docked={asstDocked} onLang={setLang} selectedLabel={info ? (ar ? info.ar : info.name) : ''}
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
        <div className="nk-print-root nk-dr" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
          <div className="nk-print-sheet">
            <h1>{design.title}</h1>
            <p>Neo Doors Designer · {new Date().toLocaleDateString()} · {S.OW} × {S.OH} × {S.wall} mm · {TYPE_LABEL[design.type][ar ? 1 : 0]}</p>
            {['elev', 'plan'].map((v) => (
              <figure key={v} className="nk-print-fig nkd-print-fig"><figcaption>{v === 'elev' ? L('Elevation (from outside)', 'الواجهة (من الخارج)') : L('Plan', 'المسقط')}</figcaption>
                <div style={{ height: '110mm' }}><DoorDrawing W={W} d={design} view={v} ui={{ ...ui, dims: true, internal: false, map: true, center: false, isolate: null, layers: ALL_LAYERS }} selected={null} onSelect={() => {}} lang={lang} testid={`print-${v}`} /></div>
              </figure>
            ))}
          </div>
          <div className="nk-print-sheet nk-print-bom"><DoorCutList W={W} d={design} lang={lang} onExport={() => {}} compact /></div>
        </div>,
        document.body,
      )}
    </div>
  );
}
