/* Presentation MOTION: pure helpers shared by the wall screen (canvas) and the panel (DOM): easing, stagger, count-up, the quality-tier / reduced-motion level,
 * and the auto-play state machine (play / pause, speed, loop). No DOM, no three.js, no timers: the caller feeds `dt`. */
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOut = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
/** progress 0..1 of item i of a staggered reveal at time t (seconds): starts at `delay`, each item `step` later, takes `dur` */
export const stagger = (t, i, { delay = 0.35, step = 0.16, dur = 0.45 } = {}) => easeOutCubic((t - delay - i * step) / dur);
/** count-up: the displayed value at time t (starts after `delay`, takes `dur`); integers stay integers */
export const countValue = (value, t, { delay = 0.3, dur = 1.4 } = {}) => { const v = value * easeOutCubic((t - delay) / dur); return Number.isInteger(value) ? Math.round(v) : Math.round(v * 10) / 10; };
export const formatNumber = (n, lang = 'en') => { try { return new Intl.NumberFormat(lang === 'ar' ? 'en' : 'en').format(n); } catch (e) { return String(n); } };   // Latin digits in both languages (the profile figures are Latin)

/** what motion a tier may spend. `reduced` (prefers-reduced-motion) switches everything off: instant swaps, final values, no drift. */
export function motionLevel(tierId, reduced) {
  if (reduced) return { on: false, transition: 0, stagger: false, countUp: false, kenBurns: false, hz: 0 };
  if (tierId === 'high') return { on: true, transition: 0.8, stagger: true, countUp: true, kenBurns: true, hz: 12 };
  if (tierId === 'medium') return { on: true, transition: 0.6, stagger: true, countUp: true, kenBurns: false, hz: 8 };
  return { on: true, transition: 0.35, stagger: false, countUp: true, kenBurns: false, hz: 6 };
}
/** seconds the entrance animations of a slide need before it is fully drawn (the wall redraws at `hz` until then) */
export const settleSeconds = (level, slide) => {
  if (!level.on) return 0; let s = level.transition; const b = slide && slide.bullets ? slide.bullets.length : 0, st = slide && (slide.blocks || []).some((x) => x.type === 'stat' || x.type === 'bar');
  if (level.stagger) s = Math.max(s, 0.35 + b * 0.16 + 0.45); if (st && level.countUp) s = Math.max(s, 1.8); return s;
};

// ---------------------------------------------------------------- auto-play
export const SPEEDS = [0.5, 1, 1.5, 2];
export const initPlay = () => ({ playing: false, speed: 1, loop: true, elapsed: 0 });
/** how long a slide stays up at speed 1: text-heavy slides stay longer; hero slides are shorter. At most 18 s. */
export function slideSeconds(slide, speed = 1) {
  const b = slide && slide.bullets ? slide.bullets.length : 0, blocks = slide && slide.blocks ? slide.blocks.length : 0;
  const base = slide && slide.layout === 'hero' ? 6 : Math.min(18, 6 + b * 1.4 + (blocks ? 2 : 0)); return base / (SPEEDS.includes(speed) ? speed : 1);
}
/** actions: {type:'play'|'pause'|'toggle'|'speed', value?}|{type:'cycleSpeed'}|{type:'loop', value?}|{type:'reset'} */
export function playReducer(st, a) {
  switch (a.type) {
    case 'play': return st.playing ? st : { ...st, playing: true, elapsed: 0 };
    case 'pause': return st.playing ? { ...st, playing: false } : st;
    case 'toggle': return st.playing ? { ...st, playing: false } : { ...st, playing: true, elapsed: 0 };
    case 'speed': return SPEEDS.includes(a.value) ? { ...st, speed: a.value } : st;
    case 'cycleSpeed': return { ...st, speed: SPEEDS[(SPEEDS.indexOf(st.speed) + 1) % SPEEDS.length] };
    case 'loop': return { ...st, loop: typeof a.value === 'boolean' ? a.value : !st.loop };
    case 'reset': return st.elapsed ? { ...st, elapsed: 0 } : st;
    default: return st;
  }
}
/** advance `dt` seconds on slide `idx` of `n`; `dur` = slideSeconds(slide, speed). Returns { st, idx, ended, progress } (ended: the last slide finished and loop is off, so playback stopped) */
export function playTick(st, dt, idx, n, dur) {
  if (!st.playing || !(dt > 0) || !(dur > 0)) return { st, idx, ended: false, progress: st.playing ? clamp01(st.elapsed / (dur || 1)) : -1 };
  let elapsed = st.elapsed + Math.min(dt, 1); if (elapsed < dur) return { st: { ...st, elapsed }, idx, ended: false, progress: elapsed / dur };
  if (idx < n - 1) return { st: { ...st, elapsed: 0 }, idx: idx + 1, ended: false, progress: 0 };
  if (st.loop) return { st: { ...st, elapsed: 0 }, idx: 0, ended: false, progress: 0 };
  return { st: { ...st, playing: false, elapsed: 0 }, idx, ended: true, progress: -1 };
}
