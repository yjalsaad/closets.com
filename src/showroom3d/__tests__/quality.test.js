import { TIERS, pickTier, adaptScale, effectivePixelRatio, isSoftwareRenderer, readSignals } from '../3d/quality';

describe('quality tiers', () => {
  test('desktop with a capable machine gets high', () => {
    expect(pickTier({ width: 1920, height: 1080, deviceMemory: 8, hardwareConcurrency: 12 })).toBe('high');
    expect(pickTier({ width: 1440, height: 900 })).toBe('high');   // Safari / Firefox expose neither memory nor cores
  });
  test('phones get low, strong phones medium, tablets medium', () => {
    expect(pickTier({ width: 390, height: 844, coarsePointer: true, deviceMemory: 4, hardwareConcurrency: 6 })).toBe('low');
    expect(pickTier({ width: 390, height: 844, coarsePointer: true })).toBe('low');
    expect(pickTier({ width: 430, height: 932, coarsePointer: true, deviceMemory: 8, hardwareConcurrency: 8 })).toBe('medium');
    expect(pickTier({ width: 820, height: 1180, coarsePointer: true, deviceMemory: 4 })).toBe('medium');
    expect(pickTier({ width: 820, height: 1180, coarsePointer: true, deviceMemory: 2 })).toBe('low');
  });
  test('weak desktops step down', () => {
    expect(pickTier({ width: 1366, height: 768, deviceMemory: 4, hardwareConcurrency: 8 })).toBe('medium');
    expect(pickTier({ width: 1366, height: 768, deviceMemory: 2 })).toBe('low');
    expect(pickTier({ width: 1366, height: 768, hardwareConcurrency: 2 })).toBe('low');
  });
  test('data saver and software GL force low; a valid override wins over everything', () => {
    expect(pickTier({ width: 1920, height: 1080, saveData: true })).toBe('low');
    expect(pickTier({ width: 1920, height: 1080, softwareRenderer: true })).toBe('low');
    expect(pickTier({ override: 'high', saveData: true, softwareRenderer: true })).toBe('high');
    expect(pickTier({ override: 'bogus', width: 1920, height: 1080 })).toBe('high');
  });
  test('every tier is complete and ordered by cost', () => {
    for (const id of ['high', 'medium', 'low']) {
      const t = TIERS[id]; expect(t.id).toBe(id);
      for (const k of ['pixelRatioCap', 'shadowMap', 'pointLights', 'palms', 'fronds', 'texSize', 'anisotropy']) expect(typeof t[k]).toBe('number');
    }
    expect(TIERS.high.texSize).toBeGreaterThan(TIERS.medium.texSize); expect(TIERS.medium.texSize).toBeGreaterThan(TIERS.low.texSize);
    expect(TIERS.high.pixelRatioCap).toBeGreaterThan(TIERS.low.pixelRatioCap);
    expect(TIERS.low.pointLights).toBe(0);
  });
  test('adaptive resolution drops fast, recovers slowly, and stays inside its bounds', () => {
    expect(adaptScale({ scale: 1, fps: 12 })).toBeLessThan(1);
    expect(adaptScale({ scale: 1, fps: 40 })).toBe(1);
    expect(adaptScale({ scale: 0.6, fps: 60 })).toBeGreaterThan(0.6);
    expect(adaptScale({ scale: 0.52, fps: 5 })).toBe(0.5);
    expect(adaptScale({ scale: 1, fps: 120 })).toBe(1);
    let s = 1; for (let i = 0; i < 30; i++) s = adaptScale({ scale: s, fps: 3 }); expect(s).toBe(0.5);
  });
  test('pixel ratio respects the tier cap and the scale', () => {
    expect(effectivePixelRatio('high', 3, 1)).toBe(2); expect(effectivePixelRatio('low', 3, 1)).toBe(1.25);
    expect(effectivePixelRatio('high', 2, 0.5)).toBe(1); expect(effectivePixelRatio('low', 1, 0.1)).toBe(0.5);
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
