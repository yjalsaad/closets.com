/* Phase 5b: the five departments added after Phase 4 (bedroom, walk-in closet, living, studio, lounge): product configs, finishes, quote links, animation
 * kinds, kit helpers (double doors, tilting shelves, closed drawers hide their bodies), collisions and route reachability for every bay. */
import * as THREE from 'three';
import { PRODUCTS, PRODUCT_LIST, viewWorld } from '../products/catalog';
import { FINISHES, finishList, getFinish, cycleFinish } from '../products/finishes';
import { buildQuoteUrl, extraLinks, INTEREST, STUDIO_PATH, parseBookingPrefill } from '../products/quote';
import { FACTS } from '../../content/facts';
import { createProductState, DEFAULT_DURATION } from '../products/animation';
import { createRegistry } from '../products/registry';
import { layoutBays } from '../scenes/main-hall/departments';
import { productColliders, LOCAL_BOXES } from '../navigation/productColliders';
import { buildColliders, isFree, moveCircle, PLAYER } from '../navigation/colliders';
import { buildGraph, deptStops, routeTo } from '../navigation/navgraph';
import { applyFinish } from '../scenes/products/materials';
import { mulberry32 } from '../3d/noise';
import { createKit } from '../scenes/products/kit';

const NEW = ['bedroom', 'walkin', 'living', 'studio', 'lounge'];
const R = PLAYER.radius, bays = layoutBays();

describe('product configs of the five new departments', () => {
  test('each has bilingual name / kicker / spec, 5+ parts with unique prefixed ids, valid kinds, views starting at overview', () => {
    const prefix = { bedroom: 'bd-', walkin: 'wi-', living: 'lv-', studio: 'st-', lounge: 'lg-' };
    for (const id of NEW) {
      const p = PRODUCTS[id]; expect(p).toBeTruthy(); expect(p.kicker.en.toLowerCase()).toContain('sample configuration'); expect(/[؀-ۿ]/.test(p.name.ar + p.kicker.ar)).toBe(true);
      expect(p.parts.length).toBeGreaterThanOrEqual(5); expect(new Set(p.parts.map((x) => x.id)).size).toBe(p.parts.length);
      for (const x of p.parts) { expect(x.id.startsWith(prefix[id])).toBe(true); expect(['drawer', 'door', 'slider', 'tilt', 'tray']).toContain(x.kind); }
      expect(p.views[0].id).toBe('overview'); expect(p.views.length).toBeGreaterThanOrEqual(3);
    }
  });
  test('the brief is covered part by part', () => {
    const kinds = (id) => PRODUCTS[id].parts.map((x) => x.kind);
    expect(PRODUCTS.bedroom.parts.filter((x) => /^bd-bs-/.test(x.id))).toHaveLength(4); expect(PRODUCTS.bedroom.parts.filter((x) => /^bd-van-/.test(x.id))).toHaveLength(2); expect(PRODUCTS.bedroom.parts.filter((x) => /^bd-ward-/.test(x.id))).toHaveLength(2);
    expect(kinds('walkin').filter((k) => k === 'tilt')).toHaveLength(4); expect(kinds('walkin').filter((k) => k === 'tray')).toHaveLength(2); expect(PRODUCTS.walkin.parts.filter((x) => /^wi-glass/.test(x.id))).toHaveLength(2); expect(kinds('walkin')).toContain('drawer');
    expect(kinds('living')).toEqual(expect.arrayContaining(['door', 'drawer'])); expect(kinds('studio')).toEqual(expect.arrayContaining(['slider', 'drawer'])); expect(kinds('lounge')).toEqual(expect.arrayContaining(['door', 'drawer']));
  });
  test('honest copy: no prices, dimensions, lead times; digits only for the site warranty fact; the booking and studio wording matches existing site copy', () => {
    for (const id of NEW) for (const l of PRODUCTS[id].spec) { expect(l.en + l.ar).not.toMatch(/BD|\bmm\b|\bcm\b|%|دينار|weeks|أسابيع/i); for (const n of l.en.match(/\d+/g) || []) expect(Number(n)).toBe(FACTS.warrantyYears); }
    expect(PRODUCTS.lounge.spec.map((l) => l.en).join(' ')).toMatch(/free design consultation/);
  });
  test('every view of every new product is inside the hall at a plausible height and looks toward the wall', () => {
    for (const id of NEW) { const b = bays.find((q) => q.product === id); for (const v of PRODUCTS[id].views) { const w = viewWorld(b, v); expect(Math.abs(w.pos[0])).toBeLessThan(21.7); expect(w.pos[2]).toBeLessThan(-0.3); expect(w.pos[2]).toBeGreaterThan(-35.7); expect(w.pos[1]).toBeGreaterThan(0.5); expect(w.pos[1]).toBeLessThan(2.4); expect(v.look[0]).toBeLessThan(v.pos[0]); expect(Math.abs(w.look[0])).toBeLessThan(21.7); } }
  });
});

