// Route chunk "WardrobesPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: WardrobesPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { HERO_IMG, HOME_IMG, cms, fmt, useI18n, useMobile } from '../App';
import TypeShowcase from '../glass/TypeShowcase'; // [GLASS] owner's explorable type showcase
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';

// WARDROBE TYPES — drives the editorial gallery. `from` is an indicative entry
// price (BHD) tied to a real catalogue anchor where one exists.
const W_TYPES = [
  { id:'walkin',  name:'Walk-in closet',  sub:'A private dressing room of your own', from:5200,
    desc:'Open-plan hanging, drawer banks, an island and full-height storage — the flagship. Organised to the centimetre, lit like a boutique.',
    img:'/layouts/wardrobe/wardrobe-walkin.jpg', best:'Master suites & dressing rooms', ic:'M4 4h16v16H4z M4 10h16 M12 4v16',
    chips:['Island optional','Boutique LED','Open-plan'] },
  { id:'sliding', name:'Sliding-door wardrobe', sub:'Space-saving, seamless fronts', from:1000,
    desc:'Floor-to-ceiling sliding doors in glass, mirror or panelled finish. No swing clearance — ideal where space is tight.',
    img:'/layouts/wardrobe/wardrobe-sliding.jpg', best:'Compact bedrooms & alcoves', ic:'M4 4h16v16H4z M12 4v16',
    chips:['Soft-close runners','Mirror option','Zero swing'] },
  { id:'hinged',  name:'Hinged / fitted wardrobe', sub:'Classic doors, fully fitted', from:720,
    desc:'Made-to-measure hinged doors fitted wall-to-wall and floor-to-ceiling — every centimetre used, scribed to your walls.',
    img:'/layouts/wardrobe/wardrobe-hinged.jpg', best:'Most bedrooms — the all-rounder', ic:'M4 4h16v16H4z M9 4v16 M15 4v16',
    chips:['Blum hinges','Wall-to-wall','Made to measure'] },
  { id:'reachin', name:'Fitted / reach-in', sub:'Built-in storage that disappears', from:540,
    desc:'A reach-in run built into the architecture — handleless fronts that read as a wall, with a fully fitted interior behind.',
    img:'/layouts/wardrobe/wardrobe-straight.jpg', best:'Hallways, kids rooms & studies', ic:'M4 4h16v16H4z M4 12h16',
    chips:['Handleless','Flush-fit','Bespoke interior'] },
];

// WARDROBE INTERIOR FITTINGS — the storage system. Per-unit drivers (BHD).
// Costs informed by design_materials accessories where present.
const W_INTERIOR = [
  { id:'hanging',  name:'Hanging rails',      sub:'Long & double-hang', price:45,  ic:'M4 7h16 M12 3v4 M7 7v12 M17 7v12' },
  { id:'drawers',  name:'Soft-close drawers', sub:'Blum full-extension', price:120, ic:'M4 8h16v12H4z M4 12h16 M4 16h16' },
  { id:'shelving', name:'Adjustable shelves', sub:'Stackable open store', price:35,  ic:'M4 6h16 M4 12h16 M4 18h16' },
  { id:'shoe',     name:'Shoe racks',         sub:'Angled pull-out tiers', price:60, ic:'M4 14h16l-2 4H6z M4 14l3-6h6l2 6' },
  { id:'led',      name:'LED lighting',       sub:'Warm 3000K, sensor', price:90,  ic:'M5 8h14 M7 12h10 M9 16h6' },
  { id:'softclose',name:'Soft-close upgrade', sub:'Every door & drawer', price:75,  ic:'M4 7h16v10H4z M8 12h8' },
  { id:'mirror',   name:'Integrated mirror',  sub:'Full-height / pull-out', price:110, ic:'M7 3h10v18H7z M7 8h10' },
  { id:'island',   name:'Dressing island',    sub:'Drawers + display top', price:480, ic:'M5 14h14v5H5z M9 9h6v5H9z' },
  { id:'trouser',  name:'Trouser / tie rack',  sub:'Pull-out organiser', price:55,  ic:'M5 4h14 M8 4v16 M16 4v16' },
  { id:'valet',    name:'Valet rod & jewellery', sub:'Felt-lined trays', price:70,  ic:'M12 3v8 M8 11h8 M9 15h6v5H9z' },
];

