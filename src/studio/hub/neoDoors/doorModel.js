/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - the door model. Pure data + rules, no React, no THREE, no DOM (unit-tested).
 * A "design" is one door set: the opening it fills, the leaf (or two), the frame, the swing and the ironmongery.
 * All sizes are millimetres. Handing is read looking at the door FROM OUTSIDE (the side the person approaches from):
 *   RH = hinges on the right; swing "in" = the leaf opens away from that person, into the room.
 * Everything the studio edits is a field of this object; geometry, cut list, price, DXF and the 3D view are all derived from it.
 * ===========================================================================*/

export const FORMAT = 'neo-doors';
export const VERSION = 1;

/** the eight door types of the brief. barn / pocket / double carry a `style` (the construction of the leaf) because they describe how the door hangs. */
export const TYPES = ['flush', 'panel', 'moulded', 'glazed', 'louvre', 'barn', 'double', 'pocket'];
export const CONSTRUCTS = ['flush', 'panel', 'moulded', 'glazed', 'louvre'];
export const CORES = ['solid', 'hollow', 'engineered'];
export const SKINS = ['paint', 'veneer', 'lacquer', 'laminate'];
export const TIMBERS = ['softwood', 'hardwood'];
export const PROFILES = ['flat', 'raised', 'shaker', 'bolection'];
export const MOULDS = ['none', 'bead', 'ogee', 'bevel', 'square'];
export const GLASS_KINDS = ['clear', 'frosted', 'smoked'];
export const GLASS_SAFETY = ['toughened', 'laminated'];
export const FRAME_PROFILES = ['square', 'chamfer', 'rebated'];
export const ARCH_PROFILES = ['square', 'chamfer', 'ogee', 'bullnose'];
export const THRESHOLDS = ['none', 'flat', 'ramp'];
export const HINGE_TYPES = ['butt', 'ball', 'concealed', 'pivot'];
export const HANDLES = ['lever', 'knob', 'pull', 'none'];
export const FIRE = ['none', 'FD30', 'FD60'];
export const VENTS = ['none', 'undercut', 'grille'];
export const LOUVRE_ZONES = ['full', 'upper', 'lower'];

/** constants of the joinery (written into the notes of the cut list and the DXF) */
export const C = {
  TENON: 25, // each end of a rail / muntin that enters a stile
  GROOVE: 10, // panels and slats sit 10 mm into the grooves of the members around them
  GL_REB: 8, // glass sits 8 mm into the rebate on every side
  BEAD: 12, // glazing bead section (square)
  BAR_T: 20, // glazing bar thickness through the leaf
  LIP: 8, // lipping strip width on a flush leaf
  CORE_FRAME: 45, // width of the core frame members of a hollow / engineered leaf
  LOCK_BLOCK: 400, // length of the lock block
  HINGE_BLOCK: 200, // length of a hinge block (engineered core)
  STOP_T: 15, // width (along the wall thickness) of the integral stop
  LINING: 18, // timber lining of a vision panel opening
  SPINDLE_BORE: 19, CYL_BORE: 22, CYL_DROP: 72, // handle spindle bore, euro-cylinder bore and its drop below the spindle
  CASE_H: 165, CASE_T: 16, // mortice lock case: height along the edge, thickness across the edge
  PULL_SPACING: 300,
};

export const FINISH_KEYS = ['white', 'ivory', 'grey', 'black', 'oak', 'walnut', 'pine', 'mahogany'];
export const FINISHES = {
  white: { cssVar: '--nk-dr-fin-white', en: 'White', ar: 'أبيض', kind: 'paint' },
  ivory: { cssVar: '--nk-dr-fin-ivory', en: 'Ivory', ar: 'عاجي', kind: 'paint' },
  grey: { cssVar: '--nk-dr-fin-grey', en: 'Warm grey', ar: 'رمادي دافئ', kind: 'paint' },
  black: { cssVar: '--nk-dr-fin-black', en: 'Black', ar: 'أسود', kind: 'paint' },
  oak: { cssVar: '--nk-dr-fin-oak', en: 'Natural oak', ar: 'سنديان طبيعي', kind: 'wood' },
  walnut: { cssVar: '--nk-dr-fin-walnut', en: 'Dark walnut', ar: 'جوز داكن', kind: 'wood' },
  pine: { cssVar: '--nk-dr-fin-pine', en: 'Pine', ar: 'صنوبر', kind: 'wood' },
  mahogany: { cssVar: '--nk-dr-fin-mahogany', en: 'Mahogany', ar: 'ماهوجني', kind: 'wood' },
};

