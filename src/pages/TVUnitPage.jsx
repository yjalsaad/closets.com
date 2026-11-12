// Route chunk "TVUnitPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: TVUnitPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { HERO_IMG, cms, fmt, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { TV_FINISH, TV_LAYOUTS, TV_STORAGE } from './shared_TVUnitPlannerWizard_TVUnitPage';

/* ── TV & MEDIA UNITS · editorial catalogue / landing page (mirrors OfficePage) ──
   Group key 'tv'. 6-layout gallery from useLayouts('tv'); "Design yours →" → 'tv-planner'.
   Hero + section headings fully Hub-editable via cms('tv.*', fallback). */
function TVUnitPage({ setPage, products }) {
  const mobile = useMobile();
  const { t } = useI18n();
  const [faq, setFaq] = useState(-1);
  const { map: dbLayouts } = useLayouts('tv');
  const tvLayouts = TV_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const tvProducts = (products||[]).filter(p =>
    /tv|media|entertainment|living/i.test(p.category||'') ||
    /tv|media|entertainment/i.test(p.name||''));
  const heroImg = (dbLayouts['fullwall'] && dbLayouts['fullwall'].hero_url) || HERO_IMG.tv;
  const wrap = { maxWidth:1180, margin:'0 auto', padding: mobile?'0 16px':'0 28px' };
  const FAQS = [
    [cms('tv.faq.q1','How much does a bespoke TV / media wall cost?'), cms('tv.faq.a1','A minimal panel-and-shelf setup starts from around BD 480, a floating media unit from BD 900, and a full floor-to-ceiling media wall with display, storage and lighting from BD 2,200+. Price is driven transparently by the metres of cabinetry, your finish and the extras — build a live estimate in the TV unit planner.')],
    [cms('tv.faq.q2','How long does it take?'), cms('tv.faq.a2','Most media walls are designed, manufactured and installed within 4–7 weeks of sign-off. Real-wood veneer, stone cladding and integrated fireplaces sit at the longer end.')],
    [cms('tv.faq.q3','Can you hide the cables and the AV gear?'), cms('tv.faq.a3','Yes — we build in cable trays, conduits and ventilated bays for the receiver, console and router, with a dedicated power route so nothing is on show.')],
    [cms('tv.faq.q4','Can you build around a fireplace or an awkward wall?'), cms('tv.faq.a4','Absolutely. Every unit is made to measure — we scribe around fireplaces, columns, windows and AC units so the wall reads as one seamless piece.')],
    [cms('tv.faq.q5','What hardware and lighting do you use?'), cms('tv.faq.a5','Blum soft-close hinges and full-extension runners as standard, plus warm 3000K LED for shelves, niches and back panels — all backed by our 10-year cabinetry warranty.')],
    [cms('tv.faq.q6','What warranty do I get?'), cms('tv.faq.a6','10 years on cabinetry and soft-close hardware, plus 5–10 years on finishes depending on the material you choose.')],
  ];
  const designYoursLbl = t('sw2DesignYours');
  const perLbl = t('sw2OfPer');

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?56:64, paddingBottom:90 }}>
      {/* HERO */}
      <section style={{ position:'relative', minHeight: mobile?440:560, display:'flex', alignItems:'flex-end', backgroundImage:`linear-gradient(to top, rgba(20,16,12,.72), rgba(20,16,12,.15)), url('${cms('tv.hero.image', heroImg)}')`, backgroundSize:'cover', backgroundPosition:'center' }}>
        <div style={{ ...wrap, paddingBottom: mobile?32:54, color:'#fff' }}>
          <div style={{ fontSize:12, letterSpacing:'.18em', textTransform:'uppercase', opacity:.85, marginBottom:12 }}>{cms('tv.hero.eyebrow', 'Bespoke TV & media walls · Bahrain')}</div>
          <h1 className="display" style={{ fontSize: mobile?34:60, lineHeight:1.05, maxWidth:780, margin:0 }}>{cms('tv.hero.title', t('tvHeroTitle'))}</h1>
          <p style={{ fontSize: mobile?15:19, maxWidth:560, marginTop:14, opacity:.92, lineHeight:1.55 }}>{cms('tv.hero.subtitle', t('tvHeroSub'))}</p>
          <div style={{ display:'flex', gap:12, marginTop:24, flexWrap:'wrap' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('tv-planner')} style={{ borderRadius:14 }}>{cms('tv.hero.cta', t('openTvPlanner'))}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.45)', borderRadius:14, padding:'15px 28px', fontSize:16, fontWeight:600, cursor:'pointer', backdropFilter:'blur(6px)' }}>{t('bookFreeVisit')}</button>
          </div>
        </div>
      </section>

      {/* LAYOUT TYPES gallery — each uses its /layouts/TV/<id>.jpg photo */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{cms('tv.layouts.eyebrow','TV & media layouts')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{cms('tv.layouts.title','Find your media wall.')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{cms('tv.layouts.subtitle','Six ways to bring the living room together around the screen — from a minimal floating panel to a full storage wall.')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:16 }}>
          {tvLayouts.map(t=>(
            <button key={t.id} type="button" className="lift" onClick={()=>setPage('tv-planner')} style={{ textAlign:'left', border:'1px solid var(--line)', borderRadius:20, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0, boxShadow:'var(--shadow)' }}>
              <div style={{ height: mobile?170:210, background:`url('${t.img}') center/cover` }} />
              <div style={{ padding:'18px 20px' }}>
                <div style={{ fontSize:20, fontWeight:600, color:'var(--ink)' }}>{t.name}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{t.sub}</div>
                {t.desc && <p style={{ fontSize:13, color:'var(--ink-soft)', margin:'8px 0 0', lineHeight:1.5 }}>{t.desc}</p>}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, margin:'12px 0' }}>
                  {(Array.isArray(t.bullets)&&t.bullets.length?t.bullets:t.feats).map(c=>(<span key={c} style={{ fontSize:11, background:'var(--sand)', color:'var(--ink-soft)', borderRadius:999, padding:'4px 10px' }}>{c}</span>))}
                </div>
                <div style={{ fontSize:12.5, color:'var(--clay)', fontWeight:600 }}>{designYoursLbl}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* STORAGE & DISPLAY strip */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{cms('tv.storage.eyebrow','Display & storage')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{cms('tv.storage.title','Every box, book and console in its place.')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{cms('tv.storage.subtitle','Mix open shelving, display niches, closed cabinets and ventilated AV bays — every element priced transparently per unit.')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(6,1fr)', gap:12 }}>
          {TV_STORAGE.map(f=>(
            <div key={f.id} className="lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:16, padding:'16px 14px', textAlign:'center' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.4" style={{ margin:'0 auto 8px' }}><path d="M4 6h16v12H4z M4 12h16" /></svg>
              <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{f.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:3, lineHeight:1.35 }}>{perLbl} {f.unit}</div>
              <div style={{ fontSize:12, color:'var(--clay)', fontWeight:700, marginTop:6 }}>+{fmt(f.price)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MATERIALS note (finishes) */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{cms('tv.materials.eyebrow','Finishes & materials')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{cms('tv.materials.title','Surfaces that set the mood.')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{cms('tv.materials.subtitle','From durable melamine to real-wood veneer and high-gloss lacquer — pick the finish and decorative panel that suit your room.')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(5,1fr)', gap:14 }}>
          {TV_FINISH.map(w=>(
            <div key={w.id} className="lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:16, padding:'16px 16px' }}>
              <div style={{ height:36, borderRadius:9, background:w.hex, border:'1px solid var(--line)', marginBottom:10 }} />
              <div style={{ fontSize:16, fontWeight:600, color:'var(--ink)' }}>{w.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES / why us */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:16 }}>
          {[
            [t('sw2MadeToMeasure'),t('sw2TvF1Desc'),'M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-6h6v6'],
            [t('sw2TvF2'),t('sw2TvF2Desc'),'M4 7h16v10H4z M8 12h8'],
            [t('sw2OneTeam'),t('sw2OneTeamDesc'),'M12 2a5 5 0 015 5c0 3-5 9-5 9S7 10 7 7a5 5 0 015-5z'],
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
      {tvProducts.length>0 && (
        <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2StartingPoints')}</div>
          <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px' }}>{t('sw2TvPopular')}</h2>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:18 }}>
            {tvProducts.map(p=>(
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

      {/* FAQ */}
      <section style={{ ...wrap, marginTop: mobile?40:64, maxWidth:820 }}>
        <div className="eyebrow" style={{ marginBottom:10, textAlign:'center' }}>{t('sw2GoodToKnow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px', textAlign:'center' }}>{cms('tv.faq.title','Media wall questions, answered.')}</h2>
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
          <h2 className="display" style={{ fontSize: mobile?28:42, margin:'0 0 10px' }}>{cms('tv.cta.title','Your dream media wall starts here.')}</h2>
          <p style={{ fontSize: mobile?15:18, opacity:.92, maxWidth:520, margin:'0 auto 22px' }}>{cms('tv.cta.subtitle','Plan it with a live quote, or book a free home visit — no obligation.')}</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button type="button" onClick={()=>setPage('tv-planner')} style={{ background:'#fff', color:'var(--clay-deep)', border:'none', borderRadius:14, padding:'15px 30px', fontSize:16, fontWeight:700, cursor:'pointer' }}>{cms('tv.cta.button','Open the TV unit planner →')}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.5)', borderRadius:14, padding:'15px 30px', fontSize:16, fontWeight:600, cursor:'pointer' }}>{t('sw2BookFreeVisit')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { TVUnitPage };
