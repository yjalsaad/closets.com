// src/motion.js — Apple-grade motion primitives. Zero dependencies.
//
// WHY THIS FILE EXISTS
// --------------------
// The kit's dialogs and sheets used CSS transitions with fixed durations. A
// fixed-duration animation cannot be interrupted, cannot inherit the speed of
// the gesture that started it, and cannot be grabbed and reversed mid-flight.
// That is the difference between an interface that feels "fine" and one that
// feels like an extension of the person using it.
//
// From Apple's *Designing Fluid Interfaces* (WWDC 2018), the through-line is:
//   motion starts from the CURRENT on-screen value, inherits the user's
//   VELOCITY, projects MOMENTUM forward, and can be redirected at any instant.
//
// We deliberately do NOT pull in Motion/Framer (≈30KB and a build change) for
// what is ~120 lines of physics. Everything below animates only `transform`
// and `opacity` — the two compositor-friendly properties — and is driven by
// requestAnimationFrame, the web's display-synced clock.

/* ── Spring parameters ─────────────────────────────────────────────────────
   Apple replaced the physics triplet (mass/stiffness/damping) with two
   designer-facing numbers, and we use the same vocabulary:

     damping  — overshoot. 1.0 = critically damped (no bounce). <1 bounces.
     response — how quickly it reaches the target, in SECONDS.
                This is NOT a duration: a spring has no fixed end time,
                its settle emerges from the parameters.

   Defaults below are the values Apple actually ships. Bounce is reserved for
   motion that FOLLOWED A GESTURE carrying momentum — overshoot on a menu that
   merely appeared feels wrong; overshoot on a sheet you flicked feels right. */
export const SPRING = {
  ui:       { damping: 1.0, response: 0.35 }, // default: menus, modals, reposition
  sheet:    { damping: 0.8, response: 0.30 }, // drawers / bottom sheets
  momentum: { damping: 0.8, response: 0.40 }, // after a flick or throw
  snappy:   { damping: 1.0, response: 0.22 }, // small controls, toggles
};

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
}

/**
 * Critically-damped-capable spring integrator.
 *
 * Returns a handle:
 *   .retarget(to, opts)  — change destination WITHOUT losing current velocity.
 *                          This is what makes motion interruptible: grabbing a
 *                          closing sheet and pushing it back must not restart
 *                          from zero, or you get a visible "brick wall".
 *   .stop()              — halt, leaving the value where it is.
 *   .value / .velocity   — live presentation values (read these on interrupt).
 *
 * Honours prefers-reduced-motion by snapping to the target in one frame — a
 * gentler equivalent, not a broken one: onFrame still fires, onDone still runs.
 */
export function spring(opts) {
  const o = opts || {};
  let value = o.from || 0;
  let velocity = o.velocity || 0;
  let to = o.to || 0;
  let { damping, response } = { ...SPRING.ui, ...(o.spring || {}) };
  const onFrame = o.onFrame || (() => {});
  const onDone = o.onDone;
  let raf = null, last = null, done = false;

  if (prefersReducedMotion()) {
    value = to; velocity = 0;
    onFrame(value, 0);
    if (onDone) onDone();
    return { retarget() {}, stop() {}, get value() { return value; }, get velocity() { return 0; } };
  }

  // Convert (damping ratio ζ, response) → (stiffness k, damping c) for a unit mass.
  const recompute = () => {
    const w0 = (2 * Math.PI) / response;   // undamped natural frequency
    return { k: w0 * w0, c: 2 * damping * w0 };
  };
  let { k, c } = recompute();

  const REST_V = 0.06;   // px/s — below this we are visually stopped
  const REST_D = 0.06;   // px   — and this close to the target

  // Start the clock NOW, not on the first frame. Deriving the baseline inside
  // the first rAF burns a whole frame (~16ms) doing nothing before anything
  // moves — measurable dead latency at the start of every single animation,
  // and latency is the one thing Apple's guidance is most absolute about.
  last = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const tick = (now) => {
    if (done) return;
    if (last == null) last = now;
    // Clamp dt so a backgrounded tab does not explode the integration.
    let dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;

    // Semi-implicit Euler, substepped. The substep has to be much finer than
    // the frame: at 1/120s this integrator bled away half the intended
    // overshoot (measured 0.70% against a theoretical 1.52% for damping 0.8),
    // i.e. it silently made every spring stiffer than it was configured to be.
    // 1/1000s tracks the closed-form solution and still costs nothing.
    const steps = Math.max(1, Math.ceil(dt / (1 / 1000)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = -k * (value - to) - c * velocity;
      velocity += a * h;
      value += velocity * h;
    }

    if (Math.abs(velocity) < REST_V && Math.abs(value - to) < REST_D) {
      value = to; velocity = 0; done = true;
      onFrame(value, 0);
      if (onDone) onDone();
      return;
    }
    onFrame(value, velocity);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    retarget(newTo, next) {
      to = newTo;
      if (next) {
        if (next.damping != null) damping = next.damping;
        if (next.response != null) response = next.response;
        ({ k, c } = recompute());
      }
      if (done) { done = false; last = null; raf = requestAnimationFrame(tick); }
    },
    stop() { done = true; if (raf) cancelAnimationFrame(raf); },
    get value() { return value; },
    get velocity() { return velocity; },
  };
}

/**
 * Where a flick would come to rest — Apple's exact projection function from the
 * Designing Fluid Interfaces sample code. NOT the textbook v²/(2a): the shipped
 * behaviour is exponential decay, and the difference is felt.
 *
 * Use it to pick the SNAP TARGET before animating, so a flick throws the sheet
 * to where the gesture was going rather than to whatever it happened to be
 * nearest when the finger lifted.
 */
export function project(velocity, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as "frozen"; a
 * rubber-band reads as "responsive, but there is nothing more here."
 */
export function rubberband(overshoot, dimension, constant = 0.55) {
  if (!dimension) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Small pointer-velocity tracker. Release velocity must come from the last few
 * move samples — a single frame's delta is far too noisy to hand to a spring.
 */
export function createVelocityTracker(samples = 5) {
  let pts = [];
  return {
    add(v) {
      pts.push({ v, t: performance.now() });
      if (pts.length > samples) pts.shift();
    },
    reset() { pts = []; },
    /** px per second */
    get() {
      if (pts.length < 2) return 0;
      const a = pts[0], b = pts[pts.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt <= 0) return 0;
      return (b.v - a.v) / dt;
    },
  };
}

export default spring;
