// BayDesigner.jsx — per-module designer for Quote Builder Plus (all product categories).
// A unit (one box) can optionally carry s.bays = [{ id, w_mm, kind, leaves, shelves, drawers,
// rails, led, finish, handle, hang_double, upper, appliance, swing }], s.bayFinishes = { A, B, C: {name,hex,desc} },
// s.bayOpts = { …category options (worktop, tvWidth_mm, basin, frame …) } and s.bayCat (category snapshot).
// "Bay" is the storage name; the UI calls it Bay / Module / Cabinet run / Leaf per category.
// Units without bays behave exactly as before. Whenever bays change, deriveTotals() keeps the
// unit's width/doors/shelves/drawers/rails/led in step so pricing / BOM / 3D keep working.
// Pure helpers are exported first (no React needed); the editor component is at the bottom.
import React, { useState } from 'react';

const nn = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const ri = (v) => Math.max(0, Math.round(nn(v)));

export const BAY_KINDS = [
  ['doors', 'Doors (closed)'], ['hanging', 'Open · hanging'], ['shelves', 'Open · shelves'],
  ['drawers', 'Open · drawers'], ['mixed', 'Open · mixed'],
  ['base_doors', 'Base cabinet — doors'], ['base_drawers', 'Base cabinet — drawers'], ['sink', 'Sink base unit'],
  ['hob', 'Hob unit (pan drawers)'], ['appliance_tall', 'Tall appliance housing'], ['wall_doors', 'Wall unit only (no base)'],
  ['open_niche', 'Open shelf niche'], ['tv_niche', 'TV niche (back panel + base)'], ['tall_doors', 'Tall tower (doors)'],
  ['mirror', 'Mirror cabinet (wall-hung)'], ['glass_doors', 'Glass-front doors'],
  ['flush_door', 'Flush door'], ['panel_door', 'Panelled door'], ['glass_door', 'Glazed door'], ['sliding_leaf', 'Sliding leaf'],
];
export const BAY_HANDLES = [['bar', 'Long bar'], ['edge', 'Edge pull'], ['knob', 'Knob'], ['lever', 'Lever handle'], ['none', 'None / push-open']];
const KIND_SHORT = { base_doors: 'doors', base_drawers: 'drawers', sink: 'sink', hob: 'hob', appliance_tall: 'tall', wall_doors: 'wall', open_niche: 'niche', tv_niche: 'TV', tall_doors: 'tower', mirror: 'mirror', glass_doors: 'glass', flush_door: 'flush', panel_door: 'panel', glass_door: 'glazed', sliding_leaf: 'slide' };
// kinds that can carry an upper unit (wall unit / hood / mirror) in kitchen & vanity
export const UPPER_KINDS = ['base_doors', 'base_drawers', 'sink', 'hob'];

// ───────────── per-category configuration ─────────────
export const CATEGORY_BAY_CONFIG = {
  closet: {
    label: 'Wardrobe', ar: 'خزانة ملابس', unit: 'Bay', unitPlural: 'bays', heading: 'Bay designer — wardrobe',
    helper: 'Split this unit into bays (vertical sections) left to right. Each bay has its own width, door leaves, interior and finish. Unit width, doors, shelves, drawers, rails and LED are then calculated from the bays so price and cut-list stay correct.',
    sampleLabel: 'Load 5-bay sample', sampleTitle: '3000×2700×600 reference wardrobe',
    kinds: ['doors', 'hanging', 'shelves', 'drawers', 'mixed'],
    fields: ['leaves', 'shelves', 'drawers', 'rails', 'hang_double', 'led', 'handle', 'finish'],
    newBay: { w_mm: 500 },
    finishes: {
      A: { name: 'Soft greige', hex: '#B9AE9F', desc: 'High-resistance melamine board, soft greige, matte texture' },
      B: { name: 'European walnut', hex: '#7A5238', desc: 'European walnut melamine with natural wood grain' },
      C: { name: 'Matte graphite', hex: '#3A3A3C', desc: 'Matte graphite for details, handles and drawers' },
    },
  },
  kitchen: {
    label: 'Kitchen', ar: 'مطبخ', unit: 'Cabinet run / module', unitPlural: 'modules', heading: 'Kitchen modules',
    helper: 'Build the kitchen as a run of modules left to right: base units (doors, drawers, sink, hob), tall oven / fridge housings and wall units above. Set the worktop below. Counts are calculated from the modules.',
    sampleLabel: 'Load sample kitchen', sampleTitle: '4.6 m run — oven tower, drawers, sink, hob, fridge tower, wall units',
    kinds: ['base_doors', 'base_drawers', 'sink', 'hob', 'appliance_tall', 'wall_doors', 'open_niche'],
    fields: ['leaves', 'shelves', 'drawers', 'upper', 'appliance', 'led', 'handle', 'finish'],
    newBay: { w_mm: 600, kind: 'base_doors', leaves: 1, handle: 'edge' },
    finishes: {
      A: { name: 'Matte white lacquer', hex: '#ECE9E2', desc: 'Matte white lacquer on MDF, soft-close hinges and runners' },
      B: { name: 'Natural oak', hex: '#B58B5A', desc: 'Natural oak veneer with a clear matte finish — tall housings and accents' },
      C: { name: 'Matte black', hex: '#2B2B2D', desc: 'Matte black for the worktop edge, handles and plinth' },
    },
  },
  tv: {
    label: 'TV unit', ar: 'وحدة تلفاز', unit: 'Module', unitPlural: 'modules', heading: 'TV unit modules',
    helper: 'Compose the wall left to right: tall side towers, open shelf niches and the TV niche with its floating base and back panel. Set the TV width below so the screen is drawn to scale.',
    sampleLabel: 'Load sample TV unit', sampleTitle: '3.5 m media wall — towers, open niches, TV niche',
    kinds: ['tv_niche', 'open_niche', 'tall_doors', 'base_doors', 'base_drawers'],
    fields: ['leaves', 'shelves', 'drawers', 'led', 'handle', 'finish'],
    newBay: { w_mm: 500, kind: 'open_niche', shelves: 4 },
    finishes: {
      A: { name: 'Charcoal', hex: '#4A4D52', desc: 'Charcoal matte laminate for the carcass and fronts' },
      B: { name: 'Walnut', hex: '#7A5238', desc: 'Walnut veneer for the back panel and niches' },
      C: { name: 'Brushed brass', hex: '#B08D57', desc: 'Brushed brass trims and handles' },
    },
  },
  vanity: {
    label: 'Vanity cabinet', ar: 'وحدة حمام', unit: 'Module', unitPlural: 'modules', heading: 'Vanity modules',
    helper: 'Lay out the vanity left to right: drawer modules, the sink door module and open niches; add a mirror or mirror cabinet above each module. Basin and mounting are set below.',
    sampleLabel: 'Load sample vanity', sampleTitle: '1.5 m wall-hung vanity — drawers, sink module, mirror cabinet',
    kinds: ['base_drawers', 'sink', 'base_doors', 'open_niche', 'mirror'],
    fields: ['leaves', 'shelves', 'drawers', 'upper', 'led', 'handle', 'finish'],
    kindLabels: { base_drawers: 'Drawer module', sink: 'Sink door module', base_doors: 'Door module', open_niche: 'Open shelf module', mirror: 'Mirror cabinet only' },
    newBay: { w_mm: 500, kind: 'base_drawers', drawers: 2, leaves: 0, handle: 'edge' },
    finishes: {
      A: { name: 'White gloss', hex: '#F2F2EF', desc: 'White high-gloss lacquer, moisture-resistant core' },
      B: { name: 'Oak', hex: '#B58B5A', desc: 'Natural oak veneer accent' },
      C: { name: 'Black', hex: '#232325', desc: 'Black taps, handles and trims' },
    },
  },
  storage: {
    label: 'Storage / office cabinet', ar: 'خزانة تخزين / مكتب', unit: 'Bay', unitPlural: 'bays', heading: 'Storage cabinet bays',
    helper: 'Split the cabinet into bays left to right: closed doors, glass-front doors, open shelves, drawers or mixed. Each bay has its own width, interior and finish.',
    sampleLabel: 'Load sample cabinet', sampleTitle: '3.0 m cabinet — doors, open shelves, drawers, glass doors',
    kinds: ['doors', 'glass_doors', 'shelves', 'drawers', 'mixed'],
    fields: ['leaves', 'shelves', 'drawers', 'led', 'handle', 'finish'],
    newBay: { w_mm: 600, kind: 'doors', leaves: 1, shelves: 3, handle: 'bar' },
    finishes: {
      A: { name: 'Light grey', hex: '#C9CBCC', desc: 'Light grey melamine, anti-scratch matte surface' },
      B: { name: 'Oak', hex: '#B58B5A', desc: 'Oak melamine with natural grain' },
      C: { name: 'Graphite', hex: '#3A3A3C', desc: 'Graphite for handles, plinth and details' },
    },
  },
  door: {
    label: 'Door', ar: 'باب', unit: 'Leaf / opening', unitPlural: 'leaves', heading: 'Door leaves',
    helper: 'Each module is one door leaf, left to right. Choose the leaf style (flush, panelled, glazed, sliding), the swing and the handle. Frame and thickness are set below; the architrave is drawn around the opening.',
    sampleLabel: 'Load sample door', sampleTitle: '1.6 m double door — panelled leaves, walnut frame',
    kinds: ['flush_door', 'panel_door', 'glass_door', 'sliding_leaf'],
    fields: ['swing', 'handle', 'finish'],
    newBay: { w_mm: 800, kind: 'panel_door', leaves: 1, handle: 'lever', swing: 'left' },
    finishes: {
      A: { name: 'White lacquer', hex: '#F1EEE7', desc: 'White lacquered leaf, smooth matte surface' },
      B: { name: 'Walnut veneer', hex: '#7A5238', desc: 'Walnut veneer frame and architrave' },
      C: { name: 'Black hardware', hex: '#2A2A2C', desc: 'Black hinges, lever handles and lock' },
    },
  },
  custom: {
    label: 'Custom item', ar: 'تصميم خاص', unit: 'Module', unitPlural: 'modules', heading: 'Custom modules',
    helper: 'Free-form modules left to right. Pick the type of each module, set its width and contents; widths and counts are calculated for price and cut-list.',
    sampleLabel: 'Load sample item', sampleTitle: '1.8 m item — shelves, doors, drawers',
    kinds: ['doors', 'glass_doors', 'shelves', 'drawers', 'mixed', 'open_niche', 'hanging'],
    fields: ['leaves', 'shelves', 'drawers', 'rails', 'led', 'handle', 'finish'],
    newBay: { w_mm: 600 },
    finishes: {
      A: { name: 'Soft greige', hex: '#B9AE9F', desc: 'High-resistance melamine board, soft greige, matte texture' },
      B: { name: 'European walnut', hex: '#7A5238', desc: 'European walnut melamine with natural wood grain' },
      C: { name: 'Matte graphite', hex: '#3A3A3C', desc: 'Matte graphite for details, handles and drawers' },
    },
  },
};
export const DEFAULT_FINISHES = CATEGORY_BAY_CONFIG.closet.finishes;

