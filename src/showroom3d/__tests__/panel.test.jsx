import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProductPanel, CampaignPanel } from '../ui/ProductPanel';
import { PRODUCTS } from '../products/catalog';
import { finishList } from '../products/finishes';
import { createProductState } from '../products/animation';
import { stateDef } from '../products/catalog';
import { finishIds } from '../products/finishes';
import { IK } from '../products/campaignCopy';
import { productColliders } from '../navigation/productColliders';
import { buildColliders, isFree, PLAYER } from '../navigation/colliders';
import { layoutBays } from '../scenes/main-hall/departments';
import { buildGraph } from '../navigation/navgraph';
import { HALL } from '../3d/dimensions';

function fakeEx(product = 'kitchen') {
  const state = createProductState(stateDef(product, finishIds(product))); let view = 'overview', rev = 0; const calls = [];
  const ex = {
    calls, state, products: { setHover: (id) => calls.push(['hover', id]) },
    productState: () => ({ ...state.snapshot(), product, view, partFocus: null, rev }),
    togglePart: (id) => { state.toggle(id); rev++; calls.push(['toggle', id]); },
    openAll: (o) => { if (o) state.openAll(); else state.closeAll(); rev++; calls.push(['openAll', o]); },
    toggleLed: () => { const v = state.toggleLed(); rev++; calls.push(['led', v]); return v; },
    setFinish: (f) => { state.setFinish(f); rev++; calls.push(['finish', f]); },
    setView: (v) => { view = v; rev++; calls.push(['view', v]); },
    exitFocus: () => calls.push(['exit']),
  };
  return ex;
}
const mount = (product, lang = 'en', touch = false) => { const ex = fakeEx(product); const ref = { current: ex }; const utils = render(<div dir={lang === 'ar' ? 'rtl' : 'ltr'}><ProductPanel lang={lang} touch={touch} explorerRef={ref} st={{ focus: product, prod: 0 }} /></div>); return { ex, ref, ...utils, rerender: (st = {}) => utils.rerender(<div dir={lang === 'ar' ? 'rtl' : 'ltr'}><ProductPanel lang={lang} touch={touch} explorerRef={ref} st={{ focus: product, prod: 1, ...st }} /></div>) }; };

