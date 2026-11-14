/* Collections gallery: where it is and how the visitor gets there. PURE (no three.js, no DOM), unit-tested.
 *
 * The feature wall hangs on the INSIDE FACE OF THE RIGHT FRONT WING (the solid stone wing beside the glass curtain wall: x = 14..22, z = -0.8,
 * walnut-clad up to 4.5 m by hall.js). That face was empty: it is outside every bay (the first right-hand bay starts at z = -4.5), clear of
 * the walking lanes (|x| = 8), the planters (x = +-13), the Reception desk and the columns, so it blocks no aisle.
 * Three backlit lightboxes: the collection title in the middle, the finishes (name + reference code, and the swatch once its image is
 * available) either side. */
import { HALL } from '../3d/dimensions';
import { COLLECTIONS } from './data';

export const COLLECTIONS_ID = 'collections';
export const COLLECTIONS_DEPT = { id: COLLECTIONS_ID, en: 'Collections', ar: 'المجموعات' };

/** width / height of the two lightbox faces as wall.js draws them (920 x 1000 and 820 x 1000 canvas units) */
export const FACE_ASPECT = { title: 0.92, finishes: 0.82 };
const PANEL_H = 2.0;
const WALL_Z = -0.81;                                   // hall.js: inside face of the front wings
export const WALL = {
  x: 18, z: WALL_Z, y: 1.9,                             // centre of the composition (a little above the 1.65 m eye line); faces -z (into the hall)
  panelH: PANEL_H, titleW: PANEL_H * FACE_ASPECT.title, sideW: PANEL_H * FACE_ASPECT.finishes, gap: 0.2, depth: 0.12, frame: 0.07,
  cols: 3, rows: 6,                                     // finishes per side panel = 18 (two panels = the 36 finishes of the collection)
};
/** travertine plinth under the lightboxes (the deepest part of the installation: the collider is sized from it) */
export const PLINTH = { h: 0.42, depth: 0.36 };
/** the three lightboxes, left to right as the visitor sees them (the visitor looks toward +z, so their left is +x) */
export function wallPanels(w = WALL) {
  const step = (w.titleW + w.sideW) / 2 + w.gap;
  return [
    { id: 'finishes-a', kind: 'finishes', x: w.x + step, w: w.sideW, h: w.panelH, part: 0 },
    { id: 'title', kind: 'title', x: w.x, w: w.titleW, h: w.panelH },
    { id: 'finishes-b', kind: 'finishes', x: w.x - step, w: w.sideW, h: w.panelH, part: 1 },
  ];
}
export const wallWidth = (w = WALL) => w.titleW + 2 * w.sideW + 2 * w.gap + 2 * w.frame;

/** where the visitor stands (3.2 m from the wall: the whole 5.5 m composition is inside a 16:9 view) and what they look at */
export const STAND = [WALL.x, -4.0];
export const LOOK = [WALL.x, WALL.y - 0.25, WALL_Z];

/** plan-view obstacle: the lightboxes stand 12 cm proud of the wall and the plinth 36 cm; the box reaches back into the wing so nothing can get behind it. */
export function collectionsColliders() {
  /* the box spans the WHOLE wing (x = 14..22), not just the 5.5 m of lightboxes: a 0.5 m notch between the installation and the side wall would be
   * narrower than the walker (0.7 m) and such pockets make a sliding circle jitter between two obstacles (same rule as productColliders.js) */
  return [{ type: 'box', id: 'collections-wall', minX: HALL.glassHalf, maxX: HALL.halfWidth + 1, minZ: WALL_Z - PLINTH.depth - 0.04, maxZ: 0.35 }];
}

/** E / tap Interact works anywhere on the strip of floor in front of the wall (between the wing and the first bay) */
export function collectionsZones() {
  return [{ id: COLLECTIONS_ID, en: COLLECTIONS_DEPT.en, ar: COLLECTIONS_DEPT.ar, index: 10, collections: true, minX: HALL.glassHalf + 0.2, maxX: HALL.halfWidth, minZ: -4.45, maxZ: WALL_Z }];
}

/** add the gallery to the quick-nav graph: a node past the right-hand planter, then the stand point (returns a NEW graph; the department graph is untouched) */
export function withCollections(graph) {
  const nodes = { ...graph.nodes, collectionsLane: [13.6, -2.5], ['stand-' + COLLECTIONS_ID]: [...STAND] };
  const edges = [...graph.edges, ['spineR', 'collectionsLane'], ['collectionsLane', 'stand-' + COLLECTIONS_ID]];
  const stops = [...graph.stops, { id: COLLECTIONS_ID, index: 10, side: 'front', stand: [...STAND], look: [...LOOK], bay: null }];
  return { nodes, edges, stops };
}

/* ---- quality tiers: texture size of each lightbox, whether the lightboxes are over-bright (bloom), and which image a tile uses ---- */
export const TIER = {
  high:   { tex: 1024, glow: 1.08, picLight: true,  image: 'thumb', anisotropy: 8 },
  medium: { tex: 1024, glow: 1.0,  picLight: true,  image: 'thumb', anisotropy: 4 },
  low:    { tex: 512,  glow: 1.0,  picLight: false, image: 'small', anisotropy: 1 },   // no backlight bloom, half-size canvases
};
export const tierOf = (id) => TIER[id] || TIER.low;
/** swatch images are only fetched once the visitor is this close to the wall (or opens the panel) */
export const LOAD_RADIUS = 16;
export const shouldLoad = (x, z, r = LOAD_RADIUS) => Math.hypot(x - WALL.x, z - WALL.z) <= r;

/** the finishes shown on each side panel (page order, split in two) */
export function splitItems(col = COLLECTIONS[0], w = WALL) {
  const per = w.cols * w.rows, items = col ? col.items : [];
  return [items.slice(0, per), items.slice(per, per * 2)];
}

/* ---- WCAG contrast (the lightbox type is dark ink on a lit cream face) ---- */
const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance = (n) => 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
