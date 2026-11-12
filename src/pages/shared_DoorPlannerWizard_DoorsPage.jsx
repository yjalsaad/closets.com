// Route chunk "shared_DoorPlannerWizard_DoorsPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DoorPlannerWizard, DoorsPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).

/* ── WOOD DOOR PLANNER WIZARD · data tables (BHD) ──
   Wired to route 'door-planner'. Pure 2D door elevation + live BOM + cost + quote.
   Standard dims (W×H mm): Bedroom 800–900×2100–2400; Bathroom 700–800×2100–2400;
   Main entrance 1000–1400×2400–3200; Double 1400–2000×2400–3200; Pivot 1200–1800×2700–3500. */
const DOOR_TYPES = [
  { id:'single',  name:'Single Swing',  sub:'One hinged leaf',            note:'The everyday interior door — one leaf on side hinges.', leaves:1, mode:'swing',  ic:'M5 3h14v18H5zM15 12h0.01', img:'/layouts/door/single-swing.jpg' },
  { id:'double',  name:'Double Swing',  sub:'Two hinged leaves',          note:'Grand entrances & majlis — two meeting leaves.',       leaves:2, mode:'swing',  ic:'M4 3h7v18H4zM13 3h7v18h-7zM9 12h0.01M15 12h0.01', img:'/layouts/door/double-swing.jpg' },
  { id:'sliding', name:'Sliding',       sub:'Slides on a track',          note:'Space-saving — the leaf glides along a wall track.',   leaves:1, mode:'slide',  ic:'M3 5h18v14H3zM12 5v14M7 12h3M14 12h3', img:'/layouts/door/sliding.jpg' },
  { id:'pivot',   name:'Pivot',         sub:'Centre / offset pivot',      note:'Architectural statement — turns on a floor pivot.',    leaves:1, mode:'pivot',  ic:'M5 3h14v18H5zM12 3v18', img:'/layouts/door/pivot.jpg' },
  { id:'hidden',  name:'Hidden',        sub:'Flush concealed frame',      note:'Invisible door — flush with the wall, no visible frame.',leaves:1,mode:'swing',  ic:'M5 3h14v18H5zM5 12h14', img:'/layouts/door/hidden.jpg' },
  { id:'folding', name:'Folding',       sub:'Bi-fold panels',             note:'Folds back in panels for a wide clear opening.',       leaves:2, mode:'fold',   ic:'M4 3h4v18H4zM8 3h4v18H8zM12 3h4v18h-4zM16 3h4v18h-4z', img:'/layouts/door/folding.jpg' },
];

// Finish
const DOOR_WOODS = [
  { id:'oak',    name:'Oak',    hex:'#c9a36a', mult:1.00 },
  { id:'walnut', name:'Walnut', hex:'#5a3a20', mult:1.20 },
  { id:'ash',    name:'Ash',    hex:'#d8c7a6', mult:1.05 },
  { id:'teak',   name:'Teak',   hex:'#9c6b35', mult:1.30 },
  { id:'ebony',  name:'Ebony',  hex:'#2b2420', mult:1.40 },
];

export { DOOR_TYPES, DOOR_WOODS };
