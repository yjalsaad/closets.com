/* VIP meeting room (investor / partner boardroom): pure content, honesty rules, station state machine, booking hand-off, the projects feed (injected client),
 * layout / collision / navigation, and the Hub facts checked against what the content module claims. */
import * as C from '../products/vipContent';
import { loadProjects, projectCard, PROJECTS_QUERY, MAX_CARDS } from '../products/projectsFeed';
import { parseBookingPrefill, INTEREST } from '../products/quote';
import { sanitizeProjects } from '../../safety/sanitize';
import { FACTS } from '../../content/facts';
import { VIP, vipBoxes, vipDoorBox, VIP_VIEWS } from '../scenes/vip/layout';
import { buildColliders, isFree, moveCircle, PLAYER, DOOR_OPEN_AT } from '../navigation/colliders';
import { buildGraph, routeTo } from '../navigation/navgraph';
import { allZones, zoneAt } from '../navigation/interaction';
import { mulberry32 } from '../3d/noise';
import { STRINGS } from '../strings';
import fs from 'fs';
import path from 'path';

const R = PLAYER.radius;
const allText = () => { const t = []; const walk = (o) => { if (typeof o === 'string') t.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); }; walk([C.STATIONS, C.storyLines(), C.INVEST_STEPS, C.DISCLAIMER, C.BRIEFING_NOTE, C.PLACEHOLDER, C.HUB_FLOW, C.HUB_CAPABILITIES, C.HUB_KPI_NAMES, C.ILLUSTRATIVE]); return t.join(' | '); };

describe('stations and the presentation state machine', () => {
  test('five stations in the owner\'s order, bilingual titles and leads', () => {
    expect(C.stationIds()).toEqual(['story', 'projects', 'hub', 'invest', 'briefing']);
    for (const s of C.STATIONS) { expect(s.title.en.length).toBeGreaterThan(5); expect(/[؀-ۿ]/.test(s.title.ar + s.lead.ar)).toBe(true); }
  });
  test('next / previous clamp (no wrap), bad input is safe, arrows mirror in RTL', () => {
    expect(C.stepStation(0, -1)).toBe(0); expect(C.stepStation(4, 1)).toBe(4); expect(C.stepStation(1, 1)).toBe(2); expect(C.stepStation(2, -1)).toBe(1); expect(C.stepStation(NaN, 1)).toBe(1); expect(C.stepStation(2, 0)).toBe(2);
    expect(C.clampStation(99)).toBe(4); expect(C.clampStation(-3)).toBe(0); expect(C.clampStation('x')).toBe(0);
    expect(C.arrowDir('ArrowRight', false)).toBe(1); expect(C.arrowDir('ArrowLeft', false)).toBe(-1); expect(C.arrowDir('ArrowRight', true)).toBe(-1); expect(C.arrowDir('ArrowLeft', true)).toBe(1); expect(C.arrowDir('KeyA', true)).toBe(-0);
  });
  test('every station has a camera pose inside the room, looking at its back wall', () => {
    expect(VIP_VIEWS).toHaveLength(5);
    for (const v of VIP_VIEWS) { expect(v.pos[0]).toBeGreaterThan(VIP.x0); expect(v.pos[0]).toBeLessThan(VIP.x1); expect(v.pos[2]).toBeLessThan(VIP.z1); expect(v.pos[2]).toBeGreaterThan(VIP.z0); expect(v.pos[1]).toBeGreaterThan(1.2); expect(v.pos[1]).toBeLessThan(2.4); expect(v.look[2]).toBeLessThan(v.pos[2]); }
  });
});

