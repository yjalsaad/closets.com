import fs from 'fs';
import path from 'path';
import { COLLECTIONS, COLLECTIONS_META } from '../data';
import { CS, ct } from '../strings';
import { WALL, PLINTH, STAND, LOOK, COLLECTIONS_ID, COLLECTIONS_DEPT, wallPanels, wallWidth, collectionsColliders, collectionsZones, withCollections, splitItems, TIER, tierOf, shouldLoad, LOAD_RADIUS, contrast } from '../layout';
import { buildCollectionQuoteUrl, collectionsReply, collectionsService, isCollectionsIntent, itemLabel, keyStep, stepIndex, swipeStep } from '../logic';
import { HALL, BAY, COLUMNS } from '../../3d/dimensions';
import { PALETTE } from '../../3d/palette';
import { buildGraph, routeTo, shortestPath } from '../../navigation/navgraph';
import { PLAYER, buildColliders, isFree, segmentClear, moveCircle } from '../../navigation/colliders';
import { allZones, interactionZones, zoneAt } from '../../navigation/interaction';
import { parseBookingPrefill, NOTES_MAX } from '../../products/quote';
import { RECEPTION } from '../../staff/roster';

const fetcher = require('../../../../scripts/showroom3d-qa/fetch-collections.js');
const ROOT = path.resolve(__dirname, '../../../..'), PUB = path.join(ROOT, 'public');
const R = PLAYER.radius, open = buildColliders({ doorOpen: 1 }), graph = withCollections(buildGraph());
const both = (o) => !!o && typeof o.en === 'string' && o.en.trim() !== '' && typeof o.ar === 'string' && o.ar.trim() !== '';
const hasArabic = (s) => /[؀-ۿ]/.test(s);

describe('collections data (generated from the owner site)', () => {
  test('every collection has an id, bilingual name / eyebrow / description, a category, materials and the source URL', () => {
    expect(COLLECTIONS.length).toBeGreaterThan(0); expect(new Set(COLLECTIONS.map((c) => c.id)).size).toBe(COLLECTIONS.length);
    for (const c of COLLECTIONS) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/); expect(both(c.name)).toBe(true); expect(both(c.eyebrow)).toBe(true); expect(both(c.description)).toBe(true); expect(both(c.countLabel)).toBe(true);
      expect(hasArabic(c.name.ar)).toBe(true); expect(hasArabic(c.description.ar)).toBe(true); expect(typeof c.arNeedsReview).toBe('boolean');
      expect(c.category).toBeTruthy(); expect(c.sourceUrl).toMatch(/^https:\/\/yas-holding-website\.vercel\.app\//);
      expect(c.materials.length).toBeGreaterThan(0); for (const m of c.materials) { expect(both(m)).toBe(true); expect(c.description.en.toLowerCase()).toContain(m.en.toLowerCase()); }
    }
  });
  test('the site collection: "Collection 2023-2025" with its 36 finishes, unique ids, names and reference codes as on the page', () => {
    const c = COLLECTIONS[0]; expect(c.name.en).toBe('Collection 2023–2025'); expect(c.name.ar).toBe('مجموعة 2023–2025'); expect(c.items).toHaveLength(36);
    expect(new Set(c.items.map((x) => x.id)).size).toBe(36);
    for (const it of c.items) { expect(it.id).toMatch(/^[a-z0-9-]+$/); expect(both(it.name)).toBe(true); expect(both(it.alt)).toBe(true); expect(typeof it.code).toBe('string'); expect(it.sourceImage).toMatch(/^https:\/\/www\.yas-wood\.com\/static\/media\/.+\.jpg$/); }
    expect(c.items.find((x) => x.name.en === 'Kaiser Walnut').code).toBe('102019 TX04'); expect(c.items.find((x) => x.name.en === 'Charcoal').code).toBe('');
    expect(c.items.filter((x) => x.name.en === 'Callahan').map((x) => x.code)).toEqual(['109037 TX04', '109039 TX04']);
  });
  test('meta counts match the data', () => {
    const items = COLLECTIONS.flatMap((c) => c.items), withImage = items.filter((x) => x.image);
    expect(COLLECTIONS_META.items).toBe(items.length); expect(COLLECTIONS_META.itemsWithImage).toBe(withImage.length); expect(COLLECTIONS_META.imagesMissing).toBe(items.length - withImage.length);
    for (const c of COLLECTIONS) expect(c.images).toHaveLength(c.items.filter((x) => x.image).length);
  });
  test('docs/showroom3d/collections.json carries the same collections (the export for a future Hub section)', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/showroom3d/collections.json'), 'utf8'));
    expect(j.$schema).toBe('yas-bloom/collections@1'); expect(j.collections).toEqual(COLLECTIONS);
  });
});

