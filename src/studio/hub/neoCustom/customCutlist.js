/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - cut list (BOM), hardware list, edge banding, warnings (pure).
 * Same row shape as the Neo Kitchen cut list (neoKitchen/cutlist.js buildBOM), so CutListView, the xlsx / PDF / CSV writers and the sheet nesting
 * (neoKitchen/dxfPlan.js nestBOM) read it unchanged. Differences, all deliberate:
 *   - every part states its own grain direction and which edges are banded (L1 L2 = the two long edges, W1 W2 = the two short ones);
 *   - cut size = size minus the edge-band thickness on each banded edge (a banded LONG edge shortens the WIDTH, a banded SHORT edge the LENGTH);
 *   - frame members (legs, rails) are solid timber (class "Timber"): listed, priced per metre, never nested on sheets;
 *   - cut-outs (notch / radius / hole) are written in the Note column; the area stays the bounding rectangle (what you buy);
 *   - m2 of a row = qty x (cut L x cut W) in m2 at the 0.1 mm rounded sizes (the kitchen rule: the largest face of the cut part).
 * ===========================================================================*/
import { BOARD, BOARD_ORDER } from '../neoKitchen/constants';
import { planeAxes } from '../neoKitchen/cutlist';
import { matSlots, canonMats } from '../neoKitchen/materials';
import { getPart, partName, numbering, HW } from './customModel';
import { contacts, overlaps, supportedBases } from './customCollide';
import { repGap } from './customSolve';

const AX = { u: 'w', d: 'd', y: 'h' };
const AXL = { x: 'u', y: 'y', z: 'd' };
const r1 = (v) => Math.round(v * 10) / 10;
const EB_ORDER = ['L1', 'L2', 'W1', 'W2'];

/** grain letter for a scene part: 'L' along the cut length, 'W' along the cut width, '-' none */
function grainOf(sp, design, aL, aW) {
  const base = getPart(design, sp.baseId);
  let pref = base ? base.grain : 'auto';
  if (sp.kind === 'drawerBox') pref = 'none';
  if (pref === 'none') return '-';
  if (sp.mat === 'Glass') return '-';
  let axis = AXL[pref];
  if (pref === 'auto') {
    if (sp.kind === 'back') return '-';
    if (sp.kind === 'door') axis = 'y';
    else if (sp.kind === 'drawerFront') axis = 'u';
    else axis = aL; // the longest dimension
  }
  return axis === aL ? 'L' : axis === aW ? 'W' : 'L';
}

/** cut sizes, edge string and edge length of one scene part */
export function analyse(sp, design, edgeBand) {
  const ext = sp.ext;
  const [aL, aW, aT] = planeAxes(ext);
  const L = ext[AX[aL]]; const W = ext[AX[aW]]; const T = ext[AX[aT]];
  const eb = EB_ORDER.filter((c) => (sp.eb || []).includes(c));
  const nLong = eb.filter((c) => c[0] === 'L').length; const nShort = eb.filter((c) => c[0] === 'W').length;
  return {
    L, W, T, aL, aW, aT, eb,
    cut: { L: r1(L - edgeBand * nShort), W: r1(W - edgeBand * nLong), T },
    grain: grainOf(sp, design, aL, aW), edgeStr: eb.join('·'), edgeLen: (L * nLong + W * nShort) / 1000,
  };
}

const dispName = (sp) => (sp.group ? `${sp.group} - ${sp.name}` : sp.name);
const dispNameAr = (sp) => (sp.group ? `${sp.group} - ${sp.nameAr}` : sp.nameAr);

