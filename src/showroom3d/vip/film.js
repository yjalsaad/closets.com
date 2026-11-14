/* FILM mode of the VIP big screen: "THE CLOSETS - THE JOURNEY OF AMBITION" / "الخزائن - حكاية طموح". PURE helpers (no DOM, no three.js, no network): the manifest
 * (/yas-bloom/film/film.json) is parsed and sanitised here, a source is picked for the device, and the small state machine says what the screen shows.
 * The film files are produced separately; until they exist the room shows "Film coming soon" (status 'missing'), so this works before the film lands.
 *
 * manifest: { title: { en, ar }, durationSec, sources: [ { src, width, height, bytes } ], poster, captions: [ { lang, src } ], notes? }
 * Every address must be a same-site path under /yas-bloom/film/ (no external hosts, no schemes): anything else is dropped. */
import { str, arr, isObj } from '../siteBridge';
import { cleanText } from './deckSchema';

export const FILM_DECK_ID = 'film';
export const FILM_MANIFEST_URL = '/yas-bloom/film/film.json';
export const FILM_TITLE = { en: 'The Closets: The Journey of Ambition', ar: 'الخزائن: حكاية طموح' };
export const FILM_ENTRY = { en: 'Watch our story', ar: 'شاهد حكايتنا' };
export const FILM_AI_LABEL = { en: 'AI-generated illustration', ar: 'صور توضيحية مولَّدة بالذكاء الاصطناعي' };
export const FILM_SOON = { en: 'Film coming soon', ar: 'الفيلم قريبًا' };
const FILM_PATH = /^\/yas-bloom\/film\/[A-Za-z0-9._-]+\.(mp4|webm|jpg|jpeg|webp|png|vtt)$/;
const ext = (p) => p.slice(p.lastIndexOf('.') + 1).toLowerCase();
export const filmPath = (v, kinds) => { const s = str(v, '').trim(); return FILM_PATH.test(s) && !s.includes('..') && kinds.includes(ext(s)) ? s : ''; };

/** the film as a one-slide pseudo-deck, so the picker, the wall chips, the keys and the adviser treat it like any other entry */
export const FILM_DECK = { id: FILM_DECK_ID, unit: 'slide', builtin: true, film: true, title: FILM_ENTRY, slides: [{ id: 'film', builtin: 'film', disclaimer: true, title: FILM_TITLE }] };

/** -> { ok, film, error }. film = { title: {en, ar}, durationSec, sources: [{src, width, height, bytes}] (largest first), poster, captions: [{lang, src}], note } */
export function parseFilmManifest(raw) {
  let j = raw; if (typeof raw === 'string') { try { j = JSON.parse(raw); } catch (e) { return { ok: false, film: null, error: 'not-json' }; } }
  if (!isObj(j)) return { ok: false, film: null, error: 'not-object' };
  const sources = arr(j.sources).map((s) => (isObj(s) ? { src: filmPath(s.src, ['mp4', 'webm']), width: Number(s.width) || 0, height: Number(s.height) || 0, bytes: Number(s.bytes) || 0 } : null))
    .filter((s) => s && s.src && s.width >= 0 && s.height >= 0 && Number.isFinite(s.width) && Number.isFinite(s.height)).slice(0, 6).sort((a, b) => b.height - a.height);
  if (!sources.length) return { ok: false, film: null, error: 'no-sources' };
  const t = isObj(j.title) ? j.title : {}, en = cleanText(t.en, 90) || FILM_TITLE.en, ar = cleanText(t.ar, 90) || FILM_TITLE.ar;
  const captions = []; for (const c of arr(j.captions)) { const lang = isObj(c) && (c.lang === 'ar' || c.lang === 'en') ? c.lang : '', src = isObj(c) ? filmPath(c.src, ['vtt']) : ''; if (lang && src && !captions.some((x) => x.lang === lang)) captions.push({ lang, src }); }
  const d = Number(j.durationSec);
  return { ok: true, error: null, film: { title: { en, ar }, durationSec: Number.isFinite(d) && d > 0 && d < 7200 ? d : 0, sources, poster: filmPath(j.poster, ['jpg', 'jpeg', 'webp', 'png']), captions, note: cleanText(isObj(j.notes) ? j.notes.label || j.notes.en : j.notes, 160) } };
}
/** the smaller file (<= 720 lines) on phones and on the low tier; otherwise the best one up to 1080 lines. Falls back to whatever exists. */
export function pickSource(sources, { tier = 'medium', mobile = false, saveData = false } = {}) {
  const list = arr(sources).filter((s) => s && s.src); if (!list.length) return null;
  const cap = mobile || tier === 'low' || saveData ? 720 : 1080, sorted = list.slice().sort((a, b) => b.height - a.height);
  return sorted.find((s) => s.height && s.height <= cap) || sorted[sorted.length - 1];
}
/** caption choices in the order the Captions button cycles them: the page language first (the narration is Arabic, so English readers get English captions and Arabic readers Arabic ones), then the other language, then off */
export function captionCycle(captions, lang) {
  const have = arr(captions).map((c) => c.lang), first = lang === 'ar' ? 'ar' : 'en', other = first === 'ar' ? 'en' : 'ar'; return [...[first, other].filter((l) => have.includes(l)), 'off'];
}
export const defaultCaption = (captions, lang) => captionCycle(captions, lang)[0];
export const nextCaption = (captions, lang, cur) => { const c = captionCycle(captions, lang), i = c.indexOf(cur); return c[(i + 1) % c.length]; };
export const fmtTime = (s) => { const t = Math.max(0, Math.floor(Number(s) || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

// ---------------------------------------------------------------- what the screen shows
/** status: 'idle' (nothing asked yet) | 'loading' (manifest) | 'ready' (poster, paused: a user gesture starts it) | 'playing' | 'paused' | 'ended' | 'missing' (no manifest or no playable file: "Film coming soon") */
export const initFilm = () => ({ status: 'idle', film: null, time: 0, duration: 0, volume: 1, muted: false, caption: 'off', cue: '', src: '' });
export function filmReducer(st, a) {
  switch (a.type) {
    case 'load': return st.status === 'idle' ? { ...st, status: 'loading' } : st;
    case 'manifest': { const r = parseFilmManifest(a.raw); if (!r.ok) return { ...st, status: 'missing', film: null }; const src = pickSource(r.film.sources, a.device || {}); return { ...st, status: 'ready', film: r.film, duration: r.film.durationSec, src: src ? src.src : '', caption: defaultCaption(r.film.captions, a.lang) }; }
    case 'missing': return { ...st, status: 'missing', cue: '' };                       // manifest 404 / not JSON / the video element reported an error
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
