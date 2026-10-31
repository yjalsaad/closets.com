/* =============================================================================
 * Neo Kitchen Designer - cut list (BOM), hardware, warnings, panel drilling.
 * Everything is derived from buildScene() so it always agrees with the views.
 * Column convention follows the reference tool: W = extent along the run (u),
 * D = depth, H = height.
 * AREA CONVENTION (one, used by the cards, the metrics, the table, CSV, JSON and DXF): the area of a
 * row = qty x (largest face of the cut part) in m2; the largest face is the product of the two largest
 * dimensions of the panel (see planeAxes). Board m2 = the sum of the row areas.
 * ===========================================================================*/
import { BOARD, BOARD_ORDER, MFG, MAT_SLOTS, FIELD } from './constants';
import { matSlots, canonMats } from './materials';
import { isTall, rowWidth, isExtraRun, xlRunKey } from './model';
import { elevationItems, RUN_PREFIX } from './geometry';
import { layoutIssues, bracketCount } from './layoutRules';

const AX = { u: 'w', d: 'd', y: 'h' };
const AXNAME = { u: 'W', d: 'D', y: 'H' };

/** the two largest axes = the sheet plane; [L axis, W axis, T axis] */
export function planeAxes(ext) {
  const a = [['u', ext.w], ['d', ext.d], ['y', ext.h]].sort((x, y) => y[1] - x[1] || 0);
  return [a[0][0], a[1][0], a[2][0]];
}

/** every manufactured panel (incl. worktop, splash, plinth) as BOM entries */
export function collectPanels(scene) {
  const { g } = scene.model;
  const panels = scene.parts.map((p) => ({ ...p }));
  scene.runs.forEach((r) => {
    const G = r.key === 'main' ? '' : r.label + ' ';
    r.counters.forEach((c, i) => {
      const notes = c.cutouts.map((x) => `${x.name || (x.type === 'sink' ? 'Sink' : 'Hob')} cut-out ${Math.round(x.w)} x ${x.d} @ ${Math.round(x.cu - c.u0)} from left${x.hint ? ' (hint, indicative)' : ''}`).join('; ');
      panels.push({ id: `${r.key}:ct${i}`, runKey: r.key, row: 'base', group: `${G}Countertop`, name: `Countertop ${i + 1}`, kind: 'counter', mat: 'Countertop', qty: 1, grain: 'auto', note: notes, edges: [{ axis: 'u', where: 'front' }],
        box: { u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, d0: c.d0 || 0, d1: c.d1 }, ext: { w: Math.round(c.u1 - c.u0), d: Math.round(c.d1 - (c.d0 || 0)), h: c.y1 - c.y0 }, plain: true, cutRects: c.cutouts });
    });
    r.splashes.forEach((c, i) => panels.push({ id: `${r.key}:bs${i}`, runKey: r.key, row: 'base', group: `${G}Countertop`, name: `Backsplash ${i + 1}`, kind: 'splash', mat: 'Countertop', qty: 1, grain: 'auto', note: '', edges: [{ axis: 'u', where: 'top' }],
      box: { u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, d0: 0, d1: c.d1 }, ext: { w: Math.round(c.u1 - c.u0), d: c.d1, h: Math.round(c.y1 - c.y0) }, plain: true }));
    if (r.plinth && r.plinth.u1 > r.plinth.u0) {
      const pl = r.plinth;
      panels.push({ id: `${r.key}:pl`, runKey: r.key, row: 'base', group: `${G}Plinth`, name: 'Plinth', kind: 'plinth', mat: 'Plinth', qty: 1, grain: 'auto', note: `Setback ${g.plinthSetback} mm`, edges: [{ axis: 'u', where: 'top' }],
        box: { u0: pl.u0, u1: pl.u1, y0: pl.y0, y1: pl.y1, d0: pl.d0, d1: pl.d1 }, ext: { w: Math.round(pl.u1 - pl.u0), d: g.board, h: pl.y1 - pl.y0 }, plain: true });
    }
  });
  return panels;
}

