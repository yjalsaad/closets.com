/* =============================================================================
 * Neo category studios [NEO-CATEGORIES-UX26] - the pure KIT the four category configs (bathroom, laundry, TV unit, office) are written with.
 * Nothing here draws: it edits the FRESH Neo Kitchen scene object that buildScene() returned (adds manufactured parts, display props, LED
 * strips, custom worktops, synthetic modules) so the proven kitchen engine - elevation, 3D, X-Ray, Explode, Open, cut list, hardware,
 * DXF / OBJ / STL / 3DM / xlsx / PDF - is reused unchanged. Same idea as wardrobeModel.decorateScene.
 *
 * Coordinates are the engine's run frame: u = along the run (left to right as seen from the front), y = up (0 = floor), d = depth from the wall.
 * A PART is manufactured (cut list, price, files). A PROP is display only (appliances, TV, taps, LED glow): never in the cut list or the price.
 * ===========================================================================*/
import { clamp } from '../neoKitchen/model';

export const r1 = (v) => Math.round(v * 10) / 10;
export const r2 = (v) => Math.round(v * 100) / 100;
export const RI = (v) => Math.round(Number(v) || 0);
/** box in the engine's order helper: bx(u0, u1, y0, y1, d0, d1) */
export const bx = (u0, u1, y0, y1, d0, d1) => ({ u0, u1, y0, y1, d0, d1 });

/** the placed instance (and its run) of a kitchen unit id, or null */
export function findInst(scene, unitId) {
  for (const run of scene.runs) { const inst = run.units.find((q) => q.unit.id === unitId); if (inst) return { run, inst }; }
  return null;
}

/** add a manufactured part to a placed unit (cut list, price, 3D, files). spec = { kind, name, mat, box, view?, ptype?, edges?, note?, anim?, qty?, ... } */
export function addPart(scene, inst, spec) {
  const b = spec.box;
  inst.xn = (inst.xn || 0) + 1;
  const p = {
    id: `${inst.unit.id}#x${inst.xn}`, unitId: inst.unit.id, runKey: inst.rk, row: inst.row, group: inst.group, qty: 1, grain: 'auto', edges: [], note: '', view: 'front', ptype: 'cover',
    ...spec, ext: { w: r2(b.u1 - b.u0), d: r2(b.d1 - b.d0), h: r2(b.y1 - b.y0) },
  };
  inst.parts.push(p); scene.parts.push(p);
  return p;
}

/** change the box of an existing part (its cut size follows) */
export function setBox(p, box) { p.box = { ...p.box, ...box }; p.ext = { w: r2(p.box.u1 - p.box.u0), d: r2(p.box.d1 - p.box.d0), h: r2(p.box.y1 - p.box.y0) }; return p; }

/** name an open section in the elevation (a washer, a TV): the drawing prints `label` ([en, ar]) inside the niche instead of an empty "open shelf" */
export function markNiche(inst, si, type, label) {
  const b = inst.bounds[si]; if (!b) return;
  inst.elev = inst.elev.filter((e) => !(e.kind === 'open' && e.si === si)).concat([{ kind: 'niche', si, type, label, yb: b.bot, yt: b.top }]);
}

/** a copy of an existing part with another box / name (same unit, same animation, same material) */
export function clonePart(scene, inst, p, patch) {
  const { id, ext, ...rest } = p; // eslint-disable-line no-unused-vars
  return addPart(scene, inst, { ...rest, ...patch });
}

/** remove parts of a placed unit that satisfy `test` (e.g. the carcass of a desk module) from the instance AND the scene */
export function removeParts(scene, inst, test) {
  const gone = new Set(inst.parts.filter(test).map((p) => p.id));
  inst.parts = inst.parts.filter((p) => !gone.has(p.id));
  scene.parts = scene.parts.filter((p) => !gone.has(p.id));
  ['hinges', 'handles', 'pins', 'joints'].forEach((k) => { scene[k] = scene[k].filter((h) => !gone.has(h.partId)); inst[k] = (inst[k] || []).filter((h) => !gone.has(h.partId)); });
  return gone.size;
}

