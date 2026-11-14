/* The showroom advisers: ONE female AI adviser per room (Reception, the eight departments, the VIP room), each with a different outfit / headscarf / hair. PURE data.
 * Names: a common Arabic first name per adviser + her role (owner decision); they are AI assistants and are always labelled as such. The owner can replace them in this one file.
 * Positions: departments stand at the corner of the bay mouth under the canopy (local frame: +x to the nave, z along the wall), clear of every product collider, the nav lanes and
 * the quick-nav stand points; Reception sits behind its own desk in the lobby; the VIP adviser stands inside the glass door beside the stand point. */
import { layoutBays } from '../scenes/main-hall/departments';
import { PALETTE as P } from '../3d/palette';

export const RECEPTION = { desk: { x: -5.2, z: -7.0, hx: 1.45, hz: 0.42, h: 1.06 }, backdrop: { z: -9.35, y: 2.45, w: 3.4, h: 1.05 } };
export const TALK_RADIUS = 3.6;       // metres: close enough to "Talk to <name> (AI)" (button / T / E)
export const NOTICE_RADIUS = 9;       // metres: the adviser turns to the visitor and waves once
export const APPROACH = { from: 5.2, stopAt: 2.1, maxStep: 0.9, speed: 0.85 };

const N = (en, ar) => ({ en, ar });
const LOOKS = {
  reception: { gender: 'f', outfit: 'coat', color: P.coatTeal, hair: 'bun', hairColor: P.hairBrown, skin: 'skinB' },
  kitchens: { gender: 'f', outfit: 'abaya', scarf: true, color: P.abayaBlack, scarfColor: P.scarfCream, skin: 'skinC' },
  wardrobes: { gender: 'f', outfit: 'coat', color: P.coatBrick, hair: 'long', hairColor: P.hairDark, skin: 'skinB' },
  walkin: { gender: 'f', outfit: 'abaya', scarf: true, color: P.abayaPlum, scarfColor: P.scarfGrey, skin: 'skinD' },
  bedroom: { gender: 'f', outfit: 'abaya', scarf: true, color: P.abayaSand, scarfColor: P.scarfRose, skin: 'skinB' },
  doors: { gender: 'f', outfit: 'abaya', scarf: true, color: P.abayaNavy, scarfColor: P.scarfCream, skin: 'skinC' },
  living: { gender: 'f', outfit: 'coat', color: P.coatTeal, hair: 'short', hairColor: P.hairBrown, skin: 'skinA' },
  studio: { gender: 'f', outfit: 'abaya', scarf: true, color: P.abayaBlack, scarfColor: P.scarfRose, skin: 'skinB' },
  lounge: { gender: 'f', outfit: 'coat', color: P.coatBrick, hair: 'bun', hairColor: P.hairDark, skin: 'skinD' },
  vip: { gender: 'f', outfit: 'abaya', scarf: true, color: P.abayaNavy, scarfColor: P.scarfGrey, skin: 'skinC' },
};
/* Owner decision: every adviser carries a common Arabic female first name (EN + AR spelling) with her role as the subtitle. They are AI assistants, not employees:
 * every place that shows the name (Talk button, chat header and badge, greeting bubble) keeps the "(AI)" label / the AI disclosure. Change a name here only. */
const ROLES = {
  reception: N('Reception advisor', 'مستشارة الاستقبال'), kitchens: N('Kitchen advisor', 'مستشارة المطابخ'), wardrobes: N('Wardrobe advisor', 'مستشارة الخزائن'), walkin: N('Walk-in advisor', 'مستشارة غرف الملابس'),
  bedroom: N('Bedroom advisor', 'مستشارة غرف النوم'), doors: N('Door advisor', 'مستشارة الأبواب'), living: N('Living advisor', 'مستشارة غرف المعيشة'), studio: N('Studio advisor', 'مستشارة الاستوديو'),
  lounge: N('Lounge advisor', 'مستشارة الصالة'), vip: N('VIP advisor', 'مستشارة VIP'),
};
export const FIRST_NAMES = {
  reception: N('Noor', 'نور'), kitchens: N('Maryam', 'مريم'), wardrobes: N('Layla', 'ليلى'), walkin: N('Dana', 'دانة'), bedroom: N('Reem', 'ريم'),
  doors: N('Hessa', 'حصة'), living: N('Sara', 'سارة'), studio: N('Aisha', 'عائشة'), lounge: N('Fatima', 'فاطمة'), vip: N('Zainab', 'زينب'),
};
/** display name = "<first name>, <role>" (the role stays visible as the subtitle) */
const NAMES = Object.fromEntries(Object.keys(ROLES).map((id) => [id, N(`${FIRST_NAMES[id].en}, ${ROLES[id].en}`, `${FIRST_NAMES[id].ar}، ${ROLES[id].ar}`)]));
export const VIP_STAFF_AT = [-4.0, -29.2];

/** [{id, room, name, at:[x,z], yaw, look, seed, radius}] in a fixed order: reception first, then the bays, then VIP */
export function staffRoster(bays = layoutBays()) {
  const out = [{ id: 'reception', room: 'reception', name: NAMES.reception, first: FIRST_NAMES.reception, role: ROLES.reception, at: [RECEPTION.desk.x, RECEPTION.desk.z - 1.05], yaw: 0, look: LOOKS.reception, seed: 2, radius: 0.3 }];
  for (const b of bays) {
    const s = b.facing, at = [b.x + s * 1.9, b.z + s * 2.6];
    out.push({ id: b.id, room: b.id, name: NAMES[b.id], first: FIRST_NAMES[b.id], role: ROLES[b.id], at, yaw: s * Math.PI / 2 - s * 0.35, look: LOOKS[b.id], seed: 3 + b.index, radius: 0.28 });
  }
  out.push({ id: 'vip', room: 'vip', name: NAMES.vip, first: FIRST_NAMES.vip, role: ROLES.vip, at: [...VIP_STAFF_AT], yaw: 0.5, look: LOOKS.vip, seed: 12, radius: 0.28 });
  return out;
}
/** collision footprints (plan view): each adviser's standing circle and the reception desk */
export function staffColliders(roster = staffRoster()) {
  const out = roster.map((s) => ({ type: 'circle', id: 'staff-' + s.id, x: s.at[0], z: s.at[1], r: s.radius })), d = RECEPTION.desk;
  out.push({ type: 'box', id: 'reception-desk', minX: d.x - d.hx, maxX: d.x + d.hx, minZ: d.z - d.hz, maxZ: d.z + d.hz });
  return out;
}
export const staffById = (id, roster = staffRoster()) => roster.find((s) => s.id === id) || null;
/** nearest adviser to a point within `r` metres of where they STAND NOW (positions = [[x,z],...] aligned with the roster) */
export function nearestStaff(roster, positions, x, z, r = TALK_RADIUS) {
  let best = null, bd = r; roster.forEach((s, i) => { const p = positions ? positions[i] : s.at, d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = s; } }); return best;
}
