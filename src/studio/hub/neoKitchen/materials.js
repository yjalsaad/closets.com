/* Neo Kitchen Designer - UX-16 "Look" overrides + "Production materials" (PURE functions, no React, no DOM, no network).
 *   paint            model.paint = { group: { c: '#rrggbb', t: 'off'|'default'|'wood'|'marble' } }   display only - never geometry / BOM
 *   matSlots(part)   which production-material name(s) a part takes (first non-empty wins) - used by the cut list
 *   canonMats(mats)  "same name = same material": names equal ignoring case / spaces share the first spelling typed
 *   model.matMap     name -> inventory item link { id, sku, name, unit, how }, persisted in the project JSON
 *   inventory helpers: normName, searchItems, parseSheet, unitKind, requirements, missingItems, missingCSV
 * Geometry, cut sizes and the area convention are NOT touched here. */
import { MAT_SLOTS, PAINT_GROUPS, PAINT_TEX } from './constants';

/* ------------------------------------------------------------------ Look (paint) */
export const PAINT_KEYS = PAINT_GROUPS.map((g) => g.k);
const TEX_KEYS = PAINT_TEX.map((t) => t.k);
const HEX = /^#[0-9a-f]{6}$/i;
const norm6 = (c) => { const s = String(c || '').trim(); if (HEX.test(s)) return s.toLowerCase(); const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s); return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toLowerCase() : ''; };

/** clean a saved paint object: only known groups, valid #rrggbb, known textures (handles are colour only); empty groups dropped */
export function normalizePaint(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  PAINT_GROUPS.forEach((g) => {
    const o = src[g.k]; if (!o || typeof o !== 'object') return;
    const e = {};
    const c = norm6(o.c); if (c) e.c = c;
    if (g.tex && TEX_KEYS.includes(o.t)) e.t = o.t;
    if (e.c || e.t) out[g.k] = e;
  });
  return out;
}
/** new model with one group's override patched (empty / undefined values clear that part of the override); the cut list never sees it */
export function setPaint(model, group, patch) {
  if (!PAINT_KEYS.includes(group)) return model;
  const cur = { ...((model.paint || {})[group] || {}) };
  Object.keys(patch).forEach((k) => { if (patch[k] === '' || patch[k] == null) delete cur[k]; else cur[k] = patch[k]; });
  const paint = normalizePaint({ ...(model.paint || {}), [group]: cur });
  return { ...model, paint };
}
export const clearPaint = (model, group) => { const p = { ...(model.paint || {}) }; delete p[group]; return { ...model, paint: p }; };
/** which Look group paints an engine part (null = not paintable: glass, drawer boxes, appliances) */
export function paintGroupOfKind(kind) {
  switch (kind) {
    case 'side': case 'bottom': case 'top': case 'stretcher': case 'divider': return 'carcass';
    case 'back': return 'back';
    case 'shelf': case 'carousel': return 'shelves';
    case 'door': return 'doors';
    case 'drawerFront': return 'drawerFronts';
    case 'counter': case 'splash': return 'counter';
    case 'plinth': return 'plinth';
    default: return null;
  }
}
export const hasPaint = (model) => Object.keys(model.paint || {}).length > 0;

/* ------------------------------------------------------------------ production material names */
const SLOT_KEYS = MAT_SLOTS.map((s) => s.k);
/** the door-row slot a front takes from the group name ("Base Wall", "Tall", "Top" ...) */
const doorSlot = (group) => (/Tall$/.test(group) ? 'tallDoors' : / Wall$|^Wall$/.test(group) ? 'wallDoors' : /Top$/.test(group) ? 'topDoors' : 'baseDoors');
/** candidate slots of a part, in priority order (a drawer front uses its own slot, then the door row's one - as before UX-16) */
export function matSlots(p) {
  if (p.slot) return [p.slot]; // NEO-CATEGORIES-UX26: a part may name its own production-material slot (mirror panels -> 'glass'); engine parts never set it
  const ds = p.product === 'custom' ? 'baseDoors' : doorSlot(p.group); // custom furniture has one door slot (its group names are the user's, not a kitchen row)
  switch (p.kind) {
    case 'side': case 'bottom': case 'top': case 'stretcher': case 'divider': return ['structure'];
    case 'shelf': case 'carousel': return ['shelves'];
    case 'back': return ['back'];
    case 'drawerBox': return ['drawers'];
    case 'plinth': return ['plinth'];
    case 'counter': case 'splash': return ['countertop'];
    case 'drawerFront': return ['drawerFronts', ds];
    case 'door': case 'glass': return (p.product === 'wardrobe' || p.product === 'custom') && (p.kind === 'glass' || p.frame) ? ['glass'] : [ds]; // wardrobe / custom: panes + their frames have their own name slot
    default: return [];
  }
}

