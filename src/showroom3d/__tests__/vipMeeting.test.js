/* Management meeting: the films manifest (both shapes), ordering (real films first, the AI film last and labelled), missing-file states, agenda logic, EN / AR, the committed films.json and media. */
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { parseFilmsManifest, parseFilmManifest, pickSource, filmLabel, filmReducer, initFilm, FILM_AI_LABEL, FILMS_MANIFEST_URL, FILM_MANIFEST_URL } from '../vip/film';
import { FilmPlayer } from '../vip/filmPlayer';
import { MEETING_DECK, MEETING_TITLE, AGENDA, REAL_FILMS, agendaIndex, nextAgendaItem, firstAgendaItem } from '../vip/meeting';
import { PERMANENT_DECKS } from '../vip/decks';
import { deckHasDisclaimer, FORBIDDEN_FINANCIAL } from '../vip/deckSchema';
import { drawMeeting, drawFilmIdle, TYPE } from '../scenes/vip/panels';
import { VipPanel } from '../ui/VipPanel';
import { reply } from '../staff/guide';

const PUB = path.resolve(__dirname, '../../../public/yas-bloom/film');
const SINGLE = { title: { en: 'The Closets: The Journey of Ambition', ar: 'الخزائن: حكاية طموح' }, durationSec: 96, sources: [{ src: '/yas-bloom/film/journey-720.mp4', width: 1280, height: 720, bytes: 9e6 }, { src: '/yas-bloom/film/journey-1080.mp4', width: 1920, height: 1080, bytes: 2e7 }], poster: '/yas-bloom/film/journey-poster.jpg', captions: [{ lang: 'ar', src: '/yas-bloom/film/journey.ar.vtt' }], notes: 'AI-generated illustration' };
const LIST = JSON.parse(fs.readFileSync(path.join(PUB, 'films.json'), 'utf8'));
const fetcherFor = (map) => (u) => Promise.resolve(u in map ? { ok: true, text: () => Promise.resolve(typeof map[u] === 'string' ? map[u] : JSON.stringify(map[u])) } : { ok: false, text: () => Promise.resolve('') });

describe('films manifest: both shapes', () => {
  test('the list shape (committed films.json): the two REAL films first in their order, the AI documentary last as a reference to its own film.json', () => {
    const r = parseFilmsManifest(LIST); expect(r.ok).toBe(true); expect(r.films.map((f) => f.id)).toEqual(['yas-story', 'closets-story', 'journey']); expect(r.films.map((f) => f.real)).toEqual([true, true, false]);
    expect(r.films[2].ref).toBe('/yas-bloom/film/film.json'); expect(r.films[0].film.real).toBe(true); expect(r.films[0].film.burnedSubtitles).toBe(true); expect(r.films[0].film.captions).toEqual([]); expect(r.films[1].film.sources.map((s) => s.height)).toEqual([720, 540]);
  });
  test('the old single-film shape still works: it becomes one entry "journey", never real', () => {
    const r = parseFilmsManifest(SINGLE); expect(r.ok).toBe(true); expect(r.films).toHaveLength(1); expect(r.films[0]).toMatchObject({ id: 'journey', real: false }); expect(r.films[0].film.sources).toHaveLength(2);
    expect(parseFilmsManifest({ ...SINGLE, real: true }).films[0].real).toBe(false); expect(parseFilmManifest(SINGLE).ok).toBe(true);
  });
  test('ordering is enforced whatever the file order: real before AI, then by `order`; duplicates, junk and external addresses are dropped', () => {
    const mk = (id, real, order, src = '/yas-bloom/film/' + id + '.mp4') => ({ id, real, order, title: { en: id }, sources: [{ src, height: 480 }] });
    const r = parseFilmsManifest({ films: [mk('ai', false, 1), mk('b', true, 2), mk('a', true, 1), mk('a', true, 0), 'junk', mk('evil', true, 0, 'https://x.example/e.mp4'), { id: 'ref', manifest: 'https://x.example/f.json' }] });
    expect(r.films.map((f) => f.id)).toEqual(['a', 'b', 'ai']);
    for (const bad of ['<html>', '{', null, { films: [] }, { films: ['x'] }]) expect(parseFilmsManifest(bad).ok).toBe(false);
  });
  test('label rule: only films that are NOT real footage carry "AI-generated illustration"', () => {
    const r = parseFilmsManifest(LIST); expect(filmLabel(r.films[0].film)).toBeNull(); expect(filmLabel(r.films[1].film)).toBeNull(); expect(filmLabel(parseFilmsManifest(SINGLE).films[0].film)).toBe(FILM_AI_LABEL); expect(filmLabel(null)).toBe(FILM_AI_LABEL);
  });
  test('source choice for the real films: phones / data saver get the lighter "mobile" file (same height for the YAS film), desktops the main one', () => {
    const [yas, clo] = parseFilmsManifest(LIST).films; expect(pickSource(yas.film.sources, { tier: 'high' }).src).toBe('/yas-bloom/film/yas-story.mp4'); expect(pickSource(yas.film.sources, { mobile: true }).src).toBe('/yas-bloom/film/yas-story-mobile.mp4');
    expect(pickSource(clo.film.sources, { tier: 'medium' }).src).toBe('/yas-bloom/film/closets-story.mp4'); expect(pickSource(clo.film.sources, { saveData: true }).src).toBe('/yas-bloom/film/closets-story-mobile.mp4'); expect(pickSource(clo.film.sources, { tier: 'low' }).src).toBe('/yas-bloom/film/closets-story.mp4');
  });
});

