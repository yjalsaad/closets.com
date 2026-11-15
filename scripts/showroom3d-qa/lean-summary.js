/* Summarise waterfall.js runs for the lean-shell comparison: node scripts/showroom3d-qa/lean-summary.js <label>... (files in docs/showroom3d/bloom-preload) */
const fs = require('fs'), path = require('path');
const D = path.resolve(__dirname, '../../docs/showroom3d/bloom-preload');
for (const label of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(path.join(D, label + '.json'), 'utf8'));
  j.visits.forEach((v, i) => {
    const R = v.requests.filter((r) => !/^data:|^blob:/.test(r.u)), net = R.filter((r) => !r.fromDisk && !r.mem && r.bytes !== undefined);
    const sr = R.find((r) => /showroom3d\.[0-9a-f]+\.chunk\.js/.test(r.u)), t0 = sr ? sr.t : null, srEnd = sr ? sr.t + (sr.dur || 0) : null;
    const before = srEnd == null ? [] : net.filter((r) => r.t + (r.dur || 0) <= srEnd);
    const home = R.filter((r) => /^\/user_[A-Za-z0-9]+\/hf_/.test(r.u)), kb = (a) => Math.round(a.reduce((s, r) => s + (r.bytes || 0), 0) / 1024);
    const m = v.marks;
    console.log(`${label} visit ${i + 1}: html ${net.find((r) => r.type === 'Document') ? kb([net.find((r) => r.type === 'Document')]) : 0} KB | bytes on the wire before the showroom chunk is in: ${kb(before)} KB | showroom chunk in at ${srEnd == null ? '-' : (srEnd / 1000).toFixed(1)} s | home PNGs requested: ${home.length} (${kb(home)} KB) | requests ${R.length} (network ${net.length}, ${kb(net)} KB) | first frame (ready) ${(m.ready / 1000).toFixed(1)} s, loader gone ${(m.loaderGone / 1000).toFixed(1)} s | errors ${v.errors.length}`);
  });
}