describe('finishes of the five new departments', () => {
  test('3 to 4 finishes each, unique ids, a visible fabric or stone, and every finish differs from the others', () => {
    for (const id of NEW) { const list = finishList(id); expect(list.length).toBeGreaterThanOrEqual(3); expect(list.length).toBeLessThanOrEqual(4); expect(new Set(list.map((f) => f.id)).size).toBe(list.length);
      expect(new Set(list.map((f) => JSON.stringify([f.front, f.carcass, f.metal, f.fabric, f.stone]))).size).toBe(list.length); expect(cycleFinish(id, list[list.length - 1].id, 1)).toBe(list[0].id); }
    for (const id of ['bedroom', 'living', 'lounge']) for (const f of finishList(id)) expect(f.fabric).toBeTruthy();
  });
  test('applyFinish recolours the upholstery and the department\'s own stone only (no leak between bays)', () => {
    const S = () => new THREE.MeshStandardMaterial(), mk = (ids) => Object.fromEntries(ids.map((i) => [i, S()]));
    const ids = ['kitchen', 'wardrobe', 'door', ...NEW];
    const M = { tier: 'low', white: null, tex: { oak: {}, walnut: {}, peel: {}, marble: { white: { map: 1 }, dark: { map: 2 }, sand: { map: 3 } } }, front: mk(ids), flute: mk(ids), carcass: mk(ids), metal: mk(ids), frame: { door: S() }, uphol: mk(NEW), stone: S() };
    M.stones = { kitchen: M.stone, ...mk(NEW) };
    const kitchenStone = M.stone.map;
    for (const id of NEW) for (const f of finishList(id)) { applyFinish(M, id, f.id); if (f.fabric != null) expect(M.uphol[id].color.getHex()).toBe(new THREE.Color(f.fabric).multiplyScalar(0.84).getHex()); if (f.stone) expect(M.stones[id].map).toBe({ white: 1, dark: 2, sand: 3 }[f.stone]); }
    expect(M.stone.map).toBe(kitchenStone); expect(FINISHES.bedroom).toBeTruthy(); expect(getFinish('lounge', 'nope')).toBe(finishList('lounge')[0]);
  });
});

describe('quote links and the existing entry points', () => {
  test('every new product builds a /booking link with a valid existing interest, the finish in the notes, and no backend call', () => {
    const form = require('fs').readFileSync(require('path').resolve(__dirname, '../../pages/BookingPage.jsx'), 'utf8');
    for (const id of NEW) { expect(form).toContain(`'${INTEREST[id]}'`); const f = finishList(id)[1], u = new URL(buildQuoteUrl({ product: id, productName: PRODUCTS[id].name.en, finishId: f.id, finishName: f.en, lang: 'en' }), 'https://x.test');
      expect(u.pathname).toBe('/booking'); expect(u.searchParams.get('interest')).toBe(INTEREST[id]); expect(u.searchParams.get('finish')).toBe(f.id); expect(u.searchParams.get('notes')).toContain(f.en); expect(parseBookingPrefill(u.search).interest).toBe(INTEREST[id]); }
  });
  test('Arabic links go to /ar/booking; the lounge consultation note says consultation, not quotation', () => {
    const ar = new URL(buildQuoteUrl({ product: 'lounge', productName: 'x', lang: 'ar', consult: true }), 'https://x.test'); expect(ar.pathname).toBe('/ar/booking'); expect(ar.searchParams.get('notes')).toMatch(/استشارة/);
    expect(new URL(buildQuoteUrl({ product: 'lounge', lang: 'en', consult: true }), 'https://x.test').searchParams.get('notes')).toMatch(/consultation request/);
  });
  test('studio links to the existing /studio route; lounge contact details come ONLY from content/facts.js', () => {
    expect(extraLinks('studio', 'en')[0].href).toBe(STUDIO_PATH); expect(STUDIO_PATH).toBe('/studio'); expect(extraLinks('studio', 'ar')[0].label).toMatch(/استوديو/);
    const l = extraLinks('lounge', 'en'); expect(l.find((x) => x.id === 'call').href).toBe(FACTS.phoneHref); expect(l.find((x) => x.id === 'whatsapp').href).toBe(FACTS.whatsappHref); expect(l.find((x) => x.id === 'hours').text).toContain(FACTS.hours.en);
    for (const id of ['kitchen', 'wardrobe', 'door', 'bedroom', 'walkin', 'living']) expect(extraLinks(id, 'en')).toEqual([]);
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '../products/quote.js'), 'utf8'); expect(src).not.toMatch(/\+973|wa\.me|tel:/);
  });
});

