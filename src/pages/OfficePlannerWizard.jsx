// Route chunk "OfficePlannerWizard" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: OfficePlannerWizard.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { validateForm } from '../forms/validate';
import { ModalPanel } from '../a11y/dialog';
import FormNotice from '../privacy/FormNotice';
import { api, fmt, toast, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { OFFICE_LAYOUTS, OFFICE_STORAGE, OFFICE_WORKTOPS } from './shared_OfficePlannerWizard_OfficePage';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';
import { trStep } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus3';
import { RoomDesigner } from './shared_PlannerPage_TVUnitPlannerWizard_plus4';
import { layoutImgSize } from '../layoutDims';

/* ════════════════════════════════════════════════════════════════════════════
   PROFESSIONAL HOME OFFICE PLANNER WIZARD  ·  data tables (BHD)
   Wired to route 'office-planner'. Mirrors the TV unit wizard exactly:
   fit-to-viewport two-pane shell, 9 steps, 2D elevation, live BOM + cost +
   Save / Quote / PDF. Six layouts each carry a brand office render photo. */
const OFFICE_ROOM_TYPES = [
  { id:'home',    name:'Home office',       sub:'Dedicated work room',   ic:'M4 7h16v12H4zM4 11h16M9 7V5h6v2' },
  { id:'study',   name:'Study',            sub:'Reading & focus space', ic:'M4 5h16v14H4zM8 5v14M4 9h4M4 13h4' },
  { id:'bedroom', name:'Bedroom corner',   sub:'Desk in the bedroom',   ic:'M3 18v-6h18v6M3 12V8a2 2 0 012-2h6v6' },
  { id:'living',  name:'Living room nook', sub:'Work in the lounge',    ic:'M3 11l9-7 9 7M5 10v10h14V10' },
  { id:'guest',   name:'Guest room',       sub:'Dual-use spare room',   ic:'M3 17v-5a2 2 0 012-2h14a2 2 0 012 2v5M3 17h18M6 17v2M18 17v2' },
];

const OFFICE_OPENING_TYPES = ['Door','Window','Column','AC unit','Electrical outlet'];

// Modular blocks — id, label, base price BHD.
const OFFICE_BLOCKS = [
  { id:'desk',     name:'Desk / Worktop',        price:220 },
  { id:'return',   name:'Return Worktop',        price:140 },
  { id:'tallcab',  name:'Tall Storage Unit',     price:260 },
  { id:'basecab',  name:'Base Cabinet',          price:160 },
  { id:'openshelf',name:'Open Shelf',            price:55 },
  { id:'drawer',   name:'Drawer Unit',           price:130 },
  { id:'file',     name:'File / Filing Unit',    price:150 },
  { id:'overhead', name:'Overhead Cabinet',      price:120 },
  { id:'decor',    name:'Decorative Panel',      price:150 },
  { id:'pedestal', name:'Mobile Pedestal',       price:110 },
];

// Default block composition per layout: [blockId, defaultQty]
const OFFICE_LAYOUT_BLOCKS = {
  'wall-storage': [['desk',1],['tallcab',2],['basecab',2],['openshelf',4],['overhead',2]],
  'corner':       [['desk',1],['return',1],['overhead',2],['basecab',2],['openshelf',2]],
  'built-in':     [['desk',1],['openshelf',6],['basecab',2],['decor',1]],
  'storage-desk': [['desk',1],['tallcab',3],['file',1],['overhead',2]],
  'minimal':      [['desk',1],['openshelf',1]],
  'l-shaped':     [['desk',1],['return',1],['drawer',1],['tallcab',1],['pedestal',1]],
};

const OFFICE_DESK_SHAPES = ['Single','Return','L-shape'];

const OFFICE_CARCASS = [
  { id:'mdf', name:'MDF',     mult:1.00, sub:'Moisture-resistant board' },
  { id:'ply', name:'Plywood', mult:1.18, sub:'Premium, screw-holding' },
  { id:'mfc', name:'MFC',     mult:0.92, sub:'Melamine-faced chipboard' },
];

const OFFICE_FINISH = [
  { id:'melamine', name:'Melamine',       mult:1.00, hex:'#e9e5dd' },
  { id:'laminate', name:'Laminate',       mult:1.08, hex:'#d8cdbd' },
  { id:'acrylic',  name:'Acrylic',        mult:1.24, hex:'#27384f' },
  { id:'veneer',   name:'Veneer',         mult:1.32, hex:'#5a3a20' },
  { id:'lacquer',  name:'Lacquer paint',  mult:1.30, hex:'#f5f3ee' },
];

const OFFICE_LIGHTING = [
  { id:'shelfled', name:'Shelf LED',           price:120 },
  { id:'undercab', name:'Under-cabinet LED',   price:110 },
  { id:'task',     name:'Desk task light',     price:90  },
  { id:'ambient',  name:'Ambient strip',       price:90  },
];

const OFFICE_CATALOG_ANCHOR = { id:'wp-office-01', name:'Bespoke Home Office' };

/* ════════════════════════════════════════════════════════════════════════════
   HOME OFFICE PLANNER WIZARD  ·  fit-to-viewport two-pane app shell
   Route 'office-planner'.  9 steps · live 2D elevation · BOM + cost +
   Save / Quote / PDF.  Modelled exactly on TVUnitPlannerWizard for consistency.
   ════════════════════════════════════════════════════════════════════════════ */
function OfficePlannerWizard({ setPage, user, openAuth }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const { map: dbLayouts } = useLayouts('office');
  // DISPLAY-ONLY merge: pricing / blocks / feats stay on OFFICE_LAYOUTS.
  const officeLayoutsView = OFFICE_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const [step, setStep] = useState(0);
  // Step 1
  const [rdOpen, setRdOpen] = useState(false);
  const [roomType, setRoomType] = useState('home');
  // Step 2
  const [dims, setDims] = useState({ wallW:3600, wallH:2700, ceiling:2900 });
  // Step 3
  const [openings, setOpenings] = useState([{ id:uid(), type:'Window', pos:2200, width:1200 }]);
  // Step 4
  const [layout, setLayout] = useState('wall-storage');
  const [blocks, setBlocks] = useState(() => {
    const m = {}; (OFFICE_LAYOUT_BLOCKS['wall-storage']).forEach(([id,q])=>m[id]=q); return m;
  });
  // Step 5 — desk & worktop
  const [desk, setDesk] = useState({ length:1600, depth:600, shape:'Single', worktop:'laminate' });
  // Step 6 — storage qty steppers
  const [store, setStore] = useState({ openshelf:4, closed:2, drawers:1, tall:1, file:0 });
  // Step 7 — materials
  const [mats, setMats] = useState({ carcass:'mdf', finish:'melamine' });
  // Step 8 — lighting toggles
  const [light, setLight] = useState({ shelfled:true, undercab:false, task:true, ambient:false });
  // preview / submit
  const [showPrev, setShowPrev] = useState(!mobile);
  const [busy, setBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const lay  = OFFICE_LAYOUTS.find(l=>l.id===layout) || OFFICE_LAYOUTS[0];
  const room = OFFICE_ROOM_TYPES.find(r=>r.id===roomType) || OFFICE_ROOM_TYPES[0];
  const carc = OFFICE_CARCASS.find(c=>c.id===mats.carcass) || OFFICE_CARCASS[0];
  const fin  = OFFICE_FINISH.find(f=>f.id===mats.finish) || OFFICE_FINISH[0];
  const wtop = OFFICE_WORKTOPS.find(w=>w.id===desk.worktop) || OFFICE_WORKTOPS[0];

  // when the layout changes, reseed the block composition
  const pickLayout = (id) => {
    setLayout(id);
    const m = {}; (OFFICE_LAYOUT_BLOCKS[id]||[]).forEach(([bid,q])=>m[bid]=q); setBlocks(m);
  };
  const setBlock = (id, q) => setBlocks(b=>({ ...b, [id]:Math.max(0, q) }));

  // ── BOM + cost ──
  const matMult = carc.mult * fin.mult;
  // carcass-built blocks get material multiplier; desk/return also pick up worktop multiplier; decor flat
  const carcassBlocks = ['tallcab','basecab','openshelf','drawer','file','overhead','pedestal'];
  const deskBlocks = ['desk','return'];
  const bom = OFFICE_BLOCKS.filter(b=>(blocks[b.id]||0)>0).map(b=>{
    const qty = blocks[b.id];
    let unit = b.price;
    if (carcassBlocks.includes(b.id)) unit = Math.round(b.price*matMult);
    else if (deskBlocks.includes(b.id)) unit = Math.round(b.price*wtop.mult*carc.mult);
    return { id:b.id, name:b.name, qty, unitPrice:unit, line:unit*qty };
  });
  const blocksTotal = bom.reduce((s,b)=>s+b.line,0);
  // storage requirements priced per qty
  const storeItems = OFFICE_STORAGE.filter(s=>(store[s.id]||0)>0).map(s=>({ ...s, qty:store[s.id], line:s.price*store[s.id] }));
  const storeTotal = storeItems.reduce((s,a)=>s+a.line,0);
  // lighting
  const lightItems = OFFICE_LIGHTING.filter(l=>light[l.id]).map(l=>({ ...l, qty:1, line:l.price }));
  const lightTotal = lightItems.reduce((s,a)=>s+a.line,0);
  const grandTotal = blocksTotal + storeTotal + lightTotal;

  // ── validation ──
  const dimsOK = dims.wallW>=1000 && dims.wallH>=2000 && dims.ceiling>=dims.wallH;
  const deskOK = desk.depth>=450 && desk.depth<=800 && desk.length>=900;
  const deskOverWall = desk.length > dims.wallW;

  // ── styles (mirror TV wizard) ──
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
  const toggleRow = (on, set, name, sub) => (
    <button type="button" onClick={set} style={{ ...card(on), display:'flex', alignItems:'center', justifyContent:'space-between', gap:9 }}>
      <span><span style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', display:'block' }}>{name}</span>{sub&&<span style={{ fontSize:11, color:'var(--muted)' }}>{sub}</span>}</span>
      <span style={{ width:38, height:22, borderRadius:11, background:on?'var(--clay)':'var(--line)', position:'relative', flexShrink:0, transition:'background .15s' }}>
        <span style={{ position:'absolute', top:2, left:on?18:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .15s' }} /></span>
    </button>
  );

  // ── 2D ELEVATION (front view) ──
  const elevation = (h) => {
    const W = Math.max(1000, dims.wallW), H = Math.max(1500, dims.wallH);
    const pad = 30, vw = 340, vh = 250;
    const sc = Math.min((vw-pad*2)/W, (vh-pad*2)/H);
    const ox = pad + ((vw-pad*2)-W*sc)/2, oy = pad + ((vh-pad*2)-H*sc)/2;
    const X = (mm)=>ox+mm*sc, Yt = (mm)=>oy+(H-mm)*sc; // mm-from-floor → svg y
    const cx = ox + W*sc/2;
    const deskTop = 740;                                  // worktop height (mm)
    const deskW = Math.min(W, desk.length)*sc;
    const deskY = Yt(deskTop);
    const tallW = Math.min(520*sc, W*sc*0.22);
    return (
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width:'100%', height:h, display:'block', background:'#fbf8f3' }} aria-label="Home office elevation">
        {/* wall */}
        <rect x={ox} y={oy} width={W*sc} height={H*sc} fill="#ffffff" stroke="#9a6a3c" strokeWidth="2.5" />
        {/* floor line */}
        <line x1={ox} y1={oy+H*sc} x2={ox+W*sc} y2={oy+H*sc} stroke="#9a6a3c" strokeWidth="3" />
        {/* openings */}
        {openings.map(o=>{ const owmm=Math.max(150,o.width||600); const ow=owmm*sc; const x=X(Math.max(0,Math.min(W-owmm,o.pos||0)));
          const col = o.type==='Door'?'#16a34a':o.type==='Window'?'#0ea5e9':o.type==='Column'?'#6b7280':o.type==='AC unit'?'#0891b2':'#b45309';
          const oy2 = o.type==='Window'?Yt(2000):o.type==='AC unit'?Yt(2300):oy; const oh = o.type==='Window'?900*sc:o.type==='AC unit'?300*sc:(o.type==='Column'?H*sc:H*sc);
          return <g key={o.id}><rect x={x} y={o.type==='Door'||o.type==='Column'?oy:oy2} width={o.type==='Electrical outlet'?7:ow} height={o.type==='Electrical outlet'?7:oh} fill={col} fillOpacity={o.type==='Electrical outlet'?1:0.18} stroke={col} strokeWidth="1" /><text x={x+ow/2} y={oy-3} fontSize="7.5" fill={col} textAnchor="middle">{o.type[0]}</text></g>; })}
        {/* tall storage units flanking (storage layouts) */}
        {(layout==='wall-storage'||layout==='storage-desk') && <>
          <rect x={ox+6} y={oy+6} width={tallW} height={H*sc-12} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" />
          <rect x={ox+W*sc-6-tallW} y={oy+6} width={tallW} height={H*sc-12} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" />
        </>}
        {/* L-shape tall unit on the right */}
        {layout==='l-shaped' && <rect x={ox+W*sc-6-tallW} y={oy+6} width={tallW} height={H*sc-12} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" />}
        {/* overhead cabinets above the desk */}
        {(layout==='wall-storage'||layout==='corner'||layout==='storage-desk') &&
          <rect x={cx-deskW/2} y={Yt(2200)} width={deskW} height={Math.max(8,360*sc)} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" rx="2" />}
        {/* open display shelves */}
        {(layout==='built-in'||layout==='wall-storage') && [0,1,2,3].map(i=>(
          <rect key={i} x={cx-deskW/2} y={Yt(2100 - i*340)} width={deskW} height={5} fill="#9a6a3c" />))}
        {/* decorative back panel (built-in / minimal) */}
        {(layout==='built-in'||layout==='minimal') &&
          <rect x={cx-deskW/2-6} y={Yt(1700)} width={deskW+12} height={(1700-deskTop)*sc} fill={fin.hex} fillOpacity="0.4" stroke="#9a6a3c" strokeWidth="0.6" />}
        {/* floating shelf for minimal */}
        {layout==='minimal' && <rect x={cx-deskW/2} y={Yt(1500)} width={deskW} height={6} fill="#9a6a3c" />}
        {/* worktop / desk surface */}
        <rect x={cx-deskW/2} y={deskY-7} width={deskW} height={9} fill={wtop.hex} stroke="#9a6a3c" strokeWidth="1.2" rx="2" />
        {/* desk legs / base cabinet */}
        <rect x={cx-deskW/2} y={deskY} width={Math.max(60,deskW*0.32)} height={deskTop*sc} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" />
        {desk.shape!=='Single'
          ? <rect x={cx+deskW/2-Math.max(60,deskW*0.18)} y={deskY} width={Math.max(60,deskW*0.18)} height={deskTop*sc} fill={fin.hex} stroke="#9a6a3c" strokeWidth="1" />
          : <line x1={cx+deskW/2-2} y1={deskY} x2={cx+deskW/2-2} y2={oy+H*sc} stroke="#9a6a3c" strokeWidth="2" />}
        {/* monitor + chair sketch */}
        <rect x={cx-46} y={deskY-7-46} width={64} height={38} fill="#1f2937" stroke="#000" strokeWidth="1" rx="2" />
        <rect x={cx-18} y={deskY-7-8} width={8} height={8} fill="#374151" />
        <rect x={cx+deskW/2-60} y={deskY+8} width={26} height={4} fill="#9a6a3c" rx="2" />
        {/* dimension labels */}
        <text x={ox+W*sc/2} y={oy-9} fontSize="9" fill="#9a6a3c" textAnchor="middle">{W} mm</text>
        <text x={ox-9} y={oy+H*sc/2} fontSize="9" fill="#9a6a3c" textAnchor="middle" transform={`rotate(-90 ${ox-9} ${oy+H*sc/2})`}>{H} mm</text>
        <line x1={ox-4} y1={deskY} x2={ox+4} y2={deskY} stroke="#0891b2" strokeWidth="1.5" />
        <text x={ox+6} y={deskY-3} fontSize="7.5" fill="#0891b2">Desk {deskTop}mm</text>
      </svg>
    );
  };

  // ── steps meta ──
  const STEPS = ['Room','Dimensions','Openings','Layout','Desk','Storage','Materials','Lighting','Quote'];
  const next = () => setStep(s=>Math.min(STEPS.length-1, s+1));
  const back = () => setStep(s=>Math.max(0, s-1));
  const canNext = (() => { if (step===1) return dimsOK; return true; })();

  // ── save / quote / pdf ──
  const buildConfig = () => ({
    product:'home_office', plan_version:'wizard-v1', room_type:room.name,
    wall:{ width_mm:dims.wallW, height_mm:dims.wallH, ceiling_mm:dims.ceiling }, openings,
    layout, layout_name:lay.name,
    desk:{ length_mm:desk.length, depth_mm:desk.depth, shape:desk.shape, worktop:wtop.name },
    storage:Object.entries(store).filter(([,v])=>v>0).map(([k,v])=>({ item:k, qty:v })),
    materials:{ carcass:carc.name, finish:fin.name, worktop:wtop.name },
    lighting:Object.keys(light).filter(k=>light[k]),
    modules:bom.map(b=>({ name:b.name, qty:b.qty, line_bhd:b.line })),
    estimate_bhd:grandTotal });

  const saveDesign = async () => {
    setBusy(true);
    try {
      const token = uid();
      const breakdown = { modules:blocksTotal, storage:storeTotal, lighting:lightTotal };
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:OFFICE_CATALOG_ANCHOR.id,
        customer_name:user?.name||null, customer_email:user?.email||null, customer_phone:user?.phone||null,
        product_name:`Home office — ${lay.name} (${(dims.wallW/1000).toFixed(1)}m wall)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdown, status:'office-plan', share_token:token, created_at:new Date().toISOString() }] });
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
      const breakdown = { modules:blocksTotal, storage:storeTotal, lighting:lightTotal };
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:OFFICE_CATALOG_ANCHOR.id,
        customer_name:c.name, customer_email:c.email||null, customer_phone:c.phone||null,
        product_name:`Home office — ${lay.name} (${(dims.wallW/1000).toFixed(1)}m wall)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdown, status:'office-plan', share_token:token, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const note = [`🖥️ Home Office Planner Wizard`, `Room: ${room.name}  ·  Wall ${dims.wallW}×${dims.wallH}mm`,
        `Layout: ${lay.name}  ·  ${bom.length} module lines`,
        `Desk: ${desk.length}×${desk.depth}mm ${desk.shape}  ·  ${wtop.name} worktop`,
        `Materials: ${carc.name} carcass · ${fin.name} finish`,
        `Indicative estimate: BHD ${grandTotal}`, c.date?`Preferred visit: ${c.date}`:'', `Plan ref: ${token}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:c.name, email:c.email||null, phone:c.phone||null,
        source:'website_office_planner', status:'New', stage:'New', platform:'Website', interest:'Home Office (planner wizard)',
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
      ...storeItems.map(s=>`<tr><td>${s.name} ×${s.qty}</td><td style="text-align:right">${fmt(s.line)}</td></tr>`),
      ...lightItems.map(l=>`<tr><td>${l.name}</td><td style="text-align:right">${fmt(l.line)}</td></tr>`),
    ].join('');
    w.document.write(`<html><head><title>Home Office Quotation</title><style>body{font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;color:#2a1f16;padding:36px;max-width:720px;margin:0 auto}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:14px}td{padding:8px 4px;border-bottom:1px solid #e3d6c6;font-size:13px}.tot{font-size:20px;font-weight:700;color:var(--clay-deep, #89391E);text-align:right;margin-top:16px}.muted{color:#8a7a68;font-size:12px}</style></head><body>
      <h1>The Closets — Home Office Quotation</h1>
      <p class="muted">${room.name} · ${lay.name} layout · Wall ${dims.wallW}×${dims.wallH}mm · ${carc.name} carcass · ${fin.name} finish · ${wtop.name} worktop</p>
      <p class="muted">Desk ${desk.length}×${desk.depth}mm · ${desk.shape}</p>
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
      case 0: return (<>{sectionH('1',t('shOf0t'),t('shOf0s'))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {OFFICE_ROOM_TYPES.map(r=>{ const on=roomType===r.id; return (
            <button key={r.id} type="button" onClick={()=>setRoomType(r.id)} style={card(on)}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5"><path d={r.ic} /></svg>
              <div style={{ fontSize:14, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', marginTop:6 }}>{trOpt(r.name, lang)}</div>
              <div style={{ fontSize:11.5, color:'var(--muted)' }}>{trOpt(r.sub, lang)}</div>
            </button>); })}
        </div></>);
      case 1: return (<>{sectionH('2',t('shOf1t'),t('shOf1s'))}
        <div style={{ display:'grid', gap:12 }}>
          {numField(t('fWallWidth'), dims.wallW, v=>setDims(d=>({...d,wallW:v})), 1000, 12000)}
          {numField(t('fWallHeight'), dims.wallH, v=>setDims(d=>({...d,wallH:v})), 2000, 5000)}
          {numField(t('fCeilingHeight'), dims.ceiling, v=>setDims(d=>({...d,ceiling:v})), 2000, 5000)}
          {!dimsOK && <div style={{ fontSize:12, color:'var(--danger,#b91c1c)' }}>Wall ≥1000mm wide, ≥2000mm tall, and ceiling ≥ wall height.</div>}
          <div style={{ fontSize:12, color:'var(--ink-soft)', background:'var(--sand)', borderRadius:10, padding:'8px 11px' }}>Recommended: worktop at 720–760mm, desk depth 600–700mm, knee clearance ≥600mm wide.</div>
        </div></>);
      case 2: return (<>{sectionH('3',t('shOpeningsT'),t('shOpeningsS'))}
        <div style={{ display:'grid', gap:9 }}>
          {openings.map(o=>(
            <div key={o.id} style={{ border:'1px solid var(--line)', borderRadius:11, padding:'9px 10px', background:'#fff' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr auto', gap:7, alignItems:'end' }}>
                <label><span style={labelS}>{t('fType')}</span>
                  <select value={o.type} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,type:e.target.value}:x))} style={inS}>{OFFICE_OPENING_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
                <label><span style={labelS}>{t('fPosition')}</span><input type="number" value={o.pos} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,pos:Number(e.target.value)}:x))} style={inS} /></label>
                <label><span style={labelS}>{t('fWidth')}</span><input type="number" value={o.width} onChange={e=>setOpenings(os=>os.map(x=>x.id===o.id?{...x,width:Number(e.target.value)}:x))} style={inS} /></label>
                <button type="button" onClick={()=>setOpenings(os=>os.filter(x=>x.id!==o.id))} style={{ background:'none', border:'1px solid var(--line)', borderRadius:9, padding:'9px 11px', cursor:'pointer', color:'var(--muted)' }}>✕</button>
              </div>
            </div>))}
          <button type="button" onClick={()=>setOpenings(os=>[...os,{ id:uid(), type:'Electrical outlet', pos:1900, width:150 }])} style={{ border:'1px dashed var(--line)', borderRadius:11, padding:'10px', background:'var(--sand)', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--clay-deep)' }}>{t('vAddOpeningConstraint')}</button>
        </div></>);
      case 3: return (<>{sectionH('4',t('shOf3t'),t('shOf3s'))}
        <button type="button" onClick={()=>setRdOpen(true)} className="btn-clay" style={{ borderRadius:12, marginBottom:16, display:'inline-flex', alignItems:'center', gap:8 }}>{t('pOpenRoomDesigner')}</button>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?14:18, marginBottom:18 }}>
          {officeLayoutsView.map(l=>{ const on=layout===l.id; return (
            <button key={l.id} type="button" onClick={()=>pickLayout(l.id)} style={{ ...card(on), padding:0, overflow:'hidden', textAlign:'left', borderRadius:16, boxShadow: on?'0 12px 32px rgba(194,65,28,.18)':'0 2px 14px rgba(33,28,24,.07)', transform: on?'translateY(-2px)':'none', transition:'transform .18s ease, box-shadow .18s ease' }}>
              <div style={{ position:'relative', width:'100%', background:'var(--cream,#f5f1ea)', overflow:'hidden', borderTopLeftRadius:16, borderTopRightRadius:16 }}>
                <img src={l.img} alt={l.name} {...layoutImgSize(l.img)} loading="lazy" decoding="async" style={{ display:'block', width:'100%', height:'auto' }} />
                {on && <div style={{ position:'absolute', top:10, right:10, background:'var(--clay)', color:'#fff', fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:999, letterSpacing:.3, boxShadow:'0 2px 8px rgba(0,0,0,.18)' }}>✓ Selected</div>}
              </div>
              <div style={{ padding: mobile?'13px 15px':'15px 17px', borderTop:'1px solid var(--line)' }}>
                <div style={{ fontSize: mobile?16:17, fontWeight:700, color:on?'var(--clay-deep)':'var(--ink)', lineHeight:1.22 }}>{trOpt(l.name, lang)}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{trOpt(l.sub, lang)}</div>
              </div>
            </button>); })}
        </div>
        <div style={{ background:'var(--sand)', borderRadius:12, padding:'13px 14px', marginBottom:12 }}>
          <div className="eyebrow" style={{ fontSize:11, marginBottom:6 }}>{lay.name}</div>
          <div style={{ fontSize:11.5, color:'var(--ink-soft)' }}>Includes: {lay.feats.join(' · ')}</div>
        </div>
        {/* modular blocks for this layout */}
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{t('pModularBlocks')}</div>
        <div style={{ display:'grid', gap:8 }}>
          {OFFICE_BLOCKS.map(b=>{ const q=blocks[b.id]||0; const on=q>0; const unit=carcassBlocks.includes(b.id)?Math.round(b.price*matMult):deskBlocks.includes(b.id)?Math.round(b.price*wtop.mult*carc.mult):b.price; return (
            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:9, border:on?'2px solid var(--clay)':'1px solid var(--line)', background:on?'var(--sand)':'#fff', borderRadius:11, padding:'8px 11px' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{trOpt(b.name, lang)}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{fmt(unit)} / unit</div></div>
              {stepper(q, v=>setBlock(b.id,v))}
            </div>); })}
        </div></>);
      case 4: return (<>{sectionH('5',t('shOf4t'),t('shOf4s'))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11, marginBottom:14 }}>
          {numField(t('fDeskLength'), desk.length, v=>setDesk(d=>({...d,length:v})), 600, 12000)}
          {numField(t('fDeskDepth'), desk.depth, v=>setDesk(d=>({...d,depth:v})), 400, 900)}
          <label style={{ gridColumn:'1/-1' }}><span style={labelS}>{t('fDeskShape')}</span>
            <select value={desk.shape} onChange={e=>setDesk(d=>({...d,shape:e.target.value}))} style={inS}>{OFFICE_DESK_SHAPES.map(s=><option key={s}>{s}</option>)}</select></label>
          {!deskOK && <div style={{ gridColumn:'1/-1', fontSize:11.5, color:'var(--danger,#b91c1c)' }}>⚠ Aim for desk depth 450–800mm and length ≥900mm.</div>}
          {deskOverWall && <div style={{ gridColumn:'1/-1', fontSize:11.5, color:'var(--danger,#b91c1c)' }}>⚠ Desk length exceeds wall width ({(dims.wallW/1000).toFixed(1)}m).</div>}
        </div>
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{t('gWorktopMaterial')}</div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(4,1fr)', gap:8 }}>
          {OFFICE_WORKTOPS.map(o=>{ const on=desk.worktop===o.id; return (
            <button key={o.id} type="button" onClick={()=>setDesk(d=>({...d,worktop:o.id}))} style={card(on)}>
              <div style={{ height:30, borderRadius:7, background:o.hex, marginBottom:6 }} />
              <div style={{ fontSize:13, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(o.name, lang)}</div>
              <div style={{ fontSize:10.5, color:'var(--muted)' }}>{trOpt(o.sub, lang)}</div>
            </button>); })}
        </div></>);
      case 5: return (<>{sectionH('6',t('shOf5t'),t('shOf5s'))}
        <div style={{ display:'grid', gap:9 }}>
          {OFFICE_STORAGE.map(s=>{ const q=store[s.id]||0; const on=q>0; return (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:9, border:on?'2px solid var(--clay)':'1px solid var(--line)', background:on?'var(--sand)':'#fff', borderRadius:11, padding:'9px 11px' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{trOpt(s.name, lang)}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{fmt(s.price)} / {s.unit}</div></div>
              {stepper(q, v=>setStore(st=>({...st,[s.id]:v})))}
            </div>); })}
        </div></>);
      case 6: return (<>{sectionH('7',t('shOf6t'),t('shOf6s'))}
        {[[t('gCarcass'),'carcass',OFFICE_CARCASS],[t('gFinish'),'finish',OFFICE_FINISH]].map(([title,key,list])=>(
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
      case 7: return (<>{sectionH('8',t('shOf7t'),t('shOf7s'))}
        <div style={{ display:'grid', gap:8 }}>
          {OFFICE_LIGHTING.map(l=>toggleRow(light[l.id], ()=>setLight(s=>({...s,[l.id]:!s[l.id]})), l.name, `adds ${fmt(l.price)}`))}
        </div></>);
      case 8: return (<>{sectionH('9',t('shSummaryT'),t('shSummaryS'))}
        <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'8px 12px', background:'var(--sand)', fontSize:11.5, fontWeight:700, color:'var(--ink-soft)' }}>{t('pBillOfMaterials')}</div>
          {bom.map(b=>(<div key={b.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{b.name} ×{b.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(b.line)}</span></div>))}
          {storeItems.map(s=>(<div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{s.name} ×{s.qty}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(s.line)}</span></div>))}
          {lightItems.map(l=>(<div key={l.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{l.name}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(l.line)}</span></div>))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderTop:'2px solid var(--line)', background:'var(--sand)' }}><span style={{ fontWeight:700, color:'var(--ink)' }}>{t('pEstimatedTotal')}</span><span className="display" style={{ fontSize:19, color:'var(--clay-deep)' }}>{fmt(grandTotal)}</span></div>
        </div>
        <div style={{ background:'rgba(8,145,178,.08)', borderRadius:10, padding:'9px 12px', fontSize:12.5, color:'#0e7490', marginBottom:12 }}>
          Work guidance: set the worktop at 720–760mm, allow ≥600mm knee clearance, and run a dedicated outlet + cable tray behind the desk. Tall units fix to a timber sub-frame.
        </div>
        {deskOverWall && <div style={{ fontSize:12.5, color:'var(--danger,#b91c1c)', marginBottom:12 }}>⚠ Desk length exceeds the wall — reduce length or widen the wall.</div>}
        <div style={{ display:'grid', gap:8 }}>
          <button type="button" disabled={busy} onClick={saveDesign} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:11, padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pSaveDesign')}</button>
          <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:11 }}>{user?t('pGetQuoteArrow'):t('pSignInQuoteArrow')}</button>
          <button type="button" onClick={downloadPDF} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:11, padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pDownloadPdf')}</button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
            {[['AI layout suggestions'],['Drag-and-drop modules'],['Ergonomic check'],['AR room preview'],['Manufacturing drawings'],['CNC cut list export']].map(([t])=>(
              <button key={t} type="button" disabled title="Coming soon" style={{ border:'1px dashed var(--line)', background:'var(--sand)', borderRadius:10, padding:'9px', fontSize:11.5, color:'var(--muted)', cursor:'not-allowed' }}>{t} · soon</button>))}
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
      <div style={{ background:'var(--sand)', borderRadius:12, overflow:'hidden', flex:1, minHeight:0 }}>{elevation(h)}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{lay.name} · {desk.shape} desk · {(dims.wallW/1000).toFixed(1)}m wall</span>
        <span className="display" style={{ fontSize:20, color:'var(--clay)' }}>{fmt(grandTotal)}</span>
      </div>
      {deskOverWall && <div style={{ fontSize:11, color:'var(--danger,#b91c1c)', background:'rgba(220,38,38,.08)', borderRadius:8, padding:'6px 9px' }}>⚠ Desk wider than the wall.</div>}
    </div>
  );

  // ── APP SHELL (fit-to-viewport) ──
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
              {previewPane('100%')}
            </div>
          </div>
        )}
        {/* mobile collapsible preview */}
        {mobile && showPrev && (
          <div style={{ flexShrink:0, padding:'10px 14px', borderTop:'1px solid var(--line)', background:'#fff' }}>
            <div style={{ height:210 }}>{previewPane(200)}</div>
          </div>
        )}
      </div>

      {/* bottom action bar */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'9px 14px calc(9px + env(safe-area-inset-bottom))', borderTop:'1px solid var(--line)', background:'rgba(255,255,255,.97)', backdropFilter:'blur(10px)' }}>
        {step>0 ? <button type="button" onClick={back} style={{ background:'none', border:'1px solid var(--line)', borderRadius:11, padding:'10px 16px', fontSize:13.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pBack')}</button>
          : <button type="button" onClick={()=>setPage('office')} style={{ background:'none', border:'1px solid var(--line)', borderRadius:11, padding:'10px 16px', fontSize:13, color:'var(--muted)', cursor:'pointer' }}>{t('pExit')}</button>}
        {mobile && <button type="button" onClick={()=>setShowPrev(v=>!v)} style={{ background:'var(--sand)', border:'none', borderRadius:11, padding:'10px 12px', fontSize:12.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{showPrev?t('pHide'):t('pPreview')}</button>}
        <div style={{ flex:1, textAlign: mobile?'center':'right', minWidth:0 }}><span style={{ fontSize:10.5, color:'var(--muted)' }}>{t('pTotal')} </span><span className="display" style={{ fontSize:17, color:'var(--clay)' }}>{fmt(grandTotal)}</span></div>
        {step<STEPS.length-1
          ? <button type="button" className="btn-clay" disabled={!canNext} onClick={next} style={{ borderRadius:11, minWidth:120, opacity:canNext?1:.55 }}>{t('pNextArrow')}</button>
          : <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:11, minWidth:120 }}>{t('pGetQuoteArrow')}</button>}
      </div>

      {rdOpen && (
        <RoomDesigner
          mobile={mobile}
          category="office"
          sceneShapeFallback={layout}
          dimensions={{ wallWidthMm: dims.wallW, wallHeightMm: dims.wallH, deskMm: desk.length }}
          onClose={()=>setRdOpen(false)}
          onGoToSummary={()=>setRdOpen(false)}
          photorealReq={{ product:'office', getImage:()=>null }}
          indicativeTotal={null}
        />
      )}
      {/* QUOTE modal */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowQuote(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:420, width:'100%', padding:24 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 6px' }}>{t('pQuoteTitleOffice')}</h3>
            <div style={{ background:'var(--sand)', borderRadius:12, padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)' }}>{lay.name} · {desk.shape} desk · {fin.name} · <b style={{ color:'var(--clay-deep)' }}>{fmt(grandTotal)}</b></div>
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

export { OfficePlannerWizard };
