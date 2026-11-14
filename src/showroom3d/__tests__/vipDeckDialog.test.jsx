/* The "Add presentation" dialog + the generic slide + the panel's deck bar, against a fake explorer (no WebGL). */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VipDeckDialog, parseInput } from '../ui/VipDeckDialog';
import { SlideBody } from '../ui/VipSlide';
import { VipPanel } from '../ui/VipPanel';
import { resolveDeck, sanitizeDeck, DISCLAIMER } from '../vip/deckSchema';
import { PERMANENT_DECKS } from '../vip/decks';
import { makeDeckStore, ERR } from '../vip/deckStore';
import { initDeckState, deckReducer } from '../vip/deckState';
import { EXAMPLE_MARKDOWN } from '../vip/example';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } }; };
function fakeEx(storeFactory = () => mem()) {
  const store = makeDeckStore(storeFactory); const ex = { calls: [], userDecks: [], ds: initDeckState(['default'], 'default', 0, { default: 5 }) };
  ex.allDecks = () => [...PERMANENT_DECKS, ...ex.userDecks]; Object.defineProperty(ex, 'deck', { get: () => ex.allDecks().find((d) => d.id === ex.ds.deckId) });
  ex.setVipDialog = (v) => ex.calls.push(['dialog', v]);
  ex.addDeck = (d) => { const r = store.add(d); if (r.ok) { ex.userDecks = r.decks; ex.ds = deckReducer(ex.ds, { type: 'decks', ids: ex.allDecks().map((x) => x.id), counts: Object.fromEntries(ex.allDecks().map((x) => [x.id, x.slides.length])) }); ex.ds = deckReducer(ex.ds, { type: 'deck', id: r.deck.id }); } return r; };
  ex.removeDeck = (id) => { const r = store.remove(id); if (r.ok) { ex.userDecks = r.decks; ex.ds = deckReducer(ex.ds, { type: 'decks', ids: ex.allDecks().map((x) => x.id), counts: {} }); } ex.calls.push(['remove', id]); return r; };
  ex.setDeck = (id) => { ex.ds = deckReducer(ex.ds, { type: 'deck', id }); ex.calls.push(['setDeck', id]); }; ex.setStation = (i) => ex.calls.push(['station', i]); ex.stepStation = (d) => ex.calls.push(['step', d]); ex.exitFocus = () => {};
  return ex;
}
const type = (text) => fireEvent.change(screen.getByTestId('sr-vd-text'), { target: { value: text } });

describe('parseInput', () => {
  test('empty -> empty state; JSON when it starts with {; otherwise markdown; errors are sentences, never exceptions', () => {
    expect(parseInput('').empty).toBe(true); expect(parseInput(undefined).empty).toBe(true); expect(parseInput('{"title":"a","slides":[{"title":"b"}]}').ok).toBe(true); expect(parseInput('# a\n## b').ok).toBe(true);
    expect(parseInput('{bad').errors[0]).toMatch(/not valid JSON/); expect(parseInput('hello').errors.length).toBeGreaterThan(0);
  });
});

