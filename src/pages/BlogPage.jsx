// Route chunk "BlogPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: BlogPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeRows } from '../safety/sanitize';
import { HOME_IMG, Photo, api, cms, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function BlogPage() {
  const { t } = useI18n();
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'inspiration'}}).then(d=>{ if(Array.isArray(d)) setRows(sanitizeRows(d)); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow={cms('blog.hero.eyebrow','Inspiration')} title={cms('blog.hero.title','Ideas & guides.')} sub={cms('blog.hero.subtitle','Trends, tips and real projects for kitchens, wardrobes and storage.')}>
    <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:22 }}>
      {rows.map(b=>(
        <div key={b.id} className="rv lift" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, overflow:'hidden', cursor:'pointer' }}>
          <div className="tile-zoom zoomwrap" style={{ position:'relative', height:180 }}>
            <Photo src={b.image_url || HOME_IMG.kitchen} alt={b.title} imgClass="tz" style={{ position:'absolute', inset:0 }} />
          </div>
          <div style={{ padding:'20px 22px' }}>
            {b.subtitle && <div className="eyebrow" style={{ fontSize:11, marginBottom:8 }}>{b.subtitle}</div>}
            <div className="display" style={{ fontSize:19, color:'var(--ink)' }}>{b.title}</div>
            <div style={{ fontSize:14, color:'var(--ink-soft)', marginTop:8, lineHeight:1.65 }}>{b.body}</div>
          </div>
        </div>))}
      {rows.length===0 && <div style={{ color:'var(--muted)' }}>{t('w4ArticlesSoon')}</div>}
    </div>
  </PageWrap>);
}

export { BlogPage };