function analyse(p, model) {
  const ext = p.ext;
  const [aL, aW, aT] = planeAxes(ext);
  const L = ext[AX[aL]], W = ext[AX[aW]], T = ext[AX[aT]];
  let nLong = 0, nShort = 0, edgeLen = 0;
  (p.edges || []).forEach((e) => {
    const cnt = e.where === 'both' ? 2 : 1;
    if (e.axis === aL) { nLong += cnt; edgeLen += L * cnt; } else if (e.axis === aW) { nShort += cnt; edgeLen += W * cnt; }
  });
  const eb = model.g.edgeBand;
  const cut = { L: Math.round((L - eb * nShort) * 10) / 10, W: Math.round((W - eb * nLong) * 10) / 10, T };
  // grain
  let grainKind = p.kind;
  let pref = model.grain[grainKind === 'splash' ? 'counter' : grainKind === 'glass' ? 'door' : grainKind] || 'N';
  if ((p.kind === 'door' || p.kind === 'drawerFront') && p.grainFront && p.grainFront !== 'auto') pref = p.grainFront;
  let grain = '-';
  if (pref !== 'N' && p.mat !== 'Glass') {
    const gx = pref === 'V' ? 'y' : 'u';
    grain = gx === aL ? 'L' : gx === aW ? 'W' : 'L';
  }
  const codes = [];
  for (let i = 1; i <= Math.min(2, nLong); i++) codes.push(`L${i}`);
  for (let i = 1; i <= Math.min(2, nShort); i++) codes.push(`W${i}`);
  return { L, W, T, cut, grain, edgeStr: codes.join('·'), edgeLen: edgeLen / 1000 };
}

const dispName = (p) => (/^S\d/.test(p.name) ? `${p.group} ${p.name}` : `${p.group} - ${p.name}`);

/** per-run nominal module sizes (what the designer typed) - NOT the cut sizes in the table */
export function nominalSizes(model) {
  const xrk = xlRunKey(model);
  return Object.keys(model.runs).filter((k) => !isExtraRun(k) || k === xrk).map((k) => { // UX29: a stored run 2 / peninsula / island that the layout no longer uses is not nominal
    const run = model.runs[k];
    return { key: k, base: rowWidth(run.base), wall: rowWidth(run.wall), top: rowWidth(run.top), units: run.base.length + run.wall.length + run.top.length };
  }).filter((r) => r.units > 0);
}