describe('ProductPanel', () => {
  test('shows the product name, the sample-configuration kicker, the honest spec lines and the sample note (EN)', () => {
    mount('kitchen'); const p = screen.getByTestId('sr-panel');
    expect(within(p).getByRole('heading', { level: 2 }).textContent).toBe(PRODUCTS.kitchen.name.en); expect(p.textContent).toMatch(/sample configuration/i);
    for (const l of PRODUCTS.kitchen.spec) expect(p.textContent).toContain(l.en); expect(p.textContent).toMatch(/Final sizes, materials and price are set in a quotation/);
    expect(p.textContent).not.toMatch(/BD\s?\d|\bfrom \d/i);
  });
  test('one button per part, aria-pressed follows the state, clicking toggles it; Open all / Close all', () => {
    const { ex, rerender } = mount('kitchen'); const id = PRODUCTS.kitchen.parts[0].id, b = screen.getByTestId('sr-part-' + id);
    expect(b.getAttribute('aria-pressed')).toBe('false'); fireEvent.click(b); expect(ex.calls).toContainEqual(['toggle', id]); rerender(); expect(screen.getByTestId('sr-part-' + id).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('sr-open-all').textContent).toBe('Close all'); fireEvent.click(screen.getByTestId('sr-open-all')); expect(ex.calls).toContainEqual(['openAll', false]);
    expect(screen.getAllByRole('button').filter((x) => x.getAttribute('data-part')).length).toBe(PRODUCTS.kitchen.parts.length);
  });
  test('LED switch is a switch with aria-checked, finishes are a radiogroup with names, views are pressed chips', () => {
    const { ex, rerender } = mount('wardrobe'); const sw = screen.getByRole('switch'); expect(sw.getAttribute('aria-checked')).toBe('true'); fireEvent.click(sw); expect(ex.calls).toContainEqual(['led', false]); rerender(); expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    const radios = screen.getAllByRole('radio'); expect(radios).toHaveLength(finishList('wardrobe').length); expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('sr-finish-stone-grey')); expect(ex.calls).toContainEqual(['finish', 'stone-grey']); rerender(); expect(screen.getByTestId('sr-finish-name').textContent).toMatch(/Stone grey/);
    fireEvent.click(screen.getByTestId('sr-view-detail')); expect(ex.calls).toContainEqual(['view', 'detail']); rerender(); expect(screen.getByTestId('sr-view-detail').getAttribute('aria-pressed')).toBe('true');
  });
  test('"Request a quotation" is a plain link to the existing booking page with the selected finish (and no network call)', () => {
    const fetchSpy = jest.fn(); global.fetch = fetchSpy; const { ex, rerender } = mount('door'); fireEvent.click(screen.getByTestId('sr-finish-walnut')); rerender();
    const a = screen.getByTestId('sr-quote'); expect(a.tagName).toBe('A'); const u = new URL(a.getAttribute('href'), 'https://x.test');
    expect(u.pathname).toBe('/booking'); expect(u.searchParams.get('interest')).toBe('Doors'); expect(u.searchParams.get('finish')).toBe('walnut'); expect(u.searchParams.get('notes')).toMatch(/Walnut veneer/); expect(fetchSpy).not.toHaveBeenCalled(); void ex;
  });
  test('Arabic: Arabic copy, Arabic quotation route, and the layout is under an rtl root', () => {
    mount('kitchen', 'ar'); const p = screen.getByTestId('sr-panel'); expect(p.textContent).toContain(PRODUCTS.kitchen.name.ar); expect(p.textContent).toContain('نموذج تصميم'); expect(p.closest('[dir="rtl"]')).toBeTruthy();
    const u = new URL(screen.getByTestId('sr-quote').getAttribute('href'), 'https://x.test'); expect(u.pathname).toBe('/ar/booking'); expect(u.searchParams.get('notes')).toMatch(/[؀-ۿ]/);
    expect(screen.getByTestId('sr-open-all').textContent).toBe('افتح الكل');
  });
  test('back button exits the focus; hovering / focusing a part button highlights it in the scene; touch hides keyboard hints', () => {
    const { ex } = mount('kitchen', 'en', true); fireEvent.click(screen.getByTestId('sr-panel-close')); expect(ex.calls).toContainEqual(['exit']);
    const id = PRODUCTS.kitchen.parts[1].id; fireEvent.pointerEnter(screen.getByTestId('sr-part-' + id)); expect(ex.calls).toContainEqual(['hover', id]); fireEvent.focus(screen.getByTestId('sr-part-' + id)); fireEvent.blur(screen.getByTestId('sr-part-' + id)); expect(ex.calls).toContainEqual(['hover', null]);
    expect(document.querySelector('.sr-kbd')).toBeNull(); expect(screen.getByTestId('sr-panel').textContent).toMatch(/Tap a drawer or door/);
  });
  test('a live region announces what a toggle did', () => {
    const { rerender } = mount('kitchen'); rerender({ lastToggle: PRODUCTS.kitchen.parts[0].id + ':1:3' }); expect(document.querySelector('[role="status"]').textContent).toMatch(/Island drawer, top left: opened/);
  });
});

