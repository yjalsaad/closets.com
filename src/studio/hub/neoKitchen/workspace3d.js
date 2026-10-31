/* Neo Kitchen Designer UX-21 - pure helpers for the 3D workspace: hold-camera semantics, open / close selection (by kind, unit,
 * all), the animation-speed mapping, and the guarded per-user workspace preferences. No React, no THREE, no DOM (except an
 * optional localStorage that is always wrapped in try / catch). Unit-tested in __tests__/workspace3d.test.js. */

/* ------------------------------- hold ------------------------------- */
/** automatic re-fit (resize, panel toggles, parameter changes) is allowed only while the camera is "following" AND not held */
export const canAutoFit = ({ hold, follow }) => !hold && !!follow;
/** manual gestures (orbit / pan / zoom / nudge / double-click focus) are ignored while held; picking a part still works */
export const gesturesAllowed = (hold) => !hold;

/* ------------------------------- speed ------------------------------- */
export const SPEED = { min: 0.25, max: 3, def: 1 };
/** one full open / close sweep takes this long at 1x */
export const BASE_OPEN_MS = 700;
export const clampSpeed = (v) => { const n = +v; if (!Number.isFinite(n)) return SPEED.def; return Math.max(SPEED.min, Math.min(SPEED.max, Math.round(n * 100) / 100)); };
/** slider position 0..100 -> speed (logarithmic so 0.25x..1x and 1x..3x both have room; snaps to exactly 1x near the middle) */
export function speedFromPos(pos) {
  const p = Math.max(0, Math.min(100, +pos || 0)) / 100;
  const s = SPEED.min * Math.pow(SPEED.max / SPEED.min, p);
  return clampSpeed(Math.abs(s - 1) < 0.06 ? 1 : s);
}
export const posFromSpeed = (speed) => Math.round((Math.log(clampSpeed(speed) / SPEED.min) / Math.log(SPEED.max / SPEED.min)) * 100);
export const fmtSpeed = (s) => `${String(Math.round(clampSpeed(s) * 100) / 100)}×`;
export const openDurationMs = (speed) => BASE_OPEN_MS / clampSpeed(speed);
/** advance a front's open fraction (0 closed .. 1 open) towards `target` by dtMs at `speed`; exact at the ends, so Close All restores 0 */
export function openStep(cur, target, dtMs, speed, instant) {
  if (instant) return target;
  const step = Math.max(0, dtMs) / openDurationMs(speed);
  if (cur < target) return Math.min(target, cur + step);
  if (cur > target) return Math.max(target, cur - step);
  return target;
}
export const easeInOut = (k) => { const t = Math.max(0, Math.min(1, k)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/* ------------------------------- open / close ------------------------------- */
export const OPEN_KINDS = ['door', 'drawer', 'flip'];
export const KIND_LABEL = { door: ['Doors', 'الأبواب'], drawer: ['Drawers', 'الأدراج'], flip: ['Flip-ups', 'القلابة'] };
/** every motion object in the scene (one per door leaf / drawer / flip-up) with the part ids that move with it; optionally one unit only */
export function animGroups(scene, unitId) {
  const by = new Map();
  ((scene && scene.parts) || []).forEach((p) => {
    if (!p.anim || !(OPEN_KINDS.includes(p.anim.k) || p.anim.k === 'slide')) return; // NEO-CLOSETS-UX24: a sliding wardrobe leaf is a "door" to the Open bar
    if (unitId && p.unitId !== unitId) return;
    let g = by.get(p.anim);
    if (!g) { g = { anim: p.anim, kind: p.anim.k === 'slide' ? 'door' : p.anim.k, unitId: p.unitId, ids: [] }; by.set(p.anim, g); }
    g.ids.push(p.id);
  });
  return [...by.values()];
}
/** part ids to open / close for a scope: `unitId` null = every unit; `kinds` = the kinds included (default all) */
export function frontIds(scene, { unitId = null, kinds = OPEN_KINDS } = {}) {
  const out = [];
  animGroups(scene, unitId).forEach((g) => { if (kinds.includes(g.kind)) out.push(...g.ids); });
  return out;
}
/** the motion group that a part belongs to (a door leaf, a drawer front + its box ...), or [] when the part does not move */
export function groupIdsOfPart(scene, partId) {
  const p = ((scene && scene.parts) || []).find((x) => x.id === partId);
  if (!p || !p.anim || !(OPEN_KINDS.includes(p.anim.k) || p.anim.k === 'slide')) return [];
  return scene.parts.filter((x) => x.anim === p.anim).map((x) => x.id);
}
const isGroupOpen = (g, openIds) => g.ids.some((i) => openIds.has(i));
/** state of one kind inside a scope: 'none' | 'some' | 'all' | 'na' (the project has none of them) with counts */
export function kindState(scene, openIds, kind, unitId = null) {
  const gs = animGroups(scene, unitId).filter((g) => g.kind === kind);
  if (!gs.length) return { state: 'na', total: 0, open: 0 };
  const open = gs.filter((g) => isGroupOpen(g, openIds)).length;
  return { state: open === 0 ? 'none' : open === gs.length ? 'all' : 'some', total: gs.length, open };
}
export function setOpen(openIds, ids, open) {
  const n = new Set(openIds); ids.forEach((i) => (open ? n.add(i) : n.delete(i))); return n;
}
/** toggle: if any of `ids` is open, close them all, otherwise open them all */
export function toggleIds(openIds, ids) {
  if (!ids.length) return new Set(openIds);
  return setOpen(openIds, ids, !ids.some((i) => openIds.has(i)));
}
/** the scope the bar really acts on: "selected" needs a selected unit, otherwise it is all units */
export const effectiveScope = (scope, selUnitId) => (scope === 'selected' && selUnitId ? 'selected' : 'all');

/* ------------------------------- per-user preferences ------------------------------- */
export const WS_KEY = 'nk_ws_prefs_v1';
const store = (s) => { try { return s || (typeof window !== 'undefined' ? window.localStorage : null); } catch (e) { return null; } };
/** only known, well-typed keys survive; nothing stored -> {} so the caller falls back to its viewport-based defaults */
export function cleanPrefs(raw) {
  const o = raw && typeof raw === 'object' ? raw : {}; const out = {};
  ['hold', 'panel', 'asst', 'tools'].forEach((k) => { if (typeof o[k] === 'boolean') out[k] = o[k]; });
  if (o.speed !== undefined) out.speed = clampSpeed(o.speed);
  if (o.scope === 'all' || o.scope === 'selected') out.scope = o.scope;
  /* UX-23: remembered column widths (px, clamped again by layoutLogic when used) and the assistant's dock / float choice */
  ['panelW', 'asstW'].forEach((k) => { if (typeof o[k] === 'number' && Number.isFinite(o[k]) && o[k] >= 200 && o[k] <= 900) out[k] = Math.round(o[k]); });
  if (o.asstRect && ['x', 'y', 'w', 'h'].every((k) => typeof o.asstRect[k] === 'number' && Number.isFinite(o.asstRect[k]))) out.asstRect = { x: Math.round(o.asstRect.x), y: Math.round(o.asstRect.y), w: Math.round(o.asstRect.w), h: Math.round(o.asstRect.h) };
  if (o.asstMode === 'dock' || o.asstMode === 'float') out.asstMode = o.asstMode;
  return out;
}
export function loadWsPrefs(storage) {
  try { const s = store(storage); const t = s && s.getItem(WS_KEY); return t ? cleanPrefs(JSON.parse(t)) : {}; } catch (e) { return {}; }
}
/** merges `patch` into what is stored; returns false when the browser refuses (private mode, quota ...) */
export function saveWsPrefs(patch, storage) {
  try { const s = store(storage); if (!s) return false; s.setItem(WS_KEY, JSON.stringify({ ...loadWsPrefs(s), ...cleanPrefs(patch) })); return true; } catch (e) { return false; }
}
