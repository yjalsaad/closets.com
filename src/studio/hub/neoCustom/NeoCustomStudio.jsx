/* =============================================================================
 * Neo Custom Designer Studio [NEO-CUSTOM-UX28] - one-off furniture (tables, beds, shelving, benches, consoles, reception counters, display units,
 * headboards ...) in the same Neo style as the Neo Kitchen Designer and the Neo Wardrobe Studio.
 *
 * Floating toolbar (Design | 3D View | Cut List | X-Ray | Explode | Open | Daylight | Look), collapsible Parameters rail (Global | M&S | Parts | Hardware),
 * the technical drawing (front / side / top, dimensions, numbered callouts), the 3D view (Kitchen3D: orbit / pan / zoom, Hold camera, X-Ray, radial Explode,
 * animated Open, Look presets), the cut list with sheet nesting, File + Export menus (PDF, Excel, OBJ, STL, 3DM beta, DXF cutting plan), Haneen (Bonsai assistant),
 * undo / redo, EN / AR with RTL.
 *
 * It is CONTROLLED: NeoCustomDesigner owns the design (autosave, price, Quote Max hand-off); every change goes through commit() -> onApply(), and
 * buildCustom() (customBuild.js) turns the one design into the solved parts, the scene, the cut list, the hardware, the warnings and the price. The drawing,
 * the 3D view, the Parts list, the cut list and the exports all read that one build, so they cannot disagree.
 * ===========================================================================*/
import { wsShowFactory } from '../wsFlags'; // [WEB-STUDIO]
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../neoKitchen/neoKitchen.css';
import './customStudio.css';
import './customIcons';
import { Seg, useDismiss } from '../neoKitchen/ui';
import { Ic, Tool } from '../neoKitchen/icons';
import OpenControl from '../neoKitchen/OpenControl';
import { loadWsPrefs, saveWsPrefs, frontIds, toggleIds, groupIdsOfPart, clampSpeed, SPEED } from '../neoKitchen/workspace3d';
import { clampFloatRect, defaultFloatRect, cleanFloatRect } from '../neoKitchen/floatRect';
import { useMedia } from '../neoKitchen/useMedia';
import { useEdgeFade } from '../neoKitchen/useEdgeFade';
import VtMenu from '../neoKitchen/VtMenu';
import { VIEW_ORDER } from '../neoKitchen/cameraViews';
import Kitchen3D from '../neoKitchen/Kitchen3D';
import LookPresets from '../neoKitchen/LookPresets';
import { loadLook, saveLook, lookTitle, lookOf, clampSun } from '../neoKitchen/lookProfiles';
import CutListView from '../neoKitchen/CutListView';
import ExportMenu from '../neoKitchen/ExportMenu';
import OutputSettings, { useOutput } from '../neoKitchen/OutputSettingsControl';
import { attachOutput, applyOutputFromText } from '../neoKitchen/outputSettings';
import FileMenu from '../neoKitchen/FileMenu';
import ConfirmDialog from '../neoKitchen/ConfirmDialog';
import { FINISHES } from '../neoKitchen/constants';
import { bomCSV, download, safeName } from '../neoKitchen/exporters';
import { MAX_IMPORT_BYTES } from '../neoKitchen/fileMenuLogic';
import '../neoKitchen/workspace.css';
import { buildCustom } from './customBuild';
import {
  designJSON, parseDesign, designKey, blankDesign, deletePart, getPart, partName, FINISH_KEYS, normalizeDesign, setX, addPart,
} from './customModel';
import { fromTemplate, defaultDesign, TEMPLATE } from './customTemplates';
import { selectionInfo, openIdsFor, selForScene } from './customScene';
import { buildCustomDXF } from './customExports';
import { money } from './customPrice';
import CustomDrawing from './CustomDrawing';
import { useHandlesPref } from '../neoHandles/HandleLayer';
import { createHandleDispatch } from '../neoHandles/handleModel';
import CustomParts from './CustomParts';
import CustomNesting from './CustomNesting';
import CustomAssistant from './CustomAssistant';
import { GlobalPanel, MsPanel, HardwarePanel, SLOT_ROWS } from './CustomPanels';
import { usePublishDesignMeta, notifyExplicitSave } from '../neoLeads/leadContext';
import QuoteLauncher from '../neoQuote/QuoteLauncher'; // [NEO-QUOTE-UX33] shared Quote builder
import { customCtx } from '../neoQuote/contexts';

