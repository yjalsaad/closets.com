/* Phase 4 procedural PBR: timber with the grain running along U (directional, so UV mapping decides where the grain points), veined polished
 * stone, brushed metal (roughness streaks + normal, used with MeshPhysicalMaterial.anisotropy), matt-lacquer orange peel, woven rug, soft contact
 * shadows / light pools, and a generated warm INTERIOR environment (PMREM) for reflections on brass, stone and glass.
 * Everything is canvas ImageData from seeded noise: no photographs. Not photoreal; it is a plausible, consistent material language. */
import * as THREE from 'three';
import { PALETTE as P } from './palette';
import { makeNoise2D, fbm, clamp01, lerp } from './noise';
import { heightToNormal } from './textures';

const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function paint(size, fn, h = size) {
  const c = cv(size, h), g = c.getContext('2d'), img = g.createImageData(size, h), d = img.data, out = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < size; x++) { fn(x / size, y / h, out, x, y); const i = (y * size + x) * 4; d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}
function gray(arr, w, h) {
  const c = cv(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let i = 0; i < w * h; i++) { const v = clamp01(arr[i]) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}

/**
 * Timber, grain along U. tone 0 = oak (straight, open pores, pale rays), 1 = walnut (deeper, cathedral figure). Tiles seamlessly.
 * Returns { map, rough, normal }. The map is mid-tone: finishes tint it with material.color.
 */
export function timberSet(size, seed = 3, tone = 0) {
  const n = makeNoise2D(seed), n2 = makeNoise2D(seed + 7), n3 = makeNoise2D(seed + 19);
  const A = tone ? rgb(0x75594a) : rgb(0xaa957a), B = tone ? rgb(0x3a281c) : rgb(0x7f6a50);
  const rings = tone ? 16 : 20, cath = tone ? 0.55 : 0.4;
  const h = new Float32Array(size * size), r = new Float32Array(size * size);
  const map = paint(size, (u, v, o, x, y) => {
    const warp = fbm(n2, u * 2, v * 3, 3, 2) * cath + 0.1 * fbm(n3, u * 5, v * 2, 2, 5);
    const ring = v * rings + warp * 2.0;
    const t = Math.pow(0.5 + 0.5 * Math.sin(ring * Math.PI * 2), tone ? 1.3 : 1.7);
    const streak = fbm(n, u * 5, v * 90, 3, 5);                      // fine lines along U
    const fibre = fbm(n3, u * 24, v * 260, 2, 24);                   // very fine fibre
    const pore = fbm(n2, u * 34, v * 360, 1, 34) > (tone ? 0.82 : 0.74) ? 1 : 0;
    const k = clamp01(0.2 + 0.45 * t + 0.22 * (streak - 0.5) + 0.08 * (fibre - 0.5) + pore * 0.18);
    const c = mix3(A, B, k);
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
    const i = y * size + x; h[i] = 0.55 + 0.18 * t + 0.1 * (streak - 0.5) - pore * 0.35; r[i] = 0.5 + 0.14 * (1 - t) + pore * 0.18 + 0.05 * (fibre - 0.5);
  });
  return { map, rough: gray(r, size, size), normal: heightToNormal(h, size, size, tone ? 1.5 : 1.8) };
}

/** polished veined stone. variant: 'white' | 'dark' | 'sand'. Veins are domain-warped ridged noise; thin gold veins on the white. */
export function marbleSet(size, seed = 11, variant = 'white') {
  const n = makeNoise2D(seed), n2 = makeNoise2D(seed + 5), n3 = makeNoise2D(seed + 13);
  const spec = {
    white: { base: rgb(P.marbleWhite), cloud: rgb(0xcfc9bf), vein: rgb(P.marbleVeinGrey), gold: rgb(P.marbleVeinGold), goldAmt: 0.6, veinAmt: 0.7 },
    dark: { base: rgb(P.marbleDark), cloud: rgb(0x403c3a), vein: rgb(P.marbleDarkVein), gold: rgb(P.marbleVeinGold), goldAmt: 0.35, veinAmt: 0.85 },
    sand: { base: rgb(P.marbleSand), cloud: rgb(0xc3ae8c), vein: rgb(0x9b8460), gold: rgb(0xe8dcc3), goldAmt: 0.5, veinAmt: 0.55 },
  }[variant] || null;
  const S = spec, rough = new Float32Array(size * size);
  const map = paint(size, (u, v, o, x, y) => {
    const q1 = fbm(n, u * 3, v * 3, 4, 3), q2 = fbm(n2, u * 3 + 5, v * 3 + 2, 4, 3);
    const px = u * 2 + v * 1 + (q1 - 0.5) * 1.7, py = v * 2 - u * 1 + (q2 - 0.5) * 1.7;      // integer lattice shifts keep it tileable; the diagonal bias gives long flowing veins
    const rg = 1 - Math.abs(2 * fbm(n3, px, py, 5, 6) - 1);                 // ridge
    const thick = Math.pow(sstep(0.9, 1.0, rg), 1.5) * S.veinAmt;
    const thin = Math.pow(rg, 70) * S.goldAmt;
    const rg2 = 1 - Math.abs(2 * fbm(n2, px * 1.5 + 3, py * 1.5 - 1, 4, 6) - 1);
    const fine = Math.pow(rg2, 40) * 0.5;
    const cloud = fbm(n, u * 4 + 9, v * 4 + 4, 3, 4);
    let c = mix3(S.base, S.cloud, clamp01((cloud - 0.35) * 1.5) * 0.55);
    c = mix3(c, S.vein, clamp01(thick + fine * 0.6));
    c = mix3(c, S.gold, clamp01(thin));
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
    rough[y * size + x] = 0.11 + 0.08 * clamp01(thick) + 0.05 * cloud;
  });
  return { map, rough: gray(rough, size, size) };
}

/** brushed metal: roughness streaks and a faint normal, both along U. Pair with MeshPhysicalMaterial({ anisotropy }). */
export function brushedSet(size = 256, seed = 23) {
  const n = makeNoise2D(seed), h = new Float32Array(size * size), r = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, s = fbm(n, u * 2, v * 220, 2, 2), s2 = fbm(n, u * 9, v * 40, 2, 9);
    const i = y * size + x; h[i] = 0.5 + (s - 0.5) * 0.5 + (s2 - 0.5) * 0.15; r[i] = 0.5 + (s - 0.5) * 0.45 + (s2 - 0.5) * 0.12;
  }
  return { rough: gray(r, size, size), normal: heightToNormal(h, size, size, 0.9) };
}

