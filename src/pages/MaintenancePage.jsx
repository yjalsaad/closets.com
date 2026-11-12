// Route chunk "MaintenancePage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: MaintenancePage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useI18n } from '../App';
import { RequestPage } from './shared_MaintenancePage_WarrantyPage';

function MaintenancePage() { const { t } = useI18n(); return <RequestPage kind="Maintenance" kindLabel={t('swMaintKind')} title={t('swMaintTitle')} sub={t('swMaintSub')} refLabel={t('swMaintRef')} />; }

export { MaintenancePage };