describe('the committed films: files exist, are web MP4s within the size targets, posters small', () => {
  test('every source / poster in films.json exists; main <= 14 MB, mobile <= 7 MB, poster <= 150 KB; `bytes` in the manifest is the real size; faststart (moov before mdat)', () => {
    for (const f of LIST.films.filter((x) => x.sources)) {
      f.sources.forEach((s, i) => { const p = path.join(PUB, path.basename(s.src)); expect(fs.existsSync(p)).toBe(true); const size = fs.statSync(p).size; expect(size).toBe(s.bytes); expect(size).toBeLessThanOrEqual((i === 0 ? 14 : 7) * 1024 * 1024);
        const head = fs.readFileSync(p).subarray(0, 4096).toString('latin1'); expect(head.indexOf('ftyp')).toBe(4); expect(head.indexOf('moov')).toBeGreaterThan(0); });
      const poster = path.join(PUB, path.basename(f.poster)); expect(fs.existsSync(poster)).toBe(true); expect(fs.statSync(poster).size).toBeLessThanOrEqual(150 * 1024); expect(f.real).toBe(true); expect(f.title.en.length).toBeGreaterThan(5); expect(/[؀-ۿ]/.test(f.title.ar)).toBe(true);
    }
  });
  test('the list references the AI documentary only through its own manifest (no journey-* file is assumed to exist)', () => { const j = LIST.films.find((f) => f.id === 'journey'); expect(j).toEqual({ id: 'journey', manifest: '/yas-bloom/film/film.json', real: false, order: 99 }); expect(JSON.stringify(LIST)).not.toMatch(/journey-\d/); });
});

