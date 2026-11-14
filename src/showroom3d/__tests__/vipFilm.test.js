import '@testing-library/jest-dom';
import { parseFilmManifest, pickSource, captionCycle, defaultCaption, nextCaption, fmtTime, initFilm, filmReducer, filmPath, FILM_DECK, FILM_ENTRY, FILM_AI_LABEL, FILM_SOON, FILM_MANIFEST_URL } from '../vip/film';
import { PERMANENT_DECKS } from '../vip/decks';
import { deckHasDisclaimer } from '../vip/deckSchema';

const MAN = { title: { en: 'The Closets: The Journey of Ambition', ar: 'الخزائن: حكاية طموح' }, durationSec: 96, sources: [{ src: '/yas-bloom/film/journey-720.mp4', width: 1280, height: 720, bytes: 9000000 }, { src: '/yas-bloom/film/journey-1080.mp4', width: 1920, height: 1080, bytes: 21000000 }], poster: '/yas-bloom/film/journey-poster.jpg', captions: [{ lang: 'ar', src: '/yas-bloom/film/journey.ar.vtt' }, { lang: 'en', src: '/yas-bloom/film/journey.en.vtt' }], notes: 'AI-generated illustration' };

describe('film manifest parsing', () => {
  test('a good manifest (object or JSON text): title in both languages, duration, sources largest first, poster, captions', () => {
    for (const raw of [MAN, JSON.stringify(MAN)]) { const r = parseFilmManifest(raw); expect(r.ok).toBe(true); expect(r.film.title.ar).toBe('الخزائن: حكاية طموح'); expect(r.film.durationSec).toBe(96); expect(r.film.sources.map((s) => s.height)).toEqual([1080, 720]); expect(r.film.poster).toBe('/yas-bloom/film/journey-poster.jpg'); expect(r.film.captions.map((c) => c.lang)).toEqual(['ar', 'en']); expect(r.film.note).toBe('AI-generated illustration'); }
  });
  test.each([['<!doctype html><html>', 'not-json'], ['', 'not-json'], [null, 'not-object'], [[], 'not-object'], [{}, 'no-sources'], [{ sources: [] }, 'no-sources'], [{ sources: [{ src: 'https://evil.example/x.mp4', height: 720 }] }, 'no-sources']])('missing / broken manifest %j -> not ok (%s): the room shows "Film coming soon"', (raw, err) => { const r = parseFilmManifest(raw); expect(r.ok).toBe(false); expect(r.error).toBe(err); expect(r.film).toBeNull(); });
  test('only same-site paths under /yas-bloom/film/ survive: external hosts, schemes, traversal and wrong types are dropped', () => {
    for (const bad of ['https://x.example/a.mp4', '//x.example/a.mp4', 'javascript:alert(1)', '/yas-bloom/film/../../secret.mp4', '/yas-bloom/film/a.exe', '/other/a.mp4', 'data:video/mp4;base64,AAAA', '/yas-bloom/film/a b.mp4', 42, null]) expect(filmPath(bad, ['mp4', 'webm'])).toBe('');
    expect(filmPath('/yas-bloom/film/journey-1080.mp4', ['mp4'])).toBe('/yas-bloom/film/journey-1080.mp4'); expect(filmPath('/yas-bloom/film/journey-1080.mp4', ['vtt'])).toBe('');
    const r = parseFilmManifest({ ...MAN, poster: 'https://x.example/p.jpg', captions: [{ lang: 'fr', src: '/yas-bloom/film/j.fr.vtt' }, { lang: 'ar', src: 'https://x/a.vtt' }, { lang: 'en', src: '/yas-bloom/film/journey.en.vtt' }, { lang: 'en', src: '/yas-bloom/film/dup.vtt' }], sources: [...MAN.sources, { src: 'http://x/y.mp4', height: 2160 }, 'junk'] });
    expect(r.ok).toBe(true); expect(r.film.poster).toBe(''); expect(r.film.captions).toEqual([{ lang: 'en', src: '/yas-bloom/film/journey.en.vtt' }]); expect(r.film.sources).toHaveLength(2);
  });
  test('markup in the title / notes is stripped; a missing title falls back to the film name; a silly duration becomes 0', () => {
    const r = parseFilmManifest({ ...MAN, title: { en: '<script>x</script>Our <b>story</b>' }, notes: '<i>AI</i>-generated', durationSec: -5 }); expect(r.film.title.en).toBe('Our story'); expect(r.film.title.ar).toBe('الخزائن: حكاية طموح'); expect(r.film.note).toBe('AI -generated'); expect(r.film.durationSec).toBe(0);
  });
});