/** [min, max] of every number the studio edits (the single source of the Parameters ranges and of the clamps) */
export const RANGES = {
  ow: [600, 2400], oh: [1800, 3000], wall: [60, 400],
  thk: [30, 70], skinT: [3, 8], head: [2, 10], side: [2, 8], floor: [5, 40], meet: [2, 6],
  pack: [5, 20], jambThk: [20, 60], rebate: [8, 20], jambDepth: [0, 400], thrH: [10, 60],
  stile: [70, 200], topRail: [70, 200], bottomRail: [100, 300], midRail: [70, 200], muntin: [50, 150], cols: [1, 4], rows: [1, 6], panelThk: [6, 30],
  mouldW: [10, 40], glassRows: [0, 6], barsV: [0, 4], barsH: [0, 6], barW: [10, 40], vw: [100, 400], vh: [200, 1200], vcy: [900, 2000],
  slatPitch: [30, 70], slatW: [40, 100], slatT: [8, 14],
  archW: [40, 140], archT: [12, 30], reveal: [3, 12],
  hingeCount: [2, 5], hingeLen: [90, 140], hingeTop: [100, 300], hingeBot: [150, 400],
  backset: [44, 120], handleH: [900, 1100],
  ventGap: [10, 40], grW: [150, 400], grH: [100, 300],
  overlap: [20, 120], cover: [0, 100], speed: [0.25, 3],
};
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, def, [lo, hi]) => { const n = +v; return Number.isFinite(n) ? clamp(n, lo, hi) : def; };
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const bool = (v, def) => (typeof v === 'boolean' ? v : def);
const r1 = (v) => Math.round(v * 10) / 10;

/** the construction of the leaf (what is cut): the type itself, or its `style` for barn / double / pocket */
export function construction(d) {
  return CONSTRUCTS.includes(d.type) ? d.type : (CONSTRUCTS.includes(d.style) ? d.style : 'flush');
}

export function defaultDesign() {
  return normalizeDesign({
    title: 'My Door',
    type: 'panel', style: 'flush',
    opening: { w: 900, h: 2100, wall: 100 },
    leaf: { thk: 44, core: 'solid', skin: 'veneer', skinT: 4, finish: 'oak', timber: 'hardwood' },
    clear: { head: 3, side: 3, floor: 10, meet: 3 },
    panels: { cols: 2, rows: 2, stile: 110, topRail: 110, bottomRail: 200, midRail: 110, muntin: 70, profile: 'raised', panelThk: 22, mould: 'ogee', mouldW: 20, mouldSides: 2 },
    glass: { rows: 1, kind: 'clear', safety: 'toughened', thk: 6, barsV: 1, barsH: 1, barW: 22, vision: false, vw: 150, vh: 600, vcy: 1500 },
    louvre: { zone: 'full', pitch: 45, slatW: 65, slatT: 10 },
    frame: { on: true, pack: 10, jambThk: 32, rebate: 12, jambDepth: 0, profile: 'rebated', threshold: 'none', thrH: 20, arch: { on: true, w: 70, t: 18, profile: 'ogee', reveal: 6, sides: 'both' } },
    swing: { hand: 'RH', dir: 'in', active: 'right' },
    hinges: { count: 0, type: 'butt', len: 100, top: 150, bottom: 225 },
    lock: { on: true, backset: 60, handleH: 1000, cyl: true, handle: 'lever' },
    vent: { mode: 'none', gap: 20, grW: 300, grH: 150 },
    fire: { rating: 'none', note: '' },
    barn: { overlap: 50, cover: 20 },
  });
}