/** "Same name = same material": trim + collapse spaces; names that differ only by case / spacing share the spelling typed first (slot order) */
export const normName = (s) => String(s == null ? '' : s).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
export function canonMats(mats) {
  const seen = new Map(); const out = {};
  SLOT_KEYS.forEach((k) => {
    const raw = mats && typeof mats[k] === 'string' ? mats[k].replace(/\s+/g, ' ').trim() : '';
    if (!raw) return;
    const key = normName(raw);
    if (!seen.has(key)) seen.set(key, raw);
    out[k] = seen.get(key);
  });
  return out;
}
/** the slot's name or '' */
export const slotName = (model, slot) => (canonMats(model.mats || {})[slot] || '');
/** distinct typed names, each with the slots that use it ("Oak HPL 18" <- structure, shelves) */
export function namedMaterials(model) {
  const c = canonMats(model.mats || {}); const by = new Map();
  SLOT_KEYS.forEach((k) => { if (!c[k]) return; const key = normName(c[k]); if (!by.has(key)) by.set(key, { key, name: c[k], slots: [] }); by.get(key).slots.push(k); });
  return [...by.values()];
}

/* ------------------------------------------------------------------ name -> inventory link (model.matMap) */
const cut = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
/** matMap keys are normName(); only entries with an item id survive; capped so a pasted file cannot grow the project */
export function normalizeMatMap(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  Object.keys(src).slice(0, 60).forEach((k) => {
    const e = src[k]; if (!e || typeof e !== 'object') return;
    const id = cut(String(e.id == null ? '' : e.id), 80); const key = normName(k).slice(0, 60);
    if (!id || !key) return;
    out[key] = { id, sku: cut(e.sku, 60), name: cut(e.name, 120), unit: cut(e.unit, 20), how: ['auto', 'manual', 'created'].includes(e.how) ? e.how : 'manual' };
  });
  return out;
}
export function linkMaterial(model, name, item, how = 'manual') {
  const key = normName(name); if (!key) return model;
  const matMap = { ...(model.matMap || {}) };
  if (!item) delete matMap[key];
  else matMap[key] = { id: String(item.id), sku: item.sku || '', name: item.name || '', unit: item.unit || '', how };
  return { ...model, matMap: normalizeMatMap(matMap) };
}
export const linkOf = (model, name) => (model.matMap || {})[normName(name)] || null;

/* ------------------------------------------------------------------ inventory items (read-only rows from inventory_items) */
const isLive = (i) => i && i.id != null && i.deleted_at == null && i.active !== false;
const hay = (i) => normName(`${i.name || ''} ${i.sku || ''} ${i.category || ''} ${i.description || ''}`);
/** typeahead: best matches first. exact name / sku > prefix > contains > every word present; boards (material) outrank other items */
export function searchItems(q, items, limit = 8) {
  const s = normName(q); if (!s || !Array.isArray(items)) return [];
  const words = s.split(' ');
  const scored = [];
  items.forEach((i) => {
    if (!isLive(i)) return;
    const n = normName(i.name); const sku = normName(i.sku);
    let sc = 0;
    if (n === s) sc = 100; else if (sku && sku === s) sc = 95;
    else if (n.startsWith(s)) sc = 70; else if (n.includes(s)) sc = 60; else if (sku && sku.includes(s)) sc = 55;
    else { const h = hay(i); if (words.every((w) => h.includes(w))) sc = 40; }
    if (!sc) return;
    if (i.item_type === 'material') sc += 3;
    scored.push({ item: i, score: sc });
  });
  return scored.sort((a, b) => b.score - a.score || String(a.item.name).localeCompare(String(b.item.name))).slice(0, limit);
}
/** an unambiguous exact match (name or sku, ignoring case / spaces) - what auto-linking uses; null when none or when two items tie */
export function exactMatch(name, items) {
  const s = normName(name); if (!s || !Array.isArray(items)) return null;
  const hits = items.filter((i) => isLive(i) && (normName(i.name) === s || (i.sku && normName(i.sku) === s)));
  return hits.length === 1 ? hits[0] : null;
}
export const itemById = (items, id) => (Array.isArray(items) ? items.find((i) => String(i.id) === String(id)) || null : null);

