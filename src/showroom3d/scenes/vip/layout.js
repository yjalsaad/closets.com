/* Geometry facts of the VIP meeting room (metres, world frame). A glass-fronted boardroom against the back wall of the hall, centred on the nave, behind the
 * second bench. The back wall of the hall is the room's back wall. PURE data (collision, navigation, the scene module and the tests all read it). */
import { HALL } from '../../3d/dimensions';

export const VIP = {
  x0: -7, x1: 7, z0: -(HALL.depth - 0.5), z1: -28.5,      // inner floor rectangle; the room's back wall stands 0.5 m in front of the hall's back wall so it hides the logo panel behind it
  wallT: 0.15, height: 4.3,
  doorHalf: 0.95, doorH: 2.7,                               // door gap in the front glass wall (centre x = 0)
  table: { x: 0, z: -32.6, w: 5.6, d: 1.5, h: 0.76 },
  screen: { z: -(HALL.depth - 0.5) + 0.08, y: 2.2, w: 6.93, h: 3.9 },   // a 16:9 LED wall, 6.9 x 3.9 m (was 5.7 x 3.2)
  approach: [0, -27.6],                                      // lane in front of the door
  stand: [0, -30.2],                                         // quick-nav stand point, inside, facing the screen
  look: [0, 2.2, -(HALL.depth - 0.5) + 0.08],
};
export const vipCentre = () => [(VIP.x0 + VIP.x1) / 2, (VIP.z0 + VIP.z1) / 2];
/** floor-plan footprint boxes used by collision (door leaf box only exists while the door is closed) */
export function vipBoxes() {
  const t = VIP.wallT, out = [
    { type: 'box', id: 'vip-wall-left', minX: VIP.x0 - t, maxX: VIP.x0, minZ: VIP.z0 - 1, maxZ: VIP.z1 + t / 2 },
    { type: 'box', id: 'vip-wall-right', minX: VIP.x1, maxX: VIP.x1 + t, minZ: VIP.z0 - 1, maxZ: VIP.z1 + t / 2 },
    { type: 'box', id: 'vip-front-left', minX: VIP.x0 - t, maxX: -VIP.doorHalf, minZ: VIP.z1 - t / 2, maxZ: VIP.z1 + t / 2 },
    { type: 'box', id: 'vip-front-right', minX: VIP.doorHalf, maxX: VIP.x1 + t, minZ: VIP.z1 - t / 2, maxZ: VIP.z1 + t / 2 },
    { type: 'box', id: 'vip-back', minX: VIP.x0 - t, maxX: VIP.x1 + t, minZ: VIP.z0 - 1.5, maxZ: VIP.z0 },
    // table + chairs (one solid block with margin: 12 chairs round the long table)
    { type: 'box', id: 'vip-table', minX: VIP.table.x - VIP.table.w / 2 - 0.55, maxX: VIP.table.x + VIP.table.w / 2 + 0.55, minZ: VIP.table.z - VIP.table.d / 2 - 0.7, maxZ: VIP.table.z + VIP.table.d / 2 + 0.7 },
    // lounge corner (sofa + coffee table) front right, credenza + plant front left
    { type: 'box', id: 'vip-lounge', minX: 3.2, maxX: VIP.x1, minZ: -31.4, maxZ: VIP.z1 + 0.1 },
    { type: 'box', id: 'vip-credenza', minX: VIP.x0, maxX: -5.5, minZ: -31.2, maxZ: VIP.z1 + 0.1 },
  ];
  return out;
}
export const vipDoorBox = () => ({ type: 'box', id: 'vip-door', minX: -VIP.doorHalf, maxX: VIP.doorHalf, minZ: VIP.z1 - VIP.wallT / 2, maxZ: VIP.z1 + VIP.wallT / 2 });
/** camera pose of each presentation station (eye height, inside the room; the walker stays where it stands) */
export const VIP_VIEWS = [
  { id: 'story', pos: [0, 1.85, -29.2], look: [0, 2.2, -35.42], fov: 54 },
  { id: 'projects', pos: [-0.6, 1.8, -31.2], look: [-7.0, 1.9, -32.6], fov: 58 },
  { id: 'hub', pos: [0, 1.85, -29.2], look: [0, 2.2, -35.42], fov: 54 },
  { id: 'contact', pos: [0, 1.85, -29.2], look: [0, 2.2, -35.42], fov: 52 },
];

/** presenter view of the big screen: the camera is placed so the whole wall (screen width + margin) fits the viewport width for the given aspect ratio and vertical fov */
export function bigScreenView(aspect = 16 / 9, fov = 46, fill = 0.94, centred = false) {
  const a = Math.max(0.4, aspect), vf = (fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * a), half = (VIP.screen.w / 2) / fill, dist = Math.min(7.4, Math.max(3.4, half / Math.tan(hf / 2)));
  const z = VIP.screen.z + 0.012 + dist; return { pos: [0, centred ? VIP.screen.y : 1.55, Math.min(z, VIP.z1 - 0.6)], look: [0, centred ? VIP.screen.y : VIP.screen.y - 0.05, VIP.screen.z], fov };   // centred (Reading mode): the eye is level with the middle of the wall, so there is no keystone and the wall fits the view exactly
}