describe('Add presentation dialog', () => {
  test('shows the two fixed notices (local only + owner responsible) before anything is typed, tells the explorer to ignore keys, and Esc closes', () => {
    const ex = fakeEx(), onClose = jest.fn(); const { unmount } = render(<VipDeckDialog lang="en" ex={ex} max={6} onClose={onClose} />);
    expect(screen.getByTestId('sr-vd-local').textContent).toMatch(/this device only/i); expect(screen.getByTestId('sr-vd-responsible').textContent).toMatch(/responsible for the accuracy of any financial or legal content/i);
    expect(screen.getByTestId('sr-vd-save')).toBeDisabled(); expect(ex.calls).toContainEqual(['dialog', true]); fireEvent.keyDown(screen.getByTestId('sr-vd-dialog'), { key: 'Escape' }); expect(onClose).toHaveBeenCalled(); unmount(); expect(ex.calls).toContainEqual(['dialog', false]);
  });
  test('invalid markdown: line-numbered errors appear in an alert, Save stays disabled', () => {
    render(<VipDeckDialog lang="en" ex={fakeEx()} max={6} onClose={() => {}} />); type('# T\n## S\n![x](http://example.com/a.png)');
    expect(screen.getByTestId('sr-vd-errors').textContent).toMatch(/Line 3.*https/); expect(screen.getByTestId('sr-vd-save')).toBeDisabled(); expect(screen.getByTestId('sr-vd-status').dataset.state).toBe('error'); expect(screen.queryByTestId('sr-vd-preview')).toBeNull();
  });
  test('valid markdown: preview with the slides and the closing notice, warnings listed, Save enabled and saves on this device', () => {
    const ex = fakeEx(), onClose = jest.fn(); render(<VipDeckDialog lang="en" ex={ex} max={6} onClose={onClose} />); type(EXAMPLE_MARKDOWN.replace(/ \|\|[^\n]*/g, ''));
    expect(screen.getByTestId('sr-vd-valid').textContent).toMatch(/3 slides/); expect(screen.getByTestId('sr-vd-pv-title').textContent).toBe('Who we are');
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next slide')); expect(screen.getByTestId('sr-vd-pv-title').textContent).toBe('Important information'); expect(screen.getByTestId('sr-vip-disclaimer').textContent).toBe(DISCLAIMER.en);
    fireEvent.click(screen.getByTestId('sr-vd-save')); expect(onClose).toHaveBeenCalled(); expect(ex.userDecks).toHaveLength(1); expect(ex.ds.deckId).toBe(ex.userDecks[0].id);
  });
  test('financial wording gives a visible warning but is still allowed', () => {
    render(<VipDeckDialog lang="en" ex={fakeEx()} max={6} onClose={() => {}} />); type('# T\n## S\n- Expected returns of 12%');
    expect(screen.getByTestId('sr-vd-warnings').textContent).toMatch(/financial wording/); expect(screen.getByTestId('sr-vd-save')).not.toBeDisabled();
  });
  test('saving fails (blocked storage / full / limit): a clear message in the dialog, the dialog stays open, nothing is added', () => {
    for (const [mk, re] of [[() => { throw new Error('denied'); }, /does not allow saving/], [() => ({ getItem: () => null, setItem: () => { const e = new Error('q'); e.name = 'QuotaExceededError'; throw e; } }), /not enough storage/]]) {
      const ex = fakeEx(mk), onClose = jest.fn(); const { unmount } = render(<VipDeckDialog lang="en" ex={ex} max={6} onClose={onClose} />); type('# T\n## S\n- b'); fireEvent.click(screen.getByTestId('sr-vd-save'));
      expect(screen.getByTestId('sr-vd-saveerr').textContent).toMatch(re); expect(onClose).not.toHaveBeenCalled(); expect(ex.userDecks).toHaveLength(0); unmount();
    }
    const s = mem(), ex = fakeEx(() => s); for (let i = 0; i < 6; i++) ex.addDeck(sanitizeDeck({ title: 'd' + i, slides: [{ title: 's' }] }).deck);
    render(<VipDeckDialog lang="en" ex={ex} max={6} onClose={() => {}} />); type('# T\n## S'); fireEvent.click(screen.getByTestId('sr-vd-save')); expect(screen.getByTestId('sr-vd-saveerr').textContent).toMatch(/up to 6 saved presentations/);
    expect(ERR.max).toBe('max');
  });
  test('JSON typed into the box works; Arabic UI shows Arabic notices with dir=rtl', () => {
    render(<VipDeckDialog lang="ar" ex={fakeEx()} max={6} onClose={() => {}} />); expect(screen.getByTestId('sr-vd-dialog')).toHaveAttribute('dir', 'rtl'); expect(screen.getByTestId('sr-vd-local').textContent).toMatch(/هذا الجهاز فقط/);
    type('{"title":{"en":"E","ar":"ع"},"slides":[{"title":{"en":"S","ar":"ش"},"bullets":["x"]}]}'); expect(screen.getByTestId('sr-vd-pv-title').textContent).toBe('ش'); expect(screen.getByTestId('sr-vd-valid')).toBeInTheDocument();
  });
  test('file import reads a .json file into the preview; an oversized file is refused with a message', async () => {
    render(<VipDeckDialog lang="en" ex={fakeEx()} max={6} onClose={() => {}} />);
    const f = new File(['{"title":"F","slides":[{"title":"From file"}]}'], 'deck.json', { type: 'application/json' }); fireEvent.change(screen.getByTestId('sr-vd-file'), { target: { files: [f] } });
    expect(await screen.findByTestId('sr-vd-valid')).toBeInTheDocument(); expect(screen.getByTestId('sr-vd-pv-title').textContent).toBe('From file');
    const big = new File(['x'], 'big.json'); Object.defineProperty(big, 'size', { value: 999999999 }); fireEvent.change(screen.getByTestId('sr-vd-file'), { target: { files: [big] } }); expect(screen.getByTestId('sr-vd-fileerr').textContent).toMatch(/too large/);
  });
});

