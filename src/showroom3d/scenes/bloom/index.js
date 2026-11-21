/* Entry of the lazy Bloom chunk: Floor 2 + the lift in the hall. Imported with `import()` by the engine (3d/engine.js ensureBloom), never statically. */
import { buildBloomFloor } from './bloomMeeting';
import { buildHallLift } from './hallLift';

export function buildBloom(opts) { return { floor: buildBloomFloor(opts), lift: buildHallLift(opts) }; }
export * as layout from './layout';
