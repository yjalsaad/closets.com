/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - cut list (BOM), hardware list, weight and warnings. Pure.
 * The BOM is the PARTS list of doorGeometry.js grouped by (group, name, cut size, material, note): quantity = the number of physical pieces.
 * Sizes are cut sizes in millimetres: L along the grain, W across it, T the thickness. Mitred pieces are given at the long point,
 * rails and muntins include their tenons. Glass includes the rebate on every side.
 * ===========================================================================*/
import { C, construction } from './doorModel';
import { MAT, SHEET, STOCK_LEN, TIMBER_DENS, volumeM3, HINGE_CAP, autoHinges, cellKind } from './doorGeometry';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const GROUP_ORDER = ['Leaf', 'Glazing', 'Frame', 'Architrave'];
export const GROUP_NAME = { Leaf: ['Leaf', 'الضلفة'], Glazing: ['Glazing', 'الزجاج'], Frame: ['Frame', 'الحلق'], Architrave: ['Architrave', 'الكورنيش'] };
export const SHEET_YIELD = 0.8; // share of a sheet that ends up in parts (the rest is kerf and offcuts)

export function matName(d, mat, lang) {
  const m = MAT[mat]; if (!m) return mat;
  if (mat === 'timber' || mat === 'frame') {
    const h = d.leaf.timber === 'hardwood';
    const fr = mat === 'frame';
    return lang === 'ar' ? `${fr ? 'خشب الحلق' : 'خشب'} ${h ? 'صلب' : 'لين'}` : `${fr ? 'Frame timber' : (h ? 'Hardwood' : 'Softwood')}${fr ? ` (${h ? 'hardwood' : 'softwood'})` : ''}`;
  }
  return m[lang === 'ar' ? 'ar' : 'en'];
}

const AR_WORD = { ogee: 'أوجي', bead: 'خرزة', bevel: 'مشطوف', square: 'مربع', raised: 'بارز', flat: 'مسطح', shaker: 'شيكر', bolection: 'بولكشن', chamfer: 'شطف', rebated: 'بشق', bullnose: 'مدور', toughened: 'مقسّى', laminated: 'مُلصّق', clear: 'شفاف', frosted: 'مصنفر', smoked: 'مدخن', none: 'بدون' };
const aw = (w) => AR_WORD[w] || w;
/** the Arabic wording of the notes the engine writes (cut-list rows and the hardware list); unknown text is returned as it is */
export function noteAr(note) {
  return String(note || '')
    .replace(/tenons (\d+) mm each end/, 'ألسنة $1 مم من كل طرف')
    .replace(/(\w+) profile, (\d+) mm into the grooves/, (m, a, b) => `شكل ${aw(a)}، ${b} مم داخل الحزوز`)
    .replace(/(\w+) profile, mitred, reveal (\d+) mm/, (m, a, b) => `شكل ${aw(a)}، مائل، تراجع ${b} مم`)
    .replace(/(\w+) profile, mitred/, (m, a) => `شكل ${aw(a)}، مائل`)
    .replace(/tilted (\d+) deg, (\d+) mm into the stiles/, 'ميل $1 درجة، $2 مم داخل الأضلاع')
    .replace(/(\w+) (\w+) glass, (\d+) mm rebate each side/, (m, a, b, c) => `زجاج ${aw(a)} ${aw(b)}، شق ${c} مم من كل جانب`)
    .replace(/(\w+) safety glass/, (m, a) => `زجاج أمان ${aw(a)}`)
    .replace(/mitred, fixed on the inside face/, 'مائل، مثبت على الوجه الداخلي')
    .replace(/cut-outs: vision panel \/ grille/, 'فتحات: رؤية / شبكة')
    .replace(/integral stop, rebate (\d+) mm/, 'مصد مدمج، شق $1 مم')
    .replace(/ramped 1:6 both edges/, 'منحدرة 1:6 على الحافتين').replace(/^flat$/, 'مسطحة')
    .replace(/(\d+) per leaf/, '$1 لكل ضلفة').replace(/on the passive leaf/, 'على الضلفة الثابتة').replace(/around the leaf, in the frame/, 'حول الضلفة وفي الحلق')
    .replace(/case (\d+) x (\d+) mm/, 'علبة $1 × $2 مم').replace(/track (\d+) mm/, 'السكة $1 مم').replace(/8 fixings: 3 per jamb, 2 in the head/, '8 تثبيتات: 3 لكل جانب و2 في الرأس');
}

