import fs from 'fs';
import path from 'path';
import { SECTIONS, SECTION_DEPTS, BYLINE, sectionById, sectionByKind, enabledSections, sectionName, sectionDept, posterUrls } from '../sections';
import { SLOTS, SCREEN, SIGN, BASE, PODIUM, STAND_BACK, WALL_Z, placement, studioColliders, studioZones, withDesignStudio, TIER, tierOf, LOAD_RADIUS, shouldLoad, loopAt, LOOP, ARRIVE_PITCH } from '../layout';
import { DS, dt } from '../strings';
import { buildEmbedUrl, buildSiteUrl, stillOnDesigner, normLang, syncLang, readLang, isSignedIn, headerShift, HEADER_SHIFT, EMBED_CSS, reduce, initialState, isActive, isDirty, DIRTY_AFTER, isEditingKey, escapeShouldClose, designStudioIntent, designStudioReply, designStudioServices, adviserChips, GO_TOKEN, OPEN_TOKEN, LANG_KEY, USER_KEY, SRC_PARAM } from '../logic';
import { HALL } from '../../3d/dimensions';
import { BRAND_LINE } from '../../scenes/main-hall/hall';
import { buildGraph, routeTo, shortestPath } from '../../navigation/navgraph';
import { PLAYER, buildColliders, isFree, segmentClear, moveCircle } from '../../navigation/colliders';
import { allZones, interactionZones, zoneAt } from '../../navigation/interaction';
import { collectionsZones, withCollections, collectionsColliders } from '../../collections/layout';
import { violation, services, reply, opening, newMemory } from '../../staff/guide';
import { staffRoster } from '../../staff/roster';

const R = PLAYER.radius, open = buildColliders({ doorOpen: 1 }), S = SECTIONS[0], P = placement(S);
const graph = withDesignStudio(withCollections(buildGraph()));
const memStore = (init = {}) => { const m = { ...init }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };

describe('sections registry', () => {
  test('the kitchen section is the only enabled one and names the website designer route', () => {
    expect(enabledSections().map((s) => s.id)).toEqual(['kitchen-studio']);
    expect(S).toMatchObject({ kind: 'kitchen', slot: 'left-wing', adviser: 'kitchens' });
    expect(S.designer.path).toBe('/design-studio/kitchen-planner');
    expect(sectionById('kitchen-studio')).toBe(S); expect(sectionById('nope')).toBeNull(); expect(sectionByKind('kitchen')).toBe(S);
  });
  test('names are bilingual, match the owner wording, and the byline equals the hall signage line "by YAS WOOD"', () => {
    expect(S.name).toEqual({ en: 'Kitchen Design Studio', ar: 'استوديو تصميم المطابخ' });
    expect(sectionName(S, 'ar')).toBe('استوديو تصميم المطابخ'); expect(sectionName(S, 'en')).toBe('Kitchen Design Studio'); expect(sectionName(null, 'en')).toBe('');
    expect(BYLINE).toEqual({ en: BRAND_LINE.en[1], ar: BRAND_LINE.ar[1] }); expect(DS.byline).toEqual(BYLINE);
    expect(SECTION_DEPTS).toEqual([sectionDept(S)]); expect(SECTION_DEPTS[0]).toMatchObject({ id: 'kitchen-studio', designStudio: true });
  });
  test('every section has a slot that exists, a unique id and a same-origin designer path', () => {
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
    for (const s of SECTIONS) { expect(SLOTS[s.slot]).toBeTruthy(); expect(s.designer.path).toMatch(/^\/[a-z0-9/-]+$/); expect(s.poster.frames).toBeGreaterThan(0); }
  });
  test('poster URLs: one set per language under /yas-bloom/design-studio/', () => {
    expect(posterUrls(S, 'en', '')).toEqual(['/yas-bloom/design-studio/kitchen-1-en.webp', '/yas-bloom/design-studio/kitchen-2-en.webp', '/yas-bloom/design-studio/kitchen-3-en.webp']);
    expect(posterUrls(S, 'ar', '')[1]).toBe('/yas-bloom/design-studio/kitchen-2-ar.webp');
  });
  test('the shipped poster frames exist, are WebP and each <= 200 KB', () => {
    for (const lang of ['en', 'ar']) for (const u of posterUrls(S, lang, '')) {
      const f = path.resolve(__dirname, '../../../../public' + u); expect(fs.existsSync(f)).toBe(true);
      const b = fs.readFileSync(f); expect(b.slice(0, 4).toString()).toBe('RIFF'); expect(b.slice(8, 12).toString()).toBe('WEBP'); expect(b.length).toBeLessThanOrEqual(200 * 1024);
    }
  });
});

