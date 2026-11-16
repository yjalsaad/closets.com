/* Bloom Meeting: the new film ("journey-v2") is registered as its OWN film id next to the existing ones, carries the accurate MIXED label, is in the agenda, and the files exist. Also the investor decks. */
import fs from 'fs';
import path from 'path';
import { parseFilmManifest, parseFilmsManifest, pickSource, filmLabel, filmBadge, FILM_AI_LABEL, FILM_MIXED_LABEL, FILM_MIXED_BADGE, FILM_V2_DECK, FILM_DECK, JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID, JOURNEY_ACTIVE, FILM_V2_DECK_ID, FILM_V2_LABEL, FILM_V2_BADGE, FILM_V3A_LABEL, FILM_V3A_BADGE, mixedLabel, mixedBadge } from '../vip/film';
import { AGENDA, BLOOM_AGENDA_ID, KIND_LABEL, agendaIndex, nextAgendaItem } from '../vip/meeting';
import { PERMANENT_DECKS } from '../vip/decks';
import { INVESTOR_DECK, FACTORY_TOUR_DECK } from '../vip/decks/investor';
import { deckWarnings, FORBIDDEN_FINANCIAL, DISCLAIMER_SLIDE_ID } from '../vip/deckSchema';
import { COLLECTIONS } from '../collections/data';

const FILM_DIR = path.join(__dirname, '../../../public/yas-bloom/film'), read = (f) => JSON.parse(fs.readFileSync(path.join(FILM_DIR, f), 'utf8'));
const LIST = read('films.json'), V2 = read('film2.json'), V3 = read('film3.json'), V4 = read('film4.json');

