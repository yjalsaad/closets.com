// Route chunk "FaqPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: FaqPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeRows } from '../safety/sanitize';
import { api, cms, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { EmptyState } from '../design/PageHeader';
import { Icon } from '../design/Icon';

function FaqPage() {
  const { lang } = useI18n();
  const [rows,setRows]=useState([]); const [open,setOpen]=useState(null);
  useEffect(()=>{ api('website_faqs?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(sanitizeRows(d)); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow={lang==='ar' ? 'مساعدة' : 'Help'} title={cms('faq.hero.title','Frequently asked questions')} sub={cms('faq.hero.subtitle','Everything you need to know about designing with us.')}>
    {rows.length>0 ? (
      <div className="reveal" style={{ maxWidth:820 }}>
        {rows.map(q=>(<div key={q.id} className="faq-item">
          <button type="button" className="faq-q" onClick={()=>setOpen(open===q.id?null:q.id)} aria-expanded={open===q.id} aria-controls={'faq-a-'+q.id} id={'faq-q-'+q.id}>
            <span>{q.question}</span><Icon name="plus" />
          </button>
          {open===q.id && <div className="faq-a" id={'faq-a-'+q.id} role="region" aria-labelledby={'faq-q-'+q.id}>{q.answer}</div>}
        </div>))}
      </div>
    ) : (
      <EmptyState lang={lang} icon="chat" title={lang==='ar' ? 'اسألنا مباشرة' : 'Ask us directly'}
        body={lang==='ar' ? 'يردّ فريق التصميم لدينا على أسئلتك عن المواد والمدّة والتركيب والضمان. اكتب لنا أو احجز استشارة.' : 'Our design team answers questions on materials, timelines, installation and warranty. Message us, or book a consultation.'} />
    )}
  </PageWrap>);
}

export { FaqPage };
