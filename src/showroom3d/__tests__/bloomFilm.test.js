/* Bloom Meeting: the new film ("journey-v2") is registered as its OWN film id next to the existing ones, carries the accurate MIXED label, is in the agenda, and the files exist. Also the investor decks. */
import fs from 'fs';
import path from 'path';
import { parseFilmManifest, parseFilmsManifest, pickSource, filmLabel, filmBadge, FILM_AI_LABEL, FILM_MIXED_LABEL, FILM_MIXED_BADGE, FILM_V2_DECK, FILM_DECK, JOURNEY_V2_ID, FILM_V2_DECK_ID } from '../vip/film';
import { AGENDA, BLOOM_AGENDA_ID, KIND_LABEL, agendaIndex, nextAgendaItem } from '../vip/meeting';
import { PERMANENT_DECKS } from '../vip/decks';
import { INVESTOR_DECK, FACTORY_TOUR_DECK } from '../vip/decks/investor';
import { deckWarnings, FORBIDDEN_FINANCIAL, DISCLAIMER_SLIDE_ID } from '../vip/deckSchema';
import { COLLECTIONS } from '../collections/data';

const FILM_DIR = path.join(__dirname, '../../../public/yas-bloom/film'), read = (f) => JSON.parse(fs.readFileSync(path.join(FILM_DIR, f), 'utf8'));
const LIST = read('films.json'), V2 = read('film3.json');

describe('film v2 registration', () => {
  test('films.json: the new film is its own entry (manifest film3.json, not real, after the AI documentary); the existing entries are untouched', () => {
    const r = parseFilmsManifest(LIST); expect(r.ok).toBe(true); expect(r.films.map((f) => f.id)).toEqual(['yas-story', 'closets-story', 'bonsai-hub', 'journey', JOURNEY_V2_ID]);
    expect(LIST.films.find((f) => f.id === 'journey')).toEqual({ id: 'journey', manifest: '/yas-bloom/film/film.json', real: false, order: 99 });
    expect(LIST.films.find((f) => f.id === JOURNEY_V2_ID)).toEqual({ id: JOURNEY_V2_ID, manifest: '/yas-bloom/film/film3.json', real: false, order: 100 });
  });
  test('film3.json parses: 1080p + 720p, poster, Arabic + English captions, mixed (two real leader photographs, camera motion only, in an AI-generated office), 219 s', () => {
    const r = parseFilmManifest(V2); expect(r.ok).toBe(true); const f = r.film;
    expect(f.mixed).toBe(true); expect(f.real).toBe(false); expect(f.durationSec).toBeGreaterThan(200); expect(V2.captions.find((c) => c.lang === 'en').default).toBe(true); expect(f.sources.map((s) => s.height)).toEqual([1080, 720]); expect(f.poster).toBe('/yas-bloom/film/journey3-poster.jpg'); expect(f.captions.map((c) => c.lang).sort()).toEqual(['ar', 'en']);
    expect(FILM_MIXED_LABEL.en).not.toMatch(/animated with AI|AI-animated/i); expect(FILM_MIXED_LABEL.en).toMatch(/camera motion only/); expect(V2.label.en.replace(/\.$/, '')).toBe(FILM_MIXED_LABEL.en); expect(V2.label.ar.replace(/\.$/, '')).toBe(FILM_MIXED_LABEL.ar);
  });
  test('the files exist and their sizes are the ones the manifest declares (final swap = overwrite the same names and update bytes)', () => {
    for (const s of V2.sources) { const f = path.join(FILM_DIR, path.basename(s.src)); expect(fs.existsSync(f)).toBe(true); expect(fs.statSync(f).size).toBe(s.bytes); }
    for (const u of [V2.poster, ...V2.captions.map((c) => c.src)]) expect(fs.existsSync(path.join(FILM_DIR, path.basename(u)))).toBe(true);
  });
  test('the device picks 1080p on desktop / tablet-class tiers and the lightest file (720p) on phones, data saver and the low tier', () => {
    const s = parseFilmManifest(V2).film.sources; expect(pickSource(s, { tier: 'high' }).height).toBe(1080); expect(pickSource(s, { tier: 'medium' }).height).toBe(1080); expect(pickSource(s, { tier: 'low' }).height).toBe(720); expect(pickSource(s, { mobile: true }).height).toBe(720); expect(pickSource(s, { saveData: true }).height).toBe(720);
  });
  test('labels: the mixed film says the accurate mixed label (never the all-AI one); the old AI film and real films are unchanged', () => {
    expect(filmLabel({ mixed: true, real: false })).toBe(FILM_MIXED_LABEL); expect(filmBadge({ mixed: true, real: false })).toBe(FILM_MIXED_BADGE); expect(filmLabel({ real: false })).toBe(FILM_AI_LABEL); expect(filmLabel({ real: true })).toBeNull(); expect(filmLabel({ mixed: true, real: true })).toBeNull();
    expect(FILM_MIXED_LABEL.en).not.toMatch(/^AI-generated illustration$/); expect(FILM_MIXED_LABEL.en).toMatch(/real photographs/); expect(FILM_MIXED_LABEL.ar).toMatch(/صور حقيقية/);
  });
  test('no separate image of the leaders is shipped: the film folder holds only the film files', () => {
    const names = fs.readdirSync(FILM_DIR); expect(names.filter((n) => /leader|ceo|portrait|person/i.test(n))).toEqual([]); expect(names.filter((n) => /^journey[23]/.test(n)).sort()).toEqual(['journey2-1080.mp4', 'journey2-720.mp4', 'journey2-poster.jpg', 'journey2.ar.vtt', 'journey2.en.vtt', 'journey3-1080.mp4', 'journey3-720.mp4', 'journey3-poster.jpg', 'journey3.ar.vtt', 'journey3.en.vtt']);   // v2 stays as the fallback
  });
});

