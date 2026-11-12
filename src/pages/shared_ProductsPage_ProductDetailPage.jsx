// Route chunk "shared_ProductsPage_ProductDetailPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ProductsPage, ProductDetailPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { Barcode128 } from '../barcode128';
import { HOME_IMG, Photo, fmt, toast, trCat, useI18n } from '../App';

function ProductCard({ product: p, setPage, addToCart, setConfigProduct }) {
  const { t, lang } = useI18n();
  return (
    <div className="rv lift" onClick={() => setPage('product-' + p.id)} style={{ cursor: 'pointer', background: 'var(--c-surface)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--line)' }}>
      <div className="tile-zoom zoomwrap" style={{ position: 'relative', aspectRatio: '4/5' }}>
        <Photo src={p.image_url || HOME_IMG.wardrobe} alt={p.name} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
        {p.badge && <span style={{ position: 'absolute', top: 12, left: 12, background: 'var(--clay)', color: '#fff', padding: '4px 11px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 600, letterSpacing: '.02em' }}>{p.badge === 'Featured' ? t('cardFeatured') : p.badge}</span>}
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{p.category ? trCat(p.category, lang) : t('w4PdBespoke')}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: (p.barcode || p.sku) ? 8 : 14 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{p.name}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--clay)', whiteSpace: 'nowrap' }}>{fmt(p.price)}</div>
        </div>
        {(p.barcode || p.sku) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Barcode128 value={p.barcode || p.sku} height={20} background="transparent" color="var(--muted)" width={62} style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, letterSpacing: '.03em', color: 'var(--muted)' }}>SKU: {p.barcode || p.sku}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={e => { e.stopPropagation(); addToCart(p); toast('Added to cart ✓', 'success'); }} style={{ flex: 1, background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '11px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{t('w4PdAddToCart')}</button>
          <button type="button" title={t('w4PdCustomise')} aria-label={t('w4PdCustomise')} onClick={e => { e.stopPropagation(); setPage('planner'); }} style={{ background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '11px 14px', fontSize: 15, cursor: 'pointer', minHeight: 44, color: 'var(--ink)' }}>✦</button>
        </div>
      </div>
    </div>
  );
}

export { ProductCard };
