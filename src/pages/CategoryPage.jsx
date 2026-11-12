// Route chunk "CategoryPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: CategoryPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { formatBHD } from '../i18n/format';
import { CMS_LANG, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function CategoryPage({ category, products, setPage, addToCart }) {
  const { t } = useI18n();
  const list=(products||[]).filter(p=> (p.category||'').toLowerCase()===category.toLowerCase());
  return (<PageWrap title={category} sub={`${t('swCatSubPre')} ${category.toLowerCase()}${t('swCatSubPost')}`}>
    <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
      <button type="button" onClick={()=>setPage('booking')} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:'var(--radius-pill)', padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{t('bookFreeDesignVisit')}</button>
      <button type="button" onClick={()=>setPage('planner')} style={{ background:'var(--shop-ink)', color:'#fff', border:'none', borderRadius:'var(--radius-pill)', padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{t('designIt3d')}</button>
    </div>
    <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
      {list.map(p=>(<div key={p.id} className="lift" onClick={()=>setPage('product-'+p.id)} style={{ background:'var(--c-surface)', border:'1px solid #ececec', borderRadius:'var(--radius-xl)', overflow:'hidden', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>

        <div style={{ height:170, background: p.image_url?`url('${p.image_url}') center/cover`:'linear-gradient(135deg,#FFF1E8,#F5F5F7)' }} />
        <div style={{ padding:16 }}>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--shop-ink)' }}>{p.name}</div>
          <div style={{ fontSize:13, color:'var(--shop-muted)', marginTop:4 }}>{p.category}</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
            <span style={{ fontSize:16, fontWeight:700, color:'var(--shop-ink)' }}>{formatBHD(p.price||0, CMS_LANG, { whole:true })}</span>
            <button type="button" onClick={e=>{ e.stopPropagation(); addToCart&&addToCart(p); }} style={{ background:'var(--shop-fill)', border:'none', borderRadius:'var(--radius-md)', padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--shop-ink)' }}>{t('add')}</button>
          </div>
        </div>
      </div>))}
      {list.length===0 && <div style={{ color:'var(--c-text-3)' }}>{t('swCatEmptyPre')} {category.toLowerCase()} {t('swCatEmptyPost')}</div>}
    </div>
  </PageWrap>);
}

export { CategoryPage };