describe('placement: zone, colliders, navigation', () => {
  test('the station sits on the inside face of the LEFT front wing, between the glass wall and the side wall', () => {
    expect(P.side).toBe(-1); expect(P.x).toBe(-18); expect(P.z).toBe(WALL_Z);
    const half = (SCREEN.w + 0.5) / 2; expect(P.x - half).toBeGreaterThan(-HALL.halfWidth); expect(P.x + half).toBeLessThan(-HALL.glassHalf);
    expect(SCREEN.w / SCREEN.h).toBeCloseTo(16 / 9, 2); expect(SCREEN.w).toBe(4.8); expect(SCREEN.h).toBe(2.7);
    expect(SCREEN.cy + SCREEN.h / 2 + SCREEN.bezel).toBeLessThan(SIGN.cy - SIGN.h / 2 + 0.01);       // the sign sits above the bezel
    expect(SIGN.cy + SIGN.h / 2).toBeLessThan(4.5);                                                    // below the walnut / plaster line
    expect(SCREEN.cy - SCREEN.h / 2).toBeCloseTo(BASE.h + 0.07, 1);                                    // the base reaches the screen
  });
  test('the stand point is free, inside the zone, in front of the screen and the whole screen fits one 16:9 view from there', () => {
    expect(isFree(P.stand[0], P.stand[1], R, open)).toBe(true);
    const [z] = studioZones(); expect(zoneAt([z], P.stand[0], P.stand[1])).toBe(z); expect(z).toMatchObject({ id: 'kitchen-studio', designStudio: true, sectionId: 'kitchen-studio' });
    expect(P.stand[1]).toBeCloseTo(WALL_Z - STAND_BACK, 6);
    const half = Math.atan((SCREEN.w / 2 + SCREEN.bezel) / STAND_BACK) * 2 * 180 / Math.PI; expect(half).toBeLessThan(80);   // the 16:9 horizontal fov at the base vertical fov 50 is about 80 degrees
    expect(ARRIVE_PITCH).toBeGreaterThan(0);
  });
  test('the zone overlaps no bay zone, no collections zone, and is clear of the Reception desk, planter and columns', () => {
    const [z] = studioZones();
    for (const o of [...interactionZones(), ...collectionsZones()]) expect(z.minX >= o.maxX || z.maxX <= o.minX || z.minZ >= o.maxZ || z.maxZ <= o.minZ).toBe(true);
    expect(allZones().some((q) => q.id === 'kitchen-studio')).toBe(false);                    // the existing zone set is untouched; the explorer prepends the studio zone
  });
  test('colliders: the base spans the whole wing, the podium is a solid peninsula joined to it (no pocket narrower than the walker)', () => {
    const [wall, pod] = studioColliders(); expect(wall.id).toBe('kitchen-studio-wall'); expect(pod.id).toBe('kitchen-studio-podium');
    expect(wall.maxX).toBe(-HALL.glassHalf); expect(wall.minX).toBeLessThanOrEqual(-HALL.halfWidth);
    expect(pod.maxZ).toBe(wall.minZ);                                                         // joined
    expect(pod.maxX - pod.minX).toBeCloseTo(PODIUM.w, 6);
    const free = (x, z) => isFree(x, z, R, open);
    expect(free(P.x, P.z - 0.5)).toBe(false); expect(free(P.podium.x, P.podium.z)).toBe(false);
    expect(free(pod.minX - R - 0.05, P.podium.z)).toBe(true); expect(free(pod.maxX + R + 0.05, P.podium.z)).toBe(true);   // you can walk round it
    expect(moveCircle([-16.2, -9], 0, 99, R, open)[1]).toBeCloseTo(wall.minZ - R, 3);
    expect(moveCircle([P.x, P.stand[1]], 0, 99, R, open)[1]).toBeCloseTo(pod.minZ - R, 3);   // walking at the podium stops at it
  });
  test('the quick-nav graph: stop 11 with a lane and stand node; the original graphs are not mutated', () => {
    const base = buildGraph(), g = withDesignStudio(base);
    expect(g.stops[g.stops.length - 1]).toMatchObject({ id: 'kitchen-studio', index: 11, designStudio: true, stand: P.stand, look: P.look, pitch: ARRIVE_PITCH });
    expect(g.nodes['stand-kitchen-studio']).toEqual(P.stand); expect(g.nodes['lane-kitchen-studio']).toEqual(P.lane);
    expect(base.stops.some((s) => s.id === 'kitchen-studio')).toBe(false); expect(base.nodes['stand-kitchen-studio']).toBeUndefined();
    expect(graph.stops.map((s) => s.index)).toEqual([...Array(8).keys()].map((i) => i + 1).concat([9, 10, 11]));
  });
  test('every node is standable, every edge is walkable, every stop is reachable from the street, the spawn and every other stop', () => {
    for (const [k, p] of Object.entries(graph.nodes)) expect([k, isFree(p[0], p[1], R, open)]).toEqual([k, true]);
    for (const [a, b] of graph.edges) expect([a, b, segmentClear(graph.nodes[a], graph.nodes[b], R, open)]).toEqual([a, b, true]);
    for (const s of graph.stops) { expect(shortestPath(graph, 'street', 'stand-' + s.id)).not.toBeNull(); for (const o of graph.stops) expect(shortestPath(graph, 'stand-' + o.id, 'stand-' + s.id)).not.toBeNull(); }
  });
  test('from a grid of standable points (hall, forecourt) a clear route to the studio exists, ending at the stand point', () => {
    let tested = 0; const pts = []; for (let x = -21; x <= 21; x += 3) for (let z = -35; z <= -1; z += 2.5) pts.push([x, z]); for (let x = -24; x <= 24; x += 4) for (let z = 1; z <= 22; z += 3) pts.push([x, z]);
    for (const p of pts) {
      if (!isFree(p[0], p[1], R, open)) continue;
      const r = routeTo(graph, p, 'kitchen-studio', open); tested++;
      if (!(r && !r.direct)) throw new Error('no route from ' + p);
      for (let i = 1; i < r.points.length; i++) expect(segmentClear(r.points[i - 1], r.points[i], R, open)).toBe(true);
      expect(r.points[r.points.length - 1]).toEqual(P.stand);
    }
    expect(tested).toBeGreaterThan(100);
  });
  test('a visitor can WALK the route from the spawn with the collision model', () => {
    const r = routeTo(graph, [0, -3.5], 'kitchen-studio', open); let p = r.points[0];
    for (const w of r.points.slice(1)) { for (let i = 0; i < 600 && Math.hypot(w[0] - p[0], w[1] - p[1]) > 0.05; i++) { const d = Math.hypot(w[0] - p[0], w[1] - p[1]), st = Math.min(d, 0.1); p = moveCircle(p, ((w[0] - p[0]) / d) * st, ((w[1] - p[1]) / d) * st, R, open); } }
    expect(Math.hypot(p[0] - P.stand[0], p[1] - P.stand[1])).toBeLessThan(0.3);
  });
  test('the collections colliders and the studio colliders do not overlap each other', () => {
    for (const a of studioColliders()) for (const b of collectionsColliders()) expect(a.maxX <= b.minX || a.minX >= b.maxX || a.maxZ <= b.minZ || a.minZ >= b.maxZ).toBe(true);
  });
});

