import { FINISHES, PRODUCT_IDS, finishList, finishIds, getFinish, defaultFinish, cycleFinish, finishLabel } from '../products/finishes';
import { PALETTE } from '../3d/palette';

describe('finish configuration', () => {
  test('three furnished products, each with 3 to 4 finishes, unique ids, bilingual names, palette swatches', () => {
    expect(PRODUCT_IDS).toEqual(['kitchen', 'wardrobe', 'door']);
    for (const p of PRODUCT_IDS) {
      const list = finishList(p); expect(list.length).toBeGreaterThanOrEqual(3); expect(list.length).toBeLessThanOrEqual(4); expect(new Set(list.map((f) => f.id)).size).toBe(list.length);
      for (const f of list) { expect(f.en.length).toBeGreaterThan(3); expect(/[؀-ۿ]/.test(f.ar)).toBe(true); expect(Object.values(PALETTE)).toContain(f.swatch); }
    }
  });
  test('every finish describes real material recipes (timber tone or paint colour) and a metal', () => {
    for (const p of PRODUCT_IDS) for (const f of finishList(p)) {
      const specs = p === 'door' ? [f.leaf, f.frame] : [f.front, f.carcass]; for (const s of specs) { expect(['timber', 'paint']).toContain(s.kind); expect(typeof s.color).toBe('number'); }
      expect(['brass', 'bronze']).toContain(f.metal);
    }
    for (const f of finishList('kitchen')) expect(['white', 'dark', 'sand']).toContain(f.stone);
  });
  test('lookups: default is the first, unknown falls back to the first, cycle wraps both ways', () => {
    for (const p of PRODUCT_IDS) { const ids = finishIds(p); expect(defaultFinish(p)).toBe(ids[0]); expect(getFinish(p, 'zzz').id).toBe(ids[0]); expect(cycleFinish(p, ids[ids.length - 1], 1)).toBe(ids[0]); expect(cycleFinish(p, ids[0], -1)).toBe(ids[ids.length - 1]); }
    expect(cycleFinish('nope', 'x')).toBeNull(); expect(finishLabel('door', 'oak', 'ar')).toMatch(/[؀-ۿ]/); expect(finishLabel('door', 'oak', 'en')).toMatch(/oak/i);
  });
  test('finish names do not claim prices, grades or brands', () => {
    for (const p of PRODUCT_IDS) for (const f of finishList(p)) { expect(f.en + f.ar).not.toMatch(/\d|BD|%|premium|certified|grade/i); }
  });
  test('the door finishes follow the site\'s own wording (oak to deep colour, veneer or hand-sprayed paint)', () => { const all = finishList('door').map((f) => f.en).join(' | '); expect(all).toMatch(/veneer/i); expect(all).toMatch(/hand-sprayed/i); });
  test('data is exported as one frozen-shape object', () => { expect(Object.keys(FINISHES).sort()).toEqual(['door', 'kitchen', 'wardrobe']); });
});
