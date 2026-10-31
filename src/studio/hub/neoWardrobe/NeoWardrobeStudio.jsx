/* =============================================================================
 * Neo Wardrobe Studio [NEO-CLOSETS-UX22] - the closets counterpart of the Neo Kitchen Designer workspace.
 * Floating toolbar (Design | 3D View | Cut List | X-Ray | Explode | Open | Daylight | Look), collapsible Parameters rail
 * (Carcass, Doors, Drawers, Shelves, Rails, Plinth, Hardware, Clothes), elevation with numbered part badges and the
 * Dimensions / Internal / Map layers, 3D with orbit / pan / zoom, bottom "selected part" card, File + Export menus
 * and Haneen (Bonsai assistant).
 *
 * It is CONTROLLED: NeoWardrobeCAD owns the design (dims, door type, modules, finish) so the engineering engines, the price and
 * "Send to Quote Max" keep reading the same object. Every parameter change goes through commit() -> onApply(), so the 3D view,
 * the elevation, the cut list and the exports are rebuilt from the one design (wardrobeModel.buildWardrobe).
 * The scene, 3D, elevation, cut list, File / Export menus, Look presets and assistant persona are the Neo Kitchen components.
 * ===========================================================================*/
import { wsShowFactory } from '../wsFlags'; // [WEB-STUDIO]
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../neoKitchen/neoKitchen.css';
import './wardrobeStudio.css';
import './closetCards.css';
import { Seg, Toggle, NumField, useDismiss } from '../neoKitchen/ui';
import { Ic, Tool } from '../neoKitchen/icons';
import LookBlock from '../neoKitchen/LookBlock';
import ProductionMaterials from '../neoKitchen/ProductionMaterials';
import MiniElevation from './MiniElevation';
import GlobalCards, { InsideDrawerSettings } from './GlobalCards';
import ColumnEditor from './ColumnEditor';
import ColumnWarnings from './ColumnWarnings';
import ParameterField from '../neoKitchen/ParameterField';
import { cmScale } from '../neoKitchen/fieldLogic';
import { Step, Card, Row } from './wardrobeParts';
import OpenControl from '../neoKitchen/OpenControl';
import { loadWsPrefs, saveWsPrefs, frontIds, groupIdsOfPart, toggleIds, clampSpeed, SPEED } from '../neoKitchen/workspace3d';
import { clampFloatRect, defaultFloatRect, cleanFloatRect } from '../neoKitchen/floatRect';
import { useMedia } from '../neoKitchen/useMedia';
import QuoteLauncher from '../neoQuote/QuoteLauncher'; // [NEO-QUOTE-UX33] shared Quote builder (amount, description, 3D picture, customer / lead)
import { wardrobeCtx } from '../neoQuote/contexts';
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
import { optimizeModules } from '../neo/engines/wardrobe/config.mjs';
import WardrobeAssistant from './WardrobeAssistant';
import QuickEdit from './QuickEdit';
import { classify, quickItems, applyQuick, nameFix, kindOfPart, KIND_NAME, PANEL_TAB } from './quickEditLogic';
import '../neoKitchen/workspace.css';
import {
  buildWardrobe, remapModules, normalizeX, selectionInfo, openIdsFor, propStats, designJSON, parseDesign, designKey, defaultDesign, blankDesign,
  doorSystemFor, setColumnWidth, addColumn, removeColumn, COL_W, WING_TOTAL_W, HANG_KEYS, HANG_H, DRAWER_H, DRAWER_H_RANGE, LEGEND_KEYS, LEGEND_NAME, RI,
  clampField, setHeightPart, resizeTotal, moveBoundary, columnWarnings, innerSize, coupleDoors,
} from './wardrobeModel';
import { WING_DEPTH } from '../neo/engines/wardrobe/lshape.mjs';
import { useHandlesPref } from '../neoHandles/HandleLayer';
import { wardrobeHandles } from '../neoHandles/wardrobeHandles';
import { createHandleDispatch } from '../neoHandles/handleModel';

import { usePublishDesignMeta, notifyExplicitSave } from '../neoLeads/leadContext';

/* Parameters rail: the reference panel's Global | M&S | Main | L-Shape first, then the per-part groups (the old Carcass tab is now Main + Global + M&S) */
const TABS = [['global', 'global', 'Global', 'عام'], ['ms', 'ms', 'M&S', 'المواد'], ['main', 'base', 'Main', 'الرئيسي'], ['lshape', 'lshape', 'L-Shape', 'حرف L'],
  ['doors', 'doors', 'Doors', 'الأبواب'], ['drawers', 'drawers', 'Drawers', 'الأدراج'], ['shelves', 'shelves', 'Shelves', 'الرفوف'],
  ['rails', 'rails', 'Rails', 'المعلاق'], ['hardware', 'hardware', 'Hardware', 'الاكسسوار'], ['clothes', 'clothes', 'Clothes', 'الملابس']];
/* the production-material name slots a wardrobe uses (the kitchen list minus wall / top / tall doors and the worktop), with the wardrobe's own names */
const WD_SLOTS = [
  { k: 'structure', en: 'Structure', ar: 'الهيكل' }, { k: 'shelves', en: 'Shelves', ar: 'الرفوف' }, { k: 'back', en: 'Back', ar: 'الظهر' },
  { k: 'baseDoors', en: 'Doors', ar: 'الأبواب' }, { k: 'glass', en: 'Glass and frames', ar: 'الزجاج والإطارات' }, { k: 'drawerFronts', en: 'Drawer fronts', ar: 'واجهات الأدراج' },
  { k: 'drawers', en: 'Drawer boxes', ar: 'صناديق الأدراج' }, { k: 'plinth', en: 'Plinth', ar: 'القاعدة' }, { k: 'handles', en: 'Handles', ar: 'المقابض' },
];
const LAYERS = [['base', 'Carcass', 'الهيكل'], ['doors', 'Doors', 'الأبواب'], ['plinth', 'Plinth', 'القاعدة'], ['hardware', 'Hardware', 'الاكسسوار']];
const ALL_LAYERS = { base: true, wall: true, top: true, counter: true, plinth: true, doors: true, hardware: true };
const selDims = (d) => `${d.map((v) => Math.round(v * 10) / 10).join(' × ')} mm`;
const HANG_LBL = { none: ['None', 'بدون'], single: ['Single', 'مفرد'], double: ['Double', 'مزدوج'], long: ['Long coats', 'معاطف طويلة'] };
const POS_LBL = { auto: ['Auto', 'تلقائي'], top: ['Top', 'أعلى'], center: ['Centre', 'وسط'], bottom: ['Bottom', 'أسفل'] };

