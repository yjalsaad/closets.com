// Route chunk "shared_OfficePlannerWizard_OfficePage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: OfficePlannerWizard, OfficePage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).

// Six office layouts — each carries a brand render photo + a feature flag set.
const OFFICE_LAYOUTS = [
  { id:'wall-storage',  name:'Wall Storage Office',        sub:'Full storage wall + desk',   feats:['storage wall','desk run','open + closed units','optional LED'], img:'/layouts/office/wall-storage.jpg' },
  { id:'corner',        name:'Corner Home Office',         sub:'Two-wall corner desk',       feats:['corner desk','overhead shelves','base cabinets','cable mgmt'], img:'/layouts/office/corner.jpg' },
  { id:'built-in',      name:'Built-in Office with Shelves',sub:'Joinery + display shelving', feats:['built-in desk','display shelves','closed storage','decor panels'], img:'/layouts/office/built-in.jpg' },
  { id:'storage-desk',  name:'Storage Wall with Desk',     sub:'Floor-to-ceiling + worktop', feats:['tall storage','integrated desk','file storage','LED'], img:'/layouts/office/storage-desk.jpg' },
  { id:'minimal',       name:'Minimal Home Office',        sub:'Floating desk + shelf',      feats:['floating desk','floating shelf','hidden wiring'], img:'/layouts/office/minimal.jpg' },
  { id:'l-shaped',      name:'L-Shaped Home Office',       sub:'L-return desk + storage',    feats:['L-shape desk','return worktop','drawers','tall unit'], img:'/layouts/office/l-shaped.jpg' },
];

const OFFICE_WORKTOPS = [
  { id:'laminate', name:'Laminate',     mult:1.00, hex:'#d8cdbd', sub:'Durable HPL' },
  { id:'veneer',   name:'Wood veneer',  mult:1.30, hex:'#5a3a20', sub:'Real wood' },
  { id:'solid',    name:'Solid surface',mult:1.45, hex:'#ece9e3', sub:'Seamless' },
  { id:'quartz',   name:'Quartz',       mult:1.60, hex:'#cfcabf', sub:'Engineered stone' },
];

const OFFICE_STORAGE = [ // step 6 qty steppers
  { id:'openshelf',name:'Open shelves',    unit:'shelf',   price:55  },
  { id:'closed',   name:'Closed cabinets', unit:'cabinet', price:160 },
  { id:'drawers',  name:'Drawers',         unit:'drawer',  price:130 },
  { id:'tall',     name:'Tall units',      unit:'unit',    price:260 },
  { id:'file',     name:'File storage',    unit:'unit',    price:150 },
];

export { OFFICE_LAYOUTS, OFFICE_WORKTOPS, OFFICE_STORAGE };
