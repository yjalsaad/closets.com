/* =============================================================================
 * Display-prop materials of the Neo category studios [NEO-CATEGORIES-UX26] (bathroom, laundry, TV unit, office).
 * A prop box { mat: 'ceramic', ... } in `scene.props` is drawn with the entry below. The colours are NOT here: `v` names a scoped custom
 * property (--nk-c-*) defined once in neoCategories/categoryStudio.css (the "owner palette"); `fb` is only the fallback when the
 * property is missing (tests, harness). `kd` is the same colour as RGB data for the OBJ / 3DM files.
 *   r = roughness, m = metalness, emit = emissive intensity (LED strips, screens, a fire).
 * ===========================================================================*/
export const CAT_MATS = {
  ceramic: { v: '--nk-c-ceramic', fb: 0xf2f2ee, r: 0.18, m: 0, kd: [0.95, 0.95, 0.93], name: 'Ceramic' },
  steel: { v: '--nk-c-steel', fb: 0xb9bec4, r: 0.3, m: 0.85, kd: [0.73, 0.75, 0.77], name: 'Steel' },
  chrome: { v: '--nk-c-chrome', fb: 0xdfe3e8, r: 0.12, m: 0.95, kd: [0.87, 0.89, 0.91], name: 'Chrome' },
  machine: { v: '--nk-c-machine', fb: 0xeceff2, r: 0.35, m: 0.1, kd: [0.93, 0.94, 0.95], name: 'ApplianceWhite' },
  glassdoor: { v: '--nk-c-machine-glass', fb: 0x1c2a33, r: 0.08, m: 0.4, kd: [0.11, 0.16, 0.2], name: 'ApplianceGlass' },
  screen: { v: '--nk-c-screen', fb: 0x0b0c0e, r: 0.12, m: 0.2, kd: [0.04, 0.05, 0.06], name: 'Screen' },
  bezel: { v: '--nk-c-bezel', fb: 0x1a1b1e, r: 0.4, m: 0.4, kd: [0.1, 0.1, 0.11], name: 'Bezel' },
  led: { v: '--nk-c-led', fb: 0xffd9a0, r: 0.4, m: 0, emit: 1.5, kd: [1, 0.85, 0.63], name: 'LedLight' },
  fire: { v: '--nk-c-fire', fb: 0xff8a3c, r: 0.5, m: 0, emit: 1.1, kd: [1, 0.54, 0.24], name: 'Flame' },
  fabric: { v: '--nk-c-fabric', fb: 0x6e7a8c, r: 0.95, m: 0, kd: [0.43, 0.48, 0.55], name: 'Fabric' },
  paper: { v: '--nk-c-paper', fb: 0xe8e2d4, r: 0.9, m: 0, kd: [0.91, 0.89, 0.83], name: 'Paper' },
  dark: { v: '--nk-c-dark', fb: 0x25272b, r: 0.6, m: 0.1, kd: [0.15, 0.15, 0.17], name: 'DarkPlastic' },
  wood: { v: '--nk-c-wood', fb: 0xa07850, r: 0.65, m: 0, kd: [0.63, 0.47, 0.31], name: 'WoodProp' },
};
export const CAT_MAT_KEYS = Object.keys(CAT_MATS);
export const isCatMat = (k) => Object.prototype.hasOwnProperty.call(CAT_MATS, k);
