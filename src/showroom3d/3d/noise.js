/* Deterministic seeded noise + RNG used by the procedural textures (pure, no DOM, unit-tested). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D value noise. Optional integer `wrap` (cells) makes the lattice repeat so textures tile seamlessly. */
export function makeNoise2D(seed = 1, period = 256) {
  const rnd = mulberry32(seed);
  const grid = new Float32Array(period * period);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const sm = (t) => t * t * (3 - 2 * t);
  const md = (n, m) => ((n % m) + m) % m;
  return function noise(x, y, wrap) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const tx = sm(x - xi), ty = sm(y - yi);
    const wx = wrap || period, wy = wrap || period;
    const at = (ix, iy) => grid[md(iy, wy) % period * period + md(ix, wx) % period];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    const top = a + (b - a) * tx;
    return top + ((c + (d - c) * tx) - top) * ty;
  };
}

/** fractal brownian motion over (x,y) in lattice cells. With `wrap` (cells at octave 0) the result tiles. */
export function fbm(noise, x, y, octaves = 4, wrap = 0, lacunarity = 2, gain = 0.5) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += amp * noise(x * f, y * f, wrap ? wrap * f : 0); norm += amp; amp *= gain; f *= lacunarity; }
  return sum / norm;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
