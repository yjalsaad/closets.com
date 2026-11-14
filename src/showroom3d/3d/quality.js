/* Quality tiers + adaptive quality. Pure functions (unit-tested); the engine only reads the numbers.
 * POLICY (owner feedback "bad resolution"): SHARPNESS FIRST. Every tier renders with anti-aliasing at a pixel ratio that suits the screen, an unknown device is never
 * assumed to be weak, and when the frame rate is low the engine sheds OTHER costs (shadow map size, bloom / post, floor reflections, live shadow updates) before it
 * touches the resolution; the resolution itself never goes below MIN_SCALE of the tier ratio, nor below 1.25 device pixels per CSS pixel on a 2x+ screen (1 on a 1x screen). */
export const TIERS = {
  high:   { id: 'high',   pixelRatioCap: 2,    shadowMap: 2048, antialias: true,  pointLights: 6, palms: 16, fronds: 16, texSize: 1024, normalMaps: true,  clouds: true,  anisotropy: 8, hallLogoGlow: true,  physicalFloor: true,  slatDensity: 1 },
  medium: { id: 'medium', pixelRatioCap: 2,    shadowMap: 1024, antialias: true,  pointLights: 3, palms: 10, fronds: 12, texSize: 512,  normalMaps: true,  clouds: true,  anisotropy: 8, hallLogoGlow: true,  physicalFloor: true,  slatDensity: 1 },
  low:    { id: 'low',    pixelRatioCap: 1.5,  shadowMap: 1024, antialias: true,  pointLights: 0, palms: 6,  fronds: 9,  texSize: 512,  normalMaps: false, clouds: false, anisotropy: 4, hallLogoGlow: false, physicalFloor: false, slatDensity: 0.5 },
};
export const TIER_IDS = Object.keys(TIERS);

/** the visible "Graphics" setting: Auto follows the device, the other three pin a tier. Stored on the device; ?quality=high|medium|low still overrides everything (for support / QA). */
export const GRAPHICS_KEY = 'closets_yb_graphics';
export const GRAPHICS_MODES = ['auto', 'high', 'balanced', 'performance'];
export const MODE_TIER = { high: 'high', balanced: 'medium', performance: 'low' };
export const cleanMode = (m) => (GRAPHICS_MODES.includes(m) ? m : 'auto');
export const nextMode = (m) => GRAPHICS_MODES[(GRAPHICS_MODES.indexOf(cleanMode(m)) + 1) % GRAPHICS_MODES.length];
export function readGraphicsMode() { try { return cleanMode(window.localStorage.getItem(GRAPHICS_KEY) || 'auto'); } catch (e) { return 'auto'; } }
export function writeGraphicsMode(m) { try { window.localStorage.setItem(GRAPHICS_KEY, cleanMode(m)); return true; } catch (e) { return false; } }

/**
 * Choose a tier from device signals. Unknown memory / cores (Safari, Firefox, every iPhone) NEVER means "weak": only a KNOWN weak signal steps down.
 * sig: { override, mode, width, height, coarsePointer, deviceMemory, hardwareConcurrency, saveData, softwareRenderer }
 */
export function pickTier(sig = {}) {
  if (sig.override && TIERS[sig.override]) return sig.override;            // ?quality=
  if (sig.mode && MODE_TIER[sig.mode]) return MODE_TIER[sig.mode];         // the visitor's own Graphics setting
  if (sig.saveData || sig.softwareRenderer) return 'low';
  const short = Math.min(sig.width || 1280, sig.height || 800);
  const mem = Number(sig.deviceMemory) || 0;       // GB, 0 = unknown (Safari / Firefox do not expose it)
  const cores = Number(sig.hardwareConcurrency) || 0;   // 0 = unknown
  if (sig.coarsePointer && short <= 520) return (cores && cores <= 4) || (mem && mem <= 3) ? 'low' : 'medium';   // phones: Balanced unless known weak
  if ((mem && mem <= 2) || (cores && cores <= 2)) return 'low';            // tablets and desktops
  if ((mem && mem <= 4) || (cores && cores <= 4)) return 'medium';
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
    mode: readGraphicsMode(),
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

/** how far the render scale may drop: 0.8 of the tier ratio, and never under 1.25 device pixels per CSS pixel on a 2x+ screen (1 on a 1x screen) */
export const MIN_SCALE = 0.8;
export const ratioFloor = (dpr) => ((dpr || 1) >= 2 ? 1.25 : Math.min(1, dpr || 1));
export function minScale(tier, dpr) {
  const base = Math.min((TIERS[tier] || TIERS.low).pixelRatioCap, dpr || 1);
  return Math.min(1, Math.max(MIN_SCALE, Math.ceil((ratioFloor(dpr) / base) * 100) / 100));
}

/**
 * Adaptive resolution: given the render scale and the measured average fps, return the next scale.
 * Drops when below ~24 fps, recovers slowly above ~55 fps (hysteresis between the two). The floor is 0.8 (see minScale for the per-screen floor).
 */
export function adaptScale({ scale, fps, min = MIN_SCALE, max = 1 }) {
  let s = scale;
  if (fps > 0 && fps < 24) s = scale * 0.92;
  else if (fps > 55) s = scale * 1.08;
  return Math.max(min, Math.min(max, Math.round(s * 100) / 100));
}

/** what the engine sheds, in order, BEFORE the resolution: 1 smaller sun shadow map, 2 no bloom / post chain, 3 no floor reflections, 4 shadows stop updating every frame */
export const SHED_STEPS = ['shadowSize', 'post', 'reflections', 'shadowUpdates'];
export const SHED_MAX = SHED_STEPS.length;
/**
 * One adaptive step (every ~2 s of measured frames). Low fps: shed the next cost; only when everything is shed does the resolution drop (to `min` at most).
 * High fps: the resolution comes back first, then the shed costs return one by one.
 */
export function adaptQuality({ shed = 0, scale = 1, fps, min = MIN_SCALE, maxShed = SHED_MAX }) {
  if (fps > 0 && fps < 24) return shed < maxShed ? { shed: shed + 1, scale } : { shed, scale: adaptScale({ scale, fps, min }) };
  if (fps > 55) return scale < 1 ? { shed, scale: adaptScale({ scale, fps, min }) } : { shed: Math.max(0, shed - 1), scale };
  return { shed, scale };
}

/** device pixels per CSS pixel the canvas is drawn at */
export function effectivePixelRatio(tier, dpr, scale = 1) {
  const d = dpr || 1, base = Math.min((TIERS[tier] || TIERS.low).pixelRatioCap, d);
  return Math.max(Math.min(base, ratioFloor(d)), base * scale);
}
/** drawing-buffer size for a CSS size (what renderer.setSize + setPixelRatio produce) */
export const bufferSize = (w, h, tier, dpr, scale = 1) => { const r = effectivePixelRatio(tier, dpr, scale); return [Math.floor(w * r), Math.floor(h * r)]; };