describe('source selection', () => {
  const S = parseFilmManifest(MAN).film.sources;
  test('720 on phones, on the low tier and with data saver; 1080 otherwise', () => {
    expect(pickSource(S, { tier: 'high' }).height).toBe(1080); expect(pickSource(S, { tier: 'medium' }).height).toBe(1080); expect(pickSource(S, { tier: 'low' }).height).toBe(720); expect(pickSource(S, { tier: 'high', mobile: true }).height).toBe(720); expect(pickSource(S, { tier: 'high', saveData: true }).height).toBe(720); expect(pickSource(S).height).toBe(1080);
  });
  test('falls back to what exists: only a 1080 file on a phone still plays it; a 4K file is never chosen over 1080; nothing -> null', () => {
    expect(pickSource([S[0]], { mobile: true }).height).toBe(1080); expect(pickSource([{ src: '/a', height: 2160 }, ...S], { tier: 'high' }).height).toBe(1080); expect(pickSource([], {})).toBeNull(); expect(pickSource(null)).toBeNull();
  });
});

describe('captions and time', () => {
  test('the page language comes first (EN page -> English captions for the Arabic narration; AR page -> Arabic), then the other, then off', () => {
    const C = MAN.captions; expect(captionCycle(C, 'en')).toEqual(['en', 'ar', 'off']); expect(captionCycle(C, 'ar')).toEqual(['ar', 'en', 'off']); expect(defaultCaption(C, 'en')).toBe('en'); expect(defaultCaption(C, 'ar')).toBe('ar');
    expect(defaultCaption([], 'en')).toBe('off'); expect(captionCycle([{ lang: 'ar', src: 'x' }], 'en')).toEqual(['ar', 'off']); expect(nextCaption(C, 'en', 'en')).toBe('ar'); expect(nextCaption(C, 'en', 'ar')).toBe('off'); expect(nextCaption(C, 'en', 'off')).toBe('en');
  });
  test('fmtTime', () => { expect(fmtTime(0)).toBe('0:00'); expect(fmtTime(65.9)).toBe('1:05'); expect(fmtTime(-3)).toBe('0:00'); expect(fmtTime('x')).toBe('0:00'); });
});

describe('film state: paused by default, graceful missing state', () => {
  test('idle -> loading -> ready (poster, NOT playing) with the source for the device and the default caption language', () => {
    let s = initFilm(); expect(s.status).toBe('idle'); s = filmReducer(s, { type: 'load' }); expect(s.status).toBe('loading');
    s = filmReducer(s, { type: 'manifest', raw: MAN, lang: 'en', device: { tier: 'low' } }); expect(s.status).toBe('ready'); expect(s.src).toBe('/yas-bloom/film/journey-720.mp4'); expect(s.caption).toBe('en'); expect(s.duration).toBe(96);
    expect(filmReducer(initFilm(), { type: 'manifest', raw: MAN, lang: 'ar', device: { tier: 'high' } })).toMatchObject({ src: '/yas-bloom/film/journey-1080.mp4', caption: 'ar', status: 'ready' });
  });
  test('missing film.json (404 page, HTML fallback, broken JSON) or a failing mp4 -> "missing"; play does nothing in that state', () => {
    for (const raw of ['<!doctype html>', '{', null, { sources: [] }]) { const s = filmReducer(filmReducer(initFilm(), { type: 'load' }), { type: 'manifest', raw }); expect(s.status).toBe('missing'); expect(filmReducer(s, { type: 'play' }).status).toBe('missing'); }
    const ready = filmReducer(initFilm(), { type: 'manifest', raw: MAN }); expect(filmReducer(filmReducer(ready, { type: 'play' }), { type: 'missing' }).status).toBe('missing'); expect(filmReducer(initFilm(), { type: 'play' }).status).toBe('idle');
  });
  test('play / pause / ended / time / volume / captions / cue', () => {
    let s = filmReducer(initFilm(), { type: 'manifest', raw: MAN, lang: 'en' }); s = filmReducer(s, { type: 'play' }); expect(s.status).toBe('playing'); s = filmReducer(s, { type: 'time', time: 12.5, duration: 97 }); expect(s.time).toBe(12.5); expect(s.duration).toBe(97);
    s = filmReducer(s, { type: 'cue', text: '<v Narrator>Since 2007</v>' }); expect(s.cue).toBe('Since 2007'); s = filmReducer(s, { type: 'pause' }); expect(s.status).toBe('paused'); expect(filmReducer(s, { type: 'pause' })).toBe(s);
    s = filmReducer(s, { type: 'volume', value: 3 }); expect(s.volume).toBe(1); s = filmReducer(s, { type: 'volume', value: 0.4, muted: true }); expect(s).toMatchObject({ volume: 0.4, muted: true });
    s = filmReducer(s, { type: 'caption', value: 'off' }); expect(s.caption).toBe('off'); expect(s.cue).toBe(''); s = filmReducer(s, { type: 'ended' }); expect(s.status).toBe('ended'); expect(filmReducer(s, { type: 'zzz' })).toBe(s);
  });
});

