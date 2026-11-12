// Route chunk "KitchenPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: KitchenPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { HERO_IMG, HOME_IMG, cms, fmt, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';

// LAYOUT — drives the 3D shape + a base run length (m) used for live pricing.
// `model` maps to Wardrobe3D.buildKitchen layouts: single | l-shape | u-shape | parallel | island
const K_LAYOUTS = [
  { id:'straight', name:'Straight / single-wall', sub:'One clean run along a single wall', runM:3.0, model:'single',
    plan:'M24,150 h212 v26 h-212 z', best:'Compact kitchens & open-plan walls', ic:'M4 14h16v4H4z', img:'/layouts/kitchen/single-wall.jpg' },
  { id:'galley',   name:'Galley',   sub:'Two runs facing each other', runM:5.6, model:'parallel',
    plan:'M24,40 h212 v22 h-212 z M24,154 h212 v22 h-212 z', best:'Narrow rooms, serious cooks', ic:'M4 5h16v3H4z M4 16h16v3H4z', img:'/layouts/kitchen/galley.jpg' },
  { id:'l-shape',  name:'L-shaped', sub:'Two runs that meet in a corner', runM:5.6, model:'l-shape',
    plan:'M24,40 h26 v136 h186 v-26 h-160 v-110 z', best:'The all-rounder — most popular', ic:'M4 4h4v16h12v-4H8V4z', img:'/layouts/kitchen/l-shape.jpg' },
  { id:'u-shape',  name:'U-shaped', sub:'Three runs around three walls', runM:7.8, model:'u-shape',
    plan:'M24,40 h26 v110 h160 v-110 h26 v136 h-212 z', best:'Maximum storage & worktop', ic:'M4 4h4v12h8V4h4v16H4z', img:'/layouts/kitchen/u-shape.jpg' },
  { id:'island',   name:'Island',   sub:'A run plus a central island', runM:6.5, model:'island',
    plan:'M24,150 h212 v26 h-212 z M92,86 h84 v34 h-84 z', best:'Sociable, open-plan entertaining', ic:'M4 16h16v4H4z M9 8h6v4H9z', img:'/layouts/kitchen/island.jpg' },
];

// CABINET STYLE — door construction; `mult` scales the cabinetry rate.
// `model` maps to a Wardrobe3D finish hex so the 3D recolours live.
const K_CAB_STYLES = [
  { id:'shaker',     name:'Shaker',           sub:'Framed door, timeless', mult:1.00, lead:'5–6 weeks', constr:'5-piece solid-frame door with recessed centre panel', hex:'#c89b5e', g:'linear-gradient(135deg,#c89b5e,#9c6b34)' },
  { id:'flat_slab',  name:'Flat / slab',      sub:'Clean, handleless-ready', mult:1.08, lead:'5–6 weeks', constr:'Single flat MDF/ply slab, edge-banded, sprayed', hex:'#e9e5dd', g:'linear-gradient(135deg,#f3f3f1,#d6cfc4)' },
  { id:'handleless', name:'Handleless J-pull', sub:'Seamless, contemporary', mult:1.18, lead:'6–7 weeks', constr:'Integrated J-profile grip rail — no surface handles', hex:'#3a3a3c', g:'linear-gradient(135deg,#3a3a3c,#171717)' },
  { id:'inframe',    name:'In-frame',         sub:'Heritage craftsmanship', mult:1.35, lead:'7–9 weeks', constr:'Doors set within a solid timber face frame', hex:'#8f9d7e', g:'linear-gradient(135deg,#9aa88a,#6f7d60)' },
  { id:'gloss',      name:'High-gloss',       sub:'Reflective, premium', mult:1.22, lead:'6–7 weeks', constr:'Acrylic high-gloss faced slab, mirror finish', hex:'#27384f', g:'linear-gradient(135deg,#2c3e57,#16243a)' },
  { id:'veneer',     name:'Real-wood veneer', sub:'Natural grain, luxe', mult:1.30, lead:'7–8 weeks', constr:'Sliced timber veneer on stable substrate, lacquered', hex:'#5a3a20', g:'linear-gradient(135deg,#6b4423,#3f2a17)' },
];

