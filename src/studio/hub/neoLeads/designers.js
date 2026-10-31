/* =============================================================================
 * Neo designers registry [NEO-LEADS-UX37] - the ONE place that maps
 *   studio id  <->  Hub view id  <->  access (nav) id  <->  label EN/AR  <->  icon  <->  local-save adapter.
 * Used by the Lead quick actions, the Designs list on the lead profile and "Open". Pure data + pure helpers: no React, no I/O.
 *
 * `local` says where a studio keeps its own browser autosave. A lead-linked session seeds that key from the saved design before the studio mounts
 * (so every studio restores through ITS OWN loader, nothing is re-implemented here) and reads it back to save the design to the lead.
 *   kind 'json'   the key holds JSON text; the whole parsed value is the design (kitchen, custom, categories, doors)
 *   kind 'server' the studio saves to its own server table (neo_projects) - the lead link lives in the project's meta.lead_id
 * `volatile` lists top-level fields that change on every autosave tick and must not count as a design change (the `at` / `exportedAt` timestamps).
 * ===========================================================================*/

export const DESIGNERS = [
  { id: 'neo-studio', view: 'neo-studio', nav: 'neo-studio', icon: '📐', en: 'Neo Design Studio', ar: 'استوديو نيو للتصميم', noun: { en: 'Room design', ar: 'تصميم غرفة' },
    local: { kind: 'server' } },
  { id: 'neo-kitchen', view: 'neo-kitchen', nav: 'neo-kitchen', icon: '📐', en: 'Neo Kitchen Designer', ar: 'مصمم مطابخ نيو', noun: { en: 'Kitchen', ar: 'مطبخ' },
    local: { kind: 'json', key: 'neoKitchen.autosave.v1', volatile: ['at', 'exportedAt'] } },
  { id: 'neo-closets', view: 'neo-closets', nav: 'neo-closets', icon: '🚪', en: 'Neo Closets Designer', ar: 'مصمم خزائن نيو', noun: { en: 'Wardrobe', ar: 'خزانة' },
    local: { kind: 'json', key: 'neo_wardrobe_lead_design_v1', volatile: ['at', 'exportedAt'] } },
  { id: 'neo-custom', view: 'neo-custom', nav: 'neo-custom', icon: '🪑', en: 'Neo Custom Designer', ar: 'مصمم القطع المخصصة نيو', noun: { en: 'Custom piece', ar: 'قطعة مخصصة' },
    local: { kind: 'json', key: 'neoCustom.autosave.v1', volatile: ['at', 'exportedAt'] } },
  { id: 'neo-bathroom', view: 'neo-bathroom', nav: 'neo-bathroom', icon: '🛁', en: 'Neo Bathroom Designer', ar: 'مصمم حمامات نيو', noun: { en: 'Bathroom', ar: 'حمام' },
    local: { kind: 'json', key: 'neo_cat_bathroom_v1', volatile: ['at', 'exportedAt'] } },
  { id: 'neo-laundry', view: 'neo-laundry', nav: 'neo-laundry', icon: '🧺', en: 'Neo Laundry Designer', ar: 'مصمم غرف الغسيل نيو', noun: { en: 'Laundry', ar: 'غسيل' },
    local: { kind: 'json', key: 'neo_cat_laundry_v1', volatile: ['at', 'exportedAt'] } },
  { id: 'neo-tv', view: 'neo-tv', nav: 'neo-tv', icon: '📺', en: 'Neo TV Unit Designer', ar: 'مصمم وحدات التلفاز نيو', noun: { en: 'TV unit', ar: 'وحدة تلفاز' },
    local: { kind: 'json', key: 'neo_cat_tv_v1', volatile: ['at', 'exportedAt'] } },
  { id: 'neo-office', view: 'neo-office', nav: 'neo-office', icon: '🖥️', en: 'Neo Office Designer', ar: 'مصمم المكاتب نيو', noun: { en: 'Office', ar: 'مكتب' },
    local: { kind: 'json', key: 'neo_cat_office_v1', volatile: ['at', 'exportedAt'] } },
  { id: 'neo-doors', view: 'neo-doors', nav: 'neo-doors', icon: '🚪', en: 'Neo Doors Designer', ar: 'مصمم أبواب نيو', noun: { en: 'Door', ar: 'باب' },
    local: { kind: 'json', key: 'neo_doors_autosave_v1', volatile: ['at', 'exportedAt'] } },
];

export const DESIGNER_IDS = DESIGNERS.map((d) => d.id);
const BY_ID = Object.fromEntries(DESIGNERS.map((d) => [d.id, d]));
const BY_VIEW = Object.fromEntries(DESIGNERS.map((d) => [d.view, d]));

export const getDesigner = (id) => BY_ID[id] || null;
/** the designer a Hub view id belongs to (or null: the view is not a Neo designer) */
export const designerForView = (view) => BY_VIEW[view] || null;
export const isDesignerView = (view) => !!BY_VIEW[view];
export const designerLabel = (id, ar) => { const d = BY_ID[id]; return d ? (ar ? d.ar : d.en) : String(id || ''); };
export const designerNoun = (id, ar) => { const d = BY_ID[id]; return d ? d.noun[ar ? 'ar' : 'en'] : ''; };
/** `Studio saves to its own server table` (neo-studio) vs. a browser autosave key the host can seed / read */
export const usesLocalKey = (id) => !!(BY_ID[id] && BY_ID[id].local && BY_ID[id].local.kind === 'json');

/**
 * The designers a user may open: `canOpen(navId)` is the Hub's own page-access check (canViewPage with the role permissions), so the quick
 * actions never offer a studio the menu would hide. Unknown / failing checks hide the designer (fail closed).
 */
export function allowedDesigners(canOpen) {
  if (typeof canOpen !== 'function') return [];
  return DESIGNERS.filter((d) => { try { return !!canOpen(d.nav); } catch (e) { return false; } });
}

/** "<Customer> - <product>" - the default project name of a lead-linked design */
export function defaultProjectName(customer, id, ar) {
  const c = String(customer || '').trim();
  const p = designerNoun(id, ar) || designerLabel(id, ar);
  return c ? `${c} - ${p}` : p;
}

/** a new project id: short, URL-safe, unique enough per (lead, studio) */
export function newProjectId(rand = Math.random, now = Date.now) {
  return 'p' + now().toString(36) + Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0');
}

/** stable text of a design for change detection (volatile top-level fields dropped, keys sorted) */
export function stableKey(studioId, design) {
  const d = BY_ID[studioId];
  const vol = (d && d.local && d.local.volatile) || [];
  const strip = (v) => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach((k) => { o[k] = strip(v[k]); }); return o; }
    return v;
  };
  const top = design && typeof design === 'object' && !Array.isArray(design) ? Object.fromEntries(Object.entries(design).filter(([k]) => !vol.includes(k))) : design;
  try { return JSON.stringify(strip(top)); } catch (e) { return ''; }
}
