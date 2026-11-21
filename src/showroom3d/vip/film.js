/* FILM mode of the VIP big screen: "THE CLOSETS - THE JOURNEY OF AMBITION" / "الخزائن - حكاية طموح". PURE helpers (no DOM, no three.js, no network): the manifest
 * (/yas-bloom/film/film.json) is parsed and sanitised here, a source is picked for the device, and the small state machine says what the screen shows.
 * The film files are produced separately; until they exist the room shows "Film coming soon" (status 'missing'), so this works before the film lands.
 *
 * manifest: { title: { en, ar }, durationSec, sources: [ { src, width, height, bytes } ], poster, captions: [ { lang, src } ], notes? }
 * Every address must be a same-site path under /yas-bloom/film/ (no external hosts, no schemes): anything else is dropped. */
import { str, arr, isObj } from '../siteBridge';
import { cleanText } from './deckSchema';

export const FILM_DECK_ID = 'film';
export const FILM_MANIFEST_URL = '/yas-bloom/film/film.json';          // the single-film manifest the AI documentary ships with
export const FILMS_MANIFEST_URL = '/yas-bloom/film/films.json';        // the list of films (the owner's real films first)
export const JOURNEY_ID = 'journey';
export const FILM_TITLE = { en: 'The Closets: The Journey of Ambition', ar: 'الخزائن: حكاية طموح' };
export const FILM_ENTRY = { en: 'Watch our story', ar: 'شاهد حكايتنا' };
export const FILM_AI_LABEL = { en: 'AI-generated illustration', ar: 'صور توضيحية مولَّدة بالذكاء الاصطناعي' };
/** Journey v2 mixes two real photographs of company leaders (inside the film only) with AI-generated illustration: it carries its own, accurate label ("mixed") instead of the all-AI one. */
export const JOURNEY_V2_ID = 'journey-v2';
export const FILM_V2_DECK_ID = 'film-v2';
export const FILM_MIXED_LABEL = { en: 'Leaders appear from real photographs (camera motion only) in an AI-generated office; all other imagery is AI-generated illustration', ar: 'يظهر القياديون من صور حقيقية بحركة كاميرا فقط داخل مكتب مولّد بالذكاء الاصطناعي، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي' };
export const FILM_MIXED_BADGE = { en: 'Leaders: real photos · office and other imagery: AI illustration', ar: 'صور حقيقية للقيادات · والمكتب وبقية المشاهد مولّدة بالذكاء الاصطناعي' };
export const FILM_V2_TITLE = { en: 'The Closets: The Journey of Ambition (new cut)', ar: 'الخزائن: حكاية طموح (النسخة الجديدة)' };
/** THE JOURNEY FILMS: three versions are registered side by side (films.json); exactly ONE is the "active" Journey film that the Bloom wall, the VIP agenda item and the film deck show.
 *  journey-v2 = film2.json (real photographs, static), journey-v3 = film3.json (the leaders in an AI-generated office, camera motion only), journey-v3-animated = the AI-animated version (film4.json).
 *  The slide / agenda id of the active film is the alias JOURNEY_ACTIVE; FilmPlayer resolves it with chooseJourney(). The owner's switch is the website_content row `bloom.film.active` (vip/filmChoice.js). */
