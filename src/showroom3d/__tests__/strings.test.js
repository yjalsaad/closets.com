import { STRINGS, t } from '../strings';
import { PALETTE, hex, cssVars } from '../3d/palette';

describe('EN / AR strings', () => {
  test('every key has a non-empty English and Arabic value', () => {
    for (const [k, v] of Object.entries(STRINGS)) { expect(typeof v.en).toBe('string'); expect(v.en.trim().length).toBeGreaterThan(0); expect(typeof v.ar).toBe('string'); expect(v.ar.trim().length).toBeGreaterThan(0); k.length; }
  });
  test('Arabic copy is Arabic (apart from the language toggle label and brand-neutral tokens)', () => {
    for (const [k, v] of Object.entries(STRINGS)) { if (k === 'langToggle') continue; expect(/[؀-ۿ]/.test(v.ar)).toBe(true); }
  });
  test('t() falls back to the key, honours the language, and uses no emoji', () => {
    expect(t('skipIntro', 'en')).toBe('Skip intro'); expect(t('skipIntro', 'ar')).toBe('تخطي المقدمة'); expect(t('nope', 'en')).toBe('nope');
    for (const v of Object.values(STRINGS)) expect(/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(v.en + v.ar)).toBe(false);
  });
  test('the preview note is honest that the departments are sample configurations, not final designs or prices', () => {
    expect(STRINGS.previewNote.en.toLowerCase()).toContain('sample configurations'); expect(STRINGS.previewNote.en.toLowerCase()).toContain('price'); expect(STRINGS.bayPending.en.toLowerCase()).toContain('furnished');
  });
});

describe('palette', () => {
  test('hex() formats 6-digit sRGB and cssVars() exposes brand anchors', () => {
    expect(hex(0xe0904a)).toBe('#e0904a'); expect(hex(0x000001)).toBe('#000001');
    const v = cssVars(); expect(v['--sr-orange']).toBe(hex(PALETTE.brandOrange)); expect(v['--sr-glass']).toMatch(/^rgba\(/);
  });
});