const CAT_KEYS = ['closet', 'kitchen', 'tv', 'vanity', 'storage', 'door', 'custom'];
export function normCat(c) { const k = String(c || '').toLowerCase(); if (k === 'walkin') return 'closet'; return CAT_KEYS.includes(k) ? k : ''; }
// Resolve a unit's category (same inference order as qbpCategory); explicit cat wins.
export function unitCat(unit, cat) {
  const e = normCat(cat); if (e) return e;
  const u = unit || {};
  const q = normCat(u.qbp_cat); if (q) return q;
  const t = String(u.product_type || u.name || '').toLowerCase();
  if (/kitchen/.test(t)) return 'kitchen';
  if (/\btv\b|television|media/.test(t)) return 'tv';
  if (/vanity|bath/.test(t)) return 'vanity';
  if (/door/.test(t)) return 'door';
  if (/storage|office|cabinet/.test(t)) return 'storage';
  const b = normCat(u.bayCat); if (b) return b;
  return 'closet';
}
export const catConfig = (cat) => CATEGORY_BAY_CONFIG[normCat(cat) || 'closet'];
export function kindLabel(kind, cat) {
  const cfg = catConfig(cat); if (cfg.kindLabels && cfg.kindLabels[kind]) return cfg.kindLabels[kind];
  const r = BAY_KINDS.find((k) => k[0] === kind); return r ? r[1] : kind;
}

