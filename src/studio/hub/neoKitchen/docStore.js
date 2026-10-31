/* [NEO-CUTLIST-UX32] One shared store for the Production Document Settings, so the cut list toolbar, the Export menu (any Neo studio) and the
 * designer that saves the project all see the same company / project details without prop drilling:
 *   company   remembered per user (docInfo.js, localStorage)
 *   project   the project details + options: the designer puts them in its project JSON / autosave (snapshot() / hydrate());
 *             a studio that does not store them gets a per-product, per-project-title copy in this browser
 * `attach` is called by the cut list / export menu with who and what is open; it never throws and never writes anything but local storage. */
import { useSyncExternalStore } from 'react';
import { emptyProject, cleanProject, cleanOpts, cleanCompany, DEFAULT_OPTS, loadCompany, saveCompany, loadOpts, saveOpts, loadProjectLocal, saveProjectLocal, packDocInfo, unpackDocInfo, resolveCompany, todayIso, projectFilled } from './docInfo';

const init = () => ({ user: null, product: null, title: '', project: emptyProject(), opts: { ...DEFAULT_OPTS }, company: cleanCompany({}), open: false, hydrated: false, rev: 0 });
let S = init();
const subs = new Set();
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const getDoc = () => S;
export const resetDocStore = () => { S = init(); subs.forEach((f) => f()); };
export function useDocStore() { return useSyncExternalStore(subscribe, getDoc, getDoc); }

/** who / what is open. Loads the company (per user) and, unless the designer hydrated the project, the local copy for this project. */
export function attach({ user = '', product = '', title = '' } = {}) {
  if (S.user === user && S.product === product && S.title === title) return;
  const next = { ...S, user, product, title };
  if (S.user !== user) { next.company = loadCompany(user); if (!S.hydrated) next.opts = loadOpts(user); }
  // a different studio / first open: load the local copy of that project's details; a rename keeps what is typed (and stores it under the new name)
  if (!S.hydrated && S.product !== product) next.project = loadProjectLocal(product, title);
  S = next;
  if (projectFilled(S.project)) persistProject();
  subs.forEach((f) => f());
}
/** the designer opened / imported a project that carried `docInfo` (or none: the details are cleared) */
export function hydrate(raw) {
  const u = unpackDocInfo(raw);
  S = { ...S, project: u.project, opts: raw && raw.opts ? u.opts : S.opts, hydrated: true, rev: S.rev + 1 };
  subs.forEach((f) => f());
}
export const snapshot = () => packDocInfo(S.project, S.opts);

const persistProject = () => { if (S.product || S.title) saveProjectLocal(S.product, S.title, S.project); };
export function setProject(patch) {
  S = { ...S, project: cleanProject({ ...S.project, ...patch }), rev: S.rev + 1 };
  persistProject(); subs.forEach((f) => f());
}
export function setOpts(patch) {
  S = { ...S, opts: cleanOpts({ ...S.opts, ...patch }), rev: S.rev + 1 };
  saveOpts(S.user, S.opts); subs.forEach((f) => f());
}
export function setCompany(patch) {
  S = { ...S, company: cleanCompany({ ...S.company, ...patch }), rev: S.rev + 1 };
  saveCompany(S.user, S.company); subs.forEach((f) => f());
}
/** the dialog can be mounted by the Export menu AND the cut list; only the first mounted host shows it */
const hosts = [];
const bump = () => { S = { ...S, rev: S.rev + 1 }; subs.forEach((f) => f()); };
export function addHost(id) { hosts.push(id); bump(); return () => { const i = hosts.indexOf(id); if (i >= 0) hosts.splice(i, 1); bump(); }; }
export const isPrimaryHost = (id) => hosts[0] === id;
export function openSettings() { S = { ...S, open: true, rev: S.rev + 1 }; subs.forEach((f) => f()); }
export function closeSettings() { S = { ...S, open: false, rev: S.rev + 1 }; subs.forEach((f) => f()); }

/** everything a printed / exported document needs: { project (name defaults to the title, date to today), company (resolved logo), opts } */
export function docFor(state = S, fallbackName = '') {
  const project = { ...state.project };
  if (!project.project) project.project = fallbackName || state.title || '';
  if (!project.date) project.date = todayIso();
  return { project, company: resolveCompany(state.company), opts: state.opts };
}
