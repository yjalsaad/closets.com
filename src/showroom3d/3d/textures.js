/* Procedural PBR texture sets (albedo + roughness + normal) drawn with canvas/ImageData from seeded noise.
 * There are NO photographic or Blender assets in this build: every surface you see is generated here.
 * Each generator is async-friendly (returns plain canvases); `toTexture` wraps them for three. */
import * as THREE from 'three';
import { viaReal, trackTexture } from './realism/registry';
import { PALETTE } from './palette';
import { makeNoise2D, fbm, mulberry32, clamp01, lerp } from './noise';

const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

/** height field (Float32, w*h, 0..1) -> tangent-space normal map canvas */
export function heightToNormal(height, w, h, strength = 2) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}

function pixels(w, h, fn) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y, x / w, y / h); const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}

/** Large-format limestone / travertine floor (texture = 2 x 2 tiles with grout, per-tile tone shift, veining, pores) */
export function stoneSet(size, seed = 7, opts = {}) { return !opts.light && !opts.tiles ? viaReal('stone', size, () => stoneProc(size, seed, opts)) : stoneProc(size, seed, opts); }   // real CC0 limestone (Poly Haven marble_01) once loaded
function stoneProc(size, seed = 7, opts = {}) {
  const tiles = opts.tiles || 2;
  const n = makeNoise2D(seed), n2 = makeNoise2D(seed + 11), rnd = mulberry32(seed * 13 + 1);
  const light = rgb(opts.light || PALETTE.stoneLight), mid = rgb(opts.mid || PALETTE.stoneMid), dark = rgb(opts.dark || PALETTE.stoneDark);
  const tileShift = Array.from({ length: tiles * tiles }, () => (rnd() - 0.5) * 0.16);
  const grout = Math.max(1, Math.round(size / 340));
  const height = new Float32Array(size * size), rough = new Float32Array(size * size);
  const alb = pixels(size, size, (x, y, u, v) => {
    const tx = Math.floor(u * tiles), ty = Math.floor(v * tiles);
    const lx = (u * tiles - tx) * (size / tiles), ly = (v * tiles - ty) * (size / tiles);
    const edge = Math.min(lx, ly, size / tiles - lx, size / tiles - ly);
    const base = fbm(n, u * 6, v * 6, 4, 6) + tileShift[ty * tiles + tx];
    const cloud = fbm(n2, u * 3, v * 3, 3, 3);
    // travertine-style horizontal-ish veining
    const vein = Math.abs(fbm(n, u * 3 + cloud * 1.6, v * 22 + cloud * 2, 3, 3) - 0.5);
    const veinMask = clamp01(1 - vein * 16) * 0.55;
    const pore = fbm(n2, u * 90, v * 90, 2, 90) > 0.74 ? 0.5 : 0;
    let col = mix(light, mid, clamp01(base * 1.15 - 0.2));
    col = mix(col, dark, veinMask * 0.55 + pore * 0.45);
    const isGrout = edge < grout;
    if (isGrout) col = mix(col, dark, 0.55);
    const i = y * size + x;
    height[i] = isGrout ? 0 : 0.6 + base * 0.25 - veinMask * 0.15 - pore * 0.25;
    rough[i] = isGrout ? 0.95 : clamp01(0.3 + pore * 0.4 + veinMask * 0.12 + base * 0.1);
    return col;
  });
  return { map: alb, rough: grayCanvas(rough, size, size), normal: heightToNormal(height, size, size, opts.bump || 1.6) };
}

function grayCanvas(arr, w, h) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  for (let i = 0; i < w * h; i++) { const v = clamp01(arr[i]) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0); return c;
}

/** Timber: long grain running along V (use with vertical slats). tone 0 = oak, 1 = walnut */
export function woodSet(size, seed = 3, tone = 0) { return viaReal(tone ? 'walnut' : 'oak', size, () => woodProc(size, seed, tone)); }
function woodProc(size, seed = 3, tone = 0) {
  const n = makeNoise2D(seed), n2 = makeNoise2D(seed + 5);
  const oakA = rgb(PALETTE.oak), oakB = mix(rgb(PALETTE.oak), [60, 36, 18], 0.45);
  const walA = rgb(PALETTE.walnut), walB = mix(rgb(PALETTE.walnut), [18, 10, 6], 0.55);
  const A = tone ? walA : oakA, B = tone ? walB : oakB;
  const height = new Float32Array(size * size), rough = new Float32Array(size * size);
  const alb = pixels(size, size, (x, y, u, v) => {
    const warp = fbm(n2, u * 4, v * 2, 3, 4) * 2.2;
    const grain = fbm(n, u * 26 + warp, v * 3, 4, 26);            // stretched along V
    const ring = Math.sin((u * 14 + warp * 1.2 + grain * 2.0) * Math.PI * 2) * 0.5 + 0.5;
    const pore = fbm(n, u * 90, v * 8, 2, 90);
    const t = clamp01(grain * 0.9 + ring * 0.35 - 0.25);
    const col = mix(A, B, t * 0.85 + (pore > 0.7 ? 0.15 : 0));
    const i = y * size + x; height[i] = 0.5 + ring * 0.2 - pore * 0.1; rough[i] = 0.5 + ring * 0.12 + pore * 0.1;
    return col;
  });
  return { map: alb, rough: grayCanvas(rough, size, size), normal: heightToNormal(height, size, size, 1.2) };
}

