/* Neo Kitchen Designer UX-18 - pure logic for the File menu (no DOM, no React): the layout label, the empty / default kitchens
 * and the "is there anything to lose" check. Unit-tested in __tests__/fileMenu.test.js. */
import { makeInitial } from './model';

/** the layout label shown on the first row of the File menu: [Latin text (mono, upper-cased by CSS), Arabic text] */
export const LAYOUT_LABELS = {
  straight: ['Single wall', 'جدار واحد'], // UX29: was "Straight" (the internal id is still 'straight')
  'l-left': ['L · Left', 'L · يسار'],
  'l-right': ['L · Right', 'L · يمين'],
  u: ['U-shape', 'شكل U'],
  galley: ['Galley', 'ممر'],
  peninsula: ['Peninsula', 'جزيرة ممتدة'],
  island: ['Island', 'جزيرة'],
};
export const layoutLabel = (name, ar) => { const l = LAYOUT_LABELS[name] || LAYOUT_LABELS.straight; return ar ? l[1] : l[0]; };

const emptyRun = () => ({ base: [], wall: [], top: [] });
/** the minimal valid empty kitchen: the standard project (global settings, finishes, handles, 'My Kitchen') with no units in any run
 *  and both legs off. buildScene / buildBOM / DXF / normalizeModel all accept it (tested). */
export function makeEmptyKitchen() {
  const m = makeInitial();
  return { ...m, runs: { main: emptyRun(), left: emptyRun(), right: emptyRun() } };
}
/** the standard default kitchen (what a fresh session opens with) */
export const makeDefaultKitchen = () => makeInitial();

/** true when the model differs from the last saved / loaded / created one (savedJson null = never saved, e.g. restored from autosave) */
export const isDirty = (modelJson, savedJson) => savedJson == null || modelJson !== savedJson;

/** import size guard: a project file is a few hundred KB at most */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
