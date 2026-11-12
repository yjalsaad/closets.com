// Route chunk "KitchenPlannerWizard" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: KitchenPlannerWizard.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { fitModules } from '../moduleFit';
import { useState, useRef } from 'react';
import { validateForm } from '../forms/validate';
import { ModalPanel } from '../a11y/dialog';
import FormNotice from '../privacy/FormNotice';
import { api, fmt, toast, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { RoomDesigner, Wardrobe3D } from './shared_PlannerPage_TVUnitPlannerWizard_plus4';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';
import { trStep } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus3';
import { layoutImgSize } from '../layoutDims';

/* ════════════════════════════════════════════════════════════════════════
   KITCHEN SECTION — rich data model (real DB prices where present, sensible
   defaults otherwise). All prices in BHD. Drivers are transparent:
   cabinets are priced per linear metre of run; worktops per metre; appliances
   per unit; storage per unit. Confirmed exactly on the free design visit.
   ──────────────────────────────────────────────────────────────────────── */

// Catalogue anchors pulled from website_products (category ~ 'kitchen'):
//   wp-kit-01 Bespoke Modern Kitchen  BD 4200   ·  wp-kit-02 Shaker Country  BD 4800
//   wp-107   Modular L-Shaped         BD 2200   ·  wp-108 Pantry Cabinet     BD 410
const KITCHEN_CATALOG_ANCHORS = {
  modern:  { id:'wp-kit-01', name:'Bespoke Modern Kitchen', from:4200 },
  shaker:  { id:'wp-kit-02', name:'Shaker Country Kitchen', from:4800 },
  modular: { id:'wp-107',    name:'Modular Kitchen — L-Shaped', from:2200 },
  pantry:  { id:'wp-108',    name:'Kitchen Pantry Cabinet', from:410 },
};

// Canonical appliance metadata, keyed by the SAME `type` strings KitchenScene3D
// places in the 3D run. Keeps the BOM / install list and the 3D in sync, and
// supplies the indicative "Connect / Plumb / Vent" verb for the install list.
const APPLIANCE_META = {
  oven:       { label:'Built-in oven',     install:'Connect oven (electrical)' },
  hob:        { label:'Hob',               install:'Connect hob' },
  hood:       { label:'Extractor hood',    install:'Vent hood' },
  fridge:     { label:'Fridge-freezer',    install:'Position & level fridge-freezer' },
  sink:       { label:'Sink & tap',        install:'Plumb sink & connect mixer tap' },
  dishwasher: { label:'Dishwasher',        install:'Plumb & connect dishwasher' },
};

// Sensible standard set — MUST match KitchenScene3D's DEFAULT_APPLIANCES so the
// BOM/install list and the 3D scene agree when no planner selection is supplied.
const DEFAULT_KITCHEN_APPLIANCES = ['oven', 'hob', 'hood', 'fridge', 'sink', 'dishwasher'];

// Normalise an appliances value (array of strings or {type}) into known types.
function normalizeApplianceTypes(list) {
  const src = Array.isArray(list) && list.length ? list : DEFAULT_KITCHEN_APPLIANCES;
  const out = [];
  const seen = {};
  src.forEach((a) => {
    const raw = typeof a === 'string' ? a : (a && a.type);
    if (typeof raw !== 'string') return;
    const t = raw.trim().toLowerCase();
    if (APPLIANCE_META[t] && !seen[t]) { seen[t] = true; out.push(t); }
  });
  return out;
}

/* ════════════════════════════════════════════════════════════════════════════
   PROFESSIONAL KITCHEN PLANNER WIZARD  ·  fit-to-viewport two-pane app shell
   Wired to route 'kitchen-planner'. Reuses Wardrobe3D product="kitchen".
   ════════════════════════════════════════════════════════════════════════════ */

// ── Pro wizard data tables (BHD).  Real catalogue lives in website_products /
//    design_materials; these are the planner's transparent default price tables. ──
const KW_ROOM_SHAPES = [
  { id:'rectangle', name:'Rectangle',  sub:'Standard four-wall room',     ic:'M3 6h18v12H3z' },
  { id:'square',    name:'Square',     sub:'Equal length & width',        ic:'M5 5h14v14H5z' },
  { id:'lroom',     name:'L-shaped room', sub:'Room with a return wall',  ic:'M4 4h5v11h11v5H4z' },
  { id:'custom',    name:'Custom',     sub:'Irregular — set dimensions',  ic:'M4 6l6-2 4 3 6-2v13l-6 2-4-3-6 2z' },
];

const KW_OPENING_TYPES = ['Door','Window','Column','Beam','AC duct'];

const KW_LAYOUTS = [
  { id:'single',    name:'Single Wall', sub:'One run along a wall',        model:'single',   img:'/layouts/kitchen/single-wall.jpg' },
  { id:'galley',    name:'Galley',      sub:'Two runs facing each other',  model:'parallel', img:'/layouts/kitchen/galley.jpg' },
  { id:'l-shape',   name:'L-Shape',     sub:'Two runs meeting in a corner',model:'l-shape',  img:'/layouts/kitchen/l-shape.jpg' },
  { id:'u-shape',   name:'U-Shape',     sub:'Three runs around three walls',model:'u-shape', img:'/layouts/kitchen/u-shape.jpg' },
  { id:'island',    name:'Island',      sub:'A run plus a central island', model:'island',   img:'/layouts/kitchen/island.jpg' },
  { id:'peninsula', name:'Peninsula',   sub:'A connected return / breakfast bar', model:'l-shape', img:'/layouts/kitchen/peninsula.jpg' },
];

// Cabinets — id, label, width(mm), base price BHD, kind
const KW_BASE_UNITS = [
  { id:'b150po', label:'150 pull-out', w:150, price:95 },
  { id:'b300',  label:'300 base',   w:300, price:70 },
  { id:'b400',  label:'400 base',   w:400, price:80 },
  { id:'b450',  label:'450 base',   w:450, price:85 },
  { id:'b500',  label:'500 base',   w:500, price:92 },
  { id:'b600',  label:'600 base',   w:600, price:100 },
  { id:'b800',  label:'800 base',   w:800, price:130 },
  { id:'b900',  label:'900 base',   w:900, price:145 },
  { id:'bcorn', label:'Corner unit',w:900, price:165 },
];

const KW_WALL_UNITS = [
  { id:'w300', label:'300 wall', w:300, price:48 },
  { id:'w400', label:'400 wall', w:400, price:55 },
  { id:'w450', label:'450 wall', w:450, price:58 },
  { id:'w600', label:'600 wall', w:600, price:68 },
  { id:'w800', label:'800 wall', w:800, price:88 },
  { id:'w900', label:'900 wall', w:900, price:98 },
  { id:'wlift',label:'Lift-up wall', w:600, price:120 },
];

const KW_TALL_UNITS = [
  { id:'tpantry', label:'Pantry',         w:600, price:280 },
  { id:'toven',   label:'Oven tower',     w:600, price:320 },
  { id:'tfridge', label:'Fridge housing', w:600, price:300 },
  { id:'tutil',   label:'Utility tower',  w:600, price:260 },
];

const KW_CARCASS = [
  { id:'mdf',  name:'MDF',     mult:1.00, sub:'Moisture-resistant board' },
  { id:'ply',  name:'Plywood', mult:1.18, sub:'Premium, screw-holding' },
  { id:'mfc',  name:'MFC',     mult:0.92, sub:'Melamine-faced chipboard' },
];

const KW_DOORS = [
  { id:'laminate', name:'Laminate',   mult:1.00, hex:'#e9e5dd' },
  { id:'acrylic',  name:'Acrylic',    mult:1.22, hex:'#27384f' },
  { id:'pet',      name:'PET',        mult:1.12, hex:'#8f9d7e' },
  { id:'veneer',   name:'Veneer',     mult:1.30, hex:'#5a3a20' },
  { id:'lacquer',  name:'Lacquer',    mult:1.28, hex:'#f5f3ee' },
  { id:'solid',    name:'Solid wood', mult:1.45, hex:'#c89b5e' },
];

const KW_COUNTERTOPS = [
  { id:'quartz',    name:'Quartz',    perM:320 },
  { id:'granite',   name:'Granite',   perM:280 },
  { id:'porcelain', name:'Porcelain', perM:300 },
  { id:'marble',    name:'Marble',    perM:360 },
  { id:'compact',   name:'Compact surface', perM:340 },
];

const KW_ACCESSORIES = [
  { id:'handles',  name:'Handles',       price:60,  unit:'set' },
  { id:'gola',     name:'Gola profile',  price:140, unit:'run' },
  { id:'lighting', name:'LED lighting',  price:120, unit:'kit' },
  { id:'cutlery',  name:'Cutlery trays', price:55,  unit:'set' },
  { id:'waste',    name:'Waste bins',    price:130, unit:'unit' },
  { id:'pullouts', name:'Pull-outs',     price:90,  unit:'unit' },
];

// distance helper for the work triangle (points in mm), returns metres
const kwDist = (a, b) => Math.sqrt(Math.pow((a.x-b.x),2)+Math.pow((a.y-b.y),2)) / 1000;

const kwLegOK = (m) => m >= 1.2 && m <= 2.7;

/* ──────────────────────────────────────────────────────────────────
   buildProductionDocs(cfg) — derive factory-ready documents from a
   saved/live kitchen planner configuration. Pure & defensive: it reads
   whatever fields exist on cfg and omits columns it cannot determine.
   cfg shape (all optional):
     modules: [{ name, qty, w (width mm), kind, line }]
     worktop: { material, metres, perM, line }
     accessories: [{ name, qty, unit, line }]
     materials: { carcass, door, finish }
     dims: { length, width, ceiling }   layoutName, grandTotal
   Standard cabinet geometry (indicative, mm): base H720 D600, wall H720
   D350, tall H2100 D600. Edge-banding & panel counts are indicative.
   ─────────────────────────────────────────────────────────────────── */
function buildProductionDocs(cfg) {
  cfg = cfg || {};
  // ── MODULE SNAPPING (shared with the 3D via fitModules) ──
  // When run lengths (mm) are supplied, derive the cabinet module list from the
  // SAME fitModules() the 3D scene uses, so the BOM "cabinet units" count equals
  // the number of discrete cabinets drawn in KitchenScene3D (they can't drift).
  const runs = Array.isArray(cfg.runs)
    ? cfg.runs.map(r => Number(r)).filter(r => Number.isFinite(r) && r > 0)
    : [];
  let modules = Array.isArray(cfg.modules) ? cfg.modules : [];
  if (runs.length) {
    const carcassMatName = (cfg.materials && cfg.materials.carcass) || null;
    const fitted = [];
    runs.forEach((runMm, ri) => {
      fitModules(runMm).forEach((m, mi) => {
        const w = Number(m.width) || 0;
        if (w <= 0) return;
        fitted.push({
          name: m.filler
            ? `Filler panel ${w}mm`
            : `Base unit ${w}mm`,
          qty: 1,
          w,
          kind: 'base',
          line: null,
          run: ri + 1,
          seq: mi + 1,
          carcass: carcassMatName,
        });
      });
    });
    if (fitted.length) modules = fitted;
  }
  const accessories = Array.isArray(cfg.accessories) ? cfg.accessories : [];
  const worktop = cfg.worktop || null;
  const mats = cfg.materials || {};
  const carcassMat = mats.carcass || null;
  const doorMat = mats.door || null;
  const finish = mats.finish || mats.door || null;
  const r1 = n => Math.round((Number(n) || 0) * 10) / 10;

  // standard geometry by kind (indicative mm)
  const geom = (kind) => kind === 'wall' ? { h: 720, d: 350 }
    : kind === 'tall' ? { h: 2100, d: 600 }
    : { h: 720, d: 600 }; // base / default

  // ── 1) BILL OF MATERIALS ──
  const bomItems = [];
  modules.forEach(m => {
    const g = geom(m.kind);
    const w = Number(m.w) || null;
    bomItems.push({
      type: 'Cabinet',
      name: m.name || 'Module',
      qty: Number(m.qty) || 1,
      width_mm: w,
      height_mm: g.h,
      depth_mm: g.d,
      material: [carcassMat && carcassMat + ' carcass', doorMat && doorMat + ' front'].filter(Boolean).join(' · ') || null,
      finish: finish,
      line_bhd: Number(m.line) || null,
    });
  });
  if (worktop && (worktop.metres || worktop.line)) {
    const metres = Number(worktop.metres) || 0;
    const depthM = 0.6; // standard worktop depth 600mm
    bomItems.push({
      type: 'Worktop',
      name: (worktop.material || 'Worktop') + ' worktop',
      qty: 1,
      linear_m: metres ? r1(metres) : null,
      area_m2: metres ? r1(metres * depthM) : null,
      material: worktop.material || null,
      finish: 'Polished',
      line_bhd: Number(worktop.line) || null,
    });
    // splashback panel (indicative): same run length, 600mm high
    if (metres) {
      bomItems.push({
        type: 'Splashback',
        name: (worktop.material || 'Matching') + ' splashback (indicative)',
        qty: 1,
        linear_m: r1(metres),
        area_m2: r1(metres * 0.6),
        material: worktop.material || null,
        finish: null,
        line_bhd: null,
      });
    }
  }
  accessories.forEach(a => {
    bomItems.push({
      type: 'Accessory',
      name: a.name || 'Accessory',
      qty: Number(a.qty) || 1,
      unit: a.unit || null,
      material: null,
      finish: null,
      line_bhd: Number(a.line) || null,
    });
  });
  // ── Appliances ──
  // Use the planner-supplied appliance set when present; otherwise fall back to
  // the SAME default set KitchenScene3D draws, so the BOM and the 3D agree.
  const applianceTypes = normalizeApplianceTypes(cfg.appliances);
  applianceTypes.forEach(t => {
    const meta = APPLIANCE_META[t];
    bomItems.push({
      type: 'Appliance',
      name: meta.label,
      qty: 1,
      material: null,
      finish: null,
      supply: 'Client-supplied or to-quote',
      line_bhd: null,
    });
  });
  const bomTotals = {
    cabinet_lines: modules.length,
    cabinet_units: modules.reduce((s, m) => s + (Number(m.qty) || 0), 0),
    accessory_lines: accessories.length,
    appliance_lines: applianceTypes.length,
    worktop_metres: worktop && worktop.metres ? r1(worktop.metres) : 0,
    estimate_bhd: Number(cfg.grandTotal) || null,
  };

  // ── 2) MANUFACTURING LIST (factory) ──
  // panel breakdown per cabinet (indicative):
  //  carcass = 2 sides + bottom + top/rail(2) + back = ~5 panels
  //  doors/fronts ≈ 1 per ≤600mm of width, min 1
  const fronts = (w) => Math.max(1, Math.ceil(((Number(w) || 600)) / 600));
  let carcassPanels = 0, doorPanels = 0, drawerFronts = 0, edgeM = 0;
  const mfgModules = modules.map(m => {
    const qty = Number(m.qty) || 1;
    const w = Number(m.w) || 600;
    const g = geom(m.kind);
    const cPanels = 5 * qty;                    // indicative carcass panels
    const nFronts = fronts(w) * qty;
    const isDrawerish = /drawer|pull-out|pull out|150/i.test(m.name || '');
    const dFronts = isDrawerish ? nFronts : 0;
    const dPanels = isDrawerish ? 0 : nFronts;
    carcassPanels += cPanels;
    doorPanels += dPanels;
    drawerFronts += dFronts;
    // edge-banding: perimeter of each front ≈ 2*(w + h) per front, mm→m
    const perFront = 2 * ((w) + g.h) / 1000;
    edgeM += perFront * nFronts;
    return {
      name: m.name || 'Module',
      qty,
      width_mm: w,
      carcass_panels: cPanels,
      door_fronts: dPanels,
      drawer_fronts: dFronts,
    };
  });
  // hinges/runners from module count & accessories
  const hingeCount = doorPanels * 2;            // 2 hinges per door (indicative)
  const accRunners = accessories.reduce((s, a) => {
    if (/pull-?out|drawer|cutlery|waste/i.test(a.name || '')) return s + (Number(a.qty) || 0);
    return s;
  }, 0);
  const runnerCount = drawerFronts + accRunners; // 1 runner pair per drawer/pull-out
  const manufacturing = {
    indicative: true,
    carcass_material: carcassMat,
    front_material: doorMat,
    finish: finish,
    modules: mfgModules,
    edge_banding_m: r1(edgeM),
    hinges_count: hingeCount,
    runners_count: runnerCount,
    cut_summary: {
      total_panels: carcassPanels + doorPanels + drawerFronts,
      carcass_panels: carcassPanels,
      door_panels: doorPanels,
      drawer_fronts: drawerFronts,
    },
  };

  // ── 3) INSTALLATION LIST ──
  const unitCount = modules.reduce((s, m) => s + (Number(m.qty) || 0), 0);
  // Appliances to connect: the explicit appliance set (with an indicative verb,
  // e.g. "Connect oven", "Plumb sink", "Vent hood"), plus any appliance HOUSING
  // modules detected by name that aren't already covered — de-duped by label.
  const appliances = [];
  const apSeen = {};
  applianceTypes.forEach(t => {
    const meta = APPLIANCE_META[t];
    apSeen[meta.label.toLowerCase()] = true;
    appliances.push({ name: meta.install, qty: 1 });
  });
  modules.forEach(m => {
    if (!/oven|fridge|hob|dishwash|micro|sink|tower|housing/i.test(m.name || '')) return;
    const key = String(m.name || '').toLowerCase();
    if (apSeen[key]) return;
    apSeen[key] = true;
    appliances.push({ name: m.name, qty: Number(m.qty) || 1 });
  });
  const worktopM = worktop && worktop.metres ? r1(worktop.metres) : 0;
  // time estimate (indicative): base 4h + 0.6h/unit + 1h/worktop-metre + 0.4h/appliance
  const hours = r1(4 + unitCount * 0.6 + worktopM * 1 + appliances.length * 0.4);
  const installation = {
    indicative: true,
    units_to_install: unitCount,
    worktop_fitting_m: worktopM,
    appliances_to_connect: appliances,
    handles_accessories_fit: accessories.map(a => ({ name: a.name, qty: Number(a.qty) || 1 })),
    estimated_hours: hours,
    estimated_days: r1(hours / 8),
  };

  return { bom: { items: bomItems, totals: bomTotals }, manufacturing, installation };
}

function KitchenPlannerWizard({ setPage, user, openAuth }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const { map: dbLayouts } = useLayouts('kitchen');
  // DISPLAY-ONLY merge: model maps / params stay on KW_LAYOUTS.
  const kwLayoutsView = KW_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const [step, setStep] = useState(0);
  // Step 1
  const [shape, setShape] = useState('rectangle');
  // Step 2
  const [dims, setDims] = useState({ length:4000, width:3000, ceiling:2700 });
  // Step 3
  const [openings, setOpenings] = useState([{ id:uid(), type:'Door', pos:500, width:900 }]);
  // Step 4
  const [layout, setLayout] = useState('l-shape');
  const [lp, setLp] = useState({
    wallLen:4000, wallA:3600, wallB:2800, corner:'L-return', galleyGap:1400,
    uA:3200, uB:2600, uC:3200, entrance:1000,
    islandW:2400, islandD:1000, seats:3, islandFn:'Multi-purpose',
    penW:1800, penD:600, clearance:1000,
  });
  // Step 5 — work triangle points (mm, room-space)
  const [tri, setTri] = useState({
    fridge:{ x:600,  y:600 },
    sink:{   x:2000, y:600 },
    hob:{    x:3200, y:600 },
  });
  const [drag, setDrag] = useState(null);
  // Step 6 — cabinet modules: {key, id, kind, qty}
  const [modules, setModules] = useState([
    { key:uid(), id:'b600', kind:'base', qty:3 },
    { key:uid(), id:'w600', kind:'wall', qty:2 },
    { key:uid(), id:'tpantry', kind:'tall', qty:1 },
  ]);
  // Step 7
  const [mats, setMats] = useState({ carcass:'mdf', door:'laminate', counter:'quartz' });
  // Step 8 — accessory qty map
  const [acc, setAcc] = useState({ handles:1, lighting:1 });
  // preview
  const [view3d, setView3d] = useState(false);
  const [studioRoomDesignerOpen, setStudioRoomDesignerOpen] = useState(false);
  const [showPrev, setShowPrev] = useState(!mobile);
  const [busy, setBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const lay = KW_LAYOUTS.find(l=>l.id===layout) || KW_LAYOUTS[0];
  const carc = KW_CARCASS.find(c=>c.id===mats.carcass) || KW_CARCASS[0];
  const door = KW_DOORS.find(d=>d.id===mats.door) || KW_DOORS[0];
  const ctop = KW_COUNTERTOPS.find(c=>c.id===mats.counter) || KW_COUNTERTOPS[0];
  const allUnits = [...KW_BASE_UNITS, ...KW_WALL_UNITS, ...KW_TALL_UNITS];
  const findU = (id) => allUnits.find(u=>u.id===id);

  // ── Work-triangle legs ──
  const legFS = kwDist(tri.fridge, tri.sink);
  const legSH = kwDist(tri.sink, tri.hob);
  const legHF = kwDist(tri.hob, tri.fridge);
  const triTotal = legFS + legSH + legHF;
  const triOK = kwLegOK(legFS) && kwLegOK(legSH) && kwLegOK(legHF);

  // ── BOM + cost ──
  const matMult = carc.mult * door.mult;
  const bom = modules.filter(m=>m.qty>0).map(m=>{
    const u = findU(m.id); if (!u) return null;
    const unitPrice = Math.round(u.price * (m.kind==='tall' ? carc.mult : matMult));
    return { key:m.key, name:u.label+' '+(m.kind), qty:m.qty, w:u.w, kind:m.kind, line: unitPrice*m.qty, unitPrice };
  }).filter(Boolean);
  const cabinetTotal = bom.reduce((s,b)=>s+b.line,0);
  // countertop metres = total base-unit run width
  const baseRunMm = modules.filter(m=>m.kind==='base').reduce((s,m)=>{ const u=findU(m.id); return s + (u?u.w*m.qty:0); }, 0);
  const counterM = baseRunMm/1000;
  const counterTotal = Math.round(counterM * ctop.perM);
  const accItems = KW_ACCESSORIES.filter(a=>(acc[a.id]||0)>0).map(a=>({ ...a, qty:acc[a.id], line:a.price*acc[a.id] }));
  const accTotal = accItems.reduce((s,a)=>s+a.line,0);
  const grandTotal = cabinetTotal + counterTotal + accTotal;

  // ── Run lengths (mm) per layout — the SAME values KitchenScene3D feeds to
  //    fitModules() for its buildRun() wall runs. Islands/peninsulas are built
  //    as single bodies in the 3D (not split), so they are NOT included here so
  //    the BOM cabinet count matches the discrete cabinets drawn. ──
  const plannerRuns = (() => {
    switch (layout) {
      case 'single':
      case 'straight':   return [lp.wallLen];
      case 'l-shape':    return [lp.wallA, lp.wallB];
      case 'galley':     return [lp.wallLen, lp.wallLen];
      case 'u-shape':    return [lp.uA, lp.uB, lp.uC];
      case 'island':     return [lp.wallLen];
      case 'peninsula':  return [lp.wallLen];
      default:           return [lp.wallLen];
    }
  })().map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0);

  // ── Production documents (BOM / manufacturing / installation) ──
  // Pass `runs` so buildProductionDocs derives cabinet modules via fitModules
  // (the same fn the 3D uses) → BOM cabinet count == discrete 3D cabinet count.
  const prodCfg = {
    modules: bom.map(b=>({ name:b.name, qty:b.qty, w:b.w, kind:b.kind, line:b.line })),
    runs: plannerRuns,
    worktop: { material:ctop.name, metres:counterM, perM:ctop.perM, line:counterTotal },
    accessories: accItems.map(a=>({ name:a.name, qty:a.qty, unit:a.unit, line:a.line })),
    // Appliance set — this planner has no per-appliance selection UI, so use the
    // same default set KitchenScene3D draws (DEFAULT_KITCHEN_APPLIANCES) so the
    // BOM/install list and the 3D scene stay in agreement.
    appliances: DEFAULT_KITCHEN_APPLIANCES,
    materials: { carcass:carc.name, door:door.name, finish:door.name },
    dims, layoutName:lay.name, grandTotal,
  };
  const prodDocs = buildProductionDocs(prodCfg);
  const [specTab, setSpecTab] = useState('bom');

  // ── Capacity / collision check ──
  const availMm = (() => {
    if (layout==='single') return lp.wallLen;
    if (layout==='galley') return lp.wallLen*2 || dims.length*2;
    if (layout==='l-shape'||layout==='peninsula') return (lp.wallA||0)+(lp.wallB||0);
    if (layout==='u-shape') return (lp.uA||0)+(lp.uB||0)+(lp.uC||0);
    if (layout==='island') return lp.wallLen + (lp.islandW||0);
    return dims.length;
  })();
  const baseWallMm = modules.filter(m=>m.kind==='base'||m.kind==='tall').reduce((s,m)=>{ const u=findU(m.id); return s+(u?u.w*m.qty:0); },0);
  const overCapacity = baseWallMm > availMm;

  const view3dLayout = lay.model;

  // ── 2D top-down plan (SVG, room-space mm → px) ──
  // Fit-to-viewport but PROPORTIONAL: every run/worktop/island rectangle is derived
  // from the entered millimetres (dims.length × dims.width) and the layout params (lp),
  // and the whole geometry REBUILDS per `layout`. Mirrors the door-elevation scale pattern.
  const planView = (h) => {
    const L = Math.max(1000, Math.min(20000, dims.length||4000));   // room length (mm), clamped
    const W = Math.max(1000, Math.min(20000, dims.width||3000));    // room width  (mm), clamped
    const pad = 26, vw = 320, vh = 232;
    const sc = Math.min((vw-pad*2)/L, (vh-pad*2)/W);                 // mm → px, aspect-preserving
    const ox = pad + ((vw-pad*2)-L*sc)/2, oy = pad + ((vh-pad*2)-W*sc)/2;
    const X = (mm)=>ox+mm*sc, Y = (mm)=>oy+mm*sc;
    // cabinet runs (rectangles, 600mm cabinet depth). [x,y,w,h] in px.
    const depMm = 600;                                              // standard base-cabinet depth
    const dep = depMm*sc;
    const wtMm = 40;                                               // worktop lip drawn on the room-facing edge
    const wt = Math.max(2, wtMm*sc);
    const runs = [], worktops = [];
    // each run pushes its cabinet body + a thin worktop strip on the room-facing edge
    const addH = (x,y,wPx,facing) => { runs.push([x,y,wPx,dep]); worktops.push(facing==='down' ? [x,y+dep-wt,wPx,wt] : [x,y,wPx,wt]); };
    const addV = (x,y,hPx,facing) => { runs.push([x,y,dep,hPx]); worktops.push(facing==='right' ? [x+dep-wt,y,wt,hPx] : [x,y,wt,hPx]); };
    if (layout==='single'){
      addH(ox,oy,L*sc,'down');
    } else if (layout==='galley'){
      // two opposing runs; gap between them respects lp.galleyGap when it fits the room
      const gapMm = Math.max(900, Math.min(W-2*depMm, lp.galleyGap||1400));
      const runLenMm = Math.min(L, lp.wallLen||L);
      addH(ox,oy,runLenMm*sc,'down');                              // top run
      addH(ox,Y(depMm+gapMm),runLenMm*sc,'up');                    // bottom run, offset by depth+gap
    } else if (layout==='l-shape'){
      const aMm = Math.min(L, lp.wallA||L), bMm = Math.min(W, lp.wallB||W);
      addH(ox,oy,aMm*sc,'down');                                   // run A along the top
      addV(ox,oy,bMm*sc,'right');                                  // run B down the left
    } else if (layout==='peninsula'){
      const aMm = Math.min(L, lp.wallA||L), bMm = Math.min(W, lp.wallB||W);
      addH(ox,oy,aMm*sc,'down');                                   // wall run A
      addV(ox,oy,bMm*sc,'right');                                  // wall run B
      // free-standing peninsula projecting into the room from run B's end
      const penWMm = Math.max(600, lp.penW||1800), penDMm = Math.max(400, lp.penD||600);
      runs.push([ox+dep, Y(bMm), Math.min(penWMm,L-depMm)*sc, penDMm*sc]);
      worktops.push([ox+dep, Y(bMm), Math.min(penWMm,L-depMm)*sc, wt]);
    } else if (layout==='u-shape'){
      const aMm=Math.min(L,lp.uA||L), bMm=Math.min(W,lp.uB||W), cMm=Math.min(L,lp.uC||L);
      addH(ox,oy,aMm*sc,'down');                                   // back run
      addV(ox,oy,bMm*sc,'right');                                  // left run
      addV(ox+L*sc-dep,oy,cMm*sc,'left');                          // right run
    } else if (layout==='island'){
      addH(ox,oy,L*sc,'down');                                     // perimeter run
      const iwMm=Math.max(800,lp.islandW||2400), idMm=Math.max(600,lp.islandD||1000);
      const ix=X(L/2-iwMm/2), iy=Y(W/2-idMm/2);                    // centred island block
      runs.push([ix,iy,iwMm*sc,idMm*sc]);
      worktops.push([ix,iy,iwMm*sc,idMm*sc]);                      // island gets a full worktop cap
    }
    const markers = [
      { p:tri.fridge, c:'#2563eb', t:'F' },
      { p:tri.sink,   c:'#0891b2', t:'S' },
      { p:tri.hob,    c:'#dc2626', t:'H' },
    ];
    return (
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width:'100%', height:h, display:'block', background:'#fbf8f3' }} aria-label="Kitchen 2D plan">
        {/* room walls */}
        <rect x={ox} y={oy} width={L*sc} height={W*sc} fill="#ffffff" stroke="#9a6a3c" strokeWidth="2.5" />
        {/* cabinet runs */}
        {runs.map((r,i)=><rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill={door.hex} fillOpacity="0.55" stroke="#9a6a3c" strokeWidth="1" />)}
        {/* worktop strips (counter material) on the room-facing edges + island cap */}
        {worktops.map((w,i)=><rect key={'wt'+i} x={w[0]} y={w[1]} width={w[2]} height={w[3]} fill={ctop.hex||'#d9d4cc'} fillOpacity="0.9" stroke="#7c715f" strokeWidth="0.5" />)}
        {/* openings on the bottom wall */}
        {openings.map((o)=>{ const ow=Math.max(200,o.width||600)*sc; const ox2=X(Math.min(L-(o.width||600), o.pos||0)); const col= o.type==='Door'?'#16a34a':o.type==='Window'?'#0ea5e9':'#b45309';
          return <g key={o.id}><rect x={ox2} y={oy+W*sc-3} width={ow} height={6} fill={col} /><text x={ox2+ow/2} y={oy+W*sc+13} fontSize="8" fill={col} textAnchor="middle">{o.type[0]}</text></g>; })}
        {/* work-triangle legs */}
        <line x1={X(tri.fridge.x)} y1={Y(tri.fridge.y)} x2={X(tri.sink.x)} y2={Y(tri.sink.y)} stroke={kwLegOK(legFS)?'#16a34a':'#d97706'} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={X(tri.sink.x)} y1={Y(tri.sink.y)} x2={X(tri.hob.x)} y2={Y(tri.hob.y)} stroke={kwLegOK(legSH)?'#16a34a':'#d97706'} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={X(tri.hob.x)} y1={Y(tri.hob.y)} x2={X(tri.fridge.x)} y2={Y(tri.fridge.y)} stroke={kwLegOK(legHF)?'#16a34a':'#d97706'} strokeWidth="1.5" strokeDasharray="4 3" />
        {markers.map((m,i)=>(<g key={i}><circle cx={X(m.p.x)} cy={Y(m.p.y)} r="9" fill={m.c} /><text x={X(m.p.x)} y={Y(m.p.y)+3.5} fontSize="9" fontWeight="700" fill="#fff" textAnchor="middle">{m.t}</text></g>))}
        {/* dimension labels */}
        <text x={ox+L*sc/2} y={oy-7} fontSize="9" fill="#9a6a3c" textAnchor="middle">{L} mm</text>
        <text x={ox-7} y={oy+W*sc/2} fontSize="9" fill="#9a6a3c" textAnchor="middle" transform={`rotate(-90 ${ox-7} ${oy+W*sc/2})`}>{W} mm</text>
      </svg>
    );
  };

  // drag work-triangle markers in step 5
  const triSvgRef = useRef(null);
  const onTriMove = (e) => {
    if (!drag || !triSvgRef.current) return;
    const r = triSvgRef.current.getBoundingClientRect();
    const cx = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    const cy = (e.touches?e.touches[0].clientY:e.clientY) - r.top;
    const L = Math.max(1000, dims.length), W = Math.max(1000, dims.width);
    const pad=26, vw=320, vh=232;
    const sc = Math.min((vw-pad*2)/L, (vh-pad*2)/W);
    const ox = pad+((vw-pad*2)-L*sc)/2, oy = pad+((vh-pad*2)-W*sc)/2;
    const mx = Math.max(0, Math.min(L, ((cx / r.width * vw) - ox)/sc));
    const my = Math.max(0, Math.min(W, ((cy / r.height * vh) - oy)/sc));
    setTri(t=>({ ...t, [drag]:{ x:Math.round(mx), y:Math.round(my) } }));
  };

  // ── steps meta ──
  const STEPS = ['Room shape','Dimensions','Openings','Layout','Work triangle','Cabinets','Materials','Accessories','Quote'];
  const next = () => setStep(s=>Math.min(STEPS.length-1, s+1));
  const back = () => setStep(s=>Math.max(0, s-1));
  const canNext = (() => {
    if (step===1) return dims.length>=1000 && dims.width>=1000 && dims.ceiling>=2000;
    return true;
  })();

  // ── styles ──
  const HEADER = mobile?72:104, BAR=52;
  const inS = { width:'100%', padding:'9px 11px', border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', fontSize:14, fontFamily:'inherit', color:'var(--ink)', boxSizing:'border-box' };
  const card = (on) => ({ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:'var(--radius-md)', padding:'11px 13px', cursor:'pointer', fontFamily:'inherit' });
  const labelS = { fontSize:11.5, fontWeight:600, color:'var(--ink-soft)', marginBottom:4, display:'block' };
  const sectionH = (n,t,s) => (<div style={{ marginBottom:14 }}><h3 className="display" style={{ fontSize:19, color:'var(--ink)', margin:'0 0 3px' }}>{n} · {t}</h3>{s&&<p style={{ fontSize:13, color:'var(--ink-soft)', margin:0 }}>{s}</p>}</div>);

  const numField = (lbl, val, set, min, max, unit='mm') => (
    <label style={{ display:'block' }}><span style={labelS}>{lbl}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <input type="number" value={val} min={min} max={max} onChange={e=>set(Number(e.target.value))} style={inS} />
        <span style={{ fontSize:12, color:'var(--muted)' }}>{unit}</span>
      </div>
    </label>
  );

  // ── save design ──
  const saveDesign = async () => {
    setBusy(true);
    try {
      const token = uid();
      const breakdown = { cabinets:cabinetTotal, countertop:counterTotal, accessories:accTotal };
      const config = { product:'kitchen', plan_version:'wizard-v1', shape, dimensions:dims, openings,
        layout, layout_name:lay.name, layout_params:lp,
        work_triangle:{ fridge:tri.fridge, sink:tri.sink, hob:tri.hob, legs:{ fridge_sink:+legFS.toFixed(2), sink_hob:+legSH.toFixed(2), hob_fridge:+legHF.toFixed(2) }, total:+triTotal.toFixed(2), valid:triOK },
        modules:bom.map(b=>({ name:b.name, qty:b.qty, width_mm:b.w, line_bhd:b.line })),
        materials:{ carcass:carc.name, door:door.name, countertop:ctop.name, countertop_metres:+counterM.toFixed(2) },
        accessories:accItems.map(a=>({ name:a.name, qty:a.qty, line_bhd:a.line })),
        capacity:{ available_mm:availMm, used_mm:baseWallMm, over:overCapacity },
        bom:prodDocs.bom, manufacturing:prodDocs.manufacturing, installation:prodDocs.installation,
        estimate_bhd:grandTotal };
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:KITCHEN_CATALOG_ANCHORS.modern.id,
        customer_name:user?.name||null, customer_email:user?.email||null, customer_phone:user?.phone||null,
        product_name:`Kitchen plan — ${lay.name} (${(baseRunMm/1000).toFixed(1)}m)`, configuration:config, total_price:grandTotal,
        price_breakdown:breakdown, status:'kitchen-plan', share_token:token, created_at:new Date().toISOString() }] });
      toast(t('w4DesignSavedRef')+' '+token,'success');
    } catch(e) { toast(t('w4CouldNotSave')+' '+(e?.message||t('w4TryAgain')),'error'); }
    finally { setBusy(false); }
  };

  const submitQuote = async (c) => {
    if (!c.name.trim() || !c.phone.trim()) { toast(t('w4AddNamePhone'),'error'); return; }
    { const qv = validateForm(c, { name:{type:'name',required:true}, phone:{type:'phone',required:true}, email:{type:'email'} }, lang); if (!qv.ok) { toast(Object.values(qv.errors)[0], 'error'); return; } c = { ...c, ...qv.clean }; }   // [FORMS] real e-mail / phone validation
    setBusy(true);
    try {
      const token = uid();
      const breakdown = { cabinets:cabinetTotal, countertop:counterTotal, accessories:accTotal };
      const config = { product:'kitchen', plan_version:'wizard-v1', shape, dimensions:dims, layout, layout_name:lay.name,
        work_triangle_valid:triOK, modules:bom.map(b=>({ name:b.name, qty:b.qty, line_bhd:b.line })),
        materials:{ carcass:carc.name, door:door.name, countertop:ctop.name },
        bom:prodDocs.bom, manufacturing:prodDocs.manufacturing, installation:prodDocs.installation,
        estimate_bhd:grandTotal };
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:KITCHEN_CATALOG_ANCHORS.modern.id,
        customer_name:c.name, customer_email:c.email||null, customer_phone:c.phone||null,
        product_name:`Kitchen plan — ${lay.name} (${(baseRunMm/1000).toFixed(1)}m)`, configuration:config, total_price:grandTotal,
        price_breakdown:breakdown, status:'kitchen-plan', share_token:token, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const note = [`🍽️ Kitchen Planner Wizard`, `Layout: ${lay.name}  ·  Room ${dims.length}×${dims.width}mm`,
        `Cabinets: ${bom.length} module lines  ·  Run ${(baseRunMm/1000).toFixed(1)}m`,
        `Materials: ${carc.name} carcass · ${door.name} doors · ${ctop.name} top`,
        `Work triangle: ${triOK?'within guidelines':'review needed'} (${triTotal.toFixed(1)}m total)`,
        `Indicative estimate: BHD ${grandTotal}`, c.date?`Preferred visit: ${c.date}`:'', `Plan ref: ${token}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:c.name, email:c.email||null, phone:c.phone||null,
        source:'website_kitchen_planner', status:'New', stage:'New', platform:'Website', interest:'Kitchen (planner wizard)',
        budget:grandTotal, value:grandTotal, notes:note, created_at:new Date().toISOString() }] });
      toast(t('w4QuoteSentKitchen'),'success');
      setShowQuote(false);
      if (!user && openAuth) openAuth('register', { name:c.name, phone:c.phone, email:c.email });
      else setPage('home');
    } catch(e) { toast(t('w4CouldNotSend')+' '+(e?.message||t('w4TryAgain')),'error'); }
    finally { setBusy(false); }
  };

  // print-friendly PDF quotation
  const downloadPDF = () => {
    const w = window.open('', '_blank');
    if (!w) { toast(t('w4AllowPopups'),'error'); return; }
    const rows = [
      ...bom.map(b=>`<tr><td>${b.name} ×${b.qty}</td><td style="text-align:right">${fmt(b.line)}</td></tr>`),
      `<tr><td>Countertop — ${ctop.name} (${counterM.toFixed(1)}m)</td><td style="text-align:right">${fmt(counterTotal)}</td></tr>`,
      ...accItems.map(a=>`<tr><td>${a.name} ×${a.qty}</td><td style="text-align:right">${fmt(a.line)}</td></tr>`),
    ].join('');
    // ── production documents (BOM / manufacturing / installation) ──
    const esc = s => String(s==null?'':s);
    const D = prodDocs;
    const dim = (i) => [i.width_mm&&i.height_mm&&i.depth_mm ? `${i.width_mm}×${i.height_mm}×${i.depth_mm}` : (i.width_mm?`${i.width_mm}w`:''), i.linear_m?`${i.linear_m}m`:'', i.area_m2?`${i.area_m2}m²`:''].filter(Boolean).join(' · ') || '—';
    const bomRows = D.bom.items.map(i=>`<tr><td>${esc(i.type)}</td><td>${esc(i.name)}</td><td style="text-align:center">${i.qty||'—'}</td><td>${dim(i)}</td><td>${esc(i.material||i.supply||'—')}</td><td>${esc(i.finish||'—')}</td><td style="text-align:right">${i.line_bhd!=null?fmt(i.line_bhd):'—'}</td></tr>`).join('');
    const mfgRows = D.manufacturing.modules.map(m=>`<tr><td>${esc(m.name)}</td><td style="text-align:center">${m.qty}</td><td style="text-align:center">${m.width_mm}</td><td style="text-align:center">${m.carcass_panels}</td><td style="text-align:center">${m.door_fronts}</td><td style="text-align:center">${m.drawer_fronts}</td></tr>`).join('');
    const cs = D.manufacturing.cut_summary;
    const applRows = (D.installation.appliances_to_connect||[]).map(a=>`<li>${esc(a.name)} ×${a.qty}</li>`).join('') || '<li class="muted">None flagged</li>';
    const accFitRows = (D.installation.handles_accessories_fit||[]).map(a=>`<li>${esc(a.name)} ×${a.qty}</li>`).join('') || '<li class="muted">None</li>';

    w.document.write(`<html><head><title>Kitchen Quotation & Production Pack</title><style>body{font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;color:#2a1f16;padding:36px;max-width:760px;margin:0 auto}h1{font-size:24px}h2{font-size:17px;color:#9a3412;margin:30px 0 4px;border-top:2px solid #e3d6c6;padding-top:18px}table{width:100%;border-collapse:collapse;margin-top:10px}th{text-align:left;font-size:11px;color:#8a7a68;text-transform:uppercase;letter-spacing:.4px;padding:6px 4px;border-bottom:1px solid #cbb89f}td{padding:7px 4px;border-bottom:1px solid #e3d6c6;font-size:12.5px}.tot{font-size:20px;font-weight:700;color:var(--clay-deep);text-align:right;margin-top:16px}.muted{color:#8a7a68;font-size:12px}.tag{display:inline-block;background:#fdebd3;color:#9a3412;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:8px;text-transform:uppercase;letter-spacing:.4px}ul{font-size:12.5px;margin:6px 0;padding-left:20px}.grid{display:flex;gap:24px;flex-wrap:wrap;font-size:12.5px;margin-top:8px}@media print{h2{page-break-after:avoid}}</style></head><body>
      <h1>The Closets — Kitchen Quotation</h1>
      <p class="muted">${esc(lay.name)} layout · Room ${dims.length}×${dims.width}×${dims.ceiling}mm · ${esc(carc.name)} carcass · ${esc(door.name)} doors</p>
      <p class="muted">Work triangle: ${triOK?'within recommended guidelines':'review recommended'} — total ${triTotal.toFixed(1)}m</p>
      <table><tbody>${rows}</tbody></table>
      <div class="tot">Estimated total: ${fmt(grandTotal)}</div>
      <p class="muted" style="margin-top:14px">Indicative guide price. A free design visit confirms exact measurements and a fully itemised quote.</p>

      <h2>Bill of Materials</h2>
      <table><thead><tr><th>Type</th><th>Item</th><th>Qty</th><th>Dimensions (mm)</th><th>Material</th><th>Finish</th><th style="text-align:right">Est. line</th></tr></thead><tbody>${bomRows}</tbody></table>
      <p class="muted">${D.bom.totals.cabinet_units} cabinet units across ${D.bom.totals.cabinet_lines} lines · ${D.bom.totals.accessory_lines} accessory lines · worktop ${D.bom.totals.worktop_metres}m. Dimensions & splashback are indicative.</p>

      <h2>Manufacturing List <span class="tag">Indicative</span></h2>
      <p class="muted">Carcass: ${esc(D.manufacturing.carcass_material||'—')} · Fronts: ${esc(D.manufacturing.front_material||'—')} · Finish: ${esc(D.manufacturing.finish||'—')}</p>
      <table><thead><tr><th>Module</th><th>Qty</th><th>Width</th><th>Carcass panels</th><th>Door fronts</th><th>Drawer fronts</th></tr></thead><tbody>${mfgRows}</tbody></table>
      <div class="grid">
        <div><b>Cut summary:</b> ${cs.total_panels} panels (${cs.carcass_panels} carcass · ${cs.door_panels} doors · ${cs.drawer_fronts} drawers)</div>
        <div><b>Edge-banding:</b> ~${D.manufacturing.edge_banding_m}m</div>
        <div><b>Hinges:</b> ${D.manufacturing.hinges_count}</div>
        <div><b>Runner pairs:</b> ${D.manufacturing.runners_count}</div>
      </div>
      <p class="muted">Panel counts, edge-banding, hinges and runners are indicative — confirm against CNC nesting before cutting.</p>

      <h2>Installation List <span class="tag">Indicative</span></h2>
      <div class="grid">
        <div><b>Units to install:</b> ${D.installation.units_to_install}</div>
        <div><b>Worktop fitting:</b> ${D.installation.worktop_fitting_m}m</div>
        <div><b>Est. time:</b> ${D.installation.estimated_hours}h (~${D.installation.estimated_days} day(s))</div>
      </div>
      <p style="font-size:12.5px;margin:10px 0 2px"><b>Appliances to connect:</b></p><ul>${applRows}</ul>
      <p style="font-size:12.5px;margin:6px 0 2px"><b>Handles & accessories to fit:</b></p><ul>${accFitRows}</ul>
      <p class="muted">Time estimate is indicative (base + per-unit + worktop + appliance allowances).</p>
      </body></html>`);
    w.document.close();
    setTimeout(()=>{ try{ w.print(); }catch(e){} }, 350);
  };

  const updMod = (key, qty) => setModules(ms=>ms.map(m=>m.key===key?{...m,qty:Math.max(0,qty)}:m));
  const addMod = (id, kind) => setModules(ms=>[...ms, { key:uid(), id, kind, qty:1 }]);
  const rmMod = (key) => setModules(ms=>ms.filter(m=>m.key!==key));

  // ── PREVIEW pane (shared) ──
  const previewPane = (h3d, h2d) => (
    <div style={{ display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
      <div style={{ display:'flex', gap:6 }}>
        <button type="button" onClick={()=>setView3d(false)} style={{ flex:1, padding:'6px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background:!view3d?'var(--clay)':'var(--sand)', color:!view3d?'#fff':'var(--ink-soft)' }}>{t('p2dPlan')}</button>
        <button type="button" onClick={()=>setView3d(true)} style={{ flex:1, padding:'6px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background:view3d?'var(--clay)':'var(--sand)', color:view3d?'#fff':'var(--ink-soft)' }}>{t('p3dView')}</button>
        <button type="button" onClick={()=>setStudioRoomDesignerOpen(true)} style={{ flex:'1.4 1 0', padding:'6px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background:'var(--clay)', color:'#fff', whiteSpace:'nowrap' }}>{t('pOpenRoomDesigner')}</button>
      </div>
      <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', overflow:'hidden', flex:1, minHeight:0 }}>
        {view3d
          ? <div style={{ height:'100%', minHeight:h3d }}><Wardrobe3D product="kitchen" layout={view3dLayout} finishHex={door.hex} handles={(acc.handles||0)>0} led={(acc.lighting||0)>0} glass={false} widthCm={Math.max(120,Math.round((baseRunMm||dims.length)/10))} heightCm={Math.max(200,Math.round((dims.ceiling||2700)/10))} depthCm={60} mobile={mobile} preset="iso" /></div>
          : planView(h2d)}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{lay.name} · {(baseRunMm/1000).toFixed(1)}m run</span>
        <span className="display" style={{ fontSize:20, color:'var(--clay)' }}>{fmt(grandTotal)}</span>
      </div>
      {overCapacity && <div style={{ fontSize:11, color:'var(--danger)', background:'rgba(220,38,38,.08)', borderRadius:'var(--radius-sm)', padding:'6px 9px' }}>⚠ Modules ({(baseWallMm/1000).toFixed(1)}m) exceed available wall ({(availMm/1000).toFixed(1)}m).</div>}
    </div>
  );

  // ── STEP CONTENT ──
  const stepContent = () => {
    switch(step) {
      case 0: return (<>{sectionH('1',t('shK0t'),t('shK0s'))}
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:10 }}>
          {KW_ROOM_SHAPES.map(s=>{ const on=shape===s.id; return (
            <button key={s.id} type="button" onClick={()=>setShape(s.id)} style={card(on)}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5"><path d={s.ic} /></svg>
              <div style={{ fontSize:14, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', marginTop:6 }}>{trOpt(s.name, lang)}</div>
              <div style={{ fontSize:11.5, color:'var(--muted)' }}>{trOpt(s.sub, lang)}</div>
            </button>); })}
        </div></>);
      case 1: return (<>{sectionH('2',t('shK1t'),t('shK1s'))}
        <div style={{ display:'grid', gap:12 }}>
          {numField(t('fLength'), dims.length, v=>setDims(d=>({...d,length:v})), 1000, 12000)}
          {numField(t('fWidth'), dims.width, v=>setDims(d=>({...d,width:v})), 1000, 12000)}
          {numField(t('fCeilingHeight'), dims.ceiling, v=>setDims(d=>({...d,ceiling:v})), 2000, 4000)}
          {(dims.length<1000||dims.width<1000||dims.ceiling<2000) && <div style={{ fontSize:12, color:'var(--danger)' }}>Length & width need ≥1000mm and ceiling ≥2000mm.</div>}
        </div></>);
      case 2: return (<>{sectionH('3',t('shK2t'),t('shK2s'))}
        <div style={{ display:'grid', gap:9 }}>
          {openings.map((o)=>(
            <div key={o.id} style={{ border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'9px 10px', background:'var(--c-surface)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr auto', gap:7, alignItems:'end' }}>
                <label><span style={labelS}>Type</span>
                  <select value={o.type} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,type:e.target.value}:x))} style={inS}>{KW_OPENING_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
                <label><span style={labelS}>Position</span><input type="number" value={o.pos} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,pos:Number(e.target.value)}:x))} style={inS} /></label>
                <label><span style={labelS}>Width</span><input type="number" value={o.width} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,width:Number(e.target.value)}:x))} style={inS} /></label>
                <button type="button" onClick={()=>setOpenings(os=>os.filter(x=>x.id!==o.id))} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-sm)', padding:'9px 11px', cursor:'pointer', color:'var(--muted)' }}>✕</button>
              </div>
            </div>))}
          <button type="button" onClick={()=>setOpenings(os=>[...os,{ id:uid(), type:'Window', pos:1500, width:1000 }])} style={{ border:'1px dashed var(--line)', borderRadius:'var(--radius-md)', padding:'10px', background:'var(--sand)', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--clay-deep)' }}>{t('vAddOpening')}</button>
        </div></>);
      case 3: return (<>{sectionH('4',t('shK3t'),t('shK3s'))}
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?14:18, marginBottom:18 }}>
          {kwLayoutsView.map(l=>{ const on=layout===l.id; return (
            <button key={l.id} type="button" onClick={()=>setLayout(l.id)} style={{ ...card(on), padding:0, overflow:'hidden', textAlign:'left', borderRadius:'var(--radius-lg)', boxShadow: on?'0 12px 32px rgba(194,65,28,.18)':'0 2px 14px rgba(33,28,24,.07)', transform: on?'translateY(-2px)':'none', transition:'transform .18s ease, box-shadow .18s ease' }}>
              <div style={{ position:'relative', width:'100%', background:'var(--cream)', overflow:'hidden', borderTopLeftRadius:16, borderTopRightRadius:16 }}>
                <img src={l.img} alt={l.name} {...layoutImgSize(l.img)} loading="lazy" decoding="async" style={{ display:'block', width:'100%', height:'auto' }} />
                {on && <div style={{ position:'absolute', top:10, right:10, background:'var(--clay)', color:'#fff', fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:'var(--radius-pill)', letterSpacing:.3, boxShadow:'0 2px 8px rgba(0,0,0,.18)' }}>✓ Selected</div>}
              </div>
              <div style={{ padding: mobile?'13px 15px':'15px 17px', borderTop:'1px solid var(--line)' }}>
                <div style={{ fontSize: mobile?16:17, fontWeight:700, color:on?'var(--clay-deep)':'var(--ink)', lineHeight:1.22 }}>{trOpt(l.name, lang)}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{trOpt(l.sub, lang)}</div>
              </div>
            </button>); })}
        </div>
        <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'13px 14px' }}>
          <div className="eyebrow" style={{ fontSize:11, marginBottom:10 }}>{lang==='ar'?`${t('gParameters')} ${lay.name}`:`${lay.name} ${t('gParameters')}`}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            {layout==='single' && <>{numField('Total wall length', lp.wallLen, v=>setLp(p=>({...p,wallLen:v})), 1000, 12000)}<div style={{ gridColumn:'1/-1', fontSize:12, color:'var(--ink-soft)' }}>Set fridge / sink / hob & tall-unit positions on the next step.</div></>}
            {layout==='galley' && <>{numField('Run length', lp.wallLen, v=>setLp(p=>({...p,wallLen:v})), 1000, 12000)}{numField('Distance between runs', lp.galleyGap, v=>setLp(p=>({...p,galleyGap:v})), 800, 4000)}{lp.galleyGap<1200 && <div style={{ gridColumn:'1/-1', fontSize:12, color:'var(--danger)' }}>⚠ Gap below 1200mm — two cooks can't pass comfortably.</div>}</>}
            {(layout==='l-shape'||layout==='peninsula') && <>{numField('Wall A length', lp.wallA, v=>setLp(p=>({...p,wallA:v})), 800, 9000)}{numField('Wall B length', lp.wallB, v=>setLp(p=>({...p,wallB:v})), 800, 9000)}<label style={{ gridColumn: layout==='peninsula'?'auto':'1/-1' }}><span style={labelS}>Corner type</span><select value={lp.corner} onChange={e=>setLp(p=>({...p,corner:e.target.value}))} style={inS}><option>L-return</option><option>Diagonal corner</option><option>Magic corner</option><option>Carousel</option></select></label>{layout==='peninsula' && numField('Access clearance', lp.clearance, v=>setLp(p=>({...p,clearance:v})), 800, 2000)}</>}
            {layout==='u-shape' && <>{numField('Wall A', lp.uA, v=>setLp(p=>({...p,uA:v})), 800, 9000)}{numField('Wall B', lp.uB, v=>setLp(p=>({...p,uB:v})), 800, 9000)}{numField('Wall C', lp.uC, v=>setLp(p=>({...p,uC:v})), 800, 9000)}{numField('Entrance opening', lp.entrance, v=>setLp(p=>({...p,entrance:v})), 700, 3000)}<label style={{ gridColumn:'1/-1' }}><span style={labelS}>Corner cabinet types</span><select value={lp.corner} onChange={e=>setLp(p=>({...p,corner:e.target.value}))} style={inS}><option>Magic corner</option><option>Carousel</option><option>Diagonal corner</option><option>L-return</option></select></label></>}
            {layout==='island' && <>{numField('Island width', lp.islandW, v=>setLp(p=>({...p,islandW:v})), 800, 4000)}{numField('Island depth', lp.islandD, v=>setLp(p=>({...p,islandD:v})), 600, 1600)}{numField('Run length', lp.wallLen, v=>setLp(p=>({...p,wallLen:v})), 1000, 12000)}{numField('Seating count', lp.seats, v=>setLp(p=>({...p,seats:v})), 0, 12, 'seats')}<label style={{ gridColumn:'1/-1' }}><span style={labelS}>Island function</span><select value={lp.islandFn} onChange={e=>setLp(p=>({...p,islandFn:e.target.value}))} style={inS}>{['Prep','Cooking','Sink','Dining','Multi-purpose'].map(f=><option key={f}>{f}</option>)}</select></label></>}
            {layout==='peninsula' && <>{numField('Peninsula width', lp.penW, v=>setLp(p=>({...p,penW:v})), 800, 3000)}{numField('Peninsula depth', lp.penD, v=>setLp(p=>({...p,penD:v})), 400, 1200)}{numField('Seating positions', lp.seats, v=>setLp(p=>({...p,seats:v})), 0, 8, 'seats')}</>}
          </div>
        </div></>);
      case 4: return (<>{sectionH('5',t('shK4t'),t('shK4s'))}
        <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', padding:10, marginBottom:12, touchAction:'none' }}
             ref={triSvgRef} onMouseMove={onTriMove} onMouseUp={()=>setDrag(null)} onMouseLeave={()=>setDrag(null)} onTouchMove={onTriMove} onTouchEnd={()=>setDrag(null)}>
          <svg viewBox="0 0 320 232" style={{ width:'100%', height:mobile?200:240, display:'block' }}>
            {(()=>{ const L=Math.max(1000,dims.length),W=Math.max(1000,dims.width),pad=26,vw=320,vh=232,sc=Math.min((vw-pad*2)/L,(vh-pad*2)/W),ox=pad+((vw-pad*2)-L*sc)/2,oy=pad+((vh-pad*2)-W*sc)/2;const X=mm=>ox+mm*sc,Y=mm=>oy+mm*sc;
              return (<><rect x={ox} y={oy} width={L*sc} height={W*sc} fill="#fff" stroke="#9a6a3c" strokeWidth="2" />
                <line x1={X(tri.fridge.x)} y1={Y(tri.fridge.y)} x2={X(tri.sink.x)} y2={Y(tri.sink.y)} stroke={kwLegOK(legFS)?'#16a34a':'#d97706'} strokeWidth="2" />
                <line x1={X(tri.sink.x)} y1={Y(tri.sink.y)} x2={X(tri.hob.x)} y2={Y(tri.hob.y)} stroke={kwLegOK(legSH)?'#16a34a':'#d97706'} strokeWidth="2" />
                <line x1={X(tri.hob.x)} y1={Y(tri.hob.y)} x2={X(tri.fridge.x)} y2={Y(tri.fridge.y)} stroke={kwLegOK(legHF)?'#16a34a':'#d97706'} strokeWidth="2" />
                {[['fridge','#2563eb','F'],['sink','#0891b2','S'],['hob','#dc2626','H']].map(([k,c,t])=>(
                  <g key={k} style={{ cursor:'grab' }} onMouseDown={()=>setDrag(k)} onTouchStart={()=>setDrag(k)}><circle cx={X(tri[k].x)} cy={Y(tri[k].y)} r="12" fill={c} /><text x={X(tri[k].x)} y={Y(tri[k].y)+4} fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">{t}</text></g>))}
              </>); })()}
          </svg>
        </div>
        <div style={{ display:'grid', gap:7 }}>
          {[['Fridge → Sink',legFS],['Sink → Hob',legSH],['Hob → Fridge',legHF]].map(([l,v])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'8px 11px' }}>
              <span style={{ fontSize:13, color:'var(--ink)' }}>{l}</span>
              <span style={{ fontSize:13, fontWeight:600, color: kwLegOK(v)?'var(--ok)':'#d97706' }}>{v.toFixed(2)}m {kwLegOK(v)?'✓':'⚠'}</span>
            </div>))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 11px', fontWeight:700 }}>
            <span style={{ fontSize:13, color:'var(--ink)' }}>Total triangle</span>
            <span style={{ fontSize:13, color: triOK?'var(--ok)':'#d97706' }}>{triTotal.toFixed(2)}m</span>
          </div>
        </div></>);
      case 5: return (<>{sectionH('6',t('shK5t'),t('shK5s'))}
        <div style={{ display:'grid', gap:8, marginBottom:14 }}>
          {modules.filter(m=>m.qty>0).map(m=>{ const u=findU(m.id); if(!u) return null; return (
            <div key={m.key} style={{ display:'flex', alignItems:'center', gap:9, background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'8px 10px' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{u.label} <span style={{ fontSize:11, color:'var(--muted)', textTransform:'capitalize' }}>· {m.kind}</span></div><div style={{ fontSize:11, color:'var(--muted)' }}>{u.w}mm · {fmt(Math.round(u.price*(m.kind==='tall'?carc.mult:matMult)))}/unit</div></div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button type="button" onClick={()=>updMod(m.key,m.qty-1)} style={{ width:26, height:26, borderRadius:'var(--radius-sm)', border:'1px solid var(--line)', background:'var(--c-surface)', cursor:'pointer' }}>−</button>
                <span style={{ minWidth:18, textAlign:'center', fontSize:13, fontWeight:600 }}>{m.qty}</span>
                <button type="button" onClick={()=>updMod(m.key,m.qty+1)} style={{ width:26, height:26, borderRadius:'var(--radius-sm)', border:'1px solid var(--line)', background:'var(--c-surface)', cursor:'pointer' }}>+</button>
                <button type="button" onClick={()=>rmMod(m.key)} style={{ marginLeft:4, background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}>✕</button>
              </div>
            </div>); })}
        </div>
        {[[t('gBaseUnits'),KW_BASE_UNITS,'base'],[t('gWallUnits'),KW_WALL_UNITS,'wall'],[t('gTallUnits'),KW_TALL_UNITS,'tall']].map(([title,list,kind])=>(
          <div key={kind} style={{ marginBottom:12 }}>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:7 }}>{title}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {list.map(u=>(<button key={u.id} type="button" onClick={()=>addMod(u.id,kind)} style={{ border:'1px solid var(--line)', borderRadius:'var(--radius-sm)', padding:'7px 10px', background:'var(--c-surface)', cursor:'pointer', fontSize:12, color:'var(--ink-soft)' }}>+ {u.label}</button>))}
            </div>
          </div>))}</>);
      case 6: return (<>{sectionH('7',t('shK6t'),t('shK6s'))}
        {[[t('gCarcass'),'carcass',KW_CARCASS],[t('gDoorFinish'),'door',KW_DOORS]].map(([title,key,list])=>(
          <div key={key} style={{ marginBottom:14 }}>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{title}</div>
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:8 }}>
              {list.map(o=>{ const on=mats[key]===o.id; return (
                <button key={o.id} type="button" onClick={()=>setMats(m=>({...m,[key]:o.id}))} style={card(on)}>
                  {o.hex && <div style={{ height:30, borderRadius:'var(--radius-sm)', background:o.hex, marginBottom:6 }} />}
                  <div style={{ fontSize:13, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(o.name, lang)}</div>
                  <div style={{ fontSize:10.5, color:'var(--muted)' }}>{o.sub||('×'+o.mult.toFixed(2))}</div>
                </button>); })}
            </div>
          </div>))}
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{t('gCountertop')}</div>
        <div style={{ display:'grid', gap:8 }}>
          {KW_COUNTERTOPS.map(c=>{ const on=mats.counter===c.id; return (
            <button key={c.id} type="button" onClick={()=>setMats(m=>({...m,counter:c.id}))} style={{ ...card(on), display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(c.name, lang)}</span>
              <span style={{ fontSize:12.5, fontWeight:700, color:'var(--clay)' }}>{fmt(c.perM)}/m</span>
            </button>); })}
        </div></>);
      case 7: return (<>{sectionH('8',t('shK7t'),t('shK7s'))}
        <div style={{ display:'grid', gap:9 }}>
          {KW_ACCESSORIES.map(a=>{ const q=acc[a.id]||0; const on=q>0; return (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:9, border: on?'2px solid var(--clay)':'1px solid var(--line)', background:on?'var(--sand)':'#fff', borderRadius:'var(--radius-md)', padding:'9px 11px' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{a.name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{fmt(a.price)} / {a.unit}</div></div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button type="button" onClick={()=>setAcc(s=>({...s,[a.id]:Math.max(0,q-1)}))} style={{ width:26, height:26, borderRadius:'var(--radius-sm)', border:'1px solid var(--line)', background:'var(--c-surface)', cursor:'pointer' }}>−</button>
                <span style={{ minWidth:18, textAlign:'center', fontSize:13, fontWeight:600 }}>{q}</span>
                <button type="button" onClick={()=>setAcc(s=>({...s,[a.id]:q+1}))} style={{ width:26, height:26, borderRadius:'var(--radius-sm)', border:'1px solid var(--line)', background:'var(--c-surface)', cursor:'pointer' }}>+</button>
              </div>
            </div>); })}
        </div></>);
      case 8: return (<>{sectionH('9',t('shSummaryT'),t('shSummaryS'))}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'8px 12px', background:'var(--sand)', fontSize:11.5, fontWeight:700, color:'var(--ink-soft)' }}>{t('pBillOfMaterials')}</div>
          {bom.map(b=>(<div key={b.key} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{b.name} ×{b.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(b.line)}</span></div>))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>Countertop · {ctop.name} ({counterM.toFixed(1)}m)</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(counterTotal)}</span></div>
          {accItems.map(a=>(<div key={a.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{a.name} ×{a.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(a.line)}</span></div>))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderTop:'2px solid var(--line)', background:'var(--sand)' }}><span style={{ fontWeight:700, color:'var(--ink)' }}>{t('pEstimatedTotal')}</span><span className="display" style={{ fontSize:19, color:'var(--clay-deep)' }}>{fmt(grandTotal)}</span></div>
        </div>

        {/* ── Production Specification (BOM / Manufacturing / Installation) ── */}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:12 }}>
          <div style={{ display:'flex', gap:0, background:'var(--sand)', padding:4, borderBottom:'1px solid var(--line)' }}>
            {[['bom','Bill of materials'],['manufacturing','Manufacturing'],['installation','Installation']].map(([id,t])=>{ const on=specTab===id; return (
              <button key={id} type="button" onClick={()=>setSpecTab(id)} style={{ flex:1, padding:'7px 6px', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:11.5, fontWeight:on?700:600, background:on?'#fff':'transparent', color:on?'var(--clay-deep)':'var(--ink-soft)', boxShadow:on?'0 1px 4px rgba(33,28,24,.08)':'none' }}>{t}</button>); })}
          </div>
          <div style={{ padding:'4px 0 8px' }}>
            {specTab==='bom' && (<>
              {prodDocs.bom.items.map((i,ix)=>(
                <div key={ix} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, padding:'7px 12px', fontSize:12, borderTop:ix?'1px solid var(--line)':'none' }}>
                  <div style={{ minWidth:0 }}>
                    <span style={{ fontWeight:600, color:'var(--ink)' }}>{i.name}</span>{i.qty>1&&<span style={{ color:'var(--muted)' }}> ×{i.qty}</span>}
                    <div style={{ fontSize:10.5, color:'var(--muted)' }}>{[i.type, i.width_mm&&i.height_mm&&i.depth_mm?`${i.width_mm}×${i.height_mm}×${i.depth_mm}mm`:(i.linear_m?`${i.linear_m}m`:null), i.area_m2?`${i.area_m2}m²`:null, i.material, i.supply].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap' }}>{i.line_bhd!=null?fmt(i.line_bhd):'—'}</span>
                </div>))}
              <div style={{ padding:'7px 12px', borderTop:'2px solid var(--line)', fontSize:11, color:'var(--muted)' }}>{prodDocs.bom.totals.cabinet_units} {t('w4SpecUnits')} · {prodDocs.bom.totals.accessory_lines} {t('w4SpecAccessoryLines')} · {prodDocs.bom.totals.appliance_lines||0} {t('w4SpecAppliances')} · {t('w4SpecWorktop')} {prodDocs.bom.totals.worktop_metres}m. {t('w4SpecDimsIndicative')}</div>
            </>)}
            {specTab==='manufacturing' && (<>
              <div style={{ padding:'6px 12px', fontSize:11, color:'var(--ink-soft)' }}>{prodDocs.manufacturing.carcass_material} {t('w4SpecCarcass')} · {prodDocs.manufacturing.front_material} {t('w4SpecFronts')} · {prodDocs.manufacturing.finish} {t('w4SpecFinishWord')}</div>
              {prodDocs.manufacturing.modules.map((m,ix)=>(
                <div key={ix} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'6px 12px', fontSize:12, borderTop:'1px solid var(--line)' }}>
                  <span style={{ color:'var(--ink)' }}>{m.name} ×{m.qty} <span style={{ color:'var(--muted)' }}>· {m.width_mm}mm</span></span>
                  <span style={{ color:'var(--ink-soft)', whiteSpace:'nowrap' }}>{m.carcass_panels} carc · {m.door_fronts} dr · {m.drawer_fronts} drw</span>
                </div>))}
              <div style={{ padding:'8px 12px', borderTop:'2px solid var(--line)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px', fontSize:11.5, color:'var(--ink-soft)' }}>
                <span><b style={{ color:'var(--ink)' }}>{prodDocs.manufacturing.cut_summary.total_panels}</b> {t('w4SpecPanelsTotal')}</span>
                <span>{t('w4SpecEdgeBand')}<b style={{ color:'var(--ink)' }}>{prodDocs.manufacturing.edge_banding_m}m</b></span>
                <span><b style={{ color:'var(--ink)' }}>{prodDocs.manufacturing.hinges_count}</b> {t('w4SpecHinges')}</span>
                <span><b style={{ color:'var(--ink)' }}>{prodDocs.manufacturing.runners_count}</b> {t('w4SpecRunnerPairs')}</span>
              </div>
              <div style={{ padding:'4px 12px 2px', fontSize:10.5, color:'var(--muted)' }}>{t('w4SpecFactoryIndic')}</div>
            </>)}
            {specTab==='installation' && (<>
              <div style={{ padding:'8px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px', fontSize:12, color:'var(--ink-soft)' }}>
                <span><b style={{ color:'var(--ink)' }}>{prodDocs.installation.units_to_install}</b> {t('w4SpecUnitsToInstall')}</span>
                <span>{t('w4SpecWorktopCap')} <b style={{ color:'var(--ink)' }}>{prodDocs.installation.worktop_fitting_m}m</b></span>
                <span style={{ gridColumn:'1/-1' }}>{t('w4SpecEstTime')} <b style={{ color:'var(--clay-deep)' }}>{prodDocs.installation.estimated_hours}h</b> (~{prodDocs.installation.estimated_days} {t('w4SpecDay')}</span>
              </div>
              <div style={{ padding:'4px 12px', fontSize:11.5, borderTop:'1px solid var(--line)' }}>
                <div style={{ fontWeight:600, color:'var(--ink)', margin:'4px 0 2px' }}>{t('w4SpecAppliancesConnect')}</div>
                {prodDocs.installation.appliances_to_connect.length ? prodDocs.installation.appliances_to_connect.map((a,ix)=><div key={ix} style={{ color:'var(--ink-soft)' }}>• {a.name} ×{a.qty}</div>) : <div style={{ color:'var(--muted)' }}>{t('w4SpecNoneFlagged')}</div>}
                <div style={{ fontWeight:600, color:'var(--ink)', margin:'6px 0 2px' }}>{t('w4SpecHandlesFit')}</div>
                {prodDocs.installation.handles_accessories_fit.length ? prodDocs.installation.handles_accessories_fit.map((a,ix)=><div key={ix} style={{ color:'var(--ink-soft)' }}>• {a.name} ×{a.qty}</div>) : <div style={{ color:'var(--muted)' }}>{t('w4SpecNone')}</div>}
              </div>
            </>)}
          </div>
        </div>

        <div style={{ background: triOK?'rgba(22,163,74,.08)':'rgba(217,119,6,.08)', borderRadius:'var(--radius-md)', padding:'9px 12px', fontSize:12.5, color: triOK?'#15803d':'#b45309', marginBottom:12 }}>
          {t('vWorkTriangle')}: {triOK?t('vTriangleOk'):t('vTriangleBad')} · {lang==='ar'?'الإجمالي':'total'} {triTotal.toFixed(1)}m
        </div>
        {overCapacity && <div style={{ fontSize:12.5, color:'var(--danger)', marginBottom:12 }}>{t('w4SpecCabinetExceeds')}</div>}
        <div style={{ display:'grid', gap:8 }}>
          <button type="button" disabled={busy} onClick={saveDesign} style={{ border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pSaveDesign')}</button>
          <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:'var(--radius-md)' }}>{user?t('pGetQuoteArrow'):t('pSignInQuoteArrow')}</button>
          <button type="button" onClick={downloadPDF} style={{ border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pDownloadPdf')}</button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
            {[['w4SoonAiSuggestions'],['w4SoonMfgDrawings'],['w4SoonCncCut'],['w4SoonRevHistory'],['w4SoonApproval']].map(([k])=>(
              <button key={k} type="button" disabled title="Coming soon" style={{ border:'1px dashed var(--line)', background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'9px', fontSize:11.5, color:'var(--muted)', cursor:'not-allowed' }}>{t(k)} · {t('w4SoonSuffix')}</button>))}
          </div>
        </div></>);
      default: return null;
    }
  };

  // ── APP SHELL (fit-to-viewport) ──
  return (
    <div style={{ height: mobile?'100dvh':`calc(100dvh - ${HEADER}px)`, marginTop: HEADER, display:'flex', flexDirection:'column', background:'var(--cream)', overflow:'hidden' }}>
      {/* step bar */}
      <div style={{ height:BAR, flexShrink:0, display:'flex', alignItems:'center', gap:4, overflowX:'auto', padding:'0 12px', borderBottom:'1px solid var(--line)', background:'var(--c-surface)' }}>
        {STEPS.map((s,i)=>{ const done=i<step, now=i===step; return (
          <button key={s} type="button" onClick={()=>i<=step&&setStep(i)} style={{ flexShrink:0, display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:i<=step?'pointer':'default', padding:'2px 6px' }}>
            <span style={{ width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10.5, fontWeight:700, background: now?'var(--clay)':done?'var(--clay-deep)':'var(--sand)', color:(!now&&!done)?'var(--muted)':'#fff' }}>{done?'✓':i+1}</span>
            <span style={{ fontSize:12, fontWeight:now?700:500, color:now?'var(--ink)':done?'var(--ink-soft)':'var(--muted)', whiteSpace:'nowrap' }}>{trStep(s, lang)}</span>
          </button>); })}
      </div>

      {/* two-pane body */}
      <div style={{ flex:1, minHeight:0, display:'flex', flexDirection: mobile?'column':'row' }}>
        {/* LEFT — controls (own scroll) */}
        <div style={{ width: mobile?'auto':410, flexShrink:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding: mobile?'14px 14px 0':'18px 20px', borderRight: mobile?'none':'1px solid var(--line)', flex: mobile?1:'none', minHeight:0 }}>
          <div style={{ maxWidth:560, margin:'0 auto', paddingBottom: mobile?16:30 }}>{stepContent()}</div>
        </div>
        {/* RIGHT — sticky preview (desktop) */}
        {!mobile && (
          <div style={{ flex:1, minWidth:0, padding:'18px 20px', display:'flex', flexDirection:'column' }}>
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', padding:14, boxShadow:'var(--shadow)', flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
              {previewPane(280, '100%')}
            </div>
          </div>
        )}
        {/* mobile collapsible preview */}
        {mobile && showPrev && (
          <div style={{ flexShrink:0, padding:'10px 14px', borderTop:'1px solid var(--line)', background:'var(--c-surface)' }}>
            <div style={{ height:200 }}>{previewPane(190,190)}</div>
          </div>
        )}
      </div>

      {/* bottom action bar */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'9px 14px calc(9px + env(safe-area-inset-bottom))', borderTop:'1px solid var(--line)', background:'rgba(255,255,255,.97)', backdropFilter:'blur(10px)' }}>
        {step>0 ? <button type="button" onClick={back} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'10px 16px', fontSize:13.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pBack')}</button>
          : <button type="button" onClick={()=>setPage('kitchen')} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'10px 16px', fontSize:13, color:'var(--muted)', cursor:'pointer' }}>{t('pExit')}</button>}
        {mobile && <button type="button" onClick={()=>setShowPrev(v=>!v)} style={{ background:'var(--sand)', border:'none', borderRadius:'var(--radius-md)', padding:'10px 12px', fontSize:12.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{showPrev?t('pHide'):t('pPreview')}</button>}
        <div style={{ flex:1, textAlign: mobile?'center':'right', minWidth:0 }}><span style={{ fontSize:10.5, color:'var(--muted)' }}>{t('pTotal')} </span><span className="display" style={{ fontSize:17, color:'var(--clay)' }}>{fmt(grandTotal)}</span></div>
        {step<STEPS.length-1
          ? <button type="button" className="btn-clay" disabled={!canNext} onClick={next} style={{ borderRadius:'var(--radius-md)', minWidth:120, opacity:canNext?1:.55 }}>{t('pNextArrow')}</button>
          : <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:'var(--radius-md)', minWidth:120 }}>{t('pGetQuoteArrow')}</button>}
      </div>

      {/* QUOTE modal */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowQuote(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', maxWidth:420, width:'100%', padding:24 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 6px' }}>{t('pQuoteTitleKitchen')}</h3>
            <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)' }}>{lay.name} · {door.name} · {ctop.name} · <b style={{ color:'var(--clay-deep)' }}>{fmt(grandTotal)}</b></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))} placeholder={t('pYourName')} style={inS} />
              <input value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} placeholder="Phone (+973…)" inputMode="tel" style={inS} />
              <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} placeholder="Email (optional)" inputMode="email" style={inS} />
              <input type="date" value={contact.date} onChange={e=>setContact(c=>({...c,date:e.target.value}))} style={inS} />
            </div>
            <FormNotice kind="request" style={{ marginTop:12 }} />
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button type="button" onClick={()=>setShowQuote(false)} disabled={busy} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pCancel')}</button>
              <button type="button" className="btn-clay" disabled={busy||!contact.name.trim()||!contact.phone.trim()} onClick={()=>submitQuote(contact)} style={{ flex:2, borderRadius:'var(--radius-md)', opacity:(busy||!contact.name.trim()||!contact.phone.trim())?.6:1 }}>{busy?t('pSending'):(user?t('pSendQuoteReq'):t('pSignInSend'))}</button>
            </div>
          </ModalPanel>
        </div>
      )}

      {/* Room Designer overlay (renders its own full-screen fixed layer) */}
      {studioRoomDesignerOpen ? (
        <RoomDesigner
          mobile={mobile}
          sceneShapeFallback={layout}
          onClose={() => setStudioRoomDesignerOpen(false)}
          onReflectMaterial={undefined}
          onGoToSummary={() => { setStudioRoomDesignerOpen(false); setStep(STEPS.length-1); }}
          photorealReq={{ product: 'kitchen', finish: undefined, getImage: () => null }}
          indicativeTotal={grandTotal}
          dimensions={{ lengthMm: dims.length, widthMm: dims.width, ceilingMm: dims.ceiling }}
          layoutParams={lp}
        />
      ) : null}
    </div>
  );
}

export { KITCHEN_CATALOG_ANCHORS, KitchenPlannerWizard };
