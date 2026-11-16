/* Film v5 (journey5-*): the original all-AI Journey film (v1) with the project count changed to 50,000. NO photograph of a real person.
 * The manifest parses with the player's own parser, it is registered but never listed, v5 never falls back to a version showing the leaders,
 * the captions carry the 50,000 wording (and not the old 10,000), and the committed files match the manifest. */
import fs from 'fs';
import path from 'path';
import { parseFilmManifest, chooseJourney, mixedLabel, mixedBadge, FILM_CHOICES, JOURNEY_ID, JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID, JOURNEY_V5_ID, FILM_AI_LABEL } from '../vip/film';
import { parseFilmChoice } from '../vip/filmChoice';

const PUB = path.resolve(__dirname, '../../../public/yas-bloom/film');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8');
const MAN = JSON.parse(read('film5.json')), LIST = JSON.parse(read('films.json'));

describe('film v5: all-AI, fifty thousand projects', () => {
  test('film5.json parses: 1080 + 720, poster, both caption tracks, not real, 124 s; files exist with the declared sizes', () => {
    const r = parseFilmManifest(MAN); expect(r.ok).toBe(true);
    expect(r.film.sources.map((s) => s.height)).toEqual([1080, 720]); expect(r.film.poster).toBe('/yas-bloom/film/journey5-poster.jpg'); expect(r.film.real).toBe(false);
    expect(r.film.captions.map((c) => c.lang).sort()).toEqual(['ar', 'en']); expect(MAN.durationSec).toBe(124);
    for (const s of MAN.sources) expect(fs.statSync(path.join(PUB, path.basename(s.src))).size).toBe(s.bytes);
    expect(fs.existsSync(path.join(PUB, 'journey5-poster.jpg'))).toBe(true);
    expect(JSON.stringify(MAN)).toMatch(/50,000/); expect(JSON.stringify(MAN)).not.toMatch(/10,000 projects/);
  });
  test('registered in films.json as journey-v5, switch value v5; v1 and the rest are untouched', () => {
    expect(LIST.films.find((f) => f.id === JOURNEY_V5_ID)).toEqual({ id: 'journey-v5', manifest: '/yas-bloom/film/film5.json', real: false, order: 103 });
    expect(LIST.films.find((f) => f.id === JOURNEY_ID).manifest).toBe('/yas-bloom/film/film.json');
    expect(FILM_CHOICES.v5).toBe(JOURNEY_V5_ID); expect(FILM_CHOICES.v1).toBe(JOURNEY_ID);
    expect(parseFilmChoice([{ key: 'bloom.film.active', value: ' V5 ' }])).toBe('v5');
  });
  test('v5 never falls back to a version that shows the leaders (same rule as v1); the label is the all-AI one', () => {
    const ALL = [JOURNEY_ID, JOURNEY_V5_ID, JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID];
    expect(chooseJourney({ want: 'v5', available: ALL })).toBe(JOURNEY_V5_ID);
    expect(chooseJourney({ want: 'v3', override: 'v5', available: ALL })).toBe(JOURNEY_V5_ID);
    expect(chooseJourney({ want: 'v5', available: [JOURNEY_ID, JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID] })).toBe('');
    expect(chooseJourney({ want: 'v5', override: 'v5', available: [JOURNEY_V2_ID, JOURNEY_V3_ID] })).toBe('');
    expect(chooseJourney({ want: 'v1', available: [JOURNEY_V5_ID, JOURNEY_V3_ID] })).toBe('');          // v1 does not borrow v5 either
    expect(chooseJourney({ want: 'v3', override: 'v2', available: ALL })).toBe(JOURNEY_V2_ID);          // others unchanged
    expect(mixedLabel(JOURNEY_V5_ID)).toEqual(FILM_AI_LABEL); expect(mixedBadge(JOURNEY_V5_ID)).toEqual(FILM_AI_LABEL);
    expect(mixedLabel(JOURNEY_V5_ID).en).not.toMatch(/real photograph/i);
  });
  test('captions: 28 cues, the 50,000 wording in both languages, no ten thousand; same cue structure and timing as v1 elsewhere', () => {
    const en = read('journey5.en.vtt'), ar = read('journey5.ar.vtt'), en1 = read('journey.en.vtt'), ar1 = read('journey.ar.vtt');
    expect(en).toMatch(/more than fifty thousand projects/); expect(en).not.toMatch(/ten thousand/);
    expect(ar).toMatch(/أكثر من خمسين ألف مشروع/); expect(ar).not.toMatch(/عشرة آلاف/);
    expect(read('journey4.ar.vtt')).toMatch(/أكثر من خمسين ألف مشروع/);                                 // the same Arabic claim wording as the newer films
    const cues = (t) => t.split(/\n\n+/).filter((b) => /-->/.test(b)).map((b) => { const m = b.match(/(\d\d):(\d\d):(\d\d\.\d+) --> (\d\d):(\d\d):(\d\d\.\d+)/); return { s: +m[1] * 3600 + +m[2] * 60 + +m[3], e: +m[4] * 3600 + +m[5] * 60 + +m[6] }; });
    for (const [a, b] of [[en, en1], [ar, ar1]]) { const x = cues(a), y = cues(b); expect(x).toHaveLength(28); expect(y).toHaveLength(28);
      x.forEach((q, i) => { expect(q.e).toBeGreaterThan(q.s); if (i) expect(q.s).toBeGreaterThanOrEqual(x[i - 1].e - 0.001); if (i < 11 || i > 13) expect(Math.abs(q.s - y[i].s)).toBeLessThan(0.001); }); }
    for (const f of [en, ar]) expect(cues(f)[27].e).toBeLessThanOrEqual(124);
  });
  test('v1 files are untouched (still ten thousand) and no leader / portrait file was added', () => {
    expect(read('journey.en.vtt')).toMatch(/ten thousand/);
    expect(fs.readdirSync(PUB).filter((n) => /leader|ceo|portrait|person/i.test(n))).toEqual([]);
  });
});