export function buildBOM(scene) {
  const model = scene.model;
  const panels = collectPanels(scene);
  const map = new Map();
  // elevation numbering for the Map column
  const mapNos = {};
  scene.runs.forEach((r) => {
    elevationItems(scene, r.key).forEach((it) => { if (it.partId) (mapNos[it.partId] = mapNos[it.partId] || []).push(`${RUN_PREFIX[r.key] || ''}${it.no}`); });
  });
  const mats = canonMats(model.mats); // "same name = same material": names equal ignoring case / spacing share one spelling
  panels.forEach((p) => {
    const a = analyse(p, model);
    const named = matSlots(p).map((k) => mats[k]).find(Boolean) || '';
    const key = [dispName(p), p.ext.w, p.ext.d, p.ext.h, p.mat, named, a.grain, a.edgeStr, p.ledGroove ? `led${p.ledGroove.w}@${p.ledGroove.off}` : ''].join('|');
    let row = map.get(key);
    if (!row) {
      row = { key, name: dispName(p), group: p.group, w: Math.round(p.ext.w * 10) / 10, d: Math.round(p.ext.d * 10) / 10, h: Math.round(p.ext.h * 10) / 10, qty: 0, mat: p.mat, matName: named || BOARD[p.mat].en, grain: a.grain, edges: a.edgeStr, edgeLen: a.edgeLen, cut: a.cut, area: 0, note: p.note || '', kind: p.kind, ptype: p.ptype, rep: p, maps: [], unitIds: new Set() };
      map.set(key, row);
    }
    row.qty += p.qty === undefined ? 1 : p.qty;
    /* from the same 0.1 mm-rounded sizes the table prints, so qty x size x size always reproduces the m2 column */
    row.area += ((Math.round(a.L * 10) / 10) * (Math.round(a.W * 10) / 10) / 1e6) * (p.qty === undefined ? 1 : p.qty);
    if (mapNos[p.id]) row.maps.push(...mapNos[p.id]);
    if (p.unitId) row.unitIds.add(p.unitId);
  });
  const firstIdx = new Map(); [...map.values()].forEach((r, i) => { if (!firstIdx.has(r.group)) firstIdx.set(r.group, i); });
  const ordered = [...map.values()].map((r, i) => ({ r, i })).sort((a, b) => firstIdx.get(a.r.group) - firstIdx.get(b.r.group) || a.i - b.i).map((x) => x.r);
  const rows = ordered.map((r, i) => ({ ...r, no: i + 1, area: Math.round(r.area * 1e6) / 1e6, maps: [...new Set(r.maps)], unitIds: [...r.unitIds] }));
  const pieces = rows.reduce((s, r) => s + r.qty, 0);
  const boardArea = rows.reduce((s, r) => s + r.area, 0);
  const cards = BOARD_ORDER.map((k) => {
    const rs = rows.filter((r) => r.mat === k);
    return { k, pcs: rs.reduce((s, r) => s + r.qty, 0), m2: rs.reduce((s, r) => s + r.area, 0) };
  }).filter((c) => c.pcs);
  const named = {};
  rows.forEach((r) => { const k = r.matName; if (!named[k]) named[k] = { pcs: 0, m2: 0 }; named[k].pcs += r.qty; named[k].m2 += r.area; });
  const edgeMetres = rows.reduce((s, r) => s + r.edgeLen * r.qty, 0);
  return { rows, pieces, boardArea, unique: rows.length, cards, named, edgeMetres, nominal: nominalSizes(model) };
}

/* ---- feet (adjustable legs) under the plinth ------------------------------- */
export function feetPositions(scene) {
  const g = scene.model.g;
  const out = [];
  if (scene.noFeet) return out; // a wall-hung / floating unit (NEO-CATEGORIES-UX26) stands on nothing: no adjustable legs, no leg hardware
  scene.runs.forEach((r) => r.units.filter((x) => x.row === 'base' && !x.noFeet).forEach((x) => { // x.noFeet: a unit that stands on the floor without legs (a machine niche, a desk module) - NEO-CATEGORIES-UX26
    [x.fu0 + 60, x.fu0 + x.W - 60].forEach((u) => [60, x.D - g.plinthSetback - 60].forEach((d) => out.push({ runKey: r.key, u, d })));
  }));
  return out;
}

