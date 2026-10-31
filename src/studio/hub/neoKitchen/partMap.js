/* Neo Kitchen Designer - UX-16 part map (PURE): the kitchen elevation as rectangles, each tagged with the Look group(s) and the
 * production-material slot(s) that paint it, so hovering a row can highlight exactly the parts it covers.
 * Built read-only from the live scene through the same elevationItems() the elevation and the cut-list Map column use; the
 * elevation component itself is not involved. Coordinates are model millimetres (u along the run, y up). */
import { elevationItems } from './geometry';
import { matSlots, paintGroupOfKind } from './materials';

const FRONT_KINDS = new Set(['door', 'drawerFront']);

/**
 * @returns {{rects: Array<{id:string, role:'unit'|'front'|'counter'|'plinth'|'handle'|'open', x0:number,x1:number,y0:number,y1:number,
 *            groups:string[], slots:string[], row?:string}>, w:number, h:number}}
 */
export function mapRects(scene, rk = 'main') {
  if (scene && scene.mapRects) return scene.mapRects; // [NEO-CUSTOM-UX28] a custom-furniture scene carries its own front-view rectangles (it has no kitchen units)
  const run = scene && scene.runs ? scene.runs.find((r) => r.key === rk) : null;
  if (!run) return { rects: [], w: 0, h: 0 };
  const partById = new Map(scene.parts.map((p) => [p.id, p]));
  /* what each unit's inner parts (sides, back, shelves, drawer boxes) are made of */
  const inner = new Map();
  scene.parts.forEach((p) => {
    if (p.runKey !== rk || !p.unitId || FRONT_KINDS.has(p.kind) || p.kind === 'glass') return;
    const e = inner.get(p.unitId) || { groups: new Set(), slots: new Set() };
    const g = paintGroupOfKind(p.kind); if (g) e.groups.add(g);
    matSlots(p).forEach((s) => e.slots.add(s));
    inner.set(p.unitId, e);
  });
  const rects = [];
  elevationItems(scene, rk).forEach((it, i) => {
    const base = { id: `${rk}:${i}`, x0: it.u0, x1: it.u1, y0: it.y0, y1: it.y1, row: it.row };
    if (it.carcass) {
      const e = inner.get(it.unitId) || { groups: new Set(['carcass']), slots: new Set(['structure']) };
      rects.push({ ...base, role: 'unit', groups: [...e.groups], slots: [...e.slots] });
    } else if (it.partId) {
      const p = partById.get(it.partId);
      if (!p || p.kind === 'glass') { rects.push({ ...base, role: 'front', groups: [], slots: [] }); return; }
      rects.push({ ...base, role: 'front', groups: [paintGroupOfKind(p.kind)].filter(Boolean), slots: matSlots(p) });
    } else if (it.type === 'open') {
      rects.push({ ...base, role: 'open', groups: ['shelves'], slots: ['shelves'] });
    } else if (it.type === 'counter') {
      rects.push({ ...base, role: 'counter', groups: ['counter'], slots: ['countertop'] });
    } else if (it.type === 'plinth') {
      rects.push({ ...base, role: 'plinth', groups: ['plinth'], slots: ['plinth'] });
    }
  });
  /* handles: a small bar / knob on the front they belong to */
  scene.handles.forEach((h, i) => {
    const p = partById.get(h.partId); if (!p || p.runKey !== rk) return;
    const vertical = h.orient === 'v';
    const len = h.style === 'knob' ? 24 : h.style === 'profile' ? 300 : (h.len || 128) + 16;
    const th = h.style === 'knob' ? 24 : 14;
    rects.push({ id: `${rk}:h${i}`, role: 'handle', x0: h.u - (vertical ? th : len) / 2, x1: h.u + (vertical ? th : len) / 2, y0: h.y - (vertical ? len : th) / 2, y1: h.y + (vertical ? len : th) / 2, groups: ['handles'], slots: ['handles'], row: undefined });
  });
  const w = Math.max(1, run.L, ...rects.map((r) => r.x1));
  const h = Math.max(1, ...rects.map((r) => r.y1));
  return { rects, w, h };
}

/** does a hovered target ({ group } for the Look rows, { slot } for the name rows) paint this rectangle? */
export const paints = (rect, target) => !!target && (target.group ? rect.groups.includes(target.group) : target.slot ? rect.slots.includes(target.slot) : false);
