const path = require('path'); const fs = require('fs');
const esbuild = require(path.join(process.cwd(), 'node_modules/esbuild'));
const [entry, out, mock] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
esbuild.build({
  entryPoints: [path.resolve(entry)], bundle: true, outfile: path.join(out, 'harness.js'), format: 'iife', platform: 'browser', target: 'chrome100', logLevel: 'warning',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.json': 'json' }, define: { 'process.env.NODE_ENV': '"production"', 'process.env.REACT_APP_LOOK_DEFAULT': '"classic"' },
  plugins: [{ name: 'mock-supa', setup(b) { b.onResolve({ filter: /(^|\/)supaConfig$/ }, () => ({ path: path.resolve(mock) })); } }],
}).then(() => console.log('built', fs.statSync(path.join(out, 'harness.js')).size)).catch((e) => { console.error(String(e.message || e).slice(0, 3000)); process.exit(1); });