/* ---- hardware ---------------------------------------------------------------- */
export function buildHardware(scene) {
  const m = scene.model;
  const adjShelves = scene.parts.filter((p) => p.kind === 'shelf' && !p.fixed).length;
  const hingesN = scene.hinges.filter((h) => !h.flip).length;
  const flipN = scene.hinges.filter((h) => h.flip).length;
  const flipDoors = scene.parts.filter((p) => p.anim && p.anim.k === 'flip').length;
  const hs = { bar: 0, knob: 0, profile: 0 };
  scene.handles.forEach((h) => { hs[h.style] = (hs[h.style] || 0) + 1; });
  const cnt = (t) => scene.joints.filter((j) => j.type === t).length;
  const feet = feetPositions(scene).length;
  const sinks = scene.cutouts.filter((c) => c.type === 'sink').length;
  const hobs = scene.cutouts.filter((c) => c.type === 'hob').length;
  const rows = [
    { k: 'hinge', en: 'Hinge ( cup Ø' + m.g.hingeCup + ')', ar: 'مفصلة (كوب Ø' + m.g.hingeCup + ')', qty: hingesN },
    { k: 'plate', en: 'Hinge mounting plate', ar: 'قاعدة مفصلة', qty: hingesN },
    { k: 'flipHinge', en: 'Flip-up fitting', ar: 'مفصلة قلاب', qty: flipN },
    { k: 'liftStay', en: 'Lift stay', ar: 'ذراع رفع', qty: flipDoors * 2 },
    { k: 'runner', en: 'Soft-close runner (pair)', ar: 'سكة درج (زوج)', qty: scene.hardwareExtra.runners },
    { k: 'handleBar', en: `Bar handle ${m.handle.len} mm`, ar: `مقبض شريط ${m.handle.len} مم`, qty: hs.bar },
    { k: 'handleKnob', en: 'Knob', ar: 'مقبض كرة', qty: hs.knob },
    { k: 'handleProfile', en: 'Profile handle', ar: 'مقبض بروفايل', qty: hs.profile },
    { k: 'pin', en: 'Shelf pin Ø5', ar: 'مسمار رف Ø5', qty: adjShelves * 4 },
    { k: 'minifix', en: 'Minifix connector', ar: 'وصلة ميني فكس', qty: cnt('minifix') },
    { k: 'cam', en: 'Cam lock', ar: 'قفل كام', qty: cnt('cam') },
    { k: 'dowel', en: 'Dowel 8x30', ar: 'خابور 8×30', qty: cnt('dowel') },
    { k: 'leg', en: 'Adjustable plinth leg', ar: 'رجل قاعدة قابلة للضبط', qty: feet },
    { k: 'pole', en: 'Carousel pole set', ar: 'عمود ركن دوّار', qty: scene.hardwareExtra.poles },
    { k: 'bracket', en: 'Worktop bracket (seating overhang)', ar: 'كابولي سطح (بروز الجلوس)', qty: bracketCount(scene) },
    { k: 'sink', en: 'Sink cut-out (labour)', ar: 'فتحة حوض (عمل)', qty: sinks },
    { k: 'hob', en: 'Hob cut-out (labour)', ar: 'فتحة موقد (عمل)', qty: hobs },
  ].filter((r) => r.qty > 0);
  return rows;
}

