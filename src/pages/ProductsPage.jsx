// Route chunk "ProductsPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ProductsPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { trCat, useI18n, useMobile, useReveal } from '../App';
import { ProductCard } from './shared_ProductsPage_ProductDetailPage';

/* ── GALLERY ── */
function ProductsPage({ products, setPage, addToCart, setConfigProduct }) {
  const { t, lang } = useI18n();
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const mobile = useMobile();
  useReveal();
  const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => (cat === 'All' || p.category === cat) && (!search || p.name?.toLowerCase().includes(search.toLowerCase())));
  return (
    <div style={{ minHeight: '100dvh', paddingTop: mobile ? 72 : 104, paddingBottom: mobile ? 90 : 60, background: 'var(--cream)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: mobile ? '8px 24px 0' : '24px 48px 0' }}>
        <div className="rv" style={{ marginBottom: 28, maxWidth: 660 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{t('w4ProdEyebrow')}</div>
          <h1 className="display" style={{ fontSize: mobile ? 38 : 60, color: 'var(--ink)', marginBottom: 14 }}>{t('w4ProdTitle')}</h1>
          <p style={{ fontSize: mobile ? 16 : 18, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{t('w4ProdSub')}</p>
        </div>
        <div className="rv" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 30 }}>
          <div style={{ flex: mobile ? '1 1 100%' : '0 0 280px' }}>
            <input className="inp" placeholder={t('w4ProdSearch')} aria-label={t('w4ProdSearchAria')} value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 15, background: '#fff', border: '1px solid var(--line)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {cats.map(c => (
              <button type="button" key={c} onClick={() => setCat(c)} style={{ padding: '9px 18px', borderRadius: 980, border: '1px solid ' + (cat === c ? 'var(--clay)' : 'var(--line)'), background: cat === c ? 'var(--clay)' : 'transparent', color: cat === c ? '#fff' : 'var(--ink-soft)', fontSize: 13.5, fontWeight: cat === c ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 38, flexShrink: 0, transition: 'all .2s' }}>{c==='All'?t('w4ProdAll'):trCat(c, lang)}</button>
            ))}
          </div>
          <div className="hide-mobile" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} {filtered.length === 1 ? t('w4ProdPiece') : t('w4ProdPieces')}</div>
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}><div className="display" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 8 }}>{t('w4ProdNothing')}</div><div>{t('w4ProdTryDifferent')}</div></div>
          : <div className="reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 22, paddingBottom: 40 }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />)}
            </div>
        }
      </div>
    </div>
  );
}

export { ProductsPage };