export const JOURNEY_ACTIVE = 'journey-active';
export const JOURNEY_V3_ID = 'journey-v3';
export const JOURNEY_V3A_ID = 'journey-v3-animated';
export const JOURNEY_V5_ID = 'journey-v5';   // v5 = the original all-AI film (v1) with the project count changed to 50,000; NO real people
/** films that contain no photograph of a real person: when one of these is asked for it NEVER falls back to a version that shows the leaders */
export const NO_LEADERS_IDS = Object.freeze([JOURNEY_ID, JOURNEY_V5_ID]);
export const FILM_CHOICES = Object.freeze({ v1: JOURNEY_ID, v5: JOURNEY_V5_ID, v2: JOURNEY_V2_ID, v3: JOURNEY_V3_ID, 'v3-animated': JOURNEY_V3A_ID });
export const FILM_CHOICE_DEFAULT = 'v3';
export const FILM_V2_LABEL = { en: 'Real photographs of company leaders; all other imagery is AI-generated illustration', ar: 'صور حقيقية لقيادات الشركة، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي' };
export const FILM_V2_BADGE = { en: 'Leaders: real photos · other imagery: AI illustration', ar: 'صور حقيقية للقيادات · والباقي مولّد بالذكاء الاصطناعي' };
export const FILM_V3A_LABEL = { en: 'Leaders appear from real photographs, animated with AI, in an AI-generated office; all other imagery is AI-generated illustration', ar: 'يظهر القياديون من صور حقيقية محرّكة بالذكاء الاصطناعي داخل مكتب مولّد بالذكاء الاصطناعي، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي' };
export const FILM_V3A_BADGE = { en: 'Leaders: real photos animated with AI · office and other imagery: AI illustration', ar: 'صور حقيقية للقيادات محرّكة بالذكاء الاصطناعي · والمكتب وبقية المشاهد مولّدة بالذكاء الاصطناعي' };
/** the mixed label / badge of a film by its id (each version says exactly what its own film is; unknown id: the current v3 wording) */
export const JOURNEY_LABELS = { [JOURNEY_ID]: { label: FILM_AI_LABEL, badge: FILM_AI_LABEL }, [JOURNEY_V5_ID]: { label: FILM_AI_LABEL, badge: FILM_AI_LABEL }, [JOURNEY_V2_ID]: { label: FILM_V2_LABEL, badge: FILM_V2_BADGE }, [JOURNEY_V3_ID]: { label: null, badge: null }, [JOURNEY_V3A_ID]: { label: FILM_V3A_LABEL, badge: FILM_V3A_BADGE } };
export const mixedLabel = (id) => (JOURNEY_LABELS[id] && JOURNEY_LABELS[id].label) || FILM_MIXED_LABEL;
export const mixedBadge = (id) => (JOURNEY_LABELS[id] && JOURNEY_LABELS[id].badge) || FILM_MIXED_BADGE;
/** which film id plays: the wanted version first (a ?film= test override beats the owner's row), then v3, then v2; only ids in `available` (their manifests loaded) count, so the wall is never empty.
 *  want: 'v2' | 'v3' | 'v3-animated' | anything else (ignored -> the default v3). Returns an id or '' when none is available. */
export function chooseJourney({ want, override, available } = {}) {
  const have = new Set(available || []), pick = (v) => FILM_CHOICES[v] || null;
  // v1 and v5 = the all-AI film with NO real people: if one is asked for, never fall back to a version that shows the leaders
  const strict = [pick(override), !override ? pick(want) : null].find((id) => NO_LEADERS_IDS.includes(id));
  if (strict) return have.has(strict) ? strict : '';
  const order = [pick(override), pick(want), pick(FILM_CHOICE_DEFAULT), JOURNEY_V2_ID].filter(Boolean);
  return order.find((id) => have.has(id)) || '';
}
let ACTIVE_JOURNEY = JOURNEY_V3_ID;
/** the film that is active right now (set by the player once its library is loaded); the agenda's label follows it */
export const activeJourney = () => ACTIVE_JOURNEY;
export const setActiveJourney = (id) => { ACTIVE_JOURNEY = id || JOURNEY_V3_ID; };
export const FILM_SOON = { en: 'Film coming soon', ar: 'الفيلم قريبًا' };
const FILM_PATH = /^\/yas-bloom\/film\/[A-Za-z0-9._-]+\.(mp4|webm|jpg|jpeg|webp|png|vtt|json)$/;
const ext = (p) => p.slice(p.lastIndexOf('.') + 1).toLowerCase();
export const filmPath = (v, kinds) => { const s = str(v, '').trim(); return FILM_PATH.test(s) && !s.includes('..') && kinds.includes(ext(s)) ? s : ''; };

/** the film as a one-slide pseudo-deck, so the picker, the wall chips, the keys and the adviser treat it like any other entry */
export const FILM_V2_DECK = { id: FILM_V2_DECK_ID, unit: 'slide', builtin: true, film: true, title: FILM_V2_TITLE, slides: [{ id: 'film', builtin: 'film', filmId: JOURNEY_ACTIVE, disclaimer: true, title: FILM_V2_TITLE }] };   // the slide plays the ACTIVE Journey film (alias), whichever version the owner enabled
export const FILM_DECK = { id: FILM_DECK_ID, unit: 'slide', builtin: true, film: true, title: FILM_ENTRY, slides: [{ id: 'film', builtin: 'film', filmId: 'journey', disclaimer: true, title: FILM_TITLE }] };