/** the cut list. `scene` = customScene.buildScene(design). */
export function buildBOM(design, scene) {
  const model = scene.model;
  const eb = design.g.edgeBand;
  const mats = canonMats(model.mats);
  const map = new Map();
  scene.parts.filter((p) => !p.hw).forEach((p) => {
    const a = analyse(p, design, eb);
    const named = matSlots(p).map((k) => mats[k]).find(Boolean) || '';
    const key = [dispName(p), p.ext.w, p.ext.d, p.ext.h, p.mat, named, a.grain, a.edgeStr, p.note || ''].join('|');
    let row = map.get(key);
    if (!row) {
      row = {
        key, name: dispName(p), nameAr: dispNameAr(p), group: p.group, w: r1(p.ext.w), d: r1(p.ext.d), h: r1(p.ext.h), qty: 0, mat: p.mat, matName: named || BOARD[p.mat].en,
        grain: a.grain, edges: a.edgeStr, edgeLen: a.edgeLen, cut: a.cut, area: 0, note: p.note || '', noteAr: p.noteAr || '', kind: p.kind, ptype: p.ptype, rep: p, maps: [], unitIds: new Set(), timber: p.mat === 'Timber',
      };
      map.set(key, row);
    }
    row.qty += p.qty === undefined ? 1 : p.qty;
    row.area += ((r1(a.cut.L) * r1(a.cut.W)) / 1e6) * (p.qty === undefined ? 1 : p.qty);
    if (p.no) row.maps.push(String(p.no));
    row.unitIds.add(p.baseId);
  });
  const rows = [...map.values()].map((r, i) => ({ ...r, no: i + 1, area: Math.round(r.area * 1e6) / 1e6, maps: [...new Set(r.maps)], unitIds: [...r.unitIds] }));
  const pieces = rows.reduce((s, r) => s + r.qty, 0);
  const boardArea = rows.reduce((s, r) => s + r.area, 0);
  const cards = BOARD_ORDER.map((k) => {
    const rs = rows.filter((r) => r.mat === k);
    return { k, pcs: rs.reduce((s, r) => s + r.qty, 0), m2: rs.reduce((s, r) => s + r.area, 0) };
  }).filter((c) => c.pcs);
  const named = {};
  rows.forEach((r) => { const k = r.matName; if (!named[k]) named[k] = { pcs: 0, m2: 0 }; named[k].pcs += r.qty; named[k].m2 += r.area; });
  const edgeMetres = rows.reduce((s, r) => s + r.edgeLen * r.qty, 0);
  /* metres of timber (frame members: their longest side) - what the price multiplies by the per-metre rate */
  const timberM = rows.filter((r) => r.timber).reduce((s, r) => s + (Math.max(r.w, r.d, r.h) / 1000) * r.qty, 0);
  return { rows, pieces, boardArea, unique: rows.length, cards, named, edgeMetres, timberM, nominal: [] };
}

/* ---- hardware ---------------------------------------------------------------------------------------------------- */
/** joinery estimate: dowels + minifix per board-to-board joint, dowels per frame joint (n = max(2, ceil(joint length / 300))). Labelled an estimate on screen. */
export function joinery(solved) {
  const cs = contacts(solved);
  let dowel = 0; let minifix = 0; let frameDowel = 0;
  cs.forEach((c) => {
    const n = Math.max(2, Math.ceil(c.len / 300));
    if (c.boardBoard) { dowel += n; minifix += n; } else frameDowel += n;
  });
  return { joints: cs.length, dowel, minifix, frameDowel };
}

