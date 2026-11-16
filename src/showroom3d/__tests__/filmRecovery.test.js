/* "Film coming soon" is ONLY for a film with no manifest. A film whose manifest loaded never turns into it: video errors / play() failures (Safari-like: blob src, NotAllowedError until a gesture,
 * AbortError on a new load) go through a recovery ladder (stream the same URL -> other resolution -> next film v3 -> v2 -> "Press Play to try again"). Late owner choice re-plans the prefetch. */
import fs from 'fs';
import path from 'path';
import { FilmPlayer } from '../vip/filmPlayer';
import { filmReducer, initFilm, JOURNEY_ACTIVE, JOURNEY_V2_ID, JOURNEY_V3_ID, JOURNEY_V3A_ID } from '../vip/film';
import { setActiveJourney } from '../vip/film';

const FILM_DIR = path.join(__dirname, '../../../public/yas-bloom/film'), read = (f) => fs.readFileSync(path.join(FILM_DIR, f), 'utf8');
const MAN = { '/yas-bloom/film/films.json': read('films.json'), '/yas-bloom/film/film.json': read('film.json'), '/yas-bloom/film/film2.json': read('film2.json'), '/yas-bloom/film/film3.json': read('film3.json'), '/yas-bloom/film/film4.json': read('film4.json') };
const fetcher = (map) => (u) => Promise.resolve(map[u] ? { ok: true, text: () => Promise.resolve(map[u]) } : { ok: false, status: 404 });
const fakePre = (blobFor = {}) => { const plans = [], discards = []; return { plans, discards, onChange: null, setPlan: (i) => plans.push(i), start: () => {}, prioritise: () => {}, view: () => ({ state: 'ready', pct: 100 }), skip: () => {}, release: () => {}, dispose: () => {}, urlFor: (s) => blobFor[s] || '', pin: () => {}, unpin: () => {}, discard: (s) => { discards.push(s); delete blobFor[s]; } }; };
let playImpl;
beforeEach(() => { setActiveJourney(JOURNEY_V3_ID); playImpl = () => Promise.resolve(); window.HTMLMediaElement.prototype.play = function () { return playImpl(this); }; window.HTMLMediaElement.prototype.pause = function () {}; window.HTMLMediaElement.prototype.load = function () {}; });
const mk = (o = {}) => new FilmPlayer({ lang: 'en', device: { tier: 'high', mobile: true, saveData: false }, search: '', fetcher: fetcher(MAN), ...o });   // mobile: the iPhone-class device (720p, the lightest file)
const err = (v) => v.dispatchEvent(new Event('error'));

describe('the reducer', () => {
  test('fail: a film that loaded becomes "retry"; with no film it is "missing"', () => {
    expect(filmReducer({ ...initFilm(), status: 'ready', film: { sources: [] } }, { type: 'fail' }).status).toBe('retry'); expect(filmReducer(initFilm(), { type: 'fail' }).status).toBe('missing');
    expect(filmReducer({ ...initFilm(), status: 'retry', film: {} }, { type: 'play' }).status).toBe('playing'); expect(filmReducer({ ...initFilm(), film: {}, src: 'a' }, { type: 'src', src: 'b' }).src).toBe('b');
  });
});