describe('screen quality tiers and the attract loop', () => {
  test('low shows one still frame, high / medium loop all three; frames load only near the wall', () => {
    expect(tierOf('low')).toMatchObject({ frames: 1, loop: false }); expect(tierOf('high').frames).toBe(S.poster.frames); expect(tierOf('medium').loop).toBe(true); expect(tierOf('x')).toBe(TIER.low);
    expect(shouldLoad(P.stand[0], P.stand[1])).toBe(true); expect(shouldLoad(0, -30)).toBe(false); expect(shouldLoad(P.x + LOAD_RADIUS, P.z)).toBe(true); expect(shouldLoad(P.x + LOAD_RADIUS + 1, P.z)).toBe(false);
  });
  test('loopAt holds each frame, then cross-fades to the next and wraps', () => {
    const per = LOOP.hold + LOOP.fade;
    expect(loopAt(0, 3)).toEqual({ a: 0, b: 1, k: 0 }); expect(loopAt(LOOP.hold - 0.01, 3).k).toBe(0);
    const mid = loopAt(LOOP.hold + LOOP.fade / 2, 3); expect(mid.a).toBe(0); expect(mid.b).toBe(1); expect(mid.k).toBeCloseTo(0.5, 5);
    expect(loopAt(per, 3)).toMatchObject({ a: 1, b: 2, k: 0 }); expect(loopAt(per * 3, 3).a).toBe(0); expect(loopAt(per * 2 + LOOP.hold + LOOP.fade * 0.99, 3)).toMatchObject({ a: 2, b: 0 });
    expect(loopAt(5, 1)).toEqual({ a: 0, b: 0, k: 0 }); expect(loopAt(-1, 3)).toEqual({ a: 0, b: 0, k: 0 }); expect(loopAt(NaN, 3).k).toBe(0);
  });
});

