/* =============================================================================
 * Neo Quote Builder [NEO-QUOTE-UX33] - FACTS: a small plain-JSON summary of a design, read from what the studio already built (model, scene,
 * hardware list, bill of materials). The description builder only ever reads facts, never a studio object, so it is a pure function with
 * hand-verifiable output. Nothing here is computed differently from the studio: counts are tallies of the studio's own scene parts and
 * hardware rows.
 * ===========================================================================*/
import { FINISHES as KFINISHES, COUNTERS, HANDLES as KHANDLES } from '../neoKitchen/constants';
import { FINISHES as DFINISHES } from '../neoDoors/doorModel';

const n0 = (v) => Math.max(0, Math.round(Number(v) || 0));
const tally = (parts) => {
  const t = { door: 0, glass: 0, drawer: 0, shelf: 0, flip: 0, open: 0 };
  (parts || []).forEach((p) => {
    if (p.kind === 'door') t.door += 1;
    else if (p.kind === 'glass') t.glass += 1;
    else if (p.kind === 'drawerFront') t.drawer += 1;
    else if (p.kind === 'shelf') t.shelf += 1;
    else if (p.kind === 'flip') t.flip += 1;
    else if (p.kind === 'open') t.open += 1;
  });
  return t;
};
/** door LEAVES of a wardrobe: a solid leaf is one `Door` part, a glass leaf is a frame (2 stiles) around its panes, so 2 stiles = 1 leaf */
const leaves = (parts) => {
  const ps = parts || [];
  const solid = ps.filter((p) => p.kind === 'door' && /(^|\s)Door$/.test(p.name || '')).length;
  const glass = Math.round(ps.filter((p) => p.kind === 'door' && /Glass frame stile$/.test(p.name || '')).length / 2);
  return { solid, glass };
};
/** hardware rows [{k,en,ar,qty}] -> { k: qty } */
export const hwMap = (hardware) => { const m = {}; (hardware || []).forEach((h) => { m[h.k] = (m[h.k] || 0) + n0(h.qty); }); return m; };
const bil = (en, ar) => ({ en, ar: ar || en });
const finishName = (f) => (f && f.name ? bil(f.name, f.name_ar || f.nameAr || f.name) : null);

/* ---- wardrobe ----------------------------------------------------------------------------------------------------------- */
/**
 * wardrobeFacts({ design, W, finish })
 *   design = the studio design { dims, type, doorSystem, mods[], x }; W = buildWardrobe(design) (scene, hardware, x, wing); finish = price-list finish row or null.
 */
export function wardrobeFacts({ design, W, finish }) {
  const x = W.x; const scene = W.scene;
  const col = (m, prefix) => {
    const lv = leaves(scene.parts.filter((p) => p.unitId === `${prefix}-${m.id}`));
    return { id: m.id, width: n0(m.width), hanging: m.hanging || 'none', shelves: n0(m.shelves), drawers: n0(m.drawers), doors: lv.solid + lv.glass, hidden: !!m.hidden, noDoor: !!m.noDoor, style: m.style || null };
  };
  const columns = design.mods.map((m) => col(m, 'wc'));
  const wing = x.wing && x.wing.on ? { side: x.wing.side, depth: n0(x.wing.depth), corner: x.wing.corner, columns: x.wing.mods.map((m) => col(m, 'wr')) } : null;
  const t = tally(scene.parts); const lv = leaves(scene.parts);
  const hw = hwMap(W.hardware);
  return {
    product: 'wardrobe', title: x.title, w: n0(design.dims.w), h: n0(design.dims.h), d: n0(design.dims.d),
    type: design.type, doorStyle: x.doorStyle, divisions: n0(x.divisions),
    finish: finishName(finish), boardFinish: x.finishKey ? bil((KFINISHES[x.finishKey] || {}).en || x.finishKey, (KFINISHES[x.finishKey] || {}).ar) : null,
    mats: x.mats && Object.keys(x.mats).length ? { ...x.mats } : null,
    columns, wing, board: x.board, back: x.back, plinthH: n0(x.plinthH), topBoxH: n0(x.topBoxH), railDia: n0(x.railDia),
    handle: { style: (x.handle && x.handle.style) || 'bar', len: n0(x.handle && x.handle.len) },
    counts: { doors: lv.solid + lv.glass, glassDoors: lv.glass, drawers: t.drawer, shelves: t.shelf, rails: hw.rail || 0 },
    hw: { hinges: hw.hinge || 0, runners: hw.runner || 0, handles: (hw.handleBar || 0) + (hw.handleKnob || 0) + (hw.handleProfile || 0), tracks: hw.track || 0, rollers: hw.roller || 0, legs: hw.leg || 0, rails: hw.rail || 0 },
    softCloseRunners: (hw.runner || 0) > 0,
    led: false,
  };
}

