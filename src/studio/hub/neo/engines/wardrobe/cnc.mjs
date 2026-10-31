// Standard Wardrobe · CNC post-processing (pure, deterministic) — spec §20.
// Consumes the machine-agnostic MIF (from machining.toMIF) and emits real output through a POST-PROCESSOR.
// We ship an honest GENERIC neutral-NC + a CSV drilling schedule. Proprietary machine formats
// (Homag WoodWOP, Biesse CIX, SCM Xilog) are registered but marked NOT IMPLEMENTED — we do not fake a
// format whose spec we don't have. No I/O, no Date/random.

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Expand MIF operations into elementary machine actions with absolute coordinates (holes, bores, grooves). */
export function expandOps(mif) {
  const acts = [];
  for (const o of ((mif && mif.operations) || [])) {
    if (o.type === 'HOLE_SERIES') {
      const n = o.count || 0;
      for (let i = 0; i < n; i++) acts.push({ part: o.part, action: 'DRILL', face: o.face, x: o.x, y: (o.y0 || 0) + i * (o.pitch || 32), dia: o.dia || 5, depth: o.depth || 12, note: o.note });
    } else if (o.type === 'HINGE_CUP') {
      acts.push({ part: o.part, action: 'BORE', face: o.face, x: o.x, y: o.y, dia: o.dia || 35, depth: o.depth || 12.5, note: o.note });
    } else if (o.type === 'DRILL' || o.type === 'CONNECTOR') {
      const n = o.count || 1, dia = o.dia || (o.type === 'CONNECTOR' ? 8 : 5), depth = o.type === 'CONNECTOR' ? 15 : (o.depth || 12);
      for (let i = 0; i < n; i++) acts.push({ part: o.part, action: 'DRILL', face: o.face, x: o.x, y: o.y, dia, depth, note: o.note });
    } else if (o.type === 'GROOVE') {
      acts.push({ part: o.part, action: 'GROOVE', face: o.face, x: o.x || 0, y: o.y || 0, width: o.width, depth: o.depth, note: o.note });
    } else {
      acts.push({ part: o.part, action: o.type, face: o.face, x: o.x, y: o.y, note: o.note });
    }
  }
  return acts;
}

/** Generic CSV drilling / routing schedule (one row per elementary action). */
export function toCSV(mif) {
  const head = ['part', 'action', 'face', 'x', 'y', 'dia', 'depth', 'width', 'note'];
  const rows = expandOps(mif).map((a) => [a.part, a.action, a.face || '', a.x ?? '', a.y ?? '', a.dia ?? '', a.depth ?? '', a.width ?? '', String(a.note || '').replace(/[,\n]/g, ';')]);
  return [head.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/** Generic neutral NC program per part (documented pseudo-NC — NOT a proprietary dialect). */
export function postGeneric(mif) {
  const acts = expandOps(mif);
  const byPart = new Map();
  for (const a of acts) { if (!byPart.has(a.part)) byPart.set(a.part, []); byPart.get(a.part).push(a); }
  const parts = [];
  for (const [part, list] of byPart) {
    const lines = ['; NEO-GENERIC-NC/1  part="' + part + '"  unit=mm  origin=bottom-left'];
    for (const a of list) {
      if (a.action === 'GROOVE') lines.push('GROOVE FACE=' + a.face + ' W=' + r2(a.width) + ' Z=' + r2(a.depth));
      else lines.push((a.action === 'BORE' ? 'BORE' : 'DRILL') + ' FACE=' + a.face + ' X=' + r2(a.x) + ' Y=' + r2(a.y) + ' D=' + r2(a.dia) + ' Z=' + r2(a.depth));
    }
    lines.push('END');
    parts.push({ part, holes: list.filter((a) => a.action !== 'GROOVE').length, program: lines.join('\n') });
  }
  return { format: 'NEO-GENERIC-NC/1', parts, program: parts.map((p) => p.program).join('\n\n'), totalHoles: acts.filter((a) => a.action !== 'GROOVE').length };
}

/** Registry — real generic posts + honest stubs for proprietary machines (spec §20). */
export const POST_PROCESSORS = {
  generic: { id: 'generic', name: 'Generic CNC (neutral NC)', implemented: true, ext: 'nc', run: (mif) => postGeneric(mif) },
  csv: { id: 'csv', name: 'CSV drilling schedule', implemented: true, ext: 'csv', run: (mif) => ({ format: 'CSV', csv: toCSV(mif) }) },
  homag: { id: 'homag', name: 'Homag WoodWOP (MPR)', implemented: false },
  biesse: { id: 'biesse', name: 'Biesse bSolid (CIX)', implemented: false },
  scm: { id: 'scm', name: 'SCM Xilog', implemented: false },
};

export function listPosts() { return Object.values(POST_PROCESSORS).map((p) => ({ id: p.id, name: p.name, implemented: !!p.implemented })); }

/** Run a post-processor. Returns {ok:false, notImplemented} for proprietary stubs — never a fake file. */
export function postProcess(mif, postId = 'generic') {
  const p = POST_PROCESSORS[postId];
  if (!p) return { ok: false, error: 'unknown post-processor: ' + postId };
  if (!p.implemented) return { ok: false, notImplemented: true, name: p.name, note: 'Proprietary format spec required — NOT IMPLEMENTED (spec §20). Use Generic NC or CSV.' };
  return { ok: true, post: p.name, ext: p.ext, ...p.run(mif) };
}