describe('collection images on disk', () => {
  const L = COLLECTIONS_META.limits, files = [];
  for (const c of COLLECTIONS) for (const it of c.items) if (it.image) for (const k of ['small', 'thumb', 'hero']) if (it.image[k]) files.push({ it, k, rel: it.image[k] });
  test('every referenced image exists, is WebP under /yas-bloom/collections and within its size limit', () => {
    for (const f of files) {
      expect(f.rel).toMatch(/^\/yas-bloom\/collections\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/); const p = path.join(PUB, f.rel);
      expect([f.rel, fs.existsSync(p)]).toEqual([f.rel, true]);
      const max = f.k === 'hero' ? L.heroBytes : f.k === 'thumb' ? L.thumbBytes : L.smallBytes; expect([f.rel, fs.statSync(p).size <= max]).toEqual([f.rel, true]);
      expect(String(fs.readFileSync(p).subarray(8, 12))).toBe('WEBP');
    }
  });
  test('the whole image set stays inside the 4 MB budget and no file on disk is unreferenced', () => {
    const dir = path.join(PUB, 'yas-bloom/collections'), onDisk = [];
    const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(d, e.name)); else if (/\.(webp|jpe?g|png)$/i.test(e.name)) onDisk.push(path.join(d, e.name)); } };
    walk(dir);
    expect(onDisk.reduce((n, p) => n + fs.statSync(p).size, 0)).toBeLessThanOrEqual(L.totalBytes);
    const refs = new Set(files.map((f) => path.join(PUB, f.rel))); for (const p of onDisk) expect([p, refs.has(p)]).toEqual([p, true]);
  });
  test('limits are the agreed ones: hero 1600 px / 180 KB, thumb 800 px / 60 KB, total 4 MB', () => {
    expect(L).toMatchObject({ heroPx: 1600, heroBytes: 180 * 1024, thumbPx: 800, thumbBytes: 60 * 1024, totalBytes: 4 * 1024 * 1024 });
  });
});

describe('fetch-collections.js parser (the refresh script)', () => {
  const js = 'x={"collection.hero.eyebrow":{en:"YAS Wood · Finishes",ar:"يس وود · التشطيبات"},"collection.hero.title":{en:"Collection 2023–2025",ar:"مجموعة 2023–2025"},"collection.hero.sub":{en:"Wood, stone and solid melamine.",ar:"خشب وحجر."},"collection.count":{en:"finishes in this collection",ar:"تشطيباً"},"collection.cta":{en:"Request samples",ar:"اطلب عيّنات"}},cm="https://www.yas-wood.com/static/media/",M=(e,t,n)=>({name:e,code:t,img:cm+n}),Ti=[M("Abisko Ash","30181 TX04","abisko.1.jpg"),M("Charcoal","","charcoal.2.jpg"),M("Callahan","1","c1.jpg"),M("Callahan","1","c2.jpg")]';
  test('reads the strings, the media base and the finishes; nothing else is added', () => {
    const p = fetcher.parseBundle(js); expect(p.base).toBe('https://www.yas-wood.com/static/media/'); expect(p.items).toHaveLength(4); expect(p.title.ar).toBe('مجموعة 2023–2025');
    const [c] = fetcher.toCollections(p); expect(c.id).toBe('collection-2023-2025'); expect(c.items.map((x) => x.id)).toEqual(['abisko-ash-30181-tx04', 'charcoal', 'callahan-1', 'callahan-1-2']);
    expect(c.items[0].sourceImage).toBe('https://www.yas-wood.com/static/media/abisko.1.jpg'); expect(c.items.every((x) => x.image === null)).toBe(true); expect(c.images).toEqual([]);
  });
  test('downloaded images are attached to their finish and listed on the collection', () => {
    const p = fetcher.parseBundle(js), [c] = fetcher.toCollections(p, { charcoal: { small: '/s.webp', thumb: '/t.webp', hero: '/h.webp', w: 1600, h: 1200 } });
    expect(c.items[1].image.hero).toBe('/h.webp'); expect(c.images).toEqual([{ src: '/h.webp', alt: c.items[1].alt, w: 1600, h: 1200 }]);
  });
});

