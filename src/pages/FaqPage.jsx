// Route chunk "FaqPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: FaqPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeRows } from '../safety/sanitize';
import { api, cms, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function FaqPage() {
  const { t } = useI18n();
  const [rows,setRows]=useState([]); const [open,setOpen]=useState(null);
  useEffect(()=>{ api('website_faqs?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(sanitizeRows(d)); }).catch(()=>{}); },[]);
  return (<PageWrap title={cms('faq.hero.title','Frequently asked questions')} sub={cms('faq.hero.subtitle','Everything you need to know about designing with us.')}>
    <div className="reveal reveal-stagger" style={{ maxWidth:760, display:'flex', flexDirection:'column', gap:12 }}>
      {rows.map(q=>(<div key={q.id} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:16, overflow:'hidden' }}>
        <button type="button" onClick={()=>setOpen(open===q.id?null:q.id)} style={{ width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'18px 20px', fontSize:16, fontWeight:600, color:'var(--shop-ink, #1d1d1f)', display:'flex', justifyContent:'space-between', gap:12 }}>
          <span>{q.question}</span><span style={{ color:'var(--clay)', flexShrink:0 }}>{open===q.id?'–':'+'}</span>
        </button>
        {open===q.id && <div style={{ padding:'0 20px 18px', fontSize:15, color:'#555', lineHeight:1.65 }}>{q.answer}</div>}
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>{t('swFaqSoon')}</div>}
    </div>
  </PageWrap>);
}

export { FaqPage };
