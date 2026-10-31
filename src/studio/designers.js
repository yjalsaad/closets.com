/* [WEB-STUDIO 2026-10-31] The 8 Neo designers on the website: route slug, names, the localStorage key each studio autosaves its
 * design under (a saved design is that key's text; re-opening a design writes it back before the studio mounts) and the lazy chunk. */
import { lazy } from 'react';

export const DESIGNERS = [
  { kind: 'kitchen', en: 'Neo Kitchen Designer', ar: 'مصمم المطابخ نيو', short: ['Kitchen', 'مطبخ'], icon: '🍳',
    blurb: ['Plan your kitchen run by run — cabinets, appliances, worktop and finishes in 3D.', 'خطّط مطبخك جزءًا جزءًا — الخزائن والأجهزة وسطح العمل والتشطيبات بالأبعاد الثلاثية.'],
    keys: ['neoKitchen.autosave.v1'], load: () => import('./hub/NeoKitchenDesigner') },
  { kind: 'closets', en: 'Neo Closets Designer', ar: 'مصمم الخزائن نيو', short: ['Closets', 'خزائن'], icon: '🚪',
    blurb: ['Wardrobes and walk-ins — columns, sliding or hinged doors, drawers and hanging space.', 'خزائن الملابس والغرف — الأعمدة والأبواب المنزلقة أو المفصلية والأدراج ومساحات التعليق.'],
    keys: ['neo_wardrobe_lead_design_v1'], props: { leadMode: true }, load: () => import('./hub/NeoWardrobeCAD') },
  { kind: 'custom', en: 'Neo Custom Designer', ar: 'مصمم القطع الخاصة نيو', short: ['Custom', 'قطعة خاصة'], icon: '🛠️',
    blurb: ['One-off pieces — tables, beds, shelving, consoles, counters and display units.', 'قطع فريدة — طاولات وأسرّة ورفوف وكونسولات وكاونترات ووحدات عرض.'],
    keys: ['neoCustom.autosave.v1'], load: () => import('./hub/NeoCustomDesigner') },
  { kind: 'bathroom', en: 'Neo Bathroom Designer', ar: 'مصمم الحمامات نيو', short: ['Bathroom', 'حمام'], icon: '🛁',
    blurb: ['Vanities, tall units and mirror cabinets sized to your bathroom.', 'وحدات المغاسل والخزائن الطويلة وخزائن المرايا بمقاسات حمامك.'],
    keys: ['neo_cat_bathroom_v1'], load: () => import('./hub/NeoBathroomDesigner') },
  { kind: 'laundry', en: 'Neo Laundry Designer', ar: 'مصمم غرف الغسيل نيو', short: ['Laundry', 'غسيل'], icon: '🧺',
    blurb: ['Washer and dryer bays, tall storage and a worktop for folding.', 'أماكن الغسالة والمجفف والتخزين الطويل وسطح للطي.'],
    keys: ['neo_cat_laundry_v1'], load: () => import('./hub/NeoLaundryDesigner') },
  { kind: 'tv', en: 'Neo TV Unit Designer', ar: 'مصمم وحدات التلفزيون نيو', short: ['TV unit', 'وحدة تلفزيون'], icon: '📺',
    blurb: ['Media walls and TV units — low units, tall towers, shelves and panels.', 'جدران الوسائط ووحدات التلفزيون — وحدات منخفضة وأبراج ورفوف وألواح.'],
    keys: ['neo_cat_tv_v1'], load: () => import('./hub/NeoTvDesigner') },
  { kind: 'office', en: 'Neo Office Designer', ar: 'مصمم الأثاث المكتبي نيو', short: ['Office', 'مكتب'], icon: '💼',
    blurb: ['Desks, returns, pedestals and storage walls for home or work.', 'مكاتب وأجنحة ووحدات أدراج وجدران تخزين للمنزل أو العمل.'],
    keys: ['neo_cat_office_v1'], load: () => import('./hub/NeoOfficeDesigner') },
  { kind: 'doors', en: 'Neo Doors Designer', ar: 'مصمم الأبواب نيو', short: ['Doors', 'أبواب'], icon: '🚪',
    blurb: ['Wood doors — flush, shaker, glazed, barn or pocket, sized to your opening.', 'أبواب خشبية — مسطحة أو شيكر أو زجاجية أو منزلقة بمقاس الفتحة لديك.'],
    keys: ['neo_doors_autosave_v1'], load: () => import('./hub/NeoDoorsDesigner') },
];
export const SHARED_KEYS = ['nk_handles_v1'];   // handle library shared by the studios

const lazies = {};
export function designerComponent(kind) {
  const d = byKind(kind); if (!d) return null;
  if (!lazies[kind]) lazies[kind] = lazy(d.load);
  return lazies[kind];
}
export const byKind = (kind) => DESIGNERS.find((d) => d.kind === kind) || null;
export const nameOf = (kind, ar) => { const d = byKind(kind); return d ? (ar ? d.ar : d.en) : ''; };

/** the studio's saved text (what goes to the database) */
export function captureStorage(kind) {
  const d = byKind(kind); const out = {};
  if (!d) return out;
  [...d.keys, ...SHARED_KEYS].forEach((k) => { try { const v = localStorage.getItem(k); if (v != null) out[k] = v; } catch (e) { /* blocked */ } });
  return out;
}
/** put a saved design back so the studio restores it on mount (null = start a fresh design) */
export function restoreStorage(kind, storage) {
  const d = byKind(kind); if (!d) return;
  d.keys.forEach((k) => { try { if (storage && typeof storage[k] === 'string') localStorage.setItem(k, storage[k]); else localStorage.removeItem(k); } catch (e) { /* blocked */ } });
  SHARED_KEYS.forEach((k) => { try { if (storage && typeof storage[k] === 'string') localStorage.setItem(k, storage[k]); } catch (e) { /* blocked */ } });
}