describe('EN / AR parity', () => {
  test('every UI string has both languages, the Arabic is Arabic, and placeholders match', () => {
    for (const [k, s] of Object.entries(CS)) { expect([k, both(s)]).toEqual([k, true]); expect([k, hasArabic(s.ar)]).toEqual([k, true]); expect([k, (s.ar.match(/\{\w+\}/g) || []).sort()]).toEqual([k, (s.en.match(/\{\w+\}/g) || []).sort()]); }
    expect(ct('title', 'ar')).toBe('المجموعات'); expect(ct('title', 'en')).toBe('Collections'); expect(ct('nope', 'en')).toBe('nope');
    expect(both(COLLECTIONS_DEPT)).toBe(true);
  });
});

describe('feature wall placement, collider, zone', () => {
  const half = wallWidth() / 2, [col] = collectionsColliders(), [zone] = collectionsZones();
  test('the wall sits on the inside face of the right front wing, inside the wing width, below the 4.5 m walnut line', () => {
    expect(WALL.x - half).toBeGreaterThan(HALL.glassHalf); expect(WALL.x + half).toBeLessThan(HALL.halfWidth); expect(WALL.z).toBeCloseTo(-0.81, 6);
    expect(WALL.y + WALL.panelH / 2 + 0.31).toBeLessThan(4.5); expect(WALL.y - WALL.panelH / 2).toBeGreaterThan(PLINTH.h);
    const ps = wallPanels(); expect(ps.map((p) => p.kind)).toEqual(['finishes', 'title', 'finishes']);
    for (let i = 1; i < ps.length; i++) expect(ps[i - 1].x - ps[i].x).toBeGreaterThanOrEqual((ps[i - 1].w + ps[i].w) / 2 + WALL.gap - 1e-9);    // no overlap; left of the viewer = +x
  });
  test('both side panels together show every finish of the collection once', () => {
    const [a, b] = splitItems(); expect(a.length + b.length).toBe(COLLECTIONS[0].items.length); expect(new Set([...a, ...b].map((x) => x.id)).size).toBe(36); expect(a).toHaveLength(WALL.cols * WALL.rows);
  });
  test('the collider is part of the scene colliders, covers the plinth and blocks the walker', () => {
    expect(open.find((c) => c.id === 'collections-wall')).toEqual(col);
    expect(col.minZ).toBeLessThanOrEqual(WALL.z - PLINTH.depth); expect(col.minX).toBeLessThanOrEqual(WALL.x - half); expect(col.maxX).toBeGreaterThanOrEqual(WALL.x + half); expect(col.minX).toBe(HALL.glassHalf); expect(col.maxX).toBeGreaterThanOrEqual(HALL.halfWidth);   // full wing width: no pocket narrower than the walker
    const p = moveCircle([WALL.x, -3], 0, 5, R, open); expect(p[1]).toBeLessThanOrEqual(col.minZ - R + 1e-6); expect(isFree(WALL.x, WALL.z - 0.2, R, open)).toBe(false);
  });
  test('it blocks no aisle: clear of the bays, lanes, planters, columns, the doorway and the Reception desk', () => {
    expect(col.minZ).toBeGreaterThan(BAY.startZ + 3);                                             // > 3 m of floor between the plinth and the first bay
    expect(Math.hypot(col.minX - 13, col.minZ + 5.2)).toBeGreaterThan(0.95 + 2 * R + 2); expect(segmentClear([8, -2.2], [21.6, -2.2], R, open)).toBe(true);          // 2 m+ of free floor between the planter at (13, -5.2) and the wall
    expect(col.minX).toBeGreaterThan(HALL.doorHalfOpening + 10); expect(col.minX).toBeGreaterThanOrEqual(HALL.glassHalf); expect(col.minX).toBeGreaterThan(RECEPTION.desk.x + RECEPTION.desk.hx);
    for (const c of COLUMNS) expect(c.z).toBeLessThan(col.minZ - 5);
    for (const x of [14.6, 16, 18, 20, 21.6]) expect(segmentClear([x, -3.9], [x, col.minZ - R - 0.01], R, open)).toBe(true);     // the strip in front of it is walkable right up to the plinth (the Doors bay display starts at z = -4.45)
    expect(segmentClear([14.5, -2.6], [21.6, -2.6], R, open)).toBe(true);
  });
  test('the interaction zone is the floor strip in front of the wall and overlaps no other zone', () => {
    expect(zone).toMatchObject({ id: COLLECTIONS_ID, collections: true }); expect(zoneAt([zone], STAND[0], STAND[1])).toBe(zone);
    for (const o of allZones()) expect([o.id, zone.maxX <= o.minX || zone.minX >= o.maxX || zone.maxZ <= o.minZ || zone.minZ >= o.maxZ]).toEqual([o.id, true]);
    expect(zoneAt(interactionZones(), STAND[0], STAND[1])).toBeNull(); expect(zoneAt([zone], 0, -9)).toBeNull(); expect(zoneAt([zone], 8, -3.5)).toBeNull();
  });
  test('from the stand point the whole composition fits a 16:9 view and the look target is the wall', () => {
    const d = Math.abs(STAND[1] - WALL.z), halfFov = Math.atan(half / d) * 180 / Math.PI; expect(d).toBeGreaterThanOrEqual(3); expect(halfFov).toBeLessThan(50);
    expect(LOOK[0]).toBe(WALL.x); expect(LOOK[2]).toBe(WALL.z); expect(isFree(STAND[0], STAND[1], R, open)).toBe(true);
  });
});

