// Route chunk "OfficePage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: OfficePage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { HERO_IMG, cms, fmt, useI18n, useMobile } from '../App';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { OFFICE_LAYOUTS, OFFICE_STORAGE, OFFICE_WORKTOPS } from './shared_OfficePlannerWizard_OfficePage';

function OfficePage({ setPage, products }) {
  const mobile = useMobile();
  const { t } = useI18n();
  const [faq, setFaq] = useState(-1);
  const { map: dbLayouts } = useLayouts('office');
  const officeLayouts = OFFICE_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const officeProducts = (products||[]).filter(p =>
    /office|study|desk|workspace|home\s*office/i.test(p.category||'') ||
    /office|study|desk/i.test(p.name||''));
  const heroImg = (dbLayouts['l-shaped'] && dbLayouts['l-shaped'].hero_url) || HERO_IMG.office;
  const wrap = { maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding:'0 var(--gutter)' };
  const FAQS = t('sw2OfFaq');
  const designYoursLbl = t('sw2DesignYours');

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop:'var(--nav-h)', paddingBottom:90 }}>
      {/* HERO */}
      <section style={{ position:'relative', minHeight: mobile?440:560, display:'flex', alignItems:'flex-end', backgroundImage:`linear-gradient(to top, rgba(20,16,12,.72), rgba(20,16,12,.15)), url('${cms('office.hero.image', heroImg)}')`, backgroundSize:'cover', backgroundPosition:'center' }}>
        <div style={{ ...wrap, paddingBottom: mobile?32:54, color:'#fff' }}>
          <div style={{ fontSize:12, letterSpacing:'.18em', textTransform:'uppercase', opacity:.85, marginBottom:12 }}>{cms('office.hero.eyebrow', 'Bespoke home offices & study spaces · Bahrain')}</div>
          <h1 className="display" style={{ fontSize: mobile?34:60, lineHeight:1.05, maxWidth:780, margin:0 }}>{cms('office.hero.title', t('officeHeroTitle'))}</h1>
          <p style={{ fontSize: mobile?15:19, maxWidth:560, marginTop:14, opacity:.92, lineHeight:1.55 }}>{cms('office.hero.subtitle', t('officeHeroSub'))}</p>
          <div style={{ display:'flex', gap:12, marginTop:24, flexWrap:'wrap' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('office-planner')} style={{ borderRadius:'var(--radius-lg)' }}>{cms('office.hero.cta', t('openOfficePlanner'))}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.45)', borderRadius:'var(--radius-lg)', padding:'15px 28px', fontSize:16, fontWeight:600, cursor:'pointer', backdropFilter:'blur(6px)' }}>{t('bookFreeVisit')}</button>
          </div>
        </div>
      </section>

      {/* LAYOUT TYPES gallery — each uses its /layouts/office/<id>.jpg photo */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2OfLayoutsEyebrow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw2OfFindSetup')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{t('sw2OfLayoutsSub')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:16 }}>
          {officeLayouts.map(t=>(
            <button key={t.id} type="button" className="lift" onClick={()=>setPage('office-planner')} style={{ textAlign:'left', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', overflow:'hidden', background:'var(--c-surface)', cursor:'pointer', padding:0, boxShadow:'var(--shadow)' }}>
              <div style={{ height: mobile?170:210, background:`url('${t.img}') center/cover` }} />
              <div style={{ padding:'18px 20px' }}>
                <div style={{ fontSize:20, fontWeight:600, color:'var(--ink)' }}>{t.name}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{t.sub}</div>
                {t.desc && <p style={{ fontSize:13, color:'var(--ink-soft)', margin:'8px 0 0', lineHeight:1.5 }}>{t.desc}</p>}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, margin:'12px 0' }}>
                  {(Array.isArray(t.bullets)&&t.bullets.length?t.bullets:t.feats).map(c=>(<span key={c} style={{ fontSize:11, background:'var(--sand)', color:'var(--ink-soft)', borderRadius:'var(--radius-pill)', padding:'4px 10px' }}>{c}</span>))}
                </div>
                <div style={{ fontSize:12.5, color:'var(--clay)', fontWeight:600 }}>{designYoursLbl}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* STORAGE & DESK strip */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2OfDeskEyebrow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw2WardOrganised')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{t('sw2OfDeskSub')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(5,1fr)', gap:12 }}>
          {OFFICE_STORAGE.map(f=>(
            <div key={f.id} className="lift" style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'16px 14px', textAlign:'center' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.4" style={{ margin:'0 auto 8px' }}><path d="M4 6h16v12H4z M4 12h16" /></svg>
              <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{f.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:3, lineHeight:1.35 }}>{t('sw2OfPer')} {f.unit}</div>
              <div style={{ fontSize:12, color:'var(--clay)', fontWeight:700, marginTop:6 }}>+{fmt(f.price)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MATERIALS note (worktops) */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2OfWorktopsEyebrow')}</div>
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw2OfWorkHard')}</h2>
        <p style={{ fontSize:15, color:'var(--ink-soft)', maxWidth:600, marginBottom:22 }}>{t('sw2OfWorktopsSub')}</p>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(4,1fr)', gap:14 }}>
          {OFFICE_WORKTOPS.map(w=>(
            <div key={w.id} className="lift" style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'16px 16px' }}>
              <div style={{ height:36, borderRadius:'var(--radius-sm)', background:w.hex, border:'1px solid var(--line)', marginBottom:10 }} />
              <div style={{ fontSize:16, fontWeight:600, color:'var(--ink)' }}>{w.name}</div>
              <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:3 }}>{w.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES / why us */}
      <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
        <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(3,1fr)', gap:16 }}>
          {[
            [t('sw2MadeToMeasure'),t('sw2OfF1Desc'),'M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-6h6v6'],
            [t('sw2OfF2'),t('sw2OfF2Desc'),'M4 7h16v10H4z M8 12h8'],
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
      {officeProducts.length>0 && (
        <section className="reveal" style={{ ...wrap, marginTop: mobile?40:64 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2StartingPoints')}</div>
          <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px' }}>{t('sw2OfPopular')}</h2>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:18 }}>
            {officeProducts.map(p=>(
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
        <h2 className="display" style={{ fontSize: mobile?26:38, color:'var(--ink)', margin:'0 0 22px', textAlign:'center' }}>{t('sw2OfFaqTitle')}</h2>
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
          <h2 className="display" style={{ fontSize: mobile?28:42, margin:'0 0 10px' }}>{t('sw2OfDreamCta')}</h2>
          <p style={{ fontSize: mobile?15:18, opacity:.92, maxWidth:520, margin:'0 auto 22px' }}>{t('sw2OfDreamSub')}</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button type="button" onClick={()=>setPage('office-planner')} style={{ background:'var(--c-surface)', color:'var(--clay-deep)', border:'none', borderRadius:'var(--radius-lg)', padding:'15px 30px', fontSize:16, fontWeight:700, cursor:'pointer' }}>{t('sw2OfOpenPlanner')}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.5)', borderRadius:'var(--radius-lg)', padding:'15px 30px', fontSize:16, fontWeight:600, cursor:'pointer' }}>{t('sw2BookFreeVisit')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { OfficePage };