export function buildBOM(parts, d) {
  const rows = []; const by = new Map();
  parts.filter((p) => p.bom).forEach((p) => {
    const key = [p.group, p.name, p.cut.L, p.cut.W, p.cut.T, p.mat].join('|');
    let r = by.get(key);
    if (!r) {
      r = { key, group: p.group, name: p.name, ar: p.ar, mat: p.mat, matName: matName(d, p.mat, 'en'), matAr: matName(d, p.mat, 'ar'), L: r1(p.cut.L), W: r1(p.cut.W), T: r1(p.cut.T), qty: 0, grain: p.grain || '-', note: p.note || '', ids: [], glassKind: p.glassKind || null };
      by.set(key, r); rows.push(r);
    }
    if (!r.note && p.note) r.note = p.note;
    r.qty += p.qty; r.ids.push(p.id);
  });
  rows.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  rows.forEach((r, i) => { r.no = i + 1; r.areaEach = (r.L * r.W) / 1e6; r.area = r.areaEach * r.qty; r.vol = (r.L * r.W * r.T * r.qty) / 1e9; r.lengthM = (r.L * r.qty) / 1000; });
  const no = new Map(); rows.forEach((r) => r.ids.forEach((id) => no.set(id, r.no)));
  parts.forEach((p) => { if (no.has(p.id)) p.no = no.get(p.id); });
  /* per material cards: pieces, m2 of the largest face, m3, and the stock needed (sheets of 2440 x 1220, or 3 m lengths) */
  const cards = [];
  rows.forEach((r) => {
    let c = cards.find((x) => x.mat === r.mat);
    if (!c) { c = { mat: r.mat, matName: r.matName, matAr: r.matAr, pcs: 0, m2: 0, m3: 0, lm: 0, sheet: !!MAT[r.mat].sheet }; cards.push(c); }
    c.pcs += r.qty; c.m2 += r.area; c.m3 += r.vol; c.lm += r.lengthM;
  });
  cards.forEach((c) => {
    c.m2 = r2(c.m2); c.m3 = Math.round(c.m3 * 10000) / 10000; c.lm = r2(c.lm);
    if (c.sheet) c.stock = { kind: 'sheet', n: Math.ceil(c.m2 / ((SHEET[0] * SHEET[1] / 1e6) * SHEET_YIELD) - 1e-9), size: `${SHEET[0]} x ${SHEET[1]}` };
    else if (c.mat === 'glass') c.stock = { kind: 'glass', n: c.pcs, size: 'cut to size' };
    else c.stock = { kind: 'length', n: Math.ceil(c.lm / ((STOCK_LEN / 1000) * 0.9) - 1e-9), size: `${STOCK_LEN} mm lengths` };
  });
  const pieces = rows.reduce((s, r) => s + r.qty, 0);
  return { rows, cards, pieces, unique: rows.length, boardArea: r2(rows.filter((r) => MAT[r.mat].sheet).reduce((s, r) => s + r.area, 0)), glassArea: r2(rows.filter((r) => r.mat === 'glass').reduce((s, r) => s + r.area, 0)), timberM3: Math.round(rows.filter((r) => r.mat === 'timber' || r.mat === 'frame').reduce((s, r) => s + r.vol, 0) * 10000) / 10000 };
}

/** kg of one leaf / of the whole leaf set (volume x density of its parts; hardware excluded) */
export function weights(parts, d, leafCount) {
  const dens = (p) => (p.mat === 'timber' ? TIMBER_DENS[d.leaf.timber] : (MAT[p.mat] ? MAT[p.mat].dens : 600));
  const per = [];
  for (let i = 0; i < leafCount; i++) per.push(r1(parts.filter((p) => p.leaf === i && p.bom).reduce((s, p) => s + p.boxes.reduce((t, b) => t + volumeM3(b), 0) * dens(p), 0)));
  return per;
}

