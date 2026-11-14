/* Pure lighting helpers (unit-tested): how strong the Phase-1 sun is once the visitor is deep inside the hall, and the per-bay colour grade.
 * The sun that streams through the glass facade makes hard stripes on the floor near the entrance (a nice arrival moment) but, deeper in, it
 * fights the bay lighting. So the sun fades with the camera's depth into the hall; inside the departments the key spots do the work. */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth01 = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };

export const SUN_FADE = { fromZ: -2.5, toZ: -9, min: 0.14 };
/** multiplier (min..1) for the sun's intensity given the camera z (street = +z, hall = -z) */
export function sunScale(z, f = SUN_FADE) { const k = smooth01((f.fromZ - z) / (f.fromZ - f.toZ)); return 1 - (1 - f.min) * k; }

/** colour grade per anchor: tint (rgb multiplier), contrast around mid grey, vignette strength. Subtle on purpose: it separates the rooms, it does not stylise them. */
export const GRADES = {
  neutral: { tint: [1, 1, 1], contrast: 1.0, vignette: 0.1 },
  kitchen: { tint: [1.015, 1.0, 0.975], contrast: 1.04, vignette: 0.16 },
  wardrobe: { tint: [1.02, 0.995, 0.97], contrast: 1.05, vignette: 0.2 },
  door: { tint: [0.985, 1.0, 1.015], contrast: 1.04, vignette: 0.18 },
  stage: { tint: [0.99, 1.0, 1.02], contrast: 1.03, vignette: 0.14 },
};
export const gradeFor = (id) => GRADES[id] || GRADES.neutral;
export function mixGrade(a, b, k) {
  const m = (x, y) => x + (y - x) * k;
  return { tint: [m(a.tint[0], b.tint[0]), m(a.tint[1], b.tint[1]), m(a.tint[2], b.tint[2])], contrast: m(a.contrast, b.contrast), vignette: m(a.vignette, b.vignette) };
}
