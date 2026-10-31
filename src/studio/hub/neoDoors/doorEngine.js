/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - the engine: one call turns a design into everything the studio shows.
 *   buildDoor(design, { rates }) -> { S, leaves, scene, bom, hardware, weight, warnings, price }
 * Pure and deterministic; the studio memoises it on the design key. No React, no THREE, no DOM.
 * ===========================================================================*/
import { buildParts } from './doorGeometry';
import { buildBOM, buildHardware, buildWarnings, weights } from './doorBom';
import { priceDoor, DEFAULT_RATES } from './doorPrice';
import { isSliding } from './doorModel';

export function buildDoor(d, { rates = DEFAULT_RATES } = {}) {
  const G = buildParts(d);
  const bom = buildBOM(G.parts, d);
  const kg = weights(G.parts, d, G.S.n);
  const hardware = buildHardware(d, G);
  const warnings = buildWarnings(d, G, bom, kg);
  /* scene: the cut parts and the hardware, with the open-animation group of their leaf (OpenControl reads anim.k and unitId) */
  const kind = isSliding(d) ? 'slide' : 'door';
  const anim = G.leaves.map((lf) => ({ k: kind, leaf: lf.index }));
  const scene = {
    product: 'door', S: G.S, leaves: G.leaves, track: G.track, wall: G.wall, apertures: G.apertures, grid: G.grid, hingeYs: G.hingeYs,
    parts: [...G.parts, ...G.hw].map((p) => ({ ...p, unitId: p.leaf == null ? (p.group === 'Architrave' ? 'arch' : 'frame') : `leaf${p.leaf}`, anim: p.leaf == null ? null : anim[p.leaf] })),
    /* the box the camera fits: the door set with its architrave and some air (the wall around it is drawn larger and is simply cropped) */
    bounds: { w: Math.round(G.S.OW + 2 * (d.frame.arch.on ? d.frame.arch.w : 0) + 700 + (d.type === 'barn' ? G.S.leafW : 0)), h: G.S.OH + 380, d: Math.max(G.S.wall + 400, 700) },
  };
  const W = { S: G.S, leaves: G.leaves, scene, bom, hardware, weight: kg, warnings, hingeCount: G.hingeCount, apertures: G.apertures, grid: G.grid, track: G.track, design: d };
  W.price = priceDoor(d, W, rates);
  return W;
}

/** the selected part / leaf as the bottom card shows it */
export function selectionInfo(W, sel) {
  if (!sel) return null;
  const parts = W.scene.parts;
  const p = sel.partId ? parts.find((x) => x.id === sel.partId) : null;
  if (p) {
    const row = W.bom.rows.find((r) => r.ids.includes(p.id));
    const b = p.boxes[0];
    return {
      id: p.id, name: p.name, ar: p.ar, ptype: p.ptype, unitId: p.unitId, no: row ? row.no : null,
      dims: row ? [row.L, row.W, row.T] : [b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0].map((v) => Math.round(v * 10) / 10),
      mat: row ? row.matName : '', matAr: row ? row.matAr : '', area: row ? row.areaEach : null, openable: !!p.anim, leaf: p.leaf,
    };
  }
  const lf = W.leaves.find((l) => l.id === sel.unitId);
  if (lf) return { id: lf.id, name: `Leaf ${lf.index + 1}`, ar: `ضلفة ${lf.index + 1}`, ptype: 'leaf', unitId: lf.id, no: null, dims: [lf.w, lf.h, lf.t], mat: '', matAr: '', area: (lf.w * lf.h) / 1e6, openable: true, leaf: lf.index };
  return null;
}
export const openIdsFor = (W, info) => (info && info.openable ? W.scene.parts.filter((p) => p.anim && p.unitId === `leaf${info.leaf}`).map((p) => p.id) : []);

export { DEFAULT_RATES };