describe('embed URL, language and sign-in helpers', () => {
  test('the embed URL is a site-relative path of the website designer plus the attribution parameter; nothing absolute can get in', () => {
    expect(buildEmbedUrl(S)).toBe('/design-studio/kitchen-planner?src=yas-bloom'); expect(buildSiteUrl(S)).toBe(buildEmbedUrl(S)); expect(SRC_PARAM).toBe('src');
    for (const bad of ['https://evil.example/x', '//evil.example/x', 'javascript:alert(1)', '/a b', '/x?y=1', '', null, undefined, 5]) expect(buildEmbedUrl({ designer: { path: bad } })).toBeNull();
    expect(buildEmbedUrl(null)).toBeNull(); expect(buildEmbedUrl({})).toBeNull(); expect(buildEmbedUrl(S, { src: 'a&b=c' })).toBe('/design-studio/kitchen-planner?src=a%26b%3Dc');
  });
  test('the route in the website router table is the one the embed opens (read from src/App.js, never hard-coded twice)', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../../App.js'), 'utf8');
    expect(app).toContain("'/design-studio/kitchen-planner':'kitchen-planner'"); expect(app).toMatch(/page==='kitchen-planner' && !plannerLocked && <PageBoundary key="kp"><KitchenPlannerWizard/);
    expect(app).toMatch(/const HEADER = mobile\?72:104/); expect(HEADER_SHIFT).toMatchObject({ desktop: 104, mobile: 72, breakpoint: 768 });
    expect(app).toContain("window.innerWidth < 768");
    expect(app).toContain('title="Language"');                                      // the language button the overlay clicks
  });
  test('stillOnDesigner: only the designer route counts (its Exit goes to /kitchen, a sent quote to /)', () => {
    expect(stillOnDesigner('/design-studio/kitchen-planner', S)).toBe(true); expect(stillOnDesigner('/design-studio/kitchen-planner/', S)).toBe(true); expect(stillOnDesigner('/Design-Studio/Kitchen-Planner', S)).toBe(true);
    for (const p of ['/kitchen', '/', '/home', '/booking', '/design-studio', '', null]) expect(stillOnDesigner(p, S)).toBe(false); expect(stillOnDesigner('/x', null)).toBe(false);
  });
  test('language sync writes the website key; the showroom language decides (also /ar/yas-bloom where localStorage still says en)', () => {
    const st = memStore({ [LANG_KEY]: 'en' }); expect(syncLang('ar', st)).toBe(true); expect(st.m[LANG_KEY]).toBe('ar'); expect(readLang(st)).toBe('ar');
    expect(syncLang('en', st)).toBe(true); expect(st.m[LANG_KEY]).toBe('en'); expect(syncLang('fr', st)).toBe(true); expect(st.m[LANG_KEY]).toBe('en'); expect(normLang('ar')).toBe('ar'); expect(normLang(undefined)).toBe('en');
    const dead = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }; expect(syncLang('ar', dead)).toBe(false); expect(readLang(dead)).toBe('en'); expect(isSignedIn(dead)).toBe(false);
  });
  test('isSignedIn reads the website customer record', () => {
    expect(isSignedIn(memStore())).toBe(false); expect(isSignedIn(memStore({ [USER_KEY]: '{"id":"u1"}' }))).toBe(true); expect(isSignedIn(memStore({ [USER_KEY]: 'not json' }))).toBe(false); expect(isSignedIn(memStore({ [USER_KEY]: 'null' }))).toBe(false);
  });
  test('headerShift follows the site: 104 px from 768 px wide, 72 below; the injected CSS only hides the footer', () => {
    expect(headerShift(1440)).toBe(104); expect(headerShift(768)).toBe(104); expect(headerShift(767)).toBe(72); expect(headerShift(390)).toBe(72);
    expect(EMBED_CSS).toMatch(/^footer\{display:none!important\}/); expect(EMBED_CSS).not.toMatch(/nav|header|#root|\.btn|button/);
  });
});