describe('CampaignPanel (Ikhtarha)', () => {
  const ref = (calls = []) => ({ current: { exitFocus: () => calls.push('exit'), setView: (v) => calls.push(v) } });
  test('shows the campaign\'s own copy and three CTAs to existing pages; no prize, no date, no number', () => {
    render(<CampaignPanel lang="en" touch={false} explorerRef={ref()} st={{ focus: 'ikhtarha', focusView: 'overview' }} />);
    const p = screen.getByTestId('sr-ik-panel'); expect(p.textContent).toContain(IK.title.en); for (const s of IK.steps) { expect(p.textContent).toContain(s.t.en); expect(p.textContent).toContain(s.d.en); }
    expect(screen.getByTestId('sr-ik-price').getAttribute('href')).toMatch(/^\/booking/); expect(screen.getByTestId('sr-ik-play').getAttribute('href')).toMatch(/^\/campaign\/ikhtarha/); expect(screen.getByTestId('sr-ik-demo').getAttribute('href')).toMatch(/^\/campaign\/ikhtarha\/demo/);
    expect(p.textContent).not.toMatch(/BD|%|January|November|oven|Franke/i); expect(p.textContent).toMatch(/Terms & conditions apply/);
  });
  test('Arabic copy and the Arabic booking route', () => {
    render(<div dir="rtl"><CampaignPanel lang="ar" touch explorerRef={ref()} st={{ focus: 'ikhtarha' }} /></div>);
    expect(screen.getByTestId('sr-ik-panel').textContent).toContain(IK.title.ar); expect(screen.getByTestId('sr-ik-price').getAttribute('href')).toMatch(/^\/ar\/booking/); expect(screen.getByTestId('sr-ik-play').textContent).toBe(IK.cta.play.ar);
  });
  test('view chips and the back button call the explorer', () => {
    const calls = []; render(<CampaignPanel lang="en" touch={false} explorerRef={ref(calls)} st={{ focus: 'ikhtarha', focusView: 'overview' }} />);
    fireEvent.click(screen.getByTestId('sr-view-boxes')); fireEvent.click(screen.getByTestId('sr-panel-close')); expect(calls).toEqual(['boxes', 'exit']);
  });
});

describe('product + stage colliders', () => {
  const cols = productColliders(), bays = layoutBays(), R = PLAYER.radius;
  test('every furnished bay and the stage contribute footprints, and they are inside the hall', () => {
    const ids = cols.map((c) => c.id); for (const id of ['kitchen-run', 'kitchen-island', 'wardrobe-wardrobe', 'door-wall', 'door-bench', 'ikhtarha-platform', 'ikhtarha-blade']) expect(ids).toContain(id);
    for (const c of cols.filter((x) => x.type === 'box')) { expect(c.minX).toBeGreaterThanOrEqual(-HALL.halfWidth - 1e-6); expect(c.maxX).toBeLessThanOrEqual(HALL.halfWidth + 1e-6); expect(c.maxZ).toBeLessThanOrEqual(0); }
  });
  test('the kitchen island and run are solid, left and right bays mirror, and the department stand points stay free', () => {
    const all = buildColliders({ doorOpen: 1 }); const k = bays.find((b) => b.id === 'kitchens'), d = bays.find((b) => b.id === 'doors');
    expect(isFree(k.x - 0.3, k.z, R, all)).toBe(false);                                    // inside the island footprint
    expect(isFree(k.x + 2.9 - 0.3, k.z, R, all)).toBe(true);                               // in front of it, in the nave side of the bay
    expect(isFree(d.x + 1.0, d.z, R, all)).toBe(false);                                    // the door wall (mirrored: wall is at +x)
    for (const s of buildGraph().stops) expect(isFree(s.stand[0], s.stand[1], R, all)).toBe(true);
    expect(isFree(0, -20.5, R, all)).toBe(false);                                           // the stage platform
  });
  test('the walker can still reach the front of every furnished product (not boxed in)', () => {
    const all = buildColliders({ doorOpen: 1 });
    for (const [id, local] of [['kitchens', [1.2, 0.0]], ['wardrobes', [0.0, 0.0]], ['doors', [0.4, -1.5]]]) { const b = bays.find((q) => q.id === id); expect(isFree(b.x + b.facing * local[0], b.z + b.facing * local[1], R, all)).toBe(true); }
  });
});
