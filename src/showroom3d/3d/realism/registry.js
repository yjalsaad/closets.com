/* Realism asset registry: CC0 PBR texture sets (Poly Haven, see docs/showroom3d/REALISM.md) + one warm interior HDRI, loaded lazily while the
 * existing loader / intro is on screen. Everything here degrades gracefully: when an image fails (offline, Jest, old browser) `realSet` returns null
 * and the procedural generators in textures.js / pbr.js are used exactly as before. Add-only: nothing outside src/showroom3d imports this. */
import * as THREE from 'three';
import { REAL_BASE } from './config';

const REG = { bitmaps: {}, cache: {}, hdr: null, env: null, ok: false, tier: 'high' };
const NAMES = ['oak', 'walnut', 'limestone', 'stucco', 'greyplaster', 'linen', 'velvet', 'leather', 'planks', 'parquet'];

/** derived sets: { source set, multiply tint (rgb 0..1), optional brightness normalisation target } */
export const VARIANTS = {
  oak: { from: 'oak' },
  walnut: { from: 'walnut', mul: [0.54, 0.51, 0.49] },
  walnutMid: { from: 'walnut', mul: [0.7, 0.68, 0.65] },
  stone: { from: 'limestone', mul: [1, 0.98, 0.95], sat: 0.5 },
  plaster: { from: 'stucco', mul: [0.9, 0.84, 0.76] },
  microcement: { from: 'greyplaster', mul: [1, 0.995, 0.985], norm: 0.74, sat: 0.2 },
  concreteWall: { from: 'greyplaster', mul: [0.94, 0.9, 0.85], norm: 0.5, sat: 0.3 },
  planks: { from: 'planks' },
  planksDark: { from: 'parquet', mul: [0.62, 0.52, 0.46] },
  linen: { from: 'linen' },
  velvet: { from: 'velvet' },
  leather: { from: 'leather' },
};

const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const url = (n, k) => `${REAL_BASE}tex/${n}_${k}.webp`;
async function bitmap(u) { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return createImageBitmap(await r.blob()); }

export const realReady = () => REG.ok;
/** tier -> texture edge in px (low tier keeps phones light) */
export const TIER_TEX = { high: 1024, medium: 512, low: 256 };

export async function loadRealism(tierId = 'high', { onProgress, signal } = {}) {
  REG.tier = tierId;
  if (typeof createImageBitmap === 'undefined' || typeof fetch === 'undefined') return false;
  let done = 0; const total = NAMES.length * 3;
  const tick = () => { done++; if (onProgress) onProgress(done / total); };
  try {
    await Promise.all(NAMES.flatMap((n) => ['a', 'n', 'orm'].map(async (k) => {
      if (signal && signal.aborted) return;
      try { (REG.bitmaps[n] = REG.bitmaps[n] || {})[k] = await bitmap(url(n, k)); } catch (e) { /* this set falls back to procedural */ }
      tick();
    })));
    REG.ok = NAMES.some((n) => REG.bitmaps[n] && REG.bitmaps[n].a);
  } catch (e) { REG.ok = false; }
  return REG.ok;
}

function drawTo(bm, size) { const c = canvas(size), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(bm, 0, 0, size, size); return c; }
function tint(c, mul = [1, 1, 1], norm, sat = 1) {
  const g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), d = img.data; let k = 1;
  if (norm) { let s = 0; for (let i = 0; i < d.length; i += 64) s += (d[i] + d[i + 1] + d[i + 2]) / 765; k = norm / (s / (d.length / 64)); }
  if (sat !== 1) for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; d[i] = l + (d[i] - l) * sat; d[i + 1] = l + (d[i + 1] - l) * sat; d[i + 2] = l + (d[i + 2] - l) * sat; }   // pull stained / yellow captures toward neutral before the tint
  for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * mul[0] * k); d[i + 1] = Math.min(255, d[i + 1] * mul[1] * k); d[i + 2] = Math.min(255, d[i + 2] * mul[2] * k); }
  g.putImageData(img, 0, 0); return c;
}
/** split an ORM canvas into gray roughness (G) and gray AO (R) canvases */
function channel(orm, ch) {
  const c = canvas(orm.width), g = c.getContext('2d'); g.drawImage(orm, 0, 0); const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = d[i + ch]; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}

/** a ready {map, rough, normal, ao} set of canvases for a variant name, or null when the real asset is not available */
export function realSet(name, size = 1024) {
  const v = VARIANTS[name]; if (!REG.ok || !v) return null;
  const b = REG.bitmaps[v.from]; if (!b || !b.a) return null;
  const S = Math.min(size, TIER_TEX[REG.tier] || 512), key = name + ':' + S; if (REG.cache[key]) return REG.cache[key];
  let map = drawTo(b.a, S); if (v.mul || v.sat != null) map = tint(map, v.mul, v.norm, v.sat == null ? 1 : v.sat);
  const orm = b.orm ? drawTo(b.orm, Math.min(S, 512)) : null;
  const set = { map, normal: b.n ? drawTo(b.n, Math.min(S, 512)) : null, rough: orm ? channel(orm, 1) : null, ao: orm ? channel(orm, 0) : null };
  return (REG.cache[key] = set);
}

/** warm, slightly darkened interior environment (PMREM) from the Poly Haven HDRI; null when unavailable */
export async function loadInteriorHdr(renderer) {
  if (REG.env) return REG.env;
  try {
    const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
    const loader = new RGBELoader().setDataType(THREE.FloatType);
    const tex = await new Promise((res, rej) => loader.load(`${REAL_BASE}studio_warm_512.hdr`, res, undefined, rej));
    const d = tex.image.data, W = tex.image.width, H = tex.image.height;
    // grade the capture toward the brand's warm walnut / travertine interior: warm multiply, darker floor half (a dim reflected floor), brighter lamps stay bright
    for (let y = 0; y < H; y++) { const lat = y / H, k = lat > 0.5 ? 0.55 + 0.45 * (1 - (lat - 0.5) * 2) : 1; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; d[i] *= 1.0 * k; d[i + 1] *= 0.96 * k; d[i + 2] *= 0.9 * k; } }
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(renderer); REG.env = pm.fromEquirectangular(tex).texture; pm.dispose(); tex.dispose();
  } catch (e) { REG.env = null; }
  return REG.env;
}
export const interiorEnv = () => REG.env;
export function disposeRealism() { if (REG.env) { REG.env.dispose(); REG.env = null; } REG.cache = {}; }
