// Route chunk "shared_TVUnitPlannerWizard_OfficePlannerWizard_plus3" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: TVUnitPlannerWizard, OfficePlannerWizard, WardrobePlannerWizard, DoorPlannerWizard, KitchenPlannerWizard.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).

// ── Wave 2: planner STEP labels (data arrays stay byte-identical; rendered via trStep) ──
const STEP_KEY = {
  en:{
    'Room shape':'Room shape', 'Dimensions':'Dimensions', 'Openings':'Openings', 'Layout':'Layout',
    'Work triangle':'Work triangle', 'Cabinets':'Cabinets', 'Materials':'Materials',
    'Accessories':'Accessories', 'Quote':'Quote', 'Room type':'Room type', 'Constraints':'Constraints',
    'Profile':'Profile', 'Internals':'Internals', 'Doors':'Doors',
    'Room':'Room', 'Wall':'Wall', 'TV':'TV', 'Storage':'Storage', 'Lighting':'Lighting', 'Desk':'Desk',
    'Type':'Type', 'Location':'Location', 'Opening':'Opening', 'Direction':'Direction',
    'Construction':'Construction', 'Finish':'Finish', 'Style':'Style', 'Glass':'Glass', 'Hardware':'Hardware',
    'Shape':'Shape', 'Size':'Size', 'Finishes':'Finishes', 'Summary':'Summary',
    'Product':'Product', 'AI':'AI', 'Configure':'Configure', 'Visualise':'Visualise',
    'Worktop':'Worktop', 'Appliances':'Appliances',
  },
  ar:{
    'Room shape':'شكل الغرفة', 'Dimensions':'الأبعاد', 'Openings':'الفتحات', 'Layout':'التصميم',
    'Work triangle':'مثلث العمل', 'Cabinets':'الخزائن', 'Materials':'المواد',
    'Accessories':'الإكسسوارات', 'Quote':'عرض السعر', 'Room type':'نوع الغرفة', 'Constraints':'العوائق',
    'Profile':'الملف الشخصي', 'Internals':'التجهيز الداخلي', 'Doors':'الأبواب',
    'Room':'الغرفة', 'Wall':'الجدار', 'TV':'التلفاز', 'Storage':'التخزين', 'Lighting':'الإضاءة', 'Desk':'المكتب',
    'Type':'النوع', 'Location':'الموقع', 'Opening':'الفتحة', 'Direction':'الاتجاه',
    'Construction':'البنية', 'Finish':'التشطيب', 'Style':'الطراز', 'Glass':'الزجاج', 'Hardware':'الإكسسوارات المعدنية',
    'Shape':'الشكل', 'Size':'المقاس', 'Finishes':'التشطيبات', 'Summary':'الملخّص',
    'Product':'المنتج', 'AI':'الذكاء الاصطناعي', 'Configure':'التهيئة', 'Visualise':'المعاينة',
    'Worktop':'سطح العمل', 'Appliances':'الأجهزة',
  },
};

// trStep(label, lang): translate a planner STEP label; falls back to the English literal.
function trStep(label, lang) {
  const tbl = STEP_KEY[lang] || STEP_KEY.en;
  return tbl[label] || label;
}

export { trStep };