describe('film v2 registration', () => {
  test('films.json: the new film is its own entry (manifest film3.json, not real, after the AI documentary); the existing entries are untouched', () => {
    const r = parseFilmsManifest(LIST); expect(r.ok).toBe(true); expect(r.films.map((f) => f.id)).toEqual(['yas-story', 'closets-story', 'bonsai-hub', 'journey', JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID]);   // the AI-animated version (film4.json) is registered too
    expect(LIST.films.find((f) => f.id === 'journey')).toEqual({ id: 'journey', manifest: '/yas-bloom/film/film.json', real: false, order: 99 });
    expect(LIST.films.find((f) => f.id === JOURNEY_V2_ID)).toEqual({ id: JOURNEY_V2_ID, manifest: '/yas-bloom/film/film2.json', real: false, order: 100 });
    expect(LIST.films.find((f) => f.id === JOURNEY_V3_ID)).toEqual({ id: JOURNEY_V3_ID, manifest: '/yas-bloom/film/film3.json', real: false, order: 101 });
    expect(LIST.films.find((f) => f.id === JOURNEY_V3A_ID)).toEqual({ id: JOURNEY_V3A_ID, manifest: '/yas-bloom/film/film4.json', real: false, order: 102 });
  });
  test('film2.json (journey-v2) still parses, is mixed, and its own label is the v2 wording (not the v3 one); its files exist', () => {
    const r = parseFilmManifest(V2); expect(r.ok).toBe(true); expect(r.film.mixed).toBe(true); expect(V2.label.en.replace(/\.$/, '')).toBe(FILM_V2_LABEL.en); expect(V2.label.ar.replace(/\.$/, '')).toBe(FILM_V2_LABEL.ar);
    expect(mixedLabel(JOURNEY_V2_ID)).toBe(FILM_V2_LABEL); expect(mixedBadge(JOURNEY_V2_ID)).toBe(FILM_V2_BADGE); expect(mixedLabel(JOURNEY_V3_ID)).toBe(FILM_MIXED_LABEL); expect(mixedBadge(JOURNEY_V3_ID)).toBe(FILM_MIXED_BADGE); expect(mixedLabel(JOURNEY_V3A_ID).en).toMatch(/animated with AI/);
    expect(filmLabel({ mixed: true, id: JOURNEY_V2_ID })).toBe(FILM_V2_LABEL); expect(filmLabel({ mixed: true, id: JOURNEY_V3_ID })).toBe(FILM_MIXED_LABEL); expect(FILM_V2_LABEL.en).not.toMatch(/animated|camera motion/);
    for (const s of V2.sources) expect(fs.statSync(path.join(FILM_DIR, path.basename(s.src))).size).toBe(s.bytes);
  });
  test('film3.json parses: 1080p + 720p, poster, Arabic + English captions, mixed (two real leader photographs, camera motion only, in an AI-generated office), 219 s', () => {
    const r = parseFilmManifest(V3); expect(r.ok).toBe(true); const f = r.film;
    expect(f.mixed).toBe(true); expect(f.real).toBe(false); expect(f.durationSec).toBeGreaterThan(200); expect(V3.captions.find((c) => c.lang === 'en').default).toBe(true); expect(f.sources.map((s) => s.height)).toEqual([1080, 720]); expect(f.poster).toBe('/yas-bloom/film/journey3-poster.jpg'); expect(f.captions.map((c) => c.lang).sort()).toEqual(['ar', 'en']);
    expect(FILM_MIXED_LABEL.en).not.toMatch(/animated with AI|AI-animated/i); expect(FILM_MIXED_LABEL.en).toMatch(/camera motion only/); expect(V3.label.en.replace(/\.$/, '')).toBe(FILM_MIXED_LABEL.en); expect(V3.label.ar.replace(/\.$/, '')).toBe(FILM_MIXED_LABEL.ar);
  });
  test('the files exist and their sizes are the ones the manifest declares (final swap = overwrite the same names and update bytes)', () => {
    for (const s of V3.sources) { const f = path.join(FILM_DIR, path.basename(s.src)); expect(fs.existsSync(f)).toBe(true); expect(fs.statSync(f).size).toBe(s.bytes); }
    for (const u of [V3.poster, ...V3.captions.map((c) => c.src)]) expect(fs.existsSync(path.join(FILM_DIR, path.basename(u)))).toBe(true);
  });
  test('the device picks 1080p on desktop / tablet-class tiers and the lightest file (720p) on phones, data saver and the low tier', () => {
    const s = parseFilmManifest(V3).film.sources; expect(pickSource(s, { tier: 'high' }).height).toBe(1080); expect(pickSource(s, { tier: 'medium' }).height).toBe(1080); expect(pickSource(s, { tier: 'low' }).height).toBe(720); expect(pickSource(s, { mobile: true }).height).toBe(720); expect(pickSource(s, { saveData: true }).height).toBe(720);
  });
  test('labels: the mixed film says the accurate mixed label (never the all-AI one); the old AI film and real films are unchanged', () => {
    expect(filmLabel({ mixed: true, real: false })).toBe(FILM_MIXED_LABEL); expect(filmBadge({ mixed: true, real: false })).toBe(FILM_MIXED_BADGE); expect(filmLabel({ real: false })).toBe(FILM_AI_LABEL); expect(filmLabel({ real: true })).toBeNull(); expect(filmLabel({ mixed: true, real: true })).toBeNull();
    expect(FILM_MIXED_LABEL.en).not.toMatch(/^AI-generated illustration$/); expect(FILM_MIXED_LABEL.en).toMatch(/real photographs/); expect(FILM_MIXED_LABEL.ar).toMatch(/صور حقيقية/);
  });
  test('no separate image of the leaders is shipped: the film folder holds only the film files', () => {
    const names = fs.readdirSync(FILM_DIR); expect(names.filter((n) => /leader|ceo|portrait|person/i.test(n))).toEqual([]); expect(names.filter((n) => /^journey[234]/.test(n)).sort()).toEqual(['journey2-1080.mp4', 'journey2-720.mp4', 'journey2-poster.jpg', 'journey2.ar.vtt', 'journey2.en.vtt', 'journey3-1080.mp4', 'journey3-720.mp4', 'journey3-poster.jpg', 'journey3.ar.vtt', 'journey3.en.vtt', 'journey4-1080.mp4', 'journey4-720.mp4', 'journey4-poster.jpg', 'journey4.ar.vtt', 'journey4.en.vtt']);   // v2 stays as the fallback
  });
});

