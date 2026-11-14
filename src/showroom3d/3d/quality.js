/* Quality tiers + adaptive resolution. Pure functions (unit-tested); the engine only reads the numbers. */
export const TIERS = {
  high:   { id: 'high',   pixelRatioCap: 2,    shadowMap: 2048, antialias: true,  pointLights: 6, palms: 16, fronds: 16, texSize: 1024, normalMaps: true,  clouds: true,  anisotropy: 8, hallLogoGlow: true,  physicalFloor: true,  slatDensity: 1 },
  medium: { id: 'medium', pixelRatioCap: 1.5,  shadowMap: 1024, antialias: true,  pointLights: 3, palms: 10, fronds: 12, texSize: 512,  normalMaps: true,  clouds: true,  anisotropy: 4, hallLogoGlow: true,  physicalFloor: true,  slatDensity: 1 },
  low:    { id: 'low',    pixelRatioCap: 1,    shadowMap: 1024, antialias: false, pointLights: 0, palms: 6,  fronds: 9,  texSize: 256,  normalMaps: false, clouds: false, anisotropy: 1, hallLogoGlow: false, physicalFloor: false, slatDensity: 0.5 },
};
export const TIER_IDS = Object.keys(TIERS);

/**
 * Choose a tier from device signals.
 * sig: { override, width, height, coarsePointer, deviceMemory, hardwareConcurrency, saveData, softwareRenderer }
 */
export function pickTier(sig = {}) {
  if (sig.override && TIERS[sig.override]) return sig.override;
  if (sig.saveData || sig.softwareRenderer) return 'low';
  const short = Math.min(sig.width || 1280, sig.height || 800);
  const mem = Number(sig.deviceMemory) || 0;       // GB, 0 = unknown (Safari/Firefox do not expose it)
  const cores = Number(sig.hardwareConcurrency) || 0;
  if (sig.coarsePointer) {
    if (short <= 520) return mem >= 6 && cores >= 8 ? 'medium' : 'low';   // phones
    return mem && mem < 4 ? 'low' : 'medium';                                // tablets
  }
  if ((mem && mem <= 2) || (cores && cores <= 2)) return 'low';
  if ((mem && mem <= 4) || (cores && cores <= 4) || short < 600) return 'medium';
  return 'high';
}

/** read the real device signals (browser only) */
export function readSignals(search = (typeof window !== 'undefined' ? window.location.search : '')) {
  const q = new URLSearchParams(search);
  const w = typeof window !== 'undefined' ? window : {};
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const mm = (s) => { try { return !!(w.matchMedia && w.matchMedia(s).matches); } catch (e) { return false; } };
  const conn = nav.connection || {};
  return {
    override: q.get('quality') || '',
    width: w.innerWidth || 1280, height: w.innerHeight || 800,
    coarsePointer: mm('(pointer: coarse)'),
    deviceMemory: nav.deviceMemory, hardwareConcurrency: nav.hardwareConcurrency,
    saveData: !!conn.saveData,
    softwareRenderer: false,   // filled in by the engine after it can read the GPU string
  };
}

/** GPU name from WEBGL_debug_renderer_info ('' when unavailable) */
export function probeRenderer() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return name;
  } catch (e) { return ''; }
}

export const isSoftwareRenderer = (name) => /swiftshader|llvmpipe|software|softpipe|basic render/i.test(String(name || ''));

/**
 * Adaptive resolution: given the render scale and the measured average fps, return the next scale.
 * Drops quickly when below ~24 fps, recovers slowly above ~55 fps (hysteresis between the two).
 */
export function adaptScale({ scale, fps, min = 0.5, max = 1 }) {
  let s = scale;
  if (fps > 0 && fps < 24) s = scale * 0.85;
  else if (fps > 55) s = scale * 1.08;
  return Math.max(min, Math.min(max, Math.round(s * 100) / 100));
}

export function effectivePixelRatio(tier, dpr, scale = 1) {
  const cap = (TIERS[tier] || TIERS.low).pixelRatioCap;
  return Math.max(0.5, Math.min(cap, dpr || 1) * scale);
}