describe('open / close state machine', () => {
  const step = (s, ...as) => as.reduce((a, x) => reduce(a, x), s);
  test('closed -> loading -> open; open ignored unless closed or for an unknown section', () => {
    let s = reduce(initialState, { type: 'open', sectionId: 'kitchen-studio' }); expect(s).toMatchObject({ status: 'loading', sectionId: 'kitchen-studio', attempt: 1 });
    expect(isActive(s)).toBe(true); expect(isActive(initialState)).toBe(false);
    expect(reduce(s, { type: 'open', sectionId: 'kitchen-studio' })).toBe(s); expect(reduce(initialState, { type: 'open', sectionId: 'nope' })).toBe(initialState);
    s = reduce(s, { type: 'loaded' }); expect(s.status).toBe('open'); expect(reduce(s, { type: 'loaded' })).toBe(s);
  });
  test('a load failure shows the failure screen; retry reloads with a new attempt; nothing else retries', () => {
    let s = step(initialState, { type: 'open', sectionId: 'kitchen-studio' }, { type: 'fail', reason: 'timeout' }); expect(s).toMatchObject({ status: 'failed', reason: 'timeout' });
    expect(reduce(initialState, { type: 'retry' })).toBe(initialState); s = reduce(s, { type: 'retry' }); expect(s).toMatchObject({ status: 'loading', attempt: 2, reason: null });
  });
  test('closing a design with no real interaction goes straight back; with three or more edits it asks first', () => {
    let s = step(initialState, { type: 'open', sectionId: 'kitchen-studio' }, { type: 'loaded' }); expect(isDirty(s)).toBe(false);
    expect(reduce(s, { type: 'request-close' })).toMatchObject({ status: 'closed', reason: 'user' });
    s = step(s, ...Array(DIRTY_AFTER).fill({ type: 'interact' })); expect(isDirty(s)).toBe(true);
    const c = reduce(s, { type: 'request-close' }); expect(c.status).toBe('confirm'); expect(reduce(c, { type: 'stay' }).status).toBe('open'); expect(reduce(c, { type: 'leave' })).toMatchObject({ status: 'closed', reason: 'user' });
    expect(reduce(c, { type: 'request-close' })).toMatchObject({ status: 'closed' });                // a second Back press while confirming closes (explicit)
  });
  test('interactions while loading do not count; failed and loading close at once', () => {
    let s = step(initialState, { type: 'open', sectionId: 'kitchen-studio' }, { type: 'interact', n: 9 }); expect(s.interactions).toBe(0);
    expect(reduce(s, { type: 'request-close' }).status).toBe('closed'); s = reduce(s, { type: 'fail' }); expect(reduce(s, { type: 'request-close' }).status).toBe('closed'); expect(reduce(initialState, { type: 'request-close' })).toBe(initialState);
  });
  test('the designer navigating away (its Exit / a sent quote) closes it with reason "exit"; the browser Back closes with "back"; reload restarts', () => {
    const o = step(initialState, { type: 'open', sectionId: 'kitchen-studio' }, { type: 'loaded' }, ...Array(5).fill({ type: 'interact' }));
    expect(reduce(o, { type: 'left' })).toMatchObject({ status: 'closed', reason: 'exit' }); expect(reduce(o, { type: 'close' })).toMatchObject({ status: 'closed', reason: 'back' });
    expect(reduce(o, { type: 'reload' })).toMatchObject({ status: 'loading', attempt: 2, interactions: 0 }); expect(reduce(initialState, { type: 'left' })).toBe(initialState); expect(reduce(o, { type: 'bogus' })).toBe(o);
    expect(reduce(reduce(o, { type: 'left' }), { type: 'open', sectionId: 'kitchen-studio' }).attempt).toBe(2);   // reopening counts attempts across sessions (a fresh frame every time)
  });
  test('navigation keys do not make a design dirty, typing does; Esc closes only when the designer has no dialog open', () => {
    for (const k of ['Tab', 'Shift', 'ArrowLeft', 'Escape', 'Home', 'PageDown']) expect(isEditingKey(k)).toBe(false); for (const k of ['a', 'Enter', '5', 'Backspace']) expect(isEditingKey(k)).toBe(true);
    const doc = (hit) => ({ querySelector: () => hit }); expect(escapeShouldClose(doc(null))).toBe(true); expect(escapeShouldClose(doc({}))).toBe(false); expect(escapeShouldClose({ querySelector() { throw new Error('x'); } })).toBe(true);
  });
});