describe('captions: on by default, in the page language, with a CC toggle and an EN / AR switch', () => {
  const { FilmPlayer } = require('../vip/filmPlayer');
  const manifests = { '/yas-bloom/film/films.json': JSON.stringify(LIST), '/yas-bloom/film/film.json': JSON.stringify(read('film.json')), '/yas-bloom/film/film2.json': JSON.stringify(V2), '/yas-bloom/film/film3.json': JSON.stringify(V3) };
  const mk = (lang) => new FilmPlayer({ lang, device: { tier: 'high' }, fetcher: (u) => Promise.resolve(manifests[u] ? { ok: true, text: () => Promise.resolve(manifests[u]) } : { ok: false }) });
  test('English UI: English captions are ON when the film is put on the wall; Arabic UI: Arabic', async () => {
    const en = mk('en'); en.select(JOURNEY_ACTIVE); await en.load(); expect(en.state).toMatchObject({ status: 'ready', id: JOURNEY_V3_ID, caption: 'en' });
    const ar = mk('ar'); ar.select(JOURNEY_ACTIVE); await ar.load(); expect(ar.state.caption).toBe('ar');
  });
  test('the page language switch moves the captions with it until the visitor chooses; CC toggles off and back; EN / AR are explicit', async () => {
    const p = mk('en'); p.select(JOURNEY_ACTIVE); await p.load(); p.setLang('ar'); expect(p.state.caption).toBe('ar'); p.setLang('en'); expect(p.state.caption).toBe('en');
    expect(p.toggleCaptions()).toBe(true); expect(p.state.caption).toBe('off'); expect(p.toggleCaptions()).toBe(true); expect(p.state.caption).toBe('en');
    expect(p.setCaption('ar')).toBe(true); p.setLang('en'); expect(p.state.caption).toBe('ar');   // an explicit choice sticks
    expect(p.setCaption('fr')).toBe(false); expect(p.state.caption).toBe('ar');
  });
  test('the caption files are real WebVTT with cues in the middle of the film, in both languages', () => {
    for (const l of ['en', 'ar']) { const v = fs.readFileSync(path.join(FILM_DIR, `journey3.${l}.vtt`), 'utf8'); expect(v.startsWith('WEBVTT')).toBe(true); expect((v.match(/-->/g) || []).length).toBeGreaterThan(30); expect(v).toMatch(/00:0[12]:\d\d\.\d{3} -->/); }
    expect(fs.readFileSync(path.join(FILM_DIR, 'journey3.en.vtt'), 'utf8')).not.toMatch(/[؀-ۿ]/);
  });
});

describe('film v4 (journey-v3-animated): the leaders animated with AI', () => {
  test('film4.json parses, is mixed, 219 s, EN captions default; its files exist with the declared sizes', () => {
    const r = parseFilmManifest(V4); expect(r.ok).toBe(true); expect(r.film.mixed).toBe(true); expect(r.film.real).toBe(false); expect(r.film.durationSec).toBeGreaterThan(200); expect(V4.captions.find((c) => c.lang === 'en').default).toBe(true); expect(r.film.sources.map((s) => s.height)).toEqual([1080, 720]); expect(r.film.poster).toBe('/yas-bloom/film/journey4-poster.jpg');
    for (const s of V4.sources) expect(fs.statSync(path.join(FILM_DIR, path.basename(s.src))).size).toBe(s.bytes); for (const u of [V4.poster, ...V4.captions.map((c) => c.src)]) expect(fs.existsSync(path.join(FILM_DIR, path.basename(u)))).toBe(true);
  });
  test('its label == the manifest label EXACTLY (trailing period aside) and the badge says animated with AI; the other versions never say it', () => {
    expect(V4.label.en.replace(/\.$/, '')).toBe(FILM_V3A_LABEL.en); expect(V4.label.ar.replace(/\.$/, '')).toBe(FILM_V3A_LABEL.ar); expect(FILM_V3A_LABEL.en).toBe('Leaders appear from real photographs, animated with AI, in an AI-generated office; all other imagery is AI-generated illustration');
    expect(FILM_V3A_BADGE.en).toBe('Leaders: real photos animated with AI · office and other imagery: AI illustration'); expect(mixedLabel(JOURNEY_V3A_ID)).toBe(FILM_V3A_LABEL); expect(mixedBadge(JOURNEY_V3A_ID)).toBe(FILM_V3A_BADGE); expect(filmLabel({ mixed: true, id: JOURNEY_V3A_ID })).toBe(FILM_V3A_LABEL);
    for (const l of [FILM_V2_LABEL, FILM_MIXED_LABEL]) expect(l.en).not.toMatch(/animated with AI/i);
  });
});

