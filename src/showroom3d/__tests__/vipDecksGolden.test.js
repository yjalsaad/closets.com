/* GOLDEN: the default deck reproduces the pre-deck VIP content exactly. The fixture was dumped from the old products/vipContent.js BEFORE the refactor. */
import * as C from '../products/vipContent';
import golden from './fixtures/vip-golden.json';
import { PERMANENT_DECKS } from '../vip/decks';
import { DEFAULT_DECK } from '../vip/decks/default';
import { resolveDeck, sanitizeDeck, deckHasDisclaimer, withDisclaimer, DISCLAIMER } from '../vip/deckSchema';

const same = (a) => JSON.parse(JSON.stringify(a));
describe('golden: default deck == old vipContent output', () => {
  test('stations (id, title, lead), story lines, investor steps are byte-identical to the old module', () => {
    expect(same(C.STATIONS)).toEqual(golden.STATIONS); expect(C.stationIds()).toEqual(golden.stationIds);
    expect(same(C.storyLines())).toEqual(golden.storyLines); expect(same(C.INVEST_STEPS)).toEqual(golden.INVEST_STEPS);
  });
  test('placeholders / contested facts, disclaimer, business lines, Hub data, booking URL, contact lines, owner inputs unchanged', () => {
    expect(same(C.contestedFacts())).toEqual(golden.contestedFacts); expect(C.DISCLAIMER).toEqual(golden.DISCLAIMER); expect(C.PLACEHOLDER).toEqual(golden.PLACEHOLDER);
    expect(same({ en: C.businessLines('en'), ar: C.businessLines('ar') })).toEqual(golden.businessLines);
    for (const k of ['HUB_FLOW', 'HUB_CAPABILITIES', 'HUB_DEPARTMENTS', 'HUB_KPI_NAMES', 'ILLUSTRATIVE', 'OWNER_INPUTS']) expect(same(C[k])).toEqual(golden[k]);
    expect({ en: C.briefingUrl('en'), ar: C.briefingUrl('ar') }).toEqual(golden.briefingUrl); expect(same({ en: C.contactLines('en'), ar: C.contactLines('ar') })).toEqual(golden.contactLines);
  });
  test('the resolved default deck (EN and AR) carries exactly the old titles, leads and story text', () => {
    for (const lang of ['en', 'ar']) {
      const d = resolveDeck(DEFAULT_DECK, lang);
      expect(d.slides.map((s) => s.title)).toEqual(golden.STATIONS.map((s) => s.title[lang])); expect(d.slides.map((s) => s.lead)).toEqual(golden.STATIONS.map((s) => s.lead[lang]));
      expect(d.slides[0].bullets).toEqual(golden.storyLines.map((l) => l[lang]));
    }
  });
  test('the default deck is the first permanent deck, in the owner\'s station order, five slides, "station" wording', () => {
    expect(PERMANENT_DECKS[0]).toBe(DEFAULT_DECK); expect(PERMANENT_DECKS.map((d) => d.id)).toEqual(['default', 'closets-profile', 'yas-profile']); expect(DEFAULT_DECK.slides.map((s) => s.builtin)).toEqual(['story', 'projects', 'hub', 'invest', 'briefing']); expect(DEFAULT_DECK.unit).toBe('station'); expect(DEFAULT_DECK.slides).toHaveLength(5);
  });
  test('the default deck still ends on a slide that shows the disclaimer, and withDisclaimer does not append a second one', () => {
    expect(deckHasDisclaimer(DEFAULT_DECK)).toBe(true); expect(withDisclaimer(DEFAULT_DECK).slides).toHaveLength(5);
  });
  test('every permanent deck passes the same sanitiser as imported ones (apart from the trusted builtin / data keys) and ends with the disclaimer', () => {
    for (const d of PERMANENT_DECKS) {
      const plain = { ...d, slides: d.slides.map(({ builtin, data, ...s }) => s) }; const r = sanitizeDeck(plain, { prefix: '', trusted: true });
      expect(r.errors).toEqual([]); expect(r.ok).toBe(true); expect(deckHasDisclaimer(d)).toBe(true);
    }
    expect(DISCLAIMER.en).toBe(golden.DISCLAIMER.en);
  });
});