/** matt lacquer / PU paint: orange-peel micro-relief only (tint comes from material.color) */
export function peelSet(size = 256, seed = 29) {
  const n = makeNoise2D(seed), h = new Float32Array(size * size), r = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const u = x / size, v = y / size, f = fbm(n, u * 60, v * 60, 3, 60); h[y * size + x] = f; r[y * size + x] = 0.55 + 0.1 * (f - 0.5); }
  return { rough: gray(r, size, size), normal: heightToNormal(h, size, size, 0.35) };
}

/** woven rug: sand field with a border, a quiet diamond lattice and visible weft / warp threads. {map, normal} */
export function rugSet(size = 512, seed = 31) {
  const n = makeNoise2D(seed), a = rgb(P.rugSand), b = rgb(P.rugBorder), h = new Float32Array(size * size);
  const map = paint(size, (u, v, o, x, y) => {
    const th = (Math.sin(u * size * 1.2) * 0.5 + 0.5) * 0.5 + (Math.sin(v * size * 1.2) * 0.5 + 0.5) * 0.5;
    const e = Math.min(u, v, 1 - u, 1 - v), border = (e < 0.07 ? 1 : 0) + (e > 0.09 && e < 0.1 ? 1 : 0);
    const dia = Math.abs((u - 0.5)) + Math.abs((v - 0.5)); const lat = (Math.abs(((dia * 9) % 1) - 0.5) < 0.04 && e > 0.13) ? 0.4 : 0;
    const mott = fbm(n, u * 8, v * 8, 4, 8);
    const c = mix3(mix3(a, b, clamp01(border * 0.85 + lat)), [a[0] * 0.8, a[1] * 0.8, a[2] * 0.78], (mott - 0.4) * 0.6 + (th - 0.5) * 0.25);
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; h[y * size + x] = th * 0.6 + mott * 0.4;
  });
  return { map, normal: heightToNormal(h, size, size, 1.4) };
}

