// Route chunk "WardrobePlannerWizard" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: WardrobePlannerWizard.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { validateForm } from '../forms/validate';
import { ModalPanel } from '../a11y/dialog';
import FormNotice from '../privacy/FormNotice';
import { api, fmt, toast, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { RoomDesigner, Wardrobe3D } from './shared_PlannerPage_TVUnitPlannerWizard_plus4';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';
import { trStep } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus3';

/* ════════════════════════════════════════════════════════════════════════════
   PROFESSIONAL WARDROBE PLANNER WIZARD  ·  data tables (BHD)
   Wired to route 'wardrobe-planner'. 10-step state machine, AI allocation
   engine, live 2D top-down plan + real 3D via the shared Wardrobe3D component,
   BOM + cost + sticky total, Save / Get quote / Download PDF.
   STANDARD DIMENSIONS (defaults / validation, mm):
     Wardrobe depth 600 · Hanging depth 600 · Shelf depth 350–450
     Drawer depth 450–500 · Shoe shelf depth 300–350
     Short hanging height 1000–1100 · Long hanging height 1600–1800
   All prices are the planner's transparent default tables; the real catalogue
   lives in website_products / design_materials and is confirmed on the visit.
   ──────────────────────────────────────────────────────────────────────── */
const WW_ROOM_TYPES = [
  { id:'master',   name:'Master bedroom', sub:'Primary suite wardrobe wall', ic:'M3 18v-6h18v6M3 12V8a2 2 0 012-2h6v6' },
  { id:'bedroom',  name:'Bedroom',        sub:'Standard fitted wardrobe',    ic:'M4 19v-5h16v5M4 14V9a2 2 0 012-2h5v7' },
  { id:'guest',    name:'Guest room',     sub:'Occasional-use storage',      ic:'M3 7h18v10H3z M7 7V5h10v2 M7 17v2 M17 17v2' },
  { id:'walkin',   name:'Walk-in room',   sub:'Dedicated walk-in closet',    ic:'M4 4h16v16H4z M12 4v16 M8 12h0 M16 12h0' },
  { id:'dressing', name:'Dressing room',  sub:'Island, vanity & seating',    ic:'M12 3a3 3 0 100 6 3 3 0 000-6z M5 21v-3a4 4 0 014-4h6a4 4 0 014 4v3' },
];

const WW_CONSTRAINT_TYPES = ['Door','Window','Column','Beam','AC unit','Electrical outlet'];

// Six layouts. `model3d` + `product3d` map to the shared Wardrobe3D builder
// (straight→single, L-Shape→l-shape, U-Shape/Walk-in→u-shape walkin, sliding/hinged→single).
const WW_LAYOUTS = [
  { id:'straight', name:'Straight',        sub:'One run along a single wall',        model3d:'single',  product3d:'',       img:'/layouts/wardrobe/wardrobe-straight.jpg' },
  { id:'l-shape',  name:'L-Shape',         sub:'Two runs meeting in a corner',       model3d:'l-shape', product3d:'',       img:'/layouts/wardrobe/wardrobe-l-shape.jpg' },
  { id:'u-shape',  name:'U-Shape walk-in', sub:'Three runs around three walls',      model3d:'u-shape', product3d:'walkin', img:'/layouts/wardrobe/wardrobe-u-shape.jpg' },
  { id:'walkin',   name:'Walk-in room',    sub:'Open dressing room with island',     model3d:'u-shape', product3d:'walkin', img:'/layouts/wardrobe/wardrobe-walkin.jpg' },
  { id:'sliding',  name:'Sliding',         sub:'Sliding-door fitted wardrobe',       model3d:'single',  product3d:'',       img:'/layouts/wardrobe/wardrobe-sliding.jpg' },
  { id:'hinged',   name:'Hinged',          sub:'Hinged-door fitted wardrobe',        model3d:'single',  product3d:'',       img:'/layouts/wardrobe/wardrobe-hinged.jpg' },
];

// Storage priorities — id, label, whether a count input applies + its noun.
const WW_PRIORITIES = [
  { id:'hanging',  name:'Hanging clothes', count:true,  noun:'dresses / shirts' },
  { id:'folded',   name:'Folded clothes',  count:false },
  { id:'shoes',    name:'Shoes',           count:true,  noun:'pairs' },
  { id:'bags',     name:'Bags',            count:true,  noun:'bags' },
  { id:'accessories', name:'Accessories',  count:false },
  { id:'watches',  name:'Watches',         count:true,  noun:'watches' },
  { id:'jewelry',  name:'Jewelry',         count:false },
  { id:'suitcases',name:'Suitcases',       count:true,  noun:'cases' },
];

// Internal module catalogue — id, label, price (BHD/unit), recommended depth (mm), zone for the 2D plan colour.
const WW_INTERNALS = [
  { id:'hang_short',  name:'Short hanging', sub:'1000–1100mm drop', price:45, depth:600, zone:'hanging', grp:'hanging' },
  { id:'hang_long',   name:'Long hanging',  sub:'1600–1800mm drop', price:55, depth:600, zone:'hanging', grp:'hanging' },
  { id:'hang_double', name:'Double hanging',sub:'Two rails stacked', price:70, depth:600, zone:'hanging', grp:'hanging' },
  { id:'shelf_adj',   name:'Adjustable shelves', sub:'350–450mm deep', price:18, depth:400, zone:'shelf', grp:'shelving' },
  { id:'shelf_fix',   name:'Fixed shelves', sub:'Structural, 400mm',  price:15, depth:400, zone:'shelf', grp:'shelving' },
  { id:'drawer_sm',   name:'Small drawers', sub:'450–500mm runners', price:38, depth:480, zone:'drawer', grp:'drawers' },
  { id:'drawer_deep', name:'Deep drawers',  sub:'Knitwear / folded',  price:46, depth:480, zone:'drawer', grp:'drawers' },
  { id:'drawer_jewel',name:'Jewelry drawer',sub:'Felt-lined tray',    price:60, depth:480, zone:'drawer', grp:'drawers' },
  { id:'shoe_rack',   name:'Shoe rack',     sub:'300–350mm angled',   price:34, depth:330, zone:'shoe', grp:'shoe' },
];

// Step-6 accessories — pull-outs & fittings (qty steppers).
const WW_ACCESSORIES = [
  { id:'mirror',   name:'Pull-out mirror', price:55,  unit:'unit' },
  { id:'trouser',  name:'Trouser rack',    price:48,  unit:'unit' },
  { id:'tie',      name:'Tie rack',        price:22,  unit:'unit' },
  { id:'belt',     name:'Belt rack',       price:22,  unit:'unit' },
  { id:'laundry',  name:'Laundry basket',  price:40,  unit:'unit' },
  { id:'shoecubby',name:'Shoe rack (pull-out)', price:36, unit:'unit' },
];

// Door selections — keyed by leaf mechanism. hex literals recolour the 3D / swatches.
const WW_SLIDING_DOORS = [
  { id:'sld_glass', name:'Glass',          mult:1.28, hex:'#bcd0d8', glass:true },
  { id:'sld_mirror',name:'Mirror',         mult:1.22, hex:'#cdd3d6', glass:true },
  { id:'sld_wood',  name:'Wood',           mult:1.10, hex:'#8a5a32', glass:false },
  { id:'sld_alu',   name:'Aluminium frame',mult:1.18, hex:'#9aa0a6', glass:false },
];

const WW_HINGED_DOORS = [
  { id:'hng_flat',  name:'Flat panel',     mult:1.00, hex:'#e9e5dd', glass:false },
  { id:'hng_shaker',name:'Shaker',         mult:1.14, hex:'#d8cdbd', glass:false },
  { id:'hng_groove',name:'Groove / fluted',mult:1.20, hex:'#c9b79c', glass:false },
  { id:'hng_glass', name:'Glass insert',   mult:1.26, hex:'#bcd0d8', glass:true },
];

const WW_SLIDING_COUNTS = [2,3,4];

const WW_HINGED_COUNTS = ['single','double'];

const WW_CARCASS = [
  { id:'mdf', name:'MDF',     mult:1.00, sub:'Moisture-resistant board' },
  { id:'ply', name:'Plywood', mult:1.18, sub:'Premium, screw-holding' },
  { id:'mfc', name:'MFC',     mult:0.92, sub:'Melamine-faced chipboard' },
];

const WW_FINISH = [
  { id:'melamine', name:'Melamine', mult:1.00, hex:'#e9e5dd' },
  { id:'laminate', name:'Laminate', mult:1.08, hex:'#d8cdbd' },
  { id:'acrylic',  name:'Acrylic',  mult:1.24, hex:'#27384f' },
  { id:'veneer',   name:'Veneer',   mult:1.32, hex:'#5a3a20' },
  { id:'lacquer',  name:'Lacquer',  mult:1.30, hex:'#f5f3ee' },
];

const WW_LIGHTING = [
  { id:'rail',   name:'Hanging rail lighting', price:95 },
  { id:'shelf',  name:'Shelf lighting',        price:90 },
  { id:'drawer', name:'Drawer lighting',       price:80 },
  { id:'motion', name:'Motion sensor lighting',price:60 },
  { id:'toekick',name:'Toe-kick lighting',     price:70 },
];

// Zone palette for the 2D plan (hex literals allowed inside SVG).
const WW_ZONE_HEX = { hanging:'#9a6a3c', shelf:'#c89b5e', drawer:'#8f9d7e', shoe:'#27384f', accessory:'#b08968' };

const WW_CATALOG_ANCHOR = { id:'wp-101', name:'Walk-In Wardrobe — Premium' };

/* ── AI ALLOCATION ENGINE ──
   From the user profile (users / gender / priorities + counts) compute a
   recommended internal split as percentages across five zones, then translate
   into seed quantities for the Step-6 internal configuration.
   Mirrors the spec example: couple + 40 shoes + 20 dresses + 15 suits + 10 bags
   → ~35% hanging / 25% shelves / 20% drawers / 15% shoe / 5% accessories. */
function wwAllocate(profile) {
  const { users, gender, priorities, counts } = profile;
  // base weights (relative) per zone, seeded by selected priorities + counts.
  const sel = (id) => priorities.includes(id);
  const n = (id) => Number(counts[id] || 0);
  let w = { hanging:0, shelf:0, drawer:0, shoe:0, accessory:0 };
  // Hanging: dresses/suits/shirts
  w.hanging += (sel('hanging') ? 30 : 8) + n('hanging') * 0.9;
  // Folded clothes → shelves
  w.shelf   += (sel('folded') ? 22 : 10);
  // Drawers: folded smalls, watches
  w.drawer  += (sel('folded') ? 8 : 4) + (sel('watches') ? 6 : 0) + n('watches') * 0.2;
  // Shoes
  w.shoe    += (sel('shoes') ? 14 : 4) + n('shoes') * 0.18;
  // Bags → shelves (open) + a little accessory
  w.shelf   += (sel('bags') ? 6 : 0) + n('bags') * 0.25;
  // Accessories / jewelry / watches → accessory zone
  w.accessory += (sel('accessories') ? 6 : 2) + (sel('jewelry') ? 5 : 0) + (sel('watches') ? 3 : 0);
  // Suitcases → top shelves
  w.shelf   += (sel('suitcases') ? 4 : 0) + n('suitcases') * 1.2;
  // Household scaling: more users → more hanging + drawers
  const uMult = users === 'family' ? 1.5 : users === '2' ? 1.2 : 1.0;
  w.hanging *= uMult; w.drawer *= uMult;
  // Gender nudges
  if (gender === 'female') { w.hanging *= 1.12; w.shoe *= 1.15; w.accessory *= 1.2; }
  if (gender === 'male')   { w.drawer *= 1.1; w.shelf *= 1.05; }
  // normalise → percentages
  const tot = Object.values(w).reduce((s,v)=>s+v,0) || 1;
  const pct = {}; Object.keys(w).forEach(k=>{ pct[k] = Math.round((w[k]/tot)*100); });
  // fix rounding so it sums to 100
  let diff = 100 - Object.values(pct).reduce((s,v)=>s+v,0);
  const order = ['hanging','shelf','drawer','shoe','accessory'];
  for (let i=0; diff!==0 && i<order.length; i++){ const k=order[i]; const adj=diff>0?1:-1; pct[k]+=adj; diff-=adj; }
  // seed module quantities from the percentages (scaled by household size)
  const scale = users === 'family' ? 1.5 : users === '2' ? 1.2 : 1.0;
  const seed = {
    hang_long:   Math.max(1, Math.round(pct.hanging / 14 * scale)),
    hang_short:  Math.max(0, Math.round(pct.hanging / 22 * scale)),
    hang_double: sel('hanging') && pct.hanging >= 30 ? 1 : 0,
    shelf_adj:   Math.max(1, Math.round(pct.shelf / 7 * scale)),
    shelf_fix:   Math.max(0, Math.round(pct.shelf / 16)),
    drawer_sm:   Math.max(1, Math.round(pct.drawer / 9 * scale)),
    drawer_deep: Math.max(0, Math.round(pct.drawer / 14 * scale)),
    drawer_jewel: sel('jewelry') ? 1 : 0,
    shoe_rack:   sel('shoes') ? Math.max(1, Math.round(pct.shoe / 7) + Math.round(n('shoes')/24)) : Math.max(0, Math.round(pct.shoe / 12)),
  };
  return { pct, seed };
}

/* ════════════════════════════════════════════════════════════════════════════
   PROFESSIONAL WARDROBE PLANNER WIZARD  ·  fit-to-viewport two-pane app shell
   Route 'wardrobe-planner'.  10 steps · AI allocation engine · live 2D plan +
   real 3D (shared Wardrobe3D) · BOM + cost + Save / Quote / PDF.
   ════════════════════════════════════════════════════════════════════════════ */
function WardrobePlannerWizard({ setPage, user, openAuth }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const { map: dbLayouts } = useLayouts('wardrobe');
  // DISPLAY-ONLY merge: pricing / model3d maps stay on WW_LAYOUTS.
  const wwLayoutsView = WW_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const [step, setStep] = useState(0);
  // Step 1 — room type
  const [rdOpen, setRdOpen] = useState(false);
  const [roomType, setRoomType] = useState('master');
  // Step 2 — room dimensions (mm)
  const [dims, setDims] = useState({ width:3600, length:3000, height:2700, depth:600 });
  // Step 3 — constraints (repeatable)
  const [cons, setCons] = useState([{ id:uid(), type:'Door', pos:300, width:900 }]);
  // Step 4 — layout + per-layout params
  const [layout, setLayout] = useState('straight');
  const [lp, setLp] = useState({
    wallWidth:3600, ceiling:2700, depth:600, doors:3,
    wallA:3200, wallB:2400, corner:'L-return',
    roomW:3600, roomL:3000, entrance:'centre', circulation:1000,
    sections:3, island:true, shoeDisplay:true, vanity:true, seating:true,
    slideCount:3, slideMirror:true,
    hingeCount:'double', hingeDrawers:true,
  });
  // Step 5 — user profile (drives AI allocation)
  const [users, setUsers] = useState('2');
  const [gender, setGender] = useState('mixed');
  const [priorities, setPriorities] = useState(['hanging','folded','shoes','accessories']);
  const [counts, setCounts] = useState({ hanging:20, shoes:40, bags:10, watches:0, suitcases:2 });
  // Step 6 — internal modules {key,id,qty} seeded from AI, + accessories qty map
  const [modules, setModules] = useState([]);
  const [acc, setAcc] = useState({});
  const [aiPct, setAiPct] = useState(null);
  const [seeded, setSeeded] = useState(false);
  // Step 7 — door selection (depends on layout)
  const [slidingDoor, setSlidingDoor] = useState('sld_mirror');
  const [hingedDoor, setHingedDoor] = useState('hng_flat');
  // Step 8 — materials
  const [mats, setMats] = useState({ carcass:'mdf', finish:'melamine' });
  // Step 9 — lighting toggles
  const [lighting, setLighting] = useState(['rail']);
  // preview / submit
  const [view3d, setView3d] = useState(false);
  const [showPrev, setShowPrev] = useState(!mobile);
  const [busy, setBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const room = WW_ROOM_TYPES.find(r=>r.id===roomType) || WW_ROOM_TYPES[0];
  const lay  = WW_LAYOUTS.find(l=>l.id===layout) || WW_LAYOUTS[0];
  const carc = WW_CARCASS.find(c=>c.id===mats.carcass) || WW_CARCASS[0];
  const fin  = WW_FINISH.find(f=>f.id===mats.finish) || WW_FINISH[0];
  const isSliding = layout==='sliding';
  const isHinged  = layout==='hinged';
  const sld  = WW_SLIDING_DOORS.find(d=>d.id===slidingDoor) || WW_SLIDING_DOORS[0];
  const hng  = WW_HINGED_DOORS.find(d=>d.id===hingedDoor) || WW_HINGED_DOORS[0];
  // active door spec drives finish hex + glass on the 3D where doors apply
  const activeDoor = isSliding ? sld : isHinged ? hng : null;
  const finishHex = activeDoor ? activeDoor.hex : fin.hex;
  const hasGlass = activeDoor ? !!activeDoor.glass : false;
  const findInt = (id) => WW_INTERNALS.find(m=>m.id===id);

  // ── AI allocation (recomputed from profile) ──
  const allocation = wwAllocate({ users, gender, priorities, counts });

  // Seed Step-6 modules from the AI allocation the first time the user reaches it
  // (or when they press "Re-run AI"). Keeps user edits afterwards.
  const seedFromAI = () => {
    const seed = allocation.seed;
    const mods = Object.keys(seed).filter(id=>seed[id]>0).map(id=>({ key:uid(), id, qty:seed[id] }));
    setModules(mods);
    setAiPct(allocation.pct);
    // seed a couple of accessories from priorities
    const a = {};
    if (priorities.includes('shoes')) a.shoecubby = 1;
    if (priorities.includes('accessories')) a.tie = 1;
    if (priorities.includes('jewelry')) a.belt = 1;
    setAcc(a);
    setSeeded(true);
  };

  // ── BOM + cost ──
  const matMult = carc.mult * fin.mult;
  const intBom = modules.filter(m=>m.qty>0).map(m=>{ const u=findInt(m.id); if(!u) return null;
    const unitPrice = Math.round(u.price * matMult);
    return { key:m.key, id:m.id, name:u.name, qty:m.qty, zone:u.zone, grp:u.grp, depth:u.depth, unitPrice, line:unitPrice*m.qty };
  }).filter(Boolean);
  const internalsTotal = intBom.reduce((s,b)=>s+b.line,0);
  // doors line (only for sliding / hinged layouts that carry visible doors)
  const doorCount = isSliding ? (lp.slideCount||3) : isHinged ? (lp.hingeCount==='double'?2:1) : 0;
  const DOOR_RATE = 120; // BHD per leaf, base
  const doorLine = activeDoor ? Math.round(DOOR_RATE * doorCount * activeDoor.mult * fin.mult) : 0;
  const accItems = WW_ACCESSORIES.filter(a=>(acc[a.id]||0)>0).map(a=>({ ...a, qty:acc[a.id], line:a.price*acc[a.id] }));
  const accTotal = accItems.reduce((s,a)=>s+a.line,0);
  const lightItems = WW_LIGHTING.filter(l=>lighting.includes(l.id));
  const lightTotal = lightItems.reduce((s,l)=>s+l.price,0);
  // carcass body cost — by wardrobe run width (m) × depth × a base rate
  const runMm = (() => {
    if (layout==='l-shape') return (lp.wallA||0)+(lp.wallB||0);
    if (layout==='u-shape'||layout==='walkin') return (lp.roomW||dims.width)*2 + (lp.roomL||dims.length);
    return lp.wallWidth || dims.width;
  })();
  const CARCASS_RATE = 240; // BHD per linear metre of carcass, base
  const carcassTotal = Math.round((runMm/1000) * CARCASS_RATE * carc.mult * fin.mult);
  const grandTotal = carcassTotal + internalsTotal + doorLine + accTotal + lightTotal;

  // ── steps meta ──
  const STEPS = ['Room type','Dimensions','Constraints','Layout','Profile','Internals','Doors','Materials','Lighting','Quote'];
  const next = () => {
    // auto-seed internals from AI when arriving at step 5 (Internals, index 5) the first time
    if (step===4 && !seeded) seedFromAI();
    setStep(s=>Math.min(STEPS.length-1, s+1));
  };
  const back = () => setStep(s=>Math.max(0, s-1));
  const canNext = (() => {
    if (step===1) return dims.width>=600 && dims.length>=600 && dims.height>=2000 && dims.depth>=400;
    return true;
  })();

  // ── styles (mirrors the kitchen / door wizards) ──
  const HEADER = mobile?72:104, BAR=52;
  const inS = { width:'100%', padding:'9px 11px', border:'1px solid var(--line)', background:'#fff', borderRadius:10, fontSize:14, fontFamily:'inherit', color:'var(--ink)', boxSizing:'border-box' };
  const card = (on) => ({ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'11px 13px', cursor:'pointer', fontFamily:'inherit' });
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
  const stepper = (val, set, min=0) => (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <button type="button" onClick={()=>set(Math.max(min,val-1))} style={{ width:26, height:26, borderRadius:7, border:'1px solid var(--line)', background:'#fff', cursor:'pointer' }}>−</button>
      <span style={{ minWidth:18, textAlign:'center', fontSize:13, fontWeight:600 }}>{val}</span>
      <button type="button" onClick={()=>set(val+1)} style={{ width:26, height:26, borderRadius:7, border:'1px solid var(--line)', background:'#fff', cursor:'pointer' }}>+</button>
    </div>
  );

  const updMod = (key, qty) => setModules(ms=>ms.map(m=>m.key===key?{...m,qty:Math.max(0,qty)}:m));
  const addMod = (id) => setModules(ms=>{ const ex=ms.find(m=>m.id===id); return ex ? ms.map(m=>m.id===id?{...m,qty:m.qty+1}:m) : [...ms,{ key:uid(), id, qty:1 }]; });
  const rmMod  = (key) => setModules(ms=>ms.filter(m=>m.key!==key));
  const togglePriority = (id) => setPriorities(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleLight = (id) => setLighting(l=>l.includes(id)?l.filter(x=>x!==id):[...l,id]);

  // ── 3D mapping for the shared Wardrobe3D component ──
  const view3dProduct = lay.product3d;       // '' (default wardrobe builder) or 'walkin'
  const view3dLayout  = lay.model3d;          // single | l-shape | u-shape
  const widthCm = Math.max(120, Math.round((lp.wallWidth || dims.width)/10));

  // ── 2D top-down plan (SVG, room-space mm → px) ──
  const planView = (h) => {
    const W = Math.max(800, layout==='l-shape'||layout==='u-shape'||layout==='walkin' ? (lp.roomW||dims.width) : dims.width);
    const L = Math.max(800, layout==='l-shape'||layout==='u-shape'||layout==='walkin' ? (lp.roomL||dims.length) : dims.length);
    const pad = 28, vw = 320, vh = 236;
    const sc = Math.min((vw-pad*2)/W, (vh-pad*2)/L);
    const ox = pad + ((vw-pad*2)-W*sc)/2, oy = pad + ((vh-pad*2)-L*sc)/2;
    const X = (mm)=>ox+mm*sc, Y = (mm)=>oy+mm*sc;
    const dep = (lp.depth||dims.depth||600)*sc;
    // wardrobe runs per layout (top wall = back)
    const runs = [];
    if (layout==='straight'||layout==='sliding'||layout==='hinged'){ runs.push([ox,oy,W*sc,dep]); }
    else if (layout==='l-shape'){ runs.push([ox,oy,W*sc,dep]); runs.push([ox,oy,dep,L*sc]); }
    else { runs.push([ox,oy,W*sc,dep]); runs.push([ox,oy,dep,L*sc]); runs.push([ox+W*sc-dep,oy,dep,L*sc]); }
    // internal zones — split the back run into coloured cells by module group share
    const zoneOrder = ['hanging','shelf','drawer','shoe','accessory'];
    const zoneShare = {};
    intBom.forEach(b=>{ zoneShare[b.zone]=(zoneShare[b.zone]||0)+b.qty; });
    if (accItems.length) zoneShare.accessory=(zoneShare.accessory||0)+accItems.reduce((s,a)=>s+a.qty,0);
    const zTot = zoneOrder.reduce((s,z)=>s+(zoneShare[z]||0),0) || 1;
    let cx = ox;
    const cells = zoneOrder.filter(z=>zoneShare[z]).map(z=>{ const cw=(zoneShare[z]/zTot)*(W*sc); const r=[cx,oy,cw,dep,WW_ZONE_HEX[z],z]; cx+=cw; return r; });
    const conColor = (t)=> t==='Door'?'#16a34a':t==='Window'?'#0ea5e9':t==='AC unit'?'#7c3aed':t==='Electrical outlet'?'#db2777':'#b45309';
    return (
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width:'100%', height:h, display:'block', background:'#fbf8f3' }} aria-label="Wardrobe 2D plan">
        {/* room walls */}
        <rect x={ox} y={oy} width={W*sc} height={L*sc} fill="#ffffff" stroke="#9a6a3c" strokeWidth="2.5" />
        {/* wardrobe runs */}
        {runs.map((r,i)=><rect key={'r'+i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill={finishHex} fillOpacity="0.5" stroke="#9a6a3c" strokeWidth="1" />)}
        {/* internal zone cells along the back run */}
        {cells.map((c,i)=>(<g key={'z'+i}><rect x={c[0]} y={c[1]} width={c[2]} height={c[3]} fill={c[4]} fillOpacity="0.8" stroke="#fff" strokeWidth="0.6" />{c[2]>16 && <text x={c[0]+c[2]/2} y={c[1]+c[3]/2+3} fontSize="7" fill="#fff" textAnchor="middle">{c[5][0].toUpperCase()}</text>}</g>))}
        {/* island for walk-in / dressing layouts */}
        {(layout==='walkin' && lp.island) && <rect x={X(W/2-700)} y={Y(L/2-450)} width={1400*sc} height={900*sc} fill={WW_ZONE_HEX.drawer} fillOpacity="0.45" stroke="#9a6a3c" strokeWidth="1" />}
        {/* constraints on the bottom wall */}
        {cons.map((o)=>{ const ow=Math.max(150,o.width||300)*sc; const cxp=X(Math.min(W-(o.width||300), o.pos||0)); const col=conColor(o.type);
          return <g key={o.id}><rect x={cxp} y={oy+L*sc-3} width={ow} height={6} fill={col} /><text x={cxp+ow/2} y={oy+L*sc+13} fontSize="8" fill={col} textAnchor="middle">{o.type[0]}</text></g>; })}
        {/* dimension labels */}
        <text x={ox+W*sc/2} y={oy-8} fontSize="9" fill="#9a6a3c" textAnchor="middle">{W} mm</text>
        <text x={ox-8} y={oy+L*sc/2} fontSize="9" fill="#9a6a3c" textAnchor="middle" transform={`rotate(-90 ${ox-8} ${oy+L*sc/2})`}>{L} mm</text>
      </svg>
    );
  };

  // ── save design ──
  const buildConfig = () => ({
    product:'wardrobe', plan_version:'wizard-v1',
    room_type:room.name, dimensions:dims,
    constraints:cons.map(c=>({ type:c.type, position_mm:c.pos, width_mm:c.width })),
    layout, layout_name:lay.name, layout_params:lp,
    profile:{ users, gender, priorities, counts },
    ai_allocation:{ percentages:allocation.pct, seeded_modules:allocation.seed },
    internals:intBom.map(b=>({ name:b.name, qty:b.qty, depth_mm:b.depth, line_bhd:b.line })),
    doors: activeDoor ? { mechanism:isSliding?'sliding':'hinged', style:activeDoor.name, count:doorCount, glass:hasGlass, line_bhd:doorLine } : null,
    materials:{ carcass:carc.name, finish:fin.name },
    accessories:accItems.map(a=>({ name:a.name, qty:a.qty, line_bhd:a.line })),
    lighting:lightItems.map(l=>l.name),
    run_metres:+(runMm/1000).toFixed(2),
    estimate_bhd:grandTotal,
  });
  const breakdownObj = () => ({ carcass:carcassTotal, internals:internalsTotal, doors:doorLine, accessories:accTotal, lighting:lightTotal });

  const saveDesign = async () => {
    setBusy(true);
    try {
      const token = uid();
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:WW_CATALOG_ANCHOR.id,
        customer_name:user?.name||null, customer_email:user?.email||null, customer_phone:user?.phone||null,
        product_name:`Wardrobe plan — ${lay.name} (${(runMm/1000).toFixed(1)}m)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdownObj(), status:'wardrobe-plan', share_token:token, created_at:new Date().toISOString() }] });
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
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:WW_CATALOG_ANCHOR.id,
        customer_name:c.name, customer_email:c.email||null, customer_phone:c.phone||null,
        product_name:`Wardrobe plan — ${lay.name} (${(runMm/1000).toFixed(1)}m)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdownObj(), status:'wardrobe-plan', share_token:token, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const pctStr = aiPct ? `${aiPct.hanging}% hang / ${aiPct.shelf}% shelf / ${aiPct.drawer}% drawer / ${aiPct.shoe}% shoe / ${aiPct.accessory}% acc` : '—';
      const note = [`🚪 Wardrobe Planner Wizard`, `Room: ${room.name}  ·  ${dims.width}×${dims.length}×${dims.height}mm`,
        `Layout: ${lay.name}  ·  Run ${(runMm/1000).toFixed(1)}m`,
        `Profile: ${users} user(s) · ${gender} · ${priorities.join(', ')||'—'}`,
        `AI allocation: ${pctStr}`,
        `Internals: ${intBom.length} module lines`,
        activeDoor ? `Doors: ${activeDoor.name} ×${doorCount}` : 'Doors: open / internal',
        `Materials: ${carc.name} carcass · ${fin.name} finish`,
        `Lighting: ${lightItems.map(l=>l.name).join(', ')||'none'}`,
        `Indicative estimate: BHD ${grandTotal}`, c.date?`Preferred visit: ${c.date}`:'', `Plan ref: ${token}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:c.name, email:c.email||null, phone:c.phone||null,
        source:'website_wardrobe_planner', status:'New', stage:'New', platform:'Website', interest:'Wardrobe (planner wizard)',
        budget:grandTotal, value:grandTotal, notes:note, created_at:new Date().toISOString() }] });
      toast(t('w4QuoteSentDesign'),'success');
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
    const pctStr = aiPct ? `${aiPct.hanging}% hanging · ${aiPct.shelf}% shelves · ${aiPct.drawer}% drawers · ${aiPct.shoe}% shoe · ${aiPct.accessory}% accessories` : '—';
    const rows = [
      `<tr><td>Carcass — ${carc.name} (${(runMm/1000).toFixed(1)}m run)</td><td style="text-align:right">${fmt(carcassTotal)}</td></tr>`,
      ...intBom.map(b=>`<tr><td>${b.name} ×${b.qty}</td><td style="text-align:right">${fmt(b.line)}</td></tr>`),
      ...(activeDoor?[`<tr><td>${activeDoor.name} doors ×${doorCount}</td><td style="text-align:right">${fmt(doorLine)}</td></tr>`]:[]),
      ...accItems.map(a=>`<tr><td>${a.name} ×${a.qty}</td><td style="text-align:right">${fmt(a.line)}</td></tr>`),
      ...lightItems.map(l=>`<tr><td>${l.name}</td><td style="text-align:right">${fmt(l.price)}</td></tr>`),
    ].join('');
    w.document.write(`<html><head><title>Wardrobe Quotation</title><style>body{font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;color:#2a1f16;padding:36px;max-width:720px;margin:0 auto}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:14px}td{padding:8px 4px;border-bottom:1px solid #e3d6c6;font-size:13px}.tot{font-size:20px;font-weight:700;color:var(--clay-deep, #89391E);text-align:right;margin-top:16px}.muted{color:#8a7a68;font-size:12px}.ai{background:#f6efe6;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:12px;color:#6b5440}</style></head><body>
      <h1>The Closets — Wardrobe Quotation</h1>
      <p class="muted">${room.name} · ${lay.name} layout · Room ${dims.width}×${dims.length}×${dims.height}mm · ${carc.name} carcass · ${fin.name} finish</p>
      <div class="ai"><b>AI storage allocation:</b> ${pctStr}</div>
      <table><tbody>${rows}</tbody></table>
      <div class="tot">Estimated total: ${fmt(grandTotal)}</div>
      <p class="muted" style="margin-top:24px">Indicative guide price. A free design visit confirms exact measurements and a fully itemised quote.</p>
      </body></html>`);
    w.document.close();
    setTimeout(()=>{ try{ w.print(); }catch(e){} }, 350);
  };

  // ── PREVIEW pane (2D / 3D toggle) ──
  const previewPane = (h3d, h2d) => (
    <div style={{ display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
      <div style={{ display:'flex', gap:6 }}>
        <button type="button" onClick={()=>setView3d(false)} style={{ flex:1, padding:'6px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background:!view3d?'var(--clay)':'var(--sand)', color:!view3d?'#fff':'var(--ink-soft)' }}>{t('p2dPlan')}</button>
        <button type="button" onClick={()=>setView3d(true)} style={{ flex:1, padding:'6px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background:view3d?'var(--clay)':'var(--sand)', color:view3d?'#fff':'var(--ink-soft)' }}>{t('p3dView')}</button>
      </div>
      <div style={{ background:'var(--sand)', borderRadius:12, overflow:'hidden', flex:1, minHeight:0 }}>
        {view3d
          ? <div style={{ height:'100%', minHeight:h3d }}><Wardrobe3D product={view3dProduct||undefined} layout={view3dLayout} finishHex={finishHex} glass={hasGlass} handles={isHinged} led={lighting.length>0} widthCm={widthCm} heightCm={dims.height/10} depthCm={(lp.depth||dims.depth)/10} mobile={mobile} preset="iso" /></div>
          : planView(h2d)}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{lay.name} · {(runMm/1000).toFixed(1)}m run</span>
        <span className="display" style={{ fontSize:20, color:'var(--clay)' }}>{fmt(grandTotal)}</span>
      </div>
    </div>
  );

  // ── STEP CONTENT ──
  const stepContent = () => {
    switch(step) {
      case 0: return (<>{sectionH('1',t('shW0t'),t('shW0s'))}
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:10 }}>
          {WW_ROOM_TYPES.map(r=>{ const on=roomType===r.id; return (
            <button key={r.id} type="button" onClick={()=>setRoomType(r.id)} style={card(on)}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5"><path d={r.ic} /></svg>
              <div style={{ fontSize:14, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', marginTop:6 }}>{trOpt(r.name, lang)}</div>
              <div style={{ fontSize:11.5, color:'var(--muted)' }}>{trOpt(r.sub, lang)}</div>
            </button>); })}
        </div></>);
      case 1: return (<>{sectionH('2',t('shW1t'),t('shW1s'))}
        <div style={{ display:'grid', gap:12 }}>
          {numField(t('fRoomWidth'), dims.width, v=>setDims(d=>({...d,width:v})), 600, 12000)}
          {numField(t('fRoomLength'), dims.length, v=>setDims(d=>({...d,length:v})), 600, 12000)}
          {numField(t('fCeilingHeight'), dims.height, v=>setDims(d=>({...d,height:v})), 2000, 4000)}
          {numField(t('fWardrobeDepth'), dims.depth, v=>setDims(d=>({...d,depth:v})), 400, 900)}
          {(dims.depth<500||dims.depth>700) && <div style={{ fontSize:12, color:'var(--muted)' }}>Recommended depth 550–650mm (hanging needs 600mm).</div>}
          {(dims.width<600||dims.length<600||dims.height<2000||dims.depth<400) && <div style={{ fontSize:12, color:'var(--danger,#b91c1c)' }}>Width & length need ≥600mm, ceiling ≥2000mm, depth ≥400mm.</div>}
        </div></>);
      case 2: return (<>{sectionH('3',t('shW2t'),t('shW2s'))}
        <div style={{ display:'grid', gap:9 }}>
          {cons.map((o)=>(
            <div key={o.id} style={{ border:'1px solid var(--line)', borderRadius:11, padding:'9px 10px', background:'#fff' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr auto', gap:7, alignItems:'end' }}>
                <label><span style={labelS}>{t('fType')}</span>
                  <select value={o.type} onChange={e=>setCons(cs=>cs.map(x=>x.id===o.id?{...x,type:e.target.value}:x))} style={inS}>{WW_CONSTRAINT_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
                <label><span style={labelS}>{t('fPosition')}</span><input type="number" value={o.pos} onChange={e=>setCons(cs=>cs.map(x=>x.id===o.id?{...x,pos:Number(e.target.value)}:x))} style={inS} /></label>
                <label><span style={labelS}>{t('fWidth')}</span><input type="number" value={o.width} onChange={e=>setCons(cs=>cs.map(x=>x.id===o.id?{...x,width:Number(e.target.value)}:x))} style={inS} /></label>
                <button type="button" onClick={()=>setCons(cs=>cs.filter(x=>x.id!==o.id))} style={{ background:'none', border:'1px solid var(--line)', borderRadius:9, padding:'9px 11px', cursor:'pointer', color:'var(--muted)' }}>✕</button>
              </div>
            </div>))}
          <button type="button" onClick={()=>setCons(cs=>[...cs,{ id:uid(), type:'Window', pos:1500, width:1000 }])} style={{ border:'1px dashed var(--line)', borderRadius:11, padding:'10px', background:'var(--sand)', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--clay-deep)' }}>{t('vAddConstraint')}</button>
        </div></>);
      case 3: return (<>{sectionH('4',t('shW3t'),t('shW3s'))}
        <button type="button" onClick={()=>setRdOpen(true)} className="btn-clay" style={{ borderRadius:12, marginBottom:16, display:'inline-flex', alignItems:'center', gap:8 }}>{t('pOpenRoomDesigner')}</button>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?14:18, marginBottom:18 }}>
          {wwLayoutsView.map(l=>{ const on=layout===l.id; return (
            <button key={l.id} type="button" onClick={()=>setLayout(l.id)} style={{ ...card(on), padding:0, overflow:'hidden', textAlign:'left', borderRadius:16, boxShadow: on?'0 12px 32px rgba(194,65,28,.18)':'0 2px 14px rgba(33,28,24,.07)', transform: on?'translateY(-2px)':'none', transition:'transform .18s ease, box-shadow .18s ease' }}>
              <div style={{ position:'relative', width:'100%', aspectRatio:'1017 / 602', background:'var(--cream,#f5f1ea)', overflow:'hidden' }}>
                <img src={l.img} alt={l.name} loading="lazy" style={{ display:'block', width:'100%', height:'100%', objectFit:'cover' }} />
                {on && <div style={{ position:'absolute', top:10, right:10, background:'var(--clay)', color:'#fff', fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:999, letterSpacing:.3, boxShadow:'0 2px 8px rgba(0,0,0,.18)' }}>✓ Selected</div>}
              </div>
              <div style={{ padding: mobile?'13px 15px':'15px 17px', borderTop:'1px solid var(--line)' }}>
                <div style={{ fontSize: mobile?16:17, fontWeight:700, color:on?'var(--clay-deep)':'var(--ink)', lineHeight:1.22 }}>{trOpt(l.name, lang)}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{trOpt(l.sub, lang)}</div>
              </div>
            </button>); })}
        </div>
        <div style={{ background:'var(--sand)', borderRadius:12, padding:'13px 14px' }}>
          <div className="eyebrow" style={{ fontSize:11, marginBottom:10 }}>{lang==='ar'?`${t('gParameters')} ${lay.name}`:`${lay.name} ${t('gParameters')}`}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            {layout==='straight' && <>{numField('Wall width', lp.wallWidth, v=>setLp(p=>({...p,wallWidth:v})), 600, 12000)}{numField('Ceiling height', lp.ceiling, v=>setLp(p=>({...p,ceiling:v})), 2000, 4000)}{numField('Depth', lp.depth, v=>setLp(p=>({...p,depth:v})), 400, 900)}{numField('Number of doors', lp.doors, v=>setLp(p=>({...p,doors:v})), 1, 8, 'doors')}</>}
            {layout==='l-shape' && <>{numField('Wall A length', lp.wallA, v=>setLp(p=>({...p,wallA:v})), 600, 9000)}{numField('Wall B length', lp.wallB, v=>setLp(p=>({...p,wallB:v})), 600, 9000)}<label style={{ gridColumn:'1/-1' }}><span style={labelS}>Corner solution</span><select value={lp.corner} onChange={e=>setLp(p=>({...p,corner:e.target.value}))} style={inS}>{['L-return','Diagonal corner','Rotating carousel','Blind corner pull-out'].map(o=><option key={o}>{o}</option>)}</select></label></>}
            {(layout==='u-shape') && <>{numField('Room width', lp.roomW, v=>setLp(p=>({...p,roomW:v})), 1000, 9000)}{numField('Room length', lp.roomL, v=>setLp(p=>({...p,roomL:v})), 1000, 9000)}<label><span style={labelS}>Entrance location</span><select value={lp.entrance} onChange={e=>setLp(p=>({...p,entrance:e.target.value}))} style={inS}>{['centre','left','right'].map(o=><option key={o}>{o}</option>)}</select></label>{numField('Circulation space', lp.circulation, v=>setLp(p=>({...p,circulation:v})), 700, 2000)}{lp.circulation<900 && <div style={{ gridColumn:'1/-1', fontSize:12, color:'var(--danger,#b91c1c)' }}>{t('vCircTight')}</div>}</>}
            {layout==='walkin' && <>{numField('Room width', lp.roomW, v=>setLp(p=>({...p,roomW:v})), 1500, 9000)}{numField('Room length', lp.roomL, v=>setLp(p=>({...p,roomL:v})), 1500, 9000)}
              <div style={{ gridColumn:'1/-1', display:'grid', gap:7 }}>
                {[['sections','Hanging sections',true],['island','Island dresser'],['shoeDisplay','Shoe display'],['vanity','Vanity'],['seating','Seating']].map(([k,lbl,isNum])=> isNum
                  ? <label key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><span style={{ fontSize:13, color:'var(--ink)' }}>{lbl}</span>{stepper(lp.sections, v=>setLp(p=>({...p,sections:v})), 1)}</label>
                  : <label key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', border:'1px solid var(--line)', borderRadius:9, padding:'8px 11px', cursor:'pointer' }}><span style={{ fontSize:13, color:'var(--ink)' }}>{lbl}</span><input type="checkbox" checked={!!lp[k]} onChange={e=>setLp(p=>({...p,[k]:e.target.checked}))} /></label>)}
              </div></>}
            {layout==='sliding' && <>{numField('Wall width', lp.wallWidth, v=>setLp(p=>({...p,wallWidth:v})), 1200, 12000)}<label><span style={labelS}>Number of doors</span><select value={lp.slideCount} onChange={e=>setLp(p=>({...p,slideCount:Number(e.target.value)}))} style={inS}>{WW_SLIDING_COUNTS.map(n=><option key={n} value={n}>{n} doors</option>)}</select></label><label style={{ gridColumn:'1/-1', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', border:'1px solid var(--line)', borderRadius:9, padding:'8px 11px' }}><span style={{ fontSize:13, color:'var(--ink)' }}>Mirror / glass panel</span><input type="checkbox" checked={!!lp.slideMirror} onChange={e=>setLp(p=>({...p,slideMirror:e.target.checked}))} /></label></>}
            {layout==='hinged' && <>{numField('Wall width', lp.wallWidth, v=>setLp(p=>({...p,wallWidth:v})), 600, 12000)}<label><span style={labelS}>Door style</span><select value={lp.hingeCount} onChange={e=>setLp(p=>({...p,hingeCount:e.target.value}))} style={inS}>{WW_HINGED_COUNTS.map(n=><option key={n} value={n}>{n} door</option>)}</select></label><label style={{ gridColumn:'1/-1', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', border:'1px solid var(--line)', borderRadius:9, padding:'8px 11px' }}><span style={{ fontSize:13, color:'var(--ink)' }}>Integrated drawers</span><input type="checkbox" checked={!!lp.hingeDrawers} onChange={e=>setLp(p=>({...p,hingeDrawers:e.target.checked}))} /></label></>}
          </div>
        </div></>);
      case 4: return (<>{sectionH('5',t('shW4t'),t('shW4s'))}
        <div style={{ display:'grid', gap:14 }}>
          <div>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Number of users</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[['1','1 person'],['2','Couple'],['family','Family']].map(([id,lbl])=>{ const on=users===id; return (
                <button key={id} type="button" onClick={()=>setUsers(id)} style={card(on)}><div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{lbl}</div></button>); })}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Gender</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[['male','Male'],['female','Female'],['mixed','Mixed']].map(([id,lbl])=>{ const on=gender===id; return (
                <button key={id} type="button" onClick={()=>setGender(id)} style={card(on)}><div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{lbl}</div></button>); })}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Storage priorities <span style={{ color:'var(--muted)', fontWeight:400 }}>(tap to select, set counts where useful)</span></div>
            <div style={{ display:'grid', gap:8 }}>
              {WW_PRIORITIES.map(p=>{ const on=priorities.includes(p.id); return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:9, border: on?'2px solid var(--clay)':'1px solid var(--line)', background:on?'var(--sand)':'#fff', borderRadius:11, padding:'8px 11px' }}>
                  <button type="button" onClick={()=>togglePriority(p.id)} style={{ flex:1, textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{on?'✓ ':''}{p.name}</button>
                  {on && p.count && <div style={{ display:'flex', alignItems:'center', gap:6 }}><input type="number" value={counts[p.id]||0} onChange={e=>setCounts(c=>({...c,[p.id]:Number(e.target.value)}))} style={{ ...inS, width:64, padding:'6px 8px' }} /><span style={{ fontSize:11, color:'var(--muted)' }}>{p.noun}</span></div>}
                </div>); })}
            </div>
          </div>
          <div style={{ background:'var(--sand)', borderRadius:12, padding:'13px 14px' }}>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>AI recommended allocation</div>
            <div style={{ display:'flex', height:18, borderRadius:6, overflow:'hidden', marginBottom:8 }}>
              {[['hanging',allocation.pct.hanging],['shelf',allocation.pct.shelf],['drawer',allocation.pct.drawer],['shoe',allocation.pct.shoe],['accessory',allocation.pct.accessory]].map(([z,v])=> v>0 && <div key={z} title={`${z} ${v}%`} style={{ width:v+'%', background:WW_ZONE_HEX[z] }} />)}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 12px', fontSize:11.5, color:'var(--ink-soft)' }}>
              {[['Hanging',allocation.pct.hanging,'hanging'],['Shelves',allocation.pct.shelf,'shelf'],['Drawers',allocation.pct.drawer,'drawer'],['Shoe',allocation.pct.shoe,'shoe'],['Accessories',allocation.pct.accessory,'accessory']].map(([lbl,v,z])=>(
                <span key={z}><span style={{ display:'inline-block', width:9, height:9, borderRadius:2, background:WW_ZONE_HEX[z], marginRight:4 }} />{lbl} {v}%</span>))}
            </div>
            <p style={{ fontSize:11.5, color:'var(--muted)', margin:'8px 0 0' }}>We'll seed your internal configuration from this — you can fine-tune it next.</p>
          </div>
        </div></>);
      case 5: return (<>{sectionH('6',t('shW5t'),t('shW5s'))}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          {aiPct && <span style={{ fontSize:11.5, color:'var(--ink-soft)' }}>Seeded: {aiPct.hanging}% hang · {aiPct.shelf}% shelf · {aiPct.drawer}% drawer · {aiPct.shoe}% shoe</span>}
          <button type="button" onClick={seedFromAI} style={{ border:'1px solid var(--line)', borderRadius:9, padding:'6px 10px', background:'#fff', cursor:'pointer', fontSize:11.5, fontWeight:600, color:'var(--clay-deep)' }}>↻ Re-run AI</button>
        </div>
        <div style={{ display:'grid', gap:8, marginBottom:14 }}>
          {modules.filter(m=>m.qty>0).map(m=>{ const u=findInt(m.id); if(!u) return null; return (
            <div key={m.key} style={{ display:'flex', alignItems:'center', gap:9, background:'#fff', border:'1px solid var(--line)', borderRadius:10, padding:'8px 10px' }}>
              <span style={{ width:10, height:10, borderRadius:2, background:WW_ZONE_HEX[u.zone] }} />
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{u.name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{u.sub} · {u.depth}mm · {fmt(Math.round(u.price*matMult))}/unit</div></div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button type="button" onClick={()=>updMod(m.key,m.qty-1)} style={{ width:26, height:26, borderRadius:7, border:'1px solid var(--line)', background:'#fff', cursor:'pointer' }}>−</button>
                <span style={{ minWidth:18, textAlign:'center', fontSize:13, fontWeight:600 }}>{m.qty}</span>
                <button type="button" onClick={()=>updMod(m.key,m.qty+1)} style={{ width:26, height:26, borderRadius:7, border:'1px solid var(--line)', background:'#fff', cursor:'pointer' }}>+</button>
                <button type="button" onClick={()=>rmMod(m.key)} style={{ marginLeft:4, background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}>✕</button>
              </div>
            </div>); })}
        </div>
        {[['Hanging',['hang_short','hang_long','hang_double']],['Shelving',['shelf_adj','shelf_fix']],['Drawers',['drawer_sm','drawer_deep','drawer_jewel']],['Shoe',['shoe_rack']]].map(([title,ids])=>(
          <div key={title} style={{ marginBottom:12 }}>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:7 }}>{title}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {ids.map(id=>{ const u=findInt(id); return (<button key={id} type="button" onClick={()=>addMod(id)} style={{ border:'1px solid var(--line)', borderRadius:9, padding:'7px 10px', background:'#fff', cursor:'pointer', fontSize:12, color:'var(--ink-soft)' }}>+ {u.name}</button>); })}
            </div>
          </div>))}
        <div className="eyebrow" style={{ fontSize:11, marginBottom:7, marginTop:4 }}>Accessories</div>
        <div style={{ display:'grid', gap:8 }}>
          {WW_ACCESSORIES.map(a=>{ const q=acc[a.id]||0; const on=q>0; return (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:9, border: on?'2px solid var(--clay)':'1px solid var(--line)', background:on?'var(--sand)':'#fff', borderRadius:11, padding:'8px 11px' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{a.name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{fmt(a.price)} / {a.unit}</div></div>
              {stepper(q, v=>setAcc(s=>({...s,[a.id]:v})))}
            </div>); })}
        </div></>);
      case 6: return (<>{sectionH('7',t('shW6t'), activeDoor ? (lang==='ar'?`أبواب ${isSliding?'منزلقة':'مفصلية'} لخزانة ${lay.name}.`:`${isSliding?'Sliding':'Hinged'} doors for your ${lay.name} wardrobe.`) : t('shW6sOpen'))}
        {!activeDoor && <div style={{ background:'var(--sand)', borderRadius:12, padding:'14px 16px', fontSize:13, color:'var(--ink-soft)' }}>The {lay.name} layout is open-fronted. Skip ahead — your hanging, shelving and drawer modules stay on show. Switch to a Sliding or Hinged layout in step 4 if you'd like doors.</div>}
        {isSliding && <><div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Sliding doors · {lp.slideCount} leaves</div>
          <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:9 }}>
            {WW_SLIDING_DOORS.map(d=>{ const on=slidingDoor===d.id; return (
              <button key={d.id} type="button" onClick={()=>setSlidingDoor(d.id)} style={card(on)}>
                <div style={{ height:30, borderRadius:7, background:d.hex, marginBottom:6 }} />
                <div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(d.name, lang)}</div>
                <div style={{ fontSize:10.5, color:'var(--muted)' }}>×{d.mult.toFixed(2)}</div>
              </button>); })}
          </div></>}
        {isHinged && <><div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Hinged doors · {lp.hingeCount}</div>
          <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:9 }}>
            {WW_HINGED_DOORS.map(d=>{ const on=hingedDoor===d.id; return (
              <button key={d.id} type="button" onClick={()=>setHingedDoor(d.id)} style={card(on)}>
                <div style={{ height:30, borderRadius:7, background:d.hex, marginBottom:6 }} />
                <div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(d.name, lang)}</div>
                <div style={{ fontSize:10.5, color:'var(--muted)' }}>×{d.mult.toFixed(2)}</div>
              </button>); })}
          </div></>}</>);
      case 7: return (<>{sectionH('8',t('shW7t'),t('shW7s'))}
        {[[t('gCarcass'),'carcass',WW_CARCASS],[t('gFinish'),'finish',WW_FINISH]].map(([title,key,list])=>(
          <div key={key} style={{ marginBottom:14 }}>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{title}</div>
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:8 }}>
              {list.map(o=>{ const on=mats[key]===o.id; return (
                <button key={o.id} type="button" onClick={()=>setMats(m=>({...m,[key]:o.id}))} style={card(on)}>
                  {o.hex && <div style={{ height:30, borderRadius:7, background:o.hex, marginBottom:6 }} />}
                  <div style={{ fontSize:13, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(o.name, lang)}</div>
                  <div style={{ fontSize:10.5, color:'var(--muted)' }}>{o.sub||('×'+o.mult.toFixed(2))}</div>
                </button>); })}
            </div>
          </div>))}</>);
      case 8: return (<>{sectionH('9',t('shW8t'),t('shW8s'))}
        <div style={{ display:'grid', gap:9 }}>
          {WW_LIGHTING.map(l=>{ const on=lighting.includes(l.id); return (
            <button key={l.id} type="button" onClick={()=>toggleLight(l.id)} style={{ ...card(on), display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{on?'✓ ':''}{trOpt(l.name, lang)}</span>
              <span style={{ fontSize:12.5, fontWeight:700, color:'var(--clay)' }}>{fmt(l.price)}</span>
            </button>); })}
        </div></>);
      case 9: return (<>{sectionH('10',t('shSummaryT'),t('shW9s'))}
        {aiPct && <div style={{ background:'var(--sand)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
          <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>AI storage allocation</div>
          <div style={{ display:'flex', height:16, borderRadius:6, overflow:'hidden', marginBottom:8 }}>
            {[['hanging',aiPct.hanging],['shelf',aiPct.shelf],['drawer',aiPct.drawer],['shoe',aiPct.shoe],['accessory',aiPct.accessory]].map(([z,v])=> v>0 && <div key={z} style={{ width:v+'%', background:WW_ZONE_HEX[z] }} />)}
          </div>
          <div style={{ fontSize:11.5, color:'var(--ink-soft)' }}>{aiPct.hanging}% hanging · {aiPct.shelf}% shelves · {aiPct.drawer}% drawers · {aiPct.shoe}% shoe · {aiPct.accessory}% accessories</div>
        </div>}
        <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'8px 12px', background:'var(--sand)', fontSize:11.5, fontWeight:700, color:'var(--ink-soft)' }}>{t('pBillOfMaterials')}</div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>Carcass · {carc.name} ({(runMm/1000).toFixed(1)}m)</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(carcassTotal)}</span></div>
          {intBom.map(b=>(<div key={b.key} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{b.name} ×{b.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(b.line)}</span></div>))}
          {activeDoor && <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{activeDoor.name} doors ×{doorCount}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(doorLine)}</span></div>}
          {accItems.map(a=>(<div key={a.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{a.name} ×{a.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(a.line)}</span></div>))}
          {lightItems.map(l=>(<div key={l.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{l.name}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(l.price)}</span></div>))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderTop:'2px solid var(--line)', background:'var(--sand)' }}><span style={{ fontWeight:700, color:'var(--ink)' }}>{t('pEstimatedTotal')}</span><span className="display" style={{ fontSize:19, color:'var(--clay-deep)' }}>{fmt(grandTotal)}</span></div>
        </div>
        <div style={{ background:'rgba(154,106,60,.08)', borderRadius:10, padding:'9px 12px', fontSize:12, color:'var(--ink-soft)', marginBottom:12 }}>
          <b>Work guidance:</b> hanging needs 600mm depth; long hanging drops 1600–1800mm, short 1000–1100mm; shelves 350–450mm; drawers 450–500mm; shoe shelves 300–350mm. We confirm exact internals on the free design visit.
        </div>
        <div style={{ display:'grid', gap:8 }}>
          <button type="button" disabled={busy} onClick={saveDesign} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:11, padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pSaveDesign')}</button>
          <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:11 }}>{user?t('pGetQuoteArrow'):t('pSignInQuoteArrow')}</button>
          <button type="button" onClick={downloadPDF} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:11, padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pDownloadPdf')}</button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
            {['2D manufacturing drawings','3D manufacturing drawings','Assembly drawings','Installation drawings','Material list export','Hardware list export','CNC cut list'].map((t)=>(
              <button key={t} type="button" disabled title="Coming soon" style={{ border:'1px dashed var(--line)', background:'var(--sand)', borderRadius:10, padding:'9px', fontSize:11.5, color:'var(--muted)', cursor:'not-allowed' }}>{t} · soon</button>))}
          </div>
        </div></>);
      default: return null;
    }
  };

  // ── APP SHELL (fit-to-viewport, mirrors the kitchen / door wizards) ──
  return (
    <div style={{ height: mobile?'100dvh':`calc(100dvh - ${HEADER}px)`, marginTop: HEADER, display:'flex', flexDirection:'column', background:'var(--cream)', overflow:'hidden' }}>
      {/* step bar */}
      <div style={{ height:BAR, flexShrink:0, display:'flex', alignItems:'center', gap:4, overflowX:'auto', padding:'0 12px', borderBottom:'1px solid var(--line)', background:'#fff' }}>
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
            <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:18, padding:14, boxShadow:'var(--shadow)', flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
              {previewPane(280, '100%')}
            </div>
          </div>
        )}
        {/* mobile collapsible preview */}
        {mobile && showPrev && (
          <div style={{ flexShrink:0, padding:'10px 14px', borderTop:'1px solid var(--line)', background:'#fff' }}>
            <div style={{ height:200 }}>{previewPane(190,190)}</div>
          </div>
        )}
      </div>

      {/* bottom action bar */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'9px 14px calc(9px + env(safe-area-inset-bottom))', borderTop:'1px solid var(--line)', background:'rgba(255,255,255,.97)', backdropFilter:'blur(10px)' }}>
        {step>0 ? <button type="button" onClick={back} style={{ background:'none', border:'1px solid var(--line)', borderRadius:11, padding:'10px 16px', fontSize:13.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pBack')}</button>
          : <button type="button" onClick={()=>setPage('wardrobes')} style={{ background:'none', border:'1px solid var(--line)', borderRadius:11, padding:'10px 16px', fontSize:13, color:'var(--muted)', cursor:'pointer' }}>{t('pExit')}</button>}
        {mobile && <button type="button" onClick={()=>setShowPrev(v=>!v)} style={{ background:'var(--sand)', border:'none', borderRadius:11, padding:'10px 12px', fontSize:12.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{showPrev?t('pHide'):t('pPreview')}</button>}
        <div style={{ flex:1, textAlign: mobile?'center':'right', minWidth:0 }}><span style={{ fontSize:10.5, color:'var(--muted)' }}>{t('pTotal')} </span><span className="display" style={{ fontSize:17, color:'var(--clay)' }}>{fmt(grandTotal)}</span></div>
        {step<STEPS.length-1
          ? <button type="button" className="btn-clay" disabled={!canNext} onClick={next} style={{ borderRadius:11, minWidth:120, opacity:canNext?1:.55 }}>{t('pNextArrow')}</button>
          : <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:11, minWidth:120 }}>{t('pGetQuoteArrow')}</button>}
      </div>

      {rdOpen && (
        <RoomDesigner
          mobile={mobile}
          category="wardrobe"
          sceneShapeFallback={layout}
          dimensions={{ widthMm: runMm, heightMm: (lp.ceiling || dims.height), depthMm: (lp.depth || dims.depth) }}
          layoutParams={lp}
          onClose={()=>setRdOpen(false)}
          onGoToSummary={()=>setRdOpen(false)}
          photorealReq={{ product:'wardrobe', getImage:()=>null }}
          indicativeTotal={null}
        />
      )}
      {/* QUOTE modal */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowQuote(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:420, width:'100%', padding:24 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 6px' }}>{t('pQuoteTitleWardrobe')}</h3>
            <div style={{ background:'var(--sand)', borderRadius:12, padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)' }}>{room.name} · {lay.name} · {fin.name} · <b style={{ color:'var(--clay-deep)' }}>{fmt(grandTotal)}</b></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))} placeholder={t('pYourName')} style={inS} />
              <input value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} placeholder="Phone (+973…)" inputMode="tel" style={inS} />
              <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} placeholder="Email (optional)" inputMode="email" style={inS} />
              <input type="date" value={contact.date} onChange={e=>setContact(c=>({...c,date:e.target.value}))} style={inS} />
            </div>
            <FormNotice kind="request" style={{ marginTop:12 }} />
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button type="button" onClick={()=>setShowQuote(false)} disabled={busy} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pCancel')}</button>
              <button type="button" className="btn-clay" disabled={busy||!contact.name.trim()||!contact.phone.trim()} onClick={()=>submitQuote(contact)} style={{ flex:2, borderRadius:12, opacity:(busy||!contact.name.trim()||!contact.phone.trim())?.6:1 }}>{busy?t('pSending'):(user?t('pSendQuoteReq'):t('pSignInSend'))}</button>
            </div>
          </ModalPanel>
        </div>
      )}
    </div>
  );
}

export { WardrobePlannerWizard };