describe('film library: missing-file states', () => {
  test('films.json present, film.json absent: the real films are ready (paused, nothing but JSON requested), the AI film is "missing" (Film coming soon)', async () => {
    const asked = []; const base = fetcherFor({ [FILMS_MANIFEST_URL]: LIST }); const p = new FilmPlayer({ fetcher: (u) => { asked.push(u); return base(u); }, lang: 'en', device: { tier: 'high' } });
    p.select('yas-story'); await p.load(); expect(p.state).toMatchObject({ status: 'ready', id: 'yas-story', src: '/yas-bloom/film/yas-story.mp4', caption: 'off' }); expect(p.video).toBeNull(); expect(asked).toEqual([FILMS_MANIFEST_URL, FILM_MANIFEST_URL]);
    p.select('closets-story'); expect(p.state).toMatchObject({ status: 'ready', id: 'closets-story' }); p.select('journey'); expect(p.state.status).toBe('missing'); expect(p.play()).toBe(false); p.select('nope'); expect(p.state.status).toBe('missing');
  });
  test('both manifests present: the AI film is ready and stays labelled (real: false) even when listed', async () => {
    const p = new FilmPlayer({ fetcher: fetcherFor({ [FILMS_MANIFEST_URL]: LIST, [FILM_MANIFEST_URL]: SINGLE }), lang: 'ar' }); p.select('journey'); await p.load(); expect(p.state).toMatchObject({ status: 'ready', id: 'journey', caption: 'ar' }); expect(p.state.film.real).toBe(false);
  });
  test('films.json absent (the film branch alone): the single film.json still works; nothing at all: every film is "missing"', async () => {
    const a = new FilmPlayer({ fetcher: fetcherFor({ [FILM_MANIFEST_URL]: SINGLE }) }); a.select('journey'); await a.load(); expect(a.state.status).toBe('ready'); a.select('yas-story'); expect(a.state.status).toBe('missing');
    const b = new FilmPlayer({ fetcher: fetcherFor({}) }); b.select('yas-story'); await b.load(); expect(b.state.status).toBe('missing'); const c = new FilmPlayer({ fetcher: () => Promise.reject(new Error('offline')) }); c.select('closets-story'); await c.load(); expect(c.state.status).toBe('missing');
  });
  test('switching film discards the previous <video> (paused, source removed) and keeps the volume; a media error on the new one is "missing"', async () => {
    const p = new FilmPlayer({ fetcher: fetcherFor({ [FILMS_MANIFEST_URL]: LIST }) }); p.select('yas-story'); await p.load(); const v1 = p.ensureVideo(); expect(v1.getAttribute('src')).toBe('/yas-bloom/film/yas-story.mp4'); expect(v1.preload).toBe('none'); expect(v1.muted).toBe(false); expect(v1.querySelectorAll('track')).toHaveLength(0);
    p.setVolume(0.5); p.select('closets-story'); expect(p.video).toBeNull(); expect(v1.getAttribute('src')).toBeNull(); expect(p.state.volume).toBe(0.5); const v2 = p.ensureVideo(); expect(v2).not.toBe(v1); expect(v2.getAttribute('src')).toBe('/yas-bloom/film/closets-story.mp4');
    v1.dispatchEvent(new Event('error')); expect(p.state.status).toBe('ready'); v2.dispatchEvent(new Event('error')); expect(p.state.status).toBe('missing');
    expect(filmReducer(initFilm(), { type: 'select', id: 'x', film: null }).status).toBe('missing');
  });
});

describe('agenda', () => {
  test('the meeting is the FIRST entry of the room; its deck: agenda card, then the two real films; the AI documentary entry is last', () => {
    expect(PERMANENT_DECKS.map((d) => d.id)).toEqual(['meeting', 'default', 'closets-profile', 'yas-profile', 'film']); expect(PERMANENT_DECKS[0]).toBe(MEETING_DECK); expect(MEETING_DECK.slides.map((s) => [s.id, s.builtin, s.filmId])).toEqual([['agenda', 'meeting', undefined], ['yas-story', 'film', 'yas-story'], ['closets-story', 'film', 'closets-story']]); expect(deckHasDisclaimer(MEETING_DECK)).toBe(true);
  });
  test('order: real films first, then the three presentations, the AI film LAST and the only one labelled', () => {
    expect(AGENDA.map((a) => a.id)).toEqual(['yas-story', 'closets-story', 'closets-profile', 'yas-profile', 'default', 'journey']); expect(AGENDA.map((a) => a.kind)).toEqual(['film', 'film', 'deck', 'deck', 'deck', 'film']);
    expect(AGENDA.filter((a) => a.label).map((a) => a.id)).toEqual(['journey']); expect(AGENDA[5].label).toBe(FILM_AI_LABEL); expect(AGENDA[5].real).toBe(false); expect(AGENDA.slice(0, 2).every((a) => a.real)).toBe(true);
    for (const a of AGENDA) expect(PERMANENT_DECKS.some((d) => d.id === a.deck && d.slides[a.slide])).toBe(true);
  });
  test('where am I / what is next: card -> film 1 -> film 2 -> Closets profile -> YAS profile -> company presentation -> AI film -> end', () => {
    expect(agendaIndex('meeting', 0)).toBe(-1); expect(nextAgendaItem(-1)).toBe(firstAgendaItem()); expect(firstAgendaItem().id).toBe('yas-story'); expect(agendaIndex('meeting', 1)).toBe(0); expect(agendaIndex('meeting', 2)).toBe(1);
    const walk = []; let i = -1; for (;;) { const n = nextAgendaItem(i); if (!n) break; walk.push(n.id); i = agendaIndex(n.deck, n.slide); } expect(walk).toEqual(AGENDA.map((a) => a.id));
    expect(agendaIndex('closets-profile', 7)).toBe(2); expect(agendaIndex('film', 0)).toBe(5); expect(nextAgendaItem(5)).toBeNull(); expect(agendaIndex('user-x', 0)).toBe(-1); expect(nextAgendaItem(NaN)).toBeNull(); expect(nextAgendaItem(-2)).toBeNull();
  });
  test('EN / AR: every title in both languages with Arabic script; no financial or invest wording', () => {
    const all = [MEETING_TITLE, ...AGENDA.map((a) => a.title), ...REAL_FILMS.map((f) => f.lead)]; for (const t of all) { expect(t.en.length).toBeGreaterThan(3); expect(/[؀-ۿ]/.test(t.ar)).toBe(true); }
    const txt = all.map((t) => t.en + ' ' + t.ar).join(' | '); expect(FORBIDDEN_FINANCIAL.test(txt)).toBe(false); expect(/invest|مستثمر/i.test(txt)).toBe(false); expect(MEETING_TITLE).toEqual({ en: 'Management meeting', ar: 'اجتماع الإدارة' });
  });
});

