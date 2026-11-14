/* Tiny static server for QA: serves a CRA build dir with the same SPA fallback Vercel's rewrites give /yas-bloom and /ar/yas-bloom (the old /showroom-3d redirects client-side).
 * usage: node scripts/showroom3d-qa/serve.js <buildDir> [port] */
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2] || 'build'), port = Number(process.argv[3] || 5055);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.setHeader('Accept-Ranges', 'bytes');
  const size = fs.statSync(f).size, m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');   // byte ranges, as the production host serves them (video seeking needs them)
  if (m && (m[1] || m[2])) { const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])), end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; if (start > end || start >= size) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${size}`); return res.end(); }
    res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`); res.setHeader('Content-Length', end - start + 1); return fs.createReadStream(f, { start, end }).pipe(res); }
  res.setHeader('Content-Length', size); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('serving', dir, 'on', port));