/** soft dark rounded-rect decal (alpha gradient) used as a baked contact shadow under furniture */
export function contactShadowTexture(aspect = 1, strength = 0.55, blur = 22) {
  const W = 128, Hh = Math.max(32, Math.round(128 / aspect)), c = cv(W, Hh), g = c.getContext('2d');
  g.shadowColor = `rgba(0,0,0,${strength})`; g.shadowBlur = blur; g.shadowOffsetX = 2000;
  g.fillStyle = '#000'; const m = blur * 0.9; g.fillRect(m - 2000, m, W - 2 * m, Hh - 2 * m);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** soft radial light pool (white alpha) for additive light wash decals on the floor / walls */
export function poolTexture(inner = 0.0, size = 128) {
  const c = cv(size), g = c.getContext('2d'), r = g.createRadialGradient(size / 2, size / 2, size * inner, size / 2, size / 2, size / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** vertical wash: bright at v=1 (top) fading to 0, for LED light "washing" down a wall / panel */
export function washTexture(size = 128) {
  const c = cv(8, size), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, size);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 8, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** induction hob glass: black with four faint zone rings and a control strip */
export function hobTexture() {
  const c = cv(256), g = c.getContext('2d'); g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(190,175,150,0.55)'; g.lineWidth = 2;
  for (const [x, y, r] of [[78, 80, 40], [182, 80, 32], [78, 176, 32], [182, 176, 40]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.55, 0, 7); g.stroke(); }
  g.fillStyle = 'rgba(190,175,150,0.5)'; for (let i = 0; i < 8; i++) g.fillRect(40 + i * 22, 236, 12, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function toTex(canvas, { srgb = true, repeat, anisotropy = 4 } = {}) {
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anisotropy; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
}

/**
 * A generated warm INTERIOR environment (a plain room with ceiling light strips, a daylight window and a bounce floor), prefiltered with PMREM.
 * This replaces the outdoor sky as the reflection source for furniture: brass, stone and glass reflect a believable bright room instead of a sky.
 * Emissive panels are HDR (> 1), which PMREM keeps in half-float.
 */
export function buildInteriorEnv(renderer) {
  const scene = new THREE.Scene(); const col = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 9, 24), new THREE.MeshBasicMaterial({ color: col(P.interiorWarm, 0.16), side: THREE.BackSide })); room.position.y = 4.5; scene.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: col(P.stoneMid, 0.2) })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; scene.add(floor);
  const panel = (w, h, x, y, z, rx, ry, c, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col(c, k), side: THREE.DoubleSide, toneMapped: false })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); scene.add(m); };
  for (const x of [-4, 0, 4]) panel(0.7, 14, x, 8.9, 0, Math.PI / 2, 0, P.ledCool, 4.6);           // ceiling strips
  panel(9, 5, 11.9, 3.2, 0, 0, -Math.PI / 2, P.ledCool, 3.0);                                       // daylight window
  panel(6, 3.6, -11.9, 3.0, 2, 0, Math.PI / 2, P.ledWarm, 1.6);                                     // warm wall wash opposite
  panel(10, 2.2, 0, 3.4, -11.9, 0, 0, P.interiorWarm, 1.6);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(scene, 0.035, 0.1, 60); pm.dispose();
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return rt.texture;
}
