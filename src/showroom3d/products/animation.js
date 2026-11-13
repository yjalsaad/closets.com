/* Pure animation state for the interactive furniture (no three.js, no DOM; unit-tested).
 *
 * A Mover is one moving part (a drawer, a hinged door, a sliding leaf, a pivot door). It holds a LINEAR progress p in 0..1 that travels toward
 * its target at 1 / duration per second, and exposes value = ease(p). Because the progress is linear and only the value is eased, reversing
 * mid-way is continuous (no jump, no restart): the part simply turns round where it is.
 * ProductState groups the movers of one product plus the LED switch and the selected finish. */

export const smoothstep = (p) => p * p * (3 - 2 * p);
export const easeOutBack = (p) => { const c = 1.1, x = p - 1; return 1 + (c + 1) * x * x * x + c * x * x; };   // not used for travel (no overshoot through a carcass); kept for the LED fade-in flourish
export const EASES = { smooth: smoothstep, linear: (p) => p };

export const STATES = Object.freeze({ closed: 'closed', opening: 'opening', open: 'open', closing: 'closing' });

export class Mover {
  /** @param {{duration?: number, ease?: 'smooth'|'linear', value?: number}} o */
  constructor({ duration = 0.7, ease = 'smooth', value = 0 } = {}) {
    this.duration = Math.max(0.05, duration); this.easeName = ease; this.ease = EASES[ease] || smoothstep;
    this.p = value; this.target = value;
  }
  get value() { return this.ease(this.p); }
  get state() {
    if (this.p === this.target) return this.target === 1 ? STATES.open : STATES.closed;
    return this.target === 1 ? STATES.opening : STATES.closing;
  }
  get isOpen() { return this.target === 1; }
  get moving() { return this.p !== this.target; }
  setTarget(t) { this.target = t ? 1 : 0; }
  toggle() { this.target = this.target === 1 ? 0 : 1; return this.target === 1; }
  snap(t) { this.target = t ? 1 : 0; this.p = this.target; }
  /** advance by dt seconds (any dt >= 0 is safe). Returns true when the displayed value changed. */
  update(dt) {
    if (this.p === this.target || !(dt > 0)) return false;
    const step = dt / this.duration;
    this.p = this.target === 1 ? Math.min(1, this.p + step) : Math.max(0, this.p - step);
    return true;
  }
}

/** parts: [{id, kind: 'drawer'|'door'|'slider'|'pivot'|'tilt'|'tray', duration?, group?}] */
export function createProductState(def, { reduced = false } = {}) {
  const movers = new Map(); const kinds = new Map();
  for (const p of def.parts) { movers.set(p.id, new Mover({ duration: p.duration || DEFAULT_DURATION[p.kind] || 0.7 })); kinds.set(p.id, p.kind); }
  const led = new Mover({ duration: 0.45, ease: 'smooth', value: def.ledOn === false ? 0 : 1 });
  const s = {
    id: def.id, reduced, finishId: def.finishes ? def.finishes[0] : null, movers, led, order: def.parts.map((p) => p.id),
    part(id) { return movers.get(id); },
    kind(id) { return kinds.get(id); },
    has(id) { return movers.has(id); },
    setReduced(v) { s.reduced = !!v; },
    open(id) { const m = movers.get(id); if (!m) return false; if (s.reduced) m.snap(1); else m.setTarget(1); return true; },
    close(id) { const m = movers.get(id); if (!m) return false; if (s.reduced) m.snap(0); else m.setTarget(0); return true; },
    toggle(id) { const m = movers.get(id); if (!m) return false; return m.isOpen ? s.close(id) && false : s.open(id) && true; },
    openAll() { for (const id of s.order) s.open(id); },
    closeAll() { for (const id of s.order) s.close(id); },
    allOpen() { return s.order.every((id) => movers.get(id).isOpen); },
    anyOpen() { return s.order.some((id) => movers.get(id).target === 1 || movers.get(id).p > 0); },
    setLed(on) { if (s.reduced) led.snap(on); else led.setTarget(on); },
    toggleLed() { s.setLed(!led.isOpen); return led.isOpen; },
    get ledOn() { return led.isOpen; },
    /** 0..1 light level of the LED that belongs to a part: it only shines while the LED switch is on, and ramps with how far the part is open */
    ledLevel(id) { const m = movers.get(id); return m ? led.value * m.value : 0; },
    /** 0..1 light level of an always-on accent LED (under-cabinet, plinth, cove): follows the switch only */
    accentLevel() { return led.value; },
    setFinish(fid) { if (def.finishes && def.finishes.includes(fid)) { s.finishId = fid; return true; } return false; },
    update(dt) { let ch = false; for (const m of movers.values()) ch = m.update(dt) || ch; ch = led.update(dt) || ch; return ch; },
    /** plain snapshot for the UI / tests */
    snapshot() { const parts = {}; movers.forEach((m, id) => { parts[id] = { state: m.state, value: m.value }; }); return { id: def.id, finishId: s.finishId, led: led.isOpen, parts }; },
  };
  return s;
}

export const DEFAULT_DURATION = { drawer: 0.65, door: 0.9, slider: 1.0, pivot: 1.1, tilt: 0.8, tray: 0.6 };
