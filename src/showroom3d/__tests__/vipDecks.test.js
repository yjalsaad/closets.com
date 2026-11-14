/* VIP decks: schema validation, sanitising (injection / oversize), markdown conversion, disclaimer auto-append, {{fact}} placeholders, picker state machine,
 * persistence (incl. failures), RTL helpers, string coverage. All pure: no DOM needed beyond jsdom's localStorage stand-ins. */
import { sanitizeDeck, cleanText, cleanImageUrl, cleanRoute, LIMITS, ROUTE_WHITELIST, DISCLAIMER, PLACEHOLDER, DISCLAIMER_SLIDE_ID, withDisclaimer, deckHasDisclaimer, resolveDeck, resolveText, resolveFact, deckWarnings } from '../vip/deckSchema';
import { markdownToDeck, parseMarkdownDeck } from '../vip/deckMarkdown';
import { makeDeckStore, STORE_KEY, MAX_USER_DECKS, ERR } from '../vip/deckStore';
import { initDeckState, deckReducer } from '../vip/deckState';
import { chipLayout, ellipsize, stampRoom } from '../scenes/vip/panels';
import { EXAMPLE_MARKDOWN } from '../vip/example';
import { STRINGS } from '../strings';
import { arrowDir } from '../products/vipContent';

const good = (extra = {}) => ({ title: 'My deck', slides: [{ title: 'One', bullets: ['a', 'b'] }], ...extra });
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k), _m: m }; };

