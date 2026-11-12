// Route chunk "PortfolioPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: PortfolioPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeProjects } from '../safety/sanitize';
import { api, cms, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function BeforeAfter({ before, after }) {
  const [show,setShow]=useState('after');
  return (<div style={{ position:'relative' }}>
    <div style={{ height:200, borderRadius:14, background:`url('${show==='after'?after:before}') center/cover`, transition:'background .2s' }} />
    <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:6 }}>
      {['before','after'].map(k=>(<button type="button" key={k} onClick={()=>setShow(k)} style={{ background: show===k?'var(--shop-ink, #1d1d1f)':'rgba(255,255,255,.9)', color: show===k?'#fff':'var(--shop-ink, #1d1d1f)', border:'none', borderRadius:980, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', textTransform:'capitalize' }}>{k}</button>))}
    </div>
  </div>);
}

function PortfolioPage({ setPage }) {
  const { t, lang } = useI18n();
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('website_projects?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(sanitizeProjects(d)); }).catch(()=>{}); },[]);
  // Category VALUE stays English (used in route 'cat:'+value); label is translated for display.
  const cats=[['Kitchens',t('swPortCatKitchens')],['Wardrobes',t('swPortCatWardrobes')],['Walk-In Closets',t('swPortCatWalkin')],['TV Units',t('swPortCatTv')],['Doors',t('swPortCatDoors')],['Storage Solutions',t('swPortCatStorage')],['Office Furniture',t('swPortCatOffice')]];
  const [filter,setFilter]=useState('all');
  const scopes = Array.from(new Set(rows.map(p=>p.category).filter(Boolean)));
  const visible = filter==='all' ? rows : rows.filter(p=>p.category===filter);
  const PF_CSS = `
    .pf-card{position:relative;background:#fff;border:1px solid #ececec;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);
      transition:transform .34s cubic-bezier(.22,1,.36,1),box-shadow .34s,border-color .3s;cursor:default}
    .pf-card:hover{transform:translateY(-6px);box-shadow:0 32px 60px -28px rgba(0,0,0,.28);border-color:#e2e2e2}
    .pf-cover{overflow:hidden}
    .pf-cover>*{transition:transform .6s cubic-bezier(.22,1,.36,1)}
    .pf-card:hover .pf-cover>*{transform:scale(1.05)}
    .pf-arrow{opacity:0;transform:translateX(-6px);transition:.32s cubic-bezier(.22,1,.36,1)}
    .pf-card:hover .pf-arrow{opacity:1;transform:none}
    .pf-chip{transition:transform .16s cubic-bezier(.22,1,.36,1),background .2s,color .2s}
    .pf-chip:active{transform:scale(.95)}
    @media (prefers-reduced-motion:reduce){.pf-card,.pf-card *,.pf-chip{transition:none!important}}
  `;
  const cover = (p)=>{
    const inner = p.cover_url
      ? <div style={{ width:'100%', height:'100%', background:`url('${p.cover_url}') center/cover, #eee` }} />
      : (()=>{ const initials=(p.name||'?').replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'•';
          return (<div style={{ width:'100%', height:'100%', position:'relative', background:'radial-gradient(120% 100% at 20% 0%, #FFF3EA 0%, #F6F6F8 55%, #EAF6F4 100%)', display:'grid', placeItems:'center' }}>
            <div style={{ fontSize:56, fontWeight:800, letterSpacing:'-.05em', color:'var(--clay)', opacity:.22 }}>{initials}</div>
            <img src="/brand/bonsai-mark.svg" alt="" style={{ position:'absolute', right:14, top:14, width:24, height:24, opacity:.5 }} />
          </div>); })();
    return (<div className="pf-cover" style={{ position:'relative', aspectRatio:'4 / 3', background:'#f2f2f4' }}>
      {p.before_url && p.after_url ? <BeforeAfter before={p.before_url} after={p.after_url} /> : inner}
      {p.category && <div style={{ position:'absolute', bottom:12, left:12, background:'rgba(255,255,255,.9)', backdropFilter:'blur(6px)', borderRadius:980, padding:'5px 12px', fontSize:11.5, fontWeight:700, color:'var(--shop-ink, #1d1d1f)' }}>{p.category}</div>}
    </div>);
  };
  const card = (p)=>(<div key={p.id} className="pf-card">
    {cover(p)}
    <div style={{ padding:'20px 22px 22px' }}>
      <div style={{ fontSize:11.5, color:'var(--clay)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em' }}>{p.client_type||'Project'}</div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginTop:7 }}>
        <div style={{ fontSize:19, fontWeight:600, letterSpacing:'-.02em', color:'var(--shop-ink, #1d1d1f)', lineHeight:1.2 }}>{p.name}</div>
        <span className="pf-arrow" style={{ color:'var(--clay)', fontSize:20, flexShrink:0, marginTop:2 }}>{lang==='ar'?'←':'→'}</span>
      </div>
      {p.location && <div style={{ fontSize:13.5, color:'var(--shop-muted, #86868b)', marginTop:8, display:'flex', alignItems:'center', gap:5 }}>📍 {p.location}</div>}
      {p.description && <div style={{ fontSize:14, color:'var(--shop-muted, #86868b)', marginTop:10, lineHeight:1.6 }}>{p.description}</div>}
    </div>
  </div>);
  const groups=[]; const gidx={};
  visible.forEach(p=>{ const c=(p.client_type||'Other'); if(gidx[c]==null){ gidx[c]=groups.length; groups.push([c,[]]); } groups[gidx[c]][1].push(p); });
  const chip=(on)=>({ background:on?'var(--shop-ink, #1d1d1f)':'var(--shop-fill, #f5f5f7)', color:on?'#fff':'var(--shop-ink, #1d1d1f)', border:'none', borderRadius:980, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer' });
  return (<PageWrap title={cms('projects.hero.title','Our projects')} sub={cms('projects.hero.subtitle','Real spaces we have designed, manufactured and installed across Bahrain.')}>
    <style>{PF_CSS}</style>
    {/* Hairline stats — Apple-minimal */}
    <div className="reveal" style={{ display:'flex', flexWrap:'wrap', margin:'8px 0 40px', borderTop:'1px solid #ededed', borderBottom:'1px solid #ededed' }}>
      {[['20','Years of craft'],[(rows.length||0)+'+','Projects delivered'],['In-house','Own workshop'],['Bahrain','Design · make · install']].map(([n,l],i)=>(
        <div key={l} style={{ flex:'1 1 150px', minWidth:140, padding:'24px 6px 24px 22px', borderLeft: i? '1px solid #ededed':'none' }}>
          <div style={{ fontSize:'clamp(28px,4vw,40px)', fontWeight:800, letterSpacing:'-.045em', lineHeight:1, color:'var(--shop-ink, #1d1d1f)' }}>{n}</div>
          <div style={{ fontSize:12.5, color:'var(--shop-muted, #86868b)', marginTop:9, fontWeight:600 }}>{l}</div>
        </div>
      ))}
    </div>
    {/* Scope filter pills */}
    {scopes.length>1 && (
      <div className="reveal" style={{ display:'flex', gap:9, flexWrap:'wrap', marginBottom:36 }}>
        <button type="button" className="pf-chip" onClick={()=>setFilter('all')} style={chip(filter==='all')}>{lang==='ar'?'كل المشاريع':'All projects'}</button>
        {scopes.map(s=>(<button type="button" key={s} className="pf-chip" onClick={()=>setFilter(s)} style={chip(filter===s)}>{s}</button>))}
      </div>
    )}
    {/* Client-grouped cards */}
    {rows.length===0 ? <div style={{ color:'#aaa', marginBottom:56 }}>{t('swPortGallerySoon')}</div> : (
      <div style={{ marginBottom:64 }}>
        {groups.map(([client,items])=>(<div key={client} style={{ marginBottom:52 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:12, margin:'0 0 20px' }}>
            <h3 style={{ margin:0, fontSize:'clamp(21px,3vw,26px)', fontWeight:700, letterSpacing:'-.03em', color:'var(--shop-ink, #1d1d1f)' }}>{client}</h3>
            <span style={{ fontSize:14, color:'var(--shop-muted, #86868b)', fontWeight:500 }}>{items.length} {items.length===1?'project':'projects'}</span>
          </div>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:22 }}>
            {items.map(card)}
          </div>
        </div>))}
      </div>
    )}
    {/* Explore by room */}
    <div style={{ fontSize:12.5, color:'var(--shop-muted, #86868b)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700, marginBottom:16 }}>{t('swPortExploreByRoom')}</div>
    <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12 }}>
      {cats.map(([val,label])=>(<button type="button" key={val} className="lift" onClick={()=>setPage('cat:'+val)} style={{ background:'var(--shop-fill, #f5f5f7)', border:'none', borderRadius:16, padding:'20px 18px', textAlign:'left', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'var(--shop-ink, #1d1d1f)' }}>{lang==='ar' ? <>← {label}</> : <>{label} →</>}</button>))}
    </div>
  </PageWrap>);
}

export { PortfolioPage };