/** Warm plaster / microcement: soft cloudy variation + fine grain */
export function plasterSet(size, seed = 5, base = PALETTE.plaster, dark = PALETTE.taupe) { return base === PALETTE.plaster ? viaReal('plaster', size, () => plasterProc(size, seed, base, dark)) : plasterProc(size, seed, base, dark); }
function plasterProc(size, seed = 5, base = PALETTE.plaster, dark = PALETTE.taupe) {
  const n = makeNoise2D(seed), a = rgb(base), b = rgb(dark);
  const height = new Float32Array(size * size);
  const alb = pixels(size, size, (x, y, u, v) => {
    const cloud = fbm(n, u * 5, v * 5, 4, 5), fine = fbm(n, u * 120, v * 120, 2, 120);
    const i = y * size + x; height[i] = cloud * 0.6 + fine * 0.4;
    return mix(a, b, clamp01((cloud - 0.35) * 0.55 + (fine - 0.5) * 0.18));
  });
  return { map: alb, normal: heightToNormal(height, size, size, 0.9) };
}

/** Exterior pavers: rectangular stone setts with joints and tone variation */
export function paverSet(size, seed = 9) {
  const n = makeNoise2D(seed), rnd = mulberry32(seed + 2), rows = 8, cols = 4;
  const shift = Array.from({ length: rows * cols }, () => (rnd() - 0.5) * 0.3);
  const a = rgb(PALETTE.paver), b = rgb(PALETTE.stoneDark), joint = Math.max(1, Math.round(size / 256));
  const height = new Float32Array(size * size);
  const alb = pixels(size, size, (x, y, u, v) => {
    const r = Math.floor(v * rows), off = r % 2 ? 0.5 : 0;
    const uu = (u * cols + off) % cols, c = Math.floor(uu);
    const lx = (uu - c) * (size / cols), ly = (v * rows - r) * (size / rows);
    const edge = Math.min(lx, ly, size / cols - lx, size / rows - ly);
    const base = fbm(n, u * 18, v * 18, 3, 18) + shift[r * cols + c];
    const i = y * size + x; const isJ = edge < joint; height[i] = isJ ? 0 : 0.7 + base * 0.2;
    return mix(a, b, clamp01(isJ ? 0.7 : base * 0.7 - 0.1));
  });
  return { map: alb, normal: heightToNormal(height, size, size, 1.2) };
}

/** Lawn: dense, noisy two-tone green */
export function grassSet(size, seed = 21) {
  const n = makeNoise2D(seed), a = rgb(PALETTE.grass), b = rgb(PALETTE.grassDark), dry = rgb(PALETTE.leafDry);
  const alb = pixels(size, size, (x, y, u, v) => {
    const blades = fbm(n, u * 160, v * 160, 2, 160), patch = fbm(n, u * 6, v * 6, 3, 6);
    return mix(mix(a, b, clamp01(blades * 1.2 - 0.25)), dry, clamp01((patch - 0.55) * 1.6) * 0.5);
  });
  return { map: alb };
}

/** Bare soil / sand ground used under the lawn edges and for the site apron */
export function sandSet(size, seed = 31) {
  const n = makeNoise2D(seed), a = rgb(PALETTE.sandGround), b = rgb(PALETTE.soil);
  return { map: pixels(size, size, (x, y, u, v) => mix(a, b, clamp01(fbm(n, u * 20, v * 20, 4, 20) * 0.7 - 0.1 + fbm(n, u * 140, v * 140, 1, 140) * 0.1))) };
}

/** Foliage colour field for shrubs / canopies (no alpha: used on blobby geometry) */
export function leafSet(size, seed = 41) {
  const n = makeNoise2D(seed), a = rgb(PALETTE.leaf), b = rgb(PALETTE.grassDark), c = rgb(PALETTE.leafDry);
  return { map: pixels(size, size, (x, y, u, v) => {
    const f = fbm(n, u * 30, v * 30, 4, 30);
    return mix(mix(b, a, clamp01(f * 1.6 - 0.3)), c, clamp01((f - 0.62) * 2.2) * 0.6);
  }) };
}

/** Date-palm trunk: ringed bark, rings run horizontally (U wraps around the trunk) */
export function trunkSet(size, seed = 51) {
  const n = makeNoise2D(seed), a = rgb(PALETTE.trunk), b = mix(rgb(PALETTE.trunk), [40, 30, 20], 0.55);
  const height = new Float32Array(size * size);
  const alb = pixels(size, size, (x, y, u, v) => {
    const ring = Math.pow(Math.abs(Math.sin(v * 38 * Math.PI)), 0.6);
    const fib = fbm(n, u * 24, v * 6, 3, 24);
    const i = y * size + x; height[i] = ring * 0.6 + fib * 0.4;
    return mix(a, b, clamp01(ring * 0.65 + fib * 0.35 - 0.2));
  });
  return { map: alb, normal: heightToNormal(height, size, size, 1.6) };
}

/** Palm frond card with alpha: a rib and two rows of leaflets (alphaTest in the material). */
export function frondCanvas(w = 256, h = 512) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  const rib = rgb(PALETTE.leafDry), leaf = rgb(PALETTE.leaf);
  g.strokeStyle = `rgb(${rib[0]},${rib[1]},${rib[2]})`; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
  const N = 34;
  for (let i = 0; i < N; i++) {
    const y = h - 12 - (i / N) * (h - 26), len = (w / 2 - 4) * (0.35 + 0.65 * Math.sin((i / N) * Math.PI * 0.95 + 0.25));
    const k = 0.75 + 0.25 * Math.sin(i * 1.7);
    g.strokeStyle = `rgb(${Math.round(leaf[0] * k)},${Math.round(leaf[1] * k)},${Math.round(leaf[2] * k)})`; g.lineWidth = 4.2;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * len * 0.55, y - 10, w / 2 + s * len, y - 30 - len * 0.12); g.stroke(); }
  }
  return c;
}

export function toTexture(canvas, { srgb = true, repeat, anisotropy = 4 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anisotropy; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return trackTexture(t, canvas);
}