const TABS = [['global', 'global', 'Global', 'عام'], ['ms', 'ms', 'M&S', 'المواد'], ['parts', 'cuTree', 'Parts', 'الأجزاء'], ['hardware', 'hardware', 'Hardware', 'الاكسسوار']];
const LAYERS = [['base', 'Structure', 'الهيكل'], ['doors', 'Doors and fronts', 'الأبواب والواجهات'], ['hardware', 'Hardware', 'الاكسسوار']];
const ALL_LAYERS = { base: true, wall: true, top: true, counter: true, plinth: true, doors: true, hardware: true };
const LEGEND = [['baseUnit', 'Panel', 'لوح'], ['wallUnit', 'Frame / leg', 'إطار / رجل'], ['shelf', 'Shelf', 'رف'], ['door', 'Door', 'باب'], ['flip', 'Flip-up', 'قلاب'], ['drawer', 'Drawer', 'درج'],
  ['glass', 'Glass', 'زجاج'], ['open', 'Back panel', 'ظهر'], ['counter', 'Top', 'سطح'], ['plinth', 'Plinth', 'قاعدة'], ['cover', 'Fixed front / hardware', 'واجهة ثابتة / اكسسوار']];
const selDims = (d) => `${d.map((v) => Math.round(v * 10) / 10).join(' × ')} mm`;
const CLASS_LBL = { Carcass: ['Board', 'لوح'], Back: ['Back board', 'لوح ظهر'], Shelf: ['Shelf board', 'لوح رف'], Door: ['Door board', 'لوح باب'], Drawer: ['Drawer board', 'لوح درج'], Plinth: ['Plinth board', 'لوح قاعدة'], Countertop: ['Top / worktop', 'سطح'], Glass: ['Glass', 'زجاج'], Timber: ['Solid timber', 'خشب صلب'] };