// WORKTOP — priced per linear metre of base run. Full spec for the detail view.
const K_WORKTOPS = [
  { id:'laminate',   name:'Laminate',       perM:60,  sub:'Budget-friendly, huge choice',
    desc:'High-pressure laminate over moisture-resistant board. The most affordable surface with hundreds of décors.',
    thick:'38mm', warranty:'2 years', lead:'2–3 weeks', care:'Wipe clean; avoid standing water at joins', heat:'Low', scratch:'Medium' },
  { id:'solid_wood', name:'Solid wood / butcher block', perM:180, sub:'Warm & natural',
    desc:'Staved solid oak or beech block. Adds warmth; can be sanded and re-oiled over its lifetime.',
    thick:'40mm', warranty:'5 years', lead:'3–4 weeks', care:'Re-oil 2–3× a year; keep away from sinks', heat:'Medium', scratch:'Medium' },
  { id:'granite',    name:'Granite',        perM:280, sub:'Natural stone, unique',
    desc:'Quarried natural stone slab, each piece unique. Extremely hard-wearing and heat resistant.',
    thick:'20–30mm', warranty:'10 years', lead:'3–4 weeks', care:'Re-seal annually; mild detergent only', heat:'High', scratch:'High' },
  { id:'quartz',     name:'Quartz (engineered stone)', perM:320, sub:'Durable premium',
    desc:'Engineered quartz — non-porous, stain & scratch resistant, consistent colour. Our most popular worktop.',
    thick:'20–30mm', warranty:'15 years', lead:'3–4 weeks', care:'Soap & water — no sealing needed', heat:'High', scratch:'Very high' },
  { id:'solid_surf', name:'Solid surface (acrylic)', perM:300, sub:'Seamless, repairable',
    desc:'Acrylic composite cast to shape — invisible joints, integrated sinks, repairable surface.',
    thick:'12–25mm', warranty:'10 years', lead:'3–4 weeks', care:'Buff out scuffs with a soft pad', heat:'Medium', scratch:'High' },
];

