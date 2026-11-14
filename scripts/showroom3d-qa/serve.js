/* Tiny static server for QA: serves a CRA build dir with the same SPA fallback Vercel's rewrites give /yas-bloom and /ar/yas-bloom (the old /showroom-3d redirects client-side).
 * usage: node scripts/showroom3d-qa/serve.js <buildDir> [port] */
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2] || 'build'), port = Number(process.argv[3] || 5055);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt', '.hdr': 'application/octet-stream', '.txt': 'text/plain', '.xml': 'application/xml' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
  const size = fs.statSync(f).size, m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.setHeader('Accept-Ranges', 'bytes');
  if (m && (m[1] || m[2])) {   // byte ranges (like the production static host), so <video> can seek and the film QA can check 206 responses
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])), end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 }); if (req.method === 'HEAD') { res.end(); return; } fs.createReadStream(f, { start, end }).pipe(res); return;
  }
  res.setHeader('Content-Length', size); if (req.method === 'HEAD') { res.end(); return; } fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('serving', dir, 'on', port));
