// Route chunk "BlogPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: BlogPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeRows } from '../safety/sanitize';
import { HOME_IMG, Photo, api, cms, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { EmptyState } from '../design/PageHeader';

function BlogPage() {
  const { lang } = useI18n();
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'inspiration'}}).then(d=>{ if(Array.isArray(d)) setRows(sanitizeRows(d)); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow={cms('blog.hero.eyebrow',lang==='ar' ? 'إلهام' : 'Journal')} title={cms('blog.hero.title',lang==='ar' ? 'أفكار وأدلّة' : 'Ideas & guides')} sub={cms('blog.hero.subtitle','Trends, tips and real projects for kitchens, wardrobes and storage.')}>
    {rows.length>0 ? (
      <div className="reveal card-grid">
        {rows.map(b=>(
          <article key={b.id} className="media-card">
            <div className="img-frame ar-43 tile-zoom"><Photo src={b.image_url || HOME_IMG.kitchen} alt="" imgClass="tz" style={{ position:'absolute', inset:0 }} /></div>
            <div className="body">
              {b.subtitle && <span className="eyebrow">{b.subtitle}</span>}
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          </article>))}
      </div>
    ) : (
      <EmptyState lang={lang} icon="layers" title={lang==='ar' ? 'مقالاتنا قيد الإعداد' : 'The journal is being written'}
        body={lang==='ar' ? 'نعدّ أدلّة عن المواد والتخطيط والتشطيبات. في الأثناء، يسعد فريق التصميم بالإجابة عن أسئلتك.' : 'We are preparing guides on materials, planning and finishes. In the meantime our design team is happy to answer your questions.'} />
    )}
  </PageWrap>);
}

export { BlogPage };
