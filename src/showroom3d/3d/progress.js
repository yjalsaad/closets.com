/* Weighted, monotonic loading progress. Real work reports into it (texture generation, scene build, shader compile, first frame);
 * the loading screen shows total() as a percentage. Pure + unit-tested. */
export const LOAD_STAGES = {
  logo: 4,
  fonts: 4,
  textures: 22,
  exterior: 14,
  hall: 18,
  environment: 8,
  products: 12,
  compile: 14,
  firstFrame: 4,
};

export function createProgress(stages = LOAD_STAGES) {
  const sum = Object.values(stages).reduce((a, b) => a + b, 0);
  const frac = Object.fromEntries(Object.keys(stages).map((k) => [k, 0]));
  const subs = new Set();
  let last = 0;
  const total = () => {
    let t = 0;
    for (const k of Object.keys(stages)) t += stages[k] * frac[k];
    return Math.max(last, Math.min(100, (t / sum) * 100));
  };
  const emit = () => { last = total(); subs.forEach((f) => f(last)); };
  return {
    report(id, f) { if (!(id in stages)) return; frac[id] = Math.max(frac[id], Math.min(1, Math.max(0, f))); emit(); },
    done(id) { this.report(id, 1); },
    total,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    isComplete() { return Object.keys(stages).every((k) => frac[k] >= 1); },
    snapshot() { return { ...frac }; },
  };
}
