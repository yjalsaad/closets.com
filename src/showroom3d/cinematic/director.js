/* The GSAP side of the cinematic intro. One paused master timeline: a clock tween drives the camera (sampled from timeline.js),
 * real GSAP tweens drive the door leaves, interior light level and the cream veil. Captions / shot ids are pure functions of the clock,
 * so seeking (QA screenshots, skip, replay) is always consistent. */
import gsap from 'gsap';
import { DURATION, EVENTS, sampleCamera, stateAt, FINAL_STATE } from './timeline';

export function createDirector({ onUpdate, onComplete } = {}) {
  const v = { t: 0, doorOpen: 0, led: EVENTS.led.from, veil: 1, logo: 0 };
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onComplete: () => onComplete && onComplete() });
  const emit = () => onUpdate && onUpdate(snapshot());
  const snapshot = () => { const st = stateAt(v.t); const cam = sampleCamera(v.t); return { ...st, doorOpen: v.doorOpen, led: v.led, veil: v.veil, logo: v.logo, cam }; };

  const E = EVENTS;
  tl.to(v, { t: DURATION, duration: DURATION, onUpdate: emit }, 0);
  tl.addLabel('logo', 0).addLabel('exterior', 3.4).addLabel('approach', 9).addLabel('doors', E.doors.start).addLabel('hall', 17.2);
  // logo card in / out, cream veil lifting off the exterior
  const FT = (prop, from, to, dur, ease, at) => tl.fromTo(v, { [prop]: from }, { [prop]: to, duration: dur, ease, immediateRender: false }, at);
  FT('logo', 0, 1, E.logoCard.in[1] - E.logoCard.in[0], 'sine.out', E.logoCard.in[0]);
  FT('logo', 1, 0, E.logoCard.out[1] - E.logoCard.out[0], 'sine.in', E.logoCard.out[0]);
  FT('veil', 1, 0, E.veil.end - E.veil.start, 'sine.inOut', E.veil.start);
  // doors slide open as the camera arrives; the interior lights rise with them
  FT('doorOpen', 0, 1, E.doors.end - E.doors.start, 'power2.inOut', E.doors.start);
  FT('led', E.led.from, E.led.to, E.led.end - E.led.start, 'sine.inOut', E.led.start);

  let skipTween = null;
  const api = {
    duration: DURATION,
    get time() { return tl.time(); },
    play(from = 0) { api.reset(); tl.play(from); },
    pause() { tl.pause(); },
    resume() { tl.resume(); },
    /** jump to a time on the master clock (QA, deterministic screenshots) and render that exact state */
    seek(t) { tl.pause(); tl.time(Math.max(0, Math.min(DURATION, t)), false); emit(); },
    /** Skip intro: a quick cream wash, jump to the end state, wash away. Never a hard cut. */
    skip(done) {
      if (skipTween) return;
      tl.pause();
      const w = { k: v.veil };
      skipTween = gsap.to(w, { k: 1, duration: 0.38, ease: 'power1.in', onUpdate: () => { v.veil = w.k; emit(); }, onComplete: () => {
        tl.time(DURATION, true); Object.assign(v, { t: DURATION, doorOpen: 1, led: EVENTS.led.to, logo: 0, veil: 1 });
        const w2 = { k: 1 };
        skipTween = gsap.to(w2, { k: 0, duration: 0.55, ease: 'power1.out', onUpdate: () => { v.veil = w2.k; emit(); }, onComplete: () => { v.veil = 0; skipTween = null; emit(); if (done) done(); } });
      } });
    },
    /** reduced motion / replay-less path: jump straight to the finished state without any animation */
    finish() { tl.pause(); tl.time(DURATION, true); Object.assign(v, { t: DURATION, doorOpen: 1, led: EVENTS.led.to, logo: 0, veil: 0 }); emit(); },
    reset() { if (skipTween) { skipTween.kill(); skipTween = null; } tl.pause(0); Object.assign(v, { t: 0, doorOpen: 0, led: EVENTS.led.from, veil: 1, logo: 0 }); tl.time(0, true); emit(); },
    state: snapshot,
    kill() { if (skipTween) skipTween.kill(); tl.kill(); },
    timeline: tl,
  };
  return api;
}

export { FINAL_STATE };