/** every field validated and clamped; unknown keys dropped; always returns a complete design (the engine never meets undefined) */
export function normalizeDesign(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const o = r.opening || {}; const lf = r.leaf || {}; const cl = r.clear || {}; const pn = r.panels || {}; const gl = r.glass || {}; const lv = r.louvre || {};
  const fr = r.frame || {}; const ar = fr.arch || {}; const sw = r.swing || {}; const hg = r.hinges || {}; const lk = r.lock || {}; const vt = r.vent || {}; const fi = r.fire || {}; const bn = r.barn || {};
  const type = oneOf(r.type, TYPES, 'panel');
  const rows = Math.round(num(pn.rows, 2, RANGES.rows));
  const d = {
    v: VERSION,
    title: typeof r.title === 'string' && r.title.trim() ? r.title.slice(0, 80) : 'My Door',
    type,
    style: oneOf(r.style, CONSTRUCTS, type === 'double' ? 'panel' : 'flush'),
    opening: { w: Math.round(num(o.w, 900, RANGES.ow)), h: Math.round(num(o.h, 2100, RANGES.oh)), wall: Math.round(num(o.wall, 100, RANGES.wall)) },
    leaf: {
      thk: Math.round(num(lf.thk, 44, RANGES.thk)), core: oneOf(lf.core, CORES, 'solid'), skin: oneOf(lf.skin, SKINS, 'veneer'),
      skinT: Math.round(num(lf.skinT, 4, RANGES.skinT) * 10) / 10, finish: oneOf(lf.finish, FINISH_KEYS, 'oak'), timber: oneOf(lf.timber, TIMBERS, 'hardwood'),
    },
    clear: { head: r1(num(cl.head, 3, RANGES.head)), side: r1(num(cl.side, 3, RANGES.side)), floor: r1(num(cl.floor, 10, RANGES.floor)), meet: r1(num(cl.meet, 3, RANGES.meet)) },
    panels: {
      cols: Math.round(num(pn.cols, 2, RANGES.cols)), rows,
      stile: Math.round(num(pn.stile, 110, RANGES.stile)), topRail: Math.round(num(pn.topRail, 110, RANGES.topRail)), bottomRail: Math.round(num(pn.bottomRail, 200, RANGES.bottomRail)),
      midRail: Math.round(num(pn.midRail, 110, RANGES.midRail)), muntin: Math.round(num(pn.muntin, 70, RANGES.muntin)),
      profile: oneOf(pn.profile, PROFILES, 'raised'), panelThk: Math.round(num(pn.panelThk, 22, RANGES.panelThk)),
      mould: oneOf(pn.mould, MOULDS, 'ogee'), mouldW: Math.round(num(pn.mouldW, 20, RANGES.mouldW)), mouldSides: pn.mouldSides === 1 ? 1 : 2,
    },
    glass: {
      rows: Math.round(num(gl.rows, 1, [0, rows])), kind: oneOf(gl.kind, GLASS_KINDS, 'clear'), safety: oneOf(gl.safety, GLASS_SAFETY, 'toughened'),
      thk: [6, 8, 10].includes(+gl.thk) ? +gl.thk : 6, barsV: Math.round(num(gl.barsV, 1, RANGES.barsV)), barsH: Math.round(num(gl.barsH, 1, RANGES.barsH)), barW: Math.round(num(gl.barW, 22, RANGES.barW)),
      vision: bool(gl.vision, false), vw: Math.round(num(gl.vw, 150, RANGES.vw)), vh: Math.round(num(gl.vh, 600, RANGES.vh)), vcy: Math.round(num(gl.vcy, 1500, RANGES.vcy)),
    },
    louvre: { zone: oneOf(lv.zone, LOUVRE_ZONES, 'full'), pitch: Math.round(num(lv.pitch, 45, RANGES.slatPitch)), slatW: Math.round(num(lv.slatW, 65, RANGES.slatW)), slatT: Math.round(num(lv.slatT, 10, RANGES.slatT)) },
    frame: {
      on: bool(fr.on, true), pack: Math.round(num(fr.pack, 10, RANGES.pack)), jambThk: Math.round(num(fr.jambThk, 32, RANGES.jambThk)), rebate: Math.round(num(fr.rebate, 12, RANGES.rebate)),
      jambDepth: fr.jambDepth ? Math.round(num(fr.jambDepth, 0, [60, 400])) : 0, profile: oneOf(fr.profile, FRAME_PROFILES, 'rebated'), threshold: oneOf(fr.threshold, THRESHOLDS, 'none'),
      thrH: Math.round(num(fr.thrH, 20, RANGES.thrH)),
      arch: { on: bool(ar.on, true), w: Math.round(num(ar.w, 70, RANGES.archW)), t: Math.round(num(ar.t, 18, RANGES.archT)), profile: oneOf(ar.profile, ARCH_PROFILES, 'ogee'), reveal: Math.round(num(ar.reveal, 6, RANGES.reveal)), sides: ar.sides === 'one' ? 'one' : 'both' },
    },
    swing: { hand: sw.hand === 'LH' ? 'LH' : 'RH', dir: sw.dir === 'out' ? 'out' : 'in', active: sw.active === 'left' ? 'left' : 'right' },
    hinges: { count: hg.count ? Math.round(num(hg.count, 3, RANGES.hingeCount)) : 0, type: oneOf(hg.type, HINGE_TYPES, 'butt'), len: Math.round(num(hg.len, 100, RANGES.hingeLen)), top: Math.round(num(hg.top, 150, RANGES.hingeTop)), bottom: Math.round(num(hg.bottom, 225, RANGES.hingeBot)) },
    lock: { on: bool(lk.on, true), backset: Math.round(num(lk.backset, 60, RANGES.backset)), handleH: Math.round(num(lk.handleH, 1000, RANGES.handleH)), cyl: bool(lk.cyl, true), handle: oneOf(lk.handle, HANDLES, 'lever') },
    vent: { mode: oneOf(vt.mode, VENTS, 'none'), gap: Math.round(num(vt.gap, 20, RANGES.ventGap)), grW: Math.round(num(vt.grW, 300, RANGES.grW)), grH: Math.round(num(vt.grH, 150, RANGES.grH)) },
    fire: { rating: oneOf(fi.rating, FIRE, 'none'), note: typeof fi.note === 'string' ? fi.note.slice(0, 200) : '' },
    barn: { overlap: Math.round(num(bn.overlap, 50, RANGES.overlap)), cover: Math.round(num(bn.cover, 20, RANGES.cover)) },
  };
  /* rules that keep the object consistent, never surprising: a glazed door has glass; a sliding door has no hinges (the frame and the architrave are only IGNORED for a barn door - switching the type back brings them back) */
  if (construction(d) === 'glazed' && d.glass.rows < 1) d.glass.rows = 1;
  if (d.panels.cols === 1 && d.glass.barsV > 2) d.glass.barsV = 2;
  if (d.type === 'barn' || d.type === 'pocket') d.hinges.count = 0; // no hinges on a sliding door
  return d;
}

