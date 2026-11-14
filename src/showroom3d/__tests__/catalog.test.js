import fs from 'fs';
import path from 'path';
import { PRODUCTS, PRODUCT_LIST, productForDept, toWorld, viewWorld, STAGE, STAGE_VIEWS, WARRANTY_YEARS, stateDef } from '../products/catalog';
import { DEPARTMENTS, layoutBays, isFurnished } from '../scenes/main-hall/departments';
import { IK } from '../products/campaignCopy';
import { FACTS } from '../vendor/facts';
import { HALL } from '../3d/dimensions';
import { STRINGS } from '../strings';
import { allZones, interactionZones, zoneAt } from '../navigation/interaction';

const bays = layoutBays(), bayOf = (id) => bays.find((b) => b.product === id);
const read = (f) => fs.readFileSync(path.resolve(__dirname, '../../' + f), 'utf8');

describe('product catalog', () => {
  test('all eight departments are furnished, each with exactly one product, and every product has a bay', () => {
    expect(DEPARTMENTS.filter(isFurnished).map((d) => d.id)).toEqual(['kitchens', 'wardrobes', 'walkin', 'bedroom', 'doors', 'living', 'studio', 'lounge']);
    expect(PRODUCT_LIST.map((p) => p.dept).sort()).toEqual(DEPARTMENTS.map((d) => d.id).sort());
    for (const p of PRODUCT_LIST) { expect(productForDept(p.dept)).toBe(p); expect(bayOf(p.id)).toBeTruthy(); }
  });
  test('part ids are unique, every part is bilingual and has a known kind', () => {
    const ids = PRODUCT_LIST.flatMap((p) => p.parts.map((x) => x.id)); expect(new Set(ids).size).toBe(ids.length);
    for (const p of PRODUCT_LIST) for (const x of p.parts) { expect(['drawer', 'door', 'slider', 'pivot', 'tilt', 'tray']).toContain(x.kind); expect(x.label.en.length).toBeGreaterThan(3); expect(/[؀-ۿ]/.test(x.label.ar)).toBe(true); }
  });
  test('the brief is covered: drawers + doors on the kitchen, sliding + hinged + glass + drawers on the wardrobe, a pivot door', () => {
    const kinds = (id) => new Set(PRODUCTS[id].parts.map((x) => x.kind));
    expect(kinds('kitchen')).toEqual(new Set(['drawer', 'door'])); expect(kinds('wardrobe')).toEqual(new Set(['slider', 'door', 'drawer'])); expect(kinds('door')).toEqual(new Set(['pivot']));
    expect(PRODUCTS.wardrobe.parts.filter((x) => x.id.startsWith('w-glass'))).toHaveLength(2); expect(PRODUCTS.kitchen.parts.filter((x) => x.kind === 'drawer').length).toBeGreaterThanOrEqual(6);
  });
  test('spec copy: bilingual, honest (no prices, dimensions, lead times); the only number is the site\'s own 10-year warranty fact', () => {
    expect(WARRANTY_YEARS).toBe(FACTS.warrantyYears);
    for (const p of PRODUCT_LIST) { expect(p.spec.length).toBeGreaterThanOrEqual(3); for (const l of p.spec) {
      expect(/[؀-ۿ]/.test(l.ar)).toBe(true); const nums = (l.en.match(/\d+/g) || []); for (const n of nums) expect(Number(n)).toBe(WARRANTY_YEARS);
      expect(l.en + l.ar).not.toMatch(/BD|\bmm\b|\bcm\b|\bm2\b|%|٪|دينار|weeks|أسابيع|from \d/i);
    } expect(p.kicker.en.toLowerCase()).toContain('sample configuration'); }
    expect(STRINGS.panelSampleNote.en.toLowerCase()).toMatch(/price/);
  });
  test('the warranty wording matches the site fact (10 years on cabinetry and soft-close hardware)', () => { expect(read('showroom3d/vendor/facts.js')).toMatch(/warrantyYears: 10/); for (const p of PRODUCT_LIST) expect(p.spec.some((l) => /10 years on cabinetry and soft-close hardware/.test(l.en))).toBe(true); });
  test('door copy is taken from the site\'s own door FAQ (hinges, soft-close, locks and handles; made to measure)', () => {
    const faq = read('App.js'); expect(faq).toMatch(/Concealed and standard hinges, soft-close systems/); expect(faq).toMatch(/every door is made to measure/i);
    expect(PRODUCTS.door.spec.map((l) => l.en).join(' ')).toMatch(/Concealed and standard hinges, soft-close systems, European locks and handles/);
  });
  test('stateDef lists every part', () => { for (const p of PRODUCT_LIST) expect(stateDef(p.id, []).parts.map((x) => x.id)).toEqual(p.parts.map((x) => x.id)); });
});

