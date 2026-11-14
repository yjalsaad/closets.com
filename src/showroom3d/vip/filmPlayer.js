/* The film player behind the VIP big screen (DOM side of vip/film.js). ONE <video> element, created lazily, preload="none", no src until the visitor presses Play:
 * nothing is downloaded before that. It is never autoplayed and never muted for autoplay: play() is only called from a user gesture, with sound.
 * The same element feeds the wall (THREE.VideoTexture) and the cinema overlay (it is moved into the DOM with native controls). Captions use text tracks:
 * 'hidden' while the wall shows the cue itself, 'showing' in the cinema overlay. A missing manifest / file ends in status 'missing' ("Film coming soon"). */
import { FILM_MANIFEST_URL, initFilm, filmReducer, nextCaption } from './film';

export class FilmPlayer {
  constructor({ onChange = () => {}, fetcher = (typeof fetch === 'function' ? (u) => fetch(u, { credentials: 'same-origin' }) : null), lang = 'en', device = {} } = {}) {
    this.onChange = onChange; this.fetcher = fetcher; this.lang = lang; this.device = device; this.state = initFilm(); this.video = null; this.poster = null; this.cinema = false; this.loading = null;
  }
  dispatch(a) { const n = filmReducer(this.state, a); if (n !== this.state) { this.state = n; this.onChange(n); } }
  setLang(l) { this.lang = l === 'ar' ? 'ar' : 'en'; }
  /** read the manifest once (a small JSON file); the poster image is loaded for the idle screen. No video bytes are requested here. */
  load() {
    if (this.loading) return this.loading; this.dispatch({ type: 'load' });
    if (!this.fetcher) { this.dispatch({ type: 'missing' }); return (this.loading = Promise.resolve(this.state)); }
    this.loading = Promise.resolve().then(() => this.fetcher(FILM_MANIFEST_URL)).then((r) => (r && r.ok ? r.text() : null)).then((txt) => {
      this.dispatch({ type: 'manifest', raw: txt, lang: this.lang, device: this.device });
      const f = this.state.film; if (f && f.poster && typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { this.poster = im; this.onChange(this.state); }; im.onerror = () => {}; im.src = f.poster; }
      return this.state;
    }).catch(() => { this.dispatch({ type: 'missing' }); return this.state; });
    return this.loading;
  }
  /** the element exists only once somebody has asked to play */
  ensureVideo() {
    if (this.video || typeof document === 'undefined' || !this.state.film || !this.state.src) return this.video;
    const v = document.createElement('video'), f = this.state.film; v.preload = 'none'; v.playsInline = true; v.setAttribute('playsinline', ''); v.controls = false; v.muted = false; v.loop = false; if (f.poster) v.poster = f.poster;
    v.addEventListener('timeupdate', () => this.dispatch({ type: 'time', time: v.currentTime, duration: v.duration }));
    v.addEventListener('durationchange', () => this.dispatch({ type: 'time', time: v.currentTime, duration: v.duration }));
    v.addEventListener('play', () => this.dispatch({ type: 'play' })); v.addEventListener('pause', () => { if (!v.ended) this.dispatch({ type: 'pause' }); });
    v.addEventListener('ended', () => this.dispatch({ type: 'ended' })); v.addEventListener('error', () => this.dispatch({ type: 'missing' }));
    v.addEventListener('volumechange', () => this.dispatch({ type: 'volume', value: v.volume, muted: v.muted }));
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
    let p; try { p = v.play(); } catch (e) { this.dispatch({ type: 'missing' }); return false; } if (p && p.catch) p.catch((e) => { if (e && e.name === 'NotAllowedError') this.dispatch({ type: 'pause' }); else if (v.error || (e && e.name === 'NotSupportedError')) this.dispatch({ type: 'missing' }); });
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
  dispose() { const v = this.video; if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } if (v.parentNode) v.parentNode.removeChild(v); } this.video = null; }
}
