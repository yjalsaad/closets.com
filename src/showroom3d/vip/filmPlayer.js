/* The film player behind the VIP big screen (DOM side of vip/film.js). It knows a small LIBRARY of films (films.json: the owner's real films; plus the AI documentary's own film.json when it exists)
 * and shows ONE at a time. ONE <video> element, created lazily when the visitor presses Play. The films are fetched in the background only once the visitor is inside the VIP room (vip/filmPreload.js) and then play from memory; Play never waits for that: an unfinished film streams.
 * It is never autoplayed and never muted for autoplay: play() is only called from a user gesture, with sound.
 * The same element feeds the wall (THREE.VideoTexture) and the cinema overlay (native controls). Captions use text tracks: 'hidden' while the wall shows the cue itself,
 * 'showing' in the cinema overlay. A missing manifest / film / file ends in status 'missing' ("Film coming soon"). */
import { loadImg } from '../preload/assetStore';
import { JOURNEY_ACTIVE, chooseJourney, setActiveJourney, FILM_MANIFEST_URL, FILMS_MANIFEST_URL, JOURNEY_ID, pickSource, initFilm, filmReducer, nextCaption, defaultCaption, parseFilmsManifest, parseFilmManifest } from './film';

export class FilmPlayer {
  constructor({ choiceLoader = null, search = null, onChange = () => {}, fetcher = (typeof fetch === 'function' ? (u) => fetch(u, { credentials: 'same-origin' }) : null), lang = 'en', device = {}, preloader = null } = {}) {
    this.onChange = onChange; this.fetcher = fetcher; this.lang = lang; this.device = device; this.state = initFilm(); this.video = null; this.poster = null; this.posters = new Map(); this.cinema = false; this.loading = null;
    this.choiceLoader = choiceLoader; this.choice = null; this.search = search; this.library = new Map(); this.libraryReady = false; this.wanted = null; this.preloader = preloader; this.blobSrc = '';
    if (preloader) preloader.onChange = () => this.onChange(this.state);
  }
  dispatch(a) { const n = filmReducer(this.state, a); if (n !== this.state) { this.state = n; this.onChange(n); } }
  /** the page language changed: captions follow it (English UI -> English captions, Arabic -> Arabic) unless the visitor picked a caption language / off themselves */
  setLang(l) { this.lang = l === 'ar' ? 'ar' : 'en'; const f = this.state.film; if (f && !this.userCaption && f.captions.length) { this.dispatch({ type: 'caption', value: defaultCaption(f.captions, this.lang) }); this.applyCaptions(); } }
  /** an explicit choice ('en' | 'ar' | 'off'); only languages the film has are accepted */
  setCaption(v) { const f = this.state.film, ok = v === 'off' || (f && f.captions.some((c) => c.lang === v)); if (!ok) return false; this.userCaption = true; this.dispatch({ type: 'caption', value: v }); this.applyCaptions(); return true; }
  /** the CC button: off <-> the page-language captions (or the last language chosen) */
  toggleCaptions() { const f = this.state.film; if (!f || !f.captions.length) return false; if (this.state.caption !== 'off') { this.lastCaption = this.state.caption; return this.setCaption('off'); } return this.setCaption(this.lastCaption && f.captions.some((c) => c.lang === this.lastCaption) ? this.lastCaption : defaultCaption(f.captions, this.lang)); }
  getText(url) { return Promise.resolve().then(() => this.fetcher(url)).then((r) => (r && r.ok ? r.text() : null)).catch(() => null); }
  /** the ?film=v2|v3 test override (URL), read when needed */
  override() { let q = this.search; if (q === null) { try { q = typeof window !== 'undefined' ? window.location.search : ''; } catch (e) { q = ''; } } try { return new URLSearchParams(q || '').get('film') || ''; } catch (e) { return ''; } }
  /** the film id the alias JOURNEY_ACTIVE stands for: the owner's choice (website_content `bloom.film.active`), a ?film= override first, falling back to v3 then v2; '' while nothing is available */
  activeFilmId() { return chooseJourney({ want: this.choice, override: this.override(), available: [...this.library.keys()] }); }
  /** a slide / agenda / plan id -> the real film id (only the alias is mapped) */
  resolve(id) { return id === JOURNEY_ACTIVE ? (this.activeFilmId() || id) : id; }
  /** read the manifests once (small JSON files): films.json (the list) and, for an entry that points at it or when there is no list, the single-film film.json. No video bytes are requested here. */
  load() {
    if (this.loading) return this.loading; this.dispatch({ type: 'load' });
    if (!this.fetcher) { this.libraryReady = true; this.applyWanted(); return (this.loading = Promise.resolve(this.state)); }
    this.loading = this.getText(FILMS_MANIFEST_URL).then(async (txt) => {
      const list = txt ? parseFilmsManifest(txt) : { ok: false, films: [] }; let needLegacy = !list.ok || !list.films.some((f) => f.id === JOURNEY_ID);
      for (const f of list.films) { if (f.film) this.library.set(f.id, { ...f.film, id: f.id }); else if (f.ref) { const t = await this.getText(f.ref), one = t ? parseFilmManifest(t) : { ok: false }; if (one.ok) this.library.set(f.id, { ...one.film, real: f.real, id: f.id });  /* real stays the list's word; `mixed` comes from the film's own manifest */ if (f.id === JOURNEY_ID) needLegacy = false; } }
      if (needLegacy) { const t = await this.getText(FILM_MANIFEST_URL), one = t ? parseFilmManifest(t) : { ok: false }; if (one.ok) this.library.set(JOURNEY_ID, { ...one.film, real: false }); }
      await this.readChoice(); this.libraryReady = true; this.applyWanted(); return this.state;
    }).catch(() => { this.libraryReady = true; this.applyWanted(); return this.state; });
    return this.loading;
  }
  /** the owner's switch is read ONCE (a read-only GET through the injected loader); a failure or a slow answer (2.5 s) keeps the default */
  async readChoice() { if (!this.choiceLoader) { setActiveJourney(this.activeFilmId()); return; } try { this.choice = await Promise.race([Promise.resolve().then(() => this.choiceLoader()), new Promise((r) => setTimeout(() => r(null), 2500))]); } catch (e) { this.choice = null; } setActiveJourney(this.activeFilmId()); }
  /** put film `id` on the screen (paused, poster). Unknown id / no manifest -> 'missing'. Switching film stops and discards the previous video. */
  select(id) { this.wanted = id || JOURNEY_ID; if (this.libraryReady) this.applyWanted(); else this.load(); }
  applyWanted() {
    const id = this.resolve(this.wanted || JOURNEY_ID); if (this.state.id === id && this.state.status !== 'loading' && this.state.status !== 'idle') return;
    this.dropVideo(); const film = this.library.get(id) || null; this.prioritise(film); this.poster = this.posters.get(id) || null; this.dispatch({ type: 'select', id, film, lang: this.lang, device: this.device });
    if (film && film.poster && !this.posters.has(id) && typeof Image !== 'undefined') { loadImg(film.poster, (im) => { this.posters.set(id, im); if (this.state.id === id) { this.poster = im; this.onChange(this.state); } }, () => {}); }
  }
  /** the file this film plays on this device */
  srcOf(film) { const src = film && pickSource(film.sources, this.device); return src ? src.src : ''; }
  /** the films of the meeting, in agenda order, go to the pre-downloader (it only runs once start() is called: from inside the VIP room) */
  prefetch(ids) {
    const P = this.preloader; if (!P) return; const items = []; for (const raw of ids) { const id = this.resolve(raw), f = this.library.get(id), src = f && pickSource(f.sources, this.device); if (src) items.push({ id, src: src.src, bytes: src.bytes }); }
    P.setPlan(items); P.start();
  }
  prioritise(film) { const P = this.preloader, src = this.srcOf(film); if (P && src) P.prioritise(src); }
  /** { state: 'off' | 'preparing' | 'ready', pct } for film `id` (default: the one on the screen) */
  prepOf(id) { const P = this.preloader; if (!P) return { state: 'off', pct: 0 }; const src = id ? this.srcOf(this.library.get(this.resolve(id))) : this.state.src; return src ? P.view(src) : { state: 'off', pct: 0 }; }
  dropVideo() { const v = this.video; if (!v) return; if (this.preloader && this.blobSrc) { this.preloader.unpin(this.blobSrc); this.preloader.release(this.blobSrc); } this.blobSrc = ''; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } if (v.parentNode) v.parentNode.removeChild(v); this.video = null; }
  /** the element exists only once somebody has asked to play */
  ensureVideo() {
    if (this.video || typeof document === 'undefined' || !this.state.film || !this.state.src) return this.video;
    const v = document.createElement('video'), f = this.state.film; v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', ''); v.controls = this.cinema; v.muted = this.state.muted; v.volume = this.state.volume; v.loop = false; if (f.poster) v.poster = f.poster;
    const mine = (fn) => (...a) => { if (this.video === v) fn(...a); };
    v.addEventListener('timeupdate', mine(() => this.dispatch({ type: 'time', time: v.currentTime, duration: v.duration })));
    v.addEventListener('durationchange', mine(() => this.dispatch({ type: 'time', time: v.currentTime, duration: v.duration })));
    v.addEventListener('play', mine(() => this.dispatch({ type: 'play' }))); v.addEventListener('pause', mine(() => { if (!v.ended) this.dispatch({ type: 'pause' }); }));
    v.addEventListener('ended', mine(() => this.dispatch({ type: 'ended' }))); v.addEventListener('error', mine(() => this.dispatch({ type: 'missing' })));
    v.addEventListener('volumechange', mine(() => this.dispatch({ type: 'volume', value: v.volume, muted: v.muted })));
    const P = this.preloader, local = P ? P.urlFor(this.state.src) : '';   // a finished download plays from memory (no network); otherwise it streams from the site
    if (local) { P.pin(this.state.src); this.blobSrc = this.state.src; } else if (P) P.skip(this.state.src);
    v.src = local || this.state.src;
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
  cycleCaptions() { this.userCaption = true; this.dispatch({ type: 'caption', value: nextCaption(this.state.film ? this.state.film.captions : [], this.lang, this.state.caption) }); this.applyCaptions(); }
  /** cinema overlay on / off: native controls and native captions while the element sits in the DOM */
  setCinema(on) { this.cinema = !!on; const v = this.video; if (v) v.controls = !!on; this.applyCaptions(); }
  dispose() { this.dropVideo(); if (this.preloader) this.preloader.dispose(); }
}
