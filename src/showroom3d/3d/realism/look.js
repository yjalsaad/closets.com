/* The grade: tone mapping, exposure and the warm key / cool fill colour temperatures. Colour LITERALS stay in palette.js; these are physical constants. */
import * as THREE from 'three';
/** correlated colour temperature -> sRGB hex-ish number (Tanner Helland approximation, good between 1500 and 9000 K) */
export function kelvin(k) {
  const t = k / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}
export const LOOK = {
  toneMapping: THREE.ACESFilmicToneMapping, exposure: 0.78,
  keyK: 4300, spotK: 3000, fillK: 5600,
};
