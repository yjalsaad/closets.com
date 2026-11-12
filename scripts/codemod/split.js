// One-off codemods used to split src/App.js into route chunks (split.js) and move Arabic strings out of it (split-ar.js).
// Kept so the split can be re-applied to a newer unsplit App.js:  node scripts/codemod/split.js <repo>  (run from the repo root; see docs/PERF-REPORT.md).
// Codemod: route-level code splitting of src/App.js  (node split.js <repo>)
const fs = require('fs'), path = require('path');
const repo = process.argv[2];
process.chdir(repo);
const P = require('./partition.js');
const { units, eager, R, groups, lazyIdx, dead } = P;
const src = fs.readFileSync('src/App.js', 'utf8');
// ---- text partition
const bounds = []; let prev = 0;
units.forEach((u, i) => {
  const e = u.node.end; let le = src.indexOf('\n', e); if (le < 0) le = src.length;
  const rest = src.slice(e, le);
  const b = /^\s*(\/\/.*|\/\*.*\*\/)?\s*$/.test(rest) ? Math.min(le + 1, src.length) : e;
  bounds.push([prev, i === units.length - 1 ? src.length : b]); prev = b;
});
const text = (i) => src.slice(bounds[i][0], bounds[i][1]);
// ---- module assignment
const modOf = new Map(); // unit idx -> module name
const mods = new Map();  // module name -> {ids:[], roots:[]}
const rootName = (i) => units[i].names[0];
for (const [k, ids] of groups) {
  const roots = k.split(',').map(Number);
  let name;
  if (roots.length === 1) name = rootName(roots[0]);
  else name = 'shared_' + roots.slice(0, 2).map(rootName).join('_') + (roots.length > 2 ? '_plus' + (roots.length - 2) : '');
  let n = name, c = 2; while (mods.has(n)) n = name + (c++);
  mods.set(n, { ids, roots }); ids.forEach(i => modOf.set(i, n));
}
// dead units -> unused module
// dead units stay in App.js (tree-shaken) unless they reference something that moved (fixed point)
const moving = new Set([...groups.values()].flat().concat([...lazyIdx]));
let changed = true; const deadMove = new Set();
while (changed) { changed = false; for (const u of dead) { if (deadMove.has(u.i)) continue; if ([...u.refs].some(r => moving.has(r) || deadMove.has(r))) { deadMove.add(u.i); changed = true; } } }
const deadIds = [...deadMove];
if (deadIds.length) { mods.set('unused', { ids: deadIds, roots: [] }); deadIds.forEach(i => modOf.set(i, 'unused')); }
// non-eager units with no names/no root reach (should not exist) -> error
units.forEach(u => { if (!u.isImport && !eager.has(u.i) && !modOf.has(u.i) && !lazyIdx.has(u.i) && !dead.includes(u)) throw new Error('unassigned ' + u.names); });
// ---- import helpers
const importInfo = new Map(); // local name -> {kind, imported, source, unit}
units.forEach(u => { if (!u.isImport) return; u.node.specifiers.forEach(s => importInfo.set(s.local.name, { type: s.type, imported: s.imported && (s.imported.name || s.imported.value), local: s.local.name, source: u.node.source.value })); });
const fixSrc = (s) => s.startsWith('./') ? '../' + s.slice(2) : s.startsWith('../') ? '../' + s : s;
const lazyUsedByEager = new Set(); // lazy roots referenced by eager units
eager.forEach(i => units[i].refs.forEach(r => { if (lazyIdx.has(r)) lazyUsedByEager.add(r); }));
// which names must be exported from where
const needExport = new Map(); // unit idx -> true
const eagerExports = new Set();
function resolveName(fromMod, name) { // returns {where:'ext'|'app'|'mod', ...}
  const d = [...units].find(u => u.names.includes(name));
  return d;
}
const byName = P.units.reduce((m, u) => { u.names.forEach(n => m.set(n, u)); return m; }, new Map());
const modImports = new Map(); // mod -> {ext: Map(source -> specs[]), app:Set, other: Map(mod -> Set)}
for (const [name, m] of mods) {
  const ext = new Map(), app = new Set(), other = new Map();
  const names = new Set(); m.ids.forEach(i => units[i].refNames.forEach(n => names.add(n)));
  for (const n of names) {
    const d = byName.get(n);
    if (m.ids.includes(d.i)) continue;
    if (d.isImport) { const inf = importInfo.get(n); const s = fixSrc(inf.source); if (!ext.has(s)) ext.set(s, []); ext.get(s).push(inf); }
    else if (modOf.has(d.i)) { const mm = modOf.get(d.i); if (!other.has(mm)) other.set(mm, new Set()); other.get(mm).add(n); needExport.set(d.i, true); }
    else if (lazyIdx.has(d.i) && !eager.has(d.i)) throw new Error('lazy root not in module ' + n);
    else { app.add(n); eagerExports.add(n); }
  }
  modImports.set(name, { ext, app, other });
}
lazyIdx.forEach(i => needExport.set(i, true));
// ---- emit modules
fs.mkdirSync('src/pages', { recursive: true });
const fileOf = (m) => m;
for (const [name, m] of mods) {
  const imp = modImports.get(name); const L = [];
  const rootsNote = m.roots.length ? m.roots.map(rootName).join(', ') : '(none: not reachable from any route)';
  L.push(`// Route chunk "${name}" — split out of App.js for route-level code splitting (perf).`);
  L.push(`// Loaded on demand by: ${rootsNote}.`);
  L.push(`// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).`);
  for (const [s, specs] of imp.ext) {
    const def = specs.find(x => x.type === 'ImportDefaultSpecifier'), ns = specs.find(x => x.type === 'ImportNamespaceSpecifier');
    const named = specs.filter(x => x.type === 'ImportSpecifier').map(x => x.imported === x.local ? x.local : x.imported + ' as ' + x.local);
    const parts = []; if (def) parts.push(def.local); if (ns) parts.push('* as ' + ns.local); if (named.length) parts.push('{ ' + [...new Set(named)].join(', ') + ' }');
    L.push(`import ${parts.join(', ')} from '${s}';`);
  }
  if (imp.app.size) L.push(`import { ${[...imp.app].sort().join(', ')} } from '../App';`);
  for (const [mm, set] of imp.other) L.push(`import { ${[...set].sort().join(', ')} } from './${fileOf(mm)}';`);
  L.push('');
  const ids = [...m.ids].sort((a, b) => a - b);
  ids.forEach(i => L.push(text(i).replace(/^\n+/, '').replace(/\n*$/, '\n')));
  const ex = ids.filter(i => needExport.get(i)).flatMap(i => units[i].names);
  if (ex.length) L.push(`export { ${ex.join(', ')} };`);
  fs.writeFileSync(`src/pages/${fileOf(name)}.jsx`, L.join('\n') + '\n');
}
// ---- rewrite App.js
const out = [];
const keepImports = [];
const eagerNames = new Set(); units.forEach(u => { if (!modOf.has(u.i) && !(lazyIdx.has(u.i) && !eager.has(u.i))) u.refNames.forEach(n => eagerNames.add(n)); });
// imports: keep only specifiers still referenced by eager units
units.forEach(u => {
  if (!u.isImport) return;
  const used = u.node.specifiers.filter(s => eagerNames.has(s.local.name));
  u.__used = used;
});
for (let i = 0; i < units.length; i++) {
  const u = units[i];
  if (u.isImport) {
    if (!u.__used.length) continue;
    const def = u.__used.find(x => x.type === 'ImportDefaultSpecifier');
    const named = u.__used.filter(x => x.type === 'ImportSpecifier').map(x => (x.imported.name || x.imported.value) === x.local.name ? x.local.name : (x.imported.name || x.imported.value) + ' as ' + x.local.name);
    const ns = u.__used.find(x => x.type === 'ImportNamespaceSpecifier');
    const parts = []; if (def) parts.push(def.local.name); if (ns) parts.push('* as ' + ns.local.name); if (named.length) parts.push('{ ' + named.join(', ') + ' }');
    // preserve trailing comment of the original line
    const m = /\/\/.*$/.exec(text(i).split('\n')[0]);
    out.push(`import ${parts.join(', ')} from '${u.node.source.value}';${m ? ' ' + m[0] : ''}\n`);
    continue;
  }
  if (modOf.has(i) || (lazyIdx.has(i) && !eager.has(i))) continue; // moved
  if (u.names.includes('AppInner')) out.push('/*__LAZY_BLOCK__*/\n');
  out.push(text(i));
}
let app = out.join('');
// lazy block
const lazyList = [...lazyUsedByEager].map(i => rootName(i));
const lazyBlock = `// ── Route-level code splitting ───────────────────────────────────────────────
// Every non-home page lives in its own chunk (src/pages/*.jsx) and is loaded on demand, so first-load
// JS holds only the home path. lazyPage() renders a stable-height skeleton until the chunk arrives.
${lazyList.map(n => `const ${n} = lazyPage(() => import(/* webpackChunkName: "page-${n}" */ './pages/${modOf.get(units.find(u => u.names[0] === n).i)}').then(m => m.${n}));`).join('\n')}
`;
app = app.replace('/*__LAZY_BLOCK__*/\n', lazyBlock);
// import lazyPage after last import line
const lastImp = app.lastIndexOf("\nimport ");
const lastImpEnd = app.indexOf('\n', lastImp + 1);
app = app.slice(0, lastImpEnd + 1) + "import lazyPage from './lazyPage';\n" + app.slice(lastImpEnd + 1);
// exports for modules
app = app.replace(/\s*$/, '\n') + `\n// Shared helpers consumed by the route chunks in src/pages/ (they only load after this module has evaluated).\nexport { ${[...eagerExports].sort().join(', ')} };\n`;
fs.writeFileSync('src/App.js', app);
console.log('modules', mods.size, 'eager exports', eagerExports.size, 'lazy in App', lazyList.length);