describe('captions: on by default, in the page language, with a CC toggle and an EN / AR switch', () => {
  const { FilmPlayer } = require('../vip/filmPlayer');
  const manifests = { '/yas-bloom/film/films.json': JSON.stringify(LIST), '/yas-bloom/film/film.json': JSON.stringify(read('film.json')), '/yas-bloom/film/film3.json': JSON.stringify(V2) };
  const mk = (lang) => new FilmPlayer({ lang, device: { tier: 'high' }, fetcher: (u) => Promise.resolve(manifests[u] ? { ok: true, text: () => Promise.resolve(manifests[u]) } : { ok: false }) });
  test('English UI: English captions are ON when the film is put on the wall; Arabic UI: Arabic', async () => {
    const en = mk('en'); en.select(JOURNEY_V2_ID); await en.load(); expect(en.state).toMatchObject({ status: 'ready', id: JOURNEY_V2_ID, caption: 'en' });
    const ar = mk('ar'); ar.select(JOURNEY_V2_ID); await ar.load(); expect(ar.state.caption).toBe('ar');
  });
  test('the page language switch moves the captions with it until the visitor chooses; CC toggles off and back; EN / AR are explicit', async () => {
    const p = mk('en'); p.select(JOURNEY_V2_ID); await p.load(); p.setLang('ar'); expect(p.state.caption).toBe('ar'); p.setLang('en'); expect(p.state.caption).toBe('en');
    expect(p.toggleCaptions()).toBe(true); expect(p.state.caption).toBe('off'); expect(p.toggleCaptions()).toBe(true); expect(p.state.caption).toBe('en');
    expect(p.setCaption('ar')).toBe(true); p.setLang('en'); expect(p.state.caption).toBe('ar');   // an explicit choice sticks
    expect(p.setCaption('fr')).toBe(false); expect(p.state.caption).toBe('ar');
  });
  test('the caption files are real WebVTT with cues in the middle of the film, in both languages', () => {
    for (const l of ['en', 'ar']) { const v = fs.readFileSync(path.join(FILM_DIR, `journey3.${l}.vtt`), 'utf8'); expect(v.startsWith('WEBVTT')).toBe(true); expect((v.match(/-->/g) || []).length).toBeGreaterThan(30); expect(v).toMatch(/00:0[12]:\d\d\.\d{3} -->/); }
    expect(fs.readFileSync(path.join(FILM_DIR, 'journey3.en.vtt'), 'utf8')).not.toMatch(/[؀-ۿ]/);
  });
});

describe('film swap readiness (journey-v2 -> film3)', () => {
  test('ONE films.json entry owns the new cut and the agenda / deck / wall only know its id; the label strings in the manifest equal the two constants in vip/film.js', () => {
    expect(LIST.films.filter((f) => f.id === JOURNEY_V2_ID)).toHaveLength(1); expect(Object.keys(LIST.films.find((f) => f.id === JOURNEY_V2_ID)).sort()).toEqual(['id', 'manifest', 'order', 'real']);
    expect(FILM_MIXED_LABEL.en).not.toMatch(/animated with AI|AI-animated/i); expect(FILM_MIXED_LABEL.en).toMatch(/camera motion only/); expect(V2.label.en.replace(/\.$/, '')).toBe(FILM_MIXED_LABEL.en); expect(FILM_MIXED_BADGE.en.length).toBeLessThan(70);
    expect(FILM_V2_DECK.slides[0].filmId).toBe(JOURNEY_V2_ID);
  });
});

describe('agenda and decks', () => {
  test('the agenda ends: ... journey (AI) -> journey-v2 (mixed label) -> Bloom Meeting (a destination on Floor 2); the film deck is a one-slide pseudo-deck before the first AI film', () => {
    const v2 = AGENDA.find((a) => a.id === JOURNEY_V2_ID), b = AGENDA.find((a) => a.id === BLOOM_AGENDA_ID);
    expect(v2).toMatchObject({ kind: 'film', deck: FILM_V2_DECK_ID, real: false, mixed: true, label: FILM_MIXED_LABEL }); expect(b).toMatchObject({ kind: 'place', floor: 'l2', scene: 'bloom-meeting' }); expect(b.title.en).toMatch(/Bloom Meeting/); expect(/[؀-ۿ]/.test(b.title.ar)).toBe(true); expect(KIND_LABEL.place.en).toBe('Floor 2');
    expect(nextAgendaItem(agendaIndex(FILM_DECK.id, 0)).id).toBe(JOURNEY_V2_ID); expect(nextAgendaItem(agendaIndex(FILM_V2_DECK_ID, 0)).id).toBe(BLOOM_AGENDA_ID); expect(nextAgendaItem(agendaIndex('bloom-meeting', 0))).toBeNull();
    const ids = PERMANENT_DECKS.map((d) => d.id); expect(ids.indexOf('film-v2')).toBe(ids.length - 2); expect(ids[ids.length - 1]).toBe('film'); expect(FILM_V2_DECK.slides).toHaveLength(1); expect(FILM_V2_DECK.slides[0]).toMatchObject({ builtin: 'film', filmId: JOURNEY_V2_ID });
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