describe('the film as a picker entry', () => {
  test('"Watch our story" / "شاهد حكايتنا" is the last permanent entry, one slide, flagged as the film, and still carries the closing notice rule', () => {
    const last = PERMANENT_DECKS[PERMANENT_DECKS.length - 1]; expect(last.id).toBe('film'); expect(last).toBe(FILM_DECK); expect(FILM_ENTRY).toEqual({ en: 'Watch our story', ar: 'شاهد حكايتنا' }); expect(last.slides).toHaveLength(1); expect(last.slides[0].builtin).toBe('film'); expect(deckHasDisclaimer(last)).toBe(true);
    expect(FILM_AI_LABEL.en).toBe('AI-generated illustration'); expect(/[؀-ۿ]/.test(FILM_AI_LABEL.ar + FILM_SOON.ar)).toBe(true); expect(FILM_SOON.en).toBe('Film coming soon'); expect(FILM_MANIFEST_URL).toBe('/yas-bloom/film/film.json');
  });
});

// ---- the panel in FILM mode (fake explorer, no WebGL) and the adviser hook
describe('film in the panel and with the adviser', () => {
  const React = require('react'); const { render, screen, fireEvent } = require('@testing-library/react'); const { VipPanel } = require('../ui/VipPanel'); const { FilmPlayer } = require('../vip/filmPlayer'); const { reply } = require('../staff/guide');
  const mkEx = (fetcher) => { const calls = []; const ex = { calls, canvas: { parentNode: document.body }, deck: FILM_DECK, allDecks: () => PERMANENT_DECKS, play: { playing: false, speed: 1, loop: true }, presMode: 'panel', cinema: false, setDeck: (id) => calls.push(['deck', id]), exitFocus: () => {}, filmToggle: () => calls.push(['toggle']), filmCaptions: () => { ex.film.cycleCaptions(); calls.push(['cc']); }, filmSeek: () => {}, filmVolume: (v) => calls.push(['vol', v]), setCinema: (v) => calls.push(['cinema', v]), setPresentMode: (m) => calls.push(['mode', m]) }; ex.film = new FilmPlayer({ fetcher, lang: 'en', device: { tier: 'low' } }); return ex; };
  const view = (ex, lang = 'en') => React.createElement(VipPanel, { lang, touch: false, explorerRef: { current: ex }, st: { vipStation: 0 } });
  test('missing film.json (404): "Film coming soon", controls disabled, the picker still lists "Watch our story", nothing else breaks', async () => {
    const ex = mkEx(() => Promise.resolve({ ok: false, text: () => Promise.resolve('') })); await ex.film.load(); render(view(ex));
    expect(ex.film.state.status).toBe('missing'); expect(screen.getByTestId('sr-vip-film-soon').textContent).toBe('Film coming soon'); expect(screen.getByTestId('sr-vip-film-play')).toBeDisabled(); expect(screen.getByTestId('sr-vip-film-cinema')).toBeDisabled();
    expect([...screen.getByTestId('sr-vip-deck-select').options].map((o) => o.textContent)).toContain('Watch our story'); expect(screen.queryByTestId('sr-vip-prev')).toBeNull(); expect(screen.getByTestId('sr-vip-disclaimer')).toBeInTheDocument();
  });
  test('a rejected fetch and an HTML fallback page are also "missing"; no fetcher at all (old browser / tests) too', async () => {
    for (const f of [() => Promise.reject(new Error('offline')), () => Promise.resolve({ ok: true, text: () => Promise.resolve('<!doctype html><html></html>') }), null]) { const p = new FilmPlayer({ fetcher: f }); const s = await p.load(); expect(s.status).toBe('missing'); expect(p.play()).toBe(false); expect(p.video).toBeNull(); }
  });
  test('with a manifest: ready and PAUSED (no video element, no src, nothing requested), the 720 file on the low tier, English captions by default; Arabic page -> Arabic captions; AI label shown', async () => {
    const asked = []; const ex = mkEx((u) => { asked.push(u); return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(MAN)) }); }); await ex.film.load(); render(view(ex));
    expect(asked).toEqual(['/yas-bloom/film/film.json']); expect(ex.film.state).toMatchObject({ status: 'ready', src: '/yas-bloom/film/journey-720.mp4', caption: 'en' }); expect(ex.film.video).toBeNull();
    expect(screen.getByTestId('sr-vip-film').dataset.status).toBe('ready'); expect(screen.getByTestId('sr-vip-film-ai').textContent).toBe('AI-generated illustration'); expect(screen.getByTestId('sr-vip-film-play')).not.toBeDisabled(); expect(screen.getByTestId('sr-vip-film-play').textContent).toMatch(/Play film/);
    fireEvent.click(screen.getByTestId('sr-vip-film-play')); fireEvent.click(screen.getByTestId('sr-vip-film-cinema')); expect(ex.calls).toEqual([['toggle'], ['cinema', true]]); expect(screen.getByTestId('sr-vip-film-cc').textContent).toMatch(/EN/);
    const ar = new FilmPlayer({ fetcher: () => Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(MAN)) }), lang: 'ar', device: { tier: 'high' } }); await ar.load(); expect(ar.state).toMatchObject({ caption: 'ar', src: '/yas-bloom/film/journey-1080.mp4' });
  });
  test('the video element is created only on Play: preload="none", not muted, not autoplay, no loop, tracks for both caption languages; a media error turns into "missing"', async () => {
    const p = new FilmPlayer({ fetcher: () => Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(MAN)) }), lang: 'en' }); await p.load(); const v = p.ensureVideo();
    expect(v.preload).toBe('none'); expect(v.muted).toBe(false); expect(v.autoplay).toBe(false); expect(v.loop).toBe(false); expect(v.controls).toBe(false); expect(v.getAttribute('src')).toBe('/yas-bloom/film/journey-1080.mp4'); expect([...v.querySelectorAll('track')].map((t) => t.srclang)).toEqual(['ar', 'en']);
    p.setCinema(true); expect(v.controls).toBe(true); p.setCinema(false); expect(v.controls).toBe(false); v.dispatchEvent(new Event('error')); expect(p.state.status).toBe('missing'); expect(p.play()).toBe(false);
  });
  test('the adviser: "play your story" / Arabic -> opens the film on the big screen (never auto-plays), says the pictures are AI-generated; the VIP reply offers the chip', () => {
    const ctx = { lang: 'en', staff: { id: 'vip', room: 'vip', name: { en: 'VIP advisor', ar: 'مستشارة VIP' } } };
    for (const q of ['can you play your story film?', 'show me the documentary', '#present:film']) { const r = reply(q, ctx); expect(r.intent).toBe('film'); expect(r.auto).toEqual({ type: 'present', deck: 'film' }); expect(r.text).toMatch(/let me play our story/i); expect(r.text).toMatch(/AI-generated/); }
    const a = reply('شغّل الفيلم', { ...ctx, lang: 'ar' }); expect(a.intent).toBe('film'); expect(a.text).toMatch(/حكايتنا/);
    expect(JSON.stringify(reply('tell me about the vip room', ctx).chips)).toMatch(/#present:film/);
  });
});
