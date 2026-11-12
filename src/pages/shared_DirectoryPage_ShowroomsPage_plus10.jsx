// Route chunk "shared_DirectoryPage_ShowroomsPage_plus10" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DirectoryPage, ShowroomsPage, BlogPage, CareersPage, OffersPage, FaqPage, BookingPage, AIDesignerPage, MaintenancePage, WarrantyPage, PortfolioPage, CategoryPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useMobile, useReveal } from '../App';

/* ── APP ── */
// ── CMS-driven pages (read from Bonsai Hub tables) ──────────────────
function PageWrap({ title, sub, eyebrow, children }) {
  const mobile = useMobile();
  useReveal();
  return (<div style={{ minHeight:'100dvh', paddingTop: mobile?88:64, paddingBottom:90, background:'var(--cream)' }}>
    <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'0 24px':'0 32px' }}>
      <div className="rv" style={{ maxWidth:700, marginBottom:40 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom:14 }}>{eyebrow}</div>}
        <h1 className="display" style={{ fontSize: mobile?36:54, color:'var(--ink)', lineHeight:1.05 }}>{title}</h1>
        {sub && <p style={{ fontSize: mobile?16:18, color:'var(--ink-soft)', marginTop:16, lineHeight:1.7 }}>{sub}</p>}
      </div>
      {children}
    </div>
  </div>);
}

export { PageWrap };