describe('Safari-like device: blob src, errors, rejections', () => {
  test('manifest missing everywhere: "missing" (Film coming soon); a loaded manifest never becomes missing after errors', async () => {
    const none = mk({ fetcher: fetcher({}) }); none.select(JOURNEY_ACTIVE); await none.load(); expect(none.state.status).toBe('missing');
  });
  test('the ladder: blob copy fails -> stream the same URL; then the other resolution; then the next film (v3 -> v2); then "retry"; never "missing"; Play from retry starts fresh', async () => {
    const pre = fakePre({ '/yas-bloom/film/journey3-720.mp4': 'blob:aaa' }), p = mk({ preloader: pre }); p.select(JOURNEY_ACTIVE); await p.load(); expect(p.state).toMatchObject({ status: 'ready', id: JOURNEY_V3_ID, src: '/yas-bloom/film/journey3-720.mp4' });
    p.play(); const v = p.video; expect(v.getAttribute('src')).toBe('blob:aaa'); const seen = [p.state.status];
    err(v); seen.push(p.state.status); expect(v.getAttribute('src')).toBe('/yas-bloom/film/journey3-720.mp4'); expect(pre.discards).toEqual(['/yas-bloom/film/journey3-720.mp4']);   // (1) streaming
    err(v); seen.push(p.state.status); expect(v.getAttribute('src')).toBe('/yas-bloom/film/journey3-1080.mp4');                                                                   // (2) the other resolution
    err(v); seen.push(p.state.status); expect(p.state.id).toBe(JOURNEY_V2_ID); const v2 = p.video; expect(v2).not.toBe(v);                                                     // (3) the next film
    err(v2); err(v2); seen.push(p.state.status); expect(p.state.status).toBe('retry'); expect(p.state.film).toBeTruthy();                                                        // (4) both files of v2 failed
    expect(seen).not.toContain('missing'); expect(p.state.status).not.toBe('missing');
    p.play(); expect(['playing', 'ready', 'paused']).toContain(p.state.status); expect(p.video).toBeTruthy(); expect(p.state.status).not.toBe('missing');   // Press Play to try again
  });
  test('play() rejections: NotAllowedError = a pause (no recovery), AbortError is ignored, NotSupportedError / other errors go through the ladder, a synchronous throw too; none is "missing"', async () => {
    const p = mk(); p.select(JOURNEY_ACTIVE); await p.load();
    playImpl = () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })); p.play(); await Promise.resolve(); await Promise.resolve(); expect(p.state.status).not.toBe('missing'); expect(p.state.src).toBe('/yas-bloom/film/journey3-720.mp4');
    playImpl = () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })); p.play(); await Promise.resolve(); await Promise.resolve(); expect(p.state.src).toBe('/yas-bloom/film/journey3-720.mp4');
    let n = 0; playImpl = () => (n++ ? Promise.resolve() : Promise.reject(Object.assign(new Error('x'), { name: 'NotSupportedError' }))); p.play(); await Promise.resolve(); await Promise.resolve(); expect(p.state.src).toBe('/yas-bloom/film/journey3-1080.mp4'); expect(p.state.status).not.toBe('missing');
    const q = mk(); q.select(JOURNEY_ACTIVE); await q.load(); let m = 0; playImpl = () => { if (!m++) throw new Error('sync'); return Promise.resolve(); }; q.play(); expect(q.state.status).not.toBe('missing'); expect(q.state.src).toBe('/yas-bloom/film/journey3-1080.mp4');
  });
  test('the active film v4 (v3-animated): its errors fall back to v3, then v2 (the fallback order), never to missing', async () => {
    const p = mk({ choiceLoader: () => Promise.resolve('v3-animated') }); p.select(JOURNEY_ACTIVE); await p.load(); expect(p.state.id).toBe(JOURNEY_V3A_ID); p.play();
    err(p.video); expect(p.state.id).toBe(JOURNEY_V3A_ID); err(p.video); expect(p.state.id).toBe(JOURNEY_V3_ID); err(p.video); err(p.video); expect(p.state.id).toBe(JOURNEY_V2_ID); expect(p.state.status).not.toBe('missing');
  });
});

describe('the owner\'s choice vs the film on the screen and the prefetch (the race)', () => {
  test('a slow choice: the first answer waits at most choiceWaitMs; when the row arrives late the wall switches to the chosen film and the plan is re-made for IT', async () => {
    const pre = fakePre(); let release; const gate = new Promise((r) => { release = r; });
    const p = mk({ preloader: pre, choiceWaitMs: 5, choiceLoader: () => gate.then(() => 'v3-animated') }); p.select(JOURNEY_ACTIVE); await p.load(); expect(p.state.id).toBe(JOURNEY_V3_ID);
    p.prefetch([JOURNEY_ACTIVE]); expect(pre.plans[0][0].src).toBe('/yas-bloom/film/journey3-720.mp4');
    release(); await p.choicePromise; expect(p.state.id).toBe(JOURNEY_V3A_ID); expect(pre.plans[pre.plans.length - 1][0].src).toBe('/yas-bloom/film/journey4-720.mp4');
  });
  test('choiceSettled() waits for the row (bounded) so Meeting mode plans the ACTIVE film at once; it resolves immediately when there is no loader', async () => {
    const pre = fakePre(); let release; const gate = new Promise((r) => { release = r; }); const p = mk({ preloader: pre, choiceWaitMs: 5, choiceLoader: () => gate.then(() => 'v2') }); await p.load();
    const settled = p.choiceSettled(2000); release(); expect(await settled).toBe('v2'); p.prefetch([JOURNEY_ACTIVE]); expect(pre.plans[pre.plans.length - 1][0].src).toBe('/yas-bloom/film/journey2-720.mp4');
    expect(await mk().choiceSettled()).toBe(null);
  });
  test('a late choice never interrupts a film that is playing', async () => {
    let release; const gate = new Promise((r) => { release = r; }); const p = mk({ choiceWaitMs: 5, choiceLoader: () => gate.then(() => 'v2') }); p.select(JOURNEY_ACTIVE); await p.load(); p.play(); p.video.dispatchEvent(new Event('play')); expect(p.state.status).toBe('playing');
    release(); await p.choicePromise; expect(p.state.id).toBe(JOURNEY_V3_ID); expect(p.state.status).toBe('playing');
  });
});
