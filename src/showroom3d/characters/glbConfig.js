/* Drop-in licensed character assets. EMPTY on purpose: no legally usable rigged humanoid GLB was available (see docs/showroom3d/REALISM.md), so the procedural rig is used.
 * To switch an adviser to a licensed, rigged GLB (Ready Player Me / Reallusion / MetaHuman-style export, Mixamo-style bone names, <= 8 MB each) put the file under
 * public/yas-bloom/realism/characters/ and add one line here; the staff logic (roster, anim state machine, chat) is untouched, and any load error falls back to the procedural character.
 *   reception: { url: '/yas-bloom/realism/characters/reception.glb', height: 1.68 },
 * Draco / meshopt compressed files work: ship the three.js Draco decoder next to them (public/yas-bloom/realism/draco/). */
export const GLB_CHARACTERS = {};
export const DRACO_PATH = '/yas-bloom/realism/draco/';
