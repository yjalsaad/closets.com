/* The two profile decks (The Closets - Company Profile, YAS Profile 2023): schema, EN+AR parity, sources, honesty, images on disk, Hub export files. */
import fs from 'fs';
import path from 'path';
import { CLOSETS_PROFILE_DECK } from '../vip/decks/closets-profile';
import { YAS_PROFILE_DECK } from '../vip/decks/yas-profile';
import { PERMANENT_DECKS } from '../vip/decks';
import { sanitizeDeck, resolveDeck, deckHasDisclaimer, FORBIDDEN_FINANCIAL, SITE_IMAGE, LIMITS, PLACEHOLDER, DISCLAIMER } from '../vip/deckSchema';
import { FACTS } from '../../content/facts';

const PUB = path.resolve(__dirname, '../../../public/yas-bloom/profile'), DOCS = path.resolve(__dirname, '../../../docs/showroom3d/decks');
const SITE = 'https://www.the-closets.com';
const DECKS = [CLOSETS_PROFILE_DECK, YAS_PROFILE_DECK];
const texts = (deck) => { const o = []; const add = (t) => { if (t) o.push(t); }; const visit = (s) => { add(s.title); add(s.lead); (s.bullets || []).forEach(add); add(s.source); (s.blocks || []).forEach((b) => { add(b.alt); add(b.caption); add(b.title); add(b.source); (b.head || []).forEach(add); (b.rows || []).forEach((r) => r.forEach(add)); (b.data || []).forEach((d) => add(d.label)); (b.items || []).forEach((d) => add(d.label)); }); (s.links || []).forEach((l) => add(l.label)); }; add(deck.title); deck.slides.forEach(visit); return o; };
const images = (deck) => deck.slides.flatMap((s) => (s.blocks || []).filter((b) => b.type === 'image'));

