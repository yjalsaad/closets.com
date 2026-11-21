/* The Journey film CHOICE: three versions registered, exactly one active. The owner's switch is the website_content row bloom.film.active (v2 | v3 | v3-animated), default v3, fallback v3 then v2, ?film= for tests. */
import fs from 'fs';
import path from 'path';
import { FILM_CHOICE_KEY, FILM_CHOICE_QUERY, parseFilmChoice, loadFilmChoice } from '../vip/filmChoice';
import { chooseJourney, JOURNEY_ID, JOURNEY_ACTIVE, JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID, FILM_CHOICE_DEFAULT, setActiveJourney, activeJourney, mixedLabel, FILM_V2_LABEL, FILM_MIXED_LABEL, FILM_V3A_LABEL } from '../vip/film';
import { FilmPlayer } from '../vip/filmPlayer';
import { AGENDA } from '../vip/meeting';

const FILM_DIR = path.join(__dirname, '../../../public/yas-bloom/film'), read = (f) => fs.readFileSync(path.join(FILM_DIR, f), 'utf8');
const MANIFESTS = { '/yas-bloom/film/films.json': read('films.json'), '/yas-bloom/film/film.json': read('film.json'), '/yas-bloom/film/film2.json': read('film2.json'), '/yas-bloom/film/film3.json': read('film3.json'), '/yas-bloom/film/film4.json': read('film4.json') };
const mk = (o = {}) => new FilmPlayer({ lang: 'en', device: { tier: 'high' }, search: '', fetcher: (u) => Promise.resolve(MANIFESTS[u] ? { ok: true, text: () => Promise.resolve(MANIFESTS[u]) } : { ok: false, status: 404 }), ...o });

afterEach(() => setActiveJourney(JOURNEY_V3_ID));

describe('the row', () => {
  test('the key and the read-only query (one website_content row, active and not deleted)', () => { expect(FILM_CHOICE_KEY).toBe('bloom.film.active'); expect(FILM_CHOICE_QUERY).toBe('website_content?active=is.true&deleted_at=is.null&key=eq.bloom.film.active'); });
  test('parseFilmChoice accepts v2 | v3 | v3-animated (case, spaces, quotes, underscore forgiven) and everything else is null (the default applies)', () => {
    for (const [v, want] of [['v2', 'v2'], ['v3', 'v3'], ['v3-animated', 'v3-animated'], [' V3 ', 'v3'], ['"v2"', 'v2'], ['V3_Animated', 'v3-animated']]) expect(parseFilmChoice([{ key: FILM_CHOICE_KEY, value: v }])).toBe(want);
    for (const bad of ['v4', '', 'journey-v2', 'null', null, undefined, 3, {}]) expect(parseFilmChoice([{ key: FILM_CHOICE_KEY, value: bad }])).toBeNull();
    expect(parseFilmChoice([])).toBeNull(); expect(parseFilmChoice(null)).toBeNull(); expect(parseFilmChoice([{ key: 'vip.meeting.date', value: 'v2' }])).toBeNull();
  });
  test('loadFilmChoice reads once through the injected api; any failure is null (never throws)', async () => {
    const api = jest.fn().mockResolvedValue([{ key: FILM_CHOICE_KEY, value: 'v2' }]); expect(await loadFilmChoice({ api })).toBe('v2'); expect(api).toHaveBeenCalledWith(FILM_CHOICE_QUERY);
    expect(await loadFilmChoice({ api: () => Promise.reject(new Error('offline')) })).toBeNull(); expect(await loadFilmChoice({ api: () => Promise.resolve('garbage') })).toBeNull();
  });
});

describe('chooseJourney: the choice, the fallbacks, the override', () => {
  const ALL = [JOURNEY_V2_ID, JOURNEY_V3_ID], WITH_A = [...ALL, JOURNEY_V3A_ID];
  test('default (no row) is v3; the row picks v2; v3-animated when its files exist (and falls back to v3 when not)', () => {
    expect(FILM_CHOICE_DEFAULT).toBe('v3'); expect(chooseJourney({ available: ALL })).toBe(JOURNEY_V3_ID); expect(chooseJourney({ want: 'v2', available: ALL })).toBe(JOURNEY_V2_ID); expect(chooseJourney({ want: 'v3', available: ALL })).toBe(JOURNEY_V3_ID);
    expect(chooseJourney({ want: 'v3-animated', available: WITH_A })).toBe(JOURNEY_V3A_ID); expect(chooseJourney({ want: 'v3-animated', available: ALL })).toBe(JOURNEY_V3_ID);
  });
  test('an invalid row falls back to v3; a missing v3 falls back to v2; nothing available is "" (the player then says Film coming soon); the wall is never empty while any version exists', () => {
    expect(chooseJourney({ want: 'nonsense', available: ALL })).toBe(JOURNEY_V3_ID); expect(chooseJourney({ want: 'v3', available: [JOURNEY_V2_ID] })).toBe(JOURNEY_V2_ID); expect(chooseJourney({ want: 'v3-animated', available: [JOURNEY_V2_ID] })).toBe(JOURNEY_V2_ID); expect(chooseJourney({ want: 'v2', available: [JOURNEY_V3_ID] })).toBe(JOURNEY_V3_ID); expect(chooseJourney({ available: [] })).toBe('');
  });
  test('the ?film= override beats the row (testing only)', () => { expect(chooseJourney({ want: 'v3', override: 'v2', available: ALL })).toBe(JOURNEY_V2_ID); expect(chooseJourney({ want: 'v2', override: 'v3', available: ALL })).toBe(JOURNEY_V3_ID); expect(chooseJourney({ want: 'v2', override: 'zzz', available: ALL })).toBe(JOURNEY_V2_ID); });
});