export default function NeoCustomStudio({
  design, onApply, onSendToQuote, toast, startLang = 'en', currentUser = null, autosaveAt = '', saveState = 'saved', onBuilt, restored = false,
}) {
  const [lang, setLang] = useState(startLang === 'ar' ? 'ar' : 'en');
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] units + precision (shared setting)
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const narrow = useMedia('(max-width: 640px)');
  const dock = useMedia('(min-width: 1280px)');
  const drawer = useMedia('(max-width: 1023px)');
  const railRef = useRef(null);
  const [view, setView] = useState('design');
  const [tab, setTab] = useState('parts');
  const [drawMode, setDrawMode] = useState('all');
  const [panelOpen, setPanelOpen] = useState(() => !(typeof window !== 'undefined' && window.innerWidth < 1024));
  const [layers, setLayers] = useState(ALL_LAYERS);
  const [xray, setXray] = useState(false);
  const [explode, setExplode] = useState({ on: false, mode: 'assembly', amt: 1, diagram: false });
  const [openBar, setOpenBar] = useState(false);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [dimsOn, setDims] = useState(true);
  const [handlesOn, setHandlesOn] = useHandlesPref(); // [NEO-HANDLES-UX36] the SMART HANDLES on the drawing (remembered)
  const [callouts, setCallouts] = useState(true);
  const [internal, setInternal] = useState(false);
  const [center, setCenter] = useState(false);
  const [snapOn, setSnap] = useState(() => design.x.snap !== false);
  const [isolate, setIsolate] = useState(null);
  const [grid, setGrid] = useState(true);
  const [guides, setGuides] = useState(true);
  const [camCmd, setCamCmd] = useState(null);
  const [lk, setLk] = useState(() => loadLook());
  const [menu, setMenu] = useState(null);
  const [sel, setSel] = useState(null); // { unitId } - the design part id, shared by the drawing, the 3D view and the Parts list
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
  const [askTpl, setAskTpl] = useState(null);
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
    const ro = new ResizeObserver(() => setTight(el.clientWidth < 880));
    ro.observe(el); setTight(el.clientWidth < 880);
    return () => ro.disconnect();
  }, []);

  const notify = useCallback((m) => {
    setStatus(m); clearTimeout(statusT.current); statusT.current = setTimeout(() => setStatus(''), 4500);
    if (typeof toast === 'function') { try { toast(m); } catch (e) { /* ignore */ } }
  }, [toast]);

  /* ---------- the one build ---------- */
  const dkey = designKey(design);
  const built = useMemo(() => buildCustom(design), [dkey]); // eslint-disable-line react-hooks/exhaustive-deps
  const { scene, model, bom, hardware, warnings, est } = built;
  const price = money(est.net);
  usePublishDesignMeta('neo-custom', { price: est.net, currency: 'BD' }); // [NEO-LEADS-UX37]
  const priceTitle = ar ? 'الصافي قبل الضريبة · أسعار مؤقتة حتى يزوّد المالك قائمة الأسعار' : 'Net before VAT · PLACEHOLDER rates until the owner supplies the price list';
  const valOk = bom.rows.length > 0;
  useEffect(() => { if (restored) notify(L('Restored your autosaved piece.', 'تمت استعادة قطعتك المحفوظة تلقائيًا.')); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (typeof onBuilt === 'function') onBuilt(built); }, [built]); // eslint-disable-line react-hooks/exhaustive-deps
  const info = useMemo(() => selectionInfo(design, scene, bom, sel, lang), [design, scene, bom, sel, lang]);
  const asstDocked = dock && asstMode === 'dock';
  const floatRect = useMemo(() => clampFloatRect(asstRect || defaultFloatRect(body.w, body.h, ar), body.w, body.h), [asstRect, body.w, body.h, ar]);
  useEffect(() => { if (sel && !getPart(design, sel.unitId)) setSel(null); }, [design, sel]);
  const partWarn = useCallback((id) => warnings.filter((w) => w.partIds && w.partIds.includes(id)), [warnings]);

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
    else if (e.key === 'Delete' && sel && view === 'design' && tab !== 'parts') { e.preventDefault(); commit(deletePart(designRef.current, sel.unitId), `del:${Date.now()}`); setSel(null); }
  };

  /* ---------- selection + edits that start outside the Parts tab ---------- */
  const pickPart = useCallback((id) => { setSel(id ? { unitId: id } : null); }, []);
  const onPick3D = useCallback((pick) => { setSel(pick && pick.unitId ? { unitId: pick.unitId } : null); }, []);
  const onTemplate = (k) => {
    const apply = () => { const d = k === 'blank' ? blankDesign(designRef.current.dims) : fromTemplate(k); commit({ ...d, x: { ...d.x, rates: designRef.current.x.rates } }, `tpl:${Date.now()}`); savedKey.current = designKey(designRef.current); setSel(null); notify(L('Template loaded. Undo brings the previous design back.', 'تم تحميل القالب. التراجع يعيد التصميم السابق.')); };
    if (designKey(designRef.current) !== savedKey.current && designRef.current.parts.length) setAskTpl({ k, apply }); else apply();
  };
  const onAddHw = (preset) => { const r = addPart(designRef.current, preset); commit(r.design, `add:${Date.now()}`); setSel({ unitId: r.id }); setTab('parts'); };

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
  const dirty = designKey(design) !== savedKey.current;
  const doExport = useCallback((kind) => {
    setMenu(null);
    const base = safeName(design.title || 'custom');
    if (kind === 'json') { download(`${base}.json`, attachOutput(designJSON(designRef.current)), 'application/json'); logExport('JSON'); savedKey.current = designKey(designRef.current); tick((n) => n + 1); notify(L('Design saved as JSON.', 'تم حفظ التصميم JSON.')); }
    else if (kind === 'dxf') { download(`${base}.dxf`, buildCustomDXF(built, output), 'application/dxf'); logExport('DXF'); notify(L('DXF (R12) exported: drawing views + flat parts.', 'تم تصدير DXF (R12): المناظير والقطع المسطحة.')); }
    else if (kind === 'csv') { download(`${base}-cutlist.csv`, bomCSV(bom, model.matMap, output), 'text/csv'); logExport('CSV'); notify(L('Cut list CSV exported.', 'تم تصدير قائمة القص CSV.')); }
    else if (kind === 'print') setPrinting(true);
  }, [built, bom, model, design.title, ar, output]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => { try { window.print(); } catch (e) { /* ignore */ } if (!window.matchMedia || !('onafterprint' in window)) setTimeout(done, 400); }, 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [printing]);
  const loadDesign = useCallback((d, msg) => { commit(d, `load:${Date.now()}`); savedKey.current = designKey(d); setSel(null); notify(msg); }, [commit, notify]);
  const importFile = useCallback((file) => {
    if (file && file.size > MAX_IMPORT_BYTES) { notify(L('Import failed: the file is too large. Your design was not changed.', 'فشل الاستيراد: الملف كبير جدًا. لم يتغير تصميمك.')); return; }
    const rd = new FileReader();
    rd.onload = () => { try { loadDesign(parseDesign(String(rd.result)), L('Design loaded.', 'تم تحميل التصميم.')); applyOutputFromText(String(rd.result)); } catch (e) { notify(L(`Import failed: ${e.message}. Your design was not changed.`, `فشل الاستيراد: ${e.message}. لم يتغير تصميمك.`)); } };
    rd.onerror = () => notify(L('Could not read the file. Your design was not changed.', 'تعذرت قراءة الملف. لم يتغير تصميمك.'));
    rd.readAsText(file);
  }, [loadDesign, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- derived view bits ---------- */
  const ui = { layers, xray, explode, openDoors: false, openIds, openSpeed, hold, dims: dimsOn, internal, map: false, center, wall: true, isolate, lighting: 'neutral', grid, guides, look: lk.look, sun: lk.sun, props: true };
  const dui = { dims: dimsOn, callouts, internal, center, isolate, handles: handlesOn };
  /* [NEO-HANDLES-UX36] handle drags commit through the studio's own commit: one undo step per drag */
  const hdlSeq = useRef({ n: 0 });
  const onHandle = useMemo(() => createHandleDispatch((next, key) => commit(next, key), hdlSeq.current), [commit]);
  const present = useMemo(() => new Set(scene.parts.map((p) => p.ptype)), [scene]);
  const legend = LEGEND.filter(([k]) => present.has(k));
  const TIP = {
    design: L('Technical drawing: front, side and top with live dimensions', 'الرسم الفني: أمامي وجانبي وعلوي بأبعاد حية'), '3d': L('Interactive 3D model - orbit, pan and zoom', 'نموذج ثلاثي الأبعاد تفاعلي - دوران وتحريك وتكبير'), cut: L('Cut list, sheet nesting, hardware, price', 'قائمة القص وترتيب الألواح والاكسسوار والسعر'),
    xray: L('See through the panels: hinge cups, drawer boxes', 'رؤية عبر الألواح: كوبات المفصلات وصناديق الأدراج'), explode: L('Pull every part away from the centre to see how it is built', 'ابعد كل قطعة عن المركز لترى طريقة التركيب'),
    open: L('Open or close all doors and drawers', 'فتح أو إغلاق كل الأبواب والأدراج'), daylight: L('Sunny room with a wood floor', 'غرفة مشمسة بأرضية خشبية'), look: L('Look presets, finish and floor grid', 'أنماط المظهر والتشطيب وشبكة الأرضية'),
  };
  const lookMenu = menu === 'look' && (
    <div className="nk-menu nk-menu-look" role="dialog" aria-label={L('Look', 'المظهر')}>
      <LookPresets lang={lang} look={lk.look} sun={lk.sun} onLook={setLook} onSun={setSun} />
      <div className="nk-menu-h">{L('Board finish', 'تشطيب الألواح')}</div>
      <div className="nk-chips">{FINISH_KEYS.map((k) => <button key={k} type="button" className="nk-chip" aria-pressed={design.finishKey === k} onClick={() => commit(normalizeDesign({ ...design, finishKey: k }), 'finish')}><span className="nk-swatch" style={{ background: `var(${FINISHES[k].cssVar})` }} />{FINISHES[k][lang]}</button>)}</div>
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
          <div className="nk-tg" role="group" aria-label={L('Piece', 'القطعة')}>
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
          <Tool nativeTip icon="fit" text={L('Fit', 'ملاءمة')} label={L('Fit to screen', 'ملاءمة الشاشة')} tip={L('Fit the whole piece in view (F, or double-click)', 'إظهار القطعة كاملة (F أو نقرتان)')} onClick={() => setCam('fit')} />
          <Tool nativeTip icon="reset" text={L('Reset', 'إعادة')} label={L('Reset camera', 'إعادة الكاميرا')} tip={L('Back to the opening angle (0)', 'العودة للزاوية الأولى (0)')} onClick={() => setCam('reset')} />
          <Tool nativeTip icon={hold ? 'lock' : 'unlock'} text={hold ? L('Held', 'مثبتة') : L('Hold', 'تثبيت')} label={L('Hold camera', 'تثبيت الكاميرا')} pressed={hold} data-testid="tool-hold"
            tip={hold ? L('Camera held: no auto re-fit and no accidental orbit - you can still pick parts (L to release)', 'الكاميرا مثبتة: لا ملاءمة تلقائية ولا دوران عرضي - يمكنك اختيار القطع (L للإلغاء)') : L('Hold the camera exactly where it is (L)', 'تثبيت الكاميرا في مكانها بالضبط (L)')} onClick={() => setHold(!hold)} />
          <Tool nativeTip icon="grid" text={L('Grid', 'الشبكة')} label={L('Floor grid', 'شبكة الأرضية')} tip={L('Show or hide the floor grid', 'إظهار أو إخفاء شبكة الأرضية')} pressed={grid} onClick={() => setGrid(!grid)} />
          <Tool nativeTip icon="guides" text={L('Guides', 'القياس')} label={L('Measurement guides', 'خطوط القياس')} tip={L('Overall width, height and depth lines', 'خطوط العرض والارتفاع والعمق الكلية')} pressed={guides} onClick={() => setGuides(!guides)} />
        </>
      )}
      <div className="nk-menuwrap" ref={menu === 'layers' ? menuRef : null}>
        <Tool nativeTip icon="layers" text={L('Layers', 'الطبقات')} label={L('Layers', 'الطبقات')} tip={L('Show or hide structure, doors and fronts, hardware', 'إظهار أو إخفاء الهيكل والأبواب والواجهات والاكسسوار')} expanded={menu === 'layers'} onClick={() => setMenu(menu === 'layers' ? null : 'layers')}>
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
  const msP = {
    model, lang, scene, bom, notify, currentUser, saveState, unit: output.unit, downloadFile: download,
    commit: (m, key) => commit(setX(designRef.current, { paint: m.paint || {}, mats: m.mats || {}, matMap: m.matMap || {} }), key),
    partMapLabel: ['Part map (front view)', 'خريطة الأجزاء (أمامي)'], hideGroups: [], slotRows: SLOT_ROWS,
  };
  const panelP = {
    design, commit, lang, built, onTemplate, look: lk, onLook: setLook, onSun: setSun, daylight, onDaylight: toggleDaylight, grid, onGrid: setGrid, warnings, onPickPart: (id) => { if (id) { pickPart(id); setTab('parts'); } }, msP, onAddHw,
  };
  const panelBody = () => {
    switch (tab) {
      case 'global': return <><GlobalPanel P={panelP} /><OutputSettings lang={lang} variant="card" testid="global-output" /></>;
      case 'ms': return <MsPanel P={panelP} />;
      case 'hardware': return <HardwarePanel P={panelP} />;
      default: return <CustomParts built={built} sel={sel} onSel={setSel} commit={commit} lang={lang} notify={notify} partWarn={partWarn} />;
    }
  };

  /* ---------- render ---------- */
  const tplName = TEMPLATE[design.tpl] ? TEMPLATE[design.tpl] : null;
  const partsN = design.parts.filter((p) => p.type !== 'group').length;
  const selScene = selForScene(scene, sel);
  return (
    <div className={`nk nk-cu${ar ? ' nk-rtl' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={lang} onKeyDown={onKeyDown} data-testid="neo-custom" data-view={view} data-panel-open={panelOpen ? '1' : '0'} data-panel-mode={drawer ? 'drawer' : 'dock'} data-asst={asstOpen ? (asstDocked ? 'dock' : 'float') : 'off'}>
      <header className="nk-head">
        <div className="nk-brand">
          <span className="nk-logo" aria-hidden="true">N</span>
          <div className="nk-title-wrap">
            <div className="nk-appname">{L('Neo Custom Designer', 'مصمم أثاث نيو')}</div>
            <div className="nk-subtitle">{L('THE CLOSETS · NEO STUDIO', 'الخزائن · استوديو نيو')}</div>
          </div>
          <input className="nk-title" aria-label={L('Project title', 'عنوان المشروع')} value={design.title} maxLength={80} onChange={(e) => commit({ ...designRef.current, title: e.target.value }, 'title')} data-testid="project-title" />
        </div>
        <div className="nk-right">
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Undo (Ctrl+Z)', 'تراجع (Ctrl+Z)')} aria-label={L('Undo', 'تراجع')} disabled={!canUndo} onClick={undo} data-testid="undo"><Ic n="undo" /></button>
          <button type="button" className="nk-hb nk-hb-ic" data-tip={L('Redo (Ctrl+Y)', 'إعادة (Ctrl+Y)')} aria-label={L('Redo', 'إعادة')} disabled={!canRedo} onClick={redo} data-testid="redo"><Ic n="redo" /></button>
          <span className="nk-saved-chip nkc-save nkc-hd" role="status" data-testid="autosave" data-saved={autosaveAt ? '1' : '0'}><i className="nk-saved-dot" aria-hidden="true" /><span className="nk-saved-t">{autosaveAt ? L(`Saved ${autosaveAt}`, `حُفظ ${autosaveAt}`) : L('Autosave on', 'الحفظ التلقائي مفعّل')}</span></span>
          {price && <span className="nk-saved-chip nkc-price nkc-hd" role="status" data-testid="cu-price" title={priceTitle}>{price}</span>}
          <QuoteLauncher className="nkc-quote nkc-hd" lang={lang} user={currentUser} toast={toast} disabled={!valOk} getContext={() => customCtx({ built, onAdvanced: onSendToQuote ? () => onSendToQuote(built) : null, apply: (d) => commit(d, 'quote:describe') })} />
          <FileMenu lang={lang} layout="straight" dirty={dirty} open={menu === 'file'} wrapRef={menuRef}
            onToggle={() => setMenu(menu === 'file' ? null : 'file')} onClose={() => setMenu(null)} onResetCamera={() => setCam('reset')}
            onSave={() => { doExport('json'); notifyExplicitSave('neo-custom'); }} onLoadFile={importFile}
            onNewEmpty={() => loadDesign(blankDesign(designRef.current.dims), L('New blank piece. Undo brings the previous one back.', 'قطعة فارغة جديدة. التراجع يعيد السابقة.'))}
            onDefault={() => loadDesign(defaultDesign(), L('Default piece (table) loaded. Undo brings the previous one back.', 'تم تحميل القطعة الافتراضية (طاولة). التراجع يعيد السابقة.'))}
            nouns={{ layout: [`${tplName ? tplName.en : 'Custom'} · ${partsN} parts`, `${tplName ? tplName.ar : 'مخصص'} · ${partsN} جزء`], empty: ['New — blank piece', 'جديد — قطعة فارغة'], def: ['Default piece (table)', 'القطعة الافتراضية (طاولة)'], discard: ['Discard the current piece?', 'تجاهل القطعة الحالية؟'] }} />
          <ExportMenu user={currentUser && (currentUser.id || currentUser.email) ? String(currentUser.id || currentUser.email) : ''} lang={lang} unit={output.unit} model={model} scene={scene} bom={bom} hardware={hardware} warnings={warnings} ui={ui} onLegacy={doExport} log={exportsLog} onLog={logExport} notify={notify} product="custom"
            drawing={(l) => <CustomDrawing built={built} mode="all" ui={{ dims: true, callouts: true, internal: false, center: false, isolate: null }} sel={null} onSelect={() => {}} onDesign={() => {}} lang={l} interactive={false} fixedSize={{ w: 1040, h: 700 }} />} />
          {onSendToQuote && <button type="button" className="nk-btn nkc-quote nkc-hd" disabled={!valOk} onClick={() => onSendToQuote(built)} data-testid="cu-quote" title={valOk ? L('Placeholder rates until the owner supplies the price list', 'أسعار مؤقتة حتى يزوّد المالك قائمة الأسعار') : L('Add a part first', 'أضف جزءًا أولًا')}>{L('Quote Max', 'Quote Max')}</button>}
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
                <div className="nkc-actions" role="group" aria-label={L('Piece actions', 'إجراءات القطعة')}>
                  {price && <span className="nk-saved-chip nkc-price">{price}</span>}
                  <QuoteLauncher testid="nq-open-m" lang={lang} user={currentUser} toast={toast} disabled={!valOk} getContext={() => customCtx({ built, onAdvanced: onSendToQuote ? () => onSendToQuote(built) : null, apply: (d) => commit(d, 'quote:describe') })} />
                  {onSendToQuote && <button type="button" className="nk-btn" disabled={!valOk} onClick={() => onSendToQuote(built)} data-testid="cu-quote-m">{L('Open in Quote Max (advanced)', 'فتح في Quote Max (متقدم)')}</button>}
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
                  selUnitId={sel ? sel.unitId : null} selLabel={info ? info.name : ''} onClose={() => setOpenBar(false)} />
              )}
              {view === 'design' && (
                <>
                  <div className="nk-modebar" role="group" aria-label={L('Drawing controls', 'عناصر تحكم الرسم')} data-testid="draw-bar">
                    <Seg className="nk-seg-run" label={L('Drawing view', 'منظر الرسم')} value={drawMode} onChange={setDrawMode}
                      options={[['all', L('ALL', 'الكل')], ['front', L('FRONT', 'أمامي')], ['side', L('SIDE', 'جانبي')], ['top', L('TOP', 'علوي')]]} />
                    <span className="nk-mb-sep" aria-hidden="true" />
                    <label className="nk-chk"><input type="checkbox" checked={dimsOn} onChange={(e) => setDims(e.target.checked)} data-testid="chk-dims" /> {L('Dimensions', 'الأبعاد')}</label>
                    <label className="nk-chk"><input type="checkbox" checked={callouts} onChange={(e) => setCallouts(e.target.checked)} data-testid="chk-callouts" /> {L('Callouts', 'الأرقام')}</label>
                    <label className="nk-chk nk-chk-hdl" title={L('Drag the blue handles on the drawing to change sizes; arrow keys nudge a focused handle', 'اسحب المقابض الزرقاء على الرسم لتغيير المقاسات؛ مفاتيح الأسهم تحرّك المقبض المحدد')}><input type="checkbox" data-testid="handles-toggle" checked={handlesOn} onChange={(e) => setHandlesOn(e.target.checked)} /> {L('Handles', 'المقابض')}</label>
                    <label className="nk-chk"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} data-testid="chk-internal" /> {L('Internal', 'داخلي')}</label>
                    <label className="nk-chk"><input type="checkbox" checked={center} onChange={(e) => setCenter(e.target.checked)} /> {L('Centre lines', 'خطوط المنتصف')}</label>
                    <label className="nk-chk" title={L('Snap a dragged part to other parts\' edges and centres, and to a 5 mm grid', 'التقاط الجزء المسحوب بحواف ومنتصفات الأجزاء الأخرى وبشبكة 5 مم')}><input type="checkbox" checked={snapOn} onChange={(e) => { setSnap(e.target.checked); commit(setX(designRef.current, { snap: e.target.checked }), 'snap'); }} data-testid="chk-snap" /> {L('Snap', 'التقاط')}</label>
                  </div>
                  <div className="nkc-legend nk-legend" role="group" aria-label={L('Part types (click to isolate)', 'أنواع القطع (انقر للعزل)')}>
                    {legend.map(([k, en, a]) => (
                      <button key={k} type="button" className="nk-lg" aria-pressed={isolate === k} onClick={() => setIsolate(isolate === k ? null : k)} data-legend={k}>
                        <span className={`nk-sw nk-pt nk-pt-${k}`} />{ar ? a : en}
                      </button>
                    ))}
                  </div>
                  <div className="nk-draw" data-testid="drawing-wrap">
                    <CustomDrawing built={built} mode={drawMode} ui={dui} sel={sel} onSelect={setSel} onDesign={commit} onHandle={onHandle} lang={lang} snapOn={snapOn} />
                  </div>
                </>
              )}
              {view === '3d' && (
                <>
                  {explode.on && (
                    <div className="nk-exbar" role="group" aria-label={L('Explode', 'تفكيك')}>
                      <b>{L('Explode', 'تفكيك')}</b>
                      <Seg label={L('Explode mode', 'نمط التفكيك')} value={explode.mode} onChange={(v) => setExplode({ ...explode, mode: v })} options={[['assembly', L('Radial', 'شعاعي')], ['fronts', L('Fronts', 'واجهات')]]} />
                      <input type="range" className="nk-range" min={0} max={100} value={Math.round(explode.amt * 100)} aria-label={L('Explode amount', 'مقدار التفكيك')} onChange={(e) => setExplode({ ...explode, amt: +e.target.value / 100 })} data-testid="explode-slider" />
                      <span className="nk-mono" dir="ltr">{Math.round(explode.amt * 100)}%</span>
                      <button type="button" className="nk-btn" onClick={() => setCam('fit')}><Ic n="fit" size={16} /> {L('Fit', 'ملاءمة')}</button>
                    </div>
                  )}
                  <div className="nk-3dwrap">
                    <Kitchen3D scene={scene} ui={ui} model={model} lang={lang} onSelect={onPick3D} camCmd={camCmd} sel={selScene} unit={output.unit} onToggleFront={onToggleFront} poseRef={poseRef} label={['3D view of the custom piece. Arrow keys orbit, + and - zoom, 0 refits.', 'عرض ثلاثي الأبعاد للقطعة. الأسهم للدوران، + و - للتكبير، 0 للإعادة.']} />
                  </div>
                  <div className="nk-hint" data-hint3d="1">{hold
                    ? L('Camera held (L to release) · click to select · double-click a door or drawer to open it', 'الكاميرا مثبتة (L للإلغاء) · انقر للتحديد · نقرتان على باب أو درج لفتحه')
                    : L('Drag to orbit · right/Shift-drag or two fingers to pan · scroll to zoom to the cursor · arrows/WASD nudge · double-click a part to focus, a door to open · L holds', 'اسحب للدوران · زر أيمن/Shift أو إصبعان للتحريك · العجلة للتكبير نحو المؤشر · الأسهم/WASD للإزاحة · نقرتان على قطعة للتركيز وعلى باب لفتحه · L للتثبيت')}</div>
                </>
              )}
              {view === 'cut' && (
                <div className="nk-cutwrap" data-testid="cutlist">
                  <CutListView bom={bom} hardware={hardware} warnings={warnings} est={est} prices={{ labourPct: est.rates.labourPct, vatPct: est.rates.vatPct, currency: est.rates.currency }} lang={lang} unit={output.unit} onExport={doExport} model={model} product="custom" scene={scene} notify={notify} user={currentUser && (currentUser.id || currentUser.email) ? String(currentUser.id || currentUser.email) : ''}
                    priceNote={['PLACEHOLDER prices: the owner has not supplied a price list for custom furniture. Edit them in the Global tab (saved in the design file).', 'أسعار مؤقتة: لم يزوّد المالك قائمة أسعار للأثاث المخصص. عدّلها من تبويب عام (تُحفظ في ملف التصميم).']} />
                  <CustomNesting bom={bom} lang={lang} />
                </div>
              )}

              {info && view !== 'cut' && (
                <div className="nk-foot"><div className="nk-selcard" role="region" aria-label={L('Selected part', 'القطعة المحددة')} data-testid="sel-card">
                  <span className={`nk-sw nk-pt nk-pt-${info.ptype}`} />
                  <div className="nk-sel-t">
                    <b dir="auto">{info.no ? `${info.no} · ` : ''}{info.name}</b>
                    <small dir="ltr" data-testid="sel-meta">{selDims(info.dims)}{info.count > 1 ? ` × ${info.count}` : ''}{info.mat ? ` · ${(CLASS_LBL[info.mat] || [info.mat, info.mat])[ar ? 1 : 0]}` : ''}{info.area ? ` · ${info.area.toFixed(2)} m²` : ''}</small>
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
          <CustomAssistant design={design} lang={lang} selectedId={sel ? sel.unitId : null} seed={asstSeed} docked={asstDocked} onLang={setLang} selectedLabel={info ? info.name : ''}
            rect={floatRect} bounds={{ w: body.w, h: body.h }} rtl={ar} onRect={setAsstRect} onRectCommit={(r) => { setAsstRect(r); saveWsPrefs({ asstRect: r }); }}
            canDock={dock} onToggleMode={() => { const m = asstDocked ? 'float' : 'dock'; setAsstMode(m); saveWsPrefs({ asstMode: m }); }} onCollapse={() => setAsstOpen(false)}
            onApply={(d, selectId) => { commit(d, `ai:${Date.now()}`); if (selectId !== undefined) setSel(selectId ? { unitId: selectId } : null); }} onUi={uiCmd} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} onClose={() => setAsstOpen(false)} />
        )}
      </div>

      {!asstOpen && (
        <button type="button" className="nk-fab" onClick={() => setAsstOpen(true)} data-testid="assistant-fab" aria-label={ar ? 'مساعد بونساي' : 'Bonsai Assistant'}>
          <Ic n="assistant" size={20} /><span className="nk-fab-t">{ar ? 'مساعد بونساي' : 'Bonsai Assistant'}</span>
        </button>
      )}

      <ConfirmDialog open={!!askTpl} lang={lang} title={L('Replace the current piece with this template?', 'استبدال القطعة الحالية بهذا القالب؟')} message={L('You have unsaved changes. You can still use Undo afterwards.', 'لديك تغييرات غير محفوظة. يمكنك التراجع بعد ذلك.')} confirmLabel={L('Replace', 'استبدال')} cancelLabel={L('Cancel', 'إلغاء')}
        onConfirm={() => { const a = askTpl; setAskTpl(null); if (a) a.apply(); }} onCancel={() => setAskTpl(null)} testid="confirm-tpl" />

      {printing && typeof document !== 'undefined' && createPortal(
        <div className="nk-print-root" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
          <div className="nk-print-sheet">
            <h1>{design.title}</h1>
            <p>Neo Custom Designer · {new Date().toLocaleDateString()} · {design.dims.w} × {design.dims.h} × {design.dims.d} mm</p>
            <figure className="nk-print-fig">
              <CustomDrawing built={built} mode="all" ui={{ dims: true, callouts: true, internal: false, center: false, isolate: null }} sel={null} onSelect={() => {}} onDesign={() => {}} lang={lang} interactive={false} fixedSize={{ w: 1040, h: 700 }} />
            </figure>
          </div>
          <div className="nk-print-sheet nk-print-bom">
            <CutListView bom={bom} hardware={hardware} warnings={warnings} est={null} prices={null} lang={lang} unit={output.unit} onExport={() => {}} model={model} compact product="custom" />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