/* ---- kitchen ------------------------------------------------------------------------------------------------------------- */
/** kitchenFacts({ model, scene, hardware, layoutKey }) - model = the kitchen model, scene = buildScene(model) */
export function kitchenFacts({ model, scene, hardware, layoutKey, runLengths }) {
  const t = tally(scene.parts);
  const hw = hwMap(hardware);
  const led = !!(model.led && model.led.strip && model.led.on !== false);
  const f = KFINISHES[model.finish] || {}; const c = COUNTERS[model.counter] || {};
  return {
    product: 'kitchen', title: model.title, layout: layoutKey, runs: runLengths || [],
    h: n0(scene.bounds && scene.bounds.h), depth: n0(model.g && model.g.baseD), plinthH: n0(model.g && model.g.plinthH), topOn: !!model.topOn,
    finish: bil(f.en || String(model.finish || ''), f.ar), counter: bil(c.en || String(model.counter || ''), c.ar),
    handle: { style: (model.handle && model.handle.style) || 'bar', len: n0(model.handle && model.handle.len), en: (KHANDLES[model.handle && model.handle.style] || {}).en, ar: (KHANDLES[model.handle && model.handle.style] || {}).ar },
    counts: { doors: t.door, glassDoors: t.glass, drawers: t.drawer, shelves: t.shelf, flips: t.flip, open: t.open },
    hw: { hinges: hw.hinge || 0, runners: hw.runner || 0, handles: (hw.handleBar || 0) + (hw.handleKnob || 0) + (hw.handleProfile || 0), legs: hw.leg || 0, sinkCutouts: hw.sink || 0, hobCutouts: hw.hob || 0, liftStays: hw.liftStay || 0 },
    softCloseRunners: (hw.runner || 0) > 0,
    led,
  };
}

/* ---- door -------------------------------------------------------------------------------------------------------------------- */
/** doorFacts({ d, W }) - d = the door design, W = buildDoor(d) (hardware rows, S = sizes, bom) */
export function doorFacts({ d, W }) {
  const hw = hwMap(W.hardware);
  const f = DFINISHES[d.leaf.finish] || {};
  return {
    product: 'door', title: d.title, type: d.type, style: d.style, ow: n0(d.opening.w), oh: n0(d.opening.h), wall: n0(d.opening.wall),
    leaves: n0(W.S && W.S.n) || 1, leafThk: n0(d.leaf.thk), core: d.leaf.core, skin: d.leaf.skin, timber: d.leaf.timber,
    finish: bil(f.en || d.leaf.finish, f.ar), frame: !!(W.S && W.S.frameOn), architrave: !!(d.frame && d.frame.arch && d.frame.arch.on), threshold: d.frame ? d.frame.threshold : 'none',
    glass: (W.bom && W.bom.rows ? W.bom.rows.some((r) => r.mat === 'glass') : false) ? { kind: d.glass.kind, safety: d.glass.safety, thk: d.glass.thk, rows: d.glass.rows, vision: !!d.glass.vision } : null,
    swing: { hand: d.swing.hand, dir: d.swing.dir }, lockOn: !!d.lock.on, handle: d.lock.handle, cyl: !!d.lock.cyl, hingeType: d.hinges.type, hingeCount: hw.hinge || 0,
    fire: d.fire.rating, vent: d.vent.mode, hw,
  };
}

/* ---- custom piece / category studios ------------------------------------------------------------------------------------------ */
/** furnitureFacts({ product, categoryId, title, nameEn, nameAr, w, h, d, parts, hardware, boardM2, pieces, finish }) - generic summary for the custom and category studios */
export function furnitureFacts(o) {
  const hw = hwMap(o.hardware);
  const t = tally(o.parts || []);
  return {
    product: o.product || 'category', categoryId: o.categoryId || null, title: o.title || '', nameEn: o.nameEn || null, nameAr: o.nameAr || null,
    w: n0(o.w), h: n0(o.h), d: n0(o.d), finish: o.finish || null,
    counts: { doors: t.door, glassDoors: t.glass, drawers: t.drawer, shelves: t.shelf, open: t.open }, pieces: n0(o.pieces), boardM2: Math.round((Number(o.boardM2) || 0) * 100) / 100,
    hw: { hinges: hw.hinge || 0, runners: hw.runner || 0, handles: (hw.handleBar || 0) + (hw.handleKnob || 0) + (hw.handleProfile || 0), legs: hw.leg || 0 },
    softCloseRunners: (hw.runner || 0) > 0, led: !!o.led,
  };
}