describe('film choice: every version is registered, one is active', () => {
  test('the deck slide and the agenda item play the ACTIVE alias, not a fixed version; each version keeps its own manifest label', () => {
    expect(FILM_V2_DECK.slides[0].filmId).toBe(JOURNEY_ACTIVE); expect(AGENDA.find((a) => a.id === JOURNEY_ACTIVE).deck).toBe(FILM_V2_DECK_ID);
    expect(V3.label.en.replace(/\.$/, '')).toBe(FILM_MIXED_LABEL.en); expect(V3.label.ar.replace(/\.$/, '')).toBe(FILM_MIXED_LABEL.ar); expect(FILM_MIXED_LABEL.en).not.toMatch(/animated with AI|AI-animated/i);
  });
});

describe('agenda and decks', () => {
  test('the agenda ends: ... journey (AI) -> journey-v2 (mixed label) -> Bloom Meeting (a destination on Floor 2); the film deck is a one-slide pseudo-deck before the first AI film', () => {
    const v2 = AGENDA.find((a) => a.id === JOURNEY_ACTIVE), b = AGENDA.find((a) => a.id === BLOOM_AGENDA_ID);
    expect(v2).toMatchObject({ kind: 'film', deck: FILM_V2_DECK_ID, real: false, mixed: true, label: FILM_MIXED_LABEL }); expect(b).toMatchObject({ kind: 'place', floor: 'l2', scene: 'bloom-meeting' }); expect(b.title.en).toMatch(/Bloom Meeting/); expect(/[؀-ۿ]/.test(b.title.ar)).toBe(true); expect(KIND_LABEL.place.en).toBe('Floor 2');
    expect(nextAgendaItem(agendaIndex(FILM_DECK.id, 0)).id).toBe(JOURNEY_ACTIVE); expect(nextAgendaItem(agendaIndex(FILM_V2_DECK_ID, 0)).id).toBe(BLOOM_AGENDA_ID); expect(nextAgendaItem(agendaIndex('bloom-meeting', 0))).toBeNull();
    const ids = PERMANENT_DECKS.map((d) => d.id); expect(ids.indexOf('film-v2')).toBe(ids.length - 2); expect(ids[ids.length - 1]).toBe('film'); expect(FILM_V2_DECK.slides).toHaveLength(1); expect(FILM_V2_DECK.slides[0]).toMatchObject({ builtin: 'film', filmId: JOURNEY_ACTIVE });
  });
  test.each([['investor', INVESTOR_DECK], ['factory-tour', FACTORY_TOUR_DECK]])('the %s deck: both languages, a source on every slide, no financial wording, no unconfirmed figure, placeholders where management has not confirmed', (id, deck) => {
    const perm = PERMANENT_DECKS.find((d) => d.id === id); expect(perm).toBeTruthy(); expect(perm.slides[perm.slides.length - 1].id).toBe(DISCLAIMER_SLIDE_ID);
    const texts = JSON.stringify(deck); expect(FORBIDDEN_FINANCIAL.test(texts)).toBe(false); expect(texts).not.toMatch(/70,?000|50,?000|\b27\b|patents? of/);
    for (const s of deck.slides) { expect(s.title.en.length).toBeGreaterThan(3); expect(/[؀-ۿ]/.test(s.title.ar)).toBe(true); expect(s.source && s.source.en).toBeTruthy(); }
    expect(deckWarnings(perm)).toEqual([]);
  });
  test('the investor deck says "To be confirmed by management" for factories count, capacity, other markets, patents and the team; the collection count is the real one', () => {
    const t = JSON.stringify(INVESTOR_DECK); expect((t.match(/To be confirmed by management/g) || []).length).toBeGreaterThanOrEqual(4); expect(t).toContain(`${COLLECTIONS[0].images.length} finishes`);
  });
});
