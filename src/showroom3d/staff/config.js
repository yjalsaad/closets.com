/* How the ten advisers appear in the 3D showroom (owner decision): 'kiosk' = a slim digital totem with her portrait, name, role and the "(AI)" label; 'character' = the procedural
 * 3D character (characters/rig.js) or a licensed rigged GLB (characters/glbConfig.js). The character code stays in the repo so it can return when licensed assets exist.
 * A visitor can preview the other mode with ?staff=character or ?staff=kiosk. */
export const STAFF_MODES = ['kiosk', 'character'];
export const STAFF_MODE = 'kiosk';
export const staffModeFrom = (search = '') => { const m = /[?&]staff=(kiosk|character)\b/.exec(String(search)); return m ? m[1] : STAFF_MODE; };
/** portraits are served from public/yas-bloom/staff/<adviserId>.webp (3:4, about 768 x 1024, <= 120 KB). Until a file exists (or if it fails to load) the kiosk shows a monogram, never a broken image. */
export const PORTRAIT_BASE = (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL ? process.env.PUBLIC_URL : '') + '/yas-bloom/staff/';
export const portraitUrl = (id) => `${PORTRAIT_BASE}${id}.webp`;