describe('navgraph with the Collections stop', () => {
  test('the department graph itself is unchanged; the gallery is added as a 10th stop', () => {
    const base = buildGraph(); expect(base.stops).toHaveLength(9); expect(base.nodes['stand-collections']).toBeUndefined();
    expect(graph.stops).toHaveLength(10); expect(graph.stops[9]).toMatchObject({ id: COLLECTIONS_ID, stand: STAND }); expect(graph.stops.slice(0, 9)).toEqual(base.stops);
  });
  test('every node is free and every edge is a collision-free walk (with the wall collider in place)', () => {
    for (const [k, p] of Object.entries(graph.nodes)) expect([k, isFree(p[0], p[1], R, open)]).toEqual([k, true]);
    for (const [a, b] of graph.edges) expect([a, b, segmentClear(graph.nodes[a], graph.nodes[b], R, open)]).toEqual([a, b, true]);
  });
  test('reachable from the street, the lobby and every other stop, and every other stop from it', () => {
    for (const from of ['street', 'lobby', ...graph.stops.map((s) => 'stand-' + s.id)]) { expect(shortestPath(graph, from, 'stand-collections')).not.toBeNull(); expect(shortestPath(graph, 'stand-collections', from)).not.toBeNull(); }
  });
  test('a clear route exists from a grid of standable points (no straight-line fallback) and can be walked with the collision model', () => {
    let tested = 0;
    for (let x = -21; x <= 21; x += 3) for (let z = -35; z <= -1; z += 2.5) { if (!isFree(x, z, R, open)) continue; const r = routeTo(graph, [x, z], COLLECTIONS_ID, open); if (x > -5.5 && x < 5.5 && z < -27) continue; expect([x, z, !!r && !r.direct]).toEqual([x, z, true]); for (let i = 1; i < r.points.length; i++) expect(segmentClear(r.points[i - 1], r.points[i], R, open)).toBe(true); tested++; }
    expect(tested).toBeGreaterThan(100);
    const r = routeTo(graph, [0, -9], COLLECTIONS_ID, open); let p = r.points[0];
    for (const w of r.points.slice(1)) for (let i = 0; i < 400 && Math.hypot(w[0] - p[0], w[1] - p[1]) > 0.05; i++) { const d = Math.hypot(w[0] - p[0], w[1] - p[1]), st = Math.min(d, 0.1); p = moveCircle(p, ((w[0] - p[0]) / d) * st, ((w[1] - p[1]) / d) * st, R, open); }
    expect(Math.hypot(p[0] - STAND[0], p[1] - STAND[1])).toBeLessThan(0.3);
  });
});

