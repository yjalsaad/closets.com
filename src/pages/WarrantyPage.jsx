// Route chunk "WarrantyPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: WarrantyPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useI18n } from '../App';
import { RequestPage } from './shared_MaintenancePage_WarrantyPage';

function WarrantyPage() { const { t } = useI18n(); return <RequestPage kind="Warranty" kindLabel={t('swWarrKind')} title={t('swWarrTitle')} sub={t('swWarrSub')} refLabel={t('swWarrRef')} />; }

export { WarrantyPage };