export function buildHardware(design, scene) {
  const hingesN = scene.hinges.filter((h) => !h.flip).length;
  const flipN = scene.hinges.filter((h) => h.flip).length;
  const flipDoors = scene.parts.filter((p) => p.anim && p.anim.k === 'flip').length;
  const hs = { bar: 0, knob: 0, profile: 0 };
  scene.handles.forEach((h) => { hs[h.style] = (hs[h.style] || 0) + 1; });
  const hwParts = scene.parts.filter((p) => p.hw);
  const hwN = (k) => hwParts.filter((p) => p.hwKey === k).length;
  ['bar', 'knob', 'profile'].forEach((k) => { hs[k] += hwN(k); });
  const adj = scene.parts.filter((p) => p.kind === 'shelf' && p.fixed === false).length;
  const panes = scene.parts.filter((p) => p.kind === 'glass').length;
  const j = design.x.joinery ? joinery(scene.solved) : { dowel: 0, minifix: 0, frameDowel: 0 };
  const len = design.x.handle.len;
  const rows = [
    { k: 'hinge', en: 'Hinge (cup D35)', ar: 'مفصلة (كوب Ø35)', qty: hingesN },
    { k: 'plate', en: 'Hinge mounting plate', ar: 'قاعدة مفصلة', qty: hingesN },
    { k: 'flipHinge', en: 'Flip-up fitting', ar: 'مفصلة قلاب', qty: flipN },
    { k: 'liftStay', en: 'Lift stay', ar: 'ذراع رفع', qty: flipDoors * 2 },
    { k: 'runner', en: 'Soft-close runner (pair)', ar: 'سكة درج (زوج)', qty: scene.hardwareExtra.runners },
    { k: 'handleBar', en: `Bar handle ${len} mm`, ar: `مقبض شريط ${len} مم`, qty: hs.bar },
    { k: 'handleKnob', en: 'Knob', ar: 'مقبض كرة', qty: hs.knob },
    { k: 'handleProfile', en: 'Profile handle', ar: 'مقبض بروفايل', qty: hs.profile },
    { k: 'pin', en: 'Shelf pin D5', ar: 'مسمار رف Ø5', qty: adj * 4 },
    { k: 'foot', en: HW.foot.en, ar: HW.foot.ar, qty: hwN('foot') },
    { k: 'castor', en: HW.castor.en, ar: HW.castor.ar, qty: hwN('castor') },
    { k: 'bracket', en: HW.bracket.en, ar: HW.bracket.ar, qty: hwN('bracket') },
    { k: 'support', en: HW.support.en, ar: HW.support.ar, qty: hwN('support') },
    { k: 'glassClip', en: 'Glass retaining clip (4 per pane)', ar: 'مشبك تثبيت زجاج (٤ لكل لوح)', qty: panes * 4 },
    { k: 'minifix', en: 'Minifix connector (estimate)', ar: 'وصلة ميني فكس (تقدير)', qty: j.minifix },
    { k: 'dowel', en: 'Dowel 8x30 (estimate)', ar: 'خابور 8×30 (تقدير)', qty: j.dowel },
    { k: 'frameDowel', en: 'Frame dowel 8x40 (estimate)', ar: 'خابور إطار 8×40 (تقدير)', qty: j.frameDowel },
  ].filter((r) => r.qty > 0);
  return rows;
}

