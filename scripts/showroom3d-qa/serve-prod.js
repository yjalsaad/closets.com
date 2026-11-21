/* Static server that behaves like the production host for the things the preload QA measures: brotli / gzip for text types, a strong ETag + 304 revalidation, the SPA fallback for /yas-bloom,
 * byte ranges, and the REAL production Cache-Control values (measured with curl -I against the live site, 2026-11-15):
 *   /static/**                      s-maxage=31536000, immutable   (no max-age: a browser has no freshness lifetime, it revalidates with the ETag)
 *   everything else (yas-bloom/**)  public, max-age=0, must-revalidate
 * HEADERS=proposed serves the vercel.json snippet from docs/showroom3d/BLOOM-PRELOAD.md instead (static: max-age=31536000 immutable; yas-bloom assets: max-age=3600, stale-while-revalidate).
 * HEADERS=vercel emulates the whole of vercel.json (rewrites + headers, see vercel-emu.js; VERCEL_JSON=<file> picks another config, e.g. the one of main).
 * usage: [NOFILM=1] [HEADERS=prod|proposed] node scripts/showroom3d-qa/serve-prod.js <buildDir> [port]      GET /__log returns every request served (JSON), GET /__reset clears it */
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const dir = path.resolve(process.argv[2] || 'build'), port = Number(process.argv[3] || 5055), MODE = process.env.HEADERS || 'prod';
const VJ = MODE === 'vercel' ? JSON.parse(fs.readFileSync(process.env.VERCEL_JSON || path.join(__dirname, '../../vercel.json'), 'utf8')) : null;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt', '.hdr': 'application/octet-stream', '.txt': 'text/plain', '.xml': 'application/xml' };
const compressible = new Set(['.html', '.js', '.css', '.json', '.svg', '.vtt', '.hdr', '.txt', '.xml']);
const cache = new Map(), log = [];   // path -> { buf, br, gz, etag }
function entry(f) {
  const st = fs.statSync(f), k = f + st.mtimeMs; let e = cache.get(k); if (e) return e;
  const buf = fs.readFileSync(f), ext = path.extname(f); e = { buf, etag: '"' + crypto.createHash('md5').update(buf).digest('hex') + '"', ext };
  if (compressible.has(ext) && buf.length > 512) { e.br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }); e.gz = zlib.gzipSync(buf, { level: 6 }); }
  cache.set(k, e); return e;
}
const cc = (p) => (/^\/static\//.test(p) ? (MODE === 'proposed' ? 'public, max-age=31536000, immutable' : 's-maxage=31536000, immutable') : (MODE === 'proposed' && /^\/yas-bloom\/(?!film\/films?\.json)/.test(p) ? 'public, max-age=3600, stale-while-revalidate=86400' : 'public, max-age=0, must-revalidate'));
http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/__log') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(log)); return; }
  if (p === '/__reset') { log.length = 0; res.end('ok'); return; }
  if (process.env.NOFILM && /\.(mp4|webm)$/.test(p)) { log.push({ t: Date.now(), url: req.url, status: 503, bytes: 0 }); res.writeHead(503); res.end(); return; }
  let f = path.join(dir, p), vh = null; if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
  if (MODE === 'vercel') { const r = require('./vercel-emu').route(VJ, dir, p); if (r.status !== 200) { log.push({ t: Date.now(), url: req.url, status: 404, bytes: 0 }); res.writeHead(404); res.end('404'); return; } f = r.file; vh = r.headers; }
  const isIndex = f === path.join(dir, 'index.html'), e = entry(f), ae = String(req.headers['accept-encoding'] || '');
  const h = { 'content-type': types[e.ext] || 'application/octet-stream', etag: e.etag, 'cache-control': isIndex ? 'public, max-age=0, must-revalidate' : cc(p), 'accept-ranges': 'bytes', vary: 'Accept-Encoding', ...(vh || {}) };
  const rec = { t: Date.now(), url: req.url, status: 200, bytes: 0, inm: !!req.headers['if-none-match'] }; log.push(rec);
  if (req.headers['if-none-match'] === e.etag) { rec.status = 304; res.writeHead(304, h); res.end(); return; }
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) { const size = e.buf.length, start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])), end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; rec.status = 206; rec.bytes = end - start + 1; res.writeHead(206, { ...h, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 }); res.end(req.method === 'HEAD' ? undefined : e.buf.subarray(start, end + 1)); return; }
  let body = e.buf; if (e.br && /\bbr\b/.test(ae)) { body = e.br; h['content-encoding'] = 'br'; } else if (e.gz && /\bgzip\b/.test(ae)) { body = e.gz; h['content-encoding'] = 'gzip'; }
  h['content-length'] = body.length; rec.bytes = body.length; res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : body);
}).listen(port, () => console.log('serving', dir, 'on', port, 'headers=' + MODE));
