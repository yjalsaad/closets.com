// Route chunk "ProductsPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ProductsPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { trCat, useI18n, useMobile, useReveal } from '../App';
import { ProductCard } from './shared_ProductsPage_ProductDetailPage';
import PageHeader, { EmptyState } from '../design/PageHeader';

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
    <div className="page">
      <PageHeader lang={lang} eyebrow={t('w4ProdEyebrow')} title={t('w4ProdTitle')} sub={t('w4ProdSub')} />
      <div className="container page-body">
        {products.length === 0 ? (
          <EmptyState lang={lang} icon="image" title={lang==='ar' ? 'المعرض قيد التحديث' : 'The gallery is being refreshed'} body={lang==='ar' ? 'نضيف قطعًا جديدة إلى المعرض. في الأثناء، احجز استشارة لنعرض لك ما يناسب مساحتك.' : 'We are adding new pieces to the gallery. In the meantime, book a consultation and we will show you what suits your space.'} />
        ) : (<>
        <div className="rv" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end', marginBottom: 'var(--space-6)' }}>
          <div style={{ flex: mobile ? '1 1 100%' : '0 0 300px' }}>
            <label htmlFor="gal-search" className="field-label">{t('w4ProdSearchAria')}</label>
            <input id="gal-search" className="inp" placeholder={t('w4ProdSearch')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div role="group" aria-label={t('w4ProdEyebrow')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <button type="button" key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c === 'All' ? (lang==='ar' ? 'الكل' : 'All') : trCat(c, lang)}</button>
            ))}
          </div>
          <div className="hide-mobile" style={{ marginInlineStart: 'auto', fontSize: 'var(--fs-sm)', color: 'var(--c-text-3)' }}>{filtered.length} {filtered.length === 1 ? t('w4ProdPiece') : t('w4ProdPieces')}</div>
        </div>
        {filtered.length === 0
          ? <EmptyState lang={lang} primary={false} icon="search" title={t('w4ProdNothing')} body={t('w4ProdTryDifferent')} />
          : <div className="reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 'var(--space-6)' }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />)}
            </div>
        }
        </>)}
      </div>
    </div>
  );
}

export { ProductsPage };