// Merge the unit's finishes over the category defaults (always returns A, B and C).
export function finishesOf(unit, cat) {
  const f = (unit && unit.bayFinishes) || {};
  const defs = catConfig(unitCat(unit, cat)).finishes;
  const out = {};
  ['A', 'B', 'C'].forEach((k) => {
    const d = defs[k], u = f[k] || {};
    out[k] = { name: u.name || d.name, hex: /^#[0-9a-fA-F]{6}$/.test(u.hex || '') ? u.hex : d.hex, desc: u.desc != null && u.desc !== '' ? u.desc : (u.name && u.name !== d.name ? '' : d.desc) };
  });
  return out;
}

// Category-level options (stored as s.bayOpts).
const DEFAULT_OPTS = {
  kitchen: { worktop: true, worktop_finish: 'C', worktop_mat: 'Quartz 30 mm', edge: 'Square edge' },
  tv: { tvWidth_mm: 1450, mount: 'floating' },
  vanity: { basin: true, basin_type: 'vessel', mount: 'wall', counter_mat: 'Solid surface', counter_finish: 'A' },
  door: { frame: true, frame_finish: 'B', door_thk: 40 },
  storage: {}, closet: {}, custom: {},
};
export function optsOf(unit, cat) {
  const c = unitCat(unit, cat); const u = (unit && unit.bayOpts) || {};
  return { ...(DEFAULT_OPTS[c] || {}), ...u };
}

let _bid = 0;
const newId = () => 'bay' + Date.now().toString(36) + (++_bid).toString(36);

export function makeBay(p = {}) {
  return Object.assign({ id: newId(), w_mm: 600, kind: 'doors', leaves: 2, shelves: 0, drawers: 0, rails: 0, led: false, finish: 'A', handle: 'bar', hang_double: false, upper: 'none', appliance: 'oven', swing: 'left' }, p);
}

// Split total width into n whole-mm parts that add up exactly.
function splitWidth(total, n) {
  const base = Math.floor(total / n); const arr = Array(n).fill(base);
  arr[n - 1] += total - base * n; return arr;
}
const autoLeaves = (w) => Math.max(1, Math.ceil(ri(w) / 600));

// Fields to reset/seed when the kind of a module changes.
export function kindPatch(kind, b) {
  const w = ri(b.w_mm) || 600, lv = ri(b.leaves), dr = ri(b.drawers), sh = ri(b.shelves);
  switch (kind) {
    case 'doors': return { leaves: Math.max(1, lv) };
    case 'hanging': case 'shelves': case 'drawers': case 'mixed': return { leaves: 0 };
    case 'base_doors': return { leaves: Math.max(1, lv || autoLeaves(w)), drawers: 0 };
    case 'wall_doors': case 'tall_doors': case 'glass_doors': case 'mirror': return { leaves: Math.max(1, lv || autoLeaves(w)), drawers: 0, ...(kind === 'tall_doors' ? { shelves: Math.max(3, sh) } : {}) };
    case 'sink': return { leaves: Math.max(1, lv || autoLeaves(w)), drawers: 0, shelves: 0 };
    case 'base_drawers': return { leaves: 0, drawers: Math.max(2, dr || 3) };
    case 'hob': return { leaves: 0, drawers: Math.max(2, dr || 3), shelves: 0 };
    case 'appliance_tall': return { leaves: b.appliance === 'fridge' ? 2 : 1, drawers: 0, shelves: 0 };
    case 'open_niche': return { leaves: 0, drawers: 0, shelves: Math.max(2, sh || 3) };
    case 'tv_niche': return (lv || dr) ? {} : { leaves: 0, drawers: 2 };
    case 'flush_door': case 'panel_door': case 'glass_door': return { leaves: 1, swing: b.swing === 'sliding' ? 'left' : (b.swing || 'left'), shelves: 0, drawers: 0 };
    case 'sliding_leaf': return { leaves: 1, swing: 'sliding', shelves: 0, drawers: 0 };
    default: return {};
  }
}

function defaultsCloset(u) {
  const W = ri(u.width_mm) || 1000;
  const doors = ri(u.doors), shelves = ri(u.shelves), drawers = ri(u.drawers), rails = ri(u.rails);
  const n = doors > 0 ? Math.max(1, Math.ceil(doors / 2)) : Math.max(1, Math.min(8, Math.round(W / 600)));
  const ws = splitWidth(W, n);
  const spread = (total, idx) => Math.floor(total / n) + (idx < total % n ? 1 : 0);
  return ws.map((w, i) => {
    const leaves = doors > 0 ? (i < n - 1 || doors % 2 === 0 ? 2 : 1) : 0;
    const r = rails > 0 ? spread(rails, i) : 0, sh = spread(shelves, i), dr = i === 0 ? drawers : 0;
    const kind = leaves > 0 ? 'doors' : (dr > 0 && r === 0 && sh === 0 ? 'drawers' : (r > 0 && sh === 0 && dr === 0 ? 'hanging' : (r === 0 && dr === 0 ? 'shelves' : 'mixed')));
    return makeBay({ w_mm: w, kind, leaves, shelves: sh, drawers: dr, rails: r, led: !!u.led, finish: 'A', handle: 'bar', hang_double: r > 1 });
  });
}

// Build a sensible module list from the unit's existing counts, per category.
export function defaultBays(unit, cat0) {
  const u = unit || {}; const cat = unitCat(u, cat0);
  if (cat === 'closet') return defaultsCloset(u);
  const W = ri(u.width_mm) || (cat === 'door' ? 900 : cat === 'vanity' ? 900 : 1800);
  const doors = ri(u.doors), shelves = ri(u.shelves), drawers = ri(u.drawers), led = !!u.led;
  if (cat === 'door') {
    const n = Math.max(1, Math.min(4, doors || (W > 1100 ? 2 : 1)));
    return splitWidth(W, n).map((w, i) => makeBay({ w_mm: w, kind: u.sliding ? 'sliding_leaf' : 'panel_door', leaves: 1, handle: 'lever', swing: u.sliding ? 'sliding' : (n === 1 ? 'left' : (i % 2 === 0 ? 'left' : 'right')) }));
  }
  if (cat === 'kitchen') {
    const n = Math.max(1, Math.min(10, Math.round(W / 600)));
    const hasWall = ri(u.height_mm) >= 1800 || ri(u.height_mm) === 0;
    let dleft = doors;
    return splitWidth(W, n).map((w, i) => {
      if (i === 0 && drawers > 0) return makeBay({ w_mm: w, kind: 'base_drawers', leaves: 0, drawers: Math.min(4, drawers), handle: 'edge', upper: hasWall ? 'doors' : 'none', led });
      const lv = doors > 0 ? Math.min(autoLeaves(w), Math.max(1, dleft)) : autoLeaves(w); dleft = Math.max(0, dleft - lv);
      return makeBay({ w_mm: w, kind: 'base_doors', leaves: lv, shelves: i < n && shelves > 0 ? 1 : 0, handle: 'edge', upper: hasWall ? 'doors' : 'none', led });
    });
  }
  if (cat === 'tv') {
    if (W >= 2400) {
      const side = Math.round(W * 0.14 / 10) * 10, niche = Math.round(W * 0.14 / 10) * 10, mid = W - 2 * side - 2 * niche;
      return [
        makeBay({ w_mm: side, kind: 'tall_doors', leaves: 1, shelves: 3, finish: 'A', handle: 'edge', led }),
        makeBay({ w_mm: niche, kind: 'open_niche', leaves: 0, shelves: Math.max(3, Math.round(shelves / 2) || 4), finish: 'B', led }),
        makeBay({ w_mm: mid, kind: 'tv_niche', leaves: doors > 0 ? 2 : 0, drawers: doors > 0 ? 0 : (drawers || 2), finish: 'A', handle: 'edge', led }),
        makeBay({ w_mm: niche, kind: 'open_niche', leaves: 0, shelves: Math.max(3, Math.round(shelves / 2) || 4), finish: 'B', led }),
        makeBay({ w_mm: side, kind: 'tall_doors', leaves: 1, shelves: 3, finish: 'A', handle: 'edge', led }),
      ];
    }
    return [makeBay({ w_mm: W, kind: 'tv_niche', leaves: doors > 0 ? Math.min(2, doors) : 0, drawers: doors > 0 ? 0 : (drawers || 2), finish: 'A', handle: 'edge', led })];
  }
  if (cat === 'vanity') {
    if (W <= 900) return [makeBay({ w_mm: W, kind: 'sink', leaves: autoLeaves(W), handle: 'edge', upper: 'mirror', led })];
    const side = Math.round((W - Math.round(W * 0.45 / 10) * 10) / 2 / 10) * 10, mid = W - 2 * side;
    return [
      makeBay({ w_mm: side, kind: 'base_drawers', leaves: 0, drawers: drawers || 2, handle: 'edge', upper: 'mirror', led }),
      makeBay({ w_mm: mid, kind: 'sink', leaves: autoLeaves(mid), handle: 'edge', upper: 'mirror_cab', led }),
      makeBay({ w_mm: side, kind: 'base_drawers', leaves: 0, drawers: drawers || 2, handle: 'edge', upper: 'mirror', led }),
    ];
  }
  // storage / custom
  const n = Math.max(1, Math.min(8, Math.round(W / 600)));
  let dleft = doors;
  return splitWidth(W, n).map((w, i) => {
    const pattern = ['doors', 'shelves', 'drawers'];
    let kind = doors > 0 ? (dleft > 0 ? 'doors' : 'shelves') : pattern[i % 3];
    if (kind === 'doors') { const lv = Math.min(autoLeaves(w), Math.max(1, dleft)); dleft = Math.max(0, dleft - lv); return makeBay({ w_mm: w, kind, leaves: lv, shelves: Math.max(1, Math.round(shelves / n)), led }); }
    if (kind === 'drawers') return makeBay({ w_mm: w, kind, leaves: 0, drawers: drawers || 4, led });
    return makeBay({ w_mm: w, kind, leaves: 0, shelves: Math.max(3, Math.round(shelves / n) || 4), led });
  });
}

// ───────────── sample presets (one per category) ─────────────
// closet: 0.5 walnut doors | 0.5 open hanging+shelves+4 graphite drawers | 1.0 greige 2-leaf doors |
// 0.5 open (mirror) | 0.5 walnut doors → 3000 × 2700 × 600.
const SAMPLES = {
  closet: () => ({
    h: 2700, d: 600, opts: {},
    bays: [
      makeBay({ w_mm: 500, kind: 'doors', leaves: 1, shelves: 1, rails: 1, finish: 'B', handle: 'bar', led: false }),
      makeBay({ w_mm: 500, kind: 'mixed', leaves: 0, shelves: 3, rails: 1, drawers: 4, finish: 'A', handle: 'none', led: true }),
      makeBay({ w_mm: 1000, kind: 'doors', leaves: 2, rails: 2, hang_double: true, finish: 'A', handle: 'bar', led: false }),
      makeBay({ w_mm: 500, kind: 'mixed', leaves: 0, shelves: 3, rails: 1, drawers: 4, finish: 'A', handle: 'none', led: true }),
      makeBay({ w_mm: 500, kind: 'doors', leaves: 1, shelves: 1, rails: 1, finish: 'B', handle: 'bar', led: false }),
    ],
  }),
  // kitchen: oven tower | drawers | doors | sink | hob | doors | fridge tower; wall units + hood; worktop
  kitchen: () => ({
    h: 2400, d: 600, opts: { worktop: true, worktop_finish: 'C', worktop_mat: 'Quartz 30 mm', edge: 'Square edge' },
    bays: [
      makeBay({ w_mm: 600, kind: 'appliance_tall', appliance: 'oven', leaves: 1, finish: 'B', handle: 'edge' }),
      makeBay({ w_mm: 600, kind: 'base_drawers', leaves: 0, drawers: 3, finish: 'A', handle: 'edge', upper: 'doors', led: true }),
      makeBay({ w_mm: 600, kind: 'base_doors', leaves: 1, shelves: 1, finish: 'A', handle: 'edge', upper: 'doors', led: true }),
      makeBay({ w_mm: 900, kind: 'sink', leaves: 2, finish: 'A', handle: 'edge', upper: 'doors', led: true }),
      makeBay({ w_mm: 600, kind: 'hob', leaves: 0, drawers: 3, finish: 'A', handle: 'edge', upper: 'hood' }),
      makeBay({ w_mm: 600, kind: 'base_doors', leaves: 1, shelves: 1, finish: 'A', handle: 'edge', upper: 'doors', led: true }),
      makeBay({ w_mm: 700, kind: 'appliance_tall', appliance: 'fridge', leaves: 2, finish: 'B', handle: 'bar' }),
    ],
  }),
  // tv: tower | open niche | TV niche (floating base drawers + back panel) | open niche | tower
  tv: () => ({
    h: 2400, d: 400, opts: { tvWidth_mm: 1450, mount: 'floating' },
    bays: [
      makeBay({ w_mm: 450, kind: 'tall_doors', leaves: 1, shelves: 3, finish: 'A', handle: 'edge' }),
      makeBay({ w_mm: 450, kind: 'open_niche', leaves: 0, shelves: 5, finish: 'B', led: true }),
      makeBay({ w_mm: 1700, kind: 'tv_niche', leaves: 0, drawers: 2, finish: 'A', handle: 'edge', led: true }),
      makeBay({ w_mm: 450, kind: 'open_niche', leaves: 0, shelves: 5, finish: 'B', led: true }),
      makeBay({ w_mm: 450, kind: 'tall_doors', leaves: 1, shelves: 3, finish: 'A', handle: 'edge' }),
    ],
  }),
  // vanity: 2-drawer module | sink door module | 2-drawer module, mirrors / mirror cabinet above
  vanity: () => ({
    h: 2000, d: 500, opts: { basin: true, basin_type: 'vessel', mount: 'wall', counter_mat: 'Solid surface', counter_finish: 'A' },
    bays: [
      makeBay({ w_mm: 400, kind: 'base_drawers', leaves: 0, drawers: 2, finish: 'A', handle: 'edge', upper: 'mirror' }),
      makeBay({ w_mm: 700, kind: 'sink', leaves: 2, finish: 'B', handle: 'edge', upper: 'mirror_cab', led: true }),
      makeBay({ w_mm: 400, kind: 'base_drawers', leaves: 0, drawers: 2, finish: 'A', handle: 'edge', upper: 'mirror' }),
    ],
  }),
  // storage: alternating doors / open shelves / drawers / glass doors / doors
  storage: () => ({
    h: 1800, d: 450, opts: {},
    bays: [
      makeBay({ w_mm: 600, kind: 'doors', leaves: 1, shelves: 3, finish: 'A', handle: 'bar' }),
      makeBay({ w_mm: 600, kind: 'shelves', leaves: 0, shelves: 4, finish: 'B' }),
      makeBay({ w_mm: 600, kind: 'drawers', leaves: 0, drawers: 4, finish: 'A', handle: 'bar' }),
      makeBay({ w_mm: 600, kind: 'glass_doors', leaves: 1, shelves: 3, finish: 'C', handle: 'bar', led: true }),
      makeBay({ w_mm: 600, kind: 'doors', leaves: 1, shelves: 3, finish: 'A', handle: 'bar' }),
    ],
  }),
  // door: double door, 2 panelled leaves, walnut frame
  door: () => ({
    h: 2100, d: 150, opts: { frame: true, frame_finish: 'B', door_thk: 40 },
    bays: [
      makeBay({ w_mm: 800, kind: 'panel_door', leaves: 1, finish: 'A', handle: 'lever', swing: 'left' }),
      makeBay({ w_mm: 800, kind: 'panel_door', leaves: 1, finish: 'A', handle: 'lever', swing: 'right' }),
    ],
  }),
  custom: () => ({
    h: 1800, d: 450, opts: {},
    bays: [
      makeBay({ w_mm: 600, kind: 'shelves', leaves: 0, shelves: 4, finish: 'B' }),
      makeBay({ w_mm: 600, kind: 'doors', leaves: 1, shelves: 3, finish: 'A', handle: 'bar' }),
      makeBay({ w_mm: 600, kind: 'drawers', leaves: 0, drawers: 4, finish: 'A', handle: 'bar' }),
    ],
  }),
};
export function sampleBays(cat) { return (SAMPLES[normCat(cat) || 'closet'] || SAMPLES.closet)().bays; }
export function sampleUnitPatch(cat0) {
  const cat = normCat(cat0) || 'closet'; const sm = (SAMPLES[cat] || SAMPLES.closet)();
  return { bays: sm.bays, bayFinishes: finishesOf({}, cat), bayOpts: { ...(DEFAULT_OPTS[cat] || {}), ...sm.opts }, bayCat: cat, height_mm: sm.h, depth_mm: sm.d, ...deriveTotals(sm.bays) };
}

// Upper unit door leaves (wall unit / mirror cabinet above a base module).
export function upperLeaves(b) {
  if (!b || !UPPER_KINDS.includes(b.kind)) return 0;
  return (b.upper === 'doors' || b.upper === 'mirror_cab') ? autoLeaves(b.w_mm) : 0;
}
// Totals that must be mirrored onto the unit so pricing / BOM / 3D keep working.
export function deriveTotals(bays) {
  const list = Array.isArray(bays) ? bays : [];
  if (!list.length) return {};
  const sum = (k) => list.reduce((a, b) => a + ri(b[k]), 0);
  return { width_mm: sum('w_mm'), doors: sum('leaves') + list.reduce((a, b) => a + upperLeaves(b), 0), shelves: sum('shelves'), drawers: sum('drawers'), rails: sum('rails'), led: list.some((b) => !!b.led) };
}

// Human-readable warnings: [{ level:'warn'|'info', msg }]
export function bayWarnings(unit, cat0) {
  const out = []; const u = unit || {}; const bays = Array.isArray(u.bays) ? u.bays : [];
  if (!bays.length) return out;
  const cat = unitCat(u, cat0), cfg = catConfig(cat), UL = cfg.unit.split(' ')[0];
  const sum = bays.reduce((a, b) => a + ri(b.w_mm), 0), W = ri(u.width_mm), H = ri(u.height_mm) || 2400;
  if (W && sum !== W) out.push({ level: 'warn', msg: `${UL} widths add up to ${sum} mm but the unit is ${W} mm (${sum > W ? '+' : ''}${sum - W} mm)` });
  bays.forEach((b, i) => {
    const n = i + 1, w = ri(b.w_mm), lv = ri(b.leaves);
    if (w < 200) out.push({ level: 'warn', msg: `${UL} ${n} is very narrow (${w} mm)` });
    if (cat === 'door') { if (w > 1100) out.push({ level: 'warn', msg: `Leaf ${n} is ${w} mm wide — over 1100 mm is heavy; split into two leaves` }); return; }
    if (lv > 0 && w / lv > 600) out.push({ level: 'warn', msg: `${UL} ${n}: door leaf ${Math.round(w / lv)} mm wide — over 600 mm sags; add a leaf` });
    if (lv > 0 && w / lv < 200) out.push({ level: 'warn', msg: `${UL} ${n}: door leaf only ${Math.round(w / lv)} mm — too narrow` });
    const maxShelves = Math.floor(H / 250);
    if (ri(b.shelves) > maxShelves) out.push({ level: 'warn', msg: `${UL} ${n}: ${ri(b.shelves)} shelves is a lot for ${H} mm height (max ≈ ${maxShelves})` });
    if ((cat === 'closet' || cat === 'storage' || cat === 'custom') && ri(b.drawers) * 180 > H * 0.5) out.push({ level: 'warn', msg: `${UL} ${n}: drawer bank takes over half the height` });
    if (ri(b.rails) > 1 && !b.hang_double && ri(b.rails) > 2) out.push({ level: 'info', msg: `${UL} ${n}: ${ri(b.rails)} rails — check clothes clearance` });
    if (cat === 'tv' && b.kind === 'tv_niche') { const tw = ri(optsOf(u, cat).tvWidth_mm); if (tw && tw > w - 60) out.push({ level: 'warn', msg: `TV width ${tw} mm does not fit the ${w} mm niche` }); }
  });
  if (cat === 'kitchen' && bays.some((b) => b.kind === 'appliance_tall' || b.kind === 'wall_doors' || (UPPER_KINDS.includes(b.kind) && b.upper && b.upper !== 'none')) && H < 2000) out.push({ level: 'warn', msg: `Unit height ${H} mm is too low for wall units / tall housings (≥ 2000 mm)` });
  if (cat === 'vanity' && bays.some((b) => b.kind === 'mirror' || (b.upper && b.upper !== 'none' && UPPER_KINDS.includes(b.kind))) && H < 1900) out.push({ level: 'info', msg: `Unit height ${H} mm leaves little room for the mirror (≥ 1900 mm)` });
  const t = deriveTotals(bays);
  if (ri(u.doors) !== t.doors || ri(u.drawers) !== t.drawers || ri(u.shelves) !== t.shelves || ri(u.rails) !== t.rails) out.push({ level: 'info', msg: 'Unit totals differ from the modules — press "Sync unit totals" so price & BOM match' });
  return out;
}

// Door-front finish of a bay: the 3D Studio can paint a door part separately (b.pf.door = 'A'|'B'|'C' or { hex, name }).
export function doorFinishOf(b, fin) {
  const pf = b && b.pf && b.pf.door;
  if (pf && typeof pf === 'object' && /^#[0-9a-fA-F]{6}$/.test(pf.hex || '')) return { name: pf.name || ('custom ' + pf.hex), hex: pf.hex, desc: '' };
  if (typeof pf === 'string' && fin[pf]) return fin[pf];
  return fin[b && b.finish] || fin.A;
}
// Compact sentence for the AI render prompt.
const HANDLE_PHRASE = { bar: 'long bar', edge: 'edge-pull', knob: 'knob', lever: 'lever', none: 'push-to-open' };
const mtr = (w) => String((ri(w) / 1000).toFixed(2)).replace(/\.?0+$/, '');
export function describeBays(unit, cat0) {
  const u = unit || {}; const bays = Array.isArray(u.bays) ? u.bays : [];
  if (!bays.length) return '';
  const cat = unitCat(u, cat0), cfg = catConfig(cat);
  const fin = finishesOf(u, cat), o = optsOf(u, cat);
  if (cat === 'closet') {
    const parts = bays.map((b) => {
      const f = doorFinishOf(b, fin).name.toLowerCase();
      const lv = ri(b.leaves);
      const inner = [];
      if (ri(b.rails) > 0) inner.push(ri(b.rails) > 1 || b.hang_double ? 'double hanging rails' : 'a hanging rail');
      if (ri(b.shelves) > 0) inner.push('shelves');
      if (ri(b.drawers) > 0) inner.push(`${ri(b.drawers)} ${fin.C.name.toLowerCase()} drawers`);
      if (b.led) inner.push('LED strip glow');
      const head = lv > 0 ? `${mtr(b.w_mm)}m ${f} ${u.sliding ? 'sliding' : 'hinged'} doors${b.handle && b.handle !== 'none' ? ' with ' + (b.handle === 'bar' ? 'long bar' : b.handle) + ' handles' : ''}` : `${mtr(b.w_mm)}m open bay`;
      return head + (lv === 0 && inner.length ? ' with ' + inner.join(', ') : '');
    });
    return `arranged as ${bays.length} bays left to right: ${parts.join(', ')}; finishes: ${['A', 'B', 'C'].map((k) => fin[k].name.toLowerCase()).join(', ')}`;
  }
  const hp = (b) => (b.handle && b.handle !== 'none' ? ` with ${HANDLE_PHRASE[b.handle] || b.handle} handles` : ' with push-to-open fronts');
  const parts = bays.map((b, idx) => {
    const f = doorFinishOf(b, fin).name.toLowerCase(), w = mtr(b.w_mm) + 'm', lv = ri(b.leaves), dr = ri(b.drawers), sh = ri(b.shelves);
    let s;
    switch (b.kind) {
      case 'base_doors': s = `${w} ${f} base cabinet with ${lv || 1} door${lv > 1 ? 's' : ''}${hp(b)}`; break;
      case 'base_drawers': s = `${w} ${f} ${cat === 'vanity' ? 'drawer module' : 'base unit'} with ${dr || 3} drawers${hp(b)}`; break;
      case 'sink': s = `${w} ${f} ${cat === 'vanity' ? 'sink door module with basin and tap' : 'sink base unit with an inset sink and tap'}${hp(b)}`; break;
      case 'hob': s = `${w} ${f} hob unit with pan drawers and a built-in hob`; break;
      case 'appliance_tall': s = `${w} ${f} tall housing with ${b.appliance === 'fridge' ? 'a built-in fridge-freezer' : 'a built-in oven and microwave'}`; break;
      case 'wall_doors': s = `${w} ${f} wall unit`; break;
      case 'open_niche': s = `${w} open shelf niche with ${sh || 3} shelves`; break;
      case 'tv_niche': s = `${w} TV niche with ${(fin.B).name.toLowerCase()} back panel for a ${Math.round(ri(o.tvWidth_mm) / 22.14) || 65}-inch wall-mounted TV above a ${o.mount === 'floor' ? '' : 'floating '}${f} base ${dr ? dr + ' drawers' : 'with doors'}`; break;
      case 'tall_doors': s = `${w} ${f} tall tower${hp(b)}`; break;
      case 'mirror': s = `${w} wall-hung mirror cabinet`; break;
      case 'glass_doors': s = `${w} glass-front display ${lv > 1 ? 'doors' : 'door'} in ${f} frame with shelves`; break;
      case 'flush_door': case 'panel_door': case 'glass_door': case 'sliding_leaf': {
        const style = b.kind === 'flush_door' ? 'flush' : b.kind === 'panel_door' ? 'panelled' : b.kind === 'glass_door' ? 'glazed' : 'sliding';
        s = `${w} ${f} ${style} leaf${b.kind === 'sliding_leaf' ? '' : ' hinged ' + (b.swing === 'right' ? 'right' : 'left')} with ${HANDLE_PHRASE[b.handle] || 'lever'} handle`; break;
      }
      default: s = lv > 0 ? `${w} ${f} doors${hp(b)}` : `${w} open ${b.kind === 'drawers' ? 'drawer' : 'shelf'} bay${sh ? ' with ' + sh + ' shelves' : ''}${dr ? ' with ' + dr + ' drawers' : ''}`;
    }
    if (UPPER_KINDS.includes(b.kind) && b.upper && b.upper !== 'none') s += ({ doors: ', wall unit above', open: ', open wall shelf above', hood: ', extractor hood above', mirror: ', mirror above', mirror_cab: ', mirror cabinet above' }[b.upper] || '');
    if (b.led) s += ', LED lighting';
    return s;
  });
  const tail = [];
  if (cat === 'kitchen' && o.worktop) tail.push(`${(fin[o.worktop_finish] || fin.C).name.toLowerCase()} ${o.worktop_mat || ''} worktop`.replace(/\s+/g, ' '));
  if (cat === 'vanity') { if (o.basin) tail.push(`${o.basin_type === 'undermount' ? 'undermount' : 'vessel'} basin on a ${o.counter_mat || 'solid surface'} counter`); tail.push(o.mount === 'floor' ? 'floor-standing' : 'wall-hung'); }
  if (cat === 'tv') tail.push(o.mount === 'floor' ? 'floor-standing base' : 'floating base with a gap to the floor');
  if (cat === 'door') tail.push(o.frame ? `${(fin[o.frame_finish] || fin.B).name.toLowerCase()} frame and architrave` : 'no frame');
  return `arranged as ${bays.length} ${cfg.unitPlural} left to right: ${parts.join(', ')}${tail.length ? '; ' + tail.join(', ') : ''}; finishes: ${['A', 'B', 'C'].map((k) => fin[k].name.toLowerCase()).join(', ')}`;
}

// ───────────────────────── editor component ─────────────────────────
const UPPER_OPTS = {
  kitchen: [['none', 'None'], ['doors', 'Wall unit — doors'], ['open', 'Wall unit — open shelf'], ['hood', 'Extractor hood']],
  vanity: [['none', 'None'], ['mirror', 'Mirror'], ['mirror_cab', 'Mirror cabinet']],
};
const OPEN_SET = new Set(['hanging', 'shelves', 'drawers', 'mixed', 'open_niche']);

export default function BayDesigner({ unit, cat: catProp, onChange, onPreview, inp = {}, T1 = '#111', T2 = '#4b5563', T3 = '#9ca3af', BG2 = '#fff', BG3 = '#faf7f2', BR = '#e7e2da', OR = 'var(--color-brand-strong)' }) {
  const u = unit || {};
  const cat = unitCat(u, catProp), cfg = catConfig(cat), UL = cfg.unit;
  const bays = Array.isArray(u.bays) ? u.bays : [];
  const fin = finishesOf(u, cat), opts = optsOf(u, cat);
  const [sel, setSel] = useState(0);
  const si = Math.min(Math.max(0, sel), Math.max(0, bays.length - 1));
  const cur = bays[si];
  const fields = new Set(cfg.fields);
  const kindOptions = cfg.kinds.concat(cur && !cfg.kinds.includes(cur.kind) ? [cur.kind] : []);

  // Single place where bays change: bays + finishes + derived totals go out in ONE patch.
  const commit = (nextBays, nextFin, extra) => {
    onChange({ bays: nextBays, bayFinishes: nextFin || u.bayFinishes || finishesOf({}, cat), bayCat: cat, bayOpts: opts, ...deriveTotals(nextBays), ...(extra || {}) });
  };
  const setBay = (k, v) => commit(bays.map((b, j) => (j === si ? { ...b, [k]: v } : b)));
  const setBayMany = (p) => commit(bays.map((b, j) => (j === si ? { ...b, ...p } : b)));
  const setFin = (key, k, v) => commit(bays, { ...fin, [key]: { ...fin[key], [k]: v } });
  const setOpt = (k, v) => onChange({ bayOpts: { ...opts, [k]: v }, bayCat: cat });

  const sum = bays.reduce((a, b) => a + ri(b.w_mm), 0);
  const W = ri(u.width_mm);
  const warns = bayWarnings(u, cat);

  const btn = { background: BG2, color: T1, border: '1px solid ' + BR, borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };
  const lab = { display: 'block', fontSize: 10, fontWeight: 800, color: T2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 };
  const numIn = (k, min = 0, step = 1) => (
    <input type="number" min={min} step={step} value={cur[k] == null ? '' : cur[k]} onChange={(e) => setBay(k, e.target.value === '' ? 0 : Math.max(min, Number(e.target.value) || 0))} style={{ ...inp, width: '100%' }} />
  );
  const finBtns = (value, onPick) => (
    <div style={{ display: 'flex', gap: 5 }}>
      {['A', 'B', 'C'].map((k) => (
        <button type="button" key={k} onClick={() => onPick(k)} title={fin[k].name}
          style={{ flex: 1, height: 32, borderRadius: 8, border: value === k ? '3px solid ' + OR : '1px solid ' + BR, background: fin[k].hex, color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>{k}</button>
      ))}
    </div>
  );

  const addBay = () => { const nb = makeBay(cfg.newBay); const arr = [...bays]; arr.splice(si + 1, 0, nb); setSel(si + 1); commit(arr); };
  const dupBay = () => { if (!cur) return; const arr = [...bays]; arr.splice(si + 1, 0, { ...cur, id: newId() }); setSel(si + 1); commit(arr); };
  const delBay = () => { if (!cur) return; const arr = bays.filter((_, j) => j !== si); setSel(Math.max(0, si - 1)); commit(arr, null, arr.length ? {} : { bays: [] }); };
  const move = (d) => { const t = si + d; if (!cur || t < 0 || t >= bays.length) return; const arr = [...bays]; const [b] = arr.splice(si, 1); arr.splice(t, 0, b); setSel(t); commit(arr); };
  const seed = () => { setSel(0); commit(defaultBays(u, cat), null, { bayOpts: opts }); };
  const sample = () => { setSel(0); onChange(sampleUnitPatch(cat)); };
  const distribute = () => {
    if (!bays.length) return; const target = W || sum; const ws = splitWidth(target, bays.length);
    commit(bays.map((b, j) => ({ ...b, w_mm: ws[j] })));
  };
  const syncTotals = () => commit(bays);
  const clearBays = () => { setSel(0); onChange({ bays: [] }); };

  // category-specific unit options
  const optsPanel = (() => {
    const row = { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' };
    const chk = (k, label) => (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T1, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!opts[k]} onChange={(e) => setOpt(k, e.target.checked)} /> {label}
      </label>
    );
    const sel2 = (k, label, list) => (
      <div style={{ minWidth: 130 }}><label style={lab}>{label}</label>
        <select value={opts[k] || list[0][0]} onChange={(e) => setOpt(k, e.target.value)} style={{ ...inp, width: '100%' }}>{list.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
    );
    const txtIn = (k, label, ph) => (
      <div style={{ minWidth: 150, flex: '1 1 150px' }}><label style={lab}>{label}</label>
        <input value={opts[k] || ''} placeholder={ph} onChange={(e) => setOpt(k, e.target.value)} style={{ ...inp, width: '100%' }} /></div>
    );
    let body = null, title = '';
    if (cat === 'kitchen') {
      title = 'Worktop';
      body = (<div style={row}>{chk('worktop', 'Worktop on base units')}{sel2('worktop_finish', 'Worktop finish', [['A', 'A · ' + fin.A.name], ['B', 'B · ' + fin.B.name], ['C', 'C · ' + fin.C.name]])}{txtIn('worktop_mat', 'Material', 'Quartz 30 mm')}{txtIn('edge', 'Edge', 'Square edge')}</div>);
    } else if (cat === 'tv') {
      title = 'TV & mounting';
      body = (<div style={row}>
        <div style={{ minWidth: 130 }}><label style={lab}>TV niche width (mm)</label><input type="number" min="300" step="50" value={opts.tvWidth_mm == null ? '' : opts.tvWidth_mm} onChange={(e) => setOpt('tvWidth_mm', Math.max(0, Number(e.target.value) || 0))} style={{ ...inp, width: '100%' }} /></div>
        <span style={{ fontSize: 11, color: T3, alignSelf: 'center' }}>≈ {Math.round(ri(opts.tvWidth_mm) / 22.14)}″ TV</span>
        {sel2('mount', 'Base mounting', [['floating', 'Floating (gap to floor)'], ['floor', 'On the floor']])}</div>);
    } else if (cat === 'vanity') {
      title = 'Basin & mounting';
      body = (<div style={row}>{chk('basin', 'Basin on the sink module')}{sel2('basin_type', 'Basin type', [['vessel', 'Vessel (on counter)'], ['undermount', 'Undermount']])}{sel2('mount', 'Mounting', [['wall', 'Wall-hung'], ['floor', 'Floor-standing']])}{txtIn('counter_mat', 'Counter material', 'Solid surface')}</div>);
    } else if (cat === 'door') {
      title = 'Frame & thickness';
      body = (<div style={row}>{chk('frame', 'Frame + architrave')}{sel2('frame_finish', 'Frame finish', [['A', 'A · ' + fin.A.name], ['B', 'B · ' + fin.B.name], ['C', 'C · ' + fin.C.name]])}
        <div style={{ minWidth: 110 }}><label style={lab}>Leaf thickness (mm)</label><input type="number" min="20" step="5" value={opts.door_thk == null ? '' : opts.door_thk} onChange={(e) => setOpt('door_thk', Math.max(0, Number(e.target.value) || 0))} style={{ ...inp, width: '100%' }} /></div>
        <span style={{ fontSize: 11, color: T3, alignSelf: 'center' }}>Wall / frame depth = unit depth ({ri(u.depth_mm) || 150} mm)</span></div>);
    }
    return body ? (
      <div style={{ border: '1px solid ' + BR, borderRadius: 10, padding: 12, background: BG2 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T1, marginBottom: 8 }}>{title}</div>{body}
      </div>
    ) : null;
  })();

  const upperList = UPPER_OPTS[cat];
  const showUpper = fields.has('upper') && cur && UPPER_KINDS.includes(cur.kind) && upperList;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11.5, color: T2, lineHeight: 1.5 }}>
        <b>{cfg.heading}.</b> {cfg.helper}
      </div>

      {bays.length === 0 ? (
        <div style={{ border: '1px dashed ' + BR, borderRadius: 10, padding: 14, background: BG2, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T2, flex: '1 1 220px' }}>No {cfg.unitPlural} yet — this unit is a single box. Start from its current counts or load a sample.</span>
          <button type="button" onClick={seed} style={{ ...btn, borderColor: OR, color: OR }}>Seed from unit</button>
          <button type="button" onClick={sample} style={btn} title={cfg.sampleTitle}>{cfg.sampleLabel}</button>
        </div>
      ) : (
        <>
          {/* module strip */}
          <div>
            <div style={{ display: 'flex', alignItems: 'stretch', height: 74, border: '1px solid ' + BR, borderRadius: 8, overflow: 'hidden', background: BG2 }}>
              {bays.map((b, j) => {
                const f = fin[b.finish] || fin.A; const open = OPEN_SET.has(b.kind) && ri(b.leaves) === 0; const on = j === si;
                const short = KIND_SHORT[b.kind] && !['base_doors', 'wall_doors', 'tall_doors', 'glass_doors', 'mirror'].includes(b.kind) ? KIND_SHORT[b.kind] : (ri(b.leaves) === 0 ? 'open' : ri(b.leaves) + ' leaf');
                return (
                  <button type="button" key={b.id || j} onClick={() => setSel(j)} title={`${UL} ${j + 1} · ${ri(b.w_mm)} mm · ${kindLabel(b.kind, cat)}`}
                    style={{ flex: Math.max(1, ri(b.w_mm)) + ' 1 0', minWidth: 26, border: 'none', borderInlineEnd: j < bays.length - 1 ? '1px solid #fff' : 'none', background: open ? BG3 : f.hex, color: open ? T1 : '#fff', outline: on ? '3px solid ' + OR : 'none', outlineOffset: -3, cursor: 'pointer', padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, fontFamily: 'inherit', position: 'relative' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: on ? OR : 'rgba(0,0,0,.35)', color: '#fff', borderRadius: 999, minWidth: 18, height: 18, lineHeight: '18px', textAlign: 'center' }}>{j + 1}</span>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{ri(b.w_mm)}</span>
                    <span style={{ fontSize: 9, opacity: 0.9 }}>{short}{b.led ? ' ✦' : ''}</span>
                    {open && <span style={{ position: 'absolute', bottom: 0, insetInline: 0, height: 5, background: f.hex }} />}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: sum === W || !W ? T1 : '#b45309' }}>Σ {cfg.unitPlural} = {sum} mm (unit {W || sum})</span>
              {warns.map((w, k) => (
                <span key={k} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: w.level === 'warn' ? '#fef3c7' : '#e0e7ff', color: w.level === 'warn' ? '#92400e' : '#3730a3' }}>{w.level === 'warn' ? '⚠ ' : 'ℹ '}{w.msg}</span>
              ))}
            </div>
          </div>

          {/* toolbar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={addBay} style={{ ...btn, borderColor: OR, color: OR }}>➕ Add {cfg.unitPlural === 'leaves' ? 'leaf' : cfg.unitPlural.replace(/s$/, '')}</button>
            <button type="button" onClick={dupBay} style={btn}>⎘ Duplicate</button>
            <button type="button" onClick={delBay} style={{ ...btn, color: '#dc2626' }}>✕ Remove</button>
            <button type="button" onClick={() => move(-1)} disabled={si === 0} style={{ ...btn, opacity: si === 0 ? 0.4 : 1 }}>◀</button>
            <button type="button" onClick={() => move(1)} disabled={si >= bays.length - 1} style={{ ...btn, opacity: si >= bays.length - 1 ? 0.4 : 1 }}>▶</button>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={distribute} style={btn} title="Make all widths equal, adding up to the unit width">Distribute widths evenly</button>
            <button type="button" onClick={syncTotals} style={btn} title="Re-write unit width/doors/shelves/drawers/rails/LED from the modules">Sync unit totals</button>
          </div>

          {/* selected module editor */}
          {cur && (
            <div style={{ border: '1px solid ' + BR, borderRadius: 10, padding: 12, background: BG2 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T1, marginBottom: 8 }}>{UL} {si + 1} <span style={{ fontWeight: 500, color: T3 }}>of {bays.length}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(112px,1fr))', gap: 10 }}>
                <div><label style={lab}>Width (mm)</label>{numIn('w_mm', 100, 10)}</div>
                <div>
                  <label style={lab}>Type</label>
                  <select value={cur.kind || cfg.kinds[0]} onChange={(e) => { const k = e.target.value; setBayMany({ kind: k, ...kindPatch(k, cur) }); }} style={{ ...inp, width: '100%' }}>
                    {kindOptions.map((v) => <option key={v} value={v}>{kindLabel(v, cat)}</option>)}
                  </select>
                </div>
                {fields.has('swing') && (
                  <div>
                    <label style={lab}>Swing</label>
                    <select value={cur.swing || 'left'} onChange={(e) => setBay('swing', e.target.value)} disabled={cur.kind === 'sliding_leaf'} style={{ ...inp, width: '100%' }}>
                      <option value="left">Hinged left</option><option value="right">Hinged right</option><option value="sliding">Sliding</option>
                    </select>
                  </div>
                )}
                {fields.has('leaves') && <div><label style={lab}>Door leaves</label>{numIn('leaves')}</div>}
                {fields.has('shelves') && <div><label style={lab}>Shelves</label>{numIn('shelves')}</div>}
                {fields.has('drawers') && <div><label style={lab}>Drawers</label>{numIn('drawers')}</div>}
                {fields.has('rails') && <div><label style={lab}>Hanging rails</label>{numIn('rails')}</div>}
                {showUpper && (
                  <div>
                    <label style={lab}>{cat === 'vanity' ? 'Above' : 'Upper unit'}</label>
                    <select value={cur.upper || 'none'} onChange={(e) => setBay('upper', e.target.value)} style={{ ...inp, width: '100%' }}>
                      {upperList.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                )}
                {fields.has('appliance') && cur.kind === 'appliance_tall' && (
                  <div>
                    <label style={lab}>Appliance</label>
                    <select value={cur.appliance || 'oven'} onChange={(e) => setBayMany({ appliance: e.target.value, leaves: e.target.value === 'fridge' ? 2 : 1 })} style={{ ...inp, width: '100%' }}>
                      <option value="oven">Oven + microwave</option><option value="fridge">Fridge-freezer</option>
                    </select>
                  </div>
                )}
                {fields.has('handle') && (
                  <div>
                    <label style={lab}>Handle</label>
                    <select value={cur.handle || 'bar'} onChange={(e) => setBay('handle', e.target.value)} style={{ ...inp, width: '100%' }}>
                      {BAY_HANDLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                )}
                {fields.has('finish') && (
                  <div>
                    <label style={lab}>{cat === 'door' ? 'Leaf finish' : 'Front finish'}</label>
                    {finBtns(cur.finish || 'A', (k) => setBay('finish', k))}
                  </div>
                )}
              </div>
              {(fields.has('hang_double') || fields.has('led')) && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
                  {fields.has('hang_double') && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T1, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!cur.hang_double} onChange={(e) => setBayMany({ hang_double: e.target.checked, rails: e.target.checked ? Math.max(2, ri(cur.rails)) : cur.rails })} /> Double hanging
                    </label>
                  )}
                  {fields.has('led') && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T1, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!cur.led} onChange={(e) => setBay('led', e.target.checked)} /> LED lighting in this {UL.split(' ')[0].toLowerCase()}
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {optsPanel}

          {/* finishes & palette */}
          <div style={{ border: '1px solid ' + BR, borderRadius: 10, padding: 12, background: BG2 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T1, marginBottom: 2 }}>Finishes &amp; palette</div>
            <div style={{ fontSize: 11, color: T3, marginBottom: 8 }}>A, B and C are used by the {cfg.unitPlural} above and printed as swatches on the design sheet.</div>
            {['A', 'B', 'C'].map((k) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ width: 22, fontWeight: 800, color: T1 }}>{k}</span>
                <input type="color" value={fin[k].hex} onChange={(e) => setFin(k, 'hex', e.target.value)} style={{ width: 38, height: 30, padding: 0, border: '1px solid ' + BR, borderRadius: 6, background: 'none', cursor: 'pointer' }} />
                <input value={fin[k].name} onChange={(e) => setFin(k, 'name', e.target.value)} placeholder="Name" style={{ ...inp, width: 150 }} />
                <input value={fin[k].desc} onChange={(e) => setFin(k, 'desc', e.target.value)} placeholder="Description for the sheet (optional)" style={{ ...inp, flex: 1, minWidth: 180 }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={seed} style={btn} title={`Replace ${cfg.unitPlural} with a layout built from this unit's counts`}>Seed from unit</button>
            <button type="button" onClick={sample} style={btn} title={cfg.sampleTitle}>{cfg.sampleLabel}</button>
            {onPreview && <button type="button" onClick={onPreview} style={{ ...btn, borderColor: OR, color: OR }} title="Open the one-page design sheet in a new window">👁 Design sheet preview</button>}
            <button type="button" onClick={clearBays} style={{ ...btn, color: '#dc2626' }}>Remove all {cfg.unitPlural}</button>
          </div>
        </>
      )}
    </div>
  );
}