describe('honesty: no financial promises, contested facts are marked placeholders', () => {
  test('no figures, returns, valuation, equity, ROI or guarantees anywhere in the investor content (EN + AR)', () => {
    expect(C.FORBIDDEN_FINANCIAL.test(allText())).toBe(false);
    for (const s of C.INVEST_STEPS) { expect(C.FORBIDDEN_FINANCIAL.test(s.title.en + s.body.en + s.title.ar + s.body.ar)).toBe(false); expect(/\d/.test(s.title.en + s.body.en)).toBe(false); }
  });
  test('the forbidden-words check really catches what it should', () => {
    for (const bad of ['expected ROI', '12% returns', 'a valuation of', 'equity stake', 'guaranteed', 'BHD 500', 'dividends', 'عائد مضمون', 'ضمان الأرباح']) expect(C.FORBIDDEN_FINANCIAL.test(bad)).toBe(true);
  });
  test('the neutral disclaimer is present in both languages and says information only / not an offer / not advice', () => {
    expect(C.DISCLAIMER.en).toMatch(/information only/i); expect(C.DISCLAIMER.en).toMatch(/not an offer/i); expect(C.DISCLAIMER.en).toMatch(/financial advice/i); expect(C.DISCLAIMER.en).toMatch(/management/i); expect(/[؀-ۿ]/.test(C.DISCLAIMER.ar)).toBe(true);
  });
  test('years of craft, homes delivered, production model and showroom count are NOT asserted: they show the placeholder while facts.js has null', () => {
    for (const k of ['yearsOfCraft', 'homesDelivered', 'productionModel', 'showroomCount']) expect(FACTS[k]).toBeNull();
    const cf = C.contestedFacts(); expect(cf).toHaveLength(4); for (const f of cf) { expect(f.confirmed).toBe(false); expect(f.value).toBe(C.PLACEHOLDER); }
    expect(C.PLACEHOLDER.en).toBe('To be confirmed by management');
  });
  test('a confirmed value (once management decides it in facts.js) appears automatically instead of the placeholder', () => {
    const cf = C.contestedFacts({ yearsOfCraft: { en: 'X years', ar: 'X' }, homesDelivered: null, productionModel: undefined, showroomCount: 4 }); expect(cf[0].confirmed).toBe(true); expect(cf[0].value.en).toBe('X years'); expect(cf[1].confirmed).toBe(false); expect(cf[3].value).toEqual({ en: '4', ar: '4' });
  });
  test('company facts used come from facts.js (warranty, phone, hours); nothing else is asserted', () => {
    expect(C.storyLines()[1].en).toContain(String(FACTS.warrantyYears)); const c = C.contactLines('en'); expect(c.find((x) => x.id === 'phone').text).toBe(FACTS.phone); expect(c.find((x) => x.id === 'hours').text).toBe(FACTS.hours.en);
    const src = fs.readFileSync(path.resolve(__dirname, '../products/vipContent.js'), 'utf8'); expect(src).not.toMatch(/\+973|wa\.me|@[a-z]+\.[a-z]{2,}/);
  });
  test('the owner-inputs list matches the document the owner will fill', () => {
    const doc = fs.readFileSync(path.resolve(__dirname, '../../../docs/showroom3d/VIP-ROOM-OWNER-INPUTS.md'), 'utf8');
    for (const k of C.OWNER_INPUTS) expect(doc).toContain('`' + k + '`');
  });
});

