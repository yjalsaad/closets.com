// Route chunk "shared_TVUnitPlannerWizard_TVUnitPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: TVUnitPlannerWizard, TVUnitPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).

// Layouts — each carries its modular composition + a 'feature' flag set.
const TV_LAYOUTS = [
  { id:'floating',  name:'Floating',        sub:'Floating base + wall panel', feats:['floating base','TV wall panel','optional LED','hidden cable mgmt'], img:'/layouts/TV/floating.jpg' },
  { id:'fullwall',  name:'Full Wall',       sub:'Tall cabinets + display',    feats:['TV centre','tall cabinets','display shelves','closed storage','decorative panels'], img:'/layouts/TV/full-wall.jpg' },
  { id:'shelves',   name:'Display Shelves', sub:'Open shelves + niches',      feats:['open shelves','display niches','LED','decorative panels'], img:'/layouts/TV/display-shelves.jpg' },
  { id:'fireplace', name:'Fireplace',       sub:'Electric fire + cladding',   feats:['TV section','electric fireplace','stone / wood cladding','storage'], img:'/layouts/TV/fireplace.jpg' },
  { id:'minimal',   name:'Minimal',         sub:'Panel + floating shelf',     feats:['wall panel','floating shelf','hidden wiring'], img:'/layouts/TV/minimal.jpg' },
  { id:'storage',   name:'Storage Wall',    sub:'Bookcases + cabinets',       feats:['TV section','bookcases','cabinets','display areas'], img:'/layouts/TV/storage-wall.jpg' },
];

const TV_STORAGE = [ // step 6 qty/toggles
  { id:'decor',    name:'Decorative items', unit:'niche', price:90  },
  { id:'books',    name:'Books',            unit:'shelf', price:55  },
  { id:'consoles', name:'Consoles / boxes', unit:'bay',   price:180 },
  { id:'router',   name:'Router',           unit:'slot',  price:30  },
  { id:'receiver', name:'Receiver',         unit:'slot',  price:30  },
  { id:'hidden',   name:'Hidden storage',   unit:'module',price:200 },
];

const TV_FINISH = [
  { id:'melamine', name:'Melamine',       mult:1.00, hex:'#e9e5dd' },
  { id:'laminate', name:'Laminate',       mult:1.08, hex:'#d8cdbd' },
  { id:'acrylic',  name:'Acrylic',        mult:1.24, hex:'#27384f' },
  { id:'veneer',   name:'Veneer',         mult:1.32, hex:'#5a3a20' },
  { id:'lacquer',  name:'Lacquer paint',  mult:1.30, hex:'#f5f3ee' },
];

export { TV_LAYOUTS, TV_STORAGE, TV_FINISH };
