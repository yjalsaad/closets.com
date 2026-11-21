// Shared: HTML shell (real Hub tokens lifted from src/App.js + Arabic font aliasing) for the harness bundles. Nothing here ships to the Hub.
const path = require('path'); const fs = require('fs');
const root = process.env.HUB || process.cwd();
const appSrc = fs.readFileSync(path.join(root, 'src/App.js'), 'utf8');
const t0 = appSrc.indexOf('  :root {', appSrc.indexOf('<style>{`'));
const endMark = '[data-theme="light"] .app-main [style*="0 0 30px"]{ box-shadow:var(--shadow-sm) !important; }';
const tokens = appSrc.slice(t0, appSrc.indexOf(endMark, t0) + endMark.length);
if (!tokens.includes('--space-3') || tokens.includes('${')) throw new Error('tokens');
const fonts = path.join(__dirname, 'fonts');
const ff = [400, 500, 600, 700].map((w) => `@font-face{font-family:"Noto Sans Arabic";font-weight:${w};src:url("file://${fonts}/ibm-plex-sans-arabic-arabic-${w}-normal.woff2") format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF}`).join('\n');
exports.write = (build, title) => fs.writeFileSync(path.join(build, 'index.html'), `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="harness.css"><style>${ff}
${tokens}
:root{--on-brand:#FFFFFF}
html,body{margin:0;background:var(--bg);color:var(--text-1);font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Arabic",sans-serif;font-size:14px}
button,input,select,textarea{font-family:inherit}</style></head><body><div id="root"></div><script src="harness.js"></script></body></html>`);
exports.EXE = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