describe('business lines and the Hub station', () => {
  test('every business line with a page links to a REAL route (checked against seo/routes.js and the studio / campaign shells)', () => {
    const routes = require('../../seo/routes'); const known = new Set(routes.PAGES.map((p) => p.path)); const idx = fs.readFileSync(path.resolve(__dirname, '../../index.js'), 'utf8');
    for (const l of C.businessLines('en')) { if (!l.route) { expect(l.href).toBeNull(); continue; } if (l.id === 'studio') expect(idx).toMatch(/\\\/studio/); else if (l.id === 'ikhtarha') expect(idx).toMatch(/campaign\\\/ikhtarha/); else expect(known.has(l.route)).toBe(true); }
    expect(C.businessLines('ar').find((l) => l.id === 'kitchens').href).toBe('/ar/kitchen'); expect(C.businessLines('ar').find((l) => l.id === 'studio').href).toBe('/studio'); expect(C.projectsHref('ar')).toBe('/ar/projects'); expect(C.projectsHref('en')).toBe('/projects');
    for (const id of ['kitchens', 'wardrobes', 'doors', 'living', 'studio', 'planners', 'ikhtarha', 'lounge']) expect(C.businessLines('en').find((l) => l.id === id).href).toBeTruthy();
  });
  test('Hub: 13 department groups with their module counts, flow lead to finance, six capabilities that each name their source, everything bilingual', () => {
    expect(C.HUB_DEPARTMENTS).toHaveLength(13); expect(C.HUB_DEPARTMENTS.reduce((a, d) => a + d.modules, 0)).toBeLessThanOrEqual(C.HUB_MODULE_TOTAL); for (const d of C.HUB_DEPARTMENTS) { expect(d.modules).toBeGreaterThan(0); expect(/[؀-ۿ]/.test(d.name.ar)).toBe(true); }
    expect(C.HUB_FLOW.map((f) => f.id)).toEqual(['lead', 'quote', 'order', 'production', 'delivery', 'finance']); expect(C.HUB_CAPABILITIES).toHaveLength(6);
    for (const c of C.HUB_CAPABILITIES) { expect(c.src.length).toBeGreaterThan(5); expect(/[؀-ۿ]/.test(c.title.ar + c.body.ar)).toBe(true); }
    expect(C.ILLUSTRATIVE.en).toMatch(/illustrative/i);
  });
  test('the Hub numbers and module families quoted here agree with the Hub repository when it is available (skipped in CI)', () => {
    const hub = '/home/user/closets-hub/DASHBOARD-MODULE-MAP.generated.md'; if (!fs.existsSync(hub)) return;
    const md = fs.readFileSync(hub, 'utf8'); expect(md).toContain(`${C.HUB_MODULE_TOTAL} navigable modules`);
    for (const d of C.HUB_DEPARTMENTS) { const n = md.split('\n').filter((l) => l.startsWith('| ' + d.name.en.toUpperCase() + ' |')).length; expect(n).toBe(d.modules); }
  });
});

