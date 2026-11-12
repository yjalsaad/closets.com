// Route chunk "DoorPlannerWizard" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DoorPlannerWizard.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { validateForm } from '../forms/validate';
import { ModalPanel } from '../a11y/dialog';
import FormNotice from '../privacy/FormNotice';
import { api, fmt, toast, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { DOOR_TYPES, DOOR_WOODS } from './shared_DoorPlannerWizard_DoorsPage';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';
import { trStep } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus3';
import { RoomDesigner } from './shared_PlannerPage_TVUnitPlannerWizard_plus4';
import { layoutImgSize } from '../layoutDims';

// Quick-start priority configurations (Step 1 cards)
const DOOR_PRESETS = [
  { id:'flush',   name:'Flush Interior Door', sub:'Simplest modern leaf', type:'single',  loc:'bedroom', core:'hollow',     style:'flush',  finish:'oak',    surface:'veneer' },
  { id:'groove',  name:'Groove Modern Door',  sub:'Routed groove lines',  type:'single',  loc:'bedroom', core:'semi',       style:'groove', finish:'walnut', surface:'veneer' },
  { id:'slide',   name:'Sliding Door',        sub:'Track-mounted leaf',   type:'sliding', loc:'office',  core:'semi',       style:'flush',  finish:'ash',    surface:'laminate' },
  { id:'majlis',  name:'Double Majlis Door',  sub:'Twin grand leaves',    type:'double',  loc:'majlis',  core:'solid',      style:'panels', finish:'teak',   surface:'lacquer' },
  { id:'pivot',   name:'Pivot Entrance Door', sub:'Architectural pivot',  type:'pivot',   loc:'entrance',core:'solid',      style:'slat',   finish:'ebony',  surface:'pu' },
  { id:'concealed',name:'Hidden Door System', sub:'Flush, frameless look',type:'hidden',  loc:'office',  core:'semi',       style:'flush',  finish:'oak',    surface:'melamine' },
];

// Location → recommended dims (mm) + sensible defaults
const DOOR_LOCATIONS = [
  { id:'entrance', name:'Main entrance', sub:'Front of the home',  w:1100, h:2700, wMin:1000, wMax:1400, hMin:2400, hMax:3200, ic:'M3 21V8l9-5 9 5v13M9 21v-7h6v7' },
  { id:'bedroom',  name:'Bedroom',       sub:'Private rooms',      w:850,  h:2200, wMin:800,  wMax:900,  hMin:2100, hMax:2400, ic:'M3 18v-6h18v6M3 12V8a2 2 0 012-2h6v6' },
  { id:'bathroom', name:'Bathroom',      sub:'Wet areas',          w:750,  h:2200, wMin:700,  wMax:800,  hMin:2100, hMax:2400, ic:'M4 12h16v4a4 4 0 01-4 4H8a4 4 0 01-4-4zM6 12V6a2 2 0 014 0' },
  { id:'kitchen',  name:'Kitchen',       sub:'Cooking spaces',     w:850,  h:2200, wMin:800,  wMax:1000, hMin:2100, hMax:2400, ic:'M4 7h16v12H4zM4 11h16' },
  { id:'office',   name:'Office',        sub:'Study / work room',  w:850,  h:2200, wMin:800,  wMax:1000, hMin:2100, hMax:2400, ic:'M4 7h16v12H4zM9 7V5h6v2' },
  { id:'majlis',   name:'Majlis',        sub:'Formal reception',   w:1600, h:2700, wMin:1400, wMax:2000, hMin:2400, hMax:3200, ic:'M3 17v-5a2 2 0 012-2h14a2 2 0 012 2v5M3 17h18' },
  { id:'utility',  name:'Utility room',  sub:'Laundry / store',    w:750,  h:2100, wMin:700,  wMax:900,  hMin:2000, hMax:2400, ic:'M5 4h14v16H5zM12 8a4 4 0 100 8 4 4 0 000-8z' },
];

// Swing/slide direction options
const DOOR_DIR_SWING = [
  { id:'lhi', name:'Left Hand In',  hinge:'left',  way:'in'  },
  { id:'rhi', name:'Right Hand In', hinge:'right', way:'in'  },
  { id:'lho', name:'Left Hand Out', hinge:'left',  way:'out' },
  { id:'rho', name:'Right Hand Out',hinge:'right', way:'out' },
];

const DOOR_DIR_SLIDE = [
  { id:'sl', name:'Slide Left',     dir:'left'   },
  { id:'sr', name:'Slide Right',    dir:'right'  },
  { id:'sc', name:'Center opening', dir:'center' },
];

// Construction
const DOOR_CORES = [
  { id:'hollow', name:'Hollow',     sub:'Light interior core',     mult:1.00, dens:7,  base:55  },
  { id:'semi',   name:'Semi-solid', sub:'Tubular / honeycomb',     mult:1.20, dens:16, base:90  },
  { id:'solid',  name:'Solid',      sub:'Solid timber / MDF core', mult:1.55, dens:30, base:150 },
  { id:'fire',   name:'Fire-rated', sub:'60-min certified core',   mult:1.95, dens:38, base:240 },
];

const DOOR_FRAMES = [
  { id:'standard', name:'Standard',         sub:'Timber lining + architrave', price:60  },
  { id:'hidden',   name:'Hidden',           sub:'Concealed aluminium jamb',   price:180 },
  { id:'aluminum', name:'Aluminum',         sub:'Powder-coated alloy',        price:140 },
  { id:'steel',    name:'Steel-reinforced', sub:'For heavy / security leaves',price:220 },
];

const DOOR_SURFACES = [
  { id:'veneer',   name:'Veneer',       sub:'Real wood veneer', mult:1.15 },
  { id:'laminate', name:'Laminate',     sub:'Durable HPL',      mult:1.00 },
  { id:'melamine', name:'Melamine',     sub:'Budget faced',     mult:0.92 },
  { id:'lacquer',  name:'Lacquer paint',sub:'Smooth sprayed',   mult:1.25 },
  { id:'pu',       name:'PU paint',     sub:'Premium PU finish',mult:1.35 },
];

// Design styles
const DOOR_STYLES = [
  { id:'flush',  group:'Modern',  name:'Flush',              sub:'Smooth flat leaf',     add:0   },
  { id:'groove', group:'Modern',  name:'Groove lines',       sub:'Routed grooves',       add:35  },
  { id:'slat',   group:'Modern',  name:'Slatted',            sub:'Vertical slats',       add:70  },
  { id:'panels', group:'Classic', name:'Raised panels',      sub:'Framed panels',        add:90  },
  { id:'mould',  group:'Classic', name:'Decorative mouldings',sub:'Ornate trims',        add:130 },
  { id:'inlay',  group:'Luxury',  name:'Metal inlays',       sub:'Brass / steel lines',  add:180 },
  { id:'stone',  group:'Luxury',  name:'Stone inserts',      sub:'Marble accents',       add:260 },
  { id:'leather',group:'Luxury',  name:'Leather panels',     sub:'Upholstered panels',   add:240 },
  { id:'glassp', group:'Luxury',  name:'Glass inserts',      sub:'Decorative glazing',   add:160 },
];

// Glass
const DOOR_GLASS = [
  { id:'none',   name:'No glass',             price:0,   kind:'none'   },
  { id:'vstrip', name:'Vertical glass strip', price:90,  kind:'vstrip' },
  { id:'hstrip', name:'Horizontal glass strip',price:90, kind:'hstrip' },
  { id:'full',   name:'Full glass panel',     price:220, kind:'full'   },
  { id:'frost',  name:'Frosted',              price:130, kind:'full'   },
  { id:'smoke',  name:'Smoked',               price:150, kind:'full'   },
];

// Hardware
const DOOR_HINGES = [
  { id:'standard', name:'Standard',  price:18,  maxKg:40 },
  { id:'concealed',name:'Concealed', price:55,  maxKg:80 },
  { id:'pivot',    name:'Pivot',     price:180, maxKg:200 },
];

const DOOR_LOCKS = [
  { id:'standard', name:'Standard',  price:25 },
  { id:'privacy',  name:'Privacy',   price:35 },
  { id:'smart',    name:'Smart',     price:160 },
  { id:'mortise',  name:'Mortise',   price:70 },
];

const DOOR_HANDLES = [
  { id:'lever', name:'Lever',       price:30 },
  { id:'pull',  name:'Pull',        price:55 },
  { id:'plate', name:'Push plate',  price:25 },
];

// Accessories (toggles)
const DOOR_ACCESSORIES = [
  { id:'stopper',  name:'Door stopper',        price:8   },
  { id:'dropseal', name:'Automatic drop seal', price:35  },
  { id:'softclose',name:'Soft close',          price:45  },
  { id:'finger',   name:'Finger protection',   price:30  },
  { id:'sound',    name:'Sound insulation',    price:60  },
  { id:'fireseal', name:'Fire seal',           price:25  },
];

const DOOR_CATALOG_ANCHOR = { id:'wp-door-01', name:'Bespoke Wood Door' };

function DoorPlannerWizard({ setPage, user, openAuth }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const { map: dbLayouts } = useLayouts('door');
  // DISPLAY-ONLY merge: leaves / mode / presets stay on DOOR_TYPES.
  const doorTypesView = DOOR_TYPES.map(t => mergeLayout(t, dbLayouts));
  const [step, setStep] = useState(0);
  // Step 1
  const [rdOpen, setRdOpen] = useState(false);
  const [doorType, setDoorType] = useState('single');
  // Step 2
  const [location, setLocation] = useState('bedroom');
  // Step 3
  const [dims, setDims] = useState({ w:850, h:2200, wall:120, floor:20 });
  // Step 4
  const [dir, setDir] = useState('rhi');     // swing dir id
  const [slideDir, setSlideDir] = useState('sr');
  // Step 5
  const [core, setCore] = useState('semi');
  const [frame, setFrame] = useState('standard');
  // Step 6
  const [wood, setWood] = useState('oak');
  const [surface, setSurface] = useState('veneer');
  // Step 7
  const [styleId, setStyleId] = useState('flush');
  // Step 8
  const [glass, setGlass] = useState('none');
  // Step 9
  const [hinge, setHinge] = useState('standard');
  const [lock, setLock] = useState('standard');
  const [handle, setHandle] = useState('lever');
  // Step 10
  const [acc, setAcc] = useState({});
  // preview / submit
  const [showPrev, setShowPrev] = useState(!mobile);
  const [busy, setBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const dt   = DOOR_TYPES.find(t=>t.id===doorType) || DOOR_TYPES[0];
  const loc  = DOOR_LOCATIONS.find(l=>l.id===location) || DOOR_LOCATIONS[1];
  const cr   = DOOR_CORES.find(c=>c.id===core) || DOOR_CORES[0];
  const fr   = DOOR_FRAMES.find(f=>f.id===frame) || DOOR_FRAMES[0];
  const wd   = DOOR_WOODS.find(w=>w.id===wood) || DOOR_WOODS[0];
  const sf   = DOOR_SURFACES.find(s=>s.id===surface) || DOOR_SURFACES[0];
  const st   = DOOR_STYLES.find(s=>s.id===styleId) || DOOR_STYLES[0];
  const gl   = DOOR_GLASS.find(g=>g.id===glass) || DOOR_GLASS[0];
  const hg   = DOOR_HINGES.find(h=>h.id===hinge) || DOOR_HINGES[0];
  const lk   = DOOR_LOCKS.find(l=>l.id===lock) || DOOR_LOCKS[0];
  const hd   = DOOR_HANDLES.find(h=>h.id===handle) || DOOR_HANDLES[0];
  const swing = DOOR_DIR_SWING.find(d=>d.id===dir) || DOOR_DIR_SWING[1];
  const slide = DOOR_DIR_SLIDE.find(d=>d.id===slideDir) || DOOR_DIR_SLIDE[1];
  const isSlide = dt.mode==='slide';
  const leaves = dt.leaves;

  // ── apply a quick-start preset ──
  const applyPreset = (p) => {
    setDoorType(p.type); setLocation(p.loc); setCore(p.core); setStyleId(p.style);
    setWood(p.finish); setSurface(p.surface);
    const L = DOOR_LOCATIONS.find(l=>l.id===p.loc); if (L) setDims(d=>({ ...d, w:L.w, h:L.h }));
    setStep(1);
  };
  // selecting a location prefills recommended dimensions
  const pickLocation = (id) => {
    setLocation(id);
    const L = DOOR_LOCATIONS.find(l=>l.id===id);
    if (L) setDims(d=>({ ...d, w:L.w, h:L.h }));
  };

  // ── leaf weight estimate (kg): area m² × core density × thickness factor ──
  const leafAreaM2 = (dims.w/1000) * (dims.h/1000);
  const leafThick = cr.id==='hollow'?35:cr.id==='semi'?40:45;     // mm
  const leafWeight = Math.round(leafAreaM2 * cr.dens * (leafThick/40) * leaves);
  const isHeavy = leafWeight > 45;
  // smart hardware recommendation
  const recHinge = leafWeight>90 ? 'pivot' : leafWeight>45 ? 'concealed' : 'standard';
  const recFrame = leafWeight>90 ? 'steel' : leafWeight>55 ? 'aluminum' : 'standard';
  const hingeOK = leafWeight <= hg.maxKg;
  const frameLight = isHeavy && frame==='standard';

  // ── validation ──
  const dimWarn = [];
  if (dims.w < loc.wMin || dims.w > loc.wMax) dimWarn.push(`Width ${dims.w}mm is outside the ${loc.name} range (${loc.wMin}–${loc.wMax}mm).`);
  if (dims.h < loc.hMin || dims.h > loc.hMax) dimWarn.push(`Height ${dims.h}mm is outside the ${loc.name} range (${loc.hMin}–${loc.hMax}mm).`);
  if (doorType==='pivot' && (dims.w<1200 || dims.h<2700)) dimWarn.push('Pivot doors are usually ≥1200×2700mm.');
  if (doorType==='double' && dims.w<1400) dimWarn.push('Double doors are usually ≥1400mm wide.');
  const dimsValid = dims.w>=600 && dims.h>=1800 && dims.wall>=70 && dims.floor>=0;
  if (dims.w<600 || dims.h<1800) dimWarn.push('Minimum sensible opening is 600×1800mm.');
  if (dims.wall<70) dimWarn.push('Wall thickness below 70mm is unusual for a framed door.');

  // ── BOM + cost (BHD) ──
  const LEAF_RATE = 130;                                            // per m² base
  const leafUnit = Math.round((cr.base + leafAreaM2*LEAF_RATE) * cr.mult * wd.mult * sf.mult);
  const leafTotal = leafUnit * leaves;
  const frameTotal = Math.round(fr.price * (dims.h/2100) * (leaves>1?1.4:1));
  const finishTotal = st.add;                                       // style surcharge
  const glassTotal = gl.price * (gl.id==='none'?0:1) * (gl.kind==='full'?leaves:1);
  const hingeQty = (recHinge==='pivot'||hinge==='pivot') ? leaves : Math.max(2, Math.ceil(dims.h/750)) * leaves;
  const hingeTotal = hg.price * hingeQty;
  const lockTotal = lk.price;
  const handleTotal = hd.price * leaves;
  const hardwareTotal = hingeTotal + lockTotal + handleTotal;
  const accItems = DOOR_ACCESSORIES.filter(a=>acc[a.id]).map(a=>({ ...a, qty:1, line:a.price }));
  const accTotal = accItems.reduce((s,a)=>s+a.line,0);
  const grandTotal = leafTotal + frameTotal + finishTotal + glassTotal + hardwareTotal + accTotal;

  // ── styles (mirror kitchen / tv wizards) ──
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
  const toggleRow = (on, set, name, sub) => (
    <button type="button" onClick={set} style={{ ...card(on), display:'flex', alignItems:'center', justifyContent:'space-between', gap:9 }}>
      <span><span style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', display:'block' }}>{name}</span>{sub&&<span style={{ fontSize:11, color:'var(--muted)' }}>{sub}</span>}</span>
      <span style={{ width:38, height:22, borderRadius:'var(--radius-md)', background:on?'var(--clay)':'var(--line)', position:'relative', flexShrink:0, transition:'background .15s' }}>
        <span style={{ position:'absolute', top:2, left:on?18:2, width:18, height:18, borderRadius:'50%', background:'var(--c-surface)', transition:'left .15s' }} /></span>
    </button>
  );

  // ── 2D DOOR ELEVATION (front view, mm → px) ──
  const elevation = (h) => {
    const W = Math.max(500, dims.w), H = Math.max(1500, dims.h);
    const pad = 34, vw = 320, vh = 250;
    const fr2 = 26;                                         // frame jamb thickness in px-space basis
    const sc = Math.min((vw-pad*2)/(W+220), (vh-pad*2)/(H+200));
    const lw = W*sc, lh = H*sc;
    const ox = (vw-lw)/2, oy = (vh-lh)/2 + 4;
    const jamb = Math.max(7, fr2*sc*4);                     // visible frame width
    // hinge side: for swing left-hand → hinge on left; handle opposite
    const hingeLeft = isSlide ? (slide.dir!=='right') : (swing.hinge==='left');
    const handleLeft = !hingeLeft;
    const leafW = leaves>1 ? lw/2 : lw;
    const woodHex = wd.hex;
    // glass insert rect (within a leaf area)
    const glassRect = (lx, lwid) => {
      if (gl.kind==='none') return null;
      const op = (gl.id==='frost'||gl.id==='smoke') ? 0.55 : 0.8;
      const gcol = gl.id==='smoke' ? '#3b4453' : gl.id==='frost' ? '#dfe7ea' : '#bcd6e0';
      if (gl.kind==='vstrip') { const gw=lwid*0.16; const gx = handleLeft ? lx+lwid*0.10 : lx+lwid*0.74; return <rect x={gx} y={oy+lh*0.10} width={gw} height={lh*0.80} fill={gcol} fillOpacity={op} stroke="#7c95a0" strokeWidth="1" />; }
      if (gl.kind==='hstrip') return <rect x={lx+lwid*0.12} y={oy+lh*0.14} width={lwid*0.76} height={lh*0.14} fill={gcol} fillOpacity={op} stroke="#7c95a0" strokeWidth="1" />;
      return <rect x={lx+lwid*0.12} y={oy+lh*0.10} width={lwid*0.76} height={lh*0.80} fill={gcol} fillOpacity={op} stroke="#7c95a0" strokeWidth="1" />;
    };
    // design-style overlay drawn per leaf
    const styleOverlay = (lx, lwid, key) => {
      const els = [];
      if (st.id==='groove') for (let i=1;i<=3;i++) els.push(<line key={key+'g'+i} x1={lx+lwid*0.18} y1={oy+lh*(0.18+i*0.2)} x2={lx+lwid*0.82} y2={oy+lh*(0.18+i*0.2)} stroke="#00000022" strokeWidth="2" />);
      if (st.id==='slat') for (let i=1;i<7;i++) els.push(<line key={key+'s'+i} x1={lx+lwid*(i/7)} y1={oy+lh*0.06} x2={lx+lwid*(i/7)} y2={oy+lh*0.94} stroke="#0000001f" strokeWidth="2" />);
      if (st.id==='panels'||st.id==='mould') { els.push(<rect key={key+'p1'} x={lx+lwid*0.16} y={oy+lh*0.10} width={lwid*0.68} height={lh*0.34} fill="none" stroke="#00000033" strokeWidth={st.id==='mould'?3:2} rx="2" />); els.push(<rect key={key+'p2'} x={lx+lwid*0.16} y={oy+lh*0.52} width={lwid*0.68} height={lh*0.38} fill="none" stroke="#00000033" strokeWidth={st.id==='mould'?3:2} rx="2" />); }
      if (st.id==='inlay') { els.push(<rect key={key+'i'} x={lx+lwid*0.20} y={oy+lh*0.12} width={lwid*0.60} height={lh*0.76} fill="none" stroke="#c79a3c" strokeWidth="2.5" />); }
      if (st.id==='stone') els.push(<rect key={key+'st'} x={lx+lwid*0.22} y={oy+lh*0.30} width={lwid*0.56} height={lh*0.40} fill="#d9d4cc" stroke="#9a8f7e" strokeWidth="1" />);
      if (st.id==='leather') els.push(<rect key={key+'le'} x={lx+lwid*0.18} y={oy+lh*0.12} width={lwid*0.64} height={lh*0.76} fill="#5c4636" fillOpacity="0.55" stroke="#3a2c22" strokeWidth="1" />);
      return els;
    };
    const handleY = oy + lh*0.5;
    return (
      <svg viewBox={`0 0 ${vw} ${vh}`} style={{ width:'100%', height:h, display:'block', background:'#fbf8f3' }} aria-label="Door elevation">
        {/* floor line */}
        <line x1={ox-jamb-14} y1={oy+lh+6} x2={ox+lw+jamb+14} y2={oy+lh+6} stroke="#9a6a3c" strokeWidth="3" />
        {/* frame (outer) */}
        <rect x={ox-jamb} y={oy-jamb} width={lw+jamb*2} height={lh+jamb} fill="none" stroke={fr.id==='hidden'?'#c9bfae':'#8a5a32'} strokeWidth={jamb} strokeOpacity={fr.id==='hidden'?0.5:1} />
        {/* leaves */}
        {Array.from({length:leaves}).map((_,i)=>{
          const lx = ox + (leaves>1 ? i*leafW : 0);
          return (<g key={i}>
            <rect x={lx} y={oy} width={leafW} height={lh} fill={woodHex} stroke="#00000022" strokeWidth="1" />
            {styleOverlay(lx, leafW, 'L'+i)}
            {glassRect(lx, leafW)}
          </g>);
        })}
        {/* centre meeting line for double/folding */}
        {leaves>1 && <line x1={ox+lw/2} y1={oy} x2={ox+lw/2} y2={oy+lh} stroke="#00000033" strokeWidth="1.5" />}
        {/* handle on correct side */}
        {(() => {
          const hx = leaves>1 ? (ox+lw/2 + (handleLeft?-10:6)) : (handleLeft ? ox+8 : ox+lw-12);
          if (hd.id==='plate') return <rect x={hx-3} y={handleY-22} width={6} height={44} fill="#3a3a3c" rx="2" />;
          if (hd.id==='pull') return <rect x={hx-2} y={handleY-30} width={4} height={60} fill="#b8b2a6" rx="2" />;
          return <g><circle cx={hx} cy={handleY} r="3.5" fill="#3a3a3c" /><rect x={hx-(handleLeft?14:0)} y={handleY-2} width={14} height={4} fill="#3a3a3c" rx="2" /></g>;
        })()}
        {/* direction indicator */}
        {!isSlide ? (() => {
          // swing arc from hinge side; dashed for "out", solid for "in"
          const hingeX = hingeLeft ? ox : ox+lw;
          const sweep = hingeLeft ? 0 : 1;
          const r = lw*0.62;
          const endX = hingeX + (hingeLeft?1:-1)*r*0.72;
          const endY = oy+lh - r*0.5;
          return <g stroke="#0891b2" fill="none" strokeWidth="1.6" strokeDasharray={swing.way==='out'?'5 4':'0'}>
            <path d={`M ${hingeX} ${oy+lh} A ${r} ${r} 0 0 ${sweep} ${endX} ${endY}`} />
            <text x={(hingeX+endX)/2} y={endY+12} fontSize="8" fill="#0891b2" stroke="none" textAnchor="middle">{swing.way==='in'?'IN':'OUT'}</text>
          </g>;
        })() : (() => {
          const arrows = slide.dir==='center' ? [[-1],[1]] : [[slide.dir==='left'?-1:1]];
          return <g stroke="#0891b2" strokeWidth="1.8" fill="none">{arrows.map((a,ix)=>{ const cy=oy-jamb-8; const cxs= slide.dir==='center'? (ix?ox+lw*0.7:ox+lw*0.3):ox+lw*0.5; const dx=a[0]*22; return <g key={ix}><line x1={cxs} y1={cy} x2={cxs+dx} y2={cy} /><polyline points={`${cxs+dx-(a[0]*6)},${cy-4} ${cxs+dx},${cy} ${cxs+dx-(a[0]*6)},${cy+4}`} /></g>; })}<text x={ox+lw/2} y={oy-jamb-14} fontSize="8" fill="#0891b2" stroke="none" textAnchor="middle">{slide.name}</text></g>;
        })()}
        {/* dimension labels */}
        <text x={ox+lw/2} y={oy+lh+18} fontSize="9" fill="#9a6a3c" textAnchor="middle">{dims.w} mm</text>
        <text x={ox-jamb-10} y={oy+lh/2} fontSize="9" fill="#9a6a3c" textAnchor="middle" transform={`rotate(-90 ${ox-jamb-10} ${oy+lh/2})`}>{dims.h} mm</text>
      </svg>
    );
  };

  // ── steps meta ──
  const STEPS = ['Type','Location','Opening','Direction','Construction','Finish','Style','Glass','Hardware','Accessories','Quote'];
  const next = () => setStep(s=>Math.min(STEPS.length-1, s+1));
  const back = () => setStep(s=>Math.max(0, s-1));
  const canNext = (() => { if (step===2) return dimsValid; return true; })();

  // ── config / save / quote / pdf ──
  const buildConfig = () => ({
    product:'wood_door', plan_version:'wizard-v1',
    door_type:dt.name, location:loc.name,
    opening:{ width_mm:dims.w, height_mm:dims.h, wall_mm:dims.wall, floor_mm:dims.floor },
    direction: isSlide ? slide.name : swing.name,
    construction:{ core:cr.name, frame:fr.name, leaf_weight_kg:leafWeight, leaves },
    finish:{ wood:wd.name, surface:sf.name }, design_style:st.name,
    glass:gl.name,
    hardware:{ hinge:hg.name, hinge_qty:hingeQty, lock:lk.name, handle:hd.name },
    accessories:accItems.map(a=>a.name),
    recommendation:{ hinge:DOOR_HINGES.find(h=>h.id===recHinge)?.name, frame:DOOR_FRAMES.find(f=>f.id===recFrame)?.name, heavy:isHeavy },
    validation:{ dims_valid:dimsValid, warnings:dimWarn },
    estimate_bhd:grandTotal });
  const breakdown = () => ({ leaf:leafTotal, frame:frameTotal, finish:finishTotal, glass:glassTotal, hardware:hardwareTotal, accessories:accTotal });

  const saveDesign = async () => {
    setBusy(true);
    try {
      const token = uid();
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:DOOR_CATALOG_ANCHOR.id,
        customer_name:user?.name||null, customer_email:user?.email||null, customer_phone:user?.phone||null,
        product_name:`Wood door — ${dt.name} (${dims.w}×${dims.h}mm)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdown(), status:'door-plan', share_token:token, created_at:new Date().toISOString() }] });
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
      await api('product_configurations', { method:'POST', body:[{ id:token, customer_id:user?.id||null, product_id:DOOR_CATALOG_ANCHOR.id,
        customer_name:c.name, customer_email:c.email||null, customer_phone:c.phone||null,
        product_name:`Wood door — ${dt.name} (${dims.w}×${dims.h}mm)`, configuration:buildConfig(), total_price:grandTotal,
        price_breakdown:breakdown(), status:'door-plan', share_token:token, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const note = [`🚪 Wood Door Planner Wizard`, `Type: ${dt.name}  ·  ${loc.name}  ·  ${dims.w}×${dims.h}mm`,
        `Construction: ${cr.name} core · ${fr.name} frame · ${leafWeight}kg leaf`,
        `Finish: ${wd.name} · ${sf.name} · ${st.name} style · ${gl.name}`,
        `Hardware: ${hg.name} hinges ×${hingeQty} · ${lk.name} lock · ${hd.name} handle`,
        `Indicative estimate: BHD ${grandTotal}`, c.date?`Preferred visit: ${c.date}`:'', `Plan ref: ${token}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:c.name, email:c.email||null, phone:c.phone||null,
        source:'website_door_planner', status:'New', stage:'New', platform:'Website', interest:'Wood Door (planner wizard)',
        budget:grandTotal, value:grandTotal, notes:note, created_at:new Date().toISOString() }] });
      toast(t('w4QuoteSentDoor'),'success');
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
      `<tr><td>Door leaf — ${cr.name} core, ${wd.name} ${sf.name} ×${leaves}</td><td style="text-align:right">${fmt(leafTotal)}</td></tr>`,
      `<tr><td>Frame — ${fr.name}</td><td style="text-align:right">${fmt(frameTotal)}</td></tr>`,
      finishTotal>0?`<tr><td>Design style — ${st.name}</td><td style="text-align:right">${fmt(finishTotal)}</td></tr>`:'',
      glassTotal>0?`<tr><td>Glass — ${gl.name}</td><td style="text-align:right">${fmt(glassTotal)}</td></tr>`:'',
      `<tr><td>Hardware — ${hg.name} hinges ×${hingeQty}, ${lk.name} lock, ${hd.name} handle</td><td style="text-align:right">${fmt(hardwareTotal)}</td></tr>`,
      ...accItems.map(a=>`<tr><td>${a.name}</td><td style="text-align:right">${fmt(a.line)}</td></tr>`),
    ].filter(Boolean).join('');
    w.document.write(`<html><head><title>Wood Door Quotation</title><style>body{font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;color:#2a1f16;padding:36px;max-width:720px;margin:0 auto}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:14px}td{padding:8px 4px;border-bottom:1px solid #e3d6c6;font-size:13px}.tot{font-size:20px;font-weight:700;color:var(--clay-deep);text-align:right;margin-top:16px}.muted{color:#8a7a68;font-size:12px}</style></head><body>
      <h1>The Closets — Wood Door Quotation</h1>
      <p class="muted">${dt.name} · ${loc.name} · ${dims.w}×${dims.h}mm · ${cr.name} core · ${fr.name} frame · ${st.name} style</p>
      <p class="muted">Finish: ${wd.name} ${sf.name} · Glass: ${gl.name} · Leaf weight ≈ ${leafWeight}kg · Direction: ${isSlide?slide.name:swing.name}</p>
      <table><tbody>${rows}</tbody></table>
      <div class="tot">Estimated total: ${fmt(grandTotal)}</div>
      <p class="muted" style="margin-top:24px">Indicative guide price. A free design visit confirms exact measurements and a fully itemised quote.</p>
      </body></html>`);
    w.document.close();
    setTimeout(()=>{ try{ w.print(); }catch(e){} }, 350);
  };

  // ── PREVIEW pane (shared) ──
  const previewPane = (h) => (
    <div style={{ display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'.05em' }}>Live elevation</div>
      <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', overflow:'hidden', flex:1, minHeight:0 }}>{elevation(h)}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{dt.name} · {st.name} · ≈{leafWeight}kg</span>
        <span className="display" style={{ fontSize:20, color:'var(--clay)' }}>{fmt(grandTotal)}</span>
      </div>
      {isHeavy && <div style={{ fontSize:11, color:'#b45309', background:'rgba(217,119,6,.10)', borderRadius:'var(--radius-sm)', padding:'6px 9px' }}>⚠ Heavy leaf — recommend {DOOR_HINGES.find(h=>h.id===recHinge)?.name} hinges + {DOOR_FRAMES.find(f=>f.id===recFrame)?.name} frame.</div>}
    </div>
  );

  // ── STEP CONTENT ──
  const stepContent = () => {
    switch(step) {
      case 0: return (<>{sectionH('1',t('shD0t'),t('shD0s'))}
        <button type="button" onClick={()=>setRdOpen(true)} className="btn-clay" style={{ borderRadius:'var(--radius-md)', marginBottom:16, display:'inline-flex', alignItems:'center', gap:8 }}>{t('pOpenRoomDesigner')}</button>
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Quick start</div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
          {DOOR_PRESETS.map(p=>(
            <button key={p.id} type="button" onClick={()=>applyPreset(p)} style={{ ...card(false), padding:'9px 10px' }}>
              <div style={{ fontSize:12.5, fontWeight:600, color:'var(--clay-deep)' }}>{trOpt(p.name, lang)}</div>
              <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:2 }}>{trOpt(p.sub, lang)}</div>
            </button>))}
        </div>
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Door type</div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?14:18 }}>
          {doorTypesView.map(t=>{ const on=doorType===t.id; return (
            <button key={t.id} type="button" onClick={()=>setDoorType(t.id)} style={{ ...card(on), padding:0, overflow:'hidden', textAlign:'left', borderRadius:'var(--radius-lg)', boxShadow: on?'0 12px 32px rgba(194,65,28,.18)':'0 2px 14px rgba(33,28,24,.07)', transform: on?'translateY(-2px)':'none', transition:'transform .18s ease, box-shadow .18s ease' }}>
              <div style={{ position:'relative', width:'100%', background:'var(--cream)', overflow:'hidden', borderTopLeftRadius:16, borderTopRightRadius:16 }}>
                <img src={t.img} alt={t.name} {...layoutImgSize(t.img)} loading="lazy" decoding="async" style={{ display:'block', width:'100%', height:'auto' }} />
                {on && <div style={{ position:'absolute', top:10, right:10, background:'var(--clay)', color:'#fff', fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:'var(--radius-pill)', letterSpacing:.3, boxShadow:'0 2px 8px rgba(0,0,0,.18)' }}>✓ Selected</div>}
              </div>
              <div style={{ padding: mobile?'13px 15px':'15px 17px', borderTop:'1px solid var(--line)' }}>
                <div style={{ fontSize: mobile?16:17, fontWeight:700, color:on?'var(--clay-deep)':'var(--ink)', lineHeight:1.22 }}>{trOpt(t.name, lang)}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{trOpt(t.sub, lang)}</div>
                <div style={{ fontSize:12, color:'var(--ink-soft)', marginTop:7 }}>{t.desc || t.note}</div>
              </div>
            </button>); })}
        </div></>);
      case 1: return (<>{sectionH('2',t('shD1t'),t('shD1s'))}
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:10 }}>
          {DOOR_LOCATIONS.map(l=>{ const on=location===l.id; return (
            <button key={l.id} type="button" onClick={()=>pickLocation(l.id)} style={card(on)}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5"><path d={l.ic} /></svg>
              <div style={{ fontSize:14, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', marginTop:6 }}>{trOpt(l.name, lang)}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>{trOpt(l.sub, lang)}</div>
              <div style={{ fontSize:10.5, color:'var(--ink-soft)', marginTop:4 }}>{l.wMin}–{l.wMax} × {l.hMin}–{l.hMax}mm</div>
            </button>); })}
        </div></>);
      case 2: return (<>{sectionH('3',t('shD2t'),t('shD2s'))}
        <div style={{ display:'grid', gap:12 }}>
          {numField(t('fOpeningWidth'), dims.w, v=>setDims(d=>({...d,w:v})), 600, 3000)}
          {numField(t('fOpeningHeight'), dims.h, v=>setDims(d=>({...d,h:v})), 1800, 3600)}
          {numField(t('fWallThickness'), dims.wall, v=>setDims(d=>({...d,wall:v})), 70, 400)}
          {numField(t('fFloorFinish'), dims.floor, v=>setDims(d=>({...d,floor:v})), 0, 120)}
          <div style={{ fontSize:12, color:'var(--ink-soft)', background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'8px 11px' }}>Recommended for {loc.name}: {loc.wMin}–{loc.wMax}mm wide × {loc.hMin}–{loc.hMax}mm tall.</div>
          {dimWarn.map((w,i)=><div key={i} style={{ fontSize:12, color:'#b45309' }}>⚠ {w}</div>)}
        </div></>);
      case 3: return (<>{sectionH('4',t('shD3t'), isSlide?t('shD3sSlide'):t('shD3sSwing'))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {(isSlide?DOOR_DIR_SLIDE:DOOR_DIR_SWING).map(o=>{ const on= isSlide?slideDir===o.id:dir===o.id; return (
            <button key={o.id} type="button" onClick={()=>isSlide?setSlideDir(o.id):setDir(o.id)} style={card(on)}>
              <div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(o.name, lang)}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{isSlide?'Track direction':(o.way==='in'?'Opens inward':'Opens outward')+' · '+o.hinge+' hinge'}</div>
            </button>); })}
        </div>
        <div style={{ fontSize:12, color:'var(--ink-soft)', marginTop:12 }}>The handle, swing arc / slide arrows update on the preview as you choose.</div></>);
      case 4: return (<>{sectionH('5',t('shD4t'),t('shD4s'))}
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Core type</div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:8, marginBottom:14 }}>
          {DOOR_CORES.map(c=>{ const on=core===c.id; return (
            <button key={c.id} type="button" onClick={()=>setCore(c.id)} style={card(on)}>
              <div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(c.name, lang)}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{trOpt(c.sub, lang)}</div>
            </button>); })}
        </div>
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Frame type</div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:8 }}>
          {DOOR_FRAMES.map(f=>{ const on=frame===f.id; const rec=recFrame===f.id; return (
            <button key={f.id} type="button" onClick={()=>setFrame(f.id)} style={card(on)}>
              <div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(f.name, lang)}{rec&&isHeavy&&<span style={{ fontSize:10, color:'var(--clay)', marginLeft:6 }}>★ rec</span>}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{trOpt(f.sub, lang)}</div>
            </button>); })}
        </div>
        <div style={{ marginTop:14, background: isHeavy?'rgba(217,119,6,.08)':'rgba(22,163,74,.08)', borderRadius:'var(--radius-md)', padding:'9px 12px', fontSize:12.5, color: isHeavy?'#b45309':'#15803d' }}>
          Estimated leaf weight ≈ <b>{leafWeight} kg</b>{leaves>1?` (${leaves} leaves)`:''}. {isHeavy?`Recommend ${DOOR_HINGES.find(h=>h.id===recHinge)?.name} hinges and a ${DOOR_FRAMES.find(f=>f.id===recFrame)?.name} frame.`:'Standard hinges and frame are sufficient.'}
        </div>
        {frameLight && <div style={{ fontSize:12, color:'#b45309', marginTop:8 }}>⚠ A standard frame may not carry this leaf — consider a reinforced option.</div>}</>);
      case 5: return (<>{sectionH('6',t('shD5t'),t('shD5s'))}
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Wood finish</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(86px,1fr))', gap:10, marginBottom:16 }}>
          {DOOR_WOODS.map(o=>{ const on=wood===o.id; return (
            <button key={o.id} type="button" onClick={()=>setWood(o.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:'var(--radius-md)', overflow:'hidden', background:'var(--c-surface)', cursor:'pointer', padding:0 }}>
              <div style={{ height:42, background:o.hex }} />
              <div style={{ fontSize:11.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', padding:'7px 6px' }}>{trOpt(o.name, lang)}</div>
            </button>); })}
        </div>
        <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>Surface finish</div>
        <div style={{ display:'grid', gap:8 }}>
          {DOOR_SURFACES.map(o=>{ const on=surface===o.id; return (
            <button key={o.id} type="button" onClick={()=>setSurface(o.id)} style={{ ...card(on), display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span><span style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)', display:'block' }}>{trOpt(o.name, lang)}</span><span style={{ fontSize:11, color:'var(--muted)' }}>{trOpt(o.sub, lang)}</span></span>
              <span style={{ fontSize:11.5, color:'var(--muted)' }}>×{o.mult.toFixed(2)}</span>
            </button>); })}
        </div></>);
      case 6: return (<>{sectionH('7',t('shD6t'),t('shD6s'))}
        {['Modern','Classic','Luxury'].map(group=>(
          <div key={group} style={{ marginBottom:14 }}>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{group}</div>
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr 1fr', gap:8 }}>
              {DOOR_STYLES.filter(s=>s.group===group).map(s=>{ const on=styleId===s.id; return (
                <button key={s.id} type="button" onClick={()=>setStyleId(s.id)} style={{ ...card(on), padding:'9px 10px' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(s.name, lang)}</div>
                  <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:2 }}>{trOpt(s.sub, lang)}</div>
                  <div style={{ fontSize:10.5, color:'var(--ink-soft)', marginTop:4 }}>{s.add>0?'+'+fmt(s.add):'included'}</div>
                </button>); })}
            </div>
          </div>))}</>);
      case 7: return (<>{sectionH('8',t('shD7t'),t('shD7s'))}
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:8 }}>
          {DOOR_GLASS.map(o=>{ const on=glass===o.id; return (
            <button key={o.id} type="button" onClick={()=>setGlass(o.id)} style={card(on)}>
              <div style={{ fontSize:13.5, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(o.name, lang)}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{o.price>0?'+'+fmt(o.price):'no charge'}</div>
            </button>); })}
        </div></>);
      case 8: return (<>{sectionH('9',t('shD8t'),t('shD8s'))}
        <div style={{ background: hingeOK?'rgba(22,163,74,.08)':'rgba(217,119,6,.08)', borderRadius:'var(--radius-md)', padding:'9px 12px', fontSize:12.5, color: hingeOK?'#15803d':'#b45309', marginBottom:12 }}>
          Recommended for ≈{leafWeight}kg: <b>{DOOR_HINGES.find(h=>h.id===recHinge)?.name} hinges</b>{isHeavy?` + ${DOOR_FRAMES.find(f=>f.id===recFrame)?.name} frame`:''}.{!hingeOK&&` Current ${hg.name} hinges are rated to ${hg.maxKg}kg — choose a stronger hinge.`}
        </div>
        {[['Hinges',DOOR_HINGES,hinge,setHinge,recHinge],['Locks',DOOR_LOCKS,lock,setLock,null],['Handles',DOOR_HANDLES,handle,setHandle,null]].map(([title,list,val,set,rec])=>(
          <div key={title} style={{ marginBottom:14 }}>
            <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{title}</div>
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:8 }}>
              {list.map(o=>{ const on=val===o.id; const isRec=rec===o.id; return (
                <button key={o.id} type="button" onClick={()=>set(o.id)} style={{ ...card(on), padding:'9px 10px' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(o.name, lang)}{isRec&&<span style={{ fontSize:10, color:'var(--clay)', marginLeft:5 }}>★</span>}</div>
                  <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:2 }}>{fmt(o.price)}{o.maxKg?` · ≤${o.maxKg}kg`:''}</div>
                </button>); })}
            </div>
          </div>))}</>);
      case 9: return (<>{sectionH('10',t('shD9t'),t('shD9s'))}
        <div style={{ display:'grid', gap:9 }}>
          {DOOR_ACCESSORIES.map(a=>toggleRow(!!acc[a.id], ()=>setAcc(s=>({...s,[a.id]:!s[a.id]})), a.name, fmt(a.price)))}
        </div></>);
      case 10: return (<>{sectionH('11',t('shSummaryT'),t('shDSummaryS'))}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'8px 12px', background:'var(--sand)', fontSize:11.5, fontWeight:700, color:'var(--ink-soft)' }}>{t('pBillOfMaterials')}</div>
          {[
            [`Door leaf · ${cr.name} core · ${wd.name} ${sf.name} ×${leaves}`, leafTotal],
            [`Frame · ${fr.name}`, frameTotal],
            ...(finishTotal>0?[[`Design style · ${st.name}`, finishTotal]]:[]),
            ...(glassTotal>0?[[`Glass · ${gl.name}`, glassTotal]]:[]),
            [`Hardware · ${hg.name} ×${hingeQty}, ${lk.name}, ${hd.name}`, hardwareTotal],
            ...accItems.map(a=>[a.name, a.line]),
          ].map(([l,v],i)=>(<div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', fontSize:12.5, borderTop:'1px solid var(--line)' }}><span style={{ color:'var(--ink-soft)' }}>{l}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(v)}</span></div>))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderTop:'2px solid var(--line)', background:'var(--sand)' }}><span style={{ fontWeight:700, color:'var(--ink)' }}>{t('pEstimatedTotal')}</span><span className="display" style={{ fontSize:19, color:'var(--clay-deep)' }}>{fmt(grandTotal)}</span></div>
        </div>
        <div style={{ background: isHeavy?'rgba(217,119,6,.08)':'rgba(22,163,74,.08)', borderRadius:'var(--radius-md)', padding:'9px 12px', fontSize:12.5, color: isHeavy?'#b45309':'#15803d', marginBottom:10 }}>
          Smart recommendation: ≈{leafWeight}kg leaf → {DOOR_HINGES.find(h=>h.id===recHinge)?.name} hinges{isHeavy?` + ${DOOR_FRAMES.find(f=>f.id===recFrame)?.name} frame`:''} {hingeOK?'✓':'⚠ current hinge under-rated'}
        </div>
        <div style={{ background: dimWarn.length?'rgba(217,119,6,.08)':'rgba(22,163,74,.08)', borderRadius:'var(--radius-md)', padding:'9px 12px', fontSize:12.5, color: dimWarn.length?'#b45309':'#15803d', marginBottom:12 }}>
          {dimWarn.length? `Validation: ${dimWarn.length} note(s) — ${dimWarn[0]}` : 'Validation: opening within recommended ranges ✓'}
        </div>
        <div style={{ display:'grid', gap:8 }}>
          <button type="button" disabled={busy} onClick={saveDesign} style={{ border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pSaveDesign')}</button>
          <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:'var(--radius-md)' }}>{user?t('pGetQuoteArrow'):t('pSignInQuoteArrow')}</button>
          <button type="button" onClick={downloadPDF} style={{ border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', padding:'11px', fontSize:13.5, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('pDownloadPdf')}</button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
            {[['Shop drawings'],['CNC cut list'],['Installation guide'],['Material / hardware export']].map(([t])=>(
              <button key={t} type="button" disabled title="Coming soon" style={{ border:'1px dashed var(--line)', background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'9px', fontSize:11.5, color:'var(--muted)', cursor:'not-allowed' }}>{t} · soon</button>))}
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
          : <button type="button" onClick={()=>setPage('cat:Doors')} style={{ background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'10px 16px', fontSize:13, color:'var(--muted)', cursor:'pointer' }}>{t('pExit')}</button>}
        {mobile && <button type="button" onClick={()=>setShowPrev(v=>!v)} style={{ background:'var(--sand)', border:'none', borderRadius:'var(--radius-md)', padding:'10px 12px', fontSize:12.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{showPrev?t('pHide'):t('pPreview')}</button>}
        <div style={{ flex:1, textAlign: mobile?'center':'right', minWidth:0 }}><span style={{ fontSize:10.5, color:'var(--muted)' }}>{t('pTotal')} </span><span className="display" style={{ fontSize:17, color:'var(--clay)' }}>{fmt(grandTotal)}</span></div>
        {step<STEPS.length-1
          ? <button type="button" className="btn-clay" disabled={!canNext} onClick={next} style={{ borderRadius:'var(--radius-md)', minWidth:120, opacity:canNext?1:.55 }}>{t('pNextArrow')}</button>
          : <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:'var(--radius-md)', minWidth:120 }}>{t('pGetQuoteArrow')}</button>}
      </div>

      {rdOpen && (
        <RoomDesigner
          mobile={mobile}
          category="door"
          sceneShapeFallback={styleId}
          dimensions={{ widthMm: dims.w, heightMm: dims.h }}
          layoutParams={{ leaves, style: ({ flush:'flush', groove:'groove', slat:'groove', panels:'panel', mould:'panel', inlay:'panel', stone:'panel', leather:'flush', shaker:'shaker' }[styleId] || 'flush') }}
          onClose={()=>setRdOpen(false)}
          onGoToSummary={()=>setRdOpen(false)}
          photorealReq={{ product:'door', getImage:()=>null }}
          indicativeTotal={null}
        />
      )}
      {/* QUOTE modal */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowQuote(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', maxWidth:420, width:'100%', padding:24 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 6px' }}>{t('pQuoteTitleDoor')}</h3>
            <div style={{ background:'var(--sand)', borderRadius:'var(--radius-md)', padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)' }}>{dt.name} · {wd.name} · {st.name} · <b style={{ color:'var(--clay-deep)' }}>{fmt(grandTotal)}</b></div>
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

export { DoorPlannerWizard };