/* ---- warnings (deduplicated) -------------------------------------------------- */
export function buildWarnings(scene) {
  const m = scene.model;
  const out = new Map();
  const seen = new Set();
  /* de-duplicated twice: by id and by the visible text, so two rules can never print the same sentence */
  const add = (id, en, ar) => { if (out.has(id) || seen.has(en)) return; seen.add(en); out.set(id, { id, en, ar }); };
  scene.runs.forEach((r) => {
    const run = m.runs[r.key];
    const nonTall = run.base.filter((u) => !isTall(u)).reduce((s, u) => s + u.w, 0);
    const wall = rowWidth(run.wall);
    const nm = r.key === 'main' ? '' : `${r.label}: `;
    if (run.wall.length && Math.abs(nonTall - wall) > 0.5) {
      add(`flush-${r.key}-${nonTall}-${wall}`, `${nm}Base run (${nonTall} mm) and wall run (${wall} mm) differ - rows will not align flush.`, `${nm}صف السفلي (${nonTall} مم) والعلوي (${wall} مم) غير متطابقين - لن يتحاذيا.`);
    }
    if (r.hiddenBase > 0) {
      const first = run.base[0];
      if (first && first.w <= m.g.baseD + 100) add(`corner-${r.key}`, `${nm}unit 01 sits in the corner - its first ${m.g.baseD} mm (base depth) is hidden behind the main run, so make it wider than ${m.g.baseD + 100} mm.`, `${nm}الوحدة ١ في الزاوية - أول ${m.g.baseD} مم مخفية خلف الصف الرئيسي، اجعلها أعرض من ${m.g.baseD + 100} مم.`);
    }
  });
  layoutIssues(m).forEach((w) => add(w.id, w.en, w.ar)); // UX29: aisle / clearance / seating / minimum-length rules (nothing for Single wall / L)
  scene.runs.forEach((r) => r.units.forEach((x) => {
    if (x.row === 'base' && !isTall(x.unit) && x.unit.type === 'normal' && x.unit.w > 900) add(`wide-${x.unit.id}`, `${x.label} is ${x.unit.w} mm wide - add a centre divider.`, `${x.label} بعرض ${x.unit.w} مم - أضف فاصلًا أوسط.`);
  }));
  scene.parts.forEach((p) => {
    if (p.kind === 'shelf' && p.ext.w > 800 && !p.round) add(`shelf-${Math.round(p.ext.w)}-${m.g.shelfThk}`, `Shelves ${Math.round(p.ext.w)} mm long in ${m.g.shelfThk} mm board may sag - add a support or use thicker board.`, `رفوف بطول ${Math.round(p.ext.w)} مم قد تنحني - أضف دعامة أو لوحًا أسمك.`);
    if (p.kind === 'door' && p.anim && p.anim.k === 'door' && p.ext.w > 600) add(`door-wide-${Math.round(p.ext.w)}`, `A single door ${Math.round(p.ext.w)} mm wide is heavy - consider two leaves.`, `باب مفرد بعرض ${Math.round(p.ext.w)} مم ثقيل - فكّر في بابين.`);
  });
  scene.warns.forEach((w) => add(`niche-${w.label}`, `${w.label}: ${w.type} niche needs ${w.need} mm, only ${w.have} mm available.`, `${w.label}: فتحة ${w.type} تحتاج ${w.need} مم والمتاح ${w.have} مم.`));
  if (m.g.backsplashH > m.g.gap) add('splash', 'Backsplash is taller than the counter-to-wall gap.', 'الباكسبلاش أطول من الفراغ بين السطح والخزائن.');
  ['left', 'right'].forEach((s) => {
    const lg = m.legs[s];
    if (lg.on && !lg.matchH && lg.height < m.g.plinthH + m.g.baseH + m.g.counterThk + m.g.gap + FIELD.wallH.min) add(`legh-${s}`, `${s} leg: height ${lg.height} mm is below plinth+base+counter+gap+400 - wall row raised to its 400 mm minimum.`, `الرجل ${s}: الارتفاع ${lg.height} مم أقل من المطلوب - رُفع الصف العلوي لحده الأدنى.`);
  });
  /* missing / out-of-range parameters */
  Object.keys(FIELD).forEach((k) => {
    const f = FIELD[k], v = m.g[k];
    if (v === undefined || v === null || v === '' || !Number.isFinite(Number(v))) add(`param-${k}`, `Missing parameter: ${f.en}. Set a value between ${f.min} and ${f.max} mm.`, `معامل مفقود: ${f.ar}. أدخل قيمة بين ${f.min} و${f.max} مم.`);
    else if (Number(v) < f.min || Number(v) > f.max) add(`param-${k}`, `${f.en} is ${v} mm, outside the allowed ${f.min}-${f.max} mm.`, `${f.ar} ${v} مم خارج المدى ${f.min}-${f.max} مم.`);
  });
  /* invalid / zero dimensions in the generated parts */
  collectPanels(scene).forEach((p) => {
    const e = p.ext || {};
    if (['w', 'd', 'h'].some((a) => !Number.isFinite(e[a]) || e[a] <= 0)) {
      const nm = dispName(p);
      add(`dim-${nm}`, `${nm} has a zero or invalid dimension (${['w', 'd', 'h'].map((a) => (Number.isFinite(e[a]) ? e[a] : 'NaN')).join(' x ')} mm) - it cannot be cut.`, `${nm} له بُعد صفري أو غير صالح - لا يمكن قصّه.`);
    }
  });
  void MFG; void MAT_SLOTS;
  return [...out.values()];
}

