const A = require('./analyze.js');
const { units, byName, src } = A;
const LAZY_NAMES = (process.env.LAZY || `ProductsPage ProductDetailPage HomeHub CheckoutPage AboutPage PlannerGuidePage ContactPage DirectoryPage ShowroomsPage BlogPage CareersPage OffersPage FaqPage BookingPage ServicesPage PortfolioPage MaintenancePage WarrantyPage AiYasPage DesignLabPage AIDesignerPage WardrobesPage KitchenPage KitchenPlannerWizard TVUnitPlannerWizard DoorPlannerWizard WardrobePlannerWizard OfficePage TVUnitPage DoorsPage OfficePlannerWizard DesignBuilderPage PlannerPage CategoryPage`).split(/\s+/);
const lazyIdx = new Set(LAZY_NAMES.map(n => { const u = byName.get(n); if (!u) throw new Error('no ' + n); return u.i; }));
// eager roots: App + all units with no names (side effect statements) + imports? (imports are not roots)
const eager = new Set();
const stack = [];
units.forEach(u => { if (u.names.length === 0 && !u.isImport) { eager.add(u.i); stack.push(u.i); } });
const appU = byName.get('App'); eager.add(appU.i); stack.push(appU.i);
while (stack.length) { const i = stack.pop(); for (const r of units[i].refs) { if (lazyIdx.has(r)) continue; if (!eager.has(r)) { eager.add(r); stack.push(r); } } }
// lazy-eager overlap check
// R(d): lazy roots reaching d
const R = units.map(() => new Set());
for (const root of lazyIdx) {
  const seen = new Set([root]); const st = [root];
  while (st.length) { const i = st.pop(); R[i].add(root); for (const r of units[i].refs) if (!seen.has(r)) { seen.add(r); st.push(r); } }
}
const groups = new Map();
units.forEach(u => { if (u.isImport || eager.has(u.i) || R[u.i].size === 0) return; const k = [...R[u.i]].sort((a, b) => a - b).join(','); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(u.i); });
const dead = units.filter(u => !u.isImport && !eager.has(u.i) && R[u.i].size === 0 && u.names.length);
module.exports = { units, eager, R, groups, lazyIdx, dead, LAZY_NAMES };
if (require.main === module) {
  const lines = (u) => u.node.loc.end.line - u.node.loc.start.line + 1;
  const sz = (ids) => ids.reduce((a, i) => a + lines(units[i]), 0);
  console.log('eager units', eager.size, 'lines', sz([...eager].filter(i => !units[i].isImport)));
  console.log('groups', groups.size);
  for (const [k, ids] of [...groups].sort((a, b) => sz(b[1]) - sz(a[1]))) console.log(k.split(',').map(i => units[i].names[0]).join('+').slice(0, 90), '|', ids.length, 'units', sz(ids), 'lines');
  console.log('dead (stay in App.js):', dead.map(u => u.names.join(',') + ':' + lines(u)).join(' '));
  console.log('eager big:', [...eager].map(i => units[i]).filter(u => lines(u) > 100).map(u => u.names[0] + ':' + lines(u)).join(' '));
}
