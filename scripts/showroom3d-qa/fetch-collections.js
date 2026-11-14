#!/usr/bin/env node
/* Regenerates the YAS Bloom "Collections" data (and, when the image host is reachable, the images) from the owner's site
 * https://yas-holding-website.vercel.app/collection .
 *
 *   node scripts/showroom3d-qa/fetch-collections.js              data + images
 *   node scripts/showroom3d-qa/fetch-collections.js --no-images  data only (keeps whatever images are already in public/)
 *
 * The page is a Vite SPA: the collection is embedded in /assets/index-*.js (a `[M("Name","CODE","file.jpg"), ...]` array, the
 * media base URL and the "collection.*" EN / AR strings). Nothing is invented here: a field the bundle does not carry stays empty.
 * Images: the swatches are served from www.yas-wood.com. Each one is converted to WebP: a thumb (<= 800 px, <= 60 KB) and a small
 * copy (<= 320 px, <= 20 KB, used by the low quality tier) for every finish, then heroes (<= 1600 px, <= 180 KB) in page order while the total stays under 4 MB. A swatch that cannot be downloaded
 * is reported and left out (the showroom then shows the name + reference code tile instead).
 * Tools: curl (honours HTTPS_PROXY) and ImageMagick `convert`. No npm dependency. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SITE = 'https://yas-holding-website.vercel.app';
const PAGE = SITE + '/collection';
const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'src/showroom3d/collections/data.js');
const JSON_OUT = path.join(ROOT, 'docs/showroom3d/collections.json');
const IMG_DIR = path.join(ROOT, 'public/yas-bloom/collections');
const LIMITS = { smallPx: 320, smallBytes: 20 * 1024, thumbPx: 800, thumbBytes: 60 * 1024, heroPx: 1600, heroBytes: 180 * 1024, totalBytes: 4 * 1024 * 1024 };

const curl = (url, out) => execFileSync('curl', ['-sS', '--fail', '--max-time', '60', ...(out ? ['-o', out] : []), url], { maxBuffer: 64 * 1024 * 1024 });
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** pure: parse the bundle text. Exported for the tests. */
function parseBundle(js) {
  const str = (key) => {
    const m = new RegExp('"' + key.replace(/\./g, '\\.') + '":\\{en:"((?:[^"\\\\]|\\\\.)*)",ar:"((?:[^"\\\\]|\\\\.)*)"\\}').exec(js);
    return m ? { en: JSON.parse('"' + m[1] + '"'), ar: JSON.parse('"' + m[2] + '"') } : null;
  };
  const base = (/="(https:\/\/[^"]+\/static\/media\/)"/.exec(js) || [])[1] || '';
  const items = []; const re = /\b[A-Za-z_$]{1,3}\("([^"]+)","([^"]*)","([^"]+\.(?:jpe?g|png|webp))"\)/g; let m;
  while ((m = re.exec(js))) items.push({ name: m[1], code: m[2], file: m[3] });
  return { base, items, eyebrow: str('collection.hero.eyebrow'), title: str('collection.hero.title'), sub: str('collection.hero.sub'), count: str('collection.count'), cta: str('collection.cta') };
}

/** pure: bundle parse -> the data the showroom ships (images filled in later). Exported for the tests. */
function toCollections(parsed, images = {}) {
  const seen = {};
  const items = parsed.items.map((it) => {
    let id = slug(it.name + (it.code ? '-' + it.code : '')); if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1;
    const label = it.code ? `${it.name} (${it.code})` : it.name;
    return { id, name: { en: it.name, ar: it.name }, code: it.code, sourceImage: parsed.base + it.file, alt: { en: `${label} finish swatch`, ar: `عيّنة تشطيب ${label}` }, image: images[id] || null };
  });
  const id = slug(parsed.title.en);
  return [{
    id, brand: 'YAS Wood', category: 'finishes', arNeedsReview: false, sourceUrl: PAGE,
    name: parsed.title, eyebrow: parsed.eyebrow, description: parsed.sub, countLabel: parsed.count, sampleCta: parsed.cta,
    /* the three material families the site's own description names ("wood, stone and solid melamine finishes"); the site does not tag each finish with one */
    materials: [{ en: 'Wood', ar: 'خشب' }, { en: 'Stone', ar: 'حجر' }, { en: 'Solid melamine', ar: 'ميلامين صلب' }],
    images: items.filter((x) => x.image).map((x) => ({ src: x.image.hero || x.image.thumb, alt: x.alt, w: x.image.w, h: x.image.h })),
    items,
  }];
}

function convert(src, out, px, maxBytes) {
  for (const q of [82, 74, 66, 58, 50, 42, 34]) {
    execFileSync('convert', [src, '-auto-orient', '-strip', '-resize', `${px}x${px}>`, '-quality', String(q), 'webp:' + out]);
    if (fs.statSync(out).size <= maxBytes) break;
  }
  const [w, h] = String(execFileSync('identify', ['-format', '%w %h', out])).trim().split(' ').map(Number);
  return { bytes: fs.statSync(out).size, w, h };
}