describe('the briefing CTA routes to the EXISTING booking flow with the investor-briefing interest, writes nothing', () => {
  test('URL: /booking?interest=investor-briefing&source=showroom-3d-vip&notes=...  (EN) and /ar/booking (AR); no figures in the notes', () => {
    const en = new URL(C.briefingUrl('en'), 'https://x.test'), ar = new URL(C.briefingUrl('ar'), 'https://x.test');
    expect(en.pathname).toBe('/booking'); expect(en.searchParams.get('interest')).toBe('investor-briefing'); expect(en.searchParams.get('source')).toBe('showroom-3d-vip'); expect(en.searchParams.get('notes')).toMatch(/private investor briefing/i);
    expect(ar.pathname).toBe('/ar/booking'); expect(ar.searchParams.get('notes')).toMatch(/[؀-ۿ]/); expect(C.FORBIDDEN_FINANCIAL.test(en.searchParams.get('notes') + ar.searchParams.get('notes'))).toBe(false);
  });
  test('the booking prefill maps interest=investor-briefing to the form\'s existing "Other" and keeps the note (the form is reviewed and submitted by the visitor)', () => {
    const u = new URL(C.briefingUrl('en'), 'https://x.test'); const p = parseBookingPrefill(u.search); expect(p.interest).toBe('Other'); expect(p.notes).toMatch(/investor briefing/i); expect(Object.values(INTEREST)).toContain(p.interest);
    expect(parseBookingPrefill('?interest=nonsense').interest).toBeNull();
  });
  test('quote.js and vipContent.js never touch the network, the backend or fetch', () => {
    for (const f of ['../products/quote.js', '../products/vipContent.js']) expect(fs.readFileSync(path.resolve(__dirname, f), 'utf8')).not.toMatch(/fetch\(|XMLHttpRequest|supabase|rpc\(|sendBeacon/);
  });
});

describe('projects feed: the SAME read-only client path as the Projects page, graceful states, nothing invented', () => {
  test('the query and the sanitiser are exactly the ones App.js uses for the home page (checked in source)', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8'); expect(app).toContain(`api('${PROJECTS_QUERY}')`); expect(app).toMatch(/sanitizeProjects\(d\)/); expect(PROJECTS_QUERY).toMatch(/^website_projects\?active=eq\.true&order=sort_order\.asc/);
  });
  test('ok: rows are sanitised (malformed rows dropped, URLs filtered) and capped at six', async () => {
    const rows = [{ id: 1, name: 'A', cover_url: 'javascript:alert(1)' }, null, 'x', { id: 2, name: { bad: 1 }, location: 'L' }, ...Array.from({ length: 9 }, (_, i) => ({ id: 10 + i, name: 'P' + i }))];
    const r = await loadProjects({ api: async (q) => { expect(q).toBe(PROJECTS_QUERY); return rows; }, sanitize: sanitizeProjects }); expect(r.status).toBe('ok'); expect(r.rows).toHaveLength(MAX_CARDS); expect(r.rows[0].cover_url).toBe(''); expect(r.rows[1].name).toBe('');
  });
  test('empty list and a failing request both give a graceful state with no rows (never invented projects)', async () => {
    expect(await loadProjects({ api: async () => [], sanitize: sanitizeProjects })).toEqual({ status: 'empty', rows: [] });
    expect(await loadProjects({ api: async () => { throw new Error('network'); }, sanitize: sanitizeProjects })).toEqual({ status: 'error', rows: [] });
    expect(await loadProjects({ api: async () => ({ not: 'an array' }), sanitize: sanitizeProjects })).toEqual({ status: 'empty', rows: [] });
  });
  test('a card shows only fields the record has: title, "category · location", the cover url; fallbacks are neutral', () => {
    expect(projectCard({ id: 7, name: 'Villa', category: 'Kitchens', location: 'Riffa', cover_url: 'https://i/x.jpg' })).toEqual({ id: '7', title: 'Villa', meta: 'Kitchens · Riffa', image: 'https://i/x.jpg' });
    expect(projectCard({}, 'en').title).toBe('Project'); expect(projectCard({}, 'ar').title).toBe('مشروع'); expect(projectCard({ name: 'N' }).meta).toBe('');
  });
  test('the feed only issues a GET through the injected client (no writes) and is not called at module load', async () => {
    const calls = []; await loadProjects({ api: async (q, o) => { calls.push([q, o]); return []; }, sanitize: sanitizeProjects }); expect(calls).toEqual([[PROJECTS_QUERY, undefined]]);
    expect(fs.readFileSync(path.resolve(__dirname, '../products/projectsFeed.js'), 'utf8')).not.toMatch(/method\s*:|POST|PATCH|DELETE|body\s*:/);
  });
});

describe('VIP room layout, collision and navigation', () => {
  const open = buildColliders({ doorOpen: 1, vipOpen: 1 }), shut = buildColliders({ doorOpen: 1, vipOpen: 0 });
  test('the room sits inside the hall against the back wall, centred on the nave, clear of the bays\' lanes (x = +-8) and the benches', () => {
    expect(VIP.x0).toBe(-7); expect(VIP.x1).toBe(7); expect(VIP.z1).toBeLessThan(-26.8); expect(VIP.z0).toBeGreaterThan(-36); expect(Math.abs(VIP.x1) + 1).toBeLessThanOrEqual(8);
  });
  test('the door: solid while closed (shut colliders), a clear 1.9 m gap when open; walls, table and lounge are solid either way', () => {
    expect(isFree(0, VIP.z1, R, shut)).toBe(false); expect(isFree(0, VIP.z1, R, open)).toBe(true); expect(DOOR_OPEN_AT).toBeGreaterThan(0.3);
    const p = moveCircle([0, -27.6], 0, -4, R, shut); expect(p[1]).toBeGreaterThan(VIP.z1 + 0.05); const q = moveCircle([0, -27.6], 0, -4, R, open); expect(q[1]).toBeLessThan(VIP.z1 - 1);
    for (const [x, z] of [[-6.8, -30], [6.8, -33], [0, -32.6], [5.5, -30.3], [-6.2, -30.2]]) expect(isFree(x, z, R, open)).toBe(false);
    expect(moveCircle([-3, -29.5], -20, 0, R, open)[0]).toBeGreaterThan(VIP.x0 + R - 0.01); expect(moveCircle([3, -29.5], 0, -30, R, open)[1]).toBeGreaterThan(VIP.z0 + R - 0.5);
  });
  test('boxes are inside the room footprint (+ wall thickness) and the stand point and every station view are free floor', () => {
    for (const b of vipBoxes()) { expect(b.minX).toBeGreaterThanOrEqual(VIP.x0 - 0.2); expect(b.maxX).toBeLessThanOrEqual(VIP.x1 + 0.2); }
    expect(vipDoorBox().minX).toBe(-VIP.doorHalf); expect(isFree(VIP.stand[0], VIP.stand[1], R, open)).toBe(true); expect(isFree(VIP.approach[0], VIP.approach[1], R, open)).toBe(true);
  });
  test('long random walks from inside the room and from the hall never end inside furniture or leave the hall', () => {
    const rnd = mulberry32(4242); let n = 0;
    for (let i = 0; i < 400; i++) { const x = -6.5 + rnd() * 13, z = -35 + rnd() * 6.5; if (!isFree(x, z, R, open)) continue; const a = rnd() * 6.283, d = rnd() * 14; const p = moveCircle([x, z], Math.cos(a) * d, Math.sin(a) * d, R, open); n++; expect(isFree(p[0], p[1], R, open, 1e-4)).toBe(true); expect(Math.abs(p[0])).toBeLessThanOrEqual(22 - R + 1e-6); expect(p[1]).toBeGreaterThanOrEqual(-36 + R - 1e-6); }
    expect(n).toBeGreaterThan(150);
  });
  test('quick-nav: the VIP room is the 9th stop; it is reachable from the street, the spawn, the lobby, a bay, and from inside the room (door open, no straight-line fallback)', () => {
    const g = buildGraph(); const s = g.stops[8]; expect(s.id).toBe('vip'); expect(s.index).toBe(9); expect(s.stand).toEqual(VIP.stand);
    for (const from of [[0, 30], [0, -9], [0, -3.5], [-12.5, -7.9], [12.5, -30.7], [4.5, -34.5], [-3, -29.5], [0, -34.9]]) { const r = routeTo(g, from, 'vip', open); expect(r && !r.direct).toBe(true); expect(r.points[r.points.length - 1]).toEqual(VIP.stand); for (const p of r.points.slice(1)) expect(isFree(p[0], p[1], R, open)).toBe(true); }
    for (const b of g.stops.slice(0, 8)) { const r = routeTo(g, [0, -30.2], b.id, open); expect(r && !r.direct).toBe(true); }
  });
  test('the interaction zone: inside the room and the doorway strip give "vip"; the nave centre and the stage stay unchanged', () => {
    const z = allZones(); expect(zoneAt(z, 0, -32)).toMatchObject({ id: 'vip', vip: true }); expect(zoneAt(z, 0, -27.5)).toMatchObject({ id: 'vip' }); expect(zoneAt(z, 5, -33)).toMatchObject({ id: 'vip' });
    expect(zoneAt(z, 0, -20.5)).toMatchObject({ id: 'ikhtarha' }); expect(zoneAt(z, 8, -30.7)).toBeNull(); expect(zoneAt(z, -12.5, -30.7)).toMatchObject({ id: 'bedroom' });
  });
  test('UI strings: VIP strings exist in both languages and the department list names it', () => {
    for (const k of ['vipName', 'vipKicker', 'vipPrev', 'vipNext', 'vipBriefing', 'vipBriefingNote', 'vipProjectsNone', 'vipOpenProjects']) { expect(STRINGS[k].en.length).toBeGreaterThan(2); expect(/[؀-ۿ]/.test(STRINGS[k].ar)).toBe(true); }
    expect(C.VIP_DEPT).toMatchObject({ id: 'vip', index: 9 }); expect(STRINGS.vipBriefingNote.en).toMatch(/nothing is sent until you submit/i);
  });
});