function KitchenPage({ setPage, products }) {
  const mobile = useMobile();
  const { t, lang } = useI18n();
  const [faq, setFaq] = useState(-1);
  const { map: dbLayouts } = useLayouts('kitchen');
  const kLayouts = K_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const kitchenProducts = (products||[]).filter(p => /kitchen/i.test(p.category||'') || /kitchen/i.test(p.name||''));
  const heroImg = HERO_IMG.kitchen;
  const wrap = { maxWidth:1180, margin:'0 auto', padding: mobile?'0 16px':'0 28px' };
  const FAQS = t('sw2KpFaq');

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?56:64, paddingBottom:90 }}>
      {/* HERO */}
      <section style={{ position:'relative', minHeight: mobile?440:560, display:'flex', alignItems:'flex-end', backgroundImage:`linear-gradient(to top, rgba(20,16,12,.72), rgba(20,16,12,.15)), url('${cms('kitchen.hero.image', heroImg)}')`, backgroundSize:'cover', backgroundPosition:'center' }}>
        <div style={{ ...wrap, paddingBottom: mobile?32:54, color:'#fff' }}>
          <div style={{ fontSize:12, letterSpacing:'.18em', textTransform:'uppercase', opacity:.85, marginBottom:12 }}>{cms('kitchen.hero.eyebrow', 'Bespoke kitchens · Bahrain')}</div>
          <h1 className="display" style={{ fontSize: mobile?34:60, lineHeight:1.05, maxWidth:760, margin:0 }}>{cms('kitchen.hero.title', t('kitchenHeroTitle'))}</h1>
          <p style={{ fontSize: mobile?15:19, maxWidth:540, marginTop:14, opacity:.92, lineHeight:1.55 }}>{cms('kitchen.hero.subtitle', t('kitchenHeroSub'))}</p>
          <div style={{ display:'flex', gap:12, marginTop:24, flexWrap:'wrap' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('kitchen-planner')} style={{ borderRadius:14 }}>{cms('kitchen.hero.cta', t('openDesignStudio'))}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.45)', borderRadius:14, padding:'15px 28px', fontSize:16, fontWeight:600, cursor:'pointer', backdropFilter:'blur(6px)' }}>{t('bookFreeVisit')}</button>
          </div>
        </div>
      </section>

      {/* STYLE GALLERY */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{cms('kitchen.s1.eyebrow', 'Kitchen styles')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{cms('kitchen.s1.title', 'Find your look.')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:560, marginBottom:22 }}>{t('sw2KpStylesSub')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:16 }}>
          {K_CAB_STYLES.map(s=>(
            <button key={s.id} type="button" className="lift" onClick={()=>setPage('kitchen-planner')} style={{ textAlign:'left', border:'1px solid var(--line)', borderRadius:18, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0, boxShadow:'var(--shadow)' }}>
              <div style={{ height: mobile?110:150, background:s.g }} />
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontSize:17, fontWeight:600, color:'var(--ink)' }}>{trOpt(s.name, lang)}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{trOpt(s.sub, lang)}</div>
                <div style={{ fontSize:12.5, color:'var(--clay)', marginTop:10, fontWeight:600 }}>{t('sw2KpDesignStyle')}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* LAYOUTS strip */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2KpEveryLayout')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px' }}>{t('sw2KpFitRoom')}</h2>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(5,1fr)', gap:12 }}>
          {kLayouts.map(l=>(
            <div key={l.id} className="lift zoomwrap" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:16, overflow:'hidden', textAlign:'center' }}>
              <img src={l.img} alt={trOpt(l.name, lang)} loading="lazy" style={{ display:'block', width:'100%', height: mobile?110:130, objectFit:'cover' }} />
              <div style={{ padding:'14px 12px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{trOpt(l.name, lang)}</div>
                <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:4, lineHeight:1.4 }}>{trOpt(l.sub, lang)}</div>
                {Array.isArray(l.bullets) && l.bullets.length>0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center', marginTop:8 }}>
                    {l.bullets.slice(0,3).map(b=>(<span key={b} style={{ fontSize:10.5, background:'var(--sand)', color:'var(--ink-soft)', borderRadius:999, padding:'3px 8px' }}>{b}</span>))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MATERIALS showcase (worktops) */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2KpWorktopsEyebrow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw2SurfacesLast')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:560, marginBottom:22 }}>{t('sw2KpWorktopsSub')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:14 }}>
          {K_WORKTOPS.map(w=>(
            <div key={w.id} className="lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:16, padding:'18px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontSize:17, fontWeight:600, color:'var(--ink)' }}>{w.name}</span>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{fmt(w.perM)}/m</span>
              </div>
              <p style={{ fontSize:13, color:'var(--ink-soft)', margin:'8px 0', lineHeight:1.55 }}>{w.desc}</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {[w.thick, 'Heat '+w.heat, 'Scratch '+w.scratch, w.warranty+' warranty', w.lead].map(t=>(
                  <span key={t} style={{ fontSize:11, background:'var(--sand)', color:'var(--ink-soft)', borderRadius:999, padding:'4px 10px' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES / why us */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:16 }}>
          {[
            [t('sw2KpF1'),t('sw2KpF1Desc'),'M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-6h6v6'],
            [t('sw2KpF2'),t('sw2KpF2Desc'),'M4 7h16v10H4z M8 12h8'],
            [t('sw2OneTeam'),t('sw2KpF3Desc'),'M12 2a5 5 0 015 5c0 3-5 9-5 9S7 10 7 7a5 5 0 015-5z'],
          ].map(([ti,d,ic])=>(
            <div key={ti} className="lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:18, padding:'22px 22px' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5" style={{ marginBottom:12 }}><path d={ic} /></svg>
              <div style={{ fontSize:18, fontWeight:600, color:'var(--ink)' }}>{ti}</div>
              <p style={{ fontSize:14, color:'var(--ink-soft)', marginTop:6, lineHeight:1.55 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATALOG anchors (real products) */}
      {kitchenProducts.length>0 && (
        <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2StartingPoints')}</div>
          <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px' }}>{t('sw2KpPopular')}</h2>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:18 }}>
            {kitchenProducts.map(p=>(
              <button key={p.id} type="button" className="lift" onClick={()=>setPage('product-'+p.id)} style={{ textAlign:'left', background:'#fff', border:'1px solid var(--line)', borderRadius:18, overflow:'hidden', cursor:'pointer', padding:0, boxShadow:'var(--shadow)' }}>
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
        <div style={{ background:'var(--ink)', borderRadius:22, padding: mobile?'28px 22px':'44px 48px', color:'#fff', display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:28, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:12, letterSpacing:'.16em', textTransform:'uppercase', opacity:.7, marginBottom:10 }}>{t('sw2Transformations')}</div>
            <h2 className="display" style={{ fontSize: mobile?26:36, margin:'0 0 12px' }}>{t('sw2KpTiredTimeless')}</h2>
            <p style={{ fontSize:15, opacity:.85, lineHeight:1.6, marginBottom:20 }}>{t('sw2KpTransDesc')}</p>
            <button type="button" className="btn-clay" onClick={()=>setPage('projects')} style={{ borderRadius:14 }}>{t('sw2SeeProjects')}</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ height: mobile?120:170, borderRadius:14, background:`url('${HOME_IMG.kitchen}') center/cover`, position:'relative' }}><span style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11, fontWeight:700, borderRadius:999, padding:'3px 10px' }}>{t('sw2After')}</span></div>
            <div style={{ height: mobile?120:170, borderRadius:14, background:`url('${HOME_IMG.living}') center/cover`, position:'relative' }}><span style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:11, fontWeight:700, borderRadius:999, padding:'3px 10px' }}>{t('sw2Detail')}</span></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...wrap, marginTop: mobile?40:64, maxWidth:820 }}>
        <div className="eyebrow" style={{ marginBottom:10, textAlign:'center' }}>{t('sw2GoodToKnow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px', textAlign:'center' }}>{t('sw2KpFaqTitle')}</h2>
        <div style={{ display:'grid', gap:10 }}>
          {FAQS.map(([q,a],i)=>{ const on=faq===i; return (
            <div key={i} style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, overflow:'hidden' }}>
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
        <div style={{ background:'linear-gradient(135deg,var(--clay),var(--clay-deep))', borderRadius:22, padding: mobile?'32px 24px':'52px 48px', textAlign:'center', color:'#fff' }}>
          <h2 className="display" style={{ fontSize: mobile?28:42, margin:'0 0 10px' }}>{t('sw2KpDreamCta')}</h2>
          <p style={{ fontSize: mobile?15:18, opacity:.92, maxWidth:520, margin:'0 auto 22px' }}>{t('sw2KpDreamSub')}</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button type="button" onClick={()=>setPage('kitchen-planner')} style={{ background:'#fff', color:'var(--clay-deep)', border:'none', borderRadius:14, padding:'15px 30px', fontSize:16, fontWeight:700, cursor:'pointer' }}>{t('sw2OpenDesignStudioArrow')}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.5)', borderRadius:14, padding:'15px 30px', fontSize:16, fontWeight:600, cursor:'pointer' }}>{t('sw2BookFreeVisit')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { K_LAYOUTS, K_CAB_STYLES, K_WORKTOPS, KitchenPage };