describe('wall and panel', () => {
  const rec = (fn, o) => { const state = { font: '10px x' }, noop = () => {}; const g = new Proxy(state, { get(t, k) { if (k === 'measureText') return (s) => ({ width: String(s).length * parseFloat(/(\d+)px/.exec(t.font)[1]) * 0.56 }); if (k === 'createLinearGradient') return () => ({ addColorStop: noop }); return k in t ? t[k] : noop; }, set(t, k, v) { t[k] = v; return true; } }); const metrics = []; fn(g, 1536, 864, { ...o, metrics }); return metrics.filter((m) => m.s && m.s.trim()); };
  test.each(['en', 'ar'])('the title card (%s): "Management meeting" at 80 px, six agenda lines at 34 px (>= 3.5%% of the height), the AI label on the last line only, inside the safe area', (lang) => {
    const m = rec(drawMeeting, { lang }); const title = m.find((x) => x.s === MEETING_TITLE[lang]); expect(title.size).toBe(TYPE.hero); const lines = m.filter((x) => x.size === 34); expect(lines).toHaveLength(6); expect(lines[0].s).toContain(AGENDA[0].title[lang]);
    expect(lines.filter((x) => x.s.includes(FILM_AI_LABEL[lang]))).toHaveLength(1); expect(lines[5].s).toContain(FILM_AI_LABEL[lang]); for (const x of m) { expect(x.size).toBeGreaterThanOrEqual(22); expect(x.weight).toBeGreaterThanOrEqual(500); if (x.y1) expect(x.y1).toBeLessThanOrEqual(864); }
    expect(Math.max(...lines.map((x) => x.y1))).toBeLessThanOrEqual(864 - TYPE.safeBottom - 70);
  });
  test('a real film poster frame says "Company film" and never the AI label; the AI film says the AI label', () => {
    const real = rec(drawFilmIdle, { lang: 'en', film: { status: 'ready', real: true, title: REAL_FILMS[0].title, duration: 177 } }).map((x) => x.s).join(' | '); expect(real).toMatch(/Company film · 2:57/); expect(real).not.toMatch(/AI-generated/); expect(real).toMatch(/YAS: our story/); expect(real).toMatch(/Management meeting/);
    const ai = rec(drawFilmIdle, { lang: 'en', film: { status: 'ready', real: false, duration: 96 } }).map((x) => x.s).join(' | '); expect(ai).toMatch(/AI-generated illustration/);
  });
  const mkEx = (slide = 0) => { const calls = []; const ex = { calls, canvas: { parentNode: document.body }, deck: MEETING_DECK, allDecks: () => PERMANENT_DECKS, play: { playing: false, speed: 1, loop: true }, presMode: 'panel', meetingOn: true, agendaNow: () => agendaIndex('meeting', slide), startMeeting: () => calls.push(['start']), nextAgenda: () => calls.push(['next']), goAgenda: (a) => calls.push(['go', a.id]), setDeck: () => {}, setStation: () => {}, stepStation: () => {}, exitFocus: () => {}, filmToggle: () => calls.push(['toggle']), setCinema: () => {}, setPresentMode: () => {}, filmSeek: () => {}, filmVolume: () => {}, togglePlay: () => {}, cycleSpeed: () => {}, toggleLoop: () => {} }; return ex; };
  test('panel, agenda card: the picker lists Management meeting first; Start meeting; six agenda buttons with the AI label on the last; clicking works', () => {
    const ex = mkEx(0); render(<VipPanel lang="en" touch={false} explorerRef={{ current: ex }} st={{ vipStation: 0 }} />);
    expect([...screen.getByTestId('sr-vip-deck-select').options].map((o) => o.textContent)[0]).toBe('Management meeting'); expect(screen.getByTestId('sr-vip-title').textContent).toBe('Management meeting');
    const items = [...screen.getByTestId('sr-vip-agenda').querySelectorAll('button')]; expect(items).toHaveLength(6); expect(items[0].textContent).toMatch(/YAS: our story.*Company film/); expect(items[5].textContent).toMatch(/AI-generated illustration/); expect(items.slice(0, 5).some((b) => /AI-generated/.test(b.textContent))).toBe(false);
    fireEvent.click(screen.getByTestId('sr-vip-meet-start')); fireEvent.click(screen.getByTestId('sr-vip-agenda-closets-profile')); expect(ex.calls).toEqual([['start'], ['go', 'closets-profile']]); expect(screen.queryByTestId('sr-vip-meet-next')).toBeNull();
  });
  test('panel, film 1 (Arabic): the real film has no AI label and no captions button (subtitles are in the picture); "Next agenda item" names film 2', async () => {
    const ex = mkEx(1); ex.film = new FilmPlayer({ fetcher: fetcherFor({ [FILMS_MANIFEST_URL]: LIST }), lang: 'ar' }); ex.film.select('yas-story'); await ex.film.load(); render(<VipPanel lang="ar" touch={false} explorerRef={{ current: ex }} st={{ vipStation: 1 }} />);
    expect(screen.getByTestId('sr-vip-film').dataset.status).toBe('ready'); expect(screen.queryByTestId('sr-vip-film-ai')).toBeNull(); expect(screen.getByTestId('sr-vip-film-real')).toBeInTheDocument(); expect(screen.queryByTestId('sr-vip-film-cc')).toBeNull(); expect(screen.getByTestId('sr-vip-film-play')).not.toBeDisabled();
    expect(screen.getByTestId('sr-vip-meet-next').textContent).toMatch(/البند التالي.*ذا كلوزتس: حكايتنا/); fireEvent.click(screen.getByTestId('sr-vip-meet-next')); fireEvent.click(screen.getByTestId('sr-vip-film-play')); expect(ex.calls).toEqual([['next'], ['toggle']]); expect(screen.getByTestId('sr-vip-prev')).toBeInTheDocument();
  });
  test('the adviser: "start the management meeting" / "ابدأ اجتماع الإدارة" opens the meeting on the big screen (no auto-play)', () => {
    const ctx = { lang: 'en', staff: { id: 'vip', room: 'vip', name: { en: 'VIP advisor', ar: 'مستشارة VIP' } } };
    for (const q of ['start the management meeting', 'please begin the meeting', '#present:meeting']) { const r = reply(q, ctx); expect(r.intent).toBe('meeting'); expect(r.auto).toEqual({ type: 'present', deck: 'meeting' }); expect(r.text).toMatch(/Start meeting/); }
    const a = reply('ابدأ اجتماع الإدارة', { ...ctx, lang: 'ar' }); expect(a.intent).toBe('meeting'); expect(a.text).toMatch(/اجتماع الإدارة/); expect(JSON.stringify(reply('tell me about the vip room', ctx).chips)).toMatch(/#present:meeting/);
  });
});