/** display prop (never a part): spec = { kind, unitId?, runKey?, row?, box?, boxes:[{u0..d1, mat}] } */
export function addProp(scene, spec) {
  if (!scene.props) scene.props = [];
  const boxes = spec.boxes || [{ ...spec.box, mat: spec.mat || 'dark' }];
  const hull = boxes.reduce((a, b) => ({ u0: Math.min(a.u0, b.u0), u1: Math.max(a.u1, b.u1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1), d0: Math.min(a.d0, b.d0), d1: Math.max(a.d1, b.d1) }), { u0: Infinity, u1: -Infinity, y0: Infinity, y1: -Infinity, d0: Infinity, d1: -Infinity });
  const pr = { runKey: 'main', row: 'base', ...spec, boxes, box: spec.box || hull };
  scene.props.push(pr);
  return pr;
}

/** an LED strip the 3D view draws as an emissive box (+ a point light for the first few). inst = the placed unit it belongs to */
export function addLed(scene, inst, spec) {
  if (!scene.leds) scene.leds = [];
  const led = { unitId: inst.unit.id, partId: null, runKey: inst.rk, on: true, w: 20, off: 0, ...spec };
  scene.leds.push(led);
  return led;
}

/** A frame (4 thin boxes) around a rectangle in the u-y plane at depth d0..d1: used for mirror frames, LED halos, niche surrounds */
export function frameBoxes(u0, u1, y0, y1, d0, d1, t, mat) {
  return [
    { u0, u1, y0, y1: y0 + t, d0, d1, mat }, { u0, u1, y0: y1 - t, y1, d0, d1, mat },
    { u0, u1: u0 + t, y0: y0 + t, y1: y1 - t, d0, d1, mat }, { u0: u1 - t, u1, y0: y0 + t, y1: y1 - t, d0, d1, mat },
  ];
}

/** a hollow tub (basin / sink / bin): floor + 4 walls, open on top */
export function tubBoxes(u0, u1, y0, y1, d0, d1, t, mat) {
  return [
    { u0, u1, y0, y1: y0 + t, d0, d1, mat },
    { u0, u1: u0 + t, y0: y0 + t, y1, d0, d1, mat }, { u0: u1 - t, u1, y0: y0 + t, y1, d0, d1, mat },
    { u0: u0 + t, u1: u1 - t, y0: y0 + t, y1, d0, d1: d0 + t, mat }, { u0: u0 + t, u1: u1 - t, y0: y0 + t, y1, d0: d1 - t, d1, mat },
  ];
}

/** the placed instances of a design unit: { base, wall } (either may be null). `ids` = { base:'cb-x', wall:'cw-x' } from the model builder */
export function instsOf(scene, ids) {
  const b = ids.base ? findInst(scene, ids.base) : null; const w = ids.wall ? findInst(scene, ids.wall) : null;
  return { base: b ? b.inst : null, wall: w ? w.inst : null, run: (b || w) ? (b || w).run : null };
}

/** set the display label / tag / group of a placed unit and of all its parts (the cut list groups by `group`) */
export function nameInst(inst, { label, tag, group }) {
  if (!inst) return;
  if (label) inst.label = label; if (tag) inst.tag = tag;
  if (group) { inst.group = group; inst.parts.forEach((p) => { p.group = group; }); }
}

/** A synthetic placed module: a unit that has NO kitchen carcass (a desk frame, a back panel, a worktop-only run). It appears in the elevation,
 *  the selection and the cut list through the parts it is given. Mirrors the fields buildUnit() returns. */
export function addModule(scene, runKey, spec) {
  const run = scene.runs.find((r) => r.key === runKey); if (!run) return null;
  const { id, u0, w, y0, H, D, row = 'base', label, tag, group } = spec;
  const fu0 = run.flip ? run.L - (u0 + w) : u0;
  const inst = {
    parts: [], hinges: [], handles: [], pins: [], joints: [], appliances: [], cutouts: [], leds: [], elev: [{ kind: 'sec', si: 0, type: 'open', yb: y0, yt: y0 + H, h: H }],
    bounds: [{ top: y0 + H, bot: y0 }], backPart: null, tall: false, rowTag: 'Base', W: w, H, D, y0, fu0, tag, label, group, unit: { id, w, type: 'normal', secs: [] }, rk: runKey, row, u0, idx: run.units.length, noCarcass: true,
  };
  run.units.push(inst);
  return inst;
}

/** replace a run's worktops with the ones the category wants: [{ u0, u1, d1, thk?, y0? }] in FRONT-VIEW coordinates (fu). Keeps the engine's record shape. */
export function setCounters(scene, runKey, list, { y0, thk, d1 }) {
  const run = scene.runs.find((r) => r.key === runKey); if (!run) return;
  run.counters = list.map((c) => ({ u0: c.u0, u1: c.u1, y0: c.y0 !== undefined ? c.y0 : y0, y1: (c.y0 !== undefined ? c.y0 : y0) + (c.thk || thk), d0: 0, d1: c.d1 || d1, runKey, cutouts: [] }));
  run.splashes = [];
}

