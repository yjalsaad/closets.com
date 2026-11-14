import { clamp01, easeOutCubic, easeInOut, stagger, countValue, formatNumber, motionLevel, settleSeconds, SPEEDS, initPlay, slideSeconds, playReducer, playTick } from '../vip/motion';

describe('easing, stagger, count-up', () => {
  test('easings are clamped and monotonic from 0 to 1', () => {
    for (const f of [easeOutCubic, easeInOut]) { expect(f(-1)).toBe(0); expect(f(0)).toBe(0); expect(f(1)).toBe(1); expect(f(2)).toBe(1); let p = -1; for (let i = 0; i <= 20; i++) { const v = f(i / 20); expect(v).toBeGreaterThanOrEqual(p); p = v; } }
  });
  test('stagger: later items start later and everything has settled after delay + n*step + dur', () => {
    expect(stagger(0, 0)).toBe(0); expect(stagger(0.5, 0)).toBeGreaterThan(stagger(0.5, 3)); expect(stagger(0.35 + 5 * 0.16 + 0.45, 5)).toBe(1); expect(stagger(99, 7)).toBe(1);
  });
  test('count-up: starts at 0, ends at the exact supplied value, integers stay integers, decimals keep one place', () => {
    expect(countValue(70000, 0)).toBe(0); expect(countValue(70000, 99)).toBe(70000); expect(Number.isInteger(countValue(200, 0.9))).toBe(true); expect(countValue(200, 0.9)).toBeLessThan(200); expect(countValue(2.5, 99)).toBe(2.5);
    expect(countValue(500, 0.3)).toBe(0);
  });
  test('formatNumber groups thousands with Latin digits in both languages', () => { expect(formatNumber(70000, 'en')).toBe('70,000'); expect(formatNumber(70000, 'ar')).toBe('70,000'); expect(formatNumber(200)).toBe('200'); });
});

describe('motion level: tiers and reduced motion', () => {
  test('reduced motion turns everything off (instant swaps, final values, no drift, no redraw loop)', () => {
    for (const t of ['low', 'medium', 'high']) { const l = motionLevel(t, true); expect(l).toEqual({ on: false, transition: 0, stagger: false, countUp: false, kenBurns: false, hz: 0 }); expect(settleSeconds(l, { bullets: [1, 2], blocks: [{ type: 'stat' }] })).toBe(0); }
  });
  test('low is the cheapest (short transition, no stagger, no Ken Burns, lowest redraw rate); only high drifts photos', () => {
    const lo = motionLevel('low', false), me = motionLevel('medium', false), hi = motionLevel('high', false);
    expect(lo.kenBurns).toBe(false); expect(me.kenBurns).toBe(false); expect(hi.kenBurns).toBe(true); expect(lo.stagger).toBe(false); expect(hi.stagger).toBe(true);
    expect(lo.transition).toBeLessThan(me.transition); expect(me.transition).toBeLessThan(hi.transition); expect(lo.hz).toBeLessThan(me.hz); expect(me.hz).toBeLessThan(hi.hz); expect(motionLevel('nonsense', false)).toEqual(lo);
  });
  test('settleSeconds covers the stagger and the count-up', () => {
    const hi = motionLevel('high', false); expect(settleSeconds(hi, { bullets: [1, 2, 3, 4, 5, 6], blocks: [] })).toBeCloseTo(0.35 + 6 * 0.16 + 0.45, 5); expect(settleSeconds(hi, { bullets: [], blocks: [{ type: 'stat' }] })).toBeGreaterThanOrEqual(1.8);
  });
});

describe('auto-play state machine', () => {
  const slide = { bullets: [1, 2, 3], blocks: [] };
  test('play / pause / toggle / speed / loop reducer; unknown input is ignored', () => {
    let s = initPlay(); expect(s).toEqual({ playing: false, speed: 1, loop: true, elapsed: 0 });
    s = playReducer(s, { type: 'toggle' }); expect(s.playing).toBe(true); s = playReducer(s, { type: 'toggle' }); expect(s.playing).toBe(false);
    s = playReducer(s, { type: 'speed', value: 2 }); expect(s.speed).toBe(2); expect(playReducer(s, { type: 'speed', value: 3 })).toBe(s);
    const seen = []; let c = initPlay(); for (let i = 0; i < SPEEDS.length; i++) { c = playReducer(c, { type: 'cycleSpeed' }); seen.push(c.speed); } expect(seen).toEqual([1.5, 2, 0.5, 1]);
    expect(playReducer(initPlay(), { type: 'loop' }).loop).toBe(false); expect(playReducer(initPlay(), { type: 'loop', value: true })).toEqual(initPlay()); expect(playReducer(initPlay(), { type: 'zzz' })).toEqual(initPlay());
  });
  test('slide duration: hero slides are shorter, text-heavy slides longer (capped), speed divides it', () => {
    expect(slideSeconds({ layout: 'hero', bullets: [] })).toBe(6); expect(slideSeconds(slide)).toBeCloseTo(6 + 3 * 1.4, 5); expect(slideSeconds({ bullets: new Array(20).fill(0), blocks: [1] })).toBe(18); expect(slideSeconds(slide, 2)).toBeCloseTo(slideSeconds(slide, 1) / 2, 5); expect(slideSeconds(slide, 7)).toBe(slideSeconds(slide, 1));
  });
  test('tick: nothing while paused; advances after the duration; clamps huge dt; reports progress', () => {
    const paused = initPlay(); expect(playTick(paused, 5, 0, 5, 8)).toMatchObject({ idx: 0, ended: false, progress: -1 });
    let s = playReducer(initPlay(), { type: 'play' }); let r = { st: s, idx: 0 }; for (let i = 0; i < 4; i++) r = playTick(r.st, 1, r.idx, 5, 8); expect(r.idx).toBe(0); expect(r.progress).toBeCloseTo(0.5, 5);
    for (let i = 0; i < 4; i++) r = playTick(r.st, 1, r.idx, 5, 8); expect(r.idx).toBe(1); expect(r.progress).toBe(0); expect(r.st.elapsed).toBe(0);
    expect(playTick(s, 1000, 0, 5, 8).st.elapsed).toBe(1);
    const big = playTick(s, 1000, 0, 5, 8); expect(big.idx).toBe(0);   // a stalled frame cannot skip a whole deck
  });
  test('end of deck: loops to the first slide when loop is on, stops (ended) when it is off', () => {
    let s = playReducer(initPlay(), { type: 'play' }); const at = playTick({ ...s, elapsed: 7.9 }, 0.5, 4, 5, 8); expect(at).toMatchObject({ idx: 0, ended: false }); expect(at.st.playing).toBe(true);
    const off = playTick({ ...playReducer(s, { type: 'loop', value: false }), elapsed: 7.9 }, 0.5, 4, 5, 8); expect(off).toMatchObject({ idx: 4, ended: true, progress: -1 }); expect(off.st.playing).toBe(false);
  });
  test('a one-slide deck loops onto itself; bad dt / duration never advance', () => {
    const s = { ...playReducer(initPlay(), { type: 'play' }), elapsed: 7.9 }; expect(playTick(s, 0.5, 0, 1, 8).idx).toBe(0); expect(playTick(s, NaN, 2, 5, 8).idx).toBe(2); expect(playTick(s, 1, 2, 5, 0).idx).toBe(2); expect(playTick(s, -1, 2, 5, 8).idx).toBe(2);
  });
});