/* ---- warnings ---------------------------------------------------------------------------------------------------- */
export function buildWarnings(design, scene, solved = scene.solved) {
  const out = new Map(); const seen = new Set();
  const add = (id, en, ar, partIds = []) => { if (out.has(id) || seen.has(en)) return; seen.add(en); out.set(id, { id, en, ar, partIds }); };
  const nm = (id) => partName(design, getPart(design, id) || { id, type: 'panel', name: id });
  const nmAr = (id) => partName(design, getPart(design, id) || { id, type: 'panel', name: id }, 'ar');
  solved.warns.forEach((w) => add(w.id, w.en, w.ar, w.partId ? [w.partId] : []));
  if (!design.parts.some((p) => p.type !== 'group')) add('empty', 'There are no parts yet - add a panel, a leg or start from a template.', 'لا توجد أجزاء بعد - أضف لوحًا أو رجلًا أو ابدأ من قالب.');

  /* envelope + degenerate sizes */
  const R = solved.root; const tol = 0.5;
  solved.items.forEach((it) => {
    const p = it.part; if (p.type === 'group') return;
    const b = it.box;
    if (b.x0 < R.x0 - tol || b.x1 > R.x1 + tol || b.y0 < R.y0 - tol || b.y1 > R.y1 + tol || b.z0 < R.z0 - tol || b.z1 > R.z1 + tol) {
      add(`out-${it.base}`, `${nm(it.base)} reaches outside the overall ${R.x1} x ${R.y1} x ${R.z1} mm envelope - change its position or the overall size.`, `${nmAr(it.base)} يخرج عن الأبعاد الكلية ${R.x1} × ${R.y1} × ${R.z1} مم - غيّر موضعه أو الأبعاد الكلية.`, [it.base]);
    }
    const e = { x: b.x1 - b.x0, y: b.y1 - b.y0, z: b.z1 - b.z0 };
    if (e.x <= 0.01 || e.y <= 0.01 || e.z <= 0.01) add(`zero-${it.base}`, `${nm(it.base)} has a zero or negative size (${Math.round(e.x)} x ${Math.round(e.y)} x ${Math.round(e.z)} mm) - it cannot be cut.`, `${nmAr(it.base)} له مقاس صفري أو سالب - لا يمكن قصّه.`, [it.base]);
  });

  /* repeats whose copies overlap */
  design.parts.forEach((p) => {
    if (!p.rep || p.type === 'group') return;
    const its = solved.byBase.get(p.id); if (!its || !its.length) return;
    const k = p.rep.axis; const par = p.parent ? solved.byBase.get(p.parent) : null;
    const pb = par && par[0] ? par[0].box : R;
    const gap = repGap(p[k], pb[`${k}0`], pb[`${k}1`], p.rep.n, p.rep.mode);
    if (gap < -0.01) add(`repov-${p.id}`, `${nm(p.id)}: ${p.rep.n} copies do not fit along ${k.toUpperCase()} - they overlap by ${Math.round(-gap)} mm.`, `${nmAr(p.id)}: ${p.rep.n} نسخ لا تتسع على ${k.toUpperCase()} - تتداخل بمقدار ${Math.round(-gap)} مم.`, [p.id]);
  });

  /* collisions */
  overlaps(solved).slice(0, 12).forEach((o) => {
    add(`ov-${o.aBase}-${o.bBase}`, `${nm(o.aBase)} overlaps ${nm(o.bBase)} (${Math.round(o.x)} x ${Math.round(o.y)} x ${Math.round(o.z)} mm) - move one of them.`, `${nmAr(o.aBase)} يتداخل مع ${nmAr(o.bBase)} (${Math.round(o.x)} × ${Math.round(o.y)} × ${Math.round(o.z)} مم) - حرّك أحدهما.`, [o.aBase, o.bBase]);
  });

  /* floating parts */
  const held = supportedBases(solved);
  design.parts.forEach((p) => {
    if (!['panel', 'shelf', 'frame'].includes(p.type) || held.has(p.id)) return;
    add(`float-${p.id}`, `${nm(p.id)} does not touch any other part or the floor - it would be floating.`, `${nmAr(p.id)} لا يلمس أي جزء آخر أو الأرض - سيكون معلّقًا.`, [p.id]);
  });

  /* span / strength / size rules */
  scene.parts.forEach((p) => {
    const thin = Math.min(p.ext.w, p.ext.d, p.ext.h);
    const base = getPart(design, p.baseId);
    const horizontal = p.ext.h === thin && base && base.type === 'shelf'; // only a SHELF carries a load across a span; carcass tops / bottoms are held by the sides
    if (horizontal && Math.max(p.ext.w, p.ext.d) > 800 && thin >= 6 && thin <= 22) {
      const sp = Math.max(p.ext.w, p.ext.d);
      add(`sag-${p.baseId}`, `${p.name} spans ${Math.round(sp)} mm in ${Math.round(thin)} mm board - it may sag: add a support or use thicker board.`, `${p.nameAr} بطول ${Math.round(sp)} مم من لوح ${Math.round(thin)} مم - قد ينحني: أضف دعامة أو لوحًا أسمك.`, [p.baseId]);
    }
    if (p.kind === 'door' && p.anim && p.anim.k === 'door' && p.ext.w > 600) add(`door-wide-${p.baseId}`, `${p.name} is ${Math.round(p.ext.w)} mm wide - a single door that wide is heavy: consider two leaves.`, `${p.nameAr} بعرض ${Math.round(p.ext.w)} مم - باب مفرد بهذا العرض ثقيل: فكّر في بابين.`, [p.baseId]);
    if (p.kind === 'drawerBox' && /box front$/.test(p.name) && (p.ext.w < 100 || p.ext.h < 60)) add(`drawer-small-${p.baseId}`, `${p.name.replace(/ box front$/, '')} is too small for a drawer box (${Math.round(p.ext.w)} x ${Math.round(p.ext.h)} mm).`, `${p.nameAr} صغير جدًا لصندوق درج.`, [p.baseId]);
  });
  return [...out.values()];
}

export { numbering };