describe('schema validation', () => {
  test('a minimal deck is accepted; string text fills EN and AR; ids are prefixed user-', () => {
    const r = sanitizeDeck(good()); expect(r.ok).toBe(true); expect(r.errors).toEqual([]); expect(r.deck.id.startsWith('user-')).toBe(true); expect(r.deck.title).toEqual({ en: 'My deck', ar: 'My deck' });
  });
  test('bilingual text keeps both languages; one missing language falls back to the other', () => {
    const r = sanitizeDeck({ title: { en: 'Hello' }, slides: [{ title: { ar: 'مرحبا' }, bullets: [{ en: 'x', ar: 'س' }] }] });
    expect(r.deck.title).toEqual({ en: 'Hello', ar: 'Hello' }); expect(r.deck.slides[0].title).toEqual({ en: 'مرحبا', ar: 'مرحبا' }); expect(r.deck.slides[0].bullets[0]).toEqual({ en: 'x', ar: 'س' });
  });
  test.each([
    [null, /JSON object/], [[], /JSON object/], ['{not json', /not valid JSON/], [{ slides: [{ title: 'a' }] }, /"title"/], [{ title: 'a' }, /"slides"/], [{ title: 'a', slides: [] }, /at least one slide/],
    [{ title: 'a', slides: [{ bullets: ['x'] }] }, /Slide 1 needs a "title"/], [{ title: 'a', slides: ['x'] }, /Slide 1 is not an object/],
  ])('rejects %j with a clear message', (raw, msg) => { const r = sanitizeDeck(raw); expect(r.ok).toBe(false); expect(r.deck).toBeNull(); expect(r.errors.join(' ')).toMatch(msg); });
  test('JSON text input is parsed', () => { expect(sanitizeDeck(JSON.stringify(good())).ok).toBe(true); });
  test('blocks: image, table, bar chart are normalised; bad ones give clear errors with the slide number', () => {
    const r = sanitizeDeck(good({ slides: [{ title: 'S', blocks: [{ type: 'image', url: 'https://example.com/a.png', alt: 'A' }, { type: 'table', head: ['A', 'B'], rows: [['1', '2'], ['3']] }, { type: 'bar', unit: 'k', data: [{ label: 'x', value: 3 }, { label: 'y', value: '5' }], source: 'Ops report', illustrative: true }] }] }));
    expect(r.ok).toBe(true); const b = r.deck.slides[0].blocks; expect(b.map((x) => x.type)).toEqual(['image', 'table', 'bar']); expect(b[1].rows[1]).toHaveLength(2); expect(b[2].data[1].value).toBe(5); expect(b[2].illustrative).toBe(true); expect(b[2].source.en).toBe('Ops report');
    expect(sanitizeDeck(good({ slides: [{ title: 'S', blocks: [{ type: 'video' }] }] })).errors.join()).toMatch(/Slide 1, block 1.*not supported/);
    expect(sanitizeDeck(good({ slides: [{ title: 'S', blocks: [{ type: 'bar', data: [{ label: 'x', value: -3 }] }] }] })).errors.join()).toMatch(/bar 1/);
    expect(sanitizeDeck(good({ slides: [{ title: 'S', blocks: [{ type: 'bar', data: [{ label: 'x', value: 'abc' }] }] }] })).ok).toBe(false);
    expect(sanitizeDeck(good({ slides: [{ title: 'S', blocks: [{ type: 'table', rows: [] }] }] })).ok).toBe(false);
  });
  test('accent: whitelisted names only (anything else is dropped with a warning, never a raw colour)', () => {
    const r = sanitizeDeck(good({ slides: [{ title: 'S', accent: 'sage' }, { title: 'T', accent: '#ff0000' }, { title: 'U', accent: 'url(x)' }] }));
    expect(r.deck.slides[0].accent).toBe('sage'); expect(r.deck.slides[1].accent).toBeUndefined(); expect(r.deck.slides[2].accent).toBeUndefined(); expect(r.warnings.join()).toMatch(/accent/);
  });
  test('duplicate and reserved slide ids are made unique; a user slide cannot take the disclaimer id', () => {
    const r = sanitizeDeck(good({ slides: [{ id: 'a', title: 'A' }, { id: 'a', title: 'B' }, { id: DISCLAIMER_SLIDE_ID, title: 'C' }] })); const ids = r.deck.slides.map((s) => s.id); expect(new Set(ids).size).toBe(ids.length); expect(ids.filter((i) => i === DISCLAIMER_SLIDE_ID)).toHaveLength(1);
    expect(r.deck.slides[r.deck.slides.length - 1].disclaimer).toBe(true);
  });
  test('trusted-only keys (builtin, data, disclaimer) from an import are dropped', () => {
    const r = sanitizeDeck(good({ slides: [{ title: 'S', builtin: 'hub', data: { x: 1 }, disclaimer: true }] })); const s = r.deck.slides[0]; expect(s.builtin).toBeUndefined(); expect(s.data).toBeUndefined(); expect(s.disclaimer).toBeUndefined(); expect(r.deck.builtin).toBeUndefined();
    const r2 = sanitizeDeck({ ...good(), builtin: true, unit: 'station' }); expect(r2.deck.builtin).toBeUndefined(); expect(r2.deck.unit).toBeUndefined();
  });
  test('limits: max slides rejected, bullets / blocks / table / bars truncated with a warning', () => {
    const many = { title: 'x', slides: Array.from({ length: LIMITS.maxSlides + 1 }, (_, i) => ({ title: 'S' + i })) }; const r = sanitizeDeck(many); expect(r.ok).toBe(false); expect(r.errors.join()).toMatch(/Too many slides/);
    const big = sanitizeDeck(good({ slides: [{ title: 'S', bullets: Array.from({ length: 30 }, (_, i) => 'b' + i), blocks: [{ type: 'bar', data: Array.from({ length: 20 }, (_, i) => ({ label: 'l' + i, value: i })) }, { type: 'table', rows: Array.from({ length: 40 }, () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) }] }] }));
    const s = big.deck.slides[0]; expect(s.bullets).toHaveLength(LIMITS.maxBullets); expect(s.blocks[0].data).toHaveLength(LIMITS.maxBars); expect(s.blocks[1].rows).toHaveLength(LIMITS.maxTableRows); expect(s.blocks[1].rows[0]).toHaveLength(LIMITS.maxTableCols); expect(big.warnings.length).toBeGreaterThanOrEqual(3);
  });
  test('a deck with exactly max slides is fine and gets the disclaimer slide on top', () => {
    const r = sanitizeDeck({ title: 'x', slides: Array.from({ length: LIMITS.maxSlides }, (_, i) => ({ title: 'S' + i })) }); expect(r.ok).toBe(true); expect(r.deck.slides).toHaveLength(LIMITS.maxSlides + 1);
  });
  test('links: only whitelisted internal routes', () => {
    const r = sanitizeDeck(good({ slides: [{ title: 'S', links: [{ label: 'Kitchens', route: '/kitchen' }, { label: 'Book', route: '/booking' }] }] })); expect(r.ok).toBe(true); expect(r.deck.slides[0].links.map((l) => l.route)).toEqual(['/kitchen', '/booking']);
    for (const bad of ['https://evil.example', '//evil.example', 'javascript:alert(1)', '/admin', '/kitchen/../admin', '/kitchen?x=1']) { const x = sanitizeDeck(good({ slides: [{ title: 'S', links: [{ label: 'x', route: bad }] }] })); expect(x.ok).toBe(false); expect(x.errors.join()).toMatch(/External links are not allowed/); }
    expect(ROUTE_WHITELIST.every((p) => cleanRoute(p) === p)).toBe(true);
  });
});

