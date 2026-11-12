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
export const BAY = { depth: 6, width: 6.8, gap: 0.8, startZ: -4.5, signY: 5.4 };
export const SITE = { size: 360, pathHalf: 4.5, forecourtDepth: 34 };
