// Route chunk "shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: TVUnitPlannerWizard, OfficePlannerWizard, WardrobePlannerWizard, DoorPlannerWizard, KitchenPlannerWizard, WardrobesPage, KitchenPage, OfficePage, TVUnitPage, DoorsPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { api } from '../App';

// ── useLayouts(category) ──
// Fetches CMS-managed layout content from public.website_layouts (anon-readable)
// once on mount. Returns { map, list, loading } where `map` is keyed by
// layout_key. On any error / empty result it resolves to {} so every caller
// safely falls back to its hardcoded constants. Purely additive — never throws.
function useLayouts(category) {
  const [state, setState] = useState({ map: {}, list: [], loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await api(`website_layouts?category=eq.${encodeURIComponent(category)}&active=is.true&deleted_at=is.null&order=sort_order.asc`);
        if (!alive) return;
        const list = Array.isArray(rows) ? rows : [];
        const map = {};
        list.forEach(r => { if (r && r.layout_key) map[r.layout_key] = r; });
        setState({ map, list, loading: false });
      } catch (_) {
        if (alive) setState({ map: {}, list: [], loading: false });
      }
    })();
    return () => { alive = false; };
  }, [category]);
  return state;
}

// Merge a CMS layout row over a hardcoded layout constant, by layout_key.
// DB values (image, title, subtitle, bullets, description) win when present;
// everything else (pricing params, ids, model maps) stays on the constant.
// `c` is the constant (must carry an `id`); `dbMap` is from useLayouts().
function mergeLayout(c, dbMap) {
  const row = dbMap && c ? dbMap[c.id] : null;
  if (!row) return c;
  const merged = { ...c };
  if (row.image_url) { merged.img = row.image_url; merged.image_url = row.image_url; }
  if (row.title) merged.name = row.title;
  if (row.subtitle) merged.sub = row.subtitle;
  if (Array.isArray(row.bullets) && row.bullets.length) merged.bullets = row.bullets;
  if (row.description) merged.desc = row.description;
  if (row.hero_url) merged.hero_url = row.hero_url;
  return merged;
}

export { useLayouts, mergeLayout };