function fetchImages(cols) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yb-collections-')); const failed = []; const out = {}; let total = 0;
  for (const c of cols) {
    const dir = path.join(IMG_DIR, c.id); fs.mkdirSync(dir, { recursive: true });
    const got = [];
    for (const it of c.items) {
      const raw = path.join(tmp, it.id + path.extname(it.sourceImage));
      try { curl(it.sourceImage, raw); } catch (e) { failed.push(it.sourceImage); continue; }
      const t = convert(raw, path.join(dir, it.id + '-thumb.webp'), LIMITS.thumbPx, LIMITS.thumbBytes);
      if (t.bytes > LIMITS.thumbBytes || total + t.bytes > LIMITS.totalBytes) { fs.unlinkSync(path.join(dir, it.id + '-thumb.webp')); failed.push(it.sourceImage + ' (over budget)'); continue; }
      const sm = convert(raw, path.join(dir, it.id + '-small.webp'), LIMITS.smallPx, LIMITS.smallBytes);
      total += t.bytes + sm.bytes; out[it.id] = { small: `/yas-bloom/collections/${c.id}/${it.id}-small.webp`, thumb: `/yas-bloom/collections/${c.id}/${it.id}-thumb.webp`, hero: null, w: t.w, h: t.h }; got.push([it, raw]);
    }
    for (const [it, raw] of got) {                                   // heroes in page order while the budget lasts
      const file = path.join(dir, it.id + '.webp'); const h = convert(raw, file, LIMITS.heroPx, LIMITS.heroBytes);
      if (h.bytes > LIMITS.heroBytes || total + h.bytes > LIMITS.totalBytes || Math.max(h.w, h.h) <= Math.max(out[it.id].w, out[it.id].h)) { fs.unlinkSync(file); continue; }   // a source no larger than the thumb gets no separate hero (it would be the same file twice)
      total += h.bytes; Object.assign(out[it.id], { hero: `/yas-bloom/collections/${c.id}/${it.id}.webp`, w: h.w, h: h.h });
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return { images: out, failed, total };
}

/** images already on disk (used by --no-images so a data refresh does not drop them) */
function existingImages(cols) {
  const out = {};
  for (const c of cols) for (const it of c.items) {
    const rel = `/yas-bloom/collections/${c.id}/${it.id}`, t = path.join(ROOT, 'public' + rel + '-thumb.webp'), h = path.join(ROOT, 'public' + rel + '.webp');
    if (!fs.existsSync(t)) continue;
    const [w, hh] = String(execFileSync('identify', ['-format', '%w %h', fs.existsSync(h) ? h : t])).trim().split(' ').map(Number);
    out[it.id] = { small: fs.existsSync(path.join(ROOT, 'public' + rel + '-small.webp')) ? rel + '-small.webp' : rel + '-thumb.webp', thumb: rel + '-thumb.webp', hero: fs.existsSync(h) ? rel + '.webp' : null, w, h: hh };
  }
  return out;
}

function write(cols, meta) {
  const head = `/* GENERATED by scripts/showroom3d-qa/fetch-collections.js from ${PAGE} : do not edit by hand, re-run the script.\n * Every string and reference code is the site's own (EN + AR). Finish names are not translated on the site, so name.ar = name.en.\n * image = null means the swatch could not be downloaded when this file was generated: the showroom shows the name + code tile instead. */\n`;
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, `${head}export const COLLECTIONS_META = ${JSON.stringify(meta, null, 2)};\n\nexport const COLLECTIONS = ${JSON.stringify(cols, null, 2)};\n`);
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify({ $schema: 'yas-bloom/collections@1', ...meta, collections: cols }, null, 2) + '\n');
}

function main() {
  const noImages = process.argv.includes('--no-images');
  const html = String(curl(PAGE)); const src = (/src="(\/assets\/index-[^"]+\.js)"/.exec(html) || [])[1];
  if (!src) throw new Error('bundle not found in ' + PAGE);
  const parsed = parseBundle(String(curl(SITE + src)));
  if (!parsed.title || !parsed.items.length) throw new Error('collection data not found in ' + src);
  let cols = toCollections(parsed); let failed = [], total = 0, images;
  if (noImages) images = existingImages(cols); else ({ images, failed, total } = fetchImages(cols));
  cols = toCollections(parsed, images);
  const have = Object.keys(images).length, all = cols.reduce((n, c) => n + c.items.length, 0);
  write(cols, { source: PAGE, bundle: src, limits: LIMITS, items: all, itemsWithImage: have, imagesMissing: all - have, imageHost: parsed.base.replace(/^https:\/\/([^/]+).*$/, '$1') });
  console.log(`collections: ${cols.length}, finishes: ${all}, with image: ${have}${noImages ? ' (images not fetched)' : `, image bytes: ${total}`}`);
  if (failed.length) console.log('could not fetch:\n  ' + failed.join('\n  '));
}

module.exports = { parseBundle, toCollections, LIMITS, slug };
if (require.main === module) main();
