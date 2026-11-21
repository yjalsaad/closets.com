import { TIERS, pickTier, adaptScale, adaptQuality, effectivePixelRatio, bufferSize, minScale, MIN_SCALE, SHED_STEPS, isSoftwareRenderer, readSignals, GRAPHICS_MODES, GRAPHICS_KEY, MODE_TIER, cleanMode, nextMode, readGraphicsMode, writeGraphicsMode } from '../3d/quality';

describe('quality tiers', () => {
  test('desktop / tablet: high unless KNOWN weak; unknown memory and cores (Safari, Firefox) never mean weak', () => {
    expect(pickTier({ width: 1920, height: 1080, deviceMemory: 8, hardwareConcurrency: 12 })).toBe('high');
    expect(pickTier({ width: 1440, height: 900 })).toBe('high');
    expect(pickTier({ width: 1280, height: 560 })).toBe('high');                                           // a short window is not a weak machine
    expect(pickTier({ width: 820, height: 1180, coarsePointer: true })).toBe('high');                      // iPad: nothing is exposed
    expect(pickTier({ width: 820, height: 1180, coarsePointer: true, deviceMemory: 4 })).toBe('medium');
    expect(pickTier({ width: 1366, height: 768, deviceMemory: 4, hardwareConcurrency: 8 })).toBe('medium');
    expect(pickTier({ width: 1366, height: 768, deviceMemory: 8, hardwareConcurrency: 4 })).toBe('medium');
    expect(pickTier({ width: 1366, height: 768, deviceMemory: 2 })).toBe('low');
    expect(pickTier({ width: 1366, height: 768, hardwareConcurrency: 2 })).toBe('low');
  });
  test('phones: Balanced by default (every iPhone: memory unknown), Performance only for a KNOWN weak phone', () => {
    expect(pickTier({ width: 393, height: 852, coarsePointer: true, hardwareConcurrency: 6 })).toBe('medium');   // iPhone 14 Pro (Safari: no deviceMemory)
    expect(pickTier({ width: 390, height: 844, coarsePointer: true })).toBe('medium');
    expect(pickTier({ width: 390, height: 844, coarsePointer: true, deviceMemory: 4, hardwareConcurrency: 8 })).toBe('medium');
    expect(pickTier({ width: 430, height: 932, coarsePointer: true, deviceMemory: 8, hardwareConcurrency: 8 })).toBe('medium');
    expect(pickTier({ width: 360, height: 800, coarsePointer: true, deviceMemory: 2, hardwareConcurrency: 8 })).toBe('low');
    expect(pickTier({ width: 360, height: 800, coarsePointer: true, deviceMemory: 3 })).toBe('low');
    expect(pickTier({ width: 360, height: 800, coarsePointer: true, hardwareConcurrency: 4 })).toBe('low');
  });
  test('data saver and software GL force low; the Graphics setting pins a tier; a valid ?quality= wins over everything', () => {
    expect(pickTier({ width: 1920, height: 1080, saveData: true })).toBe('low');
    expect(pickTier({ width: 1920, height: 1080, softwareRenderer: true })).toBe('low');
    expect(pickTier({ override: 'high', saveData: true, softwareRenderer: true })).toBe('high');
    expect(pickTier({ override: 'bogus', width: 1920, height: 1080 })).toBe('high');
    expect(pickTier({ mode: 'performance', width: 1920, height: 1080 })).toBe('low'); expect(pickTier({ mode: 'balanced', width: 1920, height: 1080 })).toBe('medium');
    expect(pickTier({ mode: 'high', width: 390, height: 844, coarsePointer: true, softwareRenderer: true })).toBe('high');
    expect(pickTier({ mode: 'auto', width: 390, height: 844, coarsePointer: true })).toBe('medium'); expect(pickTier({ mode: 'high', override: 'low' })).toBe('low');
  });
  test('Graphics modes: Auto / High / Balanced / Performance, stored on the device, cycle and clean', () => {
    expect(GRAPHICS_MODES).toEqual(['auto', 'high', 'balanced', 'performance']); expect(MODE_TIER).toEqual({ high: 'high', balanced: 'medium', performance: 'low' });
    expect(cleanMode('nope')).toBe('auto'); expect(nextMode('auto')).toBe('high'); expect(nextMode('performance')).toBe('auto');
    window.localStorage.removeItem(GRAPHICS_KEY); expect(readGraphicsMode()).toBe('auto'); expect(writeGraphicsMode('balanced')).toBe(true); expect(readGraphicsMode()).toBe('balanced'); expect(readSignals('').mode).toBe('balanced');
    window.localStorage.setItem(GRAPHICS_KEY, '<script>'); expect(readGraphicsMode()).toBe('auto'); window.localStorage.removeItem(GRAPHICS_KEY);
  });
  test('every tier is complete, ordered by cost, anti-aliased, and never below 512 px textures or 4x anisotropy', () => {
    for (const id of ['high', 'medium', 'low']) {
      const t = TIERS[id]; expect(t.id).toBe(id); expect(t.antialias).toBe(true); expect(t.texSize).toBeGreaterThanOrEqual(512); expect(t.anisotropy).toBeGreaterThanOrEqual(4);
      for (const k of ['pixelRatioCap', 'shadowMap', 'pointLights', 'palms', 'fronds', 'texSize', 'anisotropy']) expect(typeof t[k]).toBe('number');
    }
    expect(TIERS.high.pixelRatioCap).toBe(2); expect(TIERS.medium.pixelRatioCap).toBe(2); expect(TIERS.low.pixelRatioCap).toBe(1.5);
    expect(TIERS.high.texSize).toBeGreaterThan(TIERS.medium.texSize); expect(TIERS.low.pointLights).toBe(0);
  });
  test('pixel ratio: sharpness first (caps 2 / 2 / 1.5) and a hard floor of 1.25 on 2x+ screens, 1 on 1x screens', () => {
    expect(effectivePixelRatio('high', 3, 1)).toBe(2); expect(effectivePixelRatio('medium', 3, 1)).toBe(2); expect(effectivePixelRatio('low', 3, 1)).toBe(1.5);
    expect(effectivePixelRatio('high', 1, 1)).toBe(1); expect(effectivePixelRatio('low', 1, 1)).toBe(1); expect(effectivePixelRatio('medium', 1.5, 1)).toBe(1.5);
    expect(effectivePixelRatio('medium', 3, 0.8)).toBeCloseTo(1.6); expect(effectivePixelRatio('low', 3, 0.8)).toBe(1.25); expect(effectivePixelRatio('low', 3, 0.1)).toBe(1.25);
    expect(effectivePixelRatio('high', 1, 0.5)).toBe(1); expect(effectivePixelRatio('high', 2, 0.1)).toBe(1.25); expect(effectivePixelRatio('low', 1.5, 0.5)).toBe(1);
    expect(bufferSize(393, 852, 'medium', 3)).toEqual([786, 1704]); expect(bufferSize(393, 852, 'low', 3)).toEqual([589, 1278]); expect(bufferSize(2560, 1440, 'high', 1)).toEqual([2560, 1440]); expect(bufferSize(1280, 720, 'high', 2)).toEqual([2560, 1440]);
    expect(minScale('medium', 3)).toBe(0.8); expect(minScale('low', 3)).toBe(0.84); expect(minScale('high', 1)).toBe(1); expect(minScale('low', 2)).toBe(0.84);
    for (const tier of ['high', 'medium', 'low']) for (const dpr of [1, 1.5, 2, 3]) expect(effectivePixelRatio(tier, dpr, minScale(tier, dpr))).toBeGreaterThanOrEqual(dpr >= 2 ? 1.25 : 1);
  });
  test('adaptive resolution: floor 0.8, drops gently, recovers slowly', () => {
    expect(adaptScale({ scale: 1, fps: 12 })).toBe(0.92); expect(adaptScale({ scale: 1, fps: 40 })).toBe(1); expect(adaptScale({ scale: 0.85, fps: 60 })).toBeGreaterThan(0.85);
    expect(adaptScale({ scale: 0.82, fps: 5 })).toBe(0.8); expect(adaptScale({ scale: 1, fps: 120 })).toBe(1);
    let s = 1; for (let i = 0; i < 30; i++) s = adaptScale({ scale: s, fps: 3 }); expect(s).toBe(MIN_SCALE); expect(MIN_SCALE).toBe(0.8);
  });
  test('adaptive quality sheds OTHER costs first (shadow size, post, reflections, shadow updates); resolution only after all four, and comes back first', () => {
    expect(SHED_STEPS).toEqual(['shadowSize', 'post', 'reflections', 'shadowUpdates']);
    let q = { shed: 0, scale: 1 }; const seen = [];
    for (let i = 0; i < 8; i++) { q = adaptQuality({ ...q, fps: 10 }); seen.push([q.shed, q.scale]); }
    expect(seen.slice(0, 4)).toEqual([[1, 1], [2, 1], [3, 1], [4, 1]]); expect(seen[4]).toEqual([4, 0.92]); expect(seen[7][1]).toBe(0.8);
    expect(adaptQuality({ shed: 2, scale: 1, fps: 40 })).toEqual({ shed: 2, scale: 1 });                 // inside the hysteresis band: nothing moves
    expect(adaptQuality({ shed: 4, scale: 0.8, fps: 60 })).toEqual({ shed: 4, scale: 0.86 });            // resolution returns first
    expect(adaptQuality({ shed: 4, scale: 1, fps: 60 })).toEqual({ shed: 3, scale: 1 }); expect(adaptQuality({ shed: 0, scale: 1, fps: 60 })).toEqual({ shed: 0, scale: 1 });
    expect(adaptQuality({ shed: 4, scale: 0.9, fps: 5, min: 1 })).toEqual({ shed: 4, scale: 1 });        // a 1x screen never renders below 1
  });
  test('software renderers are recognised', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070)')).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });
  test('readSignals picks up ?quality=', () => {
    expect(readSignals('?quality=medium').override).toBe('medium');
    expect(readSignals('').override).toBe('');
  });
});