/** -> { ok, film, error }. film = { title: {en, ar}, durationSec, sources: [{src, width, height, bytes}] (largest first), poster, captions: [{lang, src}], note } */
export function parseFilmManifest(raw) {
  let j = raw; if (typeof raw === 'string') { try { j = JSON.parse(raw); } catch (e) { return { ok: false, film: null, error: 'not-json' }; } }
  if (!isObj(j)) return { ok: false, film: null, error: 'not-object' };
  const sources = arr(j.sources).map((s) => (isObj(s) ? { src: filmPath(s.src, ['mp4', 'webm']), width: Number(s.width) || 0, height: Number(s.height) || 0, bytes: Number(s.bytes) || 0 } : null))
    .filter((s) => s && s.src && s.width >= 0 && s.height >= 0 && Number.isFinite(s.width) && Number.isFinite(s.height)).slice(0, 6).sort((a, b) => b.height - a.height);
  if (!sources.length) return { ok: false, film: null, error: 'no-sources' };
  const t = isObj(j.title) ? j.title : {}, en = cleanText(t.en, 90) || cleanText(t.ar, 90) || FILM_TITLE.en, ar = cleanText(t.ar, 90) || (t.en ? cleanText(t.en, 90) : FILM_TITLE.ar);
  const captions = []; for (const c of arr(j.captions)) { const lang = isObj(c) && (c.lang === 'ar' || c.lang === 'en') ? c.lang : '', src = isObj(c) ? filmPath(c.src, ['vtt']) : ''; if (lang && src && !captions.some((x) => x.lang === lang)) captions.push({ lang, src }); }
  const d = Number(j.durationSec);
  const realFlag = j.real === true;
  return { ok: true, error: null, film: { real: realFlag, burnedSubtitles: j.burnedSubtitles === true, mixed: j.mixed === true, title: { en, ar }, durationSec: Number.isFinite(d) && d > 0 && d < 7200 ? d : 0, sources, poster: filmPath(j.poster, ['jpg', 'jpeg', 'webp', 'png']), captions, note: cleanText(isObj(j.notes) ? j.notes.label || j.notes.en : j.notes, 160) } };
}
/** phones and data saver: the lightest file (fewest bytes; the mobile variant). Low tier: the best file up to 720 lines. Otherwise the best file up to 1080 lines. Falls back to whatever exists. */
export function pickSource(sources, { tier = 'medium', mobile = false, saveData = false } = {}) {
  const list = arr(sources).filter((s) => s && s.src); if (!list.length) return null;
  const best = (cap) => { const ok = list.filter((s) => s.height && s.height <= cap).sort((a, b) => b.height - a.height || (b.bytes || 0) - (a.bytes || 0)); return ok[0] || list.slice().sort((a, b) => (a.height || 1e9) - (b.height || 1e9))[0]; };
  if (mobile || saveData) { const known = list.filter((s) => s.bytes > 0).sort((a, b) => a.bytes - b.bytes); return known.length === list.length ? known[0] : best(720); }
  return best(tier === 'low' ? 720 : 1080);
}
/** caption choices in the order the Captions button cycles them: the page language first (the narration is Arabic, so English readers get English captions and Arabic readers Arabic ones), then the other language, then off */
export function captionCycle(captions, lang) {
  const have = arr(captions).map((c) => c.lang), first = lang === 'ar' ? 'ar' : 'en', other = first === 'ar' ? 'en' : 'ar'; return [...[first, other].filter((l) => have.includes(l)), 'off'];
}
export const defaultCaption = (captions, lang) => captionCycle(captions, lang)[0];
export const nextCaption = (captions, lang, cur) => { const c = captionCycle(captions, lang), i = c.indexOf(cur); return c[(i + 1) % c.length]; };
export const fmtTime = (s) => { const t = Math.max(0, Math.floor(Number(s) || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

/** A LIST of films. Accepts both shapes: { films: [ { id, title, sources, poster, captions, real, order, durationSec, burnedSubtitles } | { id, manifest: "/yas-bloom/film/film.json", real, order } ] }
 *  and the older single-film manifest (it becomes one entry, id "journey", real: false).
 *  -> { ok, films: [ { id, order, real, ref (a manifest still to be read) | film (parsed) } ] sorted: real films first, then by order; AI-generated ones last } */
export function parseFilmsManifest(raw) {
  let j = raw; if (typeof raw === 'string') { try { j = JSON.parse(raw); } catch (e) { return { ok: false, films: [], error: 'not-json' }; } }
  if (!isObj(j)) return { ok: false, films: [], error: 'not-object' };
  if (!Array.isArray(j.films)) { const one = parseFilmManifest(j); return one.ok ? { ok: true, error: null, films: [{ id: JOURNEY_ID, order: 99, real: false, film: { ...one.film, real: false } }] } : { ok: false, films: [], error: one.error }; }
  const out = [], seen = new Set();
  for (const f of j.films.slice(0, 12)) {
    if (!isObj(f) || f.enabled === false) continue; const id = str(f.id, '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40); if (!id || seen.has(id)) continue;
    const real = f.real === true, order = Number.isFinite(Number(f.order)) ? Number(f.order) : 50, ref = filmPath(f.manifest, ['json']);
    if (ref) { seen.add(id); out.push({ id, order, real, ref }); continue; }   // (a ref'd manifest's own `mixed` flag is read when it is loaded)
    const one = parseFilmManifest(f); if (!one.ok) continue; seen.add(id); out.push({ id, order, real, film: { ...one.film, real } });
  }
  out.sort((a, b) => (a.real === b.real ? a.order - b.order : a.real ? -1 : 1));
  return out.length ? { ok: true, error: null, films: out } : { ok: false, films: [], error: 'no-films' };
}
/** the label a film must carry: only films that are NOT real footage are marked "AI-generated illustration" */
export const filmLabel = (film) => (film && film.real === true ? null : film && film.mixed === true ? mixedLabel(film.id) : FILM_AI_LABEL);
/** the short label for the strip over a playing film */
export const filmBadge = (film) => (film && film.real === true ? null : film && film.mixed === true ? mixedBadge(film.id) : FILM_AI_LABEL);

// ---------------------------------------------------------------- what the screen shows
/** status: 'idle' (nothing asked yet) | 'loading' (manifest) | 'ready' (poster, paused: a user gesture starts it) | 'playing' | 'paused' | 'ended' | 'retry' (the film exists but playback was interrupted on this device: "Press Play to try again") | 'missing' (NO manifest at all: "Film coming soon") */
export const initFilm = () => ({ status: 'idle', film: null, time: 0, duration: 0, volume: 1, muted: false, caption: 'off', cue: '', src: '' });
export function filmReducer(st, a) {
  switch (a.type) {
    case 'load': return st.status === 'idle' ? { ...st, status: 'loading' } : st;
    case 'manifest': { const r = parseFilmManifest(a.raw); if (!r.ok) return { ...st, status: 'missing', film: null }; const src = pickSource(r.film.sources, a.device || {}); return { ...st, status: 'ready', film: r.film, duration: r.film.durationSec, src: src ? src.src : '', caption: defaultCaption(r.film.captions, a.lang) }; }
    case 'select': { if (!a.film) return { ...initFilm(), status: 'missing', volume: st.volume, muted: st.muted, id: a.id || '' }; const src = pickSource(a.film.sources, a.device || {}); return { ...initFilm(), status: src ? 'ready' : 'missing', film: a.film, id: a.id || '', duration: a.film.durationSec, src: src ? src.src : '', caption: defaultCaption(a.film.captions, a.lang), volume: st.volume, muted: st.muted }; }   // one film of the list is put on the screen (paused)
    case 'missing': return { ...st, status: 'missing', cue: '' };
    case 'fail': return st.film ? { ...st, status: 'retry', cue: '' } : { ...st, status: 'missing', cue: '' };   // a film that LOADED never turns into "coming soon": a failure is a retry
    case 'src': return st.film ? { ...st, src: a.src } : st;                                                       // another resolution of the same film                       // manifest 404 / not JSON / the video element reported an error
    case 'play': return st.film && st.status !== 'missing' ? { ...st, status: 'playing' } : st;
    case 'pause': return st.status === 'playing' ? { ...st, status: 'paused', cue: st.cue } : st;
    case 'ended': return st.film ? { ...st, status: 'ended', cue: '' } : st;
    case 'time': return { ...st, time: Math.max(0, Number(a.time) || 0), duration: a.duration > 0 && Number.isFinite(a.duration) ? a.duration : st.duration };
    case 'volume': return { ...st, volume: Math.max(0, Math.min(1, Number(a.value) || 0)), muted: a.muted === undefined ? st.muted : !!a.muted };
    case 'caption': return { ...st, caption: a.value, cue: a.value === 'off' ? '' : st.cue };
    case 'cue': return st.cue === a.text ? st : { ...st, cue: cleanText(a.text, 220) };
    default: return st;
  }
}
