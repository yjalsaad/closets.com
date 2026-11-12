// Route chunk "TVUnitPlannerWizard" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: TVUnitPlannerWizard.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { validateForm } from '../forms/validate';
import { ModalPanel } from '../a11y/dialog';
import FormNotice from '../privacy/FormNotice';
import { api, fmt, toast, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { TV_FINISH, TV_LAYOUTS, TV_STORAGE } from './shared_TVUnitPlannerWizard_TVUnitPage';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';
import { trStep } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus3';
import { RoomDesigner } from './shared_PlannerPage_TVUnitPlannerWizard_plus4';
import { layoutImgSize } from '../layoutDims';

/* ── TV UNIT PLANNER WIZARD · data tables (BHD) ──
   Wired to route 'tv-planner'. Pure 2D elevation + live BOM + cost + quote.
   Recommended dims: TV centre 1000–1100mm; floating unit height 250–400mm;
   floating/tall depth 350–450mm; shelf depth 250–300mm; TV wall clearance 50–100mm. */
const TV_ROOM_TYPES = [
  { id:'living',  name:'Living room', sub:'Main lounge media wall', ic:'M3 11l9-7 9 7M5 10v10h14V10' },
  { id:'majlis',  name:'Majlis',      sub:'Formal seating room',    ic:'M3 17v-5a2 2 0 012-2h14a2 2 0 012 2v5M3 17h18M6 17v2M18 17v2' },
  { id:'bedroom', name:'Bedroom',     sub:'TV facing the bed',      ic:'M3 18v-6h18v6M3 12V8a2 2 0 012-2h6v6' },
  { id:'family',  name:'Family room', sub:'Casual everyday space',  ic:'M12 7a2 2 0 100-4 2 2 0 000 4zM6 21v-6a4 4 0 018 0v6M16 13h4v8' },
  { id:'office',  name:'Office',      sub:'Display + work storage',  ic:'M4 7h16v12H4zM4 11h16M9 7V5h6v2' },
];

const TV_OPENING_TYPES = ['Door','Window','Column','AC unit','Electrical outlet'];

// Modular blocks — id, label, base price BHD, the layouts they belong to.
const TV_BLOCKS = [
  { id:'panel',   name:'TV Panel',              price:240 },
  { id:'floatcab',name:'Floating Cabinet',      price:180 },
  { id:'tallcab', name:'Tall Cabinet',          price:260 },
  { id:'openshelf',name:'Open Shelf',           price:55 },
  { id:'niche',   name:'Display Niche',         price:90 },
  { id:'fire',    name:'Fireplace Module',      price:520 },
  { id:'led',     name:'LED Module',            price:120 },
  { id:'decor',   name:'Decorative Panel',      price:150 },
  { id:'speaker', name:'Speaker Module',        price:140 },
  { id:'hidden',  name:'Hidden Storage Module', price:200 },
];

// Default block composition per layout: [blockId, defaultQty]
const TV_LAYOUT_BLOCKS = {
  floating:  [['panel',1],['floatcab',1]],
  fullwall:  [['panel',1],['tallcab',2],['openshelf',4],['hidden',1],['decor',1]],
  shelves:   [['panel',1],['openshelf',6],['niche',2],['decor',1]],
  fireplace: [['panel',1],['fire',1],['floatcab',1],['decor',1]],
  minimal:   [['panel',1],['openshelf',1]],
  storage:   [['panel',1],['tallcab',2],['openshelf',4],['floatcab',1]],
};

const TV_MOUNTS = ['Wall mounted','Stand mounted'];

const TV_AV = [ // step 5 toggles
  { id:'soundbar', name:'Soundbar',        price:0 },
  { id:'console',  name:'Gaming console',  price:0 },
  { id:'receiver', name:'Receiver (AV)',   price:0 },
  { id:'speakers', name:'Speaker system',  price:140 },
];

const TV_CARCASS = [
  { id:'mdf', name:'MDF',     mult:1.00, sub:'Moisture-resistant board' },
  { id:'ply', name:'Plywood', mult:1.18, sub:'Premium, screw-holding' },
  { id:'mfc', name:'MFC',     mult:0.92, sub:'Melamine-faced chipboard' },
];

const TV_DECOR = [
  { id:'fluted',  name:'Fluted',       hex:'#c9b79c' },
  { id:'marble',  name:'Marble-look',  hex:'#e8e6e1' },
  { id:'slats',   name:'Wood slats',   hex:'#8a5a32' },
  { id:'stone',   name:'Stone cladding',hex:'#8c8378' },
  { id:'fabric',  name:'Fabric',       hex:'#a9b0a4' },
];

const TV_LIGHTING = [
  { id:'shelfled', name:'Shelf LED',     price:120 },
  { id:'backled',  name:'Back-panel LED',price:130 },
  { id:'ambient',  name:'Ambient strip', price:90  },
  { id:'spot',     name:'Spot lights',   price:110 },
];

const TV_CATALOG_ANCHOR = { id:'wp-tv-01', name:'Bespoke TV / Media Wall' };

function TVUnitPlannerWizard({ setPage, user, openAuth }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const { map: dbLayouts } = useLayouts('tv');
  // DISPLAY-ONLY merge: pricing / blocks / feats stay on TV_LAYOUTS.
  const tvLayoutsView = TV_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const [step, setStep] = useState(0);
  // Step 1
  const [rdOpen, setRdOpen] = useState(false);
  const [roomType, setRoomType] = useState('living');
  // Step 2
  const [dims, setDims] = useState({ wallW:4000, wallH:2700, ceiling:2900 });
  // Step 3
  const [openings, setOpenings] = useState([{ id:uid(), type:'Window', pos:2600, width:1000 }]);
  // Step 4
  const [layout, setLayout] = useState('floating');
  const [lp, setLp] = useState({
    cabLen:2400, cabDepth:400, cabHeight:320,          // floating
    shelves:4, storagePct:50, units:'mixed',           // full wall
    shelving:'Symmetrical',                            // display shelves
    fireW:1200, fireH:600, fireClear:300, fireMat:'Stone cladding', // fireplace
  });
  // step-4 block composition (qty per modular block, seeded from layout)
  const [blocks, setBlocks] = useState(() => {
    const m = {}; (TV_LAYOUT_BLOCKS.floating).forEach(([id,q])=>m[id]=q); return m;
  });
  // Step 5
  const [tv, setTv] = useState({ size:65, mount:'Wall mounted' });
  const [av, setAv] = useState({ soundbar:true, console:false, receiver:false, speakers:false });
  // Step 6
  const [store, setStore] = useState({ decor:1, books:1, consoles:1, router:1, receiver:0, hidden:0 });
  // Step 7
  const [mats, setMats] = useState({ carcass:'mdf', finish:'melamine', decor:'fluted' });
  // Step 8
  const [light, setLight] = useState({ shelfled:true, backled:false, ambient:false, spot:false });
  // preview / submit
  const [showPrev, setShowPrev] = useState(!mobile);
  const [busy, setBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const lay  = TV_LAYOUTS.find(l=>l.id===layout) || TV_LAYOUTS[0];
  const room = TV_ROOM_TYPES.find(r=>r.id===roomType) || TV_ROOM_TYPES[0];
  const carc = TV_CARCASS.find(c=>c.id===mats.carcass) || TV_CARCASS[0];
  const fin  = TV_FINISH.find(f=>f.id===mats.finish) || TV_FINISH[0];
  const dec  = TV_DECOR.find(d=>d.id===mats.decor) || TV_DECOR[0];

  // when the layout changes, reseed the block composition
  const pickLayout = (id) => {
    setLayout(id);
    const m = {}; (TV_LAYOUT_BLOCKS[id]||[]).forEach(([bid,q])=>m[bid]=q); setBlocks(m);
  };
  const setBlock = (id, q) => setBlocks(b=>({ ...b, [id]:Math.max(0, q) }));

  // ── BOM + cost ──
  const matMult = carc.mult * fin.mult;
  // carcass-built blocks get material multiplier; LED / decorative are priced flat (+ decor finish handled per-panel)
  const carcassBlocks = ['panel','floatcab','tallcab','openshelf','niche','fire','hidden'];
  const bom = TV_BLOCKS.filter(b=>(blocks[b.id]||0)>0).map(b=>{
    const qty = blocks[b.id];
    const unit = carcassBlocks.includes(b.id) ? Math.round(b.price*matMult) : b.price;
    return { id:b.id, name:b.name, qty, unitPrice:unit, line:unit*qty };
  });
  const blocksTotal = bom.reduce((s,b)=>s+b.line,0);
  // AV accessories (only priced ones)
  const avItems = TV_AV.filter(a=>av[a.id] && a.price>0).map(a=>({ ...a, qty:1, line:a.price }));
  const avTotal = avItems.reduce((s,a)=>s+a.line,0);
  // storage requirements priced per qty
  const storeItems = TV_STORAGE.filter(s=>(store[s.id]||0)>0).map(s=>({ ...s, qty:store[s.id], line:s.price*store[s.id] }));
  const storeTotal = storeItems.reduce((s,a)=>s+a.line,0);
  // lighting
  const lightItems = TV_LIGHTING.filter(l=>light[l.id]).map(l=>({ ...l, qty:1, line:l.price }));
  const lightTotal = lightItems.reduce((s,a)=>s+a.line,0);
  const grandTotal = blocksTotal + avTotal + storeTotal + lightTotal;

  // ── validation ──
  const dimsOK = dims.wallW>=1000 && dims.wallH>=2000 && dims.ceiling>=dims.wallH;
  const tvCentre = 1050;                       // recommended TV centre height (mm)
  const cabOK = lp.cabHeight>=250 && lp.cabHeight<=400 && lp.cabDepth>=350 && lp.cabDepth<=450;
  const cabOverWall = lp.cabLen > dims.wallW;

  // ── styles (mirror kitchen wizard) ──
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
  const stepper = (val, set, min=0) => (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <button type="button" onClick={()=>set(Math.max(min,val-1))} style={{ width:26, height:26, borderRadius:'var(--radius-sm)', border:'1px solid var(--line)', background:'var(--c-surface)', cursor:'pointer' }}>−</button>
      <span style={{ minWidth:18, textAlign:'center', fontSize:13, fontWeight:600 }}>{val}</span>
      <button type="button" onClick={()=>set(val+1)} style={{ width:26, height:26, borderRadius:'var(--radius-sm)', border:'1px solid var(--line)', background:'var(--c-surface)', cursor:'pointer' }}>+</button>
    </div>
  );
  const toggleRow = (on, set, name, sub) => (
    <button type="button" onClick={set} style={{ ...card(on), display:'flex', alignItems:'center', justifyContent:'space-between', gap:9 }}>
      <span><span style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', display:'block' }}>{name}</span>{sub&&<span style={{ fontSize:11, color:'var(--muted)' }}>{sub}</span>}</span>
      <span style={{ width:38, height:22, borderRadius:'var(--radius-md)', background:on?'var(--clay)':'var(--line)', position:'relative', flexShrink:0, transition:'background .15s' }}>
        <span style={{ position:'absolute', top:2, left:on?18:2, width:18, height:18, borderRadius:'50%', background:'var(--c-surface)', transition:'left .15s' }} /></span>
    </button>
  );

  // ── 2D ELEVATION (front view) ──
  const elevation = (h) => {
    const W = Math.max(1000, dims.wallW), H = Math.max(1500, dims.wallH);
    const pad = 30, vw = 340, vh = 250;
    const sc = Math.min((vw-pad*2)/W, (vh-pad*2)/H);
    const ox = pad + ((vw-pad*2)-W*sc)/2, oy = pad + ((vh-pad*2)-H*sc)/2;
    const X = (mm)=>ox+mm*sc, Yt = (mm)=>oy+(H-mm)*sc; // Yt: mm-from-floor → svg y
    const cx = ox + W*sc/2;                              // wall centre x
    // TV size (inch → mm width approx, 16:9): width ≈ inch*22.1, height ≈ inch*12.4
    const tvW = (tv.size*22.1)*sc, tvH = (tv.size*12.4)*sc;
    const tvCY = Yt(tvCentre);
    const floatY = Yt(lp.cabHeight + 350);              // floating cab sits ~350mm off floor
    const floatH = Math.max(8, lp.cabHeight*sc);
    const floatW = Math.min(W, lp.cabLen)*sc;
    return (
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width:'100%', height:h, display:'block', background:'#fbf8f3' }} aria-label="TV wall elevation">
        {/* wall */}
        <rect x={ox} y={oy} width={W*sc} height={H*sc} fill="#ffffff" stroke="#9a6a3c" strokeWidth="2.5" />
        {/* floor line */}
        <line x1={ox} y1={oy+H*sc} x2={ox+W*sc} y2={oy+H*sc} stroke="#9a6a3c" strokeWidth="3" />
        {/* openings on the wall (windows/doors/AC/outlets/columns) */}
        {openings.map(o=>{ const owmm=Math.max(150,o.width||600); const ow=owmm*sc; const x=X(Math.max(0,Math.min(W-owmm,o.pos||0)));
          const col = o.type==='Door'?'#16a34a':o.type==='Window'?'#0ea5e9':o.type==='Column'?'#6b7280':o.type==='AC unit'?'#0891b2':'#b45309';
          const oy2 = o.type==='Window'?Yt(2000):o.type==='AC unit'?Yt(2300):oy; const oh = o.type==='Window'?900*sc:o.type==='AC unit'?300*sc:(o.type==='Column'?H*sc:H*sc);
          return <g key={o.id}><rect x={x} y={o.type==='Door'||o.type==='Column'?oy:oy2} width={o.type==='Electrical outlet'?7:ow} height={o.type==='Electrical outlet'?7:oh} fill={col} fillOpacity={o.type==='Electrical outlet'?1:0.18} stroke={col} strokeWidth="1" /><text x={x+ow/2} y={oy-3} fontSize="7.5" fill={col} textAnchor="middle">{o.type[0]}</text></g>; })}
        {/* ── layout-specific furniture ── */}
        {/* full-wall / storage tall cabinets */}
        {(layout==='fullwall'||layout==='storage') && <>
          <rect x={ox+6} y={oy+6} width={Math.min(520*sc, W*sc*0.22)} height={H*sc-12} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" />
          <rect x={ox+W*sc-6-Math.min(520*sc,W*sc*0.22)} y={oy+6} width={Math.min(520*sc,W*sc*0.22)} height={H*sc-12} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" />
        </>}
        {/* decorative back panel (centre) for several layouts */}
        {(layout==='floating'||layout==='fullwall'||layout==='minimal'||layout==='fireplace') &&
          <rect x={cx-tvW/2-10} y={Yt(tvCentre+ (tv.size*12.4)/2 + 300)} width={tvW+20} height={(tv.size*12.4+600)*sc} fill={dec.hex} fillOpacity="0.5" stroke="#9a6a3c" strokeWidth="0.75" />}
        {/* display shelves (open) */}
        {(layout==='shelves'||layout==='fullwall'||layout==='storage') && [0,1,2,3].map(i=>(
          <g key={i}>
            <rect x={ox+8} y={Yt(2200 - i*420)} width={W*sc*0.22-4} height={5} fill="#9a6a3c" />
            <rect x={ox+W*sc-8-(W*sc*0.22-4)} y={Yt(2200 - i*420)} width={W*sc*0.22-4} height={5} fill="#9a6a3c" />
          </g>))}
        {/* display niches */}
        {layout==='shelves' && [0,1].map(i=>(
          <rect key={i} x={cx + (i?40:-40-60)} y={Yt(2100)} width={60} height={150*sc<30?30:150*sc} fill={dec.hex} fillOpacity="0.6" stroke="#9a6a3c" strokeWidth="0.75" />))}
        {/* fireplace module */}
        {layout==='fireplace' && <>
          <rect x={cx-(lp.fireW*sc)/2} y={Yt(lp.fireH + 200)} width={lp.fireW*sc} height={lp.fireH*sc} fill="#1f2937" stroke="#9a6a3c" strokeWidth="1" rx="3" />
          <rect x={cx-(lp.fireW*sc)/2+6} y={Yt(lp.fireH + 180)} width={lp.fireW*sc-12} height={(lp.fireH-60)*sc} fill="#f97316" fillOpacity="0.55" />
        </>}
        {/* floating cabinet base (floating / minimal / fireplace) */}
        {(layout==='floating'||layout==='minimal'||layout==='fireplace') &&
          <rect x={cx-floatW/2} y={floatY} width={floatW} height={floatH} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1.5" rx="2" />}
        {/* floating shelf for minimal */}
        {layout==='minimal' && <rect x={cx-floatW/2} y={Yt(1500)} width={floatW} height={6} fill="#9a6a3c" />}
        {/* TV (centred at recommended height) */}
        <rect x={cx-tvW/2} y={tvCY-tvH/2} width={tvW} height={tvH} fill="#111827" stroke="#000" strokeWidth="1" rx="3" />
        <rect x={cx-tvW/2+3} y={tvCY-tvH/2+3} width={tvW-6} height={tvH-6} fill="#1f2937" />
        <text x={cx} y={tvCY+2} fontSize="9" fill="#9ca3af" textAnchor="middle">{tv.size}"</text>
        {/* soundbar under TV */}
        {av.soundbar && <rect x={cx-tvW*0.4} y={tvCY+tvH/2+4} width={tvW*0.8} height={6} fill="#374151" rx="2" />}
        {/* dimension labels */}
        <text x={ox+W*sc/2} y={oy-9} fontSize="9" fill="#9a6a3c" textAnchor="middle">{W} mm</text>
        <text x={ox-9} y={oy+H*sc/2} fontSize="9" fill="#9a6a3c" textAnchor="middle" transform={`rotate(-90 ${ox-9} ${oy+H*sc/2})`}>{H} mm</text>
        <line x1={ox-4} y1={tvCY} x2={ox+4} y2={tvCY} stroke="#0891b2" strokeWidth="1.5" />
        <text x={ox+6} y={tvCY+9} fontSize="7.5" fill="#0891b2">TV {tvCentre}mm</text>
      </svg>
    );
  };

  // ── steps meta ──
  const STEPS = ['Room','Wall','Openings','Layout','TV','Storage','Materials','Lighting','Quote'];
  const next = () => setStep(s=>Math.min(STEPS.length-1, s+1));
  const back = () => setStep(s=>Math.max(0, s-1));
  const canNext = (() => { if (step===1) return dimsOK; return true; })();

  // ── save / quote / pdf ──
  const buildConfig = () => ({
    product:'tv_unit', plan_version:'wizard-v1', room_type:room.name,
    wall:{ width_mm:dims.wallW, height_mm:dims.wallH, ceiling_mm:dims.ceiling }, openings,
    layout, layout_name:lay.name, layout_params:lp,
    tv:{ size_in:tv.size, mount:tv.mount, centre_mm:tvCentre, av:Object.keys(av).filter(k=>av[k]) },
    storage:Object.entries(store).filter(([,v])=>v>0).map(([k,v])=>({ item:k, qty:v })),
    materials:{ carcass:carc.name, finish:fin.name, decorative:dec.name },
    lighting:Object.keys(light).filter(k=>light[k]),
    modules:bom.map(b=>({ name:b.name, qty:b.qty, line_bhd:b.line })),
    estimate_bhd:grandTotal });

  const saveDesign = async () => {
    setBusy(true);
    try {
      const token = uid();
      const breakdown = { modules:blocksTotal, av:avTotal, storage:storeTotal, lighting:lightTotal };
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:TV_CATALOG_ANCHOR.id,
        customer_name:user?.name||null, customer_email:user?.email||null, customer_phone:user?.phone||null,
        product_name:`TV unit — ${lay.name} (${(dims.wallW/1000).toFixed(1)}m wall)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdown, status:'tv-plan', share_token:token, created_at:new Date().toISOString() }] });
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
      const breakdown = { modules:blocksTotal, av:avTotal, storage:storeTotal, lighting:lightTotal };
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:TV_CATALOG_ANCHOR.id,
        customer_name:c.name, customer_email:c.email||null, customer_phone:c.phone||null,
        product_name:`TV unit — ${lay.name} (${(dims.wallW/1000).toFixed(1)}m wall)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdown, status:'tv-plan', share_token:token, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const note = [`📺 TV Unit Planner Wizard`, `Room: ${room.name}  ·  Wall ${dims.wallW}×${dims.wallH}mm`,
        `Layout: ${lay.name}  ·  ${bom.length} module lines`,
        `TV: ${tv.size}" ${tv.mount}  ·  ${Object.keys(av).filter(k=>av[k]).join(', ')||'no AV'}`,
        `Materials: ${carc.name} carcass · ${fin.name} finish · ${dec.name} panels`,
        `Indicative estimate: BHD ${grandTotal}`, c.date?`Preferred visit: ${c.date}`:'', `Plan ref: ${token}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:c.name, email:c.email||null, phone:c.phone||null,
        source:'website_tv_planner', status:'New', stage:'New', platform:'Website', interest:'TV Unit (planner wizard)',
        budget:grandTotal, value:grandTotal, notes:note, created_at:new Date().toISOString() }] });
      toast(t('w4QuoteSentDesign'),'success');
      setShowQuote(false);
      if (!user && openAuth) openAuth('register', { name:c.name, phone:c.phone, email:c.email });
      else setPage('home');
    } catch(e) { toast(t('w4CouldNotSend')+' '+(e?.message||t('w4TryAgain')),'error'); }
    finally { setBusy(false); }
  };

  const downloadPDF = () => {
    const w = window.open('', '_blank');
    if (!w) { toast(t('w4AllowPopups'),'error'); return; }
    const rows = [
      ...bom.map(b=>`<tr><td>${b.name} ×${b.qty}</td><td style="text-align:right">${fmt(b.line)}</td></tr>`),
      ...avItems.map(a=>`<tr><td>${a.name}</td><td style="text-align:right">${fmt(a.line)}</td></tr>`),
      ...storeItems.map(s=>`<tr><td>${s.name} ×${s.qty}</td><td style="text-align:right">${fmt(s.line)}</td></tr>`),
      ...lightItems.map(l=>`<tr><td>${l.name}</td><td style="text-align:right">${fmt(l.line)}</td></tr>`),
    ].join('');
    w.document.write(`<html><head><title>TV Unit Quotation</title><style>body{font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;color:#2a1f16;padding:36px;max-width:720px;margin:0 auto}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:14px}td{padding:8px 4px;border-bottom:1px solid #e3d6c6;font-size:13px}.tot{font-size:20px;font-weight:700;color:var(--clay-deep);text-align:right;margin-top:16px}.muted{color:#8a7a68;font-size:12px}</style></head><body>
      <h1>The Closets — TV / Media Unit Quotation</h1>
      <p class="muted">${room.name} · ${lay.name} layout · Wall ${dims.wallW}×${dims.wallH}mm · ${carc.name} carcass · ${fin.name} finish · ${dec.name} panels</p>
      <p class="muted">TV ${tv.size}" ${tv.mount} · centre at ${tvCentre}mm</p>
      <table><tbody>${rows}</tbody></table>
      <div class="tot">Estimated total: ${fmt(grandTotal)}</div>
      <p class="muted" style="margin-top:24px">Indicative guide price. A free design visit confirms exact measurements and a fully itemised quote.</p>
      </body></html>`);
    w.document.close();
    setTimeout(()=>{ try{ w.print(); }catch(e){} }, 350);
  };

  // ── STEP CONTENT ──
  const stepContent = () => {
    switch(step) {
      case 0: return (<>{sectionH('1',t('shTv0t'),t('shTv0s'))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {TV_ROOM_TYPES.map(r=>{ const on=roomType===r.id; return (
            <button key={r.id} type="button" onClick={()=>setRoomType(r.id)} style={card(on)}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5"><path d={r.ic} /></svg>
              <div style={{ fontSize:14, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', marginTop:6 }}>{trOpt(r.name, lang)}</div>
              <div style={{ fontSize:11.5, color:'var(--muted)' }}>{trOpt(r.sub, lang)}</div>
            </button>); })}
        </div></>);
      case 1: return (<>{sectionH('2',t('shTv1t'),t('shTv1s'))}
        <div style={{ display:'grid', gap:12 }}>
          {numField(t('fWallWidth'), dims.wallW, v=>setDims(d=>({...d,wallW:v})), 1000, 12000)}
          {numField(t('fWallHeight'), dims.wallH, v=>setDims(d=>({...d,wallH:v})), 2000, 5000)}
          {numField(t('fCeilingHeight'), dims.ceiling, v=>setDims(d=>({...d,ceiling:v})), 2000, 5000)}
          {!dimsOK && <div style={{ fontSize:12, color:'var(--danger)' }}>Wall ≥1000mm wide, ≥2000mm tall, and ceiling ≥ wall height.</div>}
          <div style={{ fontSize:12, color:'var(--ink-soft)', background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'8px 11px' }}>Recommended: TV centre at 1000–1100mm, floating unit 250–400mm tall, 350–450mm deep.</div>
        </div></>);
      case 2: return (<>{sectionH('3',t('shOpeningsT'),t('shOpeningsS'))}
        <div style={{ display:'grid', gap:9 }}>
          {openings.map(o=>(
            <div key={o.id} style={{ border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'9px 10px', background:'var(--c-surface)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr auto', gap:7, alignItems:'end' }}>
                <label><span style={labelS}>{t('fType')}</span>
                  <select value={o.type} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,type:e.target.value}:x))} style={inS}>{TV_OPENING_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
                <label><span style={labelS}>{t('fPosition')}</span><input type="number" value={o.pos} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,pos:Number(e.target.value)}:x))} style={inS} /></label>
                <label><span style={labelS}>{t('fWidth')}</span><input type="number" value={o.width} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,width:Number(e.target.value)}:x))} style={inS} /></label>
                <button type="button" onClick={()=>setOpenings(os=>os.filter(x=>x.id!==o.id))} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-sm)', padding:'9px 11px', cursor:'pointer', color:'var(--muted)' }}>✕</button>
              </div>
            </div>))}
          <button type="button" onClick={()=>setOpenings(os=>[...os,{ id:uid(), type:'Electrical outlet', pos:1900, width:150 }])} style={{ border:'1px dashed var(--line)', borderRadius:'var(--radius-md)', padding:'10px', background:'var(--sand)', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--clay-deep)' }}>{t('vAddOpeningConstraint')}</button>
        </div></>);
      case 3: return (<>{sectionH('4',t('shTv3t'),t('shTv3s'))}
        <button type="button" onClick={()=>setRdOpen(true)} className="btn-clay" style={{ borderRadius:'var(--radius-md)', marginBottom:16, display:'inline-flex', alignItems:'center', gap:8 }}>{t('pOpenRoomDesigner')}</button>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?14:18, marginBottom:18 }}>
          {tvLayoutsView.map(l=>{ const on=layout===l.id; return (
            <button key={l.id} type="button" onClick={()=>pickLayout(l.id)} style={{ ...card(on), padding:0, overflow:'hidden', textAlign:'left', borderRadius:'var(--radius-lg)', boxShadow: on?'0 12px 32px rgba(194,65,28,.18)':'0 2px 14px rgba(33,28,24,.07)', transform: on?'translateY(-2px)':'none', transition:'transform .18s ease, box-shadow .18s ease' }}>
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
        <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'13px 14px', marginBottom:12 }}>
          <div className="eyebrow" style={{ fontSize:11, marginBottom:10 }}>{lang==='ar'?`${t('gParameters')} ${lay.name}`:`${lay.name} ${t('gParameters')}`}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            {numField(t('fTvSize'), tv.size, v=>setTv(tv2=>({...tv2,size:v})), 24, 110, 'inch')}
            {layout==='floating' && <>{numField(t('fCabinetLength'), lp.cabLen, v=>setLp(p=>({...p,cabLen:v})), 600, 12000)}{numField(t('fCabinetDepth'), lp.cabDepth, v=>setLp(p=>({...p,cabDepth:v})), 250, 600)}{numField(t('fCabinetHeight'), lp.cabHeight, v=>setLp(p=>({...p,cabHeight:v})), 150, 600)}{!cabOK && <div style={{ gridColumn:'1/-1', fontSize:11.5, color:'var(--danger)' }}>⚠ For floating units aim for 250–400mm height and 350–450mm depth.</div>}</>}
            {layout==='fullwall' && <>{numField('Number of shelves', lp.shelves, v=>setLp(p=>({...p,shelves:v})), 0, 16, 'shelves')}{numField('Storage %', lp.storagePct, v=>setLp(p=>({...p,storagePct:v})), 0, 100, '%')}<label style={{ gridColumn:'1/-1' }}><span style={labelS}>Open vs closed units</span><select value={lp.units} onChange={e=>setLp(p=>({...p,units:e.target.value}))} style={inS}><option value="open">Mostly open</option><option value="mixed">Open + closed</option><option value="closed">Mostly closed</option></select></label></>}
            {layout==='shelves' && <><label style={{ gridColumn:'1/-1' }}><span style={labelS}>Shelving arrangement</span><select value={lp.shelving} onChange={e=>setLp(p=>({...p,shelving:e.target.value}))} style={inS}>{['Left','Right','Symmetrical','Asymmetrical'].map(s=><option key={s}>{s}</option>)}</select></label>{numField('Number of shelves', lp.shelves, v=>setLp(p=>({...p,shelves:v})), 0, 16, 'shelves')}</>}
            {layout==='fireplace' && <>{numField('Fireplace width', lp.fireW, v=>setLp(p=>({...p,fireW:v})), 600, 2500)}{numField('Fireplace height', lp.fireH, v=>setLp(p=>({...p,fireH:v})), 300, 1200)}{numField('Safety clearance', lp.fireClear, v=>setLp(p=>({...p,fireClear:v})), 100, 800)}<label><span style={labelS}>Cladding material</span><select value={lp.fireMat} onChange={e=>setLp(p=>({...p,fireMat:e.target.value}))} style={inS}>{['Stone cladding','Wood','Marble-look','Concrete'].map(s=><option key={s}>{s}</option>)}</select></label></>}
            {(layout==='minimal'||layout==='storage') && <>{numField(t('fCabinetLength'), lp.cabLen, v=>setLp(p=>({...p,cabLen:v})), 600, 12000)}{numField(t('fCabinetDepth'), lp.cabDepth, v=>setLp(p=>({...p,cabDepth:v})), 250, 600)}</>}
            {cabOverWall && <div style={{ gridColumn:'1/-1', fontSize:11.5, color:'var(--danger)' }}>⚠ Cabinet length exceeds wall width ({(dims.wallW/1000).toFixed(1)}m).</div>}
          </div>
          <div style={{ marginTop:10, fontSize:11.5, color:'var(--ink-soft)' }}>Includes: {lay.feats.join(' · ')}</div>
        </div>
        {/* modular blocks for this layout */}
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{t('pModularBlocks')}</div>
        <div style={{ display:'grid', gap:8 }}>
          {TV_BLOCKS.map(b=>{ const q=blocks[b.id]||0; const on=q>0; return (
            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:9, border:on?'2px solid var(--clay)':'1px solid var(--line)', background:on?'var(--sand)':'#fff', borderRadius:'var(--radius-md)', padding:'8px 11px' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{trOpt(b.name, lang)}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{fmt(carcassBlocks.includes(b.id)?Math.round(b.price*matMult):b.price)} / unit</div></div>
              {stepper(q, v=>setBlock(b.id,v))}
            </div>); })}
        </div></>);
      case 4: return (<>{sectionH('5',t('shTv4t'),t('shTv4s'))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11, marginBottom:14 }}>
          {numField(t('fTvSize'), tv.size, v=>setTv(tv2=>({...tv2,size:v})), 24, 110, 'inch')}
          <label><span style={labelS}>Mount type</span><select value={tv.mount} onChange={e=>setTv(t=>({...t,mount:e.target.value}))} style={inS}>{TV_MOUNTS.map(m=><option key={m}>{m}</option>)}</select></label>
        </div>
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{t('gConnectedDevices')}</div>
        <div style={{ display:'grid', gap:8 }}>
          {TV_AV.map(a=>toggleRow(av[a.id], ()=>setAv(s=>({...s,[a.id]:!s[a.id]})), a.name, a.price>0?`adds ${fmt(a.price)}`:'accommodated in cabinetry'))}
        </div></>);
      case 5: return (<>{sectionH('6',t('shTv5t'),t('shTv5s'))}
        <div style={{ display:'grid', gap:9 }}>
          {TV_STORAGE.map(s=>{ const q=store[s.id]||0; const on=q>0; return (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:9, border:on?'2px solid var(--clay)':'1px solid var(--line)', background:on?'var(--sand)':'#fff', borderRadius:'var(--radius-md)', padding:'9px 11px' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{trOpt(s.name, lang)}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{fmt(s.price)} / {s.unit}</div></div>
              {stepper(q, v=>setStore(st=>({...st,[s.id]:v})))}
            </div>); })}
        </div></>);
      case 6: return (<>{sectionH('7',t('shTv6t'),t('shTv6s'))}
        {[[t('gCarcass'),'carcass',TV_CARCASS],[t('gFinish'),'finish',TV_FINISH]].map(([title,key,list])=>(
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
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{t('gDecorativePanels')}</div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:8 }}>
          {TV_DECOR.map(o=>{ const on=mats.decor===o.id; return (
            <button key={o.id} type="button" onClick={()=>setMats(m=>({...m,decor:o.id}))} style={card(on)}>
              <div style={{ height:30, borderRadius:'var(--radius-sm)', background:o.hex, marginBottom:6 }} />
              <div style={{ fontSize:13, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(o.name, lang)}</div>
            </button>); })}
        </div></>);
      case 7: return (<>{sectionH('8',t('shTv7t'),t('shTv7s'))}
        <div style={{ display:'grid', gap:8 }}>
          {TV_LIGHTING.map(l=>toggleRow(light[l.id], ()=>setLight(s=>({...s,[l.id]:!s[l.id]})), l.name, `adds ${fmt(l.price)}`))}
        </div></>);
      case 8: return (<>{sectionH('9',t('shSummaryT'),t('shSummaryS'))}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'8px 12px', background:'var(--sand)', fontSize:11.5, fontWeight:700, color:'var(--ink-soft)' }}>{t('pBillOfMaterials')}</div>
          {bom.map(b=>(<div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{b.name} ×{b.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(b.line)}</span></div>))}
          {avItems.map(a=>(<div key={a.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{a.name}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(a.line)}</span></div>))}
          {storeItems.map(s=>(<div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{s.name} ×{s.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(s.line)}</span></div>))}
          {lightItems.map(l=>(<div key={l.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{l.name}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(l.line)}</span></div>))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderTop:'2px solid var(--line)', background:'var(--sand)' }}><span style={{ fontWeight:700, color:'var(--ink)' }}>{t('pEstimatedTotal')}</span><span className="display" style={{ fontSize:19, color:'var(--clay-deep)' }}>{fmt(grandTotal)}</span></div>
        </div>
        <div style={{ background:'rgba(8,145,178,.08)', borderRadius:'var(--radius-md)', padding:'9px 12px', fontSize:12.5, color:'#0e7490', marginBottom:12 }}>
          Work guidance: mount the TV centre at {tvCentre}mm, allow 50–100mm wall clearance for cables, and run a dedicated outlet behind the panel. Floating units fix into a timber sub-frame.
        </div>
        {cabOverWall && <div style={{ fontSize:12.5, color:'var(--danger)', marginBottom:12 }}>⚠ Cabinet length exceeds the wall — reduce length or widen the wall.</div>}
        <div style={{ display:'grid', gap:8 }}>
          <button type="button" disabled={busy} onClick={saveDesign} style={{ border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pSaveDesign')}</button>
          <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:'var(--radius-md)' }}>{user?t('pGetQuoteArrow'):t('pSignInQuoteArrow')}</button>
          <button type="button" onClick={downloadPDF} style={{ border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pDownloadPdf')}</button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
            {[['Drag-and-drop modules'],['AI layout suggestions'],['Automatic cable routing'],['AR room preview'],['Manufacturing drawings'],['Material optimizer'],['CNC cut list export']].map(([t])=>(
              <button key={t} type="button" disabled title="Coming soon" style={{ border:'1px dashed var(--line)', background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'9px', fontSize:11.5, color:'var(--muted)', cursor:'not-allowed' }}>{t} · soon</button>))}
          </div>
        </div></>);
      default: return null;
    }
  };

  // ── PREVIEW pane ──
  const previewPane = (h) => (
    <div style={{ display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--ink-soft)' }}>{t('p2dElevation')}</span>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{room.name}</span>
      </div>
      <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', overflow:'hidden', flex:1, minHeight:0 }}>{elevation(h)}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{lay.name} · {tv.size}" · {(dims.wallW/1000).toFixed(1)}m wall</span>
        <span className="display" style={{ fontSize:20, color:'var(--clay)' }}>{fmt(grandTotal)}</span>
      </div>
      {cabOverWall && <div style={{ fontSize:11, color:'var(--danger)', background:'rgba(220,38,38,.08)', borderRadius:'var(--radius-sm)', padding:'6px 9px' }}>⚠ Cabinet wider than the wall.</div>}
    </div>
  );

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
              {previewPane('100%')}
            </div>
          </div>
        )}
        {/* mobile collapsible preview */}
        {mobile && showPrev && (
          <div style={{ flexShrink:0, padding:'10px 14px', borderTop:'1px solid var(--line)', background:'var(--c-surface)' }}>
            <div style={{ height:210 }}>{previewPane(200)}</div>
          </div>
        )}
      </div>

      {/* bottom action bar */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'9px 14px calc(9px + env(safe-area-inset-bottom))', borderTop:'1px solid var(--line)', background:'rgba(255,255,255,.97)', backdropFilter:'blur(10px)' }}>
        {step>0 ? <button type="button" onClick={back} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'10px 16px', fontSize:13.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pBack')}</button>
          : <button type="button" onClick={()=>setPage('cat:TV Units')} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'10px 16px', fontSize:13, color:'var(--muted)', cursor:'pointer' }}>{t('pExit')}</button>}
        {mobile && <button type="button" onClick={()=>setShowPrev(v=>!v)} style={{ background:'var(--sand)', border:'none', borderRadius:'var(--radius-md)', padding:'10px 12px', fontSize:12.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{showPrev?t('pHide'):t('pPreview')}</button>}
        <div style={{ flex:1, textAlign: mobile?'center':'right', minWidth:0 }}><span style={{ fontSize:10.5, color:'var(--muted)' }}>{t('pTotal')} </span><span className="display" style={{ fontSize:17, color:'var(--clay)' }}>{fmt(grandTotal)}</span></div>
        {step<STEPS.length-1
          ? <button type="button" className="btn-clay" disabled={!canNext} onClick={next} style={{ borderRadius:'var(--radius-md)', minWidth:120, opacity:canNext?1:.55 }}>{t('pNextArrow')}</button>
          : <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:'var(--radius-md)', minWidth:120 }}>{t('pGetQuoteArrow')}</button>}
      </div>

      {rdOpen && (
        <RoomDesigner
          mobile={mobile}
          category="tv"
          sceneShapeFallback={layout}
          dimensions={{ wallWidthMm: dims.wallW, wallHeightMm: dims.wallH, tvInch: tv.size }}
          onClose={()=>setRdOpen(false)}
          onGoToSummary={()=>setRdOpen(false)}
          photorealReq={{ product:'tv', getImage:()=>null }}
          indicativeTotal={null}
        />
      )}
      {/* QUOTE modal */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowQuote(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', maxWidth:420, width:'100%', padding:24 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 6px' }}>{t('pQuoteTitleTV')}</h3>
            <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)' }}>{lay.name} · {tv.size}" · {fin.name} · <b style={{ color:'var(--clay-deep)' }}>{fmt(grandTotal)}</b></div>
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
    </div>
  );
}

export { TV_BLOCKS, TVUnitPlannerWizard };
