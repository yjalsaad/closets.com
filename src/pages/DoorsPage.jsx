// Route chunk "DoorsPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DoorsPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { HERO_IMG, cms, fmt, useI18n, useMobile } from '../App';
import TypeShowcase from '../glass/TypeShowcase'; // [GLASS] owner's explorable type showcase
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { DOOR_TYPES, DOOR_WOODS } from './shared_DoorPlannerWizard_DoorsPage';

/* ── DOORS · editorial catalogue / landing page (mirrors OfficePage) ──
   Group key 'door'. 6 door-type gallery from useLayouts('door'); "Design yours →" → 'door-planner'.
   Hero + section headings fully Hub-editable via cms('door.*', fallback). */
function DoorsPage({ setPage, products }) {
  const mobile = useMobile();
  const { t, lang } = useI18n();
  const [faq, setFaq] = useState(-1);
  const { map: dbLayouts } = useLayouts('door');
  const doorTypes = DOOR_TYPES.map(l => mergeLayout(l, dbLayouts));
  const doorProducts = (products||[]).filter(p =>
    /door/i.test(p.category||'') || /door/i.test(p.name||''));
  const heroImg = (dbLayouts['pivot'] && dbLayouts['pivot'].hero_url) || HERO_IMG.door;
  const wrap = { maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding:'0 var(--gutter)' };
  const FAQS = [
    [cms('door.faq.q1','How much does a bespoke wood door cost?'), cms('door.faq.a1','A flush hollow-core interior door starts from around BD 120, a solid-core veneer door from BD 280, and a statement pivot or double majlis door from BD 700+. Price is driven transparently by the size, core, finish and hardware — build a live estimate in the wood door planner.')],
    [cms('door.faq.q2','How long does it take?'), cms('door.faq.a2','Most doors are manufactured and installed within 3–6 weeks of sign-off. Solid timber, fire-rated cores and decorative inlays sit at the longer end.')],
    [cms('door.faq.q3','Can you match an existing door or frame?'), cms('door.faq.a3','Yes — every door is made to measure. We survey the opening, match the wood, finish and hardware, and scribe the frame so it sits flush and operates perfectly.')],
    [cms('door.faq.q4','Do you supply hidden / flush doors?'), cms('door.faq.a4','We do — concealed aluminium jambs with a flush leaf that reads as part of the wall, ideal for a clean, minimal interior.')],
    [cms('door.faq.q5','What hardware do you use?'), cms('door.faq.a5','Concealed and standard hinges, soft-close systems, and a full range of European locks and handles — all backed by our cabinetry-grade warranty.')],
    [cms('door.faq.q6','Do you do fire-rated doors?'), cms('door.faq.a6','Yes — 60-minute certified fire-rated cores with the correct intumescent seals and frames, finished to match the rest of your interior.')],
  ];
  const designYoursLbl = t('sw2DesignYours');

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop:'var(--nav-h)', paddingBottom:90 }}>
      {/* HERO */}
      <section style={{ position:'relative', minHeight: mobile?440:560, display:'flex', alignItems:'flex-end', backgroundImage:`linear-gradient(to top, rgba(20,16,12,.72), rgba(20,16,12,.15)), url('${cms('door.hero.image', heroImg)}')`, backgroundSize:'cover', backgroundPosition:'center' }}>
        <div style={{ ...wrap, paddingBottom: mobile?32:54, color:'#fff' }}>
          <div style={{ fontSize:12, letterSpacing:'.18em', textTransform:'uppercase', opacity:.85, marginBottom:12 }}>{cms('door.hero.eyebrow', 'Bespoke wood doors · Bahrain')}</div>
          <h1 className="display" style={{ fontSize: mobile?34:60, lineHeight:1.05, maxWidth:780, margin:0 }}>{cms('door.hero.title', t('doorHeroTitle'))}</h1>
          <p style={{ fontSize: mobile?15:19, maxWidth:560, marginTop:14, opacity:.92, lineHeight:1.55 }}>{cms('door.hero.subtitle', t('doorHeroSub'))}</p>
          <div style={{ display:'flex', gap:12, marginTop:24, flexWrap:'wrap' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('door-planner')} style={{ borderRadius:'var(--radius-lg)' }}>{cms('door.hero.cta', t('openDoorPlanner'))}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.45)', borderRadius:'var(--radius-lg)', padding:'15px 28px', fontSize:16, fontWeight:600, cursor:'pointer', backdropFilter:'blur(6px)' }}>{t('bookFreeVisit')}</button>
          </div>
        </div>
      </section>

      {/* DOOR TYPES gallery — each uses its /layouts/door/<id>.jpg photo */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{cms('door.layouts.eyebrow','Door types')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{cms('door.layouts.title','Find your door.')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{cms('door.layouts.subtitle','Six ways to open a room — from an everyday swing leaf to a space-saving slider, a statement pivot or a concealed flush door.')}</p>
        <TypeShowcase types={doorTypes.map(d=>({ ...d, desc: d.desc || d.note }))} ar={lang==='ar'} cta={designYoursLbl} onDesign={()=>setPage('door-planner')} testid="showcase-door" />{/* [GLASS stage 3] */}
      </section>

      {/* WOODS & FINISHES strip */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{cms('door.materials.eyebrow','Woods & finishes')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{cms('door.materials.title','The right wood, finished your way.')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{cms('door.materials.subtitle','From warm oak to deep ebony, in veneer, laminate or hand-sprayed PU paint — pick the wood and surface that suit your interior.')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(5,1fr)', gap:14 }}>
          {DOOR_WOODS.map(w=>(
            <div key={w.id} className="lift" style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'16px 16px' }}>
              <div style={{ height:36, borderRadius:'var(--radius-sm)', background:w.hex, border:'1px solid var(--line)', marginBottom:10 }} />
              <div style={{ fontSize:16, fontWeight:600, color:'var(--ink)' }}>{w.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES / why us */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:16 }}>
          {[
            [t('sw2MadeToMeasure'),t('sw2DrF1Desc'),'M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-6h6v6'],
            [t('sw2DrF2'),t('sw2DrF2Desc'),'M4 7h16v10H4z M8 12h8'],
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
      {doorProducts.length>0 && (
        <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2StartingPoints')}</div>
          <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px' }}>{t('sw2DrPopular')}</h2>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:18 }}>
            {doorProducts.map(p=>(
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

      {/* FAQ */}
      <section style={{ ...wrap, marginTop: mobile?40:64, maxWidth:820 }}>
        <div className="eyebrow" style={{ marginBottom:10, textAlign:'center' }}>{t('sw2GoodToKnow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px', textAlign:'center' }}>{cms('door.faq.title','Door questions, answered.')}</h2>
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
          <h2 className="display" style={{ fontSize: mobile?28:42, margin:'0 0 10px' }}>{cms('door.cta.title','Your perfect door starts here.')}</h2>
          <p style={{ fontSize: mobile?15:18, opacity:.92, maxWidth:520, margin:'0 auto 22px' }}>{cms('door.cta.subtitle','Plan it with a live quote, or book a free home visit — no obligation.')}</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button type="button" onClick={()=>setPage('door-planner')} style={{ background:'var(--c-surface)', color:'var(--clay-deep)', border:'none', borderRadius:'var(--radius-lg)', padding:'15px 30px', fontSize:16, fontWeight:700, cursor:'pointer' }}>{cms('door.cta.button','Open the wood door planner →')}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.5)', borderRadius:'var(--radius-lg)', padding:'15px 30px', fontSize:16, fontWeight:600, cursor:'pointer' }}>{t('sw2BookFreeVisit')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { DoorsPage };
