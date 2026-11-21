// Codemod: move Arabic strings out of src/App.js (I18N .ar props + CMS_AR) into src/i18n/ar-dict.txt (UTF-8 JSON).
const fs = require('fs'); const parser = require(process.cwd() + '/node_modules/@babel/parser');
process.chdir(process.argv[2]);
let src = fs.readFileSync('src/App.js', 'utf8');
const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
const find = (n) => ast.program.body.find(x => x.type === 'VariableDeclaration' && x.declarations[0].id.name === n);
const i18n = find('I18N').declarations[0].init, cmsAr = find('CMS_AR').declarations[0].init;
const ev = (node) => new Function('return (' + src.slice(node.start, node.end) + ')')();
const keyOf = (p) => p.key.name || p.key.value;
let out = { i18n: {}, cms: {} }; const edits = [];
try { out = JSON.parse(fs.readFileSync('src/i18n/ar-dict.txt', 'utf8')); } catch (e) {}   // merge into an existing dictionary (re-runs)
for (const pr of i18n.properties) {
  const props = pr.value.properties; const en = props.find(p => keyOf(p) === 'en'), ar = props.find(p => keyOf(p) === 'ar');
  if (en && !ar && props.length === 1) continue;   // already stripped
  if (!en || !ar || props.length !== 2) throw new Error('unexpected shape ' + keyOf(pr));
  out.i18n[keyOf(pr)] = ev(ar.value);
  edits.push([en.end, ar.end, '']);
}
for (const pr of cmsAr.properties) out.cms[keyOf(pr)] = ev(pr.value);   // (no-op once CMS_AR is {})
// CMS_AR object literal body -> {}
edits.push([cmsAr.start, cmsAr.end, '{}']);
edits.sort((a, b) => b[0] - a[0]).forEach(([s, e, r]) => { src = src.slice(0, s) + r + src.slice(e); });
fs.writeFileSync('src/App.js', src);
fs.mkdirSync('src/i18n', { recursive: true });
fs.writeFileSync('src/i18n/ar-dict.txt', JSON.stringify(out));
console.log('i18n', Object.keys(out.i18n).length, 'cms', Object.keys(out.cms).length);