export function buildHardware(d, G) {
  const S = G.S; const out = []; const n = S.n;
  const add = (k, en, ar, qty, unit, note) => { if (qty > 0) out.push({ k, en, ar, qty, unit: unit || 'pc', note: note || '' }); };
  if (!S.slides) {
    const ty = { butt: ['Butt hinge', 'مفصلة عادية'], ball: ['Ball-bearing hinge', 'مفصلة بلي'], concealed: ['Concealed hinge', 'مفصلة مخفية'], pivot: ['Pivot set (top + bottom)', 'محور دوران (علوي + سفلي)'] }[d.hinges.type];
    add('hinge', `${ty[0]} ${d.hinges.type === 'pivot' ? '' : `${d.hinges.len} mm`}`.trim(), ty[1], d.hinges.type === 'pivot' ? n : G.hingeCount * n, d.hinges.type === 'pivot' ? 'set' : 'pc', `${G.hingeCount} per leaf`);
  }
  if (d.lock.on) {
    add('lock', `Mortice lock case, ${d.lock.backset} mm backset`, `علبة قفل مرتيس، باكست ${d.lock.backset} مم`, 1, 'pc', `case ${C.CASE_H} x ${C.CASE_T} mm`);
    if (d.lock.cyl) add('cyl', 'Euro profile cylinder', 'سلندر يورو', 1);
    const h = { lever: ['Lever handle set (pair)', 'طقم مقبض ذراع (زوج)'], knob: ['Knob set (pair)', 'طقم كرة (زوج)'], pull: ['Pull handle set (pair)', 'طقم مقبض سحب (زوج)'], none: null }[d.lock.handle];
    if (h) add('handle', h[0], h[1], 1, 'set');
    add('strike', 'Strike plate', 'لوحة استقبال', 1);
  }
  if (S.double) add('bolt', 'Flush bolt (top + bottom)', 'مزلاج مخفي (علوي + سفلي)', 1, 'set', 'on the passive leaf');
  if (d.fire.rating !== 'none') {
    add('closer', 'Overhead door closer (EN 1154)', 'ذراع إغلاق علوي (EN 1154)', 1);
    add('sign', 'Fire door "keep shut" sign', 'لافتة باب حريق "أبقِه مغلقًا"', n, 'pc');
    add('seal', 'Intumescent + smoke seal', 'شريط منتفخ + مانع دخان', r2((n * (2 * S.leafH + S.leafW)) / 1000), 'm', 'around the leaf, in the frame');
  }
  if (d.vent.mode === 'grille') add('grille', `Ventilation grille ${G.apertures.grille ? Math.round(G.apertures.grille.w) : d.vent.grW} x ${G.apertures.grille ? Math.round(G.apertures.grille.h) : d.vent.grH} mm (pair)`, 'شبكة تهوية (زوج)', n, 'pair');
  if (d.type === 'barn') {
    add('track', 'Barn door track rail', 'سكة باب جرار', r2(G.track.len / 1000), 'm', `${G.track.len} mm`);
    add('hanger', 'Roller hanger', 'عجلة تعليق', 2, 'pc');
    add('guide', 'Floor guide', 'دليل أرضي', 1);
    add('stop', 'End stop (soft close optional)', 'مصد نهاية', 2);
  }
  if (d.type === 'pocket') {
    add('pocket', 'Pocket door kit (cavity frame + track)', 'طقم باب جيبي (إطار تجويف + سكة)', 1, 'kit', `track ${G.track.len} mm`);
    add('hanger', 'Roller hanger', 'عجلة تعليق', 2, 'pc');
  }
  if (S.frameOn) add('fix', 'Frame fixing set', 'طقم تثبيت الحلق', 1, 'set', '8 fixings: 3 per jamb, 2 in the head');
  return out;
}