describe('advisers: "take me to the design studio" and "open the designer"', () => {
  const go = (t, l = 'en') => designStudioReply(t, { lang: l });
  test('go intents glide to the station and offer to open the designer', () => {
    for (const t of ['take me to the design studio', 'Where is the kitchen design studio?', 'show me the design wall', 'خذني إلى استوديو تصميم المطابخ', GO_TOKEN('kitchen-studio')]) {
      const r = go(t, /[؀-ۿ]/.test(t) ? 'ar' : 'en'); expect(r).not.toBeNull(); expect(r.intent).toBe('designer-go'); expect(r.auto).toMatchObject({ type: 'glide', id: 'kitchen-studio' }); expect(r.actions.map((a) => a.type)).toEqual(['glide', 'designer']); expect(r.chips[0].token).toBe(OPEN_TOKEN('kitchen-studio'));
    }
  });
  test('open intents open the designer straight away', () => {
    for (const t of ['open the designer', 'Please launch the kitchen planner', 'start designing', 'I want to design my kitchen', 'can you plan my kitchen', 'use the design tool', 'افتح المصمم', 'ابدأ التصميم', OPEN_TOKEN('kitchen-studio')]) {
      const r = go(t, /[؀-ۿ]/.test(t) ? 'ar' : 'en'); expect(r && r.intent).toBe('designer-open'); expect(r.auto).toMatchObject({ type: 'designer', id: 'kitchen-studio' }); expect(r.memory.turns).toBe(1);
    }
  });
  test('unrelated words and the existing Custom Studio / interior designer questions are NOT hijacked', () => {
    for (const t of ['take me to the custom studio', 'I want an interior designer to visit', 'book a designer', 'what are your hours', 'take me to the kitchens', 'show me the collections', '', null, 'مرحبا', 'مصمم داخلي']) expect(go(t)).toBeNull();
    expect(designStudioIntent('hello', S)).toBeNull(); expect(designStudioIntent('open the designer', null)).toBeNull();
  });
  test('every reply and chip passes the advisers\' guardrails (no digits, currency, promises) in both languages', () => {
    for (const l of ['en', 'ar']) { for (const t of ['take me to the design studio', 'open the designer']) { const r = go(t, l); expect(violation(r.text)).toBeNull(); for (const a of r.actions) for (const k of ['en', 'ar']) expect(violation(a.label[k])).toBeNull(); } }
    for (const k of ['guideGo', 'guideOpen', 'guideGoReply', 'guideOpenReply', 'guideBlurb']) for (const l of ['en', 'ar']) expect([k, l, violation(DS[k][l])]).toEqual([k, l, null]);
  });
  test('the kitchens adviser opens with both chips; other advisers do not; Reception lists the station under what we offer', () => {
    const kit = staffRoster().find((s) => s.id === 'kitchens'), rec = staffRoster().find((s) => s.id === 'reception');
    const tokens = (st) => opening({ id: st.id, room: st.room, name: st.name, first: st.first }, 'en').chips.map((c) => c.token);
    expect(tokens(kit)).toEqual(expect.arrayContaining([GO_TOKEN('kitchen-studio'), OPEN_TOKEN('kitchen-studio')])); expect(tokens(rec)).not.toContain(OPEN_TOKEN('kitchen-studio'));
    expect(adviserChips().map((c) => c.token)).toEqual([GO_TOKEN('kitchen-studio'), OPEN_TOKEN('kitchen-studio')]);
    const svc = services('en').find((x) => x.id === 'kitchen-studio'); expect(svc).toMatchObject({ label: 'Kitchen Design Studio', room: 'kitchen-studio', href: null }); expect(designStudioServices('ar')[0].label).toBe('استوديو تصميم المطابخ');
    expect(services('en').length).toBeGreaterThan(10);
  });
  test('the existing adviser brain still answers everything else exactly as before (the wrapper only claims its own intents)', () => {
    const r = reply('take me to the kitchens', { lang: 'en', staff: { id: 'reception', room: 'reception' }, memory: newMemory() }); expect(r.intent).toBe('goto'); expect(r.actions[0]).toMatchObject({ type: 'glide', id: 'kitchens' });
  });
});

describe('strings', () => {
  test('every string has English and Arabic, Arabic contains Arabic letters (apart from the language names and key labels)', () => {
    for (const [k, v] of Object.entries(DS)) { expect(typeof v.en).toBe('string'); expect(v.en.trim()).not.toBe(''); expect(typeof v.ar).toBe('string'); if (k !== 'podiumKey') expect(v.ar).toMatch(/[؀-ۿ]|^English$/); }
    expect(dt('title', 'ar')).toBe('استوديو تصميم المطابخ'); expect(dt('title', 'en')).toBe('Kitchen Design Studio'); expect(dt('nope', 'en')).toBe('nope');
  });
});