/** remove the given spans [{u0,u1}] from every worktop of a run (a worktop that is not wanted over a niche); keeps the cut-outs that still lie on a piece */
export function cutCounters(run, spans) {
  let list = run.counters;
  spans.forEach((s) => {
    const next = [];
    list.forEach((c) => {
      if (s.u1 <= c.u0 || s.u0 >= c.u1) { next.push(c); return; }
      if (s.u0 > c.u0 + 1) next.push({ ...c, u1: s.u0, cutouts: c.cutouts.filter((q) => q.cu < s.u0) });
      if (s.u1 < c.u1 - 1) next.push({ ...c, u0: s.u1, cutouts: c.cutouts.filter((q) => q.cu > s.u1) });
    });
    list = next;
  });
  run.counters = list;
}

/** replace a run's plinth record by plinth BOARDS (cut-list parts) over the given spans [{u0,u1}] (front-view coordinates); a niche that stands on the floor has none */
export function setPlinthParts(scene, runKey, spans, { h, setback = 60, board = 18, D }) {
  const run = scene.runs.find((r) => r.key === runKey); if (!run) return;
  run.plinth = null;
  const owner = run.units.find((x) => x.row === 'base'); if (!owner) return;
  spans.filter((s) => s.u1 - s.u0 > 20).forEach((s) => { const front = s.D || D; addPart(scene, owner, { kind: 'plinth', name: 'Plinth', mat: 'Plinth', ptype: 'plinth', row: 'plinth', group: 'Plinth', view: 'front', edges: [{ axis: 'u', where: 'top' }], note: `Setback ${Math.round(setback)} mm`, box: { u0: s.u0, u1: s.u1, y0: 0, y1: h, d0: front - setback - board, d1: front - setback } }); });
}

/** the stretches of contiguous floor-standing base units of a run that share one depth: [{ u0, u1, D }] (what a plinth board runs along) */
export function plinthSpans(run) {
  const spans = []; let cur = null;
  run.units.filter((q) => q.row === 'base' && !q.noFeet).sort((a, b) => a.fu0 - b.fu0).forEach((q) => {
    if (cur && Math.abs(q.fu0 - cur.u1) < 1 && cur.D === q.D) cur.u1 = q.fu0 + q.W; else { cur = { u0: q.fu0, u1: q.fu0 + q.W, D: q.D }; spans.push(cur); }
  });
  return spans;
}

/** add a counter cut-out (front-view coordinates) to the counter that contains `cu`; name is what the cut list prints */
export function addCutout(run, { type = 'hob', name, cu, w, d, dOff }) {
  const ct = run.counters.find((k) => cu >= k.u0 && cu <= k.u1); if (!ct) return null;
  const dc = dOff !== undefined ? dOff : ct.d1 / 2 - 20;
  const c = { type, name, unitId: null, cu, w, d, u0: cu - w / 2, u1: cu + w / 2, d0: dc - d / 2, d1: dc + d / 2, y: ct.y1 };
  ct.cutouts.push(c);
  return c;
}

/** scene signature for tests: every part box + prop box + counter + led, rounded. Two designs with different 3D give different strings. */
export function sceneSig(scene) {
  const f = (b) => [b.u0, b.u1, b.y0, b.y1, b.d0, b.d1].map((v) => Math.round(v)).join(',');
  const parts = scene.parts.map((p) => `${p.kind}:${p.name}:${f(p.box)}`).sort().join('|');
  const props = (scene.props || []).map((p) => `${p.kind}:${p.boxes.map((b) => `${b.mat}${f(b)}`).join(';')}`).join('|');
  const ctr = scene.runs.map((r) => `${r.key}:${r.counters.map((c) => `${f(c)}${c.cutouts.map((q) => `${Math.round(q.w)}x${Math.round(q.d)}@${Math.round(q.cu)}`).join('+')}`).join(';')}:${r.splashes.map(f).join(';')}:${r.plinth ? f(r.plinth) : '-'}`).join('|');
  const led = (scene.leds || []).map((l) => `${l.on ? 1 : 0}${f(l)}`).join('|');
  return [parts, props, ctr, led, scene.noFeet ? 'nofeet' : 'feet', scene.model.counter, scene.model.finish].join('#');
}

export { clamp };
