/* The film player behind the VIP big screen (DOM side of vip/film.js). It knows a small LIBRARY of films (films.json: the owner's real films; plus the AI documentary's own film.json when it exists)
 * and shows ONE at a time. ONE <video> element, created lazily, preload="none", no src until the visitor presses Play: nothing is downloaded before that.
 * It is never autoplayed and never muted for autoplay: play() is only called from a user gesture, with sound.
 * The same element feeds the wall (THREE.VideoTexture) and the cinema overlay (native controls). Captions use text tracks: 'hidden' while the wall shows the cue itself,
 * 'showing' in the cinema overlay. A missing manifest / film / file ends in status 'missing' ("Film coming soon"). */
import { FILM_MANIFEST_URL, FILMS_MANIFEST_URL, JOURNEY_ID, initFilm, filmReducer, nextCaption, parseFilmsManifest, parseFilmManifest } from './film';

export class FilmPlayer {
  constructor({ onChange = () => {}, fetcher = (typeof fetch === 'function' ? (u) => fetch(u, { credentials: 'same-origin' }) : null), lang = 'en', device = {} } = {}) {
    this.onChange = onChange; this.fetcher = fetcher; this.lang = lang; this.device = device; this.state = initFilm(); this.video = null; this.poster = null; this.posters = new Map(); this.cinema = false; this.loading = null;
    this.library = new Map(); this.libraryReady = false; this.wanted = null;
  }
  dispatch(a) { const n = filmReducer(this.state, a); if (n !== this.state) { this.state = n; this.onChange(n); } }
  setLang(l) { this.lang = l === 'ar' ? 'ar' : 'en'; }
  getText(url) { return Promise.resolve().then(() => this.fetcher(url)).then((r) => (r && r.ok ? r.text() : null)).catch(() => null); }
  /** read the manifests once (small JSON files): films.json (the list) and, for an entry that points at it or when there is no list, the single-film film.json. No video bytes are requested here. */
  load() {
    if (this.loading) return this.loading; this.dispatch({ type: 'load' });
    if (!this.fetcher) { this.libraryReady = true; this.applyWanted(); return (this.loading = Promise.resolve(this.state)); }
    this.loading = this.getText(FILMS_MANIFEST_URL).then(async (txt) => {
      const list = txt ? parseFilmsManifest(txt) : { ok: false, films: [] }; let needLegacy = !list.ok || !list.films.some((f) => f.id === JOURNEY_ID);
      for (const f of list.films) { if (f.film) this.library.set(f.id, f.film); else if (f.ref) { const t = await this.getText(f.ref), one = t ? parseFilmManifest(t) : { ok: false }; if (one.ok) this.library.set(f.id, { ...one.film, real: f.real }); if (f.id === JOURNEY_ID) needLegacy = false; } }
      if (needLegacy) { const t = await this.getText(FILM_MANIFEST_URL), one = t ? parseFilmManifest(t) : { ok: false }; if (one.ok) this.library.set(JOURNEY_ID, { ...one.film, real: false }); }
      this.libraryReady = true; this.applyWanted(); return this.state;
    }).catch(() => { this.libraryReady = true; this.applyWanted(); return this.state; });
    return this.loading;
  }
  /** put film `id` on the screen (paused, poster). Unknown id / no manifest -> 'missing'. Switching film stops and discards the previous video. */
  select(id) { this.wanted = id || JOURNEY_ID; if (this.libraryReady) this.applyWanted(); else this.load(); }
  applyWanted() {
    const id = this.wanted || JOURNEY_ID; if (this.state.id === id && this.state.status !== 'loading' && this.state.status !== 'idle') return;
    this.dropVideo(); const film = this.library.get(id) || null; this.poster = this.posters.get(id) || null; this.dispatch({ type: 'select', id, film, lang: this.lang, device: this.device });
    if (film && film.poster && !this.posters.has(id) && typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { this.posters.set(id, im); if (this.state.id === id) { this.poster = im; this.onChange(this.state); } }; im.onerror = () => {}; im.src = film.poster; }
  }
  dropVideo() { const v = this.video; if (!v) return; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } if (v.parentNode) v.parentNode.removeChild(v); this.video = null; }
  /** the element exists only once somebody has asked to play */
  ensureVideo() {
    if (this.video || typeof document === 'undefined' || !this.state.film || !this.state.src) return this.video;
    const v = document.createElement('video'), f = this.state.film; v.preload = 'none'; v.playsInline = true; v.setAttribute('playsinline', ''); v.controls = this.cinema; v.muted = this.state.muted; v.volume = this.state.volume; v.loop = false; if (f.poster) v.poster = f.poster;
    const mine = (fn) => (...a) => { if (this.video === v) fn(...a); };
    v.addEventListener('timeupdate', mine(() => this.dispatch({ type: 'time', time: v.currentTime, duration: v.duration })));
    v.addEventListener('durationchange', mine(() => this.dispatch({ type: 'time', time: v.currentTime, duration: v.duration })));
    v.addEventListener('play', mine(() => this.dispatch({ type: 'play' }))); v.addEventListener('pause', mine(() => { if (!v.ended) this.dispatch({ type: 'pause' }); }));
    v.addEventListener('ended', mine(() => this.dispatch({ type: 'ended' }))); v.addEventListener('error', mine(() => this.dispatch({ type: 'missing' })));
    v.addEventListener('volumechange', mine(() => this.dispatch({ type: 'volume', value: v.volume, muted: v.muted })));
    v.src = this.state.src;
    for (const c of f.captions) { const t = document.createElement('track'); t.kind = 'subtitles'; t.srclang = c.lang; t.label = c.lang === 'ar' ? 'العربية' : 'English'; t.src = c.src; v.appendChild(t); }
    this.video = v; this.applyCaptions(); return v;
  }
  applyCaptions() {
    const v = this.video; if (!v || !v.textTracks) return; const want = this.state.caption;
    for (let i = 0; i < v.textTracks.length; i++) { const tt = v.textTracks[i], on = tt.language === want; tt.mode = on ? (this.cinema ? 'showing' : 'hidden') : 'disabled'; tt.oncuechange = on ? () => { const c = tt.activeCues && tt.activeCues[0]; this.dispatch({ type: 'cue', text: c ? String(c.text || '').replace(/<[^>]+>/g, '') : '' }); } : null; }
    if (want === 'off') this.dispatch({ type: 'cue', text: '' });
  }
  /** MUST be called from a user gesture (a click / key press): starts with sound */
  play() {
    if (this.state.status === 'missing' || !this.state.film) return false; const v = this.ensureVideo(); if (!v) { this.dispatch({ type: 'missing' }); return false; }
    if (this.state.status === 'ended') { try { v.currentTime = 0; } catch (e) { /* ignore */ } }
    let p; try { p = v.play(); } catch (e) { this.dispatch({ type: 'missing' }); return false; } if (p && p.catch) p.catch((e) => { if (this.video !== v) return; if (e && e.name === 'NotAllowedError') this.dispatch({ type: 'pause' }); else if (v.error || (e && e.name === 'NotSupportedError')) this.dispatch({ type: 'missing' }); });
    return true;
  }
  pause() { const v = this.video; if (v && !v.paused) { try { v.pause(); } catch (e) { /* ignore */ } } }
  toggle() { if (this.state.status === 'playing') { this.pause(); return false; } return this.play(); }
  seek(t) { const v = this.video; if (!v) return; const d = v.duration || this.state.duration || 0; try { v.currentTime = Math.max(0, Math.min(d || 0, Number(t) || 0)); } catch (e) { /* ignore */ } this.dispatch({ type: 'time', time: v.currentTime, duration: v.duration }); }
  seekBy(dt) { const v = this.video; if (v) this.seek(v.currentTime + dt); }
  setVolume(x) { const val = Math.max(0, Math.min(1, Number(x) || 0)), v = this.video; if (v) { v.volume = val; v.muted = val === 0; } else this.dispatch({ type: 'volume', value: val, muted: val === 0 }); }
  toggleMute() { const v = this.video; if (v) v.muted = !v.muted; else this.dispatch({ type: 'volume', value: this.state.volume, muted: !this.state.muted }); }
  cycleCaptions() { this.dispatch({ type: 'caption', value: nextCaption(this.state.film ? this.state.film.captions : [], this.lang, this.state.caption) }); this.applyCaptions(); }
  /** cinema overlay on / off: native controls and native captions while the element sits in the DOM */
  setCinema(on) { this.cinema = !!on; const v = this.video; if (v) v.controls = !!on; this.applyCaptions(); }
  dispose() { this.dropVideo(); }
}
