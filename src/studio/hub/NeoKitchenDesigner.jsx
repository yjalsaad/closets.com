/* =============================================================================
 * Neo Kitchen Designer (nav id 'neo-kitchen') - parametric kitchen CAD, a clone of One Kitchen Designer
 * (Bridge Kitchen Designer by Future Design) plus Neo extras (marked NEW in the UI).
 * Pure client state - NO Supabase, NO CADi engine, NO new npm packages. Three.js r128 loads from the CDN on demand.
 * Everything visual comes from DESIGN.md tokens (see src/neoKitchen/neoKitchen.css); the model / geometry / BOM / DXF /
 * assistant live in src/neoKitchen/*.js as pure, unit-tested functions.
 * ===========================================================================*/
import './neoKitchen/cssOrder'; // [CI-CSS-ORDER] must stay the first import: fixes the shared stylesheet order
import { wsShowFactory } from './wsFlags'; // [WEB-STUDIO]
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './neoKitchen/neoKitchen.css';
import {
  makeInitial, normalizeModel, makeHistory, pushHistory, undoHistory, redoHistory, setUnitWidth, setGlobal, patchUnit, setSectionHeight, clamp,
  isTall, layoutName, syncLayout, xlKind,
} from './neoKitchen/model';
import { buildScene } from './neoKitchen/geometry';
import { buildBOM, buildHardware, buildWarnings } from './neoKitchen/cutlist';
import { buildDXF } from './neoKitchen/dxf';
import { projectJSON, parseProject, bomCSV, bomData, estimate, DEFAULT_PRICES, download, safeName, saveLocal, loadLocal, clearLocal } from './neoKitchen/exporters';
import { FINISHES, COUNTERS, PART_TYPES, TALL_H } from './neoKitchen/constants';
import { Seg, useDismiss } from './neoKitchen/ui';
import { Ic, Tool } from './neoKitchen/icons';
import { VIEW_ORDER } from './neoKitchen/cameraViews';
import { CategoryPanel } from './neoKitchen/CategoryPanels';
import Elevation from './neoKitchen/Elevation';
import { useHandlesPref } from './neoHandles/HandleLayer';
import { kitchenHandles } from './neoHandles/kitchenHandles';
import { createHandleDispatch } from './neoHandles/handleModel';
import Kitchen3D, { Category3DList } from './neoKitchen/Kitchen3D';
import LookPresets from './neoKitchen/LookPresets';
import { loadLook, saveLook, lookTitle, lookOf, clampSun } from './neoKitchen/lookProfiles';
import CutListView from './neoKitchen/CutListView';
import { hydrate as hydrateDoc, snapshot as snapshotDoc, useDocStore } from './neoKitchen/docStore';
import ExportMenu from './neoKitchen/ExportMenu';
import { useOutput } from './neoKitchen/OutputSettingsControl';
import { applyProjectOutput, outputForProject, isDefaultOutput, getOutput } from './neoKitchen/outputSettings';
import { GlobalPanel, MSPanel, LibraryPanel, ProjectPanel, NewBadge } from './neoKitchen/Panels';
import DrillPlan from './neoKitchen/DrillPlan'; // [NEO-HINGES-UX35] the selected part's drilling plan
import { drillPlan } from './neoKitchen/hingeHw';
import BaseScreen from './neoKitchen/BaseScreen';
import { LegScreen, MainRowScreen } from './neoKitchen/RowScreens';
import LayoutScreen from './neoKitchen/LayoutScreens';
import EndElevation from './neoKitchen/EndElevation';
import './neoKitchen/layoutIcons29';
import AssistantPanel from './neoKitchen/AssistantPanel';
import UnitAssistCard from './neoKitchen/UnitAssistCard';
import OpenControl from './neoKitchen/OpenControl';
import './neoKitchen/wsIcons';
import { loadWsPrefs, saveWsPrefs, frontIds, groupIdsOfPart, toggleIds, clampSpeed, SPEED } from './neoKitchen/workspace3d';
import './neoKitchen/workspace3d.css';
import PanelResizer from './neoKitchen/PanelResizer';
import ConfirmDialog from './neoKitchen/ConfirmDialog';
import VtMenu from './neoKitchen/VtMenu';
import { useEdgeFade } from './neoKitchen/useEdgeFade';
import { LAYOUT, planLayout, clampWidth, stageTier, headTier, fitHeight } from './neoKitchen/layoutLogic';
import { clampFloatRect, defaultFloatRect, cleanFloatRect } from './neoKitchen/floatRect';
import FileMenu from './neoKitchen/FileMenu';
import { useMedia } from './neoKitchen/useMedia';
import QuoteLauncher from './neoQuote/QuoteLauncher'; // [NEO-QUOTE-UX33] shared Quote builder
import { kitchenCtx } from './neoQuote/contexts';
import { makeEmptyKitchen, makeDefaultKitchen, isDirty, MAX_IMPORT_BYTES } from './neoKitchen/fileMenuLogic';
import './neoKitchen/workspace.css';
import { usePublishDesignMeta, notifyExplicitSave } from './neoLeads/leadContext';

const LAYERS = [['base', 'Base', 'سفلي'], ['wall', 'Wall', 'علوي'], ['top', 'Top', 'ثالث'], ['counter', 'Counter', 'السطح'], ['plinth', 'Plinth', 'القاعدة'], ['doors', 'Doors', 'الأبواب'], ['hardware', 'Hardware', 'الاكسسوار']];
/* sidebar categories: the owner's seven components (same keys as the layer toggles) plus the original Global / M&S / L-run / Library / Project tabs */
const TABS = [['global', 'Global', 'عام'], ['ms', 'M&S', 'المواد'], ['base', 'Base', 'سفلي'], ['wall', 'Wall', 'علوي'], ['top', 'Top', 'ثالث'], ['counter', 'Counter', 'السطح'], ['plinth', 'Plinth', 'القاعدة'], ['doors', 'Doors', 'الأبواب'], ['hardware', 'Hardware', 'الاكسسوار'], ['left', 'L-Left', 'L يسار'], ['right', 'L-Right', 'L يمين'], ['run2', 'Run 2', 'الصف ٢'], ['pen', 'Peninsula', 'الجزيرة الممتدة'], ['isl', 'Island', 'الجزيرة'], ['library', 'Library', 'مكتبة'], ['project', 'Project', 'مشروع']];
/** NEO-KITCHEN-UX29: the Kitchen group of the category bar follows the layout - Single wall / L / U keep the L-Left / L-Right tabs (they switch the legs on),
 *  a galley shows Run 2, a peninsula Peninsula, an island Island (the tab of the run that exists) */
const KIND_TAB = { galley: 'run2', peninsula: 'pen', island: 'isl' };
const navGroupsFor = (kind) => [['Kitchen', 'المطبخ', ['global', 'ms', ...(kind ? [KIND_TAB[kind]] : ['left', 'right'])]], ['Parts', 'الأجزاء', ['base', 'wall', 'top', 'counter', 'plinth', 'doors', 'hardware']], ['Project', 'المشروع', ['library', 'project']]];
const RUN_TAB_KEYS = ['run2', 'pen', 'isl'];
/** names of the runs in the run selectors (EN, AR) */
const RUN_SEL = { main: ['MAIN', 'رئيسي'], left: ['LEFT', 'يسار'], right: ['RIGHT', 'يمين'], run2: ['RUN 2', 'الصف ٢'], pen: ['PENINSULA', 'الجزيرة الممتدة'], isl: ['ISLAND', 'الجزيرة'] };

const FRONT_TYPES = ['door', 'drawer', 'flip', 'glass', 'cover'];
/** selection-card helpers: row label (EN / AR) and "w × thickness × h" in the project's unit */
const ROW_LBL = { tall: ['Tall row', 'صف الطويلة'], base: ['Base row', 'صف سفلي'], wall: ['Wall row', 'صف علوي'], top: ['Top row', 'صف ثالث'] };
const selDims = (d, unit) => (unit === 'cm' ? `${d.map((v) => Math.round(v) / 10).join(' × ')} cm` : unit === 'in' ? `${d.map((v) => (v / 25.4).toFixed(2)).join(' × ')} in` : `${d.map((v) => Math.round(v * 10) / 10).join(' × ')} mm`);

function loadInitial(startLang) { // [WEB-STUDIO] startLang
  const s = loadLocal();
  if (s && s.model) { try { const { model } = normalizeModel(s.model); return { model, prices: s.prices || DEFAULT_PRICES, unit: s.unit === 'in' ? 'in' : 'mm', lang: (startLang || s.lang) === 'ar' ? 'ar' : 'en', restored: s.at || true, docInfo: s.docInfo || null }; } catch (e) { /* fall through */ } }
  return { model: makeInitial(), prices: DEFAULT_PRICES, unit: 'mm', lang: startLang === 'ar' ? 'ar' : 'en', restored: false };
}