/** the leaves of a door set: 2 for a double door, else 1 */
export const leafCount = (d) => (d.type === 'double' ? 2 : 1);
export const isSliding = (d) => d.type === 'barn' || d.type === 'pocket';

export const designJSON = (d) => JSON.stringify({ format: FORMAT, v: VERSION, exportedAt: new Date().toISOString(), design: d }, null, 2);
export function parseDesign(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON file'); }
  if (raw && raw.format && raw.format !== FORMAT) throw new Error(`Unknown format "${raw.format}"`);
  return normalizeDesign(raw && raw.design ? raw.design : raw);
}
/** stable key of a design (history, dirty check, memo) */
export const designKey = (d) => JSON.stringify(d);

/** a "blank" door (the smallest valid flush door, no extras) */
export function blankDesign() {
  const d = defaultDesign();
  return normalizeDesign({ ...d, title: 'New Door', type: 'flush', frame: { ...d.frame, arch: { ...d.frame.arch, on: false } }, lock: { ...d.lock, cyl: false } });
}

/** short name used in menus and file names */
export const TYPE_LABEL = {
  flush: ['Flush door', 'باب مسطح'], panel: ['Panel / shaker door', 'باب بانوه / شيكر'], moulded: ['Moulded door', 'باب مقولب'], glazed: ['Glazed / half-glass', 'باب زجاج'],
  louvre: ['Louvre door', 'باب شيش'], barn: ['Barn / sliding door', 'باب جرار (بارن)'], double: ['Double leaf door', 'باب ضلفتين'], pocket: ['Pocket door', 'باب جيبي'],
};
