// Route chunk "ProductDetailPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ProductDetailPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect, createElement } from 'react';
import { hasConsent } from '../privacy/consent';
import { Barcode128 } from '../barcode128';
import { loadModelViewer } from '../modelViewerLoader';
import { HOME_IMG, Photo, SUPA_KEY, SUPA_URL, fmt, prefersReducedMotionNow, toast, useI18n, useMobile, useReveal } from '../App';
import { ProductCard } from './shared_ProductsPage_ProductDetailPage';

/* ── PRODUCT DETAIL ── */
function ProductDetailPage({ productId, products, setPage, addToCart, setConfigProduct }) {
  const { t } = useI18n();
  const product = products.find(p => p.id === productId);
  const [qty, setQty] = useState(1);
  const mobile = useMobile();
  const [aiRecIds, setAiRecIds] = useState([]);
  useReveal();
  useEffect(() => {
    if (!product) return; let alive = true;
    if (!hasConsent('ai')) return undefined;   // [PRIVACY] passive AI call on page view: only after the visitor allowed AI processing
    fetch(SUPA_URL + '/functions/v1/recommend_products', { method:'POST', headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json' }, body: JSON.stringify({ product_id: product.id, category: product.category }) })
      .then(r => r.json()).then(d => { if (alive && d && d.ok && Array.isArray(d.items)) setAiRecIds(d.items.map(i => i.id)); }).catch(() => {});
    return () => { alive = false; };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!product) return <div style={{ padding: '100px 24px', textAlign: 'center' }}><button type="button" className="btn-secondary" onClick={() => setPage('products')}>{t('pBack')}</button></div>;
  const localRelated = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, mobile ? 2 : 3);
  const aiRelated = aiRecIds.map(id => products.find(p => p.id === id)).filter(p => p && p.id !== product.id);
  const related = aiRelated.length ? aiRelated.slice(0, mobile ? 2 : 3) : localRelated;
  const recLabel = aiRelated.length ? t('w4PdRecommended') : t('w4PdYouMayLike');
  return (
    <div style={{ minHeight: '100dvh', paddingTop: mobile ? 0 : 96, paddingBottom: mobile ? 100 : 60, background: 'var(--cream)' }}>
      {mobile && (
        <div style={{ position: 'relative' }}>
          <Photo src={product.image_url || HOME_IMG.wardrobe} alt={product.name} style={{ aspectRatio: '1/1' }} />
          <button type="button" onClick={() => setPage('products')} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>
      )}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: mobile ? '24px 16px' : '40px 40px 80px' }}>
        {!mobile && <button type="button" onClick={() => setPage('products')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--shop-muted, #86868b)', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}>{t('w4PdBack')}</button>}
        {!mobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 64, marginBottom: 90, alignItems: 'center' }}>
            <Photo src={product.image_url || HOME_IMG.wardrobe} alt={product.name} className="rv-l tile-zoom zoomwrap" imgClass="tz" style={{ borderRadius: 24, aspectRatio: '1/1' }} />
            <ProductInfo product={product} qty={qty} setQty={setQty} addToCart={addToCart} setConfigProduct={setConfigProduct} setPage={setPage} mobile={false} />
          </div>
        ) : (
          <ProductInfo product={product} qty={qty} setQty={setQty} addToCart={addToCart} setConfigProduct={setConfigProduct} setPage={setPage} mobile={true} />
        )}
        <ProductAR product={product} mobile={mobile} />
        {related.length > 0 && (
          <div className="reveal">
            <h2 className="display" style={{ fontSize: mobile ? 22 : 30, color: 'var(--ink)', marginBottom: 20 }}>{recLabel}</h2>
            <div className="reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: mobile ? 12 : 18 }}>
              {related.map(p => <ProductCard key={p.id} product={p} setPage={setPage} addToCart={addToCart} setConfigProduct={setConfigProduct} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductAR({ product, mobile }) {
  const { t } = useI18n();
  const hasModel = !!(product && product.model_url);
  useEffect(() => { if (hasModel) loadModelViewer(); }, [hasModel]);   // model-viewer is loaded on demand, not globally
  if (!hasModel) return null;
  return (
    <div style={{ marginBottom: mobile ? 56 : 80 }}>
      <h2 className="display" style={{ fontSize: mobile ? 24 : 32, color: 'var(--ink)', marginBottom: 16 }}>{t('sw3ArSeeIn3D')}</h2>
      {createElement('model-viewer', {
        src: product.model_url,
        'ios-src': product.ar_ios_url || undefined,
        ar: true, 'ar-modes': 'webxr scene-viewer quick-look',
        // Premium AR/preview attributes (recommended by the 3D pass): neutral studio
        // environment, ACES tone-mapping, soft shadows, floor placement at fixed scale.
        'environment-image': 'neutral', exposure: '1', 'tone-mapping': 'aces',
        'shadow-softness': '1', 'ar-placement': 'floor', 'ar-scale': 'fixed', loading: 'eager',
        'camera-controls': true, 'auto-rotate': prefersReducedMotionNow() ? undefined : true, 'shadow-intensity': '1',
        poster: product.image_url || undefined, alt: product.name,
        style: { width: '100%', height: mobile ? 320 : 480, background: 'var(--sand)', borderRadius: 20 },
      },
        // Clay-deep fill for white text = AA-safe (per Palette v2 / "orange never behind text").
        createElement('button', { slot: 'ar-button', key: 'arbtn', style: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--clay-deep)', color: '#fff', border: 'none', borderRadius: 980, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(137,57,30,.34)' } }, '📱 View in your room')
      )}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{t('sw3ArHint')}</div>
    </div>
  );
}

function ProductInfo({ product, qty, setQty, addToCart, setConfigProduct, setPage, mobile }) {
  const { t } = useI18n();
  return (
    <div className={mobile ? '' : 'rv-r'}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{product.category || t('w4PdBespoke')}</div>
      <h1 className="display" style={{ fontSize: mobile ? 30 : 46, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.08 }}>{product.name}</h1>
      <div style={{ fontSize: mobile ? 24 : 30, fontWeight: 700, color: 'var(--clay)', marginBottom: 20 }}>{fmt(product.price)}</div>
      {product.description && <p style={{ fontSize: mobile ? 15 : 16.5, color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: 26 }}>{product.description}</p>}
      <div style={{ background: 'var(--sand)', borderRadius: 16, marginBottom: 26, border: '1px solid var(--line)' }}>
        {[[t('w4PdMaterials'), product.materials], [t('w4PdLeadTime'), product.lead_time], [t('w4PdSku'), product.sku]].filter(([,v]) => v).map(([k, v], i, arr) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span style={{ fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</span>
            <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      {(product.barcode || product.sku) && (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginBottom: 26 }}>
          <Barcode128 value={product.barcode || product.sku} height={38} background="transparent" color="var(--ink)" width={mobile ? 150 : 180} />
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, letterSpacing: '.06em', color: 'var(--muted)' }}>{product.barcode || product.sku}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', padding: '13px 18px', fontSize: 20, cursor: 'pointer', color: 'var(--ink)', minWidth: 50 }}>−</button>
          <span style={{ padding: '13px 16px', fontSize: 16, fontWeight: 600, color: 'var(--ink)', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', minWidth: 48, textAlign: 'center' }}>{qty}</span>
          <button type="button" onClick={() => setQty(q => q + 1)} style={{ background: 'none', border: 'none', padding: '13px 18px', fontSize: 20, cursor: 'pointer', color: 'var(--ink)', minWidth: 50 }}>+</button>
        </div>
        <button type="button" className="btn-clay" style={{ flex: 1, minWidth: 180 }} onClick={() => { for (let i = 0; i < qty; i++) addToCart(product); toast(`${qty} item${qty>1?'s':''} added ✓`, 'success'); }}>{t('w4PdAddToCart')}</button>
        <button type="button" className="btn-line" title={t('w4PdCustomise')} aria-label={t('w4PdCustomise')} style={{ padding: '13px 18px' }} onClick={() => setPage('planner')}>✦</button>
      </div>
      <button type="button" onClick={() => setPage('contact')} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}>{t('w4PdBookConsult')}</button>
    </div>
  );
}

export { ProductDetailPage };