/* ---- per-panel drilling (CNC) in panel coordinates ----------------------------- */
export function panelDrill(scene, p) {
  const g = scene.model.g;
  const [aL, aW] = planeAxes(p.ext);
  const b = p.box;
  const min = { u: b.u0, y: b.y0, d: b.d0 };
  const circles = [], lines = [];
  const to = (pt) => [pt[aL] - min[aL], pt[aW] - min[aW]];
  const C = (type, u, y, d, r) => { const [x, yy] = to({ u, y, d }); circles.push({ type, x, y: yy, r }); };
  if (p.kind === 'door' || p.kind === 'drawerFront' || p.kind === 'glass') {
    scene.hinges.filter((h) => h.partId === p.id).forEach((h) => C('cup', h.u, h.y, b.d0, h.r));
    scene.handles.filter((h) => h.partId === p.id).forEach((h) => h.holes.forEach((pt) => C('handle', pt[0], pt[1], b.d0, 2.5)));
  }
  if (p.kind === 'side') {
    const right = !!p.sideR;
    scene.pins.filter((q) => q.unitId === p.unitId && q.side === (right ? 'R' : 'L')).forEach((q) => C('pin', right ? b.u0 : b.u1, q.y, q.d, MFG.pinR));
    scene.hinges.filter((h) => h.unitId === p.unitId && !h.flip && ((h.side === 'L' && !right) || (h.side === 'R' && right))).forEach((h) => {
      [-16, 16].forEach((dy) => C('plate', right ? b.u0 : b.u1, h.y + dy, p.box.d1 - MFG.pinEdge, 2.5));
    });
    // back groove (two lines along the height)
    [g.inset, g.inset + g.back].forEach((d) => { const a = to({ u: b.u0, y: b.y0, d }), c = to({ u: b.u0, y: b.y1, d }); lines.push({ type: 'groove', x1: a[0], y1: a[1], x2: c[0], y2: c[1] }); });
  }
  if (p.kind === 'bottom' || p.kind === 'top') {
    [g.inset, g.inset + g.back].forEach((d) => { const a = to({ u: b.u0, y: b.y0, d }), c = to({ u: b.u1, y: b.y0, d }); lines.push({ type: 'groove', x1: a[0], y1: a[1], x2: c[0], y2: c[1] }); });
  }
  if (p.kind === 'counter') {
    (p.cutRects || []).forEach((c) => {
      const q = [[c.u0, c.d0], [c.u1, c.d0], [c.u1, c.d1], [c.u0, c.d1]].map(([u, d]) => to({ u, y: 0, d }));
      for (let i = 0; i < 4; i++) lines.push({ type: 'cutout', x1: q[i][0], y1: q[i][1], x2: q[(i + 1) % 4][0], y2: q[(i + 1) % 4][1] });
    });
  }
  return { circles, lines, L: p.ext[AX[aL]], W: p.ext[AX[aW]], axes: [AXNAME[aL], AXNAME[aW]] };
}