describe('camera views and the frame transform', () => {
  test('left bays use the frame as is (wall at x = -22), right bays are rotated: product x = -3 is the wall in both', () => {
    const k = bayOf('kitchen'), d = bayOf('door');
    expect(toWorld(k, [-3, 0, 0])[0]).toBeCloseTo(-22, 9); expect(toWorld(d, [-3, 0, 0])[0]).toBeCloseTo(22, 9);
    expect(toWorld(k, [1, 2, 3])).toEqual([k.x + 1, 2, k.z + 3]); expect(toWorld(d, [1, 2, 3])).toEqual([d.x - 1, 2, d.z - 3]);
  });
  test('every product view and stage view puts the camera inside the hall, at a plausible height, with a sane fov', () => {
    const inside = (p) => Math.abs(p[0]) < HALL.halfWidth - 0.3 && p[2] < -0.3 && p[2] > -HALL.depth + 0.3;
    for (const p of PRODUCT_LIST) { expect(p.views[0].id).toBe('overview'); for (const v of p.views) { const w = viewWorld(bayOf(p.id), v); expect(inside(w.pos)).toBe(true); expect(w.pos[1]).toBeGreaterThan(0.5); expect(w.pos[1]).toBeLessThan(2.4); expect(v.fov).toBeGreaterThan(30); expect(v.fov).toBeLessThan(70); expect(inside(w.look)).toBe(true); } }
    for (const v of STAGE_VIEWS) { expect(inside(v.pos)).toBe(true); expect(v.pos[1]).toBeLessThan(2.4); }
  });
  test('every view looks toward its product (the look point is nearer the wall than the camera)', () => {
    for (const p of PRODUCT_LIST) for (const v of p.views) expect(v.look[0]).toBeLessThan(v.pos[0]);
  });
});

describe('interaction zones incl. the Ikhtarha stage', () => {
  test('the 8 bay zones are unchanged and the stage zone sits in the nave, clear of the bays', () => {
    expect(interactionZones()).toHaveLength(8); const z = allZones(); expect(z).toHaveLength(11); const s = z[10];
    expect(s.id).toBe('ikhtarha'); expect(s.stage).toBe(true); expect(Math.abs(s.minX)).toBeLessThan(12); expect(s.maxZ).toBeLessThan(-14);
    expect(zoneAt(z, 0, STAGE.z)).toMatchObject({ id: 'ikhtarha' }); expect(zoneAt(z, -12.5, -7.9)).toMatchObject({ id: 'kitchens' }); expect(zoneAt(z, 0, -9)).toBeNull();
  });
  test('stage zone does not overlap any bay zone', () => { const z = allZones(); const s = z[10]; for (const b of z.slice(0, 10)) expect(s.maxX < b.minX || s.minX > b.maxX || s.maxZ < b.minZ || s.minZ > b.maxZ).toBe(true); });
});

describe('Ikhtarha copy is the campaign\'s own (checked against the campaign source files)', () => {
  const home = read('campaign/HomeCampaign.jsx'), root = read('campaign/IkhtarhaRoot.jsx');
  const all = [].concat(
    [IK.eyebrow, IK.title, IK.lead, IK.cta.price, IK.cta.play, IK.cta.demo, IK.fine], IK.steps.flatMap((s) => [s.t, s.d]));
  test('every EN and AR string appears verbatim in HomeCampaign.jsx', () => { for (const e of all) { expect(home).toContain(e.en); expect(home).toContain(e.ar); } });
  test('the slogan appears verbatim in IkhtarhaRoot.jsx and the name is Ikhtarha / اختارها', () => { expect(root).toContain(IK.slogan.en); expect(root).toContain(IK.slogan.ar); expect(IK.name).toEqual({ en: 'Ikhtarha', ar: 'اختارها' }); });
  test('no prizes, values, dates or numbers anywhere in the stage copy (brand-kit rule: public materials never name prizes or values)', () => {
    const text = JSON.stringify(IK); expect(text).not.toMatch(/\d/); expect(text).not.toMatch(/BD|%|٪|[٠-٩]|Franke|oven|off\b|خصم|فرن|نوفمبر|يناير|November|January/i);
    expect(read('campaign/HomeCampaign.jsx')).toMatch(/never name prizes or values/);
  });
});
