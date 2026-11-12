// Route chunk "OffersPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: OffersPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { OFFER_BADGE_KEY, OFFER_SUB_KEY, OFFER_TITLE_KEY, api, cms, trMap, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { EmptyState } from '../design/PageHeader';

function OffersPage({ setPage }) {
  const { t, lang } = useI18n();
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('store_offers?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow={lang==='ar' ? 'العروض' : 'Offers'} title={cms('offers.hero.title','Offers & promotions')} sub={cms('offers.hero.subtitle','Current savings on bespoke kitchens, wardrobes and storage.')}>
    {rows.length>0 ? (
      <div className="reveal card-grid">
        {rows.map(o=>(<div key={o.id} className="offer-card">
          {o.badge && <span className="badge">{trMap(o.badge, OFFER_BADGE_KEY, lang)}</span>}
          <h2 className="t-h3" style={{ margin:0 }}>{trMap(o.title, OFFER_TITLE_KEY, lang)}</h2>
          <p style={{ margin:0, color:'var(--c-text-2)', lineHeight:1.65 }}>{trMap(o.subtitle, OFFER_SUB_KEY, lang)}</p>
          <button type="button" className="btn-ink" style={{ justifySelf:'start', marginTop:8 }} onClick={()=>setPage('booking')}>{t('w4ClaimOffer')}</button>
        </div>))}
      </div>
    ) : (
      <EmptyState lang={lang} icon="sparkle" title={lang==='ar' ? 'لا توجد عروض معلنة حاليًا' : 'No seasonal offers are running right now'}
        body={lang==='ar' ? 'نعلن عن العروض الموسمية هنا عند توفرها. احجز استشارة وسنخبرك بأي ميزة متاحة لمشروعك.' : 'Seasonal offers are published here when they run. Book a consultation and we will tell you what is available for your project.'} />
    )}
  </PageWrap>);
}

export { OffersPage };