// WARDROBE FINISH / MATERIAL showcase — full spec for the detail view.
// Mirrors design_materials (board + finish). `perM` is the finish premium per
// linear metre of run; `hex` recolours the 3D in the studio (canvas literal).
const W_FINISHES = [
  { id:'melamine', name:'Melamine', perM:55, sub:'Durable, exceptional value', hex:'#e4ddcf', g:'linear-gradient(135deg,#efe9dd,#d6cdbb)',
    desc:'A tough decorative laminate fused to a moisture-resistant board. Hundreds of décors, wipe-clean and our most popular everyday finish.',
    board:'18mm MDF / HMR core', warranty:'5 years', lead:'2–3 weeks', care:'Wipe clean', durability:'High', scratch:'High' },
  { id:'acrylic',  name:'High-gloss acrylic', perM:120, sub:'Reflective, premium', hex:'#f5f3ee', g:'linear-gradient(135deg,#f7f6f2,#dcd6cb)',
    desc:'A mirror-flat acrylic face with depth and shine that brightens a room. Anti-fingerprint options available.',
    board:'18mm MDF core', warranty:'10 years', lead:'3 weeks', care:'Soft cloth', durability:'High', scratch:'Medium' },
  { id:'veneer',   name:'Real-wood veneer', perM:165, sub:'Natural grain, luxe', hex:'#5a3a20', g:'linear-gradient(135deg,#6b4423,#3f2a17)',
    desc:'Sliced natural timber over a stable substrate, lacquered for protection. Each panel grain-matched — the warmest, most luxurious option.',
    board:'18mm ply / MDF core', warranty:'10 years', lead:'3–4 weeks', care:'Oil yearly', durability:'High', scratch:'Medium' },
  { id:'lacquer',  name:'Matt lacquer', perM:145, sub:'Smooth painted, any RAL', hex:'#3a3a3c', g:'linear-gradient(135deg,#4a4a4c,#23232a)',
    desc:'A hand-sprayed painted finish in any RAL colour, with a soft contemporary matt surface. Seamless, handleless-ready.',
    board:'18mm MDF core', warranty:'8 years', lead:'4 weeks', care:'Soft cloth', durability:'Medium-high', scratch:'Medium' },
  { id:'glass',    name:'Glass / mirror front', perM:160, sub:'Display & dressing', hex:'#cfd8dd', g:'linear-gradient(135deg,#dfe6ea,#b6c2c8)',
    desc:'Toughened glass or mirror fronts — perfect for sliding doors and display sections. Bright, light-reflecting and easy to keep clean.',
    board:'Aluminium-framed', warranty:'5 years', lead:'2–3 weeks', care:'Glass cleaner', durability:'Medium-high', scratch:'High' },
];

// SPEC & PRICING MODEL — surfaced in the on-page spec drawer. Real hardware
// brands & defaults from design_materials (Blum, Hettich).
const WARDROBE_SPEC = {
  cabinetRate: 380,        // BHD per linear metre of run (carcass + standard fronts)
  typicalSizes: [
    ['Reach-in run',     '1.0–2.0 m wide · 60 cm deep · to 2.4 m high'],
    ['Hinged fitted',    '2.0–4.0 m wide · 60 cm deep · floor-to-ceiling'],
    ['Sliding wardrobe', '1.8–3.6 m wide · 65 cm deep · to 2.7 m high'],
    ['Walk-in closet',   '6–12 m of run · U or L shaped · island optional'],
  ],
  hardware: [
    ['Hinges',  'Blum soft-close, 110° — backed for 10 years'],
    ['Runners', 'Blum full-extension soft-close drawer systems'],
    ['Lifts',   'Hettich top-cabinet lift systems'],
    ['Rails',   'Anodised aluminium hanging rails & LED profiles'],
  ],
  interior: [
    ['Carcass', '18mm moisture-resistant board (HMR), edge-banded'],
    ['Backs',   '8mm panelled, fully concealed fixings'],
    ['Shelves', 'Adjustable on concealed supports, 25mm front edge'],
    ['Lighting','Warm 3000K LED with PIR sensor option'],
  ],
  leadTime: '4–7 weeks from sign-off',
  warranty: '10 years on cabinetry & soft-close hardware',
  priceDrivers: [
    ['Run length', 'Priced per linear metre — the biggest single driver'],
    ['Finish',     'Melamine to real-wood veneer carries a per-metre premium'],
    ['Interior',   'Drawers, islands, LED & racks added per unit'],
    ['Doors',      'Hinged, sliding, glass or mirror change the front cost'],
  ],
};

