/* Neo Kitchen Designer - 3D "Look" presets (UX-11). Pure data + maths, no THREE / DOM, unit-tested.
 * A preset only describes LIGHTS, ENVIRONMENT (floor / walls / LED strips, separate meshes) and the scene background.
 * Applying one never rebuilds the CAD scene: cabinet meshes, materials, camera, selection and BOM are untouched.
 * Light colours are physical values (not UI palette); every surface colour (background, walls, floor) is a scoped --nk-look-*
 * custom property in view3dPro.css, read by Kitchen3D.jsx. */

export const SUN = { min: 10, max: 85, def: 57 };
export const clampSun = (d) => { const n = Math.round(+d); return Number.isFinite(n) ? Math.max(SUN.min, Math.min(SUN.max, n)) : SUN.def; };

/** sun position for an elevation in degrees (azimuth fixed front-right, like the default key light): lower sun = longer, flatter shadows */
export function sunPosition(deg, radius = 6000, targetY = 1200, azimuth = 0.5) {
  const e = (clampSun(deg) * Math.PI) / 180;
  return [radius * Math.cos(e) * Math.sin(azimuth), targetY + radius * Math.sin(e), radius * Math.cos(e) * Math.cos(azimuth)];
}
/** length of the shadow cast by a 1 m object at that elevation (m) - the number the slider visibly changes */
export const shadowLength = (deg) => 1 / Math.tan((clampSun(deg) * Math.PI) / 180);

export const LOOK_ORDER = ['standard', 'studio', 'daylight', 'evening'];
/* amb / hemi / key / fill: [colour, intensity]; hemi = [sky, ground, intensity]; keyPos null = the standard key position;
 * floor / walls = CSS custom property that colours the environment mesh; bg = scene background property (null = transparent canvas) */
export const LOOKS = {
  standard: {
    en: ['Standard', 'The original view'], ar: ['قياسي', 'العرض الأصلي'],
    amb: null, hemi: [0xffffff, 0x6e7480, 0.3], key: null, fill: 0.3, keyShadow: true, catcher: 0.11, bg: null, env: null, led: false,
  },
  studio: {
    en: ['Studio', 'Soft studio light, true material colours'], ar: ['استوديو', 'إضاءة استوديو ناعمة وألوان مواد حقيقية'],
    amb: [0xffffff, 0.62], hemi: [0xffffff, 0x9aa0aa, 0.5], key: [0xffffff, 0.4], fill: 0.5, keyShadow: true, catcher: 0.05, bg: '--nk-look-studio-bg', env: null, led: false,
  },
  daylight: {
    en: ['Daylight', 'Sunny room: oak floor, painted walls, soft shadows'], ar: ['ضوء النهار', 'غرفة مشمسة: أرضية بلوط وجدران مطلية وظلال ناعمة'],
    amb: [0xfff4e0, 0.3], hemi: [0xfff2dc, 0x9a8f80, 0.36], key: [0xfff0d6, 0.95], fill: 0.15, keyShadow: true, catcher: 0.2, bg: '--nk-look-day-bg', env: { floor: '--nk-look-day-floor', walls: '--nk-look-day-wall', plank: 1 }, led: false, sun: true,
  },
  evening: {
    en: ['Evening', 'Warm evening light, LED strips under the wall units'], ar: ['مساء', 'إضاءة مسائية دافئة وشرائط LED تحت الوحدات العلوية'],
    amb: [0xffb066, 0.3], hemi: [0xffc890, 0x2a2018, 0.22], key: [0xffa860, 0.34], fill: 0.1, keyShadow: true, catcher: 0.16, bg: '--nk-look-eve-bg', env: { floor: '--nk-look-eve-floor', walls: '--nk-look-eve-wall', plank: 1 }, led: true,
  },
};
export const lookOf = (id) => (LOOKS[id] ? id : 'standard');
export const lookTitle = (id, lang) => LOOKS[lookOf(id)][lang === 'ar' ? 'ar' : 'en'][0];

const KEY = 'neo-kitchen-look';
/** persisted preference { look, sun }; every storage access is guarded (private mode / blocked storage returns the defaults) */
export function loadLook(storage) {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    const v = s && JSON.parse(s.getItem(KEY) || 'null');
    return { look: lookOf(v && v.look), sun: clampSun(v && v.sun !== undefined ? v.sun : SUN.def) };
  } catch (e) { return { look: 'standard', sun: SUN.def }; }
}
export function saveLook(look, sun, storage) {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (s) s.setItem(KEY, JSON.stringify({ look: lookOf(look), sun: clampSun(sun) }));
    return true;
  } catch (e) { return false; }
}