/** the sheet size of a board item in mm (or null): variant_attributes.sheet_w / sheet_l, or "2440 x 1220" typed in name / description / sku */
export function parseSheet(item) {
  if (!item) return null;
  const va = item.variant_attributes && typeof item.variant_attributes === 'object' ? item.variant_attributes : {};
  let w = +(va.sheet_w || va.sheet_width || va.sheetW || 0); let l = +(va.sheet_l || va.sheet_length || va.sheetL || 0);
  if (!(w > 0 && l > 0)) {
    const m = /(\d{3,4})\s*(?:x|×|\*|by)\s*(\d{3,4})/i.exec(`${va.size || ''} ${item.name || ''} ${item.description || ''} ${item.sku || ''}`);
    if (m) { w = +m[1]; l = +m[2]; }
  }
  if (!(w >= 300 && w <= 4000 && l >= 300 && l <= 4000)) return null;
  return { w: Math.min(w, l), l: Math.max(w, l), m2: (w * l) / 1e6 };
}
/** 'm2' | 'sheet' | null from the item's stock unit */
export function unitKind(unit) {
  const u = String(unit || '').trim().toLowerCase();
  if (/^(m2|m²|m\^2|sqm|sq\.? ?m|م2|م²)$/.test(u)) return 'm2';
  if (/^(sheet|sheets|board|boards|panel|panels|pcs?|piece|pieces|لوح|ألواح)$/.test(u)) return 'sheet';
  return null;
}
const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Production materials -> required quantity -> stock, from the cut list as it stands.
 * @param {object} model
 * @param {object} bom      buildBOM() result (rows carry matName / area / qty)
 * @param {{status:string, items:Array}|null} inv  loaded inventory (status 'ok' | 'loading' | 'absent' | 'denied' | 'error' | 'idle')
 * @returns {{materials: Array, generic: {pcs:number, m2:number}}}
 *   status per material: 'linked' (item found) | 'stale' (mapped id no longer in inventory) | 'unlinked' | 'unknown' (inventory unavailable)
 */
export function requirements(model, bom, inv) {
  const named = namedMaterials(model); const rows = (bom && bom.rows) || [];
  const loaded = !!inv && inv.status === 'ok' && Array.isArray(inv.items);
  const used = new Set();
  const materials = named.map((n) => {
    let pcs = 0; let m2 = 0;
    rows.forEach((r) => { if (normName(r.matName) === n.key) { pcs += r.qty; m2 += r.area; used.add(r); } });
    const map = linkOf(model, n.name);
    let item = null; let status = 'unlinked';
    if (map) {
      if (loaded) { item = itemById(inv.items, map.id); status = item ? 'linked' : 'stale'; } else status = 'unknown';
    } else if (!loaded) status = 'unknown';
    const hardware = n.slots.every((x) => x === 'handles');
    const base = { key: n.key, name: n.name, slots: n.slots, hardware, pcs, m2: r3(m2), map, item, status, sheet: null, unitKind: null, stock: null, required: null, requiredUnit: 'm2', shortfall: null };
    if (!item || hardware) return base;
    const stock = Number(item.current_stock); const uk = unitKind(item.unit); const sheet = parseSheet(item);
    base.stock = Number.isFinite(stock) ? stock : null; base.unitKind = uk; base.sheet = sheet;
    if (uk === 'sheet' && sheet) { base.requiredUnit = 'sheet'; base.required = r3(m2 / sheet.m2); if (base.stock != null) base.shortfall = Math.max(0, Math.ceil(base.required - 1e-9) - base.stock); }
    else if (uk === 'm2') { base.requiredUnit = 'm2'; base.required = r3(m2); if (base.stock != null) base.shortfall = Math.max(0, r3(m2 - base.stock)); }
    else { base.requiredUnit = 'm2'; base.required = r3(m2); } /* unit without a known size: area only, no shortfall claim */
    return base;
  });
  const generic = rows.filter((r) => !used.has(r)).reduce((a, r) => ({ pcs: a.pcs + r.qty, m2: r3(a.m2 + r.area) }), { pcs: 0, m2: 0 });
  return { materials, generic };
}
/** typed names that are not in inventory (unlinked, or linked to an item that no longer exists) - the reviewable "Missing items" list */
export const missingItems = (reqs) => reqs.materials.filter((m) => m.status === 'unlinked' || m.status === 'stale').map((m) => ({ name: m.name, slots: m.slots, pcs: m.pcs, m2: m.m2, unit: m.hardware ? 'pcs' : 'sheet' }));
const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function missingCSV(list) {
  const head = ['Material name', 'Used for', 'Pieces', 'Area m2', 'Suggested unit'];
  const rows = list.map((m) => [m.name, m.slots.map((s) => (MAT_SLOTS.find((x) => x.k === s) || { en: s }).en).join(' / '), m.pcs, m.m2.toFixed(3), m.unit]);
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
/** the production-materials block of the JSON export: names, the slots they cover, the cut-list totals and the inventory link (never live stock) */
export function materialsData(model, bom) {
  const reqs = requirements(model, bom, null);
  return {
    note: 'Same name = same material. Inventory link = the item picked in the Hub inventory (id / sku); stock is read live and is not stored.',
    slots: Object.fromEntries(Object.entries(canonMats(model.mats || {}))),
    materials: reqs.materials.map((m) => ({ name: m.name, slots: m.slots, pcs: m.pcs, m2: m.m2, inventory: m.map ? { id: m.map.id, sku: m.map.sku, name: m.map.name, unit: m.map.unit } : null })),
    genericBoards: reqs.generic,
  };
}
