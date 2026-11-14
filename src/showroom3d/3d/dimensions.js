/* Shared architectural dimensions (metres). +Y up, +Z toward the street, the facade sits on z = 0, the hall extends to z = -DEPTH. */
export const HALL = {
  halfWidth: 22,      // building is 44 m wide
  depth: 36,
  height: 9.6,        // double-height volume
  slab: 1.2,          // roof slab thickness (floats above the glass)
  overhang: 6,        // roof cantilever beyond the facade
  wingWidth: 8,       // solid stone wings either side of the glass
  glassHalf: 14,      // curtain wall spans x = -14 .. 14
  doorHalfOpening: 1.6,
  doorHeight: 3.4,
  eye: 1.65,
};
/** walnut-clad columns in the nave at the bay gaps (x = +-15.2); hall.js draws them, navigation/colliders.js blocks them. s = side (-1 left, +1 right) */
export const COLUMN_SIZE = 0.7;
export const COLUMNS = [-12.65, -20.25, -27.85].flatMap((z) => [-1, 1].map((s) => ({ x: s * 15.2, z, s })));
export const BAY = { depth: 6, width: 6.8, gap: 0.8, startZ: -4.5, signY: 5.4 };
export const SITE = { size: 360, pathHalf: 4.5, forecourtDepth: 34 };