/* ---- Arabic display names for the BOM (the data stays English so CSV / DXF / tests are stable) ---- */
const AR_PARTS = [
  [/inner front/g, 'واجهة داخلية'], [/\(inset\)/g, '(غائرة)'], // NEO-CLOSETS-UX30: drawers inside a wardrobe column
  [/L-Left/g, 'L يسار'], [/L-Right/g, 'L يمين'], [/Run 2/g, 'صف ٢'], [/Peninsula/g, 'جزيرة ممتدة'], [/Island/g, 'جزيرة'], [/Finished end panel/g, 'لوح نهاية مشطّب'], [/Finished back panel/g, 'لوح ظهر مشطّب'], [/Glass frame stile/g, 'قائم إطار الزجاج'], [/Glass frame bar/g, 'قضيب إطار الزجاج'], [/Smoked glass panel/g, 'لوح زجاج مدخّن'], [/Return wing/g, 'الجناح الجانبي'], [/Glass frame rail/g, 'عارضة إطار الزجاج'], [/Glass panel/g, 'لوح زجاج'], [/Glass door/g, 'باب زجاج'],
  [/Bi-fold door/g, 'باب مطوي'], [/Flip-up door/g, 'باب قلاب'], [/Bottom cover/g, 'غطاء سفلي'], [/Cover panel/g, 'لوح تغطية'], [/Blind panel/g, 'لوح أعمى'], [/Diagonal door/g, 'باب قطري'], [/Carousel shelf/g, 'رف دوّار'],
  [/Top stretcher \(front\)/g, 'رباط علوي (أمامي)'], [/Top stretcher \(rear\)/g, 'رباط علوي (خلفي)'], [/Drawer front/g, 'واجهة درج'], [/Drawer side/g, 'جانب درج'], [/box front/g, 'أمام الصندوق'], [/box back/g, 'خلف الصندوق'],
  [/\bDrawer\b/g, 'درج'], [/\bbottom\b/g, 'قاع'], [/\bTall\b/g, 'طويل'], [/\bBase\b/g, 'سفلي'], [/\bWall\b/g, 'علوي'], [/\bTop\b/g, 'ثالث'], [/\bSide\b/g, 'جانب'], [/\bBottom\b/g, 'قاعدة'],
  [/\bWardrobe\b/g, 'خزانة'], [/\bColumn\b/g, 'عمود'], [/\bBack\b/g, 'ظهر'], [/\bDivider\b/g, 'فاصل'], [/\bDoor\b/g, 'باب'], [/\bShelf\b/g, 'رف'], [/Countertop/g, 'سطح العمل'], [/Backsplash/g, 'باكسبلاش'], [/\bPlinth\b/g, 'القاعدة'], [/\bS(\d)\b/g, 'ق$1'],
];
/** Arabic wording a product registers for its own part names / notes (NEO-CATEGORIES-UX26). Applied BEFORE the built-in list, so a longer phrase wins ("Mirror panel"). */
const AR_EXTRA = []; const AR_EXTRA_NOTES = [];
export function registerArabicNames(list) { list.forEach(([re, t]) => { if (!AR_EXTRA.some(([r]) => r.source === re.source)) AR_EXTRA.push([re, t]); }); }
export function registerArabicNotes(list) { list.forEach(([re, t]) => { if (!AR_EXTRA_NOTES.some(([r]) => r.source === re.source)) AR_EXTRA_NOTES.push([re, t]); }); }
export function partNameAr(name) { return [...AR_EXTRA, ...AR_PARTS].reduce((s, [re, t]) => s.replace(re, t), name); }
/** English display form of a machining note: real multiplication sign and em dash (data stays ASCII) */
export function noteEn(note) {
  return String(note || '').replace(/(\d) x (\d)/g, '$1 × $2').replace(/(\d)mm wide x (\d)/g, '$1mm wide × $2').replace(/ - back edge/, ' — back edge').replace(/ - underside, front edge/, ' — underside, from the front edge');
}
export function noteAr(note) {
  return AR_EXTRA_NOTES.reduce((s, [re, t]) => s.replace(re, t), String(note || ''))
    .replace(/Rabbet groove: (\d+)mm wide x (\d+)mm deep @ (\d+)mm - back edge/, 'مجرى الظهر: عرض $1 مم × عمق $2 مم عند $3 مم - الحافة الخلفية')
    .replace(/Bottom groove: (\d+)mm wide x (\d+)mm deep @ (\d+)mm above the box edge/, 'مجرى القاع: عرض $1 مم × عمق $2 مم عند $3 مم فوق حافة الصندوق')
    .replace(/LED groove: (\d+)mm wide x (\d+)mm deep @ (\d+)mm - underside, front edge/, 'مجرى LED: عرض $1 مم × عمق $2 مم عند $3 مم - الوجه السفلي، من الحافة الأمامية')
    .replace(/Setback (\d+) mm/, 'تراجع $1 مم').replace(/Sink cut-out/g, 'فتحة حوض').replace(/Hob cut-out/g, 'فتحة موقد').replace(/from left/g, 'من اليسار').replace(/\(hint, indicative\)/g, '(تلميح، تقريبي)');
}
