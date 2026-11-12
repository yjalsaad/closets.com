// Route chunk "ShowroomsPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ShowroomsPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeRows } from '../safety/sanitize';
import { HOME_IMG, Photo, api, cms, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function ShowroomsPage() {
  const { t } = useI18n();
  const [rows,setRows]=useState([]);
  // Single source of truth: same content the Hub manages & the app shows.
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'showroom'}}).then(d=>{ if(Array.isArray(d)) setRows(sanitizeRows(d)); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow={cms('showrooms.hero.eyebrow','Visit us')} title={cms('showrooms.hero.title','Showrooms across Bahrain.')} sub={cms('showrooms.hero.subtitle','Experience our craftsmanship in person — see the finishes, open the drawers, feel the build.')}>
    <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:22 }}>
      {rows.map(s=>{ const m=s.meta||{}; return (
        <div key={s.id} className="rv lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, overflow:'hidden' }}>
          <div className="tile-zoom zoomwrap" style={{ position:'relative', height:170 }}>
            <Photo src={s.image_url || HOME_IMG.living} alt={s.title} imgClass="tz" style={{ position:'absolute', inset:0 }} />
          </div>
          <div style={{ padding:'20px 22px' }}>
            <div className="display" style={{ fontSize:20, color:'var(--ink)' }}>{s.title}</div>
            <div style={{ fontSize:14, color:'var(--ink-soft)', marginTop:8, lineHeight:1.6 }}>{m.address||s.subtitle}</div>
            {(m.hours)&&<div style={{ fontSize:13, color:'var(--muted)', marginTop:10 }}>🕑 {m.hours}</div>}
            {(m.phone)&&<a href={'tel:'+m.phone} style={{ display:'inline-block', marginTop:14, color:'var(--clay)', fontWeight:600, fontSize:14, textDecoration:'none' }}>{m.phone} →</a>}
          </div>
        </div>); })}
      {rows.length===0 && <div style={{ color:'var(--muted)' }}>{t('w4ShowroomsSoon')}</div>}
    </div>
  </PageWrap>);
}

export { ShowroomsPage };
