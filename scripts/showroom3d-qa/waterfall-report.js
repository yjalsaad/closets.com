/* Prints the comparison tables (markdown) from the JSON files waterfall.js wrote to docs/showroom3d/bloom-preload/.
 *   node scripts/showroom3d-qa/waterfall-report.js base-venue after-venue [more labels...] */
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../../docs/showroom3d/bloom-preload');
const labels = process.argv.slice(2); if (!labels.length) { console.error('usage: waterfall-report.js <label> [label...]'); process.exit(1); }
const MANAGED = /^\/(yas-bloom\/(staff|realism|collections|design-studio|profile)\/|brand\/ikhtarha|yas-bloom\/film\/[a-z0-9-]+-poster)/;
const s = (ms) => (ms === undefined || ms === null ? '-' : (ms / 1000).toFixed(1) + ' s');
const kb = (b) => (b / 1024).toFixed(0) + ' KB';
const rows = [];
for (const l of labels) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, l + '.json'), 'utf8'));
  d.visits.forEach((v, i) => {
    const R = v.requests, m = R.filter((q) => MANAGED.test(q.u)), body = m.filter((q) => q.bytes > 1000), home = R.filter((q) => /user_3Fia/.test(q.u));
    const stat = R.filter((q) => /^\/static\//.test(q.u)), longs = v.lt.filter((x) => x[1] >= 1500).length;
    rows.push({ label: l + (d.visits.length > 1 ? (i ? ' / 2nd visit' : ' / 1st visit') : ''), ready: v.marks.ready, explore: v.marks.explore, reqs: R.length, managed: m.length, managedBytes: body.reduce((a, q) => a + q.bytes, 0), lastManaged: m.length ? Math.max(...m.map((q) => q.t + q.dur)) : null,
      home: home.reduce((a, q) => a + q.bytes, 0), staticReq: stat.length, at: v.at || {}, collections: v.stages.collectionsReadyMs, studio: v.stages.studioReadyMs, programs: [v.stages.programsHall, v.stages.programsEnd], blocked: v.lt.reduce((a, x) => a + x[1], 0), longs, cache: v.cacheStorage });
  });
}
console.log('| run | first frame (ready) | explore | requests (all) | managed-asset requests | managed bytes | managed files all in at | realism applied at | long tasks >= 1.5 s | main-thread blocked |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.label} | ${s(r.ready)} | ${s(r.explore)} | ${r.reqs} | ${r.managed} | ${kb(r.managedBytes)} | ${s(r.lastManaged)} | ${s(r.at.realism)} | ${r.longs} | ${(r.blocked / 1000).toFixed(1)} s |`);
