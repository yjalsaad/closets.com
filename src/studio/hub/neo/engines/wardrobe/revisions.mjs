// Standard Wardrobe · Design revision engine (pure, deterministic) — spec §29.
// A revision list holds immutable WardrobeConfiguration snapshots. Duplicate · compare · restore ·
// approve · lock. Once a revision is approved+locked, silent edits are prevented (canEdit === false).
// No I/O, no Date/random — the caller passes any timestamp so the engine stays pure.

const clone = (o) => JSON.parse(JSON.stringify(o == null ? null : o));

export function newRevisionList() { return []; }

/** Append an immutable snapshot as the next revision. meta: { note, by, ts }. */
export function addRevision(list, config, meta = {}) {
  const arr = Array.isArray(list) ? list : [];
  const rev = (arr.length ? arr[arr.length - 1].rev : 0) + 1;
  return [...arr, { rev, note: meta.note || '', by: meta.by || null, ts: meta.ts || null, approved: false, locked: false, config: clone(config) }];
}

export function latest(list) { const a = list || []; return a.length ? a[a.length - 1] : null; }
export function getRevision(list, rev) { return (list || []).find((x) => x.rev === rev) || null; }

/** Return a deep copy of a revision's config (for editing a new branch). */
export function restore(list, rev) { const e = getRevision(list, rev); return e ? clone(e.config) : null; }

/** Duplicate a revision as a new (unapproved) revision. */
export function duplicate(list, rev, meta = {}) { const e = getRevision(list, rev); if (!e) return list; return addRevision(list, e.config, { ...meta, note: meta.note || ('copy of rev ' + rev) }); }

export function approve(list, rev, by) { return (list || []).map((e) => e.rev === rev ? { ...e, approved: true, approvedBy: by || null } : e); }
export function lock(list, rev) { return (list || []).map((e) => e.rev === rev ? { ...e, approved: true, locked: true } : e); }
export function unlock(list, rev) { return (list || []).map((e) => e.rev === rev ? { ...e, locked: false } : e); }

export function isLocked(list) { const e = latest(list); return !!(e && e.locked); }
/** Editing is blocked once the newest revision is locked for manufacturing (spec §29). */
export function canEdit(list) { return !isLocked(list); }

/** Structured diff between two configs — top-level fields + per-module interior changes. */
export function diffConfig(a, b) {
  const A = a || {}, B = b || {}, changes = [];
  ['width', 'height', 'depth', 'type', 'doors'].forEach((k) => { if (String(A[k]) !== String(B[k])) changes.push({ field: k, from: A[k], to: B[k] }); });
  const ma = A.modules || [], mb = B.modules || [], n = Math.max(ma.length, mb.length);
  if (ma.length !== mb.length) changes.push({ field: 'sections', from: ma.length, to: mb.length });
  for (let i = 0; i < n; i++) {
    const x = ma[i] || {}, y = mb[i] || {};
    ['width', 'hanging', 'shelves', 'drawers'].forEach((k) => { if (String(x[k]) !== String(y[k])) changes.push({ field: 'M' + (i + 1) + '.' + k, from: x[k], to: y[k] }); });
  }
  return { changes, count: changes.length, summary: changes.map((c) => c.field + ': ' + (c.from == null ? '—' : c.from) + ' → ' + (c.to == null ? '—' : c.to)) };
}

/** Compare two revisions by number. */
export function compare(list, revA, revB) {
  const a = getRevision(list, revA), b = getRevision(list, revB);
  if (!a || !b) return null;
  return { a: revA, b: revB, ...diffConfig(a.config, b.config) };
}