export default function NeoKitchenDesigner({ currentUser, toast, startLang }) {
  const init = useRef(null);
  const userKey = currentUser && (currentUser.id || currentUser.email || currentUser.name) ? String(currentUser.id || currentUser.email || currentUser.name) : ''; // [NEO-CUTLIST-UX32] scopes the saved table view and the company details
  if (!init.current) { init.current = loadInitial(startLang); if (init.current.restored) hydrateDoc(init.current.docInfo); } // [NEO-CUTLIST-UX32] project details come back with the autosave
  const [lang, setLang] = useState(init.current.lang);
  const [hist, setHist] = useState(() => makeHistory(init.current.model));
  const [prices, setPrices] = useState(init.current.prices);
  const [output, setOut] = useOutput(); // [NEO-OUTPUT-UX34] units + precision: the shared Output setting (the old mm / in toggle is its unit)
  const unit = output.unit;
  const setUnit = useCallback((u) => setOut({ unit: u === 'in' || u === 'cm' ? u : 'mm' }), [setOut]);
  useEffect(() => { if (init.current.restored && init.current.unit === 'in' && isDefaultOutput(getOutput())) setOut({ unit: 'in' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [restored, setRestored] = useState(init.current.restored);
  const [view, setView] = useState('design');
  const [tab, setTab] = useState('global');
  const [activeRun, setActiveRun] = useState('main');
  const [elevEnd, setElevEnd] = useState(false); // UX29: the END view of a peninsula / island instead of its front elevation
  const [legRow, setLegRow] = useState('base');
  const [layers, setLayers] = useState({ base: true, wall: true, top: true, counter: true, plinth: true, doors: true, hardware: true });
  const [xray, setXray] = useState(false);
  const [explode, setExplode] = useState({ on: false, mode: 'levels', amt: 1, diagram: true });
  const [openBar, setOpenBar] = useState(false); // UX-21: the Open control bar (the toolbar Open button); what is open lives in openIds
  const [openIds, setOpenIds] = useState(() => new Set());
  const wsPrefs = useRef(null); if (!wsPrefs.current) wsPrefs.current = loadWsPrefs(); // per-user workspace preferences (guarded localStorage)
  const [hold, setHold] = useState(!!wsPrefs.current.hold); // UX-21: Hold camera (lock icon, key L)
  const [focusMode, setFocusMode] = useState(false); // UX-21: Focus / Full workspace (key Shift+F) - session only on purpose
  const [openSpeed, setOpenSpeed] = useState(() => clampSpeed(wsPrefs.current.speed === undefined ? SPEED.def : wsPrefs.current.speed));
  const [openScope, setOpenScope] = useState(wsPrefs.current.scope || 'all');
  const [toolsOpen, setToolsOpen] = useState(() => (wsPrefs.current.tools !== undefined ? wsPrefs.current.tools : !(typeof window !== 'undefined' && window.innerWidth <= 640)));
  const poseRef = useRef(null);
  const [dimsOn, setDims] = useState(true);
  const [handlesOn, setHandlesOn] = useHandlesPref(); // [NEO-HANDLES-UX36] the SMART HANDLES on the drawing (remembered)
  const [internal, setInternal] = useState(false);
  const [mapOn, setMap] = useState(false);
  const [center, setCenter] = useState(false);
  const [isolate, setIsolate] = useState(null);
  const [panelOpen, setPanelOpen] = useState(() => !(typeof window !== 'undefined' && window.innerWidth < 1024) && wsPrefs.current.panel !== false); // docked on desktop (unless the user collapsed it last time), closed (slide-in / sheet) on tablet + phone
  const autoFit = useRef(false); // the first measurement may fold the panel / assistant that the window-based defaults opened
  const [guides, setGuides] = useState(true);
  const [camCmd, setCamCmd] = useState(null);
  const narrow = useMedia('(max-width: 640px)');
  /* UX-23 workspace: three columns (Parameters | stage | assistant) sized from the width the designer REALLY has (measured), each resizable and
   * remembered. `bodyW` falls back to the window width where nothing can be measured (tests, first paint). */
  const rootRef = useRef(null);
  const bodyRef = useRef(null);
  const [meas, setMeas] = useState({ root: 0, body: 0, bodyH: 0, h: 0 });
  const [panelPref, setPanelPref] = useState(() => (wsPrefs.current.panelW !== undefined ? clampWidth('panel', wsPrefs.current.panelW) : LAYOUT.PANEL.def));
  const [asstPref, setAsstPref] = useState(() => (wsPrefs.current.asstW !== undefined ? clampWidth('asst', wsPrefs.current.asstW) : LAYOUT.ASST.def));
  const [asstPrefMode, setAsstPrefMode] = useState(wsPrefs.current.asstMode || 'float'); // 'float' (default: a window over the drawing, no layout width) | 'dock' (side column, when there is room)
  const [asstOpen, setAsstOpen] = useState(() => wsPrefs.current.asst === true && !(typeof window !== 'undefined' && window.innerWidth <= 640));
  const [asstRect, setAsstRect] = useState(() => cleanFloatRect(wsPrefs.current.asstRect)); // remembered position + size of the floating window (null = default placement)
  const asstMemo = useRef({}); // the conversation + the pending proposal survive collapsing the assistant
  const [asstSeed, setAsstSeed] = useState(null);
  const [sel, setSel] = useState(null);
  const [drillOpen, setDrillOpen] = useState(false); // [NEO-HINGES-UX35] Drilling plan of the selected part
  const [menu, setMenu] = useState(null); // 'look' | 'file' | 'export'
  const [lighting, setLighting] = useState('neutral');
  const [grid, setGrid] = useState(true);
  const [lk, setLk] = useState(() => loadLook()); // 3D Look preset + sun elevation: lights / environment only, kept across Design <-> 3D
  const setLook = (look) => { const n = { ...lk, look: lookOf(look) }; setLk(n); saveLook(n.look, n.sun); };
  const setSun = (sun) => { const n = { ...lk, sun: clampSun(sun) }; setLk(n); saveLook(n.look, n.sun); };
  const [fitTick, setFitTick] = useState(0);
  const [exportsLog, setExportsLog] = useState([]);
  const [printing, setPrinting] = useState(false);
  const [autosaveAt, setAutosaveAt] = useState('');
  const [saveState, setSaveState] = useState('saved'); // 'saving' while an edit waits for the autosave, 'failed' when the browser refused it
  const [status, setStatus] = useState('');
  const menuRef = useRef(null);
  const statusT = useRef(null);
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);

  const model = hist.present;
  /* File menu (UX-18): the last saved / loaded / created model (null = restored from autosave, never saved to a file) -> `dirty` drives the discard confirmation */
  const modelJson = useMemo(() => JSON.stringify(model), [model]);
  const [savedJson, setSavedJson] = useState(() => (init.current.restored ? null : JSON.stringify(init.current.model)));
  const dirty = isDirty(modelJson, savedJson);
  const commit = useCallback((next, key) => { if (next) setHist((h) => pushHistory(h, syncLayout(next), key)); }, []); // syncLayout: a galley's run 2 keeps following the main run length (no-op for every other layout)
  const goTab = useCallback((k) => { setTab(k); setPanelOpen(true); }, []);
  const undo = useCallback(() => setHist((h) => undoHistory(h)), []);
  const redo = useCallback(() => setHist((h) => redoHistory(h)), []);
  const notify = useCallback((m) => {
    setStatus(m); clearTimeout(statusT.current); statusT.current = setTimeout(() => setStatus(''), 4500);
    if (typeof toast === 'function') { try { toast(m); } catch (e) { /* ignore */ } }
  }, [toast]);
  useEffect(() => () => clearTimeout(statusT.current), []);
  /* [NEO-CUTLIST-UX32] a cut list row -> the same selection the drawing and the 3D view use (cabinet + part), shown in the 3D view */
  const pickPart = useCallback((row) => { const rep = row && row.rep; if (!rep || !rep.unitId) return; if (rep.runKey) { setActiveRun(rep.runKey); setElevEnd(false); } setSel({ unitId: rep.unitId, partId: rep.id, label: row.name }); setView('3d'); }, []);
  useDismiss(!!menu, () => setMenu(null), menuRef);

  /* ---- UX-21 / UX-23 workspace: remembered per user (guarded localStorage); the sidebar / dock states only count on the screens where they dock ---- */
  const bodyW = meas.body > 0 ? meas.body : (typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => { saveWsPrefs({ hold, speed: openSpeed, scope: openScope, tools: toolsOpen }); }, [hold, openSpeed, openScope, toolsOpen]);
  useEffect(() => { if (typeof window !== 'undefined' && window.innerWidth >= 1024) saveWsPrefs({ panel: panelOpen }); }, [panelOpen]);
  const panelShown = panelOpen && !focusMode; // Focus / Full workspace hides every panel without forgetting which ones were open
  const asstShown = asstOpen && !focusMode;
  const wl = useMemo(() => planLayout({ bodyW, panelOn: panelShown, asstOn: asstShown, panelPref, asstPref, asstPrefMode }), [bodyW, panelShown, asstShown, panelPref, asstPref, asstPrefMode]);
  const dock = wl.asstMode === 'dock'; // true = the assistant docks beside the drawing when open (and collapses to a slim rail); false = floating popover / bottom sheet + round button
  const drawerPanel = wl.panelMode === 'drawer';
  const tier = stageTier(wl.stageW);
  const htier = headTier(meas.root > 0 ? meas.root : bodyW);
  useEffect(() => { saveWsPrefs({ asst: asstOpen }); }, [asstOpen]);
  const bodyH = meas.bodyH > 0 ? meas.bodyH : 700;
  const floatRect = useMemo(() => clampFloatRect(asstRect || defaultFloatRect(bodyW, bodyH, ar), bodyW, bodyH), [asstRect, bodyW, bodyH, ar]);
  const commitRect = useCallback((r) => { setAsstRect(r); saveWsPrefs({ asstRect: r }); }, []);
  /* the handles call onChange then onCommit in the same tick: the latest widths live in a ref so the remembered value is the one just set */
  const widthsRef = useRef({ panelW: panelPref, asstW: asstPref });
  const changePanelW = useCallback((w) => { widthsRef.current.panelW = w; setPanelPref(w); }, []);
  const changeAsstW = useCallback((w) => { widthsRef.current.asstW = w; setAsstPref(w); }, []);
  const rememberWidths = useCallback(() => saveWsPrefs({ panelW: widthsRef.current.panelW, asstW: widthsRef.current.asstW }), []);
  const toggleAsst = () => setAsstOpen((o) => !o);
  const setAsstMode = (m) => { setAsstPrefMode(m); saveWsPrefs({ asstMode: m }); };

  /* measure the designer: its own width (header tiers), the body (column plan) and the height the Hub page really leaves it */
  useLayoutEffect(() => {
    const root = rootRef.current; const body = bodyRef.current; if (!root || !body) return undefined;
    const scrollerOf = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight >= p.clientHeight) return p; } return null; };
    const read = () => {
      const rr = root.getBoundingClientRect(); const bb = body.getBoundingClientRect(); const bw = Math.round(bb.width); const bhh = Math.round(bb.height);
      const sc = scrollerOf(root); let h = 0;
      if (sc && sc.clientHeight > 0) {
        const offTop = rr.top - sc.getBoundingClientRect().top + sc.scrollTop;
        const pad = root.parentElement ? parseFloat(getComputedStyle(root.parentElement).paddingBottom) || 0 : 0;
        h = fitHeight({ scrollerH: sc.clientHeight, offsetTop: offTop, padBottom: pad + 4, min: 560 });
      }
      setMeas((m) => (m.root === Math.round(rr.width) && m.body === bw && m.bodyH === bhh && m.h === h ? m : { root: Math.round(rr.width), body: bw, bodyH: bhh, h }));
    };
    read();
    window.addEventListener('resize', read);
    if (!window.ResizeObserver) return () => window.removeEventListener('resize', read);
    const ro = new window.ResizeObserver(read); ro.observe(root); ro.observe(body); const sc = scrollerOf(root); if (sc) ro.observe(sc);
    /* [UI-STD6] content above the designer (the lead banner, the page bar) settling after mount moves it without resizing it: watch the
       wrappers between it and the scroller too, or the first (min 560px) height sticks and leaves an empty band under the drawing */
    for (let p = root.parentElement; p && p !== sc; p = p.parentElement) ro.observe(p);
    return () => { window.removeEventListener('resize', read); ro.disconnect(); };
  }, []);
  /* the first real measurement: a panel / assistant that the window-based defaults opened but the real width cannot dock starts folded (never over the drawing) */
  useEffect(() => {
    if (autoFit.current || meas.body <= 0) return;
    autoFit.current = true;
    if (meas.body < LAYOUT.DRAWER_BELOW) setPanelOpen(false);
  }, [meas.body, dock]);
  const toggleTools = () => { setToolsOpen((o) => !o); setMenu((m) => (m === 'views' || m === 'layers' ? null : m)); };

  const scene = useMemo(() => buildScene(model), [model]);
  const bom = useMemo(() => buildBOM(scene), [scene]);
  const hardware = useMemo(() => buildHardware(scene), [scene]);
  const warnings = useMemo(() => buildWarnings(scene), [scene]);
  const est = useMemo(() => estimate(model, bom, hardware, prices), [model, bom, hardware, prices]);
  usePublishDesignMeta('neo-kitchen', { price: est.total, currency: prices.currency }); // [NEO-LEADS-UX37] the number the studio shows, for the lead's Designs list

  /* legs switched off while their tab / elevation is open */
  useEffect(() => {
    if (activeRun !== 'main' && !scene.runs.some((r) => r.key === activeRun)) setActiveRun('main');
    if (sel && !scene.runs.some((r) => r.units.some((x) => x.unit.id === sel.unitId))) setSel(null);
  }, [model, activeRun, sel, scene]);
  useEffect(() => {
    if (tab === 'left' || tab === 'right') { if (model.legs[tab].on) setActiveRun(tab); }
    else if (RUN_TAB_KEYS.includes(tab)) { if (scene.runs.some((r) => r.key === tab)) setActiveRun(tab); }
    else if (tab === 'base' || tab === 'wall' || tab === 'top') { if (activeRun !== 'main' && !scene.runs.some((r) => r.key === activeRun)) setActiveRun('main'); }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the category bar follows the layout: a tab of a run the new layout does not have is left for Global */
  const kind = xlKind(model);
  const navGroups = useMemo(() => navGroupsFor(kind), [kind]);
  const navKeys = useMemo(() => navGroups.flatMap((g) => g[2]), [navGroups]);
  useEffect(() => { if (!navKeys.includes(tab)) setTab('global'); }, [navKeys, tab]);

  /* autosave (local, this browser only) */
  const docSt = useDocStore(); // [NEO-CUTLIST-UX32] production document settings: the project details are saved with the project
  useEffect(() => {
    setSaveState('saving');
    const t = setTimeout(() => {
      if (saveLocal({ model, prices, unit: unit === 'in' ? 'in' : 'mm', lang, docInfo: snapshotDoc(), at: new Date().toISOString() })) { setAutosaveAt(new Date().toLocaleTimeString()); setSaveState('saved'); } else setSaveState('failed');
    }, 600);
    return () => clearTimeout(t);
  }, [model, prices, unit, lang, docSt.project, docSt.opts]);

  /* keyboard undo / redo (not while typing) */
  const onKeyDown = (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    /* UX-21: Esc closes, one layer at a time: a popover first (useDismiss), then the Open bar, then Focus mode; L holds the camera; Shift+F toggles Focus */
    if (e.key === 'Escape' && !menu) { if (openBar) { setOpenBar(false); return; } if (focusMode) { setFocusMode(false); return; } }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.target.type !== 'range') {
      if ((e.key === 'l' || e.key === 'L') && !e.shiftKey && view === '3d') { e.preventDefault(); setHold((h) => !h); return; }
      if (e.key === 'F' && e.shiftKey) { e.preventDefault(); setFocusMode((f) => !f); return; }
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    }
  };

  /* ----------------------------- exports ----------------------------- */
  const logExport = (name) => setExportsLog((l) => [...l, `${name} ${new Date().toLocaleTimeString()}`]);
  const doExport = useCallback((kind) => {
    setMenu(null);
    const base = safeName(model.title);
    if (kind === 'json') { download(`${base}.json`, projectJSON(model, { prices, unit: unit === 'in' ? 'in' : 'mm', output: outputForProject(), cutList: bomData(bom, model), docInfo: snapshotDoc() }), 'application/json'); logExport('JSON'); setSavedJson(modelJson); notify(L('Project JSON saved.', 'تم حفظ المشروع JSON.')); }
    else if (kind === 'dxf') { download(`${base}.dxf`, buildDXF(scene, bom, output), 'application/dxf'); logExport('DXF'); notify(L('DXF (R12) exported.', 'تم تصدير DXF (R12).')); }
    else if (kind === 'csv') { download(`${base}-cutlist.csv`, bomCSV(bom, model.matMap, output), 'text/csv'); logExport('CSV'); notify(L('Cut list CSV exported.', 'تم تصدير قائمة القص CSV.')); }
    else if (kind === 'print') { setPrinting(true); }
  }, [model, modelJson, prices, unit, output, scene, bom, ar]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => { try { window.print(); } catch (e) { /* ignore */ } if (!window.matchMedia || !('onafterprint' in window)) setTimeout(done, 400); }, 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printing]);
  const importFile = useCallback((file) => {
    if (file && file.size > MAX_IMPORT_BYTES) { notify(L('Import failed: the file is too large. Your kitchen was not changed.', 'فشل الاستيراد: الملف كبير جدًا. لم يتغير مطبخك.')); return; }
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const r = parseProject(String(rd.result));
        commit(r.model, `import:${Date.now()}`); if (r.prices) setPrices(r.prices); if (r.output) applyProjectOutput(r.output); else if (r.unit === 'in') setUnit('in'); hydrateDoc(r.docInfo); setSel(null); setSavedJson(JSON.stringify(r.model)); setRestored(false);
        notify(r.issues.length ? L(`Imported with ${r.issues.length} value(s) clamped to the spec ranges.`, `تم الاستيراد مع ضبط ${r.issues.length} قيمة على المدى المسموح.`) : L('Project imported.', 'تم استيراد المشروع.'));
      } catch (e) { notify(L(`Import failed: ${e.message}. Your kitchen was not changed.`, `فشل الاستيراد: ${e.message}. لم يتغير مطبخك.`)); }
    };
    rd.onerror = () => notify(L('Could not read the file. Your kitchen was not changed.', 'تعذرت قراءة الملف. لم يتغير مطبخك.'));
    rd.readAsText(file);
  }, [commit, notify, ar]); // eslint-disable-line react-hooks/exhaustive-deps
  const [barSlot, setBarSlot] = useState(null); // the zoom group of the drawing is rendered INSIDE the viewport tools column (one less row above the drawing)
  const [askNew, setAskNew] = useState(false); // the in-UI "Start a new project?" confirmation (ConfirmDialog; no native confirm())
  const resetAll = useCallback(() => setAskNew(true), []);
  const doReset = useCallback(() => { setAskNew(false); commit(makeInitial(), 'reset'); setSel(null); clearLocal(); hydrateDoc(null); setRestored(false); }, [commit]);

  /* File > New (empty) / Default kitchen: one undoable step (unique history key, so two in a row never merge); the confirmation is in FileMenu */
  const loadKitchen = useCallback((kind) => {
    const m = kind === 'empty' ? makeEmptyKitchen() : makeDefaultKitchen();
    commit(m, `new:${Date.now()}`); setSel(null); hydrateDoc(null); setRestored(false); setSavedJson(JSON.stringify(m));
    notify(kind === 'empty' ? L('New empty kitchen. Undo brings the previous one back.', 'مطبخ فارغ جديد. التراجع يعيد المطبخ السابق.') : L('Default kitchen loaded. Undo brings the previous one back.', 'تم تحميل المطبخ الافتراضي. التراجع يعيد المطبخ السابق.'));
  }, [commit, notify, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------ on-canvas drag edits ------------------------ */
  const onDrag = useCallback((ev) => {
    const rk = ev.run; const arr = model.runs[rk][ev.row]; const u = arr.find((x) => x.id === ev.unitId); if (!u) return;
    const inst = scene.runs.find((r) => r.key === rk)?.units.find((x) => x.unit.id === ev.unitId);
    if (ev.kind === 'width') { const r = setUnitWidth(model, rk, ev.row, ev.unitId, ev.value); commit(r.model, `drag:w:${ev.unitId}`); }
    else if (ev.kind === 'height') {
      if (u.type === 'tall') { const h = clamp(Math.round(ev.value - ev.y0), TALL_H.min, TALL_H.max); commit(patchUnit(model, rk, ev.row, ev.unitId, (x) => ({ ...x, h })), `drag:h:${ev.unitId}`); }
      else { const k = ev.row === 'base' ? 'baseH' : ev.row === 'wall' ? 'wallH' : 'topH'; commit(setGlobal(model, k, Math.round(ev.value - ev.y0)).model, `drag:g:${k}`); }
    } else if (ev.kind === 'section' && inst) {
      const h = ev.keyMode ? inst.bounds[ev.si].top - ev.value : ev.top - ev.value;
      commit(setSectionHeight(model, rk, ev.row, ev.unitId, ev.si, h, inst.H), `drag:s:${ev.unitId}:${ev.si}`);
    }
  }, [model, scene, commit]);
  const resize = useCallback((unitId, row, rk, w) => { const r = setUnitWidth(model, rk, row, unitId, w); commit(r.model, `mm:${unitId}`); }, [model, commit]);

  /* ------------------------------ selection ------------------------------ */
  const selInfo = useMemo(() => {
    if (!sel) return null;
    let inst = null; let rk = null;
    scene.runs.forEach((r) => r.units.forEach((x) => { if (x.unit.id === sel.unitId) { inst = x; rk = r.key; } }));
    if (!inst) return null;
    const part = sel.partId ? scene.parts.find((p) => p.id === sel.partId) : null;
    const row = bom.rows.find((r) => part && r.rep && r.name === `${part.group} ${/^S\d/.test(part.name) ? '' : '- '}${part.name}`.replace('  ', ' '));
    const anim = (p) => !!(p.anim && (p.anim.k === 'door' || p.anim.k === 'flip' || p.anim.k === 'drawer'));
    return {
      name: part ? `${inst.label} - ${part.name}` : inst.label,
      dims: part ? [part.ext.w, part.ext.d, part.ext.h] : [inst.W, inst.D, inst.H], // width x thickness (depth) x height, as the reference shows them
      mat: part ? (row ? row.matName : part.mat) : null, // null = the carcass (localised where it is shown)
      rowKey: inst.row === 'base' ? (inst.tall ? 'tall' : 'base') : inst.row, inst, rk, part,
      // a part opens itself; a whole unit opens every door / drawer it has
      openable: part ? anim(part) : scene.parts.some((p) => p.unitId === inst.unit.id && anim(p)),
    };
  }, [sel, scene, bom]);
  /* selection is one state shared by the 2D drawing, the 3D view, the selected-cabinet card and the parameter editor: picking a cabinet in the
   * drawing brings its card in the Parameters panel into view (and picking a card selects it in the drawing) */
  const selUnitId = sel ? sel.unitId : null;
  useEffect(() => {
    if (!selUnitId || typeof document === 'undefined') return;
    const el = document.getElementById(`nk-unit-${selUnitId}`);
    const sc = el && el.closest ? el.closest('.nk-panel-scroll') : null; // scroll only the parameter column - never the Hub page around the designer
    if (el && sc) { const er = el.getBoundingClientRect(); const sr = sc.getBoundingClientRect(); if (er.top < sr.top) sc.scrollTop += er.top - sr.top - 8; else if (er.bottom > sr.bottom) sc.scrollTop += er.bottom - sr.bottom + 8; }
  }, [selUnitId]);
  const aiCtx = useMemo(() => ({
    run: activeRun, row: tab === 'wall' ? 'wall' : tab === 'top' ? 'top' : 'base',
    selected: selInfo ? { row: selInfo.inst.row, id: selInfo.inst.unit.id, rk: selInfo.rk } : null, selectedLabel: selInfo ? selInfo.name : '',
  }), [activeRun, tab, selInfo]);

  /* UX-21 open / close: openIds is the one UI-state set of part ids that are open (never in the model / BOM). The selection card toggles
   * the selected part's front, or every front of the selected unit; the Open bar (OpenControl) applies the same set to all / one unit by kind. */
  const selIds = useMemo(() => (selInfo ? (selInfo.part ? groupIdsOfPart(scene, selInfo.part.id) : frontIds(scene, { unitId: selInfo.inst.unit.id })) : []), [selInfo, scene]);
  const selIsOpen = selIds.length > 0 && selIds.some((i) => openIds.has(i));
  const toggleOpenSel = () => {
    if (!selInfo || !selInfo.openable) return;
    setOpenIds((s) => toggleIds(s, selIds));
  };
  const onToggleFront = useCallback((partId) => setOpenIds((s) => toggleIds(s, groupIdsOfPart(scene, partId))), [scene]);
  const openEverything = (on) => { setOpenBar(on); setOpenIds(on ? new Set(frontIds(scene)) : new Set()); };
  const aiEdit = () => {
    if (!selInfo) { setAsstOpen(true); return; }
    setAsstSeed({ text: `${selInfo.inst.row} ${selInfo.inst.idx + 1} `, n: Date.now() }); setAsstOpen(true);
  };

  const uiCmd = useCallback((c) => {
    if (c.action === 'view') setView(c.value);
    else if (c.action === 'xray') setXray(!!c.value);
    else if (c.action === 'explode') { setExplode((e) => ({ ...e, on: !!c.value })); if (c.value) setView('3d'); }
    else if (c.action === 'open') { openEverything(!!c.value); if (c.value) setView((v) => (v === 'cut' ? '3d' : v)); }
    else if (c.action === 'units') setUnit(c.value);
    else if (c.action === 'print') doExport('print');
    else if (c.action === 'dxf') doExport('dxf');
    else if (c.action === 'json') doExport('json');
  }, [doExport, scene]); // eslint-disable-line react-hooks/exhaustive-deps

  /* [NEO-HANDLES-UX36] the shared handle layer: built from the model + scene for the run on screen, committed through the same setters as the panel (one undo step per drag) */
  const hdlSeq = useRef({ n: 0 });
  const onHandle = useMemo(() => createHandleDispatch(commit, hdlSeq.current), [commit]);
  const handleList = useMemo(() => kitchenHandles({ model, scene, runKey: activeRun, selected: sel, layers }), [model, scene, activeRun, sel, layers]);
  const ui = { handles: handlesOn, layers, xray, explode, openDoors: false, openIds, openSpeed, hold, dims: dimsOn, internal, map: mapOn, center, wall: true, isolate, lighting, grid, guides, look: lk.look, sun: lk.sun };
  const P = { model, lang, unit, setUnit, commit, goTab, scene, sel, setSel, resize, activeRun, legRow, setLegRow, notify, prices, setPrices, importFile, resetAll, undo, redo, canUndo: hist.past.length > 0, canRedo: hist.future.length > 0, autosaveAt, doExport, bom, currentUser, saveState, downloadFile: download };

  const runKeys = scene.runs.map((r) => r.key);
  /* UX29 elevation selector: Single wall / L / U keep MAIN + LEFT + RIGHT (an absent leg is shown disabled with the reason); a galley adds RUN 2,
   * a peninsula / island its own front elevation AND an end view */
  const showEnd = elevEnd && (activeRun === 'pen' || activeRun === 'isl') && runKeys.includes(activeRun);
  const elevOptions = kind
    ? [['main', L('MAIN', 'رئيسي')], ...runKeys.filter((k) => k !== 'main').flatMap((k) => (k === 'run2' ? [[k, L(RUN_SEL[k][0], RUN_SEL[k][1])]] : [[k, L(RUN_SEL[k][0], RUN_SEL[k][1])], [`${k}:end`, L(`${k === 'pen' ? 'PENINSULA' : 'ISLAND'} END`, `نهاية ${RUN_SEL[k][1]}`)]]))]
    : ['left', 'main', 'right'].map((k) => [k, L(RUN_SEL[k][0], RUN_SEL[k][1]),
      runKeys.includes(k) ? undefined : L('Turn on an L / U layout (L-Left / L-Right tab) to draw this run', 'فعّل تخطيط L أو U (تبويب L-يسار / L-يمين) لرسم هذا الصف'), !runKeys.includes(k)]);
  const toggleExplode = () => { setExplode((e) => ({ ...e, on: !e.on })); if (!explode.on) setView('3d'); };
  const toggleOpen = () => { openEverything(!openBar); if (view === 'cut') setView('3d'); }; // one click opens everything and shows the bar, the next closes everything and hides it
  const toggleLayer = (k) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const showRunSel = scene.runs.length > 1;
  const setCam = (name) => { setCamCmd({ n: Date.now(), name }); setMenu(null); };
  const tabLabel = (k) => { const t = TABS.find((x) => x[0] === k); return ar ? t[2] : t[1]; };
  const railRef = useRef(null);
  useEdgeFade(railRef, tab);
  const onNavKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const fwd = e.key === 'ArrowDown' || e.key === (ar ? 'ArrowLeft' : 'ArrowRight');
    const bwd = e.key === 'ArrowUp' || e.key === (ar ? 'ArrowRight' : 'ArrowLeft');
    if (!fwd && !bwd) return;
    e.preventDefault();
    const i = navKeys.indexOf(tab); const nx = navKeys[(i + (fwd ? 1 : -1) + navKeys.length) % navKeys.length];
    setTab(nx); const el = e.currentTarget.querySelector(`[data-tab="${nx}"]`); if (el) el.focus();
  };

  const panelBody = () => {
    switch (tab) {
      case 'global': return <GlobalPanel P={P} />;
      case 'ms': return <MSPanel P={P} />;
      case 'wall': case 'top': return <MainRowScreen P={P} row={tab} rk={activeRun === 'run2' ? 'run2' : 'main'} layers={layers} toggleLayer={toggleLayer} />;
      case 'base': return <BaseScreen P={P} rk={activeRun} layers={layers} toggleLayer={toggleLayer} />;
      case 'counter': case 'plinth': case 'doors': case 'hardware': return <CategoryPanel cat={tab} P={P} layers={layers} toggleLayer={toggleLayer} goTab={goTab} />;
      case 'left': return <LegScreen P={P} side="left" layers={layers} toggleLayer={toggleLayer} />;
      case 'right': return <LegScreen P={P} side="right" layers={layers} toggleLayer={toggleLayer} />;
      case 'run2': case 'pen': case 'isl': return <LayoutScreen P={P} rk={tab} layers={layers} toggleLayer={toggleLayer} />;
      case 'library': return <LibraryPanel P={P} />;
      default: return <ProjectPanel P={P} />;
    }
  };

  const legend = (
    <div className="nk-legend" role="group" aria-label={L('Part types (click to isolate)', 'أنواع القطع (انقر للعزل)')}>
      {PART_TYPES.map((t) => (
        <button key={t.k} type="button" className="nk-lg" aria-pressed={isolate === t.k} onClick={() => setIsolate(isolate === t.k ? null : t.k)}>
          <span className={`nk-sw nk-pt nk-pt-${t.k}`} />{t[lang]}{isolate === t.k && <small className="nk-lg-on">{L('Isolated', 'معزول')}</small>}
        </button>
      ))}
    </div>
  );
  const layerBar = (
    <div className="nk-layers" role="group" aria-label={L('Layers', 'الطبقات')}>
      {LAYERS.map(([k, en, a]) => (
        <button key={k} type="button" className="nk-layer" aria-pressed={layers[k]} data-hidden={layers[k] ? '0' : '1'} onClick={() => toggleLayer(k)} title={layers[k] ? L('Hide', 'إخفاء') : L('Show', 'إظهار')}>
          <span className="nk-layer-i"><Ic n={layers[k] ? 'eye' : 'eyeOff'} size={16} /></span><span className="nk-layer-t">{ar ? a : en}</span><span className="nk-layer-s">{layers[k] ? L('Shown', 'ظاهر') : L('Hidden', 'مخفي')}</span>
        </button>
      ))}
    </div>
  );

  /* tooltips explain each tool (CSS tooltip on hover / keyboard focus; the accessible name is the visible label) */
  const TIP = {
    design: L('2D elevation with live dimensions - drag handles to resize', 'واجهة ثنائية الأبعاد بأبعاد حية - اسحب المقابض لتغيير الحجم'),
    '3d': L('Interactive 3D model - orbit, pan and zoom', 'نموذج ثلاثي الأبعاد تفاعلي - دوران وتحريك وتكبير'),
    cut: L('Cut list, hardware and cost estimate', 'قائمة القص والاكسسوار وتقدير التكلفة'),
    xray: L('See through the panels: hinge cups, shelf pins, grooves', 'رؤية عبر الألواح: كوبات المفصلات ومسامير الرفوف والمجاري'),
    explode: L('Pull the cabinets apart to see every part', 'فصل الوحدات لرؤية كل قطعة'),
    open: L('Open or close doors, drawers and flip-ups', 'فتح أو إغلاق الأبواب والأدراج والقلابة'),
    look: L('Finish, countertop, lighting and floor grid', 'التشطيب وسطح العمل والإضاءة وشبكة الأرضية'),
  };
  /* UX-21: every floating panel closes the same way - its toolbar button again, Esc, click outside, or this x */
  const popHead = (title) => (
    <div className="nk-pop-h">
      <b>{title}</b>
      <button type="button" className="nk-ib nk-pop-x" aria-label={L('Close', 'إغلاق')} data-testid="pop-close" onClick={() => setMenu(null)}><Ic n="close" size={16} /></button>
    </div>
  );
  const lookMenu = menu === 'look' && (
    <div className="nk-menu nk-menu-look" role="dialog" aria-label={L('Look', 'المظهر')}>
      {popHead(L('Look', 'المظهر'))}
      <LookPresets lang={lang} look={lk.look} sun={lk.sun} onLook={setLook} onSun={setSun} />
      <div className="nk-menu-h">{L('Finish', 'التشطيب')}</div>
      <div className="nk-chips">{Object.entries(FINISHES).map(([k, f]) => <button key={k} type="button" className="nk-chip" aria-pressed={model.finish === k} onClick={() => commit({ ...model, finish: k }, 'finish')}><span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}</button>)}</div>
      <div className="nk-menu-h">{L('Countertop', 'سطح العمل')} <NewBadge lang={lang} /></div>
      <div className="nk-chips">{Object.entries(COUNTERS).map(([k, f]) => <button key={k} type="button" className="nk-chip" aria-pressed={model.counter === k} onClick={() => commit({ ...model, counter: k }, 'counter')}><span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}</button>)}</div>
      {lk.look === 'standard' && <div className="nk-menu-h">{L('Lighting', 'الإضاءة')}</div>}
      {lk.look === 'standard' && <Seg label={L('Lighting', 'الإضاءة')} value={lighting} onChange={setLighting} options={[['neutral', L('Neutral', 'محايد')], ['warm', L('Warm', 'دافئ')], ['cool', L('Cool', 'بارد')]]} />}
      <label className="nk-menu-chk"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> {L('Floor grid', 'شبكة الأرضية')}</label>
    </div>
  );
  const folded = narrow || tier === 'tight'; // too little stage width for the full tool row: icon-only modes + the extras in the More menu (nothing is dropped)
  const MODES = [['design', 'design', L('Design', 'تصميم')], ['3d', 'view3d', L('3D View', 'ثلاثي')], ['cut', 'cut', L('Cut List', 'قائمة القص')]].filter((m) => m[0] !== 'cut' || wsShowFactory()); // [WEB-STUDIO]
  const modeGroup = (
    <div className="nk-tg" role="group" aria-label={L('View mode', 'نمط العرض')}>
      {MODES.map(([v, ic, lbl]) => <Tool key={v} icon={ic} label={lbl} tip={TIP[v]} pressed={view === v} className={view === v ? 'nk-tool-active' : ''} iconOnly={folded && view !== v} onClick={() => setView(v)} />)}
    </div>
  );
  const toolbar = (
    <div className="nk-ftb" role="toolbar" aria-label={L('Tools', 'الأدوات')} data-narrow={folded ? '1' : '0'}>
      {modeGroup}
      {!folded && (
        <>
          <span className="nk-tsep" aria-hidden="true" />
          <div className="nk-tg" role="group" aria-label={L('Visualisation', 'العرض المرئي')}>
            <Tool icon="xray" label={L('X-Ray', 'أشعة')} tip={TIP.xray} pressed={xray} iconOnly={tier === 'cozy'} onClick={() => setXray(!xray)} />
            <Tool icon="explode" label={L('Explode', 'تفكيك')} tip={TIP.explode} pressed={explode.on} iconOnly={tier === 'cozy'} onClick={toggleExplode} />
          </div>
          <span className="nk-tsep" aria-hidden="true" />
          <div className="nk-tg" role="group" aria-label={L('Cabinet', 'الخزانة')}>
            <Tool icon="open" label={L('Open', 'فتح')} tip={TIP.open} pressed={openBar} iconOnly={tier === 'cozy'} onClick={toggleOpen} data-testid="tool-open">{!openBar && openIds.size > 0 && <i className="nk-tool-dot" aria-hidden="true" />}</Tool>
            <div className="nk-menuwrap" ref={menu === 'look' ? menuRef : null}>
              <Tool icon="look" label={lk.look === 'standard' ? L('Look', 'المظهر') : lookTitle(lk.look, lang)} data-look-active={lk.look === 'standard' ? undefined : '1'} iconOnly={tier === 'cozy'} tip={TIP.look} expanded={menu === 'look'} onClick={() => setMenu(menu === 'look' ? null : 'look')} />
              {lookMenu}
            </div>
          </div>
        </>
      )}
      {folded && (
        <>
          <span className="nk-tsep" aria-hidden="true" />
          <div className="nk-menuwrap" ref={menu === 'tools' || menu === 'look' ? menuRef : null}>
            <Tool icon="more" iconOnly label={L('More tools', 'أدوات أخرى')} tip={L('X-Ray, Explode, Open, Look', 'أشعة، تفكيك، فتح، مظهر')} expanded={menu === 'tools' || menu === 'look'} onClick={() => setMenu(menu === 'tools' ? null : 'tools')} />
            {menu === 'tools' && (
              <div className="nk-menu nk-menu-r nk-menu-tools" role="menu">
                <button type="button" role="menuitemcheckbox" aria-checked={xray} className="nk-mi nk-mi-ic" onClick={() => setXray(!xray)}><Ic n="xray" />{L('X-Ray', 'أشعة')}</button>
                <button type="button" role="menuitemcheckbox" aria-checked={explode.on} className="nk-mi nk-mi-ic" onClick={toggleExplode}><Ic n="explode" />{L('Explode', 'تفكيك')}</button>
                <button type="button" role="menuitemcheckbox" aria-checked={openBar} className="nk-mi nk-mi-ic" onClick={() => { toggleOpen(); setMenu(null); }}><Ic n="open" />{L('Open', 'فتح')}</button>
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
    <div className="nk-vtools" role="toolbar" aria-label={L('Viewport tools', 'أدوات العرض')} data-open={toolsOpen ? '1' : '0'}>
      {/* UX-21 Tools strip: one click collapses the whole column to this strip, one click brings it back */}
      <button type="button" className="nk-vt-strip" aria-expanded={toolsOpen} aria-controls="nk-vt-body" data-testid="tools-strip" data-tip={toolsOpen ? L('Collapse the tools', 'طي الأدوات') : L('Show the tools', 'إظهار الأدوات')} onClick={toggleTools}>
        <span className="nk-vt-strip-t">{L('Tools', 'الأدوات')}</span><Ic n={toolsOpen ? 'up' : 'down'} size={12} />
      </button>
      {toolsOpen && <div className="nk-vt-body" id="nk-vt-body">
      {view === 'design' && (<><div className="nk-vt-h" role="presentation">{L('Zoom', 'تكبير')}</div><div className="nk-vt-zoom" ref={setBarSlot} /></>)}
      <div className="nk-vt-h" role="presentation">{L('View', 'العرض')}</div>
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
          <Tool nativeTip icon="fit" text={L('Fit', 'ملاءمة')} label={L('Fit to screen', 'ملاءمة الشاشة')} tip={L('Fit the whole kitchen in view (F, or double-click)', 'إظهار المطبخ كاملاً (F أو نقرتان)')} onClick={() => setCam('fit')} />
          <Tool nativeTip icon="reset" text={L('Reset', 'إعادة')} label={L('Reset camera', 'إعادة الكاميرا')} tip={L('Back to the opening angle (0)', 'العودة للزاوية الأولى (0)')} onClick={() => setCam('reset')} />
          <Tool nativeTip icon={hold ? 'lock' : 'unlock'} text={hold ? L('Held', 'مثبتة') : L('Hold', 'تثبيت')} label={L('Hold camera', 'تثبيت الكاميرا')} pressed={hold} data-testid="tool-hold"
            tip={hold ? L('Camera held: no auto re-fit and no accidental orbit - you can still pick parts (L to release)', 'الكاميرا مثبتة: لا ملاءمة تلقائية ولا دوران عرضي - يمكنك اختيار القطع (L للإلغاء)') : L('Hold the camera exactly where it is (L)', 'تثبيت الكاميرا في مكانها بالضبط (L)')} onClick={() => setHold(!hold)} />
          <Tool nativeTip icon="grid" text={L('Grid', 'الشبكة')} label={L('Floor grid', 'شبكة الأرضية')} tip={L('Show or hide the floor grid', 'إظهار أو إخفاء شبكة الأرضية')} pressed={grid} onClick={() => setGrid(!grid)} />
          <Tool nativeTip icon="guides" text={L('Guides', 'القياس')} label={L('Measurement guides', 'خطوط القياس')} tip={L('Overall width, height and depth lines', 'خطوط العرض والارتفاع والعمق الكلية')} pressed={guides} onClick={() => setGuides(!guides)} />
        </>
      )}
      <div className="nk-menuwrap" ref={menu === 'layers' ? menuRef : null}>
        <Tool nativeTip icon="layers" text={L('Layers', 'الطبقات')} label={L('Layers', 'الطبقات')} tip={L('Show or hide Base, Wall, Top, Counter, Plinth, Doors, Hardware', 'إظهار أو إخفاء السفلي والعلوي والثالث والسطح والقاعدة والأبواب والاكسسوار')} expanded={menu === 'layers'} onClick={() => setMenu(menu === 'layers' ? null : 'layers')}>
          {Object.values(layers).some((v) => !v) && <i className="nk-tool-dot" aria-hidden="true" />}
        </Tool>
        {menu === 'layers' && (
          <VtMenu anchorRef={menuRef} rtl={ar} className="nk-menu nk-menu-side nk-menu-layers" role="dialog" aria-label={L('Layers', 'الطبقات')}>
            {popHead(L('Layers', 'الطبقات'))}
            <div className="nk-lay-body">
              <section className="nk-lay-sec" aria-label={L('Layers', 'الطبقات')}>
                <div className="nk-lay-bulk" role="group" aria-label={L('All layers', 'كل الطبقات')}>
                  <button type="button" className="nk-btn" data-testid="layers-show-all" disabled={Object.values(layers).every(Boolean)} onClick={() => setLayers((l) => Object.fromEntries(Object.keys(l).map((k) => [k, true])))}>{L('Show all', 'إظهار الكل')}</button>
                  <button type="button" className="nk-btn" data-testid="layers-hide-all" disabled={Object.values(layers).every((v) => !v)} onClick={() => setLayers((l) => Object.fromEntries(Object.keys(l).map((k) => [k, false])))}>{L('Hide all', 'إخفاء الكل')}</button>
                </div>
                {layerBar}
              </section>
              {view === 'design' && (
                <section className="nk-lay-sec" aria-label={L('Part types', 'أنواع القطع')}>
                  <h4 className="nk-lay-h">{L('Part types - click to isolate', 'أنواع القطع - انقر للعزل')}</h4>
                  {legend}
                  {isolate && <button type="button" className="nk-btn nk-lay-clear" data-testid="isolate-clear" onClick={() => setIsolate(null)}>{L('Clear isolation', 'إلغاء العزل')}</button>}
                </section>
              )}
            </div>
          </VtMenu>
        )}
      </div>
      {/* UX-21 workspace group: the two docks and Focus. Each is its own button, so a panel is never more than one click away */}
      <span className="nk-vt-sep" aria-hidden="true" />
      <div className="nk-vt-h" role="presentation">{L('Panels', 'اللوحات')}</div>
      <Tool nativeTip icon={panelShown ? 'panelOn' : 'panelOff'} text={L('Params', 'المعاملات')} label={L('Parameters panel', 'لوحة المعاملات')} pressed={panelShown} data-testid="tool-panel" className="nk-ws-ic"
        tip={panelShown ? L('Collapse the Parameters panel for more room', 'اطوِ لوحة المعاملات لمساحة أكبر') : L('Show the Parameters panel', 'إظهار لوحة المعاملات')} onClick={() => { if (focusMode) { setFocusMode(false); setPanelOpen(true); } else setPanelOpen((o) => !o); }} />
      <Tool nativeTip icon="assistant" text={L('Assistant', 'المساعد')} label={L('Neo Assistant', 'مساعد نيو')} pressed={asstShown} data-testid="tool-asst"
        tip={asstShown ? L('Collapse the assistant', 'اطوِ المساعد') : L('Show the assistant', 'إظهار المساعد')} onClick={() => { if (focusMode) { setFocusMode(false); setAsstOpen(true); } else toggleAsst(); }} />
      <Tool nativeTip icon={focusMode ? 'unfocus' : 'focus'} text={L('Focus', 'تركيز')} label={L('Focus workspace', 'مساحة العمل الكاملة')} pressed={focusMode} data-testid="tool-focus"
        tip={focusMode ? L('Show the panels again (Shift+F or Esc)', 'إظهار اللوحات (Shift+F أو Esc)') : L('Hide every panel and use the whole screen (Shift+F)', 'إخفاء كل اللوحات واستخدام الشاشة كاملة (Shift+F)')} onClick={() => setFocusMode((f) => !f)} />
      </div>}
    </div>
  );

  return (
    <div ref={rootRef} className={`nk${ar ? ' nk-rtl' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={lang} onKeyDown={onKeyDown} data-testid="neo-kitchen" data-view={view} data-panel-open={panelShown ? '1' : '0'} data-panel-mode={wl.panelMode} data-asst={asstShown ? (dock ? 'dock' : 'float') : 'off'} data-focus={focusMode ? '1' : '0'} data-tools={toolsOpen ? '1' : '0'} data-hold={hold ? '1' : '0'}
      data-tier={tier} data-head={htier} style={{ '--nk-panel-w': `${wl.panelW}px`, '--nk-asst-w': `${wl.asstW}px`, ...(meas.h > 0 ? { '--nk-h': `${meas.h}px` } : null) }}>
      {/* ---------------- header ---------------- */}
      <header className="nk-head">
        <div className="nk-brand">
          <span className="nk-logo" aria-hidden="true">N</span>
          <div className="nk-title-wrap">
            <div className="nk-appname">{L('Neo Kitchen Designer', 'مصمم مطابخ نيو')}</div>
            <div className="nk-subtitle">{L('THE CLOSETS · NEO STUDIO', 'الخزائن · استوديو نيو')}</div>
          </div>
          <input className="nk-title" aria-label={L('Project title', 'عنوان المشروع')} value={model.title} maxLength={80} onChange={(e) => commit({ ...model, title: e.target.value }, 'title')} />
        </div>
        <div className="nk-right">
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Undo (Ctrl+Z)', 'تراجع (Ctrl+Z)')} aria-label={L('Undo', 'تراجع')} disabled={!hist.past.length} onClick={undo}><Ic n="undo" /></button>
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Redo (Ctrl+Y)', 'إعادة (Ctrl+Y)')} aria-label={L('Redo', 'إعادة')} disabled={!hist.future.length} onClick={redo}><Ic n="redo" /></button>
          <span className="nk-saved-chip" role="status" data-testid="autosave" data-saved={autosaveAt ? '1' : '0'}><i className="nk-saved-dot" aria-hidden="true" /><span className="nk-saved-t">{autosaveAt ? L(`Saved ${autosaveAt}`, `حُفظ ${autosaveAt}`) : L('Autosave on', 'الحفظ التلقائي مفعّل')}</span></span>
          <span className="nk-saved-chip nk-kprice" role="status" data-testid="kitchen-price" title={L('Estimate from the cut list and hardware list', 'تقدير من قائمة القص وقائمة الاكسسوارات')}>{`BD ${(Math.round(est.total * 100) / 100).toFixed(2)}`}</span>
          <QuoteLauncher lang={lang} user={currentUser} toast={toast} getContext={() => kitchenCtx({ model, scene, hardware, est })} />
          <FileMenu lang={lang} layout={layoutName(model)} dirty={dirty} open={menu === 'file'} wrapRef={menuRef}
            onToggle={() => setMenu(menu === 'file' ? null : 'file')} onClose={() => setMenu(null)} onResetCamera={() => setCam('reset')}
            onSave={() => { doExport('json'); notifyExplicitSave('neo-kitchen'); }} onLoadFile={importFile} onNewEmpty={() => loadKitchen('empty')} onDefault={() => loadKitchen('default')} />
          <ExportMenu user={userKey} lang={lang} unit={unit} model={model} scene={scene} bom={bom} hardware={hardware} warnings={warnings} ui={ui} onLegacy={doExport} log={exportsLog} onLog={logExport} notify={notify} />
          <Seg className="nk-lang" label={L('Language', 'اللغة')} value={lang} onChange={setLang} options={[['en', 'EN'], ['ar', 'ع']]} />
        </div>
      </header>

      {restored && (
        <div className="nk-banner" role="status">
          {L('Restored your autosaved project.', 'تمت استعادة مشروعك المحفوظ تلقائيًا.')}
          <button type="button" className="nk-btn" onClick={() => setRestored(false)}>{L('Keep', 'متابعة')}</button>
          <button type="button" className="nk-btn" onClick={resetAll}>{L('Start fresh', 'ابدأ من جديد')}</button>
        </div>
      )}

      <div ref={bodyRef} className={`nk-body${panelShown ? '' : ' nk-body-full'}`}>
        {/* ---------------- left sidebar: Parameters (docked on desktop, slide-in on tablet, bottom sheet on phones) ---------------- */}
        {panelShown && drawerPanel && <button type="button" className="nk-scrim" aria-label={L('Close parameters', 'إغلاق المعاملات')} onClick={() => setPanelOpen(false)} tabIndex={-1} />}
        <aside className={`nk-panel${panelShown ? '' : ' nk-panel-closed'}`} aria-label={L('Parameters', 'المعاملات')} aria-hidden={!panelShown} data-open={panelShown ? '1' : '0'} inert={panelShown ? undefined : ''}>
          <div className="nk-panel-head">
            <b>{L('Parameters', 'المعاملات')}</b>
            <button type="button" className="nk-hb nk-hb-ic" aria-expanded={panelOpen} aria-label={L('Collapse panel', 'طي اللوحة')} data-tip={L('Collapse the panel to give the 3D view more room', 'اطوِ اللوحة لتوسيع مساحة العرض')} onClick={() => setPanelOpen(false)}><Ic n={ar ? 'next' : 'prev'} /></button>
          </div>
          <div className="nk-panel-main">
            <nav className="nk-rail" role="tablist" aria-orientation="horizontal" aria-label={L('Control groups', 'مجموعات التحكم')} onKeyDown={onNavKey} ref={railRef}>
              {navGroups.map(([en, a, keys]) => (
                <div className="nk-rail-g" role="presentation" key={en}>
                  <span className="nk-rail-gt" aria-hidden="true">{ar ? a : en}</span>
                  {keys.map((k) => (
                    <button key={k} type="button" role="tab" id={`nk-tab-${k}`} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} className="nk-rt" onClick={() => setTab(k)} data-tab={k}>
                      <Ic n={k} size={20} /><span className="nk-rt-t">{tabLabel(k)}</span>
                      {(k === 'library' || k === 'project') && <i className="nk-dot" title="NEW" />}
                      {layers[k] === false && <i className="nk-rt-off" title={L('Hidden in the viewport', 'مخفي في العرض')} />}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
            <div className="nk-pcol">
              {(tab === 'base' || tab === 'wall' || tab === 'top') && showRunSel && (
                <div className="nk-runsel"><Seg label={L('Run', 'الصف')} value={activeRun} onChange={(v) => { setActiveRun(v); setSel(null); }} options={runKeys.map((k) => [k, L(RUN_SEL[k][0], RUN_SEL[k][1])])} /></div>
              )}
              <div role="tabpanel" aria-labelledby={`nk-tab-${tab}`} className="nk-panel-scroll" data-panel={tab}>{panelBody()}</div>
            </div>
          </div>
        </aside>
        {wl.dockPanel && <PanelResizer kind="panel" value={wl.panelW} dir={1} rtl={ar} label={L('Resize the Parameters panel (arrow keys, Home / End, Enter resets)', 'تغيير عرض لوحة المعاملات (الأسهم، Home / End، Enter للإعادة)')} onChange={changePanelW} onCommit={rememberWidths} />}
        {!panelShown && !focusMode && (
          <button type="button" className="nk-ptab" aria-expanded={false} aria-label={L('Parameters', 'المعاملات')} data-tip={L('Open the parameters panel', 'فتح لوحة المعاملات')} onClick={() => setPanelOpen(true)}>
            <Ic n="params" /><span>{L('Parameters', 'المعاملات')}</span>
          </button>
        )}

        {/* ---------------- stage ---------------- */}
        <main className="nk-stage" aria-label={L('Drawing', 'الرسم')}>
          <div className="nk-stagebar">
            {focusMode && (
              <button type="button" className="nk-focus-exit" onClick={() => setFocusMode(false)} data-testid="focus-exit" data-tip={L('Show the panels again (Shift+F or Esc)', 'إظهار اللوحات (Shift+F أو Esc)')}>
                <Ic n="unfocus" size={16} /><span>{L('Exit focus', 'خروج من التركيز')}</span>
              </button>
            )}
            {toolbar}
          </div>
          <div className="nk-stagebody">
          <div className="nk-stagemain">
          {openBar && view !== 'cut' && (
            <OpenControl lang={lang} scene={scene} openIds={openIds} onOpenIds={setOpenIds} speed={openSpeed} onSpeed={setOpenSpeed} scope={openScope} onScope={setOpenScope}
              selUnitId={sel ? sel.unitId : null} selLabel={selInfo ? selInfo.inst.label : ''} onClose={() => setOpenBar(false)} />
          )}
          {view === 'design' && (
            <>
              <div className="nk-modebar" role="group" aria-label={L('Elevation controls', 'عناصر تحكم الواجهة')} data-testid="elev-bar">
                <Seg className="nk-seg-run" label={L('Elevation run', 'صف الواجهة')} value={showEnd ? `${activeRun}:end` : activeRun}
                  onChange={(v) => { if (v.endsWith(':end')) { setActiveRun(v.slice(0, -4)); setElevEnd(true); } else { setActiveRun(v); setElevEnd(false); } setSel(null); }}
                  options={elevOptions} />
                <span className="nk-mb-sep" aria-hidden="true" />
                <div className="nk-mb-checks">
                <label className="nk-chk"><input type="checkbox" checked={dimsOn} onChange={(e) => setDims(e.target.checked)} /> {L('Dimensions', 'الأبعاد')}</label>
                <label className="nk-chk"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> {L('Internal', 'داخلي')}</label>
                <label className="nk-chk"><input type="checkbox" checked={mapOn} onChange={(e) => setMap(e.target.checked)} /> {L('Map', 'خريطة')}</label>
                <label className="nk-chk nk-chk-hdl" title={L('Drag the blue handles on the drawing to change sizes; arrow keys nudge a focused handle', 'اسحب المقابض الزرقاء على الرسم لتغيير المقاسات؛ مفاتيح الأسهم تحرّك المقبض المحدد')}><input type="checkbox" data-testid="handles-toggle" checked={handlesOn} onChange={(e) => setHandlesOn(e.target.checked)} /> {L('Handles', 'المقابض')}</label>
                <label className="nk-chk"><input type="checkbox" checked={center} onChange={(e) => setCenter(e.target.checked)} /> {L('Centre lines', 'خطوط المنتصف')}</label>
                </div>
              </div>
              <div className="nk-draw" data-testid="elevation-wrap">
                {showEnd ? <EndElevation scene={scene} runKey={activeRun} lang={lang} model={model} commit={commit} /> : <Elevation scene={scene} runKey={activeRun} ui={ui} selected={sel} onSelect={setSel} onDrag={onDrag} lang={lang} barSlot={barSlot} handleList={handleList} onHandle={onHandle} />}
              </div>
              {!selInfo && <div className="nk-foot nk-foot-idle"><div className="nk-hint" data-testid="elev-hint">{L('Click a cabinet or a part to select it · scroll to zoom · drag to pan when zoomed', 'انقر على خزانة أو قطعة لتحديدها · العجلة للتكبير · اسحب للتحريك عند التكبير')}</div></div>}
            </>
          )}
          {view === '3d' && (
            <>
              {explode.on && (
                <div className="nk-exbar" role="group" aria-label={L('Explode', 'تفكيك')}>
                  <b>{L('Explode', 'تفكيك')}</b>
                  <Seg label={L('Explode mode', 'نمط التفكيك')} value={explode.mode} onChange={(v) => setExplode({ ...explode, mode: v })} options={[['levels', L('Levels', 'مستويات')], ['fronts', L('Fronts', 'واجهات')], ['assembly', L('Assembly', 'تجميع')]]} />
                  <input type="range" className="nk-range" min={0} max={100} value={Math.round(explode.amt * 100)} aria-label={L('Explode amount', 'مقدار التفكيك')} onChange={(e) => setExplode({ ...explode, amt: +e.target.value / 100 })} data-testid="explode-slider" />
                  <span className="nk-mono" dir="ltr">{Math.round(explode.amt * 100)}%</span>
                  <label className="nk-chk"><input type="checkbox" checked={explode.diagram} onChange={(e) => setExplode({ ...explode, diagram: e.target.checked })} /> {L('Diagram', 'مخطط')}</label>
                  <button type="button" className="nk-btn" onClick={() => setCam('fit')}><Ic n="fit" size={16} /> {L('Fit', 'ملاءمة')}</button>
                  <button type="button" className="nk-ib" aria-label={L('Close explode', 'إغلاق التفكيك')} data-testid="explode-close" onClick={() => setExplode((e) => ({ ...e, on: false }))}><Ic n="close" size={16} /></button>
                </div>
              )}
              <div className="nk-3dwrap">
                <Kitchen3D scene={scene} ui={ui} model={model} lang={lang} onSelect={setSel} fitTick={fitTick} camCmd={camCmd} sel={sel} unit={unit} onToggleFront={onToggleFront} poseRef={poseRef} />
                <Category3DList lang={lang} scene={scene} layers={layers} tab={tab} onPick={goTab} />
              </div>
              <div className="nk-hint" data-hint3d="1">{hold
                ? L('Camera held (L to release) · click to select · double-click a door or drawer to open it', 'الكاميرا مثبتة (L للإلغاء) · انقر للتحديد · نقرتان على باب أو درج لفتحه')
                : L('Drag to orbit · right/Shift-drag or two fingers to pan · scroll to zoom to the cursor · arrows/WASD nudge · double-click a part to focus, a door to open · L holds', 'اسحب للدوران · زر أيمن/Shift أو إصبعان للتحريك · العجلة للتكبير نحو المؤشر · الأسهم/WASD للإزاحة · نقرتان على قطعة للتركيز وعلى باب لفتحه · L للتثبيت')}</div>
            </>
          )}
          {view === 'cut' && (
            <div className="nk-cutwrap" data-testid="cutlist">
              <CutListView bom={bom} hardware={hardware} warnings={warnings} est={est} prices={prices} lang={lang} unit={unit} onExport={doExport} model={model} scene={scene} user={userKey} notify={notify} onPick={pickPart} />
            </div>
          )}

          {selInfo && view !== 'cut' && (
            <div className="nk-foot"><div className="nk-selcard" role="region" aria-label={L('Selected part', 'القطعة المحددة')} data-testid="sel-card">
              <span className={`nk-sw nk-pt nk-pt-${selInfo.part ? selInfo.part.ptype : selInfo.inst.row === 'base' ? 'baseUnit' : 'wallUnit'}`} />
              <div className="nk-sel-t">
                <b dir="auto">{selInfo.name}</b>
                <small dir="ltr" data-testid="sel-meta">{selDims(selInfo.dims, unit)} · {selInfo.mat || L('Carcass', 'هيكل')} · {ROW_LBL[selInfo.rowKey][ar ? 1 : 0]}</small>
              </div>
              <button type="button" className="nk-btn nk-btn-primary" disabled={!selInfo.openable} title={selInfo.openable ? undefined : L('Nothing to open on this selection', 'لا يوجد ما يُفتح في هذا التحديد')} onClick={toggleOpenSel} data-testid="sel-open" data-open={selIsOpen ? '1' : '0'}>{selInfo.part
                ? (selIsOpen ? L('Close this front', 'إغلاق هذه الواجهة') : L('Open this front', 'فتح هذه الواجهة'))
                : (selIsOpen ? L('Close this unit', 'إغلاق هذه الوحدة') : L('Open this unit', 'فتح هذه الوحدة'))}</button>
              {selInfo.part && drillPlan(scene, selInfo.part) && (
                <button type="button" className="nk-btn nk-btn-ghost" aria-pressed={drillOpen} onClick={() => setDrillOpen((o) => !o)} data-testid="sel-drill">{L('Drilling', 'الثقوب')}</button>
              )}
              <button type="button" className="nk-btn nk-btn-ghost" onClick={aiEdit} data-testid="sel-ai">{L('AI edit', 'تعديل بالذكاء')}</button>
              <button type="button" className="nk-ib" aria-label={L('Close', 'إغلاق')} onClick={() => setSel(null)} data-testid="sel-close"><Ic n="close" size={16} /></button>
              {drillOpen && selInfo.part && <DrillPlan scene={scene} part={selInfo.part} lang={lang} onClose={() => setDrillOpen(false)} />}
            </div></div>
          )}
          </div>
          {vtools}
          </div>
          <div className="nk-status" role="status" aria-live="polite" data-testid="status">{status}</div>
        </main>

        {/* ---------------- assistant: docked beside the drawing on desktop (>=1280px), floating popover / bottom sheet below ---------------- */}
        {asstShown && wl.dockAsst && <PanelResizer kind="asst" value={wl.asstW} dir={-1} rtl={ar} label={L('Resize the assistant (arrow keys, Home / End, Enter resets)', 'تغيير عرض المساعد (الأسهم، Home / End، Enter للإعادة)')} onChange={changeAsstW} onCommit={rememberWidths} />}
        {asstShown && (
          <AssistantPanel model={model} lang={lang} ctx={aiCtx} seed={asstSeed} activeRun={activeRun} unit={unit} docked={wl.dockAsst} onLang={setLang} memo={asstMemo}
            rect={floatRect} bounds={{ w: bodyW, h: bodyH }} rtl={ar} onRect={setAsstRect} onRectCommit={commitRect} canDock={wl.dockable} onToggleMode={() => setAsstMode(dock ? 'float' : 'dock')} onCollapse={() => setAsstOpen(false)}
            onApplyModel={(m) => commit(m, `ai:${Date.now()}`)} onUi={uiCmd} onUndo={undo} onRedo={redo} canUndo={hist.past.length > 0} canRedo={hist.future.length > 0} onClose={() => setAsstOpen(false)}>
            {selInfo && (
              <UnitAssistCard key={selInfo.inst.unit.id} model={model} lang={lang} unit={unit} target={{ rk: selInfo.rk, row: selInfo.inst.row, id: selInfo.inst.unit.id }}
                scene={scene} sel={sel} onSelect={setSel} onApply={(m) => commit(m, `asst-unit:${selInfo.inst.unit.id}:${Date.now()}`)} />
            )}
          </AssistantPanel>
        )}
        {/* collapsed: a slim rail on the docked side (state and any pending proposal are kept); floating layouts use the round button below */}
        {!asstOpen && !focusMode && dock && (
          <aside className="nk-asst-rail" aria-label={L('Neo Assistant', 'مساعد نيو')}>
            <button type="button" className="nk-ib nk-rail-btn" onClick={() => setAsstOpen(true)} data-testid="assistant-fab" aria-label={L('Open the assistant', 'فتح المساعد')} data-tip={L('Open the assistant', 'فتح المساعد')}>
              <Ic n="assistant" size={20} />{asstMemo.current && asstMemo.current.pend ? <i className="nk-rail-dot" aria-label={L('A proposal is waiting for review', 'اقتراح بانتظار المراجعة')} /> : null}
            </button>
            <span className="nk-rail-t" aria-hidden="true">{L('Assistant', 'المساعد')}</span>
          </aside>
        )}
      </div>

      {/* ---------------- assistant button (the panel itself is the last child of .nk-body so the dock can sit beside the drawing) ---------------- */}
      {!asstOpen && !focusMode && !dock && (
        <button type="button" className="nk-fab" onClick={() => setAsstOpen(true)} data-testid="assistant-fab" aria-label={L('Neo Assistant', 'مساعد نيو')}>
          <Ic n="assistant" size={20} /><span className="nk-fab-t">{L('Neo Assistant', 'مساعد نيو')}</span>
        </button>
      )}

      <ConfirmDialog open={askNew} lang={lang} testid="new-project-confirm" title={L('Start a new project?', 'بدء مشروع جديد؟')} message={L('Use Undo to get this one back.', 'يمكنك التراجع لاسترجاع هذا.')}
        confirmLabel={L('Start new', 'ابدأ جديدًا')} cancelLabel={L('Cancel', 'إلغاء')} onConfirm={doReset} onCancel={() => setAskNew(false)} />

      {/* ---------------- print view (portal: the @media print sheet hides everything else) ---------------- */}
      {printing && typeof document !== 'undefined' && createPortal(
        <div className="nk-print-root" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
          <div className="nk-print-sheet">
            <h1>{model.title}</h1>
            <p>Neo Kitchen Designer · {new Date().toLocaleDateString()} · {FINISHES[model.finish].en} · {COUNTERS[model.counter].en}</p>
            {scene.runs.map((r) => (
              <figure key={r.key} className="nk-print-fig"><figcaption>{r.label}</figcaption>
                <Elevation scene={scene} runKey={r.key} ui={{ ...ui, dims: true, xray: false, openDoors: false, openIds: new Set(), internal: false, map: false, center: false, isolate: null, layers: { base: true, wall: true, top: true, counter: true, plinth: true, doors: true, hardware: true } }} selected={null} onSelect={() => {}} onDrag={() => {}} lang={lang} interactive={false} />
              </figure>
            ))}
          </div>
          <div className="nk-print-sheet nk-print-bom">
            <CutListView bom={bom} hardware={hardware} warnings={warnings} est={est} prices={prices} lang={lang} unit={unit} onExport={() => {}} model={model} compact />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