/* ----------------------------- warnings ----------------------------- */
export function buildWarnings(d, G, bom, kg) {
  const S = G.S; const k = construction(d); const out = [];
  const add = (id, level, en, ar) => out.push({ id, level, en, ar });
  const maxKg = Math.max(...kg);
  /* size */
  if (!S.sliding && S.leafW > 1200) add('wide-e', 'error', `Leaf ${S.leafW} mm wide: too wide for one leaf (max 1200 mm). Use a double door.`, `عرض الضلفة ${S.leafW} مم: أعرض من اللازم لضلفة واحدة (الحد 1200 مم). استخدم باب ضلفتين.`);
  else if (!S.sliding && S.leafW > 1000) add('wide-w', 'warn', `Leaf ${S.leafW} mm wide: heavy and prone to twist; consider a double door.`, `عرض الضلفة ${S.leafW} مم: ثقيلة وقابلة للالتواء؛ فكّر بباب ضلفتين.`);
  if (S.leafH > 2400) add('tall', 'warn', `Leaf ${S.leafH} mm high: over 2400 mm needs 4+ hinges and a stiffer core.`, `ارتفاع الضلفة ${S.leafH} مم: فوق 2400 مم يحتاج 4 مفصلات أو أكثر وقلبًا أقوى.`);
  if (S.double && S.OW < 1100) add('dbl-narrow', 'warn', `A double door in a ${S.OW} mm opening gives leaves of only ${S.leafW} mm.`, `باب ضلفتين في فتحة ${S.OW} مم يعطي ضلفات ${S.leafW} مم فقط.`);
  /* hinges and weight */
  if (!S.slides) {
    const cap = HINGE_CAP[d.hinges.type] * G.hingeCount;
    if (maxKg > cap) add('hinge-e', 'error', `Leaf weighs ${maxKg} kg: too heavy for ${G.hingeCount} ${d.hinges.type} hinges (rated ${cap} kg). Add hinges or use ball-bearing hinges.`, `وزن الضلفة ${maxKg} كغ: ثقيلة على ${G.hingeCount} مفصلات (الحد ${cap} كغ). أضف مفصلات أو استخدم مفصلات بلي.`);
    else if (maxKg > 0.75 * cap) add('hinge-w', 'warn', `Leaf weighs ${maxKg} kg: close to the rated ${cap} kg of ${G.hingeCount} ${d.hinges.type} hinges.`, `وزن الضلفة ${maxKg} كغ: قريب من الحد ${cap} كغ لـ ${G.hingeCount} مفصلات.`);
    const rec = autoHinges(maxKg, S.leafH, d.fire.rating);
    if (d.hinges.count && d.hinges.count < rec) add('hinge-n', 'warn', `${d.hinges.count} hinges chosen; ${rec} are recommended for ${maxKg} kg and ${S.leafH} mm.`, `اخترت ${d.hinges.count} مفصلات؛ الموصى به ${rec} لوزن ${maxKg} كغ وارتفاع ${S.leafH} مم.`);
  } else if (d.type === 'barn' && maxKg > 80) add('track-w', 'warn', `Leaf weighs ${maxKg} kg: over the 80 kg rating of a standard barn track.`, `وزن الضلفة ${maxKg} كغ: أكثر من حمولة سكة الجرار القياسية 80 كغ.`);
  /* stiles, panels */
  if (k === 'panel' || k === 'glazed' || k === 'louvre') {
    const p = d.panels; const g = G.grid;
    if (p.stile < 90) add('stile-min', 'warn', `Stile ${p.stile} mm is narrow: keep stiles at 90 mm or more for the lock and the hinges.`, `الضلع ${p.stile} مم ضيق: اجعله 90 مم أو أكثر للقفل والمفصلات.`);
    if (d.lock.on && p.stile < d.lock.backset + 30) add('stile-lock', 'warn', `The lock stile (${p.stile} mm) is too narrow for a ${d.lock.backset} mm backset (needs ${d.lock.backset + 30} mm).`, `ضلع القفل (${p.stile} مم) ضيق للباكست ${d.lock.backset} مم (يحتاج ${d.lock.backset + 30} مم).`);
    if (g.rowH < 80 || g.colW < 80) add('panel-small', g.rowH < 40 || g.colW < 40 ? 'error' : 'warn', `Panels are only ${Math.round(g.colW)} x ${Math.round(g.rowH)} mm: reduce the rows / columns or the rail widths.`, `البانوهات ${Math.round(g.colW)} × ${Math.round(g.rowH)} مم فقط: قلّل الصفوف / الأعمدة أو عرض العوارض.`);
    if (p.cols > 1 && lockMidRail(d, G)) add('rail-lock', 'info', `The lock (${d.lock.handleH} mm) lands on a mid rail - good for the lock case.`, `القفل (${d.lock.handleH} مم) يقع على عارضة وسطى - مناسب لعلبة القفل.`);
  }
  if (S.T < 35 && d.leaf.core === 'hollow') add('thin-hollow', 'warn', `Hollow-core leaf ${S.T} mm thick: below 35 mm it is fragile.`, `ضلفة بقلب مجوف سماكتها ${S.T} مم: أقل من 35 مم هشة.`);
  /* glazing */
  const hasGlass = bom.rows.some((r) => r.mat === 'glass');
  if (hasGlass) {
    add('glass-safety', 'info', `Glass in a door is critical-location glazing: ${d.glass.safety} safety glass (EN 12600 / BS 6206) is specified. Never use annealed glass.`, `الزجاج في الباب موضع حرج: المواصفة زجاج أمان ${d.glass.safety === 'toughened' ? 'مقسّى' : 'مُلصّق'} (EN 12600 / BS 6206). لا تستخدم زجاجًا عاديًا.`);
    const big = bom.rows.filter((r) => r.mat === 'glass').reduce((m, r) => Math.max(m, r.areaEach), 0);
    if (d.glass.thk === 6 && big > 1.5) add('glass-area', 'warn', `A glass light of ${r2(big)} m2 needs 8 mm or thicker safety glass.`, `لوح زجاج ${r2(big)} م² يحتاج زجاج أمان 8 مم أو أسمك.`);
    if (k === 'glazed' || (k === 'flush' && d.glass.vision) || k === 'moulded') {
      const small = Math.min(...bom.rows.filter((r) => r.mat === 'glass').map((r) => Math.min(r.L, r.W)));
      if (small < 90) add('glass-small', 'warn', `A glass light is only ${r1(small - 2 * C.GL_REB)} mm wide: reduce the glazing bars.`, `أحد ألواح الزجاج عرضه ${r1(small - 2 * C.GL_REB)} مم فقط: قلّل قواطع الزجاج.`);
    }
  }
  if (d.glass.vision && (k === 'panel' || k === 'glazed' || k === 'louvre')) add('vision-na', 'info', 'A vision panel is cut into flush and moulded leaves. This leaf type already has panels - use the glazing rows instead.', 'فتحة الرؤية تُقطع في الضلفات المسطحة والمقولبة. هذا النوع فيه بانوهات - استخدم صفوف الزجاج بدلًا منها.');
  if (d.vent.mode === 'grille' && (k === 'panel' || k === 'glazed' || k === 'louvre')) add('grille-sr', 'info', 'The grille is fixed over the bottom panel (no cut-out in a stile-and-rail leaf).', 'الشبكة تُثبّت فوق البانوه السفلي (لا يوجد قطع في الضلفة ذات الإطار).');
  /* fire */
  if (d.fire.rating !== 'none') {
    const need = d.fire.rating === 'FD60' ? 54 : 44;
    if (S.T < need) add('fire-thk', 'error', `${d.fire.rating} needs a leaf of ${need} mm or thicker (now ${S.T} mm).`, `${d.fire.rating} يحتاج ضلفة ${need} مم أو أسمك (الآن ${S.T} مم).`);
    if (d.leaf.core === 'hollow') add('fire-core', 'error', `${d.fire.rating}: a hollow core does not give fire resistance. Use a solid or engineered core.`, `${d.fire.rating}: القلب المجوف لا يعطي مقاومة حريق. استخدم قلبًا صلبًا أو هندسيًا.`);
    if (k === 'louvre') add('fire-louvre', 'error', `${d.fire.rating}: a louvred leaf cannot be fire rated.`, `${d.fire.rating}: لا يمكن اعتماد ضلفة شيش لمقاومة الحريق.`);
    if (hasGlass) add('fire-glass', 'warn', `${d.fire.rating}: glazing must be fire-rated glass in intumescent beads, within the tested size.`, `${d.fire.rating}: الزجاج يجب أن يكون مقاوم حريق بشرائط منتفخة وضمن المقاس المختبر.`);
    if (d.vent.mode === 'grille') add('fire-grille', 'error', `${d.fire.rating}: a ventilation grille needs an intumescent fire grille - not an ordinary one.`, `${d.fire.rating}: شبكة التهوية تحتاج شبكة حريق منتفخة وليست عادية.`);
    if (S.floorGap > 10) add('fire-gap', 'warn', `${d.fire.rating}: the gap under the leaf is ${S.floorGap} mm; fire doors allow 3 to 10 mm (use a drop seal for more).`, `${d.fire.rating}: الفجوة تحت الضلفة ${S.floorGap} مم؛ أبواب الحريق تسمح 3 إلى 10 مم (استخدم عتبة هابطة).`);
    if (d.clear.side > 4 || d.clear.head > 4) add('fire-gaps', 'warn', `${d.fire.rating}: head and side gaps should be 2 to 4 mm (now ${d.clear.head} / ${d.clear.side} mm).`, `${d.fire.rating}: فجوات الرأس والجانب 2 إلى 4 مم (الآن ${d.clear.head} / ${d.clear.side} مم).`);
    if (!S.slides && d.hinges.count && d.hinges.count < 3) add('fire-hinge', 'error', `${d.fire.rating}: at least 3 CE-marked hinges are required.`, `${d.fire.rating}: يلزم 3 مفصلات على الأقل بعلامة CE.`);
    if (S.slides) add('fire-slide', 'warn', `${d.fire.rating}: a sliding or pocket door needs a certified fire-door track system.`, `${d.fire.rating}: الباب المنزلق أو الجيبي يحتاج نظام سكة معتمد للحريق.`);
    if (d.lock.on && d.lock.handle === 'knob') add('fire-knob', 'info', 'A fire door should have a latch that always engages (a lever handle is easier to operate).', 'باب الحريق يجب أن يكون له لسان يعمل دائمًا (مقبض الذراع أسهل).');
  }
  /* frame and wall */
  if (S.frameOn) {
    const need = S.T + C.STOP_T + 40;
    if (S.jd < need) add('jamb-shallow', 'error', `Jamb depth ${S.jd} mm is too shallow for a ${S.T} mm leaf plus the stop (needs ${need} mm).`, `عمق الحلق ${S.jd} مم ضحل لضلفة ${S.T} مم مع المصد (يحتاج ${need} مم).`);
    if (d.frame.jambDepth && Math.abs(S.jd - S.wall) > 20) add('jamb-wall', 'warn', `Jamb depth ${S.jd} mm differs from the wall ${S.wall} mm by more than 20 mm: the architrave will not cover the joint.`, `عمق الحلق ${S.jd} مم يختلف عن سمك الجدار ${S.wall} مم أكثر من 20 مم: الكورنيش لن يغطي الوصلة.`);
  }
  if (S.pocket && S.wall < S.T + 60) add('pocket-wall', 'error', `Wall ${S.wall} mm is too thin for a pocket door (needs ${S.T + 60} mm for the cavity).`, `سمك الجدار ${S.wall} مم رقيق لباب جيبي (يحتاج ${S.T + 60} مم للتجويف).`);
  if (S.pocket) add('pocket-clear', 'info', `Keep ${Math.round(S.leafW + 100)} mm of wall beside the opening clear of sockets, pipes and fixings for the pocket.`, `اترك ${Math.round(S.leafW + 100)} مم من الجدار بجانب الفتحة خاليًا من المقابس والأنابيب للجيب.`);
  if (d.type === 'barn') add('barn-wall', 'info', `Needs ${G.track.len} mm of clear wall for the track; the leaf overlaps the opening by ${d.barn.overlap} mm each side.`, `يحتاج ${G.track.len} مم من الجدار الخالي للسكة؛ الضلفة تتجاوز الفتحة ${d.barn.overlap} مم من كل جانب.`);
  if (d.type === 'barn' && d.lock.on) add('barn-lock', 'info', 'A barn door does not seal: use a hook / bolt lock, not a latch.', 'باب الجرار لا يغلق بإحكام: استخدم قفل خطاف أو مزلاج.');
  if (d.leaf.finish && d.leaf.skin === 'veneer' && (d.leaf.finish === 'white' || d.leaf.finish === 'black' || d.leaf.finish === 'ivory' || d.leaf.finish === 'grey')) add('veneer-paint', 'info', 'A painted colour is selected with a veneer skin: the veneer will be painted. Pick a wood finish to show the grain.', 'تم اختيار لون دهان مع قشرة: ستُدهن القشرة. اختر لون خشب لإظهار العروق.');
  if (d.leaf.skin !== 'veneer' && /oak|walnut|pine|mahogany/.test(d.leaf.finish) && d.leaf.skin === 'paint') add('paint-wood', 'info', 'A wood colour is selected with a painted skin: it will be a wood-tone paint, not real grain.', 'تم اختيار لون خشب مع جلد مدهون: سيكون دهان بلون الخشب وليس عروقًا حقيقية.');
  if (S.leafH < 1700) add('short', 'warn', `Leaf is only ${S.leafH} mm high.`, `ارتفاع الضلفة ${S.leafH} مم فقط.`);
  return out;
}

function lockMidRail(d, G) {
  const g = G.grid; if (!g || g.rows < 2) return false;
  const y = d.lock.handleH - G.S.y0;
  for (let r = 0; r < g.rows - 1; r++) { const lo = g.ys[r].y0 - d.panels.midRail; const hi = g.ys[r].y0; if (y >= lo && y <= hi) return true; }
  return false;
}
export { cellKind };
