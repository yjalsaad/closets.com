// Route chunk "OffersPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: OffersPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { OFFER_BADGE_KEY, OFFER_SUB_KEY, OFFER_TITLE_KEY, api, cms, trMap, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function OffersPage({ setPage }) {
  const { t, lang } = useI18n();
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api('store_offers?active=eq.true&order=sort_order.asc').then(d=>{ if(Array.isArray(d)) setRows(d); }).catch(()=>{}); },[]);
  return (<PageWrap title={cms('offers.hero.title','Offers & promotions')} sub={cms('offers.hero.subtitle','Current savings on bespoke kitchens, wardrobes and storage.')}>
    <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
      {rows.map(o=>(<div key={o.id} className="lift" style={{ background:'linear-gradient(135deg,var(--sand),#fff)', border:'1px solid var(--clay)33', borderRadius:18, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        {o.badge && <span style={{ display:'inline-block', background:'var(--clay)', color:'#fff', fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:980 }}>{trMap(o.badge, OFFER_BADGE_KEY, lang)}</span>}
        <div style={{ fontSize:19, fontWeight:700, color:'var(--shop-ink, #1d1d1f)', marginTop:12 }}>{trMap(o.title, OFFER_TITLE_KEY, lang)}</div>
        <div style={{ fontSize:14, color:'var(--shop-muted, #86868b)', marginTop:6, lineHeight:1.6 }}>{trMap(o.subtitle, OFFER_SUB_KEY, lang)}</div>
        <button type="button" onClick={()=>setPage('booking')} style={{ marginTop:16, background:'var(--shop-ink, #1d1d1f)', color:'#fff', border:'none', borderRadius:980, padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer' }}>{t('w4ClaimOffer')}</button>
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>{t('w4NoOffers')}</div>}
    </div>
  </PageWrap>);
}

export { OffersPage };