describe.each(DECKS.map((d) => [d.id, d]))('%s: schema', (id, deck) => {
  test('passes the same sanitiser as imports (committed paths allowed), 10 to 20 slides, disclaimer slide appended last, no errors', () => {
    const plain = { ...deck, slides: deck.slides.map(({ builtin, data, ...s }) => s) }, r = sanitizeDeck(plain, { prefix: '', trusted: true });
    expect(r.errors).toEqual([]); expect(r.ok).toBe(true); expect(deck.slides.length).toBeGreaterThanOrEqual(10); expect(deck.slides.length).toBeLessThanOrEqual(LIMITS.maxSlides); expect(r.deck.slides).toHaveLength(deck.slides.length + 1);
    const perm = PERMANENT_DECKS.find((d) => d.id === id); expect(deckHasDisclaimer(perm)).toBe(true); expect(perm.slides[perm.slides.length - 1].bullets[0]).toEqual(DISCLAIMER);
  });
  test('an IMPORT of the same JSON is refused for the site image paths (only committed decks may use them): https only', () => {
    expect(sanitizeDeck({ ...deck, slides: deck.slides.slice(0, 2) }).ok).toBe(false);
  });
  test('EN + AR parity: every text has both languages; Arabic text contains Arabic script, apart from proper nouns / codes written in Latin', () => {
    for (const t of texts(deck)) { expect(typeof t.en).toBe('string'); expect(typeof t.ar).toBe('string'); expect(t.en.trim().length).toBeGreaterThan(0); expect(t.ar.trim().length).toBeGreaterThan(0);
      if (!/[؀-ۿ]/.test(t.ar)) expect(t.ar === t.en && (/^[\d\s.,-]+$/.test(t.en) || /^[A-Z][A-Za-z0-9 .'-]{1,34}$/.test(t.en))).toBe(true); }
  });
  test('every slide cites its source page(s) in both languages; the cover also says the Arabic awaits native review', () => {
    for (const s of deck.slides) { expect(s.source).toBeTruthy(); expect(s.source.en).toMatch(/\bpp?\. \d/); expect(s.source.ar).toMatch(/ص \d/); }
    expect(deck.slides[0].source.en).toMatch(/native review/); expect(deck.slides[0].source.ar).toMatch(/مراجعة/);
  });
  test('unique slide ids, an accent from the whitelist, layouts from the whitelist, text caps respected (sanitiser would otherwise have truncated: no warnings)', () => {
    const ids = deck.slides.map((s) => s.id); expect(new Set(ids).size).toBe(ids.length);
    const r = sanitizeDeck({ ...deck, slides: deck.slides.map(({ builtin, data, ...s }) => s) }, { prefix: '', trusted: true }); expect(r.warnings.filter((w) => !/financial wording/.test(w))).toEqual([]);
  });
  test('honesty: no financial wording / figures / promises in either language (the same guard as the investor deck), no personal contact data, no invented placeholders', () => {
    const all = texts(deck).map((t) => t.en + ' | ' + t.ar).join(' || ');
    expect(FORBIDDEN_FINANCIAL.test(all)).toBe(false); expect(/@|\+\d{2,3}[\s\d-]{6,}|\b\d{3}[\s-]?\d{4,}[\s-]?\d{3,}\b/.test(all)).toBe(false); expect(/guarantee|promise|return on|profit/i.test(all)).toBe(false);
  });
  test('no invest / join / investor / briefing wording in either deck (removed at the owner\'s request; not to be re-added)', () => {
    const all = texts(deck).map((t) => t.en + ' | ' + t.ar).join(' || '); expect(/invest|join|briefing|stake|funding|مستثمر|استثمار|تنضم|إحاطة|التمويل المطلوب/i.test(all)).toBe(false);
  });
  test('{{fact:...}} tokens resolve from facts.js (warranty is confirmed, anything contested stays the placeholder)', () => {
    const r = resolveDeck(deck, 'en'); const txt = JSON.stringify(r); expect(txt).not.toMatch(/\{\{/); if (id === 'closets-profile') { expect(txt).toContain(`${FACTS.warrantyYears} years of warranty`); expect(resolveDeck(deck, 'ar').slides.some((s) => s.bullets.some((b) => b.includes(`كفالة ${FACTS.warrantyYears} سنوات`)))).toBe(true); }
    expect(txt).not.toContain(PLACEHOLDER.en);
  });
});

describe('images: committed, small, referenced, with alt text in both languages', () => {
  const used = DECKS.flatMap(images);
  test('every image block uses a committed /yas-bloom/profile path that exists, is <= 150 KB, and has EN + AR alt text', () => {
    expect(used.length).toBeGreaterThanOrEqual(15);
    for (const b of used) { expect(SITE_IMAGE.test(b.url)).toBe(true); const f = path.join(PUB, path.basename(b.url)); expect(fs.existsSync(f)).toBe(true); expect(fs.statSync(f).size).toBeLessThanOrEqual(150 * 1024); expect(b.alt.en.length).toBeGreaterThan(8); expect(/[؀-ۿ]/.test(b.alt.ar)).toBe(true); }
  });
  test('the whole feature is <= 2 MB and no file in the folder is unreferenced', () => {
    const files = fs.readdirSync(PUB).filter((f) => /\.webp$/.test(f)); const total = files.reduce((n, f) => n + fs.statSync(path.join(PUB, f)).size, 0);
    expect(total).toBeLessThanOrEqual(2 * 1024 * 1024); const refd = new Set(used.map((b) => path.basename(b.url))); expect(files.filter((f) => !refd.has(f))).toEqual([]);
  });
  test('images are real WebP files (RIFF/WEBP header)', () => { for (const f of fs.readdirSync(PUB)) { const h = fs.readFileSync(path.join(PUB, f)).subarray(0, 12).toString('latin1'); expect(h.startsWith('RIFF') && h.endsWith('WEBP') || h.slice(8, 12) === 'WEBP').toBe(true); } });
});

describe('the figures taken from the PDFs (listed in VIP-ROOM-OWNER-INPUTS.md)', () => {
  const stats = (deck) => deck.slides.flatMap((s) => (s.blocks || []).filter((b) => b.type === 'stat').flatMap((b) => b.items.map((i) => i.value)));
  test('stat blocks carry only figures the profile states: 200 staff, 3 countries, 70,000 kitchen units a year, 5000 sqm; YAS has none', () => {
    expect(stats(CLOSETS_PROFILE_DECK)).toEqual([200, 3, 70000, 5000]); expect(stats(YAS_PROFILE_DECK)).toEqual([]);
  });
  test('the dated milestones are exactly those on the history page (2007-2014, 2016-2019; no 2015)', () => {
    const years = CLOSETS_PROFILE_DECK.slides.filter((s) => /^history/.test(s.id)).flatMap((s) => s.bullets.map((b) => b.en.slice(0, 4))); expect(years).toEqual(['2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2016', '2017', '2018', '2019']);
  });
  test('deliberate omissions stay omitted: no "100%" recycled-wood claim, no third-party development value, no phone / fax numbers', () => {
    const all = JSON.stringify(DECKS); expect(all).not.toMatch(/100\s?%|recycled wood and eco-friendly materials, 100|billion|\$\s?\d|\bTel:|\bFax:/i);
  });
});

describe('Hub export files (docs/showroom3d/decks/*.json)', () => {
  const toExport = (deck) => ({ id: deck.id, title: deck.title, slides: deck.slides.map(({ builtin, data, disclaimer, ...s }) => ({ ...s, blocks: (s.blocks || []).map((b) => (b.type === 'image' ? { ...b, url: SITE + b.url } : b)) })) });
  test.each(DECKS.map((d) => [d.id, d]))('%s.json exists, equals the committed deck (images as absolute https), and validates under the standard (import) sanitiser', (id, deck) => {
    const f = path.join(DOCS, id + '.json'); if (process.env.WRITE_DECK_JSON === '1') fs.writeFileSync(f, JSON.stringify(toExport(deck), null, 2) + '\n');
    expect(fs.existsSync(f)).toBe(true); const j = JSON.parse(fs.readFileSync(f, 'utf8')); expect(j).toEqual(JSON.parse(JSON.stringify(toExport(deck))));
    const r = sanitizeDeck(j, { prefix: '' }); expect(r.errors).toEqual([]); expect(r.ok).toBe(true); expect(deckHasDisclaimer(r.deck)).toBe(true); expect(r.deck.slides).toHaveLength(deck.slides.length + 1);
    for (const b of images(j)) expect(b.url.startsWith(SITE + '/yas-bloom/profile/')).toBe(true);
  });
});