describe('generic slide and the panel deck bar', () => {
  const deck = sanitizeDeck({ title: 'D', slides: [{ title: 'Slide', lead: 'Lead', accent: 'brass', bullets: ['a', 'b'], links: [{ label: 'Kitchens', route: '/kitchen' }], blocks: [{ type: 'image', url: 'https://example.com/i.png', alt: 'Alt text', caption: 'Cap' }, { type: 'table', head: ['H1', 'H2'], rows: [['1', '2']] }, { type: 'bar', title: 'Chart', unit: 'k', data: [{ label: 'A', value: 2 }, { label: 'B', value: 4 }], source: 'Ops' }], illustrative: true }] }).deck;
  test('renders bullets, an https image with alt, a table, a bar chart with values, a whitelisted internal link, labels, and always the disclaimer footer', () => {
    const rd = resolveDeck(deck, 'en'); const { container } = render(<SlideBody lang="en" slide={rd.slides[0]} />);
    expect(container.querySelectorAll('.sr-vip-bullets li')).toHaveLength(2); expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/i.png'); expect(container.querySelector('img')).toHaveAttribute('alt', 'Alt text'); expect(container.querySelector('img')).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(container.querySelectorAll('table th')).toHaveLength(2); expect(container.querySelectorAll('.sr-vip-bar')).toHaveLength(2); expect(container.textContent).toMatch(/4 k/); expect(screen.getByTestId('sr-vip-slide-link')).toHaveAttribute('href', '/kitchen'); expect(screen.getByTestId('sr-vip-slide-source').textContent).toMatch(/Illustrative/);
    expect(screen.getByTestId('sr-vip-foot-disclaimer').textContent).toBe(DISCLAIMER.en); expect(container.querySelector('[data-accent="brass"]')).not.toBeNull();
    expect(container.querySelectorAll('a')).toHaveLength(1); expect(container.querySelector('script')).toBeNull();
  });
  test('the Arabic link is localised with /ar', () => { render(<SlideBody lang="ar" slide={resolveDeck(deck, 'ar').slides[0]} />); expect(screen.getByTestId('sr-vip-slide-link').getAttribute('href')).toBe('/kitchen'); expect(screen.getByTestId('sr-vip-foot-disclaimer').textContent).toBe(DISCLAIMER.ar); });
  test('a hostile deck that slipped past (no sanitiser) still renders as text only: React escapes, no HTML is created', () => {
    const rd = resolveDeck({ id: 'x', title: { en: 't', ar: 't' }, slides: [{ id: 's', title: { en: '<img src=x onerror=alert(1)>', ar: 'x' }, bullets: [{ en: '<script>alert(1)</script>', ar: 'x' }], blocks: [], links: [] }] }, 'en'); const { container } = render(<SlideBody lang="en" slide={rd.slides[0]} />);
    expect(container.querySelector('script')).toBeNull(); expect(container.querySelector('img')).toBeNull(); expect(container.textContent).toContain('<script>alert(1)</script>');
  });
  test('panel with only the built-in deck: select lists it, no delete / local note, five slide dots, "Station" wording kept; adding opens the dialog; user deck shows the local note and a two-step delete', () => {
    const ex = fakeEx(); ex.canvas = { parentNode: document.body }; const ref = { current: ex }; const view = (st) => <VipPanel lang="en" touch={false} explorerRef={ref} st={st} />;
    const { rerender } = render(view({ vipStation: 0 })); expect(screen.getByTestId('sr-vip-count').textContent).toMatch(/Station\s*1\s*\/\s*5/); expect(screen.getByTestId('sr-vip-deck-select').options).toHaveLength(1); expect(screen.queryByTestId('sr-vip-deck-delete')).toBeNull(); expect(screen.queryByTestId('sr-vip-local')).toBeNull(); expect(document.querySelectorAll('[data-testid^="sr-vip-dot-"]')).toHaveLength(5);
    fireEvent.click(screen.getByTestId('sr-vip-deck-add')); expect(screen.getByTestId('sr-vd-dialog')).toBeInTheDocument(); type('# Mine\n## One\n- a'); fireEvent.click(screen.getByTestId('sr-vd-save')); rerender(view({ vipStation: 0 }));
    expect(screen.getByTestId('sr-vip-deck-select').options).toHaveLength(2); expect(screen.getByTestId('sr-vip-local').textContent).toBe('Saved on this device only'); expect(screen.getByTestId('sr-vip-count').textContent).toMatch(/Slide\s*1\s*\/\s*2/); expect(screen.getByTestId('sr-vip-panel')).toHaveAttribute('data-deck', ex.userDecks[0].id);
    expect(screen.queryByTestId('sr-vip-cta')).toBeNull();
    fireEvent.click(screen.getByTestId('sr-vip-deck-delete')); expect(screen.getByTestId('sr-vip-deck-confirm')).toBeInTheDocument(); expect(ex.userDecks).toHaveLength(1); fireEvent.click(screen.getByTestId('sr-vip-deck-delete-no')); expect(screen.queryByTestId('sr-vip-deck-confirm')).toBeNull();
    fireEvent.click(screen.getByTestId('sr-vip-deck-delete')); fireEvent.click(screen.getByTestId('sr-vip-deck-delete-yes')); rerender(view({ vipStation: 0 })); expect(ex.userDecks).toHaveLength(0); expect(screen.getByTestId('sr-vip-panel')).toHaveAttribute('data-deck', 'default'); expect(screen.getByTestId('sr-vip-deck-select').options).toHaveLength(1);
  });
  test('default deck slide 5 (briefing) keeps its CTA; the deck select switches deck through the explorer; AR panel is rtl', () => {
    const ex = fakeEx(); ex.canvas = { parentNode: document.body }; const { rerender } = render(<VipPanel lang="ar" touch={false} explorerRef={{ current: ex }} st={{ vipStation: 4 }} />);
    expect(screen.getByTestId('sr-vip-cta')).toBeInTheDocument(); expect(screen.getByTestId('sr-vip-panel')).toHaveAttribute('dir', 'rtl'); expect(within(screen.getByTestId('sr-vip-panel')).getByTestId('sr-vip-disclaimer')).toBeInTheDocument();
    ex.addDeck(sanitizeDeck({ title: 'Z', slides: [{ title: 'z' }] }).deck); ex.ds = deckReducer(ex.ds, { type: 'deck', id: 'default' }); rerender(<VipPanel lang="ar" touch={false} explorerRef={{ current: ex }} st={{ vipStation: 0 }} />);
    fireEvent.change(screen.getByTestId('sr-vip-deck-select'), { target: { value: ex.userDecks[0].id } }); expect(ex.calls).toContainEqual(['setDeck', ex.userDecks[0].id]);
  });
});