describe('legibility, quality tiers, lazy loading', () => {
  test('lightbox type: ink and the secondary walnut on the lit face are far above 4.5:1', () => {
    expect(contrast(PALETTE.ink, PALETTE.paperWhite)).toBeGreaterThan(12); expect(contrast(PALETTE.walnutDeep, PALETTE.paperWhite)).toBeGreaterThan(7);
    expect(contrast(PALETTE.walnutDeep, PALETTE.shadeLinen)).toBeGreaterThan(4.5); expect(contrast(PALETTE.paperWhite, PALETTE.ink)).toBeGreaterThan(12);     // the hint pill is reversed
    expect(contrast(0x000000, 0xffffff)).toBeCloseTo(21, 5);
  });
  test('finish names are at least 6 cm tall on the wall (readable from the 3.2 m stand point)', () => {
    const emMetres = (px) => px * WALL.panelH / 1000; expect(emMetres(31)).toBeGreaterThanOrEqual(0.06); expect(emMetres(23)).toBeGreaterThanOrEqual(0.05);
  });
  test('low tier: half-size canvases, small images, no over-bright backlight (no bloom) and no LED line; unknown tier = low', () => {
    expect(TIER.low).toMatchObject({ tex: 512, glow: 1, picLight: false, image: 'small' }); expect(TIER.high.glow).toBeGreaterThan(1); expect(TIER.medium.glow).toBe(1); expect(tierOf('nope')).toBe(TIER.low);
  });
  test('images load only near the wall', () => {
    expect(shouldLoad(STAND[0], STAND[1])).toBe(true); expect(shouldLoad(0, -9)).toBe(false); expect(shouldLoad(0, 20)).toBe(false); expect(shouldLoad(WALL.x - LOAD_RADIUS, WALL.z)).toBe(true);
  });
});