describe('animation kinds tilt and tray', () => {
  test('tilting shelves and trays have their own durations and reverse mid-way without a jump', () => {
    expect(DEFAULT_DURATION.tilt).toBeGreaterThan(0.3); expect(DEFAULT_DURATION.tray).toBeGreaterThan(0.3);
    const s = createProductState({ id: 'x', parts: [{ id: 'a', kind: 'tilt' }, { id: 'b', kind: 'tray' }], finishes: ['f'] });
    s.open('a'); s.update(0.4); const v = s.part('a').value; expect(v).toBeGreaterThan(0.1); expect(v).toBeLessThan(0.9); s.close('a'); s.update(0.001); expect(Math.abs(s.part('a').value - v)).toBeLessThan(0.02);
    s.open('b'); s.update(5); expect(s.part('b').state).toBe('open'); expect(s.ledLevel('b')).toBeCloseTo(1, 9);
  });
});

describe('kit helpers used by the new departments', () => {
  beforeEach(() => { const stub = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : () => stub), set: () => true }); jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => stub); });
  const build = (product) => { const registry = createRegistry(), S = () => new THREE.MeshStandardMaterial(), M = { ledWarm: () => new THREE.MeshBasicMaterial({ color: 0xffd6a2 }), wash: () => new THREE.MeshBasicMaterial({ transparent: true }), shadowDecal: () => new THREE.MeshBasicMaterial() };
    M.front = { [product]: S() }; M.flute = { [product]: S() }; M.carcass = { [product]: S() }; M.metal = { [product]: S() }; M.tex = { oak: {}, walnut: {}, peel: {}, marble: { white: {}, dark: {}, sand: {} } }; M.stone = S(); M.white = null;
    return { kit: createKit({ product, M, tier: { id: 'low' }, registry }), registry, M }; };
  test('doorPair: two leaves, one registered part, both swing (opposite hands) and the outline box covers both', () => {
    const { kit, registry, M } = build('bedroom'); const p = kit.doorPair({ id: 'bd-ward-a', x: -2.38, y: 1.3, z0: -3.2, z1: -2.2, w: 0.5, h: 2.4, frontMat: M.front.bedroom, metalMat: M.metal.bedroom });
    expect(registry.forProduct('bedroom')).toHaveLength(1); const e = registry.get('bd-ward-a'); expect(e.kind).toBe('door'); expect(e.objects).toHaveLength(2);
    kit.state.open('bd-ward-a'); kit.update(5); expect(p.a.group.rotation.y).toBeGreaterThan(1.5); expect(p.b.group.rotation.y).toBeLessThan(-1.5); const box = kit.partBox('bd-ward-a'); expect(box.max.z - box.min.z).toBeGreaterThan(0.9);
  });
  test('tilt: hinged at the bottom edge, the top folds toward the visitor (+X), contents are hidden while closed', () => {
    const { kit, registry, M } = build('walkin'); const t = kit.tilt({ id: 'wi-shoe-1', x: -2.39, y: 0.12, z: -2.4, w: 1.6, h: 0.36, frontMat: M.front.walkin, metalMat: M.metal.walkin });
    const stuff = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1)); t.group.add(stuff); t.group.userData.inner.push(stuff); kit.refresh(); kit.update(0.01); expect(stuff.visible).toBe(false);
    kit.state.open('wi-shoe-1'); kit.update(5); expect(stuff.visible).toBe(true); expect(t.group.rotation.z).toBeLessThan(-1.0); t.group.updateMatrixWorld(true);
    const top = new THREE.Vector3(0, 0.36, 0).applyMatrix4(t.group.matrixWorld); expect(top.x).toBeGreaterThan(-2.39 + 0.25); expect(top.y).toBeLessThan(0.12 + 0.36); expect(registry.get('wi-shoe-1').kind).toBe('tilt');
  });
  test('a closed drawer hides its body (a draw call saved per drawer) and shows it as soon as it moves; trays register with kind tray', () => {
    const { kit, M } = build('walkin'); const g = kit.drawer({ id: 'wi-tray-1', x: -0.6, y: 0.8, z: 0, w: 0.9, h: 0.1, organiser: false, frontMat: M.front.walkin, metalMat: M.metal.walkin, bodyMat: M.front.walkin });
    const body = g.children.find((c) => c.name.endsWith(':body')); expect(body.visible).toBe(false); kit.state.open('wi-tray-1'); kit.update(0.1); expect(body.visible).toBe(true); kit.update(5); kit.state.close('wi-tray-1'); kit.update(5); expect(body.visible).toBe(false);
  });
});