export default function NeoWardrobeStudio({ design, rules, finishes = [], price, priced = null, valOk = true, onApply, onClose, onSendToQuote, toast, startLang = 'en', currentUser = null }) {
  const R = rules;
  const [lang, setLang] = useState(startLang === 'ar' ? 'ar' : 'en');
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] units + precision (shared setting)
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const narrow = useMedia('(max-width: 640px)');
  const dock = useMedia('(min-width: 1280px)'); // wide enough to dock the assistant beside the drawing (it floats by default, like the kitchen's)
  const drawer = useMedia('(max-width: 1023px)'); // below it the Parameters panel is a slide-in drawer (same rule the kitchen derives from its measured width)
  const railRef = useRef(null);
  const [view, setView] = useState('design');
  const [tab, setTab] = useState('main');
  const [runView, setRunView] = useState('main'); // elevation tab: 'main' | 'wing' (the L-Shape return wing; MAIN / RIGHT or LEFT)
  const [panelOpen, setPanelOpen] = useState(() => !(typeof window !== 'undefined' && window.innerWidth < 1024));
  const [layers, setLayers] = useState(ALL_LAYERS);
  const [xray, setXray] = useState(false);
  const [explode, setExplode] = useState({ on: false, mode: 'assembly', amt: 1, diagram: true }); // a wardrobe has one level: 'assembly' (every board apart) is the useful default
  const [openBar, setOpenBar] = useState(false); // the Open control bar (the toolbar Open button); what is open lives in openIds (UI state, never in the design)
  const [openIds, setOpenIdsRaw] = useState(() => new Set());
  const [dimsOn, setDims] = useState(true);
  const [handlesOn, setHandlesOn] = useHandlesPref(); // [NEO-HANDLES-UX36] the SMART HANDLES on the drawing (remembered)
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
  const [qeHide, setQeHide] = useState(null);
  // [NEO-CLOSETS-UX31] qeHide = the selection key whose quick-edit menu was dismissed with Esc / its close button (a new click on the item reopens it)
  const stageMainRef = useRef(null);
  const qeSink = useRef(null);
  const qeFam = useRef(null);
  const onAnchor3d = useCallback((r) => { if (qeSink.current) qeSink.current(r); }, []);
  const pickSel = useCallback((s0) => { setSel(s0); setQeHide(null); }, []);
  const [colSel, setColSel] = useState('all'); // 'all' | 'm0'.. (main column) | 'w0'.. (return-wing column)
  const wsPrefs = useRef(null); if (!wsPrefs.current) wsPrefs.current = loadWsPrefs(); // the same per-user workspace preferences as the kitchen (assistant open / mode / window)
  const [asstOpen, setAsstOpen] = useState(() => wsPrefs.current.asst === true && !(typeof window !== 'undefined' && window.innerWidth <= 640));
  const [hold, setHold] = useState(!!wsPrefs.current.hold); // Hold camera (lock tool, key L): no auto re-fit, no accidental orbit; the pose survives Design <-> 3D (poseRef)
  const [openSpeed, setOpenSpeed] = useState(() => clampSpeed(wsPrefs.current.speed === undefined ? SPEED.def : wsPrefs.current.speed));
  const [openScope, setOpenScope] = useState(wsPrefs.current.scope || 'all');
  const poseRef = useRef(null);
  const [asstMode, setAsstMode] = useState(wsPrefs.current.asstMode || 'float'); // 'float' (default, like the kitchen: a window over the drawing, no layout width) | 'dock' (side column, wide screens)
  const [asstRect, setAsstRect] = useState(() => cleanFloatRect(wsPrefs.current.asstRect));
  const [body, setBody] = useState({ w: 0, h: 0 });
  const bodyRef = useRef(null);
  const [asstSeed, setAsstSeed] = useState(null);
  const [exportsLog, setExportsLog] = useState([]);
  const [status, setStatus] = useState('');
  const [printing, setPrinting] = useState(false);
  const [tight, setTight] = useState(false); // the stage is too narrow for labelled tools (docked panel + assistant): icons only, names stay as tooltips / aria-labels
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
    const ro = new ResizeObserver(() => setTight(el.clientWidth < 880));
    ro.observe(el); setTight(el.clientWidth < 880);
    return () => ro.disconnect();
  }, []);

  const notify = useCallback((m) => {
    setStatus(m); clearTimeout(statusT.current); statusT.current = setTimeout(() => setStatus(''), 4500);
    if (typeof toast === 'function') { try { toast(m); } catch (e) { /* ignore */ } }
  }, [toast]);

  /* ---------- the one build ---------- */
  const finish = useMemo(() => finishes.find((f) => f.id === design.finishId) || null, [finishes, design.finishId]);
  const hex = finish ? (finish.hex || finish.color || null) : null;
  const dkey = designKey(design);
  const W = useMemo(() => buildWardrobe(design, { rules: R, hex }), [dkey, R, hex]); // eslint-disable-line react-hooks/exhaustive-deps
  const { scene, model, bom, hardware, warnings } = W;
  const x = W.x;
  /* [NEO-CLOSETS-UX30] drawers INSIDE a column: a drawer cannot come out through a closed door (pulling one opens its door first) and a door that closes takes its drawers back */
  const setOpenIds = useCallback((u) => setOpenIdsRaw((prev) => coupleDoors(scene, typeof u === 'function' ? u(prev) : u, prev)), [scene]);
  const stats = useMemo(() => propStats(scene), [scene]);
  const asstDocked = dock && asstMode === 'dock';
  const floatRect = useMemo(() => clampFloatRect(asstRect || defaultFloatRect(body.w, body.h, ar), body.w, body.h), [asstRect, body.w, body.h, ar]);
  const info0 = useMemo(() => selectionInfo(scene, bom, sel), [scene, bom, sel]);
  const info = nameFix(info0, sel, scene, ar); // [NEO-CLOSETS-UX31] a picked rail / plinth gets its own name and size on the selection card

  /* ----- column selection: 'all' | 'm<i>' (main) | 'w<i>' (return wing) ----- */
  const wing = x.wing; // normalized: { on, side, corner, depth, mods }
  const wingOn = !!wing.on;
  const wingMods = wing.mods;
  const parseSel = (v) => (v === 'all' || typeof v !== 'string' ? null : { p: v[0], i: parseInt(v.slice(1), 10) });
  const selC = (() => { const p = parseSel(colSel); if (!p) return null; if (p.p === 'm' && design.mods[p.i]) return p; if (p.p === 'w' && wingOn && wingMods[p.i]) return p; return null; })();
  const selMod = selC ? (selC.p === 'm' ? design.mods[selC.i] : wingMods[selC.i]) : null;
  const colIdx = selC && selC.p === 'm' ? selC.i : null;     // selected main column
  const wIdx = selC && selC.p === 'w' ? selC.i : null;       // selected return-wing column
  useEffect(() => { if (sel && !(scene.runs.some((r) => r.units.some((u) => u.unit.id === sel.unitId)))) setSel(null); }, [scene, sel]);
  useEffect(() => {
    if (!sel) return;
    const i = design.mods.findIndex((m) => `wc-${m.id}` === sel.unitId); const j = wingMods.findIndex((m) => `wr-${m.id}` === sel.unitId);
    if (i >= 0) setColSel(`m${i}`); else if (j >= 0) setColSel(`w${j}`);
  }, [sel, scene]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!wingOn && runView !== 'main') setRunView('main'); if (!wingOn && colSel[0] === 'w') setColSel('all'); }, [wingOn, runView, colSel]);

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
    if (e.key === 'Escape' && !menu && qeOn) { e.preventDefault(); setQeHide(selKey); return; }
    if (e.key === 'F2' && qeOn) { const b = e.currentTarget.querySelector('.nkq .nkq-b:not([aria-disabled="true"]), .nkq .nk-seg-b'); if (b) { e.preventDefault(); b.focus(); } return; }
    if (e.key === 'Escape' && !menu && openBar) { setOpenBar(false); return; }
    if ((e.key === 'l' || e.key === 'L') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && view === '3d') { e.preventDefault(); setHold((h) => !h); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) { const k = e.key.toLowerCase(); if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); } }
  };

  /* ---------- edits ---------- */
  const pickCol = (key, unitId) => { setColSel(key); setSel({ unitId, partId: null, label: unitId }); setQeHide(null); };
  const d0 = () => designRef.current;
  const setX = (patch, key) => commit({ ...d0(), x: { ...normalizeX(d0().x), ...patch } }, key || `x:${Object.keys(patch).join()}`);
  const setDim = (k, v) => {
    const d = d0();
    if (k === 'w') {
      /* [NEO-CLOSETS-UX25] the width change goes to the LAST FREE column (pinned columns never move); only when that cannot hold it are the columns re-split */
      const grown = resizeTotal(d.mods, v);
      if (grown) { commit({ ...d, dims: { ...d.dims, w: v }, mods: grown.mods }, 'dim:w'); return; }
      const opts = optimizeModules(v, R, 3); const i = Math.min(d.optIdx || 0, Math.max(0, opts.length - 1));
      commit({ ...d, dims: { ...d.dims, w: v }, optIdx: i, mods: remapModules(d.mods, opts[i] ? opts[i].modules : [v]) }, 'dim:w');
    } else commit({ ...d, dims: { ...d.dims, [k]: v } }, `dim:${k}`);
  };
  const pickOpt = (i) => { const d = d0(); const o = optimizeModules(d.dims.w, R, 3)[i]; if (o) commit({ ...d, optIdx: i, mods: remapModules(d.mods, o.modules) }, `opt:${i}`); };
  /* the return wing (L-Shape tab) is stored in design.x.wing; every edit is one history step like any other */
  const setWing = (fn, key) => { const d = d0(); const x0 = normalizeX(d.x); commit({ ...d, x: { ...x0, wing: fn(x0.wing) } }, key); };
  const setWingOn = (on) => { setWing((w) => ({ ...w, on }), 'wing:on'); if (!on) setRunView('main'); };
  /* a per-column property (hanging / shelves / drawers) for the selected column, or every column (main + wing) when none is selected */
  const patchCols = (patch, key) => {
    const d = d0(); const x0 = normalizeX(d.x); const s = selC;
    const nm = d.mods.map((m, i) => (!s || (s.p === 'm' && s.i === i) ? { ...m, ...patch } : m));
    const nw = x0.wing.on ? x0.wing.mods.map((m, i) => (!s || (s.p === 'w' && s.i === i) ? { ...m, ...patch } : m)) : x0.wing.mods;
    commit({ ...d, mods: nm, x: { ...x0, wing: { ...x0.wing, mods: nw } } }, key);
  };
  /* columns: free widths, lock, add / remove (one undo step each) - main columns */
  const applyCols = (r, key, msg) => {
    if (!r) { notify(msg || L('That does not fit: columns are 200-1200 mm and the total 600-6000 mm.', 'لا يتسع ذلك: عرض العمود 200-1200 مم والإجمالي 600-6000 مم.')); return; }
    const d = d0(); const total = r.mods.reduce((t, m) => t + m.width, 0);
    commit({ ...d, mods: r.mods, dims: { ...d.dims, w: total } }, key);
  };
  const keepW = x.keepW; const keepH = x.keepH; const keepWing = wing.keep;
  const setKeepW = (v) => setX({ keepW: !!v }, 'keepW');
  const setKeepH = (v) => setX({ keepH: !!v }, 'keepH');
  const setColW = (i, v) => { const r = setColumnWidth(d0().mods, i, v, keepW); applyCols(r.mods === d0().mods ? null : r, `colw:${i}`); };
  const addCol = () => { const r = addColumn(d0().mods, keepW); applyCols(r, `col+:${Date.now()}`); if (r) pickCol(`m${r.mods.length - 1}`, `wc-${r.mods[r.mods.length - 1].id}`); };
  const delCol = (i) => { applyCols(removeColumn(d0().mods, i, keepW), `col-:${Date.now()}`); setColSel('all'); };
  /* the same four for the return wing's columns (its own total: 200-6000 mm) */
  const applyWingCols = (r, key) => {
    if (!r) { notify(L('That does not fit: wing columns are 200-1200 mm.', 'لا يتسع ذلك: عرض أعمدة الجناح 200-1200 مم.')); return; }
    setWing((w) => ({ ...w, mods: r.mods }), key);
  };
  const setWingColW = (i, v) => { const wm = normalizeX(d0().x).wing.mods; const r = setColumnWidth(wm, i, v, keepWing, WING_TOTAL_W); applyWingCols(r.mods === wm ? null : r, `wcolw:${i}`); };
  const addWingCol = () => { const r = addColumn(normalizeX(d0().x).wing.mods, keepWing, 600, WING_TOTAL_W, 'R'); applyWingCols(r, `wcol+:${Date.now()}`); if (r) pickCol(`w${r.mods.length - 1}`, `wr-${r.mods[r.mods.length - 1].id}`); };
  const delWingCol = (i) => { applyWingCols(removeColumn(normalizeX(d0().x).wing.mods, i, keepWing, WING_TOTAL_W), `wcol-:${Date.now()}`); setColSel('all'); };
  /* [NEO-CLOSETS-UX25] the Global cards: every numeric field of a card goes through setField (clamp to the WFIELD range, then the one commit) */
  const setField = (k, raw) => {
    if (k === 'plinthH' || k === 'topBoxH') { const r = setHeightPart(d0(), k, raw); commit(r.design, `g:${k}`); return { clamped: r.clamped, value: r.value }; }
    const c = clampField(k, raw); if (!c) return null;
    setX({ [k]: c.value }, `g:${k}`); return { clamped: c.clamped, value: c.value };
  };
  const setColCount = (n) => {
    const cur = d0().mods.length;
    if (n > cur) addCol(); else if (n < cur) delCol(cur - 1);
  };
  const setHandles = (on) => setX({ handle: { ...x.handle, style: on ? (x.handle.style === 'none' ? 'profile' : x.handle.style) : 'none' } }, 'handle');
  /* one column's own settings (Main tab: design.mods[i], L-Shape tab: design.x.wing.mods[i]); a width goes through the keep-total rule */
  const patchOne = (part, i, patch, key) => {
    if (patch.width !== undefined) { (part === 'm' ? setColW : setWingColW)(i, patch.width); return; }
    const k = key || `col:${part}${i}:${Object.keys(patch).join()}`;
    if (part === 'm') { const d = d0(); commit({ ...d, mods: d.mods.map((m, j) => (j === i ? { ...m, ...patch } : m)) }, k); }
    else setWing((w) => ({ ...w, mods: w.mods.map((m, j) => (j === i ? { ...m, ...patch } : m)) }), k);
  };
  const fixWarning = (w) => {
    const part = w.col[0]; const i = parseInt(w.col.slice(1), 10);
    if (w.kind === 'width') (part === 'm' ? setColW : setWingColW)(i, w.to); else patchOne(part, i, { leaves: w.to }, `fix:${w.id}`);
  };
  const splitWing = (i, w) => { const r = moveBoundary(normalizeX(d0().x).wing.mods, i, w); if (r.mods) setWing((wg) => ({ ...wg, mods: r.mods }), `wsplit:${i}`); };
  const setWingLength = (mm) => { const r = resizeTotal(normalizeX(d0().x).wing.mods, mm, WING_TOTAL_W); if (!r) { notify(L('That length does not fit the wing columns (200-1200 mm each, or they are pinned).', 'هذا الطول لا يناسب أعمدة الجناح (200-1200 مم لكل عمود، أو أنها مثبتة).')); return; } setWing((wg) => ({ ...wg, mods: r.mods }), 'wing:len'); };
  const setWingSide = (side) => { if (wingOn && wing.side === side) { setWingOn(false); return; } setWing((w) => ({ ...w, on: true, side }), 'wing:side'); };
  const setType = (type) => { const d = d0(); commit({ ...d, type, doorSystem: doorSystemFor(type, d.doorSystem) }, 'type'); };
  /* Material Wood | Glass | Smoked: a glass / smoked door needs doors, so an open wardrobe becomes hinged */
  const setMaterial = (v) => {
    const d = d0();
    if (v !== 'solid' && d.type === 'open') commit({ ...d, type: 'hinged', doorSystem: doorSystemFor('hinged', d.doorSystem), x: { ...normalizeX(d.x), doorStyle: v } }, 'doorStyle');
    else setX({ doorStyle: v }, 'doorStyle');
  };
  /* [NEO-CLOSETS-UX30] the closet-wide default drawer position: one history step, and every column's own override is dropped (they all follow the default again) */
  const setDrawerModeAll = (v) => {
    const d = d0(); const x0 = normalizeX(d.x); const strip = (m) => { const { dMode, ...r } = m; return r; }; // eslint-disable-line no-unused-vars
    commit({ ...d, mods: d.mods.map(strip), x: { ...x0, drawerMode: v, wing: { ...x0.wing, mods: x0.wing.mods.map(strip) } } }, 'drawerMode');
  };
  const allMods = wingOn ? [...design.mods, ...wingMods] : design.mods;
  const aggregate = (k) => { const ms = selC ? [selC.p === 'm' ? design.mods[selC.i] : wingMods[selC.i]] : allMods; return RI(Math.round(ms.reduce((s, m) => s + (+m[k] || 0), 0) / Math.max(1, ms.length))); };

  const onDrag = useCallback((ev) => {
    const d = d0();
    if (ev.kind === 'width') {
      const i = d.mods.findIndex((m) => `wc-${m.id}` === ev.unitId);
      if (i >= 0) {
        const w = Math.max(300, Math.min(1200, Math.round(ev.value)));
        const mods = d.mods.map((m, j) => (j === i ? { ...m, width: w } : m));
        const total = mods.reduce((s, m) => s + m.width, 0); if (total < 600 || total > 6000) return;
        commit({ ...d, mods, dims: { ...d.dims, w: total } }, `drag:w:${i}`);
        return;
      }
      const j = normalizeX(d.x).wing.mods.findIndex((m) => `wr-${m.id}` === ev.unitId); if (j < 0) return;
      const w = Math.max(300, Math.min(1200, Math.round(ev.value)));
      const x0 = normalizeX(d.x);
      const mods = x0.wing.mods.map((m, k) => (k === j ? { ...m, width: w } : m));
      if (mods.reduce((s, m) => s + m.width, 0) > WING_TOTAL_W.max) return;
      commit({ ...d, x: { ...x0, wing: { ...x0.wing, mods } } }, `drag:wing:${j}`);
    } else if (ev.kind === 'height') {
      const h = Math.max(1300, Math.min(3300, Math.round(ev.value - ev.y0))) + x.plinthH;
      commit({ ...d, dims: { ...d.dims, h } }, 'drag:h');
    }
  }, [commit, x.plinthH]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- ui commands (toolbar + assistant) ---------- */
  const toggleExplode = () => { setExplode((e) => ({ ...e, on: !e.on })); if (!explode.on) setView('3d'); };
  /* one click opens everything and shows the Open bar, the next closes everything and hides it (the kitchen's behaviour) */
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
    else if (c.action === 'clothes') setX({ clothes: { ...x.clothes, on: !!c.value } }, 'clothes');
  }, [lk, x.clothes, scene]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleOpenSel = () => {
    const ids = openIdsFor(scene, info); if (!ids.length) return;
    setOpenIds((s) => { const n = new Set(s); const on = ids.some((i) => n.has(i)); ids.forEach((i) => (on ? n.delete(i) : n.add(i))); return n; });
  };
  const setCam = (name) => { setCamCmd({ n: Date.now(), name }); setMenu(null); };

  /* ---------- [NEO-CLOSETS-UX31] quick-edit menu: classify the selection, list the controls, apply one action through the model setters (one undo step each) ---------- */
  const selKey = sel ? `${sel.unitId}|${sel.partId || ''}` : '';
  const qeC = useMemo(() => classify(info, sel, W.cols, x), [info, sel, W.cols, x]); // eslint-disable-line react-hooks/exhaustive-deps
  const qeOn = !!(sel && info && qeC && view !== 'cut' && qeHide !== selKey);
  if (!sel || !sel.partId) qeFam.current = null; else if (info && info.part) qeFam.current = kindOfPart(info.part, x); // the kind of part last picked (kept while its id is briefly gone after an edit)
  const qeColInfo = qeC && qeC.col ? W.cols.find((c) => c.unitId === qeC.col.unitId) : null;
  const qeRailY = (() => { if (!qeC || !qeC.col) return null; const r = (scene.props || []).filter((q) => q.kind === 'rail' && q.unitId === qeC.col.unitId); return r.length ? (Math.max(...r.map((q) => q.box.y0 + q.box.y1)) / 2) : null; })();
  const qeCtx = () => ({ design: d0(), rules: R, kind: qeC.kind, col: qeC.col, railY: qeRailY, dimRange, openable: !!(info && info.openable), canUndo: hist.current.past.length > 0, leaves: qeColInfo ? qeColInfo.leaves : 1 });
  const goPanel = () => { if (!qeC) return; setTab(PANEL_TAB[qeC.kind] || 'main'); setPanelOpen(true); };
  const onQuick = (id, arg) => {
    if (!qeC) return undefined;
    const r = applyQuick(id, arg, qeCtx());
    if (!r) return undefined;
    if (r.error) { notify(L(r.error.en, r.error.ar)); return { clamped: true }; }
    if (r.effect === 'open') toggleOpenSel(); else if (r.effect === 'undo') undo(); else if (r.effect === 'panel') goPanel();
    if (r.design) commit(r.design, r.coalesce ? `qe:${id}:${qeC.col ? qeC.col.key : ''}` : `qe:${id}:${Date.now()}`);
    if (r.select) pickCol(r.select.key, r.select.unitId);
    return r.clamped ? { clamped: true, value: r.value } : (r.value !== undefined ? { value: r.value } : undefined);
  };
  /* a part id that no longer exists after an edit (a wood leaf became glass ...) re-picks the same kind of part in the same column, else the column */
  useEffect(() => {
    if (!sel || !sel.partId || /^(rail|plinth):/.test(sel.partId) || scene.parts.some((p) => p.id === sel.partId)) return;
    const alt = qeFam.current && scene.parts.find((p) => p.unitId === sel.unitId && kindOfPart(p, x) === qeFam.current);
    setSel(alt ? { unitId: sel.unitId, partId: alt.id, label: sel.label } : { unitId: sel.unitId, partId: null, label: sel.label });
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDrawCtx = (e) => { const t = e.target && e.target.closest && e.target.closest('[data-part], [data-cab], [data-badge]'); if (t) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } }; // right-click / long-press on the elevation picks the item (and so opens its quick menu)

  /* ---------- file + export ---------- */
  const logExport = (name) => setExportsLog((l) => [...l, `${name} ${new Date().toLocaleTimeString()}`]);
  const dirty = designKey(design) !== savedKey.current;
  const doExport = useCallback((kind) => {
    setMenu(null);
    const base = safeName(x.title || 'wardrobe');
    if (kind === 'json') { download(`${base}.json`, attachOutput(designJSON(designRef.current)), 'application/json'); logExport('JSON'); savedKey.current = designKey(designRef.current); tick((n) => n + 1); notify(L('Wardrobe saved as JSON.', 'تم حفظ الخزانة JSON.')); }
    else if (kind === 'dxf') { download(`${base}.dxf`, buildDXF(scene, bom, output), 'application/dxf'); logExport('DXF'); notify(L('DXF (R12) exported.', 'تم تصدير DXF (R12).')); }
    else if (kind === 'csv') { download(`${base}-cutlist.csv`, bomCSV(bom, model.matMap, output), 'text/csv'); logExport('CSV'); notify(L('Cut list CSV exported.', 'تم تصدير قائمة القص CSV.')); }
    else if (kind === 'print') setPrinting(true);
  }, [scene, bom, model, x.title, ar, output]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => { try { window.print(); } catch (e) { /* ignore */ } if (!window.matchMedia || !('onafterprint' in window)) setTimeout(done, 400); }, 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printing]);
  const loadDesign = useCallback((d, msg) => { commit(d, `load:${Date.now()}`); savedKey.current = designKey(d); setSel(null); notify(msg); }, [commit, notify]);
  const importFile = useCallback((file) => {
    if (file && file.size > MAX_IMPORT_BYTES) { notify(L('Import failed: the file is too large. Your wardrobe was not changed.', 'فشل الاستيراد: الملف كبير جدًا. لم تتغير خزانتك.')); return; }
    const rd = new FileReader();
    rd.onload = () => { try { loadDesign(parseDesign(String(rd.result)), L('Wardrobe loaded.', 'تم تحميل الخزانة.')); applyOutputFromText(String(rd.result)); } catch (e) { notify(L(`Import failed: ${e.message}. Your wardrobe was not changed.`, `فشل الاستيراد: ${e.message}. لم تتغير خزانتك.`)); } };
    rd.onerror = () => notify(L('Could not read the file. Your wardrobe was not changed.', 'تعذرت قراءة الملف. لم تتغير خزانتك.'));
    rd.readAsText(file);
  }, [loadDesign, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- derived view bits ---------- */
  const ui = { handles: handlesOn, layers, xray, explode, openDoors: false, openIds, openSpeed, hold, dims: dimsOn, internal, map: mapOn, center, wall: true, isolate, lighting: 'neutral', grid, guides, look: lk.look, sun: lk.sun, props: true };
  const elevKey = runView === 'wing' && wingOn ? wing.side : 'main'; // the run the elevation shows: the main wardrobe, or the L-Shape return wing (MAIN / RIGHT or LEFT)
  /* [NEO-HANDLES-UX36] the shared handle layer for the elevation: built from the design + scene, committed through the studio's own commit (one undo step per drag) */
  const hdlSeq = useRef({ n: 0 });
  const onHandle = useMemo(() => createHandleDispatch((next, key) => commit(next, key), hdlSeq.current), [commit]);
  const handleList = useMemo(() => wardrobeHandles({ design, scene, runKey: elevKey, rules: R, cols: W.cols, selected: sel, layers }), [design, scene, elevKey, R, W.cols, sel, layers]);
  const legend = LEGEND_KEYS.map((k) => PART_TYPES.find((t) => t.k === k)).filter(Boolean).map((t) => ({ ...t, en: LEGEND_NAME[t.k] ? LEGEND_NAME[t.k][0] : t.en, ar: LEGEND_NAME[t.k] ? LEGEND_NAME[t.k][1] : t.ar }));
  const TIP = {
    design: L('2D elevation with live dimensions', 'واجهة ثنائية الأبعاد بأبعاد حية'), '3d': L('Interactive 3D model - orbit, pan and zoom', 'نموذج ثلاثي الأبعاد تفاعلي - دوران وتحريك وتكبير'), cut: L('Cut list, hardware', 'قائمة القص والاكسسوار'),
    xray: L('See through the panels: hinge cups, shelf pins', 'رؤية عبر الألواح: كوبات المفصلات ومسامير الرفوف'), explode: L('Pull the columns apart to see every part', 'فصل الأعمدة لرؤية كل قطعة'),
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
          <div className="nk-tg" role="group" aria-label={L('Wardrobe', 'الخزانة')}>
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
          <Tool nativeTip icon="fit" text={L('Fit', 'ملاءمة')} label={L('Fit to screen', 'ملاءمة الشاشة')} tip={L('Fit the whole wardrobe in view (F, or double-click)', 'إظهار الخزانة كاملة (F أو نقرتان)')} onClick={() => setCam('fit')} />
          <Tool nativeTip icon="reset" text={L('Reset', 'إعادة')} label={L('Reset camera', 'إعادة الكاميرا')} tip={L('Back to the opening angle (0)', 'العودة للزاوية الأولى (0)')} onClick={() => setCam('reset')} />
          <Tool nativeTip icon={hold ? 'lock' : 'unlock'} text={hold ? L('Held', 'مثبتة') : L('Hold', 'تثبيت')} label={L('Hold camera', 'تثبيت الكاميرا')} pressed={hold} data-testid="tool-hold"
            tip={hold ? L('Camera held: no auto re-fit and no accidental orbit - you can still pick parts (L to release)', 'الكاميرا مثبتة: لا ملاءمة تلقائية ولا دوران عرضي - يمكنك اختيار القطع (L للإلغاء)') : L('Hold the camera exactly where it is (L)', 'تثبيت الكاميرا في مكانها بالضبط (L)')} onClick={() => setHold(!hold)} />
          <Tool nativeTip icon="grid" text={L('Grid', 'الشبكة')} label={L('Floor grid', 'شبكة الأرضية')} tip={L('Show or hide the floor grid', 'إظهار أو إخفاء شبكة الأرضية')} pressed={grid} onClick={() => setGrid(!grid)} />
          <Tool nativeTip icon="guides" text={L('Guides', 'القياس')} label={L('Measurement guides', 'خطوط القياس')} tip={L('Overall width, height and depth lines', 'خطوط العرض والارتفاع والعمق الكلية')} pressed={guides} onClick={() => setGuides(!guides)} />
        </>
      )}
      <div className="nk-menuwrap" ref={menu === 'layers' ? menuRef : null}>
        <Tool nativeTip icon="layers" text={L('Layers', 'الطبقات')} label={L('Layers', 'الطبقات')} tip={L('Show or hide carcass, doors, plinth, hardware', 'إظهار أو إخفاء الهيكل والأبواب والقاعدة والاكسسوار')} expanded={menu === 'layers'} onClick={() => setMenu(menu === 'layers' ? null : 'layers')}>
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
  const cols = design.mods;
  const colPicker = (
    <div className="nkw-cols" role="group" aria-label={L('Column', 'العمود')}>
      <button type="button" className="nk-chip nk-chip-sm" aria-pressed={colSel === 'all'} onClick={() => setColSel('all')}>{L('All columns', 'كل الأعمدة')}</button>
      {cols.map((m, i) => (
        <button key={m.id} type="button" className="nk-chip nk-chip-sm" aria-pressed={colSel === `m${i}`} onClick={() => pickCol(`m${i}`, `wc-${m.id}`)}>
          <b>C{i + 1}</b> <span dir="ltr">{m.width}</span>
        </button>
      ))}
      {wingOn && wingMods.map((m, i) => (
        <button key={m.id} type="button" className="nk-chip nk-chip-sm" aria-pressed={colSel === `w${i}`} onClick={() => pickCol(`w${i}`, `wr-${m.id}`)} data-wing="1">
          <b>R{i + 1}</b> <span dir="ltr">{m.width}</span>
        </button>
      ))}
    </div>
  );
  const opts = optimizeModules(design.dims.w, R, 3);
  const dimRange = { w: [Math.max(600, R.min_width), Math.min(6000, R.max_width)], h: [Math.max(1300 + x.plinthH, R.min_height), Math.min(3300 + x.plinthH, R.max_height)], d: [Math.max(500, R.min_depth), Math.min(700, R.max_depth)] };
  const footprint = { w: Math.round(scene.bounds.x1 - scene.bounds.x0), d: Math.round(scene.bounds.z1 - scene.bounds.z0) };
  const matLbl = [['solid', L('Wood', 'خشب')], ['glass', L('Glass', 'زجاج')], ['smoked', L('Smoked', 'مدخّن')]];
  const glassy = x.doorStyle !== 'solid';
  /* the selected column's own editor (Main tab: a main column, L-Shape tab: a wing column) */
  const colEditor = (part) => {
    const isM = part === 'm'; const i = isM ? colIdx : wIdx; if (i == null) return null;
    const mods = isM ? cols : wingMods; const m = mods[i]; if (!m) return null;
    const info = W.cols.find((c) => c.part === (isM ? 'main' : 'wing') && c.idx === i) || null;
    const sideWord = wing.side === 'left' ? L('Left', 'يسار') : L('Right', 'يمين');
    const title = isM ? `${L('Column', 'العمود')} ${i + 1}` : `${sideWord} ${L('column', 'عمود')} ${i + 1}`;
    return <ColumnEditor key={`${part}${i}${m.id}`} lang={lang} rules={R} title={title} mod={m} colInfo={info} type={design.type} doorStyle={x.doorStyle} doorGap={x.doorGap} drawerMode={x.drawerMode} doorCover={x.doorCover}
      onPatch={(patch, key) => patchOne(part, i, patch, key)} onDelete={() => (isM ? delCol(i) : delWingCol(i))} canDelete={mods.length > 1} testid={isM ? 'col-editor' : 'wcol-editor'} />;
  };
  /* "Main unit - columns" and "Right wing - columns" are the same card over different columns */
  const columnsCard = (part) => {
    const isM = part === 'm';
    const mods = isM ? cols : wingMods;
    const selI = isM ? colIdx : wIdx;
    const total = mods.reduce((t, m) => t + m.width, 0);
    const setW = isM ? setColW : setWingColW;
    const add = isM ? addCol : addWingCol;
    const tag = isM ? 'C' : 'R';
    const keep = isM ? keepW : keepWing;
    const sideWord = wing.side === 'left' ? L('Left', 'يسار') : L('Right', 'يمين');
    const pieces = bom.rows.filter((r) => (isM ? !/^Return wing/.test(r.group) : /^Return wing/.test(r.group))).reduce((t, r) => t + r.qty, 0);
    const range = isM ? dimRange.w : [WING_TOTAL_W.min, WING_TOTAL_W.max];
    const ghost = isM ? (wingOn ? { mods: wingMods, side: wing.side } : null) : { mods: cols, side: wing.side === 'left' ? 'right' : 'left' };
    const cmS = cmScale();
    return (
      <Card title={isM ? L('Main unit — columns', 'الوحدة الرئيسية — الأعمدة') : `${sideWord} ${L('wing — columns', 'الجناح — الأعمدة')}`} className="nkw-colscard"
        note={L('Tap a column in the drawing — or click a part in the 3D view — to edit it here. Drag the blue handles to change widths.', 'اضغط عمودًا في الرسم — أو جزءًا في العرض ثلاثي الأبعاد — لتعديله هنا. اسحب المقابض الزرقاء لتغيير العروض.')}>
        <MiniElevation mods={mods} height={design.dims.h} drawerMode={x.drawerMode} sel={selI} prefix={tag} lang={lang} testid={isM ? 'col-mini' : 'wing-mini'} mode={isM ? 'edge' : 'divider'} ghost={ghost} heightHandle={isM ? (handleList.find((h) => h.id === 'h:total') || null) : null} onHandle={onHandle}
          label={isM ? L('Main columns', 'الأعمدة الرئيسية') : L('Return wing columns', 'أعمدة الجناح الجانبي')}
          onSelect={(i) => pickCol(`${part}${i}`, `${isM ? 'wc' : 'wr'}-${mods[i].id}`)} onWidth={(i, v) => { if (selI !== i) pickCol(`${part}${i}`, `${isM ? 'wc' : 'wr'}-${mods[i].id}`); setW(i, v); }} onSplit={splitWing} />
        {isM
          ? <label className="nk-chk nkw-keep"><input type="checkbox" checked={keepW} onChange={(e) => setKeepW(e.target.checked)} data-testid="keep-width" /> <b>{L("Keep the closet's total width", 'الحفاظ على العرض الكلي للخزانة')}</b></label>
          : <label className="nk-chk nkw-keep"><input type="checkbox" checked={keepWing} onChange={(e) => setWing((w) => ({ ...w, keep: e.target.checked }), 'wing:keep')} data-testid="keep-wing" /> <b>{L("Keep the wing's total length", 'الحفاظ على الطول الكلي للجناح')}</b></label>}
        <p className="nk-sub nkw-note" data-testid={isM ? 'keep-note' : 'keep-wing-note'}>{keep
          ? (isM ? L(`The closet stays ${Math.round(total) / 10} cm; the free column shares a change.`, `تبقى الخزانة ${Math.round(total) / 10} سم؛ ويتشارك العمود الحر التغيير.`)
            : L(`${sideWord} wing stays ${Math.round(total) / 10} cm; the free column shares a change.`, `يبقى الجناح ${Math.round(total) / 10} سم؛ ويتشارك العمود الحر التغيير.`))
          : L('The total follows the columns.', 'الإجمالي يتبع الأعمدة.')}</p>
        <div className="nkw-stats">
          <div className="nkw-stat"><span>{isM ? L('Total width (cm)', 'العرض الكلي (سم)') : L('Wing length (cm)', 'طول الجناح (سم)')}</span>
            <ParameterField id={isM ? 'nkw-in-total' : 'nkw-in-wlen'} label={isM ? L('Total width (cm)', 'العرض الكلي (سم)') : L('Wing length (cm)', 'طول الجناح (سم)')} hideLabel value={total} min={range[0]} max={range[1]} step={10} scale={cmS} slider={false} compact hideRange lang={lang}
              onChange={(v) => (isM ? setDim('w', Math.round(v)) : setWingLength(Math.round(v)))} testid={isM ? 'total-w-in' : 'wing-len-in'} /></div>
          <div className="nkw-stat"><span>{isM ? L('Overall height', 'الارتفاع الكلي') : L('Wing depth (cm)', 'عمق الجناح (سم)')}</span>
            {isM
              ? <ParameterField id="nkw-in-overall" label={L('Overall height (cm)', 'الارتفاع الكلي (سم)')} hideLabel value={design.dims.h} min={dimRange.h[0]} max={dimRange.h[1]} step={10} scale={cmS} slider={false} compact hideRange lang={lang} onChange={(v) => setDim('h', Math.round(v))} />
              : <ParameterField id="nkw-in-wdepth" label={L('Wing depth (cm)', 'عمق الجناح (سم)')} hideLabel value={wing.depth} min={WING_DEPTH.min} max={WING_DEPTH.max} step={10} scale={cmS} slider={false} compact hideRange lang={lang}
                onChange={(v) => setWing((w) => ({ ...w, depth: Math.round(v) }), 'wing:depth')} testid="wing-depth-in" />}</div>
          <div className="nkw-stat"><span>{L('Pieces', 'القطع')}</span><b data-testid={isM ? 'pieces-tile' : 'wing-pieces-tile'}>{pieces}</b></div>
        </div>
        <button type="button" className="nk-btn nkw-add" onClick={add} data-testid={isM ? 'col-add' : 'wcol-add'}>+ {L('Add column', 'إضافة عمود')}</button>
      </Card>
    );
  };
  /* Doors / Material / Divisions for ALL columns (Main tab, under the columns card) */
  const doorsAll = (
    <div className="nkw-all nkw-allcard nk-card">
      <Row label={L('Doors · all columns', 'الأبواب · كل الأعمدة')}><Seg label={L('Doors', 'الأبواب')} value={design.type} onChange={setType} options={[['open', L('None', 'بدون')], ['hinged', L('Hinged', 'مفصلي')], ['sliding', L('Sliding', 'منزلق')]]} /></Row>
      <Row label={L('Material', 'المادة')}><Seg label={L('Door material', 'مادة الباب')} value={x.doorStyle} onChange={setMaterial} options={matLbl} /></Row>
      <Row label={L('Divisions', 'التقسيمات')}>
        <Step value={x.divisions} min={0} max={6} disabled={!glassy || design.type === 'open'} label={L('Divisions', 'التقسيمات')} onChange={(v) => setX({ divisions: v }, 'divisions')} />
      </Row>
      <p className="nk-sub nkw-note" data-testid="div-note">{glassy && design.type !== 'open'
        ? L(`along the door height - applies to every column · ${x.divisions} division${x.divisions === 1 ? '' : 's'} = ${x.divisions + 1} pane${x.divisions === 0 ? '' : 's'} per leaf. Black glazing bars and frames are cut-list parts.`, `على ارتفاع الباب - ينطبق على كل الأعمدة · ${x.divisions} تقسيم = ${x.divisions + 1} لوح لكل ضلفة. القضبان والإطارات السوداء ضمن قائمة القص.`)
        : L('along the door height - applies to every column. Divisions split a glass or smoked leaf into panes; a wood leaf is one board - pick Glass or Smoked to divide it.', 'على ارتفاع الباب - ينطبق على كل الأعمدة. التقسيمات تقسّم ضلفة الزجاج أو المدخّن إلى ألواح؛ ضلفة الخشب لوح واحد - اختر زجاج أو مدخّن لتقسيمها.')}</p>
    </div>
  );
  const warnItems = useMemo(() => columnWarnings(design, R), [dkey, R]); // eslint-disable-line react-hooks/exhaustive-deps
  const finishPicker = (
    <>
      {finishes.length > 0 ? (
        <select className="nk-inp nk-inp-wide" value={design.finishId || ''} aria-label={L('Exterior finish', 'التشطيب الخارجي')} onChange={(e) => commit({ ...d0(), finishId: e.target.value }, 'finish')}>
          {finishes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      ) : <p className="nk-sub">{L('No price-list finishes loaded - pick a board finish below (also in Look).', 'لا توجد تشطيبات من قائمة الأسعار - اختر تشطيب الألواح أدناه (وفي المظهر أيضًا).')}</p>}
      <div className="nk-chips">{Object.entries(FINISHES).map(([k, f]) => <button key={k} type="button" className="nk-chip" aria-pressed={x.finishKey === k} onClick={() => setX({ finishKey: k }, 'finishKey')}><span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}</button>)}</div>
    </>
  );
  /* M&S: the shared Look + Production-materials blocks (neoKitchen/LookBlock, ProductionMaterials) run on a view of THIS wardrobe: the project's own
   * paint / mats / matMap live in design.x, and everything they commit goes back there as one undo step */
  const msP = {
    model: { ...model, paint: x.paint, mats: x.mats, matMap: x.matMap }, lang, scene, bom, notify, currentUser, saveState: 'saved', unit: output.unit, downloadFile: download,
    commit: (m, key) => setX({ paint: m.paint || {}, mats: m.mats || {}, matMap: m.matMap || {} }, key),
    partMapLabel: ['Wardrobe part map', 'خريطة أجزاء الخزانة'], hideGroups: ['counter'], slotRows: WD_SLOTS,
  };
  /* the Global cards' source: every handler writes into design.x / design.dims (one history step each) */
  const G = {
    lang, design, x, model, dimRange, setField, heightNote: null,
    onWidth: (v) => setDim('w', v), onHeight: (v) => setDim('h', v), onDepth: (v) => setDim('d', v), onCols: setColCount,
    keepW, onKeepW: setKeepW, keepH, onKeepH: setKeepH, handlesOn: x.handle.style !== 'none', onHandles: setHandles,
    onDrawerMode: setDrawerModeAll, onDoorCover: (v) => setX({ doorCover: v }, 'doorCover'), onInnerFront: (v) => setX({ innerFront: v }, 'innerFront'),
  };
  const panelBody = () => {
    switch (tab) {
      case 'global': return (
        <>
          <GlobalCards G={G} />
          <OutputSettings lang={lang} variant="card" testid="global-output" />
          <Card title={L('Layout', 'التخطيط')} note={wingOn ? L('An L-shaped wardrobe: set the wing, its columns and the corner in the L-Shape tab.', 'خزانة بشكل L: اضبط الجناح وأعمدته والزاوية من تبويب حرف L.') : L('Add a return wing along a side wall for an L-shaped wardrobe.', 'أضف جناحًا جانبيًا على الحائط الجانبي للحصول على خزانة بشكل L.')}>
            <Seg label={L('Layout', 'التخطيط')} value={wingOn ? 'l' : 'straight'} onChange={(v) => setWingOn(v === 'l')} options={[['straight', L('Straight', 'مستقيم')], ['l', L('L-shape', 'حرف L')]]} />
            <div className="nkw-stat" data-testid="footprint"><span>{L('Footprint on the floor (W × D)', 'المساحة على الأرض (ع × ع)')}</span><b dir="ltr">{footprint.w} × {footprint.d} mm</b></div>
          </Card>
          <Card title={L('Look · daylight', 'المظهر · ضوء النهار')} note={L('The 3D view only: it never changes sizes, the cut list or the price.', 'العرض ثلاثي الأبعاد فقط: لا يغيّر المقاسات أو قائمة القص أو السعر.')}>
            <LookPresets lang={lang} look={lk.look} sun={lk.sun} onLook={setLook} onSun={setSun} />
            <Row label={L('Daylight', 'ضوء النهار')}><Toggle on={daylight} onChange={toggleDaylight} label={L('Daylight', 'ضوء النهار')} /></Row>
            <label className="nk-chk"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> {L('Floor grid', 'شبكة الأرضية')}</label>
          </Card>
        </>
      );
      case 'ms': return (
        <>
          <Card title={L('Finish', 'التشطيب')} note={L('The price-list finish colours the doors and boards; the board finish below is the 3D grain.', 'تشطيب قائمة الأسعار يلوّن الأبواب والألواح؛ تشطيب الألواح أدناه هو عرق الخشب في العرض ثلاثي الأبعاد.')}>{finishPicker}</Card>
          <Card title={L('Boards', 'الألواح')}>
            <Row label={L('Carcass board', 'لوح الهيكل')}><NumField value={x.board} min={10} max={30} step={0.5} onChange={(v) => setX({ board: v }, 'board')} label={L('Carcass board (mm)', 'لوح الهيكل (مم)')} lang={lang} /></Row>
            <Row label={L('Back board', 'لوح الظهر')}><NumField value={x.back} min={3} max={20} step={0.5} onChange={(v) => setX({ back: v }, 'back')} label={L('Back board (mm)', 'لوح الظهر (مم)')} lang={lang} /></Row>
          </Card>
          <div className="nkw-shared" data-testid="ms-shared"><LookBlock P={msP} /><ProductionMaterials P={msP} /></div>
        </>
      );
      case 'main': return (
        <>
          <ColumnWarnings items={warnItems.filter((w) => w.col[0] === 'm')} lang={lang} onFix={fixWarning} />
          {columnsCard('m')}
          {colEditor('m')}
          {doorsAll}
          <Card title={L('Quick layouts', 'تقسيمات سريعة')}>
            <div className="nk-chips" role="group" aria-label={L('Column layout', 'تقسيم الأعمدة')}>
              {opts.map((o, i) => <button key={i} type="button" className="nk-chip" aria-pressed={o.modules.length === cols.length && o.modules.every((w, j) => w === cols[j].width)} onClick={() => pickOpt(i)} data-testid={`opt-${i}`}><span dir="ltr">{o.count} × {o.moduleWidth}</span></button>)}
            </div>
          </Card>
        </>
      );
      case 'lshape': return (
        <>
          <div className="nkw-sides" role="group" aria-label={L('Return wing side', 'جهة الجناح الجانبي')} data-testid="wing-sides">
            {['left', 'right'].map((sd) => {
              const on = wingOn && wing.side === sd;
              return (
                <button key={sd} type="button" className="nkw-side" aria-pressed={on} onClick={() => setWingSide(sd)} data-testid={`wing-side-${sd}`}>
                  <span>{sd === 'left' ? L('Left', 'يسار') : L('Right', 'يمين')}</span>{!on && <small>{L('OFF', 'إيقاف')}</small>}
                </button>
              );
            })}
          </div>
          <p className="nk-sub nkw-note nkw-ushape" data-testid="u-note">{L('One return wing at a time: picking the other side moves the wing there (a wing on both sides, a U-shape, is not supported by the price and quote engines yet).', 'جناح جانبي واحد في كل مرة: اختيار الجهة الأخرى ينقل الجناح إليها (جناحان على الجانبين، شكل U، غير مدعوم في محرك السعر والعرض بعد).')}</p>
          <Card title={`L · ${wing.side === 'left' ? L('Left', 'يسار') : L('Right', 'يمين')} ${L('wing', 'جناح')}`} className="nkw-wingcard"
            note={wingOn ? (wing.corner === 'main' ? L(`${wing.side === 'left' ? 'Left' : 'Right'} return wing. The main wardrobe runs into the corner; the wing starts in front of it, behind its door board.`, 'جناح جانبي. الخزانة الرئيسية تدخل الزاوية؛ والجناح يبدأ أمامها، خلف لوح بابها.')
              : L(`${wing.side === 'left' ? 'Left' : 'Right'} return wing. The wing runs into the corner; the main wardrobe stops short of it by the wing depth.`, 'جناح جانبي. الجناح يدخل الزاوية؛ والخزانة الرئيسية تتوقف قبلها بمقدار عمق الجناح.')) : L('Switch the wing on to add a return wing along a side wall.', 'فعّل الجناح لإضافة جناح جانبي على الحائط الجانبي.')}>
            <Row label={L('Return wing', 'الجناح الجانبي')}><Toggle on={wingOn} onChange={setWingOn} label={L('Return wing', 'الجناح الجانبي')} /></Row>
            {wingOn && (
              <>
                <Row label={L('Corner', 'الزاوية')}><Seg label={L('Corner treatment', 'معالجة الزاوية')} value={wing.corner} onChange={(v) => setWing((w) => ({ ...w, corner: v }), 'wing:corner')} options={[['main', L('Main runs through', 'الرئيسي يمرّ')], ['wing', L('Wing runs through', 'الجناح يمرّ')]]} /></Row>
                <p className="nk-sub nkw-note" data-testid="corner-note">{wing.corner === 'main'
                  ? L('The main wardrobe goes into the corner; the wing starts in front of it (behind its door board).', 'الخزانة الرئيسية تدخل الزاوية؛ والجناح يبدأ أمامها (خلف لوح بابها).')
                  : L('The wing goes into the corner; the main wardrobe stops short of it by the wing depth.', 'الجناح يدخل الزاوية؛ والخزانة الرئيسية تتوقف قبلها بمقدار عمق الجناح.')}</p>
                <div className="nkw-stat" data-testid="footprint-l"><span>{L('Footprint on the floor (W × D)', 'المساحة على الأرض (ع × ع)')}</span><b dir="ltr">{footprint.w} × {footprint.d} mm</b></div>
              </>
            )}
          </Card>
          {wingOn && <ColumnWarnings items={warnItems.filter((w) => w.col[0] === 'w')} lang={lang} onFix={fixWarning} testid="wcol-warnings" />}
          {wingOn && columnsCard('w')}
          {wingOn && colEditor('w')}
        </>
      );
      case 'doors': return (
        <>
          <Card title={L('Door type', 'نوع الأبواب')} note={design.type === 'sliding' ? L('Sliding: two tracks per column, one leaf slides (Open shows it).', 'منزلق: سكتان لكل عمود وتنزلق ضلفة واحدة (زر فتح يوضحها).') : design.type === 'open' ? L('Open: no doors, only drawer fronts.', 'مفتوح: بدون أبواب، واجهات الأدراج فقط.') : L('Hinged: one leaf per 600 mm.', 'مفصلي: ضلفة لكل 600 مم.')}>
            <Seg label={L('Door type', 'نوع الأبواب')} value={design.type} onChange={setType} options={[['sliding', L('Sliding', 'منزلق')], ['hinged', L('Hinged', 'مفصلي')], ['open', L('Open', 'مفتوح')]]} />
            <Row label={L('Door style', 'نمط الباب')}><Seg label={L('Door style', 'نمط الباب')} value={x.doorStyle} onChange={setMaterial} options={[['solid', L('Solid', 'سادة')], ['glass', L('Glass', 'زجاج')], ['smoked', L('Smoked', 'مدخّن')]]} /></Row>
            <Row label={L('Divisions', 'التقسيمات')}><Step value={x.divisions} min={0} max={6} disabled={!glassy || design.type === 'open'} label={L('Divisions', 'التقسيمات')} onChange={(v) => setX({ divisions: v }, 'divisions')} /></Row>
          </Card>
          <Card title={L('Fronts', 'الواجهات')}>
            <Row label={L('Door board', 'لوح الباب')}><NumField value={x.doorThk} min={12} max={40} step={0.5} onChange={(v) => setX({ doorThk: v }, 'doorThk')} label={L('Door board (mm)', 'لوح الباب (مم)')} lang={lang} /></Row>
            <Row label={L('Door gap', 'فراغ الباب')}><NumField value={x.doorGap} min={0} max={10} step={0.5} onChange={(v) => setX({ doorGap: v }, 'doorGap')} label={L('Door gap (mm)', 'فراغ الباب (مم)')} lang={lang} /></Row>
          </Card>
        </>
      );
      case 'drawers': return (
        <>
          <Card title={L('Drawers per column', 'الأدراج لكل عمود')} note={L(`Each drawer is ${selMod && selMod.drawerH ? selMod.drawerH : DRAWER_H} mm high, at the bottom of the column.`, `ارتفاع الدرج ${selMod && selMod.drawerH ? selMod.drawerH : DRAWER_H} مم، أسفل العمود.`)}>
            {colPicker}
            <Row label={L('Drawers', 'الأدراج')}><Step value={aggregate('drawers')} min={0} max={Math.min(6, R.drawer_limit || 4)} label={L('Drawers', 'الأدراج')} onChange={(v) => patchCols({ drawers: v }, 'drawers')} /></Row>
            <Row label={L('Position', 'الموضع')}>
              <Seg label={L('Drawer position', 'موضع الأدراج')} value={selMod ? (selMod.dMode || x.drawerMode) : x.drawerMode} onChange={(v) => (selC ? patchCols({ dMode: v }, 'dMode') : setDrawerModeAll(v))} options={[['front', L('Front', 'أمامي')], ['inside', L('Inside', 'داخلي')]]} />
            </Row>
            <Row label={L('Drawer height', 'ارتفاع الدرج')}><NumField value={selMod ? (selMod.drawerH || DRAWER_H) : DRAWER_H} min={DRAWER_H_RANGE.min} max={DRAWER_H_RANGE.max} step={10} onChange={(v) => patchCols({ drawerH: Math.round(v) }, 'drawerH')} label={L('Drawer height (mm)', 'ارتفاع الدرج (مم)')} lang={lang} /></Row>
          </Card>
          <Card title={L('Inside drawers', 'الأدراج الداخلية')} note={L('Drawer boxes inside the carcass with the door OUTSIDE: the door covers the drawers; the box has no front board of its own, only an inner front or its box front. Open the door in 3D to see them.', 'صناديق أدراج داخل الهيكل والباب في الخارج: الباب يغطي الأدراج؛ والصندوق بلا لوح واجهة خاص به بل واجهة داخلية أو أمام الصندوق. افتح الباب في العرض ثلاثي الأبعاد لرؤيتها.')}>
            <InsideDrawerSettings G={G} testid="inside-settings-tab" />
          </Card>
          <Card title={L('Drawer box', 'صندوق الدرج')}>
            <Row label={L('Gap between fronts', 'الفراغ بين الواجهات')}><NumField value={x.drawerGap} min={0} max={10} step={0.5} onChange={(v) => setX({ drawerGap: v }, 'drawerGap')} label={L('Drawer gap (mm)', 'فراغ الدرج (مم)')} lang={lang} /></Row>
            <Row label={L('Runner clearance', 'خلوص السكة')}><NumField value={x.drawerSide} min={0} max={30} step={0.5} onChange={(v) => setX({ drawerSide: v }, 'drawerSide')} label={L('Runner clearance (mm)', 'خلوص السكة (مم)')} lang={lang} /></Row>
          </Card>
        </>
      );
      case 'shelves': return (
        <>
          <Card title={L('Shelves per column', 'الرفوف لكل عمود')} note={L('With a rail in the column the shelves sit above the hanging zone.', 'عند وجود معلاق في العمود تكون الرفوف فوق منطقة التعليق.')}>
            {colPicker}
            <Row label={L('Shelves', 'الرفوف')}><Step value={aggregate('shelves')} min={0} max={8} label={L('Shelves', 'الرفوف')} onChange={(v) => patchCols({ shelves: v }, 'shelves')} /></Row>
          </Card>
          <Card title={L('Shelf board', 'لوح الرف')}>
            <Row label={L('Thickness', 'السماكة')}><NumField value={x.shelfThk} min={6} max={50} step={0.5} onChange={(v) => setX({ shelfThk: v }, 'shelfThk')} label={L('Shelf board (mm)', 'لوح الرف (مم)')} lang={lang} /></Row>
          </Card>
        </>
      );
      case 'rails': {
        const cur = selC ? (selC.p === 'm' ? design.mods[selC.i] : wingMods[selC.i]).hanging : (allMods.every((m) => m.hanging === allMods[0].hanging) ? allMods[0].hanging : '');
        return (
          <>
            <Card title={L('Hanging rails', 'معلاق الملابس')} note={L(`Hanging zone: single ${HANG_H.single} mm, double ${HANG_H.double} mm, long coats ${HANG_H.long} mm.`, `منطقة التعليق: مفرد ${HANG_H.single} مم، مزدوج ${HANG_H.double} مم، معاطف ${HANG_H.long} مم.`)}>
              {colPicker}
              <Row label={L('Rail', 'المعلاق')}>
                <Seg label={L('Hanging', 'التعليق')} value={cur} onChange={(v) => patchCols({ hanging: v }, 'hanging')} options={HANG_KEYS.map((k) => [k, HANG_LBL[k][ar ? 1 : 0]])} />
              </Row>
            </Card>
            <Card title={L('Rail tube', 'ماسورة المعلاق')} note={L(`${stats.rails} rail(s) in the wardrobe.`, `${stats.rails} معلاق في الخزانة.`)}>
              <Row label={L('Diameter', 'القطر')}><NumField value={x.railDia} min={16} max={40} step={1} onChange={(v) => setX({ railDia: Math.round(v) }, 'railDia')} label={L('Rail diameter (mm)', 'قطر المعلاق (مم)')} lang={lang} /></Row>
            </Card>
          </>
        );
      }
      case 'hardware': return (
        <>
          <Card title={L('Handles', 'المقابض')}>
            <div className="nk-chips" role="group" aria-label={L('Handle style', 'نوع المقبض')}>{Object.entries(HANDLES).map(([k, h]) => <button key={k} type="button" className="nk-chip" aria-pressed={x.handle.style === k} onClick={() => setX({ handle: { ...x.handle, style: k } }, 'handle')}>{h[lang]}</button>)}</div>
            {x.handle.style === 'bar' && <Row label={L('Length', 'الطول')}><div className="nk-chips">{HANDLE_LENS.map((n) => <button key={n} type="button" className="nk-chip nk-chip-sm" aria-pressed={x.handle.len === n} onClick={() => setX({ handle: { ...x.handle, len: n } }, 'handle')}><span dir="ltr">{n}</span></button>)}</div></Row>}
            <Row label={L('Position', 'الموضع')}><Seg label={L('Handle position', 'موضع المقبض')} value={x.handle.pos} onChange={(v) => setX({ handle: { ...x.handle, pos: v } }, 'handle')} options={Object.keys(POS_LBL).map((k) => [k, POS_LBL[k][ar ? 1 : 0]])} /></Row>
          </Card>
          <Card title={L('Hardware list', 'قائمة الاكسسوارات')}>
            <table className="nk-table nk-table-sm"><tbody>{hardware.map((h) => <tr key={h.k}><td className="nk-td-name">{h[lang]}</td><td className="nk-mono nk-qty">{h.qty}</td></tr>)}</tbody></table>
          </Card>
        </>
      );
      default: return (
        <Card title={L('Clothes', 'الملابس')} note={L('Display only: clothes and hangers are drawn to judge space and proportions. They are not parts - not in the cut list or price, and only in OBJ / STL / 3DM when you tick "Include props" in Export.', 'للعرض فقط: الملابس والشماعات للحكم على المساحة والنِّسب. ليست قطعًا - ليست في قائمة القص أو السعر، وتظهر في OBJ / STL / 3DM فقط عند اختيار «تضمين الإكسسوارات» في التصدير.')}>
          <Row label={L('Show clothes', 'إظهار الملابس')}><Toggle on={x.clothes.on} onChange={(v) => setX({ clothes: { ...x.clothes, on: v } }, 'clothes')} label={L('Show clothes', 'إظهار الملابس')} /></Row>
          <Row label={L('Amount', 'الكمية')}><Seg label={L('Clothes amount', 'كمية الملابس')} value={x.clothes.density} onChange={(v) => setX({ clothes: { ...x.clothes, density: v } }, 'clothes')} options={[['light', L('Light', 'قليل')], ['medium', L('Medium', 'متوسط')], ['full', L('Full', 'ممتلئ')]]} /></Row>
          <p className="nk-sub" data-testid="clothes-stats">{L(`${stats.garments} hanging items · ${stats.folded} folded items`, `${stats.garments} قطعة معلقة · ${stats.folded} قطعة مطوية`)}</p>
        </Card>
      );
    }
  };

  const qeName = (() => { if (!qeC || !info) return ''; const lbl = ar ? String(info.inst.label).replace(/^Return column/, 'عمود الجناح').replace(/^Column/, 'عمود') : info.inst.label; return qeC.kind === 'column' || !qeC.col ? lbl : `${KIND_NAME[qeC.kind][ar ? 1 : 0]} · ${lbl}`; })();
  const qeEl = qeOn ? (
    <QuickEdit lang={lang} view={view} hostRef={stageMainRef} sinkRef={qeSink} sel={sel} rtl={ar} kindKey={`${qeC.kind}:${qeC.col ? qeC.col.key : ''}`} kindName={qeName}
      ptype={info.ptype} dimsText={selDims(info.dims)} items={quickItems(qeCtx())} onAction={onQuick} onClose={() => setQeHide(selKey)} onReason={notify} onUndo={undo} onRedo={redo} />
  ) : null;

  /* ---------- render ---------- */
  const emptyLabel = L('Wardrobe', 'خزانة');
  return (
    <div className={`nk nk-wd${ar ? ' nk-rtl' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={lang} onKeyDown={onKeyDown} data-testid="neo-wardrobe" data-view={view} data-panel-open={panelOpen ? '1' : '0'} data-panel-mode={drawer ? 'drawer' : 'dock'} data-asst={asstOpen ? (asstDocked ? 'dock' : 'float') : 'off'}>
      <header className="nk-head">
        <div className="nk-brand">
          <span className="nk-logo" aria-hidden="true">N</span>
          <div className="nk-title-wrap">
            <div className="nk-appname">{L('Neo Wardrobe Designer', 'مصمم خزائن نيو')}</div>
            <div className="nk-subtitle">{L('THE CLOSETS · NEO STUDIO', 'الخزائن · استوديو نيو')}</div>
          </div>
          <input className="nk-title" aria-label={L('Project title', 'عنوان المشروع')} value={x.title} maxLength={80} onChange={(e) => setX({ title: e.target.value }, 'title')} />
        </div>
        <div className="nk-right">
          {onClose && <button type="button" className="nk-hb nkw-hd" onClick={onClose} data-testid="wd-classic" data-tip={L('Back to the classic engineering view', 'العودة إلى العرض الهندسي الكلاسيكي')}><span className="nk-hb-t">{L('Classic view', 'العرض الكلاسيكي')}</span></button>}
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Undo (Ctrl+Z)', 'تراجع (Ctrl+Z)')} aria-label={L('Undo', 'تراجع')} disabled={!canUndo} onClick={undo}><Ic n="undo" /></button>
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Redo (Ctrl+Y)', 'إعادة (Ctrl+Y)')} aria-label={L('Redo', 'إعادة')} disabled={!canRedo} onClick={redo}><Ic n="redo" /></button>
          {price && <span className="nk-saved-chip nkw-price nkw-hd" role="status" data-testid="wd-price" title={L('Priced by the same engine as Quote Max', 'مسعّر بنفس محرك Quote Max')}>{price}</span>}
          {priced && <QuoteLauncher className="nkw-quote nkw-hd" lang={lang} user={currentUser} toast={toast} disabled={!valOk} disabledReason={L('Fix the validation items in the classic view first', 'أصلح بنود التحقق في العرض الكلاسيكي أولًا')} getContext={() => wardrobeCtx({ design: designRef.current, W, finish, priced, rules: R, onAdvanced: onSendToQuote, apply: (d) => commit(d, 'quote:describe') })} />}
          <FileMenu lang={lang} layout="straight" dirty={dirty} open={menu === 'file'} wrapRef={menuRef}
            onToggle={() => setMenu(menu === 'file' ? null : 'file')} onClose={() => setMenu(null)} onResetCamera={() => setCam('reset')}
            onSave={() => { doExport('json'); notifyExplicitSave('neo-closets'); }} onLoadFile={importFile}
            onNewEmpty={() => loadDesign(blankDesign(), L('New blank wardrobe. Undo brings the previous one back.', 'خزانة فارغة جديدة. التراجع يعيد السابقة.'))}
            onDefault={() => loadDesign(defaultDesign(R), L('Default wardrobe loaded. Undo brings the previous one back.', 'تم تحميل الخزانة الافتراضية. التراجع يعيد السابقة.'))}
            nouns={{ layout: [`${wingOn ? 'L · ' : ''}${design.type === 'sliding' ? 'Sliding' : design.type === 'open' ? 'Open' : 'Hinged'} · ${cols.length + (wingOn ? wingMods.length : 0)} col`, `${wingOn ? 'L · ' : ''}${{ sliding: 'منزلق', hinged: 'مفصلي', open: 'مفتوح' }[design.type]} · ${cols.length + (wingOn ? wingMods.length : 0)} أعمدة`], empty: ['New — blank wardrobe', 'جديد — خزانة فارغة'], def: ['Default wardrobe', 'الخزانة الافتراضية'], discard: ['Discard the current wardrobe?', 'تجاهل الخزانة الحالية؟'] }} />
          <ExportMenu lang={lang} unit={output.unit} model={model} scene={scene} bom={bom} hardware={hardware} warnings={warnings} ui={ui} onLegacy={doExport} log={exportsLog} onLog={logExport} notify={notify} product="wardrobe" />
          {onSendToQuote && <button type="button" className="nk-btn nkw-quote nkw-hd" disabled={!valOk} onClick={onSendToQuote} data-testid="wd-quote" title={valOk ? L('Open in Quote Max (advanced)', 'فتح في Quote Max (متقدم)') : L('Fix the validation items in the classic view first', 'أصلح بنود التحقق في العرض الكلاسيكي أولًا')}>{priced ? L('Quote Max', 'Quote Max') : L('Send to Quote Max', 'إرسال إلى Quote Max')}</button>}
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
                <button key={k} type="button" role="tab" id={`nkw-tab-${k}`} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} className="nk-rt" data-tab={k} onClick={() => setTab(k)}>
                  <Ic n={ic === 'carcass' ? 'base' : ic} size={20} /><span className="nk-rt-t">{ar ? a : en}</span>
                </button>
              ))}
            </nav>
            <div className="nk-pcol">
              <div role="tabpanel" aria-labelledby={`nkw-tab-${tab}`} className="nk-panel-scroll nkw-panel" data-panel={tab}>
                <div className="nkw-actions" role="group" aria-label={L('Wardrobe actions', 'إجراءات الخزانة')}>
                  {price && <span className="nk-saved-chip nkw-price">{price}</span>}
                  {onClose && <button type="button" className="nk-btn" onClick={onClose} data-testid="wd-classic-m">{L('Classic view', 'العرض الكلاسيكي')}</button>}
                  {priced && <QuoteLauncher testid="nq-open-m" lang={lang} user={currentUser} toast={toast} disabled={!valOk} getContext={() => wardrobeCtx({ design: designRef.current, W, finish, priced, rules: R, onAdvanced: onSendToQuote, apply: (d) => commit(d, 'quote:describe') })} />}
                  {onSendToQuote && <button type="button" className={priced ? 'nk-btn' : 'nk-btn nk-btn-primary'} disabled={!valOk} onClick={onSendToQuote} data-testid="wd-quote-m">{priced ? L('Open in Quote Max (advanced)', 'فتح في Quote Max (متقدم)') : L('Send to Quote Max', 'إرسال إلى Quote Max')}</button>}
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
          <div className="nk-stagemain" ref={stageMainRef}>
          {openBar && view !== 'cut' && (
            <OpenControl lang={lang} scene={scene} openIds={openIds} onOpenIds={setOpenIds} speed={openSpeed} onSpeed={setOpenSpeed} scope={openScope} onScope={setOpenScope}
              selUnitId={sel ? sel.unitId : null} selLabel={info ? info.inst.label : ''} onClose={() => setOpenBar(false)} />
          )}
          {view === 'design' && (
            <>
              <div className="nk-modebar" role="group" aria-label={L('Elevation controls', 'عناصر تحكم الواجهة')} data-testid="elev-bar">
                <Seg className="nk-seg-run" label={L('Elevation view', 'عرض الواجهة')} value={runView}
                  options={[['main', L('MAIN', 'رئيسي')], ['wing', wing.side === 'left' ? L('LEFT', 'يسار') : L('RIGHT', 'يمين'), wingOn ? L('The L-shaped return wing', 'الجناح الجانبي بشكل L') : L('Turn on the return wing in the L-Shape tab to see this side', 'فعّل الجناح الجانبي من تبويب حرف L لرؤية هذه الجهة'), !wingOn]]} onChange={setRunView} />
                <span className="nk-mb-sep" aria-hidden="true" />
                <label className="nk-chk"><input type="checkbox" checked={dimsOn} onChange={(e) => setDims(e.target.checked)} /> {L('Dimensions', 'الأبعاد')}</label>
                <label className="nk-chk"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> {L('Internal', 'داخلي')}</label>
                <label className="nk-chk"><input type="checkbox" checked={mapOn} onChange={(e) => setMap(e.target.checked)} /> {L('Map', 'خريطة')}</label>
                <label className="nk-chk nk-chk-hdl" title={L('Drag the blue handles on the drawing to change sizes; arrow keys nudge a focused handle', 'اسحب المقابض الزرقاء على الرسم لتغيير المقاسات؛ مفاتيح الأسهم تحرّك المقبض المحدد')}><input type="checkbox" data-testid="handles-toggle" checked={handlesOn} onChange={(e) => setHandlesOn(e.target.checked)} /> {L('Handles', 'المقابض')}</label>
                <label className="nk-chk"><input type="checkbox" checked={center} onChange={(e) => setCenter(e.target.checked)} /> {L('Centre lines', 'خطوط المنتصف')}</label>
              </div>
              <div className="nkw-legend nk-legend" role="group" aria-label={L('Part types (click to isolate)', 'أنواع القطع (انقر للعزل)')}>
                {legend.map((t) => (
                  <button key={t.k} type="button" className="nk-lg" aria-pressed={isolate === t.k} onClick={() => setIsolate(isolate === t.k ? null : t.k)}>
                    <span className={`nk-sw nk-pt nk-pt-${t.k}`} />{t[lang]}
                  </button>
                ))}
              </div>
              <div className="nk-draw" data-testid="elevation-wrap" onContextMenu={onDrawCtx}>
                <Elevation scene={scene} runKey={elevKey} ui={ui} selected={sel} onSelect={pickSel} onDrag={onDrag} lang={lang} handles={['width', 'height']} handleList={handleList} onHandle={onHandle} />
              </div>
              {qeEl}
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
              <Kitchen3D scene={scene} ui={ui} model={model} lang={lang} onSelect={pickSel} onAnchor={onAnchor3d} camCmd={camCmd} sel={sel} unit={output.unit} onToggleFront={onToggleFront} poseRef={poseRef} label={['3D wardrobe view. Arrow keys orbit, + and - zoom, 0 refits.', 'عرض ثلاثي الأبعاد للخزانة. الأسهم للدوران، + و - للتكبير، 0 للإعادة.']} />
              </div>
              {qeEl}
              <div className="nk-hint" data-hint3d="1">{hold
                ? L('Camera held (L to release) · click to select · double-click a door or drawer to open it', 'الكاميرا مثبتة (L للإلغاء) · انقر للتحديد · نقرتان على باب أو درج لفتحه')
                : L('Drag to orbit · right/Shift-drag or two fingers to pan · scroll to zoom to the cursor · arrows/WASD nudge · double-click a part to focus, a door to open · L holds', 'اسحب للدوران · زر أيمن/Shift أو إصبعان للتحريك · العجلة للتكبير نحو المؤشر · الأسهم/WASD للإزاحة · نقرتان على قطعة للتركيز وعلى باب لفتحه · L للتثبيت')}</div>
            </>
          )}
          {view === 'cut' && (
            <div className="nk-cutwrap" data-testid="cutlist">
              <CutListView bom={bom} hardware={hardware} warnings={warnings} est={null} prices={null} lang={lang} unit={output.unit} onExport={doExport} model={model} product="wardrobe" />
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
              <button type="button" className="nk-btn nk-btn-ghost" onClick={() => { setAsstSeed({ text: `column ${info.inst.idx + 1} `, n: Date.now() }); setAsstOpen(true); }} data-testid="sel-ai">{L('Ask Haneen', 'اسأل حنين')}</button>
              <button type="button" className="nk-ib" aria-label={L('Close', 'إغلاق')} onClick={() => setSel(null)} data-testid="sel-close"><Ic n="close" size={16} /></button>
            </div></div>
          )}
          </div>
          {vtools}
          </div>
          <div className="nk-status" role="status" aria-live="polite" data-testid="status">{status}</div>
        </main>

        {asstOpen && (
          <WardrobeAssistant design={design} lang={lang} rules={R} seed={asstSeed} docked={asstDocked} onLang={setLang} selectedLabel={info ? info.name : ''}
            rect={floatRect} bounds={{ w: body.w, h: body.h }} rtl={ar} onRect={setAsstRect} onRectCommit={(r) => { setAsstRect(r); saveWsPrefs({ asstRect: r }); }}
            canDock={dock} onToggleMode={() => { const m = asstDocked ? 'float' : 'dock'; setAsstMode(m); saveWsPrefs({ asstMode: m }); }} onCollapse={() => setAsstOpen(false)}
            onApply={(d) => commit(d, `ai:${Date.now()}`)} onUi={uiCmd} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} onClose={() => setAsstOpen(false)} />
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
            <h1>{x.title || emptyLabel}</h1>
            <p>Neo Wardrobe Designer · {new Date().toLocaleDateString()} · {design.dims.w} × {design.dims.h} × {design.dims.d} mm</p>
            {scene.runs.map((r) => (
              <figure key={r.key} className="nk-print-fig"><figcaption>{r.key === 'main' ? emptyLabel : L('Return wing', 'الجناح الجانبي')}</figcaption>
                <Elevation scene={scene} runKey={r.key} ui={{ ...ui, dims: true, xray: false, openDoors: false, openIds: new Set(), internal: false, map: false, center: false, isolate: null, layers: ALL_LAYERS }} selected={null} onSelect={() => {}} onDrag={() => {}} lang={lang} interactive={false} />
              </figure>
            ))}
          </div>
          <div className="nk-print-sheet nk-print-bom">
            <CutListView bom={bom} hardware={hardware} warnings={warnings} est={null} prices={null} lang={lang} unit={output.unit} onExport={() => {}} model={model} compact product="wardrobe" />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