describe('panel logic', () => {
  test('gallery stepping wraps both ways; arrow keys follow the reading direction; swipes need a clear horizontal move', () => {
    expect(stepIndex(0, -1, 36)).toBe(35); expect(stepIndex(35, 1, 36)).toBe(0); expect(stepIndex(3, 1, 36)).toBe(4); expect(stepIndex(0, 1, 0)).toBe(0);
    expect(keyStep('ArrowRight')).toBe(1); expect(keyStep('ArrowLeft')).toBe(-1); expect(keyStep('ArrowRight', true)).toBe(-1); expect(keyStep('ArrowLeft', true)).toBe(1); expect(keyStep('Home')).toBe('first'); expect(keyStep('End')).toBe('last'); expect(keyStep('a')).toBe(0);
    expect(swipeStep(-80, 5)).toBe(1); expect(swipeStep(80, 5)).toBe(-1); expect(swipeStep(-80, 5, true)).toBe(-1); expect(swipeStep(-20, 0)).toBe(0); expect(swipeStep(-60, 90)).toBe(0);
  });
  test('the quote link goes to the existing booking page with a known interest and controlled notes', () => {
    const c = COLLECTIONS[0], it = c.items.find((x) => x.name.en === 'Kaiser Walnut'), u = buildCollectionQuoteUrl({ collectionId: c.id, itemId: it.id, lang: 'en' });
    expect(u.startsWith('/booking?')).toBe(true); const pre = parseBookingPrefill(u.slice(u.indexOf('?')));
    expect(pre.interest).toBe('Other'); expect(pre.notes).toContain('Collection: YAS Wood Collection 2023–2025'); expect(pre.notes).toContain('Finish: Kaiser Walnut 102019 TX04'); expect(pre.notes).toContain('not a quotation'); expect(pre.notes.length).toBeLessThanOrEqual(NOTES_MAX);
    const q = new URLSearchParams(u.slice(u.indexOf('?'))); expect(q.get('source')).toBe('showroom-3d-collections'); expect(q.get('collection')).toBe(c.id); expect(q.get('finish')).toBe(it.id);
    const ar = buildCollectionQuoteUrl({ collectionId: c.id, itemId: it.id, lang: 'ar' }); expect(ar.startsWith('/ar/booking?')).toBe(true); expect(parseBookingPrefill(ar.slice(ar.indexOf('?'))).notes).toContain('المجموعة: YAS Wood مجموعة 2023–2025');
    expect(itemLabel(it)).toBe('Kaiser Walnut 102019 TX04');
  });
  test('only data can reach the link: unknown collection = no link, unknown / hostile finish id is dropped', () => {
    expect(buildCollectionQuoteUrl({ collectionId: '<script>' })).toBeNull();
    const u = buildCollectionQuoteUrl({ collectionId: COLLECTIONS[0].id, itemId: '"><img src=x onerror=alert(1)>' }); expect(u).not.toMatch(/img|onerror|finish=/i); expect(parseBookingPrefill(u.slice(u.indexOf('?'))).notes).not.toContain('Finish');
  });
});

describe('advisers: the "collections" intent', () => {
  test('English and Arabic requests are recognised; ordinary room requests are not', () => {
    for (const s of ['show me the collections', 'Do you have a finishes collection?', 'اعرض المجموعات', 'أرني المجموعة', 'أين المجموعات؟', '#go:collections', 'can I see swatches']) expect([s, isCollectionsIntent(s)]).toEqual([s, true]);
    for (const s of ['show me the kitchens', 'I need a wardrobe', 'اعرض المطابخ', 'hello', '', '#go:kitchens', '#services']) expect([s, isCollectionsIntent(s)]).toEqual([s, false]);
  });
  test('the reply has the guide shape, walks the visitor there and never states a price or a promise', () => {
    expect(collectionsReply('show me the kitchens')).toBeNull();
    for (const lang of ['en', 'ar']) {
      const r = collectionsReply(lang === 'ar' ? 'اعرض المجموعات' : 'show me the collections', { lang, memory: { turns: 2, room: 'kitchens' } });
      expect(r).toMatchObject({ intent: 'collections', askAi: false, chips: [], auto: { type: 'glide', id: COLLECTIONS_ID } }); expect(r.actions[0]).toMatchObject({ type: 'glide', id: COLLECTIONS_ID }); expect(both(r.actions[0].label)).toBe(true);
      expect(r.memory).toEqual({ turns: 3, room: 'kitchens' }); expect(r.text).not.toMatch(/\d|BHD|BD|price|discount|guarantee|سعر|خصم/i); expect(hasArabic(r.text)).toBe(lang === 'ar');
    }
    expect(graph.stops.some((s) => s.id === collectionsReply('collections').auto.id)).toBe(true);        // the glide target exists in the explorer graph
    expect(collectionsService('en')).toEqual({ id: 'collections', label: 'Collections', blurb: CS.guideBlurb.en, room: 'collections', href: null }); expect(collectionsService('ar').label).toBe('المجموعات');
  });
});