describe('sanitising: injection attempts and oversized input', () => {
  const evil = ['<script>alert(1)</script>Hello', '<img src=x onerror=alert(1)>Hi', '<b onclick="x()">bold</b>', 'text <iframe src="https://evil"></iframe> end', '<style>body{display:none}</style>ok', 'a<!-- hidden -->b', '&lt;script&gt;alert(1)&lt;/script&gt;', 'javascript:alert(1)', '<a href="javascript:alert(1)">click</a>', '<svg/onload=alert(1)>x'];
  test.each(evil)('markup in %j never survives in any text field', (txt) => {
    const r = sanitizeDeck({ title: txt || 'x', slides: [{ title: txt + ' t', lead: txt, bullets: [txt], source: txt, blocks: [{ type: 'table', head: [txt], rows: [[txt]] }, { type: 'bar', title: txt, unit: txt, data: [{ label: txt, value: 1 }] }, { type: 'image', url: 'https://example.com/i.png', alt: txt, caption: txt }] }] });
    const all = JSON.stringify(r.deck); expect(all).not.toMatch(/<\s*\/?\s*[a-z!]/i); expect(all).not.toMatch(/javascript\s*:/i); expect(all).not.toMatch(/&lt;|&gt;/i); expect(all).not.toMatch(/onerror=|onload=|onclick=/i);
  });
  test('control characters and bidi overrides are removed; whitespace collapsed', () => { expect(cleanText('a\u0000b‮c​d\n\n  e\t f', 50)).toBe('abcd e f'); });
  test('over-long text is capped with an ellipsis', () => { const t = cleanText('x'.repeat(1000), 50); expect(t).toHaveLength(50); expect(t.endsWith('…')).toBe(true); });
  test.each([
    ['http://example.com/a.png'], ['javascript:alert(1)'], ['data:image/png;base64,AAAA'], ['file:///etc/passwd'], ['//example.com/a.png'], ['/relative.png'], ['https://user:pw@example.com/a.png'], ['https://localhost/a.png'], ['https://exa mple.com/a.png'], ['HTTPS://'], ['https://example.com/' + 'a'.repeat(600)], ['ftp://example.com/a.png'], [{ toString: () => 'https://example.com/a.png' }], [null], [42],
  ])('image address %j is rejected', (u) => { expect(cleanImageUrl(u)).toBe(''); const r = sanitizeDeck(good({ slides: [{ title: 'S', blocks: [{ type: 'image', url: u, alt: 'x' }] }] })); expect(r.ok).toBe(false); expect(r.errors.join()).toMatch(/https/); });
  test('an https image is kept (normalised) and a deck with a bad image is rejected as a whole, not half-imported', () => { expect(cleanImageUrl('https://cdn.example.com/a b.png'.replace(' ', '%20'))).toMatch(/^https:\/\/cdn\.example\.com\//); });
  test('oversized input (text and JSON) is refused before parsing', () => {
    const r = sanitizeDeck('{"title":"' + 'x'.repeat(LIMITS.maxInput) + '"}'); expect(r.ok).toBe(false); expect(r.errors[0]).toMatch(/too long/);
    expect(markdownToDeck('# t\n## s\n- ' + 'x'.repeat(LIMITS.maxInput)).errors[0]).toMatch(/too long/);
  });
  test('prototype pollution style keys are ignored', () => {
    const r = sanitizeDeck(JSON.parse('{"title":"t","__proto__":{"polluted":1},"slides":[{"title":"s","__proto__":{"x":1},"constructor":{"prototype":{"y":1}}}]}')); expect(r.ok).toBe(true); expect({}.polluted).toBeUndefined(); expect(r.deck.slides[0].x).toBeUndefined();
  });
  test('non-string values where text is expected never throw', () => { expect(() => sanitizeDeck({ title: { en: {} }, slides: [{ title: [], bullets: [null, {}, 3, true] }] })).not.toThrow(); expect(sanitizeDeck({ title: 'x', slides: [{ title: 5, bullets: [null, {}, 3] }] }).deck.slides[0].bullets).toHaveLength(1); });
});

describe('financial wording and the disclaimer', () => {
  test('imported financial wording / figures are allowed but flagged (the owner is responsible); clean decks give no such warning', () => {
    expect(sanitizeDeck(good({ slides: [{ title: 'Returns', bullets: ['Expected ROI 12%'] }] })).warnings.join()).toMatch(/financial wording/); expect(sanitizeDeck(good()).warnings).toEqual([]);
  });
  test('a chart or table with no source and no illustrative flag is flagged; with a source it is not', () => {
    const mk = (b) => sanitizeDeck(good({ slides: [{ title: 'S', blocks: [b] }] })).warnings.join(); expect(mk({ type: 'bar', data: [{ label: 'a', value: 1 }] })).toMatch(/no "source"/); expect(mk({ type: 'bar', data: [{ label: 'a', value: 1 }], source: 'x' })).toBe(''); expect(mk({ type: 'bar', data: [{ label: 'a', value: 1 }], illustrative: true })).toBe('');
  });
  test('EVERY sanitised deck ends with the neutral disclaimer slide, in both languages, whatever was imported', () => {
    for (const raw of [good(), good({ slides: [{ title: 'Disclaimer', bullets: ['Guaranteed returns'] }] }), { title: 'x', slides: [{ title: 'S', bullets: [DISCLAIMER.en] }] }, { title: 'x', slides: [{ title: 'S', disclaimer: true }] }]) {
      const r = sanitizeDeck(raw); expect(r.ok).toBe(true); const last = r.deck.slides[r.deck.slides.length - 1]; expect(last.disclaimer).toBe(true); expect(last.bullets[0]).toEqual(DISCLAIMER); expect(deckHasDisclaimer(r.deck)).toBe(true);
      for (const lang of ['en', 'ar']) { const rd = resolveDeck(r.deck, lang); expect(rd.slides[rd.slides.length - 1].bullets[0]).toBe(DISCLAIMER[lang]); }
    }
    expect(DISCLAIMER.en).toBe('Information only, not an offer or financial advice; details provided directly by management.');
  });
  test('withDisclaimer is idempotent and a deck that fakes it with a user bullet only on a MIDDLE slide still gets the real one at the end', () => {
    const r = sanitizeDeck({ title: 'x', slides: [{ title: 'S', bullets: [DISCLAIMER.en] }, { title: 'T' }] }); expect(r.deck.slides).toHaveLength(3); expect(withDisclaimer(r.deck).slides).toHaveLength(3);
  });
  test('a stored 20-slide deck (21 with the appended notice) re-sanitises cleanly and does not grow a second notice', () => {
    const a = sanitizeDeck({ title: 'x', slides: Array.from({ length: LIMITS.maxSlides }, (_, i) => ({ title: 'S' + i })) }).deck; const b = sanitizeDeck(JSON.parse(JSON.stringify(a))); expect(b.ok).toBe(true); expect(b.deck.slides).toHaveLength(LIMITS.maxSlides + 1);
  });
  test('stored / imported text cannot drop the disclaimer: it is re-added by every sanitise', () => { const a = sanitizeDeck(good()).deck; const b = sanitizeDeck({ ...a, slides: a.slides.slice(0, 1) }); expect(deckHasDisclaimer(b.deck)).toBe(true); });
});

describe('{{fact:key}} placeholders resolve from facts.js', () => {
  test('unconfirmed facts show "To be confirmed by management" (EN + AR); confirmed ones appear automatically; unknown keys are placeholders, never injected', () => {
    expect(resolveText({ en: 'Years: {{fact:productionModel}}', ar: 'سنوات: {{fact:productionModel}}' }, 'en')).toBe('Years: ' + PLACEHOLDER.en); expect(resolveText({ en: 'x', ar: 'سنوات: {{fact:homesDelivered}}' }, 'ar')).toBe('سنوات: ' + PLACEHOLDER.ar);
    expect(resolveFact('yearsOfCraft', { yearsOfCraft: { en: '12 years', ar: '12 سنة' } })).toEqual({ en: '12 years', ar: '12 سنة' }); expect(resolveFact('showroomCount', { showroomCount: 4 })).toEqual({ en: '4', ar: '4' });
    expect(resolveFact('secretKey', { secretKey: 'leak' })).toBe(PLACEHOLDER); expect(resolveText('{{fact:__proto__}} {{fact:constructor}}', 'en')).toBe(PLACEHOLDER.en + ' ' + PLACEHOLDER.en);
  });
  test('an imported deck using a token resolves at render time (so a later facts.js value appears with no re-import)', () => {
    const d = sanitizeDeck(good({ slides: [{ title: 'S', bullets: ['We have {{fact:showroomCount}} showrooms'] }] })).deck; expect(resolveDeck(d, 'en').slides[0].bullets[0]).toBe('We have ' + PLACEHOLDER.en + ' showrooms');
    expect(resolveDeck(d, 'en', { showroomCount: 3 }, () => true).slides[0].bullets[0]).toBe('We have 3 showrooms');
  });
});

describe('markdown conversion', () => {
  const md = '# Deck || سطح\n## Slide one || الأولى\n> Intro line\n- first || الأول\n- second\n![Logo](https://example.com/logo.png)\n\n## Two\n- only\n';
  test('# deck, ## slide, > lead, - bullet, ![alt](https) image, || for Arabic', () => {
    const r = markdownToDeck(md); expect(r.errors).toEqual([]); expect(r.deck.title).toEqual({ en: 'Deck', ar: 'سطح' }); expect(r.deck.slides).toHaveLength(2); const s = r.deck.slides[0]; expect(s.title).toEqual({ en: 'Slide one', ar: 'الأولى' }); expect(s.lead).toBe('Intro line'); expect(s.bullets).toEqual([{ en: 'first', ar: 'الأول' }, 'second']); expect(s.blocks[0]).toMatchObject({ type: 'image', url: 'https://example.com/logo.png', alt: 'Logo' });
    const f = parseMarkdownDeck(md, sanitizeDeck); expect(f.ok).toBe(true); expect(f.deck.slides).toHaveLength(3); expect(deckHasDisclaimer(f.deck)).toBe(true);
  });
  test('CRLF line endings and * bullets work', () => { const r = markdownToDeck('# T\r\n## S\r\n* a\r\n* b'); expect(r.errors).toEqual([]); expect(r.deck.slides[0].bullets).toHaveLength(2); });
  test('errors name the line: content before a slide, second title, bad image, missing space, missing title / slides', () => {
    expect(markdownToDeck('# T\n- orphan\n## S').errors.join()).toMatch(/Line 2.*before the first slide/); expect(markdownToDeck('# T\n# U\n## S').errors.join()).toMatch(/Line 2.*second deck title/);
    expect(markdownToDeck('# T\n## S\n![x](http://example.com/a.png)').errors.join()).toMatch(/Line 3.*https/); expect(markdownToDeck('# T\n## S\n![x](javascript:alert(1))').errors.join()).toMatch(/Line 3/);
    expect(markdownToDeck('#T\n## S').errors.join()).toMatch(/Line 1.*space/); expect(markdownToDeck('## S').errors.join()).toMatch(/deck title/); expect(markdownToDeck('# T').errors.join()).toMatch(/at least one slide/); expect(markdownToDeck('').errors.length).toBeGreaterThan(0); expect(markdownToDeck(42).errors[0]).toMatch(/Paste/);
  });
  test('unknown lines are ignored with a warning, not silently', () => { const r = markdownToDeck('# T\n## S\nplain words\n- b'); expect(r.errors).toEqual([]); expect(r.warnings.join()).toMatch(/Line 3 was ignored/); });
  test('HTML typed into markdown is stripped by the sanitiser', () => { const r = parseMarkdownDeck('# T <script>x</script>\n## S <b>b</b>\n- <img src=x onerror=alert(1)>hi', sanitizeDeck); expect(JSON.stringify(r.deck)).not.toMatch(/<|script/i); expect(r.deck.slides[0].bullets[0].en).toBe('hi'); });
  test('the built-in example is valid, bilingual and clean (no financial wording)', () => { const r = parseMarkdownDeck(EXAMPLE_MARKDOWN, sanitizeDeck); expect(r.ok).toBe(true); expect(r.warnings).toEqual([]); expect(/[؀-ۿ]/.test(JSON.stringify(r.deck.title))).toBe(true); });
  test('slide cap applies to markdown too', () => { const m = '# T\n' + Array.from({ length: 25 }, (_, i) => '## S' + i).join('\n'); expect(parseMarkdownDeck(m, sanitizeDeck).errors.join()).toMatch(/Too many slides/); });
});

describe('picker state machine', () => {
  const st0 = () => initDeckState(['default', 'user-a', 'user-b'], 'default', 0, { default: 5, 'user-a': 3, 'user-b': 2 });
  test('slides clamp (no wrap); decks cycle; switching deck starts at slide 1', () => {
    let s = st0(); s = deckReducer(s, { type: 'step', dir: -1 }); expect(s.slide).toBe(0); for (let i = 0; i < 9; i++) s = deckReducer(s, { type: 'step', dir: 1 }); expect(s.slide).toBe(4);
    s = deckReducer(s, { type: 'deckStep', dir: 1 }); expect(s.deckId).toBe('user-a'); expect(s.slide).toBe(0); s = deckReducer(s, { type: 'slide', index: 99 }); expect(s.slide).toBe(2);
    s = deckReducer(s, { type: 'deckStep', dir: 1 }); s = deckReducer(s, { type: 'deckStep', dir: 1 }); expect(s.deckId).toBe('default'); s = deckReducer(s, { type: 'deckStep', dir: -1 }); expect(s.deckId).toBe('user-b');
  });
  test('unknown deck / bad slide input is ignored; same state object returned when nothing changes', () => {
    const s = st0(); expect(deckReducer(s, { type: 'deck', id: 'nope' })).toBe(s); expect(deckReducer(s, { type: 'deck', id: 'default' })).toBe(s); expect(deckReducer(s, { type: 'slide', index: 0 })).toBe(s); expect(deckReducer(s, { type: 'slide', index: NaN }).slide).toBe(0); expect(deckReducer(s, { type: 'x' })).toBe(s);
    expect(initDeckState(['default'], 'zzz').deckId).toBe('default'); const one = initDeckState(['default']); expect(deckReducer(one, { type: 'deckStep', dir: 1 })).toBe(one);
  });
  test('deleting the deck in view falls back to the first deck; deleting another keeps the view; slide is re-clamped', () => {
    let s = deckReducer(st0(), { type: 'deck', id: 'user-a' }); s = deckReducer(s, { type: 'slide', index: 2 });
    const kept = deckReducer(s, { type: 'decks', ids: ['default', 'user-a'], counts: { default: 5, 'user-a': 3 } }); expect(kept.deckId).toBe('user-a'); expect(kept.slide).toBe(2);
    const gone = deckReducer(s, { type: 'decks', ids: ['default', 'user-b'], counts: { default: 5, 'user-b': 2 } }); expect(gone.deckId).toBe('default'); expect(gone.slide).toBe(0);
    const shrunk = deckReducer(s, { type: 'decks', ids: ['default', 'user-a'], counts: { default: 5, 'user-a': 2 } }); expect(shrunk.slide).toBe(1); expect(deckReducer(s, { type: 'decks', ids: [], counts: {} }).deckId).toBe('default');
  });
});

describe('persistence on this device only', () => {
  const deck = (n = 'a') => sanitizeDeck({ title: n, slides: [{ title: 'S', bullets: ['x'] }] }).deck;
  test('add / list / remove round-trip under one key, decks re-sanitised on load (the disclaimer is always there)', () => {
    const s = mem(), st = makeDeckStore(() => s); expect(st.list()).toEqual([]); const r = st.add(deck('a')); expect(r.ok).toBe(true); expect(st.add(deck('b')).ok).toBe(true); expect([...s._m.keys()]).toEqual([STORE_KEY]);
    expect(st.list().map((d) => d.title.en)).toEqual(['a', 'b']); expect(st.list().every(deckHasDisclaimer)).toBe(true); expect(st.remove(r.deck.id).decks.map((d) => d.title.en)).toEqual(['b']); expect(st.list()).toHaveLength(1);
  });
  test('the same title twice gets a numbered id; the limit is enforced with a clear code', () => {
    const m1 = mem(), st = makeDeckStore(() => m1); expect(st.add(deck('a')).ok).toBe(true); const second = st.add(deck('a')); expect(second.deck.id).toMatch(/-2$/);
    const s = mem(), st2 = makeDeckStore(() => s); for (let i = 0; i < MAX_USER_DECKS; i++) expect(st2.add(deck('d' + i)).ok).toBe(true); const over = st2.add(deck('x')); expect(over.ok).toBe(false); expect(over.error).toBe(ERR.max); expect(st2.list()).toHaveLength(MAX_USER_DECKS);
  });
  test('storage that throws on access (private window / blocked): reads are empty, writes fail with a message code, nothing throws', () => {
    const boom = () => { throw new Error('SecurityError'); }; const st = makeDeckStore(boom); expect(st.list()).toEqual([]); expect(st.load().error).toBe(ERR.blocked); expect(st.add(deck()).error).toBe(ERR.blocked); expect(st.remove('x').error).toBe(ERR.blocked);
    const nul = makeDeckStore(() => null); expect(nul.add(deck()).error).toBe(ERR.blocked);
    const getBoom = makeDeckStore(() => ({ getItem: boom, setItem: boom })); expect(getBoom.load().error).toBe(ERR.blocked); expect(getBoom.add(deck()).ok).toBe(false);
  });
  test('quota errors on write give "full"; other write errors give "blocked"; the stored list is untouched', () => {
    const base = mem(), s = { getItem: base.getItem, setItem: () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } }; const st = makeDeckStore(() => s); const r = st.add(deck()); expect(r.ok).toBe(false); expect(r.error).toBe(ERR.full);
    expect(makeDeckStore(() => ({ getItem: () => null, setItem: () => { throw new Error('nope'); } })).add(deck()).error).toBe(ERR.blocked);
  });
  test('corrupt or hostile stored JSON is dropped safely; bad entries are skipped; script text inside a stored deck is stripped on load', () => {
    const s = mem(); s.setItem(STORE_KEY, '{oops'); const st = makeDeckStore(() => s); expect(st.load()).toEqual({ decks: [], error: ERR.corrupt });
    s.setItem(STORE_KEY, JSON.stringify({ v: 1, decks: [null, 7, { title: 'ok', slides: [{ title: '<script>alert(1)</script>X', blocks: [{ type: 'image', url: 'javascript:alert(1)', alt: 'x' }] }] }, { title: 'fine', slides: [{ title: '<b>Y</b>' }] }] })); const l = st.load(); expect(l.decks).toHaveLength(1); expect(JSON.stringify(l.decks)).not.toMatch(/<|script/i);
    s.setItem(STORE_KEY, JSON.stringify({ v: 1, decks: Array.from({ length: 50 }, (_, i) => ({ title: 't' + i, slides: [{ title: 's' }] })) })); expect(st.list()).toHaveLength(MAX_USER_DECKS);
  });
  test('a deck too big for the stored-size cap is refused as "full"', () => { const m3 = mem(), st = makeDeckStore(() => m3); const big = deck(); big.slides = Array.from({ length: 20 }, () => ({ id: 'x', title: { en: 't', ar: 't' }, bullets: Array.from({ length: 8 }, () => ({ en: 'x'.repeat(220), ar: 'ي'.repeat(220) })), blocks: [], links: [] })); const r = Array.from({ length: 6 }, () => st.add({ ...big, id: 'user-big' })).find((x) => !x.ok); expect(r && r.error).toBe(ERR.full); });
});

describe('RTL and strings', () => {
  test('Arabic resolution picks the Arabic text; arrows mirror; deck chips mirror to the other side of the screen', () => {
    const d = sanitizeDeck({ title: { en: 'E', ar: 'ع' }, slides: [{ title: { en: 'T', ar: 'ش' } }] }).deck; expect(resolveDeck(d, 'ar').title).toBe('ع'); expect(resolveDeck(d, 'ar').slides[0].title).toBe('ش'); expect(resolveDeck(d, 'en').slides[0].title).toBe('T');
    expect(arrowDir('ArrowRight', true)).toBe(-1); expect(arrowDir('ArrowRight', false)).toBe(1);
    const ltr = chipLayout(['A', 'B', 'C'], 1536, false), rtl = chipLayout(['A', 'B', 'C'], 1536, true); expect(ltr[0].x).toBeGreaterThan(1536 / 2); expect(rtl[0].x).toBeLessThan(1536 / 2); for (const r of [...ltr, ...rtl]) { expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.w).toBeLessThanOrEqual(1536); }
    expect(chipLayout(['a', 'b', 'c', 'd', 'e', 'f'], 1536, false)).toHaveLength(3); expect(chipLayout(['a', 'b', 'c', 'd', 'e', 'f'], 1536, false, 3, 5).map((r) => r.i)).toEqual([3, 4, 5]); expect(chipLayout(['a', 'b', 'c', 'd'], 1536, false, 3, 2).map((r) => r.i)).toEqual([1, 2, 3]); expect(chipLayout(['a', 'b', 'c', 'd'], 1536, false, 3, 0).map((r) => r.i)).toEqual([0, 1, 2]);
    // chips never overlap: there is a gap between neighbours, and every label is cut with an ellipsis to fit its own chip
    const real = ['Company presentation', 'The Closets: Company Profile', 'YAS Profile (2023)', 'Watch our story'];
    for (const rtlMode of [false, true]) for (const act of [0, 1, 2, 3]) { const rs = chipLayout(real, 1536, rtlMode, 3, act); for (let q = 1; q < rs.length; q++) expect(rs[q].x - (rs[q - 1].x + rs[q - 1].w)).toBeGreaterThanOrEqual(12); for (const r of rs) expect(r.w).toBeLessThanOrEqual(250); }
    const m = (t) => t.length * 13; expect(ellipsize('short', 200, m)).toBe('short'); const cut = ellipsize('The Closets: Company Profile', 214, m); expect(cut.endsWith('…')).toBe(true); expect(m(cut)).toBeLessThanOrEqual(214); expect(cut.length).toBeGreaterThan(8); expect(ellipsize('abc', 1, m)).toBe('…');
    // the slide stamp line keeps clear of the chips (LTR: chips on the right; RTL: chips on the left), and has no limit when no chips are drawn
    expect(stampRoom(['only'], 1536, false)).toBe(0); expect(stampRoom(null, 1536, false)).toBe(0);
    for (const rtlMode of [false, true]) { const room = stampRoom(real, 1536, rtlMode, 3, 1), rs = chipLayout(real, 1536, rtlMode, 3, 1); expect(room).toBeGreaterThan(300); if (rtlMode) expect(1536 - 70 - room).toBeGreaterThan(rs[rs.length - 1].x + rs[rs.length - 1].w); else expect(70 + room).toBeLessThan(rs[0].x); }
  });
  test('all new UI strings exist in EN and AR (the strings test also checks Arabic script and no emoji)', () => {
    for (const k of ['vipDeckLabel', 'vipDeckAdd', 'vipDeckDelete', 'vipDeckLocal', 'vdTitle', 'vdResponsible', 'vdLocal', 'vdSave', 'vdErrBlocked', 'vdErrFull', 'vdErrMax', 'vdEmpty', 'vdValid']) { expect(STRINGS[k].en.length).toBeGreaterThan(3); expect(/[؀-ۿ]/.test(STRINGS[k].ar)).toBe(true); }
    expect(STRINGS.vdLocal.en).toMatch(/this device only/i); expect(STRINGS.vipDeckLocal.en).toBe('Saved on this device only'); expect(STRINGS.vdResponsible.en).toMatch(/responsible for the accuracy of any financial or legal content/i);
  });
  test('deckWarnings is pure and does not mutate', () => { const d = sanitizeDeck(good()).deck, before = JSON.stringify(d); deckWarnings(d); expect(JSON.stringify(d)).toBe(before); });
});