describe('collisions and routes for all eight bays', () => {
  const colliders = buildColliders({ doorOpen: 1 }), prod = productColliders();
  test('every product has local boxes, all inside its bay (nothing sticks into the nave or the neighbour bay), and a free stand point 3.5 m out', () => {
    for (const b of bays) { expect(LOCAL_BOXES[b.product].length).toBeGreaterThan(0); for (const [, x0, x1, z0, z1] of LOCAL_BOXES[b.product]) { expect(Math.min(x0, x1)).toBeGreaterThanOrEqual(-3.0); expect(Math.max(x0, x1)).toBeLessThanOrEqual(1.0); expect(Math.abs(z0)).toBeLessThanOrEqual(3.45); expect(Math.abs(z1)).toBeLessThanOrEqual(3.45); } }
    for (const s of deptStops()) expect(isFree(s.stand[0], s.stand[1], R, colliders)).toBe(true);
    for (const b of bays) expect(prod.some((c) => c.id.startsWith(b.product + '-'))).toBe(true);
  });
  test('long random walks from every bay\'s stand point never enter a product, never leave the hall and never get stuck inside a collider', () => {
    const rnd = mulberry32(77);
    for (const s of deptStops()) { let p = [...s.stand]; for (let i = 0; i < 120; i++) { const a = rnd() * 6.283, d = 0.5 + rnd() * 7; p = moveCircle(p, Math.cos(a) * d, Math.sin(a) * d, R, colliders); expect(isFree(p[0], p[1], R, colliders)).toBe(true); expect(Math.abs(p[0])).toBeLessThanOrEqual(22 - R + 1e-6); expect(p[1]).toBeLessThanOrEqual(-0.2 - R + 1e-6 + 40); expect(p[1]).toBeGreaterThanOrEqual(-36 + R - 1e-6); } }
  });
  test('the walker cannot enter any piece of furniture: walking straight at each bay wall stops at the furniture, not at the hall wall', () => {
    for (const b of bays) { const from = [b.x + b.facing * 4.5, b.z]; const p = moveCircle(from, -b.facing * 9, 0, R, colliders); expect(Math.abs(p[0])).toBeLessThan(22 - 0.6 - 0.2); expect(Math.abs(p[0] - b.x)).toBeLessThan(3.0); }
  });
  test('the quick-nav graph reaches all eight departments (door open) from the spawn and from the street, with clear walked routes', () => {
    const g = buildGraph(); expect(g.stops).toHaveLength(9); expect(g.stops[8].id).toBe('vip');
    for (const from of [[0, -9], [0, 30], [-18, 12]]) for (const s of g.stops) { const r = routeTo(g, from, s.id, colliders); expect(r).toBeTruthy(); const pts = r.points; expect(pts[pts.length - 1]).toEqual(s.stand); for (let i = 1; i < pts.length; i++) expect(isFree(pts[i][0], pts[i][1], R, colliders)).toBe(true); }
  });
});
