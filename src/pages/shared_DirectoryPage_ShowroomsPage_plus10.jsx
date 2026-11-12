// Route chunk "shared_DirectoryPage_ShowroomsPage_plus10" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DirectoryPage, ShowroomsPage, BlogPage, CareersPage, OffersPage, FaqPage, BookingPage, AIDesignerPage, MaintenancePage, WarrantyPage, PortfolioPage, CategoryPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useI18n, useReveal } from '../App';
import PageHeader from '../design/PageHeader';

/* ── APP ── */
// ── CMS-driven pages (read from Bonsai Hub tables) ──────────────────
function PageWrap({ title, sub, eyebrow, children, crumbs }) {
  const { lang } = useI18n();
  useReveal();
  return (<div className="page">
    <PageHeader lang={lang} eyebrow={eyebrow} title={title} sub={sub} crumbs={crumbs} />
    <div className="container page-body">{children}</div>
  </div>);
}

export { PageWrap };