/* ── PART 2 · KITCHEN editorial landing / catalog page ── */
/* ── WARDROBES · editorial catalogue / landing page (mirrors KitchenPage) ──
   The flagship product. Reuses the existing PlannerPage ('planner') as the
   Design Studio + live 3D — every primary CTA routes there. ──────────────── */
function WardrobesPage({ setPage, products }) {
  const mobile = useMobile();
  const { t, lang } = useI18n();
  const [faq, setFaq] = useState(-1);
  const [specOpen, setSpecOpen] = useState(false);
  const { map: dbLayouts } = useLayouts('wardrobe');
  const wTypes = W_TYPES.map(t => mergeLayout(t, dbLayouts));
  const wardrobeProducts = (products||[]).filter(p =>
    /wardrobe|closet|walk\-?in|dress|storage/i.test(p.category||'') ||
    /wardrobe|closet|walk\-?in|dress/i.test(p.name||''));
  const heroImg = (dbLayouts.walkin && dbLayouts.walkin.hero_url) || HERO_IMG.wardrobe;
  const wrap = { maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding:'0 var(--gutter)' };
  const FAQS = t('sw2WardFaq');

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop:'var(--nav-h)', paddingBottom:90 }}>
      {/* HERO */}
      <section style={{ position:'relative', minHeight: mobile?440:560, display:'flex', alignItems:'flex-end', backgroundImage:`linear-gradient(to top, rgba(20,16,12,.72), rgba(20,16,12,.15)), url('${cms('wardrobe.hero.image', heroImg)}')`, backgroundSize:'cover', backgroundPosition:'center' }}>
        <div style={{ ...wrap, paddingBottom: mobile?32:54, color:'#fff' }}>
          <div style={{ fontSize:12, letterSpacing:'.18em', textTransform:'uppercase', opacity:.85, marginBottom:12 }}>{cms('wardrobe.hero.eyebrow', 'Bespoke wardrobes & walk-in closets · Bahrain')}</div>
          <h1 className="display" style={{ fontSize: mobile?34:60, lineHeight:1.05, maxWidth:780, margin:0 }}>{cms('wardrobe.hero.title', t('wardrobeHeroTitle'))}</h1>
          <p style={{ fontSize: mobile?15:19, maxWidth:560, marginTop:14, opacity:.92, lineHeight:1.55 }}>{cms('wardrobe.hero.subtitle', t('wardrobeHeroSub'))}</p>
          <div style={{ display:'flex', gap:12, marginTop:24, flexWrap:'wrap' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('wardrobe-planner')} style={{ borderRadius:'var(--radius-lg)' }}>{cms('wardrobe.hero.cta', t('openDesignStudio'))}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.45)', borderRadius:'var(--radius-lg)', padding:'15px 28px', fontSize:16, fontWeight:600, cursor:'pointer', backdropFilter:'blur(6px)' }}>{t('bookFreeVisit')}</button>
          </div>
        </div>
      </section>

      {/* TYPES gallery */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{cms('wardrobe.s1.eyebrow', 'Wardrobe types')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{cms('wardrobe.s1.title', 'Find your fit.')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{t('sw2WardTypesSub')}</p>
        <TypeShowcase types={wTypes} ar={lang==='ar'} cta={t('sw2DesignThis3d')} onDesign={()=>setPage('wardrobe-planner')} badge={(x)=>x.from?('From '+fmt(x.from)):''} testid="showcase-wardrobe" />{/* [GLASS stage 3] */}
      </section>

      {/* INTERIOR fittings strip */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2WardTypesEyebrow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw2WardOrganised')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{t('sw2WardInteriorSub')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(5,1fr)', gap:12 }}>
          {W_INTERIOR.map(f=>(
            <div key={f.id} className="lift" style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'16px 14px', textAlign:'center' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.4" style={{ margin:'0 auto 8px' }}><path d={f.ic} /></svg>
              <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{f.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:3, lineHeight:1.35 }}>{f.sub}</div>
              <div style={{ fontSize:12, color:'var(--clay)', fontWeight:700, marginTop:6 }}>+{fmt(f.price)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINISHES showcase */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2WardFinishesEyebrow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw2SurfacesLast')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{t('sw2WardFinishesSub')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:14 }}>
          {W_FINISHES.map(w=>(
            <div key={w.id} className="lift" style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <span style={{ width:40, height:40, borderRadius:'var(--radius-md)', flexShrink:0, background:w.g, border:'1px solid var(--line)' }} />
                <div style={{ flex:1, display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                  <div>
                    <div style={{ fontSize:17, fontWeight:600, color:'var(--ink)' }}>{w.name}</div>
                    <div style={{ fontSize:12.5, color:'var(--muted)' }}>{w.sub}</div>
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--clay)', whiteSpace:'nowrap' }}>+{fmt(w.perM)}/m</span>
                </div>
              </div>
              <p style={{ fontSize:13, color:'var(--ink-soft)', margin:'8px 0', lineHeight:1.55 }}>{w.desc}</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {[w.board, 'Durability '+w.durability, 'Scratch '+w.scratch, w.warranty+' warranty', w.lead].map(t=>(
                  <span key={t} style={{ fontSize:11, background:'var(--sand)', color:'var(--ink-soft)', borderRadius:'var(--radius-pill)', padding:'4px 10px' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SPEC & PRICING drawer */}
      <section style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
          <button type="button" onClick={()=>setSpecOpen(o=>!o)} style={{ width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding: mobile?'20px 20px':'24px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>{t('sw2WardSpecEyebrow')}</div>
              <div className="display" style={{ fontSize: mobile?22:30, color:'var(--ink)' }}>{t('sw2WardSpecTitle')}</div>
            </div>
            <span style={{ width:40, height:40, borderRadius:'50%', background:'var(--sand)', color:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{specOpen?'–':'+'}</span>
          </button>
          {specOpen && (
            <div style={{ padding: mobile?'0 20px 22px':'0 28px 28px' }}>
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?18:26 }}>
                {[
                  [t('sw2WardPriceDrivers'), WARDROBE_SPEC.priceDrivers],
                  [t('sw2WardTypicalSizes'), WARDROBE_SPEC.typicalSizes],
                  [t('sw2WardInteriorConstr'), WARDROBE_SPEC.interior],
                  [t('sw2WardHardwareBrands'), WARDROBE_SPEC.hardware],
                ].map(([title, rows])=>(
                  <div key={title}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--clay-deep)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>{title}</div>
                    <div style={{ display:'grid', gap:8 }}>
                      {rows.map(([k,v])=>(
                        <div key={k} style={{ display:'flex', gap:10, fontSize:13.5, lineHeight:1.5 }}>
                          <span style={{ minWidth:96, fontWeight:600, color:'var(--ink)' }}>{k}</span>
                          <span style={{ color:'var(--ink-soft)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:18 }}>
                {[`From ${fmt(WARDROBE_SPEC.cabinetRate)}/linear metre`, `Lead time · ${WARDROBE_SPEC.leadTime}`, WARDROBE_SPEC.warranty].map(t=>(
                  <span key={t} style={{ fontSize:12.5, background:'var(--sand)', color:'var(--ink)', fontWeight:600, borderRadius:'var(--radius-pill)', padding:'7px 14px' }}>{t}</span>
                ))}
              </div>
              <button type="button" className="btn-clay" onClick={()=>setPage('wardrobe-planner')} style={{ marginTop:18, borderRadius:'var(--radius-lg)' }}>{t('sw2WardBuild3d')}</button>
            </div>
          )}
        </div>
      </section>

      {/* FEATURES / why us */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:16 }}>
          {[
            [t('sw2WardF1'),t('sw2WardF1Desc'),'M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-6h6v6'],
            [t('sw2WardF2'),t('sw2WardF2Desc'),'M4 7h16v10H4z M8 12h8'],
            [t('sw2OneTeam'),t('sw2OneTeamDesc'),'M12 2a5 5 0 015 5c0 3-5 9-5 9S7 10 7 7a5 5 0 015-5z'],
          ].map(([ti,d,ic])=>(
            <div key={ti} className="lift" style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', padding:'22px 22px' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5" style={{ marginBottom:12 }}><path d={ic} /></svg>
              <div style={{ fontSize:18, fontWeight:600, color:'var(--ink)' }}>{ti}</div>
              <p style={{ fontSize:14, color:'var(--ink-soft)', marginTop:6, lineHeight:1.55 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATALOG anchors (real products) */}
      {wardrobeProducts.length>0 && (
        <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2StartingPoints')}</div>
          <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px' }}>{t('sw2WardPopular')}</h2>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:18 }}>
            {wardrobeProducts.map(p=>(
              <button key={p.id} type="button" className="lift" onClick={()=>setPage('product-'+p.id)} style={{ textAlign:'left', background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', overflow:'hidden', cursor:'pointer', padding:0, boxShadow:'var(--shadow)' }}>
                <div style={{ height:160, background: p.image_url?`url('${p.image_url}') center/cover`:'linear-gradient(135deg,#FFF1E8,#F5F5F7)' }} />
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:16, fontWeight:600, color:'var(--ink)' }}>{p.name}</div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>From {fmt(p.price)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* BEFORE / AFTER */}
      <section style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div style={{ background:'var(--ink)', borderRadius:'var(--radius-xl)', padding: mobile?'28px 22px':'44px 48px', color:'#fff', display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:28, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:12, letterSpacing:'.16em', textTransform:'uppercase', opacity:.7, marginBottom:10 }}>{t('sw2Transformations')}</div>
            <h2 className="display" style={{ fontSize: mobile?26:36, margin:'0 0 12px' }}>{t('sw2WardCluttered')}</h2>
            <p style={{ fontSize:15, opacity:.85, lineHeight:1.6, marginBottom:20 }}>{t('sw2WardTransDesc')}</p>
            <button type="button" className="btn-clay" onClick={()=>setPage('projects')} style={{ borderRadius:'var(--radius-lg)' }}>{t('sw2SeeProjects')}</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ height: mobile?120:170, borderRadius:'var(--radius-lg)', background:`url('${HOME_IMG.walkin}') center/cover`, position:'relative' }}><span style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11, fontWeight:700, borderRadius:'var(--radius-pill)', padding:'3px 10px' }}>{t('sw2After')}</span></div>
            <div style={{ height: mobile?120:170, borderRadius:'var(--radius-lg)', background:`url('${HOME_IMG.detail}') center/cover`, position:'relative' }}><span style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11, fontWeight:700, borderRadius:'var(--radius-pill)', padding:'3px 10px' }}>{t('sw2Detail')}</span></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...wrap, marginTop: mobile?40:64, maxWidth:820 }}>
        <div className="eyebrow" style={{ marginBottom:10, textAlign:'center' }}>{t('sw2GoodToKnow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px', textAlign:'center' }}>{t('sw2WardFaqTitle')}</h2>
        <div style={{ display:'grid', gap:10 }}>
          {FAQS.map(([q,a],i)=>{ const on=faq===i; return (
            <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
              <button type="button" onClick={()=>setFaq(on?-1:i)} style={{ width:'100%', textAlign:'left', background:'none', border:'none', padding:'16px 18px', fontSize:15.5, fontWeight:600, color:'var(--ink)', cursor:'pointer', display:'flex', justifyContent:'space-between', gap:12 }}>
                <span>{q}</span><span style={{ color:'var(--clay)', flexShrink:0 }}>{on?'–':'+'}</span>
              </button>
              {on && <div style={{ padding:'0 18px 16px', fontSize:14, color:'var(--ink-soft)', lineHeight:1.6 }}>{a}</div>}
            </div>
          ); })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div style={{ background:'linear-gradient(135deg,var(--clay),var(--clay-deep))', borderRadius:'var(--radius-xl)', padding: mobile?'32px 24px':'52px 48px', textAlign:'center', color:'#fff' }}>
          <h2 className="display" style={{ fontSize: mobile?28:42, margin:'0 0 10px' }}>{t('sw2WardDreamCta')}</h2>
          <p style={{ fontSize: mobile?15:18, opacity:.92, maxWidth:520, margin:'0 auto 22px' }}>{t('sw2WardDreamSub')}</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button type="button" onClick={()=>setPage('wardrobe-planner')} style={{ background:'var(--c-surface)', color:'var(--clay-deep)', border:'none', borderRadius:'var(--radius-lg)', padding:'15px 30px', fontSize:16, fontWeight:700, cursor:'pointer' }}>{t('sw2OpenDesignStudioArrow')}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.5)', borderRadius:'var(--radius-lg)', padding:'15px 30px', fontSize:16, fontWeight:600, cursor:'pointer' }}>{t('sw2BookFreeVisit')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { WardrobesPage };