describe('the player: alias, choice, label, preload', () => {
  test('no row: the alias plays v3 (film3.json), the default; only the manifests are requested, never a video', async () => {
    const asked = []; const p = mk({ fetcher: (u) => { asked.push(u); return Promise.resolve(MANIFESTS[u] ? { ok: true, text: () => Promise.resolve(MANIFESTS[u]) } : { ok: false }); } }); p.select(JOURNEY_ACTIVE); await p.load();
    expect(p.state).toMatchObject({ status: 'ready', id: JOURNEY_V3_ID }); expect(p.state.src).toBe('/yas-bloom/film/journey3-1080.mp4'); expect(asked.some((u) => /\.mp4/.test(u))).toBe(false); expect(activeJourney()).toBe(JOURNEY_V3_ID);
  });
  test('row v2: the alias plays film2 (journey2-*), and the agenda label becomes the v2 wording; row v3 gives the v3 wording', async () => {
    const p = mk({ choiceLoader: () => Promise.resolve('v2') }); p.select(JOURNEY_ACTIVE); await p.load(); expect(p.state).toMatchObject({ id: JOURNEY_V2_ID, status: 'ready' }); expect(p.state.src).toBe('/yas-bloom/film/journey2-1080.mp4');
    const a = AGENDA.find((x) => x.id === JOURNEY_ACTIVE); expect(a.label).toBe(FILM_V2_LABEL); expect(mixedLabel(activeJourney())).toBe(FILM_V2_LABEL);
    const q = mk({ choiceLoader: () => Promise.resolve('v3') }); q.select(JOURNEY_ACTIVE); await q.load(); expect(a.label).toBe(FILM_MIXED_LABEL);
  });
  test('row v3-animated plays film4 (journey4-*) with its own label; if film4.json is missing it falls back to v3; ?film=v2 overrides the row', async () => {
    const p = mk({ choiceLoader: () => Promise.resolve('v3-animated') }); p.select(JOURNEY_ACTIVE); await p.load(); expect(p.state).toMatchObject({ id: JOURNEY_V3A_ID, status: 'ready' }); expect(p.state.src).toBe('/yas-bloom/film/journey4-1080.mp4'); expect(AGENDA.find((a) => a.id === JOURNEY_ACTIVE).label).toBe(FILM_V3A_LABEL);
    const no4 = { ...MANIFESTS }; delete no4['/yas-bloom/film/film4.json']; const f = new FilmPlayer({ lang: 'en', device: { tier: 'high' }, search: '', choiceLoader: () => Promise.resolve('v3-animated'), fetcher: (u) => Promise.resolve(no4[u] ? { ok: true, text: () => Promise.resolve(no4[u]) } : { ok: false }) }); f.select(JOURNEY_ACTIVE); await f.load(); expect(f.state.id).toBe(JOURNEY_V3_ID);
    const o = mk({ choiceLoader: () => Promise.resolve('v3'), search: '?debug=1&film=v2' }); o.select(JOURNEY_ACTIVE); await o.load(); expect(o.state.id).toBe(JOURNEY_V2_ID);
  });
  test('a failing or slow row read keeps the default; a version whose manifest is missing falls back (the wall is not empty)', async () => {
    const bad = mk({ choiceLoader: () => Promise.reject(new Error('x')) }); bad.select(JOURNEY_ACTIVE); await bad.load(); expect(bad.state.id).toBe(JOURNEY_V3_ID);
    const no3 = { ...MANIFESTS }; delete no3['/yas-bloom/film/film3.json']; const p = new FilmPlayer({ lang: 'en', device: { tier: 'high' }, search: '', choiceLoader: () => Promise.resolve('v3'), fetcher: (u) => Promise.resolve(no3[u] ? { ok: true, text: () => Promise.resolve(no3[u]) } : { ok: false }) }); p.select(JOURNEY_ACTIVE); await p.load(); expect(p.state).toMatchObject({ id: JOURNEY_V2_ID, status: 'ready' });
  });
  test('the preload plan resolves the alias: only the ACTIVE film is planned in Meeting mode, the other versions never', async () => {
    const plans = []; const pre = { onChange: null, setPlan: (i) => plans.push(i), start: () => {}, prioritise: () => {}, view: () => ({ state: 'off', pct: 0 }), skip: () => {}, release: () => {}, dispose: () => {}, urlFor: () => '', pin: () => {}, unpin: () => {} };
    const p = mk({ preloader: pre, choiceLoader: () => Promise.resolve('v2') }); await p.load(); p.prefetch([JOURNEY_ACTIVE]); expect(plans[0]).toHaveLength(1); expect(plans[0][0].src).toBe('/yas-bloom/film/journey2-1080.mp4'); expect(plans[0][0].id).toBe(JOURNEY_V2_ID);
  });
  test('only the active version is listed: the agenda has ONE journey item and the film deck one slide, both the alias', () => {
    expect(AGENDA.filter((a) => /journey/.test(a.id)).map((a) => a.id)).toEqual(['journey', JOURNEY_ACTIVE]);
  });
});

describe('v1: the original film, no real people', () => {
  it('is selectable, labelled all-AI, and never falls back to a version showing the leaders', () => {
    const ALL1 = [JOURNEY_ID, JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID];
    expect(chooseJourney({ want: 'v1', available: ALL1 })).toBe(JOURNEY_ID);
    expect(chooseJourney({ want: 'v1', override: 'v1', available: ALL1 })).toBe(JOURNEY_ID);
    expect(chooseJourney({ want: 'v1', available: [JOURNEY_V2_ID, JOURNEY_V3_ID] })).toBe('');
    expect(mixedLabel(JOURNEY_ID).en).toMatch(/AI-generated/); expect(mixedLabel(JOURNEY_ID).en).not.toMatch(/real photograph/i);
  });
});
